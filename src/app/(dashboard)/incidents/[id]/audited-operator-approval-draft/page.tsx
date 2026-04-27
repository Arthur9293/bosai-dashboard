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

type ApprovalDraftStatus =
  | "OPERATOR_APPROVAL_DRAFT_READY"
  | "OPERATOR_INTENT_DRAFT_NOT_FOUND"
  | "OPERATOR_APPROVAL_DRAFT_CONFIG_MISSING"
  | "OPERATOR_APPROVAL_DRAFT_READ_FAILED";

const VERSION = "Incident Detail V5.10";

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
  return `operator-approval:v5.10:${workspaceId}:${incidentId}`;
}

function buildApprovalIdempotencyKey(
  workspaceId: string,
  incidentId: string
): string {
  return `dashboard:v5.10:operator-approval-draft:${workspaceId}:${incidentId}`;
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

async function findPersistedIntent(input: {
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

export default async function AuditedOperatorApprovalDraftPage(props: PageProps) {
  const params = await Promise.resolve(props.params);
  const searchParams = props.searchParams ? await props.searchParams : {};

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    firstSearchParam(searchParams, "workspace_id") ??
      firstSearchParam(searchParams, "workspaceId")
  );

  const token = getAirtableToken();
  const baseId = getAirtableBaseId();
  const table = getOperatorIntentsTable();

  const intentId = buildIntentId(workspaceId, incidentId);
  const persistenceId = buildPersistenceId(workspaceId, incidentId);
  const intentIdempotencyKey = buildIntentIdempotencyKey(workspaceId, incidentId);
  const approvalId = buildApprovalId(workspaceId, incidentId);
  const approvalIdempotencyKey = buildApprovalIdempotencyKey(
    workspaceId,
    incidentId
  );

  let status: ApprovalDraftStatus = "OPERATOR_APPROVAL_DRAFT_CONFIG_MISSING";
  let recordId: string | null = null;
  let fields: Record<string, unknown> | null = null;
  let airtableHttpStatus: number | null = null;
  let readError: string | null = null;

  if (token && baseId) {
    const result = await findPersistedIntent({
      token,
      baseId,
      table,
      idempotencyKey: intentIdempotencyKey,
    });

    airtableHttpStatus = result.status;
    recordId = result.recordId;
    fields = result.fields;
    readError = result.error;

    if (!result.ok) {
      status = "OPERATOR_APPROVAL_DRAFT_READ_FAILED";
    } else if (result.recordId) {
      status = "OPERATOR_APPROVAL_DRAFT_READY";
    } else {
      status = "OPERATOR_INTENT_DRAFT_NOT_FOUND";
    }
  }

  const found = Boolean(recordId);
  const intentStatus = safeString(fields?.Status) || "UNKNOWN";
  const targetCapability = safeString(fields?.Target_Capability) || "UNKNOWN";
  const targetMode = safeString(fields?.Target_Mode) || "UNKNOWN";

  const payload = {
    version: VERSION,
    status,
    mode: "AUDITED_OPERATOR_APPROVAL_DRAFT_ONLY",
    incident_id: incidentId,
    workspace_id: workspaceId,
    record_id: recordId,
    intent_id: intentId,
    persistence_id: persistenceId,
    intent_idempotency_key: intentIdempotencyKey,
    approval_id: approvalId,
    approval_idempotency_key: approvalIdempotencyKey,
    approval_status: found
      ? "APPROVAL_DRAFT_READY"
      : "APPROVAL_DRAFT_BLOCKED",
    approval_capture: "DISABLED",
    approval_persistence: "DISABLED",
    operator_identity: "REQUIRED_NOT_CAPTURED",
    operator_approval: "DRAFT_NOT_APPROVED",
    command_creation: "DISABLED",
    run_creation: "DISABLED",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    real_run: "FORBIDDEN",
    secret_exposure: "DISABLED",
    airtable_read: {
      base_id: baseId ? "CONFIGURED" : "MISSING",
      table,
      token: token ? "CONFIGURED" : "MISSING",
      token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
      http_status: airtableHttpStatus,
      error: readError,
    },
    persisted_intent_snapshot: recordId
      ? {
          record_id: recordId,
          idempotency_key: safeString(fields?.Idempotency_Key),
          intent_id: safeString(fields?.Intent_ID),
          persistence_id: safeString(fields?.Persistence_ID),
          workspace_id: safeString(fields?.Workspace_ID),
          incident_id: safeString(fields?.Incident_ID),
          target_capability: safeString(fields?.Target_Capability),
          target_mode: safeString(fields?.Target_Mode),
          proposed_action: safeString(fields?.Proposed_Action),
          status: safeString(fields?.Status),
          operator_confirmation: safeString(fields?.Operator_Confirmation),
          execution_allowed: safeBoolean(fields?.Execution_Allowed),
          submission_allowed: safeBoolean(fields?.Submission_Allowed),
          persistence_allowed: safeBoolean(fields?.Persistence_Allowed),
          real_run: safeString(fields?.Real_Run),
          secret_exposure: safeString(fields?.Secret_Exposure),
          source_layer: safeString(fields?.Source_Layer),
        }
      : null,
    next_step:
      "V5.11 may introduce gated audited operator approval persistence, still without command creation or worker execution.",
  };

  const incidentHref = withWorkspace(`/incidents/${incidentId}`, workspaceId);
  const v59Href = withWorkspace(
    `/incidents/${incidentId}/operator-intent-review-surface`,
    workspaceId
  );
  const v58Href = withWorkspace(
    `/incidents/${incidentId}/gated-audited-intent-persistence`,
    workspaceId
  );
  const v57Href = withWorkspace(
    `/incidents/${incidentId}/server-side-dry-run-write-preview`,
    workspaceId
  );
  const v56Href = withWorkspace(
    `/incidents/${incidentId}/gated-audited-intent-persistence-preview`,
    workspaceId
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 text-white sm:px-6 lg:px-8">
      <Card tone={found ? "green" : "amber"}>
        <Eyebrow>Audited Operator Approval Draft</Eyebrow>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl">
          Brouillon d’approbation opérateur
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-10 text-white/60">
          V5.10 prépare une approbation opérateur auditable à partir de
          l’intention Draft relue en V5.9. Cette surface ne capture pas
          l’approbation, ne la persiste pas, ne crée aucune Command, ne crée
          aucun Run et n’appelle aucun worker.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Badge tone={found ? "green" : "amber"}>{status}</Badge>
          <Badge tone="cyan">APPROVAL DRAFT ONLY</Badge>
          <Badge tone="amber">APPROVAL NOT CAPTURED</Badge>
          <Badge tone="red">NO COMMAND CREATION</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Previous Layer Validated</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Previous Version" value="Incident Detail V5.9" tone="green" />
          <DataTile
            label="Previous Status"
            value="OPERATOR_INTENT_REVIEW_READY"
            tone="green"
          />
          <DataTile label="Review Policy" value="READ_ONLY_INTENT_REVIEW" tone="cyan" />
          <DataTile label="Command Creation" value="DISABLED" tone="red" />
        </div>
      </Card>

      <Card tone={found ? "green" : "amber"}>
        <Eyebrow>Intent Under Review</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Draft Found" value={found ? "YES" : "NO"} tone={found ? "green" : "amber"} />
          <DataTile label="Record ID" value={recordId ?? "NOT_FOUND"} tone="cyan" />
          <DataTile label="Intent ID" value={intentId} tone="cyan" />
          <DataTile label="Persistence ID" value={persistenceId} tone="cyan" />
          <DataTile label="Intent Idempotency Key" value={intentIdempotencyKey} tone="cyan" />
          <DataTile label="Current Intent Status" value={intentStatus} tone="amber" />
          <DataTile label="Target Capability" value={targetCapability} tone="cyan" />
          <DataTile label="Target Mode" value={targetMode} tone="cyan" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Approval Draft</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Approval ID" value={approvalId} tone="cyan" />
          <DataTile label="Approval Idempotency Key" value={approvalIdempotencyKey} tone="cyan" />
          <DataTile label="Approval Status" value={found ? "APPROVAL_DRAFT_READY" : "APPROVAL_DRAFT_BLOCKED"} tone={found ? "green" : "amber"} />
          <DataTile label="Operator Identity" value="REQUIRED_NOT_CAPTURED" tone="amber" />
          <DataTile label="Operator Approval" value="DRAFT_NOT_APPROVED" tone="amber" />
          <DataTile label="Approval Capture" value="DISABLED" tone="red" />
          <DataTile label="Approval Persistence" value="DISABLED" tone="red" />
        </div>
      </Card>

      <Card tone="amber">
        <Eyebrow>Approval Gate</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Requires Operator Identity" value="YES" tone="amber" />
          <DataTile label="Requires Explicit Approval" value="YES" tone="amber" />
          <DataTile label="Requires Approval Audit Trail" value="YES" tone="amber" />
          <DataTile label="Requires Dedicated Approval Feature Gate" value="YES" tone="amber" />
          <DataTile label="Requires Command Creation Feature Gate" value="YES" tone="amber" />
          <DataTile label="Next Transition" value="BLOCKED_UNTIL_APPROVAL_PERSISTENCE_LAYER" tone="amber" />
        </div>
      </Card>

      <Card tone="red">
        <Eyebrow>Execution Lock</Eyebrow>

        <div className="flex flex-wrap gap-3">
          <Badge tone="red">NO APPROVAL CAPTURE</Badge>
          <Badge tone="red">NO APPROVAL PERSISTENCE</Badge>
          <Badge tone="red">NO COMMAND CREATION</Badge>
          <Badge tone="red">NO RUN CREATION</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
          <Badge tone="red">NO POST /RUN</Badge>
          <Badge tone="red">NO REAL RUN</Badge>
          <Badge tone="red">NO SECRET EXPOSURE</Badge>
          <Badge tone="cyan">APPROVAL DRAFT ONLY</Badge>
        </div>

        <button
          type="button"
          disabled
          className="mt-8 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white/30"
        >
          Approbation future non activée
        </button>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Future Approval Requirements</Eyebrow>

        <div className="grid gap-4 text-lg leading-8 text-white/70">
          {[
            "Operator identity must be known",
            "Operator approval must be explicit",
            "Approval must be persisted before command creation",
            "Approval persistence must have a dedicated feature gate",
            "Approval idempotency key must be deterministic",
            "Workspace scope must be preserved",
            "Approval must reference the persisted intent record",
            "Command creation must remain disabled during approval draft",
            "No worker call should happen during approval draft",
            "Rollback or safe cancel path must exist",
            "No secret exposure is allowed",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5"
            >
              {item}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Eyebrow>Read-only Approval Draft Payload</Eyebrow>
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

          <NavButton href={v59Href}>Retour V5.9 operator intent review</NavButton>
          <NavButton href={v58Href}>Retour V5.8 gated persistence</NavButton>
          <NavButton href={v57Href}>Retour V5.7 dry-run write preview</NavButton>
          <NavButton href={v56Href}>Retour V5.6 gated persistence preview</NavButton>
        </div>
      </Card>
    </main>
  );
}
