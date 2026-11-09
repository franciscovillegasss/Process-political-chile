import { setAgendaPlan } from './app/agenda.js';
import { renderAll } from './app/render.js';
import { advanceTurn } from './app/turn.js';
import { buildPoliticalCapital, commissionPoll, executeCampaignAction, fundraiseAction, launchAdCampaign, manageVolunteers, meetContact, personalContribution, promotePolicy, restPolitician, revisePolicy } from './features/campaign/actions.js';
import { filterStaffRole, fireStaff, hireStaff, renderStaffPanel } from './features/campaign/staff.js';
import { renderContiguousMap } from './features/campaign/territory.js';
import { holdHearing, manageLocalOffice, proposeProject, voteProject, withdrawMunicipal } from './features/career/mandate.js';
import { renderNewsFeed } from './features/career/news.js';
import { changeDomicile, initDomicile, renderProfileAttributes, retirePolitician } from './features/career/profile.js';
import { renderPoliticiansDirectory } from './features/career/roster.js';
import { adjustAttribute, p1HandleAgeChange, p1RandomName, p1RenderFactions, p1RenderParties, p1UpdateProfessions } from './features/character/identity.js';
import { backToPage1Identity, finishFullCharacterCreation, goToPage2Territory, openNewGameWizard } from './features/character/wizard.js';
import { initPrograms, p2RenderPoliciesCatalog, p2TogglePolicy } from './features/character/platform.js';
import { p2HandleCommuneChange, p2HandleDistrictChange, p2HandleRegionChange, p2HandleYearChange, p2InitTerritoryCascades } from './features/character/territory.js';
import { renderCongressHemiciclo, renderLegislativeHistory, setCongressChamber } from './features/congress/chambers.js';
import { registerCandidate } from './features/elections/actions.js';
import { renderDHondtD3Visualization, renderElectoralPactsCatalog, resetDHondtSliders, togglePactMembership, updateDHondtSimulation } from './features/elections/pacts.js';
import { renderPublicOpinionTable } from './features/electorate/opinion.js';
import { exportGameJson, importGameJson, loadGameQuick, recoverGame, resetGameConfirm, saveGameQuick } from './features/save/storage.js';
import { CHILE_PARTIES } from './shared/parties.js';
import { dismissNotice, showToast } from './shared/dom.js';
import { openCampaignPolls, switchMainView, switchSubpanel, toggleSessionMenu } from './ui/navigation.js';

import './ui/styles.css';
import './ui/shell.css';

Object.assign(window, {
  registerCandidate,
  executeCampaignAction,
  fundraiseAction,
  launchAdCampaign,
  meetContact,
  commissionPoll,
  promotePolicy,
  revisePolicy,
  manageVolunteers,
  manageLocalOffice,
  buildPoliticalCapital,
  restPolitician,
  personalContribution,
  proposeProject,
  holdHearing,
  voteProject,
  withdrawMunicipal,
  retirePolitician,
  changeDomicile,
  adjustAttribute,
  p1HandleAgeChange,
  p1UpdateProfessions,
  p1RandomName,
  p1RenderParties,
  p1RenderFactions,
  goToPage2Territory,
  backToPage1Identity,
  p2HandleYearChange,
  p2InitTerritoryCascades,
  p2HandleRegionChange,
  p2HandleDistrictChange,
  p2HandleCommuneChange,
  p2RenderPoliciesCatalog,
  p2TogglePolicy,
  finishFullCharacterCreation,
  resetDHondtSliders,
  updateDHondtSimulation,
  renderDHondtD3Visualization,
  filterStaffRole,
  hireStaff,
  fireStaff,
  renderStaffPanel,
  advanceTurn,
  renderAll,
  renderProfileAttributes,
  renderContiguousMap,
  renderPublicOpinionTable,
  renderNewsFeed,
  setCongressChamber,
  renderCongressHemiciclo,
  renderLegislativeHistory,
  renderPoliticiansDirectory,
  renderElectoralPactsCatalog,
  togglePactMembership,
  switchMainView,
  openCampaignPolls,
  switchSubpanel,
  toggleSessionMenu,
  openNewGameWizard,
  saveGameQuick,
  loadGameQuick,
  exportGameJson,
  importGameJson,
  resetGameConfirm,
  recoverGame,
  setAgendaPlan,
  dismissNotice,
  showToast
});

window.addEventListener('DOMContentLoaded', () => {
  initPrograms();
  initDomicile();
  p1RenderParties();
  p1RenderFactions(CHILE_PARTIES.find(p => p.id === 'IND'));
  p1UpdateProfessions(25);

  loadGameQuick(true);
  renderAll();
});
