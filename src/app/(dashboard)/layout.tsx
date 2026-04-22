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
import type {
  WorkspaceEntitlements,
  WorkspaceSummary,
} from "@/lib/workspaces/types";

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

function inferCategoryFromPlanCode(
  planCode?: string | null
): WorkspaceSummary["category"] {
  const normalized = text(planCode).toLowerCase();

  if (normalized === "agency") return "agency";
  if (normalized === "custom" || normalized === "company") return "company";
  if (normalized === "pro" || normalized === "freelance") return "freelance";
  return "personal";
}

function inferPlanFromPlanCode(
  planCode?: string | null
): WorkspaceSummary["plan"] {
  const normalized = text(planCode).toLowerCase();

  if (normalized === "agency") return "agency";
  if (normalized === "custom" || normalized === "company") return "company";
  if (normalized === "pro" || normalized === "freelance") return "freelance";
  return "personal";
}

function inferCategoryFromDedicatedSpace(
  dedicatedSpace?: string | null
): WorkspaceSummary["category"] {
  const normalized = text(dedicatedSpace).toLowerCase();

  if (normalized === "agency_space") return "agency";
  if (normalized === "company_space") return "company";
  if (normalized === "freelance_space") return "freelance";
  return "personal";
}

function inferPlanFromDedicatedSpace(
  dedicatedSpace?: string | null
): WorkspaceSummary["plan"] {
  const normalized = text(dedicatedSpace).toLowerCase();

  if (normalized === "agency_space") return "agency";
  if (normalized === "company_space") return "company";
  if (normalized === "freelance_space") return "freelance";
  return "personal";
}

function inferCategoryFromWorkspaceId(
  workspaceId?: string | null,
  fallback?: WorkspaceSummary["category"]
): WorkspaceSummary["category"] {
  const normalized = text(workspaceId).toLowerCase();

  if (normalized.endsWith("_agency")) return "agency";
  if (normalized.endsWith("_custom") || normalized.endsWith("_company")) {
    return "company";
  }
  if (normalized.endsWith("_pro") || normalized.endsWith("_freelance")) {
    return "freelance";
  }
  if (normalized.endsWith("_starter") || normalized.endsWith("_personal")) {
    return "personal";
  }

  return fallback || "personal";
}

function inferPlanFromWorkspaceId(
  workspaceId?: string | null,
  fallback?: WorkspaceSummary["plan"]
): WorkspaceSummary["plan"] {
  const normalized = text(workspaceId).toLowerCase();

  if (normalized.endsWith("_agency")) return "agency";
  if (normalized.endsWith("_custom") || normalized.endsWith("_company")) {
    return "company";
  }
  if (normalized.endsWith("_pro") || normalized.endsWith("_freelance")) {
    return "freelance";
  }
  if (normalized.endsWith("_starter") || normalized.endsWith("_personal")) {
    return "personal";
  }

  return fallback || "personal";
}

function inferSyntheticWorkspaceName(
  category: WorkspaceSummary["category"]
): string {
  if (category === "agency") return "BOSAI Agency Workspace";
  if (category === "company") return "BOSAI Company Workspace";
  if (category === "freelance") return "BOSAI Freelance Workspace";
  return "BOSAI Personal Workspace";
}

function buildSyntheticWorkspace(args: {
  workspaceId: string;
  dedicatedSpace?: string | null;
  planCode?: string | null;
}): WorkspaceSummary {
  const categoryFromPlan = inferCategoryFromPlanCode(args.planCode);
  const categoryFromDedicatedSpace = inferCategoryFromDedicatedSpace(
    args.dedicatedSpace
  );
  const category = inferCategoryFromWorkspaceId(
    args.workspaceId,
    categoryFromPlan || categoryFromDedicatedSpace
  );

  const planFromPlan = inferPlanFromPlanCode(args.planCode);
  const planFromDedicatedSpace = inferPlanFromDedicatedSpace(args.dedicatedSpace);
  const plan = inferPlanFromWorkspaceId(
    args.workspaceId,
    planFromPlan || planFromDedicatedSpace
  );

  return {
    workspaceId: args.workspaceId,
    slug: args.workspaceId,
    name: inferSyntheticWorkspaceName(category),
    category,
    plan,
    status: "active",
    membershipRole: "owner",
    membershipStatus: "active",
    isDefault: true,
  };
}

function shouldUseSyntheticWorkspace(args: {
  requestedWorkspaceId: string;
  onboardingSignals: boolean;
}): boolean {
  const workspaceId = text(args.requestedWorkspaceId);

  if (!workspaceId) return false;
  if (workspaceId.startsWith("ws_onboarding_")) return true;
  if (args.onboardingSignals) return true;

  return false;
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

  const requestedWorkspaceId =
    text(session.cookieSnapshot.activeWorkspaceId) ||
    text(onboardingCookieValues.bosai_pending_workspace_id);

  const resolution = await resolveWorkspaceAccess({
    userId: text(session.user?.userId),
    requestedWorkspaceId,
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

  const onboardingSignals = hasCommercialOnboardingSignals(onboardingCookieValues);

  if (
    shouldUseSyntheticWorkspace({
      requestedWorkspaceId,
      onboardingSignals,
    })
  ) {
    const planCode =
      text(onboardingCookieValues.selected_plan) ||
      text(onboardingCookieValues.bosai_plan_code) ||
      text(onboardingCookieValues.plan_code);

    const dedicatedSpace =
      text(session.cookieSnapshot.dedicatedSpace) ||
      text(onboardingCookieValues.bosai_plan_code) ||
      text(onboardingCookieValues.plan_code);

    const syntheticWorkspace = buildSyntheticWorkspace({
      workspaceId: requestedWorkspaceId,
      dedicatedSpace,
      planCode,
    });

    return (
      <AppShell workspace={syntheticWorkspace} entitlements={FALLBACK_ENTITLEMENTS}>
        <WorkspaceRouteMemory workspaceId={syntheticWorkspace.workspaceId} />
        {children}
      </AppShell>
    );
  }

  if (onboardingSignals) {
    const accessState = resolveBosaiAccessState({
      cookieValues: onboardingCookieValues,
    });

    if (!accessState.canAccessCockpit && accessState.redirectPath) {
      redirect(accessState.redirectPath);
    }
  }

  redirect(resolution.redirectTo || AUTH_LOGIN_ROUTE);
}
