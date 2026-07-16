import * as React from "react";
import {
  FileText,
  Link2,
  Loader2,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { GenerateNewsInput, NewsInputMode } from "@/lib/news-parsers";

interface NewsInputPanelProps {
  onGenerate: (input: GenerateNewsInput) => void;
  isLoading: boolean;
}

const ACCEPTED = ".docx,.pdf,.html,.htm,.txt,.md";

function FileDropZone({
  label,
  hint,
  file,
  onFile,
}: {
  label: string;
  hint: string;
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onFile(dropped);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-6 text-center transition sm:px-4 sm:py-8 ${
          dragActive
            ? "border-sky-500 bg-sky-50"
            : "border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/50"
        }`}
      >
        <UploadCloud className="size-6 text-sky-500" />
        {file ? (
          <div className="flex items-center gap-2 px-1 text-xs font-medium text-slate-700 sm:text-sm">
            <FileText className="size-4 shrink-0" />
            <span className="truncate">{file.name}</span>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium text-slate-700 sm:text-sm">
              Drop file or click to browse
            </p>
            <p className="text-[11px] text-slate-500">{hint}</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {file && (
        <button
          type="button"
          className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onFile(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
        >
          Remove file
        </button>
      )}
    </div>
  );
}

export function NewsInputPanel({ onGenerate, isLoading }: NewsInputPanelProps) {
  const [mode, setMode] = React.useState<NewsInputMode>("link");
  const [documentUrl, setDocumentUrl] = React.useState("");
  const [fileId, setFileId] = React.useState<File | null>(null);
  const [fileEn, setFileEn] = React.useState<File | null>(null);

  const submit = () => {
    onGenerate({
      mode,
      documentUrl,
      fileId: fileId ?? undefined,
      fileEn: fileEn ?? undefined,
    });
  };

  return (
    <div className="flex flex-col">
      <Tabs value={mode} onValueChange={(v) => setMode(v as NewsInputMode)}>
        <TabsList className="w-full">
          <TabsTrigger value="link" className="flex-1 text-xs sm:text-sm">
            <Link2 className="size-3.5 sm:size-4" />
            <span className="truncate">Document Link</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex-1 text-xs sm:text-sm">
            <UploadCloud className="size-3.5 sm:size-4" />
            <span className="truncate">Upload Files</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="link">
          <div className="space-y-2">
            <Label htmlFor="news-document-url">Folder or Document Link</Label>
            <input
              id="news-document-url"
              type="url"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="Google Drive folder, Docs, or Word link"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
            <div className="space-y-1.5 text-xs leading-relaxed text-slate-500">
              <p>
                <span className="font-medium text-slate-700">Recommended:</span>{" "}
                paste a{" "}
                <span className="font-medium">Google Drive folder</span> that
                contains both{" "}
                <span className="font-medium">[EN]</span> and{" "}
                <span className="font-medium">[ID]</span> press release files —
                both HTML outputs are generated automatically.
              </p>
              <p>
                Also supports a single{" "}
                <span className="font-medium">Google Docs</span> /{" "}
                <span className="font-medium">Microsoft Word</span> /{" "}
                <span className="font-medium">Drive file</span> link. Share as{" "}
                <span className="font-medium">&quot;Anyone with the link&quot;</span>.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-slate-500">
              Upload separate press release files for{" "}
              <span className="font-medium">Indonesia (ID)</span> and{" "}
              <span className="font-medium">English (EN)</span>. At least one
              file is required.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FileDropZone
                label="Indonesia (ID)"
                hint=".docx / .pdf / .html"
                file={fileId}
                onFile={setFileId}
              />
              <FileDropZone
                label="English (EN)"
                hint=".docx / .pdf / .html"
                file={fileEn}
                onFile={setFileEn}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4">
        <Button onClick={submit} disabled={isLoading} className="w-full" size="lg">
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" /> Processing...
            </>
          ) : (
            <>
              <Sparkles /> Generate News HTML
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
