import { COUNCIL_BLOCS, MUNICIPAL_PROJECTS, councilDecision, municipalTerms } from './municipal.js';
import { RM_PROFILE, profileSeats } from '../elections/rm-profile.js';
import { renderPlayerStats } from '../../app/render.js';
import { GAME_STATE, pay } from '../../app/state.js';
import { reportCampaign } from '../campaign/actions.js';
import { PROJECT_COST, calendarWeek, recordCareer } from './rules.js';
import { POLICIES_CATALOG } from '../character/programs.js';
import { renderLegislativeHistory } from '../congress/chambers.js';
import { OFFICES } from '../elections/rules.js';
import { renderLocalElection } from '../elections/view.js';
import { policyUrgency } from '../electorate/rules.js';
import { clp, element, warn } from '../../shared/dom.js';

const municipalRole = () => ['alcalde', 'concejal'].includes(GAME_STATE.player.officeId);
const roleRestricted = () => GAME_STATE.profile === RM_PROFILE && !municipalRole();

function startMunicipalProject() {
  const { mandate, player } = GAME_STATE;
  const config = MUNICIPAL_PROJECTS.find(item => item.id === element('mandate-policy').value);
  if (!mandate || mandate.project || !config || mandate.budget < config.cost) return warn('Necesitas un expediente disponible y presupuesto municipal suficiente.');
  if (!pay({ hours: 10, points: 3 })) return;
  mandate.project = { name: config.name, issue: config.issue, due: 0, relevant: false,
    municipalId: config.id, status: 'proposal', concessions: [], lastVote: -1 };
  recordCareer(GAME_STATE, 'Proyecto municipal', `Alcaldía patrocina ${config.name}. ${player.officeId === 'concejal' ? 'El concejal solicitó el expediente para deliberación.' : 'Presentado al concejo.'}`);
  reportCampaign('Expediente municipal', 'Revisa las demandas de las bancadas en Lobby antes de someter el expediente a votación.');
}

function negotiateMunicipal() {
  const { mandate } = GAME_STATE;
  const project = mandate?.project;
  const bloc = COUNCIL_BLOCS.find(item => item.id === element('mandate-bloc').value);
  if (!bloc || !project || project.status !== 'proposal' || project.concessions.includes(bloc.id)) return warn('Elige una bancada que todavía no tenga un acuerdo para este expediente.');
  if (!pay({ hours: 8 })) return;
  project.concessions.push(bloc.id);
  recordCareer(GAME_STATE, 'Negociación municipal', `${bloc.name} compromete apoyo a cambio de ${bloc.terms.toLowerCase()}.`);
  reportCampaign('Concesión acordada', `${bloc.terms} · costo y plazo actualizados en el expediente.`);
}

function voteMunicipal() {
  const { mandate, player } = GAME_STATE;
  const project = mandate?.project;
  if (!project || project.status !== 'proposal' || project.lastVote === project.concessions.length) {
    return warn('Presenta un proyecto o negocia un cambio antes de repetir la votación.');
  }
  if (!pay({ hours: 8 })) return;
  const seats = profileSeats(RM_PROFILE, player, 'concejal');
  const vote = councilDecision(project, seats, mandate.budget);
  project.lastVote = project.concessions.length;
  const detail = `${vote.yes}/${seats} votos, se requieren ${vote.required}. ${vote.votes.map(bloc => `${bloc.name}: ${bloc.seats} ${bloc.yes ? 'a favor' : 'en contra'}`).join(' · ')}.`;
  recordCareer(GAME_STATE, 'Acuerdo del concejo', `${vote.approved ? 'Aprobado' : 'Rechazado'} · ${project.name} · ${detail}`);
  if (!vote.approved) {
    const cause = mandate.budget < vote.cost ? 'Presupuesto insuficiente.' : 'Negocia otro respaldo o retira el expediente.';
    return reportCampaign('Proyecto rechazado', `${detail} ${cause}`);
  }
  project.status = 'authorized';
  project.relevant = policyUrgency(GAME_STATE, project.issue) >= 0.75;
  reportCampaign('Acuerdo del concejo', `${detail} Alcaldía iniciará la ejecución en el siguiente turno.`);
}

function withdrawMunicipal() {
  const project = GAME_STATE.mandate?.project;
  if (project?.status !== 'proposal') return;
  GAME_STATE.mandate.project = null;
  recordCareer(GAME_STATE, 'Proyecto municipal', `Retirado antes de comprometer fondos: ${project.name}.`);
  reportCampaign('Expediente retirado', 'El saldo público permanece disponible para otro proyecto.');
}

