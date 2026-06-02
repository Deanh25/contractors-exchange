"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  saveToCollectionAction,
  createCollectionAndSaveAction,
  removeSaveAction,
} from "@/app/actions/saved";

type Collection = { id: string; name: string };

/**
 * Bookmark control with a save-to-collection menu. Clicking opens a popover to
 * pick a collection (or Uncategorized), create one on the fly, or remove the
 * save. Reads the current path so its server actions revalidate in place.
 */
export function SaveButton({
  listingId,
  saved,
  currentCollectionId = null,
  collections,
  variant = "icon",
}: {
  listingId: string;
  saved: boolean;
  currentCollectionId?: string | null;
  collections: Collection[];
  variant?: "icon" | "button";
}) {
  const pathname = usePathname() ?? "/listings";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      {variant === "button" ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition ${
            saved
              ? "border-brand-300 bg-brand-50 text-brand-700"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Bookmark filled={saved} />
          {saved ? "Saved" : "Save"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          title={saved ? "Saved" : "Save"}
          aria-label={saved ? "Edit saved listing" : "Save listing"}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200 backdrop-blur transition hover:bg-white hover:text-brand-600"
        >
          <Bookmark filled={saved} />
        </button>
      )}

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-lg">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Save to collection
          </p>

          <div className="max-h-56 overflow-y-auto">
            <CollectionRow
              listingId={listingId}
              path={pathname}
              collectionId=""
              label="Uncategorized"
              active={saved && !currentCollectionId}
              onDone={close}
            />
            {collections.map((c) => (
              <CollectionRow
                key={c.id}
                listingId={listingId}
                path={pathname}
                collectionId={c.id}
                label={c.name}
                active={saved && currentCollectionId === c.id}
                onDone={close}
              />
            ))}
          </div>

          {/* Create a new collection on the fly */}
          <form
            action={createCollectionAndSaveAction}
            onSubmit={close}
            className="mt-1 flex items-center gap-1 border-t border-slate-100 px-2 pb-1 pt-2"
          >
            <input type="hidden" name="listingId" value={listingId} />
            <input type="hidden" name="path" value={pathname} />
            <input
              name="name"
              required
              maxLength={60}
              placeholder="New collection…"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md bg-brand-500 px-2.5 py-1 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Add
            </button>
          </form>

          {saved && (
            <form
              action={removeSaveAction}
              onSubmit={close}
              className="border-t border-slate-100"
            >
              <input type="hidden" name="listingId" value={listingId} />
              <input type="hidden" name="path" value={pathname} />
              <button
                type="submit"
                className="block w-full px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Remove from saved
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function CollectionRow({
  listingId,
  path,
  collectionId,
  label,
  active,
  onDone,
}: {
  listingId: string;
  path: string;
  collectionId: string;
  label: string;
  active: boolean;
  onDone: () => void;
}) {
  return (
    <form action={saveToCollectionAction} onSubmit={onDone}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="path" value={path} />
      <input type="hidden" name="collectionId" value={collectionId} />
      <button
        type="submit"
        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
          active ? "font-semibold text-brand-700" : "text-slate-700"
        }`}
      >
        <span className="truncate">{label}</span>
        {active && <Check />}
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

function Check() {
  return (
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
  );
}
