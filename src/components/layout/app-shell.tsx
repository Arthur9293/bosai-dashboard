import { ReactNode } from "react";
import { MobileShell } from "./mobile-shell";
import { Sidebar } from "./sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <MobileShell />

      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
