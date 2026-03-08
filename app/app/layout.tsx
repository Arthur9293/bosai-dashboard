import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />

      <main className="flex min-h-screen flex-1 flex-col bg-zinc-900">
        <div className="border-b border-white/10 px-6 py-4">
          <p className="text-sm font-medium text-white">BOSAI Dashboard</p>
        </div>

        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
