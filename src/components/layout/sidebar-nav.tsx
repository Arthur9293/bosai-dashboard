"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavigation } from "../../lib/navigation";

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-zinc-800 bg-zinc-950/80 lg:flex lg:flex-col">
      <div className="border-b border-zinc-800 px-6 py-5">
        <div className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
          BOSAI
        </div>

        <div className="mt-2 text-xl font-semibold text-white">SaaS V1</div>

        <p className="mt-2 text-sm text-zinc-400">
          Cockpit de supervision et gouvernance.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <nav className="space-y-8">
          {dashboardNavigation.map((section) => (
            <div key={section.title}>
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                {section.title}
              </div>

              <div className="mt-3 space-y-1">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "block rounded-xl border px-3 py-2.5 text-sm transition",
                        active
                          ? "border-zinc-700 bg-zinc-800 text-white"
                          : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900 hover:text-white",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-zinc-800 px-6 py-4">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
            Runtime
          </div>
          <div className="mt-2 text-sm font-medium text-white">
            Core connected
          </div>
          <p className="mt-1 text-xs text-zinc-300">
            Worker Render + Dashboard Vercel
          </p>
        </div>
      </div>
    </aside>
  );
}
