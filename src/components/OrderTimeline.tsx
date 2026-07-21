import { Check, X } from "lucide-react";
import { timeAgo } from "@/lib/time";
import type { OrderStep, OrderStepState } from "@/lib/order-timeline";

/**
 * Horizontal milestone tracker for a deal: past steps solid green, the current
 * step ringed in brand orange, future steps outlined so both sides can see the
 * whole process ahead of them. Steps come from `orderTimeline()` (pure, shared
 * with the future mobile app); this file is presentation only.
 *
 * On narrow screens the rail scrolls sideways rather than collapsing, so the
 * shape of the journey stays readable on a phone.
 */

const MARKER: Record<OrderStepState, string> = {
  done: "border-emerald-500 bg-emerald-500 text-white",
  current: "border-brand-500 bg-white text-brand-600 ring-4 ring-brand-100",
  upcoming: "border-slate-300 bg-white text-slate-300",
  stopped: "border-rose-500 bg-rose-500 text-white",
  skipped: "border-dashed border-slate-200 bg-white text-slate-200",
};

const LABEL: Record<OrderStepState, string> = {
  done: "font-medium text-slate-700",
  current: "font-semibold text-slate-900",
  upcoming: "font-medium text-slate-400",
  stopped: "font-semibold text-rose-700",
  skipped: "font-medium text-slate-300",
};

/** The connector running into a step takes that step's own progress. */
function connector(state: OrderStepState): string {
  if (state === "done") return "bg-emerald-500";
  if (state === "current") return "bg-brand-400";
  if (state === "stopped") return "bg-rose-400";
  return "bg-slate-200";
}

function Marker({ step }: { step: OrderStep }) {
  return (
    <span
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${MARKER[step.state]}`}
    >
      {step.state === "done" ? (
        <Check size={14} strokeWidth={3} aria-hidden />
      ) : step.state === "stopped" ? (
        <X size={14} strokeWidth={3} aria-hidden />
      ) : (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            step.state === "current" ? "bg-brand-500" : "bg-slate-300"
          }`}
        />
      )}
    </span>
  );
}

export function OrderTimeline({ steps }: { steps: OrderStep[] }) {
  const currentIndex = steps.findIndex(
    (s) => s.state === "current" || s.state === "stopped",
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Order progress
      </h2>

      <ol className="flex min-w-full overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <li key={step.key} className="min-w-[104px] flex-1">
            {/* Marker row: half-connectors on each side line the rail up
                through the middle of every marker. */}
            <div className="flex items-center">
              <span
                className={`h-0.5 flex-1 ${i === 0 ? "invisible" : connector(step.state)}`}
              />
              <Marker step={step} />
              <span
                className={`h-0.5 flex-1 ${
                  i === steps.length - 1
                    ? "invisible"
                    : connector(steps[i + 1].state)
                }`}
              />
            </div>

            <div className="mt-2 px-1 text-center">
              <p className={`text-xs leading-tight ${LABEL[step.state]}`}>
                {step.label}
              </p>
              {step.at && (
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {timeAgo(step.at)}
                </p>
              )}
              {i === currentIndex && step.hint && (
                <p
                  className={`mt-1 text-[11px] font-medium ${
                    step.state === "stopped" ? "text-rose-600" : "text-brand-700"
                  }`}
                >
                  {step.hint}
                </p>
              )}
              {i !== currentIndex && step.state === "upcoming" && step.hint && (
                <p className="mt-1 text-[11px] text-slate-400">{step.hint}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
