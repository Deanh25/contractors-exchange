"use client";

import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { formatBytes } from "@/lib/chat";

/**
 * Multi-file picker for the conversation composer (Round 3): several photos or
 * videos AND documents (a spec PDF, a quote, a takeoff) in one message.
 *
 * Deliberately NOT the listing/feed `MediaUpload`: that picker is built around
 * drag-to-reorder because order there means "which photo is the cover". In a
 * conversation order carries no meaning and documents are first-class, so this
 * is a lighter picker with previews and a remove button per file.
 *
 * Files are submitted as `attachments` and kept in sync via DataTransfer, so
 * removing one on screen also removes it from what gets sent.
 */

const ACCEPT = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
].join(",");

type Picked = {
  id: string;
  file: File;
  /** Object URL for images/videos; null for documents. */
  preview: string | null;
  isVideo: boolean;
  isFile: boolean;
};

export function AttachmentPicker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const [items, setItems] = useState<Picked[]>([]);

  /** Keep the input's FileList matching what's on screen. */
  function sync(next: Picked[]) {
    const input = inputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    for (const it of next) dt.items.add(it.file);
    input.files = dt.files;
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    const next = [
      ...items,
      ...picked.map((file) => {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        return {
          id: `a${idRef.current++}`,
          file,
          preview: isImage || isVideo ? URL.createObjectURL(file) : null,
          isVideo,
          isFile: !isImage && !isVideo,
        };
      }),
    ];
    setItems(next);
    sync(next);
  }

  function remove(id: string) {
    const gone = items.find((i) => i.id === id);
    if (gone?.preview) URL.revokeObjectURL(gone.preview);
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    sync(next);
  }

  return (
    <div className="flex items-end gap-2">
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((it) => (
            <li key={it.id} className="relative">
              {it.isFile ? (
                <div className="flex h-16 w-36 flex-col justify-center rounded-md border border-slate-200 bg-slate-50 px-2">
                  <span className="truncate text-[11px] font-semibold text-slate-700">
                    {it.file.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatBytes(it.file.size)}
                  </span>
                </div>
              ) : (
                <div className="h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                  {it.isVideo ? (
                    <video
                      src={it.preview ?? undefined}
                      muted
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.preview ?? undefined}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(it.id)}
                aria-label={`Remove ${it.file.name}`}
                className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X size={11} strokeWidth={3} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label
        className="cursor-pointer rounded-xl border border-slate-300 px-2.5 py-2 text-slate-600 hover:bg-slate-50"
        title="Attach photos, videos, or documents"
      >
        <Paperclip size={16} aria-hidden />
        <span className="sr-only">Attach files</span>
        <input
          ref={inputRef}
          name="attachments"
          type="file"
          multiple
          accept={ACCEPT}
          onChange={onChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
