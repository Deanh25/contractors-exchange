"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { REACTIONS, REACTION_META } from "@/lib/reactions";
import { ReactionIcon } from "./ReactionIcon";
import { getPostReactorsAction } from "@/app/actions/engagement";
import type { ReactionType } from "@/generated/prisma/client";
import type { Reactor } from "@/lib/engagement";

/**
 * "Who reacted" dialog (LinkedIn-style). Counts/tabs come from the byType the
 * feed already computed, so they render instantly; the reactor LIST is fetched
 * lazily on open (getPostReactorsAction) so the feed never pays for it.
 */
export function ReactorsModal({
  postId,
  onClose,
  byType,
}: {
  postId: string;
  onClose: () => void;
  byType: Partial<Record<ReactionType, number>>;
}) {
  const [reactors, setReactors] = useState<Reactor[] | null>(null);
  const [tab, setTab] = useState<"all" | ReactionType>("all");
  const [pending, start] = useTransition();

  // Mounted only while open, so the reactor list loads once on open.
  useEffect(() => {
    start(async () => {
      const res = await getPostReactorsAction(postId);
      setReactors(res.reactors);
    });
  }, [postId]);

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const present = REACTIONS.filter((r) => byType[r.type]);
  const total = present.reduce((s, r) => s + (byType[r.type] ?? 0), 0);
  const shown = (reactors ?? []).filter((x) => tab === "all" || x.type === tab);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Reactions"
    >
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Reactions</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 py-2">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              tab === "all"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All {total}
          </button>
          {present.map((r) => (
            <button
              key={r.type}
              type="button"
              onClick={() => setTab(r.type)}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                tab === r.type
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ReactionIcon
                icon={r.icon}
                size={14}
                strokeWidth={2.5}
                style={{ color: tab === r.type ? "#fff" : r.color }}
              />
              {byType[r.type]}
            </button>
          ))}
        </div>

        <div className="min-h-[6rem] flex-1 overflow-y-auto p-2">
          {pending && reactors === null ? (
            <p className="p-6 text-center text-sm text-slate-400">Loading...</p>
          ) : shown.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">No reactions yet.</p>
          ) : (
            shown.map((x, i) => {
              const m = REACTION_META[x.type];
              return (
                <Link
                  key={`${x.party.href}-${i}`}
                  href={x.party.href}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
                >
                  <div className="relative shrink-0">
                    <Avatar
                      name={x.party.name}
                      src={x.party.avatar}
                      size={36}
                      rounded={x.party.kind === "company" ? "md" : "full"}
                    />
                    <span
                      className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-white ring-1 ring-slate-200"
                      style={{ color: m.color }}
                    >
                      <ReactionIcon icon={m.icon} size={11} strokeWidth={2.5} />
                    </span>
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                    {x.party.name}
                  </span>
                  {x.isViewer && (
                    <span className="text-xs text-slate-400">You</span>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
