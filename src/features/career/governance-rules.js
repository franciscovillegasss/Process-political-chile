import { municipalTerms } from './municipal.js';
import { PACTS, allocateSeats } from '../elections/rules.js';
import { POLICIES_CATALOG } from '../character/programs.js';
import { improveService, SERVICE_COST, SERVICE_WEEKS, SERVICE_ISSUES } from './public-services.js';

export const EXECUTIVES = ['alcalde', 'gobernador', 'presidente'];
export const INSTITUTIONS = {
  concejal: { instrument: 'Plan comunal', body: 'Concejo municipal', cost: 2_000_000, weeks: 7, seats: 6 },
  alcalde: { instrument: 'Plan municipal', body: 'Concejo municipal', cost: 4_000_000, weeks: 9, seats: 6 },
  core: { instrument: 'Acuerdo de inversión regional', body: 'Consejo Regional', cost: 3_000_000, weeks: 10, seats: 34 },
  gobernador: { instrument: 'Programa regional', body: 'Consejo Regional', cost: 5_000_000, weeks: 12, seats: 34 },
  diputado: { instrument: 'Proyecto de ley', body: 'Cámara de Diputados', cost: 3_000_000, weeks: 12, seats: 155 },
  senador: { instrument: 'Proyecto de ley', body: 'Senado', cost: 3_000_000, weeks: 12, seats: 50 },
  presidente: { instrument: 'Mensaje del Ejecutivo', body: 'Cámara de Diputados', cost: 6_000_000, weeks: 14, seats: 155 },
};
export const GOVERNMENT_BLOCS = PACTS.map((pact, index) => ({ ...pact,
  economy: [-1.3, 1.1, 1.7, 0][index], authority: [-0.6, 0.6, 1.6, 0.1][index],
  concession: ['Ampliar beneficiarios', 'Evaluación y control de costos', 'Supervisión territorial', 'Implementación gradual'][index],
  surcharge: [400_000, 0, 300_000, 0][index], delay: [1, 2, 1, 3][index],
}));

export const isBicameral = office => ['diputado', 'senador', 'presidente'].includes(office);

export function projectTerms(project) {
  const config = INSTITUTIONS[project.office];
  const deals = GOVERNMENT_BLOCS.filter(bloc => project.agreements.includes(bloc.id));
  return { cost: config.cost + deals.reduce((sum, bloc) => sum + bloc.surcharge, 0),
    weeks: config.weeks + deals.reduce((sum, bloc) => sum + bloc.delay, 0),
    impact: Math.max(4, 8 - deals.length), maintenance: Math.round(config.cost * 0.025) };
}

export function projectChamber(project) {
  const senateFirst = project.office === 'senador';
  const senate = project.status === 'review' ? !senateFirst : senateFirst;
  return isBicameral(project.office) && senate ? 'senado' : 'diputados';
}

export function governmentVote(state, project) {
  const config = INSTITUTIONS[project.office];
  const chamber = projectChamber(project);
  const total = isBicameral(project.office) ? (chamber === 'senado' ? 50 : 155) : config.seats;
  const shares = chamber === 'senado' ? state.congress.upper : state.congress.lower;
  const groups = GOVERNMENT_BLOCS.map(bloc => ({ ...bloc, votes: Math.round(shares[bloc.id] * 100) }));
  allocateSeats(groups, total);
  const policy = POLICIES_CATALOG.find(item => item.id === project.policyId);
  const votes = groups.map(bloc => ({ ...bloc, yes: project.agreements.includes(bloc.id) ||
    Math.abs(bloc.economy - policy.economy) + Math.abs(bloc.authority - policy.authority) <= 2.1 }));
  const yes = votes.filter(bloc => bloc.yes).reduce((sum, bloc) => sum + bloc.seats, 0);
  return { yes, total, required: Math.floor(total / 2) + 1, votes,
    approved: yes > total / 2 && state.mandate.budget >= projectTerms(project).cost,
    body: isBicameral(project.office) ? (chamber === 'senado' ? 'Senado' : 'Cámara de Diputados') : config.body };
}

export function voteSignature(state, project) {
  const vote = governmentVote(state, project);
  return `${project.status}:${project.agreements.length}:${vote.yes}:${state.mandate.budget >= projectTerms(project).cost}`;
}

export function newGovernmentProject(state, policy) {
  return { government: true, office: state.player.officeId, policyId: policy.id,
    name: `${INSTITUTIONS[state.player.officeId].instrument} de ${policy.issue.toLowerCase()}`,
    issue: policy.issue, status: 'proposal', agreements: [], approvals: [], lastVote: '', due: 0, relevant: false };
}

export function enactGovernmentProject(state, now) {
  const project = state.mandate?.project;
  if (!project?.government || project.status !== 'authorized') return false;
  const terms = projectTerms(project);
  if (state.mandate.budget < terms.cost) return false;
  state.mandate.budget -= terms.cost;
  project.status = 'executing';
  project.due = now + terms.weeks;
  return true;
}

export function availablePublicBudget(state) {
  const mandate = state.mandate;
  if (!mandate) return 0;
  const project = mandate.project;
  let reserved = 0;
  if (project?.status === 'authorized') {
    if (project.government) reserved = projectTerms(project).cost;
    if (project.municipalId) reserved = municipalTerms(project).cost;
  }
  return Math.max(0, mandate.budget - reserved);
}

export function fundService(state, issue) {
  const mandate = state.mandate;
  const now = state.year * 52 + state.week;
  if (!mandate || availablePublicBudget(state) < SERVICE_COST || !SERVICE_ISSUES.includes(issue) ||
      mandate.programs?.some(program => program.issue === issue && program.until >= now)) return false;
  mandate.budget -= SERVICE_COST;
  mandate.programs ??= [];
  mandate.programs.push({ issue, started: now, until: now + SERVICE_WEEKS, lastPayment: now });
  return true;
}

export function advancePublicBudget(state) {
  const mandate = state.mandate;
  if (!mandate) return [];
  const now = state.year * 52 + state.week;
  const events = [];
  if (mandate.lastBudgetTick === now) return events;
  mandate.lastBudgetTick = now;
  mandate.budgetYear ??= state.year;
  if (state.year > mandate.budgetYear) {
    const received = Math.min(6_000_000, 12_000_000 - mandate.budget);
    mandate.budget += received;
    mandate.budgetYear = state.year;
    events.push(`Asignación anual recibida · $${received.toLocaleString('es-CL')}.`);
  }
  for (const program of mandate.programs ?? []) {
    if (now <= program.until && now - program.lastPayment >= 4) {
      program.lastPayment = now;
      const change = improveService(state, program.issue, 2);
      events.push(`${program.issue} · cobertura de servicios +${change.toFixed(1)} puntos.`);
    }
  }
  mandate.programs = (mandate.programs ?? []).filter(program => program.until > now);
  if (now % 13 === 0 && mandate.maintenance) {
    const cost = Math.min(mandate.budget, mandate.maintenance);
    mandate.budget -= cost;
    if (cost < mandate.maintenance) state.player.approval = Math.max(0, state.player.approval - 1.5);
    events.push(`Mantenimiento trimestral · $${cost.toLocaleString('es-CL')}${cost < mandate.maintenance ? ' · cobertura insuficiente, aprobación −1,5 pp' : ''}.`);
  }
  return events;
}
