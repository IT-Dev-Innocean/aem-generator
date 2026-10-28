/**
 * Transform semantic HTML into Hyundai press-release HTML matching
 * dist/press-id-*.html & dist/press-en-*.html reference templates.
 */
import type { ArticleLocale } from "./document-processor";

export interface HyundaiTransformOptions {
  locale?: ArticleLocale;
}

const P_STYLE = 'style="font-size: 16px; line-height: 1.4;" dir="ltr"';
const H3_STYLE =
  'style="font-size: 24px; line-height: 1.4; font-weight: 700; margin-bottom: 8px;" dir="ltr"';
const UL_STYLE =
  'style="margin-left: 25px; padding-left: 18px; font-size: 16px; line-height: 1.4; list-style-type: disc;"';
const LI_STYLE = 'style="font-size: 16px; line-height: 1.4; margin-bottom: 4px;"';
const SPACER = `<p ${P_STYLE}>&nbsp;</p>`;

const ID_HEADING_STYLE = `<style>
    @media screen and (max-width: 740px) {
        .press-release__heading {
            font-size: 18px !important;
        }
    }
</style>`;

const DATELINE_RE =
  /Jakarta,\s*\d{1,2}\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?\s+\d{4}\s*[–—-]\s*(.+)$/i;

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, "&quot;");
}

function normalizeInlineWhitespace(value: string): string {
  return value.replace(/\s+/g, " ");
}

function isBoldElement(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === "strong" || tag === "b") return true;
  const weight = el.style.fontWeight || "";
  if (weight === "bold" || weight === "bolder") return true;
  const numeric = parseInt(weight, 10);
  return !Number.isNaN(numeric) && numeric >= 600;
}

function isItalicElement(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === "em" || tag === "i") return true;
  return (el.style.fontStyle || "") === "italic";
}

function renderInline(node: Node): string {
  let out = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += escapeText(normalizeInlineWhitespace(child.textContent ?? ""));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "br") {
      out += "<br>";
      return;
    }

    if (tag === "a") {
      const href = el.getAttribute("href") ?? "#";
      const inner = renderInline(el).trim();
      out += `<a style="color: rgb(0, 170, 210); text-decoration: none;" href="${escapeAttr(href)}">${inner}</a>`;
      return;
    }

    const inner = renderInline(el);

    if (isBoldElement(el) && isItalicElement(el)) {
      out += `<strong><em>${inner}</em></strong>`;
      return;
    }
    if (isBoldElement(el)) {
      out += `<strong>${inner}</strong>`;
      return;
    }
    if (isItalicElement(el)) {
      out += `<em>${inner}</em>`;
      return;
    }

    out += inner;
  });
  return out;
}

function formatDatelineParagraph(text: string): string {
  const normalized = text.replace(/(\d)\s+(\d)/g, "$1$2");
  const match = DATELINE_RE.exec(normalized);
  if (!match) return `<p ${P_STYLE}>${escapeText(normalized)}</p>`;

  const full = normalized.match(
    /(Jakarta,\s*\d{1,2}\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?\s+\d{4})\s*([–—-])\s*(.*)$/i
  );
  if (!full) return `<p ${P_STYLE}>${escapeText(normalized)}</p>`;

  return `<p ${P_STYLE}><span style="font-weight: 700;">${escapeText(full[1].trim())}</span> ${full[2]} ${escapeText(full[3].trim())}</p>`;
}

function formatParagraph(el: HTMLElement): string | null {
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;

  if (DATELINE_RE.test(text)) {
    return formatDatelineParagraph(text);
  }

  const inner = renderInline(el).trim();
  if (!inner) return null;

  // Already contains inline HTML from PDF processor (strong/em/a)
  if (/<(?:strong|em|a)\b/i.test(el.innerHTML) || el.classList.contains("social-closing")) {
    return `<p ${P_STYLE}>${inner}</p>`;
  }

  if (/^www\.hyundai\.com/i.test(text.replace(/\s+/g, ""))) {
    return `<p ${P_STYLE}><span style="color: rgb(0, 170, 210);"><strong>${inner}</strong></span></p>`;
  }

  return `<p ${P_STYLE}>${inner}</p>`;
}

function stripBulletPrefix(text: string): string {
  return text.replace(/^[●•▪◦\-]\s*/, "").trim();
}

function renderListItems(listEl: HTMLElement): string {
  const isKeyPoints = listEl.classList.contains("key-points");
  const items: string[] = [];
  Array.from(listEl.children).forEach((child) => {
    if (child.tagName.toLowerCase() !== "li") return;
    let inner = stripBulletPrefix(renderInline(child as HTMLElement).trim());
    if (!inner) return;
    if (isKeyPoints && !inner.includes("<em>")) {
      inner = `<em>${inner}</em>`;
    }
    items.push(`    <li ${LI_STYLE}>${inner}</li>`);
  });
  return items.join("\n");
}

function renderHeading(el: HTMLElement, locale: ArticleLocale): string | null {
  const inner = renderInline(el).trim();
  if (!inner) return null;

  if (locale === "id") {
    return `<h3 class="press-release__heading" ${H3_STYLE}>${inner}</h3>`;
  }
  return `<h3 ${H3_STYLE}>${inner}</h3>`;
}

function renderBlock(el: HTMLElement, locale: ArticleLocale): string | null {
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return renderHeading(el, locale);
    case "ul":
    case "ol": {
      const items = renderListItems(el);
      if (!items) return null;
      return `<ul ${UL_STYLE}>\n${items}\n</ul>`;
    }
    case "blockquote":
    case "p":
    case "div":
      return formatParagraph(el);
    default: {
      const inner = renderInline(el).trim();
      if (!inner) return null;
      return `<p ${P_STYLE}>${inner}</p>`;
    }
  }
}

function collectBlocks(root: HTMLElement): HTMLElement[] {
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
      const nested = collectBlocks(el);
      if (nested.length > 0) blocks.push(...nested);
      else if ((el.textContent ?? "").trim()) blocks.push(el);
    } else if ((el.textContent ?? "").trim()) {
      blocks.push(el);
    }
  });

  return blocks;
}

function shouldInsertSpacer(previous: string | null, current: string): boolean {
  if (!previous) return false;
  const prevIsList = previous.includes("<ul");
  const currIsList = current.includes("<ul");
  const currIsHeading = current.includes("<h3");

  if (prevIsList) return true;
  if (currIsHeading || currIsList) return true;
  if (previous.includes("<p") && current.includes("<p")) return true;
  return false;
}

/** Convert semantic HTML into Hyundai press-release HTML fragment. */
export function htmlToHyundaiPress(
  html: string,
  options: HyundaiTransformOptions = {}
): string {
  const locale = options.locale ?? "id";

  const wrapped = html.trim().startsWith("<")
    ? `<div>${html}</div>`
    : `<div><p>${html}</p></div>`;

  const doc = new DOMParser().parseFromString(wrapped, "text/html");
  const root = doc.body.firstElementChild as HTMLElement;
  const blocks = collectBlocks(root);

  const rendered: string[] = [];
  let previous: string | null = null;

  blocks.forEach((block) => {
    const result = renderBlock(block, locale);
    if (result === null) return;
    if (shouldInsertSpacer(previous, result)) {
      rendered.push(SPACER);
    }
    rendered.push(result);
    previous = result;
  });

  const body = rendered.join("\n");
  if (locale === "id") {
    return `${ID_HEADING_STYLE}\n${body}`;
  }
  return body;
}
