import { renderLegislativeHistory } from '../congress/chambers.js';
import { GAME_STATE, pay } from '../../app/state.js';
import { element, clp, warn } from '../../shared/dom.js';
import { reportCampaign } from '../campaign/actions.js';
import { POLICIES_CATALOG } from '../character/programs.js';
import { RM_PROFILE } from '../elections/rm-profile.js';
import { policyUrgency } from '../electorate/rules.js';
import { calendarWeek, recordCareer } from './rules.js';
import { EXECUTIVES, GOVERNMENT_BLOCS, INSTITUTIONS, enactGovernmentProject, fundService,
  availablePublicBudget, governmentVote, isBicameral, newGovernmentProject, projectTerms, voteSignature } from './governance-rules.js';
import { SERVICE_COST, SERVICE_ISSUES, serviceCoverage } from './public-services.js';
import { updatePromises } from './promises.js';

export const usesMunicipalCircuit = state => state.profile === RM_PROFILE &&
  ['alcalde', 'concejal'].includes(state.player.officeId);

export function startGovernmentProject() {
  const { mandate, player } = GAME_STATE;
  const policy = POLICIES_CATALOG.find(item => item.id === element('gov-policy').value && player.corePolicies.includes(item.id));
  if (!mandate || mandate.project || !policy || usesMunicipalCircuit(GAME_STATE)) return warn('Necesitas un expediente libre y un eje de tu programa.');
  const project = newGovernmentProject(GAME_STATE, policy);
  if (mandate.budget < projectTerms(project).cost) return warn('El saldo público no alcanza para esta propuesta.');
  if (!pay({ hours: mandate.prepared ? 6 : 10, points: 3 })) return;
  mandate.prepared = false;
  mandate.project = project;
  updatePromises(GAME_STATE, project, 'progress');
  recordCareer(GAME_STATE, 'Proyecto', `Presentó ${project.name} · compromiso ${policy.name}.`);
  reportCampaign('Expediente presentado', 'Consulta los votos previstos. Cada concesión modifica costo y plazo.');
}

export function negotiateGovernment() {
  const project = GAME_STATE.mandate?.project;
  const bloc = GOVERNMENT_BLOCS.find(item => item.id === element('gov-bloc').value);
  if (!project?.government || !['proposal', 'review'].includes(project.status) || !bloc || project.agreements.includes(bloc.id)) {
    return warn('Selecciona una bancada sin acuerdo en un expediente pendiente.');
  }
  if (!pay({ hours: 8 })) return;
  project.agreements.push(bloc.id);
  updatePromises(GAME_STATE, project, 'progress');
  recordCareer(GAME_STATE, 'Negociación', `${bloc.name} · ${bloc.concession}.`);
  reportCampaign('Acuerdo negociado', `${bloc.concession}. Revisa los votos y el costo actualizado antes de votar.`);
}

export function voteGovernment() {
  const { mandate } = GAME_STATE;
  const project = mandate?.project;
  if (!project?.government || !['proposal', 'review'].includes(project.status)) return warn('Presenta un expediente pendiente de votación.');
  const signature = voteSignature(GAME_STATE, project);
  if (project.lastVote === signature) return warn('Negocia un cambio antes de repetir esta votación.');
  if (!pay({ hours: 8 })) return;
  const vote = governmentVote(GAME_STATE, project);
  project.lastVote = signature;
  const detail = `${vote.body} · ${vote.yes}/${vote.total} votos · se requieren ${vote.required}.`;
  GAME_STATE.legislativeHistory.unshift({
    number: `Acuerdo ${GAME_STATE.year}-${GAME_STATE.week}`, title: project.name,
    date: `Semana ${GAME_STATE.week}, ${GAME_STATE.year}`, type: 'Simulación',
    quorum: `${vote.required} / ${vote.total}`, yes: vote.yes, no: vote.total - vote.yes, abs: 0,
    area: project.issue === 'Seguridad' ? 'crime' : 'taxes', impact: `${vote.approved ? 'Aprobado' : 'Rechazado'} en ${vote.body}.`,
  });
  renderLegislativeHistory();
  recordCareer(GAME_STATE, 'Votación', `${vote.approved ? 'Aprobado' : 'Rechazado'} · ${project.name} · ${detail}`);
  if (!vote.approved) {
    updatePromises(GAME_STATE, project, 'blocked');
    return reportCampaign('Proyecto rechazado', `${detail}${mandate.budget < projectTerms(project).cost ? ' Presupuesto insuficiente.' : ''} Conservas los fondos. Puedes negociar cambios o retirar el expediente.`);
  }
  project.approvals.push(vote.body);
  updatePromises(GAME_STATE, project, 'progress');
  if (isBicameral(project.office) && project.status === 'proposal') {
    project.status = 'review';
    return reportCampaign('Cámara de origen aprobó', `${detail} Falta la cámara revisora.`);
  }
  project.status = 'authorized';
  project.relevant = policyUrgency(GAME_STATE, project.issue) >= 0.75;
  reportCampaign('Proyecto autorizado', EXECUTIVES.includes(project.office)
    ? `${detail} Elige iniciar la ejecución desde tu despacho.`
    : `${detail} El Ejecutivo comprometerá los recursos el próximo turno.`);
}

