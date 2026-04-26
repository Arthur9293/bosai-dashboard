import fs from "node:fs";

const routePath = "src/app/api/incidents/[id]/dry-run/route.ts";

const markerV41 = "Incident Detail V4.1-server-route-skeleton";
const markerV42 = "Incident Detail V4.2-server-route-validation-layer";
const markerV43 = "Incident Detail V4.3-validated-server-payload-builder";
const markerV44 = "Incident Detail V4.4-worker-request-envelope-preview";

if (!fs.existsSync(routePath)) {
  console.error(`Route introuvable : ${routePath}`);
  process.exit(1);
}

const existing = fs.readFileSync(routePath, "utf8");

if (existing.includes(markerV44)) {
  console.log("V4.4 déjà présent. Aucune modification.");
  process.exit(0);
}

if (
  !existing.includes(markerV41) ||
  !existing.includes(markerV42) ||
  !existing.includes(markerV43)
) {
  console.error("Markers V4.1 / V4.2 / V4.3 introuvables. Patch arrêté pour préserver la baseline.");
  process.exit(1);
}

const routeSource = `import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type ValidatedDryRunPayload = {
  capability: "command_orchestrator";
  workspace_id: string;
  incident_id: string;
  command_id: string | null;
  run_id: string | null;
  flow_id: string | null;
  root_event_id: string | null;
  dry_run: true;
  source: "dashboard_incident_detail_v4_4";
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

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeIdentifier(value: unknown): string | null {
  const raw = asString(value);

  if (!raw) {
    return null;
  }

  if (raw.length > 200) {
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
  ];

  return dangerousKeys.filter((key) =>
    Object.prototype.hasOwnProperty.call(body, key)
  );
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
    source: "dashboard_incident_detail_v4_4",
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

/**
 * ${markerV41}
 * ${markerV42}
 * ${markerV43}
 * ${markerV44}
 *
 * V4.4 builds a worker request envelope preview only.
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

  const requestedDryRun = body.dry_run;

  if (requestedDryRun === false) {
    return jsonResponse(
      {
        ok: false,
        dry_run: true,
        status: "REAL_RUN_FORBIDDEN",
        code: "REAL_RUN_FORBIDDEN",
        message: "dry_run: false is forbidden from this route.",
        version: "Incident Detail V4.4",
        source: "dashboard_incident_detail_v4_4_envelope_preview",
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
        message: "Incident id is required for worker envelope preparation.",
        version: "Incident Detail V4.4",
        source: "dashboard_incident_detail_v4_4_envelope_preview",
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
        message: "Workspace id is required for worker envelope preparation.",
        version: "Incident Detail V4.4",
        source: "dashboard_incident_detail_v4_4_envelope_preview",
        validation: {
          incident_id: "OK",
          workspace_id: "MISSING",
          dry_run: "FORCED_TRUE",
          worker_call: "DISABLED",
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

  const workerRequestEnvelope = buildWorkerRequestEnvelopePreview(validatedPayload);

  const payloadReadiness =
    commandId || flowId
      ? "PAYLOAD_READY_WITH_EXECUTION_CONTEXT"
      : "PAYLOAD_READY_INCIDENT_CONTEXT_ONLY";

  return jsonResponse(
    {
      ok: true,
      dry_run: true,
      status: "ENVELOPE_READY",
      readiness: payloadReadiness,
      incident_id: incidentId,
      workspace_id: workspaceId,
      message:
        "Worker request envelope prepared in preview mode. Worker call is not implemented yet.",
      version: "Incident Detail V4.4",
      source: "dashboard_incident_detail_v4_4_envelope_preview",
      validated_payload: validatedPayload,
      worker_request_envelope: workerRequestEnvelope,
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
        worker_envelope: "PREVIEW_ONLY",
        worker_call: "DISABLED",
        secret_exposure: "DISABLED",
      },
      server_contract: {
        route: "POST /api/incidents/[id]/dry-run",
        mode: "ENVELOPE_ONLY",
        next_step:
          "V4.5 will add server-side worker configuration checks without calling the worker.",
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
        dry_run_forced: true,
        dry_run_false_refused: true,
      },
    },
    200
  );
}
`;

fs.writeFileSync(routePath, routeSource, "utf8");

console.log("V4.4 worker request envelope preview appliqué avec succès.");
console.log(`Fichier modifié : ${routePath}`);
console.log("Aucun appel worker, aucun POST /run worker, aucune mutation.");
