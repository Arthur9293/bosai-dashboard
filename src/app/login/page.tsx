import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import {
  hasCommercialOnboardingSignals,
  resolveBosaiAccessState,
} from "@/lib/onboarding-access";
import { resolveWorkspaceAccess } from "@/lib/workspaces/resolver";

export default async function LoginPage() {
  const session = await resolveAuthSession();

  if (session.isAuthenticated) {
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
    };

    const shouldApplyCommercialGuard =
      hasCommercialOnboardingSignals(onboardingCookieValues);

    if (shouldApplyCommercialGuard) {
      const accessState = resolveBosaiAccessState({
        cookieValues: onboardingCookieValues,
      });

      if (!accessState.canAccessCockpit && accessState.redirectPath) {
        redirect(accessState.redirectPath);
      }
    }

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
