import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";

type RunItem = {
  id?: string;
  run_id?: string;
  capability?: string;
  status?: string;
  worker?: string;
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
};

async function getRuns(): Promise<RunItem[]> {
  const res = await fetch("https://bosai-worker.onrender.com/runs", {
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.runs || [];
}

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("fr-FR");
  } catch {
    return value;
  }
}

function formatDuration(value?: number) {
  if (value === undefined || value === null) return "—";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

function statusClasses(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "done":
    case "success":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "error":
    case "failed":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "running":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    default:
      return "border-white/10 bg-white/5 text-white/70";
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
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">Recent Runs</h3>
          <div className="text-sm text-white/50">{runs.length} run(s)</div>
        </div>

        {runs.length === 0 ? (
          <div className="rounded-xl border border-white/10 p-4 text-sm text-white/50">
            Aucun run trouvé.
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <div
                key={run.id || run.run_id || Math.random()}
                className="rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-sm font-medium text-white">
                    {run.capability || "unknown_capability"}
                  </div>

                  <div
                    className={[
                      "rounded-full border px-2 py-1 text-xs",
                      statusClasses(run.status),
                    ].join(" ")}
                  >
                    {run.status || "unknown"}
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-white/60 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <div className="text-white/40">Run ID</div>
                    <div>{run.run_id || "—"}</div>
                  </div>

                  <div>
                    <div className="text-white/40">Worker</div>
                    <div>{run.worker || "—"}</div>
                  </div>

                  <div>
                    <div className="text-white/40">Started</div>
                    <div>{formatDate(run.started_at)}</div>
                  </div>

                  <div>
                    <div className="text-white/40">Duration</div>
                    <div>{formatDuration(run.duration_ms)}</div>
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
