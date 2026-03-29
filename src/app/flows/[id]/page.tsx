import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchFlowById,
  fetchIncidentsByFlowId,
  type FlowDetail,
  type IncidentItem,
} from "@/lib/api";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function badgeClass(value?: string) {
  const v = (value || "").toLowerCase();

  if (["done", "success", "resolved", "ok"].includes(v)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (["warning", "queued", "pending", "medium", "retry", "open"].includes(v)) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (["error", "failed", "critical", "dead"].includes(v)) {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }

  return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
}

function fmt(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleString("fr-FR");
}

function getFlowStatus(flow: FlowDetail) {
  const stats = flow.stats || {};

  if ((stats.error || 0) > 0 || (stats.dead || 0) > 0) return "FAILED";
  if ((stats.running || 0) > 0 || (stats.retry || 0) > 0) return "RUNNING";
  if ((stats.done || 0) > 0 && (flow.count || 0) === (stats.done || 0)) {
    return "SUCCESS";
  }
  if ((stats.done || 0) > 0) return "PARTIAL";

  return "UNKNOWN";
}

function getDoneCount(flow: FlowDetail) {
  return flow.stats?.done ?? 0;
}

function getFailedCount(flow: FlowDetail) {
  return (flow.stats?.error ?? 0) + (flow.stats?.dead ?? 0);
}

function getIncidentSortTs(incident: IncidentItem) {
  return new Date(
    incident.updated_at ||
      incident.opened_at ||
      incident.created_at ||
      incident.resolved_at ||
      0
  ).getTime();
}

export default async function FlowDetailPage({ params }: PageProps) {
  const { id } = await params;

  let flow: FlowDetail | null = null;

  try {
    flow = await fetchFlowById(decodeURIComponent(id));
  } catch {
    flow = null;
  }

  if (!flow) {
    notFound();
  }

  const effectiveFlowId = flow.flow_id || flow.id || id;

  let linkedIncident: IncidentItem | null = null;

  try {
    const incidents = await fetchIncidentsByFlowId(effectiveFlowId);
    const sortedIncidents = [...incidents].sort(
      (a, b) => getIncidentSortTs(b) - getIncidentSortTs(a)
    );
    linkedIncident = sortedIncidents[0] || null;
  } catch {
    linkedIncident = null;
  }

  const commands = Array.isArray(flow.commands) ? flow.commands : [];
  const sortedCommands = [...commands].sort((a, b) => {
    const aStep =
      typeof a.step_index === "number" ? a.step_index : Number.MAX_SAFE_INTEGER;
    const bStep =
      typeof b.step_index === "number" ? b.step_index : Number.MAX_SAFE_INTEGER;

    if (aStep !== bStep) return aStep - bStep;

    return (
      new Date(a.started_at || a.created_at || 0).getTime() -
      new Date(b.started_at || b.created_at || 0).getTime()
    );
  });

  const flowStatus = getFlowStatus(flow);
  const lastCommand =
    sortedCommands.length > 0 ? sortedCommands[sortedCommands.length - 1] : null;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/flows"
          className="mb-4 inline-flex text-sm text-white/60 transition hover:text-white"
        >
          ← Retour aux flows
        </Link>

        <div className="mb-3 text-xs uppercase tracking-[0.2em] text-white/40">
          Flow
        </div>

        <h1 className="break-all text-4xl font-semibold tracking-tight text-white">
          {effectiveFlowId}
        </h1>

        <p className="mt-2 text-white/55">Vue détaillée du flow BOSAI.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-white/50">Flow status</div>
          <div className="mt-4">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(
                flowStatus
              )}`}
            >
              {flowStatus}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-white/50">Commands</div>
          <div className="mt-4 text-5xl font-semibold text-white">
            {flow.count ?? sortedCommands.length}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-white/50">Done</div>
          <div className="mt-4 text-5xl font-semibold text-emerald-300">
            {getDoneCount(flow)}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-white/50">Failed</div>
          <div className="mt-4 text-5xl font-semibold text-rose-300">
            {getFailedCount(flow)}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
          Flow identity
        </div>

        <div className="grid gap-4 text-sm text-white/70 md:grid-cols-2 xl:grid-cols-3">
          <div>Flow key: {effectiveFlowId}</div>
          <div>Root event: {flow.root_event_id || "—"}</div>
          <div>Workspace: {flow.workspace_id || "production"}</div>
          <div>Last step: {lastCommand?.capability || "—"}</div>
          <div>Last activity: {fmt(lastCommand?.finished_at || lastCommand?.started_at || lastCommand?.created_at)}</div>
          <div>Last status: {flowStatus}</div>
        </div>
      </div>

      {linkedIncident ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
            Incident linkage
          </div>

          <div className="mb-3 text-2xl font-semibold text-white">
            {linkedIncident.title || linkedIncident.name || "Incident"}
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(
                linkedIncident.status
              )}`}
            >
              {linkedIncident.status || "UNKNOWN"}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(
                linkedIncident.severity
              )}`}
            >
              {linkedIncident.severity || "UNKNOWN"}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(
                linkedIncident.sla_status
              )}`}
            >
              {linkedIncident.sla_status || "NO SLA"}
            </span>
          </div>

          <div className="space-y-2 text-sm text-white/70">
            <div>Flow: {linkedIncident.flow_id || "—"}</div>
            <div>Root event: {linkedIncident.root_event_id || "—"}</div>
            <div>
              Command:{" "}
              {linkedIncident.command_id ||
                linkedIncident.linked_command ||
                "—"}
            </div>
            <div>Run: {linkedIncident.linked_run || "—"}</div>
            <div>Updated: {fmt(linkedIncident.updated_at)}</div>
          </div>

          <div className="mt-6">
            <Link
              href={`/incidents/${linkedIncident.id}`}
              className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Open incident
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          Aucun incident lié à ce flow.
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
          Execution timeline
        </div>

        <div className="space-y-4">
          {sortedCommands.length === 0 ? (
            <div className="text-sm text-white/60">
              Aucune commande dans ce flow.
            </div>
          ) : (
            sortedCommands.map((step, index) => (
              <div
                key={`${step.id || index}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-white">
                    {step.capability || "Unknown step"}
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${badgeClass(
                      step.status
                    )}`}
                  >
                    {step.status || "UNKNOWN"}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-zinc-300">
                    STEP {step.step_index ?? index + 1}
                  </span>
                </div>

                <div className="grid gap-2 text-sm text-white/65 md:grid-cols-2 xl:grid-cols-3">
                  <div>ID: {step.id || "—"}</div>
                  <div>Step: {step.step_index ?? "—"}</div>
                  <div>Parent command: {step.parent_command_id || "—"}</div>
                  <div>Worker: {step.worker || "—"}</div>
                  <div>Workspace: {step.workspace_id || "—"}</div>
                  <div>Started: {fmt(step.started_at)}</div>
                  <div>Finished: {fmt(step.finished_at)}</div>
                  <div>Flow: {step.flow_id || "—"}</div>
                  <div>Root event: {step.root_event_id || "—"}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
