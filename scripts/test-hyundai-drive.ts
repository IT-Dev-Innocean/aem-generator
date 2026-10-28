/**
 * Node test: generate Hyundai press HTML from a Google Drive folder.
 * Usage: npx tsx scripts/test-hyundai-drive.ts
 */
import { JSDOM } from "jsdom";
import fs from "node:fs";
import path from "node:path";

async function main(): Promise<void> {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  (globalThis as typeof globalThis & { DOMParser: typeof DOMParser }).DOMParser =
    dom.window.DOMParser;
  (globalThis as typeof globalThis & { document: Document }).document =
    dom.window.document;
  (globalThis as typeof globalThis & { Node: typeof Node }).Node =
    dom.window.Node;

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
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "*/*",
        },
      });
    }

    return nativeFetch(input, init);
  };

  const { generateHyundaiRelease } = await import("../src/lib/hyundai-parsers.ts");

  const FOLDER_URL =
    "https://drive.google.com/drive/folders/1N02l1DYINN4CNtXda7lTCbDU7xVqhTli?usp=sharing";

  const outDir = path.resolve("dist/generated-test");
  fs.mkdirSync(outDir, { recursive: true });

  console.log("Generating from:", FOLDER_URL);
  const result = await generateHyundaiRelease({
    mode: "link",
    documentUrl: FOLDER_URL,
  });

  console.log("Source:", result.sourceNote);
  for (const article of result.articles) {
    const outPath = path.join(outDir, article.filename);
    fs.writeFileSync(outPath, article.html, "utf8");
    console.log("\n---", article.locale.toUpperCase(), "---");
    console.log("File:", outPath);
    console.log("CMS Title:", article.cmsTitle);
    console.log("Title length:", article.cmsTitle?.length ?? 0);
    console.log("HTML preview (first 400 chars):");
    console.log(article.html.slice(0, 400));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
