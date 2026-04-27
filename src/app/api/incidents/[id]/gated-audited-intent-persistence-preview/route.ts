import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type FeatureGateStatus =
  | "PERSISTENCE_BLOCKED_BY_FEATURE_GATE"
  | "PERSISTENCE_PREVIEW_READY_BUT_NOT_EXECUTED";

type FeatureGateState = "BLOCKED" | "ENABLED_PREVIEW_ONLY";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const VERSION = "Incident Detail V5.6";
const SOURCE =
  "dashboard_incident_detail_v5_6_gated_audited_intent_persistence_preview";
const FEATURE_GATE_ENV = "BOSAI_AUDITED_INTENT_PERSISTENCE_ENABLED";

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

function isFeatureGateEnabled(): boolean {
  const raw = process.env[FEATURE_GATE_ENV];

  if (typeof raw !== "string") {
    return false;
  }

  const normalized = raw.trim().toLowerCase();

  return ["true", "1", "yes", "on"].includes(normalized);
}

function buildIntentId(workspaceId: string, incidentId: string): string {
  return `operator-intent:v5.4:${workspaceId}:${incidentId}`;
}

function buildPersistenceId(workspaceId: string, incidentId: string): string {
  return `intent-persistence:v5.5:${workspaceId}:${incidentId}`;
}

function buildIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.6:gated-intent-persistence-preview:${workspaceId}:${incidentId}`;
}

function buildPayload(input: {
  incidentId: string;
  workspaceId: string;
  featureGateEnabled: boolean;
}) {
  const status: FeatureGateStatus = input.featureGateEnabled
    ? "PERSISTENCE_PREVIEW_READY_BUT_NOT_EXECUTED"
    : "PERSISTENCE_BLOCKED_BY_FEATURE_GATE";

  const gateStatus: FeatureGateState = input.featureGateEnabled
    ? "ENABLED_PREVIEW_ONLY"
    : "BLOCKED";

  const persistencePreview = input.featureGateEnabled
    ? "READY_BUT_NOT_EXECUTED"
    : "BLOCKED_NOT_EXECUTED";

  const intentId = buildIntentId(input.workspaceId, input.incidentId);
  const persistenceId = buildPersistenceId(input.workspaceId, input.incidentId);
  const idempotencyKey = buildIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status,
    mode: "GATED_AUDITED_INTENT_PERSISTENCE_PREVIEW_ONLY",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,

    feature_gate_env: FEATURE_GATE_ENV,
    feature_gate_enabled: input.featureGateEnabled,

    persistence_preview: persistencePreview,
    intent_id: intentId,
    persistence_id: persistenceId,
    persistence_status: "NOT_PERSISTED",

    intent_submission: "DISABLED",
    intent_persistence: "DISABLED",
    operator_confirmation: "REQUIRED_BUT_NOT_CAPTURED",
    real_run: "FORBIDDEN",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.5",
      status: "INTENT_PERSISTENCE_DRAFT_READY",
      persistence_status: "DRAFT_NOT_PERSISTED",
      intent_persistence_draft: "VALIDATED",
      execution_policy: "READ_ONLY_PERSISTENCE_DRAFT",
    },

    persistence_gate: {
      feature_gate_env: FEATURE_GATE_ENV,
      feature_gate_enabled: input.featureGateEnabled,
      gate_status: gateStatus,
      write_allowed_now: false,
      preview_only: true,
    },

    persistence_contract_preview: {
      target_storage: "future_audit_store_or_airtable_table",
      target_table: "Operator_Intents",
      target_record_status: "Draft",
      idempotency_key: idempotencyKey,
      deterministic: true,
      workspace_scope: input.workspaceId,
      incident_scope: input.incidentId,
      write_allowed_now: false,
      submission_allowed_now: false,
    },

    required_fields_check: {
      Intent_ID: "READY",
      Persistence_ID: "READY",
      Workspace_ID: "READY",
      Incident_ID: "READY",
      Target_Capability: "READY",
      Target_Mode: "READY",
      Proposed_Action: "READY",
      Status: "READY",
      Operator_Confirmation: "REQUIRED",
      Execution_Allowed: false,
      Submission_Allowed: false,
      Real_Run: "FORBIDDEN",
      Secret_Exposure: "DISABLED",
    },

    guardrails: {
      client_fetch: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      airtable_mutation: "DISABLED",
      intent_persistence: "DISABLED",
      intent_submission: "DISABLED",
      incident_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_mutation: "DISABLED",
      secret_exposure: "DISABLED",
      real_run: "FORBIDDEN",
      dry_run_only: true,
      operator_confirmation_required: true,
      feature_gate_required: true,
    },

    next_step:
      "V5.7 may introduce gated audited intent persistence as a server-side dry-run write preview, still without real execution.",
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const incidentId = normalizeIncidentId(params.id);

  const workspaceId = normalizeWorkspaceId(
    request.nextUrl.searchParams.get("workspace_id") ??
      request.nextUrl.searchParams.get("workspaceId")
  );

  const payload = buildPayload({
    incidentId,
    workspaceId,
    featureGateEnabled: isFeatureGateEnabled(),
  });

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
