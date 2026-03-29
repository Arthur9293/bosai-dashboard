const API_BASE_URL =
  process.env.NEXT_PUBLIC_BOSAI_API_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_BOSAI_WORKER_BASE_URL?.replace(/\/$/, "") ||
  "";

async function fetchJson<T>(path: string): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_BOSAI_API_URL ou NEXT_PUBLIC_BOSAI_WORKER_BASE_URL manquant"
    );
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

/* ================= TYPES ================= */

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
  flow_id?: string;
  root_event_id?: string;
  event_id?: string;
  parent_command_id?: string;
  worker?: string;
  workspace_id?: string;
  started_at?: string;
  finished_at?: string;
  created_at?: string;
  step_index?: number;
  input?: Record<string, unknown>;
  input_json?: Record<string, unknown> | string | null;
  result_json?: Record<string, unknown> | string | null;
};

export type CommandsResponse = {
  ok?: boolean;
  count?: number;
  stats?: any;
  commands?: CommandItem[];
  ts?: string;
};

export type IncidentItem = {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  severity?: string;
  sla_status?: string;
  flow_id?: string;
  root_event_id?: string;
  linked_run?: string;
  linked_command?: string;
  command_id?: string;
  updated_at?: string;
};

export type IncidentsResponse = {
  ok?: boolean;
  count?: number;
  stats?: any;
  incidents?: IncidentItem[];
  ts?: string;
};

export type FlowCommandItem = {
  id: string;
  capability?: string;
  status?: string;
  parent_command_id?: string;
  step_index?: number;
};

export type FlowDetail = {
  id: string;
  flow_id?: string; // ✅ AJOUT IMPORTANT
  root_event_id?: string;
  workspace_id?: string;
  count?: number;
  stats?: any;
  commands?: FlowCommandItem[];
};

/* ================= HELPERS ================= */

type RawIncidentItem = Record<string, unknown>;

function toStringSafe(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = toStringSafe(value);
    if (text) return text;
  }
  return undefined;
}

function normalizeIncident(item: RawIncidentItem): IncidentItem {
  return {
    id:
      firstString(item.id, item.record_id) ||
      "unknown_incident",
    title: firstString(item.title, item.name, item.Name),
    name: firstString(item.name, item.Name),
    status: firstString(item.status, item.Status_select),
    severity: firstString(item.severity, item.Severity),
    sla_status: firstString(item.sla_status, item.SLA_Status),
    flow_id: firstString(item.flow_id, item.Flow_ID),
    root_event_id: firstString(item.root_event_id, item.Root_Event_ID),
    linked_run: firstString(item.linked_run, item.Linked_Run),
    linked_command: firstString(item.linked_command, item.Linked_Command),
    command_id: firstString(item.command_id, item.Command_ID),
    updated_at: firstString(item.updated_at, item.Updated_At),
  };
}

/* ================= API ================= */

export async function fetchHealthScore() {
  return fetchJson<HealthScoreResponse>("/health/score");
}

export async function fetchRuns() {
  return fetchJson<RunsResponse>("/runs?limit=20");
}

export async function fetchCommands() {
  return fetchJson<CommandsResponse>("/commands?limit=20");
}

export async function fetchCommandById(id: string): Promise<CommandItem> {
  const data = await fetchJson<{ command?: CommandItem } | CommandItem>(
    `/commands/${encodeURIComponent(id)}`
  );

  return "command" in data ? data.command! : data;
}

export async function fetchIncidents(): Promise<IncidentsResponse> {
  const raw = await fetchJson<any>("/incidents");

  return {
    ...raw,
    incidents: Array.isArray(raw?.incidents)
      ? raw.incidents.map(normalizeIncident)
      : [],
  };
}

/* ================= NOUVEAU ================= */

export async function fetchIncidentsByFlowId(
  flowId: string
): Promise<IncidentItem[]> {
  if (!flowId?.trim()) return [];

  const raw = await fetchJson<any>(
    `/incidents?flow_id=${encodeURIComponent(flowId)}`
  );

  return Array.isArray(raw?.incidents)
    ? raw.incidents.map(normalizeIncident)
    : [];
}

/* ================= FLOWS ================= */

export async function fetchFlowById(id: string): Promise<FlowDetail> {
  const data = await fetchJson<{ flow?: FlowDetail }>(
    `/flows/${encodeURIComponent(id)}`
  );

  if (!data?.flow) {
    throw new Error("fetchFlowById: réponse invalide");
  }

  return data.flow;
}
