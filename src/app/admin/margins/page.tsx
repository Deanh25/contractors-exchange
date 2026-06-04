import { requireCapability } from "@/lib/admin";
import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export default async function AdminMarginsPage() {
  await requireCapability("margins");
  return (
    <AdminPlaceholder
      title="Margins"
      blurb="Edit per-category margin bands. Changes apply to future listings only."
    />
  );
}
