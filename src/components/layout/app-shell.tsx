"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { Topbar } from "./topbar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Mobile / tablet top bar */}
      <div className="border-b border-white/10 px-4 py-4 xl:hidden">
        <MobileSidebar />
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden xl:block">
          <Sidebar />
        </div>

        {/* Main content */}
        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
