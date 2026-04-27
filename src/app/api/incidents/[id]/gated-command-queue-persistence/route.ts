import { NextRequest, NextResponse } from "next/server";

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

type QueuePersistenceStatus =
  | "COMMAND_QUEUE_PERSISTENCE_BLOCKED_BY_FEATURE_GATE"
  | "COMMAND_QUEUE_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION"
  | "COMMAND_QUEUE_INTENT_PERSISTED"
  | "COMMAND_QUEUE_INTENT_ALREADY_PERSISTED"
  | "COMMAND_QUEUE_PERSISTENCE_CONFIG_MISSING"
  | "COMMAND_QUEUE_PERSISTENCE_READ_FAILED"
  | "COMMAND_QUEUE_PERSISTENCE_WRITE_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "COMMAND_DRAFT_NOT_FOUND"
  | "COMMAND_DRAFT_STATUS_NOT_DRAFT"
  | "COMMAND_QUEUE_NOT_ALLOWED"
  | "REAL_RUN_FORBIDDEN"
  | "POST_CONFIRMATION_REQUIRED"
  | "OPERATOR_IDENTITY_REQUIRED";

type FeatureGateState =
  | "FEATURE_GATE_MISSING"
  | "FEATURE_GATE_DISABLED"
  | "FEATURE_GATE_ENABLED";

type AirtableRecordResult = {
  ok: boolean;
  status: number;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

type AirtableWriteResult = {
  ok: boolean;
  status: number | null;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
  writeExecuted: boolean;
};

const VERSION = "Incident Detail V5.16";
const SOURCE = "dashboard_incident_detail_v5_16_gated_command_queue_persistence";
const QUEUE_GATE_ENV = "BOSAI_COMMAND_QUEUE_PERSISTENCE_ENABLED";
const REQUIRED_CONFIRMATION_TOKEN = "PERSIST_COMMAND_QUEUE_INTENT";

function normalizeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIncidentId(value: string | null | undefined): string {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : "unknown";
}

function normalizeWorkspaceId(value: string | null | undefined): string {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : "production";
}

function getAirtableToken(): string | null {
  return (
    process.env.AIRTABLE_API_KEY ||
    process.env.AIRTABLE_TOKEN ||
    process.env.AIRTABLE_PAT ||
    null
  );
}

function getAirtableBaseId(): string | null {
  return process.env.AIRTABLE_BASE_ID || process.env.BOSAI_AIRTABLE_BASE_ID || null;
}

function getOperatorIntentsTable(): string {
  return (
    process.env.AIRTABLE_OPERATOR_INTENTS_TABLE ||
    process.env.BOSAI_OPERATOR_INTENTS_TABLE ||
    "Operator_Intents"
  );
}

function getOperatorApprovalsTable(): string {
  return (
    process.env.AIRTABLE_OPERATOR_APPROVALS_TABLE ||
    process.env.BOSAI_OPERATOR_APPROVALS_TABLE ||
    "Operator_Approvals"
  );
}

function getCommandsTable(): string {
  return process.env.AIRTABLE_COMMANDS_TABLE || "Commands";
}

function resolveFeatureGate(): {
  feature_gate_env: string;
  feature_gate_enabled: boolean;
  feature_gate_state: FeatureGateState;
  feature_gate_value: "MISSING" | "SERVER_SIDE_ONLY_NOT_EXPOSED";
} {
  const raw = process.env[QUEUE_GATE_ENV];

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      feature_gate_env: QUEUE_GATE_ENV,
      feature_gate_enabled: false,
      feature_gate_state: "FEATURE_GATE_MISSING",
      feature_gate_value: "MISSING",
    };
  }

  const normalized = raw.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return {
      feature_gate_env: QUEUE_GATE_ENV,
      feature_gate_enabled: true,
      feature_gate_state: "FEATURE_GATE_ENABLED",
      feature_gate_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    };
  }

  return {
    feature_gate_env: QUEUE_GATE_ENV,
    feature_gate_enabled: false,
    feature_gate_state: "FEATURE_GATE_DISABLED",
    feature_gate_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
  };
}

function buildIntentId(workspaceId: string, incidentId: string): string {
  return `operator-intent:v5.4:${workspaceId}:${incidentId}`;
}

