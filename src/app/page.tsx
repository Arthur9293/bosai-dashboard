"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type HealthResponse = {
  ok?: boolean;
  app?: string;
  version?: string;
  worker?: string;
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

type IncidentItem = {
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
  incidents?: IncidentItem[];
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

type EventItem = {
  id: string;
  event_type?: string;
  status?: string;
  command_created?: boolean;
  linked_command?: string[] | null;
  mapped_capability?: string;
  processed_at?: string;
  source?: string | null;
  run_id?: string | null;
  command_id?: string | null;
  payload?: Record<string, unknown>;
};

type EventsResponse = {
  ok?: boolean;
  count?: number;
  events?: EventItem[];
  stats?: {
    queued?: number;
    processed?: number;
    ignored?: number;
    error?: number;
    other?: number;
  };
  ts?: string;
};

type LoadState = {
  loading: boolean;
  error: string | null;
};

const WORKER_BASE_URL =
  process.env.NEXT_PUBLIC_BOSAI_WORKER_URL?.replace(/\/+$/, "") || "";

function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatRelativeMinutes(value?: number | string | null): string {
  if (value === null || value === undefined || value === "") return "—";

  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return "—";

  return `${num} min`;
}

function joinIssues(issues?: string[]): string {
  if (!issues || issues.length === 0) return "Aucune alerte";
  return issues.slice(0, 3).join(" • ");
}

function getWorkerStatus(
  health?: HealthResponse | null,
  score?: HealthScoreResponse | null,
  error?: string | null,
): { label: string; tone: string } {
  if (error) {
    return { label: "Offline", tone: "bg-red-500/15 text-red-300 ring-red-500/30" };
  }

  if (!health?.ok) {
    return { label: "Degraded", tone: "bg-amber-500/15 text-amber-300 ring-amber-500/30" };
  }

  const rawScore = score?.score ?? 0;

  if (rawScore >= 85) {
    return { label: "Online", tone: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" };
  }

  if (rawScore >= 60) {
    return { label: "Degraded", tone: "bg-amber-500/15 text-amber-300 ring-amber-500/30" };
  }

  return { label: "At Risk", tone: "bg-red-500/15 text-red-300 ring-red-500/30" };
}

function statusTone(status?: string): string {
  const s = (status || "").toLowerCase();

  if (["done", "active", "enabled", "processed", "ok"].includes(s)) {
    return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
  }

  if (["queued", "queue", "running", "testing"].includes(s)) {
    return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
  }

  if (["retry", "warning", "paused"].includes(s)) {
    return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
  }

  if (["dead", "blocked", "error", "breached", "escalated", "unsupported"].includes(s)) {
    return "bg-red-500/15 text-red-300 ring-red-500/30";
  }

  return "bg-white/10 text-zinc-300 ring-white/10";
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-zinc-400">{hint || "—"}</div>
    </div>
  );
}

function SectionCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function SmallBadge({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1 ${className}`}>
      {text}
    </span>
  );
}

export default function BosaiOverviewPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScoreResponse | null>(null);
  const [runs, setRuns] = useState<RunsResponse | null>(null);
  const [commands, setCommands] = useState<CommandsResponse | null>(null);
  const [sla, setSla] = useState<SlaResponse | null>(null);
  const [events, setEvents] = useState<EventsResponse | null>(null);

  const [state, setState] = useState<LoadState>({ loading: true, error: null });

  const fetchJson = useCallback(async <T,>(path: string): Promise<T> => {
    if (!WORKER_BASE_URL) {
      throw new Error("NEXT_PUBLIC_BOSAI_WORKER_URL manquant");
    }

    const response = await fetch(`${WORKER_BASE_URL}${path}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`GET ${path} failed (${response.status})`);
    }

    return (await response.json()) as T;
  }, []);

  const loadAll = useCallback(async () => {
    try {
      setState({ loading: true, error: null });

      const [
        healthData,
        healthScoreData,
        runsData,
        commandsData,
        slaData,
        eventsData,
      ] = await Promise.all([
        fetchJson<HealthResponse>("/health"),
        fetchJson<HealthScoreResponse>("/health/score"),
        fetchJson<RunsResponse>("/runs?limit=8"),
        fetchJson<CommandsResponse>("/commands?limit=8"),
        fetchJson<SlaResponse>("/sla?limit=8"),
        fetchJson<EventsResponse>("/events?limit=8"),
      ]);

      setHealth(healthData);
      setHealthScore(healthScoreData);
      setRuns(runsData);
      setCommands(commandsData);
      setSla(slaData);
      setEvents(eventsData);

      setState({ loading: false, error: null });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      setState({ loading: false, error: message });
    }
  }, [fetchJson]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const worker = getWorkerStatus(health, healthScore, state.error);

  const totalRuns = runs?.count ?? 0;
  const commandsQueued = commands?.stats?.queued ?? 0;
  const commandsFailed =
    (commands?.stats?.dead ?? 0) +
    (commands?.stats?.error ?? 0) +
    (commands?.stats?.blocked ?? 0);

  const breachedIncidents =
    (sla?.stats?.breached ?? 0) + (sla?.stats?.escalated ?? 0);

  const capabilitySnapshot = useMemo(() => {
    const recentCommandCapabilities = new Set(
      (commands?.commands ?? []).map((item) => item.capability).filter(Boolean),
    );
    const recentEventCapabilities = new Set(
      (events?.events ?? []).map((item) => item.mapped_capability).filter(Boolean),
    );

    const unique = new Set([
      ...Array.from(recentCommandCapabilities),
      ...Array.from(recentEventCapabilities),
    ]);

    return {
      totalVisible: unique.size,
      recentHttpExec: (commands?.commands ?? []).filter(
        (item) => item.capability === "http_exec",
      ).length,
      recentEventEngine: (commands?.commands ?? []).filter(
        (item) => item.capability === "event_engine",
      ).length,
      recentCommandOrchestrator: (commands?.commands ?? []).filter(
        (item) => item.capability === "command_orchestrator",
      ).length,
    };
  }, [commands, events]);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">
                Business Operating System for AI
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                BOSAI Runtime Control Center
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                Vue d’ensemble du worker, des commandes, des événements et de la santé opérationnelle.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SmallBadge text={worker.label} className={worker.tone} />
              <SmallBadge
                text={`v${health?.version ?? "—"}`}
                className="bg-white/10 text-zinc-200 ring-white/10"
              />
              <button
                onClick={() => void loadAll()}
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15"
              >
                Actualiser
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
            <div>
              <span className="text-zinc-500">Worker :</span>{" "}
              <span className="text-zinc-200">{health?.worker ?? "—"}</span>
            </div>
            <div>
              <span className="text-zinc-500">App :</span>{" "}
              <span className="text-zinc-200">{health?.app ?? "—"}</span>
            </div>
            <div>
              <span className="text-zinc-500">Dernière mise à jour :</span>{" "}
              <span className="text-zinc-200">{formatDateTime(health?.ts)}</span>
            </div>
            <div>
              <span className="text-zinc-500">Source :</span>{" "}
              <span className="text-zinc-200">
                {WORKER_BASE_URL || "NEXT_PUBLIC_BOSAI_WORKER_URL non défini"}
              </span>
            </div>
          </div>
        </header>

        {state.error && (
          <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Erreur de chargement : {state.error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            label="Worker Status"
            value={worker.label}
            hint={health?.worker ?? "—"}
          />
          <MetricCard
            label="Health Score"
            value={healthScore?.score ?? "—"}
            hint={joinIssues(healthScore?.issues)}
          />
          <MetricCard
            label="Runs"
            value={totalRuns}
            hint={`Done: ${runs?.stats?.done ?? 0} • Error: ${runs?.stats?.error ?? 0}`}
          />
          <MetricCard
            label="Commands Queued"
            value={commandsQueued}
            hint={`Running: ${commands?.stats?.running ?? 0}`}
          />
          <MetricCard
            label="Commands Failed"
            value={commandsFailed}
            hint={`Dead: ${commands?.stats?.dead ?? 0} • Blocked: ${commands?.stats?.blocked ?? 0}`}
          />
          <MetricCard
            label="Breached Incidents"
            value={breachedIncidents}
            hint={`Warning: ${sla?.stats?.warning ?? 0}`}
          />
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard
            title="Recent Commands"
            right={
              <div className="flex gap-2">
                <SmallBadge
                  text={`Queued ${commands?.stats?.queued ?? 0}`}
                  className="bg-sky-500/15 text-sky-300 ring-sky-500/30"
                />
                <SmallBadge
                  text={`Done ${commands?.stats?.done ?? 0}`}
                  className="bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                />
              </div>
            }
          >
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-[1.3fr_1fr_0.9fr] gap-3 border-b border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.16em] text-zinc-400">
                <div>Capability</div>
                <div>Status</div>
                <div>Planifiée</div>
              </div>

              {(commands?.commands ?? []).length === 0 ? (
                <div className="px-4 py-6 text-sm text-zinc-400">
                  {state.loading ? "Chargement..." : "Aucune commande visible."}
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {(commands?.commands ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1.3fr_1fr_0.9fr] gap-3 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">
                          {item.capability || "—"}
                        </div>
                        <div className="truncate text-xs text-zinc-500">
                          {item.idempotency_key || item.id}
                        </div>
                      </div>
                      <div>
                        <SmallBadge
                          text={item.status || "unknown"}
                          className={statusTone(item.status)}
                        />
                      </div>
                      <div className="text-zinc-300">
                        {formatDateTime(item.scheduled_at || item.next_retry_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Recent Events"
            right={
              <div className="flex gap-2">
                <SmallBadge
                  text={`Processed ${events?.stats?.processed ?? 0}`}
                  className="bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                />
                <SmallBadge
                  text={`Queued ${events?.stats?.queued ?? 0}`}
                  className="bg-sky-500/15 text-sky-300 ring-sky-500/30"
                />
              </div>
            }
          >
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-3 border-b border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.16em] text-zinc-400">
                <div>Event</div>
                <div>Status</div>
                <div>Capability</div>
              </div>

              {(events?.events ?? []).length === 0 ? (
                <div className="px-4 py-6 text-sm text-zinc-400">
                  {state.loading ? "Chargement..." : "Aucun event visible."}
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {(events?.events ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1.2fr_1fr_1fr] gap-3 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">
                          {item.event_type || "—"}
                        </div>
                        <div className="truncate text-xs text-zinc-500">
                          {item.source || item.id}
                        </div>
                      </div>
                      <div>
                        <SmallBadge
                          text={item.status || "unknown"}
                          className={statusTone(item.status)}
                        />
                      </div>
                      <div className="truncate text-zinc-300">
                        {item.mapped_capability || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard
            title="SLA / Incidents"
            right={
              <div className="flex gap-2">
                <SmallBadge
                  text={`Warning ${sla?.stats?.warning ?? 0}`}
                  className="bg-amber-500/15 text-amber-300 ring-amber-500/30"
                />
                <SmallBadge
                  text={`Breached ${sla?.stats?.breached ?? 0}`}
                  className="bg-red-500/15 text-red-300 ring-red-500/30"
                />
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">OK</div>
                <div className="mt-2 text-2xl font-semibold">{sla?.stats?.ok ?? 0}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Warning</div>
                <div className="mt-2 text-2xl font-semibold">{sla?.stats?.warning ?? 0}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Breached</div>
                <div className="mt-2 text-2xl font-semibold">{sla?.stats?.breached ?? 0}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Escalated</div>
                <div className="mt-2 text-2xl font-semibold">{sla?.stats?.escalated ?? 0}</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-3 border-b border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.16em] text-zinc-400">
                <div>Incident</div>
                <div>Status</div>
                <div>Remaining</div>
              </div>

              {(sla?.incidents ?? []).length === 0 ? (
                <div className="px-4 py-6 text-sm text-zinc-400">
                  {state.loading ? "Chargement..." : "Aucun incident visible."}
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {(sla?.incidents ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-3 px-4 py-3 text-sm"
                    >
                      <div className="truncate font-medium text-white">
                        {item.name || item.id}
                      </div>
                      <div>
                        <SmallBadge
                          text={item.sla_status || "unknown"}
                          className={statusTone(item.sla_status)}
                        />
                      </div>
                      <div className="text-zinc-300">
                        {formatRelativeMinutes(item.sla_remaining_minutes)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Capability Snapshot">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Visible</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {capabilitySnapshot.totalVisible}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">HTTP Exec</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {capabilitySnapshot.recentHttpExec}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Event Engine</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {capabilitySnapshot.recentEventEngine}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">
                  Command Orchestrator
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {capabilitySnapshot.recentCommandOrchestrator}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
              <div className="font-medium text-white">Résumé runtime</div>
              <p className="mt-2 leading-6 text-zinc-400">
                Cette vue Overview lit directement le worker BOSAI et agrège santé,
                queue, événements et incidents. La partie Governance détaillée pourra
                être branchée ensuite avec les endpoints read-only dédiés.
              </p>
            </div>
          </SectionCard>
        </section>
      </div>
    </main>
  );
}
