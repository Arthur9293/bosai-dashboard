export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-emerald-300">
          BOSAI Dashboard V2
        </div>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
          Overview
        </h1>

        <p className="mt-3 max-w-3xl text-sm text-zinc-400">
          Cockpit principal du workspace BOSAI. Vue consolidée du health score,
          des runs, des commandes et des incidents opérationnels.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "System Health", value: "—" },
          { label: "Total Runs", value: "—" },
          { label: "Queued Commands", value: "—" },
          { label: "Open Incidents", value: "—" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <p className="text-sm text-zinc-400">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white">Recent Runs</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Zone prête pour brancher l’endpoint <code>/runs</code>.
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white">Recent Commands</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Zone prête pour brancher l’endpoint <code>/commands</code>.
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold text-white">System Signals</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Zone prête pour brancher <code>/health</code> et{" "}
            <code>/health/score</code>.
          </p>
        </div>
      </section>
    </div>
  );
}
