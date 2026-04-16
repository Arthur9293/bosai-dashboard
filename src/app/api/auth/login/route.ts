import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME =
  (process.env.BOSAI_AUTH_COOKIE_NAME || "bosai_auth").trim() || "bosai_auth";

const AUTH_COOKIE_VALUE =
  (process.env.BOSAI_AUTH_COOKIE_VALUE || "authenticated").trim() || "authenticated";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let email = "";
    let password = "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        email?: string;
        password?: string;
      };

      email = String(body.email || "")
        .trim()
        .toLowerCase();
      password = String(body.password || "").trim();
    } else {
      const formData = await request.formData();
      email = String(formData.get("email") || "")
        .trim()
        .toLowerCase();
      password = String(formData.get("password") || "").trim();
    }

    const expectedEmail = (process.env.BOSAI_AUTH_EMAIL || "")
      .trim()
      .toLowerCase();
    const expectedPassword = (process.env.BOSAI_AUTH_PASSWORD || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Renseigne ton email et ton mot de passe." },
        { status: 400 }
      );
    }

    if (!expectedEmail || !expectedPassword) {
      return NextResponse.json(
        { ok: false, error: "Configuration auth incomplète côté serveur." },
        { status: 500 }
      );
    }

    if (email !== expectedEmail || password !== expectedPassword) {
      return NextResponse.json(
        { ok: false, error: "Identifiants invalides." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erreur serveur pendant la connexion." },
      { status: 500 }
    );
  }
}
