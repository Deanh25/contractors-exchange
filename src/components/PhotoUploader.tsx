"use client";

import { useRef, useState } from "react";

const ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

type Pending = { file: File; url: string; isVideo: boolean };

/**
 * Portfolio uploader: a roomy picker that shows large previews of what you're
 * about to add, lets you remove individual items before submitting (rebuilding
 * the file input via DataTransfer), and keeps the submit disabled until at least
 * one file is chosen. `action` is the server action; `companyId` scopes it to a
 * company. Selecting more files APPENDS to the pending set.
 */
export function PhotoUploader({
  action,
  companyId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  companyId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Pending[]>([]);

  // Keep the real <input type=file> in sync with our state so the form submits
  // exactly the pending items (FileList is immutable, so rebuild via DataTransfer).
  function syncInput(next: Pending[]) {
    const dt = new DataTransfer();
    next.forEach((it) => dt.items.add(it.file));
    if (inputRef.current) inputRef.current.files = dt.files;
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? []).map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      isVideo: f.type.startsWith("video/"),
    }));
    const next = [...items, ...chosen];
    setItems(next);
    syncInput(next);
  }

  function remove(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    syncInput(next);
  }

  const empty = items.length === 0;

  return (
    <form action={action} className="space-y-3">
      {companyId && <input type="hidden" name="companyId" value={companyId} />}

      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-brand-400 hover:bg-brand-50/40">
        <span className="text-2xl">📷</span>
        <span className="text-sm font-medium text-slate-700">Add photos or videos</span>
        <span className="text-xs text-slate-400">
          Images up to 8MB, videos up to 64MB. Select multiple.
        </span>
        <input
          ref={inputRef}
          type="file"
          name="photos"
          multiple
          accept={ACCEPT}
          onChange={onChange}
          className="hidden"
        />
      </label>

      {!empty && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((it, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              {it.isVideo ? (
                <video src={it.url} muted className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.url} alt="" className="h-full w-full object-cover" />
              )}
              {it.isVideo && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] font-medium text-white">
                  ▶ video
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove"
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={empty}
        className={`w-full rounded-md px-4 py-2 text-sm font-semibold ${
          empty
            ? "cursor-not-allowed bg-slate-200 text-slate-400"
            : "bg-brand-500 text-white hover:bg-brand-600"
        }`}
      >
        {empty ? "Select photos to add" : `Add ${items.length} to portfolio`}
      </button>
    </form>
  );
}