function buildApprovalId(workspaceId: string, incidentId: string): string {
  return `operator-approval:v5.11:${workspaceId}:${incidentId}`;
}

function buildCommandDraftId(workspaceId: string, incidentId: string): string {
  return `command-draft:v5.13:${workspaceId}:${incidentId}`;
}

function buildQueuePreviewId(workspaceId: string, incidentId: string): string {
  return `queue-preview:v5.15:${workspaceId}:${incidentId}`;
}

function buildIntentIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`;
}

function buildApprovalIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.11:gated-operator-approval-persistence:${workspaceId}:${incidentId}`;
}

function buildCommandIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.13:gated-command-draft-persistence:${workspaceId}:${incidentId}`;
}

function buildQueueTransitionIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.16:gated-command-queue-persistence:${workspaceId}:${incidentId}`;
}

function escapeAirtableFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function safeError(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 1500);
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isQueueIntentPersisted(fields: Record<string, unknown> | null): boolean {
  if (!fields) return false;

  const parsed = parseJsonObject(fields.Input_JSON);
  const queueIntentStatus = safeString(parsed?.queue_intent_status);
  const sourceLayer = safeString(fields.Source_Layer);

  return (
    queueIntentStatus === "QUEUE_INTENT_PERSISTED" ||
    sourceLayer === VERSION ||
    (safeBoolean(fields.Queue_Allowed) === true && sourceLayer === "Incident Detail V5.16")
  );
}

function buildQueueInputJson(input: {
  workspaceId: string;
  incidentId: string;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  operatorIdentity: string;
}) {
  return {
    capability: "command_orchestrator",
    status: "Draft",
    queue_intent_status: "QUEUE_INTENT_PERSISTED",
    workspace_id: input.workspaceId,
    incident_id: input.incidentId,
    dry_run: true,
    source: SOURCE,
    metadata: {
      origin: "gated_command_queue_persistence",
      queue_preview_id: buildQueuePreviewId(input.workspaceId, input.incidentId),
      queue_transition_idempotency_key: buildQueueTransitionIdempotencyKey(
        input.workspaceId,
        input.incidentId
      ),
      intent_record_id: input.intentRecordId,
      approval_record_id: input.approvalRecordId,
      command_record_id: input.commandRecordId,
      operator_identity: input.operatorIdentity,
      status_select_preserved_as_draft: true,
      operational_queue_still_disabled: true,
      real_run_forbidden: true,
      run_creation_allowed_now: false,
      worker_call_allowed_now: false,
    },
  };
}

function buildCommandUpdateFields(input: {
  workspaceId: string;
  incidentId: string;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  operatorIdentity: string;
}): Record<string, unknown> {
  return {
    Queue_Allowed: true,
    Run_Creation_Allowed: false,
    Worker_Call_Allowed: false,
    Real_Run: "Forbidden",
    Secret_Exposure: "Disabled",
    Source_Layer: VERSION,
    Input_JSON: JSON.stringify(
      buildQueueInputJson({
        workspaceId: input.workspaceId,
        incidentId: input.incidentId,
        intentRecordId: input.intentRecordId,
        approvalRecordId: input.approvalRecordId,
        commandRecordId: input.commandRecordId,
        operatorIdentity: input.operatorIdentity,
      })
    ),
  };
}

