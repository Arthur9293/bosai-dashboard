import { redirect } from "next/navigation";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";

export default async function RootPage() {
  const session = await resolveAuthSession();

  if (!session.isAuthenticated) {
    redirect(AUTH_LOGIN_ROUTE);
  }

  const memberships = session.context?.memberships ?? [];
  const activeWorkspace = session.context?.activeWorkspace ?? null;

  if (memberships.length === 0) {
    redirect("/workspace/create");
  }

  if (!activeWorkspace && memberships.length > 1) {
    redirect("/workspace/select");
  }

  redirect("/workspace/home");
}
