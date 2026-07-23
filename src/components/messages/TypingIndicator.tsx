/**
 * "The other side is typing" dots. Rendered as a thin strip pinned at the BOTTOM
 * of the conversation, right above the composer (item 4: Facebook / LinkedIn
 * placement), rather than inline where the next bubble would go. Announced
 * politely so a screen reader mentions it once without interrupting.
 */
export function TypingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 px-4 pb-1 pt-0.5 sm:px-5"
    >
      <span className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
        <span className="sr-only">Typing…</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
    </div>
  );
}
