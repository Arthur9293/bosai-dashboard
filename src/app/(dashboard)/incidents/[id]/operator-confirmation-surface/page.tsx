import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<SearchParams> | SearchParams;
};

const VERSION = "Incident Detail V5.3";
const SOURCE = "dashboard_incident_detail_v5_3_operator_confirmation_surface";

function getFirstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

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

function buildOperatorConfirmationPayload(input: {
  incidentId: string;
  workspaceId: string;
}) {
  return {
    ok: true,
    version: VERSION,
    source: SOURCE,
    status: "OPERATOR_CONFIRMATION_REQUIRED",
    mode: "OPERATOR_CONFIRMATION_SURFACE_ONLY",
    incident_id: input.incidentId,
    workspace_id: input.workspaceId,
    dry_run: true,
    operator_confirmation: "REQUIRED",
    real_run: "FORBIDDEN",
    worker_call: "DISABLED_FROM_THIS_SURFACE",
    post_run: "DISABLED_FROM_THIS_SURFACE",
    secret_exposure: "DISABLED",
    dashboard_airtable_mutation: "DISABLED",

    previous_layer: {
      version: "Incident Detail V5.2.1",
      status: "STRICT_RUNREQUEST_VALIDATED",
      worker_dry_run_call: "VALIDATED",
      run_request_contract: "capability + idempotency_key + input",
    },

    operator_checklist: {
      dry_run_only: true,
      real_run_forbidden: true,
      secret_not_exposed: true,
      worker_route_validated: true,
      workspace_validated: true,
      capability_validated: true,
      human_confirmation_required: true,
    },

    future_execution_requirements: [
      "Explicit operator confirmation",
      "Dedicated feature gate for any broader execution",
      "Audit trail before mutation",
      "Idempotency preserved",
      "Workspace scope preserved",
      "No secret exposure",
      "Rollback or safe cancel path defined",
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
    },

    next_step:
      "V5.4 may add an audited operator intent draft, still without direct real execution.",
  };
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function workspaceQuery(workspaceId: string): string {
  return `workspace_id=${encodeURIComponent(workspaceId)}`;
}

function Pill({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: "cyan" | "green" | "red" | "yellow" | "neutral";
}) {
  const toneClassName =
    tone === "green"
      ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
      : tone === "red"
        ? "border-rose-400/35 bg-rose-500/10 text-rose-200"
        : tone === "yellow"
          ? "border-amber-400/35 bg-amber-500/10 text-amber-200"
          : tone === "neutral"
            ? "border-white/15 bg-white/[0.04] text-white/75"
            : "border-cyan-400/35 bg-cyan-500/10 text-cyan-200";

  return (
    <span
      className={`inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] ${toneClassName}`}
    >
      {children}
    </span>
  );
}

function SectionCard({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: ReactNode;
  tone?: "neutral" | "cyan" | "green" | "red" | "yellow";
}) {
  const toneClassName =
    tone === "cyan"
      ? "border-cyan-400/25 bg-cyan-500/[0.04]"
      : tone === "green"
        ? "border-emerald-400/25 bg-emerald-500/[0.04]"
        : tone === "red"
          ? "border-rose-400/25 bg-rose-500/[0.04]"
          : tone === "yellow"
            ? "border-amber-400/25 bg-amber-500/[0.04]"
            : "border-white/10 bg-white/[0.03]";

  return (
    <section className={`rounded-[2rem] border p-6 sm:p-8 ${toneClassName}`}>
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.38em] text-white/40">
        {title}
      </p>
      {children}
    </section>
  );
}

function InfoTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "cyan" | "green" | "red" | "yellow";
}) {
  const valueClassName =
    tone === "green"
      ? "text-emerald-200"
      : tone === "red"
        ? "text-rose-200"
        : tone === "yellow"
          ? "text-amber-200"
          : tone === "cyan"
            ? "text-cyan-200"
            : "text-white";

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/35">
        {label}
      </p>
      <div className={`font-mono text-lg font-semibold ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[560px] overflow-auto rounded-[1.5rem] border border-white/10 bg-black p-5 text-left text-xs leading-6 text-white/80">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function ActionLink({
  href,
  children,
  tone = "neutral",
}: {
  href: string;
  children: ReactNode;
  tone?: "neutral" | "cyan";
}) {
  const toneClassName =
    tone === "cyan"
      ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15"
      : "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.07]";

  return (
    <Link
      href={href}
      className={`flex min-h-14 items-center justify-center rounded-full border px-5 py-4 text-center text-sm font-bold transition ${toneClassName}`}
    >
      {children}
    </Link>
  );
}

function formatChecklistLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function OperatorConfirmationSurfacePage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const incidentId = normalizeIncidentId(resolvedParams.id);
  const workspaceId = normalizeWorkspaceId(
    getFirstParam(resolvedSearchParams.workspace_id) ||
      getFirstParam(resolvedSearchParams.workspaceId)
  );

  const payload = buildOperatorConfirmationPayload({
    incidentId,
    workspaceId,
  });

  const incidentPath = encodePathSegment(incidentId);
  const query = workspaceQuery(workspaceId);

  const incidentHref = `/incidents/${incidentPath}?${query}`;
  const v52Href = `/incidents/${incidentPath}/controlled-worker-dry-run-call?${query}`;
  const v51Href = `/incidents/${incidentPath}/worker-dry-run-adapter-preview?${query}`;
  const v50Href = `/incidents/${incidentPath}/server-read-preview?${query}`;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-[2.5rem] border border-cyan-400/25 bg-cyan-500/[0.04] p-7 shadow-[0_0_80px_rgba(34,211,238,0.08)] sm:p-10">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.42em] text-cyan-200/70">
            Operator Confirmation Surface
          </p>

          <h1 className="max-w-3xl text-5xl font-black tracking-[-0.06em] text-white sm:text-7xl">
            Surface de confirmation opérateur
          </h1>

          <p className="mt-7 max-w-3xl text-xl leading-9 text-white/60">
            V5.3 ajoute une couche de décision humaine avant toute évolution
            d’exécution. Cette surface est strictement read-only : elle ne lance
            aucun worker, ne déclenche aucun POST /run, n’expose aucun secret et
            ne modifie aucune donnée Airtable.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Pill tone="yellow">OPERATOR_CONFIRMATION_REQUIRED</Pill>
            <Pill tone="red">NO REAL RUN</Pill>
            <Pill tone="cyan">DRY RUN ONLY</Pill>
            <Pill tone="red">NO SECRET EXPOSURE</Pill>
          </div>
        </section>

        <SectionCard title="Previous Layer Validated" tone="green">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoTile
              label="Version"
              value={payload.previous_layer.version}
              tone="green"
            />
            <InfoTile
              label="Status"
              value={payload.previous_layer.status}
              tone="green"
            />
            <InfoTile
              label="Worker Dry Run Call"
              value={payload.previous_layer.worker_dry_run_call}
              tone="green"
            />
            <InfoTile
              label="RunRequest Contract"
              value={payload.previous_layer.run_request_contract}
              tone="cyan"
            />
          </div>
        </SectionCard>

        <SectionCard title="Operator Decision Gate" tone="yellow">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoTile
              label="Incident"
              value={payload.incident_id}
              tone="neutral"
            />
            <InfoTile
              label="Workspace"
              value={payload.workspace_id}
              tone="neutral"
            />
            <InfoTile
              label="Operator Confirmation"
              value={payload.operator_confirmation}
              tone="yellow"
            />
            <InfoTile label="Real Run" value={payload.real_run} tone="red" />
            <InfoTile
              label="Worker Call"
              value={payload.worker_call}
              tone="red"
            />
            <InfoTile
              label="Dashboard Airtable Mutation"
              value={payload.dashboard_airtable_mutation}
              tone="red"
            />
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-amber-400/20 bg-amber-500/[0.05] p-5">
            <p className="text-lg leading-8 text-white/70">
              Cette page sert de barrière de gouvernance. Elle confirme que BOSAI
              ne doit pas transformer un dry run validé en action plus large sans
              consentement opérateur explicite, journalisation et feature gate
              dédié.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Execution Lock" tone="red">
          <div className="flex flex-wrap gap-3">
            <Pill tone="red">NO REAL RUN</Pill>
            <Pill tone="cyan">DRY RUN ONLY</Pill>
            <Pill tone="red">NO POST /RUN FROM THIS SURFACE</Pill>
            <Pill tone="red">NO WORKER CALL FROM THIS SURFACE</Pill>
            <Pill tone="red">NO AIRTABLE MUTATION</Pill>
            <Pill tone="red">NO SECRET EXPOSURE</Pill>
            <Pill tone="yellow">HUMAN CONFIRMATION REQUIRED</Pill>
          </div>

          <button
            type="button"
            disabled
            className="mt-7 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-6 py-5 text-sm font-bold text-white/35"
          >
            Confirmation future non activée
          </button>
        </SectionCard>

        <SectionCard title="Future Execution Requirements" tone="cyan">
          <div className="grid gap-3">
            {payload.future_execution_requirements.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-black/25 p-4 text-base text-white/70"
              >
                {item}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Operator Checklist" tone="green">
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(payload.operator_checklist).map(([key, value]) => (
              <InfoTile
                key={key}
                label={formatChecklistLabel(key)}
                value={value ? "YES" : "NO"}
                tone={value ? "green" : "red"}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Read-only Payload Preview">
          <JsonPreview value={payload} />
        </SectionCard>

        <SectionCard title="Navigation">
          <div className="grid gap-4">
            <ActionLink href={incidentHref}>Retour incident</ActionLink>
            <ActionLink href={v52Href} tone="cyan">
              Retour V5.2.1 controlled worker dry run call
            </ActionLink>
            <ActionLink href={v51Href} tone="cyan">
              Retour V5.1 adapter preview
            </ActionLink>
            <ActionLink href={v50Href} tone="cyan">
              Retour V5.0 server read preview
            </ActionLink>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
