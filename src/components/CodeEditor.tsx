import * as React from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { cn } from "@/lib/utils";

const MOBILE_EDITOR_HEIGHT = 360;
const EDITOR_THEME = "vs";

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
  const editorAreaRef = React.useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = React.useState(MOBILE_EDITOR_HEIGHT);
  const lineCount = value ? value.split("\n").length : 0;

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

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monaco.editor.setTheme(EDITOR_THEME);
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner",
        "h-[min(420px,55vh)] lg:min-h-0 lg:h-full lg:flex-1",
        className
      )}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-slate-50 px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <div className="flex min-w-0 items-center">
          <div className="flex min-w-0 items-center gap-1.5 border-r border-slate-200 px-2 py-1 text-xs text-slate-700 sm:px-3 sm:py-2">
            <span className="inline-block size-2.5 shrink-0 rounded-full bg-sky-500" />
            <span className="truncate">{filename}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-1 sm:px-2">
          <span className="text-[11px] text-slate-500">{lineCount} lines</span>
        </div>
      </div>

      <div ref={editorAreaRef} className="min-h-0 flex-1">
        <Editor
          height={editorHeight}
          language="html"
          theme={EDITOR_THEME}
          value={value}
          onChange={(v) => onChange(v ?? "")}
          onMount={handleMount}
          options={{
            readOnly,
            minimap: { enabled: window.innerWidth >= 768, scale: 1 },
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
              className="flex items-center justify-center bg-white text-sm text-slate-500"
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
