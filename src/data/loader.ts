import type { Summary } from '../types';

export async function loadSummary(): Promise<Summary> {
  const base = import.meta.env.BASE_URL;
  const response = await fetch(`${base}data/summary.json`);
  if (!response.ok) {
    throw new Error(`Failed to load summary data: ${response.statusText}`);
  }
  return response.json();
}
