import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
(globalThis as typeof globalThis & { DOMParser: typeof DOMParser }).DOMParser =
  dom.window.DOMParser;

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url
).href;

const nativeFetch = globalThis.fetch.bind(globalThis);
(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (url.includes("/api/proxy-fetch?url=")) {
    const target = new URL(url, "http://localhost").searchParams.get("url");
    if (!target) throw new Error("Missing proxy url");
    return nativeFetch(target, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "*/*",
      },
    });
  }
  return nativeFetch(input, init);
};

const { fetchGoogleDriveFileBuffer, listGoogleDriveFolder, pickLocaleFiles } =
  await import("../src/lib/google-drive.ts");
const { parseHyundaiPdfBuffer } = await import(
  "../src/lib/hyundai-pdf-processor.ts"
);

const files = await listGoogleDriveFolder(
  "https://drive.google.com/drive/folders/1N02l1DYINN4CNtXda7lTCbDU7xVqhTli?usp=sharing"
);
const { id } = pickLocaleFiles(files);
if (!id) throw new Error("No ID file");

const buf = await fetchGoogleDriveFileBuffer(id.id);
const parsed = await parseHyundaiPdfBuffer(buf, "id", id.name);

const kp = parsed.html.match(/<ul class="key-points">[\s\S]*?<\/ul>/);
console.log("=== KEY POINTS (raw PDF processor) ===");
console.log(kp?.[0] ?? "NOT FOUND");
console.log("\n=== First 2000 chars raw html ===");
console.log(parsed.html.slice(0, 2000));
