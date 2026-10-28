/**
 * Inline bold / emphasis patterns for Hyundai press HTML (PDF text has no markup).
 */
import type { ArticleLocale } from "./document-processor";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function bold(text: string): string {
  return `<strong>${text}</strong>`;
}

/** Apply SEO-friendly inline bold to plain paragraph text. */
export function formatInlineBold(text: string, locale: ArticleLocale): string {
  let t = escapeHtml(text);

  if (locale === "id") {
    t = t.replace(
      /^(Jakarta,\s*\d{1,2}\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?\s+\d{4})/i,
      (_, d) => bold(d)
    );

    const idPatterns: Array<[RegExp, (m: string, ...groups: string[]) => string]> = [
      [/\bHyundai Sunday\b/g, () => bold("Hyundai Sunday")],
      [/\bHyundai Cup ™ 2026\b/g, () => bold("Hyundai Cup ™ 2026")],
      [/\bHyundai Cup ™\b/g, () => bold("Hyundai Cup ™")],
      [/\bmyHyundaiCare\b/g, () => bold("myHyundaiCare")],
      [/\bDeal Terbaik Pasti Bisa\b/g, () => bold("Deal Terbaik Pasti Bisa")],
      [/\bSTARGAZER Cartenz X\b/g, () => bold("STARGAZER Cartenz X")],
      [/\bSTARGAZER Cartenz\b/g, () => bold("STARGAZER Cartenz")],
      [
        /\b(Minggu,\s*\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?)\b/gi,
        (m) => bold(m),
      ],
      [
        /\b(test drive|lomba mewarnai dan olahraga bersama)\b/gi,
        (m) => bold(m),
      ],
      [
        /\b(layanan servis gratis untuk semua merek kendaraan\.?)\b/gi,
        (m) => bold(m),
      ],
      [
        /\b(pemeriksaan kendaraan|cuci mobil gratis)\b/gi,
        (m) => bold(m),
      ],
      [
        /\b(berusia 7\s*[–—-]\s*11 tahun dengan tinggi badan maksimal 130 cm)\b/gi,
        (m) => bold(m),
      ],
      [
        /\b(Jersey Hyundai Cup ™ untuk anak)\b/gi,
        (m) => bold(m),
      ],
      [
        /\b(tiket pertandingan gratis)\b/gi,
        (m) => bold(m),
      ],
      [
        /\b(Driving ASEAN as One)\b/g,
        (m) => bold(m),
      ],
      [
        /\b(consumer benefit spesial hingga Rp50 juta)\b/gi,
        (m) => bold(m),
      ],
      [
        /\b(side mirror cushion cover dan stiker Hyundai Cup ™)\b/gi,
        (m) => bold(m),
      ],
      [
        /\b(Rp20 juta\*?)\b/gi,
        (m) => bold(m),
      ],
      [
        /ujar\s+([A-Z][^.]+\bPT Hyundai Motors Indonesia\.?)/g,
        (_m, name) => `ujar ${bold(name)}`,
      ],
      [
        /kata\s+([A-Z][^.]+\bPT Hyundai Motors Indonesia\.?)/g,
        (_m, name) => `kata ${bold(name)}`,
      ],
      [
        /^(Layanan Bantuan 24 Jam:)/gm,
        (m) => bold(m),
      ],
      [
        /^(Hyundai Premium Courtesy Car:)/gm,
        (m) => bold(m),
      ],
      [
        /^(Extended Warranty\s*:)/gm,
        (m) => bold(m),
      ],
      [
        /^(Resale Value Guarantee:)/gm,
        (m) => bold(m),
      ],
      [
        /\b(Roadside Assistance|Mobile Charging|Take Me Home x Grab)\b/g,
        (m) => bold(m),
      ],
    ];

    for (const [pattern, repl] of idPatterns) {
      t = t.replace(pattern, (...args) => repl(args[0], ...args.slice(1)));
    }
  } else {
    t = t.replace(
      /^(Jakarta,\s*\d{1,2}\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?\s+\d{4})/i,
      (_, d) => bold(d)
    );

    const enPatterns: Array<[RegExp, (m: string) => string]> = [
      [/\bHyundai Sunday\b/g, (m) => bold(m)],
      [/\bHyundai Cup ™ 2026\b/g, (m) => bold(m)],
      [/\bmyHyundaiCare\b/g, (m) => bold(m)],
      [/\bSTARGAZER Cartenz\b/g, (m) => bold(m)],
      [/\b(test drive)\b/gi, (m) => bold(m)],
      [/\b(free vehicle checks?|free car check)\b/gi, (m) => bold(m)],
    ];

    for (const [pattern, repl] of enPatterns) {
      t = t.replace(pattern, repl);
    }
  }

  return t;
}

export function formatKeyPointHtml(text: string): string {
  return `<em>${escapeHtml(text)}</em>`;
}

export function formatListItemHtml(
  text: string,
  locale: ArticleLocale,
  labelBold = false
): string {
  const colon = text.match(/^([^:]{3,80}):\s*(.+)$/);
  if (labelBold && colon) {
    return `${bold(colon[1] + ":")} ${formatInlineBold(colon[2], locale)}`;
  }
  return formatInlineBold(text, locale);
}
