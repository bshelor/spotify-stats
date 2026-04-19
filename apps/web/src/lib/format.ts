export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function deltaLabel(delta: number): { className: string; label: string } {
  if (delta > 0) return { className: 'delta-up', label: `▲ ${delta}` };
  if (delta < 0) return { className: 'delta-down', label: `▼ ${Math.abs(delta)}` };
  return { className: 'delta-flat', label: '—' };
}
