import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";

const AUTH_COOKIE_NAME =
  (process.env.BOSAI_AUTH_COOKIE_NAME || "bosai_auth").trim() || "bosai_auth";

const AUTH_COOKIE_VALUE =
  (process.env.BOSAI_AUTH_COOKIE_VALUE || "authenticated").trim() || "authenticated";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = token === AUTH_COOKIE_VALUE;

  if (!isAuthenticated) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
