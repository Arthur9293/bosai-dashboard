import {
  ControlPlaneShell,
  SectionCard,
  SidePanelCard,
} from "@/components/dashboard/ControlPlaneShell";

function skeletonClassName(size: "sm" | "md" | "lg" = "md"): string {
  if (size === "sm") {
    return "h-4 rounded-full bg-white/10 animate-pulse";
  }

  if (size === "lg") {
    return "h-10 rounded-2xl bg-white/10 animate-pulse";
  }

  return "h-6 rounded-full bg-white/10 animate-pulse";
}

function cardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-black/20 p-4";
}

export default function SlaLoading() {
  return (
    <ControlPlaneShell
      eyebrow="BOSAI Control Plane"
      title="SLA"
      description="Chargement de la surface SLA avec préservation du shell et du scope workspace."
      badges={[
        { label: "Loading", tone: "warning" },
        { label: "Workspace-aware", tone: "info" },
      ]}
      metrics={[
        { label: "OK", value: "—", toneClass: "text-emerald-300" },
        { label: "Warning", value: "—", toneClass: "text-amber-300" },
        { label: "Breached", value: "—", toneClass: "text-red-300" },
        { label: "Escalated", value: "—", toneClass: "text-rose-300" },
      ]}
      aside={
        <>
          <SidePanelCard title="Lecture SLA">
            <div className="space-y-4">
              <div className={skeletonClassName("md")} />
              <div className={skeletonClassName("md")} />
              <div className={skeletonClassName("sm")} />
              <div className={skeletonClassName("sm")} />
            </div>
          </SidePanelCard>

          <SidePanelCard title="Signal actif">
            <div className="space-y-4">
              <div className={skeletonClassName("lg")} />
              <div className={skeletonClassName("md")} />
              <div className={skeletonClassName("sm")} />
              <div className={skeletonClassName("sm")} />
            </div>
          </SidePanelCard>
        </>
      }
    >
      <SectionCard
        title="SLA posture"
        description="Chargement de la posture SLA."
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={cardClassName()}>
              <div className={skeletonClassName("sm")} />
              <div className="mt-3">
                <div className={skeletonClassName("lg")} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
          <div className={skeletonClassName("sm")} />
          <div className="mt-3 space-y-2">
            <div className={skeletonClassName("sm")} />
            <div className={skeletonClassName("sm")} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Needs attention"
        description="Chargement des signaux prioritaires."
        tone="attention"
      >
        <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6"
            >
              <div className="space-y-4">
                <div className={skeletonClassName("sm")} />
                <div className={skeletonClassName("lg")} />
                <div className={skeletonClassName("sm")} />
                <div className="grid grid-cols-2 gap-3">
                  <div className={skeletonClassName("md")} />
                  <div className={skeletonClassName("md")} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Stable signals"
        description="Chargement des signaux stables."
        tone="neutral"
      >
        <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6"
            >
              <div className="space-y-4">
                <div className={skeletonClassName("sm")} />
                <div className={skeletonClassName("lg")} />
                <div className={skeletonClassName("sm")} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </ControlPlaneShell>
  );
}
