import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import {
  getDashboardRouteForWorkspaceCategory,
  getWorkspaceActivateRoute,
} from "@/lib/workspaces/resolver";
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

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
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

function categoryTone(
  category?: string
): "default" | "success" | "warning" | "danger" | "info" | "violet" {
  const normalized = text(category).toLowerCase();

  if (normalized === "agency") return "violet";
  if (normalized === "company") return "info";
  if (normalized === "freelance") return "success";

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

function WorkspaceCard({
  workspace,
  isActive,
}: {
  workspace: WorkspaceSummary;
  isActive: boolean;
}) {
  const activateHref = getWorkspaceActivateRoute({
    workspaceId: workspace.workspaceId,
    nextPath: "/workspace/home",
  });

  return (
    <article className={cardClassName()}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className={sectionLabelClassName()}>Workspace</div>

          <div className="flex flex-wrap gap-2">
            <span className={badgeClassName(categoryTone(workspace.category))}>
              {workspace.category.toUpperCase()}
            </span>

            <span className={badgeClassName("violet")}>
              {workspace.plan.toUpperCase()}
            </span>

            <span className={badgeClassName(roleTone(workspace.membershipRole))}>
              {workspace.membershipRole.toUpperCase()}
            </span>

            <span
              className={badgeClassName(
                workspace.status === "active" ? "success" : "warning"
              )}
            >
              {workspace.status.toUpperCase()}
            </span>

            {isActive ? (
              <span className={badgeClassName("info")}>ACTIVE SPACE</span>
            ) : null}
          </div>

          <div>
            <div className="text-2xl font-semibold tracking-tight text-white">
              {workspace.name}
            </div>
            <div className="mt-2 break-all text-sm text-zinc-400">
              {workspace.workspaceId}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 sm:grid-cols-2">
          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Slug</div>
            <div className="mt-2 text-zinc-200">{workspace.slug || "—"}</div>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Membership status</div>
            <div className="mt-2 text-zinc-200">
              {workspace.membershipStatus || "—"}
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3 sm:flex-row">
          {isActive ? (
            <Link href="/workspace/home" className={buttonClassName("primary")}>
              Continuer
            </Link>
          ) : (
            <Link href={activateHref} className={buttonClassName("primary")}>
              Activer cet espace
            </Link>
          )}

          <Link
            href={getDashboardRouteForWorkspaceCategory(workspace.category)}
            className={buttonClassName("soft")}
          >
            Ouvrir la lane
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

  const memberships = session.context?.memberships ?? [];
  const activeWorkspaceId =
    session.context?.activeWorkspace?.workspaceId ||
    session.cookieSnapshot.activeWorkspaceId;

  if (memberships.length === 0) {
    redirect("/workspace/create");
  }

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
          <div className={sectionLabelClassName()}>Workspace resolver</div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Choisir un espace
            </h1>

            <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
              Sélectionne l’espace actif. Ton hub et les surfaces visibles
              dépendront du workspace activé.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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

            <span className={badgeClassName("info")}>
              {sortedMemberships.length} workspace(s)
            </span>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {sortedMemberships.map((workspace) => (
            <WorkspaceCard
              key={workspace.workspaceId}
              workspace={workspace}
              isActive={workspace.workspaceId === activeWorkspaceId}
            />
          ))}
        </section>
      </div>
    </main>
  );
}
