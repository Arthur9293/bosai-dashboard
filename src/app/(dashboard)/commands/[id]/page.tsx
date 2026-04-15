import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  fetchCommandById,
  fetchCommands,
  fetchEvents,
  fetchIncidents,
  type CommandItem,
  type EventItem,
  type IncidentItem,
} from "@/lib/api";
import { DashboardStatusBadge } from "@/components/dashboard/StatusBadge";
import type { DashboardStatusKind } from "@/components/dashboard/StatusBadge";
import {
  ControlPlaneShell,
  SectionCard,
} from "@/components/dashboard/ControlPlaneShell";

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

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

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function sectionLabelClassName() {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
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

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/i.test(value.trim());
}

function intersects(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(a);
  return b.some((value) => set.has(value));
}

function pickBestMatch<T>(items: T[], scorer: (item: T) => number): T | null {
  let bestItem: T | null = null;
  let bestScore = 0;

  for (const item of items) {
    const score = scorer(item);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestItem;
}

function cleanCapabilityLabel(value: string): string {
  const raw = toText(value, "");
  if (!raw) return "unknown_capability";
  return raw.replace(/_/g, " ");
}

function humanStatusLabel(status: string): string {
  const normalized = status.trim().toLowerCase();

  if (
    ["done", "success", "completed", "processed", "resolved"].includes(
      normalized
    )
  ) {
    return "Succès";
  }

  if (["running", "processing"].includes(normalized)) {
    return "En cours";
  }

  if (["queued", "pending", "new"].includes(normalized)) {
    return "En file";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "Retry";
  }

  if (["error", "failed", "dead", "blocked"].includes(normalized)) {
    return "Échec";
  }

  if (normalized === "ignored") {
    return "Ignorée";
  }

  return normalized ? normalized.toUpperCase() : "UNKNOWN";
}

function getCommandStatusBadgeKind(command: CommandItem): DashboardStatusKind {
  const normalized = getCommandStatus(command).trim().toLowerCase();

  if (["queued", "pending", "new"].includes(normalized)) return "queued";
  if (["running", "processing"].includes(normalized)) return "running";
  if (["retry", "retriable"].includes(normalized)) return "retry";
  if (["error", "failed", "dead", "blocked"].includes(normalized)) return "failed";
  if (
    ["processed", "done", "success", "completed", "resolved"].includes(
      normalized
    )
  ) {
    return "success";
  }

  return "unknown";
}

function getShellToneFromCommandStatus(
  command: CommandItem
): "default" | "info" | "success" | "warning" | "danger" | "muted" {
  const normalized = getCommandStatus(command).trim().toLowerCase();

  if (["queued", "pending", "new", "ignored"].includes(normalized)) {
    return "muted";
  }

  if (["running", "processing"].includes(normalized)) {
    return "info";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "warning";
  }

  if (["error", "failed", "dead", "blocked"].includes(normalized)) {
    return "danger";
  }

  if (
    ["processed", "done", "success", "completed", "resolved"].includes(
      normalized
    )
  ) {
    return "success";
  }

  return "default";
}

/* ----------------------------- Command helpers ---------------------------- */

function getCommandInput(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.input);
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.result);
}

function getCommandStatus(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.status) ||
    toTextOrEmpty(result.status) ||
    toTextOrEmpty(result.status_select) ||
    toTextOrEmpty(input.status) ||
    "unknown"
  );
}

function getCommandCapability(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.capability) ||
    toTextOrEmpty(input.capability) ||
    toTextOrEmpty(result.capability) ||
    "unknown_capability"
  );
}

function getCommandWorkspace(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.workspace_id) ||
    toTextOrEmpty(input.workspace_id) ||
    toTextOrEmpty(input.workspaceId) ||
    toTextOrEmpty(input.workspace) ||
    toTextOrEmpty(result.workspace_id) ||
    toTextOrEmpty(result.workspaceId) ||
    toTextOrEmpty(result.workspace) ||
    "—"
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

function getCommandRunId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.run_record_id) ||
    toTextOrEmpty(command.linked_run) ||
    toTextOrEmpty(input.run_record_id) ||
    toTextOrEmpty(input.runRecordId) ||
    toTextOrEmpty(input.run_id) ||
    toTextOrEmpty(input.runId) ||
    toTextOrEmpty(input.linked_run) ||
    toTextOrEmpty(result.run_record_id) ||
    toTextOrEmpty(result.runRecordId) ||
    toTextOrEmpty(result.run_id) ||
    toTextOrEmpty(result.runId) ||
    toTextOrEmpty(result.linked_run) ||
    "—"
  );
}

