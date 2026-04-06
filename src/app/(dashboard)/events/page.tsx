import Link from "next/link";
import { fetchEvents, type EventItem } from "@/lib/api";

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

function emptyStateClassName() {
  return "rounded-[28px] border border-dashed border-white/10 px-5 py-10 text-sm text-zinc-500";
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
    return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
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

  return (
    toTextOrEmpty(record.source) ||
    toTextOrEmpty(payload.source) ||
    "—"
  );
}

function hasCommandCreated(event: EventItem): boolean {
  const record = event as Record<string, unknown>;
  const direct = record.command_created;

  if (typeof direct === "boolean") return direct;
  return Boolean(getLinkedCommand(event));
}

function badgeTone(status?: string): string {
  const s = (status || "").trim().toLowerCase();

  if (["processed", "done", "success", "completed"].includes(s)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["queued", "pending", "new"].includes(s)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["running", "processing"].includes(s)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["error", "failed", "dead", "blocked"].includes(s)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  if (["ignored"].includes(s)) {
    return "bg-zinc-500/15 text-zinc-300 border border-zinc-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function latestByStatus(events: EventItem[], status: string): EventItem | null {
  const filtered = events
    .filter((event) => getEventStatus(event).toLowerCase() === status.toLowerCase())
    .sort(
      (a, b) =>
        new Date(getEventDate(b) || 0).getTime() -
        new Date(getEventDate(a) || 0).getTime()
    );

  return filtered[0] || null;
}

function EventCard({ event }: { event: EventItem }) {
  const status = getEventStatus(event);
  const linkedCommand = getLinkedCommand(event);
  const flowTarget = getFlowTarget(event);
  const capability = getEventCapability(event);

  return (
    <article className={cardClassName()}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className={sectionLabelClassName()}>BOSAI Event</div>

          <div className="space-y-3">
            <Link
              href={`/events/${encodeURIComponent(String(event.id))}`}
              className="block break-words text-xl font-semibold tracking-tight text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
            >
              {getEventType(event)}
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badgeTone(
                  status
                )}`}
              >
                {status.toUpperCase()}
              </span>

              {capability !== "—" ? (
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
                  {capability}
                </span>
              ) : null}

              {hasCommandCreated(event) ? (
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
                  COMMAND CREATED
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
            <span>
              Workspace: <span className="text-zinc-300">{getWorkspace(event)}</span>
            </span>
            <span>
              Source: <span className="text-zinc-300">{getSource(event)}</span>
            </span>
          </div>
        </div>

        <div className="grid gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className={metaLabelClassName()}>Event ID</div>
            <div className="mt-1 break-all text-zinc-200">{event.id}</div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Flow</div>
            <div className="mt-1 break-all text-zinc-200">
              {getFlowId(event) || "—"}
            </div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Root event</div>
            <div className="mt-1 break-all text-zinc-200">
              {getRootEventId(event) || "—"}
            </div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Linked command</div>
            <div className="mt-1 break-all text-zinc-200">
              {linkedCommand || "—"}
            </div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Updated</div>
            <div className="mt-1 text-zinc-200">
              {formatDate(event.updated_at)}
            </div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Processed</div>
            <div className="mt-1 text-zinc-200">
              {formatDate(event.processed_at)}
            </div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Created</div>
            <div className="mt-1 text-zinc-200">
              {formatDate(event.created_at)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/events/${encodeURIComponent(String(event.id))}`}
            className={actionLinkClassName("primary")}
          >
            Ouvrir l’event
          </Link>

          {linkedCommand ? (
            <Link
              href={`/commands/${encodeURIComponent(linkedCommand)}`}
              className={actionLinkClassName("soft")}
            >
              Ouvrir la command liée
            </Link>
          ) : (
            <span className={actionLinkClassName("soft", true)}>
              Ouvrir la command liée
            </span>
          )}

          {flowTarget ? (
            <Link
              href={`/flows/${encodeURIComponent(flowTarget)}`}
              className={actionLinkClassName("soft")}
            >
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

export default async function EventsPage() {
  let events: EventItem[] = [];
  let stats: EventStats = {};
  let sourceConnected = false;

  try {
    const data = await fetchEvents();

    if (Array.isArray(data?.events)) {
      events = data.events;
    }

    if (data?.stats && typeof data.stats === "object") {
      stats = data.stats as EventStats;
    }

    sourceConnected = Boolean(data?.events || data?.stats);
  } catch {
    events = [];
    stats = {};
    sourceConnected = false;
  }

  const newCount = stats.new ?? 0;
  const queuedCount = stats.queued ?? 0;
  const processedCount = stats.processed ?? 0;
  const ignoredCount = stats.ignored ?? 0;
  const errorCount = stats.error ?? 0;
  const otherCount = stats.other ?? 0;

  const list = [...events]
    .sort(
      (a, b) =>
        new Date(getEventDate(b) || 0).getTime() -
        new Date(getEventDate(a) || 0).getTime()
    )
    .slice(0, 30);

  const latestProcessed = latestByStatus(events, "processed");
  const latestQueued = latestByStatus(events, "queued");
  const latestError = latestByStatus(events, "error");
  const commandsCreatedCount = events.filter((event) => hasCommandCreated(event)).length;

  return (
    <div className="space-y-8">
      <section className="space-y-3 border-b border-white/10 pb-6">
        <div className={sectionLabelClassName()}>BOSAI Dashboard</div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Events
          </h1>
          <p className="mt-2 max-w-3xl text-base text-zinc-400 sm:text-lg">
            Flux des événements BOSAI. Cette vue affiche les events, leur statut,
            leur rattachement pipeline et les liens vers les commands et flows.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["New", newCount],
          ["Queued", queuedCount],
          ["Processed", processedCount],
          ["Ignored", ignoredCount],
          ["Errors", errorCount],
          ["Other", otherCount],
        ].map(([label, value]) => (
          <div key={label} className={cardClassName()}>
            <div className="text-sm text-zinc-400">{label}</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
              {value}
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Source status</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {sourceConnected ? "Connected" : "Unavailable"}
          </div>
          <div className="mt-4">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                sourceConnected
                  ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                  : "border border-white/10 bg-white/[0.04] text-zinc-300"
              }`}
            >
              {sourceConnected ? "LIVE SOURCE" : "NO SOURCE"}
            </span>
          </div>
        </div>

        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className={sectionLabelClassName()}>Event stream</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Historique récent
              </div>
            </div>

            <div className="text-sm text-zinc-500">{list.length} visible(s)</div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
              <div className={metaLabelClassName()}>Latest processed</div>
              <div className="mt-3 text-xl font-semibold text-white">
                {formatDate(latestProcessed ? getEventDate(latestProcessed) : "")}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
              <div className={metaLabelClassName()}>Latest queued</div>
              <div className="mt-3 text-xl font-semibold text-white">
                {formatDate(latestQueued ? getEventDate(latestQueued) : "")}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
              <div className={metaLabelClassName()}>Latest error</div>
              <div className="mt-3 text-xl font-semibold text-white">
                {formatDate(latestError ? getEventDate(latestError) : "")}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-4">
              <div className={metaLabelClassName()}>Commands created</div>
              <div className="mt-3 text-xl font-semibold text-white">
                {commandsCreatedCount}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4">
        {list.length === 0 ? (
          <div className={emptyStateClassName()}>Aucun événement affiché.</div>
        ) : (
          list.map((event) => <EventCard key={String(event.id)} event={event} />)
        )}
      </section>
    </div>
  );
}
