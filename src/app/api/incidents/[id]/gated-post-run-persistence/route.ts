import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

type JsonRecord = Record<string, unknown>;

type AirtableRecord = {
  id: string;
  fields: JsonRecord;
};

type AirtableReadResult = {
  http_status: number | null;
  record_id: string | null;
  record: AirtableRecord | null;
  error: string | null;
};

type AirtableWriteResult = {
  http_status: number | null;
  record_id: string | null;
  write_executed: boolean;
  error: string | null;
};

const VERSION = "Incident Detail V5.25.1";
const SOURCE =
  "dashboard_incident_detail_v5_25_1_strict_worker_runrequest_body_alignment";
const MODE = "GATED_POST_RUN_PERSISTENCE";

const OPERATOR_CONFIRMATION = "SEND_POST_RUN_DRY_RUN";
const WORKER_ACKNOWLEDGEMENT =
  "I_ACKNOWLEDGE_THIS_SENDS_A_SERVER_SIDE_DRY_RUN_POST_TO_WORKER";

const POST_RUN_FEATURE_GATE = "BOSAI_POST_RUN_PERSISTENCE_ENABLED";
const WORKER_DRY_RUN_REVIEW_GATE = "BOSAI_WORKER_DRY_RUN_CALL_REVIEWED";

const WORKER_SECRET_ENV_CANDIDATES = [
  "BOSAI_WORKER_RUN_SECRET",
  "BOSAI_SCHEDULER_SECRET",
  "RUN_SCHEDULER_SECRET",
  "SCHEDULER_SECRET",
] as const;