function getCommandParentId(command: CommandItem): string {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return (
    toTextOrEmpty(command.parent_command_id) ||
    toTextOrEmpty(input.parent_command_id) ||
    toTextOrEmpty(input.parentCommandId) ||
    toTextOrEmpty(result.parent_command_id) ||
    toTextOrEmpty(result.parentCommandId) ||
    ""
  );
}

function getCommandToolKey(command: CommandItem): string {
  return toTextOrEmpty(command.tool_key);
}

function getCommandToolMode(command: CommandItem): string {
  return toTextOrEmpty(command.tool_mode);
}

function getCommandCreatedAt(command: CommandItem): string {
  return toTextOrEmpty(command.created_at);
}

function getCommandUpdatedAt(command: CommandItem): string {
  return toTextOrEmpty(command.updated_at);
}

function getCommandStartedAt(command: CommandItem): string {
  return toTextOrEmpty(command.started_at);
}

function getCommandFinishedAt(command: CommandItem): string {
  return toTextOrEmpty(command.finished_at);
}

function getCommandError(command: CommandItem): string {
  return toTextOrEmpty(command.error);
}

function getCommandTitle(command: CommandItem): string {
  return (
    toTextOrEmpty(command.name) ||
    getCommandCapability(command) ||
    "Command detail"
  );
}

function getCommandSummaryLine(command: CommandItem): string {
  const status = humanStatusLabel(getCommandStatus(command));
  const capability = cleanCapabilityLabel(getCommandCapability(command));
  const workspace = getCommandWorkspace(command);

  return `${status} · ${capability} · ${workspace}`;
}

function getCommandCommandCandidates(command: CommandItem): string[] {
  return uniq([String(command.id || ""), getCommandParentId(command)]);
}

function getCommandRunCandidates(command: CommandItem): string[] {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return uniq([
    getCommandRunId(command),
    toTextOrEmpty(input.run_record_id),
    toTextOrEmpty(input.runRecordId),
    toTextOrEmpty(input.run_id),
    toTextOrEmpty(input.runId),
    toTextOrEmpty(input.linked_run),
    toTextOrEmpty(result.run_record_id),
    toTextOrEmpty(result.runRecordId),
    toTextOrEmpty(result.run_id),
    toTextOrEmpty(result.runId),
    toTextOrEmpty(result.linked_run),
  ]).filter((value) => value !== "—");
}

function getCommandFlowCandidates(command: CommandItem): string[] {
  const input = getCommandInput(command);
  const result = getCommandResult(command);

  return uniq([
    getCommandFlowId(command),
    getCommandRootEventId(command),
    getCommandSourceEventId(command),
    toTextOrEmpty(input.flow_id),
    toTextOrEmpty(input.flowId),
    toTextOrEmpty(input.root_event_id),
    toTextOrEmpty(input.rootEventId),
    toTextOrEmpty(input.source_event_id),
    toTextOrEmpty(input.sourceEventId),
    toTextOrEmpty(input.event_id),
    toTextOrEmpty(input.eventId),
    toTextOrEmpty(result.flow_id),
    toTextOrEmpty(result.flowId),
    toTextOrEmpty(result.root_event_id),
    toTextOrEmpty(result.rootEventId),
    toTextOrEmpty(result.source_event_id),
    toTextOrEmpty(result.sourceEventId),
    toTextOrEmpty(result.event_id),
    toTextOrEmpty(result.eventId),
  ]);
}

/* ------------------------------ Event helpers ----------------------------- */

function getEventPayload(event: EventItem): Record<string, unknown> {
  return parseMaybeJson(event.payload);
}

function getEventWorkspace(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(record.workspace_id) ||
    toTextOrEmpty(record.Workspace_ID) ||
    toTextOrEmpty(record.workspace) ||
    toTextOrEmpty(payload.workspace_id) ||
    toTextOrEmpty(payload.workspaceId) ||
    toTextOrEmpty(payload.workspace) ||
    ""
  );
}

