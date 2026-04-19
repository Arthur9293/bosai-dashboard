"use client";

import { usePathname } from "next/navigation";
import type { WorkspaceSummary } from "@/lib/workspaces/types";

type TopbarProps = {
  workspace: WorkspaceSummary;
};

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
    return "rounded-full border border-emerald-500/20 bg-emerald-500/12 px-4 py-2 text-sm font-medium text-emerald-300";
  }

  if (variant === "info") {
    return "rounded-full border border-sky-500/20 bg-sky-500/12 px-4 py-2 text-sm font-medium text-sky-300";
  }

  if (variant === "violet") {
    return "rounded-full border border-violet-500/20 bg-violet-500/12 px-4 py-2 text-sm font-medium text-violet-300";
  }

  return "rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-300";
}

function categoryTone(
  category: WorkspaceSummary["category"]
): "default" | "success" | "info" | "violet" {
  if (category === "agency") return "violet";
  if (category === "company") return "info";
  if (category === "freelance") return "success";
  return "default";
}

export function Topbar({ workspace }: TopbarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#040816]/55 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/30">
            {workspace.name}
          </p>
          <div className="mt-1 truncate text-lg font-medium text-white">
            {title}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={badgeClassName(categoryTone(workspace.category))}>
            {workspace.category.toUpperCase()}
          </div>

          <div className={badgeClassName("success")}>
            {workspace.status.toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
