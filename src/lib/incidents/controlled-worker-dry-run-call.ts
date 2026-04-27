type FeatureGateState =
  | "FEATURE_GATE_MISSING"
  | "FEATURE_GATE_DISABLED"
  | "FEATURE_GATE_ENABLED";

type ConfigStatus = "CONFIGURED" | "MISSING";

type ControlledWorkerDryRunStatus =
  | "WORKER_DRY_RUN_BLOCKED_BY_FEATURE_GATE"
  | "WORKER_DRY_RUN_CALLED"
  | "WORKER_DRY_RUN_CALL_FAILED"
  | "REAL_RUN_FORBIDDEN";

const VERSION = "Incident Detail V5.2.1";
const SOURCE = "dashboard_incident_detail_v5_2_1_controlled_worker_dry_run_call";
const WORKER_INPUT_SOURCE = "dashboard_incident_detail_v5_2";
const FEATURE_GATE_ENV = "BOSAI_DRY_RUN_WORKER_ADAPTER_ENABLED";
const WORKER_TIMEOUT_MS = 8000;
const WORKER_CAPABILITY = "command_orchestrator";

type WorkerRunInput = {
  workspace_id: string;
  incident_id: string;
  dry_run: true;
  source: typeof WORKER_INPUT_SOURCE;
  metadata: {
    origin: "incident_detail_controlled_worker_dry_run_call";
    real_run_forbidden: true;
    dashboard_version: typeof VERSION;
  };
  command_id?: string;
  run_id?: string;
  flow_id?: string;
  root_event_id?: string;
};

type WorkerRunRequestBody = {
  capability: typeof WORKER_CAPABILITY;
  idempotency_key: string;
  input: WorkerRunInput;
};

type BuildControlledWorkerDryRunInput = {
  incidentId: string;
  workspaceId?: string | null;
  requestedDryRun?: string | null;
  commandId?: string | null;
  runId?: string | null;
  flowId?: string | null;
  rootEventId?: string | null;
};

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

function normalizeOptionalId(value: string | null | undefined): string | null {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : null;
}

function isDryRunFalseAttempt(value: string | null | undefined): boolean {
  const normalized = normalizeText(value).toLowerCase();
  return ["false", "0", "no", "off"].includes(normalized);
}

function resolveFeatureGate(): {
  feature_gate_env: string;
  feature_gate_enabled: boolean;
  feature_gate_state: FeatureGateState;
  raw_value: "MISSING" | "SERVER_SIDE_ONLY_NOT_EXPOSED";
} {
  const raw = process.env[FEATURE_GATE_ENV];

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      feature_gate_env: FEATURE_GATE_ENV,
      feature_gate_enabled: false,
      feature_gate_state: "FEATURE_GATE_MISSING",
      raw_value: "MISSING",
    };
  }

  const normalized = raw.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return {
      feature_gate_env: FEATURE_GATE_ENV,
      feature_gate_enabled: true,
      feature_gate_state: "FEATURE_GATE_ENABLED",
      raw_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    };
  }

  return {
    feature_gate_env: FEATURE_GATE_ENV,
    feature_gate_enabled: false,
    feature_gate_state: "FEATURE_GATE_DISABLED",
    raw_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
  };
}

function readWorkerBaseUrl(): {
  key: string;
  status: ConfigStatus;
  value: string | null;
} {
  const key = "BOSAI_WORKER_BASE_URL";
  const value = process.env[key];

  if (typeof value === "string" && value.trim().length > 0) {
    return {
      key,
      status: "CONFIGURED",
      value: value.trim().replace(/\/+$/, ""),
    };
  }

  return {
    key,
    status: "MISSING",
    value: null,
  };
}

function readSchedulerSecret(): {
  key: string;
  status: ConfigStatus;
  value: string | null;
} {
  const key = "RUN_SCHEDULER_SECRET";
  const value = process.env[key];

  if (typeof value === "string" && value.trim().length > 0) {
    return {
      key,
      status: "CONFIGURED",
      value: value.trim(),
    };
  }

  return {
    key,
    status: "MISSING",
    value: null,
  };
}

