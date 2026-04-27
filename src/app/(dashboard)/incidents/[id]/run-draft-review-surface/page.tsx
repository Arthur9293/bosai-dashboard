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

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "YES" : "NO";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return "UNSERIALIZABLE";
  }
}

function getRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function getStatusTone(status: string): string {
  if (status.includes("READY")) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (status.includes("NOT_SAFE") || status.includes("NOT_FOUND")) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }

  if (status.includes("FAILED") || status.includes("ERROR")) {
    return "border-red-400/30 bg-red-400/10 text-red-200";
  }

  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
}

function Badge({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: "cyan" | "green" | "amber" | "red" | "slate";
}) {
  const tones = {
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    red: "border-red-400/30 bg-red-400/10 text-red-200",
    slate: "border-white/10 bg-white/[0.04] text-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getStatusTone(
        status
      )}`}
    >
      <span className="break-all">{status}</span>
    </span>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20">
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function KeyValueGrid({
  items,
}: {
  items: Array<[string, unknown]>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-2xl border border-white/10 bg-black/20 p-4"
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </div>
          <div className="mt-2 break-all text-sm font-medium text-slate-100">
            {stringifyValue(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2);

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4">
      <pre className="whitespace-pre-wrap break-all text-xs leading-6 text-slate-200">
        {text}
      </pre>
    </div>
  );
}

function Checklist({ value }: { value: unknown }) {
  const record = getRecord(value);
  const entries = Object.entries(record);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
        Aucun check disponible.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {entries.map(([key, rawValue]) => {
        const passed = rawValue === true;

        return (
          <div
            key={key}
            className={`rounded-2xl border p-4 ${
              passed
                ? "border-emerald-400/20 bg-emerald-400/10"
                : "border-amber-400/20 bg-amber-400/10"
            }`}
          >
            <div className="break-all text-sm font-medium text-slate-100">
              {key}
            </div>
            <div
              className={`mt-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                passed ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {stringifyValue(rawValue)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListBlock({ items }: { items: unknown }) {
  const list = Array.isArray(items) ? items : [];

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
        Aucune exigence listée.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((item, index) => (
        <div
          key={`${String(item)}-${index}`}
          className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-200"
        >
          {String(item)}
        </div>
      ))}
    </div>
  );
}

function buildHref(path: string, workspaceId: string, version?: string): string {
  const params = new URLSearchParams();
  params.set("workspace_id", workspaceId);
  if (version) params.set("_v", version);
  return `${path}?${params.toString()}`;
}

async function resolveMaybePromise<T>(value: T | Promise<T>): Promise<T> {
  return await value;
}

