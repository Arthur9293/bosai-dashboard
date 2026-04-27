import Link from "next/link";
import { buildWorkerDryRunAdapterPreview } from "@/lib/incidents/worker-dry-run-adapter-preview";

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
  if (kind === "ready") {
    return "rounded-full border border-emerald-400/35 bg-emerald-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-200";
  }

  if (kind === "warning") {
    return "rounded-full border border-amber-400/35 bg-amber-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-amber-200";
  }

  if (kind === "info") {
    return "rounded-full border border-cyan-400/35 bg-cyan-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-200";
  }

  return "rounded-full border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-rose-200";
}

export default async function WorkerDryRunAdapterPreviewPage({
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

  const preview = buildWorkerDryRunAdapterPreview({
    incidentId,
    workspaceId,
    requestedDryRun,
  });

  const incidentHref = `/incidents/${encodeURIComponent(
    incidentId
  )}?workspace_id=${encodeURIComponent(workspaceId)}`;

  const serverReadHref = `/incidents/${encodeURIComponent(
    incidentId
  )}/server-read-preview?workspace_id=${encodeURIComponent(workspaceId)}`;

  const statusKind =
    preview.status === "ADAPTER_PREPARED_NO_WORKER_CALL"
      ? "ready"
      : preview.status === "REAL_RUN_FORBIDDEN"
        ? "locked"
        : "warning";

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-3xl border border-cyan-400/20 bg-cyan-950/20 p-6 sm:p-8">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200/70">
              FEATURE-GATED WORKER DRY RUN ADAPTER PREVIEW
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Adaptateur dry run verrouillé
            </h1>

            <p className="max-w-3xl text-base leading-8 text-zinc-400 sm:text-lg">
              V5.1 prépare le contrat serveur d’un futur dry run worker. Cette
              version vérifie le feature gate, force dry_run:true, refuse dry_run:false
              et ne déclenche aucun appel worker.
            </p>

            <div className="flex flex-wrap gap-3">
              <span className={pillClassName(statusKind)}>
                {preview.status}
              </span>
              <span className={pillClassName("info")}>
                ADAPTER PREVIEW ONLY
              </span>
              <span className={pillClassName("locked")}>
                NO POST /RUN
              </span>
              <span className={pillClassName("locked")}>
                NO WORKER CALL
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Incident
            </p>
            <p className="mt-3 break-words font-mono text-lg font-semibold text-white">
              {preview.incident_id}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Workspace
            </p>
            <p className="mt-3 break-words font-mono text-lg font-semibold text-white">
              {preview.workspace_id}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Feature gate env
            </p>
            <p className="mt-3 break-words font-mono text-sm font-semibold text-cyan-200">
              {preview.feature_gate.feature_gate_env}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Feature gate status
            </p>
            <p className="mt-3 break-words font-mono text-lg font-semibold text-emerald-200">
              {preview.feature_gate.feature_gate_enabled ? "ENABLED" : "DISABLED"}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Worker base URL
            </p>
            <p className="mt-3 break-words font-mono text-lg font-semibold text-emerald-200">
              {preview.server_config.worker_base_url}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Scheduler secret
            </p>
            <p className="mt-3 break-words font-mono text-lg font-semibold text-emerald-200">
              {preview.server_config.scheduler_secret}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-rose-400/25 bg-rose-950/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
            Execution lock
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className={pillClassName("locked")}>NO CLIENT FETCH</span>
            <span className={pillClassName("locked")}>NO POST /RUN</span>
            <span className={pillClassName("locked")}>NO WORKER CALL</span>
            <span className={pillClassName("locked")}>NO AIRTABLE MUTATION</span>
            <span className={pillClassName("locked")}>NO SECRET EXPOSURE</span>
            <span className={pillClassName("locked")}>REAL RUN FORBIDDEN</span>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Worker request preview
          </p>

          <pre className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-black p-5 text-xs leading-6 text-zinc-300">
            {JSON.stringify(preview.worker_request_preview, null, 2)}
          </pre>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Full adapter payload
          </p>

          <pre className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-black p-5 text-xs leading-6 text-zinc-300">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Recommendation
          </p>

          <p className="mt-3 text-base leading-7 text-zinc-300">
            V5.1 prépare le contrat d’adaptateur worker, mais ne déclenche rien.
            Le prochain palier pourra décider si l’appel worker dry_run:true est
            autorisé derrière feature gate explicite.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href={incidentHref}
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-bold text-white"
            >
              Retour incident
            </Link>

            <Link
              href={serverReadHref}
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
