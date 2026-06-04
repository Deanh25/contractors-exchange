"use client";

import { useEffect, useRef, useState } from "react";
import { isVideoUrl } from "@/lib/listings";

/**
 * Listing media gallery: a large main view (image or video) with prev/next
 * arrows + a position counter and a clickable thumbnail grid. Clicking a photo
 * opens a fullscreen LIGHTBOX with zoom (scroll / +- buttons / double-click) and
 * drag-to-pan - handy for inspecting used equipment up close.
 */
export function MediaGallery({
  media,
  title,
}: {
  media: string[];
  title: string;
}) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);

  if (media.length === 0) {
    return (
      <div className="grid aspect-[4/3] w-full place-items-center rounded-xl border border-slate-200 bg-slate-100 text-slate-300">
        <span className="text-6xl">🏗️</span>
      </div>
    );
  }

  const idx = Math.min(i, media.length - 1);
  const current = media[idx];
  const currentIsVideo = isVideoUrl(current);
  const go = (d: number) => setI((x) => (x + d + media.length) % media.length);

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        {currentIsVideo ? (
          <video
            key={current}
            src={current}
            controls
            className="h-full w-full object-contain"
          />
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="block h-full w-full cursor-zoom-in"
            aria-label="Zoom image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current} alt={title} className="h-full w-full object-cover" />
          </button>
        )}

        {!currentIsVideo && (
          <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white">
            <ZoomIcon /> Click to zoom
          </span>
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
              {idx + 1} / {media.length}
            </span>
          </>
        )}
      </div>

      {media.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {media.map((m, k) => (
            <button
              type="button"
              key={`${m}-${k}`}
              onClick={() => setI(k)}
              aria-label={`View ${k + 1}`}
              className={`relative aspect-square overflow-hidden rounded-md border bg-slate-100 ${
                k === idx
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

      {open && (
        <Lightbox
          media={media}
          index={idx}
          title={title}
          onIndex={setI}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/** Fullscreen zoomable viewer. */
function Lightbox({
  media,
  index,
  title,
  onIndex,
  onClose,
}: {
  media: string[];
  index: number;
  title: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const current = media[index];
  const isVideo = isVideoUrl(current);

  const reset = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };
  const zoom = (delta: number) =>
    setScale((s) => {
      const next = Math.min(5, Math.max(1, Math.round((s + delta) * 100) / 100));
      if (next === 1) setPos({ x: 0, y: 0 });
      return next;
    });
  const step = (d: number) => {
    onIndex((index + d + media.length) % media.length);
    reset();
  };

  // Lock body scroll + wire keyboard while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "+" || e.key === "=") zoom(0.5);
      else if (e.key === "-") zoom(-0.5);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, media.length]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-end gap-2 p-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {!isVideo && (
          <>
            <ToolBtn label="Zoom out" onClick={() => zoom(-0.5)}>
              −
            </ToolBtn>
            <span className="w-12 text-center text-sm tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <ToolBtn label="Zoom in" onClick={() => zoom(0.5)}>
              +
            </ToolBtn>
            <ToolBtn label="Reset zoom" onClick={reset}>
              ⟲
            </ToolBtn>
          </>
        )}
        <ToolBtn label="Close" onClick={onClose}>
          ✕
        </ToolBtn>
      </div>

      {/* Stage */}
      <div
        className="relative flex flex-1 select-none items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => {
          if (!isVideo) zoom(e.deltaY < 0 ? 0.25 : -0.25);
        }}
        onDoubleClick={() => {
          if (isVideo) return;
          if (scale > 1) reset();
          else zoom(1.5);
        }}
        onMouseDown={(e) => {
          if (isVideo || scale <= 1) return;
          drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
        }}
        onMouseMove={(e) => {
          if (!drag.current) return;
          setPos({
            x: drag.current.px + (e.clientX - drag.current.x),
            y: drag.current.py + (e.clientY - drag.current.y),
          });
        }}
        onMouseUp={() => (drag.current = null)}
        onMouseLeave={() => (drag.current = null)}
        style={{ cursor: isVideo ? "default" : scale > 1 ? "grab" : "zoom-in" }}
      >
        {isVideo ? (
          <video
            src={current}
            controls
            autoPlay
            className="max-h-full max-w-full"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current}
            alt={title}
            draggable={false}
            className="max-h-full max-w-full object-contain transition-transform duration-75"
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            }}
          />
        )}

        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous"
              className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next"
              className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
            >
              ›
            </button>
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm text-white">
              {index + 1} / {media.length}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function ToolBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-base text-white hover:bg-white/25"
    >
      {children}
    </button>
  );
}

function ZoomIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m21 21-4.3-4.3M11 8v6M8 11h6" />
    </svg>
  );
}
