"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Instant-apply wrapper for the Marketplace filter rail. There is no "Apply"
 * button: any control change re-runs the query. It follows the codebase idiom
 * (a GET form that auto-submits, like SortSelect) but intercepts the submit to
 * do a scroll-preserving router.replace, so toggling a filter updates the grid
 * in place without a page jump. With JS off the form still GET-submits natively,
 * so filtering degrades gracefully.
 *
 * Checkboxes/selects apply immediately; free-text and number inputs (search,
 * price) are debounced so we don't navigate on every keystroke.
 */
export function FilterForm({
  children,
  className,
  debounceMs = 450,
}: {
  children: React.ReactNode;
  className?: string;
  debounceMs?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(form: HTMLFormElement) {
    const usp = new URLSearchParams();
    for (const [key, value] of new FormData(form).entries()) {
      const v = typeof value === "string" ? value.trim() : "";
      if (v) usp.append(key, v);
    }
    const qs = usp.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function onChange(e: React.ChangeEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const target = e.target as HTMLElement;
    const typed =
      target instanceof HTMLInputElement &&
      (target.type === "text" ||
        target.type === "search" ||
        target.type === "number");
    if (timer.current) clearTimeout(timer.current);
    if (typed) {
      timer.current = setTimeout(() => navigate(form), debounceMs);
    } else {
      navigate(form);
    }
  }

  return (
    <form
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        navigate(e.currentTarget);
      }}
      onChange={onChange}
      className={className}
      style={isPending ? { opacity: 0.6, transition: "opacity .1s" } : undefined}
    >
      {children}
    </form>
  );
}
