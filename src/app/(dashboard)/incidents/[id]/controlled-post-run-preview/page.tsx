import Link from "next/link";
import { headers } from "next/headers";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<SearchParams> | SearchParams;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown, fallback = "—"): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined) return fallback;

  return String(value);
}

function getParam(
  searchParams: SearchParams,
  key: string,
  fallback = ""
): string {
  const value = searchParams[key];

  if (Array.isArray(value)) return value[0] || fallback;
  if (typeof value === "string") return value;

  return fallback;
}

function getObject(payload: JsonRecord, key: string): JsonRecord {
  const value = payload[key];
  return isRecord(value) ? value : {};
}

function getArray(payload: JsonRecord, key: string): unknown[] {
  const value = payload[key];
  return Array.isArray(value) ? value : [];
}

function statusTone(status: string): string {
  if (status.includes("READY")) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (status.includes("MISSING") || status.includes("NOT_FOUND")) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }

  if (status.includes("FAILED") || status.includes("NOT_SAFE")) {
    return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  }

  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "cyan" | "amber" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : tone === "cyan"
        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
        : tone === "amber"
          ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
          : tone === "red"
            ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
            : "border-white/10 bg-white/[0.04] text-white/75";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

function Section({
  title,
  eyebrow,
  children,
  tone = "cyan",
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  tone?: "cyan" | "green" | "amber" | "red" | "neutral";
}) {
  const borderClass =
    tone === "green"
      ? "border-emerald-400/20"
      : tone === "amber"
        ? "border-amber-400/20"
        : tone === "red"
          ? "border-rose-400/20"
          : tone === "neutral"
            ? "border-white/10"
            : "border-cyan-400/20";

  return (
    <section
      className={`rounded-[28px] border ${borderClass} bg-slate-950/70 p-5 shadow-2xl shadow-black/20`}
    >
      <div className="mb-4">
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-white">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function KeyValueGrid({
  rows,
}: {
  rows: Array<[string, unknown]>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
            {label}
          </p>
          <p className="break-all text-sm font-medium text-white/85">
            {getString(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4">
      <pre className="min-w-full whitespace-pre-wrap break-all text-xs leading-6 text-white/75">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function Checklist({ values }: { values: JsonRecord }) {
  const entries = Object.entries(values);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {entries.map(([key, value]) => {
        const isTrue = value === true;

        return (
          <div
            key={key}
            className={`rounded-2xl border p-4 ${
              isTrue
                ? "border-emerald-400/20 bg-emerald-400/10"
                : "border-amber-400/20 bg-amber-400/10"
            }`}
          >
            <p className="break-all text-sm font-semibold text-white/85">
              {key}
            </p>
            <p
              className={`mt-2 text-xs font-bold uppercase tracking-[0.18em] ${
                isTrue ? "text-emerald-200" : "text-amber-200"
              }`}
            >
              {isTrue ? "TRUE" : getString(value)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function RequirementList({ items }: { items: unknown[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`${index}-${getString(item)}`}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80"
        >
          {getString(item)}
        </div>
      ))}
    </div>
  );
}

function DisabledAction() {
  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
      <p className="text-sm font-semibold text-amber-100">
        POST /run future non activé
      </p>
      <p className="mt-2 text-sm leading-6 text-white/60">
        Cette surface prépare uniquement le contrat futur. Aucun POST /run,
        aucun worker call, aucune exécution réelle.
      </p>
    </div>
  );
}

function NavLinks({
  incidentId,
  workspaceId,
}: {
  incidentId: string;
  workspaceId: string;
}) {
  const query = `workspace_id=${encodeURIComponent(workspaceId)}`;

  const links = [
    [`/incidents/${incidentId}?${query}`, "Retour incident"],
    [
      `/incidents/${incidentId}/run-draft-review-surface?${query}`,
      "Retour V5.23 run draft review",
    ],
    [
      `/incidents/${incidentId}/gated-run-draft-persistence?${query}`,
      "Retour V5.22 gated run draft persistence",
    ],
    [
      `/incidents/${incidentId}/run-creation-preview?${query}`,
      "Retour V5.21 run creation preview",
    ],
    [
      `/incidents/${incidentId}/operational-queue-review-after-persistence?${query}`,
      "Retour V5.20 operational queue review",
    ],
    [
      `/incidents/${incidentId}/gated-operational-queue-persistence?${query}`,
      "Retour V5.19 gated operational queue persistence",
    ],
    [
      `/incidents/${incidentId}/operational-queue-transition-preview?${query}`,
      "Retour V5.18 operational queue transition preview",
    ],
    [
      `/incidents/${incidentId}/operational-queue-readiness-review?${query}`,
      "Retour V5.17 operational queue readiness",
    ],
    [
      `/incidents/${incidentId}/gated-command-queue-persistence?${query}`,
      "Retour V5.16 gated queue persistence",
    ],
    [
      `/incidents/${incidentId}/controlled-command-queue-preview?${query}`,
      "Retour V5.15 controlled queue preview",
    ],
    [
      `/incidents/${incidentId}/command-draft-review-surface?${query}`,
      "Retour V5.14 command draft review",
    ],
    [
      `/incidents/${incidentId}/gated-command-draft-persistence?${query}`,
      "Retour V5.13 command draft persistence",
    ],
    [
      `/incidents/${incidentId}/command-draft-preview?${query}`,
      "Retour V5.12 command draft preview",
    ],
    [
      `/incidents/${incidentId}/gated-operator-approval-persistence?${query}`,
      "Retour V5.11 approval persistence",
    ],
    [
      `/incidents/${incidentId}/operator-approval-draft?${query}`,
      "Retour V5.10 approval draft",
    ],
    [
      `/incidents/${incidentId}/operator-intent-review-surface?${query}`,
      "Retour V5.9 intent review",
    ],
    [
      `/incidents/${incidentId}/gated-audited-intent-persistence?${query}`,
      "Retour V5.8 gated persistence",
    ],
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/75 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-100"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

async function fetchPayload(params: {
  incidentId: string;
  workspaceId: string;
  versionParam: string;
}): Promise<JsonRecord> {
  const { incidentId, workspaceId, versionParam } = params;

  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ||
    headersList.get("host") ||
    "localhost:3000";

  const protocol =
    headersList.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");

  const apiUrl = `${protocol}://${host}/api/incidents/${encodeURIComponent(
    incidentId
  )}/controlled-post-run-preview?workspace_id=${encodeURIComponent(
    workspaceId
  )}&_v=${encodeURIComponent(versionParam || "v524_page")}`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      cache: "no-store",
    });

    const text = await response.text();

    try {
      const json = JSON.parse(text);
      return isRecord(json)
        ? json
        : {
            ok: false,
            status: "PAGE_PAYLOAD_INVALID",
            error: "API returned a non-object payload.",
          };
    } catch {
      return {
        ok: false,
        status: "PAGE_PAYLOAD_PARSE_FAILED",
        error: text,
      };
    }
  } catch (error) {
    return {
      ok: false,
      status: "PAGE_FETCH_FAILED",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default async function ControlledPostRunPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const incidentId = resolvedParams.id;
  const workspaceId =
    getParam(resolvedSearchParams, "workspace_id") ||
    getParam(resolvedSearchParams, "workspaceId") ||
    "default";

  const versionParam = getParam(resolvedSearchParams, "_v", "v524_page");

  const payload = await fetchPayload({
    incidentId,
    workspaceId,
    versionParam,
  });

  const status = getString(payload.status, "UNKNOWN_STATUS");

  const previousLayer = getObject(payload, "previous_layer");
  const workerTargetPreview = getObject(payload, "worker_target_preview");
  const postRunPayloadPreview = getObject(payload, "post_run_payload_preview");
  const readinessCheck = getObject(payload, "post_run_readiness_check");
  const futureRequirements = getArray(payload, "future_post_run_requirements");
  const persistedRunSnapshot = getObject(payload, "persisted_run_snapshot");
  const persistedCommandSnapshot = getObject(
    payload,
    "persisted_command_snapshot"
  );

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-6 text-white md:px-8 md:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section
          className={`rounded-[32px] border p-6 shadow-2xl shadow-black/30 ${statusTone(
            status
          )}`}
        >
          <div className="mb-5 flex flex-wrap gap-2">
            <Badge tone="cyan">Incident Detail V5.24</Badge>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusTone(
                status
              )}`}
            >
              {status}
            </span>
            <Badge tone="amber">PREVIEW ONLY</Badge>
            <Badge tone="amber">NO POST SENT</Badge>
            <Badge tone="amber">NO WORKER CALL</Badge>
            <Badge tone="red">NO REAL RUN</Badge>
          </div>

          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
            BOSAI Control Plane
          </p>

          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
            Preview POST /run
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
            Surface read-only pour préparer le futur appel serveur POST{" "}
            <code className="rounded-md bg-black/30 px-1.5 py-0.5 text-cyan-200">
              /run
            </code>{" "}
            sans envoyer l’appel, sans worker call, sans création d’exécution,
            et sans exposition de secret.
          </p>

          <div className="mt-6">
            <DisabledAction />
          </div>
        </section>

        <Section title="Previous Layer Validated" tone="green">
          <KeyValueGrid
            rows={[
              ["Version", previousLayer.version],
              ["Status", previousLayer.status],
              ["Run Draft Review", previousLayer.run_draft_review],
              ["Execution Policy", previousLayer.execution_policy],
              ["Current Guardrail", payload.post_run],
              ["Worker Call", payload.worker_call],
            ]}
          />
        </Section>

        <Section title="Run Draft Source" tone="cyan">
          <KeyValueGrid
            rows={[
              ["Run Record ID", payload.run_record_id],
              ["Run Draft ID", payload.run_draft_id],
              ["Run Idempotency Key", payload.run_idempotency_key],
              ["Current Run Status", payload.current_run_status],
              ["Current Run Status_select", payload.current_run_status_select],
              ["Command Record ID", payload.command_record_id],
              ["Command ID", payload.command_id],
              ["Command Status", payload.current_command_status],
              ["Command Status_select", payload.current_command_status_select],
              ["Workspace ID", payload.workspace_id],
              ["Incident ID", payload.incident_id],
              ["Intent Record ID", payload.intent_record_id],
              ["Approval Record ID", payload.approval_record_id],
            ]}
          />
        </Section>

        <Section title="Worker Target Preview" tone="amber">
          <KeyValueGrid
            rows={[
              ["Method", workerTargetPreview.method],
              ["Endpoint", workerTargetPreview.endpoint],
              ["Worker Base URL", workerTargetPreview.base_url],
              ["Full URL Preview", workerTargetPreview.full_url_preview],
              ["Secret Header Required", workerTargetPreview.secret_header_required],
              ["Secret Value", workerTargetPreview.secret_value],
              ["POST Sent", workerTargetPreview.post_sent],
            ]}
          />
        </Section>

        <Section title="POST /run Payload Preview" tone="cyan">
          <JsonBlock value={postRunPayloadPreview} />
        </Section>

        <Section title="POST /run Readiness Check" tone="green">
          <Checklist values={readinessCheck} />
        </Section>

        <Section title="Run Draft Snapshot" tone="neutral">
          <JsonBlock value={persistedRunSnapshot} />
        </Section>

        <Section title="Queued Command Snapshot" tone="neutral">
          <JsonBlock value={persistedCommandSnapshot} />
        </Section>

        <Section title="Future POST /run Requirements" tone="amber">
          <RequirementList items={futureRequirements} />
        </Section>

        <Section title="Execution Lock" tone="red">
          <div className="flex flex-wrap gap-2">
            <Badge tone="amber">PREVIEW ONLY</Badge>
            <Badge tone="amber">NO POST SENT</Badge>
            <Badge tone="amber">NO WORKER CALL</Badge>
            <Badge tone="amber">NO RUN EXECUTION</Badge>
            <Badge tone="red">NO REAL RUN</Badge>
            <Badge tone="red">NO SECRET EXPOSURE</Badge>
            <Badge tone="cyan">POST /RUN FUTURE GATE REQUIRED</Badge>
          </div>
        </Section>

        <Section title="Read-only POST /run Preview Payload" tone="neutral">
          <JsonBlock value={payload} />
        </Section>

        <Section title="Navigation" tone="neutral">
          <NavLinks incidentId={incidentId} workspaceId={workspaceId} />
        </Section>
      </div>
    </main>
  );
}
