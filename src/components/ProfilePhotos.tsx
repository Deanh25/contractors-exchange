import { PhotoGrid } from "@/components/PhotoGrid";
import { PhotoUploader } from "@/components/PhotoUploader";
import { addProfilePhotosAction } from "@/app/actions/photos";

/**
 * Photos tab: a clean, titled portfolio card with a uniform photo grid +
 * lightbox (PhotoGrid). Owners get an "Add photos" panel; per-photo delete lives
 * on the grid cards. `companyId` is set for company profiles (drives auth);
 * omitted for a user's own profile.
 */
export function ProfilePhotos({
  photos,
  canManage,
  companyId,
}: {
  photos: { id: string; url: string }[];
  canManage: boolean;
  companyId?: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Photos{photos.length > 0 && (
            <span className="ml-1.5 text-slate-400">{photos.length}</span>
          )}
        </h3>

        {canManage && (
          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              + Add photos
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-[30rem] max-w-[92vw] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <p className="mb-2 text-sm font-semibold text-slate-900">Add to portfolio</p>
              <PhotoUploader action={addProfilePhotosAction} companyId={companyId} />
            </div>
          </details>
        )}
      </div>

      {photos.length > 0 ? (
        <PhotoGrid photos={photos} canManage={canManage} companyId={companyId} />
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-400">
          No photos yet.{canManage ? " Use “+ Add photos” to build your portfolio." : ""}
        </div>
      )}
    </section>
  );
}
