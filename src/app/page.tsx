"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type HealthResponse = {
  ok?: boolean;
  app?: string;
  version?: string;
  worker?: string;
  capabilities?: string[];
  ts?: string;
  [key: string]: unknown;
};

type HealthScoreResponse = {
  ok?: boolean;
  score?: number;
  issues?: string[];
  ts?: string;
  [key: string]: unknown;
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
  [key: string]: unknown;
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
    [key: string]: number | undefined;
  };
  ts?: string;
  [key: string]: unknown;
};

type CommandItem = {
  id: string;
  capability?: string;
  status?: string;
  worker?: string;
  priority?: number;
  created_at?: string;
  started_at?: string;
  finished_at?: string;
  retry_count?: number;
  is_blocked?: boolean;
  idempotency_key?: string;
  [key: string]: unknown;
};

type CommandsResponse = {
  ok?: boolean;
  count?: number;
  commands?: CommandItem[];
  stats?: {
    queued?: number;
    running?: number;
    done?: number;
    error?: number;
    blocked?: number;
    other?: number;
    [key: string]: number | undefined;
  };
  ts?: string;
  [key: string]: unknown;
};

type SLAItem = {
  id: string;
  name?: string;
  title?: string;
  sla_status?: string;
  priority?: string | number;
  remaining_minutes?: number;
  owner?: string;
  status?: string;
  updated_at?: string;
  [key: string]: unknown;
};

type SLAResponse = {
  ok?: boolean;
  count?: number;
  breached?: number;
  warning?: number;
  ok_count?: number;
  items?: SLAItem[];
  ts?: string;
  [key: string]: unknown;
};

type EventItem = {
  id: string;
  event_type?: string;
  type?: string;
  source?: string;
  status?: string;
  created_at?: string;
  processed_at?: string;
  command_id?: string;
  run_id?: string;
  payload?: unknown;
  [key: string]: unknown;
};

type EventsResponse = {
  ok?: boolean;
  count?: number;
  events?: EventItem[];
  stats?: {
    pending?: number;
    processed?: number;
    failed?: number;
    other?: number;
    [key: string]: number | undefined;
  };
  ts?: string;
  [key: string]: unknown;
};

type ApiErrorMap = Partial<Record<EndpointKey, string>>;

type EndpointKey =
  | "health"
  | "healthScore"
  | "runs"
  | "commands"
  | "sla"
  | "events";

const API_BASE =
  process.env.NEXT_PUBLIC_BOSAI_API_BASE_URL?.replace(/\/+$/, "") || "";

const ENDPOINTS: Record<EndpointKey, string> = {
  health: "/health",
  healthScore: "/health/score",
  runs: "/runs",
  commands: "/commands",
  sla: "/sla",
  events: "/events",
};

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function formatNumber(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("fr-FR").format(value);
}

function scoreTone(score?: number) {
  if (typeof score !== "number") return "text-zinc-300";
  if (score >= 90) return "text-emerald-400";
  if (score >= 70) return "text-amber-400";
  return "text-rose-400";
}

function statusTone(status?: string) {
  const s = (status || "").toLowerCase();

  if (
    s.includes("done") ||
    s.includes("ok") ||
    s.includes("healthy") ||
    s.includes("success") ||
    s.includes("processed")
  ) {
    return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
  }

  if (
    s.includes("warning") ||
    s.includes("queued") ||
    s.includes("pending") ||
    s.includes("running")
  ) {
    return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30";
  }

  if (
    s.includes("error") ||
    s.includes("fail") ||
    s.includes("blocked") ||
    s.includes("breached") ||
    s.includes("unsupported")
  ) {
    return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30";
  }

  return "bg-zinc-700/50 text-zinc-200 ring-1 ring-zinc-600";
}

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  tone = "text-zinc-100",
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={classNames("mt-2 text-2xl font-semibold", tone)}>
        {value}
      </div>
    </div>
  );
}

