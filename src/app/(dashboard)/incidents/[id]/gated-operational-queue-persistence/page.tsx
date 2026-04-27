import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

type GateState = "FEATURE_GATE_MISSING" | "FEATURE_GATE_DISABLED" | "FEATURE_GATE_ENABLED";

type OperationalQueuePersistenceStatus =
  | "OPERATIONAL_QUEUE_PERSISTENCE_BLOCKED_BY_FEATURE_GATE"
  | "SCHEDULER_RISK_REVIEW_REQUIRED"
  | "OPERATIONAL_QUEUE_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION"
  | "OPERATIONAL_QUEUE_PERSISTED"
  | "OPERATIONAL_QUEUE_ALREADY_PERSISTED"
  | "OPERATIONAL_QUEUE_PERSISTENCE_CONFIG_MISSING"
  | "OPERATIONAL_QUEUE_PERSISTENCE_READ_FAILED"
  | "OPERATIONAL_QUEUE_PERSISTENCE_WRITE_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "COMMAND_DRAFT_NOT_FOUND"
  | "QUEUE_INTENT_NOT_PERSISTED"
  | "COMMAND_STATUS_NOT_DRAFT"
  | "REAL_RUN_FORBIDDEN"
  | "POST_CONFIRMATION_REQUIRED"
  | "OPERATOR_IDENTITY_REQUIRED"
  | "SCHEDULER_RISK_ACKNOWLEDGEMENT_REQUIRED";

type AirtableRecordResult = {
  ok: boolean;
  status: number | null;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

const VERSION = "Incident Detail V5.19";
const SOURCE = "dashboard_incident_detail_v5_19_gated_operational_queue_persistence";

const FEATURE_GATE_ENV = "BOSAI_OPERATIONAL_QUEUE_PERSISTENCE_ENABLED";
const SCHEDULER_REVIEW_GATE_ENV = "BOSAI_QUEUED_STATUS_SCHEDULER_REVIEWED";

const REQUIRED_CONFIRMATION = "PERSIST_OPERATIONAL_QUEUE";
const REQUIRED_SCHEDULER_ACK =
  "I_ACKNOWLEDGE_QUEUED_STATUS_MAY_TRIGGER_SCHEDULER";

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

function firstSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function checkboxValue(value: unknown): boolean {
  return value === true;
}

function safeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
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

function resolveGate(envName: string): {
  env: string;
  enabled: boolean;
  state: GateState;
  value: "MISSING" | "SERVER_SIDE_ONLY_NOT_EXPOSED";
} {
  const raw = process.env[envName];

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      env: envName,
      enabled: false,
      state: "FEATURE_GATE_MISSING",
      value: "MISSING",
    };
  }

  const normalized = raw.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return {
      env: envName,
      enabled: true,
      state: "FEATURE_GATE_ENABLED",
      value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    };
  }

  return {
    env: envName,
    enabled: false,
    state: "FEATURE_GATE_DISABLED",
    value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
  };
}

function buildIntentId(workspaceId: string, incidentId: string): string {
  return `operator-intent:v5.4:${workspaceId}:${incidentId}`;
}

function buildApprovalId(workspaceId: string, incidentId: string): string {
  return `operator-approval:v5.11:${workspaceId}:${incidentId}`;
}

function buildCommandDraftId(workspaceId: string, incidentId: string): string {
  return `command-draft:v5.13:${workspaceId}:${incidentId}`;
}

function buildIntentIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`;
}

function buildApprovalIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.11:gated-operator-approval-persistence:${workspaceId}:${incidentId}`;
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

function escapeAirtableFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function isQueueIntentPersisted(fields: Record<string, unknown> | null): boolean {
  if (!fields) return false;

  const inputJson = parseJsonObject(fields.Input_JSON);
  const queueIntentStatus = safeString(inputJson?.queue_intent_status);
  const sourceLayer = safeString(fields.Source_Layer);

  return (
    queueIntentStatus === "QUEUE_INTENT_PERSISTED" ||
    sourceLayer === "Incident Detail V5.16" ||
    sourceLayer === "Incident Detail V5.19" ||
    checkboxValue(fields.Queue_Allowed)
  );
}

