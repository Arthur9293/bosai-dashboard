import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchCommandById,
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
    } catch {
      return {};
    }
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

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = toTextOrEmpty(value);
    if (text) return text;
  }
  return "";
}

function getCommandInput(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.input);
}

function getCommandResult(command: CommandItem): Record<string, unknown> {
  return parseMaybeJson(command.result);
}

function getCommandStatus(command: CommandItem): string {
  return toTextOrEmpty(command.status) || "unknown";
}

function getCapability(command: CommandItem): string {
  return (
    toTextOrEmpty(command.capability) ||
    firstNonEmpty(
      getCommandInput(command).capability,
      getCommandResult(command).capability
    ) ||
    "unknown_capability"
  );
}

function getWorkspace(command: CommandItem): string {
  return (
    toTextOrEmpty(command.workspace_id) ||
    firstNonEmpty(
      getCommandInput(command).workspace_id,
      getCommandInput(command).workspaceId,
      getCommandResult(command).workspace_id,
      getCommandResult(command).workspaceId
    ) ||
    "—"
  );
}

function getWorker(command: CommandItem): string {
  return toTextOrEmpty(command.worker) || "—";
}

function getRunRecordId(command: CommandItem): string {
  return (
    toTextOrEmpty(command.run_record_id) ||
    toTextOrEmpty(command.linked_run) ||
    firstNonEmpty(
      getCommandInput(command).run_record_id,
      getCommandInput(command).runRecordId,
      getCommandResult(command).run_record_id,
      getCommandResult(command).runRecordId
    ) ||
    "—"
  );
}

function getParentCommandId(command: CommandItem): string {
  return toTextOrEmpty(command.parent_command_id) || "—";
}

function getErrorText(command: CommandItem): string {
  return toTextOrEmpty(command.error) || "—";
}

function getCreatedAt(command: CommandItem): string {
  return toTextOrEmpty((command as Record<string, unknown>).created_at);
}

function getStartedAt(command: CommandItem): string {
  return toTextOrEmpty(command.started_at);
}

function getFinishedAt(command: CommandItem): string {
  return toTextOrEmpty(command.finished_at);
}

function getDurationLabel(command: CommandItem): string {
  const rawDurationMs = (command as Record<string, unknown>).duration_ms;
  const durationMs =
    typeof rawDurationMs === "number" && Number.isFinite(rawDurationMs)
      ? rawDurationMs
      : undefined;

  if (typeof durationMs === "number") {
    if (durationMs < 1000) return `${Math.max(0, Math.round(durationMs))}ms`;
    return `${Math.round(durationMs / 1000)}s`;
  }

  const started = getStartedAt(command);
  const finished = getFinishedAt(command);

  if (started && finished) {
    const startedTs = new Date(started).getTime();
    const finishedTs = new Date(finished).getTime();

    if (Number.isFinite(startedTs) && Number.isFinite(finishedTs)) {
      const diff = Math.max(0, finishedTs - startedTs);
      if (diff < 1000) return `${Math.round(diff)}ms`;
      return `${Math.round(diff / 1000)}s`;
    }
  }

  return "—";
}

function getFlowId(command: CommandItem): string {
  return (
    toTextOrEmpty(command.flow_id) ||
    firstNonEmpty(
      getCommandInput(command).flow_id,
      getCommandInput(command).flowId,
      getCommandResult(command).flow_id,
      getCommandResult(command).flowId
    ) ||
    ""
  );
}

function getRootEventId(command: CommandItem): string {
  return (
    toTextOrEmpty(command.root_event_id) ||
    firstNonEmpty(
      getCommandInput(command).root_event_id,
      getCommandInput(command).rootEventId,
      getCommandResult(command).root_event_id,
      getCommandResult(command).rootEventId
    ) ||
    ""
  );
}

function getSourceEventId(command: CommandItem): string {
  const record = command as Record<string, unknown>;

  return (
    firstNonEmpty(
      record.source_event_id,
      record.Source_Event_ID,
      getCommandInput(command).source_event_id,
      getCommandInput(command).sourceEventId,
      getCommandInput(command).event_id,
      getCommandInput(command).eventId,
      getCommandResult(command).source_event_id,
      getCommandResult(command).sourceEventId,
      getCommandResult(command).event_id,
      getCommandResult(command).eventId
    ) || ""
  );
}

function getEventTarget(command: CommandItem): string {
  return getRootEventId(command) || getSourceEventId(command) || "";
}