function getEventCommandCandidates(event: EventItem): string[] {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return uniq([
    toTextOrEmpty(event.command_id),
    toTextOrEmpty(record.command_id),
    toTextOrEmpty(record.Command_ID),
    toTextOrEmpty(record.linked_command),
    toTextOrEmpty(record.Linked_Command),
    toTextOrEmpty(payload.command_id),
    toTextOrEmpty(payload.commandId),
    toTextOrEmpty(payload.linked_command),
    toTextOrEmpty(payload.linkedCommand),
    toTextOrEmpty(payload.parent_command_id),
    toTextOrEmpty(payload.parentCommandId),
  ]);
}

function getEventRunCandidates(event: EventItem): string[] {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return uniq([
    toTextOrEmpty(record.run_record_id),
    toTextOrEmpty(record.Run_Record_ID),
    toTextOrEmpty(record.linked_run),
    toTextOrEmpty(record.Linked_Run),
    toTextOrEmpty(payload.run_record_id),
    toTextOrEmpty(payload.runRecordId),
    toTextOrEmpty(payload.run_id),
    toTextOrEmpty(payload.runId),
    toTextOrEmpty(payload.linked_run),
    toTextOrEmpty(payload.linkedRun),
  ]);
}

function getEventFlowCandidates(event: EventItem): string[] {
  const payload = getEventPayload(event);

  return uniq([
    toTextOrEmpty(event.id),
    toTextOrEmpty(event.root_event_id),
    toTextOrEmpty(event.source_record_id),
    toTextOrEmpty(event.source_event_id),
    toTextOrEmpty(event.flow_id),
    toTextOrEmpty(payload.root_event_id),
    toTextOrEmpty(payload.rootEventId),
    toTextOrEmpty(payload.source_record_id),
    toTextOrEmpty(payload.sourceRecordId),
    toTextOrEmpty(payload.source_event_id),
    toTextOrEmpty(payload.sourceEventId),
    toTextOrEmpty(payload.event_id),
    toTextOrEmpty(payload.eventId),
    toTextOrEmpty(payload.flow_id),
    toTextOrEmpty(payload.flowId),
  ]);
}

function scoreEventMatch(event: EventItem, command: CommandItem): number {
  let score = 0;

  const commandCommandCandidates = getCommandCommandCandidates(command);
  const commandRunCandidates = getCommandRunCandidates(command);
  const commandFlowCandidates = getCommandFlowCandidates(command);
  const commandWorkspace = getCommandWorkspace(command);

  const eventCommandCandidates = getEventCommandCandidates(event);
  const eventRunCandidates = getEventRunCandidates(event);
  const eventFlowCandidates = getEventFlowCandidates(event);
  const eventWorkspace = getEventWorkspace(event);

  if (
    commandCommandCandidates.length > 0 &&
    eventCommandCandidates.length > 0 &&
    intersects(commandCommandCandidates, eventCommandCandidates)
  ) {
    score += 100;
  }

  if (
    commandRunCandidates.length > 0 &&
    eventRunCandidates.length > 0 &&
    intersects(commandRunCandidates, eventRunCandidates)
  ) {
    score += 70;
  }

  if (
    commandFlowCandidates.length > 0 &&
    eventFlowCandidates.length > 0 &&
    intersects(commandFlowCandidates, eventFlowCandidates)
  ) {
    score += 50;
  }

  if (
    commandWorkspace &&
    commandWorkspace !== "—" &&
    eventWorkspace &&
    eventWorkspace === commandWorkspace
  ) {
    score += 10;
  }

  return score;
}

/* ----------------------------- Incident helpers --------------------------- */

function getIncidentWorkspace(incident: IncidentItem): string {
  const record = incident as Record<string, unknown>;

  return (
    toTextOrEmpty(record.workspace_id) ||
    toTextOrEmpty(record.Workspace_ID) ||
    toTextOrEmpty(record.workspace) ||
    toTextOrEmpty(incident.workspace_id) ||
    ""
  );
}

function getIncidentCommandCandidates(incident: IncidentItem): string[] {
  const record = incident as Record<string, unknown>;

  return uniq([
    toTextOrEmpty(incident.command_id),
    toTextOrEmpty(incident.linked_command),
    toTextOrEmpty(record.command_id),
    toTextOrEmpty(record.Command_ID),
    toTextOrEmpty(record.linked_command),
    toTextOrEmpty(record.Linked_Command),
    toTextOrEmpty(record.parent_command_id),
    toTextOrEmpty(record.Parent_Command_ID),
  ]);
}

