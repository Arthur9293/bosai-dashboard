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

type PageStatus =
  | "RUN_DRAFT_PERSISTENCE_BLOCKED_BY_FEATURE_GATE"
  | "RUN_DRAFT_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION"
  | "RUN_DRAFT_PERSISTED"
  | "RUN_DRAFT_ALREADY_PERSISTED"
  | "RUN_DRAFT_PERSISTENCE_CONFIG_MISSING"
  | "RUN_DRAFT_PERSISTENCE_READ_FAILED"
  | "RUN_DRAFT_PERSISTENCE_WRITE_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "COMMAND_NOT_FOUND"
  | "COMMAND_STATUS_NOT_QUEUED"
  | "OPERATIONAL_QUEUE_NOT_PERSISTED"
  | "RUN_DRAFT_NOT_ALLOWED"
  | "REAL_RUN_FORBIDDEN"
  | "POST_CONFIRMATION_REQUIRED"
  | "OPERATOR_IDENTITY_REQUIRED";

type AirtableReadResult = {
  ok: boolean;
  status: number | null;
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

const VERSION = "Incident Detail V5.22";
const SOURCE = "dashboard_incident_detail_v5_22_gated_run_draft_persistence";

const FEATURE_GATE_ENV = "BOSAI_RUN_DRAFT_PERSISTENCE_ENABLED";
const REQUIRED_CONFIRMATION_TOKEN = "PERSIST_RUN_DRAFT";

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

function firstSearchParam(url: URL, key: string): string | undefined {
  const value = url.searchParams.get(key);
  return value ?? undefined;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function isTrue(value: unknown): boolean {
  return value === true;
}

function isForbidden(value: unknown): boolean {
  return safeString(value).trim().toLowerCase() === "forbidden";
}

function isDisabled(value: unknown): boolean {
  return safeString(value).trim().toLowerCase() === "disabled";
}

function isStatus(value: unknown, expected: string): boolean {
  return safeString(value).trim().toLowerCase() === expected.trim().toLowerCase();
}

function sanitizeError(value: string | null): string | null {
  if (!value) return null;
  return value
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer SERVER_SIDE_ONLY_REDACTED")
    .slice(0, 1600);
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function resolveFeatureGate(): {
  feature_gate_env: string;
  feature_gate_enabled: boolean;
  feature_gate_state: FeatureGateState;
  feature_gate_value: "MISSING" | "SERVER_SIDE_ONLY_NOT_EXPOSED";
} {
  const raw = process.env[FEATURE_GATE_ENV];

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      feature_gate_env: FEATURE_GATE_ENV,
      feature_gate_enabled: false,
      feature_gate_state: "FEATURE_GATE_MISSING",
      feature_gate_value: "MISSING",
    };
  }

  const normalized = raw.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return {
      feature_gate_env: FEATURE_GATE_ENV,
      feature_gate_enabled: true,
      feature_gate_state: "FEATURE_GATE_ENABLED",
      feature_gate_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    };
  }

  return {
    feature_gate_env: FEATURE_GATE_ENV,
    feature_gate_enabled: false,
    feature_gate_state: "FEATURE_GATE_DISABLED",
    feature_gate_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
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

function getSystemRunsTable(): string {
  return (
    process.env.AIRTABLE_SYSTEM_RUNS_TABLE ||
    process.env.AIRTABLE_RUNS_TABLE ||
    "System_Runs"
  );
}

function buildIntentId(workspaceId: string, incidentId: string): string {
  return `operator-intent:v5.4:${workspaceId}:${incidentId}`;
}

function buildIntentIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`;
}

function buildApprovalId(workspaceId: string, incidentId: string): string {
  return `operator-approval:v5.11:${workspaceId}:${incidentId}`;
}

function buildApprovalIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.11:gated-operator-approval-persistence:${workspaceId}:${incidentId}`;
}

function buildCommandDraftId(workspaceId: string, incidentId: string): string {
  return `command-draft:v5.13:${workspaceId}:${incidentId}`;
}

function buildCommandIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.13:gated-command-draft-persistence:${workspaceId}:${incidentId}`;
}

function buildOperationalQueueTransitionId(
  workspaceId: string,
  incidentId: string
): string {
  return `operational-queue-transition:v5.19:${workspaceId}:${incidentId}`;
}

function buildOperationalQueueTransitionIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.19:gated-operational-queue-persistence:${workspaceId}:${incidentId}`;
}

