import Link from "next/link";
import {
  fetchHealthScore,
  fetchRuns,
  fetchCommands,
  fetchSla,
} from "@/lib/api";

function cardClassName() {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function sectionLabelClassName() {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default"
) {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function statValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function healthTone(status?: string) {
  const normalized = (status || "").trim().toLowerCase();

  if (["ok", "healthy", "green", "good"].includes(normalized)) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (["warning", "degraded", "yellow"].includes(normalized)) {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (["error", "down", "critical", "red"].includes(normalized)) {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

export default async function OverviewPage() {
  const [healthResult, runsResult, commandsResult, slaResult] =
    await Promise.allSettled([
      fetchHealthScore(),
      fetchRuns(),
      fetchCommands(300),
      fetchSla(100),
    ]);

  const health =
    healthResult.status === "fulfilled" ? healthResult.value : null;
  const runs = runsResult.status === "fulfilled" ? runsResult.value : null;
  const commands =
    commandsResult.status === "fulfilled" ? commandsResult.value : null;
  const sla = slaResult.status === "fulfilled" ? slaResult.value : null;

  const healthScore =
    typeof health?.score === "number" && Number.isFinite(health.score)
      ? health.score
      : null;

  const healthStatus =
    typeof health?.status === "string" && health.status.trim()
      ? health.status.trim()
      : "unknown";

  const runStats =
    runs && typeof runs === "object" && runs.stats && typeof runs.stats === "object"
      ? runs.stats
      : {};

  const commandStats =
    commands &&
    typeof commands === "object" &&
    commands.stats &&
    typeof commands.stats === "object"
      ? commands.stats
      : {};

  const slaStats =
    sla && typeof sla === "object" && sla.stats && typeof sla.stats === "object"
      ? sla.stats
      : {};

  const totalRuns =
    typeof runs?.count === "number" && Number.isFinite(runs.count)
      ? runs.count
      : Array.isArray(runs?.runs)
      ? runs.runs.length
      : 0;

  const totalCommands =
    typeof commands?.count === "number" && Number.isFinite(commands.count)
      ? commands.count
      : Array.isArray(commands?.commands)
      ? commands.commands.length
      : 0;

  const totalSlaSignals = Array.isArray(sla?.incidents) ? sla.incidents.length : 0;

  const queuedCommands = statValue(
    (commandStats as Record<string, unknown>).queued ??
      (commandStats as Record<string, unknown>).queue
  );
  const runningCommands = statValue(
    (commandStats as Record<string, unknown>).running
  );
  const retryCommands = statValue(
    (commandStats as Record<string, unknown>).retry
  );
  const doneCommands = statValue((commandStats as Record<string, unknown>).done);
  const failedCommands =
    statValue((commandStats as Record<string, unknown>).error) +
    statValue((commandStats as Record<string, unknown>).dead);

  const runningRuns = statValue((runStats as Record<string, unknown>).running);
  const doneRuns = statValue((runStats as Record<string, unknown>).done);
  const errorRuns = statValue((runStats as Record<string, unknown>).error);

  const okSla = statValue((slaStats as Record<string, unknown>).ok);
  const warningSla = statValue((slaStats as Record<string, unknown>).warning);
  const breachedSla = statValue((slaStats as Record<string, unknown>).breached);
  const escalatedSla = statValue((slaStats as Record<string, unknown>).escalated);
  const queuedSla = statValue(
    (slaStats as Record<string, unknown>).escalation_queued
  );
  const unknownSla = statValue((slaStats as Record<string, unknown>).unknown);

  return (
    <div className="space-y-8">
      <section className="space-y-3 border-b border-white/10 pb-6">
        <div className={sectionLabelClassName()}>BOSAI Dashboard</div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Overview
          </h1>
          <p className="mt-2 max-w-3xl text-base text-zinc-400 sm:text-lg">
            Vue d’ensemble du control plane BOSAI avec santé système, exécutions,
            commands et signaux SLA.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Health score</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {healthScore ?? "—"}
          </div>
          <div className="mt-4">
            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${healthTone(
                healthStatus
              )}`}
            >
              {healthStatus.toUpperCase()}
            </span>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Runs actifs</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-sky-300">
            {runningRuns}
          </div>
          <div className="mt-3 text-sm text-zinc-500">
            Total runs: {totalRuns}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">Commands actives</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-violet-300">
            {runningCommands + queuedCommands + retryCommands}
          </div>
          <div className="mt-3 text-sm text-zinc-500">
            Total commands: {totalCommands}
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="text-sm text-zinc-400">SLA critiques</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-red-300">
            {breachedSla + escalatedSla}
          </div>
          <div className="mt-3 text-sm text-zinc-500">
            Total signaux SLA: {totalSlaSignals}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <div className={sectionLabelClassName()}>SLA Snapshot</div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                État SLA
              </h2>
            </div>

            <div className="text-sm text-zinc-500">{totalSlaSignals} signal(s)</div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="text-sm text-zinc-400">OK</div>
              <div className="mt-3 text-3xl font-semibold text-emerald-300">
                {okSla}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="text-sm text-zinc-400">Warning</div>
              <div className="mt-3 text-3xl font-semibold text-amber-300">
                {warningSla}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="text-sm text-zinc-400">Breached</div>
              <div className="mt-3 text-3xl font-semibold text-red-300">
                {breachedSla}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="text-sm text-zinc-400">Escalated</div>
              <div className="mt-3 text-3xl font-semibold text-rose-300">
                {escalatedSla}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="text-sm text-zinc-400">Queued</div>
              <div className="mt-3 text-3xl font-semibold text-violet-300">
                {queuedSla}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="text-sm text-zinc-400">Unknown</div>
              <div className="mt-3 text-3xl font-semibold text-zinc-300">
                {unknownSla}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <Link href="/sla" className={actionLinkClassName("primary")}>
              Ouvrir la vue SLA
            </Link>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className={sectionLabelClassName()}>Quick navigation</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
            Vues principales
          </h2>

          <div className="mt-5 space-y-3">
            <Link href="/flows" className={actionLinkClassName("soft")}>
              Ouvrir Flows
            </Link>

            <Link href="/commands" className={actionLinkClassName("soft")}>
              Ouvrir Commands
            </Link>

            <Link href="/events" className={actionLinkClassName("soft")}>
              Ouvrir Events
            </Link>

            <Link href="/incidents" className={actionLinkClassName("soft")}>
              Ouvrir Incidents
            </Link>

            <Link href="/runs" className={actionLinkClassName("soft")}>
              Ouvrir Runs
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={cardClassName()}>
          <div className={sectionLabelClassName()}>Runs snapshot</div>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Running</span>
              <span>{runningRuns}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Done</span>
              <span>{doneRuns}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Error</span>
              <span>{errorRuns}</span>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className={sectionLabelClassName()}>Commands snapshot</div>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Queued</span>
              <span>{queuedCommands}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Running</span>
              <span>{runningCommands}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Retry</span>
              <span>{retryCommands}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Done</span>
              <span>{doneCommands}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Failed/Dead</span>
              <span>{failedCommands}</span>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className={sectionLabelClassName()}>Health</div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-sm text-zinc-400">Status</div>
              <div className="mt-1 text-xl font-semibold text-white">
                {healthStatus.toUpperCase()}
              </div>
            </div>

            <div>
              <div className="text-sm text-zinc-400">Score</div>
              <div className="mt-1 text-xl font-semibold text-white">
                {healthScore ?? "—"}
              </div>
            </div>

            <Link href="/runs" className={actionLinkClassName("soft")}>
              Aller aux runs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
