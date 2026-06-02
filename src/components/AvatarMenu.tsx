"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { signOutAction } from "@/app/actions/auth";
import { setActingContextAction } from "@/app/actions/identity";

const LINKS = [
  { label: "View profile", href: "/me" },
  { label: "Orders", href: "/orders" },
  { label: "Saved", href: "/saved" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/me/edit" },
];

type Identity = {
  id: string; // "self" or a company id
  name: string;
  avatarUrl: string | null;
  kind: "user" | "company";
};

/**
 * The identity hub in the top bar: shows who you're currently acting as, and the
 * dropdown both switches identity (you / a company you may act for) and links to
 * your personal account. One control, so there's no confusing second avatar menu.
 */
export function AvatarMenu({
  current,
  options,
}: {
  current: Identity;
  options: Identity[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? "/";
  const canSwitch = options.length > 1;

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100"
      >
        <Avatar
          name={current.name}
          src={current.avatarUrl}
          size={28}
          rounded={current.kind === "company" ? "md" : "full"}
        />
        <span className="hidden max-w-[9rem] truncate text-sm font-medium text-slate-800 sm:block">
          {current.name}
        </span>
        <svg
          className={`h-4 w-4 text-brand-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.75}
          stroke="currentColor"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {/* Acting-as switch (only when the user can act for a company) */}
          {canSwitch && (
            <>
              <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Acting as
              </p>
              {options.map((o) => {
                const active = o.id === current.id;
                return (
                  <form
                    key={o.id}
                    action={setActingContextAction}
                    onSubmit={() => setOpen(false)}
                  >
                    <input type="hidden" name="value" value={o.id} />
                    <input type="hidden" name="path" value={pathname} />
                    <button
                      type="submit"
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                        active ? "bg-brand-50/60" : ""
                      }`}
                    >
                      <Avatar
                        name={o.name}
                        src={o.avatarUrl}
                        size={24}
                        rounded={o.kind === "company" ? "md" : "full"}
                      />
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                        {o.kind === "user" ? `${o.name} (you)` : o.name}
                      </span>
                      {active && (
                        <svg
                          className="h-4 w-4 shrink-0 text-brand-500"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  </form>
                );
              })}
              <div className="my-1 border-t border-slate-100" />
            </>
          )}

          {/* Personal account links */}
          {canSwitch && (
            <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your account
            </p>
          )}
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {l.label}
            </Link>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="block w-full px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
