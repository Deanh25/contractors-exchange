import { requireUser } from "@/lib/auth";
import { ThreadList, parseFolder } from "@/components/messages/ThreadList";

/**
 * Messenger split shell (Round 1). On desktop the thread list sits beside the
 * conversation; with no thread chosen the right pane is a placeholder. On phones
 * this is just the inbox, and tapping a row opens /messages/[id] full screen -
 * the original inbox-then-conversation flow, unchanged.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; q?: string }>;
}) {
  const user = await requireUser("/messages");
  const sp = await searchParams;
  const folder = parseFolder(sp.folder);
  const q = (sp.q ?? "").trim();

  return (
    <main className="flex-1">
      <div className="mx-auto h-[calc(100vh-3.5rem)] max-w-7xl px-0 sm:px-4">
        <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-none border-slate-200 bg-white sm:rounded-xl sm:border lg:grid-cols-[340px_1fr]">
          <ThreadList userId={user.id} folder={folder} q={q} />

          {/* Desktop-only placeholder until a conversation is opened. */}
          <div className="hidden place-items-center p-10 text-center lg:grid">
            <div>
              <p className="text-3xl" aria-hidden>
                💬
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                Select a conversation
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Pick a thread on the left to read and reply.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
