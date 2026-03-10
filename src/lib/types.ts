export type HealthResponse = {
  ok?: boolean;
  app?: string;
  version?: string;
  worker?: string;
  capabilities?: string[];
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

export type CommandItem = {
  id: string;
  command_id?: string;
  capability?: string;
  status?: string;
  worker?: string;
  priority?: number | null;
  created_at?: string;
  updated_at?: string;
  input?: Record<string, unknown> | null;
};

export type CommandsResponse = {
  ok?: boolean;
  count?: number;
  commands?: CommandItem[];
  stats?: {
    queue?: number;
    queued?: number;
    running?: number;
    done?: number;
    error?: number;
    other?: number;
  };
  ts?: string;
};

export type IncidentItem = {
  id: string;
  title?: string;
  severity?: string;
  status?: string;
  sla_status?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
};

export type IncidentsResponse = {
  ok?: boolean;
  count?: number;
  incidents?: IncidentItem[];
  stats?: {
    open?: number;
    critical?: number;
    warning?: number;
    resolved?: number;
  };
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
export type EventMapping = {
  id: string;
  event_type: string;
  capability: string;
  enabled?: boolean;
  priority?: number;
  created_at?: string;
};

export type EventMappingsResponse = {
  ok?: boolean;
  count?: number;
  mappings?: EventMapping[];
  ts?: string;
};
