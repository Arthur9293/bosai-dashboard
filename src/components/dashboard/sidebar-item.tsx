import Link from "next/link";

type SidebarItemProps = {
  label: string;
  href: string;
  isActive?: boolean;
};

export function SidebarItem({
  label,
  href,
  isActive = false,
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={
        isActive
          ? "flex items-center rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white"
          : "flex items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
      }
    >
      {label}
    </Link>
  );
}
