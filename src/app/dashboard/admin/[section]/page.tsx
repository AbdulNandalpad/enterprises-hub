"use client";

/**
 * Old admin routes — redirect to the unified Settings page.
 * Keeps any bookmarks or old links working.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/settings"); }, [router]);
  return null;
}
