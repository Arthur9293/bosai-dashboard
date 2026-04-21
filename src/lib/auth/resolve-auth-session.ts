import "server-only";

import { cookies } from "next/headers";
import type {
  DedicatedSpaceTarget,
  MembershipStatus,
  WorkspaceCategory,
  WorkspaceContext,
  WorkspaceEntitlements,
  WorkspacePlan,
  WorkspaceQuotaSnapshot,
  WorkspaceRole,
  WorkspaceStatus,
  WorkspaceSummary,
} from "../workspaces/types";
import { getDedicatedSpaceTarget } from "../workspaces/types";
import {
  listLiveMembershipsForUser,
  type LiveMembership,
} from "../airtable/memberships";
import {
  getLiveProfileByEmail,
  getLiveProfileByUserId,
} from "../airtable/profiles";
import { getLiveWorkspaceQuotaByWorkspaceId } from "../airtable/quotas";
import { isAirtableLiveConfigured } from "../airtable/config";
import {
  listLiveWorkspaces,
  type LiveWorkspace,
} from "../airtable/workspaces";
import {
  MOCK_ACTIVE_WORKSPACE_COOKIE_NAME,
  MOCK_ALLOWED_WORKSPACES_COOKIE_NAME,
  MOCK_AUTH_COOKIE_NAME,
  MOCK_AUTH_COOKIE_VALUE,
  MOCK_DEDICATED_SPACE_COOKIE_NAME,
  MOCK_SESSION_TOKEN_COOKIE_NAME,
  MOCK_USER_ID_COOKIE_NAME,
  buildMockSessionCookiePayload,
  getMockLoginRedirect,
  resolveMockSessionFromCookies,
  type MockLoginIntent,
  type MockSessionCookiePayload,
  type ResolvedMockSession,
} from "./mock-session";

export const AUTH_LOGIN_ROUTE = "/login";
export const DEFAULT_AUTHENTICATED_ROUTE = "/overview";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type CookieReadableStore = {
  get: (name: string) => { value?: string } | undefined;
};

export type AuthCookieSnapshot = {
  authValue: string;
  sessionToken: string;
  userId: string;
  activeWorkspaceId: string;
  allowedWorkspaceIdsRaw: string;
  allowedWorkspaceIds: string[];
  dedicatedSpace: string;
};

export type ResolvedAuthSessionState = ResolvedMockSession & {
  authMode: "mock" | "live";
  loginRoute: string;
  homeRoute: string;
  hasSessionToken: boolean;
  cookieSnapshot: AuthCookieSnapshot;
  cookiePayload: MockSessionCookiePayload | null;
};

export type AuthCookieWriteOptions = {
  path: string;
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
};

type NormalizedLiveWorkspace = {
  summary: WorkspaceSummary;
  raw: LiveWorkspace | Record<string, unknown>;
};

function normalizeText(value?: string | null): string {
  return String(value || "").trim();
}

function parseFlexibleList(value?: string | null): string[] {
  const raw = normalizeText(value);
  if (!raw) return [];

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return uniqueStrings(parsed.map((item) => normalizeText(String(item))));
      }
    } catch {}
  }

  return uniqueStrings(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => normalizeText(value)).filter(Boolean))
  );
}

function readFirstCookieValue(
  store: CookieReadableStore,
  names: string[]
): string {
  for (const name of names) {
    const value = normalizeText(store.get(name)?.value);
    if (value) return value;
  }

  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function getRecordFields(value: unknown): Record<string, unknown> {
  const record = asRecord(value);
  const fields = record.fields;
  return asRecord(fields);
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
      record.User_ID,
      record.Workspace_ID,
      record.Display_Name,
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

function normalizeDedicatedSpace(
  value?: string | DedicatedSpaceTarget | null
): DedicatedSpaceTarget | null {
  const normalized = normalizeText(String(value || "")).toLowerCase();

  if (normalized === "personal_space") return "personal_space";
  if (normalized === "freelance_space") return "freelance_space";
  if (normalized === "company_space") return "company_space";
  if (normalized === "agency_space") return "agency_space";

  return null;
}

function mapDedicatedSpaceToRoute(
  target?: DedicatedSpaceTarget | string | null
): string {
  const normalized = normalizeDedicatedSpace(target);

  if (normalized === "personal_space") return "/overview";
  if (normalized === "freelance_space") return "/commands";
  if (normalized === "company_space") return "/workspaces";
  if (normalized === "agency_space") return "/flows";

  return DEFAULT_AUTHENTICATED_ROUTE;
}

function normalizeWorkspaceCategory(value?: string | null): WorkspaceCategory {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "agency") return "agency";
  if (normalized === "company") return "company";
  if (normalized === "freelance") return "freelance";

  return "personal";
}

function normalizeWorkspacePlan(value?: string | null): WorkspacePlan {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "enterprise") return "enterprise";
  if (normalized === "agency") return "agency";
  if (normalized === "company") return "company";
  if (normalized === "freelance") return "freelance";

  return "personal";
}

