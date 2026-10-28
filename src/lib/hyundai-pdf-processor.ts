/**
 * Parse Hyundai press-release PDF text into semantic HTML.
 */
import type { ArticleLocale } from "./document-processor";
import { optimizeCmsTitle } from "./hyundai-seo-meta";
import {
  formatSocialClosingHtml,
  isSocialClosingText,
} from "./hyundai-social-closing";
import {
  formatInlineBold,
  formatKeyPointHtml,
  formatListItemHtml,
} from "./hyundai-inline-format";

const LETTERHEAD_RE =
  /\*?Syarat dan Ketentuan Berlaku PT\. Hyundai Motors Indonesia[\s\S]*?www\.hyundai\.com\/id\/id\/?\s*/gi;

const ID_TITLE_PREFIX_RE = /SIARAN\s+PERS\s+/i;
const EN_TITLE_PREFIX_RE = /PRESS\s+RELEASE\s+/i;

const DATELINE_RE =
  /Jakarta,\s*\d{1,2}\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?\s+\d{4}\s*[–—-]?\s*/i;

const BODY_END_RE =
  /^(?:–\s*(?:Selesai|End)\s*–|Tentang PT Hyundai|About PT Hyundai|Appendix\b)/i;

const FILE_TITLE_RE =
  /^\[(?:IDN|ENG|ID|EN)\]\s*(?:(?:Siaran\s+Pers|Press\s+Release)\s*[-–—]\s*)?(.+?)\.pdf$/i;

type PdfLine = {
  text: string;
  fontSize: number;
};

function truncateTitle(value: string, locale: ArticleLocale = "id"): string {
  if (!value.trim()) return "";
  return optimizeCmsTitle(value, locale);
}

function stripLetterhead(text: string): string {
  return text.replace(LETTERHEAD_RE, " ").replace(/\s+/g, " ").trim();
}

function cleanPdfText(text: string): string {
  return text
    .replace(/Jl\.?\s*Gatot Subroto[^.]*?12710/gi, " ")
    .replace(/Mampang Prapatan,?\s*Jakarta Selatan,?\s*DKI Jakarta\s*12710/gi, " ")
    .replace(/Prapatan,?\s*Jakarta Selatan,?\s*DKI Jakarta\s*12710/gi, " ")
    .replace(/(\d)\s+(\d)/g, "$1$2")
    .replace(/\b([A-Z])\s+([a-z]{2,})/g, "$1$2")
    .replace(/\bmempe\s+rerat\b/gi, "mempererat")
    .replace(/\bkam\s+i\b/gi, "kami")
    .replace(/\bberupae\s*-\s*money\b/gi, "berupa e-money")
    .replace(/\be\s*-\s*money\b/gi, "e-money")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePdfLines(lines: PdfLine[]): PdfLine[] {
  return lines.map((line) => ({
    ...line,
    text: cleanPdfText(line.text),
  }));
}

function extractTitleFromPdfText(text: string, locale: ArticleLocale): string {
  const prefixRe = locale === "id" ? ID_TITLE_PREFIX_RE : EN_TITLE_PREFIX_RE;
  const match = prefixRe.exec(text);
  if (!match) return "";

  const afterPrefix = text.slice(match.index + match[0].length);
  const endIdx = afterPrefix.search(/●|•|\bJakarta,\s*\d/i);
  const rawTitle = endIdx >= 0 ? afterPrefix.slice(0, endIdx) : afterPrefix;
  return truncateTitle(rawTitle, locale);
}

export function extractTitleFromFileName(
  fileName: string,
  locale: ArticleLocale = "id"
): string {
  const match = FILE_TITLE_RE.exec(fileName.trim());
  if (!match?.[1]) return "";
  return truncateTitle(match[1], locale);
}

function groupPdfLines(items: Array<{ str?: string; transform?: number[] }>): PdfLine[] {
  const rows = new Map<number, { text: string; sizes: number[] }>();

  for (const item of items) {
    const str = item.str?.trim();
    if (!str) continue;
    const y = Math.round((item.transform?.[5] ?? 0) / 2);
    const fontSize = Math.abs(item.transform?.[0] ?? 12);
    const row = rows.get(y) ?? { text: "", sizes: [] };
    row.text += (row.text ? " " : "") + str;
    row.sizes.push(fontSize);
    rows.set(y, row);
  }

  return Array.from(rows.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, row]) => ({
      text: row.text.replace(/\s+/g, " ").trim(),
      fontSize: row.sizes.reduce((a, b) => a + b, 0) / row.sizes.length,
    }))
    .filter((line) => line.text.length > 0);
}

