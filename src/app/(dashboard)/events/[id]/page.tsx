import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchCommands,
  fetchEvents,
  fetchIncidents,
  type CommandItem,
  type EventItem,
  type IncidentItem,
} from "@/lib/api";
import {
  ControlPlaneShell,
  SectionCard,
  SidePanelCard,
} from "@/components/dashboard/ControlPlaneShell";
import {
  DashboardStatusBadge,
  type DashboardStatusKind,
} from "@/components/dashboard/StatusBadge";

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

function cardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function metaBoxClassName() {
  return "rounded-[20px] border border-white/10 bg-black/20 px-4 py-4";
}

function technicalValueClassName() {
  return "break-all [overflow-wrap:anywhere] font-mono text-zinc-200";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default",
  disabled = false
) {
  const base =
    "inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition";

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
    return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
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

function compactTechnicalId(value: string, max = 34): string {
  const clean = value.trim();
  if (!clean) return "—";
  if (clean.length <= max) return clean;

  const keepStart = Math.max(12, Math.floor((max - 3) / 2));
  const keepEnd = Math.max(8, max - keepStart - 3);

  return `${clean.slice(0, keepStart)}...${clean.slice(-keepEnd)}`;
}

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/i.test(value.trim());
}

/* --------------------------------- Event --------------------------------- */

function getEventPayload(event: EventItem): Record<string, unknown> {
  return parseMaybeJson(event.payload);
}

function getEventType(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(record.mapped_capability) ||
    toTextOrEmpty(event.event_type) ||
    toTextOrEmpty(event.type) ||
    toTextOrEmpty(payload.event_type) ||
    toTextOrEmpty(payload.type) ||
    "event_detail"
  );
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

function getEventStatus(event: EventItem): string {
  return toTextOrEmpty(event.status) || "unknown";
}

function getEventStatusBucket(event: EventItem): string {
  const normalized = getEventStatus(event).trim().toLowerCase();

  if (["new"].includes(normalized)) return "new";
  if (["queued", "pending"].includes(normalized)) return "queued";
  if (["processed", "done", "success", "completed"].includes(normalized)) {
    return "processed";
  }
  if (["ignored"].includes(normalized)) return "ignored";
  if (["error", "failed", "dead", "blocked"].includes(normalized)) return "error";

  return "other";
}

function getEventStatusLabel(event: EventItem): string {
  const bucket = getEventStatusBucket(event);

  if (bucket === "new") return "NEW";
  if (bucket === "queued") return "QUEUED";
  if (bucket === "processed") return "PROCESSED";
  if (bucket === "ignored") return "IGNORED";
  if (bucket === "error") return "ERROR";

  const raw = getEventStatus(event);
  return raw ? raw.toUpperCase() : "UNKNOWN";
}

function getEventStatusBadgeKind(event: EventItem): DashboardStatusKind {
  const bucket = getEventStatusBucket(event);

  if (bucket === "new" || bucket === "queued") return "queued";
  if (bucket === "processed") return "success";
  if (bucket === "error") return "failed";
  if (bucket === "ignored") return "unknown";

  return "unknown";
}

function getShellToneFromEventStatus(
  event: EventItem
): "default" | "info" | "success" | "warning" | "danger" | "muted" {
  const bucket = getEventStatusBucket(event);

  if (bucket === "new" || bucket === "queued") return "warning";
  if (bucket === "processed") return "success";
  if (bucket === "error") return "danger";
  if (bucket === "ignored") return "muted";

  return "muted";
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
    toTextOrEmpty(payload.Workspace_ID) ||
    "—"
  );
}

function getEventSource(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;
  const raw =
    toTextOrEmpty(record.source) ||
    toTextOrEmpty(payload.source) ||
    (isSyntheticEvent(event) ? "synthetic_from_command" : "");

  if (raw === "synthetic_from_command") {
    return "Synthétique depuis command";
  }

  return raw || "—";
}

