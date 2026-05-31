const RTF = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "3 hours ago", "yesterday", "just now" — for feed timestamps. */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  for (const [unit, secs] of STEPS) {
    if (abs >= secs) return RTF.format(Math.round(seconds / secs), unit);
  }
  return "just now";
}
