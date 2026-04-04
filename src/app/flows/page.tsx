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
type FlowFilter = "all" | FlowStatus;
type FlowReadMode = "causal" | "registry_only";

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
  incidentLabel: string;
  incidentStatus: string;
  incidentSeverity: string;
  incidentUpdatedTs: number;
  linkedRunId: string;
  sourceRecordId: string;
  readMode: FlowReadMode;
  partial: boolean;
  commands: FlowGraphCommand[];
};

type IncidentMatchContext = {
  flowId?: string;
  rootEventId?: string;
  linkedRunId?: string;
  sourceRecordId?: string;
};

function text(value: unknown): string {
  if (typeof value === "string") {
    const v = value.trim();
    return v || "";
  }
  return "";
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const v = text(value);
    if (v) return v;
  }
  return "";
}

function toTs(value?: string | number | null): number {
  if (value === null || value === undefined || value === "") return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function getCommandActivityTs(cmd?: CommandItem | null): number {
  if (!cmd) return 0;

  return Math.max(
    toTs(cmd.finished_at),
    toTs(cmd.updated_at),
    toTs(cmd.started_at),
    toTs(cmd.created_at)
  );
}

function getCommandStartTs(cmd?: CommandItem | null): number {
  if (!cmd) return 0;
  return Math.max(toTs(cmd.started_at), toTs(cmd.created_at));
}

function getIncidentActivityTs(incident?: IncidentItem | null): number {
  if (!incident) return 0;

  return Math.max(
    toTs(incident.updated_at),
    toTs(incident.resolved_at),
    toTs(incident.opened_at),
    toTs(incident.created_at),
    toTs(incident.last_action)
  );
}

function getStatusKind(
  status?: string
): "done" | "running" | "failed" | "retry" | "other" {
  const s = text(status).toLowerCase();

  if (["done", "success", "resolved", "ok"].includes(s)) return "done";
  if (s === "retry") return "retry";
  if (["running", "queued", "pending"].includes(s)) return "running";
  if (["error", "failed", "dead"].includes(s)) return "failed";

  return "other";
}

function computeFlowStatusFromCommands(commands: CommandItem[]): FlowStatus {
  const kinds = commands.map((cmd) => getStatusKind(cmd.status));

  if (kinds.includes("running")) return "running";
  if (kinds.includes("failed")) return "failed";
  if (kinds.includes("retry")) return "retry";

  if (kinds.length > 0 && kinds.every((k) => k === "done" || k === "other")) {
    return "success";
  }

  return "unknown";
}

function computeRegistryStatus(flow: FlowDetail): FlowStatus {
  const stats = flow.stats || {};

  const running = Number(stats.running || 0);
  const retry = Number(stats.retry || 0);
  const failed = Number(stats.error || 0) + Number(stats.dead || 0);
  const done = Number(stats.done || 0);

  if (running > 0) return "running";
  if (failed > 0) return "failed";
  if (retry > 0) return "retry";
  if (done > 0) return "success";

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
    [...source].sort(
      (a, b) => getCommandActivityTs(b) - getCommandActivityTs(a)
    )[0] ?? null
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

function getCommandFlowGroupKey(cmd: CommandItem): string {
  const flowId = text(cmd.flow_id);
  if (flowId) return `flow:${flowId}`;

  const rootEventId = text(cmd.root_event_id);
  if (rootEventId) return `root:${rootEventId}`;

  return "";
}

function getIncidentLabel(incident?: IncidentItem | null): string {
  return firstText(incident?.title, incident?.name, "Incident");
}

function collectLinkedIncidents(
  incidents: IncidentItem[],
  ctx: IncidentMatchContext
): IncidentItem[] {
  const flowId = firstText(ctx.flowId);
  const rootEventId = firstText(ctx.rootEventId);
  const linkedRunId = firstText(ctx.linkedRunId);
  const sourceRecordId = firstText(ctx.sourceRecordId);

  const matches = incidents.filter((incident) => {
    const incidentFlowId = firstText(incident.flow_id);
    const incidentRootId = firstText(incident.root_event_id);
    const incidentLinkedRun = firstText(
      incident.linked_run,
      incident.run_record_id,
      incident.run_id
    );
    const incidentLinkedCommand = firstText(
      incident.linked_command,
      incident.command_id
    );
    const incidentOwnId = firstText(incident.id);
    const incidentErrorId = firstText(incident.error_id);

    return (
      (flowId && incidentFlowId === flowId) ||
      (rootEventId && incidentRootId === rootEventId) ||
      (linkedRunId && incidentLinkedRun === linkedRunId) ||
      (sourceRecordId && incidentRootId === sourceRecordId) ||
      (sourceRecordId && incidentLinkedCommand === sourceRecordId) ||
      (sourceRecordId && incidentOwnId === sourceRecordId) ||
      (sourceRecordId && incidentErrorId === sourceRecordId)
    );
  });

  return matches.sort(
    (a, b) => getIncidentActivityTs(b) - getIncidentActivityTs(a)
  );
}

function buildCommandFlowSummaries(
  commands: CommandItem[],
  incidents: IncidentItem[]
): FlowSummary[] {
  const groups = new Map<string, CommandItem[]>();

  for (const cmd of commands) {
    const key = getCommandFlowGroupKey(cmd);
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
      ordered.map((cmd) => text(cmd.workspace_id)).find(Boolean) ||
      "production";
    const linkedRunId =
      ordered
        .map((cmd) => firstText(cmd.linked_run, cmd.run_record_id))
        .find(Boolean) || "";

    const sourceRecordId = firstText(rootEventId, flowId);
    const lastActivityTs = Math.max(...ordered.map(getCommandActivityTs), 0);

    const validStarts = ordered.map(getCommandStartTs).filter((ts) => ts > 0);
    const earliestStartTs =
      validStarts.length > 0 ? Math.min(...validStarts) : 0;

    const durationMs =
      earliestStartTs > 0 && lastActivityTs > 0
        ? Math.max(0, lastActivityTs - earliestStartTs)
        : 0;

    const linkedIncidents = collectLinkedIncidents(incidents, {
      flowId,
      rootEventId,
      linkedRunId,
      sourceRecordId,
    });

    const linkedIncident = linkedIncidents[0] ?? null;
    const incidentCount = linkedIncidents.length;

    summaries.push({
      key,
      flowId: flowId || rootEventId || key,
      rootEventId: rootEventId || "—",
      workspaceId,
      status: computeFlowStatusFromCommands(ordered),
      steps: ordered.length,
      rootCapability: text(rootCommand?.capability),
      terminalCapability: text(terminalCommand?.capability),
      durationMs,
      lastActivityTs,
      hasIncident: Boolean(linkedIncident),
      incidentCount,
      incidentLabel: getIncidentLabel(linkedIncident),
      incidentStatus: firstText(
        linkedIncident?.status,
        linkedIncident?.statut_incident
      ),
      incidentSeverity: text(linkedIncident?.severity),
      incidentUpdatedTs: getIncidentActivityTs(linkedIncident),
      linkedRunId,
      sourceRecordId,
      readMode: "causal",
      partial: false,
      commands: ordered.map(toGraphCommand),
    });
  }

  return summaries;
}

function applyRegistryOnlyFlows(
  summaries: FlowSummary[],
  registryFlows: FlowDetail[],
  incidents: IncidentItem[]
): FlowSummary[] {
  const summaryMap = new Map<string, FlowSummary>();

  for (const summary of summaries) {
    summaryMap.set(summary.key, summary);
  }

  for (const flow of registryFlows) {
    const flowId = firstText(flow.flow_id);
    const rootEventId = firstText(flow.root_event_id);
    const sourceRecordId = firstText(flow.id, rootEventId, flowId);
    const workspaceId = firstText(flow.workspace_id, "production");

    const key = flowId
      ? `flow:${flowId}`
      : rootEventId
      ? `root:${rootEventId}`
      : sourceRecordId
      ? `registry:${sourceRecordId}`
      : "";

    if (!key) continue;

    const linkedIncidents = collectLinkedIncidents(incidents, {
      flowId,
      rootEventId,
      sourceRecordId,
    });

    const linkedIncident = linkedIncidents[0] ?? null;
    const incidentCount = linkedIncidents.length;

    const flowActivityTs = Math.max(
      toTs((flow as Record<string, unknown>).updated_at as string),
      toTs((flow as Record<string, unknown>).created_at as string),
      getIncidentActivityTs(linkedIncident)
    );

    const existing = summaryMap.get(key);

    if (existing) {
      if (!existing.hasIncident && linkedIncident) {
        existing.hasIncident = true;
        existing.incidentCount = incidentCount;
        existing.incidentLabel = getIncidentLabel(linkedIncident);
        existing.incidentStatus = firstText(
          linkedIncident.status,
          linkedIncident.statut_incident
        );
        existing.incidentSeverity = text(linkedIncident.severity);
        existing.incidentUpdatedTs = getIncidentActivityTs(linkedIncident);
      }

      continue;
    }

    summaryMap.set(key, {
      key,
      flowId: flowId || rootEventId || sourceRecordId || key,
      rootEventId: rootEventId || sourceRecordId || "—",
      workspaceId,
      status: computeRegistryStatus(flow),
      steps: Array.isArray(flow.commands) ? flow.commands.length : 0,
      rootCapability: "",
      terminalCapability: "",
      durationMs: 0,
      lastActivityTs: flowActivityTs,
      hasIncident: Boolean(linkedIncident),
      incidentCount,
      incidentLabel: getIncidentLabel(linkedIncident),
      incidentStatus: firstText(
        linkedIncident?.status,
        linkedIncident?.statut_incident
      ),
      incidentSeverity: text(linkedIncident?.severity),
      incidentUpdatedTs: getIncidentActivityTs(linkedIncident),
      linkedRunId: "",
      sourceRecordId,
      readMode: "registry_only",
      partial: true,
      commands: [],
    });
  }

  return [...summaryMap.values()].sort((a, b) => {
    const priorityDiff =
      getFlowStatusPriority(a.status) - getFlowStatusPriority(b.status);
    if (priorityDiff !== 0) return priorityDiff;

    return b.lastActivityTs - a.lastActivityTs;
  });
}

export default async function FlowsPage() {
  let allCommands: CommandItem[] = [];
  let allIncidents: IncidentItem[] = [];
  let allRegistryFlows: FlowDetail[] = [];

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
    allRegistryFlows = Array.isArray(data?.flows) ? data.flows : [];
  } catch {
    allRegistryFlows = [];
  }

  const commandFlows = buildCommandFlowSummaries(allCommands, allIncidents);
  const flows = applyRegistryOnlyFlows(
    commandFlows,
    allRegistryFlows,
    allIncidents
  );

  const initialSelectedKey =
    flows.find((flow) => flow.status === "running")?.key ||
    flows.find((flow) => flow.status === "failed")?.key ||
    flows.find((flow) => flow.status === "retry")?.key ||
    flows[0]?.key ||
    "";

  const initialFilter: FlowFilter =
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
