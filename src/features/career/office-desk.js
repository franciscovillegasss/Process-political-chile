import { officeActions } from './office-actions.js';
import { calendarWeek, recordCareer } from './rules.js';
import { GAME_STATE, pay } from '../../app/state.js';
import { reportCampaign } from '../campaign/actions.js';
import { recordLocalContact } from '../territory/rules.js';
import { element, warn } from '../../shared/dom.js';

function performOfficeAction(id) {
  const { mandate, player } = GAME_STATE;
  const action = officeActions(player.officeId).find(entry => entry.id === id);
  if (!mandate || !action) return;
  const now = calendarWeek(GAME_STATE);
  if (mandate.deskWeek === now) return warn('Ya tomaste una decisión de despacho esta semana.');
  if (action.expedites && !(mandate.project?.due > now + 1)) return warn('Necesitas una obra en ejecución a más de una semana de su entrega.');
  if (!pay(action)) return;
  mandate.deskWeek = now;
  player.politicalPoints += action.gain;
  player.approval = Math.min(100, player.approval + action.approval);
  if (action.contact) recordLocalContact(GAME_STATE, action.contact);
  if (action.expedites) mandate.project.due -= 1;
  recordCareer(GAME_STATE, 'Despacho', action.detail);
  reportCampaign(action.name, action.detail);
}

export function renderOfficeDesk() {
  const { player, mandate } = GAME_STATE;
  const actions = officeActions(player.officeId);
  const desk = element('office-desk');
  desk.classList.toggle('hidden', !mandate || !actions.length);
  const now = calendarWeek(GAME_STATE);
  element('office-desk-title').textContent = `Despacho · ${player.currentOffice}`;
  element('office-desk-status').textContent = mandate?.deskWeek === now
    ? 'Decisión de despacho registrada. Se habilita otra al avanzar la semana.'
    : 'Elige una decisión de despacho por semana. Las acciones consumen tiempo y quedan en tu historial.';
  element('office-desk-actions').replaceChildren(...actions.map(action => {
    const button = document.createElement('button');
    button.className = 'text-left rounded border border-slate-300 bg-white p-3 text-sm hover:bg-blue-50 disabled:opacity-50';
    button.disabled = !mandate || mandate.deskWeek === now || player.hours < action.hours ||
      player.politicalPoints < action.points || (action.expedites && !(mandate.project?.due > now + 1));
    button.textContent = `${action.name} · ${action.hours} h${action.points ? ` · ${action.points} PP` : ''} · +${action.approval} pp de aprobación${action.gain ? ` · +${action.gain} PP` : ''}`;
    button.onclick = () => performOfficeAction(action.id);
    return button;
  }));
}
