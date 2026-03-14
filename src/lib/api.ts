const API_BASE_URL =
  process.env.NEXT_PUBLIC_BOSAI_API_URL?.replace(/\/$/, "") ||
  "";

async function fetchJson<T>(path: string): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_BOSAI_API_URL manquant");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${path} failed: ${response.status} ${text}`);
  }

  return response.json() as Promise<T>;
}

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
  retry_count?: number;
  retry_max?: number;
  scheduled_at?: string;
  next_retry_at?: string;
  is_locked?: boolean;
  locked_by?: string;
  idempotency_key?: string;
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

export type EventItem = {
  id: string;
  event_type?: string;
  status?: string;
  command_created?: boolean;
  linked_command?: string[];
  mapped_capability?: string;
  processed_at?: string;
  source?: string | null;
  run_id?: string | null;
  command_id?: string | null;
  payload?: Record<string, unknown>;
};

export type EventsResponse = {
  ok?: boolean;
  count?: number;
  stats?: {
    new?: number;
    queued?: number;
    processed?: number;
    ignored?: number;
    error?: number;
    other?: number;
  };
  events?: EventItem[];
  ts?: string;
};

export type IncidentItem = {
  id: string;
  title?: string;
  status?: string;
  severity?: string;
  sla_status?: string;
  created_at?: string;
  source?: string;
  worker?: string;
};

export type IncidentsResponse = {
  ok?: boolean;
  count?: number;
  stats?: {
    open?: number;
    critical?: number;
    warning?: number;
    resolved?: number;
    other?: number;
  };
  incidents?: IncidentItem[];
  ts?: string;
};
export type SlaItem = {
  id: string;
  name?: string;
  sla_status?: string;
  sla_remaining_minutes?: number;
  escalation_queued?: boolean;
  last_sla_check?: string;
  linked_run?: string[] | string | null;
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
  incidents?: SlaItem[];
  ts?: string;
};

export async function fetchHealthScore() {
  return fetchJson<HealthScoreResponse>("/health/score");
}

export async function fetchRuns() {
  return fetchJson<RunsResponse>("/runs?limit=20");
}

export async function fetchCommands() {
  return fetchJson<CommandsResponse>("/commands?limit=20");
}

export async function fetchEvents() {
  return fetchJson<EventsResponse>("/events?limit=20");
}

export async function fetchIncidents() {
  return fetchJson<IncidentsResponse>("/incidents");
}
export async function fetchSla() {
  return fetchJson<SlaResponse>("/sla?limit=20");
}
