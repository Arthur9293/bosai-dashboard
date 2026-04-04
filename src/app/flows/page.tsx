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

function addCandidate(target: Set<string>, value: unknown) {
  const v = text(value);
  if (v) target.add(v);
}

function getNumericStat(obj: unknown, key: string): number {
  if (!obj || typeof obj !== "object") return 0;
  const value = (obj as Record<string, unknown>)[key];
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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

function getIncidentActivityTs(incident: IncidentItem): number {
  return Math.max(
    toTs(incident.updated_at),
    toTs(incident.resolved_at),
    toTs(incident.opened_at),
    toTs(incident.created_at)
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
  const explicit = firstText(
    (flow as Record<string, unknown>).status,
    (flow as Record<string, unknown>).state,
    (flow as Record<string, unknown>).status_select
  );

  if (explicit) {
    const kind = getStatusKind(explicit);
    if (kind === "running") return "running";
    if (kind === "failed") return "failed";
    if (kind === "retry") return "retry";
    if (kind === "done") return "success";
  }

  const stats = flow.stats;

  if (getNumericStat(stats, "running") > 0 || getNumericStat(stats, "queued") > 0) {
    return "running";
  }
  if (getNumericStat(stats, "error") > 0 || getNumericStat(stats, "dead") > 0) {
    return "failed";
  }
  if (getNumericStat(stats, "retry") > 0) {
    return "retry";
  }
  if (getNumericStat(stats, "done") > 0) {
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

function collectIncidentKeys(incident: IncidentItem): Set<string> {
  const keys = new Set<string>();

  addCandidate(keys, incident.id);
  addCandidate(keys, incident.flow_id);
  addCandidate(keys, incident.root_event_id);
  addCandidate(keys, incident.run_record_id);
  addCandidate(keys, incident.linked_run);
  addCandidate(keys, incident.run_id);
  addCandidate(keys, incident.command_id);
  addCandidate(keys, incident.linked_command);

  return keys;
}

function findLinkedIncident(
  incidents: IncidentItem[],
  values: {
    flowId?: string;
    rootEventId?: string;
    sourceRecordId?: string;
    linkedRunId?: string;
  }
): IncidentItem | null {
  const wanted = new Set<string>();

  addCandidate(wanted, values.flowId);
  addCandidate(wanted, values.rootEventId);
  addCandidate(wanted, values.sourceRecordId);
  addCandidate(wanted, values.linkedRunId);

  if (wanted.size === 0) return null;

  const candidates = incidents
    .filter((incident) => {
      const keys = collectIncidentKeys(incident);
      for (const wantedKey of wanted) {
        if (keys.has(wantedKey)) return true;
      }
      return false;
    })
    .sort((a, b) => getIncidentActivityTs(b) - getIncidentActivityTs(a));

  return candidates[0] ?? null;
}

function getIncidentLabel(incident: IncidentItem | null): string {
  if (!incident) return "Aucun incident";

  return (
    firstText(
      incident.title,
      incident.name,
      incident.status,
      incident.statut_incident,
      incident.id
    ) || "Incident détecté"
  );
}

function buildCommandFlowSummaries(
  commands: CommandItem[],
  incidents: IncidentItem[]
): FlowSummary[] {
  const groups = new Map<string, CommandItem[]>();

  for (const cmd of commands) {
    const key = getCommandGroupKey(cmd);
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
      ordered.map((cmd) => text(cmd.root_event_id)).find(Boolean) || "";
    const workspaceId =
      ordered.map((cmd) => text(cmd.workspace_id)).find(Boolean) ||
      "production";

    const linkedRunId =
      ordered
        .map((cmd) =>
          firstText(
            (cmd as Record<string, unknown>).linked_run,
            (cmd as Record<string, unknown>).run_record_id
          )
        )
        .find(Boolean) || "";

    const lastActivityTs = Math.max(...ordered.map(getCommandActivityTs), 0);

    const validStarts = ordered.map(getCommandStartTs).filter((ts) => ts > 0);
    const earliestStartTs =
      validStarts.length > 0 ? Math.min(...validStarts) : 0;

    const durationMs =
      earliestStartTs > 0 && lastActivityTs > 0
        ? Math.max(0, lastActivityTs - earliestStartTs)
        : 0;

    const linkedIncident = findLinkedIncident(incidents, {
      flowId,
      rootEventId,
      linkedRunId,
      sourceRecordId: "",
    });

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
      incidentLabel: getIncidentLabel(linkedIncident),
      incidentStatus: firstText(
        linkedIncident?.status,
        linkedIncident?.statut_incident
      ),
      incidentSeverity: text(linkedIncident?.severity),
      incidentUpdatedTs: getIncidentActivityTs(linkedIncident as IncidentItem),
      linkedRunId,
      sourceRecordId: firstText(rootEventId, flowId),
      readMode: "causal",
      partial: false,
      commands: ordered.map(toGraphCommand),
    });
  }

  return summaries;
}

function applyRegistryOnlyFlows(
  registryFlows: FlowDetail[],
  summaries: Map<string, FlowSummary>,
  incidents: IncidentItem[]
) {
  for (const flow of registryFlows) {
    const flowId = firstText(flow.flow_id);
    const rootEventId = firstText(flow.root_event_id);
    const sourceRecordId = firstText(
      (flow as Record<string, unknown>).id,
      (flow as Record<string, unknown>).source_record_id,
      rootEventId,
      flowId
    );
    const linkedRunId = firstText(
      (flow as Record<string, unknown>).linked_run,
      (flow as Record<string, unknown>).run_record_id,
      (flow as Record<string, unknown>).run_id
    );

    const key =
      flowId
        ? `flow:${flowId}`
        : rootEventId
        ? `root:${rootEventId}`
        : sourceRecordId
        ? `registry:${sourceRecordId}`
        : "";

    if (!key) continue;

    const linkedIncident = findLinkedIncident(incidents, {
      flowId,
      rootEventId,
      sourceRecordId,
      linkedRunId,
    });

    const existing = summaries.get(key);

    if (existing) {
      if (!existing.sourceRecordId) existing.sourceRecordId = sourceRecordId;
      if (!existing.linkedRunId) existing.linkedRunId = linkedRunId;

      if (!existing.hasIncident && linkedIncident) {
        existing.hasIncident = true;
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

    const lastActivityTs = Math.max(
      toTs((flow as Record<string, unknown>).updated_at as string),
      toTs((flow as Record<string, unknown>).created_at as string),
      getIncidentActivityTs(linkedIncident as IncidentItem)
    );

    summaries.set(key, {
      key,
      flowId: flowId || rootEventId || sourceRecordId || key,
      rootEventId: rootEventId || sourceRecordId || "—",
      workspaceId:
        firstText(flow.workspace_id, (flow as Record<string, unknown>).workspace) ||
        "production",
      status: computeRegistryStatus(flow),
      steps: Array.isArray(flow.commands) ? flow.commands.length : 0,
      rootCapability: "",
      terminalCapability: "",
      durationMs: 0,
      lastActivityTs,
      hasIncident: Boolean(linkedIncident),
      incidentLabel: getIncidentLabel(linkedIncident),
      incidentStatus: firstText(
        linkedIncident?.status,
        linkedIncident?.statut_incident
      ),
      incidentSeverity: text(linkedIncident?.severity),
      incidentUpdatedTs: getIncidentActivityTs(linkedIncident as IncidentItem),
      linkedRunId,
      sourceRecordId,
      readMode: "registry_only",
      partial: true,
      commands: [],
    });
  }
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

  const summaryMap = new Map<string, FlowSummary>();

  for (const summary of buildCommandFlowSummaries(allCommands, allIncidents)) {
    summaryMap.set(summary.key, summary);
  }

  applyRegistryOnlyFlows(allRegistryFlows, summaryMap, allIncidents);

  const flows = [...summaryMap.values()].sort((a, b) => {
    const statusDiff =
      getFlowStatusPriority(a.status) - getFlowStatusPriority(b.status);
    if (statusDiff !== 0) return statusDiff;

    if (a.partial !== b.partial) {
      return a.partial ? 1 : -1;
    }

    return b.lastActivityTs - a.lastActivityTs;
  });

  const initialSelectedKey =
    flows.find((flow) => flow.status === "running")?.key ||
    flows.find((flow) => flow.status === "failed")?.key ||
    flows.find((flow) => flow.status === "retry")?.key ||
    flows[0]?.key ||
    "";

  const initialFilter: "all" | FlowStatus =
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
