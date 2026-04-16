import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, normalizeNextPath, verifySessionToken } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams?:
    | Promise<{
        next?: string | string[];
      }>
    | {
        next?: string | string[];
      };
};

function firstParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : {};

  const nextPath = normalizeNextPath(firstParam(resolvedSearchParams.next));

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (session) {
    redirect(nextPath || "/");
  }

  return <LoginForm initialNext={nextPath || "/"} />;
}
