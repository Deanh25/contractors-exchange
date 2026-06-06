import type { ReactionType } from "@/generated/prisma/client";

/**
 * Reaction metadata - the single source of truth shared by server reads and the
 * client reaction controls. lucide-react is CX's standard icon library; each
 * reaction has a Lucide icon name + a brand-aligned accent color (used for the
 * icon stroke, the selected pill border, and a low-opacity background tint).
 *
 * This module is client-safe (no "server-only"): both the RSC summary cluster
 * and the "use client" picker/modal import from here.
 */

export type ReactionIconName = "ThumbsUp" | "Lightbulb" | "Award" | "CheckSquare";

export type ReactionMeta = {
  type: ReactionType;
  label: string;
  icon: ReactionIconName;
  color: string; // hex accent
};

export const REACTIONS: ReactionMeta[] = [
  { type: "like", label: "Like", icon: "ThumbsUp", color: "#F7941E" },
  { type: "insightful", label: "Insightful", icon: "Lightbulb", color: "#E8A317" },
  { type: "respect", label: "Respect", icon: "Award", color: "#2E8B6F" },
  { type: "helpful", label: "Helpful", icon: "CheckSquare", color: "#3B7DD8" },
];

export const REACTION_META = Object.fromEntries(
  REACTIONS.map((r) => [r.type, r]),
) as Record<ReactionType, ReactionMeta>;
