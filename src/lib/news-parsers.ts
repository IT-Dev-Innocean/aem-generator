/**
 * News / press-release generator: dual EN+ID sources (Drive folder, dual upload,
 * or single document link) → KIA press HTML templates.
 */
import {
  fetchDocumentFromLink,
  providerLabel,
} from "./document-links";
import {
  splitDocumentSections,
  type ArticleLocale,
} from "./document-processor";
import {
  fetchGoogleDriveDocxExport,
  isGoogleDriveFileUrl,
  isGoogleDriveFolderUrl,
  listGoogleDriveFolder,
  pickLocaleFiles,
  extractGoogleDriveFileId,
  detectLocaleFromFileName,
} from "./google-drive";
import {
  fileToSemanticHtml,
  parseDocxBuffer,
  type GeneratedArticle,
  type GenerateResult,
} from "./parsers";
import { htmlToKiaPress } from "./news-transformer";
import { cleanPressDocumentHtml } from "./press-cleaner";
import { isDocxArrayBuffer } from "./microsoft-docs";
import { plainTextToHtml } from "./transformer";

export type NewsInputMode = "link" | "upload";

export interface GenerateNewsInput {
  mode: NewsInputMode;
  /** Google Drive folder, Google Docs, Microsoft Word, or Drive file link. */
  documentUrl?: string;
  /** Optional dual upload — preferred path for News. */
  fileId?: File;
  fileEn?: File;
  /** Legacy single-file upload fallback. */
  file?: File;
  fullDocument?: boolean;
}

function pressDateStamp(date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

function toPressArticle(
  locale: ArticleLocale,
  semanticHtml: string,
  fullDocument: boolean
): GeneratedArticle {
  const sections = splitDocumentSections(semanticHtml);
  const matched =
    sections.find((s) => s.locale === locale) ?? sections[0] ?? {
      locale,
      html: semanticHtml,
    };

  // Drop letterhead/title above bullets + Tentang/About Kia boilerplate.
  const cleaned = cleanPressDocumentHtml(matched.html);

  return {
    locale,
    filename: `kia-press-${locale}-${pressDateStamp()}.html`,
    html: htmlToKiaPress(cleaned, { locale, fullDocument }),
  };
}

async function bufferToSemanticHtml(
  buffer: ArrayBuffer,
  fileName: string
): Promise<{ html: string; note: string }> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".docx") || isDocxArrayBuffer(buffer)) {
    return {
      html: await parseDocxBuffer(buffer),
      note: `Processed from Word file (${fileName})`,
    };
  }

  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    const decoder = new TextDecoder("utf-8");
    return {
      html: decoder.decode(buffer),
      note: `Processed from HTML file (${fileName})`,
    };
  }

  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    const decoder = new TextDecoder("utf-8");
    return {
      html: plainTextToHtml(decoder.decode(buffer)),
      note: `Processed from plain text (${fileName})`,
    };
  }

  // Unknown extension — try docx magic, then treat as text.
  if (isDocxArrayBuffer(buffer)) {
    return {
      html: await parseDocxBuffer(buffer),
      note: `Processed from Word file (${fileName})`,
    };
  }

  throw new Error(
    `Unsupported Drive file type for "${fileName}". Use .docx, .html, .txt, or .md.`
  );
}

async function generateFromDriveFolder(
  folderUrl: string,
  fullDocument: boolean
): Promise<GenerateResult> {
  const files = await listGoogleDriveFolder(folderUrl);
  const { en, id } = pickLocaleFiles(files);

  if (!en && !id) {
    throw new Error(
      "Could not detect EN / ID press files in the folder. " +
        "Name files with [EN] and [ID] (e.g. '[EN] Press Release.docx')."
    );
  }

  const articles: GeneratedArticle[] = [];
  const notes: string[] = [];

  for (const entry of [id, en].filter(Boolean)) {
    if (!entry) continue;
    const buffer = await fetchGoogleDriveDocxExport(entry.id);
    const { html } = await bufferToSemanticHtml(buffer, entry.name);
    const locale = entry.locale ?? detectLocaleFromFileName(entry.name) ?? "id";
    articles.push(toPressArticle(locale, html, fullDocument));
    notes.push(`${locale.toUpperCase()}: ${entry.name}`);
  }

  // Keep ID then EN order in the UI.
  articles.sort((a, b) => (a.locale === b.locale ? 0 : a.locale === "id" ? -1 : 1));

  return {
    articles,
    sourceNote: `Processed from Google Drive folder — ${notes.join(" · ")}`,
  };
}

