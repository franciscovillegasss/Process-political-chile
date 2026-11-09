import { CHILE_PARTIES } from '../../shared/parties.js';
import { POLICIES_CATALOG } from '../character/programs.js';

const AGENDAS = [
  { title: 'Costo de vida y empleo', topics: ['Economía', 'Trabajo y transporte', 'Vivienda y ciudad'], economy: -0.45, authority: 0, weights: [36, 46, 18] },
  { title: 'Seguridad y convivencia', topics: ['Seguridad', 'Vivienda y ciudad', 'Instituciones y derechos'], economy: 0, authority: 0.8, weights: [23, 41, 36] },
  { title: 'Reformas sociales y servicios públicos', topics: ['Salud', 'Pensiones', 'Educación'], economy: -1, authority: -0.35, weights: [47, 39, 14] },
  { title: 'Sequía y recuperación territorial', topics: ['Medioambiente', 'Vivienda y ciudad', 'Trabajo y transporte'], economy: -0.35, authority: -0.4, weights: [36, 48, 16] },
  { title: 'Inversión y recuperación económica', topics: ['Economía', 'Trabajo y transporte', 'Educación'], economy: 0.8, authority: 0.15, weights: [18, 46, 36] },
  { title: 'Confianza institucional', topics: ['Instituciones y derechos', 'Seguridad', 'Salud'], economy: 0, authority: -0.55, weights: [31, 50, 19] },
];

const PARTY_POSITIONS = {
  PC: [-1.9, -0.15], FA: [-1.45, -1.2], PS: [-1.15, -0.55], PPD: [-0.65, -0.65],
  DC: [-0.4, 0.1], DEM: [0.2, 0.3], AMARILLOS: [0.2, 0.1], EVOPOLI: [1.1, -0.65],
  RN: [1, 0.65], UDI: [1.45, 1.25], PREP: [1.55, 1.85], PSC: [0.65, 1.3],
  PNL: [1.95, 1.25], PDG: [0.2, 0.45],
};

const GROUPS = [
  { name: 'Reformista', economy: -1.35, authority: -0.65 },
  { name: 'Moderado', economy: 0, authority: 0 },
  { name: 'Orden y mercado', economy: 1.25, authority: 1.1 },
];

const RIVAL_PARTIES = ['PS', 'RN', 'PREP', 'DC'];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => (Math.abs(a.economy - b.economy) + Math.abs(a.authority - b.authority)) / 8;

export function publicAgenda({ year, week }) {
  const phase = Math.floor((week - 1) / 8);
  return AGENDAS[((year - 2024 + phase) % AGENDAS.length + AGENDAS.length) % AGENDAS.length];
}

export function policyUrgency(state, issue) {
  const { inflation, gdpGrowth, unemployment, victimizationRate } = state.macroMetrics;
  const pressure = {
    'Economía': inflation >= 4 || gdpGrowth < 2,
    'Trabajo y transporte': unemployment >= 8,
    'Seguridad': victimizationRate >= 57,
    'Vivienda y ciudad': inflation >= 4,
    'Instituciones y derechos': state.socialTension >= 45,
    'Salud': state.socialTension >= 45,
  };
  const index = publicAgenda(state).topics.indexOf(issue);
  return clamp((index === -1 ? 0.23 : 0.91 - index * 0.14) + (pressure[issue] ? 0.18 : 0), 0, 1);
}

function voterGroups(state) {
  const agenda = publicAgenda(state);
  return GROUPS.map((group, index) => ({
    ...group,
    economy: clamp(group.economy + agenda.economy * 0.65, -2, 2),
    authority: clamp(group.authority + agenda.authority * 0.65, -2, 2),
    weight: agenda.weights[index] / 100,
  }));
}

function partyPosition(id) {
  const [economy, authority] = PARTY_POSITIONS[id] ?? [0, 0];
  return { economy, authority };
}

function voterFit(groups, stance) {
  return groups.reduce((total, group) => total + group.weight * (1 - distance(group, stance)), 0);
}

export function campaignClimate(state) {
  const agenda = publicAgenda(state);
  const groups = voterGroups(state);
  const party = partyPosition(state.player.partyId);
  const factions = CHILE_PARTIES.find(entry => entry.id === state.player.partyId)?.factions ?? [];
  const faction = factions.indexOf(state.player.faction);
  if (state.player.partyId !== 'IND' && faction >= 0) {
    const style = faction === 0 ? 0.93 : 1.07;
    party.economy = clamp(party.economy * style, -2, 2);
    party.authority = clamp(party.authority * style, -2, 2);
  }
  const independent = !Object.hasOwn(PARTY_POSITIONS, state.player.partyId);
  const policies = state.player.corePolicies.map(id => POLICIES_CATALOG.find(policy => policy.id === id)).filter(Boolean);
  const election = state.localElection?.year === state.year && !state.localElection.result ? state.localElection : null;
  const messages = election?.messages ?? {};
  const policyResults = policies.map(policy => {
    const urgency = policyUrgency(state, policy.issue);
    const fit = voterFit(groups, policy);
    const coherence = independent ? 1 : 1 - distance(party, policy);
    const emphasis = clamp(messages[policy.id] ?? 0, 0, 4);
    return { policy, urgency, fit, coherence, emphasis };
  });
  const weight = item => (0.35 + item.urgency) * (1 + item.emphasis * 0.18);
  const weighted = policyResults.reduce((sum, item) => sum + weight(item), 0);
  const average = key => weighted ? policyResults.reduce((sum, item) => sum + weight(item) * item[key], 0) / weighted : 0.75;
  const fit = average('fit');
  const coherence = average('coherence');
  const partyFit = independent ? fit : voterFit(groups, party);
  const trust = clamp(1 - (election?.revisions ?? 0) * 0.045, 0.82, 1);
  const trackRecord = 1 + Math.min(0.15, (state.mandate?.completed || 0) * 0.025);
  const multiplier = clamp((0.50 + 0.66 * fit + 0.32 * partyFit - 0.29 * (1 - coherence)) * trust, 0.55, 1.24) * trackRecord;
  return {
    agenda, groups, policyResults, fit, coherence, trust, trackRecord, multiplier,
    rivalFactors: RIVAL_PARTIES.map(id => 0.8 + 0.29 * voterFit(groups, partyPosition(id))),
  };
}

export function messageImpact(item, oratory) {
  const credibility = 0.52 + 0.48 * item.coherence;
  const reception = 0.24 + 0.76 * item.fit;
  return Math.round((24 + 69 * item.urgency) * credibility * reception *
    (0.5 + oratory / 100) / (1 + item.emphasis * 0.3));
}

export function newMessages() {
  return Object.fromEntries(POLICIES_CATALOG.map(({id}) => [id, 0]));
}

export function decayMessages(election) {
  if (!election?.messages || election.result) return;
  for (const id of Object.keys(election.messages)) {
    election.messages[id] = Math.max(0, election.messages[id] - 0.45);
  }
}
