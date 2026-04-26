import fs from "node:fs";

const routePath = "src/app/api/incidents/[id]/dry-run/route.ts";
const markerV41 = "Incident Detail V4.1-server-route-skeleton";
const markerV42 = "Incident Detail V4.2-server-route-validation-layer";

if (!fs.existsSync(routePath)) {
  console.error(`Route introuvable : ${routePath}`);
  process.exit(1);
}

const existing = fs.readFileSync(routePath, "utf8");

if (existing.includes(markerV42)) {
  console.log("V4.2 déjà présent. Aucune modification.");
  process.exit(0);
}

if (!existing.includes(markerV41)) {
  console.error("Marker V4.1 introuvable. Patch arrêté pour préserver la baseline.");
  process.exit(1);
}

const routeSource = `import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

/**
 * ${markerV41}
 * ${markerV42}
 *
 * V4.2 adds server-side validation only.
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
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id?: string }> }
) {
  const params = await context.params;
  const body = await readJsonBody(request);
  const url = new URL(request.url);

  const incidentId = asString(params.id);

  const workspaceId =
    asString(body.workspace_id) ||
    asString(body.workspaceId) ||
    asString(url.searchParams.get("workspace_id")) ||
    asString(url.searchParams.get("workspaceId")) ||
    asString(request.headers.get("x-workspace-id")) ||
    asString(request.headers.get("x-bosai-workspace"));

  const requestedDryRun = body.dry_run;

  if (requestedDryRun === false) {
    return jsonResponse(
      {
        ok: false,
        dry_run: true,
        status: "REAL_RUN_FORBIDDEN",
        code: "REAL_RUN_FORBIDDEN",
        message: "dry_run: false is forbidden from this route.",
        version: "Incident Detail V4.2",
        source: "dashboard_incident_detail_v4_2_validation_layer",
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
        message: "Incident id is required for dry run validation.",
        version: "Incident Detail V4.2",
        source: "dashboard_incident_detail_v4_2_validation_layer",
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
        message: "Workspace id is required for dry run validation.",
        version: "Incident Detail V4.2",
        source: "dashboard_incident_detail_v4_2_validation_layer",
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

  return jsonResponse(
    {
      ok: true,
      dry_run: true,
      status: "VALIDATION_ONLY",
      readiness: "READY_FOR_DRY_RUN_VALIDATION",
      incident_id: incidentId,
      workspace_id: workspaceId,
      message: "Dry run route validation passed. Worker call is not implemented yet.",
      version: "Incident Detail V4.2",
      source: "dashboard_incident_detail_v4_2_validation_layer",
      validation: {
        incident_id: "OK",
        workspace_id: "OK",
        dry_run: "FORCED_TRUE",
        client_payload: "IGNORED_EXCEPT_SAFE_CONTEXT",
        worker_call: "DISABLED",
        secret_exposure: "DISABLED",
      },
      server_contract: {
        route: "POST /api/incidents/[id]/dry-run",
        mode: "VALIDATION_ONLY",
        next_step: "V4.3 will prepare the validated server payload without calling the worker.",
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

console.log("V4.2 validation layer appliquée avec succès.");
console.log(`Fichier modifié : ${routePath}`);
console.log("Aucun appel worker, aucun POST /run worker, aucune mutation.");
