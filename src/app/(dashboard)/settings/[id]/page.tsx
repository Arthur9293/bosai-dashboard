import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "../../../../components/ui/page-header";
import { DashboardCard } from "../../../../components/ui/dashboard-card";
import {
  SETTINGS_REGISTRY,
  type SettingItem,
} from "../registry";

type PageProps = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

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

function toPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return JSON.stringify({ value: "unserializable" }, null, 2);
  }
}

function getStatusChipTone(
  status?: string
): "default" | "success" | "warning" | "danger" {
  const s = String(status || "").trim().toLowerCase();

  if (s === "active") return "success";
  if (s === "paused") return "warning";
  if (s === "disabled") return "danger";

  return "default";
}

function getCategoryChipTone(
  category?: string
): "default" | "info" | "violet" | "warning" | "success" {
  const c = String(category || "").trim().toLowerCase();

  if (c === "workspace") return "info";
  if (c === "worker") return "violet";
  if (c === "environment") return "info";
  if (c === "system") return "default";
  if (c === "scheduler") return "warning";

  return "default";
}

function getStatusLabel(status?: string): string {
  const s = String(status || "").trim().toLowerCase();

  if (s === "active") return "ACTIVE";
  if (s === "paused") return "PAUSED";
  if (s === "disabled") return "DISABLED";

  return s ? s.toUpperCase() : "UNKNOWN";
}

function countSameCategory(settings: SettingItem[], current: SettingItem): number {
  return settings.filter(
    (item) => item.category === current.category && item.id !== current.id
  ).length;
}

function sortRelatedSettings(
  settings: SettingItem[],
  current: SettingItem
): SettingItem[] {
  return [...settings]
    .filter((item) => item.category === current.category && item.id !== current.id)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 3);
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

