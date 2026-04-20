import Link from "next/link";

type PlanTone = "default" | "recommended" | "custom";

type Plan = {
  code: string;
  name: string;
  badge?: string;
  tone?: PlanTone;
  subtitle: string;
  description: string;
  price: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
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

function badgeClassName(tone: PlanTone | "warning" | "info" | "default" = "default") {
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
  variant: "primary" | "soft" | "danger" | "ghost" = "ghost"
) {
  if (variant === "primary") {
    return "inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-5 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "danger") {
    return "inline-flex items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/12 px-5 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/18";
  }

  if (variant === "soft") {
    return "inline-flex items-center justify-center rounded-full border border-white/10 bg-black/20 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.06]";
  }

  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

const plans: Plan[] = [
  {
    code: "starter",
    name: "Starter",
    badge: "Entrée",
    tone: "default",
    subtitle: "Lancer un premier espace BOSAI",
    description:
      "Pour découvrir BOSAI ou lancer un usage simple avec un cadre propre.",
    price: "À partir de XX€/mois",
    features: [
      "1 workspace",
      "Cockpit essentiel",
      "Supervision standard",
      "Lecture claire des signaux principaux",
      "Bon point d’entrée pour solo",
    ],
    ctaLabel: "Choisir Starter",
    ctaHref: "/onboarding/checkout?plan=starter",
  },
  {
    code: "pro",
    name: "Pro",
    badge: "Recommandé",
    tone: "recommended",
    subtitle: "Passer à un vrai usage opérationnel",
    description:
      "Pour freelances avancés, opérateurs sérieux et petites structures.",
    price: "À partir de XX€/mois",
    features: [
      "Jusqu’à 3 workspaces",
      "Cockpit complet",
      "Capacité renforcée",
      "Supervision active plus large",
      "Meilleur équilibre produit",
    ],
    ctaLabel: "Choisir Pro",
    ctaHref: "/onboarding/checkout?plan=pro",
  },
  {
    code: "agency",
    name: "Agency",
    badge: "Multi-workspace",
    tone: "default",
    subtitle: "Piloter plusieurs espaces proprement",
    description:
      "Pour agences, studios ou structures qui séparent plusieurs contextes.",
    price: "À partir de XX€/mois",
    features: [
      "Multi-workspace natif",
      "Séparation client / tenant",
      "Capacité étendue",
      "Pilotage plus large",
      "Pensé pour usage multi-client",
    ],
    ctaLabel: "Choisir Agency",
    ctaHref: "/onboarding/checkout?plan=agency",
  },
  {
    code: "custom",
    name: "Custom",
    badge: "Sur mesure",
    tone: "custom",
    subtitle: "Construire une configuration dédiée",
    description:
      "Pour besoin spécifique, architecture adaptée ou accompagnement dédié.",
    price: "Sur devis",
    features: [
      "Configuration sur mesure",
      "Règles spécifiques",
      "Architecture adaptée",
      "Accompagnement dédié",
      "Cadrage personnalisé",
    ],
    ctaLabel: "Demander une configuration",
    ctaHref: "/onboarding/checkout?plan=custom",
  },
];

const nextSteps = [
  {
    step: "1",
    title: "Choisissez votre plan",
    description: "Sélectionnez la structure BOSAI adaptée à votre usage.",
  },
  {
    step: "2",
    title: "Validez votre souscription",
    description: "Le plan est enregistré avant ouverture de l’espace.",
  },
  {
    step: "3",
    title: "Provisioning du workspace",
    description: "Votre espace est préparé avec le bon cadre produit.",
  },
  {
    step: "4",
    title: "Configuration initiale",
    description: "Vous nommez et finalisez le workspace avant accès cockpit.",
  },
];

export default function OnboardingPlanPage() {
  return (
    <div className={pageFrameClassName()}>
      <main className={containerClassName()}>
        <div className="space-y-10">
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className={sectionCardClassName()}>
              <div className={eyebrowClassName()}>BOSAI onboarding</div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={badgeClassName("warning")}>Aucun plan actif</span>
                <span className={badgeClassName("info")}>Cockpit verrouillé</span>
                <span className={badgeClassName()}>Workspace non provisionné</span>
              </div>

              <div className="mt-6 max-w-4xl">
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl xl:text-[3.35rem]">
                  Choisissez votre plan avant d’ouvrir votre espace BOSAI
                </h1>

                <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-300">
                  Votre compte est prêt, mais aucun workspace actif n’est encore
                  associé à votre profil. Sélectionnez maintenant le plan adapté
                  pour lancer le provisioning.
                </p>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500">
                  Le cockpit n’est accessible qu’après validation du plan,
                  préparation de l’espace et configuration initiale.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="#plans" className={buttonClassName("primary")}>
                  Choisir mon plan
                </Link>
                <Link href="/pricing" className={buttonClassName("soft")}>
                  Revoir les offres
                </Link>
              </div>
            </div>

            <div className={sectionCardClassName()}>
              <div className={eyebrowClassName()}>État du compte</div>

              <div className="mt-5 space-y-4">
                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Statut</div>
                  <div className="mt-2 text-2xl font-semibold text-amber-300">
                    authenticated_no_plan
                  </div>
                </div>

                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Plan</div>
                  <div className="mt-2 text-xl font-semibold text-white">Aucun plan actif</div>
                </div>

                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Workspace</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    Non créé / non activé
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                  <div className={metaLabelClassName()}>Pourquoi cet écran</div>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">
                    BOSAI évite désormais l’ouverture directe d’un espace vide.
                    Le plan détermine le cadre de provisioning avant l’accès au cockpit.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="plans" className={sectionCardClassName()}>
            <div className="max-w-3xl">
              <div className={eyebrowClassName()}>Choix du plan</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Sélectionnez la structure BOSAI adaptée à votre usage
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
                Vous pourrez ensuite continuer vers la validation, le provisioning
                puis la configuration initiale de votre workspace.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-4">
              {plans.map((plan) => (
                <article key={plan.code} className={planCardClassName(plan.tone)}>
                  <div className="flex min-h-full flex-col">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-2xl font-semibold tracking-tight text-white">
                        {plan.name}
                      </h3>
                      {plan.badge ? (
                        <span className={badgeClassName(plan.tone)}>{plan.badge}</span>
                      ) : null}
                    </div>

                    <div className="mt-5 text-lg font-medium text-white">{plan.price}</div>
                    <div className="mt-2 text-sm font-medium text-zinc-200">
                      {plan.subtitle}
                    </div>
                    <p className="mt-4 text-sm leading-7 text-zinc-400">
                      {plan.description}
                    </p>

                    <div className="mt-6 space-y-3">
                      {plan.features.map((feature) => (
                        <div
                          key={`${plan.code}-${feature}`}
                          className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300"
                        >
                          {feature}
                        </div>
                      ))}
                    </div>

                    <div className="mt-6">
                      <Link
                        href={plan.ctaHref}
                        className={buttonClassName(
                          plan.tone === "custom"
                            ? "danger"
                            : plan.tone === "recommended"
                              ? "primary"
                              : "soft"
                        )}
                      >
                        {plan.ctaLabel}
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={sectionCardClassName()}>
            <div className="max-w-3xl">
              <div className={eyebrowClassName()}>Ce qui se passe ensuite</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Le flux BOSAI après sélection du plan
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
                Le choix du plan ouvre ensuite le vrai cycle produit : validation,
                provisioning, configuration du workspace puis cockpit.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {nextSteps.map((item) => (
                <div key={item.step} className={secondaryCardClassName()}>
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-white">
                    {item.step}
                  </div>
                  <div className="mt-4 text-lg font-medium text-white">{item.title}</div>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className={sectionCardClassName()}>
              <div className={eyebrowClassName()}>Repères</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Rappel produit
              </h2>

              <div className="mt-6 space-y-4">
                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Règle 1</div>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">
                    Un utilisateur peut exister sans workspace actif.
                  </p>
                </div>

                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Règle 2</div>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">
                    Aucun cockpit ne s’ouvre tant qu’aucun plan actif n’est validé.
                  </p>
                </div>

                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Règle 3</div>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">
                    Le workspace est créé puis activé seulement après provisioning.
                  </p>
                </div>
              </div>
            </div>

            <div className={sectionCardClassName()}>
              <div className={eyebrowClassName()}>Actions</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Besoin d’un autre point d’entrée
              </h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                  <div className={metaLabelClassName()}>Comparer à nouveau</div>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">
                    Revenir à la page pricing si tu veux relire les offres dans leur format
                    marketing complet.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <Link href="/pricing" className={buttonClassName("soft")}>
                    Retour à pricing
                  </Link>

                  <Link href="#plans" className={buttonClassName("primary")}>
                    Aller aux plans
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
