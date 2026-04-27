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

type TransitionPreviewStatus =
  | "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_READY"
  | "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_CONFIG_MISSING"
  | "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_READ_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "COMMAND_DRAFT_NOT_FOUND"
  | "QUEUE_INTENT_NOT_PERSISTED"
  | "COMMAND_STATUS_NOT_DRAFT"
  | "OPERATIONAL_QUEUE_TRANSITION_NOT_SAFE";

type AirtableRecordResult = {
  ok: boolean;
  status: number;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

const VERSION = "Incident Detail V5.18";
const SOURCE =
  "dashboard_incident_detail_v5_18_operational_queue_transition_preview";

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

function buildQueuePreviewId(workspaceId: string, incidentId: string): string {
  return `queue-preview:v5.15:${workspaceId}:${incidentId}`;
}

function buildOperationalQueueTransitionId(
  workspaceId: string,
  incidentId: string
): string {
  return `operational-queue-transition:v5.18:${workspaceId}:${incidentId}`;
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

function buildCommandIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.13:gated-command-draft-persistence:${workspaceId}:${incidentId}`;
}

function buildQueueIntentIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.16:gated-command-queue-persistence:${workspaceId}:${incidentId}`;
}

function buildOperationalQueueTransitionIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.18:operational-queue-transition-preview:${workspaceId}:${incidentId}`;
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

function checkboxValue(value: unknown): boolean {
  return value === true;
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

function isQueueIntentPersisted(fields: Record<string, unknown> | null): boolean {
  if (!fields) return false;

  const parsed = parseJsonObject(fields.Input_JSON);
  const queueIntentStatus = safeString(parsed?.queue_intent_status);
  const sourceLayer = safeString(fields.Source_Layer);

  return (
    queueIntentStatus === "QUEUE_INTENT_PERSISTED" ||
    sourceLayer === "Incident Detail V5.16" ||
    (checkboxValue(fields.Queue_Allowed) && sourceLayer === "Incident Detail V5.16")
  );
}

function buildTransitionPayload(input: {
  workspaceId: string;
  incidentId: string;
  commandRecordId: string | null;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  operatorIdentity: string;
}) {
  return {
    command_record_id: input.commandRecordId,
    command_id: buildCommandDraftId(input.workspaceId, input.incidentId),
    workspace_id: input.workspaceId,
    incident_id: input.incidentId,
    from_status: "Draft",
    from_status_select: "Draft",
    to_status: "Queued",
    to_status_select: "Queued",
    dry_run: true,
    source: SOURCE,
    metadata: {
      origin: "operational_queue_transition_preview",
      queue_intent_status: "QUEUE_INTENT_PERSISTED",
      intent_record_id: input.intentRecordId,
      approval_record_id: input.approvalRecordId,
      operator_identity: input.operatorIdentity,
      status_mutation_allowed_now: false,
      operational_queue_allowed_now: false,
      run_creation_allowed_now: false,
      worker_call_allowed_now: false,
      real_run_forbidden: true,
    },
  };
}

function buildProposedUpdatePreview(input: {
  commandRecordId: string | null;
}) {
  return {
    method: "PATCH",
    target_table: getCommandsTable(),
    target_record_id: input.commandRecordId,
    write_sent: false,
    mutation: "DISABLED",
    fields: {
      Status: "Queued",
      Status_select: "Queued",
      Operational_Queue_Requested: true,
      Operational_Queue_Requested_At: "SERVER_TIME_FUTURE",
      Operational_Queue_Source_Layer: VERSION,
      Run_Creation_Allowed: false,
      Worker_Call_Allowed: false,
      Real_Run: "Forbidden",
      Secret_Exposure: "Disabled",
    },
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

function resolveStatus(input: {
  stateOk: boolean;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  commandFields: Record<string, unknown> | null;
  transitionSafe: boolean;
}): TransitionPreviewStatus {
  if (!input.stateOk) return "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_READ_FAILED";
  if (!input.intentRecordId) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!input.approvalRecordId) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (!input.commandRecordId) return "COMMAND_DRAFT_NOT_FOUND";

  const status = safeString(input.commandFields?.Status);
  const statusSelect = safeString(input.commandFields?.Status_select);

  if (!(status === "Draft" && statusSelect === "Draft")) {
    return "COMMAND_STATUS_NOT_DRAFT";
  }

  if (!isQueueIntentPersisted(input.commandFields)) {
    return "QUEUE_INTENT_NOT_PERSISTED";
  }

  if (!input.transitionSafe) return "OPERATIONAL_QUEUE_TRANSITION_NOT_SAFE";

  return "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_READY";
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

export default async function OperationalQueueTransitionPreviewPage(
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

  let status: TransitionPreviewStatus =
    "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_CONFIG_MISSING";
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
    readError = state.intent.error ?? state.approval.error ?? state.command.error ?? state.reason;

    const inputJson = parseJsonObject(commandFields?.Input_JSON);

    const transitionSafe =
      Boolean(intentRecordId) &&
      Boolean(approvalRecordId) &&
      Boolean(commandRecordId) &&
      safeString(commandFields?.Status) === "Draft" &&
      safeString(commandFields?.Status_select) === "Draft" &&
      isQueueIntentPersisted(commandFields) &&
      checkboxValue(commandFields?.Queue_Allowed) === true &&
      checkboxValue(commandFields?.Run_Creation_Allowed) !== true &&
      checkboxValue(commandFields?.Worker_Call_Allowed) !== true &&
      safeString(commandFields?.Real_Run) === "Forbidden" &&
      safeString(commandFields?.Secret_Exposure) === "Disabled" &&
      safeString(inputJson?.queue_intent_status) === "QUEUE_INTENT_PERSISTED";

    status = resolveStatus({
      stateOk: state.ok,
      intentRecordId,
      approvalRecordId,
      commandRecordId,
      commandFields,
      transitionSafe,
    });
  }

  const inputJson = parseJsonObject(commandFields?.Input_JSON);
  const commandStatus = safeString(commandFields?.Status) || "UNKNOWN";
  const statusSelect = safeString(commandFields?.Status_select) || "UNKNOWN";
  const capability = safeString(commandFields?.Capability) || "UNKNOWN";
  const targetMode = safeString(commandFields?.Target_Mode) || "UNKNOWN";
  const queueAllowed = checkboxValue(commandFields?.Queue_Allowed);
  const runCreationAllowed = checkboxValue(commandFields?.Run_Creation_Allowed);
  const workerCallAllowed = checkboxValue(commandFields?.Worker_Call_Allowed);
  const realRun = safeString(commandFields?.Real_Run) || "UNKNOWN";
  const secretExposure = safeString(commandFields?.Secret_Exposure) || "UNKNOWN";
  const operatorIdentity = safeString(commandFields?.Operator_Identity) || "UNKNOWN";

  const proposedUpdatePreview = buildProposedUpdatePreview({
    commandRecordId,
  });

  const transitionPayloadPreview = buildTransitionPayload({
    workspaceId,
    incidentId,
    commandRecordId,
    intentRecordId,
    approvalRecordId,
    operatorIdentity,
  });

  const transitionReadinessCheck = {
    intent_found: Boolean(intentRecordId),
    approval_found: Boolean(approvalRecordId),
    command_found: Boolean(commandRecordId),
    command_status_is_draft: commandStatus === "Draft",
    status_select_is_draft: statusSelect === "Draft",
    queue_intent_persisted: isQueueIntentPersisted(commandFields),
    queue_allowed_true: queueAllowed === true,
    run_creation_still_disabled: runCreationAllowed !== true,
    worker_call_still_disabled: workerCallAllowed !== true,
    real_run_forbidden: realRun === "Forbidden",
    secret_exposure_disabled: secretExposure === "Disabled",
    input_json_contains_queue_intent:
      safeString(inputJson?.queue_intent_status) === "QUEUE_INTENT_PERSISTED",
    proposed_transition_is_draft_to_queued: true,
    write_sent_false: true,
    status_mutation_disabled: true,
    operational_queue_disabled: true,
  };

  const schedulerRiskReview = {
    scheduler_consumes_queued_status: "UNKNOWN",
    queued_status_may_trigger_worker: "POSSIBLE",
    safe_to_mutate_status_now: false,
    required_before_real_queue: [
      "Confirm scheduler does not auto-execute Queued commands unexpectedly",
      "Confirm worker execution remains separately gated",
      "Confirm Run creation is not triggered by status mutation alone",
      "Confirm rollback path exists before Status_select mutation",
    ],
  };

  const payload = {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status,
    mode: "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_PAGE_READ_ONLY",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,
    command_record_id: commandRecordId,
    queue_intent_status: isQueueIntentPersisted(commandFields)
      ? "QUEUE_INTENT_PERSISTED"
      : "NOT_PERSISTED",
    current_command_status: commandStatus,
    current_status_select: statusSelect,
    proposed_command_status: "Queued",
    proposed_status_select: "Queued",
    write_sent: false,
    operational_queue: "DISABLED",
    status_mutation: "DISABLED",
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    read_error: readError,
    proposed_update_preview: proposedUpdatePreview,
    transition_payload_preview: transitionPayloadPreview,
    transition_readiness_check: transitionReadinessCheck,
    scheduler_risk_review: schedulerRiskReview,
  };

  const incidentHref = withWorkspace(`/incidents/${incidentId}`, workspaceId);
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
      <Card tone={status === "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_READY" ? "green" : "amber"}>
        <Eyebrow>Operational Queue Transition Preview</Eyebrow>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl">
          Preview transition queue opérationnelle
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-10 text-white/60">
          V5.18 décrit la future mutation Draft → Queued sans l’envoyer.
          Cette surface reste read-only : aucune mutation Status, aucune queue
          opérationnelle, aucun Run et aucun worker call.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Badge tone="neutral">{VERSION}</Badge>
          <Badge tone={status === "OPERATIONAL_QUEUE_TRANSITION_PREVIEW_READY" ? "green" : "amber"}>
            {status}
          </Badge>
          <Badge tone="cyan">PREVIEW ONLY</Badge>
          <Badge tone="red">NO STATUS MUTATION</Badge>
          <Badge tone="red">NO OPERATIONAL QUEUE</Badge>
          <Badge tone="red">NO RUN</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Previous Layer Validated</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Previous Version" value="Incident Detail V5.17" tone="green" />
          <DataTile label="Operational Queue Readiness" value="VALIDATED" tone="green" />
          <DataTile label="Queue Intent Persisted" value="YES" tone="green" />
          <DataTile label="Ready For Future Operational Queue Gate" value="YES" tone="green" />
          <DataTile label="No Mutation / No Run / No Worker" value="CONFIRMED" tone="red" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Current Command State</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Command Record ID" value={commandRecordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Command Draft ID" value={buildCommandDraftId(workspaceId, incidentId)} tone="cyan" />
          <DataTile label="Command Idempotency Key" value={buildCommandIdempotencyKey(workspaceId, incidentId)} tone="cyan" />
          <DataTile label="Current Status" value={commandStatus} tone={commandStatus === "Draft" ? "green" : "red"} />
          <DataTile label="Current Status Select" value={statusSelect} tone={statusSelect === "Draft" ? "green" : "red"} />
          <DataTile label="Queue Allowed" value={String(queueAllowed)} tone={queueAllowed ? "green" : "red"} />
          <DataTile label="Run Creation Allowed" value={String(runCreationAllowed)} tone={runCreationAllowed ? "red" : "green"} />
          <DataTile label="Worker Call Allowed" value={String(workerCallAllowed)} tone={workerCallAllowed ? "red" : "green"} />
          <DataTile label="Capability" value={capability} tone={capability === "command_orchestrator" ? "green" : "amber"} />
          <DataTile label="Target Mode" value={targetMode} tone={targetMode === "dry_run_only" ? "green" : "amber"} />
          <DataTile label="Workspace ID" value={workspaceId} tone="cyan" />
          <DataTile label="Incident ID" value={incidentId} tone="cyan" />
          <DataTile label="Intent Record ID" value={intentRecordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Approval Record ID" value={approvalRecordId ?? "NOT_FOUND"} tone="cyan" />
        </div>
      </Card>

      <Card tone="amber">
        <Eyebrow>Operational Transition Preview</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Operational Queue Transition ID" value={buildOperationalQueueTransitionId(workspaceId, incidentId)} tone="amber" />
          <DataTile label="Operational Queue Transition Idempotency Key" value={buildOperationalQueueTransitionIdempotencyKey(workspaceId, incidentId)} tone="amber" />
          <DataTile label="From Status" value="Draft" tone="green" />
          <DataTile label="From Status Select" value="Draft" tone="green" />
          <DataTile label="To Status" value="Queued" tone="amber" />
          <DataTile label="To Status Select" value="Queued" tone="amber" />
          <DataTile label="Write Sent" value="NO" tone="green" />
          <DataTile label="Status Mutation Allowed Now" value="NO" tone="red" />
          <DataTile label="Operational Queue Allowed Now" value="NO" tone="red" />
          <DataTile label="Run Creation Allowed Now" value="NO" tone="red" />
          <DataTile label="Worker Call Allowed Now" value="NO" tone="red" />
        </div>
      </Card>

      <Card tone="amber">
        <Eyebrow>Proposed Airtable Update Preview — NOT SENT</Eyebrow>
        <JsonBlock value={proposedUpdatePreview} />
      </Card>

      <Card tone="cyan">
        <Eyebrow>Transition Payload Preview</Eyebrow>
        <JsonBlock value={transitionPayloadPreview} />
      </Card>

      <Card tone="green">
        <Eyebrow>Transition Readiness Check</Eyebrow>

        <div className="grid gap-4">
          {Object.entries(transitionReadinessCheck).map(([key, value]) => (
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
        <Eyebrow>Scheduler Risk Review</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Scheduler Consumes Queued Status" value="UNKNOWN" tone="red" />
          <DataTile label="Queued Status May Trigger Worker" value="POSSIBLE" tone="red" />
          <DataTile label="Safe To Mutate Status Now" value="false" tone="red" />
        </div>

        <div className="mt-6 grid gap-4">
          {schedulerRiskReview.required_before_real_queue.map((item) => (
            <div
              key={item}
              className="rounded-[1.5rem] border border-rose-400/20 bg-black/25 p-5 text-lg leading-8 text-white/75"
            >
              {item}
            </div>
          ))}
        </div>
      </Card>

      <Card tone="amber">
        <Eyebrow>Future Operational Queue Persistence Requirements</Eyebrow>

        <div className="grid gap-4">
          {[
            "Dedicated operational queue feature gate must be enabled",
            "Operator must explicitly confirm operational queue transition",
            "Scheduler consumption behavior must be verified",
            "Status_select transition to Queued must be audited",
            "Run creation must remain gated separately",
            "Worker execution must remain gated separately",
            "Rollback or safe cancel path must exist",
            "No secret exposure is allowed",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5 text-lg leading-8 text-white/75"
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
          <Badge tone="red">NO STATUS QUEUED</Badge>
          <Badge tone="red">NO STATUS MUTATION</Badge>
          <Badge tone="red">NO OPERATIONAL QUEUE</Badge>
          <Badge tone="red">NO RUN CREATION</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
          <Badge tone="red">NO POST /RUN</Badge>
          <Badge tone="red">NO REAL RUN</Badge>
          <Badge tone="red">NO SECRET EXPOSURE</Badge>
        </div>

        <button
          type="button"
          disabled
          className="mt-8 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white/30"
        >
          Mutation Status_select future non activée
        </button>
      </Card>

      <Card>
        <Eyebrow>Read-only Operational Queue Transition Payload</Eyebrow>
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
