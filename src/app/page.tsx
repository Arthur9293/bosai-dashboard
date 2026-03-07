"use client";

import { useEffect, useMemo, useState } from "react";

type HealthResponse = {
  ok?: boolean;
  app?: string;
  version?: string;
  worker?: string;
  capabilities?: string[];
  ts?: string;
};

type HealthScoreResponse = {
  ok?: boolean;
  score?: number;
  issues?: string[];
  ts?: string;
};

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

type RunsResponse = {
  ok?: boolean;
  count?: number;
  runs?: RunItem[];
  stats?: {
    running?: number;
    done?: number;
    error?: number;
    unsupported?: number;
    other?: number;
  };
  ts?: string;
};

type CommandItem = {
  id: string;
  capability?: string;
  status?: string;
  priority?: number;
  retry_count?: number;
  retry_max?: number;
  scheduled_at?: string;
  next_retry_at?: string;
  is_locked?: boolean;
  locked_by?: string;
  idempotency_key?: string;
};

type CommandsResponse = {
  ok?: boolean;
  count?: number;
  commands?: CommandItem[];
  stats?: {
    queued?: number;
    running?: number;
    retry?: number;
    done?: number;
    dead?: number;
    blocked?: number;
    unsupported?: number;
    error?: number;
    other?: number;
  };
  ts?: string;
};

type SlaIncidentItem = {
  id: string;
  name?: string;
  sla_status?: string;
  sla_remaining_minutes?: number | string | null;
  escalation_queued?: boolean;
  last_sla_check?: string;
  linked_run?: string[] | null;
};

type SlaResponse = {
  ok?: boolean;
  count?: number;
  incidents?: SlaIncidentItem[];
  stats?: {
    ok?: number;
    warning?: number;
    breached?: number;
    escalated?: number;
    unknown?: number;
    escalation_queued?: number;
  };
  ts?: string;
};

type DashboardState = {
  loading: boolean;
  error: string | null;
  health: HealthResponse | null;
  healthScore: HealthScoreResponse | null;
  runs: RunsResponse | null;
  commands: CommandsResponse | null;
  sla: SlaResponse | null;
  lastRefresh: string | null;
};

const WORKER_URL =
  process.env.NEXT_PUBLIC_BOSAI_WORKER_URL?.replace(/\/$/, "") ||
  "https://bosai-worker.onrender.com";

function getStatusLabel(
  health: HealthResponse | null,
  healthScore: HealthScoreResponse | null
) {
  if (!health?.ok) return "Offline";
  const score = healthScore?.score ?? 0;
  if (score >= 90) return "Stable";
  if (score >= 70) return "Warning";
  return "Critical";
}

function getStatusClasses(status: string) {
  switch (status) {
    case "Stable":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "Warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "Critical":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300";
  }
}

function getRunStatusClasses(status?: string) {
  const normalized = (status || "").toLowerCase();

  switch (normalized) {
    case "done":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "running":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "error":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "unsupported":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300";
  }
}

function getCommandStatusClasses(status?: string) {
  const normalized = (status || "").toLowerCase();

  switch (normalized) {
    case "queued":
    case "queue":
      return "border-violet-500/30 bg-violet-500/10 text-violet-300";
    case "running":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "retry":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "done":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "dead":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    case "blocked":
      return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    case "unsupported":
      return "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300";
    case "error":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300";
  }
}

