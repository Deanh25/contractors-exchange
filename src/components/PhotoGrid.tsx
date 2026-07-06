"use client";

import { useCallback, useEffect, useState } from "react";
import { isVideoUrl } from "@/lib/listings";
import { deleteProfilePhotoAction } from "@/app/actions/photos";

/**
 * Clean, uniform photo grid (LinkedIn/Facebook style): equal square cards that
 * open a full-screen lightbox with prev/next + Esc. When `canManage`, each card
 * shows a delete control. Videos render with a play badge and play in the
 * lightbox. Pure viewer - engagement (likes/comments) is layered on separately.
 */
export function PhotoGrid({
  photos,
  canManage = false,
  companyId,
}: {
  photos: { id: string; url: string }[];
  canManage?: boolean;
  companyId?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const count = photos.length;

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? i : (i + d + count) % count)),
    [count],
  );

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, step]);

  const active = open !== null ? photos[open] : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p, i) => {
          const video = isVideoUrl(p.url);
          return (
            <div
              key={p.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="block h-full w-full"
                aria-label="Open photo"
              >
                {video ? (
                  <video src={p.url} muted className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.url}
                    alt=""
                    className="h-full w-full object-cover transition group-hover:opacity-90"
                  />
                )}
              </button>
              {video && (
                <span className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-black/50 text-sm text-white">
                    ▶
                  </span>
                </span>
              )}
              {canManage && (
                <form action={deleteProfilePhotoAction} className="absolute right-1 top-1">
                  {companyId && <input type="hidden" name="companyId" value={companyId} />}
                  <input type="hidden" name="photoId" value={p.id} />
                  <button
                    type="submit"
                    aria-label="Delete photo"
                    className="grid h-6 w-6 place-items-center rounded-full bg-black/55 text-xs text-white opacity-0 transition hover:bg-black/80 group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={close}
        >
          <button
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20"
          >
            ✕
          </button>
          {count > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Previous"
                className="absolute left-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Next"
                className="absolute right-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:right-16"
              >
                ›
              </button>
            </>
          )}
          <div className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {isVideoUrl(active.url) ? (
              <video
                src={active.url}
                controls
                autoPlay
                className="max-h-[85vh] max-w-full rounded-lg"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.url}
                alt=""
                className="max-h-[85vh] max-w-full rounded-lg object-contain"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