function normalizeWorkspaceStatus(value?: string | null): WorkspaceStatus {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "blocked") return "blocked";
  if (normalized === "inactive") return "inactive";
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

function normalizeWorkspaceRole(value?: string | null): WorkspaceRole {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "admin") return "admin";
  if (normalized === "operator") return "operator";
  if (normalized === "member") return "member";
  if (normalized === "viewer") return "viewer";

  return "owner";
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

function buildAuthCookieSnapshotFromState(
  current: AuthCookieSnapshot,
  args: {
    userId?: string;
    activeWorkspaceId?: string;
    allowedWorkspaceIds?: string[];
    dedicatedSpace?: DedicatedSpaceTarget | null;
  }
): AuthCookieSnapshot {
  const allowedWorkspaceIds = uniqueStrings(
    args.allowedWorkspaceIds && args.allowedWorkspaceIds.length > 0
      ? args.allowedWorkspaceIds
      : current.allowedWorkspaceIds
  );

  const dedicatedSpace = normalizeDedicatedSpace(
    args.dedicatedSpace || current.dedicatedSpace
  );

  return {
    ...current,
    userId: normalizeText(args.userId || current.userId),
    activeWorkspaceId: normalizeText(
      args.activeWorkspaceId || current.activeWorkspaceId
    ),
    allowedWorkspaceIdsRaw: allowedWorkspaceIds.join(","),
    allowedWorkspaceIds,
    dedicatedSpace: dedicatedSpace || "",
  };
}

