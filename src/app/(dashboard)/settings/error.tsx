"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/12 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/18";
  }

  if (variant === "soft") {
    return "inline-flex items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/12 px-4 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/18";
  }

  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

export default function SettingsErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  useEffect(() => {
    console.error("Settings route error:", error);
  }, [error]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configuration"
        title="Settings indisponible"
        description="La surface Settings a rencontré une erreur de rendu, mais le shell BOSAI reste stable."
      />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard
          title="Incident de surface"
          subtitle="Lecture sûre de l’erreur sans casser le cockpit."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-200">
                SETTINGS ERROR
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
                SAFE BOUNDARY
              </span>
            </div>

            <div className="rounded-[18px] border border-rose-500/20 bg-rose-500/10 px-4 py-4">
              <div className={metaLabelClassName()}>Error message</div>
              <div className="mt-2 break-words text-sm leading-6 text-rose-100">
                {error?.message || "Une erreur inconnue a interrompu la surface Settings."}
              </div>
            </div>

            {error?.digest ? (
              <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
                <div className={metaLabelClassName()}>Digest</div>
                <div className="mt-2 break-all text-sm text-zinc-300">
                  {error.digest}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className={actionLinkClassName("primary")}
              >
                Réessayer
              </button>

              <Link href="/overview" className={actionLinkClassName("soft")}>
                Retour Overview
              </Link>

              <Link href="/workspace" className={actionLinkClassName("default")}>
                Retour Workspace
              </Link>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Lecture rapide"
          subtitle="Ce que l’utilisateur doit comprendre immédiatement."
        >
          <div className="space-y-3 text-sm leading-6 text-zinc-300">
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
              Le shell principal reste intact.
            </div>
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
              L’erreur est isolée à la surface Settings.
            </div>
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
              Tu peux relancer la page ou revenir sur une autre surface BOSAI.
            </div>
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