function getSlaStatusClasses(status?: string) {
  const normalized = (status || "").toLowerCase();

  switch (normalized) {
    case "ok":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "breached":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "escalated":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function yesNo(value?: boolean | null) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function formatMinutes(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function HomePage() {
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: null,
    health: null,
    healthScore: null,
    runs: null,
    commands: null,
    sla: null,
    lastRefresh: null,
  });

  const loadData = async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [healthRes, healthScoreRes, runsRes, commandsRes, slaRes] =
        await Promise.all([
          fetch(`${WORKER_URL}/health`, { cache: "no-store" }),
          fetch(`${WORKER_URL}/health/score`, { cache: "no-store" }),
          fetch(`${WORKER_URL}/runs?limit=10`, { cache: "no-store" }),
          fetch(`${WORKER_URL}/commands?limit=10`, { cache: "no-store" }),
          fetch(`${WORKER_URL}/sla?limit=10`, { cache: "no-store" }),
        ]);

      if (!healthRes.ok) {
        throw new Error(`Health endpoint failed (${healthRes.status})`);
      }

      if (!healthScoreRes.ok) {
        throw new Error(
          `Health score endpoint failed (${healthScoreRes.status})`
        );
      }

      if (!runsRes.ok) {
        throw new Error(`Runs endpoint failed (${runsRes.status})`);
      }

      if (!commandsRes.ok) {
        throw new Error(`Commands endpoint failed (${commandsRes.status})`);
      }

      if (!slaRes.ok) {
        throw new Error(`SLA endpoint failed (${slaRes.status})`);
      }

      const health = (await healthRes.json()) as HealthResponse;
      const healthScore = (await healthScoreRes.json()) as HealthScoreResponse;
      const runs = (await runsRes.json()) as RunsResponse;
      const commands = (await commandsRes.json()) as CommandsResponse;
      const sla = (await slaRes.json()) as SlaResponse;

      setState({
        loading: false,
        error: null,
        health,
        healthScore,
        runs,
        commands,
        sla,
        lastRefresh: new Date().toISOString(),
      });
    } catch (error) {
      setState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible de charger les données BOSAI.",
        health: null,
        healthScore: null,
        runs: null,
        commands: null,
        sla: null,
        lastRefresh: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const status = useMemo(
    () => getStatusLabel(state.health, state.healthScore),
    [state.health, state.healthScore]
  );

  const statusClasses = getStatusClasses(status);
  const capabilities = state.health?.capabilities ?? [];
  const issues = state.healthScore?.issues ?? [];
  const score = state.healthScore?.score ?? 0;
  const runs = state.runs?.runs ?? [];
  const runsStats = state.runs?.stats ?? {};
  const commands = state.commands?.commands ?? [];
  const commandsStats = state.commands?.stats ?? {};
  const slaIncidents = state.sla?.incidents ?? [];
  const slaStats = state.sla?.stats ?? {};

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 md:px-10">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
                BOSAI Dashboard v1
              </p>
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Anti-Chaos AI Ops Layer
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-zinc-400 md:text-base">
                Monitor temps réel du worker BOSAI, du health score, des capacités
                actives, des exécutions récentes, de la queue de commandes et du
                suivi SLA.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`rounded-full border px-4 py-2 text-sm font-medium ${statusClasses}`}
              >
                System Status: {status}
              </div>

              <button
                onClick={loadData}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/10"
              >
                {state.loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
            <span>
              Worker URL:{" "}
              <span className="font-medium text-zinc-200">{WORKER_URL}</span>
            </span>
            <span>
              Last refresh:{" "}
              <span className="font-medium text-zinc-200">
                {formatDate(state.lastRefresh)}
              </span>
            </span>
          </div>
        </header>

        {state.error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {state.error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card
            title="Worker"
            value={state.health?.worker || "Unavailable"}
            subtitle={state.health?.app || "No app detected"}
          />
          <Card
            title="Version"
            value={state.health?.version || "—"}
            subtitle="Current deployed worker"
          />
          <Card
            title="Health Score"
            value={String(score)}
            subtitle="Global system confidence"
          />
          <Card
            title="Capabilities"
            value={String(capabilities.length)}
            subtitle="Loaded in worker"
          />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">System Overview</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Vue d’ensemble du noyau BOSAI Worker.
                </p>
              </div>
              <div className="text-right text-sm text-zinc-400">
                <div>Health endpoint</div>
                <div className="font-medium text-zinc-200">/health</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MetricBox label="App Name" value={state.health?.app || "—"} />
              <MetricBox label="Worker Name" value={state.health?.worker || "—"} />
              <MetricBox
                label="Worker Timestamp"
                value={formatDate(state.health?.ts)}
              />
              <MetricBox
                label="Score Timestamp"
                value={formatDate(state.healthScore?.ts)}
              />
            </div>

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                Loaded Capabilities
              </h3>

              {capabilities.length === 0 ? (
                <EmptyState text="Aucune capability détectée." />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {capabilities.map((capability) => (
                    <span
                      key={capability}
                      className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Health Score Analysis</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Données issues de{" "}
                  <span className="text-zinc-200">/health/score</span>.
                </p>
              </div>
            </div>

            <ScoreBar score={score} />

            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
                Issues / Signals
              </h3>

              {issues.length === 0 ? (
                <EmptyState text="Aucun signal remonté." />
              ) : (
                <div className="space-y-2">
                  {issues.map((issue) => (
                    <div
                      key={issue}
                      className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-zinc-200"
                    >
                      {issue}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Recent Runs</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Dernières exécutions réelles du worker via{" "}
                <span className="text-zinc-200">/runs</span>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
              <SmallStat label="Running" value={String(runsStats.running ?? 0)} />
              <SmallStat label="Done" value={String(runsStats.done ?? 0)} />
              <SmallStat label="Error" value={String(runsStats.error ?? 0)} />
              <SmallStat
                label="Unsupported"
                value={String(runsStats.unsupported ?? 0)}
              />
            </div>
          </div>

          {runs.length === 0 ? (
            <EmptyState text="Aucun run trouvé." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-zinc-500">
                    <th className="px-3 py-2">Capability</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Worker</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Started</th>
                    <th className="px-3 py-2">Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="rounded-2xl bg-white/[0.03]">
                      <td className="rounded-l-2xl px-3 py-4 text-sm font-medium text-zinc-100">
                        {run.capability || "—"}
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getRunStatusClasses(
                            run.status
                          )}`}
                        >
                          {run.status || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-zinc-300">
                        {run.worker || "—"}
                      </td>
                      <td className="px-3 py-4 text-sm text-zinc-300">
                        {run.priority ?? "—"}
                      </td>
                      <td className="px-3 py-4 text-sm text-zinc-300">
                        {formatDate(run.started_at)}
                      </td>
                      <td className="rounded-r-2xl px-3 py-4 text-sm text-zinc-300">
                        {formatDate(run.finished_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Commands Queue</h2>
              <p className="mt-1 text-sm text-zinc-400">
                File de commandes via{" "}
                <span className="text-zinc-200">/commands</span>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
              <SmallStat label="Queued" value={String(commandsStats.queued ?? 0)} />
              <SmallStat label="Running" value={String(commandsStats.running ?? 0)} />
              <SmallStat label="Retry" value={String(commandsStats.retry ?? 0)} />
              <SmallStat label="Done" value={String(commandsStats.done ?? 0)} />
              <SmallStat label="Dead" value={String(commandsStats.dead ?? 0)} />
              <SmallStat label="Blocked" value={String(commandsStats.blocked ?? 0)} />
              <SmallStat
                label="Unsupported"
                value={String(commandsStats.unsupported ?? 0)}
              />
              <SmallStat label="Error" value={String(commandsStats.error ?? 0)} />
            </div>
          </div>

          {commands.length === 0 ? (
            <EmptyState text="Aucune commande trouvée." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-zinc-500">
                    <th className="px-3 py-2">Capability</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Retry</th>
                    <th className="px-3 py-2">Locked</th>
                    <th className="px-3 py-2">Locked By</th>
                    <th className="px-3 py-2">Scheduled</th>
                    <th className="px-3 py-2">Next Retry</th>
                  </tr>
                </thead>
                <tbody>
                  {commands.map((command) => (
                    <tr key={command.id} className="rounded-2xl bg-white/[0.03]">
                      <td className="rounded-l-2xl px-3 py-4 text-sm font-medium text-zinc-100">
                        {command.capability || "—"}
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getCommandStatusClasses(
                            command.status
                          )}`}
                        >
                          {command.status || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-zinc-300">
                        {command.priority ?? "—"}
                      </td>
                      <td className="px-3 py-4 text-sm text-zinc-300">
                        {command.retry_count ?? 0}/{command.retry_max ?? 0}
                      </td>
                      <td className="px-3 py-4 text-sm text-zinc-300">
                        {yesNo(command.is_locked)}
                      </td>
                      <td className="px-3 py-4 text-sm text-zinc-300">
                        {command.locked_by || "—"}
                      </td>
                      <td className="px-3 py-4 text-sm text-zinc-300">
                        {formatDate(command.scheduled_at)}
                      </td>
                      <td className="rounded-r-2xl px-3 py-4 text-sm text-zinc-300">
                        {formatDate(command.next_retry_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-950/70 p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">SLA Monitor</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Incidents et statuts via <span className="text-zinc-200">/sla</span>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
              <SmallStat label="OK" value={String(slaStats.ok ?? 0)} />
              <SmallStat label="Warning" value={String(slaStats.warning ?? 0)} />
              <SmallStat label="Breached" value={String(slaStats.breached ?? 0)} />
              <SmallStat
                label="Escalated"
                value={String(slaStats.escalated ?? 0)}
              />
              <SmallStat label="Unknown" value={String(slaStats.unknown ?? 0)} />
              <SmallStat
                label="Esc Queue"
                value={String(slaStats.escalation_queued ?? 0)}
              />
            </div>
          </div>

          {slaIncidents.length === 0 ? (
            <EmptyState text="Aucun incident SLA trouvé." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.2em] text-zinc-500">
                    <th className="px-3 py-2">Incident</th>
                    <th className="px-3 py-2">SLA Status</th>
                    <th className="px-3 py-2">Remaining Min</th>
                    <th className="px-3 py-2">Escalation Queued</th>
                    <th className="px-3 py-2">Last SLA Check</th>
                  </tr>
                </thead>
                <tbody>
                  {slaIncidents.map((incident) => (
                    <tr key={incident.id} className="rounded-2xl bg-white/[0.03]">
                      <td className="rounded-l-2xl px-3 py-4 text-sm font-medium text-zinc-100">
                        {incident.name || "—"}
                      </td>
                      <td className="px-3 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getSlaStatusClasses(
                            incident.sla_status
                          )}`}
                        >
                          {incident.sla_status || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-zinc-300">
                        {formatMinutes(incident.sla_remaining_minutes)}
                      </td>
                      <td className="px-3 py-4 text-sm text-zinc-300">
                        {yesNo(incident.escalation_queued)}
                      </td>
                      <td className="rounded-r-2xl px-3 py-4 text-sm text-zinc-300">
                        {formatDate(incident.last_sla_check)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <InfoPanel
            title="Render Worker"
            text="Le backend BOSAI Worker reste la source d’exécution et d’orchestration."
          />
          <InfoPanel
            title="GitHub → Vercel"
            text="Chaque push sur le repo bosai-dashboard peut mettre à jour l’interface."
          />
          <InfoPanel
            title="Next Step"
            text="Étape suivante : brancher Events et Escalations."
          />
        </section>
      </div>
    </main>
  );
}

function Card({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-500">
      {text}
    </div>
  );
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const normalizedScore = Math.max(0, Math.min(100, score));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-zinc-400">Current score</span>
        <span className="font-semibold text-white">{normalizedScore}/100</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-white transition-all"
          style={{ width: `${normalizedScore}%` }}
        />
      </div>
    </div>
  );
}
