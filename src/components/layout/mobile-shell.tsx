"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";

type MobileShellProps = {
  title?: string;
};

export function MobileShell({ title = "BOSAI Dashboard" }: MobileShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 lg:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white"
        >
          <span className="text-xl leading-none">☰</span>
        </button>

        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">BOSAI</p>
          <p className="text-sm font-medium text-white/80">{title}</p>
        </div>

        <div className="w-11" />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70"
          />

          <div className="relative z-10 h-full w-[86%] max-w-[280px]">
            <div className="flex h-16 items-center justify-end border-b border-white/10 bg-[#050816] px-4">
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white"
              >
                <span className="text-lg leading-none">✕</span>
              </button>
            </div>

            <div className="h-[calc(100%-64px)]">
              <Sidebar onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
