import * as React from 'react';
import { Newspaper } from 'lucide-react';
import { NewsInputPanel } from '@/components/NewsInputPanel';
import { OutputPanel, type ArticleOutput } from '@/components/OutputPanel';
import { AppShell } from '@/components/AppShell';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/toast';
import { useGenerateNews } from '@/hooks/useGenerateNews';
import type { GenerateNewsInput } from '@/lib/news-parsers';
import type { GeneratedArticle } from '@/lib/parsers';

function toArticleOutputs(articles: GeneratedArticle[]): ArticleOutput[] {
  return articles.map((a) => ({ ...a, code: a.html }));
}

export function NewsGeneratorPage() {
  const { toast } = useToast();
  const [articles, setArticles] = React.useState<ArticleOutput[]>([]);
  const [generated, setGenerated] = React.useState<GeneratedArticle[]>([]);
  const [activeLocale, setActiveLocale] = React.useState('id');
  const [sourceNote, setSourceNote] = React.useState<string>();

  const mutation = useGenerateNews(
    (result) => {
      const outputs = toArticleOutputs(result.articles);
      setArticles(outputs);
      setGenerated(result.articles);
      setActiveLocale(result.articles[0]?.locale ?? 'id');
      setSourceNote(result.sourceNote);
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

  const handleGenerate = (input: GenerateNewsInput) => {
    mutation.mutate(input);
  };

  const handleCodeChange = (locale: string, next: string) => {
    setArticles((prev) =>
      prev.map((a) => (a.locale === locale ? { ...a, code: next } : a))
    );
  };

  const handleReset = (locale: string) => {
    const original = generated.find((g) => g.locale === locale);
    if (!original) return;
    setArticles((prev) =>
      prev.map((a) => (a.locale === locale ? { ...a, code: original.html } : a))
    );
  };

  const canReset = (locale: string) => {
    const current = articles.find((a) => a.locale === locale);
    const original = generated.find((g) => g.locale === locale);
    return !!current && !!original && current.code !== original.html;
  };

  return (
    <AppShell
      title='KIA News Generator'
      subtitle='AEM HTML Generator for press release / news content'
      backTo='/kia'
      backLabel='KIA Tools'
      icon={<Newspaper className='size-5' />}
      mainClassName='lg:min-h-0 lg:overflow-hidden'
    >
      <div className='grid grid-cols-1 gap-4 md:gap-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(280px,460px)_1fr] lg:items-stretch'>
        <section className='flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:min-h-0 lg:overflow-y-auto'>
          <div className='mb-4 flex items-center gap-2'>
            <Newspaper className='size-4 shrink-0 text-sky-500' />
            <h2 className='text-sm font-semibold text-slate-900'>
              Press Source
            </h2>
          </div>
          <Separator className='mb-4' />
          <NewsInputPanel onGenerate={handleGenerate} isLoading={mutation.isPending} />
        </section>

        <section className='flex min-h-[400px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:min-h-[460px] sm:p-5 lg:min-h-0 lg:overflow-hidden'>
          <OutputPanel
            articles={articles}
            activeLocale={activeLocale}
            onActiveLocaleChange={setActiveLocale}
            onCodeChange={handleCodeChange}
            onReset={handleReset}
            canReset={canReset}
            sourceNote={sourceNote}
          />
        </section>
      </div>
    </AppShell>
  );
}
