import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-black text-white">
        <div className="min-h-screen flex">
          <aside className="w-64 border-r border-white/10 p-4 hidden md:block">
            <div className="text-xl font-bold mb-6">BOSAI</div>

            <nav className="flex flex-col gap-3 text-sm">
              <Link href="/" className="text-white/70 hover:text-white">
                Overview
              </Link>
              <Link href="/commands" className="text-white/70 hover:text-white">
                Commands
              </Link>
              <Link href="/runs" className="text-white/70 hover:text-white">
                Runs
              </Link>
              <Link href="/incidents" className="text-white/70 hover:text-white">
                Incidents
              </Link>
              <Link href="/events" className="text-white/70 hover:text-white">
                Events
              </Link>
            </nav>
          </aside>

          <div className="flex-1 flex flex-col min-h-screen">
            <header className="h-14 border-b border-white/10 flex items-center px-4 md:px-6">
              <span className="text-sm text-white/60">BOSAI Control Plane</span>
            </header>

            <main className="flex-1 p-4 md:p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
