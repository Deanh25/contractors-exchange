/** Read-only star rating display (PRD §7), with fractional (half-star) fill. */
export function StarRating({
  rating,
  count,
  showEmpty = true,
  showNumber = true,
}: {
  rating: number;
  count?: number;
  showEmpty?: boolean;
  showNumber?: boolean;
}) {
  if (count === 0) {
    return showEmpty ? (
      <span className="text-xs text-slate-400">No reviews yet</span>
    ) : null;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} fill={Math.max(0, Math.min(1, rating - (i - 1)))} />
        ))}
      </span>
      {showNumber && (
        <span className="text-xs font-medium text-slate-600">
          {rating.toFixed(1)}
          {count !== undefined ? ` (${count})` : ""}
        </span>
      )}
    </span>
  );
}

/** One star with a 0-1 fractional amber fill over a slate base. */
function Star({ fill }: { fill: number }) {
  const path =
    "M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.36 4.18a1 1 0 0 0 .95.69h4.4c.97 0 1.37 1.24.59 1.81l-3.56 2.59a1 1 0 0 0-.36 1.12l1.36 4.18c.3.92-.75 1.69-1.54 1.12l-3.56-2.59a1 1 0 0 0-1.18 0l-3.56 2.59c-.79.57-1.84-.2-1.54-1.12l1.36-4.18a1 1 0 0 0-.36-1.12L2.4 9.61c-.78-.57-.38-1.81.59-1.81h4.4a1 1 0 0 0 .95-.69l1.36-4.18Z";
  return (
    <span className="relative inline-block h-4 w-4">
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="absolute inset-0 h-4 w-4 text-slate-300">
        <path d={path} />
      </svg>
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${fill * 100}%` }}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-4 w-4 text-amber-400">
          <path d={path} />
        </svg>
      </span>
    </span>
  );
}
