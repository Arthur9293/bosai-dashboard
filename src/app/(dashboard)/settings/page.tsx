import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Configuration globale du système BOSAI (workspace, worker, environnement, options système)."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardCard>
          <div className="text-sm text-zinc-400">Workspace</div>
          <div className="mt-3 text-xl font-semibold text-white">
            production
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Worker</div>
          <div className="mt-3 text-xl font-semibold text-white">
            bosai-worker-01
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Environment</div>
          <div className="mt-3 text-xl font-semibold text-white">
            stable
          </div>
        </DashboardCard>
      </section>

      <DashboardCard
        title="System configuration"
        subtitle="V1 statique. Cette section accueillera les paramètres dynamiques du worker BOSAI."
      >
        <div className="space-y-3 text-sm text-zinc-400">
          <div className="flex justify-between">
            <span>Retry system</span>
            <span className="text-zinc-300">Enabled</span>
          </div>

          <div className="flex justify-between">
            <span>Lock system</span>
            <span className="text-zinc-300">Enabled</span>
          </div>

          <div className="flex justify-between">
            <span>Event engine</span>
            <span className="text-zinc-300">Active</span>
          </div>

          <div className="flex justify-between">
            <span>Policies</span>
            <span className="text-zinc-300">Loaded</span>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
