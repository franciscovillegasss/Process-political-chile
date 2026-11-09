import { GAME_STATE } from './state.js';
import { renderStaffPanel, staffTotals } from '../features/campaign/staff.js';
import { renderContiguousMap, renderMapFocus } from '../features/campaign/territory.js';
import { renderCampaign, renderCountry } from '../features/campaign/view.js';
import { renderNewsFeed } from '../features/career/news.js';
import { renderCareer, renderProfileAttributes } from '../features/career/profile.js';
import { renderPoliticiansDirectory } from '../features/career/roster.js';
import { fundraisingYield } from '../features/career/rules.js';
import { updateCompass } from '../features/character/compass.js';
import { renderCongressHemiciclo, renderLegislativeHistory } from '../features/congress/chambers.js';
import { activeElection } from '../features/elections/actions.js';
import { renderDHondtD3Visualization, renderElectoralPactsCatalog } from '../features/elections/pacts.js';
import { electionWeek } from '../features/elections/rules.js';
import { renderLocalElection } from '../features/elections/view.js';
import { renderPublicOpinionTable } from '../features/electorate/opinion.js';
import { clp, element } from '../shared/dom.js';

function refreshCampaign() {
  renderPlayerStats();
  renderLocalElection();
  renderCampaign(GAME_STATE, activeElection());
}

function renderPlayerStats() {
  document.getElementById('stat-player-name').textContent = `${GAME_STATE.player.name || 'Sin Nombre'} (${GAME_STATE.player.age} años)`;
  document.getElementById('stat-player-party').textContent = GAME_STATE.player.partyId;
  document.getElementById('stat-player-office').textContent = GAME_STATE.player.currentOffice;
  document.getElementById('stat-pp').textContent = `${GAME_STATE.player.politicalPoints} PP`;
  document.getElementById('clock-date-disp').textContent = `Semana ${GAME_STATE.week} / 52, ${GAME_STATE.month} ${GAME_STATE.year}`;
  document.getElementById('card-funds-disp').textContent = `$${GAME_STATE.player.funds.toLocaleString('es-CL')}`;
  document.getElementById('card-hours-disp').textContent = `${GAME_STATE.player.hours} / ${GAME_STATE.player.maxHours} hrs`;
  document.getElementById('card-recognition-disp').textContent = `${GAME_STATE.player.nameRecognition.toFixed(1)}%`;

  const finFunds = document.getElementById('finance-total-funds');
  if (finFunds) finFunds.textContent = `$${GAME_STATE.player.funds.toLocaleString('es-CL')}`;

  const badgeEl = document.getElementById('clock-election-badge');
  if (badgeEl) {
    const { year, week } = GAME_STATE;
    const vote = electionWeek(year);
    badgeEl.textContent = !vote ? 'Año sin elección regular'
      : week >= vote ? `Resultados electorales ${year}` : `Elecciones · semana ${vote}, ${year}`;
  }

  const domDisp = document.getElementById('profile-domicile-disp');
  if (domDisp) {
    domDisp.textContent = `Domicilio Electoral: ${GAME_STATE.player.commune || 'Sin definir'} (${GAME_STATE.player.district || 'Sin distrito'})`;
  }

  const player = GAME_STATE.player;
  renderMapFocus();
  element('donor-outlook').textContent = `Próxima cena: ${clp(fundraisingYield(GAME_STATE, staffTotals().fundraisingBonus))} · fatiga ${GAME_STATE.campaign.donorFatigue}/8`;
  element('personal-funds').textContent = `Ahorros: ${clp(player.personalFunds)}`;
  element('stat-approval').textContent = element('office-approval-disp').textContent = `${player.approval.toFixed(1)}%`;
  element('office-title-disp').textContent = player.currentOffice;
  element('office-status-subtitle').textContent = player.officeEndYear ? `Próxima renovación: ${player.officeEndYear}` : '';
}

const renderAll = function() {
  renderPlayerStats();
  renderStaffPanel();
  renderContiguousMap();
  renderPublicOpinionTable();
  renderNewsFeed();
  renderCongressHemiciclo();
  renderLegislativeHistory();
  renderPoliticiansDirectory();
  renderElectoralPactsCatalog();
  renderDHondtD3Visualization();
  renderProfileAttributes();
  updateCompass('profile', GAME_STATE.player.corePolicies);
  renderCareer();
  renderLocalElection();
  renderCampaign(GAME_STATE, activeElection());
  renderCountry(GAME_STATE);
};

export { refreshCampaign, renderPlayerStats, renderAll };
