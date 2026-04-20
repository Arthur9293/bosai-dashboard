import Link from "next/link";

type Plan = {
  name: string;
  badge?: string;
  price: string;
  subtitle: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  tone?: "default" | "recommended" | "custom";
};

type FaqItem = {
  question: string;
  answer: string;
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

function paragraphClassName() {
  return "text-base leading-8 text-zinc-400";
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

function badgeClassName(
  tone: "default" | "recommended" | "custom" = "default"
) {
  if (tone === "recommended") {
    return "inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300";
  }

  if (tone === "custom") {
    return "inline-flex rounded-full border border-violet-500/25 bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-300";
  }

  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300";
}

function planCardClassName(tone: "default" | "recommended" | "custom" = "default") {
  if (tone === "recommended") {
    return "rounded-[30px] border border-emerald-500/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.10)_0%,rgba(255,255,255,0.04)_100%)] p-6 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]";
  }

  if (tone === "custom") {
    return "rounded-[30px] border border-violet-500/20 bg-[linear-gradient(180deg,rgba(139,92,246,0.10)_0%,rgba(255,255,255,0.04)_100%)] p-6";
  }

  return "rounded-[30px] border border-white/10 bg-white/[0.04] p-6";
}

const plans: Plan[] = [
  {
    name: "Starter",
    badge: "Entrée",
    price: "À partir de XX€/mois",
    subtitle: "Lancer un premier espace BOSAI",
    description:
      "Pour découvrir BOSAI ou structurer un premier usage avec un cockpit simple et propre.",
    features: [
      "1 workspace",
      "Cockpit essentiel",
      "Supervision standard",
      "Lecture claire des signaux principaux",
      "Support standard",
    ],
    ctaLabel: "Commencer avec Starter",
    ctaHref: "/login?next=%2Fonboarding%2Fplan",
    tone: "default",
  },
  {
    name: "Pro",
    badge: "Recommandé",
    price: "À partir de XX€/mois",
    subtitle: "Passer à un vrai usage opérationnel",
    description:
      "Pour les freelances avancés, opérateurs sérieux et petites structures qui veulent un cockpit complet.",
    features: [
      "Jusqu’à 3 workspaces",
      "Cockpit complet",
      "Capacité renforcée",
      "Supervision active plus large",
      "Exploitation plus poussée",
    ],
    ctaLabel: "Choisir Pro",
    ctaHref: "/login?next=%2Fonboarding%2Fplan",
    tone: "recommended",
  },
  {
    name: "Agency",
    badge: "Multi-workspace",
    price: "À partir de XX€/mois",
    subtitle: "Piloter plusieurs espaces proprement",
    description:
      "Pour agences, studios ou structures qui ont besoin d’un cadre clair par client ou par environnement.",
    features: [
      "Multi-workspace natif",
      "Séparation par client ou tenant",
      "Capacité étendue",
      "Supervision multi-espace",
      "Pilotage plus large",
    ],
    ctaLabel: "Choisir Agency",
    ctaHref: "/login?next=%2Fonboarding%2Fplan",
    tone: "default",
  },
  {
    name: "Custom",
    badge: "Sur mesure",
    price: "Sur devis",
    subtitle: "Construire une configuration dédiée",
    description:
      "Pour besoin spécifique, structure avancée ou accompagnement dédié avec configuration adaptée.",
    features: [
      "Configuration sur mesure",
      "Règles spécifiques",
      "Architecture adaptée",
      "Accompagnement dédié",
      "Cadrage personnalisé",
    ],
    ctaLabel: "Demander une configuration",
    ctaHref: "/login?next=%2Fonboarding%2Fplan",
    tone: "custom",
  },
];

const faqs: FaqItem[] = [
  {
    question: "Quand mon workspace est-il créé ?",
    answer:
      "Le workspace est créé après choix du plan puis étape de provisioning. Il n’est pas ouvert automatiquement au moment du login.",
  },
  {
    question: "Ai-je accès au cockpit immédiatement après inscription ?",
    answer:
      "Non. L’accès au cockpit s’ouvre une fois le plan validé et l’espace préparé.",
  },
  {
    question: "Puis-je changer de plan plus tard ?",
    answer:
      "Oui. Le changement de plan fait partie du cycle normal du produit.",
  },
  {
    question: "Puis-je avoir plusieurs workspaces ?",
    answer:
      "Oui, selon le plan choisi. Starter reste simple, Agency et Custom sont pensés pour aller plus loin.",
  },
  {
    question: "Comment fonctionne le plan Custom ?",
    answer:
      "Le plan Custom passe par une demande dédiée avant configuration et provisioning.",
  },
];

const comparisonRows = [
  {
    label: "Workspaces",
    starter: "1",
    pro: "Jusqu’à 3",
    agency: "Multi",
    custom: "Sur mesure",
  },
  {
    label: "Niveau cockpit",
    starter: "Essentiel",
    pro: "Complet",
    agency: "Étendu",
    custom: "Adapté",
  },
  {
    label: "Volume",
    starter: "Standard",
    pro: "Renforcé",
    agency: "Élevé",
    custom: "Variable",
  },
  {
    label: "Multi-client",
    starter: "Non",
    pro: "Limité",
    agency: "Oui",
    custom: "Oui",
  },
  {
    label: "Accompagnement",
    starter: "Standard",
    pro: "Renforcé",
    agency: "Prioritaire",
    custom: "Dédié",
  },
  {
    label: "Setup spécifique",
    starter: "Non",
    pro: "Non",
    agency: "Partiel",
    custom: "Oui",
  },
];

export default function PricingPage() {
  return (
    <div className={pageFrameClassName()}>
      <main className={containerClassName()}>
        <div className="space-y-10">
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className={sectionCardClassName()}>
              <div className={eyebrowClassName()}>BOSAI Control Plane</div>

              <div className="mt-5 max-w-4xl">
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl xl:text-[3.5rem]">
                  Le cockpit intelligent pour surveiller, sécuriser et piloter vos opérations
                </h1>

                <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-300">
                  BOSAI centralise vos signaux, vos incidents, vos flows, vos commands et vos SLA
                  dans un espace clair, structuré et prêt à évoluer avec votre activité.
                </p>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500">
                  Votre accès au cockpit s’active après choix du plan et préparation de votre
                  espace de travail.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="#plans" className={buttonClassName("primary")}>
                  Choisir un plan
                </Link>
                <Link href="#comparison" className={buttonClassName("soft")}>
                  Voir les offres
                </Link>
              </div>
            </div>

            <div className={sectionCardClassName()}>
              <div className="flex flex-wrap gap-2">
                <span className={badgeClassName("recommended")}>Provisioning required</span>
                <span className={badgeClassName()}>Workspace gated</span>
              </div>

              <div className="mt-5">
                <div className="text-2xl font-semibold tracking-tight text-white">
                  Lecture premium du produit
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Avant l’ouverture du cockpit, BOSAI passe par un choix d’offre, une préparation
                  d’espace puis un onboarding propre.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Flows</div>
                  <div className="mt-2 text-2xl font-semibold text-sky-300">Sous contrôle</div>
                </div>
                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Incidents</div>
                  <div className="mt-2 text-2xl font-semibold text-rose-300">Liés au contexte</div>
                </div>
                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Commands</div>
                  <div className="mt-2 text-2xl font-semibold text-violet-300">Pilotables</div>
                </div>
                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>SLA</div>
                  <div className="mt-2 text-2xl font-semibold text-emerald-300">Visibles</div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className={secondaryCardClassName()}>
              <div className={eyebrowClassName()}>Centraliser</div>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Regroupez incidents, commands, events, runs et SLA dans un seul cockpit.
              </p>
            </div>

            <div className={secondaryCardClassName()}>
              <div className={eyebrowClassName()}>Surveiller</div>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Repérez immédiatement les flows sous attention et les signaux critiques.
              </p>
            </div>

            <div className={secondaryCardClassName()}>
              <div className={eyebrowClassName()}>Orchestrer</div>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Reliez facilement un incident à son flow, sa command et son contexte.
              </p>
            </div>

            <div className={secondaryCardClassName()}>
              <div className={eyebrowClassName()}>Structurer</div>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Travaillez par espace selon votre usage, votre équipe ou vos clients.
              </p>
            </div>
          </section>

          <section id="plans" className={sectionCardClassName()}>
            <div className="max-w-3xl">
              <div className={eyebrowClassName()}>Plans</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Choisissez le niveau BOSAI adapté à votre usage
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
                Commencez avec une structure simple, puis évoluez vers une capacité plus large à
                mesure que votre activité grandit.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-4">
              {plans.map((plan) => (
                <article key={plan.name} className={planCardClassName(plan.tone)}>
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
                    <div className="mt-2 text-sm font-medium text-zinc-200">{plan.subtitle}</div>
                    <p className="mt-4 text-sm leading-7 text-zinc-400">{plan.description}</p>

                    <div className="mt-6 space-y-3">
                      {plan.features.map((feature) => (
                        <div
                          key={`${plan.name}-${feature}`}
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

          <section id="comparison" className={sectionCardClassName()}>
            <div className="max-w-3xl">
              <div className={eyebrowClassName()}>Comparaison</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Comparer les plans en un coup d’œil
              </h2>
            </div>

            <div className="mt-8 overflow-hidden rounded-[28px] border border-white/10">
              <div className="hidden grid-cols-5 border-b border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-medium text-zinc-300 md:grid">
                <div>Élément</div>
                <div>Starter</div>
                <div>Pro</div>
                <div>Agency</div>
                <div>Custom</div>
              </div>

              <div className="divide-y divide-white/10">
                {comparisonRows.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-1 gap-3 bg-black/20 px-5 py-4 md:grid-cols-5 md:gap-4"
                  >
                    <div className="text-sm font-medium text-white">{row.label}</div>
                    <div className="text-sm text-zinc-300">
                      <span className="md:hidden text-zinc-500">Starter · </span>
                      {row.starter}
                    </div>
                    <div className="text-sm text-zinc-300">
                      <span className="md:hidden text-zinc-500">Pro · </span>
                      {row.pro}
                    </div>
                    <div className="text-sm text-zinc-300">
                      <span className="md:hidden text-zinc-500">Agency · </span>
                      {row.agency}
                    </div>
                    <div className="text-sm text-zinc-300">
                      <span className="md:hidden text-zinc-500">Custom · </span>
                      {row.custom}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className={sectionCardClassName()}>
            <div className="max-w-3xl">
              <div className={eyebrowClassName()}>Activation</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Comment fonctionne l’activation BOSAI
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
                L’espace de travail n’est pas ouvert automatiquement. Il est préparé après choix du
                plan.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[
                ["1", "Choisissez votre plan", "Sélectionnez Starter, Pro, Agency ou Custom selon votre usage."],
                ["2", "Créez ou connectez votre compte", "Votre compte peut exister sans workspace actif."],
                ["3", "Votre espace est préparé", "Le provisioning met en place le bon cadre de travail."],
                ["4", "Configurez votre workspace", "Nom, type d’usage et préférences initiales."],
                ["5", "Accédez au cockpit BOSAI", "Vous entrez dans un espace prêt, structuré et cohérent."],
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

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            <div className={secondaryCardClassName()}>
              <div className={eyebrowClassName()}>Solo / Freelance</div>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Pour démarrer proprement avec un seul espace.
              </p>
              <div className="mt-4 text-sm font-medium text-white">Plan recommandé : Starter ou Pro</div>
            </div>

            <div className={secondaryCardClassName()}>
              <div className={eyebrowClassName()}>Petite structure</div>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Pour suivre plusieurs flux avec un cockpit plus complet.
              </p>
              <div className="mt-4 text-sm font-medium text-white">Plan recommandé : Pro</div>
            </div>

            <div className={secondaryCardClassName()}>
              <div className={eyebrowClassName()}>Agence / Studio</div>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Pour séparer les clients, espaces et usages.
              </p>
              <div className="mt-4 text-sm font-medium text-white">Plan recommandé : Agency</div>
            </div>

            <div className={secondaryCardClassName()}>
              <div className={eyebrowClassName()}>Besoin spécifique</div>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                Pour une architecture ou un accompagnement sur mesure.
              </p>
              <div className="mt-4 text-sm font-medium text-white">Plan recommandé : Custom</div>
            </div>
          </section>

          <section className={sectionCardClassName()}>
            <div className="max-w-3xl">
              <div className={eyebrowClassName()}>FAQ</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Questions fréquentes
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-2">
              {faqs.map((faq) => (
                <div key={faq.question} className={secondaryCardClassName()}>
                  <div className="text-lg font-medium text-white">{faq.question}</div>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={sectionCardClassName()}>
            <div className="max-w-3xl">
              <div className={eyebrowClassName()}>Final CTA</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Choisissez la structure BOSAI adaptée à votre activité
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
                Commencez avec un plan clair, activez votre espace, puis entrez dans le cockpit
                avec une base propre.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="#plans" className={buttonClassName("primary")}>
                Voir les plans
              </Link>
              <Link href="/login?next=%2Fonboarding%2Fplan" className={buttonClassName("soft")}>
                Commencer maintenant
              </Link>
              <Link href="/login?next=%2Fonboarding%2Fplan" className={buttonClassName("danger")}>
                Demander une configuration Custom
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
