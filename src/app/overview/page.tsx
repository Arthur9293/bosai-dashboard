import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

async function getHealth() {
  const res = await fetch("https://bosai-worker.onrender.com/health", {
    cache: "no-store",
  });

  if (!res.ok) {
    return { ok: false };
  }

  return res.json();
}

async function getRuns() {
  const res = await fetch("https://bosai-worker.onrender.com/runs", {
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.runs || [];
}

export default async function OverviewPage() {
  const health = await getHealth();
  const runs = await getRuns();

  return (
    <AppShell title="Overview">
      <PageHeader
        title="Overview"
        description="Vue globale du système BOSAI."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Worker status"
          value={health.ok ? "Healthy" : "Offline"}
          hint="bosai-worker"
        />

        <StatCard
          label="Runs"
          value={String(runs.length)}
          hint="Recent executions"
        />

        <StatCard
          label="Environment"
          value="Production"
          hint="Vercel"
        />

        <StatCard
          label="System"
          value="BOSAI V1"
          hint="Core runtime"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-lg font-medium">Recent Runs</h3>

        <div className="mt-4 space-y-2 text-sm text-white/70">
          {runs.slice(0, 5).map((run: any) => (
            <div
              key={run.id}
              className="rounded-xl border border-white/10 p-3"
            >
              {run.capability} · {run.status}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
