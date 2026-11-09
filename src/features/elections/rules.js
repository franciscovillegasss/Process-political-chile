export const registrationWeek = 8;

export const PACTS = [
  { id: 'ofic', name: 'Contigo Chile Mejor', color: '#DC2626', parties: 'FA, PC, PS, PPD' },
  { id: 'cv', name: 'Chile Vamos', color: '#1D4ED8', parties: 'RN, UDI, Evópoli' },
  { id: 'rep', name: 'Frente Republicano & Libertario', color: '#0F172A', parties: 'PREP, PSC, PNL' },
  { id: 'cent', name: 'Centro Democrático', color: '#D97706', parties: 'DC, Demócratas, Amarillos' },
];

export function allocateSeats(lists, totalSeats) {
  const quotients = lists.flatMap(list => list.votes > 0
    ? Array.from({ length: Math.min(totalSeats, list.capacity ?? totalSeats) }, (_, index) => ({
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
  puerta_a_puerta: { hours: 12, funds: 0, support: 32, attribute: 'charisma', issues: ['Vivienda y ciudad', 'Salud', 'Seguridad'] },
  cabildo: { hours: 10, funds: 200_000, support: 60, attribute: 'negotiation', issues: ['Educación', 'Medioambiente', 'Instituciones y derechos'] },
  prensa: { hours: 8, funds: 0, support: 17, attribute: 'oratory', issues: ['Economía', 'Pensiones', 'Trabajo y transporte'] },
};

const RIVAL_NAMES = [
  ['Paula Rojas', 'Luis Muñoz', 'Natalia Torres'],
  ['Marcelo Vera', 'Andrea Fuentes', 'Gabriel Araya'],
  ['Inés Morales', 'Tomás Sepúlveda', 'Patricia Soto'],
  ['Daniel Silva', 'Camila Contreras', 'Javier Álvarez'],
];

export function electionField(election, player, week = 8, climate, roster) {
  const office = OFFICES[election.office || 'concejal'];
  const growth = Math.max(0, week - 8);
  const votes = Math.max(0, Math.round((80 + player.nameRecognition * 3 + (player.approval - 52) * 4 + election.support) * (climate?.multiplier ?? 1)));
  const lists = PACTS.map((pact, index) => {
    const bases = office.seats ? [980 - index * 95, 720 - index * 70, 490 - index * 55] : [[980, 720, 490, 360][index]];
    const candidates = bases.map((base, rank) => ({
      slot: index * 3 + rank,
      name: roster?.[index * 3 + rank]?.name || RIVAL_NAMES[index][rank],
      list: pact.name,
      votes: Math.round((base * office.scale + growth * (4 - index + rank) + Math.min(200, (roster?.[index * 3 + rank]?.victories || 0) * 18)) * (climate?.rivalFactors[index] ?? 1)),
    }));
    return { ...pact, candidates };
  });
  const eligibleLists = election.runoffWeek ? lists.map(list => ({
    ...list, candidates: list.candidates.filter(rival => rival.slot === election.runoffRival),
  })) : lists;
  const rivals = eligibleLists.flatMap(list => list.candidates).sort((a, b) => b.votes - a.votes);
  return { office, votes, lists, rivals, total: votes + rivals.reduce((sum, rival) => sum + rival.votes, 0) };
}

export function countElection(election, player, seats, week, climate, roster, stageRunoff = false) {
  const { office, votes: candidateVotes, lists, rivals } = electionField(election, player, week, climate, roster);
  if (!office.seats) {
    if (election.runoffWeek) {
      const rival = rivals[0];
      const won = candidateVotes > rival.votes;
      return { won, summary: `${won ? 'Candidatura electa' : 'Candidatura no electa'} · ${office.name}. Segunda vuelta: ${candidateVotes} votos frente a ${rival.votes} de ${rival.name}.` };
    }
    return countExecutive(office, candidateVotes, rivals, stageRunoff);
  }

  let ownList = lists.find(list => list.id === election.pact);
  if (!ownList) {
    ownList = { id: 'ind', name: 'Independiente fuera de pacto', candidates: [] };
    lists.push(ownList);
  }
  for (const list of lists) {
    list.capacity = list.candidates.length + Number(list === ownList);
    list.votes = list.candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
    if (list === ownList) list.votes += candidateVotes;
  }
  allocateSeats(lists, seats || office.seats);
  const rank = 1 + ownList.candidates.filter(candidate => candidate.votes >= candidateVotes).length;
  const won = rank <= ownList.seats;
  const reason = ownList.seats === 0 ? 'Tu lista quedó sin escaños.'
    : won ? 'Tu votación personal alcanzó para ocupar un escaño de la lista.'
    : 'Otros candidatos de tu lista obtuvieron más votos o empataron contigo.';
  return {
    won,
    summary: [
      won ? `Candidatura electa · ${office.name}.` : `Candidatura no electa · ${office.name}.`,
      `${ownList.name} · ${candidateVotes.toLocaleString('es-CL')} votos personales · puesto ${rank} de la lista.`,
      ...lists.map(list => `${list.name}: ${list.votes.toLocaleString('es-CL')} votos, ${list.seats} escaños.`),
      reason,
    ].join('\n'),
  };
}

function countExecutive(office, votes, rivals, stageRunoff) {
  const [leader, runnerUp, ...others] = rivals.map(rival => rival.votes);
  const total = votes + leader + runnerUp + others.reduce((sum, value) => sum + value, 0);
  const share = votes / total;
  const pct = value => `${(value * 100).toFixed(1)} %`;
  let won = votes > leader;
  let detail = 'Resultado por mayoría relativa.';
  if (office.threshold) {
    const playerMajority = share > office.threshold || (office.threshold === 0.4 && share === 0.4);
    const rivalShare = leader / total;
    const rivalMajority = rivalShare > office.threshold || (office.threshold === 0.4 && rivalShare === 0.4);
    if (won && playerMajority) detail = 'Victoria en primera vuelta.';
    else if (rivalMajority) { won = false; detail = 'Un rival ganó en primera vuelta.'; }
    else if (votes <= runnerUp) { won = false; detail = 'Quedaste fuera de la segunda vuelta.'; }
    else {
      if (stageRunoff) return {
        runoff: rivals[0].slot,
        summary: `Clasificaste a segunda vuelta contra ${rivals[0].name} con ${pct(share)} de los votos.`,
      };
      const yourRunoff = votes + Math.round((total - votes - leader) * 0.48);
      const rivalRunoff = total - yourRunoff;
      won = yourRunoff > rivalRunoff;
      detail = `Segunda vuelta simulada: ${pct(yourRunoff / total)} para tu candidatura.`;
    }
  }
  return {
    won,
    summary: [
      `${won ? 'Candidatura electa' : 'Candidatura no electa'} · ${office.name}.`,
      `Primera votación: ${votes.toLocaleString('es-CL')} votos (${pct(share)}). Rival principal: ${pct(leader / total)}.`,
      detail,
    ].join('\n'),
  };
}

export const OFFICES = {
  concejal: { name: 'Concejal', age: 18, cycle: 0, scope: 'commune', seats: 6, scale: 1 },
  alcalde: { name: 'Alcaldía', age: 18, cycle: 0, scope: 'commune', scale: 1.7 },
  core: { name: 'Consejería regional (CORE)', age: 18, cycle: 0, scope: 'province', seats: 5, scale: 1.4 },
  gobernador: { name: 'Gobernación regional', age: 18, cycle: 0, scope: 'region', threshold: 0.4, scale: 2.4 },
  diputado: { name: 'Diputación', age: 21, cycle: 1, scope: 'district', seats: 5, scale: 1.8 },
  senador: { name: 'Senaduría', age: 35, cycle: 1, scope: 'region', seats: 5, scale: 2.5 },
  presidente: { name: 'Presidencia de la República', age: 35, cycle: 1, scope: 'country', threshold: 0.5, scale: 3.3 },
};

export function cycleOffices(year, region) {
  return Object.entries(OFFICES).filter(([id, office]) =>
    year % 4 === office.cycle &&
    (id !== 'senador' || (region === 'valpo' && year % 8 === 1) || (region === 'rm' && year % 8 === 5)));
}

export function electionWeek(year) {
  if (year % 4 === 0) return 44;
  if (year % 4 === 1) return 46;
  return null;
}

export function officeTerritory(office, player, geography) {
  const region = geography[player.region];
  return {
    commune: player.commune,
    province: region?.provinces && Object.keys(region.provinces).find(name => region.provinces[name].includes(player.commune)) || (player.region === 'rm' ? 'Santiago' : null),
    district: player.district,
    region: region?.name,
    country: 'Chile',
  }[office.scope];
}
