import Link from "next/link";
import { fetchRuns } from "../../../lib/api";
import { PageHeader } from "../../../components/ui/page-header";

type RunRecord = Record<string, unknown>;

type RunStats = {
  running?: number;
  done?: number;
  error?: number;
  unsupported?: number;
  other?: number;
};

function firstDefined(record: RunRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return undefined;
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

function formatDate(value?: string): string {
  if (!value) return "—";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function formatNumber(value?: number): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
    : "0";
}

function formatDuration(
  startedAt?: string,
  finishedAt?: string,
  updatedAt?: string
): string {
  if (!startedAt) return "—";

  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt || updatedAt || startedAt).getTime();

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
  const s = (status || "").toLowerCase();

  if (s === "done") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (s === "running") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (s === "error") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  if (s === "unsupported") {
    return "bg-zinc-700 text-zinc-300 border border-zinc-600";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function signalTone(status?: string): string {
  const s = (status || "").toLowerCase();

  if (s === "done") return "text-emerald-400";
  if (s === "running") return "text-sky-400";
  if (s === "error") return "text-red-400";
  if (s === "unsupported") return "text-zinc-400";

  return "text-zinc-400";
}

function getRunId(run: RunRecord): string {
  return toText(firstDefined(run, ["id", "ID", "record_id", "Record_ID"]), "");
}

function getRunPublicId(run: RunRecord): string {
  return toText(firstDefined(run, ["run_id", "Run_ID"]), "");
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

function getRunStartedAt(run: RunRecord): string {
  return toText(firstDefined(run, ["started_at", "Started_At"]), "");
}

function getRunFinishedAt(run: RunRecord): string {
  return toText(firstDefined(run, ["finished_at", "Finished_At"]), "");
}

function getRunUpdatedAt(run: RunRecord): string {
  return toText(firstDefined(run, ["updated_at", "Updated_At"]), "");
}

function getRunCreatedAt(run: RunRecord): string {
  return toText(firstDefined(run, ["created_at", "Created_At"]), "");
}

function getRunRunId(run: RunRecord): string {
  return toText(firstDefined(run, ["run_id", "Run_ID"]), "—");
}

function getRunDryRun(run: RunRecord): boolean {
  return toBoolean(firstDefined(run, ["dry_run", "Dry_Run"]), false);
}

function getRunLatestTs(run: RunRecord): number {
  const finished = new Date(getRunFinishedAt(run) || 0).getTime();
  const updated = new Date(getRunUpdatedAt(run) || 0).getTime();
  const started = new Date(getRunStartedAt(run) || 0).getTime();
  const created = new Date(getRunCreatedAt(run) || 0).getTime();

  return Math.max(
    Number.isFinite(finished) ? finished : 0,
    Number.isFinite(updated) ? updated : 0,
    Number.isFinite(started) ? started : 0,
    Number.isFinite(created) ? created : 0
  );
}

function getRunHref(run: RunRecord): string {
  const id = getRunId(run);
  if (id) return `/runs/${encodeURIComponent(id)}`;

  const publicId = getRunPublicId(run);
  if (publicId) return `/runs/${encodeURIComponent(publicId)}`;

  return "";
}

export default async function RunsPage() {
  let data: Awaited<ReturnType<typeof fetchRuns>> | null = null;

  try {
    data = await fetchRuns();
  } catch {
    data = null;
  }

  const runs: RunRecord[] = Array.isArray(data?.runs) ? data.runs : [];
  const stats = ((data?.stats ?? {}) as RunStats) || {};

  const totalRuns = data?.count ?? runs.length ?? 0;
  const runningCount = stats.running ?? 0;
  const doneCount = stats.done ?? 0;
  const errorCount = stats.error ?? 0;
  const unsupportedCount = stats.unsupported ?? 0;
  const otherCount = stats.other ?? 0;

  const visibleRuns = [...runs]
    .sort((a, b) => getRunLatestTs(b) - getRunLatestTs(a))
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
              const id = getRunId(run);
              const publicId = getRunPublicId(run);
              const capability = getRunCapability(run);
              const status = getRunStatus(run);
              const dryRun = getRunDryRun(run);
              const startedAt = getRunStartedAt(run);
              const finishedAt = getRunFinishedAt(run);
              const updatedAt = getRunUpdatedAt(run);
              const duration = formatDuration(startedAt, finishedAt, updatedAt);
              const href = getRunHref(run);

              const content = (
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className={metaLabelClassName()}>BOSAI Run</div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <div className="break-words text-lg font-semibold tracking-tight text-white">
                            {capability}
                          </div>

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                              status
                            )}`}
                          >
                            {status.toUpperCase()}
                          </span>

                          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
                            {dryRun ? "DRY RUN" : "LIVE"}
                          </span>
                        </div>
                      </div>

                      <div className="xl:min-w-[140px] xl:text-right">
                        <div className={metaLabelClassName()}>
                          Execution signal
                        </div>
                        <div
                          className={`mt-2 text-sm font-medium ${signalTone(
                            status
                          )}`}
                        >
                          {status.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div className="break-all text-sm text-zinc-400">
                      ID:{" "}
                      <span className="text-zinc-300">
                        {id || publicId || "—"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                      <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                        <div className={metaLabelClassName()}>Run ID</div>
                        <div className="mt-1 break-all text-zinc-200">
                          {getRunRunId(run)}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                        <div className={metaLabelClassName()}>Worker</div>
                        <div className="mt-1 text-zinc-200">
                          {getRunWorker(run)}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                        <div className={metaLabelClassName()}>Priority</div>
                        <div className="mt-1 text-zinc-200">
                          {getRunPriority(run)}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                        <div className={metaLabelClassName()}>Started</div>
                        <div className="mt-1 text-zinc-200">
                          {formatDate(startedAt)}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                        <div className={metaLabelClassName()}>Finished</div>
                        <div className="mt-1 text-zinc-200">
                          {formatDate(finishedAt)}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-white/[0.02] px-3 py-3">
                        <div className={metaLabelClassName()}>Duration</div>
                        <div className="mt-1 text-zinc-200">{duration}</div>
                      </div>
                    </div>

                    {href ? (
                      <div className="pt-1 text-sm font-medium text-zinc-300">
                        Ouvrir le détail →
                      </div>
                    ) : (
                      <div className="pt-1 text-sm font-medium text-zinc-500">
                        Détail indisponible
                      </div>
                    )}
                  </div>
                </div>
              );

              if (!href) {
                return (
                  <div
                    key={id || publicId || `${capability}-${startedAt}`}
                    className="block rounded-[24px] border border-white/10 bg-black/20 p-4 md:p-5"
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={id || publicId || `${capability}-${startedAt}`}
                  href={href}
                  className="block rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:border-white/15 hover:bg-white/[0.04] md:p-5"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