function normalizeLiveWorkspace(
  workspace: LiveWorkspace | Record<string, unknown>
): NormalizedLiveWorkspace | null {
  const workspaceId =
    pickFirstText(workspace, ["Workspace_ID", "workspaceId", "id"]) ||
    pickText(asRecord(workspace).id);

  const name = pickFirstText(workspace, ["Name", "Workspace_Name", "Display_Name"]);
  const slug = pickFirstText(workspace, ["Slug", "slug"]);
  const category = normalizeWorkspaceCategory(
    pickFirstText(workspace, ["Category", "Type", "Workspace_Type"])
  );
  const plan = normalizeWorkspacePlan(
    pickFirstText(workspace, ["Plan", "Plan_ID", "Type", "Category"]) || category
  );
  const status = normalizeWorkspaceStatus(
    pickFirstText(workspace, ["Status_select", "Status", "status"])
  );

  if (!workspaceId) return null;

  return {
    raw: workspace,
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

function buildLiveWorkspaceIndexes(
  workspaces: Array<LiveWorkspace | Record<string, unknown>>
): {
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
  membership: LiveMembership | Record<string, unknown>,
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
  membership: LiveMembership | Record<string, unknown>,
  indexes: ReturnType<typeof buildLiveWorkspaceIndexes>
): WorkspaceSummary | null {
  const matchedWorkspace = resolveWorkspaceFromMembership(membership, indexes);
  const fallbackWorkspaceId = pickFirstText(membership, [
    "Workspace_ID_Cache",
    "Workspace_ID_Text",
    "Workspace_ID",
    "workspaceId",
  ]);

  const fallbackCategory = normalizeWorkspaceCategory(
    pickFirstText(membership, ["Category", "Type"])
  );

  const fallbackPlan = normalizeWorkspacePlan(
    pickFirstText(membership, ["Plan", "Plan_ID", "Type"]) || fallbackCategory
  );

  const fallbackStatus = normalizeWorkspaceStatus(
    pickFirstText(membership, ["Workspace_Status", "Status_select", "Status"])
  );

  const workspaceId = matchedWorkspace?.summary.workspaceId || fallbackWorkspaceId;
  if (!workspaceId) return null;

  const membershipRole = normalizeWorkspaceRole(
    pickFirstText(membership, ["Role", "Membership_Role"])
  );
  const membershipStatus = normalizeMembershipStatus(
    pickFirstText(membership, ["Status", "Membership_Status", "Status_select"])
  );
  const isDefault =
    pickFirstBoolean(membership, ["Is_Default", "Default"]) ?? false;

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
    category: matchedWorkspace?.summary.category || fallbackCategory,
    plan: matchedWorkspace?.summary.plan || fallbackPlan,
    status: matchedWorkspace?.summary.status || fallbackStatus,
    membershipRole,
    membershipStatus,
    isDefault,
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

function resolveActiveWorkspaceSummary(
  memberships: WorkspaceSummary[],
  preferredWorkspaceId?: string | null
): WorkspaceSummary | null {
  const preferred = normalizeText(preferredWorkspaceId);

  if (preferred) {
    const exact = memberships.find((item) => item.workspaceId === preferred);
    return exact || null;
  }

  const explicitDefault = memberships.find((item) => item.isDefault);
  if (explicitDefault) return explicitDefault;

  return memberships[0] || null;
}

function buildLiveEntitlements(
  workspace: NormalizedLiveWorkspace | null,
  membershipRole: WorkspaceRole,
  fallback?: WorkspaceEntitlements | null
): WorkspaceEntitlements {
  if (!workspace) {
    return fallback || buildFallbackEntitlements(membershipRole || "viewer");
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

  const derived = fallback || buildFallbackEntitlements(membershipRole);

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

function normalizeQuotaNumber(value: unknown): number {
  const text = pickText(value);
  if (!text) return 0;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeQuotaLimit(value: unknown): number | null {
  const text = pickText(value);
  if (!text) return null;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLiveQuota(
  quota: unknown,
  workspaceId: string
): WorkspaceQuotaSnapshot | null {
  const fields = getRecordFields(quota);
  const root = asRecord(quota);

  const periodKey =
    pickText(fields.Period_Key) ||
    pickText(fields.Current_Usage_Period_Key) ||
    pickText(root.Period_Key) ||
    new Date().toISOString().slice(0, 7);

  return {
    runsUsed:
      normalizeQuotaNumber(fields.Usage_Runs_Month) ||
      normalizeQuotaNumber(fields.Runs_Used),
    runsHardLimit:
      normalizeQuotaLimit(fields.Hard_Limit_Runs_Month) ||
      normalizeQuotaLimit(fields.Runs_Hard_Limit),
    tokensUsed:
      normalizeQuotaNumber(fields.Usage_Tokens_Month) ||
      normalizeQuotaNumber(fields.Tokens_Used),
    tokensHardLimit:
      normalizeQuotaLimit(fields.Hard_Limit_Tokens_Month) ||
      normalizeQuotaLimit(fields.Tokens_Hard_Limit),
    httpCallsUsed:
      normalizeQuotaNumber(fields.Usage_HTTP_Calls_Month) ||
      normalizeQuotaNumber(fields.HTTP_Calls_Used),
    httpCallsHardLimit:
      normalizeQuotaLimit(fields.Hard_Limit_HTTP_Calls_Month) ||
      normalizeQuotaLimit(fields.HTTP_Calls_Hard_Limit),
    periodKey:
      periodKey || `${workspaceId}:${new Date().toISOString().slice(0, 7)}`,
  };
}

function resolveProfileUserId(profile: unknown): string {
  return pickFirstText(profile, ["User_ID", "userId", "UserId", "id"]);
}

function resolveProfileEmail(profile: unknown): string {
  return pickFirstText(profile, ["Email", "email"]);
}

function resolveProfileDisplayName(profile: unknown): string {
  return pickFirstText(profile, ["Display_Name", "displayName", "Name"]);
}

function resolveProfileWorkspaceId(profile: unknown, keys: string[]): string {
  return pickFirstText(profile, keys);
}

async function tryGetLiveProfile(args: {
  userId?: string;
  email?: string;
}): Promise<Record<string, unknown> | null> {
  const userId = normalizeText(args.userId);
  const email = normalizeText(args.email);

  try {
    if (userId) {
      const byUserId = await (getLiveProfileByUserId as any)(userId);
      if (byUserId) return asRecord(byUserId);
    }
  } catch {}

  try {
    if (email) {
      const byEmail = await (getLiveProfileByEmail as any)(email);
      if (byEmail) return asRecord(byEmail);
    }
  } catch {}

  return null;
}

async function tryListMemberships(args: {
  userId?: string;
  email?: string;
}): Promise<Array<LiveMembership | Record<string, unknown>>> {
  const fn = listLiveMembershipsForUser as any;
  const userId = normalizeText(args.userId);
  const email = normalizeText(args.email);

  const attempts = [
    async () => fn({ userId, email }),
    async () => fn(userId),
    async () => fn(email),
    async () => fn({ email }),
    async () => fn({ userId }),
  ];

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (Array.isArray(result)) return result;
    } catch {}
  }

  return [];
}

async function tryListWorkspaces(): Promise<
  Array<LiveWorkspace | Record<string, unknown>>
> {
  const fn = listLiveWorkspaces as any;

  const attempts = [async () => fn(), async () => fn({})];

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (Array.isArray(result)) return result;
    } catch {}
  }

  return [];
}

async function tryGetWorkspaceQuota(
  workspaceId: string
): Promise<WorkspaceQuotaSnapshot | null> {
  const normalizedWorkspaceId = normalizeText(workspaceId);
  if (!normalizedWorkspaceId) return null;

  try {
    const quota = await (getLiveWorkspaceQuotaByWorkspaceId as any)(
      normalizedWorkspaceId
    );

    if (!quota) return null;

    return normalizeLiveQuota(quota, normalizedWorkspaceId);
  } catch {
    return null;
  }
}

function buildLiveContext(args: {
  activeWorkspace: WorkspaceSummary | null;
  memberships: WorkspaceSummary[];
  quota: WorkspaceQuotaSnapshot | null;
  entitlements: WorkspaceEntitlements;
}): WorkspaceContext {
  return {
    activeWorkspace: args.activeWorkspace,
    memberships: args.memberships,
    quota: args.quota,
    entitlements: args.entitlements,
  };
}

async function enrichSessionFromAirtable(
  baseState: ResolvedAuthSessionState
): Promise<ResolvedAuthSessionState> {
  if (!baseState.isAuthenticated) return baseState;
  if (!isAirtableLiveConfigured()) return baseState;

  const baseUser = asRecord((baseState as Record<string, unknown>).user);
  const snapshot = baseState.cookieSnapshot;

  const seedUserId =
    normalizeText(snapshot.userId) ||
    pickText(baseUser.userId) ||
    pickText(baseUser.id);

  const seedEmail = pickText(baseUser.email);

  const liveProfile = await tryGetLiveProfile({
    userId: seedUserId,
    email: seedEmail,
  });

  if (!liveProfile) {
    return baseState;
  }

  const liveUserId = resolveProfileUserId(liveProfile) || seedUserId;
  const liveEmail = resolveProfileEmail(liveProfile) || seedEmail;
  const liveDisplayName =
    resolveProfileDisplayName(liveProfile) ||
    pickText(baseUser.displayName) ||
    liveEmail ||
    liveUserId;

  const [rawMemberships, rawWorkspaces] = await Promise.all([
    tryListMemberships({ userId: liveUserId, email: liveEmail }),
    tryListWorkspaces(),
  ]);

  const workspaceIndexes = buildLiveWorkspaceIndexes(rawWorkspaces);
  const memberships = dedupeWorkspaceSummaries(
    rawMemberships
      .map((membership) =>
        normalizeLiveMembershipSummary(membership, workspaceIndexes)
      )
      .filter(Boolean) as WorkspaceSummary[]
  ).filter((item) => item.membershipStatus === "active" && item.status === "active");

  if (memberships.length === 0) {
    return {
      ...baseState,
      authMode: "live",
      user: {
        ...baseUser,
        userId: liveUserId,
        email: liveEmail,
        displayName: liveDisplayName,
      } as any,
    };
  }

  const requestedActiveWorkspaceId = normalizeText(snapshot.activeWorkspaceId);

  const strictActiveWorkspace = resolveActiveWorkspaceSummary(
    memberships,
    requestedActiveWorkspaceId
  );

  const fallbackActiveWorkspace = requestedActiveWorkspaceId
    ? null
    : resolveActiveWorkspaceSummary(memberships, null);

  const activeWorkspace = strictActiveWorkspace || fallbackActiveWorkspace;

  const activeWorkspaceId =
    activeWorkspace?.workspaceId || requestedActiveWorkspaceId;

  const workspaceIds = memberships.map((item) => item.workspaceId);

  const activeLiveWorkspace = activeWorkspace?.workspaceId
    ? workspaceIndexes.byWorkspaceId.get(activeWorkspace.workspaceId) || null
    : null;

  const quota = activeWorkspace
    ? await tryGetWorkspaceQuota(activeWorkspace.workspaceId)
    : null;

  const entitlements = buildLiveEntitlements(
    activeLiveWorkspace,
    activeWorkspace?.membershipRole || "viewer",
    baseState.context?.entitlements || null
  );

  const dedicatedSpace = activeWorkspace
    ? getDedicatedSpaceTarget(activeWorkspace.category)
    : normalizeDedicatedSpace(baseState.target) ||
      normalizeDedicatedSpace(snapshot.dedicatedSpace);

  const homeRoute = activeWorkspace
    ? mapDedicatedSpaceToRoute(dedicatedSpace)
    : baseState.homeRoute;

  const cookieSnapshot = buildAuthCookieSnapshotFromState(snapshot, {
    userId: liveUserId,
    activeWorkspaceId,
    allowedWorkspaceIds: workspaceIds,
    dedicatedSpace,
  });

  const context = buildLiveContext({
    activeWorkspace,
    memberships,
    quota,
    entitlements,
  });

  const sessionLike = {
    ...(baseState as unknown as Record<string, unknown>),
    user: {
      ...baseUser,
      userId: liveUserId,
      email: liveEmail,
      displayName: liveDisplayName,
    },
    target: dedicatedSpace,
    route: homeRoute,
    context,
    allowedWorkspaceIds: workspaceIds,
  } as ResolvedMockSession;

  return {
    ...(baseState as unknown as Record<string, unknown>),
    ...(sessionLike as unknown as Record<string, unknown>),
    authMode: "live",
    loginRoute: AUTH_LOGIN_ROUTE,
    homeRoute,
    hasSessionToken: baseState.hasSessionToken,
    cookieSnapshot,
    cookiePayload: buildMockSessionCookiePayload(sessionLike),
  } as ResolvedAuthSessionState;
}

export function buildAuthCookieSnapshotFromStore(
  store: CookieReadableStore
): AuthCookieSnapshot {
  const authValue = normalizeText(store.get(MOCK_AUTH_COOKIE_NAME)?.value);
  const sessionToken = normalizeText(
    store.get(MOCK_SESSION_TOKEN_COOKIE_NAME)?.value
  );
  const userId = normalizeText(store.get(MOCK_USER_ID_COOKIE_NAME)?.value);

  const activeWorkspaceId = readFirstCookieValue(store, [
    MOCK_ACTIVE_WORKSPACE_COOKIE_NAME,
    "bosai_active_workspace_id",
    "bosai_workspace_id",
    "workspace_id",
  ]);

  const allowedWorkspaceIdsRaw = readFirstCookieValue(store, [
    MOCK_ALLOWED_WORKSPACES_COOKIE_NAME,
    "bosai_allowed_workspace_ids",
  ]);

  const dedicatedSpace = readFirstCookieValue(store, [
    MOCK_DEDICATED_SPACE_COOKIE_NAME,
    "bosai_dedicated_space",
    "dedicated_space",
  ]);

  return {
    authValue,
    sessionToken,
    userId,
    activeWorkspaceId,
    allowedWorkspaceIdsRaw,
    allowedWorkspaceIds: parseFlexibleList(allowedWorkspaceIdsRaw),
    dedicatedSpace,
  };
}

export async function readAuthCookieSnapshot(): Promise<AuthCookieSnapshot> {
  const store = await cookies();
  return buildAuthCookieSnapshotFromStore(store);
}

export function resolveAuthSessionFromSnapshot(
  snapshot: AuthCookieSnapshot
): ResolvedAuthSessionState {
  const session = resolveMockSessionFromCookies({
    [MOCK_AUTH_COOKIE_NAME]: snapshot.authValue,
    [MOCK_SESSION_TOKEN_COOKIE_NAME]: snapshot.sessionToken,
    [MOCK_USER_ID_COOKIE_NAME]: snapshot.userId,
    [MOCK_ACTIVE_WORKSPACE_COOKIE_NAME]: snapshot.activeWorkspaceId,
    [MOCK_ALLOWED_WORKSPACES_COOKIE_NAME]: snapshot.allowedWorkspaceIdsRaw,
    [MOCK_DEDICATED_SPACE_COOKIE_NAME]: snapshot.dedicatedSpace,
  });

  const cookieTarget = normalizeDedicatedSpace(snapshot.dedicatedSpace);
  const resolvedTarget = session.target || cookieTarget || null;

  const homeRoute = session.isAuthenticated
    ? session.route || mapDedicatedSpaceToRoute(resolvedTarget)
    : AUTH_LOGIN_ROUTE;

  return {
    ...session,
    authMode: "mock",
    loginRoute: AUTH_LOGIN_ROUTE,
    homeRoute,
    hasSessionToken: Boolean(snapshot.sessionToken),
    cookieSnapshot: snapshot,
    cookiePayload: session.isAuthenticated
      ? buildMockSessionCookiePayload(session)
      : null,
  };
}

export async function resolveAuthSession(): Promise<ResolvedAuthSessionState> {
  const snapshot = await readAuthCookieSnapshot();
  const baseState = resolveAuthSessionFromSnapshot(snapshot);
  return enrichSessionFromAirtable(baseState);
}

export async function requireAuthenticatedSession(): Promise<ResolvedAuthSessionState> {
  return resolveAuthSession();
}

export async function getAuthenticatedHomeRoute(): Promise<string> {
  const session = await resolveAuthSession();
  return session.isAuthenticated ? session.homeRoute : AUTH_LOGIN_ROUTE;
}

export function isAuthenticatedCookieSnapshot(
  snapshot: AuthCookieSnapshot
): boolean {
  return normalizeText(snapshot.authValue) === MOCK_AUTH_COOKIE_VALUE;
}

export function getAuthCookieWriteOptions(): AuthCookieWriteOptions {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  };
}

export function getAuthCookieNames(): string[] {
  return [
    MOCK_AUTH_COOKIE_NAME,
    MOCK_SESSION_TOKEN_COOKIE_NAME,
    MOCK_USER_ID_COOKIE_NAME,
    MOCK_ACTIVE_WORKSPACE_COOKIE_NAME,
    MOCK_ALLOWED_WORKSPACES_COOKIE_NAME,
    MOCK_DEDICATED_SPACE_COOKIE_NAME,
  ];
}

export function buildLoginCookieBundle(input: MockLoginIntent): {
  route: string;
  session: ResolvedAuthSessionState;
  cookiePayload: MockSessionCookiePayload | null;
} {
  const { route } = getMockLoginRedirect(input);

  const session = resolveAuthSessionFromSnapshot({
    authValue: MOCK_AUTH_COOKIE_VALUE,
    sessionToken: normalizeText(input.token),
    userId: "",
    activeWorkspaceId: normalizeText(input.requestedWorkspaceId),
    allowedWorkspaceIdsRaw: "",
    allowedWorkspaceIds: [],
    dedicatedSpace: "",
  });

  return {
    route,
    session,
    cookiePayload: session.cookiePayload,
  };
}

export function getCookiesToClear(): Array<{
  name: string;
  value: string;
  options: AuthCookieWriteOptions;
}> {
  const expiredOptions: AuthCookieWriteOptions = {
    ...getAuthCookieWriteOptions(),
    maxAge: 0,
  };

  return getAuthCookieNames().map((name) => ({
    name,
    value: "",
    options: expiredOptions,
  }));
}

export function buildWorkspaceSwitchCookieBundle(args: {
  current: ResolvedAuthSessionState;
  nextWorkspaceId: string;
}): {
  route: string;
  cookiePayload: MockSessionCookiePayload | null;
  session: ResolvedAuthSessionState;
} {
  const nextWorkspaceId = normalizeText(args.nextWorkspaceId);

  const nextSessionBase = resolveMockSessionFromCookies({
    [MOCK_AUTH_COOKIE_NAME]: args.current.cookieSnapshot.authValue,
    [MOCK_SESSION_TOKEN_COOKIE_NAME]: args.current.cookieSnapshot.sessionToken,
    [MOCK_USER_ID_COOKIE_NAME]: args.current.cookieSnapshot.userId,
    [MOCK_ACTIVE_WORKSPACE_COOKIE_NAME]: nextWorkspaceId,
    [MOCK_ALLOWED_WORKSPACES_COOKIE_NAME]:
      args.current.cookieSnapshot.allowedWorkspaceIdsRaw,
    [MOCK_DEDICATED_SPACE_COOKIE_NAME]:
      args.current.cookieSnapshot.dedicatedSpace,
  });

  const session = resolveAuthSessionFromSnapshot({
    ...args.current.cookieSnapshot,
    activeWorkspaceId: nextWorkspaceId,
  });

  return {
    route: nextSessionBase.route || session.homeRoute,
    cookiePayload: session.cookiePayload,
    session,
  };
}
