import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import {
  getDashboardRouteForWorkspaceCategory,
  resolveWorkspaceAccess,
} from "@/lib/workspaces/resolver";

type SearchParams = Record<string, string | string[] | undefined>;

type WorkspacePreset = {
  id: "personal" | "freelance" | "company" | "agency";
  title: string;
  subtitle: string;
  description: string;
  planLabel: string;
  audienceLabel: string;
  quotaLabel: string;
  dashboardRoute: string;
  highlights: string[];
};

const WORKSPACE_PRESETS: WorkspacePreset[] = [
  {
    id: "personal",
    title: "Personal",
    subtitle: "Espace simple pour usage individuel",
    description:
      "Surface légère pour lecture personnelle, suivi global et point d’entrée stable.",
    planLabel: "Starter",
    audienceLabel: "Solo",
    quotaLabel: "Faible volume",
    dashboardRoute: getDashboardRouteForWorkspaceCategory("personal"),
    highlights: [
      "Overview centré lecture globale",
      "Configuration légère",
      "Point d’entrée simple",
    ],
  },
  {
    id: "freelance",
    title: "Freelance",
    subtitle: "Pilotage orienté exécution",
    description:
      "Adapté à un opérateur seul qui suit surtout les commands, retries et runs utiles.",
    planLabel: "Builder",
    audienceLabel: "Freelance",
    quotaLabel: "Volume moyen",
    dashboardRoute: getDashboardRouteForWorkspaceCategory("freelance"),
    highlights: [
      "Entrée cockpit côté Commands",
      "Lecture rapide de l’exécution",
      "Workflow orienté delivery",
    ],
  },
  {
    id: "company",
    title: "Company",
    subtitle: "Cockpit d’équipe et quotas workspace",
    description:
      "Pensé pour une structure qui veut piloter plusieurs espaces, quotas et vues d’exploitation.",
    planLabel: "Team",
    audienceLabel: "Entreprise",
    quotaLabel: "Volume structuré",
    dashboardRoute: getDashboardRouteForWorkspaceCategory("company"),
    highlights: [
      "Entrée cockpit côté Workspaces",
      "Vision quotas / tenancy",
      "Lecture produit + opérations",
    ],
  },
  {
    id: "agency",
    title: "Agency",
    subtitle: "Vue orientée flows, incidents et orchestration",
    description:
      "Idéal pour une agence qui suit plusieurs chaînes d’exécution et veut ouvrir vite la vue flows.",
    planLabel: "Agency",
    audienceLabel: "Agence",
    quotaLabel: "Volume élevé",
    dashboardRoute: getDashboardRouteForWorkspaceCategory("agency"),
    highlights: [
      "Entrée cockpit côté Flows",
      "Lecture des incidents et chaînes",
      "Pilotage multi-clients plus naturel",
    ],
  },
];

function text(value?: string | null): string {
  return String(value || "").trim();
}

function getSingle(value?: string | string[]): string {
  return Array.isArray(value) ? String(value[0] || "").trim() : String(value || "").trim();
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
  if (variant === "primary") {
    return "inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "soft") {
    return "inline-flex items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/12 px-4 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/18";
  }

  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
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
  category: WorkspacePreset["id"]
): "default" | "success" | "warning" | "danger" | "info" | "violet" {
  if (category === "personal") return "default";
  if (category === "freelance") return "success";
  if (category === "company") return "info";
  return "violet";
}

