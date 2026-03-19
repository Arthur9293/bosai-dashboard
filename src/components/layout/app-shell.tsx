"use client";

import { ReactNode } from "react";
import { MobileSidebar } from "./mobile-sidebar";

type MobileShellProps = {
  title?: string;
  children: ReactNode;
};

export function MobileShell({ title, children }: MobileShellProps) {
  return (
    <div className="lg:hidden">
      <MobileSidebar />

      {title ? (
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {title}
          </h1>
        </div>
      ) : null}

      <div>{children}</div>
    </div>
  );
}
