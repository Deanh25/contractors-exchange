"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { loadPostCommentsAction } from "@/app/actions/engagement";
import { CommentNode } from "./CommentNode";
import { CommentComposer } from "./CommentComposer";
import type { CommentNode as Node } from "@/lib/engagement";

/**
 * The inline comment thread. Mounted only when a post's comments are expanded,
 * so the feed never loads comments up front: it fetches the forest on mount
 * (loadPostCommentsAction) and re-fetches after any add/like to refresh in place.
 */
export function CommentSection({
  postId,
  canComment,
  actingLabel,
}: {
  postId: string;
  canComment: boolean;
  actingLabel?: string | null;
}) {
  const [tree, setTree] = useState<Node[] | null>(null);
  const [, start] = useTransition();

  const reload = useCallback(() => {
    start(async () => {
      setTree(await loadPostCommentsAction(postId));
    });
  }, [postId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      {canComment ? (
        <CommentComposer
          postId={postId}
          actingLabel={actingLabel}
          onPosted={reload}
        />
      ) : (
        <p className="text-xs text-slate-500">
          <Link
            href={`/signin?next=/posts/${postId}`}
            className="font-medium text-brand-700 underline"
          >
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      <div className="mt-4 space-y-4">
        {tree === null ? (
          <p className="text-sm text-slate-400">Loading comments...</p>
        ) : tree.length === 0 ? (
          <p className="text-sm text-slate-400">
            No comments yet. Start the conversation.
          </p>
        ) : (
          tree.map((n) => (
            <CommentNode
              key={n.id}
              node={n}
              postId={postId}
              canComment={canComment}
              actingLabel={actingLabel}
              onChanged={reload}
            />
          ))
        )}
      </div>
    </div>
  );
}
