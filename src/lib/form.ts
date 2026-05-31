// Small form-parsing helpers (no heavy imports, safe to use in server actions).

/** Parse a numeric form field (e.g. lat/lng) into a finite number, or null. */
export function parseCoord(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
