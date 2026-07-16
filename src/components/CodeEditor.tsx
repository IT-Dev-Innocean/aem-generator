import * as React from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MOBILE_EDITOR_HEIGHT = 360;
const THEME_STORAGE_KEY = "aem-monaco-theme";

type EditorTheme = "vs" | "vs-dark";

function readStoredTheme(): EditorTheme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "vs" || stored === "vs-dark") return stored;
  } catch {
    /* ignore */
  }
  return "vs";
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  filename?: string;
  readOnly?: boolean;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  filename = "article.html",
  readOnly = false,
  className,
}: CodeEditorProps) {
  const editorRef = React.useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = React.useRef<Parameters<OnMount>[1] | null>(null);
  const editorAreaRef = React.useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = React.useState(MOBILE_EDITOR_HEIGHT);
  const [theme, setTheme] = React.useState<EditorTheme>(readStoredTheme);
  const lineCount = value ? value.split("\n").length : 0;
  const isDark = theme === "vs-dark";

  React.useEffect(() => {
    const node = editorAreaRef.current;
    if (!node) return;

    const updateHeight = () => {
      const height = node.getBoundingClientRect().height;
      if (height > 0) setEditorHeight(Math.floor(height));
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    monacoRef.current?.editor.setTheme(theme);
  }, [theme]);

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    monaco.editor.setTheme(theme);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "vs" ? "vs-dark" : "vs"));
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border shadow-inner",
        "h-[min(420px,55vh)] lg:min-h-0 lg:h-full lg:flex-1",
        isDark
          ? "border-slate-700 bg-[#1e1e1e]"
          : "border-slate-200 bg-white",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 flex-col gap-2 border-b px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:py-0",
          isDark
            ? "border-slate-700 bg-[#252526]"
            : "border-slate-200 bg-slate-50"
        )}
      >
        <div className="flex min-w-0 items-center">
          <div
            className={cn(
              "flex min-w-0 items-center gap-1.5 border-r px-2 py-1 text-xs sm:px-3 sm:py-2",
              isDark
                ? "border-slate-700 text-slate-200"
                : "border-slate-200 text-slate-700"
            )}
          >
            <span className="inline-block size-2.5 shrink-0 rounded-full bg-sky-500" />
            <span className="truncate">{filename}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 px-1 sm:gap-2 sm:px-2">
          <span
            className={cn(
              "text-[11px]",
              isDark ? "text-slate-400" : "text-slate-500"
            )}
          >
            {lineCount} lines
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className={cn(
                  "size-8",
                  isDark
                    ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                    : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                )}
                aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              >
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isDark ? "Light theme" : "Dark theme"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div ref={editorAreaRef} className="min-h-0 flex-1">
        <Editor
          height={editorHeight}
          language="html"
          theme={theme}
          value={value}
          onChange={(v) => onChange(v ?? "")}
          onMount={handleMount}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
            fontLigatures: true,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            wrappingIndent: "indent",
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            renderWhitespace: "selection",
            bracketPairColorization: { enabled: true },
            guides: { indentation: true, bracketPairs: true },
            padding: { top: 12, bottom: 12 },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            folding: true,
            showFoldingControls: "mouseover",
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
          }}
          loading={
            <div
              className={cn(
                "flex items-center justify-center text-sm",
                isDark
                  ? "bg-[#1e1e1e] text-slate-400"
                  : "bg-white text-slate-500"
              )}
              style={{ height: editorHeight }}
            >
              Loading editor...
            </div>
          }
        />
      </div>
    </div>
  );
}
