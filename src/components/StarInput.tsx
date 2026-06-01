"use client";

import { useState } from "react";

/** Clickable 1-5 star picker for the review form. Submits as `stars`. */
export function StarInput({ name = "stars" }: { name?: string }) {
  const [value, setValue] = useState(5);
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setValue(i)}
            onMouseEnter={() => setHover(i)}
            aria-label={`${i} star${i === 1 ? "" : "s"}`}
            className="p-0.5"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-7 w-7 transition-colors ${
                i <= active ? "text-amber-400" : "text-slate-300"
              }`}
            >
              <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.36 4.18a1 1 0 0 0 .95.69h4.4c.97 0 1.37 1.24.59 1.81l-3.56 2.59a1 1 0 0 0-.36 1.12l1.36 4.18c.3.92-.75 1.69-1.54 1.12l-3.56-2.59a1 1 0 0 0-1.18 0l-3.56 2.59c-.79.57-1.84-.2-1.54-1.12l1.36-4.18a1 1 0 0 0-.36-1.12L2.4 9.61c-.78-.57-.38-1.81.59-1.81h4.4a1 1 0 0 0 .95-.69l1.36-4.18Z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
