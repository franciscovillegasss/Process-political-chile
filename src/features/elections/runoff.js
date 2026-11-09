const BLOC_POSITIONS = [[-1.2, -0.55], [1, 0.65], [1.55, 1.85], [-0.3, 0.1]];
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const distance = ([a, b], [x, y]) => (Math.abs(a - x) + Math.abs(b - y)) / 8;
const positionOf = slot => BLOC_POSITIONS[Math.floor(slot / 3)];

export function firstRoundSnapshot(votes, rivals) {
  return {
    votes,
    rivals: rivals.map(({ slot, votes: ballots }) => ({ slot, votes: ballots })),
  };
}

export function canEndorse(slot, rivalSlot, position) {
  return distance(positionOf(slot), position) <= distance(positionOf(slot), positionOf(rivalSlot)) + 0.2;
}

export function transferRunoff(snapshot, rivalSlot, position = [0, 0], endorsements = []) {
  return snapshot.rivals.filter(candidate => candidate.slot !== rivalSlot).map(candidate => {
    const origin = positionOf(candidate.slot);
    const yourDistance = distance(origin, position);
    const rivalDistance = distance(origin, positionOf(rivalSlot));
    const endorsed = endorsements.includes(candidate.slot);
    const abstention = clamp(0.12 + Math.min(yourDistance, rivalDistance) * 0.45 - (endorsed ? 0.06 : 0), 0.08, 0.45);
    const yourShare = clamp(0.5 + (rivalDistance - yourDistance) * 0.75 + (endorsed ? 0.19 : 0), 0.08, 0.92);
    const abstained = Math.round(candidate.votes * abstention);
    const remaining = candidate.votes - abstained;
    const player = Math.round(remaining * yourShare);
    return { slot: candidate.slot, player, rival: remaining - player, abstained, endorsed };
  });
}
