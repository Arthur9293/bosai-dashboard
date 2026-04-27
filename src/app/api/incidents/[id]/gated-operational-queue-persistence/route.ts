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

type GateState = "FEATURE_GATE_MISSING" | "FEATURE_GATE_DISABLED" | "FEATURE_GATE_ENABLED";

type OperationalQueuePersistenceStatus =
  | "OPERATIONAL_QUEUE_PERSISTENCE_BLOCKED_BY_FEATURE_GATE"
  | "SCHEDULER_RISK_REVIEW_REQUIRED"
  | "OPERATIONAL_QUEUE_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION"
  | "OPERATIONAL_QUEUE_PERSISTED"
  | "OPERATIONAL_QUEUE_ALREADY_PERSISTED"
  | "OPERATIONAL_QUEUE_PERSISTENCE_CONFIG_MISSING"
  | "OPERATIONAL_QUEUE_PERSISTENCE_READ_FAILED"
  | "OPERATIONAL_QUEUE_PERSISTENCE_WRITE_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "COMMAND_DRAFT_NOT_FOUND"
  | "QUEUE_INTENT_NOT_PERSISTED"
  | "COMMAND_STATUS_NOT_DRAFT"
  | "REAL_RUN_FORBIDDEN"
  | "POST_CONFIRMATION_REQUIRED"
  | "OPERATOR_IDENTITY_REQUIRED"
  | "SCHEDULER_RISK_ACKNOWLEDGEMENT_REQUIRED";

type AirtableRecordResult = {
  ok: boolean;
  status: number | null;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

type RequestBody = {
  operator_confirmation?: unknown;
  operator_identity?: unknown;
  scheduler_risk_acknowledgement?: unknown;
  dry_run?: unknown;
};

const VERSION = "Incident Detail V5.19";
const SOURCE = "dashboard_incident_detail_v5_19_gated_operational_queue_persistence";

const FEATURE_GATE_ENV = "BOSAI_OPERATIONAL_QUEUE_PERSISTENCE_ENABLED";
const SCHEDULER_REVIEW_GATE_ENV = "BOSAI_QUEUED_STATUS_SCHEDULER_REVIEWED";

const REQUIRED_CONFIRMATION = "PERSIST_OPERATIONAL_QUEUE";
const REQUIRED_SCHEDULER_ACK =
  "I_ACKNOWLEDGE_QUEUED_STATUS_MAY_TRIGGER_SCHEDULER";

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

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function checkboxValue(value: unknown): boolean {
  return value === true;
}

function sanitizeError(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 1600);
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

function resolveGate(envName: string): {
  env: string;
  enabled: boolean;
  state: GateState;
  value: "MISSING" | "SERVER_SIDE_ONLY_NOT_EXPOSED";
} {
  const raw = process.env[envName];

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      env: envName,
      enabled: false,
      state: "FEATURE_GATE_MISSING",
      value: "MISSING",
    };
  }

  const normalized = raw.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return {
      env: envName,
      enabled: true,
      state: "FEATURE_GATE_ENABLED",
      value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    };
  }

  return {
    env: envName,
    enabled: false,
    state: "FEATURE_GATE_DISABLED",
    value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
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

function buildIntentIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`;
}

function buildApprovalIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.11:gated-operator-approval-persistence:${workspaceId}:${incidentId}`;
}

function buildCommandIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.13:gated-command-draft-persistence:${workspaceId}:${incidentId}`;
}

function buildOperationalQueueTransitionId(
  workspaceId: string,
  incidentId: string
): string {
  return `operational-queue-transition:v5.19:${workspaceId}:${incidentId}`;
}

function buildOperationalQueueTransitionIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.19:gated-operational-queue-persistence:${workspaceId}:${incidentId}`;
}

function escapeAirtableFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function isQueueIntentPersisted(fields: Record<string, unknown> | null): boolean {
  if (!fields) return false;

  const inputJson = parseJsonObject(fields.Input_JSON);
  const queueIntentStatus = safeString(inputJson?.queue_intent_status);
  const sourceLayer = safeString(fields.Source_Layer);

  return (
    queueIntentStatus === "QUEUE_INTENT_PERSISTED" ||
    sourceLayer === "Incident Detail V5.16" ||
    sourceLayer === "Incident Detail V5.19" ||
    checkboxValue(fields.Queue_Allowed)
  );
}

