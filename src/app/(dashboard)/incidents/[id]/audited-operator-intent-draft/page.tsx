import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VERSION = "Incident Detail V5.4";
const SOURCE = "dashboard_incident_detail_v5_4_audited_operator_intent_draft";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  params:
    | Promise<{
        id?: string;
      }>
    | {
        id?: string;
      };
  searchParams?: Promise<SearchParams> | SearchParams;
};

type BadgeTone = "cyan" | "green" | "amber" | "red" | "neutral";

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

function getFirstSearchParam(
  searchParams: SearchParams,
  key: string
): string | null {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function buildIntentId(input: {
  workspaceId: string;
  incidentId: string;
}): string {
  return `operator-intent:v5.4:${input.workspaceId}:${input.incidentId}`;
}

function buildHref(input: {
  path: string;
  workspaceId: string;
  version: string;
}): string {
  const separator = input.path.includes("?") ? "&" : "?";

  return `${input.path}${separator}workspace_id=${encodeURIComponent(
    input.workspaceId
  )}&_v=${encodeURIComponent(input.version)}`;
}

function buildAuditedOperatorIntentDraftPayload(input: {
  incidentId: string;
  workspaceId: string;
}) {
  const intentId = buildIntentId(input);

  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status: "OPERATOR_INTENT_DRAFT_READY",
    mode: "AUDITED_OPERATOR_INTENT_DRAFT_ONLY",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,
    intent_id: intentId,
    intent_status: "DRAFT_NOT_SUBMITTED",
    operator_confirmation: "REQUIRED_BUT_NOT_CAPTURED",
    real_run: "FORBIDDEN",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.3",
      status: "OPERATOR_CONFIRMATION_REQUIRED",
      operator_surface: "VALIDATED",
      execution_policy: "READ_ONLY_CONFIRMATION_SURFACE",
    },

    intent_draft: {
      type: "controlled_operator_intent",
      target_capability: "command_orchestrator",
      target_mode: "dry_run_only",
      proposed_action: "prepare_controlled_worker_dry_run_followup",
      requires_operator_confirmation: true,
      requires_dedicated_feature_gate: true,
      requires_audit_trail: true,
      requires_idempotency_key: true,
      requires_workspace_scope: true,
      requires_rollback_or_cancel_path: true,
      execution_allowed_now: false,
      submission_allowed_now: false,
    },

    audit_requirements: [
      "Operator identity must be known before submission",
      "Operator confirmation must be explicit",
      "Intent must be persisted before any mutation",
      "Idempotency key must be deterministic",
      "Workspace scope must be preserved",
      "Feature gate must be dedicated",
      "Rollback or safe cancel path must exist",
      "No secret exposure is allowed",
    ],

    guardrails: {
      client_fetch: "DISABLED",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      airtable_mutation: "DISABLED",
      incident_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_mutation: "DISABLED",
      secret_exposure: "DISABLED",
      real_run: "FORBIDDEN",
      dry_run_only: true,
      operator_confirmation_required: true,
      intent_persistence: "DISABLED",
      intent_submission: "DISABLED",
    },

    next_step:
      "V5.5 may introduce an audited intent persistence draft, still without direct real execution.",
  };
}

function badgeClassName(tone: BadgeTone): string {
  const base =
    "inline-flex max-w-full items-center rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.32em]";

  if (tone === "green") {
    return `${base} border-emerald-400/35 bg-emerald-500/15 text-emerald-200 shadow-[0_0_32px_rgba(16,185,129,0.10)]`;
  }

  if (tone === "amber") {
    return `${base} border-yellow-400/35 bg-yellow-500/15 text-yellow-200 shadow-[0_0_32px_rgba(234,179,8,0.10)]`;
  }

  if (tone === "red") {
    return `${base} border-rose-400/35 bg-rose-500/15 text-rose-200 shadow-[0_0_32px_rgba(244,63,94,0.10)]`;
  }

  if (tone === "neutral") {
    return `${base} border-white/10 bg-white/[0.04] text-zinc-300`;
  }

  return `${base} border-cyan-400/35 bg-cyan-500/15 text-cyan-100 shadow-[0_0_32px_rgba(34,211,238,0.10)]`;
}

