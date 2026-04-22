import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  fetchCommands,
  fetchEvents,
  fetchIncidents,
  type CommandItem,
  type EventItem,
  type IncidentItem,
} from "@/lib/api";
import {
  DashboardStatusBadge,
  type DashboardStatusKind,
} from "@/components/dashboard/StatusBadge";
import {
  resolveWorkspaceContext,
  workspaceMatchesOrUnscoped,
} from "@/lib/workspace";

export const dynamic = "force-dynamic";

type SearchParams = {
  workspace_id?: string | string[];
  workspaceId?: string | string[];
  flow_id?: string | string[];
  root_event_id?: string | string[];
  source_event_id?: string | string[];
  from?: string | string[];
};

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
  searchParams?: Promise<SearchParams> | SearchParams;
};

function cardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function metaBoxClassName() {
  return "rounded-[20px] border border-white/10 bg-black/20 px-4 py-4";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default",
  disabled = false
) {
  const base =
    "inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "danger") {
    return `${base} border border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15`;
  }

  if (variant === "soft") {
    return `${base} border border-white/10 bg-black/20 text-zinc-200 hover:bg-white/[0.06]`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function sectionLabelClassName() {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function neutralPillClassName() {
  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-zinc-300";
}

function technicalValueClassName() {
  return "break-all [overflow-wrap:anywhere] font-mono text-zinc-200";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDateParts(value?: string | null): { date: string; time: string } {
  if (!value) {
    return { date: "—", time: "" };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: String(value), time: "" };
  }

  return {
    date: new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
    }).format(date),
    time: new Intl.DateTimeFormat("fr-FR", {
      timeStyle: "short",
    }).format(date),
  };
}

function firstParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function buildHref(
  pathname: string,
  params: Record<string, string | undefined>
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const text = String(value || "").trim();
    if (text) search.set(key, text);
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function parseMaybeJson(value: unknown): Record<string, unknown> {
  if (!value) return {};

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function stringifyPretty(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return JSON.stringify({ value: String(value) }, null, 2);
  }
}

function toText(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = toText(item, "");
      if (candidate) return candidate;
    }
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

function toTextOrEmpty(value: unknown): string {
  return toText(value, "");
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function compactTechnicalId(value: string, max = 34): string {
  const clean = value.trim();
  if (!clean) return "—";
  if (clean.length <= max) return clean;

  const keepStart = Math.max(12, Math.floor((max - 3) / 2));
  const keepEnd = Math.max(8, max - keepStart - 3);

  return `${clean.slice(0, keepStart)}...${clean.slice(-keepEnd)}`;
}

function safeResolveEventDetailActiveWorkspaceId(args: {
  searchParams: SearchParams;
  cookieValues: Record<string, string | undefined>;
}): string {
  try {
    return resolveWorkspaceContext(args).activeWorkspaceId || "";
  } catch {
    return "";
  }
}

function extractEventItems(payload: unknown): EventItem[] {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is EventItem =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item)
    );
  }

  if (typeof payload !== "object") return [];

  const raw = payload as Record<string, unknown>;
  const candidates: unknown[] = [
    raw.events,
    raw.items,
    raw.results,
    raw.records,
    raw.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is EventItem =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item)
      );
    }

    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const nested = candidate as Record<string, unknown>;
      for (const key of ["events", "items", "results", "records", "data"]) {
        const inner = nested[key];
        if (Array.isArray(inner)) {
          return inner.filter(
            (item): item is EventItem =>
              Boolean(item) && typeof item === "object" && !Array.isArray(item)
          );
        }
      }
    }
  }

  return [];
}

function extractCommandItems(payload: unknown): CommandItem[] {
  if (!payload || typeof payload !== "object") return [];

  const raw = payload as Record<string, unknown>;
  const candidates: unknown[] = [
    raw.commands,
    raw.items,
    raw.results,
    raw.records,
    raw.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as CommandItem[];
    }

    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const nested = candidate as Record<string, unknown>;
      for (const key of ["commands", "items", "results", "records", "data"]) {
        const inner = nested[key];
        if (Array.isArray(inner)) {
          return inner as CommandItem[];
        }
      }
    }
  }

  return [];
}

