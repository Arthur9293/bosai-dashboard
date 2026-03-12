import Link from "next/link";

type NavItem = {
  label: string;
  href: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: "OPERATE",
    items: [
      { label: "Overview", href: "/app" },
      { label: "Commands", href: "/app/commands" },
      { label: "Runs", href: "/app/runs" },
      { label: "Incidents", href: "/app/incidents" },
      { label: "Events", href: "/app/events" },
    ],
  },
  {
    title: "GOVERN",
    items: [
      { label: "Tools", href: "/app/tools" },
      { label: "Policies", href: "/app/policies" },
    ],
  },
  {
    title: "WORKSPACE",
    items: [
      { label: "Integrations", href: "/app/integrations" },
      { label: "Settings", href: "/app/settings" },
    ],
  },
];

type SidebarProps = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-white/10 bg-[#050816] px-5 py-6">
      <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">BOSAI</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">BOSAI V1</h1>
        <p className="mt-2 text-sm text-white/55">Workspace: Production</p>
      </div>

      <nav className="space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-white/30">
              {section.title}
            </p>

            <div className="space-y-1">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className="block rounded-xl px-3 py-2 text-sm text-white/72 transition hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-8">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Core</p>
          <p className="mt-2 text-sm text-white/65">Connected to BOSAI Worker</p>
        </div>
      </div>
    </aside>
  );
}
