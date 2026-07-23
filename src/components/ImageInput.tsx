"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

/**
 * Image-only single-file picker that shows the CURRENT image, previews a new
 * selection, and supports REMOVING the existing image (the ✕ on the thumbnail).
 * Used for inline profile photo / logo / banner uploads.
 *
 * Submits two fields: the file as `name`, and a hidden `${name}Remove` flag. The
 * action resolves them: a new file wins; else remove=1 clears the image; else the
 * existing image is left unchanged.
 */
export function ImageInput({
  name,
  label = "Upload image",
  current,
  aspect = "square",
}: {
  name: string;
  label?: string;
  current?: string | null;
  aspect?: "square" | "wide";
}) {
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const [removed, setRemoved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : current ?? null);
    setRemoved(false);
  }

  function onRemove() {
    setPreview(null);
    setRemoved(true);
    if (inputRef.current) inputRef.current.value = "";
  }

  const box = aspect === "wide" ? "h-20 w-44" : "h-20 w-20";

  return (
    <div className="flex items-center gap-3">
      {/* Tells the action to clear the existing image when removed and no new file picked. */}
      <input type="hidden" name={`${name}Remove`} value={removed ? "1" : "0"} />
      <div
        className={`relative ${box} shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100`}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove image"
              className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
            >
              ✕
            </button>
          </>
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] text-slate-400">
            No image
          </div>
        )}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
        <ImagePlus size={15} aria-hidden />
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
