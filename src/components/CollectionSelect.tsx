"use client";

import { useRef } from "react";
import { setSaveCollectionAction } from "@/app/actions/saved";

/** Per-card dropdown to file a saved listing into a collection. Auto-submits
 * on change so there is no separate save step. */
export function CollectionSelect({
  listingId,
  value,
  collections,
}: {
  listingId: string;
  value: string;
  collections: { id: string; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={setSaveCollectionAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="path" value="/saved" />
      <select
        name="collectionId"
        defaultValue={value}
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Move to collection"
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        <option value="">Uncategorized</option>
        {collections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </form>
  );
}
