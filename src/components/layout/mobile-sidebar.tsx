"use client";

import { useState } from "react";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/flows", label: "Flows" },
  { href: "/runs", label: "Runs" },
  { href: "/commands", label: "Commands" },
  { href: "/events", label: "Events" },
  { href: "/incidents", label: "Incidents" },
  { href: "/policies", label: "Policies" },
  { href: "/tools", label: "Tools" },
  { href: "/settings", label: "Settings" },
];

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between xl:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          aria-label="Open menu"
        >
          ☰
        </button>

        <div className="text-sm font-medium text-zinc-400">BOSAI</div>

        <div className="w-10" />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />

          <div className="absolute left-0 top-0 h-full w-72 border-r border-white/10 bg-zinc-950 p-6 text-white shadow-2xl">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <div className="text-2xl font-semibold tracking-tight">BOSAI</div>
                <div className="mt-1 text-sm text-zinc-400">
                  Anti-Chaos AI Ops Layer
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-3 text-base text-zinc-200 transition hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