async function findAirtableRecordByIdempotency(input: {
  token: string;
  baseId: string;
  table: string;
  idempotencyKey: string;
}): Promise<AirtableRecordResult> {
  const formula = `{Idempotency_Key} = '${escapeAirtableFormulaValue(
    input.idempotencyKey
  )}'`;

  const url = new URL(
    `https://api.airtable.com/v0/${encodeURIComponent(
      input.baseId
    )}/${encodeURIComponent(input.table)}`
  );

  url.searchParams.set("maxRecords", "1");
  url.searchParams.set("filterByFormula", formula);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${input.token}`,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      recordId: null,
      fields: null,
      error: safeError(text),
    };
  }

  try {
    const json = JSON.parse(text) as {
      records?: Array<{
        id?: string;
        fields?: Record<string, unknown>;
      }>;
    };

    const record = json.records?.[0];

    return {
      ok: true,
      status: response.status,
      recordId: record?.id ?? null,
      fields: record?.fields ?? null,
      error: null,
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      recordId: null,
      fields: null,
      error: "Unable to parse Airtable response.",
    };
  }
}

async function updateAirtableRecord(input: {
  token: string;
  baseId: string;
  table: string;
  recordId: string;
  fields: Record<string, unknown>;
}): Promise<AirtableWriteResult> {
  const url = `https://api.airtable.com/v0/${encodeURIComponent(
    input.baseId
  )}/${encodeURIComponent(input.table)}/${encodeURIComponent(input.recordId)}`;

  const response = await fetch(url, {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: input.fields,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      recordId: null,
      fields: null,
      error: safeError(text),
      writeExecuted: true,
    };
  }

  try {
    const json = JSON.parse(text) as {
      id?: string;
      fields?: Record<string, unknown>;
    };

    return {
      ok: true,
      status: response.status,
      recordId: json.id ?? input.recordId,
      fields: json.fields ?? null,
      error: null,
      writeExecuted: true,
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      recordId: input.recordId,
      fields: null,
      error: "Unable to parse Airtable write response.",
      writeExecuted: true,
    };
  }
}

async function readState(input: {
  token: string;
  baseId: string;
  workspaceId: string;
  incidentId: string;
}): Promise<{
  ok: boolean;
  reason: string | null;
  intent: AirtableRecordResult;
  approval: AirtableRecordResult;
  command: AirtableRecordResult;
}> {
  const intent = await findAirtableRecordByIdempotency({
    token: input.token,
    baseId: input.baseId,
    table: getOperatorIntentsTable(),
    idempotencyKey: buildIntentIdempotencyKey(input.workspaceId, input.incidentId),
  });

  if (!intent.ok) {
    return {
      ok: false,
      reason: "intent_read_failed",
      intent,
      approval: {
        ok: false,
        status: 0,
        recordId: null,
        fields: null,
        error: "Approval read skipped because intent read failed.",
      },
      command: {
        ok: false,
        status: 0,
        recordId: null,
        fields: null,
        error: "Command read skipped because intent read failed.",
      },
    };
  }

  const approval = await findAirtableRecordByIdempotency({
    token: input.token,
    baseId: input.baseId,
    table: getOperatorApprovalsTable(),
    idempotencyKey: buildApprovalIdempotencyKey(input.workspaceId, input.incidentId),
  });

  if (!approval.ok) {
    return {
      ok: false,
      reason: "approval_read_failed",
      intent,
      approval,
      command: {
        ok: false,
        status: 0,
        recordId: null,
        fields: null,
        error: "Command read skipped because approval read failed.",
      },
    };
  }

  const command = await findAirtableRecordByIdempotency({
    token: input.token,
    baseId: input.baseId,
    table: getCommandsTable(),
    idempotencyKey: buildCommandIdempotencyKey(input.workspaceId, input.incidentId),
  });

  if (!command.ok) {
    return {
      ok: false,
      reason: "command_read_failed",
      intent,
      approval,
      command,
    };
  }

  return {
    ok: true,
    reason: null,
    intent,
    approval,
    command,
  };
}

function commandIsDraft(fields: Record<string, unknown> | null): boolean {
  if (!fields) return false;
  return safeString(fields.Status) === "Draft" || safeString(fields.Status_select) === "Draft";
}

function commandSafetyOk(fields: Record<string, unknown> | null): boolean {
  if (!fields) return false;

  return (
    commandIsDraft(fields) &&
    safeString(fields.Capability) === "command_orchestrator" &&
    safeString(fields.Target_Mode) === "dry_run_only" &&
    safeBoolean(fields.Dry_Run) === true &&
    safeBoolean(fields.Run_Creation_Allowed) !== true &&
    safeBoolean(fields.Worker_Call_Allowed) !== true &&
    safeString(fields.Real_Run) === "Forbidden" &&
    safeString(fields.Secret_Exposure) === "Disabled"
  );
}

function resolveGetStatus(input: {
  stateOk: boolean;
  featureGateEnabled: boolean;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  commandFields: Record<string, unknown> | null;
}): QueuePersistenceStatus {
  if (!input.stateOk) return "COMMAND_QUEUE_PERSISTENCE_READ_FAILED";
  if (!input.intentRecordId) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!input.approvalRecordId) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (!input.commandRecordId) return "COMMAND_DRAFT_NOT_FOUND";
  if (!commandIsDraft(input.commandFields)) return "COMMAND_DRAFT_STATUS_NOT_DRAFT";
  if (!commandSafetyOk(input.commandFields) && !isQueueIntentPersisted(input.commandFields)) {
    return "COMMAND_QUEUE_NOT_ALLOWED";
  }
  if (isQueueIntentPersisted(input.commandFields)) {
    return "COMMAND_QUEUE_INTENT_ALREADY_PERSISTED";
  }
  if (!input.featureGateEnabled) return "COMMAND_QUEUE_PERSISTENCE_BLOCKED_BY_FEATURE_GATE";

  return "COMMAND_QUEUE_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION";
}

function buildPayload(input: {
  incidentId: string;
  workspaceId: string;
  status: QueuePersistenceStatus;
  method: "GET" | "POST";
  intent: AirtableRecordResult | null;
  approval: AirtableRecordResult | null;
  command: AirtableRecordResult | null;
  write: AirtableWriteResult | null;
  error: string | null;
  operatorIdentity?: string;
}) {
  const featureGate = resolveFeatureGate();
  const token = getAirtableToken();
  const baseId = getAirtableBaseId();

  const intentFields = input.intent?.fields ?? {};
  const approvalFields = input.approval?.fields ?? {};
  const commandFields = input.write?.fields ?? input.command?.fields ?? {};

  const intentRecordId = input.intent?.recordId ?? null;
  const approvalRecordId = input.approval?.recordId ?? null;
  const commandRecordId = input.write?.recordId ?? input.command?.recordId ?? null;

  const queueIntentPersisted =
    input.status === "COMMAND_QUEUE_INTENT_PERSISTED" ||
    input.status === "COMMAND_QUEUE_INTENT_ALREADY_PERSISTED" ||
    isQueueIntentPersisted(commandFields);

  const commandStatus = safeString(commandFields.Status) || "Draft";
  const statusSelect = safeString(commandFields.Status_select) || "Draft";
  const operatorIdentity =
    input.operatorIdentity ||
    safeString(commandFields.Operator_Identity) ||
    safeString(approvalFields.Operator_Identity) ||
    "UNKNOWN";

  const queueInputJson = buildQueueInputJson({
    workspaceId: input.workspaceId,
    incidentId: input.incidentId,
    intentRecordId,
    approvalRecordId,
    commandRecordId,
    operatorIdentity,
  });

  const updateFieldsPreview = buildCommandUpdateFields({
    workspaceId: input.workspaceId,
    incidentId: input.incidentId,
    intentRecordId,
    approvalRecordId,
    commandRecordId,
    operatorIdentity,
  });

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status: input.status,
    mode: "GATED_COMMAND_QUEUE_PERSISTENCE",
    method: input.method,
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,

    feature_gate_env: featureGate.feature_gate_env,
    feature_gate_enabled: featureGate.feature_gate_enabled,
    feature_gate_state: featureGate.feature_gate_state,
    feature_gate_value: featureGate.feature_gate_value,

    intent_id: buildIntentId(input.workspaceId, input.incidentId),
    intent_record_id: intentRecordId,
    approval_id: buildApprovalId(input.workspaceId, input.incidentId),
    approval_record_id: approvalRecordId,
    command_draft_id: buildCommandDraftId(input.workspaceId, input.incidentId),
    command_record_id: commandRecordId,
    command_idempotency_key: buildCommandIdempotencyKey(
      input.workspaceId,
      input.incidentId
    ),

    queue_preview_id: buildQueuePreviewId(input.workspaceId, input.incidentId),
    queue_transition_idempotency_key: buildQueueTransitionIdempotencyKey(
      input.workspaceId,
      input.incidentId
    ),

    current_command_status: commandStatus,
    current_status_select: statusSelect,
    queue_intent_status: queueIntentPersisted
      ? "QUEUE_INTENT_PERSISTED"
      : "NOT_PERSISTED",
    queue_persistence: queueIntentPersisted ? "PERSISTED_AS_INTENT" : "DISABLED",
    operational_queue: "DISABLED",
    status_mutation: "DISABLED",
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation:
      input.status === "COMMAND_QUEUE_INTENT_PERSISTED"
        ? "COMMAND_QUEUE_INTENT_UPDATED"
        : "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.15",
      status: "COMMAND_QUEUE_PREVIEW_READY",
      controlled_command_queue_preview: "VALIDATED",
      execution_policy: "READ_ONLY_QUEUE_PREVIEW",
    },

    airtable_config: {
      base_id: baseId ? "CONFIGURED" : "MISSING",
      operator_intents_table: getOperatorIntentsTable(),
      operator_approvals_table: getOperatorApprovalsTable(),
      commands_table: getCommandsTable(),
      token: token ? "CONFIGURED" : "MISSING",
      token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    },

    intent_read: {
      http_status: input.intent?.status ?? null,
      record_id: intentRecordId,
      error: input.intent?.error ?? null,
    },

    approval_read: {
      http_status: input.approval?.status ?? null,
      record_id: approvalRecordId,
      error: input.approval?.error ?? null,
    },

    command_read: {
      http_status: input.command?.status ?? null,
      record_id: input.command?.recordId ?? null,
      error: input.command?.error ?? null,
    },

    command_write: {
      http_status: input.write?.status ?? null,
      record_id: input.write?.recordId ?? null,
      write_executed: input.write?.writeExecuted ?? false,
      error: input.write?.error ?? null,
    },

    persisted_intent_snapshot: intentRecordId
      ? {
          record_id: intentRecordId,
          idempotency_key: safeString(intentFields.Idempotency_Key),
          intent_id: safeString(intentFields.Intent_ID),
          workspace_id: safeString(intentFields.Workspace_ID),
          incident_id: safeString(intentFields.Incident_ID),
          source_layer: safeString(intentFields.Source_Layer),
        }
      : null,

    persisted_approval_snapshot: approvalRecordId
      ? {
          record_id: approvalRecordId,
          idempotency_key: safeString(approvalFields.Idempotency_Key),
          approval_id: safeString(approvalFields.Approval_ID),
          operator_identity: safeString(approvalFields.Operator_Identity),
          approval_status: safeString(approvalFields.Approval_Status),
          operator_decision: safeString(approvalFields.Operator_Decision),
          approved_for_command_draft: safeBoolean(
            approvalFields.Approved_For_Command_Draft
          ),
          source_layer: safeString(approvalFields.Source_Layer),
        }
      : null,

    persisted_command_snapshot: commandRecordId
      ? {
          record_id: commandRecordId,
          idempotency_key: safeString(commandFields.Idempotency_Key),
          command_id:
            safeString(commandFields.Command_ID) ||
            buildCommandDraftId(input.workspaceId, input.incidentId),
          workspace_id: safeString(commandFields.Workspace_ID),
          incident_id: safeString(commandFields.Incident_ID),
          intent_id: safeString(commandFields.Intent_ID),
          intent_record_id: safeString(commandFields.Intent_Record_ID),
          approval_id: safeString(commandFields.Approval_ID),
          approval_record_id: safeString(commandFields.Approval_Record_ID),
          capability: safeString(commandFields.Capability),
          status: safeString(commandFields.Status),
          status_select: safeString(commandFields.Status_select),
          target_mode: safeString(commandFields.Target_Mode),
          dry_run: safeBoolean(commandFields.Dry_Run),
          operator_identity: safeString(commandFields.Operator_Identity),
          queue_allowed: safeBoolean(commandFields.Queue_Allowed),
          run_creation_allowed: safeBoolean(commandFields.Run_Creation_Allowed),
          worker_call_allowed: safeBoolean(commandFields.Worker_Call_Allowed),
          real_run: safeString(commandFields.Real_Run),
          secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
          source_layer: safeString(commandFields.Source_Layer),
        }
      : null,

    queue_persistence_gate: {
      feature_gate_env: QUEUE_GATE_ENV,
      feature_gate_enabled: featureGate.feature_gate_enabled,
      required_confirmation_token: REQUIRED_CONFIRMATION_TOKEN,
      post_required: true,
      write_from_page: false,
      write_allowed_now:
        featureGate.feature_gate_enabled &&
        input.status !== "COMMAND_QUEUE_INTENT_ALREADY_PERSISTED",
    },

    queue_intent_contract: {
      queue_preview_id: buildQueuePreviewId(input.workspaceId, input.incidentId),
      queue_transition_idempotency_key: buildQueueTransitionIdempotencyKey(
        input.workspaceId,
        input.incidentId
      ),
      queue_intent_status: queueIntentPersisted
        ? "QUEUE_INTENT_PERSISTED"
        : "NOT_PERSISTED",
      queue_persistence: queueIntentPersisted ? "PERSISTED_AS_INTENT" : "DISABLED",
      operational_queue: "DISABLED",
      status_mutation: "DISABLED",
      run_creation: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
    },

    airtable_update_preview: {
      target_table: getCommandsTable(),
      target_record_id: commandRecordId,
      fields: updateFieldsPreview,
      status_preserved_as_draft: true,
      status_select_preserved_as_draft: true,
    },

    queue_intent_payload: queueInputJson,

    safety_checklist: {
      command_found: Boolean(commandRecordId),
      command_status_is_draft: commandStatus === "Draft" || statusSelect === "Draft",
      status_select_preserved_as_draft: statusSelect === "Draft",
      queue_intent_only: true,
      operational_queue_still_disabled: true,
      run_creation_still_disabled:
        safeBoolean(commandFields.Run_Creation_Allowed) !== true,
      worker_call_still_disabled:
        safeBoolean(commandFields.Worker_Call_Allowed) !== true,
      real_run_forbidden: safeString(commandFields.Real_Run) === "Forbidden",
      secret_exposure_disabled:
        safeString(commandFields.Secret_Exposure) === "Disabled",
      feature_gate_required: true,
      explicit_confirmation_required: true,
      idempotency_key_present:
        safeString(commandFields.Idempotency_Key) ===
        buildCommandIdempotencyKey(input.workspaceId, input.incidentId),
    },

    guardrails: {
      client_fetch: "DISABLED",
      airtable_mutation:
        input.status === "COMMAND_QUEUE_INTENT_PERSISTED"
          ? "CONTROLLED_COMMAND_RECORD_UPDATE_ONLY"
          : "DISABLED",
      dashboard_airtable_mutation:
        input.status === "COMMAND_QUEUE_INTENT_PERSISTED"
          ? "COMMAND_QUEUE_INTENT_UPDATED"
          : "DISABLED",
      command_creation: "DISABLED",
      command_status_mutation: "DISABLED",
      operational_queue: "DISABLED",
      run_creation: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      secret_exposure: "DISABLED",
      queue_intent_only: true,
    },

    error: input.error,

    next_step:
      "V5.17 may introduce an Operational Queue Readiness Review, still without run creation or worker execution.",
  };
}

function jsonResponse(payload: unknown) {
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    request.nextUrl.searchParams.get("workspace_id") ??
      request.nextUrl.searchParams.get("workspaceId")
  );

  const token = getAirtableToken();
  const baseId = getAirtableBaseId();
  const featureGate = resolveFeatureGate();

  if (!token || !baseId) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "COMMAND_QUEUE_PERSISTENCE_CONFIG_MISSING",
        method: "GET",
        intent: null,
        approval: null,
        command: null,
        write: null,
        error: "Missing Airtable token or base id.",
      })
    );
  }

  const state = await readState({
    token,
    baseId,
    workspaceId,
    incidentId,
  });

  const status = resolveGetStatus({
    stateOk: state.ok,
    featureGateEnabled: featureGate.feature_gate_enabled,
    intentRecordId: state.intent.recordId,
    approvalRecordId: state.approval.recordId,
    commandRecordId: state.command.recordId,
    commandFields: state.command.fields,
  });

  return jsonResponse(
    buildPayload({
      incidentId,
      workspaceId,
      status,
      method: "GET",
      intent: state.intent,
      approval: state.approval,
      command: state.command,
      write: null,
      error: state.reason,
    })
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    request.nextUrl.searchParams.get("workspace_id") ??
      request.nextUrl.searchParams.get("workspaceId")
  );

  const token = getAirtableToken();
  const baseId = getAirtableBaseId();
  const featureGate = resolveFeatureGate();

  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const operatorConfirmation = safeString(body.operator_confirmation);
  const operatorIdentity = normalizeText(safeString(body.operator_identity));
  const dryRun = body.dry_run;

  if (dryRun !== true) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "REAL_RUN_FORBIDDEN",
        method: "POST",
        intent: null,
        approval: null,
        command: null,
        write: null,
        error: "dry_run must be true. Real run is forbidden.",
        operatorIdentity,
      })
    );
  }

  if (operatorConfirmation !== REQUIRED_CONFIRMATION_TOKEN) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "POST_CONFIRMATION_REQUIRED",
        method: "POST",
        intent: null,
        approval: null,
        command: null,
        write: null,
        error: `operator_confirmation must equal ${REQUIRED_CONFIRMATION_TOKEN}.`,
        operatorIdentity,
      })
    );
  }

  if (operatorIdentity.length === 0) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "OPERATOR_IDENTITY_REQUIRED",
        method: "POST",
        intent: null,
        approval: null,
        command: null,
        write: null,
        error: "operator_identity is required.",
        operatorIdentity,
      })
    );
  }

  if (!token || !baseId) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "COMMAND_QUEUE_PERSISTENCE_CONFIG_MISSING",
        method: "POST",
        intent: null,
        approval: null,
        command: null,
        write: null,
        error: "Missing Airtable token or base id.",
        operatorIdentity,
      })
    );
  }

  const state = await readState({
    token,
    baseId,
    workspaceId,
    incidentId,
  });

  if (!state.ok) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "COMMAND_QUEUE_PERSISTENCE_READ_FAILED",
        method: "POST",
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        write: null,
        error: state.reason,
        operatorIdentity,
      })
    );
  }

  if (!state.intent.recordId) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "OPERATOR_INTENT_DRAFT_NOT_FOUND",
        method: "POST",
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        write: null,
        error: "Operator intent draft not found.",
        operatorIdentity,
      })
    );
  }

  if (!state.approval.recordId) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "OPERATOR_APPROVAL_NOT_FOUND",
        method: "POST",
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        write: null,
        error: "Operator approval not found.",
        operatorIdentity,
      })
    );
  }

  if (!state.command.recordId || !state.command.fields) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "COMMAND_DRAFT_NOT_FOUND",
        method: "POST",
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        write: null,
        error: "Command draft not found.",
        operatorIdentity,
      })
    );
  }

  if (isQueueIntentPersisted(state.command.fields)) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "COMMAND_QUEUE_INTENT_ALREADY_PERSISTED",
        method: "POST",
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        write: null,
        error: null,
        operatorIdentity,
      })
    );
  }

  if (!featureGate.feature_gate_enabled) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "COMMAND_QUEUE_PERSISTENCE_BLOCKED_BY_FEATURE_GATE",
        method: "POST",
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        write: null,
        error: "Feature gate is disabled.",
        operatorIdentity,
      })
    );
  }

  if (!commandIsDraft(state.command.fields)) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "COMMAND_DRAFT_STATUS_NOT_DRAFT",
        method: "POST",
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        write: null,
        error: "Command must remain Draft before queue intent persistence.",
        operatorIdentity,
      })
    );
  }

  if (!commandSafetyOk(state.command.fields)) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "COMMAND_QUEUE_NOT_ALLOWED",
        method: "POST",
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        write: null,
        error:
          "Command safety check failed. Run creation, worker call, real run, or secret exposure guardrail is not safe.",
        operatorIdentity,
      })
    );
  }

  const updateFields = buildCommandUpdateFields({
    workspaceId,
    incidentId,
    intentRecordId: state.intent.recordId,
    approvalRecordId: state.approval.recordId,
    commandRecordId: state.command.recordId,
    operatorIdentity,
  });

  const write = await updateAirtableRecord({
    token,
    baseId,
    table: getCommandsTable(),
    recordId: state.command.recordId,
    fields: updateFields,
  });

  if (!write.ok) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "COMMAND_QUEUE_PERSISTENCE_WRITE_FAILED",
        method: "POST",
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        write,
        error: write.error,
        operatorIdentity,
      })
    );
  }

  return jsonResponse(
    buildPayload({
      incidentId,
      workspaceId,
      status: "COMMAND_QUEUE_INTENT_PERSISTED",
      method: "POST",
      intent: state.intent,
      approval: state.approval,
      command: state.command,
      write,
      error: null,
      operatorIdentity,
    })
  );
}
