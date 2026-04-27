import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteParams = {
  id: string;
};

type RouteContext = {
  params: Promise<RouteParams> | RouteParams;
};

const VERSION = "Incident Detail V5.3";
const SOURCE = "dashboard_incident_detail_v5_3_operator_confirmation_surface";

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

function buildOperatorConfirmationPayload(input: {
  incidentId: string;
  workspaceId: string;
}) {
  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status: "OPERATOR_CONFIRMATION_REQUIRED",
    mode: "OPERATOR_CONFIRMATION_SURFACE_ONLY",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,
    operator_confirmation: "REQUIRED",
    real_run: "FORBIDDEN",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.2.1",
      status: "STRICT_RUNREQUEST_VALIDATED",
      worker_dry_run_call: "VALIDATED",
      run_request_contract: "capability + idempotency_key + input",
    },

    operator_checklist: {
      dry_run_only: true,
      real_run_forbidden: true,
      secret_not_exposed: true,
      worker_route_validated: true,
      workspace_validated: true,
      capability_validated: true,
      human_confirmation_required: true,
    },

    future_execution_requirements: [
      "Explicit operator confirmation",
      "Dedicated feature gate for any broader execution",
      "Audit trail before mutation",
      "Idempotency preserved",
      "Workspace scope preserved",
      "No secret exposure",
      "Rollback or safe cancel path defined",
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
    },

    next_step:
      "V5.4 may add an audited operator intent draft, still without direct real execution.",
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    request.nextUrl.searchParams.get("workspace_id") ||
      request.nextUrl.searchParams.get("workspaceId")
  );

  const payload = buildOperatorConfirmationPayload({
    incidentId,
    workspaceId,
  });

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
