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

const manageLocalOffice = function(choice) {
  const { player, localManagement } = GAME_STATE;
  if (localManagement !== 'pending' || !['agenda', 'audit'].includes(choice)) return;
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
  element('mandate-actions').classList.toggle('hidden', !mandate);
  element('office-budget-disp').textContent = clp(mandate?.budget || 0);
  element('office-bills-disp').textContent = mandate?.completed || 0;
  if (mandate) {
    const select = element('mandate-policy');
    const previous = select.value;
    select.replaceChildren(...POLICIES_CATALOG.filter(policy => player.corePolicies.includes(policy.id))
      .map(policy => new Option(policy.name, policy.id)));
    if ([...select.options].some(option => option.value === previous)) select.value = previous;
    element('mandate-status').textContent = mandate.project
      ? `${mandate.project.name} · ${mandate.project.due ? `ejecución en ${Math.max(0, mandate.project.due - calendarWeek(GAME_STATE))} semanas` : `${mandate.hearings}/2 respaldos`}`
      : `Selecciona un eje. El presupuesto de ejecución es ${clp(PROJECT_COST)} por proyecto.`;
  }
  element('lobby-audiences-container').textContent = !mandate?.project ? 'Presenta un proyecto para convocar audiencias.'
    : mandate.project.due ? 'Las audiencias finalizaron. El proyecto está en ejecución.'
      : `Respaldo obtenido: ${mandate.hearings}/2. Participan juntas vecinales y organizaciones del territorio.`;
  const records = career.filter(entry => entry.name === player.name && ['Proyecto','Votación','Gestión'].includes(entry.type)).slice(0, 12);
  element('office-passed-bills-container').textContent = records.length ? records.map(entry => `${entry.date} · ${entry.title}`).join('\n')
    : 'Todavía no hay decisiones de gestión registradas.';
}

export { manageLocalOffice, proposeProject, holdHearing, voteProject, renderMandate };