const manageLocalOffice = function(choice) {
  if (GAME_STATE.profile === RM_PROFILE && (roleRestricted() || (GAME_STATE.player.officeId === 'concejal' && choice === 'agenda'))) {
    return warn('El concejal fiscaliza y vota en el concejo. La ejecución corresponde a Alcaldía.');
  }
  const { player, localManagement } = GAME_STATE;
  if (localManagement !== 'pending' || !['agenda', 'audit'].includes(choice)) return;
  if (GAME_STATE.profile === RM_PROFILE && choice === 'audit') {
    if (!GAME_STATE.mandate || !pay({ hours: 12 })) return;
    GAME_STATE.localManagement = 'audit';
    GAME_STATE.mandate.auditDue = calendarWeek(GAME_STATE) + 2;
    recordCareer(GAME_STATE, 'Fiscalización municipal', 'Se solicitó a Alcaldía un informe de presupuesto y ejecución.');
    reportCampaign('Informe solicitado', 'Alcaldía responderá en dos semanas. El expediente queda en el historial.');
    return;
  }
  if (!pay({ hours: 12, points: choice === 'agenda' ? 8 : 0 })) return;
  GAME_STATE.localManagement = choice;
  if (choice === 'agenda') player.approval = Math.min(100, player.approval + 6);
  else {
    player.approval = Math.min(100, player.approval + 2);
    player.politicalPoints += 5;
  }
  recordCareer(GAME_STATE, 'Gestión', choice === 'agenda' ? 'Presentó su agenda de mandato.' : 'Realizó la fiscalización inicial.');
  renderPlayerStats();
  renderLocalElection();
};

const proposeProject = function() {
  if (roleRestricted()) return warn('Este cargo del perfil RM todavía no tiene un circuito de gestión propio.');
  if (GAME_STATE.profile === RM_PROFILE) return startMunicipalProject();
  const { mandate, player } = GAME_STATE;
  const policy = POLICIES_CATALOG.find(item => item.id === element('mandate-policy').value && player.corePolicies.includes(item.id));
  if (!mandate || mandate.project || mandate.budget < PROJECT_COST || !policy) return warn('Necesitas un cargo, presupuesto disponible y un eje programático.');
  if (!pay({ hours: 10, points: 3 })) return;
  const scope = OFFICES[player.officeId].scope;
  const projectName = scope === 'commune' ? `Plan comunal de ${policy.issue.toLowerCase()}`
    : player.officeId === 'gobernador' || player.officeId === 'core' ? `Programa regional de ${policy.issue.toLowerCase()}` : policy.name;
  mandate.project = { name: projectName, issue: policy.issue, due: 0, relevant: false };
  mandate.hearings = 0;
  recordCareer(GAME_STATE, 'Proyecto', `Presentó: ${projectName} · eje ${policy.name}.`);
  reportCampaign('Proyecto presentado', 'Reúnete con dos grupos de interés antes de votar.');
};

const holdHearing = function(chamber = false) {
  if (roleRestricted()) return warn('La negociación de este órgano todavía no está disponible en el perfil RM.');
  if (GAME_STATE.profile === RM_PROFILE && !chamber) return negotiateMunicipal();
  if (chamber && GAME_STATE.player.officeId !== (GAME_STATE.congress.activeChamber === 'senado' ? 'senador' : 'diputado')) {
    return warn('Solo puedes negociar en la cámara en la que ocupas un escaño.');
  }
  const { mandate } = GAME_STATE;
  if (!mandate?.project || mandate.project.due || mandate.hearings >= 2) return warn('Necesitas un proyecto pendiente de acuerdo.');
  if (!pay({ hours: 8 })) return;
  mandate.hearings++;
  reportCampaign('Acuerdo de gestión', `Respaldo conseguido (${mandate.hearings}/2).`);
};

const voteProject = function(chamber) {
  if (roleRestricted()) return warn('La votación de este órgano todavía no está disponible en el perfil RM.');
  if (GAME_STATE.profile === RM_PROFILE && !chamber) return voteMunicipal();
  const { mandate, player } = GAME_STATE;
  if (chamber && player.officeId !== (GAME_STATE.congress.activeChamber === 'senado' ? 'senador' : 'diputado')) {
    return warn('Solo puedes votar en la cámara en la que ocupas un escaño.');
  }
  if (!mandate?.project || mandate.project.due || mandate.hearings < 2) return warn('Consigue dos respaldos antes de votar.');
  if (!pay({ hours: 8 })) return;
  mandate.budget -= PROJECT_COST;
  mandate.project.relevant = policyUrgency(GAME_STATE, mandate.project.issue) >= 0.75;
  const delay = Math.max(3, 10 - Math.floor(player.attributes.management / 15));
  mandate.project.due = calendarWeek(GAME_STATE) + delay;
  if (['diputado', 'senador'].includes(player.officeId)) {
    const total = player.officeId === 'senador' ? 50 : 155;
    const votes = Math.floor(total / 2) + 1 + mandate.hearings;
    GAME_STATE.legislativeHistory.unshift({
      number: `Proyecto ${GAME_STATE.year}-${GAME_STATE.week}`, title: mandate.project.name,
      date: `Semana ${GAME_STATE.week}, ${GAME_STATE.year}`, type: 'Simulación', quorum: `${votes} / ${total}`,
      yes: votes, no: total - votes, abs: 0, area: mandate.project.issue === 'Seguridad' ? 'crime' : 'taxes',
      impact: 'Aprobado en la cámara de origen. Ejecución simulada programada.',
    });
    renderLegislativeHistory();
  }
  recordCareer(GAME_STATE, 'Votación', `Aprobado: ${mandate.project.name}.`);
  reportCampaign('Proyecto aprobado', `Presupuesto asignado. Resultados en ${delay} semanas.`);
};