function getEventRunId(event: EventItem): string {
  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;

  return (
    toTextOrEmpty(record.run_id) ||
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
  if (toTextOrEmpty(event.command_id)) return toTextOrEmpty(event.command_id);

  const payload = getEventPayload(event);
  const record = event as Record<string, unknown>;
  const raw = record.linked_command;

  if (Array.isArray(raw) && raw.length > 0) {
    return toTextOrEmpty(raw[0]);
  }

  return (
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

function isSyntheticEvent(event: EventItem): boolean {
  return toTextOrEmpty(getEventPayload(event).source) === "synthetic_from_command";
}

function getHeaderTitle(event: EventItem): string {
  const capability = getEventCapability(event);
  if (capability !== "—") return capability;

  return getEventType(event);
}

/* -------------------------------- Command -------------------------------- */

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

function buildSyntheticEventFromCommand(
  id: string,
  command: CommandItem
): EventItem {
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
    command_id: command.id,
    created_at: getCommandStartedAt(command) || getCommandFinishedAt(command),
    updated_at: getCommandStartedAt(command) || getCommandFinishedAt(command),
    processed_at: getCommandFinishedAt(command) || getCommandStartedAt(command),
    payload: {
      source: "synthetic_from_command",
      command_id: command.id,
      reconstructed_from_command: true,
      capability: getCommandCapability(command),
    },
  } as EventItem;
}

/* -------------------------------- Incident ------------------------------- */

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

function getIncidentCandidates(incident: IncidentItem): string[] {
  const record = incident as Record<string, unknown>;

  return uniq([
    toTextOrEmpty(incident.id),
    toTextOrEmpty(incident.flow_id),
    toTextOrEmpty(incident.root_event_id),
    toTextOrEmpty(incident.command_id),
    toTextOrEmpty(incident.linked_command),
    toTextOrEmpty(incident.run_record_id),
    toTextOrEmpty(incident.linked_run),
    toTextOrEmpty(record.source_record_id),
    toTextOrEmpty(record.Source_Record_ID),
    toTextOrEmpty(record.source_event_id),
    toTextOrEmpty(record.Source_Event_ID),
  ]);
}

function getEventMatchCandidates(event: EventItem): string[] {
  return uniq([
    String(event.id || ""),
    getLinkedCommandValue(event),
    getFlowDisplayTarget(event),
    getFlowNavigationTarget(event),
    getRootEventId(event),
    getSourceRecordId(event),
  ]);
}

function scoreIncidentMatch(incident: IncidentItem, event: EventItem): number {
  let score = 0;

  const eventCandidates = getEventMatchCandidates(event);
  const incidentCandidates = getIncidentCandidates(incident);

  if (intersects(eventCandidates, incidentCandidates)) {
    score += 100;
  }

  const eventWorkspace = getEventWorkspace(event);
  const incidentWorkspace = getIncidentWorkspace(incident);

  if (
    eventWorkspace &&
    eventWorkspace !== "—" &&
    incidentWorkspace &&
    eventWorkspace === incidentWorkspace
  ) {
    score += 10;
  }

  if (
    getLinkedCommandValue(event) &&
    incidentCandidates.includes(getLinkedCommandValue(event))
  ) {
    score += 40;
  }

  if (
    getFlowDisplayTarget(event) &&
    incidentCandidates.includes(getFlowDisplayTarget(event))
  ) {
    score += 25;
  }

  return score;
}

function buildIncidentHref(matchedIncident: IncidentItem | null): string {
  if (!matchedIncident?.id) return "";
  return `/incidents/${encodeURIComponent(String(matchedIncident.id))}`;
}

/* --------------------------------- Links --------------------------------- */

function buildCommandHref(event: EventItem): string {
  const linkedCommand = getLinkedCommandValue(event);
  if (!linkedCommand) return "";
  return `/commands/${encodeURIComponent(linkedCommand)}`;
}

function buildFlowHref(event: EventItem): string {
  const flowNavigationTarget = getFlowNavigationTarget(event);
  if (!flowNavigationTarget) return "";
  return `/flows/${encodeURIComponent(flowNavigationTarget)}`;
}

function buildRootEventHref(event: EventItem): string {
  const rootEventId = getRootEventId(event);
  if (!rootEventId || !isRecordIdLike(rootEventId)) return "";
  return `/events/${encodeURIComponent(rootEventId)}`;
}

function buildSourceRecordEventHref(event: EventItem): string {
  const sourceRecordId = getSourceRecordId(event);
  if (!sourceRecordId || !isRecordIdLike(sourceRecordId)) return "";
  return `/events/${encodeURIComponent(sourceRecordId)}`;
}

/* --------------------------------- UI ------------------------------------ */

function MetaValueLink({
  href,
  value,
}: {
  href: string;
  value: string;
}) {
  if (!href || !value || value === "—") {
    return <span className="text-zinc-200">{value || "—"}</span>;
  }

  return (
    <Link
      href={href}
      className="text-zinc-200 underline decoration-white/20 underline-offset-4 transition hover:text-white"
    >
      {value}
    </Link>
  );
}

function MetaItem({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: React.ReactNode;
  breakAll?: boolean;
}) {
  return (
    <div className={breakAll ? "break-all [overflow-wrap:anywhere]" : undefined}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className="mt-1 text-zinc-200">{value}</div>
    </div>
  );
}

export default async function EventDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

  let event: EventItem | null = null;

  try {
    const data = await fetchEvents();
    const events = Array.isArray(data?.events) ? data.events : [];
    event = events.find((item) => String(item.id) === id) || null;
  } catch {
    event = null;
  }

  if (!event) {
    try {
      const commandsData = await fetchCommands();
      const commands = Array.isArray(commandsData?.commands)
        ? commandsData.commands
        : [];

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

  let matchedIncident: IncidentItem | null = null;
  try {
    const incidentsData = await fetchIncidents(300);
    const incidents = Array.isArray(incidentsData?.incidents)
      ? incidentsData.incidents
      : [];

    matchedIncident = pickBestMatch(incidents, (incident) =>
      scoreIncidentMatch(incident, event!)
    );
  } catch {
    matchedIncident = null;
  }

  const title = getHeaderTitle(event);
  const statusLabel = getEventStatusLabel(event);
  const capability = getEventCapability(event);
  const workspace = getEventWorkspace(event);
  const source = getEventSource(event);
  const runId = getEventRunId(event);
  const createdAt = getCreatedAt(event);
  const updatedAt = getUpdatedAt(event);
  const processedAt = getProcessedAt(event);
  const linkedCommand = getLinkedCommandValue(event);
  const flowDisplayTarget = getFlowDisplayTarget(event);
  const rootEventId = getRootEventId(event);
  const sourceRecordId = getSourceRecordId(event);

  const commandHref = buildCommandHref(event);
  const flowHref = buildFlowHref(event);
  const rootEventHref = buildRootEventHref(event);
  const sourceRecordEventHref = buildSourceRecordEventHref(event);
  const incidentHref = buildIncidentHref(matchedIncident);

  const hasCommand = commandHref !== "";
  const hasFlow = flowHref !== "";
  const hasIncident = incidentHref !== "";
  const synthetic = isSyntheticEvent(event);

  const shellBadges: {
    label: string;
    tone?: "default" | "info" | "success" | "warning" | "danger" | "muted";
  }[] = [
    { label: statusLabel, tone: getShellToneFromEventStatus(event) },
  ];

  if (capability !== "—") {
    shellBadges.push({ label: capability, tone: "muted" });
  }

  shellBadges.push({
    label: hasCommand ? "COMMAND CREATED" : "COMMAND MISSING",
    tone: hasCommand ? "success" : "muted",
  });

  shellBadges.push({
    label: hasIncident ? "INCIDENT LINKED" : "NO INCIDENT",
    tone: hasIncident ? "danger" : "muted",
  });

  if (synthetic) {
    shellBadges.push({ label: "FALLBACK FROM COMMAND", tone: "warning" });
  }

  return (
    <ControlPlaneShell
      eyebrow="BOSAI Control Plane"
      title={title}
      description="Lecture détaillée d’un event BOSAI avec identité pipeline, objets liés, fallback éventuel depuis command et navigation croisée."
      badges={shellBadges}
      metrics={[
        { label: "Created", value: formatDate(createdAt) },
        { label: "Updated", value: formatDate(updatedAt) },
        { label: "Processed", value: formatDate(processedAt) },
        {
          label: "Workspace",
          value: workspace,
          toneClass: "text-white",
          helper: synthetic ? "Fallback reconstitué" : undefined,
        },
      ]}
      actions={
        <>
          <Link href="/events" className={actionLinkClassName("soft")}>
            Retour aux events
          </Link>

          {hasCommand ? (
            <Link href={commandHref} className={actionLinkClassName("primary")}>
              Ouvrir la command liée
            </Link>
          ) : null}

          {hasFlow ? (
            <Link href={flowHref} className={actionLinkClassName("soft")}>
              Ouvrir le flow lié
            </Link>
          ) : null}
        </>
      }
      aside={
        <>
          <SidePanelCard title="Résumé pipeline">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <DashboardStatusBadge
                  kind={getEventStatusBadgeKind(event)}
                  label={statusLabel}
                />

                {capability !== "—" ? (
                  <DashboardStatusBadge kind="queued" label={capability} />
                ) : null}

                {hasCommand ? (
                  <DashboardStatusBadge kind="success" label="COMMAND CREATED" />
                ) : null}

                {hasIncident ? (
                  <DashboardStatusBadge kind="incident" label="INCIDENT LINKED" />
                ) : null}
              </div>

              <div className="space-y-2 text-sm leading-6 text-white/65">
                <div>
                  Event ID :{" "}
                  <span className="break-all text-white/90">
                    {compactTechnicalId(String(event.id))}
                  </span>
                </div>
                <div>
                  Flow :{" "}
                  <span className="break-all text-white/90">
                    {compactTechnicalId(flowDisplayTarget || "—")}
                  </span>
                </div>
                <div>
                  Command :{" "}
                  <span className="break-all text-white/90">
                    {compactTechnicalId(linkedCommand || "—")}
                  </span>
                </div>
                <div>
                  Activité :{" "}
                  <span className="text-white/90">{formatDate(updatedAt)}</span>
                </div>
              </div>

              {synthetic ? (
                <div className="rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm leading-6 text-amber-200">
                  Cet event n’était pas présent dans la fenêtre actuelle de
                  `fetchEvents()`. La page a été reconstruite depuis la command liée
                  pour éviter un 404.
                </div>
              ) : null}
            </div>
          </SidePanelCard>

          <SidePanelCard title="Navigation">
            <div className="space-y-3">
              <Link href="/events" className={actionLinkClassName("soft")}>
                Retour à la liste events
              </Link>

              <Link href="/events" className={actionLinkClassName("primary")}>
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
          </SidePanelCard>
        </>
      }
    >
      <SectionCard
        title="Event identity"
        description="Identité BOSAI de l’event, contexte source et attributs principaux du pipeline."
      >
        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-4">
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
            <div className="mt-2 text-zinc-100">{workspace}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Source</div>
            <div className="mt-2 text-zinc-100">{source}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <MetaItem
            label="Event ID"
            value={<span className={technicalValueClassName()}>{String(event.id)}</span>}
            breakAll
          />

          <MetaItem
            label="Run"
            value={<span className={technicalValueClassName()}>{runId}</span>}
            breakAll
          />

          <MetaItem label="Status" value={statusLabel} />
        </div>
      </SectionCard>

      <SectionCard
        title="Pipeline linking"
        description="Liaisons BOSAI vers command, flow, root event et éventuel incident correspondant."
        tone="neutral"
      >
        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-3">
          <MetaItem
            label="Linked command"
            value={<MetaValueLink href={commandHref} value={linkedCommand || "—"} />}
            breakAll
          />

          <MetaItem
            label="Flow target"
            value={<MetaValueLink href={flowHref} value={flowDisplayTarget || "—"} />}
            breakAll
          />

          <MetaItem
            label="Incident"
            value={
              <MetaValueLink
                href={incidentHref}
                value={matchedIncident ? String(matchedIncident.id) : "—"}
              />
            }
            breakAll
          />

          <MetaItem
            label="Root event"
            value={<MetaValueLink href={rootEventHref} value={rootEventId || "—"} />}
            breakAll
          />

          <MetaItem
            label="Source record"
            value={
              <MetaValueLink
                href={sourceRecordEventHref}
                value={sourceRecordId || "—"}
              />
            }
            breakAll
          />

          <MetaItem
            label="Synthetic fallback"
            value={synthetic ? "Yes" : "No"}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Navigation summary"
        description="Lecture rapide des cibles BOSAI utiles depuis cet event."
        tone="neutral"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Event</div>
            <div className="mt-2 break-all text-xl font-semibold text-white">
              {String(event.id)}
            </div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Flow target</div>
            <div className="mt-2 break-all text-xl font-semibold text-white">
              {flowDisplayTarget || "—"}
            </div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Command target</div>
            <div className="mt-2 break-all text-xl font-semibold text-white">
              {linkedCommand || "—"}
            </div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Incident target</div>
            <div className="mt-2 break-all text-xl font-semibold text-white">
              {matchedIncident ? String(matchedIncident.id) : "—"}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Payload snapshot"
        description="Prévisualisation brute du payload event pour lecture technique rapide."
        tone="neutral"
      >
        <pre className="overflow-x-auto rounded-[20px] border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{stringifyPretty(event.payload ?? {})}
        </pre>
      </SectionCard>

      <section className={cardClassName()}>
        <p className="max-w-4xl text-base text-zinc-400">
          Les liens flow / command / incident sont résolus en best-effort à partir
          des identifiants event, root_event_id, source_record_id, command_id et
          workspace.
        </p>
      </section>
    </ControlPlaneShell>
  );
}
