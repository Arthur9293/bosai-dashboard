import Link from "next/link";
import {
  ControlPlaneShell,
  SectionCard,
  SidePanelCard,
} from "@/components/dashboard/ControlPlaneShell";
import { DashboardStatusBadge } from "@/components/dashboard/StatusBadge";

type AnyRecord = Record<string, unknown>;
type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

type FlowStatus = "running" | "failed" | "retry" | "success" | "unknown";
type ReadingMode = "enriched" | "registry-only";

type FlowCard = {
  key: string;
  detailId: string;
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
  readingMode: ReadingMode;
  sourceRecordId?: string;
  isPartial: boolean;
};

type NormalizedCommand = {
  id: string;
  flowId: string;
  rootEventId: string;
  workspaceId: string;
  status: string;
  capability: string;
  parentCommandId: string;
  activityTs: number;
  startTs: number;
};

function cardClassName(isActive: boolean, compact = false) {
  const base = compact
    ? "rounded-[28px] border bg-white/[0.04] p-5 md:p-5 xl:px-5 xl:py-4 min-h-[360px] xl:min-h-[280px] 2xl:min-h-[270px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition"
    : "rounded-[28px] border bg-white/[0.04] p-5 md:p-6 xl:px-5 xl:py-4 min-h-[390px] xl:min-h-[300px] 2xl:min-h-[290px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition";

  const inactive =
    "border-white/10 hover:border-white/15 hover:bg-white/[0.05]";
  const active =
    "border-emerald-500/35 bg-emerald-500/[0.08] shadow-[0_0_0_1px_rgba(16,185,129,0.06),0_0_40px_rgba(16,185,129,0.08)]";

  return `${base} ${isActive ? active : inactive}`;
}

function actionLinkClassName(
  variant: "default" | "primary" | "danger" | "active" = "default"
) {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 xl:py-1.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex w-full items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 xl:py-1.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15";
  }

  if (variant === "active") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 xl:py-1.5 text-sm font-medium text-emerald-300";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 xl:py-1.5 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function metaBoxClassName(compact = false) {
  return `rounded-[22px] border border-white/10 bg-black/20 px-4 ${
    compact ? "py-3" : "py-4"
  }`;
}

function metaLabelClassName() {
  return "text-xs uppercase tracking-[0.22em] text-white/35";
}

function titleClassName(isRegistryOnly: boolean) {
  if (isRegistryOnly) {
    return "break-words text-[1.45rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.65rem] xl:text-[1.25rem] 2xl:text-[1.35rem]";
  }

  return "break-words text-[1.5rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.72rem] xl:text-[1.3rem] 2xl:text-[1.4rem]";
}

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

function toText(value: unknown, fallback = ""): string {
  const v = text(value);
  return v || fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return fallback;
}

function decodeSearchParam(value: string | string[] | undefined): string {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first) return "";

  try {
    return decodeURIComponent(first);
  } catch {
    return first;
  }
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

