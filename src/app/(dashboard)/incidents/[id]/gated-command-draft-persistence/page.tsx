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
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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
  | "COMMAND_DRAFT_NOT_ALLOWED";

type AirtableRecordResult = {
  ok: boolean;
  status: number;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
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

function firstSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
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
  gateEnabled: boolean;
  stateOk: boolean;
  reason: string | null;
  intentRecordId: string | null;
  approvalRecordId: string | null;
  commandRecordId: string | null;
  approvalStatus: string;
  approvedForCommandDraft: boolean;
  targetMode: string;
}): CommandDraftPersistenceStatus {
  if (!input.stateOk) return "COMMAND_DRAFT_PERSISTENCE_READ_FAILED";
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
  return {
    Idempotency_Key: buildCommandIdempotencyKey(input.workspaceId, input.incidentId),
    Command_ID: buildCommandDraftId(input.workspaceId, input.incidentId),
    Workspace_ID: input.workspaceId,
    Incident_ID: input.incidentId,
    Intent_ID: buildIntentId(input.workspaceId, input.incidentId),
    Intent_Record_ID: input.intentRecordId,
    Approval_ID: buildApprovalId(input.workspaceId, input.incidentId),
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
    Input_JSON: JSON.stringify(
      buildCommandInputJson({
        workspaceId: input.workspaceId,
        incidentId: input.incidentId,
        intentRecordId: input.intentRecordId,
        approvalRecordId: input.approvalRecordId,
        operatorIdentity: input.operatorIdentity,
      })
    ),
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

export default async function GatedCommandDraftPersistencePage(props: PageProps) {
  const params = await Promise.resolve(props.params);
  const searchParams = props.searchParams ? await props.searchParams : {};

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    firstSearchParam(searchParams, "workspace_id") ??
      firstSearchParam(searchParams, "workspaceId")
  );

  const featureGate = resolveFeatureGate();
  const token = getAirtableToken();
  const baseId = getAirtableBaseId();

  let status: CommandDraftPersistenceStatus =
    "COMMAND_DRAFT_PERSISTENCE_CONFIG_MISSING";
  let intentRecordId: string | null = null;
  let approvalRecordId: string | null = null;
  let commandRecordId: string | null = null;
  let intentFields: Record<string, unknown> | null = null;
  let approvalFields: Record<string, unknown> | null = null;
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
    intentFields = state.intent.fields;
    approvalFields = state.approval.fields;
    commandFields = state.command.fields;
    readError = state.intent.error ?? state.approval.error ?? state.command.error ?? state.reason;

    const approvalStatus = safeString(approvalFields?.Approval_Status);
    const approvedForCommandDraft =
      safeBoolean(approvalFields?.Approved_For_Command_Draft) === true;
    const targetMode =
      safeString(approvalFields?.Target_Mode) || safeString(intentFields?.Target_Mode);

    status = resolveStatus({
      gateEnabled: featureGate.feature_gate_enabled,
      stateOk: state.ok,
      reason: state.reason,
      intentRecordId,
      approvalRecordId,
      commandRecordId,
      approvalStatus,
      approvedForCommandDraft,
      targetMode,
    });
  }

  const operatorIdentity = safeString(approvalFields?.Operator_Identity) || "UNKNOWN";
  const approvalStatus = safeString(approvalFields?.Approval_Status) || "UNKNOWN";
  const approvedForCommandDraft =
    safeBoolean(approvalFields?.Approved_For_Command_Draft) === true;
  const targetCapability =
    safeString(approvalFields?.Target_Capability) ||
    safeString(intentFields?.Target_Capability) ||
    "command_orchestrator";
  const targetMode =
    safeString(approvalFields?.Target_Mode) ||
    safeString(intentFields?.Target_Mode) ||
    "dry_run_only";

  const commandFieldsPreview = buildCommandFields({
    workspaceId,
    incidentId,
    intentRecordId,
    approvalRecordId,
    operatorIdentity,
  });

  const commandInputJsonPreview = buildCommandInputJson({
    workspaceId,
    incidentId,
    intentRecordId,
    approvalRecordId,
    operatorIdentity,
  });

  const payload = {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status,
    mode: "GATED_COMMAND_DRAFT_PERSISTENCE_PAGE_READ_ONLY",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,
    feature_gate_env: featureGate.feature_gate_env,
    feature_gate_enabled: featureGate.feature_gate_enabled,
    command_draft_id: buildCommandDraftId(workspaceId, incidentId),
    command_idempotency_key: buildCommandIdempotencyKey(workspaceId, incidentId),
    command_record_id: commandRecordId,
    command_status: commandRecordId ? "DRAFT_PERSISTED" : "NOT_PERSISTED",
    command_persistence: commandRecordId ? "PERSISTED_AS_DRAFT" : "DISABLED",
    command_creation: commandRecordId ? "DRAFT_CREATED" : "DISABLED",
    queue: "DISABLED",
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",
    read_error: readError,
    operator_approval_source: {
      intent_record_id: intentRecordId,
      approval_record_id: approvalRecordId,
      operator_identity: operatorIdentity,
      approval_status: approvalStatus,
      approved_for_command_draft: approvedForCommandDraft,
      target_capability: targetCapability,
      target_mode: targetMode,
    },
    command_record_preview: {
      fields: commandFieldsPreview,
    },
    command_input_json_preview: commandInputJsonPreview,
    persisted_command_snapshot: commandRecordId
      ? {
          record_id: commandRecordId,
          idempotency_key: safeString(commandFields?.Idempotency_Key),
          command_id: safeString(commandFields?.Command_ID),
          status:
            safeString(commandFields?.Status) ||
            safeString(commandFields?.Status_select),
          real_run: safeString(commandFields?.Real_Run),
          secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
        }
      : null,
  };

  const incidentHref = withWorkspace(`/incidents/${incidentId}`, workspaceId);
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
      <Card
        tone={
          status === "COMMAND_DRAFT_ALREADY_PERSISTED"
            ? "green"
            : featureGate.feature_gate_enabled
              ? "amber"
              : "red"
        }
      >
        <Eyebrow>Gated Command Draft Persistence</Eyebrow>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl">
          Persistance de Command Draft
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-10 text-white/60">
          V5.13 persiste uniquement une Command en statut Draft, derrière feature
          gate et confirmation POST serveur. Cette page reste read-only : elle ne
          crée aucune Command directement, ne queue rien, ne crée aucun Run et
          n’appelle aucun worker.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Badge tone="neutral">{VERSION}</Badge>
          <Badge
            tone={
              status === "COMMAND_DRAFT_ALREADY_PERSISTED"
                ? "green"
                : featureGate.feature_gate_enabled
                  ? "amber"
                  : "red"
            }
          >
            {status}
          </Badge>
          <Badge tone="cyan">DRAFT ONLY</Badge>
          <Badge tone="red">NO QUEUE</Badge>
          <Badge tone="red">NO RUN</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Previous Layer Validated</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Previous Version" value="Incident Detail V5.12" tone="green" />
          <DataTile label="Command Draft Preview" value="VALIDATED" tone="green" />
          <DataTile label="Approval Record" value={approvalRecordId ?? "NOT_FOUND"} tone="green" />
          <DataTile label="Command Persisted" value={commandRecordId ? "YES" : "NO"} tone={commandRecordId ? "green" : "amber"} />
        </div>
      </Card>

      <Card tone={featureGate.feature_gate_enabled ? "green" : "red"}>
        <Eyebrow>Command Draft Gate</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Feature Gate Env" value={featureGate.feature_gate_env} tone="cyan" />
          <DataTile label="Feature Gate Status" value={featureGate.feature_gate_enabled ? "ENABLED" : "DISABLED"} tone={featureGate.feature_gate_enabled ? "green" : "red"} />
          <DataTile label="Required Confirmation Token" value={REQUIRED_CONFIRMATION_TOKEN} tone="amber" />
          <DataTile label="POST Required" value="YES" tone="amber" />
          <DataTile label="Write From Page" value="NO" tone="red" />
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Operator Approval Source</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Intent Record ID" value={intentRecordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Approval Record ID" value={approvalRecordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Operator Identity" value={operatorIdentity} tone="cyan" />
          <DataTile label="Approval Status" value={approvalStatus} tone={approvalStatus === "Approved" ? "green" : "amber"} />
          <DataTile label="Approved For Command Draft" value={approvedForCommandDraft ? "YES" : "NO"} tone={approvedForCommandDraft ? "green" : "red"} />
          <DataTile label="Target Capability" value={targetCapability} tone="cyan" />
          <DataTile label="Target Mode" value={targetMode} tone="cyan" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Command Draft Persistence Contract</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Command Draft ID" value={buildCommandDraftId(workspaceId, incidentId)} tone="cyan" />
          <DataTile label="Command Idempotency Key" value={buildCommandIdempotencyKey(workspaceId, incidentId)} tone="cyan" />
          <DataTile label="Target Table" value={getCommandsTable()} tone="cyan" />
          <DataTile label="Target Status" value="Draft" tone="amber" />
          <DataTile label="Queue Allowed" value="NO" tone="red" />
          <DataTile label="Run Creation Allowed" value="NO" tone="red" />
          <DataTile label="Worker Call Allowed" value="NO" tone="red" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Command Record Preview</Eyebrow>
        <JsonBlock value={commandFieldsPreview} />
      </Card>

      <Card tone="cyan">
        <Eyebrow>Command Input JSON Preview</Eyebrow>
        <JsonBlock value={commandInputJsonPreview} />
      </Card>

      <Card tone="red">
        <Eyebrow>Execution Lock</Eyebrow>

        <div className="flex flex-wrap gap-3">
          <Badge tone="cyan">DRAFT ONLY</Badge>
          <Badge tone="red">NO QUEUE</Badge>
          <Badge tone="red">NO RUN CREATION</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
          <Badge tone="red">NO POST /RUN</Badge>
          <Badge tone="red">NO REAL RUN</Badge>
          <Badge tone="red">NO SECRET EXPOSURE</Badge>
          <Badge tone="amber">FEATURE GATED</Badge>
          <Badge tone="amber">POST CONFIRMATION REQUIRED</Badge>
        </div>

        <button
          type="button"
          disabled
          className="mt-8 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white/30"
        >
          Persistance Command future via POST uniquement
        </button>
      </Card>

      <Card>
        <Eyebrow>Read-only Command Persistence Payload</Eyebrow>
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
