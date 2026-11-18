export const POLL_TYPES = {
  quick: { name: 'Pulso rápido', funds: 400_000, sample: 300 },
  standard: { name: 'Sondeo estándar', funds: 1_000_000, sample: 1000 },
  detailed: { name: 'Estudio amplio', funds: 2_000_000, sample: 2500 },
};

export function samplePoll(field, type, accuracy = 0, random = Math.random) {
  const config = POLL_TYPES[type];
  const precision = Math.max(0.5, 1 - accuracy);
  const margin = Number((98 / Math.sqrt(config.sample) * precision).toFixed(1));
  // A bounded approximation of sampling noise, drawn once when the paid poll is created.
  const noise = Array.from({ length: 12 }, () => random()).reduce((sum, value) => sum + value, 0) - 6;
  const share = Math.max(0, Math.min(100, field.votes / field.total * 100 + noise * margin / 1.96));
  const rival = field.rivals[0];
  const remaining = field.total - field.votes;
  return { share, rival: rival.name, rivalShare: remaining ? (100 - share) * rival.votes / remaining : 0,
    margin, sample: config.sample, method: config.name };
}
