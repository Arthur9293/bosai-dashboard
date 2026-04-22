import Link from "next/link";
import { cookies } from "next/headers";
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
import {
  appendWorkspaceIdToHref,
  resolveWorkspaceContext,
  workspaceMatchesOrUnscoped,
} from "@/lib/workspace";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

type EventStats = {
  new?: number;
  queued?: number;
  processed?: number;
  ignored?: number;
  error?: number;
  other?: number;
};

type FlexibleEventsResponse = {
  events?: EventItem[];
  items?: EventItem[];
  results?: EventItem[];
  records?: EventItem[];
  data?: unknown;
  stats?: EventStats;
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
    } catch {}
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

function safeResolveEventsActiveWorkspaceId(args: {
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
  const payload = getEventPayload(event);
  return toTextOrEmpty(event.status) || toTextOrEmpty(payload.status) || "unknown";
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
  if (toTextOrEmpty(event.linked_command)) return toTextOrEmpty(event.linked_command);

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

  return toTextOrEmpty(event.source) ||
    toTextOrEmpty(record.source) ||
    toTextOrEmpty(payload.source) ||
    "—";
}

function hasCommandCreated(event: EventItem): boolean {
  const record = event as Record<string, unknown>;
  const direct = record.command_created;

  if (typeof direct === "boolean") return direct;
  if (typeof direct === "string") {
    const normalized = direct.trim().toLowerCase();
    if (["true", "1", "yes", "oui"].includes(normalized)) return true;
    if (["false", "0", "no", "non"].includes(normalized)) return false;
  }
  if (typeof direct === "number") return direct === 1;

  return Boolean(getLinkedCommand(event));
}

function getEventStatusBucket(event: EventItem): string {
  const s = getEventStatus(event).trim().toLowerCase();

  if (["new"].includes(s)) return "new";
  if (["queued", "queue", "pending", "running", "processing", "retry", "retriable"].includes(s)) {
    return "queued";
  }
  if (["processed", "done", "success", "completed", "resolved"].includes(s)) {
    return "processed";
  }
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
  const raw = getEventStatus(event).trim().toLowerCase();
  const bucket = getEventStatusBucket(event);

  if (raw === "running" || raw === "processing") return "RUNNING";
  if (raw === "retry" || raw === "retriable") return "RETRY";
  if (bucket === "new") return "NEW";
  if (bucket === "queued") return "QUEUED";
  if (bucket === "processed") return "PROCESSED";
  if (bucket === "ignored") return "IGNORED";
  if (bucket === "error") return "ERROR";

  const safe = getEventStatus(event);
  return safe ? safe.toUpperCase() : "UNKNOWN";
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
  const raw = getEventStatus(event).trim().toLowerCase();

  if (bucket === "error") return 0;
  if (raw === "retry" || raw === "retriable") return 1;
  if (raw === "running" || raw === "processing") return 2;
  if (bucket === "queued") return 3;
  if (bucket === "new") return 4;
  return 5;
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

function buildEventDetailHref(event: EventItem, workspaceId: string): string {
  return buildHref(`/events/${encodeURIComponent(String(event.id))}`, {
    workspace_id: workspaceId || undefined,
    flow_id: getFlowId(event) || undefined,
    root_event_id: getRootEventId(event) || undefined,
    source_event_id: getSourceRecordId(event) || undefined,
    from: "events",
  });
}

function buildEventFlowHref(event: EventItem, workspaceId: string): string {
  const target = getFlowTarget(event);
  if (!target) return "";

  return appendWorkspaceIdToHref(
    `/flows/${encodeURIComponent(target)}`,
    workspaceId || getWorkspace(event)
  );
}

function buildEventCommandsHref(event: EventItem, workspaceId: string): string {
  return buildHref("/commands", {
    workspace_id: workspaceId || getWorkspace(event) || undefined,
    flow_id: getFlowId(event) || undefined,
    root_event_id: getRootEventId(event) || String(event.id),
    source_event_id: getSourceRecordId(event) || String(event.id),
    from: "events",
  });
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

function EventListCard({
  event,
  activeWorkspaceId,
}: {
  event: EventItem;
  activeWorkspaceId: string;
}) {
  const statusLabel = getEventStatusLabel(event);
  const capability = getEventCapability(event);
  const linkedCommand = getLinkedCommand(event);
  const flowHref = buildEventFlowHref(event, activeWorkspaceId);
  const commandsHref = buildEventCommandsHref(event, activeWorkspaceId);
  const detailHref = buildEventDetailHref(event, activeWorkspaceId);

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
                  href={detailHref}
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
                Workspace · {activeWorkspaceId || getWorkspace(event)}
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
          <Link href={detailHref} className={actionLinkClassName("primary")}>
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

export default async function EventsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await Promise.resolve(
    searchParams ?? {}
  )) as SearchParams;

  const cookieStore = await cookies();

  const fallbackWorkspaceId = safeResolveEventsActiveWorkspaceId({
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
    toText(firstParam(resolvedSearchParams.workspace_id), "") ||
    toText(firstParam((resolvedSearchParams as Record<string, string | string[] | undefined>).workspaceId), "") ||
    fallbackWorkspaceId ||
    "";

  let events: EventItem[] = [];
  let stats: EventStats = {};
  let sourceConnected = false;
  let sourceReachable = false;
  let fetchFailed = false;

  try {
    const raw = (await fetchEvents({
      limit: 500,
      workspaceId: activeWorkspaceId || undefined,
    })) as unknown as FlexibleEventsResponse | unknown;

    sourceReachable = raw !== null && raw !== undefined;

    const extractedEvents = extractEventItems(raw);
    events = extractedEvents.filter((item) =>
      workspaceMatchesOrUnscoped(getWorkspace(item), activeWorkspaceId)
    );

    const statsSource =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as Record<string, unknown>).stats
        : null;

    if (statsSource && typeof statsSource === "object" && !Array.isArray(statsSource)) {
      stats = statsSource as EventStats;
    }

    const hasEvents = events.length > 0;
    const hasPositiveStats =
      !!statsSource &&
      typeof statsSource === "object" &&
      Object.values(statsSource as Record<string, unknown>).some(
        (value) => typeof value === "number" && value > 0
      );

    sourceConnected = hasEvents || hasPositiveStats;
  } catch {
    events = [];
    stats = {};
    sourceConnected = false;
    sourceReachable = false;
    fetchFailed = true;
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

  const focusEventCommandsHref = focusEvent
    ? buildEventCommandsHref(focusEvent, activeWorkspaceId)
    : "";
  const focusEventFlowHref = focusEvent
    ? buildEventFlowHref(focusEvent, activeWorkspaceId)
    : "";
  const focusEventDetailHref = focusEvent
    ? buildEventDetailHref(focusEvent, activeWorkspaceId)
    : "";

  const quickRead =
    errorCount > 0
      ? "Priorité : vérifier les events en erreur avant d’ouvrir les flows liés."
      : queuedCount > 0 || newCount > 0
        ? "Priorité : suivre les events actifs et confirmer la création de commands."
        : processedCount > 0
          ? "Le pipeline visible paraît principalement traité et stable."
          : "Aucune activité event significative n’est visible pour le moment.";

  const flowsHref = appendWorkspaceIdToHref("/flows", activeWorkspaceId);
  const commandsHref = appendWorkspaceIdToHref("/commands", activeWorkspaceId);

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
          <Link href={flowsHref} className={actionLinkClassName("soft")}>
            Ouvrir Flows
          </Link>

          <Link href={commandsHref} className={actionLinkClassName("primary")}>
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
                  Workspace :{" "}
                  <span className="text-white/90">
                    {activeWorkspaceId || "all"}
                  </span>
                </div>
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
                    <span className="text-white/90">
                      {activeWorkspaceId || getWorkspace(focusEvent)}
                    </span>
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
                    href={focusEventDetailHref}
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
      {fetchFailed ? (
        <EmptyStatePanel
          title="Lecture Events indisponible"
          description="Le Dashboard n’a pas pu charger la surface Events. La vue est protégée, mais il faut vérifier la lecture API côté worker / helper."
        />
      ) : sortedEvents.length === 0 ? (
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
                  <EventListCard
                    key={String(event.id)}
                    event={event}
                    activeWorkspaceId={activeWorkspaceId}
                  />
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
                  <EventListCard
                    key={String(event.id)}
                    event={event}
                    activeWorkspaceId={activeWorkspaceId}
                  />
                ))}
              </div>
            )}
          </SectionBlock>
        </>
      )}
    </ControlPlaneShell>
  );
}
