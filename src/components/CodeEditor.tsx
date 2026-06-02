import * as React from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export type EditorTheme =
  | "vs-dark"
  | "vs"
  | "hc-black"
  | "github-dark"
  | "one-dark-pro";

const THEME_OPTIONS: { id: EditorTheme; label: string }[] = [
  { id: "vs-dark", label: "VS Code Dark" },
  { id: "one-dark-pro", label: "One Dark Pro" },
  { id: "github-dark", label: "GitHub Dark" },
  { id: "vs", label: "VS Code Light" },
  { id: "hc-black", label: "High Contrast" },
];

const MOBILE_EDITOR_HEIGHT = 360;

/** Register custom Monaco themes that mimic popular VS Code themes. */
function registerCustomThemes(monaco: typeof import("monaco-editor")) {
  monaco.editor.defineTheme("github-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "tag", foreground: "7EE787" },
      { token: "attribute.name", foreground: "79C0FF" },
      { token: "attribute.value", foreground: "A5D6FF" },
      { token: "string", foreground: "A5D6FF" },
      { token: "comment", foreground: "8B949E", fontStyle: "italic" },
      { token: "delimiter", foreground: "C9D1D9" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#c9d1d9",
      "editorLineNumber.foreground": "#484f58",
      "editorLineNumber.activeForeground": "#c9d1d9",
      "editor.selectionBackground": "#264f78",
      "editor.lineHighlightBackground": "#161b22",
      "editorCursor.foreground": "#58a6ff",
      "editorIndentGuide.background": "#21262d",
      "editorIndentGuide.activeBackground": "#30363d",
      "editorGutter.background": "#0d1117",
    },
  });

  monaco.editor.defineTheme("one-dark-pro", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "tag", foreground: "E06C75" },
      { token: "attribute.name", foreground: "D19A66" },
      { token: "attribute.value", foreground: "98C379" },
      { token: "string", foreground: "98C379" },
      { token: "comment", foreground: "5C6370", fontStyle: "italic" },
      { token: "delimiter", foreground: "ABB2BF" },
    ],
    colors: {
      "editor.background": "#282c34",
      "editor.foreground": "#abb2bf",
      "editorLineNumber.foreground": "#4b5263",
      "editorLineNumber.activeForeground": "#abb2bf",
      "editor.selectionBackground": "#3e4451",
      "editor.lineHighlightBackground": "#2c313a",
      "editorCursor.foreground": "#528bff",
      "editorIndentGuide.background": "#3b4048",
      "editorIndentGuide.activeBackground": "#4b5263",
      "editorGutter.background": "#282c34",
    },
  });
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
  const [theme, setTheme] = React.useState<EditorTheme>("vs-dark");
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
    registerCustomThemes(monaco);
    monaco.editor.setTheme(theme);
  };

  React.useEffect(() => {
    import("monaco-editor").then((monaco) => {
      registerCustomThemes(monaco);
      monaco.editor.setTheme(theme);
    });
  }, [theme]);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-[#30363d] bg-[#1e1e1e] shadow-inner",
        "h-[min(420px,55vh)] lg:min-h-0 lg:h-full lg:flex-1",
        className
      )}
    >
      <div className="flex shrink-0 flex-col gap-2 border-b border-[#30363d] bg-[#252526] px-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <div className="flex min-w-0 items-center">
          <div className="flex min-w-0 items-center gap-1.5 border-r border-[#30363d] px-2 py-1 text-xs text-[#cccccc] sm:px-3 sm:py-2">
            <span className="inline-block size-2.5 shrink-0 rounded-full bg-[#007acc]" />
            <span className="truncate">{filename}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-1 sm:px-2">
          <span className="text-[11px] text-[#858585]">{lineCount} lines</span>
          <label className="flex items-center gap-1.5 text-[11px] text-[#858585]">
            <Palette className="size-3 shrink-0" />
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as EditorTheme)}
              className="max-w-[120px] cursor-pointer truncate rounded border border-[#3c3c3c] bg-[#2d2d2d] px-1.5 py-0.5 text-[11px] text-[#cccccc] outline-none focus:border-[#007acc] sm:max-w-none"
            >
              {THEME_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
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
              className="flex items-center justify-center bg-[#1e1e1e] text-sm text-[#858585]"
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
