import Link from "next/link";
import { fetchPolicies, type PolicyItem } from "@/lib/api";

const fallbackPolicies: PolicyItem[] = [
  {
    id: "run_guardrails",
    name: "run_guardrails",
    description: "Garde-fous généraux d’exécution des runs BOSAI.",
    status: "active",
    type: "guardrail",
    category: "Execution",
    enabled: true,
    value: {
      run_lock_ttl_seconds: 600,
      retry_max: 3,
    },
  },
  {
    id: "http_allowlist",
    name: "http_allowlist",
    description: "Contrôle des domaines autorisés pour http_exec.",
    status: "active",
    type: "security",
    category: "Execution",
    enabled: true,
    value: {
      mode: "allowlist",
    },
  },
  {
    id: "incident_escalation",
    name: "incident_escalation",
    description: "Règles d’escalade des incidents et criticité.",
    status: "active",
    type: "escalation",
    category: "Incident",
    enabled: true,
    value: {
      critical_auto_escalate: true,
    },
  },
  {
    id: "retry_policy",
    name: "retry_policy",
    description: "Politique de retry et de réinjection des commands.",
    status: "active",
    type: "retry",
    category: "Recovery",
    enabled: true,
    value: {
      retry_max: 3,
      backoff: "exponential",
    },
  },
  {
    id: "workspace_defaults",
    name: "workspace_defaults",
    description: "Valeurs par défaut appliquées aux workspaces BOSAI.",
    status: "active",
    type: "workspace",
    category: "Workspace",
    enabled: true,
    value: {
      default_workspace_id: "production",
    },
  },
  {
    id: "chaos_guard",
    name: "chaos_guard",
    description: "Filtrage et blocage des patterns jugés dangereux.",
    status: "paused",
    type: "guardrail",
    category: "Safety",
    enabled: false,
    value: {
      mode: "manual_review",
    },
  },
];

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function statCardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function emptyStateClassName(): string {
  return "rounded-[28px] border border-dashed border-white/10 px-5 py-8 text-sm text-zinc-500";
}

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "soft") {
    return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
  }

  return "inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
}

function toText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = toText(item, "");
      if (candidate) return candidate;
    }
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "oui", "enabled", "active"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "non", "disabled"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function getPolicyId(policy: PolicyItem): string {
  return toText(policy.id, "");
}

function getPolicyName(policy: PolicyItem): string {
  return (
    toText(policy.name, "") ||
    toText(policy.id, "") ||
    "Untitled policy"
  );
}

function getPolicyDescription(policy: PolicyItem): string {
  return toText(policy.description, "No description");
}

function getPolicyStatusRaw(policy: PolicyItem): string {
  return toText(policy.status, "");
}

function isPolicyEnabled(policy: PolicyItem): boolean {
  return toBoolean(policy.enabled, getPolicyStatusRaw(policy).toLowerCase() !== "disabled");
}

function getPolicyStatusLabel(policy: PolicyItem): string {
  const raw = getPolicyStatusRaw(policy).toLowerCase();

  if (raw === "active") return "ACTIVE";
  if (raw === "paused") return "PAUSED";
  if (raw === "disabled") return "DISABLED";

  if (isPolicyEnabled(policy)) return "ACTIVE";
  return "DISABLED";
}

function getPolicyType(policy: PolicyItem): string {
  return toText(policy.type, "Policy");
}

function getPolicyCategory(policy: PolicyItem): string {
  return toText(policy.category, "General");
}

function getPolicyValueSummary(policy: PolicyItem): string {
  if (policy.value === null || policy.value === undefined) {
    return "No config";
  }

  if (typeof policy.value === "string") {
    return policy.value.trim() || "No config";
  }

  if (Array.isArray(policy.value)) {
    return `${policy.value.length} item(s)`;
  }

  if (typeof policy.value === "object") {
    const size = Object.keys(policy.value as Record<string, unknown>).length;
    return `${size} key(s)`;
  }

  return String(policy.value);
}

