"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { isVideoUrl } from "@/lib/listings";

const ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

/**
 * Media picker with live previews, drag-to-reorder, and a click-to-preview
 * lightbox. Order IS the meaning: the first item is the listing's main/cover
 * photo, so the seller drags to choose it (PRD §8). Existing media (edit form)
 * and newly picked files live in ONE ordered list; on submit we send:
 *   - `photos`     : the new File(s), kept in the on-screen order via DataTransfer
 *   - `photoOrder` : a manifest of the full order ("e:<url>" existing | "n" new),
 *                    so the action rebuilds the array exactly as shown
 *   - `existingPhotos` : the kept URLs (a no-JS / manifest-absent fallback)
 * The action (orderedPhotos) walks the manifest, pulling new URLs in order.
 */

type Item =
  | { id: string; kind: "existing"; url: string; isVideo: boolean }
  | { id: string; kind: "new"; url: string; isVideo: boolean; file: File };

export function MediaUpload({ existing = [] }: { existing?: string[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const mkId = () => `m${idRef.current++}`;

  const [items, setItems] = useState<Item[]>(() =>
    existing.map((url, i) => ({
      id: `x${i}`,
      kind: "existing" as const,
      url,
      isVideo: isVideoUrl(url),
    })),
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Item | null>(null);

  /** Keep the file input's FileList in the new-item order, so the server saves
   *  them in exactly the order shown (and never stores an orphan). */
  function syncFileInput(next: Item[]) {
    const input = fileInputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    for (const it of next) if (it.kind === "new") dt.items.add(it.file);
    input.files = dt.files;
  }

  function commit(next: Item[]) {
    setItems(next);
    syncFileInput(next);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const added: Item[] = files.map((f) => ({
      id: mkId(),
      kind: "new",
      url: URL.createObjectURL(f),
      isVideo: f.type.startsWith("video/"),
      file: f,
    }));
    commit([...items, ...added]);
  }

  function remove(id: string) {
    const target = items.find((i) => i.id === id);
    if (target?.kind === "new") URL.revokeObjectURL(target.url);
    commit(items.filter((i) => i.id !== id));
  }

  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const from = items.findIndex((i) => i.id === fromId);
    const to = items.findIndex((i) => i.id === toId);
    if (from < 0 || to < 0) return;
    const next = items.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  }

  const manifest = JSON.stringify(
    items.map((i) => (i.kind === "existing" ? `e:${i.url}` : "n")),
  );

  return (
    <div>
      {/* Full order for the action, plus a kept-URL fallback if it's missing. */}
      <input type="hidden" name="photoOrder" value={manifest} />
      {items
        .filter((i) => i.kind === "existing")
        .map((i) => (
          <input key={i.id} type="hidden" name="existingPhotos" value={i.url} />
        ))}

      {items.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {items.map((it, idx) => (
            <div
              key={it.id}
              draggable
              onDragStart={() => setDragId(it.id)}
              onDragOver={(e) => {
                e.preventDefault();
                if (overId !== it.id) setOverId(it.id);
              }}
              onDragLeave={() => setOverId((o) => (o === it.id ? null : o))}
              onDrop={() => {
                if (dragId) reorder(dragId, it.id);
                setDragId(null);
                setOverId(null);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              className={`group relative h-20 w-20 cursor-grab overflow-hidden rounded-md border bg-slate-100 active:cursor-grabbing ${
                overId === it.id
                  ? "border-brand-500 ring-2 ring-brand-300"
                  : "border-slate-200"
              } ${dragId === it.id ? "opacity-40" : ""}`}
            >
              <button
                type="button"
                onClick={() => setPreview(it)}
                aria-label="Preview"
                className="block h-full w-full"
              >
                {it.isVideo ? (
                  <video src={it.url} muted className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt="" className="h-full w-full object-cover" />
                )}
              </button>

              {idx === 0 && (
                <span className="pointer-events-none absolute bottom-0.5 left-0.5 rounded bg-brand-500 px-1 text-[9px] font-semibold text-white">
                  Main
                </span>
              )}
              {it.isVideo && idx !== 0 && (
                <span className="pointer-events-none absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[9px] font-medium text-white">
                  ▶ video
                </span>
              )}
              {it.kind === "new" && (
                <span className="pointer-events-none absolute bottom-0.5 right-0.5 rounded bg-slate-900/70 px-1 text-[9px] font-medium text-white">
                  new
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(it.id)}
                aria-label="Remove media"
                className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
        <ImagePlus size={16} aria-hidden />
        Add photos or videos
        <input
          ref={fileInputRef}
          type="file"
          name="photos"
          multiple
          accept={ACCEPT}
          onChange={onPick}
          className="hidden"
        />
      </label>
      <p className="mt-1 text-xs text-slate-400">
        Drag to reorder, the first photo is the main/cover image. Click a thumbnail
        to preview. Images up to 8MB, videos up to 64MB.
      </p>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          {preview.isVideo ? (
            <video
              src={preview.url}
              controls
              autoPlay
              className="max-h-[85vh] max-w-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.url}
              alt=""
              className="max-h-[85vh] max-w-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <button
            type="button"
            onClick={() => setPreview(null)}
            aria-label="Close preview"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-lg text-white hover:bg-white/25"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
