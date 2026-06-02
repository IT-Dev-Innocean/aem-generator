/**
 * Unified document link handling for Google Docs and Microsoft Word links.
 */
import { fetchDocumentUrl } from "./fetch-proxy";
import { fetchMicrosoftDocx, isMicrosoftDocumentUrl } from "./microsoft-docs";
import { extractGoogleDocId } from "./parsers.shared";

export type DocumentLinkProvider = "google" | "microsoft";

export function detectDocumentLinkProvider(url: string): DocumentLinkProvider | null {
  const trimmed = url.trim();
  if (extractGoogleDocId(trimmed)) return "google";
  if (isMicrosoftDocumentUrl(trimmed)) return "microsoft";
  return null;
}

async function fetchGoogleDocHtml(url: string): Promise<string> {
  const id = extractGoogleDocId(url);
  if (!id) {
    throw new Error(
      "Invalid Google Docs link. Expected format: https://docs.google.com/document/d/<ID>/edit"
    );
  }

  const exportUrl = `https://docs.google.com/document/d/${id}/export?format=html`;

  let response: Response;
  try {
    response = await fetchDocumentUrl(exportUrl);
  } catch {
    throw new Error(
      "Failed to fetch Google Docs. Download as .docx and use Upload File instead."
    );
  }

  if (!response.ok) {
    throw new Error(
      `Could not read Google Docs (status ${response.status}). ` +
        "Ensure the document is shared as 'Anyone with the link', " +
        "or download as .docx and use Upload File."
    );
  }

  return response.text();
}

export async function fetchDocumentFromLink(
  url: string,
  parseDocxBuffer: (buffer: ArrayBuffer) => Promise<string>
): Promise<{ html: string; provider: DocumentLinkProvider }> {
  const provider = detectDocumentLinkProvider(url);
  if (!provider) {
    throw new Error(
      "Unsupported document link. Paste a Google Docs URL or a Microsoft Word " +
        "sharing link from SharePoint / OneDrive."
    );
  }

  if (provider === "google") {
    return { html: await fetchGoogleDocHtml(url), provider: "google" };
  }

  const buffer = await fetchMicrosoftDocx(url);
  const html = await parseDocxBuffer(buffer);
  return { html, provider: "microsoft" };
}

export function providerLabel(provider: DocumentLinkProvider): string {
  return provider === "google" ? "Google Docs" : "Microsoft Word";
}
