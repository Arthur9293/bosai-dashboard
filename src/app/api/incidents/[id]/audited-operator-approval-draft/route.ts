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

type ApprovalDraftStatus =
  | "OPERATOR_APPROVAL_DRAFT_READY"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_DRAFT_CONFIG_MISSING"
  | "OPERATOR_APPROVAL_DRAFT_READ_FAILED";

const VERSION = "Incident Detail V5.10";
const SOURCE =
  "dashboard_incident_detail_v5_10_audited_operator_approval_draft";

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
  return `operator-approval:v5.10:${workspaceId}:${incidentId}`;
}

function buildApprovalIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.10:operator-approval-draft:${workspaceId}:${incidentId}`;
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

async function findPersistedIntent(input: {
  token: string;
  baseId: string;
  table: string;
  idempotencyKey: string;
}): Promise<{
  ok: boolean;
  status: number;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
}> {
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

    if (!record?.id) {
      return {
        ok: true,
        status: response.status,
        recordId: null,
        fields: null,
        error: null,
      };
    }

    return {
      ok: true,
      status: response.status,
      recordId: record.id,
      fields: record.fields ?? {},
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

function buildPayload(input: {
  incidentId: string;
  workspaceId: string;
  status: ApprovalDraftStatus;
  airtableHttpStatus: number | null;
  airtableRecordId: string | null;
  airtableFields: Record<string, unknown> | null;
  error: string | null;
}) {
  const token = getAirtableToken();
  const baseId = getAirtableBaseId();
  const table = getOperatorIntentsTable();

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

  const fields = input.airtableFields ?? {};

  const intentSnapshot = input.airtableRecordId
    ? {
        record_id: input.airtableRecordId,
        idempotency_key: safeString(fields.Idempotency_Key),
        intent_id: safeString(fields.Intent_ID),
        persistence_id: safeString(fields.Persistence_ID),
        workspace_id: safeString(fields.Workspace_ID),
        incident_id: safeString(fields.Incident_ID),
        target_capability: safeString(fields.Target_Capability),
        target_mode: safeString(fields.Target_Mode),
        proposed_action: safeString(fields.Proposed_Action),
        status: safeString(fields.Status),
        operator_confirmation: safeString(fields.Operator_Confirmation),
        execution_allowed: safeBoolean(fields.Execution_Allowed),
        submission_allowed: safeBoolean(fields.Submission_Allowed),
        persistence_allowed: safeBoolean(fields.Persistence_Allowed),
        real_run: safeString(fields.Real_Run),
        secret_exposure: safeString(fields.Secret_Exposure),
        source_layer: safeString(fields.Source_Layer),
      }
    : null;

  const draftReady = input.status === "OPERATOR_APPROVAL_DRAFT_READY";

  return {
    ok:
      input.status === "OPERATOR_APPROVAL_DRAFT_READY" ||
      input.status === "OPERATOR_INTENT_DRAFT_NOT_FOUND",
    version: VERSION,
    source: SOURCE,
    status: input.status,
    mode: "AUDITED_OPERATOR_APPROVAL_DRAFT_ONLY",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,

    intent_id: intentId,
    persistence_id: persistenceId,
    intent_idempotency_key: intentIdempotencyKey,

    approval_id: approvalId,
    approval_idempotency_key: approvalIdempotencyKey,
    approval_status: draftReady ? "APPROVAL_DRAFT_READY" : "APPROVAL_DRAFT_BLOCKED",
    approval_capture: "DISABLED",
    approval_persistence: "DISABLED",
    operator_identity: "REQUIRED_NOT_CAPTURED",
    operator_approval: "DRAFT_NOT_APPROVED",
    operator_confirmation: "REQUIRED_BUT_NOT_CAPTURED",

    real_run: "FORBIDDEN",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",
    command_creation: "DISABLED",
    run_creation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.9",
      status: "OPERATOR_INTENT_REVIEW_READY",
      operator_review_surface: "VALIDATED",
      execution_policy: "READ_ONLY_INTENT_REVIEW",
    },

    airtable_read: {
      base_id: baseId ? "CONFIGURED" : "MISSING",
      table,
      token: token ? "CONFIGURED" : "MISSING",
      token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
      read_attempted: Boolean(token && baseId),
      http_status: input.airtableHttpStatus,
      record_id: input.airtableRecordId,
      error: input.error,
    },

    persisted_intent_snapshot: sanitizeValue(intentSnapshot),

    approval_draft: {
      type: "audited_operator_approval_draft",
      target_intent_id: intentId,
      target_persistence_id: persistenceId,
      target_record_id: input.airtableRecordId,
      proposed_approval_status: "Pending Approval",
      proposed_operator_decision: "Approve Draft Intent",
      approval_allowed_now: false,
      approval_capture_allowed_now: false,
      approval_persistence_allowed_now: false,
      command_creation_allowed_now: false,
      run_creation_allowed_now: false,
      worker_call_allowed_now: false,
      requires_operator_identity: true,
      requires_explicit_operator_approval: true,
      requires_approval_audit_trail: true,
      requires_dedicated_approval_feature_gate: true,
      requires_command_creation_feature_gate: true,
      requires_workspace_scope: true,
      requires_idempotency_key: true,
      requires_rollback_or_cancel_path: true,
    },

    approval_gate: {
      persisted_draft_found: Boolean(input.airtableRecordId),
      intent_status: intentSnapshot?.status || null,
      expected_intent_status: "Draft",
      review_layer_validated: true,
      approval_layer_ready: draftReady,
      approval_capture_enabled: false,
      approval_persistence_enabled: false,
      command_creation_enabled: false,
      next_transition: "BLOCKED_UNTIL_APPROVAL_PERSISTENCE_LAYER",
    },

    operator_approval_checklist: {
      persisted_draft_found: Boolean(input.airtableRecordId),
      intent_status_is_draft: intentSnapshot?.status === "Draft",
      target_mode_is_dry_run_only: intentSnapshot?.target_mode === "dry_run_only",
      real_run_forbidden: intentSnapshot?.real_run === "Forbidden",
      secret_exposure_disabled: intentSnapshot?.secret_exposure === "Disabled",
      operator_identity_required: true,
      explicit_approval_required: true,
      approval_not_captured: true,
      command_creation_still_disabled: true,
      worker_call_still_disabled: true,
    },

    future_approval_requirements: [
      "Operator identity must be known",
      "Operator approval must be explicit",
      "Approval must be persisted before command creation",
      "Approval persistence must have a dedicated feature gate",
      "Approval idempotency key must be deterministic",
      "Workspace scope must be preserved",
      "Approval must reference the persisted intent record",
      "Command creation must remain disabled during approval draft",
      "No worker call should happen during approval draft",
      "Rollback or safe cancel path must exist",
      "No secret exposure is allowed",
    ],

    guardrails: {
      client_fetch: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      airtable_mutation: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      approval_capture: "DISABLED",
      approval_persistence: "DISABLED",
      incident_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_mutation: "DISABLED",
      command_creation: "DISABLED",
      run_creation: "DISABLED",
      secret_exposure: "DISABLED",
      real_run: "FORBIDDEN",
      dry_run_only: true,
      approval_draft_only: true,
      operator_identity_required: true,
      operator_approval_required: true,
    },

    next_step:
      "V5.11 may introduce gated audited operator approval persistence, still without command creation or worker execution.",
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
  const table = getOperatorIntentsTable();

  if (!token || !baseId) {
    return NextResponse.json(
      buildPayload({
        incidentId,
        workspaceId,
        status: "OPERATOR_APPROVAL_DRAFT_CONFIG_MISSING",
        airtableHttpStatus: null,
        airtableRecordId: null,
        airtableFields: null,
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

  const idempotencyKey = buildIntentIdempotencyKey(workspaceId, incidentId);

  const result = await findPersistedIntent({
    token,
    baseId,
    table,
    idempotencyKey,
  });

  if (!result.ok) {
    return NextResponse.json(
      buildPayload({
        incidentId,
        workspaceId,
        status: "OPERATOR_APPROVAL_DRAFT_READ_FAILED",
        airtableHttpStatus: result.status,
        airtableRecordId: null,
        airtableFields: null,
        error: result.error,
      }),
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  return NextResponse.json(
    buildPayload({
      incidentId,
      workspaceId,
      status: result.recordId
        ? "OPERATOR_APPROVAL_DRAFT_READY"
        : "OPERATOR_INTENT_DRAFT_NOT_FOUND",
      airtableHttpStatus: result.status,
      airtableRecordId: result.recordId,
      airtableFields: result.fields,
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