function isOperationalQueuePersisted(fields: Record<string, unknown> | null): boolean {
  if (!fields) return false;

  const inputJson = parseJsonObject(fields.Input_JSON);
  const operationalQueueStatus = safeString(inputJson?.operational_queue_status);
  const status = safeString(fields.Status);
  const statusSelect = safeString(fields.Status_select);
  const sourceLayer = safeString(fields.Source_Layer);

  return (
    status === "Queued" &&
    statusSelect === "Queued" &&
    (sourceLayer === "Incident Detail V5.19" ||
      operationalQueueStatus === "OPERATIONAL_QUEUE_PERSISTED")
  );
}

function buildInputJson(input: {
  workspaceId: string;
  incidentId: string;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  operatorIdentity: string;
}) {
  return {
    capability: "command_orchestrator",
    status: "Queued",
    status_select: "Queued",
    queue_intent_status: "QUEUE_INTENT_PERSISTED",
    operational_queue_status: "OPERATIONAL_QUEUE_PERSISTED",
    workspace_id: input.workspaceId,
    incident_id: input.incidentId,
    dry_run: true,
    source: SOURCE,
    metadata: {
      origin: "gated_operational_queue_persistence",
      operational_queue_transition_id: buildOperationalQueueTransitionId(
        input.workspaceId,
        input.incidentId
      ),
      operational_queue_transition_idempotency_key:
        buildOperationalQueueTransitionIdempotencyKey(
          input.workspaceId,
          input.incidentId
        ),
      intent_record_id: input.intentRecordId,
      approval_record_id: input.approvalRecordId,
      command_record_id: input.commandRecordId,
      operator_identity: input.operatorIdentity,
      scheduler_risk_acknowledged: true,
      status_mutation_persisted: true,
      operational_queue_persisted: true,
      run_creation_allowed_now: false,
      worker_call_allowed_now: false,
      real_run_forbidden: true,
    },
  };
}

function buildUpdateFields(input: {
  workspaceId: string;
  incidentId: string;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  operatorIdentity: string;
}) {
  return {
    Status: "Queued",
    Status_select: "Queued",
    Operational_Queue_Requested: true,
    Operational_Queue_Source_Layer: VERSION,
    Run_Creation_Allowed: false,
    Worker_Call_Allowed: false,
    Real_Run: "Forbidden",
    Secret_Exposure: "Disabled",
    Source_Layer: VERSION,
    Input_JSON: JSON.stringify(buildInputJson(input)),
  };
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
        status: null,
        recordId: null,
        fields: null,
        error: "Approval read skipped because intent read failed.",
      },
      command: {
        ok: false,
        status: null,
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
        status: null,
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

function resolveStatus(input: {
  stateOk: boolean;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  commandFields: Record<string, unknown> | null;
  featureGateEnabled: boolean;
  schedulerGateEnabled: boolean;
}): OperationalQueuePersistenceStatus {
  if (!input.stateOk) return "OPERATIONAL_QUEUE_PERSISTENCE_READ_FAILED";
  if (!input.intentRecordId) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!input.approvalRecordId) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (!input.commandRecordId) return "COMMAND_DRAFT_NOT_FOUND";
  if (!isQueueIntentPersisted(input.commandFields)) return "QUEUE_INTENT_NOT_PERSISTED";
  if (isOperationalQueuePersisted(input.commandFields)) {
    return "OPERATIONAL_QUEUE_ALREADY_PERSISTED";
  }

  const status = safeString(input.commandFields?.Status);
  const statusSelect = safeString(input.commandFields?.Status_select);

  if (!(status === "Draft" && statusSelect === "Draft")) {
    return "COMMAND_STATUS_NOT_DRAFT";
  }

  if (!input.featureGateEnabled) {
    return "OPERATIONAL_QUEUE_PERSISTENCE_BLOCKED_BY_FEATURE_GATE";
  }

  if (!input.schedulerGateEnabled) {
    return "SCHEDULER_RISK_REVIEW_REQUIRED";
  }

  return "OPERATIONAL_QUEUE_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION";
}

