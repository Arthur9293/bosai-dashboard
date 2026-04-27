import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  params?: Promise<{
    id?: string;
  }> | {
    id?: string;
  };
  searchParams?: Promise<SearchParams> | SearchParams;
};

type Tone = "cyan" | "green" | "amber" | "red" | "neutral";

const VERSION = "Incident Detail V5.5";
const SOURCE = "dashboard_incident_detail_v5_5_audited_intent_persistence_draft";

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeText(value: string | null | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeIdPart(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return "unknown";
  }

  return trimmed
    .replace(/[^a-zA-Z0-9._:-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);
}

function buildPayload(input: { incidentId: string; workspaceId: string }) {
  const incidentId = normalizeIdPart(input.incidentId);
  const workspaceId = normalizeIdPart(input.workspaceId);

  const intentId = `operator-intent:v5.4:${workspaceId}:${incidentId}`;
  const persistenceId = `intent-persistence:v5.5:${workspaceId}:${incidentId}`;
  const idempotencyKey = `dashboard:v5.5:intent-persistence-draft:${workspaceId}:${incidentId}`;

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status: "INTENT_PERSISTENCE_DRAFT_READY",
    mode: "AUDITED_INTENT_PERSISTENCE_DRAFT_ONLY",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,

    intent_id: intentId,
    persistence_id: persistenceId,
    persistence_status: "DRAFT_NOT_PERSISTED",

    intent_submission: "DISABLED",
    intent_persistence: "DISABLED",
    operator_confirmation: "REQUIRED_BUT_NOT_CAPTURED",
    real_run: "FORBIDDEN",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.4",
      status: "OPERATOR_INTENT_DRAFT_READY",
      intent_status: "DRAFT_NOT_SUBMITTED",
      operator_intent_draft: "VALIDATED",
      execution_policy: "READ_ONLY_INTENT_DRAFT",
    },

    persistence_draft: {
      type: "audited_operator_intent_persistence",
      target_storage: "future_audit_store_or_airtable_table",
      target_table: "Operator_Intents",
      target_record_status: "Draft",
      write_allowed_now: false,
      submission_allowed_now: false,
      requires_operator_identity: true,
      requires_operator_confirmation: true,
      requires_dedicated_feature_gate: true,
      requires_audit_trail: true,
      requires_idempotency_key: true,
      requires_workspace_scope: true,
      requires_rollback_or_cancel_path: true,
    },

    idempotency: {
      key: idempotencyKey,
      deterministic: true,
      secret: false,
      scope: "workspace_and_incident",
    },

    field_mapping_preview: {
      Intent_ID: intentId,
      Persistence_ID: persistenceId,
      Workspace_ID: workspaceId,
      Incident_ID: incidentId,
      Target_Capability: "command_orchestrator",
      Target_Mode: "dry_run_only",
      Proposed_Action: "prepare_controlled_worker_dry_run_followup",
      Status: "Draft",
      Operator_Confirmation: "Required",
      Execution_Allowed: false,
      Submission_Allowed: false,
      Real_Run: "Forbidden",
      Secret_Exposure: "Disabled",
    },

    audit_requirements: [
      "Operator identity must be known before persistence",
      "Operator confirmation must be explicit",
      "Persistence must be protected by a dedicated feature gate",
      "Idempotency key must be deterministic",
      "Workspace scope must be preserved",
      "Intent status must start as Draft",
      "No worker call is allowed during persistence draft",
      "No real run is allowed",
      "Rollback or safe cancel path must exist",
      "No secret exposure is allowed",
    ],

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
    },

    next_step:
      "V5.6 may introduce gated audited intent persistence, still without direct real execution.",
  };
}

function toneClassName(tone: Tone): string {
  if (tone === "green") {
    return "border-emerald-400/35 bg-emerald-500/10 text-emerald-200";
  }

  if (tone === "amber") {
    return "border-yellow-400/40 bg-yellow-500/10 text-yellow-200";
  }

  if (tone === "red") {
    return "border-rose-400/35 bg-rose-500/10 text-rose-200";
  }

  if (tone === "neutral") {
    return "border-white/10 bg-white/[0.04] text-zinc-200";
  }

  return "border-cyan-400/35 bg-cyan-500/10 text-cyan-100";
}

