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

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

type CreateTemplate = {
  id: "freelance" | "company" | "agency";
  title: string;
  category: "freelance" | "company" | "agency";
  description: string;
  cockpitLabel: string;
  highlights: string[];
  tone: "success" | "info" | "violet";
};

const CREATE_TEMPLATES: CreateTemplate[] = [
  {
    id: "freelance",
    title: "Freelance workspace",
    category: "freelance",
    description:
      "Espace léger orienté exécution, suivi direct des commands, runs et usage opérationnel.",
    cockpitLabel: "Commands-first cockpit",
    highlights: [
      "Vue rapide sur commands et runs",
      "Pilotage quota simple",
      "Bon point de départ pour solo builder",
    ],
    tone: "success",
  },
  {
    id: "company",
    title: "Company workspace",
    category: "company",
    description:
      "Espace structuré pour une entreprise avec vision plus large sur workspaces, quotas et gouvernance.",
    cockpitLabel: "Workspace-first cockpit",
    highlights: [
      "Lecture multi-espaces",
      "Suivi des limites et de la consommation",
      "Base saine pour équipes internes",
    ],
    tone: "info",
  },
  {
    id: "agency",
    title: "Agency workspace",
    category: "agency",
    description:
      "Espace orienté orchestration, flows et supervision client, avec lecture prioritaire des incidents et du pipeline.",
    cockpitLabel: "Flows-first cockpit",
    highlights: [
      "Navigation centrée sur flows",
      "Supervision opérationnelle client",
      "Bon fit pour studio, agence et ops",
    ],
    tone: "violet",
  },
];

function text(value?: string | string[] | null): string {
  if (Array.isArray(value)) {
    return String(value[0] || "").trim();
  }

  return String(value || "").trim();
}

function badgeClassName(
  variant: "default" | "success" | "warning" | "danger" | "info" | "violet" = "default"
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

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function findTemplateById(value: string): CreateTemplate | null {
  const normalized = value.trim().toLowerCase();

  return (
    CREATE_TEMPLATES.find((item) => item.id === normalized) || null
  );
}

export default async function WorkspaceCreatePage({
  searchParams,
}: PageProps) {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const memberships = session.context?.memberships ?? [];
  const activeWorkspaceId =
    session.context?.activeWorkspace?.workspaceId ||
    session.cookieSnapshot.activeWorkspaceId;

  if (memberships.length > 0) {
    const resolution = resolveWorkspaceAccess({
      userId: String(session.user?.userId || ""),
      requestedWorkspaceId: String(activeWorkspaceId || ""),
      nextPath: String(session.homeRoute || "/overview"),
    });

    redirect(resolution.redirectTo);
  }

  const resolvedSearchParams = (await Promise.resolve(
    searchParams ?? {}
  )) as SearchParams;

  const selectedTemplate = findTemplateById(text(resolvedSearchParams.template));
  const userDisplay =
    session.user?.displayName ||
    session.user?.email ||
    "Utilisateur connecté";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace setup"
        title="Créer ton premier espace BOSAI"
        description="Choisis la forme de l’espace à préparer. Cette étape pose le bon cockpit cible avant de brancher la vraie création backend."
      />

      <section className="flex flex-wrap gap-2">
        <span className={badgeClassName("default")}>{userDisplay}</span>
        <span className={badgeClassName("warning")}>Aucun workspace actif</span>
        <span className={badgeClassName("info")}>Mock-first setup</span>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {CREATE_TEMPLATES.map((template) => {
          const isSelected = selectedTemplate?.id === template.id;
          const cockpitRoute = getDashboardRouteForWorkspaceCategory(
            template.category
          );

          return (
            <DashboardCard
              key={template.id}
              title={template.title}
              subtitle={template.description}
              rightSlot={
                isSelected ? (
                  <span className={badgeClassName("success")}>SELECTED</span>
                ) : (
                  <span className={badgeClassName(template.tone)}>
                    {template.category.toUpperCase()}
                  </span>
                )
              }
            >
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className={badgeClassName(template.tone)}>
                    {template.cockpitLabel}
                  </span>
                  <span className={badgeClassName("default")}>
                    Target {cockpitRoute}
                  </span>
                </div>

                <div className="space-y-2">
                  {template.highlights.map((item) => (
                    <div
                      key={`${template.id}-${item}`}
                      className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-zinc-300"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/workspace/create?template=${encodeURIComponent(
                      template.id
                    )}`}
                    className={buttonClassName("primary")}
                  >
                    {isSelected ? "Modèle sélectionné" : "Choisir ce modèle"}
                  </Link>

                  <Link href={cockpitRoute} className={buttonClassName("soft")}>
                    Voir la cible cockpit
                  </Link>
                </div>
              </div>
            </DashboardCard>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard
          title="Prévisualisation"
          subtitle="Lecture du modèle actuellement choisi."
        >
          {selectedTemplate ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={badgeClassName(selectedTemplate.tone)}>
                  {selectedTemplate.category.toUpperCase()}
                </span>
                <span className={badgeClassName("success")}>
                  {selectedTemplate.cockpitLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
                  <div className={metaLabelClassName()}>Template</div>
                  <div className="mt-2 text-zinc-200">{selectedTemplate.title}</div>
                </div>

                <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
                  <div className={metaLabelClassName()}>Cockpit cible</div>
                  <div className="mt-2 text-zinc-200">
                    {getDashboardRouteForWorkspaceCategory(
                      selectedTemplate.category
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
                <div className={metaLabelClassName()}>Description</div>
                <div className="mt-2 text-sm leading-6 text-zinc-300">
                  {selectedTemplate.description}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-zinc-300">
              Aucun modèle sélectionné. Choisis un template ci-dessus pour préparer
              le flux de création.
            </div>
          )}
        </DashboardCard>

        <DashboardCard
          title="État actuel"
          subtitle="Cette page prépare le bon flux sans casser l’auth existante."
        >
          <div className="mt-4 space-y-3">
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={sectionLabelClassName()}>Roadmap immédiate</div>
              <div className="mt-2 text-sm leading-6 text-zinc-300">
                1. choisir un template
                <br />
                2. brancher la vraie création backend
                <br />
                3. activer automatiquement le workspace créé
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/workspace/select" className={buttonClassName("soft")}>
                Ouvrir la sélection workspace
              </Link>

              <Link href="/overview" className={buttonClassName("default")}>
                Retour cockpit
              </Link>
            </div>
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
