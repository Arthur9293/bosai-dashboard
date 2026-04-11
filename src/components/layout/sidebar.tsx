import Link from "next/link";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/flows", label: "Flows" },
  { href: "/runs", label: "Runs" },
  { href: "/commands", label: "Commands" },
  { href: "/events", label: "Events" },
  { href: "/incidents", label: "Incidents" },
  { href: "/sla", label: "SLA" },
  { href: "/policies", label: "Policies" },
  { href: "/tools", label: "Tools" },
  { href: "/workspaces", label: "Workspaces" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-black/40 text-white">
      <div className="flex h-screen flex-col px-6 py-8">
        <div className="mb-10">
          <div className="text-3xl font-semibold tracking-tight">BOSAI</div>
          <div className="mt-2 text-sm text-zinc-400">
            Anti-Chaos AI Ops Layer
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-xl px-3 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-6 text-xs text-zinc-500">
          <div>Worker: healthy</div>
          <div>Version: v2.5.5-rebuild</div>
          <div>Workspace: production</div>
        </div>
      </div>
    </aside>
  );
}
