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

export default async function PoliciesPage() {
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

  const schedulerEnabled = issues.includes("scheduler_secret_enabled");
  const signatureEnabled = issues.includes("signature_enabled");
  const toolcatalogEnforced = issues.includes("toolcatalog_http_exec_enforced");
  const policiesLoaded = Boolean(health?.policies_loaded);

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-cyan-950/60 bg-[radial-gradient(circle_at_top,rgba(8,47,73,0.35),rgba(2,6,23,0.98)_58%)] p-6 sm:p-8">
        <div className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.35em] text-emerald-300">
          Policies V2
        </div>

        <div className="mt-6 max-w-4xl">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Policies
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-zinc-400 sm:text-lg">
            Vue de gouvernance BOSAI. Cette page rassemble les signaux de
            sécurité, les protections actives, le chargement des policies et les
            garde-fous visibles côté worker.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-zinc-800 bg-black/30 p-6">
            <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              Policies loaded
            </div>
            <div className="mt-4 text-4xl font-semibold text-white">
              {policiesLoaded ? "Oui" : "Non"}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              État du chargement des règles dynamiques côté worker.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-black/30 p-6">
            <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              Total policies
            </div>
            <div className="mt-4 text-4xl font-semibold text-white">
              {policyKeys.length}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Clés de policy exposées par l’endpoint health.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-black/30 p-6">
            <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              Health state
            </div>
            <div className={`mt-4 text-4xl font-semibold ${toneFromScore(score)}`}>
              {healthLabel(score)}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Lecture synthétique de l’état global de gouvernance.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-black/30 p-6">
            <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              Policy signals
            </div>
            <div className="mt-4 text-4xl font-semibold text-white">
              {issues.length}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Signaux actifs remontés par le worker.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-cyan-950/60 bg-[radial-gradient(circle_at_top,rgba(8,47,73,0.22),rgba(2,6,23,0.98)_58%)] p-6 sm:p-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Operational Snapshot
          </h2>
          <p className="mt-3 text-base leading-8 text-zinc-400">
            Lecture instantanée des protections visibles et des mécanismes de
            gouvernance actuellement actifs.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">Scheduler secret</div>
            <div className="mt-4 text-5xl font-semibold text-white">
              {schedulerEnabled ? "On" : "Off"}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Protection d’accès scheduler pour les déclenchements backend.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">Run signature</div>
            <div className="mt-4 text-5xl font-semibold text-white">
              {signatureEnabled ? "On" : "Off"}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Vérification HMAC disponible pour les appels signés.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">ToolCatalog</div>
            <div className="mt-4 text-5xl font-semibold text-white">
              {toolcatalogEnforced ? "On" : "Off"}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Contrôle des exécutions http_exec via gouvernance catalogue.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-black/30 p-6">
            <div className="text-sm text-zinc-400">Capabilities</div>
            <div className="mt-4 text-5xl font-semibold text-white">
              {capabilities.length}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Capacités actuellement exposées par le worker actif.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[32px] border border-zinc-800 bg-zinc-950/80 p-6 sm:p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Active Signals
          </h2>
          <p className="mt-3 text-base leading-8 text-zinc-400">
            Signaux retournés par <code>/health/score</code>. Ils indiquent les
            contrôles et drapeaux actifs au niveau du moteur.
          </p>

          <div className="mt-8 space-y-3">
            {issues.length > 0 ? (
              issues.map((issue) => (
                <div
                  key={issue}
                  className="rounded-2xl border border-zinc-800 bg-black/30 px-5 py-4 text-sm text-zinc-200"
                >
                  {issue}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 px-5 py-6 text-sm text-zinc-500">
                Aucun signal actif visible pour le moment.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-zinc-800 bg-zinc-950/80 p-6 sm:p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Policy Keys
          </h2>
          <p className="mt-3 text-base leading-8 text-zinc-400">
            Clés remontées par le worker pour piloter les limites, approbations
            et garde-fous opérationnels.
          </p>

          <div className="mt-8 space-y-3">
            {policyKeys.length > 0 ? (
              policyKeys.map((policyKey) => (
                <div
                  key={policyKey}
                  className="rounded-2xl border border-zinc-800 bg-black/30 px-5 py-4 text-sm text-zinc-200"
                >
                  {policyKey}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 px-5 py-6 text-sm text-zinc-500">
                Aucune policy dynamique visible pour le moment.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-800 bg-zinc-950/80 p-6 sm:p-8">
        <h2 className="text-3xl font-semibold tracking-tight text-white">
          Worker Governance
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-8 text-zinc-400">
          Référentiel synthétique des protections connues depuis les endpoints
          worker. Cette section permet une lecture rapide sans ouvrir les logs.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-3xl border border-zinc-800 bg-black/30 p-6">
            <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              Worker
            </div>
            <div className="mt-4 text-2xl font-semibold text-white">
              {health?.worker ?? "—"}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Instance exposée actuellement par le backend BOSAI.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-black/30 p-6">
            <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              App version
            </div>
            <div className="mt-4 text-2xl font-semibold text-white">
              {health?.version ?? "—"}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Version visible du worker connectée au dashboard.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-black/30 p-6">
            <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              App name
            </div>
            <div className="mt-4 text-2xl font-semibold text-white">
              {health?.app ?? "—"}
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              Service source utilisé pour la lecture des policies.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
