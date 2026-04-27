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

type OperationalQueueReviewStatus =
  | "OPERATIONAL_QUEUE_REVIEW_READY"
  | "OPERATIONAL_QUEUE_REVIEW_CONFIG_MISSING"
  | "OPERATIONAL_QUEUE_REVIEW_READ_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "COMMAND_NOT_FOUND"
  | "OPERATIONAL_QUEUE_NOT_PERSISTED"
  | "COMMAND_STATUS_NOT_QUEUED"
  | "OPERATIONAL_QUEUE_REVIEW_NOT_SAFE";

type AirtableRecordResult = {
  ok: boolean;
  status: number | null;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

const VERSION = "Incident Detail V5.20";
const SOURCE =
  "dashboard_incident_detail_v5_20_operational_queue_review_after_persistence";

const PREVIOUS_VERSION = "Incident Detail V5.19";
const PREVIOUS_SOURCE =
  "dashboard_incident_detail_v5_19_gated_operational_queue_persistence";

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

function isReviewSafe(fields: Record<string, unknown> | null): boolean {
  const inputJson = getInputJson(fields);
  const metadata = getInputMetadata(fields);

  return (
    isQueued(fields) &&
    safeString(fields?.Source_Layer) === PREVIOUS_VERSION &&
    safeString(inputJson?.source) === PREVIOUS_SOURCE &&
    safeString(inputJson?.queue_intent_status) === "QUEUE_INTENT_PERSISTED" &&
    safeString(inputJson?.operational_queue_status) ===
      "OPERATIONAL_QUEUE_PERSISTED" &&
    metadata?.scheduler_risk_acknowledged === true &&
    metadata?.status_mutation_persisted === true &&
    metadata?.operational_queue_persisted === true &&
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
}): OperationalQueueReviewStatus {
  if (!input.stateOk) return "OPERATIONAL_QUEUE_REVIEW_READ_FAILED";
  if (!input.intentRecordId) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!input.approvalRecordId) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (!input.commandRecordId) return "COMMAND_NOT_FOUND";
  if (!isQueued(input.commandFields)) return "COMMAND_STATUS_NOT_QUEUED";
  if (!isOperationalQueuePersisted(input.commandFields)) {
    return "OPERATIONAL_QUEUE_NOT_PERSISTED";
  }
  if (!isReviewSafe(input.commandFields)) {
    return "OPERATIONAL_QUEUE_REVIEW_NOT_SAFE";
  }

  return "OPERATIONAL_QUEUE_REVIEW_READY";
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

export default async function OperationalQueueReviewAfterPersistencePage(
  props: PageProps
) {
  const params = await Promise.resolve(props.params);
  const searchParams = await Promise.resolve(props.searchParams ?? {});

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    firstSearchParam(searchParams, "workspace_id") ??
      firstSearchParam(searchParams, "workspaceId")
  );

  const token = getAirtableToken();
  const baseId = getAirtableBaseId();

  let status: OperationalQueueReviewStatus =
    "OPERATIONAL_QUEUE_REVIEW_CONFIG_MISSING";
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
  const queueAllowed = checkboxValue(commandFields?.Queue_Allowed);
  const runCreationAllowed = checkboxValue(commandFields?.Run_Creation_Allowed);
  const workerCallAllowed = checkboxValue(commandFields?.Worker_Call_Allowed);
  const realRun = safeString(commandFields?.Real_Run) || "UNKNOWN";
  const secretExposure = safeString(commandFields?.Secret_Exposure) || "UNKNOWN";

  const operationalQueuePersisted = isOperationalQueuePersisted(commandFields);

  const postPersistenceReviewCheck = {
    intent_found: Boolean(intentRecordId),
    approval_found: Boolean(approvalRecordId),
    command_found: Boolean(commandRecordId),
    command_status_is_queued: currentStatus === "Queued",
    status_select_is_queued: currentStatusSelect === "Queued",
    source_layer_is_v519: sourceLayer === PREVIOUS_VERSION,
    queue_intent_persisted:
      safeString(inputJson?.queue_intent_status) === "QUEUE_INTENT_PERSISTED",
    operational_queue_persisted: operationalQueuePersisted,
    scheduler_risk_acknowledged: metadata?.scheduler_risk_acknowledged === true,
    status_mutation_persisted: metadata?.status_mutation_persisted === true,
    run_creation_still_disabled: runCreationAllowed !== true,
    worker_call_still_disabled: workerCallAllowed !== true,
    real_run_forbidden: realRun === "Forbidden",
    secret_exposure_disabled: secretExposure === "Disabled",
    no_run_created_by_this_surface: true,
    no_worker_called_by_this_surface: true,
    no_post_run_by_this_surface: true,
  };

  const payload = {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status,
    mode: "OPERATIONAL_QUEUE_REVIEW_AFTER_PERSISTENCE_PAGE_READ_ONLY",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,
    command_record_id: commandRecordId,
    current_command_status: currentStatus,
    current_status_select: currentStatusSelect,
    operational_queue_status: operationalQueuePersisted
      ? "OPERATIONAL_QUEUE_PERSISTED"
      : "NOT_PERSISTED",
    operational_queue_review:
      status === "OPERATIONAL_QUEUE_REVIEW_READY" ? "READY" : "BLOCKED",
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    read_error: readError,
    operational_queue_payload: inputJson,
    post_persistence_review_check: postPersistenceReviewCheck,
    scheduler_aftereffect_review: {
      external_scheduler_effect: "NOT_VERIFIED_FROM_THIS_SURFACE",
      scheduler_follow_up_required: true,
      queued_status_may_have_external_consumers: "POSSIBLE",
      worker_side_verification_required_before_run_creation: true,
      note:
        "This surface confirms Dashboard-side guardrails only. It does not inspect external scheduler execution.",
    },
    guardrails: {
      client_fetch: "DISABLED",
      airtable_mutation: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_creation: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      secret_exposure: "DISABLED",
      review_only: true,
    },
  };

  const futureRunCreationRequirements = [
    "Run creation must have a dedicated feature gate",
    "Run creation must require explicit operator confirmation",
    "Run creation preview must happen before any run persistence",
    "Worker execution must remain gated separately",
    "POST /run must remain disabled until execution gate",
    "Command must remain linked to intent, approval, and queue transition",
    "Scheduler aftereffects must be reviewed before enabling execution",
    "No secret exposure is allowed",
  ];

  const incidentHref = withWorkspace(`/incidents/${incidentId}`, workspaceId);
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
      <Card tone={status === "OPERATIONAL_QUEUE_REVIEW_READY" ? "green" : "red"}>
        <Eyebrow>Operational Queue Review After Persistence</Eyebrow>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl">
          Review queue opérationnelle
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-10 text-white/60">
          V5.20 relit la Command après la persistance V5.19. Cette surface
          confirme la queue côté Dashboard, sans créer de Run, sans appeler le
          worker et sans vérifier les effets éventuels d’un scheduler externe.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Badge tone="neutral">{VERSION}</Badge>
          <Badge tone={status === "OPERATIONAL_QUEUE_REVIEW_READY" ? "green" : "red"}>
            {status}
          </Badge>
          <Badge tone="green">QUEUED PERSISTED</Badge>
          <Badge tone="cyan">REVIEW ONLY</Badge>
          <Badge tone="red">NO RUN</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Previous Layer Validated</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Previous Version" value="Incident Detail V5.19" tone="green" />
          <DataTile label="Operational Queue Persistence" value="VALIDATED" tone="green" />
          <DataTile label="Draft → Queued Persisted" value="YES" tone="green" />
          <DataTile label="No Run / No Worker From This Surface" value="CONFIRMED" tone="red" />
        </div>
      </Card>

      <Card tone={operationalQueuePersisted ? "green" : "red"}>
        <Eyebrow>Persisted Operational Queue State</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Command Record ID" value={commandRecordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Command Draft ID" value={buildCommandDraftId(workspaceId, incidentId)} tone="cyan" />
          <DataTile label="Command Idempotency Key" value={buildCommandIdempotencyKey(workspaceId, incidentId)} tone="cyan" />
          <DataTile label="Current Status" value={currentStatus} tone={currentStatus === "Queued" ? "green" : "red"} />
          <DataTile label="Current Status Select" value={currentStatusSelect} tone={currentStatusSelect === "Queued" ? "green" : "red"} />
          <DataTile
            label="Operational Queue Status"
            value={operationalQueuePersisted ? "OPERATIONAL_QUEUE_PERSISTED" : "NOT_PERSISTED"}
            tone={operationalQueuePersisted ? "green" : "red"}
          />
          <DataTile label="Source Layer" value={sourceLayer} tone={sourceLayer === PREVIOUS_VERSION ? "green" : "red"} />
          <DataTile label="Queue Allowed" value={String(queueAllowed)} tone={queueAllowed ? "green" : "red"} />
          <DataTile label="Run Creation Allowed" value={String(runCreationAllowed)} tone={runCreationAllowed ? "red" : "green"} />
          <DataTile label="Worker Call Allowed" value={String(workerCallAllowed)} tone={workerCallAllowed ? "red" : "green"} />
          <DataTile label="Real Run" value={realRun} tone={realRun === "Forbidden" ? "green" : "red"} />
          <DataTile label="Secret Exposure" value={secretExposure} tone={secretExposure === "Disabled" ? "green" : "red"} />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Operational Queue Payload</Eyebrow>
        <JsonBlock value={inputJson ?? "Input_JSON missing or unparsable"} />
      </Card>

      <Card tone="green">
        <Eyebrow>Post Persistence Review Check</Eyebrow>

        <div className="grid gap-4">
          {Object.entries(postPersistenceReviewCheck).map(([key, value]) => (
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
        <Eyebrow>Scheduler Aftereffect Review</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="external_scheduler_effect" value="NOT_VERIFIED_FROM_THIS_SURFACE" tone="amber" />
          <DataTile label="scheduler_follow_up_required" value="true" tone="amber" />
          <DataTile label="queued_status_may_have_external_consumers" value="POSSIBLE" tone="amber" />
          <DataTile label="worker_side_verification_required_before_run_creation" value="true" tone="amber" />
        </div>

        <p className="mt-6 rounded-[1.5rem] border border-yellow-400/20 bg-yellow-500/10 p-5 text-sm font-semibold leading-7 text-yellow-100/85">
          Cette surface confirme les garde-fous côté Dashboard uniquement. Elle
          ne prouve pas l’absence d’effet d’un scheduler externe.
        </p>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Future Run Creation Requirements</Eyebrow>

        <div className="grid gap-3">
          {futureRunCreationRequirements.map((item) => (
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
          <Badge tone="cyan">REVIEW ONLY</Badge>
          <Badge tone="green">QUEUED PERSISTED</Badge>
          <Badge tone="red">NO RUN CREATION</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
          <Badge tone="red">NO POST /RUN</Badge>
          <Badge tone="red">NO REAL RUN</Badge>
          <Badge tone="red">NO SECRET EXPOSURE</Badge>
          <Badge tone="amber">RUN CREATION FUTURE GATE REQUIRED</Badge>
        </div>

        <button
          type="button"
          disabled
          className="mt-8 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white/30"
        >
          Run creation future non activée
        </button>
      </Card>

      <Card>
        <Eyebrow>Read-only Operational Queue Review Payload</Eyebrow>
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
