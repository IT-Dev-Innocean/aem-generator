/**
 * Google Drive folder listing + file download for shared "Anyone with the link" folders.
 */
import { fetchDocumentUrl } from "./fetch-proxy";
import type { ArticleLocale } from "./document-processor";

export type DriveFileEntry = {
  id: string;
  name: string;
  locale: ArticleLocale | null;
};

const FOLDER_ID_RE =
  /drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders\/|drive\/folders\/|open\?id=|folderview\?id=)([a-zA-Z0-9_-]+)/i;
const FILE_ID_RE =
  /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*(?:\?|&)id=)([a-zA-Z0-9_-]+)/i;

const EN_NAME_RE = /(?:^|[\[(\s_-])en(?:[\])\s_-]|$)|english|versi\s*inggris/i;
const ID_NAME_RE =
  /(?:^|[\[(\s_-])id(?:[\])\s_-]|$)|bahasa\s*indonesia|indonesian|versi\s*indonesia/i;

export function extractGoogleDriveFolderId(url: string): string | null {
  const m = FOLDER_ID_RE.exec(url.trim());
  return m?.[1] ?? null;
}

export function extractGoogleDriveFileId(url: string): string | null {
  const trimmed = url.trim();
  if (extractGoogleDriveFolderId(trimmed)) return null;
  const m = FILE_ID_RE.exec(trimmed);
  return m?.[1] ?? null;
}

export function isGoogleDriveFolderUrl(url: string): boolean {
  return extractGoogleDriveFolderId(url) !== null;
}

export function isGoogleDriveFileUrl(url: string): boolean {
  return extractGoogleDriveFileId(url) !== null;
}

export function detectLocaleFromFileName(name: string): ArticleLocale | null {
  const hasEn = EN_NAME_RE.test(name);
  const hasId = ID_NAME_RE.test(name);
  if (hasEn && !hasId) return "en";
  if (hasId && !hasEn) return "id";
  // Prefer explicit [EN]/[ID] markers when both patterns somehow match.
  if (/\[?\s*en\s*\]/i.test(name)) return "en";
  if (/\[?\s*id\s*\]/i.test(name)) return "id";
  return null;
}

function unescapeDriveIvd(raw: string): string {
  return raw
    .replace(/\\x([0-9a-fA-F]{2})/g, (_m, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

/** Parse file id + name pairs from a public Drive folder HTML page. */
export function parseDriveFolderHtml(html: string): DriveFileEntry[] {
  const entries = new Map<string, DriveFileEntry>();

  const ivdMatch = html.match(
    /window\[['\"]_DRIVE_ivd['\"]\]\s*=\s*'((?:\\'|[^'])*)'/
  );
  if (ivdMatch?.[1]) {
    const ivd = unescapeDriveIvd(ivdMatch[1]);
    const entryRe =
      /\["([a-zA-Z0-9_-]{10,})",\[[^\]]*\],"([^"]+\.(?:docx|doc|pdf|html|htm|txt|md))"/gi;
    let m: RegExpExecArray | null;
    while ((m = entryRe.exec(ivd)) !== null) {
      const id = m[1];
      const name = m[2];
      entries.set(id, {
        id,
        name,
        locale: detectLocaleFromFileName(name),
      });
    }
  }

  // Fallback: data-tooltip + nearby data-id on the same element.
  const tooltipRe =
    /data-tooltip="([^"]+\.(?:docx|doc|pdf|html|htm|txt|md))"[^>]*data-id="([a-zA-Z0-9_-]{10,})"|data-id="([a-zA-Z0-9_-]{10,})"[^>]*data-tooltip="([^"]+\.(?:docx|doc|pdf|html|htm|txt|md))"/gi;
  let tm: RegExpExecArray | null;
  while ((tm = tooltipRe.exec(html)) !== null) {
    const name = tm[1] ?? tm[4];
    const id = tm[2] ?? tm[3];
    if (!name || !id || entries.has(id)) continue;
    entries.set(id, {
      id,
      name,
      locale: detectLocaleFromFileName(name),
    });
  }

  return Array.from(entries.values());
}

export async function listGoogleDriveFolder(
  folderUrl: string
): Promise<DriveFileEntry[]> {
  const folderId = extractGoogleDriveFolderId(folderUrl);
  if (!folderId) {
    throw new Error(
      "Invalid Google Drive folder link. Expected format: https://drive.google.com/drive/folders/<ID>"
    );
  }

  const pageUrl = `https://drive.google.com/drive/folders/${folderId}`;
  let response: Response;
  try {
    response = await fetchDocumentUrl(pageUrl);
  } catch {
    throw new Error(
      "Failed to open the Google Drive folder. Ensure it is shared as 'Anyone with the link'."
    );
  }

  if (!response.ok) {
    throw new Error(
      `Could not read Google Drive folder (status ${response.status}). ` +
        "Ensure the folder is shared as 'Anyone with the link'."
    );
  }

  const html = await response.text();
  const files = parseDriveFolderHtml(html);
  if (files.length === 0) {
    throw new Error(
      "No Word/PDF files found in the Google Drive folder. " +
        "Make sure the folder contains EN and ID press release files."
    );
  }
  return files;
}

/** Pick EN + ID files from a Drive folder listing. */
export function pickLocaleFiles(files: DriveFileEntry[]): {
  en?: DriveFileEntry;
  id?: DriveFileEntry;
} {
  const en =
    files.find((f) => f.locale === "en") ??
    files.find((f) => /\[?\s*en\s*\]/i.test(f.name));
  const id =
    files.find((f) => f.locale === "id") ??
    files.find((f) => /\[?\s*id\s*\]/i.test(f.name));

  // Fallback: if exactly 2 files and locales unclear, order by name.
  if ((!en || !id) && files.length === 2) {
    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));
    return {
      en: en ?? sorted.find((f) => f !== id) ?? sorted[0],
      id: id ?? sorted.find((f) => f !== en) ?? sorted[1],
    };
  }

  return { en, id };
}

async function downloadDriveBytes(fileId: string): Promise<ArrayBuffer> {
  const candidates = [
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
  ];

  let lastError: Error | null = null;
  for (const url of candidates) {
    try {
      const response = await fetchDocumentUrl(url);
      if (!response.ok) {
        lastError = new Error(`Download failed (status ${response.status})`);
        continue;
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 0) return buffer;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Download failed");
    }
  }

  throw (
    lastError ??
    new Error(
      "Failed to download file from Google Drive. " +
        "Ensure the file is shared as 'Anyone with the link'."
    )
  );
}

export async function fetchGoogleDriveFileBuffer(
  fileId: string
): Promise<ArrayBuffer> {
  return downloadDriveBytes(fileId);
}

export async function fetchGoogleDriveDocxExport(
  fileId: string
): Promise<ArrayBuffer> {
  // Native Google Docs on Drive can be exported as docx.
  const exportUrl = `https://docs.google.com/document/d/${fileId}/export?format=docx`;
  try {
    const response = await fetchDocumentUrl(exportUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 4) return buffer;
    }
  } catch {
    /* fall through to uc download */
  }
  return downloadDriveBytes(fileId);
}
