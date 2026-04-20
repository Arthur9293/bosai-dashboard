"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type {
  WorkspaceEntitlements,
  WorkspaceSummary,
} from "@/lib/workspaces/types";

type TopbarProps = {
  workspace: WorkspaceSummary;
  entitlements: WorkspaceEntitlements;
};

type BadgeVariant = "default" | "success" | "info" | "violet";

function text(value?: string | null): string {
  return String(value || "").trim();
}

function getPageTitle(pathname: string): string {
  if (pathname === "/" || pathname === "/overview") return "Overview";
  if (pathname === "/workspace" || pathname.startsWith("/workspace/")) {
    return "Workspace Hub";
  }
  if (pathname.startsWith("/flows")) return "Flows";
  if (pathname.startsWith("/runs")) return "Runs";
  if (pathname.startsWith("/commands")) return "Commands";
  if (pathname.startsWith("/events")) return "Events";
  if (pathname.startsWith("/incidents")) return "Incidents";
  if (pathname.startsWith("/sla")) return "SLA";
  if (pathname.startsWith("/policies")) return "Policies";
  if (pathname.startsWith("/tools")) return "Tools";
  if (pathname.startsWith("/workspaces")) return "Workspaces";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Dashboard";
}

function badgeClassName(variant: BadgeVariant = "default"): string {
  if (variant === "success") {
    return "inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/12 px-3 py-1.5 text-xs font-medium text-emerald-300";
  }

  if (variant === "info") {
    return "inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/12 px-3 py-1.5 text-xs font-medium text-sky-300";
  }

  if (variant === "violet") {
    return "inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/12 px-3 py-1.5 text-xs font-medium text-violet-300";
  }

  return "inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300";
}

function actionClassName(
  variant: "default" | "soft" = "default"
): string {
  const base =
    "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition";

  if (variant === "soft") {
    return `${base} border border-sky-500/20 bg-sky-500/12 text-sky-300 hover:bg-sky-500/18`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white`;
}

function categoryTone(
  category: WorkspaceSummary["category"]
): BadgeVariant {
  if (category === "agency") return "violet";
  if (category === "company") return "info";
  if (category === "freelance") return "success";
  return "default";
}

function getPrimarySurfaceHref(
  workspace: WorkspaceSummary,
  entitlements: WorkspaceEntitlements
): string {
  if (workspace.category === "agency") {
    return "/flows";
  }

  if (workspace.category === "freelance") {
    return "/commands";
  }

  if (workspace.category === "company") {
    if (entitlements.canManageWorkspaces) return "/workspaces";
    return "/overview";
  }

  return "/overview";
}

function getPrimarySurfaceLabel(
  workspace: WorkspaceSummary,
  entitlements: WorkspaceEntitlements
): string {
  const href = getPrimarySurfaceHref(workspace, entitlements);

  if (href === "/flows") return "Flows";
  if (href === "/commands") return "Commands";
  if (href === "/workspaces") return "Workspaces";
  return "Overview";
}

function countCapabilities(entitlements: WorkspaceEntitlements): number {
  return [
    entitlements.canAccessDashboard,
    entitlements.canRunHttp,
    entitlements.canViewIncidents,
    entitlements.canManagePolicies,
    entitlements.canManageTools,
    entitlements.canManageWorkspaces,
    entitlements.canManageBilling,
  ].filter(Boolean).length;
}

export function Topbar({ workspace, entitlements }: TopbarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const primaryHref = getPrimarySurfaceHref(workspace, entitlements);
  const primaryLabel = getPrimarySurfaceLabel(workspace, entitlements);
  const capabilityCount = countCapabilities(entitlements);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#040816]/55 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-6 px-6 py-4">
        <div className="min-w-0">
          <p className="truncate text-[11px] uppercase tracking-[0.22em] text-white/30">
            {text(workspace.name) || "Workspace"}
          </p>

          <div className="mt-1 truncate text-lg font-medium text-white">
            {title}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={badgeClassName(categoryTone(workspace.category))}>
              {workspace.category.toUpperCase()}
            </span>

            <span className={badgeClassName("success")}>
              {workspace.status.toUpperCase()}
            </span>

            <span className={badgeClassName("default")}>
              {workspace.membershipRole.toUpperCase()}
            </span>

            <span className={badgeClassName("default")}>
              {text(workspace.slug) || text(workspace.workspaceId)}
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <span className={badgeClassName("default")}>
            Plan · {workspace.plan.toUpperCase()}
          </span>

          <span className={badgeClassName("info")}>
            {capabilityCount} capacités
          </span>

          <Link href={primaryHref} className={actionClassName("soft")}>
            {primaryLabel}
          </Link>

          <Link href="/workspace/select" className={actionClassName()}>
            Changer d’espace
          </Link>
        </div>
      </div>
    </header>
  );
}
