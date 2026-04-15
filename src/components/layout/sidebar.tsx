"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

type SidebarProps = {
  onNavigate?: () => void;
};

const navSections: NavSection[] = [
  {
    title: "Control Plane",
    items: [
      { href: "/", label: "Overview" },
      { href: "/flows", label: "Flows" },
      { href: "/runs", label: "Runs" },
      { href: "/commands", label: "Commands" },
      { href: "/events", label: "Events" },
      { href: "/incidents", label: "Incidents" },
      { href: "/sla", label: "SLA" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { href: "/policies", label: "Policies" },
      { href: "/tools", label: "Tools" },
      { href: "/workspaces", label: "Workspaces" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClassName(active: boolean): string {
  if (active) {
    return "group flex items-center justify-between rounded-2xl border border-emerald-500/25 bg-emerald-500/12 px-4 py-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";
  }

  return "group flex items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-white/10 hover:bg-white/[0.04] hover:text-white";
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="h-full w-full border-r border-white/10 bg-[#050816] text-white">
      <div className="flex h-full min-h-0 flex-col">
        <div className="hidden border-b border-white/10 px-6 py-7 lg:block">
          <div className="text-3xl font-semibold tracking-tight text-white">
            BOSAI
          </div>
          <div className="mt-2 text-sm text-zinc-400">
            Anti-Chaos AI Ops Layer
          </div>
        </div>

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
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                            Active
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

        <div className="hidden border-t border-white/10 px-5 py-5 lg:block">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/30">
              Status
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/12 px-2.5 py-1 text-xs font-medium text-emerald-300">
                Worker healthy
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
                Stable
              </span>
            </div>

            <div className="mt-4 space-y-1 text-xs text-zinc-500">
              <div>Version: v2.5.5-rebuild</div>
              <div>Workspace: production</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