export default async function RunDraftReviewSurfacePage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await resolveMaybePromise(params);
  const resolvedSearchParams = searchParams
    ? await resolveMaybePromise(searchParams)
    : {};

  const incidentId = resolvedParams.id;
  const workspaceId =
    firstParam(resolvedSearchParams.workspace_id) || "ferrera-production";
  const cacheVersion = firstParam(resolvedSearchParams._v);

  const headerList = await headers();
  const host = headerList.get("host") || "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") || "http";

  const apiParams = new URLSearchParams();
  apiParams.set("workspace_id", workspaceId);
  if (cacheVersion) apiParams.set("_v", cacheVersion);

  const apiUrl = `${protocol}://${host}/api/incidents/${encodeURIComponent(
    incidentId
  )}/run-draft-review-surface?${apiParams.toString()}`;

  let payload: JsonRecord;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      cache: "no-store",
    });

    payload = (await response.json()) as JsonRecord;
  } catch (error) {
    payload = {
      ok: false,
      version: "Incident Detail V5.23",
      source: "dashboard_incident_detail_v5_23_run_draft_review_surface",
      status: "RUN_DRAFT_REVIEW_READ_FAILED",
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    };
  }

  const status = stringifyValue(payload.status);
  const persistedRun = getRecord(payload.persisted_run_snapshot);
  const persistedCommand = getRecord(payload.persisted_command_snapshot);
  const externalReview = getRecord(payload.external_execution_review);

  const navItems = [
    ["Retour incident", `/incidents/${incidentId}`],
    [
      "Retour V5.22 gated run draft persistence",
      `/incidents/${incidentId}/gated-run-draft-persistence`,
    ],
    [
      "Retour V5.21 run creation preview",
      `/incidents/${incidentId}/run-creation-preview`,
    ],
    [
      "Retour V5.20 operational queue review",
      `/incidents/${incidentId}/operational-queue-review-after-persistence`,
    ],
    [
      "Retour V5.19 gated operational queue persistence",
      `/incidents/${incidentId}/gated-operational-queue-persistence`,
    ],
    [
      "Retour V5.18 operational queue transition preview",
      `/incidents/${incidentId}/operational-queue-transition-preview`,
    ],
    [
      "Retour V5.17 operational queue readiness",
      `/incidents/${incidentId}/operational-queue-readiness-review`,
    ],
    [
      "Retour V5.16 gated queue persistence",
      `/incidents/${incidentId}/gated-command-queue-persistence`,
    ],
    [
      "Retour V5.15 controlled queue preview",
      `/incidents/${incidentId}/controlled-command-queue-preview`,
    ],
    [
      "Retour V5.14 command draft review",
      `/incidents/${incidentId}/command-draft-review-surface`,
    ],
    [
      "Retour V5.13 command draft persistence",
      `/incidents/${incidentId}/gated-command-draft-persistence`,
    ],
    [
      "Retour V5.12 command draft preview",
      `/incidents/${incidentId}/operator-approved-command-draft-preview`,
    ],
    [
      "Retour V5.11 approval persistence",
      `/incidents/${incidentId}/gated-operator-approval-persistence`,
    ],
    [
      "Retour V5.10 approval draft",
      `/incidents/${incidentId}/audited-operator-approval-draft`,
    ],
    [
      "Retour V5.9 intent review",
      `/incidents/${incidentId}/operator-intent-review-surface`,
    ],
    [
      "Retour V5.8 gated persistence",
      `/incidents/${incidentId}/gated-audited-intent-persistence`,
    ],
  ];

  return (
    <main className="min-h-screen bg-[#030712] px-4 py-6 text-slate-100 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <section className="rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 via-white/[0.035] to-emerald-400/10 p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-5">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge tone="cyan">Incident Detail V5.23</Badge>
                <StatusBadge status={status} />
                <Badge tone="green">REVIEW ONLY</Badge>
                <Badge tone="green">RUN DRAFT PERSISTED</Badge>
                <Badge tone="amber">NO POST /RUN</Badge>
                <Badge tone="amber">NO WORKER CALL</Badge>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Review Run Draft
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                Surface read-only de vérification du Run Draft persisté en
                V5.22. Cette page confirme les liens, le statut Draft et les
                garde-fous Dashboard. Elle ne déclenche aucun POST /run et
                n’appelle pas le worker.
              </p>
            </div>

            <button
              disabled
              className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-semibold text-slate-400 md:w-fit"
            >
              POST /run future non activé
            </button>
          </div>
        </section>

        <Card
          title="Previous Layer Validated"
          description="V5.22 a persisté un Run Draft sans POST /run, sans worker call, sans exécution réelle."
        >
          <KeyValueGrid
            items={[
              ["Previous version", "Incident Detail V5.22"],
              ["Run Draft Persistence", "VALIDATED"],
              ["Run Draft persisted", payload.run_persistence],
              ["No POST /run", payload.post_run],
              ["No worker", payload.worker_call],
              ["Execution policy", getRecord(payload.previous_layer).execution_policy],
            ]}
          />
        </Card>

        <Card title="Run Draft Identity">
          <KeyValueGrid
            items={[
              ["Run Record ID", payload.run_record_id],
              ["Run Draft ID", payload.run_draft_id],
              ["Run Idempotency Key", payload.run_idempotency_key],
              ["Workspace ID", payload.workspace_id],
              ["Incident ID", payload.incident_id],
              ["Command Record ID", payload.command_record_id],
              ["Command ID", payload.command_draft_id],
              ["Intent Record ID", payload.intent_record_id],
              ["Approval Record ID", payload.approval_record_id],
              [
                "Operational Queue Transition ID",
                payload.operational_queue_transition_id,
              ],
            ]}
          />
        </Card>

        <Card title="Run Draft Safety State">
          <KeyValueGrid
            items={[
              ["Run Status", payload.current_run_status],
              ["Run Status_select", payload.current_run_status_select],
              ["Run Persistence", persistedRun.run_persistence],
              ["Dry Run", persistedRun.dry_run],
              ["Capability", persistedRun.capability],
              ["Post_Run_Allowed", persistedRun.post_run_allowed],
              ["Worker_Call_Allowed", persistedRun.worker_call_allowed],
              ["Real_Run", persistedRun.real_run],
              ["Secret_Exposure", persistedRun.secret_exposure],
              ["Source Layer", persistedRun.source_layer],
            ]}
          />
        </Card>

        <Card title="Queued Command Source">
          <KeyValueGrid
            items={[
              ["Command Record ID", payload.command_record_id],
              ["Command Status", payload.current_command_status],
              ["Command Status_select", payload.current_command_status_select],
              ["Operational Queue Status", payload.operational_queue_status],
              ["Command Source Layer", persistedCommand.source_layer],
              ["Workspace ID", persistedCommand.workspace_id],
              ["Incident ID", persistedCommand.incident_id],
            ]}
          />
        </Card>

        <Card
          title="Run Input JSON"
          description="Input_JSON du Run Draft persisté. Si le parsing échoue, le payload API conserve un fallback contrôlé."
        >
          <JsonBlock value={payload.run_input_json} />
        </Card>

        <Card title="Run Draft Review Check">
          <Checklist value={payload.run_draft_review_check} />
        </Card>

        <Card
          title="External Execution Review"
          description="Cette surface ne vérifie pas l’état global du worker ou des schedulers externes."
        >
          <KeyValueGrid
            items={[
              [
                "external_scheduler_effect",
                externalReview.external_scheduler_effect,
              ],
              [
                "external_worker_execution",
                externalReview.external_worker_execution,
              ],
              ["external_run_execution", externalReview.external_run_execution],
              [
                "worker_side_verification_required",
                externalReview.worker_side_verification_required,
              ],
              ["note", externalReview.note],
            ]}
          />
        </Card>

        <Card title="Future POST /run Preview Requirements">
          <ListBlock items={payload.future_post_run_preview_requirements} />
        </Card>

        <Card title="Execution Lock">
          <div className="flex flex-wrap gap-2">
            <Badge tone="green">REVIEW ONLY</Badge>
            <Badge tone="green">RUN DRAFT PERSISTED</Badge>
            <Badge tone="amber">NO RUN EXECUTION</Badge>
            <Badge tone="amber">NO POST /RUN</Badge>
            <Badge tone="amber">NO WORKER CALL</Badge>
            <Badge tone="red">NO REAL RUN</Badge>
            <Badge tone="red">NO SECRET EXPOSURE</Badge>
            <Badge tone="cyan">POST /RUN FUTURE GATE REQUIRED</Badge>
          </div>
        </Card>

        <Card title="Read-only Run Draft Review Payload">
          <JsonBlock value={payload} />
        </Card>

        <Card title="Navigation">
          <div className="grid gap-3 md:grid-cols-2">
            {navItems.map(([label, path]) => (
              <Link
                key={label}
                href={buildHref(path, workspaceId, cacheVersion)}
                className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-100"
              >
                {label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
