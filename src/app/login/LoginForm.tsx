"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  initialNext: string;
};

export function LoginForm({ initialNext }: LoginFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState("admin@bosai.app");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          next: initialNext,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; redirectTo?: string }
        | null;

      if (!response.ok || !data?.ok) {
        setError(data?.message || "Connexion impossible.");
        setLoading(false);
        return;
      }

      router.replace(typeof data.redirectTo === "string" ? data.redirectTo : "/");
      router.refresh();
    } catch {
      setError("Connexion impossible.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
      <div className="w-full rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-8">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
            BOSAI Control Plane
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            Connexion
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-9 text-zinc-400">
            Accède au cockpit BOSAI avec ton compte sécurisé.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="mb-3 block text-sm font-medium text-zinc-200"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-[22px] border border-white/10 bg-black/30 px-5 py-4 text-lg text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-500/40"
              placeholder="admin@bosai.app"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-3 block text-sm font-medium text-zinc-200"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-[22px] border border-white/10 bg-black/30 px-5 py-4 text-lg text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-500/40"
              placeholder="••••••••"
              required
            />
          </div>

          {error ? (
            <div className="rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-5 py-4 text-lg font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
