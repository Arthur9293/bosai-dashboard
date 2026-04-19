import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { WorkspaceRouteMemory } from "@/components/workspaces/workspace-route-memory";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import { resolveWorkspaceAccess } from "@/lib/workspaces/resolver";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const resolution = await resolveWorkspaceAccess({
    userId: session.user?.userId || "",
    requestedWorkspaceId: session.cookieSnapshot.activeWorkspaceId || "",
    nextPath: session.homeRoute || "/overview",
  });

  const activeWorkspace =
    resolution.kind === "allow_dashboard" ? resolution.activeWorkspace : null;

  if (resolution.kind !== "allow_dashboard" || !activeWorkspace) {
    redirect(resolution.redirectTo);
  }

  return (
    <AppShell>
      <WorkspaceRouteMemory workspaceId={activeWorkspace.workspaceId} />
      {children}
    </AppShell>
  );
}
