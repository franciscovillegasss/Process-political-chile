import { policyUrgency, publicAgenda } from './electorate.js';

export const VOLUNTEER_LIMIT = 500;

const SECTOR_TOPICS = ['Instituciones y derechos', 'Trabajo y transporte', 'Economía', 'Educación',
  'Vivienda y ciudad', 'Medioambiente', 'Seguridad', 'Salud'];

export function focusBonus(state) {
  const topic = SECTOR_TOPICS[state.campaign.focus];
  return topic ? Math.round(6 + 22 * policyUrgency(state, topic)) : 0;
}

export const ADS = {
  digital: { name: 'Pauta digital', hours: 0, funds: 1_500_000, recognition: 3.5, support: 85 },
  palomas: { name: 'Propaganda territorial', hours: 0, funds: 2_500_000, recognition: 5, support: 145 },
};

export const CONTACTS = [
  { id: 'vecinos', name: 'Red de juntas de vecinos', issues: ['Vivienda y ciudad', 'Seguridad', 'Salud'], support: 130 },
  { id: 'productivo', name: 'Asociación de emprendedores', issues: ['Economía', 'Trabajo y transporte', 'Pensiones'], support: 95 },
  { id: 'civico', name: 'Coordinadora cívica y ambiental', issues: ['Educación', 'Medioambiente', 'Instituciones y derechos'], support: 115 },
];

export const METRICS = [
  { key: 'inflation', label: 'Inflación anual', unit: '%', issue: 'Economía' },
  { key: 'gdpGrowth', label: 'Crecimiento anual del PIB', unit: '%', issue: 'Economía' },
  { key: 'unemployment', label: 'Desempleo', unit: '%', issue: 'Trabajo y transporte' },
  { key: 'victimizationRate', label: 'Victimización simulada', unit: '%', issue: 'Seguridad' },
];

export function initialCampaign() {
  return {
    digital: 0, palomas: 0, fundraising: 0, donorFatigue: 0, lastCommunity: -100, rested: false, focus: -1, trained: 0, mobilized: 0, policyWeek: 0,
    contactYear: 0, contacts: { vecinos: 0, productivo: 0, civico: 0 },
    polls: [], activity: [],
    actionUses: { puerta_a_puerta: 0, cabildo: 0, prensa: 0 },
    endorsements: { vecinos: false, productivo: false, civico: false },
  };
}

export function weeklyCampaign(state) {
  if (!state.campaign.fundraising) state.campaign.donorFatigue = Math.max(0, state.campaign.donorFatigue - 1);
  Object.assign(state.campaign, { digital: 0, palomas: 0, fundraising: 0, rested: false, mobilized: 0, policyWeek: 0 });
  for (const action of Object.keys(state.campaign.actionUses)) state.campaign.actionUses[action] = 0;
  if (state.week % 4 !== 0) return;
  const wave = [0.6, 0.25, -0.2, -0.55, -0.3, 0.1][(state.year * 13 + state.week / 4) % 6] ?? 0;
  const agenda = publicAgenda(state);
  const prior = state.macroMetrics;
  const round = number => Math.round(number * 10) / 10;
  const next = {
    inflation: round(Math.max(0.5, prior.inflation + (3.5 - prior.inflation) * 0.13 + wave * 0.55 + (agenda.topics[0] === 'Economía' ? 0.15 : 0))),
    gdpGrowth: round(prior.gdpGrowth + (2.4 - prior.gdpGrowth) * 0.18 - wave * 0.55 + (agenda.economy > 0.5 ? 0.27 : 0)),
    unemployment: round(Math.max(3, prior.unemployment + (7.7 - prior.unemployment) * 0.12 + wave * 0.4)),
    victimizationRate: round(Math.max(0, prior.victimizationRate + (55 - prior.victimizationRate) * 0.09 - wave * 0.45 + (agenda.topics[0] === 'Seguridad' ? 0.7 : 0))),
  };
  state.macroTrend = Object.fromEntries(METRICS.map(({key}) => [key, round(next[key] - prior[key])]));
  state.macroMetrics = next;
  state.socialTension = Math.max(0, Math.min(100, Math.round(35 + (next.inflation - 3) * 5 +
    (next.unemployment - 7.5) * 3 + (next.victimizationRate - 55) * 0.6)));
}

export function issueDemand(state, issue) {
  return policyUrgency(state, issue) >= 0.75;
}
