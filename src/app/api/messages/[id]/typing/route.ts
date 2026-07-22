import { resolveActor } from "@/lib/identity";
import { setTyping } from "@/lib/services/messages";

/**
 * Typing ping (messenger Round 2). POST /api/messages/<threadId>/typing
 *
 * Thin transport shim over setTyping(). The client throttles these to roughly
 * one every few seconds while someone is actually typing; the stamp expires by
 * itself, so there is no "stopped typing" call to make.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const actor = await resolveActor(`/messages/${id}`);
  const { ok } = await setTyping(actor, id);
  return Response.json({ ok }, { status: ok ? 200 : 403 });
}
