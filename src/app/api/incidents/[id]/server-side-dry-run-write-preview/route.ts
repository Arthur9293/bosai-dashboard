import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type DryRunWriteStatus =
  | "DRY_RUN_WRITE_BLOCKED_BY_FEATURE_GATE"
  | "SERVER_SIDE_DRY_RUN_WRITE_PREVIEW_READY";

const VERSION = "Incident Detail V5.7";
const SOURCE =
  "dashboard_incident_detail_v5_7_server_side_dry_run_write_preview";
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

  return ["true", "1", "yes", "on"].includes(raw.trim().toLowerCase());
}

function buildIntentId(workspaceId: string, incidentId: string): string {
  return `operator-intent:v5.4:${workspaceId}:${incidentId}`;
}

function buildPersistenceId(workspaceId: string, incidentId: string): string {
  return `intent-persistence:v5.5:${workspaceId}:${incidentId}`;
}

function buildWritePreviewId(workspaceId: string, incidentId: string): string {
  return `server-dryrun-write-preview:v5.7:${workspaceId}:${incidentId}`;
}

function buildIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.7:server-side-dry-run-write-preview:${workspaceId}:${incidentId}`;
}

function buildFieldMapping(input: {
  incidentId: string;
  workspaceId: string;
  intentId: string;
  persistenceId: string;
  writePreviewId: string;
}) {
  return {
    Intent_ID: input.intentId,
    Persistence_ID: input.persistenceId,
    Write_Preview_ID: input.writePreviewId,
    Workspace_ID: input.workspaceId,
    Incident_ID: input.incidentId,
    Target_Capability: "command_orchestrator",
    Target_Mode: "dry_run_only",
    Proposed_Action: "prepare_controlled_worker_dry_run_followup",
    Status: "Draft",
    Operator_Confirmation: "Required",
    Execution_Allowed: false,
    Submission_Allowed: false,
    Persistence_Allowed: false,
    Real_Run: "Forbidden",
    Secret_Exposure: "Disabled",
    Source_Layer: VERSION,
  };
}

function buildPayload(input: {
  incidentId: string;
  workspaceId: string;
  featureGateEnabled: boolean;
}) {
  const intentId = buildIntentId(input.workspaceId, input.incidentId);
  const persistenceId = buildPersistenceId(input.workspaceId, input.incidentId);
  const writePreviewId = buildWritePreviewId(
    input.workspaceId,
    input.incidentId
  );
  const idempotencyKey = buildIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );

  const status: DryRunWriteStatus = input.featureGateEnabled
    ? "SERVER_SIDE_DRY_RUN_WRITE_PREVIEW_READY"
    : "DRY_RUN_WRITE_BLOCKED_BY_FEATURE_GATE";

  const writePreview = input.featureGateEnabled
    ? "READY_BUT_NOT_WRITTEN"
    : "BLOCKED_NOT_WRITTEN";

  const gateStatus = input.featureGateEnabled
    ? "ENABLED_DRY_RUN_PREVIEW_ONLY"
    : "BLOCKED";

  const fieldMapping = buildFieldMapping({
    incidentId: input.incidentId,
    workspaceId: input.workspaceId,
    intentId,
    persistenceId,
    writePreviewId,
  });

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status,
    mode: "SERVER_SIDE_DRY_RUN_WRITE_PREVIEW_ONLY",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,

    feature_gate_env: FEATURE_GATE_ENV,
    feature_gate_enabled: input.featureGateEnabled,

    write_preview: writePreview,
    write_preview_id: writePreviewId,
    intent_id: intentId,
    persistence_id: persistenceId,
    persistence_status: "NOT_PERSISTED",

    intent_submission: "DISABLED",
    intent_persistence: "DISABLED",
    airtable_write: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",
    operator_confirmation: "REQUIRED_BUT_NOT_CAPTURED",
    real_run: "FORBIDDEN",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    secret_exposure: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.6",
      status: "PERSISTENCE_BLOCKED_BY_FEATURE_GATE_OR_PREVIEW_READY",
      gated_persistence_preview: "VALIDATED",
      execution_policy: "READ_ONLY_GATED_PERSISTENCE_PREVIEW",
    },

    dry_run_write_gate: {
      feature_gate_env: FEATURE_GATE_ENV,
      feature_gate_enabled: input.featureGateEnabled,
      gate_status: gateStatus,
      write_allowed_now: false,
      dry_run_write_preview_only: true,
    },

    dry_run_write_contract: {
      target_storage: "future_audit_store_or_airtable_table",
      target_table: "Operator_Intents",
      target_record_status: "Draft",
      write_preview_id: writePreviewId,
      idempotency_key: idempotencyKey,
      deterministic: true,
      workspace_scope: input.workspaceId,
      incident_scope: input.incidentId,
      write_allowed_now: false,
      write_sent: false,
      submission_allowed_now: false,
      persistence_allowed_now: false,
    },

    airtable_request_preview: {
      method: "POST",
      target_table: "Operator_Intents",
      execution: "DRY_RUN_NOT_SENT",
      write_sent: false,
      mutation: "DISABLED",
      headers: {
        authorization: "SERVER_SIDE_ONLY_NOT_EXPOSED",
        content_type: "application/json",
      },
      body: {
        fields: fieldMapping,
      },
    },

    required_fields_check: {
      Intent_ID: "READY",
      Persistence_ID: "READY",
      Write_Preview_ID: "READY",
      Workspace_ID: "READY",
      Incident_ID: "READY",
      Target_Capability: "READY",
      Target_Mode: "READY",
      Proposed_Action: "READY",
      Status: "READY",
      Operator_Confirmation: "REQUIRED",
      Execution_Allowed: false,
      Submission_Allowed: false,
      Persistence_Allowed: false,
      Real_Run: "FORBIDDEN",
      Secret_Exposure: "DISABLED",
    },

    guardrails: {
      client_fetch: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      airtable_mutation: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      intent_persistence: "DISABLED",
      intent_submission: "DISABLED",
      incident_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_mutation: "DISABLED",
      secret_exposure: "DISABLED",
      real_run: "FORBIDDEN",
      dry_run_only: true,
      dry_run_write_preview_only: true,
      write_sent: false,
      operator_confirmation_required: true,
      feature_gate_required: true,
    },

    next_step:
      "V5.8 may introduce gated audited intent persistence, still without direct real execution.",
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
