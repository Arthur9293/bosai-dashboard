import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type AirtableRecord = {
  id: string;
  fields: JsonRecord;
  createdTime?: string;
};

type AirtableReadResult = {
  http_status: number | null;
  record_id: string | null;
  error: string | null;
  record: AirtableRecord | null;
};

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const VERSION = "Incident Detail V5.23";
const SOURCE = "dashboard_incident_detail_v5_23_run_draft_review_surface";

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(asString).filter(Boolean).join(", ");
  }
  if (isRecord(value) && typeof value.name === "string") {
    return value.name;
  }
  return "";
}

function asBoolean(value: unknown): boolean {
  if (value === true) return true;
  if (value === 1) return true;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }

  return false;
}

function escapeAirtableFormulaString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function truncate(value: string, maxLength = 2500): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…`;
}

function safeJsonParse(value: string): JsonRecord | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : { value: parsed };
  } catch {
    return null;
  }
}

function safeError(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    return truncate(value);
  }

  try {
    return truncate(JSON.stringify(value));
  } catch {
    return "UNSERIALIZABLE_ERROR";
  }
}

function getAirtableConfig() {
  const baseId = process.env.AIRTABLE_BASE_ID || "";
  const token =
    process.env.AIRTABLE_API_KEY ||
    process.env.AIRTABLE_TOKEN ||
    process.env.AIRTABLE_PAT ||
    "";

  return {
    baseId,
    token,
    operatorIntentsTable:
      process.env.AIRTABLE_OPERATOR_INTENTS_TABLE || "Operator_Intents",
    operatorApprovalsTable:
      process.env.AIRTABLE_OPERATOR_APPROVALS_TABLE || "Operator_Approvals",
    commandsTable: process.env.AIRTABLE_COMMANDS_TABLE || "Commands",
    runsTable:
      process.env.AIRTABLE_SYSTEM_RUNS_TABLE ||
      process.env.AIRTABLE_RUNS_TABLE ||
      "System_Runs",
    configured: Boolean(baseId && token),
  };
}

async function readAirtableRecordByIdempotencyKey(params: {
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
      error: "AIRTABLE_CONFIG_MISSING",
      record: null,
    };
  }

  const url = new URL(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`
  );

  url.searchParams.set("maxRecords", "1");
  url.searchParams.set(
    "filterByFormula",
    `{Idempotency_Key} = "${escapeAirtableFormulaString(idempotencyKey)}"`
  );

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const rawText = await response.text();
    const parsed = safeJsonParse(rawText);

    if (!response.ok) {
      return {
        http_status: response.status,
        record_id: null,
        error: safeError(parsed || rawText),
        record: null,
      };
    }

    const records = Array.isArray(parsed?.records) ? parsed.records : [];
    const firstRecord = records.find(isRecord);

    if (!firstRecord) {
      return {
        http_status: response.status,
        record_id: null,
        error: null,
        record: null,
      };
    }

    const recordId = asString(firstRecord.id);
    const fields = isRecord(firstRecord.fields) ? firstRecord.fields : {};

    return {
      http_status: response.status,
      record_id: recordId || null,
      error: null,
      record: {
        id: recordId,
        fields,
        createdTime: asString(firstRecord.createdTime) || undefined,
      },
    };
  } catch (error) {
    return {
      http_status: null,
      record_id: null,
      error: safeError(error),
      record: null,
    };
  }
}

function buildIntentSnapshot(record: AirtableRecord | null) {
  if (!record) return null;

  const fields = record.fields;

  return {
    record_id: record.id,
    idempotency_key: asString(fields.Idempotency_Key),
    intent_id: asString(fields.Intent_ID),
    workspace_id: asString(fields.Workspace_ID),
    incident_id: asString(fields.Incident_ID),
    source_layer: asString(fields.Source_Layer) || "Incident Detail V5.8",
  };
}

