const BALLOT_PARTIES = [['FA', 'PS', 'PC'], ['RN', 'UDI', 'EVOPOLI'], ['PREP', 'PSC', 'PNL'], ['DC', 'DEM', 'AMARILLOS']];

export function syntheticParty(listIndex, rank) {
  return BALLOT_PARTIES[listIndex][rank];
}

function groupBy(entries, key) {
  const groups = new Map();
  for (const candidate of entries) {
    if (candidate.votes <= 0) continue;
    const id = candidate[key] || candidate.party || candidate.id;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(candidate);
  }
  return [...groups].map(([id, candidates]) => ({
    id, candidates, capacity: candidates.length,
    votes: candidates.reduce((sum, candidate) => sum + candidate.votes, 0),
  }));
}

export function resolveProportionalBallot(lists, seats, levels, allocate) {
  const elected = [];
  const trace = [];
  let pending = false;

  function award(groups, count, depth, label) {
    const winners = allocate(groups, count + 1);
    if (winners.length < count) pending = true;
    const boundary = winners[count - 1];
    const next = winners[count];
    if (next && boundary && next.listId !== boundary.listId &&
        next.votes * boundary.divisor === boundary.votes * next.divisor) {
      pending = true;
    }
    for (const group of groups) {
      group.seats = winners.slice(0, count).filter(row => row.listId === group.id).length;
      trace.push({ level: label, id: group.id, votes: group.votes, seats: group.seats });
      if (!group.seats) continue;
      if (depth < levels.length) {
        award(groupBy(group.candidates, levels[depth]), group.seats, depth + 1, `${label}/${group.id}`);
      } else {
        const ordered = [...group.candidates].filter(candidate => candidate.votes > 0).sort((a, b) => b.votes - a.votes);
        if (ordered[group.seats]?.votes === ordered[group.seats - 1]?.votes && ordered.length > group.seats) pending = true;
        elected.push(...ordered.slice(0, group.seats).map(candidate => candidate.id));
      }
    }
  }

  if (lists.every(list => list.votes === 0)) return { pending: true, elected: [], trace: [] };
  award(lists, seats, 0, 'Papeleta');
  return { pending, elected: pending ? [] : elected, trace };
}
