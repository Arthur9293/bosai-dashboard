export default function CommandsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Commands
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          File d’exécution BOSAI. Cette page sera branchée sur l’endpoint
          <code> /commands</code>.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-sm text-zinc-400">Placeholder Commands V2</p>
      </div>
    </div>
  );
}
