const BASE_URL =
  process.env.BOSAI_WORKER_BASE_URL ||
  process.env.NEXT_PUBLIC_BOSAI_WORKER_BASE_URL ||
  "";

type JsonRecord = Record<string, unknown>;

async function safeFetch<T = unknown>(path: string): Promise<T> {
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

function toRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return {};
}

function unwrapRecord(value: unknown): JsonRecord {
  const record = toRecord(value);
  const fields = toRecord(record.fields);

  return {
    ...fields,
    ...record,
  };
}

function firstDefined(record: JsonRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }
  return undefined;
}

function firstDefinedMany(records: JsonRecord[], keys: string[]): unknown {
  for (const record of records) {
    const value = firstDefined(record, keys);
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const v = asString(item);
      if (v) return v;
    }
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return undefined;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "oui"].includes(normalized)) return true;
    if (["false", "0", "no", "non"].includes(normalized)) return false;
  }

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  return undefined;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeStatsObject(
  value: unknown
): Record<string, number | undefined> {
  const record = toRecord(value);
  const normalized: Record<string, number | undefined> = {};

  for (const [key, raw] of Object.entries(record)) {
    normalized[key] = asNumber(raw);
  }

  return normalized;
}

function parseJsonRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  if (typeof value !== "string") {
    return {};
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed);
    return toRecord(parsed);
  } catch {
    return {};
  }
}

function normalizeJsonLike(value: unknown): unknown {
  const parsed = parseJsonRecord(value);

  if (Object.keys(parsed).length > 0) {
    return parsed;
  }

  if (typeof value === "string" && value.trim() === "{}") {
    return {};
  }

  return value;
}

function isRecordIdLike(value: string): boolean {
  return /^rec[a-zA-Z0-9]+$/i.test(value.trim());
}

function buildCommandStats(
  commands: CommandItem[]
): Record<string, number | undefined> {
  const stats: Record<string, number> = {
    queued: 0,
    running: 0,
    retry: 0,
    done: 0,
    error: 0,
    dead: 0,
    other: 0,
  };

  for (const cmd of commands) {
    const status = (cmd.status || "").trim().toLowerCase();

    if (["queue", "queued", "pending"].includes(status)) {
      stats.queued += 1;
    } else if (["running", "processing"].includes(status)) {
      stats.running += 1;
    } else if (["retry", "retriable"].includes(status)) {
      stats.retry += 1;
    } else if (["done", "success", "completed", "processed"].includes(status)) {
      stats.done += 1;
    } else if (["error", "failed", "blocked"].includes(status)) {
      stats.error += 1;
    } else if (["dead"].includes(status)) {
      stats.dead += 1;
    } else {
      stats.other += 1;
    }
  }

  return stats;
}

function buildSyntheticFlowStatsFromEvents(
  events: EventItem[]
): Record<string, number | undefined> {
  const stats: Record<string, number> = {
    queued: 0,
    running: 0,
    retry: 0,
    done: 0,
    error: 0,
    dead: 0,
    other: 0,
  };

  for (const event of events) {
    const status = String(event.status || "").trim().toLowerCase();

    if (["queue", "queued", "pending", "new"].includes(status)) {
      stats.queued += 1;
    } else if (["running", "processing"].includes(status)) {
      stats.running += 1;
    } else if (["retry", "retriable"].includes(status)) {
      stats.retry += 1;
    } else if (["done", "success", "completed", "processed"].includes(status)) {
      stats.done += 1;
    } else if (["error", "failed", "blocked"].includes(status)) {
      stats.error += 1;
    } else if (["dead"].includes(status)) {
      stats.dead += 1;
    } else {
      stats.other += 1;
    }
  }

  return stats;
}

