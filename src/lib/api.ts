type FetchOptions = {
  revalidate?: number;
};

const DEFAULT_REVALIDATE = 10;

function getWorkerBaseUrl(): string {
  const baseUrl =
    process.env.BOSAI_WORKER_URL ||
    process.env.NEXT_PUBLIC_BOSAI_WORKER_URL ||
    "https://bosai-worker.onrender.com";

  return baseUrl.replace(/\/+$/, "");
}

async function fetchJson<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const baseUrl = getWorkerBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: options.revalidate ?? DEFAULT_REVALIDATE,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Request failed (${response.status}) ${path}: ${text}`);
  }

  return (await response.json()) as T;
}

export type HealthResponse = {
  ok?: boolean;
  app?: string;
  version?: string;
  worker?: string;
  capabilities?: string[];
  policies_loaded?: boolean;
  policy_keys?: string[];
  ts?: string;
};

export type HealthScoreResponse = {
  ok?: boolean;
  score?: number;
  issues?: string[];
  ts?: string;
};

export type RunItem = {
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

export type RunsResponse = {
  ok?: boolean;
  count?: number;
  stats?: {
    running?: number;
    done?: number;
    error?: number;
    unsupported?: number;
    other?: number;
  };
  runs?: RunItem[];
  ts?: string;
};

export type CommandItem = {
  id: string;
  capability?: string;
  status?: string;
  priority?: number;
  retry_count?: number | null;
  retry_max?: number | null;
  scheduled_at?: string | null;
  next_retry_at?: string | null;
  is_locked?: boolean | null;
  locked_by?: string | null;
  idempotency_key?: string | null;
};

export type CommandsResponse = {
  ok?: boolean;
  count?: number;
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
  commands?: CommandItem[];
  ts?: string;
};

export type IncidentItem = {
  id: string;
  name?: string;
  sla_status?: string;
  sla_remaining_minutes?: number | null;
  escalation_queued?: boolean;
  last_sla_check?: string | null;
  linked_run?: string[] | null;
};

export type SlaResponse = {
  ok?: boolean;
  count?: number;
  stats?: {
    ok?: number;
    warning?: number;
    breached?: number;
    escalated?: number;
    unknown?: number;
    escalation_queued?: number;
  };
  incidents?: IncidentItem[];
  ts?: string;
};

export async function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/health");
}

export async function fetchHealthScore(): Promise<HealthScoreResponse> {
  return fetchJson<HealthScoreResponse>("/health/score");
}

export async function fetchRuns(limit = 6): Promise<RunsResponse> {
  return fetchJson<RunsResponse>(`/runs?limit=${limit}`);
}

export async function fetchCommands(limit = 6): Promise<CommandsResponse> {
  return fetchJson<CommandsResponse>(`/commands?limit=${limit}`);
}

export async function fetchSla(limit = 10): Promise<SlaResponse> {
  return fetchJson<SlaResponse>(`/sla?limit=${limit}`);
}
