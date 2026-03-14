import Link from "next/link";

const items = [
  { href: "/", label: "Overview" },
  { href: "/runs", label: "Runs" },
  { href: "/commands", label: "Commands" },
  { href: "/events", label: "Events" },
  { href: "/incidents", label: "Incidents" },
  { href: "/policies", label: "Policies" },
  { href: "/tools", label: "Tools" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-white/10 bg-black/30 px-4 py-6">
      <div className="mb-8">
        <div className="text-xl font-semibold tracking-tight text-white">
          BOSAI
        </div>
        <div className="mt-1 text-sm text-zinc-400">
          Anti-Chaos AI Ops Layer
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-white/10 pt-4 text-xs text-zinc-500">
        <div>Worker: healthy</div>
        <div>Version: v2.5.5-rebuild</div>
        <div>Workspace: production</div>
      </div>
    </aside>
  );
}
