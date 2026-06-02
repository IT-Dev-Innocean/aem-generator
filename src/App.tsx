import * as React from 'react';
import { FileCode2, Wand2 } from 'lucide-react';
import { InputPanel } from '@/components/InputPanel';
import { OutputPanel, type ArticleOutput } from '@/components/OutputPanel';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/toast';
import { useGenerateArticle } from '@/hooks/useGenerateArticle';
import type { GenerateInput, GeneratedArticle } from '@/lib/parsers';

function toArticleOutputs(articles: GeneratedArticle[]): ArticleOutput[] {
  return articles.map((a) => ({ ...a, code: a.html }));
}

export default function App() {
  const { toast } = useToast();
  const [articles, setArticles] = React.useState<ArticleOutput[]>([]);
  const [generated, setGenerated] = React.useState<GeneratedArticle[]>([]);
  const [activeLocale, setActiveLocale] = React.useState('id');
  const [sourceNote, setSourceNote] = React.useState<string>();

  const mutation = useGenerateArticle(
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
            ? `${result.articles.length} HTML files (ID & EN) ready to use`
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

  const handleGenerate = (input: GenerateInput) => {
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
    <div className='flex min-h-dvh flex-col bg-slate-100 dark:bg-slate-950 lg:h-dvh lg:overflow-hidden'>
      <header className='shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'>
        <div className='mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4'>
          <div className='flex min-w-0 items-start gap-3 sm:items-center'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm'>
              <Wand2 className='size-5' />
            </div>
            <div className='min-w-0'>
              <h1 className='text-base font-bold leading-tight text-slate-900 dark:text-slate-100 sm:text-lg'>
                AEM HTML Generator
              </h1>
              <p className='mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400'>
                AEM HTML Generator for website content
              </p>
            </div>
          </div>
          <div className='shrink-0 self-center sm:self-auto'>
            <ThemeSelector />
          </div>
        </div>
      </header>

      <main className='mx-auto w-full max-w-[1400px] flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:min-h-0 lg:overflow-hidden'>
        <div className='grid grid-cols-1 gap-4 md:gap-6 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(280px,460px)_1fr] lg:items-stretch'>
          <section className='flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5 lg:min-h-0 lg:overflow-y-auto'>
            <div className='mb-4 flex items-center gap-2'>
              <FileCode2 className='size-4 shrink-0 text-sky-500' />
              <h2 className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                Content Source
              </h2>
            </div>
            <Separator className='mb-4' />
            <InputPanel
              onGenerate={handleGenerate}
              isLoading={mutation.isPending}
            />
          </section>

          <section className='flex min-h-[400px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:min-h-[460px] sm:p-5 lg:min-h-0 lg:overflow-hidden'>
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
      </main>
    </div>
  );
}