async function generateFromDriveFile(
  fileUrl: string,
  fullDocument: boolean
): Promise<GenerateResult> {
  const fileId = extractGoogleDriveFileId(fileUrl);
  if (!fileId) {
    throw new Error("Invalid Google Drive file link.");
  }

  const buffer = await fetchGoogleDriveDocxExport(fileId);
  const { html, note } = await bufferToSemanticHtml(
    buffer,
    `drive-${fileId}.docx`
  );
  const sections = splitDocumentSections(html);
  const articles = sections.map((section) =>
    toPressArticle(section.locale, section.html, fullDocument)
  );

  return {
    articles,
    sourceNote:
      articles.length > 1
        ? `${note} — 2 versions (ID & EN) detected`
        : note,
  };
}

async function generateFromDocumentLink(
  url: string,
  fullDocument: boolean
): Promise<GenerateResult> {
  const { html, provider } = await fetchDocumentFromLink(url, parseDocxBuffer);
  const sections = splitDocumentSections(html);
  const articles = sections.map((section) =>
    toPressArticle(section.locale, section.html, fullDocument)
  );
  const label = providerLabel(provider);
  return {
    articles,
    sourceNote:
      articles.length > 1
        ? `Processed from ${label} — 2 versions (ID & EN) detected`
        : `Processed from ${label}`,
  };
}

async function generateFromDualUpload(
  input: GenerateNewsInput,
  fullDocument: boolean
): Promise<GenerateResult> {
  const pairs: { locale: ArticleLocale; file: File }[] = [];
  if (input.fileId) pairs.push({ locale: "id", file: input.fileId });
  if (input.fileEn) pairs.push({ locale: "en", file: input.fileEn });

  if (pairs.length === 0 && input.file) {
    const { html, note } = await fileToSemanticHtml(input.file);
    const locale =
      detectLocaleFromFileName(input.file.name) ??
      splitDocumentSections(html)[0]?.locale ??
      "id";
    const sections = splitDocumentSections(html);
    if (sections.length > 1) {
      return {
        articles: sections.map((s) =>
          toPressArticle(s.locale, s.html, fullDocument)
        ),
        sourceNote: `${note} — 2 versions (ID & EN) detected`,
      };
    }
    return {
      articles: [toPressArticle(locale, html, fullDocument)],
      sourceNote: note,
    };
  }

  if (pairs.length === 0) {
    throw new Error("Please upload the ID and/or EN press release file.");
  }

  const articles: GeneratedArticle[] = [];
  const notes: string[] = [];

  for (const { locale, file } of pairs) {
    const { html } = await fileToSemanticHtml(file);
    articles.push(toPressArticle(locale, html, fullDocument));
    notes.push(`${locale.toUpperCase()}: ${file.name}`);
  }

  articles.sort((a, b) => (a.locale === b.locale ? 0 : a.locale === "id" ? -1 : 1));

  return {
    articles,
    sourceNote: `Processed from upload — ${notes.join(" · ")}`,
  };
}

/** Main entry: produce KIA press HTML from Drive folder, dual files, or document link. */
export async function generateNews(
  input: GenerateNewsInput
): Promise<GenerateResult> {
  const fullDocument = input.fullDocument ?? true;

  if (input.mode === "link") {
    const url = input.documentUrl?.trim();
    if (!url) {
      throw new Error("Please enter a Google Drive folder or document link first.");
    }

    if (isGoogleDriveFolderUrl(url)) {
      return generateFromDriveFolder(url, fullDocument);
    }
    if (isGoogleDriveFileUrl(url)) {
      return generateFromDriveFile(url, fullDocument);
    }
    return generateFromDocumentLink(url, fullDocument);
  }

  if (input.mode === "upload") {
    return generateFromDualUpload(input, fullDocument);
  }

  throw new Error("Invalid input mode.");
}
