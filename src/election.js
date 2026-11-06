export const PACTS = [
  { id: 'ofic', name: 'Contigo Chile Mejor', color: '#DC2626', parties: 'FA, PC, PS, PPD' },
  { id: 'cv', name: 'Chile Vamos', color: '#1D4ED8', parties: 'RN, UDI, Evópoli' },
  { id: 'rep', name: 'Frente Republicano & Libertario', color: '#0F172A', parties: 'PREP, PSC, PNL' },
  { id: 'cent', name: 'Centro Democrático', color: '#D97706', parties: 'DC, Demócratas, Amarillos' },
];

export function allocateSeats(lists, totalSeats) {
  const quotients = lists.flatMap(list => list.votes > 0
    ? Array.from({ length: totalSeats }, (_, index) => ({
        listId: list.id, color: list.color, votes: list.votes, divisor: index + 1,
        quotient: list.votes / (index + 1),
      }))
    : []);
  // Break equal quotients by list votes, then by the fixed order of the lists.
  quotients.sort((a, b) => b.votes * a.divisor - a.votes * b.divisor || b.votes - a.votes);
  const winners = quotients.slice(0, totalSeats);
  for (const list of lists) list.seats = winners.filter(winner => winner.listId === list.id).length;
  return winners;
}

export const LOCAL_REGISTRATION = { hours: 0, funds: 1_000_000, points: 10 };
export const LOCAL_ACTIONS = {
  puerta_a_puerta: { hours: 12, funds: 0, support: 32, attribute: 'charisma' },
  cabildo: { hours: 10, funds: 200_000, support: 60, attribute: 'negotiation' },
  prensa: { hours: 8, funds: 0, support: 17, attribute: 'oratory' },
};

export function countLocalElection(election, player) {
  const lists = PACTS.map((pact, index) => ({
    ...pact, candidates: [980 - index * 95, 720 - index * 70, 490 - index * 55],
  }));
  const candidateVotes = Math.round(80 + player.nameRecognition * 3 + (player.approval - 52) * 4 + election.support);
  let ownList = lists.find(list => list.id === election.pact);
  if (!ownList) {
    ownList = { id: 'ind', name: 'Independiente fuera de pacto', candidates: [] };
    lists.push(ownList);
  }
  for (const list of lists) {
    list.votes = list.candidates.reduce((sum, votes) => sum + votes, 0);
    if (list === ownList) list.votes += candidateVotes;
  }
  allocateSeats(lists, 6);
  const rank = 1 + ownList.candidates.filter(votes => votes >= candidateVotes).length;
  const won = rank <= ownList.seats;
  const reason = ownList.seats === 0 ? 'Tu lista quedó sin escaños.'
    : won ? 'Tu votación personal alcanzó para ocupar un escaño de la lista.'
    : 'Otros candidatos de tu lista obtuvieron más votos o empataron contigo.';
  const summary = [
    won ? 'Candidatura electa a concejal.' : 'Candidatura no electa.',
    `${ownList.name} · ${candidateVotes.toLocaleString('es-CL')} votos personales · puesto ${rank} de la lista.`,
    ...lists.map(list => `${list.name}: ${list.votes.toLocaleString('es-CL')} votos, ${list.seats} escaños.`),
    reason,
  ].join('\n');
  return { won, summary };
}
