import { DashboardCard } from "../../../components/ui/dashboard-card";

function skeletonClassName(height: string): string {
  return `animate-pulse rounded-2xl bg-white/[0.06] ${height}`;
}

export default function Loading() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className={skeletonClassName("h-4 w-28")} />
        <div className={skeletonClassName("h-12 w-72 max-w-full")} />
        <div className={skeletonClassName("h-6 w-full max-w-3xl")} />
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <div className={skeletonClassName("h-4 w-24")} />
            <div className={`mt-3 ${skeletonClassName("h-10 w-16")}`} />
            <div className={`mt-2 ${skeletonClassName("h-4 w-24")}`} />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard title="Chargement du registre Tools" subtitle="Lecture du cockpit en cours.">
          <div className="space-y-3">
            <div className={skeletonClassName("h-4 w-full")} />
            <div className={skeletonClassName("h-4 w-5/6")} />
            <div className={skeletonClassName("h-4 w-2/3")} />
          </div>
        </DashboardCard>

        <DashboardCard title="Registry status" subtitle="Récupération de la source active.">
          <div className="space-y-3">
            <div className={skeletonClassName("h-12 w-full")} />
            <div className={skeletonClassName("h-12 w-full")} />
            <div className={skeletonClassName("h-12 w-full")} />
          </div>
        </DashboardCard>
      </section>

      <section className="space-y-4">
        <div className={skeletonClassName("h-4 w-40")} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <DashboardCard key={index}>
              <div className="space-y-4">
                <div className={skeletonClassName("h-4 w-24")} />
                <div className={skeletonClassName("h-8 w-56 max-w-full")} />
                <div className={skeletonClassName("h-4 w-full")} />
                <div className={skeletonClassName("h-4 w-4/5")} />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className={skeletonClassName("h-20 w-full")} />
                  <div className={skeletonClassName("h-20 w-full")} />
                </div>

                <div className={skeletonClassName("h-11 w-full")} />
              </div>
            </DashboardCard>
          ))}
        </div>
      </section>
    </div>
  );
}