function withWorkspace(href: string, workspaceId: string): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}workspace_id=${encodeURIComponent(workspaceId)}`;
}

function Card(props: {
  children: ReactNode;
  tone?: "default" | "cyan" | "green" | "amber" | "red";
}) {
  const toneClass =
    props.tone === "cyan"
      ? "border-cyan-400/30 bg-cyan-950/10"
      : props.tone === "green"
        ? "border-emerald-400/30 bg-emerald-950/10"
        : props.tone === "amber"
          ? "border-yellow-400/30 bg-yellow-950/10"
          : props.tone === "red"
            ? "border-rose-400/30 bg-rose-950/10"
            : "border-white/10 bg-white/[0.03]";

  return (
    <section
      className={`rounded-[2rem] border p-7 shadow-2xl shadow-black/30 ${toneClass}`}
    >
      {props.children}
    </section>
  );
}

function Eyebrow(props: { children: ReactNode }) {
  return (
    <p className="mb-5 text-xs font-black uppercase tracking-[0.45em] text-white/35">
      {props.children}
    </p>
  );
}

function Badge(props: {
  children: ReactNode;
  tone?: "cyan" | "green" | "amber" | "red" | "neutral";
}) {
  const toneClass =
    props.tone === "green"
      ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100"
      : props.tone === "amber"
        ? "border-yellow-400/35 bg-yellow-500/15 text-yellow-100"
        : props.tone === "red"
          ? "border-rose-400/35 bg-rose-500/15 text-rose-100"
          : props.tone === "neutral"
            ? "border-white/15 bg-white/[0.04] text-white/70"
            : "border-cyan-400/35 bg-cyan-500/15 text-cyan-100";

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-5 py-3 break-all text-xs font-black uppercase tracking-[0.32em] ${toneClass}`}
    >
      {props.children}
    </span>
  );
}

function DataTile(props: {
  label: string;
  value: ReactNode;
  tone?: "cyan" | "green" | "amber" | "red" | "neutral";
}) {
  const valueClass =
    props.tone === "green"
      ? "text-emerald-100"
      : props.tone === "amber"
        ? "text-yellow-100"
        : props.tone === "red"
          ? "text-rose-100"
          : props.tone === "neutral"
            ? "text-white"
            : "text-cyan-100";

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
      <p className="mb-3 text-[0.65rem] font-black uppercase tracking-[0.4em] text-white/35">
        {props.label}
      </p>
      <div className={`break-all font-mono text-xl font-black leading-snug ${valueClass}`}>
        {props.value}
      </div>
    </div>
  );
}

function JsonBlock(props: { value: unknown }) {
  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-white/10 bg-black p-5">
      <pre className="min-w-max whitespace-pre-wrap break-words font-mono text-sm leading-7 text-white/85">
        {JSON.stringify(props.value, null, 2)}
      </pre>
    </div>
  );
}

function NavButton(props: { href: string; children: ReactNode }) {
  return (
    <Link
      href={props.href}
      className="block rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-4 text-center text-sm font-black text-cyan-50 transition hover:bg-cyan-500/15"
    >
      {props.children}
    </Link>
  );
}

