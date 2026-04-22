"use client";

import Link from "next/link";
import { useEffect } from "react";

function cardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default"
) {
  const base =
    "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition";

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "soft") {
    return `${base} border border-white/10 bg-black/20 text-zinc-200 hover:bg-white/[0.06]`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

type EventsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function EventsError({ error, reset }: EventsErrorProps) {
  useEffect(() => {
    console.error("[Events segment error]", {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
    });
  }, [error]);

  return (
    <div className="space-y-8">
      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-200">
              Events error
            </span>
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300">
              Segment protégé
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              La surface Events a rencontré une erreur
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-zinc-400 md:text-base">
              L’erreur reste isolée à la surface Events. Le shell dashboard et la
              baseline workspace restent protégés.
            </p>
          </div>

          <div className="rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-rose-200/80">
              Diagnostic
            </div>

            <div className="mt-3 space-y-2 text-sm text-rose-100/90">
              <div>
                <span className="text-rose-200/70">Message :</span>{" "}
                {error?.message || "unknown"}
              </div>

              {error?.digest ? (
                <div>
                  <span className="text-rose-200/70">Digest :</span> {error.digest}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className={actionLinkClassName("primary")}
            >
              Réessayer
            </button>

            <Link href="/events" className={actionLinkClassName("soft")}>
              Retour aux events
            </Link>

            <Link href="/overview" className={actionLinkClassName("default")}>
              Retour overview
            </Link>

            <Link href="/flows" className={actionLinkClassName("soft")}>
              Ouvrir Flows
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
