import type { Connect } from "vite";
import type { Plugin } from "vite";

const ALLOWED_HOSTS = [
  "sharepoint.com",
  "1drv.ms",
  "onedrive.live.com",
  "docs.google.com",
  "drive.google.com",
  "drive.usercontent.google.com",
];

function isAllowedUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return ALLOWED_HOSTS.some((allowed) => host.includes(allowed));
  } catch {
    return false;
  }
}

function createProxyMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (!req.url?.startsWith("/api/proxy-fetch")) {
      next();
      return;
    }

    try {
      const requestUrl = new URL(req.url, "http://localhost");
      const target = requestUrl.searchParams.get("url");

      if (!target) {
        res.statusCode = 400;
        res.end("Missing url query parameter");
        return;
      }

      if (!isAllowedUrl(target)) {
        res.statusCode = 403;
        res.end("Forbidden host");
        return;
      }

      const response = await fetch(target, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "*/*",
        },
      });
      res.statusCode = response.status;

      // Node fetch decompresses gzip/br bodies automatically; do not forward
      // Content-Encoding or the original Content-Length or the browser will fail
      // with ERR_CONTENT_DECODING_FAILED (common for Google Docs HTML export).
      const skipHeaders = new Set([
        "transfer-encoding",
        "connection",
        "keep-alive",
        "content-encoding",
        "content-length",
      ]);

      response.headers.forEach((value, key) => {
        if (!skipHeaders.has(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      res.setHeader("Access-Control-Allow-Origin", "*");

      const buffer = Buffer.from(await response.arrayBuffer());
      res.setHeader("Content-Length", String(buffer.byteLength));
      res.end(buffer);
    } catch (error) {
      res.statusCode = 500;
      res.end(error instanceof Error ? error.message : "Proxy fetch failed");
    }
  };
}

/** Dev/preview proxy so SharePoint & Google Docs links work despite browser CORS. */
export function documentFetchProxy(): Plugin {
  const middleware = createProxyMiddleware();
  return {
    name: "document-fetch-proxy",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
