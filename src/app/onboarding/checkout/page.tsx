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
  description: string;
  features: string[];
  checkoutLabel: string;
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

function planCardClassName(tone: PlanTone = "default") {
  if (tone === "recommended") {
    return "rounded-[30px] border border-emerald-500/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.10)_0%,rgba(255,255,255,0.04)_100%)] p-6 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]";
  }

  if (tone === "custom") {
    return "rounded-[30px] border border-violet-500/20 bg-[linear-gradient(180deg,rgba(139,92,246,0.10)_0%,rgba(255,255,255,0.04)_100%)] p-6";
  }

  return "rounded-[30px] border border-white/10 bg-white/[0.04] p-6";
}

function eyebrowClassName() {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName() {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function badgeClassName(
  tone: PlanTone | "warning" | "info" | "default" = "default"
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
    description:
      "Pour découvrir BOSAI ou lancer un usage simple avec un cadre propre.",
    features: [
      "1 workspace",
      "Cockpit essentiel",
      "Supervision standard",
      "Lecture claire des signaux principaux",
      "Provisioning simple",
    ],
    checkoutLabel: "Continuer avec Starter",
  },
  pro: {
    code: "pro",
    name: "Pro",
    badge: "Recommandé",
    tone: "recommended",
    price: "À partir de XX€/mois",
    subtitle: "Passer à un vrai usage opérationnel",
    description:
      "Pour freelances avancés, opérateurs sérieux et petites structures.",
    features: [
      "Jusqu’à 3 workspaces",
      "Cockpit complet",
      "Capacité renforcée",
      "Supervision active plus large",
      "Provisioning prioritaire produit",
    ],
    checkoutLabel: "Continuer avec Pro",
  },
  agency: {
    code: "agency",
    name: "Agency",
    badge: "Multi-workspace",
    tone: "default",
    price: "À partir de XX€/mois",
    subtitle: "Piloter plusieurs espaces proprement",
    description:
      "Pour agences, studios ou structures qui séparent plusieurs contextes.",
    features: [
      "Multi-workspace natif",
      "Séparation client / tenant",
      "Capacité étendue",
      "Pilotage plus large",
      "Provisioning orienté multi-espace",
    ],
    checkoutLabel: "Continuer avec Agency",
  },
  custom: {
    code: "custom",
    name: "Custom",
    badge: "Sur mesure",
    tone: "custom",
    price: "Sur devis",
    subtitle: "Construire une configuration dédiée",
    description:
      "Pour besoin spécifique, architecture adaptée ou accompagnement dédié.",
    features: [
      "Configuration sur mesure",
      "Règles spécifiques",
      "Architecture adaptée",
      "Accompagnement dédié",
      "Provisioning après cadrage",
    ],
    checkoutLabel: "Envoyer ma demande",
  },
};

export default async function OnboardingCheckoutPage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const planCode = firstParam(resolvedSearchParams.plan).trim().toLowerCase();
  const selectedPlan = plans[planCode] ?? null;

  const fallbackHref = "/onboarding/plan";
  const hasValidPlan = selectedPlan !== null;
  const continueHref = hasValidPlan
    ? `/onboarding/continue?step=checkout&plan=${selectedPlan.code}`
    : "";

  return (
    <div className={pageFrameClassName()}>
      <main className={containerClassName()}>
        <div className="space-y-10">
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className={sectionCardClassName()}>
              <div className={eyebrowClassName()}>BOSAI checkout</div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={badgeClassName("info")}>Plan selection</span>
                <span className={badgeClassName("warning")}>Provisioning next</span>
                <span className={badgeClassName()}>Cockpit still locked</span>
              </div>

              <div className="mt-6 max-w-4xl">
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl xl:text-[3.2rem]">
                  {hasValidPlan
                    ? `Validation du plan ${selectedPlan.name}`
                    : "Aucun plan sélectionné"}
                </h1>

                <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-300">
                  {hasValidPlan
                    ? "Cette étape sert à confirmer le plan choisi avant de passer au provisioning de votre espace BOSAI."
                    : "Vous devez d’abord choisir un plan avant de continuer vers le provisioning de votre espace."}
                </p>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500">
                  Le cockpit reste fermé tant que le plan n’est pas validé puis relié à un workspace prêt à être activé.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {hasValidPlan ? (
                  <Link
                    href={continueHref}
                    className={buttonClassName(
                      selectedPlan.tone === "custom" ? "danger" : "primary"
                    )}
                  >
                    {selectedPlan.checkoutLabel}
                  </Link>
                ) : (
                  <span className={buttonClassName("primary", true)}>
                    Choisissez d’abord un plan
                  </span>
                )}

                <Link href={fallbackHref} className={buttonClassName("soft")}>
                  Retour au choix du plan
                </Link>
              </div>
            </div>

            <div className={sectionCardClassName()}>
              <div className={eyebrowClassName()}>État actuel</div>

              <div className="mt-5 space-y-4">
                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Account status</div>
                  <div className="mt-2 text-2xl font-semibold text-amber-300">
                    {hasValidPlan ? "plan_selected" : "authenticated_no_plan"}
                  </div>
                </div>

                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Plan ciblé</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {hasValidPlan ? selectedPlan.name : "Non défini"}
                  </div>
                </div>

                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Étape suivante</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {hasValidPlan ? "Provisioning du workspace" : "Retour au choix du plan"}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                  <div className={metaLabelClassName()}>Rôle de cette étape</div>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">
                    Cette page valide le cadre commercial choisi avant la création effective du workspace.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {hasValidPlan ? (
            <>
              <section className={sectionCardClassName()}>
                <div className="max-w-3xl">
                  <div className={eyebrowClassName()}>Plan sélectionné</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Récapitulatif avant provisioning
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
                    Vous allez maintenant confirmer le cadre de départ qui servira à créer votre futur espace BOSAI.
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
                    <p className="mt-4 text-sm leading-7 text-zinc-400">
                      {selectedPlan.description}
                    </p>

                    <div className="mt-6 space-y-3">
                      {selectedPlan.features.map((feature) => (
                        <div
                          key={`${selectedPlan.code}-${feature}`}
                          className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300"
                        >
                          {feature}
                        </div>
                      ))}
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
                      <div className={metaLabelClassName()}>Accès cockpit</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        Après provisioning et activation
                      </div>
                    </div>

                    <div className={secondaryCardClassName()}>
                      <div className={metaLabelClassName()}>Workspace</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        Pas encore créé
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                      <div className={metaLabelClassName()}>Validation</div>
                      <p className="mt-2 text-sm leading-7 text-zinc-400">
                        À ce stade, vous confirmez le plan. La prochaine étape écrit l’état checkout puis ouvre le provisioning.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className={sectionCardClassName()}>
                <div className="max-w-3xl">
                  <div className={eyebrowClassName()}>Cycle suivant</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                    Ce qui arrive juste après
                  </h2>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    [
                      "1",
                      "Plan validé",
                      "Le choix du plan devient la base officielle du futur workspace.",
                    ],
                    [
                      "2",
                      "Checkout confirmé",
                      "Le système enregistre la validation commerciale du plan.",
                    ],
                    [
                      "3",
                      "Provisioning",
                      "Le workspace entre dans sa phase de préparation.",
                    ],
                    [
                      "4",
                      "Cockpit plus tard",
                      "L’accès ne s’ouvre qu’après activation finale.",
                    ],
                  ].map(([step, title, desc]) => (
                    <div key={step} className={secondaryCardClassName()}>
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-white">
                        {step}
                      </div>
                      <div className="mt-4 text-lg font-medium text-white">{title}</div>
                      <p className="mt-3 text-sm leading-7 text-zinc-400">{desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className={sectionCardClassName()}>
                <div className="max-w-3xl">
                  <div className={eyebrowClassName()}>Actions</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                    Continuer ou ajuster votre choix
                  </h2>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={continueHref}
                    className={buttonClassName(
                      selectedPlan.tone === "custom" ? "danger" : "primary"
                    )}
                  >
                    {selectedPlan.checkoutLabel}
                  </Link>

                  <Link href="/onboarding/plan" className={buttonClassName("soft")}>
                    Changer de plan
                  </Link>

                  <Link href="/pricing" className={buttonClassName("ghost")}>
                    Revoir pricing
                  </Link>
                </div>
              </section>
            </>
          ) : (
            <section className={sectionCardClassName()}>
              <div className="max-w-3xl">
                <div className={eyebrowClassName()}>Action requise</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  Sélectionnez un plan pour continuer
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
                  Cette page attend un paramètre `plan`. Retournez à l’étape précédente pour sélectionner Starter, Pro, Agency ou Custom.
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
