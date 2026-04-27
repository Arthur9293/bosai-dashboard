type FeatureGateState =
  | "FEATURE_GATE_DISABLED"
  | "FEATURE_GATE_ENABLED"
  | "FEATURE_GATE_MISSING";

type AdapterStatus =
  | "ADAPTER_BLOCKED_BY_FEATURE_GATE"
  | "ADAPTER_PREPARED_NO_WORKER_CALL"
  | "REAL_RUN_FORBIDDEN";

type ConfigStatus = "CONFIGURED" | "MISSING";

type EnvProbe = {
  key: string | null;
  status: ConfigStatus;
};

const FEATURE_GATE_ENV = "BOSAI_DRY_RUN_WORKER_ADAPTER_ENABLED";

function normalizeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWorkspaceId(value: string | null | undefined): string {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : "production";
}

function normalizeIncidentId(value: string | null | undefined): string {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : "unknown";
}

function readFirstConfiguredEnv(keys: string[]): EnvProbe {
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

function resolveFeatureGate(): {
  env: string;
  raw_value: "SERVER_SIDE_ONLY_NOT_EXPOSED" | "MISSING";
  enabled: boolean;
  state: FeatureGateState;
} {
  const raw = process.env[FEATURE_GATE_ENV];

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      env: FEATURE_GATE_ENV,
      raw_value: "MISSING",
      enabled: false,
      state: "FEATURE_GATE_MISSING",
    };
  }

  const normalized = raw.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return {
      env: FEATURE_GATE_ENV,
      raw_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
      enabled: true,
      state: "FEATURE_GATE_ENABLED",
    };
  }

  return {
    env: FEATURE_GATE_ENV,
    raw_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    enabled: false,
    state: "FEATURE_GATE_DISABLED",
  };
}

function isDryRunFalseAttempt(value: string | null | undefined): boolean {
  const normalized = normalizeText(value).toLowerCase();

  return ["false", "0", "no", "off"].includes(normalized);
}

export function buildWorkerDryRunAdapterPreview(input: {
  incidentId: string;
  workspaceId?: string | null;
  requestedDryRun?: string | null;
}) {
  const incidentId = normalizeIncidentId(input.incidentId);
  const workspaceId = normalizeWorkspaceId(input.workspaceId);
  const featureGate = resolveFeatureGate();
  const requestedDryRunFalse = isDryRunFalseAttempt(input.requestedDryRun);

  const workerBaseUrl = readFirstConfiguredEnv([
    "BOSAI_WORKER_BASE_URL",
    "NEXT_PUBLIC_BOSAI_WORKER_BASE_URL",
  ]);

  const schedulerSecret = readFirstConfiguredEnv([
    "RUN_SCHEDULER_SECRET",
    "RUN_SHARED_SECRET",
    "BOSAI_RUN_SECRET",
  ]);

  const status: AdapterStatus = requestedDryRunFalse
    ? "REAL_RUN_FORBIDDEN"
    : featureGate.enabled
      ? "ADAPTER_PREPARED_NO_WORKER_CALL"
      : "ADAPTER_BLOCKED_BY_FEATURE_GATE";

  const readiness = requestedDryRunFalse
    ? "DRY_RUN_FALSE_REFUSED"
    : featureGate.enabled
      ? "WORKER_DRY_RUN_ADAPTER_PREPARED"
      : "WORKER_DRY_RUN_ADAPTER_BLOCKED";

  return {
    ok: !requestedDryRunFalse,
    version: "Incident Detail V5.1",
    source: "dashboard_incident_detail_v5_1_feature_gated_worker_dry_run_adapter_preview",
    status,
    readiness,
    mode: "ADAPTER_PREVIEW_ONLY",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,

    feature_gate: {
      feature_gate_env: FEATURE_GATE_ENV,
      feature_gate_enabled: featureGate.enabled,
      feature_gate_state: featureGate.state,
      raw_value: featureGate.raw_value,
      behavior:
        "When disabled, the adapter returns a blocked preview. When enabled, V5.1 still does not call the worker.",
    },

    server_config: {
      worker_base_url: workerBaseUrl.status,
      worker_base_url_env: workerBaseUrl.key,
      scheduler_secret: schedulerSecret.status,
      selected_secret_env: schedulerSecret.key,
      secret_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    },

    worker_request_preview: {
      method: "POST",
      endpoint: "/run",
      worker_call: "DISABLED",
      post_run: "DISABLED",
      execution: "DISABLED",
      dry_run: true,
      body: {
        capability: "command_orchestrator",
        workspace_id: workspaceId,
        incident_id: incidentId,
        command_id: null,
        run_id: null,
        flow_id: null,
        root_event_id: null,
        dry_run: true,
        source: "dashboard_incident_detail_v5_1",
      },
      headers: {
        content_type: "application/json",
        scheduler_secret: "SERVER_SIDE_ONLY_NOT_EXPOSED",
      },
    },

    validation: {
      incident_id: incidentId === "unknown" ? "MISSING" : "OK",
      workspace_id: workspaceId ? "OK" : "MISSING",
      dry_run: "FORCED_TRUE",
      requested_dry_run_false: requestedDryRunFalse,
      dry_run_false_refused: true,
      real_run_forbidden: true,
      feature_gate: featureGate.enabled ? "ENABLED_NO_WORKER_CALL" : "DISABLED_OR_MISSING",
      worker_call: "DISABLED",
      post_run: "DISABLED",
      secret_exposure: "DISABLED",
      airtable_mutation: "DISABLED",
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
      "V5.2 may introduce a controlled server-side worker dry-run call, still behind explicit feature gates and dry_run:true only.",
  };
}
