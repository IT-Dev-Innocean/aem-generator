import {
  formatSocialClosingHtml,
  isSocialClosingText,
} from "./hyundai-social-closing";
import type { ArticleLocale } from "./document-processor";

const BULLET_PREFIX_RE = /^[●•▪◦\-]\s+/;
const DEALER_LINE_RE =
  /^Hyundai\s+(?:Cibinong|Cibubur|Cimanggis|DI\s+Panjaitan|Kalimalang|Margonda|Pancoran|Pegangsaan|Pramuka|Tajur|Bintaro|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/;
const SECTION_HEADING_RE =
  /^(Daftarkan|Sambut|Hyundai Cup|About|Tentang|Layanan|Extended|Resale|Pasti Bisa)/i;

function getText(el: HTMLElement): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function stripBullet(text: string): string {
  return text.replace(BULLET_PREFIX_RE, "").trim();
}

function isBulletParagraph(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag !== "p" && tag !== "div") return false;
  return BULLET_PREFIX_RE.test(getText(el));
}

function isDealerItem(text: string): boolean {
  const t = stripBullet(text).trim();
  if (t.length > 50) return false;
  return DEALER_LINE_RE.test(t);
}

function isShortListItem(text: string): boolean {
  const t = stripBullet(text);
  if (!t || t.length > 120) return false;
  if (isDealerItem(t)) return true;
  if (/^(Juggling bola|Menyanyi|Menari|Bakat lainnya)$/i.test(t)) return true;
  if (/^(Pemeriksaan kendaraan|Layanan cuci mobil|Diagnosa kendaraan|Perawatan AC|Voucher spare parts|Pasti Bisa|Layanan Bantuan|Hyundai Premium|Extended Warranty|Resale Value)/i.test(t)) {
    return true;
  }
  return false;
}

function looksLikeSectionHeading(text: string): boolean {
  const t = text.trim();
  if (isSocialClosingText(t)) return false;
  if (t.length < 18 || t.length > 120) return false;
  if (/[.!?]$/.test(t)) return false;
  if (DATELINE_IN_TEXT_RE.test(t)) return false;
  return SECTION_HEADING_RE.test(t) || /^[A-Z][^.!?]{15,90}$/.test(t);
}

const DATELINE_IN_TEXT_RE =
  /Jakarta,\s*\d{1,2}\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?\s+\d{4}/i;

function splitLongListItem(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 160) return [normalized];

  const parts: string[] = [];
  let rest = normalized;

  while (rest.length > 160) {
    const dealerIdx = rest.search(
      /\sHyundai\s+(?:Cibinong|Cibubur|Cimanggis|DI Panjaitan|Kalimalang|Margonda|Pancoran|Pegangsaan|Pramuka|Tajur|Bintaro)\b/
    );
    const talentIdx = rest.search(/\s(Juggling bola|Menyanyi|Menari|Bakat lainnya|Pasti Bisa)/i);
    const tradeInIdx = rest.search(/\s+Selain itu,\s*pelanggan/i);
    const headingIdx = rest.search(
      /\s(Daftarkan Anak|Sambut Hyundai|Hyundai Sunday juga)/i
    );

    const candidates = [dealerIdx, talentIdx, tradeInIdx, headingIdx]
      .filter((i) => i > 40)
      .sort((a, b) => a - b);

    const splitAt = candidates[0];
    if (splitAt === undefined) break;

    parts.push(rest.slice(0, splitAt).trim());
    rest = rest.slice(splitAt).trim();
  }

  if (rest) parts.push(rest);
  return parts.length ? parts : [normalized];
}

