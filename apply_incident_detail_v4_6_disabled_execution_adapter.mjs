import fs from "node:fs";

const routePath = "src/app/api/incidents/[id]/dry-run/route.ts";

const markerV41 = "Incident Detail V4.1-server-route-skeleton";
const markerV42 = "Incident Detail V4.2-server-route-validation-layer";
const markerV43 = "Incident Detail V4.3-validated-server-payload-builder";
const markerV44 = "Incident Detail V4.4-worker-request-envelope-preview";
const markerV45 = "Incident Detail V4.5-worker-config-readiness-check";
const markerV46 = "Incident Detail V4.6-disabled-execution-adapter";

if (!fs.existsSync(routePath)) {
  console.error("Route introuvable:", routePath);
  process.exit(1);
}

const existing = fs.readFileSync(routePath, "utf8");

if (existing.includes(markerV46)) {
  console.log("V4.6 déjà présent. Aucune modification.");
  process.exit(0);
}

if (
  !existing.includes(markerV41) ||
  !existing.includes(markerV42) ||
  !existing.includes(markerV43) ||
  !existing.includes(markerV44) ||
  !existing.includes(markerV45)
) {
  console.error("Markers V4.1 / V4.2 / V4.3 / V4.4 / V4.5 introuvables. Patch arrêté.");
  process.exit(1);
}

