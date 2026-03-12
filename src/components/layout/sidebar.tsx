"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const operateItems: NavItem[] = [
  { href: "/app", label: "Overview" },
  { href: "/app/commands", label: "Commands" },
  { href: "/app/runs", label: "Runs" },
  { href: "/app/incidents", label: "Incidents" },
  { href: "/app/events", label: "Events" },
];

const governItems: NavItem[] = [
  { href: "/app/tools", label: "Tools" },
  { href: "/app/policies", label: "Policies" },
];

const workspaceItems: NavItem[] = [
  { href: "/app/integrations", label: "Integrations" },
  { href: "/app/settings", label: "Settings" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      className={[
        "block rounded-2xl px-4 py-3 text-sm transition",
        active
          ? "bg-white text-black"
          : "text-zinc-300 hover:bg-zinc-900 hover:text-white",
      ].join(" ")}
    >
      {item.label}
    </Link>
  );
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="space-y-3">
      <p className="px-2 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
        {title}
      </p>

      <div className="space-y-2">
        {items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col border-r border-zinc-800 bg-black">
      <div className="border-b border-zinc-800 p-5">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">BOSAI</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            BOSAI V1
          </h1>
          <p className="mt-3 text-sm text-zinc-400">Workspace: Production</p>
        </div>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto p-5">
        <NavSection title="Operate" items={operateItems} pathname={pathname} />
        <NavSection title="Govern" items={governItems} pathname={pathname} />
        <NavSection title="Workspace" items={workspaceItems} pathname={pathname} />
      </div>
    </aside>
  );
}
