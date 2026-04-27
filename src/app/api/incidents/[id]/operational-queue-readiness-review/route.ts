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

type OperationalQueueReadinessStatus =
  | "OPERATIONAL_QUEUE_READINESS_READY"
  | "OPERATIONAL_QUEUE_READINESS_CONFIG_MISSING"
  | "OPERATIONAL_QUEUE_READINESS_READ_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "COMMAND_DRAFT_NOT_FOUND"
  | "QUEUE_INTENT_NOT_PERSISTED"
  | "COMMAND_STATUS_NOT_DRAFT"
  | "OPERATIONAL_QUEUE_READINESS_NOT_SAFE";

type AirtableRecordResult = {
  ok: boolean;
  status: number;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

const VERSION = "Incident Detail V5.17";
const SOURCE =
  "dashboard_incident_detail_v5_17_operational_queue_readiness_review";

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

function checkboxValue(value: unknown): boolean {
  return value === true;
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

function getNestedObject(
  value: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null {
  const nested = value?.[key];

  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? (nested as Record<string, unknown>)
    : null;
}

function isQueueIntentPersisted(fields: Record<string, unknown> | null): boolean {
  if (!fields) return false;

  const parsed = parseJsonObject(fields.Input_JSON);
  const queueIntentStatus = safeString(parsed?.queue_intent_status);
  const sourceLayer = safeString(fields.Source_Layer);

  return (
    queueIntentStatus === "QUEUE_INTENT_PERSISTED" ||
    sourceLayer === "Incident Detail V5.16" ||
    (checkboxValue(fields.Queue_Allowed) && sourceLayer === "Incident Detail V5.16")
  );
}

function buildQueueIntentPayload(fields: Record<string, unknown> | null) {
  const parsed = parseJsonObject(fields?.Input_JSON);

  if (parsed) return parsed;

  return {
    parse_error: "Input_JSON is missing or could not be parsed.",
    raw_input_json: safeString(fields?.Input_JSON),
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

function resolveStatus(input: {
  stateOk: boolean;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  commandFields: Record<string, unknown> | null;
  readinessSafe: boolean;
}): OperationalQueueReadinessStatus {
  if (!input.stateOk) return "OPERATIONAL_QUEUE_READINESS_READ_FAILED";
  if (!input.intentRecordId) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!input.approvalRecordId) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (!input.commandRecordId) return "COMMAND_DRAFT_NOT_FOUND";

  const status = safeString(input.commandFields?.Status);
  const statusSelect = safeString(input.commandFields?.Status_select);

  if (!(status === "Draft" || statusSelect === "Draft")) {
    return "COMMAND_STATUS_NOT_DRAFT";
  }

  if (!isQueueIntentPersisted(input.commandFields)) {
    return "QUEUE_INTENT_NOT_PERSISTED";
  }

  if (!input.readinessSafe) return "OPERATIONAL_QUEUE_READINESS_NOT_SAFE";

  return "OPERATIONAL_QUEUE_READINESS_READY";
}

function buildPayload(input: {
  incidentId: string;
  workspaceId: string;
  status: OperationalQueueReadinessStatus;
  intent: AirtableRecordResult | null;
  approval: AirtableRecordResult | null;
  command: AirtableRecordResult | null;
  error: string | null;
}) {
  const token = getAirtableToken();
  const baseId = getAirtableBaseId();

  const intentFields = input.intent?.fields ?? {};
  const approvalFields = input.approval?.fields ?? {};
  const commandFields = input.command?.fields ?? {};

  const intentRecordId = input.intent?.recordId ?? null;
  const approvalRecordId = input.approval?.recordId ?? null;
  const commandRecordId = input.command?.recordId ?? null;

  const queueIntentPayload = buildQueueIntentPayload(commandFields);
  const queueIntentMetadata = getNestedObject(queueIntentPayload, "metadata");

  const commandStatus = safeString(commandFields.Status);
  const statusSelect = safeString(commandFields.Status_select);
  const queueAllowed = checkboxValue(commandFields.Queue_Allowed);
  const runCreationAllowed = checkboxValue(commandFields.Run_Creation_Allowed);
  const workerCallAllowed = checkboxValue(commandFields.Worker_Call_Allowed);
  const realRun = safeString(commandFields.Real_Run);
  const secretExposure = safeString(commandFields.Secret_Exposure);

  const inputJsonContainsQueueIntent =
    safeString(queueIntentPayload.queue_intent_status) === "QUEUE_INTENT_PERSISTED";

  const inputJsonPreservesStatusDraft =
    safeString(queueIntentPayload.status) === "Draft";

  const inputJsonPreservesStatusSelectDraft =
    queueIntentMetadata?.status_select_preserved_as_draft === true;

  const operationalQueueReadinessCheck = {
    intent_found: Boolean(intentRecordId),
    approval_found: Boolean(approvalRecordId),
    command_found: Boolean(commandRecordId),
    command_status_is_draft: commandStatus === "Draft",
    status_select_is_draft: statusSelect === "Draft",
    queue_intent_persisted: isQueueIntentPersisted(commandFields),
    queue_allowed_true: queueAllowed === true,
    operational_queue_still_disabled: true,
    status_mutation_still_disabled: true,
    run_creation_still_disabled: runCreationAllowed !== true,
    worker_call_still_disabled: workerCallAllowed !== true,
    real_run_forbidden: realRun === "Forbidden",
    secret_exposure_disabled: secretExposure === "Disabled",
    input_json_contains_queue_intent: inputJsonContainsQueueIntent,
    input_json_preserves_status_draft: inputJsonPreservesStatusDraft,
    input_json_preserves_status_select_draft: inputJsonPreservesStatusSelectDraft,
  };

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status: input.status,
    mode: "OPERATIONAL_QUEUE_READINESS_REVIEW_ONLY",
    method: "GET",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,

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

    queue_intent_status: isQueueIntentPersisted(commandFields)
      ? "QUEUE_INTENT_PERSISTED"
      : "NOT_PERSISTED",
    queue_readiness:
      input.status === "OPERATIONAL_QUEUE_READINESS_READY"
        ? "READY_FOR_FUTURE_OPERATIONAL_QUEUE_GATE"
        : "NOT_READY_FOR_FUTURE_OPERATIONAL_QUEUE_GATE",
    current_command_status: commandStatus || "UNKNOWN",
    current_status_select: statusSelect || "UNKNOWN",
    proposed_future_status: "Queued",

    operational_queue: "DISABLED",
    status_mutation: "DISABLED",
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.16",
      status: "COMMAND_QUEUE_INTENT_ALREADY_PERSISTED_OR_PERSISTED",
      queue_intent_persistence: "VALIDATED",
      execution_policy: "QUEUE_INTENT_ONLY",
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
      record_id: commandRecordId,
      error: input.command?.error ?? null,
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
          status: commandStatus,
          status_select: statusSelect,
          target_mode: safeString(commandFields.Target_Mode),
          dry_run: checkboxValue(commandFields.Dry_Run),
          operator_identity: safeString(commandFields.Operator_Identity),
          queue_allowed: queueAllowed,
          run_creation_allowed: runCreationAllowed,
          worker_call_allowed: workerCallAllowed,
          real_run: realRun,
          secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
          source_layer: safeString(commandFields.Source_Layer),
        }
      : null,

    queue_intent_payload: queueIntentPayload,

    operational_queue_readiness_check: operationalQueueReadinessCheck,

    future_operational_queue_requirements: [
      "A dedicated operational queue feature gate must be enabled",
      "Operator must explicitly confirm operational queue transition",
      "Status_select transition to Queued must be audited",
      "Scheduler consumption behavior must be known before enabling Queued",
      "Run creation must remain gated separately",
      "Worker execution must remain gated separately",
      "Rollback or safe cancel path must exist",
      "No secret exposure is allowed",
    ],

    guardrails: {
      client_fetch: "DISABLED",
      airtable_mutation: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      command_mutation: "DISABLED",
      operational_queue: "DISABLED",
      status_mutation: "DISABLED",
      run_creation: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      secret_exposure: "DISABLED",
      review_only: true,
    },

    error: input.error,

    next_step:
      "V5.18 may introduce Operational Queue Transition Preview, still without status mutation, run creation, or worker execution.",
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

  if (!token || !baseId) {
    return jsonResponse(
      buildPayload({
        incidentId,
        workspaceId,
        status: "OPERATIONAL_QUEUE_READINESS_CONFIG_MISSING",
        intent: null,
        approval: null,
        command: null,
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

  const commandFields = state.command.fields ?? {};
  const parsedInputJson = parseJsonObject(commandFields.Input_JSON);
  const metadata = getNestedObject(parsedInputJson, "metadata");

  const readinessSafe =
    Boolean(state.intent.recordId) &&
    Boolean(state.approval.recordId) &&
    Boolean(state.command.recordId) &&
    safeString(commandFields.Status) === "Draft" &&
    safeString(commandFields.Status_select) === "Draft" &&
    isQueueIntentPersisted(commandFields) &&
    checkboxValue(commandFields.Queue_Allowed) === true &&
    checkboxValue(commandFields.Run_Creation_Allowed) !== true &&
    checkboxValue(commandFields.Worker_Call_Allowed) !== true &&
    safeString(commandFields.Real_Run) === "Forbidden" &&
    safeString(commandFields.Secret_Exposure) === "Disabled" &&
    safeString(parsedInputJson?.queue_intent_status) === "QUEUE_INTENT_PERSISTED" &&
    safeString(parsedInputJson?.status) === "Draft" &&
    metadata?.status_select_preserved_as_draft === true;

  const status = resolveStatus({
    stateOk: state.ok,
    intentRecordId: state.intent.recordId,
    approvalRecordId: state.approval.recordId,
    commandRecordId: state.command.recordId,
    commandFields: state.command.fields,
    readinessSafe,
  });

  return jsonResponse(
    buildPayload({
      incidentId,
      workspaceId,
      status,
      intent: state.intent,
      approval: state.approval,
      command: state.command,
      error: state.reason,
    })
  );
}
