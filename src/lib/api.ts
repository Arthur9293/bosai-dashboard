export const WORKER_BASE_URL =
  process.env.NEXT_PUBLIC_WORKER_URL?.replace(/\/$/, "") ||
  "https://bosai-worker.onrender.com";

export type CommandItem = {
  id: string;
  capability?: string;
  status?: string;
  priority?: number;
  created_at?: string;
  updated_at?: string;
  dry_run?: boolean | null;
  worker?: string;
};

export type CommandsResponse = {
  ok?: boolean;
  count?: number;
  commands?: CommandItem[];
  stats?: {
    queue?: number;
    running?: number;
    done?: number;
    error?: number;
    other?: number;
  };
  ts?: string;
};

export async function fetchCommands(): Promise<CommandsResponse> {
  const res = await fetch(`${WORKER_BASE_URL}/commands`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Impossible de charger /commands (${res.status})`);
  }

  return res.json();
}

export type RunItem = {
  id?: string;
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

export async function fetchRuns(): Promise<RunsResponse> {
  const res = await fetch(`${WORKER_BASE_URL}/runs`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Impossible de charger /runs (${res.status})`);
  }

  return res.json();
}

export type HealthScoreResponse = {
  ok?: boolean;
  score?: number;
  issues?: string[];
  ts?: string;
};

export async function fetchHealthScore(): Promise<HealthScoreResponse> {
  const res = await fetch(`${WORKER_BASE_URL}/health/score`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Impossible de charger /health/score (${res.status})`);
  }

  return res.json();
}
export type IncidentItem = {
  id?: string;
  title?: string;
  status?: string;
  severity?: string;
  sla_status?: string;
  created?: string;
  worker?: string;
};

export type IncidentsResponse = {
  ok?: boolean;
  count?: number;
  incidents?: IncidentItem[];
};

export async function fetchIncidents(): Promise<IncidentsResponse> {
  const res = await fetch(`/api/incidents`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Impossible de charger /incidents (${res.status})`);
  }

  const json = await res.json();

  return {
    ok: Boolean(json?.ok),
    count: Number(json?.count ?? 0),
    incidents: Array.isArray(json?.data) ? json.data : [],
  };
}
