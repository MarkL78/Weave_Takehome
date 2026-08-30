import type { Summary } from '../types';

export async function loadSummary(): Promise<Summary> {
  const response = await fetch('/data/summary.json');
  if (!response.ok) {
    throw new Error(`Failed to load summary data: ${response.statusText}`);
  }
  return response.json();
}
