import Link from "next/link";
import { notFound } from "next/navigation";
import FlowGraphClient from "../FlowGraphClient";
import {
  fetchCommands,
  fetchFlowById,
  fetchIncidents,
  type CommandItem,
  type FlowDetail,
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

type TimelineItem = {
  id: string;
  capability: string;
  status: string;
  worker: string;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  stepIndex: number;
  parentCommandId: string;
  flowId: string;
  rootEventId: string;
  sourceEventId: string;
  workspaceId: string;
  inputJson: string;
  resultJson: string;
  isRoot: boolean;
  isTerminal: boolean;
};

function cardClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-5";
}

function softPanelClassName() {
  return "rounded-2xl border border-white/10 bg-white/5 p-4";
}

function emptyStateClassName() {
  return "rounded-2xl border border-dashed border-white/10 bg-white/5 px-5 py-8 text-sm text-zinc-500";
}

function actionLinkClassName(
  variant: "default" | "primary" | "danger" = "default"
) {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex w-full items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/15";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10";
}

function toText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
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

function prettyJson(value: unknown): string {
  if (!value) return "{}";

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function formatDate(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0 || Number.isNaN(ms)) return "—";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function statusTone(status: string | "partial") {
  const normalized = toText(status).toLowerCase();

  if (["success", "done", "completed", "resolved"].includes(normalized)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["running", "in_progress", "processing", "queued"].includes(normalized)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["retry", "retriable"].includes(normalized)) {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["failed", "error", "blocked", "escalated"].includes(normalized)) {
    return "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  }

  if (normalized === "partial") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function stepBadgeTone() {
  return "bg-white/5 text-zinc-300 border border-white/10";
}

function incidentTone(hasIncident: boolean) {
  return hasIncident
    ? "bg-rose-500/15 text-rose-300 border border-rose-500/20"
    : "bg-zinc-800 text-zinc-300 border border-white/10";
}

function incidentLabel(count: number, hasIncident: boolean) {
  if (!hasIncident || count <= 0) return "Aucun incident";
  if (count === 1) return "1 incident";
  return `${count} incidents`;
}

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/i.test(toText(value));
}

function buildDisplayTitle(
  id: string,
  flowId: string,
  rootEventId: string,
  sourceRecordId: string
): string {
  const candidates = [flowId, rootEventId, sourceRecordId, id]
    .map((value) => toText(value))
    .filter(Boolean);

  const readable = candidates.find((value) => !isRecordIdLike(value));
  return readable || candidates[0] || "Flow";
}

function normalizeTimelineItem(record: CommandItem): TimelineItem {
  return {
    id: toText(record.id),
    capability: toText(record.capability, "unknown_capability"),
    status: toText(record.status, "unknown").toLowerCase(),
    worker: toText(record.worker, "—"),
    createdAt: record.created_at,
    startedAt: record.started_at,
    finishedAt: record.finished_at,
    stepIndex: toNumber(record.step_index, 0),
    parentCommandId: toText(record.parent_command_id),
    flowId: toText(record.flow_id),
    rootEventId: toText(record.root_event_id),
    sourceEventId: toText(record.source_event_id),
    workspaceId: toText(record.workspace_id, "production"),
    inputJson: prettyJson(record.input),
    resultJson: prettyJson(record.result),
    isRoot: false,
    isTerminal: false,
  };
}

function sortTimeline(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    if (a.stepIndex !== b.stepIndex) {
      return a.stepIndex - b.stepIndex;
    }

    const aDate = new Date(a.startedAt || a.createdAt || 0).getTime();
    const bDate = new Date(b.startedAt || b.createdAt || 0).getTime();
    return aDate - bDate;
  });
}

function getLastKnownTimestamp(items: TimelineItem[]): number {
  const values = items
    .map((item) =>
      new Date(item.finishedAt || item.startedAt || item.createdAt || 0).getTime()
    )
    .filter((value) => Number.isFinite(value) && value > 0);

  if (values.length === 0) return 0;
  return Math.max(...values);
}

function getDurationMs(items: TimelineItem[]): number {
  if (items.length === 0) return 0;

  const sorted = sortTimeline(items);
  const firstTs = new Date(sorted[0].startedAt || sorted[0].createdAt || 0).getTime();
  const lastTs = new Date(
    sorted[sorted.length - 1].finishedAt ||
      sorted[sorted.length - 1].startedAt ||
      sorted[sorted.length - 1].createdAt ||
      0
  ).getTime();

  if (
    !Number.isFinite(firstTs) ||
    !Number.isFinite(lastTs) ||
    firstTs <= 0 ||
    lastTs <= 0
  ) {
    return 0;
  }

  return Math.max(0, lastTs - firstTs);
}

function isTimelineFailed(status: string) {
  return ["failed", "error", "blocked"].includes(toText(status).toLowerCase());
}

