"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type {
  WorkspaceCategory,
  WorkspaceEntitlements,
  WorkspaceSummary,
} from "@/lib/workspaces/types";

type NavItem = {
  href: string;
  label: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

type SidebarProps = {
  workspace: WorkspaceSummary;
  entitlements: WorkspaceEntitlements;
  onNavigate?: () => void;
  variant?: "desktop" | "drawer";
};

function text(value?: string | null): string {
  return String(value || "").trim();
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/overview") {
    return (
      pathname === "/" ||
      pathname === "/overview" ||
      pathname.startsWith("/overview/")
    );
  }

  if (href === "/workspace") {
    return pathname === "/workspace" || pathname.startsWith("/workspace/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClassName(active: boolean): string {
  if (active) {
    return "group flex items-center justify-between rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";
  }

  return "group flex items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-white/10 hover:bg-white/[0.04] hover:text-white";
}

function badgeClassName(
  variant: "default" | "success" | "info" | "violet" = "default"
): string {
  if (variant === "success") {
    return "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/12 px-2.5 py-1 text-xs font-medium text-emerald-300";
  }

  if (variant === "info") {
    return "inline-flex rounded-full border border-sky-500/20 bg-sky-500/12 px-2.5 py-1 text-xs font-medium text-sky-300";
  }

  if (variant === "violet") {
    return "inline-flex rounded-full border border-violet-500/20 bg-violet-500/12 px-2.5 py-1 text-xs font-medium text-violet-300";
  }

  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300";
}

function categoryBadgeTone(
  category: WorkspaceCategory
): "default" | "success" | "info" | "violet" {
  if (category === "agency") return "violet";
  if (category === "company") return "info";
  if (category === "freelance") return "success";
  return "default";
}

function dedupeItems(items: Array<NavItem | null>): NavItem[] {
  const seen = new Set<string>();
  const cleaned: NavItem[] = [];

  for (const item of items) {
    if (!item) continue;

    const href = text(item.href);
    if (!href || seen.has(href)) continue;

    seen.add(href);
    cleaned.push(item);
  }

  return cleaned;
}

function getPrimaryItems(
  workspace: WorkspaceSummary,
  entitlements: WorkspaceEntitlements
): NavItem[] {
  const category = workspace.category;

  if (category === "agency") {
    return dedupeItems([
      { href: "/workspace", label: "Accueil workspace" },
      { href: "/flows", label: "Flows" },
      { href: "/overview", label: "Vue d’ensemble" },
      { href: "/commands", label: "Commands" },
      { href: "/events", label: "Events" },
      entitlements.canViewIncidents
        ? { href: "/incidents", label: "Incidents" }
        : null,
    ]);
  }

  if (category === "freelance") {
    return dedupeItems([
      { href: "/workspace", label: "Accueil workspace" },
      { href: "/commands", label: "Commands" },
      { href: "/overview", label: "Vue d’ensemble" },
      { href: "/events", label: "Events" },
      entitlements.canViewIncidents
        ? { href: "/incidents", label: "Incidents" }
        : null,
    ]);
  }

  if (category === "company") {
    return dedupeItems([
      { href: "/workspace", label: "Accueil workspace" },
      entitlements.canManageWorkspaces
        ? { href: "/workspaces", label: "Workspaces" }
        : null,
      { href: "/overview", label: "Vue d’ensemble" },
      entitlements.canRunHttp ? { href: "/commands", label: "Commands" } : null,
      { href: "/events", label: "Events" },
      entitlements.canViewIncidents
        ? { href: "/incidents", label: "Incidents" }
        : null,
    ]);
  }

  return dedupeItems([
    { href: "/workspace", label: "Accueil workspace" },
    { href: "/overview", label: "Vue d’ensemble" },
    { href: "/events", label: "Events" },
  ]);
}

function getConfigItems(
  workspace: WorkspaceSummary,
  entitlements: WorkspaceEntitlements
): NavItem[] {
  const primaryHrefs = new Set(
    getPrimaryItems(workspace, entitlements).map((item) => item.href)
  );

  const items = dedupeItems([
    entitlements.canManagePolicies ? { href: "/policies", label: "Policies" } : null,
    entitlements.canManageTools ? { href: "/tools", label: "Tools" } : null,
    entitlements.canManageWorkspaces
      ? { href: "/workspaces", label: "Workspaces" }
      : null,
    { href: "/settings", label: "Réglages" },
  ]);

  return items.filter((item) => !primaryHrefs.has(item.href));
}

function getUtilityItems(): NavItem[] {
  return dedupeItems([{ href: "/workspace/select", label: "Changer d’espace" }]);
}

function getWorkspaceSubtitle(workspace: WorkspaceSummary): string {
  if (workspace.category === "agency") {
    return "Espace agence orienté flows et pilotage opérationnel";
  }

  if (workspace.category === "company") {
    return "Espace entreprise orienté gouvernance et surfaces métier";
  }

  if (workspace.category === "freelance") {
    return "Espace freelance orienté commands et exécution";
  }

  return "Espace personnel orienté lecture simple et accès rapide";
}

function getNavSections(
  workspace: WorkspaceSummary,
  entitlements: WorkspaceEntitlements
): NavSection[] {
  return [
    {
      title: "Navigation",
      items: getPrimaryItems(workspace, entitlements),
    },
    {
      title: "Configuration",
      items: getConfigItems(workspace, entitlements),
    },
    {
      title: "Utilitaires",
      items: getUtilityItems(),
    },
  ].filter((section) => section.items.length > 0);
}

export function Sidebar({
  workspace,
  entitlements,
  onNavigate,
  variant = "desktop",
}: SidebarProps) {
  const pathname = usePathname();
  const isDesktop = variant === "desktop";
  const navSections = getNavSections(workspace, entitlements);

  return (
    <aside
      className={
        isDesktop
          ? "h-screen w-[312px] border-r border-white/10 bg-[#040816]/55 text-white backdrop-blur-xl"
          : "h-full w-full bg-transparent text-white"
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        {isDesktop ? (
          <div className="border-b border-white/10 px-6 py-6">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
                BOSAI
              </div>

              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {workspace.name}
              </div>

              <div className="mt-2 text-sm leading-6 text-zinc-400">
                {getWorkspaceSubtitle(workspace)}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={badgeClassName(categoryBadgeTone(workspace.category))}>
                  {workspace.category.toUpperCase()}
                </span>
                <span className={badgeClassName("success")}>
                  {workspace.membershipRole.toUpperCase()}
                </span>
                <span className={badgeClassName("success")}>
                  {workspace.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-5">
          <nav className="space-y-6">
            {navSections.map((section) => (
              <div key={section.title}>
                <div className="mb-3 px-2 text-[11px] uppercase tracking-[0.22em] text-white/30">
                  {section.title}
                </div>

                <div className="space-y-1.5">
                  {section.items.map((item) => {
                    const active = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={navLinkClassName(active)}
                      >
                        <span>{item.label}</span>

                        {active ? (
                          <span className="rounded-full border border-sky-500/20 bg-sky-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-sky-300">
                            Actif
                          </span>
                        ) : (
                          <span className="text-white/20 transition group-hover:text-white/40">
                            →
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {isDesktop ? (
          <div className="border-t border-white/10 px-5 py-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/30">
                Workspace actif
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className={badgeClassName(categoryBadgeTone(workspace.category))}>
                  {workspace.slug}
                </span>
                <span className={badgeClassName("default")}>
                  Plan · {workspace.plan}
                </span>
              </div>

              <div className="mt-4">
                <Link
                  href="/workspace/select"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                >
                  Changer d’espace
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
