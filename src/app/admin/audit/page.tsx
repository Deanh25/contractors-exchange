import { requireCapability } from "@/lib/admin";
import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export default async function AdminAuditPage() {
  await requireCapability("audit");
  return (
    <AdminPlaceholder
      title="Audit log"
      blurb="Every admin action, who performed it, and when."
    />
  );
}
