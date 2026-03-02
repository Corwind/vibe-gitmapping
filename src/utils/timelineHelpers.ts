/** Format a Unix timestamp to a human-readable date string */
export function formatDate(ts: number): string {
  const date = new Date(ts * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format timestamp with time */
export function formatDateTime(ts: number): string {
  const date = new Date(ts * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Compute a heatmap of commit density across the timeline */
export function computeHeatmap(
  commits: { timestamp: number }[],
  start: number,
  end: number,
  buckets: number,
): number[] {
  if (start === end || buckets === 0) return new Array(buckets).fill(0) as number[];
  const counts = new Array(buckets).fill(0) as number[];
  const range = end - start;
  for (const c of commits) {
    const idx = Math.min(Math.floor(((c.timestamp - start) / range) * buckets), buckets - 1);
    if (idx >= 0) counts[idx]++;
  }
  const max = Math.max(...counts, 1);
  return counts.map((c) => c / max);
}
