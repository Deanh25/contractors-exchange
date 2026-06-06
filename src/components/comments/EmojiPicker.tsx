"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

// A small, curated set leaning trade/work-friendly. Inserted into the composer.
const EMOJIS = [
  "😀", "😄", "😊", "😍", "😎", "🤝", "👍", "👏",
  "🙏", "🔥", "💡", "✅", "💪", "🎉", "👀", "❤️",
  "🚀", "💯", "🛠️", "🏗️", "📐", "📦", "⭐", "❓",
];

/** Emoji popover for the comment composer. Closes on pick + outside click. */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Add emoji"
        className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <Smile size={18} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-1 grid w-60 grid-cols-8 gap-0.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              className="rounded p-1 text-lg hover:bg-slate-100"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
