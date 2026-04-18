import Link from "next/link";
import type { ReactNode } from "react";
import { fetchEvents, type EventItem } from "@/lib/api";
import {
  ControlPlaneShell,
  SectionCard,
  SidePanelCard,
  SectionCountPill,
  EmptyStatePanel,
} from "@/components/dashboard/ControlPlaneShell";
import {
  DashboardStatusBadge,
  type DashboardStatusKind,
} from "@/components/dashboard/StatusBadge";

type EventStats = {
  new?: number;
  queued?: number;
  processed?: number;
  ignored?: number;
  error?: number;
  other?: number;
};

function cardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function statCardClassName() {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default",
  disabled = false
) {
  const base =
    "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "soft") {
    return `${base} border border-white/10 bg-black/20 text-zinc-200 hover:bg-white/[0.06]`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function chipClassName() {
  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-200";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function metaBoxClassName() {
  return "rounded-[18px] border border-white/10 bg-black/20 px-4 py-4";
}

function compactTechnicalId(value: string, max = 34): string {
  const clean = value.trim();
  if (!clean) return "—";
  if (clean.length <= max) return clean;

  const keepStart = Math.max(12, Math.floor((max - 3) / 2));
  const keepEnd = Math.max(8, max - keepStart - 3);

  return `${clean.slice(0, keepStart)}...${clean.slice(-keepEnd)}`;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
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

function getEventPayload(event: EventItem): Record<string, unknown> {
  return toRecord(event.payload);
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
    "unknown"
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

function getEventDate(event: EventItem): string {
  return (
    toTextOrEmpty(event.updated_at) ||
    toTextOrEmpty(event.processed_at) ||
    toTextOrEmpty(event.created_at) ||
    ""
  );
}

function getWorkspace(event: EventItem): string {
  if (toTextOrEmpty(event.workspace_id)) return toTextOrEmpty(event.workspace_id);

  const payload = getEventPayload(event);
  return (
    toTextOrEmpty(payload.workspace_id) ||
    toTextOrEmpty(payload.workspaceId) ||
    toTextOrEmpty(payload.Workspace_ID) ||
    "—"
  );
}

function getFlowId(event: EventItem): string {
  if (toTextOrEmpty(event.flow_id)) return toTextOrEmpty(event.flow_id);

  const payload = getEventPayload(event);
  return (
    toTextOrEmpty(payload.flow_id) ||
    toTextOrEmpty(payload.flowId) ||
    toTextOrEmpty(payload.flowid) ||
    ""
  );
}

function getRootEventId(event: EventItem): string {
  if (toTextOrEmpty(event.root_event_id)) return toTextOrEmpty(event.root_event_id);

  const payload = getEventPayload(event);
  return (
    toTextOrEmpty(payload.root_event_id) ||
    toTextOrEmpty(payload.rootEventId) ||
    toTextOrEmpty(payload.rooteventid) ||
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

function getFlowTarget(event: EventItem): string {
  return getFlowId(event) || getRootEventId(event) || getSourceRecordId(event) || "";
}

function getLinkedCommand(event: EventItem): string {
  if (toTextOrEmpty(event.command_id)) return toTextOrEmpty(event.command_id);

  const record = event as Record<string, unknown>;
  const raw = record.linked_command;
  if (Array.isArray(raw) && raw.length > 0) {
    return toTextOrEmpty(raw[0]);
  }

  const payload = getEventPayload(event);
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

function getSource(event: EventItem): string {
  const record = event as Record<string, unknown>;
  const payload = getEventPayload(event);

  return toTextOrEmpty(record.source) || toTextOrEmpty(payload.source) || "—";
}

function hasCommandCreated(event: EventItem): boolean {
  const record = event as Record<string, unknown>;
  const direct = record.command_created;

  if (typeof direct === "boolean") return direct;
  return Boolean(getLinkedCommand(event));
}

function getEventStatusBucket(event: EventItem): string {
  const s = getEventStatus(event).trim().toLowerCase();

  if (["new"].includes(s)) return "new";
  if (["queued", "pending"].includes(s)) return "queued";
  if (["processed", "done", "success", "completed"].includes(s)) return "processed";
  if (["ignored"].includes(s)) return "ignored";
  if (["error", "failed", "dead", "blocked"].includes(s)) return "error";
  return "other";
}

function getEventStatusBadgeKind(event: EventItem): DashboardStatusKind {
  const bucket = getEventStatusBucket(event);

  if (bucket === "new" || bucket === "queued") return "queued";
  if (bucket === "processed") return "success";
  if (bucket === "error") return "failed";
  if (bucket === "ignored") return "unknown";
  return "unknown";
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

function latestByBucket(events: EventItem[], bucket: string): EventItem | null {
  const filtered = events
    .filter((event) => getEventStatusBucket(event) === bucket)
    .sort(
      (a, b) =>
        new Date(getEventDate(b) || 0).getTime() -
        new Date(getEventDate(a) || 0).getTime()
    );

  return filtered[0] || null;
}

function getAttentionPriority(event: EventItem): number {
  const bucket = getEventStatusBucket(event);

  if (bucket === "error") return 0;
  if (bucket === "queued") return 1;
  if (bucket === "new") return 2;
  return 3;
}

function sortEvents(events: EventItem[]): EventItem[] {
  return [...events].sort(
    (a, b) =>
      new Date(getEventDate(b) || 0).getTime() -
      new Date(getEventDate(a) || 0).getTime()
  );
}

function sortAttentionEvents(events: EventItem[]): EventItem[] {
  return [...events].sort((a, b) => {
    const priorityDiff = getAttentionPriority(a) - getAttentionPriority(b);
    if (priorityDiff !== 0) return priorityDiff;

    return (
      new Date(getEventDate(b) || 0).getTime() -
      new Date(getEventDate(a) || 0).getTime()
    );
  });
}

function buildEventFlowHref(event: EventItem): string {
  const target = getFlowTarget(event);
  if (!target) return "";
  return `/flows?selected=${encodeURIComponent(target)}`;
}

function buildEventCommandsHref(event: EventItem): string {
  const params = new URLSearchParams();

  const flowId = getFlowId(event);
  const rootEventId = getRootEventId(event) || String(event.id);
  const sourceEventId = getSourceRecordId(event) || String(event.id);

  if (flowId) {
    params.set("flow_id", flowId);
  }

  if (rootEventId) {
    params.set("root_event_id", rootEventId);
  }

  if (sourceEventId) {
    params.set("source_event_id", sourceEventId);
  }

  params.set("from", "events");

  return `/commands?${params.toString()}`;
}

function EventMiniStat({
  label,
  value,
  toneClass,
}: {
  label: string;
  value: number | string;
  toneClass: string;
}) {
  return (
    <div className={statCardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function EventListCard({ event }: { event: EventItem }) {
  const statusLabel = getEventStatusLabel(event);
  const capability = getEventCapability(event);
  const linkedCommand = getLinkedCommand(event);
  const flowHref = buildEventFlowHref(event);
  const commandsHref = buildEventCommandsHref(event);

  return (
    <article className={cardClassName()}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            BOSAI Event
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <Link
                  href={`/events/${encodeURIComponent(String(event.id))}`}
                  className="block break-words text-xl font-semibold tracking-tight text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
                >
                  {getEventType(event)}
                </Link>

                <div className="mt-2 text-sm text-zinc-400">
                  {getWorkspace(event)} · {getSource(event)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <DashboardStatusBadge
                  kind={getEventStatusBadgeKind(event)}
                  label={statusLabel}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {capability !== "—" ? (
                <span className={chipClassName()}>{capability}</span>
              ) : null}

              {hasCommandCreated(event) ? (
                <DashboardStatusBadge kind="success" label="COMMAND CREATED" />
              ) : null}

              <span className={chipClassName()}>
                Workspace · {getWorkspace(event)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Updated</div>
            <div className="mt-2 text-zinc-100">{formatDate(event.updated_at)}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Processed</div>
            <div className="mt-2 text-zinc-100">{formatDate(event.processed_at)}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Created</div>
            <div className="mt-2 text-zinc-100">{formatDate(event.created_at)}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Linked command</div>
            <div className="mt-2 break-all text-zinc-100">
              {linkedCommand || "—"}
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-2 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Flow</div>
            <div className="mt-2 break-all text-zinc-100">
              {getFlowId(event) || "—"}
            </div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Root event</div>
            <div className="mt-2 break-all text-zinc-100">
              {getRootEventId(event) || "—"}
            </div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Source record</div>
            <div className="mt-2 break-all text-zinc-100">
              {getSourceRecordId(event) || "—"}
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Event ID</div>
            <div className="mt-2 break-all text-zinc-100">{String(event.id)}</div>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2.5 pt-1">
          <Link
            href={`/events/${encodeURIComponent(String(event.id))}`}
            className={actionLinkClassName("primary")}
          >
            Ouvrir l’event
          </Link>

          {linkedCommand ? (
            <Link href={commandsHref} className={actionLinkClassName("soft")}>
              Voir les commands liées
            </Link>
          ) : (
            <span className={actionLinkClassName("soft", true)}>
              Voir les commands liées
            </span>
          )}

          {flowHref ? (
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
    </article>
  );
}

function SectionBlock({
  title,
  description,
  count,
  countTone = "default",
  tone = "default",
  children,
}: {
  title: string;
  description: string;
  count: number;
  countTone?: "default" | "info" | "success" | "warning" | "danger" | "muted";
  tone?: "default" | "attention" | "neutral";
  children: ReactNode;
}) {
  return (
    <SectionCard
      title={title}
      description={description}
      tone={tone}
      action={<SectionCountPill value={count} tone={countTone} />}
    >
      {children}
    </SectionCard>
  );
}

export default async function EventsPage() {
  let events: EventItem[] = [];
  let stats: EventStats = {};
  let sourceConnected = false;
  let sourceReachable = false;

  try {
    const data = await fetchEvents();
    sourceReachable = data !== null && data !== undefined;

    if (Array.isArray(data?.events)) {
      events = data.events;
    }

    if (data?.stats && typeof data.stats === "object") {
      stats = data.stats as EventStats;
    }

    const hasEvents = Array.isArray(data?.events) && data.events.length > 0;
    const hasPositiveStats =
      !!data?.stats &&
      typeof data.stats === "object" &&
      Object.values(data.stats as Record<string, unknown>).some(
        (value) => typeof value === "number" && value > 0
      );

    sourceConnected = hasEvents || hasPositiveStats;
  } catch {
    events = [];
    stats = {};
    sourceConnected = false;
    sourceReachable = false;
  }

  const sortedEvents = sortEvents(events);

  const newEvents = sortedEvents.filter((event) => getEventStatusBucket(event) === "new");
  const queuedEvents = sortedEvents.filter(
    (event) => getEventStatusBucket(event) === "queued"
  );
  const processedEvents = sortedEvents.filter(
    (event) => getEventStatusBucket(event) === "processed"
  );
  const ignoredEvents = sortedEvents.filter(
    (event) => getEventStatusBucket(event) === "ignored"
  );
  const errorEvents = sortedEvents.filter(
    (event) => getEventStatusBucket(event) === "error"
  );
  const otherEvents = sortedEvents.filter(
    (event) => getEventStatusBucket(event) === "other"
  );

  const attentionEvents = sortAttentionEvents([
    ...newEvents,
    ...queuedEvents,
    ...errorEvents,
  ]);

  const stableEvents = sortEvents([
    ...processedEvents,
    ...ignoredEvents,
    ...otherEvents,
  ]);

  const newCount = stats.new ?? newEvents.length;
  const queuedCount = stats.queued ?? queuedEvents.length;
  const processedCount = stats.processed ?? processedEvents.length;
  const errorCount = stats.error ?? errorEvents.length;
  const ignoredCount = stats.ignored ?? ignoredEvents.length;
  const otherCount = stats.other ?? otherEvents.length;

  const latestProcessed = latestByBucket(sortedEvents, "processed");
  const latestQueued = latestByBucket(sortedEvents, "queued");
  const latestError = latestByBucket(sortedEvents, "error");
  const commandsCreatedCount = sortedEvents.filter((event) => hasCommandCreated(event)).length;

  const focusEvent =
    attentionEvents[0] ??
    processedEvents[0] ??
    sortedEvents[0] ??
    null;

  const focusEventCommandsHref = focusEvent ? buildEventCommandsHref(focusEvent) : "";
  const focusEventFlowHref = focusEvent ? buildEventFlowHref(focusEvent) : "";

  const quickRead =
    errorCount > 0
      ? "Priorité : vérifier les events en erreur avant d’ouvrir les flows liés."
      : queuedCount > 0 || newCount > 0
        ? "Priorité : suivre les events actifs et confirmer la création de commands."
        : processedCount > 0
          ? "Le pipeline visible paraît principalement traité et stable."
          : "Aucune activité event significative n’est visible pour le moment.";

  return (
    <ControlPlaneShell
      eyebrow="BOSAI Control Plane"
      title="Events"
      description="Flux des événements BOSAI avec lecture pipeline, statut de traitement et navigation directe vers les commands et flows associés."
      badges={[
        { label: "Pipeline source", tone: "info" },
        { label: "Flow-linked", tone: "warning" },
        { label: "Command-aware", tone: "muted" },
      ]}
      metrics={[
        { label: "New", value: newCount, toneClass: "text-amber-300" },
        { label: "Queued", value: queuedCount, toneClass: "text-sky-300" },
        { label: "Processed", value: processedCount, toneClass: "text-emerald-300" },
        { label: "Errors", value: errorCount, toneClass: "text-red-300" },
      ]}
      actions={
        <>
          <Link href="/flows" className={actionLinkClassName("soft")}>
            Ouvrir Flows
          </Link>

          <Link href="/commands" className={actionLinkClassName("primary")}>
            Voir Commands
          </Link>
        </>
      }
      aside={
        <>
          <SidePanelCard title="Source status">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <DashboardStatusBadge
                  kind={sourceConnected ? "success" : sourceReachable ? "queued" : "unknown"}
                  label={
                    sourceConnected
                      ? "SOURCE ACTIVE"
                      : sourceReachable
                        ? "SOURCE CONNECTÉE"
                        : "SOURCE INDISPONIBLE"
                  }
                />

                <DashboardStatusBadge
                  kind={commandsCreatedCount > 0 ? "success" : "unknown"}
                  label={
                    commandsCreatedCount > 0
                      ? `${commandsCreatedCount} COMMANDS`
                      : "AUCUNE COMMAND LIÉE"
                  }
                />
              </div>

              <div className="space-y-2 text-sm leading-6 text-white/65">
                <div>
                  Source :{" "}
                  <span className="text-white/90">
                    {sourceConnected
                      ? "Active"
                      : sourceReachable
                        ? "Connected but empty"
                        : "Unavailable"}
                  </span>
                </div>
                <div>
                  Latest processed :{" "}
                  <span className="text-white/90">
                    {formatDate(latestProcessed ? getEventDate(latestProcessed) : "")}
                  </span>
                </div>
                <div>
                  Latest queued :{" "}
                  <span className="text-white/90">
                    {formatDate(latestQueued ? getEventDate(latestQueued) : "")}
                  </span>
                </div>
                <div>
                  Latest error :{" "}
                  <span className="text-white/90">
                    {formatDate(latestError ? getEventDate(latestError) : "")}
                  </span>
                </div>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                  Quick read
                </div>
                <div className="mt-2 text-sm leading-6 text-white/70">
                  {quickRead}
                </div>
              </div>
            </div>
          </SidePanelCard>

          <SidePanelCard title="Event actif">
            {focusEvent ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Type
                  </div>
                  <div className="mt-2 text-sm font-medium leading-6 text-white">
                    {getEventType(focusEvent)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <DashboardStatusBadge
                    kind={getEventStatusBadgeKind(focusEvent)}
                    label={getEventStatusLabel(focusEvent)}
                  />
                  {getEventCapability(focusEvent) !== "—" ? (
                    <DashboardStatusBadge
                      kind="queued"
                      label={getEventCapability(focusEvent)}
                    />
                  ) : null}
                  {hasCommandCreated(focusEvent) ? (
                    <DashboardStatusBadge kind="success" label="COMMAND CREATED" />
                  ) : null}
                </div>

                <div className="space-y-2 text-sm leading-6 text-white/65">
                  <div>
                    Workspace :{" "}
                    <span className="text-white/90">{getWorkspace(focusEvent)}</span>
                  </div>
                  <div>
                    Flow :{" "}
                    <span className="break-all text-white/90">
                      {compactTechnicalId(getFlowTarget(focusEvent) || "—")}
                    </span>
                  </div>
                  <div>
                    Activité :{" "}
                    <span className="text-white/90">
                      {formatDate(getEventDate(focusEvent))}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    href={`/events/${encodeURIComponent(String(focusEvent.id))}`}
                    className={actionLinkClassName("primary")}
                  >
                    Ouvrir l’event
                  </Link>

                  {getLinkedCommand(focusEvent) ? (
                    <Link
                      href={focusEventCommandsHref}
                      className={actionLinkClassName("soft")}
                    >
                      Voir les commands liées
                    </Link>
                  ) : null}

                  {focusEventFlowHref ? (
                    <Link
                      href={focusEventFlowHref}
                      className={actionLinkClassName("soft")}
                    >
                      Ouvrir le flow lié
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/55">Aucun event sélectionné.</div>
            )}
          </SidePanelCard>
        </>
      }
    >
      {sortedEvents.length === 0 ? (
        <EmptyStatePanel
          title="Aucun événement visible"
          description="Le Dashboard n’a remonté aucun event sur la source actuelle."
        />
      ) : (
        <>
          <SectionCard
            title="Pipeline posture"
            description="Lecture rapide de l’activité récente du pipeline Events."
            action={<SectionCountPill value={sortedEvents.length} tone="info" />}
          >
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
              <EventMiniStat
                label="New"
                value={newCount}
                toneClass="text-amber-300"
              />
              <EventMiniStat
                label="Queued"
                value={queuedCount}
                toneClass="text-sky-300"
              />
              <EventMiniStat
                label="Processed"
                value={processedCount}
                toneClass="text-emerald-300"
              />
              <EventMiniStat
                label="Errors"
                value={errorCount}
                toneClass="text-red-300"
              />
              <EventMiniStat
                label="Commands"
                value={commandsCreatedCount}
                toneClass="text-white"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Latest processed</div>
                <div className="mt-2 text-zinc-100">
                  {formatDate(latestProcessed ? getEventDate(latestProcessed) : "")}
                </div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Latest queued</div>
                <div className="mt-2 text-zinc-100">
                  {formatDate(latestQueued ? getEventDate(latestQueued) : "")}
                </div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Latest error</div>
                <div className="mt-2 text-zinc-100">
                  {formatDate(latestError ? getEventDate(latestError) : "")}
                </div>
              </div>

              <div className={metaBoxClassName()}>
                <div className={metaLabelClassName()}>Stable states</div>
                <div className="mt-2 text-zinc-100">
                  {ignoredCount + otherCount}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
              <div className={metaLabelClassName()}>Quick read</div>
              <div className="mt-2 text-sm leading-6 text-zinc-300">
                {quickRead}
              </div>
            </div>
          </SectionCard>

          <SectionBlock
            title="Needs Attention"
            description="Events à surveiller en priorité : nouveaux, en file ou en erreur."
            count={attentionEvents.length}
            countTone="warning"
            tone="attention"
          >
            {attentionEvents.length === 0 ? (
              <EmptyStatePanel
                title="Aucun event prioritaire"
                description="Aucun event new, queued ou error n’est visible pour le moment."
              />
            ) : (
              <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
                {attentionEvents.slice(0, 20).map((event) => (
                  <EventListCard key={String(event.id)} event={event} />
                ))}
              </div>
            )}
          </SectionBlock>

          <SectionBlock
            title="Processed & stable"
            description="Events traités, ignorés ou autres états stables, triés du plus récent au plus ancien."
            count={stableEvents.length}
            countTone="success"
            tone="neutral"
          >
            {stableEvents.length === 0 ? (
              <EmptyStatePanel
                title="Aucun event stable"
                description="Aucun event processed, ignored ou other n’est visible sur cette vue."
              />
            ) : (
              <div className="grid gap-5 xl:grid-cols-2 xl:gap-5">
                {stableEvents.slice(0, 20).map((event) => (
                  <EventListCard key={String(event.id)} event={event} />
                ))}
              </div>
            )}
          </SectionBlock>
        </>
      )}
    </ControlPlaneShell>
  );
}
