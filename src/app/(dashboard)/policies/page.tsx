import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Policies"
        description="Vue de gouvernance BOSAI. Cette page affichera les règles, garde-fous, limites, approbations et politiques actives du système."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard>
          <div className="text-sm text-zinc-400">Policies loaded</div>
          <div className="mt-3 text-4xl font-semibold text-white">—</div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Approval required</div>
          <div className="mt-3 text-2xl font-semibold text-white">—</div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Retry limit</div>
          <div className="mt-3 text-4xl font-semibold text-white">—</div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Lock TTL</div>
          <div className="mt-3 text-4xl font-semibold text-white">—</div>
        </DashboardCard>
      </section>

      <DashboardCard
        title="Policy registry"
        subtitle="Placeholder V1 prêt. Cette page recevra bientôt les politiques réelles chargées par le worker BOSAI."
      >
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
          Aucune policy branchée pour le moment.
        </div>
      </DashboardCard>
    </div>
  );
}
