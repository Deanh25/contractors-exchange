import { prisma } from "@/lib/prisma";
import { PostCard } from "@/components/PostCard";
import { authorInclude } from "@/lib/posts";
import { getPostEngagement } from "@/lib/engagement";
import type { Party } from "@/lib/messaging";

/**
 * Posts tab: the feed of posts authored by this profile (user or company),
 * reusing the feed's PostCard + engagement so reactions/comments work exactly
 * like the main feed. Self-contained: given the author and the viewer's acting
 * party, it queries + renders.
 */
export async function ProfilePosts({
  author,
  viewerParty,
  canReact,
  canComment,
}: {
  author: { userId: string } | { companyId: string };
  viewerParty: Party | null;
  canReact: boolean;
  canComment: boolean;
}) {
  const where =
    "userId" in author
      ? { authorUserId: author.userId }
      : { authorCompanyId: author.companyId };

  const posts = await prisma.post.findMany({
    where,
    include: authorInclude,
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
        No posts yet.
      </div>
    );
  }

  const engagement = await getPostEngagement(
    posts.map((p) => p.id),
    viewerParty,
  );

  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          engagement={engagement.get(p.id)}
          canReact={canReact}
          canComment={canComment}
        />
      ))}
    </div>
  );
}
