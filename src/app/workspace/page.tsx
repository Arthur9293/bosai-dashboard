import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import { resolveWorkspaceAccess } from "@/lib/workspaces/resolver";

type ButtonVariant = "default" | "primary" | "soft";
type BadgeVariant = "default" | "success" | "info" | "warning" | "violet";

type SurfaceLink = {
  href: string;
  label: string;
  variant?: ButtonVariant;
};

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

function badgeClassName(variant: BadgeVariant = "default"): string {
  if (variant === "success") {
    return "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300";
  }

  if (variant === "info") {
    return "inline-flex rounded-full border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300";
  }

  if (variant === "warning") {
    return "inline-flex rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300";
  }

  if (variant === "violet") {
    return "inline-flex rounded-full border border-violet-500/20 bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300";
  }

  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300";
}

function buttonClassName(variant: ButtonVariant = "default"): string {
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

function categoryTone(category?: string | null): BadgeVariant {
  const normalized = text(category).toLowerCase();

  if (normalized === "agency") return "violet";
  if (normalized === "company") return "info";
  if (normalized === "freelance") return "success";
  return "default";
}

function shouldShowPlanBadge(
  plan?: string | null,
  category?: string | null
): boolean {
  const normalizedPlan = text(plan).toLowerCase();
  const normalizedCategory = text(category).toLowerCase();

  return Boolean(normalizedPlan) && normalizedPlan !== normalizedCategory;
}

function getWorkspaceDescription(category?: string | null): string {
  const normalized = text(category).toLowerCase();

  if (normalized === "agency") {
    return "Hub du workspace actif. Cette vue sert de point d’entrée avant d’ouvrir les flows et les surfaces d’exploitation.";
  }

  if (normalized === "freelance") {
    return "Hub du workspace actif. Cette vue centralise les informations utiles avant d’ouvrir les commands et les surfaces de travail.";
  }

  if (normalized === "company") {
    return "Hub du workspace actif. Cette vue centralise la lecture métier, les quotas et les accès utiles avant d’ouvrir les surfaces opérationnelles.";
  }

  return "Hub du workspace actif. Cette vue sert de point d’entrée simple pour lire l’état du workspace et ouvrir les surfaces autorisées.";
}

function getPrimaryAction(args: {
  category?: string | null;
  canManageWorkspaces: boolean;
}): SurfaceLink {
  const normalized = text(args.category).toLowerCase();

  if (normalized === "agency") {
    return { href: "/flows", label: "Ouvrir Flows", variant: "primary" };
  }

  if (normalized === "freelance") {
    return { href: "/commands", label: "Ouvrir Commands", variant: "primary" };
  }

  if (normalized === "company" && args.canManageWorkspaces) {
    return {
      href: "/workspaces",
      label: "Ouvrir Workspaces",
      variant: "primary",
    };
  }

  return { href: "/overview", label: "Ouvrir Overview", variant: "primary" };
}

function buildSurfaceLinks(args: {
  category?: string | null;
  canRunHttp: boolean;
  canViewIncidents: boolean;
  canManagePolicies: boolean;
  canManageWorkspaces: boolean;
}): SurfaceLink[] {
  const normalizedCategory = text(args.category).toLowerCase();

  const items: Array<SurfaceLink | null> = [
    {
      href: "/workspace/select",
      label: "Changer d’espace",
      variant: "soft",
    },
    {
      href: "/overview",
      label: "Ouvrir Overview",
    },
    {
      href: "/events",
      label: "Ouvrir Events",
    },
    {
      href: "/settings",
      label: "Ouvrir Settings",
    },
  ];

  if (normalizedCategory === "agency") {
    items.push(
      { href: "/commands", label: "Ouvrir Commands" },
      args.canViewIncidents
        ? { href: "/incidents", label: "Ouvrir Incidents" }
        : null
    );
  } else if (normalizedCategory === "freelance") {
    items.push(
      args.canViewIncidents
        ? { href: "/incidents", label: "Ouvrir Incidents" }
        : null
    );
  } else if (normalizedCategory === "company") {
    items.push(
      args.canManageWorkspaces
        ? { href: "/workspaces", label: "Ouvrir Workspaces" }
        : null,
      args.canRunHttp ? { href: "/commands", label: "Ouvrir Commands" } : null,
      args.canViewIncidents
        ? { href: "/incidents", label: "Ouvrir Incidents" }
        : null,
      args.canManagePolicies
        ? { href: "/policies", label: "Ouvrir Policies" }
        : null
    );
  }

  const seen = new Set<string>();
  const cleaned: SurfaceLink[] = [];

  for (const item of items) {
    if (!item) continue;

    const href = text(item.href);
    if (!href || seen.has(href)) continue;

    seen.add(href);
    cleaned.push(item);
  }

  return cleaned;
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

  const quota = resolution.context?.quota || null;
  const entitlements = resolution.context?.entitlements || null;

  const canRunHttp = Boolean(entitlements?.canRunHttp);
  const canViewIncidents = Boolean(entitlements?.canViewIncidents);
  const canManagePolicies = Boolean(entitlements?.canManagePolicies);
  const canManageWorkspaces = Boolean(entitlements?.canManageWorkspaces);

  const primaryAction = getPrimaryAction({
    category: activeWorkspace.category,
    canManageWorkspaces,
  });

  const secondaryLinks = buildSurfaceLinks({
    category: activeWorkspace.category,
    canRunHttp,
    canViewIncidents,
    canManagePolicies,
    canManageWorkspaces,
  }).filter((item) => item.href !== primaryAction.href);

  return (
    <main className={pageWrapClassName()}>
      <div className={shellClassName()}>
        <section className="space-y-4 border-b border-white/10 pb-6">
          <div className={sectionLabelClassName()}>Workspace Hub</div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {activeWorkspace.name}
            </h1>

            <p className="max-w-4xl text-base text-zinc-400 sm:text-lg">
              {getWorkspaceDescription(activeWorkspace.category)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={badgeClassName(categoryTone(activeWorkspace.category))}>
              {activeWorkspace.category.toUpperCase()}
            </span>

            <span className={badgeClassName("success")}>
              {activeWorkspace.membershipRole.toUpperCase()}
            </span>

            <span className={badgeClassName("success")}>
              {activeWorkspace.status.toUpperCase()}
            </span>

            {shouldShowPlanBadge(activeWorkspace.plan, activeWorkspace.category) ? (
              <span className={badgeClassName("default")}>
                {activeWorkspace.plan.toUpperCase()}
              </span>
            ) : null}

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
            <div className={compactCardClassName()}>
              <div className={sectionLabelClassName()}>Workspace ID</div>
              <div className="mt-3 break-all text-2xl font-semibold text-white">
                {activeWorkspace.workspaceId}
              </div>
            </div>

            <div className={compactCardClassName()}>
              <div className={sectionLabelClassName()}>Slug</div>
              <div className="mt-3 break-all text-2xl font-semibold text-white">
                {activeWorkspace.slug}
              </div>
            </div>

            <div className={compactCardClassName()}>
              <div className={sectionLabelClassName()}>Plan</div>
              <div className="mt-3 text-2xl font-semibold text-white">
                {activeWorkspace.plan}
              </div>
            </div>

            <div className={compactCardClassName()}>
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard
              label="Runs"
              value={formatNumber(quota?.runsUsed)}
              hint={`Limite dure : ${hardLimitText(quota?.runsHardLimit)}`}
            />

            <MetricCard
              label="Tokens"
              value={formatNumber(quota?.tokensUsed)}
              hint={`Limite dure : ${hardLimitText(quota?.tokensHardLimit)}`}
            />

            <MetricCard
              label="HTTP Calls"
              value={formatNumber(quota?.httpCallsUsed)}
              hint={`Limite dure : ${hardLimitText(quota?.httpCallsHardLimit)}`}
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
            <div className={sectionLabelClassName()}>Workspace Surfaces</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Navigation rapide
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Link
              href={primaryAction.href}
              className={buttonClassName(primaryAction.variant || "primary")}
            >
              {primaryAction.label}
            </Link>

            {secondaryLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={buttonClassName(item.variant || "default")}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
