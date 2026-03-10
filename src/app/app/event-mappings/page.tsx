import { fetchEventMappings } from "@/lib/api";

export default async function EventMappingsPage() {
  let data = null;
  let error = "";

  try {
    data = await fetchEventMappings();
  } catch (err) {
    error = err instanceof Error ? err.message : "Unable to load mappings.";
  }

  const mappings = data?.mappings ?? [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Governance
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-white">
          Event Mappings
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          Configuration des correspondances Event → Capability.
        </p>
      </div>

      {error ? (
        <div className="text-rose-400 text-sm">{error}</div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-zinc-500">
              <tr>
                <th className="px-6 py-4">Event Type</th>
                <th className="px-6 py-4">Capability</th>
                <th className="px-6 py-4">Enabled</th>
                <th className="px-6 py-4">Priority</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m: any) => (
                <tr key={m.id} className="border-b border-white/5">
                  <td className="px-6 py-4">{m.event_type}</td>
                  <td className="px-6 py-4 text-emerald-400">{m.capability}</td>
                  <td className="px-6 py-4">{m.enabled ? "Yes" : "No"}</td>
                  <td className="px-6 py-4">{m.priority ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
