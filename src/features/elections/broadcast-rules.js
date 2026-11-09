export const BROADCAST_MS = 60_000;

export function tallyFrame(candidates, elapsed) {
  const fraction = Math.max(0, Math.min(1, elapsed / BROADCAST_MS));
  const rows = candidates.map((candidate, index) => ({
    ...candidate,
    counted: Math.floor(candidate.votes * fraction ** (0.72 + (index % 5) * 0.16)),
  })).sort((a, b) => b.counted - a.counted);
  const total = rows.reduce((sum, row) => sum + row.counted, 0);
  const expected = candidates.reduce((sum, row) => sum + row.votes, 0);
  return { total, progress: expected ? total / expected : fraction, rows: rows.map(row => ({
    ...row, share: total ? row.counted / total : 0,
  })) };
}