function extractIncidentItems(payload: unknown): IncidentItem[] {
  if (!payload || typeof payload !== "object") return [];

  const raw = payload as Record<string, unknown>;
  const candidates: unknown[] = [
    raw.incidents,
    raw.items,
    raw.results,
    raw.records,
    raw.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as IncidentItem[];
    }

    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const nested = candidate as Record<string, unknown>;
      for (const key of ["incidents", "items", "results", "records", "data"]) {
        const inner = nested[key];
        if (Array.isArray(inner)) {
          return inner as IncidentItem[];
        }
      }
    }
  }

  return [];
}

function getStatusBucket(status?: string): string {
  const normalized = (status || "").trim().toLowerCase();

  if (["processed", "done", "success", "completed", "resolved"].includes(normalized)) {
    return "processed";
  }

  if (["queued", "queue", "pending", "new"].includes(normalized)) {
    return "queued";
  }

  if (["running", "processing"].includes(normalized)) {
    return "running";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "retry";
  }

  if (["ignored"].includes(normalized)) {
    return "ignored";
  }

  if (["error", "failed", "dead", "blocked"].includes(normalized)) {
    return "error";
  }

  return "other";
}

function getStatusBadgeKind(status?: string): DashboardStatusKind {
  const bucket = getStatusBucket(status);

  if (bucket === "processed") return "success";
  if (bucket === "queued") return "queued";
  if (bucket === "running") return "running";
  if (bucket === "retry") return "retry";
  if (bucket === "error") return "failed";
  if (bucket === "ignored") return "unknown";
  return "unknown";
}

function getStatusLabel(status?: string): string {
  const bucket = getStatusBucket(status);

  if (bucket === "processed") return "PROCESSED";
  if (bucket === "queued") return "QUEUED";
  if (bucket === "running") return "RUNNING";
  if (bucket === "retry") return "RETRY";
  if (bucket === "ignored") return "IGNORED";
  if (bucket === "error") return "ERROR";

  const raw = (status || "").trim();
  return raw ? raw.toUpperCase() : "UNKNOWN";
}

function getEventPayload(event: EventItem): Record<string, unknown> {
  return parseMaybeJson(event.payload);
}

function getEventType(event: EventItem): string {
  const payload = getEventPayload(event);

  return (
    toTextOrEmpty(event.event_type) ||
    toTextOrEmpty(event.type) ||
    toTextOrEmpty(payload.event_type) ||
    toTextOrEmpty(payload.type) ||
    "Event detail"
  );
}

function getEventStatus(event: EventItem): string {
  const payload = getEventPayload(event);
  return toTextOrEmpty(event.status) || toTextOrEmpty(payload.status) || "unknown";
}

function getEventCapability(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(record.mapped_capability) ||
    toTextOrEmpty(payload.mapped_capability) ||
    toTextOrEmpty(payload.capability) ||
    "—"
  );
}

function getEventWorkspace(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(event.workspace_id) ||
    toTextOrEmpty(record.workspace_id) ||
    toTextOrEmpty(record.Workspace_ID) ||
    toTextOrEmpty(payload.workspace_id) ||
    toTextOrEmpty(payload.workspaceId) ||
    "—"
  );
}

function getEventSource(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(event.source) ||
    toTextOrEmpty(record.source) ||
    toTextOrEmpty(payload.source) ||
    "—"
  );
}

function getEventRunId(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(event.run_id) ||
    toTextOrEmpty(record.run_id) ||
    toTextOrEmpty(record.Run_ID) ||
    toTextOrEmpty(record.run_record_id) ||
    toTextOrEmpty(record.Run_Record_ID) ||
    toTextOrEmpty(payload.run_id) ||
    toTextOrEmpty(payload.runId) ||
    toTextOrEmpty(payload.run_record_id) ||
    toTextOrEmpty(payload.runRecordId) ||
    "—"
  );
}

function getLinkedCommandValue(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  const rawLinked = record.linked_command;
  if (Array.isArray(rawLinked) && rawLinked.length > 0) {
    return toTextOrEmpty(rawLinked[0]);
  }

  return (
    toTextOrEmpty(event.command_id) ||
    toTextOrEmpty(event.linked_command) ||
    toTextOrEmpty(record.command_id) ||
    toTextOrEmpty(record.Command_ID) ||
    toTextOrEmpty(record.linked_command) ||
    toTextOrEmpty(record.Linked_Command) ||
    toTextOrEmpty(payload.command_id) ||
    toTextOrEmpty(payload.commandId) ||
    ""
  );
}

