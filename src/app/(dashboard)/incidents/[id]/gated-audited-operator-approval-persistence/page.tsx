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

type PageStatus =
  | "APPROVAL_PERSISTENCE_BLOCKED_BY_FEATURE_GATE"
  | "APPROVAL_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION"
  | "OPERATOR_APPROVAL_ALREADY_PERSISTED"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_PERSISTENCE_CONFIG_MISSING"
  | "OPERATOR_APPROVAL_PERSISTENCE_READ_FAILED";

const VERSION = "Incident Detail V5.11";
const APPROVAL_GATE_ENV = "BOSAI_OPERATOR_APPROVAL_PERSISTENCE_ENABLED";
const REQUIRED_CONFIRMATION_TOKEN = "PERSIST_OPERATOR_APPROVAL";

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

function resolveApprovalGate(): {
  feature_gate_env: string;
  feature_gate_enabled: boolean;
  feature_gate_state: FeatureGateState;
  raw_value: "MISSING" | "SERVER_SIDE_ONLY_NOT_EXPOSED";
} {
  const raw = process.env[APPROVAL_GATE_ENV];

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return {
      feature_gate_env: APPROVAL_GATE_ENV,
      feature_gate_enabled: false,
      feature_gate_state: "FEATURE_GATE_MISSING",
      raw_value: "MISSING",
    };
  }

  const normalized = raw.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return {
      feature_gate_env: APPROVAL_GATE_ENV,
      feature_gate_enabled: true,
      feature_gate_state: "FEATURE_GATE_ENABLED",
      raw_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
    };
  }

  return {
    feature_gate_env: APPROVAL_GATE_ENV,
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

function buildIntentId(workspaceId: string, incidentId: string): string {
  return `operator-intent:v5.4:${workspaceId}:${incidentId}`;
}

function buildPersistenceId(workspaceId: string, incidentId: string): string {
  return `intent-persistence:v5.8:${workspaceId}:${incidentId}`;
}

function buildIntentIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`;
}

function buildApprovalId(workspaceId: string, incidentId: string): string {
  return `operator-approval:v5.11:${workspaceId}:${incidentId}`;
}

function buildApprovalIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.11:gated-operator-approval-persistence:${workspaceId}:${incidentId}`;
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
}): Promise<{
  ok: boolean;
  status: number;
  recordId: string | null;
  fields: Record<string, unknown> | null;
  error: string | null;
}> {
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

export default async function GatedAuditedOperatorApprovalPersistencePage(
  props: PageProps
) {
  const params = await Promise.resolve(props.params);
  const searchParams = props.searchParams ? await props.searchParams : {};

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    firstSearchParam(searchParams, "workspace_id") ??
      firstSearchParam(searchParams, "workspaceId")
  );

  const approvalGate = resolveApprovalGate();
  const token = getAirtableToken();
  const baseId = getAirtableBaseId();
  const intentsTable = getOperatorIntentsTable();
  const approvalsTable = getOperatorApprovalsTable();

  const intentId = buildIntentId(workspaceId, incidentId);
  const persistenceId = buildPersistenceId(workspaceId, incidentId);
  const intentIdempotencyKey = buildIntentIdempotencyKey(workspaceId, incidentId);
  const approvalId = buildApprovalId(workspaceId, incidentId);
  const approvalIdempotencyKey = buildApprovalIdempotencyKey(
    workspaceId,
    incidentId
  );

  let status: PageStatus = "OPERATOR_APPROVAL_PERSISTENCE_CONFIG_MISSING";
  let intentRecordId: string | null = null;
  let approvalRecordId: string | null = null;
  let intentFields: Record<string, unknown> | null = null;
  let approvalFields: Record<string, unknown> | null = null;
  let intentHttpStatus: number | null = null;
  let approvalHttpStatus: number | null = null;
  let readError: string | null = null;

  if (token && baseId) {
    const intent = await findAirtableRecordByIdempotency({
      token,
      baseId,
      table: intentsTable,
      idempotencyKey: intentIdempotencyKey,
    });

    intentHttpStatus = intent.status;
    intentRecordId = intent.recordId;
    intentFields = intent.fields;

    if (!intent.ok) {
      status = "OPERATOR_APPROVAL_PERSISTENCE_READ_FAILED";
      readError = intent.error;
    } else {
      const approval = await findAirtableRecordByIdempotency({
        token,
        baseId,
        table: approvalsTable,
        idempotencyKey: approvalIdempotencyKey,
      });

      approvalHttpStatus = approval.status;
      approvalRecordId = approval.recordId;
      approvalFields = approval.fields;

      if (!approval.ok) {
        status = "OPERATOR_APPROVAL_PERSISTENCE_READ_FAILED";
        readError = approval.error;
      } else if (approval.recordId) {
        status = "OPERATOR_APPROVAL_ALREADY_PERSISTED";
      } else if (!intent.recordId) {
        status = "OPERATOR_INTENT_DRAFT_NOT_FOUND";
      } else if (!approvalGate.feature_gate_enabled) {
        status = "APPROVAL_PERSISTENCE_BLOCKED_BY_FEATURE_GATE";
      } else {
        status = "APPROVAL_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION";
      }
    }
  }

  const approved = Boolean(approvalRecordId);
  const intentFound = Boolean(intentRecordId);

  const persistedIntentSnapshot = intentRecordId
    ? {
        record_id: intentRecordId,
        idempotency_key: safeString(intentFields?.Idempotency_Key),
        intent_id: safeString(intentFields?.Intent_ID),
        persistence_id: safeString(intentFields?.Persistence_ID),
        workspace_id: safeString(intentFields?.Workspace_ID),
        incident_id: safeString(intentFields?.Incident_ID),
        status: safeString(intentFields?.Status),
        target_capability: safeString(intentFields?.Target_Capability),
        target_mode: safeString(intentFields?.Target_Mode),
        proposed_action: safeString(intentFields?.Proposed_Action),
        operator_confirmation: safeString(intentFields?.Operator_Confirmation),
        persistence_allowed: safeBoolean(intentFields?.Persistence_Allowed),
        real_run: safeString(intentFields?.Real_Run),
        secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
        source_layer: safeString(intentFields?.Source_Layer),
      }
    : null;

  const persistedApprovalSnapshot = approvalRecordId
    ? {
        record_id: approvalRecordId,
        approval_id: safeString(approvalFields?.Approval_ID),
        idempotency_key: safeString(approvalFields?.Idempotency_Key),
        intent_id: safeString(approvalFields?.Intent_ID),
        persistence_id: safeString(approvalFields?.Persistence_ID),
        workspace_id: safeString(approvalFields?.Workspace_ID),
        incident_id: safeString(approvalFields?.Incident_ID),
        approval_status: safeString(approvalFields?.Approval_Status),
        operator_identity: safeString(approvalFields?.Operator_Identity),
        operator_decision: safeString(approvalFields?.Operator_Decision),
        target_capability: safeString(approvalFields?.Target_Capability),
        target_mode: safeString(approvalFields?.Target_Mode),
        approved_for_command_draft: safeBoolean(
          approvalFields?.Approved_For_Command_Draft
        ),
        command_creation_allowed: safeBoolean(
          approvalFields?.Command_Creation_Allowed
        ),
        run_creation_allowed: safeBoolean(approvalFields?.Run_Creation_Allowed),
        worker_call_allowed: safeBoolean(approvalFields?.Worker_Call_Allowed),
        real_run: safeString(approvalFields?.Real_Run),
        secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
        source_layer: safeString(approvalFields?.Source_Layer),
      }
    : null;

  const payload = {
    ok: true,
    version: VERSION,
    status,
    mode: "GATED_AUDITED_OPERATOR_APPROVAL_PERSISTENCE_PAGE_READ_ONLY",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,
    feature_gate_env: approvalGate.feature_gate_env,
    feature_gate_enabled: approvalGate.feature_gate_enabled,
    feature_gate_state: approvalGate.feature_gate_state,
    feature_gate_value: approvalGate.raw_value,

    intent_id: intentId,
    persistence_id: persistenceId,
    intent_idempotency_key: intentIdempotencyKey,

    approval_id: approvalId,
    approval_idempotency_key: approvalIdempotencyKey,
    intent_record_id: intentRecordId,
    approval_record_id: approvalRecordId,

    approval_status: approved ? "APPROVAL_PERSISTED" : "NOT_PERSISTED",
    approval_persistence: approved ? "PERSISTED" : "DISABLED",
    dashboard_airtable_mutation: approved
      ? "AUDITED_OPERATOR_APPROVAL_CREATED"
      : "DISABLED",

    command_creation: "DISABLED",
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",

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

    persisted_intent_snapshot: persistedIntentSnapshot,
    persisted_approval_snapshot: persistedApprovalSnapshot,

    approval_gate: {
      intent_found: intentFound,
      existing_approval_found: approved,
      feature_gate_enabled: approvalGate.feature_gate_enabled,
      required_confirmation_token: REQUIRED_CONFIRMATION_TOKEN,
      write_allowed_from_page: false,
      post_confirmation_required: true,
      command_creation_allowed_now: false,
      run_creation_allowed_now: false,
      worker_call_allowed_now: false,
      next_transition: "BLOCKED_UNTIL_COMMAND_DRAFT_LAYER",
    },

    guardrails: {
      page_read_only: true,
      client_fetch: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      dry_run_only: true,
      incident_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_mutation: "DISABLED",
      command_creation: "DISABLED",
      run_creation: "DISABLED",
      secret_exposure: "DISABLED",
      approval_persistence_gated: true,
    },

    next_step:
      "V5.12 may introduce an operator-approved command draft preview, still without command creation or worker execution.",
  };

  const incidentHref = withWorkspace(`/incidents/${incidentId}`, workspaceId);
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
          approved ? "green" : approvalGate.feature_gate_enabled ? "amber" : "red"
        }
      >
        <Eyebrow>Gated Audited Operator Approval Persistence</Eyebrow>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl">
          Persistance d’approbation opérateur
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-10 text-white/60">
          V5.11 prépare et contrôle la persistance d’une approbation opérateur.
          Cette page reste read-only : elle ne capture pas d’approbation, ne crée
          aucune Command, ne crée aucun Run et n’appelle aucun worker.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Badge tone="neutral">{VERSION}</Badge>
          <Badge
            tone={
              approved
                ? "green"
                : approvalGate.feature_gate_enabled
                  ? "amber"
                  : "red"
            }
          >
            {status}
          </Badge>
          <Badge tone="cyan">PAGE READ ONLY</Badge>
          <Badge tone="amber">POST CONFIRMATION REQUIRED</Badge>
          <Badge tone="red">NO COMMAND CREATION</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Previous Layer Validated</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Previous Version" value="Incident Detail V5.10" tone="green" />
          <DataTile
            label="Previous Status"
            value="OPERATOR_APPROVAL_DRAFT_READY"
            tone="green"
          />
          <DataTile label="Approval Draft" value="VALIDATED" tone="green" />
          <DataTile label="Command Creation" value="DISABLED" tone="red" />
        </div>
      </Card>

      <Card tone={approvalGate.feature_gate_enabled ? "green" : "red"}>
        <Eyebrow>Approval Persistence Gate</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Feature Gate Env" value={approvalGate.feature_gate_env} tone="cyan" />
          <DataTile
            label="Feature Gate Status"
            value={approvalGate.feature_gate_enabled ? "ENABLED" : "DISABLED"}
            tone={approvalGate.feature_gate_enabled ? "green" : "red"}
          />
          <DataTile label="Gate State" value={approvalGate.feature_gate_state} tone="amber" />
          <DataTile label="Required POST Token" value={REQUIRED_CONFIRMATION_TOKEN} tone="amber" />
          <DataTile label="Write From Page" value="NO" tone="red" />
        </div>
      </Card>

      <Card tone={intentFound ? "green" : "amber"}>
        <Eyebrow>Intent Under Approval</Eyebrow>

        <div className="grid gap-4">
          <DataTile
            label="Intent Found"
            value={intentFound ? "YES" : "NO"}
            tone={intentFound ? "green" : "amber"}
          />
          <DataTile label="Intent Record ID" value={intentRecordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Intent ID" value={intentId} tone="cyan" />
          <DataTile label="Persistence ID" value={persistenceId} tone="cyan" />
          <DataTile label="Intent Idempotency Key" value={intentIdempotencyKey} tone="cyan" />
        </div>
      </Card>

      <Card tone={approved ? "green" : "amber"}>
        <Eyebrow>Approval Persistence Contract</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Approval ID" value={approvalId} tone="cyan" />
          <DataTile label="Approval Idempotency Key" value={approvalIdempotencyKey} tone="cyan" />
          <DataTile
            label="Approval Record ID"
            value={approvalRecordId ?? "NOT_PERSISTED"}
            tone={approved ? "green" : "amber"}
          />
          <DataTile
            label="Approval Persistence"
            value={approved ? "PERSISTED" : "DISABLED"}
            tone={approved ? "green" : "red"}
          />
          <DataTile label="Operator Identity Required" value="YES" tone="amber" />
          <DataTile label="Command Creation Allowed" value="NO" tone="red" />
          <DataTile label="Run Creation Allowed" value="NO" tone="red" />
          <DataTile label="Worker Call Allowed" value="NO" tone="red" />
        </div>
      </Card>

      <Card tone="red">
        <Eyebrow>Execution Lock</Eyebrow>

        <div className="flex flex-wrap gap-3">
          <Badge tone="red">NO COMMAND CREATION</Badge>
          <Badge tone="red">NO RUN CREATION</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
          <Badge tone="red">NO POST /RUN</Badge>
          <Badge tone="red">NO REAL RUN</Badge>
          <Badge tone="red">NO SECRET EXPOSURE</Badge>
          <Badge tone="cyan">APPROVAL PERSISTENCE ONLY</Badge>
          <Badge tone="amber">FEATURE GATE REQUIRED</Badge>
        </div>

        <button
          type="button"
          disabled
          className="mt-8 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white/30"
        >
          Aucun bouton de persistance depuis cette page
        </button>
      </Card>

      <Card>
        <Eyebrow>Read-only Approval Persistence Payload</Eyebrow>
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

          <NavButton href={v510Href}>Retour V5.10 approval draft</NavButton>
          <NavButton href={v59Href}>Retour V5.9 intent review</NavButton>
          <NavButton href={v58Href}>Retour V5.8 gated persistence</NavButton>
        </div>
      </Card>
    </main>
  );
}
