/**
 * Transform semantic HTML into KIA press / news HTML matching
 * aem-template/bagas/kia/kia-press-{en|id}-*.html
 *
 * Differences vs article transformer:
 *  - bare <h3>, unstyled <ul>/<li>
 *  - bullet text prefixed with ●
 *  - <strong> / <i> instead of inline font-weight spans
 *  - spacer after lists (and between blocks for ID locale)
 */

import type { ArticleLocale } from "./document-processor";

export interface NewsTransformOptions {
  locale?: ArticleLocale;
  fullDocument?: boolean;
  indent?: string;
}

const SPACER = "<p>&nbsp;</p>";
const BULLET = "● ";

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
      out += `<a href="${escapeAttr(href)}">${inner}</a>`;
      return;
    }

    const inner = renderInline(el);

    if (isBoldElement(el) && isItalicElement(el)) {
      out += `<strong><i>${inner}</i></strong>`;
      return;
    }
    if (isBoldElement(el)) {
      out += `<strong>${inner}</strong>`;
      return;
    }
    if (isItalicElement(el)) {
      out += `<i>${inner}</i>`;
      return;
    }

    out += inner;
  });
  return out;
}

function withBulletPrefix(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/^[●•▪◦]\s*/.test(trimmed)) {
    return trimmed.replace(/^[●•▪◦]\s*/, BULLET);
  }
  return `${BULLET}${trimmed}`;
}

function renderListItems(listEl: HTMLElement, indent: string): string {
  const items: string[] = [];
  Array.from(listEl.children).forEach((child) => {
    if (child.tagName.toLowerCase() !== "li") return;
    const inner = withBulletPrefix(renderInline(child as HTMLElement));
    if (!inner) return;
    items.push(`${indent}    <li>${inner}</li>`);
  });
  return items.join("\n");
}

function renderBlock(el: HTMLElement, indent: string): string | null {
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const inner = renderInline(el).trim();
      if (!inner) return null;
      return `${indent}<h3>${inner}</h3>`;
    }
    case "ul":
    case "ol": {
      const items = renderListItems(el, indent);
      if (!items) return null;
      return `${indent}<ul>\n${items}\n${indent}</ul>`;
    }
    case "blockquote":
    case "p":
    case "div": {
      const inner = renderInline(el).trim();
      if (!inner) return null;
      return `${indent}<p>${inner}</p>`;
    }
    default: {
      const inner = renderInline(el).trim();
      if (!inner) return null;
      return `${indent}<p>${inner}</p>`;
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
      else if (renderInline(el).trim()) blocks.push(el);
    } else if (renderInline(el).trim()) {
      blocks.push(el);
    }
  });

  return blocks;
}

function shouldInsertSpacer(
  previous: string | null,
  current: string,
  locale: ArticleLocale
): boolean {
  if (!previous) return false;
  const prevIsList = previous.includes("<ul>");
  const currIsList = current.includes("<ul>");
  const currIsHeading = current.includes("<h3>");

  // Always space after a key-points / body list.
  if (prevIsList) return true;

  // ID press releases commonly space before headings and between paragraphs.
  if (locale === "id") {
    if (currIsHeading || currIsList) return true;
    if (previous.includes("<p>") && current.includes("<p>")) return true;
  }

  return false;
}

/** Convert semantic HTML into KIA press-release HTML. */
export function htmlToKiaPress(
  html: string,
  options: NewsTransformOptions = {}
): string {
  const {
    locale = "id",
    fullDocument = true,
    indent = "    ",
  } = options;

  const wrapped = html.trim().startsWith("<")
    ? `<div>${html}</div>`
    : `<div><p>${html}</p></div>`;

  const doc = new DOMParser().parseFromString(wrapped, "text/html");
  const root = doc.body.firstElementChild as HTMLElement;
  const blocks = collectBlocks(root);

  const rendered: string[] = [];
  let previous: string | null = null;

  blocks.forEach((block) => {
    const result = renderBlock(block, indent);
    if (result === null) return;
    if (shouldInsertSpacer(previous, result, locale)) {
      rendered.push(`${indent}${SPACER}`);
    }
    rendered.push(result);
    previous = result;
  });

  const innerBody = rendered.join("\n");

  if (!fullDocument) return innerBody;

  return `<html>\n\n<body>\n${innerBody}\n\n</body>\n\n</html>`;
}
