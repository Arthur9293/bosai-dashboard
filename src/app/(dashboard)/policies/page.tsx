import Link from "next/link";
import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";
import {
  DashboardStatusBadge,
  type DashboardStatusKind,
} from "@/components/dashboard/StatusBadge";
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

function statCardClassName(): string {
  return "rounded-[24px] border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function actionLinkClassName(
  variant: "default" | "primary" | "soft" = "default"
): string {
  if (variant === "primary") {
    return "inline-flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20";
  }

  if (variant === "soft") {
    return "inline-flex items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/12 px-4 py-3 text-sm font-medium text-sky-300 transition hover:bg-sky-500/18";
  }

  return "inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]";
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

  if (isPolicyEnabled(policy)) return "ACTIVE";
  return "DISABLED";
}

function getPolicyStatusKind(policy: PolicyItem): DashboardStatusKind {
  const status = getPolicyStatusLabel(policy).toLowerCase();

  if (status === "active") return "success";
  if (status === "paused") return "retry";
  if (status === "disabled") return "failed";
  return "unknown";
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

function getTypeChipTone(policy: PolicyItem):
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet" {
  const type = getPolicyType(policy).toLowerCase();

  if (["security", "guardrail"].includes(type)) return "info";
  if (["retry", "recovery"].includes(type)) return "violet";
  if (["escalation", "incident"].includes(type)) return "warning";
  if (["workspace"].includes(type)) return "default";
  return "default";
}

function sortPolicies(items: PolicyItem[]): PolicyItem[] {
  const priority = (policy: PolicyItem): number => {
    const status = getPolicyStatusLabel(policy).toLowerCase();

    if (status === "paused") return 0;
    if (status === "disabled") return 1;
    if (status === "active") return 2;
    return 3;
  };

  return [...items].sort((a, b) => {
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;

    return getPolicyName(a).localeCompare(getPolicyName(b));
  });
}

function getQuickRead(params: {
  total: number;
  active: number;
  paused: number;
  disabled: number;
  enabled: number;
}): string {
  const { total, active, paused, disabled, enabled } = params;

  if (disabled > 0) {
    return "Priorité : vérifier les policies désactivées ou cassées avant d’élargir le registre.";
  }

  if (paused > 0) {
    return "Certaines policies sont en pause. Le registre reste lisible mais demande une revue de posture.";
  }

  if (active > 0 && total > 0) {
    return "Le registre policies visible paraît globalement stable et majoritairement actif.";
  }

  if (enabled > 0) {
    return "Des policies sont visibles et activées, sans signal d’alerte dominant.";
  }

  return "Aucune policy significative n’est visible pour le moment.";
}

