import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getActingContext } from "@/lib/identity";
import { authorInclude } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { CommentThread } from "@/components/CommentThread";
import { getPostEngagement, getPostComments } from "@/lib/engagement";
import type { Party } from "@/lib/messaging";

/**
 * Post detail (PRD §4): a single discussion with its reactions and full comment
 * thread. The share/deep-link target and where comments are composed.
 */
export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, viewer] = await Promise.all([
    prisma.post.findUnique({ where: { id }, include: authorInclude }),
    getCurrentUser(),
  ]);
  if (!post) notFound();

  let viewerParty: Party | null = null;
  let actingLabel: string | null = null;
  if (viewer) {
    const ctx = await getActingContext(viewer.id);
    if (ctx.type === "company") {
      viewerParty = { type: "company", id: ctx.company.id };
      actingLabel = ctx.company.name;
    } else {
      viewerParty = { type: "user", id: viewer.id };
    }
  }

  const [engMap, comments] = await Promise.all([
    getPostEngagement([id], viewerParty),
    getPostComments(id),
  ]);

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link href="/feed" className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to feed
        </Link>
        <div className="mt-4">
          <PostCard post={post} engagement={engMap.get(id)} canReact={!!viewer} />
        </div>
        <CommentThread
          postId={id}
          comments={comments}
          canComment={!!viewer}
          actingLabel={actingLabel}
        />
      </div>
    </main>
  );
}
