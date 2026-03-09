export type HealthScoreResponse = {
  ok?: boolean;
  score?: number;
  issues?: string[];
  ts?: string;
};

export async function fetchHealthScore(): Promise<HealthScoreResponse> {
  const res = await fetch(`${WORKER_BASE_URL}/health/score`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Impossible de charger /health/score (${res.status})`);
  }

  return res.json();
}
const API_BASE =
  process.env.NEXT_PUBLIC_BOSAI_API ||
  "https://bosai-worker.onrender.com";

export async function fetchRuns() {
  try {
    const res = await fetch(`${API_BASE}/runs`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch runs");
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("fetchRuns error:", err);
    return {
      runs: [],
      stats: {
        running: 0,
        done: 0,
        error: 0,
        unsupported: 0,
      },
    };
  }
}
