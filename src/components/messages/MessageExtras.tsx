"use client";

import { useState } from "react";
import { CornerUpLeft, FileText, SmilePlus } from "lucide-react";
import {
  MESSAGE_EMOJI,
  formatBytes,
  isVideoAttachment,
  type ChatAttachment,
  type ChatReplyTo,
  type ReactionSummary,
} from "@/lib/chat";

/**
 * The Round 3 pieces that hang off a message bubble: the quoted message above
 * it, its attachments, its reaction pills, and the hover actions (react, reply).
 * Presentation only; the conversation owns the state and the server calls.
 */

/** The quoted message shown above a reply. */
export function ReplyQuote({
  replyTo,
  own,
}: {
  replyTo: ChatReplyTo;
  own: boolean;
}) {
  return (
    <div
      className={`mb-1 border-l-2 pl-2 text-[11.5px] leading-snug ${
        own ? "border-white/50 text-white/85" : "border-slate-300 text-slate-500"
      }`}
    >
      <span className="font-semibold">{replyTo.author}</span>
      <span className="ml-1 line-clamp-2">{replyTo.excerpt}</span>
    </div>
  );
}

/** Photos, videos, and documents carried by a message. */
export function Attachments({
  attachments,
  own,
}: {
  attachments: ChatAttachment[];
  own: boolean;
}) {
  const visuals = attachments.filter((a) => a.kind !== "file");
  const files = attachments.filter((a) => a.kind === "file");

  return (
    <div className="mb-1 flex flex-col gap-1.5">
      {visuals.length > 0 && (
        <div
          className={`grid gap-1 ${visuals.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {visuals.map((a) =>
            isVideoAttachment(a) ? (
              <video
                key={a.url}
                src={a.url}
                controls
                className="max-h-64 rounded-lg object-contain"
              />
            ) : (
              <a key={a.url} href={a.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.url}
                  alt={a.name}
                  className="max-h-64 w-full rounded-lg object-cover"
                />
              </a>
            ),
          )}
        </div>
      )}

      {files.map((a) => (
        <a
          key={a.url}
          href={a.url}
          target="_blank"
          rel="noreferrer"
          download={a.name}
          className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition ${
            own
              ? "border-white/30 bg-white/15 hover:bg-white/25"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <FileText
            size={22}
            className={own ? "text-white/90" : "text-brand-600"}
            aria-hidden
          />
          <span className="min-w-0">
            <span
              className={`block truncate text-[12.5px] font-semibold ${
                own ? "text-white" : "text-slate-800"
              }`}
            >
              {a.name}
            </span>
            <span
              className={`block text-[11px] ${own ? "text-white/75" : "text-slate-500"}`}
            >
              {formatBytes(a.size)}
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}

/** Reaction pills under a bubble. Clicking yours clears it. */
export function ReactionPills({
  summaries,
  onToggle,
  own,
}: {
  summaries: ReactionSummary[];
  onToggle: (emoji: string) => void;
  own: boolean;
}) {
  if (summaries.length === 0) return null;
  return (
    <div className={`-mt-1 flex flex-wrap gap-1 ${own ? "justify-end" : ""}`}>
      {summaries.map((s) => (
        <button
          key={s.emoji}
          type="button"
          onClick={() => onToggle(s.emoji)}
          title={s.names.join(", ")}
          aria-pressed={s.mine}
          className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition ${
            s.mine
              ? "border-brand-300 bg-brand-50 text-brand-800"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span aria-hidden>{s.emoji}</span>
          {s.count > 1 && <span className="font-semibold">{s.count}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * Hover actions beside a bubble: react (opens the emoji shortlist) and reply.
 * Kept keyboard-reachable - focus within the group reveals them too.
 */
export function MessageActions({
  own,
  onReact,
  onReply,
}: {
  own: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`absolute top-1/2 flex -translate-y-1/2 items-center gap-0.5 ${
        own ? "right-full mr-8" : "left-full ml-8"
      }`}
    >
      <div
        className={`flex items-center gap-0.5 transition-opacity ${
          open
            ? "opacity-100"
            : "opacity-0 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="React to this message"
          aria-expanded={open}
          className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <SmilePlus size={15} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onReply}
          aria-label="Reply to this message"
          className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <CornerUpLeft size={15} aria-hidden />
        </button>
      </div>

      {open && (
        <div
          className="absolute bottom-full z-10 mb-1 flex gap-0.5 rounded-full border border-slate-200 bg-white p-1 shadow-lg"
          role="group"
          aria-label="Pick a reaction"
        >
          {MESSAGE_EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReact(emoji);
                setOpen(false);
              }}
              aria-label={`React with ${emoji}`}
              className="grid h-7 w-7 place-items-center rounded-full text-base transition hover:scale-125 hover:bg-slate-100"
            >
              <span aria-hidden>{emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