function getEventRealFlowId(event: EventItem): string {
  const payload = getEventPayload(event);

  return (
    toTextOrEmpty(event.flow_id) ||
    toTextOrEmpty(payload.flow_id) ||
    toTextOrEmpty(payload.flowId) ||
    toTextOrEmpty(payload.flowid) ||
    ""
  );
}

function getRootEventId(event: EventItem): string {
  const payload = getEventPayload(event);

  return (
    toTextOrEmpty(event.root_event_id) ||
    toTextOrEmpty(payload.root_event_id) ||
    toTextOrEmpty(payload.rootEventId) ||
    ""
  );
}

function getSourceRecordId(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(event.source_record_id) ||
    toTextOrEmpty(event.source_event_id) ||
    toTextOrEmpty(record.source_record_id) ||
    toTextOrEmpty(record.Source_Record_ID) ||
    toTextOrEmpty(record.source_event_id) ||
    toTextOrEmpty(record.Source_Event_ID) ||
    toTextOrEmpty(payload.source_record_id) ||
    toTextOrEmpty(payload.sourceRecordId) ||
    toTextOrEmpty(payload.source_event_id) ||
    toTextOrEmpty(payload.sourceEventId) ||
    ""
  );
}

function getFlowDisplayTarget(event: EventItem): string {
  return (
    getEventRealFlowId(event) ||
    getRootEventId(event) ||
    getSourceRecordId(event) ||
    ""
  );
}

function getFlowNavigationTarget(event: EventItem): string {
  const realFlowId = getEventRealFlowId(event);
  if (realFlowId) return realFlowId;

  const rootEventId = getRootEventId(event);
  if (rootEventId) return rootEventId;

  const sourceRecordId = getSourceRecordId(event);
  if (sourceRecordId) return sourceRecordId;

  return "";
}

function getCreatedAt(event: EventItem): string {
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(event.created_at) ||
    toTextOrEmpty(record.Created_At) ||
    ""
  );
}

function getUpdatedAt(event: EventItem): string {
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(event.updated_at) ||
    toTextOrEmpty(record.Updated_At) ||
    toTextOrEmpty(event.processed_at) ||
    ""
  );
}

function getProcessedAt(event: EventItem): string {
  return toTextOrEmpty(event.processed_at) || "";
}

function getCommandInput(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.input);
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.result);
}

function getCommandRootEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.root_event_id) ||
    toTextOrEmpty(input.root_event_id) ||
    toTextOrEmpty(input.rootEventId) ||
    toTextOrEmpty(result.root_event_id) ||
    toTextOrEmpty(result.rootEventId) ||
    ""
  );
}

function getCommandSourceEventId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);
  const record = command as Record<string, unknown>;

  return (
    toTextOrEmpty(record.source_event_id) ||
    toTextOrEmpty(record.Source_Event_ID) ||
    toTextOrEmpty(input.source_event_id) ||
    toTextOrEmpty(input.sourceEventId) ||
    toTextOrEmpty(input.event_id) ||
    toTextOrEmpty(input.eventId) ||
    toTextOrEmpty(result.source_event_id) ||
    toTextOrEmpty(result.sourceEventId) ||
    toTextOrEmpty(result.event_id) ||
    toTextOrEmpty(result.eventId) ||
    ""
  );
}

function getCommandFlowId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.flow_id) ||
    toTextOrEmpty(input.flow_id) ||
    toTextOrEmpty(input.flowId) ||
    toTextOrEmpty(result.flow_id) ||
    toTextOrEmpty(result.flowId) ||
    ""
  );
}

function getCommandWorkspace(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.workspace_id) ||
    toTextOrEmpty(input.workspace_id) ||
    toTextOrEmpty(input.workspaceId) ||
    toTextOrEmpty(result.workspace_id) ||
    toTextOrEmpty(result.workspaceId) ||
    ""
  );
}

function getCommandStartedAt(command: CommandItem): string {
  return toTextOrEmpty(command.started_at);
}

function getCommandFinishedAt(command: CommandItem): string {
  return toTextOrEmpty(command.finished_at);
}

