import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id?: string;
  }> | {
    id?: string;
  };
};

const VERSION = "Incident Detail V5.5";
const SOURCE = "dashboard_incident_detail_v5_5_audited_intent_persistence_draft";

function normalizeText(value: string | null | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeIdPart(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return "unknown";
  }

  return trimmed
    .replace(/[^a-zA-Z0-9._:-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);
}

function buildPayload(input: { incidentId: string; workspaceId: string }) {
  const incidentId = normalizeIdPart(input.incidentId);
  const workspaceId = normalizeIdPart(input.workspaceId);

  const intentId = `operator-intent:v5.4:${workspaceId}:${incidentId}`;
  const persistenceId = `intent-persistence:v5.5:${workspaceId}:${incidentId}`;
  const idempotencyKey = `dashboard:v5.5:intent-persistence-draft:${workspaceId}:${incidentId}`;

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status: "INTENT_PERSISTENCE_DRAFT_READY",
    mode: "AUDITED_INTENT_PERSISTENCE_DRAFT_ONLY",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,

    intent_id: intentId,
    persistence_id: persistenceId,
    persistence_status: "DRAFT_NOT_PERSISTED",

    intent_submission: "DISABLED",
    intent_persistence: "DISABLED",
    operator_confirmation: "REQUIRED_BUT_NOT_CAPTURED",
    real_run: "FORBIDDEN",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.4",
      status: "OPERATOR_INTENT_DRAFT_READY",
      intent_status: "DRAFT_NOT_SUBMITTED",
      operator_intent_draft: "VALIDATED",
      execution_policy: "READ_ONLY_INTENT_DRAFT",
    },

    persistence_draft: {
      type: "audited_operator_intent_persistence",
      target_storage: "future_audit_store_or_airtable_table",
      target_table: "Operator_Intents",
      target_record_status: "Draft",
      write_allowed_now: false,
      submission_allowed_now: false,
      requires_operator_identity: true,
      requires_operator_confirmation: true,
      requires_dedicated_feature_gate: true,
      requires_audit_trail: true,
      requires_idempotency_key: true,
      requires_workspace_scope: true,
      requires_rollback_or_cancel_path: true,
    },

    idempotency: {
      key: idempotencyKey,
      deterministic: true,
      secret: false,
      scope: "workspace_and_incident",
    },

    field_mapping_preview: {
      Intent_ID: intentId,
      Persistence_ID: persistenceId,
      Workspace_ID: workspaceId,
      Incident_ID: incidentId,
      Target_Capability: "command_orchestrator",
      Target_Mode: "dry_run_only",
      Proposed_Action: "prepare_controlled_worker_dry_run_followup",
      Status: "Draft",
      Operator_Confirmation: "Required",
      Execution_Allowed: false,
      Submission_Allowed: false,
      Real_Run: "Forbidden",
      Secret_Exposure: "Disabled",
    },

    audit_requirements: [
      "Operator identity must be known before persistence",
      "Operator confirmation must be explicit",
      "Persistence must be protected by a dedicated feature gate",
      "Idempotency key must be deterministic",
      "Workspace scope must be preserved",
      "Intent status must start as Draft",
      "No worker call is allowed during persistence draft",
      "No real run is allowed",
      "Rollback or safe cancel path must exist",
      "No secret exposure is allowed",
    ],

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
    },

    next_step:
      "V5.6 may introduce gated audited intent persistence, still without direct real execution.",
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const searchParams = request.nextUrl.searchParams;

  const incidentId = normalizeText(params.id, "unknown");
  const workspaceId = normalizeText(
    searchParams.get("workspace_id") ?? searchParams.get("workspaceId"),
    "production"
  );

  const payload = buildPayload({
    incidentId,
    workspaceId,
  });

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
