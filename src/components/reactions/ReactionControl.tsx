"use client";

import { useEffect, useRef, useState } from "react";
import { reactToPostAction } from "@/app/actions/engagement";
import { REACTIONS, REACTION_META } from "@/lib/reactions";
import { ReactionIcon } from "./ReactionIcon";
import type { ReactionType } from "@/generated/prisma/client";

/**
 * LinkedIn-style reaction control: one trigger button showing the viewer's
 * current reaction; hovering (or tapping) reveals the 4 animated pills. Picking
 * closes the flyout, as does an outside click or Escape - fixing the old native
 * <details> that stayed open after a Server Action's in-place refresh.
 *
 * The pills are real <form action={reactToPostAction}> submits, so reacting
 * still works without JS (the flyout just won't auto-close); with JS, onClick
 * closes it immediately and the revalidated feed refreshes the trigger.
 */
export function ReactionControl({
  postId,
  current,
}: {
  postId: string;
  current: ReactionType | null;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const hoverOpen = () => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), 120);
  };
  const hoverClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), 220);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  useEffect(() => () => clearTimers(), []);

  const meta = current ? REACTION_META[current] : null;

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={hoverOpen}
      onMouseLeave={hoverClose}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition hover:bg-slate-100"
        style={meta ? { color: meta.color } : undefined}
      >
        <ReactionIcon
          icon={meta?.icon ?? "ThumbsUp"}
          size={18}
          strokeWidth={2}
          style={{ color: meta?.color }}
        />
        <span className={meta ? "" : "text-slate-600"}>
          {meta?.label ?? "React"}
        </span>
      </button>

      <div
        role="menu"
        className={`absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl transition duration-150 ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-1 opacity-0"
        }`}
      >
        {REACTIONS.map((r) => {
          const active = current === r.type;
          return (
            <form action={reactToPostAction} key={r.type}>
              <input type="hidden" name="postId" value={postId} />
              <input type="hidden" name="type" value={r.type} />
              <button
                type="submit"
                title={active ? `Remove ${r.label}` : r.label}
                aria-label={active ? `Remove reaction: ${r.label}` : `React: ${r.label}`}
                onClick={() => setOpen(false)}
                className="reaction-pill flex w-16 flex-col items-center rounded-xl px-1 py-1.5"
                style={
                  active
                    ? {
                        backgroundColor: `${r.color}1f`,
                        boxShadow: `inset 0 0 0 1.5px ${r.color}`,
                      }
                    : undefined
                }
              >
                <span className="reaction-pill-icon" style={{ color: r.color }}>
                  <ReactionIcon icon={r.icon} size={24} strokeWidth={2} />
                </span>
                <span
                  className="mt-1 text-[11px] font-medium"
                  style={{ color: active ? r.color : "#64748b" }}
                >
                  {r.label}
                </span>
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
