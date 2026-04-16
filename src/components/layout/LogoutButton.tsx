"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    try {
      setLoading(true)

      await fetch("/api/auth/logout", {
        method: "POST",
      })

      router.replace("/login")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Déconnexion..." : "Logout"}
    </button>
  )
}
