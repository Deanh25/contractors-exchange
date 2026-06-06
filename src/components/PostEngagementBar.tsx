"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ReactionControl } from "@/components/reactions/ReactionControl";
import { ReactionSummary } from "@/components/reactions/ReactionSummary";
import { CommentSection } from "@/components/comments/CommentSection";
import type { PostEngagement } from "@/lib/engagement";

/**
 * Reaction + comment bar under a post (PRD §4), LinkedIn-style. The React button
 * reveals an animated reaction flyout; the summary cluster opens the "who
 * reacted" list; the Comment button (or the comment count) toggles the inline
 * thread, which lazy-loads its comments only when first opened. Client component
 * so it can own the expand state; the comment query never runs on feed render.
 */
export function PostEngagementBar({
  postId,
  engagement,
  canReact,
  canComment,
  actingLabel,
  initialOpen = false,
}: {
  postId: string;
  engagement: PostEngagement;
  canReact: boolean;
  canComment: boolean;
  actingLabel?: string | null;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);

  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      {(engagement.total > 0 || engagement.commentCount > 0) && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
          <ReactionSummary
            postId={postId}
            byType={engagement.byType}
            total={engagement.total}
          />
          {engagement.commentCount > 0 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="hover:underline"
            >
              {engagement.commentCount}{" "}
              {engagement.commentCount === 1 ? "comment" : "comments"}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {canReact ? (
          <ReactionControl postId={postId} current={engagement.viewerReaction} />
        ) : (
          <Link
            href="/signin?next=/feed"
            className="rounded-md px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            React
          </Link>
        )}

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          <MessageCircle size={18} strokeWidth={2} />
          Comment
        </button>
      </div>

      {open && (
        <CommentSection
          postId={postId}
          canComment={canComment}
          actingLabel={actingLabel}
        />
      )}
    </div>
  );
}
