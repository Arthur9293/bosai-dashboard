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

type CommandQueuePreviewStatus =
  | "COMMAND_QUEUE_PREVIEW_READY"
  | "COMMAND_QUEUE_PREVIEW_CONFIG_MISSING"
  | "COMMAND_QUEUE_PREVIEW_READ_FAILED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_NOT_FOUND"
  | "COMMAND_DRAFT_NOT_FOUND"
  | "COMMAND_DRAFT_STATUS_NOT_DRAFT"
  | "COMMAND_QUEUE_PREVIEW_NOT_SAFE";

type AirtableRecordResult = {
  ok: boolean;
  status: number;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
};

const VERSION = "Incident Detail V5.15";
const SOURCE = "dashboard_incident_detail_v5_15_controlled_command_queue_preview";

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

function buildQueueTransitionIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.15:controlled-command-queue-preview:${workspaceId}:${incidentId}`;
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
  commandStatus: string;
  commandStatusSelect: string;
  checklistSafe: boolean;
}): CommandQueuePreviewStatus {
  if (!input.stateOk) return "COMMAND_QUEUE_PREVIEW_READ_FAILED";
  if (!input.intentRecordId) return "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  if (!input.approvalRecordId) return "OPERATOR_APPROVAL_NOT_FOUND";
  if (!input.commandRecordId) return "COMMAND_DRAFT_NOT_FOUND";

  const isDraft =
    input.commandStatus === "Draft" || input.commandStatusSelect === "Draft";

  if (!isDraft) return "COMMAND_DRAFT_STATUS_NOT_DRAFT";
  if (!input.checklistSafe) return "COMMAND_QUEUE_PREVIEW_NOT_SAFE";

  return "COMMAND_QUEUE_PREVIEW_READY";
}

function buildQueuePayloadPreview(input: {
  workspaceId: string;
  incidentId: string;
  commandRecordId: string | null;
  commandId: string;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  operatorIdentity: string;
}) {
  return {
    command_record_id: input.commandRecordId,
    command_id: input.commandId,
    workspace_id: input.workspaceId,
    incident_id: input.incidentId,
    from_status: "Draft",
    to_status: "Queued",
    dry_run: true,
    source: SOURCE,
    metadata: {
      origin: "controlled_command_queue_preview",
      intent_record_id: input.intentRecordId,
      approval_record_id: input.approvalRecordId,
      operator_identity: input.operatorIdentity,
      real_run_forbidden: true,
      run_creation_allowed_now: false,
      worker_call_allowed_now: false,
    },
  };
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

export default async function ControlledCommandQueuePreviewPage(props: PageProps) {
  const params = await Promise.resolve(props.params);
  const searchParams = props.searchParams ? await Promise.resolve(props.searchParams) : {};

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    firstSearchParam(searchParams, "workspace_id") ??
      firstSearchParam(searchParams, "workspaceId")
  );

  const token = getAirtableToken();
  const baseId = getAirtableBaseId();

  let status: CommandQueuePreviewStatus = "COMMAND_QUEUE_PREVIEW_CONFIG_MISSING";
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

    const commandStatus = safeString(commandFields?.Status);
    const commandStatusSelect = safeString(commandFields?.Status_select);

    const checklistSafe =
      Boolean(intentRecordId) &&
      Boolean(approvalRecordId) &&
      Boolean(commandRecordId) &&
      (commandStatus === "Draft" || commandStatusSelect === "Draft") &&
      safeString(commandFields?.Idempotency_Key) ===
        buildCommandIdempotencyKey(workspaceId, incidentId) &&
      safeString(commandFields?.Workspace_ID).length > 0 &&
      safeString(commandFields?.Incident_ID).length > 0 &&
      safeString(commandFields?.Intent_ID).length > 0 &&
      safeString(commandFields?.Intent_Record_ID).length > 0 &&
      safeString(commandFields?.Approval_ID).length > 0 &&
      safeString(commandFields?.Approval_Record_ID).length > 0 &&
      safeString(commandFields?.Capability) === "command_orchestrator" &&
      safeString(commandFields?.Target_Mode) === "dry_run_only" &&
      safeBoolean(commandFields?.Dry_Run) === true &&
      safeString(commandFields?.Real_Run) === "Forbidden" &&
      safeString(commandFields?.Secret_Exposure) === "Disabled" &&
      safeBoolean(commandFields?.Run_Creation_Allowed) !== true &&
      safeBoolean(commandFields?.Worker_Call_Allowed) !== true;

    status = resolveStatus({
      stateOk: state.ok,
      intentRecordId,
      approvalRecordId,
      commandRecordId,
      commandStatus,
      commandStatusSelect,
      checklistSafe,
    });
  }

  const commandStatus = safeString(commandFields?.Status);
  const commandStatusSelect = safeString(commandFields?.Status_select);
  const capability = safeString(commandFields?.Capability);
  const targetMode = safeString(commandFields?.Target_Mode);
  const dryRun = safeBoolean(commandFields?.Dry_Run);
  const operatorIdentity = safeString(commandFields?.Operator_Identity) || "UNKNOWN";
  const queueAllowed = safeBoolean(commandFields?.Queue_Allowed);
  const runCreationAllowed = safeBoolean(commandFields?.Run_Creation_Allowed);
  const workerCallAllowed = safeBoolean(commandFields?.Worker_Call_Allowed);
  const realRun = safeString(commandFields?.Real_Run);
  const secretExposure = safeString(commandFields?.Secret_Exposure);
  const commandId =
    safeString(commandFields?.Command_ID) || buildCommandDraftId(workspaceId, incidentId);

  const queuePayloadPreview = buildQueuePayloadPreview({
    workspaceId,
    incidentId,
    commandRecordId,
    commandId,
    intentRecordId,
    approvalRecordId,
    operatorIdentity,
  });

  const queueReadinessCheck = {
    intent_found: Boolean(intentRecordId),
    approval_found: Boolean(approvalRecordId),
    command_found: Boolean(commandRecordId),
    command_status_is_draft: commandStatus === "Draft" || commandStatusSelect === "Draft",
    idempotency_key_present:
      safeString(commandFields?.Idempotency_Key) ===
      buildCommandIdempotencyKey(workspaceId, incidentId),
    workspace_scope_present: safeString(commandFields?.Workspace_ID).length > 0,
    incident_scope_present: safeString(commandFields?.Incident_ID).length > 0,
    intent_reference_present:
      safeString(commandFields?.Intent_ID).length > 0 &&
      safeString(commandFields?.Intent_Record_ID).length > 0,
    approval_reference_present:
      safeString(commandFields?.Approval_ID).length > 0 &&
      safeString(commandFields?.Approval_Record_ID).length > 0,
    target_capability_is_command_orchestrator: capability === "command_orchestrator",
    target_mode_is_dry_run_only: targetMode === "dry_run_only",
    dry_run_is_true: dryRun === true,
    real_run_forbidden: realRun === "Forbidden",
    secret_exposure_disabled: secretExposure === "Disabled",
    queue_feature_gate_required: true,
    queue_persistence_still_disabled: true,
    run_creation_still_disabled: runCreationAllowed !== true,
    worker_call_still_disabled: workerCallAllowed !== true,
  };

  const payload = {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status,
    mode: "CONTROLLED_COMMAND_QUEUE_PREVIEW_PAGE_READ_ONLY",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,
    command_record_id: commandRecordId,
    queue_preview_id: buildQueuePreviewId(workspaceId, incidentId),
    queue_transition_idempotency_key: buildQueueTransitionIdempotencyKey(
      workspaceId,
      incidentId
    ),
    queue_preview_status:
      status === "COMMAND_QUEUE_PREVIEW_READY"
        ? "READY_NOT_PERSISTED"
        : "BLOCKED_NOT_PERSISTED",
    current_command_status: commandStatus || commandStatusSelect || "UNKNOWN",
    proposed_command_status: "Queued",
    command_queue: "DISABLED",
    queue_persistence: "DISABLED",
    command_mutation: "DISABLED",
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    read_error: readError,
    queue_transition_preview: {
      type: "controlled_command_queue_preview",
      target_table: getCommandsTable(),
      target_record_id: commandRecordId,
      current_status: "Draft",
      proposed_status: "Queued",
      queue_allowed_now: false,
      queue_persistence_allowed_now: false,
      run_creation_allowed_now: false,
      worker_call_allowed_now: false,
      requires_dedicated_queue_feature_gate: true,
      requires_explicit_operator_confirmation: true,
      requires_audit_trail: true,
      requires_idempotency_key: true,
      requires_workspace_scope: true,
      requires_rollback_or_cancel_path: true,
    },
    queue_payload_preview: queuePayloadPreview,
    queue_readiness_check: queueReadinessCheck,
    future_queue_requirements: [
      "Dedicated queue feature gate must be enabled",
      "Operator must explicitly confirm queue transition",
      "Command status transition must be audited",
      "Command must remain linked to intent and approval",
      "Queue idempotency key must be deterministic",
      "Workspace scope must be preserved",
      "Run creation must remain disabled during queue persistence",
      "Worker call must remain disabled until execution gate",
      "Rollback or safe cancel path must exist",
      "No secret exposure is allowed",
    ],
  };

  const incidentHref = withWorkspace(`/incidents/${incidentId}`, workspaceId);
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
      <Card tone={status === "COMMAND_QUEUE_PREVIEW_READY" ? "green" : "amber"}>
        <Eyebrow>Controlled Command Queue Preview</Eyebrow>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl">
          Preview de mise en queue
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-10 text-white/60">
          V5.15 prépare la transition future Draft → Queued sans modifier la
          Command. Cette surface est strictement read-only : aucune queue réelle,
          aucune mutation, aucun Run et aucun worker call.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Badge tone="neutral">{VERSION}</Badge>
          <Badge tone={status === "COMMAND_QUEUE_PREVIEW_READY" ? "green" : "amber"}>
            {status}
          </Badge>
          <Badge tone="cyan">PREVIEW ONLY</Badge>
          <Badge tone="red">NO QUEUE PERSISTENCE</Badge>
          <Badge tone="red">NO RUN</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Previous Layer Validated</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Previous Version" value="Incident Detail V5.14" tone="green" />
          <DataTile label="Command Draft Review" value="VALIDATED" tone="green" />
          <DataTile label="Command Draft Ready" value={commandRecordId ?? "NOT_FOUND"} tone="green" />
          <DataTile label="No Queue / No Run / No Worker" value="CONFIRMED" tone="red" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Command Draft Source</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Command Record ID" value={commandRecordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Command Draft ID" value={buildCommandDraftId(workspaceId, incidentId)} tone="cyan" />
          <DataTile label="Command Idempotency Key" value={buildCommandIdempotencyKey(workspaceId, incidentId)} tone="cyan" />
          <DataTile label="Current Status" value={commandStatus || "UNKNOWN"} tone={commandStatus === "Draft" ? "green" : "amber"} />
          <DataTile label="Status Select" value={commandStatusSelect || "UNKNOWN"} tone={commandStatusSelect === "Draft" ? "green" : "amber"} />
          <DataTile label="Capability" value={capability || "UNKNOWN"} tone={capability === "command_orchestrator" ? "green" : "amber"} />
          <DataTile label="Target Mode" value={targetMode || "UNKNOWN"} tone={targetMode === "dry_run_only" ? "green" : "amber"} />
          <DataTile label="Workspace ID" value={workspaceId} tone="cyan" />
          <DataTile label="Incident ID" value={incidentId} tone="cyan" />
          <DataTile label="Intent Record ID" value={intentRecordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Approval Record ID" value={approvalRecordId ?? "NOT_FOUND"} tone="cyan" />
        </div>
      </Card>

      <Card tone="amber">
        <Eyebrow>Queue Transition Preview</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Queue Preview ID" value={buildQueuePreviewId(workspaceId, incidentId)} tone="amber" />
          <DataTile label="Queue Transition Idempotency Key" value={buildQueueTransitionIdempotencyKey(workspaceId, incidentId)} tone="amber" />
          <DataTile label="From Status" value="Draft" tone="green" />
          <DataTile label="To Status" value="Queued" tone="amber" />
          <DataTile label="Queue Allowed Now" value="NO" tone="red" />
          <DataTile label="Queue Persistence Allowed Now" value="NO" tone="red" />
          <DataTile label="Run Creation Allowed Now" value="NO" tone="red" />
          <DataTile label="Worker Call Allowed Now" value="NO" tone="red" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Queue Payload Preview</Eyebrow>
        <JsonBlock value={queuePayloadPreview} />
      </Card>

      <Card tone="green">
        <Eyebrow>Queue Readiness Check</Eyebrow>

        <div className="grid gap-4">
          {Object.entries(queueReadinessCheck).map(([key, value]) => (
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
        <Eyebrow>Future Queue Requirements</Eyebrow>

        <div className="grid gap-4">
          {payload.future_queue_requirements.map((item) => (
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
          <Badge tone="red">NO QUEUE PERSISTENCE</Badge>
          <Badge tone="red">NO STATUS MUTATION</Badge>
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
          Queue persistence future non activée
        </button>
      </Card>

      <Card>
        <Eyebrow>Read-only Queue Preview Payload</Eyebrow>
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
