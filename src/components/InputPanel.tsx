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
import type { GenerateInput, InputMode } from "@/lib/parsers";

interface InputPanelProps {
  onGenerate: (input: GenerateInput) => void;
  isLoading: boolean;
}

const ACCEPTED = ".docx,.pdf,.html,.htm,.txt,.md";

export function InputPanel({ onGenerate, isLoading }: InputPanelProps) {
  const [mode, setMode] = React.useState<InputMode>("link");
  const [documentUrl, setDocumentUrl] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const submit = () => {
    onGenerate({
      mode,
      documentUrl,
      file: file ?? undefined,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  };

  return (
    <div className="flex flex-col">
      <Tabs value={mode} onValueChange={(v) => setMode(v as InputMode)}>
        <TabsList className="w-full">
          <TabsTrigger value="link" className="flex-1 text-xs sm:text-sm">
            <Link2 className="size-3.5 sm:size-4" />
            <span className="truncate">Document Link</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex-1 text-xs sm:text-sm">
            <UploadCloud className="size-3.5 sm:size-4" />
            <span className="truncate">Upload File</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="link">
          <div className="space-y-2">
            <Label htmlFor="document-url">Document Link</Label>
            <input
              id="document-url"
              type="url"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="Google Docs or Microsoft SharePoint / OneDrive link"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
            <p className="text-xs leading-relaxed text-slate-500">
              Supports{" "}
              <span className="font-medium">Google Docs</span> and{" "}
              <span className="font-medium">Microsoft Word</span> links
              (SharePoint / OneDrive). The document must be shared as{" "}
              <span className="font-medium">&quot;Anyone with the link&quot;</span>
              . If the browser blocks the download (CORS / sign-in), save as{" "}
              <code>.docx</code> and use{" "}
              <span className="font-medium">Upload File</span>.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="upload">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition sm:px-6 sm:py-10 ${
              dragActive
                ? "border-sky-500 bg-sky-50"
                : "border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/50"
            }`}
          >
            <UploadCloud className="size-7 text-sky-500" />
            {file ? (
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <FileText className="size-4" /> {file.name}
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">
                  Drag &amp; drop a file here, or click to browse
                </p>
                <p className="text-xs text-slate-500">
                  Supports .docx, .pdf, .html, .txt, .md
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
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
              <Sparkles /> Generate HTML
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
