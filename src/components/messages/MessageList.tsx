import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { isVideoUrl } from "@/lib/listings";
import { clockTime, dayLabel, formatDateTime } from "@/lib/time";
import type { ChatItem } from "@/lib/chat";

/**
 * The conversation body: day dividers, centered deal-event chips, and
 * consecutive messages grouped under one avatar with a single timestamp.
 * Presentation only - the grouping model is built by groupThreadMessages()
 * (src/lib/chat.ts), on the server for the first paint and on the client for
 * messages that arrive by polling.
 */
/**
 * The other side is composing. Sits where their next bubble will appear, with
 * the same three-dot rhythm Messenger uses. Announced politely so a screen
 * reader mentions it once without interrupting.
 */
function TypingBubble() {
  return (
    <div className="mt-2 flex items-end gap-2">
      <span className="w-[26px] flex-none" aria-hidden />
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5"
      >
        <span className="sr-only">Typing…</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function MessageList({
  items,
  otherLastReadAt,
  typing = false,
}: {
  items: ChatItem[];
  /** The other side's read cursor, for the "Seen" receipt on my last message. */
  otherLastReadAt: Date | null;
  /** Round 2: the other side is typing right now. */
  typing?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="px-4 py-3">
        <p className="py-10 text-center text-sm text-slate-400">
          No messages yet. Say hello.
        </p>
        {typing && <TypingBubble />}
      </div>
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
                    {m.imageUrl &&
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
                  {failed && (
                    <p className="mt-0.5 text-right text-[10.5px] font-medium text-rose-600">
                      Not sent. Check your connection and send it again.
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

      {typing && <TypingBubble />}
    </div>
  );
}
