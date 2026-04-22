"use client";

import { useEffect } from "react";
import Link from "next/link";

function cardClassName(): string {
  return "rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-6";
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function actionButtonClassName(
  variant: "default" | "primary" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.06]";
}

type OverviewErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function OverviewError({
  error,
  reset,
}: OverviewErrorProps) {
  useEffect(() => {
    console.error("[Overview segment error]", {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
    });
  }, [error]);

  return (
    <div className="space-y-8">
      <section className={cardClassName()}>
        <div className={sectionLabelClassName()}>BOSAI Control Plane</div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300">
            Overview error
          </span>
          <span className="inline-flex rounded-full border border-white/10 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300">
            Segment local protégé
          </span>
        </div>

        <div className="mt-5">
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Overview a rencontré une erreur
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-zinc-400">
            Le shell dashboard reste intact. L’erreur est isolée à la surface
            Overview et n’implique pas automatiquement le core workspace /
            layout / session.
          </p>
        </div>

        <div className="mt-6 rounded-[24px] border border-red-500/20 bg-red-500/10 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-red-200/80">
            Diagnostic
          </div>

          <div className="mt-3 space-y-2 text-sm text-zinc-200">
            <div>
              <span className="text-zinc-400">Message :</span>{" "}
              {error?.message || "unknown"}
            </div>

            {error?.digest ? (
              <div>
                <span className="text-zinc-400">Digest :</span> {error.digest}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className={actionButtonClassName("primary")}
          >
            Réessayer
          </button>

          <Link href="/workspace" className={actionButtonClassName("default")}>
            Retour workspace
          </Link>

          <Link href="/commands" className={actionButtonClassName("default")}>
            Ouvrir Commands
          </Link>
        </div>
      </section>
    </div>
  );
}
