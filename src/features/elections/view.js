import { profileAllows, profileSeats, RM_COMMUNES, RM_PROFILE, RM_DATA_VERSION } from './rm-profile.js';
import { canEndorse } from './runoff.js';
import { campaignClimate } from '../electorate/rules.js';
import { GAME_STATE } from '../../app/state.js';
import { registrationCost } from '../campaign/staff.js';
import { renderMandate } from '../career/mandate.js';
import { POLICIES_CATALOG } from '../character/programs.js';
import { activeElection, canRegister, eligibleOffices, officeTitle, seekRunoffEndorsement } from './actions.js';
import { LOCAL_REGISTRATION, OFFICES, cycleOffices, electionField, electionWeek, officeTerritory, registrationWeek } from './rules.js';
import { CHILE_GEO } from '../../shared/geography.js';
import { clp, element } from '../../shared/dom.js';

function renderRunoff() {
  const panel = element('runoff-endorsements');
  const election = activeElection();
  panel.replaceChildren();
  if (!election?.runoffWeek) return;
  const climate = campaignClimate(GAME_STATE);
  const field = electionField(election, GAME_STATE.player, GAME_STATE.week, climate, GAME_STATE.roster);
  const heading = document.createElement('h4');
  heading.className = 'font-bold';
  heading.textContent = 'Respaldos de candidaturas eliminadas';
  panel.append(heading);
  for (const candidate of field.eliminated) {
    const endorsed = election.runoffEndorsements?.includes(candidate.slot);
    const possible = canEndorse(candidate.slot, election.runoffRival, climate.position);
    const button = document.createElement('button');
    button.className = 'mr-2 mb-2 rounded border bg-stone-100 px-2 py-1 text-xs disabled:opacity-50';
    button.disabled = endorsed || !possible;
    button.textContent = `${candidate.name} · ${endorsed ? 'Respaldo confirmado' : possible ? 'Solicitar respaldo (8 h)' : 'Afinidad insuficiente'}`;
    button.onclick = () => seekRunoffEndorsement(candidate.slot);
    panel.append(button);
  }
}

function renderLocalElection() {
  const { localElection, localManagement, year, week, player } = GAME_STATE;
  const votingWeek = electionWeek(year);
  const cycle = cycleOffices(year, player.region).filter(([id]) => profileAllows(GAME_STATE.profile, player.region, id));
  const eligible = eligibleOffices(player, year);
  const select = element('election-office');
  const previous = select.value;
  select.replaceChildren(...eligible.map(([id, office]) =>
    new Option(`${office.name} · ${GAME_STATE.profile === RM_PROFILE && id === 'core' ? RM_COMMUNES[player.commune]?.constituency : officeTerritory(office, player, CHILE_GEO)} · ${office.age}+`, id)));
  if (eligible.some(([id]) => id === previous)) select.value = previous;
  select.disabled = element('local-register').disabled = !canRegister(GAME_STATE) || !eligible.length;
  const calendar = votingWeek
    ? `Elección ${year} · inscripción semanas ${registrationWeek} a ${votingWeek - 1} (10 PP y ${clp(registrationCost())}) · escrutinio semana ${votingWeek}.
${cycle.map(([id, office]) =>
      `${office.name} (${office.age}+)${profileSeats(GAME_STATE.profile, player, id) ? ` · ${profileSeats(GAME_STATE.profile, player, id)} cupos` : ''}${eligible.some(([key]) => key === id) ? '' : ' · no habilitada'}`).join(' | ')}`
    : `Año sin elecciones regulares. Próximo ciclo: ${year + (4 - year % 4)}.`;
  const campaign = localElection?.year === year && !localElection.result
    ? `Candidatura inscrita: ${officeTitle(localElection.office, player)} · ${localElection.support.toLocaleString('es-CL')} puntos de campaña acumulados. Consulta Encuestas para estimar la intención de voto.` : '';
  const firstRound = localElection?.firstRound && !localElection.result ? `${localElection.firstRound} Votación en la semana ${localElection.runoffWeek}.` : '';
  const result = localElection?.result ? `Resultado ${localElection.year}
${localElection.result}` : '';
  element('elections-calendar-cards').textContent = [GAME_STATE.profile === RM_PROFILE ? `Perfil RM · datos ${RM_DATA_VERSION} · fechas semanales simuladas` : '', calendar, campaign, firstRound, result].filter(Boolean).join('\n\n');
  const missing = Math.max(0, LOCAL_REGISTRATION.points - player.politicalPoints);
  element('registration-recovery').textContent = missing ? `Faltan ${missing} PP. Puedes recuperarlos con trabajo territorial cada cuatro semanas.` : 'El trabajo territorial da puntos políticos dentro y fuera de campaña.';
  element('local-management').classList.toggle('hidden', !localManagement || (GAME_STATE.profile === RM_PROFILE && !['alcalde','concejal'].includes(player.officeId)));
  element('management-audit').textContent = OFFICES[player.officeId]?.scope === 'commune'
    ? 'Fiscalizar el municipio (12 h)' : 'Revisar el uso de recursos públicos (12 h)';
  const policy = POLICIES_CATALOG.find(item => item.id === player.corePolicies[0]);
  element('local-management-status').textContent = {
    pending: `Primera decisión en tu nuevo cargo. Impulsa tu primer eje (${policy?.name || 'agenda local'}) para ganar 6 puntos de aprobación o fiscaliza para ganar 2 puntos de aprobación y 5 PP.`,
    agenda: 'Impulsaste tu primer eje · +6 puntos de aprobación.',
    audit: GAME_STATE.profile === RM_PROFILE ? 'Informe de ejecución solicitado a Alcaldía. Consulta el registro de gestión.' : 'Revisaste el uso de recursos públicos · +2 puntos de aprobación y +5 PP.',
  }[localManagement] || '';
  element('local-management').querySelectorAll('button').forEach(button => {
    button.disabled = localManagement !== 'pending' || (GAME_STATE.profile === RM_PROFILE && player.officeId === 'concejal' && button.id !== 'management-audit');
  });
  renderRunoff();
  renderMandate();
}

export { renderLocalElection };
