import { officeActions } from './office-actions.js';
import { calendarWeek, recordCareer } from './rules.js';
import { GAME_STATE, pay } from '../../app/state.js';
import { reportCampaign } from '../campaign/actions.js';
import { recordLocalContact } from '../territory/rules.js';
import { element, warn } from '../../shared/dom.js';

function unavailable(action, mandate, now) {
  if (mandate.deskWeek === now) return 'Ya tomaste una decisión de despacho esta semana.';
  if (now - (mandate.deskUses?.[action.id] ?? -100) < 4) return 'Esta gestión vuelve a estar disponible en cuatro semanas.';
  if (action.effect === 'prepare' && (mandate.prepared || mandate.project)) return 'Prepara el expediente cuando no tengas una propuesta activa.';
  if (action.effect === 'expedite' && (!(mandate.project?.due > now + 1) || mandate.project.supervised)) return 'Necesitas una obra en ejecución sin supervisión previa.';
  return '';
}

function performOfficeAction(id) {
  const { mandate, player } = GAME_STATE;
  const action = officeActions(player.officeId).find(entry => entry.id === id);
  if (!mandate || !action) return;
  const now = calendarWeek(GAME_STATE);
  const reason = unavailable(action, mandate, now);
  if (reason) return warn(reason);
  if (!pay(action)) return;
  mandate.deskWeek = now;
  mandate.deskUses ??= {};
  mandate.deskUses[action.id] = now;
  if (action.effect === 'audit') player.politicalPoints += 1;
  if (action.effect === 'contact') recordLocalContact(GAME_STATE, 'vecinos');
  if (action.effect === 'prepare') mandate.prepared = true;
  if (action.effect === 'expedite') {
    mandate.project.due -= 1;
    mandate.project.supervised = true;
  }
  const detail = action.effect === 'audit'
    ? `Saldo público $${mandate.budget.toLocaleString('es-CL')} · ${mandate.completed} proyectos ejecutados · mantenimiento trimestral $${(mandate.maintenance ?? 0).toLocaleString('es-CL')}. +1 PP.`
    : action.detail;
  recordCareer(GAME_STATE, 'Despacho', detail);
  reportCampaign(action.name, detail);
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
    const reason = mandate ? unavailable(action, mandate, now) : 'Necesitas un cargo activo.';
    button.disabled = Boolean(reason) || player.hours < action.hours;
    button.title = reason || action.detail;
    button.textContent = `${action.name} · ${action.hours} h · ${action.detail}`;
    button.onclick = () => performOfficeAction(action.id);
    return button;
  }));
}
