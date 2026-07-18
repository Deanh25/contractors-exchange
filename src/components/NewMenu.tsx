"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type NewAction = { label: string; sub: string; href: string; icon: "listing" | "post" };

/**
 * The top-bar "New" button: a general create action that grows as the product
 * does. Today it offers New Listing + New Post; future create flows slot in here
 * instead of adding more buttons to the header. Modeled on AvatarMenu (click
 * outside to close).
 */
export function NewMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const actions: NewAction[] = [
    { label: "New Listing", sub: "Sell, auction, or trade an item", href: "/listings/new", icon: "listing" },
    { label: "New Post", sub: "Share an update to the feed", href: "/feed", icon: "post" },
  ];

  return (
    <div ref={ref} className="relative ml-1 hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
        New
        <svg
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50"
            >
              <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg bg-brand-50 text-brand-600">
                {a.icon === "listing" ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                  </svg>
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">{a.label}</span>
                <span className="block text-xs text-slate-500">{a.sub}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
