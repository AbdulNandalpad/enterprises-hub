/**
 * /superadmin/login — redirects to the unified /internal page (superadmin tab).
 * The middleware now redirects directly to /internal?mode=superadmin,
 * but this route is kept so any direct links still resolve cleanly.
 */
import { redirect } from "next/navigation";

export default function SuperadminLoginPage() {
  redirect("/internal?mode=superadmin");
}
