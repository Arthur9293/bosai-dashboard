// src/lib/workspaces/resolver.ts

import "server-only";

import { isAirtableLiveConfigured } from "../airtable/config";
import { listLiveMembershipsForUser } from "../airtable/memberships";
import { getLiveWorkspaceQuotaByWorkspaceId } from "../airtable/quotas";
import { listLiveWorkspaces } from "../airtable/workspaces";
import {
  hasCommercialOnboardingSignals,
  resolveBosaiAccessState,
  type BosaiPlanCode,
} from "../onboarding-access";
import {
  getMockEntitlements,
  getMockQuotaSnapshot,
  listMockWorkspaceSummariesForUser,
} from "./mock-registry";
import type {
  MembershipStatus,
  WorkspaceCategory,
  WorkspaceContext,
  WorkspaceEntitlements,
  WorkspacePlan,
  WorkspaceQuotaSnapshot,
  WorkspaceResolverInput,
  WorkspaceRole,
  WorkspaceStatus,
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
  onboardingCookieValues?: Record<string, string | undefined>;
};

type SyntheticCommercialWorkspace = {
  workspace: WorkspaceSummary;
  planCode: BosaiPlanCode;
};

function normalizeText(value?: string | null): string {
  return String(value || "").trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getRecordFields(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  return asRecord(record.fields);
}

function pickText(value: unknown): string {
  if (typeof value === "string") return normalizeText(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = pickText(item);
      if (candidate) return candidate;
    }
    return "";
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidates = [
      record.id,
      record.name,
      record.value,
      record.label,
      record.slug,
      record.email,
      record.Workspace_ID,
      record.Display_Name,
      record.User_ID,
    ];

    for (const candidate of candidates) {
      const text = pickText(candidate);
      if (text) return text;
    }
  }

  return "";
}

function pickFirstText(source: unknown, keys: string[]): string {
  const root = asRecord(source);
  const fields = getRecordFields(source);

  for (const key of keys) {
    const fromRoot = pickText(root[key]);
    if (fromRoot) return fromRoot;

    const fromFields = pickText(fields[key]);
    if (fromFields) return fromFields;
  }

  return "";
}

function pickBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const text = normalizeText(pickText(value)).toLowerCase();
  if (!text) return null;

  if (["true", "1", "yes", "y", "on", "active"].includes(text)) return true;
  if (["false", "0", "no", "n", "off", "inactive"].includes(text)) return false;

  return null;
}

function pickFirstBoolean(source: unknown, keys: string[]): boolean | null {
  const root = asRecord(source);
  const fields = getRecordFields(source);

  for (const key of keys) {
    const fromRoot = pickBooleanValue(root[key]);
    if (fromRoot !== null) return fromRoot;

    const fromFields = pickBooleanValue(fields[key]);
    if (fromFields !== null) return fromFields;
  }

  return null;
}

function toNumber(value: unknown): number | null {
  const text = pickText(value);
  if (!text) return null;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCategory(value?: string | null): WorkspaceCategory {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "agency") return "agency";
  if (normalized === "company") return "company";
  if (normalized === "freelance") return "freelance";
  return "personal";
}

function normalizePlan(value?: string | null): WorkspacePlan {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "enterprise") return "enterprise";
  if (normalized === "agency") return "agency";
  if (normalized === "company") return "company";
  if (normalized === "freelance") return "freelance";
  return "personal";
}

function normalizeWorkspaceStatus(value?: string | null): WorkspaceStatus {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "inactive") return "inactive";
  if (normalized === "blocked") return "blocked";
  if (normalized === "pending") return "pending";
  return "active";
}

function normalizeMembershipStatus(value?: string | null): MembershipStatus {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "invited") return "invited";
  if (normalized === "revoked") return "revoked";
  if (normalized === "suspended") return "suspended";
  return "active";
}

function normalizeRole(value?: string | null): WorkspaceRole {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "admin") return "admin";
  if (normalized === "operator") return "operator";
  if (normalized === "member") return "member";
  if (normalized === "viewer") return "viewer";
  return "owner";
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
  void category;
  return "/workspace";
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

