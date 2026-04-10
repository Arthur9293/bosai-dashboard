import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
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

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
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

function safeUpper(text: string): string {
  return text.trim() ? text.trim().toUpperCase() : "—";
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

function getPolicyMode(policy: PolicyItem): string {
  return isPolicyEnabled(policy) ? "Mode live" : "Mode restreint";
}

function getRegistrySource(source: string): string {
  return source;
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

function categoryTone(policy: PolicyItem): string {
  const category = getPolicyCategory(policy).toLowerCase();

  if (["execution", "workspace"].includes(category)) {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (["incident", "recovery"].includes(category)) {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (["safety"].includes(category)) {
    return "bg-orange-500/15 text-orange-300 border border-orange-500/20";
  }

  return "bg-white/[0.04] text-zinc-300 border border-white/10";
}

function valuePreview(value: unknown): string {
  if (value === null || value === undefined) {
    return "No value";
  }

  if (typeof value === "string") {
    return value.trim() || "No value";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getSuggestedRoute(policy: PolicyItem): string {
  const category = getPolicyCategory(policy).toLowerCase();
  const type = getPolicyType(policy).toLowerCase();

  if (["execution"].includes(category) || ["security"].includes(type)) {
    return "/commands";
  }

  if (["incident"].includes(category) || ["escalation"].includes(type)) {
    return "/incidents";
  }

  if (["recovery"].includes(category) || ["retry"].includes(type)) {
    return "/commands";
  }

  if (["workspace"].includes(category) || ["workspace"].includes(type)) {
    return "/overview";
  }

  if (["safety"].includes(category) || ["guardrail"].includes(type)) {
    return "/policies";
  }

  return "/policies";
}

function getSuggestedLabel(policy: PolicyItem): string {
  const route = getSuggestedRoute(policy);

  if (route === "/commands") return "Voir les commands liées";
  if (route === "/incidents") return "Voir les incidents liés";
  if (route === "/overview") return "Retour à l’overview";
  return "Voir les policies";
}

function MetaItem({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: ReactNode;
  breakAll?: boolean;
}) {
  return (
    <div className={breakAll ? "break-all" : undefined}>
      <div className={metaLabelClassName()}>{label}</div>
      <div className="mt-1 text-zinc-200">{value}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={cardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
        {value}
      </div>
    </div>
  );
}

export default async function PolicyDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

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

  const policy =
    policies.find((item) => getPolicyId(item) === id) ||
    policies.find((item) => getPolicyName(item) === id) ||
    null;

  if (!policy) {
    notFound();
  }

  const name = getPolicyName(policy);
  const description = getPolicyDescription(policy);
  const category = getPolicyCategory(policy);
  const type = getPolicyType(policy);
  const status = getPolicyStatusLabel(policy);
  const enabled = isPolicyEnabled(policy) ? "Yes" : "No";
  const mode = getPolicyMode(policy);
  const registrySource = getRegistrySource(source);
  const policyId = getPolicyId(policy) || name;
  const suggestedRoute = getSuggestedRoute(policy);
  const suggestedLabel = getSuggestedLabel(policy);

  const relatedPolicies = policies.filter((item) => {
    if ((getPolicyId(item) || getPolicyName(item)) === policyId) return false;
    return getPolicyCategory(item) === category;
  });

  return (
    <div className="space-y-8">
      <section className="space-y-4 border-b border-white/10 pb-6">
        <div className="text-sm text-zinc-400">
          <Link
            href="/policies"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            Policies
          </Link>{" "}
          / {name}
        </div>

        <div className={sectionLabelClassName()}>Capabilities</div>

        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {name}
        </h1>

        <div className="max-w-3xl text-base text-zinc-400 sm:text-lg">
          {description}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(
              policy
            )}`}
          >
            {status}
          </span>

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${categoryTone(
              policy
            )}`}
          >
            {safeUpper(category)}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-zinc-200">
            {isPolicyEnabled(policy) ? "ENABLED" : "DISABLED"}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard label="Registry source" value={registrySource} />
        <StatCard label="Status" value={status} />
        <StatCard label="Enabled" value={enabled} />
        <StatCard label="Same category" value={String(relatedPolicies.length)} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-5 text-lg font-medium text-white">Policy identity</div>

          <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
            <MetaItem label="Name" value={name} />
            <MetaItem label="Category" value={category} />
            <MetaItem label="Status" value={status} />
            <MetaItem label="Enabled" value={enabled} />
            <MetaItem label="Mode" value={mode} />
            <MetaItem label="Registry source" value={registrySource} />
            <MetaItem label="Type" value={type} />
            <MetaItem label="Policy ID" value={policyId} breakAll />

            <div className="md:col-span-2 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Description</div>
              <div className="mt-1 text-zinc-200">{description}</div>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Registry status</div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Source</span>
              <span className="text-zinc-200">{registrySource}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Active tools</span>
              <span className="text-zinc-200">{policies.filter((item) => isPolicyEnabled(item)).length}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Category</span>
              <span className="text-zinc-200">{category}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Availability</span>
              <span className="text-zinc-200">{enabled}</span>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Next step</div>
              <div className="mt-1 text-zinc-200">
                Cette page fonctionne en {source === "API registry" ? "registre API" : "fallback statique"}.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Configuration preview</div>

          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{valuePreview(policy.value)}
          </pre>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Suggested cockpit surface</div>

          <div className="space-y-4">
            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Suggested route</div>
              <div className="mt-1 text-zinc-200">{suggestedRoute}</div>
            </div>

            <Link href={suggestedRoute} className={actionLinkClassName("primary")}>
              {suggestedLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Related policies</div>

        {relatedPolicies.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
            Aucune autre policy dans cette catégorie.
          </div>
        ) : (
          <div className="space-y-3">
            {relatedPolicies.map((item) => {
              const itemId = getPolicyId(item) || getPolicyName(item);

              return (
                <Link
                  key={itemId}
                  href={`/policies/${encodeURIComponent(itemId)}`}
                  className="block rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="break-words text-lg font-semibold text-white">
                      {getPolicyName(item)}
                    </div>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                        item
                      )}`}
                    >
                      {getPolicyStatusLabel(item)}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-zinc-400">
                    {getPolicyDescription(item)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="space-y-3">
          <Link href="/policies" className={actionLinkClassName("soft")}>
            Retour à la liste policies
          </Link>

          <Link href="/policies" className={actionLinkClassName("primary")}>
            Voir toutes les policies
          </Link>

          <Link href={suggestedRoute} className={actionLinkClassName("soft")}>
            {suggestedLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}