function isOperationalQueuePersisted(fields: Record<string, unknown> | null): boolean {
  if (!fields) return false;

  const inputJson = parseJsonObject(fields.Input_JSON);
  const operationalQueueStatus = safeString(inputJson?.operational_queue_status);
  const status = safeString(fields.Status);
  const statusSelect = safeString(fields.Status_select);
  const sourceLayer = safeString(fields.Source_Layer);

  return (
    status === "Queued" &&
    statusSelect === "Queued" &&
    (sourceLayer === "Incident Detail V5.19" ||
      operationalQueueStatus === "OPERATIONAL_QUEUE_PERSISTED")
  );
}

function buildInputJson(input: {
  workspaceId: string;
  incidentId: string;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  operatorIdentity: string;
}) {
  return {
    capability: "command_orchestrator",
    status: "Queued",
    status_select: "Queued",
    queue_intent_status: "QUEUE_INTENT_PERSISTED",
    operational_queue_status: "OPERATIONAL_QUEUE_PERSISTED",
    workspace_id: input.workspaceId,
    incident_id: input.incidentId,
    dry_run: true,
    source: SOURCE,
    metadata: {
      origin: "gated_operational_queue_persistence",
      operational_queue_transition_id: buildOperationalQueueTransitionId(
        input.workspaceId,
        input.incidentId
      ),
      operational_queue_transition_idempotency_key:
        buildOperationalQueueTransitionIdempotencyKey(
          input.workspaceId,
          input.incidentId
        ),
      intent_record_id: input.intentRecordId,
      approval_record_id: input.approvalRecordId,
      command_record_id: input.commandRecordId,
      operator_identity: input.operatorIdentity,
      scheduler_risk_acknowledged: true,
      status_mutation_persisted: true,
      operational_queue_persisted: true,
      run_creation_allowed_now: false,
      worker_call_allowed_now: false,
      real_run_forbidden: true,
    },
  };
}