function WorkspacePresetCard({
  preset,
  selected,
}: {
  preset: WorkspacePreset;
  selected: boolean;
}) {
  return (
    <article
      className={[
        cardClassName(),
        selected ? "border-sky-500/25 shadow-[inset_0_1px_0_rgba(56,189,248,0.12)]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className={sectionLabelClassName()}>Workspace template</div>

          <div className="flex flex-wrap gap-2">
            <span className={badgeClassName(categoryTone(preset.id))}>
              {preset.id.toUpperCase()}
            </span>
            <span className={badgeClassName("violet")}>{preset.planLabel}</span>
            <span className={badgeClassName("default")}>{preset.quotaLabel}</span>
            {selected ? (
              <span className={badgeClassName("info")}>TEMPLATE ACTIF</span>
            ) : null}
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              {preset.title}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">{preset.subtitle}</p>
          </div>

          <p className="text-sm leading-7 text-zinc-300">{preset.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 sm:grid-cols-2">
          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Audience</div>
            <div className="mt-2 text-zinc-200">{preset.audienceLabel}</div>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Cockpit target</div>
            <div className="mt-2 text-zinc-200">{preset.dashboardRoute}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className={metaLabelClassName()}>Highlights</div>
          <div className="flex flex-wrap gap-2">
            {preset.highlights.map((item) => (
              <span key={`${preset.id}-${item}`} className={badgeClassName("default")}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/workspace/create?category=${encodeURIComponent(preset.id)}`}
            className={buttonClassName(selected ? "primary" : "soft")}
          >
            {selected ? "Template sélectionné" : "Choisir ce template"}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function WorkspaceCreatePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolvedSearchParams = (await Promise.resolve(
    searchParams ?? {}
  )) as SearchParams;

  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const resolution = resolveWorkspaceAccess({
    userId: session.user?.userId || "",
    requestedWorkspaceId: session.cookieSnapshot.activeWorkspaceId || "",
    nextPath: session.homeRoute || "/overview",
  });

  if (resolution.kind === "allow_dashboard") {
    redirect(resolution.dashboardRoute || resolution.redirectTo || "/overview");
  }

  if (
    resolution.kind === "redirect_activate" ||
    resolution.kind === "redirect_select"
  ) {
    redirect(resolution.redirectTo);
  }

  const categoryParam = getSingle(resolvedSearchParams.category).toLowerCase();
  const selectedPreset =
    WORKSPACE_PRESETS.find((item) => item.id === categoryParam) ||
    WORKSPACE_PRESETS[1];

  return (
    <div className={pageWrapClassName()}>
      <div className={shellClassName()}>
        <section className="space-y-4 border-b border-white/10 pb-6">
          <div className={sectionLabelClassName()}>Workspace Provisioning</div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Créer un espace BOSAI
            </h1>

            <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
              Aucun workspace actif n’est encore disponible pour ce compte. Choisis
              d’abord le type d’espace que tu veux provisionner.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {text(session.user?.displayName) ? (
              <span className={badgeClassName("default")}>
                {text(session.user?.displayName)}
              </span>
            ) : null}

            {text(session.user?.email) ? (
              <span className={badgeClassName("default")}>
                {text(session.user?.email)}
              </span>
            ) : null}

            <span className={badgeClassName("info")}>
              {WORKSPACE_PRESETS.length} templates
            </span>
          </div>
        </section>

        <section className={cardClassName()}>
          <div className="space-y-3">
            <div className={sectionLabelClassName()}>Template actif</div>
            <div className="text-2xl font-semibold tracking-tight text-white">
              {selectedPreset.title}
            </div>
            <div className="text-sm leading-7 text-zinc-400">
              Ce template ouvrira naturellement le cockpit cible{" "}
              <span className="text-zinc-200">{selectedPreset.dashboardRoute}</span>{" "}
              quand le provisioning backend sera branché.
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={badgeClassName(categoryTone(selectedPreset.id))}>
                {selectedPreset.id.toUpperCase()}
              </span>
              <span className={badgeClassName("violet")}>
                {selectedPreset.planLabel}
              </span>
              <span className={badgeClassName("default")}>
                {selectedPreset.quotaLabel}
              </span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {WORKSPACE_PRESETS.map((preset) => (
            <WorkspacePresetCard
              key={preset.id}
              preset={preset}
              selected={preset.id === selectedPreset.id}
            />
          ))}
        </section>

        <section className={cardClassName()}>
          <div className="space-y-4">
            <div className={sectionLabelClassName()}>Navigation</div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Link href="/workspace/select" className={buttonClassName("soft")}>
                Aller au sélecteur d’espaces
              </Link>

              <Link href="/login" className={buttonClassName("default")}>
                Retour Login
              </Link>

              <Link
                href={`/workspace/create?category=${encodeURIComponent(
                  selectedPreset.id
                )}`}
                className={buttonClassName("primary")}
              >
                Continuer avec {selectedPreset.title}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
