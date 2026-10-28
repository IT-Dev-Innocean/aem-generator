import type { ArticleLocale } from "./document-processor";
import { finalizeCmsTitle } from "./hyundai-press-cleaner";

export const META_TITLE_MIN = 50;
export const META_TITLE_MAX = 70;
export const META_DESC_MIN = 140;
export const META_DESC_MAX = 150;

export type HyundaiSeoMeta = {
  cmsTitle: string;
  metaTitle: string;
  metaDescription: string;
};

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").replace(/™/g, "™").trim();
}

function truncateAtWord(text: string, max: number, ellipsis = "…"): string {
  const normalized = normalize(text);
  if (normalized.length <= max) return normalized;

  const slice = normalized.slice(0, max - (ellipsis ? ellipsis.length : 0));
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return ellipsis ? `${cut.trim()}${ellipsis}` : cut.trim();
}

function extractCmsSubject(firstPart: string): string {
  const m = firstPart.match(/^(Hyundai\s+[A-Za-z0-9™]+)/i);
  if (m) return m[1];
  return firstPart.split(/\s+/).slice(0, 2).join(" ");
}

function stripCmsTail(text: string): string {
  return text
    .replace(/™\s*\d{4}[^,]*/gi, "")
    .replace(/,?\s*(hingga|and)\s+(Audisi|Hyundai Cup).*$/i, "")
    .trim();
}