function getEventButtonLabel(command: CommandItem): string {
  if (getRootEventId(command)) return "Ouvrir le root event";
  if (getSourceEventId(command)) return "Retour à l’event source";
  return "Ouvrir le root event";
}

function isSyntheticFallbackCommand(command: CommandItem): boolean {
  const result = getCommandResult(command);
  return toTextOrEmpty(result.source) === "synthetic_from_event";
}

function tone(status?: string): string {
  const s = (status || "").toLowerCase();

  if (["done", "processed", "success"].includes(s)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["running"].includes(s)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["retry", "queued", "pending"].includes(s)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["error", "failed", "dead"].includes(s)) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function getLinkedCommandFromEvent(event: EventItem): string {
  const record = event as Record<string, unknown>;

  if (toTextOrEmpty(event.command_id)) return toTextOrEmpty(event.command_id);

  const linked = record.linked_command;
  if (Array.isArray(linked) && linked.length > 0) {
    return toTextOrEmpty(linked[0]);
  }

  const payload = toRecord(event.payload);
  return (
    toTextOrEmpty(payload.command_id) ||
    toTextOrEmpty(payload.commandId) ||
    ""
  );
}

function buildSyntheticCommandFromEvent(
  id: string,
  sourceEvent: EventItem
): CommandItem {
  const eventPayload = toRecord(sourceEvent.payload);

  return {
    id,
    capability:
      toTextOrEmpty(sourceEvent.mapped_capability) ||
      toTextOrEmpty(sourceEvent.event_type) ||
      "unknown_capability",
    status: toTextOrEmpty(sourceEvent.status) || "processed",
    workspace_id:
      toTextOrEmpty(sourceEvent.workspace_id) ||
      toTextOrEmpty(eventPayload.workspace_id) ||
      "",
    flow_id:
      toTextOrEmpty(sourceEvent.flow_id) ||
      toTextOrEmpty(eventPayload.flow_id) ||
      "",
    root_event_id:
      toTextOrEmpty(sourceEvent.root_event_id) ||
      toTextOrEmpty(eventPayload.root_event_id) ||
      "",
    started_at:
      toTextOrEmpty(sourceEvent.processed_at) ||
      toTextOrEmpty(sourceEvent.updated_at) ||
      "",
    finished_at:
      toTextOrEmpty(sourceEvent.processed_at) ||
      toTextOrEmpty(sourceEvent.updated_at) ||
      "",
    result: {
      source: "synthetic_from_event",
      event_id: sourceEvent.id,
      note: "Commande absente de la fenêtre actuelle de /commands.",
    },
    input: {},
  };
}

function getLinkedIncidents(
  command: CommandItem,
  incidents: IncidentItem[]
): IncidentItem[] {
  const commandId = toTextOrEmpty(command.id);
  const flowId = getFlowId(command);
  const rootEventId = getRootEventId(command);
  const sourceEventId = getSourceEventId(command);

  return incidents.filter((incident) => {
    const incidentRecord = incident as Record<string, unknown>;

    const incidentCommandId =
      toTextOrEmpty(incident.command_id) ||
      toTextOrEmpty(incident.linked_command) ||
      toTextOrEmpty(incidentRecord.Command_ID) ||
      "";

    const incidentFlowId =
      toTextOrEmpty(incident.flow_id) ||
      toTextOrEmpty(incidentRecord.Flow_ID) ||
      "";

    const incidentRootEventId =
      toTextOrEmpty(incident.root_event_id) ||
      toTextOrEmpty(incidentRecord.Root_Event_ID) ||
      "";

    if (commandId && incidentCommandId === commandId) return true;
    if (flowId && incidentFlowId === flowId) return true;
    if (rootEventId && incidentRootEventId === rootEventId) return true;
    if (sourceEventId && incidentRootEventId === sourceEventId) return true;

    return false;
  });
}

export default async function CommandDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

  let command: CommandItem | null = null;
  let sourceEvent: EventItem | null = null;
  let incidents: IncidentItem[] = [];

  try {
    command = await fetchCommandById(id);
  } catch {
    command = null;
  }

  try {
    const eventsData = await fetchEvents();
    const events = Array.isArray(eventsData?.events) ? eventsData.events : [];

    sourceEvent =
      events.find((event) => getLinkedCommandFromEvent(event) === id) || null;

    if (!command && sourceEvent) {
      command = buildSyntheticCommandFromEvent(id, sourceEvent);
    }
  } catch {
    sourceEvent = null;
  }

  try {
    const incidentsData = await fetchIncidents();
    incidents = Array.isArray(incidentsData?.incidents)
      ? incidentsData.incidents
      : [];
  } catch {
    incidents = [];
  }

  if (!command) {
    notFound();
  }

  const status = getCommandStatus(command);
  const capability = getCapability(command);
  const flowId = getFlowId(command);
  const rootEventId = getRootEventId(command);
  const sourceEventId = getSourceEventId(command);
  const eventTarget = getEventTarget(command);
  const linkedIncidents = getLinkedIncidents(command, incidents);
  const syntheticFallback = isSyntheticFallbackCommand(command);

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
          / {capability}
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {capability}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${tone(
              status
            )}`}
          >
            {status.toUpperCase()}
          </span>

          {syntheticFallback ? (
            <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-300">
              FALLBACK FROM EVENT
            </span>
          ) : null}

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            COMMAND DETAIL
          </span>
        </div>

        {syntheticFallback ? (
          <p className="mt-4 max-w-3xl text-sm text-amber-300/90 sm:text-base">
            Cette commande n’est pas revenue dans la fenêtre actuelle de
            /commands. La page a été reconstruite automatiquement depuis l’event
            lié pour éviter le 404.
          </p>
        ) : null}
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Created</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(getCreatedAt(command))}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Started</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(getStartedAt(command))}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Finished</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDate(getFinishedAt(command))}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Duration</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {getDurationLabel(command)}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">
          Contexte command
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            Capability: <span className="text-zinc-200">{capability}</span>
          </div>
          <div>
            Status: <span className="text-zinc-200">{status.toUpperCase()}</span>
          </div>
          <div>
            Workspace: <span className="text-zinc-200">{getWorkspace(command)}</span>
          </div>
          <div>
            Worker: <span className="text-zinc-200">{getWorker(command)}</span>
          </div>
          <div>
            Run record:{" "}
            <span className="break-all text-zinc-200">
              {getRunRecordId(command)}
            </span>
          </div>
          <div>
            Parent command:{" "}
            <span className="break-all text-zinc-200">
              {getParentCommandId(command)}
            </span>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            Error: <span className="text-zinc-200">{getErrorText(command)}</span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Liens flow</div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
          <div>
            Flow: <span className="break-all text-zinc-200">{flowId || "—"}</span>
          </div>
          <div>
            Root event:{" "}
            <span className="break-all text-zinc-200">
              {rootEventId || sourceEventId || "—"}
            </span>
          </div>
          <div>
            Command ID:{" "}
            <span className="break-all text-zinc-200">{command.id}</span>
          </div>
          <div>
            Source event:{" "}
            <span className="break-all text-zinc-200">
              {sourceEventId || "—"}
            </span>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Input preview</div>

        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{stringifyPretty(command.input)}
        </pre>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Result preview</div>

        <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{stringifyPretty(command.result)}
        </pre>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Incidents liés</div>

        {linkedIncidents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-5 text-zinc-500">
            Aucun incident lié détecté pour cette commande.
          </div>
        ) : (
          <div className="space-y-3">
            {linkedIncidents.map((incident) => {
              const incidentId = toTextOrEmpty(incident.id);
              const incidentTitle =
                toTextOrEmpty(incident.title) ||
                toTextOrEmpty(incident.name) ||
                "Incident";

              return (
                <Link
                  key={incidentId}
                  href={`/incidents/${encodeURIComponent(incidentId)}`}
                  className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/10"
                >
                  <div className="text-sm font-medium text-white">
                    {incidentTitle}
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">
                    {toText(incident.status || incident.statut_incident, "—")}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="space-y-3">
          <Link href="/commands" className={actionLinkClassName("soft")}>
            Retour à la liste commands
          </Link>

          <Link href="/commands" className={actionLinkClassName("primary")}>
            Voir toutes les commands
          </Link>

          {flowId ? (
            <Link
              href={`/flows/${encodeURIComponent(flowId)}`}
              className={actionLinkClassName("soft")}
            >
              Ouvrir le flow lié
            </Link>
          ) : (
            <span className={actionLinkClassName("soft", true)}>
              Ouvrir le flow lié
            </span>
          )}

          {eventTarget ? (
            <Link
              href={`/events/${encodeURIComponent(eventTarget)}`}
              className={actionLinkClassName("soft")}
            >
              {getEventButtonLabel(command)}
            </Link>
          ) : (
            <span className={actionLinkClassName("soft", true)}>
              Ouvrir le root event
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
