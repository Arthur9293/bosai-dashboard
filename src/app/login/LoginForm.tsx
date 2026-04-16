"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

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
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setError(data.error || "Connexion impossible.");
        setPending(false);
        return;
      }

      router.replace("/auth-check");
      router.refresh();
    } catch {
      setError("Erreur réseau ou serveur.");
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white antialiased sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
        <section className="w-full rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-8 md:p-10">
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-[0.24em] text-white/35">
              BOSAI Control Plane
            </div>

            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              Connexion
            </h1>

            <p className="max-w-xl text-lg leading-9 text-zinc-400">
              Accède au cockpit BOSAI avec ton compte sécurisé.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-7">
            <div className="space-y-3">
              <label
                htmlFor="email"
                className="block text-lg font-medium text-white"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@bosai.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[24px] border border-white/10 bg-black/40 px-6 py-5 text-lg text-white outline-none transition placeholder:text-zinc-500 focus:border-white/20 focus:bg-black/50"
                required
              />
            </div>

            <div className="space-y-3">
              <label
                htmlFor="password"
                className="block text-lg font-medium text-white"
              >
                Mot de passe
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[24px] border border-white/10 bg-black/40 px-6 py-5 text-lg text-white outline-none transition placeholder:text-zinc-500 focus:border-white/20 focus:bg-black/50"
                required
              />
            </div>

            {error ? (
              <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className={`inline-flex w-full items-center justify-center rounded-full px-4 py-4 text-lg font-medium transition ${
                pending
                  ? "cursor-not-allowed border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 opacity-70"
                  : "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
              }`}
            >
              {pending ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
