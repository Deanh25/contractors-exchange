"use client";

import { useEffect, useRef, useState } from "react";
import { US_STATES } from "@/lib/us-states";

type CityResult = { city: string; state: string; lat: number; lng: number };
// A confirmed selection. Coords may be null when a default city was supplied
// without coordinates (e.g. an older record) - we then submit blank lat/lng
// rather than a bogus 0,0.
type Selected = { city: string; state: string; lat: number | null; lng: number | null };

const numOrNull = (x?: number | null) =>
  typeof x === "number" && Number.isFinite(x) ? x : null;

/**
 * Linked State + City location control (PRD §10). The two fields stay in sync so
 * they can never disagree:
 *   - Pick a city  -> its state auto-fills the State dropdown.
 *   - Pick a state -> the City search is scoped to that state, and any
 *     already-chosen city in a different state is cleared.
 * Submits standardized hidden inputs: `state` + `city` (+ `lat`/`lng` in input
 * mode). City search hits GET /api/cities so the full dataset never ships to the
 * browser. One component is used everywhere a location is entered or filtered.
 */
export function LocationPicker({
  mode = "input",
  heading,
  hint,
  defaultCity,
  defaultState,
  defaultLat,
  defaultLng,
}: {
  mode?: "input" | "filter";
  heading?: string;
  hint?: string;
  defaultCity?: string | null;
  defaultState?: string | null;
  defaultLat?: number | null;
  defaultLng?: number | null;
}) {
  const [state, setState] = useState(defaultState ?? "");
  const [selectedCity, setSelectedCity] = useState<Selected | null>(
    defaultCity
      ? {
          city: defaultCity,
          state: defaultState ?? "",
          lat: numOrNull(defaultLat),
          lng: numOrNull(defaultLng),
        }
      : null,
  );
  const [cityQuery, setCityQuery] = useState(defaultCity ?? "");
  const [results, setResults] = useState<CityResult[]>([]);
  const [open, setOpen] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 2 || (selectedCity && q === selectedCity.city)) return;
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const scope = state ? `&state=${state}` : "";
        const res = await fetch(
          `/api/cities?q=${encodeURIComponent(q)}${scope}`,
          { signal: ac.signal },
        );
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        /* aborted or offline - ignore */
      }
    }, 180);
    return () => clearTimeout(t);
  }, [cityQuery, state, selectedCity]);

  function onStateChange(next: string) {
    setState(next);
    // A city already chosen in a different state can no longer be valid.
    if (selectedCity && selectedCity.state !== next) {
      setSelectedCity(null);
      setCityQuery("");
      setResults([]);
    }
  }

  function pickCity(r: CityResult) {
    setSelectedCity(r);
    setCityQuery(r.city);
    setState(r.state); // auto-fill the State dropdown
    setResults([]);
    setOpen(false);
  }

  const labelCls =
    mode === "filter"
      ? "mb-1 block text-xs font-medium text-slate-600"
      : "mb-1 block text-sm font-medium text-slate-700";
  const fieldCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
  const needsPick = !selectedCity && cityQuery.trim().length > 0;
  const showResults =
    open && cityQuery.trim().length >= 2 && results.length > 0;

  return (
    <div>
      {heading && (
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {heading}
        </label>
      )}

      {/* Standardized values. lat/lng are emitted in both modes: input forms
          store them, and the filter uses them as the center for radius search. */}
      <input type="hidden" name="state" value={state} />
      <input type="hidden" name="city" value={selectedCity?.city ?? ""} />
      <input
        type="hidden"
        name="lat"
        value={selectedCity?.lat != null ? String(selectedCity.lat) : ""}
      />
      <input
        type="hidden"
        name="lng"
        value={selectedCity?.lng != null ? String(selectedCity.lng) : ""}
      />

      <div className="grid grid-cols-2 gap-3">
        {/* State */}
        <div>
          <label className={labelCls}>State</label>
          <select
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
            className={fieldCls}
          >
            <option value="">
              {mode === "filter" ? "All states" : "Select state"}
            </option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        <div
          ref={cityRef}
          className="relative"
          onBlur={(e) => {
            if (!cityRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
          }}
        >
          <label className={labelCls}>City</label>
          <input
            type="text"
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value);
              if (selectedCity) setSelectedCity(null);
              setOpen(true);
            }}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={state ? "City in " + state + "…" : "Start typing a city…"}
            autoComplete="off"
            className={fieldCls}
          />

          {showResults && (
            <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
              {results.map((r) => (
                <button
                  key={`${r.city}-${r.state}`}
                  type="button"
                  onClick={() => pickCity(r)}
                  className="flex w-full items-center gap-1 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">{r.city}</span>
                  <span className="text-slate-500">, {r.state}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {hint && !needsPick && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {needsPick && (
        <p className="mt-1 text-xs text-amber-600">
          Choose a city from the list to set the location.
        </p>
      )}
    </div>
  );
}
