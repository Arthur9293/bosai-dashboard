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
  subtitle: string;
  workspaceMode: string;
  activationMode: string;
  supportLevel: string;
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

function metaBoxClassName() {
  return "rounded-[20px] border border-white/10 bg-black/20 px-4 py-4";
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

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function getSuggestedWorkspaceName(planCode: string): string {
  if (planCode === "agency") return "BOSAI Agency Workspace";
  if (planCode === "custom") return "BOSAI Custom Workspace";
  if (planCode === "pro") return "BOSAI Pro Workspace";
  return "BOSAI Starter Workspace";
}

const plans: Record<string, PlanConfig> = {
  starter: {
    code: "starter",
    name: "Starter",
    badge: "Entrée",
    tone: "default",
    subtitle: "Lancer un premier espace BOSAI",
    workspaceMode: "1 workspace essentiel",
    activationMode: "Activation simple",
    supportLevel: "Support standard",
  },
  pro: {
    code: "pro",
    name: "Pro",
    badge: "Recommandé",
    tone: "recommended",
    subtitle: "Passer à un vrai usage opérationnel",
    workspaceMode: "Jusqu’à 3 workspaces",
    activationMode: "Activation renforcée",
    supportLevel: "Support prioritaire léger",
  },
  agency: {
    code: "agency",
    name: "Agency",
    badge: "Multi-workspace",
    tone: "default",
    subtitle: "Piloter plusieurs espaces proprement",
    workspaceMode: "Mode agency / multi-client",
    activationMode: "Activation multi-espace",
    supportLevel: "Support agency",
  },
  custom: {
    code: "custom",
    name: "Custom",
    badge: "Sur mesure",
    tone: "custom",
    subtitle: "Construire une configuration dédiée",
    workspaceMode: "Workspace sur mesure",
    activationMode: "Activation après cadrage",
    supportLevel: "Accompagnement dédié",
  },
};

export default async function OnboardingWorkspacePage({
  searchParams,
}: PageProps) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const planCode = firstParam(resolvedSearchParams.plan).trim().toLowerCase();
  const selectedPlan = plans[planCode] ?? null;
  const hasValidPlan = selectedPlan !== null;

  const workspaceCreateHref = hasValidPlan
    ? `/workspace/create?plan=${encodeURIComponent(selectedPlan.code)}`
    : "/workspace/create";

  const provisioningHref = hasValidPlan
    ? `/onboarding/provisioning?plan=${encodeURIComponent(selectedPlan.code)}`
    : "/onboarding/provisioning";

  const suggestedName = hasValidPlan
    ? getSuggestedWorkspaceName(selectedPlan.code)
    : "BOSAI Workspace";

  return (
    <div className={pageFrameClassName()}>
      <main className={containerClassName()}>
        <div className="space-y-10">
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className={sectionCardClassName()}>
              <div className={eyebrowClassName()}>BOSAI workspace setup</div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={badgeClassName("info")}>Configuration initiale</span>
                <span className={badgeClassName("warning")}>Activation pending</span>
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
                    ? `Finaliser votre workspace ${selectedPlan.name}`
                    : "Plan requis pour configurer le workspace"}
                </h1>

                <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-300">
                  {hasValidPlan
                    ? "Vous êtes à l’étape finale avant la création réelle. Cette page fixe l’identité et le cadre de départ de votre espace BOSAI."
                    : "La configuration du workspace nécessite un plan valide. Revenez au provisioning ou au choix du plan pour continuer correctement."}
                </p>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-500">
                  L’accès cockpit ne doit pas s’ouvrir ici. Le flux continue d’abord vers la création contrôlée du workspace.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {hasValidPlan ? (
                  <Link href={workspaceCreateHref} className={buttonClassName("primary")}>
                    Continuer vers la création
                  </Link>
                ) : (
                  <span className={buttonClassName("primary", true)}>
                    Plan requis
                  </span>
                )}

                <Link href={provisioningHref} className={buttonClassName("soft")}>
                  Retour provisioning
                </Link>
              </div>
            </div>

            <div className={sectionCardClassName()}>
              <div className={eyebrowClassName()}>État final avant création</div>

              <div className="mt-5 space-y-4">
                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Account status</div>
                  <div className="mt-2 text-2xl font-semibold text-sky-300">
                    {hasValidPlan ? "ready_to_activate" : "plan_missing"}
                  </div>
                </div>

                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Workspace status</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {hasValidPlan ? "ready_to_activate" : "non créé"}
                  </div>
                </div>

                <div className={secondaryCardClassName()}>
                  <div className={metaLabelClassName()}>Cockpit access</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    Bloqué avant création
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                  <div className={metaLabelClassName()}>Lecture produit</div>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">
                    Cette étape transforme un simple provisioning en création contrôlée avant l’ouverture du cockpit.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {hasValidPlan ? (
            <>
              <section className={sectionCardClassName()}>
                <div className="max-w-3xl">
                  <div className={eyebrowClassName()}>Configuration retenue</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Paramètres initiaux du workspace
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
                    Cette vue fixe les valeurs de départ du workspace avant sa création contrôlée puis son activation.
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
                      {selectedPlan.subtitle}
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3">
                      <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className={metaLabelClassName()}>Workspace name</div>
                        <div className="mt-2 text-sm text-zinc-300">{suggestedName}</div>
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className={metaLabelClassName()}>Workspace mode</div>
                        <div className="mt-2 text-sm text-zinc-300">
                          {selectedPlan.workspaceMode}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className={metaLabelClassName()}>Activation mode</div>
                        <div className="mt-2 text-sm text-zinc-300">
                          {selectedPlan.activationMode}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                        <div className={metaLabelClassName()}>Support level</div>
                        <div className="mt-2 text-sm text-zinc-300">
                          {selectedPlan.supportLevel}
                        </div>
                      </div>
                    </div>
                  </article>

                  <div className="space-y-4">
                    <div className={metaBoxClassName()}>
                      <div className={metaLabelClassName()}>Langue par défaut</div>
                      <div className="mt-2 text-zinc-100">Français</div>
                    </div>

                    <div className={metaBoxClassName()}>
                      <div className={metaLabelClassName()}>Région</div>
                      <div className="mt-2 text-zinc-100">Europe / France</div>
                    </div>

                    <div className={metaBoxClassName()}>
                      <div className={metaLabelClassName()}>Branding initial</div>
                      <div className="mt-2 text-zinc-100">BOSAI default branding</div>
                    </div>

                    <div className={metaBoxClassName()}>
                      <div className={metaLabelClassName()}>Next route</div>
                      <div className="mt-2 break-all text-zinc-100">{workspaceCreateHref}</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className={sectionCardClassName()}>
                <div className="max-w-3xl">
                  <div className={eyebrowClassName()}>Checklist finale</div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                    Ce qui devient vrai après création
                  </h2>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    [
                      "1",
                      "Workspace cadré",
                      "L’espace a un nom, un cadre et une logique de départ lisibles.",
                    ],
                    [
                      "2",
                      "Flux commercial fermé",
                      "Le parcours plan -> checkout -> provisioning -> workspace -> create reste cohérent.",
                    ],
                    [
                      "3",
                      "Activation possible",
                      "L’espace peut ensuite être activé proprement.",
                    ],
                    [
                      "4",
                      "Base v1 propre",
                      "Vous partez d’un flux contrôlé plutôt que d’un cockpit ouvert trop tôt.",
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
            </>
          ) : (
            <section className={sectionCardClassName()}>
              <div className="max-w-3xl">
                <div className={eyebrowClassName()}>Action requise</div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  Plan manquant pour finaliser le workspace
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
                  Cette page attend un paramètre `plan`. Reviens au choix du plan ou au provisioning pour reprendre le flux BOSAI correctement.
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
