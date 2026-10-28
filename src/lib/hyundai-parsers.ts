/**
 * Hyundai article & press-release generator: dual EN+ID sources (Drive folder,
 * dual upload, or single document link) → HMID press HTML template.
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
  fetchGoogleDriveFileBuffer,
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
import { htmlToHyundaiPress } from "./hyundai-transformer";
import { cleanHyundaiPressDocumentHtml } from "./hyundai-press-cleaner";
import { generateHyundaiSeoMeta } from "./hyundai-seo-meta";
import { repairHyundaiSemanticHtml } from "./hyundai-press-repair";
import {
  isPdfFileName,
  parseHyundaiPdfBuffer,
} from "./hyundai-pdf-processor";
import { isDocxArrayBuffer } from "./microsoft-docs";
import { plainTextToHtml } from "./transformer";
import type { GenerateNewsInput } from "./news-parsers";

export type { GenerateNewsInput as GenerateHyundaiReleaseInput } from "./news-parsers";

function pressDateStamp(date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

function toHyundaiArticle(
  locale: ArticleLocale,
  semanticHtml: string,
  rawTitle?: string,
  seoOverrides?: Partial<{
    cmsTitle: string;
    metaTitle: string;
    metaDescription: string;
  }>
): GeneratedArticle {
  const sections = splitDocumentSections(semanticHtml);
  const matched =
    sections.find((s) => s.locale === locale) ?? sections[0] ?? {
      locale,
      html: semanticHtml,
    };

  const { html, cmsTitle: extractedTitle } = cleanHyundaiPressDocumentHtml(
    repairHyundaiSemanticHtml(matched.html, locale)
  );

  const sourceTitle = rawTitle || extractedTitle || "";
  const seo = sourceTitle
    ? generateHyundaiSeoMeta(sourceTitle, locale)
    : { cmsTitle: "", metaTitle: "", metaDescription: "" };

  return {
    locale,
    filename: `hyundai-press-${locale}-${pressDateStamp()}.html`,
    html: htmlToHyundaiPress(html, { locale }),
    cmsTitle: seoOverrides?.cmsTitle ?? (seo.cmsTitle || extractedTitle),
    metaTitle: seoOverrides?.metaTitle ?? seo.metaTitle,
    metaDescription: seoOverrides?.metaDescription ?? seo.metaDescription,
  };
}

async function bufferToSemanticHtml(
  buffer: ArrayBuffer,
  fileName: string,
  locale: ArticleLocale = "id"
): Promise<{ html: string; note: string; cmsTitle?: string }> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) {
    const parsed = await parseHyundaiPdfBuffer(buffer, locale, fileName);
    return {
      html: parsed.html,
      note: `Processed from PDF (${fileName})`,
      cmsTitle: parsed.cmsTitle,
    };
  }

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

  if (isDocxArrayBuffer(buffer)) {
    return {
      html: await parseDocxBuffer(buffer),
      note: `Processed from Word file (${fileName})`,
    };
  }

  throw new Error(
    `Unsupported Drive file type for "${fileName}". Use .docx, .pdf, .html, .txt, or .md.`
  );
}

async function generateFromDriveFolder(
  folderUrl: string
): Promise<GenerateResult> {
  const files = await listGoogleDriveFolder(folderUrl);
  const { en, id } = pickLocaleFiles(files);

  if (!en && !id) {
    throw new Error(
      "Could not detect EN / ID files in the folder. " +
        "Name files with [EN] and [ID] (e.g. '[EN] Press Release.docx')."
    );
  }

  const articles: GeneratedArticle[] = [];
  const notes: string[] = [];

  for (const entry of [id, en].filter(Boolean)) {
    if (!entry) continue;
    const locale = entry.locale ?? detectLocaleFromFileName(entry.name) ?? "id";
    const buffer = isPdfFileName(entry.name)
      ? await fetchGoogleDriveFileBuffer(entry.id)
      : await fetchGoogleDriveDocxExport(entry.id);
    const { html, cmsTitle } = await bufferToSemanticHtml(
      buffer,
      entry.name,
      locale
    );
    articles.push(toHyundaiArticle(locale, html, cmsTitle));
    notes.push(`${locale.toUpperCase()}: ${entry.name}`);
  }

  articles.sort((a, b) => (a.locale === b.locale ? 0 : a.locale === "id" ? -1 : 1));

  return {
    articles,
    sourceNote: `Processed from Google Drive folder — ${notes.join(" · ")}`,
  };
}

async function generateFromDriveFile(fileUrl: string): Promise<GenerateResult> {
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
    toHyundaiArticle(section.locale, section.html)
  );

  return {
    articles,
    sourceNote:
      articles.length > 1
        ? `${note} — 2 versions (ID & EN) detected`
        : note,
  };
}

async function generateFromDocumentLink(url: string): Promise<GenerateResult> {
  const { html, provider } = await fetchDocumentFromLink(url, parseDocxBuffer);
  const sections = splitDocumentSections(html);
  const articles = sections.map((section) =>
    toHyundaiArticle(section.locale, section.html)
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
  input: GenerateNewsInput
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
        articles: sections.map((s) => toHyundaiArticle(s.locale, s.html)),
        sourceNote: `${note} — 2 versions (ID & EN) detected`,
      };
    }
    return {
      articles: [toHyundaiArticle(locale, html)],
      sourceNote: note,
    };
  }

  if (pairs.length === 0) {
    throw new Error("Please upload the ID and/or EN document file.");
  }

  const articles: GeneratedArticle[] = [];
  const notes: string[] = [];

  for (const { locale, file } of pairs) {
    let html: string;
    let cmsTitle: string | undefined;

    if (isPdfFileName(file.name)) {
      const parsed = await parseHyundaiPdfBuffer(
        await file.arrayBuffer(),
        locale,
        file.name
      );
      html = parsed.html;
      cmsTitle = parsed.cmsTitle;
    } else {
      const parsed = await fileToSemanticHtml(file);
      html = parsed.html;
    }

    articles.push(toHyundaiArticle(locale, html, cmsTitle));
    notes.push(`${locale.toUpperCase()}: ${file.name}`);
  }

  articles.sort((a, b) => (a.locale === b.locale ? 0 : a.locale === "id" ? -1 : 1));

  return {
    articles,
    sourceNote: `Processed from upload — ${notes.join(" · ")}`,
  };
}

/** Main entry: produce Hyundai press HTML from Drive folder, dual files, or document link. */
export async function generateHyundaiRelease(
  input: GenerateNewsInput
): Promise<GenerateResult> {
  if (input.mode === "link") {
    const url = input.documentUrl?.trim();
    if (!url) {
      throw new Error("Please enter a Google Drive folder or document link first.");
    }

    if (isGoogleDriveFolderUrl(url)) {
      return generateFromDriveFolder(url);
    }
    if (isGoogleDriveFileUrl(url)) {
      return generateFromDriveFile(url);
    }
    return generateFromDocumentLink(url);
  }

  if (input.mode === "upload") {
    return generateFromDualUpload(input);
  }

  throw new Error("Invalid input mode.");
}
