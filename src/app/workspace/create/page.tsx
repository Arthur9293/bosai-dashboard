import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import { resolveBosaiAccessState } from "@/lib/onboarding-access";

type SearchParams = {
  source?: string | string[];
  plan?: string | string[];
};

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function text(value?: string | null): string {
  return String(value || "").trim();
}

function hasCommercialOnboardingSignals(
  cookieValues: Record<string, string | undefined>
): boolean {
  return [
    cookieValues.bosai_plan_code,
    cookieValues.plan_code,
    cookieValues.selected_plan,
    cookieValues.bosai_workspace_status,
    cookieValues.workspace_status,
    cookieValues.bosai_checkout_completed,
    cookieValues.checkout_completed,
    cookieValues.bosai_onboarding_completed,
    cookieValues.onboarding_completed,
    cookieValues.bosai_pending_workspace_id,
  ].some((value) => text(value) !== "");
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

function getPlanLabel(planCode: string): string {
  const normalized = text(planCode).toLowerCase();

  if (normalized === "starter") return "Starter";
  if (normalized === "pro") return "Pro";
  if (normalized === "agency") return "Agency";
  if (normalized === "custom") return "Custom";

  return "Unknown";
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

  const accessState = resolveBosaiAccessState({
    searchParams: {
      source: firstParam(resolvedSearchParams.source),
      plan: firstParam(resolvedSearchParams.plan),
    },
    cookieValues: onboardingCookieValues,
  });

  const memberships = session.context?.memberships ?? [];
  const hasCommercialSignals = hasCommercialOnboardingSignals(
    onboardingCookieValues
  );

  const shouldStayOnCreatePage =
    hasCommercialSignals &&
    accessState.stage === "workspace" &&
    accessState.workspaceStatus === "active" &&
    !accessState.onboardingCompleted;

  if (hasCommercialSignals && !accessState.canAccessCockpit && !shouldStayOnCreatePage) {
    redirect(accessState.redirectPath || "/pricing");
  }

  if (!hasCommercialSignals && memberships.length > 0) {
    redirect("/workspace/select");
  }

  if (hasCommercialSignals && accessState.canAccessCockpit && memberships.length > 0) {
    redirect("/workspace/select");
  }

  const planCode = accessState.planCode || firstParam(resolvedSearchParams.plan);
  const planLabel = getPlanLabel(planCode);
  const workspaceStatus = accessState.workspaceStatus || "active";
  const source = firstParam(resolvedSearchParams.source) || "direct";
  const hasLegacyMemberships = memberships.length > 0;

  const reviewHref = planCode
    ? `/onboarding/workspace?plan=${planCode}`
    : "/onboarding/plan";

  const pricingHref = "/pricing";

  return (
    <main className={pageWrapClassName()}>
      <div className={shellClassName()}>
        <section className="space-y-4 border-b border-white/10 pb-6">
          <div className={sectionLabelClassName()}>Workspace onboarding</div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Création contrôlée du workspace
            </h1>

            <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
              Cette étape remplace l’ouverture directe du cockpit. Le flux commercial reste en mode contrôlé jusqu’à la création réelle du nouvel espace.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={badgeClassName("info")}>Source: {source}</span>
            <span className={badgeClassName("violet")}>Plan {planLabel}</span>
            <span className={badgeClassName("warning")}>
              Status {workspaceStatus.toUpperCase()}
            </span>
            <span className={badgeClassName("default")}>
              Onboarding non finalisé
            </span>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className={cardClassName()}>
            <div className="space-y-4">
              <div className={sectionLabelClassName()}>Create stage</div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Le cockpit reste verrouillé ici
              </h2>

              <p className="text-sm leading-7 text-zinc-400">
                Tu as bien quitté le vieux flux legacy. Cette page devient maintenant le sas officiel entre le parcours commercial et la création réelle du workspace.
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className={compactCardClassName()}>
                  <div className={sectionLabelClassName()}>Plan</div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {planLabel}
                  </div>
                </div>

                <div className={compactCardClassName()}>
                  <div className={sectionLabelClassName()}>Workspace status</div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {workspaceStatus}
                  </div>
                </div>

                <div className={compactCardClassName()}>
                  <div className={sectionLabelClassName()}>Legacy spaces</div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {memberships.length}
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                <div className={sectionLabelClassName()}>État actuel</div>
                <p className="mt-2 text-sm leading-7 text-zinc-400">
                  Le prochain vrai patch branchera ici le formulaire ou l’action de création effective du workspace. Tant que cette partie n’existe pas, BOSAI ne doit pas retomber sur le sélecteur legacy.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <span className={buttonClassName("primary", true)}>
                  Création réelle à brancher
                </span>

                <Link href={reviewHref} className={buttonClassName("soft")}>
                  Retour au récapitulatif
                </Link>

                <Link href={pricingHref} className={buttonClassName("default")}>
                  Revoir pricing
                </Link>
              </div>
            </div>
          </div>

          <div className={cardClassName()}>
            <div className="space-y-4">
              <div className={sectionLabelClassName()}>Guard state</div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Lecture d’accès
              </h2>

              <div className="space-y-3">
                <div className={compactCardClassName()}>
                  <div className={sectionLabelClassName()}>Cockpit access</div>
                  <div className="mt-3 text-2xl font-semibold text-red-300">
                    BLOCKED
                  </div>
                </div>

                <div className={compactCardClassName()}>
                  <div className={sectionLabelClassName()}>Commercial signals</div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {hasCommercialSignals ? "ON" : "OFF"}
                  </div>
                </div>

                <div className={compactCardClassName()}>
                  <div className={sectionLabelClassName()}>Stay on create</div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {shouldStayOnCreatePage ? "YES" : "NO"}
                  </div>
                </div>
              </div>

              {hasLegacyMemberships ? (
                <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/10 px-4 py-4">
                  <div className={sectionLabelClassName()}>Legacy memberships détectés</div>
                  <p className="mt-2 text-sm leading-7 text-amber-200">
                    Des espaces existent déjà sur ce compte, mais ils ne doivent pas reprendre la main tant que le nouveau flux commercial n’est pas finalisé.
                  </p>
                </div>
              ) : (
                <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                  <div className={sectionLabelClassName()}>Aucun espace existant</div>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">
                    Le compte est propre pour la création d’un premier workspace commercial.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
