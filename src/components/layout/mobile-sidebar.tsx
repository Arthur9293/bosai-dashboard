"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import type {
  WorkspaceEntitlements,
  WorkspaceSummary,
} from "@/lib/workspaces/types";

type MobileSidebarProps = {
  workspace: WorkspaceSummary;
  entitlements: WorkspaceEntitlements;
};

export function MobileSidebar({
  workspace,
  entitlements,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <div className="flex items-center justify-between xl:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <span className="text-xl leading-none">☰</span>
        </button>

        <div className="truncate px-3 text-sm font-medium text-white/75">
          {workspace.name}
        </div>

        <div className="h-11 w-11" />
      </div>

      <div
        className={`fixed inset-0 z-50 xl:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/70 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          className={`absolute left-0 top-0 h-full w-[86%] max-w-[320px] border-r border-white/10 bg-[#050816] shadow-2xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-start justify-between border-b border-white/10 px-5 py-5">
            <div className="min-w-0">
              <div className="truncate text-3xl font-semibold tracking-tight text-white">
                {workspace.name}
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                {workspace.category.toUpperCase()} ·{" "}
                {workspace.membershipRole.toUpperCase()}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
              aria-label="Close menu"
            >
              <span className="text-lg leading-none">✕</span>
            </button>
          </div>

          <div className="h-[calc(100%-88px)]">
            <Sidebar
              workspace={workspace}
              entitlements={entitlements}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
