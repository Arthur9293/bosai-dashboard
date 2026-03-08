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
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.25em] text-white/40">
          BOSAI
        </div>
        <div className="mt-2 text-2xl font-semibold">BOSAI V1</div>
        <div className="mt-1 text-sm text-white/50">Workspace: Production</div>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "rounded-xl px-4 py-3 text-sm transition",
                active
                  ? "bg-white text-black"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-medium">Runtime status</div>
        <div className="mt-2 text-sm text-emerald-400">Core connected</div>
      </div>
    </div>
  );
}