function isLetterheadLine(text: string): boolean {
  return (
    /Syarat dan Ketentuan Berlaku/i.test(text) ||
    /Wisma Mulia/i.test(text) ||
    /0800\s*187\s*8878/i.test(text) ||
    /^www\.hyundai\.com/i.test(text)
  );
}

function isAddressNoise(text: string): boolean {
  return (
    /Jl\.?\s*Gatot Subroto/i.test(text) ||
    /Mampang Prapatan/i.test(text) ||
    /Wisma Mulia/i.test(text) ||
    /0800\s*187\s*8878/i.test(text)
  );
}

function isMetaLine(text: string): boolean {
  return (
    isLetterheadLine(text) ||
    isAddressNoise(text) ||
    /^SIARAN\s+PERS$/i.test(text) ||
    /^PRESS\s+RELEASE$/i.test(text)
  );
}

const DEALER_BRANCH_NAMES =
  /^(?:Cibinong|Cibubur|Cimanggis|DI\s+Panjaitan|Kalimalang|Margonda|Pancoran|Pegangsaan|Pramuka|Tajur|Bintaro|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/;

function stripBullet(text: string): string {
  return text.replace(/^[●•]\s*/, "").trim();
}

function isListLine(text: string): boolean {
  return /^[●•]\s*/.test(text);
}

function isDealerLine(text: string): boolean {
  const t = stripBullet(text).trim();
  if (!/^Hyundai\s+/i.test(t)) return false;
  if (t.length > 50) return false;
  const branch = t.replace(/^Hyundai\s+/i, "").trim();
  if (!DEALER_BRANCH_NAMES.test(branch)) return false;
  if (/^(di|akan|juga|Sunday|Cup|Motors|Premium|menghadirkan|dengan)\b/i.test(branch)) {
    return false;
  }
  return true;
}

function isStandaloneListItem(text: string): boolean {
  const t = stripBullet(text.trim());
  if (!t) return false;
  if (isDealerLine(t)) return true;
  if (
    /^(Juggling bola|Menyanyi|Menari|Bakat lainnya|Pemeriksaan kendaraan|Layanan cuci mobil|Diagnosa kendaraan|Perawatan AC|Voucher spare parts|Pasti Bisa|Layanan Bantuan|Hyundai Premium Courtesy Car|Extended Warranty|Resale Value Guarantee)/i.test(
      t
    )
  ) {
    return true;
  }
  return false;
}

function isSocialClosingStart(text: string): boolean {
  return isSocialClosingText(text);
}

function isSectionHeadingLine(line: PdfLine, headingThreshold: number): boolean {
  const t = line.text.trim();
  if (isSocialClosingStart(t)) return false;
  if (t.length < 18 || t.length > 120) return false;
  if (/[.!?]$/.test(t)) return false;
  if (isListLine(t) || DATELINE_RE.test(t)) return false;
  if (line.fontSize >= headingThreshold && t.length >= 15) return true;
  return /^(Daftarkan|Sambut|Hyundai Cup|About|Tentang)/i.test(t);
}

function extractKeyPoints(
  lines: PdfLine[],
  startIdx: number
): { points: string[]; nextIdx: number } {
  const points: string[] = [];
  let idx = startIdx;

  while (idx < lines.length) {
    const line = lines[idx];
    if (DATELINE_RE.test(line.text)) break;

    if (!isListLine(line.text)) {
      idx++;
      continue;
    }

    let text = stripBullet(line.text);
    idx++;

    while (idx < lines.length) {
      const next = lines[idx].text;
      if (isListLine(next) || DATELINE_RE.test(next)) break;
      text += ` ${next}`;
      idx++;
    }

    points.push(text.trim());
    if (points.length >= 3) break;
  }

  return { points, nextIdx: idx };
}

function shouldContinueBulletItem(current: string, next: string): boolean {
  if (isStandaloneListItem(next)) return false;
  if (DATELINE_RE.test(next)) return false;
  if (/^Selain itu,/i.test(next.trim())) return false;
  if (isSocialClosingStart(next)) return false;
  if (/^(Daftarkan|Sambut|Anak|di Stadion|Momentum|Untuk mengikuti|Hyundai Sunday juga)/i.test(next.trim())) {
    return false;
  }
  if (current.length > 200) return false;
  if (/[.!?]["'"]?\s*$/.test(current.trim()) && /^[A-Z]/.test(next)) return false;
  return next.length <= 90;
}

const QUOTE_CHAR_RE = /^[\u201C\u201D\u2018\u2019"“”'']/;

function isQuoteStart(text: string): boolean {
  return QUOTE_CHAR_RE.test(text.trim());
}

function isQuoteAttributionEnd(text: string): boolean {
  return /\b(ujar|kata|said)\s+[A-Z]/i.test(text);
}

function shouldContinueQuoteBlock(prev: string, next: string): boolean {
  if (isQuoteAttributionEnd(prev)) return false;
  if (isStandaloneListItem(next)) return false;
  if (DATELINE_RE.test(next)) return false;
  return true;
}

function shouldContinueParagraph(prev: string, next: string): boolean {
  if (isStandaloneListItem(next)) return false;
  if (/^["“'']/.test(next.trim())) return false;
  if (/^(Daftarkan|Sambut|Untuk mengikuti|Momentum)/i.test(next.trim())) {
    return false;
  }
  if (DATELINE_RE.test(next) && !DATELINE_RE.test(prev)) return false;
  if (/^["""]/.test(prev.trim())) return shouldContinueQuoteBlock(prev, next);
  if (/^Melalui/i.test(next.trim()) && DATELINE_RE.test(prev)) return false;
  if (/[.!?]["'"]?\s*$/.test(prev.trim()) && /^[A-Z"“']/.test(next.trim())) {
    if (isDealerLine(next)) return false;
    if (/^["“']/.test(next.trim())) return false;
    return true;
  }
  return !/[.!?]["'"]?\s*$/.test(prev.trim());
}

function splitLongParagraph(text: string): string[] {
  const normalized = cleanPdfText(text);
  if (normalized.length <= 520) return [normalized];

  // Keep quoted blocks intact.
  if (isQuoteStart(normalized)) return [normalized];

  const chunks: string[] = [];
  const quoteParts = normalized.split(/(?=[""])/);
  for (const part of quoteParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 520) {
      chunks.push(trimmed);
    } else {
      trimmed
        .split(/(?<=[.!?])\s+(?=[A-Z"“'])/)
        .forEach((p) => {
          const s = p.trim();
          if (s) chunks.push(s);
        });
    }
  }
  return chunks.length ? chunks : [normalized];
}

function pushParagraph(htmlParts: string[], text: string, locale: ArticleLocale) {
  const parts = splitLongParagraph(text);
  for (const part of parts) {
    if (DATELINE_RE.test(part)) {
      const match = part.match(
        /^(Jakarta,\s*\d{1,2}\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?\s+\d{4})\s*([–—-])\s*(.*)$/i
      );
      if (match) {
        htmlParts.push(
          `<p>${formatInlineBold(match[1], locale)} ${match[2]} ${formatInlineBold(match[3], locale)}</p>`
        );
        continue;
      }
    }
    htmlParts.push(`<p>${formatInlineBold(part, locale)}</p>`);
  }
}

function linesToHtml(lines: PdfLine[], locale: ArticleLocale, fileName?: string): ParsedHyundaiPdf {
  const normalizedLines = normalizePdfLines(lines);
  const filtered = normalizedLines.filter((line) => !isMetaLine(line.text));
  const bodyFont =
    filtered.reduce((sum, line) => sum + line.fontSize, 0) / Math.max(filtered.length, 1);
  const headingThreshold = bodyFont * 1.08;

  let cmsTitle =
    extractTitleFromPdfText(filtered.map((l) => l.text).join(" "), locale) ||
    (fileName ? extractTitleFromFileName(fileName, locale) : "");

  const htmlParts: string[] = [];
  let idx = 0;

  // Title line (between PRESS RELEASE marker and bullets) may appear as large text line.
  while (idx < filtered.length && !isListLine(filtered[idx].text) && !DATELINE_RE.test(filtered[idx].text)) {
    const line = filtered[idx].text;
    if (
      !cmsTitle &&
      line.length > 20 &&
      !/^SIARAN|^PRESS/i.test(line) &&
      filtered[idx].fontSize >= headingThreshold
    ) {
      cmsTitle = truncateTitle(line, locale);
    }
    idx++;
  }

  const keyPoints: string[] = [];
  const { points, nextIdx } = extractKeyPoints(filtered, idx);
  keyPoints.push(...points);
  idx = nextIdx;

  if (keyPoints.length) {
    htmlParts.push(
      `<ul class="key-points">${keyPoints
        .map((p) => `<li>${formatKeyPointHtml(p)}</li>`)
        .join("")}</ul>`
    );
  }

  // Body until end marker
  const bodyLines = filtered.slice(idx);
  const endIndex = bodyLines.findIndex((line) => BODY_END_RE.test(line.text));
  let contentLines = endIndex >= 0 ? bodyLines.slice(0, endIndex) : bodyLines;
  contentLines = contentLines.filter((line) => !isAddressNoise(line.text));

  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    const text = paragraphBuffer.join(" ").replace(/\s+/g, " ").trim();
    paragraphBuffer = [];
    if (!text) return;
    pushParagraph(htmlParts, text, locale);
  };

  const flushList = () => {
    if (!listBuffer.length) return;
    const labelBold = listBuffer.some(
      (item) =>
        /^[^:]+:\s/.test(item) &&
        /Layanan|Warranty|Courtesy|Resale|Pasti Bisa|Bantuan/i.test(item)
    );
    htmlParts.push(
      `<ul>${listBuffer
        .map((item) => `<li>${formatListItemHtml(item, locale, labelBold)}</li>`)
        .join("")}</ul>`
    );
    listBuffer = [];
  };

  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i];

    if (isListLine(line.text)) {
      flushParagraph();
      let itemText = cleanPdfText(stripBullet(line.text));
      let j = i + 1;
      while (j < contentLines.length) {
        const next = contentLines[j];
        if (
          isListLine(next.text) ||
          isStandaloneListItem(next.text) ||
          DATELINE_RE.test(next.text) ||
          isSectionHeadingLine(next, headingThreshold)
        ) {
          break;
        }
        if (!shouldContinueBulletItem(itemText, next.text)) break;
        itemText += ` ${next.text}`;
        j++;
      }
      listBuffer.push(cleanPdfText(itemText));
      i = j - 1;
      continue;
    }

    if (isStandaloneListItem(line.text)) {
      flushParagraph();
      listBuffer.push(cleanPdfText(stripBullet(line.text)));
      continue;
    }

    flushList();

    if (isSocialClosingStart(line.text)) {
      flushParagraph();
      htmlParts.push(
        `<p class="social-closing">${formatSocialClosingHtml(locale)}</p>`
      );
      let j = i + 1;
      while (
        j < contentLines.length &&
        /HyundaiMotorIndonesia|Ikuti|@HyundaiMotorID|Youtube Hyundai|Stay updated/i.test(
          contentLines[j].text
        )
      ) {
        j++;
      }
      i = j - 1;
      continue;
    }

    if (/^Selain itu,/i.test(line.text.trim())) {
      flushParagraph();
      let text = cleanPdfText(line.text);
      let j = i + 1;
      while (j < contentLines.length) {
        const next = contentLines[j];
        if (isSocialClosingStart(next.text)) break;
        text += ` ${next.text}`;
        j++;
        if (/terencana\./i.test(text)) break;
      }
      pushParagraph(htmlParts, text, locale);
      i = j - 1;
      continue;
    }

    if (isSectionHeadingLine(line, headingThreshold)) {
      flushParagraph();
      htmlParts.push(`<h3>${formatInlineBold(line.text.trim(), locale)}</h3>`);
      continue;
    }

    if (DATELINE_RE.test(line.text) || /Jakarta,\s*\d/i.test(line.text)) {
      flushList();
      flushParagraph();
      let text = cleanPdfText(line.text);
      let j = i + 1;
      while (j < contentLines.length) {
        const next = contentLines[j];
        if (
          isListLine(next.text) ||
          isStandaloneListItem(next.text) ||
          isSectionHeadingLine(next, headingThreshold) ||
          isQuoteStart(next.text) ||
          /^Melalui/i.test(next.text.trim())
        ) {
          break;
        }
        if (!shouldContinueParagraph(text, next.text)) break;
        text += ` ${next.text}`;
        j++;
      }
      pushParagraph(htmlParts, text, locale);
      i = j - 1;
      continue;
    }

    if (isQuoteStart(line.text)) {
      flushList();
      flushParagraph();
      let text = cleanPdfText(line.text);
      let j = i + 1;
      while (j < contentLines.length) {
        const next = contentLines[j];
        if (
          isListLine(next.text) ||
          isStandaloneListItem(next.text) ||
          isSectionHeadingLine(next, headingThreshold) ||
          (isQuoteStart(next.text) && j > i + 1)
        ) {
          break;
        }
        if (/\bPT Hyundai\s*$/i.test(text.trim()) && /^Motors Indonesia/i.test(next.text.trim())) {
          text += ` ${next.text}`;
          j++;
          if (isQuoteAttributionEnd(text)) break;
          continue;
        }
        text += ` ${next.text}`;
        j++;
        if (isQuoteAttributionEnd(text)) break;
      }
      pushParagraph(htmlParts, text, locale);
      i = j - 1;
      continue;
    }

    if (
      paragraphBuffer.length &&
      !shouldContinueParagraph(
        paragraphBuffer[paragraphBuffer.length - 1] ?? "",
        line.text
      )
    ) {
      flushParagraph();
    }

    paragraphBuffer.push(cleanPdfText(line.text));
  }

  flushList();
  flushParagraph();

  return {
    html: htmlParts.join(""),
    cmsTitle,
  };
}

export interface ParsedHyundaiPdf {
  html: string;
  cmsTitle: string;
}

export async function parseHyundaiPdfBuffer(
  buffer: ArrayBuffer,
  locale: ArticleLocale,
  fileName?: string
): Promise<ParsedHyundaiPdf> {
  const isNode = typeof window === "undefined";
  const pdfjs = isNode
    ? await import("pdfjs-dist/legacy/build/pdf.mjs")
    : await import("pdfjs-dist");

  if (isNode) {
    const { createRequire } = await import(/* @vite-ignore */ "node:module");
    const require = createRequire(import.meta.url);
    pdfjs.GlobalWorkerOptions.workerSrc = require.resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs"
    );
  } else {
    const workerSrc = (
      await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
    ).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  }

  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const allLines: PdfLine[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    allLines.push(...groupPdfLines(content.items as Array<{ str?: string; transform?: number[] }>));
  }

  // De-duplicate consecutive repeated lines caused by PDF headers/footers.
  const deduped: PdfLine[] = [];
  for (const line of allLines) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.text === line.text) continue;
    deduped.push(line);
  }

  return linesToHtml(deduped, locale, fileName);
}

export function parseHyundaiPdfPlainText(
  rawText: string,
  locale: ArticleLocale,
  fileName?: string
): ParsedHyundaiPdf {
  const cleaned = stripLetterhead(rawText);
  const cmsTitle =
    extractTitleFromPdfText(cleaned, locale) ||
    (fileName ? extractTitleFromFileName(fileName, locale) : "");

  const lines = cleaned
    .split(/(?=[●•])|(?=Jakarta,\s*\d)/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((text) => ({ text, fontSize: 12 }));

  return linesToHtml(lines, locale, fileName || cmsTitle);
}

export function isPdfFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".pdf");
}
