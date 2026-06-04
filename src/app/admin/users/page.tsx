import { requireCapability } from "@/lib/admin";
import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export default async function AdminUsersPage() {
  await requireCapability("users");
  return (
    <AdminPlaceholder
      title="Users"
      blurb="Search people, view detail, verify, and suspend."
    />
  );
}
