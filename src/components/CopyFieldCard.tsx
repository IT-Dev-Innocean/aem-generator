import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type CopyFieldCardProps = {
  label: string;
  value: string;
  maxLength?: number;
  minLength?: number;
  recommendedRange?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  /** When false, label/count/copy move to a compact footer (for accordion panels). */
  showHeader?: boolean;
  className?: string;
};

export function CopyFieldCard({
  label,
  value,
  maxLength,
  minLength,
  recommendedRange,
  placeholder,
  onChange,
  readOnly = false,
  showHeader = true,
  className,
}: CopyFieldCardProps) {
  const [copied, setCopied] = React.useState(false);
  const length = value.length;

  const lengthTone =
    minLength && maxLength
      ? length >= minLength && length <= maxLength
        ? "text-emerald-600"
        : length > maxLength
          ? "text-red-500"
          : "text-amber-600"
      : maxLength && length > maxLength
        ? "text-red-500"
        : "text-slate-500";

  const handleCopy = async () => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const body = readOnly || !onChange ? (
    <div className="px-3 py-3 text-sm leading-relaxed text-slate-800 sm:px-4">
      {value || (
        <span className="text-slate-400">{placeholder ?? "—"}</span>
      )}
    </div>
  ) : (
    <textarea
      value={value}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={label.includes("Description") ? 3 : 2}
      className="block w-full resize-none border-0 bg-white px-3 py-3 text-sm leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 sm:px-4"
    />
  );

  const countLabel = recommendedRange
    ? `${length} · ${recommendedRange}`
    : maxLength
      ? `${length}/${maxLength}`
      : String(length);

  const copyButton = (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!value.trim()}
      className="inline-flex items-center gap-1 rounded-md bg-sky-500 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );

  if (!showHeader) {
    return (
      <div className={cn("overflow-hidden rounded-lg border border-slate-200 bg-white", className)}>
        {body}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-3 py-2 sm:px-4">
          <span className={cn("text-[11px] font-medium tabular-nums", lengthTone)}>
            {countLabel}
          </span>
          {copyButton}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-3 py-2 sm:px-4">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className={cn("text-[11px] font-medium tabular-nums", lengthTone)}>
            {countLabel}
          </span>
          {copyButton}
        </div>
      </div>

      {body}
    </div>
  );
}
