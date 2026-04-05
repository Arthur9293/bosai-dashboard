import Link from "next/link";

type SearchParamValue = string | string[] | undefined;

type PageProps = {
  searchParams?:
    | Promise<Record<string, SearchParamValue>>
    | Record<string, SearchParamValue>;
};

type AnyRecord = Record<string, any>;

type FlowCard = {
  key: string;
  flowId: string;
  rootEventId: string;
  sourceRecordId: string;
  workspaceId: string;
  status: string;
  steps: number;
  rootCapability: string;
  terminalCapability: string;
  durationMs: number;
  lastActivityTs: number;
  hasIncident: boolean;
  incidentCount: number;
  readingMode: "enriched" | "registry-only";
  isPartial: boolean;
};

type TimelineItem = {
  id: string;
  capability: string;
  status: string;
  worker: string;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  stepIndex: number;
  parentCommandId: string;
  flowId: string;
  rootEventId: string;
  workspaceId: string;
};

function toText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "oui"].includes(normalized)) return true;
    if (["false", "0", "no", "non"].includes(normalized)) return false;
  }
  return fallback;
}

function parseMaybeJson(value: unknown): AnyRecord {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as AnyRecord;
  }
  if (typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as AnyRecord;
    }
    return {};
  } catch {
    return {};
  }
}

function firstSearchParam(value: SearchParamValue): string {
  if (Array.isArray(value)) return toText(value[0], "");
  return toText(value, "");
}

