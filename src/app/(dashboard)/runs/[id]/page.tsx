import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchCommands,
  fetchIncidents,
  fetchRuns,
  type CommandItem,
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

type RunRecord = Record<string, unknown>;

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" | "danger" = "default",
  disabled = false
): string {
  const base =
    "inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/5 text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "danger") {
    return `${base} border border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15`;
  }

  return `${base} border border-white/10 bg-white/5 text-white hover:bg-white/10`;
}

function toText(value: unknown, fallback = ""): string {
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

function toNumber(value: unknown, fallback = Number.NaN): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
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

function firstDefined(record: RunRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return undefined;
}

function parseMaybeJson(value: unknown): Record<string, unknown> {
  if (!value) return {};

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
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

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/i.test(value.trim());
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

function formatDuration(startedAt?: string, finishedAt?: string): string {
  if (!startedAt || !finishedAt) return "—";

  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return "—";
  }

  const totalSeconds = Math.floor((end - start) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function tone(status?: string): string {
  const normalized = (status || "").trim().toLowerCase();

  if (["done", "success", "completed", "processed", "resolved"].includes(normalized)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["running", "processing"].includes(normalized)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["queued", "pending", "new"].includes(normalized)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["unsupported"].includes(normalized)) {
    return "bg-zinc-700 text-zinc-300 border border-zinc-600";
  }

  if (["error", "failed", "dead", "blocked"].includes(normalized)) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

/* ------------------------------ Run helpers ------------------------------ */

function getRunId(run: RunRecord): string {
  return toText(firstDefined(run, ["id", "ID", "record_id", "Record_ID"]));
}

function getRunRunId(run: RunRecord): string {
  return toText(firstDefined(run, ["run_id", "Run_ID"]));
}

function getRunCapability(run: RunRecord): string {
  return toText(
    firstDefined(run, ["capability", "Capability", "name", "Name"]),
    "Unknown capability"
  );
}

function getRunStatus(run: RunRecord): string {
  return toText(
    firstDefined(run, ["status", "Status", "status_select", "Status_select"]),
    "unknown"
  );
}

function getRunWorker(run: RunRecord): string {
  return toText(firstDefined(run, ["worker", "Worker"]), "—");
}

function getRunPriority(run: RunRecord): string {
  const raw = firstDefined(run, ["priority", "Priority"]);
  if (raw === undefined || raw === null || raw === "") return "—";
  return String(raw);
}

function getRunDryRun(run: RunRecord): boolean {
  return toBoolean(firstDefined(run, ["dry_run", "Dry_Run"]), false);
}

function getRunStartedAt(run: RunRecord): string {
  return toText(firstDefined(run, ["started_at", "Started_At"]));
}

function getRunFinishedAt(run: RunRecord): string {
  return toText(firstDefined(run, ["finished_at", "Finished_At"]));
}

function getRunCreatedAt(run: RunRecord): string {
  return toText(
    firstDefined(run, ["created_at", "Created_At"]) || getRunStartedAt(run)
  );
}

function getRunAppName(run: RunRecord): string {
  return toText(firstDefined(run, ["app_name", "App_Name"]), "—");
}

function getRunAppVersion(run: RunRecord): string {
  return toText(firstDefined(run, ["app_version", "App_Version"]), "—");
}

function getRunIdempotencyKey(run: RunRecord): string {
  return toText(
    firstDefined(run, ["idempotency_key", "Idempotency_Key"]),
    "—"
  );
}

function getRunInputRaw(run: RunRecord): unknown {
  return firstDefined(run, [
    "input_json",
    "Input_JSON",
    "input",
    "Input",
    "payload",
    "Payload",
  ]);
}

function getRunResultRaw(run: RunRecord): unknown {
  return firstDefined(run, [
    "result_json",
    "Result_JSON",
    "result",
    "Result",
  ]);
}

function getRunInputRecord(run: RunRecord): Record<string, unknown> {
  return parseMaybeJson(getRunInputRaw(run));
}

function getRunResultRecord(run: RunRecord): Record<string, unknown> {
  return parseMaybeJson(getRunResultRaw(run));
}

function getRunWorkspace(run: RunRecord): string {
  const input = getRunInputRecord(run);
  const result = getRunResultRecord(run);

  return (
    toText(firstDefined(run, ["workspace_id", "Workspace_ID"])) ||
    toText(input.workspace_id) ||
    toText(input.workspaceId) ||
    toText(result.workspace_id) ||
    toText(result.workspaceId) ||
    "—"
  );
}

function getRunFlowId(run: RunRecord): string {
  const input = getRunInputRecord(run);
  const result = getRunResultRecord(run);

  return (
    toText(input.flow_id) ||
    toText(input.flowId) ||
    toText(result.flow_id) ||
    toText(result.flowId) ||
    ""
  );
}

function getRunRootEventId(run: RunRecord): string {
  const input = getRunInputRecord(run);
  const result = getRunResultRecord(run);

  return (
    toText(input.root_event_id) ||
    toText(input.rootEventId) ||
    toText(result.root_event_id) ||
    toText(result.rootEventId) ||
    ""
  );
}

function getRunSourceEventId(run: RunRecord): string {
  const input = getRunInputRecord(run);
  const result = getRunResultRecord(run);

  return (
    toText(input.source_event_id) ||
    toText(input.sourceEventId) ||
    toText(input.event_id) ||
    toText(input.eventId) ||
    toText(result.source_event_id) ||
    toText(result.sourceEventId) ||
    toText(result.event_id) ||
    toText(result.eventId) ||
    ""
  );
}

/* --------------------------- Related entities ---------------------------- */

function commandMatchesRun(command: CommandItem, identifiers: string[]): boolean {
  const input = parseMaybeJson(command.input);
  const result = parseMaybeJson(command.result);

  const candidates = uniq([
    toText(command.run_record_id),
    toText(command.linked_run),
    toText(input.run_record_id),
    toText(input.runRecordId),
    toText(input.linked_run),
    toText(input.run_id),
    toText(input.runId),
    toText(result.run_record_id),
    toText(result.runRecordId),
    toText(result.linked_run),
    toText(result.run_id),
    toText(result.runId),
  ]);

  return candidates.some((candidate) => identifiers.includes(candidate));
}

function incidentMatchesRun(incident: IncidentItem, identifiers: string[]): boolean {
  const candidates = uniq([
    toText(incident.run_record_id),
    toText(incident.linked_run),
    toText(incident.run_id),
  ]);

  return candidates.some((candidate) => identifiers.includes(candidate));
}

function buildFlowHref(
  run: RunRecord,
  relatedCommands: CommandItem[]
): string {
  const commandFlow =
    toText(relatedCommands[0]?.flow_id) ||
    toText(parseMaybeJson(relatedCommands[0]?.input).flow_id) ||
    toText(parseMaybeJson(relatedCommands[0]?.input).flowId) ||
    toText(parseMaybeJson(relatedCommands[0]?.result).flow_id) ||
    toText(parseMaybeJson(relatedCommands[0]?.result).flowId);

  const runFlow = getRunFlowId(run);

  const target = commandFlow || runFlow;
  if (!target) return "";

  return `/flows/${encodeURIComponent(target)}`;
}

function buildEventHref(
  run: RunRecord,
  relatedCommands: CommandItem[]
): string {
  const commandEvent =
    toText(relatedCommands[0]?.root_event_id) ||
    toText(relatedCommands[0]?.source_event_id) ||
    toText(parseMaybeJson(relatedCommands[0]?.input).root_event_id) ||
    toText(parseMaybeJson(relatedCommands[0]?.input).rootEventId) ||
    toText(parseMaybeJson(relatedCommands[0]?.input).source_event_id) ||
    toText(parseMaybeJson(relatedCommands[0]?.input).sourceEventId);

  const runEvent =
    getRunRootEventId(run) || getRunSourceEventId(run);

  const target = commandEvent || runEvent;
  if (!target || !isRecordIdLike(target)) return "";

  return `/events/${encodeURIComponent(target)}`;
}

/* ----------------------------------------------------------------------- */

export default async function RunDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

  let data = null;

  try {
    data = await fetchRuns();
  } catch {
    data = null;
  }

  const runs = Array.isArray(data?.runs) ? data.runs : [];
  const run =
    runs.find((item) => getRunId(item as RunRecord) === id) ||
    runs.find((item) => getRunRunId(item as RunRecord) === id) ||
    null;

  if (!run || typeof run !== "object" || Array.isArray(run)) {
    notFound();
  }

  const runRecord = run as RunRecord;

  const runId = getRunId(runRecord);
  const publicRunId = getRunRunId(runRecord);
  const capability = getRunCapability(runRecord);
  const status = getRunStatus(runRecord);
  const worker = getRunWorker(runRecord);
  const priority = getRunPriority(runRecord);
  const startedAt = getRunStartedAt(runRecord);
  const finishedAt = getRunFinishedAt(runRecord);
  const createdAt = getRunCreatedAt(runRecord);
  const duration = formatDuration(startedAt, finishedAt);
  const dryRun = getRunDryRun(runRecord);
  const workspace = getRunWorkspace(runRecord);
  const appName = getRunAppName(runRecord);
  const appVersion = getRunAppVersion(runRecord);
  const idempotencyKey = getRunIdempotencyKey(runRecord);
  const inputPretty = stringifyPretty(getRunInputRaw(runRecord) ?? {});
  const resultPretty = stringifyPretty(getRunResultRaw(runRecord) ?? {});

  const identifiers = uniq([runId, publicRunId]);

  let relatedCommands: CommandItem[] = [];
  try {
    const commandsData = await fetchCommands(300);
    const commands = Array.isArray(commandsData?.commands)
      ? commandsData.commands
      : [];

    relatedCommands = commands.filter((command) =>
      commandMatchesRun(command, identifiers)
    );
  } catch {
    relatedCommands = [];
  }

  let relatedIncidents: IncidentItem[] = [];
  try {
    const incidentsData = await fetchIncidents(300);
    const incidents = Array.isArray(incidentsData?.incidents)
      ? incidentsData.incidents
      : [];

    relatedIncidents = incidents.filter((incident) =>
      incidentMatchesRun(incident, identifiers)
    );
  } catch {
    relatedIncidents = [];
  }

  const flowHref = buildFlowHref(runRecord, relatedCommands);
  const eventHref = buildEventHref(runRecord, relatedCommands);
  const firstCommandId = toText(relatedCommands[0]?.id);
  const firstIncidentId = toText(relatedIncidents[0]?.id);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm text-zinc-400">
          <Link
            href="/runs"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            Runs
          </Link>{" "}
          / {capability}
        </div>

        <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-white sm:text-4xl">
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

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            RUN DETAIL
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            {dryRun ? "DRY RUN" : "LIVE"}
          </span>
        </div>
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
          <div className="mt-3 text-xl font-semibold text-white">{duration}</div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Run identity</div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            Record ID: <span className="break-all text-zinc-200">{runId || "—"}</span>
          </div>
          <div>
            Run ID:{" "}
            <span className="break-all text-zinc-200">{publicRunId || "—"}</span>
          </div>
          <div>
            Capability: <span className="text-zinc-200">{capability}</span>
          </div>
          <div>
            Status: <span className="text-zinc-200">{status}</span>
          </div>
          <div>
            Worker: <span className="text-zinc-200">{worker}</span>
          </div>
          <div>
            Priority: <span className="text-zinc-200">{priority}</span>
          </div>
          <div>
            Workspace: <span className="text-zinc-200">{workspace}</span>
          </div>
          <div>
            App: <span className="text-zinc-200">{appName}</span>
          </div>
          <div>
            Version: <span className="text-zinc-200">{appVersion}</span>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            Idempotency key:{" "}
            <span className="break-all text-zinc-200">
              {idempotencyKey || "—"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Related commands</div>

          {relatedCommands.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
              Aucune command liée détectée pour ce run.
            </div>
          ) : (
            <div className="space-y-3">
              {relatedCommands.slice(0, 5).map((command) => {
                const commandStatus = toText(command.status, "unknown");
                const commandCapability =
                  toText(command.capability) ||
                  toText(parseMaybeJson(command.input).capability) ||
                  toText(parseMaybeJson(command.result).capability) ||
                  "command";

                return (
                  <Link
                    key={String(command.id)}
                    href={`/commands/${encodeURIComponent(String(command.id))}`}
                    className="block rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 transition hover:border-white/15 hover:bg-white/[0.04]"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="break-words text-lg font-semibold text-white">
                          {commandCapability}
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                            commandStatus
                          )}`}
                        >
                          {commandStatus.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-sm text-zinc-400">
                        ID:{" "}
                        <span className="break-all text-zinc-200">
                          {String(command.id)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Related incidents</div>

          {relatedIncidents.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
              Aucun incident lié détecté pour ce run.
            </div>
          ) : (
            <div className="space-y-3">
              {relatedIncidents.slice(0, 5).map((incident) => {
                const incidentTitle =
                  toText(incident.title) ||
                  toText(incident.name) ||
                  toText(incident.error_id) ||
                  "Incident";

                const incidentStatus =
                  toText(incident.status) ||
                  toText(incident.statut_incident) ||
                  "unknown";

                return (
                  <Link
                    key={String(incident.id)}
                    href={`/incidents/${encodeURIComponent(String(incident.id))}`}
                    className="block rounded-[24px] border border-white/10 bg-black/20 px-4 py-4 transition hover:border-white/15 hover:bg-white/[0.04]"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="break-words text-lg font-semibold text-white">
                          {incidentTitle}
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                            incidentStatus
                          )}`}
                        >
                          {incidentStatus.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-sm text-zinc-400">
                        ID:{" "}
                        <span className="break-all text-zinc-200">
                          {String(incident.id)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Input preview</div>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{inputPretty}
          </pre>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Result preview</div>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{resultPretty}
          </pre>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="space-y-3">
          <Link href="/runs" className={actionLinkClassName("soft")}>
            Retour à la liste runs
          </Link>

          <Link href="/runs" className={actionLinkClassName("primary")}>
            Voir tous les runs
          </Link>

          {flowHref ? (
            <Link href={flowHref} className={actionLinkClassName("soft")}>
              Ouvrir le flow lié
            </Link>
          ) : (
            <span className={actionLinkClassName("soft", true)}>
              Ouvrir le flow lié
            </span>
          )}

          {eventHref ? (
            <Link href={eventHref} className={actionLinkClassName("soft")}>
              Ouvrir l’event lié
            </Link>
          ) : (
            <span className={actionLinkClassName("soft", true)}>
              Ouvrir l’event lié
            </span>
          )}

          {firstCommandId ? (
            <Link
              href={`/commands/${encodeURIComponent(firstCommandId)}`}
              className={actionLinkClassName("soft")}
            >
              Ouvrir la command liée
            </Link>
          ) : (
            <span className={actionLinkClassName("soft", true)}>
              Ouvrir la command liée
            </span>
          )}

          {firstIncidentId ? (
            <Link
              href={`/incidents/${encodeURIComponent(firstIncidentId)}`}
              className={actionLinkClassName("danger")}
            >
              Ouvrir l’incident lié
            </Link>
          ) : (
            <span className={actionLinkClassName("danger", true)}>
              Ouvrir l’incident lié
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
