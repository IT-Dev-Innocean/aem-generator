import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionContextValue = {
  openItems: Set<string>;
  toggle: (id: string) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

type AccordionProps = {
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
};

export function Accordion({
  type = "multiple",
  defaultValue,
  className,
  children,
}: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(() => {
    if (!defaultValue) return new Set<string>();
    return new Set(Array.isArray(defaultValue) ? defaultValue : [defaultValue]);
  });

  const toggle = React.useCallback(
    (id: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          return next;
        }
        if (type === "single") return new Set([id]);
        next.add(id);
        return next;
      });
    },
    [type]
  );

  return (
    <AccordionContext.Provider value={{ openItems, toggle }}>
      <div className={cn("space-y-2", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

type AccordionItemProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
};

export function AccordionItem({ value, className, children }: AccordionItemProps) {
  return (
    <div
      data-state={
        React.useContext(AccordionContext)?.openItems.has(value)
          ? "open"
          : "closed"
      }
      className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white", className)}
    >
      {children}
    </div>
  );
}

type AccordionTriggerProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
};

export function AccordionTrigger({
  value,
  className,
  children,
}: AccordionTriggerProps) {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error("AccordionTrigger must be used within Accordion");

  const open = ctx.openItems.has(value);

  return (
    <button
      type="button"
      onClick={() => ctx.toggle(value)}
      aria-expanded={open}
      className={cn(
        "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50 sm:px-4",
        className
      )}
    >
      <span>{children}</span>
      <ChevronDown
        className={cn(
          "size-4 shrink-0 text-slate-400 transition-transform",
          open && "rotate-180"
        )}
      />
    </button>
  );
}

type AccordionContentProps = {
  value: string;
  className?: string;
  children: React.ReactNode;
};

export function AccordionContent({
  value,
  className,
  children,
}: AccordionContentProps) {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error("AccordionContent must be used within Accordion");

  if (!ctx.openItems.has(value)) return null;

  return (
    <div className={cn("border-t border-slate-100 px-3 pb-3 pt-2 sm:px-4", className)}>
      {children}
    </div>
  );
}
