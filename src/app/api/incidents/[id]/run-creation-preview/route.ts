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

type RunCreationPreviewStatus =
  | "RUN_CREATION_PREVIEW_READY"
  | "RUN_CREATION_PREVIEW_CONFIG_MISSING"
  | "RUN_CREATION_PREVIEW_READ_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "COMMAND_NOT_FOUND"
  | "COMMAND_STATUS_NOT_QUEUED"
  | "OPERATIONAL_QUEUE_NOT_PERSISTED"
  | "RUN_CREATION_PREVIEW_NOT_SAFE";

type AirtableRecordResult = {
  ok: boolean;
  status: number | null;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

const VERSION = "Incident Detail V5.21";
const SOURCE = "dashboard_incident_detail_v5_21_run_creation_preview";

const PREVIOUS_VERSION = "Incident Detail V5.20";
const COMMAND_SOURCE_LAYER = "Incident Detail V5.19";

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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;

  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function getInputJson(fields: Record<string, unknown> | null): Record<string, unknown> | null {
  return parseJsonObject(fields?.Input_JSON);
}

function getInputMetadata(fields: Record<string, unknown> | null): Record<string, unknown> | null {
  return asRecord(getInputJson(fields)?.metadata);
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

function buildRunDraftId(workspaceId: string, incidentId: string): string {
  return `run-draft:v5.21:${workspaceId}:${incidentId}`;
}

function buildRunIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.21:run-creation-preview:${workspaceId}:${incidentId}`;
}

function escapeAirtableFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function isQueued(fields: Record<string, unknown> | null): boolean {
  return (
    safeString(fields?.Status) === "Queued" &&
    safeString(fields?.Status_select) === "Queued"
  );
}

function isOperationalQueuePersisted(fields: Record<string, unknown> | null): boolean {
  const inputJson = getInputJson(fields);
  const metadata = getInputMetadata(fields);

  return (
    isQueued(fields) &&
    safeString(inputJson?.operational_queue_status) ===
      "OPERATIONAL_QUEUE_PERSISTED" &&
    metadata?.operational_queue_persisted === true &&
    metadata?.status_mutation_persisted === true
  );
}

function isRunCreationPreviewSafe(fields: Record<string, unknown> | null): boolean {
  return (
    isOperationalQueuePersisted(fields) &&
    safeString(fields?.Source_Layer) === COMMAND_SOURCE_LAYER &&
    checkboxValue(fields?.Run_Creation_Allowed) !== true &&
    checkboxValue(fields?.Worker_Call_Allowed) !== true &&
    safeString(fields?.Real_Run) === "Forbidden" &&
    safeString(fields?.Secret_Exposure) === "Disabled"
  );
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

function resolveStatus(input: {
  stateOk: boolean;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  commandFields: Record<string, unknown> | null;
}): RunCreationPreviewStatus {
  if (!input.stateOk) return "RUN_CREATION_PREVIEW_READ_FAILED";
  if (!input.intentRecordId) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!input.approvalRecordId) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (!input.commandRecordId) return "COMMAND_NOT_FOUND";
  if (!isQueued(input.commandFields)) return "COMMAND_STATUS_NOT_QUEUED";
  if (!isOperationalQueuePersisted(input.commandFields)) {
    return "OPERATIONAL_QUEUE_NOT_PERSISTED";
  }
  if (!isRunCreationPreviewSafe(input.commandFields)) {
    return "RUN_CREATION_PREVIEW_NOT_SAFE";
  }

  return "RUN_CREATION_PREVIEW_READY";
}

function buildPayload(input: {
  incidentId: string;
  workspaceId: string;
  status: RunCreationPreviewStatus;
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

  const inputJson = getInputJson(commandFields);
  const metadata = getInputMetadata(commandFields);

  const intentRecordId = input.intent?.recordId ?? null;
  const approvalRecordId = input.approval?.recordId ?? null;
  const commandRecordId = input.command?.recordId ?? null;

  const currentStatus = safeString(commandFields.Status);
  const currentStatusSelect = safeString(commandFields.Status_select);

  const operationalQueuePersisted = isOperationalQueuePersisted(commandFields);
  const runCreationAllowed = checkboxValue(commandFields.Run_Creation_Allowed);
  const workerCallAllowed = checkboxValue(commandFields.Worker_Call_Allowed);

  const runDraftId = buildRunDraftId(input.workspaceId, input.incidentId);
  const runIdempotencyKey = buildRunIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );

  const commandDraftId = buildCommandDraftId(input.workspaceId, input.incidentId);
  const operationalQueueTransitionId = buildOperationalQueueTransitionId(
    input.workspaceId,
    input.incidentId
  );

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status: input.status,
    mode: "RUN_CREATION_PREVIEW_ONLY",
    method: "GET",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,

    intent_id: buildIntentId(input.workspaceId, input.incidentId),
    intent_record_id: intentRecordId,
    approval_id: buildApprovalId(input.workspaceId, input.incidentId),
    approval_record_id: approvalRecordId,
    command_draft_id: commandDraftId,
    command_record_id: commandRecordId,
    command_idempotency_key: buildCommandIdempotencyKey(
      input.workspaceId,
      input.incidentId
    ),

    operational_queue_transition_id: operationalQueueTransitionId,
    operational_queue_transition_idempotency_key:
      buildOperationalQueueTransitionIdempotencyKey(
        input.workspaceId,
        input.incidentId
      ),

    run_draft_id: runDraftId,
    run_idempotency_key: runIdempotencyKey,
    run_preview_status:
      input.status === "RUN_CREATION_PREVIEW_READY"
        ? "READY_NOT_PERSISTED"
        : "BLOCKED",

    current_command_status: currentStatus || "UNKNOWN",
    current_status_select: currentStatusSelect || "UNKNOWN",
    operational_queue_status: operationalQueuePersisted
      ? "OPERATIONAL_QUEUE_PERSISTED"
      : "NOT_PERSISTED",

    run_creation: "DISABLED",
    run_persistence: "DISABLED",
    run_creation_by_this_surface: "DISABLED",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",
    command_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.20",
      status: "OPERATIONAL_QUEUE_REVIEW_READY",
      operational_queue_review: "VALIDATED",
      execution_policy: "READ_ONLY_QUEUE_REVIEW",
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
          command_id: safeString(commandFields.Command_ID),
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
          operator_identity: safeString(commandFields.Operator_Identity),
          queue_allowed: checkboxValue(commandFields.Queue_Allowed),
          run_creation_allowed: runCreationAllowed,
          worker_call_allowed: workerCallAllowed,
          real_run: safeString(commandFields.Real_Run),
          secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
          source_layer: safeString(commandFields.Source_Layer),
        }
      : null,

    operational_queue_payload: inputJson,

    run_creation_preview: {
      type: "run_creation_preview",
      target_table: "System_Runs",
      target_status: "Draft",
      run_draft_id: runDraftId,
      run_idempotency_key: runIdempotencyKey,
      source_command_record_id: commandRecordId,
      source_command_id: commandDraftId,
      workspace_id: input.workspaceId,
      incident_id: input.incidentId,
      capability: safeString(commandFields.Capability) || "command_orchestrator",
      dry_run: true,
      run_creation_allowed_now: false,
      run_persistence_allowed_now: false,
      post_run_allowed_now: false,
      worker_call_allowed_now: false,
      requires_dedicated_run_creation_feature_gate: true,
      requires_explicit_operator_confirmation: true,
      requires_run_persistence_preview_before_write: true,
      requires_worker_execution_separate_gate: true,
    },

    run_payload_preview: {
      run_id: runDraftId,
      idempotency_key: runIdempotencyKey,
      status: "Draft",
      workspace_id: input.workspaceId,
      incident_id: input.incidentId,
      command_record_id: commandRecordId,
      command_id: commandDraftId,
      capability: safeString(commandFields.Capability) || "command_orchestrator",
      dry_run: true,
      source: SOURCE,
      metadata: {
        origin: "run_creation_preview",
        intent_record_id: intentRecordId,
        approval_record_id: approvalRecordId,
        command_record_id: commandRecordId,
        operational_queue_transition_id: operationalQueueTransitionId,
        operator_identity:
          safeString(commandFields.Operator_Identity) ||
          safeString(metadata?.operator_identity) ||
          "UNKNOWN",
        run_creation_allowed_now: false,
        run_persistence_allowed_now: false,
        post_run_allowed_now: false,
        worker_call_allowed_now: false,
        real_run_forbidden: true,
      },
    },

    run_creation_readiness_check: {
      intent_found: Boolean(intentRecordId),
      approval_found: Boolean(approvalRecordId),
      command_found: Boolean(commandRecordId),
      command_status_is_queued: currentStatus === "Queued",
      status_select_is_queued: currentStatusSelect === "Queued",
      operational_queue_persisted: operationalQueuePersisted,
      source_layer_is_v519: safeString(commandFields.Source_Layer) === COMMAND_SOURCE_LAYER,
      run_creation_still_disabled: runCreationAllowed !== true,
      run_persistence_still_disabled: true,
      post_run_still_disabled: true,
      worker_call_still_disabled: workerCallAllowed !== true,
      real_run_forbidden: safeString(commandFields.Real_Run) === "Forbidden",
      secret_exposure_disabled:
        safeString(commandFields.Secret_Exposure) === "Disabled",
      run_idempotency_key_present: runIdempotencyKey.length > 0,
      run_creation_feature_gate_required: true,
      explicit_operator_confirmation_required: true,
    },

    external_effect_review: {
      external_scheduler_effect: "NOT_VERIFIED_FROM_THIS_SURFACE",
      external_run_existence: "NOT_VERIFIED_FROM_THIS_SURFACE",
      worker_side_state: "NOT_VERIFIED_FROM_THIS_SURFACE",
      scheduler_follow_up_required: true,
      note:
        "This surface prepares a Run contract only. It does not inspect external scheduler execution or existing System_Runs.",
    },

    future_run_persistence_requirements: [
      "Run persistence must have a dedicated feature gate",
      "Run persistence must require explicit operator confirmation",
      "Run idempotency key must be deterministic",
      "Run must remain linked to command, incident, intent, approval, and queue transition",
      "POST /run must remain disabled until execution gate",
      "Worker execution must remain gated separately",
      "Scheduler aftereffects must be reviewed before execution",
      "No secret exposure is allowed",
    ],

    guardrails: {
      client_fetch: "DISABLED",
      airtable_mutation: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_creation: "DISABLED",
      run_persistence: "DISABLED",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      secret_exposure: "DISABLED",
      preview_only: true,
    },

    error: input.error,

    next_step:
      "V5.22 may introduce Gated Run Draft Persistence, still without POST /run or worker execution.",
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
        status: "RUN_CREATION_PREVIEW_CONFIG_MISSING",
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

  const status = resolveStatus({
    stateOk: state.ok,
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
      intent: state.intent,
      approval: state.approval,
      command: state.command,
      error: state.reason,
    })
  );
}
