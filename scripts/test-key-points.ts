/**
 * Unit test key-point extraction from mock PDF lines (no network).
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
(globalThis as typeof globalThis & { DOMParser: typeof DOMParser }).DOMParser =
  dom.window.DOMParser;
(globalThis as typeof globalThis & { document: Document }).document =
  dom.window.document;

const { parseHyundaiPdfPlainText } = await import(
  "../src/lib/hyundai-pdf-processor.ts"
);

const mockLines = `
SIARAN PERS
Hyundai Sunday Hadir Serentak di Seluruh Indonesia,
● Hyundai Sunday akan digelar secara serentak di seluruh jaringan dealer Hyundai di
Indonesia pada 19 Juli 2026.
● Masyarakat dapat menikmati berbagai aktivitas menarik seperti test drive, program
pengecekan gratis untuk seluruh merek kendaraan, hingga berkesempatan
mendapatkan Official Merchandise Hyundai Cup ™ 2026.
● Hyundai juga membuka kesempatan bagi anak - anak Indonesia untuk mengikuti audisi
Kids Escort Hyundai Cup ™ 2026 dan mendampingi pemain Timnas Indonesia saat
memasuki lapangan.
Jakarta, 1 7 Juli 2026 – PT Hyundai Motors Indonesia (HMID) mengajak masyarakat untuk
menghabiskan akhir pekan bersama keluarga dan orang terdekat melalui Hyundai Sunday ,
sebuah acara spesial yang akan diselenggarakan secara serentak di seluruh jaringan dealer 3S
Hyundai di Indonesia pada hari M inggu, 19 Juli 2026 .
"Kami dengan bangga menghadirkan Hyundai Sunday sebagai inisiatif berskala nasional yang
membawa pengalaman Hyundai lebih dekat kepada pelanggan dan keluarga mereka." ujar Kenny Lee, President Director PT Hyundai Motors Indonesia .
*Syarat dan Ketentuan Berlaku
`;

const parsed = parseHyundaiPdfPlainText(mockLines, "id", "test.pdf");
const kp = parsed.html.match(/<ul class="key-points">([\s\S]*?)<\/ul>/);
const items = kp?.[1]?.match(/<li>[\s\S]*?<\/li>/g) ?? [];

console.log("Key point count:", items.length);
items.forEach((item, i) => {
  const text = item.replace(/<\/?[^>]+>/g, "").slice(0, 100);
  console.log(`  ${i + 1}. ${text}...`);
});

if (items.length !== 3) {
  console.error("FAIL: expected 3 key points");
  process.exit(1);
}

if (!parsed.html.includes("Jakarta") || !parsed.html.includes("17 Juli")) {
  console.error("FAIL: dateline missing");
  process.exit(1);
}

console.log("OK");
