import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type DryRunWriteStatus =
  | "DRY_RUN_WRITE_BLOCKED_BY_FEATURE_GATE"
  | "SERVER_SIDE_DRY_RUN_WRITE_PREVIEW_READY";

const VERSION = "Incident Detail V5.7";
const SOURCE =
  "dashboard_incident_detail_v5_7_server_side_dry_run_write_preview";
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

  return ["true", "1", "yes", "on"].includes(raw.trim().toLowerCase());
}

function buildIntentId(workspaceId: string, incidentId: string): string {
  return `operator-intent:v5.4:${workspaceId}:${incidentId}`;
}

function buildPersistenceId(workspaceId: string, incidentId: string): string {
  return `intent-persistence:v5.5:${workspaceId}:${incidentId}`;
}

function buildWritePreviewId(workspaceId: string, incidentId: string): string {
  return `server-dryrun-write-preview:v5.7:${workspaceId}:${incidentId}`;
}

function buildIdempotencyKey(workspaceId: string, incidentId: string): string {
  return `dashboard:v5.7:server-side-dry-run-write-preview:${workspaceId}:${incidentId}`;
}

function buildFieldMapping(input: {
  incidentId: string;
  workspaceId: string;
  intentId: string;
  persistenceId: string;
  writePreviewId: string;
}) {
  return {
    Intent_ID: input.intentId,
    Persistence_ID: input.persistenceId,
    Write_Preview_ID: input.writePreviewId,
    Workspace_ID: input.workspaceId,
    Incident_ID: input.incidentId,
    Target_Capability: "command_orchestrator",
    Target_Mode: "dry_run_only",
    Proposed_Action: "prepare_controlled_worker_dry_run_followup",
    Status: "Draft",
    Operator_Confirmation: "Required",
    Execution_Allowed: false,
    Submission_Allowed: false,
    Persistence_Allowed: false,
    Real_Run: "Forbidden",
    Secret_Exposure: "Disabled",
    Source_Layer: VERSION,
  };
}

function buildPayload(input: {
  incidentId: string;
  workspaceId: string;
  featureGateEnabled: boolean;
}) {
  const intentId = buildIntentId(input.workspaceId, input.incidentId);
  const persistenceId = buildPersistenceId(input.workspaceId, input.incidentId);
  const writePreviewId = buildWritePreviewId(
    input.workspaceId,
    input.incidentId
  );
  const idempotencyKey = buildIdempotencyKey(
    input.workspaceId,
    input.incidentId
  );

  const status: DryRunWriteStatus = input.featureGateEnabled
    ? "SERVER_SIDE_DRY_RUN_WRITE_PREVIEW_READY"
    : "DRY_RUN_WRITE_BLOCKED_BY_FEATURE_GATE";

  const writePreview = input.featureGateEnabled
    ? "READY_BUT_NOT_WRITTEN"
    : "BLOCKED_NOT_WRITTEN";

  const gateStatus = input.featureGateEnabled
    ? "ENABLED_DRY_RUN_PREVIEW_ONLY"
    : "BLOCKED";

  const fieldMapping = buildFieldMapping({
    incidentId: input.incidentId,
    workspaceId: input.workspaceId,
    intentId,
    persistenceId,
    writePreviewId,
  });

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status,
    mode: "SERVER_SIDE_DRY_RUN_WRITE_PREVIEW_ONLY",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,

    feature_gate_env: FEATURE_GATE_ENV,
    feature_gate_enabled: input.featureGateEnabled,

    write_preview: writePreview,
    write_preview_id: writePreviewId,
    intent_id: intentId,
    persistence_id: persistenceId,
    persistence_status: "NOT_PERSISTED",

    intent_submission: "DISABLED",
    intent_persistence: "DISABLED",
    airtable_write: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",
    operator_confirmation: "REQUIRED_BUT_NOT_CAPTURED",
    real_run: "FORBIDDEN",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    secret_exposure: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.6",
      status: "PERSISTENCE_BLOCKED_BY_FEATURE_GATE_OR_PREVIEW_READY",
      gated_persistence_preview: "VALIDATED",
      execution_policy: "READ_ONLY_GATED_PERSISTENCE_PREVIEW",
    },

    dry_run_write_gate: {
      feature_gate_env: FEATURE_GATE_ENV,
      feature_gate_enabled: input.featureGateEnabled,
      gate_status: gateStatus,
      write_allowed_now: false,
      dry_run_write_preview_only: true,
    },

    dry_run_write_contract: {
      target_storage: "future_audit_store_or_airtable_table",
      target_table: "Operator_Intents",
      target_record_status: "Draft",
      write_preview_id: writePreviewId,
      idempotency_key: idempotencyKey,
      deterministic: true,
      workspace_scope: input.workspaceId,
      incident_scope: input.incidentId,
      write_allowed_now: false,
      write_sent: false,
      submission_allowed_now: false,
      persistence_allowed_now: false,
    },

    airtable_request_preview: {
      method: "POST",
      target_table: "Operator_Intents",
      execution: "DRY_RUN_NOT_SENT",
      write_sent: false,
      mutation: "DISABLED",
      headers: {
        authorization: "SERVER_SIDE_ONLY_NOT_EXPOSED",
        content_type: "application/json",
      },
      body: {
        fields: fieldMapping,
      },
    },

    required_fields_check: {
      Intent_ID: "READY",
      Persistence_ID: "READY",
      Write_Preview_ID: "READY",
      Workspace_ID: "READY",
      Incident_ID: "READY",
      Target_Capability: "READY",
      Target_Mode: "READY",
      Proposed_Action: "READY",
      Status: "READY",
      Operator_Confirmation: "REQUIRED",
      Execution_Allowed: false,
      Submission_Allowed: false,
      Persistence_Allowed: false,
      Real_Run: "FORBIDDEN",
      Secret_Exposure: "DISABLED",
    },

    guardrails: {
      client_fetch: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      airtable_mutation: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      intent_persistence: "DISABLED",
      intent_submission: "DISABLED",
      incident_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_mutation: "DISABLED",
      secret_exposure: "DISABLED",
      real_run: "FORBIDDEN",
      dry_run_only: true,
      dry_run_write_preview_only: true,
      write_sent: false,
      operator_confirmation_required: true,
      feature_gate_required: true,
    },

    next_step:
      "V5.8 may introduce gated audited intent persistence, still without direct real execution.",
  };
}

