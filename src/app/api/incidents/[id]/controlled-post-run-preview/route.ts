import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

type JsonObject = {
  [key: string]: JsonValue;
};

type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
};

type AirtableReadResult = {
  http_status: number | null;
  record_id: string | null;
  existing_record_found?: boolean;
  error: string | null;
  record: AirtableRecord | null;
};

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const VERSION = "Incident Detail V5.24";
const SOURCE = "dashboard_incident_detail_v5_24_controlled_post_run_preview";

const OPERATOR_INTENTS_TABLE =
  process.env.AIRTABLE_OPERATOR_INTENTS_TABLE || "Operator_Intents";

const OPERATOR_APPROVALS_TABLE =
  process.env.AIRTABLE_OPERATOR_APPROVALS_TABLE || "Operator_Approvals";

const COMMANDS_TABLE = process.env.AIRTABLE_COMMANDS_TABLE || "Commands";

const RUNS_TABLE =
  process.env.AIRTABLE_SYSTEM_RUNS_TABLE ||
  process.env.AIRTABLE_RUNS_TABLE ||
  "System_Runs";

function getAirtableBaseId(): string {
  return (
    process.env.AIRTABLE_BASE_ID ||
    process.env.BOSAI_AIRTABLE_BASE_ID ||
    ""
  ).trim();
}

function getAirtableToken(): string {
  return (
    process.env.AIRTABLE_API_KEY ||
    process.env.AIRTABLE_TOKEN ||
    process.env.AIRTABLE_PAT ||
    process.env.BOSAI_AIRTABLE_TOKEN ||
    ""
  ).trim();
}

function getWorkerBaseUrl(): string {
  return (
    process.env.BOSAI_WORKER_BASE_URL ||
    process.env.NEXT_PUBLIC_BOSAI_WORKER_BASE_URL ||
    ""
  ).trim();
}

function getWorkerSecret(): string {
  return (
    process.env.BOSAI_WORKER_RUN_SECRET ||
    process.env.BOSAI_SCHEDULER_SECRET ||
    process.env.BOSAI_WORKER_SECRET ||
    process.env.BOSAI_RUN_SECRET ||
    process.env.SCHEDULER_SECRET ||
    ""
  ).trim();
}

function sanitizeText(value: unknown): string {
  const raw =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);

  return raw
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/pat[A-Za-z0-9._~-]+/g, "[REDACTED_AIRTABLE_TOKEN]")
    .replace(/key[A-Za-z0-9._~-]+/g, "[REDACTED_KEY]")
    .replace(/secret["']?\s*:\s*["'][^"']+["']/gi, 'secret:"[REDACTED]"')
    .replace(/token["']?\s*:\s*["'][^"']+["']/gi, 'token:"[REDACTED]"');
}

function escapeAirtableFormulaString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(
  fields: Record<string, unknown> | null | undefined,
  names: string[],
  fallback = ""
): string {
  if (!fields) return fallback;

  for (const name of names) {
    const value = fields[name];

    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";

    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];

      if (typeof first === "string") return first;
      if (typeof first === "number") return String(first);
      if (typeof first === "boolean") return first ? "true" : "false";

      if (isRecord(first)) {
        const nestedName = first.name;
        const nestedId = first.id;

        if (typeof nestedName === "string") return nestedName;
        if (typeof nestedId === "string") return nestedId;
      }
    }
  }

  return fallback;
}

function getBoolean(
  fields: Record<string, unknown> | null | undefined,
  names: string[],
  fallback = false
): boolean {
  if (!fields) return fallback;

  for (const name of names) {
    const value = fields[name];

    if (typeof value === "boolean") return value;

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();

      if (["true", "1", "yes", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "off"].includes(normalized)) return false;
    }

    if (typeof value === "number") return value !== 0;
  }

  return fallback;
}

function parseJsonField(value: unknown): JsonObject | null {
  if (isRecord(value)) return value as JsonObject;

  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? (parsed as JsonObject) : null;
  } catch {
    return null;
  }
}

