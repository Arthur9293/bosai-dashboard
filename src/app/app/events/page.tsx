export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Events
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Pipeline événementiel BOSAI. Cette page sera branchée sur les endpoints
          <code> /events</code>, <code>/event-mappings</code> et{" "}
          <code>/event-command-graph</code>.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-sm text-zinc-400">Placeholder Events V2</p>
      </div>
    </div>
  );
}
