import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

async function main(): Promise<void> {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  (globalThis as typeof globalThis & { DOMParser: typeof DOMParser }).DOMParser =
    dom.window.DOMParser;

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const require = createRequire(import.meta.url);
  pdfjs.GlobalWorkerOptions.workerSrc = require.resolve(
    "pdfjs-dist/legacy/build/pdf.worker.mjs"
  );

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
        headers: { "User-Agent": "Mozilla/5.0" },
      });
    }
    return nativeFetch(input, init);
  };

  const { listGoogleDriveFolder, pickLocaleFiles, fetchGoogleDriveFileBuffer } =
    await import("../src/lib/google-drive.ts");

  const files = await listGoogleDriveFolder(
    "https://drive.google.com/drive/folders/1N02l1DYINN4CNtXda7lTCbDU7xVqhTli?usp=sharing"
  );
  const { id } = pickLocaleFiles(files);
  if (!id) throw new Error("No ID file");
  const buf = await fetchGoogleDriveFileBuffer(id.id);
  const pdf = await pdfjs.getDocument({ data: buf }).promise;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const rows = new Map<number, string>();
    for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
      const str = item.str?.trim();
      if (!str) continue;
      const y = Math.round((item.transform?.[5] ?? 0) / 2);
      rows.set(y, (rows.get(y) ?? "") + (rows.get(y) ? " " : "") + str);
    }
    const lines = Array.from(rows.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, t]) => t);
    const hits = lines.filter((l) =>
      /Ikuti|Selain itu|Resale Value|Rp20 juta|HyundaiMotorIndonesia/i.test(l)
    );
    if (hits.length) {
      console.log(`\n=== Page ${pageNum} hits ===`);
      hits.forEach((l) => console.log(l));
      if (pageNum === 4) {
        console.log("\n--- Page 4 context ---");
        const idx = lines.findIndex((l) => /Resale Value/i.test(l));
        lines.slice(Math.max(0, idx - 3), idx + 8).forEach((l) => console.log(l));
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
