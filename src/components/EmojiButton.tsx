"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";
import { IconButton } from "@/components/IconButton";

/**
 * Emoji button + popover, Option A styling with a tooltip. A curated set for
 * now; the full LinkedIn-style picker (search + categories + frequently-used)
 * is its own queued task and will replace the grid here without changing this
 * button's contract. Calls `onPick(emoji)` and closes.
 */

// Curated, leaning trade/work-friendly. Kept in sync with the comment composer.
const EMOJIS = [
  "😀", "😄", "😊", "😍", "😎", "🤝", "👍", "👏",
  "🙏", "🔥", "💡", "✅", "💪", "🎉", "👀", "❤️",
  "🚀", "💯", "🛠️", "🏗️", "📐", "📦", "⭐", "❓",
];

export function EmojiButton({
  onPick,
  tooltipSide = "top",
}: {
  onPick: (emoji: string) => void;
  tooltipSide?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <IconButton
        label="Add an emoji"
        pressed={open}
        onClick={() => setOpen((o) => !o)}
        tooltipSide={tooltipSide}
      >
        <Smile size={19} aria-hidden />
      </IconButton>
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-1 grid w-64 grid-cols-8 gap-0.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              aria-label={`Insert ${e}`}
              className="rounded p-1 text-xl hover:bg-slate-100"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
