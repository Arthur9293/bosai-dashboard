"use client";

import Link from "next/link";
import { useEffect } from "react";
import { DashboardCard } from "../../../components/ui/dashboard-card";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function actionButtonClassName(
  variant: "default" | "primary" | "soft" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "soft") {
    return "inline-flex items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/12 px-4 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/18";
  }

  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Tools segment error:", error);
  }, [error]);

  return (
    <div className="space-y-8">
      <DashboardCard
        title="Surface Tools indisponible"
        subtitle="Le segment Tools a rencontré une erreur, mais le cockpit reste protégé."
      >
        <div className="space-y-5">
          <div className="rounded-[20px] border border-red-500/20 bg-red-500/10 px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-red-300/80">
              Diagnostic
            </div>
            <div className="mt-2 text-sm leading-6 text-red-200">
              {error?.message || "tools_segment_error"}
            </div>
            {error?.digest ? (
              <div className="mt-2 text-xs text-red-300/70">
                Digest: {error.digest}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={reset}
              className={actionButtonClassName("primary")}
            >
              Réessayer
            </button>

            <Link href="/overview" className={actionButtonClassName("soft")}>
              Retour Overview
            </Link>

            <Link href="/commands" className={actionButtonClassName("default")}>
              Ouvrir Commands
            </Link>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Lecture rapide
            </div>
            <div className="mt-2 text-sm leading-6 text-zinc-300">
              Cette erreur est isolée à la surface Tools. Le shell BOSAI peut
              rester stable pendant que tu relances le segment.
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
