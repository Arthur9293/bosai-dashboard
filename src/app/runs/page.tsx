import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";

type Run = {
  id: string;
  run_id: string;
  capability: string;
  worker: string;
  status: string;
  started_at: string;
  finished_at: string;
};

async function getRuns(): Promise<Run[]> {
  try {
    const res = await fetch("https://bosai-worker.onrender.com/runs", {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Runs fetch failed");
      return [];
    }

    const data = await res.json();

    console.log("RUNS API RESPONSE:", data);

    if (!data || !data.runs) {
      return [];
    }

    return data.runs;
  } catch (err) {
    console.error("Runs error:", err);
    return [];
  }
}

export default async function RunsPage() {
  const runs = await getRuns();

  return (
    <AppShell title="Runs">
      <PageHeader
        title="Runs"
        description="Journal d’exécution runtime."
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 text-lg font-medium">
          Recent Runs ({runs.length})
        </div>

        {runs.length === 0 && (
          <div className="text-sm text-white/50">
            Aucun run trouvé.
          </div>
        )}

        <div className="space-y-3">
          {runs.map((run) => (
            <div
              key={run.id}
              className="rounded-xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex justify-between">
                <div className="text-sm font-semibold">
                  {run.capability}
                </div>

                <div className="text-xs text-white/60">
                  {run.status}
                </div>
              </div>

              <div className="mt-2 text-xs text-white/50">
                Worker: {run.worker}
              </div>

              <div className="text-xs text-white/50">
                Run ID: {run.run_id}
              </div>

              <div className="text-xs text-white/50">
                Started: {run.started_at}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
