import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type FeatureGateStatus =
  | "PERSISTENCE_BLOCKED_BY_FEATURE_GATE"
  | "PERSISTENCE_PREVIEW_READY_BUT_NOT_EXECUTED";

type FeatureGateState = "BLOCKED" | "ENABLED_PREVIEW_ONLY";

const VERSION = "Incident Detail V5.6";
const SOURCE =
  "dashboard_incident_detail_v5_6_gated_audited_intent_persistence_preview";
const FEATURE_GATE_ENV = "BOSAI_AUDITED_INTENT_PERSISTENCE_ENABLED";

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

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function isFeatureGateEnabled(): boolean {
  const raw = process.env[FEATURE_GATE_ENV];

  if (typeof raw !== "string") {
    return false;
  }

  const normalized = raw.trim().toLowerCase();

  return ["true", "1", "yes", "on"].includes(normalized);
}

function buildIntentId(workspaceId: string, incidentId: string): string {
  return `operator-intent:v5.4:${workspaceId}:${incidentId}`;
}

function buildPersistenceId(workspaceId: string, incidentId: string): string {
  return `intent-persistence:v5.5:${workspaceId}:${incidentId}`;
}

function buildIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.6:gated-intent-persistence-preview:${workspaceId}:${incidentId}`;
}

function buildPayload(input: {
  incidentId: string;
  workspaceId: string;
  featureGateEnabled: boolean;
}) {
  const status: FeatureGateStatus = input.featureGateEnabled
    ? "PERSISTENCE_PREVIEW_READY_BUT_NOT_EXECUTED"
    : "PERSISTENCE_BLOCKED_BY_FEATURE_GATE";

  const gateStatus: FeatureGateState = input.featureGateEnabled
    ? "ENABLED_PREVIEW_ONLY"
    : "BLOCKED";

  const persistencePreview = input.featureGateEnabled
    ? "READY_BUT_NOT_EXECUTED"
    : "BLOCKED_NOT_EXECUTED";

  const intentId = buildIntentId(input.workspaceId, input.incidentId);
  const persistenceId = buildPersistenceId(input.workspaceId, input.incidentId);
  const idempotencyKey = buildIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status,
    mode: "GATED_AUDITED_INTENT_PERSISTENCE_PREVIEW_ONLY",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,

    feature_gate_env: FEATURE_GATE_ENV,
    feature_gate_enabled: input.featureGateEnabled,

    persistence_preview: persistencePreview,
    intent_id: intentId,
    persistence_id: persistenceId,
    persistence_status: "NOT_PERSISTED",

    intent_submission: "DISABLED",
    intent_persistence: "DISABLED",
    operator_confirmation: "REQUIRED_BUT_NOT_CAPTURED",
    real_run: "FORBIDDEN",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.5",
      status: "INTENT_PERSISTENCE_DRAFT_READY",
      persistence_status: "DRAFT_NOT_PERSISTED",
      intent_persistence_draft: "VALIDATED",
      execution_policy: "READ_ONLY_PERSISTENCE_DRAFT",
    },

    persistence_gate: {
      feature_gate_env: FEATURE_GATE_ENV,
      feature_gate_enabled: input.featureGateEnabled,
      gate_status: gateStatus,
      write_allowed_now: false,
      preview_only: true,
    },

    persistence_contract_preview: {
      target_storage: "future_audit_store_or_airtable_table",
      target_table: "Operator_Intents",
      target_record_status: "Draft",
      idempotency_key: idempotencyKey,
      deterministic: true,
      workspace_scope: input.workspaceId,
      incident_scope: input.incidentId,
      write_allowed_now: false,
      submission_allowed_now: false,
    },

    required_fields_check: {
      Intent_ID: "READY",
      Persistence_ID: "READY",
      Workspace_ID: "READY",
      Incident_ID: "READY",
      Target_Capability: "READY",
      Target_Mode: "READY",
      Proposed_Action: "READY",
      Status: "READY",
      Operator_Confirmation: "REQUIRED",
      Execution_Allowed: false,
      Submission_Allowed: false,
      Real_Run: "FORBIDDEN",
      Secret_Exposure: "DISABLED",
    },

    guardrails: {
      client_fetch: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      airtable_mutation: "DISABLED",
      intent_persistence: "DISABLED",
      intent_submission: "DISABLED",
      incident_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_mutation: "DISABLED",
      secret_exposure: "DISABLED",
      real_run: "FORBIDDEN",
      dry_run_only: true,
      operator_confirmation_required: true,
      feature_gate_required: true,
    },

    next_step:
      "V5.7 may introduce gated audited intent persistence as a server-side dry-run write preview, still without real execution.",
  };
}

function withWorkspace(href: string, workspaceId: string): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}workspace_id=${encodeURIComponent(workspaceId)}`;
}

