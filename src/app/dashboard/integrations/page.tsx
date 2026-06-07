import { redirect } from "next/navigation";

// Integrations are now configured in Settings → Integrations (admin)
// and Settings → My Apps (users). This route is no longer needed.
export default function IntegrationsPage() {
  redirect("/dashboard/settings");
}
