export type NavItem = {
  label: string;
  href: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const dashboardNavigation: NavSection[] = [
  {
    title: "Core",
    items: [{ label: "Overview", href: "/app" }],
  },
  {
    title: "Operations",
    items: [
      { label: "Commands", href: "/app/commands" },
      { label: "Runs", href: "/app/runs" },
      { label: "Incidents", href: "/app/incidents" },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Tools", href: "/app/tools" },
      { label: "Policies", href: "/app/policies" },
      { label: "Integrations", href: "/app/integrations" },
    ],
  },
  {
    title: "Workspace",
    items: [{ label: "Settings", href: "/app/settings" }],
  },
];
