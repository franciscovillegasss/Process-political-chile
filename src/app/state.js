import { initialCampaign } from '../features/campaign/rules.js';
import { newRoster } from '../features/career/rules.js';
import { warn } from '../shared/dom.js';

const initialState = () => ({
  career: [],
  roster: newRoster(2024),
  mandate: null,
  campaign: initialCampaign(),
  macroTrend: { inflation: 0, gdpGrowth: 0, unemployment: 0, victimizationRate: 0 },
  localElection: null,
  localManagement: null,
  week: 1,
  year: 2024,
  month: 'Enero',
  volunteers: 120,
  player: {
    name: 'Gabriel Silva',
    age: 25,
    profession: 'Abogado/a Constitucionalista',
    region: 'rm',
    district: 'Distrito 8',
    commune: 'Maipú',
    currentOffice: 'Ciudadano sin Cargo',
    officeId: '',
    officeEndYear: 0,
    partyId: 'IND',
    partyName: 'Independiente Fuera de Pacto',
    faction: 'Ciudadano Independiente',
    attributes: {
      oratory: 60,
      charisma: 55,
      negotiation: 50,
      management: 55
    },
    hours: 60,
    maxHours: 60,
    funds: 10000000,
    personalFunds: 2000000,
    politicalPoints: 25,
    nameRecognition: 25.0,
    approval: 52.0,
    corePolicies: ['p1', 'p4', 'p9'],
    activePactId: null,
    hiredStaffIds: []
  },
  socialTension: 35,
  macroMetrics: {
    inflation: 3.8,
    gdpGrowth: 2.3,
    unemployment: 8.5,
    victimizationRate: 58.0
  },
  congress: {
    activeChamber: 'diputados',
    lower: { ofic: 38, cv: 32, rep: 18, cent: 12 },
    upper: { ofic: 36, cv: 34, rep: 16, cent: 14 },
  },
  legislativeHistory: [
    { number: 'Archivo A1', title: 'Ley Marco de Ciberseguridad e Infraestructura Crítica', date: 'Enero 2024', type: 'Simple', quorum: '88 / 155', yes: 88, no: 52, abs: 15, area: 'crime', impact: 'Victimización -3.2%, Certeza jurídica +1.5%' },
    { number: 'Archivo A2', title: 'Ley de Alivio Tributario y Fomento a las PyMEs', date: 'Marzo 2024', type: 'Simple', quorum: '94 / 155', yes: 94, no: 41, abs: 20, area: 'taxes', impact: 'Crecimiento PIB +0.4%, Empleo formal +1.2%' }
  ],
  newsFeed: [
    { date: 'Semana 1, 2024', source: 'Crónica de la simulación', title: 'Comienza el calendario electoral simulado.' }
  ],
});
let GAME_STATE = initialState();

function pay({ hours, funds = 0, points = 0 }) {
  const player = GAME_STATE.player;
  if (player.hours < hours || player.funds < funds || player.politicalPoints < points) {
    warn('No tienes suficientes horas, fondos o puntos políticos.');
    return false;
  }
  player.hours -= hours;
  player.funds -= funds;
  player.politicalPoints -= points;
  return true;
}

function replaceState(state) {
  GAME_STATE = state;
}

export { initialState, GAME_STATE, pay, replaceState };
