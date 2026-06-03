import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export type Mention = {
  type: "user" | "company";
  id: string;
  name: string;
  href: string;
  avatarUrl: string | null;
};

/**
 * Mention typeahead for the post composer. GET /api/mentions?q=hugh returns up to
 * a handful of users + companies whose name matches, for tagging in a post.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ results: [] });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 1) return Response.json({ results: [] });

  const [users, companies] = await Promise.all([
    prisma.user.findMany({
      where: { name: { contains: q } },
      select: { id: true, name: true, avatarUrl: true },
      take: 6,
      orderBy: { name: "asc" },
    }),
    prisma.company.findMany({
      where: { name: { contains: q } },
      select: { id: true, name: true, slug: true, logoUrl: true },
      take: 6,
      orderBy: { name: "asc" },
    }),
  ]);

  const results: Mention[] = [
    ...companies.map((c) => ({
      type: "company" as const,
      id: c.id,
      name: c.name,
      href: `/company/${c.slug}`,
      avatarUrl: c.logoUrl,
    })),
    ...users.map((u) => ({
      type: "user" as const,
      id: u.id,
      name: u.name,
      href: `/u/${u.id}`,
      avatarUrl: u.avatarUrl,
    })),
  ].slice(0, 8);

  return Response.json({ results });
}