function getIncidentRunCandidates(incident: IncidentItem): string[] {
  const record = incident as Record<string, unknown>;

  return uniq([
    toTextOrEmpty(incident.run_record_id),
    toTextOrEmpty(incident.linked_run),
    toTextOrEmpty(record.run_record_id),
    toTextOrEmpty(record.Run_Record_ID),
    toTextOrEmpty(record.linked_run),
    toTextOrEmpty(record.Linked_Run),
  ]);
}

function getIncidentFlowCandidates(incident: IncidentItem): string[] {
  const record = incident as Record<string, unknown>;

  return uniq([
    toTextOrEmpty(incident.id),
    toTextOrEmpty(incident.flow_id),
    toTextOrEmpty(incident.root_event_id),
    toTextOrEmpty(record.source_record_id),
    toTextOrEmpty(record.Source_Record_ID),
    toTextOrEmpty(record.source_event_id),
    toTextOrEmpty(record.Source_Event_ID),
    toTextOrEmpty(record.event_id),
    toTextOrEmpty(record.Event_ID),
  ]);
}

function scoreIncidentMatch(incident: IncidentItem, command: CommandItem): number {
  let score = 0;

  const commandCommandCandidates = getCommandCommandCandidates(command);
  const commandRunCandidates = getCommandRunCandidates(command);
  const commandFlowCandidates = getCommandFlowCandidates(command);
  const commandWorkspace = getCommandWorkspace(command);

  const incidentCommandCandidates = getIncidentCommandCandidates(incident);
  const incidentRunCandidates = getIncidentRunCandidates(incident);
  const incidentFlowCandidates = getIncidentFlowCandidates(incident);
  const incidentWorkspace = getIncidentWorkspace(incident);

  if (
    commandCommandCandidates.length > 0 &&
    incidentCommandCandidates.length > 0 &&
    intersects(commandCommandCandidates, incidentCommandCandidates)
  ) {
    score += 100;
  }

  if (
    commandRunCandidates.length > 0 &&
    incidentRunCandidates.length > 0 &&
    intersects(commandRunCandidates, incidentRunCandidates)
  ) {
    score += 70;
  }

  if (
    commandFlowCandidates.length > 0 &&
    incidentFlowCandidates.length > 0 &&
    intersects(commandFlowCandidates, incidentFlowCandidates)
  ) {
    score += 50;
  }

  if (
    commandWorkspace &&
    commandWorkspace !== "—" &&
    incidentWorkspace &&
    incidentWorkspace === commandWorkspace
  ) {
    score += 10;
  }

  return score;
}

/* ------------------------------- Href helpers ----------------------------- */

function buildFlowHref(command: CommandItem): string {
  const flowId = getCommandFlowId(command);
  if (flowId) {
    return `/flows/${encodeURIComponent(flowId)}`;
  }

  const rootEventId = getCommandRootEventId(command);
  if (rootEventId) {
    return `/flows/${encodeURIComponent(rootEventId)}`;
  }

  const sourceEventId = getCommandSourceEventId(command);
  if (sourceEventId) {
    return `/flows/${encodeURIComponent(sourceEventId)}`;
  }

  if (command.id) {
    return `/flows/${encodeURIComponent(String(command.id))}`;
  }

  return "";
}

function buildSafeEventHref(
  matchedEvent: EventItem | null,
  command: CommandItem
): string {
  if (matchedEvent?.id) {
    return `/events/${encodeURIComponent(matchedEvent.id)}`;
  }

  const rootEventId = getCommandRootEventId(command);
  if (rootEventId && isRecordIdLike(rootEventId)) {
    return `/events/${encodeURIComponent(rootEventId)}`;
  }

  const sourceEventId = getCommandSourceEventId(command);
  if (sourceEventId && isRecordIdLike(sourceEventId)) {
    return `/events/${encodeURIComponent(sourceEventId)}`;
  }

  return "";
}

function buildIncidentHref(matchedIncident: IncidentItem | null): string {
  if (!matchedIncident?.id) return "";
  return `/incidents/${encodeURIComponent(matchedIncident.id)}`;
}

/* ------------------------------- UI helpers ------------------------------- */

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
    <div className={breakAll ? "break-all" : undefined}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className="mt-1 text-zinc-200">{value}</div>
    </div>
  );
}

function PreviewPanel({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <div className="space-y-3">
      <div className={sectionLabelClassName()}>{title}</div>
      <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
        {stringifyPretty(value)}
      </pre>
    </div>
  );
}

