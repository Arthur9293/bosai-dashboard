import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const VERSION = "Incident Detail V5.4";
const SOURCE = "dashboard_incident_detail_v5_4_audited_operator_intent_draft";

type RouteContext = {
  params: Promise<{
    id?: string;
  }> | {
    id?: string;
  };
};

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

function buildIntentId(input: {
  workspaceId: string;
  incidentId: string;
}): string {
  return `operator-intent:v5.4:${input.workspaceId}:${input.incidentId}`;
}

function buildAuditedOperatorIntentDraftPayload(input: {
  incidentId: string;
  workspaceId: string;
}) {
  const intentId = buildIntentId(input);

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status: "OPERATOR_INTENT_DRAFT_READY",
    mode: "AUDITED_OPERATOR_INTENT_DRAFT_ONLY",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,
    intent_id: intentId,
    intent_status: "DRAFT_NOT_SUBMITTED",
    operator_confirmation: "REQUIRED_BUT_NOT_CAPTURED",
    real_run: "FORBIDDEN",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.3",
      status: "OPERATOR_CONFIRMATION_REQUIRED",
      operator_surface: "VALIDATED",
      execution_policy: "READ_ONLY_CONFIRMATION_SURFACE",
    },

    intent_draft: {
      type: "controlled_operator_intent",
      target_capability: "command_orchestrator",
      target_mode: "dry_run_only",
      proposed_action: "prepare_controlled_worker_dry_run_followup",
      requires_operator_confirmation: true,
      requires_dedicated_feature_gate: true,
      requires_audit_trail: true,
      requires_idempotency_key: true,
      requires_workspace_scope: true,
      requires_rollback_or_cancel_path: true,
      execution_allowed_now: false,
      submission_allowed_now: false,
    },

    audit_requirements: [
      "Operator identity must be known before submission",
      "Operator confirmation must be explicit",
      "Intent must be persisted before any mutation",
      "Idempotency key must be deterministic",
      "Workspace scope must be preserved",
      "Feature gate must be dedicated",
      "Rollback or safe cancel path must exist",
      "No secret exposure is allowed",
    ],

    guardrails: {
      client_fetch: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      airtable_mutation: "DISABLED",
      incident_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_mutation: "DISABLED",
      secret_exposure: "DISABLED",
      real_run: "FORBIDDEN",
      dry_run_only: true,
      operator_confirmation_required: true,
      intent_persistence: "DISABLED",
      intent_submission: "DISABLED",
    },

    next_step:
      "V5.5 may introduce an audited intent persistence draft, still without direct real execution.",
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const incidentId = normalizeIncidentId(params.id);

  const workspaceId = normalizeWorkspaceId(
    request.nextUrl.searchParams.get("workspace_id") ||
      request.nextUrl.searchParams.get("workspaceId")
  );

  const payload = buildAuditedOperatorIntentDraftPayload({
    incidentId,
    workspaceId,
  });

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
