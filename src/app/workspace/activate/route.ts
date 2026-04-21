import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import {
  getDashboardRouteForWorkspaceCategory,
  resolveWorkspaceAccess,
} from "@/lib/workspaces/resolver";
import {
  WORKSPACE_ROUTE_MEMORY_COOKIE_NAME,
  getRememberedRouteForWorkspace,
  readWorkspaceRememberedRoutes,
} from "@/lib/workspaces/route-memory";

const AUTH_COOKIE_NAME =
  (process.env.BOSAI_AUTH_COOKIE_NAME || "bosai_auth").trim() || "bosai_auth";

const AUTH_COOKIE_VALUE =
  (process.env.BOSAI_AUTH_COOKIE_VALUE || "authenticated").trim() ||
  "authenticated";

const WORKSPACE_ACTIVE_COOKIE_NAME =
  (
    process.env.BOSAI_ACTIVE_WORKSPACE_COOKIE_NAME ||
    "bosai_active_workspace_id"
  ).trim() || "bosai_active_workspace_id";

const WORKSPACE_ALIAS_COOKIE_NAME =
  (process.env.BOSAI_WORKSPACE_COOKIE_NAME || "bosai_workspace_id").trim() ||
  "bosai_workspace_id";

const WORKSPACE_LEGACY_COOKIE_NAME =
  (process.env.BOSAI_WORKSPACE_LEGACY_COOKIE_NAME || "workspace_id").trim() ||
  "workspace_id";

const WORKSPACE_ALLOWED_COOKIE_NAME =
  (
    process.env.BOSAI_ALLOWED_WORKSPACES_COOKIE_NAME ||
    "bosai_allowed_workspace_ids"
  ).trim() || "bosai_allowed_workspace_ids";

const WORKSPACE_STATUS_COOKIE_NAME =
  (
    process.env.BOSAI_WORKSPACE_STATUS_COOKIE_NAME ||
    "bosai_workspace_status"
  ).trim() || "bosai_workspace_status";

const WORKSPACE_STATUS_ALIAS_COOKIE_NAME =
  (
    process.env.BOSAI_WORKSPACE_STATUS_ALIAS_COOKIE_NAME ||
    "workspace_status"
  ).trim() || "workspace_status";

const ONBOARDING_COMPLETED_COOKIE_NAME =
  (
    process.env.BOSAI_ONBOARDING_COMPLETED_COOKIE_NAME ||
    "bosai_onboarding_completed"
  ).trim() || "bosai_onboarding_completed";

const ONBOARDING_COMPLETED_ALIAS_COOKIE_NAME =
  (
    process.env.BOSAI_ONBOARDING_COMPLETED_ALIAS_COOKIE_NAME ||
    "onboarding_completed"
  ).trim() || "onboarding_completed";

const PENDING_WORKSPACE_COOKIE_NAME =
  (
    process.env.BOSAI_PENDING_WORKSPACE_COOKIE_NAME ||
    "bosai_pending_workspace_id"
  ).trim() || "bosai_pending_workspace_id";

const DEDICATED_SPACE_COOKIE_NAME =
  (
    process.env.BOSAI_DEDICATED_SPACE_COOKIE_NAME ||
    "bosai_dedicated_space"
  ).trim() || "bosai_dedicated_space";

const DEDICATED_SPACE_ALIAS_COOKIE_NAME =
  (process.env.BOSAI_DEDICATED_SPACE_ALIAS_COOKIE_NAME || "dedicated_space").trim() ||
  "dedicated_space";

const MANUAL_WORKSPACE_SELECT_HREF = "/workspace/select?manual=1";

type CommercialPlanCode = "starter" | "pro" | "agency" | "custom";

function text(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => text(item)).filter(Boolean)));
}

function normalizeInternalPath(value: unknown): string {
  const normalized = text(value);

  if (!normalized.startsWith("/")) return "";
  if (normalized.startsWith("//")) return "";

  return normalized;
}

function normalizePlanCode(value?: string | null): CommercialPlanCode {
  const normalized = text(value).toLowerCase();

  if (normalized === "pro") return "pro";
  if (normalized === "agency") return "agency";
  if (normalized === "custom") return "custom";
  return "starter";
}