function getNestedBoolean(
  object: JsonObject | null,
  path: string[],
  fallback = false
): boolean {
  let cursor: unknown = object;

  for (const key of path) {
    if (!isRecord(cursor)) return fallback;
    cursor = cursor[key];
  }

  if (typeof cursor === "boolean") return cursor;

  if (typeof cursor === "string") {
    const normalized = cursor.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }

  return fallback;
}

function getNestedString(
  object: JsonObject | null,
  path: string[],
  fallback = ""
): string {
  let cursor: unknown = object;

  for (const key of path) {
    if (!isRecord(cursor)) return fallback;
    cursor = cursor[key];
  }

  if (typeof cursor === "string") return cursor;
  if (typeof cursor === "number") return String(cursor);
  if (typeof cursor === "boolean") return cursor ? "true" : "false";

  return fallback;
}

async function readByIdempotencyKey(params: {
  baseId: string;
  token: string;
  tableName: string;
  idempotencyKey: string;
}): Promise<AirtableReadResult> {
  const { baseId, token, tableName, idempotencyKey } = params;

  if (!baseId || !token) {
    return {
      http_status: null,
      record_id: null,
      existing_record_found: false,
      error: "AIRTABLE_CONFIG_MISSING",
      record: null,
    };
  }

  const formula = `{Idempotency_Key} = "${escapeAirtableFormulaString(
    idempotencyKey
  )}"`;

  const url = `https://api.airtable.com/v0/${encodeURIComponent(
    baseId
  )}/${encodeURIComponent(tableName)}?maxRecords=1&filterByFormula=${encodeURIComponent(
    formula
  )}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();

    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (!response.ok) {
      return {
        http_status: response.status,
        record_id: null,
        existing_record_found: false,
        error: sanitizeText(json),
        record: null,
      };
    }

    const records = isRecord(json) && Array.isArray(json.records)
      ? json.records
      : [];

    const first = records[0];

    if (!isRecord(first) || typeof first.id !== "string") {
      return {
        http_status: response.status,
        record_id: null,
        existing_record_found: false,
        error: null,
        record: null,
      };
    }

    return {
      http_status: response.status,
      record_id: first.id,
      existing_record_found: true,
      error: null,
      record: {
        id: first.id,
        createdTime:
          typeof first.createdTime === "string" ? first.createdTime : undefined,
        fields: isRecord(first.fields) ? first.fields : {},
      },
    };
  } catch (error) {
    return {
      http_status: null,
      record_id: null,
      existing_record_found: false,
      error: sanitizeText(error instanceof Error ? error.message : error),
      record: null,
    };
  }
}

function buildPayload(params: {
  method: "GET";
  incidentId: string;
  workspaceId: string;
  status: string;
  baseIdConfigured: boolean;
  tokenConfigured: boolean;
  workerBaseUrlConfigured: boolean;
  workerSecretConfigured: boolean;
  intentRead: AirtableReadResult;
  approvalRead: AirtableReadResult;
  commandRead: AirtableReadResult;
  runRead: AirtableReadResult;
  error: string | null;
}) {
  const {
    method,
    incidentId,
    workspaceId,
    status,
    baseIdConfigured,
    tokenConfigured,
    workerBaseUrlConfigured,
    workerSecretConfigured,
    intentRead,
    approvalRead,
    commandRead,
    runRead,
    error,
  } = params;

  const intentId = `operator-intent:v5.4:${workspaceId}:${incidentId}`;
  const intentKey = `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`;

  const approvalId = `operator-approval:v5.11:${workspaceId}:${incidentId}`;
  const approvalKey = `dashboard:v5.11:gated-operator-approval-persistence:${workspaceId}:${incidentId}`;

  const commandId = `command-draft:v5.13:${workspaceId}:${incidentId}`;
  const commandKey = `dashboard:v5.13:gated-command-draft-persistence:${workspaceId}:${incidentId}`;

  const operationalQueueTransitionId = `operational-queue-transition:v5.19:${workspaceId}:${incidentId}`;
  const operationalQueueTransitionKey = `dashboard:v5.19:gated-operational-queue-persistence:${workspaceId}:${incidentId}`;

  const runDraftId = `run-draft:v5.22:${workspaceId}:${incidentId}`;
  const runKey = `dashboard:v5.22:gated-run-draft-persistence:${workspaceId}:${incidentId}`;

  const postRunPreviewId = `post-run-preview:v5.24:${workspaceId}:${incidentId}`;
  const postRunKey = `dashboard:v5.24:controlled-post-run-preview:${workspaceId}:${incidentId}`;

  const intentFields = intentRead.record?.fields ?? {};
  const approvalFields = approvalRead.record?.fields ?? {};
  const commandFields = commandRead.record?.fields ?? {};
  const runFields = runRead.record?.fields ?? {};

  const commandStatus =
    getString(commandFields, ["Status"]) ||
    getString(commandFields, ["Status_select"]) ||
    "Unknown";

  const commandStatusSelect =
    getString(commandFields, ["Status_select"]) ||
    getString(commandFields, ["Status"]) ||
    "Unknown";

  const runStatus =
    getString(runFields, ["Status"]) ||
    getString(runFields, ["Status_select"]) ||
    "Unknown";

  const runStatusSelect =
    getString(runFields, ["Status_select"]) ||
    getString(runFields, ["Status"]) ||
    "Unknown";

  const commandRecordId = commandRead.record_id;
  const runRecordId = runRead.record_id;

  const runInputJson = parseJsonField(runFields.Input_JSON);

  const commandRealRun =
    getString(commandFields, ["Real_Run"], "Forbidden") || "Forbidden";
  const commandSecretExposure =
    getString(commandFields, ["Secret_Exposure"], "Disabled") || "Disabled";

  const runRealRun =
    getString(runFields, ["Real_Run"], "Forbidden") || "Forbidden";
  const runSecretExposure =
    getString(runFields, ["Secret_Exposure"], "Disabled") || "Disabled";

  const commandSnapshot = commandRead.record
    ? {
        record_id: commandRead.record.id,
        idempotency_key: getString(commandFields, ["Idempotency_Key"], commandKey),
        command_id: getString(commandFields, ["Command_ID"], commandId),
        workspace_id: getString(commandFields, ["Workspace_ID"], workspaceId),
        incident_id: getString(commandFields, ["Incident_ID"], incidentId),
        intent_id: getString(commandFields, ["Intent_ID"], intentId),
        intent_record_id: getString(
          commandFields,
          ["Intent_Record_ID"],
          intentRead.record_id ?? ""
        ),
        approval_id: getString(commandFields, ["Approval_ID"], approvalId),
        approval_record_id: getString(
          commandFields,
          ["Approval_Record_ID"],
          approvalRead.record_id ?? ""
        ),
        capability: getString(commandFields, ["Capability"], "command_orchestrator"),
        status: commandStatus,
        status_select: commandStatusSelect,
        target_mode: getString(commandFields, ["Target_Mode"], "dry_run_only"),
        dry_run: getBoolean(commandFields, ["Dry_Run"], true),
        operator_identity: getString(commandFields, ["Operator_Identity"], "Arthur"),
        queue_allowed: getBoolean(commandFields, ["Queue_Allowed"], true),
        run_creation_allowed: getBoolean(
          commandFields,
          ["Run_Creation_Allowed"],
          false
        ),
        worker_call_allowed: getBoolean(
          commandFields,
          ["Worker_Call_Allowed"],
          false
        ),
        real_run: commandRealRun,
        secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
        source_layer: getString(commandFields, ["Source_Layer"], "Incident Detail V5.19"),
      }
    : null;

  const runSnapshot = runRead.record
    ? {
        record_id: runRead.record.id,
        idempotency_key: getString(runFields, ["Idempotency_Key"], runKey),
        run_id: getString(runFields, ["Run_ID"], runDraftId),
        workspace_id: getString(runFields, ["Workspace_ID"], workspaceId),
        incident_id: getString(runFields, ["Incident_ID"], incidentId),
        command_id: getString(runFields, ["Command_ID"], commandId),
        command_record_id: getString(
          runFields,
          ["Command_Record_ID"],
          commandRecordId ?? ""
        ),
        intent_id: getString(runFields, ["Intent_ID"], intentId),
        intent_record_id: getString(
          runFields,
          ["Intent_Record_ID"],
          intentRead.record_id ?? ""
        ),
        approval_id: getString(runFields, ["Approval_ID"], approvalId),
        approval_record_id: getString(
          runFields,
          ["Approval_Record_ID"],
          approvalRead.record_id ?? ""
        ),
        operational_queue_transition_id: getString(
          runFields,
          ["Operational_Queue_Transition_ID"],
          operationalQueueTransitionId
        ),
        capability: getString(runFields, ["Capability"], "command_orchestrator"),
        status: runStatus,
        status_select: runStatusSelect,
        dry_run: getBoolean(runFields, ["Dry_Run"], true),
        operator_identity: getString(runFields, ["Operator_Identity"], "Arthur"),
        run_persistence: getString(runFields, ["Run_Persistence"], "Draft"),
        post_run_allowed: getBoolean(runFields, ["Post_Run_Allowed"], false),
        worker_call_allowed: getBoolean(runFields, ["Worker_Call_Allowed"], false),
        real_run: runRealRun,
        secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
        source_layer: getString(runFields, ["Source_Layer"], "Incident Detail V5.22"),
      }
    : null;

  const postRunPayloadPreview = {
    run_id: runDraftId,
    run_record_id: runRecordId,
    command_record_id: commandRecordId,
    command_id: commandId,
    workspace_id: workspaceId,
    incident_id: incidentId,
    capability: "command_orchestrator",
    dry_run: true,
    source: SOURCE,
    metadata: {
      origin: "controlled_post_run_preview",
      intent_record_id: intentRead.record_id,
      approval_record_id: approvalRead.record_id,
      operator_identity:
        getString(runFields, ["Operator_Identity"]) ||
        getNestedString(runInputJson, ["metadata", "operator_identity"], "Arthur"),
      post_run_allowed_now: false,
      worker_call_allowed_now: false,
      real_run_forbidden: true,
    },
  };

  const runLinkedToCommand =
    Boolean(runRead.record && commandRecordId) &&
    getString(runFields, ["Command_Record_ID"]) === commandRecordId;

  const runLinkedToIntent =
    Boolean(runRead.record && intentRead.record_id) &&
    getString(runFields, ["Intent_Record_ID"]) === intentRead.record_id;

  const runLinkedToApproval =
    Boolean(runRead.record && approvalRead.record_id) &&
    getString(runFields, ["Approval_Record_ID"]) === approvalRead.record_id;

  const postRunReadinessCheck = {
    intent_found: Boolean(intentRead.record_id),
    approval_found: Boolean(approvalRead.record_id),
    command_found: Boolean(commandRead.record_id),
    run_found: Boolean(runRead.record_id),
    command_status_is_queued: commandStatus === "Queued",
    run_status_is_draft: runStatus === "Draft",
    run_linked_to_command: runLinkedToCommand,
    run_linked_to_intent: runLinkedToIntent,
    run_linked_to_approval: runLinkedToApproval,
    worker_base_url_configured: workerBaseUrlConfigured,
    worker_secret_configured: workerSecretConfigured,
    post_run_still_disabled: true,
    worker_call_still_disabled: true,
    post_sent_false: true,
    real_run_forbidden:
      runRealRun === "Forbidden" ||
      getNestedBoolean(runInputJson, ["metadata", "real_run_forbidden"], true),
    secret_exposure_disabled: runSecretExposure === "Disabled",
  };

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status,
    mode: "CONTROLLED_POST_RUN_PREVIEW_ONLY",
    method,
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,

    intent_id: intentId,
    intent_record_id: intentRead.record_id,
    approval_id: approvalId,
    approval_record_id: approvalRead.record_id,

    command_draft_id: commandId,
    command_record_id: commandRecordId,
    command_idempotency_key: commandKey,

    operational_queue_transition_id: operationalQueueTransitionId,
    operational_queue_transition_idempotency_key: operationalQueueTransitionKey,

    run_draft_id: runDraftId,
    run_record_id: runRecordId,
    run_idempotency_key: runKey,

    post_run_preview_id: postRunPreviewId,
    post_run_idempotency_key: postRunKey,

    current_run_status: runStatus,
    current_run_status_select: runStatusSelect,
    current_command_status: commandStatus,
    current_command_status_select: commandStatusSelect,

    post_run: "DISABLED_FROM_THIS_SURFACE",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    run_execution: "DISABLED",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",
    run_mutation: "DISABLED",
    command_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.23",
      status: "RUN_DRAFT_REVIEW_READY",
      run_draft_review: "VALIDATED",
      execution_policy: "READ_ONLY_RUN_DRAFT_REVIEW",
    },

    airtable_config: {
      base_id: baseIdConfigured ? "CONFIGURED" : "MISSING",
      operator_intents_table: OPERATOR_INTENTS_TABLE,
      operator_approvals_table: OPERATOR_APPROVALS_TABLE,
      commands_table: COMMANDS_TABLE,
      runs_table: RUNS_TABLE,
      token: tokenConfigured ? "CONFIGURED" : "MISSING",
      token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    },

    worker_config: {
      worker_base_url: workerBaseUrlConfigured ? "CONFIGURED" : "MISSING",
      worker_secret: workerSecretConfigured ? "CONFIGURED" : "MISSING",
      worker_secret_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    },

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

    persisted_intent_snapshot: intentRead.record
      ? {
          record_id: intentRead.record.id,
          idempotency_key: getString(intentFields, ["Idempotency_Key"], intentKey),
          intent_id: getString(intentFields, ["Intent_ID"], intentId),
          workspace_id: getString(intentFields, ["Workspace_ID"], workspaceId),
          incident_id: getString(intentFields, ["Incident_ID"], incidentId),
          source_layer: getString(intentFields, ["Source_Layer"], "Incident Detail V5.8"),
        }
      : null,

    persisted_approval_snapshot: approvalRead.record
      ? {
          record_id: approvalRead.record.id,
          idempotency_key: getString(
            approvalFields,
            ["Idempotency_Key"],
            approvalKey
          ),
          approval_id: getString(approvalFields, ["Approval_ID"], approvalId),
          operator_identity: getString(
            approvalFields,
            ["Operator_Identity"],
            "Arthur"
          ),
          approval_status: getString(approvalFields, ["Approval_Status"], "Approved"),
          operator_decision: getString(
            approvalFields,
            ["Operator_Decision"],
            "Approve Draft Intent"
          ),
          approved_for_command_draft: getBoolean(
            approvalFields,
            ["Approved_For_Command_Draft"],
            true
          ),
          source_layer: getString(approvalFields, ["Source_Layer"], "Incident Detail V5.11"),
        }
      : null,

    persisted_command_snapshot: commandSnapshot,
    persisted_run_snapshot: runSnapshot,

    run_input_json: runInputJson,

    worker_target_preview: {
      method: "POST",
      endpoint: "/run",
      base_url: workerBaseUrlConfigured ? "CONFIGURED" : "MISSING",
      full_url_preview: workerBaseUrlConfigured
        ? "SERVER_SIDE_ONLY_REDACTED"
        : "MISSING",
      secret_header_required: true,
      secret: workerSecretConfigured ? "CONFIGURED" : "MISSING",
      secret_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
      headers_preview: {
        "Content-Type": "application/json",
        "x-scheduler-secret": "SERVER_SIDE_ONLY_NOT_EXPOSED",
      },
      post_sent: false,
    },

    post_run_payload_preview: postRunPayloadPreview,

    post_run_readiness_check: postRunReadinessCheck,

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
      preview_only: true,
    },

    error,

    next_step:
      "V5.25 may introduce Gated POST /run Persistence, with strict feature gate and operator confirmation.",
  };
}

function getFinalStatus(params: {
  baseIdConfigured: boolean;
  tokenConfigured: boolean;
  workerBaseUrlConfigured: boolean;
  workerSecretConfigured: boolean;
  intentRead: AirtableReadResult;
  approvalRead: AirtableReadResult;
  commandRead: AirtableReadResult;
  runRead: AirtableReadResult;
  commandStatus: string;
  commandStatusSelect: string;
  runStatus: string;
  runStatusSelect: string;
  checks: Record<string, boolean>;
}): string {
  const {
    baseIdConfigured,
    tokenConfigured,
    workerBaseUrlConfigured,
    workerSecretConfigured,
    intentRead,
    approvalRead,
    commandRead,
    runRead,
    commandStatus,
    commandStatusSelect,
    runStatus,
    runStatusSelect,
    checks,
  } = params;

  if (
    !baseIdConfigured ||
    !tokenConfigured ||
    !workerBaseUrlConfigured ||
    !workerSecretConfigured
  ) {
    return "POST_RUN_PREVIEW_CONFIG_MISSING";
  }

  if (
    intentRead.error ||
    approvalRead.error ||
    commandRead.error ||
    runRead.error
  ) {
    return "POST_RUN_PREVIEW_READ_FAILED";
  }

  if (!intentRead.record_id) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!approvalRead.record_id) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (!commandRead.record_id) return "COMMAND_NOT_FOUND";

  if (commandStatus !== "Queued" || commandStatusSelect !== "Queued") {
    return "COMMAND_STATUS_NOT_QUEUED";
  }

  if (!runRead.record_id) return "RUN_DRAFT_NOT_FOUND";

  if (runStatus !== "Draft" || runStatusSelect !== "Draft") {
    return "RUN_STATUS_NOT_DRAFT";
  }

  const allSafe = Object.values(checks).every(Boolean);

  if (!allSafe) return "POST_RUN_PREVIEW_NOT_SAFE";

  return "POST_RUN_PREVIEW_READY";
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const incidentId = decodeURIComponent(params.id || "").trim();

  const url = new URL(request.url);
  const workspaceId =
    url.searchParams.get("workspace_id")?.trim() ||
    url.searchParams.get("workspaceId")?.trim() ||
    "default";

  const baseId = getAirtableBaseId();
  const token = getAirtableToken();
  const workerBaseUrl = getWorkerBaseUrl();
  const workerSecret = getWorkerSecret();

  const baseIdConfigured = Boolean(baseId);
  const tokenConfigured = Boolean(token);
  const workerBaseUrlConfigured = Boolean(workerBaseUrl);
  const workerSecretConfigured = Boolean(workerSecret);

  const intentKey = `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`;
  const approvalKey = `dashboard:v5.11:gated-operator-approval-persistence:${workspaceId}:${incidentId}`;
  const commandKey = `dashboard:v5.13:gated-command-draft-persistence:${workspaceId}:${incidentId}`;
  const runKey = `dashboard:v5.22:gated-run-draft-persistence:${workspaceId}:${incidentId}`;

  const [intentRead, approvalRead, commandRead, runRead] = await Promise.all([
    readByIdempotencyKey({
      baseId,
      token,
      tableName: OPERATOR_INTENTS_TABLE,
      idempotencyKey: intentKey,
    }),
    readByIdempotencyKey({
      baseId,
      token,
      tableName: OPERATOR_APPROVALS_TABLE,
      idempotencyKey: approvalKey,
    }),
    readByIdempotencyKey({
      baseId,
      token,
      tableName: COMMANDS_TABLE,
      idempotencyKey: commandKey,
    }),
    readByIdempotencyKey({
      baseId,
      token,
      tableName: RUNS_TABLE,
      idempotencyKey: runKey,
    }),
  ]);

  const commandFields = commandRead.record?.fields ?? {};
  const runFields = runRead.record?.fields ?? {};
  const runInputJson = parseJsonField(runFields.Input_JSON);

  const commandStatus =
    getString(commandFields, ["Status"]) ||
    getString(commandFields, ["Status_select"]) ||
    "Unknown";

  const commandStatusSelect =
    getString(commandFields, ["Status_select"]) ||
    getString(commandFields, ["Status"]) ||
    "Unknown";

  const runStatus =
    getString(runFields, ["Status"]) ||
    getString(runFields, ["Status_select"]) ||
    "Unknown";

  const runStatusSelect =
    getString(runFields, ["Status_select"]) ||
    getString(runFields, ["Status"]) ||
    "Unknown";

  const runLinkedToCommand =
    Boolean(runRead.record_id && commandRead.record_id) &&
    getString(runFields, ["Command_Record_ID"]) === commandRead.record_id;

  const runLinkedToIntent =
    Boolean(runRead.record_id && intentRead.record_id) &&
    getString(runFields, ["Intent_Record_ID"]) === intentRead.record_id;

  const runLinkedToApproval =
    Boolean(runRead.record_id && approvalRead.record_id) &&
    getString(runFields, ["Approval_Record_ID"]) === approvalRead.record_id;

  const checks = {
    intent_found: Boolean(intentRead.record_id),
    approval_found: Boolean(approvalRead.record_id),
    command_found: Boolean(commandRead.record_id),
    run_found: Boolean(runRead.record_id),
    command_status_is_queued: commandStatus === "Queued",
    run_status_is_draft: runStatus === "Draft",
    run_linked_to_command: runLinkedToCommand,
    run_linked_to_intent: runLinkedToIntent,
    run_linked_to_approval: runLinkedToApproval,
    worker_base_url_configured: workerBaseUrlConfigured,
    worker_secret_configured: workerSecretConfigured,
    post_run_still_disabled:
      getNestedBoolean(runInputJson, ["metadata", "post_run_allowed_now"], false) ===
      false,
    worker_call_still_disabled:
      getNestedBoolean(
        runInputJson,
        ["metadata", "worker_call_allowed_now"],
        false
      ) === false,
    post_sent_false: true,
    real_run_forbidden:
      getString(runFields, ["Real_Run"], "Forbidden") === "Forbidden" ||
      getNestedBoolean(runInputJson, ["metadata", "real_run_forbidden"], true),
    secret_exposure_disabled:
      getString(runFields, ["Secret_Exposure"], "Disabled") === "Disabled",
  };

  const status = getFinalStatus({
    baseIdConfigured,
    tokenConfigured,
    workerBaseUrlConfigured,
    workerSecretConfigured,
    intentRead,
    approvalRead,
    commandRead,
    runRead,
    commandStatus,
    commandStatusSelect,
    runStatus,
    runStatusSelect,
    checks,
  });

  const readError =
    intentRead.error ||
    approvalRead.error ||
    commandRead.error ||
    runRead.error ||
    null;

  const payload = buildPayload({
    method: "GET",
    incidentId,
    workspaceId,
    status,
    baseIdConfigured,
    tokenConfigured,
    workerBaseUrlConfigured,
    workerSecretConfigured,
    intentRead,
    approvalRead,
    commandRead,
    runRead,
    error: status === "POST_RUN_PREVIEW_READ_FAILED" ? readError : null,
  });

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
