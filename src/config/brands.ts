import { FileCode2, type LucideIcon } from 'lucide-react';

export type BrandId = 'hyundai' | 'kia';

export type BrandMenuItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

export type BrandConfig = {
  id: BrandId;
  name: string;
  tagline: string;
  logoSrc: string;
  logoAlt: string;
  menus: BrandMenuItem[];
};

export const BRANDS: Record<BrandId, BrandConfig> = {
  hyundai: {
    id: 'hyundai',
    name: 'Hyundai',
    tagline: 'Mobil Listrik, SUV, MPV & Hybrid',
    logoSrc: '/brands/hyundai-logo.png',
    logoAlt: 'Hyundai Motor Indonesia',
    menus: [
      {
        id: 'article-generator',
        title: 'Article Generator',
        description: 'Konversi dokumen menjadi HTML artikel untuk konten website Hyundai.',
        href: '/hyundai/article-generator',
        icon: FileCode2,
        disabled: true,
      },
    ],
  },
  kia: {
    id: 'kia',
    name: 'KIA',
    tagline: 'Sedans, Hatchbacks, SUVs & MPVs',
    logoSrc: '/brands/kia-logo.svg',
    logoAlt: 'Kia Indonesia',
    menus: [
      {
        id: 'article-generator',
        title: 'Article Generator',
        description: 'Konversi Google Docs, Word, atau upload file menjadi HTML artikel KIA.',
        href: '/kia/article-generator',
        icon: FileCode2,
      },
    ],
  },
};

export const BRAND_LIST: BrandConfig[] = [BRANDS.hyundai, BRANDS.kia];

export function getBrand(id: string | undefined): BrandConfig | undefined {
  if (!id || !(id in BRANDS)) return undefined;
  return BRANDS[id as BrandId];
}
