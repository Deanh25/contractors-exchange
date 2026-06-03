"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import type { Mention } from "@/app/api/mentions/route";

/**
 * Tag people or companies in a post (company-as-actor). A small typeahead that
 * searches /api/mentions and collects chips; the selected tags are submitted as
 * a hidden "tagIds" field ("user:ID,company:ID,...") read by createPostAction.
 */
export function PostTagPicker() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Mention[]>([]);
  const [chips, setChips] = useState<Mention[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) return; // nothing to search; `available` derives to []
    let active = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/mentions?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        if (active) setResults(data.results ?? []);
      } catch {
        if (active) setResults([]);
      }
    }, 180);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const key = (m: { type: string; id: string }) => `${m.type}:${m.id}`;
  const add = (m: Mention) => {
    if (!chips.some((c) => key(c) === key(m))) setChips((cs) => [...cs, m]);
    setQ("");
    setResults([]);
    setOpen(false);
  };
  const remove = (m: Mention) =>
    setChips((cs) => cs.filter((c) => key(c) !== key(m)));

  const available =
    q.trim().length < 1
      ? []
      : results.filter((r) => !chips.some((c) => key(c) === key(r)));

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name="tagIds" value={chips.map(key).join(",")} />

      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((c) => (
          <span
            key={key(c)}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
          >
            <Avatar
              name={c.name}
              src={c.avatarUrl}
              size={16}
              rounded={c.type === "company" ? "md" : "full"}
            />
            {c.name}
            <button
              type="button"
              onClick={() => remove(c)}
              className="text-brand-400 hover:text-brand-700"
              aria-label={`Remove ${c.name}`}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={chips.length ? "Tag more…" : "🏷️ Tag people or companies…"}
          className="min-w-[10rem] flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {open && available.length > 0 && (
        <ul className="absolute z-30 mt-1 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {available.map((m) => (
            <li key={key(m)}>
              <button
                type="button"
                onClick={() => add(m)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50"
              >
                <Avatar
                  name={m.name}
                  src={m.avatarUrl}
                  size={24}
                  rounded={m.type === "company" ? "md" : "full"}
                />
                <span className="min-w-0 flex-1 truncate text-slate-800">
                  {m.name}
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">
                  {m.type}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
