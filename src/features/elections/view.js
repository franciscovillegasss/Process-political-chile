import { GAME_STATE } from '../../app/state.js';
import { registrationCost } from '../campaign/staff.js';
import { renderMandate } from '../career/mandate.js';
import { POLICIES_CATALOG } from '../character/programs.js';
import { canRegister, eligibleOffices, officeTitle } from './actions.js';
import { LOCAL_REGISTRATION, OFFICES, cycleOffices, electionWeek, officeTerritory, registrationWeek } from './rules.js';
import { CHILE_GEO } from '../../shared/geography.js';
import { clp, element } from '../../shared/dom.js';

function renderLocalElection() {
  const { localElection, localManagement, year, week, player } = GAME_STATE;
  const votingWeek = electionWeek(year);
  const cycle = cycleOffices(year, player.region);
  const eligible = eligibleOffices(player, year);
  const select = element('election-office');
  const previous = select.value;
  select.replaceChildren(...eligible.map(([id, office]) =>
    new Option(`${office.name} · ${officeTerritory(office, player, CHILE_GEO)} · ${office.age}+`, id)));
  if (eligible.some(([id]) => id === previous)) select.value = previous;
  select.disabled = element('local-register').disabled = !canRegister(GAME_STATE) || !eligible.length;
  const calendar = votingWeek
    ? `Elección ${year} · inscripción semanas ${registrationWeek} a ${votingWeek - 1} (10 PP y ${clp(registrationCost())}) · escrutinio semana ${votingWeek}.
${cycle.map(([id, office]) =>
      `${office.name} (${office.age}+)${eligible.some(([key]) => key === id) ? '' : ' · no habilitada'}`).join(' | ')}`
    : `Año sin elecciones regulares. Próximo ciclo: ${year + (4 - year % 4)}.`;
  const campaign = localElection?.year === year && !localElection.result
    ? `Candidatura inscrita: ${officeTitle(localElection.office, player)} · ${localElection.support.toLocaleString('es-CL')} puntos de campaña acumulados. Consulta Encuestas para estimar la intención de voto.` : '';
  const firstRound = localElection?.firstRound && !localElection.result ? `${localElection.firstRound} Votación en la semana ${localElection.runoffWeek}.` : '';
  const result = localElection?.result ? `Resultado ${localElection.year}
${localElection.result}` : '';
  element('elections-calendar-cards').textContent = [calendar, campaign, firstRound, result].filter(Boolean).join('\n\n');
  const missing = Math.max(0, LOCAL_REGISTRATION.points - player.politicalPoints);
  element('registration-recovery').textContent = missing ? `Faltan ${missing} PP. Puedes recuperarlos con trabajo territorial cada cuatro semanas.` : 'El trabajo territorial da puntos políticos dentro y fuera de campaña.';
  element('local-management').classList.toggle('hidden', !localManagement);
  element('management-audit').textContent = OFFICES[player.officeId]?.scope === 'commune'
    ? 'Fiscalizar el municipio (12 h)' : 'Revisar el uso de recursos públicos (12 h)';
  const policy = POLICIES_CATALOG.find(item => item.id === player.corePolicies[0]);
  element('local-management-status').textContent = {
    pending: `Primera decisión en tu nuevo cargo. Impulsa tu primer eje (${policy?.name || 'agenda local'}) para ganar 6 puntos de aprobación o fiscaliza para ganar 2 puntos de aprobación y 5 PP.`,
    agenda: 'Impulsaste tu primer eje · +6 puntos de aprobación.',
    audit: 'Revisaste el uso de recursos públicos · +2 puntos de aprobación y +5 PP.',
  }[localManagement] || '';
  element('local-management').querySelectorAll('button').forEach(button => {
    button.disabled = localManagement !== 'pending';
  });
  renderMandate();
}

export { renderLocalElection };
