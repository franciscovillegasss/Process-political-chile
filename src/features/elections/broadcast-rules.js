export const BROADCAST_MS = 60_000;
const BATCHES = 12;

function batchWeight(name, batch) {
  let hash = 2166136261;
  for (const char of `${name}/${batch}`) hash = Math.imul(hash ^ char.codePointAt(0), 16777619) >>> 0;
  return 0.4 + (hash % 1000) / 625;
}

export function tallyFrame(candidates, elapsed) {
  const fraction = Math.max(0, Math.min(1, elapsed / BROADCAST_MS));
  const completed = Math.floor(fraction * BATCHES);
  const partial = fraction * BATCHES - completed;
  const rows = candidates.map(candidate => {
    const weights = Array.from({ length: BATCHES }, (_, batch) => batchWeight(candidate.name, batch));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const countedWeight = weights.slice(0, completed).reduce((sum, weight) => sum + weight, 0) +
      (weights[completed] ?? 0) * partial;
    return { ...candidate, counted: fraction === 1 ? candidate.votes : Math.floor(candidate.votes * countedWeight / totalWeight) };
  }).sort((a, b) => b.counted - a.counted || a.name.localeCompare(b.name));
  const total = rows.reduce((sum, row) => sum + row.counted, 0);
  const expected = candidates.reduce((sum, row) => sum + row.votes, 0);
  return { total, progress: expected ? total / expected : fraction, rows: rows.map(row => ({
    ...row, share: total ? row.counted / total : 0,
  })) };
}
