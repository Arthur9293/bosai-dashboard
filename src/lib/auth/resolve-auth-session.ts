import "server-only";

import { cookies } from "next/headers";
import type {
  DedicatedSpaceTarget,
  WorkspaceContext,
  WorkspaceEntitlements,
  WorkspaceQuotaSnapshot,
  WorkspaceSummary,
} from "../workspaces/types";
import { getDedicatedSpaceTarget } from "../workspaces/types";
import { getLiveMembershipsForUser, type LiveMembership } from "../airtable/memberships";
import { getLiveProfileByEmail, getLiveProfileByUserId } from "../airtable/profiles";
import { getLiveWorkspaceQuotaByWorkspaceId } from "../airtable/quotas";
import { isAirtableLiveConfigured } from "../airtable/config";
import { getLiveWorkspaces, type LiveWorkspace } from "../airtable/workspaces";
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
  authMode: "mock" | "airtable_live";
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

function normalizeText(value?: string | null): string {
  return String(value || "").trim();
}

function parseCsvList(value?: string | null): string[] {
  return normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function emptyEntitlements(): WorkspaceEntitlements {
  return {
    canAccessDashboard: false,
    canRunHttp: false,
    canViewIncidents: false,
    canManagePolicies: false,
    canManageTools: false,
    canManageWorkspaces: false,
    canManageBilling: false,
  };
}

export function buildAuthCookieSnapshotFromStore(
  store: CookieReadableStore
): AuthCookieSnapshot {
  const authValue = normalizeText(store.get(MOCK_AUTH_COOKIE_NAME)?.value);
  const sessionToken = normalizeText(
    store.get(MOCK_SESSION_TOKEN_COOKIE_NAME)?.value
  );
  const userId = normalizeText(store.get(MOCK_USER_ID_COOKIE_NAME)?.value);
  const activeWorkspaceId = normalizeText(
    store.get(MOCK_ACTIVE_WORKSPACE_COOKIE_NAME)?.value
  );
  const allowedWorkspaceIdsRaw = normalizeText(
    store.get(MOCK_ALLOWED_WORKSPACES_COOKIE_NAME)?.value
  );
  const dedicatedSpace = normalizeText(
    store.get(MOCK_DEDICATED_SPACE_COOKIE_NAME)?.value
  );

  return {
    authValue,
    sessionToken,
    userId,
    activeWorkspaceId,
    allowedWorkspaceIdsRaw,
    allowedWorkspaceIds: parseCsvList(allowedWorkspaceIdsRaw),
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

function resolveWorkspaceFromMembership(
  membership: LiveMembership,
  liveWorkspaces: LiveWorkspace[]
): LiveWorkspace | null {
  const workspaceIdText = normalizeText(membership.workspaceIdText);
  const workspaceIdCache = normalizeText(membership.workspaceIdCache);

  if (workspaceIdText) {
    const byWorkspaceId = liveWorkspaces.find(
      (item) => item.workspaceId === workspaceIdText
    );
    if (byWorkspaceId) return byWorkspaceId;
  }

  if (workspaceIdCache) {
    const byCache = liveWorkspaces.find(
      (item) => item.workspaceId === workspaceIdCache
    );
    if (byCache) return byCache;
  }

  const byRecordLink = liveWorkspaces.find((item) =>
    membership.workspaceRecordIds.includes(item.recordId)
  );

  return byRecordLink || null;
}

function buildWorkspaceSummary(
  workspace: LiveWorkspace,
  membership: LiveMembership
): WorkspaceSummary {
  return {
    workspaceId: workspace.workspaceId,
    slug: workspace.slug,
    name: workspace.name,
    category: workspace.category,
    plan: workspace.plan,
    status: workspace.status,
    membershipRole: membership.role,
    membershipStatus: membership.status,
    isDefault: membership.isDefault,
  };
}

function dedupeWorkspaceSummaries(
  items: WorkspaceSummary[]
): WorkspaceSummary[] {
  const map = new Map<string, WorkspaceSummary>();

  for (const item of items) {
    const existing = map.get(item.workspaceId);

    if (!existing) {
      map.set(item.workspaceId, item);
      continue;
    }

    if (!existing.isDefault && item.isDefault) {
      map.set(item.workspaceId, item);
    }
  }

  return Array.from(map.values());
}

function findWorkspaceIdFromRecordIds(
  recordIds: string[],
  liveWorkspaces: LiveWorkspace[]
): string {
  if (!recordIds.length) return "";

  for (const recordId of recordIds) {
    const matched = liveWorkspaces.find((item) => item.recordId === recordId);
    if (matched?.workspaceId) return matched.workspaceId;
  }

  return "";
}

function chooseActiveWorkspaceId(args: {
  snapshot: AuthCookieSnapshot;
  liveWorkspaces: LiveWorkspace[];
  summaries: WorkspaceSummary[];
  profileActiveWorkspaceRecordIds: string[];
  profileDefaultWorkspaceRecordIds: string[];
}): string {
  const allowedIds = new Set(args.summaries.map((item) => item.workspaceId));

  if (
    args.snapshot.activeWorkspaceId &&
    allowedIds.has(args.snapshot.activeWorkspaceId)
  ) {
    return args.snapshot.activeWorkspaceId;
  }

  const fromProfileActive = findWorkspaceIdFromRecordIds(
    args.profileActiveWorkspaceRecordIds,
    args.liveWorkspaces
  );

  if (fromProfileActive && allowedIds.has(fromProfileActive)) {
    return fromProfileActive;
  }

  const fromProfileDefault = findWorkspaceIdFromRecordIds(
    args.profileDefaultWorkspaceRecordIds,
    args.liveWorkspaces
  );

  if (fromProfileDefault && allowedIds.has(fromProfileDefault)) {
    return fromProfileDefault;
  }

  const defaultMembership = args.summaries.find((item) => item.isDefault);
  if (defaultMembership?.workspaceId) {
    return defaultMembership.workspaceId;
  }

  return args.summaries[0]?.workspaceId || "";
}

function buildQuotaSnapshotFromLive(
  quota: Awaited<ReturnType<typeof getLiveWorkspaceQuotaByWorkspaceId>>
): WorkspaceQuotaSnapshot | null {
  if (!quota) return null;

  return {
    runsUsed: quota.runsUsed,
    runsHardLimit: quota.runsHardLimit,
    tokensUsed: quota.tokensUsed,
    tokensHardLimit: quota.tokensHardLimit,
    httpCallsUsed: quota.httpCallsUsed,
    httpCallsHardLimit: quota.httpCallsHardLimit,
    periodKey: quota.currentUsagePeriodKey,
  };
}

async function tryResolveLiveSession(
  baseState: ResolvedAuthSessionState
): Promise<ResolvedAuthSessionState> {
  if (!isAirtableLiveConfigured()) {
    return baseState;
  }

  if (!baseState.isAuthenticated) {
    return baseState;
  }

  try {
    const snapshot = baseState.cookieSnapshot;
    const snapshotUserId = normalizeText(snapshot.userId);
    const baseUser = (baseState as any).user || {};
    const baseUserEmail = normalizeText(baseUser.email);

    let liveProfile =
      (snapshotUserId
        ? await getLiveProfileByUserId(snapshotUserId)
        : null) || null;

    if (!liveProfile && baseUserEmail) {
      liveProfile = await getLiveProfileByEmail(baseUserEmail);
    }

    const effectiveUserId = normalizeText(liveProfile?.userId) || snapshotUserId;
    const effectiveEmail =
      normalizeText(liveProfile?.email) || normalizeText(baseUser.email);
    const effectiveDisplayName =
      normalizeText(liveProfile?.displayName) ||
      normalizeText(baseUser.displayName) ||
      normalizeText(baseUser.name);

    if (!effectiveUserId && !effectiveEmail) {
      return baseState;
    }

    const [liveWorkspaces, liveMemberships] = await Promise.all([
      getLiveWorkspaces({ activeOnly: true }),
      getLiveMembershipsForUser({
        userId: effectiveUserId,
        email: effectiveEmail,
      }),
    ]);

    if (!liveWorkspaces.length || !liveMemberships.length) {
      return baseState;
    }

    const workspaceSummaries = dedupeWorkspaceSummaries(
      liveMemberships
        .map((membership) => {
          const workspace = resolveWorkspaceFromMembership(
            membership,
            liveWorkspaces
          );

          if (!workspace) return null;
          return buildWorkspaceSummary(workspace, membership);
        })
        .filter(Boolean) as WorkspaceSummary[]
    ).sort((a, b) => {
      if (a.workspaceId === snapshot.activeWorkspaceId) return -1;
      if (b.workspaceId === snapshot.activeWorkspaceId) return 1;
      if (a.isDefault && !b.isDefault) return -1;
      if (b.isDefault && !a.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });

    if (!workspaceSummaries.length) {
      return baseState;
    }

    const activeWorkspaceId = chooseActiveWorkspaceId({
      snapshot,
      liveWorkspaces,
      summaries: workspaceSummaries,
      profileActiveWorkspaceRecordIds: liveProfile?.activeWorkspaceRecordIds || [],
      profileDefaultWorkspaceRecordIds:
        liveProfile?.defaultWorkspaceRecordIds || [],
    });

    const activeWorkspace =
      workspaceSummaries.find((item) => item.workspaceId === activeWorkspaceId) ||
      workspaceSummaries[0] ||
      null;

    const liveQuota = activeWorkspace
      ? await getLiveWorkspaceQuotaByWorkspaceId(activeWorkspace.workspaceId)
      : null;

    const target = activeWorkspace
      ? getDedicatedSpaceTarget(activeWorkspace.category)
      : baseState.target || normalizeDedicatedSpace(snapshot.dedicatedSpace);

    const homeRoute = activeWorkspace
      ? mapDedicatedSpaceToRoute(target)
      : baseState.homeRoute;

    const context: WorkspaceContext = {
      activeWorkspace,
      memberships: workspaceSummaries,
      quota: buildQuotaSnapshotFromLive(liveQuota),
      entitlements: activeWorkspace
        ? liveWorkspaces.find(
            (item) => item.workspaceId === activeWorkspace.workspaceId
          )?.entitlements || emptyEntitlements()
        : emptyEntitlements(),
    };

    const liveSession = {
      ...baseState,
      authMode: "airtable_live" as const,
      target,
      route: homeRoute,
      homeRoute,
      allowedWorkspaceIds: workspaceSummaries.map((item) => item.workspaceId),
      user: {
        ...baseUser,
        userId: effectiveUserId || baseUser.userId || "",
        email: effectiveEmail || baseUser.email || "",
        displayName: effectiveDisplayName || baseUser.displayName || "",
      },
      context,
    };

    return {
      ...liveSession,
      cookiePayload: liveSession.isAuthenticated
        ? buildMockSessionCookiePayload(liveSession as any)
        : null,
    };
  } catch {
    return baseState;
  }
}

export async function resolveAuthSession(): Promise<ResolvedAuthSessionState> {
  const snapshot = await readAuthCookieSnapshot();
  const baseState = resolveAuthSessionFromSnapshot(snapshot);
  return tryResolveLiveSession(baseState);
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
