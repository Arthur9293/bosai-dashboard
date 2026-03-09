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
