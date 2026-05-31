// Seed metro areas (PRD §10 — "two or three metro areas"). Used for quick
// location selection during onboarding, profiles, and listings.

export type Metro = { city: string; state: string; label: string };

export const METROS: Metro[] = [
  { city: "Phoenix", state: "AZ", label: "Phoenix, AZ" },
  { city: "Dallas", state: "TX", label: "Dallas, TX" },
  { city: "Atlanta", state: "GA", label: "Atlanta, GA" },
];

export function metroLabel(city?: string | null, state?: string | null): string {
  if (!city && !state) return "";
  if (city && state) return `${city}, ${state}`;
  return city ?? state ?? "";
}
