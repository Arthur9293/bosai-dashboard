import Link from "next/link";
import { notFound } from "next/navigation";
import FlowGraphClient from "../FlowGraphClient";
import {
  fetchCommands,
  fetchFlows,
  fetchIncidents,
  type CommandItem,
  type FlowDetail,
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

function text(value: unknown): string {
  if (typeof value === "string") {
    const v = value.trim();
    return v || "";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function uniqueTexts(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => text(v)).filter(Boolean)));
}

function flattenTextValues(value: unknown): string[] {
  if (value === null || value === undefined) return [];

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const clean = text(value);
    return clean ? [clean] : [];
  }

  if (Array.isArray(value)) {
    return uniqueTexts(value.flatMap((item) => flattenTextValues(item)));
  }

  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;

    return uniqueTexts([
      ...flattenTextValues(rec.id),
      ...flattenTextValues(rec.recordId),
      ...flattenTextValues(rec.record_id),
      ...flattenTextValues(rec.value),
      ...flattenTextValues(rec.name),
      ...flattenTextValues(rec.text),
      ...flattenTextValues(rec.label),
    ]);
  }

  return [];
}

function recordTexts(obj: unknown, keys: string[]): string[] {
  const rec =
    obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};

  return uniqueTexts(keys.flatMap((key) => flattenTextValues(rec[key])));
}