function Card(props: {
  children: React.ReactNode;
  tone?: "default" | "cyan" | "green" | "amber" | "red";
  className?: string;
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
      className={[
        "rounded-[2rem] border p-7 shadow-2xl shadow-black/30",
        toneClass,
        props.className ?? "",
      ].join(" ")}
    >
      {props.children}
    </section>
  );
}

function Eyebrow(props: { children: React.ReactNode }) {
  return (
    <p className="mb-5 text-xs font-black uppercase tracking-[0.45em] text-white/35">
      {props.children}
    </p>
  );
}

function Badge(props: {
  children: React.ReactNode;
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
      className={[
        "inline-flex max-w-full items-center rounded-full border px-5 py-3",
        "text-xs font-black uppercase tracking-[0.32em]",
        "break-all",
        toneClass,
      ].join(" ")}
    >
      {props.children}
    </span>
  );
}

function DataTile(props: {
  label: string;
  value: React.ReactNode;
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
      <div
        className={[
          "break-all font-mono text-xl font-black leading-snug",
          valueClass,
        ].join(" ")}
      >
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

function NavButton(props: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={props.href}
      className="block rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-4 text-center text-sm font-black text-cyan-50 transition hover:bg-cyan-500/15"
    >
      {props.children}
    </Link>
  );
}

export default async function GatedAuditedIntentPersistencePreviewPage(
  props: PageProps
) {
  const params = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : {};

  const incidentId = normalizeIncidentId(params.id);
  const workspaceId = normalizeWorkspaceId(
    firstSearchParam(searchParams, "workspace_id") ??
      firstSearchParam(searchParams, "workspaceId")
  );

  const payload = buildPayload({
    incidentId,
    workspaceId,
    featureGateEnabled: isFeatureGateEnabled(),
  });

  const gateEnabled = payload.feature_gate_enabled;

  const incidentHref = withWorkspace(`/incidents/${incidentId}`, workspaceId);
  const v55Href = withWorkspace(
    `/incidents/${incidentId}/audited-intent-persistence-draft`,
    workspaceId
  );
  const v54Href = withWorkspace(
    `/incidents/${incidentId}/audited-operator-intent-draft`,
    workspaceId
  );
  const v53Href = withWorkspace(
    `/incidents/${incidentId}/operator-confirmation-surface`,
    workspaceId
  );
  const v521Href = withWorkspace(
    `/incidents/${incidentId}/controlled-worker-dry-run-call`,
    workspaceId
  );
  const v51Href = withWorkspace(
    `/incidents/${incidentId}/worker-dry-run-adapter-preview`,
    workspaceId
  );
  const v50Href = withWorkspace(
    `/incidents/${incidentId}/server-read-preview`,
    workspaceId
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 text-white sm:px-6 lg:px-8">
      <Card tone="cyan" className="p-8 sm:p-10">
        <Eyebrow>Gated Audited Intent Persistence Preview</Eyebrow>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl">
          Prévisualisation de persistance auditée
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-10 text-white/60">
          V5.6 prépare le gating de la future persistance auditée d’une
          intention opérateur. Cette surface reste strictement read-only :
          aucune écriture Airtable, aucune persistance, aucun appel worker et
          aucune exécution réelle.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Badge tone={gateEnabled ? "green" : "amber"}>{payload.status}</Badge>
          <Badge tone="cyan">PREVIEW ONLY</Badge>
          <Badge tone="red">NO AIRTABLE WRITE</Badge>
          <Badge tone="red">NO REAL RUN</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Previous Layer Validated</Eyebrow>

        <div className="grid gap-4">
          <DataTile
            label="Version"
            value={payload.previous_layer.version}
            tone="green"
          />
          <DataTile
            label="Status"
            value={payload.previous_layer.status}
            tone="green"
          />
          <DataTile
            label="Persistence Status"
            value={payload.previous_layer.persistence_status}
            tone="amber"
          />
          <DataTile
            label="Execution Policy"
            value={payload.previous_layer.execution_policy}
            tone="cyan"
          />
        </div>
      </Card>

      <Card tone={gateEnabled ? "green" : "amber"}>
        <Eyebrow>Persistence Gate</Eyebrow>

        <div className="grid gap-4">
          <DataTile
            label="Feature Gate Env"
            value={payload.persistence_gate.feature_gate_env}
            tone="cyan"
          />
          <DataTile
            label="Feature Gate Status"
            value={gateEnabled ? "ENABLED" : "DISABLED"}
            tone={gateEnabled ? "green" : "amber"}
          />
          <DataTile
            label="Gate Status"
            value={payload.persistence_gate.gate_status}
            tone={gateEnabled ? "green" : "amber"}
          />
          <DataTile label="Write Allowed Now" value="NO" tone="red" />
          <DataTile label="Preview Only" value="YES" tone="green" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Persistence Contract Preview</Eyebrow>

        <div className="grid gap-4">
          <DataTile
            label="Persistence ID"
            value={payload.persistence_id}
            tone="cyan"
          />
          <DataTile label="Intent ID" value={payload.intent_id} tone="cyan" />
          <DataTile
            label="Target Table Preview"
            value={payload.persistence_contract_preview.target_table}
            tone="cyan"
          />
          <DataTile
            label="Target Record Status"
            value={payload.persistence_contract_preview.target_record_status}
            tone="amber"
          />
          <DataTile
            label="Idempotency Key"
            value={payload.persistence_contract_preview.idempotency_key}
            tone="cyan"
          />
          <DataTile label="Deterministic" value="YES" tone="green" />
          <DataTile
            label="Workspace Scope"
            value={payload.persistence_contract_preview.workspace_scope}
            tone="cyan"
          />
          <DataTile
            label="Incident Scope"
            value={payload.persistence_contract_preview.incident_scope}
            tone="cyan"
          />
          <DataTile label="Write Allowed Now" value="NO" tone="red" />
          <DataTile label="Submission Allowed Now" value="NO" tone="red" />
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Required Fields Check</Eyebrow>

        <div className="grid gap-4">
          {Object.entries(payload.required_fields_check).map(([key, value]) => {
            const isNegative =
              value === false ||
              value === "FORBIDDEN" ||
              value === "DISABLED";
            const isRequired = value === "REQUIRED";

            return (
              <DataTile
                key={key}
                label={key}
                value={String(value)}
                tone={isNegative ? "red" : isRequired ? "amber" : "green"}
              />
            );
          })}
        </div>
      </Card>

      <Card tone="red">
        <Eyebrow>Execution Lock</Eyebrow>

        <div className="flex flex-wrap gap-3">
          <Badge tone="red">NO REAL RUN</Badge>
          <Badge tone="cyan">DRY RUN ONLY</Badge>
          <Badge tone="red">NO POST /RUN</Badge>
          <Badge tone="red">NO WORKER CALL FROM THIS SURFACE</Badge>
          <Badge tone="red">NO AIRTABLE WRITE</Badge>
          <Badge tone="red">NO INTENT PERSISTENCE</Badge>
          <Badge tone="amber">INTENT NOT SUBMITTED</Badge>
          <Badge tone="amber">HUMAN CONFIRMATION REQUIRED</Badge>
          <Badge tone="amber">FEATURE GATE REQUIRED</Badge>
        </div>

        <button
          type="button"
          disabled
          className="mt-8 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white/30"
        >
          Persistance réelle non activée
        </button>
      </Card>

      <Card>
        <Eyebrow>Read-only Gated Persistence Payload</Eyebrow>
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

          <NavButton href={v55Href}>
            Retour V5.5 audited intent persistence draft
          </NavButton>

          <NavButton href={v54Href}>
            Retour V5.4 audited operator intent draft
          </NavButton>

          <NavButton href={v53Href}>
            Retour V5.3 operator confirmation surface
          </NavButton>

          <NavButton href={v521Href}>
            Retour V5.2.1 controlled worker dry run call
          </NavButton>

          <NavButton href={v51Href}>Retour V5.1 adapter preview</NavButton>

          <NavButton href={v50Href}>
            Retour V5.0 server read preview
          </NavButton>
        </div>
      </Card>
    </main>
  );
}