function parseMaybeJson(value: unknown): Record<string, unknown> {
  if (!value) return {};

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {}

  return {};
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

function compactTechnicalId(value: string, max = 32): string {
  const clean = toText(value);
  if (!clean) return "Flow";
  if (clean.length <= max) return clean;

  const keepStart = Math.max(12, Math.floor((max - 3) / 2));
  const keepEnd = Math.max(7, max - keepStart - 3);

  return `${clean.slice(0, keepStart)}...${clean.slice(-keepEnd)}`;
}

function humanStatusLabel(status: FlowStatus): string {
  if (status === "running") return "En cours";
  if (status === "failed") return "Échec";
  if (status === "retry") return "Retry";
  if (status === "success") return "Succès";
  return "Inconnu";
}

function cleanCapabilityLabel(value: string): string {
  const raw = toText(value);
  if (!raw) return "Non disponible";

  return raw.replace(/_/g, " ");
}

function getDisplayTitle(flow: FlowCard): string {
  if (flow.readingMode === "enriched") {
    const root = toText(flow.rootCapability);
    const terminal = toText(flow.terminalCapability);

    if (
      root &&
      terminal &&
      root !== "Non disponible" &&
      terminal !== "Non disponible"
    ) {
      if (root === terminal) {
        return cleanCapabilityLabel(root);
      }

      return `${cleanCapabilityLabel(root)} → ${cleanCapabilityLabel(
        terminal
      )}`;
    }

    if (root && root !== "Non disponible") {
      return cleanCapabilityLabel(root);
    }
  }

  if (flow.readingMode === "registry-only") {
    if (flow.hasIncident) {
      return "Flow partiel avec incident";
    }

    return "Flow registre uniquement";
  }

  return (
    toText(flow.flowId) ||
    toText(flow.sourceRecordId) ||
    toText(flow.rootEventId) ||
    "Flow"
  );
}

function getTechnicalSubtitle(flow: FlowCard): string {
  if (flow.readingMode === "enriched") {
    return toText(flow.flowId) || toText(flow.rootEventId) || "—";
  }

  return (
    toText(flow.sourceRecordId) ||
    toText(flow.rootEventId) ||
    toText(flow.flowId) ||
    "—"
  );
}

function getFlowSummaryLine(flow: FlowCard): string {
  if (flow.readingMode === "enriched") {
    const parts = [
      `${flow.steps} étape${flow.steps > 1 ? "s" : ""}`,
      humanStatusLabel(flow.status),
      flow.durationMs > 0 ? formatDuration(flow.durationMs) : "",
    ].filter(Boolean);

    return parts.join(" · ");
  }

  const parts = [
    "Lecture partielle",
    flow.hasIncident ? incidentLabel(flow) : "Sans incident actif",
  ].filter(Boolean);

  return parts.join(" · ");
}

function flowActivityLabel(flow: FlowCard): string {
  return flow.lastActivityTs > 0 ? formatDate(flow.lastActivityTs) : "—";
}

function incidentLabel(flow: FlowCard): string {
  if (!flow.hasIncident || flow.incidentCount <= 0) return "Aucun incident";
  if (flow.incidentCount === 1) return "1 incident";
  return `${flow.incidentCount} incidents`;
}

function getStatusKind(
  status?: string
): "done" | "running" | "failed" | "retry" | "other" {
  const s = toText(status).toLowerCase();

  if (["done", "success", "resolved", "ok", "completed"].includes(s)) {
    return "done";
  }

  if (s === "retry") return "retry";

  if (["running", "queued", "pending", "processing"].includes(s)) {
    return "running";
  }

  if (["error", "failed", "dead", "blocked"].includes(s)) {
    return "failed";
  }

  return "other";
}

function computeFlowStatus(commands: NormalizedCommand[]): FlowStatus {
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
  incident: AnyRecord
): "success" | "failed" | "retry" | "unknown" {
  const status = toText(incident.status).toLowerCase();
  const slaStatus = toText(incident.sla_status).toLowerCase();
  const resolvedAt = toText(incident.resolved_at);

  if (
    resolvedAt ||
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
      "failed",
    ].includes(status) ||
    ["open", "warning", "breached", "escalated"].includes(slaStatus)
  ) {
    return "failed";
  }

  return "unknown";
}

function computeIncidentOnlyStatus(group: AnyRecord[]): FlowStatus {
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

function getCommandActivityTs(cmd: AnyRecord): number {
  return Math.max(
    toTs(cmd.finished_at as string | number | null | undefined),
    toTs(cmd.updated_at as string | number | null | undefined),
    toTs(cmd.started_at as string | number | null | undefined),
    toTs(cmd.created_at as string | number | null | undefined)
  );
}

function getCommandStartTs(cmd: AnyRecord): number {
  return Math.max(
    toTs(cmd.started_at as string | number | null | undefined),
    toTs(cmd.created_at as string | number | null | undefined)
  );
}

function getIncidentActivityTs(incident: AnyRecord): number {
  return Math.max(
    toTs(incident.resolved_at as string | number | null | undefined),
    toTs(incident.updated_at as string | number | null | undefined),
    toTs(incident.opened_at as string | number | null | undefined),
    toTs(incident.created_at as string | number | null | undefined)
  );
}

function normalizeCommand(cmd: AnyRecord): NormalizedCommand {
  const inputParsed = parseMaybeJson(
    cmd.input_json ??
      cmd.payload_json ??
      cmd.command_input_json ??
      cmd.input ??
      cmd.payload
  );

  const resultParsed = parseMaybeJson(
    cmd.result_json ?? cmd.output_json ?? cmd.result ?? cmd.output
  );

  const merged = { ...cmd, ...inputParsed, ...resultParsed };

  return {
    id:
      toText(cmd.id) ||
      toText(cmd.record_id) ||
      toText(cmd.command_id) ||
      toText(cmd.Command_ID),
    flowId:
      toText(merged.flow_id) ||
      toText(merged.flowId) ||
      toText(merged.flowid),
    rootEventId:
      toText(merged.root_event_id) ||
      toText(merged.rootEventId) ||
      toText(merged.rooteventid) ||
      toText(merged.event_id),
    workspaceId:
      toText(merged.workspace_id) ||
      toText(merged.workspaceId) ||
      toText(merged.Workspace_ID) ||
      toText(merged.workspace) ||
      "production",
    status:
      toText(merged.status) ||
      toText(merged.Status) ||
      toText(merged.status_select) ||
      toText(merged.Status_select) ||
      "unknown",
    capability:
      toText(merged.capability) ||
      toText(merged.Capability) ||
      toText(merged.mapped_capability) ||
      "unknown_capability",
    parentCommandId:
      toText(merged.parent_command_id) ||
      toText(merged.parentCommandId) ||
      toText(merged.linked_command) ||
      toText(merged.Linked_Command),
    activityTs: getCommandActivityTs(cmd),
    startTs: getCommandStartTs(cmd),
  };
}

function getCommandIncidentKeys(cmd: NormalizedCommand): string[] {
  return uniqueTexts([cmd.id, cmd.flowId, cmd.rootEventId, cmd.parentCommandId]);
}

function getIncidentCandidates(incident: AnyRecord): string[] {
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
    ...topLevel(["source_record_id", "sourceRecordId", "Source_Record_ID"]),
    ...nestedFields(["source_record_id", "sourceRecordId", "Source_Record_ID"]),
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
    ...topLevel(["error_id", "errorId", "Error_ID"]),
    ...nestedFields(["error_id", "errorId", "Error_ID"]),
  ]);
}

