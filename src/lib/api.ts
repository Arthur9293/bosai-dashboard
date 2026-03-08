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
export type RunItem = {
  id?: string;
  run_id?: string;
  worker?: string;
  capability?: string;
  status?: string;
  priority?: number;
  started_at?: string;
  finished_at?: string;
  dry_run?: boolean | null;
};

export type RunsResponse = {
  ok?: boolean;
  count?: number;
  runs?: RunItem[];
  stats?: {
    running?: number;
    done?: number;
    error?: number;
    unsupported?: number;
    other?: number;
  };
  ts?: string;
};

export async function fetchRuns(): Promise<RunsResponse> {
  const res = await fetch(`${WORKER_BASE_URL}/runs`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Impossible de charger /runs (${res.status})`);
  }

  return res.json();
}
