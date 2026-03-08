import Link from "next/link";

type SidebarItemProps = {
  label: string;
  href: string;
  isActive?: boolean;
};

export function SidebarItem({ label, href, isActive = false }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={
        isActive
          ? "..."
          : "..."
      }
    >
      {label}
    </Link>
  );
}
