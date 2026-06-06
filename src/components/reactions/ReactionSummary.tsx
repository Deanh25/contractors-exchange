"use client";

import { useState } from "react";
import { REACTIONS } from "@/lib/reactions";
import { ReactionIcon } from "./ReactionIcon";
import { ReactorsModal } from "./ReactorsModal";
import type { ReactionType } from "@/generated/prisma/client";

/**
 * The reaction summary cluster (overlapping reaction icons + total). Clicking it
 * opens the "who reacted" modal. Hidden when a post has no reactions.
 */
export function ReactionSummary({
  postId,
  byType,
  total,
}: {
  postId: string;
  byType: Partial<Record<ReactionType, number>>;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  if (total <= 0) return null;
  const present = REACTIONS.filter((r) => byType[r.type]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="See who reacted"
        className="group flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
      >
        <span className="flex -space-x-1.5">
          {present.slice(0, 3).map((r) => (
            <span
              key={r.type}
              className="grid h-5 w-5 place-items-center rounded-full bg-white ring-1 ring-white"
              style={{ color: r.color }}
            >
              <ReactionIcon icon={r.icon} size={13} strokeWidth={2.5} />
            </span>
          ))}
        </span>
        <span className="font-medium group-hover:underline">{total}</span>
      </button>
      {open && (
        <ReactorsModal
          postId={postId}
          onClose={() => setOpen(false)}
          byType={byType}
        />
      )}
    </>
  );
}
