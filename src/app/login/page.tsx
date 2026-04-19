import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import { resolveWorkspaceAccess } from "@/lib/workspaces/resolver";

export default async function LoginPage() {
  const session = await resolveAuthSession();

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