function formatDate(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
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

function cardClassName(isActive: boolean) {
  const base =
    "rounded-[28px] border bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition";
  const inactive = "border-white/10";
  const active =
    "border-emerald-500/35 bg-emerald-500/[0.08] shadow-[0_0_0_1px_rgba(16,185,129,0.06),0_0_40px_rgba(16,185,129,0.08)]";
  return `${base} ${isActive ? active : inactive}`;
}

function panelClassName() {
  return "rounded-2xl border border-white/10 bg-white/[0.04] p-5";
}

function emptyStateClassName() {
  return "rounded-2xl border border-dashed border-white/10 bg-white/[0.04] px-5 py-8 text-sm text-zinc-500";
}

function actionLinkClassName(
  variant: "default" | "primary" | "danger" | "active" = "default"
) {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex w-full items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15";
  }

  if (variant === "active") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function statusTone(status: string) {
  const normalized = toText(status).toLowerCase();

  if (["success", "done", "completed", "resolved"].includes(normalized)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["running", "processing", "queued", "pending"].includes(normalized)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["failed", "error", "blocked", "escalated"].includes(normalized)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  if (["partial"].includes(normalized)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function infoBadgeClassName() {
  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300";
}

function incidentTone(hasIncident: boolean) {
  return hasIncident
    ? "bg-rose-500/15 text-rose-300 border border-rose-500/20"
    : "bg-zinc-800 text-zinc-300 border border-white/10";
}

function normalizeStatus(status: string): string {
  const normalized = toText(status).toLowerCase();

  if (["done", "success", "completed", "resolved"].includes(normalized)) {
    return "success";
  }

  if (["running", "processing", "queued", "pending"].includes(normalized)) {
    return "running";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "retry";
  }

  if (["failed", "error", "blocked", "escalated"].includes(normalized)) {
    return "failed";
  }

  if (["partial"].includes(normalized)) {
    return "partial";
  }

  return normalized || "unknown";
}

function statusPriority(status: string): number {
  const normalized = normalizeStatus(status);

  if (normalized === "failed") return 0;
  if (normalized === "running") return 1;
  if (normalized === "retry") return 2;
  if (normalized === "partial") return 3;
  if (normalized === "success") return 4;
  return 5;
}

function pickFirstText(
  record: AnyRecord,
  candidates: string[],
  fallback = ""
): string {
  for (const key of candidates) {
    const value = record[key];
    const text = toText(value, "");
    if (text) return text;
  }
  return fallback;
}

function pickFirstNumber(
  record: AnyRecord,
  candidates: string[],
  fallback = 0
): number {
  for (const key of candidates) {
    const value = record[key];
    const num = toNumber(value, Number.NaN);
    if (Number.isFinite(num)) return num;
  }
  return fallback;
}

function getJsonSources(record: AnyRecord) {
  const inputParsed = parseMaybeJson(
    record.input_json ??
      record.payload_json ??
      record.command_input_json ??
      record.input ??
      record.payload
  );

  const resultParsed = parseMaybeJson(
    record.result_json ?? record.output_json ?? record.result ?? record.output
  );

  return { inputParsed, resultParsed };
}

function getCommandStatus(record: AnyRecord, resultParsed: AnyRecord): string {
  const raw = pickFirstText(
    { ...record, ...resultParsed },
    ["status", "Status", "status_select", "Status_select"],
    "unknown"
  ).toLowerCase();

  if (["done", "success", "completed"].includes(raw)) return "done";
  if (["running", "processing"].includes(raw)) return "running";
  if (["retry", "retriable"].includes(raw)) return "retry";
  if (["failed", "error", "blocked"].includes(raw)) return "failed";
  if (["queued", "queue", "pending"].includes(raw)) return "queued";

  return raw || "unknown";
}

function getCommandCapability(
  record: AnyRecord,
  inputParsed: AnyRecord,
  resultParsed: AnyRecord
): string {
  return pickFirstText(
    { ...record, ...inputParsed, ...resultParsed },
    ["capability", "Capability", "mapped_capability"],
    "unknown_capability"
  );
}

function getCommandFlowId(
  record: AnyRecord,
  inputParsed: AnyRecord,
  resultParsed: AnyRecord
): string {
  return pickFirstText(
    { ...record, ...inputParsed, ...resultParsed },
    ["flow_id", "flowId", "flowid"],
    ""
  );
}

function getCommandRootEventId(
  record: AnyRecord,
  inputParsed: AnyRecord,
  resultParsed: AnyRecord
): string {
  return pickFirstText(
    { ...record, ...inputParsed, ...resultParsed },
    ["root_event_id", "rootEventId", "rooteventid", "event_id", "eventId"],
    ""
  );
}

function getCommandWorkspaceId(
  record: AnyRecord,
  inputParsed: AnyRecord,
  resultParsed: AnyRecord
): string {
  return pickFirstText(
    { ...record, ...inputParsed, ...resultParsed },
    ["workspace_id", "workspaceId", "Workspace_ID", "workspace"],
    "production"
  );
}

function normalizeTimelineItem(record: AnyRecord): TimelineItem {
  const { inputParsed, resultParsed } = getJsonSources(record);

  return {
    id: pickFirstText(record, ["id", "record_id", "command_id", "Command_ID"], ""),
    capability: getCommandCapability(record, inputParsed, resultParsed),
    status: getCommandStatus(record, resultParsed),
    worker: pickFirstText(record, ["worker", "Worker", "worker_id"], "—"),
    createdAt: pickFirstText(record, ["created_at", "Created_At"], ""),
    startedAt: pickFirstText(record, ["started_at", "Started_At"], ""),
    finishedAt: pickFirstText(record, ["finished_at", "Finished_At"], ""),
    stepIndex: pickFirstNumber(
      { ...record, ...inputParsed, ...resultParsed },
      ["step_index", "stepIndex"],
      0
    ),
    parentCommandId: pickFirstText(
      { ...record, ...inputParsed, ...resultParsed },
      ["parent_command_id", "parentCommandId", "linked_command", "Linked_Command"],
      ""
    ),
    flowId: getCommandFlowId(record, inputParsed, resultParsed),
    rootEventId: getCommandRootEventId(record, inputParsed, resultParsed),
    workspaceId: getCommandWorkspaceId(record, inputParsed, resultParsed),
  };
}

function sortTimeline(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    if (a.stepIndex !== b.stepIndex) {
      return a.stepIndex - b.stepIndex;
    }

    const aDate = new Date(a.startedAt || a.createdAt || 0).getTime();
    const bDate = new Date(b.startedAt || b.createdAt || 0).getTime();
    return aDate - bDate;
  });
}

function getLastKnownTimestamp(items: TimelineItem[]): number {
  const values = items
    .map((item) =>
      new Date(item.finishedAt || item.startedAt || item.createdAt || 0).getTime()
    )
    .filter((value) => Number.isFinite(value) && value > 0);

  if (values.length === 0) return 0;
  return Math.max(...values);
}

function getDurationMs(items: TimelineItem[]): number {
  if (items.length === 0) return 0;

  const sorted = sortTimeline(items);
  const firstTs = new Date(sorted[0].startedAt || sorted[0].createdAt || 0).getTime();
  const lastTs = new Date(
    sorted[sorted.length - 1].finishedAt ||
      sorted[sorted.length - 1].startedAt ||
      sorted[sorted.length - 1].createdAt ||
      0
  ).getTime();

  if (
    !Number.isFinite(firstTs) ||
    !Number.isFinite(lastTs) ||
    firstTs <= 0 ||
    lastTs <= 0
  ) {
    return 0;
  }

  return Math.max(0, lastTs - firstTs);
}

function normalizeIncidentRecord(record: AnyRecord): AnyRecord {
  return {
    ...record,
    id: toText(record.id || ""),
    flow_id: toText(record.flow_id || ""),
    root_event_id: toText(record.root_event_id || ""),
    source_record_id: toText(record.source_record_id || ""),
    workspace_id: toText(record.workspace_id || record.workspace || "production"),
    title: toText(record.title || record.name || record.error_id || "Incident"),
    status: toText(record.status || record.statut_incident || ""),
    severity: toText(record.severity || ""),
    sla_status: toText(record.sla_status || ""),
    created_at: toText(record.created_at || ""),
    updated_at: toText(record.updated_at || ""),
    resolved_at: toText(record.resolved_at || ""),
  };
}

function normalizeRegistryFlowRecord(record: AnyRecord): AnyRecord {
  return {
    ...record,
    key: toText(
      record.key ||
        record.flowId ||
        record.flow_id ||
        record.sourceRecordId ||
        record.source_record_id ||
        ""
    ),
    flowId: toText(record.flowId || record.flow_id || ""),
    rootEventId: toText(record.rootEventId || record.root_event_id || ""),
    sourceRecordId: toText(record.sourceRecordId || record.source_record_id || ""),
    workspaceId: toText(record.workspaceId || record.workspace_id || "production"),
    status: toText(record.status || ""),
    steps: toNumber(record.steps, 0),
    rootCapability: toText(record.rootCapability || record.root_capability || ""),
    terminalCapability: toText(record.terminalCapability || record.terminal_capability || ""),
    durationMs: toNumber(record.durationMs || record.duration_ms, 0),
    lastActivityTs: toNumber(record.lastActivityTs || record.last_activity_ts, 0),
    readingMode:
      record.readingMode === "registry-only" ? "registry-only" : "enriched",
    source_record_id: toText(record.source_record_id || ""),
    isPartial: toBoolean(record.isPartial, false),
    stats:
      record.stats && typeof record.stats === "object" && !Array.isArray(record.stats)
        ? record.stats
        : {},
  };
}

function getIncidentActivityTs(incident: AnyRecord): number {
  const candidates = [
    incident.resolved_at,
    incident.updated_at,
    incident.opened_at,
    incident.created_at,
  ]
    .map((value: unknown) => new Date(value as string).getTime())
    .filter((value) => Number.isFinite(value) && value > 0);

  if (candidates.length === 0) return 0;
  return Math.max(...candidates);
}

function getIncidentDerivedStatus(incidents: AnyRecord[]): string {
  if (incidents.length === 0) return "unknown";

  const normalized = incidents.map((incident) => {
    const status = toText(incident.status).toLowerCase();
    const slaStatus = toText(incident.sla_status).toLowerCase();
    const hasResolvedAt = Boolean(toText(incident.resolved_at || ""));

    if (hasResolvedAt) return "resolved";
    if (["resolved", "closed", "done"].includes(status)) return "resolved";
    if (["escalated", "escalade", "escaladé"].includes(status)) return "failed";
    if (["open", "opened", "active", "new"].includes(status)) return "failed";
    if (slaStatus === "breached") return "failed";
    if (slaStatus === "open") return "failed";
    return "unknown";
  });

  if (normalized.includes("failed")) return "failed";
  if (normalized.every((value) => value === "resolved")) return "success";
  return "unknown";
}

function matchIncidents(
  incidents: AnyRecord[],
  target: {
    flowId?: string;
    rootEventId?: string;
    sourceRecordId?: string;
  }
) {
  const flowId = toText(target.flowId);
  const rootEventId = toText(target.rootEventId);
  const sourceRecordId = toText(target.sourceRecordId);

  return incidents.filter((incident) => {
    if (flowId && toText(incident.flow_id) === flowId) return true;
    if (rootEventId && toText(incident.root_event_id) === rootEventId) return true;
    if (sourceRecordId && toText(incident.source_record_id) === sourceRecordId) return true;
    if (sourceRecordId && toText(incident.id) === sourceRecordId) return true;
    return false;
  });
}

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/i.test(toText(value));
}

function getDisplayTitle(flow: FlowCard): string {
  const candidates = [flow.flowId, flow.rootEventId, flow.sourceRecordId, flow.key]
    .map((value) => toText(value))
    .filter(Boolean);

  const readable = candidates.find((value) => !isRecordIdLike(value));
  return readable || candidates[0] || "Flow";
}

function getDetailId(flow: FlowCard): string {
  return toText(flow.flowId || flow.rootEventId || flow.sourceRecordId || flow.key);
}

function getSelectId(flow: FlowCard): string {
  return toText(flow.sourceRecordId || flow.flowId || flow.rootEventId || flow.key);
}

function incidentLabel(count: number, hasIncident: boolean): string {
  if (!hasIncident || count <= 0) return "Aucun incident";
  if (count === 1) return "1 incident";
  return `${count} incidents`;
}

function buildIncidentHref(flow: FlowCard): string {
  const params = new URLSearchParams();

  if (toText(flow.flowId)) params.set("flow_id", flow.flowId);
  if (toText(flow.rootEventId)) params.set("root_event_id", flow.rootEventId);
  if (toText(flow.sourceRecordId)) params.set("source_record_id", flow.sourceRecordId);
  params.set("from", "flows");

  return `/incidents?${params.toString()}`;
}

function buildSelectHref(flow: FlowCard): string {
  const selected = encodeURIComponent(getSelectId(flow));
  return `/flows?selected=${selected}`;
}

function buildDetailHref(flow: FlowCard): string {
  const detailId = encodeURIComponent(getDetailId(flow));
  return `/flows/${detailId}`;
}

function buildEnrichedFlows(
  commands: TimelineItem[],
  incidents: AnyRecord[]
): FlowCard[] {
  const groups = new Map<string, TimelineItem[]>();

  for (const command of commands) {
    const key = toText(command.flowId || command.rootEventId);
    if (!key) continue;

    const bucket = groups.get(key) ?? [];
    bucket.push(command);
    groups.set(key, bucket);
  }

  const flows: FlowCard[] = [];

  for (const [, group] of groups.entries()) {
    const ordered = sortTimeline(group);

    const flowId =
      ordered.map((item) => toText(item.flowId)).find(Boolean) || "";
    const rootEventId =
      ordered.map((item) => toText(item.rootEventId)).find(Boolean) || "";
    const workspaceId =
      ordered.map((item) => toText(item.workspaceId)).find(Boolean) || "production";

    const linkedIncidents = matchIncidents(incidents, {
      flowId,
      rootEventId,
    });

    const steps = ordered.length;
    const lastActivityTs = getLastKnownTimestamp(ordered);
    const durationMs = getDurationMs(ordered);
    const lastCommand = ordered[ordered.length - 1];
    const firstCommand = ordered[0];

    const status = normalizeStatus(
      ordered.some((item) => ["failed", "error", "blocked"].includes(item.status))
        ? "failed"
        : ordered.some((item) => ["running", "queued", "processing"].includes(item.status))
          ? "running"
          : ordered.some((item) => ["retry", "retriable"].includes(item.status))
            ? "retry"
            : ordered.length > 0 && ordered.every((item) => item.status === "done")
              ? "success"
              : "unknown"
    );

    flows.push({
      key: toText(flowId || rootEventId),
      flowId,
      rootEventId,
      sourceRecordId: "",
      workspaceId,
      status,
      steps,
      rootCapability: toText(firstCommand?.capability || ""),
      terminalCapability: toText(lastCommand?.capability || ""),
      durationMs,
      lastActivityTs,
      hasIncident: linkedIncidents.length > 0,
      incidentCount: linkedIncidents.length,
      readingMode: "enriched",
      isPartial: false,
    });
  }

  return flows;
}

function buildRegistryOnlyFlows(
  registryFlows: AnyRecord[],
  incidents: AnyRecord[],
  enrichedFlows: FlowCard[]
): FlowCard[] {
  const existingIds = new Set<string>();

  for (const flow of enrichedFlows) {
    [flow.key, flow.flowId, flow.rootEventId, flow.sourceRecordId]
      .map((value) => toText(value))
      .filter(Boolean)
      .forEach((value) => existingIds.add(value));
  }

  const flows: FlowCard[] = [];

  for (const raw of registryFlows) {
    const flow = normalizeRegistryFlowRecord(raw);

    const candidates = [
      flow.key,
      flow.flowId,
      flow.rootEventId,
      flow.sourceRecordId,
      flow.source_record_id,
    ]
      .map((value: unknown) => toText(value))
      .filter(Boolean);

    if (candidates.some((value) => existingIds.has(value))) {
      continue;
    }

    const linkedIncidents = matchIncidents(incidents, {
      flowId: flow.flowId,
      rootEventId: flow.rootEventId,
      sourceRecordId: flow.sourceRecordId || flow.source_record_id,
    });

    const stats = flow.stats as AnyRecord;
    const rawStatus = normalizeStatus(flow.status);
    const statsRunning =
      toNumber(stats.running, 0) + toNumber(stats.queued, 0) > 0;
    const statsFailed =
      toNumber(stats.error, 0) + toNumber(stats.dead, 0) > 0;
    const statsRetry = toNumber(stats.retry, 0) > 0;
    const statsDone = toNumber(stats.done, 0) > 0;

    let computedStatus = rawStatus;

    if (!computedStatus || computedStatus === "unknown") {
      if (statsFailed) {
        computedStatus = "failed";
      } else if (statsRunning) {
        computedStatus = "running";
      } else if (statsRetry) {
        computedStatus = "retry";
      } else if (statsDone) {
        computedStatus = "success";
      } else {
        computedStatus = getIncidentDerivedStatus(linkedIncidents);
      }
    }

    const lastIncidentTs = Math.max(...linkedIncidents.map(getIncidentActivityTs), 0);
    const lastActivityTs = Math.max(toNumber(flow.lastActivityTs, 0), lastIncidentTs);

    flows.push({
      key: toText(flow.key || flow.flowId || flow.rootEventId || flow.sourceRecordId),
      flowId: toText(flow.flowId),
      rootEventId: toText(flow.rootEventId),
      sourceRecordId: toText(flow.sourceRecordId || flow.source_record_id),
      workspaceId: toText(flow.workspaceId || "production"),
      status: normalizeStatus(computedStatus),
      steps: toNumber(flow.steps, 0),
      rootCapability: "Registre uniquement",
      terminalCapability: "Registre uniquement",
      durationMs: toNumber(flow.durationMs, 0),
      lastActivityTs,
      hasIncident: linkedIncidents.length > 0,
      incidentCount: linkedIncidents.length,
      readingMode: "registry-only",
      isPartial: true,
    });
  }

  return flows;
}

function buildIncidentOnlyFlows(
  incidents: AnyRecord[],
  existingFlows: FlowCard[]
): FlowCard[] {
  const existingIds = new Set<string>();

  for (const flow of existingFlows) {
    [flow.key, flow.flowId, flow.rootEventId, flow.sourceRecordId]
      .map((value) => toText(value))
      .filter(Boolean)
      .forEach((value) => existingIds.add(value));
  }

  const groups = new Map<string, AnyRecord[]>();

  for (const incident of incidents) {
    const key = toText(
      incident.flow_id || incident.root_event_id || incident.source_record_id || incident.id
    );

    if (!key) continue;
    if (existingIds.has(key)) continue;

    const bucket = groups.get(key) ?? [];
    bucket.push(incident);
    groups.set(key, bucket);
  }

  const flows: FlowCard[] = [];

  for (const [, bucket] of groups.entries()) {
    const latest =
      [...bucket].sort((a, b) => getIncidentActivityTs(b) - getIncidentActivityTs(a))[0] ??
      null;

    if (!latest) continue;

    const flowId = toText(latest.flow_id || "");
    const rootEventId = toText(latest.root_event_id || "");
    const sourceRecordId = toText(latest.source_record_id || latest.id || "");
    const workspaceId = toText(latest.workspace_id || "production");

    flows.push({
      key: toText(flowId || rootEventId || sourceRecordId),
      flowId,
      rootEventId,
      sourceRecordId,
      workspaceId,
      status: normalizeStatus(getIncidentDerivedStatus(bucket)),
      steps: 0,
      rootCapability: "Registre uniquement",
      terminalCapability: "Registre uniquement",
      durationMs: 0,
      lastActivityTs: Math.max(...bucket.map(getIncidentActivityTs), 0),
      hasIncident: bucket.length > 0,
      incidentCount: bucket.length,
      readingMode: "registry-only",
      isPartial: true,
    });
  }

  return flows;
}

function sortFlows(flows: FlowCard[]): FlowCard[] {
  return [...flows].sort((a, b) => {
    const statusDiff = statusPriority(a.status) - statusPriority(b.status);
    if (statusDiff !== 0) return statusDiff;

    const activityDiff = b.lastActivityTs - a.lastActivityTs;
    if (activityDiff !== 0) return activityDiff;

    return getDisplayTitle(a).localeCompare(getDisplayTitle(b), "fr");
  });
}

function isFlowSelected(flow: FlowCard, selectedId: string): boolean {
  if (!selectedId) return false;

  const candidates = [flow.key, flow.flowId, flow.rootEventId, flow.sourceRecordId]
    .map((value) => toText(value))
    .filter(Boolean);

  return candidates.includes(selectedId);
}

function metaRowLabel(flow: FlowCard): string {
  return flow.readingMode === "registry-only" ? "Source / Root record" : "Root";
}

function metaRowValue(flow: FlowCard): string {
  if (flow.readingMode === "registry-only") {
    return toText(flow.sourceRecordId || flow.rootEventId || flow.flowId || "—", "—");
  }

  return toText(flow.rootEventId || flow.flowId || "—", "—");
}

function activityLabel(flow: FlowCard): string {
  if (flow.lastActivityTs > 0) {
    return formatDate(flow.lastActivityTs);
  }

  return "—";
}

function sectionTitle(
  title: string,
  subtitle?: string
) {
  return (
    <div className="space-y-3">
      <div className="text-xs uppercase tracking-[0.24em] text-white/35">
        {title}
      </div>
      {subtitle ? (
        <p className="max-w-3xl text-base leading-8 text-zinc-400">{subtitle}</p>
      ) : null}
    </div>
  );
}

function FlowListCard({
  flow,
  isActive,
}: {
  flow: FlowCard;
  isActive: boolean;
}) {
  const displayTitle = getDisplayTitle(flow);
  const incidentText = incidentLabel(flow.incidentCount, flow.hasIncident);
  const incidentHref = buildIncidentHref(flow);
  const detailHref = buildDetailHref(flow);
  const selectHref = buildSelectHref(flow);

  return (
    <article className={cardClassName(isActive)} id={`flow-${encodeURIComponent(getSelectId(flow))}`}>
      <div className="space-y-5">
        <div className="space-y-4">
          <h3 className="break-words text-[2rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.25rem]">
            {displayTitle}
          </h3>

          <div className="grid gap-3 text-[15px] leading-7 text-zinc-300">
            <div>
              <span className="text-zinc-400">Lecture:</span>{" "}
              <span className="text-white">
                {flow.readingMode === "registry-only"
                  ? "Registre uniquement"
                  : "Enrichie"}
              </span>
            </div>

            <div className="break-all">
              <span className="text-zinc-400">{metaRowLabel(flow)}:</span>{" "}
              <span className="font-mono text-white">{metaRowValue(flow)}</span>
            </div>

            <div>
              <span className="text-zinc-400">Activité:</span>{" "}
              <span className="text-white">{activityLabel(flow)}</span>
            </div>

            <div>
              <span className="text-zinc-400">Incident:</span>{" "}
              <span className="text-white">{incidentText}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${statusTone(
              flow.status
            )}`}
          >
            {toText(flow.status, "unknown").toUpperCase()}
          </span>

          {flow.isPartial ? (
            <span
              className={`inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${statusTone(
                "partial"
              )}`}
            >
              PARTIAL
            </span>
          ) : null}

          <span
            className={`inline-flex rounded-full px-4 py-1.5 text-sm font-medium ${incidentTone(
              flow.hasIncident
            )}`}
          >
            {incidentText}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {isActive ? (
            <span className={actionLinkClassName("active")}>Flow actif</span>
          ) : (
            <Link href={selectHref} className={actionLinkClassName()}>
              Sélectionner
            </Link>
          )}

          {flow.hasIncident ? (
            <Link href={incidentHref} className={actionLinkClassName("danger")}>
              {flow.incidentCount > 1 ? "Voir les incidents" : "Voir l’incident"}
            </Link>
          ) : null}

          <Link href={detailHref} className={actionLinkClassName()}>
            Voir le détail
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function FlowsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const selectedId = decodeURIComponent(firstSearchParam(resolvedSearchParams.selected));

  const api = await import("@/lib/api");

  const fetchCommands = (api as AnyRecord).fetchCommands as
    | undefined
    | (() => Promise<any>);
  const fetchIncidents = (api as AnyRecord).fetchIncidents as
    | undefined
    | (() => Promise<any>);
  const fetchFlows = (api as AnyRecord).fetchFlows as
    | undefined
    | (() => Promise<any>);

  let commandsData: any = null;
  let incidentsData: any = null;
  let flowsData: any = null;

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

  const rawCommands: AnyRecord[] = Array.isArray(commandsData?.commands)
    ? commandsData.commands
    : Array.isArray(commandsData)
      ? commandsData
      : [];

  const rawIncidents: AnyRecord[] = Array.isArray(incidentsData?.incidents)
    ? incidentsData.incidents
    : Array.isArray(incidentsData)
      ? incidentsData
      : [];

  const rawFlows: AnyRecord[] = Array.isArray(flowsData?.flows)
    ? flowsData.flows
    : Array.isArray(flowsData)
      ? flowsData
      : [];

  const commands = rawCommands.map(normalizeTimelineItem);
  const incidents = rawIncidents.map(normalizeIncidentRecord);
  const registryFlowRecords = rawFlows.map(normalizeRegistryFlowRecord);

  const enrichedFlows = sortFlows(buildEnrichedFlows(commands, incidents));
  const registryOnlyFlows = sortFlows(
    buildRegistryOnlyFlows(registryFlowRecords, incidents, enrichedFlows)
  );
  const incidentOnlyFlows = sortFlows(
    buildIncidentOnlyFlows(incidents, [...enrichedFlows, ...registryOnlyFlows])
  );

  const registrySectionFlows = sortFlows([...registryOnlyFlows, ...incidentOnlyFlows]);

  const attentionFlows = sortFlows(
    [...enrichedFlows, ...registrySectionFlows].filter(
      (flow) => flow.hasIncident || ["failed", "running", "retry"].includes(normalizeStatus(flow.status))
    )
  ).slice(0, 6);

  return (
    <div className="space-y-10">
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Flows
        </h1>
        <p className="mt-4 max-w-4xl text-lg leading-8 text-zinc-400">
          Vue de pilotage BOSAI pour suivre les flows enrichis et les flows
          présents uniquement dans le registre.
        </p>
      </div>

      {attentionFlows.length > 0 ? (
        <section className="space-y-5">
          {sectionTitle(
            "Needs attention",
            "Flows prioritaires à surveiller maintenant: incidents actifs, échecs, retries ou activité en cours."
          )}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {attentionFlows.map((flow) => (
              <FlowListCard
                key={`attention-${flow.key}-${flow.sourceRecordId}-${flow.rootEventId}`}
                flow={flow}
                isActive={isFlowSelected(flow, selectedId)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {enrichedFlows.length > 0 ? (
        <section className="space-y-5">
          {sectionTitle("Flows enrichis")}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {enrichedFlows.map((flow) => (
              <FlowListCard
                key={`enriched-${flow.key}-${flow.flowId}-${flow.rootEventId}`}
                flow={flow}
                isActive={isFlowSelected(flow, selectedId)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {registrySectionFlows.length > 0 ? (
        <section className="space-y-5">
          {sectionTitle(
            "Flows registre uniquement",
            "Flows présents dans le registre BOSAI mais sans lecture causale détaillée disponible pour le moment."
          )}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {registrySectionFlows.map((flow) => (
              <FlowListCard
                key={`registry-${flow.key}-${flow.sourceRecordId}-${flow.rootEventId}`}
                flow={flow}
                isActive={isFlowSelected(flow, selectedId)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {enrichedFlows.length === 0 && registrySectionFlows.length === 0 ? (
        <div className={emptyStateClassName()}>
          Aucun flow disponible pour le moment.
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={panelClassName()}>
          <div className="text-sm text-zinc-400">Flows enrichis</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {enrichedFlows.length}
          </div>
        </div>

        <div className={panelClassName()}>
          <div className="text-sm text-zinc-400">Registry-only</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {registrySectionFlows.length}
          </div>
        </div>

        <div className={panelClassName()}>
          <div className="text-sm text-zinc-400">Avec incident</div>
          <div className="mt-3 text-4xl font-semibold text-rose-300">
            {[...enrichedFlows, ...registrySectionFlows].filter((flow) => flow.hasIncident).length}
          </div>
        </div>

        <div className={panelClassName()}>
          <div className="text-sm text-zinc-400">À surveiller</div>
          <div className="mt-3 text-4xl font-semibold text-amber-300">
            {attentionFlows.length}
          </div>
        </div>
      </section>
    </div>
  );
}
