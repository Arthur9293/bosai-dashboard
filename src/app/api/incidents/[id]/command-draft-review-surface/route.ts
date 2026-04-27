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

type CommandDraftReviewStatus =
  | "COMMAND_DRAFT_REVIEW_READY"
  | "COMMAND_DRAFT_REVIEW_CONFIG_MISSING"
  | "COMMAND_DRAFT_REVIEW_READ_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "COMMAND_DRAFT_NOT_FOUND"
  | "COMMAND_DRAFT_STATUS_NOT_DRAFT"
  | "COMMAND_DRAFT_NOT_SAFE_TO_REVIEW";

type AirtableRecordResult = {
  ok: boolean;
  status: number;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

const VERSION = "Incident Detail V5.14";
const SOURCE = "dashboard_incident_detail_v5_14_command_draft_review_surface";

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

function escapeAirtableFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function isSensitiveKey(key: string): boolean {
  const lowered = key.toLowerCase();

  return (
    lowered.includes("secret") ||
    lowered.includes("token") ||
    lowered.includes("password") ||
    lowered.includes("authorization") ||
    lowered.includes("api_key") ||
    lowered.includes("apikey") ||
    lowered.includes("credential") ||
    lowered.includes("signature")
  );
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[MAX_DEPTH_REACHED]";

  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return value.length > 4000 ? `${value.slice(0, 4000)}...[TRUNCATED]` : value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 100);

    for (const [key, entryValue] of entries) {
      output[key] = isSensitiveKey(key)
        ? "SERVER_SIDE_ONLY_REDACTED"
        : sanitizeValue(entryValue, depth + 1);
    }

    return output;
  }

  return String(value);
}

function parseCommandInputJson(value: unknown): unknown {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    return sanitizeValue(JSON.parse(value));
  } catch {
    return {
      parse_error: "Unable to parse Input_JSON.",
      raw_value: sanitizeValue(value),
    };
  }
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
      error: text.slice(0, 1200),
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
  commandStatus: string;
  commandStatusSelect: string;
  checklistSafe: boolean;
}): CommandDraftReviewStatus {
  if (!input.stateOk) return "COMMAND_DRAFT_REVIEW_READ_FAILED";
  if (!input.intentRecordId) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!input.approvalRecordId) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (!input.commandRecordId) return "COMMAND_DRAFT_NOT_FOUND";

  const isDraft =
    input.commandStatus === "Draft" || input.commandStatusSelect === "Draft";

  if (!isDraft) return "COMMAND_DRAFT_STATUS_NOT_DRAFT";
  if (!input.checklistSafe) return "COMMAND_DRAFT_NOT_SAFE_TO_REVIEW";

  return "COMMAND_DRAFT_REVIEW_READY";
}

