const BASE_URL =
  process.env.BOSAI_WORKER_BASE_URL ||
  process.env.NEXT_PUBLIC_BOSAI_WORKER_BASE_URL ||
  "";

async function safeFetch<T>(path: string): Promise<T> {
  if (!BASE_URL) {
    throw new Error("Missing BOSAI worker base URL");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export type HealthScoreResponse = {
  score?: number;
  status?: string;
  details?: Record<string, unknown>;
};

export type RunsResponse = {
  count?: number;
  runs?: Array<Record<string, unknown>>;
  stats?: {
    running?: number;
    queued?: number;
    done?: number;
    error?: number;
    [key: string]: number | undefined;
  };
};

export type CommandItem = {
  id: string;
  name?: string;
  status?: string;
  capability?: string;
  tool_key?: string;
  tool_mode?: string;
  workspace_id?: string;
  flow_id?: string;
  root_event_id?: string;
  linked_run?: string;
  run_record_id?: string;
  created_at?: string;
  updated_at?: string;
  finished_at?: string;
  started_at?: string;
  parent_command_id?: string;
  step_index?: number;
  worker?: string;
  error?: string;
  result?: unknown;
  input?: unknown;
  [key: string]: unknown;
};

export type CommandsResponse = {
  count?: number;
  commands?: CommandItem[];
  stats?: {
    queue?: number;
    queued?: number;
    running?: number;
    retry?: number;
    dead?: number;
    done?: number;
    error?: number;
    [key: string]: number | undefined;
  };
};

export type EventsResponse = {
  count?: number;
  events?: Array<Record<string, unknown>>;
  stats?: {
    new?: number;
    queued?: number;
    processed?: number;
    error?: number;
    ignored?: number;
    [key: string]: number | undefined;
  };
};

export type IncidentItem = {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  statut_incident?: string;
  severity?: string;
  sla_status?: string;
  sla_remaining_minutes?: number;
  opened_at?: string;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
  workspace_id?: string;
  workspace?: string;
  run_record_id?: string;
  linked_run?: string;
  run_id?: string;
  command_id?: string;
  linked_command?: string;
  flow_id?: string;
  root_event_id?: string;
  category?: string;
  reason?: string;
  source?: string;
  worker?: string;
  error_id?: string;
  resolution_note?: string;
  last_action?: string;
  decision_status?: string;
  decision_reason?: string;
  next_action?: string;
  priority_score?: number | string;
  [key: string]: unknown;
};

export type IncidentsResponse = {
  count?: number;
  incidents?: IncidentItem[];
  stats?: {
    open?: number;
    critical?: number;
    warning?: number;
    resolved?: number;
    [key: string]: number | undefined;
  };
};

export type ToolItem = {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  category?: string;
  tool_key?: string;
  tool_mode?: string;
  enabled?: boolean;
  [key: string]: unknown;
};

export type ToolsResponse = {
  count?: number;
  tools?: ToolItem[];
};

export type PolicyItem = {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  type?: string;
  category?: string;
  enabled?: boolean;
  value?: unknown;
  [key: string]: unknown;
};

export type PoliciesResponse = {
  count?: number;
  policies?: PolicyItem[];
};

export type FlowDetail = {
  id?: string;
  flow_id?: string;
  root_event_id?: string;
  workspace_id?: string;
  count?: number;
  commands?: CommandItem[];
  stats?: {
    done?: number;
    error?: number;
    dead?: number;
    running?: number;
    retry?: number;
    [key: string]: number | undefined;
  };
  [key: string]: unknown;
};

export type FlowsResponse = {
  count?: number;
  flows?: FlowDetail[];
};

export async function fetchHealthScore(): Promise<HealthScoreResponse> {
  return safeFetch<HealthScoreResponse>("/health/score");
}

export async function fetchRuns(): Promise<RunsResponse> {
  return safeFetch<RunsResponse>("/runs");
}

export async function fetchCommands(): Promise<CommandsResponse> {
  return safeFetch<CommandsResponse>("/commands");
}

export async function fetchCommandById(id: string): Promise<CommandItem | null> {
  const data = await fetchCommands();
  const commands = Array.isArray(data?.commands) ? data.commands : [];
  const match = commands.find((item) => String(item.id) === String(id));
  return match ?? null;
}

export async function fetchEvents(): Promise<EventsResponse> {
  return safeFetch<EventsResponse>("/events");
}

export async function fetchIncidents(): Promise<IncidentsResponse> {
  return safeFetch<IncidentsResponse>("/incidents");
}

export async function fetchTools(): Promise<ToolsResponse> {
  return safeFetch<ToolsResponse>("/tools");
}

export async function fetchPolicies(): Promise<PoliciesResponse> {
  return safeFetch<PoliciesResponse>("/policies");
}

export async function fetchFlows(): Promise<FlowsResponse> {
  return safeFetch<FlowsResponse>("/flows");
}

export async function fetchFlowById(id: string): Promise<FlowDetail | null> {
  const data = await fetchFlows();
  const flows = Array.isArray(data?.flows) ? data.flows : [];

  const match = flows.find(
    (item) =>
      String(item.id || "") === String(id) ||
      String(item.flow_id || "") === String(id)
  );

  return match ?? null;
}

export async function fetchIncidentsByFlowId(flowId: string): Promise<IncidentItem[]> {
  const data = await fetchIncidents();
  const incidents = Array.isArray(data?.incidents) ? data.incidents : [];

  return incidents.filter(
    (item) => String(item.flow_id || "") === String(flowId)
  );
}
