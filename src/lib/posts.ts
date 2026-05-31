import type { Post, User, Company } from "@/generated/prisma/client";

/** A post with its polymorphic author relations included. */
export type PostWithAuthor = Post & {
  authorUser: User | null;
  authorCompany: Company | null;
};

export type PostAuthor = {
  kind: "user" | "company";
  id: string;
  name: string;
  href: string;
  avatarUrl: string | null;
  verified: boolean;
};

/** Resolve the polymorphic author (User or Company) into a uniform shape. */
export function postAuthor(post: PostWithAuthor): PostAuthor | null {
  if (post.authorCompany) {
    const c = post.authorCompany;
    return {
      kind: "company",
      id: c.id,
      name: c.name,
      href: `/company/${c.slug}`,
      avatarUrl: c.logoUrl,
      verified: c.verified,
    };
  }
  if (post.authorUser) {
    const u = post.authorUser;
    return {
      kind: "user",
      id: u.id,
      name: u.name,
      href: `/u/${u.id}`,
      avatarUrl: u.avatarUrl,
      verified: u.verified,
    };
  }
  return null;
}

/** The standard author include for post queries. */
export const authorInclude = { authorUser: true, authorCompany: true } as const;
