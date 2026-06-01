"use client";

import { useState } from "react";
import { isVideoUrl } from "@/lib/listings";

const ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

/**
 * Media picker with live thumbnail previews (PRD §8 friction-killer). Shows
 * previews of newly selected images/videos and, on the edit form, the listing's
 * existing media with per-item remove. Submits:
 *   - `photos`        : the newly selected File(s)
 *   - `existingPhotos`: the URLs to keep (one hidden input each)
 * The action saves the new files and stores [kept existing..., new...].
 */
export function MediaUpload({ existing = [] }: { existing?: string[] }) {
  const [kept, setKept] = useState<string[]>(existing);
  const [previews, setPreviews] = useState<{ url: string; isVideo: boolean }[]>(
    [],
  );

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPreviews(
      files.map((f) => ({
        url: URL.createObjectURL(f),
        isVideo: f.type.startsWith("video/"),
      })),
    );
  }

  const hasThumbs = kept.length > 0 || previews.length > 0;

  return (
    <div>
      {kept.map((u) => (
        <input key={u} type="hidden" name="existingPhotos" value={u} />
      ))}

      {hasThumbs && (
        <div className="mb-2 flex flex-wrap gap-2">
          {kept.map((u) => (
            <MediaThumb
              key={u}
              url={u}
              isVideo={isVideoUrl(u)}
              onRemove={() => setKept((k) => k.filter((x) => x !== u))}
            />
          ))}
          {previews.map((p, i) => (
            <MediaThumb key={`new-${i}`} url={p.url} isVideo={p.isVideo} isNew />
          ))}
        </div>
      )}

      <label className="inline-block cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
        📷 Add photos or videos
        <input
          type="file"
          name="photos"
          multiple
          accept={ACCEPT}
          onChange={onChange}
          className="hidden"
        />
      </label>
      <p className="mt-1 text-xs text-slate-400">
        Images up to 8MB, videos up to 64MB. Choosing files again replaces the new
        selection.
      </p>
    </div>
  );
}

function MediaThumb({
  url,
  isVideo,
  onRemove,
  isNew,
}: {
  url: string;
  isVideo: boolean;
  onRemove?: () => void;
  isNew?: boolean;
}) {
  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
      {isVideo ? (
        <video src={url} muted className="h-full w-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}
      {isVideo && (
        <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[9px] font-medium text-white">
          ▶ video
        </span>
      )}
      {isNew && (
        <span className="absolute bottom-0.5 right-0.5 rounded bg-brand-500 px-1 text-[9px] font-medium text-white">
          new
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove media"
          className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
        >
          ✕
        </button>
      )}
    </div>
  );
}