function buildPayload(input: {
  incidentId: string;
  workspaceId: string;
  status: CommandDraftReviewStatus;
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

  const commandStatus = safeString(commandFields.Status);
  const commandStatusSelect = safeString(commandFields.Status_select);
  const capability = safeString(commandFields.Capability);
  const targetMode = safeString(commandFields.Target_Mode);
  const dryRun = safeBoolean(commandFields.Dry_Run);
  const operatorIdentity = safeString(commandFields.Operator_Identity);
  const approvedForCommandDraft = safeBoolean(
    commandFields.Approved_For_Command_Draft
  );

  const queueAllowed = safeBoolean(commandFields.Queue_Allowed);
  const runCreationAllowed = safeBoolean(commandFields.Run_Creation_Allowed);
  const workerCallAllowed = safeBoolean(commandFields.Worker_Call_Allowed);

  const commandInputJson = parseCommandInputJson(commandFields.Input_JSON);

  const reviewChecklist = {
    intent_found: Boolean(intentRecordId),
    approval_found: Boolean(approvalRecordId),
    command_found: Boolean(commandRecordId),
    command_status_is_draft:
      commandStatus === "Draft" || commandStatusSelect === "Draft",
    idempotency_key_present:
      safeString(commandFields.Idempotency_Key) ===
      buildCommandIdempotencyKey(input.workspaceId, input.incidentId),
    workspace_scope_present: safeString(commandFields.Workspace_ID).length > 0,
    incident_scope_present: safeString(commandFields.Incident_ID).length > 0,
    intent_reference_present:
      safeString(commandFields.Intent_ID).length > 0 &&
      safeString(commandFields.Intent_Record_ID).length > 0,
    approval_reference_present:
      safeString(commandFields.Approval_ID).length > 0 &&
      safeString(commandFields.Approval_Record_ID).length > 0,
    target_capability_is_command_orchestrator: capability === "command_orchestrator",
    target_mode_is_dry_run_only: targetMode === "dry_run_only",
    dry_run_is_true: dryRun === true,
    queue_still_disabled: queueAllowed !== true,
    run_creation_still_disabled: runCreationAllowed !== true,
    worker_call_still_disabled: workerCallAllowed !== true,
    real_run_forbidden: safeString(commandFields.Real_Run) === "Forbidden",
    secret_exposure_disabled:
      safeString(commandFields.Secret_Exposure) === "Disabled" ||
      safeString(commandFields.Secret_Exposure) === "SERVER_SIDE_ONLY_REDACTED",
  };

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status: input.status,
    mode: "COMMAND_DRAFT_REVIEW_SURFACE_ONLY",
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

    command_status: commandRecordId ? "DRAFT_PERSISTED" : "NOT_FOUND",
    command_review: input.status === "COMMAND_DRAFT_REVIEW_READY" ? "READY" : "BLOCKED",
    command_creation: commandRecordId ? "ALREADY_CREATED_AS_DRAFT" : "NOT_CREATED",
    command_mutation: "DISABLED",
    queue: "DISABLED",
    queue_allowed_now: false,
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.13",
      status: "COMMAND_DRAFT_ALREADY_PERSISTED_OR_PERSISTED",
      command_draft_persistence: "VALIDATED",
      execution_policy: "DRAFT_PERSISTENCE_ONLY",
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

    persisted_intent_snapshot: sanitizeValue(
      intentRecordId
        ? {
            record_id: intentRecordId,
            idempotency_key: safeString(intentFields.Idempotency_Key),
            intent_id: safeString(intentFields.Intent_ID),
            workspace_id: safeString(intentFields.Workspace_ID),
            incident_id: safeString(intentFields.Incident_ID),
            source_layer: safeString(intentFields.Source_Layer),
          }
        : null
    ),

    persisted_approval_snapshot: sanitizeValue(
      approvalRecordId
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
        : null
    ),

    persisted_command_snapshot: sanitizeValue(
      commandRecordId
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
            capability,
            status: commandStatus,
            status_select: commandStatusSelect,
            target_mode: targetMode,
            dry_run: dryRun,
            operator_identity: operatorIdentity,
            approved_for_command_draft: approvedForCommandDraft,
            queue_allowed: queueAllowed,
            run_creation_allowed: runCreationAllowed,
            worker_call_allowed: workerCallAllowed,
            real_run: safeString(commandFields.Real_Run),
            secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
            source_layer: safeString(commandFields.Source_Layer),
          }
        : null
    ),

    command_input_json: commandInputJson,

    review_checklist: reviewChecklist,

    future_queue_requirements: [
      "Command Draft must be reviewed by operator",
      "Queue transition must have a dedicated feature gate",
      "Queue transition must require explicit confirmation",
      "Command must remain linked to intent and approval",
      "Command status transition must be audited",
      "Run creation must remain disabled during queue preview",
      "Worker call must remain disabled until execution gate",
      "No secret exposure is allowed",
    ],

    guardrails: {
      client_fetch: "DISABLED",
      airtable_mutation: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      command_mutation: "DISABLED",
      queue: "DISABLED",
      run_creation: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      secret_exposure: "DISABLED",
      review_only: true,
    },

    error: input.error,

    next_step:
      "V5.15 may introduce a Controlled Command Queue Preview, still without queue persistence, run creation, or worker execution.",
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
        status: "COMMAND_DRAFT_REVIEW_CONFIG_MISSING",
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
  const commandStatus = safeString(commandFields.Status);
  const commandStatusSelect = safeString(commandFields.Status_select);

  const checklistSafe =
    Boolean(state.intent.recordId) &&
    Boolean(state.approval.recordId) &&
    Boolean(state.command.recordId) &&
    (commandStatus === "Draft" || commandStatusSelect === "Draft") &&
    safeString(commandFields.Idempotency_Key) ===
      buildCommandIdempotencyKey(workspaceId, incidentId) &&
    safeString(commandFields.Workspace_ID).length > 0 &&
    safeString(commandFields.Incident_ID).length > 0 &&
    safeString(commandFields.Intent_ID).length > 0 &&
    safeString(commandFields.Intent_Record_ID).length > 0 &&
    safeString(commandFields.Approval_ID).length > 0 &&
    safeString(commandFields.Approval_Record_ID).length > 0 &&
    safeString(commandFields.Capability) === "command_orchestrator" &&
    safeString(commandFields.Target_Mode) === "dry_run_only" &&
    safeBoolean(commandFields.Dry_Run) === true &&
    safeBoolean(commandFields.Queue_Allowed) !== true &&
    safeBoolean(commandFields.Run_Creation_Allowed) !== true &&
    safeBoolean(commandFields.Worker_Call_Allowed) !== true &&
    safeString(commandFields.Real_Run) === "Forbidden" &&
    safeString(commandFields.Secret_Exposure) === "Disabled";

  const status = resolveStatus({
    stateOk: state.ok,
    intentRecordId: state.intent.recordId,
    approvalRecordId: state.approval.recordId,
    commandRecordId: state.command.recordId,
    commandStatus,
    commandStatusSelect,
    checklistSafe,
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