function renderMandate() {
  const { mandate, career, player } = GAME_STATE;
  const reference = GAME_STATE.profile === RM_PROFILE;
  const municipal = reference && municipalRole();
  const project = mandate?.project;
  element('mandate-actions').classList.toggle('hidden', !mandate || roleRestricted());
  element('mandate-unavailable').classList.toggle('hidden', !mandate || !roleRestricted());
  element('mandate-negotiation').classList.toggle('hidden', !municipal);
  element('mandate-project-label').textContent = municipal ? 'Cartera municipal' : 'Eje para el proyecto';
  element('mandate-propose').textContent = municipal && player.officeId === 'concejal' ? 'Solicitar expediente a Alcaldía (10 h · 3 PP)' : 'Presentar proyecto (10 h · 3 PP)';
  element('mandate-withdraw').classList.toggle('hidden', !municipal || project?.status !== 'proposal');
  if (municipal && !element('mandate-bloc').options.length) {
    element('mandate-bloc').replaceChildren(...COUNCIL_BLOCS.map(bloc =>
      new Option(`${bloc.name} · ${bloc.terms} · +${clp(bloc.surcharge)} · +${bloc.delay} sem.`, bloc.id)));
  }
  element('mandate-deals').textContent = municipal && project?.concessions?.length
    ? `Acuerdos: ${COUNCIL_BLOCS.filter(bloc => project.concessions.includes(bloc.id)).map(bloc => bloc.terms).join(' · ')}`
    : '';
  element('office-budget-disp').textContent = clp(mandate?.budget || 0);
  element('office-bills-disp').textContent = mandate?.completed || 0;
  if (mandate) {
    const select = element('mandate-policy');
    const previous = select.value;
    select.replaceChildren(...(municipal ? MUNICIPAL_PROJECTS.map(item =>
      new Option(`${item.name} · ${clp(item.cost)} · ${item.weeks} sem. · ${item.beneficiaries}`, item.id))
      : POLICIES_CATALOG.filter(policy => player.corePolicies.includes(policy.id)).map(policy => new Option(policy.name, policy.id))));
    if ([...select.options].some(option => option.value === previous)) select.value = previous;
    element('mandate-status').textContent = mandate.project
      ? `${mandate.project.name} · ${mandate.project.due ? `ejecución en ${Math.max(0, mandate.project.due - calendarWeek(GAME_STATE))} semanas` : `${mandate.hearings}/2 respaldos`}`
      : `Selecciona un eje. El presupuesto de ejecución es ${clp(PROJECT_COST)} por proyecto.`;
  }
  if (municipal) {
    const terms = project ? municipalTerms(project) : null;
    element('mandate-status').textContent = project
      ? `${project.name} · ${clp(terms.cost)} · ${project.status === 'executing' ? `ejecución en ${Math.max(0, project.due - calendarWeek(GAME_STATE))} semanas` : project.status === 'authorized' ? 'acuerdo aprobado; Alcaldía ejecuta el próximo turno' : `${terms.weeks} semanas previstas`}`
      : 'Escoge una obra. El presupuesto y las concesiones condicionan qué se puede ejecutar.';
  }
  element('lobby-audiences-container').textContent = !mandate?.project ? 'Presenta un proyecto para convocar audiencias.'
    : mandate.project.due ? 'Las audiencias finalizaron. El proyecto está en ejecución.'
      : `Respaldo obtenido: ${mandate.hearings}/2. Participan juntas vecinales y organizaciones del territorio.`;
  if (municipal) element('lobby-audiences-container').textContent = project?.status === 'proposal'
    ? 'Cada bancada ofrece apoyo a cambio de una concesión. Evalúa su costo, demora y escaños antes de votar.'
    : 'Se pueden negociar respaldos cuando hay un expediente pendiente.';
  const records = career.filter(entry => entry.name === player.name && ['Proyecto','Votación','Gestión','Proyecto municipal','Acuerdo del concejo','Ejecución municipal','Negociación municipal','Fiscalización municipal'].includes(entry.type)).slice(0, 12);
  element('office-passed-bills-container').textContent = records.length ? records.map(entry => `${entry.date} · ${entry.title}`).join('\n')
    : 'Todavía no hay decisiones de gestión registradas.';
}

export { manageLocalOffice, proposeProject, holdHearing, voteProject, renderMandate, withdrawMunicipal };
