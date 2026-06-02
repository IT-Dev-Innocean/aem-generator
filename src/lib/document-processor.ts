/**
 * Pre-process raw semantic HTML before KIA transformation:
 *  - Remove SEO Meta Data blocks (Title Tag, Meta Description, etc.)
 *  - Split bilingual documents into separate ID / EN sections
 */

export type ArticleLocale = "id" | "en";

export interface DocumentSection {
  locale: ArticleLocale;
  /** Semantic HTML fragment (body inner content). */
  html: string;
}

const SEO_META_RE = /^seo\s*meta\s*data/i;
const SEO_LIST_ITEM_RE = /^(title\s*tag|meta\s*description|meta\s*title|focus\s*keyword|slug|url)\s*:/i;

const ID_MARKER_RE =
  /^(version\s*)?(\[?\s*id\s*\]?|bahasa\s*indonesia|indonesian(\s*version)?|versi\s*indonesia|indonesia\s*version)/i;
const EN_MARKER_RE =
  /^(version\s*)?(\[?\s*en\s*\]?|english(\s*version)?|versi\s*inggris|inggris(\s*version)?)/i;

function getBlockText(el: HTMLElement): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function isSeoMetaHeading(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (!["p", "h1", "h2", "h3", "h4", "h5", "h6", "div"].includes(tag)) {
    return false;
  }
  return SEO_META_RE.test(getBlockText(el));
}

function isSeoListBlock(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag !== "ul" && tag !== "ol") return false;
  const items = Array.from(el.querySelectorAll("li"));
  if (items.length === 0) return false;
  return items.every((li) => SEO_LIST_ITEM_RE.test(getBlockText(li as HTMLElement)));
}

function isEmptyBlock(el: HTMLElement): boolean {
  return getBlockText(el) === "";
}

function detectLocaleMarker(el: HTMLElement): ArticleLocale | null {
  const tag = el.tagName.toLowerCase();
  if (!["h1", "h2", "h3", "h4", "h5", "h6", "p"].includes(tag)) return null;
  const text = getBlockText(el);
  if (ID_MARKER_RE.test(text)) return "id";
  if (EN_MARKER_RE.test(text)) return "en";
  return null;
}

/** Collect top-level block elements from a parsed document body. */
export function collectRawBlocks(root: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  const blockTags = new Set([
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "blockquote",
    "table",
    "pre",
    "hr",
  ]);

  Array.from(root.children).forEach((child) => {
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (blockTags.has(tag)) {
      blocks.push(el);
    } else if (
      tag === "div" ||
      tag === "section" ||
      tag === "article" ||
      tag === "main"
    ) {
      blocks.push(...collectRawBlocks(el));
    } else if (getBlockText(el)) {
      blocks.push(el);
    }
  });

  return blocks;
}

/**
 * Remove SEO Meta Data sections from a block list.
 * A section starts at "SEO Meta Data" heading and includes following
 * empty blocks + SEO list (Title Tag / Meta Description) until real content.
 */
export function stripSeoMetaBlocks(blocks: HTMLElement[]): HTMLElement[] {
  const result: HTMLElement[] = [];
  let i = 0;

  while (i < blocks.length) {
    if (isSeoMetaHeading(blocks[i])) {
      i++;
      // Skip trailing empty blocks and SEO metadata lists.
      while (i < blocks.length) {
        if (isEmptyBlock(blocks[i])) {
          i++;
          continue;
        }
        if (isSeoListBlock(blocks[i])) {
          i++;
          continue;
        }
        break;
      }
      continue;
    }
    result.push(blocks[i]);
    i++;
  }

  return result;
}

function blocksToHtml(blocks: HTMLElement[]): string {
  if (blocks.length === 0) return "";
  const wrapper = document.createElement("div");
  blocks.forEach((b) => wrapper.appendChild(b.cloneNode(true)));
  return wrapper.innerHTML;
}

function mergeHtmlFragments(fragments: string[]): string {
  return fragments.filter((f) => f.trim()).join("\n");
}

