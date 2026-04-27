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

function normalizeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function normalizeWorkspaceId(value: string | null | undefined): string {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : "production";
}

function withWorkspace(href: string, workspaceId: string): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}workspace_id=${encodeURIComponent(workspaceId)}`;
}

function displayValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "YES" : "NO";
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (value === null || typeof value === "undefined") return "—";
  return JSON.stringify(value);
}

function readPath(payload: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, payload);
}

function statusTone(status: string): "green" | "amber" | "red" | "cyan" {
  if (
    status === "RUN_DRAFT_PERSISTED" ||
    status === "RUN_DRAFT_ALREADY_PERSISTED" ||
    status === "RUN_DRAFT_PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION"
  ) {
    return "green";
  }

  if (
    status.includes("BLOCKED") ||
    status.includes("FAILED") ||
    status.includes("MISSING") ||
    status.includes("NOT_FOUND") ||
    status.includes("FORBIDDEN") ||
    status.includes("REQUIRED") ||
    status.includes("NOT_ALLOWED")
  ) {
    return "red";
  }

  return "amber";
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

function DisabledButton(props: { children: ReactNode }) {
  return (
    <button
      type="button"
      disabled
      className="w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white/30"
    >
      {props.children}
    </button>
  );
}

function BooleanChecklist(props: {
  payload: Record<string, unknown>;
  basePath: string;
  items: string[];
}) {
  return (
    <div className="grid gap-3">
      {props.items.map((item) => {
        const value = readPath(props.payload, `${props.basePath}.${item}`);
        const ok = value === true;

        return (
          <div
            key={item}
            className="flex items-start justify-between gap-4 rounded-[1.25rem] border border-white/10 bg-black/25 p-4"
          >
            <p className="break-all font-mono text-sm font-bold text-white/75">{item}</p>
            <Badge tone={ok ? "green" : "red"}>{displayValue(value)}</Badge>
          </div>
        );
      })}
    </div>
  );
}

async function fetchPayload(input: {
  incidentId: string;
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<Record<string, unknown>> {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";

  const url = new URL(
    `${protocol}://${host}/api/incidents/${encodeURIComponent(
      input.incidentId
    )}/gated-run-draft-persistence`
  );

  for (const [key, value] of Object.entries(input.searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") url.searchParams.append(key, item);
      }
    } else if (typeof value === "string") {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      version: "Incident Detail V5.22",
      status: "RUN_DRAFT_PERSISTENCE_READ_FAILED",
      error: `Unable to read API response. HTTP ${response.status}`,
    };
  }
}

export default async function GatedRunDraftPersistencePage(props: PageProps) {
  const params = await Promise.resolve(props.params);
  const searchParams = props.searchParams ? await props.searchParams : {};

  const incidentId = params.id;
  const workspaceId = normalizeWorkspaceId(
    firstSearchParam(searchParams, "workspace_id") ??
      firstSearchParam(searchParams, "workspaceId")
  );

  const payload = await fetchPayload({
    incidentId,
    searchParams,
  });

  const status = displayValue(payload.status);
  const tone = statusTone(status);

  const incidentHref = withWorkspace(`/incidents/${incidentId}`, workspaceId);
  const v521Href = withWorkspace(
    `/incidents/${incidentId}/run-creation-preview`,
    workspaceId
  );
  const v520Href = withWorkspace(
    `/incidents/${incidentId}/operational-queue-review-after-persistence`,
    workspaceId
  );
  const v519Href = withWorkspace(
    `/incidents/${incidentId}/gated-operational-queue-persistence`,
    workspaceId
  );
  const v518Href = withWorkspace(
    `/incidents/${incidentId}/operational-queue-transition-preview`,
    workspaceId
  );
  const v517Href = withWorkspace(
    `/incidents/${incidentId}/operational-queue-readiness-review`,
    workspaceId
  );
  const v516Href = withWorkspace(
    `/incidents/${incidentId}/gated-command-queue-persistence`,
    workspaceId
  );
  const v515Href = withWorkspace(
    `/incidents/${incidentId}/controlled-command-queue-preview`,
    workspaceId
  );
  const v514Href = withWorkspace(
    `/incidents/${incidentId}/command-draft-review-surface`,
    workspaceId
  );
  const v513Href = withWorkspace(
    `/incidents/${incidentId}/gated-command-draft-persistence`,
    workspaceId
  );
  const v512Href = withWorkspace(
    `/incidents/${incidentId}/operator-approved-command-draft-preview`,
    workspaceId
  );
  const v511Href = withWorkspace(
    `/incidents/${incidentId}/gated-audited-operator-approval-persistence`,
    workspaceId
  );
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
      <Card tone={tone}>
        <Eyebrow>Gated Run Draft Persistence</Eyebrow>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl">
          Persistance Run Draft
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-10 text-white/60">
          V5.22 persiste uniquement un brouillon de Run auditée. Cette surface ne
          fait aucun POST /run, n’appelle aucun worker, ne modifie pas la Command
          et ne déclenche aucune exécution réelle.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Badge tone="cyan">Incident Detail V5.22</Badge>
          <Badge tone={tone}>{status}</Badge>
          <Badge tone="amber">DRAFT ONLY</Badge>
          <Badge tone="red">NO POST /RUN</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
        </div>
      </Card>

      <Card tone="green">
        <Eyebrow>Previous Layer Validated</Eyebrow>

        <div className="grid gap-4">
          <DataTile label="Previous Version" value="Incident Detail V5.21" tone="green" />
          <DataTile label="Run Creation Preview" value="VALIDATED" tone="green" />
          <DataTile label="Run Contract" value="READY" tone="green" />
          <DataTile
            label="Run Persistence"
            value={displayValue(readPath(payload, "run_persistence"))}
            tone={status.includes("PERSISTED") ? "green" : "amber"}
          />
          <DataTile label="POST /run" value="DISABLED_FROM_THIS_SURFACE" tone="red" />
          <DataTile label="Worker Call" value="DISABLED_FROM_THIS_SURFACE" tone="red" />
        </div>
      </Card>

      <Card tone={readPath(payload, "feature_gate_enabled") === true ? "green" : "red"}>
        <Eyebrow>Run Draft Gate</Eyebrow>

        <div className="grid gap-4">
          <DataTile
            label="Feature Gate Env"
            value={displayValue(readPath(payload, "feature_gate_env"))}
            tone="cyan"
          />
          <DataTile
            label="Feature Gate Status"
            value={
              readPath(payload, "feature_gate_enabled") === true ? "ENABLED" : "DISABLED"
            }
            tone={readPath(payload, "feature_gate_enabled") === true ? "green" : "red"}
          />
          <DataTile
            label="Required Confirmation Token"
            value="PERSIST_RUN_DRAFT"
            tone="amber"
          />
          <DataTile label="POST Required" value="YES" tone="amber" />
          <DataTile label="Write From Page" value="NO" tone="red" />
        </div>
      </Card>

      <Card tone="cyan">
        <Eyebrow>Queued Command Source</Eyebrow>

        <div className="grid gap-4">
          <DataTile
            label="Command Record ID"
            value={displayValue(readPath(payload, "command_record_id"))}
            tone="cyan"
          />
          <DataTile
            label="Command Draft ID"
            value={displayValue(readPath(payload, "command_draft_id"))}
            tone="cyan"
          />
          <DataTile
            label="Command Idempotency Key"
            value={displayValue(readPath(payload, "command_idempotency_key"))}
            tone="cyan"
          />
          <DataTile
            label="Current Status"
            value={displayValue(readPath(payload, "current_command_status"))}
            tone="green"
          />
          <DataTile
            label="Current Status_select"
            value={displayValue(readPath(payload, "current_status_select"))}
            tone="green"
          />
          <DataTile
            label="Operational Queue Status"
            value={displayValue(readPath(payload, "operational_queue_status"))}
            tone="green"
          />
          <DataTile
            label="Source Layer"
            value={displayValue(readPath(payload, "persisted_command_snapshot.source_layer"))}
            tone="cyan"
          />
          <DataTile
            label="Capability"
            value={displayValue(readPath(payload, "persisted_command_snapshot.capability"))}
            tone="cyan"
          />
          <DataTile
            label="Workspace ID"
            value={displayValue(readPath(payload, "workspace_id"))}
            tone="cyan"
          />
          <DataTile
            label="Incident ID"
            value={displayValue(readPath(payload, "incident_id"))}
            tone="cyan"
          />
          <DataTile
            label="Intent Record ID"
            value={displayValue(readPath(payload, "intent_record_id"))}
            tone="cyan"
          />
          <DataTile
            label="Approval Record ID"
            value={displayValue(readPath(payload, "approval_record_id"))}
            tone="cyan"
          />
        </div>
      </Card>

      <Card tone={status.includes("PERSISTED") ? "green" : "amber"}>
        <Eyebrow>Run Draft Persistence Contract</Eyebrow>

        <div className="grid gap-4">
          <DataTile
            label="Run Draft ID"
            value={displayValue(readPath(payload, "run_draft_id"))}
            tone="cyan"
          />
          <DataTile
            label="Run Idempotency Key"
            value={displayValue(readPath(payload, "run_idempotency_key"))}
            tone="cyan"
          />
          <DataTile
            label="Target Table"
            value={displayValue(readPath(payload, "run_draft_persistence_contract.target_table"))}
            tone="cyan"
          />
          <DataTile
            label="Target Status"
            value="Draft"
            tone="amber"
          />
          <DataTile
            label="Run Persistence"
            value={displayValue(readPath(payload, "run_persistence"))}
            tone={status.includes("PERSISTED") ? "green" : "amber"}
          />
          <DataTile label="POST /run" value="DISABLED_FROM_THIS_SURFACE" tone="red" />
          <DataTile label="Worker Call" value="DISABLED_FROM_THIS_SURFACE" tone="red" />
          <DataTile label="Real Run" value="FORBIDDEN" tone="red" />
        </div>
      </Card>

      <Card>
        <Eyebrow>Run Record Preview</Eyebrow>
        <JsonBlock value={readPath(payload, "run_record_preview")} />
      </Card>

      <Card>
        <Eyebrow>Run Input JSON Preview</Eyebrow>
        <JsonBlock value={readPath(payload, "run_input_json_preview")} />
      </Card>

      <Card tone="green">
        <Eyebrow>Safety Checklist</Eyebrow>

        <BooleanChecklist
          payload={payload}
          basePath="safety_checklist"
          items={[
            "intent_found",
            "approval_found",
            "command_found",
            "command_status_is_queued",
            "status_select_is_queued",
            "operational_queue_persisted",
            "source_layer_is_v519",
            "feature_gate_enabled",
            "run_status_forced_to_draft",
            "run_execution_disabled",
            "post_run_disabled",
            "worker_call_disabled",
            "real_run_forbidden",
            "secret_exposure_disabled",
            "no_post_run_by_this_surface",
            "no_worker_called_by_this_surface",
          ]}
        />
      </Card>

      <Card tone="red">
        <Eyebrow>Execution Lock</Eyebrow>

        <div className="flex flex-wrap gap-3">
          <Badge tone="amber">RUN DRAFT ONLY</Badge>
          <Badge tone="red">NO RUN EXECUTION</Badge>
          <Badge tone="red">NO POST /RUN</Badge>
          <Badge tone="red">NO WORKER CALL</Badge>
          <Badge tone="red">NO REAL RUN</Badge>
          <Badge tone="red">NO SECRET EXPOSURE</Badge>
          <Badge tone="amber">FEATURE GATED</Badge>
          <Badge tone="amber">POST CONFIRMATION REQUIRED</Badge>
        </div>

        <div className="mt-8">
          <DisabledButton>Run Draft via POST contrôlé uniquement</DisabledButton>
        </div>
      </Card>

      <Card>
        <Eyebrow>Read-only Run Draft Persistence Payload</Eyebrow>
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

          <NavButton href={v521Href}>Retour V5.21 run creation preview</NavButton>
          <NavButton href={v520Href}>Retour V5.20 operational queue review</NavButton>
          <NavButton href={v519Href}>Retour V5.19 gated operational queue persistence</NavButton>
          <NavButton href={v518Href}>Retour V5.18 operational queue transition preview</NavButton>
          <NavButton href={v517Href}>Retour V5.17 operational queue readiness</NavButton>
          <NavButton href={v516Href}>Retour V5.16 gated queue persistence</NavButton>
          <NavButton href={v515Href}>Retour V5.15 controlled queue preview</NavButton>
          <NavButton href={v514Href}>Retour V5.14 command draft review</NavButton>
          <NavButton href={v513Href}>Retour V5.13 command draft persistence</NavButton>
          <NavButton href={v512Href}>Retour V5.12 command draft preview</NavButton>
          <NavButton href={v511Href}>Retour V5.11 approval persistence</NavButton>
          <NavButton href={v510Href}>Retour V5.10 approval draft</NavButton>
          <NavButton href={v59Href}>Retour V5.9 intent review</NavButton>
          <NavButton href={v58Href}>Retour V5.8 gated persistence</NavButton>
        </div>
      </Card>
    </main>
  );
}
