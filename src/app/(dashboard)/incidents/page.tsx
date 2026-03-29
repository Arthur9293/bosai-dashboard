import Link from "next/link";
import { fetchIncidents } from "../../../lib/api";

type IncidentItem = {
  id: string;
  name?: string;
  Name?: string;
  status?: string;
  Status?: string;
  status_select?: string;
  Status_select?: string;
  severity?: string;
  Severity?: string;
  category?: string;
  Category?: string;
  reason?: string;
  Reason?: string;
  flow_id?: string;
  Flow_ID?: string;
  root_event_id?: string;
  Root_Event_ID?: string;
  run_record_id?: string;
  Run_Record_ID?: string;
  command_id?: string;
  Command_ID?: string;
  updated_at?: string;
  Updated_At?: string;
  opened_at?: string;
  Opened_At?: string;
  resolved_at?: string;
  Resolved_At?: string;
  workspace_id?: string;
  Workspace_ID?: string;
};

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function formatDate(value?: string) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function getIncidentName(item: IncidentItem) {
  return String(item.name || item.Name || "Incident").trim();
}

function getIncidentStatus(item: IncidentItem) {
  return String(
    item.status ||
      item.Status ||
      item.status_select ||
      item.Status_select ||
      "Unknown"
  ).trim();
}

function getIncidentSeverity(item: IncidentItem) {
  return String(item.severity || item.Severity || "unknown").trim();
}

function getIncidentCategory(item: IncidentItem) {
  return String(item.category || item.Category || "—").trim();
}

function getIncidentReason(item: IncidentItem) {
  return String(item.reason || item.Reason || "—").trim();
}

function getIncidentFlowId(item: IncidentItem) {
  return String(item.flow_id || item.Flow_ID || "").trim();
}

function getIncidentRootEventId(item: IncidentItem) {
  return String(item.root_event_id || item.Root_Event_ID || "").trim();
}

function getIncidentRunRecordId(item: IncidentItem) {
  return String(item.run_record_id || item.Run_Record_ID || "").trim();
}

function getIncidentCommandId(item: IncidentItem) {
  return String(item.command_id || item.Command_ID || "").trim();
}

function getIncidentOpenedAt(item: IncidentItem) {
  return item.opened_at || item.Opened_At;
}

function getIncidentUpdatedAt(item: IncidentItem) {
  return item.updated_at || item.Updated_At;
}

function getIncidentResolvedAt(item: IncidentItem) {
  return item.resolved_at || item.Resolved_At;
}

function getIncidentWorkspace(item: IncidentItem) {
  return String(item.workspace_id || item.Workspace_ID || "—").trim();
}