export default async function SettingDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const id = decodeURIComponent(resolvedParams.id);

  const setting =
    SETTINGS_REGISTRY.find((item) => item.id === id) ||
    SETTINGS_REGISTRY.find((item) => item.name === id) ||
    null;

  if (!setting) {
    notFound();
  }

  const sameCategoryCount = countSameCategory(SETTINGS_REGISTRY, setting);
  const relatedSettings = sortRelatedSettings(SETTINGS_REGISTRY, setting);
  const configPreview = toPrettyJson(setting.value);
  const activeSettingsCount = SETTINGS_REGISTRY.filter(
    (item) => String(item.status || "").trim().toLowerCase() === "active"
  ).length;

  const normalizedStatus = String(setting.status || "").trim().toLowerCase();
  const safeSuggestedRoute =
    typeof setting.suggestedRoute === "string" && setting.suggestedRoute.trim()
      ? setting.suggestedRoute
      : "/settings";
  const safeSuggestedRouteLabel =
    typeof setting.suggestedRouteLabel === "string" &&
    setting.suggestedRouteLabel.trim()
      ? setting.suggestedRouteLabel
      : "Ouvrir la surface liée";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configuration"
        title={setting.name}
        description={setting.description}
      />

      <section className="flex flex-wrap gap-2">
        <span className={toneChipClassName(getStatusChipTone(setting.status))}>
          {getStatusLabel(setting.status)}
        </span>

        <span className={toneChipClassName(getCategoryChipTone(setting.category))}>
          {String(setting.category || "General").toUpperCase()}
        </span>

        <span className={toneChipClassName(setting.enabled ? "success" : "danger")}>
          {setting.enabled ? "ENABLED" : "DISABLED"}
        </span>

        <span className={toneChipClassName("default")}>
          {setting.registrySource}
        </span>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Status"
          value={getStatusLabel(setting.status)}
          tone={
            normalizedStatus === "active"
              ? "text-emerald-300"
              : normalizedStatus === "paused"
                ? "text-amber-300"
                : normalizedStatus === "disabled"
                  ? "text-rose-300"
                  : "text-white"
          }
        />
        <StatCard
          label="Enabled"
          value={setting.enabled ? "Yes" : "No"}
          tone={setting.enabled ? "text-emerald-300" : "text-zinc-300"}
        />
        <StatCard label="Same category" value={sameCategoryCount} />
        <StatCard
          label="Registry active"
          value={activeSettingsCount}
          helper="Settings actifs visibles"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard
          title="Setting identity"
          subtitle="Lecture produit et technique du setting sélectionné."
        >
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetaCard label="Name" value={setting.name} />
            <MetaCard label="Category" value={String(setting.category || "—")} />
            <MetaCard label="Status" value={getStatusLabel(setting.status)} />
            <MetaCard label="Enabled" value={setting.enabled ? "Yes" : "No"} />
            <MetaCard label="Mode" value={String(setting.mode || "—")} />
            <MetaCard label="Registry source" value={setting.registrySource} />
            <MetaCard label="ID" value={setting.id} breakAll />
            <MetaCard
              label="Suggested route"
              value={safeSuggestedRoute}
              breakAll
            />
          </div>

          <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Description</div>
            <div className="mt-2 text-sm leading-6 text-zinc-300">
              {setting.description}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Registry status"
          subtitle="Lecture du registre statique Settings."
        >
          <div className="space-y-3">
            <InfoRow label="Source" value={setting.registrySource} />
            <InfoRow label="Category" value={String(setting.category || "—")} />
            <InfoRow label="Active settings" value={activeSettingsCount} />
            <InfoRow label="Same category" value={sameCategoryCount} />
          </div>

          <div className="mt-5 rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
            <div className={metaLabelClassName()}>Quick read</div>
            <div className="mt-2 text-sm leading-6 text-zinc-300">
              Cette page détail fonctionne sur registre statique, sans dépendance
              backend, pour préserver la stabilité du cockpit.
            </div>
          </div>
        </DashboardCard>
      </section>

      <section>
        <DashboardCard
          title="Configuration preview"
          subtitle="Aperçu brut de la configuration exposée par ce setting."
        >
          <pre className="overflow-x-auto rounded-[18px] border border-white/10 bg-black/30 p-4 text-xs leading-6 text-zinc-300">
{configPreview}
          </pre>
        </DashboardCard>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardCard
          title="Suggested cockpit surface"
          subtitle="Surface la plus logique pour continuer la lecture."
        >
          <div className="space-y-4">
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Suggested route</div>
              <div className="mt-2 break-all text-zinc-200">
                {safeSuggestedRoute}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={safeSuggestedRoute}
                className={actionLinkClassName("primary")}
              >
                {safeSuggestedRouteLabel}
              </Link>

              <Link href="/settings" className={actionLinkClassName("soft")}>
                Retour Settings
              </Link>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Related settings"
          subtitle="Autres settings de la même catégorie."
        >
          {relatedSettings.length === 0 ? (
            <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-300">
              Aucun autre setting dans cette catégorie.
            </div>
          ) : (
            <div className="space-y-3">
              {relatedSettings.map((item) => (
                <Link
                  key={item.id}
                  href={`/settings/${encodeURIComponent(item.id)}`}
                  className="block rounded-[20px] border border-white/10 bg-black/20 p-4 transition hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-base font-semibold text-white">
                        {item.name}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-zinc-400">
                        {item.description}
                      </div>
                    </div>

                    <span className={toneChipClassName(getStatusChipTone(item.status))}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                </Link>
              ))}
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
            <Link href="/settings" className={actionLinkClassName("soft")}>
              Retour à la liste settings
            </Link>

            <Link href="/settings" className={actionLinkClassName("default")}>
              Voir tous les settings
            </Link>

            <Link
              href={safeSuggestedRoute}
              className={actionLinkClassName("primary")}
            >
              {safeSuggestedRouteLabel}
            </Link>
          </div>
        </DashboardCard>
      </section>
    </div>
  );
}
