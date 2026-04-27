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

type CommandDraftPreviewStatus =
  | "COMMAND_DRAFT_PREVIEW_READY"
  | "COMMAND_DRAFT_PREVIEW_CONFIG_MISSING"
  | "COMMAND_DRAFT_PREVIEW_READ_FAILED"
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

const VERSION = "Incident Detail V5.12";
const SOURCE =
  "dashboard_incident_detail_v5_12_operator_approved_command_draft_preview";

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
  return `command-draft:v5.12:${workspaceId}:${incidentId}`;
}

function buildCommandIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.12:operator-approved-command-draft-preview:${workspaceId}:${incidentId}`;
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

async function buildReadState(input: {
  token: string;
  baseId: string;
  intentsTable: string;
  approvalsTable: string;
  workspaceId: string;
  incidentId: string;
}): Promise<{
  ok: boolean;
  reason: "intent_read_failed" | "approval_read_failed" | null;
  intent: AirtableRecordResult;
  approval: AirtableRecordResult;
}> {
  const intent = await findAirtableRecordByIdempotency({
    token: input.token,
    baseId: input.baseId,
    table: input.intentsTable,
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
    };
  }

  const approval = await findAirtableRecordByIdempotency({
    token: input.token,
    baseId: input.baseId,
    table: input.approvalsTable,
    idempotencyKey: buildApprovalIdempotencyKey(input.workspaceId, input.incidentId),
  });

  if (!approval.ok) {
    return {
      ok: false,
      reason: "approval_read_failed",
      intent,
      approval,
    };
  }

  return {
    ok: true,
    reason: null,
    intent,
    approval,
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

export default async function OperatorApprovedCommandDraftPreviewPage(
  props: PageProps
) {
  const params = await Promise.resolve(props.params);
  const searchParams = props.searchParams ? await props.searchParams : {};

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    firstSearchParam(searchParams, "workspace_id") ??
      firstSearchParam(searchParams, "workspaceId")
  );

  const token = getAirtableToken();
  const baseId = getAirtableBaseId();
  const intentsTable = getOperatorIntentsTable();
  const approvalsTable = getOperatorApprovalsTable();

  const intentId = buildIntentId(workspaceId, incidentId);
  const persistenceId = buildPersistenceId(workspaceId, incidentId);
  const approvalId = buildApprovalId(workspaceId, incidentId);
  const commandDraftId = buildCommandDraftId(workspaceId, incidentId);
  const commandIdempotencyKey = buildCommandIdempotencyKey(workspaceId, incidentId);

  let status: CommandDraftPreviewStatus = "COMMAND_DRAFT_PREVIEW_CONFIG_MISSING";
  let intentRecordId: string | null = null;
  let approvalRecordId: string | null = null;
  let intentFields: Record<string, unknown> | null = null;
  let approvalFields: Record<string, unknown> | null = null;
  let intentHttpStatus: number | null = null;
  let approvalHttpStatus: number | null = null;
  let readError: string | null = null;

  if (token && baseId) {
    const state = await buildReadState({
      token,
      baseId,
      intentsTable,
      approvalsTable,
      workspaceId,
      incidentId,
    });

    intentRecordId = state.intent.recordId;
    approvalRecordId = state.approval.recordId;
    intentFields = state.intent.fields;
    approvalFields = state.approval.fields;
    intentHttpStatus = state.intent.status;
    approvalHttpStatus = state.approval.status;
    readError = state.intent.error ?? state.approval.error ?? state.reason;

    if (!state.ok) {
      status = "COMMAND_DRAFT_PREVIEW_READ_FAILED";
    } else if (!state.intent.recordId) {
      status = "OPERATOR_INTENT_DRAFT_NOT_FOUND";
    } else if (!state.approval.recordId) {
      status = "OPERATOR_APPROVAL_NOT_FOUND";
    } else {
      const approvalStatus = safeString(state.approval.fields?.Approval_Status);
      const approvedForCommandDraft =
        safeBoolean(state.approval.fields?.Approved_For_Command_Draft) === true;
      const targetMode =
        safeString(state.approval.fields?.Target_Mode) ||
        safeString(state.intent.fields?.Target_Mode);

      if (approvalStatus !== "Approved") {
        status = "OPERATOR_APPROVAL_NOT_APPROVED";
      } else if (!approvedForCommandDraft || targetMode !== "dry_run_only") {
        status = "COMMAND_DRAFT_NOT_ALLOWED";
      } else {
        status = "COMMAND_DRAFT_PREVIEW_READY";
      }
    }
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

  const commandPayloadPreview = {
    capability: targetCapability,
    status: "Draft",
    workspace_id: workspaceId,
    incident_id: incidentId,
    dry_run: true,
    source: SOURCE,
    metadata: {
      origin: "operator_approved_command_draft_preview",
      intent_record_id: intentRecordId,
      approval_record_id: approvalRecordId,
      operator_identity: operatorIdentity,
      approval_id: approvalId,
      command_draft_id: commandDraftId,
      real_run_forbidden: true,
      command_creation_allowed_now: false,
    },
  };

  const payload = {
    ok: status === "COMMAND_DRAFT_PREVIEW_READY",
    version: VERSION,
    source: SOURCE,
    status,
    mode: "OPERATOR_APPROVED_COMMAND_DRAFT_PREVIEW_ONLY",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,

    intent_id: intentId,
    intent_record_id: intentRecordId,
    persistence_id: persistenceId,
    approval_id: approvalId,
    approval_record_id: approvalRecordId,

    command_draft_id: commandDraftId,
    command_idempotency_key: commandIdempotencyKey,
    command_status: "DRAFT_PREVIEW_ONLY",
    command_creation: "DISABLED",
    command_persistence: "DISABLED",
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",

    airtable_read: {
      base_id: baseId ? "CONFIGURED" : "MISSING",
      operator_intents_table: intentsTable,
      operator_approvals_table: approvalsTable,
      token: token ? "CONFIGURED" : "MISSING",
      token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
      intent_http_status: intentHttpStatus,
      approval_http_status: approvalHttpStatus,
      error: readError,
    },

    operator_approval_check: {
      intent_found: Boolean(intentRecordId),
      approval_found: Boolean(approvalRecordId),
      operator_identity: operatorIdentity,
      approval_status: approvalStatus,
      approved_for_command_draft: approvedForCommandDraft,
      target_capability: targetCapability,
      target_mode: targetMode,
    },

    command_draft_preview: {
      type: "operator_approved_command_draft",
      target_table: "Commands",
      target_status: "Draft",
      target_capability: targetCapability,
      workspace_id: workspaceId,
      incident_id: incidentId,
      intent_id: intentId,
      intent_record_id: intentRecordId,
      approval_id: approvalId,
      approval_record_id: approvalRecordId,
      idempotency_key: commandIdempotencyKey,
      command_creation_allowed_now: false,
      command_persistence_allowed_now: false,
      queue_allowed_now: false,
      run_allowed_now: false,
      worker_call_allowed_now: false,
    },

    command_payload_preview: commandPayloadPreview,

    readiness_check: {
      intent_draft_found: Boolean(intentRecordId),
      approval_found: Boolean(approvalRecordId),
      approval_status_approved: approvalStatus === "Approved",
      approved_for_command_draft: approvedForCommandDraft,
      workspace_scope_present: workspaceId.length > 0,
      incident_scope_present: incidentId.length > 0,
      target_capability_present: targetCapability.length > 0,
      target_mode_is_dry_run_only: targetMode === "dry_run_only",
      command_creation_feature_gate_required: true,
      command_persistence_still_disabled: true,
      worker_call_still_disabled: true,
    },

    guardrails: {
      client_fetch: "DISABLED",
      airtable_mutation: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      command_creation: "DISABLED",
      command_persistence: "DISABLED",
      run_creation: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      secret_exposure: "DISABLED",
      dry_run_only: true,
      preview_only: true,
    },

    next_step:
      "V5.13 may introduce gated command draft persistence, still without queueing, run creation, or worker execution.",
  };

  const incidentHref = withWorkspace(`/incidents/${incidentId}`, workspaceId);
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
      <Card tone={status === "COMMAND_DRAFT_PREVIEW_READY" ? "green" : "amber"}>
        <Eyebrow>Operator-approved Command Draft Preview</Eyebrow>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl">
          Prévisualisation de Command Draft
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-10 text-white/60">
          V5.12 prépare le contrat d’une future Command approuvée par opérateur.
          Cette surface est strictement read-only : elle ne crée aucune Command,
          ne crée aucun Run et n’appelle aucun worker.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Badge tone="neutral">{VERSION}</Badge>
          <Badge tone={status === "COMMAND_DRAFT_PREVIEW_READY" ? "green" : "amber"}>
            {status}
          </Badge>
          <Badge tone="cyan">PREVIEW ONLY</Badge>
          <Badge tone="red">NO COMMAND CREATION</Badge>
          <Badge tone="red">NO RUN CREATION</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Previous Layer Validated</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Previous Version" value="Incident Detail V5.11" tone="green" />
          <DataTile label="Operator Approval Persistence" value="VALIDATED" tone="green" />
          <DataTile label="Approval Persisted" value={approvalRecordId ?? "NOT_FOUND"} tone="green" />
          <DataTile label="No Command Yet" value="CONFIRMED" tone="red" />
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Operator Approval Check</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Intent Found" value={intentRecordId ? "YES" : "NO"} tone={intentRecordId ? "green" : "red"} />
          <DataTile label="Approval Found" value={approvalRecordId ? "YES" : "NO"} tone={approvalRecordId ? "green" : "red"} />
          <DataTile label="Operator Identity" value={operatorIdentity} tone="cyan" />
          <DataTile label="Approval Status" value={approvalStatus} tone={approvalStatus === "Approved" ? "green" : "amber"} />
          <DataTile label="Approved For Command Draft" value={approvedForCommandDraft ? "YES" : "NO"} tone={approvedForCommandDraft ? "green" : "red"} />
          <DataTile label="Target Capability" value={targetCapability} tone="cyan" />
          <DataTile label="Target Mode" value={targetMode} tone="cyan" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Command Draft Preview</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Command Draft ID" value={commandDraftId} tone="cyan" />
          <DataTile label="Command Idempotency Key" value={commandIdempotencyKey} tone="cyan" />
          <DataTile label="Target Table" value="Commands" tone="cyan" />
          <DataTile label="Target Status" value="Draft" tone="amber" />
          <DataTile label="Target Capability" value={targetCapability} tone="cyan" />
          <DataTile label="Workspace Scope" value={workspaceId} tone="cyan" />
          <DataTile label="Incident Scope" value={incidentId} tone="cyan" />
          <DataTile label="Intent Record Reference" value={intentRecordId ?? "NOT_FOUND"} tone="green" />
          <DataTile label="Approval Record Reference" value={approvalRecordId ?? "NOT_FOUND"} tone="green" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Command Payload Preview</Eyebrow>
        <JsonBlock value={commandPayloadPreview} />
      </Card>

      <Card tone="green">
        <Eyebrow>Readiness Check</Eyebrow>

        <div className="grid gap-4">
          {Object.entries(payload.readiness_check).map(([key, value]) => (
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
        <Eyebrow>Execution Lock</Eyebrow>

        <div className="flex flex-wrap gap-3">
          <Badge tone="red">NO COMMAND CREATION</Badge>
          <Badge tone="red">NO COMMAND PERSISTENCE</Badge>
          <Badge tone="red">NO QUEUE</Badge>
          <Badge tone="red">NO RUN CREATION</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
          <Badge tone="red">NO POST /RUN</Badge>
          <Badge tone="red">NO REAL RUN</Badge>
          <Badge tone="red">NO SECRET EXPOSURE</Badge>
          <Badge tone="cyan">PREVIEW ONLY</Badge>
        </div>

        <button
          type="button"
          disabled
          className="mt-8 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white/30"
        >
          Création Command future non activée
        </button>
      </Card>

      <Card>
        <Eyebrow>Read-only Command Draft Payload</Eyebrow>
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

          <NavButton href={v511Href}>Retour V5.11 approval persistence</NavButton>
          <NavButton href={v510Href}>Retour V5.10 approval draft</NavButton>
          <NavButton href={v59Href}>Retour V5.9 intent review</NavButton>
          <NavButton href={v58Href}>Retour V5.8 gated persistence</NavButton>
        </div>
      </Card>
    </main>
  );
}
