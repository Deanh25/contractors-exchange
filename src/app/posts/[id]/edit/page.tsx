import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getActingContext } from "@/lib/identity";
import { canManagePost } from "@/lib/posts";
import { updatePostAction } from "@/app/actions/post";
import { getLeafGroups } from "@/lib/categories";
import { usStates } from "@/lib/cities";
import { PostMediaInput } from "@/components/PostMediaInput";

const selectCls =
  "rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; back?: string }>;
}) {
  const { id } = await params;
  const { error, back: backRaw } = await searchParams;
  const user = await requireUser(`/posts/${id}/edit`);

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      body: true,
      tradeTag: true,
      regionTag: true,
      imageUrl: true,
      authorUserId: true,
      authorCompanyId: true,
      authorCompany: { select: { slug: true } },
    },
  });
  if (!post) notFound();

  // Authorize, identity-strict: the acting identity must BE the post's author.
  // Editing a company's post means switching to the company first, so the same
  // rule holds here, in the feed's owner menu and in the service.
  const ctx = await getActingContext(user.id);
  const acting: { type: "user" | "company"; id: string } =
    ctx.type === "company"
      ? { type: "company", id: ctx.company.id }
      : { type: "user", id: user.id };
  if (!canManagePost(post, acting)) redirect("/feed");

  const back =
    backRaw && backRaw.startsWith("/") && !backRaw.startsWith("//")
      ? backRaw
      : post.authorCompanyId
        ? `/company/${post.authorCompany?.slug}?tab=posts`
        : "/me?tab=posts";

  const [leafGroups, states] = [await getLeafGroups(), usStates()];

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit post</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update the text, photo/video, trade, or region.
        </p>

        {error === "empty" && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            A post can&apos;t be empty.
          </p>
        )}

        <form action={updatePostAction} className="mt-6 space-y-4">
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="back" value={back} />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Photo / video <span className="text-slate-400">(optional)</span>
            </label>
            <PostMediaInput current={post.imageUrl} />
          </div>

          <textarea
            name="body"
            required
            rows={5}
            defaultValue={post.body}
            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          <div className="flex flex-wrap gap-2">
            <select name="tradeTag" defaultValue={post.tradeTag ?? ""} className={selectCls}>
              <option value="">Trade (optional)</option>
              {leafGroups.map((group) => (
                <optgroup key={group.category} label={group.category}>
                  {group.leaves.map((l) => (
                    <option key={l.slug} value={l.slug}>
                      {l.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <select name="regionTag" defaultValue={post.regionTag ?? ""} className={selectCls}>
              <option value="">Region (optional)</option>
              {states.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Save changes
            </button>
            <Link
              href={back}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
