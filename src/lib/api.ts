// src/lib/api.ts

export const WORKER_BASE_URL =
  process.env.NEXT_PUBLIC_WORKER_URL?.replace(/\/$/, "") ||
  "https://bosai-worker.onrender.com";

export type CommandItem = {
  id: string;
  capability?: string;
  status?: string;
  priority?: number;
  created_at?: string;
  updated_at?: string;
  dry_run?: boolean | null;
  worker?: string;
};

export type CommandsResponse = {
  ok?: boolean;
  count?: number;
  commands?: CommandItem[];
  stats?: {
    queue?: number;
    running?: number;
    done?: number;
    error?: number;
    other?: number;
  };
  ts?: string;
};

export async function fetchCommands(): Promise<CommandsResponse> {
  const res = await fetch(`${WORKER_BASE_URL}/commands`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Impossible de charger /commands (${res.status})`);
  }

  return res.json();
}
