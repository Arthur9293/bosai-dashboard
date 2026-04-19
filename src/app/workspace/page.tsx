import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import { resolveWorkspaceAccess } from "@/lib/workspaces/resolver";

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
  tone: "default" | "success" | "info" | "warning" | "violet" = "default"
): string {
  if (tone === "success") {
    return "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300";
  }

  if (tone === "info") {
    return "inline-flex rounded-full border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300";
  }

  if (tone === "warning") {
    return "inline-flex rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300";
  }

  if (tone === "violet") {
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

function formatNumber(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("fr-FR").format(value);
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className={compactCardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-2 text-sm text-zinc-500">{hint}</div>
    </div>
  );
}

function CapabilityBadge({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <span className={badgeClassName(enabled ? "success" : "default")}>
      {label}: {enabled ? "ON" : "OFF"}
    </span>
  );
}

export default async function WorkspaceIndexPage() {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const resolution = await resolveWorkspaceAccess({
    userId: text(session.user?.userId),
    requestedWorkspaceId: text(session.cookieSnapshot.activeWorkspaceId),
    nextPath: "/workspace",
  });

  if (resolution.kind !== "allow_dashboard") {
    redirect(resolution.redirectTo);
  }

  const activeWorkspace = resolution.activeWorkspace;

  if (!activeWorkspace) {
    redirect("/workspace/select");
  }

  if (text(activeWorkspace.category).toLowerCase() !== "company") {
    if (text(activeWorkspace.category).toLowerCase() === "agency") {
      redirect("/flows");
    }

    if (text(activeWorkspace.category).toLowerCase() === "freelance") {
      redirect("/commands");
    }

    redirect("/overview");
  }

  const user = session.user;
  const context = resolution.context;
  const quota = context?.quota || null;
  const entitlements = context?.entitlements || null;
  const membershipsCount =
    context?.memberships?.length || resolution.memberships.length || 0;

  const commandsCount = formatNumber(
    typeof quota?.runsUsed === "number" ? quota.runsUsed : null
  );
  const tokensCount = formatNumber(
    typeof quota?.tokensUsed === "number" ? quota.tokensUsed : null
  );
  const httpCallsCount = formatNumber(
    typeof quota?.httpCallsUsed === "number" ? quota.httpCallsUsed : null
  );

  return (
    <main className={pageWrapClassName()}>
      <div className={shellClassName()}>
        <section className="space-y-4 border-b border-white/10 pb-6">
          <div className={sectionLabelClassName()}>Workspace Company Hub</div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {activeWorkspace.name}
            </h1>

            <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
              Hub company du workspace actif. Cette vue centralise la lecture
              métier, les quotas et les accès utiles avant d’ouvrir les surfaces
              opérationnelles.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={badgeClassName("info")}>COMPANY</span>
            <span className={badgeClassName("success")}>
              {activeWorkspace.membershipRole.toUpperCase()}
            </span>
            <span className={badgeClassName("success")}>
              {activeWorkspace.status.toUpperCase()}
            </span>

            {user?.displayName ? (
              <span className={badgeClassName()}>{user.displayName}</span>
            ) : null}

            {user?.email ? (
              <span className={badgeClassName()}>{user.email}</span>
            ) : null}
          </div>
        </section>

        <section className={cardClassName()}>
          <div className="mb-5">
            <div className={sectionLabelClassName()}>Active workspace</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Détail du workspace courant
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={compactCardClassName()}>
              <div className={sectionLabelClassName()}>Workspace ID</div>
              <div className="mt-3 break-all text-xl font-medium text-white">
                {activeWorkspace.workspaceId}
              </div>
            </div>

            <div className={compactCardClassName()}>
              <div className={sectionLabelClassName()}>Slug</div>
              <div className="mt-3 break-all text-xl font-medium text-white">
                {activeWorkspace.slug}
              </div>
            </div>

            <div className={compactCardClassName()}>
              <div className={sectionLabelClassName()}>Plan</div>
              <div className="mt-3 text-xl font-medium text-white">
                {activeWorkspace.plan}
              </div>
            </div>

            <div className={compactCardClassName()}>
              <div className={sectionLabelClassName()}>Memberships</div>
              <div className="mt-3 text-xl font-medium text-white">
                {membershipsCount}
              </div>
            </div>
          </div>
        </section>

        <section className={cardClassName()}>
          <div className="mb-5">
            <div className={sectionLabelClassName()}>Quota snapshot</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Usage courant
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard
              label="Runs"
              value={commandsCount}
              hint={
                quota?.runsHardLimit
                  ? `Limite dure : ${formatNumber(quota.runsHardLimit)}`
                  : "Aucune limite dure visible"
              }
            />

            <MetricCard
              label="Tokens"
              value={tokensCount}
              hint={
                quota?.tokensHardLimit
                  ? `Limite dure : ${formatNumber(quota.tokensHardLimit)}`
                  : "Aucune limite dure visible"
              }
            />

            <MetricCard
              label="HTTP Calls"
              value={httpCallsCount}
              hint={
                quota?.httpCallsHardLimit
                  ? `Limite dure : ${formatNumber(quota.httpCallsHardLimit)}`
                  : "Aucune limite dure visible"
              }
            />
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
            <CapabilityBadge
              label="Dashboard"
              enabled={Boolean(entitlements?.canAccessDashboard)}
            />
            <CapabilityBadge
              label="HTTP"
              enabled={Boolean(entitlements?.canRunHttp)}
            />
            <CapabilityBadge
              label="Incidents"
              enabled={Boolean(entitlements?.canViewIncidents)}
            />
            <CapabilityBadge
              label="Policies"
              enabled={Boolean(entitlements?.canManagePolicies)}
            />
            <CapabilityBadge
              label="Tools"
              enabled={Boolean(entitlements?.canManageTools)}
            />
            <CapabilityBadge
              label="Workspaces"
              enabled={Boolean(entitlements?.canManageWorkspaces)}
            />
            <CapabilityBadge
              label="Billing"
              enabled={Boolean(entitlements?.canManageBilling)}
            />
          </div>
        </section>

        <section className={cardClassName()}>
          <div className="mb-5">
            <div className={sectionLabelClassName()}>Company surfaces</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Navigation rapide
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Link href="/workspaces" className={buttonClassName("primary")}>
              Ouvrir Workspaces
            </Link>

            <Link href="/overview" className={buttonClassName("soft")}>
              Ouvrir Overview
            </Link>

            <Link href="/settings" className={buttonClassName()}>
              Ouvrir Settings
            </Link>

            <Link href="/commands" className={buttonClassName()}>
              Ouvrir Commands
            </Link>

            <Link href="/events" className={buttonClassName()}>
              Ouvrir Events
            </Link>

            {entitlements?.canViewIncidents ? (
              <Link href="/incidents" className={buttonClassName()}>
                Ouvrir Incidents
              </Link>
            ) : null}

            {entitlements?.canManagePolicies ? (
              <Link href="/policies" className={buttonClassName()}>
                Ouvrir Policies
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
