import { requireCapability } from "@/lib/admin";
import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export default async function AdminListingsPage() {
  await requireCapability("moderation");
  return (
    <AdminPlaceholder
      title="Listings"
      blurb="Moderate any listing: close, reopen, remove, or recategorize."
    />
  );
}