function getCommandCapability(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.capability) ||
    toTextOrEmpty(input.capability) ||
    toTextOrEmpty(result.capability) ||
    ""
  );
}

function buildSyntheticEventFromCommand(id: string, command: CommandItem): EventItem {
  return {
    id,
    event_type:
      toTextOrEmpty(getCommandInput(command).event_type) ||
      toTextOrEmpty(getCommandInput(command).type) ||
      getCommandCapability(command) ||
      "synthetic_event",
    status:
      toTextOrEmpty(command.status) ||
      toTextOrEmpty(getCommandResult(command).status) ||
      "processed",
    workspace_id: getCommandWorkspace(command),
    flow_id: getCommandFlowId(command),
    root_event_id: getCommandRootEventId(command),
    source_record_id: getCommandSourceEventId(command),
    source_event_id: getCommandSourceEventId(command),
    command_id: String(command.id || ""),
    linked_command: String(command.id || ""),
    created_at: getCommandStartedAt(command) || getCommandFinishedAt(command),
    updated_at: getCommandFinishedAt(command) || getCommandStartedAt(command),
    processed_at: getCommandFinishedAt(command) || getCommandStartedAt(command),
    payload: {
      source: "synthetic_from_command",
      command_id: String(command.id || ""),
      reconstructed_from_command: true,
      capability: getCommandCapability(command),
      flow_id: getCommandFlowId(command),
      root_event_id: getCommandRootEventId(command),
      source_event_id: getCommandSourceEventId(command),
      workspace_id: getCommandWorkspace(command),
    },
  } as EventItem;
}

function isSyntheticEvent(event: EventItem): boolean {
  return toTextOrEmpty(getEventPayload(event).source) === "synthetic_from_command";
}

function getHeaderTitle(event: EventItem): string {
  return getEventCapability(event) !== "—"
    ? getEventCapability(event)
    : getEventType(event);
}

function getIncidentIdCandidates(incident: IncidentItem): string[] {
  return Array.from(
    new Set(
      [
        toTextOrEmpty(incident.id),
        toTextOrEmpty(incident.flow_id),
        toTextOrEmpty(incident.root_event_id),
        toTextOrEmpty((incident as Record<string, unknown>).source_record_id),
        toTextOrEmpty(incident.command_id),
        toTextOrEmpty(incident.linked_command),
      ].filter(Boolean)
    )
  );
}

function buildIncidentHref(
  matchedIncident: IncidentItem | null,
  workspaceId: string
): string {
  if (!matchedIncident?.id) return "";
  return buildHref(`/incidents/${encodeURIComponent(String(matchedIncident.id))}`, {
    workspace_id: workspaceId || undefined,
  });
}

