import { fetchRuns, type RunItem, type RunsResponse } from "@/lib/api";

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function statusTone(status?: string) {
  const normalized = (status || "").toLowerCase();

  if (normalized === "done") {
    return "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (normalized === "running") {
    return "border border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  if (normalized === "error") {
    return "border border-rose-500/30 bg-rose-500/10 text-rose-300";
  }

  if (normalized === "unsupported") {
    return "border border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  return "border border-white/10 bg-white/5 text-zinc-300";
}

function metricCard(label: string, value: number | string, hint: string) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-black/30 p-6">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-4 text-5xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-3 text-sm text-zinc-500">{hint}</p>
    </div>
  );
}

function statBlock(label: string, value: number | string) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/30 p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">{label}</p>
      <p className="mt-4 text-4xl font-semibold text-white">{value}</p>
    </div>
  );
}

function runCard(run: RunItem) {
  const status = run.status || "—";

  return (
    <article
      key={run.id}
      className="rounded-[30px] border border-white/10 bg-black/30 p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold text-white">
            {run.capability || "Unknown capability"}
          </h2>
          <p className="mt-2 break-all text-sm text-zinc-500">
            {run.run_id || run.id}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium ${statusTone(
            status
          )}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[24px] border border-white/10 bg-black/30 p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Worker</p>
          <p className="mt-4 break-words text-xl text-white">{run.worker || "—"}</p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/30 p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Priority</p>
          <p className="mt-4 text-xl text-white">
            {run.priority ?? "—"}
          </p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/30 p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Dry run</p>
          <p className="mt-4 text-xl text-white">
            {run.dry_run === true ? "Oui" : run.dry_run === false ? "Non" : "—"}
          </p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/30 p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Started</p>
          <p className="mt-4 text-xl text-white">{formatDate(run.started_at)}</p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/30 p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Finished</p>
          <p className="mt-4 text-xl text-white">{formatDate(run.finished_at)}</p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/30 p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Record ID</p>
          <p className="mt-4 break-all font-mono text-lg text-white">{run.id}</p>
        </div>
      </div>
    </article>
  );
}

export default async function RunsPage() {
  let data: RunsResponse | null = null;
  let loadError: string | null = null;

  try {
    data = await fetchRuns(12);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Impossible de charger les runs BOSAI.";
  }

  const runs = data?.runs ?? [];
  const stats = data?.stats ?? {};
  const totalRuns = data?.count ?? runs.length ?? 0;

  const running = stats.running ?? 0;
  const done = stats.done ?? 0;
  const errorCount = stats.error ?? 0;
  const unsupported = stats.unsupported ?? 0;
  const other = stats.other ?? 0;

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-cyan-500/20 bg-[linear-gradient(180deg,rgba(2,8,23,0.92),rgba(2,6,23,0.82))] p-6 sm:p-8">
        <div className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.30em] text-emerald-300">
          Runs V2
        </div>

        <div className="mt-6 max-w-4xl">
          <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Runs
          </h1>
          <p className="mt-5 text-lg leading-9 text-zinc-400">
            Vue d’exécution BOSAI. Cette page remonte les runs du worker, leur
            statut, leur priorité, leur timing et leur contexte opérationnel.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Total visible</p>
            <p className="mt-4 text-4xl font-semibold text-white">{totalRuns}</p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Source</p>
            <p className="mt-4 text-xl text-white">
              {data?.ok ? "Worker connecté" : "Source indisponible"}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Signal</p>
            <p className="mt-4 text-xl text-white">
              {loadError ? "Erreur de chargement" : "Lecture active"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metricCard("Running", running, "Runs en cours")}
        {metricCard("Done", done, "Exécutions terminées")}
        {metricCard("Error", errorCount, "Échecs visibles")}
        {metricCard("Unsupported", unsupported, "Capabilities non supportées")}
        {metricCard("Other", other, "Autres états")}
      </section>

      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,10,28,0.90),rgba(3,7,20,0.80))] p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-semibold text-white">Operational Snapshot</h2>
          <p className="mt-2 text-base text-zinc-400">
            Lecture instantanée de la file des runs BOSAI.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statBlock("Running", running)}
          {statBlock("Done", done)}
          {statBlock("Errors", errorCount)}
          {statBlock("Unsupported", unsupported)}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(5,10,28,0.88),rgba(3,7,20,0.78))] p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-semibold text-white">Recent Runs</h2>
          <p className="mt-2 text-base text-zinc-400">
            Derniers runs remontés par le worker BOSAI.
          </p>
        </div>

        {loadError ? (
          <div className="rounded-[28px] border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
            {loadError}
          </div>
        ) : runs.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 p-8 text-zinc-500">
            Aucun run visible pour le moment.
          </div>
        ) : (
          <div className="space-y-5">{runs.map(runCard)}</div>
        )}
      </section>
    </div>
  );
}
