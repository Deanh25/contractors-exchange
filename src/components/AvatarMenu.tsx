"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { signOutAction } from "@/app/actions/auth";

const LINKS = [
  { label: "View profile", href: "/me" },
  { label: "Orders", href: "/orders" },
  { label: "Saved", href: "/saved" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/me/edit" },
];

/** The "Me hub" dropdown in the top bar. */
export function AvatarMenu({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100"
      >
        <Avatar name={name} src={avatarUrl} size={28} />
        <span className="hidden max-w-[8rem] truncate text-sm font-medium text-slate-800 sm:block">
          {name}
        </span>
        <span className="text-xs text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
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
