export type SettingStatus = "active" | "paused" | "disabled";

export type SettingItem = {
  id: string;
  name: string;
  description: string;
  category: "Workspace" | "Worker" | "Environment" | "System" | "Scheduler";
  status: SettingStatus;
  enabled: boolean;
  mode: string;
  registrySource: string;
  suggestedRoute: string;
  suggestedRouteLabel: string;
  value: Record<string, unknown>;
};

export const SETTINGS_REGISTRY: SettingItem[] = [
  {
    id: "workspace_production",
    name: "workspace_production",
    description: "Workspace principal utilisé par le cockpit BOSAI.",
    category: "Workspace",
    status: "active",
    enabled: true,
    mode: "Production workspace",
    registrySource: "Fallback registry",
    suggestedRoute: "/flows",
    suggestedRouteLabel: "Voir les flows production",
    value: {
      workspace_id: "production",
      routing_mode: "single_default_workspace",
      write_scope: "primary",
    },
  },
  {
    id: "worker_identity",
    name: "worker_identity",
    description: "Identité logique du worker principal exposé dans le cockpit.",
    category: "Worker",
    status: "active",
    enabled: true,
    mode: "Main worker",
    registrySource: "Fallback registry",
    suggestedRoute: "/runs",
    suggestedRouteLabel: "Voir les runs worker",
    value: {
      worker_name: "bosai-worker-01",
      app_name: "bosai-worker",
      app_role: "control-plane-executor",
    },
  },
  {
    id: "environment_profile",
    name: "environment_profile",
    description: "Profil d’environnement actuellement présenté dans le cockpit.",
    category: "Environment",
    status: "active",
    enabled: true,
    mode: "Stable environment",
    registrySource: "Fallback registry",
    suggestedRoute: "/overview",
    suggestedRouteLabel: "Voir l’overview",
    value: {
      environment: "stable",
      release_channel: "production",
      dashboard_profile: "safe_ui",
    },
  },
  {
    id: "retry_system",
    name: "retry_system",
    description: "Réinjection contrôlée des commandes réessayables.",
    category: "System",
    status: "active",
    enabled: true,
    mode: "Automatic retry",
    registrySource: "Fallback registry",
    suggestedRoute: "/commands",
    suggestedRouteLabel: "Voir les commands retry",
    value: {
      retry_enabled: true,
      retry_router: "enabled",
      retry_policy: "bounded",
    },
  },
  {
    id: "lock_system",
    name: "lock_system",
    description: "Gestion des locks et récupération des exécutions bloquées.",
    category: "System",
    status: "active",
    enabled: true,
    mode: "Lock recovery",
    registrySource: "Fallback registry",
    suggestedRoute: "/runs",
    suggestedRouteLabel: "Voir les runs lock-related",
    value: {
      lock_enabled: true,
      stale_lock_cleanup: true,
      lock_owner_mode: "worker-scoped",
    },
  },
  {
    id: "event_engine",
    name: "event_engine",
    description: "Transformation Event → Command côté BOSAI Worker.",
    category: "System",
    status: "active",
    enabled: true,
    mode: "Event orchestration",
    registrySource: "Fallback registry",
    suggestedRoute: "/events",
    suggestedRouteLabel: "Voir les events",
    value: {
      event_engine: "active",
      mapping_mode: "event_to_command",
      processing_profile: "safe",
    },
  },
  {
    id: "internal_scheduler",
    name: "internal_scheduler",
    description: "Scheduler interne prêt mais non exposé comme surface active du cockpit.",
    category: "Scheduler",
    status: "paused",
    enabled: false,
    mode: "Standby",
    registrySource: "Fallback registry",
    suggestedRoute: "/runs",
    suggestedRouteLabel: "Voir les runs scheduler",
    value: {
      scheduler_enabled: false,
      reason: "dashboard_fallback_mode",
      activation: "manual",
    },
  },
];