export function implementGovernment() {
  const project = GAME_STATE.mandate?.project;
  if (!project?.government || project.status !== 'authorized' || !EXECUTIVES.includes(GAME_STATE.player.officeId)) return;
  if (GAME_STATE.mandate.budget < projectTerms(project).cost) return warn('Reserva fondos suficientes antes de ejecutar.');
  if (!pay({ hours: 8 })) return;
  enactGovernmentProject(GAME_STATE, calendarWeek(GAME_STATE));
  recordCareer(GAME_STATE, 'Ejecución', `${project.name} · presupuesto comprometido y entrega programada.`);
  reportCampaign('Ejecución iniciada', `Resultados previstos en ${projectTerms(project).weeks} semanas.`);
}

export function withdrawGovernment() {
  const project = GAME_STATE.mandate?.project;
  if (!project?.government || !['proposal', 'review'].includes(project.status)) return;
  updatePromises(GAME_STATE, project, 'pending');
  GAME_STATE.mandate.project = null;
  recordCareer(GAME_STATE, 'Proyecto', `Retiró ${project.name} antes de comprometer recursos.`);
  reportCampaign('Expediente retirado', 'Puedes presentar una propuesta diferente.');
}

export function financePublicService() {
  const issue = element('gov-service').value;
  if (!SERVICE_ISSUES.includes(issue) || !EXECUTIVES.includes(GAME_STATE.player.officeId)) return;
  if (!fundService(GAME_STATE, issue)) return warn('Necesitas $1.000.000 disponibles y un área sin programa activo.');
  recordCareer(GAME_STATE, 'Presupuesto', `${issue} · $1.000.000 comprometidos para doce semanas de servicios.`);
  reportCampaign('Servicio financiado', 'La cobertura mejora cada cuatro semanas. Los recursos salen del presupuesto público.');
}

const promiseLabels = { pending: 'Pendiente', progress: 'En trámite', blocked: 'Bloqueada en votación',
  fulfilled: 'Cumplida', unfulfilled: 'Sin cumplir al cerrar el mandato', 'blocked-final': 'Cerrada con bloqueo registrado' };

function fillSelect(id, entries) {
  const select = element(id);
  const previous = select.value;
  select.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
  if (entries.some(([value]) => value === previous)) select.value = previous;
}

