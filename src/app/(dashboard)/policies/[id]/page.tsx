import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "../../../../components/ui/page-header";
import { DashboardCard } from "../../../../components/ui/dashboard-card";
import { fetchPolicies, type PolicyItem } from "@/lib/api";

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

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

function statCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default",
  disabled = false
): string {
  const base =
    "inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition";

  if (disabled) {
    return `${base} cursor-not-allowed border border-white/10 bg-white/[0.04] text-zinc-500 opacity-60`;
  }

  if (variant === "primary") {
    return `${base} border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20`;
  }

  if (variant === "soft") {
    return `${base} border border-sky-500/20 bg-sky-500/12 text-sky-300 hover:bg-sky-500/18`;
  }

  return `${base} border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]`;
}

function toneChipClassName(
  variant:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "violet" = "default"
): string {
  if (variant === "success") {
    return "inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300";
  }

  if (variant === "warning") {
    return "inline-flex rounded-full border border-amber-500/20 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300";
  }

  if (variant === "danger") {
    return "inline-flex rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300";
  }

  if (variant === "info") {
    return "inline-flex rounded-full border border-sky-500/20 bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300";
  }

  if (variant === "violet") {
    return "inline-flex rounded-full border border-violet-500/20 bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-300";
  }

  return "inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300";
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

  if (typeof value === "number") return value !== 0;

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

function toPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return JSON.stringify({ value: "unserializable" }, null, 2);
  }
}

function getPolicyId(policy: PolicyItem): string {
  return toText(policy.id, "");
}

