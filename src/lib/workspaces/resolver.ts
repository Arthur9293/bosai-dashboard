import {
  getMockEntitlements,
  getMockQuotaSnapshot,
  listMockWorkspaceSummariesForUser,
} from "./mock-registry";
import type {
  WorkspaceContext,
  WorkspaceResolverInput,
  WorkspaceSummary,
} from "./types";

export type WorkspaceResolutionKind =
  | "redirect_login"
  | "redirect_create"
  | "redirect_select"
  | "redirect_activate"
  | "allow_dashboard";

export type WorkspaceResolutionReason =
  | "missing_user"
  | "no_membership"
  | "single_workspace_auto_activate"
  | "multiple_workspaces_select_required"
  | "invalid_requested_workspace"
  | "workspace_not_accessible"
  | "workspace_active"
  | "workspace_cookie_valid";

export type WorkspaceResolutionResult = {
  kind: WorkspaceResolutionKind;
  reason: WorkspaceResolutionReason;
  redirectTo: string;
  requestedWorkspaceId: string;
  activeWorkspace: WorkspaceSummary | null;
  memberships: WorkspaceSummary[];
  context: WorkspaceContext | null;
  autoActivateWorkspaceId: string;
  dashboardRoute: string;
};

type ResolverOptions = WorkspaceResolverInput & {
  nextPath?: string;
};

function normalizeText(value?: string | null): string {
  return String(value || "").trim();
}

function buildQueryString(params: Record<string, string>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    search.set(key, normalized);
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

function getLoginRoute(nextPath?: string): string {
  return `/login${buildQueryString({ next: nextPath || "" })}`;
}

function getCreateWorkspaceRoute(nextPath?: string): string {
  return `/workspace/create${buildQueryString({ next: nextPath || "" })}`;
}

function getSelectWorkspaceRoute(nextPath?: string): string {
  return `/workspace/select${buildQueryString({ next: nextPath || "" })}`;
}

export function getWorkspaceActivateRoute(args: {
  workspaceId: string;
  nextPath?: string;
}): string {
  return `/workspace/activate${buildQueryString({
    workspace_id: args.workspaceId,
    next: args.nextPath || "",
  })}`;
}

export function getDashboardRouteForWorkspaceCategory(
  category?: string | null
): string {
  const normalized = normalizeText(category).toLowerCase();

  if (normalized === "agency") return "/flows";
  if (normalized === "company") return "/workspaces";
  if (normalized === "freelance") return "/commands";
  return "/overview";
}

function findMembershipByWorkspaceId(
  memberships: WorkspaceSummary[],
  workspaceId?: string | null
): WorkspaceSummary | null {
  const normalized = normalizeText(workspaceId).toLowerCase();
  if (!normalized) return null;

  return (
    memberships.find(
      (item) => normalizeText(item.workspaceId).toLowerCase() === normalized
    ) || null
  );
}

function buildWorkspaceContext(
  activeWorkspace: WorkspaceSummary,
  memberships: WorkspaceSummary[]
): WorkspaceContext {
  return {
    activeWorkspace,
    memberships,
    quota: getMockQuotaSnapshot(activeWorkspace.workspaceId),
    entitlements: getMockEntitlements(
      activeWorkspace.workspaceId,
      activeWorkspace.membershipRole
    ),
  };
}

export function resolveWorkspaceAccess(
  options: ResolverOptions
): WorkspaceResolutionResult {
  const userId = normalizeText(options.userId);
  const requestedWorkspaceId = normalizeText(options.requestedWorkspaceId);
  const nextPath = normalizeText(options.nextPath) || "/overview";

  if (!userId) {
    return {
      kind: "redirect_login",
      reason: "missing_user",
      redirectTo: getLoginRoute(nextPath),
      requestedWorkspaceId,
      activeWorkspace: null,
      memberships: [],
      context: null,
      autoActivateWorkspaceId: "",
      dashboardRoute: "",
    };
  }

  const memberships = listMockWorkspaceSummariesForUser(userId).filter(
    (item) => item.membershipStatus === "active" && item.status === "active"
  );

  if (memberships.length === 0) {
    return {
      kind: "redirect_create",
      reason: "no_membership",
      redirectTo: getCreateWorkspaceRoute(nextPath),
      requestedWorkspaceId,
      activeWorkspace: null,
      memberships: [],
      context: null,
      autoActivateWorkspaceId: "",
      dashboardRoute: "",
    };
  }

  const requestedMembership = findMembershipByWorkspaceId(
    memberships,
    requestedWorkspaceId
  );

  if (requestedWorkspaceId && !requestedMembership) {
    if (memberships.length === 1) {
      const onlyWorkspace = memberships[0];
      return {
        kind: "redirect_activate",
        reason: "invalid_requested_workspace",
        redirectTo: getWorkspaceActivateRoute({
          workspaceId: onlyWorkspace.workspaceId,
          nextPath: getDashboardRouteForWorkspaceCategory(onlyWorkspace.category),
        }),
        requestedWorkspaceId,
        activeWorkspace: null,
        memberships,
        context: null,
        autoActivateWorkspaceId: onlyWorkspace.workspaceId,
        dashboardRoute: getDashboardRouteForWorkspaceCategory(
          onlyWorkspace.category
        ),
      };
    }

    return {
      kind: "redirect_select",
      reason: "invalid_requested_workspace",
      redirectTo: getSelectWorkspaceRoute(nextPath),
      requestedWorkspaceId,
      activeWorkspace: null,
      memberships,
      context: null,
      autoActivateWorkspaceId: "",
      dashboardRoute: "",
    };
  }

  if (!requestedMembership && memberships.length > 1) {
    return {
      kind: "redirect_select",
      reason: "multiple_workspaces_select_required",
      redirectTo: getSelectWorkspaceRoute(nextPath),
      requestedWorkspaceId,
      activeWorkspace: null,
      memberships,
      context: null,
      autoActivateWorkspaceId: "",
      dashboardRoute: "",
    };
  }

  if (!requestedMembership && memberships.length === 1) {
    const onlyWorkspace = memberships[0];

    return {
      kind: "redirect_activate",
      reason: "single_workspace_auto_activate",
      redirectTo: getWorkspaceActivateRoute({
        workspaceId: onlyWorkspace.workspaceId,
        nextPath: getDashboardRouteForWorkspaceCategory(onlyWorkspace.category),
      }),
      requestedWorkspaceId,
      activeWorkspace: null,
      memberships,
      context: null,
      autoActivateWorkspaceId: onlyWorkspace.workspaceId,
      dashboardRoute: getDashboardRouteForWorkspaceCategory(
        onlyWorkspace.category
      ),
    };
  }

  const activeWorkspace = requestedMembership;
  if (!activeWorkspace) {
    return {
      kind: "redirect_select",
      reason: "workspace_not_accessible",
      redirectTo: getSelectWorkspaceRoute(nextPath),
      requestedWorkspaceId,
      activeWorkspace: null,
      memberships,
      context: null,
      autoActivateWorkspaceId: "",
      dashboardRoute: "",
    };
  }

  const dashboardRoute = getDashboardRouteForWorkspaceCategory(
    activeWorkspace.category
  );

  return {
    kind: "allow_dashboard",
    reason: "workspace_cookie_valid",
    redirectTo: dashboardRoute,
    requestedWorkspaceId,
    activeWorkspace,
    memberships,
    context: buildWorkspaceContext(activeWorkspace, memberships),
    autoActivateWorkspaceId: "",
    dashboardRoute,
  };
}
