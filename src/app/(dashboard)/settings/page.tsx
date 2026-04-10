import Link from "next/link";
import { PageHeader } from "../../../components/ui/page-header";
import { DashboardCard } from "../../../components/ui/dashboard-card";
import {
  SETTINGS_REGISTRY,
  type SettingItem,
} from "./registry";

function tone(status?: string): string {
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

function countByStatus(settings: SettingItem[], status: string): number {
  return settings.filter((item) => item.status === status).length;
}

export default function SettingsPage() {
  const settings = SETTINGS_REGISTRY;

  const totalSettings = settings.length;
  const activeSettings = countByStatus(settings, "active");
  const pausedSettings = countByStatus(settings, "paused");
  const enabledSettings = settings.filter((item) => item.enabled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Inventaire des paramètres globaux BOSAI. Cette vue affiche leur état, leur catégorie et leur niveau d’activation."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard>
          <div className="text-sm text-zinc-400">Total settings</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {totalSettings}
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Active</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-emerald-300">
            {activeSettings}
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Paused</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-amber-300">
            {pausedSettings}
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="text-sm text-zinc-400">Enabled</div>
          <div className="mt-3 text-4xl font-semibold tracking-tight text-sky-300">
            {enabledSettings}
          </div>
        </DashboardCard>
      </section>

      <DashboardCard
        title="Registry status"
        subtitle="Cette page fonctionne en fallback statique tant que l’API n’expose pas encore /settings."
      >
        <div className="grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-2">
          <div className="flex justify-between gap-4">
            <span>Source</span>
            <span className="text-zinc-200">Fallback registry</span>
          </div>

          <div className="flex justify-between gap-4">
            <span>Loaded settings</span>
            <span className="text-zinc-200">{totalSettings}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span>Enabled settings</span>
            <span className="text-zinc-200">{enabledSettings}</span>
          </div>

          <div className="flex justify-between gap-4">
            <span>Next step</span>
            <span className="text-zinc-200">Settings detail page</span>
          </div>
        </div>
      </DashboardCard>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {settings.map((setting) => (
          <DashboardCard
            key={setting.id}
            rightSlot={
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone(
                  setting.status
                )}`}
              >
                {setting.status.toUpperCase()}
              </span>
            }
          >
            <div className="text-xs uppercase tracking-[0.24em] text-zinc-500">
              BOSAI Setting
            </div>

            <div className="mt-4 text-3xl font-semibold tracking-tight text-white">
              {setting.name}
            </div>

            <p className="mt-3 text-sm leading-7 text-zinc-400">
              {setting.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${categoryTone(
                  setting.category
                )}`}
              >
                {setting.category.toUpperCase()}
              </span>

              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-zinc-300">
                {setting.mode}
              </span>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${enabledTone(
                  setting.enabled
                )}`}
              >
                {setting.enabled ? "ENABLED" : "DISABLED"}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-white/10 pt-5 text-sm text-zinc-400 md:grid-cols-2">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Category
                </div>
                <div className="mt-1 text-zinc-200">{setting.category}</div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Value
                </div>
                <div className="mt-1 text-zinc-200">
                  {Object.keys(setting.value).length} key(s)
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  ID
                </div>
                <div className="mt-1 break-all text-zinc-200">{setting.id}</div>
              </div>
            </div>

            <Link
              href={`/settings/${encodeURIComponent(setting.id)}`}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
            >
              Ouvrir le détail
            </Link>
          </DashboardCard>
        ))}
      </section>
    </div>
  );
}
