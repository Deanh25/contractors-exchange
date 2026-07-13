"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { reactToCommentAction } from "@/app/actions/engagement";
import { REACTIONS, REACTION_META } from "@/lib/reactions";
import { ReactionIcon } from "@/components/reactions/ReactionIcon";
import type { CommentReactionSummary } from "@/lib/engagement";

/**
 * Compact comment reaction control: a small "Like" text trigger that, on hover
 * or tap, reveals the 4 animated pills (same set as posts). Shows the viewer's
 * current reaction in its color. Closes on pick / outside-click / Escape.
 */
export function CommentLikeButton({
  commentId,
  reactions,
  canReact,
  onChanged,
}: {
  commentId: string;
  reactions: CommentReactionSummary;
  canReact: boolean;
  /** Reload the thread after reacting - comment reactions render from the
   *  client-side tree, so a server revalidate alone would not refresh them. */
  onChanged?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [, startReact] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
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

  useEffect(() => () => clearTimers(), []);

  const current = reactions.viewerReaction;
  const meta = current ? REACTION_META[current] : null;

  function react(type: string) {
    setOpen(false);
    const fd = new FormData();
    fd.set("commentId", commentId);
    fd.set("type", type);
    startReact(async () => {
      await reactToCommentAction(fd);
      onChanged?.();
    });
  }

  if (!canReact) {
    return <span className="font-semibold text-slate-300">Like</span>;
  }

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={hoverOpen}
      onMouseLeave={hoverClose}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="font-semibold hover:text-slate-600"
        style={meta ? { color: meta.color } : undefined}
      >
        {meta?.label ?? "Like"}
      </button>

      <div
        role="menu"
        className={`absolute bottom-full left-0 z-20 mb-1.5 flex gap-0.5 rounded-full border border-slate-200 bg-white p-1 shadow-xl transition duration-150 ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-1 opacity-0"
        }`}
      >
        {REACTIONS.map((r) => (
          <button
            key={r.type}
            type="button"
            title={current === r.type ? `Remove ${r.label}` : r.label}
            aria-label={
              current === r.type
                ? `Remove reaction: ${r.label}`
                : `React: ${r.label}`
            }
            onClick={() => react(r.type)}
            className="reaction-pill grid h-9 w-9 place-items-center rounded-full"
            style={
              current === r.type
                ? { backgroundColor: `${r.color}1f`, boxShadow: `inset 0 0 0 1.5px ${r.color}` }
                : undefined
            }
          >
            <span className="reaction-pill-icon" style={{ color: r.color }}>
              <ReactionIcon icon={r.icon} size={20} strokeWidth={2} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
