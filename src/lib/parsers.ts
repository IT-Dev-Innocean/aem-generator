/**
 * Source parsers: turn an input (Google Docs / Microsoft Word link or uploaded file)
 * into KIA-styled HTML ready for copy-paste.
 */
import mammoth from "mammoth";
import {
  fetchDocumentFromLink,
  providerLabel,
} from "./document-links";
import {
  splitDocumentSections,
  type ArticleLocale,
} from "./document-processor";
import { htmlToKiaArticle, plainTextToHtml } from "./transformer";

export { extractGoogleDocId } from "./parsers.shared";

export type InputMode = "link" | "upload";

export interface GenerateInput {
  mode: InputMode;
  /** Google Docs or Microsoft Word (SharePoint / OneDrive) sharing link. */
  documentUrl?: string;
  file?: File;
  fullDocument?: boolean;
}

export interface GeneratedArticle {
  locale: ArticleLocale;
  filename: string;
  html: string;
  /** CMS page title (max 100 chars) for AEM copy-paste. */
  cmsTitle?: string;
  /** SEO meta title (50–70 chars). */
  metaTitle?: string;
  /** SEO meta description (140–150 chars). */
  metaDescription?: string;
}

export interface GenerateResult {
  articles: GeneratedArticle[];
  sourceNote: string;
}

const MAMMOTH_STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h3:fresh",
];

export async function parseDocxBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    { styleMap: MAMMOTH_STYLE_MAP }
  );
  return result.value;
}

async function parseDocxFile(file: File): Promise<string> {
  return parseDocxBuffer(await file.arrayBuffer());
}

async function parsePdfFile(file: File): Promise<string> {
  const isNode = typeof window === "undefined";
  const pdfjs = isNode
    ? await import("pdfjs-dist/legacy/build/pdf.mjs")
    : await import("pdfjs-dist");

  if (isNode) {
    const { createRequire } = await import(/* @vite-ignore */ "node:module");
    const require = createRequire(import.meta.url);
    pdfjs.GlobalWorkerOptions.workerSrc = require.resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
  } else {
    const workerSrc = (
      await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
    ).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const paragraphs: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];

    for (const item of content.items) {
      // @ts-expect-error pdfjs TextItem has transform + str
      const str: string = item.str ?? "";
      // @ts-expect-error transform is [a,b,c,d,e,f]; f is the y position
      const y: number = item.transform?.[5] ?? 0;

      if (lastY === null || Math.abs(y - lastY) < 2) {
        line += str;
      } else {
        if (line.trim()) lines.push(line.trim());
        line = str;
      }
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());

    let buffer: string[] = [];
    const flush = () => {
      if (buffer.length) {
        paragraphs.push(buffer.join(" "));
        buffer = [];
      }
    };
    for (const l of lines) {
      if (l === "") flush();
      else buffer.push(l);
    }
    flush();
  }

  const text = paragraphs.join("\n\n");
  return plainTextToHtml(text);
}

export async function fileToSemanticHtml(
  file: File
): Promise<{ html: string; note: string }> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx")) {
    return {
      html: await parseDocxFile(file),
      note: "Processed from Word file (.docx)",
    };
  }
  if (name.endsWith(".doc")) {
    throw new Error(
      "Legacy .doc format is not supported. Re-save as .docx and upload again."
    );
  }
  if (name.endsWith(".pdf")) {
    return {
      html: await parsePdfFile(file),
      note: "Processed from PDF (text extracted; heading structure may need minor cleanup)",
    };
  }
  if (name.endsWith(".html") || name.endsWith(".htm")) {
    return { html: await file.text(), note: "Processed from HTML file" };
  }
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    const text = await file.text();
    return { html: plainTextToHtml(text), note: "Processed from plain text" };
  }

  throw new Error(
    "Unsupported file type. Use .docx, .pdf, .html, .txt, or .md."
  );
}

function buildArticles(
  semanticHtml: string,
  fullDocument: boolean
): GeneratedArticle[] {
  const sections = splitDocumentSections(semanticHtml);
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return sections.map((section) => ({
    locale: section.locale,
    filename: `kia-article-${section.locale}-${dateStamp}.html`,
    html: htmlToKiaArticle(section.html, { fullDocument }),
  }));
}

/** Main entry: produce KIA-styled HTML from any supported input. */
export async function generateArticle(
  input: GenerateInput
): Promise<GenerateResult> {
  const fullDocument = input.fullDocument ?? true;

  if (input.mode === "link") {
    if (!input.documentUrl?.trim()) {
      throw new Error("Please enter a document link first.");
    }
    const { html, provider } = await fetchDocumentFromLink(
      input.documentUrl.trim(),
      parseDocxBuffer
    );
    const articles = buildArticles(html, fullDocument);
    const label = providerLabel(provider);
    const note =
      articles.length > 1
        ? `Processed from ${label} — 2 versions (ID & EN) detected, SEO Meta Data removed`
        : `Processed from ${label} — SEO Meta Data removed`;
    return { articles, sourceNote: note };
  }

  if (input.mode === "upload") {
    if (!input.file) {
      throw new Error("Please select or drop a file first.");
    }
    const { html, note } = await fileToSemanticHtml(input.file);
    const articles = buildArticles(html, fullDocument);
    const splitNote =
      articles.length > 1 ? " — 2 versions (ID & EN) detected" : "";
    return {
      articles,
      sourceNote: `${note}${splitNote}, SEO Meta Data removed`,
    };
  }

  throw new Error("Invalid input mode.");
}
