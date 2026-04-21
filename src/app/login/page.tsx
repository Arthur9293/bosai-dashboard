import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import { resolveWorkspaceAccess } from "@/lib/workspaces/resolver";

type SearchParams = {
  next?: string | string[];
};

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function normalizeInternalPath(value: string | null | undefined): string {
  const text = String(value || "").trim();

  if (!text.startsWith("/")) return "";
  if (text.startsWith("//")) return "";

  return text;
}

function isCommercialPath(pathname: string): boolean {
  return (
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/workspace/create")
  );
}

export default async function LoginPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const nextPath = normalizeInternalPath(firstParam(resolvedSearchParams.next));
  const session = await resolveAuthSession();

  /**
   * Cas important :
   * si l’utilisateur est déjà authentifié MAIS arrive sur /login avec
   * un next commercial, on doit respecter ce next au lieu de renvoyer
   * directement vers les workspaces existants.
   */
  if (session.isAuthenticated && nextPath && isCommercialPath(nextPath)) {
    redirect(nextPath);
  }

  if (session.isAuthenticated) {
    const resolution = await resolveWorkspaceAccess({
      userId: session.user?.userId || "",
      requestedWorkspaceId: session.cookieSnapshot.activeWorkspaceId || "",
      nextPath: session.homeRoute || "/overview",
    });

    if (resolution.kind === "allow_dashboard") {
      redirect(resolution.dashboardRoute || session.homeRoute || "/overview");
    }

    redirect(resolution.redirectTo || AUTH_LOGIN_ROUTE);
  }

  return <LoginForm />;
}
