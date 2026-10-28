import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyFieldCard } from '@/components/CopyFieldCard';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CMS_TITLE_MAX_LENGTH } from '@/lib/hyundai-press-cleaner';
import {
  META_DESC_MAX,
  META_DESC_MIN,
  META_TITLE_MAX,
  META_TITLE_MIN,
} from '@/lib/hyundai-seo-meta';
import type { ArticleOutput } from '@/components/HyundaiReleaseOutputPanel';

interface HyundaiSeoMetaPanelProps {
  articles: ArticleOutput[];
  activeLocale: string;
  onActiveLocaleChange: (locale: string) => void;
  onTitleChange: (locale: string, next: string) => void;
  onMetaTitleChange: (locale: string, next: string) => void;
  onMetaDescriptionChange: (locale: string, next: string) => void;
}

function localeLabel(locale: string): string {
  return locale === 'en' ? 'English (EN)' : 'Indonesia (ID)';
}

function seoCountTone(length: number, min?: number, max?: number): string {
  if (min && max) {
    if (length >= min && length <= max) return 'text-emerald-600';
    if (length > max) return 'text-red-500';
    return 'text-amber-600';
  }
  if (max && length > max) return 'text-red-500';
  return 'text-slate-500';
}

function SeoAccordionTrigger({
  label,
  length,
  min,
  max,
}: {
  label: string;
  length: number;
  min?: number;
  max?: number;
}) {
  const countLabel =
    min && max ? `${length} · ${min}–${max}` : max ? `${length}/${max}` : String(length);

  return (
    <div className='flex w-full min-w-0 items-center justify-between gap-3 pr-1'>
      <span className='truncate text-xs font-medium text-slate-700'>{label}</span>
      <span
        className={`shrink-0 text-[11px] font-medium tabular-nums ${seoCountTone(length, min, max)}`}>
        {countLabel}
      </span>
    </div>
  );
}

export function HyundaiSeoMetaPanel({
  articles,
  activeLocale,
  onActiveLocaleChange,
  onTitleChange,
  onMetaTitleChange,
  onMetaDescriptionChange,
}: HyundaiSeoMetaPanelProps) {
  const active = articles.find((a) => a.locale === activeLocale) ?? articles[0];
  const hasOutput = articles.length > 0 && Boolean(active?.code?.trim());

  const cmsTitle = active?.cmsTitle ?? '';
  const metaTitle = active?.metaTitle ?? '';
  const metaDescription = active?.metaDescription ?? '';

  if (!hasOutput) {
    return (
      <div className='mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-4 text-center'>
        <p className='text-xs text-slate-500'>
          CMS title &amp; meta tags will appear here after generation.
        </p>
      </div>
    );
  }

  return (
    <div className='mt-4 space-y-3 border-t border-slate-100 pt-4'>
      <p className='text-xs font-semibold text-slate-800'>CMS &amp; SEO Metadata</p>

      {articles.length > 1 && (
        <Tabs value={activeLocale} onValueChange={onActiveLocaleChange}>
          <TabsList className='w-full'>
            {articles.map((a) => (
              <TabsTrigger key={a.locale} value={a.locale} className='flex-1 text-xs'>
                {localeLabel(a.locale)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <Accordion type='multiple'>
        <AccordionItem value='cms-title'>
          <AccordionTrigger value='cms-title'>
            <SeoAccordionTrigger
              label='CMS Title (AEM)'
              length={cmsTitle.length}
              max={CMS_TITLE_MAX_LENGTH}
            />
          </AccordionTrigger>
          <AccordionContent value='cms-title' className='pt-0'>
            <CopyFieldCard
              label='CMS Title (AEM)'
              showHeader={false}
              value={cmsTitle}
              maxLength={CMS_TITLE_MAX_LENGTH}
              placeholder='Title will appear here after generation'
              onChange={(v) => onTitleChange(activeLocale, v)}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value='meta-title'>
          <AccordionTrigger value='meta-title'>
            <SeoAccordionTrigger
              label='Meta Title'
              length={metaTitle.length}
              min={META_TITLE_MIN}
              max={META_TITLE_MAX}
            />
          </AccordionTrigger>
          <AccordionContent value='meta-title' className='pt-0'>
            <CopyFieldCard
              label='Meta Title'
              showHeader={false}
              value={metaTitle}
              maxLength={META_TITLE_MAX}
              minLength={META_TITLE_MIN}
              recommendedRange={`${META_TITLE_MIN}–${META_TITLE_MAX} chars`}
              placeholder='SEO title tag will appear here after generation'
              onChange={(v) => onMetaTitleChange(activeLocale, v)}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value='meta-description'>
          <AccordionTrigger value='meta-description'>
            <SeoAccordionTrigger
              label='Meta Description'
              length={metaDescription.length}
              min={META_DESC_MIN}
              max={META_DESC_MAX}
            />
          </AccordionTrigger>
          <AccordionContent value='meta-description' className='pt-0'>
            <CopyFieldCard
              label='Meta Description'
              showHeader={false}
              value={metaDescription}
              maxLength={META_DESC_MAX}
              minLength={META_DESC_MIN}
              recommendedRange={`${META_DESC_MIN}–${META_DESC_MAX} chars`}
              placeholder='SEO meta description will appear here after generation'
              onChange={(v) => onMetaDescriptionChange(activeLocale, v)}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