function getPolicyName(policy: PolicyItem): string {
  return toText(policy.name, "") || toText(policy.id, "") || "Untitled policy";
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

  return isPolicyEnabled(policy) ? "ACTIVE" : "DISABLED";
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

function getStatusChipTone(policy: PolicyItem):
  | "default"
  | "success"
  | "warning"
  | "danger" {
  const status = getPolicyStatusLabel(policy).toLowerCase();

  if (status === "active") return "success";
  if (status === "paused") return "warning";
  if (status === "disabled") return "danger";

  return "default";
}

function getCategoryChipTone(policy: PolicyItem):
  | "default"
  | "info"
  | "violet"
  | "warning" {
  const category = getPolicyCategory(policy).toLowerCase();

  if (["execution", "workspace"].includes(category)) return "info";
  if (["incident", "recovery"].includes(category)) return "violet";
  if (["safety"].includes(category)) return "warning";

  return "default";
}

function getRegistrySourceLabel(source: string): string {
  return source;
}

function getSuggestedRoute(policy: PolicyItem): string {
  const category = getPolicyCategory(policy).toLowerCase();
  const type = getPolicyType(policy).toLowerCase();

  if (category === "execution" || type === "security") return "/commands";
  if (category === "incident" || type === "escalation") return "/incidents";
  if (category === "recovery" || type === "retry") return "/commands";
  if (category === "workspace" || type === "workspace") return "/workspaces";
  if (category === "safety" || type === "guardrail") return "/policies";

  return "/policies";
}

function getSuggestedLabel(policy: PolicyItem): string {
  const route = getSuggestedRoute(policy);

  if (route === "/commands") return "Voir les commands liées";
  if (route === "/incidents") return "Voir les incidents liés";
  if (route === "/workspaces") return "Voir les workspaces";
  return "Voir les policies";
}

function sortRelatedPolicies(policies: PolicyItem[], current: PolicyItem): PolicyItem[] {
  const currentId = getPolicyId(current) || getPolicyName(current);

  return [...policies]
    .filter((item) => {
      const itemId = getPolicyId(item) || getPolicyName(item);
      if (itemId === currentId) return false;
      return getPolicyCategory(item) === getPolicyCategory(current);
    })
    .sort((a, b) => getPolicyName(a).localeCompare(getPolicyName(b)))
    .slice(0, 3);
}

function MetaCard({
  label,
  value,
  breakAll = false,
}: {
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
      <div className={metaLabelClassName()}>{label}</div>
      <div className={`mt-2 text-zinc-200 ${breakAll ? "break-all" : ""}`}>
        {value || "—"}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-zinc-200">{value}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "text-white",
  helper,
}: {
  label: string;
  value: string | number;
  tone?: string;
  helper?: string;
}) {
  return (
    <div className={statCardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-4xl font-semibold tracking-tight ${tone}`}>
        {value}
      </div>
      {helper ? <div className="mt-2 text-sm text-zinc-300">{helper}</div> : null}
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
  const registrySource = getRegistrySourceLabel(source);
  const policyId = getPolicyId(policy) || name;
  const suggestedRoute = getSuggestedRoute(policy);
  const suggestedLabel = getSuggestedLabel(policy);
  const relatedPolicies = sortRelatedPolicies(policies, policy);
  const activePoliciesCount = policies.filter((item) => isPolicyEnabled(item)).length;
  const sameCategoryCount = policies.filter(
    (item) =>
      getPolicyCategory(item) === category &&
      (getPolicyId(item) || getPolicyName(item)) !== policyId
  ).length;
  const configPreview = toPrettyJson(policy.value);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Capabilities"
        title={name}
        description={description}
      />

      <section className="flex flex-wrap gap-2">
        <span className={toneChipClassName(getStatusChipTone(policy))}>
          {status}
        </span>

        <span className={toneChipClassName(getCategoryChipTone(policy))}>
          {category.toUpperCase()}
        </span>

        <span className={toneChipClassName(isPolicyEnabled(policy) ? "success" : "danger")}>
          {isPolicyEnabled(policy) ? "ENABLED" : "DISABLED"}
        </span>

        <span className={toneChipClassName("default")}>
          {type.toUpperCase()}
        </span>

        <span className={toneChipClassName("default")}>
          {registrySource}
        </span>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Status"
          value={status}
          tone={
            status === "ACTIVE"
              ? "text-emerald-300"
              : status === "PAUSED"
                ? "text-amber-300"
                : "text-rose-300"
          }
        />
        <StatCard
          label="Enabled"
          value={enabled}
          tone={enabled === "Yes" ? "text-emerald-300" : "text-zinc-300"}
        />
        <StatCard
          label="Same category"
          value={sameCategoryCount}
        />
        <StatCard
          label="Registry active"
          value={activePoliciesCount}
          helper="Policies actives visibles"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard
          title="Policy identity"
          subtitle="Lecture produit et technique de la policy sélectionnée."
        >
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetaCard label="Name" value={name} />
            <MetaCard label="Category" value={category} />
            <MetaCard label="Type" value={type} />
            <MetaCard label="Status" value={status} />
            <MetaCard label="Enabled" value={enabled} />
            <MetaCard label="Mode" value={mode} />
            <MetaCard label="Registry source" value={registrySource} />
            <MetaCard label="Policy ID" value={policyId} breakAll />
          </div>

          <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Description</div>
            <div className="mt-2 text-sm leading-6 text-zinc-300">
              {description}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Registry status"
          subtitle="Lecture du registre policies."
        >
          <div className="space-y-3">
            <InfoRow label="Source" value={registrySource} />
            <InfoRow label="Category" value={category} />
            <InfoRow label="Active policies" value={activePoliciesCount} />
            <InfoRow label="Same category" value={sameCategoryCount} />
          </div>

          <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Quick read</div>
            <div className="mt-2 text-sm leading-6 text-zinc-300">
              Cette page détail lit le registre policies sans casser le cockpit,
              avec fallback statique si l’API n’expose rien.
            </div>
          </div>
        </DashboardCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardCard
          title="Configuration preview"
          subtitle="Aperçu brut de la configuration de la policy."
        >
          <pre className="overflow-x-auto rounded-[18px] border border-white/10 bg-black/30 p-4 text-xs leading-6 text-zinc-300">
{configPreview}
          </pre>
        </DashboardCard>

        <DashboardCard
          title="Suggested cockpit surface"
          subtitle="Surface la plus logique pour continuer la lecture."
        >
          <div className="space-y-4">
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Suggested route</div>
              <div className="mt-2 break-all text-zinc-200">{suggestedRoute}</div>
            </div>

            <div className="flex flex-col gap-3">
              <Link href={suggestedRoute} className={actionLinkClassName("primary")}>
                {suggestedLabel}
              </Link>

              <Link href="/policies" className={actionLinkClassName("soft")}>
                Retour Policies
              </Link>
            </div>
          </div>
        </DashboardCard>
      </section>

      <section>
        <DashboardCard
          title="Related policies"
          subtitle="Autres policies de la même catégorie."
        >
          {relatedPolicies.length === 0 ? (
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-300">
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
                    className="block rounded-[20px] border border-white/10 bg-black/20 p-4 transition hover:border-white/15 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="break-words text-base font-semibold text-white">
                          {getPolicyName(item)}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-zinc-400">
                          {getPolicyDescription(item)}
                        </div>
                      </div>

                      <span className={toneChipClassName(getStatusChipTone(item))}>
                        {getPolicyStatusLabel(item)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </DashboardCard>
      </section>

      <section>
        <DashboardCard
          title="Navigation"
          subtitle="Liens utiles sans quitter le cockpit."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Link href="/policies" className={actionLinkClassName("soft")}>
              Retour à la liste policies
            </Link>

            <Link href="/policies" className={actionLinkClassName("default")}>
              Voir toutes les policies
            </Link>

            <Link href={suggestedRoute} className={actionLinkClassName("primary")}>
              {suggestedLabel}
            </Link>
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
