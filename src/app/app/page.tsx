import {
  fetchCommands,
  fetchHealthScore,
  fetchRuns,
  fetchSla,
  type CommandItem,
  type IncidentItem,
  type RunItem,
} from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getHealthTone(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-300";
  return "text-red-400";
}

function getHealthLabel(score: number) {
  if (score >= 80) return "Stable";
  if (score >= 50) return "À surveiller";
  return "Critique";
}

function getRunStatusTone(status?: string) {
  const key = (status || "").toLowerCase();

  if (key === "done") {
    return "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (key === "running") {
    return "border border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (key === "error") {
    return "border border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (key === "unsupported") {
    return "border border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  return "border border-zinc-700 bg-zinc-800 text-zinc-300";
}

function getCommandStatusTone(status?: string) {
  const key = (status || "").toLowerCase();

  if (key === "done") {
    return "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (key === "running") {
    return "border border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (key === "queued" || key === "queue") {
    return "border border-zinc-600 bg-zinc-800 text-zinc-300";
  }

  if (key === "retry") {
    return "border border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (key === "error" || key === "dead" || key === "blocked") {
    return "border border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border border-zinc-700 bg-zinc-800 text-zinc-300";
}

function getSlaTone(status?: string) {
  const key = (status || "").toLowerCase();

  if (key === "ok") {
    return "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (key === "warning") {
    return "border border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (key === "breached" || key === "escalated") {
    return "border border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border border-zinc-700 bg-zinc-800 text-zinc-300";
}

function MetricCard({
  label,
  value,
  helper,
  valueClassName,
}: {
  label: string;
  value: string | number;
  helper: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6">
      <p className="text-sm text-zinc-400">{label}</p>
      <div className={`mt-4 text-5xl font-semibold tracking-tight text-white ${valueClassName || ""}`}>
        {value}
      </div>
      <p className="mt-3 text-sm text-zinc-500">{helper}</p>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-5 text-sm text-zinc-500">
      {text}
    </div>
  );
}

function RunRow({ run }: { run: RunItem }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {run.capability || "unknown_capability"}
          </p>
          <p className="mt-1 truncate text-xs text-zinc-500">
            {run.run_id || run.id}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {run.worker || "bosai-worker-01"} · {formatDate(run.started_at)}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ${getRunStatusTone(
            run.status
          )}`}
        >
          {run.status || "—"}
        </span>
      </div>
    </div>
  );
}

function CommandRow({ command }: { command: CommandItem }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {command.capability || "unknown_command"}
          </p>
          <p className="mt-1 truncate text-xs text-zinc-500">
            {command.idempotency_key || command.id}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Priority {command.priority ?? "—"}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ${getCommandStatusTone(
            command.status
          )}`}
        >
          {command.status || "—"}
        </span>
      </div>
    </div>
  );
}

function IncidentRow({ incident }: { incident: IncidentItem }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {incident.name || incident.id}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            SLA restant :{" "}
            {incident.sla_remaining_minutes ?? "—"}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Escalade en file : {incident.escalation_queued ? "Oui" : "Non"}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium ${getSlaTone(
            incident.sla_status
          )}`}
        >
          {incident.sla_status || "—"}
        </span>
      </div>
    </div>
  );
}

export default async function OverviewPage() {
  let healthScore = 0;
  let totalRuns = 0;
  let queuedCommands = 0;
  let openIncidents = 0;

  let recentRuns: RunItem[] = [];
  let recentCommands: CommandItem[] = [];
  let recentIncidents: IncidentItem[] = [];
  let issues: string[] = [];

  const [
    healthScoreResult,
    runsResult,
    commandsResult,
    slaResult,
  ] = await Promise.allSettled([
    fetchHealthScore(),
    fetchRuns(6),
    fetchCommands(6),
    fetchSla(10),
  ]);

  if (healthScoreResult.status === "fulfilled") {
    healthScore = healthScoreResult.value.score ?? 0;
    issues = healthScoreResult.value.issues ?? [];
  }

  if (runsResult.status === "fulfilled") {
    totalRuns = runsResult.value.count ?? 0;
    recentRuns = runsResult.value.runs ?? [];
  }

  if (commandsResult.status === "fulfilled") {
    queuedCommands =
      (commandsResult.value.stats?.queued ?? 0) +
      (commandsResult.value.stats?.retry ?? 0);
    recentCommands = commandsResult.value.commands ?? [];
  }

  if (slaResult.status === "fulfilled") {
    openIncidents =
      (slaResult.value.stats?.warning ?? 0) +
      (slaResult.value.stats?.breached ?? 0) +
      (slaResult.value.stats?.escalated ?? 0);

    recentIncidents = (slaResult.value.incidents ?? []).slice(0, 5);
  }

  const healthLabel = getHealthLabel(healthScore);
  const healthTone = getHealthTone(healthScore);

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-zinc-800 bg-zinc-950/70 p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
              BOSAI Dashboard V2
            </div>

            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white">
              Overview
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
              Cockpit principal du workspace BOSAI. Vue consolidée du health score,
              des runs, des commandes et des incidents opérationnels.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                Workspace
              </p>
              <p className="mt-2 text-lg font-medium text-white">Production</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                Health state
              </p>
              <p className={`mt-2 text-lg font-medium ${healthTone}`}>{healthLabel}</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                Signals
              </p>
              <p className="mt-2 text-lg font-medium text-white">{issues.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="System Health"
          value={healthScore}
          helper="Score global BOSAI"
          valueClassName={healthTone}
        />
        <MetricCard
          label="Total Runs"
          value={totalRuns}
          helper="Runs observés"
        />
        <MetricCard
          label="Queued Commands"
          value={queuedCommands}
          helper="File d’exécution"
        />
        <MetricCard
          label="Open Incidents"
          value={openIncidents}
          helper="Incidents actifs SLA"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <SectionCard
          title="Recent Runs"
          subtitle="Derniers runs remontés par le worker."
        >
          <div className="space-y-3">
            {recentRuns.length === 0 ? (
              <EmptyState text="Aucun run récent pour le moment." />
            ) : (
              recentRuns.map((run) => <RunRow key={run.id} run={run} />)
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Commands"
          subtitle="Activité récente de la file d’exécution."
        >
          <div className="space-y-3">
            {recentCommands.length === 0 ? (
              <EmptyState text="Aucune commande récente pour le moment." />
            ) : (
              recentCommands.map((command) => (
                <CommandRow key={command.id} command={command} />
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="System Signals"
          subtitle="Lecture synthétique de l’état BOSAI."
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-sm text-zinc-400">Health score actuel</p>
              <p className={`mt-3 text-3xl font-semibold ${healthTone}`}>
                {healthScore}/100
              </p>
            </div>

            {issues.length === 0 ? (
              <EmptyState text="Aucun signal critique remonté par /health/score." />
            ) : (
              issues.map((issue) => (
                <div
                  key={issue}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-300"
                >
                  {issue}
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Operational Snapshot"
          subtitle="Vue instantanée du système."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Runs done
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {runsResult.status === "fulfilled"
                  ? runsResult.value.stats?.done ?? 0
                  : 0}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Runs error
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {runsResult.status === "fulfilled"
                  ? runsResult.value.stats?.error ?? 0
                  : 0}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Commands running
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {commandsResult.status === "fulfilled"
                  ? commandsResult.value.stats?.running ?? 0
                  : 0}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Commands done
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {commandsResult.status === "fulfilled"
                  ? commandsResult.value.stats?.done ?? 0
                  : 0}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Incidents"
          subtitle="Zone prête pour les incidents réels BOSAI."
        >
          <div className="space-y-3">
            {recentIncidents.length === 0 ? (
              <EmptyState text="Aucun incident récent pour le moment." />
            ) : (
              recentIncidents.map((incident) => (
                <IncidentRow key={incident.id} incident={incident} />
              ))
            )}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
