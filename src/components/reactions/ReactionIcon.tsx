import type { ComponentType } from "react";
import { ThumbsUp, Lightbulb, Award, CheckSquare, type LucideProps } from "lucide-react";
import type { ReactionIconName } from "@/lib/reactions";

/**
 * Resolves a reaction's Lucide icon name to its component. Pure SVG (no hooks),
 * so it renders in both server and client components. Used by the summary
 * cluster, the picker pills, and the "who reacted" modal so the icon set stays
 * consistent everywhere a reaction appears.
 */
const ICONS: Record<ReactionIconName, ComponentType<LucideProps>> = {
  ThumbsUp,
  Lightbulb,
  Award,
  CheckSquare,
};

export function ReactionIcon({
  icon,
  ...props
}: { icon: ReactionIconName } & LucideProps) {
  const Cmp = ICONS[icon];
  return <Cmp {...props} />;
}