function panelClassName(tone: BadgeTone = "neutral"): string {
  const base = "rounded-[34px] border p-6 sm:p-8";

  if (tone === "green") {
    return `${base} border-emerald-400/20 bg-emerald-950/10`;
  }

  if (tone === "amber") {
    return `${base} border-yellow-400/25 bg-yellow-950/10`;
  }

  if (tone === "red") {
    return `${base} border-rose-400/25 bg-rose-950/10`;
  }

  if (tone === "cyan") {
    return `${base} border-cyan-400/25 bg-cyan-950/10`;
  }

  return `${base} border-white/10 bg-zinc-950/70`;
}

function Badge({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return <span className={badgeClassName(tone)}>{children}</span>;
}

function Section({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <section className={panelClassName(tone)}>
      <h2 className="mb-6 text-xs font-bold uppercase tracking-[0.45em] text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: BadgeTone;
}) {
  const valueColor =
    tone === "red"
      ? "text-rose-200"
      : tone === "amber"
        ? "text-yellow-200"
        : tone === "green"
          ? "text-emerald-200"
          : tone === "cyan"
            ? "text-cyan-100"
            : "text-zinc-100";

  return (
    <div className="rounded-[26px] border border-white/10 bg-black/35 p-5">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.42em] text-zinc-600">
        {label}
      </div>
      <div
        className={`break-words font-mono text-xl font-bold leading-relaxed ${valueColor}`}
      >
        {value}
      </div>
    </div>
  );
}

function BooleanField({
  label,
  value,
}: {
  label: string;
  value: boolean;
}) {
  return (
    <FieldCard
      label={label}
      value={value ? "YES" : "NO"}
      tone={value ? "green" : "red"}
    />
  );
}

