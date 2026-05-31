export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Verified"
      className={`inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 ${className}`}
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 1.5l2.2 1.6 2.7-.2 1 2.5 2.3 1.4-.8 2.6.8 2.6-2.3 1.4-1 2.5-2.7-.2L10 18.5l-2.2-1.6-2.7.2-1-2.5L1.8 13l.8-2.6L1.8 7.8l2.3-1.4 1-2.5 2.7.2L10 1.5zm3.6 6.2a.75.75 0 00-1.2-.9l-3 4-1.6-1.5a.75.75 0 10-1 1.1l2.2 2a.75.75 0 001.1-.1l3.5-4.6z"
          clipRule="evenodd"
        />
      </svg>
      Verified
    </span>
  );
}
