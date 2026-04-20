"use client";

import { usePathname } from "next/navigation";
import type {
  WorkspaceEntitlements,
  WorkspaceSummary,
} from "@/lib/workspaces/types";

type TopbarProps = {
  workspace: WorkspaceSummary;
  entitlements?: WorkspaceEntitlements;
};

function text(value?: string | null): string {
  return String(value || "").trim();
}

function getPageTitle(pathname: string): string {
  if (pathname === "/" || pathname === "/overview") return "Overview";
  if (pathname.startsWith("/workspace")) return "Workspace Hub";
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

function badgeClassName(
  variant: "default" | "success" | "info" | "violet" = "default"
): string {
  if (variant === "success") {
    return "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/12 px-3 py-1.5 text-xs font-medium text-emerald-300";
  }

  if (variant === "info") {
    return "inline-flex rounded-full border border-sky-500/20 bg-sky-500/12 px-3 py-1.5 text-xs font-medium text-sky-300";
  }

  if (variant === "violet") {
    return "inline-flex rounded-full border border-violet-500/20 bg-violet-500/12 px-3 py-1.5 text-xs font-medium text-violet-300";
  }

  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300";
}

function categoryTone(
  category: WorkspaceSummary["category"]
): "default" | "success" | "info" | "violet" {
  if (category === "agency") return "violet";
  if (category === "company") return "info";
  if (category === "freelance") return "success";
  return "default";
}

function getWorkspaceSurfaceLabel(workspace: WorkspaceSummary): string {
  if (workspace.category === "agency") return "Agency surface";
  if (workspace.category === "company") return "Company surface";
  if (workspace.category === "freelance") return "Freelance surface";
  return "Personal surface";
}

function getCapabilityCount(entitlements?: WorkspaceEntitlements): number {
  if (!entitlements) return 0;

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
  const capabilityCount = getCapabilityCount(entitlements);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#040816]/55 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-6 px-6 py-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/30">
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
              {workspace.membershipRole.toUpperCase()}
            </span>

            <span className={badgeClassName("success")}>
              {workspace.status.toUpperCase()}
            </span>

            <span className={badgeClassName("default")}>
              {text(workspace.slug) || text(workspace.workspaceId)}
            </span>
          </div>
        </div>

        <div className="hidden min-w-0 shrink-0 xl:flex xl:flex-col xl:items-end xl:gap-2">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/30">
            {getWorkspaceSurfaceLabel(workspace)}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <span className={badgeClassName("default")}>
              Plan · {workspace.plan.toUpperCase()}
            </span>

            {capabilityCount > 0 ? (
              <span className={badgeClassName("info")}>
                {capabilityCount} capacités
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