function statusTone(policy: PolicyItem): string {
  const status = getPolicyStatusLabel(policy).toLowerCase();

  if (status === "active") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (status === "paused") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (status === "disabled") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function typeTone(policy: PolicyItem): string {
  const type = getPolicyType(policy).toLowerCase();

  if (["security", "guardrail"].includes(type)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["retry", "recovery"].includes(type)) {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["escalation", "incident"].includes(type)) {
    return "bg-orange-500/15 text-orange-300 border border-orange-500/20";
  }

  return "bg-white/[0.04] text-zinc-300 border border-white/10";
}

function PolicyCard({ policy }: { policy: PolicyItem }) {
  const id = getPolicyId(policy);
  const name = getPolicyName(policy);
  const description = getPolicyDescription(policy);

  return (
    <article className={cardClassName()}>
      <div className="flex h-full flex-col gap-5">
        <div className="space-y-4 border-b border-white/10 pb-4">
          <div className={sectionLabelClassName()}>BOSAI Policy</div>

          <div className="space-y-3">
            <Link
              href={`/policies/${encodeURIComponent(id || name)}`}
              className="block break-words text-xl font-semibold tracking-tight text-white underline decoration-white/15 underline-offset-4 transition hover:text-zinc-200"
            >
              {name}
            </Link>

            <div className="text-sm text-zinc-400">{description}</div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                  policy
                )}`}
              >
                {getPolicyStatusLabel(policy)}
              </span>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${typeTone(
                  policy
                )}`}
              >
                {getPolicyType(policy).toUpperCase()}
              </span>

              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
                {isPolicyEnabled(policy) ? "ENABLED" : "DISABLED"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <div className={metaLabelClassName()}>Category</div>
            <div className="mt-1 text-zinc-200">{getPolicyCategory(policy)}</div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Value</div>
            <div className="mt-1 text-zinc-200">{getPolicyValueSummary(policy)}</div>
          </div>

          <div className="md:col-span-2 xl:col-span-1">
            <div className={metaLabelClassName()}>ID</div>
            <div className="mt-1 break-all text-zinc-200">{id || "—"}</div>
          </div>
        </div>

        <div className="pt-1">
          <Link
            href={`/policies/${encodeURIComponent(id || name)}`}
            className={actionLinkClassName("primary")}
          >
            Ouvrir le détail
          </Link>
        </div>
      </div>
    </article>
  );
}

function StatCard({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className={statCardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-4xl font-semibold tracking-tight ${tone}`}>
        {value}
      </div>
    </div>
  );
}

export default async function PoliciesPage() {
  let policies: PolicyItem[] = fallbackPolicies;
  let source = "Fallback registry";

  try {
    const data = await fetchPolicies();
    if (Array.isArray(data?.policies) && data.policies.length > 0) {
      policies = data.policies;
      source = "API registry";
    }
  } catch {
    policies = fallbackPolicies;
    source = "Fallback registry";
  }

  const activeCount = policies.filter(
    (item) => getPolicyStatusLabel(item) === "ACTIVE"
  ).length;

  const pausedCount = policies.filter(
    (item) => getPolicyStatusLabel(item) === "PAUSED"
  ).length;

  const disabledCount = policies.filter(
    (item) => getPolicyStatusLabel(item) === "DISABLED"
  ).length;

  const enabledCount = policies.filter((item) => isPolicyEnabled(item)).length;

  return (
    <div className="space-y-8">
      <section className="space-y-3 border-b border-white/10 pb-6">
        <div className={sectionLabelClassName()}>Capabilities</div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Policies
          </h1>
          <p className="mt-2 max-w-3xl text-base text-zinc-400 sm:text-lg">
            Inventaire des politiques BOSAI. Cette vue affiche leur état, leur
            catégorie, leur type et leur niveau d’activation.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total policies" value={policies.length} />
        <StatCard label="Active" value={activeCount} tone="text-emerald-300" />
        <StatCard label="Paused" value={pausedCount} tone="text-amber-300" />
        <StatCard label="Disabled" value={disabledCount} tone="text-red-300" />
        <StatCard label="Enabled" value={enabledCount} tone="text-sky-300" />
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-xl font-semibold text-white">Registry status</div>

        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-300 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className={metaLabelClassName()}>Source</div>
            <div className="mt-1 text-zinc-200">{source}</div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Loaded policies</div>
            <div className="mt-1 text-zinc-200">{policies.length}</div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Enabled policies</div>
            <div className="mt-1 text-zinc-200">{enabledCount}</div>
          </div>

          <div>
            <div className={metaLabelClassName()}>Next step</div>
            <div className="mt-1 text-zinc-200">Policies detail page</div>
          </div>
        </div>
      </section>

      {policies.length === 0 ? (
        <section className={emptyStateClassName()}>
          Aucune policy visible pour le moment.
        </section>
      ) : (
        <section className="space-y-4">
          {policies.map((policy) => (
            <PolicyCard
              key={getPolicyId(policy) || getPolicyName(policy)}
              policy={policy}
            />
          ))}
        </section>
      )}
    </div>
  );
}