export function renderGovernance() {
  const { player, mandate } = GAME_STATE;
  const project = mandate?.project;
  const modern = Boolean(mandate && !usesMunicipalCircuit(GAME_STATE) && (!project || project.government));
  element('government-process').classList.toggle('hidden', !modern);
  element('public-budget').classList.toggle('hidden', !mandate);
  const promises = (GAME_STATE.promises ?? []).filter(promise => promise.name === player.name).slice(-12);
  element('office-promises').classList.toggle('hidden', !promises.length);
  element('promise-list').replaceChildren(...promises.map(promise => {
    const row = document.createElement('li');
    const policy = POLICIES_CATALOG.find(item => item.id === promise.policyId);
    row.textContent = `${promise.year} · ${promise.objective ?? policy.name} · ${promiseLabels[promise.status]}`;
    return row;
  }));
  if (!mandate) return;
  fillSelect('gov-service', SERVICE_ISSUES.map(issue => [issue, `${issue} · mejora acumulada ${serviceCoverage(GAME_STATE, issue).toFixed(1)}/30`]));
  const executive = EXECUTIVES.includes(player.officeId);
  element('gov-service-controls').classList.toggle('hidden', !executive);
  element('budget-role').textContent = executive
    ? 'Distribuye el saldo entre proyectos y servicios. Cada servicio cuesta $1.000.000, dura doce semanas y mejora la cobertura cada cuatro semanas.'
    : 'Tu órgano autoriza recursos mediante acuerdos y proyectos. El Ejecutivo ejecuta los acuerdos aprobados.';
  element('budget-summary').textContent = `Saldo ${clp(mandate.budget)} · libre ${clp(availablePublicBudget(GAME_STATE))} · mantenimiento trimestral ${clp(mandate.maintenance ?? 0)} · asignación anual de hasta $6.000.000 con saldo máximo de $12.000.000. Montos del escenario simulado.`;
  element('budget-outcomes').textContent = SERVICE_ISSUES.map(issue => `${issue} +${serviceCoverage(GAME_STATE, issue).toFixed(1)} puntos`).join(' · ');
  const now = calendarWeek(GAME_STATE);
  element('budget-active-services').textContent = mandate.programs?.length
    ? mandate.programs.map(program => `${program.issue} · ${Math.max(0, program.until - now)} semanas restantes`).join(' · ')
    : 'Sin servicios temporales financiados.';
  element('gov-fund-service').disabled = availablePublicBudget(GAME_STATE) < SERVICE_COST;
  element('gov-fund-service').title = 'Los recursos autorizados para un proyecto quedan reservados para su ejecución.';
  if (!modern) return;
  fillSelect('gov-policy', POLICIES_CATALOG.filter(policy => player.corePolicies.includes(policy.id))
    .map(policy => [policy.id, policy.name]));
  fillSelect('gov-bloc', GOVERNMENT_BLOCS.map(bloc => [bloc.id,
    `${bloc.name} · ${bloc.concession} · +${clp(bloc.surcharge)} · +${bloc.delay} sem.`]));
  element('government-title').textContent = `${INSTITUTIONS[player.officeId].instrument} · ${INSTITUTIONS[player.officeId].body}`;
  element('gov-propose').disabled = Boolean(project);
  element('gov-propose').textContent = `Presentar expediente (${mandate.prepared ? 6 : 10} h · 3 PP)`;
  const negotiable = project && ['proposal', 'review'].includes(project.status);
  element('gov-negotiate').disabled = !negotiable;
  element('gov-vote').disabled = !negotiable || project.lastVote === voteSignature(GAME_STATE, project);
  element('gov-withdraw').disabled = !negotiable;
  element('gov-implement').classList.toggle('hidden', !executive);
  element('gov-implement').disabled = project?.status !== 'authorized';
  const vote = project ? governmentVote(GAME_STATE, project) : null;
  element('government-votes').textContent = vote
    ? `${vote.body} · ${vote.yes}/${vote.total} votos previstos · mayoría ${vote.required}. ${vote.votes.map(bloc => `${bloc.name} ${bloc.seats} ${bloc.yes ? 'a favor' : 'en contra'}`).join(' · ')}`
    : 'Los votos dependen de las bancadas, la orientación de la propuesta y las concesiones. Las leyes pasan por ambas cámaras.';
  const terms = project ? projectTerms(project) : null;
  const stages = { proposal: 'Debate de origen', review: 'Cámara revisora', authorized: 'Autorizado, ejecución pendiente', executing: 'En ejecución' };
  element('government-status').textContent = project
    ? `${project.name} · ${stages[project.status]} · ${clp(terms.cost)} · ${project.due ? Math.max(0, project.due - now) : terms.weeks} semanas · mejora de cobertura ${terms.impact.toFixed(1)} puntos al terminar.`
    : `Selecciona un compromiso para presentar una propuesta. Costo base ${clp(INSTITUTIONS[player.officeId].cost)}. Las concesiones amplían costos o plazos y reducen el alcance original.`;
}
