import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";

function pageWrapClassName(): string {
  return "min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8";
}

function shellClassName(): string {
  return "mx-auto max-w-4xl space-y-8";
}

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
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

export default async function WorkspaceCreatePage() {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const memberships = session.context?.memberships ?? [];

  if (memberships.length > 0) {
    redirect("/workspace/select");
  }

  return (
    <main className={pageWrapClassName()}>
      <div className={shellClassName()}>
        <section className="space-y-4 border-b border-white/10 pb-6">
          <div className={sectionLabelClassName()}>Workspace onboarding</div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Créer ou raccorder un espace
            </h1>

            <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
              Aucun workspace actif n’est encore disponible pour cette session.
              Cette page sert de point de départ pour l’onboarding.
            </p>
          </div>
        </section>

        <section className={cardClassName()}>
          <div className="space-y-4">
            <div className="text-2xl font-semibold tracking-tight text-white">
              Aucun espace détecté
            </div>

            <p className="text-sm leading-7 text-zinc-400">
              Pour l’instant, cette page reste un hub d’attente propre. La
              prochaine étape sera de brancher le vrai formulaire de création ou
              de rattachement de workspace.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className={buttonClassName("default")}>
                Retour login
              </Link>

              <Link href="/overview" className={buttonClassName("soft")}>
                Ouvrir overview
              </Link>

              <Link href="/workspace/select" className={buttonClassName("primary")}>
                Aller au sélecteur
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
