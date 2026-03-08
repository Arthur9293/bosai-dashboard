import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

export default function OverviewPage() {
  return (
    <AppShell title="Overview">
      <PageHeader
        title="Overview"
        description="Vue globale du système BOSAI."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Health score" value="92" hint="Core stable" />
        <StatCard label="Commands queued" value="4" hint="À surveiller" />
        <StatCard label="Runs 24h" value="37" hint="Activité récente" />
        <StatCard label="Incidents actifs" value="2" hint="1 breached" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-lg font-medium">Activité récente</h3>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            <div className="rounded-xl border border-white/10 p-3">
              run_001 · command_orchestrator · done
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              run_002 · http_exec · error
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              run_003 · health_tick · done
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="text-lg font-medium">Incidents critiques</h3>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            <div className="rounded-xl border border-white/10 p-3">
              INC-001 · SLA breached · critical
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              INC-002 · endpoint timeout · high
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