function jsonResponse(payload: JsonRecord, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function getEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function isEnabled(value: string): boolean {
  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
}

function gateState(name: string) {
  const raw = getEnv(name);

  if (!raw) {
    return {
      env: name,
      enabled: false,
      state: "FEATURE_GATE_MISSING",
      value: "MISSING",
    };
  }

  return {
    env: name,
    enabled: isEnabled(raw),
    state: isEnabled(raw) ? "FEATURE_GATE_ENABLED" : "FEATURE_GATE_DISABLED",
    value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
  };
}

function getAirtableConfig() {
  const token =
    getEnv("AIRTABLE_API_KEY") ||
    getEnv("AIRTABLE_TOKEN") ||
    getEnv("AIRTABLE_PAT");

  return {
    baseId: getEnv("AIRTABLE_BASE_ID"),
    token,
    operatorIntentsTable:
      getEnv("AIRTABLE_OPERATOR_INTENTS_TABLE") || "Operator_Intents",
    operatorApprovalsTable:
      getEnv("AIRTABLE_OPERATOR_APPROVALS_TABLE") || "Operator_Approvals",
    commandsTable: getEnv("AIRTABLE_COMMANDS_TABLE") || "Commands",
    runsTable:
      getEnv("AIRTABLE_SYSTEM_RUNS_TABLE") ||
      getEnv("AIRTABLE_RUNS_TABLE") ||
      "System_Runs",
  };
}

function getWorkerConfig() {
  const workerBaseUrl = getEnv("BOSAI_WORKER_BASE_URL");

  let selectedSecretEnv: string | null = null;
  let selectedSecret = "";

  for (const name of WORKER_SECRET_ENV_CANDIDATES) {
    const value = getEnv(name);
    if (value) {
      selectedSecretEnv = name;
      selectedSecret = value;
      break;
    }
  }

  return {
    workerBaseUrl,
    selectedSecretEnv,
    selectedSecret,
    workerBaseUrlConfigured: Boolean(workerBaseUrl),
    workerSecretConfigured: Boolean(selectedSecret),
  };
}

function airtableConfigPublic(config: ReturnType<typeof getAirtableConfig>) {
  return {
    base_id: config.baseId ? "CONFIGURED" : "MISSING",
    operator_intents_table: config.operatorIntentsTable,
    operator_approvals_table: config.operatorApprovalsTable,
    commands_table: config.commandsTable,
    runs_table: config.runsTable,
    token: config.token ? "CONFIGURED" : "MISSING",
    token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
  };
}

function workerConfigPublic(config: ReturnType<typeof getWorkerConfig>) {
  return {
    worker_base_url: config.workerBaseUrlConfigured ? "CONFIGURED" : "MISSING",
    worker_secret_env: config.selectedSecretEnv ?? "MISSING",
    worker_secret: config.workerSecretConfigured ? "CONFIGURED" : "MISSING",
    worker_secret_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
  };
}

function escapeFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function airtableUrl(baseId: string, tableName: string): string {
  return `https://api.airtable.com/v0/${encodeURIComponent(
    baseId
  )}/${encodeURIComponent(tableName)}`;
}

function airtableHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function findRecordByIdempotencyKey(args: {
  baseId: string;
  token: string;
  tableName: string;
  idempotencyKey: string;
}): Promise<AirtableReadResult> {
  const formula = `{Idempotency_Key}='${escapeFormulaValue(
    args.idempotencyKey
  )}'`;
  const url = `${airtableUrl(
    args.baseId,
    args.tableName
  )}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: airtableHeaders(args.token),
      cache: "no-store",
    });

    const text = await response.text();
    const parsed = safeParseJson(text);

    if (!response.ok) {
      return {
        http_status: response.status,
        record_id: null,
        record: null,
        error: sanitizeErrorText(text),
      };
    }

    const records = Array.isArray(asRecord(parsed).records)
      ? (asRecord(parsed).records as AirtableRecord[])
      : [];

    const record = records[0] ?? null;

    return {
      http_status: response.status,
      record_id: record?.id ?? null,
      record,
      error: null,
    };
  } catch (error) {
    return {
      http_status: null,
      record_id: null,
      record: null,
      error: sanitizeErrorText(error),
    };
  }
}

async function updateRecord(args: {
  baseId: string;
  token: string;
  tableName: string;
  recordId: string;
  fields: JsonRecord;
}): Promise<AirtableWriteResult> {
  try {
    const response = await fetch(
      `${airtableUrl(args.baseId, args.tableName)}/${args.recordId}`,
      {
        method: "PATCH",
        headers: airtableHeaders(args.token),
        body: JSON.stringify({
          fields: args.fields,
        }),
        cache: "no-store",
      }
    );

    const text = await response.text();

    if (!response.ok) {
      return {
        http_status: response.status,
        record_id: null,
        write_executed: true,
        error: sanitizeErrorText(text),
      };
    }

    const parsed = asRecord(safeParseJson(text));

    return {
      http_status: response.status,
      record_id: typeof parsed.id === "string" ? parsed.id : args.recordId,
      write_executed: true,
      error: null,
    };
  } catch (error) {
    return {
      http_status: null,
      record_id: null,
      write_executed: true,
      error: sanitizeErrorText(error),
    };
  }
}

function safeParseJson(value: unknown): unknown {
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseInputJson(fields: JsonRecord): JsonRecord {
  const raw = stringField(fields, ["Input_JSON", "input_json"]);
  const parsed = safeParseJson(raw);
  return asRecord(parsed);
}

function asRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return {};
}

function stringField(fields: JsonRecord, names: string[], fallback = ""): string {
  for (const name of names) {
    const value = fields[name];

    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return fallback;
}

function booleanField(
  fields: JsonRecord,
  names: string[],
  fallback = false
): boolean {
  for (const name of names) {
    const value = fields[name];

    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "off"].includes(normalized)) return false;
    }
  }

  return fallback;
}

function nestedString(record: JsonRecord, path: string[], fallback = ""): string {
  let current: unknown = record;

  for (const part of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return fallback;
    }

    current = (current as JsonRecord)[part];
  }

  if (typeof current === "string") return current;
  if (typeof current === "number" || typeof current === "boolean") {
    return String(current);
  }

  return fallback;
}

function sanitizeErrorText(value: unknown): string {
  if (typeof value === "string") {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
      .replace(/"apiKey"\s*:\s*"[^"]+"/gi, '"apiKey":"[REDACTED]"')
      .slice(0, 4000);
  }

  if (value instanceof Error) {
    return value.message.slice(0, 4000);
  }

  try {
    return JSON.stringify(value).slice(0, 4000);
  } catch {
    return "Unknown error";
  }
}

function sanitizeObject(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[MAX_DEPTH_REDACTED]";

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item, depth + 1));
  }

  if (value && typeof value === "object") {
    const output: JsonRecord = {};

    for (const [key, raw] of Object.entries(value as JsonRecord)) {
      if (/secret|token|authorization|password|credential|api[_-]?key/i.test(key)) {
        output[key] = "SERVER_SIDE_ONLY_NOT_EXPOSED";
      } else {
        output[key] = sanitizeObject(raw, depth + 1);
      }
    }

    return output;
  }

  if (typeof value === "string") {
    return value.slice(0, 4000);
  }

  return value;
}

function buildIds(workspaceId: string, incidentId: string) {
  return {
    intentId: `operator-intent:v5.4:${workspaceId}:${incidentId}`,
    intentIdempotencyKey: `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`,
    approvalId: `operator-approval:v5.11:${workspaceId}:${incidentId}`,
    approvalIdempotencyKey: `dashboard:v5.11:gated-operator-approval-persistence:${workspaceId}:${incidentId}`,
    commandDraftId: `command-draft:v5.13:${workspaceId}:${incidentId}`,
    commandIdempotencyKey: `dashboard:v5.13:gated-command-draft-persistence:${workspaceId}:${incidentId}`,
    operationalQueueTransitionId: `operational-queue-transition:v5.19:${workspaceId}:${incidentId}`,
    operationalQueueTransitionIdempotencyKey: `dashboard:v5.19:gated-operational-queue-persistence:${workspaceId}:${incidentId}`,
    runDraftId: `run-draft:v5.22:${workspaceId}:${incidentId}`,
    runIdempotencyKey: `dashboard:v5.22:gated-run-draft-persistence:${workspaceId}:${incidentId}`,
    postRunPreviewId: `post-run-preview:v5.24:${workspaceId}:${incidentId}`,
    postRunIdempotencyKey: `dashboard:v5.25:gated-post-run-persistence:${workspaceId}:${incidentId}`,
  };
}

function getWorkspaceId(request: Request): string {
  const url = new URL(request.url);

  return (
    url.searchParams.get("workspace_id") ||
    url.searchParams.get("workspaceId") ||
    "default"
  ).trim();
}

function buildWorkerUrl(workerBaseUrl: string): string {
  return `${workerBaseUrl.replace(/\/+$/, "")}/run`;
}

/**
 * Dashboard audit payload.
 * This payload is rich and must NOT be sent to the Worker /run endpoint.
 */
function buildWorkerPayload(args: {
  workspaceId: string;
  incidentId: string;
  commandRecordId: string;
  commandId: string;
  runRecordId: string;
  runId: string;
  intentRecordId: string;
  approvalRecordId: string;
  operatorIdentity: string;
}) {
  return {
    capability: "command_orchestrator",
    dry_run: true,
    workspace_id: args.workspaceId,
    incident_id: args.incidentId,
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    run_record_id: args.runRecordId,
    run_id: args.runId,
    source: SOURCE,
    metadata: {
      origin: "gated_post_run_persistence",
      intent_record_id: args.intentRecordId,
      approval_record_id: args.approvalRecordId,
      operator_identity: args.operatorIdentity,
      dry_run_only: true,
      real_run_forbidden: true,
      secret_server_side_only: true,
    },
  };
}

/**
 * Strict Worker RunRequest body.
 * This is the ONLY payload sent to Worker /run.
 */
function buildStrictWorkerRunRequestBody() {
  return {
    capability: "command_orchestrator",
    dry_run: true,
  };
}

function buildRunInputJson(args: {
  workspaceId: string;
  incidentId: string;
  commandRecordId: string;
  commandId: string;
  runRecordId: string;
  runId: string;
  runIdempotencyKey: string;
  postRunIdempotencyKey: string;
  intentRecordId: string;
  approvalRecordId: string;
  operatorIdentity: string;
  workerResponseSanitized?: unknown;
  requestedOnly?: boolean;
}) {
  return {
    run_id: args.runId,
    idempotency_key: args.runIdempotencyKey,
    post_run_idempotency_key: args.postRunIdempotencyKey,
    status: "Draft",
    status_select: "Draft",
    post_run_status: args.requestedOnly
      ? "POST_RUN_DRY_RUN_REQUESTED"
      : "POST_RUN_DRY_RUN_SENT",
    worker_call_status: args.requestedOnly ? "PENDING" : "DRY_RUN_CALL_SENT",
    run_execution_status: "DRY_RUN_ONLY",
    workspace_id: args.workspaceId,
    incident_id: args.incidentId,
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    capability: "command_orchestrator",
    dry_run: true,
    source: SOURCE,
    metadata: {
      origin: "gated_post_run_persistence",
      intent_record_id: args.intentRecordId,
      approval_record_id: args.approvalRecordId,
      operator_identity: args.operatorIdentity,
      post_sent: !args.requestedOnly,
      worker_call_executed: !args.requestedOnly,
      dry_run_only: true,
      real_run_forbidden: true,
      secret_server_side_only: true,
      strict_worker_runrequest_body_alignment: true,
    },
    worker_response_sanitized: args.workerResponseSanitized ?? null,
  };
}

function buildRunAuditFields(inputJson: JsonRecord) {
  return {
    Status: "Draft",
    Status_select: "Draft",
    Dry_Run: true,
    Post_Run_Allowed: false,
    Worker_Call_Allowed: false,
    Real_Run: "Forbidden",
    Secret_Exposure: "Disabled",
    Source_Layer: VERSION,
    Input_JSON: JSON.stringify(inputJson),
  };
}

async function buildBasePayload(request: Request, incidentId: string) {
  const workspaceId = getWorkspaceId(request);
  const ids = buildIds(workspaceId, incidentId);
  const airtable = getAirtableConfig();
  const worker = getWorkerConfig();
  const featureGate = gateState(POST_RUN_FEATURE_GATE);
  const dryRunReviewGate = gateState(WORKER_DRY_RUN_REVIEW_GATE);

  const configMissing = !airtable.baseId || !airtable.token;

  const emptyRead: AirtableReadResult = {
    http_status: null,
    record_id: null,
    record: null,
    error: configMissing ? "Airtable config missing" : null,
  };

  let intentRead = emptyRead;
  let approvalRead = emptyRead;
  let commandRead = emptyRead;
  let runRead = emptyRead;

  if (!configMissing) {
    [intentRead, approvalRead, commandRead, runRead] = await Promise.all([
      findRecordByIdempotencyKey({
        baseId: airtable.baseId,
        token: airtable.token,
        tableName: airtable.operatorIntentsTable,
        idempotencyKey: ids.intentIdempotencyKey,
      }),
      findRecordByIdempotencyKey({
        baseId: airtable.baseId,
        token: airtable.token,
        tableName: airtable.operatorApprovalsTable,
        idempotencyKey: ids.approvalIdempotencyKey,
      }),
      findRecordByIdempotencyKey({
        baseId: airtable.baseId,
        token: airtable.token,
        tableName: airtable.commandsTable,
        idempotencyKey: ids.commandIdempotencyKey,
      }),
      findRecordByIdempotencyKey({
        baseId: airtable.baseId,
        token: airtable.token,
        tableName: airtable.runsTable,
        idempotencyKey: ids.runIdempotencyKey,
      }),
    ]);
  }

  const intentFields = intentRead.record?.fields ?? {};
  const approvalFields = approvalRead.record?.fields ?? {};
  const commandFields = commandRead.record?.fields ?? {};
  const runFields = runRead.record?.fields ?? {};

  const runInputJson = parseInputJson(runFields);

  const commandStatus = stringField(commandFields, ["Status", "status"]);
  const commandStatusSelect = stringField(commandFields, [
    "Status_select",
    "status_select",
  ]);

  const runStatus = stringField(runFields, ["Status", "status"]);
  const runStatusSelect = stringField(runFields, [
    "Status_select",
    "status_select",
  ]);

  const commandRecordId = commandRead.record_id ?? "";
  const runRecordId = runRead.record_id ?? "";

  const alreadyPostRunSent =
    nestedString(runInputJson, ["post_run_status"]) ===
      "POST_RUN_DRY_RUN_SENT" ||
    nestedString(runInputJson, ["worker_call_status"]) === "DRY_RUN_CALL_SENT";

  const workerPayloadPreview = buildWorkerPayload({
    workspaceId,
    incidentId,
    commandRecordId,
    commandId: ids.commandDraftId,
    runRecordId,
    runId: ids.runDraftId,
    intentRecordId: intentRead.record_id ?? "",
    approvalRecordId: approvalRead.record_id ?? "",
    operatorIdentity: stringField(approvalFields, ["Operator_Identity"], "Arthur"),
  });

  const workerTargetPreview = {
    method: "POST",
    endpoint: "/run",
    base_url: worker.workerBaseUrlConfigured ? "CONFIGURED" : "MISSING",
    full_url_preview: worker.workerBaseUrlConfigured
      ? "SERVER_SIDE_ONLY_REDACTED"
      : "MISSING",
    secret_header_required: true,
    secret: worker.workerSecretConfigured ? "CONFIGURED" : "MISSING",
    secret_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    headers_preview: {
      "Content-Type": "application/json",
      "x-scheduler-secret": "SERVER_SIDE_ONLY_NOT_EXPOSED",
    },
    post_sent: false,
  };

  const persistedCommandSnapshot = commandRead.record
    ? {
        record_id: commandRead.record.id,
        idempotency_key: stringField(commandFields, ["Idempotency_Key"]),
        command_id: stringField(commandFields, ["Command_ID"], ids.commandDraftId),
        workspace_id: stringField(commandFields, ["Workspace_ID"], workspaceId),
        incident_id: stringField(commandFields, ["Incident_ID"], incidentId),
        intent_id: stringField(commandFields, ["Intent_ID"], ids.intentId),
        intent_record_id: stringField(
          commandFields,
          ["Intent_Record_ID"],
          intentRead.record_id ?? ""
        ),
        approval_id: stringField(commandFields, ["Approval_ID"], ids.approvalId),
        approval_record_id: stringField(
          commandFields,
          ["Approval_Record_ID"],
          approvalRead.record_id ?? ""
        ),
        capability: stringField(
          commandFields,
          ["Capability"],
          "command_orchestrator"
        ),
        status: commandStatus,
        status_select: commandStatusSelect,
        target_mode: stringField(commandFields, ["Target_Mode"], "dry_run_only"),
        dry_run: booleanField(commandFields, ["Dry_Run"], true),
        operator_identity: stringField(
          commandFields,
          ["Operator_Identity"],
          "Arthur"
        ),
        queue_allowed: booleanField(commandFields, ["Queue_Allowed"], true),
        run_creation_allowed: booleanField(
          commandFields,
          ["Run_Creation_Allowed"],
          false
        ),
        worker_call_allowed: booleanField(
          commandFields,
          ["Worker_Call_Allowed"],
          false
        ),
        real_run: stringField(commandFields, ["Real_Run"], "Forbidden"),
        secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
        source_layer: stringField(
          commandFields,
          ["Source_Layer"],
          "Incident Detail V5.19"
        ),
      }
    : null;

  const persistedRunSnapshot = runRead.record
    ? {
        record_id: runRead.record.id,
        idempotency_key: stringField(runFields, ["Idempotency_Key"]),
        run_id: stringField(runFields, ["Run_ID"], ids.runDraftId),
        workspace_id: stringField(runFields, ["Workspace_ID"], workspaceId),
        incident_id: stringField(runFields, ["Incident_ID"], incidentId),
        command_id: stringField(runFields, ["Command_ID"], ids.commandDraftId),
        command_record_id: stringField(
          runFields,
          ["Command_Record_ID"],
          commandRecordId
        ),
        intent_id: stringField(runFields, ["Intent_ID"], ids.intentId),
        intent_record_id: stringField(
          runFields,
          ["Intent_Record_ID"],
          intentRead.record_id ?? ""
        ),
        approval_id: stringField(runFields, ["Approval_ID"], ids.approvalId),
        approval_record_id: stringField(
          runFields,
          ["Approval_Record_ID"],
          approvalRead.record_id ?? ""
        ),
        operational_queue_transition_id: stringField(
          runFields,
          ["Operational_Queue_Transition_ID"],
          ids.operationalQueueTransitionId
        ),
        capability: stringField(runFields, ["Capability"], "command_orchestrator"),
        status: runStatus,
        status_select: runStatusSelect,
        dry_run: booleanField(runFields, ["Dry_Run"], true),
        operator_identity: stringField(runFields, ["Operator_Identity"], "Arthur"),
        run_persistence: stringField(runFields, ["Run_Persistence"], "Draft"),
        post_run_allowed: booleanField(runFields, ["Post_Run_Allowed"], false),
        worker_call_allowed: booleanField(
          runFields,
          ["Worker_Call_Allowed"],
          false
        ),
        real_run: stringField(runFields, ["Real_Run"], "Forbidden"),
        secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
        source_layer: stringField(
          runFields,
          ["Source_Layer"],
          "Incident Detail V5.22"
        ),
      }
    : null;

  const common = {
    ok: true,
    version: VERSION,
    source: SOURCE,
    mode: MODE,
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,

    feature_gate_env: POST_RUN_FEATURE_GATE,
    feature_gate_enabled: featureGate.enabled,
    feature_gate_state: featureGate.state,
    feature_gate_value: featureGate.value,

    worker_dry_run_review_gate_env: WORKER_DRY_RUN_REVIEW_GATE,
    worker_dry_run_reviewed: dryRunReviewGate.enabled,
    worker_dry_run_review_gate_state: dryRunReviewGate.state,
    worker_dry_run_review_gate_value: dryRunReviewGate.value,

    intent_id: ids.intentId,
    intent_record_id: intentRead.record_id,
    approval_id: ids.approvalId,
    approval_record_id: approvalRead.record_id,
    command_draft_id: ids.commandDraftId,
    command_record_id: commandRecordId || null,
    command_id: ids.commandDraftId,
    command_idempotency_key: ids.commandIdempotencyKey,

    operational_queue_transition_id: ids.operationalQueueTransitionId,
    operational_queue_transition_idempotency_key:
      ids.operationalQueueTransitionIdempotencyKey,

    run_draft_id: ids.runDraftId,
    run_record_id: runRecordId || null,
    run_idempotency_key: ids.runIdempotencyKey,

    post_run_preview_id: ids.postRunPreviewId,
    post_run_idempotency_key: ids.postRunIdempotencyKey,

    current_run_status: runStatus || null,
    current_run_status_select: runStatusSelect || null,
    current_command_status: commandStatus || null,
    current_command_status_select: commandStatusSelect || null,

    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",
    run_mutation: "DISABLED",
    command_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.24",
      status: "POST_RUN_PREVIEW_READY",
      controlled_post_run_preview: "VALIDATED",
      execution_policy: "READ_ONLY_POST_RUN_PREVIEW",
    },

    airtable_config: airtableConfigPublic(airtable),
    worker_config: workerConfigPublic(worker),

    intent_read: {
      http_status: intentRead.http_status,
      record_id: intentRead.record_id,
      error: intentRead.error,
    },
    approval_read: {
      http_status: approvalRead.http_status,
      record_id: approvalRead.record_id,
      error: approvalRead.error,
    },
    command_read: {
      http_status: commandRead.http_status,
      record_id: commandRead.record_id,
      error: commandRead.error,
    },
    run_read: {
      http_status: runRead.http_status,
      record_id: runRead.record_id,
      error: runRead.error,
    },

    persisted_command_snapshot: persistedCommandSnapshot,
    persisted_run_snapshot: persistedRunSnapshot,
    run_input_json: Object.keys(runInputJson).length > 0 ? runInputJson : null,

    worker_target_preview: workerTargetPreview,
    post_run_payload_preview: workerPayloadPreview,
    strict_worker_runrequest_body_preview: buildStrictWorkerRunRequestBody(),
    strict_worker_runrequest_body_alignment: "STRICT_V5_2_1_COMPATIBLE",
    strict_worker_runrequest_body_extra_fields_removed: true,

    post_run_readiness_check: {
      intent_found: Boolean(intentRead.record),
      approval_found: Boolean(approvalRead.record),
      command_found: Boolean(commandRead.record),
      run_found: Boolean(runRead.record),
      command_status_is_queued: commandStatus === "Queued",
      run_status_is_draft: runStatus === "Draft",
      run_linked_to_command:
        stringField(runFields, ["Command_Record_ID"]) === commandRecordId ||
        nestedString(runInputJson, ["command_record_id"]) === commandRecordId,
      run_linked_to_intent:
        stringField(runFields, ["Intent_Record_ID"]) === intentRead.record_id ||
        nestedString(runInputJson, ["metadata", "intent_record_id"]) ===
          intentRead.record_id,
      run_linked_to_approval:
        stringField(runFields, ["Approval_Record_ID"]) === approvalRead.record_id ||
        nestedString(runInputJson, ["metadata", "approval_record_id"]) ===
          approvalRead.record_id,
      worker_base_url_configured: worker.workerBaseUrlConfigured,
      worker_secret_configured: worker.workerSecretConfigured,
      feature_gate_enabled: featureGate.enabled,
      worker_dry_run_reviewed: dryRunReviewGate.enabled,
      operator_confirmation_required: true,
      worker_ack_required: true,
      dry_run_is_true: true,
      post_run_still_disabled: true,
      worker_call_still_disabled: true,
      post_sent_false: true,
      real_run_forbidden: true,
      secret_exposure_disabled: true,
    },

    future_post_run_requirements: [
      "POST /run must have a dedicated feature gate",
      "POST /run must require explicit operator confirmation",
      "POST /run must remain server-side only",
      "Worker secret must never be exposed",
      "Run status transition must be audited separately",
      "Worker execution result must be reviewed after call",
      "Rollback or safe cancellation path must exist",
      "No real run is allowed before execution gate",
    ],

    guardrails: {
      client_fetch: "DISABLED",
      airtable_mutation: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_mutation: "DISABLED",
      run_execution: "DISABLED",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      secret_exposure: "DISABLED",
      dry_run_only: true,
      feature_gated: true,
    },

    internal: {
      airtable,
      worker,
      ids,
      featureGate,
      dryRunReviewGate,
      commandFields,
      runFields,
      runInputJson,
      alreadyPostRunSent,
    },
  };

  return common;
}

function withoutInternal(payload: JsonRecord): JsonRecord {
  const clone = { ...payload };
  delete clone.internal;
  return clone;
}

function statusForGet(payload: JsonRecord): string {
  const internal = asRecord(payload.internal);
  const featureGate = asRecord(internal.featureGate);
  const dryRunReviewGate = asRecord(internal.dryRunReviewGate);
  const worker = asRecord(internal.worker);

  if (Boolean(internal.alreadyPostRunSent)) {
    return "POST_RUN_ALREADY_PERSISTED";
  }

  if (!Boolean(featureGate.enabled)) {
    return "POST_RUN_PERSISTENCE_BLOCKED_BY_FEATURE_GATE";
  }

  if (!Boolean(dryRunReviewGate.enabled)) {
    return "WORKER_DRY_RUN_REVIEW_REQUIRED";
  }

  if (!Boolean(worker.workerBaseUrlConfigured) || !Boolean(worker.workerSecretConfigured)) {
    return "POST_RUN_CONFIG_MISSING";
  }

  if (!payload.intent_record_id) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!payload.approval_record_id) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (!payload.command_record_id) return "COMMAND_NOT_FOUND";
  if (payload.current_command_status !== "Queued") return "COMMAND_STATUS_NOT_QUEUED";
  if (!payload.run_record_id) return "RUN_DRAFT_NOT_FOUND";
  if (payload.current_run_status !== "Draft") return "RUN_STATUS_NOT_DRAFT";

  return "POST_RUN_READY_REQUIRES_POST_CONFIRMATION";
}

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  const incidentId = params.id;

  const basePayload = await buildBasePayload(request, incidentId);
  const status = statusForGet(basePayload);

  const already = status === "POST_RUN_ALREADY_PERSISTED";

  return jsonResponse(
    withoutInternal({
      ...basePayload,
      status,
      method: "GET",
      post_run: already
        ? "DRY_RUN_POST_ALREADY_SENT"
        : status === "POST_RUN_READY_REQUIRES_POST_CONFIRMATION"
          ? "DISABLED_UNTIL_POST_CONFIRMATION"
          : "DISABLED",
      worker_call: already
        ? "DRY_RUN_CALL_ALREADY_SENT"
        : status === "POST_RUN_READY_REQUIRES_POST_CONFIRMATION"
          ? "DISABLED_UNTIL_POST_CONFIRMATION"
          : "DISABLED",
      post_sent: false,
      no_new_worker_call: already,
      run_execution: already ? "DRY_RUN_ONLY" : "DISABLED",
      error: null,
      next_step:
        "V5.26 may introduce POST /run Dry-run Result Review, still without real run execution.",
    })
  );
}

export async function POST(request: Request, context: RouteContext) {
  const params = await context.params;
  const incidentId = params.id;

  const body = asRecord(await request.json().catch(() => null));

  const operatorConfirmation = stringField(body, ["operator_confirmation"]);
  const operatorIdentity = stringField(body, ["operator_identity"]);
  const workerAcknowledgement = stringField(body, ["worker_call_acknowledgement"]);
  const dryRun = body.dry_run === true;

  const basePayload = await buildBasePayload(request, incidentId);
  const internal = asRecord(basePayload.internal);
  const airtable = internal.airtable as ReturnType<typeof getAirtableConfig>;
  const worker = internal.worker as ReturnType<typeof getWorkerConfig>;
  const ids = internal.ids as ReturnType<typeof buildIds>;
  const featureGate = asRecord(internal.featureGate);
  const dryRunReviewGate = asRecord(internal.dryRunReviewGate);
  const alreadyPostRunSent = Boolean(internal.alreadyPostRunSent);

  if (!dryRun) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "REAL_RUN_FORBIDDEN",
        method: "POST",
        post_run: "DISABLED",
        worker_call: "DISABLED",
        post_sent: false,
        run_execution: "DISABLED",
        error: "dry_run must be true. Real run is forbidden in V5.25.1.",
      }),
      400
    );
  }

  if (operatorConfirmation !== OPERATOR_CONFIRMATION) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "POST_CONFIRMATION_REQUIRED",
        method: "POST",
        post_run: "DISABLED",
        worker_call: "DISABLED",
        post_sent: false,
        run_execution: "DISABLED",
        error: `operator_confirmation must be ${OPERATOR_CONFIRMATION}`,
      }),
      400
    );
  }

  if (!operatorIdentity.trim()) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "OPERATOR_IDENTITY_REQUIRED",
        method: "POST",
        post_run: "DISABLED",
        worker_call: "DISABLED",
        post_sent: false,
        run_execution: "DISABLED",
        error: "operator_identity is required.",
      }),
      400
    );
  }

  if (workerAcknowledgement !== WORKER_ACKNOWLEDGEMENT) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "WORKER_CALL_ACKNOWLEDGEMENT_REQUIRED",
        method: "POST",
        post_run: "DISABLED",
        worker_call: "DISABLED",
        post_sent: false,
        run_execution: "DISABLED",
        error: `worker_call_acknowledgement must be ${WORKER_ACKNOWLEDGEMENT}`,
      }),
      400
    );
  }

  if (alreadyPostRunSent) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "POST_RUN_ALREADY_PERSISTED",
        method: "POST",
        post_run: "DRY_RUN_POST_ALREADY_SENT",
        worker_call: "DRY_RUN_CALL_ALREADY_SENT",
        post_sent: false,
        no_new_worker_call: true,
        run_execution: "DRY_RUN_ONLY",
        error: null,
        next_step:
          "V5.26 may introduce POST /run Dry-run Result Review, still without real run execution.",
      })
    );
  }

  if (!Boolean(featureGate.enabled)) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "POST_RUN_PERSISTENCE_BLOCKED_BY_FEATURE_GATE",
        method: "POST",
        post_run: "DISABLED",
        worker_call: "DISABLED",
        post_sent: false,
        run_execution: "DISABLED",
        error: `${POST_RUN_FEATURE_GATE} is not enabled.`,
      }),
      403
    );
  }

  if (!Boolean(dryRunReviewGate.enabled)) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "WORKER_DRY_RUN_REVIEW_REQUIRED",
        method: "POST",
        post_run: "DISABLED",
        worker_call: "DISABLED",
        post_sent: false,
        run_execution: "DISABLED",
        error: `${WORKER_DRY_RUN_REVIEW_GATE} is not enabled.`,
      }),
      403
    );
  }

  if (!worker.workerBaseUrlConfigured || !worker.workerSecretConfigured) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "POST_RUN_CONFIG_MISSING",
        method: "POST",
        post_run: "DISABLED",
        worker_call: "DISABLED",
        post_sent: false,
        run_execution: "DISABLED",
        error: "Worker base URL or worker secret is missing.",
      }),
      500
    );
  }

  if (!basePayload.intent_record_id) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "OPERATOR_INTENT_DRAFT_NOT_FOUND",
        method: "POST",
      }),
      404
    );
  }

  if (!basePayload.approval_record_id) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "OPERATOR_APPROVAL_NOT_FOUND",
        method: "POST",
      }),
      404
    );
  }

  if (!basePayload.command_record_id) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "COMMAND_NOT_FOUND",
        method: "POST",
      }),
      404
    );
  }

  if (basePayload.current_command_status !== "Queued") {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "COMMAND_STATUS_NOT_QUEUED",
        method: "POST",
      }),
      409
    );
  }

  if (!basePayload.run_record_id) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "RUN_DRAFT_NOT_FOUND",
        method: "POST",
      }),
      404
    );
  }

  if (basePayload.current_run_status !== "Draft") {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "RUN_STATUS_NOT_DRAFT",
        method: "POST",
      }),
      409
    );
  }

  const commandRecordId = String(basePayload.command_record_id);
  const runRecordId = String(basePayload.run_record_id);

  const dashboardAuditPayload = buildWorkerPayload({
    workspaceId: String(basePayload.workspace_id),
    incidentId,
    commandRecordId,
    commandId: ids.commandDraftId,
    runRecordId,
    runId: ids.runDraftId,
    intentRecordId: String(basePayload.intent_record_id),
    approvalRecordId: String(basePayload.approval_record_id),
    operatorIdentity,
  });

  const workerRunRequestBody = buildStrictWorkerRunRequestBody();

  if (workerRunRequestBody.dry_run !== true) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "REAL_RUN_FORBIDDEN",
        method: "POST",
        post_run: "DISABLED",
        worker_call: "DISABLED",
        post_sent: false,
        run_execution: "DISABLED",
        error: "Internal worker RunRequest dry_run must be true.",
      }),
      400
    );
  }

  const requestedInputJson = buildRunInputJson({
    workspaceId: String(basePayload.workspace_id),
    incidentId,
    commandRecordId,
    commandId: ids.commandDraftId,
    runRecordId,
    runId: ids.runDraftId,
    runIdempotencyKey: ids.runIdempotencyKey,
    postRunIdempotencyKey: ids.postRunIdempotencyKey,
    intentRecordId: String(basePayload.intent_record_id),
    approvalRecordId: String(basePayload.approval_record_id),
    operatorIdentity,
    requestedOnly: true,
  });

  const preAuditWrite = await updateRecord({
    baseId: airtable.baseId,
    token: airtable.token,
    tableName: airtable.runsTable,
    recordId: runRecordId,
    fields: buildRunAuditFields(requestedInputJson),
  });

  if (preAuditWrite.error) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "POST_RUN_AUDIT_WRITE_FAILED",
        method: "POST",
        post_run: "DISABLED",
        worker_call: "DISABLED",
        post_sent: false,
        run_execution: "DISABLED",
        run_write: preAuditWrite,
        error: preAuditWrite.error,
      }),
      500
    );
  }

  let workerHttpStatus: number | null = null;
  let workerResponseSanitized: unknown = null;
  let workerError: string | null = null;

  try {
    const workerResponse = await fetch(buildWorkerUrl(worker.workerBaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-scheduler-secret": worker.selectedSecret,
      },
      body: JSON.stringify(workerRunRequestBody),
      cache: "no-store",
    });

    workerHttpStatus = workerResponse.status;

    const text = await workerResponse.text();
    const parsed = safeParseJson(text);

    workerResponseSanitized = sanitizeObject(parsed ?? { raw: text });
    workerError = workerResponse.ok ? null : sanitizeErrorText(text);

    if (!workerResponse.ok) {
      return jsonResponse(
        withoutInternal({
          ...basePayload,
          status: "POST_RUN_WORKER_CALL_FAILED",
          method: "POST",
          post_run: "DRY_RUN_POST_SENT_BUT_WORKER_FAILED",
          worker_call: "DRY_RUN_CALL_FAILED",
          post_sent: true,
          run_execution: "DRY_RUN_ONLY",
          worker_run_request_body: workerRunRequestBody,
          worker_run_request_body_alignment: "STRICT_V5_2_1_COMPATIBLE",
          worker_run_request_body_extra_fields_removed: true,
          dashboard_audit_payload: dashboardAuditPayload,
          worker_response: {
            http_status: workerHttpStatus,
            sanitized: true,
            body: workerResponseSanitized,
          },
          error: workerError,
        }),
        502
      );
    }
  } catch (error) {
    workerError = sanitizeErrorText(error);

    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "POST_RUN_WORKER_CALL_FAILED",
        method: "POST",
        post_run: "DRY_RUN_POST_ATTEMPTED",
        worker_call: "DRY_RUN_CALL_FAILED",
        post_sent: true,
        run_execution: "DRY_RUN_ONLY",
        worker_run_request_body: workerRunRequestBody,
        worker_run_request_body_alignment: "STRICT_V5_2_1_COMPATIBLE",
        worker_run_request_body_extra_fields_removed: true,
        dashboard_audit_payload: dashboardAuditPayload,
        worker_response: {
          http_status: workerHttpStatus,
          sanitized: true,
          body: workerResponseSanitized,
        },
        error: workerError,
      }),
      502
    );
  }

  const successInputJson = buildRunInputJson({
    workspaceId: String(basePayload.workspace_id),
    incidentId,
    commandRecordId,
    commandId: ids.commandDraftId,
    runRecordId,
    runId: ids.runDraftId,
    runIdempotencyKey: ids.runIdempotencyKey,
    postRunIdempotencyKey: ids.postRunIdempotencyKey,
    intentRecordId: String(basePayload.intent_record_id),
    approvalRecordId: String(basePayload.approval_record_id),
    operatorIdentity,
    workerResponseSanitized: {
      http_status: workerHttpStatus,
      ok: true,
      sanitized: true,
      secret_exposure: "DISABLED",
      body: workerResponseSanitized,
    },
  });

  const finalAuditWrite = await updateRecord({
    baseId: airtable.baseId,
    token: airtable.token,
    tableName: airtable.runsTable,
    recordId: runRecordId,
    fields: buildRunAuditFields(successInputJson),
  });

  if (finalAuditWrite.error) {
    return jsonResponse(
      withoutInternal({
        ...basePayload,
        status: "POST_RUN_SENT_AUDIT_WRITE_FAILED",
        method: "POST",
        post_run: "DRY_RUN_POST_SENT",
        worker_call: "DRY_RUN_CALL_SENT",
        post_sent: true,
        run_execution: "DRY_RUN_ONLY",
        worker_run_request_body: workerRunRequestBody,
        worker_run_request_body_alignment: "STRICT_V5_2_1_COMPATIBLE",
        worker_run_request_body_extra_fields_removed: true,
        dashboard_audit_payload: dashboardAuditPayload,
        worker_response: {
          http_status: workerHttpStatus,
          ok: true,
          sanitized: true,
          body: workerResponseSanitized,
        },
        run_write: finalAuditWrite,
        error: finalAuditWrite.error,
      }),
      500
    );
  }

  return jsonResponse(
    withoutInternal({
      ...basePayload,
      status: "POST_RUN_DRY_RUN_SENT",
      method: "POST",
      post_run: "DRY_RUN_POST_SENT",
      worker_call: "DRY_RUN_CALL_SENT",
      post_sent: true,
      run_execution: "DRY_RUN_ONLY",
      real_run: "FORBIDDEN",
      secret_exposure: "DISABLED",
      dashboard_airtable_mutation: "RUN_DRAFT_POST_RUN_AUDITED",
      worker_run_request_body: workerRunRequestBody,
      worker_run_request_body_alignment: "STRICT_V5_2_1_COMPATIBLE",
      worker_run_request_body_extra_fields_removed: true,
      dashboard_audit_payload: dashboardAuditPayload,
      worker_response: {
        http_status: workerHttpStatus,
        ok: true,
        sanitized: true,
        body: workerResponseSanitized,
      },
      run_write: finalAuditWrite,
      run_input_json: successInputJson,
      error: null,
      next_step:
        "V5.26 may introduce POST /run Dry-run Result Review, still without real run execution.",
    })
  );
}
