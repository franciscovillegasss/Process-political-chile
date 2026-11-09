import { CHILE_GEO } from '../../shared/geography.js';
import { CHILE_PARTIES } from '../../shared/parties.js';
import { GAME_STATE, initialState, replaceState } from '../../app/state.js';
import { OFFICES } from '../elections/rules.js';
import { dismissNotice, element, showToast } from '../../shared/dom.js';
import { draft, resetDraft } from './draft.js';
import { newRoster, openMandate, recordCareer } from '../career/rules.js';
import { officeTitle } from '../elections/actions.js';
import { p1HandleAgeChange, p1RenderFactions, p1RenderParties } from './identity.js';
import { p2HandleYearChange, p2InitTerritoryCascades } from './territory.js';
import { p2RenderPoliciesCatalog } from './platform.js';
import { renderAll } from '../../app/render.js';

const goToPage2Territory = function() {
  const name = document.getElementById('p1-name').value.trim();
  const alertEl = document.getElementById('p1-validation-alert');
  if (name.length < 3) {
    alertEl.textContent = '⚠️ Debes ingresar un nombre y apellido de al menos 3 caracteres.';
    alertEl.classList.remove('hidden');
    return;
  }
  alertEl.classList.add('hidden');

  // Inicializar cascada de la página 2
  if (element('p2-region').options.length <= 1) p2InitTerritoryCascades();
  const startOffice = element('p2-initial-office');
  const previous = startOffice.value;
  const age = Number(element('p1-age').value);
  startOffice.replaceChildren(new Option('Ciudadano sin cargo', 'none'), ...Object.entries(OFFICES)
    .filter(([, office]) => age >= office.age)
    .map(([id, office]) => new Option(`${office.name} (${office.age}+)`, id)));
  if ([...startOffice.options].some(option => option.value === previous)) startOffice.value = previous;
  p2HandleYearChange(element('p2-start-year').value);
  p2RenderPoliciesCatalog();

  document.getElementById('screen-page-1-identity').classList.add('hidden');
  document.getElementById('screen-page-2-territory').classList.remove('hidden');
};

const backToPage1Identity = function() {
  document.getElementById('screen-page-2-territory').classList.add('hidden');
  document.getElementById('screen-page-1-identity').classList.remove('hidden');
};

const finishFullCharacterCreation = function() {
  const alertEl = document.getElementById('p2-validation-alert');

  const reg = document.getElementById('p2-region').value;
  const distVal = document.getElementById('p2-district').value;
  const comm = document.getElementById('p2-commune').value;

  const district = distVal.split(' (')[0];
  if (!CHILE_GEO[reg]?.districts[district]?.communes.includes(comm)) {
    alertEl.textContent = '⚠️ Debes seleccionar libremente tu Región, Distrito y Comuna de residencia antes de iniciar.';
    alertEl.classList.remove('hidden');
    return;
  }

  if (draft.p2SelectedPolicies.length !== 3) {
    alertEl.textContent = '⚠️ Debes elegir exactamente 3 políticas prioritarias.';
    alertEl.classList.remove('hidden');
    return;
  }

  const age = Number(document.getElementById('p1-age').value);
  if (!Number.isInteger(age) || age < 18 || age > 85) {
    alertEl.textContent = 'Selecciona una edad entre 18 y 85 años.';
    alertEl.classList.remove('hidden');
    return;
  }
  const officeVal = document.getElementById('p2-initial-office').value;

  if (officeVal !== 'none' && (!Object.hasOwn(OFFICES, officeVal) || age < OFFICES[officeVal].age)) {
    alertEl.textContent = 'No cumples la edad mínima de ese cargo.';
    alertEl.classList.remove('hidden');
    return;
  }

  const dist = district;
  const name = document.getElementById('p1-name').value.trim();
  const profession = document.getElementById('p1-profession').value;
  const startYear = parseInt(document.getElementById('p2-start-year')?.value || '2024');

  const partyObj = CHILE_PARTIES.find(p => p.id === draft.p1SelectedParty) || { name: 'Independiente' };

  replaceState(initialState());
  GAME_STATE.year = startYear;
  GAME_STATE.roster = newRoster(startYear);
  GAME_STATE.week = 1;
  GAME_STATE.month = 'Enero';
  GAME_STATE.volunteers = 120;
  GAME_STATE.player.name = name;
  GAME_STATE.player.age = age;
  GAME_STATE.player.profession = profession;
  if (/Dirigente|Líder|Activista/.test(profession)) {
    GAME_STATE.player.nameRecognition += 8;
    GAME_STATE.volunteers += 25;
  } else if (/Economista|Comercial|Emprendedor/.test(profession)) GAME_STATE.player.personalFunds += 1_000_000;
  else GAME_STATE.player.politicalPoints += 3;
  GAME_STATE.player.region = reg;
  GAME_STATE.player.district = dist;
  GAME_STATE.player.commune = comm;
  GAME_STATE.player.partyId = draft.p1SelectedParty;
  GAME_STATE.player.partyName = partyObj.name;
  GAME_STATE.player.faction = draft.p1SelectedFaction;
  GAME_STATE.player.attributes = { ...draft.p1Attributes };
  GAME_STATE.player.officeId = officeVal === 'none' ? '' : officeVal;
  GAME_STATE.player.currentOffice = officeTitle(GAME_STATE.player.officeId, GAME_STATE.player);
  if (GAME_STATE.player.officeId) {
    openMandate(GAME_STATE);
    GAME_STATE.localManagement = 'pending';
  }
  recordCareer(GAME_STATE, 'Inicio', `Comienza la trayectoria como ${GAME_STATE.player.currentOffice}.`);
  GAME_STATE.player.corePolicies = [...draft.p2SelectedPolicies];

  // Ocultar pantallas de creación y abrir tablero
  document.getElementById('screen-page-1-identity').classList.add('hidden');
  document.getElementById('screen-page-2-territory').classList.add('hidden');

  showToast('¡Bienvenido al Juego!', `Inicias tu carrera en ${comm} (${dist}) en el año ${startYear}.`, 'success');
  renderAll();
};

const openNewGameWizard = function() {
  document.getElementById('dropdown-session-menu').classList.add('hidden');
  resetDraft();
  dismissNotice();
  element('p1-validation-alert').classList.add('hidden');
  element('p2-initial-office').value = 'none';
  element('p2-policy-topic').value = '';

  const nameInput = document.getElementById('p1-name');
  if (nameInput) nameInput.value = '';

  const ageInput = document.getElementById('p1-age');
  if (ageInput) ageInput.value = '25';

  const yearSelect = document.getElementById('p2-start-year');
  if (yearSelect) {
    yearSelect.value = '2024';
    p2HandleYearChange('2024');
  }

  p1RenderParties();
  p1RenderFactions(CHILE_PARTIES.find(p => p.id === 'IND'));
  p1HandleAgeChange(25);
  p2InitTerritoryCascades();

  document.getElementById('screen-page-1-identity').classList.remove('hidden');
  document.getElementById('screen-page-2-territory').classList.add('hidden');
};

export { goToPage2Territory, backToPage1Identity, finishFullCharacterCreation, openNewGameWizard };
