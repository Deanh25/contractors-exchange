import type { OrderStep } from "@/lib/order-timeline";

/**
 * Compact milestone rail for the conversation's pinned deal panel (approved mock:
 * `.rail-mini`). Same OrderStep[] the full rail on the order page renders, so the
 * two can never disagree - this is just the small, label-only presentation.
 */
export function MiniOrderRail({ steps }: { steps: OrderStep[] }) {
  if (steps.length === 0) return null;

  const segColor = (s: OrderStep) =>
    s.state === "done"
      ? "bg-emerald-500"
      : s.state === "current"
        ? "bg-brand-400"
        : s.state === "stopped"
          ? "bg-red-300"
          : "bg-brand-100";

  return (
    <ol className="mt-3 flex border-t border-brand-100 pt-2.5">
      {steps.map((step, i) => {
        const done = step.state === "done";
        const current = step.state === "current";
        const stopped = step.state === "stopped";
        return (
          <li key={step.key} className="min-w-0 flex-1 text-center">
            <div className="flex items-center">
              {/* Left connector (hidden on the first step). */}
              <span
                className={`h-0.5 flex-1 ${i === 0 ? "invisible" : segColor(steps[i - 1])}`}
              />
              <span
                className={`grid h-4 w-4 flex-none place-items-center rounded-full border-2 text-[9px] leading-none text-white ${
                  done
                    ? "border-emerald-500 bg-emerald-500"
                    : current
                      ? "border-brand-500 bg-brand-500"
                      : stopped
                        ? "border-red-400 bg-red-400"
                        : "border-brand-200 bg-white"
                }`}
                aria-hidden
              >
                {done ? "✓" : stopped ? "×" : ""}
              </span>
              {/* Right connector (hidden on the last step). */}
              <span
                className={`h-0.5 flex-1 ${
                  i === steps.length - 1 ? "invisible" : segColor(step)
                }`}
              />
            </div>
            <p
              className={`mt-1 truncate px-0.5 text-[10px] ${
                current || done
                  ? "font-semibold text-brand-900"
                  : stopped
                    ? "font-semibold text-red-600"
                    : "text-brand-800/60"
              }`}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
