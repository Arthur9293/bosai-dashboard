import { redirect } from "next/navigation";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import { resolveWorkspaceAccess } from "@/lib/workspaces/resolver";

export default async function RootPage() {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const resolution = resolveWorkspaceAccess({
    userId: session.user?.userId ?? "",
    requestedWorkspaceId: session.cookieSnapshot.activeWorkspaceId ?? "",
    nextPath: "/workspace/home",
  });

  redirect(resolution.redirectTo);
}
