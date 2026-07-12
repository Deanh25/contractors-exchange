"use client";

import { useMemo, useRef, useState } from "react";

export type Option = { value: string; label: string; group?: string };

/**
 * Reusable type-to-search picker for a static option list (used for the ~45
 * trades). Single- or multi-select, with optional category groups. Selected
 * values submit as hidden inputs named `name`, so server actions read them
 * exactly like a native <select>/checkbox group - no client/server contract change.
 *
 * Optional PRIMARY layer (multi-select only): pass `primaryName` to let the user
 * star ONE selected item as the main one; it submits as a hidden input named
 * `primaryName`. The primary always stays a member of the selection.
 */
export function SearchSelect({
  name,
  options,
  multiple = false,
  defaultValue = [],
  placeholder = "Search…",
  emptyText = "No matches",
  primaryName,
  defaultPrimary,
}: {
  name: string;
  options: Option[];
  multiple?: boolean;
  defaultValue?: string[];
  placeholder?: string;
  emptyText?: string;
  /** When set (multi-select), enables a star to mark one item as primary. */
  primaryName?: string;
  defaultPrimary?: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const usePrimary = multiple && !!primaryName;
  const [primary, setPrimary] = useState<string>(
    defaultPrimary && defaultValue.includes(defaultPrimary)
      ? defaultPrimary
      : defaultValue[0] ?? "",
  );
  // Derive a valid primary each render (the stored choice, else the first
  // selected) - no effect, so it can never desync from the current selection.
  const effectivePrimary = usePrimary
    ? selected.includes(primary)
      ? primary
      : selected[0] ?? ""
    : "";

  const byValue = useMemo(
    () => new Map(options.map((o) => [o.value, o])),
    [options],
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q))
    : options;

  // Group filtered options preserving first-seen group order.
  const groups: { group: string; items: Option[] }[] = [];
  for (const o of filtered) {
    const g = o.group ?? "";
    let bucket = groups.find((x) => x.group === g);
    if (!bucket) {
      bucket = { group: g, items: [] };
      groups.push(bucket);
    }
    bucket.items.push(o);
  }

  const singleLabel = !multiple && selected[0] ? byValue.get(selected[0])?.label ?? "" : "";
  const inputValue = multiple ? query : open ? query : singleLabel;

  function choose(value: string) {
    if (multiple) {
      setSelected((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
      );
      setQuery("");
    } else {
      setSelected([value]);
      setQuery("");
      setOpen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      {selected.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      {usePrimary && <input type="hidden" name={primaryName} value={effectivePrimary} />}

      {multiple && selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((v) => {
            const label = byValue.get(v)?.label ?? v;
            const isPrimary = usePrimary && v === effectivePrimary;
            return (
              <span
                key={v}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-medium ${
                  isPrimary
                    ? "border-amber-400 bg-amber-50 text-amber-800"
                    : "border-brand-500 bg-brand-50 text-brand-800"
                }`}
              >
                {usePrimary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(v)}
                    title={isPrimary ? "Main trade" : "Set as main trade"}
                    aria-label={
                      isPrimary ? "Main trade" : `Set ${label} as main trade`
                    }
                    className={
                      isPrimary
                        ? "text-amber-500"
                        : "text-slate-400 hover:text-amber-500"
                    }
                  >
                    {isPrimary ? "★" : "☆"}
                  </button>
                )}
                {label}
                {isPrimary && (
                  <span className="rounded bg-amber-200 px-1 text-[9px] font-semibold uppercase tracking-wide text-amber-800">
                    Main
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setSelected((prev) => prev.filter((x) => x !== v))}
                  aria-label={`Remove ${label}`}
                  className="hover:opacity-70"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={!multiple && singleLabel && !open ? singleLabel : placeholder}
        autoComplete="off"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">{emptyText}</p>
          ) : (
            groups.map((group) => (
              <div key={group.group || "_"}>
                {group.group && (
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {group.group}
                  </p>
                )}
                {group.items.map((o) => {
                  const isSel = selected.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => choose(o.value)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
                        isSel ? "font-medium text-brand-800" : "text-slate-700"
                      }`}
                    >
                      {multiple && (
                        <span
                          className={`grid h-4 w-4 place-items-center rounded border text-[10px] ${
                            isSel
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {isSel ? "✓" : ""}
                        </span>
                      )}
                      {o.label}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
