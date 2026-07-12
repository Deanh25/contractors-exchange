import { getLeafGroups } from "@/lib/categories";
import { usStates } from "@/lib/cities";
import { PostComposerForm, type ComposerAuthor } from "@/components/PostComposerForm";

/**
 * Server wrapper for the feed post composer: fetches the trade taxonomy + states
 * and assembles the "authors" the viewer may post as (self + companies), each
 * with its avatar + default trade/region. The interactive form is the client
 * component PostComposerForm, which reflects the selected identity live.
 */
export async function PostComposer({
  userName,
  userAvatarUrl,
  userTrade,
  userRegion,
  companies,
  defaultOwner = "self",
}: {
  userName: string;
  userAvatarUrl: string | null;
  userTrade: string;
  userRegion: string;
  companies: {
    id: string;
    name: string;
    logoUrl: string | null;
    trade: string;
    region: string;
  }[];
  /** Pre-selects the "As ..." author from the acting-as context. */
  defaultOwner?: string;
}) {
  const [leafGroups, states] = [await getLeafGroups(), usStates()];

  const authors: ComposerAuthor[] = [
    {
      key: "self",
      name: userName,
      avatarUrl: userAvatarUrl,
      rounded: "full",
      trade: userTrade,
      region: userRegion,
    },
    ...companies.map((c) => ({
      key: c.id,
      name: c.name,
      avatarUrl: c.logoUrl,
      rounded: "md" as const,
      trade: c.trade,
      region: c.region,
    })),
  ];

  const defaultOwnerKey = authors.some((a) => a.key === defaultOwner)
    ? defaultOwner
    : "self";

  return (
    <PostComposerForm
      authors={authors}
      defaultOwnerKey={defaultOwnerKey}
      leafGroups={leafGroups}
      states={states}
    />
  );
}
