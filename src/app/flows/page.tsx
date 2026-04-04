import FlowsClient from "./FlowsClient";
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
  return "";
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

type IncidentMatchInput = {
  flowId?: string;
  rootEventId?: string;
  sourceRecordId?: string;
  commands?: CommandItem[];
};

function recordText(obj: unknown, keys: string[]): string {
  const rec =
    obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};

  for (const key of keys) {
    const clean = text(rec[key]);
    if (clean) return clean;
  }

  return "";
}

function uniqueTexts(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => text(v)).filter(Boolean)));
}

function getCommandIncidentKeys(cmd: CommandItem): string[] {
  return uniqueTexts([
    String(cmd.id ?? ""),
    text(cmd.flow_id),
    text(cmd.root_event_id),
    recordText(cmd, [
      "linked_command",
      "linkedCommand",
      "command_id",
      "commandId",
      "Command_ID",
      "Linked_Command",
    ]),
    recordText(cmd, [
      "linked_run",
      "linkedRun",
      "run_record_id",
      "runRecordId",
      "run_id",
      "runId",
      "Run_Record_ID",
      "Linked_Run",
    ]),
  ]);
}

function getIncidentCandidates(incident: IncidentItem): string[] {
  const fields = (
    (incident as Record<string, unknown>).fields ?? {}
  ) as Record<string, unknown>;

  const pick = (...keys: string[]) =>
    uniqueTexts([recordText(incident, keys), recordText(fields, keys)]);

  return uniqueTexts([
    ...pick("id"),
    ...pick("flow_id", "flowId", "Flow_ID"),
    ...pick("root_event_id", "rootEventId", "Root_Event_ID"),
    ...pick("linked_command", "linkedCommand", "Linked_Command"),
    ...pick("command_id", "commandId", "Command_ID"),
    ...pick("linked_run", "linkedRun", "Linked_Run"),
    ...pick("run_record_id", "runRecordId", "Run_Record_ID"),
    ...pick("run_id", "runId", "Run_ID"),
    ...pick("name", "Name"),
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

  return [...enriched, ...registryOnly].sort((a, b) => {
    const priorityDiff =
      getFlowStatusPriority(a.status) - getFlowStatusPriority(b.status);
    if (priorityDiff !== 0) return priorityDiff;
    return b.lastActivityTs - a.lastActivityTs;
  });
}

export default async function FlowsPage() {
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

  const priorityFlow =
    flows.find((flow) => flow.status === "running") ||
    flows.find((flow) => flow.status === "failed") ||
    flows.find((flow) => flow.status === "retry") ||
    flows[0] ||
    null;

  return (
    <FlowsClient
      flows={flows}
      initialSelectedKey={priorityFlow?.key || ""}
      initialFilter="all"
    />
  );
}
