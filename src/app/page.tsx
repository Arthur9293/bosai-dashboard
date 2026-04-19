import { redirect } from "next/navigation";
import { resolveAuthSession, AUTH_LOGIN_ROUTE } from "@/lib/auth/resolve-auth-session";
import { resolveWorkspaceAccess } from "@/lib/workspaces/resolver";

function safeText(value?: string | null): string {
  return String(value || "").trim();
}

export default async function RootPage() {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const resolution = resolveWorkspaceAccess({
    userId: safeText(session.user?.userId),
    requestedWorkspaceId: safeText(session.cookieSnapshot.activeWorkspaceId),
    nextPath: safeText(session.homeRoute) || "/overview",
  });

  redirect(resolution.redirectTo);
}
