import { fetchRuns } from "../../../lib/api";
import { PageHeader } from "../../../components/ui/page-header";

type RunItem = {
  id: string;
  run_id?: string;
  worker?: string;
  capability?: string;
  status?: string;
  priority?: number;
  started_at?: string;
  finished_at?: string;
  dry_run?: boolean | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

  if (typeof value === "string") {
    const text = value.trim();
    return text || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "oui"].includes(normalized)) return true;
    if (["false", "0", "no", "non"].includes(normalized)) return false;
  }

  return undefined;
}

function normalizeRun(value: unknown): RunItem | null {
  if (!isRecord(value)) return null;

  const id =
    toText(value.id) ||
    toText(value.run_id) ||
    toText(value.runId) ||
    toText(value.Run_ID);

  if (!id) return null;

  return {
    id,
    run_id:
      toText(value.run_id) ||
      toText(value.runId) ||
      toText(value.Run_ID) ||
      undefined,
    worker: toText(value.worker) || toText(value.Worker) || undefined,
    capability:
      toText(value.capability) || toText(value.Capability) || undefined,
    status:
      toText(value.status) ||
      toText(value.status_select) ||
      toText(value.Status_select) ||
      undefined,
    priority: toNumber(value.priority) ?? toNumber(value.Priority),
    started_at:
      toText(value.started_at) || toText(value.Started_At) || undefined,
    finished_at:
      toText(value.finished_at) || toText(value.Finished_At) || undefined,
    dry_run: toBoolean(value.dry_run) ?? toBoolean(value.Dry_Run) ?? null,
  };
}

function formatDate(value?: string) {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function formatNumber(value?: number) {
  return typeof value === "number" ? value.toString() : "0";
}

function formatDuration(startedAt?: string, finishedAt?: string) {
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

function normalizeStatus(status?: string) {
  return (status || "").trim().toLowerCase();
}

function tone(status?: string) {
  const s = normalizeStatus(status);

  if (["done", "processed", "success", "completed"].includes(s)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["running", "processing"].includes(s)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["error", "failed", "dead"].includes(s)) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (["unsupported"].includes(s)) {
    return "bg-zinc-700 text-zinc-300 border border-zinc-600";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function signalTone(status?: string) {
  const s = normalizeStatus(status);

  if (["done", "processed", "success", "completed"].includes(s)) {
    return "text-emerald-400";
  }

  if (["running", "processing"].includes(s)) {
    return "text-sky-400";
  }

  if (["error", "failed", "dead"].includes(s)) {
    return "text-red-400";
  }

  if (["unsupported"].includes(s)) {
    return "text-zinc-400";
  }

  return "text-zinc-400";
}

function cardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function sectionLabelClassName() {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

export default async function RunsPage() {
  let data: Awaited<ReturnType<typeof fetchRuns>> | null = null;

  try {
    data = await fetchRuns();
  } catch {
    data = null;
  }

  const rawRuns = Array.isArray(data?.runs) ? data.runs : [];
  const runs: RunItem[] = rawRuns
    .map((item) => normalizeRun(item))
    .filter((item): item is RunItem => item !== null);

  const rawStats = isRecord(data?.stats) ? data.stats : {};

  const totalRuns = typeof data?.count === "number" ? data.count : runs.length;
  const runningCount = toNumber(rawStats.running) ?? 0;
  const doneCount = toNumber(rawStats.done) ?? 0;
  const errorCount = toNumber(rawStats.error) ?? 0;
  const unsupportedCount = toNumber(rawStats.unsupported) ?? 0;
  const otherCount = toNumber(rawStats.other) ?? 0;

  const visibleRuns = [...runs]
    .sort((a, b) => {
      const aTs = new Date(b.finished_at || b.started_at || 0).getTime();
      const bTs = new Date(a.finished_at || a.started_at || 0).getTime();
      return aTs - bTs;
    })
    .slice(0, 50);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Runs"
        description="Historique d’exécution des capacités BOSAI. Cette vue affiche les runs, statuts, workers et signaux d’exécution."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Total runs</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {formatNumber(totalRuns)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Running</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-sky-300">
            {formatNumber(runningCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Done</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-emerald-300">
            {formatNumber(doneCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Error</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-red-300">
            {formatNumber(errorCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Unsupported</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-300">
            {formatNumber(unsupportedCount)}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Other</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {formatNumber(otherCount)}
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className={sectionLabelClassName()}>Execution history</div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
              System runs
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Historique récent des exécutions BOSAI.
            </p>
          </div>

          <div className="text-sm text-zinc-500">
            {visibleRuns.length} visible(s)
          </div>
        </div>

        {visibleRuns.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
            Aucun run visible pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleRuns.map((run) => {
              const duration = formatDuration(run.started_at, run.finished_at);
              const normalizedStatus = normalizeStatus(run.status);

              return (
                <div
                  key={run.id}
                  className="rounded-[24px] border border-white/10 bg-black/20 p-4 md:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className={metaLabelClassName()}>BOSAI Run</div>

                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <div className="break-words text-lg font-semibold tracking-tight text-white">
                              {run.capability || "Unknown capability"}
                            </div>

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                                run.status
                              )}`}
                            >
                              {(run.status || "unknown").toUpperCase()}
                            </span>

                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
                              {run.dry_run ? "DRY RUN" : "LIVE"}
                            </span>
                          </div>
                        </div>

                        <div className="xl:min-w-[140px] xl:text-right">
                          <div className={metaLabelClassName()}>
                            Execution signal
                          </div>
                          <div
                            className={`mt-2 text-sm font-medium ${signalTone(
                              normalizedStatus
                            )}`}
                          >
                            {(run.status || "unknown").toUpperCase()}
                          </div>
                        </div>
                      </div>

                      <div className="break-all text-sm text-zinc-400">
                        ID: <span className="text-zinc-300">{run.id}</span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                        <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                          <div className={metaLabelClassName()}>Run ID</div>
                          <div className="mt-1 break-all text-zinc-200">
                            {run.run_id || "—"}
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                          <div className={metaLabelClassName()}>Worker</div>
                          <div className="mt-1 text-zinc-200">
                            {run.worker || "—"}
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                          <div className={metaLabelClassName()}>Priority</div>
                          <div className="mt-1 text-zinc-200">
                            {run.priority ?? "—"}
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                          <div className={metaLabelClassName()}>Started</div>
                          <div className="mt-1 text-zinc-200">
                            {formatDate(run.started_at)}
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                          <div className={metaLabelClassName()}>Finished</div>
                          <div className="mt-1 text-zinc-200">
                            {formatDate(run.finished_at)}
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                          <div className={metaLabelClassName()}>Duration</div>
                          <div className="mt-1 text-zinc-200">{duration}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
