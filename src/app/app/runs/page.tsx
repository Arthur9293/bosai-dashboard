export default function RunsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Runs</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Historique d’exécution BOSAI. Cette page sera branchée sur l’endpoint
          <code> /runs</code>.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-sm text-zinc-400">Placeholder Runs V2</p>
      </div>
    </div>
  );
}
