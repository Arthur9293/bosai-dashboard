import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import type {
  WorkspaceEntitlements,
  WorkspaceSummary,
} from "@/lib/workspaces/types";

type HubCard = {
  title: string;
  description: string;
  href: string;
  tone?: "default" | "primary" | "soft";
};

type FocusCard = {
  label: string;
  title: string;
  value: string;
  helper: string;
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

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
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

function getDashboardRouteForCategory(category?: string | null): string {
  const normalized = text(category).toLowerCase();

  if (normalized === "agency") return "/flows";
  if (normalized === "company") return "/workspaces";
  if (normalized === "freelance") return "/commands";

  return "/overview";
}

function getCategoryHeadline(category?: string | null): string {
  const normalized = text(category).toLowerCase();

  if (normalized === "agency") {
    return "Espace agence orienté flows, incidents et orchestration visible.";
  }

  if (normalized === "company") {
    return "Espace entreprise orienté workspaces, settings et pilotage d’exploitation.";
  }

  if (normalized === "freelance") {
    return "Espace freelance orienté commands, runs et exécution utile.";
  }

  return "Espace personnel orienté lecture simple et accès direct aux surfaces utiles.";
}

function getCategoryCards(category?: string | null): HubCard[] {
  const normalized = text(category).toLowerCase();

  if (normalized === "agency") {
    return [
      {
        title: "Flows",
        description: "Entrée principale pour suivre les chaînes d’exécution.",
        href: "/flows",
        tone: "primary",
      },
      {
        title: "Incidents",
        description: "Suivre les incidents ouverts, critiques et escaladés.",
        href: "/incidents",
        tone: "soft",
      },
      {
        title: "Commands",
        description: "Contrôler l’activité runtime, retry et erreurs.",
        href: "/commands",
      },
      {
        title: "SLA",
        description: "Lire la pression contractuelle et opérationnelle.",
        href: "/sla",
      },
    ];
  }

  if (normalized === "company") {
    return [
      {
        title: "Workspaces",
        description: "Piloter les tenants, quotas et détails d’espace.",
        href: "/workspaces",
        tone: "primary",
      },
      {
        title: "Settings",
        description: "Lire les réglages visibles de la plateforme.",
        href: "/settings",
        tone: "soft",
      },
      {
        title: "Overview",
        description: "Voir la posture globale du cockpit.",
        href: "/overview",
      },
      {
        title: "Policies",
        description: "Consulter les politiques visibles et leurs détails.",
        href: "/policies",
      },
    ];
  }

  if (normalized === "freelance") {
    return [
      {
        title: "Commands",
        description: "Entrée principale pour piloter l’exécution.",
        href: "/commands",
        tone: "primary",
      },
      {
        title: "Runs",
        description: "Lire les runs en cours, terminés ou en erreur.",
        href: "/runs",
        tone: "soft",
      },
      {
        title: "Events",
        description: "Vérifier la source amont et le traitement.",
        href: "/events",
      },
      {
        title: "Overview",
        description: "Conserver une lecture synthétique du système.",
        href: "/overview",
      },
    ];
  }

  return [
    {
      title: "Overview",
      description: "Point d’entrée principal du workspace actif.",
      href: "/overview",
      tone: "primary",
    },
    {
      title: "Settings",
      description: "Lire les réglages visibles du cockpit.",
      href: "/settings",
      tone: "soft",
    },
    {
      title: "Commands",
      description: "Voir les actions exécutées par le control plane.",
      href: "/commands",
    },
    {
      title: "Events",
      description: "Consulter l’activité remontée par la source.",
      href: "/events",
    },
  ];
}

function getEntitlementItems(entitlements?: WorkspaceEntitlements | null) {
  const source = entitlements || {
    canAccessDashboard: false,
    canRunHttp: false,
    canViewIncidents: false,
    canManagePolicies: false,
    canManageTools: false,
    canManageWorkspaces: false,
    canManageBilling: false,
  };

  return [
    ["Dashboard", source.canAccessDashboard],
    ["HTTP", source.canRunHttp],
    ["Incidents", source.canViewIncidents],
    ["Policies", source.canManagePolicies],
    ["Tools", source.canManageTools],
    ["Workspaces", source.canManageWorkspaces],
    ["Billing", source.canManageBilling],
  ] as const;
}

function shouldShowPlanBadge(workspace: WorkspaceSummary): boolean {
  const category = text(workspace.category).toLowerCase();
  const plan = text(workspace.plan).toLowerCase();

  if (!plan) return false;
  return category !== plan;
}

function getAgencyFocusCards(
  memberships: WorkspaceSummary[],
  entitlements?: WorkspaceEntitlements | null
): FocusCard[] {
  const incidentAccess = entitlements?.canViewIncidents ? "ON" : "OFF";
  const policyAccess = entitlements?.canManagePolicies ? "ON" : "OFF";
  const workspaceAccess = entitlements?.canManageWorkspaces ? "ON" : "OFF";

  return [
    {
      label: "Ops mode",
      title: "Pilotage agence",
      value: "Agency",
      helper: "Flows, incidents, SLA et surfaces d’orchestration.",
    },
    {
      label: "Workspace portfolio",
      title: "Espaces pilotables",
      value: String(memberships.length),
      helper: "Nombre d’espaces visibles depuis le hub actif.",
    },
    {
      label: "Incident access",
      title: "Incidents",
      value: incidentAccess,
      helper: "Capacité de lecture des incidents opérationnels.",
    },
    {
      label: "Control surface",
      title: "Policies / Workspaces",
      value: `${policyAccess} / ${workspaceAccess}`,
      helper: "Niveau de contrôle sur gouvernance et espaces.",
    },
  ];
}

function ActionCard({ item }: { item: HubCard }) {
  return (
    <article className={cardClassName()}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-3">
          <div className={sectionLabelClassName()}>Dedicated lane</div>
          <div className="text-2xl font-semibold tracking-tight text-white">
            {item.title}
          </div>
          <p className="text-sm leading-6 text-zinc-400">{item.description}</p>
        </div>

        <div className="mt-auto">
          <Link href={item.href} className={buttonClassName(item.tone || "default")}>
            Ouvrir {item.title}
          </Link>
        </div>
      </div>
    </article>
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

function WorkspaceCard({
  workspace,
  isActive,
}: {
  workspace: WorkspaceSummary;
  isActive: boolean;
}) {
  return (
    <article className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className={badgeClassName(categoryTone(workspace.category))}>
            {workspace.category.toUpperCase()}
          </span>
          <span className={badgeClassName(roleTone(workspace.membershipRole))}>
            {workspace.membershipRole.toUpperCase()}
          </span>
          <span className={badgeClassName(statusTone(workspace.status))}>
            {workspace.status.toUpperCase()}
          </span>
          {isActive ? (
            <span className={badgeClassName("info")}>ACTIVE SPACE</span>
          ) : null}
        </div>

        <div>
          <div className="text-base font-semibold text-white">{workspace.name}</div>
          <div className="mt-1 break-all text-sm text-zinc-400">
            {workspace.workspaceId}
          </div>
        </div>
      </div>
    </article>
  );
}

function FocusCardItem({ item }: { item: FocusCard }) {
  return (
    <article className={cardClassName()}>
      <div className="space-y-3">
        <div className={sectionLabelClassName()}>{item.label}</div>
        <div className="text-xl font-semibold tracking-tight text-white">
          {item.title}
        </div>
        <div className="text-4xl font-semibold tracking-tight text-sky-300">
          {item.value}
        </div>
        <div className="text-sm leading-6 text-zinc-400">{item.helper}</div>
      </div>
    </article>
  );
}

function AgencyOperatingView({
  memberships,
  entitlements,
}: {
  memberships: WorkspaceSummary[];
  entitlements?: WorkspaceEntitlements | null;
}) {
  const focusCards = getAgencyFocusCards(memberships, entitlements);

  return (
    <section className="space-y-4">
      <div className={sectionLabelClassName()}>Agency operating view</div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {focusCards.map((item) => (
          <FocusCardItem
            key={`${item.label}-${item.title}-${item.value}`}
            item={item}
          />
        ))}
      </div>

      <div className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">
          Priorité opérationnelle agence
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/flows" className={buttonClassName("primary")}>
            Ouvrir Flows
          </Link>
          <Link href="/incidents" className={buttonClassName("soft")}>
            Ouvrir Incidents
          </Link>
          <Link href="/sla" className={buttonClassName("default")}>
            Ouvrir SLA
          </Link>
          <Link href="/workspaces" className={buttonClassName("default")}>
            Ouvrir Workspaces
          </Link>
        </div>

        <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
          <div className={metaLabelClassName()}>Agency quick read</div>
          <div className="mt-2 text-sm leading-6 text-zinc-300">
            Cette home agence sert de cockpit d’entrée pour piloter les flows,
            surveiller les incidents, lire la pression SLA et basculer rapidement
            entre les espaces clients ou internes.
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function WorkspaceHomePage() {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const memberships = session.context?.memberships ?? [];
  const activeWorkspace = session.context?.activeWorkspace ?? null;

  if (!activeWorkspace) {
    if (memberships.length === 0) {
      redirect("/workspace/create");
    }

    redirect("/workspace/select");
  }

  const category = activeWorkspace.category;
  const cards = getCategoryCards(category);
  const defaultLane = getDashboardRouteForCategory(category);
  const entitlementItems = getEntitlementItems(session.context?.entitlements);

  return (
    <main className={pageWrapClassName()}>
      <div className={shellClassName()}>
        <section className="space-y-4 border-b border-white/10 pb-6">
          <div className={sectionLabelClassName()}>Workspace Home</div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {activeWorkspace.name}
            </h1>

            <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
              {getCategoryHeadline(category)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={badgeClassName(categoryTone(activeWorkspace.category))}>
              {activeWorkspace.category.toUpperCase()}
            </span>

            {shouldShowPlanBadge(activeWorkspace) ? (
              <span className={badgeClassName("violet")}>
                {activeWorkspace.plan.toUpperCase()}
              </span>
            ) : null}

            <span className={badgeClassName(roleTone(activeWorkspace.membershipRole))}>
              {activeWorkspace.membershipRole.toUpperCase()}
            </span>
            <span className={badgeClassName(statusTone(activeWorkspace.status))}>
              {activeWorkspace.status.toUpperCase()}
            </span>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className={cardClassName()}>
            <div className="text-sm text-zinc-400">Category</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
              {activeWorkspace.category}
            </div>
          </div>

          <div className={cardClassName()}>
            <div className="text-sm text-zinc-400">Plan</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
              {activeWorkspace.plan}
            </div>
          </div>

          <div className={cardClassName()}>
            <div className="text-sm text-zinc-400">Default lane</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-sky-300">
              {defaultLane}
            </div>
          </div>

          <div className={cardClassName()}>
            <div className="text-sm text-zinc-400">Memberships</div>
            <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
              {memberships.length}
            </div>
          </div>
        </section>

        {category === "agency" ? (
          <AgencyOperatingView
            memberships={memberships}
            entitlements={session.context?.entitlements}
          />
        ) : null}

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className={cardClassName()}>
            <div className="mb-5 text-lg font-medium text-white">
              Active workspace
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MetaCard
                label="Workspace ID"
                value={text(activeWorkspace.workspaceId)}
                breakAll
              />
              <MetaCard label="Name" value={text(activeWorkspace.name)} />
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
              <MetaCard label="Default lane" value={defaultLane} breakAll />
            </div>
          </div>

          <div className={cardClassName()}>
            <div className="mb-5 text-lg font-medium text-white">Entitlements</div>

            <div className="flex flex-wrap gap-2">
              {entitlementItems.map(([label, enabled]) => (
                <span
                  key={label}
                  className={badgeClassName(enabled ? "success" : "default")}
                >
                  {label}: {enabled ? "ON" : "OFF"}
                </span>
              ))}
            </div>

            <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Quick read</div>
              <div className="mt-2 text-sm leading-6 text-zinc-300">
                Cet écran sert de hub dédié avant d’ouvrir la lane principale de la
                catégorie active.
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className={sectionLabelClassName()}>Dedicated surfaces</div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {cards.map((item) => (
              <ActionCard
                key={`${activeWorkspace.workspaceId}-${item.title}`}
                item={item}
              />
            ))}
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

            <Link href="/workspace/select" className={buttonClassName("soft")}>
              Changer d’espace
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {memberships.map((workspace) => (
              <WorkspaceCard
                key={workspace.workspaceId}
                workspace={workspace}
                isActive={workspace.workspaceId === activeWorkspace.workspaceId}
              />
            ))}
          </div>
        </section>

        <section className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Navigation</div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link href={defaultLane} className={buttonClassName("primary")}>
              Ouvrir la lane principale
            </Link>

            <Link href="/workspace/select" className={buttonClassName("soft")}>
              Changer d’espace
            </Link>

            <Link href="/overview" className={buttonClassName("default")}>
              Ouvrir Overview
            </Link>

            <Link href="/settings" className={buttonClassName("default")}>
              Ouvrir Settings
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