function statusTone(status?: string) {
  const s = (status || "").toLowerCase();

  if (s === "resolved" || s === "done" || s === "closed") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (s === "escalated") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (s === "open" || s === "active") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (s === "error" || s === "failed") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function severityTone(severity?: string) {
  const s = (severity || "").toLowerCase();

  if (s === "critical") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (s === "high") {
    return "bg-orange-500/15 text-orange-300 border border-orange-500/20";
  }

  if (s === "medium") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (s === "low") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function statusLabel(status?: string) {
  const s = (status || "").toLowerCase();

  if (s === "resolved" || s === "done" || s === "closed") return "RESOLVED";
  if (s === "escalated") return "ESCALATED";
  if (s === "open" || s === "active") return "OPEN";
  if (s === "error" || s === "failed") return "FAILED";

  return (status || "UNKNOWN").toUpperCase();
}

function severityLabel(severity?: string) {
  const s = (severity || "").toLowerCase();

  if (s === "critical") return "CRITICAL";
  if (s === "high") return "HIGH";
  if (s === "medium") return "MEDIUM";
  if (s === "low") return "LOW";

  return (severity || "UNKNOWN").toUpperCase();
}

export default async function IncidentsPage() {
  let data: any = null;

  try {
    data = await fetchIncidents();
  } catch {
    data = null;
  }

  const incidents: IncidentItem[] =
    data?.incidents || data?.items || data?.records || [];

  const normalized = incidents.map((item) => {
    const status = getIncidentStatus(item);
    const severity = getIncidentSeverity(item);
    const flowId = getIncidentFlowId(item);
    const openedAt = getIncidentOpenedAt(item);
    const updatedAt = getIncidentUpdatedAt(item);
    const resolvedAt = getIncidentResolvedAt(item);

    return {
      raw: item,
      id: item.id,
      name: getIncidentName(item),
      status,
      severity,
      category: getIncidentCategory(item),
      reason: getIncidentReason(item),
      flowId,
      rootEventId: getIncidentRootEventId(item),
      runRecordId: getIncidentRunRecordId(item),
      commandId: getIncidentCommandId(item),
      workspaceId: getIncidentWorkspace(item),
      openedAt,
      updatedAt,
      resolvedAt,
      sortDate: new Date(updatedAt || openedAt || resolvedAt || 0).getTime(),
    };
  });

  const sortedIncidents = [...normalized].sort((a, b) => b.sortDate - a.sortDate);

  const openIncidents = sortedIncidents.filter((item) =>
    ["open", "active"].includes(item.status.toLowerCase())
  );

  const escalatedIncidents = sortedIncidents.filter(
    (item) => item.status.toLowerCase() === "escalated"
  );

  const resolvedIncidents = sortedIncidents.filter((item) =>
    ["resolved", "done", "closed"].includes(item.status.toLowerCase())
  );

  const criticalIncidents = sortedIncidents.filter(
    (item) => item.severity.toLowerCase() === "critical"
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Incidents
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
          Vue orientée impact métier. Cette page permet de voir les incidents
          ouverts, escaladés et résolus, ainsi que leur lien avec les flows BOSAI.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Open incidents</div>
          <div className="mt-3 text-4xl font-semibold text-sky-300">
            {openIncidents.length}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Escalated</div>
          <div className="mt-3 text-4xl font-semibold text-amber-300">
            {escalatedIncidents.length}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Resolved</div>
          <div className="mt-3 text-4xl font-semibold text-emerald-300">
            {resolvedIncidents.length}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Critical</div>
          <div className="mt-3 text-4xl font-semibold text-red-300">
            {criticalIncidents.length}
          </div>
        </div>
      </section>

      {sortedIncidents.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-sm text-zinc-500">
          Aucun incident visible pour le moment.
        </section>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Active incidents</h2>
              <span className="text-sm text-zinc-400">
                {openIncidents.length + escalatedIncidents.length}
              </span>
            </div>

            {openIncidents.length + escalatedIncidents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-sm text-zinc-500">
                Aucun incident actif.
              </div>
            ) : (
              <div className="space-y-4">
                {[...openIncidents, ...escalatedIncidents].map((incident) => (
                  <article
                    key={incident.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                        BOSAI INCIDENT
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="break-all text-lg font-semibold text-white">
                          {incident.name}
                        </div>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                            incident.status
                          )}`}
                        >
                          {statusLabel(incident.status)}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${severityTone(
                            incident.severity
                          )}`}
                        >
                          {severityLabel(incident.severity)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                        <span>
                          Category: <span className="text-zinc-300">{incident.category}</span>
                        </span>
                        <span>
                          Reason: <span className="text-zinc-300">{incident.reason}</span>
                        </span>
                        <span>
                          Workspace:{" "}
                          <span className="text-zinc-300">{incident.workspaceId || "—"}</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        Opened:{" "}
                        <span className="text-zinc-300">{formatDate(incident.openedAt)}</span>
                      </div>
                      <div>
                        Updated:{" "}
                        <span className="text-zinc-300">{formatDate(incident.updatedAt)}</span>
                      </div>
                      <div>
                        Resolved:{" "}
                        <span className="text-zinc-300">{formatDate(incident.resolvedAt)}</span>
                      </div>

                      <div className="break-all">
                        Flow:{" "}
                        {incident.flowId ? (
                          <Link
                            href={`/flows/${encodeURIComponent(incident.flowId)}`}
                            className="text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                          >
                            {incident.flowId}
                          </Link>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </div>

                      <div className="break-all">
                        Root event:{" "}
                        <span className="text-zinc-300">{incident.rootEventId || "—"}</span>
                      </div>

                      <div className="break-all">
                        Run record:{" "}
                        <span className="text-zinc-300">{incident.runRecordId || "—"}</span>
                      </div>

                      <div className="break-all">
                        Command:{" "}
                        {incident.commandId ? (
                          <Link
                            href={`/commands/${encodeURIComponent(incident.commandId)}`}
                            className="text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                          >
                            {incident.commandId}
                          </Link>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </div>

                      <div className="md:col-span-2 xl:col-span-3">
                        Action suggested:{" "}
                        <span className="text-zinc-300">
                          {incident.status.toLowerCase() === "escalated"
                            ? "Review escalated incident"
                            : incident.severity.toLowerCase() === "critical"
                              ? "Prioritize immediate review"
                              : "Monitor flow and resolution"}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Resolved incidents</h2>
              <span className="text-sm text-zinc-400">{resolvedIncidents.length}</span>
            </div>

            {resolvedIncidents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-sm text-zinc-500">
                Aucun incident résolu.
              </div>
            ) : (
              <div className="space-y-4">
                {resolvedIncidents.map((incident) => (
                  <article
                    key={incident.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="mb-4 flex flex-col gap-3 border-b border-white/10 pb-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                        RESOLVED INCIDENT
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="break-all text-lg font-semibold text-white">
                          {incident.name}
                        </div>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                            incident.status
                          )}`}
                        >
                          {statusLabel(incident.status)}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${severityTone(
                            incident.severity
                          )}`}
                        >
                          {severityLabel(incident.severity)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        Resolved:{" "}
                        <span className="text-zinc-300">{formatDate(incident.resolvedAt)}</span>
                      </div>
                      <div>
                        Last update:{" "}
                        <span className="text-zinc-300">{formatDate(incident.updatedAt)}</span>
                      </div>
                      <div>
                        Workspace:{" "}
                        <span className="text-zinc-300">{incident.workspaceId || "—"}</span>
                      </div>
                      <div className="break-all">
                        Flow:{" "}
                        {incident.flowId ? (
                          <Link
                            href={`/flows/${encodeURIComponent(incident.flowId)}`}
                            className="text-zinc-300 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                          >
                            {incident.flowId}
                          </Link>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </div>
                      <div>
                        Category: <span className="text-zinc-300">{incident.category}</span>
                      </div>
                      <div>
                        Reason: <span className="text-zinc-300">{incident.reason}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
