/**
 * Standard Hyundai press-release social closing paragraph (ID / EN).
 */
import type { ArticleLocale } from "./document-processor";

const LINK_STYLE = 'style="color: rgb(0, 170, 210); text-decoration: none;"';

function link(href: string, label: string): string {
  return `<a ${LINK_STYLE} href="${href}">${label}</a>`;
}

export function isSocialClosingText(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  return (
    /^Ikuti\s+(?:juga\s+)?informasi/i.test(t) ||
    /^Stay updated on the latest Hyundai/i.test(t) ||
    /HyundaiMotorIndonesia.*@HyundaiMotorID/i.test(t) ||
    /www\.hyundai\.com\/id\/id/i.test(t)
  );
}

export function isTradeInParagraph(text: string): boolean {
  return /^Selain itu,\s*pelanggan yang menukarkan/i.test(text.replace(/\s+/g, " ").trim());
}

/** Canonical closing copy with inline links matching HMID press PDF layout. */
export function formatSocialClosingHtml(locale: ArticleLocale): string {
  if (locale === "en") {
    return (
      `Stay updated on the latest Hyundai activities and products on the official website ` +
      `${link("https://www.hyundai.com/id/id", "www.hyundai.com/id/id")}, or on social media channels including Instagram ` +
      `${link("https://www.instagram.com/HyundaiMotorIndonesia/", "HyundaiMotorIndonesia")}, Youtube ` +
      `${link("https://www.youtube.com/@HyundaiMotorIndonesia", "Hyundai Motors Indonesia")}, Facebook ` +
      `${link("https://www.facebook.com/HyundaiMotorIndonesia/", "Hyundai Motors Indonesia")}, TikTok ` +
      `${link("https://www.tiktok.com/@HyundaiMotorIndonesia", "@HyundaiMotorIndonesia")}, and X ` +
      `${link("https://x.com/HyundaiMotorID", "@HyundaiMotorID")}.`
    );
  }

  return (
    `Ikuti informasi terkait kegiatan dan produk Hyundai terkini di situs resmi ` +
    `${link("https://www.hyundai.com/id/id", "www.hyundai.com/id/id")}, atau di berbagai kanal media sosial, yaitu Instagram ` +
    `${link("https://www.instagram.com/HyundaiMotorIndonesia/", "HyundaiMotorIndonesia")}, Youtube ` +
    `${link("https://www.youtube.com/@HyundaiMotorIndonesia", "Hyundai Motors Indonesia")}, Facebook ` +
    `${link("https://www.facebook.com/HyundaiMotorIndonesia/", "Hyundai Motors Indonesia")}, TikTok ` +
    `${link("https://www.tiktok.com/@HyundaiMotorIndonesia", "@HyundaiMotorIndonesia")}, dan X ` +
    `${link("https://x.com/HyundaiMotorID", "@HyundaiMotorID")}.`
  );
}
