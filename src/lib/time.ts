const RTF = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const DATE_TIME_FMT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Jun 28, 2026, 3:42 PM" - an absolute timestamp (e.g. audit log rows). */
export function formatDateTime(date: Date): string {
  return DATE_TIME_FMT.format(date);
}

/** "3 hours ago", "yesterday", "just now" - for feed timestamps. */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  for (const [unit, secs] of STEPS) {
    if (abs >= secs) return RTF.format(Math.round(seconds / secs), unit);
  }
  return "just now";
}
