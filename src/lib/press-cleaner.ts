/**
 * Strip press-release chrome that should never appear in KIA news HTML:
 *  - Header / title above the key-points bullet list
 *  - "Tentang KIA…" / "About Kia…" boilerplate after the separator
 */
import { collectRawBlocks } from "./document-processor";

const ABOUT_RE =
  /^(tentang|about)\s+kia(\s+sales)?(\s+indonesia)?\b/i;
const CONTACT_RE = /^(kontak|contact)\s*:?\s*$/i;
const TAGLINE_RE = /^movement\s+that\s+inspires\.?$/i;
const HEADER_NOISE_RE =
  /^(press\s*release|pt\s*kia\s*sales\s*indonesia|kia\s*sales\s*indonesia)\b/i;

function getBlockText(el: HTMLElement): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function isListBlock(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  return tag === "ul" || tag === "ol";
}

/** Key-points sometimes arrive as plain paragraphs with a bullet character. */
function isBulletParagraph(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag !== "p" && tag !== "div") return false;
  return /^[●•▪◦]\s+\S/.test(getBlockText(el));
}

function isContentStart(el: HTMLElement): boolean {
  return isListBlock(el) || isBulletParagraph(el);
}

function isHrBlock(el: HTMLElement): boolean {
  return el.tagName.toLowerCase() === "hr";
}

/** Mammoth sometimes turns a short centered rule into a short dash/underscore paragraph. */
function isSeparatorParagraph(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag !== "p" && tag !== "div") return false;
  const text = getBlockText(el);
  if (!text) {
    // Empty paragraph with a bottom border is common for Word horizontal lines.
    const border = (el.getAttribute("style") ?? "").toLowerCase();
    return /border(-(top|bottom))?/.test(border);
  }
  return /^[-–—_*·.]{3,}$/.test(text) || text.length <= 2 && /^[-–—_]$/.test(text);
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

function isTagline(el: HTMLElement): boolean {
  return TAGLINE_RE.test(getBlockText(el));
}

function isHeaderNoise(el: HTMLElement): boolean {
  const text = getBlockText(el);
  if (!text) return true;
  if (HEADER_NOISE_RE.test(text)) return true;
  // Address / phone lines often precede the title.
  if (/^r[dt]tx\b/i.test(text)) return true;
  if (/jl\.?\s|jakarta\s|indonesia\s*\d{5}/i.test(text) && text.length < 160) {
    return true;
  }
  if (/^\+?\d[\d\s\-()]{6,}$/.test(text)) return true;
  return false;
}

function blocksToHtml(blocks: HTMLElement[]): string {
  if (blocks.length === 0) return "";
  const wrapper = document.createElement("div");
  blocks.forEach((b) => wrapper.appendChild(b.cloneNode(true)));
  return wrapper.innerHTML;
}

/**
 * Keep content from the first bullet list through (but not including)
 * the About-Kia boilerplate / trailing separator.
 */
export function cleanPressDocumentHtml(html: string): string {
  const doc = new DOMParser().parseFromString(
    html.trim().startsWith("<") ? html : `<p>${html}</p>`,
    "text/html"
  );
  const blocks = collectRawBlocks(doc.body);
  if (blocks.length === 0) return html;

  let start = blocks.findIndex((b) => isContentStart(b));
  if (start < 0) {
    // No bullets — drop letterhead + leading title, keep body until About section.
    start = 0;
    while (start < blocks.length && isHeaderNoise(blocks[start])) {
      start++;
    }
    if (start < blocks.length) {
      const first = blocks[start];
      const tag = first.tagName.toLowerCase();
      const text = getBlockText(first);
      const looksLikeTitle =
        ["h1", "h2", "h3", "p"].includes(tag) &&
        text.length > 40 &&
        !/[–—-]/.test(text) &&
        !/^\s*(seoul|jakarta|los\s*angeles)/i.test(text);
      if (looksLikeTitle) start++;
    }
  }

  let end = blocks.length;
  for (let i = start; i < blocks.length; i++) {
    const block = blocks[i];
    if (
      isHrBlock(block) ||
      isSeparatorParagraph(block) ||
      isAboutHeading(block) ||
      isContactHeading(block) ||
      isTagline(block)
    ) {
      end = i;
      break;
    }
  }

  // Also drop a title block immediately before the first list if start pointed at list
  // (already excluded by start index). Trim trailing empty blocks.
  let slice = blocks.slice(start, end);
  while (slice.length && !getBlockText(slice[slice.length - 1])) {
    slice = slice.slice(0, -1);
  }

  return blocksToHtml(slice);
}
