// Location display helper. Standardized location *input* now lives in
// src/lib/cities.ts (the bundled US city dataset); this just formats a stored
// city/state pair for display, e.g. "Phoenix, AZ".

export function metroLabel(city?: string | null, state?: string | null): string {
  if (!city && !state) return "";
  if (city && state) return `${city}, ${state}`;
  return city ?? state ?? "";
}
