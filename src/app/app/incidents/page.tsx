import { fetchIncidents } from "@/lib/api";

function SeverityBadge({ severity }: { severity?: string }) {
  const normalized = (severity || "unknown").toLowerCase();

  const styles: Record<string, string> = {
    critique: "bg-red-500/15 text-red-300 border border-red-500/20",
    critical: "bg-red-500/15 text-red-300 border border-red-500/20",
    moyen: "bg-orange-500/15 text-orange-300 border border-orange-500/20",
    medium: "bg-orange-500/15 text-orange-300 border border-orange-500/20",
    faible: "bg-zinc-500/15 text-zinc-300 border border-zinc-500/20",
    low: "bg-zinc-500/15 text-zinc-300 border border-zinc-500/20",
  };

  const className =
    styles[normalized] ||
    "bg-white/5 text-zinc-300 border border-white/10";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {severity || "Unknown"}
    </span>
  );
}

function SlaBadge({ value }: { value?: string }) {
  const normalized = (value || "unknown").toLowerCase();

  const styles: Record<string, string> = {
    breached: "bg-red-500/15 text-red-300 border border-red-500/20",
    ok: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    warning: "bg-orange-500/15 text-orange-300 border border-orange-500/20",
  };

  const className =
    styles[normalized] ||
    "bg-white/5 text-zinc-300 border border-white/10";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {value || "Unknown"}
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

export default async function IncidentsPage() {
  let data = null;
  let errorMessage = "";

  try {
    data = await fetchIncidents();
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Impossible de charger les incidents.";
  }

  const incidents = data?.incidents ?? [];
  const count = data?.count ?? incidents.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Incidents
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Suivi des incidents et du statut SLA BOSAI.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">
            Incidents ({count})
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Incidents remontés depuis le worker et les logs d’erreurs.
          </p>
        </div>

        {errorMessage ? (
          <div className="px-5 py-6 text-sm text-red-300">{errorMessage}</div>
        ) : incidents.length === 0 ? (
          <div className="px-5 py-8 text-sm text-zinc-400">
            Aucun incident trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="border-b border-white/10 bg-black/10 text-zinc-400">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">ID</th>
                  <th className="px-5 py-3 text-left font-medium">Title</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Severity</th>
                  <th className="px-5 py-3 text-left font-medium">SLA</th>
                  <th className="px-5 py-3 text-left font-medium">Worker</th>
                  <th className="px-5 py-3 text-left font-medium">Created</th>
                </tr>
              </thead>

              <tbody>
                {incidents.map((incident, index) => (
                  <tr
                    key={incident.id ?? `${incident.title}-${index}`}
                    className="border-b border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className="px-5 py-4 text-zinc-300">
                      <span className="font-mono text-xs">
                        {incident.id || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white">
                      {incident.title || "Untitled incident"}
                    </td>
                    <td className="px-5 py-4 text-zinc-300">
                      {incident.status || "Unknown"}
                    </td>
                    <td className="px-5 py-4">
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td className="px-5 py-4">
                      <SlaBadge value={incident.sla_status} />
                    </td>
                    <td className="px-5 py-4 text-zinc-300">
                      {incident.worker || "—"}
                    </td>
                    <td className="px-5 py-4 text-zinc-400">
                      {formatDate(incident.created)}
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
