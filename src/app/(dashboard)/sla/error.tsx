"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ControlPlaneShell,
  SectionCard,
  SidePanelCard,
} from "@/components/dashboard/ControlPlaneShell";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex w-full items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15";
  }

  if (variant === "soft") {
    return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

export default function SlaError({ error, reset }: ErrorPageProps) {
  const safeMessage = useMemo(() => {
    const raw = String(error?.message || "").trim();
    if (!raw) return "La surface SLA a rencontré une erreur inattendue.";
    return raw;
  }, [error]);

  return (
    <ControlPlaneShell
      eyebrow="BOSAI Control Plane"
      title="SLA"
      description="Erreur isolée sur la surface SLA. Le shell global et la navigation restent préservés."
      badges={[
        { label: "Error boundary", tone: "danger" },
        { label: "Surface isolée", tone: "warning" },
      ]}
      metrics={[
        { label: "OK", value: "—", toneClass: "text-emerald-300" },
        { label: "Warning", value: "—", toneClass: "text-amber-300" },
        { label: "Breached", value: "—", toneClass: "text-red-300" },
        { label: "Escalated", value: "—", toneClass: "text-rose-300" },
      ]}
      actions={
        <>
          <button
            type="button"
            onClick={() => reset()}
            className={actionLinkClassName("primary")}
          >
            Recharger la surface
          </button>

          <Link href="/sla" className={actionLinkClassName("soft")}>
            Retour à SLA
          </Link>

          <Link href="/incidents" className={actionLinkClassName("danger")}>
            Voir Incidents
          </Link>
        </>
      }
      aside={
        <>
          <SidePanelCard title="Diagnostic">
            <div className="space-y-3 text-sm leading-6 text-white/70">
              <p>
                L’erreur est contenue au segment <span className="text-white/90">SLA</span>.
              </p>
              <p>
                Le core workspace/layout/session n’est pas rouvert.
              </p>
              {error?.digest ? (
                <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                    Digest
                  </div>
                  <div className="mt-2 break-all text-white/90">{error.digest}</div>
                </div>
              ) : null}
            </div>
          </SidePanelCard>

          <SidePanelCard title="Action">
            <div className="space-y-3 text-sm leading-6 text-white/70">
              <p>
                Tenter d’abord <span className="text-white/90">Recharger la surface</span>.
              </p>
              <p>
                Si l’erreur persiste, vérifier la lecture API de la page SLA ou du helper associé.
              </p>
            </div>
          </SidePanelCard>
        </>
      }
    >
      <SectionCard
        title="Erreur surface SLA"
        description="Le rendu a été interrompu sur cette page, mais le dashboard reste protégé."
        tone="attention"
      >
        <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 p-5 text-sm leading-6 text-rose-100/90">
          {safeMessage}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => reset()}
            className={actionLinkClassName("primary")}
          >
            Réessayer
          </button>

          <Link href="/sla" className={actionLinkClassName("soft")}>
            Liste SLA
          </Link>

          <Link href="/flows" className={actionLinkClassName("soft")}>
            Ouvrir Flows
          </Link>
        </div>
      </SectionCard>
    </ControlPlaneShell>
  );
}
