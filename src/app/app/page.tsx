import { fetchRuns, fetchCommands, fetchHealthScore } from "@/lib/api";

export default async function OverviewPage() {
  let runs = null;
  let commands = null;
  let health = null;

  try {
    runs = await fetchRuns();
  } catch {}

  try {
    commands = await fetchCommands();
  } catch {}

  try {
    health = await fetchHealthScore();
  } catch {}

  const totalRuns = runs?.count ?? 0;
  const runningRuns = runs?.stats?.running ?? 0;

  const queuedCommands = commands?.stats?.queue ?? 0;
  const errorCommands = commands?.stats?.error ?? 0;

  const healthScore = health?.score ?? 0;

  return (
    <div className="space-y-8">

      <div>
        <h1 className="text-3xl font-semibold text-white">Overview</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Cockpit principal du workspace BOSAI.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">System Health</p>
          <p className="mt-3 text-3xl text-emerald-400 font-semibold">
            {healthScore}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Total Runs</p>
          <p className="mt-3 text-3xl text-white font-semibold">
            {totalRuns}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Running Runs</p>
          <p className="mt-3 text-3xl text-white font-semibold">
            {runningRuns}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Commands in Queue</p>
          <p className="mt-3 text-3xl text-white font-semibold">
            {queuedCommands}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-zinc-400">Command Errors</p>
          <p className="mt-3 text-3xl text-white font-semibold">
            {errorCommands}
          </p>
        </div>

      </section>

    </div>
  );
}
