import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PostCard } from "@/components/PostCard";
import { authorInclude } from "@/lib/posts";
import { getPostEngagement } from "@/lib/engagement";
import type { Party } from "@/lib/messaging";

/**
 * Workspace "Posts" management: lists the owner's own posts (user or company)
 * with a "Write a post" button to the Feed composer. Renders the full engagement
 * bar + comment threads (same as the Feed) so the owner can read and moderate the
 * conversation on their posts from here too. Edit/Delete live in PostCard's owner
 * menu, so the control is identical here and in the feed. Every post listed is by
 * definition the workspace owner's, so the menu always shows.
 */
export async function WorkspacePosts({
  author,
  backPath,
  viewerParty,
}: {
  author: { userId: string } | { companyId: string };
  backPath: string;
  viewerParty: Party | null;
}) {
  const where =
    "userId" in author
      ? { authorUserId: author.userId }
      : { authorCompanyId: author.companyId };

  const posts = await prisma.post.findMany({
    where,
    include: authorInclude,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const engagement = await getPostEngagement(
    posts.map((p) => p.id),
    viewerParty,
  );

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Your posts
        </h2>
        <Link
          href="/feed"
          className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          + Write a post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Nothing posted yet.{" "}
          <Link href="/feed" className="font-semibold text-slate-700 underline">
            Write your first post →
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              engagement={engagement.get(p.id)}
              canReact={!!viewerParty}
              canComment={!!viewerParty}
              canManage
              backPath={backPath}
            />
          ))}
        </div>
      )}
    </section>
  );
}
