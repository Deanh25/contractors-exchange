import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { otherParticipant } from "@/lib/messaging";
import { timeAgo } from "@/lib/time";

export default async function MessagesPage() {
  const user = await requireUser("/messages");

  const threads = await prisma.thread.findMany({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    include: {
      userA: true,
      userB: true,
      listing: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Messages
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your 1:1 conversations. Keep deals on-platform for buyer protection.
        </p>

        {threads.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            No conversations yet. Start one from a listing&apos;s{" "}
            <span className="font-medium">Message seller</span> button or a
            profile&apos;s <span className="font-medium">Contact</span> button.
          </div>
        ) : (
          <ul className="mt-6 space-y-2">
            {threads.map((t) => {
              const other = otherParticipant(user.id, t.userA, t.userB);
              const last = t.messages[0];
              const preview = last
                ? `${last.senderId === user.id ? "You: " : ""}${last.body || "📷 Photo"}`
                : "No messages yet";
              return (
                <li key={t.id}>
                  <Link
                    href={`/messages/${t.id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
                  >
                    <Avatar name={other.name} src={other.avatarUrl} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-slate-900">
                          {other.name}
                        </p>
                        <span className="shrink-0 text-xs text-slate-400">
                          {timeAgo(t.updatedAt)}
                        </span>
                      </div>
                      {t.listing && (
                        <p className="truncate text-xs text-brand-700">
                          Re: {t.listing.title}
                        </p>
                      )}
                      <p className="truncate text-sm text-slate-500">{preview}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