function Badge({ value }: { value?: string | number | boolean | null }) {
  const text =
    value === undefined || value === null || value === "" ? "—" : String(value);

  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        statusTone(String(text))
      )}
    >
      {text}
    </span>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 text-xs leading-6 text-zinc-300">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function Page() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScoreResponse | null>(null);
  const [runs, setRuns] = useState<RunsResponse | null>(null);
  const [commands, setCommands] = useState<CommandsResponse | null>(null);
  const [sla, setSla] = useState<SLAResponse | null>(null);
  const [events, setEvents] = useState<EventsResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ApiErrorMap>({});
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const fetchJson = useCallback(async <T,>(path: string): Promise<T> => {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
    }

    return (await res.json()) as T;
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrors({});

    const results = await Promise.allSettled([
      fetchJson<HealthResponse>(ENDPOINTS.health),
      fetchJson<HealthScoreResponse>(ENDPOINTS.healthScore),
      fetchJson<RunsResponse>(ENDPOINTS.runs),
      fetchJson<CommandsResponse>(ENDPOINTS.commands),
      fetchJson<SLAResponse>(ENDPOINTS.sla),
      fetchJson<EventsResponse>(ENDPOINTS.events),
    ]);

    const nextErrors: ApiErrorMap = {};

    if (results[0].status === "fulfilled") setHealth(results[0].value);
    else nextErrors.health = results[0].reason?.message || "Erreur inconnue";

    if (results[1].status === "fulfilled") setHealthScore(results[1].value);
    else nextErrors.healthScore = results[1].reason?.message || "Erreur inconnue";

    if (results[2].status === "fulfilled") setRuns(results[2].value);
    else nextErrors.runs = results[2].reason?.message || "Erreur inconnue";

    if (results[3].status === "fulfilled") setCommands(results[3].value);
    else nextErrors.commands = results[3].reason?.message || "Erreur inconnue";

    if (results[4].status === "fulfilled") setSla(results[4].value);
    else nextErrors.sla = results[4].reason?.message || "Erreur inconnue";

    if (results[5].status === "fulfilled") setEvents(results[5].value);
    else nextErrors.events = results[5].reason?.message || "Erreur inconnue";

    setErrors(nextErrors);
    setLastRefresh(new Date().toISOString());
    setLoading(false);
  }, [fetchJson]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const summary = useMemo(() => {
    const runsStats = runs?.stats || {};
    const commandsStats = commands?.stats || {};
    const eventsStats = events?.stats || {};

    return {
      healthOk: health?.ok === true,
      score: healthScore?.score,
      runsDone: runsStats.done ?? 0,
      runsError: runsStats.error ?? 0,
      commandsQueued: commandsStats.queued ?? 0,
      commandsBlocked: commandsStats.blocked ?? 0,
      slaBreached: sla?.breached ?? 0,
      eventsPending: eventsStats.pending ?? 0,
    };
  }, [health, healthScore, runs, commands, sla, events]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
              BOSAI Dashboard
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Control Surface
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Vue unifiée des endpoints /health, /health/score, /runs, /commands,
              /sla et /events.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-400">
              <div>API Base</div>
              <div className="mt-1 break-all font-mono text-xs text-zinc-300">
                {API_BASE || "même origine"}
              </div>
            </div>

            <button
              onClick={() => void loadAll()}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-white px-4 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Actualisation..." : "Actualiser"}
            </button>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
          <Stat
            label="Health"
            value={summary.healthOk ? "OK" : "Check"}
            tone={summary.healthOk ? "text-emerald-400" : "text-rose-400"}
          />
          <Stat
            label="Score"
            value={summary.score ?? "—"}
            tone={scoreTone(summary.score)}
          />
          <Stat label="Runs done" value={formatNumber(summary.runsDone)} />
          <Stat
            label="Runs error"
            value={formatNumber(summary.runsError)}
            tone={summary.runsError > 0 ? "text-rose-400" : "text-zinc-100"}
          />
          <Stat
            label="Cmd queued"
            value={formatNumber(summary.commandsQueued)}
            tone={
              summary.commandsQueued > 0 ? "text-amber-400" : "text-zinc-100"
            }
          />
          <Stat
            label="Cmd blocked"
            value={formatNumber(summary.commandsBlocked)}
            tone={
              summary.commandsBlocked > 0 ? "text-rose-400" : "text-zinc-100"
            }
          />
          <Stat
            label="SLA breached"
            value={formatNumber(summary.slaBreached)}
            tone={summary.slaBreached > 0 ? "text-rose-400" : "text-zinc-100"}
          />
          <Stat
            label="Events pending"
            value={formatNumber(summary.eventsPending)}
            tone={summary.eventsPending > 0 ? "text-amber-400" : "text-zinc-100"}
          />
        </section>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <Card
            title="/health"
            subtitle="État applicatif général"
            right={<Badge value={health?.ok ? "ok" : errors.health ? "error" : "—"} />}
          >
            {errors.health ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                {errors.health}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Stat label="App" value={String(health?.app || "—")} />
                <Stat label="Version" value={String(health?.version || "—")} />
                <Stat label="Worker" value={String(health?.worker || "—")} />
                <Stat
                  label="Capabilities"
                  value={formatNumber(health?.capabilities?.length || 0)}
                />
                <div className="md:col-span-2">
                  <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                    Capabilities
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(health?.capabilities || []).length > 0 ? (
                      health?.capabilities?.map((cap) => (
                        <span
                          key={cap}
                          className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
                        >
                          {cap}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-zinc-500">Aucune donnée</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card
            title="/health/score"
            subtitle="Score de santé agrégé"
            right={
              <div className={classNames("text-2xl font-semibold", scoreTone(healthScore?.score))}>
                {healthScore?.score ?? "—"}
              </div>
            }
          >
            {errors.healthScore ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                {errors.healthScore}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={classNames(
                      "h-full rounded-full transition-all",
                      typeof healthScore?.score === "number" && healthScore.score >= 90
                        ? "bg-emerald-400"
                        : typeof healthScore?.score === "number" &&
                            healthScore.score >= 70
                          ? "bg-amber-400"
                          : "bg-rose-400"
                    )}
                    style={{ width: `${Math.max(0, Math.min(healthScore?.score ?? 0, 100))}%` }}
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                    Issues
                  </div>
                  {(healthScore?.issues || []).length > 0 ? (
                    <ul className="space-y-2 text-sm text-zinc-300">
                      {healthScore?.issues?.map((issue, idx) => (
                        <li
                          key={`${issue}-${idx}`}
                          className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
                        >
                          {issue}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-500">
                      Aucune issue remontée
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card
            title="/runs"
            subtitle="Historique récent des runs"
            right={<Badge value={runs?.count ?? 0} />}
          >
            {errors.runs ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                {errors.runs}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <Stat label="Running" value={runs?.stats?.running ?? 0} />
                  <Stat label="Done" value={runs?.stats?.done ?? 0} />
                  <Stat
                    label="Error"
                    value={runs?.stats?.error ?? 0}
                    tone={(runs?.stats?.error ?? 0) > 0 ? "text-rose-400" : "text-zinc-100"}
                  />
                  <Stat
                    label="Unsupported"
                    value={runs?.stats?.unsupported ?? 0}
                    tone={
                      (runs?.stats?.unsupported ?? 0) > 0
                        ? "text-amber-400"
                        : "text-zinc-100"
                    }
                  />
                  <Stat label="Other" value={runs?.stats?.other ?? 0} />
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="min-w-full divide-y divide-zinc-800 text-sm">
                    <thead className="bg-zinc-950/80 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Run</th>
                        <th className="px-4 py-3 text-left font-medium">Capability</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Priority</th>
                        <th className="px-4 py-3 text-left font-medium">Started</th>
                        <th className="px-4 py-3 text-left font-medium">Finished</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {(runs?.runs || []).length > 0 ? (
                        runs?.runs?.map((run) => (
                          <tr key={run.id} className="bg-zinc-900/30">
                            <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                              {run.run_id || run.id}
                            </td>
                            <td className="px-4 py-3 text-zinc-200">
                              {run.capability || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge value={run.status} />
                            </td>
                            <td className="px-4 py-3 text-zinc-300">
                              {run.priority ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-zinc-400">
                              {formatDate(run.started_at)}
                            </td>
                            <td className="px-4 py-3 text-zinc-400">
                              {formatDate(run.finished_at)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-sm text-zinc-500"
                          >
                            Aucune donnée
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <details className="group">
                  <summary className="cursor-pointer text-sm text-zinc-400 marker:text-zinc-600">
                    Réponse brute
                  </summary>
                  <div className="mt-3">
                    <JsonBlock data={runs} />
                  </div>
                </details>
              </div>
            )}
          </Card>

          <Card
            title="/commands"
            subtitle="État de la file de commandes"
            right={<Badge value={commands?.count ?? 0} />}
          >
            {errors.commands ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                {errors.commands}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                  <Stat label="Queued" value={commands?.stats?.queued ?? 0} />
                  <Stat label="Running" value={commands?.stats?.running ?? 0} />
                  <Stat label="Done" value={commands?.stats?.done ?? 0} />
                  <Stat
                    label="Error"
                    value={commands?.stats?.error ?? 0}
                    tone={
                      (commands?.stats?.error ?? 0) > 0
                        ? "text-rose-400"
                        : "text-zinc-100"
                    }
                  />
                  <Stat
                    label="Blocked"
                    value={commands?.stats?.blocked ?? 0}
                    tone={
                      (commands?.stats?.blocked ?? 0) > 0
                        ? "text-rose-400"
                        : "text-zinc-100"
                    }
                  />
                  <Stat label="Other" value={commands?.stats?.other ?? 0} />
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="min-w-full divide-y divide-zinc-800 text-sm">
                    <thead className="bg-zinc-950/80 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Command</th>
                        <th className="px-4 py-3 text-left font-medium">Capability</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Retry</th>
                        <th className="px-4 py-3 text-left font-medium">Priority</th>
                        <th className="px-4 py-3 text-left font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {(commands?.commands || []).length > 0 ? (
                        commands?.commands?.map((command) => (
                          <tr key={command.id} className="bg-zinc-900/30">
                            <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                              {command.id}
                            </td>
                            <td className="px-4 py-3 text-zinc-200">
                              {command.capability || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge value={command.status} />
                            </td>
                            <td className="px-4 py-3 text-zinc-300">
                              {command.retry_count ?? 0}
                            </td>
                            <td className="px-4 py-3 text-zinc-300">
                              {command.priority ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-zinc-400">
                              {formatDate(command.created_at)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-sm text-zinc-500"
                          >
                            Aucune donnée
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <details className="group">
                  <summary className="cursor-pointer text-sm text-zinc-400 marker:text-zinc-600">
                    Réponse brute
                  </summary>
                  <div className="mt-3">
                    <JsonBlock data={commands} />
                  </div>
                </details>
              </div>
            )}
          </Card>

          <Card
            title="/sla"
            subtitle="Suivi SLA et incidents"
            right={<Badge value={sla?.count ?? 0} />}
          >
            {errors.sla ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                {errors.sla}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Stat label="Items" value={sla?.count ?? 0} />
                  <Stat
                    label="Breached"
                    value={sla?.breached ?? 0}
                    tone={(sla?.breached ?? 0) > 0 ? "text-rose-400" : "text-zinc-100"}
                  />
                  <Stat
                    label="Warning"
                    value={sla?.warning ?? 0}
                    tone={(sla?.warning ?? 0) > 0 ? "text-amber-400" : "text-zinc-100"}
                  />
                  <Stat label="OK" value={sla?.ok_count ?? 0} />
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="min-w-full divide-y divide-zinc-800 text-sm">
                    <thead className="bg-zinc-950/80 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Item</th>
                        <th className="px-4 py-3 text-left font-medium">SLA</th>
                        <th className="px-4 py-3 text-left font-medium">Remaining</th>
                        <th className="px-4 py-3 text-left font-medium">Priority</th>
                        <th className="px-4 py-3 text-left font-medium">Owner</th>
                        <th className="px-4 py-3 text-left font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {(sla?.items || []).length > 0 ? (
                        sla?.items?.map((item) => (
                          <tr key={item.id} className="bg-zinc-900/30">
                            <td className="px-4 py-3 text-zinc-200">
                              {item.name || item.title || item.id}
                            </td>
                            <td className="px-4 py-3">
                              <Badge value={item.sla_status} />
                            </td>
                            <td className="px-4 py-3 text-zinc-300">
                              {item.remaining_minutes ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-zinc-300">
                              {item.priority ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-zinc-300">
                              {item.owner || "—"}
                            </td>
                            <td className="px-4 py-3 text-zinc-400">
                              {formatDate(item.updated_at)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-sm text-zinc-500"
                          >
                            Aucune donnée
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <details className="group">
                  <summary className="cursor-pointer text-sm text-zinc-400 marker:text-zinc-600">
                    Réponse brute
                  </summary>
                  <div className="mt-3">
                    <JsonBlock data={sla} />
                  </div>
                </details>
              </div>
            )}
          </Card>

          <Card
            title="/events"
            subtitle="Pipeline d’événements"
            right={<Badge value={events?.count ?? 0} />}
          >
            {errors.events ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                {errors.events}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Stat label="Pending" value={events?.stats?.pending ?? 0} />
                  <Stat label="Processed" value={events?.stats?.processed ?? 0} />
                  <Stat
                    label="Failed"
                    value={events?.stats?.failed ?? 0}
                    tone={
                      (events?.stats?.failed ?? 0) > 0
                        ? "text-rose-400"
                        : "text-zinc-100"
                    }
                  />
                  <Stat label="Other" value={events?.stats?.other ?? 0} />
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="min-w-full divide-y divide-zinc-800 text-sm">
                    <thead className="bg-zinc-950/80 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Event</th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Source</th>
                        <th className="px-4 py-3 text-left font-medium">Run</th>
                        <th className="px-4 py-3 text-left font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {(events?.events || []).length > 0 ? (
                        events?.events?.map((event) => (
                          <tr key={event.id} className="bg-zinc-900/30">
                            <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                              {event.id}
                            </td>
                            <td className="px-4 py-3 text-zinc-200">
                              {event.event_type || event.type || "—"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge value={event.status} />
                            </td>
                            <td className="px-4 py-3 text-zinc-300">
                              {event.source || "—"}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                              {event.run_id || "—"}
                            </td>
                            <td className="px-4 py-3 text-zinc-400">
                              {formatDate(event.created_at)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-sm text-zinc-500"
                          >
                            Aucune donnée
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <details className="group">
                  <summary className="cursor-pointer text-sm text-zinc-400 marker:text-zinc-600">
                    Réponse brute
                  </summary>
                  <div className="mt-3">
                    <JsonBlock data={events} />
                  </div>
                </details>
              </div>
            )}
          </Card>
        </div>

        <footer className="mt-8 flex flex-col gap-2 border-t border-zinc-900 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Dernière actualisation : {lastRefresh ? formatDate(lastRefresh) : "—"}
          </div>
          <div>Cache : no-store</div>
        </footer>
      </div>
    </main>
  );
}