function StatCard({
  label,
  value,
  tone = "text-white",
  helper,
}: {
  label: string;
  value: number;
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

function PolicyCard({ policy }: { policy: PolicyItem }) {
  const id = getPolicyId(policy);
  const name = getPolicyName(policy);
  const description = getPolicyDescription(policy);
  const detailHref = `/policies/${encodeURIComponent(id || name)}`;

  return (
    <DashboardCard
      rightSlot={
        <DashboardStatusBadge
          kind={getPolicyStatusKind(policy)}
          label={getPolicyStatusLabel(policy)}
        />
      }
    >
      <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
        BOSAI Policy
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={toneChipClassName(getTypeChipTone(policy))}>
          {getPolicyType(policy).toUpperCase()}
        </span>

        <span className={toneChipClassName("default")}>
          {getPolicyCategory(policy)}
        </span>

        <span className={toneChipClassName(isPolicyEnabled(policy) ? "success" : "danger")}>
          {isPolicyEnabled(policy) ? "ENABLED" : "DISABLED"}
        </span>
      </div>

      <div className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {name}
      </div>

      <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
          <div className={metaLabelClassName()}>Category</div>
          <div className="mt-2 text-zinc-200">{getPolicyCategory(policy)}</div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
          <div className={metaLabelClassName()}>Value</div>
          <div className="mt-2 text-zinc-200">{getPolicyValueSummary(policy)}</div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
          <div className={metaLabelClassName()}>ID</div>
          <div className="mt-2 break-all text-zinc-200">{id || "—"}</div>
        </div>
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <Link href={detailHref} className={actionLinkClassName("primary")}>
          Ouvrir le détail
        </Link>
      </div>
    </DashboardCard>
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

  const sortedPolicies = sortPolicies(policies);

  const activePolicies = sortedPolicies.filter(
    (item) => getPolicyStatusLabel(item) === "ACTIVE"
  );

  const attentionPolicies = sortedPolicies.filter((item) => {
    const status = getPolicyStatusLabel(item);
    return status === "PAUSED" || status === "DISABLED";
  });

  const activeCount = activePolicies.length;
  const pausedCount = sortedPolicies.filter(
    (item) => getPolicyStatusLabel(item) === "PAUSED"
  ).length;
  const disabledCount = sortedPolicies.filter(
    (item) => getPolicyStatusLabel(item) === "DISABLED"
  ).length;
  const enabledCount = sortedPolicies.filter((item) => isPolicyEnabled(item)).length;

  const quickRead = getQuickRead({
    total: sortedPolicies.length,
    active: activeCount,
    paused: pausedCount,
    disabled: disabledCount,
    enabled: enabledCount,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Capabilities"
        title="Policies"
        description="Inventaire des politiques BOSAI avec lecture du registre, de l’état d’activation et des catégories de contrôle."
        badges={[
          { label: "Policy registry", tone: "info" },
          { label: "Guardrails aware", tone: "muted" },
          { label: source, tone: "muted" },
        ]}
        actions={
          <>
            <Link href="/tools" className={actionLinkClassName("soft")}>
              Ouvrir Tools
            </Link>
            <Link href="/settings" className={actionLinkClassName("default")}>
              Voir Settings
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Total policies" value={sortedPolicies.length} />
        <StatCard label="Active" value={activeCount} tone="text-emerald-300" />
        <StatCard label="Paused" value={pausedCount} tone="text-amber-300" />
        <StatCard label="Disabled" value={disabledCount} tone="text-red-300" />
        <StatCard
          label="Enabled"
          value={enabledCount}
          tone="text-sky-300"
          helper="Policies activées"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard
          title="Policy posture"
          subtitle="Lecture rapide du registre policies visible."
        >
          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3.5">
            <div className={metaLabelClassName()}>Quick read</div>
            <div className="mt-2 text-sm leading-6 text-zinc-300">
              {quickRead}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Registry status"
          subtitle="État de la source utilisée pour cette page."
        >
          <div className="space-y-3">
            <InfoRow label="Source" value={source} />
            <InfoRow label="Loaded policies" value={sortedPolicies.length} />
            <InfoRow label="Enabled policies" value={enabledCount} />
            <InfoRow label="Next step" value="Policies detail page" />
          </div>
        </DashboardCard>
      </section>

      {sortedPolicies.length === 0 ? (
        <DashboardCard
          title="Aucune policy visible"
          subtitle="Le cockpit n’a remonté aucune policy sur la source actuelle."
        >
          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
            Aucune policy visible pour le moment.
          </div>
        </DashboardCard>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                Needs attention
              </div>
              <span className={toneChipClassName("warning")}>
                {attentionPolicies.length} visible(s)
              </span>
            </div>

            {attentionPolicies.length === 0 ? (
              <DashboardCard
                title="Aucune policy prioritaire"
                subtitle="Aucune policy paused ou disabled n’est visible."
              >
                <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                  Le registre visible paraît stable.
                </div>
              </DashboardCard>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {attentionPolicies.map((policy) => (
                  <PolicyCard
                    key={getPolicyId(policy) || getPolicyName(policy)}
                    policy={policy}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                Active policies
              </div>
              <span className={toneChipClassName("success")}>
                {activePolicies.length} visible(s)
              </span>
            </div>

            {activePolicies.length === 0 ? (
              <DashboardCard
                title="Aucune policy active"
                subtitle="Aucune policy active n’est visible sur cette vue."
              >
                <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                  Le registre ne montre actuellement aucune policy active.
                </div>
              </DashboardCard>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {activePolicies.map((policy) => (
                  <PolicyCard
                    key={getPolicyId(policy) || getPolicyName(policy)}
                    policy={policy}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
