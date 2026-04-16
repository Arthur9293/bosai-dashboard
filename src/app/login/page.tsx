"use client"

import { Suspense, useMemo, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function cardClassName() {
  return "w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-6 md:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
}

function inputClassName() {
  return "w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-500/30 focus:bg-black/40"
}

function buttonClassName(disabled = false) {
  const base =
    "inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition"

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500 opacity-60`
  }

  return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const nextPath = useMemo(() => {
    const raw = searchParams.get("next") || "/"
    if (!raw.startsWith("/")) return "/"
    return raw
  }, [searchParams])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null

      if (!response.ok || !data?.ok) {
        setError(data?.error || "Connexion impossible.")
        setLoading(false)
        return
      }

      router.replace(nextPath)
      router.refresh()
    } catch {
      setError("Erreur réseau. Réessaie.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className={cardClassName()}>
        <div className="mb-8">
          <div className="text-xs uppercase tracking-[0.24em] text-white/35">
            BOSAI Control Plane
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            Connexion
          </h1>
          <p className="mt-3 text-base leading-7 text-zinc-400">
            Accède au cockpit BOSAI avec ton compte sécurisé.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm text-zinc-300">Email</label>
            <input
              type="email"
              autoComplete="email"
              className={inputClassName()}
              placeholder="admin@bosai.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-300">Mot de passe</label>
            <input
              type="password"
              autoComplete="current-password"
              className={inputClassName()}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button type="submit" className={buttonClassName(loading)} disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className={cardClassName()}>
        <div className="text-xs uppercase tracking-[0.24em] text-white/35">
          BOSAI Control Plane
        </div>
        <div className="mt-4 text-lg text-zinc-300">Chargement...</div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}