function MetaItem({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: ReactNode;
  breakAll?: boolean;
}) {
  return (
    <div className={breakAll ? "break-all [overflow-wrap:anywhere]" : undefined}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className="mt-1 text-zinc-200">{value}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const parts = formatDateParts(value);

  return (
    <div className={cardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-3 space-y-1">
        <div className="text-lg font-semibold tracking-tight text-white sm:text-xl">
          {parts.date}
        </div>
        {parts.time ? <div className="text-sm text-zinc-400">{parts.time}</div> : null}
      </div>
    </div>
  );
}

export default async function EventDetailPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const id = decodeURIComponent(resolvedParams.id);
  const cookieStore = await cookies();

  const fallbackWorkspaceId = safeResolveEventDetailActiveWorkspaceId({
    searchParams: resolvedSearchParams,
    cookieValues: {
      bosai_active_workspace_id:
        cookieStore.get("bosai_active_workspace_id")?.value,
      bosai_workspace_id: cookieStore.get("bosai_workspace_id")?.value,
      workspace_id: cookieStore.get("workspace_id")?.value,
      bosai_allowed_workspace_ids:
        cookieStore.get("bosai_allowed_workspace_ids")?.value,
      allowed_workspace_ids:
        cookieStore.get("allowed_workspace_ids")?.value,
    },
  });

  const activeWorkspaceId =
    firstParam(resolvedSearchParams.workspace_id).trim() ||
    firstParam(resolvedSearchParams.workspaceId).trim() ||
    fallbackWorkspaceId ||
    "";

  const incomingFlowId = firstParam(resolvedSearchParams.flow_id).trim();
  const incomingRootEventId = firstParam(resolvedSearchParams.root_event_id).trim();
  const incomingSourceEventId = firstParam(
    resolvedSearchParams.source_event_id
  ).trim();
  const from = firstParam(resolvedSearchParams.from).trim();

  let event: EventItem | null = null;

  try {
    const rawEvents = await fetchEvents({
      limit: 500,
      workspaceId: activeWorkspaceId || undefined,
    });

    const events = extractEventItems(rawEvents).filter((item) =>
      workspaceMatchesOrUnscoped(getEventWorkspace(item), activeWorkspaceId)
    );

    event = events.find((item) => String(item.id) === id) || null;
  } catch {
    event = null;
  }

  if (!event) {
    try {
      const rawCommands = await fetchCommands({
        limit: 500,
        workspaceId: activeWorkspaceId || undefined,
      });

      const commands = extractCommandItems(rawCommands).filter((command) =>
        workspaceMatchesOrUnscoped(getCommandWorkspace(command), activeWorkspaceId)
      );

      const matchedCommand =
        commands.find((command) => getCommandRootEventId(command) === id) ||
        commands.find((command) => getCommandSourceEventId(command) === id) ||
        null;

      if (matchedCommand) {
        event = buildSyntheticEventFromCommand(id, matchedCommand);
      }
    } catch {
      event = null;
    }
  }

  if (!event) {
    notFound();
  }

  const title = getHeaderTitle(event);
  const status = getEventStatus(event);
  const linkedCommand = getLinkedCommandValue(event);
  const flowDisplayTarget = getFlowDisplayTarget(event);
  const flowNavigationTarget = getFlowNavigationTarget(event);
  const rootEventId = getRootEventId(event);
  const sourceRecordId = getSourceRecordId(event);
  const workspace = getEventWorkspace(event);
  const source = getEventSource(event);
  const capability = getEventCapability(event);
  const synthetic = isSyntheticEvent(event);

  const effectiveWorkspaceId = activeWorkspaceId || (workspace !== "—" ? workspace : "");

  let matchedIncident: IncidentItem | null = null;
  try {
    const rawIncidents = await fetchIncidents({
      limit: 300,
      workspaceId: effectiveWorkspaceId || undefined,
    });

    const incidents = extractIncidentItems(rawIncidents).filter((incident) =>
      workspaceMatchesOrUnscoped(
        toTextOrEmpty((incident as Record<string, unknown>).workspace_id) ||
          toTextOrEmpty((incident as Record<string, unknown>).Workspace_ID) ||
          toTextOrEmpty((incident as Record<string, unknown>).workspace) ||
          toTextOrEmpty((incident as Record<string, unknown>).Workspace),
        effectiveWorkspaceId
      )
    );

    const identifiers = [
      String(event.id || ""),
      linkedCommand,
      flowDisplayTarget,
      flowNavigationTarget,
      rootEventId,
      sourceRecordId,
    ].filter(Boolean);

    matchedIncident =
      incidents.find((incident) =>
        getIncidentIdCandidates(incident).some((candidate) =>
          identifiers.includes(candidate)
        )
      ) || null;
  } catch {
    matchedIncident = null;
  }

  const hasCommand = linkedCommand !== "";
  const hasFlow = flowNavigationTarget !== "";
  const incidentHref = buildIncidentHref(matchedIncident, effectiveWorkspaceId);
  const hasIncident = incidentHref !== "";

  const eventsListHref = buildHref("/events", {
    workspace_id: effectiveWorkspaceId || undefined,
    flow_id: incomingFlowId || undefined,
    root_event_id: incomingRootEventId || undefined,
    source_event_id: incomingSourceEventId || undefined,
    from: from || undefined,
  });

  const allEventsHref = buildHref("/events", {
    workspace_id: effectiveWorkspaceId || undefined,
  });

  const commandHref = hasCommand
    ? buildHref(`/commands/${encodeURIComponent(linkedCommand)}`, {
        workspace_id: effectiveWorkspaceId || undefined,
        flow_id: flowNavigationTarget || undefined,
        root_event_id: rootEventId || undefined,
        source_event_id: sourceRecordId || undefined,
        from: "events",
      })
    : "";

  const flowHref = hasFlow
    ? buildHref(`/flows/${encodeURIComponent(flowNavigationTarget)}`, {
        workspace_id: effectiveWorkspaceId || undefined,
      })
    : "";

  return (
    <div className="space-y-8">
      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-base text-zinc-300">
              <Link
                href={eventsListHref}
                className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
              >
                Events
              </Link>{" "}
              / {title}
            </div>

            <div className={sectionLabelClassName()}>BOSAI Dashboard</div>

            <h1 className="break-words text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {title}
            </h1>

            <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
              Lecture détaillée d’un event BOSAI avec identité pipeline, objets
              liés, fallback éventuel depuis command et navigation croisée.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DashboardStatusBadge
              kind={getStatusBadgeKind(status)}
              label={getStatusLabel(status)}
            />

            {capability !== "—" ? (
              <span className={neutralPillClassName()}>{capability}</span>
            ) : null}

            <span className={neutralPillClassName()}>
              {effectiveWorkspaceId || workspace || "—"}
            </span>

            <DashboardStatusBadge
              kind={hasCommand ? "success" : "unknown"}
              label={hasCommand ? "COMMAND CREATED" : "COMMAND MISSING"}
            />

            <DashboardStatusBadge
              kind={hasIncident ? "incident" : "unknown"}
              label={hasIncident ? "INCIDENT LINKED" : "NO INCIDENT"}
            />

            {synthetic ? (
              <DashboardStatusBadge kind="retry" label="FALLBACK FROM COMMAND" />
            ) : null}
          </div>

          {synthetic ? (
            <div className="rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-200">
              Cet event a été reconstruit automatiquement depuis la command liée
              pour éviter un 404 quand il ne remonte pas dans la fenêtre actuelle
              de la source Events.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link href={eventsListHref} className={actionLinkClassName("soft")}>
              Retour aux events
            </Link>

            {hasCommand ? (
              <Link href={commandHref} className={actionLinkClassName("primary")}>
                Ouvrir la command liée
              </Link>
            ) : (
              <span className={actionLinkClassName("primary", true)}>
                Ouvrir la command liée
              </span>
            )}

            {hasFlow ? (
              <Link href={flowHref} className={actionLinkClassName("soft")}>
                Ouvrir le flow lié
              </Link>
            ) : (
              <span className={actionLinkClassName("soft", true)}>
                Ouvrir le flow lié
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard label="Created" value={getCreatedAt(event)} />
        <MetricCard label="Updated" value={getUpdatedAt(event)} />
        <MetricCard label="Processed" value={getProcessedAt(event)} />
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Workspace</div>
          <div className="mt-3 text-lg font-semibold tracking-tight text-white sm:text-xl">
            {effectiveWorkspaceId || workspace || "—"}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-2xl font-semibold tracking-tight text-white">
              Event identity
            </div>
            <p className="max-w-3xl text-base text-zinc-400">
              Identité BOSAI de l’event, contexte source et attributs principaux du
              pipeline.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <div className="grid grid-cols-1 gap-4 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-3">
              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Type</div>
                <div className="mt-2 text-zinc-100">{getEventType(event)}</div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Capability</div>
                <div className="mt-2 text-zinc-100">{capability}</div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Workspace</div>
                <div className="mt-2 text-zinc-100">{effectiveWorkspaceId || workspace}</div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Source</div>
                <div className="mt-2 text-zinc-100">{source}</div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Event ID</div>
                <div className="mt-2 break-all text-zinc-100">{String(event.id)}</div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Run</div>
                <div className="mt-2 break-all text-zinc-100">{getEventRunId(event)}</div>
              </div>

              <MetaItem
                label="Status"
                value={<span className="text-zinc-100">{getStatusLabel(status)}</span>}
              />
              <MetaItem
                label="Root event"
                value={<span className={technicalValueClassName()}>{rootEventId || "—"}</span>}
                breakAll
              />
              <MetaItem
                label="Source record"
                value={
                  <span className={technicalValueClassName()}>
                    {sourceRecordId || "—"}
                  </span>
                }
                breakAll
              />
              <MetaItem label="Synthetic fallback" value={synthetic ? "Yes" : "No"} />
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-2xl font-semibold tracking-tight text-white">
              Pipeline linking
            </div>
            <p className="max-w-3xl text-base text-zinc-400">
              Liaisons BOSAI vers command, flow, root event et éventuel incident
              correspondant.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <div className="grid grid-cols-1 gap-4 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-3">
              <MetaItem
                label="Linked command"
                value={
                  <span className={technicalValueClassName()}>
                    {linkedCommand || "—"}
                  </span>
                }
                breakAll
              />
              <MetaItem
                label="Flow target"
                value={
                  <span className={technicalValueClassName()}>
                    {flowDisplayTarget || "—"}
                  </span>
                }
                breakAll
              />
              <MetaItem
                label="Incident"
                value={matchedIncident?.id || "—"}
                breakAll
              />
              <MetaItem
                label="Root event"
                value={<span className={technicalValueClassName()}>{rootEventId || "—"}</span>}
                breakAll
              />
              <MetaItem
                label="Source record"
                value={
                  <span className={technicalValueClassName()}>
                    {sourceRecordId || "—"}
                  </span>
                }
                breakAll
              />
              <MetaItem label="Synthetic fallback" value={synthetic ? "Yes" : "No"} />
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-2xl font-semibold tracking-tight text-white">
              Payload snapshot
            </div>
            <p className="max-w-3xl text-base text-zinc-400">
              Prévisualisation brute du payload event pour lecture technique rapide.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <pre className="overflow-x-auto rounded-[20px] border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{stringifyPretty(event.payload ?? {})}
            </pre>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-2xl font-semibold tracking-tight text-white">
              Résumé pipeline
            </div>
            <p className="max-w-3xl text-base text-zinc-400">
              Lecture rapide des cibles BOSAI utiles depuis cet event.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <DashboardStatusBadge
                  kind={getStatusBadgeKind(status)}
                  label={getStatusLabel(status)}
                />
                {capability !== "—" ? (
                  <span className={neutralPillClassName()}>{capability}</span>
                ) : null}
                <DashboardStatusBadge
                  kind={hasCommand ? "success" : "unknown"}
                  label={hasCommand ? "COMMAND CREATED" : "COMMAND MISSING"}
                />
              </div>

              <div className="space-y-2 text-sm leading-6 text-white/70">
                <div>
                  Event ID :{" "}
                  <span className="break-all text-white">
                    {compactTechnicalId(String(event.id), 48)}
                  </span>
                </div>
                <div>
                  Flow :{" "}
                  <span className="break-all text-white">
                    {compactTechnicalId(flowDisplayTarget || "—", 48)}
                  </span>
                </div>
                <div>
                  Command :{" "}
                  <span className="break-all text-white">
                    {compactTechnicalId(linkedCommand || "—", 48)}
                  </span>
                </div>
                <div>
                  Activité :{" "}
                  <span className="text-white">{formatDate(getUpdatedAt(event))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-2xl font-semibold tracking-tight text-white">
              Navigation
            </div>
            <p className="max-w-3xl text-base text-zinc-400">
              Navigation croisée vers les objets liés à partir de cet event.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <div className="space-y-3">
              <Link href={eventsListHref} className={actionLinkClassName("soft")}>
                Retour à la liste events
              </Link>

              <Link href={allEventsHref} className={actionLinkClassName("primary")}>
                Voir tous les events
              </Link>

              {hasCommand ? (
                <Link href={commandHref} className={actionLinkClassName("soft")}>
                  Ouvrir la command liée
                </Link>
              ) : (
                <span className={actionLinkClassName("soft", true)}>
                  Ouvrir la command liée
                </span>
              )}

              {hasFlow ? (
                <Link href={flowHref} className={actionLinkClassName("soft")}>
                  Ouvrir le flow lié
                </Link>
              ) : (
                <span className={actionLinkClassName("soft", true)}>
                  Ouvrir le flow lié
                </span>
              )}

              {hasIncident ? (
                <Link href={incidentHref} className={actionLinkClassName("danger")}>
                  Ouvrir l’incident lié
                </Link>
              ) : (
                <span className={actionLinkClassName("danger", true)}>
                  Ouvrir l’incident lié
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <p className="max-w-4xl text-base text-zinc-400">
          Les liens flow / command / incident sont résolus en best-effort à partir
          des identifiants event, root_event_id, source_record_id, command_id et
          workspace.
        </p>
      </section>
    </div>
  );
}