function isTimelineRunning(status: string) {
  return ["running", "queued", "processing"].includes(
    toText(status).toLowerCase()
  );
}

function isTimelineRetry(status: string) {
  return ["retry", "retriable"].includes(toText(status).toLowerCase());
}

function resolveFlowStatus(
  items: TimelineItem[],
  summary?: FlowDetail | null
): string {
  const summaryStats = summary?.stats || {};
  if (toNumber(summaryStats.running, 0) > 0) return "running";
  if (
    toNumber(summaryStats.error, 0) > 0 ||
    toNumber(summaryStats.dead, 0) > 0
  ) {
    return "failed";
  }
  if (toNumber(summaryStats.retry, 0) > 0) return "retry";
  if (toNumber(summaryStats.done, 0) > 0 && items.length === 0) return "completed";

  if (items.some((item) => isTimelineFailed(item.status))) return "failed";
  if (items.some((item) => isTimelineRunning(item.status))) return "running";
  if (items.some((item) => isTimelineRetry(item.status))) return "retry";
  if (items.length > 0 && items.every((item) => item.status === "done")) {
    return "completed";
  }

  return "unknown";
}

function resolveIncidentOnlyStatus(incidents: IncidentItem[]): string {
  if (incidents.length === 0) return "unknown";

  const normalized = incidents.map((incident) => {
    const status = toText(incident.status).toLowerCase();
    const slaStatus = toText(incident.sla_status).toLowerCase();
    const hasResolvedAt = Boolean(toText(incident.resolved_at));

    if (hasResolvedAt) return "resolved";
    if (["resolved", "closed", "done"].includes(status)) return "resolved";
    if (["escalated", "escalade", "escaladé"].includes(status)) return "failed";
    if (["open", "opened", "active", "new"].includes(status)) return "failed";
    if (slaStatus === "breached") return "failed";
    return "unknown";
  });

  if (normalized.includes("failed")) return "failed";
  if (normalized.every((value) => value === "resolved")) return "resolved";
  return "unknown";
}

function buildIncidentsHref(
  flowId: string,
  rootEventId: string,
  sourceRecordId: string
) {
  const params = new URLSearchParams();

  if (flowId) params.set("flow_id", flowId);
  if (rootEventId) params.set("root_event_id", rootEventId);
  if (sourceRecordId) params.set("source_record_id", sourceRecordId);

  params.set("from", "flow_detail");

  const query = params.toString();
  return query ? `/incidents?${query}` : "/incidents";
}

