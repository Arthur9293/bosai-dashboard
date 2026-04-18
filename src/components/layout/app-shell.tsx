"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileShell } from "./mobile-shell";
import { Topbar } from "./topbar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(70%_80%_at_100%_0%,rgba(14,165,233,0.16),transparent_55%),radial-gradient(55%_65%_at_85%_20%,rgba(59,130,246,0.12),transparent_50%),linear-gradient(180deg,#020617_0%,#020617_45%,#000000_100%)]"
      />

      <div className="relative flex min-h-screen">
        <div className="hidden xl:block xl:w-[312px] xl:shrink-0">
          <Sidebar variant="desktop" />
        </div>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-transparent">
          <MobileShell />

          <div className="hidden xl:block">
            <Topbar />
          </div>

          <main className="flex-1 px-4 py-5 sm:px-5 lg:px-6 lg:py-6 xl:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
