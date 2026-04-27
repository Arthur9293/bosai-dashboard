import Link from "next/link";
import { headers } from "next/headers";
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
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return {};
}

function valueToString(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

function getFirstSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string {
  const value = searchParams[key];

  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function fetchPayload(id: string, searchParams: Record<string, string | string[] | undefined>) {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "https";

  const workspaceId =
    getFirstSearchParam(searchParams, "workspace_id") ||
    getFirstSearchParam(searchParams, "workspaceId") ||
    "default";

  const version = getFirstSearchParam(searchParams, "_v");

  const url = new URL(
    `${protocol}://${host}/api/incidents/${encodeURIComponent(
      id
    )}/gated-post-run-persistence`
  );

  url.searchParams.set("workspace_id", workspaceId);
  if (version) url.searchParams.set("_v", version);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    return asRecord(await response.json());
  } catch (error) {
    return {
      ok: false,
      version: "Incident Detail V5.25",
      status: "POST_RUN_READ_FAILED",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function statusTone(status: string): string {
  if (
    status === "POST_RUN_DRY_RUN_SENT" ||
    status === "POST_RUN_ALREADY_PERSISTED" ||
    status === "POST_RUN_READY_REQUIRES_POST_CONFIRMATION"
  ) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (
    status === "WORKER_DRY_RUN_REVIEW_REQUIRED" ||
    status === "POST_RUN_PERSISTENCE_BLOCKED_BY_FEATURE_GATE"
  ) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }

  if (status.includes("FAILED") || status.includes("MISSING") || status.includes("FORBIDDEN")) {
    return "border-red-400/30 bg-red-400/10 text-red-200";
  }

  return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
}

function Badge({ children, tone = "cyan" }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    red: "border-red-400/30 bg-red-400/10 text-red-200",
    zinc: "border-white/10 bg-white/[0.04] text-zinc-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
        tones[tone] ?? tones.cyan
      }`}
    >
      {children}
    </span>
  );
}

function Card({
  title,
  children,
  tone = "cyan",
}: {
  title: string;
  children: ReactNode;
  tone?: "cyan" | "green" | "amber" | "red" | "zinc";
}) {
  const borders = {
    cyan: "border-cyan-400/20",
    green: "border-emerald-400/20",
    amber: "border-amber-400/20",
    red: "border-red-400/20",
    zinc: "border-white/10",
  };

  return (
    <section
      className={`rounded-[28px] border ${
        borders[tone]
      } bg-zinc-950/70 p-5 shadow-2xl shadow-black/20`}
    >
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-zinc-100">{valueToString(value)}</p>
    </div>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function BoolRow({ label, value }: { label: string; value: unknown }) {
  const ok = value === true;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="break-all text-sm text-zinc-300">{label}</span>
      <span
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
          ok
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
            : "border-amber-400/30 bg-amber-400/10 text-amber-200"
        }`}
      >
        {valueToString(value)}
      </span>
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-4">
      <pre className="min-w-0 whitespace-pre-wrap break-all text-xs leading-6 text-zinc-200">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function NavButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08]"
    >
      {children}
    </Link>
  );
}

function DisabledButton({ children }: { children: ReactNode }) {
  return (
    <button
      disabled
      className="w-full rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-200 opacity-80"
    >
      {children}
    </button>
  );
}

