"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/flows", label: "Flows" },
  { href: "/runs", label: "Runs" },
  { href: "/commands", label: "Commands" },
  { href: "/events", label: "Events" },
  { href: "/incidents", label: "Incidents" },
  { href: "/sla", label: "SLA" },
  { href: "/policies", label: "Policies" },
  { href: "/tools", label: "Tools" },
  { href: "/workspaces", label: "Workspaces" },
  { href: "/settings", label: "Settings" },
];

type AppChromeProps = {
  children: ReactNode;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClassName(active: boolean) {
  return active
    ? "block rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-white"
    : "block rounded-xl px-3 py-2.5 text-white/70 transition hover:bg-white/[0.04] hover:text-white";
}

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-black text-white antialiased">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-black/40 md:block">
        <div className="flex h-screen flex-col px-4 py-6">
          <div className="mb-8">
            <div className="text-2xl font-semibold tracking-tight">BOSAI</div>
            <div className="mt-1 text-sm text-zinc-400">
              Anti-Chaos AI Ops Layer
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLinkClassName(active)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4 pt-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-zinc-400">
              <div>Worker: healthy</div>
              <div>Workspace: production</div>
            </div>

            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-black/80 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white md:hidden"
            >
              <span className="text-lg leading-none">☰</span>
            </button>

            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
                BOSAI
              </div>
              <div className="text-sm text-white/70">Control Plane</div>
            </div>
          </div>

          <div className="md:hidden">
            <LogoutButton />
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/70"
          />

          <div className="relative z-10 h-full w-[86%] max-w-[300px] border-r border-white/10 bg-[#050816] shadow-2xl">
            <div className="flex h-full flex-col px-4 py-6">
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <div className="text-2xl font-semibold tracking-tight">
                    BOSAI
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">
                    Anti-Chaos AI Ops Layer
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white"
                >
                  <span className="text-lg leading-none">✕</span>
                </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={navLinkClassName(active)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto space-y-4 pt-6">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-zinc-400">
                  <div>Worker: healthy</div>
                  <div>Workspace: production</div>
                </div>

                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
