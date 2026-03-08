"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Overview", href: "/overview" },
  { label: "Commands", href: "/commands" },
  { label: "Runs", href: "/runs" },
  { label: "Incidents", href: "/incidents" },
  { label: "Tools", href: "/tools" },
  { label: "Policies", href: "/policies" },
  { label: "Integrations", href: "/integrations" },
  { label: "Settings", href: "/settings" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">
          BOSAI
        </div>
        <div className="mt-2 text-3xl font-semibold tracking-tight">BOSAI V1</div>
        <div className="mt-2 text-sm text-white/60">Workspace: Production</div>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "rounded-2xl px-4 py-3 text-sm transition-all duration-200",
                active
                  ? "border border-white/15 bg-white text-black shadow-lg"
                  : "text-white/70 hover:border hover:border-white/10 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <div className="text-sm font-medium text-white">Runtime status</div>
        <div className="mt-2 text-sm text-emerald-300">Core connected</div>
      </div>
    </div>
  );
}