function JsonBlock({
  payload,
  title,
}: {
  payload: unknown;
  title: string;
}) {
  return (
    <Section title={title}>
      <pre className="max-h-[720px] overflow-auto rounded-[24px] border border-white/10 bg-black p-5 text-sm leading-relaxed text-zinc-200">
        {JSON.stringify(payload, null, 2)}
      </pre>
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
  tone?: BadgeTone;
}) {
  const className =
    tone === "cyan"
      ? "block rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-4 text-center text-sm font-bold text-cyan-100 transition hover:bg-cyan-500/15"
      : "block rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-bold text-white transition hover:bg-white/[0.07]";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default async function AuditedOperatorIntentDraftPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const incidentId = normalizeIncidentId(resolvedParams.id);
  const workspaceId = normalizeWorkspaceId(
    getFirstSearchParam(resolvedSearchParams, "workspace_id") ||
      getFirstSearchParam(resolvedSearchParams, "workspaceId")
  );

  const payload = buildAuditedOperatorIntentDraftPayload({
    incidentId,
    workspaceId,
  });

  const incidentHref = buildHref({
    path: `/incidents/${encodeURIComponent(incidentId)}`,
    workspaceId,
    version: "v54_return_incident",
  });

  const v53Href = buildHref({
    path: `/incidents/${encodeURIComponent(
      incidentId
    )}/operator-confirmation-surface`,
    workspaceId,
    version: "v54_to_v53",
  });

  const v521Href = buildHref({
    path: `/incidents/${encodeURIComponent(
      incidentId
    )}/controlled-worker-dry-run-call`,
    workspaceId,
    version: "v54_to_v521",
  });

  const v51Href = buildHref({
    path: `/incidents/${encodeURIComponent(
      incidentId
    )}/worker-dry-run-adapter-preview`,
    workspaceId,
    version: "v54_to_v51",
  });

  const v50Href = buildHref({
    path: `/incidents/${encodeURIComponent(incidentId)}/server-read-preview`,
    workspaceId,
    version: "v54_to_v50",
  });

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-[38px] border border-cyan-400/25 bg-cyan-950/10 p-7 shadow-[0_0_80px_rgba(34,211,238,0.08)] sm:p-10">
          <div className="mb-8 text-xs font-bold uppercase tracking-[0.5em] text-cyan-200/70">
            Audited Operator Intent Draft
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.06em] text-white sm:text-7xl">
            Brouillon d’intention opérateur
          </h1>

          <p className="mt-8 max-w-3xl text-xl leading-relaxed text-zinc-400 sm:text-2xl">
            V5.4 prépare une intention opérateur structurée et auditable. Elle
            reste strictement read-only : aucune soumission, aucune persistance,
            aucun appel worker, aucune mutation et aucune exécution réelle.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Badge tone="amber">OPERATOR_INTENT_DRAFT_READY</Badge>
            <Badge tone="amber">DRAFT NOT SUBMITTED</Badge>
            <Badge tone="red">NO REAL RUN</Badge>
            <Badge tone="red">NO WORKER CALL</Badge>
            <Badge tone="red">NO AIRTABLE MUTATION</Badge>
          </div>
        </section>

        <Section title="Previous Layer Validated" tone="green">
          <div className="grid gap-4 sm:grid-cols-2">
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
              label="Operator Surface"
              value={payload.previous_layer.operator_surface}
              tone="green"
            />
            <FieldCard
              label="Execution Policy"
              value={payload.previous_layer.execution_policy}
              tone="green"
            />
          </div>
        </Section>

        <Section title="Intent Draft" tone="cyan">
          <div className="grid gap-4">
            <FieldCard label="Intent ID" value={payload.intent_id} tone="cyan" />
            <FieldCard
              label="Intent Status"
              value={payload.intent_status}
              tone="amber"
            />
            <FieldCard label="Incident ID" value={payload.incident_id} />
            <FieldCard label="Workspace ID" value={payload.workspace_id} />
            <FieldCard
              label="Target Capability"
              value={payload.intent_draft.target_capability}
              tone="cyan"
            />
            <FieldCard
              label="Target Mode"
              value={payload.intent_draft.target_mode}
              tone="cyan"
            />
            <FieldCard
              label="Proposed Action"
              value={payload.intent_draft.proposed_action}
              tone="cyan"
            />
            <BooleanField
              label="Execution Allowed Now"
              value={payload.intent_draft.execution_allowed_now}
            />
            <BooleanField
              label="Submission Allowed Now"
              value={payload.intent_draft.submission_allowed_now}
            />
          </div>
        </Section>

        <Section title="Audit Requirements" tone="amber">
          <div className="grid gap-4">
            {payload.audit_requirements.map((requirement) => (
              <div
                key={requirement}
                className="rounded-[24px] border border-white/10 bg-black/35 p-5 text-lg leading-relaxed text-zinc-300"
              >
                {requirement}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Execution Lock" tone="red">
          <div className="flex flex-wrap gap-3">
            <Badge tone="red">NO REAL RUN</Badge>
            <Badge tone="cyan">DRY RUN ONLY</Badge>
            <Badge tone="red">NO POST /RUN</Badge>
            <Badge tone="red">NO WORKER CALL FROM THIS SURFACE</Badge>
            <Badge tone="red">NO AIRTABLE MUTATION</Badge>
            <Badge tone="red">NO SECRET EXPOSURE</Badge>
            <Badge tone="amber">INTENT NOT SUBMITTED</Badge>
            <Badge tone="amber">HUMAN CONFIRMATION REQUIRED</Badge>
          </div>

          <div className="mt-8">
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-bold text-zinc-600"
            >
              Soumission future non activée
            </button>
          </div>
        </Section>

        <Section title="Operator Governance Checklist" tone="green">
          <div className="grid gap-4 sm:grid-cols-2">
            <BooleanField
              label="Requires Operator Confirmation"
              value={payload.intent_draft.requires_operator_confirmation}
            />
            <BooleanField
              label="Requires Dedicated Feature Gate"
              value={payload.intent_draft.requires_dedicated_feature_gate}
            />
            <BooleanField
              label="Requires Audit Trail"
              value={payload.intent_draft.requires_audit_trail}
            />
            <BooleanField
              label="Requires Idempotency Key"
              value={payload.intent_draft.requires_idempotency_key}
            />
            <BooleanField
              label="Requires Workspace Scope"
              value={payload.intent_draft.requires_workspace_scope}
            />
            <BooleanField
              label="Requires Rollback Or Cancel Path"
              value={payload.intent_draft.requires_rollback_or_cancel_path}
            />
          </div>
        </Section>

        <JsonBlock title="Read-only Intent Payload" payload={payload} />

        <Section title="Navigation">
          <div className="grid gap-4">
            <NavigationLink href={incidentHref}>Retour incident</NavigationLink>
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
          </div>
        </Section>
      </div>
    </main>
  );
}