function DiagnosticRow({
  label,
  value,
  technical = false,
}: {
  label: string;
  value: ReactNode;
  technical?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 md:flex-row md:items-start md:justify-between md:gap-4 text-sm">
      <span className="text-white/55 md:max-w-[38%]">{label}</span>
      <span
        className={[
          "text-white/90 md:max-w-[58%] md:text-right",
          technical ? "break-all" : "break-words",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

export default async function CommandDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

  let command: CommandItem | null = null;

  try {
    command = await fetchCommandById(id, 500);
  } catch {
    command = null;
  }

  if (!command) {
    try {
      const commandsData = await fetchCommands(500);
      const commands = Array.isArray(commandsData?.commands)
        ? commandsData.commands
        : [];

      command = commands.find((item) => String(item.id) === id) || null;
    } catch {
      command = null;
    }
  }

  if (!command) {
    notFound();
  }

  const title = getCommandTitle(command);
  const status = getCommandStatus(command);
  const capability = getCommandCapability(command);
  const workspace = getCommandWorkspace(command);
  const flowId = getCommandFlowId(command);
  const rootEventId = getCommandRootEventId(command);
  const sourceEventId = getCommandSourceEventId(command);
  const runId = getCommandRunId(command);
  const parentId = getCommandParentId(command);
  const errorText = getCommandError(command);
  const toolKey = getCommandToolKey(command);
  const toolMode = getCommandToolMode(command);

  let matchedEvent: EventItem | null = null;
  try {
    const eventsData = await fetchEvents(500);
    const events = Array.isArray(eventsData?.events) ? eventsData.events : [];
    matchedEvent = pickBestMatch(events, (event) => scoreEventMatch(event, command!));
  } catch {
    matchedEvent = null;
  }

  let matchedIncident: IncidentItem | null = null;
  try {
    const incidentsData = await fetchIncidents(300);
    const incidents = Array.isArray(incidentsData?.incidents)
      ? incidentsData.incidents
      : [];
    matchedIncident = pickBestMatch(
      incidents,
      (incident) => scoreIncidentMatch(incident, command!)
    );
  } catch {
    matchedIncident = null;
  }

  const flowHref = buildFlowHref(command);
  const eventHref = buildSafeEventHref(matchedEvent, command);
  const incidentHref = buildIncidentHref(matchedIncident);

  const hasFlow = flowHref !== "";
  const hasEvent = eventHref !== "";
  const hasIncident = incidentHref !== "";

  return (
    <ControlPlaneShell
      eyebrow="BOSAI Dashboard"
      title={title}
      description="Lecture détaillée d’une command BOSAI, avec contexte d’exécution, liens de drill-down et previews techniques."
      badges={[
        {
          label: humanStatusLabel(status),
          tone: getShellToneFromCommandStatus(command),
        },
        {
          label: cleanCapabilityLabel(capability),
          tone: "muted",
        },
        ...(toolKey ? [{ label: `Tool ${toolKey}`, tone: "muted" as const }] : []),
        ...(toolMode ? [{ label: `Mode ${toolMode}`, tone: "muted" as const }] : []),
      ]}
      metrics={[
        { label: "Created", value: formatDate(getCommandCreatedAt(command)) },
        { label: "Started", value: formatDate(getCommandStartedAt(command)) },
        { label: "Finished", value: formatDate(getCommandFinishedAt(command)) },
        { label: "Updated", value: formatDate(getCommandUpdatedAt(command)) },
      ]}
      topMeta={
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-white/60 break-words">
            <Link
              href="/commands"
              className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
            >
              Commands
            </Link>{" "}
            / <span className="text-white/85">{title}</span>
          </div>

          <div className="text-xs uppercase tracking-[0.18em] text-white/35 break-all md:text-right">
            Command ID · {String(command.id)}
          </div>
        </div>
      }
      footerNote="Les correspondances flow / event / incident sont calculées en best-effort à partir des identifiants de command, run, flow et workspace."
    >
      <SectionCard
        title="Overview"
        description="Contexte principal, identifiants et liaisons de cette command."
      >
        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <MetaItem label="ID" value={String(command.id)} breakAll />
          <MetaItem label="Status" value={status} />
          <MetaItem label="Capability" value={capability} />
          <MetaItem label="Workspace" value={workspace} />
          <MetaItem label="Run" value={runId} breakAll />
          <MetaItem label="Parent" value={parentId || "—"} breakAll />
          <MetaItem label="Flow" value={flowId || "—"} breakAll />
          <MetaItem label="Root event" value={rootEventId || "—"} breakAll />
          <MetaItem label="Source event" value={sourceEventId || "—"} breakAll />

          {errorText ? (
            <div className="md:col-span-2 xl:col-span-3 rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-4">
              <div className={metaLabelClassName()}>Error</div>
              <div className="mt-1 break-all text-rose-100">{errorText}</div>
            </div>
          ) : (
            <div className="md:col-span-2 xl:col-span-3 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Error</div>
              <div className="mt-1 text-zinc-300">—</div>
            </div>
          )}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard
          title="Quick actions"
          description="Navigation rapide depuis cette command."
        >
          <div className="space-y-3">
            <Link href="/commands" className={actionLinkClassName("soft")}>
              Retour à la liste commands
            </Link>

            <Link href="/commands" className={actionLinkClassName("primary")}>
              Voir toutes les commands
            </Link>

            {hasFlow ? (
              <Link href={flowHref} className={actionLinkClassName("soft")}>
                Ouvrir le flow lié
              </Link>
            ) : (
              <span className={actionLinkClassName("soft", true)}>
                Ouvrir le flow lié
              </span>
            )}

            {hasEvent ? (
              <Link href={eventHref} className={actionLinkClassName("soft")}>
                Ouvrir l’event source
              </Link>
            ) : (
              <span className={actionLinkClassName("soft", true)}>
                Ouvrir l’event source
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
        </SectionCard>

        <SectionCard
          title="Routing diagnostic"
          description="Lecture rapide du matching autour de cette command."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <DashboardStatusBadge
                kind={getCommandStatusBadgeKind(command)}
                label={humanStatusLabel(status).toUpperCase()}
              />
              <DashboardStatusBadge
                kind={hasFlow ? "success" : "unknown"}
                label={hasFlow ? "FLOW LINKED" : "NO FLOW LINK"}
              />
              <DashboardStatusBadge
                kind={hasEvent ? "success" : "unknown"}
                label={hasEvent ? "EVENT LINKED" : "NO EVENT LINK"}
              />
              <DashboardStatusBadge
                kind={hasIncident ? "incident" : "unknown"}
                label={hasIncident ? "INCIDENT LINKED" : "NO INCIDENT LINK"}
              />
            </div>

            <div className="space-y-3">
              <DiagnosticRow label="Workspace" value={workspace} />
              <DiagnosticRow label="Run" value={runId} technical />
              <DiagnosticRow
                label="Flow target"
                value={flowId || rootEventId || sourceEventId || String(command.id)}
                technical
              />
              <DiagnosticRow
                label="Matched event"
                value={matchedEvent?.id || "Aucun event lié trouvé"}
                technical={Boolean(matchedEvent?.id)}
              />
              <DiagnosticRow
                label="Matched incident"
                value={matchedIncident?.id || "Aucun incident lié trouvé"}
                technical={Boolean(matchedIncident?.id)}
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Linking context"
        description="Diagnostic détaillé des correspondances autour du flow, de l’event et de l’incident."
      >
        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <MetaItem
            label="Flow href"
            value={
              hasFlow ? (
                <Link
                  href={flowHref}
                  className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {flowHref}
                </Link>
              ) : (
                "—"
              )
            }
            breakAll
          />

          <MetaItem
            label="Event href"
            value={
              hasEvent ? (
                <Link
                  href={eventHref}
                  className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {eventHref}
                </Link>
              ) : (
                "—"
              )
            }
            breakAll
          />

          <MetaItem
            label="Incident href"
            value={
              hasIncident ? (
                <Link
                  href={incidentHref}
                  className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {incidentHref}
                </Link>
              ) : (
                "—"
              )
            }
            breakAll
          />

          <MetaItem
            label="Matched event ID"
            value={matchedEvent?.id || "Aucun event lié trouvé"}
            breakAll
          />

          <MetaItem
            label="Matched incident ID"
            value={matchedIncident?.id || "Aucun incident lié trouvé"}
            breakAll
          />

          <MetaItem
            label="Flow target"
            value={flowId || rootEventId || sourceEventId || String(command.id)}
            breakAll
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Payload previews"
        description="Prévisualisation brute des données d’entrée et du résultat pour debug rapide."
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PreviewPanel title="Input preview" value={command.input ?? {}} />
          <PreviewPanel title="Result preview" value={command.result ?? {}} />
        </div>
      </SectionCard>
    </ControlPlaneShell>
  );
}
