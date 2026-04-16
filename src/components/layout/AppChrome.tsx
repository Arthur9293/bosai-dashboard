"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogoutButton } from "./LogoutButton"

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/commands", label: "Commands" },
  { href: "/runs", label: "Runs" },
  { href: "/incidents", label: "Incidents" },
  { href: "/events", label: "Events" },
]

type AppChromeProps = {
  children: ReactNode
}

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login"

  if (isLoginPage) {
    return <div className="min-h-screen bg-black text-white antialiased">{children}</div>
  }

  return (
    <div className="min-h-screen flex">
      <aside className="hidden w-64 border-r border-white/10 p-4 md:block">
        <div className="mb-6 text-xl font-bold">BOSAI</div>

        <nav className="flex flex-col gap-3 text-sm">
          {navItems.map((item) => {
            const active = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "rounded-xl bg-white/[0.06] px-3 py-2 text-white"
                    : "rounded-xl px-3 py-2 text-white/70 transition hover:bg-white/[0.04] hover:text-white"
                }
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-white/10 px-4 md:px-6">
          <span className="text-sm text-white/60">BOSAI Control Plane</span>

          <div className="md:hidden">
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
