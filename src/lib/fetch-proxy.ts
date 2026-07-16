const ALLOWED_HOSTS = [
  "sharepoint.com",
  "1drv.ms",
  "onedrive.live.com",
  "docs.google.com",
  "drive.google.com",
  "drive.usercontent.google.com",
];

function isAllowedFetchUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return ALLOWED_HOSTS.some((allowed) => host.includes(allowed));
  } catch {
    return false;
  }
}

/**
 * Fetch a remote document URL through the same-origin proxy.
 * - Local/dev/preview: Vite middleware at /api/proxy-fetch
 * - Netlify production: serverless function at /api/proxy-fetch
 *
 * Never fetch Drive/Docs directly from the browser (CORS / 403).
 */
export async function fetchDocumentUrl(url: string): Promise<Response> {
  if (!isAllowedFetchUrl(url)) {
    throw new Error("URL host is not allowed for proxy fetch.");
  }

  return fetch(`/api/proxy-fetch?url=${encodeURIComponent(url)}`, {
    redirect: "follow",
  });
}