function buildUpdateFields(input: {
  workspaceId: string;
  incidentId: string;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  operatorIdentity: string;
}) {
  return {
    Status: "Queued",
    Status_select: "Queued",
    Operational_Queue_Requested: true,
    Operational_Queue_Source_Layer: VERSION,
    Run_Creation_Allowed: false,
    Worker_Call_Allowed: false,
    Real_Run: "Forbidden",
    Secret_Exposure: "Disabled",
    Source_Layer: VERSION,
    Input_JSON: JSON.stringify(buildInputJson(input)),
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
      error: sanitizeError(text),
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

async function updateAirtableCommand(input: {
  token: string;
  baseId: string;
  table: string;
  recordId: string;
  fields: Record<string, unknown>;
}): Promise<AirtableRecordResult> {
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
      error: sanitizeError(text),
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
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      recordId: null,
      fields: null,
      error: "Unable to parse Airtable update response.",
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
        status: null,
        recordId: null,
        fields: null,
        error: "Approval read skipped because intent read failed.",
      },
      command: {
        ok: false,
        status: null,
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
        status: null,
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

function baseStatus(input: {
  stateOk: boolean;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  commandFields: Record<string, unknown> | null;
  featureGateEnabled: boolean;
  schedulerGateEnabled: boolean;
}): OperationalQueuePersistenceStatus {
  if (!input.stateOk) return "OPERATIONAL_QUEUE_PERSISTENCE_READ_FAILED";
  if (!input.intentRecordId) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!input.approvalRecordId) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (!input.commandRecordId) return "COMMAND_DRAFT_NOT_FOUND";
  if (!isQueueIntentPersisted(input.commandFields)) return "QUEUE_INTENT_NOT_PERSISTED";
  if (isOperationalQueuePersisted(input.commandFields)) {
    return "OPERATIONAL_QUEUE_ALREADY_PERSISTED";
  }

  const status = safeString(input.commandFields?.Status);
  const statusSelect = safeString(input.commandFields?.Status_select);

  if (!(status === "Draft" && statusSelect === "Draft")) {
    return "COMMAND_STATUS_NOT_DRAFT";
  }

  if (!input.featureGateEnabled) {
    return "OPERATIONAL_QUEUE_PERSISTENCE_BLOCKED_BY_FEATURE_GATE";
  }

  if (!input.schedulerGateEnabled) {
    return "SCHEDULER_RISK_REVIEW_REQUIRED";
  }

  return "OPERATIONAL_QUEUE_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION";
}

function validateCommandSafety(fields: Record<string, unknown> | null): string | null {
  if (!fields) return "Command fields missing.";

  if (checkboxValue(fields.Run_Creation_Allowed) === true) {
    return "Run_Creation_Allowed is true.";
  }

  if (checkboxValue(fields.Worker_Call_Allowed) === true) {
    return "Worker_Call_Allowed is true.";
  }

  if (safeString(fields.Real_Run) !== "Forbidden") {
    return "Real_Run is not Forbidden.";
  }

  if (safeString(fields.Secret_Exposure) !== "Disabled") {
    return "Secret_Exposure is not Disabled.";
  }

  return null;
}

function buildPayload(input: {
  requestMethod: "GET" | "POST";
  incidentId: string;
  workspaceId: string;
  status: OperationalQueuePersistenceStatus;
  featureGate: ReturnType<typeof resolveGate>;
  schedulerGate: ReturnType<typeof resolveGate>;
  intent: AirtableRecordResult | null;
  approval: AirtableRecordResult | null;
  command: AirtableRecordResult | null;
  commandWrite: AirtableRecordResult | null;
  writeSent: boolean;
  error: string | null;
  operatorIdentity?: string;
}) {
  const token = getAirtableToken();
  const baseId = getAirtableBaseId();

  const intentFields = input.intent?.fields ?? {};
  const approvalFields = input.approval?.fields ?? {};
  const commandFields = input.commandWrite?.fields ?? input.command?.fields ?? {};

  const intentRecordId = input.intent?.recordId ?? null;
  const approvalRecordId = input.approval?.recordId ?? null;
  const commandRecordId =
    input.commandWrite?.recordId ?? input.command?.recordId ?? null;

  const inputJson = parseJsonObject(commandFields.Input_JSON);
  const operationalQueuePersisted = isOperationalQueuePersisted(commandFields);

  const currentStatus = safeString(commandFields.Status);
  const currentStatusSelect = safeString(commandFields.Status_select);
  const queueIntentPersisted = isQueueIntentPersisted(commandFields);

  const operatorIdentity =
    input.operatorIdentity ||
    safeString(commandFields.Operator_Identity) ||
    safeString(approvalFields.Operator_Identity) ||
    "UNKNOWN";

  const proposedFields = buildUpdateFields({
    workspaceId: input.workspaceId,
    incidentId: input.incidentId,
    intentRecordId,
    approvalRecordId,
    commandRecordId,
    operatorIdentity,
  });

  const operationalQueueStatus = operationalQueuePersisted
    ? "OPERATIONAL_QUEUE_PERSISTED"
    : "NOT_PERSISTED";

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status: input.status,
    mode: "GATED_OPERATIONAL_QUEUE_PERSISTENCE",
    method: input.requestMethod,
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,

    feature_gate_env: input.featureGate.env,
    feature_gate_enabled: input.featureGate.enabled,
    feature_gate_state: input.featureGate.state,
    feature_gate_value: input.featureGate.value,

    scheduler_review_gate_env: input.schedulerGate.env,
    scheduler_review_gate_enabled: input.schedulerGate.enabled,
    scheduler_review_gate_state: input.schedulerGate.state,
    scheduler_review_gate_value: input.schedulerGate.value,

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

    operational_queue_transition_id: buildOperationalQueueTransitionId(
      input.workspaceId,
      input.incidentId
    ),
    operational_queue_transition_idempotency_key:
      buildOperationalQueueTransitionIdempotencyKey(
        input.workspaceId,
        input.incidentId
      ),

    queue_intent_status: queueIntentPersisted
      ? "QUEUE_INTENT_PERSISTED"
      : "NOT_PERSISTED",
    operational_queue_status: operationalQueueStatus,

    current_command_status: currentStatus || "UNKNOWN",
    current_status_select: currentStatusSelect || "UNKNOWN",
    proposed_command_status: "Queued",
    proposed_status_select: "Queued",

    write_sent: input.writeSent,
    status_mutation: operationalQueuePersisted ? "PERSISTED" : "DISABLED",
    operational_queue: operationalQueuePersisted ? "PERSISTED" : "DISABLED",
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation:
      input.writeSent && input.commandWrite?.ok
        ? "OPERATIONAL_QUEUE_UPDATED"
        : "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.18",
      status: "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_READY",
      operational_queue_transition_preview: "VALIDATED",
      execution_policy: "READ_ONLY_TRANSITION_PREVIEW",
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
      http_status: input.commandWrite?.status ?? null,
      record_id: input.commandWrite?.recordId ?? null,
      write_executed: input.writeSent,
      error: input.commandWrite?.error ?? null,
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
          status: currentStatus,
          status_select: currentStatusSelect,
          target_mode: safeString(commandFields.Target_Mode),
          dry_run: checkboxValue(commandFields.Dry_Run),
          operator_identity: operatorIdentity,
          queue_allowed: checkboxValue(commandFields.Queue_Allowed),
          run_creation_allowed: checkboxValue(commandFields.Run_Creation_Allowed),
          worker_call_allowed: checkboxValue(commandFields.Worker_Call_Allowed),
          real_run: safeString(commandFields.Real_Run),
          secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
          source_layer: safeString(commandFields.Source_Layer),
        }
      : null,

    operational_queue_gates: {
      feature_gate_env: input.featureGate.env,
      feature_gate_enabled: input.featureGate.enabled,
      scheduler_review_gate_env: input.schedulerGate.env,
      scheduler_review_gate_enabled: input.schedulerGate.enabled,
      required_confirmation_token: REQUIRED_CONFIRMATION,
      required_scheduler_acknowledgement: REQUIRED_SCHEDULER_ACK,
      post_required: true,
      write_from_page: false,
      write_allowed_now:
        input.featureGate.enabled &&
        input.schedulerGate.enabled &&
        input.requestMethod === "POST",
    },

    operational_queue_persistence_contract: {
      operational_queue_transition_id: buildOperationalQueueTransitionId(
        input.workspaceId,
        input.incidentId
      ),
      operational_queue_transition_idempotency_key:
        buildOperationalQueueTransitionIdempotencyKey(
          input.workspaceId,
          input.incidentId
        ),
      from_status: "Draft",
      from_status_select: "Draft",
      to_status: "Queued",
      to_status_select: "Queued",
      status_mutation: operationalQueuePersisted ? "PERSISTED" : "DISABLED",
      operational_queue: operationalQueuePersisted ? "PERSISTED" : "DISABLED",
      run_creation: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
    },

    airtable_update_preview: {
      method: "PATCH",
      target_table: getCommandsTable(),
      target_record_id: commandRecordId,
      write_sent: input.writeSent,
      mutation:
        input.writeSent && input.commandWrite?.ok
          ? "CONTROLLED_STATUS_MUTATION"
          : "DISABLED",
      fields: proposedFields,
    },

    operational_queue_payload: inputJson ?? buildInputJson({
      workspaceId: input.workspaceId,
      incidentId: input.incidentId,
      intentRecordId,
      approvalRecordId,
      commandRecordId,
      operatorIdentity,
    }),

    safety_checklist: {
      intent_found: Boolean(intentRecordId),
      approval_found: Boolean(approvalRecordId),
      command_found: Boolean(commandRecordId),
      queue_intent_persisted: queueIntentPersisted,
      queue_allowed_true: checkboxValue(commandFields.Queue_Allowed) === true,
      feature_gate_enabled: input.featureGate.enabled,
      scheduler_review_gate_enabled: input.schedulerGate.enabled,
      scheduler_risk_ack_required: true,
      run_creation_still_disabled:
        checkboxValue(commandFields.Run_Creation_Allowed) !== true,
      worker_call_still_disabled:
        checkboxValue(commandFields.Worker_Call_Allowed) !== true,
      real_run_forbidden: safeString(commandFields.Real_Run) === "Forbidden",
      secret_exposure_disabled:
        safeString(commandFields.Secret_Exposure) === "Disabled",
      no_run_created: true,
      no_worker_called: true,
      no_post_run: true,
    },

    scheduler_risk_control: {
      scheduler_review_gate_required: true,
      scheduler_risk_acknowledgement_required: true,
      queued_status_may_trigger_worker: "POSSIBLE",
      run_creation_separate_gate_required: true,
      worker_execution_separate_gate_required: true,
    },

    guardrails: {
      client_fetch: "DISABLED",
      airtable_mutation:
        input.writeSent && input.commandWrite?.ok
          ? "CONTROLLED_COMMAND_RECORD_UPDATE_ONLY"
          : "DISABLED",
      dashboard_airtable_mutation:
        input.writeSent && input.commandWrite?.ok
          ? "OPERATIONAL_QUEUE_UPDATED"
          : "DISABLED",
      command_creation: "DISABLED",
      run_creation: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      secret_exposure: "DISABLED",
      operational_queue_persistence_gated: true,
      scheduler_risk_acknowledgement_required: true,
    },

    error: input.error,

    next_step:
      "V5.20 may introduce Operational Queue Review After Persistence, still without run creation or worker execution.",
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

async function parseBody(request: NextRequest): Promise<RequestBody> {
  try {
    const json = (await request.json()) as unknown;
    return json && typeof json === "object" && !Array.isArray(json)
      ? (json as RequestBody)
      : {};
  } catch {
    return {};
  }
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

  const featureGate = resolveGate(FEATURE_GATE_ENV);
  const schedulerGate = resolveGate(SCHEDULER_REVIEW_GATE_ENV);

  if (!token || !baseId) {
    return jsonResponse(
      buildPayload({
        requestMethod: "GET",
        incidentId,
        workspaceId,
        status: "OPERATIONAL_QUEUE_PERSISTENCE_CONFIG_MISSING",
        featureGate,
        schedulerGate,
        intent: null,
        approval: null,
        command: null,
        commandWrite: null,
        writeSent: false,
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

  const status = baseStatus({
    stateOk: state.ok,
    intentRecordId: state.intent.recordId,
    approvalRecordId: state.approval.recordId,
    commandRecordId: state.command.recordId,
    commandFields: state.command.fields,
    featureGateEnabled: featureGate.enabled,
    schedulerGateEnabled: schedulerGate.enabled,
  });

  return jsonResponse(
    buildPayload({
      requestMethod: "GET",
      incidentId,
      workspaceId,
      status,
      featureGate,
      schedulerGate,
      intent: state.intent,
      approval: state.approval,
      command: state.command,
      commandWrite: null,
      writeSent: false,
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

  const featureGate = resolveGate(FEATURE_GATE_ENV);
  const schedulerGate = resolveGate(SCHEDULER_REVIEW_GATE_ENV);
  const body = await parseBody(request);

  if (!token || !baseId) {
    return jsonResponse(
      buildPayload({
        requestMethod: "POST",
        incidentId,
        workspaceId,
        status: "OPERATIONAL_QUEUE_PERSISTENCE_CONFIG_MISSING",
        featureGate,
        schedulerGate,
        intent: null,
        approval: null,
        command: null,
        commandWrite: null,
        writeSent: false,
        error: "Missing Airtable token or base id.",
      })
    );
  }

  if (body.dry_run !== true) {
    return jsonResponse(
      buildPayload({
        requestMethod: "POST",
        incidentId,
        workspaceId,
        status: "REAL_RUN_FORBIDDEN",
        featureGate,
        schedulerGate,
        intent: null,
        approval: null,
        command: null,
        commandWrite: null,
        writeSent: false,
        error: "dry_run must be true.",
      })
    );
  }

  if (safeString(body.operator_confirmation) !== REQUIRED_CONFIRMATION) {
    return jsonResponse(
      buildPayload({
        requestMethod: "POST",
        incidentId,
        workspaceId,
        status: "POST_CONFIRMATION_REQUIRED",
        featureGate,
        schedulerGate,
        intent: null,
        approval: null,
        command: null,
        commandWrite: null,
        writeSent: false,
        error: `operator_confirmation must equal ${REQUIRED_CONFIRMATION}.`,
      })
    );
  }

  const operatorIdentity = safeString(body.operator_identity);

  if (!operatorIdentity) {
    return jsonResponse(
      buildPayload({
        requestMethod: "POST",
        incidentId,
        workspaceId,
        status: "OPERATOR_IDENTITY_REQUIRED",
        featureGate,
        schedulerGate,
        intent: null,
        approval: null,
        command: null,
        commandWrite: null,
        writeSent: false,
        error: "operator_identity is required.",
      })
    );
  }

  if (safeString(body.scheduler_risk_acknowledgement) !== REQUIRED_SCHEDULER_ACK) {
    return jsonResponse(
      buildPayload({
        requestMethod: "POST",
        incidentId,
        workspaceId,
        status: "SCHEDULER_RISK_ACKNOWLEDGEMENT_REQUIRED",
        featureGate,
        schedulerGate,
        intent: null,
        approval: null,
        command: null,
        commandWrite: null,
        writeSent: false,
        error: `scheduler_risk_acknowledgement must equal ${REQUIRED_SCHEDULER_ACK}.`,
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

  const preStatus = baseStatus({
    stateOk: state.ok,
    intentRecordId: state.intent.recordId,
    approvalRecordId: state.approval.recordId,
    commandRecordId: state.command.recordId,
    commandFields: state.command.fields,
    featureGateEnabled: featureGate.enabled,
    schedulerGateEnabled: schedulerGate.enabled,
  });

  if (preStatus === "OPERATIONAL_QUEUE_ALREADY_PERSISTED") {
    return jsonResponse(
      buildPayload({
        requestMethod: "POST",
        incidentId,
        workspaceId,
        status: "OPERATIONAL_QUEUE_ALREADY_PERSISTED",
        featureGate,
        schedulerGate,
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        commandWrite: null,
        writeSent: false,
        error: null,
        operatorIdentity,
      })
    );
  }

  if (preStatus !== "OPERATIONAL_QUEUE_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION") {
    return jsonResponse(
      buildPayload({
        requestMethod: "POST",
        incidentId,
        workspaceId,
        status: preStatus,
        featureGate,
        schedulerGate,
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        commandWrite: null,
        writeSent: false,
        error: state.reason,
        operatorIdentity,
      })
    );
  }

  const safetyError = validateCommandSafety(state.command.fields);

  if (safetyError) {
    return jsonResponse(
      buildPayload({
        requestMethod: "POST",
        incidentId,
        workspaceId,
        status: "OPERATIONAL_QUEUE_PERSISTENCE_WRITE_FAILED",
        featureGate,
        schedulerGate,
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        commandWrite: {
          ok: false,
          status: null,
          recordId: null,
          fields: null,
          error: safetyError,
        },
        writeSent: false,
        error: safetyError,
        operatorIdentity,
      })
    );
  }

  const commandRecordId = state.command.recordId;

  if (!commandRecordId) {
    return jsonResponse(
      buildPayload({
        requestMethod: "POST",
        incidentId,
        workspaceId,
        status: "COMMAND_DRAFT_NOT_FOUND",
        featureGate,
        schedulerGate,
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        commandWrite: null,
        writeSent: false,
        error: "Command record id missing.",
        operatorIdentity,
      })
    );
  }

  const updateFields = buildUpdateFields({
    workspaceId,
    incidentId,
    intentRecordId: state.intent.recordId,
    approvalRecordId: state.approval.recordId,
    commandRecordId,
    operatorIdentity,
  });

  const commandWrite = await updateAirtableCommand({
    token,
    baseId,
    table: getCommandsTable(),
    recordId: commandRecordId,
    fields: updateFields,
  });

  if (!commandWrite.ok) {
    return jsonResponse(
      buildPayload({
        requestMethod: "POST",
        incidentId,
        workspaceId,
        status: "OPERATIONAL_QUEUE_PERSISTENCE_WRITE_FAILED",
        featureGate,
        schedulerGate,
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        commandWrite,
        writeSent: true,
        error: commandWrite.error,
        operatorIdentity,
      })
    );
  }

  return jsonResponse(
    buildPayload({
      requestMethod: "POST",
      incidentId,
      workspaceId,
      status: "OPERATIONAL_QUEUE_PERSISTED",
      featureGate,
      schedulerGate,
      intent: state.intent,
      approval: state.approval,
      command: state.command,
      commandWrite,
      writeSent: true,
      error: null,
      operatorIdentity,
    })
  );
}
