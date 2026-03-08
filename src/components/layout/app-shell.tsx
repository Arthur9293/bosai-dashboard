import { ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";

type AppShellProps = {
  title: string;
  children: ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
  return (
    <div className="min-h-screen text-white">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-white/10 bg-black/25 backdrop-blur-xl">
          <SidebarNav />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <Topbar title={title} />

          <main className="flex-1 p-6 md:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
