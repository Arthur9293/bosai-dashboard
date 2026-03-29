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
  flowid?: string;
  root_event_id?: string;
  rooteventid?: string;
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
  flow_id?: string | null;
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
  name?: string;
  error_id?: string;
  status?: string;
  statut_incident?: string;
  severity?: string;
  sla_status?: string;
  sla_remaining_minutes?: number;
  workspace_id?: string;
  workspace?: string;
  linked_run?: string;
  linked_command?: string;
  command_id?: string;
  run_id?: string;
  run_record_id?: string;
  flow_id?: string;
  root_event_id?: string;
  category?: string;
  reason?: string;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
  opened_at?: string;
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

export type ToolItem = {
  name: string;
  status?: string;
  description?: string;
};

export type ToolsResponse = {
  ok?: boolean;
  tools?: ToolItem[];
};

export type PolicyItem = {
  id: string;
  name?: string;
  value?: string | number | boolean;
  description?: string;
};

export type PoliciesResponse = {
  ok?: boolean;
  policies?: PolicyItem[];
};

export type FlowCommandItem = {
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
  parent_command_id?: string;
  step_index?: number;
  input_json?: Record<string, unknown> | string | null;
  result_json?: Record<string, unknown> | string | null;
  worker?: string;
  workspace_id?: string;
  started_at?: string;
  finished_at?: string;
  created_at?: string;
};

export type FlowItem = {
  id: string;
  flow_id?: string;
  root_event_id?: string;
  workspace_id?: string;
  count?: number;
  is_synthetic?: boolean;
  commands?: FlowCommandItem[];
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
  started_at?: string;
  finished_at?: string;
  created_at?: string;
};

export type FlowsResponse = {
  ok?: boolean;
  count?: number;
  stats?: {
    linked?: number;
    synthetic?: number;
  };
  flows?: FlowItem[];
  ts?: string;
};

export type FlowDetail = {
  id: string;
  flow_id?: string;
  count?: number;
  root_event_id?: string;
  workspace_id?: string;
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
  commands?: FlowCommandItem[];
};

type RawIncidentItem = Record<string, unknown>;

function toStringSafe(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
}

function toNumberSafe(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = toStringSafe(value);
    if (text) return text;
  }
  return undefined;
}

function normalizeIncident(item: RawIncidentItem): IncidentItem {
  const id =
    firstString(
      item.id,
      item.record_id,
      item.incident_record_id,
      item.incidentid
    ) || "unknown_incident";

  const severity = firstString(
    item.severity,
    item.Severity,
    item.urgence,
    item.priority
  );

  const slaStatus = firstString(
    item.sla_status,
    item.SLA_Status,
    item.slaStatus,
    item.status_sla
  );

  const status = firstString(
    item.status_select,
    item.Status_select,
    item.Status,
    item.status,
    item.statut_incident
  );

  const title = firstString(
    item.title,
    item.name,
    item.Name,
    item.error_id,
    item.incident_code
  );

  const runRecordId = firstString(
    item.run_record_id,
    item.Run_Record_ID,
    item.run_id,
    item.Run_ID
  );

  return {
    id,
    title,
    name: firstString(item.name, item.Name),
    error_id: firstString(item.error_id, item.errorId, item.incident_code),
    status,
    statut_incident: firstString(item.statut_incident),
    severity,
    sla_status: slaStatus,
    sla_remaining_minutes: toNumberSafe(
      item.sla_remaining_minutes ?? item.SLA_Remaining_Minutes
    ),
    workspace_id: firstString(
      item.workspace_id,
      item.workspaceId,
      item.Workspace_ID
    ),
    workspace: firstString(item.workspace, item.workspace_name),
    linked_run: firstString(item.linked_run, item.Linked_Run, runRecordId),
    linked_command: firstString(item.linked_command, item.Linked_Command),
    command_id: firstString(item.command_id, item.Command_ID),
    run_id: firstString(item.run_id, item.Run_ID, runRecordId),
    run_record_id: runRecordId,
    flow_id: firstString(item.flow_id, item.Flow_ID),
    root_event_id: firstString(item.root_event_id, item.Root_Event_ID),
    category: firstString(item.category, item.Category),
    reason: firstString(item.reason, item.Reason),
    created_at: firstString(item.created_at, item.Created_At, item.createdTime),
    updated_at: firstString(item.updated_at, item.Updated_At, item.lastModified),
    resolved_at: firstString(item.resolved_at, item.Resolved_At),
    opened_at: firstString(item.opened_at, item.Opened_At),
    source: firstString(item.source),
    worker: firstString(item.worker),
  };
}

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
  if (!id?.trim()) {
    throw new Error("fetchCommandById: id manquant");
  }

  const data = await fetchJson<{ command?: CommandItem } | CommandItem>(
    `/commands/${encodeURIComponent(id)}`
  );

  const command =
    typeof data === "object" && data !== null && "command" in data
      ? data.command
      : data;

  if (!command || typeof command !== "object" || !("id" in command)) {
    throw new Error("fetchCommandById: réponse invalide");
  }

  return command as CommandItem;
}

export async function fetchEvents() {
  return fetchJson<EventsResponse>("/events?limit=20");
}

export async function fetchIncidents(): Promise<IncidentsResponse> {
  const raw = await fetchJson<{
    ok?: boolean;
    count?: number;
    stats?: IncidentsResponse["stats"];
    incidents?: RawIncidentItem[];
    ts?: string;
  }>("/incidents");

  const incidents = Array.isArray(raw?.incidents)
    ? raw.incidents.map(normalizeIncident)
    : [];

  return {
    ok: raw?.ok,
    count: raw?.count ?? incidents.length,
    stats: raw?.stats,
    incidents,
    ts: raw?.ts,
  };
}

export async function fetchIncidentsByFlowId(
  flowId: string
): Promise<IncidentItem[]> {
  if (!flowId?.trim()) {
    return [];
  }

  const raw = await fetchJson<{
    ok?: boolean;
    count?: number;
    stats?: IncidentsResponse["stats"];
    incidents?: RawIncidentItem[];
    ts?: string;
  }>(`/incidents?flow_id=${encodeURIComponent(flowId)}`);

  return Array.isArray(raw?.incidents)
    ? raw.incidents.map(normalizeIncident)
    : [];
}

export async function fetchSla() {
  return fetchJson<SlaResponse>("/sla?limit=20");
}

export async function fetchTools() {
  return fetchJson<ToolsResponse>("/tools");
}

export async function fetchPolicies() {
  return fetchJson<PoliciesResponse>("/policies");
}

export async function fetchFlows() {
  return fetchJson<FlowsResponse>("/flows?limit=50");
}

export async function fetchFlowById(id: string): Promise<FlowDetail> {
  if (!id?.trim()) {
    throw new Error("fetchFlowById: id manquant");
  }

  const data = await fetchJson<{ ok?: boolean; flow?: FlowDetail }>(
    `/flows/${encodeURIComponent(id)}`
  );

  if (!data?.flow) {
    throw new Error("fetchFlowById: réponse invalide");
  }

  return data.flow;
}
