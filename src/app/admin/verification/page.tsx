import { requireCapability } from "@/lib/admin";
import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export default async function AdminVerificationPage() {
  await requireCapability("verification");
  return (
    <AdminPlaceholder
      title="Verification"
      blurb="Grant or deny the verified badge for users and companies."
    />
  );
}
