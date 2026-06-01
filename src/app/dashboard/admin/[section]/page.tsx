"use client";

import { use } from "react";
import { notFound, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useRoles } from "@/contexts/RolesContext";
import AdminOverview    from "@/components/admin/AdminOverview";
import AdminConnectors  from "@/components/admin/AdminConnectors";
import AdminBuilder     from "@/components/admin/AdminBuilder";
import AdminMarketplace from "@/components/admin/AdminMarketplace";
import AdminRoles       from "@/components/admin/AdminRoles";
import AdminBranding    from "@/components/admin/AdminBranding";
import AdminAuth        from "@/components/admin/AdminAuth";
import AdminAudit       from "@/components/admin/AdminAudit";
import AdminSDK         from "@/components/admin/AdminSDK";
import AdminGovernance  from "@/components/admin/AdminGovernance";

const SECTIONS: Record<string, React.ComponentType> = {
  overview:    AdminOverview,
  connectors:  AdminConnectors,
  builder:     AdminBuilder,
  marketplace: AdminMarketplace,
  roles:       AdminRoles,
  branding:    AdminBranding,
  auth:        AdminAuth,
  audit:       AdminAudit,
  sdk:         AdminSDK,
  governance:  AdminGovernance,
};

export default function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params);
  const { allowedAdminSections, loading } = useRoles();
  const router = useRouter();

  const Component = SECTIONS[section];
  if (!Component) notFound();

  // Redirect when roles are resolved and this section is not allowed
  useEffect(() => {
    if (!loading && !allowedAdminSections.includes(section)) {
      router.replace("/dashboard");
    }
  }, [loading, allowedAdminSections, section, router]);

  // Show skeleton while roles load
  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 rounded bg-[var(--shell-border)]" />
        <div className="h-4 w-72 rounded bg-[var(--shell-border)]" />
        <div className="h-px bg-[var(--shell-border)] my-4" />
        <div className="h-40 rounded-xl bg-[var(--shell-border)]" />
      </div>
    );
  }

  // Access denied — render nothing (redirect fires in effect above)
  if (!allowedAdminSections.includes(section)) {
    return null;
  }

  return (
    <div className="p-6">
      <Component />
    </div>
  );
}