function buildRunDraftId(workspaceId: string, incidentId: string): string {
  return `run-draft:v5.22:${workspaceId}:${incidentId}`;
}

function buildRunIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.22:gated-run-draft-persistence:${workspaceId}:${incidentId}`;
}

function escapeAirtableFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findAirtableRecordByIdempotency(input: {
  token: string;
  baseId: string;
  table: string;
  idempotencyKey: string;
}): Promise<AirtableReadResult> {
  const formula = `{Idempotency_Key} = '${escapeAirtableFormulaValue(
    input.idempotencyKey
  )}'`;

  const url = new URL(
    `https://api.airtable.com/v0/${encodeURIComponent(input.baseId)}/${encodeURIComponent(
      input.table
    )}`
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
      error: sanitizeError(text),
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
  const url = new URL(
    `https://api.airtable.com/v0/${encodeURIComponent(input.baseId)}/${encodeURIComponent(
      input.table
    )}`
  );

  const response = await fetch(url.toString(), {
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
      error: sanitizeError(text),
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

async function readPostBody(request: NextRequest): Promise<{
  operator_confirmation: string;
  operator_identity: string;
  dry_run: boolean | null;
}> {
  try {
    const json = (await request.json()) as {
      operator_confirmation?: unknown;
      operator_identity?: unknown;
      dry_run?: unknown;
    };

    return {
      operator_confirmation: safeString(json.operator_confirmation),
      operator_identity: safeString(json.operator_identity),
      dry_run: typeof json.dry_run === "boolean" ? json.dry_run : null,
    };
  } catch {
    return {
      operator_confirmation: "",
      operator_identity: "",
      dry_run: null,
    };
  }
}

function buildRunInputJson(input: {
  workspaceId: string;
  incidentId: string;
  runDraftId: string;
  runIdempotencyKey: string;
  commandRecordId: string;
  commandDraftId: string;
  intentRecordId: string;
  approvalRecordId: string;
  operationalQueueTransitionId: string;
  operatorIdentity: string;
}): Record<string, unknown> {
  return {
    run_id: input.runDraftId,
    idempotency_key: input.runIdempotencyKey,
    status: "Draft",
    run_persistence_status: "RUN_DRAFT_PERSISTED",
    workspace_id: input.workspaceId,
    incident_id: input.incidentId,
    command_record_id: input.commandRecordId,
    command_id: input.commandDraftId,
    capability: "command_orchestrator",
    dry_run: true,
    source: SOURCE,
    metadata: {
      origin: "gated_run_draft_persistence",
      intent_record_id: input.intentRecordId,
      approval_record_id: input.approvalRecordId,
      command_record_id: input.commandRecordId,
      operational_queue_transition_id: input.operationalQueueTransitionId,
      operator_identity: input.operatorIdentity,
      run_status_forced_to_draft: true,
      run_execution_allowed_now: false,
      post_run_allowed_now: false,
      worker_call_allowed_now: false,
      real_run_forbidden: true,
    },
  };
}

function buildRunFields(input: {
  workspaceId: string;
  incidentId: string;
  runDraftId: string;
  runIdempotencyKey: string;
  commandDraftId: string;
  commandRecordId: string;
  intentId: string;
  intentRecordId: string;
  approvalId: string;
  approvalRecordId: string;
  operationalQueueTransitionId: string;
  operatorIdentity: string;
  inputJson: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    Idempotency_Key: input.runIdempotencyKey,
    Run_ID: input.runDraftId,
    Workspace_ID: input.workspaceId,
    Incident_ID: input.incidentId,
    Command_ID: input.commandDraftId,
    Command_Record_ID: input.commandRecordId,
    Intent_ID: input.intentId,
    Intent_Record_ID: input.intentRecordId,
    Approval_ID: input.approvalId,
    Approval_Record_ID: input.approvalRecordId,
    Operational_Queue_Transition_ID: input.operationalQueueTransitionId,
    Capability: "command_orchestrator",
    Status: "Draft",
    Status_select: "Draft",
    Dry_Run: true,
    Operator_Identity: input.operatorIdentity,
    Run_Persistence: "Draft",
    Post_Run_Allowed: false,
    Worker_Call_Allowed: false,
    Real_Run: "Forbidden",
    Secret_Exposure: "Disabled",
    Source_Layer: VERSION,
    Input_JSON: JSON.stringify(input.inputJson),
  };
}

function buildRunSnapshot(
  recordId: string | null,
  fields: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!recordId || !fields) return null;

  return {
    record_id: recordId,
    idempotency_key: safeString(fields.Idempotency_Key),
    run_id: safeString(fields.Run_ID),
    workspace_id: safeString(fields.Workspace_ID),
    incident_id: safeString(fields.Incident_ID),
    command_id: safeString(fields.Command_ID),
    command_record_id: safeString(fields.Command_Record_ID),
    intent_id: safeString(fields.Intent_ID),
    intent_record_id: safeString(fields.Intent_Record_ID),
    approval_id: safeString(fields.Approval_ID),
    approval_record_id: safeString(fields.Approval_Record_ID),
    operational_queue_transition_id: safeString(
      fields.Operational_Queue_Transition_ID
    ),
    capability: safeString(fields.Capability),
    status: safeString(fields.Status),
    status_select: safeString(fields.Status_select),
    dry_run: safeBoolean(fields.Dry_Run),
    operator_identity: safeString(fields.Operator_Identity),
    run_persistence: safeString(fields.Run_Persistence),
    post_run_allowed: safeBoolean(fields.Post_Run_Allowed),
    worker_call_allowed: safeBoolean(fields.Worker_Call_Allowed),
    real_run: safeString(fields.Real_Run),
    secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
    source_layer: safeString(fields.Source_Layer),
  };
}

async function handleRequest(
  request: NextRequest,
  context: RouteContext,
  method: "GET" | "POST"
) {
  const params = await Promise.resolve(context.params);
  const url = new URL(request.url);

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    firstSearchParam(url, "workspace_id") ?? firstSearchParam(url, "workspaceId")
  );

  const featureGate = resolveFeatureGate();

  const token = getAirtableToken();
  const baseId = getAirtableBaseId();
  const intentsTable = getOperatorIntentsTable();
  const approvalsTable = getOperatorApprovalsTable();
  const commandsTable = getCommandsTable();
  const runsTable = getSystemRunsTable();

  const intentId = buildIntentId(workspaceId, incidentId);
  const intentIdempotencyKey = buildIntentIdempotencyKey(workspaceId, incidentId);

  const approvalId = buildApprovalId(workspaceId, incidentId);
  const approvalIdempotencyKey = buildApprovalIdempotencyKey(
    workspaceId,
    incidentId
  );

  const commandDraftId = buildCommandDraftId(workspaceId, incidentId);
  const commandIdempotencyKey = buildCommandIdempotencyKey(
    workspaceId,
    incidentId
  );

  const operationalQueueTransitionId = buildOperationalQueueTransitionId(
    workspaceId,
    incidentId
  );
  const operationalQueueTransitionIdempotencyKey =
    buildOperationalQueueTransitionIdempotencyKey(workspaceId, incidentId);

  const runDraftId = buildRunDraftId(workspaceId, incidentId);
  const runIdempotencyKey = buildRunIdempotencyKey(workspaceId, incidentId);

  let status: PageStatus = "RUN_DRAFT_PERSISTENCE_CONFIG_MISSING";

  let intentRead: AirtableReadResult = {
    ok: false,
    status: null,
    recordId: null,
    fields: null,
    error: null,
  };

  let approvalRead: AirtableReadResult = {
    ok: false,
    status: null,
    recordId: null,
    fields: null,
    error: null,
  };

  let commandRead: AirtableReadResult = {
    ok: false,
    status: null,
    recordId: null,
    fields: null,
    error: null,
  };

  let runRead: AirtableReadResult = {
    ok: false,
    status: null,
    recordId: null,
    fields: null,
    error: null,
  };

  let runWrite: AirtableWriteResult = {
    ok: false,
    status: null,
    recordId: null,
    fields: null,
    error: null,
    writeExecuted: false,
  };

  let operatorIdentityForPreview = "Arthur";

  if (token && baseId) {
    intentRead = await findAirtableRecordByIdempotency({
      token,
      baseId,
      table: intentsTable,
      idempotencyKey: intentIdempotencyKey,
    });

    approvalRead = await findAirtableRecordByIdempotency({
      token,
      baseId,
      table: approvalsTable,
      idempotencyKey: approvalIdempotencyKey,
    });

    commandRead = await findAirtableRecordByIdempotency({
      token,
      baseId,
      table: commandsTable,
      idempotencyKey: commandIdempotencyKey,
    });

    runRead = await findAirtableRecordByIdempotency({
      token,
      baseId,
      table: runsTable,
      idempotencyKey: runIdempotencyKey,
    });
  }

  const commandFields = commandRead.fields;
  const commandInputJson = parseJsonObject(commandFields?.Input_JSON);

  const currentCommandStatus = safeString(commandFields?.Status);
  const currentStatusSelect = safeString(commandFields?.Status_select);
  const commandIsQueued =
    isStatus(commandFields?.Status, "Queued") &&
    isStatus(commandFields?.Status_select, "Queued");

  const operationalQueueStatus = safeString(
    commandInputJson?.operational_queue_status
  );

  const operationalQueuePersisted =
    operationalQueueStatus === "OPERATIONAL_QUEUE_PERSISTED";

  const commandWorkerCallAllowed = isTrue(commandFields?.Worker_Call_Allowed);
  const commandRealRunForbidden = isForbidden(commandFields?.Real_Run);
  const commandSecretDisabled = isDisabled(commandFields?.Secret_Exposure);

  const commandSafeForRunDraft =
    !commandWorkerCallAllowed && commandRealRunForbidden && commandSecretDisabled;

  const runInputJson = buildRunInputJson({
    workspaceId,
    incidentId,
    runDraftId,
    runIdempotencyKey,
    commandRecordId: commandRead.recordId ?? "",
    commandDraftId,
    intentRecordId: intentRead.recordId ?? "",
    approvalRecordId: approvalRead.recordId ?? "",
    operationalQueueTransitionId,
    operatorIdentity: operatorIdentityForPreview,
  });

  const runFieldsPreview = buildRunFields({
    workspaceId,
    incidentId,
    runDraftId,
    runIdempotencyKey,
    commandDraftId,
    commandRecordId: commandRead.recordId ?? "",
    intentId,
    intentRecordId: intentRead.recordId ?? "",
    approvalId,
    approvalRecordId: approvalRead.recordId ?? "",
    operationalQueueTransitionId,
    operatorIdentity: operatorIdentityForPreview,
    inputJson: runInputJson,
  });

  const anyReadFailed =
    Boolean(token && baseId) &&
    (!intentRead.ok || !approvalRead.ok || !commandRead.ok || !runRead.ok);

  if (!token || !baseId) {
    status = "RUN_DRAFT_PERSISTENCE_CONFIG_MISSING";
  } else if (anyReadFailed) {
    status = "RUN_DRAFT_PERSISTENCE_READ_FAILED";
  } else if (!intentRead.recordId) {
    status = "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  } else if (!approvalRead.recordId) {
    status = "OPERATOR_APPROVAL_NOT_FOUND";
  } else if (!commandRead.recordId) {
    status = "COMMAND_NOT_FOUND";
  } else if (!commandIsQueued) {
    status = "COMMAND_STATUS_NOT_QUEUED";
  } else if (!operationalQueuePersisted) {
    status = "OPERATIONAL_QUEUE_NOT_PERSISTED";
  } else if (!commandSafeForRunDraft) {
    status = "RUN_DRAFT_NOT_ALLOWED";
  } else if (runRead.recordId) {
    status = "RUN_DRAFT_ALREADY_PERSISTED";
  } else if (!featureGate.feature_gate_enabled) {
    status = "RUN_DRAFT_PERSISTENCE_BLOCKED_BY_FEATURE_GATE";
  } else {
    status = "RUN_DRAFT_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION";
  }

  if (
    method === "POST" &&
    status === "RUN_DRAFT_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION" &&
    token &&
    baseId
  ) {
    const body = await readPostBody(request);
    operatorIdentityForPreview =
      normalizeText(body.operator_identity) || operatorIdentityForPreview;

    if (body.dry_run !== true) {
      status = "REAL_RUN_FORBIDDEN";
    } else if (body.operator_confirmation !== REQUIRED_CONFIRMATION_TOKEN) {
      status = "POST_CONFIRMATION_REQUIRED";
    } else if (normalizeText(body.operator_identity).length === 0) {
      status = "OPERATOR_IDENTITY_REQUIRED";
    } else {
      const confirmedRunInputJson = buildRunInputJson({
        workspaceId,
        incidentId,
        runDraftId,
        runIdempotencyKey,
        commandRecordId: commandRead.recordId ?? "",
        commandDraftId,
        intentRecordId: intentRead.recordId ?? "",
        approvalRecordId: approvalRead.recordId ?? "",
        operationalQueueTransitionId,
        operatorIdentity: body.operator_identity,
      });

      const confirmedRunFields = buildRunFields({
        workspaceId,
        incidentId,
        runDraftId,
        runIdempotencyKey,
        commandDraftId,
        commandRecordId: commandRead.recordId ?? "",
        intentId,
        intentRecordId: intentRead.recordId ?? "",
        approvalId,
        approvalRecordId: approvalRead.recordId ?? "",
        operationalQueueTransitionId,
        operatorIdentity: body.operator_identity,
        inputJson: confirmedRunInputJson,
      });

      runWrite = await createAirtableRecord({
        token,
        baseId,
        table: runsTable,
        fields: confirmedRunFields,
      });

      if (runWrite.ok && runWrite.recordId) {
        status = "RUN_DRAFT_PERSISTED";
      } else {
        status = "RUN_DRAFT_PERSISTENCE_WRITE_FAILED";
      }
    }
  }

  const persistedRunRecordId = runWrite.recordId ?? runRead.recordId;
  const persistedRunFields = runWrite.fields ?? runRead.fields;

  const runPersisted =
    status === "RUN_DRAFT_PERSISTED" ||
    status === "RUN_DRAFT_ALREADY_PERSISTED";

  const readOrWriteError =
    intentRead.error ||
    approvalRead.error ||
    commandRead.error ||
    runRead.error ||
    runWrite.error ||
    null;

  const payload = {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status,
    mode: "GATED_RUN_DRAFT_PERSISTENCE",
    method,
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,

    feature_gate_env: featureGate.feature_gate_env,
    feature_gate_enabled: featureGate.feature_gate_enabled,
    feature_gate_state: featureGate.feature_gate_state,
    feature_gate_value: featureGate.feature_gate_value,

    intent_id: intentId,
    intent_record_id: intentRead.recordId,
    approval_id: approvalId,
    approval_record_id: approvalRead.recordId,
    command_draft_id: commandDraftId,
    command_record_id: commandRead.recordId,
    command_idempotency_key: commandIdempotencyKey,

    operational_queue_transition_id: operationalQueueTransitionId,
    operational_queue_transition_idempotency_key:
      operationalQueueTransitionIdempotencyKey,

    run_draft_id: runDraftId,
    run_idempotency_key: runIdempotencyKey,
    run_status: runPersisted ? "DRAFT_PERSISTED" : "NOT_PERSISTED",
    run_persistence: runPersisted ? "PERSISTED_AS_DRAFT" : "DISABLED",
    run_creation_by_this_surface:
      status === "RUN_DRAFT_PERSISTED" ? "DRAFT_CREATED_ONLY" : "DISABLED",

    current_command_status: currentCommandStatus,
    current_status_select: currentStatusSelect,
    operational_queue_status: operationalQueueStatus || "NOT_VERIFIED",

    post_run: "DISABLED_FROM_THIS_SURFACE",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation:
      status === "RUN_DRAFT_PERSISTED" ? "RUN_DRAFT_CREATED" : "DISABLED",
    command_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.21",
      status: "RUN_CREATION_PREVIEW_READY",
      run_creation_preview: "VALIDATED",
      execution_policy: "READ_ONLY_RUN_CREATION_PREVIEW",
    },

    airtable_config: {
      base_id: baseId ? "CONFIGURED" : "MISSING",
      operator_intents_table: intentsTable,
      operator_approvals_table: approvalsTable,
      commands_table: commandsTable,
      runs_table: runsTable,
      token: token ? "CONFIGURED" : "MISSING",
      token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    },

    intent_read: {
      http_status: intentRead.status,
      record_id: intentRead.recordId,
      error: intentRead.error,
    },

    approval_read: {
      http_status: approvalRead.status,
      record_id: approvalRead.recordId,
      error: approvalRead.error,
    },

    command_read: {
      http_status: commandRead.status,
      record_id: commandRead.recordId,
      error: commandRead.error,
    },

    run_read: {
      http_status: runRead.status,
      record_id: runRead.recordId,
      existing_run_found: Boolean(runRead.recordId),
      error: runRead.error,
    },

    run_write: {
      http_status: runWrite.status,
      record_id: runWrite.recordId,
      write_executed: runWrite.writeExecuted,
      error: runWrite.error,
    },

    persisted_command_snapshot: commandRead.recordId
      ? {
          record_id: commandRead.recordId,
          idempotency_key: safeString(commandFields?.Idempotency_Key),
          command_id: safeString(commandFields?.Command_ID),
          workspace_id: safeString(commandFields?.Workspace_ID),
          incident_id: safeString(commandFields?.Incident_ID),
          intent_id: safeString(commandFields?.Intent_ID),
          intent_record_id: safeString(commandFields?.Intent_Record_ID),
          approval_id: safeString(commandFields?.Approval_ID),
          approval_record_id: safeString(commandFields?.Approval_Record_ID),
          capability: safeString(commandFields?.Capability),
          status: safeString(commandFields?.Status),
          status_select: safeString(commandFields?.Status_select),
          target_mode: safeString(commandFields?.Target_Mode),
          dry_run: safeBoolean(commandFields?.Dry_Run),
          operator_identity: safeString(commandFields?.Operator_Identity),
          queue_allowed: safeBoolean(commandFields?.Queue_Allowed),
          run_creation_allowed: safeBoolean(commandFields?.Run_Creation_Allowed),
          worker_call_allowed: safeBoolean(commandFields?.Worker_Call_Allowed),
          real_run: safeString(commandFields?.Real_Run),
          secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
          source_layer: safeString(commandFields?.Source_Layer),
        }
      : null,

    persisted_run_snapshot: buildRunSnapshot(
      persistedRunRecordId,
      persistedRunFields
    ),

    run_draft_gate: {
      feature_gate_env: FEATURE_GATE_ENV,
      feature_gate_enabled: featureGate.feature_gate_enabled,
      required_confirmation_token: REQUIRED_CONFIRMATION_TOKEN,
      post_required: true,
      write_from_page: false,
      write_allowed_now:
        status === "RUN_DRAFT_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION",
    },

    run_draft_persistence_contract: {
      run_draft_id: runDraftId,
      run_idempotency_key: runIdempotencyKey,
      target_table: runsTable,
      target_status: "Draft",
      run_persistence: runPersisted ? "PERSISTED_AS_DRAFT" : "DISABLED",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
    },

    run_record_preview: {
      target_table: runsTable,
      fields: runFieldsPreview,
    },

    run_input_json_preview: runInputJson,

    safety_checklist: {
      intent_found: Boolean(intentRead.recordId),
      approval_found: Boolean(approvalRead.recordId),
      command_found: Boolean(commandRead.recordId),
      command_status_is_queued: isStatus(commandFields?.Status, "Queued"),
      status_select_is_queued: isStatus(commandFields?.Status_select, "Queued"),
      operational_queue_persisted: operationalQueuePersisted,
      source_layer_is_v519:
        safeString(commandFields?.Source_Layer) === "Incident Detail V5.19",
      feature_gate_enabled: featureGate.feature_gate_enabled,
      run_status_forced_to_draft: true,
      run_execution_disabled: true,
      post_run_disabled: true,
      worker_call_disabled: true,
      real_run_forbidden: true,
      secret_exposure_disabled: true,
      no_post_run_by_this_surface: true,
      no_worker_called_by_this_surface: true,
    },

    guardrails: {
      client_fetch: "DISABLED",
      airtable_mutation:
        status === "RUN_DRAFT_PERSISTED"
          ? "CONTROLLED_RUN_DRAFT_CREATE_ONLY"
          : "DISABLED",
      dashboard_airtable_mutation:
        status === "RUN_DRAFT_PERSISTED" ? "RUN_DRAFT_CREATED" : "DISABLED",
      command_mutation: "DISABLED",
      run_execution: "DISABLED",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      secret_exposure: "DISABLED",
      run_draft_only: true,
      feature_gated: true,
    },

    error: readOrWriteError,
    next_step:
      "V5.23 may introduce Run Draft Review Surface, still without POST /run or worker execution.",
  };

  return NextResponse.json(payload);
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context, "GET");
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context, "POST");
}
