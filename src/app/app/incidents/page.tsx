import { PageHeader } from "../../../components/ui/page-header";
import { fetchIncidents } from "../../../lib/api";
import type { IncidentItem } from "../../../lib/types";

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function normalizeValue(value?: string) {
  return (value || "").trim().toLowerCase();
}

function severityTone(severity?: string) {
  const normalized = normalizeValue(severity);

  if (normalized === "critical") {
    return "border border-red-500/20 bg-red-500/10 text-red-300";
  }

  if (normalized === "warning" || normalized === "medium") {
    return "border border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  if (normalized === "info" || normalized === "low") {
    return "border border-sky-500/20 bg-sky-500/10 text-sky-300";
  }

  return "border border-zinc-700 bg-zinc-800 text-zinc-300";
}

function statusTone(status?: string) {
  const normalized = normalizeValue(status);

  if (normalized === "resolved" || normalized === "closed" || normalized === "done") {
    return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "open") {
    return "border border-red-500/20 bg-red-500/10 text-red-300";
  }

  if (normalized === "warning" || normalized === "investigating" || normalized === "pending") {
    return "border border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border border-zinc-700 bg-zinc-800 text-zinc-300";
}

function formatSeverity(severity?: string) {
  if (!severity) return "Unknown";

  const normalized = normalizeValue(severity);

  if (normalized === "critical") return "Critical";
  if (normalized === "warning") return "Warning";
  if (normalized === "medium") return "Medium";
  if (normalized === "low") return "Low";
  if (normalized === "info") return "Info";

  return severity;
}

function formatStatus(status?: string) {
  if (!status) return "Unknown";

  const normalized = normalizeValue(status);

  if (normalized === "open") return "Open";
  if (normalized === "resolved") return "Resolved";
  if (normalized === "closed") return "Closed";
  if (normalized === "done") return "Done";
  if (normalized === "investigating") return "Investigating";
  if (normalized === "pending") return "Pending";
  if (normalized === "warning") return "Warning";

  return status;
}

function getIncidentId(incident: IncidentItem) {
  return incident.id || "—";
}

function countOpenIncidents(incidents: IncidentItem[]) {
  return incidents.filter((incident) => {
    const status = normalizeValue(incident.status);
    return status === "open" || status === "investigating" || status === "pending";
  }).length;
}

function countCriticalIncidents(incidents: IncidentItem[]) {
  return incidents.filter(
    (incident) => normalizeValue(incident.severity) === "critical"
  ).length;
}

function countWarningIncidents(incidents: IncidentItem[]) {
  return incidents.filter((incident) => {
    const severity = normalizeValue(incident.severity);
    return severity === "warning" || severity === "medium";
  }).length;
}

function countResolvedIncidents(incidents: IncidentItem[]) {
  return incidents.filter((incident) => {
    const status = normalizeValue(incident.status);
    return status === "resolved" || status === "closed" || status === "done";
  }).length;
}

export default async function IncidentsPage() {
  let incidentsData = null;
  let loadError: string | null = null;

  try {
    incidentsData = await fetchIncidents();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Impossible de charger les incidents.";
  }

  const incidents = incidentsData?.incidents ?? [];
  const totalIncidents = incidentsData?.count ?? incidents.length ?? 0;

  const openIncidents =
    incidentsData?.stats?.open ?? countOpenIncidents(incidents);

  const criticalIncidents =
    incidentsData?.stats?.critical ?? countCriticalIncidents(incidents);

  const warningIncidents =
    incidentsData?.stats?.warning ?? countWarningIncidents(incidents);

  const resolvedIncidents =
    incidentsData?.stats?.resolved ?? countResolvedIncidents(incidents);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Incidents"
        description="Surveillance opérationnelle des incidents BOSAI et de leur statut."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Open</div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {openIncidents}
          </div>
          <p className="mt-2 text-sm text-zinc-500">Incidents ouverts</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Critical</div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {criticalIncidents}
          </div>
          <p className="mt-2 text-sm text-zinc-500">Incidents critiques</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Warning</div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {warningIncidents}
          </div>
          <p className="mt-2 text-sm text-zinc-500">Incidents à surveiller</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Resolved</div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {resolvedIncidents}
          </div>
          <p className="mt-2 text-sm text-zinc-500">Incidents résolus</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-6 py-5">
          <h2 className="text-lg font-semibold text-white">
            Incidents ({totalIncidents})
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Incidents visibles remontés par l’API BOSAI Worker.
          </p>
        </div>

        {loadError ? (
          <div className="px-6 py-6">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              Impossible de charger les incidents : {loadError}
            </div>
          </div>
        ) : incidents.length === 0 ? (
          <div className="px-6 py-8 text-sm text-zinc-400">
            Aucun incident trouvé.
          </div>
        ) : (
          <>
            <div className="hidden min-[980px]:block">
              <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1.1fr_1.1fr] gap-4 border-b border-zinc-800 px-6 py-4 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                <div>Title</div>
                <div>Severity</div>
                <div>Status</div>
                <div>Source</div>
                <div>Created</div>
                <div>Updated</div>
              </div>

              <div className="divide-y divide-zinc-800">
                {incidents.map((incident) => (
                  <div
                    key={getIncidentId(incident)}
                    className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1.1fr_1.1fr] gap-4 px-6 py-4 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="break-words font-medium text-zinc-200">
                        {incident.title || getIncidentId(incident)}
                      </div>
                      <div className="mt-1 break-words text-xs text-zinc-500">
                        {getIncidentId(incident)}
                      </div>
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${severityTone(
                          incident.severity
                        )}`}
                      >
                        {formatSeverity(incident.severity)}
                      </span>
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                          incident.status
                        )}`}
                      >
                        {formatStatus(incident.status)}
                      </span>
                    </div>

                    <div className="break-words text-zinc-300">
                      {incident.source || "—"}
                    </div>

                    <div className="text-zinc-400">
                      {formatDate(incident.created_at)}
                    </div>

                    <div className="text-zinc-400">
                      {formatDate(incident.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 p-4 min-[980px]:hidden">
              {incidents.map((incident) => (
                <div
                  key={getIncidentId(incident)}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-base font-semibold text-white">
                        {incident.title || "Untitled incident"}
                      </div>
                      <div className="mt-1 break-words text-xs text-zinc-500">
                        {getIncidentId(incident)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${severityTone(
                        incident.severity
                      )}`}
                    >
                      {formatSeverity(incident.severity)}
                    </span>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                        incident.status
                      )}`}
                    >
                      {formatStatus(incident.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Source
                      </div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {incident.source || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Created
                      </div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {formatDate(incident.created_at)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        Updated
                      </div>
                      <div className="mt-1 text-sm text-zinc-300">
                        {formatDate(incident.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
