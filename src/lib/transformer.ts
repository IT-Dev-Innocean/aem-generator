/**
 * Core transformer: converts semantic HTML (from mammoth/DOCX, Google Docs
 * export, pasted rich text, or generated-from-plain-text) into the exact
 * inline-styled HTML format used by the KIA article templates.
 *
 * The output mirrors the existing files in /KIA/*.html:
 *  - <h2 style="font-weight: 700;"> / <h3 style="font-weight: 700;">
 *  - <span style="font-weight: 700;"> for bold, <i> for italic
 *  - <a href style="color: rgb(0, 170, 210); text-decoration: none;"> links
 *  - <ul style="margin-left: 25px;"> + <li style="list-style: disc;">
 *  - <ol style="margin-left: 25px;"> + <li style="list-style: decimal;">
 *  - <p>&nbsp;</p> spacers between every top-level block
 */

export const LINK_STYLE = "color: rgb(0, 170, 210); text-decoration: none;";
export const BOLD_STYLE = "font-weight: 700;";
export const HEADING_STYLE = "font-weight: 700;";
export const UL_STYLE = "margin-left: 25px;";
export const OL_STYLE = "margin-left: 25px;";
export const LI_DISC_STYLE = "list-style: disc;";
export const LI_DECIMAL_STYLE = "list-style: decimal;";

export interface TransformOptions {
  /** Wrap the result in <html><body>...</body></html> like the source files. */
  fullDocument?: boolean;
  /** Indentation unit used for pretty printing. */
  indent?: string;
}

const SPACER = "<p>&nbsp;</p>";

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Collapse repeated whitespace/newlines into single spaces for inline text. */
function normalizeInlineWhitespace(value: string): string {
  return value.replace(/\s+/g, " ");
}

function isBoldElement(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === "strong" || tag === "b") return true;
  const weight = el.style.fontWeight || "";
  if (weight === "bold" || weight === "bolder") return true;
  const numeric = parseInt(weight, 10);
  if (!Number.isNaN(numeric) && numeric >= 600) return true;
  return false;
}

function isItalicElement(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === "em" || tag === "i") return true;
  if ((el.style.fontStyle || "") === "italic") return true;
  return false;
}

/** Render the inline (phrasing) content of a node into KIA-styled HTML. */
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
      out += `<a href="${escapeAttr(href)}" style="${LINK_STYLE}">${inner}</a>`;
      return;
    }

    const inner = renderInline(el);

    if (isBoldElement(el) && isItalicElement(el)) {
      out += `<span style="${BOLD_STYLE}"><i>${inner}</i></span>`;
      return;
    }
    if (isBoldElement(el)) {
      out += `<span style="${BOLD_STYLE}">${inner}</span>`;
      return;
    }
    if (isItalicElement(el)) {
      out += `<i>${inner}</i>`;
      return;
    }

    // sub/sup/code/u and any other inline wrapper: keep the text only.
    out += inner;
  });
  return out;
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, "&quot;");
}

function renderListItems(listEl: HTMLElement, marker: string, indent: string): string {
  const items: string[] = [];
  Array.from(listEl.children).forEach((child) => {
    if (child.tagName.toLowerCase() !== "li") return;
    const inner = renderInline(child as HTMLElement).trim();
    if (!inner) return;
    items.push(
      `${indent}    <li style="${marker}">${inner}</li>`
    );
  });
  return items.join("\n");
}

/** Block-level renderer. Returns null for blocks that should be skipped. */
function renderBlock(el: HTMLElement, indent: string): string | null {
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "h1":
    case "h2": {
      const inner = renderInline(el).trim();
      if (!inner) return null;
      return `${indent}<h2 style="${HEADING_STYLE}">${inner}</h2>`;
    }
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const inner = renderInline(el).trim();
      if (!inner) return null;
      return `${indent}<h3 style="${HEADING_STYLE}">${inner}</h3>`;
    }
    case "ul": {
      const items = renderListItems(el, LI_DISC_STYLE, indent);
      if (!items) return null;
      return `${indent}<ul style="${UL_STYLE}">\n${items}\n${indent}</ul>`;
    }
    case "ol": {
      const items = renderListItems(el, LI_DECIMAL_STYLE, indent);
      if (!items) return null;
      return `${indent}<ol style="${OL_STYLE}">\n${items}\n${indent}</ol>`;
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

/** Flatten container wrappers (e.g. mammoth/Google Docs nested divs). */
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
    } else if (tag === "div" || tag === "section" || tag === "article" || tag === "main") {
      // Recurse into generic containers to find real block content.
      const nested = collectBlocks(el);
      if (nested.length > 0) {
        blocks.push(...nested);
      } else if (renderInline(el).trim()) {
        blocks.push(el);
      }
    } else if (renderInline(el).trim()) {
      blocks.push(el);
    }
  });

  return blocks;
}

/**
 * Convert any semantic HTML string into the KIA article HTML format.
 * When `html` is already a body fragment (from document-processor), it is
 * wrapped in a temporary container for parsing.
 */
export function htmlToKiaArticle(
  html: string,
  options: TransformOptions = {}
): string {
  const { fullDocument = true, indent = "    " } = options;

  const wrapped = html.trim().startsWith("<")
    ? `<div>${html}</div>`
    : `<div><p>${html}</p></div>`;

  const doc = new DOMParser().parseFromString(wrapped, "text/html");
  const root = doc.body.firstElementChild as HTMLElement;

  const blocks = collectBlocks(root);

  const rendered: string[] = [];
  blocks.forEach((block) => {
    const result = renderBlock(block, indent);
    if (result !== null) rendered.push(result);
  });

  // Join every top-level block with a spacer paragraph, matching the
  // existing KIA templates.
  const spacerLine = `${indent}${SPACER}`;
  const innerBody = rendered.join(`\n${spacerLine}\n`);

  if (!fullDocument) {
    return innerBody;
  }

  return `<html>\n\n<body>\n${innerBody}\n</body>\n\n</html>`;
}

/**
 * Convert plain text into semantic HTML before transformation.
 * Heuristics:
 *  - Blank line separates paragraphs.
 *  - Lines starting with "# " / "## " / "### " become headings.
 *  - Lines starting with "- " or "* " form a bullet list.
 *  - Lines starting with "1." / "2." ... form a numbered list.
 *  - **text** -> bold, *text* / _text_ -> italic, [label](url) -> link.
 */
export function plainTextToHtml(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const htmlParts: string[] = [];

  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const joined = paragraphBuffer.join(" ").trim();
    if (joined) htmlParts.push(`<p>${inlineMarkdown(joined)}</p>`);
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (!listType || listBuffer.length === 0) {
      listType = null;
      listBuffer = [];
      return;
    }
    const items = listBuffer.map((i) => `<li>${inlineMarkdown(i)}</li>`).join("");
    htmlParts.push(`<${listType}>${items}</${listType}>`);
    listType = null;
    listBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(headingMatch[1].length, 6);
      htmlParts.push(`<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const bulletMatch = /^[-*•]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      flushParagraph();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listBuffer.push(bulletMatch[1]);
      continue;
    }

    const numberedMatch = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numberedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listBuffer.push(numberedMatch[1]);
      continue;
    }

    // Regular text line: continuation of a paragraph.
    flushList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

  return htmlParts.join("\n");
}

/** Minimal inline markdown -> HTML for the plain-text path. */
function inlineMarkdown(text: string): string {
  let out = text;
  // Links [label](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    return `<a href="${url}">${label}</a>`;
  });
  // Bold **text** or __text__
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  // Italic *text* or _text_
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
  return out;
}
