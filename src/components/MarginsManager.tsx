"use client";

import { useMemo, useState } from "react";
import {
  setCategoryMarginAction,
  removeCategoryMarginAction,
} from "@/app/actions/admin-margins";

/**
 * Margins manager (PRD §7C, Module 6). The flat per-trade margins, organized
 * under collapsible MAIN CATEGORIES (purely a display grouping - the margin model
 * stays flat per trade, no inheritance), with search + a configured/default
 * filter so the list stays compact.
 */

export type MarginItem = {
  slug: string;
  label: string;
  category: string;
  configured: number | null; // null = using the code default
};

type Filter = "all" | "configured" | "default";

export function MarginsManager({
  items,
  categories,
  defaultPct,
}: {
  items: MarginItem[];
  categories: readonly string[];
  defaultPct: number;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();
  const active = q !== "" || filter !== "all";

  const matches = (it: MarginItem) => {
    if (q && !`${it.label} ${it.slug}`.toLowerCase().includes(q)) return false;
    if (filter === "configured" && it.configured === null) return false;
    if (filter === "default" && it.configured !== null) return false;
    return true;
  };

  const groups = useMemo(
    () =>
      categories.map((cat) => {
        const all = items.filter((it) => it.category === cat);
        return {
          cat,
          shown: all.filter(matches),
          total: all.length,
          configured: all.filter((it) => it.configured !== null).length,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, categories, q, filter],
  );

  const visible = groups.filter((g) => g.shown.length > 0);
  // While searching/filtering, auto-expand groups with matches; otherwise follow
  // the user's per-group toggle (collapsed by default to keep it compact).
  const isOpen = (cat: string) => (active ? true : (open[cat] ?? false));
  const setAll = (val: boolean) =>
    setOpen(Object.fromEntries(categories.map((c) => [c, val])));

  const totalConfigured = items.filter((it) => it.configured !== null).length;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search trades…"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex overflow-hidden rounded-md border border-slate-300">
          {(["all", "configured", "default"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-sm font-medium capitalize ${
                filter === f
                  ? "bg-brand-500 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          {totalConfigured} of {items.length} configured · default {defaultPct}%
        </span>
        {!active && (
          <span className="flex gap-3">
            <button
              type="button"
              onClick={() => setAll(true)}
              className="font-medium text-slate-500 hover:text-slate-700"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={() => setAll(false)}
              className="font-medium text-slate-500 hover:text-slate-700"
            >
              Collapse all
            </button>
          </span>
        )}
      </div>

      {/* Groups */}
      <div className="mt-3 space-y-2">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
            No trades match.
          </div>
        ) : (
          visible.map((g) => {
            const opened = isOpen(g.cat);
            return (
              <div
                key={g.cat}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [g.cat]: !opened }))}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-slate-400 transition-transform ${opened ? "rotate-90" : ""}`}
                    >
                      ▸
                    </span>
                    <span className="font-semibold text-slate-900">{g.cat}</span>
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    {active
                      ? `${g.shown.length} shown`
                      : `${g.configured}/${g.total} configured`}
                  </span>
                </button>

                {opened && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {g.shown.map((it) => (
                      <Row key={it.slug} item={it} defaultPct={defaultPct} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Row({ item, defaultPct }: { item: MarginItem; defaultPct: number }) {
  const value = item.configured ?? defaultPct;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{item.label}</p>
        <p className="text-xs text-slate-400">
          {item.configured !== null ? "Configured" : `Default (${defaultPct}%)`}
        </p>
      </div>
      <form action={setCategoryMarginAction} className="flex items-center gap-2">
        <input type="hidden" name="category" value={item.slug} />
        <div className="relative">
          <input
            name="marginPct"
            inputMode="decimal"
            defaultValue={value}
            className="w-24 rounded-md border border-slate-300 px-2 py-1.5 pr-6 text-right text-sm"
          />
          <span className="pointer-events-none absolute right-2 top-1.5 text-sm text-slate-400">
            %
          </span>
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Save
        </button>
      </form>
      {item.configured !== null && (
        <form action={removeCategoryMarginAction}>
          <input type="hidden" name="category" value={item.slug} />
          <button
            type="submit"
            className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600"
          >
            Reset
          </button>
        </form>
      )}
    </div>
  );
}
