import { fetchEventCommandGraph } from "@/lib/api";

export default async function EventGraphPage() {
  const data = await fetchEventCommandGraph();
  const rows = data.graph || [];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-white">
        Event → Command Graph
      </h1>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="p-3 text-left">Event</th>
              <th className="p-3 text-left">Capability</th>
              <th className="p-3 text-left">Command</th>
              <th className="p-3 text-left">Run</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r: any) => (
              <tr key={r.event_id} className="border-t border-zinc-800">
                <td className="p-3">{r.event_type}</td>
                <td className="p-3 text-emerald-400">{r.capability}</td>
                <td className="p-3">{r.command_id || "—"}</td>
                <td className="p-3">{r.run_id || "—"}</td>
                <td className="p-3">{r.run_status || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
