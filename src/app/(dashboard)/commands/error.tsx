"use client";

import { useEffect } from "react";

type CommandsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CommandsError({
  error,
  reset,
}: CommandsErrorProps) {
  useEffect(() => {
    console.error("[Commands segment error]", {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
    });
  }, [error]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-5 md:p-6">
        <div className="text-xs uppercase tracking-[0.22em] text-red-300/80">
          BOSAI Dashboard
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Commands a rencontré une erreur
        </h1>

        <p className="mt-3 max-w-3xl text-base leading-8 text-zinc-300">
          Le shell du dashboard reste intact. Le problème est isolé à la page
          Commands ou à un composant enfant.
        </p>

        <div className="mt-5 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-300">
          <div>
            <span className="text-zinc-500">message:</span>{" "}
            {error?.message || "unknown"}
          </div>
          {error?.digest ? (
            <div className="mt-2">
              <span className="text-zinc-500">digest:</span> {error.digest}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
          >
            Réessayer
          </button>

          <a
            href="/workspace"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.06]"
          >
            Retour workspace
          </a>
        </div>
      </section>
    </div>
  );
}
