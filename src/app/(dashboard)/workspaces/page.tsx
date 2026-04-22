import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function shellCardClassName(): string {
  return [
    "rounded-[28px] border border-white/10 p-6 md:p-7",
    "bg-[radial-gradient(120%_120%_at_100%_0%,rgba(14,165,233,0.10),transparent_48%),linear-gradient(180deg,rgba(7,18,43,0.72)_0%,rgba(3,8,22,0.56)_100%)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  ].join(" ");
}

function panelClassName(): string {
  return [
    "rounded-[24px] border border-white/10 p-5 md:p-6",
    "bg-[linear-gradient(180deg,rgba(8,20,48,0.70)_0%,rgba(3,9,24,0.54)_100%)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  ].join(" ");
}

function navCardClassName(): string {
  return [
    "group rounded-[24px] border border-white/10 p-5 text-white transition",
    "bg-[linear-gradient(180deg,rgba(7,18,43,0.62)_0%,rgba(3,8,22,0.48)_100%)]",
    "hover:border-white/15 hover:bg-[linear-gradient(180deg,rgba(9,22,53,0.76)_0%,rgba(4,10,26,0.58)_100%)]",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  ].join(" ");
}

function badgeClassName(
  tone: "default" | "info" | "success" | "warning" | "danger" = "default"
): string {
  if (tone === "info") {
    return "inline-flex rounded-full border border-sky-500/20 bg-sky-500/15 px-3 py-1 text-xs font-medium text-sky-300";
  }

  if (tone === "success") {
    return "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300";
  }

  if (tone === "warning") {
    return "inline-flex rounded-full border border-amber-500/20 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300";
  }

  if (tone === "danger") {
    return "inline-flex rounded-full border border-rose-500/20 bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-200";
  }

  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-300";
}

function miniStatClassName(): string {
  return [
    "rounded-[20px] border border-white/10 px-4 py-4",
    "bg-[linear-gradient(180deg,rgba(8,20,48,0.68)_0%,rgba(3,9,24,0.50)_100%)]",
  ].join(" ");
}

function subtleBoxClassName(): string {
  return "rounded-[22px] border border-white/10 bg-black/20 px-4 py-4";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

type NavCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  tone?: "default" | "info" | "success" | "warning" | "danger";
};

function NavCard({
  href,
  eyebrow,
  title,
  description,
  tone = "default",
}: NavCardProps) {
  return (
    <Link href={href} className={navCardClassName()}>
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">
              {eyebrow}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {title}
            </div>
          </div>

          <span className={badgeClassName(tone)}>Open</span>
        </div>

        <div className="text-sm leading-6 text-zinc-400">{description}</div>

        <div className="pt-1 text-sm font-medium text-zinc-200 transition group-hover:text-white">
          Entrer dans la room →
        </div>
      </div>
    </Link>
  );
}

export default async function WorkspacesPage() {
  return (
    <div className="space-y-8">
      <section className={shellCardClassName()}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap gap-2">
              <span className={badgeClassName("info")}>BOSAI Workspace Layer</span>
              <span className={badgeClassName("success")}>Route stable</span>
              <span className={badgeClassName("default")}>No black screen</span>
            </div>

            <div className="space-y-3">
              <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                BOSAI Room
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl xl:text-[3.5rem]">
                Workspaces
              </h1>

              <p className="max-w-3xl text-base leading-8 text-zinc-400">
                Espace d’entrée premium pour naviguer dans l’univers BOSAI sans
                friction. Ici, l’utilisateur doit sentir qu’il entre dans une
                room claire, maîtrisée et rassurante, avec une identité forte,
                calme et professionnelle.
              </p>
            </div>
          </div>

          <div className="w-full max-w-md">
            <div className={panelClassName()}>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                Posture
              </div>

              <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
                Control plane ready
              </div>

              <div className="mt-3 space-y-2 text-sm leading-6 text-white/65">
                <div>
                  Surface <span className="text-white/90">Workspaces</span> stabilisée
                  visuellement.
                </div>
                <div>
                  Orientation <span className="text-white/90">BOSAI</span> :
                  premium, calme, pilotage, confiance.
                </div>
                <div>
                  Objectif : donner une sensation de{" "}
                  <span className="text-white/90">room maîtrisée</span>, pas
                  d’écran technique froid.
                </div>
              </div>

              <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                  Lecture rapide
                </div>
                <div className="mt-2 text-sm leading-6 text-white/70">
                  Cette page ne charge aucune logique métier fragile. Elle sert
                  d’entrée BOSAI propre, stable et élégante vers les surfaces
                  validées du cockpit.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className={miniStatClassName()}>
          <div className="text-sm text-zinc-400">Workspace</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-sky-300">
            Ready
          </div>
        </div>

        <div className={miniStatClassName()}>
          <div className="text-sm text-zinc-400">Navigation</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-emerald-300">
            Stable
          </div>
        </div>

        <div className={miniStatClassName()}>
          <div className="text-sm text-zinc-400">Identity</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
            BOSAI
          </div>
        </div>

        <div className={miniStatClassName()}>
          <div className="text-sm text-zinc-400">Ambiance</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-amber-300">
            Premium
          </div>
        </div>
      </section>

      <section className={panelClassName()}>
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            Navigation lanes
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Choisir sa room BOSAI
          </h2>
          <p className="max-w-3xl text-base text-zinc-400">
            Chaque entrée ouvre une surface du cockpit avec une intention claire :
            piloter, observer, configurer ou gouverner.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <NavCard
            href="/workspace"
            eyebrow="Hub"
            title="Workspace"
            description="Retour vers le hub principal de l’espace actif pour reprendre le pilotage général."
            tone="info"
          />

          <NavCard
            href="/overview"
            eyebrow="Control Plane"
            title="Overview"
            description="Lecture synthétique du système, posture globale, signaux prioritaires et accès rapides."
            tone="success"
          />

          <NavCard
            href="/flows"
            eyebrow="Execution"
            title="Flows"
            description="Explorer les chaînes BOSAI, leurs liaisons et les parcours à surveiller."
            tone="info"
          />

          <NavCard
            href="/commands"
            eyebrow="Action Layer"
            title="Commands"
            description="Suivre les commands actives, terminées ou à risque avec leur contexte détaillé."
            tone="warning"
          />

          <NavCard
            href="/settings"
            eyebrow="Configuration"
            title="Settings"
            description="Ouvrir les réglages pour garder un cockpit lisible, cohérent et exploitable."
            tone="default"
          />

          <NavCard
            href="/policies"
            eyebrow="Governance"
            title="Policies"
            description="Accéder à la gouvernance BOSAI et aux règles de pilotage du système."
            tone="danger"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className={panelClassName()}>
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
              Experience intent
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Une room qui rassure
            </h2>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className={subtleBoxClassName()}>
              <div className="text-sm font-medium text-white">Calme visuel</div>
              <div className="mt-2 text-sm leading-6 text-zinc-400">
                Fonds sombres, contraste premium, hiérarchie claire, lecture
                posée.
              </div>
            </div>

            <div className={subtleBoxClassName()}>
              <div className="text-sm font-medium text-white">Confiance</div>
              <div className="mt-2 text-sm leading-6 text-zinc-400">
                L’utilisateur doit sentir qu’il entre dans un cockpit sérieux et
                tenu, pas dans une page temporaire.
              </div>
            </div>

            <div className={subtleBoxClassName()}>
              <div className="text-sm font-medium text-white">Identité BOSAI</div>
              <div className="mt-2 text-sm leading-6 text-zinc-400">
                Une empreinte qui mélange orchestration, maîtrise, profondeur et
                confort d’usage.
              </div>
            </div>

            <div className={subtleBoxClassName()}>
              <div className="text-sm font-medium text-white">Entrée naturelle</div>
              <div className="mt-2 text-sm leading-6 text-zinc-400">
                La page doit servir d’accueil crédible avant les surfaces plus
                techniques du système.
              </div>
            </div>
          </div>
        </div>

        <div className={panelClassName()}>
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
              Diagnostic state
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Baseline préservée
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            <div className={subtleBoxClassName()}>
              <div className={metaLabelClassName()}>Route</div>
              <div className="mt-2 text-zinc-100">
                /workspaces rend correctement
              </div>
            </div>

            <div className={subtleBoxClassName()}>
              <div className={metaLabelClassName()}>Risque évité</div>
              <div className="mt-2 text-zinc-100">
                Pas de fetch, pas de logique workspace fragile, pas de dépendance
                métier additionnelle
              </div>
            </div>

            <div className={subtleBoxClassName()}>
              <div className={metaLabelClassName()}>Objectif</div>
              <div className="mt-2 text-zinc-100">
                Upgrade visuel BOSAI sans casser la route stable
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
