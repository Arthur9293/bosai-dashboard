import { NextRequest, NextResponse } from "next/server";

type BosaiPlanCode = "starter" | "pro" | "agency" | "custom" | "";
type BosaiWorkspaceStatus =
  | "draft"
  | "pending_payment"
  | "payment_pending"
  | "provisioning"
  | "provisioning_pending"
  | "ready_to_activate"
  | "active"
  | "suspended"
  | "archived"
  | "";

type ContinueStep =
  | "plan"
  | "checkout"
  | "provisioning"
  | "activate"
  | "reset"
  | "";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function normalizeText(value: string | null | undefined): string {
  return String(value || "").trim();
}

function normalizePlanCode(value: string | null | undefined): BosaiPlanCode {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "starter") return "starter";
  if (normalized === "pro") return "pro";
  if (normalized === "agency") return "agency";
  if (normalized === "custom") return "custom";

  return "";
}

function normalizeWorkspaceStatus(
  value: string | null | undefined
): BosaiWorkspaceStatus {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "draft") return "draft";
  if (normalized === "pending_payment") return "pending_payment";
  if (normalized === "payment_pending") return "payment_pending";
  if (normalized === "provisioning") return "provisioning";
  if (normalized === "provisioning_pending") return "provisioning_pending";
  if (normalized === "ready_to_activate") return "ready_to_activate";
  if (normalized === "active") return "active";
  if (normalized === "suspended") return "suspended";
  if (normalized === "archived") return "archived";

  return "";
}

function normalizeStep(value: string | null | undefined): ContinueStep {
  const normalized = normalizeText(value).toLowerCase();

  if (normalized === "plan") return "plan";
  if (normalized === "checkout") return "checkout";
  if (normalized === "provisioning") return "provisioning";
  if (normalized === "activate") return "activate";
  if (normalized === "reset") return "reset";

  return "";
}

function buildPath(
  pathname: string,
  params?: Record<string, string | undefined>
): string {
  const search = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(params || {})) {
    const value = normalizeText(rawValue);
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function normalizeInternalPath(value: string | null | undefined): string {
  const text = normalizeText(value);

  if (!text.startsWith("/")) return "";
  if (text.startsWith("//")) return "";

  return text;
}

function setCookie(response: NextResponse, name: string, value: string): void {
  response.cookies.set(name, value, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
  });
}

function clearCookie(response: NextResponse, name: string): void {
  response.cookies.set(name, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

function writePlanCookies(
  response: NextResponse,
  planCode: BosaiPlanCode
): void {
  if (!planCode) return;

  setCookie(response, "bosai_plan_code", planCode);
  setCookie(response, "plan_code", planCode);
  setCookie(response, "selected_plan", planCode);
}

function writeWorkspaceStatusCookies(
  response: NextResponse,
  status: BosaiWorkspaceStatus
): void {
  if (!status) return;

  setCookie(response, "bosai_workspace_status", status);
  setCookie(response, "workspace_status", status);
}

function writeBooleanCookies(
  response: NextResponse,
  cookieNames: string[],
  value: boolean
): void {
  const encoded = value ? "1" : "0";

  for (const cookieName of cookieNames) {
    setCookie(response, cookieName, encoded);
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;

  const step = normalizeStep(url.searchParams.get("step"));
  const planCode = normalizePlanCode(url.searchParams.get("plan"));
  const nextPath = normalizeInternalPath(url.searchParams.get("next"));
  const workspaceId = normalizeText(
    url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId")
  );
  const requestedStatus = normalizeWorkspaceStatus(
    url.searchParams.get("workspace_status")
  );

  let redirectPath = "/onboarding/plan";

  if (step === "plan") {
    redirectPath = planCode
      ? buildPath("/onboarding/checkout", { plan: planCode })
      : "/onboarding/plan";
  } else if (step === "checkout") {
    redirectPath = planCode
      ? buildPath("/onboarding/provisioning", { plan: planCode })
      : "/onboarding/plan";
  } else if (step === "provisioning") {
    redirectPath = planCode
      ? buildPath("/onboarding/workspace", { plan: planCode })
      : "/onboarding/plan";
  } else if (step === "activate") {
    redirectPath = nextPath || "/workspace";
  } else if (step === "reset") {
    redirectPath = nextPath || "/pricing";
  } else {
    redirectPath = "/onboarding/plan";
  }

  const response = NextResponse.redirect(new URL(redirectPath, request.url));

  if (step === "reset") {
    [
      "bosai_plan_code",
      "plan_code",
      "selected_plan",
      "bosai_workspace_status",
      "workspace_status",
      "bosai_checkout_completed",
      "checkout_completed",
      "bosai_onboarding_completed",
      "onboarding_completed",
      "bosai_pending_workspace_id",
    ].forEach((name) => clearCookie(response, name));

    return response;
  }

  if (!planCode && step !== "") {
    return NextResponse.redirect(new URL("/onboarding/plan", request.url));
  }

  if (planCode) {
    writePlanCookies(response, planCode);
  }

  if (workspaceId) {
    setCookie(response, "bosai_pending_workspace_id", workspaceId);
  }

  if (step === "plan") {
    writeBooleanCookies(
      response,
      ["bosai_checkout_completed", "checkout_completed"],
      false
    );
    writeBooleanCookies(
      response,
      ["bosai_onboarding_completed", "onboarding_completed"],
      false
    );
    writeWorkspaceStatusCookies(response, "draft");
    return response;
  }

  if (step === "checkout") {
    writeBooleanCookies(
      response,
      ["bosai_checkout_completed", "checkout_completed"],
      true
    );
    writeBooleanCookies(
      response,
      ["bosai_onboarding_completed", "onboarding_completed"],
      false
    );
    writeWorkspaceStatusCookies(
      response,
      requestedStatus || "provisioning_pending"
    );
    return response;
  }

  if (step === "provisioning") {
    writeBooleanCookies(
      response,
      ["bosai_checkout_completed", "checkout_completed"],
      true
    );
    writeBooleanCookies(
      response,
      ["bosai_onboarding_completed", "onboarding_completed"],
      false
    );
    writeWorkspaceStatusCookies(
      response,
      requestedStatus || "ready_to_activate"
    );
    return response;
  }

  if (step === "activate") {
    writeBooleanCookies(
      response,
      ["bosai_checkout_completed", "checkout_completed"],
      true
    );
    writeBooleanCookies(
      response,
      ["bosai_onboarding_completed", "onboarding_completed"],
      true
    );
    writeWorkspaceStatusCookies(response, requestedStatus || "active");
    return response;
  }

  return response;
}
