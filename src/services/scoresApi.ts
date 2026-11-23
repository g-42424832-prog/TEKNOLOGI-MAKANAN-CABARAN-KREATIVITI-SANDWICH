import type { ScorePayload, ScoreRecord } from '../types/scoring';

interface ApiErrorResponse {
  error?: string;
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & ApiErrorResponse;
  if (!response.ok) {
    throw new Error(data.error || 'Ralat komunikasi dengan pangkalan data.');
  }
  return data;
}

export async function fetchScores(): Promise<ScoreRecord[]> {
  const response = await fetch('/api/scores');
  const data = await parseJson<{ records: ScoreRecord[] }>(response);
  return data.records;
}

export async function createScore(payload: ScorePayload): Promise<ScoreRecord> {
  const response = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{ record: ScoreRecord }>(response);
  return data.record;
}

export async function updateScore(
  id: string,
  payload: ScorePayload,
): Promise<ScoreRecord> {
  const response = await fetch(`/api/scores/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{ record: ScoreRecord }>(response);
  return data.record;
}

export async function deleteScore(id: string): Promise<void> {
  const response = await fetch(`/api/scores/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await parseJson<{ deletedId: string }>(response);
}
