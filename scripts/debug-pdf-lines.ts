import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
(globalThis as typeof globalThis & { DOMParser: typeof DOMParser }).DOMParser =
  dom.window.DOMParser;
(globalThis as typeof globalThis & { document: Document }).document =
  dom.window.document;

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
  "https://drive.google.com/drive/folders/1N02l1DYINN4CNtXda7lTCbDU7xVqhTli"
);
const { id } = pickLocaleFiles(files);
if (!id) throw new Error("No ID file");
const buf = await fetchGoogleDriveFileBuffer(id.id);
const pdf = await pdfjs.getDocument({ data: buf }).promise;
const page = await pdf.getPage(1);
const content = await page.getTextContent();

type Row = { text: string; fontSize: number; fonts: string[]; bold: boolean };

const rows = new Map<number, Row>();
for (const item of content.items as Array<{
  str?: string;
  transform?: number[];
  fontName?: string;
}>) {
  const str = item.str?.trim();
  if (!str) continue;
  const y = Math.round((item.transform?.[5] ?? 0) / 2);
  const fontSize = Math.abs(item.transform?.[0] ?? 12);
  const fontName = item.fontName ?? "";
  const row = rows.get(y) ?? { text: "", fontSize: 0, fonts: [], bold: false };
  row.text += (row.text ? " " : "") + str;
  row.fontSize = Math.max(row.fontSize, fontSize);
  if (fontName && !row.fonts.includes(fontName)) row.fonts.push(fontName);
  if (/bold|Bold|Black|Heavy|Semibold|Demi/i.test(fontName)) row.bold = true;
  rows.set(y, row);
}

const lines = [...rows.entries()]
  .sort((a, b) => b[0] - a[0])
  .map(([, row]) => row);

console.log("First 40 lines from page 1:\n");
lines.slice(0, 40).forEach((l, i) => {
  const bullet = /^[●•]/.test(l.text) ? "●" : " ";
  console.log(
    `${String(i).padStart(2)} ${bullet} ${l.fontSize.toFixed(1)} ${l.bold ? "B" : " "} ${l.text.slice(0, 110)}`
  );
});

const { parseHyundaiPdfBuffer } = await import("../src/lib/hyundai-pdf-processor.ts");
const parsed = await parseHyundaiPdfBuffer(buf, "id", id.name);
const firstUl = parsed.html.match(/<ul>[\s\S]*?<\/ul>/);
console.log("\n--- Parsed first UL ---");
console.log(firstUl?.[0]?.slice(0, 900));
console.log("LI count in first UL:", (firstUl?.[0].match(/<li>/g) || []).length);
