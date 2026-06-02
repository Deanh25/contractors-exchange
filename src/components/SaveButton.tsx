"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { toggleSaveAction } from "@/app/actions/saved";

/**
 * Bookmark toggle for a listing. Optimistically flips its filled state, then
 * posts to the server action (which revalidates). Reads the current path so it
 * can revalidate wherever it is used (cards, listing detail).
 */
export function SaveButton({
  listingId,
  saved,
  variant = "icon",
}: {
  listingId: string;
  saved: boolean;
  variant?: "icon" | "button";
}) {
  const pathname = usePathname() ?? "/listings";
  const [on, setOn] = useState(saved);

  if (variant === "button") {
    return (
      <form action={toggleSaveAction} onSubmit={() => setOn((v) => !v)}>
        <input type="hidden" name="listingId" value={listingId} />
        <input type="hidden" name="path" value={pathname} />
        <button
          type="submit"
          className={`flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition ${
            on
              ? "border-brand-300 bg-brand-50 text-brand-700"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Bookmark filled={on} />
          {on ? "Saved" : "Save"}
        </button>
      </form>
    );
  }

  return (
    <form action={toggleSaveAction} onSubmit={() => setOn((v) => !v)}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="path" value={pathname} />
      <button
        type="submit"
        title={on ? "Saved" : "Save"}
        aria-label={on ? "Remove from saved" : "Save listing"}
        aria-pressed={on}
        className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200 backdrop-blur transition hover:bg-white hover:text-brand-600"
      >
        <Bookmark filled={on} />
      </button>
    </form>
  );
}

function Bookmark({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-4 w-4 ${filled ? "text-brand-500" : ""}`}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
      />
    </svg>
  );
}
