import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";

function skeletonCardClassName(): string {
  return "animate-pulse rounded-[18px] border border-white/10 bg-white/[0.04]";
}

function skeletonLineClassName(width: string): string {
  return `h-4 rounded-full bg-white/10 ${width}`;
}

export default function SettingsLoadingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Chargement de la surface Settings du cockpit BOSAI."
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5">
            <div className={skeletonLineClassName("w-20")} />
            <div className={`mt-4 h-10 rounded-full bg-white/10 ${index === 2 ? "w-28" : "w-20"}`} />
            <div className={skeletonLineClassName("mt-3 w-24")} />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <DashboardCard
          title="Workspace posture"
          subtitle="Préparation de la lecture workspace et quotas."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <div className="h-7 w-24 rounded-full bg-white/10" />
              <div className="h-7 w-20 rounded-full bg-white/10" />
              <div className="h-7 w-28 rounded-full bg-white/10" />
            </div>

            <div className={skeletonLineClassName("w-56")} />
            <div className={skeletonLineClassName("w-72")} />

            <div className="rounded-[18px] border border-white/10 bg-black/20 p-4">
              <div className={skeletonLineClassName("w-24")} />
              <div className={skeletonLineClassName("mt-3 w-full")} />
              <div className={skeletonLineClassName("mt-2 w-5/6")} />
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="h-11 w-40 rounded-full bg-white/10" />
              <div className="h-11 w-28 rounded-full bg-white/10" />
              <div className="h-11 w-24 rounded-full bg-white/10" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Workspace metadata"
          subtitle="Chargement des métadonnées produit."
        >
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className={skeletonLineClassName("w-24")} />
                <div className={skeletonLineClassName("w-28")} />
              </div>
            ))}
          </div>
        </DashboardCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <DashboardCard
            key={index}
            title={`Meter ${index + 1}`}
            subtitle="Chargement de la jauge."
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className={skeletonLineClassName("w-24")} />
                  <div className="mt-3 h-8 w-20 rounded-full bg-white/10" />
                </div>
                <div className="h-7 w-20 rounded-full bg-white/10" />
              </div>

              <div className="h-2 rounded-full bg-white/10" />

              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((__, subIndex) => (
                  <div
                    key={subIndex}
                    className="rounded-[18px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className={skeletonLineClassName("w-20")} />
                    <div className={skeletonLineClassName("mt-3 w-16")} />
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <DashboardCard
            key={index}
            title={index === 0 ? "Quota signals" : "Preview next run"}
            subtitle="Chargement des signaux opérationnels."
          >
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <div
                  key={rowIndex}
                  className={skeletonCardClassName()}
                >
                  <div className="p-4">
                    <div className={skeletonLineClassName("w-28")} />
                    <div className={skeletonLineClassName("mt-3 w-full")} />
                    <div className={skeletonLineClassName("mt-2 w-4/5")} />
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        ))}
      </section>
    </div>
  );
}
