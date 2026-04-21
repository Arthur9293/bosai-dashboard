import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import {
  hasCommercialOnboardingSignals,
  resolveBosaiAccessState,
} from "@/lib/onboarding-access";
import { CommercialDebugBanner } from "@/components/debug/CommercialDebugBanner";

type SearchParams = {
  plan?: string | string[];
  activated?: string | string[];
  commercial_workspace_id?: string | string[];
};

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

const MANUAL_WORKSPACE_SELECT_HREF = "/workspace/select?manual=1";

const SHOW_WORKSPACE_CREATE_DEBUG =
  process.env.NEXT_PUBLIC_BOSAI_DEBUG_WORKSPACE_CREATE === "1";

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function normalizeText(value?: string | string | null): string {
  return String(value || "").trim();
}

function normalizePlanCode(value?: string | null): string {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "starter") return "starter";
  if (normalized === "pro") return "pro";
  if (normalized === "agency") return "agency";
  if (normalized === "custom") return "custom";

  return "starter";
}

function buildPendingWorkspaceId(planCode: string): string {
  return `ws_onboarding_${normalizePlanCode(planCode)}`;
}

function isTruthy(value: string): boolean {
  const normalized = normalizeText(value).toLowerCase();

  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "oui" ||
    normalized === "on"
  );
}

function isWorkspaceActivationReady(value?: string | null): boolean {
  const normalized = normalizeText(value).toLowerCase();

  return normalized === "ready_to_activate" || normalized === "active";
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
  const normalized = normalizePlanCode(planCode);

  if (normalized === "agency") return "BOSAI Agency Workspace";
  if (normalized === "custom") return "BOSAI Custom Workspace";
  if (normalized === "pro") return "BOSAI Pro Workspace";

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
  const headerStore = await headers();

  const host =
    headerStore.get("x-forwarded-host") ||
    headerStore.get("host") ||
    "unknown-host";

  const queryPlanRaw = firstParam(resolvedSearchParams.plan);
  const queryActivatedRaw = firstParam(resolvedSearchParams.activated);
  const queryCommercialWorkspaceIdRaw = firstParam(
    resolvedSearchParams.commercial_workspace_id
  );

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

  const planCode = normalizePlanCode(
    queryPlanRaw ||
      accessState.planCode ||
      onboardingCookieValues.bosai_plan_code ||
      onboardingCookieValues.plan_code ||
      onboardingCookieValues.selected_plan ||
      "starter"
  );

  const derivedPendingWorkspaceId = buildPendingWorkspaceId(planCode);
  const cookiePendingWorkspaceId = normalizeText(
    onboardingCookieValues.bosai_pending_workspace_id
  );
  const queryCommercialWorkspaceId = normalizeText(queryCommercialWorkspaceIdRaw);

  const pendingWorkspaceId =
    queryCommercialWorkspaceId ||
    (cookiePendingWorkspaceId === derivedPendingWorkspaceId
      ? cookiePendingWorkspaceId
      : derivedPendingWorkspaceId);

  const activatedFromQuery = isTruthy(queryActivatedRaw);
  const activatedFromMatchingQuery =
    activatedFromQuery &&
    queryCommercialWorkspaceId !== "" &&
    queryCommercialWorkspaceId === pendingWorkspaceId;

  const accessWorkspaceStatus = normalizeText(accessState.workspaceStatus);
  const cookieWorkspaceStatus = normalizeText(
    onboardingCookieValues.bosai_workspace_status ||
      onboardingCookieValues.workspace_status
  );

  const activated =
    accessState.canAccessCockpit ||
    activatedFromMatchingQuery ||
    isWorkspaceActivationReady(accessWorkspaceStatus) ||
    isWorkspaceActivationReady(cookieWorkspaceStatus);

  const effectiveWorkspaceStatus =
    accessWorkspaceStatus ||
    cookieWorkspaceStatus ||
    "ready_to_activate";

  if (shouldApplyCommercialGuard) {
    const isWorkspaceStage = accessState.stage === "workspace";
    const isAlreadyActivated = activated;

    if (!isWorkspaceStage && !isAlreadyActivated) {
      redirect(accessState.redirectPath || "/pricing");
    }
  }

  const memberships = session.context?.memberships ?? [];

  const isCommercialWorkspaceReturn =
    queryCommercialWorkspaceId !== "" &&
    queryCommercialWorkspaceId === pendingWorkspaceId;

  if (
    !shouldApplyCommercialGuard &&
    !isCommercialWorkspaceReturn &&
    activated &&
    memberships.length > 0
  ) {
    redirect(MANUAL_WORKSPACE_SELECT_HREF);
  }

  const suggestedName = getSuggestedWorkspaceName(planCode);

  const finalizeHref = `/workspace/create?plan=${encodeURIComponent(
    planCode
  )}&activated=1&commercial_workspace_id=${encodeURIComponent(
    pendingWorkspaceId
  )}`;

  const activateWorkspaceHref = `/workspace/activate?workspace_id=${encodeURIComponent(
    pendingWorkspaceId
  )}&next=${encodeURIComponent("/workspace")}`;

  const workspaceSetupHref = `/onboarding/workspace?plan=${encodeURIComponent(
    planCode
  )}`;

  const debugItems = [
    { label: "host", value: host },
    { label: "page", value: "/workspace/create" },
    { label: "auth", value: session.isAuthenticated ? "yes" : "no" },
    { label: "query.plan", value: queryPlanRaw },
    { label: "query.activated", value: queryActivatedRaw },
    {
      label: "query.commercial_workspace_id",
      value: queryCommercialWorkspaceIdRaw,
    },
    {
      label: "commercial.signals",
      value: shouldApplyCommercialGuard ? "yes" : "no",
    },
    {
      label: "commercial.stage",
      value: accessState.stage,
    },
    {
      label: "commercial.canAccessCockpit",
      value: accessState.canAccessCockpit ? "yes" : "no",
    },
    {
      label: "commercial.plan",
      value: accessState.planCode || "",
    },
    {
      label: "commercial.workspaceStatus",
      value: accessState.workspaceStatus || "",
    },
    {
      label: "cookie.workspaceStatus",
      value:
        onboardingCookieValues.bosai_workspace_status ||
        onboardingCookieValues.workspace_status ||
        "",
    },
    {
      label: "cookie.pendingWorkspaceId",
      value: cookiePendingWorkspaceId,
    },
    {
      label: "derived.pendingWorkspaceId",
      value: derivedPendingWorkspaceId,
    },
    {
      label: "pendingWorkspaceId",
      value: pendingWorkspaceId,
    },
    {
      label: "activated.final",
      value: activated ? "yes" : "no",
    },
    {
      label: "memberships.count",
      value: String(memberships.length),
    },
  ];

  return (
    <main className={pageWrapClassName()}>
      {SHOW_WORKSPACE_CREATE_DEBUG ? (
        <CommercialDebugBanner
          title="workspace/create debug"
          items={debugItems}
        />
      ) : null}

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
                    {effectiveWorkspaceStatus}
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

                <Link href={workspaceSetupHref} className={buttonClassName("soft")}>
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
                  On sépare volontairement : plan → checkout → provisioning →
                  workspace setup → create → activate → cockpit.
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
                <div className={sectionLabelClassName()}>
                  Prochaine vraie étape
                </div>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  Après activation, le hub workspace pourra s’ouvrir sans
                  retomber sur un workspace réel existant.
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
                    href={MANUAL_WORKSPACE_SELECT_HREF}
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
