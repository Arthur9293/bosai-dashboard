import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

type FeatureGateState =
  | "FEATURE_GATE_MISSING"
  | "FEATURE_GATE_DISABLED"
  | "FEATURE_GATE_ENABLED";

type CommandDraftPersistenceStatus =
  | "COMMAND_DRAFT_PERSISTENCE_BLOCKED_BY_FEATURE_GATE"
  | "COMMAND_DRAFT_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION"
  | "COMMAND_DRAFT_PERSISTED"
  | "COMMAND_DRAFT_ALREADY_PERSISTED"
  | "COMMAND_DRAFT_PERSISTENCE_CONFIG_MISSING"
  | "COMMAND_DRAFT_PERSISTENCE_READ_FAILED"
  | "COMMAND_DRAFT_PERSISTENCE_WRITE_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_APPROVED"
  | "COMMAND_DRAFT_NOT_ALLOWED"
  | "REAL_RUN_FORBIDDEN"
  | "POST_CONFIRMATION_REQUIRED"
  | "OPERATOR_IDENTITY_REQUIRED";

type AirtableRecordResult = {
  ok: boolean;
  status: number;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

type AirtableWriteResult = {
  ok: boolean;
  status: number | null;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
  writeExecuted: boolean;
};

const VERSION = "Incident Detail V5.13";
const SOURCE = "dashboard_incident_detail_v5_13_gated_command_draft_persistence";
const FEATURE_GATE_ENV = "BOSAI_COMMAND_DRAFT_PERSISTENCE_ENABLED";
const REQUIRED_CONFIRMATION_TOKEN = "PERSIST_COMMAND_DRAFT";

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

function isTruthyEnv(value: string | undefined): boolean {
  if (typeof value !== "string") return false;
  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
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

  if (isTruthyEnv(raw)) {
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

function getAirtableToken(): string | null {
  return (
    process.env.AIRTABLE_API_KEY ||
    process.env.AIRTABLE_TOKEN ||
    process.env.AIRTABLE_PAT ||
    null
  );
}

function getAirtableBaseId(): string | null {
  return process.env.AIRTABLE_BASE_ID || process.env.BOSAI_AIRTABLE_BASE_ID || null;
}

function getOperatorIntentsTable(): string {
  return (
    process.env.AIRTABLE_OPERATOR_INTENTS_TABLE ||
    process.env.BOSAI_OPERATOR_INTENTS_TABLE ||
    "Operator_Intents"
  );
}

function getOperatorApprovalsTable(): string {
  return (
    process.env.AIRTABLE_OPERATOR_APPROVALS_TABLE ||
    process.env.BOSAI_OPERATOR_APPROVALS_TABLE ||
    "Operator_Approvals"
  );
}

function getCommandsTable(): string {
  return process.env.AIRTABLE_COMMANDS_TABLE || "Commands";
}

function buildIntentId(workspaceId: string, incidentId: string): string {
  return `operator-intent:v5.4:${workspaceId}:${incidentId}`;
}

function buildPersistenceId(workspaceId: string, incidentId: string): string {
  return `intent-persistence:v5.8:${workspaceId}:${incidentId}`;
}

function buildApprovalId(workspaceId: string, incidentId: string): string {
  return `operator-approval:v5.11:${workspaceId}:${incidentId}`;
}

function buildIntentIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`;
}

function buildApprovalIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.11:gated-operator-approval-persistence:${workspaceId}:${incidentId}`;
}

function buildCommandDraftId(workspaceId: string, incidentId: string): string {
  return `command-draft:v5.13:${workspaceId}:${incidentId}`;
}

function buildCommandIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.13:gated-command-draft-persistence:${workspaceId}:${incidentId}`;
}

function escapeAirtableFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function isDryRunFalseAttempt(value: unknown): boolean {
  if (value === false) return true;
  if (typeof value === "number") return value === 0;
  if (typeof value === "string") {
    return ["false", "0", "no", "off"].includes(value.trim().toLowerCase());
  }
  return false;
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
    lowered.includes("credential") ||
    lowered.includes("signature")
  );
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[MAX_DEPTH_REACHED]";

  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return value.length > 4000 ? `${value.slice(0, 4000)}...[TRUNCATED]` : value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 100);

    for (const [key, entryValue] of entries) {
      output[key] = isSensitiveKey(key)
        ? "SERVER_SIDE_ONLY_REDACTED"
        : sanitizeValue(entryValue, depth + 1);
    }

    return output;
  }

  return String(value);
}

async function parseJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function findAirtableRecordByIdempotency(input: {
  token: string;
  baseId: string;
  table: string;
  idempotencyKey: string;
}): Promise<AirtableRecordResult> {
  const formula = `{Idempotency_Key} = '${escapeAirtableFormulaValue(
    input.idempotencyKey
  )}'`;

  const url = new URL(
    `https://api.airtable.com/v0/${encodeURIComponent(
      input.baseId
    )}/${encodeURIComponent(input.table)}`
  );

  url.searchParams.set("maxRecords", "1");
  url.searchParams.set("filterByFormula", formula);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${input.token}`,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      recordId: null,
      fields: null,
      error: text.slice(0, 1200),
    };
  }

  try {
    const json = JSON.parse(text) as {
      records?: Array<{
        id?: string;
        fields?: Record<string, unknown>;
      }>;
    };

    const record = json.records?.[0];

    return {
      ok: true,
      status: response.status,
      recordId: record?.id ?? null,
      fields: record?.fields ?? null,
      error: null,
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      recordId: null,
      fields: null,
      error: "Unable to parse Airtable response.",
    };
  }
}

async function createAirtableRecord(input: {
  token: string;
  baseId: string;
  table: string;
  fields: Record<string, unknown>;
}): Promise<AirtableWriteResult> {
  const url = `https://api.airtable.com/v0/${encodeURIComponent(
    input.baseId
  )}/${encodeURIComponent(input.table)}`;

  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: input.fields,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      recordId: null,
      fields: null,
      error: text.slice(0, 2000),
      writeExecuted: true,
    };
  }

  try {
    const json = JSON.parse(text) as {
      id?: string;
      fields?: Record<string, unknown>;
    };

    return {
      ok: true,
      status: response.status,
      recordId: json.id ?? null,
      fields: json.fields ?? null,
      error: null,
      writeExecuted: true,
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      recordId: null,
      fields: null,
      error: "Unable to parse Airtable create response.",
      writeExecuted: true,
    };
  }
}

async function readState(input: {
  token: string;
  baseId: string;
  workspaceId: string;
  incidentId: string;
}): Promise<{
  ok: boolean;
  reason: string | null;
  intent: AirtableRecordResult;
  approval: AirtableRecordResult;
  command: AirtableRecordResult;
}> {
  const intent = await findAirtableRecordByIdempotency({
    token: input.token,
    baseId: input.baseId,
    table: getOperatorIntentsTable(),
    idempotencyKey: buildIntentIdempotencyKey(input.workspaceId, input.incidentId),
  });

  if (!intent.ok) {
    return {
      ok: false,
      reason: "intent_read_failed",
      intent,
      approval: {
        ok: false,
        status: 0,
        recordId: null,
        fields: null,
        error: "Approval read skipped because intent read failed.",
      },
      command: {
        ok: false,
        status: 0,
        recordId: null,
        fields: null,
        error: "Command read skipped because intent read failed.",
      },
    };
  }

  const approval = await findAirtableRecordByIdempotency({
    token: input.token,
    baseId: input.baseId,
    table: getOperatorApprovalsTable(),
    idempotencyKey: buildApprovalIdempotencyKey(input.workspaceId, input.incidentId),
  });

  if (!approval.ok) {
    return {
      ok: false,
      reason: "approval_read_failed",
      intent,
      approval,
      command: {
        ok: false,
        status: 0,
        recordId: null,
        fields: null,
        error: "Command read skipped because approval read failed.",
      },
    };
  }

  const command = await findAirtableRecordByIdempotency({
    token: input.token,
    baseId: input.baseId,
    table: getCommandsTable(),
    idempotencyKey: buildCommandIdempotencyKey(input.workspaceId, input.incidentId),
  });

  if (!command.ok) {
    return {
      ok: false,
      reason: "command_read_failed",
      intent,
      approval,
      command,
    };
  }

  return {
    ok: true,
    reason: null,
    intent,
    approval,
    command,
  };
}

function buildCommandInputJson(input: {
  workspaceId: string;
  incidentId: string;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  operatorIdentity: string;
}) {
  return {
    capability: "command_orchestrator",
    status: "Draft",
    workspace_id: input.workspaceId,
    incident_id: input.incidentId,
    dry_run: true,
    source: SOURCE,
    metadata: {
      origin: "gated_command_draft_persistence",
      intent_record_id: input.intentRecordId,
      approval_record_id: input.approvalRecordId,
      operator_identity: input.operatorIdentity,
      real_run_forbidden: true,
      queue_allowed_now: false,
      run_creation_allowed_now: false,
      worker_call_allowed_now: false,
    },
  };
}

function buildCommandFields(input: {
  workspaceId: string;
  incidentId: string;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  operatorIdentity: string;
}) {
  const intentId = buildIntentId(input.workspaceId, input.incidentId);
  const approvalId = buildApprovalId(input.workspaceId, input.incidentId);
  const commandDraftId = buildCommandDraftId(input.workspaceId, input.incidentId);
  const commandIdempotencyKey = buildCommandIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );

  const inputJson = buildCommandInputJson(input);

  return {
    Idempotency_Key: commandIdempotencyKey,
    Command_ID: commandDraftId,
    Workspace_ID: input.workspaceId,
    Incident_ID: input.incidentId,
    Intent_ID: intentId,
    Intent_Record_ID: input.intentRecordId,
    Approval_ID: approvalId,
    Approval_Record_ID: input.approvalRecordId,
    Capability: "command_orchestrator",
    Status: "Draft",
    Status_select: "Draft",
    Target_Mode: "dry_run_only",
    Dry_Run: true,
    Operator_Identity: input.operatorIdentity,
    Approved_For_Command_Draft: true,
    Command_Creation_Allowed: true,
    Queue_Allowed: false,
    Run_Creation_Allowed: false,
    Worker_Call_Allowed: false,
    Real_Run: "Forbidden",
    Secret_Exposure: "Disabled",
    Source_Layer: VERSION,
    Input_JSON: JSON.stringify(inputJson),
  };
}

function resolveBaseStatus(input: {
  gateEnabled: boolean;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  approvalStatus: string;
  approvedForCommandDraft: boolean;
  targetMode: string;
}): CommandDraftPersistenceStatus {
  if (input.commandRecordId) return "COMMAND_DRAFT_ALREADY_PERSISTED";
  if (!input.intentRecordId) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!input.approvalRecordId) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (input.approvalStatus !== "Approved") return "OPERATOR_APPROVAL_NOT_APPROVED";
  if (!input.approvedForCommandDraft || input.targetMode !== "dry_run_only") {
    return "COMMAND_DRAFT_NOT_ALLOWED";
  }
  if (!input.gateEnabled) return "COMMAND_DRAFT_PERSISTENCE_BLOCKED_BY_FEATURE_GATE";
  return "COMMAND_DRAFT_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION";
}

function buildPayload(input: {
  method: "GET" | "POST";
  incidentId: string;
  workspaceId: string;
  status: CommandDraftPersistenceStatus;
  featureGate: ReturnType<typeof resolveFeatureGate>;
  intent: AirtableRecordResult | null;
  approval: AirtableRecordResult | null;
  command: AirtableRecordResult | null;
  commandWrite: AirtableWriteResult;
  operatorIdentity: string;
  error: string | null;
}) {
  const token = getAirtableToken();
  const baseId = getAirtableBaseId();

  const intentFields = input.intent?.fields ?? {};
  const approvalFields = input.approval?.fields ?? {};
  const commandFields = input.command?.fields ?? input.commandWrite.fields ?? {};

  const intentRecordId = input.intent?.recordId ?? null;
  const approvalRecordId = input.approval?.recordId ?? null;
  const commandRecordId = input.command?.recordId ?? input.commandWrite.recordId ?? null;

  const operatorIdentity =
    input.operatorIdentity ||
    safeString(approvalFields.Operator_Identity) ||
    "REQUIRED_NOT_CAPTURED";

  const approvalStatus = safeString(approvalFields.Approval_Status) || "UNKNOWN";
  const approvedForCommandDraft =
    safeBoolean(approvalFields.Approved_For_Command_Draft) === true;
  const targetCapability =
    safeString(approvalFields.Target_Capability) ||
    safeString(intentFields.Target_Capability) ||
    "command_orchestrator";
  const targetMode =
    safeString(approvalFields.Target_Mode) ||
    safeString(intentFields.Target_Mode) ||
    "dry_run_only";

  const commandFieldsPreview = buildCommandFields({
    workspaceId: input.workspaceId,
    incidentId: input.incidentId,
    intentRecordId,
    approvalRecordId,
    operatorIdentity,
  });

  const commandInputJsonPreview = buildCommandInputJson({
    workspaceId: input.workspaceId,
    incidentId: input.incidentId,
    intentRecordId,
    approvalRecordId,
    operatorIdentity,
  });

  const commandPersistence =
    input.status === "COMMAND_DRAFT_PERSISTED" ||
    input.status === "COMMAND_DRAFT_ALREADY_PERSISTED"
      ? "PERSISTED_AS_DRAFT"
      : "DISABLED";

  const commandStatus =
    input.status === "COMMAND_DRAFT_PERSISTED" ||
    input.status === "COMMAND_DRAFT_ALREADY_PERSISTED"
      ? "DRAFT_PERSISTED"
      : "NOT_PERSISTED";

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status: input.status,
    mode: "GATED_COMMAND_DRAFT_PERSISTENCE",
    method: input.method,
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,

    feature_gate_env: input.featureGate.feature_gate_env,
    feature_gate_enabled: input.featureGate.feature_gate_enabled,
    feature_gate_state: input.featureGate.feature_gate_state,
    feature_gate_value: input.featureGate.raw_value,

    intent_id: buildIntentId(input.workspaceId, input.incidentId),
    intent_record_id: intentRecordId,
    persistence_id: buildPersistenceId(input.workspaceId, input.incidentId),
    approval_id: buildApprovalId(input.workspaceId, input.incidentId),
    approval_record_id: approvalRecordId,

    command_draft_id: buildCommandDraftId(input.workspaceId, input.incidentId),
    command_idempotency_key: buildCommandIdempotencyKey(
      input.workspaceId,
      input.incidentId
    ),
    command_record_id: commandRecordId,
    command_status: commandStatus,
    command_persistence: commandPersistence,
    command_creation:
      commandPersistence === "PERSISTED_AS_DRAFT" ? "DRAFT_CREATED" : "DISABLED",
    queue: "DISABLED",
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation:
      input.status === "COMMAND_DRAFT_PERSISTED"
        ? "COMMAND_DRAFT_CREATED"
        : "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.12",
      status: "COMMAND_DRAFT_PREVIEW_READY",
      command_draft_preview: "VALIDATED",
      execution_policy: "READ_ONLY_COMMAND_DRAFT_PREVIEW",
    },

    airtable_config: {
      base_id: baseId ? "CONFIGURED" : "MISSING",
      operator_intents_table: getOperatorIntentsTable(),
      operator_approvals_table: getOperatorApprovalsTable(),
      commands_table: getCommandsTable(),
      token: token ? "CONFIGURED" : "MISSING",
      token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    },

    intent_read: {
      http_status: input.intent?.status ?? null,
      record_id: intentRecordId,
      error: input.intent?.error ?? null,
    },

    approval_read: {
      http_status: input.approval?.status ?? null,
      record_id: approvalRecordId,
      error: input.approval?.error ?? null,
    },

    command_read: {
      http_status: input.command?.status ?? null,
      record_id: input.command?.recordId ?? null,
      existing_command_found: Boolean(input.command?.recordId),
      error: input.command?.error ?? null,
    },

    command_write: {
      http_status: input.commandWrite.status,
      record_id: input.commandWrite.recordId,
      write_executed: input.commandWrite.writeExecuted,
      error: input.commandWrite.error,
    },

    operator_approval_source: {
      intent_record_id: intentRecordId,
      approval_record_id: approvalRecordId,
      operator_identity: operatorIdentity,
      approval_status: approvalStatus,
      approved_for_command_draft: approvedForCommandDraft,
      target_capability: targetCapability,
      target_mode: targetMode,
    },

    persisted_command_snapshot: sanitizeValue(
      commandRecordId
        ? {
            record_id: commandRecordId,
            idempotency_key: safeString(commandFields.Idempotency_Key),
            command_id: safeString(commandFields.Command_ID),
            workspace_id: safeString(commandFields.Workspace_ID),
            incident_id: safeString(commandFields.Incident_ID),
            capability:
              safeString(commandFields.Capability) ||
              safeString(commandFields.Target_Capability),
            status:
              safeString(commandFields.Status) ||
              safeString(commandFields.Status_select),
            target_mode: safeString(commandFields.Target_Mode),
            dry_run: safeBoolean(commandFields.Dry_Run),
            queue_allowed: safeBoolean(commandFields.Queue_Allowed),
            run_creation_allowed: safeBoolean(commandFields.Run_Creation_Allowed),
            worker_call_allowed: safeBoolean(commandFields.Worker_Call_Allowed),
            real_run: safeString(commandFields.Real_Run),
            secret_exposure: safeString(commandFields.Secret_Exposure),
            source_layer: safeString(commandFields.Source_Layer),
          }
        : null
    ),

    command_draft_gate: {
      feature_gate_env: input.featureGate.feature_gate_env,
      feature_gate_enabled: input.featureGate.feature_gate_enabled,
      required_confirmation_token: REQUIRED_CONFIRMATION_TOKEN,
      post_required: true,
      write_from_page: false,
      write_allowed_now:
        input.method === "POST" &&
        input.featureGate.feature_gate_enabled &&
        input.status === "COMMAND_DRAFT_PERSISTED",
    },

    command_draft_persistence_contract: {
      command_draft_id: buildCommandDraftId(input.workspaceId, input.incidentId),
      command_idempotency_key: buildCommandIdempotencyKey(
        input.workspaceId,
        input.incidentId
      ),
      target_table: getCommandsTable(),
      target_status: "Draft",
      queue_allowed: false,
      run_creation_allowed: false,
      worker_call_allowed: false,
    },

    command_record_preview: {
      fields: commandFieldsPreview,
    },

    command_input_json_preview: commandInputJsonPreview,

    guardrails: {
      client_fetch: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      dry_run_only: true,
      queue: "DISABLED",
      incident_mutation: "DISABLED",
      operator_intent_mutation: "DISABLED",
      operator_approval_mutation: "DISABLED",
      run_creation: "DISABLED",
      secret_exposure: "DISABLED",
      command_status_forced_to_draft: true,
      command_persistence_gated: true,
    },

    error: input.error,

    next_step:
      "V5.14 may introduce a Command Draft Review Surface, still without queueing, run creation, or worker execution.",
  };
}

function jsonResponse(payload: unknown) {
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await Promise.resolve(context.params);

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    request.nextUrl.searchParams.get("workspace_id") ??
      request.nextUrl.searchParams.get("workspaceId")
  );

  const featureGate = resolveFeatureGate();
  const token = getAirtableToken();
  const baseId = getAirtableBaseId();

  const emptyWrite: AirtableWriteResult = {
    ok: false,
    status: null,
    recordId: null,
    fields: null,
    error: null,
    writeExecuted: false,
  };

  if (!token || !baseId) {
    return jsonResponse(
      buildPayload({
        method: "GET",
        incidentId,
        workspaceId,
        status: "COMMAND_DRAFT_PERSISTENCE_CONFIG_MISSING",
        featureGate,
        intent: null,
        approval: null,
        command: null,
        commandWrite: emptyWrite,
        operatorIdentity: "",
        error: "Missing Airtable token or base id.",
      })
    );
  }

  const state = await readState({
    token,
    baseId,
    workspaceId,
    incidentId,
  });

  if (!state.ok) {
    return jsonResponse(
      buildPayload({
        method: "GET",
        incidentId,
        workspaceId,
        status: "COMMAND_DRAFT_PERSISTENCE_READ_FAILED",
        featureGate,
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        commandWrite: emptyWrite,
        operatorIdentity: "",
        error: state.reason,
      })
    );
  }

  const approvalStatus = safeString(state.approval.fields?.Approval_Status);
  const approvedForCommandDraft =
    safeBoolean(state.approval.fields?.Approved_For_Command_Draft) === true;
  const targetMode =
    safeString(state.approval.fields?.Target_Mode) ||
    safeString(state.intent.fields?.Target_Mode);

  const status = resolveBaseStatus({
    gateEnabled: featureGate.feature_gate_enabled,
    intentRecordId: state.intent.recordId,
    approvalRecordId: state.approval.recordId,
    commandRecordId: state.command.recordId,
    approvalStatus,
    approvedForCommandDraft,
    targetMode,
  });

  return jsonResponse(
    buildPayload({
      method: "GET",
      incidentId,
      workspaceId,
      status,
      featureGate,
      intent: state.intent,
      approval: state.approval,
      command: state.command,
      commandWrite: emptyWrite,
      operatorIdentity: "",
      error: null,
    })
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const params = await Promise.resolve(context.params);

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    request.nextUrl.searchParams.get("workspace_id") ??
      request.nextUrl.searchParams.get("workspaceId")
  );

  const featureGate = resolveFeatureGate();
  const token = getAirtableToken();
  const baseId = getAirtableBaseId();
  const body = await parseJsonBody(request);

  const operatorConfirmation = safeString(body.operator_confirmation);
  const operatorIdentity = normalizeText(safeString(body.operator_identity));

  const emptyWrite: AirtableWriteResult = {
    ok: false,
    status: null,
    recordId: null,
    fields: null,
    error: null,
    writeExecuted: false,
  };

  if (isDryRunFalseAttempt(body.dry_run)) {
    return jsonResponse(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "REAL_RUN_FORBIDDEN",
        featureGate,
        intent: null,
        approval: null,
        command: null,
        commandWrite: emptyWrite,
        operatorIdentity,
        error: "dry_run:false is forbidden from this route.",
      })
    );
  }

  if (operatorConfirmation !== REQUIRED_CONFIRMATION_TOKEN) {
    return jsonResponse(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "POST_CONFIRMATION_REQUIRED",
        featureGate,
        intent: null,
        approval: null,
        command: null,
        commandWrite: emptyWrite,
        operatorIdentity,
        error: `Missing required confirmation token: ${REQUIRED_CONFIRMATION_TOKEN}.`,
      })
    );
  }

  if (!operatorIdentity) {
    return jsonResponse(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "OPERATOR_IDENTITY_REQUIRED",
        featureGate,
        intent: null,
        approval: null,
        command: null,
        commandWrite: emptyWrite,
        operatorIdentity,
        error: "operator_identity is required.",
      })
    );
  }

  if (!token || !baseId) {
    return jsonResponse(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "COMMAND_DRAFT_PERSISTENCE_CONFIG_MISSING",
        featureGate,
        intent: null,
        approval: null,
        command: null,
        commandWrite: emptyWrite,
        operatorIdentity,
        error: "Missing Airtable token or base id.",
      })
    );
  }

  const state = await readState({
    token,
    baseId,
    workspaceId,
    incidentId,
  });

  if (!state.ok) {
    return jsonResponse(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "COMMAND_DRAFT_PERSISTENCE_READ_FAILED",
        featureGate,
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        commandWrite: emptyWrite,
        operatorIdentity,
        error: state.reason,
      })
    );
  }

  const approvalStatus = safeString(state.approval.fields?.Approval_Status);
  const approvedForCommandDraft =
    safeBoolean(state.approval.fields?.Approved_For_Command_Draft) === true;
  const targetMode =
    safeString(state.approval.fields?.Target_Mode) ||
    safeString(state.intent.fields?.Target_Mode);

  const baseStatus = resolveBaseStatus({
    gateEnabled: featureGate.feature_gate_enabled,
    intentRecordId: state.intent.recordId,
    approvalRecordId: state.approval.recordId,
    commandRecordId: state.command.recordId,
    approvalStatus,
    approvedForCommandDraft,
    targetMode,
  });

  if (baseStatus === "COMMAND_DRAFT_ALREADY_PERSISTED") {
    return jsonResponse(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "COMMAND_DRAFT_ALREADY_PERSISTED",
        featureGate,
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        commandWrite: emptyWrite,
        operatorIdentity,
        error: null,
      })
    );
  }

  if (baseStatus !== "COMMAND_DRAFT_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION") {
    return jsonResponse(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: baseStatus,
        featureGate,
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        commandWrite: emptyWrite,
        operatorIdentity,
        error: "Command draft persistence is not allowed in the current state.",
      })
    );
  }

  const commandFields = buildCommandFields({
    workspaceId,
    incidentId,
    intentRecordId: state.intent.recordId,
    approvalRecordId: state.approval.recordId,
    operatorIdentity,
  });

  const write = await createAirtableRecord({
    token,
    baseId,
    table: getCommandsTable(),
    fields: commandFields,
  });

  if (!write.ok) {
    return jsonResponse(
      buildPayload({
        method: "POST",
        incidentId,
        workspaceId,
        status: "COMMAND_DRAFT_PERSISTENCE_WRITE_FAILED",
        featureGate,
        intent: state.intent,
        approval: state.approval,
        command: state.command,
        commandWrite: write,
        operatorIdentity,
        error: write.error,
      })
    );
  }

  return jsonResponse(
    buildPayload({
      method: "POST",
      incidentId,
      workspaceId,
      status: "COMMAND_DRAFT_PERSISTED",
      featureGate,
      intent: state.intent,
      approval: state.approval,
      command: {
        ok: true,
        status: write.status ?? 200,
        recordId: write.recordId,
        fields: write.fields,
        error: null,
      },
      commandWrite: write,
      operatorIdentity,
      error: null,
    })
  );
}
