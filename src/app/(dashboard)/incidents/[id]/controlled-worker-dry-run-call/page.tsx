import Link from "next/link";
import { buildControlledWorkerDryRunCall } from "@/lib/incidents/controlled-worker-dry-run-call";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<SearchParams> | SearchParams;
};

function firstValue(value: string | string[] | undefined, fallback: string): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function pillClassName(kind: "ready" | "locked" | "warning" | "info") {
  const base =
    "rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] break-words";

  if (kind === "ready") {
    return `${base} border-emerald-400/35 bg-emerald-500/15 text-emerald-200`;
  }

  if (kind === "warning") {
    return `${base} border-amber-400/35 bg-amber-500/15 text-amber-200`;
  }

  if (kind === "info") {
    return `${base} border-cyan-400/35 bg-cyan-500/15 text-cyan-200`;
  }

  return `${base} border-rose-400/35 bg-rose-500/15 text-rose-200`;
}

function statusKind(status: string): "ready" | "locked" | "warning" | "info" {
  if (status === "WORKER_DRY_RUN_CALLED") return "ready";
  if (status === "WORKER_DRY_RUN_CALL_FAILED") return "warning";
  if (status === "REAL_RUN_FORBIDDEN") return "locked";
  return "warning";
}

function FieldCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number | boolean | null;
  tone?: "default" | "green" | "cyan" | "red" | "amber";
}) {
  const valueClassName =
    tone === "green"
      ? "text-emerald-200"
      : tone === "cyan"
        ? "text-cyan-200"
        : tone === "red"
          ? "text-rose-200"
          : tone === "amber"
            ? "text-amber-200"
            : "text-white";

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
        {label}
      </p>
      <p className={`mt-3 break-words font-mono text-lg font-semibold ${valueClassName}`}>
        {String(value ?? "null")}
      </p>
    </div>
  );
}

export default async function ControlledWorkerDryRunCallPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const incidentId = resolvedParams.id || "unknown";
  const workspaceId = firstValue(
    resolvedSearchParams.workspace_id ?? resolvedSearchParams.workspaceId,
    "production"
  );
  const requestedDryRun = firstValue(resolvedSearchParams.dry_run, "");

  const payload = await buildControlledWorkerDryRunCall({
    incidentId,
    workspaceId,
    requestedDryRun,
  });

  const incidentHref = `/incidents/${encodeURIComponent(
    incidentId
  )}?workspace_id=${encodeURIComponent(workspaceId)}`;

  const v51Href = `/incidents/${encodeURIComponent(
    incidentId
  )}/worker-dry-run-adapter-preview?workspace_id=${encodeURIComponent(workspaceId)}`;

  const v50Href = `/incidents/${encodeURIComponent(
    incidentId
  )}/server-read-preview?workspace_id=${encodeURIComponent(workspaceId)}`;

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-3xl border border-cyan-400/20 bg-cyan-950/20 p-6 sm:p-8">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200/70">
              CONTROLLED WORKER DRY RUN CALL
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Appel worker dry run contrôlé
            </h1>

            <p className="max-w-3xl text-base leading-8 text-zinc-400 sm:text-lg">
              V5.2 prépare et peut appeler le worker uniquement côté serveur,
              derrière feature gate explicite, avec dry_run:true forcé. Aucun
              secret n’est exposé et aucune mutation directe Airtable n’est
              déclenchée par le dashboard.
            </p>

            <div className="flex flex-wrap gap-3">
              <span className={pillClassName(statusKind(payload.status))}>
                {payload.status}
              </span>
              <span className={pillClassName("info")}>DRY RUN ONLY</span>
              <span className={pillClassName("locked")}>NO REAL RUN</span>
              <span className={pillClassName("locked")}>NO SECRET EXPOSURE</span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <FieldCard label="Incident" value={payload.incident_id} />
          <FieldCard label="Workspace" value={payload.workspace_id} />
          <FieldCard
            label="Feature gate env"
            value={payload.feature_gate.feature_gate_env}
            tone="cyan"
          />
          <FieldCard
            label="Feature gate status"
            value={payload.feature_gate.feature_gate_enabled ? "ENABLED" : "DISABLED"}
            tone={payload.feature_gate.feature_gate_enabled ? "green" : "amber"}
          />
          <FieldCard
            label="Worker base URL"
            value={payload.server_config.worker_base_url}
            tone={payload.server_config.worker_base_url === "CONFIGURED" ? "green" : "red"}
          />
          <FieldCard
            label="Scheduler secret"
            value={payload.server_config.scheduler_secret}
            tone={payload.server_config.scheduler_secret === "CONFIGURED" ? "green" : "red"}
          />
          <FieldCard
            label="Worker HTTP status"
            value={payload.worker_http_status}
            tone={payload.worker_http_status ? "cyan" : "default"}
          />
          <FieldCard
            label="Duration"
            value={`${payload.duration_ms} ms`}
            tone="cyan"
          />
        </section>

        <section className="rounded-3xl border border-rose-400/25 bg-rose-950/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
            Execution lock
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className={pillClassName("locked")}>NO REAL RUN</span>
            <span className={pillClassName("info")}>DRY RUN ONLY</span>
            <span className={pillClassName("locked")}>NO SECRET EXPOSURE</span>
            <span className={pillClassName("locked")}>
              NO DASHBOARD AIRTABLE MUTATION
            </span>
            <span className={pillClassName("locked")}>REAL RUN FORBIDDEN</span>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Worker request preview
          </p>

          <pre className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-black p-5 text-xs leading-6 text-zinc-300">
            {JSON.stringify(payload.worker_request_preview, null, 2)}
          </pre>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Worker response preview
          </p>

          <pre className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-black p-5 text-xs leading-6 text-zinc-300">
            {JSON.stringify(payload.worker_response, null, 2)}
          </pre>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Full controlled payload
          </p>

          <pre className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-black p-5 text-xs leading-6 text-zinc-300">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Recommendation
          </p>

          <p className="mt-3 text-base leading-7 text-zinc-300">
            V5.2 est le premier palier capable de contacter le worker depuis le
            serveur, mais seulement si le feature gate est activé explicitement.
            Le flux reste limité à dry_run:true, sans secret exposé et sans
            mutation directe dashboard.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link
              href={incidentHref}
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-bold text-white"
            >
              Retour incident
            </Link>

            <Link
              href={v51Href}
              className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-4 text-center text-sm font-bold text-cyan-100"
            >
              Retour V5.1 adapter preview
            </Link>

            <Link
              href={v50Href}
              className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-4 text-center text-sm font-bold text-cyan-100"
            >
              Retour V5.0 server read preview
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
