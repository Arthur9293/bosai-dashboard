import fs from "node:fs";
import path from "node:path";

const routeDir = "src/app/api/incidents/[id]/dry-run";
const routePath = path.join(routeDir, "route.ts");
const marker = "Incident Detail V4.1-server-route-skeleton";

fs.mkdirSync(routeDir, { recursive: true });

if (fs.existsSync(routePath)) {
  const existing = fs.readFileSync(routePath, "utf8");

  if (existing.includes(marker)) {
    console.log("V4.1 route skeleton déjà présent. Aucune modification.");
    process.exit(0);
  }

  console.error("Une route dry-run existe déjà mais sans marker V4.1.");
  console.error("Patch arrêté pour éviter d’écraser une route existante.");
  process.exit(1);
}

const routeSource = `import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ${marker}
 *
 * V4.1 creates the server-only dry run route skeleton.
 *
 * Safety guarantees:
 * - no worker call
 * - no POST /run
 * - no Airtable mutation
 * - no incident mutation
 * - no command mutation
 * - no run mutation
 * - no retry
 * - no escalation
 * - no secret exposure
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const incidentId = typeof params.id === "string" ? params.id : "";

  return NextResponse.json(
    {
      ok: false,
      dry_run: true,
      status: "ROUTE_SKELETON_ONLY",
      incident_id: incidentId || null,
      message: "Dry run route exists but worker call is not implemented yet.",
      version: "Incident Detail V4.1",
      source: "dashboard_incident_detail_v4_1_route_skeleton",
      guardrails: {
        worker_call: "DISABLED",
        post_run: "DISABLED",
        airtable_mutation: "DISABLED",
        incident_mutation: "DISABLED",
        retry: "DISABLED",
        escalation: "DISABLED",
        secret_exposure: "DISABLED",
        dry_run_forced: true
      },
      next_step: "V4.2 will add server-side validation without calling the worker."
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
`;

fs.writeFileSync(routePath, routeSource, "utf8");

console.log("V4.1 server route skeleton créé avec succès.");
console.log(`Fichier créé : ${routePath}`);
console.log("Aucun appel worker, aucun POST /run, aucune mutation.");
