import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PostCard } from "@/components/PostCard";
import { authorInclude } from "@/lib/posts";
import { deletePostAction } from "@/app/actions/post";

/**
 * Workspace "Posts" management: lists the owner's own posts (user or company)
 * with Edit + Delete controls and a "Write a post" button to the Feed composer.
 * Read-only display via PostCard (no engagement bar); management-only surface.
 */
export async function WorkspacePosts({
  author,
  backPath,
}: {
  author: { userId: string } | { companyId: string };
  backPath: string;
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
            <div key={p.id}>
              <PostCard post={p} />
              <div className="mt-1 flex items-center gap-3 pl-1 text-sm">
                <Link
                  href={`/posts/${p.id}/edit?back=${encodeURIComponent(backPath)}`}
                  className="font-medium text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Edit
                </Link>
                <details>
                  <summary className="cursor-pointer list-none font-medium text-red-600 hover:underline">
                    Delete
                  </summary>
                  <form
                    action={deletePostAction}
                    className="mt-1 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2"
                  >
                    <input type="hidden" name="postId" value={p.id} />
                    <input type="hidden" name="back" value={backPath} />
                    <span className="text-xs text-red-700">Delete this post?</span>
                    <button
                      type="submit"
                      className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      Yes, delete
                    </button>
                  </form>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