/** Restructure long press H1 into a clean CMS headline (complete words, no period). */
function composePressCmsTitle(text: string, locale: ArticleLocale): string {
  const cleaned = stripCmsTail(normalize(text));

  // EN titles often omit commas — e.g. "Hyundai Sunday … with Free Service Programs for All Brands"
  if (locale === "en") {
    const withMatch = cleaned.match(
      /^(Hyundai\s+[A-Za-z0-9™]+)\s+(?:Kicks Off Nationwide\s+)?(?:Across Indonesia\s+)?with\s+(.+)$/i
    );
    if (withMatch) {
      const subject = withMatch[1];
      let hook = stripCmsTail(withMatch[2])
        .replace(/\bfree service programs?\b/gi, "Free Vehicle Checks")
        .replace(/\bfor all brands\b/gi, "for All Brands Across Indonesia");
      return `${subject} Offers ${hook}`;
    }
  }

  const parts = cleaned.split(/,\s*/).filter(Boolean);

  if (parts.length >= 2) {
    const subject = extractCmsSubject(parts[0]);
    let hook = parts.slice(1).join(", ");

    if (locale === "id") {
      hook = hook
        .replace(/\bpengecekan kendaraan gratis\b/gi, "Pengecekan Kendaraan Gratis")
        .replace(/\buntuk semua brand\b/gi, "untuk Semua Brand")
        .replace(/\bdi seluruh indonesia\b/gi, "di Seluruh Indonesia");

      const needsLocation =
        /hadir serentak|seluruh indonesia/i.test(parts[0]) &&
        !/seluruh indonesia/i.test(hook);

      if (needsLocation && /semua brand/i.test(hook)) {
        hook = hook.replace(
          /\buntuk Semua Brand\b/i,
          "untuk Semua Brand di Seluruh Indonesia"
        );
      } else if (needsLocation && !/seluruh indonesia/i.test(hook)) {
        hook = `${hook} di Seluruh Indonesia`;
      }

      if (/^tawarkan\b/i.test(hook)) {
        hook = `Tawarkan ${hook.slice(9).trim()}`;
      }

      return `${subject} ${hook}`.replace(/\s+/g, " ").trim();
    }

    hook = hook
      .replace(/\bfree service programs?\b/gi, "Free Vehicle Checks")
      .replace(/\bfor all brands\b/gi, "for All Brands")
      .replace(/\bacross indonesia\b/gi, "Across Indonesia");

    const needsLocation =
      /nationwide|across indonesia/i.test(parts[0]) &&
      !/across indonesia/i.test(hook);

    if (needsLocation && /for all brands/i.test(hook)) {
      hook = hook.replace(
        /\bfor All Brands\b/i,
        "for All Brands Across Indonesia"
      );
    }

    if (/^with free/i.test(hook)) {
      return `${subject} Offers ${hook.replace(/^with\s+/i, "")}`;
    }
    if (/^offers?\b/i.test(hook)) {
      return `${subject} ${hook.charAt(0).toUpperCase()}${hook.slice(1)}`;
    }

    return `${subject} ${hook}`.replace(/\s+/g, " ").trim();
  }

  // Single-segment title: drop redundant lead phrases, keep keywords
  return cleaned
    .replace(/\b(Hadir Serentak|Kicks Off Nationwide)\s+(di|Across)\s+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compress long press titles while keeping primary keywords up front. */
export function optimizeCmsTitle(
  rawTitle: string,
  locale: ArticleLocale = "id"
): string {
  const composed = composePressCmsTitle(rawTitle, locale);
  return finalizeCmsTitle(composed);
}

function fitLength(
  text: string,
  min: number,
  max: number
): string {
  const normalized = normalize(text);
  if (normalized.length >= min && normalized.length <= max) return normalized;
  if (normalized.length > max) return truncateAtWord(normalized, max);
  return normalized;
}

function extractPrimarySubject(title: string, locale: ArticleLocale): string {
  const normalized = normalize(title);

  if (/hyundai sunday/i.test(normalized)) return "Hyundai Sunday";

  if (/giias/i.test(normalized)) {
    return locale === "id" ? "Promo GIIAS 2026" : "Hyundai GIIAS 2026";
  }

  if (/fifa world cup/i.test(normalized) && /epic games/i.test(normalized)) {
    return "Hyundai x Epic Games";
  }

  if (/stargazer/i.test(normalized) && /cartenz/i.test(normalized)) {
    return locale === "id"
      ? "Hyundai STARGAZER Cartenz"
      : "Hyundai STARGAZER Cartenz";
  }

  const colonMatch = normalized.match(/^(Hyundai[^,:–—-]{0,28})/i);
  if (colonMatch) {
    const candidate = colonMatch[1]
      .replace(
        /\s+(hadir|launch|launches|perkenalkan|debut|sambut|rilis|bawa|umumkan)\b.*$/i,
        ""
      )
      .trim();
    if (candidate.length >= 8) return candidate;
  }

  const beforeComma = normalized.split(",")[0]?.trim();
  if (beforeComma && beforeComma.length <= 42) return beforeComma;

  return locale === "id" ? "Hyundai Indonesia" : "Hyundai Indonesia";
}

function buildMetaHook(title: string, locale: ArticleLocale): string {
  if (/hyundai sunday/i.test(title)) {
    return locale === "id"
      ? "Cek Mobil Gratis & Audisi Kids Escort"
      : "Free Car Check & Kids Escort Audition";
  }

  if (/giias/i.test(title)) {
    return locale === "id"
      ? "Powertrain Lengkap & Promo Menarik"
      : "Full Powertrain & Exclusive Promos";
  }

  if (/stargazer/i.test(title)) {
    return locale === "id"
      ? "MPV Keluarga Irit & Nyaman"
      : "Efficient Family MPV";
  }

  if (/ioniq/i.test(title)) {
    return locale === "id" ? "Mobil Listrik Premium Hyundai" : "Premium Hyundai EV";
  }

  if (/kids escort/i.test(title)) {
    return locale === "id"
      ? "Audisi Kids Escort Hyundai Cup"
      : "Hyundai Cup Kids Escort Audition";
  }

  if (/mudik/i.test(title)) {
    return locale === "id"
      ? "Layanan Siaga & Posko Mudik"
      : "24/7 Support & Safe Travel";
  }

  if (/myhyundaicare/i.test(title)) {
    return locale === "id"
      ? "Solusi Kepemilikan Terpadu"
      : "Integrated Ownership Solutions";
  }

  const segment = title.split(",")[1]?.trim() ?? title.split(" ").slice(3, 8).join(" ");
  return truncateAtWord(segment || (locale === "id" ? "Program & Promo Terbaru" : "Latest Programs & Promos"), 34, "");
}

export function generateMetaTitle(rawTitle: string, locale: ArticleLocale): string {
  const subject = extractPrimarySubject(rawTitle, locale);
  const hook = buildMetaHook(rawTitle, locale);
  const shortSubject = truncateAtWord(subject, 28, "");

  let candidate = `${shortSubject}: ${hook}`;
  candidate = fitLength(candidate, META_TITLE_MIN, META_TITLE_MAX);

  if (candidate.length < META_TITLE_MIN) {
    candidate = fitLength(
      `${shortSubject}: ${truncateAtWord(normalize(rawTitle), META_TITLE_MAX - shortSubject.length - 2, "")}`,
      META_TITLE_MIN,
      META_TITLE_MAX
    );
  }

  return candidate;
}

function generateMetaDescription(rawTitle: string, locale: ArticleLocale): string {
  const t = rawTitle.toLowerCase();

  if (/hyundai sunday/i.test(rawTitle)) {
    return locale === "id"
      ? "Kunjungi acara Hyundai Sunday di dealer terdekat! Nikmati cek kendaraan gratis untuk semua merek dan ikuti audisi Kids Escort Hyundai Cup 2026."
      : "Join the Hyundai Sunday event at your nearest dealer! Enjoy free vehicle checks for all brands and join the Hyundai Cup 2026 Kids Escort audition.";
  }

  let cta = locale === "id" ? "Cek" : "Discover";
  let body = truncateAtWord(optimizeCmsTitle(rawTitle, locale), 95, "");

  if (/giias|iims|gjaw|auto week/i.test(t)) {
    cta = locale === "id" ? "Sambut" : "Explore";
    body = locale === "id"
      ? "program dan promo menarik Hyundai di pameran otomotif"
      : "Hyundai programs and exclusive promos at the auto show";
  } else if (/luncur|rilis|launch|perkenalkan|debut/i.test(t)) {
    cta = locale === "id" ? "Simak" : "Learn about";
  } else if (/penghargaan|award|raih|wins|menang/i.test(t)) {
    cta = locale === "id" ? "Baca" : "Read about";
  } else if (/promo|benefit|deal/i.test(t)) {
    cta = locale === "id" ? "Nikmati" : "Enjoy";
  } else if (/dealer|showroom/i.test(t)) {
    cta = locale === "id" ? "Kunjungi" : "Visit";
  } else {
    cta = locale === "id" ? "Simak" : "Read";
  }

  const prefix =
    locale === "id"
      ? `${cta} ${body.charAt(0).toLowerCase()}${body.slice(1)}!`
      : `${cta} ${body.charAt(0).toLowerCase()}${body.slice(1)}.`;

  let candidate = prefix.endsWith(".") || prefix.endsWith("!")
    ? prefix
    : `${prefix}.`;

  if (locale === "id" && candidate.length < META_DESC_MIN) {
    candidate = `${candidate.slice(0, -1)} Pelajari detail lengkapnya di situs resmi Hyundai Indonesia.`;
  }
  if (locale === "en" && candidate.length < META_DESC_MIN) {
    candidate = `${candidate.slice(0, -1)} Find full details on the official Hyundai Indonesia website.`;
  }

  return fitLength(candidate, META_DESC_MIN, META_DESC_MAX);
}

export function generateHyundaiSeoMeta(
  rawTitle: string,
  locale: ArticleLocale
): HyundaiSeoMeta {
  const cmsTitle = optimizeCmsTitle(rawTitle);
  const metaTitle = generateMetaTitle(rawTitle, locale);
  const metaDescription = generateMetaDescription(rawTitle, locale);

  return { cmsTitle, metaTitle, metaDescription };
}
