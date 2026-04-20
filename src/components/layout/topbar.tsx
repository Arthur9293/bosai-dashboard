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

function badgeClassName(
  variant: "default" | "success" | "info" | "violet" = "default"
): string {
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

function categoryTone(
  category: WorkspaceSummary["category"]
): "default" | "success" | "info" | "violet" {
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

export function Topbar({ workspace, entitlements }: TopbarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const primaryHref = getPrimarySurfaceHref(workspace, entitlements);
  const primaryLabel = getPrimarySurfaceLabel(workspace, entitlements);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#040816]/55 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <p className="truncate text-[11px] uppercase tracking-[0.22em] text-white/30">
            {text(workspace.name) || "Workspace"}
          </p>

          <div className="mt-1 truncate text-lg font-medium text-white">
            {title}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={badgeClassName(categoryTone(workspace.category))}>
            {workspace.category.toUpperCase()}
          </span>

          <span className={badgeClassName("success")}>
            {workspace.status.toUpperCase()}
          </span>

          <Link
            href={primaryHref}
            className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/12 px-3 py-1.5 text-xs font-medium text-sky-300 transition hover:bg-sky-500/18"
          >
            {primaryLabel}
          </Link>

          <Link
            href="/workspace/select"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            Changer d’espace
          </Link>
        </div>
      </div>
    </header>
  );
}
