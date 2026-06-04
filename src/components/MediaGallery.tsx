"use client";

import { useState } from "react";
import { isVideoUrl } from "@/lib/listings";

/**
 * Listing media gallery: a large main view (image or video) with prev/next
 * arrows + a position counter, plus a clickable thumbnail grid so a buyer can
 * pick and browse through every photo/video on the listing.
 */
export function MediaGallery({
  media,
  title,
}: {
  media: string[];
  title: string;
}) {
  const [i, setI] = useState(0);

  if (media.length === 0) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center rounded-xl border border-slate-200 bg-slate-100 text-slate-300">
        <span className="text-6xl">🏗️</span>
      </div>
    );
  }

  const current = media[Math.min(i, media.length - 1)];
  const go = (d: number) => setI((x) => (x + d + media.length) % media.length);

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        {isVideoUrl(current) ? (
          <video
            key={current}
            src={current}
            controls
            className="h-full w-full object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={title} className="h-full w-full object-cover" />
        )}

        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous"
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-lg text-slate-700 shadow ring-1 ring-slate-200 hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-lg text-slate-700 shadow ring-1 ring-slate-200 hover:bg-white"
            >
              ›
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              {i + 1} / {media.length}
            </span>
          </>
        )}
      </div>

      {media.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {media.map((m, idx) => (
            <button
              type="button"
              key={`${m}-${idx}`}
              onClick={() => setI(idx)}
              aria-label={`View ${idx + 1}`}
              className={`relative aspect-square overflow-hidden rounded-md border bg-slate-100 ${
                idx === i
                  ? "border-brand-500 ring-2 ring-brand-500"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {isVideoUrl(m) ? (
                <>
                  <video src={m} muted className="h-full w-full object-cover" />
                  <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[9px] font-medium text-white">
                    ▶
                  </span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m} alt="" className="h-full w-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
