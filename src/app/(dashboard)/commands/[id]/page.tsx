import Link from "next/link";
import {
  fetchCommands,
  fetchEvents,
  fetchIncidents,
  type CommandItem,
  type EventItem,
  type IncidentItem,
} from "@/lib/api";

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
      const v = toText(item, "");
      if (v) return v;
    }
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

function toTextOrEmpty(value: unknown): string {
  return toText(value, "");
}

function toNumber(value: unknown, fallback?: number): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }

  return fallback;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function formatDurationSeconds(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value}s`;
}

function tone(status?: string) {
  const s = (status || "").toLowerCase();

  if (["done", "processed", "success"].includes(s)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["running"].includes(s)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["queued", "retry", "pending"].includes(s)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["error", "failed", "dead"].includes(s)) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (["unsupported"].includes(s)) {
    return "bg-zinc-700 text-zinc-300 border border-zinc-600";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function parseJsonMaybe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object") return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return value;

    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

function stringifyPretty(value: unknown) {
  const parsed = parseJsonMaybe(value);

  try {
    return JSON.stringify(parsed ?? {}, null, 2);
  } catch {
    return JSON.stringify({ value: String(parsed) }, null, 2);
  }
}

function getCommandId(command: CommandItem) {
  return toTextOrEmpty(command.id);
}

function getCommandName(command: CommandItem) {
  return (
    toTextOrEmpty(command.capability) ||
    toTextOrEmpty(command.name) ||
    "Unknown command"
  );
}

function getCommandStatus(command: CommandItem) {
  return toTextOrEmpty(command.status) || "unknown";
}

function getRunRecordId(command: CommandItem) {
  return (
    toTextOrEmpty(command.run_record_id) ||
    toTextOrEmpty(command.linked_run) ||
    "—"
  );
}

function getFlowId(command: CommandItem) {
  return toTextOrEmpty(command.flow_id);
}

function getRootEventId(command: CommandItem) {
  return toTextOrEmpty(command.root_event_id);
}

function getParentCommandId(command: CommandItem) {
  return toTextOrEmpty(command.parent_command_id);
}

function getWorker(command: CommandItem) {
  return toTextOrEmpty(command.worker) || "—";
}

function getWorkspace(command: CommandItem) {
  return toTextOrEmpty(command.workspace_id) || "—";
}

function getError(command: CommandItem) {
  return toTextOrEmpty(command.error) || "—";
}

function getStartedAt(command: CommandItem) {
  return toTextOrEmpty(command.started_at) || "";
}

function getFinishedAt(command: CommandItem) {
  return toTextOrEmpty(command.finished_at) || "";
}

function getCreatedAt(command: CommandItem) {
  return toTextOrEmpty(command.created_at) || "";
}

function getUpdatedAt(command: CommandItem) {
  return toTextOrEmpty(command.updated_at) || "";
}

function getDurationSeconds(command: CommandItem) {
  const direct = toNumber(
    (command as Record<string, unknown>).duration_seconds ??
      (command as Record<string, unknown>).duration ??
      (command as Record<string, unknown>).Duration_seconds ??
      (command as Record<string, unknown>).Duration
  );
  if (typeof direct === "number") return direct;

  const started = getStartedAt(command);
  const finished = getFinishedAt(command);

  if (!started || !finished) return undefined;

  const s = new Date(started).getTime();
  const f = new Date(finished).getTime();

  if (!Number.isFinite(s) || !Number.isFinite(f) || f < s) return undefined;
  return Math.round((f - s) / 1000);
}

function getLinkedCommandFromEvent(event: EventItem) {
  const direct = toTextOrEmpty((event as Record<string, unknown>).command_id);
  if (direct) return direct;

  const linked = (event as Record<string, unknown>).linked_command;
  if (Array.isArray(linked) && linked.length > 0) {
    return toTextOrEmpty(linked[0]);
  }

  return "";
}

function getFlowIdFromEvent(event: EventItem) {
  const direct = toTextOrEmpty((event as Record<string, unknown>).flow_id);
  if (direct) return direct;

  const payload = toRecord((event as Record<string, unknown>).payload);
  return (
    toTextOrEmpty(payload.flow_id) ||
    toTextOrEmpty(payload.flowId) ||
    toTextOrEmpty(payload.flowid) ||
    ""
  );
}

function getRootEventIdFromEvent(event: EventItem) {
  const direct = toTextOrEmpty((event as Record<string, unknown>).root_event_id);
  if (direct) return direct;

  const payload = toRecord((event as Record<string, unknown>).payload);
  return (
    toTextOrEmpty(payload.root_event_id) ||
    toTextOrEmpty(payload.rootEventId) ||
    toTextOrEmpty(payload.rooteventid) ||
    ""
  );
}

function getWorkspaceFromEvent(event: EventItem) {
  const direct = toTextOrEmpty((event as Record<string, unknown>).workspace_id);
  if (direct) return direct;

  const payload = toRecord((event as Record<string, unknown>).payload);
  return (
    toTextOrEmpty(payload.workspace_id) ||
    toTextOrEmpty(payload.workspaceId) ||
    toTextOrEmpty(payload.Workspace_ID) ||
    ""
  );
}

function buildSyntheticCommandFromEvent(
  event: EventItem,
  targetCommandId: string
): CommandItem {
  const payload = toRecord((event as Record<string, unknown>).payload);

  return {
    id: targetCommandId,
    capability:
      toTextOrEmpty((event as Record<string, unknown>).mapped_capability) ||
      toTextOrEmpty((event as Record<string, unknown>).event_type) ||
      "linked_command",
    status:
      toTextOrEmpty((event as Record<string, unknown>).status) || "processed",
    workspace_id: getWorkspaceFromEvent(event) || undefined,
    flow_id: getFlowIdFromEvent(event) || undefined,
    root_event_id: getRootEventIdFromEvent(event) || undefined,
    linked_run:
      toTextOrEmpty((event as Record<string, unknown>).run_id) ||
      toTextOrEmpty(payload.run_id) ||
      undefined,
    run_record_id:
      toTextOrEmpty((event as Record<string, unknown>).run_id) ||
      toTextOrEmpty(payload.run_id) ||
      undefined,
    started_at:
      toTextOrEmpty((event as Record<string, unknown>).processed_at) || undefined,
    finished_at:
      toTextOrEmpty((event as Record<string, unknown>).processed_at) || undefined,
    updated_at:
      toTextOrEmpty((event as Record<string, unknown>).updated_at) ||
      toTextOrEmpty((event as Record<string, unknown>).processed_at) ||
      undefined,
    created_at:
      toTextOrEmpty((event as Record<string, unknown>).created_at) || undefined,
    input: payload,
    result: {
      source: "synthetic_from_event",
      event_id: toTextOrEmpty((event as Record<string, unknown>).id),
      note: "Commande absente de la fenêtre /commands, détail reconstruit depuis /events.",
    },
  };
}

function matchIncidents(command: CommandItem, incidents: IncidentItem[]) {
  const commandId = getCommandId(command);
  const flowId = getFlowId(command);
  const rootEventId = getRootEventId(command);

  return incidents.filter((incident) => {
    const incidentCommandId =
      toTextOrEmpty(incident.command_id) || toTextOrEmpty(incident.linked_command);
    const incidentFlowId = toTextOrEmpty(incident.flow_id);
    const incidentRootEventId = toTextOrEmpty(incident.root_event_id);

    if (commandId && incidentCommandId === commandId) return true;
    if (flowId && incidentFlowId === flowId) return true;
    if (rootEventId && incidentRootEventId === rootEventId) return true;

    return false;
  });
}

export default async function CommandDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

  const [commandsData, eventsData, incidentsData] = await Promise.allSettled([
    fetchCommands(),
    fetchEvents(),
    fetchIncidents(),
  ]);

  const commands =
    commandsData.status === "fulfilled" && Array.isArray(commandsData.value?.commands)
      ? commandsData.value.commands
      : [];

  const events =
    eventsData.status === "fulfilled" && Array.isArray(eventsData.value?.events)
      ? eventsData.value.events
      : [];

  const incidents =
    incidentsData.status === "fulfilled" &&
    Array.isArray(incidentsData.value?.incidents)
      ? incidentsData.value.incidents
      : [];

  let command = commands.find((item) => String(item.id) === id) || null;

  let fallbackEvent: EventItem | null = null;

  if (!command) {
    fallbackEvent =
      events.find((event) => getLinkedCommandFromEvent(event) === id) || null;

    if (fallbackEvent) {
      command = buildSyntheticCommandFromEvent(fallbackEvent, id);
    }
  }

  const linkedIncidents = command ? matchIncidents(command, incidents) : [];

  const title = command ? getCommandName(command) : "Command introuvable";
  const status = command ? getCommandStatus(command) : "unknown";
  const flowId = command ? getFlowId(command) : "";
  const rootEventId = command ? getRootEventId(command) : "";
  const runRecordId = command ? getRunRecordId(command) : "—";
  const workspace = command ? getWorkspace(command) : "—";
  const worker = command ? getWorker(command) : "—";
  const error = command ? getError(command) : "—";
  const parentCommandId = command ? getParentCommandId(command) : "";
  const durationSeconds = command ? getDurationSeconds(command) : undefined;
  const startedAt = command ? getStartedAt(command) : "";
  const finishedAt = command ? getFinishedAt(command) : "";
  const createdAt = command ? getCreatedAt(command) : "";
  const updatedAt = command ? getUpdatedAt(command) : "";
  const inputPreview = command ? stringifyPretty(command.input) : "{}";
  const resultPreview = command ? stringifyPretty(command.result) : "{}";

  const hasFlow = Boolean(flowId);
  const hasRootEvent = Boolean(rootEventId);
  const hasParent = Boolean(parentCommandId);
  const fallbackMode = Boolean(fallbackEvent) && !commands.find((item) => String(item.id) === id);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm text-zinc-400">
          <Link
            href="/commands"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            Commands
          </Link>{" "}
          / {title}
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
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

          {fallbackMode ? (
            <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-300">
              FALLBACK FROM EVENT
            </span>
          ) : null}

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            COMMAND DETAIL
          </span>
        </div>

        {fallbackMode ? (
          <p className="mt-4 max-w-3xl text-sm text-amber-300/90">
            Cette commande n’est pas revenue dans la fenêtre actuelle de <code>/commands</code>.
            La page a été reconstruite automatiquement depuis l’event lié pour éviter le 404.
          </p>
        ) : null}
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Created</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(createdAt)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Started</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(startedAt)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Finished</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(finishedAt)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Duration</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDurationSeconds(durationSeconds)}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-4 text-lg font-medium text-white">
            Contexte command
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
            <div>
              Capability: <span className="text-zinc-200">{title}</span>
            </div>
            <div>
              Status: <span className="text-zinc-200">{status.toUpperCase()}</span>
            </div>
            <div>
              Workspace: <span className="text-zinc-200">{workspace}</span>
            </div>
            <div>
              Worker: <span className="text-zinc-200">{worker}</span>
            </div>
            <div>
              Run record: <span className="break-all text-zinc-200">{runRecordId}</span>
            </div>
            <div>
              Parent command:{" "}
              <span className="break-all text-zinc-200">
                {parentCommandId || "—"}
              </span>
            </div>
            <div className="md:col-span-2">
              Error: <span className="break-all text-zinc-200">{error}</span>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Liens flow
          </div>

          <div className="space-y-4 text-sm text-zinc-400">
            <div className="break-all">
              Flow:{" "}
              {hasFlow ? (
                <Link
                  href={`/flows/${encodeURIComponent(flowId)}`}
                  className="text-zinc-200 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {flowId}
                </Link>
              ) : (
                <span className="text-zinc-200">—</span>
              )}
            </div>

            <div className="break-all">
              Root event:{" "}
              <span className="text-zinc-200">{rootEventId || "—"}</span>
            </div>

            <div className="break-all">
              Command ID:{" "}
              <span className="text-zinc-200">{command ? getCommandId(command) : id}</span>
            </div>

            {fallbackEvent ? (
              <div className="break-all">
                Source event:{" "}
                <Link
                  href={`/events/${encodeURIComponent(String(fallbackEvent.id))}`}
                  className="text-zinc-200 underline decoration-white/20 underline-offset-4 transition hover:text-white"
                >
                  {String(fallbackEvent.id)}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Input preview</div>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{inputPreview}
          </pre>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Result preview</div>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{resultPreview}
          </pre>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Incidents liés</div>

          {linkedIncidents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
              Aucun incident lié détecté pour cette commande.
            </div>
          ) : (
            <div className="space-y-3">
              {linkedIncidents.slice(0, 5).map((incident) => {
                const incidentId = String(incident.id || "");
                const incidentTitle =
                  toTextOrEmpty(incident.title) ||
                  toTextOrEmpty(incident.name) ||
                  "Incident";

                return (
                  <Link
                    key={incidentId}
                    href={`/incidents/${encodeURIComponent(incidentId)}`}
                    className="block rounded-xl border border-white/10 bg-black/20 px-4 py-4 transition hover:bg-black/30"
                  >
                    <div className="text-sm font-medium text-white">
                      {incidentTitle}
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">
                      {toTextOrEmpty(incident.status) ||
                        toTextOrEmpty(incident.statut_incident) ||
                        "—"}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Navigation</div>

          <div className="space-y-3">
            <Link href="/commands" className={actionLinkClassName("soft")}>
              Retour à la liste commands
            </Link>

            <Link href="/commands" className={actionLinkClassName("primary")}>
              Voir toutes les commands
            </Link>

            {hasParent ? (
              <Link
                href={`/commands/${encodeURIComponent(parentCommandId)}`}
                className={actionLinkClassName("soft")}
              >
                Ouvrir la command parente
              </Link>
            ) : null}

            {hasFlow ? (
              <Link
                href={`/flows/${encodeURIComponent(flowId)}`}
                className={actionLinkClassName("soft")}
              >
                Ouvrir le flow lié
              </Link>
            ) : null}

            {hasRootEvent ? (
              <Link
                href={`/events/${encodeURIComponent(rootEventId)}`}
                className={actionLinkClassName("soft")}
              >
                Ouvrir le root event
              </Link>
            ) : null}

            {fallbackEvent ? (
              <Link
                href={`/events/${encodeURIComponent(String(fallbackEvent.id))}`}
                className={actionLinkClassName("soft")}
              >
                Retour à l’event source
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