function matchIncidents(
  incidents: AnyRecord[],
  input: {
    flowId?: string;
    rootEventId?: string;
    sourceRecordId?: string;
    commands?: NormalizedCommand[];
  }
): AnyRecord[] {
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

function buildExecutionOrder(commands: NormalizedCommand[]): NormalizedCommand[] {
  const byId = new Map<string, NormalizedCommand>();
  const childrenMap = new Map<string, NormalizedCommand[]>();

  for (const cmd of commands) {
    const id = cmd.id;
    if (!id) continue;
    byId.set(id, cmd);
    childrenMap.set(id, []);
  }

  const roots: NormalizedCommand[] = [];

  for (const cmd of commands) {
    const parentId = cmd.parentCommandId;

    if (parentId && byId.has(parentId)) {
      childrenMap.get(parentId)?.push(cmd);
    } else {
      roots.push(cmd);
    }
  }

  const sortByActivityAsc = (a: NormalizedCommand, b: NormalizedCommand) =>
    a.activityTs - b.activityTs;

  roots.sort(sortByActivityAsc);
  childrenMap.forEach((children) => children.sort(sortByActivityAsc));

  const ordered: NormalizedCommand[] = [];
  const visited = new Set<string>();

  function walk(cmd: NormalizedCommand) {
    const id = cmd.id;
    if (!id || visited.has(id)) return;

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
    .filter((cmd) => cmd.id && !visited.has(cmd.id))
    .sort(sortByActivityAsc);

  for (const cmd of leftovers) {
    walk(cmd);
  }

  return ordered;
}

function getTerminalCommand(
  commands: NormalizedCommand[]
): NormalizedCommand | null {
  if (commands.length === 0) return null;

  const referencedAsParent = new Set(
    commands.map((cmd) => cmd.parentCommandId).filter(Boolean)
  );

  const leafCandidates = commands.filter(
    (cmd) => !referencedAsParent.has(cmd.id)
  );

  const source = leafCandidates.length > 0 ? leafCandidates : commands;

  return [...source].sort((a, b) => b.activityTs - a.activityTs)[0] ?? null;
}

function getFlowGroupKey(cmd: NormalizedCommand): string {
  if (cmd.flowId) return `flow:${cmd.flowId}`;
  if (cmd.rootEventId) return `root:${cmd.rootEventId}`;
  return "";
}

function computeRegistryStatus(flow: AnyRecord): FlowStatus {
  const stats =
    flow.stats && typeof flow.stats === "object" && !Array.isArray(flow.stats)
      ? (flow.stats as Record<string, unknown>)
      : {};

  const running = toNumber(stats.running, 0) + toNumber(stats.queued, 0) > 0;
  const failed = toNumber(stats.error, 0) + toNumber(stats.dead, 0) > 0;
  const retry = toNumber(stats.retry, 0) > 0;
  const success = toNumber(stats.done, 0) > 0 && !running && !failed && !retry;

  if (running) return "running";
  if (failed) return "failed";
  if (retry) return "retry";
  if (success) return "success";

  const rawStatus = toText(flow.status).toLowerCase();
  if (rawStatus === "running") return "running";
  if (rawStatus === "failed") return "failed";
  if (rawStatus === "retry") return "retry";
  if (["success", "done", "completed"].includes(rawStatus)) return "success";

  return "unknown";
}

function buildEnrichedFlowCards(
  commands: NormalizedCommand[],
  incidents: AnyRecord[]
): FlowCard[] {
  const groups = new Map<string, NormalizedCommand[]>();

  for (const cmd of commands) {
    const key = getFlowGroupKey(cmd);
    if (!key) continue;

    const existing = groups.get(key) ?? [];
    existing.push(cmd);
    groups.set(key, existing);
  }

  const cards: FlowCard[] = [];

  for (const [key, group] of groups.entries()) {
    const ordered = buildExecutionOrder(group);
    const rootCommand = ordered[0] ?? null;
    const terminalCommand = getTerminalCommand(ordered);

    const flowId = ordered.map((cmd) => cmd.flowId).find(Boolean) || "";
    const rootEventId = ordered.map((cmd) => cmd.rootEventId).find(Boolean) || "";
    const workspaceId =
      ordered.map((cmd) => cmd.workspaceId).find(Boolean) || "production";

    const lastActivityTs = Math.max(...ordered.map((cmd) => cmd.activityTs), 0);

    const validStarts = ordered.map((cmd) => cmd.startTs).filter((ts) => ts > 0);

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

    const detailId = flowId || rootEventId || key;

    cards.push({
      key,
      detailId,
      flowId: flowId || detailId,
      rootEventId: rootEventId || "—",
      workspaceId,
      status: computeFlowStatus(ordered),
      steps: ordered.length,
      rootCapability: rootCommand?.capability || "Non disponible",
      terminalCapability: terminalCommand?.capability || "Non disponible",
      durationMs,
      lastActivityTs,
      hasIncident: linkedIncidents.length > 0,
      incidentCount: linkedIncidents.length,
      firstIncidentId:
        linkedIncidents.length > 0 ? toText(linkedIncidents[0].id) : undefined,
      readingMode: "enriched",
      sourceRecordId: undefined,
      isPartial: false,
    });
  }

  return cards;
}

function buildRegistryOnlyFlowCards(
  registryFlows: AnyRecord[],
  incidents: AnyRecord[]
): FlowCard[] {
  return registryFlows.map((flow) => {
    const sourceRecordId =
      toText(flow.id) ||
      toText(flow.source_record_id) ||
      toText(flow.sourceRecordId);

    const flowId =
      toText(flow.flow_id) ||
      toText(flow.flowId) ||
      sourceRecordId ||
      toText(flow.root_event_id);

    const rootEventId =
      toText(flow.root_event_id) ||
      toText(flow.rootEventId) ||
      sourceRecordId ||
      flowId ||
      "—";

    const workspaceId =
      toText(flow.workspace_id) ||
      toText(flow.workspaceId) ||
      "production";

    const linkedIncidents = matchIncidents(incidents, {
      flowId,
      rootEventId,
      sourceRecordId,
    });

    const key = `registry:${sourceRecordId || flowId || rootEventId}`;
    const detailId = sourceRecordId || flowId || rootEventId || key;

    return {
      key,
      detailId,
      flowId: flowId || detailId,
      rootEventId: rootEventId || "—",
      workspaceId,
      status: computeRegistryStatus(flow),
      steps: 0,
      rootCapability: "Registre uniquement",
      terminalCapability: "Registre uniquement",
      durationMs: 0,
      lastActivityTs: Math.max(
        toTs(flow.last_activity_at as string | number | null | undefined),
        toTs(flow.updated_at as string | number | null | undefined),
        toTs(flow.created_at as string | number | null | undefined)
      ),
      hasIncident: linkedIncidents.length > 0,
      incidentCount: linkedIncidents.length,
      firstIncidentId:
        linkedIncidents.length > 0 ? toText(linkedIncidents[0].id) : undefined,
      readingMode: "registry-only",
      sourceRecordId,
      isPartial: true,
    };
  });
}

function incidentMatchesCard(incident: AnyRecord, card: FlowCard): boolean {
  const incidentFlowId = toText(incident.flow_id);
  const incidentRootEventId = toText(incident.root_event_id);
  const incidentSourceRecordId = toText(incident.source_record_id);

  return Boolean(
    (card.flowId !== "" && incidentFlowId === card.flowId) ||
      (card.rootEventId !== "" &&
        card.rootEventId !== "—" &&
        incidentRootEventId === card.rootEventId) ||
      (toText(card.sourceRecordId) !== "" &&
        incidentSourceRecordId === toText(card.sourceRecordId))
  );
}

function buildIncidentOnlyFlowCards(
  incidents: AnyRecord[],
  existingCards: FlowCard[]
): FlowCard[] {
  const groups = new Map<string, AnyRecord[]>();

  for (const incident of incidents) {
    const flowId = toText(incident.flow_id);
    const rootEventId = toText(incident.root_event_id);
    const sourceRecordId = toText(incident.source_record_id) || toText(incident.id);

    if (!flowId && !rootEventId && !sourceRecordId) continue;

    const shouldSkip = existingCards.some((card) =>
      incidentMatchesCard(incident, card)
    );

    if (shouldSkip) continue;

    const key = `incident-only:${flowId || rootEventId || sourceRecordId}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(incident);
    groups.set(key, bucket);
  }

  const cards: FlowCard[] = [];

  for (const [key, group] of groups.entries()) {
    const latest =
      [...group].sort(
        (a, b) => getIncidentActivityTs(b) - getIncidentActivityTs(a)
      )[0] ?? null;

    if (!latest) continue;

    const flowId =
      toText(latest.flow_id) ||
      toText(latest.root_event_id) ||
      `incident-${toText(latest.id)}`;

    const rootEventId = toText(latest.root_event_id) || flowId;
    const sourceRecordId = toText(latest.source_record_id) || toText(latest.id);

    cards.push({
      key,
      detailId: sourceRecordId || flowId || rootEventId || key,
      flowId,
      rootEventId,
      workspaceId: toText(latest.workspace_id) || "production",
      status: computeIncidentOnlyStatus(group),
      steps: 0,
      rootCapability: "Registre uniquement",
      terminalCapability: "Registre uniquement",
      durationMs: 0,
      lastActivityTs: Math.max(...group.map(getIncidentActivityTs), 0),
      hasIncident: true,
      incidentCount: group.length,
      firstIncidentId: toText(latest.id),
      readingMode: "registry-only",
      sourceRecordId,
      isPartial: true,
    });
  }

  return cards;
}

function sortFlowCards(cards: FlowCard[]): FlowCard[] {
  return [...cards].sort((a, b) => {
    const priorityDiff =
      getFlowStatusPriority(a.status) - getFlowStatusPriority(b.status);
    if (priorityDiff !== 0) return priorityDiff;
    return b.lastActivityTs - a.lastActivityTs;
  });
}

function buildIncidentsHref(flow: FlowCard): string {
  const params = new URLSearchParams();

  if (flow.flowId) {
    params.set("flow_id", flow.flowId);
  }

  if (flow.rootEventId && flow.rootEventId !== "—") {
    params.set("root_event_id", flow.rootEventId);
  }

  if (flow.sourceRecordId) {
    params.set("source_record_id", flow.sourceRecordId);
  }

  params.set("from", "flows");

  const query = params.toString();
  return query ? `/incidents?${query}` : "/incidents";
}

function buildSelectHref(flow: FlowCard): string {
  const params = new URLSearchParams();
  params.set("selected", flow.detailId);
  return `/flows?${params.toString()}`;
}

function buildDetailHref(flow: FlowCard): string {
  return `/flows/${encodeURIComponent(flow.detailId)}`;
}

function isNeedsAttention(flow: FlowCard): boolean {
  return (
    flow.hasIncident ||
    flow.status === "running" ||
    flow.status === "failed" ||
    flow.status === "retry"
  );
}

function isFlowActive(flow: FlowCard, activeKey: string): boolean {
  return flow.key === activeKey;
}

function matchesActiveSelection(flow: FlowCard, selected: string): boolean {
  if (!selected) return false;

  const candidates = [
    flow.detailId,
    flow.flowId,
    flow.rootEventId,
    flow.sourceRecordId || "",
    flow.key,
  ]
    .map((value) => toText(value))
    .filter(Boolean);

  return candidates.includes(selected);
}

function CountPill({ value }: { value: number }) {
  return (
    <span className="inline-flex min-w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-white/80">
      {value}
    </span>
  );
}

function FlowListCard({
  flow,
  activeKey,
}: {
  flow: FlowCard;
  activeKey: string;
}) {
  const isActive = isFlowActive(flow, activeKey);
  const isRegistryOnly = flow.readingMode === "registry-only";
  const title = getDisplayTitle(flow);
  const technicalSubtitle = getTechnicalSubtitle(flow);
  const summaryLine = getFlowSummaryLine(flow);
  const incidentHref = buildIncidentsHref(flow);
  const selectHref = buildSelectHref(flow);
  const detailHref = buildDetailHref(flow);

  return (
    <article className={cardClassName(isActive, isRegistryOnly)}>
      <div
        className={`flex h-full flex-col ${
          isRegistryOnly ? "gap-4 xl:gap-3" : "gap-4 xl:gap-3"
        }`}
      >
        <div className="space-y-3 xl:space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <DashboardStatusBadge
              label={humanStatusLabel(flow.status).toUpperCase()}
              status={flow.status}
            />

            {flow.isPartial ? <DashboardStatusBadge kind="partial" /> : null}

            <DashboardStatusBadge
              kind={flow.hasIncident ? "incident" : "no-incident"}
              label={flow.hasIncident ? incidentLabel(flow) : "Aucun incident"}
            />
          </div>

          <div className="space-y-2.5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35">
              {flow.readingMode === "enriched"
                ? "Flow enrichi"
                : "Flow registre uniquement"}
            </div>

            <h3 className={titleClassName(isRegistryOnly)}>{title}</h3>

            {!isRegistryOnly ? (
              <div className="break-all text-sm text-zinc-400">
                Flow ID : <span className="text-zinc-200">{technicalSubtitle}</span>
              </div>
            ) : null}

            <p className="text-sm leading-6 text-zinc-300">{summaryLine}</p>
          </div>

          {!isRegistryOnly ? (
            <div className="grid gap-3 text-sm text-zinc-300 md:grid-cols-2 xl:gap-3">
              <div className={metaBoxClassName(true)}>
                <div className={metaLabelClassName()}>Activité</div>
                <div className="mt-2 text-zinc-100">{flowActivityLabel(flow)}</div>
              </div>

              <div className={metaBoxClassName(true)}>
                <div className={metaLabelClassName()}>Incident</div>
                <div className="mt-2 text-zinc-100">{incidentLabel(flow)}</div>
              </div>

              <div className={metaBoxClassName(true)}>
                <div className={metaLabelClassName()}>Workspace</div>
                <div className="mt-2 text-zinc-100">
                  {flow.workspaceId || "production"}
                </div>
              </div>

              <div className={metaBoxClassName(true)}>
                <div className={metaLabelClassName()}>Étapes</div>
                <div className="mt-2 text-zinc-100">{flow.steps}</div>
              </div>

              <div className={`${metaBoxClassName(true)} md:col-span-2`}>
                <div className={metaLabelClassName()}>Chaîne</div>
                <div className="mt-2 text-zinc-100">
                  {cleanCapabilityLabel(flow.rootCapability)}
                  {flow.rootCapability !== flow.terminalCapability
                    ? ` → ${cleanCapabilityLabel(flow.terminalCapability)}`
                    : ""}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 text-sm text-zinc-300 md:grid-cols-2 xl:gap-3">
              <div className={metaBoxClassName(true)}>
                <div className={metaLabelClassName()}>Source / Root</div>
                <div className="mt-2 break-all text-zinc-100">
                  {technicalSubtitle}
                </div>
              </div>

              <div className={metaBoxClassName(true)}>
                <div className={metaLabelClassName()}>Activité</div>
                <div className="mt-2 text-zinc-100">{flowActivityLabel(flow)}</div>
              </div>

              <div className={metaBoxClassName(true)}>
                <div className={metaLabelClassName()}>Workspace</div>
                <div className="mt-2 text-zinc-100">
                  {flow.workspaceId || "production"}
                </div>
              </div>

              <div className={metaBoxClassName(true)}>
                <div className={metaLabelClassName()}>Incident</div>
                <div className="mt-2 text-zinc-100">{incidentLabel(flow)}</div>
              </div>
            </div>
          )}
        </div>

        <div
          className={`mt-auto flex flex-col ${
            isRegistryOnly ? "gap-2.5 pt-1" : "gap-2.5 pt-1"
          }`}
        >
          <Link
            href={selectHref}
            className={actionLinkClassName(isActive ? "active" : "default")}
          >
            {isActive ? "Flow actif" : "Sélectionner"}
          </Link>

          {flow.hasIncident ? (
            <Link href={incidentHref} className={actionLinkClassName("danger")}>
              {flow.incidentCount > 1 ? "Voir les incidents" : "Voir l’incident"}
            </Link>
          ) : null}

          <Link href={detailHref} className={actionLinkClassName("default")}>
            Voir le détail
          </Link>
        </div>
      </div>
    </article>
  );
}

function SectionBlock({
  title,
  description,
  flows,
  activeKey,
  tone = "default",
}: {
  title: string;
  description: string;
  flows: FlowCard[];
  activeKey: string;
  tone?: "default" | "attention" | "neutral";
}) {
  if (flows.length === 0) return null;

  return (
    <SectionCard
      title={title}
      description={description}
      tone={tone}
      action={<CountPill value={flows.length} />}
    >
      <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
        {flows.map((flow) => (
          <FlowListCard key={flow.key} flow={flow} activeKey={activeKey} />
        ))}
      </div>
    </SectionCard>
  );
}

function EmptyFlowsState() {
  return (
    <SectionCard
      title="Aucun flow"
      description="Le Dashboard n’a remonté aucun flow sur la source actuelle."
      tone="neutral"
    >
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-sm text-white/55">
        Aucun flow disponible pour le moment.
      </div>
    </SectionCard>
  );
}

export default async function FlowsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await Promise.resolve(
    searchParams ?? {}
  )) as SearchParams;

  const selected = decodeSearchParam(resolvedSearchParams.selected);

  const api = await import("@/lib/api");

  const fetchCommands = (api as AnyRecord).fetchCommands as
    | undefined
    | (() => Promise<unknown>);
  const fetchIncidents = (api as AnyRecord).fetchIncidents as
    | undefined
    | (() => Promise<unknown>);
  const fetchFlows = (api as AnyRecord).fetchFlows as
    | undefined
    | (() => Promise<unknown>);

  let commandsData: unknown = null;
  let incidentsData: unknown = null;
  let flowsData: unknown = null;

  try {
    commandsData = fetchCommands ? await fetchCommands() : null;
  } catch {
    commandsData = null;
  }

  try {
    incidentsData = fetchIncidents ? await fetchIncidents() : null;
  } catch {
    incidentsData = null;
  }

  try {
    flowsData = fetchFlows ? await fetchFlows() : null;
  } catch {
    flowsData = null;
  }

  const rawCommands: AnyRecord[] =
    commandsData &&
    typeof commandsData === "object" &&
    !Array.isArray(commandsData) &&
    Array.isArray((commandsData as Record<string, unknown>).commands)
      ? ((commandsData as Record<string, unknown>).commands as AnyRecord[])
      : Array.isArray(commandsData)
      ? (commandsData as AnyRecord[])
      : [];

  const rawIncidents: AnyRecord[] =
    incidentsData &&
    typeof incidentsData === "object" &&
    !Array.isArray(incidentsData) &&
    Array.isArray((incidentsData as Record<string, unknown>).incidents)
      ? ((incidentsData as Record<string, unknown>).incidents as AnyRecord[])
      : Array.isArray(incidentsData)
      ? (incidentsData as AnyRecord[])
      : [];

  const rawFlows: AnyRecord[] =
    flowsData &&
    typeof flowsData === "object" &&
    !Array.isArray(flowsData) &&
    Array.isArray((flowsData as Record<string, unknown>).flows)
      ? ((flowsData as Record<string, unknown>).flows as AnyRecord[])
      : Array.isArray(flowsData)
      ? (flowsData as AnyRecord[])
      : [];

  const normalizedCommands = rawCommands.map(normalizeCommand);

  const enrichedFlows = sortFlowCards(
    buildEnrichedFlowCards(normalizedCommands, rawIncidents)
  );

  const registryOnlyFlows = sortFlowCards(
    buildRegistryOnlyFlowCards(rawFlows, rawIncidents)
  );

  const incidentOnlyFlows = sortFlowCards(
    buildIncidentOnlyFlowCards(rawIncidents, [
      ...enrichedFlows,
      ...registryOnlyFlows,
    ])
  );

  const registrySectionFlows = sortFlowCards([
    ...registryOnlyFlows,
    ...incidentOnlyFlows,
  ]);

  const allFlows = sortFlowCards([...enrichedFlows, ...registrySectionFlows]);

  const needsAttentionFlows = sortFlowCards(
    allFlows.filter((flow) => isNeedsAttention(flow))
  );

  const stableEnrichedFlows = sortFlowCards(
    enrichedFlows.filter((flow) => !isNeedsAttention(flow))
  );

  const activeFlow =
    allFlows.find((flow) => matchesActiveSelection(flow, selected)) ??
    needsAttentionFlows[0] ??
    allFlows[0] ??
    null;

  const activeKey = activeFlow?.key || "";

  const runningCount = allFlows.filter((flow) => flow.status === "running").length;
  const retryCount = allFlows.filter((flow) => flow.status === "retry").length;
  const failedCount = allFlows.filter((flow) => flow.status === "failed").length;
  const partialCount = allFlows.filter((flow) => flow.isPartial).length;

  return (
    <ControlPlaneShell
      eyebrow="BOSAI Control Plane"
      title="Flows"
      description="Vue de pilotage BOSAI pour suivre les flows enrichis, les flows registre uniquement et les signaux qui demandent une attention immédiate."
      badges={[
        { label: "Needs Attention", tone: "warning" },
        { label: "Enriched + Registry-only", tone: "info" },
        { label: "Mobile préservé", tone: "muted" },
      ]}
      metrics={[
        { label: "Running", value: runningCount },
        { label: "Retry", value: retryCount },
        { label: "Failed", value: failedCount },
        { label: "Registry-only", value: partialCount },
      ]}
      aside={
        <>
          <SidePanelCard title="Lecture opérationnelle">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <DashboardStatusBadge kind="running" />
                <DashboardStatusBadge kind="failed" />
                <DashboardStatusBadge kind="retry" />
                <DashboardStatusBadge kind="partial" />
              </div>

              <div className="space-y-2 text-sm leading-6 text-white/65">
                <p>
                  <span className="text-white/90">Needs Attention</span> regroupe
                  les flows à surveiller en priorité.
                </p>
                <p>
                  <span className="text-white/90">Flows enrichis</span> gardent la
                  lecture causale détaillée.
                </p>
                <p>
                  <span className="text-white/90">Registry-only</span> assume une
                  lecture partielle mais exploitable.
                </p>
              </div>
            </div>
          </SidePanelCard>

          <SidePanelCard title="Flow actif">
            {activeFlow ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Titre
                  </div>
                  <div className="mt-2 text-sm font-medium leading-6 text-white">
                    {getDisplayTitle(activeFlow)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <DashboardStatusBadge
                    label={humanStatusLabel(activeFlow.status)}
                    status={activeFlow.status}
                  />
                  {activeFlow.isPartial ? (
                    <DashboardStatusBadge kind="registry-only" />
                  ) : (
                    <DashboardStatusBadge label="Enriched" kind="running" />
                  )}
                  {activeFlow.hasIncident ? (
                    <DashboardStatusBadge
                      kind="incident"
                      label={incidentLabel(activeFlow)}
                    />
                  ) : (
                    <DashboardStatusBadge kind="no-incident" label="Sans incident" />
                  )}
                </div>

                <div className="space-y-2 text-sm leading-6 text-white/65">
                  <div>
                    Workspace :{" "}
                    <span className="text-white/90">
                      {activeFlow.workspaceId || "production"}
                    </span>
                  </div>
                  <div>
                    Activité :{" "}
                    <span className="text-white/90">
                      {flowActivityLabel(activeFlow)}
                    </span>
                  </div>
                  <div>
                    Identifiant :{" "}
                    <span className="break-all text-white/90">
                      {compactTechnicalId(
                        activeFlow.sourceRecordId ||
                          activeFlow.flowId ||
                          activeFlow.rootEventId
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    href={buildDetailHref(activeFlow)}
                    className={actionLinkClassName("default")}
                  >
                    Ouvrir le détail
                  </Link>

                  <Link
                    href={buildIncidentsHref(activeFlow)}
                    className={actionLinkClassName(
                      activeFlow.hasIncident ? "danger" : "default"
                    )}
                  >
                    {activeFlow.hasIncident
                      ? activeFlow.incidentCount > 1
                        ? "Voir les incidents liés"
                        : "Voir l’incident lié"
                      : "Voir les incidents"}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/55">Aucun flow sélectionné.</div>
            )}
          </SidePanelCard>
        </>
      }
    >
      {allFlows.length === 0 ? <EmptyFlowsState /> : null}

      <SectionBlock
        title="Needs Attention"
        description="Flows prioritaires à surveiller maintenant : incidents actifs, exécutions en cours, retries et échecs."
        flows={needsAttentionFlows}
        activeKey={activeKey}
        tone="attention"
      />

      <SectionBlock
        title="Flows enrichis"
        description="Flows avec lecture causale détaillée disponible : structure, étapes, graphe et navigation complète."
        flows={stableEnrichedFlows}
        activeKey={activeKey}
        tone="default"
      />

      <SectionBlock
        title="Flows registre uniquement"
        description="Flows présents dans le registre BOSAI mais sans lecture causale détaillée disponible pour le moment."
        flows={registrySectionFlows}
        activeKey={activeKey}
        tone="neutral"
      />
    </ControlPlaneShell>
  );
}
