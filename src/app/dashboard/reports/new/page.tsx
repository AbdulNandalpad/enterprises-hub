/**
 * /dashboard/reports/new — redirects to /dashboard/reports
 * The builder is now embedded directly on the reports page.
 */
import { redirect } from "next/navigation";

export default function NewReportRedirect() {
  redirect("/dashboard/reports");
}
