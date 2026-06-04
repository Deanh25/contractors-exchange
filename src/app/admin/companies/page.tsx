import { requireCapability } from "@/lib/admin";
import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export default async function AdminCompaniesPage() {
  await requireCapability("users");
  return (
    <AdminPlaceholder
      title="Companies"
      blurb="Search companies, view detail, verify, and suspend."
    />
  );
}
