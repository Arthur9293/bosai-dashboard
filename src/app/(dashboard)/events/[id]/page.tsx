import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchEvents, type EventItem } from "@/lib/api";

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
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default",
  disabled = false
) {
  const base =
    "inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/5 text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  return `${base} border border-white/10 bg-white/5 text-white hover:bg-white/10`;
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

function stringifyPretty(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return JSON.stringify({ value: String(value) }, null, 2);
  }
}

function getEventType(event: EventItem): string {
  return (
    toTextOrEmpty((event as Record<string, unknown>).mapped_capability) ||
    toTextOrEmpty(event.event_type) ||
    toTextOrEmpty(event.type) ||
    "Event detail"
  );
}

function getEventStatus(event: EventItem): string {
  return toTextOrEmpty(event.status) || "unknown";
}

function getWorkspace(event: EventItem): string {
  if (toTextOrEmpty(event.workspace_id)) return toTextOrEmpty(event.workspace_id);

  const payload = toRecord(event.payload);
  return (
    toTextOrEmpty(payload.workspace_id) ||
    toTextOrEmpty(payload.workspaceId) ||
    toTextOrEmpty(payload.Workspace_ID) ||
    "—"
  );
}

function getFlowId(event: EventItem): string {
  if (toTextOrEmpty(event.flow_id)) return toTextOrEmpty(event.flow_id);

  const payload = toRecord(event.payload);
  return (
    toTextOrEmpty(payload.flow_id) ||
    toTextOrEmpty(payload.flowId) ||
    toTextOrEmpty(payload.flowid) ||
    ""
  );
}

function getRootEventId(event: EventItem): string {
  if (toTextOrEmpty(event.root_event_id)) return toTextOrEmpty(event.root_event_id);

  const payload = toRecord(event.payload);
  return (
    toTextOrEmpty(payload.root_event_id) ||
    toTextOrEmpty(payload.rootEventId) ||
    toTextOrEmpty(payload.rooteventid) ||
    ""
  );
}

function getFlowTarget(event: EventItem): string {
  return getFlowId(event) || getRootEventId(event) || "";
}

function getLinkedCommand(event: EventItem): string {
  if (toTextOrEmpty(event.command_id)) return toTextOrEmpty(event.command_id);

  const raw = (event as Record<string, unknown>).linked_command;
  if (Array.isArray(raw) && raw.length > 0) {
    return toTextOrEmpty(raw[0]);
  }

  const payload = toRecord(event.payload);
  return (
    toTextOrEmpty(payload.command_id) ||
    toTextOrEmpty(payload.commandId) ||
    ""
  );
}

function getSource(event: EventItem): string {
  const direct = toTextOrEmpty((event as Record<string, unknown>).source);
  if (direct) return direct;

  const payload = toRecord(event.payload);
  return toTextOrEmpty(payload.source) || "—";
}

function getRun(event: EventItem): string {
  const direct = toTextOrEmpty((event as Record<string, unknown>).run_id);
  if (direct) return direct;

  const payload = toRecord(event.payload);
  return (
    toTextOrEmpty(payload.run_id) ||
    toTextOrEmpty(payload.runId) ||
    "—"
  );
}

function hasCommandCreated(event: EventItem): boolean {
  const direct = (event as Record<string, unknown>).command_created;
  if (typeof direct === "boolean") return direct;

  return Boolean(getLinkedCommand(event));
}

function tone(status?: string): string {
  const s = (status || "").toLowerCase();

  if (["processed", "done", "success"].includes(s)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["queued", "pending", "new"].includes(s)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["ignored"].includes(s)) {
    return "bg-zinc-500/15 text-zinc-300 border border-zinc-500/20";
  }

  if (["error", "failed", "dead"].includes(s)) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

export default async function EventDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

  let data: Awaited<ReturnType<typeof fetchEvents>> | null = null;

  try {
    data = await fetchEvents();
  } catch {
    data = null;
  }

  const events = Array.isArray(data?.events) ? data.events : [];
  const event = events.find((item) => String(item.id) === id);

  if (!event) {
    notFound();
  }

  const title = getEventType(event);
  const status = getEventStatus(event);
  const linkedCommand = getLinkedCommand(event);
  const flowId = getFlowId(event);
  const rootEventId = getRootEventId(event);
  const flowTarget = getFlowTarget(event);
  const hasFlow = Boolean(flowTarget);
  const hasCommand = Boolean(linkedCommand);

  const createdAt = toTextOrEmpty(event.created_at);
  const updatedAt = toTextOrEmpty(event.updated_at);
  const processedAt = toTextOrEmpty(event.processed_at);
  const source = getSource(event);
  const workspace = getWorkspace(event);
  const run = getRun(event);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm text-zinc-400">
          <Link
            href="/events"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            Events
          </Link>{" "}
          / {title}
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${tone(
              status
            )}`}
          >
            {status.toUpperCase()}
          </span>

          {hasCommandCreated(event) ? (
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
              COMMAND CREATED
            </span>
          ) : null}

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            {workspace}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Created</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(createdAt)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Updated</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(updatedAt)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Processed</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(processedAt)}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Event identity</div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            ID: <span className="break-all text-zinc-200">{event.id}</span>
          </div>
          <div>
            Event type: <span className="text-zinc-200">{event.event_type || "—"}</span>
          </div>
          <div>
            Capability:{" "}
            <span className="text-zinc-200">
              {toTextOrEmpty(event.mapped_capability) || "—"}
            </span>
          </div>
          <div>
            Workspace: <span className="text-zinc-200">{workspace}</span>
          </div>
          <div>
            Source: <span className="text-zinc-200">{source}</span>
          </div>
          <div>
            Run: <span className="break-all text-zinc-200">{run}</span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Pipeline linking</div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-4">
          <div>
            Command created:{" "}
            <span className="text-zinc-200">
              {hasCommandCreated(event) ? "Yes" : "No"}
            </span>
          </div>
          <div>
            Linked command:{" "}
            <span className="break-all text-zinc-200">{linkedCommand || "—"}</span>
          </div>
          <div>
            Flow: <span className="break-all text-zinc-200">{flowId || "—"}</span>
          </div>
          <div>
            Root event:{" "}
            <span className="break-all text-zinc-200">{rootEventId || "—"}</span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Payload snapshot</div>

        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{stringifyPretty(event.payload)}
        </pre>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation summary</div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Event ID
            </div>
            <div className="mt-3 break-all text-xl font-semibold text-white">
              {event.id}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Flow target
            </div>
            <div className="mt-3 break-all text-xl font-semibold text-white">
              {flowTarget || "—"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Command target
            </div>
            <div className="mt-3 break-all text-xl font-semibold text-white">
              {linkedCommand || "—"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Status
            </div>
            <div className="mt-3 text-xl font-semibold text-white">
              {status.toUpperCase()}
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="space-y-3">
          <Link href="/events" className={actionLinkClassName("soft")}>
            Retour à la liste events
          </Link>

          <Link href="/events" className={actionLinkClassName("primary")}>
            Voir tous les events
          </Link>

          {hasCommand ? (
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

          {hasFlow ? (
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
      </section>
    </div>
  );
}
