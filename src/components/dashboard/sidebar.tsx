"use client";

import { usePathname } from "next/navigation";
import { SidebarItem } from "./sidebar-item";

const operateNav = [
  { label: "Overview", href: "/app" },
  { label: "Commands", href: "/app/commands" },
  { label: "Runs", href: "/app/runs" },
  { label: "Incidents", href: "/app/incidents" },
];

const governNav = [
  { label: "Tools", href: "/app/tools" },
  { label: "Policies", href: "/app/policies" },
];

const workspaceNav = [
  { label: "Integrations", href: "/app/integrations" },
  { label: "Settings", href: "/app/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActivePath = (href: string) => {
    if (href === "/app") return pathname === "/app";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-white/10 bg-zinc-950">
      <div className="border-b border-white/10 px-6 py-5">
        <p className="text-lg font-semibold text-white">BOSAI</p>
        <p className="text-xs text-zinc-500">SaaS V1 Workspace</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Operate
          </p>
          <div className="mt-2 space-y-1">
            {operateNav.map((item) => (
              <SidebarItem
                key={item.href}
                label={item.label}
                href={item.href}
                isActive={isActivePath(item.href)}
              />
            ))}
          </div>
        </div>

        <div className="mt-8">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Govern
          </p>
          <div className="mt-2 space-y-1">
            {governNav.map((item) => (
              <SidebarItem
                key={item.href}
                label={item.label}
                href={item.href}
                isActive={isActivePath(item.href)}
              />
            ))}
          </div>
        </div>

        <div className="mt-8">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Workspace
          </p>
          <div className="mt-2 space-y-1">
            {workspaceNav.map((item) => (
              <SidebarItem
                key={item.href}
                label={item.label}
                href={item.href}
                isActive={isActivePath(item.href)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-4">
        <p className="text-xs text-zinc-500">Arthur Workspace</p>
      </div>
    </aside>
  );
}