export default async function GatedOperationalQueuePersistencePage(
  props: PageProps
) {
  const params = await Promise.resolve(props.params);
  const searchParams = props.searchParams ? await Promise.resolve(props.searchParams) : {};

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    firstSearchParam(searchParams, "workspace_id") ??
      firstSearchParam(searchParams, "workspaceId")
  );

  const token = getAirtableToken();
  const baseId = getAirtableBaseId();

  const featureGate = resolveGate(FEATURE_GATE_ENV);
  const schedulerGate = resolveGate(SCHEDULER_REVIEW_GATE_ENV);

  let status: OperationalQueuePersistenceStatus =
    "OPERATIONAL_QUEUE_PERSISTENCE_CONFIG_MISSING";
  let intentRecordId: string | null = null;
  let approvalRecordId: string | null = null;
  let commandRecordId: string | null = null;
  let commandFields: Record<string, unknown> | null = null;
  let readError: string | null = null;

  if (token && baseId) {
    const state = await readState({
      token,
      baseId,
      workspaceId,
      incidentId,
    });

    intentRecordId = state.intent.recordId;
    approvalRecordId = state.approval.recordId;
    commandRecordId = state.command.recordId;
    commandFields = state.command.fields;
    readError = state.reason ?? state.intent.error ?? state.approval.error ?? state.command.error;

    status = resolveStatus({
      stateOk: state.ok,
      intentRecordId,
      approvalRecordId,
      commandRecordId,
      commandFields,
      featureGateEnabled: featureGate.enabled,
      schedulerGateEnabled: schedulerGate.enabled,
    });
  }

  const currentStatus = safeString(commandFields?.Status) || "UNKNOWN";
  const currentStatusSelect = safeString(commandFields?.Status_select) || "UNKNOWN";
  const capability = safeString(commandFields?.Capability) || "UNKNOWN";
  const targetMode = safeString(commandFields?.Target_Mode) || "UNKNOWN";
  const queueAllowed = checkboxValue(commandFields?.Queue_Allowed);
  const runCreationAllowed = checkboxValue(commandFields?.Run_Creation_Allowed);
  const workerCallAllowed = checkboxValue(commandFields?.Worker_Call_Allowed);
  const realRun = safeString(commandFields?.Real_Run) || "UNKNOWN";
  const secretExposure = safeString(commandFields?.Secret_Exposure) || "UNKNOWN";
  const operatorIdentity = safeString(commandFields?.Operator_Identity) || "Arthur";

  const updateFields = buildUpdateFields({
    workspaceId,
    incidentId,
    intentRecordId,
    approvalRecordId,
    commandRecordId,
    operatorIdentity,
  });

  const inputJson =
    parseJsonObject(commandFields?.Input_JSON) ??
    buildInputJson({
      workspaceId,
      incidentId,
      intentRecordId,
      approvalRecordId,
      commandRecordId,
      operatorIdentity,
    });

  const operationalQueuePersisted = isOperationalQueuePersisted(commandFields);

  const payload = {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status,
    mode: "GATED_OPERATIONAL_QUEUE_PERSISTENCE_PAGE_READ_ONLY",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,
    feature_gate_env: featureGate.env,
    feature_gate_enabled: featureGate.enabled,
    feature_gate_state: featureGate.state,
    scheduler_review_gate_env: schedulerGate.env,
    scheduler_review_gate_enabled: schedulerGate.enabled,
    scheduler_review_gate_state: schedulerGate.state,
    command_record_id: commandRecordId,
    current_command_status: currentStatus,
    current_status_select: currentStatusSelect,
    proposed_command_status: "Queued",
    proposed_status_select: "Queued",
    operational_queue_status: operationalQueuePersisted
      ? "OPERATIONAL_QUEUE_PERSISTED"
      : "NOT_PERSISTED",
    operational_queue: operationalQueuePersisted ? "PERSISTED" : "DISABLED",
    status_mutation: operationalQueuePersisted ? "PERSISTED" : "DISABLED",
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    read_error: readError,
    airtable_update_preview: {
      method: "PATCH",
      target_table: getCommandsTable(),
      target_record_id: commandRecordId,
      write_from_page: false,
      fields: updateFields,
    },
    operational_queue_payload: inputJson,
    safety_checklist: {
      intent_found: Boolean(intentRecordId),
      approval_found: Boolean(approvalRecordId),
      command_found: Boolean(commandRecordId),
      queue_intent_persisted: isQueueIntentPersisted(commandFields),
      queue_allowed_true: queueAllowed,
      feature_gate_enabled: featureGate.enabled,
      scheduler_review_gate_enabled: schedulerGate.enabled,
      scheduler_risk_ack_required: true,
      run_creation_still_disabled: runCreationAllowed !== true,
      worker_call_still_disabled: workerCallAllowed !== true,
      real_run_forbidden: realRun === "Forbidden",
      secret_exposure_disabled: secretExposure === "Disabled",
      no_run_created: true,
      no_worker_called: true,
      no_post_run: true,
    },
  };

  const incidentHref = withWorkspace(`/incidents/${incidentId}`, workspaceId);
  const v518Href = withWorkspace(
    `/incidents/${incidentId}/operational-queue-transition-preview`,
    workspaceId
  );
  const v517Href = withWorkspace(
    `/incidents/${incidentId}/operational-queue-readiness-review`,
    workspaceId
  );
  const v516Href = withWorkspace(
    `/incidents/${incidentId}/gated-command-queue-persistence`,
    workspaceId
  );
  const v515Href = withWorkspace(
    `/incidents/${incidentId}/controlled-command-queue-preview`,
    workspaceId
  );
  const v514Href = withWorkspace(
    `/incidents/${incidentId}/command-draft-review-surface`,
    workspaceId
  );
  const v513Href = withWorkspace(
    `/incidents/${incidentId}/gated-command-draft-persistence`,
    workspaceId
  );
  const v512Href = withWorkspace(
    `/incidents/${incidentId}/operator-approved-command-draft-preview`,
    workspaceId
  );
  const v511Href = withWorkspace(
    `/incidents/${incidentId}/gated-audited-operator-approval-persistence`,
    workspaceId
  );
  const v510Href = withWorkspace(
    `/incidents/${incidentId}/audited-operator-approval-draft`,
    workspaceId
  );
  const v59Href = withWorkspace(
    `/incidents/${incidentId}/operator-intent-review-surface`,
    workspaceId
  );
  const v58Href = withWorkspace(
    `/incidents/${incidentId}/gated-audited-intent-persistence`,
    workspaceId
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 text-white sm:px-6 lg:px-8">
      <Card tone={operationalQueuePersisted ? "green" : featureGate.enabled ? "amber" : "red"}>
        <Eyebrow>Gated Operational Queue Persistence</Eyebrow>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl">
          Persistance queue opérationnelle
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-10 text-white/60">
          V5.19 est le premier palier autorisé à persister la mutation Draft →
          Queued, uniquement derrière double gate, POST serveur contrôlé,
          confirmation opérateur et acknowledgement scheduler risk.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Badge tone="neutral">{VERSION}</Badge>
          <Badge tone={operationalQueuePersisted ? "green" : featureGate.enabled ? "amber" : "red"}>
            {status}
          </Badge>
          <Badge tone="amber">GATED STATUS MUTATION</Badge>
          <Badge tone="red">NO RUN</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Previous Layer Validated</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Previous Version" value="Incident Detail V5.18" tone="green" />
          <DataTile label="Operational Queue Transition Preview" value="VALIDATED" tone="green" />
          <DataTile label="Draft → Queued Preview Ready" value="YES" tone="green" />
          <DataTile label="write_sent" value="false" tone="green" />
          <DataTile label="No Run / No Worker" value="CONFIRMED" tone="red" />
        </div>
      </Card>

      <Card tone={featureGate.enabled && schedulerGate.enabled ? "green" : "red"}>
        <Eyebrow>Operational Queue Gates</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Feature Gate Env" value={featureGate.env} tone="cyan" />
          <DataTile label="Feature Gate Status" value={featureGate.enabled ? "ENABLED" : "DISABLED"} tone={featureGate.enabled ? "green" : "red"} />
          <DataTile label="Scheduler Review Gate Env" value={schedulerGate.env} tone="cyan" />
          <DataTile label="Scheduler Review Gate Status" value={schedulerGate.enabled ? "ENABLED" : "DISABLED"} tone={schedulerGate.enabled ? "green" : "red"} />
          <DataTile label="Required Confirmation Token" value={REQUIRED_CONFIRMATION} tone="amber" />
          <DataTile label="Required Scheduler Acknowledgement" value={REQUIRED_SCHEDULER_ACK} tone="amber" />
          <DataTile label="POST Required" value="YES" tone="amber" />
          <DataTile label="Write From Page" value="NO" tone="red" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Command Source</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Command Record ID" value={commandRecordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Command Draft ID" value={buildCommandDraftId(workspaceId, incidentId)} tone="cyan" />
          <DataTile label="Command Idempotency Key" value={buildCommandIdempotencyKey(workspaceId, incidentId)} tone="cyan" />
          <DataTile label="Current Status" value={currentStatus} tone={currentStatus === "Queued" ? "green" : currentStatus === "Draft" ? "amber" : "red"} />
          <DataTile label="Current Status Select" value={currentStatusSelect} tone={currentStatusSelect === "Queued" ? "green" : currentStatusSelect === "Draft" ? "amber" : "red"} />
          <DataTile label="Queue Allowed" value={String(queueAllowed)} tone={queueAllowed ? "green" : "red"} />
          <DataTile label="Run Creation Allowed" value={String(runCreationAllowed)} tone={runCreationAllowed ? "red" : "green"} />
          <DataTile label="Worker Call Allowed" value={String(workerCallAllowed)} tone={workerCallAllowed ? "red" : "green"} />
          <DataTile label="Capability" value={capability} tone={capability === "command_orchestrator" ? "green" : "amber"} />
          <DataTile label="Target Mode" value={safeString(commandFields?.Target_Mode) || "UNKNOWN"} tone="cyan" />
          <DataTile label="Workspace ID" value={workspaceId} tone="cyan" />
          <DataTile label="Incident ID" value={incidentId} tone="cyan" />
          <DataTile label="Intent Record ID" value={intentRecordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Approval Record ID" value={approvalRecordId ?? "NOT_FOUND"} tone="cyan" />
        </div>
      </Card>

      <Card tone="amber">
        <Eyebrow>Operational Queue Persistence Contract</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Operational Queue Transition ID" value={buildOperationalQueueTransitionId(workspaceId, incidentId)} tone="amber" />
          <DataTile label="Operational Queue Transition Idempotency Key" value={buildOperationalQueueTransitionIdempotencyKey(workspaceId, incidentId)} tone="amber" />
          <DataTile label="From Status" value="Draft" tone="amber" />
          <DataTile label="From Status Select" value="Draft" tone="amber" />
          <DataTile label="To Status" value="Queued" tone="green" />
          <DataTile label="To Status Select" value="Queued" tone="green" />
          <DataTile label="Status Mutation" value={operationalQueuePersisted ? "PERSISTED" : "DISABLED"} tone={operationalQueuePersisted ? "green" : "red"} />
          <DataTile label="Operational Queue" value={operationalQueuePersisted ? "PERSISTED" : "DISABLED"} tone={operationalQueuePersisted ? "green" : "red"} />
          <DataTile label="Run Creation" value="DISABLED" tone="red" />
          <DataTile label="Worker Call" value="DISABLED_FROM_THIS_SURFACE" tone="red" />
        </div>
      </Card>

      <Card tone="amber">
        <Eyebrow>Airtable Update Preview</Eyebrow>
        <JsonBlock value={updateFields} />
      </Card>

      <Card tone="cyan">
        <Eyebrow>Operational Queue Payload</Eyebrow>
        <JsonBlock value={inputJson} />
      </Card>

      <Card tone="green">
        <Eyebrow>Safety Checklist</Eyebrow>

        <div className="grid gap-4">
          {Object.entries(payload.safety_checklist).map(([key, value]) => (
            <DataTile
              key={key}
              label={key}
              value={String(value)}
              tone={value === true ? "green" : "red"}
            />
          ))}
        </div>
      </Card>

      <Card tone="red">
        <Eyebrow>Scheduler Risk Control</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="scheduler_review_gate_required" value="true" tone="red" />
          <DataTile label="scheduler_risk_acknowledgement_required" value="true" tone="red" />
          <DataTile label="queued_status_may_trigger_worker" value="POSSIBLE" tone="red" />
          <DataTile label="run_creation_separate_gate_required" value="true" tone="red" />
          <DataTile label="worker_execution_separate_gate_required" value="true" tone="red" />
        </div>
      </Card>

      <Card tone="red">
        <Eyebrow>Execution Lock</Eyebrow>

        <div className="flex flex-wrap gap-3">
          <Badge tone="amber">STATUS MUTATION GATED</Badge>
          <Badge tone="red">NO RUN CREATION</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
          <Badge tone="red">NO POST /RUN</Badge>
          <Badge tone="red">NO REAL RUN</Badge>
          <Badge tone="red">NO SECRET EXPOSURE</Badge>
          <Badge tone="red">SCHEDULER RISK ACK REQUIRED</Badge>
          <Badge tone="amber">FEATURE GATED</Badge>
        </div>

        <button
          type="button"
          disabled
          className="mt-8 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white/30"
        >
          Persistance queue via POST contrôlé uniquement
        </button>
      </Card>

      <Card>
        <Eyebrow>Operational Queue Persistence Payload</Eyebrow>
        <JsonBlock value={payload} />
      </Card>

      <Card>
        <Eyebrow>Navigation</Eyebrow>

        <div className="grid gap-4">
          <Link
            href={incidentHref}
            className="block rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black text-white transition hover:bg-white/[0.07]"
          >
            Retour incident
          </Link>

          <NavButton href={v518Href}>Retour V5.18 operational queue transition preview</NavButton>
          <NavButton href={v517Href}>Retour V5.17 operational queue readiness</NavButton>
          <NavButton href={v516Href}>Retour V5.16 gated queue persistence</NavButton>
          <NavButton href={v515Href}>Retour V5.15 controlled queue preview</NavButton>
          <NavButton href={v514Href}>Retour V5.14 command draft review</NavButton>
          <NavButton href={v513Href}>Retour V5.13 command draft persistence</NavButton>
          <NavButton href={v512Href}>Retour V5.12 command draft preview</NavButton>
          <NavButton href={v511Href}>Retour V5.11 approval persistence</NavButton>
          <NavButton href={v510Href}>Retour V5.10 approval draft</NavButton>
          <NavButton href={v59Href}>Retour V5.9 intent review</NavButton>
          <NavButton href={v58Href}>Retour V5.8 gated persistence</NavButton>
        </div>
      </Card>
    </main>
  );
}
