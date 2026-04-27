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

type RunCreationPreviewStatus =
  | "RUN_CREATION_PREVIEW_READY"
  | "RUN_CREATION_PREVIEW_CONFIG_MISSING"
  | "RUN_CREATION_PREVIEW_READ_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "COMMAND_NOT_FOUND"
  | "COMMAND_STATUS_NOT_QUEUED"
  | "OPERATIONAL_QUEUE_NOT_PERSISTED"
  | "RUN_CREATION_PREVIEW_NOT_SAFE";

type AirtableRecordResult = {
  ok: boolean;
  status: number | null;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

const VERSION = "Incident Detail V5.21";
const SOURCE = "dashboard_incident_detail_v5_21_run_creation_preview";

const COMMAND_SOURCE_LAYER = "Incident Detail V5.19";

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

function safeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function checkboxValue(value: unknown): boolean {
  return value === true;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;

  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function getInputJson(fields: Record<string, unknown> | null): Record<string, unknown> | null {
  return parseJsonObject(fields?.Input_JSON);
}

function getInputMetadata(fields: Record<string, unknown> | null): Record<string, unknown> | null {
  return asRecord(getInputJson(fields)?.metadata);
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

function buildRunDraftId(workspaceId: string, incidentId: string): string {
  return `run-draft:v5.21:${workspaceId}:${incidentId}`;
}

function buildRunIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.21:run-creation-preview:${workspaceId}:${incidentId}`;
}

function escapeAirtableFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function isQueued(fields: Record<string, unknown> | null): boolean {
  return (
    safeString(fields?.Status) === "Queued" &&
    safeString(fields?.Status_select) === "Queued"
  );
}

function isOperationalQueuePersisted(fields: Record<string, unknown> | null): boolean {
  const inputJson = getInputJson(fields);
  const metadata = getInputMetadata(fields);

  return (
    isQueued(fields) &&
    safeString(inputJson?.operational_queue_status) ===
      "OPERATIONAL_QUEUE_PERSISTED" &&
    metadata?.operational_queue_persisted === true &&
    metadata?.status_mutation_persisted === true
  );
}

function isRunCreationPreviewSafe(fields: Record<string, unknown> | null): boolean {
  return (
    isOperationalQueuePersisted(fields) &&
    safeString(fields?.Source_Layer) === COMMAND_SOURCE_LAYER &&
    checkboxValue(fields?.Run_Creation_Allowed) !== true &&
    checkboxValue(fields?.Worker_Call_Allowed) !== true &&
    safeString(fields?.Real_Run) === "Forbidden" &&
    safeString(fields?.Secret_Exposure) === "Disabled"
  );
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
      error: text.slice(0, 1600),
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
}): RunCreationPreviewStatus {
  if (!input.stateOk) return "RUN_CREATION_PREVIEW_READ_FAILED";
  if (!input.intentRecordId) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!input.approvalRecordId) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (!input.commandRecordId) return "COMMAND_NOT_FOUND";
  if (!isQueued(input.commandFields)) return "COMMAND_STATUS_NOT_QUEUED";
  if (!isOperationalQueuePersisted(input.commandFields)) {
    return "OPERATIONAL_QUEUE_NOT_PERSISTED";
  }
  if (!isRunCreationPreviewSafe(input.commandFields)) {
    return "RUN_CREATION_PREVIEW_NOT_SAFE";
  }

  return "RUN_CREATION_PREVIEW_READY";
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

export default async function RunCreationPreviewPage(props: PageProps) {
  const params = await Promise.resolve(props.params);
  const searchParams = await Promise.resolve(props.searchParams ?? {});

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    firstSearchParam(searchParams, "workspace_id") ??
      firstSearchParam(searchParams, "workspaceId")
  );

  const token = getAirtableToken();
  const baseId = getAirtableBaseId();

  let status: RunCreationPreviewStatus = "RUN_CREATION_PREVIEW_CONFIG_MISSING";
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
    });
  }

  const inputJson = getInputJson(commandFields);
  const metadata = getInputMetadata(commandFields);

  const currentStatus = safeString(commandFields?.Status) || "UNKNOWN";
  const currentStatusSelect = safeString(commandFields?.Status_select) || "UNKNOWN";
  const sourceLayer = safeString(commandFields?.Source_Layer) || "UNKNOWN";
  const capability = safeString(commandFields?.Capability) || "command_orchestrator";
  const targetMode = safeString(commandFields?.Target_Mode) || "UNKNOWN";
  const queueAllowed = checkboxValue(commandFields?.Queue_Allowed);
  const runCreationAllowed = checkboxValue(commandFields?.Run_Creation_Allowed);
  const workerCallAllowed = checkboxValue(commandFields?.Worker_Call_Allowed);
  const realRun = safeString(commandFields?.Real_Run) || "UNKNOWN";
  const secretExposure = safeString(commandFields?.Secret_Exposure) || "UNKNOWN";

  const commandDraftId = buildCommandDraftId(workspaceId, incidentId);
  const commandIdempotencyKey = buildCommandIdempotencyKey(workspaceId, incidentId);
  const operationalQueueTransitionId = buildOperationalQueueTransitionId(
    workspaceId,
    incidentId
  );
  const runDraftId = buildRunDraftId(workspaceId, incidentId);
  const runIdempotencyKey = buildRunIdempotencyKey(workspaceId, incidentId);

  const operationalQueuePersisted = isOperationalQueuePersisted(commandFields);

  const runPayloadPreview = {
    run_id: runDraftId,
    idempotency_key: runIdempotencyKey,
    status: "Draft",
    workspace_id: workspaceId,
    incident_id: incidentId,
    command_record_id: commandRecordId,
    command_id: commandDraftId,
    capability,
    dry_run: true,
    source: SOURCE,
    metadata: {
      origin: "run_creation_preview",
      intent_record_id: intentRecordId,
      approval_record_id: approvalRecordId,
      command_record_id: commandRecordId,
      operational_queue_transition_id: operationalQueueTransitionId,
      operator_identity:
        safeString(commandFields?.Operator_Identity) ||
        safeString(metadata?.operator_identity) ||
        "UNKNOWN",
      run_creation_allowed_now: false,
      run_persistence_allowed_now: false,
      post_run_allowed_now: false,
      worker_call_allowed_now: false,
      real_run_forbidden: true,
    },
  };

  const runCreationReadinessCheck = {
    intent_found: Boolean(intentRecordId),
    approval_found: Boolean(approvalRecordId),
    command_found: Boolean(commandRecordId),
    command_status_is_queued: currentStatus === "Queued",
    status_select_is_queued: currentStatusSelect === "Queued",
    operational_queue_persisted: operationalQueuePersisted,
    source_layer_is_v519: sourceLayer === COMMAND_SOURCE_LAYER,
    run_creation_still_disabled: runCreationAllowed !== true,
    run_persistence_still_disabled: true,
    post_run_still_disabled: true,
    worker_call_still_disabled: workerCallAllowed !== true,
    real_run_forbidden: realRun === "Forbidden",
    secret_exposure_disabled: secretExposure === "Disabled",
    run_idempotency_key_present: runIdempotencyKey.length > 0,
    run_creation_feature_gate_required: true,
    explicit_operator_confirmation_required: true,
  };

  const payload = {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status,
    mode: "RUN_CREATION_PREVIEW_PAGE_READ_ONLY",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,
    command_record_id: commandRecordId,
    current_command_status: currentStatus,
    current_status_select: currentStatusSelect,
    operational_queue_status: operationalQueuePersisted
      ? "OPERATIONAL_QUEUE_PERSISTED"
      : "NOT_PERSISTED",
    run_draft_id: runDraftId,
    run_idempotency_key: runIdempotencyKey,
    run_preview_status:
      status === "RUN_CREATION_PREVIEW_READY" ? "READY_NOT_PERSISTED" : "BLOCKED",
    run_creation: "DISABLED",
    run_persistence: "DISABLED",
    run_creation_by_this_surface: "DISABLED",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    read_error: readError,
    run_creation_preview: {
      type: "run_creation_preview",
      target_table: "System_Runs",
      target_status: "Draft",
      run_draft_id: runDraftId,
      run_idempotency_key: runIdempotencyKey,
      source_command_record_id: commandRecordId,
      source_command_id: commandDraftId,
      workspace_id: workspaceId,
      incident_id: incidentId,
      capability,
      dry_run: true,
      run_creation_allowed_now: false,
      run_persistence_allowed_now: false,
      post_run_allowed_now: false,
      worker_call_allowed_now: false,
      requires_dedicated_run_creation_feature_gate: true,
      requires_explicit_operator_confirmation: true,
      requires_run_persistence_preview_before_write: true,
      requires_worker_execution_separate_gate: true,
    },
    run_payload_preview: runPayloadPreview,
    run_creation_readiness_check: runCreationReadinessCheck,
    external_effect_review: {
      external_scheduler_effect: "NOT_VERIFIED_FROM_THIS_SURFACE",
      external_run_existence: "NOT_VERIFIED_FROM_THIS_SURFACE",
      worker_side_state: "NOT_VERIFIED_FROM_THIS_SURFACE",
      scheduler_follow_up_required: true,
      note:
        "This surface prepares a Run contract only. It does not inspect external scheduler execution or existing System_Runs.",
    },
    guardrails: {
      client_fetch: "DISABLED",
      airtable_mutation: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_creation: "DISABLED",
      run_persistence: "DISABLED",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      secret_exposure: "DISABLED",
      preview_only: true,
    },
  };

  const futureRunPersistenceRequirements = [
    "Run persistence must have a dedicated feature gate",
    "Run persistence must require explicit operator confirmation",
    "Run idempotency key must be deterministic",
    "Run must remain linked to command, incident, intent, approval, and queue transition",
    "POST /run must remain disabled until execution gate",
    "Worker execution must remain gated separately",
    "Scheduler aftereffects must be reviewed before execution",
    "No secret exposure is allowed",
  ];

  const incidentHref = withWorkspace(`/incidents/${incidentId}`, workspaceId);
  const v520Href = withWorkspace(
    `/incidents/${incidentId}/operational-queue-review-after-persistence`,
    workspaceId
  );
  const v519Href = withWorkspace(
    `/incidents/${incidentId}/gated-operational-queue-persistence`,
    workspaceId
  );
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
      <Card tone={status === "RUN_CREATION_PREVIEW_READY" ? "green" : "red"}>
        <Eyebrow>Run Creation Preview</Eyebrow>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl">
          Preview création de Run
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-10 text-white/60">
          V5.21 prépare le contrat d’un futur Run à partir de la Command déjà en
          queue. Cette surface ne crée aucun Run, ne persiste rien dans
          System_Runs, ne fait aucun POST /run et n’appelle aucun worker.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Badge tone="neutral">{VERSION}</Badge>
          <Badge tone={status === "RUN_CREATION_PREVIEW_READY" ? "green" : "red"}>
            {status}
          </Badge>
          <Badge tone="cyan">PREVIEW ONLY</Badge>
          <Badge tone="red">NO RUN PERSISTENCE</Badge>
          <Badge tone="red">NO POST /RUN</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Previous Layer Validated</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Previous Version" value="Incident Detail V5.20" tone="green" />
          <DataTile label="Operational Queue Review" value="VALIDATED" tone="green" />
          <DataTile label="Command is Queued" value={currentStatus} tone={currentStatus === "Queued" ? "green" : "red"} />
          <DataTile label="No Run / No Worker From This Surface" value="CONFIRMED" tone="red" />
        </div>
      </Card>

      <Card tone={operationalQueuePersisted ? "green" : "red"}>
        <Eyebrow>Queued Command Source</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Command Record ID" value={commandRecordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Command Draft ID" value={commandDraftId} tone="cyan" />
          <DataTile label="Command Idempotency Key" value={commandIdempotencyKey} tone="cyan" />
          <DataTile label="Current Status" value={currentStatus} tone={currentStatus === "Queued" ? "green" : "red"} />
          <DataTile label="Current Status Select" value={currentStatusSelect} tone={currentStatusSelect === "Queued" ? "green" : "red"} />
          <DataTile
            label="Operational Queue Status"
            value={operationalQueuePersisted ? "OPERATIONAL_QUEUE_PERSISTED" : "NOT_PERSISTED"}
            tone={operationalQueuePersisted ? "green" : "red"}
          />
          <DataTile label="Source Layer" value={sourceLayer} tone={sourceLayer === COMMAND_SOURCE_LAYER ? "green" : "red"} />
          <DataTile label="Capability" value={capability} tone="cyan" />
          <DataTile label="Target Mode" value={targetMode} tone={targetMode === "dry_run_only" ? "green" : "amber"} />
          <DataTile label="Workspace ID" value={workspaceId} tone="cyan" />
          <DataTile label="Incident ID" value={incidentId} tone="cyan" />
          <DataTile label="Intent Record ID" value={intentRecordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Approval Record ID" value={approvalRecordId ?? "NOT_FOUND"} tone="cyan" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Run Creation Preview</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Run Draft ID" value={runDraftId} tone="cyan" />
          <DataTile label="Run Idempotency Key" value={runIdempotencyKey} tone="cyan" />
          <DataTile label="Target Table" value="System_Runs" tone="cyan" />
          <DataTile label="Target Status" value="Draft" tone="cyan" />
          <DataTile label="Source Command Record ID" value={commandRecordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Capability" value={capability} tone="cyan" />
          <DataTile label="Run Creation Allowed Now" value="NO" tone="red" />
          <DataTile label="Run Persistence Allowed Now" value="NO" tone="red" />
          <DataTile label="POST /run Allowed Now" value="NO" tone="red" />
          <DataTile label="Worker Call Allowed Now" value="NO" tone="red" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Run Payload Preview</Eyebrow>
        <JsonBlock value={runPayloadPreview} />
      </Card>

      <Card tone="green">
        <Eyebrow>Run Creation Readiness Check</Eyebrow>

        <div className="grid gap-4">
          {Object.entries(runCreationReadinessCheck).map(([key, value]) => (
            <DataTile
              key={key}
              label={key}
              value={String(value)}
              tone={value === true ? "green" : "red"}
            />
          ))}
        </div>
      </Card>

      <Card tone="amber">
        <Eyebrow>External Effect Review</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="external_scheduler_effect" value="NOT_VERIFIED_FROM_THIS_SURFACE" tone="amber" />
          <DataTile label="external_run_existence" value="NOT_VERIFIED_FROM_THIS_SURFACE" tone="amber" />
          <DataTile label="worker_side_state" value="NOT_VERIFIED_FROM_THIS_SURFACE" tone="amber" />
          <DataTile label="scheduler_follow_up_required" value="true" tone="amber" />
        </div>

        <p className="mt-6 rounded-[1.5rem] border border-yellow-400/20 bg-yellow-500/10 p-5 text-sm font-semibold leading-7 text-yellow-100/85">
          Cette surface prépare uniquement un contrat de Run. Elle ne lit pas
          les Runs existants, ne vérifie pas l’état worker et ne prouve pas
          l’absence d’un effet scheduler externe.
        </p>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Future Run Persistence Requirements</Eyebrow>

        <div className="grid gap-3">
          {futureRunPersistenceRequirements.map((item) => (
            <div
              key={item}
              className="rounded-[1.25rem] border border-white/10 bg-black/25 p-4 text-sm font-semibold leading-7 text-white/70"
            >
              {item}
            </div>
          ))}
        </div>
      </Card>

      <Card tone="red">
        <Eyebrow>Execution Lock</Eyebrow>

        <div className="flex flex-wrap gap-3">
          <Badge tone="cyan">PREVIEW ONLY</Badge>
          <Badge tone="red">NO RUN CREATION</Badge>
          <Badge tone="red">NO RUN PERSISTENCE</Badge>
          <Badge tone="red">NO POST /RUN</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
          <Badge tone="red">NO REAL RUN</Badge>
          <Badge tone="red">NO SECRET EXPOSURE</Badge>
          <Badge tone="amber">RUN PERSISTENCE FUTURE GATE REQUIRED</Badge>
        </div>

        <button
          type="button"
          disabled
          className="mt-8 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white/30"
        >
          Run persistence future non activée
        </button>
      </Card>

      <Card>
        <Eyebrow>Read-only Run Creation Preview Payload</Eyebrow>
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

          <NavButton href={v520Href}>Retour V5.20 operational queue review</NavButton>
          <NavButton href={v519Href}>Retour V5.19 gated operational queue persistence</NavButton>
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
