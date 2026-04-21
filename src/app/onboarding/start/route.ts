import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";

type PlanCode = "starter" | "pro" | "agency" | "custom" | "";

function normalizePlanCode(value: string | null | undefined): PlanCode {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "starter") return "starter";
  if (normalized === "pro") return "pro";
  if (normalized === "agency") return "agency";
  if (normalized === "custom") return "custom";

  return "";
}

function buildAbsoluteUrl(request: NextRequest, path: string): URL {
  return new URL(path, request.url);
}

function buildLoginPath(next: string): string {
  const search = new URLSearchParams();
  if (next) search.set("next", next);
  const query = search.toString();
  return query ? `${AUTH_LOGIN_ROUTE}?${query}` : AUTH_LOGIN_ROUTE;
}

export async function GET(request: NextRequest) {
  const plan = normalizePlanCode(request.nextUrl.searchParams.get("plan"));

  if (!plan) {
    return NextResponse.redirect(buildAbsoluteUrl(request, "/pricing"));
  }

  const continuePath = `/onboarding/continue?step=plan&plan=${plan}`;
  const returnToStartPath = `/onboarding/start?plan=${plan}`;

  const session = await resolveAuthSession();

  if (session.isAuthenticated) {
    return NextResponse.redirect(buildAbsoluteUrl(request, continuePath));
  }

  return NextResponse.redirect(
    buildAbsoluteUrl(request, buildLoginPath(returnToStartPath))
  );
}
