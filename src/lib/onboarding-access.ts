type QueryValue = string | string[] | undefined;

type SearchParamsLike = Record<string, QueryValue>;

export type BosaiPlanCode = "starter" | "pro" | "agency" | "custom" | "";

export type BosaiWorkspaceStatus =
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

export type BosaiOnboardingStage =
  | "plan"
  | "checkout"
  | "provisioning"
  | "workspace"
  | "active";

export type BosaiAccessState = {
  planCode: BosaiPlanCode;
  workspaceStatus: BosaiWorkspaceStatus;
  checkoutCompleted: boolean;
  onboardingCompleted: boolean;
  canAccessCockpit: boolean;
  stage: BosaiOnboardingStage;
  redirectPath: string | null;
};

type ResolveBosaiAccessInput = {
  searchParams?: SearchParamsLike;
  cookieValues?: Record<string, string | undefined>;
};

function firstParam(value?: QueryValue): string {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function parseBooleanLike(value: string | undefined): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "oui", "on"].includes(normalized);
}

function normalizePlanCode(value: string): BosaiPlanCode {
  const normalized = value.trim().toLowerCase();

  if (normalized === "starter") return "starter";
  if (normalized === "pro") return "pro";
  if (normalized === "agency") return "agency";
  if (normalized === "custom") return "custom";

  return "";
}

function normalizeWorkspaceStatus(value: string): BosaiWorkspaceStatus {
  const normalized = value.trim().toLowerCase();

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

function buildPath(pathname: string, params?: Record<string, string | undefined>): string {
  if (!params) return pathname;

  const search = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(params)) {
    const value = String(rawValue || "").trim();
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function resolveBosaiAccessState(
  input: ResolveBosaiAccessInput = {}
): BosaiAccessState {
  const searchParams = input.searchParams || {};
  const cookieValues = input.cookieValues || {};

  const planCode = normalizePlanCode(
    firstNonEmpty(
      firstParam(searchParams.plan),
      firstParam(searchParams.plan_code),
      cookieValues.bosai_plan_code,
      cookieValues.plan_code,
      cookieValues.selected_plan
    )
  );

  const workspaceStatus = normalizeWorkspaceStatus(
    firstNonEmpty(
      firstParam(searchParams.workspace_status),
      firstParam(searchParams.workspaceStatus),
      cookieValues.bosai_workspace_status,
      cookieValues.workspace_status
    )
  );

  const checkoutCompleted = parseBooleanLike(
    firstNonEmpty(
      firstParam(searchParams.checkout_completed),
      firstParam(searchParams.checkoutCompleted),
      cookieValues.bosai_checkout_completed,
      cookieValues.checkout_completed
    )
  );

  const onboardingCompleted = parseBooleanLike(
    firstNonEmpty(
      firstParam(searchParams.onboarding_completed),
      firstParam(searchParams.onboardingCompleted),
      cookieValues.bosai_onboarding_completed,
      cookieValues.onboarding_completed
    )
  );

  if (!planCode) {
    return {
      planCode,
      workspaceStatus,
      checkoutCompleted,
      onboardingCompleted,
      canAccessCockpit: false,
      stage: "plan",
      redirectPath: "/onboarding/plan",
    };
  }

  if (!checkoutCompleted) {
    return {
      planCode,
      workspaceStatus,
      checkoutCompleted,
      onboardingCompleted,
      canAccessCockpit: false,
      stage: "checkout",
      redirectPath: buildPath("/onboarding/checkout", {
        plan: planCode,
      }),
    };
  }

  if (
    workspaceStatus === "" ||
    workspaceStatus === "draft" ||
    workspaceStatus === "pending_payment" ||
    workspaceStatus === "payment_pending" ||
    workspaceStatus === "provisioning" ||
    workspaceStatus === "provisioning_pending"
  ) {
    return {
      planCode,
      workspaceStatus,
      checkoutCompleted,
      onboardingCompleted,
      canAccessCockpit: false,
      stage: "provisioning",
      redirectPath: buildPath("/onboarding/provisioning", {
        plan: planCode,
      }),
    };
  }

  if (
    workspaceStatus === "ready_to_activate" ||
    (workspaceStatus === "active" && !onboardingCompleted)
  ) {
    return {
      planCode,
      workspaceStatus,
      checkoutCompleted,
      onboardingCompleted,
      canAccessCockpit: false,
      stage: "workspace",
      redirectPath: buildPath("/onboarding/workspace", {
        plan: planCode,
      }),
    };
  }

  if (workspaceStatus === "active" && onboardingCompleted) {
    return {
      planCode,
      workspaceStatus,
      checkoutCompleted,
      onboardingCompleted,
      canAccessCockpit: true,
      stage: "active",
      redirectPath: null,
    };
  }

  return {
    planCode,
    workspaceStatus,
    checkoutCompleted,
    onboardingCompleted,
    canAccessCockpit: false,
    stage: "workspace",
    redirectPath: buildPath("/onboarding/workspace", {
      plan: planCode,
    }),
  };
}
