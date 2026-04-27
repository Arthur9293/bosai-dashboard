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

type CommandDraftPreviewStatus =
  | "COMMAND_DRAFT_PREVIEW_READY"
  | "COMMAND_DRAFT_PREVIEW_CONFIG_MISSING"
  | "COMMAND_DRAFT_PREVIEW_READ_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_APPROVED"
  | "COMMAND_DRAFT_NOT_ALLOWED";

type AirtableRecordResult = {
  ok: boolean;
  status: number;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

const VERSION = "Incident Detail V5.12";
const SOURCE =
  "dashboard_incident_detail_v5_12_operator_approved_command_draft_preview";

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

function buildIntentId(workspaceId: string, incidentId: string): string {
  return `operator-intent:v5.4:${workspaceId}:${incidentId}`;
}

function buildPersistenceId(workspaceId: string, incidentId: string): string {
  return `intent-persistence:v5.8:${workspaceId}:${incidentId}`;
}

function buildApprovalId(workspaceId: string, incidentId: string): string {
  return `operator-approval:v5.11:${workspaceId}:${incidentId}`;
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

function buildCommandDraftId(workspaceId: string, incidentId: string): string {
  return `command-draft:v5.12:${workspaceId}:${incidentId}`;
}

function buildCommandIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.12:operator-approved-command-draft-preview:${workspaceId}:${incidentId}`;
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
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 80);

    for (const [key, entryValue] of entries) {
      output[key] = isSensitiveKey(key)
        ? "SERVER_SIDE_ONLY_REDACTED"
        : sanitizeValue(entryValue, depth + 1);
    }

    return output;
  }

  return String(value);
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

async function buildReadState(input: {
  token: string;
  baseId: string;
  intentsTable: string;
  approvalsTable: string;
  workspaceId: string;
  incidentId: string;
}): Promise<{
  ok: boolean;
  reason: "intent_read_failed" | "approval_read_failed" | null;
  intent: AirtableRecordResult;
  approval: AirtableRecordResult;
}> {
  const intent = await findAirtableRecordByIdempotency({
    token: input.token,
    baseId: input.baseId,
    table: input.intentsTable,
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
    };
  }

  const approval = await findAirtableRecordByIdempotency({
    token: input.token,
    baseId: input.baseId,
    table: input.approvalsTable,
    idempotencyKey: buildApprovalIdempotencyKey(input.workspaceId, input.incidentId),
  });

  if (!approval.ok) {
    return {
      ok: false,
      reason: "approval_read_failed",
      intent,
      approval,
    };
  }

  return {
    ok: true,
    reason: null,
    intent,
    approval,
  };
}

function buildPayload(input: {
  incidentId: string;
  workspaceId: string;
  status: CommandDraftPreviewStatus;
  intentReadHttpStatus: number | null;
  intentRecordId: string | null;
  intentFields: Record<string, unknown> | null;
  approvalReadHttpStatus: number | null;
  approvalRecordId: string | null;
  approvalFields: Record<string, unknown> | null;
  error: string | null;
}) {
  const token = getAirtableToken();
  const baseId = getAirtableBaseId();
  const intentsTable = getOperatorIntentsTable();
  const approvalsTable = getOperatorApprovalsTable();

  const intentId = buildIntentId(input.workspaceId, input.incidentId);
  const persistenceId = buildPersistenceId(input.workspaceId, input.incidentId);
  const approvalId = buildApprovalId(input.workspaceId, input.incidentId);
  const intentIdempotencyKey = buildIntentIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );
  const approvalIdempotencyKey = buildApprovalIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );
  const commandDraftId = buildCommandDraftId(input.workspaceId, input.incidentId);
  const commandIdempotencyKey = buildCommandIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );

  const intentFields = input.intentFields ?? {};
  const approvalFields = input.approvalFields ?? {};

  const operatorIdentity = safeString(approvalFields.Operator_Identity);
  const approvalStatus = safeString(approvalFields.Approval_Status);
  const approvedForCommandDraft =
    safeBoolean(approvalFields.Approved_For_Command_Draft) === true;

  const targetCapability =
    safeString(approvalFields.Target_Capability) ||
    safeString(intentFields.Target_Capability) ||
    "command_orchestrator";

  const targetMode =
    safeString(approvalFields.Target_Mode) ||
    safeString(intentFields.Target_Mode) ||
    "dry_run_only";

  const commandPayloadPreview = {
    capability: targetCapability,
    status: "Draft",
    workspace_id: input.workspaceId,
    incident_id: input.incidentId,
    dry_run: true,
    source: SOURCE,
    metadata: {
      origin: "operator_approved_command_draft_preview",
      intent_record_id: input.intentRecordId,
      approval_record_id: input.approvalRecordId,
      operator_identity: operatorIdentity || "UNKNOWN",
      approval_id: approvalId,
      command_draft_id: commandDraftId,
      real_run_forbidden: true,
      command_creation_allowed_now: false,
    },
  };

  return {
    ok:
      input.status === "COMMAND_DRAFT_PREVIEW_READY" ||
      input.status === "OPERATOR_INTENT_DRAFT_NOT_FOUND" ||
      input.status === "OPERATOR_APPROVAL_NOT_FOUND" ||
      input.status === "OPERATOR_APPROVAL_NOT_APPROVED" ||
      input.status === "COMMAND_DRAFT_NOT_ALLOWED",
    version: VERSION,
    source: SOURCE,
    status: input.status,
    mode: "OPERATOR_APPROVED_COMMAND_DRAFT_PREVIEW_ONLY",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,

    intent_id: intentId,
    intent_record_id: input.intentRecordId,
    persistence_id: persistenceId,
    approval_id: approvalId,
    approval_record_id: input.approvalRecordId,

    intent_idempotency_key: intentIdempotencyKey,
    approval_idempotency_key: approvalIdempotencyKey,

    command_draft_id: commandDraftId,
    command_idempotency_key: commandIdempotencyKey,
    command_status: "DRAFT_PREVIEW_ONLY",
    command_creation: "DISABLED",
    command_persistence: "DISABLED",
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.11",
      status: "OPERATOR_APPROVAL_ALREADY_PERSISTED_OR_PERSISTED",
      operator_approval_persistence: "VALIDATED",
      execution_policy: "APPROVAL_PERSISTENCE_ONLY",
    },

    airtable_read: {
      base_id: baseId ? "CONFIGURED" : "MISSING",
      operator_intents_table: intentsTable,
      operator_approvals_table: approvalsTable,
      token: token ? "CONFIGURED" : "MISSING",
      token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
      intent_http_status: input.intentReadHttpStatus,
      approval_http_status: input.approvalReadHttpStatus,
      error: input.error,
    },

    persisted_intent_snapshot: sanitizeValue(
      input.intentRecordId
        ? {
            record_id: input.intentRecordId,
            idempotency_key: safeString(intentFields.Idempotency_Key),
            intent_id: safeString(intentFields.Intent_ID),
            persistence_id: safeString(intentFields.Persistence_ID),
            workspace_id: safeString(intentFields.Workspace_ID),
            incident_id: safeString(intentFields.Incident_ID),
            target_capability: safeString(intentFields.Target_Capability),
            target_mode: safeString(intentFields.Target_Mode),
            proposed_action: safeString(intentFields.Proposed_Action),
            status: safeString(intentFields.Status),
            real_run: safeString(intentFields.Real_Run),
            secret_exposure: safeString(intentFields.Secret_Exposure),
            source_layer: safeString(intentFields.Source_Layer),
          }
        : null
    ),

    persisted_approval_snapshot: sanitizeValue(
      input.approvalRecordId
        ? {
            record_id: input.approvalRecordId,
            idempotency_key: safeString(approvalFields.Idempotency_Key),
            approval_id: safeString(approvalFields.Approval_ID),
            intent_id: safeString(approvalFields.Intent_ID),
            persistence_id: safeString(approvalFields.Persistence_ID),
            workspace_id: safeString(approvalFields.Workspace_ID),
            incident_id: safeString(approvalFields.Incident_ID),
            operator_identity: operatorIdentity,
            approval_status: approvalStatus,
            operator_decision: safeString(approvalFields.Operator_Decision),
            target_capability: safeString(approvalFields.Target_Capability),
            target_mode: safeString(approvalFields.Target_Mode),
            approved_for_command_draft: approvedForCommandDraft,
            command_creation_allowed: safeBoolean(
              approvalFields.Command_Creation_Allowed
            ),
            run_creation_allowed: safeBoolean(approvalFields.Run_Creation_Allowed),
            worker_call_allowed: safeBoolean(approvalFields.Worker_Call_Allowed),
            real_run: safeString(approvalFields.Real_Run),
            secret_exposure: safeString(approvalFields.Secret_Exposure),
            source_layer: safeString(approvalFields.Source_Layer),
          }
        : null
    ),

    operator_approval_check: {
      intent_found: Boolean(input.intentRecordId),
      approval_found: Boolean(input.approvalRecordId),
      operator_identity: operatorIdentity || "UNKNOWN",
      approval_status: approvalStatus || "UNKNOWN",
      approved_for_command_draft: approvedForCommandDraft,
      target_capability: targetCapability,
      target_mode: targetMode,
    },

    command_draft_preview: {
      type: "operator_approved_command_draft",
      target_table: "Commands",
      target_status: "Draft",
      target_capability: targetCapability,
      workspace_id: input.workspaceId,
      incident_id: input.incidentId,
      intent_id: intentId,
      intent_record_id: input.intentRecordId,
      approval_id: approvalId,
      approval_record_id: input.approvalRecordId,
      idempotency_key: commandIdempotencyKey,
      command_creation_allowed_now: false,
      command_persistence_allowed_now: false,
      queue_allowed_now: false,
      run_allowed_now: false,
      worker_call_allowed_now: false,
    },

    command_payload_preview: commandPayloadPreview,

    readiness_check: {
      intent_draft_found: Boolean(input.intentRecordId),
      approval_found: Boolean(input.approvalRecordId),
      approval_status_approved: approvalStatus === "Approved",
      approved_for_command_draft: approvedForCommandDraft,
      workspace_scope_present: input.workspaceId.length > 0,
      incident_scope_present: input.incidentId.length > 0,
      target_capability_present: targetCapability.length > 0,
      target_mode_is_dry_run_only: targetMode === "dry_run_only",
      command_creation_feature_gate_required: true,
      command_persistence_still_disabled: true,
      worker_call_still_disabled: true,
    },

    guardrails: {
      client_fetch: "DISABLED",
      airtable_mutation: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      command_creation: "DISABLED",
      command_persistence: "DISABLED",
      run_creation: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      secret_exposure: "DISABLED",
      dry_run_only: true,
      preview_only: true,
    },

    next_step:
      "V5.13 may introduce gated command draft persistence, still without queueing, run creation, or worker execution.",
  };
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
  const intentsTable = getOperatorIntentsTable();
  const approvalsTable = getOperatorApprovalsTable();

  if (!token || !baseId) {
    return NextResponse.json(
      buildPayload({
        incidentId,
        workspaceId,
        status: "COMMAND_DRAFT_PREVIEW_CONFIG_MISSING",
        intentReadHttpStatus: null,
        intentRecordId: null,
        intentFields: null,
        approvalReadHttpStatus: null,
        approvalRecordId: null,
        approvalFields: null,
        error: "Missing Airtable token or base id.",
      }),
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  const state = await buildReadState({
    token,
    baseId,
    intentsTable,
    approvalsTable,
    workspaceId,
    incidentId,
  });

  if (!state.ok) {
    return NextResponse.json(
      buildPayload({
        incidentId,
        workspaceId,
        status: "COMMAND_DRAFT_PREVIEW_READ_FAILED",
        intentReadHttpStatus: state.intent.status,
        intentRecordId: state.intent.recordId,
        intentFields: state.intent.fields,
        approvalReadHttpStatus: state.approval.status,
        approvalRecordId: state.approval.recordId,
        approvalFields: state.approval.fields,
        error: state.intent.error ?? state.approval.error ?? state.reason,
      }),
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  const approvalStatus = safeString(state.approval.fields?.Approval_Status);
  const approvedForCommandDraft =
    safeBoolean(state.approval.fields?.Approved_For_Command_Draft) === true;
  const targetMode =
    safeString(state.approval.fields?.Target_Mode) ||
    safeString(state.intent.fields?.Target_Mode);

  const status: CommandDraftPreviewStatus = !state.intent.recordId
    ? "OPERATOR_INTENT_DRAFT_NOT_FOUND"
    : !state.approval.recordId
      ? "OPERATOR_APPROVAL_NOT_FOUND"
      : approvalStatus !== "Approved"
        ? "OPERATOR_APPROVAL_NOT_APPROVED"
        : !approvedForCommandDraft || targetMode !== "dry_run_only"
          ? "COMMAND_DRAFT_NOT_ALLOWED"
          : "COMMAND_DRAFT_PREVIEW_READY";

  return NextResponse.json(
    buildPayload({
      incidentId,
      workspaceId,
      status,
      intentReadHttpStatus: state.intent.status,
      intentRecordId: state.intent.recordId,
      intentFields: state.intent.fields,
      approvalReadHttpStatus: state.approval.status,
      approvalRecordId: state.approval.recordId,
      approvalFields: state.approval.fields,
      error: null,
    }),
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
