import * as React from 'react';
import { FileText } from 'lucide-react';
import { NewsInputPanel } from '@/components/NewsInputPanel';
import {
  HyundaiReleaseOutputPanel,
  type ArticleOutput,
} from '@/components/HyundaiReleaseOutputPanel';
import { HyundaiSeoMetaPanel } from '@/components/HyundaiSeoMetaPanel';
import { AppShell } from '@/components/AppShell';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/toast';
import { useGenerateHyundaiRelease } from '@/hooks/useGenerateHyundaiRelease';
import { CMS_TITLE_MAX_LENGTH } from '@/lib/hyundai-press-cleaner';
import {
  META_DESC_MAX,
  META_TITLE_MAX,
} from '@/lib/hyundai-seo-meta';
import type { GenerateHyundaiReleaseInput } from '@/lib/hyundai-parsers';
import type { GeneratedArticle } from '@/lib/parsers';

function toArticleOutputs(articles: GeneratedArticle[]): ArticleOutput[] {
  return articles.map((a) => ({ ...a, code: a.html }));
}

export function ArticleReleaseGeneratorPage() {
  const { toast } = useToast();
  const [articles, setArticles] = React.useState<ArticleOutput[]>([]);
  const [generated, setGenerated] = React.useState<GeneratedArticle[]>([]);
  const [activeLocale, setActiveLocale] = React.useState('id');

  const mutation = useGenerateHyundaiRelease(
    (result) => {
      const outputs = toArticleOutputs(result.articles);
      setArticles(outputs);
      setGenerated(result.articles);
      setActiveLocale(result.articles[0]?.locale ?? 'id');
      toast({
        title: 'Generated successfully',
        description:
          result.articles.length > 1
            ? `${result.articles.length} press HTML files (ID & EN) ready to use`
            : result.sourceNote,
        variant: 'success',
      });
    },
    (error) => {
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'error',
      });
    }
  );

  const handleGenerate = (input: GenerateHyundaiReleaseInput) => {
    mutation.mutate(input);
  };

  const handleCodeChange = (locale: string, next: string) => {
    setArticles((prev) =>
      prev.map((a) => (a.locale === locale ? { ...a, code: next } : a))
    );
  };

  const handleTitleChange = (locale: string, next: string) => {
    const trimmed = next.slice(0, CMS_TITLE_MAX_LENGTH);
    setArticles((prev) =>
      prev.map((a) =>
        a.locale === locale ? { ...a, cmsTitle: trimmed } : a
      )
    );
  };

  const handleMetaTitleChange = (locale: string, next: string) => {
    const trimmed = next.slice(0, META_TITLE_MAX);
    setArticles((prev) =>
      prev.map((a) =>
        a.locale === locale ? { ...a, metaTitle: trimmed } : a
      )
    );
  };

  const handleMetaDescriptionChange = (locale: string, next: string) => {
    const trimmed = next.slice(0, META_DESC_MAX);
    setArticles((prev) =>
      prev.map((a) =>
        a.locale === locale ? { ...a, metaDescription: trimmed } : a
      )
    );
  };

  const handleReset = (locale: string) => {
    const original = generated.find((g) => g.locale === locale);
    if (!original) return;
    setArticles((prev) =>
      prev.map((a) =>
        a.locale === locale
          ? {
              ...a,
              code: original.html,
              cmsTitle: original.cmsTitle,
              metaTitle: original.metaTitle,
              metaDescription: original.metaDescription,
            }
          : a
      )
    );
  };

  const canReset = (locale: string) => {
    const current = articles.find((a) => a.locale === locale);
    const original = generated.find((g) => g.locale === locale);
    if (!current || !original) return false;
    return (
      current.code !== original.html ||
      (current.cmsTitle ?? '') !== (original.cmsTitle ?? '') ||
      (current.metaTitle ?? '') !== (original.metaTitle ?? '') ||
      (current.metaDescription ?? '') !== (original.metaDescription ?? '')
    );
  };

  return (
    <AppShell
      title='Hyundai Article & Press Release Generator'
      subtitle='Generate HTML press release, CMS title & SEO meta tags for AEM'
      backTo='/hyundai'
      backLabel='Hyundai Tools'
      icon={<FileText className='size-5' />}
      mainClassName='lg:min-h-0 lg:overflow-hidden'
    >
      <div className='grid grid-cols-1 gap-4 md:gap-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(280px,460px)_1fr] lg:items-stretch'>
        <section className='flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:min-h-0 lg:overflow-y-auto'>
          <div className='mb-4 flex items-center gap-2'>
            <FileText className='size-4 shrink-0 text-sky-500' />
            <h2 className='text-sm font-semibold text-slate-900'>
              Document Source
            </h2>
          </div>
          <Separator className='mb-4' />
          <NewsInputPanel
            onGenerate={handleGenerate}
            isLoading={mutation.isPending}
            generateLabel='Generate Press HTML'
          />
          <HyundaiSeoMetaPanel
            articles={articles}
            activeLocale={activeLocale}
            onActiveLocaleChange={setActiveLocale}
            onTitleChange={handleTitleChange}
            onMetaTitleChange={handleMetaTitleChange}
            onMetaDescriptionChange={handleMetaDescriptionChange}
          />
        </section>

        <section className='flex min-h-[400px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:min-h-[460px] sm:p-5 lg:min-h-0 lg:overflow-hidden'>
          <HyundaiReleaseOutputPanel
            articles={articles}
            activeLocale={activeLocale}
            onActiveLocaleChange={setActiveLocale}
            onCodeChange={handleCodeChange}
            onReset={handleReset}
            canReset={canReset}
          />
        </section>
      </div>
    </AppShell>
  );
}
