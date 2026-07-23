"use client";

import { forwardRef } from "react";
import { Tooltip } from "@/components/Tooltip";

/**
 * The one composer/control icon button, Option A (Dean, 07/22/2026): a quiet
 * ghost button - no chrome until hover, then a soft grey pad and brand-tinted
 * icon - the LinkedIn / Messenger treatment. Every instance carries a tooltip
 * (the standing rule) sourced from `label`, which is also the accessible name.
 *
 * Two variants, because a file picker is a <label> wrapping a hidden input, not
 * a <button>:
 *   - IconButton      an action button (emoji, send-adjacent controls, ...)
 *   - IconFileButton  a label that opens a file dialog
 */

const BASE =
  "grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 aria-pressed:bg-brand-50 aria-pressed:text-brand-700";

export const IconButton = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    children: React.ReactNode;
    onClick?: () => void;
    pressed?: boolean;
    tooltipSide?: "top" | "bottom";
  } & Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "aria-label" | "aria-pressed" | "className" | "onClick"
  >
>(function IconButton(
  { label, children, onClick, pressed, tooltipSide = "top", ...rest },
  ref,
) {
  return (
    <Tooltip label={label} side={tooltipSide}>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick}
        className={BASE}
        {...rest}
      >
        {children}
      </button>
    </Tooltip>
  );
});

/**
 * The same button, but a <label> around a hidden file input. Pass the input
 * props (name, accept, multiple, onChange) via `inputProps`; the caller keeps
 * its own ref to the input if it needs one for resetting.
 */
export function IconFileButton({
  label,
  children,
  inputProps,
  tooltipSide = "top",
}: {
  label: string;
  children: React.ReactNode;
  inputProps: React.InputHTMLAttributes<HTMLInputElement> & {
    ref?: React.Ref<HTMLInputElement>;
  };
  tooltipSide?: "top" | "bottom";
}) {
  return (
    <Tooltip label={label} side={tooltipSide}>
      {/* The label IS the control, so it takes the accessible name and a real
          focus stop; the input inside is visually hidden but still operable. */}
      <label aria-label={label} tabIndex={0} className={BASE} role="button">
        {children}
        <input {...inputProps} className="sr-only" />
      </label>
    </Tooltip>
  );
}
