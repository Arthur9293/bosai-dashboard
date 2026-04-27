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

type FeatureGateState =
  | "FEATURE_GATE_MISSING"
  | "FEATURE_GATE_DISABLED"
  | "FEATURE_GATE_ENABLED";

type ApprovalPersistenceStatus =
  | "APPROVAL_PERSISTENCE_BLOCKED_BY_FEATURE_GATE"
  | "APPROVAL_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION"
  | "OPERATOR_APPROVAL_CONFIRMATION_REQUIRED"
  | "OPERATOR_IDENTITY_REQUIRED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_ALREADY_PERSISTED"
  | "OPERATOR_APPROVAL_PERSISTED"
  | "OPERATOR_APPROVAL_PERSISTENCE_CONFIG_MISSING"
  | "OPERATOR_APPROVAL_PERSISTENCE_READ_FAILED"
  | "OPERATOR_APPROVAL_PERSISTENCE_FAILED"
  | "REAL_RUN_FORBIDDEN";

type AirtableRecordResult = {
  ok: boolean;
  status: number;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

const VERSION = "Incident Detail V5.11";
const SOURCE =
  "dashboard_incident_detail_v5_11_gated_audited_operator_approval_persistence";

const APPROVAL_GATE_ENV = "BOSAI_OPERATOR_APPROVAL_PERSISTENCE_ENABLED";
const REQUIRED_CONFIRMATION_TOKEN = "PERSIST_OPERATOR_APPROVAL";

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

function normalizeOperatorIdentity(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isDryRunFalseAttempt(value: unknown): boolean {
  if (typeof value === "boolean") return value === false;
  if (typeof value !== "string") return false;

  return ["false", "0", "no", "off"].includes(value.trim().toLowerCase());
}

function resolveApprovalGate(): {
  feature_gate_env: string;
  feature_gate_enabled: boolean;
  feature_gate_state: FeatureGateState;
  raw_value: "MISSING" | "SERVER_SIDE_ONLY_NOT_EXPOSED";
} {
  const raw = process.env[APPROVAL_GATE_ENV];

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      feature_gate_env: APPROVAL_GATE_ENV,
      feature_gate_enabled: false,
      feature_gate_state: "FEATURE_GATE_MISSING",
      raw_value: "MISSING",
    };
  }

  const normalized = raw.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return {
      feature_gate_env: APPROVAL_GATE_ENV,
      feature_gate_enabled: true,
      feature_gate_state: "FEATURE_GATE_ENABLED",
      raw_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    };
  }

  return {
    feature_gate_env: APPROVAL_GATE_ENV,
    feature_gate_enabled: false,
    feature_gate_state: "FEATURE_GATE_DISABLED",
    raw_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
  };
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

function buildIntentIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`;
}

function buildApprovalId(workspaceId: string, incidentId: string): string {
  return `operator-approval:v5.11:${workspaceId}:${incidentId}`;
}

function buildApprovalIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.11:gated-operator-approval-persistence:${workspaceId}:${incidentId}`;
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
    `https://api.airtable.com/v0/${encodeURIComponent(input.baseId)}/${encodeURIComponent(
      input.table
    )}`
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

async function createApprovalRecord(input: {
  token: string;
  baseId: string;
  table: string;
  fields: Record<string, unknown>;
}): Promise<AirtableRecordResult> {
  const url = `https://api.airtable.com/v0/${encodeURIComponent(
    input.baseId
  )}/${encodeURIComponent(input.table)}`;

  const response = await fetch(url, {
    method: "POST",
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
      error: text.slice(0, 1200),
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
      recordId: json.id ?? null,
      fields: json.fields ?? {},
      error: null,
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      recordId: null,
      fields: null,
      error: "Unable to parse Airtable create response.",
    };
  }
}

