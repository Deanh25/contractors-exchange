"use client";

import { useRef, useState } from "react";

const ACCEPT = ".pdf,image/png,image/jpeg,image/webp";

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function baseName(url: string): string {
  const last = url.split("/").pop() ?? url;
  return last.length > 24 ? `${last.slice(0, 8)}…${last.slice(-10)}` : last;
}

/**
 * Multi-file document picker for verification (PRD §7C). Accumulates files across
 * multiple picks, lets you remove individual selections, and lets you drop
 * already-attached documents. The managed list is mirrored into a hidden
 * <input name="documents"> via DataTransfer so the form submits a real FileList;
 * kept existing docs are submitted as `keepDocuments` URLs.
 */
export function DocumentUpload({ existing = [] }: { existing?: string[] }) {
  const carrierRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [kept, setKept] = useState<string[]>(existing);

  function sync(next: File[]) {
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    if (carrierRef.current) carrierRef.current.files = dt.files;
    setFiles(next);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    const map = new Map(files.map((f) => [`${f.name}:${f.size}`, f]));
    for (const f of picked) map.set(`${f.name}:${f.size}`, f);
    sync([...map.values()]);
    e.target.value = ""; // reset the picker so re-selecting the same file works
  }

  return (
    <div>
      {/* Hidden carrier: what actually submits. */}
      <input ref={carrierRef} type="file" name="documents" multiple className="hidden" />
      {/* Kept existing docs submit their URLs. */}
      {kept.map((u) => (
        <input key={u} type="hidden" name="keepDocuments" value={u} />
      ))}

      {(kept.length > 0 || files.length > 0) && (
        <ul className="mb-2 space-y-1">
          {kept.map((u) => (
            <li
              key={u}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm"
            >
              <span className="text-slate-400">📄</span>
              <a
                href={u}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-slate-700 hover:underline"
              >
                {baseName(u)}
              </a>
              <span className="text-[10px] font-medium uppercase text-slate-400">
                attached
              </span>
              <button
                type="button"
                onClick={() => setKept((k) => k.filter((x) => x !== u))}
                aria-label="Remove document"
                className="grid h-5 w-5 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                ✕
              </button>
            </li>
          ))}
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-sm"
            >
              <span className="text-slate-400">📄</span>
              <span className="min-w-0 flex-1 truncate text-slate-700">{f.name}</span>
              <span className="text-[10px] text-slate-400">{prettySize(f.size)}</span>
              <button
                type="button"
                onClick={() => sync(files.filter((_, j) => j !== i))}
                aria-label="Remove file"
                className="grid h-5 w-5 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="inline-block cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
        + Add documents
        <input
          ref={pickerRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={onPick}
          className="hidden"
        />
      </label>
      <p className="mt-1 text-xs text-slate-400">
        PDF or image, up to 16MB each. Add as many as you need; remove any before
        submitting.
      </p>
    </div>
  );
}
