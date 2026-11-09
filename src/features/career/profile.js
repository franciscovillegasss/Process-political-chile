import { profileAllows } from '../elections/rm-profile.js';
import { renderAll } from '../../app/render.js';
import { GAME_STATE } from '../../app/state.js';
import { initialCampaign } from '../campaign/rules.js';
import { giveUpOffice, recordCareer } from './rules.js';
import { activeElection } from '../elections/actions.js';
import { CHILE_GEO } from '../../shared/geography.js';
import { element, showToast, warn } from '../../shared/dom.js';

function retire() {
  const { player, year } = GAME_STATE;
  recordCareer(GAME_STATE, 'Retiro', `${player.name} deja la primera línea a los ${player.age} años.`);
  giveUpOffice(GAME_STATE);
  const heir = element('successor-name').value.trim().slice(0, 60) || `${player.name.split(' ')[0]} ${player.name.split(' ').at(-1)} (${year})`;
  Object.assign(player, { name: heir, age: 25, approval: 52, politicalPoints: 20,
    nameRecognition: Math.round(player.nameRecognition * 0.4), funds: Math.round(3_000_000 + player.funds * 0.25), hiredStaffIds: [], hours: 60, maxHours: 60, personalFunds: 2_000_000 });
  GAME_STATE.campaign = initialCampaign();
  GAME_STATE.volunteers = Math.max(30, Math.floor(GAME_STATE.volunteers / 2));
  recordCareer(GAME_STATE, 'Sucesión', `${heir} continúa la trayectoria política de la familia.`);
  element('successor-name').value = '';
  renderAll();
  showToast('Nueva generación', `${heir} continúa con el legado y parte de la red territorial.`);
}

const retirePolitician = function() {
  if (GAME_STATE.player.age < 70 || activeElection()) return warn('El retiro voluntario está disponible desde los 70 años entre campañas.');
  retire();
};

function renderCareer() {
  const list = element('career-timeline');
  list.replaceChildren(...GAME_STATE.career.map(entry => {
    const row = document.createElement('li');
    row.className = 'whitespace-pre-line border-b border-stone-200 pb-1';
    row.textContent = `${entry.date} · ${entry.name} · ${entry.type} · ${entry.title}`;
    return row;
  }));
}

const changeDomicile = function() {
  if (GAME_STATE.player.officeId || activeElection()) return warn('Puedes cambiar de domicilio entre mandatos y fuera de campaña.');
  const select = element('domicile-select');
  if (!select.value) return warn('Selecciona tu nuevo domicilio.');
  const [region, district, commune] = JSON.parse(select.value);
  if (!profileAllows(GAME_STATE.profile, region) || !CHILE_GEO[region]?.districts[district]?.communes.includes(commune) || GAME_STATE.player.commune === commune) {
    return warn('Elige una comuna distinta.');
  }
  Object.assign(GAME_STATE.player, { region, district, commune });
  GAME_STATE.player.nameRecognition = Math.max(8, GAME_STATE.player.nameRecognition - 8);
  GAME_STATE.campaign.focus = -1;
  recordCareer(GAME_STATE, 'Domicilio', `Cambió su domicilio electoral a ${commune}.`);
  renderAll();
  showToast('Domicilio actualizado', `La siguiente candidatura utilizará ${commune} y su distrito.`, 'success');
};

function initDomicile() {
  const select = element('domicile-select');
  select.add(new Option('Selecciona una comuna', ''));
  for (const [region, data] of Object.entries(CHILE_GEO)) {
    for (const [district, entry] of Object.entries(data.districts)) {
      for (const commune of entry.communes) select.add(new Option(`${commune} · ${district}`, JSON.stringify([region, district, commune])));
    }
  }
}

const renderProfileAttributes = function() {
  const list = document.getElementById('profile-attributes-list');
  if (!list) return;
  const attrs = GAME_STATE.player.attributes || { oratory: 60, charisma: 55, negotiation: 50, management: 55 };
  list.innerHTML = `
    <div class="flex justify-between p-1 bg-white border rounded"><span>🎙️ Oratoria y Debate:</span><strong>${attrs.oratory}/100</strong></div>
    <div class="flex justify-between p-1 bg-white border rounded"><span>✨ Carisma Popular:</span><strong>${attrs.charisma}/100</strong></div>
    <div class="flex justify-between p-1 bg-white border rounded"><span>🤝 Negociación Política:</span><strong>${attrs.negotiation}/100</strong></div>
    <div class="flex justify-between p-1 bg-white border rounded"><span>📊 Capacidad de Gestión:</span><strong>${attrs.management}/100</strong></div>
    <div class="flex justify-between p-1 bg-blue-50 border border-blue-200 rounded text-blue-900"><span>🚩 Facción Interna:</span><strong><span id="profile-faction"></span></strong></div>
  `;
  document.getElementById('profile-faction').textContent = GAME_STATE.player.faction;
};

export { retire, retirePolitician, renderCareer, changeDomicile, initDomicile, renderProfileAttributes };
