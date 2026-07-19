/**
 * Rebuild a media URL list from a MediaUpload form submission, honoring the
 * seller/author's drag order. The picker sends a `photoOrder` manifest of tokens:
 *   - "e:<url>" a kept existing URL
 *   - "n"       the next newly-uploaded file, in file order
 * Index 0 is the main/cover. Falls back to kept-then-uploaded when the manifest is
 * absent (e.g. JS disabled). Shared by the listing and post actions (web util:
 * reads FormData, no next/* imports).
 */
export function orderedMediaFromForm(
  formData: FormData,
  savedNew: string[],
): string[] {
  const raw = String(formData.get("photoOrder") ?? "");
  if (raw) {
    try {
      const order = JSON.parse(raw);
      if (Array.isArray(order)) {
        const out: string[] = [];
        let ni = 0;
        for (const tok of order) {
          if (typeof tok !== "string") continue;
          if (tok.startsWith("e:")) {
            const url = tok.slice(2);
            if (url) out.push(url);
          } else if (tok === "n") {
            const url = savedNew[ni++];
            if (url) out.push(url);
          }
        }
        return out;
      }
    } catch {
      /* malformed manifest: fall through to the kept-then-new fallback */
    }
  }
  const kept = formData.getAll("existingPhotos").map(String).filter(Boolean);
  return [...kept, ...savedNew];
}
