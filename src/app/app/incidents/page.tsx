export default function IncidentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Incidents
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Cockpit incidents. Cette page sera branchée sur les endpoints
          <code> /incidents</code> et <code>/sla</code>.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-sm text-zinc-400">Placeholder Incidents V2</p>
      </div>
    </div>
  );
}
