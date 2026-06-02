const ALLOWED_HOSTS = [
  "sharepoint.com",
  "1drv.ms",
  "onedrive.live.com",
  "docs.google.com",
  "drive.google.com",
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
 * Fetch a remote document URL. In dev/preview, routes through the Vite proxy
 * to avoid browser CORS blocks (SharePoint / Google Docs).
 */
export async function fetchDocumentUrl(url: string): Promise<Response> {
  if (!isAllowedFetchUrl(url)) {
    throw new Error("URL host is not allowed for proxy fetch.");
  }

  const useProxy = import.meta.env.DEV || import.meta.env.VITE_USE_FETCH_PROXY === "true";

  if (useProxy) {
    return fetch(`/api/proxy-fetch?url=${encodeURIComponent(url)}`, {
      redirect: "follow",
    });
  }

  return fetch(url, { redirect: "follow" });
}
