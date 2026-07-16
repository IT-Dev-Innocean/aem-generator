/**
 * Production proxy for Google Drive / Docs / SharePoint fetches.
 * Mirrors vite-plugin-document-proxy used in local `npm run dev`.
 */

const ALLOWED_HOSTS = [
  "sharepoint.com",
  "1drv.ms",
  "onedrive.live.com",
  "docs.google.com",
  "drive.google.com",
  "drive.usercontent.google.com",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function isAllowedUrl(raw) {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return ALLOWED_HOSTS.some((allowed) => host.includes(allowed));
  } catch {
    return false;
  }
}

const SKIP_HEADERS = new Set([
  "transfer-encoding",
  "connection",
  "keep-alive",
  "content-encoding",
  "content-length",
]);

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: "Method not allowed",
    };
  }

  const target = event.queryStringParameters?.url;
  if (!target) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: "Missing url query parameter",
    };
  }

  if (!isAllowedUrl(target)) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: "Forbidden host",
    };
  }

  try {
    const response = await fetch(target, {
      redirect: "follow",
      headers: {
        // Browser-like UA reduces Drive 403s from datacenter fetches.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    const headers = { ...CORS_HEADERS };

    response.headers.forEach((value, key) => {
      if (!SKIP_HEADERS.has(key.toLowerCase())) {
        headers[key] = value;
      }
    });

    headers["Content-Length"] = String(buffer.byteLength);

    return {
      statusCode: response.status,
      headers,
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: error instanceof Error ? error.message : "Proxy fetch failed",
    };
  }
}
