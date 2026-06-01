"use client";

import { useEffect, useRef } from "react";

/**
 * Collapsible Filters panel that REMEMBERS its open/closed state across
 * navigations (localStorage), so it doesn't spring back open every time you
 * search or change a filter. The server renders `defaultOpen` (open when filters
 * are active); after mount we apply the saved preference imperatively via a ref
 * (no React state, so no re-render churn). The filter form fields are passed as
 * children and still submit even while collapsed.
 */
export function FilterPanel({
  defaultOpen,
  activeCount,
  children,
}: {
  defaultOpen: boolean;
  activeCount: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("cx_filters_open");
    if (saved !== null && ref.current) ref.current.open = saved === "1";
  }, []);

  return (
    <details
      ref={ref}
      open={defaultOpen}
      onToggle={(e) => {
        try {
          localStorage.setItem(
            "cx_filters_open",
            e.currentTarget.open ? "1" : "0",
          );
        } catch {
          /* storage blocked - just don't persist */
        }
      }}
      className="group mt-3 rounded-xl border border-slate-200 bg-slate-50"
    >
      <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-brand-800">
              {activeCount} applied
            </span>
          )}
        </span>
        <span className="text-slate-400 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}