function buildApprovalSnapshot(record: AirtableRecord | null) {
  if (!record) return null;

  const fields = record.fields;

  return {
    record_id: record.id,
    idempotency_key: asString(fields.Idempotency_Key),
    approval_id: asString(fields.Approval_ID),
    operator_identity: asString(fields.Operator_Identity),
    approval_status: asString(fields.Approval_Status),
    operator_decision: asString(fields.Operator_Decision),
    approved_for_command_draft: asBoolean(fields.Approved_For_Command_Draft),
    source_layer: asString(fields.Source_Layer) || "Incident Detail V5.11",
  };
}

function buildCommandSnapshot(record: AirtableRecord | null) {
  if (!record) return null;

  const fields = record.fields;

  return {
    record_id: record.id,
    idempotency_key: asString(fields.Idempotency_Key),
    command_id: asString(fields.Command_ID),
    workspace_id: asString(fields.Workspace_ID),
    incident_id: asString(fields.Incident_ID),
    intent_id: asString(fields.Intent_ID),
    intent_record_id: asString(fields.Intent_Record_ID),
    approval_id: asString(fields.Approval_ID),
    approval_record_id: asString(fields.Approval_Record_ID),
    capability: asString(fields.Capability),
    status: asString(fields.Status),
    status_select: asString(fields.Status_select),
    target_mode: asString(fields.Target_Mode),
    dry_run: asBoolean(fields.Dry_Run),
    operator_identity: asString(fields.Operator_Identity),
    queue_allowed: asBoolean(fields.Queue_Allowed),
    run_creation_allowed: asBoolean(fields.Run_Creation_Allowed),
    worker_call_allowed: asBoolean(fields.Worker_Call_Allowed),
    real_run: asString(fields.Real_Run) || "Forbidden",
    secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
    source_layer: asString(fields.Source_Layer),
  };
}

