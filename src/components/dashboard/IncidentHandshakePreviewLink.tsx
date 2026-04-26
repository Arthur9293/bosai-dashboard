"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Incident Detail V4.9-handshake-preview-link
 *
 * Navigation-only.
 * No fetch.
 * No POST /run.
 * No worker call.
 * No Airtable mutation.
 * No secret exposure.
 */
export function IncidentHandshakePreviewLink() {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const cleanPathname = currentUrl.pathname.replace(/\/$/, "");

    if (!/^\/incidents\/[^/]+$/.test(cleanPathname)) {
      setHref(null);
      return;
    }

    const workspaceId =
      currentUrl.searchParams.get("workspace_id") ||
      currentUrl.searchParams.get("workspaceId") ||
      "";

    const nextHref =
      cleanPathname +
      "/handshake-preview" +
      (workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "");

    setHref(nextHref);
  }, []);

  if (!href) return null;

  return (
    <section
      data-bosai-marker="Incident Detail V4.9-handshake-preview-link"
      className="mx-auto mb-6 max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-[28px] border border-cyan-400/20 bg-cyan-950/20 p-4 shadow-[0_0_60px_rgba(34,211,238,0.06)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-200/70">
              UI / SERVER HANDSHAKE PREVIEW
            </p>
            <p className="text-sm leading-6 text-zinc-400">
              Accès lecture seule vers la prévisualisation serveur V4.8.2. Aucun fetch, aucun POST /run, aucun appel worker.
            </p>
          </div>

          <Link
            href={href}
            className="inline-flex items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-500/15"
          >
            Ouvrir handshake preview
          </Link>
        </div>
      </div>
    </section>
  );
}
