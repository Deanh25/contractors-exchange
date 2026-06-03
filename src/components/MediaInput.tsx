"use client";

import { useRef, useState } from "react";

const ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

/**
 * Single-file media picker with a live thumbnail preview, used wherever one
 * photo/video is attached (feed posts, messages). Mirrors MediaUpload's preview
 * for a consistent feel across the app. Submits the file as `name` (default
 * "image"); the action saves it with saveMedia (image or video).
 */
export function MediaInput({
  name = "image",
  label = "📷 Photo / video",
}: {
  name?: string;
  label?: string;
}) {
  const [preview, setPreview] = useState<{ url: string; isVideo: boolean } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    setPreview({
      url: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
    });
  }

  function clear() {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-2">
      {preview && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
          {preview.isVideo ? (
            <video src={preview.url} muted className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt="" className="h-full w-full object-cover" />
          )}
          {preview.isVideo && (
            <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[9px] font-medium text-white">
              ▶
            </span>
          )}
          <button
            type="button"
            onClick={clear}
            aria-label="Remove media"
            className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
          >
            ✕
          </button>
        </div>
      )}
      <label className="cursor-pointer rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
        {label}
        <input
          ref={inputRef}
          name={name}
          type="file"
          accept={ACCEPT}
          onChange={onChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
