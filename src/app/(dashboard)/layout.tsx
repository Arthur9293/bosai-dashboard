import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { WorkspaceRouteMemory } from "@/components/workspaces/workspace-route-memory";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import {
  hasCommercialOnboardingSignals,
  resolveBosaiAccessState,
} from "@/lib/onboarding-access";
import { resolveWorkspaceAccess } from "@/lib/workspaces/resolver";
import type { WorkspaceEntitlements } from "@/lib/workspaces/types";

type DashboardLayoutProps = {
  children: ReactNode;
};

const FALLBACK_ENTITLEMENTS: WorkspaceEntitlements = {
  canAccessDashboard: true,
  canRunHttp: false,
  canViewIncidents: false,
  canManagePolicies: false,
  canManageTools: false,
  canManageWorkspaces: false,
  canManageBilling: false,
};

function text(value?: string | null): string {
  return String(value || "").trim();
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const cookieStore = await cookies();

  const onboardingCookieValues = {
    bosai_plan_code: cookieStore.get("bosai_plan_code")?.value,
    plan_code: cookieStore.get("plan_code")?.value,
    selected_plan: cookieStore.get("selected_plan")?.value,
    bosai_workspace_status: cookieStore.get("bosai_workspace_status")?.value,
    workspace_status: cookieStore.get("workspace_status")?.value,
    bosai_checkout_completed:
      cookieStore.get("bosai_checkout_completed")?.value,
    checkout_completed: cookieStore.get("checkout_completed")?.value,
    bosai_onboarding_completed:
      cookieStore.get("bosai_onboarding_completed")?.value,
    onboarding_completed: cookieStore.get("onboarding_completed")?.value,
    bosai_pending_workspace_id:
      cookieStore.get("bosai_pending_workspace_id")?.value,
    bosai_force_commercial_onboarding:
      cookieStore.get("bosai_force_commercial_onboarding")?.value,
    force_commercial_onboarding:
      cookieStore.get("force_commercial_onboarding")?.value,
  };

  /**
   * Priorité absolue :
   * si un workspace dashboard valide existe, on entre.
   * On ne laisse pas les cookies onboarding reprendre la main.
   */
  const resolution = await resolveWorkspaceAccess({
    userId: text(session.user?.userId),
    requestedWorkspaceId: text(session.cookieSnapshot.activeWorkspaceId),
    nextPath: text(session.homeRoute) || "/overview",
    onboardingCookieValues,
  });

  const activeWorkspace =
    resolution.kind === "allow_dashboard" ? resolution.activeWorkspace : null;

  if (activeWorkspace) {
    const entitlements =
      resolution.context?.entitlements || FALLBACK_ENTITLEMENTS;

    return (
      <AppShell workspace={activeWorkspace} entitlements={entitlements}>
        <WorkspaceRouteMemory workspaceId={activeWorkspace.workspaceId} />
        {children}
      </AppShell>
    );
  }

  /**
   * La garde commerciale ne s'applique que si aucun workspace dashboard
   * n'est autorisé.
   */
  if (hasCommercialOnboardingSignals(onboardingCookieValues)) {
    const accessState = resolveBosaiAccessState({
      cookieValues: onboardingCookieValues,
    });

    if (!accessState.canAccessCockpit && accessState.redirectPath) {
      redirect(accessState.redirectPath);
    }
  }

  redirect(resolution.redirectTo || AUTH_LOGIN_ROUTE);
}
