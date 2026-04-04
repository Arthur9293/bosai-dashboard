import Link from "next/link";
import { notFound } from "next/navigation";
import FlowGraphClient from "../FlowGraphClient";
import {
  fetchCommands,
  fetchIncidents,
  type CommandItem,
  type IncidentItem,
} from "@/lib/api";

type FlowStatus = "running" | "failed" | "retry" | "success" | "unknown";

type FlowGraphCommand = {
  id: string;
  capability?: string;
  status?: string;
  parent_command_id?: string;
  flow_id?: string;
};

type FlowSummary = {
  key: string;
  flowId: string;
  rootEventId: string;
  workspaceId: string;
  status: FlowStatus;
  steps: number;
  rootCapability: string;
  terminalCapability: string;
  durationMs: number;
  lastActivityTs: number;
  hasIncident: boolean;
  incidentCount: number;
  firstIncidentId?: string;
  commands: FlowGraphCommand[];
  readingMode?: "enriched" | "registry-only";
  sourceRecordId?: string;
  isPartial?: boolean;
};

type TimelineItem = {
  id: string;
  capability: string;
  status: string;
  parentCommandId: string;
  flowId: string;
  startedAt: string;
  finishedAt: string;
  worker: string;
  stepIndex: number;
  isRoot: boolean;
  isTerminal: boolean;
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

function formatDate(ts?: number): string {
  if (!ts || Number.isNaN(ts)) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(ts));
}

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0 || Number.isNaN(ms)) return "—";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function badgeTone(status: string) {
  const s = status.toLowerCase();

  if (s === "success" || s === "done") {
    return "border border-emerald-500/20 bg-emerald-500/15 text-emerald-300";
  }

  if (s === "running") {
    return "border border-sky-500/20 bg-sky-500/15 text-sky-300";
  }

  if (s === "failed" || s === "error") {
    return "border border-rose-500/20 bg-rose-500/15 text-rose-300";
  }

  if (s === "retry") {
    return "border border-violet-500/20 bg-violet-500/15 text-violet-300";
  }

  if (s === "partial") {
    return "border border-amber-500/20 bg-amber-500/15 text-amber-300";
  }

  return "border border-zinc-700 bg-zinc-800 text-zinc-300";
}

function statCard(label: string, value: string | number) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-2 break-words text-3xl font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

function detailCard(label: string, value: string | number) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-3 break-words text-2xl font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

function idCard(label: string, value?: string) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/10 px-3 py-2">
        <div className="min-w-max font-mono text-sm text-zinc-200">
          {value || "Non disponible"}
        </div>
      </div>
    </div>
  );
}

function getCommandActivityTs(cmd: CommandItem): number {
  return Math.max(
    toTs(cmd.finished_at),
    toTs(cmd.updated_at),
    toTs(cmd.started_at),
    toTs(cmd.created_at)
  );
}

function getCommandStartTs(cmd: CommandItem): number {
  return Math.max(toTs(cmd.started_at), toTs(cmd.created_at));
}