const DEALER_BRANCH_RE =
  /^Hyundai\s+(?:Cibinong|Cibubur|Cimanggis|DI\s+Panjaitan|Kalimalang|Margonda|Pancoran|Pegangsaan|Pramuka|Tajur|Bintaro|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/;

function isDealerBranchName(text: string): boolean {
  const t = stripBullet(text).trim();
  if (!DEALER_BRANCH_RE.test(t)) return false;
  if (/Hyundai\s+(Sunday|Cup|Motors|Premium|also|juga|menghadirkan|dengan|akan|di)\b/i.test(t)) {
    return false;
  }
  return t.length <= 50;
}

function extractEmbeddedListItems(text: string): {
  before: string;
  items: string[];
  after: string;
} | null {
  const dealerPattern =
    /(?:^|\s)(Hyundai\s+(?:Cibinong|Cibubur|Cimanggis|DI Panjaitan|Kalimalang|Margonda|Pancoran|Pegangsaan|Pramuka|Tajur|Bintaro|[A-Z][a-z]+))(?=\s|,|$)/g;
  const matches = [...text.matchAll(dealerPattern)].filter((m) =>
    isDealerBranchName(m[1])
  );
  if (matches.length < 3) return null;

  const firstIdx = matches[0].index ?? 0;
  const last = matches[matches.length - 1];
  const lastEnd = (last.index ?? 0) + last[0].length;

  const before = text.slice(0, firstIdx).trim();
  const items = matches.map((m) => m[1].trim());
  const after = text.slice(lastEnd).trim();

  return { before, items, after };
}

function createElement(doc: Document, tag: string, text?: string): HTMLElement {
  const el = doc.createElement(tag);
  if (text) el.textContent = text;
  return el;
}

function bulletParagraphsToList(doc: Document, root: HTMLElement): void {
  const blocks = Array.from(root.children) as HTMLElement[];
  const output: HTMLElement[] = [];
  let pendingItems: string[] = [];

  const flushItems = () => {
    if (!pendingItems.length) return;
    const ul = createElement(doc, "ul");
    pendingItems.forEach((item) => {
      ul.appendChild(createElement(doc, "li", item));
    });
    output.push(ul);
    pendingItems = [];
  };

  for (const block of blocks) {
    if (isBulletParagraph(block)) {
      pendingItems.push(stripBullet(getText(block)));
      continue;
    }

    if (block.tagName.toLowerCase() === "p" || block.tagName.toLowerCase() === "div") {
      const text = getText(block);
      if (isShortListItem(text)) {
        pendingItems.push(stripBullet(text));
        continue;
      }
    }

    flushItems();
    output.push(block);
  }

  flushItems();
  root.replaceChildren(...output);
}

function repairOversizedListItems(doc: Document, root: HTMLElement): void {
  for (const ul of Array.from(root.querySelectorAll("ul"))) {
    if (ul.classList.contains("key-points")) continue;

    const items = Array.from(ul.querySelectorAll(":scope > li"));
    const replacement: HTMLElement[] = [];

    for (const li of items) {
      const text = getText(li as HTMLElement);
      if (/^Resale Value Guarantee:/i.test(text) && /Selain itu,/i.test(text)) {
        const splitAt = text.search(/\s+Selain itu,/i);
        if (splitAt > 0) {
          li.textContent = text.slice(0, splitAt).trim();
          ul.parentNode?.insertBefore(
            createElement(doc, "p", text.slice(splitAt).trim()),
            ul.nextSibling
          );
          continue;
        }
      }

      if (/^Bakat lainnya\s+[A-Z]/i.test(text)) {
        const splitAt = text.search(/\s+(Anak\s+-)/i);
        if (splitAt > 0) {
          li.textContent = text.slice(0, splitAt).trim();
          ul.parentNode?.insertBefore(
            createElement(doc, "p", text.slice(splitAt).trim()),
            ul.nextSibling
          );
          continue;
        }
      }

      if (/^Voucher spare parts/i.test(text)) {
        const splitAt = text.search(/\s+(Pengunjung dengan)/i);
        if (splitAt > 0) {
          li.textContent = text.slice(0, splitAt).trim();
          ul.parentNode?.insertBefore(
            createElement(doc, "p", text.slice(splitAt).trim()),
            ul.nextSibling
          );
          continue;
        }
      }

      const embedded = extractEmbeddedListItems(text);

      if (embedded && embedded.items.length >= 3) {
        if (embedded.before) {
          replacement.push(createElement(doc, "p", embedded.before));
        }
        const dealerUl = createElement(doc, "ul");
        embedded.items.forEach((item) => {
          dealerUl.appendChild(createElement(doc, "li", item));
        });
        replacement.push(dealerUl);
        if (embedded.after) {
          const afterParts = splitLongListItem(embedded.after);
          afterParts.forEach((part, idx) => {
            if (looksLikeSectionHeading(part)) {
              replacement.push(createElement(doc, "h3", part));
            } else {
              replacement.push(createElement(doc, "p", part));
            }
            if (idx < afterParts.length - 1 && isShortListItem(afterParts[idx + 1] ?? "")) {
              /* handled in next iterations */
            }
          });
        }
        continue;
      }

      const chunks = splitLongListItem(text);
      if (chunks.length === 1) continue;

      chunks.forEach((chunk) => {
        if (isShortListItem(chunk)) {
          replacement.push(createElement(doc, "li", stripBullet(chunk)));
        } else if (looksLikeSectionHeading(chunk)) {
          replacement.push(createElement(doc, "h3", chunk));
        } else {
          replacement.push(createElement(doc, "p", chunk));
        }
      });
      li.remove();
    }

    if (replacement.length) {
      replacement.forEach((node) => ul.parentNode?.insertBefore(node, ul));
      if (!ul.querySelector("li")) ul.remove();
    }
  }
}

function splitGiantParagraphs(doc: Document, root: HTMLElement): void {
  for (const p of Array.from(root.querySelectorAll("p"))) {
    const text = getText(p);
    if (text.length <= 900) continue;

    const datelineMatch = text.match(
      /^(Jakarta,\s*\d{1,2}\s+[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?\s+\d{4})\s*([–—-])\s*(.*)$/i
    );

    const fragments: string[] = [];
    if (datelineMatch) {
      fragments.push(`${datelineMatch[1]} ${datelineMatch[2]} ${datelineMatch[3]}`);
    } else {
      const sentences = text.split(/(?<=[.!?]["'"])\s+(?=[A-Z"“])/);
      fragments.push(...sentences.filter(Boolean));
    }

    if (fragments.length <= 1) continue;

    const parent = p.parentNode;
    if (!parent) continue;

    fragments.forEach((fragment, idx) => {
      const next = idx === 0 ? p : createElement(doc, "p", fragment);
      if (idx === 0) p.textContent = fragment;
      else parent.insertBefore(next, p.nextSibling);
    });
  }
}

function normalizeClosingBlocks(
  doc: Document,
  root: HTMLElement,
  locale: ArticleLocale
): void {
  const blocks = Array.from(root.children) as HTMLElement[];
  const output: HTMLElement[] = [];
  let socialAdded = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const tag = block.tagName.toLowerCase();
    const text = getText(block);

    if (
      !socialAdded &&
      ((tag === "h3" && isSocialClosingText(text)) ||
        (tag === "p" &&
          (block.classList.contains("social-closing") ||
            isSocialClosingText(text) ||
            /^HyundaiMotorIndonesia/i.test(text))))
    ) {
      const p = doc.createElement("p");
      p.className = "social-closing";
      p.innerHTML = formatSocialClosingHtml(locale);
      output.push(p);
      socialAdded = true;
      while (
        i + 1 < blocks.length &&
        /HyundaiMotorIndonesia|@HyundaiMotorID|Ikuti\s+(?:juga\s+)?informasi/i.test(
          getText(blocks[i + 1])
        )
      ) {
        i++;
      }
      continue;
    }

    if (tag === "p" && /Selain itu,\s*pelanggan/i.test(text)) {
      output.push(block);
      continue;
    }

    if (tag === "p" && /tahun ketiga kepemilikan\./i.test(text) && /Selain itu,/i.test(text)) {
      const splitAt = text.search(/\s+Selain itu,/i);
      output.push(createElement(doc, "p", text.slice(0, splitAt).trim()));
      output.push(createElement(doc, "p", text.slice(splitAt).trim()));
      continue;
    }

    output.push(block);
  }

  root.replaceChildren(...output);
}

/** Normalize bullet paragraphs and fix merged list content from PDF extraction. */
export function repairHyundaiSemanticHtml(
  html: string,
  locale: ArticleLocale = "id"
): string {
  const doc = new DOMParser().parseFromString(
    html.trim().startsWith("<") ? html : `<p>${html}</p>`,
    "text/html"
  );
  const root =
    doc.body.firstElementChild?.tagName.toLowerCase() === "div"
      ? (doc.body.firstElementChild as HTMLElement)
      : doc.body;

  bulletParagraphsToList(doc, root);
  splitGiantParagraphs(doc, root);
  repairOversizedListItems(doc, root);
  normalizeClosingBlocks(doc, root, locale);

  return root.innerHTML;
}
