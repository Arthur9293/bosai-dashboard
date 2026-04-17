import Link from "next/link";
import { cookies } from "next/headers";
import { fetchRuns } from "@/lib/api";
import {
  ControlPlaneShell,
  EmptyStatePanel,
  SectionCard,
  SectionCountPill,
  SidePanelCard,
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

type RunRecord = Record<string, unknown>;
type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

type FlexibleRunsResponse = {
  count?: number;
  runs?: RunRecord[];
  stats?: Record<string, number | undefined>;
};

type RunStatusGroup = "running" | "done" | "error" | "unsupported" | "other";

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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function formatDate(value?: string): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
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

function sectionFrameClassName(
  tone: "default" | "attention" | "neutral" = "default"
): string {
  if (tone === "attention") {
    return "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(245,158,11,0.08),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
  }

  if (tone === "neutral") {
    return "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(14,165,233,0.06),transparent_46%),linear-gradient(180deg,rgba(7,18,43,0.68)_0%,rgba(3,8,22,0.54)_100%)]";
  }

  return "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(14,165,233,0.08),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
}

function asidePanelClassName(): string {
  return "bg-[radial-gradient(100%_120%_at_100%_0%,rgba(14,165,233,0.08),transparent_52%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
}

function cardClassName(): string {
  return [
    "rounded-[28px] border border-white/10 p-5 md:p-6",
    "bg-[linear-gradient(180deg,rgba(8,20,48,0.76)_0%,rgba(3,8,22,0.56)_100%)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition",
    "hover:border-white/15 hover:bg-[linear-gradient(180deg,rgba(9,22,53,0.8)_0%,rgba(4,10,26,0.60)_100%)]",
  ].join(" ");
}

function statCardClassName(): string {
  return [
    "rounded-[28px] border border-white/10 p-5 md:p-6",
    "bg-[linear-gradient(180deg,rgba(8,20,48,0.72)_0%,rgba(3,9,24,0.54)_100%)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  ].join(" ");
}

function metaBoxClassName(): string {
  return "min-w-0 rounded-[18px] border border-white/10 bg-black/20 px-3 py-3";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-white/35";
}

function actionLinkClassName(
  variant: "default" | "primary" | "danger" | "soft" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex w-full items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/12 px-4 py-2.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/18";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function getRunId(run: RunRecord): string {
  return toText(firstDefined(run, ["id", "ID", "record_id", "Record_ID"]), "");
}

function getRunPublicId(run: RunRecord): string {
  return toText(
    firstDefined(run, ["run_id", "Run_ID", "runId", "RunId"]),
    ""
  );
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

function getRunStatusGroup(run: RunRecord): RunStatusGroup {
  const status = getRunStatus(run).trim().toLowerCase();

  if (["running", "processing"].includes(status)) return "running";
  if (["done", "success", "completed", "processed"].includes(status)) return "done";
  if (["error", "failed", "dead", "blocked"].includes(status)) return "error";
  if (["unsupported"].includes(status)) return "unsupported";

  return "other";
}

function getRunWorker(run: RunRecord): string {
  return toText(firstDefined(run, ["worker", "Worker"]), "—");
}

function getRunPriority(run: RunRecord): string {
  const raw = firstDefined(run, ["priority", "Priority", "priority_score"]);
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
  return toText(
    firstDefined(run, ["run_id", "Run_ID", "runId", "RunId"]),
    "—"
  );
}

function getRunDryRun(run: RunRecord): boolean {
  return toBoolean(firstDefined(run, ["dry_run", "Dry_Run", "dryRun"]), false);
}

function getRunWorkspaceId(run: RunRecord): string {
  return toText(
    firstDefined(run, [
      "workspace_id",
      "Workspace_ID",
      "workspaceId",
      "workspace",
      "Workspace",
    ]),
    ""
  );
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

function getRunHref(run: RunRecord, activeWorkspaceId?: string): string {
  const id = getRunId(run);
  if (id) {
    return appendWorkspaceIdToHref(
      `/runs/${encodeURIComponent(id)}`,
      activeWorkspaceId || getRunWorkspaceId(run)
    );
  }

  const publicId = getRunPublicId(run);
  if (publicId) {
    return appendWorkspaceIdToHref(
      `/runs/${encodeURIComponent(publicId)}`,
      activeWorkspaceId || getRunWorkspaceId(run)
    );
  }

  return "";
}

function statusBadgeKind(status?: string): DashboardStatusKind {
  const s = (status || "").trim().toLowerCase();

  if (["done", "success", "completed", "processed"].includes(s)) {
    return "success";
  }

  if (["running", "processing"].includes(s)) {
    return "running";
  }

  if (["queued", "pending", "new"].includes(s)) {
    return "queued";
  }

  if (["retry", "retriable"].includes(s)) {
    return "retry";
  }

  if (["error", "failed", "dead", "blocked"].includes(s)) {
    return "failed";
  }

  return "unknown";
}

function getStatusTextTone(status?: string): string {
  const group = (status || "").trim().toLowerCase();

  if (["done", "success", "completed", "processed"].includes(group)) {
    return "text-emerald-300";
  }

  if (["running", "processing"].includes(group)) {
    return "text-sky-300";
  }

  if (["error", "failed", "dead", "blocked"].includes(group)) {
    return "text-rose-300";
  }

  return "text-zinc-300";
}

function buildStats(runs: RunRecord[]) {
  const stats = {
    running: 0,
    done: 0,
    error: 0,
    unsupported: 0,
    other: 0,
  };

  for (const run of runs) {
    const group = getRunStatusGroup(run);
    stats[group] += 1;
  }

  return stats;
}

function RunListCard({
  run,
  activeWorkspaceId,
}: {
  run: RunRecord;
  activeWorkspaceId: string;
}) {
  const id = getRunId(run);
  const publicId = getRunPublicId(run);
  const capability = getRunCapability(run);
  const status = getRunStatus(run);
  const dryRun = getRunDryRun(run);
  const startedAt = getRunStartedAt(run);
  const finishedAt = getRunFinishedAt(run);
  const updatedAt = getRunUpdatedAt(run);
  const duration = formatDuration(startedAt, finishedAt, updatedAt);
  const href = getRunHref(run, activeWorkspaceId);
  const workspaceId = getRunWorkspaceId(run) || activeWorkspaceId || "production";

  const content = (
    <article className={cardClassName()}>
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <DashboardStatusBadge
              kind={statusBadgeKind(status)}
              label={status.toUpperCase()}
            />

            <DashboardStatusBadge
              kind={dryRun ? "retry" : "success"}
              label={dryRun ? "DRY RUN" : "LIVE"}
            />
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
              BOSAI Run
            </div>

            <h3 className="mt-2 break-words text-2xl font-semibold leading-tight tracking-tight text-white md:text-xl xl:text-2xl">
              {capability}
            </h3>

            <p className={`mt-3 text-sm font-medium ${getStatusTextTone(status)}`}>
              {status.toUpperCase()}
            </p>
          </div>

          <div className="break-all text-sm leading-6 text-zinc-400">
            ID :{" "}
            <span className="text-zinc-200">{id || publicId || "—"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Run ID</div>
            <div className="mt-1 break-all text-zinc-200">
              {getRunRunId(run)}
            </div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Worker</div>
            <div className="mt-1 text-zinc-200">{getRunWorker(run)}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Priority</div>
            <div className="mt-1 text-zinc-200">{getRunPriority(run)}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Started</div>
            <div className="mt-1 text-zinc-200">{formatDate(startedAt)}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Finished</div>
            <div className="mt-1 text-zinc-200">{formatDate(finishedAt)}</div>
          </div>

          <div className={metaBoxClassName()}>
            <div className={metaLabelClassName()}>Duration</div>
            <div className="mt-1 text-zinc-200">{duration}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-500">
            Workspace : <span className="text-zinc-300">{workspaceId}</span>
          </div>

          <div className="text-sm font-medium text-zinc-300">
            {href ? "Ouvrir le détail →" : "Détail indisponible"}
          </div>
        </div>
      </div>
    </article>
  );

  if (!href) {
    return <div>{content}</div>;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

export default async function RunsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = (await Promise.resolve(
    searchParams ?? {}
  )) as SearchParams;

  const cookieStore = await cookies();

  const workspace = resolveWorkspaceContext({
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

  const activeWorkspaceId = workspace.activeWorkspaceId || "";

  let data: FlexibleRunsResponse | null = null;

  try {
    const fetchRunsFlexible = fetchRuns as unknown as (
      arg?: unknown
    ) => Promise<FlexibleRunsResponse>;

    data = await fetchRunsFlexible({
      workspaceId: activeWorkspaceId || undefined,
    });
  } catch {
    data = null;
  }

  const runsUnfiltered: RunRecord[] = Array.isArray(data?.runs) ? data.runs : [];

  const runs = runsUnfiltered.filter((run) =>
    workspaceMatchesOrUnscoped(getRunWorkspaceId(run), activeWorkspaceId)
  );

  const stats = buildStats(runs);
  const totalRuns = runs.length;
  const visibleRuns = [...runs]
    .sort((a, b) => getRunLatestTs(b) - getRunLatestTs(a))
    .slice(0, 50);

  const latestRun = visibleRuns[0] ?? null;
  const workspaceLabel = activeWorkspaceId || "production";

  return (
    <ControlPlaneShell
      eyebrow="Operations"
      title="Runs"
      description="Historique d’exécution des capacités BOSAI. Cette vue affiche les runs, statuts, workers et signaux d’exécution."
      badges={[
        { label: "Workspace scoped", tone: "info" },
        { label: "Execution history", tone: "muted" },
        { label: "Mobile préservé", tone: "muted" },
      ]}
      metrics={[
        { label: "Total runs", value: totalRuns, toneClass: "text-white" },
        { label: "Running", value: stats.running, toneClass: "text-sky-300" },
        { label: "Done", value: stats.done, toneClass: "text-emerald-300" },
        { label: "Error", value: stats.error, toneClass: "text-rose-300" },
      ]}
      actions={
        <>
          <Link
            href={appendWorkspaceIdToHref("/flows", activeWorkspaceId)}
            className={actionLinkClassName("soft")}
          >
            Ouvrir Flows
          </Link>

          <Link
            href={appendWorkspaceIdToHref("/incidents", activeWorkspaceId)}
            className={actionLinkClassName("danger")}
          >
            Voir Incidents
          </Link>

          <Link
            href={appendWorkspaceIdToHref("/commands", activeWorkspaceId)}
            className={actionLinkClassName("primary")}
          >
            Voir Commands
          </Link>
        </>
      }
      aside={
        <div className="xl:sticky xl:top-6 xl:space-y-6">
          <SidePanelCard
            title="Lecture opérationnelle"
            className={asidePanelClassName()}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <DashboardStatusBadge kind="success" label="DONE" />
                <DashboardStatusBadge kind="running" label="RUNNING" />
                <DashboardStatusBadge kind="failed" label="ERROR" />
              </div>

              <div className="space-y-2 text-sm leading-6 text-white/65">
                <p>
                  <span className="text-white/90">Runs</span> montre l’historique
                  récent des exécutions du worker BOSAI.
                </p>
                <p>
                  <span className="text-white/90">Workspace</span> limite la lecture
                  au périmètre actif sans casser l’ancien comportement.
                </p>
              </div>
            </div>
          </SidePanelCard>

          <SidePanelCard title="Dernier run" className={asidePanelClassName()}>
            {latestRun ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Capability
                  </div>
                  <div className="mt-2 break-words text-sm font-medium leading-6 text-white">
                    {getRunCapability(latestRun)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <DashboardStatusBadge
                    kind={statusBadgeKind(getRunStatus(latestRun))}
                    label={getRunStatus(latestRun).toUpperCase()}
                  />
                  <DashboardStatusBadge
                    kind={getRunDryRun(latestRun) ? "retry" : "success"}
                    label={getRunDryRun(latestRun) ? "DRY RUN" : "LIVE"}
                  />
                </div>

                <div className="space-y-2 text-sm leading-6 text-white/65">
                  <div>
                    Workspace :{" "}
                    <span className="text-white/90">{workspaceLabel}</span>
                  </div>
                  <div>
                    Worker :{" "}
                    <span className="text-white/90">
                      {getRunWorker(latestRun)}
                    </span>
                  </div>
                  <div>
                    Started :{" "}
                    <span className="text-white/90">
                      {formatDate(getRunStartedAt(latestRun))}
                    </span>
                  </div>
                </div>

                <Link
                  href={getRunHref(latestRun, activeWorkspaceId)}
                  className={actionLinkClassName("soft")}
                >
                  Ouvrir le dernier run
                </Link>
              </div>
            ) : (
              <div className="text-sm text-white/55">Aucun run disponible.</div>
            )}
          </SidePanelCard>
        </div>
      }
    >
      <SectionCard
        title="Statut des runs"
        description="Vue rapide des volumes par état d’exécution sur le workspace actif."
        className={sectionFrameClassName("default")}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className={statCardClassName()}>
            <div className="text-sm text-zinc-400">Total runs</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
              {totalRuns}
            </div>
          </div>

          <div className={statCardClassName()}>
            <div className="text-sm text-zinc-400">Running</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-sky-300">
              {stats.running}
            </div>
          </div>

          <div className={statCardClassName()}>
            <div className="text-sm text-zinc-400">Done</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-emerald-300">
              {stats.done}
            </div>
          </div>

          <div className={statCardClassName()}>
            <div className="text-sm text-zinc-400">Error</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-rose-300">
              {stats.error}
            </div>
          </div>

          <div className={statCardClassName()}>
            <div className="text-sm text-zinc-400">Other</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-zinc-300">
              {toNumber(stats.unsupported) + toNumber(stats.other)}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="System runs"
        description="Historique récent des exécutions BOSAI, triées par dernière activité."
        tone="neutral"
        className={sectionFrameClassName("neutral")}
        action={<SectionCountPill value={visibleRuns.length} tone="info" />}
      >
        {visibleRuns.length === 0 ? (
          <EmptyStatePanel
            title="Aucun run visible"
            description="Aucun run n’est disponible sur la vue actuelle."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {visibleRuns.map((run) => (
              <RunListCard
                key={
                  getRunId(run) ||
                  getRunPublicId(run) ||
                  `${getRunCapability(run)}-${getRunStartedAt(run)}`
                }
                run={run}
                activeWorkspaceId={activeWorkspaceId}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </ControlPlaneShell>
  );
}
