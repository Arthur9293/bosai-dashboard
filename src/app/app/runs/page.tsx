import { fetchRuns } from "@/lib/api";

function StatusBadge({ status }: { status?: string }) {
  const normalized = (status || "unknown").toLowerCase();

  const styles: Record<string, string> = {
    running: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
    done: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    success: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    error: "bg-red-500/15 text-red-300 border border-red-500/20",
    failed: "bg-red-500/15 text-red-300 border border-red-500/20",
    unsupported: "bg-orange-500/15 text-orange-300 border border-orange-500/20",
  };

  const className =
    styles[normalized] ||
    "bg-white/5 text-zinc-300 border border-white/10";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {status || "unknown"}
    </span>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function RunsPage() {
  let data = null;
  let errorMessage = "";

  try {
    data = await fetchRuns();
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Impossible de charger les runs.";
  }

  const runs = data?.runs ?? [];
  const count = data?.count ?? runs.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Runs
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Historique des exécutions BOSAI.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm font-medium text-zinc-400">Total Runs</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {count}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm font-medium text-zinc-400">Running</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {data?.stats?.running ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm font-medium text-zinc-400">Done</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {data?.stats?.done ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm font-medium text-zinc-400">Errors</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {data?.stats?.error ?? 0}
          </p>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Runs ({count})</h2>
        </div>

        {runs.length === 0 ? (
          <div className="px-5 py-8 text-sm text-zinc-400">
            Aucun run trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-white/10 bg-black/10 text-zinc-400">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Run ID</th>
                  <th className="px-5 py-3 text-left font-medium">Capability</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Worker</th>
                  <th className="px-5 py-3 text-left font-medium">Started</th>
                  <th className="px-5 py-3 text-left font-medium">Finished</th>
                </tr>
              </thead>

              <tbody>
                {runs.map((run, index) => (
                  <tr
                    key={run.id ?? run.run_id ?? `${run.capability}-${index}`}
                    className="border-b border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4 text-zinc-300">
                      <span className="font-mono text-xs">
                        {run.run_id || run.id || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white">
                      {run.capability || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-5 py-4 text-zinc-300">
                      {run.worker || "—"}
                    </td>
                    <td className="px-5 py-4 text-zinc-400">
                      {formatDate(run.started_at)}
                    </td>
                    <td className="px-5 py-4 text-zinc-400">
                      {formatDate(run.finished_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
