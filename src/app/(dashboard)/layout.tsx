import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
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

  const resolution = resolveWorkspaceAccess({
    userId: session.user?.userId,
    requestedWorkspaceId: session.cookieSnapshot.activeWorkspaceId,
    nextPath: session.homeRoute,
  });

  if (resolution.kind !== "allow_dashboard") {
    redirect(resolution.redirectTo);
  }

  return <AppShell>{children}</AppShell>;
}
