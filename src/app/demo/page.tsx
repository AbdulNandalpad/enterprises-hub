/**
 * /demo — redirects to the unified /internal page (demo tab).
 * Kept as an alias so any existing bookmarks still work.
 */
import { redirect } from "next/navigation";

export default function DemoPage() {
  redirect("/internal");
}
