/**
 * Fetch Microsoft Word documents from SharePoint / OneDrive sharing links.
 * Downloads .docx bytes and validates the file before mammoth conversion.
 */
import { fetchDocumentUrl } from "./fetch-proxy";

const DOCX_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const;

export function isMicrosoftDocumentUrl(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return (
      host.includes("sharepoint.com") ||
      host.includes("1drv.ms") ||
      host.includes("onedrive.live.com") ||
      host.endsWith(".office.com") ||
      host.includes("office365.com")
    );
  } catch {
    return false;
  }
}

/** Remove SharePoint sharing prefixes like `:w:/g/` or `:w:/r/` from the path. */
export function normalizeSharePointUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.pathname = parsed.pathname.replace(/:\/[a-z]:\/[rg]\//i, "/");
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function extractSharePointSourceDocGuid(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const sourcedoc = parsed.searchParams.get("sourcedoc");
    if (!sourcedoc) return null;
    return decodeURIComponent(sourcedoc).replace(/[{}]/g, "").toUpperCase();
  } catch {
    return null;
  }
}

/** Guest links put the share token in the path: /:w:/g/personal/{user}/{shareId}?e= */
export function extractGuestShareToken(url: string): {
  personal: string;
  shareId: string;
  eToken?: string;
} | null {
  const trimmed = url.trim();
  const eToken = (() => {
    try {
      return new URL(trimmed).searchParams.get("e") ?? undefined;
    } catch {
      return undefined;
    }
  })();

  const guestPathMatch = trimmed.match(
    /:\/[a-z]:\/[rg]\/personal\/([^/]+)\/([^/?#]+)/i
  );
  if (guestPathMatch) {
    return {
      personal: guestPathMatch[1],
      shareId: guestPathMatch[2],
      eToken,
    };
  }

  try {
    const parsed = new URL(normalizeSharePointUrl(trimmed));
    const parts = parsed.pathname.split("/").filter(Boolean);
    const personalIdx = parts.indexOf("personal");
    if (personalIdx >= 0 && parts[personalIdx + 1] && parts[personalIdx + 2]) {
      const segment = parts[personalIdx + 2];
      if (!segment.startsWith("_layouts") && !segment.includes(".")) {
        return {
          personal: parts[personalIdx + 1],
          shareId: segment,
          eToken,
        };
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}

/** Build candidate direct-download URLs for a SharePoint / OneDrive Word link. */
export function buildMicrosoftDownloadUrls(url: string): string[] {
  const original = url.trim();
  const resolved = normalizeSharePointUrl(original);
  const parsed = new URL(resolved);
  const origin = parsed.origin;
  const urls: string[] = [];

  const guid =
    extractSharePointSourceDocGuid(original) ??
    extractSharePointSourceDocGuid(resolved);
  const shareQuery = parsed.searchParams.get("share");
  const file = parsed.searchParams.get("file");
  const personal = resolved.match(/\/personal\/([^/]+)/i)?.[1];
  const site = resolved.match(/(\/(?:sites|teams)\/[^/]+)/i)?.[1];
  const eToken = parsed.searchParams.get("e");

  const guest =
    extractGuestShareToken(original) ?? extractGuestShareToken(resolved);

  // Guest / "Anyone with the link" URLs (:w:/g/...) — share token is in the path.
  if (guest) {
    const base = `${origin}/personal/${guest.personal}/_layouts/15/download.aspx`;
    urls.push(`${base}?share=${encodeURIComponent(guest.shareId)}`);
    if (guest.eToken) {
      urls.push(
        `${base}?share=${encodeURIComponent(guest.shareId)}&e=${encodeURIComponent(guest.eToken)}`
      );
    }
  }

  const addDownload = (base: string) => {
    if (shareQuery) {
      urls.push(
        `${base}/_layouts/15/download.aspx?share=${encodeURIComponent(shareQuery)}`
      );
    }
    if (guid) {
      urls.push(`${base}/_layouts/15/download.aspx?UniqueId=${guid}`);
      urls.push(`${base}/_layouts/15/download.aspx?UniqueId=%7B${guid}%7D`);
      const sourcedoc = encodeURIComponent(`{${guid}}`);
      if (file) {
        urls.push(
          `${base}/_layouts/15/download.aspx?sourcedoc=${sourcedoc}&file=${encodeURIComponent(file)}`
        );
      }
    }
    if (eToken && !guest) {
      urls.push(
        `${base}/_layouts/15/download.aspx?e=${encodeURIComponent(eToken)}`
      );
    }
  };

  if (personal) {
    addDownload(`${origin}/personal/${personal}`);
  }
  if (site) {
    addDownload(`${origin}${site}`);
  }

  return [...new Set(urls)];
}

export function isDocxArrayBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer.slice(0, 4));
  return DOCX_MAGIC.every((byte, i) => bytes[i] === byte);
}

async function resolveRedirectUrl(url: string): Promise<string> {
  try {
    const response = await fetchDocumentUrl(url.trim());
    return response.url || url;
  } catch {
    return url;
  }
}

async function tryDownloadDocx(downloadUrl: string): Promise<ArrayBuffer | null> {
  let response: Response;
  try {
    response = await fetchDocumentUrl(downloadUrl);
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const buffer = await response.arrayBuffer();
  return isDocxArrayBuffer(buffer) ? buffer : null;
}

/** Download a .docx file from a Microsoft Word sharing link. */
export async function fetchMicrosoftDocx(url: string): Promise<ArrayBuffer> {
  let target = url.trim();

  if (target.includes("1drv.ms") || target.includes("onedrive.live.com")) {
    target = await resolveRedirectUrl(target);
  }

  const candidates = buildMicrosoftDownloadUrls(target);
  if (candidates.length === 0) {
    throw new Error(
      "Could not parse the Microsoft Word link. " +
        "Use a SharePoint or OneDrive sharing link that opens the document in Word Online."
    );
  }

  for (const downloadUrl of candidates) {
    const buffer = await tryDownloadDocx(downloadUrl);
    if (buffer) return buffer;
  }

  const inDev = import.meta.env.DEV;
  throw new Error(
    inDev
      ? "Failed to download the Microsoft Word document. " +
          "Make sure the file is shared as 'Anyone with the link', " +
          "or download the .docx manually and use Upload File."
      : "Failed to download the Microsoft Word document. " +
          "Run via `npm run dev` or `npm run preview` (proxy enabled), " +
          "or download the .docx manually and use Upload File."
  );
}