function buildApprovalFields(input: {
  incidentId: string;
  workspaceId: string;
  operatorIdentity: string;
  intentSnapshot: Record<string, unknown> | null;
}) {
  const intentId = buildIntentId(input.workspaceId, input.incidentId);
  const persistenceId = buildPersistenceId(input.workspaceId, input.incidentId);
  const approvalId = buildApprovalId(input.workspaceId, input.incidentId);
  const approvalIdempotencyKey = buildApprovalIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );

  return {
    Idempotency_Key: approvalIdempotencyKey,
    Approval_ID: approvalId,
    Intent_ID: intentId,
    Persistence_ID: persistenceId,
    Workspace_ID: input.workspaceId,
    Incident_ID: input.incidentId,
    Operator_Identity: input.operatorIdentity,
    Approval_Status: "Approved",
    Operator_Decision: "Approve Draft Intent",
    Approval_Confirmation: REQUIRED_CONFIRMATION_TOKEN,
    Target_Capability:
      safeString(input.intentSnapshot?.Target_Capability) || "command_orchestrator",
    Target_Mode: safeString(input.intentSnapshot?.Target_Mode) || "dry_run_only",
    Approved_For_Command_Draft: true,
    Command_Creation_Allowed: false,
    Run_Creation_Allowed: false,
    Worker_Call_Allowed: false,
    Real_Run: "Forbidden",
    Secret_Exposure: "Disabled",
    Source_Layer: VERSION,
  };
}

