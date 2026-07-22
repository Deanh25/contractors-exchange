/**
 * Hover/focus tooltip. CX house rule (Dean, 07/22/2026): EVERY function names
 * itself on hover, so this wraps any control that would otherwise be an
 * unlabeled icon.
 *
 * CSS-only, so it costs no JavaScript and works inside Server Components. It
 * shows on pointer hover AND on keyboard focus, because a control a mouse user
 * can identify must be identifiable from the keyboard too. The tooltip itself is
 * `aria-hidden` and never focusable: screen readers get the name from the
 * control's own `aria-label`/`title`, and a duplicate would just be read twice.
 */
export function Tooltip({
  label,
  children,
  side = "top",
}: {
  label: string;
  children: React.ReactNode;
  /** Flip below when the control sits at the top of its container. */
  side?: "top" | "bottom";
}) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        aria-hidden
        className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-sm transition-opacity duration-100 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100 ${
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5"
        }`}
      >
        {label}
      </span>
    </span>
  );
}
