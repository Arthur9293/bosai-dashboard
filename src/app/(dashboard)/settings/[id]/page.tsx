import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
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

function cardClassName(): string {
  return "rounded-[28px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
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

function sectionLabelClassName(): string {
  return "text-xs uppercase tracking-[0.24em] text-zinc-500";
}

function metaLabelClassName(): string {
  return "text-[11px] uppercase tracking-[0.18em] text-zinc-500";
}

function statusTone(status?: string): string {
  const s = (status || "").toLowerCase();

  if (s === "active") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  if (s === "paused") {
    return "bg-amber-500/15 text-amber-300 border border-amber-500/20";
  }

  if (s === "disabled") {
    return "bg-red-500/15 text-red-300 border border-red-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function categoryTone(category?: string): string {
  const c = (category || "").toLowerCase();

  if (c === "workspace") {
    return "bg-sky-500/15 text-sky-300 border border-sky-500/20";
  }

  if (c === "worker") {
    return "bg-violet-500/15 text-violet-300 border border-violet-500/20";
  }

  if (c === "environment") {
    return "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20";
  }

  if (c === "system") {
    return "bg-blue-500/15 text-blue-300 border border-blue-500/20";
  }

  if (c === "scheduler") {
    return "bg-orange-500/15 text-orange-300 border border-orange-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function enabledTone(enabled: boolean): string {
  if (enabled) {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  }

  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function toPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return JSON.stringify({ value: "unserializable" }, null, 2);
  }
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
  tone = "text-white",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className={cardClassName()}>
      <div className="text-sm text-zinc-400">{label}</div>
      <div className={`mt-3 text-4xl font-semibold tracking-tight ${tone}`}>
        {value}
      </div>
    </div>
  );
}

function countSameCategory(settings: SettingItem[], current: SettingItem): number {
  return settings.filter(
    (item) => item.category === current.category && item.id !== current.id
  ).length;
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
  const configPreview = toPrettyJson(setting.value);

  const relatedSettings = SETTINGS_REGISTRY.filter(
    (item) => item.category === setting.category && item.id !== setting.id
  ).slice(0, 3);

  return (
    <div className="space-y-8">
      <section className="space-y-4 border-b border-white/10 pb-6">
        <div className="text-sm text-zinc-400">
          <Link
            href="/settings"
            className="underline decoration-white/20 underline-offset-4 transition hover:text-white"
          >
            Settings
          </Link>{" "}
          / {setting.name}
        </div>

        <div className={sectionLabelClassName()}>Configuration</div>

        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {setting.name}
        </h1>

        <p className="max-w-3xl text-base text-zinc-400 sm:text-lg">
          {setting.description}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${statusTone(
              setting.status
            )}`}
          >
            {setting.status.toUpperCase()}
          </span>

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${categoryTone(
              setting.category
            )}`}
          >
            {setting.category.toUpperCase()}
          </span>

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${enabledTone(
              setting.enabled
            )}`}
          >
            {setting.enabled ? "ENABLED" : "DISABLED"}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard
          label="Registry source"
          value={setting.registrySource}
        />
        <StatCard
          label="Status"
          value={setting.status.toUpperCase()}
          tone={
            setting.status === "active"
              ? "text-emerald-300"
              : setting.status === "paused"
              ? "text-amber-300"
              : "text-red-300"
          }
        />
        <StatCard
          label="Enabled"
          value={setting.enabled ? "Yes" : "No"}
          tone={setting.enabled ? "text-emerald-300" : "text-zinc-200"}
        />
        <StatCard
          label="Same category"
          value={String(sameCategoryCount)}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`${cardClassName()} xl:col-span-2`}>
          <div className="mb-5 text-lg font-medium text-white">Setting identity</div>

          <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
            <MetaItem label="Name" value={setting.name} />
            <MetaItem label="Category" value={setting.category} />
            <MetaItem label="Status" value={setting.status.toUpperCase()} />
            <MetaItem label="Enabled" value={setting.enabled ? "Yes" : "No"} />
            <MetaItem label="Mode" value={setting.mode} />
            <MetaItem label="Registry source" value={setting.registrySource} />
            <MetaItem label="ID" value={setting.id} breakAll />

            <div className="md:col-span-2 rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Description</div>
              <div className="mt-1 text-zinc-200">{setting.description}</div>
            </div>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-5 text-lg font-medium text-white">Registry status</div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Source</span>
              <span className="text-zinc-200">{setting.registrySource}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Active settings</span>
              <span className="text-zinc-200">
                {SETTINGS_REGISTRY.filter((item) => item.status === "active").length}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Category</span>
              <span className="text-zinc-200">{setting.category}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Availability</span>
              <span className="text-zinc-200">
                {setting.enabled ? "Enabled" : "No"}
              </span>
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Next step</div>
              <div className="mt-1 text-zinc-200">
                Cette page fonctionne en fallback statique.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Configuration preview</div>

        <pre className="overflow-x-auto rounded-[20px] border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{configPreview}
        </pre>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">
            Suggested cockpit surface
          </div>

          <div className="space-y-4">
            <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
              <div className={metaLabelClassName()}>Suggested route</div>
              <div className="mt-1 text-zinc-200">{setting.suggestedRoute}</div>
            </div>

            <Link
              href={setting.suggestedRoute}
              className={actionLinkClassName("primary")}
            >
              {setting.suggestedRouteLabel}
            </Link>
          </div>
        </div>

        <div className={cardClassName()}>
          <div className="mb-4 text-lg font-medium text-white">Related settings</div>

          {relatedSettings.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-white/10 px-4 py-8 text-sm text-zinc-500">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-white">
                      {item.name}
                    </div>

                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(
                        item.status
                      )}`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-zinc-400">
                    {item.description}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={cardClassName()}>
        <div className="mb-4 text-lg font-medium text-white">Navigation</div>

        <div className="space-y-3">
          <Link href="/settings" className={actionLinkClassName("soft")}>
            Retour à la liste settings
          </Link>

          <Link href="/settings" className={actionLinkClassName("primary")}>
            Voir tous les settings
          </Link>

          <Link href={setting.suggestedRoute} className={actionLinkClassName("default")}>
            {setting.suggestedRouteLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}