const routeSource = `import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type ConfigState = "CONFIGURED" | "MISSING";

type WorkerConfigReadiness =
  | "WORKER_CONFIG_READY"
  | "WORKER_CONFIG_PARTIAL"
  | "WORKER_CONFIG_MISSING";

type ExecutionAdapterStatus =
  | "EXECUTION_ADAPTER_DISABLED"
  | "EXECUTION_ADAPTER_BLOCKED"
  | "EXECUTION_ADAPTER_PREPARED";

type ValidatedDryRunPayload = {
  capability: "command_orchestrator";
  workspace_id: string;
  incident_id: string;
  command_id: string | null;
  run_id: string | null;
  flow_id: string | null;
  root_event_id: string | null;
  dry_run: true;
  source: "dashboard_incident_detail_v4_6";
};

type WorkerRequestEnvelopePreview = {
  target: "BOSAI_WORKER_RUN_ENDPOINT";
  method: "POST";
  endpoint_env: "BOSAI_WORKER_BASE_URL";
  target_path: "/run";
  auth: "SERVER_SECRET_REQUIRED";
  auth_header: "x-scheduler-secret";
  auth_value: "SERVER_SIDE_ONLY_NOT_EXPOSED";
  payload: ValidatedDryRunPayload;
  timeout_ms: 10000;
  mode: "ENVELOPE_ONLY";
  worker_call: "DISABLED";
  post_run: "DISABLED";
  secret_exposure: "DISABLED";
};

type DisabledExecutionAdapter = {
  status: ExecutionAdapterStatus;
  mode: "DISABLED_ADAPTER_ONLY";
  feature_gate: "DISABLED";
  feature_gate_env: "BOSAI_DRY_RUN_EXECUTION_ENABLED";
  worker_config_required: true;
  worker_config_status: WorkerConfigReadiness;
  worker_call: "DISABLED";
  post_run: "DISABLED";
  would_call_worker: false;
  would_use_endpoint: "/run";
  would_use_method: "POST";
  would_use_auth_header: "x-scheduler-secret";
  dry_run_required: true;
  dry_run_forced: true;
  real_run_forbidden: true;
  airtable_mutation: "DISABLED";
  incident_mutation: "DISABLED";
  command_mutation: "DISABLED";
  run_mutation: "DISABLED";
  retry: "DISABLED";
  escalation: "DISABLED";
  secret_exposure: "DISABLED";
  reason: string;
  next_step: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeIdentifier(value: unknown): string | null {
  const raw = asString(value);

  if (!raw || raw.length > 200) {
    return null;
  }

  if (!/^[a-zA-Z0-9_.:-]+$/.test(raw)) {
    return null;
  }

  return raw;
}

async function readJsonBody(request: NextRequest): Promise<JsonRecord> {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return {};
  }

  try {
    const parsed = await request.json();

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as JsonRecord;
    }

    return {};
  } catch {
    return {};
  }
}

function jsonResponse(payload: JsonRecord, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function firstSafeIdentifier(...values: unknown[]): string | null {
  for (const value of values) {
    const safe = safeIdentifier(value);

    if (safe) {
      return safe;
    }
  }

  return null;
}

function collectIgnoredDangerousFields(body: JsonRecord): string[] {
  const dangerousKeys = [
    "url",
    "endpoint",
    "method",
    "headers",
    "authorization",
    "secret",
    "scheduler_secret",
    "run_shared_secret",
    "x_scheduler_secret",
    "x-run-signature",
    "real_run",
    "execute",
    "mutation",
    "airtable_mutation",
    "incident_mutation",
    "worker_call",
    "post_run",
    "force",
    "force_run",
    "dry_run_false",
  ];

  return dangerousKeys.filter((key) =>
    Object.prototype.hasOwnProperty.call(body, key)
  );
}

function configState(value: string | undefined): ConfigState {
  return typeof value === "string" && value.trim().length > 0
    ? "CONFIGURED"
    : "MISSING";
}

function resolveWorkerConfig() {
  const baseUrlState = configState(process.env.BOSAI_WORKER_BASE_URL);
  const runSchedulerSecretState = configState(process.env.RUN_SCHEDULER_SECRET);
  const schedulerSecretState = configState(process.env.SCHEDULER_SECRET);

  const hasSchedulerSecret =
    runSchedulerSecretState === "CONFIGURED" ||
    schedulerSecretState === "CONFIGURED";

  const readiness: WorkerConfigReadiness =
    baseUrlState === "CONFIGURED" && hasSchedulerSecret
      ? "WORKER_CONFIG_READY"
      : baseUrlState === "CONFIGURED" || hasSchedulerSecret
        ? "WORKER_CONFIG_PARTIAL"
        : "WORKER_CONFIG_MISSING";

  return {
    readiness,
    base_url: baseUrlState,
    run_endpoint:
      baseUrlState === "CONFIGURED" ? "DERIVED_SERVER_SIDE" : "MISSING",
    scheduler_secret: hasSchedulerSecret ? "CONFIGURED" : "MISSING",
    selected_secret_env:
      runSchedulerSecretState === "CONFIGURED"
        ? "RUN_SCHEDULER_SECRET"
        : schedulerSecretState === "CONFIGURED"
          ? "SCHEDULER_SECRET"
          : "MISSING",
    secret_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    secret_exposure: "DISABLED",
    worker_call: "DISABLED",
    post_run: "DISABLED",
  };
}

function buildValidatedPayload(input: {
  workspaceId: string;
  incidentId: string;
  commandId: string | null;
  runId: string | null;
  flowId: string | null;
  rootEventId: string | null;
}): ValidatedDryRunPayload {
  return {
    capability: "command_orchestrator",
    workspace_id: input.workspaceId,
    incident_id: input.incidentId,
    command_id: input.commandId,
    run_id: input.runId,
    flow_id: input.flowId,
    root_event_id: input.rootEventId,
    dry_run: true,
    source: "dashboard_incident_detail_v4_6",
  };
}

function buildWorkerRequestEnvelopePreview(
  payload: ValidatedDryRunPayload
): WorkerRequestEnvelopePreview {
  return {
    target: "BOSAI_WORKER_RUN_ENDPOINT",
    method: "POST",
    endpoint_env: "BOSAI_WORKER_BASE_URL",
    target_path: "/run",
    auth: "SERVER_SECRET_REQUIRED",
    auth_header: "x-scheduler-secret",
    auth_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    payload,
    timeout_ms: 10000,
    mode: "ENVELOPE_ONLY",
    worker_call: "DISABLED",
    post_run: "DISABLED",
    secret_exposure: "DISABLED",
  };
}

function buildDisabledExecutionAdapter(input: {
  workerConfigStatus: WorkerConfigReadiness;
}): DisabledExecutionAdapter {
  const status: ExecutionAdapterStatus =
    input.workerConfigStatus === "WORKER_CONFIG_READY"
      ? "EXECUTION_ADAPTER_PREPARED"
      : "EXECUTION_ADAPTER_BLOCKED";

  return {
    status,
    mode: "DISABLED_ADAPTER_ONLY",
    feature_gate: "DISABLED",
    feature_gate_env: "BOSAI_DRY_RUN_EXECUTION_ENABLED",
    worker_config_required: true,
    worker_config_status: input.workerConfigStatus,
    worker_call: "DISABLED",
    post_run: "DISABLED",
    would_call_worker: false,
    would_use_endpoint: "/run",
    would_use_method: "POST",
    would_use_auth_header: "x-scheduler-secret",
    dry_run_required: true,
    dry_run_forced: true,
    real_run_forbidden: true,
    airtable_mutation: "DISABLED",
    incident_mutation: "DISABLED",
    command_mutation: "DISABLED",
    run_mutation: "DISABLED",
    retry: "DISABLED",
    escalation: "DISABLED",
    secret_exposure: "DISABLED",
    reason:
      status === "EXECUTION_ADAPTER_PREPARED"
        ? "Execution adapter is structurally prepared but disabled by feature gate."
        : "Execution adapter is blocked because worker config is not ready.",
    next_step:
      "V4.7 may add a dry-run adapter contract test, still without enabling real worker execution.",
  };
}

/**
 * ${markerV41}
 * ${markerV42}
 * ${markerV43}
 * ${markerV44}
 * ${markerV45}
 * ${markerV46}
 *
 * V4.6 adds a disabled execution adapter.
 *
 * Safety guarantees:
 * - no worker call
 * - no POST /run to worker
 * - no Airtable mutation
 * - no incident mutation
 * - no command mutation
 * - no run mutation
 * - no retry
 * - no escalation
 * - no secret exposure
 * - dry_run is forced to true
 * - dry_run false is refused
 * - dangerous client fields are ignored
 * - worker envelope is preview-only
 * - execution adapter is disabled by feature gate
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id?: string }> }
) {
  const params = await context.params;
  const body = await readJsonBody(request);
  const url = new URL(request.url);

  const incidentId = safeIdentifier(params.id);

  const workspaceId = firstSafeIdentifier(
    body.workspace_id,
    body.workspaceId,
    url.searchParams.get("workspace_id"),
    url.searchParams.get("workspaceId"),
    request.headers.get("x-workspace-id"),
    request.headers.get("x-bosai-workspace")
  );

  if (body.dry_run === false) {
    return jsonResponse(
      {
        ok: false,
        dry_run: true,
        status: "REAL_RUN_FORBIDDEN",
        code: "REAL_RUN_FORBIDDEN",
        message: "dry_run: false is forbidden from this route.",
        version: "Incident Detail V4.6",
        source: "dashboard_incident_detail_v4_6_disabled_execution_adapter",
        execution_adapter: {
          status: "EXECUTION_ADAPTER_DISABLED",
          mode: "DISABLED_ADAPTER_ONLY",
          worker_call: "DISABLED",
          post_run: "DISABLED",
          real_run_forbidden: true,
        },
        guardrails: {
          worker_call: "DISABLED",
          post_run: "DISABLED",
          airtable_mutation: "DISABLED",
          incident_mutation: "DISABLED",
          retry: "DISABLED",
          escalation: "DISABLED",
          secret_exposure: "DISABLED",
          dry_run_forced: true,
          dry_run_false_refused: true,
        },
      },
      400
    );
  }

  if (!incidentId) {
    return jsonResponse(
      {
        ok: false,
        dry_run: true,
        status: "BLOCKED_MISSING_INCIDENT",
        code: "INCIDENT_REQUIRED",
        incident_id: null,
        message: "Incident id is required for disabled execution adapter.",
        version: "Incident Detail V4.6",
        source: "dashboard_incident_detail_v4_6_disabled_execution_adapter",
        execution_adapter: {
          status: "EXECUTION_ADAPTER_BLOCKED",
          mode: "DISABLED_ADAPTER_ONLY",
          worker_call: "DISABLED",
          post_run: "DISABLED",
        },
        guardrails: {
          worker_call: "DISABLED",
          post_run: "DISABLED",
          airtable_mutation: "DISABLED",
          incident_mutation: "DISABLED",
          retry: "DISABLED",
          escalation: "DISABLED",
          secret_exposure: "DISABLED",
          dry_run_forced: true,
        },
      },
      400
    );
  }

  if (!workspaceId) {
    return jsonResponse(
      {
        ok: false,
        dry_run: true,
        status: "BLOCKED_MISSING_WORKSPACE",
        code: "WORKSPACE_REQUIRED",
        incident_id: incidentId,
        workspace_id: null,
        message: "Workspace id is required for disabled execution adapter.",
        version: "Incident Detail V4.6",
        source: "dashboard_incident_detail_v4_6_disabled_execution_adapter",
        validation: {
          incident_id: "OK",
          workspace_id: "MISSING",
          dry_run: "FORCED_TRUE",
          worker_call: "DISABLED",
        },
        execution_adapter: {
          status: "EXECUTION_ADAPTER_BLOCKED",
          mode: "DISABLED_ADAPTER_ONLY",
          worker_call: "DISABLED",
          post_run: "DISABLED",
        },
        guardrails: {
          worker_call: "DISABLED",
          post_run: "DISABLED",
          airtable_mutation: "DISABLED",
          incident_mutation: "DISABLED",
          retry: "DISABLED",
          escalation: "DISABLED",
          secret_exposure: "DISABLED",
          dry_run_forced: true,
        },
      },
      400
    );
  }

  const commandId = firstSafeIdentifier(
    body.command_id,
    body.commandId,
    url.searchParams.get("command_id"),
    url.searchParams.get("commandId")
  );

  const runId = firstSafeIdentifier(
    body.run_id,
    body.runId,
    url.searchParams.get("run_id"),
    url.searchParams.get("runId")
  );

  const flowId = firstSafeIdentifier(
    body.flow_id,
    body.flowId,
    url.searchParams.get("flow_id"),
    url.searchParams.get("flowId")
  );

  const rootEventId = firstSafeIdentifier(
    body.root_event_id,
    body.rootEventId,
    url.searchParams.get("root_event_id"),
    url.searchParams.get("rootEventId")
  );

  const ignoredDangerousFields = collectIgnoredDangerousFields(body);

  const validatedPayload = buildValidatedPayload({
    workspaceId,
    incidentId,
    commandId,
    runId,
    flowId,
    rootEventId,
  });

  const workerConfig = resolveWorkerConfig();
  const workerRequestEnvelope = buildWorkerRequestEnvelopePreview(validatedPayload);
  const executionAdapter = buildDisabledExecutionAdapter({
    workerConfigStatus: workerConfig.readiness,
  });

  const payloadReadiness =
    commandId || flowId
      ? "PAYLOAD_READY_WITH_EXECUTION_CONTEXT"
      : "PAYLOAD_READY_INCIDENT_CONTEXT_ONLY";

  return jsonResponse(
    {
      ok: true,
      dry_run: true,
      status: executionAdapter.status,
      readiness: payloadReadiness,
      incident_id: incidentId,
      workspace_id: workspaceId,
      message:
        "Disabled execution adapter prepared. Worker call remains disabled.",
      version: "Incident Detail V4.6",
      source: "dashboard_incident_detail_v4_6_disabled_execution_adapter",
      validated_payload: validatedPayload,
      worker_config: workerConfig,
      worker_request_envelope: workerRequestEnvelope,
      execution_adapter: executionAdapter,
      validation: {
        incident_id: "OK",
        workspace_id: "OK",
        command_id: commandId ? "OK" : "MISSING_OPTIONAL",
        run_id: runId ? "OK" : "MISSING_OPTIONAL",
        flow_id: flowId ? "OK" : "MISSING_OPTIONAL",
        root_event_id: rootEventId ? "OK" : "MISSING_OPTIONAL",
        dry_run: "FORCED_TRUE",
        capability: "FORCED_COMMAND_ORCHESTRATOR",
        client_payload: "IGNORED_EXCEPT_SAFE_CONTEXT",
        dangerous_fields_ignored: ignoredDangerousFields,
        worker_config: workerConfig.readiness,
        worker_envelope: "PREVIEW_ONLY",
        execution_adapter: executionAdapter.status,
        feature_gate: "DISABLED",
        worker_call: "DISABLED",
        secret_exposure: "DISABLED",
      },
      server_contract: {
        route: "POST /api/incidents/[id]/dry-run",
        mode: "DISABLED_EXECUTION_ADAPTER_ONLY",
        feature_gate_env: "BOSAI_DRY_RUN_EXECUTION_ENABLED",
        next_step:
          "V4.7 may add adapter contract diagnostics before any worker execution is enabled.",
      },
      guardrails: {
        worker_call: "DISABLED",
        post_run: "DISABLED",
        airtable_mutation: "DISABLED",
        incident_mutation: "DISABLED",
        command_mutation: "DISABLED",
        run_mutation: "DISABLED",
        retry: "DISABLED",
        escalation: "DISABLED",
        secret_exposure: "DISABLED",
        feature_gate: "DISABLED",
        dry_run_forced: true,
        dry_run_false_refused: true,
        real_run_forbidden: true,
      },
    },
    200
  );
}
`;

fs.writeFileSync(routePath, routeSource, "utf8");

console.log("V4.6 disabled execution adapter appliqué avec succès.");
console.log("Fichier modifié :", routePath);
console.log("Aucun appel worker, aucun POST /run worker, aucune mutation, aucun secret exposé.");