function toTs(value?: string | number | null): number {
  if (value === null || value === undefined || value === "") return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function getCommandActivityTs(cmd: CommandItem): number {
  return Math.max(
    toTs(cmd.finished_at as string | number | null | undefined),
    toTs(cmd.updated_at as string | number | null | undefined),
    toTs(cmd.started_at as string | number | null | undefined),
    toTs(cmd.created_at as string | number | null | undefined)
  );
}

function getCommandStartTs(cmd: CommandItem): number {
  return Math.max(
    toTs(cmd.started_at as string | number | null | undefined),
    toTs(cmd.created_at as string | number | null | undefined)
  );
}

function getIncidentActivityTs(incident: IncidentItem): number {
  return Math.max(
    toTs(incident.resolved_at as string | number | null | undefined),
    toTs(incident.updated_at as string | number | null | undefined),
    toTs(incident.opened_at as string | number | null | undefined),
    toTs(incident.created_at as string | number | null | undefined)
  );
}

function getStatusKind(
  status?: string
): "done" | "running" | "failed" | "retry" | "other" {
  const s = (status || "").toLowerCase();

  if (["done", "success", "resolved", "ok"].includes(s)) return "done";
  if (s === "retry") return "retry";
  if (["running", "queued", "pending"].includes(s)) return "running";
  if (["error", "failed", "dead"].includes(s)) return "failed";

  return "other";
}

function computeFlowStatus(commands: CommandItem[]): FlowStatus {
  const kinds = commands.map((cmd) => getStatusKind(cmd.status));

  if (kinds.includes("running")) return "running";
  if (kinds.includes("failed")) return "failed";
  if (kinds.includes("retry")) return "retry";

  if (
    kinds.length > 0 &&
    kinds.every((kind) => kind === "done" || kind === "other")
  ) {
    return "success";
  }

  return "unknown";
}

function getIncidentStatusKind(
  incident: IncidentItem
): "success" | "failed" | "retry" | "unknown" {
  const status = text(incident.status).toLowerCase();
  const slaStatus = text(incident.sla_status).toLowerCase();

  if (
    ["resolved", "closed", "done", "ok"].includes(status) ||
    ["resolved"].includes(slaStatus)
  ) {
    return "success";
  }

  if (status === "retry") {
    return "retry";
  }

  if (
    [
      "open",
      "opened",
      "new",
      "active",
      "escalated",
      "escalade",
      "escaladé",
      "warning",
    ].includes(status) ||
    ["open", "warning", "breached", "escalated"].includes(slaStatus)
  ) {
    return "failed";
  }

  return "unknown";
}

function computeIncidentOnlyStatus(group: IncidentItem[]): FlowStatus {
  const kinds = group.map(getIncidentStatusKind);

  if (kinds.includes("failed")) return "failed";
  if (kinds.includes("retry")) return "retry";
  if (kinds.length > 0 && kinds.every((kind) => kind === "success")) {
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

  return (
    [...source].sort((a, b) => getCommandActivityTs(b) - getCommandActivityTs(a))[0] ??
    null
  );
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

function getFlowGroupKey(cmd: CommandItem): string {
  const flowId = text(cmd.flow_id);
  if (flowId) return `flow:${flowId}`;

  const rootEventId = text(cmd.root_event_id);
  if (rootEventId) return `root:${rootEventId}`;

  return "";
}

function getIncidentGroupKey(incident: IncidentItem): string {
  const flowId = text(incident.flow_id);
  if (flowId) return `incident-flow:${flowId}`;

  const rootEventId = text(incident.root_event_id);
  if (rootEventId) return `incident-root:${rootEventId}`;

  return "";
}

type IncidentMatchInput = {
  flowId?: string;
  rootEventId?: string;
  sourceRecordId?: string;
  commands?: CommandItem[];
};

function getCommandIncidentKeys(cmd: CommandItem): string[] {
  const inputObj =
    cmd.input && typeof cmd.input === "object"
      ? (cmd.input as Record<string, unknown>)
      : {};
  const resultObj =
    cmd.result && typeof cmd.result === "object"
      ? (cmd.result as Record<string, unknown>)
      : {};

  return uniqueTexts([
    String(cmd.id ?? ""),
    text(cmd.flow_id),
    text(cmd.root_event_id),

    ...recordTexts(cmd, [
      "linked_command",
      "linkedCommand",
      "linked_command_id",
      "linkedCommandId",
      "command_id",
      "commandId",
      "Command_ID",
      "Linked_Command",
      "Linked_Command_ID",
    ]),

    ...recordTexts(cmd, [
      "linked_run",
      "linkedRun",
      "run_record_id",
      "runRecordId",
      "run_id",
      "runId",
      "Run_Record_ID",
      "Run_ID",
      "Linked_Run",
    ]),

    ...recordTexts(inputObj, [
      "linked_command",
      "linkedCommand",
      "linked_command_id",
      "linkedCommandId",
      "command_id",
      "commandId",
      "Command_ID",
      "Linked_Command",
      "Linked_Command_ID",
      "linked_run",
      "linkedRun",
      "run_record_id",
      "runRecordId",
      "run_id",
      "runId",
      "Run_Record_ID",
      "Run_ID",
      "Linked_Run",
      "flow_id",
      "flowId",
      "Flow_ID",
      "root_event_id",
      "rootEventId",
      "Root_Event_ID",
    ]),

    ...recordTexts(resultObj, [
      "linked_command",
      "linkedCommand",
      "linked_command_id",
      "linkedCommandId",
      "command_id",
      "commandId",
      "Command_ID",
      "Linked_Command",
      "Linked_Command_ID",
      "linked_run",
      "linkedRun",
      "run_record_id",
      "runRecordId",
      "run_id",
      "runId",
      "Run_Record_ID",
      "Run_ID",
      "Linked_Run",
      "flow_id",
      "flowId",
      "Flow_ID",
      "root_event_id",
      "rootEventId",
      "Root_Event_ID",
    ]),
  ]);
}

function getIncidentCandidates(incident: IncidentItem): string[] {
  const fields =
    incident && typeof incident === "object"
      ? (((incident as Record<string, unknown>).fields ?? {}) as Record<
          string,
          unknown
        >)
      : {};

  const topLevel = (keys: string[]) => recordTexts(incident, keys);
  const nestedFields = (keys: string[]) => recordTexts(fields, keys);

  return uniqueTexts([
    ...topLevel(["id"]),
    ...topLevel(["title", "Title", "name", "Name"]),

    ...topLevel(["flow_id", "flowId", "Flow_ID"]),
    ...nestedFields(["flow_id", "flowId", "Flow_ID"]),

    ...topLevel(["root_event_id", "rootEventId", "Root_Event_ID"]),
    ...nestedFields(["root_event_id", "rootEventId", "Root_Event_ID"]),

    ...topLevel([
      "linked_command",
      "linkedCommand",
      "linked_command_id",
      "linkedCommandId",
      "Linked_Command",
      "Linked_Command_ID",
      "command_id",
      "commandId",
      "Command_ID",
    ]),
    ...nestedFields([
      "linked_command",
      "linkedCommand",
      "linked_command_id",
      "linkedCommandId",
      "Linked_Command",
      "Linked_Command_ID",
      "command_id",
      "commandId",
      "Command_ID",
    ]),

    ...topLevel([
      "linked_run",
      "linkedRun",
      "run_record_id",
      "runRecordId",
      "run_id",
      "runId",
      "Linked_Run",
      "Run_Record_ID",
      "Run_ID",
    ]),
    ...nestedFields([
      "linked_run",
      "linkedRun",
      "run_record_id",
      "runRecordId",
      "run_id",
      "runId",
      "Linked_Run",
      "Run_Record_ID",
      "Run_ID",
    ]),

    ...topLevel([
      "incident_record_id",
      "incidentRecordId",
      "Incident_Record_ID",
      "incident_record",
      "incidentRecord",
      "Incident_Record",
    ]),
    ...nestedFields([
      "incident_record_id",
      "incidentRecordId",
      "Incident_Record_ID",
      "incident_record",
      "incidentRecord",
      "Incident_Record",
    ]),

    ...topLevel(["error_id", "errorId", "Error_ID"]),
    ...nestedFields(["error_id", "errorId", "Error_ID"]),
  ]);
}

function matchIncidents(
  incidents: IncidentItem[],
  input: IncidentMatchInput
): IncidentItem[] {
  const lookup = new Set(
    uniqueTexts([
      input.flowId || "",
      input.rootEventId || "",
      input.sourceRecordId || "",
      ...((input.commands ?? []).flatMap(getCommandIncidentKeys)),
    ])
  );

  if (lookup.size === 0) return [];

  return incidents.filter((incident) =>
    getIncidentCandidates(incident).some((candidate) => lookup.has(candidate))
  );
}

function buildEnrichedFlowSummaries(
  commands: CommandItem[],
  incidents: IncidentItem[]
): FlowSummary[] {
  const groups = new Map<string, CommandItem[]>();

  for (const cmd of commands) {
    const key = getFlowGroupKey(cmd);
    if (!key) continue;

    const existing = groups.get(key) ?? [];
    existing.push(cmd);
    groups.set(key, existing);
  }

  const summaries: FlowSummary[] = [];

  for (const [key, group] of groups.entries()) {
    const ordered = buildExecutionOrder(group);
    const rootCommand = ordered[0] ?? null;
    const terminalCommand = getTerminalCommand(ordered);

    const flowId = ordered.map((cmd) => text(cmd.flow_id)).find(Boolean) || "";
    const rootEventId =
      ordered.map((cmd) => text(cmd.root_event_id)).find(Boolean) || "";
    const workspaceId =
      ordered.map((cmd) => text(cmd.workspace_id)).find(Boolean) || "production";

    const lastActivityTs = Math.max(...ordered.map(getCommandActivityTs), 0);

    const validStarts = ordered.map(getCommandStartTs).filter((ts) => ts > 0);
    const earliestStartTs =
      validStarts.length > 0 ? Math.min(...validStarts) : 0;

    const durationMs =
      earliestStartTs > 0 && lastActivityTs > 0
        ? Math.max(0, lastActivityTs - earliestStartTs)
        : 0;

    const linkedIncidents = matchIncidents(incidents, {
      flowId,
      rootEventId,
      commands: ordered,
    });

    summaries.push({
      key,
      flowId: flowId || rootEventId || key,
      rootEventId: rootEventId || "—",
      workspaceId,
      status: computeFlowStatus(ordered),
      steps: ordered.length,
      rootCapability: text(rootCommand?.capability) || "Non disponible",
      terminalCapability: text(terminalCommand?.capability) || "Non disponible",
      durationMs,
      lastActivityTs,
      hasIncident: linkedIncidents.length > 0,
      incidentCount: linkedIncidents.length,
      firstIncidentId:
        linkedIncidents.length > 0 ? String(linkedIncidents[0].id) : undefined,
      commands: ordered.map(toGraphCommand),
      readingMode: "enriched",
      sourceRecordId: undefined,
      isPartial: false,
    });
  }

  return summaries;
}

function computeRegistryStatus(flow: FlowDetail): FlowStatus {
  const stats = flow.stats || {};

  const running = Number(stats.running || 0) + Number(stats.queued || 0) > 0;
  const failed = Number(stats.error || 0) + Number(stats.dead || 0) > 0;
  const retry = Number(stats.retry || 0) > 0;
  const success =
    Number(stats.done || 0) > 0 && !running && !failed && !retry;

  if (running) return "running";
  if (failed) return "failed";
  if (retry) return "retry";
  if (success) return "success";
  return "unknown";
}

function buildRegistryOnlyFlowSummaries(
  registryFlows: FlowDetail[],
  enrichedFlows: FlowSummary[],
  incidents: IncidentItem[]
): FlowSummary[] {
  const enrichedCandidates = new Set<string>();

  for (const flow of enrichedFlows) {
    [flow.flowId, flow.rootEventId, flow.sourceRecordId, flow.key]
      .filter(Boolean)
      .forEach((value) => enrichedCandidates.add(String(value)));
  }

  const summaries: FlowSummary[] = [];

  for (const flow of registryFlows) {
    const sourceRecordId = text(flow.id);
    const flowId =
      text(flow.flow_id) || sourceRecordId || text(flow.root_event_id);
    const rootEventId =
      text(flow.root_event_id) || sourceRecordId || flowId || "—";
    const workspaceId = text(flow.workspace_id) || "production";

    const shouldSkip = [sourceRecordId, flowId, rootEventId]
      .filter(Boolean)
      .some((value) => enrichedCandidates.has(String(value)));

    if (shouldSkip) {
      continue;
    }

    const linkedIncidents = matchIncidents(incidents, {
      flowId,
      rootEventId,
      sourceRecordId,
    });

    summaries.push({
      key: `registry:${sourceRecordId || flowId || rootEventId}`,
      flowId: flowId || rootEventId || "registry-flow",
      rootEventId: rootEventId || "—",
      workspaceId,
      status: computeRegistryStatus(flow),
      steps: 0,
      rootCapability: "Non disponible",
      terminalCapability: "Non disponible",
      durationMs: 0,
      lastActivityTs: 0,
      hasIncident: linkedIncidents.length > 0,
      incidentCount: linkedIncidents.length,
      firstIncidentId:
        linkedIncidents.length > 0 ? String(linkedIncidents[0].id) : undefined,
      commands: [],
      readingMode: "registry-only",
      sourceRecordId: sourceRecordId || rootEventId || flowId,
      isPartial: true,
    });
  }

  return summaries;
}

function buildIncidentOnlyFlowSummaries(
  incidents: IncidentItem[],
  existingFlows: FlowSummary[]
): FlowSummary[] {
  const existingCandidates = new Set<string>();

  for (const flow of existingFlows) {
    [flow.flowId, flow.rootEventId, flow.sourceRecordId, flow.key]
      .filter(Boolean)
      .forEach((value) => existingCandidates.add(String(value)));
  }

  const groups = new Map<string, IncidentItem[]>();

  for (const incident of incidents) {
    const flowId = text(incident.flow_id);
    const rootEventId = text(incident.root_event_id);

    if (!flowId && !rootEventId) {
      continue;
    }

    const shouldSkip = [flowId, rootEventId, String(incident.id || "")]
      .filter(Boolean)
      .some((value) => existingCandidates.has(String(value)));

    if (shouldSkip) {
      continue;
    }

    const key = getIncidentGroupKey(incident);
    if (!key) continue;

    const bucket = groups.get(key) ?? [];
    bucket.push(incident);
    groups.set(key, bucket);
  }

  const summaries: FlowSummary[] = [];

  for (const [key, group] of groups.entries()) {
    const latest =
      [...group].sort(
        (a, b) => getIncidentActivityTs(b) - getIncidentActivityTs(a)
      )[0] ?? null;

    if (!latest) continue;

    const flowId =
      text(latest.flow_id) ||
      text(latest.root_event_id) ||
      `incident-${String(latest.id || "")}`;

    const rootEventId = text(latest.root_event_id) || flowId;
    const workspaceId = text(latest.workspace_id) || "production";
    const lastActivityTs = Math.max(...group.map(getIncidentActivityTs), 0);

    summaries.push({
      key,
      flowId,
      rootEventId,
      workspaceId,
      status: computeIncidentOnlyStatus(group),
      steps: 0,
      rootCapability: "Incident",
      terminalCapability: "Incident",
      durationMs: 0,
      lastActivityTs,
      hasIncident: true,
      incidentCount: group.length,
      firstIncidentId: String(latest.id || ""),
      commands: [],
      readingMode: "registry-only",
      sourceRecordId: String(latest.id || rootEventId || flowId),
      isPartial: true,
    });
  }

  return summaries;
}

function buildAllFlowSummaries(
  commands: CommandItem[],
  registryFlows: FlowDetail[],
  incidents: IncidentItem[]
): FlowSummary[] {
  const enriched = buildEnrichedFlowSummaries(commands, incidents);
  const registryOnly = buildRegistryOnlyFlowSummaries(
    registryFlows,
    enriched,
    incidents
  );

  const incidentOnly = buildIncidentOnlyFlowSummaries(incidents, [
    ...enriched,
    ...registryOnly,
  ]);

  return [...enriched, ...registryOnly, ...incidentOnly].sort((a, b) => {
    const priorityDiff =
      getFlowStatusPriority(a.status) - getFlowStatusPriority(b.status);
    if (priorityDiff !== 0) return priorityDiff;
    return b.lastActivityTs - a.lastActivityTs;
  });
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

  if (s === "partial") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function formatFlowActivity(flow: FlowSummary): string {
  if (flow.lastActivityTs > 0) {
    return formatDate(flow.lastActivityTs);
  }

  if (flow.readingMode === "registry-only") {
    return "Registre uniquement";
  }

  return "—";
}

function incidentLabel(flow: FlowSummary): string {
  if (!flow.hasIncident || flow.incidentCount <= 0) {
    return "Aucun incident";
  }

  if (flow.incidentCount === 1) {
    return "1 incident";
  }

  return `${flow.incidentCount} incidents`;
}

function matchesRouteId(flow: FlowSummary, routeId: string): boolean {
  const cleanRouteId = decodeURIComponent(String(routeId || "")).trim();

  const candidates = [
    flow.sourceRecordId || "",
    flow.flowId || "",
    flow.rootEventId || "",
    flow.key || "",
  ]
    .map((value) => String(value).trim())
    .filter(Boolean);

  return candidates.some((candidate) => {
    return (
      candidate === cleanRouteId ||
      encodeURIComponent(candidate) === cleanRouteId
    );
  });
}

function timelineCommands(commands: FlowGraphCommand[]): FlowGraphCommand[] {
  return [...commands].sort((a, b) => {
    const aStep = Number((a as { step_index?: number }).step_index || 0);
    const bStep = Number((b as { step_index?: number }).step_index || 0);
    return aStep - bStep;
  });
}

export default async function FlowDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const routeId = resolvedParams.id;

  let allCommands: CommandItem[] = [];
  let allIncidents: IncidentItem[] = [];
  let registryFlows: FlowDetail[] = [];

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

  try {
    const data = await fetchFlows();
    registryFlows = Array.isArray(data?.flows) ? data.flows : [];
  } catch {
    registryFlows = [];
  }

  const flows = buildAllFlowSummaries(allCommands, registryFlows, allIncidents);

  const flow = flows.find((item) => matchesRouteId(item, routeId)) || null;

  if (!flow) {
    notFound();
  }

  const commandItems = allCommands.filter((cmd) => {
    const flowId = text(cmd.flow_id);
    const rootEventId = text(cmd.root_event_id);

    return (
      (flow.flowId && flowId === flow.flowId) ||
      (flow.rootEventId && rootEventId === flow.rootEventId)
    );
  });

  const orderedCommands = buildExecutionOrder(commandItems);

  const linkedIncidents = matchIncidents(allIncidents, {
    flowId: flow.flowId,
    rootEventId: flow.rootEventId,
    sourceRecordId: flow.sourceRecordId,
    commands: orderedCommands,
  });

  const doneCount = orderedCommands.filter(
    (cmd) => getStatusKind(cmd.status) === "done"
  ).length;
  const runningCount = orderedCommands.filter((cmd) =>
    ["running", "retry"].includes(getStatusKind(cmd.status))
  ).length;
  const failedCount = orderedCommands.filter(
    (cmd) => getStatusKind(cmd.status) === "failed"
  ).length;

  const timeline = timelineCommands(flow.commands);

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

        <h1 className="break-all text-4xl font-semibold tracking-tight text-white">
          {flow.flowId}
        </h1>

        <p className="text-white/55">Vue détaillée du flow BOSAI.</p>

        <div className="flex flex-wrap gap-2">
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
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Type de lecture</div>
              <div className="mt-2 text-xl font-semibold text-white">
                Registry-only
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Source / Root record</div>
              <div className="mt-2 break-all font-mono text-xl font-semibold text-white">
                {flow.sourceRecordId || "Non disponible"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Workspace</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {flow.workspaceId || "production"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Incident lié</div>
              <div className="mt-2 text-xl font-semibold text-white">
                {linkedIncidents.length > 0
                  ? linkedIncidents.length === 1
                    ? "1 incident"
                    : `${linkedIncidents.length} incidents`
                  : incidentLabel(flow)}
              </div>
            </div>
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
                <span className="text-zinc-200">{formatFlowActivity(flow)}</span>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Commands</div>
              <div className="mt-2 text-4xl font-semibold text-white">
                {orderedCommands.length}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Done</div>
              <div className="mt-2 text-4xl font-semibold text-emerald-300">
                {doneCount}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Running/Queued</div>
              <div className="mt-2 text-4xl font-semibold text-sky-300">
                {runningCount}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Failed</div>
              <div className="mt-2 text-4xl font-semibold text-rose-300">
                {failedCount}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Root capability</div>
              <div className="mt-2 break-all text-2xl font-semibold text-white">
                {flow.rootCapability}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Terminal capability</div>
              <div className="mt-2 break-all text-2xl font-semibold text-white">
                {flow.terminalCapability}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Durée totale</div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {formatDuration(flow.durationMs)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-zinc-400">Incident lié</div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {linkedIncidents.length > 0
                  ? linkedIncidents.length === 1
                    ? "1 incident"
                    : `${linkedIncidents.length} incidents`
                  : incidentLabel(flow)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">
              Flow identity
            </div>

            <div className="grid gap-3 text-sm text-white/70 sm:grid-cols-2 xl:grid-cols-3">
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
                <span className="text-zinc-200">{flow.status.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/50">
              Execution graph
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
              Execution timeline
            </div>

            <div className="space-y-4">
              {timeline.map((cmd, index) => {
                const step = index + 1;
                const isRoot = !cmd.parent_command_id;
                const isTerminal = index === timeline.length - 1;

                const originalCommand = orderedCommands.find(
                  (item) => String(item.id) === String(cmd.id)
                );

                return (
                  <div
                    key={cmd.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="break-all text-xl font-semibold text-white">
                        {cmd.capability || "unknown"}
                      </div>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                          cmd.status || "unknown"
                        )}`}
                      >
                        {(cmd.status || "unknown").toUpperCase()}
                      </span>

                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                        STEP {step}
                      </span>

                      {isRoot ? (
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                          ROOT
                        </span>
                      ) : null}

                      {isTerminal ? (
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                          TERMINAL
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-white/70">
                      <div>
                        ID:{" "}
                        <span className="break-all text-zinc-200">{cmd.id}</span>
                      </div>
                      <div>
                        Parent:{" "}
                        <span className="break-all text-zinc-200">
                          {cmd.parent_command_id || "—"}
                        </span>
                      </div>
                      <div>
                        Worker:{" "}
                        <span className="text-zinc-200">
                          {text(originalCommand?.worker) || "—"}
                        </span>
                      </div>
                      <div>
                        Started:{" "}
                        <span className="text-zinc-200">
                          {formatDate(
                            getCommandStartTs(
                              originalCommand || ({ id: cmd.id } as CommandItem)
                            )
                          )}
                        </span>
                      </div>
                      <div>
                        Finished:{" "}
                        <span className="text-zinc-200">
                          {formatDate(
                            getCommandActivityTs(
                              originalCommand || ({ id: cmd.id } as CommandItem)
                            )
                          )}
                        </span>
                      </div>
                      <div>
                        Flow: <span className="text-zinc-200">{flow.flowId}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {timeline.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-zinc-500">
                  Aucune timeline disponible pour ce flow.
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
