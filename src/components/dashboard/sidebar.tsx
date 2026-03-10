"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarLink = {
  name: string;
  href: string;
};

export function Sidebar() {
  const pathname = usePathname();

  const links: SidebarLink[] = [
    { name: "Overview", href: "/app" },
    { name: "Commands", href: "/app/commands" },
    { name: "Runs", href: "/app/runs" },
    { name: "Incidents", href: "/app/incidents" },
    { name: "Events", href: "/app/events" },
    { name: "Tools", href: "/app/tools" },
    { name: "Policies", href: "/app/policies" },
    { name: "Integrations", href: "/app/integrations" },
    { name: "Settings", href: "/app/settings" },
    { name: "Event Mappings", href: "/app/event-mappings" },
    { name: "Event Graph", href: "/app/event-graph" }
  ];

  const operateLinks = links.slice(0, 5);
  const governLinks = links.slice(5, 7);
  const workspaceLinks = links.slice(7);

  const isLinkActive = (href: string) => {
    if (href === "/app") {
      return pathname === "/app";
    }
    return pathname === href || pathname.startsWith(`${href}/`) || pathname.startsWith(href);
  };

  const renderLinks = (items: SidebarLink[]) =>
    items.map((link) => {
      const isActive = isLinkActive(link.href);

      return (
        <Link
          key={link.href}
          href={link.href}
          className={`block rounded-xl px-3 py-2 text-sm transition-colors ${
            isActive
              ? "bg-white text-zinc-950"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          {link.name}
        </Link>
      );
    });

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          BOSAI
        </p>
        <h2 className="mt-2 text-3xl font-bold text-white">BOSAI V1</h2>
        <p className="mt-3 text-sm text-zinc-400">Workspace: Production</p>
      </div>

      <div className="space-y-8">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Operate
          </p>
          <nav className="space-y-2">{renderLinks(operateLinks)}</nav>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Govern
          </p>
          <nav className="space-y-2">{renderLinks(governLinks)}</nav>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Workspace
          </p>
          <nav className="space-y-2">{renderLinks(workspaceLinks)}</nav>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <p className="text-xs text-zinc-400">Runtime status</p>
        <p className="mt-2 text-sm font-medium text-emerald-400">
          Core connected
        </p>
      </div>
    </aside>
  );
}
