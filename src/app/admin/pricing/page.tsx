import { requireCapability } from "@/lib/admin";
import { AdminPlaceholder } from "@/components/AdminPlaceholder";

export default async function AdminPricingPage() {
  await requireCapability("pricing");
  return (
    <AdminPlaceholder
      title="Pricing queue"
      blurb="Listings the seller priced below the category minimum, held for review."
    />
  );
}
