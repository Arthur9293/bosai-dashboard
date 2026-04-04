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
    toTs(cmd.finished_at),
    toTs(cmd.updated_at),
    toTs(cmd.started_at),
    toTs(cmd.created_at)
  );
}

function getCommandStartTs(cmd: CommandItem): number {
  return Math.max(toTs(cmd.started_at), toTs(cmd.created_at));
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
  if (kinds.length > 0 && kinds.every((k) => k === "done" || k === "other")) {
    return "success";
  }

  return "unknown";
}

function normalizeRegistryStatus(value: unknown): FlowStatus {
  const s = text(value).toLowerCase();

  if (["running", "queued", "pending", "open", "active"].includes(s)) {
    return "running";
  }

  if (["failed", "error", "dead"].includes(s)) {
    return "failed";
  }

  if (["retry"].includes(s)) {
    return "retry";
  }

  if (["done", "success", "resolved", "ok", "closed"].includes(s)) {
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

function getFlowGroupKey(cmd: CommandItem): string {
  const flowId = text(cmd.flow_id);
  if (flowId) return `flow:${flowId}`;

  const rootEventId = text(cmd.root_event_id);
  if (rootEventId) return `root:${rootEventId}`;

  return "";
}

function incidentMatchesFlow(
  incident: IncidentItem,
  flowId: string,
  rootEventId: string,
  commandIds: string[]
): boolean {
  const incidentFlowId = text(incident.flow_id);
  const incidentRootId = text(incident.root_event_id);
  const incidentCommandId = text(incident.command_id);
  const incidentLinkedCommand = text(incident.linked_command);

  if (flowId && incidentFlowId === flowId) return true;
  if (rootEventId && rootEventId !== "—" && incidentRootId === rootEventId) {
    return true;
  }

  if (
    commandIds.length > 0 &&
    (commandIds.includes(incidentCommandId) ||
      commandIds.includes(incidentLinkedCommand))
  ) {
    return true;
  }

  return false;
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

    const flowId =
      ordered.map((cmd) => text(cmd.flow_id)).find(Boolean) || "";
    const rootEventId =
      ordered.map((cmd) => text(cmd.root_event_id)).find(Boolean) || "—";
    const workspaceId =
      ordered.map((cmd) => text(cmd.workspace_id)).find(Boolean) ||
      "production";

    const lastActivityTs = Math.max(...ordered.map(getCommandActivityTs), 0);

    const validStarts = ordered.map(getCommandStartTs).filter((ts) => ts > 0);
    const earliestStartTs =
      validStarts.length > 0 ? Math.min(...validStarts) : 0;

    const durationMs =
      earliestStartTs > 0 && lastActivityTs > 0
        ? Math.max(0, lastActivityTs - earliestStartTs)
        : 0;

    const commandIds = ordered.map((cmd) => String(cmd.id));

    const matchedIncidents = incidents.filter((incident) =>
      incidentMatchesFlow(incident, flowId, rootEventId, commandIds)
    );

    const incidentCount = matchedIncidents.length;
    const firstIncidentId =
      matchedIncidents[0]?.id ? String(matchedIncidents[0].id) : undefined;

    const status = computeFlowStatus(ordered);

    summaries.push({
      key,
      flowId: flowId || rootEventId || key,
      rootEventId,
      workspaceId,
      status,
      steps: ordered.length,
      rootCapability: text(rootCommand?.capability) || "Non disponible",
      terminalCapability: text(terminalCommand?.capability) || "Non disponible",
      durationMs,
      lastActivityTs,
      hasIncident: incidentCount > 0,
      incidentCount,
      firstIncidentId,
      commands: ordered.map(toGraphCommand),
      readingMode: "enriched",
      sourceRecordId: undefined,
      isPartial: false,
    });
  }

  return summaries;
}

function getRegistryRecordStatus(flow: FlowDetail): FlowStatus {
  const raw =
    text((flow as Record<string, unknown>).status) ||
    text((flow as Record<string, unknown>).status_select) ||
    text((flow as Record<string, unknown>).flow_status) ||
    text((flow as Record<string, unknown>).last_status) ||
    text((flow as Record<string, unknown>).state);

  return normalizeRegistryStatus(raw);
}

function getRegistryActivityTs(flow: FlowDetail): number {
  const source = flow as Record<string, unknown>;

  return Math.max(
    toTs(source.updated_at as string | number | null | undefined),
    toTs(source.last_activity_ts as string | number | null | undefined),
    toTs(source.last_activity as string | number | null | undefined),
    toTs(source.created_at as string | number | null | undefined),
    toTs(source.opened_at as string | number | null | undefined)
  );
}

function buildRegistryOnlyFlowSummaries(
  registryFlows: FlowDetail[],
  incidents: IncidentItem[],
  enrichedFlows: FlowSummary[]
): FlowSummary[] {
  const enrichedFlowIds = new Set(
    enrichedFlows.map((flow) => text(flow.flowId)).filter(Boolean)
  );
  const enrichedRootIds = new Set(
    enrichedFlows.map((flow) => text(flow.rootEventId)).filter(Boolean)
  );

  const registryOnly: FlowSummary[] = [];

  for (const item of registryFlows) {
    const flowRecord = item as Record<string, unknown>;

    const flowId =
      text(item.flow_id) ||
      text(flowRecord.flowId) ||
      text(item.id) ||
      text(item.root_event_id);

    const rootEventId =
      text(item.root_event_id) ||
      text(flowRecord.rootEventId) ||
      text(item.id) ||
      "—";

    if (!flowId) continue;
    if (enrichedFlowIds.has(flowId)) continue;
    if (rootEventId !== "—" && enrichedRootIds.has(rootEventId)) continue;

    const workspaceId =
      text(item.workspace_id) ||
      text(flowRecord.workspaceId) ||
      text(flowRecord.workspace) ||
      "production";

    const lastActivityTs = getRegistryActivityTs(item);
    const sourceRecordId =
      text(item.id) || text(flowRecord.record_id) || rootEventId || flowId;

    const matchedIncidents = incidents.filter((incident) =>
      incidentMatchesFlow(incident, flowId, rootEventId, [])
    );

    const incidentCount = matchedIncidents.length;
    const firstIncidentId =
      matchedIncidents[0]?.id ? String(matchedIncidents[0].id) : undefined;

    registryOnly.push({
      key: `registry:${flowId}`,
      flowId,
      rootEventId,
      workspaceId,
      status: getRegistryRecordStatus(item),
      steps: 0,
      rootCapability: "Non disponible",
      terminalCapability: "Non disponible",
      durationMs: 0,
      lastActivityTs,
      hasIncident: incidentCount > 0,
      incidentCount,
      firstIncidentId,
      commands: [],
      readingMode: "registry-only",
      sourceRecordId,
      isPartial: true,
    });
  }

  return registryOnly;
}

function buildFlowSummaries(
  commands: CommandItem[],
  incidents: IncidentItem[],
  registryFlows: FlowDetail[]
): FlowSummary[] {
  const enrichedFlows = buildEnrichedFlowSummaries(commands, incidents);
  const registryOnlyFlows = buildRegistryOnlyFlowSummaries(
    registryFlows,
    incidents,
    enrichedFlows
  );

  return [...enrichedFlows, ...registryOnlyFlows].sort((a, b) => {
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

  const flows = buildFlowSummaries(allCommands, allIncidents, registryFlows);

  const initialSelectedKey =
    flows.find((flow) => flow.status === "running")?.key ||
    flows.find((flow) => flow.status === "failed")?.key ||
    flows.find((flow) => flow.status === "retry")?.key ||
    flows[0]?.key ||
    "";

  const initialFilter =
    flows.some((flow) => flow.status === "running")
      ? "running"
      : flows.some((flow) => flow.status === "failed")
      ? "failed"
      : flows.some((flow) => flow.status === "retry")
      ? "retry"
      : "all";

  return (
    <FlowsClient
      flows={flows}
      initialSelectedKey={initialSelectedKey}
      initialFilter={initialFilter}
    />
  );
}
