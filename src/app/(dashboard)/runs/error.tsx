"use client";

import Link from "next/link";
import { useEffect } from "react";

function cardClassName(): string {
  return [
    "rounded-[28px] border border-white/10 p-5 md:p-6",
    "bg-[linear-gradient(180deg,rgba(8,20,48,0.76)_0%,rgba(3,8,22,0.56)_100%)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  ].join(" ");
}

function actionLinkClassName(
  variant: "default" | "primary" | "danger" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15";
  }

  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

type RunsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RunsError({ error, reset }: RunsErrorProps) {
  useEffect(() => {
    console.error("[Runs segment error]", {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
    });
  }, [error]);

  return (
    <div className="space-y-8">
      <section className={cardClassName()}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-200">
            Runs error
          </span>
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300">
            Segment protégé
          </span>
        </div>

        <div className="mt-5">
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            La surface Runs a rencontré une erreur
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400 md:text-base">
            Le shell dashboard reste protégé. L’erreur est isolée à la surface
            Runs et ne remet pas en cause la baseline validée workspace / layout /
            session.
          </p>
        </div>

        <div className="mt-6 rounded-[22px] border border-rose-500/20 bg-rose-500/10 px-4 py-4">
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

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className={actionLinkClassName("primary")}
          >
            Réessayer
          </button>

          <Link href="/runs" className={actionLinkClassName("default")}>
            Retour aux runs
          </Link>

          <Link href="/workspace" className={actionLinkClassName("default")}>
            Retour workspace
          </Link>

          <Link href="/flows" className={actionLinkClassName("danger")}>
            Ouvrir Flows
          </Link>
        </div>
      </section>
    </div>
  );
}
