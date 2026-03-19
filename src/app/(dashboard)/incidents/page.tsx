import { fetchIncidents } from "../../../lib/api";

type IncidentItem = {
  id: string;
  title?: string;
  name?: string;
  error_id?: string;
  severity?: string;
  status?: string;
  statut_incident?: string;
  sla_status?: string;
  sla_remaining_minutes?: number;
  workspace_id?: string;
  linked_run?: string;
  created_at?: string;
  updated_at?: string;
};

function formatDate(value?: string) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function formatNumber(value?: number) {
  return typeof value === "number" ? value.toString() : "0";
}

function toneSeverity(severity?: string) {
  const s = (severity || "").toLowerCase();

  if (s === "critical" || s === "critique") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (s === "warning" || s === "medium" || s === "moyen") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (s === "low" || s === "faible" || s === "stable") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function toneSla(status?: string) {
  const s = (status || "").toLowerCase();

  if (s === "breached") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (s === "warning") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (s === "ok" || s === "healthy" || s === "stable") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getIncidentTitle(incident: IncidentItem) {
  return (
    incident.title ||
    incident.name ||
    incident.error_id ||
    `incident-${incident.id.slice(0, 8)}`
  );
}

function getIncidentStatus(incident: IncidentItem) {
  return incident.status || incident.statut_incident || "unknown";
}

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

export default async function IncidentsPage() {
  let data: any = null;

  try {
    data = await fetchIncidents();
  } catch {
    data = null;
  }

  const incidents: IncidentItem[] = data?.incidents ?? [];
  const stats = data?.stats ?? {};

  const openCount = stats?.open ?? incidents.length ?? 0;
  const criticalCount =
    stats?.critical ??
    incidents.filter((i) =>
      ["critical", "critique"].includes((i.severity || "").toLowerCase())
    ).length;

  const warningCount =
    stats?.warning ??
    incidents.filter((i) =>
      ["warning", "medium", "moyen"].includes((i.severity || "").toLowerCase())
    ).length;

  const breachedCount = incidents.filter(
    (i) => (i.sla_status || "").toLowerCase() === "breached"
  ).length;

  const visibleIncidents = [...incidents]
    .sort((a, b) => {
      return (
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime()
      );
    })
    .slice(0, 30);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Incidents
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
          Supervision opérationnelle des incidents, niveaux de gravité, statut
          SLA et signaux critiques du système BOSAI.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Open incidents</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {formatNumber(openCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Critical</div>
          <div className="mt-3 text-4xl font-semibold text-red-300">
            {formatNumber(criticalCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Warning</div>
          <div className="mt-3 text-4xl font-semibold text-amber-300">
            {formatNumber(warningCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">SLA breached</div>
          <div className="mt-3 text-4xl font-semibold text-red-300">
            {formatNumber(breachedCount)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Incident monitoring
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Vue consolidée des incidents visibles par BOSAI.
            </p>
          </div>

          <div className="text-sm text-zinc-500">
            {visibleIncidents.length} visible(s)
          </div>
        </div>

        {visibleIncidents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
            Aucun incident visible pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleIncidents.map((incident) => (
              <div
                key={incident.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      BOSAI INCIDENT
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-base font-semibold text-white break-all">
                        {getIncidentTitle(incident)}
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneSeverity(
                          incident.severity
                        )}`}
                      >
                        {(incident.severity || "unknown").toUpperCase()}
                      </span>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneSla(
                          incident.sla_status
                        )}`}
                      >
                        SLA {(incident.sla_status || "unknown").toUpperCase()}
                      </span>
                    </div>

                    <div className="text-sm text-zinc-400 break-all">
                      ID: <span className="text-zinc-300">{incident.id}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        Status:{" "}
                        <span className="text-zinc-300">
                          {getIncidentStatus(incident)}
                        </span>
                      </div>

                      <div>
                        Remaining SLA:{" "}
                        <span className="text-zinc-300">
                          {typeof incident.sla_remaining_minutes === "number"
                            ? `${incident.sla_remaining_minutes} min`
                            : "—"}
                        </span>
                      </div>

                      <div>
                        Workspace:{" "}
                        <span className="text-zinc-300">
                          {incident.workspace_id || "—"}
                        </span>
                      </div>

                      <div>
                        Linked run:{" "}
                        <span className="text-zinc-300">
                          {incident.linked_run || "—"}
                        </span>
                      </div>

                      <div>
                        Created:{" "}
                        <span className="text-zinc-300">
                          {formatDate(incident.created_at)}
                        </span>
                      </div>

                      <div>
                        Updated:{" "}
                        <span className="text-zinc-300">
                          {formatDate(incident.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-500 xl:min-w-[120px] xl:text-right">
                    INCIDENT SIGNAL
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
