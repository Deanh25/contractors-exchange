import type { Post, User, Company } from "@/generated/prisma/client";

type PostTagRel = { taggedUser: User | null; taggedCompany: Company | null };

/** A post with its polymorphic author + tagged parties included. */
export type PostWithAuthor = Post & {
  authorUser: User | null;
  authorCompany: Company | null;
  tags?: PostTagRel[];
};

export type TagDisplay = {
  name: string;
  href: string;
  kind: "user" | "company";
};

/** Resolve a post's tagged parties (users/companies) into uniform chips. */
export function postTags(post: PostWithAuthor): TagDisplay[] {
  return (post.tags ?? [])
    .map((t): TagDisplay | null => {
      if (t.taggedCompany)
        return {
          name: t.taggedCompany.name,
          href: `/company/${t.taggedCompany.slug}`,
          kind: "company",
        };
      if (t.taggedUser)
        return {
          name: t.taggedUser.name,
          href: `/u/${t.taggedUser.id}`,
          kind: "user",
        };
      return null;
    })
    .filter((t): t is TagDisplay => t !== null);
}

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

/** The standard author (+ tags) include for post queries. */
export const authorInclude = {
  authorUser: true,
  authorCompany: true,
  tags: { include: { taggedUser: true, taggedCompany: true } },
} as const;