function buildMockWorkspaceContext(
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

function buildFallbackEntitlements(role: WorkspaceRole): WorkspaceEntitlements {
  const elevated = role === "owner" || role === "admin";

  return {
    canAccessDashboard: true,
    canRunHttp: elevated || role === "operator",
    canViewIncidents: elevated || role === "operator" || role === "viewer",
    canManagePolicies: elevated,
    canManageTools: elevated,
    canManageWorkspaces: elevated,
    canManageBilling: role === "owner",
  };
}

type NormalizedLiveWorkspace = {
  summary: WorkspaceSummary;
  raw: Record<string, unknown>;
};

function normalizeLiveWorkspace(
  workspace: unknown
): NormalizedLiveWorkspace | null {
  const workspaceId =
    pickFirstText(workspace, ["Workspace_ID", "workspaceId", "id"]) ||
    pickText(asRecord(workspace).id);

  if (!workspaceId) return null;

  const name = pickFirstText(workspace, ["Name", "Workspace_Name", "Display_Name"]);
  const slug = pickFirstText(workspace, ["Slug", "slug"]);
  const category = normalizeCategory(
    pickFirstText(workspace, ["Category", "Type", "Workspace_Type"])
  );
  const plan = normalizePlan(
    pickFirstText(workspace, ["Plan", "Plan_ID", "Type", "Category"]) || category
  );
  const status = normalizeWorkspaceStatus(
    pickFirstText(workspace, ["Status_select", "Status", "status"])
  );

  return {
    raw: asRecord(workspace),
    summary: {
      workspaceId,
      slug: slug || workspaceId.toLowerCase(),
      name: name || workspaceId,
      category,
      plan,
      status,
      membershipRole: "member",
      membershipStatus: "active",
      isDefault: false,
    },
  };
}

function buildLiveWorkspaceIndexes(workspaces: unknown[]): {
  byWorkspaceId: Map<string, NormalizedLiveWorkspace>;
  bySlug: Map<string, NormalizedLiveWorkspace>;
  byName: Map<string, NormalizedLiveWorkspace>;
} {
  const byWorkspaceId = new Map<string, NormalizedLiveWorkspace>();
  const bySlug = new Map<string, NormalizedLiveWorkspace>();
  const byName = new Map<string, NormalizedLiveWorkspace>();

  for (const workspace of workspaces) {
    const normalized = normalizeLiveWorkspace(workspace);
    if (!normalized) continue;

    byWorkspaceId.set(normalized.summary.workspaceId, normalized);

    if (normalized.summary.slug) {
      bySlug.set(normalized.summary.slug.toLowerCase(), normalized);
    }

    if (normalized.summary.name) {
      byName.set(normalized.summary.name.toLowerCase(), normalized);
    }
  }

  return { byWorkspaceId, bySlug, byName };
}

function resolveWorkspaceFromMembership(
  membership: unknown,
  indexes: ReturnType<typeof buildLiveWorkspaceIndexes>
): NormalizedLiveWorkspace | null {
  const workspaceId = pickFirstText(membership, [
    "Workspace_ID_Cache",
    "Workspace_ID_Text",
    "Workspace_ID",
    "workspaceId",
  ]);

  if (workspaceId && indexes.byWorkspaceId.has(workspaceId)) {
    return indexes.byWorkspaceId.get(workspaceId) || null;
  }

  const linkedWorkspace = pickFirstText(membership, ["Workspace"]);
  if (linkedWorkspace && indexes.byWorkspaceId.has(linkedWorkspace)) {
    return indexes.byWorkspaceId.get(linkedWorkspace) || null;
  }

  if (linkedWorkspace && indexes.bySlug.has(linkedWorkspace.toLowerCase())) {
    return indexes.bySlug.get(linkedWorkspace.toLowerCase()) || null;
  }

  if (linkedWorkspace && indexes.byName.has(linkedWorkspace.toLowerCase())) {
    return indexes.byName.get(linkedWorkspace.toLowerCase()) || null;
  }

  return null;
}

function normalizeLiveMembershipSummary(
  membership: unknown,
  indexes: ReturnType<typeof buildLiveWorkspaceIndexes>
): WorkspaceSummary | null {
  const matchedWorkspace = resolveWorkspaceFromMembership(membership, indexes);
  const fallbackWorkspaceId = pickFirstText(membership, [
    "Workspace_ID_Cache",
    "Workspace_ID_Text",
    "Workspace_ID",
    "workspaceId",
  ]);

  const workspaceId = matchedWorkspace?.summary.workspaceId || fallbackWorkspaceId;
  if (!workspaceId) return null;

  const category =
    matchedWorkspace?.summary.category ||
    normalizeCategory(pickFirstText(membership, ["Category", "Type"]));

  const plan =
    matchedWorkspace?.summary.plan ||
    normalizePlan(
      pickFirstText(membership, ["Plan", "Plan_ID", "Type"]) || category
    );

  const status =
    matchedWorkspace?.summary.status ||
    normalizeWorkspaceStatus(
      pickFirstText(membership, ["Workspace_Status", "Status_select", "Status"])
    );

  return {
    workspaceId,
    slug:
      matchedWorkspace?.summary.slug ||
      pickFirstText(membership, ["Workspace_Slug", "Slug"]) ||
      workspaceId.toLowerCase(),
    name:
      matchedWorkspace?.summary.name ||
      pickFirstText(membership, ["Workspace_Name", "Workspace"]) ||
      workspaceId,
    category,
    plan,
    status,
    membershipRole: normalizeRole(
      pickFirstText(membership, ["Role", "Membership_Role"])
    ),
    membershipStatus: normalizeMembershipStatus(
      pickFirstText(membership, ["Status", "Membership_Status", "Status_select"])
    ),
    isDefault:
      pickFirstBoolean(membership, ["Is_Default", "Default"]) ?? false,
  };
}

function dedupeWorkspaceSummaries(
  memberships: WorkspaceSummary[]
): WorkspaceSummary[] {
  const map = new Map<string, WorkspaceSummary>();

  for (const membership of memberships) {
    const existing = map.get(membership.workspaceId);

    if (!existing) {
      map.set(membership.workspaceId, membership);
      continue;
    }

    map.set(membership.workspaceId, {
      ...existing,
      ...membership,
      isDefault: existing.isDefault || membership.isDefault,
    });
  }

  return Array.from(map.values());
}

function buildLiveEntitlements(
  workspace: NormalizedLiveWorkspace | null,
  membershipRole: WorkspaceRole
): WorkspaceEntitlements {
  if (!workspace) {
    return buildFallbackEntitlements(membershipRole);
  }

  const raw = workspace.raw;

  const explicit = {
    canAccessDashboard: pickFirstBoolean(raw, ["Can_Access_Dashboard"]),
    canRunHttp: pickFirstBoolean(raw, ["Can_Run_HTTP"]),
    canViewIncidents: pickFirstBoolean(raw, ["Can_View_Incidents"]),
    canManagePolicies: pickFirstBoolean(raw, ["Can_Manage_Policies"]),
    canManageTools: pickFirstBoolean(raw, ["Can_Manage_Tools"]),
    canManageWorkspaces: pickFirstBoolean(raw, ["Can_Manage_Workspaces"]),
    canManageBilling: pickFirstBoolean(raw, ["Can_Manage_Billing"]),
  };

  const derived = buildFallbackEntitlements(membershipRole);

  return {
    canAccessDashboard: explicit.canAccessDashboard ?? derived.canAccessDashboard,
    canRunHttp: explicit.canRunHttp ?? derived.canRunHttp,
    canViewIncidents: explicit.canViewIncidents ?? derived.canViewIncidents,
    canManagePolicies: explicit.canManagePolicies ?? derived.canManagePolicies,
    canManageTools: explicit.canManageTools ?? derived.canManageTools,
    canManageWorkspaces:
      explicit.canManageWorkspaces ?? derived.canManageWorkspaces,
    canManageBilling: explicit.canManageBilling ?? derived.canManageBilling,
  };
}

function normalizeLiveQuota(quota: unknown): WorkspaceQuotaSnapshot | null {
  if (!quota) return null;

  const fields = getRecordFields(quota);
  const root = asRecord(quota);

  const periodKey =
    pickText(fields.Period_Key) ||
    pickText(fields.Current_Usage_Period_Key) ||
    pickText(root.Period_Key) ||
    new Date().toISOString().slice(0, 7);

  return {
    runsUsed:
      toNumber(fields.Usage_Runs_Month) ??
      toNumber(fields.Runs_Used) ??
      0,
    runsHardLimit:
      toNumber(fields.Hard_Limit_Runs_Month) ??
      toNumber(fields.Runs_Hard_Limit),
    tokensUsed:
      toNumber(fields.Usage_Tokens_Month) ??
      toNumber(fields.Tokens_Used) ??
      0,
    tokensHardLimit:
      toNumber(fields.Hard_Limit_Tokens_Month) ??
      toNumber(fields.Tokens_Hard_Limit),
    httpCallsUsed:
      toNumber(fields.Usage_HTTP_Calls_Month) ??
      toNumber(fields.HTTP_Calls_Used) ??
      0,
    httpCallsHardLimit:
      toNumber(fields.Hard_Limit_HTTP_Calls_Month) ??
      toNumber(fields.HTTP_Calls_Hard_Limit),
    periodKey,
  };
}

async function tryResolveLiveWorkspaceState(
  userId: string
): Promise<{
  memberships: WorkspaceSummary[];
  quotaByWorkspaceId: Map<string, WorkspaceQuotaSnapshot | null>;
  entitlementsByWorkspaceId: Map<string, WorkspaceEntitlements>;
} | null> {
  if (!isAirtableLiveConfigured()) {
    return null;
  }

  try {
    const [rawMemberships, rawWorkspaces] = await Promise.all([
      (listLiveMembershipsForUser as any)({ userId }),
      (listLiveWorkspaces as any)(),
    ]);

    if (!Array.isArray(rawMemberships) || rawMemberships.length === 0) {
      return null;
    }

    const indexes = buildLiveWorkspaceIndexes(
      Array.isArray(rawWorkspaces) ? rawWorkspaces : []
    );

    const memberships = dedupeWorkspaceSummaries(
      rawMemberships
        .map((membership) =>
          normalizeLiveMembershipSummary(membership, indexes)
        )
        .filter(Boolean) as WorkspaceSummary[]
    ).filter(
      (item) =>
        item.membershipStatus === "active" && item.status === "active"
    );

    if (memberships.length === 0) {
      return null;
    }

    const entitlementsByWorkspaceId = new Map<string, WorkspaceEntitlements>();

    for (const membership of memberships) {
      const workspace = indexes.byWorkspaceId.get(membership.workspaceId) || null;
      entitlementsByWorkspaceId.set(
        membership.workspaceId,
        buildLiveEntitlements(workspace, membership.membershipRole)
      );
    }

    const quotaByWorkspaceId = new Map<string, WorkspaceQuotaSnapshot | null>();

    await Promise.all(
      memberships.map(async (membership) => {
        try {
          const rawQuota = await (getLiveWorkspaceQuotaByWorkspaceId as any)(
            membership.workspaceId
          );
          quotaByWorkspaceId.set(
            membership.workspaceId,
            normalizeLiveQuota(rawQuota)
          );
        } catch {
          quotaByWorkspaceId.set(membership.workspaceId, null);
        }
      })
    );

    return {
      memberships,
      quotaByWorkspaceId,
      entitlementsByWorkspaceId,
    };
  } catch {
    return null;
  }
}

async function resolveWorkspaceSource(
  userId: string
): Promise<{
  memberships: WorkspaceSummary[];
  quotaByWorkspaceId: Map<string, WorkspaceQuotaSnapshot | null>;
  entitlementsByWorkspaceId: Map<string, WorkspaceEntitlements>;
  mode: "live" | "mock";
}> {
  const liveState = await tryResolveLiveWorkspaceState(userId);

  if (liveState) {
    return {
      ...liveState,
      mode: "live",
    };
  }

  const mockMemberships = listMockWorkspaceSummariesForUser(userId).filter(
    (item) => item.membershipStatus === "active" && item.status === "active"
  );

  const quotaByWorkspaceId = new Map<string, WorkspaceQuotaSnapshot | null>();
  const entitlementsByWorkspaceId = new Map<string, WorkspaceEntitlements>();

  for (const membership of mockMemberships) {
    quotaByWorkspaceId.set(
      membership.workspaceId,
      getMockQuotaSnapshot(membership.workspaceId)
    );
    entitlementsByWorkspaceId.set(
      membership.workspaceId,
      getMockEntitlements(membership.workspaceId, membership.membershipRole)
    );
  }

  return {
    memberships: mockMemberships,
    quotaByWorkspaceId,
    entitlementsByWorkspaceId,
    mode: "mock",
  };
}

function getSyntheticWorkspaceCategory(planCode: BosaiPlanCode): WorkspaceCategory {
  if (planCode === "agency") return "agency";
  if (planCode === "custom") return "company";
  if (planCode === "pro") return "freelance";
  return "personal";
}

function getSyntheticWorkspacePlan(planCode: BosaiPlanCode): WorkspacePlan {
  if (planCode === "agency") return "agency";
  if (planCode === "custom") return "enterprise";
  if (planCode === "pro") return "freelance";
  return "personal";
}

function getSyntheticWorkspaceName(planCode: BosaiPlanCode): string {
  if (planCode === "agency") return "BOSAI Agency Workspace";
  if (planCode === "custom") return "BOSAI Custom Workspace";
  if (planCode === "pro") return "BOSAI Pro Workspace";
  return "BOSAI Starter Workspace";
}

function buildSyntheticWorkspaceSummary(args: {
  workspaceId: string;
  planCode: BosaiPlanCode;
}): WorkspaceSummary {
  const category = getSyntheticWorkspaceCategory(args.planCode);
  const plan = getSyntheticWorkspacePlan(args.planCode);

  return {
    workspaceId: args.workspaceId,
    slug: normalizeText(args.workspaceId).toLowerCase(),
    name: getSyntheticWorkspaceName(args.planCode),
    category,
    plan,
    status: "active",
    membershipRole: "owner",
    membershipStatus: "active",
    isDefault: true,
  };
}

function buildSyntheticQuota(planCode: BosaiPlanCode): WorkspaceQuotaSnapshot {
  const periodKey = new Date().toISOString().slice(0, 7);

  if (planCode === "agency") {
    return {
      runsUsed: 0,
      runsHardLimit: 50000,
      tokensUsed: 0,
      tokensHardLimit: 5000000,
      httpCallsUsed: 0,
      httpCallsHardLimit: 20000,
      periodKey,
    };
  }

  if (planCode === "custom") {
    return {
      runsUsed: 0,
      runsHardLimit: 100000,
      tokensUsed: 0,
      tokensHardLimit: 10000000,
      httpCallsUsed: 0,
      httpCallsHardLimit: 50000,
      periodKey,
    };
  }

  if (planCode === "pro") {
    return {
      runsUsed: 0,
      runsHardLimit: 10000,
      tokensUsed: 0,
      tokensHardLimit: 1000000,
      httpCallsUsed: 0,
      httpCallsHardLimit: 5000,
      periodKey,
    };
  }

  return {
    runsUsed: 0,
    runsHardLimit: 2500,
    tokensUsed: 0,
    tokensHardLimit: 250000,
    httpCallsUsed: 0,
    httpCallsHardLimit: 1000,
    periodKey,
  };
}

function buildSyntheticEntitlements(
  planCode: BosaiPlanCode
): WorkspaceEntitlements {
  if (planCode === "custom") {
    return {
      canAccessDashboard: true,
      canRunHttp: true,
      canViewIncidents: true,
      canManagePolicies: true,
      canManageTools: true,
      canManageWorkspaces: true,
      canManageBilling: true,
    };
  }

  if (planCode === "agency") {
    return {
      canAccessDashboard: true,
      canRunHttp: true,
      canViewIncidents: true,
      canManagePolicies: true,
      canManageTools: true,
      canManageWorkspaces: true,
      canManageBilling: true,
    };
  }

  if (planCode === "pro") {
    return {
      canAccessDashboard: true,
      canRunHttp: true,
      canViewIncidents: true,
      canManagePolicies: false,
      canManageTools: false,
      canManageWorkspaces: false,
      canManageBilling: true,
    };
  }

  return {
    canAccessDashboard: true,
    canRunHttp: false,
    canViewIncidents: false,
    canManagePolicies: false,
    canManageTools: false,
    canManageWorkspaces: false,
    canManageBilling: true,
  };
}

function resolveSyntheticCommercialWorkspace(args: {
  requestedWorkspaceId: string;
  onboardingCookieValues?: Record<string, string | undefined>;
}): SyntheticCommercialWorkspace | null {
  const cookieValues = args.onboardingCookieValues || {};

  if (!hasCommercialOnboardingSignals(cookieValues)) {
    return null;
  }

  const accessState = resolveBosaiAccessState({
    cookieValues,
  });

  if (!accessState.canAccessCockpit) {
    return null;
  }

  const pendingWorkspaceId =
    normalizeText(cookieValues.bosai_pending_workspace_id) ||
    normalizeText(args.requestedWorkspaceId);

  if (!pendingWorkspaceId) {
    return null;
  }

  const planCode = accessState.planCode || "starter";

  return {
    planCode,
    workspace: buildSyntheticWorkspaceSummary({
      workspaceId: pendingWorkspaceId,
      planCode,
    }),
  };
}

function buildSyntheticWorkspaceContext(args: {
  activeWorkspace: WorkspaceSummary;
  memberships: WorkspaceSummary[];
  planCode: BosaiPlanCode;
}): WorkspaceContext {
  return {
    activeWorkspace: args.activeWorkspace,
    memberships: args.memberships,
    quota: buildSyntheticQuota(args.planCode),
    entitlements: buildSyntheticEntitlements(args.planCode),
  };
}

export async function resolveWorkspaceAccess(
  options: ResolverOptions
): Promise<WorkspaceResolutionResult> {
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

  const source = await resolveWorkspaceSource(userId);
  const syntheticCommercialWorkspace = resolveSyntheticCommercialWorkspace({
    requestedWorkspaceId,
    onboardingCookieValues: options.onboardingCookieValues,
  });

  const memberships = dedupeWorkspaceSummaries(
    syntheticCommercialWorkspace
      ? [syntheticCommercialWorkspace.workspace, ...source.memberships]
      : source.memberships
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

  const syntheticWorkspaceId =
    syntheticCommercialWorkspace?.workspace.workspaceId || "";

  const isSyntheticActiveWorkspace =
    syntheticWorkspaceId !== "" &&
    activeWorkspace.workspaceId === syntheticWorkspaceId;

  const context: WorkspaceContext =
    isSyntheticActiveWorkspace && syntheticCommercialWorkspace
      ? buildSyntheticWorkspaceContext({
          activeWorkspace,
          memberships,
          planCode: syntheticCommercialWorkspace.planCode,
        })
      : source.mode === "mock"
        ? buildMockWorkspaceContext(activeWorkspace, memberships)
        : {
            activeWorkspace,
            memberships,
            quota:
              source.quotaByWorkspaceId.get(activeWorkspace.workspaceId) || null,
            entitlements:
              source.entitlementsByWorkspaceId.get(activeWorkspace.workspaceId) ||
              buildFallbackEntitlements(activeWorkspace.membershipRole),
          };

  return {
    kind: "allow_dashboard",
    reason: "workspace_cookie_valid",
    redirectTo: dashboardRoute,
    requestedWorkspaceId,
    activeWorkspace,
    memberships,
    context,
    autoActivateWorkspaceId: "",
    dashboardRoute,
  };
}
