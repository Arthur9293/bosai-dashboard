import Link from "next/link";

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

export default async function IncidentHandshakePreviewPage({
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

  const incidentHref = `/incidents/${encodeURIComponent(
    incidentId
  )}?workspace_id=${encodeURIComponent(workspaceId)}`;

  const contractPreview = {
    version: "Incident Detail V4.8.2",
    source: "dashboard_incident_detail_v4_8_2_standalone_handshake_preview",
    mode: "UI_ONLY",
    server_contract: "Incident Detail V4.7",
    expected_status: "ADAPTER_CONTRACT_READY",
    expected_mode: "CONTRACT_DIAGNOSTICS_ONLY",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,
    post_run: "DISABLED",
    worker_call: "DISABLED",
    airtable_mutation: "DISABLED",
    incident_mutation: "DISABLED",
    secret_exposure: "DISABLED",
    client_fetch: "DISABLED",
    human_confirmation: "REQUIRED",
  };

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="rounded-3xl border border-cyan-400/20 bg-cyan-950/20 p-6 sm:p-8">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-cyan-200/70">
              UI / SERVER HANDSHAKE PREVIEW
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Prévisualisation handshake serveur
            </h1>

            <p className="max-w-3xl text-base leading-8 text-zinc-400 sm:text-lg">
              Cette page dédiée confirme visuellement que le contrat serveur V4.7
              est prêt côté architecture. Elle ne déclenche aucun fetch client,
              aucun POST /run, aucun appel worker et aucune mutation.
            </p>

            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-200">
                SERVER ROUTE READY
              </span>
              <span className="rounded-full border border-cyan-400/35 bg-cyan-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-200">
                HANDSHAKE PREVIEW
              </span>
              <span className="rounded-full border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-rose-200">
                NO FETCH
              </span>
              <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-amber-200">
                HUMAN CONFIRMATION REQUIRED
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
              {incidentId}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Workspace
            </p>
            <p className="mt-3 break-words font-mono text-lg font-semibold text-white">
              {workspaceId}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Expected API status
            </p>
            <p className="mt-3 break-words font-mono text-lg font-semibold text-emerald-200">
              ADAPTER_CONTRACT_READY
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Execution mode
            </p>
            <p className="mt-3 break-words font-mono text-lg font-semibold text-rose-200">
              UI_ONLY / NO EXECUTION
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-rose-400/25 bg-rose-950/20 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
            Safety lock
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-rose-200">
              NO FETCH
            </span>
            <span className="rounded-full border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-rose-200">
              NO POST /RUN
            </span>
            <span className="rounded-full border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-rose-200">
              NO WORKER CALL
            </span>
            <span className="rounded-full border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-rose-200">
              NO AIRTABLE MUTATION
            </span>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Read-only contract preview
          </p>

          <pre className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-black p-5 text-xs leading-6 text-zinc-300">
            {JSON.stringify(contractPreview, null, 2)}
          </pre>
        </section>

        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Recommendation
          </p>

          <p className="mt-3 text-base leading-7 text-zinc-300">
            Server handshake preview only. Le prochain palier pourra connecter
            cette page à une lecture serveur contrôlée, sans activer d’exécution réelle.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href={incidentHref}
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-bold text-white"
            >
              Retour incident
            </Link>

            <button
              disabled
              className="cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-bold text-zinc-600"
            >
              Server handshake preview only
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
