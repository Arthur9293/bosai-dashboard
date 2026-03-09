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
    items: [
      { label: "Overview", href: "/" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Commands", href: "/commands" },
      { label: "Runs", href: "/runs" },
      { label: "Incidents", href: "/incidents" },
    ],
  },
  {
    title: "Governance",
    items: [
      { label: "Tools", href: "/tools" },
      { label: "Policies", href: "/policies" },
      { label: "Integrations", href: "/integrations" },
    ],
  },
  {
    title: "Workspace",
    items: [
      { label: "Settings", href: "/settings" },
    ],
  },
];
