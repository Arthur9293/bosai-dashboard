export type HealthResponse = {
  ok?: boolean;
  app?: string;
  version?: string;
  worker?: string;
  capabilities?: string[];
  policies_loaded?: boolean;
  policy_keys?: string[];
  cors?: {
    allow_origins?: string[];
    allow_methods?: string[];
    allow_headers?: string[];
    expose_headers?: string[];
    allow_credentials?: boolean;
  };
  dashboard_views?: {
    system_runs_view?: string;
    commands_dashboard_view?: string;
    sla_dashboard_view?: string;
    events_dashboard_view?: string;
  };
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
  source?: {
    ok?: boolean;
    table?: string;
    view?: string;
    reason?: string;
    detail?: string;
  };
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
  source?: {
    ok?: boolean;
    table?: string;
    view?: string;
    reason?: string;
    detail?: string;
  };
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
  source?: {
    ok?: boolean;
    table?: string;
    view?: string;
    reason?: string;
    detail?: string;
  };
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

export type EventItem = {
  id: string;
  event_type?: string;
  status?: string;
  command_created?: boolean;
  linked_command?: string[] | string | null;
  mapped_capability?: string;
  processed_at?: string;
  source?: string | null;
  run_id?: string | null;
  command_id?: string | null;
  payload?: Record<string, unknown> | null;
};

export type EventsResponse = {
  ok?: boolean;
  source?: {
    ok?: boolean;
    table?: string;
    view?: string;
    reason?: string;
    detail?: string;
  };
  count?: number;
  stats?: {
    queued?: number;
    processed?: number;
    ignored?: number;
    error?: number;
    other?: number;
  };
  events?: EventItem[];
  ts?: string;
};

export type EventMappingItem = {
  event_type?: string;
  capability?: string;
  enabled?: boolean;
  source?: string;
};

export type EventMappingsResponse = {
  ok?: boolean;
  count?: number;
  stats?: {
    enabled?: number;
    disabled?: number;
    other?: number;
  };
  mappings?: EventMappingItem[];
  ts?: string;
};

export type EventCommandGraphItem = {
  event_id?: string;
  event_type?: string;
  capability?: string;
  command_id?: string | null;
  run_id?: string | null;
  run_status?: string | null;
};

export type EventCommandGraphResponse = {
  ok?: boolean;
  count?: number;
  graph?: EventCommandGraphItem[];
  ts?: string;
};
