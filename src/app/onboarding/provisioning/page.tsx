import Link from "next/link";

type SearchParams = {
  plan?: string | string[];
};

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

type PlanTone = "default" | "recommended" | "custom";

type PlanConfig = {
  code: string;
  name: string;
  badge?: string;
  tone?: PlanTone;
  price: string;
  subtitle: string;
  provisioningLabel: string;
  workspaceMode: string;
};

function pageFrameClassName() {
  return "min-h-screen bg-[#050816] text-white";
}

function containerClassName() {
  return "mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14";
}

function sectionCardClassName() {
  return "rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-8";
}

function secondaryCardClassName() {
  return "rounded-[28px] border border-white/10 bg-black/20 p-5 md:p-6";
}

function eyebrowClassName() {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function badgeClassName(
  tone: PlanTone | "warning" | "info" | "success" | "default" = "default"
) {
  if (tone === "recommended") {
    return "inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300";
  }

  if (tone === "custom") {
    return "inline-flex rounded-full border border-violet-500/25 bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-300";
  }

  if (tone === "warning") {
    return "inline-flex rounded-full border border-amber-500/25 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300";
  }

  if (tone === "info") {
    return "inline-flex rounded-full border border-sky-500/25 bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-300";
  }

  if (tone === "success") {
    return "inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300";
  }

  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300";
}

function buttonClassName(
  variant: "primary" | "soft" | "danger" | "ghost" = "ghost",
  disabled = false
) {
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "danger") {
    return `${base} border border-rose-500/25 bg-rose-500/12 text-rose-200 hover:bg-rose-500/18`;
  }

  if (variant === "soft") {
    return `${base} border border-white/10 bg-black/20 text-zinc-200 hover:bg-white/[0.06]`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function planCardClassName(tone: PlanTone = "default") {
  if (tone === "recommended") {
    return "rounded-[30px] border border-emerald-500/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.10)_0%,rgba(255,255,255,0.04)_100%)] p-6 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]";
  }

  if (tone === "custom") {
    return "rounded-[30px] border border-violet-500/20 bg-[linear-gradient(180deg,rgba(139,92,246,0.10)_0%,rgba(255,255,255,0.04)_100%)] p-6";
  }

  return "rounded-[30px] border border-white/10 bg-white/[0.04] p-6";
}

function progressStepClassName(state: "done" | "active" | "idle") {
  if (state === "done") {
    return "border-emerald-500/25 bg-emerald-500/10";
  }

  if (state === "active") {
    return "border-sky-500/25 bg-sky-500/10";
  }

  return "border-white/10 bg-black/20";
}

function progressDotClassName(state: "done" | "active" | "idle") {
  if (state === "done") {
    return "border-emerald-500/30 bg-emerald-500/20 text-emerald-300";
  }

  if (state === "active") {
    return "border-sky-500/30 bg-sky-500/20 text-sky-300";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-400";
}

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

const plans: Record<string, PlanConfig> = {
  starter: {
    code: "starter",
    name: "Starter",
    badge: "Entrée",
    tone: "default",
    price: "À partir de XX€/mois",
    subtitle: "Lancer un premier espace BOSAI",
    provisioningLabel: "Provisioning simple",
    workspaceMode: "1 workspace essentiel",
  },
  pro: {
    code: "pro",
    name: "Pro",
    badge: "Recommandé",
    tone: "recommended",
    price: "À partir de XX€/mois",
    subtitle: "Passer à un vrai usage opérationnel",
    provisioningLabel: "Provisioning renforcé",
    workspaceMode: "Jusqu’à 3 workspaces",
  },
  agency: {
    code: "agency",
    name: "Agency",
    badge: "Multi-workspace",
    tone: "default",
    price: "À partir de XX€/mois",
    subtitle: "Piloter plusieurs espaces proprement",
    provisioningLabel: "Provisioning multi-espace",
    workspaceMode: "Mode agency / multi-client",
  },
  custom: {
    code: "custom",
    name: "Custom",
    badge: "Sur mesure",
    tone: "custom",
    price: "Sur devis",
    subtitle: "Construire une configuration dédiée",
    provisioningLabel: "Provisioning après cadrage",
    workspaceMode: "Workspace sur mesure",
  },
};

const provisioningSteps = [
  {
    step: "1",
    title: "Plan validé",
    description: "Le plan devient la base officielle du futur espace.",
    state: "done" as const,
  },
  {
    step: "2",
    title: "Provisioning",
    description: "Le système prépare le cadre technique et produit.",
    state: "active" as const,
  },
  {
    step: "3",
    title: "Workspace setup",
    description: "Le nom, le type d’usage et les préférences seront définis ensuite.",
    state: "idle" as const,
  },
  {
    step: "4",
    title: "Cockpit activation",
    description: "L’accès s’ouvre quand le workspace est prêt et actif.",
    state: "idle" as const,
  },
];

export default async function OnboardingProvisioningPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const planCode = firstParam(resolvedSearchParams.plan).trim().toLowerCase();
  const selectedPlan = plans[planCode] ?? null;

  const hasValidPlan = selectedPlan !== null;
  const continueHref = hasValidPlan
    ? `/onboarding/continue?step=provisioning&plan=${selectedPlan.code}`
    : "";
  const checkoutHref = hasValidPlan
    ? `/onboarding/checkout?plan=${selectedPlan.code}`
    : "/onboarding/checkout";

  return (
    <div className={pageFrameClassName()}>
      <main className={containerClassName()}>
        <div className="space-y-10">
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className={sectionCardClassName()}>
              <div className={eyebrowClassName()}>BOSAI provisioning</div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={badgeClassName("info")}>Workspace preparation</span>
                <span className={badgeClassName("warning")}>Cockpit still locked</span>
                {hasValidPlan ? (
                  <span className={badgeClassName(selectedPlan.tone)}>
                    Plan {selectedPlan.name}
                  </span>
                ) : (
                  <span className={badgeClassName()}>No plan context</span>
                )}
              </div>

              <div className="mt-6 max-w-4xl">
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl xl:text-[3.2rem]">
                  {hasValidPlan
                    ? `Préparation de votre espace ${selectedPlan.name}`
                    : "Aucun plan disponible pour le provisioning"}
                </h1>

                <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-300">
                  {hasValidPlan
                    ? "Le plan est validé. BOSAI prépare maintenant le cadre de votre futur workspace avant l’étape de configuration."
                    : "Le provisioning nécessite un plan valide. Revenez à l’étape précédente pour sélectionner puis valider une offre."}
                </p>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500">
                  Cette étape représente le sas entre la validation commerciale et la création exploitable du workspace.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {hasValidPlan ? (
                  <Link href={continueHref} className={buttonClassName("primary")}>
                    Continuer vers le workspace
                  </Link>
                ) : (
                  <span className={buttonClassName("primary", true)}>
                    Plan requis
                  </span>
                )}

                <Link href={checkoutHref} className={buttonClassName("soft")}>
                  Retour checkout
                </Link>
              </div>
            </div>

            <div className={sectionCardClassName()}>
              <div className={eyebrowClassName()}>État système</div>

              <div className="mt-5 space-y-4">
                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Account status</div>
                  <div className="mt-2 text-2xl font-semibold text-sky-300">
                    {hasValidPlan ? "provisioning_pending" : "plan_missing"}
                  </div>
                </div>

                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Plan</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {hasValidPlan ? selectedPlan.name : "Non défini"}
                  </div>
                </div>

                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Workspace status</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {hasValidPlan ? "provisioning" : "non créé"}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                  <div className={metaLabelClassName()}>Pourquoi cette étape</div>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">
                    BOSAI prépare d’abord le bon cadre produit avant d’exposer un cockpit ou un workspace incomplet.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {hasValidPlan ? (
            <>
              <section className={sectionCardClassName()}>
                <div className="max-w-3xl">
                  <div className={eyebrowClassName()}>Contexte plan</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Paramètres de provisioning retenus
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
                    Le plan choisi détermine maintenant le cadre du workspace qui sera configuré à l’étape suivante.
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.8fr]">
                  <article className={planCardClassName(selectedPlan.tone)}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-2xl font-semibold tracking-tight text-white">
                        {selectedPlan.name}
                      </h3>
                      {selectedPlan.badge ? (
                        <span className={badgeClassName(selectedPlan.tone)}>
                          {selectedPlan.badge}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-5 text-lg font-medium text-white">
                      {selectedPlan.price}
                    </div>
                    <div className="mt-2 text-sm font-medium text-zinc-200">
                      {selectedPlan.subtitle}
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3">
                      <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className={metaLabelClassName()}>Provisioning mode</div>
                        <div className="mt-2 text-sm text-zinc-300">
                          {selectedPlan.provisioningLabel}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className={metaLabelClassName()}>Workspace scope</div>
                        <div className="mt-2 text-sm text-zinc-300">
                          {selectedPlan.workspaceMode}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className={metaLabelClassName()}>Next route</div>
                        <div className="mt-2 break-all text-sm text-zinc-300">
                          {continueHref}
                        </div>
                      </div>
                    </div>
                  </article>

                  <div className="space-y-4">
                    <div className={secondaryCardClassName()}>
                      <div className={metaLabelClassName()}>Plan code</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {selectedPlan.code}
                      </div>
                    </div>

                    <div className={secondaryCardClassName()}>
                      <div className={metaLabelClassName()}>Workspace creation</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        En attente de configuration finale
                      </div>
                    </div>

                    <div className={secondaryCardClassName()}>
                      <div className={metaLabelClassName()}>Cockpit access</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        Bloqué jusqu’à activation
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                      <div className={metaLabelClassName()}>Lecture produit</div>
                      <p className="mt-2 text-sm leading-7 text-zinc-400">
                        Cette page matérialise le statut intermédiaire entre la souscription et le workspace réellement exploitable.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className={sectionCardClassName()}>
                <div className="max-w-3xl">
                  <div className={eyebrowClassName()}>Progression</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                    Cycle BOSAI en cours
                  </h2>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {provisioningSteps.map((item) => (
                    <div
                      key={item.step}
                      className={`rounded-[28px] border p-5 md:p-6 ${progressStepClassName(
                        item.state
                      )}`}
                    >
                      <div
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${progressDotClassName(
                          item.state
                        )}`}
                      >
                        {item.step}
                      </div>

                      <div className="mt-4 text-lg font-medium text-white">
                        {item.title}
                      </div>

                      <p className="mt-3 text-sm leading-7 text-zinc-400">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div className={sectionCardClassName()}>
                  <div className={eyebrowClassName()}>Repères</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                    Ce que BOSAI prépare ici
                  </h2>

                  <div className="mt-6 space-y-4">
                    <div className={secondaryCardClassName()}>
                      <div className={metaLabelClassName()}>Cadre commercial</div>
                      <p className="mt-2 text-sm leading-7 text-zinc-400">
                        Le plan validé devient la base du workspace à créer.
                      </p>
                    </div>

                    <div className={secondaryCardClassName()}>
                      <div className={metaLabelClassName()}>Cadre produit</div>
                      <p className="mt-2 text-sm leading-7 text-zinc-400">
                        BOSAI retarde l’accès cockpit pour éviter un espace vide ou incohérent.
                      </p>
                    </div>

                    <div className={secondaryCardClassName()}>
                      <div className={metaLabelClassName()}>Étape suivante</div>
                      <p className="mt-2 text-sm leading-7 text-zinc-400">
                        Le workspace sera nommé, typé et finalisé avant activation.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={sectionCardClassName()}>
                  <div className={eyebrowClassName()}>Actions</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                    Continuer ou revenir en arrière
                  </h2>

                  <div className="mt-6 space-y-4">
                    <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                      <div className={metaLabelClassName()}>Recommandation</div>
                      <p className="mt-2 text-sm leading-7 text-zinc-400">
                        Continue vers la configuration du workspace pour terminer l’activation du parcours commercial v1.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Link href={continueHref} className={buttonClassName("primary")}>
                        Continuer vers le workspace
                      </Link>

                      <Link href={checkoutHref} className={buttonClassName("soft")}>
                        Retour checkout
                      </Link>

                      <Link href="/onboarding/plan" className={buttonClassName("ghost")}>
                        Changer de plan
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className={sectionCardClassName()}>
              <div className="max-w-3xl">
                <div className={eyebrowClassName()}>Action requise</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  Plan manquant pour le provisioning
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
                  Cette page attend un paramètre `plan`. Retourne au checkout ou au choix du plan pour continuer le flux BOSAI correctement.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/onboarding/plan" className={buttonClassName("primary")}>
                  Aller au choix du plan
                </Link>
                <Link href="/pricing" className={buttonClassName("soft")}>
                  Revoir pricing
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