function withWorkspace(href: string, workspaceId: string): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}workspace_id=${encodeURIComponent(workspaceId)}`;
}

function Card(props: {
  children: ReactNode;
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
      className={[
        "inline-flex max-w-full items-center rounded-full border px-5 py-3",
        "break-all text-xs font-black uppercase tracking-[0.32em]",
        toneClass,
      ].join(" ")}
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

export default async function ServerSideDryRunWritePreviewPage(
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
  const v56Href = withWorkspace(
    `/incidents/${incidentId}/gated-audited-intent-persistence-preview`,
    workspaceId
  );
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
        <Eyebrow>Server-side Dry-run Write Preview</Eyebrow>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl">
          Prévisualisation d’écriture dry run
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-10 text-white/60">
          V5.7 construit côté serveur le contrat d’écriture Airtable qui pourra
          être utilisé plus tard pour persister une intention opérateur. Cette
          surface ne déclenche aucune écriture, aucun worker call, aucun POST
          /run et aucune exécution réelle.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Badge tone={gateEnabled ? "green" : "amber"}>{payload.status}</Badge>
          <Badge tone="cyan">DRY RUN WRITE PREVIEW</Badge>
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
            label="Gated Persistence Preview"
            value={payload.previous_layer.gated_persistence_preview}
            tone="green"
          />
          <DataTile
            label="Execution Policy"
            value={payload.previous_layer.execution_policy}
            tone="cyan"
          />
        </div>
      </Card>

      <Card tone={gateEnabled ? "green" : "amber"}>
        <Eyebrow>Dry-run Write Gate</Eyebrow>

        <div className="grid gap-4">
          <DataTile
            label="Feature Gate Env"
            value={payload.dry_run_write_gate.feature_gate_env}
            tone="cyan"
          />
          <DataTile
            label="Feature Gate Status"
            value={gateEnabled ? "ENABLED" : "DISABLED"}
            tone={gateEnabled ? "green" : "amber"}
          />
          <DataTile
            label="Gate Status"
            value={payload.dry_run_write_gate.gate_status}
            tone={gateEnabled ? "green" : "amber"}
          />
          <DataTile label="Write Allowed Now" value="NO" tone="red" />
          <DataTile label="Dry-run Write Preview Only" value="YES" tone="green" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Dry-run Write Contract</Eyebrow>

        <div className="grid gap-4">
          <DataTile
            label="Write Preview ID"
            value={payload.write_preview_id}
            tone="cyan"
          />
          <DataTile label="Persistence ID" value={payload.persistence_id} />
          <DataTile label="Intent ID" value={payload.intent_id} />
          <DataTile
            label="Target Table"
            value={payload.dry_run_write_contract.target_table}
            tone="cyan"
          />
          <DataTile
            label="Target Record Status"
            value={payload.dry_run_write_contract.target_record_status}
            tone="amber"
          />
          <DataTile
            label="Idempotency Key"
            value={payload.dry_run_write_contract.idempotency_key}
            tone="cyan"
          />
          <DataTile label="Deterministic" value="YES" tone="green" />
          <DataTile
            label="Workspace Scope"
            value={payload.dry_run_write_contract.workspace_scope}
            tone="cyan"
          />
          <DataTile
            label="Incident Scope"
            value={payload.dry_run_write_contract.incident_scope}
            tone="cyan"
          />
          <DataTile label="Write Sent" value="NO" tone="red" />
          <DataTile label="Persistence Allowed Now" value="NO" tone="red" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Airtable Request Preview</Eyebrow>
        <JsonBlock value={payload.airtable_request_preview} />
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
          <Badge tone="cyan">DRY RUN WRITE PREVIEW ONLY</Badge>
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
          Écriture réelle non activée
        </button>
      </Card>

      <Card>
        <Eyebrow>Read-only Dry-run Write Payload</Eyebrow>
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

          <NavButton href={v56Href}>
            Retour V5.6 gated audited intent persistence preview
          </NavButton>

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
