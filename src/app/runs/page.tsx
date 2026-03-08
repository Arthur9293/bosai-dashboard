import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";

type Run = {
  id: string;
  run_id: string;
  capability: string;
  worker: string;
  status: string;
  started_at: string;
  finished_at?: string;
};

async function getRuns(): Promise<Run[]> {
  try {
    const res = await fetch("https://bosai-worker.onrender.com/runs", {
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();

    if (!data || !data.runs) {
      return [];
    }

    return data.runs;
  } catch {
    return [];
  }
}

function badgeClasses(status?: string) {
  const normalized = (status || "").toLowerCase();

  if (normalized === "done" || normalized === "success") {
    return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "running") {
    return "border border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  if (normalized === "error" || normalized === "failed") {
    return "border border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border border-white/10 bg-white/5 text-white/70";
}

export default async function RunsPage() {
  const runs = await getRuns();

  return (
    <AppShell title="Runs">
      <PageHeader
        title="Runs"
        description="Journal d’exécution runtime."
      />

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="text-lg font-medium">Recent Runs</div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
            {runs.length} run(s)
          </div>
        </div>

        {runs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/50">
            Aucun run trouvé.
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <div
                key={run.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-white">
                      {run.capability}
                    </div>
                    <div className="mt-1 text-xs text-white/45">
                      Worker: {run.worker}
                    </div>
                  </div>

                  <div className={`rounded-full px-3 py-1 text-xs ${badgeClasses(run.status)}`}>
                    {run.status}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-white/60 md:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <div className="text-white/35">Run ID</div>
                    <div className="mt-1 break-all">{run.run_id}</div>
                  </div>

                  <div>
                    <div className="text-white/35">Started</div>
                    <div className="mt-1">{run.started_at}</div>
                  </div>

                  <div>
                    <div className="text-white/35">Finished</div>
                    <div className="mt-1">{run.finished_at || "—"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