/** Ensure at most one ID and one EN section (merge duplicates). */
function mergeSectionsByLocale(sections: DocumentSection[]): DocumentSection[] {
  const buckets = new Map<ArticleLocale, string[]>();

  for (const s of sections) {
    if (!s.html.trim()) continue;
    const list = buckets.get(s.locale) ?? [];
    list.push(s.html);
    buckets.set(s.locale, list);
  }

  const result: DocumentSection[] = [];
  if (buckets.has("id")) {
    result.push({ locale: "id", html: mergeHtmlFragments(buckets.get("id")!) });
  }
  if (buckets.has("en")) {
    result.push({ locale: "en", html: mergeHtmlFragments(buckets.get("en")!) });
  }

  return result.length > 0 ? result : [{ locale: "id", html: "" }];
}

function splitByLocaleMarkers(blocks: HTMLElement[]): DocumentSection[] | null {
  const sections: { locale: ArticleLocale; start: number; end: number }[] = [];
  let currentLocale: ArticleLocale | null = null;
  let sectionStart = 0;

  for (let i = 0; i < blocks.length; i++) {
    const marker = detectLocaleMarker(blocks[i]);
    if (!marker) continue;

    if (currentLocale !== null) {
      sections.push({ locale: currentLocale, start: sectionStart, end: i });
    } else if (i > 0) {
      // Content before first explicit marker defaults to ID.
      sections.push({ locale: "id", start: 0, end: i });
    }

    currentLocale = marker;
    sectionStart = i + 1; // skip the marker heading itself
  }

  if (currentLocale !== null) {
    sections.push({
      locale: currentLocale,
      start: sectionStart,
      end: blocks.length,
    });
  }

  if (sections.length < 2) return null;

  return mergeSectionsByLocale(
    sections.map(({ locale, start, end }) => ({
      locale,
      html: blocksToHtml(stripSeoMetaBlocks(blocks.slice(start, end))),
    }))
  );
}

/**
 * Split by repeated "SEO Meta Data" blocks — common Google Docs pattern:
 *   [SEO block] → ID article → [SEO block] → EN article
 *
 * Only the first two SEO boundaries are used so extra trailing SEO blocks
 * do not create a duplicate EN tab.
 */
function splitBySeoBoundaries(blocks: HTMLElement[]): DocumentSection[] | null {
  const seoIndices: number[] = [];
  blocks.forEach((block, i) => {
    if (isSeoMetaHeading(block)) seoIndices.push(i);
  });

  if (seoIndices.length < 2) return null;

  // ID content: from after first SEO up to (not including) second SEO block
  let idContentStart = seoIndices[0] + 1;
  while (idContentStart < seoIndices[1]) {
    if (isEmptyBlock(blocks[idContentStart])) {
      idContentStart++;
      continue;
    }
    if (isSeoListBlock(blocks[idContentStart])) {
      idContentStart++;
      continue;
    }
    break;
  }
  const idSliceClean = blocks.slice(idContentStart, seoIndices[1]);

  // EN content: everything after second SEO block (strip any extra SEO sections)
  let enContentStart = seoIndices[1] + 1;
  while (enContentStart < blocks.length) {
    if (isEmptyBlock(blocks[enContentStart])) {
      enContentStart++;
      continue;
    }
    if (isSeoListBlock(blocks[enContentStart])) {
      enContentStart++;
      continue;
    }
    break;
  }
  const enSliceClean = blocks.slice(enContentStart);

  if (idSliceClean.length === 0 && enSliceClean.length === 0) return null;

  return mergeSectionsByLocale([
    {
      locale: "id",
      html: blocksToHtml(stripSeoMetaBlocks(idSliceClean)),
    },
    {
      locale: "en",
      html: blocksToHtml(stripSeoMetaBlocks(enSliceClean)),
    },
  ]).filter((s) => s.html.trim());
}

/**
 * Split document into ID / EN sections when bilingual content is detected.
 * Returns a single section when only one language is present.
 */
export function splitDocumentSections(html: string): DocumentSection[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks = collectRawBlocks(doc.body);

  if (blocks.length === 0) {
    return [{ locale: "id", html: "" }];
  }

  // 1) Explicit locale markers (Version ID / Version EN, etc.)
  const byMarkers = splitByLocaleMarkers(blocks);
  if (byMarkers && byMarkers.length >= 2) {
    return byMarkers;
  }

  // 2) Repeated SEO Meta Data blocks → ID then EN
  const bySeo = splitBySeoBoundaries(blocks);
  if (bySeo && bySeo.length >= 2) {
    return bySeo;
  }

  // 3) Single document — strip SEO and return as ID
  const cleaned = stripSeoMetaBlocks(blocks);
  return [{ locale: "id", html: blocksToHtml(cleaned) }];
}