export default async function GatedPostRunPersistencePage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const id = resolvedParams.id;

  const workspaceId =
    getFirstSearchParam(resolvedSearchParams, "workspace_id") ||
    getFirstSearchParam(resolvedSearchParams, "workspaceId") ||
    "default";

  const payload = await fetchPayload(id, resolvedSearchParams);
  const status = valueToString(payload.status);
  const workerTarget = asRecord(payload.worker_target_preview);
  const workerConfig = asRecord(payload.worker_config);
  const readiness = asRecord(payload.post_run_readiness_check);
  const run = asRecord(payload.persisted_run_snapshot);
  const command = asRecord(payload.persisted_command_snapshot);

  const baseIncidentHref = `/incidents/${encodeURIComponent(id)}?workspace_id=${encodeURIComponent(
    workspaceId
  )}`;

  const vHref = (path: string) =>
    `/incidents/${encodeURIComponent(id)}/${path}?workspace_id=${encodeURIComponent(
      workspaceId
    )}`;

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6 shadow-2xl shadow-cyan-950/20">
          <div className="mb-5 flex flex-wrap gap-2">
            <Badge tone="cyan">Incident Detail V5.25</Badge>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone(
                status
              )}`}
            >
              {status}
            </span>
            <Badge tone="green">DRY RUN ONLY</Badge>
            <Badge tone="cyan">SERVER-SIDE POST</Badge>
            <Badge tone="amber">NO REAL RUN</Badge>
            <Badge tone="zinc">NO SECRET EXPOSURE</Badge>
          </div>

          <p className="text-sm uppercase tracking-[0.28em] text-cyan-300">
            BOSAI Control Plane
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            POST /run contrôlé
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Surface V5.25 pour envoyer un POST serveur vers le worker uniquement en dry-run,
            derrière double gate, confirmation opérateur et audit idempotent. Aucun secret
            n’est exposé côté client.
          </p>

          <div className="mt-6">
            <DisabledButton>POST /run réel interdit — dry-run contrôlé uniquement</DisabledButton>
          </div>
        </section>

        <Card title="Previous Layer Validated" tone="green">
          <Grid>
            <KeyValue label="Previous version" value="Incident Detail V5.24" />
            <KeyValue label="Preview status" value="POST_RUN_PREVIEW_READY" />
            <KeyValue label="Run Draft" value="Persisted and reviewed" />
            <KeyValue label="Worker config" value="Preview ready" />
          </Grid>
        </Card>

        <Card title="POST /run Gates" tone="amber">
          <Grid>
            <KeyValue
              label="Feature gate"
              value={payload.feature_gate_env ?? "BOSAI_POST_RUN_PERSISTENCE_ENABLED"}
            />
            <KeyValue label="Feature gate enabled" value={payload.feature_gate_enabled} />
            <KeyValue
              label="Worker dry-run reviewed gate"
              value={payload.worker_dry_run_review_gate_env}
            />
            <KeyValue label="Worker dry-run reviewed" value={payload.worker_dry_run_reviewed} />
            <KeyValue label="Required confirmation token" value="SEND_POST_RUN_DRY_RUN" />
            <KeyValue
              label="Required worker acknowledgement"
              value="I_ACKNOWLEDGE_THIS_SENDS_A_SERVER_SIDE_DRY_RUN_POST_TO_WORKER"
            />
            <KeyValue label="GET read-only" value="true" />
            <KeyValue label="POST required for dry-run call" value="true" />
          </Grid>
        </Card>

        <Card title="Run Draft Source" tone="cyan">
          <Grid>
            <KeyValue label="Run Record ID" value={payload.run_record_id} />
            <KeyValue label="Run Draft ID" value={payload.run_draft_id} />
            <KeyValue label="Run Idempotency Key" value={payload.run_idempotency_key} />
            <KeyValue label="Run Status" value={payload.current_run_status} />
            <KeyValue label="Run Status_select" value={payload.current_run_status_select} />
            <KeyValue label="Command Record ID" value={payload.command_record_id} />
            <KeyValue label="Command Status" value={payload.current_command_status} />
            <KeyValue label="Workspace ID" value={payload.workspace_id} />
            <KeyValue label="Incident ID" value={payload.incident_id} />
            <KeyValue label="Run Source Layer" value={run.source_layer} />
            <KeyValue label="Command Source Layer" value={command.source_layer} />
            <KeyValue label="Capability" value={run.capability ?? command.capability} />
          </Grid>
        </Card>

        <Card title="Worker Target" tone="cyan">
          <Grid>
            <KeyValue label="Method" value={workerTarget.method} />
            <KeyValue label="Endpoint" value={workerTarget.endpoint} />
            <KeyValue label="Worker base URL" value={workerTarget.base_url} />
            <KeyValue label="Worker secret" value={workerConfig.worker_secret} />
            <KeyValue label="Secret header" value="x-scheduler-secret" />
            <KeyValue label="Secret value" value="SERVER_SIDE_ONLY_NOT_EXPOSED" />
            <KeyValue label="POST sent" value={payload.post_sent} />
            <KeyValue label="Worker call" value={payload.worker_call} />
          </Grid>
        </Card>

        <Card title="Worker Payload" tone="zinc">
          <JsonBlock value={payload.post_run_payload_preview ?? payload.worker_payload_sent} />
        </Card>

        <Card title="Worker Response Sanitized" tone="green">
          <JsonBlock value={payload.worker_response ?? "No worker response yet."} />
        </Card>

        <Card title="POST /run Safety Checklist" tone="green">
          <div className="grid gap-3">
            {Object.entries(readiness).map(([key, value]) => (
              <BoolRow key={key} label={key} value={value} />
            ))}
          </div>
        </Card>

        <Card title="Execution Lock" tone="red">
          <div className="flex flex-wrap gap-2">
            <Badge tone="green">DRY RUN ONLY</Badge>
            <Badge tone="red">NO REAL RUN</Badge>
            <Badge tone="zinc">SECRET SERVER-SIDE ONLY</Badge>
            <Badge tone="amber">OPERATOR CONFIRMATION REQUIRED</Badge>
            <Badge tone="cyan">WORKER CALL AUDITED</Badge>
            <Badge tone="red">NO CLIENT FETCH</Badge>
            <Badge tone="amber">FEATURE GATED</Badge>
          </div>
        </Card>

        <Card title="V5.25 Payload" tone="zinc">
          <JsonBlock value={payload} />
        </Card>

        <Card title="Navigation" tone="zinc">
          <div className="grid gap-3 md:grid-cols-2">
            <NavButton href={baseIncidentHref}>Retour incident</NavButton>
            <NavButton href={vHref("controlled-post-run-preview")}>
              Retour V5.24 controlled POST /run preview
            </NavButton>
            <NavButton href={vHref("run-draft-review-surface")}>
              Retour V5.23 run draft review
            </NavButton>
            <NavButton href={vHref("gated-run-draft-persistence")}>
              Retour V5.22 gated run draft persistence
            </NavButton>
            <NavButton href={vHref("run-creation-preview")}>
              Retour V5.21 run creation preview
            </NavButton>
            <NavButton href={vHref("operational-queue-review-after-persistence")}>
              Retour V5.20 operational queue review
            </NavButton>
            <NavButton href={vHref("gated-operational-queue-persistence")}>
              Retour V5.19 gated operational queue persistence
            </NavButton>
            <NavButton href={vHref("operational-queue-transition-preview")}>
              Retour V5.18 operational queue transition preview
            </NavButton>
            <NavButton href={vHref("operational-queue-readiness-review")}>
              Retour V5.17 operational queue readiness
            </NavButton>
            <NavButton href={vHref("gated-command-queue-persistence")}>
              Retour V5.16 gated queue persistence
            </NavButton>
            <NavButton href={vHref("controlled-command-queue-preview")}>
              Retour V5.15 controlled queue preview
            </NavButton>
          </div>
        </Card>
      </div>
    </main>
  );
}
