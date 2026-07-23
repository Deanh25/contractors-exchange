"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { isVideoUrl } from "@/lib/listings";

const ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

/**
 * Editable post media: shows the current photo/video, lets you replace it (pick a
 * new file) or remove it (✕). Submits the file as `image` plus an `imageRemove`
 * flag; the action resolves replace / remove / keep.
 */
export function PostMediaInput({ current }: { current?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initial = current
    ? { url: current, isVideo: isVideoUrl(current) }
    : null;
  const [preview, setPreview] = useState<{ url: string; isVideo: boolean } | null>(
    initial,
  );
  const [removed, setRemoved] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPreview({ url: URL.createObjectURL(file), isVideo: file.type.startsWith("video/") });
      setRemoved(false);
    } else {
      setPreview(initial);
      setRemoved(false);
    }
  }

  function onRemove() {
    setPreview(null);
    setRemoved(true);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-3">
      <input type="hidden" name="imageRemove" value={removed ? "1" : "0"} />
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
        {preview ? (
          <>
            {preview.isVideo ? (
              <video src={preview.url} muted className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove media"
              className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
            >
              ✕
            </button>
          </>
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] text-slate-400">
            No media
          </div>
        )}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
        <ImagePlus size={15} aria-hidden />
        Change photo / video
        <input
          ref={inputRef}
          name="image"
          type="file"
          accept={ACCEPT}
          onChange={onChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
