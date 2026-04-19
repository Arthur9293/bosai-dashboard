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
import type { WorkspaceCategory } from "@/lib/workspaces/types";

type WorkspaceTemplate = {
  category: WorkspaceCategory;
  title: string;
  subtitle: string;
  description: string;
  bullets: string[];
  tone: "default" | "info" | "success" | "violet";
};

const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    category: "personal",
    title: "Personal Space",
    subtitle: "Espace simple pour usage solo",
    description:
      "Pour un builder seul qui veut suivre ses flows, incidents et commands sans structure multi-client.",
    bullets: [
      "Cockpit personnel",
      "Lecture simple des quotas",
      "Surface légère et rapide",
    ],
    tone: "default",
  },
  {
    category: "freelance",
    title: "Freelance Space",
    subtitle: "Espace opérateur indépendant",
    description:
      "Pour un freelance qui gère plusieurs automatisations et veut une lecture plus orientée exécution.",
    bullets: [
      "Priorité commands / runs",
      "Suivi incidents plus direct",
      "Bon point d’entrée solo pro",
    ],
    tone: "success",
  },
  {
    category: "company",
    title: "Company Space",
    subtitle: "Espace équipe / entreprise",
    description:
      "Pour une société qui veut piloter ses workflows, ses quotas et sa stabilité avec une lecture plus structurée.",
    bullets: [
      "Vision workspace plus large",
      "Lecture quotas / consommation",
      "Adapté aux opérations internes",
    ],
    tone: "info",
  },
  {
    category: "agency",
    title: "Agency Space",
    subtitle: "Espace multi-clients / studio",
    description:
      "Pour une agence ou un studio qui veut un cockpit plus orienté control plane, coordination et supervision.",
    bullets: [
      "Lecture flows prioritaire",
      "Vue multi-surfaces plus riche",
      "Pensé pour BOSAI cockpit pro",
    ],
    tone: "violet",
  },
];

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
  variant: "default" | "primary" | "soft" | "disabled" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "soft") {
    return "inline-flex items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/12 px-4 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/18";
  }

  if (variant === "disabled") {
    return "inline-flex cursor-not-allowed items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-500 opacity-70";
  }

  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function badgeClassName(
  variant: "default" | "info" | "success" | "warning" | "danger" | "violet" = "default"
): string {
  if (variant === "info") {
    return "inline-flex rounded-full border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300";
  }

  if (variant === "success") {
    return "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300";
  }

  if (variant === "warning") {
    return "inline-flex rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300";
  }

  if (variant === "danger") {
    return "inline-flex rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300";
  }

  if (variant === "violet") {
    return "inline-flex rounded-full border border-violet-500/20 bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300";
  }

  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300";
}

function tonePanelClassName(
  tone: WorkspaceTemplate["tone"]
): string {
  if (tone === "info") {
    return "border-sky-500/20 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(14,165,233,0.10),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
  }

  if (tone === "success") {
    return "border-emerald-500/20 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(16,185,129,0.10),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
  }

  if (tone === "violet") {
    return "border-violet-500/20 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(139,92,246,0.10),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
  }

  return "border-white/10 bg-[linear-gradient(180deg,rgba(8,20,48,0.72)_0%,rgba(3,8,22,0.56)_100%)]";
}

function WorkspaceTemplateCard({
  template,
}: {
  template: WorkspaceTemplate;
}) {
  return (
    <article
      className={[
        "rounded-[28px] border p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        tonePanelClassName(template.tone),
      ].join(" ")}
    >
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={badgeClassName(template.tone)}>
              {template.category.toUpperCase()}
            </span>
            <span className={badgeClassName("warning")}>Bientôt activable</span>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              {template.title}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">{template.subtitle}</p>
          </div>

          <p className="text-sm leading-6 text-zinc-300">
            {template.description}
          </p>
        </div>

        <div className="space-y-3">
          <div className={metaLabelClassName()}>Lecture produit</div>
          <ul className="space-y-2 text-sm text-zinc-300">
            {template.bullets.map((item) => (
              <li key={item} className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <span className={buttonClassName("disabled")}>
            Création réelle bientôt
          </span>
        </div>
      </div>
    </article>
  );
}

export default async function WorkspaceCreatePage() {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const memberships = session.context?.memberships ?? [];
  const activeWorkspace = session.context?.activeWorkspace ?? null;

  if (activeWorkspace) {
    redirect(getDashboardRouteForWorkspaceCategory(activeWorkspace.category));
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

  if (memberships.length > 1) {
    redirect("/workspace/select");
  }

  return (
    <div className={pageWrapClassName()}>
      <div className={shellClassName()}>
        <section className="space-y-4 border-b border-white/10 pb-6">
          <div className={sectionLabelClassName()}>Workspace Onboarding</div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Créer ton premier espace BOSAI
            </h1>

            <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
              Aucun workspace actif n’est encore rattaché à cette session. Cette
              page pose la base visuelle du choix d’espace avant de brancher la
              vraie création.
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

            <span className={badgeClassName("info")}>Mode safe UI</span>
          </div>
        </section>

        <section className={cardClassName()}>
          <div className="space-y-2">
            <div className={sectionLabelClassName()}>État actuel</div>
            <div className="text-lg font-medium text-white">
              Aucun workspace trouvé pour cette session mock.
            </div>
            <p className="max-w-3xl text-sm leading-6 text-zinc-400">
              On affiche ici les catégories cibles du cockpit. La création réelle
              viendra ensuite, sans casser la logique auth/workspace déjà en place.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {WORKSPACE_TEMPLATES.map((template) => (
            <WorkspaceTemplateCard
              key={template.category}
              template={template}
            />
          ))}
        </section>

        <section className={cardClassName()}>
          <div className="space-y-4">
            <div>
              <div className={sectionLabelClassName()}>Prochaine étape</div>
              <div className="mt-2 text-xl font-semibold text-white">
                Brancher la vraie sélection login → workspace → cockpit
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm text-zinc-300 md:grid-cols-3">
              <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
                1. Login résout l’utilisateur
              </div>
              <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
                2. Workspace actif ou sélection
              </div>
              <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
                3. Redirect vers espace dédié
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className={buttonClassName("soft")}>
                Retour login
              </Link>
              <Link href="/workspace/select" className={buttonClassName("default")}>
                Voir la sélection workspace
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
