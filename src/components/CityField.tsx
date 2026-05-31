"use client";

import { useEffect, useRef, useState } from "react";

type CityResult = { city: string; state: string; lat: number; lng: number };

/**
 * Standardized US city picker (PRD §10). Type-to-search against /api/cities;
 * choosing a result locks in a canonical city + state + lat/lng via hidden
 * inputs (`city`, `state`, `lat`, `lng`) so every form stores the same value for
 * the same place. Typing without choosing submits no location (kept blank rather
 * than free-text), which keeps location data clean for content matching.
 */
export function CityField({
  label = "City & state",
  defaultCity,
  defaultState,
  defaultLat,
  defaultLng,
  hint,
}: {
  label?: string;
  defaultCity?: string | null;
  defaultState?: string | null;
  defaultLat?: number | null;
  defaultLng?: number | null;
  hint?: string;
}) {
  const initial: CityResult | null =
    defaultCity && defaultState
      ? {
          city: defaultCity,
          state: defaultState,
          lat: defaultLat ?? 0,
          lng: defaultLng ?? 0,
        }
      : null;

  const [selected, setSelected] = useState<CityResult | null>(initial);
  const [query, setQuery] = useState(
    initial ? `${initial.city}, ${initial.state}` : "",
  );
  const [results, setResults] = useState<CityResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    const matchesSelection =
      selected && q === `${selected.city}, ${selected.state}`;
    // Nothing to fetch - don't touch state synchronously here (the dropdown is
    // gated on query length below, so stale results simply aren't shown).
    if (q.length < 2 || matchesSelection) return;
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
        });
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        /* aborted or offline - ignore */
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query, selected]);

  function pick(r: CityResult) {
    setSelected(r);
    setQuery(`${r.city}, ${r.state}`);
    setResults([]);
    setOpen(false);
  }

  const needsPick = !selected && query.trim().length > 0;
  const showResults = open && query.trim().length >= 2 && results.length > 0;

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>

      <input type="hidden" name="city" value={selected?.city ?? ""} />
      <input type="hidden" name="state" value={selected?.state ?? ""} />
      <input type="hidden" name="lat" value={selected ? String(selected.lat) : ""} />
      <input type="hidden" name="lng" value={selected ? String(selected.lng) : ""} />

      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (selected) setSelected(null);
          setOpen(true);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Start typing a city…"
        autoComplete="off"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      {hint && !needsPick && (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
      {needsPick && (
        <p className="mt-1 text-xs text-amber-600">
          Choose a city from the list to set your location.
        </p>
      )}

      {showResults && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {results.map((r) => (
            <button
              key={`${r.city}-${r.state}`}
              type="button"
              onClick={() => pick(r)}
              className="flex w-full items-center gap-1 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="font-medium text-slate-900">{r.city}</span>
              <span className="text-slate-500">, {r.state}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
