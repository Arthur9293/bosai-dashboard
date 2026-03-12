import { fetchHealth, fetchHealthScore } from "@/lib/api";

function toneFromScore(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-300";
  return "text-red-400";
}

function healthLabel(score: number) {
  if (score >= 80) return "Stable";
  if (score >= 50) return "À surveiller";
  return "Critique";
}

export default async function ToolsPage() {
  let health = null;
  let healthScore = null;

  try {
    health = await fetchHealth();
  } catch {}

  try {
    healthScore = await fetchHealthScore();
  } catch {}

  const capabilities = Array.isArray(health?.capabilities)
    ? health.capabilities
    : [];

  const policyKeys = Array.isArray(health?.policy_keys)
    ? health.policy_keys
    : [];

  const score = Number(healthScore?.score ?? 0);
  const issues = Array.isArray(healthScore?.issues) ? healthScore.issues : [];

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-cyan-500/20 bg-[#020617] p-6 sm:p-8">
        <div className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-emerald-300">
          Tools V2
        </div>

        <div className="mt-6 max-w-4xl">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Tools
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-400">
            Vue des capacités disponibles côté worker BOSAI, de l’état global du
            moteur et des signaux de gouvernance exposés par l’API.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="text-xs uppercase tracking-[0.28em] text-zinc-500">
              Total visible
            </div>
            <div className="mt-4 text-5xl font-semibold text-white">
              {capabilities.length}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Capacités exposées par /health
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="text-xs uppercase tracking-[0.28em] text-zinc-500">
              Health state
            </div>
            <div className={`mt-4 text-4xl font-semibold ${toneFromScore(score)}`}>
              {score}
            </div>
            <p className="mt-3 text-sm text-zinc-500">{healthLabel(score)}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="text-xs uppercase tracking-[0.28em] text-zinc-500">
              Policies
            </div>
            <div className="mt-4 text-5xl font-semibold text-white">
              {policyKeys.length}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Clés de gouvernance chargées
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-[#030712] p-6 sm:p-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Operational Snapshot
          </h2>
          <p className="mt-3 text-lg leading-8 text-zinc-400">
            Lecture instantanée du moteur BOSAI et des informations remontées par
            l’endpoint de santé.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm text-zinc-400">Worker</div>
            <div className="mt-4 text-2xl font-semibold text-white">
              {health?.worker || "—"}
            </div>
            <p className="mt-3 text-sm text-zinc-500">Instance active</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm text-zinc-400">Version</div>
            <div className="mt-4 text-2xl font-semibold text-white">
              {health?.version || "—"}
            </div>
            <p className="mt-3 text-sm text-zinc-500">Version du worker</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm text-zinc-400">App</div>
            <div className="mt-4 text-2xl font-semibold text-white">
              {health?.app || "—"}
            </div>
            <p className="mt-3 text-sm text-zinc-500">Service exposé</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <div className="text-sm text-zinc-400">Policies loaded</div>
            <div className="mt-4 text-2xl font-semibold text-white">
              {health?.policies_loaded ? "Oui" : "Non"}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Gouvernance chargée côté worker
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-[#030712] p-6 sm:p-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Available Capabilities
          </h2>
          <p className="mt-3 text-lg leading-8 text-zinc-400">
            Capacités actuellement déclarées par BOSAI Worker.
          </p>
        </div>

        {capabilities.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-zinc-500">
            Aucune capability visible pour le moment.
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {capabilities.map((capability) => (
              <article
                key={capability}
                className="rounded-3xl border border-white/10 bg-black/30 p-5"
              >
                <div className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                  Capability
                </div>
                <div className="mt-4 break-all font-mono text-xl text-white">
                  {capability}
                </div>
                <div className="mt-4 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                  Disponible
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[32px] border border-white/10 bg-[#030712] p-6 sm:p-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Health Issues
          </h2>
          <p className="mt-3 text-lg leading-8 text-zinc-400">
            Signaux remontés par /health/score.
          </p>
        </div>

        {issues.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-black/30 p-6">
            <div className="text-lg font-medium text-emerald-300">
              Aucun signal remonté
            </div>
            <p className="mt-2 text-zinc-500">
              Le worker ne signale aucun point particulier.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {issues.map((issue) => (
              <article
                key={issue}
                className="rounded-3xl border border-white/10 bg-black/30 p-5"
              >
                <div className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                  Signal
                </div>
                <div className="mt-4 break-all font-mono text-base text-white">
                  {issue}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[32px] border border-white/10 bg-[#030712] p-6 sm:p-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Policy Keys
          </h2>
          <p className="mt-3 text-lg leading-8 text-zinc-400">
            Liste des clés de policy visibles côté runtime.
          </p>
        </div>

        {policyKeys.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-zinc-500">
            Aucune policy key visible pour le moment.
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {policyKeys.map((policy) => (
              <article
                key={policy}
                className="rounded-3xl border border-white/10 bg-black/30 p-5"
              >
                <div className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                  Policy
                </div>
                <div className="mt-4 break-all font-mono text-base text-white">
                  {policy}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
