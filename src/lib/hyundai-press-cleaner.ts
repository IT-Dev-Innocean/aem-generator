/**
 * Strip Hyundai press-release chrome and extract CMS title:
 *  - Letterhead / header above key points
 *  - Document title (returned separately for AEM)
 *  - "Tentang Hyundai…" / "About Hyundai…" boilerplate after body
 */
import { collectRawBlocks } from "./document-processor";

const ABOUT_RE =
  /^(tentang|about)\s+hyundai(\s+motor)?(\s+indonesia)?\b/i;
const CONTACT_RE = /^(kontak|contact)\s*:?\s*$/i;
const END_MARKER_RE = /^[–—-]\s*(?:end|selesai)\s*[–—-]\s*$/i;
const HEADER_NOISE_RE =
  /^(press\s*release|pt\.?\s*hyundai|hyundai\s*motor(\s+indonesia)?)\b/i;
const SEO_TITLE_TAG_RE = /^title\s*tag\s*:\s*(.+)/i;
const SEO_META_RE = /^seo\s*meta\s*data/i;

const DATELINE_RE =
  /^\s*(jakarta|seoul|surabaya|bandung|medan|makassar|yogyakarta|denpasar|los\s*angeles)/i;

export const CMS_TITLE_MAX_LENGTH = 100;

/** Trim to max at word boundary — no ellipsis, no trailing period/punctuation. */
export function finalizeCmsTitle(
  value: string,
  max = CMS_TITLE_MAX_LENGTH
): string {
  let result = value.replace(/\s+/g, " ").trim();

  // Strip boilerplate tails before length check
  result = result
    .replace(/,?\s*(hingga|and)\s+(Audisi|Hyundai Cup).*$/i, "")
    .replace(/™\s*\d{4}.*$/i, "")
    .replace(/[.…,;:\-–—]+$/g, "")
    .trim();

  if (result.length <= max) return result;

  const slice = result.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  result =
    lastSpace > max * 0.5
      ? slice.slice(0, lastSpace).trim()
      : slice.trim();

  return result.replace(/[.…,;:\-–—]+$/g, "").trim();
}

function getBlockText(el: HTMLElement): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function truncateCmsTitle(value: string): string {
  return finalizeCmsTitle(value);
}

function isEmptyBlock(el: HTMLElement): boolean {
  return getBlockText(el) === "";
}

function isListBlock(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  return tag === "ul" || tag === "ol";
}

function isSeoMetaHeading(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (!["p", "h1", "h2", "h3", "h4", "h5", "h6", "div"].includes(tag)) {
    return false;
  }
  return SEO_META_RE.test(getBlockText(el));
}

function isHrBlock(el: HTMLElement): boolean {
  return el.tagName.toLowerCase() === "hr";
}

function isSeparatorParagraph(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag !== "p" && tag !== "div") return false;
  const text = getBlockText(el);
  if (!text) {
    const border = (el.getAttribute("style") ?? "").toLowerCase();
    return /border(-(top|bottom))?/.test(border);
  }
  return /^[-–—_*·.]{3,}$/.test(text) || (text.length <= 2 && /^[-–—_]$/.test(text));
}

function isAboutHeading(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (!["p", "h1", "h2", "h3", "h4", "h5", "h6", "div"].includes(tag)) {
    return false;
  }
  return ABOUT_RE.test(getBlockText(el));
}

function isContactHeading(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (!["p", "h1", "h2", "h3", "h4", "h5", "h6", "div"].includes(tag)) {
    return false;
  }
  return CONTACT_RE.test(getBlockText(el));
}

function isEndMarker(el: HTMLElement): boolean {
  return END_MARKER_RE.test(getBlockText(el));
}

function isHeaderNoise(el: HTMLElement): boolean {
  const text = getBlockText(el);
  if (!text) return true;
  if (HEADER_NOISE_RE.test(text)) return true;
  if (/^r[dt]tx\b/i.test(text)) return true;
  if (/jl\.?\s|indonesia\s*\d{5}/i.test(text) && text.length < 160 && !isDateline(el)) {
    return true;
  }
  if (/^\+?\d[\d\s\-()]{6,}$/.test(text)) return true;
  return false;
}

function isDateline(el: HTMLElement): boolean {
  const text = getBlockText(el);
  return DATELINE_RE.test(text) && /\d/.test(text);
}

