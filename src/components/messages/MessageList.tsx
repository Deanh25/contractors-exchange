"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { isVideoUrl } from "@/lib/listings";
import { clockTime, dayLabel, formatDateTime } from "@/lib/time";
import { summarizeReactions, type ChatItem, type ChatReaction } from "@/lib/chat";
import type { ChatParty } from "@/lib/chat";
import {
  Attachments,
  MessageActions,
  ReactionPills,
  ReplyQuote,
} from "@/components/messages/MessageExtras";

/**
 * The conversation body: day dividers, centered deal-event chips, and
 * consecutive messages grouped under one avatar with a single timestamp.
 * Presentation only - the grouping model is built by groupThreadMessages()
 * (src/lib/chat.ts), on the server for the first paint and on the client for
 * messages that arrive by polling. The typing indicator is NOT here; it lives
 * pinned above the composer (see TypingIndicator, rendered by Conversation).
 */
export function MessageList({
  items,
  otherLastReadAt,
  reactions,
  myParty,
  onReact,
  onReply,
}: {
  items: ChatItem[];
  /** The other side's read cursor, for the "Seen" receipt on my last message. */
  otherLastReadAt: Date | null;
  /** Round 3: every reaction in the thread, keyed by message id. */
  reactions: Map<string, ChatReaction[]>;
  myParty: ChatParty;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (messageId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-16 text-center text-sm text-slate-400">
        No messages yet. Say hello.
      </p>
    );
  }

  // "Seen" sits under my most recent group, once the other side has read it.
  const last = items[items.length - 1];
  const showSeen =
    last?.type === "group" &&
    last.own &&
    !!otherLastReadAt &&
    otherLastReadAt.getTime() >= last.at.getTime();

  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 sm:px-5">
      {items.map((item) => {
        if (item.type === "day") {
          return (
            <div key={item.key} className="my-3 flex items-center gap-2.5">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-bold tracking-wide text-slate-400">
                {dayLabel(item.at)}
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          );
        }

        if (item.type === "event") {
          return (
            <p
              key={item.key}
              className="my-1.5 self-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-xs leading-snug text-slate-600"
            >
              {item.body}
            </p>
          );
        }

        const { own, sender, messages } = item;
        return (
          <div
            key={item.key}
            className={`mt-2 flex items-end gap-2 ${own ? "flex-row-reverse" : ""}`}
          >
            {own ? (
              <span className="w-[26px] flex-none" aria-hidden />
            ) : (
              <Link href={sender.href} className="flex-none">
                <Avatar
                  name={sender.name}
                  src={sender.avatarUrl}
                  size={26}
                  rounded={sender.kind === "company" ? "md" : "full"}
                />
              </Link>
            )}

            <div
              className={`flex max-w-[78%] flex-col gap-0.5 sm:max-w-[66%] ${
                own ? "items-end" : "items-start"
              }`}
            >
              {/* Company-sent: name the identity + the human who typed it. */}
              {!own && sender.kind === "company" && (
                <p className="px-1 text-[11px] font-medium text-slate-500">
                  {sender.name}
                  {sender.attribution && ` · ${sender.attribution}`}
                </p>
              )}

              {messages.map((m) => {
                const failed = m.pending === "failed";
                const mine = reactions.get(m.id) ?? [];
                const summaries = summarizeReactions(mine, myParty);
                // An in-flight message has no server id yet, so it can't carry
                // reactions or be replied to until it lands.
                const settled = !m.pending;
                return (
                // Each message carries its OWN time, revealed on hover beside the
                // bubble (Messenger-style) so a run of messages sent minutes
                // apart never looks like it was all sent at once. `title` adds
                // the full date for a longer hover / assistive tech.
                <div
                  key={m.id}
                  className={`group/msg relative ${
                    // In flight: visibly provisional, but still readable.
                    m.pending === "sending" ? "opacity-60" : ""
                  }`}
                >
                  <div
                    title={formatDateTime(m.createdAt)}
                    className={`rounded-2xl border px-3 py-2 text-sm leading-snug ${
                      failed
                        ? "border-rose-300 bg-rose-50 text-rose-900"
                        : own
                          ? "border-brand-500 bg-brand-500 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-800"
                    }`}
                  >
                    {m.replyTo && <ReplyQuote replyTo={m.replyTo} own={own} />}

                    {m.attachments.length > 0 && (
                      <Attachments attachments={m.attachments} own={own} />
                    )}

                    {/* Legacy single-image messages (pre-Round 3) and the
                        optimistic preview both still use imageUrl. Skipped once
                        the message carries real attachments, which include it. */}
                    {m.attachments.length === 0 &&
                      m.imageUrl &&
                      (isVideoUrl(m.imageUrl) ? (
                        <video
                          src={m.imageUrl}
                          controls
                          className="mb-1 max-h-64 rounded-lg object-contain"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.imageUrl}
                          alt=""
                          className="mb-1 max-h-64 rounded-lg object-cover"
                        />
                      ))}
                    {m.body && <p className="whitespace-pre-line">{m.body}</p>}
                  </div>
                  <span
                    className={`pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] text-slate-400 opacity-0 transition-opacity group-hover/msg:opacity-100 ${
                      own ? "right-full mr-2" : "left-full ml-2"
                    }`}
                  >
                    {clockTime(m.createdAt)}
                  </span>
                  {settled && (
                    <MessageActions
                      own={own}
                      onReact={(emoji) => onReact(m.id, emoji)}
                      onReply={() => onReply(m.id)}
                    />
                  )}
                  {summaries.length > 0 && (
                    <ReactionPills
                      summaries={summaries}
                      own={own}
                      onToggle={(emoji) => onReact(m.id, emoji)}
                    />
                  )}
                  {failed && (
                    <p className="mt-0.5 text-right text-[10.5px] font-medium text-rose-600">
                      {m.failedReason ??
                        "Not sent. Check your connection and send it again."}
                    </p>
                  )}
                </div>
                );
              })}

              <span className="px-1 text-[10.5px] text-slate-400">
                {clockTime(item.at)}
              </span>
            </div>
          </div>
        );
      })}

      {showSeen && (
        <p className="self-end px-1 pt-0.5 text-[10.5px] text-slate-400">Seen</p>
      )}
    </div>
  );
}