function buildSyntheticFlowDetail(
  id: string,
  commands: CommandItem[],
  incidents: IncidentItem[],
  events: EventItem[] = []
): FlowDetail | null {
  const target = String(id || "").trim();
  if (!target) return null;

  const matchesTarget = (value: unknown): boolean =>
    String(value || "").trim() === target;

  const matchedCommands = commands.filter((cmd) =>
    [cmd.id, cmd.flow_id, cmd.root_event_id, cmd.source_event_id].some(
      matchesTarget
    )
  );

  const matchedIncidents = incidents.filter((incident) =>
    [
      incident.id,
      incident.flow_id,
      incident.root_event_id,
      incident.source_record_id,
      incident.command_id,
      incident.linked_command,
    ].some(matchesTarget)
  );

  const matchedEvents = events.filter((event) =>
    [
      event.id,
      event.flow_id,
      event.root_event_id,
      event.source_record_id,
      event.source_event_id,
      event.command_id,
      event.linked_command,
    ].some(matchesTarget)
  );

  if (
    matchedCommands.length === 0 &&
    matchedIncidents.length === 0 &&
    matchedEvents.length === 0
  ) {
    return null;
  }

  const flowId =
    matchedCommands.find((cmd) => cmd.flow_id)?.flow_id ||
    matchedIncidents.find((incident) => incident.flow_id)?.flow_id ||
    matchedEvents.find((event) => event.flow_id)?.flow_id ||
    (!isRecordIdLike(target) ? target : "");

  const rootEventId =
    matchedCommands.find((cmd) => cmd.root_event_id)?.root_event_id ||
    matchedCommands.find((cmd) => cmd.source_event_id)?.source_event_id ||
    matchedIncidents.find((incident) => incident.root_event_id)?.root_event_id ||
    matchedIncidents.find((incident) => incident.source_record_id)
      ?.source_record_id ||
    matchedEvents.find((event) => event.root_event_id)?.root_event_id ||
    matchedEvents.find((event) => event.source_event_id)?.source_event_id ||
    matchedEvents.find((event) => event.source_record_id)?.source_record_id ||
    matchedEvents.find((event) => event.id)?.id ||
    (isRecordIdLike(target) ? target : "");

  const sourceRecordId =
    matchedIncidents.find((incident) => incident.source_record_id)
      ?.source_record_id ||
    matchedEvents.find((event) => event.source_record_id)?.source_record_id ||
    matchedEvents.find((event) => event.source_event_id)?.source_event_id ||
    matchedEvents.find((event) => event.id)?.id ||
    matchedCommands.find((cmd) => cmd.source_event_id)?.source_event_id ||
    rootEventId ||
    "";

  const workspaceId =
    matchedCommands.find((cmd) => cmd.workspace_id)?.workspace_id ||
    matchedIncidents.find((incident) => incident.workspace_id)?.workspace_id ||
    matchedEvents.find((event) => event.workspace_id)?.workspace_id ||
    "production";

  const stats =
    matchedCommands.length > 0
      ? buildCommandStats(matchedCommands)
      : buildSyntheticFlowStatsFromEvents(matchedEvents);

  return {
    id: sourceRecordId || flowId || rootEventId || target,
    flow_id: flowId || undefined,
    root_event_id: rootEventId || undefined,
    source_record_id: sourceRecordId || undefined,
    source_event_id: sourceRecordId || undefined,
    workspace_id: workspaceId,
    count:
      matchedCommands.length > 0
        ? matchedCommands.length
        : matchedEvents.length > 0
        ? matchedEvents.length
        : matchedIncidents.length,
    commands: matchedCommands,
    stats,
    reading_mode: matchedCommands.length > 0 ? "enriched" : "registry-only",
    is_partial: matchedCommands.length === 0,
  };
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
  source_event_id?: string;
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

export type EventItem = {
  id: string;
  event_type?: string;
  type?: string;
  status?: string;
  command_created?: boolean;
  linked_command?: string;
  workspace_id?: string;
  flow_id?: string;
  root_event_id?: string;
  source_record_id?: string;
  source_event_id?: string;
  command_id?: string;
  mapped_capability?: string;
  source?: string;
  run_id?: string;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
  payload?: unknown;
  [key: string]: unknown;
};

export type EventsResponse = {
  count?: number;
  events?: EventItem[];
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
  source_record_id?: string;
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
  source_record_id?: string;
  source_event_id?: string;
  workspace_id?: string;
  reading_mode?: "enriched" | "registry-only";
  is_partial?: boolean;
  count?: number;
  commands?: CommandItem[];
  stats?: {
    done?: number;
    error?: number;
    dead?: number;
    running?: number;
    retry?: number;
    queued?: number;
    [key: string]: number | undefined;
  };
  [key: string]: unknown;
};

export type FlowsResponse = {
  count?: number;
  flows?: FlowDetail[];
};

function normalizeCommandItem(raw: unknown): CommandItem {
  const record = unwrapRecord(raw);

  const inputRaw = firstDefined(record, [
    "input",
    "Input",
    "input_json",
    "Input_JSON",
    "command_input_json",
    "Command_Input_JSON",
    "payload",
    "Payload",
    "payload_json",
    "Payload_JSON",
  ]);

  const resultRaw = firstDefined(record, [
    "result",
    "Result",
    "result_json",
    "Result_JSON",
    "Result JSON",
  ]);

  const inputRecord = parseJsonRecord(inputRaw);
  const resultRecord = parseJsonRecord(resultRaw);
  const contextRecords = [record, inputRecord, resultRecord];

  const sourceEventId = asString(
    firstDefinedMany(contextRecords, [
      "source_event_id",
      "Source_Event_ID",
      "sourceEventId",
      "event_id",
      "Event_ID",
      "eventId",
    ])
  );

  const rootEventId =
    asString(
      firstDefinedMany(contextRecords, [
        "root_event_id",
        "Root_Event_ID",
        "rootEventId",
        "RootEventId",
        "rooteventid",
      ])
    ) || sourceEventId;

  return {
    ...record,
    id:
      asString(
        firstDefined(record, ["id", "ID", "record_id", "Record_ID"])
      ) || "",
    name: asString(firstDefined(record, ["name", "Name", "title", "Title"])),
    status: asString(
      firstDefined(record, [
        "status",
        "Status",
        "status_select",
        "Status_select",
        "state",
        "State",
      ])
    ),
    capability: asString(
      firstDefinedMany(contextRecords, [
        "capability",
        "Capability",
        "mapped_capability",
        "Mapped_Capability",
        "name",
        "Name",
      ])
    ),
    tool_key: asString(
      firstDefined(record, ["tool_key", "Tool_Key", "toolKey"])
    ),
    tool_mode: asString(
      firstDefined(record, ["tool_mode", "Tool_Mode", "toolMode"])
    ),
    workspace_id: asString(
      firstDefinedMany(contextRecords, [
        "workspace_id",
        "Workspace_ID",
        "workspace",
        "Workspace",
        "workspaceId",
        "WorkspaceId",
      ])
    ),
    flow_id: asString(
      firstDefinedMany(contextRecords, [
        "flow_id",
        "Flow_ID",
        "flowId",
        "FlowId",
        "flowid",
      ])
    ),
    root_event_id: rootEventId,
    source_event_id: sourceEventId,
    linked_run: asString(
      firstDefinedMany(contextRecords, [
        "linked_run",
        "Linked_Run",
        "run_id",
        "Run_ID",
        "runId",
        "RunId",
      ])
    ),
    run_record_id: asString(
      firstDefinedMany(contextRecords, [
        "run_record_id",
        "Run_Record_ID",
        "linked_run",
        "Linked_Run",
        "run_record",
        "Run_Record",
      ])
    ),
    created_at: asString(
      firstDefined(record, ["created_at", "Created_At", "createdAt"])
    ),
    updated_at: asString(
      firstDefined(record, ["updated_at", "Updated_At", "updatedAt"])
    ),
    finished_at: asString(
      firstDefined(record, ["finished_at", "Finished_At", "finishedAt"])
    ),
    started_at: asString(
      firstDefined(record, ["started_at", "Started_At", "startedAt"])
    ),
    parent_command_id: asString(
      firstDefinedMany(contextRecords, [
        "parent_command_id",
        "Parent_Command_ID",
        "parent_id",
        "Parent_ID",
      ])
    ),
    step_index: asNumber(
      firstDefinedMany(contextRecords, [
        "step_index",
        "Step_Index",
        "step",
        "Step",
      ])
    ),
    worker: asString(firstDefinedMany(contextRecords, ["worker", "Worker"])),
    error: asString(
      firstDefinedMany(contextRecords, [
        "error",
        "Error",
        "last_error",
        "Last_Error",
      ])
    ),
    result: normalizeJsonLike(resultRaw),
    input: normalizeJsonLike(inputRaw),
  };
}

function normalizeEventItem(raw: unknown): EventItem {
  const record = unwrapRecord(raw);

  const payloadRaw = firstDefined(record, [
    "payload",
    "Payload",
    "payload_json",
    "Payload_JSON",
  ]);

  const payloadRecord = parseJsonRecord(payloadRaw);
  const contextRecords = [record, payloadRecord];

  const eventId =
    asString(firstDefined(record, ["id", "ID", "record_id", "Record_ID"])) || "";

  const sourceEventId =
    asString(
      firstDefinedMany(contextRecords, [
        "source_event_id",
        "Source_Event_ID",
        "sourceEventId",
        "event_id",
        "Event_ID",
        "eventId",
      ])
    ) || eventId;

  const rootEventId =
    asString(
      firstDefinedMany(contextRecords, [
        "root_event_id",
        "Root_Event_ID",
        "rootEventId",
        "RootEventId",
        "rooteventid",
      ])
    ) || sourceEventId;

  return {
    ...record,
    id: eventId,
    event_type: asString(
      firstDefinedMany(contextRecords, [
        "event_type",
        "Event_Type",
        "type",
        "Type",
      ])
    ),
    type: asString(
      firstDefinedMany(contextRecords, [
        "type",
        "Type",
        "event_type",
        "Event_Type",
      ])
    ),
    status: asString(
      firstDefined(record, [
        "status",
        "Status",
        "status_select",
        "Status_select",
      ])
    ),
    command_created: asBoolean(
      firstDefined(record, ["command_created", "Command_Created"])
    ),
    linked_command: asString(
      firstDefinedMany(contextRecords, [
        "linked_command",
        "Linked_Command",
        "command_id",
        "Command_ID",
        "commandId",
        "CommandId",
      ])
    ),
    workspace_id: asString(
      firstDefinedMany(contextRecords, [
        "workspace_id",
        "Workspace_ID",
        "workspace",
        "Workspace",
        "workspaceId",
        "WorkspaceId",
      ])
    ),
    flow_id: asString(
      firstDefinedMany(contextRecords, [
        "flow_id",
        "Flow_ID",
        "flowId",
        "FlowId",
        "flowid",
      ])
    ),
    root_event_id: rootEventId,
    source_record_id: sourceEventId,
    source_event_id: sourceEventId,
    command_id: asString(
      firstDefinedMany(contextRecords, [
        "command_id",
        "Command_ID",
        "linked_command",
        "Linked_Command",
        "commandId",
        "CommandId",
      ])
    ),
    mapped_capability: asString(
      firstDefinedMany(contextRecords, [
        "mapped_capability",
        "Mapped_Capability",
        "capability",
        "Capability",
      ])
    ),
    source: asString(firstDefinedMany(contextRecords, ["source", "Source"])),
    run_id: asString(
      firstDefinedMany(contextRecords, ["run_id", "Run_ID", "runId", "RunId"])
    ),
    created_at: asString(
      firstDefined(record, ["created_at", "Created_At", "createdAt"])
    ),
    updated_at: asString(
      firstDefined(record, ["updated_at", "Updated_At", "updatedAt"])
    ),
    processed_at: asString(
      firstDefined(record, ["processed_at", "Processed_At", "processedAt"])
    ),
    payload: normalizeJsonLike(payloadRaw),
  };
}

function normalizeIncidentItem(raw: unknown): IncidentItem {
  const record = unwrapRecord(raw);

  const status =
    asString(
      firstDefined(record, [
        "status",
        "Status",
        "status_select",
        "Status_select",
        "statut_incident",
        "Statut_incident",
        "Statut incident",
      ])
    ) || undefined;

  return {
    ...record,
    id:
      asString(
        firstDefined(record, ["id", "ID", "record_id", "Record_ID"])
      ) || "",
    title: asString(firstDefined(record, ["title", "Title", "name", "Name"])),
    name: asString(firstDefined(record, ["name", "Name", "title", "Title"])),
    status,
    statut_incident: asString(
      firstDefined(record, [
        "statut_incident",
        "Statut_incident",
        "Statut incident",
        "status",
        "Status",
        "status_select",
        "Status_select",
      ])
    ),
    severity: asString(firstDefined(record, ["severity", "Severity"])),
    sla_status: asString(
      firstDefined(record, ["sla_status", "SLA_Status", "SLA status"])
    ),
    sla_remaining_minutes: asNumber(
      firstDefined(record, [
        "sla_remaining_minutes",
        "SLA_Remaining_Minutes",
        "Temps restant SLA",
      ])
    ),
    opened_at: asString(
      firstDefined(record, [
        "opened_at",
        "Opened_At",
        "created_at",
        "Created_At",
      ])
    ),
    created_at: asString(
      firstDefined(record, ["created_at", "Created_At", "createdAt"])
    ),
    updated_at: asString(
      firstDefined(record, ["updated_at", "Updated_At", "updatedAt"])
    ),
    resolved_at: asString(
      firstDefined(record, ["resolved_at", "Resolved_At", "resolvedAt"])
    ),
    workspace_id: asString(
      firstDefined(record, [
        "workspace_id",
        "Workspace_ID",
        "workspace",
        "Workspace",
      ])
    ),
    workspace: asString(firstDefined(record, ["workspace", "Workspace"])),
    run_record_id: asString(
      firstDefined(record, [
        "run_record_id",
        "Run_Record_ID",
        "linked_run",
        "Linked_Run",
      ])
    ),
    linked_run: asString(
      firstDefined(record, [
        "linked_run",
        "Linked_Run",
        "run_record_id",
        "Run_Record_ID",
      ])
    ),
    run_id: asString(firstDefined(record, ["run_id", "Run_ID"])),
    command_id: asString(
      firstDefined(record, [
        "command_id",
        "Command_ID",
        "linked_command",
        "Linked_Command",
      ])
    ),
    linked_command: asString(
      firstDefined(record, [
        "linked_command",
        "Linked_Command",
        "command_id",
        "Command_ID",
      ])
    ),
    flow_id: asString(
      firstDefined(record, ["flow_id", "Flow_ID", "flowId", "FlowId"])
    ),
    root_event_id: asString(
      firstDefined(record, [
        "root_event_id",
        "Root_Event_ID",
        "rootEventId",
        "RootEventId",
      ])
    ),
    source_record_id: asString(
      firstDefined(record, [
        "source_record_id",
        "Source_Record_ID",
        "sourceRecordId",
      ])
    ),
    category: asString(firstDefined(record, ["category", "Category"])),
    reason: asString(firstDefined(record, ["reason", "Reason"])),
    source: asString(firstDefined(record, ["source", "Source"])),
    worker: asString(firstDefined(record, ["worker", "Worker"])),
    error_id: asString(firstDefined(record, ["error_id", "Error_ID"])),
    resolution_note: asString(
      firstDefined(record, ["resolution_note", "Resolution_Note"])
    ),
    last_action: asString(firstDefined(record, ["last_action", "Last_Action"])),
    decision_status: asString(
      firstDefined(record, ["decision_status", "Decision_Status"])
    ),
    decision_reason: asString(
      firstDefined(record, ["decision_reason", "Decision_Reason"])
    ),
    next_action: asString(firstDefined(record, ["next_action", "Next_Action"])),
    priority_score:
      asNumber(firstDefined(record, ["priority_score", "Priority_Score"])) ??
      asString(firstDefined(record, ["priority_score", "Priority_Score"])),
  };
}

function normalizeToolItem(raw: unknown): ToolItem {
  const record = unwrapRecord(raw);

  return {
    ...record,
    id:
      asString(
        firstDefined(record, ["id", "ID", "record_id", "Record_ID"])
      ) || "",
    name: asString(firstDefined(record, ["name", "Name", "title", "Title"])),
    description: asString(firstDefined(record, ["description", "Description"])),
    status: asString(firstDefined(record, ["status", "Status"])),
    category: asString(firstDefined(record, ["category", "Category"])),
    tool_key: asString(
      firstDefined(record, ["tool_key", "Tool_Key", "toolKey"])
    ),
    tool_mode: asString(
      firstDefined(record, ["tool_mode", "Tool_Mode", "toolMode"])
    ),
    enabled: asBoolean(firstDefined(record, ["enabled", "Enabled"])),
  };
}

function normalizePolicyItem(raw: unknown): PolicyItem {
  const record = unwrapRecord(raw);

  return {
    ...record,
    id:
      asString(
        firstDefined(record, ["id", "ID", "record_id", "Record_ID"])
      ) || "",
    name: asString(firstDefined(record, ["name", "Name", "title", "Title"])),
    description: asString(firstDefined(record, ["description", "Description"])),
    status: asString(firstDefined(record, ["status", "Status"])),
    type: asString(firstDefined(record, ["type", "Type"])),
    category: asString(firstDefined(record, ["category", "Category"])),
    enabled: asBoolean(firstDefined(record, ["enabled", "Enabled"])),
    value: firstDefined(record, ["value", "Value"]),
  };
}

function normalizeFlowDetail(raw: unknown): FlowDetail {
  const record = unwrapRecord(raw);
  const commandsRaw = firstDefined(record, ["commands", "Commands"]);
  const commands = asArray(commandsRaw).map((item) => normalizeCommandItem(item));

  const flowId =
    asString(
      firstDefined(record, ["flow_id", "Flow_ID", "flowId", "FlowId"])
    ) || commands.find((cmd) => cmd.flow_id)?.flow_id;

  const sourceRecordId =
    asString(
      firstDefined(record, [
        "source_record_id",
        "Source_Record_ID",
        "sourceRecordId",
      ])
    ) || commands.find((cmd) => cmd.source_event_id)?.source_event_id;

  const rootEventId =
    asString(
      firstDefined(record, [
        "root_event_id",
        "Root_Event_ID",
        "rootEventId",
        "RootEventId",
      ])
    ) ||
    commands.find((cmd) => cmd.root_event_id)?.root_event_id ||
    sourceRecordId;

  const statsRaw =
    firstDefined(record, ["stats", "Stats"]) || buildCommandStats(commands);

  return {
    ...record,
    id:
      asString(firstDefined(record, ["id", "ID", "record_id", "Record_ID"])) ||
      sourceRecordId ||
      flowId ||
      rootEventId,
    flow_id: flowId || undefined,
    root_event_id: rootEventId || undefined,
    source_record_id: sourceRecordId || undefined,
    source_event_id: sourceRecordId || undefined,
    workspace_id: asString(
      firstDefined(record, [
        "workspace_id",
        "Workspace_ID",
        "workspace",
        "Workspace",
      ])
    ),
    reading_mode:
      asString(
        firstDefined(record, ["reading_mode", "Reading_Mode", "readingMode"])
      ) === "registry-only"
        ? "registry-only"
        : "enriched",
    is_partial: asBoolean(
      firstDefined(record, ["is_partial", "Is_Partial", "isPartial"])
    ),
    count:
      asNumber(firstDefined(record, ["count", "Count"])) ?? commands.length,
    commands,
    stats: normalizeStatsObject(statsRaw),
  };
}

function enrichIncidentsFromCommands(
  incidents: IncidentItem[],
  commands: CommandItem[]
): IncidentItem[] {
  const byCommandId = new Map<string, CommandItem>();

  for (const cmd of commands) {
    const id = asString(cmd.id);
    if (id) {
      byCommandId.set(id, cmd);
    }
  }

  return incidents.map((incident) => {
    const linkedCommandId =
      incident.command_id || incident.linked_command || undefined;

    const linkedCommand = linkedCommandId
      ? byCommandId.get(String(linkedCommandId))
      : undefined;

    if (!linkedCommand) {
      return incident;
    }

    return {
      ...incident,
      command_id: incident.command_id || linkedCommand.id,
      linked_command: incident.linked_command || linkedCommand.id,
      flow_id: incident.flow_id || linkedCommand.flow_id,
      root_event_id:
        incident.root_event_id ||
        linkedCommand.root_event_id ||
        linkedCommand.source_event_id,
      workspace_id: incident.workspace_id || linkedCommand.workspace_id,
      run_record_id: incident.run_record_id || linkedCommand.run_record_id,
      linked_run: incident.linked_run || linkedCommand.linked_run,
      worker: incident.worker || linkedCommand.worker,
      source_record_id:
        incident.source_record_id || linkedCommand.source_event_id,
    };
  });
}

function enrichEventsFromCommands(
  events: EventItem[],
  commands: CommandItem[]
): EventItem[] {
  const byCommandId = new Map<string, CommandItem>();

  for (const cmd of commands) {
    const id = asString(cmd.id);
    if (id) {
      byCommandId.set(id, cmd);
    }
  }

  return events.map((event) => {
    const linkedCommandId =
      event.command_id || event.linked_command || undefined;

    const linkedCommand = linkedCommandId
      ? byCommandId.get(String(linkedCommandId))
      : undefined;

    if (!linkedCommand) {
      return event;
    }

    return {
      ...event,
      command_id: event.command_id || linkedCommand.id,
      linked_command: event.linked_command || linkedCommand.id,
      flow_id: event.flow_id || linkedCommand.flow_id,
      root_event_id:
        event.root_event_id ||
        linkedCommand.root_event_id ||
        linkedCommand.source_event_id,
      workspace_id: event.workspace_id || linkedCommand.workspace_id,
      run_id:
        event.run_id ||
        linkedCommand.run_record_id ||
        linkedCommand.linked_run,
      source_record_id: event.source_record_id || event.id,
      source_event_id: event.source_event_id || event.id,
    };
  });
}

export async function fetchHealthScore(): Promise<HealthScoreResponse> {
  const data = await safeFetch<JsonRecord>("/health/score");

  return {
    ...data,
    score: asNumber(firstDefined(data, ["score", "Score"])),
    status: asString(firstDefined(data, ["status", "Status"])),
    details: toRecord(firstDefined(data, ["details", "Details"])),
  };
}

export async function fetchRuns(): Promise<RunsResponse> {
  const data = await safeFetch<JsonRecord>("/runs");
  const runs = asArray<Record<string, unknown>>(
    firstDefined(data, ["runs", "Runs"])
  );
  const stats = normalizeStatsObject(firstDefined(data, ["stats", "Stats"]));

  return {
    ...data,
    count: asNumber(firstDefined(data, ["count", "Count"])) ?? runs.length,
    runs,
    stats,
  };
}

export async function fetchCommands(limit = 30): Promise<CommandsResponse> {
  const safeLimit = Number.isFinite(limit)
    ? Math.max(1, Math.trunc(limit))
    : 30;

  const data = await safeFetch<JsonRecord>(`/commands?limit=${safeLimit}`);
  const commands = asArray(firstDefined(data, ["commands", "Commands"])).map(
    (item) => normalizeCommandItem(item)
  );
  const stats = normalizeStatsObject(firstDefined(data, ["stats", "Stats"]));

  return {
    ...data,
    count: asNumber(firstDefined(data, ["count", "Count"])) ?? commands.length,
    commands,
    stats,
  };
}

export async function fetchCommandById(
  id: string,
  limit = 500
): Promise<CommandItem | null> {
  const data = await fetchCommands(limit);
  const commands = Array.isArray(data?.commands) ? data.commands : [];

  const match = commands.find((item) => String(item.id) === String(id));
  return match ?? null;
}

export async function fetchEvents(limit = 30): Promise<EventsResponse> {
  const safeLimit = Number.isFinite(limit)
    ? Math.max(1, Math.trunc(limit))
    : 30;

  const data = await safeFetch<JsonRecord>(`/events?limit=${safeLimit}`);
  let events = asArray(firstDefined(data, ["events", "Events"])).map((item) =>
    normalizeEventItem(item)
  );
  const stats = normalizeStatsObject(firstDefined(data, ["stats", "Stats"]));

  try {
    const commandsData = await fetchCommands(Math.max(safeLimit, 300));
    const commands = Array.isArray(commandsData?.commands)
      ? commandsData.commands
      : [];
    events = enrichEventsFromCommands(events, commands);
  } catch {
    // no-op
  }

  return {
    ...data,
    count: asNumber(firstDefined(data, ["count", "Count"])) ?? events.length,
    events,
    stats,
  };
}

export async function fetchIncidents(limit = 30): Promise<IncidentsResponse> {
  const safeLimit = Number.isFinite(limit)
    ? Math.max(1, Math.trunc(limit))
    : 30;

  const data = await safeFetch<JsonRecord>(`/incidents?limit=${safeLimit}`);
  let incidents = asArray(firstDefined(data, ["incidents", "Incidents"])).map(
    (item) => normalizeIncidentItem(item)
  );
  const stats = normalizeStatsObject(firstDefined(data, ["stats", "Stats"]));

  try {
    const commandsData = await fetchCommands(Math.max(safeLimit, 300));
    const commands = Array.isArray(commandsData?.commands)
      ? commandsData.commands
      : [];
    incidents = enrichIncidentsFromCommands(incidents, commands);
  } catch {
    // no-op
  }

  return {
    ...data,
    count:
      asNumber(firstDefined(data, ["count", "Count"])) ?? incidents.length,
    incidents,
    stats,
  };
}

export async function fetchTools(): Promise<ToolsResponse> {
  const data = await safeFetch<JsonRecord>("/tools");
  const tools = asArray(firstDefined(data, ["tools", "Tools"])).map((item) =>
    normalizeToolItem(item)
  );

  return {
    ...data,
    count: asNumber(firstDefined(data, ["count", "Count"])) ?? tools.length,
    tools,
  };
}

export async function fetchPolicies(): Promise<PoliciesResponse> {
  const data = await safeFetch<JsonRecord>("/policies");
  const policies = asArray(firstDefined(data, ["policies", "Policies"])).map(
    (item) => normalizePolicyItem(item)
  );

  return {
    ...data,
    count:
      asNumber(firstDefined(data, ["count", "Count"])) ?? policies.length,
    policies,
  };
}

export async function fetchFlows(): Promise<FlowsResponse> {
  const data = await safeFetch<JsonRecord>("/flows");
  const flows = asArray(firstDefined(data, ["flows", "Flows"])).map((item) =>
    normalizeFlowDetail(item)
  );

  return {
    ...data,
    count: asNumber(firstDefined(data, ["count", "Count"])) ?? flows.length,
    flows,
  };
}

export async function fetchFlowById(id: string): Promise<FlowDetail | null> {
  const target = String(id || "").trim();
  if (!target) return null;

  const flowData = await fetchFlows();
  const flows = Array.isArray(flowData?.flows) ? flowData.flows : [];

  const directMatch = flows.find((item) => {
    const candidates = [
      String(item.id || ""),
      String(item.flow_id || ""),
      String(item.root_event_id || ""),
      String(item.source_record_id || ""),
      String(item.source_event_id || ""),
      String(encodeURIComponent(String(item.id || ""))),
      String(encodeURIComponent(String(item.flow_id || ""))),
      String(encodeURIComponent(String(item.root_event_id || ""))),
      String(encodeURIComponent(String(item.source_record_id || ""))),
      String(encodeURIComponent(String(item.source_event_id || ""))),
    ];

    return candidates.includes(target);
  });

  if (directMatch) {
    return directMatch;
  }

  try {
    const [commandsData, incidentsData, eventsData] = await Promise.all([
      fetchCommands(500),
      fetchIncidents(300),
      fetchEvents(500),
    ]);

    const commands = Array.isArray(commandsData?.commands)
      ? commandsData.commands
      : [];
    const incidents = Array.isArray(incidentsData?.incidents)
      ? incidentsData.incidents
      : [];
    const events = Array.isArray(eventsData?.events) ? eventsData.events : [];

    return buildSyntheticFlowDetail(target, commands, incidents, events);
  } catch {
    return null;
  }
}

export async function fetchIncidentsByFlowId(
  flowId: string
): Promise<IncidentItem[]> {
  const data = await fetchIncidents(300);
  const incidents = Array.isArray(data?.incidents) ? data.incidents : [];

  return incidents.filter(
    (item) =>
      String(item.flow_id || "") === String(flowId) ||
      String(item.root_event_id || "") === String(flowId) ||
      String(item.source_record_id || "") === String(flowId)
  );
}
