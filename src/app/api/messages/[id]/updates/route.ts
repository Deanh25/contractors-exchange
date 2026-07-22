import { resolveActor } from "@/lib/identity";
import { getThreadUpdates } from "@/lib/services/messages";

/**
 * Live-conversation poll (messenger Round 2).
 * GET /api/messages/<threadId>/updates?since=<ISO>
 *
 * Thin transport shim: resolve the actor, call the service, serialize. All the
 * authorization and query logic lives in src/lib/services/messages.ts so a
 * mobile client can poll the same service. Dates go out as ISO strings and the
 * client uses `now` as its next cursor, so a clock skew between server and
 * browser can never skip or repeat a message.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await resolveActor(`/messages/${id}`);

  const raw = new URL(request.url).searchParams.get("since");
  const parsed = raw ? new Date(raw) : null;
  const since = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

  const r = await getThreadUpdates(actor, { threadId: id, since });
  if (r.status === "error") {
    return Response.json(
      { error: r.code },
      { status: r.code === "no_thread" ? 404 : 403 },
    );
  }

  const { messages, reactions, otherLastReadAt, otherTyping, now } = r.updates;
  return Response.json(
    {
      messages: messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
      reactions,
      otherLastReadAt: otherLastReadAt?.toISOString() ?? null,
      otherTyping,
      now: now.toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
