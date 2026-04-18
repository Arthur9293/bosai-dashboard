"use client";

import { usePathname } from "next/navigation";

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Overview";
  if (pathname.startsWith("/flows")) return "Flows";
  if (pathname.startsWith("/runs")) return "Runs";
  if (pathname.startsWith("/commands")) return "Commands";
  if (pathname.startsWith("/events")) return "Events";
  if (pathname.startsWith("/incidents")) return "Incidents";
  if (pathname.startsWith("/sla")) return "SLA";
  if (pathname.startsWith("/policies")) return "Policies";
  if (pathname.startsWith("/tools")) return "Tools";
  if (pathname.startsWith("/workspaces")) return "Workspaces";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Dashboard";
}

export function Topbar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#040816]/55 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/30">
            BOSAI Dashboard
          </p>
          <div className="mt-1 truncate text-lg font-medium text-white">
            {title}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-full border border-sky-500/20 bg-sky-500/12 px-4 py-2 text-sm font-medium text-sky-300">
            Production
          </div>

          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/12 px-4 py-2 text-sm font-medium text-emerald-300">
            Stable
          </div>
        </div>
      </div>
    </header>
  );
}
