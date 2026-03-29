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
      <body className="bg-black text-white antialiased">
        <div className="min-h-screen flex">
          <aside className="hidden w-64 border-r border-white/10 p-4 md:block">
            <div className="mb-6 text-xl font-bold">BOSAI</div>

            <nav className="flex flex-col gap-3 text-sm">
              <Link href="/" className="text-white/70 transition hover:text-white">
                Overview
              </Link>
              <Link
                href="/commands"
                className="text-white/70 transition hover:text-white"
              >
                Commands
              </Link>
              <Link href="/runs" className="text-white/70 transition hover:text-white">
                Runs
              </Link>
              <Link
                href="/incidents"
                className="text-white/70 transition hover:text-white"
              >
                Incidents
              </Link>
              <Link
                href="/events"
                className="text-white/70 transition hover:text-white"
              >
                Events
              </Link>
            </nav>
          </aside>

          <div className="flex min-h-screen flex-1 flex-col">
            <header className="flex h-14 items-center border-b border-white/10 px-4 md:px-6">
              <span className="text-sm text-white/60">BOSAI Control Plane</span>
            </header>

            <main className="flex-1 p-4 md:p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
