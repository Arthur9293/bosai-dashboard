import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { RunsList } from "@/components/runs/runs-list";

async function getRuns() {
  try {
    const res = await fetch(
      "https://bosai-worker.onrender.com/runs",
      { cache: "no-store" }
    );

    const data = await res.json();
    return data.runs || [];
  } catch {
    return [];
  }
}

export default async function OverviewPage() {
  const runs = await getRuns();

  return (
    <AppShell title="Overview">
      <PageHeader
        title="Overview"
        description="Vue globale du système BOSAI."
      />

      {/* Metrics */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Worker Status"
          value="Healthy"
          hint="bosai-worker"
        />

        <StatCard
          label="Total Runs"
          value={runs.length}
          hint="recent executions"
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

      {/* Activity */}

      <div className="mt-8">
        <RunsList runs={runs.slice(0, 10)} />
      </div>
    </AppShell>
  );
}
