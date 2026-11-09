import { GAME_STATE } from './state.js';
import { buildPoliticalCapital, executeCampaignAction } from '../features/campaign/actions.js';
import { activeElection } from '../features/elections/actions.js';
import { electionWeek, registrationWeek } from '../features/elections/rules.js';
import { element } from '../shared/dom.js';

export const AGENDA_PLANS = ['none', 'territory', 'campaign'];

export function setAgendaPlan(value) {
  if (!AGENDA_PLANS.includes(value)) return;
  GAME_STATE.agendaPlan = value;
  renderAgenda();
}

export function renderAgenda() {
  const { year, week, agendaPlan, mandate, localElection } = GAME_STATE;
  const first = electionWeek(year);
  const runoff = localElection?.year === year && !localElection.result ? localElection.runoffWeek : 0;
  const next = [
    [registrationWeek, 'Inscripción electoral'],
    [first, 'Escrutinio'],
    [runoff, 'Segunda vuelta'],
  ].filter(([date]) => first && date > week).sort((a, b) => a[0] - b[0])[0];
  const project = mandate?.project;
  const notes = [
    next ? `${next[1]} · semana ${next[0]}` : 'Sin hito electoral pendiente este año',
    project?.status === 'authorized' ? 'Alcaldía compromete fondos en el siguiente turno' : '',
    mandate?.auditDue ? `Informe de Alcaldía en ${Math.max(0, mandate.auditDue - year * 52 - week)} semanas` : '',
    project?.due ? `Entrega de ${project.name} en ${Math.max(0, project.due - year * 52 - week)} semanas` : '',
  ].filter(Boolean);
  element('agenda-next').textContent = notes.join(' · ');
  element('agenda-plan').value = agendaPlan;
}

export function runAgendaPlan() {
  if (GAME_STATE.player.hours < 12) return;
  if (GAME_STATE.agendaPlan === 'territory' &&
      GAME_STATE.year * 52 + GAME_STATE.week - GAME_STATE.campaign.lastCommunity >= 4) buildPoliticalCapital();
  if (GAME_STATE.agendaPlan === 'campaign' && activeElection()) executeCampaignAction('puerta_a_puerta');
}
