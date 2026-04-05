import Link from "next/link";

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

function cardClassName(isActive: boolean) {
  const base =
    "rounded-[28px] border bg-white/[0.04] p-5 md:p-6 xl:px-5 xl:py-4 min-h-[420px] xl:min-h-[330px] 2xl:min-h-[320px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition";
  const inactive =
    "border-white/10 hover:border-white/15 hover:bg-white/[0.05]";
  const active =
    "border-emerald-500/35 bg-emerald-500/[0.08] shadow-[0_0_0_1px_rgba(16,185,129,0.06),0_0_40px_rgba(16,185,129,0.08)]";

  return `${base} ${isActive ? active : inactive}`;
}

function sectionTitleClassName() {
  return "text-xs uppercase tracking-[0.28em] text-white/40";
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

function badgeTone(status: string) {
  const s = toText(status).toLowerCase();

  if (s === "success" || s === "done" || s === "completed") {
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

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/.test(value);
}

function compactTechnicalId(value: string, max = 32): string {
  const clean = toText(value);
  if (!clean) return "Flow";
  if (clean.length <= max) return clean;

  const keepStart = Math.max(12, Math.floor((max - 3) / 2));
  const keepEnd = Math.max(7, max - keepStart - 3);

  return `${clean.slice(0, keepStart)}...${clean.slice(-keepEnd)}`;
}

function getDisplayTitle(flow: FlowCard): string {
  return (
    toText(flow.flowId) ||
    toText(flow.sourceRecordId) ||
    toText(flow.rootEventId) ||
    "Flow"
  );
}

function displayCardTitle(flow: FlowCard): string {
  const raw = getDisplayTitle(flow);

  if (isRecordIdLike(raw)) {
    return compactTechnicalId(raw, 22);
  }

  if (raw.length > 30) {
    return compactTechnicalId(raw, 30);
  }

  return raw;
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

function buildIncidentOnlyFlowCards(
  incidents: AnyRecord[],
  existingCards: FlowCard[]
): FlowCard[] {
  const existingCandidates = new Set<string>();

  for (const flow of existingCards) {
    [flow.flowId, flow.rootEventId, flow.sourceRecordId, flow.key]
      .filter(Boolean)
      .forEach((value) => existingCandidates.add(String(value)));
  }

  const groups = new Map<string, AnyRecord[]>();

  for (const incident of incidents) {
    const flowId = toText(incident.flow_id);
    const rootEventId = toText(incident.root_event_id);
    const sourceRecordId = toText(incident.source_record_id) || toText(incident.id);

    if (!flowId && !rootEventId && !sourceRecordId) continue;

    const shouldSkip = [flowId, rootEventId, sourceRecordId]
      .filter(Boolean)
      .some((value) => existingCandidates.has(String(value)));

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

function FlowListCard({
  flow,
  activeKey,
}: {
  flow: FlowCard;
  activeKey: string;
}) {
  const isActive = isFlowActive(flow, activeKey);
  const displayTitle = displayCardTitle(flow);
  const rawTitle = getDisplayTitle(flow);

  const readingLabel =
    flow.readingMode === "registry-only" ? "Registre uniquement" : "Enrichie";

  const rootLabel =
    flow.readingMode === "registry-only"
      ? toText(flow.sourceRecordId) || toText(flow.rootEventId) || "—"
      : toText(flow.rootEventId) || "—";

  const incidentHref = buildIncidentsHref(flow);
  const selectHref = buildSelectHref(flow);
  const detailHref = buildDetailHref(flow);

  return (
    <article className={cardClassName(isActive)}>
      <div className="flex h-full flex-col gap-5 xl:gap-3.5">
        <div className="space-y-4 xl:space-y-2.5">
          <h3
            title={rawTitle}
            className="break-words text-[1.9rem] font-semibold leading-[1.03] tracking-tight text-white sm:text-[2.1rem] xl:text-[1.6rem] 2xl:text-[1.7rem] md:min-h-[4.5rem] xl:min-h-[3.1rem] xl:overflow-hidden xl:[display:-webkit-box] xl:[-webkit-box-orient:vertical] xl:[-webkit-line-clamp:2]"
          >
            {displayTitle}
          </h3>

          <div className="grid gap-2.5 text-[15px] leading-6 text-zinc-300 xl:grid-cols-2 xl:gap-x-5 xl:gap-y-1.5 xl:text-[14px] xl:leading-5">
            <div>
              Lecture: <span className="text-zinc-100">{readingLabel}</span>
            </div>

            {flow.readingMode === "registry-only" ? (
              <div className="break-all xl:col-span-2">
                Source / Root record: <span className="text-zinc-100">{rootLabel}</span>
              </div>
            ) : (
              <div className="break-all xl:col-span-2">
                Root: <span className="text-zinc-100">{rootLabel}</span>
              </div>
            )}

            <div>
              Activité: <span className="text-zinc-100">{flowActivityLabel(flow)}</span>
            </div>

            <div>
              Incident: <span className="text-zinc-100">{incidentLabel(flow)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 xl:pt-0.5">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeTone(
                flow.status
              )}`}
            >
              {flow.status.toUpperCase()}
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

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                flow.hasIncident
                  ? badgeTone("failed")
                  : "bg-zinc-800 text-zinc-300 border border-zinc-700"
              }`}
            >
              {incidentLabel(flow)}
            </span>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3 xl:gap-2 pt-2 xl:pt-0.5">
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
}: {
  title: string;
  description: string;
  flows: FlowCard[];
  activeKey: string;
}) {
  if (flows.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="space-y-3">
        <div className={sectionTitleClassName()}>{title}</div>
        <p className="max-w-4xl text-[18px] leading-9 text-zinc-300 sm:text-[20px]">
          {description}
        </p>
      </div>

      <div className="grid gap-5 xl:gap-5 xl:grid-cols-2">
        {flows.map((flow) => (
          <FlowListCard key={flow.key} flow={flow} activeKey={activeKey} />
        ))}
      </div>
    </section>
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

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-10 px-4 py-6 sm:px-6 lg:px-8">
      <section className="space-y-4 border-b border-white/10 pb-8">
        <div className="text-sm text-zinc-400">BOSAI Control Plane</div>

        <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
          Flows
        </h1>

        <p className="max-w-5xl text-[19px] leading-9 text-zinc-300 sm:text-[22px]">
          Vue de pilotage BOSAI pour suivre les flows enrichis et les flows présents uniquement dans le registre.
        </p>
      </section>

      <SectionBlock
        title="Needs attention"
        description="Flows prioritaires à surveiller maintenant : incidents actifs, échecs, retries ou activité en cours."
        flows={needsAttentionFlows}
        activeKey={activeKey}
      />

      <SectionBlock
        title="Flows enrichis"
        description="Flows avec lecture causale détaillée disponible : structure, étapes, graphe et navigation complète."
        flows={stableEnrichedFlows}
        activeKey={activeKey}
      />

      <SectionBlock
        title="Flows registre uniquement"
        description="Flows présents dans le registre BOSAI mais sans lecture causale détaillée disponible pour le moment."
        flows={registrySectionFlows}
        activeKey={activeKey}
      />

      {allFlows.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-zinc-400">
          Aucun flow disponible pour le moment.
        </section>
      ) : null}
    </div>
  );
}