function isHeadingTag(el: HTMLElement): boolean {
  return /^h[1-6]$/.test(el.tagName.toLowerCase());
}

function looksLikeTitleBlock(el: HTMLElement): boolean {
  const text = getBlockText(el);
  if (!text || text.length < 12) return false;
  if (isDateline(el) || isHeaderNoise(el)) return false;
  if (SEO_META_RE.test(text)) return false;
  if (isListBlock(el)) return false;

  const tag = el.tagName.toLowerCase();
  if (isHeadingTag(el)) return true;

  if (["p", "div"].includes(tag)) {
    const looksLikeStandaloneTitle =
      text.length >= 20 &&
      text.length <= 200 &&
      !/[–—-]\s*$/.test(text) &&
      !isDateline(el);
    return looksLikeStandaloneTitle;
  }

  return false;
}

function extractTitleFromSeoBlocks(blocks: HTMLElement[]): string | null {
  for (let i = 0; i < blocks.length; i++) {
    if (!isSeoMetaHeading(blocks[i])) continue;

    for (let j = i + 1; j < blocks.length; j++) {
      const block = blocks[j];
      if (isEmptyBlock(block)) continue;

      const tag = block.tagName.toLowerCase();
      if (tag === "ul" || tag === "ol") {
        for (const li of Array.from(block.querySelectorAll("li"))) {
          const text = getBlockText(li as HTMLElement);
          const match = SEO_TITLE_TAG_RE.exec(text);
          if (match?.[1]) return truncateCmsTitle(match[1]);
        }
        continue;
      }

      if (isSeoMetaHeading(block) || isHeaderNoise(block)) continue;
      break;
    }
  }

  return null;
}

function extractTitleFromBody(blocks: HTMLElement[]): string | null {
  const contentStart = findContentStart(blocks);

  for (let i = 0; i < contentStart; i++) {
    const block = blocks[i];
    if (isEmptyBlock(block) || isHeaderNoise(block) || isSeoMetaHeading(block)) {
      continue;
    }
    if (looksLikeTitleBlock(block)) {
      return truncateCmsTitle(getBlockText(block));
    }
  }

  return null;
}

function findContentStart(blocks: HTMLElement[]): number {
  const firstList = blocks.findIndex((b) => isListBlock(b));
  if (firstList >= 0) return firstList;

  const dateline = blocks.findIndex((b) => isDateline(b));
  if (dateline >= 0) return dateline;

  let start = 0;
  while (start < blocks.length && (isHeaderNoise(blocks[start]) || isSeoMetaHeading(blocks[start]))) {
    start++;
  }
  while (start < blocks.length && looksLikeTitleBlock(blocks[start])) {
    start++;
  }
  return start;
}

function blocksToHtml(blocks: HTMLElement[]): string {
  if (blocks.length === 0) return "";
  const wrapper = document.createElement("div");
  blocks.forEach((b) => wrapper.appendChild(b.cloneNode(true)));
  return wrapper.innerHTML;
}

export interface CleanHyundaiPressResult {
  html: string;
  cmsTitle: string;
}

/**
 * Keep press body from key points / dateline through social closing paragraph.
 * Title, letterhead, and About-Hyundai boilerplate are excluded from HTML.
 */
export function cleanHyundaiPressDocumentHtml(html: string): CleanHyundaiPressResult {
  const doc = new DOMParser().parseFromString(
    html.trim().startsWith("<") ? html : `<p>${html}</p>`,
    "text/html"
  );
  const blocks = collectRawBlocks(doc.body);
  if (blocks.length === 0) {
    return { html, cmsTitle: "" };
  }

  const cmsTitle =
    extractTitleFromSeoBlocks(blocks) ??
    extractTitleFromBody(blocks) ??
    "";

  const start = findContentStart(blocks);

  let end = blocks.length;
  for (let i = start; i < blocks.length; i++) {
    const block = blocks[i];
    if (
      isHrBlock(block) ||
      isSeparatorParagraph(block) ||
      isAboutHeading(block) ||
      isContactHeading(block) ||
      isEndMarker(block)
    ) {
      end = i;
      break;
    }
  }

  let slice = blocks.slice(start, end);
  while (slice.length && !getBlockText(slice[slice.length - 1])) {
    slice = slice.slice(0, -1);
  }

  return {
    html: blocksToHtml(slice),
    cmsTitle,
  };
}
