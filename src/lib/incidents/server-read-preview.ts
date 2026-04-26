type ConfigStatus = "CONFIGURED" | "MISSING";

type ConfigProbe = {
  key: string | null;
  status: ConfigStatus;
};

function readFirstConfiguredEnv(keys: string[]): ConfigProbe {
  for (const key of keys) {
    const value = process.env[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return {
        key,
        status: "CONFIGURED",
      };
    }
  }

  return {
    key: null,
    status: "MISSING",
  };
}

function normalizeWorkspaceId(value: string | null | undefined): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : "production";
}

function normalizeIncidentId(value: string | null | undefined): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : "unknown";
}

export function buildIncidentServerReadPreview(input: {
  incidentId: string;
  workspaceId?: string | null;
}) {
  const incidentId = normalizeIncidentId(input.incidentId);
  const workspaceId = normalizeWorkspaceId(input.workspaceId);

  const workerBaseUrl = readFirstConfiguredEnv([
    "BOSAI_WORKER_BASE_URL",
    "NEXT_PUBLIC_BOSAI_WORKER_BASE_URL",
  ]);

  const schedulerSecret = readFirstConfiguredEnv([
    "RUN_SCHEDULER_SECRET",
    "RUN_SHARED_SECRET",
    "BOSAI_RUN_SECRET",
  ]);

  const isReady =
    workerBaseUrl.status === "CONFIGURED" &&
    schedulerSecret.status === "CONFIGURED";

  return {
    ok: true,
    version: "Incident Detail V5.0",
    source: "dashboard_incident_detail_v5_0_controlled_server_read_preview",
    status: isReady ? "SERVER_READ_READY" : "SERVER_READ_PARTIAL",
    mode: "SERVER_READ_PREVIEW_ONLY",
    readiness: isReady
      ? "CONTROLLED_SERVER_READ_READY"
      : "CONTROLLED_SERVER_READ_PARTIAL",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,

    server_read: {
      route: "GET /api/incidents/[id]/server-read-preview",
      page: "/incidents/[id]/server-read-preview",
      worker_base_url: workerBaseUrl.status,
      worker_base_url_env: workerBaseUrl.key,
      scheduler_secret: schedulerSecret.status,
      selected_secret_env: schedulerSecret.key,
      secret_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
      worker_call: "DISABLED",
      post_run: "DISABLED",
      execution: "DISABLED",
      mutation: "DISABLED",
    },

    validated_payload_preview: {
      capability: "command_orchestrator",
      workspace_id: workspaceId,
      incident_id: incidentId,
      command_id: null,
      run_id: null,
      flow_id: null,
      root_event_id: null,
      dry_run: true,
      source: "dashboard_incident_detail_v5_0",
    },

    guardrails: {
      client_fetch: "DISABLED",
      post_run: "DISABLED",
      worker_call: "DISABLED",
      airtable_mutation: "DISABLED",
      incident_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_mutation: "DISABLED",
      retry: "DISABLED",
      escalation: "DISABLED",
      secret_exposure: "DISABLED",
      dry_run_forced: true,
      dry_run_false_refused: true,
      real_run_forbidden: true,
    },

    next_step:
      "V5.1 may connect a controlled server-side worker dry-run call behind explicit feature gates, while preserving dry_run:true.",
  };
}
