import { RM_PROFILE, profileSeats } from '../elections/rm-profile.js';

export const MUNICIPAL_PROJECTS = [
  { id: 'lighting', name: 'Plan de luminarias', issue: 'Seguridad', cost: 4_600_000, weeks: 7, beneficiaries: 'Tramos peatonales y paraderos' },
  { id: 'waste', name: 'Plan de aseo y puntos limpios', issue: 'Medioambiente', cost: 5_700_000, weeks: 10, beneficiaries: 'Barrios con menor cobertura de retiro' },
  { id: 'park', name: 'Recuperación de espacios públicos', issue: 'Vivienda y ciudad', cost: 6_900_000, weeks: 12, beneficiaries: 'Vecindarios con déficit de áreas verdes' },
];

export const COUNCIL_BLOCS = [
  { id: 'vecinal', name: 'Bancada vecinal', terms: 'Ampliar cobertura', surcharge: 900_000, delay: 2, shares: 0.4, favored: 'park' },
  { id: 'fiscal', name: 'Bancada fiscalizadora', terms: 'Publicar hitos y rendición', surcharge: 0, delay: 3, shares: 0.3, favored: 'waste' },
  { id: 'gestion', name: 'Bancada de gestión', terms: 'Reforzar supervisión en terreno', surcharge: 600_000, delay: 1, shares: 0.3, favored: 'lighting' },
];

export function municipalTerms(project) {
  const config = MUNICIPAL_PROJECTS.find(item => item.id === project.municipalId);
  const deals = COUNCIL_BLOCS.filter(bloc => project.concessions.includes(bloc.id));
  return {
    cost: config.cost + deals.reduce((sum, bloc) => sum + bloc.surcharge, 0),
    weeks: config.weeks + deals.reduce((sum, bloc) => sum + bloc.delay, 0),
  };
}

export function councilDecision(project, seats, budget) {
  const first = Math.floor(seats * COUNCIL_BLOCS[0].shares);
  const second = Math.floor(seats * COUNCIL_BLOCS[1].shares);
  const counts = [first, second, seats - first - second];
  const votes = COUNCIL_BLOCS.map((bloc, index) => ({
    name: bloc.name, seats: counts[index], yes: bloc.favored === project.municipalId || project.concessions.includes(bloc.id),
  }));
  const yes = votes.filter(bloc => bloc.yes).reduce((sum, bloc) => sum + bloc.seats, 0);
  const required = Math.floor(seats / 2) + 1;
  const { cost, weeks } = municipalTerms(project);
  return { yes, required, votes, cost, weeks, approved: yes >= required && budget >= cost };
}

export function executeCouncilAgreement(state, now, record) {
  const mandate = state.mandate;
  const project = mandate?.project;
  if (state.profile !== RM_PROFILE || !['alcalde', 'concejal'].includes(state.player.officeId) ||
      !project?.municipalId || project.status !== 'authorized' || project.lastVote !== project.concessions.length) return false;
  const seats = profileSeats(state.profile, state.player, 'concejal');
  if (!seats || !councilDecision(project, seats, mandate.budget).approved) return false;
  const { cost, weeks } = municipalTerms(project);
  if (mandate.budget < cost) return false;
  mandate.budget -= cost;
  project.status = 'executing';
  project.due = now + weeks;
  record(state, 'Ejecución municipal', `Alcaldía ejecuta el acuerdo para ${project.name}. Presupuesto comprometido: $${cost.toLocaleString('es-CL')}.`);
  return true;
}

export function deliverMunicipalReport(state, now, record) {
  const mandate = state.mandate;
  if (!mandate?.auditDue || mandate.auditDue > now) return false;
  mandate.auditDue = 0;
  const project = mandate.project ? `${mandate.project.name} (${mandate.project.status === 'executing' ? 'en ejecución' : 'en trámite'})` : 'sin obra activa';
  record(state, 'Fiscalización municipal', `Alcaldía responde: ${project}. Saldo municipal: $${mandate.budget.toLocaleString('es-CL')}.`);
  return true;
}
