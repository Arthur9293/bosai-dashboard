import Link from "next/link";
import { notFound } from "next/navigation";
import FlowGraphClient from "../FlowGraphClient";
import {
  fetchCommands,
  fetchIncidents,
  type CommandItem,
  type IncidentItem,
} from "@/lib/api";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type GraphCommand = {
  id: string;
  capability?: string;
  status?: string;
  parent_command_id?: string;
  flow_id?: string;
};

function text(value: unknown): string {
  if (typeof value === "string") {
    const v = value.trim();
    return v || "";
  }
  return "";
}

function toTs(value?: string | number | null): number {
  if (value === null || value === undefined || value === "") return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function getCommandActivityTs(cmd: CommandItem): number {
  return Math.max(
    toTs(cmd.finished_at),
    toTs(cmd.updated_at),
    toTs(cmd.started_at),
    toTs(cmd.created_at)
  );
}

function getStatusKind(
  status?: string
): "done" | "running" | "failed" | "other" {
  const s = (status || "").toLowerCase();

  if (["done", "success", "resolved", "ok"].includes(s)) return "done";
  if (["running", "queued", "pending", "retry"].includes(s)) return "running";
  if (["error", "failed", "dead"].includes(s)) return "failed";

  return "other";
}

function computeFlowStatus(
  commands: CommandItem[]
): "success" | "running" | "failed" | "unknown" {
  const kinds = commands.map((cmd) => getStatusKind(cmd.status));

  if (kinds.includes("failed")) return "failed";
  if (kinds.includes("running")) return "running";
  if (kinds.length > 0 && kinds.every((k) => k === "done" || k === "other")) {
    return "success";
  }

  return "unknown";
}

function badgeTone(status: string) {
  const s = status.toLowerCase();

  if (s === "success") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (s === "running") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (s === "failed") {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  if (s === "retry") {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function severityTone(value?: string) {
  const s = (value || "").toLowerCase();

  if (["critical", "high"].includes(s)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  if (["medium", "warning"].includes(s)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["low", "info"].includes(s)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function formatDate(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function getIncidentSortTs(incident: IncidentItem): number {
  return Math.max(
    toTs(incident.updated_at),
    toTs(incident.opened_at),
    toTs(incident.created_at),
    toTs(incident.resolved_at)
  );
}

function statCard(
  label: string,
  value: string | number,
  valueClassName = "text-white"
) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-2 text-xl font-semibold break-all ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}

function toGraphCommand(cmd: CommandItem): GraphCommand {
  return {
    id: String(cmd.id),
    capability: text(cmd.capability) || undefined,
    status: text(cmd.status) || undefined,
    parent_command_id: text(cmd.parent_command_id) || undefined,
    flow_id: text(cmd.flow_id) || undefined,
  };
}

function buildExecutionOrder(commands: CommandItem[]): CommandItem[] {
  if (commands.length <= 1) return [...commands];

  const byId = new Map<string, CommandItem>();
  const childrenMap = new Map<string, CommandItem[]>();

  for (const cmd of commands) {
    const id = String(cmd.id);
    byId.set(id, cmd);
    childrenMap.set(id, []);
  }

  const roots: CommandItem[] = [];

  for (const cmd of commands) {
    const parentId = text(cmd.parent_command_id);

    if (parentId && byId.has(parentId)) {
      childrenMap.get(parentId)?.push(cmd);
    } else {
      roots.push(cmd);
    }
  }

  const sortByActivityAsc = (a: CommandItem, b: CommandItem) =>
    getCommandActivityTs(a) - getCommandActivityTs(b);

  roots.sort(sortByActivityAsc);
  childrenMap.forEach((children) => children.sort(sortByActivityAsc));

  const ordered: CommandItem[] = [];
  const visited = new Set<string>();

  function walk(cmd: CommandItem) {
    const id = String(cmd.id);
    if (visited.has(id)) return;

    visited.add(id);
    ordered.push(cmd);

    const children = childrenMap.get(id) ?? [];
    for (const child of children) {
      walk(child);
    }
  }

  for (const root of roots) {
    walk(root);
  }

  const leftovers = commands
    .filter((cmd) => !visited.has(String(cmd.id)))
    .sort(sortByActivityAsc);

  for (const cmd of leftovers) {
    walk(cmd);
  }

  return ordered;
}

function getLatestCommand(commands: CommandItem[]): CommandItem | null {
  if (commands.length === 0) return null;

  return [...commands].sort(
    (a, b) => getCommandActivityTs(b) - getCommandActivityTs(a)
  )[0] ?? null;
}

export default async function FlowDetailPage({ params }: PageProps) {
  const { id } = await params;
  const requestedId = decodeURIComponent(id);

  let allCommands: CommandItem[] = [];

  try {
    const data = await fetchCommands();
    allCommands = Array.isArray(data?.commands) ? data.commands : [];
  } catch {
    allCommands = [];
  }

  const byFlowId = allCommands.filter(
    (cmd) => text(cmd.flow_id) === requestedId
  );

  const byRootEventId = allCommands.filter(
    (cmd) => text(cmd.root_event_id) === requestedId
  );

  const rawMatchedCommands = byFlowId.length > 0 ? byFlowId : byRootEventId;

  if (rawMatchedCommands.length === 0) {
    notFound();
  }

  const matchedCommands = buildExecutionOrder(rawMatchedCommands);
  const latestCommand = getLatestCommand(rawMatchedCommands);

  const effectiveFlowId =
    matchedCommands.map((cmd) => text(cmd.flow_id)).find(Boolean) || requestedId;

  const rootEventId =
    matchedCommands.map((cmd) => text(cmd.root_event_id)).find(Boolean) || "—";

  const workspaceId =
    matchedCommands.map((cmd) => text(cmd.workspace_id)).find(Boolean) ||
    "production";

  const flowStatus = computeFlowStatus(rawMatchedCommands);

  const doneCount = rawMatchedCommands.filter(
    (cmd) => getStatusKind(cmd.status) === "done"
  ).length;

  const runningCount = rawMatchedCommands.filter(
    (cmd) => getStatusKind(cmd.status) === "running"
  ).length;

  const failedCount = rawMatchedCommands.filter(
    (cmd) => getStatusKind(cmd.status) === "failed"
  ).length;

  const graphCommands = matchedCommands.map(toGraphCommand);

  const flowCommandIds = new Set(
    matchedCommands.map((cmd) => String(cmd.id)).filter(Boolean)
  );

  const flowRunIds = new Set(
    matchedCommands
      .flatMap((cmd) => [
        text(cmd.linked_run),
        text(cmd.run_record_id),
        text((cmd as Record<string, unknown>)["run_id"]),
      ])
      .filter(Boolean)
  );

  let linkedIncident: IncidentItem | null = null;

  try {
    const data = await fetchIncidents();
    const incidents = Array.isArray(data?.incidents) ? data.incidents : [];

    const candidates = incidents
      .filter((incident) => {
        const incidentFlowId = text(incident.flow_id);
        const incidentRootId = text(incident.root_event_id);

        const incidentCommandIds = [
          text(incident.command_id),
          text(incident.linked_command),
        ].filter(Boolean);

        const incidentRunIds = [
          text(incident.run_record_id),
          text(incident.linked_run),
          text(incident.run_id),
        ].filter(Boolean);

        const sameFlow =
          (effectiveFlowId && incidentFlowId === effectiveFlowId) ||
          (rootEventId !== "—" && incidentRootId === rootEventId);

        const sameCommand = incidentCommandIds.some((id) =>
          flowCommandIds.has(id)
        );

        const sameRun = incidentRunIds.some((id) => flowRunIds.has(id));

        return sameFlow || sameCommand || sameRun;
      })
      .sort((a, b) => getIncidentSortTs(b) - getIncidentSortTs(a));

    linkedIncident = candidates[0] ?? null;
  } catch {
    linkedIncident = null;
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-4">
      <div className="space-y-2">
        <Link
          href="/flows"
          className="inline-flex text-sm text-white/60 transition hover:text-white"
        >
          ← Retour aux flows
        </Link>

        <div className="text-xs uppercase tracking-[0.2em] text-white/40">
          Flow
        </div>

        <h1 className="break-all text-4xl font-semibold tracking-tight text-white">
          {effectiveFlowId}
        </h1>

        <p className="text-white/55">Vue détaillée du flow BOSAI.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
            flowStatus
          )}`}
        >
          {flowStatus.toUpperCase()}
        </span>

        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
          {matchedCommands.length} steps
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCard("Commands", matchedCommands.length)}
        {statCard("Done", doneCount, "text-emerald-300")}
        {statCard("Running/Queued", runningCount, "text-sky-300")}
        {statCard("Failed", failedCount, "text-rose-300")}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
          Flow identity
        </div>

        <div className="grid gap-3 text-sm text-white/70 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            Flow key:{" "}
            <span className="text-zinc-200 break-all">{effectiveFlowId}</span>
          </div>
          <div>
            Root event:{" "}
            <span className="text-zinc-200 break-all">{rootEventId}</span>
          </div>
          <div>
            Workspace: <span className="text-zinc-200">{workspaceId}</span>
          </div>
          <div>
            Last step:{" "}
            <span className="text-zinc-200">
              {text(latestCommand?.capability) || "—"}
            </span>
          </div>
          <div>
            Last activity:{" "}
            <span className="text-zinc-200">
              {formatDate(
                latestCommand?.finished_at ||
                  latestCommand?.started_at ||
                  latestCommand?.updated_at ||
                  latestCommand?.created_at
              )}
            </span>
          </div>
          <div>
            Last status:{" "}
            <span className="text-zinc-200">{flowStatus.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/50">
          Execution graph
        </div>
        <div className="mb-4 text-sm text-white/45">
          Touchez un nœud du graphe pour aller directement à l’étape correspondante dans la timeline.
        </div>

        <FlowGraphClient commands={graphCommands} anchorPrefix="cmd-" />
      </div>

      {linkedIncident ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
            Incident linkage
          </div>

          <div className="text-lg font-semibold text-white">
            {text(linkedIncident.title) ||
              text(linkedIncident.name) ||
              "Incident"}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                text(linkedIncident.status) || "unknown"
              )}`}
            >
              {(text(linkedIncident.status) || "UNKNOWN").toUpperCase()}
            </span>

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${severityTone(
                text(linkedIncident.severity) || "unknown"
              )}`}
            >
              {(text(linkedIncident.severity) || "NO SEVERITY").toUpperCase()}
            </span>

            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
              SLA {(text(linkedIncident.sla_status) || "—").toUpperCase()}
            </span>
          </div>

          <div className="mt-4 text-sm text-white/70 space-y-1">
            <div>
              Flow:{" "}
              <span className="text-zinc-200 break-all">
                {text(linkedIncident.flow_id) || "—"}
              </span>
            </div>
            <div>
              Root:{" "}
              <span className="text-zinc-200 break-all">
                {text(linkedIncident.root_event_id) || "—"}
              </span>
            </div>
            <div>
              Updated:{" "}
              <span className="text-zinc-200">
                {formatDate(linkedIncident.updated_at)}
              </span>
            </div>
          </div>

          {text(linkedIncident.id) ? (
            <div className="mt-4">
              <Link
                href={`/incidents/${encodeURIComponent(text(linkedIncident.id))}`}
                className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Ouvrir l’incident
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
          Execution timeline
        </div>

        <div className="space-y-3">
          {matchedCommands.map((step, index) => {
            const isRoot = index === 0;
            const isTerminal = index === matchedCommands.length - 1;

            return (
              <div
                id={`cmd-${step.id}`}
                key={`${step.id || index}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 scroll-mt-24"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-white">
                    {text(step.capability) || "Unknown capability"}
                  </div>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${badgeTone(
                      getStatusKind(step.status) === "done"
                        ? "success"
                        : getStatusKind(step.status) === "running"
                        ? "running"
                        : getStatusKind(step.status) === "failed"
                        ? "failed"
                        : text(step.status) || "unknown"
                    )}`}
                  >
                    {(text(step.status) || "UNKNOWN").toUpperCase()}
                  </span>

                  <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-zinc-300">
                    STEP {index + 1}
                  </span>

                  {isRoot ? (
                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-zinc-300">
                      ROOT
                    </span>
                  ) : null}

                  {isTerminal ? (
                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-zinc-300">
                      TERMINAL
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2 text-sm text-white/65 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    ID: <span className="text-zinc-200 break-all">{step.id}</span>
                  </div>
                  <div>
                    Parent:{" "}
                    <span className="text-zinc-200 break-all">
                      {text(step.parent_command_id) || "—"}
                    </span>
                  </div>
                  <div>
                    Worker:{" "}
                    <span className="text-zinc-200">
                      {text(step.worker) || "—"}
                    </span>
                  </div>
                  <div>
                    Started:{" "}
                    <span className="text-zinc-200">
                      {formatDate(step.started_at)}
                    </span>
                  </div>
                  <div>
                    Finished:{" "}
                    <span className="text-zinc-200">
                      {formatDate(step.finished_at)}
                    </span>
                  </div>
                  <div>
                    Flow:{" "}
                    <span className="text-zinc-200 break-all">
                      {text(step.flow_id) || "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
