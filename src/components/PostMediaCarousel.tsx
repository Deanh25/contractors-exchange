"use client";

import { useState } from "react";
import { isVideoUrl } from "@/lib/listings";

/** One media item, filling its frame (cover in the card, contained in the lightbox). */
function MediaItem({ src, cover }: { src: string; cover?: boolean }) {
  const fit = cover ? "object-cover" : "object-contain";
  return isVideoUrl(src) ? (
    <video src={src} controls className={`h-full w-full ${fit}`} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`h-full w-full ${fit}`} />
  );
}

/**
 * Post media viewer (LinkedIn-style). One photo/video renders plainly; two or more
 * become a swipeable carousel with an N/total counter, prev/next arrows, and dots.
 * A click opens the current item full-size in a lightbox. Media order comes from
 * the post (index 0 = cover); this component only presents it.
 */
export function PostMediaCarousel({ media }: { media: string[] }) {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  if (media.length === 0) return null;

  const count = media.length;
  const clamp = (n: number) => (n + count) % count;
  const go = (n: number) => setIdx(clamp(n));
  const url = media[idx];

  const frameCls =
    "relative mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-950/[0.03]";

  return (
    <>
      <div className={frameCls}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open media"
          className="block h-96 w-full"
        >
          <MediaItem src={url} cover />
        </button>

        {count > 1 && (
          <>
            <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              {idx + 1}/{count}
            </span>
            <button
              type="button"
              onClick={() => go(idx - 1)}
              aria-label="Previous"
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-slate-800 shadow hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(idx + 1)}
              aria-label="Next"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-slate-800 shadow hover:bg-white"
            >
              ›
            </button>
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {media.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to item ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "w-4 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] max-w-4xl items-center justify-center"
          >
            <MediaItem src={url} />
          </div>
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(idx - 1);
                }}
                aria-label="Previous"
                className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(idx + 1);
                }}
                aria-label="Next"
                className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
              >
                ›
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white">
                {idx + 1}/{count}
              </span>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-lg text-white hover:bg-white/25"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
