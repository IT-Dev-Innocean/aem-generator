import * as React from "react";
import { Check, Code2, Copy, Download, Eye, RotateCcw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { CodeEditor } from "@/components/CodeEditor";
import type { GeneratedArticle } from "@/lib/parsers";

export interface ArticleOutput extends GeneratedArticle {
  /** User-edited code (may differ from generated html). */
  code: string;
}

interface OutputPanelProps {
  articles: ArticleOutput[];
  activeLocale: string;
  onActiveLocaleChange: (locale: string) => void;
  onCodeChange: (locale: string, next: string) => void;
  onReset: (locale: string) => void;
  canReset: (locale: string) => boolean;
  sourceNote?: string;
}

/** Extract the inner <body> content so it can be injected into a preview div. */
function extractBody(html: string): string {
  const match = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  return match ? match[1] : html;
}

function localeLabel(locale: string): string {
  return locale === "en" ? "English (EN)" : "Indonesia (ID)";
}

export function OutputPanel({
  articles,
  activeLocale,
  onActiveLocaleChange,
  onCodeChange,
  onReset,
  canReset,
  sourceNote,
}: OutputPanelProps) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const [viewTab, setViewTab] = React.useState<"code" | "preview">("code");

  const active =
    articles.find((a) => a.locale === activeLocale) ?? articles[0];

  const previewHtml = React.useMemo(() => {
    if (!active?.code) return "";
    return extractBody(active.code).replace(
      /<p>(\s|&nbsp;|\u00a0)*<\/p>/gi,
      ""
    );
  }, [active?.code]);

  const handleCopy = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: `${active.filename} copied to clipboard.`,
        variant: "success",
      });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({
        title: "Copy failed",
        description: "Browser blocked clipboard access.",
        variant: "error",
      });
    }
  };

  const handleDownload = (article: ArticleOutput) => {
    const blob = new Blob([article.code], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = article.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({
      title: "File downloaded",
      description: article.filename,
      variant: "success",
    });
  };

  const handleDownloadAll = () => {
    articles.forEach((a) => handleDownload(a));
  };

  const empty = articles.length === 0 || !active?.code.trim();

  return (
    <div className="flex flex-col lg:h-full lg:min-h-0">
      {articles.length > 1 && (
        <Tabs
          value={activeLocale}
          onValueChange={onActiveLocaleChange}
          className="mb-3 shrink-0"
        >
          <TabsList className="w-full">
            {articles.map((a) => (
              <TabsTrigger key={a.locale} value={a.locale} className="flex-1">
                <span className="truncate">{localeLabel(a.locale)}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <Tabs
        value={viewTab}
        onValueChange={(v) => setViewTab(v as "code" | "preview")}
        className="flex flex-col lg:min-h-0 lg:flex-1"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="code" className="flex-1 sm:flex-none">
              <Code2 /> HTML Code
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex-1 sm:flex-none">
              <Eye /> Preview
            </TabsTrigger>
          </TabsList>

          <div className="flex shrink-0 items-center justify-end gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReset(activeLocale)}
                  disabled={!canReset(activeLocale)}
                >
                  <RotateCcw />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset to generated output</TooltipContent>
            </Tooltip>
            {articles.length > 1 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDownloadAll}
                    disabled={empty}
                  >
                    <Download />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download all files (ID &amp; EN)</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => active && handleDownload(active)}
                    disabled={empty}
                  >
                    <Download />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download as .html</TooltipContent>
              </Tooltip>
            )}
            <Button onClick={handleCopy} disabled={empty} size="sm">
              {copied ? <Check /> : <Copy />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>

        <TabsContent value="code" className="mt-3 flex flex-col lg:min-h-0 lg:flex-1">
          {viewTab === "code" && active && (
            <CodeEditor
              key={active.locale}
              value={active.code}
              onChange={(v) => onCodeChange(active.locale, v)}
              filename={active.filename}
            />
          )}
        </TabsContent>

        <TabsContent value="preview" className="mt-3 flex flex-col lg:min-h-0 lg:flex-1">
          <div className="scrollbar-thin min-h-[320px] overflow-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 sm:min-h-[380px] sm:p-6 lg:min-h-0 lg:flex-1">
            {empty ? (
              <p className="text-sm text-slate-400">
                Article preview will appear here.
              </p>
            ) : (
              <article
                className="article-preview flex flex-col gap-4"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {sourceNote && (
        <p className="mt-2 shrink-0 text-xs text-slate-500 dark:text-slate-400">
          {sourceNote}
        </p>
      )}
    </div>
  );
}
