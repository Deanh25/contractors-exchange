"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { loadPostCommentsAction } from "@/app/actions/engagement";
import { CommentNode } from "./CommentNode";
import { CommentComposer } from "./CommentComposer";
import type { CommentNode as Node } from "@/lib/engagement";

// Show a handful of top-level comments at first, then reveal more in batches, so
// a busy thread doesn't take over the page (LinkedIn-style "Load more comments").
const INITIAL_VISIBLE = 3;
const LOAD_STEP = 10;

type Sort = "relevant" | "recent";

const SORT_OPTIONS: { key: Sort; label: string; desc: string }[] = [
  { key: "relevant", label: "Most relevant", desc: "See the most relevant comments" },
  { key: "recent", label: "Most recent", desc: "See all comments, newest first" },
];

/** Top-level comments in the chosen order: engagement-first, or newest-first. */
function sortRoots(roots: Node[], sort: Sort): Node[] {
  const byNewest = (a: Node, b: Node) =>
    +new Date(b.createdAt) - +new Date(a.createdAt);
  if (sort === "recent") return [...roots].sort(byNewest);
  // "Most relevant": reactions + direct replies, then newest as the tiebreak.
  const score = (n: Node) => n.reactions.total + n.replies.length;
  return [...roots].sort((a, b) => score(b) - score(a) || byNewest(a, b));
}

/**
 * The inline comment thread. Mounted only when a post's comments are expanded,
 * so the feed never loads comments up front: it fetches the forest on mount
 * (loadPostCommentsAction) and re-fetches after any add/like to refresh in place.
 * Top-level comments are paginated client-side; replies stay nested under theirs.
 */
export function CommentSection({
  postId,
  canComment,
  actingLabel,
  allowModeration = true,
}: {
  postId: string;
  canComment: boolean;
  actingLabel?: string | null;
  /** Show the post owner's moderation delete. Off on read-only public profiles. */
  allowModeration?: boolean;
}) {
  const [tree, setTree] = useState<Node[] | null>(null);
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const [sort, setSort] = useState<Sort>("relevant");
  const [, start] = useTransition();

  const reload = useCallback(() => {
    start(async () => {
      setTree(await loadPostCommentsAction(postId, allowModeration));
    });
  }, [postId, allowModeration]);

  useEffect(() => {
    reload();
  }, [reload]);

  // A new comment lands at the end of the thread, so reveal everything after a
  // post; reactions/edits/deletes just reload and keep the current window.
  const onPosted = useCallback(() => {
    setVisible(Number.MAX_SAFE_INTEGER);
    reload();
  }, [reload]);

  const roots = tree ?? [];
  const sortedRoots = useMemo(() => sortRoots(roots, sort), [roots, sort]);
  const shown = sortedRoots.slice(0, visible);
  const remaining = sortedRoots.length - shown.length;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      {canComment ? (
        <CommentComposer
          postId={postId}
          actingLabel={actingLabel}
          onPosted={onPosted}
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

      {sortedRoots.length > 0 && (
        <div className="mt-3 flex justify-end">
          <SortMenu sort={sort} onChange={setSort} />
        </div>
      )}

      <div className="mt-4 space-y-4">
        {tree === null ? (
          <p className="text-sm text-slate-400">Loading comments...</p>
        ) : roots.length === 0 ? (
          <p className="text-sm text-slate-400">
            No comments yet. Start the conversation.
          </p>
        ) : (
          <>
            {shown.map((n) => (
              <CommentNode
                key={n.id}
                node={n}
                postId={postId}
                canComment={canComment}
                actingLabel={actingLabel}
                onChanged={reload}
              />
            ))}
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => setVisible((v) => v + LOAD_STEP)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Load more comments ({remaining})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * LinkedIn-style comment sort menu ("Most relevant" / "Most recent"). Plain
 * <details> so a click outside or on the summary closes it; picking an option
 * sets the sort and closes the menu.
 */
function SortMenu({
  sort,
  onChange,
}: {
  sort: Sort;
  onChange: (s: Sort) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const current = SORT_OPTIONS.find((o) => o.key === sort) ?? SORT_OPTIONS[0];

  return (
    <details ref={ref} className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800">
        {current.label}
        <ChevronDown size={14} strokeWidth={2.5} />
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
        {SORT_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => {
              onChange(o.key);
              if (ref.current) ref.current.open = false;
            }}
            className={`block w-full rounded-md px-3 py-2 text-left hover:bg-slate-50 ${
              o.key === sort ? "bg-slate-50" : ""
            }`}
          >
            <span className="block text-sm font-semibold text-slate-800">
              {o.label}
            </span>
            <span className="block text-xs text-slate-500">{o.desc}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