function inferPlanCodeFromWorkspaceId(
  workspaceId?: string | null
): CommercialPlanCode {
  const normalized = text(workspaceId).toLowerCase();

  if (normalized.endsWith("_pro")) return "pro";
  if (normalized.endsWith("_agency")) return "agency";
  if (normalized.endsWith("_custom")) return "custom";
  return "starter";
}

function resolveOnboardingPlanCode(args: {
  workspaceId?: string | null;
  cookieValues: Record<string, string | undefined>;
}): CommercialPlanCode {
  return normalizePlanCode(
    args.cookieValues.bosai_plan_code ||
      args.cookieValues.plan_code ||
      args.cookieValues.selected_plan ||
      inferPlanCodeFromWorkspaceId(args.workspaceId)
  );
}

function getDedicatedSpaceForPlan(planCode: CommercialPlanCode): string {
  if (planCode === "agency") return "agency_space";
  if (planCode === "custom") return "company_space";
  if (planCode === "pro") return "freelance_space";
  return "personal_space";
}

function isOnboardingWorkspaceId(value?: string | null): boolean {
  return text(value).startsWith("ws_onboarding_");
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

function buildRedirectUrl(request: NextRequest, path: string): URL {
  const normalized = normalizeInternalPath(path) || "/";
  return new URL(normalized, request.url);
}

function buildLoginUrl(request: NextRequest, nextPath: string): URL {
  const url = buildRedirectUrl(request, AUTH_LOGIN_ROUTE);
  const normalizedNext = normalizeInternalPath(nextPath);

  if (normalizedNext) {
    url.searchParams.set("next", normalizedNext);
  }

  return url;
}

export async function GET(request: NextRequest) {
  const session = await resolveAuthSession();

  const explicitNextParam = normalizeInternalPath(
    request.nextUrl.searchParams.get("next")
  );

  const nextParam =
    explicitNextParam || normalizeInternalPath(session.homeRoute) || "/overview";

  if (!session.isAuthenticated) {
    return NextResponse.redirect(buildLoginUrl(request, nextParam));
  }

  const onboardingCookieValues = {
    bosai_plan_code: request.cookies.get("bosai_plan_code")?.value,
    plan_code: request.cookies.get("plan_code")?.value,
    selected_plan: request.cookies.get("selected_plan")?.value,
    bosai_workspace_status: request.cookies.get("bosai_workspace_status")?.value,
    workspace_status: request.cookies.get("workspace_status")?.value,
    bosai_checkout_completed:
      request.cookies.get("bosai_checkout_completed")?.value,
    checkout_completed: request.cookies.get("checkout_completed")?.value,
    bosai_onboarding_completed:
      request.cookies.get("bosai_onboarding_completed")?.value,
    onboarding_completed: request.cookies.get("onboarding_completed")?.value,
    bosai_pending_workspace_id:
      request.cookies.get("bosai_pending_workspace_id")?.value,
    bosai_force_commercial_onboarding:
      request.cookies.get("bosai_force_commercial_onboarding")?.value,
    force_commercial_onboarding:
      request.cookies.get("force_commercial_onboarding")?.value,
  };

  const requestedWorkspaceId =
    text(request.nextUrl.searchParams.get("workspace_id")) ||
    text(onboardingCookieValues.bosai_pending_workspace_id) ||
    text(session.cookieSnapshot.activeWorkspaceId);

  /**
   * Fast-path critique :
   * pour un workspace onboarding synthétique, on active directement
   * les cookies sans repasser dans une résolution complexe.
   *
   * C’est ce qui évite la boucle :
   * create -> activate -> resolver -> ancien état -> accueil
   */
  if (isOnboardingWorkspaceId(requestedWorkspaceId)) {
    const planCode = resolveOnboardingPlanCode({
      workspaceId: requestedWorkspaceId,
      cookieValues: onboardingCookieValues,
    });

    const dedicatedSpace = getDedicatedSpaceForPlan(planCode);

    const allowedWorkspaceIds = uniq([
      requestedWorkspaceId,
      ...session.cookieSnapshot.allowedWorkspaceIds,
    ]);

    const finalTarget = explicitNextParam || "/workspace";
    const response = NextResponse.redirect(
      buildRedirectUrl(request, finalTarget)
    );

    const options = cookieOptions();

    response.cookies.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, options);
    response.cookies.set(
      WORKSPACE_ACTIVE_COOKIE_NAME,
      requestedWorkspaceId,
      options
    );
    response.cookies.set(
      WORKSPACE_ALIAS_COOKIE_NAME,
      requestedWorkspaceId,
      options
    );
    response.cookies.set(
      WORKSPACE_LEGACY_COOKIE_NAME,
      requestedWorkspaceId,
      options
    );
    response.cookies.set(
      WORKSPACE_ALLOWED_COOKIE_NAME,
      JSON.stringify(allowedWorkspaceIds),
      options
    );

    response.cookies.set(WORKSPACE_STATUS_COOKIE_NAME, "active", options);
    response.cookies.set(WORKSPACE_STATUS_ALIAS_COOKIE_NAME, "active", options);
    response.cookies.set(ONBOARDING_COMPLETED_COOKIE_NAME, "1", options);
    response.cookies.set(ONBOARDING_COMPLETED_ALIAS_COOKIE_NAME, "1", options);
    response.cookies.set(
      PENDING_WORKSPACE_COOKIE_NAME,
      requestedWorkspaceId,
      options
    );
    response.cookies.set(
      DEDICATED_SPACE_COOKIE_NAME,
      dedicatedSpace,
      options
    );
    response.cookies.set(
      DEDICATED_SPACE_ALIAS_COOKIE_NAME,
      dedicatedSpace,
      options
    );

    return response;
  }

  /**
   * Fallback standard :
   * on garde la logique existante pour les workspaces normaux.
   */
  const resolution = await resolveWorkspaceAccess({
    userId: text(session.user?.userId),
    requestedWorkspaceId,
    nextPath: nextParam,
    onboardingCookieValues,
  });

  if (resolution.kind !== "allow_dashboard" || !resolution.activeWorkspace) {
    return NextResponse.redirect(
      buildRedirectUrl(
        request,
        normalizeInternalPath(resolution.redirectTo) ||
          MANUAL_WORKSPACE_SELECT_HREF
      )
    );
  }

  const activeWorkspaceId = text(resolution.activeWorkspace.workspaceId);

  if (!activeWorkspaceId) {
    return NextResponse.redirect(
      buildRedirectUrl(request, MANUAL_WORKSPACE_SELECT_HREF)
    );
  }

  const allowedWorkspaceIds = uniq([
    activeWorkspaceId,
    ...resolution.memberships.map((item) => text(item.workspaceId)),
  ]);

  const rememberedRoutes = readWorkspaceRememberedRoutes(
    request.cookies.get(WORKSPACE_ROUTE_MEMORY_COOKIE_NAME)?.value
  );

  const rememberedTarget = getRememberedRouteForWorkspace(
    rememberedRoutes,
    activeWorkspaceId
  );

  const fallbackDashboard =
    normalizeInternalPath(resolution.dashboardRoute) ||
    getDashboardRouteForWorkspaceCategory(
      resolution.activeWorkspace.category
    ) ||
    "/overview";

  const finalTarget =
    explicitNextParam || rememberedTarget || fallbackDashboard || "/overview";

  const response = NextResponse.redirect(
    buildRedirectUrl(request, finalTarget)
  );

  const options = cookieOptions();

  response.cookies.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, options);
  response.cookies.set(
    WORKSPACE_ACTIVE_COOKIE_NAME,
    activeWorkspaceId,
    options
  );
  response.cookies.set(
    WORKSPACE_ALIAS_COOKIE_NAME,
    activeWorkspaceId,
    options
  );
  response.cookies.set(
    WORKSPACE_LEGACY_COOKIE_NAME,
    activeWorkspaceId,
    options
  );
  response.cookies.set(
    WORKSPACE_ALLOWED_COOKIE_NAME,
    JSON.stringify(allowedWorkspaceIds),
    options
  );

  response.cookies.set(WORKSPACE_STATUS_COOKIE_NAME, "active", options);
  response.cookies.set(WORKSPACE_STATUS_ALIAS_COOKIE_NAME, "active", options);
  response.cookies.set(ONBOARDING_COMPLETED_COOKIE_NAME, "1", options);
  response.cookies.set(ONBOARDING_COMPLETED_ALIAS_COOKIE_NAME, "1", options);
  response.cookies.set(PENDING_WORKSPACE_COOKIE_NAME, activeWorkspaceId, options);

  return response;
}
