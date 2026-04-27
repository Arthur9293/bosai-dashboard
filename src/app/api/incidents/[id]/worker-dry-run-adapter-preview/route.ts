import { buildWorkerDryRunAdapterPreview } from "@/lib/incidents/worker-dry-run-adapter-preview";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(request: Request, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const url = new URL(request.url);

  const workspaceId =
    url.searchParams.get("workspace_id") ||
    url.searchParams.get("workspaceId") ||
    "production";

  const requestedDryRun = url.searchParams.get("dry_run");

  const preview = buildWorkerDryRunAdapterPreview({
    incidentId: params.id,
    workspaceId,
    requestedDryRun,
  });

  return Response.json(preview, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
