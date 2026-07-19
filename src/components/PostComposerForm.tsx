"use client";

import { useState } from "react";
import { createPostAction } from "@/app/actions/post";
import { Avatar } from "@/components/Avatar";
import { MediaUpload } from "@/components/MediaUpload";
import { PostTagPicker } from "@/components/PostTagPicker";

const selectCls =
  "rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700";

export type ComposerAuthor = {
  key: string; // "self" or a company id
  name: string;
  avatarUrl: string | null;
  rounded: "full" | "md";
  trade: string; // default trade slug from that identity's profile
  region: string; // default region (state code)
};
type LeafGroup = { category: string; leaves: { slug: string; label: string }[] };
type StateOption = { code: string; name: string };

/**
 * Feed post composer (client) that reflects the identity you're posting AS:
 * the avatar + name follow the "As …" selection, and Trade/Region default to
 * that identity's profile (still editable). Switching the author resets the
 * Trade/Region defaults so posting as a company tags the company's trade/region.
 */
export function PostComposerForm({
  authors,
  defaultOwnerKey,
  leafGroups,
  states,
}: {
  authors: ComposerAuthor[];
  defaultOwnerKey: string;
  leafGroups: LeafGroup[];
  states: StateOption[];
}) {
  const initial = authors.find((a) => a.key === defaultOwnerKey) ?? authors[0];
  const [ownerKey, setOwnerKey] = useState(initial.key);
  const [trade, setTrade] = useState(initial.trade);
  const [region, setRegion] = useState(initial.region);

  const selected = authors.find((a) => a.key === ownerKey) ?? authors[0];

  function onOwnerChange(key: string) {
    setOwnerKey(key);
    const a = authors.find((x) => x.key === key);
    if (a) {
      setTrade(a.trade);
      setRegion(a.region);
    }
  }

  return (
    <form
      action={createPostAction}
      className="rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex gap-3">
        <Avatar
          name={selected.name}
          src={selected.avatarUrl}
          size={40}
          rounded={selected.rounded}
        />
        <div className="min-w-0 flex-1">
          <textarea
            name="body"
            required
            rows={2}
            placeholder="Share an update, ask the trades a question…"
            className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          <div className="mt-2">
            <PostTagPicker />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {authors.length > 1 ? (
              <select
                name="owner"
                value={ownerKey}
                onChange={(e) => onOwnerChange(e.target.value)}
                className={selectCls}
              >
                {authors.map((a) => (
                  <option key={a.key} value={a.key}>
                    As {a.name}
                  </option>
                ))}
              </select>
            ) : (
              <input type="hidden" name="owner" value="self" />
            )}

            <select
              name="tradeTag"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              className={selectCls}
            >
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

            <select
              name="regionTag"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={selectCls}
            >
              <option value="">Region (optional)</option>
              {states.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="ml-auto rounded-md bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Post
            </button>
          </div>

          {/* Multiple photos/videos, drag to set the main one, click to preview. */}
          <div className="mt-3">
            <MediaUpload />
          </div>
        </div>
      </div>
    </form>
  );
}
