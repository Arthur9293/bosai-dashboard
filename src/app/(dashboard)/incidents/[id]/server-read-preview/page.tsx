import Link from "next/link";
import { buildIncidentServerReadPreview } from "@/lib/incidents/server-read-preview";

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

export default async function IncidentServerReadPreviewPage({
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

  const preview = buildIncidentServerReadPreview({
    incidentId,
    workspaceId,
  });

  const incidentHref = `/incidents/${encodeURIComponent(
    incidentId
  )}?workspace_id=${encodeURIComponent(workspaceId)}`;

  const handshakeHref = `/incidents/${encodeURIComponent(
    incidentId
  )}/handshake-preview?workspace_id=${encodeURIComponent(workspaceId)}`;

  const statusKind = preview.status === "SERVER_READ_READY" ? "ready" : "warning";

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-3xl border border-cyan-400/20 bg-cyan-950/20 p-6 sm:p-8">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200/70">
              CONTROLLED SERVER READ PREVIEW
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Lecture serveur contrôlée
            </h1>

            <p className="max-w-3xl text-base leading-8 text-zinc-400 sm:text-lg">
              V5.0 lit uniquement l’état de préparation côté serveur et expose
              une prévisualisation contrôlée. Aucun appel worker, aucun POST /run,
              aucune exécution réelle et aucune mutation ne sont déclenchés.
            </p>

            <div className="flex flex-wrap gap-3">
              <span className={pillClassName(statusKind)}>
                {preview.status}
              </span>
              <span className={pillClassName("info")}>
                SERVER READ ONLY
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
              Worker base URL
            </p>
            <p className="mt-3 break-words font-mono text-lg font-semibold text-emerald-200">
              {preview.server_read.worker_base_url}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Scheduler secret
            </p>
            <p className="mt-3 break-words font-mono text-lg font-semibold text-emerald-200">
              {preview.server_read.scheduler_secret}
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
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Server read payload
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
            V5.0 confirme que le serveur peut construire une lecture contrôlée
            du contexte dry run sans exécuter le worker. Le prochain palier pourra
            préparer un appel worker strictement dry_run:true derrière feature gate.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href={incidentHref}
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-bold text-white"
            >
              Retour incident
            </Link>

            <Link
              href={handshakeHref}
              className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-4 text-center text-sm font-bold text-cyan-100"
            >
              Retour handshake preview
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
