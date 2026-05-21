import { notFound } from "next/navigation";
import AdminOverview    from "@/components/admin/AdminOverview";
import AdminConnectors  from "@/components/admin/AdminConnectors";
import AdminBuilder     from "@/components/admin/AdminBuilder";
import AdminMarketplace from "@/components/admin/AdminMarketplace";
import AdminRoles       from "@/components/admin/AdminRoles";
import AdminBranding    from "@/components/admin/AdminBranding";
import AdminAuth        from "@/components/admin/AdminAuth";
import AdminAudit       from "@/components/admin/AdminAudit";
import AdminSDK         from "@/components/admin/AdminSDK";

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
};

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const Component = SECTIONS[section];
  if (!Component) notFound();

  return (
    <div className="p-6">
      <Component />
    </div>
  );
}
