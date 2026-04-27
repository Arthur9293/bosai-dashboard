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

type TransitionPreviewStatus =
  | "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_READY"
  | "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_CONFIG_MISSING"
  | "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_READ_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "COMMAND_DRAFT_NOT_FOUND"
  | "QUEUE_INTENT_NOT_PERSISTED"
  | "COMMAND_STATUS_NOT_DRAFT"
  | "OPERATIONAL_QUEUE_TRANSITION_NOT_SAFE";

type AirtableRecordResult = {
  ok: boolean;
  status: number;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

const VERSION = "Incident Detail V5.18";
const SOURCE =
  "dashboard_incident_detail_v5_18_operational_queue_transition_preview";

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

function buildOperationalQueueTransitionId(
  workspaceId: string,
  incidentId: string
): string {
  return `operational-queue-transition:v5.18:${workspaceId}:${incidentId}`;
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

function buildQueueIntentIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.16:gated-command-queue-persistence:${workspaceId}:${incidentId}`;
}

function buildOperationalQueueTransitionIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.18:operational-queue-transition-preview:${workspaceId}:${incidentId}`;
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

function buildTransitionPayload(input: {
  workspaceId: string;
  incidentId: string;
  commandRecordId: string | null;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  operatorIdentity: string;
}) {
  return {
    command_record_id: input.commandRecordId,
    command_id: buildCommandDraftId(input.workspaceId, input.incidentId),
    workspace_id: input.workspaceId,
    incident_id: input.incidentId,
    from_status: "Draft",
    from_status_select: "Draft",
    to_status: "Queued",
    to_status_select: "Queued",
    dry_run: true,
    source: SOURCE,
    metadata: {
      origin: "operational_queue_transition_preview",
      queue_intent_status: "QUEUE_INTENT_PERSISTED",
      intent_record_id: input.intentRecordId,
      approval_record_id: input.approvalRecordId,
      operator_identity: input.operatorIdentity,
      status_mutation_allowed_now: false,
      operational_queue_allowed_now: false,
      run_creation_allowed_now: false,
      worker_call_allowed_now: false,
      real_run_forbidden: true,
    },
  };
}

function buildProposedUpdatePreview(input: {
  commandRecordId: string | null;
}) {
  return {
    method: "PATCH",
    target_table: getCommandsTable(),
    target_record_id: input.commandRecordId,
    write_sent: false,
    mutation: "DISABLED",
    fields: {
      Status: "Queued",
      Status_select: "Queued",
      Operational_Queue_Requested: true,
      Operational_Queue_Requested_At: "SERVER_TIME_FUTURE",
      Operational_Queue_Source_Layer: VERSION,
      Run_Creation_Allowed: false,
      Worker_Call_Allowed: false,
      Real_Run: "Forbidden",
      Secret_Exposure: "Disabled",
    },
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
  transitionSafe: boolean;
}): TransitionPreviewStatus {
  if (!input.stateOk) return "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_READ_FAILED";
  if (!input.intentRecordId) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!input.approvalRecordId) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (!input.commandRecordId) return "COMMAND_DRAFT_NOT_FOUND";

  const status = safeString(input.commandFields?.Status);
  const statusSelect = safeString(input.commandFields?.Status_select);

  if (!(status === "Draft" && statusSelect === "Draft")) {
    return "COMMAND_STATUS_NOT_DRAFT";
  }

  if (!isQueueIntentPersisted(input.commandFields)) {
    return "QUEUE_INTENT_NOT_PERSISTED";
  }

  if (!input.transitionSafe) return "OPERATIONAL_QUEUE_TRANSITION_NOT_SAFE";

  return "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_READY";
}

function buildPayload(input: {
  incidentId: string;
  workspaceId: string;
  status: TransitionPreviewStatus;
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

  const inputJson = parseJsonObject(commandFields.Input_JSON);
  const operatorIdentity =
    safeString(commandFields.Operator_Identity) ||
    safeString(approvalFields.Operator_Identity) ||
    "UNKNOWN";

  const queueIntentPersisted = isQueueIntentPersisted(commandFields);
  const currentStatus = safeString(commandFields.Status);
  const currentStatusSelect = safeString(commandFields.Status_select);
  const queueAllowed = checkboxValue(commandFields.Queue_Allowed);
  const runCreationAllowed = checkboxValue(commandFields.Run_Creation_Allowed);
  const workerCallAllowed = checkboxValue(commandFields.Worker_Call_Allowed);
  const realRun = safeString(commandFields.Real_Run);
  const secretExposure = safeString(commandFields.Secret_Exposure);

  const proposedUpdatePreview = buildProposedUpdatePreview({
    commandRecordId,
  });

  const transitionPayloadPreview = buildTransitionPayload({
    workspaceId: input.workspaceId,
    incidentId: input.incidentId,
    commandRecordId,
    intentRecordId,
    approvalRecordId,
    operatorIdentity,
  });

  const transitionReadinessCheck = {
    intent_found: Boolean(intentRecordId),
    approval_found: Boolean(approvalRecordId),
    command_found: Boolean(commandRecordId),
    command_status_is_draft: currentStatus === "Draft",
    status_select_is_draft: currentStatusSelect === "Draft",
    queue_intent_persisted: queueIntentPersisted,
    queue_allowed_true: queueAllowed === true,
    run_creation_still_disabled: runCreationAllowed !== true,
    worker_call_still_disabled: workerCallAllowed !== true,
    real_run_forbidden: realRun === "Forbidden",
    secret_exposure_disabled: secretExposure === "Disabled",
    input_json_contains_queue_intent:
      safeString(inputJson?.queue_intent_status) === "QUEUE_INTENT_PERSISTED",
    proposed_transition_is_draft_to_queued: true,
    write_sent_false: proposedUpdatePreview.write_sent === false,
    status_mutation_disabled: true,
    operational_queue_disabled: true,
  };

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status: input.status,
    mode: "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_ONLY",
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
    queue_intent_idempotency_key: buildQueueIntentIdempotencyKey(
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
    queue_readiness:
      input.status === "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_READY"
        ? "READY_FOR_FUTURE_OPERATIONAL_QUEUE_GATE"
        : "NOT_READY_FOR_FUTURE_OPERATIONAL_QUEUE_GATE",
    transition_preview_status:
      input.status === "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_READY"
        ? "READY_NOT_MUTATED"
        : "NOT_READY",

    current_command_status: currentStatus || "UNKNOWN",
    current_status_select: currentStatusSelect || "UNKNOWN",
    proposed_command_status: "Queued",
    proposed_status_select: "Queued",

    operational_queue: "DISABLED",
    status_mutation: "DISABLED",
    write_sent: false,
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.17",
      status: "OPERATIONAL_QUEUE_READINESS_READY",
      operational_queue_readiness: "VALIDATED",
      execution_policy: "READ_ONLY_READINESS_REVIEW",
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
          status: currentStatus,
          status_select: currentStatusSelect,
          target_mode: safeString(commandFields.Target_Mode),
          dry_run: checkboxValue(commandFields.Dry_Run),
          operator_identity: operatorIdentity,
          queue_allowed: queueAllowed,
          run_creation_allowed: runCreationAllowed,
          worker_call_allowed: workerCallAllowed,
          real_run: realRun,
          secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
          source_layer: safeString(commandFields.Source_Layer),
        }
      : null,

    operational_transition_preview: {
      type: "operational_queue_transition_preview",
      target_table: getCommandsTable(),
      target_record_id: commandRecordId,
      from_status: "Draft",
      from_status_select: "Draft",
      to_status: "Queued",
      to_status_select: "Queued",
      write_sent: false,
      status_mutation_allowed_now: false,
      operational_queue_allowed_now: false,
      run_creation_allowed_now: false,
      worker_call_allowed_now: false,
      requires_dedicated_operational_queue_feature_gate: true,
      requires_explicit_operator_confirmation: true,
      requires_scheduler_behavior_review: true,
      requires_audit_trail: true,
      requires_rollback_or_cancel_path: true,
    },

    proposed_update_preview: proposedUpdatePreview,

    transition_payload_preview: transitionPayloadPreview,

    transition_readiness_check: transitionReadinessCheck,

    scheduler_risk_review: {
      scheduler_consumes_queued_status: "UNKNOWN",
      queued_status_may_trigger_worker: "POSSIBLE",
      safe_to_mutate_status_now: false,
      required_before_real_queue: [
        "Confirm scheduler does not auto-execute Queued commands unexpectedly",
        "Confirm worker execution remains separately gated",
        "Confirm Run creation is not triggered by status mutation alone",
        "Confirm rollback path exists before Status_select mutation",
      ],
    },

    future_operational_queue_persistence_requirements: [
      "Dedicated operational queue feature gate must be enabled",
      "Operator must explicitly confirm operational queue transition",
      "Scheduler consumption behavior must be verified",
      "Status_select transition to Queued must be audited",
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
      preview_only: true,
    },

    error: input.error,

    next_step:
      "V5.19 may introduce Gated Operational Queue Persistence, still without run creation or worker execution.",
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
        status: "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_CONFIG_MISSING",
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
  const inputJson = parseJsonObject(commandFields.Input_JSON);

  const transitionSafe =
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
    safeString(inputJson?.queue_intent_status) === "QUEUE_INTENT_PERSISTED";

  const status = resolveStatus({
    stateOk: state.ok,
    intentRecordId: state.intent.recordId,
    approvalRecordId: state.approval.recordId,
    commandRecordId: state.command.recordId,
    commandFields: state.command.fields,
    transitionSafe,
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