function buildPayload(input: {
  method: "GET" | "POST";
  incidentId: string;
  workspaceId: string;
  status: ApprovalPersistenceStatus;
  approvalGate: ReturnType<typeof resolveApprovalGate>;
  operatorIdentity?: string | null;
  intentReadHttpStatus: number | null;
  intentRecordId: string | null;
  intentFields: Record<string, unknown> | null;
  approvalReadHttpStatus: number | null;
  approvalRecordId: string | null;
  approvalFields: Record<string, unknown> | null;
  approvalWriteHttpStatus: number | null;
  error: string | null;
}) {
  const token = getAirtableToken();
  const baseId = getAirtableBaseId();
  const intentsTable = getOperatorIntentsTable();
  const approvalsTable = getOperatorApprovalsTable();

  const intentId = buildIntentId(input.workspaceId, input.incidentId);
  const persistenceId = buildPersistenceId(input.workspaceId, input.incidentId);
  const intentIdempotencyKey = buildIntentIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );
  const approvalId = buildApprovalId(input.workspaceId, input.incidentId);
  const approvalIdempotencyKey = buildApprovalIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );

  const intentFields = input.intentFields ?? {};
  const approvalFields = input.approvalFields ?? {};

  const intentSnapshot = input.intentRecordId
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
        operator_confirmation: safeString(intentFields.Operator_Confirmation),
        execution_allowed: safeBoolean(intentFields.Execution_Allowed),
        submission_allowed: safeBoolean(intentFields.Submission_Allowed),
        persistence_allowed: safeBoolean(intentFields.Persistence_Allowed),
        real_run: safeString(intentFields.Real_Run),
        secret_exposure: safeString(intentFields.Secret_Exposure),
        source_layer: safeString(intentFields.Source_Layer),
      }
    : null;

  const approvalSnapshot = input.approvalRecordId
    ? {
        record_id: input.approvalRecordId,
        idempotency_key: safeString(approvalFields.Idempotency_Key),
        approval_id: safeString(approvalFields.Approval_ID),
        intent_id: safeString(approvalFields.Intent_ID),
        persistence_id: safeString(approvalFields.Persistence_ID),
        workspace_id: safeString(approvalFields.Workspace_ID),
        incident_id: safeString(approvalFields.Incident_ID),
        operator_identity: safeString(approvalFields.Operator_Identity),
        approval_status: safeString(approvalFields.Approval_Status),
        operator_decision: safeString(approvalFields.Operator_Decision),
        target_capability: safeString(approvalFields.Target_Capability),
        target_mode: safeString(approvalFields.Target_Mode),
        approved_for_command_draft: safeBoolean(
          approvalFields.Approved_For_Command_Draft
        ),
        command_creation_allowed: safeBoolean(
          approvalFields.Command_Creation_Allowed
        ),
        run_creation_allowed: safeBoolean(approvalFields.Run_Creation_Allowed),
        worker_call_allowed: safeBoolean(approvalFields.Worker_Call_Allowed),
        real_run: safeString(approvalFields.Real_Run),
        secret_exposure: safeString(approvalFields.Secret_Exposure),
        source_layer: safeString(approvalFields.Source_Layer),
      }
    : null;

  const writeExecuted =
    input.status === "OPERATOR_APPROVAL_PERSISTED" ||
    input.status === "OPERATOR_APPROVAL_ALREADY_PERSISTED";

  return {
    ok:
      input.status !== "OPERATOR_APPROVAL_PERSISTENCE_CONFIG_MISSING" &&
      input.status !== "OPERATOR_APPROVAL_PERSISTENCE_READ_FAILED" &&
      input.status !== "OPERATOR_APPROVAL_PERSISTENCE_FAILED",
    version: VERSION,
    source: SOURCE,
    status: input.status,
    mode: "GATED_AUDITED_OPERATOR_APPROVAL_PERSISTENCE",
    method: input.method,

    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,

    feature_gate_env: input.approvalGate.feature_gate_env,
    feature_gate_enabled: input.approvalGate.feature_gate_enabled,

    intent_id: intentId,
    persistence_id: persistenceId,
    intent_idempotency_key: intentIdempotencyKey,

    approval_id: approvalId,
    approval_idempotency_key: approvalIdempotencyKey,
    approval_status: writeExecuted ? "APPROVAL_PERSISTED" : "NOT_PERSISTED",
    approval_capture:
      writeExecuted || input.status === "OPERATOR_APPROVAL_CONFIRMATION_REQUIRED"
        ? "SERVER_SIDE_POST_ONLY"
        : "DISABLED",
    approval_persistence: writeExecuted ? "PERSISTED" : "DISABLED",
    operator_identity: input.operatorIdentity || "REQUIRED_NOT_CAPTURED",
    operator_approval:
      writeExecuted ? "APPROVED_FOR_COMMAND_DRAFT_ONLY" : "NOT_APPROVED",

    real_run: "FORBIDDEN",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: writeExecuted
      ? "AUDITED_OPERATOR_APPROVAL_CREATED"
      : "DISABLED",
    command_creation: "DISABLED",
    run_creation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.10",
      status: "OPERATOR_APPROVAL_DRAFT_READY",
      approval_draft: "VALIDATED",
      execution_policy: "READ_ONLY_APPROVAL_DRAFT",
    },

    airtable_config: {
      base_id: baseId ? "CONFIGURED" : "MISSING",
      operator_intents_table: intentsTable,
      operator_approvals_table: approvalsTable,
      token: token ? "CONFIGURED" : "MISSING",
      token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    },

    intent_read: {
      http_status: input.intentReadHttpStatus,
      record_id: input.intentRecordId,
    },

    approval_read: {
      http_status: input.approvalReadHttpStatus,
      record_id: input.approvalRecordId,
    },

    approval_write: {
      http_status: input.approvalWriteHttpStatus,
      record_id: input.approvalRecordId,
      write_executed: writeExecuted,
      error: input.error,
    },

    persisted_intent_snapshot: sanitizeValue(intentSnapshot),
    persisted_approval_snapshot: sanitizeValue(approvalSnapshot),

    approval_gate: {
      feature_gate_env: input.approvalGate.feature_gate_env,
      feature_gate_enabled: input.approvalGate.feature_gate_enabled,
      required_confirmation_token: REQUIRED_CONFIRMATION_TOKEN,
      intent_found: Boolean(input.intentRecordId),
      existing_approval_found: Boolean(input.approvalRecordId),
      operator_identity_required: true,
      approval_write_allowed_now:
        input.method === "POST" &&
        input.approvalGate.feature_gate_enabled &&
        Boolean(input.intentRecordId),
      command_creation_allowed_now: false,
      run_creation_allowed_now: false,
      worker_call_allowed_now: false,
      next_transition: "BLOCKED_UNTIL_COMMAND_DRAFT_LAYER",
    },

    approval_request_preview: {
      method: "POST",
      target_table: approvalsTable,
      mutation: writeExecuted ? "CONTROLLED_APPROVAL_PERSISTENCE" : "DISABLED",
      write_sent: writeExecuted,
      headers: {
        authorization: "SERVER_SIDE_ONLY_NOT_EXPOSED",
        content_type: "application/json",
      },
      body: {
        fields: buildApprovalFields({
          incidentId: input.incidentId,
          workspaceId: input.workspaceId,
          operatorIdentity: input.operatorIdentity || "REQUIRED_NOT_CAPTURED",
          intentSnapshot: input.intentFields,
        }),
      },
    },

    guardrails: {
      client_fetch: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      dry_run_only: true,
      incident_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_mutation: "DISABLED",
      command_creation: "DISABLED",
      run_creation: "DISABLED",
      secret_exposure: "DISABLED",
      idempotency_required: true,
      approval_persistence_gated: true,
      status_forced_to_approved: writeExecuted,
    },

    next_step:
      "V5.12 may introduce an operator-approved command draft preview, still without command creation or worker execution.",
  };
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
  const intentIdempotencyKey = buildIntentIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );
  const approvalIdempotencyKey = buildApprovalIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );

  const intent = await findAirtableRecordByIdempotency({
    token: input.token,
    baseId: input.baseId,
    table: input.intentsTable,
    idempotencyKey: intentIdempotencyKey,
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
    idempotencyKey: approvalIdempotencyKey,
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

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await Promise.resolve(context.params);

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    request.nextUrl.searchParams.get("workspace_id") ??
      request.nextUrl.searchParams.get("workspaceId")
  );

  const approvalGate = resolveApprovalGate();
  const token = getAirtableToken();
  const baseId = getAirtableBaseId();
  const intentsTable = getOperatorIntentsTable();
  const approvalsTable = getOperatorApprovalsTable();

  if (!token || !baseId) {
    return NextResponse.json(
      buildPayload({
        method: "GET",
        incidentId,
        workspaceId,
        status: "OPERATOR_APPROVAL_PERSISTENCE_CONFIG_MISSING",
        approvalGate,
        operatorIdentity: null,
        intentReadHttpStatus: null,
        intentRecordId: null,
        intentFields: null,
        approvalReadHttpStatus: null,
        approvalRecordId: null,
        approvalFields: null,
        approvalWriteHttpStatus: null,
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
        method: "GET",
        incidentId,
        workspaceId,
        status: "OPERATOR_APPROVAL_PERSISTENCE_READ_FAILED",
        approvalGate,
        operatorIdentity: null,
        intentReadHttpStatus: state.intent.status,
        intentRecordId: state.intent.recordId,
        intentFields: state.intent.fields,
        approvalReadHttpStatus: state.approval.status,
        approvalRecordId: state.approval.recordId,
        approvalFields: state.approval.fields,
        approvalWriteHttpStatus: null,
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

  const status: ApprovalPersistenceStatus = state.approval.recordId
    ? "OPERATOR_APPROVAL_ALREADY_PERSISTED"
    : !state.intent.recordId
      ? "OPERATOR_INTENT_DRAFT_NOT_FOUND"
      : !approvalGate.feature_gate_enabled
        ? "APPROVAL_PERSISTENCE_BLOCKED_BY_FEATURE_GATE"
        : "APPROVAL_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION";

  return NextResponse.json(
    buildPayload({
      method: "GET",
      incidentId,
      workspaceId,
      status,
      approvalGate,
      operatorIdentity: null,
      intentReadHttpStatus: state.intent.status,
      intentRecordId: state.intent.recordId,
      intentFields: state.intent.fields,
      approvalReadHttpStatus: state.approval.status,
      approvalRecordId: state.approval.recordId,
      approvalFields: state.approval.fields,
      approvalWriteHttpStatus: null,
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

export async function POST(request: NextRequest, context: RouteContext) {
  const params = await Promise.resolve(context.params);

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    request.nextUrl.searchParams.get("workspace_id") ??
      request.nextUrl.searchParams.get("workspaceId")
  );

  const approvalGate = resolveApprovalGate();
  const token = getAirtableToken();
  const baseId = getAirtableBaseId();
  const intentsTable = getOperatorIntentsTable();
  const approvalsTable = getOperatorApprovalsTable();

  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const requestedDryRunFalse = isDryRunFalseAttempt(body.dry_run);
  const operatorConfirmation = normalizeText(
    typeof body.operator_confirmation === "string"
      ? body.operator_confirmation
      : null
  );
  const operatorIdentity = normalizeOperatorIdentity(body.operator_identity);

  if (requestedDryRunFalse) {
    return NextResponse.json(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "REAL_RUN_FORBIDDEN",
        approvalGate,
        operatorIdentity,
        intentReadHttpStatus: null,
        intentRecordId: null,
        intentFields: null,
        approvalReadHttpStatus: null,
        approvalRecordId: null,
        approvalFields: null,
        approvalWriteHttpStatus: null,
        error: "dry_run:false is forbidden from this route.",
      }),
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  if (!token || !baseId) {
    return NextResponse.json(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "OPERATOR_APPROVAL_PERSISTENCE_CONFIG_MISSING",
        approvalGate,
        operatorIdentity,
        intentReadHttpStatus: null,
        intentRecordId: null,
        intentFields: null,
        approvalReadHttpStatus: null,
        approvalRecordId: null,
        approvalFields: null,
        approvalWriteHttpStatus: null,
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
        method: "POST",
        incidentId,
        workspaceId,
        status: "OPERATOR_APPROVAL_PERSISTENCE_READ_FAILED",
        approvalGate,
        operatorIdentity,
        intentReadHttpStatus: state.intent.status,
        intentRecordId: state.intent.recordId,
        intentFields: state.intent.fields,
        approvalReadHttpStatus: state.approval.status,
        approvalRecordId: state.approval.recordId,
        approvalFields: state.approval.fields,
        approvalWriteHttpStatus: null,
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

  if (state.approval.recordId) {
    return NextResponse.json(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "OPERATOR_APPROVAL_ALREADY_PERSISTED",
        approvalGate,
        operatorIdentity:
          safeString(state.approval.fields?.Operator_Identity) || operatorIdentity,
        intentReadHttpStatus: state.intent.status,
        intentRecordId: state.intent.recordId,
        intentFields: state.intent.fields,
        approvalReadHttpStatus: state.approval.status,
        approvalRecordId: state.approval.recordId,
        approvalFields: state.approval.fields,
        approvalWriteHttpStatus: state.approval.status,
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

  if (!state.intent.recordId) {
    return NextResponse.json(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "OPERATOR_INTENT_DRAFT_NOT_FOUND",
        approvalGate,
        operatorIdentity,
        intentReadHttpStatus: state.intent.status,
        intentRecordId: state.intent.recordId,
        intentFields: state.intent.fields,
        approvalReadHttpStatus: state.approval.status,
        approvalRecordId: state.approval.recordId,
        approvalFields: state.approval.fields,
        approvalWriteHttpStatus: null,
        error: "Persisted operator intent draft was not found.",
      }),
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  if (!approvalGate.feature_gate_enabled) {
    return NextResponse.json(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "APPROVAL_PERSISTENCE_BLOCKED_BY_FEATURE_GATE",
        approvalGate,
        operatorIdentity,
        intentReadHttpStatus: state.intent.status,
        intentRecordId: state.intent.recordId,
        intentFields: state.intent.fields,
        approvalReadHttpStatus: state.approval.status,
        approvalRecordId: state.approval.recordId,
        approvalFields: state.approval.fields,
        approvalWriteHttpStatus: null,
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

  if (operatorConfirmation !== REQUIRED_CONFIRMATION_TOKEN) {
    return NextResponse.json(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "OPERATOR_APPROVAL_CONFIRMATION_REQUIRED",
        approvalGate,
        operatorIdentity,
        intentReadHttpStatus: state.intent.status,
        intentRecordId: state.intent.recordId,
        intentFields: state.intent.fields,
        approvalReadHttpStatus: state.approval.status,
        approvalRecordId: state.approval.recordId,
        approvalFields: state.approval.fields,
        approvalWriteHttpStatus: null,
        error: "Missing or invalid operator confirmation token.",
      }),
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  if (operatorIdentity.length === 0) {
    return NextResponse.json(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "OPERATOR_IDENTITY_REQUIRED",
        approvalGate,
        operatorIdentity,
        intentReadHttpStatus: state.intent.status,
        intentRecordId: state.intent.recordId,
        intentFields: state.intent.fields,
        approvalReadHttpStatus: state.approval.status,
        approvalRecordId: state.approval.recordId,
        approvalFields: state.approval.fields,
        approvalWriteHttpStatus: null,
        error: "operator_identity is required before persisting approval.",
      }),
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  const fields = buildApprovalFields({
    incidentId,
    workspaceId,
    operatorIdentity,
    intentSnapshot: state.intent.fields,
  });

  const created = await createApprovalRecord({
    token,
    baseId,
    table: approvalsTable,
    fields,
  });

  return NextResponse.json(
    buildPayload({
      method: "POST",
      incidentId,
      workspaceId,
      status: created.ok
        ? "OPERATOR_APPROVAL_PERSISTED"
        : "OPERATOR_APPROVAL_PERSISTENCE_FAILED",
      approvalGate,
      operatorIdentity,
      intentReadHttpStatus: state.intent.status,
      intentRecordId: state.intent.recordId,
      intentFields: state.intent.fields,
      approvalReadHttpStatus: state.approval.status,
      approvalRecordId: created.recordId,
      approvalFields: created.fields ?? fields,
      approvalWriteHttpStatus: created.status,
      error: created.error,
    }),
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
