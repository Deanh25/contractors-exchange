"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { setActingContextAction } from "@/app/actions/identity";

type Option = {
  id: string; // "self" or a company id
  name: string;
  avatarUrl: string | null;
  kind: "user" | "company";
};

/**
 * Top-bar "acting as" switcher (LinkedIn model). Lets a user act as themselves
 * or as a company they may act for; the choice drives what they post/list/
 * message as and which company surfaces they see. Only shown when the user can
 * act for at least one company.
 */
export function ActingAsSwitcher({
  current,
  options,
}: {
  current: Option;
  options: Option[];
}) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Acting as"
        className="flex items-center gap-1.5 rounded-full border border-slate-200 py-1 pl-1 pr-2 hover:bg-slate-100"
      >
        <Avatar
          name={current.name}
          src={current.avatarUrl}
          size={24}
          rounded={current.kind === "company" ? "md" : "full"}
        />
        <span className="hidden max-w-[8rem] truncate text-xs font-medium text-slate-700 sm:block">
          {current.kind === "company" ? current.name : "You"}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-brand-500 transition-transform ${open ? "rotate-180" : ""}`}
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
        <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Acting as
          </p>
          {options.map((o) => {
            const active = o.id === current.id;
            return (
              <form key={o.id} action={setActingContextAction} onSubmit={() => setOpen(false)}>
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
                    size={28}
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
        </div>
      )}
    </div>
  );
}