function Badge({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={[
        "inline-flex max-w-full items-center rounded-full border px-5 py-3",
        "text-xs font-black uppercase tracking-[0.35em]",
        "break-words leading-relaxed",
        toneClassName(tone),
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function Section({
  title,
  tone = "neutral",
  children,
}: {
  title: string;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <section
      className={[
        "rounded-[34px] border p-6 sm:p-8",
        "shadow-[0_0_80px_rgba(34,211,238,0.04)]",
        toneClassName(tone),
      ].join(" ")}
    >
      <h2 className="mb-6 text-xs font-black uppercase tracking-[0.45em] text-zinc-500">
        {title}
      </h2>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FieldCard({
  label,
  value,
  tone = "cyan",
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-black/30 p-5">
      <div className="mb-3 text-[11px] font-black uppercase tracking-[0.4em] text-zinc-600">
        {label}
      </div>

      <div
        className={[
          "font-mono text-2xl font-black leading-relaxed break-words",
          tone === "green"
            ? "text-emerald-200"
            : tone === "amber"
              ? "text-yellow-200"
              : tone === "red"
                ? "text-rose-200"
                : tone === "neutral"
                  ? "text-zinc-100"
                  : "text-cyan-100",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function TextItem({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/25 p-5 text-xl leading-relaxed text-zinc-300">
      {children}
    </div>
  );
}

function JsonPreview({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <Section title={title} tone="neutral">
      <div className="overflow-x-auto rounded-[28px] border border-white/10 bg-black p-5">
        <pre className="min-w-max whitespace-pre text-sm leading-relaxed text-zinc-200">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    </Section>
  );
}

function NavigationLink({
  href,
  children,
  tone = "neutral",
}: {
  href: string;
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex min-h-16 items-center justify-center rounded-full border px-6 py-4",
        "text-center text-base font-bold transition hover:bg-white/[0.06]",
        toneClassName(tone),
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export default async function AuditedIntentPersistenceDraftPage(props: PageProps) {
  const params = await Promise.resolve(props.params ?? {});
  const searchParams = await Promise.resolve(props.searchParams ?? {});

  const incidentId = normalizeText(params.id, "unknown");
  const workspaceId = normalizeText(
    firstParam(searchParams.workspace_id) ?? firstParam(searchParams.workspaceId),
    "production"
  );

  const payload = buildPayload({
    incidentId,
    workspaceId,
  });

  const incidentPathId = encodeURIComponent(payload.incident_id);
  const workspaceQuery = `workspace_id=${encodeURIComponent(payload.workspace_id)}`;

  const incidentHref = `/incidents/${incidentPathId}?${workspaceQuery}`;
  const v54Href = `/incidents/${incidentPathId}/audited-operator-intent-draft?${workspaceQuery}`;
  const v53Href = `/incidents/${incidentPathId}/operator-confirmation-surface?${workspaceQuery}`;
  const v521Href = `/incidents/${incidentPathId}/controlled-worker-dry-run-call?${workspaceQuery}`;
  const v51Href = `/incidents/${incidentPathId}/worker-dry-run-adapter-preview?${workspaceQuery}`;
  const v50Href = `/incidents/${incidentPathId}/server-read-preview?${workspaceQuery}`;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[40px] border border-cyan-400/25 bg-cyan-950/10 p-7 shadow-[0_0_90px_rgba(34,211,238,0.08)] sm:p-10">
        <div className="mb-8 text-xs font-black uppercase tracking-[0.45em] text-cyan-200/70">
          Audited Operator Intent Persistence Draft
        </div>

        <h1 className="max-w-4xl text-5xl font-black tracking-tight text-white sm:text-7xl">
          Brouillon de persistance d’intention
        </h1>

        <p className="mt-8 max-w-3xl text-2xl leading-relaxed text-zinc-400">
          V5.5 prépare le contrat de persistance futur d’une intention opérateur
          auditée. Cette surface reste strictement read-only : aucune écriture,
          aucune soumission, aucun appel worker, aucune mutation Airtable et
          aucune exécution réelle.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Badge tone="amber">{payload.status}</Badge>
          <Badge tone="amber">Draft not persisted</Badge>
          <Badge tone="red">No real run</Badge>
          <Badge tone="red">No worker call</Badge>
          <Badge tone="red">No Airtable mutation</Badge>
        </div>
      </section>

      <Section title="Previous Layer Validated" tone="green">
        <FieldCard
          label="Version"
          value={payload.previous_layer.version}
          tone="green"
        />
        <FieldCard
          label="Status"
          value={payload.previous_layer.status}
          tone="green"
        />
        <FieldCard
          label="Intent Status"
          value={payload.previous_layer.intent_status}
          tone="amber"
        />
        <FieldCard
          label="Execution Policy"
          value={payload.previous_layer.execution_policy}
          tone="green"
        />
      </Section>

      <Section title="Persistence Draft" tone="cyan">
        <FieldCard
          label="Persistence ID"
          value={payload.persistence_id}
          tone="cyan"
        />
        <FieldCard label="Intent ID" value={payload.intent_id} tone="cyan" />
        <FieldCard label="Incident ID" value={payload.incident_id} tone="neutral" />
        <FieldCard label="Workspace ID" value={payload.workspace_id} tone="neutral" />
        <FieldCard
          label="Target Table Preview"
          value={payload.persistence_draft.target_table}
          tone="cyan"
        />
        <FieldCard
          label="Target Record Status"
          value={payload.persistence_draft.target_record_status}
          tone="amber"
        />
        <FieldCard
          label="Write Allowed Now"
          value={payload.persistence_draft.write_allowed_now ? "YES" : "NO"}
          tone="red"
        />
        <FieldCard
          label="Submission Allowed Now"
          value={payload.persistence_draft.submission_allowed_now ? "YES" : "NO"}
          tone="red"
        />
      </Section>

      <Section title="Idempotency Contract" tone="green">
        <FieldCard label="Idempotency Key" value={payload.idempotency.key} tone="cyan" />
        <FieldCard
          label="Deterministic"
          value={payload.idempotency.deterministic ? "YES" : "NO"}
          tone="green"
        />
        <FieldCard
          label="Secret"
          value={payload.idempotency.secret ? "YES" : "NO"}
          tone="green"
        />
        <FieldCard label="Scope" value={payload.idempotency.scope} tone="green" />
      </Section>

      <Section title="Field Mapping Preview" tone="cyan">
        {Object.entries(payload.field_mapping_preview).map(([key, value]) => (
          <FieldCard
            key={key}
            label={key}
            value={String(value)}
            tone={
              value === false || value === "Forbidden" || value === "Disabled"
                ? "red"
                : value === "Draft" || value === "Required"
                  ? "amber"
                  : "cyan"
            }
          />
        ))}
      </Section>

      <Section title="Audit Requirements" tone="amber">
        {payload.audit_requirements.map((requirement) => (
          <TextItem key={requirement}>{requirement}</TextItem>
        ))}
      </Section>

      <Section title="Execution Lock" tone="red">
        <div className="flex flex-wrap gap-3">
          <Badge tone="red">No real run</Badge>
          <Badge tone="cyan">Dry run only</Badge>
          <Badge tone="red">No POST /run</Badge>
          <Badge tone="red">No worker call from this surface</Badge>
          <Badge tone="red">No Airtable mutation</Badge>
          <Badge tone="red">No intent persistence</Badge>
          <Badge tone="amber">Intent not submitted</Badge>
          <Badge tone="amber">Human confirmation required</Badge>
        </div>

        <button
          type="button"
          disabled
          className="mt-8 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-6 py-5 text-base font-bold text-zinc-600"
        >
          Persistance future non activée
        </button>
      </Section>

      <Section title="Persistence Guardrails" tone="green">
        <FieldCard
          label="Intent Persistence"
          value={payload.guardrails.intent_persistence}
          tone="red"
        />
        <FieldCard
          label="Intent Submission"
          value={payload.guardrails.intent_submission}
          tone="red"
        />
        <FieldCard
          label="Worker Call"
          value={payload.guardrails.worker_call}
          tone="red"
        />
        <FieldCard
          label="Airtable Mutation"
          value={payload.guardrails.airtable_mutation}
          tone="red"
        />
        <FieldCard
          label="Secret Exposure"
          value={payload.guardrails.secret_exposure}
          tone="green"
        />
        <FieldCard label="Real Run" value={payload.guardrails.real_run} tone="red" />
      </Section>

      <JsonPreview title="Read-only Persistence Payload" value={payload} />

      <Section title="Navigation" tone="neutral">
        <NavigationLink href={incidentHref}>Retour incident</NavigationLink>
        <NavigationLink href={v54Href} tone="cyan">
          Retour V5.4 audited operator intent draft
        </NavigationLink>
        <NavigationLink href={v53Href} tone="cyan">
          Retour V5.3 operator confirmation surface
        </NavigationLink>
        <NavigationLink href={v521Href} tone="cyan">
          Retour V5.2.1 controlled worker dry run call
        </NavigationLink>
        <NavigationLink href={v51Href} tone="cyan">
          Retour V5.1 adapter preview
        </NavigationLink>
        <NavigationLink href={v50Href} tone="cyan">
          Retour V5.0 server read preview
        </NavigationLink>
      </Section>
    </main>
  );
}
