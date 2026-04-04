import FlowsClient from "./FlowsClient";
import {
  fetchFlows,
  fetchCommands,
  fetchIncidents,
  type FlowDetail,
  type CommandItem,
  type IncidentItem,
} from "@/lib/api";

type FlowStatus = "running" | "failed" | "retry" | "success" | "unknown";
type FlowFilter = "all" | FlowStatus;

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
  commands: FlowGraphCommand[];
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

function looksLikeRecordId(value: string): boolean {
  return /^rec[a-zA-Z0-9]{6,}$/.test(value.trim());
}

function extractRecordIds(value: unknown): string[] {
  const out = new Set<string>();

  function walk(v: unknown) {
    if (typeof v === "string") {
      const t = v.trim();
      if (looksLikeRecordId(t)) out.add(t);
      return;
    }

    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }

    if (v && typeof v === "object") {
      const obj = v as Record<string, unknown>;

      for (const key of ["id", "record_id", "recordId", "Record_ID", "value"]) {
        if (key in obj) walk(obj[key]);
      }
    }
  }

  walk(value);
  return Array.from(out);
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
    return null;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
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

function getFlowStatusPriority(status: FlowStatus): number {
  if (status === "running") return 0;
  if (status === "failed") return 1;
  if (status === "retry") return 2;
  if (status === "success") return 3;
  return 4;
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

function getFlowActivityTs(flow: FlowDetail): number {
  const raw = flow as Record<string, unknown>;

  return Math.max(
    toTs(raw.updated_at as string | number | null | undefined),
    toTs(raw.last_activity as string | number | null | undefined),
    toTs(raw.last_activity_at as string | number | null | undefined),
    toTs(raw.finished_at as string | number | null | undefined),
    toTs(raw.started_at as string | number | null | undefined),
    toTs(raw.created_at as string | number | null | undefined)
  );
}

function getFlowStartTs(flow: FlowDetail): number {
  const raw = flow as Record<string, unknown>;

  return Math.max(
    toTs(raw.started_at as string | number | null | undefined),
    toTs(raw.created_at as string | number | null | undefined)
  );
}

function getIncidentCommandIds(incident: IncidentItem): string[] {
  return extractRecordIds([
    (incident as Record<string, unknown>).linked_command,
    (incident as Record<string, unknown>).Linked_Command,
    (incident as Record<string, unknown>).command_id,
    (incident as Record<string, unknown>).Command_ID,
  ]);
}

function getIncidentRecordIds(incident: IncidentItem): string[] {
  return extractRecordIds([
    (incident as Record<string, unknown>).id,
    (incident as Record<string, unknown>).record_id,
    (incident as Record<string, unknown>).Record_ID,
  ]);
}

function getCommandCreatedIncidentIds(cmd: CommandItem): string[] {
  const out = new Set<string>();

  const directValues = [
    (cmd as Record<string, unknown>).incident_record_id,
    (cmd as Record<string, unknown>).Incident_Record_ID,
  ];

  for (const value of directValues) {
    for (const id of extractRecordIds(value)) {
      out.add(id);
    }
  }

  const resultCandidates = [
    (cmd as Record<string, unknown>).result,
    (cmd as Record<string, unknown>).result_json,
    (cmd as Record<string, unknown>).Result_JSON,
  ];

  for (const candidate of resultCandidates) {
    const obj = parseJsonObject(candidate);
    if (!obj) continue;

    for (const key of [
      "incident_record_id",
      "incidentRecordId",
      "incident_id",
      "incidentId",
    ]) {
      if (key in obj) {
        for (const id of extractRecordIds(obj[key])) {
          out.add(id);
        }
      }
    }
  }

  return Array.from(out);
}

function dedupeCommands(commands: CommandItem[]): CommandItem[] {
  const byId = new Map<string, CommandItem>();

  for (const cmd of commands) {
    const id = String(cmd.id || "");
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, cmd);
  }

  return Array.from(byId.values());
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

function getFlowGroupKey(flow: FlowDetail): string {
  const flowId = text(flow.flow_id);
  if (flowId) return `flow:${flowId}`;

  const rootEventId = text(flow.root_event_id);
  if (rootEventId) return `root:${rootEventId}`;

  if (text(flow.id)) return `id:${text(flow.id)}`;

  return "";
}

function fallbackIdFromKey(key: string): string {
  if (key.startsWith("flow:")) return key.slice(5);
  if (key.startsWith("root:")) return key.slice(5);
  if (key.startsWith("id:")) return key.slice(3);
  return key;
}

function readFlowCapability(
  flow: FlowDetail,
  keys: string[],
  fallback = "—"
): string {
  const raw = flow as Record<string, unknown>;

  for (const key of keys) {
    const value = text(raw[key]);
    if (value) return value;
  }

  return fallback;
}

function computeFallbackStatusFromFlow(flow: FlowDetail): FlowStatus {
  const raw = flow as Record<string, unknown>;
  const directStatus =
    text(raw.status) ||
    text(raw.flow_status) ||
    text(raw.status_select) ||
    text(raw.Status_select);

  if (directStatus) {
    const kind = getStatusKind(directStatus);
    if (kind === "done") return "success";
    if (kind === "running") return "running";
    if (kind === "failed") return "failed";
    if (kind === "retry") return "retry";
  }

  if (flow.stats) {
    if ((flow.stats.running ?? 0) > 0) return "running";
    if ((flow.stats.error ?? 0) > 0 || (flow.stats.dead ?? 0) > 0) return "failed";
    if ((flow.stats.retry ?? 0) > 0) return "retry";
    if ((flow.stats.done ?? 0) > 0) return "success";
  }

  return "unknown";
}

function buildFlowSummaries(
  flows: FlowDetail[],
  commands: CommandItem[],
  incidents: IncidentItem[]
): FlowSummary[] {
  const flowMap = new Map<string, FlowDetail>();
  const commandMap = new Map<string, CommandItem[]>();

  for (const flow of flows) {
    const key = getFlowGroupKey(flow);
    if (!key) continue;
    flowMap.set(key, flow);
  }

  for (const cmd of commands) {
    const key = getCommandGroupKey(cmd);
    if (!key) continue;

    const existing = commandMap.get(key) ?? [];
    existing.push(cmd);
    commandMap.set(key, existing);
  }

  const allKeys = new Set<string>([
    ...Array.from(flowMap.keys()),
    ...Array.from(commandMap.keys()),
  ]);

  const summaries: FlowSummary[] = [];

  for (const key of allKeys) {
    const flow = flowMap.get(key);
    const commandGroup = commandMap.get(key) ?? [];

    const flowCommands = Array.isArray(flow?.commands)
      ? flow!.commands.filter(
          (cmd): cmd is CommandItem => !!cmd && typeof cmd === "object"
        )
      : [];

    const mergedCommands = dedupeCommands([...flowCommands, ...commandGroup]);
    const ordered = buildExecutionOrder(mergedCommands);

    const rootCommand = ordered[0] ?? null;
    const terminalCommand = getTerminalCommand(ordered);

    const flowId =
      text(flow?.flow_id) ||
      ordered.map((cmd) => text(cmd.flow_id)).find(Boolean) ||
      (key.startsWith("flow:") ? fallbackIdFromKey(key) : "");

    const rootEventId =
      text(flow?.root_event_id) ||
      ordered.map((cmd) => text(cmd.root_event_id)).find(Boolean) ||
      (key.startsWith("root:") ? fallbackIdFromKey(key) : "—");

    const workspaceId =
      text(flow?.workspace_id) ||
      ordered.map((cmd) => text(cmd.workspace_id)).find(Boolean) ||
      "production";

    const lastActivityTs =
      ordered.length > 0
        ? Math.max(...ordered.map(getCommandActivityTs), 0)
        : flow
        ? getFlowActivityTs(flow)
        : 0;

    const validStarts = ordered.map(getCommandStartTs).filter((ts) => ts > 0);
    const earliestStartTs =
      validStarts.length > 0
        ? Math.min(...validStarts)
        : flow
        ? getFlowStartTs(flow)
        : 0;

    const durationMs =
      earliestStartTs > 0 && lastActivityTs > 0
        ? Math.max(0, lastActivityTs - earliestStartTs)
        : 0;

    const commandIds = new Set(ordered.map((cmd) => String(cmd.id)));
    const createdIncidentIds = new Set(
      ordered.flatMap((cmd) => getCommandCreatedIncidentIds(cmd))
    );

    const relatedIncidents = incidents.filter((incident) => {
      const incidentFlowId = text((incident as Record<string, unknown>).flow_id);
      const incidentRootId = text(
        (incident as Record<string, unknown>).root_event_id
      );
      const incidentCommandIds = getIncidentCommandIds(incident);
      const incidentRecordIds = getIncidentRecordIds(incident);

      return (
        (flowId && incidentFlowId === flowId) ||
        (rootEventId !== "—" && incidentRootId === rootEventId) ||
        incidentCommandIds.some((id) => commandIds.has(id)) ||
        incidentRecordIds.some((id) => createdIncidentIds.has(id))
      );
    });

    const incidentCount = relatedIncidents.length;
    const hasIncident = incidentCount > 0;

    const status =
      ordered.length > 0 ? computeFlowStatus(ordered) : flow ? computeFallbackStatusFromFlow(flow) : "unknown";

    const steps =
      ordered.length > 0
        ? ordered.length
        : typeof flow?.count === "number"
        ? flow.count
        : 0;

    const rootCapability =
      text(rootCommand?.capability) ||
      readFlowCapability(flow ?? {}, [
        "root_capability",
        "rootCapability",
        "Root_Capability",
      ]);

    const terminalCapability =
      text(terminalCommand?.capability) ||
      readFlowCapability(flow ?? {}, [
        "terminal_capability",
        "terminalCapability",
        "Terminal_Capability",
      ]);

    summaries.push({
      key,
      flowId: flowId || rootEventId || text(flow?.id) || fallbackIdFromKey(key) || "—",
      rootEventId,
      workspaceId,
      status,
      steps,
      rootCapability,
      terminalCapability,
      durationMs,
      lastActivityTs,
      hasIncident,
      incidentCount,
      commands: ordered.map(toGraphCommand),
    });
  }

  return summaries.sort((a, b) => {
    const priorityDiff =
      getFlowStatusPriority(a.status) - getFlowStatusPriority(b.status);
    if (priorityDiff !== 0) return priorityDiff;
    return b.lastActivityTs - a.lastActivityTs;
  });
}

export default async function FlowsPage() {
  let allFlows: FlowDetail[] = [];
  let allCommands: CommandItem[] = [];
  let allIncidents: IncidentItem[] = [];

  try {
    const data = await fetchFlows();
    allFlows = Array.isArray(data?.flows) ? data.flows : [];
  } catch {
    allFlows = [];
  }

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

  const flows = buildFlowSummaries(allFlows, allCommands, allIncidents);

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
