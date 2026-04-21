import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import {
  hasCommercialOnboardingSignals,
  resolveBosaiAccessState,
} from "@/lib/onboarding-access";

type SearchParams = {
  plan?: string | string[];
  activated?: string | string[];
};

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function normalizeText(value?: string | null): string {
  return String(value || "").trim();
}

function buildPendingWorkspaceId(planCode: string): string {
  const normalized = normalizeText(planCode).toLowerCase() || "starter";
  return `ws_onboarding_${normalized}`;
}

function pageWrapClassName(): string {
  return "min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8";
}

function shellClassName(): string {
  return "mx-auto max-w-5xl space-y-8";
}

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function compactCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-black/20 p-4 md:p-5";
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function badgeClassName(
  variant:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "violet" = "default"
): string {
  if (variant === "success") {
    return "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300";
  }

  if (variant === "warning") {
    return "inline-flex rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300";
  }

  if (variant === "danger") {
    return "inline-flex rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300";
  }

  if (variant === "info") {
    return "inline-flex rounded-full border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300";
  }

  if (variant === "violet") {
    return "inline-flex rounded-full border border-violet-500/20 bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300";
  }

  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300";
}

function buttonClassName(
  variant: "default" | "primary" | "soft" = "default",
  disabled = false
): string {
  const base =
    "inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "soft") {
    return `${base} border border-sky-500/20 bg-sky-500/12 text-sky-300 hover:bg-sky-500/18`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function getSuggestedWorkspaceName(planCode: string): string {
  if (planCode === "agency") return "BOSAI Agency Workspace";
  if (planCode === "custom") return "BOSAI Custom Workspace";
  if (planCode === "pro") return "BOSAI Pro Workspace";
  return "BOSAI Starter Workspace";
}

export default async function WorkspaceCreatePage({
  searchParams,
}: PageProps) {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const cookieStore = await cookies();

  const onboardingCookieValues = {
    bosai_plan_code: cookieStore.get("bosai_plan_code")?.value,
    plan_code: cookieStore.get("plan_code")?.value,
    selected_plan: cookieStore.get("selected_plan")?.value,
    bosai_workspace_status: cookieStore.get("bosai_workspace_status")?.value,
    workspace_status: cookieStore.get("workspace_status")?.value,
    bosai_checkout_completed:
      cookieStore.get("bosai_checkout_completed")?.value,
    checkout_completed: cookieStore.get("checkout_completed")?.value,
    bosai_onboarding_completed:
      cookieStore.get("bosai_onboarding_completed")?.value,
    onboarding_completed: cookieStore.get("onboarding_completed")?.value,
    bosai_pending_workspace_id:
      cookieStore.get("bosai_pending_workspace_id")?.value,
  };

  const shouldApplyCommercialGuard =
    hasCommercialOnboardingSignals(onboardingCookieValues);

  const accessState = resolveBosaiAccessState({
    cookieValues: onboardingCookieValues,
  });

  if (shouldApplyCommercialGuard) {
    const isWorkspaceStage = accessState.stage === "workspace";
    const isAlreadyActivated = accessState.canAccessCockpit;

    if (!isWorkspaceStage && !isAlreadyActivated) {
      redirect(accessState.redirectPath || "/pricing");
    }
  }

  const memberships = session.context?.memberships ?? [];

  const planCode =
    firstParam(resolvedSearchParams.plan).trim().toLowerCase() ||
    accessState.planCode ||
    "starter";

  const activatedValue = firstParam(resolvedSearchParams.activated)
    .trim()
    .toLowerCase();

  const activated =
    activatedValue === "1" ||
    activatedValue === "true" ||
    activatedValue === "yes" ||
    accessState.canAccessCockpit;

  const pendingWorkspaceId =
    normalizeText(onboardingCookieValues.bosai_pending_workspace_id) ||
    buildPendingWorkspaceId(planCode);

  /**
   * IMPORTANT:
   * Pendant l’onboarding commercial, on NE DOIT PAS quitter cette page
   * juste parce que des memberships mock/live existent déjà.
   * Sinon le flux reboucle via /workspace/select -> guard -> /onboarding/workspace.
   *
   * On autorise donc l’affichage tant que l’activation finale n’est pas validée.
   */
  if (activated && memberships.length > 0) {
    redirect("/workspace/select");
  }

  const suggestedName = getSuggestedWorkspaceName(planCode);

  const finalizeHref = `/onboarding/continue?step=activate&plan=${encodeURIComponent(
    planCode
  )}&workspace_id=${encodeURIComponent(
    pendingWorkspaceId
  )}&next=${encodeURIComponent("/workspace/create?activated=1")}`;

  const activateWorkspaceHref = `/workspace/activate?workspace_id=${encodeURIComponent(
    pendingWorkspaceId
  )}&next=${encodeURIComponent("/workspace")}`;

  const selectWorkspaceHref = "/workspace/select";

  return (
    <main className={pageWrapClassName()}>
      <div className={shellClassName()}>
        <section className="space-y-4 border-b border-white/10 pb-6">
          <div className={sectionLabelClassName()}>Workspace onboarding</div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {activated
                ? "Workspace prêt à être activé"
                : "Créer ou raccorder un espace"}
            </h1>

            <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
              {activated
                ? "Le funnel commercial est validé. Un workspace d’onboarding peut maintenant être activé proprement pour ouvrir le cockpit v1."
                : "Vous êtes dans la création contrôlée du workspace. Le cockpit ne doit pas encore s’ouvrir sans validation finale."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={badgeClassName("info")}>
              Plan {planCode.toUpperCase()}
            </span>
            <span className={badgeClassName(activated ? "success" : "warning")}>
              {activated ? "ACTIVATION VALIDÉE" : "CRÉATION CONTRÔLÉE"}
            </span>
            <span className={badgeClassName("default")}>{suggestedName}</span>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={cardClassName()}>
            <div className="space-y-4">
              <div className={sectionLabelClassName()}>État actuel</div>

              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-white">
                  {activated
                    ? "Le flux commercial est terminé"
                    : "Dernière validation avant ouverture"}
                </h2>

                <p className="max-w-3xl text-sm leading-7 text-zinc-400">
                  {activated
                    ? "Un workspace onboarding synthétique peut maintenant être activé. Cela ferme le parcours v1 sans casser les memberships live futures."
                    : "Cette page joue le rôle de sas de création. Elle évite d’ouvrir directement le cockpit tant que l’étape finale n’est pas validée."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={compactCardClassName()}>
                  <div className={sectionLabelClassName()}>Plan</div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {planCode.toUpperCase()}
                  </div>
                </div>

                <div className={compactCardClassName()}>
                  <div className={sectionLabelClassName()}>Workspace name</div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {suggestedName}
                  </div>
                </div>

                <div className={compactCardClassName()}>
                  <div className={sectionLabelClassName()}>Workspace status</div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {accessState.workspaceStatus ||
                      (activated ? "active" : "ready_to_activate")}
                  </div>
                </div>

                <div className={compactCardClassName()}>
                  <div className={sectionLabelClassName()}>Workspace ID</div>
                  <div className="mt-3 break-all text-2xl font-semibold text-white">
                    {pendingWorkspaceId}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {!activated ? (
                  <Link href={finalizeHref} className={buttonClassName("primary")}>
                    Finaliser la création contrôlée
                  </Link>
                ) : (
                  <Link
                    href={activateWorkspaceHref}
                    className={buttonClassName("primary")}
                  >
                    Activer mon espace
                  </Link>
                )}

                <Link
                  href={`/onboarding/workspace?plan=${encodeURIComponent(planCode)}`}
                  className={buttonClassName("soft")}
                >
                  Retour workspace setup
                </Link>
              </div>
            </div>
          </div>

          <div className={cardClassName()}>
            <div className="space-y-4">
              <div className={sectionLabelClassName()}>Lecture produit</div>

              <div className={compactCardClassName()}>
                <div className={sectionLabelClassName()}>Pourquoi cette page</div>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  On sépare volontairement :
                  plan → checkout → provisioning → workspace setup → create → activate → cockpit.
                </p>
              </div>

              <div className={compactCardClassName()}>
                <div className={sectionLabelClassName()}>État workspace</div>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  {activated
                    ? "Le workspace onboarding v1 est prêt à être activé."
                    : "Le workspace n’est pas encore activé pour le cockpit."}
                </p>
              </div>

              <div className={compactCardClassName()}>
                <div className={sectionLabelClassName()}>Prochaine vraie étape</div>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  Après activation, le selector et le hub workspace pourront s’ouvrir sans reboucler sur le funnel commercial.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={cardClassName()}>
          <div className="space-y-4">
            <div className={sectionLabelClassName()}>Actions</div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {!activated ? (
                <Link href={finalizeHref} className={buttonClassName("primary")}>
                  Valider cette étape
                </Link>
              ) : (
                <>
                  <Link
                    href={activateWorkspaceHref}
                    className={buttonClassName("primary")}
                  >
                    Ouvrir mon espace
                  </Link>

                  <Link
                    href={selectWorkspaceHref}
                    className={buttonClassName("soft")}
                  >
                    Ouvrir le sélecteur
                  </Link>
                </>
              )}

              <Link href="/pricing" className={buttonClassName("default")}>
                Revoir pricing
              </Link>

              <Link href="/login" className={buttonClassName("default")}>
                Retour login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