function toStepIndex(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function getStatusKind(
  status?: string
): "done" | "running" | "failed" | "retry" | "other" {
  const s = (status || "").toLowerCase();

  if (["done", "success", "resolved", "ok"].includes(s)) return "done";
  if (s === "retry") return "retry";
  if (["running", "queued", "pending", "open", "monitor"].includes(s)) {
    return "running";
  }
  if (["error", "failed", "dead", "breached"].includes(s)) return "failed";

  return "other";
}

function computeFlowStatus(commands: CommandItem[]): FlowStatus {
  const kinds = commands.map((cmd) => getStatusKind(text(cmd.status)));

  if (kinds.includes("running")) return "running";
  if (kinds.includes("failed")) return "failed";
  if (kinds.includes("retry")) return "retry";
  if (kinds.length > 0 && kinds.every((k) => k === "done" || k === "other")) {
    return "success";
  }

  return "unknown";
}

function getFlowStatusPriority(status: FlowStatus): number {
  if (status === "running") return 0;
  if (status === "failed") return 1;
  if (status === "retry") return 2;
  if (status === "success") return 3;
  return 4;
}

function buildExecutionOrder(commands: CommandItem[]): CommandItem[] {
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

function getTerminalCommand(commands: CommandItem[]): CommandItem | null {
  if (commands.length === 0) return null;

  const referencedAsParent = new Set(
    commands.map((cmd) => text(cmd.parent_command_id)).filter(Boolean)
  );

  const leafCandidates = commands.filter(
    (cmd) => !referencedAsParent.has(String(cmd.id))
  );

  const source = leafCandidates.length > 0 ? leafCandidates : commands;

  return [...source].sort(
    (a, b) => getCommandActivityTs(b) - getCommandActivityTs(a)
  )[0] ?? null;
}

function toGraphCommand(cmd: CommandItem): FlowGraphCommand {
  return {
    id: String(cmd.id),
    capability: text(cmd.capability) || undefined,
    status: text(cmd.status) || undefined,
    parent_command_id: text(cmd.parent_command_id) || undefined,
    flow_id: text(cmd.flow_id) || undefined,
  };
}

function getCommandGroupKey(cmd: CommandItem): string {
  const flowId = text(cmd.flow_id);
  if (flowId) return `flow:${flowId}`;

  const rootEventId = text(cmd.root_event_id);
  if (rootEventId) return `root:${rootEventId}`;

  return "";
}

function getIncidentGroupKey(incident: IncidentItem): string {
  const flowId = text(incident.flow_id);
  if (flowId) return `flow:${flowId}`;

  const rootEventId =
    text(incident.root_event_id) ||
    text(incident.linked_run) ||
    text(incident.run_record_id) ||
    text(incident.id);

  if (rootEventId) return `root:${rootEventId}`;

  return "";
}

function computeIncidentOnlyStatus(incident: IncidentItem): FlowStatus {
  const raw = [
    text(incident.status),
    text(incident.statut_incident),
    text(incident.sla_status),
    text(incident.decision_status),
  ]
    .join(" ")
    .toLowerCase();

  if (
    raw.includes("failed") ||
    raw.includes("error") ||
    raw.includes("breach") ||
    raw.includes("échec")
  ) {
    return "failed";
  }

  if (raw.includes("retry")) {
    return "retry";
  }

  if (
    raw.includes("resolved") ||
    raw.includes("closed") ||
    raw.includes("done") ||
    raw.includes("success")
  ) {
    return "success";
  }

  if (
    raw.includes("open") ||
    raw.includes("monitor") ||
    raw.includes("warning") ||
    raw.includes("running")
  ) {
    return "running";
  }

  return "running";
}

function buildFlowSummaries(
  commands: CommandItem[],
  incidents: IncidentItem[]
): FlowSummary[] {
  const commandGroups = new Map<string, CommandItem[]>();

  for (const cmd of commands) {
    const key = getCommandGroupKey(cmd);
    if (!key) continue;

    const existing = commandGroups.get(key) ?? [];
    existing.push(cmd);
    commandGroups.set(key, existing);
  }

  const incidentGroups = new Map<string, IncidentItem[]>();

  for (const incident of incidents) {
    const key = getIncidentGroupKey(incident);
    if (!key) continue;

    const existing = incidentGroups.get(key) ?? [];
    existing.push(incident);
    incidentGroups.set(key, existing);
  }

  const summaries: FlowSummary[] = [];

  for (const [key, group] of commandGroups.entries()) {
    const ordered = buildExecutionOrder(group);
    const rootCommand = ordered[0] ?? null;
    const terminalCommand = getTerminalCommand(ordered);

    const flowId =
      ordered.map((cmd) => text(cmd.flow_id)).find(Boolean) || "";
    const rootEventId =
      ordered.map((cmd) => text(cmd.root_event_id)).find(Boolean) || "";
    const workspaceId =
      ordered.map((cmd) => text(cmd.workspace_id)).find(Boolean) || "production";

    const matchingIncidents = incidents.filter((incident) => {
      const incidentFlowId = text(incident.flow_id);
      const incidentRootId = text(incident.root_event_id);

      return (
        (flowId && incidentFlowId === flowId) ||
        (rootEventId && incidentRootId === rootEventId)
      );
    });

    const lastActivityTs = Math.max(...ordered.map(getCommandActivityTs), 0);

    const validStarts = ordered.map(getCommandStartTs).filter((ts) => ts > 0);
    const earliestStartTs =
      validStarts.length > 0 ? Math.min(...validStarts) : 0;

    const durationMs =
      earliestStartTs > 0 && lastActivityTs > 0
        ? Math.max(0, lastActivityTs - earliestStartTs)
        : 0;

    const status = computeFlowStatus(ordered);

    summaries.push({
      key,
      flowId: flowId || rootEventId || key,
      rootEventId: rootEventId || "—",
      workspaceId,
      status,
      steps: ordered.length,
      rootCapability: text(rootCommand?.capability) || "Non disponible",
      terminalCapability:
        text(terminalCommand?.capability) || "Non disponible",
      durationMs,
      lastActivityTs,
      hasIncident: matchingIncidents.length > 0,
      incidentCount: matchingIncidents.length,
      firstIncidentId: text(matchingIncidents[0]?.id) || undefined,
      commands: ordered.map(toGraphCommand),
      readingMode: "enriched",
      sourceRecordId: undefined,
      isPartial: false,
    });
  }

  for (const [key, group] of incidentGroups.entries()) {
    if (commandGroups.has(key)) continue;

    const first = group[0];
    const flowId = text(first.flow_id) || key.replace(/^flow:/, "");
    const sourceRecordId =
      text(first.root_event_id) ||
      text(first.linked_run) ||
      text(first.run_record_id) ||
      text(first.id) ||
      key.replace(/^root:/, "");

    const workspaceId =
      text(first.workspace_id) || text(first.workspace) || "production";

    const lastActivityTs = Math.max(
      ...group.map((incident) =>
        Math.max(
          toTs(incident.updated_at),
          toTs(incident.created_at),
          toTs(incident.opened_at),
          toTs(incident.resolved_at)
        )
      ),
      0
    );

    summaries.push({
      key,
      flowId: flowId || sourceRecordId || key,
      rootEventId: sourceRecordId || "—",
      workspaceId,
      status: computeIncidentOnlyStatus(first),
      steps: 0,
      rootCapability: "Non disponible",
      terminalCapability: "Non disponible",
      durationMs: 0,
      lastActivityTs,
      hasIncident: group.length > 0,
      incidentCount: group.length,
      firstIncidentId: text(first.id) || undefined,
      commands: [],
      readingMode: "registry-only",
      sourceRecordId: sourceRecordId || undefined,
      isPartial: true,
    });
  }

  return summaries.sort((a, b) => {
    const priorityDiff =
      getFlowStatusPriority(a.status) - getFlowStatusPriority(b.status);
    if (priorityDiff !== 0) return priorityDiff;
    return b.lastActivityTs - a.lastActivityTs;
  });
}

function buildTimeline(commands: CommandItem[]): TimelineItem[] {
  const ordered = buildExecutionOrder(commands);

  const parentIds = new Set(
    ordered.map((cmd) => text(cmd.parent_command_id)).filter(Boolean)
  );

  return ordered.map((cmd, index) => {
    const id = String(cmd.id);
    const parentCommandId = text(cmd.parent_command_id);
    const isRoot = !parentCommandId;
    const isTerminal = !parentIds.has(id);

    return {
      id,
      capability: text(cmd.capability) || "Non disponible",
      status: text(cmd.status) || "unknown",
      parentCommandId,
      flowId: text(cmd.flow_id) || "",
      startedAt: text(cmd.started_at) || text(cmd.created_at) || "",
      finishedAt: text(cmd.finished_at) || "",
      worker: text(cmd.worker) || "—",
      stepIndex: toStepIndex(cmd.step_index, index + 1),
      isRoot,
      isTerminal,
    };
  });
}

function matchesRouteId(flow: FlowSummary, routeId: string): boolean {
  const candidates = [
    flow.flowId,
    flow.rootEventId,
    flow.key,
    flow.sourceRecordId || "",
  ].filter(Boolean);

  return candidates.some((candidate) => {
    return candidate === routeId || encodeURIComponent(candidate) === routeId;
  });
}

export default async function FlowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const routeId = decodeURIComponent(id);

  let allCommands: CommandItem[] = [];
  let allIncidents: IncidentItem[] = [];

  try {
    const data = await fetchCommands();
    allCommands = Array.isArray(data?.commands) ? data.commands : [];
  } catch {
    allCommands = [];
  }

  try {
    const data = await fetchIncidents();
    allIncidents = Array.isArray(data?.incidents) ? data.incidents : [];
  } catch {
    allIncidents = [];
  }

  const flows = buildFlowSummaries(allCommands, allIncidents);

  const flow =
    flows.find((item) => matchesRouteId(item, routeId)) ||
    flows.find((item) => item.flowId === routeId) ||
    null;

  if (!flow) {
    notFound();
  }

  const commandGroup = allCommands.filter((cmd) => {
    const cmdFlowId = text(cmd.flow_id);
    const cmdRootEventId = text(cmd.root_event_id);

    return (
      (flow.flowId && cmdFlowId === flow.flowId) ||
      (flow.rootEventId && cmdRootEventId === flow.rootEventId)
    );
  });

  const orderedCommands = buildExecutionOrder(commandGroup);
  const timeline = buildTimeline(commandGroup);

  const doneCount = orderedCommands.filter(
    (cmd) => getStatusKind(text(cmd.status)) === "done"
  ).length;

  const runningCount = orderedCommands.filter(
    (cmd) => getStatusKind(text(cmd.status)) === "running"
  ).length;

  const failedCount = orderedCommands.filter(
    (cmd) => getStatusKind(text(cmd.status)) === "failed"
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <Link
          href="/flows"
          className="inline-flex text-sm text-white/70 transition hover:text-white"
        >
          ← Retour aux flows
        </Link>

        <div className="text-xs uppercase tracking-[0.2em] text-white/40">
          Flow
        </div>

        <h1 className="break-words text-4xl font-semibold tracking-tight text-white">
          {flow.flowId}
        </h1>

        <p className="text-white/55">Vue détaillée du flow BOSAI.</p>

        <div className="flex flex-wrap gap-2 pt-2">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
              flow.status
            )}`}
          >
            {flow.status.toUpperCase()}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
            {flow.steps} steps
          </span>

          {flow.isPartial ? (
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                "partial"
              )}`}
            >
              PARTIAL
            </span>
          ) : null}
        </div>
      </div>

      {flow.readingMode === "registry-only" ? (
        <>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="text-lg font-semibold text-amber-200">
              Observabilité partielle
            </div>
            <p className="mt-2 text-sm text-amber-100/80">
              Ce flow est bien présent dans le registre BOSAI, mais aucune
              commande détaillée n’a encore été chargée pour construire la
              lecture causale complète.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {detailCard("Type de lecture", "Registry-only")}
            {idCard(
              "Source / Root record",
              flow.sourceRecordId || flow.rootEventId || "Non disponible"
            )}
            {detailCard("Workspace", flow.workspaceId || "production")}
            {detailCard(
              "Incident lié",
              flow.incidentCount > 0
                ? flow.incidentCount === 1
                  ? "1 incident"
                  : `${flow.incidentCount} incidents`
                : "Aucun incident"
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
              Identité du flow
            </div>

            <div className="grid gap-3 text-sm text-white/70 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                Flow:{" "}
                <span className="break-all text-zinc-200">{flow.flowId}</span>
              </div>
              <div>
                Root:{" "}
                <span className="break-all text-zinc-200">
                  {flow.rootEventId}
                </span>
              </div>
              <div>
                Workspace:{" "}
                <span className="text-zinc-200">{flow.workspaceId}</span>
              </div>
              <div>
                Activité:{" "}
                <span className="text-zinc-200">
                  {flow.lastActivityTs > 0
                    ? formatDate(flow.lastActivityTs)
                    : "Registre uniquement"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
              Aperçu graphique
            </div>

            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-lg text-zinc-400">
              Graphe indisponible pour ce flow pour le moment.
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCard("Commands", orderedCommands.length)}
            {statCard("Done", doneCount)}
            {statCard("Running/Queued", runningCount)}
            {statCard("Failed", failedCount)}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {detailCard("Root capability", flow.rootCapability || "Non disponible")}
            {detailCard(
              "Terminal capability",
              flow.terminalCapability || "Non disponible"
            )}
            {detailCard("Durée totale", formatDuration(flow.durationMs))}
            {detailCard(
              "Incident lié",
              flow.incidentCount > 0
                ? flow.incidentCount === 1
                  ? "1 incident"
                  : `${flow.incidentCount} incidents`
                : "Aucun incident"
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
              Flow identity
            </div>

            <div className="grid gap-3 text-sm text-white/70 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                Flow key:{" "}
                <span className="break-all text-zinc-200">{flow.flowId}</span>
              </div>
              <div>
                Root event:{" "}
                <span className="break-all text-zinc-200">
                  {flow.rootEventId}
                </span>
              </div>
              <div>
                Workspace:{" "}
                <span className="text-zinc-200">{flow.workspaceId}</span>
              </div>
              <div>
                Last step:{" "}
                <span className="text-zinc-200">{flow.terminalCapability}</span>
              </div>
              <div>
                Last activity:{" "}
                <span className="text-zinc-200">
                  {formatDate(flow.lastActivityTs)}
                </span>
              </div>
              <div>
                Last status:{" "}
                <span className="text-zinc-200">
                  {flow.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/50">
              Execution Graph
            </div>
            <p className="mb-4 text-sm text-white/55">
              Touchez un nœud du graphe pour aller directement à l’étape
              correspondante dans la timeline.
            </p>

            {flow.commands.length > 0 ? (
              <FlowGraphClient commands={flow.commands} />
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-lg text-zinc-400">
                Graphe indisponible pour ce flow pour le moment.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
              Execution Timeline
            </div>

            <div className="space-y-4">
              {timeline.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="break-all text-xl font-semibold text-white">
                      {item.capability}
                    </div>

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                        item.status
                      )}`}
                    >
                      {item.status.toUpperCase()}
                    </span>

                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                      STEP {item.stepIndex}
                    </span>

                    {item.isRoot ? (
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                        ROOT
                      </span>
                    ) : null}

                    {item.isTerminal ? (
                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                        TERMINAL
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-white/70 sm:grid-cols-2 xl:grid-cols-3">
                    <div>
                      ID:{" "}
                      <span className="break-all text-zinc-200">{item.id}</span>
                    </div>
                    <div>
                      Parent:{" "}
                      <span className="break-all text-zinc-200">
                        {item.parentCommandId || "—"}
                      </span>
                    </div>
                    <div>
                      Worker: <span className="text-zinc-200">{item.worker}</span>
                    </div>
                    <div>
                      Started:{" "}
                      <span className="text-zinc-200">
                        {item.startedAt ? formatDate(toTs(item.startedAt)) : "—"}
                      </span>
                    </div>
                    <div>
                      Finished:{" "}
                      <span className="text-zinc-200">
                        {item.finishedAt ? formatDate(toTs(item.finishedAt)) : "—"}
                      </span>
                    </div>
                    <div>
                      Flow:{" "}
                      <span className="break-all text-zinc-200">
                        {item.flowId || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {timeline.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
                  Aucune timeline détaillée disponible.
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
