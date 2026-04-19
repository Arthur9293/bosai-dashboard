import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardCard } from "@/components/ui/dashboard-card";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import {
  getDashboardRouteForWorkspaceCategory,
  resolveWorkspaceAccess,
} from "@/lib/workspaces/resolver";

type HomeCard = {
  title: string;
  description: string;
  href: string;
  tone?: "default" | "primary" | "soft";
};

function text(value?: string | number | boolean | null): string {
  return String(value ?? "").trim();
}

function cardButtonClassName(
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

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toCount(value: unknown): string {
  if (Array.isArray(value)) return String(value.length);
  if (value && typeof value === "object") return String(Object.keys(value).length);
  return "0";
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

function getCategoryHeadline(category?: string): string {
  const normalized = text(category).toLowerCase();

  if (normalized === "agency") {
    return "Espace agence orienté orchestration, flows et incidents.";
  }

  if (normalized === "company") {
    return "Espace entreprise orienté workspaces, quotas et exploitation.";
  }

  if (normalized === "freelance") {
    return "Espace freelance orienté exécution, commands et runs utiles.";
  }

  if (normalized === "personal") {
    return "Espace personnel orienté lecture simple et pilotage léger.";
  }

  return "Espace BOSAI dédié au workspace actif.";
}

function getCategoryCards(category?: string): HomeCard[] {
  const normalized = text(category).toLowerCase();

  if (normalized === "agency") {
    return [
      {
        title: "Flows",
        description: "Ouvrir la lecture principale des chaînes d’exécution.",
        href: "/flows",
        tone: "primary",
      },
      {
        title: "Incidents",
        description: "Surveiller les incidents ouverts, escaladés et critiques.",
        href: "/incidents",
        tone: "soft",
      },
      {
        title: "Commands",
        description: "Contrôler les commands actives, en retry ou en erreur.",
        href: "/commands",
      },
      {
        title: "SLA",
        description: "Lire les signaux breached, escalated et queued.",
        href: "/sla",
      },
    ];
  }

  if (normalized === "company") {
    return [
      {
        title: "Workspaces",
        description: "Piloter les tenants visibles, quotas et détails par espace.",
        href: "/workspaces",
        tone: "primary",
      },
      {
        title: "Settings",
        description: "Lire les réglages workspace, quota et posture d’exploitation.",
        href: "/settings",
        tone: "soft",
      },
      {
        title: "Overview",
        description: "Voir le résumé global du control plane.",
        href: "/overview",
      },
      {
        title: "SLA",
        description: "Suivre la couche contractuelle et la pression opérationnelle.",
        href: "/sla",
      },
    ];
  }

  if (normalized === "freelance") {
    return [
      {
        title: "Commands",
        description: "Entrée principale pour piloter l’exécution utile.",
        href: "/commands",
        tone: "primary",
      },
      {
        title: "Runs",
        description: "Lire les runs en cours, terminés et en erreur.",
        href: "/runs",
        tone: "soft",
      },
      {
        title: "Overview",
        description: "Garder une vue d’ensemble du cockpit.",
        href: "/overview",
      },
      {
        title: "Events",
        description: "Vérifier la source amont et la création des commands.",
        href: "/events",
      },
    ];
  }

  return [
    {
      title: "Overview",
      description: "Point d’entrée simple du workspace actif.",
      href: "/overview",
      tone: "primary",
    },
    {
      title: "Settings",
      description: "Lecture des réglages et du contexte workspace.",
      href: "/settings",
      tone: "soft",
    },
    {
      title: "Events",
      description: "Consulter l’activité remontée par la source.",
      href: "/events",
    },
    {
      title: "Commands",
      description: "Voir les actions exécutées côté control plane.",
      href: "/commands",
    },
  ];
}

function ActionCard({ item }: { item: HomeCard }) {
  return (
    <DashboardCard>
      <div className="space-y-4">
        <div>
          <div className="text-lg font-semibold text-white">{item.title}</div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
        </div>

        <div className="pt-1">
          <Link href={item.href} className={cardButtonClassName(item.tone || "default")}>
            Ouvrir {item.title}
          </Link>
        </div>
      </div>
    </DashboardCard>
  );
}

function MetaCard({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
      <div className={metaLabelClassName()}>{label}</div>
      <div className={`mt-2 text-zinc-200 ${breakAll ? "break-all" : ""}`}>
        {value || "—"}
      </div>
    </div>
  );
}

export default async function WorkspaceHomePage() {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const resolution = resolveWorkspaceAccess({
    userId: session.user?.userId ?? "",
    requestedWorkspaceId: session.cookieSnapshot.activeWorkspaceId ?? "",
    nextPath: "/workspace/home",
  });

  if (resolution.kind !== "allow_dashboard" || !resolution.activeWorkspace) {
    redirect(resolution.redirectTo);
  }

  const activeWorkspace = resolution.activeWorkspace;
  const category = text(activeWorkspace.category).toLowerCase();
  const laneTarget = getDashboardRouteForWorkspaceCategory(activeWorkspace.category);
  const quotaRecord = toRecord(resolution.context?.quota);
  const entitlementsRecord = toRecord(resolution.context?.entitlements);

  const allowedCapabilities =
    Array.isArray(entitlementsRecord.allowedCapabilities)
      ? (entitlementsRecord.allowedCapabilities as unknown[]).map((item) => text(String(item)))
      : [];

  const cards = getCategoryCards(activeWorkspace.category);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace Home"
        title={activeWorkspace.name}
        description={getCategoryHeadline(activeWorkspace.category)}
      />

      <section className="flex flex-wrap gap-2">
        <span className={badgeClassName(categoryTone(activeWorkspace.category))}>
          {text(activeWorkspace.category || "workspace").toUpperCase()}
        </span>
        <span className={badgeClassName("violet")}>
          {text(activeWorkspace.plan || "plan").toUpperCase()}
        </span>
        <span className={badgeClassName(roleTone(activeWorkspace.membershipRole))}>
          {text(activeWorkspace.membershipRole || "member").toUpperCase()}
        </span>
        <span
          className={badgeClassName(
            text(activeWorkspace.status).toLowerCase() === "active"
              ? "success"
              : "warning"
          )}
        >
          {text(activeWorkspace.status || "unknown").toUpperCase()}
        </span>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <DashboardCard>
          <div className="text-sm text-zinc-400">Catégorie</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {text(activeWorkspace.category || "—")}
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Plan</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {text(activeWorkspace.plan || "—")}
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Lane cible</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-sky-300">
            {laneTarget}
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Autres espaces</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {Math.max(0, resolution.memberships.length - 1)}
          </div>
        </DashboardCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard
          title="Espace actif"
          subtitle="Identité workspace et posture d’accès."
        >
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetaCard
              label="Workspace ID"
              value={text(activeWorkspace.workspaceId)}
              breakAll
            />
            <MetaCard label="Nom" value={text(activeWorkspace.name)} />
            <MetaCard label="Slug" value={text(activeWorkspace.slug)} />
            <MetaCard label="Category" value={text(activeWorkspace.category)} />
            <MetaCard label="Plan" value={text(activeWorkspace.plan)} />
            <MetaCard
              label="Membership role"
              value={text(activeWorkspace.membershipRole)}
            />
            <MetaCard
              label="Membership status"
              value={text(activeWorkspace.membershipStatus)}
            />
            <MetaCard label="Lane cible" value={laneTarget} breakAll />
          </div>
        </DashboardCard>

        <DashboardCard
          title="Contexte workspace"
          subtitle="Résumé simple du contexte mock actuellement résolu."
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm text-zinc-400">Quota keys</span>
              <span className="text-sm font-medium text-zinc-200">
                {toCount(quotaRecord)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm text-zinc-400">Entitlement keys</span>
              <span className="text-sm font-medium text-zinc-200">
                {toCount(entitlementsRecord)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
              <span className="text-sm text-zinc-400">Allowed capabilities</span>
              <span className="text-sm font-medium text-zinc-200">
                {allowedCapabilities.length}
              </span>
            </div>
          </div>

          {allowedCapabilities.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {allowedCapabilities.slice(0, 8).map((capability) => (
                <span key={capability} className={badgeClassName("default")}>
                  {capability}
                </span>
              ))}
            </div>
          ) : null}
        </DashboardCard>
      </section>

      <section className="space-y-4">
        <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
          Espace dédié
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {cards.map((item) => (
            <ActionCard key={`${category}-${item.title}`} item={item} />
          ))}
        </div>
      </section>

      <section>
        <DashboardCard
          title="Navigation"
          subtitle="Actions rapides autour du workspace actif."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link href={laneTarget} className={cardButtonClassName("primary")}>
              Ouvrir la lane cible
            </Link>

            <Link href="/workspace/select" className={cardButtonClassName("soft")}>
              Changer d’espace
            </Link>

            <Link href="/workspaces" className={cardButtonClassName("default")}>
              Voir Workspaces
            </Link>

            <Link href="/overview" className={cardButtonClassName("default")}>
              Ouvrir Overview
            </Link>
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
