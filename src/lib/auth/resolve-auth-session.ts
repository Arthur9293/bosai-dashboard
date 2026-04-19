import "server-only";

import { cookies } from "next/headers";
import type { DedicatedSpaceTarget } from "../workspaces/types";
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
  authMode: "mock";
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

function normalizeDedicatedSpace(
  value?: string | DedicatedSpaceTarget | null
): DedicatedSpaceTarget | null {
  const normalized = normalizeText(String(value || "")).toLowerCase();

  if (normalized === "personal") return "personal";
  if (normalized === "freelance") return "freelance";
  if (normalized === "company") return "company";
  if (normalized === "agency") return "agency";
  if (normalized === "enterprise") return "enterprise";

  return null;
}

function parseCsvList(value?: string | null): string[] {
  return normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapDedicatedSpaceToRoute(
  target?: DedicatedSpaceTarget | string | null
): string {
  const normalized = normalizeDedicatedSpace(target);

  if (normalized === "personal") return "/overview";
  if (normalized === "freelance") return "/commands";
  if (normalized === "company") return "/workspaces";
  if (normalized === "agency") return "/flows";
  if (normalized === "enterprise") return "/incidents";

  return DEFAULT_AUTHENTICATED_ROUTE;
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

export async function resolveAuthSession(): Promise<ResolvedAuthSessionState> {
  const snapshot = await readAuthCookieSnapshot();
  return resolveAuthSessionFromSnapshot(snapshot);
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
    [MOCK_DEDICATED_SPACE_COOKIE_NAME]: args.current.cookieSnapshot.dedicatedSpace,
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
