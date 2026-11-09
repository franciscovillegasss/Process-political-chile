import { recordLocalProject } from '../territory/rules.js';

export const RETIREMENT_AGE = 95;
export const TERM_BUDGET = 12_000_000;
export const PROJECT_COST = 2_000_000;
const NAMES = ['Paula Rojas', 'Luis Muñoz', 'Natalia Torres', 'Marcelo Vera', 'Andrea Fuentes', 'Gabriel Araya',
  'Inés Morales', 'Tomás Sepúlveda', 'Patricia Soto', 'Daniel Silva', 'Camila Contreras', 'Javier Álvarez'];
const PARTIES = ['PS', 'RN', 'PREP', 'DC'];

export const calendarWeek = ({ year, week }) => year * 52 + week;

export function newRoster(year) {
  return NAMES.map((name, index) => ({
    name, party: PARTIES[Math.floor(index / 3)], born: year - 38 - index * 2,
    generation: 1, victories: 0, office: '',
  }));
}

export function renewRoster(state) {
  state.roster.forEach((person, index) => {
    if (state.year - person.born < 76) return;
    const generation = person.generation + 1;
    state.roster[index] = {
      ...person, name: `${NAMES[(index + generation) % NAMES.length]} ${generation}`,
      born: state.year - 34 - index % 9, generation, victories: 0, office: '',
    };
  });
}

export function recordCareer(state, type, title) {
  const date = `Semana ${state.week}, ${state.year}`;
  state.career.unshift({ date, name: state.player.name, type, title });
  state.newsFeed.unshift({ date, source: 'Crónica de la simulación', title: title.split('\n')[0] });
  state.newsFeed.length = Math.min(state.newsFeed.length, 36);
}

export function fundraisingYield(state, bonus = 0) {
  const { fundraising, donorFatigue } = state.campaign;
  return Math.round(350_000 * (1 + bonus) * Math.max(0.28, 1 - donorFatigue * 0.105) *
    (fundraising ? 0.8 : 1) * (0.85 + state.player.approval / 350));
}

export function openMandate(state) {
  state.mandate = { budget: TERM_BUDGET, project: null, completed: 0, hearings: 0 };
}

export function completeProject(state) {
  const { mandate, player } = state;
  if (!mandate?.project?.due || mandate.project.due > calendarWeek(state)) return false;
  const project = mandate.project;
  const benefit = project.relevant ? 5 : 3;
  player.approval = Math.min(100, player.approval + benefit);
  player.politicalPoints += 4;
  if (player.officeId === 'presidente') {
    if (project.issue === 'Seguridad') state.macroMetrics.victimizationRate = Math.max(0, state.macroMetrics.victimizationRate - 0.8);
    if (project.issue === 'Economía') state.macroMetrics.gdpGrowth += 0.2;
    if (project.issue === 'Trabajo y transporte') state.macroMetrics.unemployment = Math.max(0, state.macroMetrics.unemployment - 0.2);
  }
  recordLocalProject(state, project);
  mandate.completed++;
  mandate.project = null;
  mandate.hearings = 0;
  recordCareer(state, 'Gestión', `${project.name} ejecutado · +${benefit} pp de aprobación.`);
  return true;
}

export function giveUpOffice(state) {
  Object.assign(state.player, { officeId: '', officeEndYear: 0, currentOffice: 'Ciudadano sin Cargo' });
  state.localManagement = null;
  state.mandate = null;
}
