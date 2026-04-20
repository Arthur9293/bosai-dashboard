import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import {
  getDashboardRouteForWorkspaceCategory,
  getWorkspaceActivateRoute,
} from "@/lib/workspaces/resolver";
import {
  WORKSPACE_ROUTE_MEMORY_COOKIE_NAME,
  getRememberedRouteForWorkspace,
  readWorkspaceRememberedRoutes,
} from "@/lib/workspaces/route-memory";
import type { WorkspaceSummary } from "@/lib/workspaces/types";

function text(value?: string | null): string {
  return String(value || "").trim();
}

function pageWrapClassName(): string {
  return "min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8";
}

function shellClassName(): string {
  return "mx-auto max-w-6xl space-y-8";
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
  variant: "default" | "primary" | "soft" = "default"
): string {
  const base =
    "inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition";

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "soft") {
    return `${base} border border-sky-500/20 bg-sky-500/12 text-sky-300 hover:bg-sky-500/18`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function categoryTone(
  category?: string
): "default" | "success" | "warning" | "danger" | "info" | "violet" {
  const normalized = text(category).toLowerCase();

  if (normalized === "agency") return "violet";
  if (normalized === "company") return "info";
  if (normalized === "freelance") return "success";
  if (normalized === "personal") return "default";

  return "default";
}

function roleTone(
  role?: string
): "default" | "success" | "warning" | "danger" | "info" | "violet" {
  const normalized = text(role).toLowerCase();

  if (normalized === "owner") return "success";
  if (normalized === "admin") return "info";
  if (normalized === "viewer") return "warning";

  return "default";
}

function statusTone(
  status?: string
): "default" | "success" | "warning" | "danger" | "info" | "violet" {
  const normalized = text(status).toLowerCase();

  if (normalized === "active") return "success";
  if (normalized === "pending") return "warning";
  if (normalized === "blocked") return "danger";

  return "default";
}

function shouldShowPlanBadge(workspace: WorkspaceSummary): boolean {
  const category = text(workspace.category).toLowerCase();
  const plan = text(workspace.plan).toLowerCase();

  if (!plan) return false;
  return category !== plan;
}

function WorkspaceSelectCard({
  workspace,
  isActive,
  rememberedRoute,
}: {
  workspace: WorkspaceSummary;
  isActive: boolean;
  rememberedRoute?: string;
}) {
  const laneHref = getDashboardRouteForWorkspaceCategory(workspace.category);
  const preferredTarget = text(rememberedRoute) || laneHref;

  const activateHref = getWorkspaceActivateRoute({
    workspaceId: workspace.workspaceId,
    nextPath: preferredTarget,
  });

  const primaryHref = isActive ? preferredTarget : activateHref;
  const primaryLabel = isActive ? "Continuer" : "Activer cet espace";

  return (
    <article className={compactCardClassName()}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className={badgeClassName(categoryTone(workspace.category))}>
            {workspace.category.toUpperCase()}
          </span>

          {shouldShowPlanBadge(workspace) ? (
            <span className={badgeClassName("violet")}>
              {workspace.plan.toUpperCase()}
            </span>
          ) : null}

          <span className={badgeClassName(roleTone(workspace.membershipRole))}>
            {workspace.membershipRole.toUpperCase()}
          </span>

          <span className={badgeClassName(statusTone(workspace.status))}>
            {workspace.status.toUpperCase()}
          </span>

          {isActive ? (
            <span className={badgeClassName("info")}>ESPACE ACTIF</span>
          ) : null}
        </div>

        <div className="space-y-2">
          <h2 className="break-words text-2xl font-semibold tracking-tight text-white">
            {workspace.name}
          </h2>

          <p className="break-all text-sm text-zinc-400">
            {workspace.workspaceId}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={primaryHref} className={buttonClassName("primary")}>
            {primaryLabel}
          </Link>

          <Link href={laneHref} className={buttonClassName("soft")}>
            Ouvrir la surface principale
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function WorkspaceSelectPage() {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const user = session.user;
  const memberships = session.context?.memberships ?? [];
  const activeWorkspaceId =
    session.context?.activeWorkspace?.workspaceId ||
    session.cookieSnapshot.activeWorkspaceId;

  if (memberships.length === 0) {
    redirect("/workspace/create");
  }

  if (memberships.length === 1) {
    const onlyWorkspace = memberships[0];

    redirect(
      getWorkspaceActivateRoute({
        workspaceId: onlyWorkspace.workspaceId,
        nextPath: getDashboardRouteForWorkspaceCategory(onlyWorkspace.category),
      })
    );
  }

  const cookieStore = await cookies();
  const rememberedRoutes = readWorkspaceRememberedRoutes(
    cookieStore.get(WORKSPACE_ROUTE_MEMORY_COOKIE_NAME)?.value
  );

  const sortedMemberships = [...memberships].sort((a, b) => {
    if (a.workspaceId === activeWorkspaceId) return -1;
    if (b.workspaceId === activeWorkspaceId) return 1;
    if (a.isDefault && !b.isDefault) return -1;
    if (b.isDefault && !a.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <main className={pageWrapClassName()}>
      <div className={shellClassName()}>
        <section className="space-y-4 border-b border-white/10 pb-6">
          <div className={sectionLabelClassName()}>Sélecteur d’espace</div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Choisir un espace
            </h1>

            <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
              Sélectionne l’espace actif. L’accueil workspace et les surfaces
              visibles dépendront de l’espace activé.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {user?.displayName ? (
              <span className={badgeClassName("default")}>
                {user.displayName}
              </span>
            ) : null}

            {user?.email ? (
              <span className={badgeClassName("default")}>{user.email}</span>
            ) : null}

            <span className={badgeClassName("info")}>
              {sortedMemberships.length} espace(s)
            </span>
          </div>
        </section>

        <section className={cardClassName()}>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className={sectionLabelClassName()}>Memberships</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
                Espaces accessibles
              </div>
            </div>

            {activeWorkspaceId ? (
              <span className={badgeClassName("info")}>
                Actif : {activeWorkspaceId}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sortedMemberships.map((workspace) => (
              <WorkspaceSelectCard
                key={workspace.workspaceId}
                workspace={workspace}
                isActive={workspace.workspaceId === activeWorkspaceId}
                rememberedRoute={getRememberedRouteForWorkspace(
                  rememberedRoutes,
                  workspace.workspaceId
                )}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