function buildRunSnapshot(record: AirtableRecord | null) {
  if (!record) return null;

  const fields = record.fields;

  return {
    record_id: record.id,
    idempotency_key: asString(fields.Idempotency_Key),
    run_id: asString(fields.Run_ID),
    workspace_id: asString(fields.Workspace_ID),
    incident_id: asString(fields.Incident_ID),
    command_id: asString(fields.Command_ID),
    command_record_id: asString(fields.Command_Record_ID),
    intent_id: asString(fields.Intent_ID),
    intent_record_id: asString(fields.Intent_Record_ID),
    approval_id: asString(fields.Approval_ID),
    approval_record_id: asString(fields.Approval_Record_ID),
    operational_queue_transition_id: asString(
      fields.Operational_Queue_Transition_ID
    ),
    capability: asString(fields.Capability),
    status: asString(fields.Status),
    status_select: asString(fields.Status_select),
    dry_run: asBoolean(fields.Dry_Run),
    operator_identity: asString(fields.Operator_Identity),
    run_persistence: asString(fields.Run_Persistence),
    post_run_allowed: asBoolean(fields.Post_Run_Allowed),
    worker_call_allowed: asBoolean(fields.Worker_Call_Allowed),
    real_run: asString(fields.Real_Run) || "Forbidden",
    secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
    source_layer: asString(fields.Source_Layer),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const incidentId = params.id;
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspace_id") || "default";

  const config = getAirtableConfig();

  const intentId = `operator-intent:v5.4:${workspaceId}:${incidentId}`;
  const intentIdempotencyKey = `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`;

  const approvalId = `operator-approval:v5.11:${workspaceId}:${incidentId}`;
  const approvalIdempotencyKey = `dashboard:v5.11:gated-operator-approval-persistence:${workspaceId}:${incidentId}`;

  const commandDraftId = `command-draft:v5.13:${workspaceId}:${incidentId}`;
  const commandIdempotencyKey = `dashboard:v5.13:gated-command-draft-persistence:${workspaceId}:${incidentId}`;

  const operationalQueueTransitionId = `operational-queue-transition:v5.19:${workspaceId}:${incidentId}`;
  const operationalQueueTransitionIdempotencyKey = `dashboard:v5.19:gated-operational-queue-persistence:${workspaceId}:${incidentId}`;

  const runDraftId = `run-draft:v5.22:${workspaceId}:${incidentId}`;
  const runIdempotencyKey = `dashboard:v5.22:gated-run-draft-persistence:${workspaceId}:${incidentId}`;

  const configMissing = !config.configured;

  const [intentRead, approvalRead, commandRead, runRead] = configMissing
    ? [
        {
          http_status: null,
          record_id: null,
          error: "AIRTABLE_CONFIG_MISSING",
          record: null,
        },
        {
          http_status: null,
          record_id: null,
          error: "AIRTABLE_CONFIG_MISSING",
          record: null,
        },
        {
          http_status: null,
          record_id: null,
          error: "AIRTABLE_CONFIG_MISSING",
          record: null,
        },
        {
          http_status: null,
          record_id: null,
          error: "AIRTABLE_CONFIG_MISSING",
          record: null,
        },
      ]
    : await Promise.all([
        readAirtableRecordByIdempotencyKey({
          baseId: config.baseId,
          token: config.token,
          tableName: config.operatorIntentsTable,
          idempotencyKey: intentIdempotencyKey,
        }),
        readAirtableRecordByIdempotencyKey({
          baseId: config.baseId,
          token: config.token,
          tableName: config.operatorApprovalsTable,
          idempotencyKey: approvalIdempotencyKey,
        }),
        readAirtableRecordByIdempotencyKey({
          baseId: config.baseId,
          token: config.token,
          tableName: config.commandsTable,
          idempotencyKey: commandIdempotencyKey,
        }),
        readAirtableRecordByIdempotencyKey({
          baseId: config.baseId,
          token: config.token,
          tableName: config.runsTable,
          idempotencyKey: runIdempotencyKey,
        }),
      ]);

  const intentRecord = intentRead.record;
  const approvalRecord = approvalRead.record;
  const commandRecord = commandRead.record;
  const runRecord = runRead.record;

  const commandFields = commandRecord?.fields || {};
  const runFields = runRecord?.fields || {};

  const commandInputJson = safeJsonParse(asString(commandFields.Input_JSON));
  const runInputJson =
    safeJsonParse(asString(runFields.Input_JSON)) || {
      run_id: runDraftId,
      idempotency_key: runIdempotencyKey,
      status: "Draft",
      run_persistence_status: runRecord ? "RUN_DRAFT_PERSISTED" : "UNKNOWN",
      workspace_id: workspaceId,
      incident_id: incidentId,
      command_record_id: commandRead.record_id,
      command_id: commandDraftId,
      capability: "command_orchestrator",
      dry_run: true,
      source: "dashboard_incident_detail_v5_22_gated_run_draft_persistence",
      metadata: {
        origin: "gated_run_draft_persistence",
        intent_record_id: intentRead.record_id,
        approval_record_id: approvalRead.record_id,
        command_record_id: commandRead.record_id,
        operational_queue_transition_id: operationalQueueTransitionId,
        operator_identity: "Arthur",
        run_status_forced_to_draft: true,
        run_execution_allowed_now: false,
        post_run_allowed_now: false,
        worker_call_allowed_now: false,
        real_run_forbidden: true,
      },
    };

  const runMetadata = isRecord(runInputJson.metadata)
    ? runInputJson.metadata
    : {};

  const currentCommandStatus = asString(commandFields.Status) || "UNKNOWN";
  const currentCommandStatusSelect =
    asString(commandFields.Status_select) || "UNKNOWN";
  const currentRunStatus = asString(runFields.Status) || "UNKNOWN";
  const currentRunStatusSelect = asString(runFields.Status_select) || "UNKNOWN";

  const operationalQueueStatus =
    asString(commandInputJson?.operational_queue_status) ||
    (currentCommandStatus === "Queued"
      ? "OPERATIONAL_QUEUE_PERSISTED"
      : "UNKNOWN");

  const reviewCheck = {
    intent_found: Boolean(intentRecord),
    approval_found: Boolean(approvalRecord),
    command_found: Boolean(commandRecord),
    run_found: Boolean(runRecord),

    command_status_is_queued: currentCommandStatus === "Queued",
    command_status_select_is_queued: currentCommandStatusSelect === "Queued",
    operational_queue_persisted:
      operationalQueueStatus === "OPERATIONAL_QUEUE_PERSISTED",

    run_status_is_draft: currentRunStatus === "Draft",
    run_status_select_is_draft: currentRunStatusSelect === "Draft",
    run_persistence_is_draft:
      asString(runFields.Run_Persistence) === "Draft" ||
      asString(runInputJson.run_persistence_status) === "RUN_DRAFT_PERSISTED",

    run_idempotency_key_present:
      asString(runFields.Idempotency_Key) === runIdempotencyKey,

    run_linked_to_command:
      asString(runFields.Command_Record_ID) === commandRead.record_id ||
      asString(runFields.Command_ID) === commandDraftId,

    run_linked_to_intent:
      asString(runFields.Intent_Record_ID) === intentRead.record_id ||
      asString(runFields.Intent_ID) === intentId,

    run_linked_to_approval:
      asString(runFields.Approval_Record_ID) === approvalRead.record_id ||
      asString(runFields.Approval_ID) === approvalId,

    run_linked_to_operational_queue_transition:
      asString(runFields.Operational_Queue_Transition_ID) ===
        operationalQueueTransitionId ||
      asString(runMetadata.operational_queue_transition_id) ===
        operationalQueueTransitionId,

    input_json_contains_run_draft_persisted:
      asString(runInputJson.run_persistence_status) === "RUN_DRAFT_PERSISTED",

    input_json_forces_run_draft:
      asString(runInputJson.status) === "Draft" &&
      asBoolean(runMetadata.run_status_forced_to_draft),

    input_json_disables_run_execution:
      runMetadata.run_execution_allowed_now === false,

    input_json_disables_post_run: runMetadata.post_run_allowed_now === false,

    input_json_disables_worker_call:
      runMetadata.worker_call_allowed_now === false,

    real_run_forbidden:
      asString(runFields.Real_Run) === "Forbidden" ||
      asBoolean(runMetadata.real_run_forbidden),

    secret_exposure_disabled: asString(runFields.Secret_Exposure) === "Disabled",

    no_post_run_by_this_surface: true,
    no_worker_called_by_this_surface: true,
  };

  const anyReadError = Boolean(
    intentRead.error || approvalRead.error || commandRead.error || runRead.error
  );

  const safeToReview =
    reviewCheck.intent_found &&
    reviewCheck.approval_found &&
    reviewCheck.command_found &&
    reviewCheck.run_found &&
    reviewCheck.command_status_is_queued &&
    reviewCheck.command_status_select_is_queued &&
    reviewCheck.operational_queue_persisted &&
    reviewCheck.run_status_is_draft &&
    reviewCheck.run_status_select_is_draft &&
    reviewCheck.run_idempotency_key_present &&
    reviewCheck.run_linked_to_command &&
    reviewCheck.run_linked_to_intent &&
    reviewCheck.run_linked_to_approval &&
    reviewCheck.run_linked_to_operational_queue_transition &&
    reviewCheck.input_json_contains_run_draft_persisted &&
    reviewCheck.input_json_forces_run_draft &&
    reviewCheck.input_json_disables_run_execution &&
    reviewCheck.input_json_disables_post_run &&
    reviewCheck.input_json_disables_worker_call &&
    reviewCheck.real_run_forbidden &&
    reviewCheck.secret_exposure_disabled;

  let status = "RUN_DRAFT_REVIEW_READY";

  if (configMissing) {
    status = "RUN_DRAFT_REVIEW_CONFIG_MISSING";
  } else if (anyReadError) {
    status = "RUN_DRAFT_REVIEW_READ_FAILED";
  } else if (!intentRecord) {
    status = "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  } else if (!approvalRecord) {
    status = "OPERATOR_APPROVAL_NOT_FOUND";
  } else if (!commandRecord) {
    status = "COMMAND_NOT_FOUND";
  } else if (
    currentCommandStatus !== "Queued" ||
    currentCommandStatusSelect !== "Queued"
  ) {
    status = "COMMAND_STATUS_NOT_QUEUED";
  } else if (!runRecord) {
    status = "RUN_DRAFT_NOT_FOUND";
  } else if (
    currentRunStatus !== "Draft" ||
    currentRunStatusSelect !== "Draft"
  ) {
    status = "RUN_STATUS_NOT_DRAFT";
  } else if (!safeToReview) {
    status = "RUN_DRAFT_REVIEW_NOT_SAFE";
  }

  const payload = {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status,
    mode: "RUN_DRAFT_REVIEW_SURFACE_ONLY",
    method: "GET",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,

    intent_id: intentId,
    intent_record_id: intentRead.record_id,
    approval_id: approvalId,
    approval_record_id: approvalRead.record_id,
    command_draft_id: commandDraftId,
    command_record_id: commandRead.record_id,
    command_idempotency_key: commandIdempotencyKey,
    operational_queue_transition_id: operationalQueueTransitionId,
    operational_queue_transition_idempotency_key:
      operationalQueueTransitionIdempotencyKey,

    run_draft_id: runDraftId,
    run_record_id: runRead.record_id,
    run_idempotency_key: runIdempotencyKey,

    run_status: runRecord ? "DRAFT_PERSISTED" : "NOT_PERSISTED",
    run_review: status === "RUN_DRAFT_REVIEW_READY" ? "READY" : "BLOCKED",
    run_persistence: runRecord ? "PERSISTED_AS_DRAFT" : "DISABLED",
    current_run_status: runRecord ? currentRunStatus : "NOT_PERSISTED",
    current_run_status_select: runRecord
      ? currentRunStatusSelect
      : "NOT_PERSISTED",

    current_command_status: currentCommandStatus,
    current_command_status_select: currentCommandStatusSelect,
    operational_queue_status: operationalQueueStatus,

    run_execution: "DISABLED",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",
    run_mutation: "DISABLED",
    command_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.22",
      status: "RUN_DRAFT_ALREADY_PERSISTED_OR_PERSISTED",
      run_draft_persistence: "VALIDATED",
      execution_policy: "RUN_DRAFT_PERSISTENCE_ONLY",
    },

    airtable_config: {
      base_id: config.baseId ? "CONFIGURED" : "MISSING",
      operator_intents_table: config.operatorIntentsTable,
      operator_approvals_table: config.operatorApprovalsTable,
      commands_table: config.commandsTable,
      runs_table: config.runsTable,
      token: config.token ? "CONFIGURED" : "MISSING",
      token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
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

    persisted_intent_snapshot: buildIntentSnapshot(intentRecord),
    persisted_approval_snapshot: buildApprovalSnapshot(approvalRecord),
    persisted_command_snapshot: buildCommandSnapshot(commandRecord),

    persisted_run_snapshot: buildRunSnapshot(runRecord),

    run_input_json: runInputJson,

    run_draft_review_check: reviewCheck,

    external_execution_review: {
      external_scheduler_effect: "NOT_VERIFIED_FROM_THIS_SURFACE",
      external_worker_execution: "NOT_VERIFIED_FROM_THIS_SURFACE",
      external_run_execution: "NOT_VERIFIED_FROM_THIS_SURFACE",
      worker_side_verification_required: true,
      note: "This surface confirms the Run Draft record and Dashboard-side guardrails only. It does not inspect external worker execution.",
    },

    future_post_run_preview_requirements: [
      "POST /run preview must happen before any POST /run execution",
      "POST /run must have a dedicated feature gate",
      "POST /run must require explicit operator confirmation",
      "Run must remain linked to command, incident, intent, approval, and queue transition",
      "Worker execution must remain separately gated",
      "External scheduler aftereffects must be reviewed",
      "Secrets must remain server-side only",
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
      review_only: true,
    },

    error:
      status === "RUN_DRAFT_REVIEW_READY"
        ? null
        : {
            status,
            intent_error: intentRead.error,
            approval_error: approvalRead.error,
            command_error: commandRead.error,
            run_error: runRead.error,
          },

    next_step:
      "V5.24 may introduce Controlled POST /run Preview, still without sending POST /run or worker execution.",
  };

  return NextResponse.json(payload, { status: 200 });
}
