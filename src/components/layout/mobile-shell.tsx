"use client";

import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import type {
  WorkspaceEntitlements,
  WorkspaceSummary,
} from "@/lib/workspaces/types";

type MobileShellProps = {
  workspace: WorkspaceSummary;
  entitlements: WorkspaceEntitlements;
  title?: string;
};

function getPageTitle(pathname: string): string {
  if (pathname === "/" || pathname === "/overview") return "Overview";
  if (pathname.startsWith("/workspace")) return "Workspace Hub";
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

export function MobileShell({
  workspace,
  entitlements,
  title = "BOSAI Dashboard",
}: MobileShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navId = useId();

  const pageTitle = getPageTitle(pathname) || title;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#040816]/70 backdrop-blur-xl xl:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls={navId}
            onClick={() => setOpen(true)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08] active:scale-[0.98]"
          >
            <span className="text-xl leading-none">☰</span>
          </button>

          <div className="min-w-0 px-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              {workspace.name}
            </p>
            <p className="truncate text-sm font-medium text-white/80">
              {pageTitle}
            </p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 xl:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/75 backdrop-blur-[2px] transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          id={navId}
          role="dialog"
          aria-modal="true"
          aria-label="BOSAI mobile navigation"
          className={`relative z-10 flex h-full w-[88%] max-w-[320px] flex-col border-r border-white/10 bg-[#040816]/95 shadow-[0_20px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="border-b border-white/10 px-4 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-3xl font-semibold tracking-tight text-white">
                  {workspace.name}
                </p>
                <p className="mt-1 text-sm text-white/55">
                  {workspace.category.toUpperCase()} · {workspace.membershipRole.toUpperCase()}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full border border-sky-500/20 bg-sky-500/12 px-2.5 py-1 text-xs font-medium text-sky-300">
                    {workspace.slug}
                  </span>
                  <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/12 px-2.5 py-1 text-xs font-medium text-emerald-300">
                    {workspace.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08] active:scale-[0.98]"
              >
                <span className="text-lg leading-none">✕</span>
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <Sidebar
              variant="drawer"
              workspace={workspace}
              entitlements={entitlements}
              onNavigate={() => setOpen(false)}
            />
          </div>

          <div className="border-t border-white/10 px-4 py-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">
                Active workspace
              </p>
              <p className="mt-1 truncate text-sm text-white/65">
                {workspace.name}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
