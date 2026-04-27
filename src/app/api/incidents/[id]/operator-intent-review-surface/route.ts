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

type ReviewStatus =
  | "OPERATOR_INTENT_REVIEW_READY"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_INTENT_REVIEW_CONFIG_MISSING"
  | "OPERATOR_INTENT_REVIEW_READ_FAILED";

const VERSION = "Incident Detail V5.9";
const SOURCE =
  "dashboard_incident_detail_v5_9_operator_intent_review_surface";

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

function buildIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`;
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
  status: ReviewStatus;
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
  const idempotencyKey = buildIdempotencyKey(input.workspaceId, input.incidentId);

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

  return {
    ok:
      input.status === "OPERATOR_INTENT_REVIEW_READY" ||
      input.status === "OPERATOR_INTENT_DRAFT_NOT_FOUND",
    version: VERSION,
    source: SOURCE,
    status: input.status,
    mode: "OPERATOR_INTENT_REVIEW_SURFACE_ONLY",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,

    intent_id: intentId,
    persistence_id: persistenceId,
    idempotency_key: idempotencyKey,

    review_status:
      input.status === "OPERATOR_INTENT_REVIEW_READY"
        ? "READY_FOR_OPERATOR_REVIEW"
        : "NOT_READY_FOR_OPERATOR_REVIEW",
    operator_review: "READ_ONLY",
    operator_approval: "NOT_CAPTURED",
    operator_confirmation: "REQUIRED_BEFORE_COMMAND_CREATION",

    real_run: "FORBIDDEN",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",
    command_creation: "DISABLED",
    run_creation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.8",
      status: "INTENT_PERSISTED_AS_DRAFT_OR_ALREADY_PERSISTED",
      gated_persistence: "VALIDATED",
      execution_policy: "DRAFT_PERSISTENCE_ONLY",
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

    review_gate: {
      intent_found: Boolean(input.airtableRecordId),
      expected_status: "Draft",
      current_status: intentSnapshot?.status || null,
      review_allowed_now: Boolean(input.airtableRecordId),
      approval_capture_enabled: false,
      command_creation_allowed_now: false,
      run_creation_allowed_now: false,
      worker_call_allowed_now: false,
      next_transition: "BLOCKED_UNTIL_OPERATOR_APPROVAL_LAYER",
    },

    operator_review_checklist: {
      persisted_draft_found: Boolean(input.airtableRecordId),
      idempotency_key_present: Boolean(intentSnapshot?.idempotency_key),
      workspace_scope_present: Boolean(intentSnapshot?.workspace_id),
      incident_scope_present: Boolean(intentSnapshot?.incident_id),
      target_capability_present: Boolean(intentSnapshot?.target_capability),
      target_mode_is_dry_run_only: intentSnapshot?.target_mode === "dry_run_only",
      status_is_draft: intentSnapshot?.status === "Draft",
      real_run_forbidden: intentSnapshot?.real_run === "Forbidden",
      secret_exposure_disabled: intentSnapshot?.secret_exposure === "Disabled",
      operator_approval_still_required: true,
    },

    future_command_requirements: [
      "Operator identity must be known",
      "Operator approval must be captured explicitly",
      "Approval must be persisted with an audit trail",
      "Command creation must have its own feature gate",
      "Command idempotency key must be deterministic",
      "Workspace scope must be preserved",
      "Command must start as Draft or Queued only",
      "No worker call should happen during review",
      "Rollback or safe cancel path must exist",
      "No secret exposure is allowed",
    ],

    guardrails: {
      client_fetch: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      airtable_mutation: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      incident_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_mutation: "DISABLED",
      command_creation: "DISABLED",
      run_creation: "DISABLED",
      secret_exposure: "DISABLED",
      real_run: "FORBIDDEN",
      dry_run_only: true,
      operator_approval_required: true,
      review_only: true,
    },

    next_step:
      "V5.10 may introduce an audited operator approval draft, still without command creation or worker execution.",
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
        status: "OPERATOR_INTENT_REVIEW_CONFIG_MISSING",
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

  const idempotencyKey = buildIdempotencyKey(workspaceId, incidentId);

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
        status: "OPERATOR_INTENT_REVIEW_READ_FAILED",
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
        ? "OPERATOR_INTENT_REVIEW_READY"
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
