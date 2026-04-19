import { redirect } from "next/navigation";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import {
  getDashboardRouteForWorkspaceCategory,
  resolveWorkspaceAccess,
} from "@/lib/workspaces/resolver";

function pageWrapClassName(): string {
  return "min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8";
}

function shellClassName(): string {
  return "mx-auto max-w-6xl space-y-8";
}

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function badgeClassName(
  variant: "default" | "success" | "info" | "violet" = "default"
): string {
  if (variant === "success") {
    return "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300";
  }

  if (variant === "info") {
    return "inline-flex rounded-full border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300";
  }

  if (variant === "violet") {
    return "inline-flex rounded-full border border-violet-500/20 bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300";
  }

  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300";
}

function metricCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-black/20 p-4 md:p-5";
}

function formatNumber(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0";
  }

  return new Intl.NumberFormat("fr-FR").format(value);
}

function hardLimitText(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function WorkspaceIndexPage() {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const resolution = await resolveWorkspaceAccess({
    userId: session.user?.userId || "",
    requestedWorkspaceId: session.cookieSnapshot.activeWorkspaceId || "",
    nextPath: "/workspace",
  });

  if (resolution.kind !== "allow_dashboard") {
    redirect(resolution.redirectTo);
  }

  const activeWorkspace = resolution.activeWorkspace;

  if (!activeWorkspace) {
    redirect("/workspace/select");
  }

  if (activeWorkspace.category !== "company") {
    redirect(getDashboardRouteForWorkspaceCategory(activeWorkspace.category));
  }

  const quota = resolution.context?.quota || null;
  const entitlements = resolution.context?.entitlements || null;

  return (
    <main className={pageWrapClassName()}>
      <div className={shellClassName()}>
        <section className="space-y-4 border-b border-white/10 pb-6">
          <div className={sectionLabelClassName()}>Workspace Company Hub</div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {activeWorkspace.name}
            </h1>

            <p className="max-w-4xl text-base text-zinc-400 sm:text-lg">
              Hub company du workspace actif. Cette vue centralise la lecture
              métier, les quotas et les accès utiles avant d’ouvrir les surfaces
              opérationnelles.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={badgeClassName("info")}>
              {activeWorkspace.category.toUpperCase()}
            </span>

            <span className={badgeClassName("success")}>
              {activeWorkspace.membershipRole.toUpperCase()}
            </span>

            <span className={badgeClassName("success")}>
              {activeWorkspace.status.toUpperCase()}
            </span>

            {session.user?.displayName ? (
              <span className={badgeClassName("default")}>
                {session.user.displayName}
              </span>
            ) : null}

            {session.user?.email ? (
              <span className={badgeClassName("default")}>
                {session.user.email}
              </span>
            ) : null}
          </div>
        </section>

        <section className={cardClassName()}>
          <div className="mb-5">
            <div className={sectionLabelClassName()}>Active Workspace</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Détail du workspace courant
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={metricCardClassName()}>
              <div className={sectionLabelClassName()}>Workspace ID</div>
              <div className="mt-3 break-all text-2xl font-semibold text-white">
                {activeWorkspace.workspaceId}
              </div>
            </div>

            <div className={metricCardClassName()}>
              <div className={sectionLabelClassName()}>Slug</div>
              <div className="mt-3 break-all text-2xl font-semibold text-white">
                {activeWorkspace.slug}
              </div>
            </div>

            <div className={metricCardClassName()}>
              <div className={sectionLabelClassName()}>Plan</div>
              <div className="mt-3 text-2xl font-semibold text-white">
                {activeWorkspace.plan}
              </div>
            </div>

            <div className={metricCardClassName()}>
              <div className={sectionLabelClassName()}>Memberships</div>
              <div className="mt-3 text-2xl font-semibold text-white">
                {resolution.memberships.length}
              </div>
            </div>
          </div>
        </section>

        <section className={cardClassName()}>
          <div className="mb-5">
            <div className={sectionLabelClassName()}>Quota Snapshot</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Usage courant
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className={metricCardClassName()}>
              <div className="text-sm text-zinc-400">Runs</div>
              <div className="mt-3 text-5xl font-semibold tracking-tight text-white">
                {formatNumber(quota?.runsUsed)}
              </div>
              <div className="mt-2 text-sm text-zinc-500">
                Limite dure : {hardLimitText(quota?.runsHardLimit)}
              </div>
            </div>

            <div className={metricCardClassName()}>
              <div className="text-sm text-zinc-400">Tokens</div>
              <div className="mt-3 text-5xl font-semibold tracking-tight text-white">
                {formatNumber(quota?.tokensUsed)}
              </div>
              <div className="mt-2 text-sm text-zinc-500">
                Limite dure : {hardLimitText(quota?.tokensHardLimit)}
              </div>
            </div>

            <div className={metricCardClassName()}>
              <div className="text-sm text-zinc-400">HTTP Calls</div>
              <div className="mt-3 text-5xl font-semibold tracking-tight text-white">
                {formatNumber(quota?.httpCallsUsed)}
              </div>
              <div className="mt-2 text-sm text-zinc-500">
                Limite dure : {hardLimitText(quota?.httpCallsHardLimit)}
              </div>
            </div>
          </div>
        </section>

        <section className={cardClassName()}>
          <div className="mb-5">
            <div className={sectionLabelClassName()}>Entitlements</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Capacités actives
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={badgeClassName(entitlements?.canAccessDashboard ? "success" : "default")}>
              Dashboard: {entitlements?.canAccessDashboard ? "ON" : "OFF"}
            </span>
            <span className={badgeClassName(entitlements?.canRunHttp ? "success" : "default")}>
              HTTP: {entitlements?.canRunHttp ? "ON" : "OFF"}
            </span>
            <span className={badgeClassName(entitlements?.canViewIncidents ? "success" : "default")}>
              Incidents: {entitlements?.canViewIncidents ? "ON" : "OFF"}
            </span>
            <span className={badgeClassName(entitlements?.canManagePolicies ? "success" : "default")}>
              Policies: {entitlements?.canManagePolicies ? "ON" : "OFF"}
            </span>
            <span className={badgeClassName(entitlements?.canManageTools ? "success" : "default")}>
              Tools: {entitlements?.canManageTools ? "ON" : "OFF"}
            </span>
            <span className={badgeClassName(entitlements?.canManageWorkspaces ? "success" : "default")}>
              Workspaces: {entitlements?.canManageWorkspaces ? "ON" : "OFF"}
            </span>
            <span className={badgeClassName(entitlements?.canManageBilling ? "success" : "default")}>
              Billing: {entitlements?.canManageBilling ? "ON" : "OFF"}
            </span>
          </div>
        </section>

        <section className={cardClassName()}>
          <div className="mb-5">
            <div className={sectionLabelClassName()}>Company Surfaces</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Navigation rapide
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <a
              href="/workspaces"
              className="inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
            >
              Ouvrir Workspaces
            </a>

            <a
              href="/overview"
              className="inline-flex items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/12 px-4 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/18"
            >
              Ouvrir Overview
            </a>

            <a
              href="/settings"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir Settings
            </a>

            <a
              href="/commands"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir Commands
            </a>

            <a
              href="/events"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir Events
            </a>

            <a
              href="/incidents"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir Incidents
            </a>

            <a
              href="/policies"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
            >
              Ouvrir Policies
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
