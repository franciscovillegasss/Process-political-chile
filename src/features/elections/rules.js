import { resolveProportionalBallot, syntheticParty } from './ballot.js';
import { RM_PROFILE } from './rm-profile.js';
import { firstRoundSnapshot, transferRunoff } from './runoff.js';

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
      id: `rival-${index * 3 + rank}`,
      party: syntheticParty(index, rank),
      subpact: `subpacto-${index}-${rank < 2 ? 1 : 2}`,
      name: roster?.[index * 3 + rank]?.name || RIVAL_NAMES[index][rank],
      list: pact.name,
      votes: Math.round((base * office.scale + growth * (4 - index + rank) + Math.min(200, (roster?.[index * 3 + rank]?.victories || 0) * 18)) * (climate?.rivalFactors[index] ?? 1)),
    }));
    return { ...pact, candidates };
  });
  const allRivals = lists.flatMap(list => list.candidates).sort((a, b) => b.votes - a.votes);
  if (election.runoffWeek) {
    const finalist = allRivals.find(rival => rival.slot === election.runoffRival);
    const snapshot = election.runoffSnapshot ?? firstRoundSnapshot(votes, allRivals);
    const transfers = transferRunoff(snapshot, finalist.slot, climate?.position, election.runoffEndorsements);
    const initialRival = snapshot.rivals.find(rival => rival.slot === finalist.slot).votes;
    const newPlayerVotes = Math.max(0, votes - snapshot.votes);
    const newRivalVotes = Math.max(0, finalist.votes - initialRival);
    const playerTotal = snapshot.votes + newPlayerVotes + transfers.reduce((sum, row) => sum + row.player, 0);
    const rivalTotal = initialRival + newRivalVotes + transfers.reduce((sum, row) => sum + row.rival, 0);
    return { office, votes: playerTotal, lists, rivals: [{ ...finalist, votes: rivalTotal }],
      total: playerTotal + rivalTotal, transfers, snapshot, newPlayerVotes, newRivalVotes,
      eliminated: allRivals.filter(rival => rival.slot !== finalist.slot) };
  }
  return { office, votes, lists, rivals: allRivals, total: votes + allRivals.reduce((sum, rival) => sum + rival.votes, 0) };
}

export function countElection(election, player, seats, week, climate, roster, stageRunoff = false) {
  const field = electionField(election, player, week, climate, roster);
  const { office, votes: candidateVotes, lists, rivals } = field;
  const officialProfile = election.profile === RM_PROFILE;
  const pending = reason => ({ won: false, pending: true, summary: `Resultado pendiente · ${reason}.` });
  if (officialProfile && field.total === 0) return pending('No hay votos válidos');
  if (!office.seats) {
    if (election.runoffWeek) {
      const rival = rivals[0];
      if (officialProfile && candidateVotes === rival.votes) return pending('Empate entre finalistas, requiere resolución');
      const won = candidateVotes > rival.votes;
      const detail = field.transfers.map(row => {
        const name = field.eliminated.find(candidate => candidate.slot === row.slot).name;
        return `${name}${row.endorsed ? ' (respaldo)' : ''}: ${row.player} para ti · ${row.rival} para tu rival · ${row.abstained} se abstuvieron.`;
      });
      return { won, summary: [
        `${won ? 'Candidatura electa' : 'Candidatura no electa'} · ${office.name}. Segunda vuelta: ${candidateVotes} votos frente a ${rival.votes} de ${rival.name}.`,
        `Votos de primera vuelta: ${field.snapshot.votes} tuyos. Apoyo nuevo: ${field.newPlayerVotes} para ti y ${field.newRivalVotes} para tu rival.`,
        ...detail,
      ].join('\n') };
    }
    const leaders = [candidateVotes, ...rivals.map(rival => rival.votes)].sort((a, b) => b - a);
    if (officialProfile && (leaders[0] === leaders[1] ||
        (office.threshold && leaders[0] / field.total < office.threshold && leaders[1] === leaders[2]))) return pending('Empate que puede cambiar el resultado, requiere resolución');
    return countExecutive(office, candidateVotes, rivals, stageRunoff, climate?.position);
  }

  let ownList = lists.find(list => list.id === election.pact);
  if (!ownList) {
    ownList = { id: 'ind', name: 'Independiente fuera de pacto', candidates: [] };
    lists.push(ownList);
  }
  if (officialProfile) {
    ownList.candidates.push({ id: 'player', votes: candidateVotes, party: player.partyId || 'IND',
      subpact: player.partyId === 'IND' || !player.partyId ? 'ind' : ownList.candidates.find(candidate => candidate.party === player.partyId)?.subpact ?? player.partyId });
    for (const list of lists) {
      list.capacity = list.candidates.filter(candidate => candidate.votes > 0).length;
      list.votes = list.candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
    }
    const levels = ['concejal', 'core'].includes(election.office) ? ['subpact'] : ['party'];
    const result = resolveProportionalBallot(lists, seats || office.seats, levels, allocateSeats);
    if (result.pending) return pending('Empate o falta de votos en la adjudicación');
    const won = result.elected.includes('player');
    return { won, summary: [
      `${won ? 'Candidatura electa' : 'Candidatura no electa'} · ${office.name} · ${seats || office.seats} cupos.`,
      `Votos personales: ${candidateVotes}. Lista: ${ownList.name}.`,
      ...result.trace.filter(row => row.level === 'Papeleta' || row.level === `Papeleta/${ownList.id}`)
        .map(row => `${row.level} · ${row.id}: ${row.votes} votos · ${row.seats} cupos`),
    ].join('\n') };
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

function countExecutive(office, votes, rivals, stageRunoff, position) {
  const [leader, runnerUp, ...others] = rivals.map(rival => rival.votes);
  const total = votes + leader + runnerUp + others.reduce((sum, value) => sum + value, 0);
  const share = votes / total;
  const pct = value => `${(value * 100).toFixed(2)} %`;
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
        snapshot: firstRoundSnapshot(votes, rivals),
        summary: `Clasificaste a segunda vuelta contra ${rivals[0].name} con ${pct(share)} de los votos.`,
      };
      const transfers = transferRunoff(firstRoundSnapshot(votes, rivals), rivals[0].slot, position);
      const yourRunoff = votes + transfers.reduce((sum, row) => sum + row.player, 0);
      const rivalRunoff = leader + transfers.reduce((sum, row) => sum + row.rival, 0);
      won = yourRunoff > rivalRunoff;
      detail = `Segunda vuelta simulada: ${pct(yourRunoff / (yourRunoff + rivalRunoff))} para tu candidatura.`;
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