function safeText(value: string, maxLength = 4000): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...[TRUNCATED]`;
}

function safeIdSegment(value: string): string {
  return normalizeText(value)
    .replace(/[^a-zA-Z0-9._:-]/g, "_")
    .slice(0, 160);
}

function buildIdempotencyKey(input: {
  incidentId: string;
  workspaceId: string;
}): string {
  return `dashboard:v5.2:dryrun:${safeIdSegment(input.workspaceId)}:${safeIdSegment(
    input.incidentId
  )}`;
}

function isSensitiveKey(key: string): boolean {
  const lowered = key.toLowerCase();

  return (
    lowered.includes("secret") ||
    lowered.includes("token") ||
    lowered.includes("password") ||
    lowered.includes("authorization") ||
    lowered.includes("api_key") ||
    lowered.includes("apikey") ||
    lowered.includes("signature") ||
    lowered.includes("credential")
  );
}

function sanitizePreviewValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[MAX_DEPTH_REACHED]";

  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return safeText(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizePreviewValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 80);

    for (const [key, entryValue] of entries) {
      if (isSensitiveKey(key)) {
        output[key] = "SERVER_SIDE_ONLY_REDACTED";
      } else {
        output[key] = sanitizePreviewValue(entryValue, depth + 1);
      }
    }

    return output;
  }

  return String(value);
}

function parseWorkerResponse(text: string): unknown {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return {
      empty_response: true,
    };
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return {
      raw_text: safeText(trimmed),
      parsed_as_json: false,
    };
  }
}

function buildWorkerBody(input: {
  incidentId: string;
  workspaceId: string;
  commandId?: string | null;
  runId?: string | null;
  flowId?: string | null;
  rootEventId?: string | null;
}): WorkerRunRequestBody {
  const workerInput: WorkerRunInput = {
    workspace_id: input.workspaceId,
    incident_id: input.incidentId,
    dry_run: true,
    source: WORKER_INPUT_SOURCE,
    metadata: {
      origin: "incident_detail_controlled_worker_dry_run_call",
      real_run_forbidden: true,
      dashboard_version: VERSION,
    },
  };

  if (input.commandId) workerInput.command_id = input.commandId;
  if (input.runId) workerInput.run_id = input.runId;
  if (input.flowId) workerInput.flow_id = input.flowId;
  if (input.rootEventId) workerInput.root_event_id = input.rootEventId;

  return {
    capability: WORKER_CAPABILITY,
    idempotency_key: buildIdempotencyKey({
      incidentId: input.incidentId,
      workspaceId: input.workspaceId,
    }),
    input: workerInput,
  };
}

function buildWorkerRequestPreview(input: {
  incidentId: string;
  workspaceId: string;
  commandId?: string | null;
  runId?: string | null;
  flowId?: string | null;
  rootEventId?: string | null;
}) {
  return {
    method: "POST",
    endpoint: "/run",
    worker_call: "DISABLED",
    post_run: "DISABLED",
    execution: "DISABLED",
    dry_run: true,
    body: buildWorkerBody(input),
    headers: {
      content_type: "application/json",
      scheduler_secret: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    },
  };
}

function baseGuardrails() {
  return {
    client_fetch: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",
    airtable_mutation: "DISABLED",
    incident_mutation: "DISABLED",
    command_mutation: "DISABLED",
    run_mutation: "DISABLED",
    retry: "DISABLED",
    escalation: "DISABLED",
    secret_exposure: "DISABLED",
    real_run: "FORBIDDEN",
    dry_run_forced: true,
    dry_run_false_refused: true,
    real_run_forbidden: true,
  };
}

function buildBasePayload(input: {
  incidentId: string;
  workspaceId: string;
  commandId?: string | null;
  runId?: string | null;
  flowId?: string | null;
  rootEventId?: string | null;
  requestedDryRunFalse: boolean;
  featureGate: ReturnType<typeof resolveFeatureGate>;
  workerBaseUrl: ReturnType<typeof readWorkerBaseUrl>;
  schedulerSecret: ReturnType<typeof readSchedulerSecret>;
  status: ControlledWorkerDryRunStatus;
  ok: boolean;
  workerCall: "DISABLED" | "EXECUTED_DRY_RUN_ONLY";
  postRun: "DISABLED" | "DRY_RUN_ONLY";
  workerHttpStatus: number | null;
  durationMs: number;
  workerResponse: unknown | null;
  workerError?: string | null;
}) {
  const requestPreview = buildWorkerRequestPreview({
    incidentId: input.incidentId,
    workspaceId: input.workspaceId,
    commandId: input.commandId,
    runId: input.runId,
    flowId: input.flowId,
    rootEventId: input.rootEventId,
  });

  if (input.workerCall === "EXECUTED_DRY_RUN_ONLY") {
    requestPreview.worker_call = "EXECUTED_DRY_RUN_ONLY";
    requestPreview.post_run = "DRY_RUN_ONLY";
    requestPreview.execution = "DRY_RUN_ONLY";
  }

  return {
    ok: input.ok,
    version: VERSION,
    source: SOURCE,
    status: input.status,
    mode: "CONTROLLED_WORKER_DRY_RUN_CALL",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,
    dry_run_false_refused: true,
    real_run_forbidden: true,
    worker_call: input.workerCall,
    post_run: input.postRun,
    secret_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    worker_http_status: input.workerHttpStatus,
    duration_ms: input.durationMs,
    worker_response: input.workerResponse,
    worker_error: input.workerError ?? null,

    feature_gate: {
      feature_gate_env: input.featureGate.feature_gate_env,
      feature_gate_enabled: input.featureGate.feature_gate_enabled,
      feature_gate_state: input.featureGate.feature_gate_state,
      raw_value: input.featureGate.raw_value,
    },

    server_config: {
      worker_base_url: input.workerBaseUrl.status,
      worker_base_url_env: input.workerBaseUrl.key,
      scheduler_secret: input.schedulerSecret.status,
      selected_secret_env: input.schedulerSecret.key,
      secret_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    },

    worker_request_preview: requestPreview,

    validation: {
      incident_id: input.incidentId === "unknown" ? "MISSING" : "OK",
      workspace_id: input.workspaceId ? "OK" : "MISSING",
      dry_run: "FORCED_TRUE",
      requested_dry_run_false: input.requestedDryRunFalse,
      dry_run_false_refused: true,
      real_run_forbidden: true,
      feature_gate: input.featureGate.feature_gate_enabled
        ? "ENABLED"
        : "DISABLED_OR_MISSING",
      worker_base_url: input.workerBaseUrl.status,
      scheduler_secret: input.schedulerSecret.status,
      worker_call: input.workerCall,
      post_run: input.postRun,
      secret_exposure: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      idempotency_key: requestPreview.body.idempotency_key,
      run_request_contract: "STRICT_TOP_LEVEL_CAPABILITY_IDEMPOTENCY_KEY_INPUT",
      top_level_context_fields: "MOVED_TO_INPUT",
    },

    guardrails: {
      ...baseGuardrails(),
      worker_call: input.workerCall,
      post_run: input.postRun,
    },

    next_step:
      input.status === "WORKER_DRY_RUN_CALLED"
        ? "V5.3 may add an operator confirmation surface before allowing any broader controlled execution path."
        : "Resolve the remaining worker-side response or configuration issue before V5.3.",
  };
}

export async function buildControlledWorkerDryRunCall(
  input: BuildControlledWorkerDryRunInput
) {
  const incidentId = normalizeIncidentId(input.incidentId);
  const workspaceId = normalizeWorkspaceId(input.workspaceId);
  const commandId = normalizeOptionalId(input.commandId);
  const runId = normalizeOptionalId(input.runId);
  const flowId = normalizeOptionalId(input.flowId);
  const rootEventId = normalizeOptionalId(input.rootEventId);
  const requestedDryRunFalse = isDryRunFalseAttempt(input.requestedDryRun);

  const featureGate = resolveFeatureGate();
  const workerBaseUrl = readWorkerBaseUrl();
  const schedulerSecret = readSchedulerSecret();

  const common = {
    incidentId,
    workspaceId,
    commandId,
    runId,
    flowId,
    rootEventId,
    requestedDryRunFalse,
    featureGate,
    workerBaseUrl,
    schedulerSecret,
  };

  if (requestedDryRunFalse) {
    return buildBasePayload({
      ...common,
      status: "REAL_RUN_FORBIDDEN",
      ok: false,
      workerCall: "DISABLED",
      postRun: "DISABLED",
      workerHttpStatus: null,
      durationMs: 0,
      workerResponse: null,
      workerError: "dry_run:false is forbidden from this route.",
    });
  }

  if (!featureGate.feature_gate_enabled) {
    return buildBasePayload({
      ...common,
      status: "WORKER_DRY_RUN_BLOCKED_BY_FEATURE_GATE",
      ok: true,
      workerCall: "DISABLED",
      postRun: "DISABLED",
      workerHttpStatus: null,
      durationMs: 0,
      workerResponse: null,
      workerError: null,
    });
  }

  if (!workerBaseUrl.value || schedulerSecret.status !== "CONFIGURED" || !schedulerSecret.value) {
    return buildBasePayload({
      ...common,
      status: "WORKER_DRY_RUN_CALL_FAILED",
      ok: false,
      workerCall: "DISABLED",
      postRun: "DISABLED",
      workerHttpStatus: null,
      durationMs: 0,
      workerResponse: null,
      workerError: "Missing worker base URL or scheduler secret.",
    });
  }

  const endpoint = `${workerBaseUrl.value}/run`;
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeout = setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS);

  try {
    const workerBody = buildWorkerBody({
      incidentId,
      workspaceId,
      commandId,
      runId,
      flowId,
      rootEventId,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-scheduler-secret": schedulerSecret.value,
      },
      body: JSON.stringify(workerBody),
    });

    const durationMs = Date.now() - startedAt;
    const responseText = await response.text();
    const parsedResponse = parseWorkerResponse(responseText);
    const sanitizedResponse = sanitizePreviewValue(parsedResponse);

    return buildBasePayload({
      ...common,
      status: response.ok
        ? "WORKER_DRY_RUN_CALLED"
        : "WORKER_DRY_RUN_CALL_FAILED",
      ok: response.ok,
      workerCall: "EXECUTED_DRY_RUN_ONLY",
      postRun: "DRY_RUN_ONLY",
      workerHttpStatus: response.status,
      durationMs,
      workerResponse: sanitizedResponse,
      workerError: response.ok ? null : `Worker returned HTTP ${response.status}.`,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message =
      error instanceof Error ? error.message : "Unknown worker dry run error.";

    return buildBasePayload({
      ...common,
      status: "WORKER_DRY_RUN_CALL_FAILED",
      ok: false,
      workerCall: "EXECUTED_DRY_RUN_ONLY",
      postRun: "DRY_RUN_ONLY",
      workerHttpStatus: null,
      durationMs,
      workerResponse: null,
      workerError: message,
    });
  } finally {
    clearTimeout(timeout);
  }
}