export default async function FlowDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(toText(resolvedParams?.id || ""));

  const [flowSummary, commandsData, incidentsData] = await Promise.all([
    fetchFlowById(id),
    fetchCommands(500).catch(() => ({ commands: [] as CommandItem[] })),
    fetchIncidents(300).catch(() => ({ incidents: [] as IncidentItem[] })),
  ]);

  const commands = Array.isArray(commandsData?.commands)
    ? commandsData.commands
    : [];
  const incidents = Array.isArray(incidentsData?.incidents)
    ? incidentsData.incidents
    : [];

  const summaryCandidates = new Set<string>(
    [
      id,
      toText(flowSummary?.id),
      toText(flowSummary?.flow_id),
      toText(flowSummary?.root_event_id),
      toText(flowSummary?.source_record_id),
      toText(flowSummary?.source_event_id),
    ].filter(Boolean)
  );

  let matchedTimeline = sortTimeline(
    commands
      .map(normalizeTimelineItem)
      .filter((item) => {
        const candidates = [
          item.flowId,
          item.rootEventId,
          item.sourceEventId,
        ].filter(Boolean);

        return candidates.some((candidate) => summaryCandidates.has(candidate));
      })
  );

  if (matchedTimeline.length === 0 && Array.isArray(flowSummary?.commands)) {
    matchedTimeline = sortTimeline(
      flowSummary.commands.map((cmd) => normalizeTimelineItem(cmd))
    );
  }

  matchedTimeline = matchedTimeline.map((item, index, arr) => ({
    ...item,
    isRoot: index === 0,
    isTerminal: index === arr.length - 1,
  }));

  const flowId =
    toText(flowSummary?.flow_id) ||
    toText(matchedTimeline[0]?.flowId) ||
    (!isRecordIdLike(id) ? id : "");

  const rootEventId =
    toText(flowSummary?.root_event_id) ||
    toText(matchedTimeline[0]?.rootEventId) ||
    toText(matchedTimeline[0]?.sourceEventId) ||
    (isRecordIdLike(id) ? id : "");

  const sourceRecordId =
    toText(flowSummary?.source_record_id) ||
    toText(flowSummary?.source_event_id) ||
    toText(matchedTimeline[0]?.sourceEventId);

  const workspaceId =
    toText(flowSummary?.workspace_id) ||
    toText(matchedTimeline[0]?.workspaceId) ||
    "production";

  const incidentCandidates = new Set<string>(
    [id, flowId, rootEventId, sourceRecordId].filter(Boolean)
  );

  const matchedIncidents = incidents.filter((incident) =>
    [
      toText(incident.id),
      toText(incident.flow_id),
      toText(incident.root_event_id),
      toText(incident.source_record_id),
    ]
      .filter(Boolean)
      .some((candidate) => incidentCandidates.has(candidate))
  );

  if (!flowSummary && matchedTimeline.length === 0 && matchedIncidents.length === 0) {
    notFound();
  }

  const readingMode =
    flowSummary?.reading_mode === "registry-only" || matchedTimeline.length === 0
      ? "registry-only"
      : "enriched";

  const hasIncident =
    toBoolean(matchedIncidents.length > 0, false) ||
    toBoolean((flowSummary as FlowDetail | null)?.is_partial, false);

  const incidentCount = matchedIncidents.length;

  const resolvedStatus =
    matchedTimeline.length > 0
      ? resolveFlowStatus(matchedTimeline, flowSummary)
      : resolveIncidentOnlyStatus(matchedIncidents);

  const title = buildDisplayTitle(id, flowId, rootEventId, sourceRecordId);

  const displayedSteps =
    matchedTimeline.length > 0
      ? matchedTimeline.length
      : toNumber(flowSummary?.count, 0);

  const doneCount = matchedTimeline.filter((item) => item.status === "done").length;
  const runningCount = matchedTimeline.filter((item) => isTimelineRunning(item.status)).length;
  const failedCount = matchedTimeline.filter((item) => isTimelineFailed(item.status)).length;

  const graphCommands = matchedTimeline.map((item) => ({
    id: item.id,
    capability: item.capability,
    status: item.status,
    parent_command_id: item.parentCommandId,
    flow_id: item.flowId || flowId || rootEventId || sourceRecordId || id,
  }));

  const incidentsHref = buildIncidentsHref(flowId, rootEventId, sourceRecordId);

  const rootCapability =
    toText(matchedTimeline[0]?.capability) ||
    toText((flowSummary as Record<string, unknown> | null)?.root_capability) ||
    (readingMode === "registry-only" ? "Registre uniquement" : "Non disponible");

  const terminalCapability =
    toText(matchedTimeline[matchedTimeline.length - 1]?.capability) ||
    toText((flowSummary as Record<string, unknown> | null)?.terminal_capability) ||
    (readingMode === "registry-only" ? "Registre uniquement" : "Non disponible");

  const lastActivityTs =
    getLastKnownTimestamp(matchedTimeline) ||
    Math.max(
      toNumber((flowSummary as Record<string, unknown> | null)?.last_activity_ts, 0),
      0
    );

  const durationMs = getDurationMs(matchedTimeline);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4">
        <div className="text-sm text-zinc-400">
          <Link
            href="/flows"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            ← Retour aux flows
          </Link>
        </div>

        <div className="mt-4 text-xs uppercase tracking-[0.2em] text-white/40">
          Flow
        </div>

        <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-zinc-400 sm:text-base">
          Vue détaillée du flow BOSAI.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(
              resolvedStatus
            )}`}
          >
            {toText(resolvedStatus, "unknown").toUpperCase()}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-zinc-300">
            {displayedSteps > 0
              ? `${displayedSteps} étape${displayedSteps > 1 ? "s" : ""}`
              : "Étapes non chargées"}
          </span>

          {readingMode === "registry-only" || flowSummary?.is_partial ? (
            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(
                "partial"
              )}`}
            >
              PARTIAL
            </span>
          ) : null}

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${incidentTone(
              incidentCount > 0
            )}`}
          >
            {incidentLabel(incidentCount, incidentCount > 0)}
          </span>
        </div>

        {incidentCount > 0 ? (
          <div className="mt-4">
            <Link href={incidentsHref} className={actionLinkClassName("danger")}>
              Voir les incidents
            </Link>
          </div>
        ) : null}
      </div>

      {readingMode === "registry-only" ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
          <div className="text-2xl font-semibold text-amber-200">
            Observabilité partielle
          </div>
          <p className="mt-3 text-base leading-7 text-amber-100/85">
            Ce flow est bien présent dans le registre BOSAI, mais aucune commande
            détaillée n’a encore été chargée pour construire la lecture causale complète.
          </p>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Étapes</div>
          <div className="mt-3 text-4xl font-semibold text-white">
            {displayedSteps > 0 ? displayedSteps : "—"}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Terminées</div>
          <div className="mt-3 text-4xl font-semibold text-emerald-300">
            {doneCount}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">En cours / En file</div>
          <div className="mt-3 text-4xl font-semibold text-sky-300">
            {runningCount}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Échecs</div>
          <div className="mt-3 text-4xl font-semibold text-rose-300">
            {failedCount}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Capacité racine</div>
          <div className="mt-3 break-words text-xl font-semibold text-white">
            {rootCapability}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Capacité terminale</div>
          <div className="mt-3 break-words text-xl font-semibold text-white">
            {terminalCapability}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Durée totale</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {formatDuration(durationMs)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Dernière activité</div>
          <div className="mt-3 text-xl font-semibold text-white">
            {lastActivityTs > 0 ? formatDate(lastActivityTs) : "—"}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/40">
          Identité du flow
        </div>

        <div className="grid gap-3 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <span className="text-zinc-500">Flow key :</span> {title}
          </div>
          <div>
            <span className="text-zinc-500">Flow :</span> {flowId || "—"}
          </div>
          <div>
            <span className="text-zinc-500">Root event :</span> {rootEventId || "—"}
          </div>
          <div>
            <span className="text-zinc-500">Source record :</span>{" "}
            {sourceRecordId || "—"}
          </div>
          <div>
            <span className="text-zinc-500">Workspace :</span> {workspaceId}
          </div>
          <div>
            <span className="text-zinc-500">Lecture :</span>{" "}
            {readingMode === "registry-only" ? "Registre uniquement" : "Enrichie"}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/40">
          Graphe d’exécution
        </div>
        <p className="mb-4 text-sm text-zinc-400">
          Touchez un nœud du graphe pour aller directement à l’étape correspondante
          dans la timeline.
        </p>

        {graphCommands.length > 0 ? (
          <FlowGraphClient commands={graphCommands} />
        ) : (
          <div className={emptyStateClassName()}>
            Graphe indisponible pour ce flow pour le moment.
          </div>
        )}
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/40">
          Timeline d’exécution
        </div>

        {matchedTimeline.length === 0 ? (
          <div className={emptyStateClassName()}>
            Aucune étape détaillée disponible pour ce flow.
          </div>
        ) : (
          <div className="space-y-4">
            {matchedTimeline.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-xl font-semibold text-white">
                        {item.capability}
                      </h3>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                          item.status
                        )}`}
                      >
                        {toText(item.status, "unknown").toUpperCase()}
                      </span>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stepBadgeTone()}`}
                      >
                        STEP {item.stepIndex}
                      </span>

                      {item.isRoot ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stepBadgeTone()}`}
                        >
                          ROOT
                        </span>
                      ) : null}

                      {item.isTerminal ? (
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stepBadgeTone()}`}
                        >
                          TERMINAL
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        ID: <span className="break-all text-zinc-200">{item.id || "—"}</span>
                      </div>
                      <div>
                        Parent:{" "}
                        <span className="break-all text-zinc-200">
                          {item.parentCommandId || "—"}
                        </span>
                      </div>
                      <div>
                        Worker: <span className="text-zinc-200">{item.worker || "—"}</span>
                      </div>
                      <div>
                        Démarré:{" "}
                        <span className="text-zinc-200">
                          {formatDate(item.startedAt || item.createdAt)}
                        </span>
                      </div>
                      <div>
                        Terminé:{" "}
                        <span className="text-zinc-200">
                          {formatDate(item.finishedAt)}
                        </span>
                      </div>
                      <div>
                        Flow:{" "}
                        <span className="break-all text-zinc-200">
                          {item.flowId || flowId || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-xl font-semibold text-white">Résumé rapide</div>

          <div className="space-y-3 text-sm text-zinc-300">
            <div className={softPanelClassName()}>
              <div className="text-zinc-400">Incidents</div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${incidentTone(
                    incidentCount > 0
                  )}`}
                >
                  {incidentLabel(incidentCount, incidentCount > 0)}
                </span>
              </div>
            </div>

            <div className={softPanelClassName()}>
              <div className="text-zinc-400">Graphe</div>
              <div className="mt-2 text-zinc-200">
                {graphCommands.length > 0
                  ? "Disponible"
                  : "Indisponible pour ce flow pour le moment."}
              </div>
            </div>

            <div className={softPanelClassName()}>
              <div className="text-zinc-400">Timeline</div>
              <div className="mt-2 text-zinc-200">
                {matchedTimeline.length > 0
                  ? `${matchedTimeline.length} étape${matchedTimeline.length > 1 ? "s" : ""}`
                  : "Aucune étape détaillée disponible."}
              </div>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-xl font-semibold text-white">Navigation</div>

          <div className="flex flex-col gap-3">
            <Link href="/flows" className={actionLinkClassName()}>
              Retour aux flows
            </Link>

            {incidentCount > 0 ? (
              <Link href={incidentsHref} className={actionLinkClassName("danger")}>
                Voir les incidents
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
