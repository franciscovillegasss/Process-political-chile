import { PACTS, allocateSeats, LOCAL_REGISTRATION, LOCAL_ACTIONS, countLocalElection } from './election.js';

import { CHILE_GEO, CHILE_PARTIES, POLICIES_CATALOG, STAFF_CATALOG } from './catalogs.js';

const element = id => document.getElementById(id);
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const warn = message => window.showToast('Acción no disponible', message, 'warning');

function pay({ hours, funds = 0, points = 0 }) {
  const player = GAME_STATE.player;
  if (player.hours < hours || player.funds < funds || player.politicalPoints < points) {
    warn('No tienes suficientes horas, fondos o puntos políticos.');
    return false;
  }
  player.hours -= hours;
  player.funds -= funds;
  player.politicalPoints -= points;
  return true;
}

window.registerLocalCandidate = function() {
  const { year, week, player, localElection } = GAME_STATE;
  if (year % 4 !== 0 || week < 8 || week >= 44 || localElection?.year === year) {
    return warn('Puedes inscribirte una vez, entre las semanas 8 y 43 de un año municipal.');
  }
  if (player.age < 18 || !player.commune) return warn('Necesitas 18 años y una comuna de residencia.');
  if (player.currentOffice !== 'Ciudadano sin Cargo' && !player.currentOffice.startsWith('Concejal de ')) {
    return warn('La candidatura está disponible para ciudadanos sin cargo y concejales.');
  }
  if (!pay(LOCAL_REGISTRATION)) return;
  const pact = PACTS.find(list => `pact-${list.id}` === player.activePactId)?.id || 'ind';
  GAME_STATE.localElection = { year, pact, support: 0, result: '' };
  renderLocalElection();
  renderPlayerStats();
};

window.executeCampaignAction = function(key) {
  const action = LOCAL_ACTIONS[key];
  const { localElection, year, week, player } = GAME_STATE;
  if (!Object.hasOwn(LOCAL_ACTIONS, key)) return;
  if (localElection?.year !== year || week >= 44 || localElection.result) {
    return warn('Primero inscribe tu candidatura a concejal en Elecciones.');
  }
  if (!pay(action)) return;
  const support = Math.round(action.support * (0.5 + player.attributes[action.attribute] / 100));
  localElection.support += support;
  window.showToast('Campaña local', `+${support} votos proyectados.`, 'success');
  renderLocalElection();
  renderPlayerStats();
};

window.fundraiseAction = function() {
  if (!pay({ hours: 12 })) return;
  GAME_STATE.player.funds += 350_000;
  renderPlayerStats();
};

function resolveLocalElection() {
  const { localElection, year, player } = GAME_STATE;
  if (localElection?.year === year && localElection.result) return;
  const { won, summary } = localElection?.year === year
    ? countLocalElection(localElection, player)
    : { won: false, summary: 'Sin candidatura inscrita en esta elección municipal.' };
  GAME_STATE.localElection = { ...(localElection?.year === year ? localElection : { year, pact: 'ind', support: 0 }), result: summary };
  if (won) {
    player.currentOffice = `Concejal de ${player.commune}`;
    GAME_STATE.localManagement = 'pending';
  } else if (player.currentOffice.startsWith('Concejal de ')) {
    player.currentOffice = 'Ciudadano sin Cargo';
    GAME_STATE.localManagement = null;
  }
}

window.manageLocalOffice = function(choice) {
  const { player, localManagement } = GAME_STATE;
  if (localManagement !== 'pending' || !['agenda', 'audit'].includes(choice)) return;
  if (!pay({ hours: 12, points: choice === 'agenda' ? 8 : 0 })) return;
  GAME_STATE.localManagement = choice;
  if (choice === 'agenda') player.approval = Math.min(100, player.approval + 6);
  else {
    player.approval = Math.min(100, player.approval + 2);
    player.politicalPoints += 5;
  }
  renderPlayerStats();
  renderLocalElection();
};

function renderLocalElection() {
  const { localElection, localManagement, year, week, player } = GAME_STATE;
  const nextYear = year + ((4 - year % 4) % 4 || (week >= 44 ? 4 : 0));
  const calendar = `Próxima elección de concejales: ${nextYear} · simulación de 6 escaños
Inscripción: semanas 8 a 43 (10 PP y $1.000.000) · escrutinio: semana 44.`;
  element('local-register').disabled = year % 4 !== 0 || week < 8 || week >= 44 || localElection?.year === year;
  const campaign = localElection?.year === year && !localElection.result
    ? `Candidatura inscrita · ${PACTS.find(pact => pact.id === localElection.pact)?.name || 'Independiente fuera de pacto'} · ${localElection.support} votos proyectados por campaña.` : '';
  element('elections-calendar-cards').textContent = [calendar, campaign, localElection?.result].filter(Boolean).join('\n\n');
  element('local-management').classList.toggle('hidden', !localManagement);
  const policy = POLICIES_CATALOG.find(item => item.id === player.corePolicies[0]);
  element('local-management-status').textContent = {
    pending: `Tu primer voto en el concejo. Impulsa tu primer eje (${policy?.name || 'agenda local'}) para ganar 6 puntos de aprobación o fiscaliza para ganar 2 puntos de aprobación y 5 PP.`,
    agenda: 'Impulsaste tu primer eje · +6 puntos de aprobación.',
    audit: 'Fiscalizaste el municipio · +2 puntos de aprobación y +5 PP.',
  }[localManagement] || '';
  element('local-management').querySelectorAll('button').forEach(button => {
    button.disabled = localManagement !== 'pending';
  });
}

const initialState = () => ({
  localElection: null,
  localManagement: null,
  week: 1,
  year: 2024,
  month: 'Enero',
  volunteers: 120,
  player: {
    name: 'Gabriel Silva',
    age: 25,
    profession: 'Abogado/a Constitucionalista',
    region: 'rm',
    district: 'Distrito 8',
    commune: 'Maipú',
    currentOffice: 'Ciudadano sin Cargo',
    partyId: 'IND',
    partyName: 'Independiente Fuera de Pacto',
    faction: 'Ciudadano Independiente',
    attributes: {
      oratory: 60,
      charisma: 55,
      negotiation: 50,
      management: 55
    },
    hours: 60,
    maxHours: 60,
    funds: 10000000,
    politicalPoints: 25,
    nameRecognition: 25.0,
    approval: 52.0,
    corePolicies: ['p1', 'p4', 'p9'],
    activePactId: null,
    hiredStaffIds: []
  },
  socialTension: 35,
  macroMetrics: {
    inflation: 3.8,
    gdpGrowth: 2.3,
    unemployment: 8.5,
    victimizationRate: 58.0
  },
  congress: {
    activeChamber: 'diputados'
  },
  legislativeHistory: [
    { number: 'Ley N° 21.601', title: 'Ley Marco de Ciberseguridad e Infraestructura Crítica', date: 'Enero 2024', type: 'Simple', quorum: '88 / 155', yes: 88, no: 52, abs: 15, area: 'crime', impact: 'Victimización -3.2%, Certeza jurídica +1.5%' },
    { number: 'Ley N° 21.602', title: 'Ley de Alivio Tributario y Fomento a las PyMEs', date: 'Marzo 2024', type: 'Simple', quorum: '94 / 155', yes: 94, no: 41, abs: 20, area: 'taxes', impact: 'Crecimiento PIB +0.4%, Empleo formal +1.2%' }
  ],
  newsFeed: [
    { date: 'Semana 1, 2024', source: 'SERVEL / Diario Oficial', title: 'Se abre el año electoral municipal y regional 2024 en todo el territorio chileno.' }
  ],
});
let GAME_STATE = initialState();

let p1AvailablePoints = 5;
let p1SelectedParty = 'IND';
let p1SelectedFaction = 'Ciudadano Independiente';
let p1Attributes = { oratory: 60, charisma: 55, negotiation: 50, management: 55 };
let p2SelectedPolicies = ['p1', 'p4', 'p9'];

window.adjustAttribute = function(attrKey, delta) {
  if (delta > 0 && p1AvailablePoints < delta) return;
  if (delta < 0 && p1Attributes[attrKey] <= 30) return;
  if (delta > 0 && p1Attributes[attrKey] >= 95) return;

  p1Attributes[attrKey] += delta;
  p1AvailablePoints -= delta;

  document.getElementById(`attr-${attrKey}-val`).textContent = p1Attributes[attrKey];
  document.getElementById(`attr-${attrKey}-bar`).style.width = `${p1Attributes[attrKey]}%`;
  document.getElementById('p1-points-pool-disp').textContent = `Puntos Disponibles: ${p1AvailablePoints}`;
};

window.p1HandleAgeChange = function(val) {
  const age = parseInt(val);
  document.getElementById('p1-age-disp').textContent = `${age} años`;
  const box = document.getElementById('p1-age-status-box');

  if (age < 21) {
    box.textContent = 'Habilitado para: Concejal Municipal y Alcalde/Alcaldesa (18+ años)';
    box.className = 'mt-1.5 text-[11px] font-mono text-amber-900 bg-amber-50 p-2 rounded border border-amber-200 leading-tight';
  } else if (age < 35) {
    box.textContent = 'Habilitado para: Concejal, Alcalde, Diputado y Gobernador Regional (21+ años)';
    box.className = 'mt-1.5 text-[11px] font-mono text-blue-900 bg-blue-50 p-2 rounded border border-blue-200 leading-tight';
  } else {
    box.textContent = 'Habilitado para TODOS los cargos: Incluye Senador y Presidente de la República (35+ años)';
    box.className = 'mt-1.5 text-[11px] font-mono text-emerald-900 bg-emerald-50 p-2 rounded border border-emerald-200 leading-tight';
  }

  window.p1UpdateProfessions(age);
};

window.p1UpdateProfessions = function(age) {
  const sel = document.getElementById('p1-profession');
  sel.innerHTML = '';
  const list = age < 23
    ? ['Estudiante Universitario', 'Líder Estudiantil', 'Dirigente Vecinal', 'Emprendedor Joven', 'Activista Social', 'Feriante']
    : ['Abogado/a Constitucionalista', 'Ingeniero/a Comercial', 'Economista', 'Médico/a Salubrista', 'Profesor/a', 'Administrador/a Público/a', 'Periodista'];

  list.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    sel.appendChild(opt);
  });
};

window.p1RandomName = function() {
  const f = ['Gabriel', 'Tomás', 'Claudio', 'Rodrigo', 'Sebastián', 'Camila', 'Evelyn', 'Carolina', 'Macarena', 'Diego', 'Matías'];
  const l = ['Silva', 'Vodanovic', 'Orrego', 'Vallejo', 'Matthei', 'Boric', 'Desbordes', 'Kast', 'Ripamonti', 'Jackson', 'Soto'];
  document.getElementById('p1-name').value = `${f[Math.floor(Math.random() * f.length)]} ${l[Math.floor(Math.random() * l.length)]}`;
};

window.p1RenderParties = function() {
  const grid = document.getElementById('p1-parties-grid');
  grid.innerHTML = '';

  CHILE_PARTIES.forEach(p => {
    const isSel = (p1SelectedParty === p.id);
    const c = document.createElement('div');
    c.className = `p-2.5 border-2 rounded text-xs cursor-pointer transition select-none flex flex-col justify-between ${isSel ? 'border-blue-700 bg-blue-50/80 font-bold shadow-xs' : 'border-stone-300 bg-white hover:border-stone-400'}`;
    c.innerHTML = `
      <div>
        <div class="flex items-center gap-1.5 mb-1">
          <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${p.color};"></span>
          <span class="font-extrabold text-slate-900">${p.id}</span>
        </div>
        <div class="text-[11px] text-stone-600 leading-snug">${p.name}</div>
      </div>
      <div class="mt-2 text-[10px] font-mono text-stone-500">${p.bloc}</div>
    `;
    c.onclick = () => {
      p1SelectedParty = p.id;
      p1SelectedFaction = null;
      document.getElementById('p1-selected-party-badge').textContent = `${p.id} - ${p.name}`;
      window.p1RenderParties();
      window.p1RenderFactions(p);
    };
    grid.appendChild(c);
  });
};

window.p1RenderFactions = function(party) {
  const grid = document.getElementById('p1-factions-grid');
  grid.innerHTML = '';
  const factions = party.factions || ['Sensibilidad Base'];
  if (!p1SelectedFaction || !factions.includes(p1SelectedFaction)) {
    p1SelectedFaction = factions[0];
  }
  document.getElementById('p1-faction-badge').textContent = p1SelectedFaction;

  factions.forEach(f => {
    const isSel = (p1SelectedFaction === f);
    const c = document.createElement('div');
    c.className = `p-2.5 border-2 rounded cursor-pointer text-xs transition select-none ${isSel ? 'bg-blue-100 border-blue-600 font-bold text-blue-950 shadow-xs ring-1 ring-blue-500' : 'bg-white border-stone-300 hover:border-stone-400 hover:bg-stone-50'}`;
    c.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-base">${isSel ? '✅' : '🚩'}</span>
        <div>
          <strong class="block text-slate-900">${f}</strong>
          <span class="text-[10px] text-stone-500 font-normal">Corriente interna en ${party.id}</span>
        </div>
      </div>
    `;
    c.onclick = () => {
      p1SelectedFaction = f;
      document.getElementById('p1-faction-badge').textContent = f;
      window.p1RenderFactions(party);
    };
    grid.appendChild(c);
  });
};

// Navegación entre Página 1 y Página 2
window.goToPage2Territory = function() {
  const name = document.getElementById('p1-name').value.trim();
  const alertEl = document.getElementById('p1-validation-alert');
  if (name.length < 3) {
    alertEl.textContent = '⚠️ Debes ingresar un nombre y apellido de al menos 3 caracteres.';
    alertEl.classList.remove('hidden');
    return;
  }
  alertEl.classList.add('hidden');

  // Inicializar cascada de la página 2
  window.p2InitTerritoryCascades();
  window.p2RenderPoliciesCatalog();

  document.getElementById('screen-page-1-identity').classList.add('hidden');
  document.getElementById('screen-page-2-territory').classList.remove('hidden');
};

window.backToPage1Identity = function() {
  document.getElementById('screen-page-2-territory').classList.add('hidden');
  document.getElementById('screen-page-1-identity').classList.remove('hidden');
};

window.p2HandleYearChange = function(yearVal) {
  const descBox = document.getElementById('p2-year-description');
  if (!descBox) return;
  if (yearVal === '2024') {
    descBox.innerHTML = '📅 <strong>Año 2024:</strong> Elección de concejales en la semana 44. Puedes inscribirte desde la semana 8.';
    descBox.className = 'p-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded text-[11px] leading-snug';
  } else if (yearVal === '2025') {
    descBox.innerHTML = '📅 <strong>Año 2025:</strong> Inicio entre ciclos municipales. Próxima elección jugable en 2028.';
    descBox.className = 'p-2.5 bg-purple-50 border border-purple-200 text-purple-900 rounded text-[11px] leading-snug';
  } else {
    descBox.innerHTML = '📅 <strong>Año 2026:</strong> Inicio entre ciclos municipales. Próxima elección jugable en 2028.';
    descBox.className = 'p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded text-[11px] leading-snug';
  }
};

window.p2InitTerritoryCascades = function() {
  const regSelect = document.getElementById('p2-region');
  regSelect.innerHTML = '<option value="" disabled selected>-- Selecciona una Región --</option>';

  for (const regKey in CHILE_GEO) {
    const opt = document.createElement('option');
    opt.value = regKey;
    opt.textContent = CHILE_GEO[regKey].name;
    regSelect.appendChild(opt);
  }

  const distSelect = document.getElementById('p2-district');
  distSelect.innerHTML = '<option value="" disabled selected>-- Primero selecciona una región --</option>';
  distSelect.disabled = true;
  distSelect.className = 'w-full p-2 border border-stone-300 bg-stone-100 rounded text-xs font-bold text-slate-800 cursor-pointer';

  const commSelect = document.getElementById('p2-commune');
  commSelect.innerHTML = '<option value="" disabled selected>-- Primero selecciona un distrito --</option>';
  commSelect.disabled = true;
  commSelect.className = 'w-full p-2 border border-stone-300 bg-stone-100 rounded text-xs font-bold text-slate-800 cursor-pointer';

  document.getElementById('p2-preview-domicile').innerHTML = '<span class="text-amber-800 italic">Sin territorio asignado (Elige Región, Distrito y Comuna)</span>';
};

window.p2HandleRegionChange = function(regKey) {
  const distSelect = document.getElementById('p2-district');
  distSelect.innerHTML = '<option value="" disabled selected>-- Selecciona un Distrito --</option>';
  distSelect.disabled = false;
  distSelect.className = 'w-full p-2 border border-stone-400 bg-white rounded text-xs font-bold text-slate-800 cursor-pointer';

  const districts = CHILE_GEO[regKey]?.districts || {};
  for (const distKey in districts) {
    const opt = document.createElement('option');
    opt.value = distKey;
    opt.textContent = `${distKey} (${districts[distKey].seats} Escaños)`;
    distSelect.appendChild(opt);
  }

  const commSelect = document.getElementById('p2-commune');
  commSelect.innerHTML = '<option value="" disabled selected>-- Primero selecciona un distrito --</option>';
  commSelect.disabled = true;
  commSelect.className = 'w-full p-2 border border-stone-300 bg-stone-100 rounded text-xs font-bold text-slate-800 cursor-pointer';

  document.getElementById('p2-preview-domicile').innerHTML = `<span class="text-stone-700">${CHILE_GEO[regKey]?.name} (Selecciona Distrito y Comuna)</span>`;
};

window.p2HandleDistrictChange = function(distKey) {
  const regKey = document.getElementById('p2-region').value;
  const commSelect = document.getElementById('p2-commune');
  commSelect.innerHTML = '<option value="" disabled selected>-- Selecciona una Comuna --</option>';
  commSelect.disabled = false;
  commSelect.className = 'w-full p-2 border border-stone-400 bg-white rounded text-xs font-bold text-slate-800 cursor-pointer';

  const cleanDistKey = distKey.split(' (')[0];
  const communes = CHILE_GEO[regKey]?.districts[cleanDistKey]?.communes || [];

  communes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    commSelect.appendChild(opt);
  });

  document.getElementById('p2-preview-domicile').innerHTML = `<span class="text-stone-700">${cleanDistKey} - Selecciona tu comuna de residencia</span>`;
};

window.p2HandleCommuneChange = function(commName) {
  const regKey = document.getElementById('p2-region').value;
  const distKey = document.getElementById('p2-district').value.split(' (')[0];
  document.getElementById('p2-preview-domicile').innerHTML = `<strong class="text-blue-900">${commName}</strong> (${distKey}, ${CHILE_GEO[regKey]?.name})`;
};

window.p2RenderPoliciesCatalog = function() {
  const cat = document.getElementById('p2-policies-catalog');
  cat.innerHTML = '';

  POLICIES_CATALOG.forEach(p => {
    const isChecked = p2SelectedPolicies.includes(p.id);
    const row = document.createElement('label');
    row.className = `p-2 border rounded flex items-center justify-between text-xs cursor-pointer ${isChecked ? 'bg-blue-50 border-blue-400 font-bold' : 'bg-white border-stone-200'}`;
    row.innerHTML = `
      <div class="flex items-center gap-2">
        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.p2TogglePolicy('${p.id}')" class="cursor-pointer" />
        <span>${p.name}</span>
      </div>
      <span class="text-[10px] font-mono text-stone-500">${p.issue}</span>
    `;
    cat.appendChild(row);
  });

  document.getElementById('p2-policies-count-badge').textContent = `${p2SelectedPolicies.length} / 3 Seleccionadas`;
};

window.p2TogglePolicy = function(pid) {
  if (p2SelectedPolicies.includes(pid)) {
    p2SelectedPolicies = p2SelectedPolicies.filter(id => id !== pid);
  } else {
    if (p2SelectedPolicies.length >= 3) {
      alert('Solo puedes seleccionar exactamente 3 políticas prioritarias.');
      window.p2RenderPoliciesCatalog();
      return;
    }
    p2SelectedPolicies.push(pid);
  }
  window.p2RenderPoliciesCatalog();
};

window.finishFullCharacterCreation = function() {
  const alertEl = document.getElementById('p2-validation-alert');

  const reg = document.getElementById('p2-region').value;
  const distVal = document.getElementById('p2-district').value;
  const comm = document.getElementById('p2-commune').value;

  if (!reg || !distVal || !comm) {
    alertEl.textContent = '⚠️ Debes seleccionar libremente tu Región, Distrito y Comuna de residencia antes de iniciar.';
    alertEl.classList.remove('hidden');
    return;
  }

  if (p2SelectedPolicies.length !== 3) {
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

  if ((officeVal === 'diputado' || officeVal === 'gobernador') && age < 21) {
    alertEl.textContent = '⚠️ Para iniciar como Diputado o Gobernador debes tener 21 años o más.';
    alertEl.classList.remove('hidden');
    return;
  }
  if ((officeVal === 'senador' || officeVal === 'presidente') && age < 35) {
    alertEl.textContent = '⚠️ Para iniciar como Senador o Presidente debes tener 35 años o más.';
    alertEl.classList.remove('hidden');
    return;
  }

  const dist = distVal.split(' (')[0];
  const name = document.getElementById('p1-name').value.trim();
  const profession = document.getElementById('p1-profession').value;
  const startYear = parseInt(document.getElementById('p2-start-year')?.value || '2024');

  const officeLabels = {
    none: 'Ciudadano sin Cargo',
    concejal: `Concejal de ${comm}`,
    alcalde: `Alcalde de ${comm}`,
    diputado: `Diputado (${dist})`,
    gobernador: `Gobernador Regional`,
    senador: 'Senador de la República',
    presidente: 'Presidente de la República'
  };

  const partyObj = CHILE_PARTIES.find(p => p.id === p1SelectedParty) || { name: 'Independiente' };

  GAME_STATE = initialState();
  GAME_STATE.year = startYear;
  GAME_STATE.week = 1;
  GAME_STATE.month = 'Enero';
  GAME_STATE.volunteers = 120;
  GAME_STATE.player.name = name;
  GAME_STATE.player.age = age;
  GAME_STATE.player.profession = profession;
  GAME_STATE.player.region = reg;
  GAME_STATE.player.district = dist;
  GAME_STATE.player.commune = comm;
  GAME_STATE.player.partyId = p1SelectedParty;
  GAME_STATE.player.partyName = partyObj.name;
  GAME_STATE.player.faction = p1SelectedFaction;
  GAME_STATE.player.attributes = { ...p1Attributes };
  GAME_STATE.player.currentOffice = officeLabels[officeVal] || 'Ciudadano sin Cargo';
  GAME_STATE.player.corePolicies = [...p2SelectedPolicies];
  GAME_STATE.player.hiredStaffIds = [];

  // Ocultar pantallas de creación y abrir tablero
  document.getElementById('screen-page-1-identity').classList.add('hidden');
  document.getElementById('screen-page-2-territory').classList.add('hidden');

  window.showToast('¡Bienvenido al Juego!', `Inicias tu carrera en ${comm} (${dist}) en el año ${startYear}.`, 'success');
  window.renderAll();
};

let d3SimShares = { ofic: 38, cv: 32, rep: 18, cent: 12 };

window.resetDHondtSliders = function() {
  d3SimShares = { ofic: 38, cv: 32, rep: 18, cent: 12 };
  document.getElementById('dh-slider-ofic').value = 38;
  document.getElementById('dh-slider-cv').value = 32;
  document.getElementById('dh-slider-rep').value = 18;
  document.getElementById('dh-slider-cent').value = 12;
  window.updateDHondtSimulation();
};

window.updateDHondtSimulation = function() {
  d3SimShares.ofic = parseInt(document.getElementById('dh-slider-ofic').value);
  d3SimShares.cv = parseInt(document.getElementById('dh-slider-cv').value);
  d3SimShares.rep = parseInt(document.getElementById('dh-slider-rep').value);
  d3SimShares.cent = parseInt(document.getElementById('dh-slider-cent').value);

  document.getElementById('dh-pct-ofic').textContent = `${d3SimShares.ofic}%`;
  document.getElementById('dh-pct-cv').textContent = `${d3SimShares.cv}%`;
  document.getElementById('dh-pct-rep').textContent = `${d3SimShares.rep}%`;
  document.getElementById('dh-pct-cent').textContent = `${d3SimShares.cent}%`;

  window.renderDHondtD3Visualization();
};

window.renderDHondtD3Visualization = function() {
  const container = document.getElementById('d3-dhondt-hemicircle');
  if (!container) return;
  container.innerHTML = '';

  const distKey = GAME_STATE.player.district || 'Distrito 8';
  const regKey = GAME_STATE.player.region || 'rm';
  const totalSeats = CHILE_GEO[regKey]?.districts[distKey]?.seats || 8;

  document.getElementById('dhondt-sim-district-header').textContent =
    `Simulador D'Hondt con D3.js: Distribución de Escaños en ${distKey} (${totalSeats} Escaños en Disputa)`;

  // Total votos del distrito (base 300.000)
  const totalVotes = 300000;
  const sumShares = d3SimShares.ofic + d3SimShares.cv + d3SimShares.rep + d3SimShares.cent;

  if (!sumShares) {
    for (const id of Object.keys(d3SimShares)) document.getElementById(`dh-seats-${id}`).textContent = '0 Escaños';
    document.getElementById('dhondt-cifra-repartidora-disp').textContent = 'Ingresa votos para repartir escaños.';
    return;
  }
  if (!window.d3) return;
  const lists = PACTS.map(list => ({
    ...list, votes: Math.round(totalVotes * d3SimShares[list.id] / sumShares),
  }));

  const winningQuotients = allocateSeats(lists, totalSeats);
  const lastWinning = winningQuotients.at(-1);
  lists.forEach(list => {
    document.getElementById(`dh-seats-${list.id}`).textContent = `${list.seats} Escaños`;
  });

  document.getElementById('dhondt-cifra-repartidora-disp').textContent =
    `Cifra Repartidora de Corte: ${lastWinning ? lastWinning.quotient.toLocaleString('es-CL') : '0'} Votos`;

  // Renderizado Hemiciclo D3.js
  const width = 280;
  const height = 150;
  const radius = 110;

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('class', 'w-full h-full select-none');

  const g = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height - 15})`);

  // Generar coordenadas semicirculares para los escaños ganados
  const seatDots = [];
  winningQuotients.sort((a,b) => {
    const order = { ofic: 1, cent: 2, cv: 3, rep: 4 };
    return order[a.listId] - order[b.listId];
  });

  const step = Math.PI / Math.max(1, totalSeats - 1);
  winningQuotients.forEach((wq, idx) => {
    const theta = Math.PI - (idx * step);
    const x = - (radius * Math.cos(theta));
    const y = - (radius * Math.sin(theta));
    seatDots.push({ x, y, color: wq.color, listId: wq.listId });
  });

  // Dibujar los escaños con animación D3
  g.selectAll('circle')
    .data(seatDots)
    .enter()
    .append('circle')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', 0)
    .attr('fill', d => d.color)
    .attr('stroke', '#FFFFFF')
    .attr('stroke-width', 2)
    .transition()
    .duration(300)
    .attr('r', 11);
};

let currentStaffRoleFilter = 'all';

window.filterStaffRole = function(role) {
  currentStaffRoleFilter = role;
  document.querySelectorAll('.staff-role-filter').forEach(btn => {
    btn.className = 'staff-role-filter px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer';
  });
  const activeBtn = document.getElementById(`staff-tab-${role}`);
  if (activeBtn) {
    activeBtn.className = 'staff-role-filter px-2.5 py-1 rounded bg-[#0047AB] text-white font-bold text-xs cursor-pointer';
  }
  window.renderStaffPanel();
};

function staffTotals() {
  const totals = { salaryWeekly: 0, bonusHours: 0, bonusRecogWeekly: 0, bonusVolunteersWeekly: 0, bonusPPMonthly: 0 };
  for (const staff of STAFF_CATALOG) {
    if (GAME_STATE.player.hiredStaffIds.includes(staff.id)) {
      for (const key of Object.keys(totals)) totals[key] += staff[key] || 0;
    }
  }
  return totals;
}

function updateStaffHours() {
  const player = GAME_STATE.player;
  player.maxHours = 60 + staffTotals().bonusHours;
  player.hours = Math.min(player.hours, player.maxHours);
}

window.hireStaff = function(staffId) {
  const staff = STAFF_CATALOG.find(s => s.id === staffId);
  if (!staff) return;

  if (GAME_STATE.player.funds < staff.salaryWeekly) {
    window.showToast('Fondos Insuficientes', `Necesitas al menos $${staff.salaryWeekly.toLocaleString('es-CL')} CLP para financiar la primera semana de sueldo.`, 'error');
    return;
  }

  // Si ya hay alguien contratado en este mismo rol, se reemplaza
  const existingInRole = STAFF_CATALOG.find(s => s.role === staff.role && GAME_STATE.player.hiredStaffIds.includes(s.id));
  if (existingInRole && existingInRole.id !== staff.id) {
    GAME_STATE.player.hiredStaffIds = GAME_STATE.player.hiredStaffIds.filter(id => id !== existingInRole.id);
    window.showToast('Reemplazo de Asesor', `Has reemplazado a ${existingInRole.name} por ${staff.name} en el cargo de ${staff.roleLabel}.`, 'info');
  }

  if (!GAME_STATE.player.hiredStaffIds.includes(staff.id)) {
    GAME_STATE.player.hiredStaffIds.push(staff.id);
  }

  // Recalcular horas máximas
  updateStaffHours();

  window.showToast('¡Asesor Incorporado!', `${staff.name} se ha sumado a tu comando como ${staff.roleLabel}.`, 'success');
  renderPlayerStats();
  window.renderStaffPanel();
};

window.fireStaff = function(staffId) {
  const staff = STAFF_CATALOG.find(s => s.id === staffId);
  if (!staff) return;

  GAME_STATE.player.hiredStaffIds = (GAME_STATE.player.hiredStaffIds || []).filter(id => id !== staffId);

  // Recalcular horas máximas
  updateStaffHours();

  window.showToast('Contrato Concluido', `Has desvinculado a ${staff.name} del comando de campaña.`, 'info');
  renderPlayerStats();
  window.renderStaffPanel();
};

window.renderStaffPanel = function() {
  const container = document.getElementById('staff-hire-container');
  if (!container) return;
  container.innerHTML = '';

  const hiredIds = GAME_STATE.player.hiredStaffIds || [];

  // Actualizar métricas del dashboard superior
  const { salaryWeekly: totalPayroll, bonusHours: totalBonusHours, bonusRecogWeekly: totalBonusRecog, bonusVolunteersWeekly: totalBonusVolunteers } = staffTotals();

  const badgeEl = document.getElementById('staff-summary-badge');
  if (badgeEl) badgeEl.textContent = `${hiredIds.length} / 4 Cargos Cubiertos`;

  const pEl = document.getElementById('staff-metric-payroll');
  if (pEl) pEl.textContent = `$${totalPayroll.toLocaleString('es-CL')} CLP / sem`;

  const hEl = document.getElementById('staff-metric-hours');
  if (hEl) hEl.textContent = `+${totalBonusHours} hrs / sem (${60 + totalBonusHours} hrs tot)`;

  const rEl = document.getElementById('staff-metric-recog');
  if (rEl) rEl.textContent = `+${totalBonusRecog.toFixed(1)}% / sem`;

  const vEl = document.getElementById('staff-metric-volunteers');
  if (vEl) vEl.textContent = `+${totalBonusVolunteers} brigadistas / sem`;

  // Filtrar catálogo según la categoría seleccionada
  const visibleStaff = (currentStaffRoleFilter === 'all')
    ? STAFF_CATALOG
    : STAFF_CATALOG.filter(s => s.role === currentStaffRoleFilter);

  visibleStaff.forEach(staff => {
    const isHired = hiredIds.includes(staff.id);
    const card = document.createElement('div');
    card.className = `p-3.5 border-2 rounded shadow-2xs flex flex-col justify-between transition ${isHired ? 'bg-emerald-50/70 border-emerald-500' : 'bg-white border-stone-300 hover:border-stone-400'}`;

    card.innerHTML = `
      <div class="space-y-2">
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${staff.avatar}</span>
            <div>
              <h4 class="font-extrabold text-xs text-slate-900">${staff.name}</h4>
              <span class="text-[10px] font-mono font-bold text-stone-600 block">${staff.roleIcon} ${staff.roleLabel}</span>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isHired ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700 border border-stone-300'}">
            ${isHired ? '✓ CONTRATADO' : 'DISPONIBLE'}
          </span>
        </div>

        <div>
          <strong class="text-[11px] text-blue-950 block">${staff.title}</strong>
          <p class="text-[11px] text-stone-600 leading-snug">${staff.exp}</p>
        </div>

        <div class="p-2 bg-stone-50 rounded border border-stone-200 text-xs font-mono space-y-1">
          <div class="flex justify-between">
            <span class="text-stone-500 font-sans text-[11px]">Sueldo Semanal:</span>
            <strong class="text-slate-900 font-mono-num font-bold">$${staff.salaryWeekly.toLocaleString('es-CL')} CLP</strong>
          </div>
          <div class="text-[11px] font-sans font-bold text-emerald-800">
            🎁 Bonos: <span class="font-normal font-sans text-slate-800">${staff.perkDesc}</span>
          </div>
        </div>
      </div>

      <div class="pt-3 border-t mt-3 flex justify-end">
        ${isHired ? `
          <button onclick="window.fireStaff('${staff.id}')" class="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs rounded cursor-pointer transition">
            ✕ Desvincular del Comando
          </button>
        ` : `
          <button onclick="window.hireStaff('${staff.id}')" class="w-full py-1.5 bg-[#0047AB] hover:bg-[#003399] active:bg-[#002277] text-white font-bold text-xs rounded shadow-2xs cursor-pointer transition flex items-center justify-center gap-1.5">
            <span>Contratar por $${staff.salaryWeekly.toLocaleString('es-CL')}/sem</span>
          </button>
        `}
      </div>
    `;

    container.appendChild(card);
  });
};

window.advanceTurn = function(weeksToAdvance = 1) {
  const count = [1, 4].includes(weeksToAdvance) ? weeksToAdvance : 1;
  for (let w = 0; w < count; w++) {
    GAME_STATE.week += 1;

    if (GAME_STATE.week > 52) {
      GAME_STATE.week = 1;
      GAME_STATE.year += 1;
      GAME_STATE.player.age += 1;
      window.showToast('¡Año Nuevo Constitucional!', `Comienza el año ${GAME_STATE.year}. Tienes ${GAME_STATE.player.age} años cumplidos.`, 'success');
    }

    const player = GAME_STATE.player;
    const payroll = staffTotals().salaryWeekly;
    if (payroll > player.funds) {
      player.hiredStaffIds = [];
      window.showToast('Equipo desvinculado', 'El presupuesto no alcanza para pagar la planilla.', 'warning');
    } else {
      player.funds -= payroll;
    }
    const bonuses = staffTotals();
    player.hours = player.maxHours = 60 + bonuses.bonusHours;
    player.nameRecognition = Math.min(100, player.nameRecognition + bonuses.bonusRecogWeekly);
    GAME_STATE.volunteers += bonuses.bonusVolunteersWeekly;
    if (GAME_STATE.week % 4 === 0) player.politicalPoints += bonuses.bonusPPMonthly;

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mIdx = Math.min(11, Math.floor((GAME_STATE.week - 1) / 4.33));
    GAME_STATE.month = months[mIdx];
    if (GAME_STATE.year % 4 === 0 && [8, 44].includes(GAME_STATE.week)) {
      if (GAME_STATE.week === 44) resolveLocalElection();
      window.switchMainView('view-elections');
      break;
    }
  }

  renderPlayerStats();
  window.renderStaffPanel();
  renderLocalElection();
};

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

  const volDisp = document.getElementById('volunteers-count-disp');
  if (volDisp) volDisp.textContent = (GAME_STATE.volunteers || 120).toLocaleString('es-CL');

  const badgeEl = document.getElementById('clock-election-badge');
  if (badgeEl) {
    const { year, week } = GAME_STATE;
    const nextYear = year + ((4 - year % 4) % 4 || (week >= 44 ? 4 : 0));
    badgeEl.textContent = `Concejales · semana 44, ${nextYear}`;
  }

  const domDisp = document.getElementById('profile-domicile-disp');
  if (domDisp) {
    domDisp.textContent = `Domicilio Electoral: ${GAME_STATE.player.commune || 'Sin definir'} (${GAME_STATE.player.district || 'Sin distrito'})`;
  }

  const player = GAME_STATE.player;
  element('stat-approval').textContent = element('office-approval-disp').textContent = `${player.approval.toFixed(1)}%`;
  element('office-title-disp').textContent = player.currentOffice;
  element('office-status-subtitle').textContent = player.currentOffice.startsWith('Concejal de ')
    ? 'Representación y fiscalización municipal' : '';
}

window.renderAll = function() {
  renderPlayerStats();
  window.renderStaffPanel();
  window.renderContiguousMap();
  window.renderPublicOpinionTable();
  window.renderNewsFeed();
  window.renderCongressHemiciclo();
  window.renderLegislativeHistory();
  window.renderPoliticiansDirectory();
  window.renderElectoralPactsCatalog();
  window.renderDHondtD3Visualization();
  window.renderProfileAttributes();
  renderLocalElection();
};

window.renderProfileAttributes = function() {
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

window.renderContiguousMap = function() {
  const svg = document.getElementById('svg-contiguous-map');
  if (!svg) return;
  svg.innerHTML = '';

  const commune = GAME_STATE.player.commune;
  const district = GAME_STATE.player.district;
  const regName = CHILE_GEO[GAME_STATE.player.region]?.name || 'REGIÓN METROPOLITANA';

  document.getElementById('map-territory-title').textContent = `RESUMEN DE ${commune.toUpperCase()} (${district.toUpperCase()} - ${regName.toUpperCase()})`;

  const sectors = [
    { name: 'Centro Cívico y Plaza', path: 'M 200,100 L 280,100 L 290,150 L 210,150 Z', color: '#CBD5E1', pop: 48000 },
    { name: 'Norte Industrial', path: 'M 200,40 L 280,40 L 280,100 L 200,100 Z', color: '#E2E8F0', pop: 35000 },
    { name: 'Avenida Principal Poniente', path: 'M 120,80 L 200,100 L 210,150 L 130,140 Z', color: '#CBD5E1', pop: 52000 },
    { name: 'Sector Histórico y Templo', path: 'M 210,150 L 290,150 L 280,210 L 200,200 Z', color: '#94A3B8', pop: 44000 },
    { name: 'Oriente Residencial', path: 'M 280,100 L 360,90 L 370,160 L 290,150 Z', color: '#E2E8F0', pop: 61000 },
    { name: 'Sur Cordillera / Agrícola', path: 'M 200,200 L 280,210 L 270,270 L 190,260 Z', color: '#CBD5E1', pop: 38000 },
    { name: 'Barrio Estación y Comercio', path: 'M 130,140 L 210,150 L 200,200 L 120,190 Z', color: '#E2E8F0', pop: 49000 },
    { name: 'Sector Satélite Sur', path: 'M 120,190 L 200,200 L 190,260 L 110,250 Z', color: '#94A3B8', pop: 42000 }
  ];

  sectors.forEach(s => {
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    poly.setAttribute('d', s.path);
    poly.setAttribute('fill', s.color);
    poly.setAttribute('stroke', '#475569');
    poly.setAttribute('stroke-width', '1.5');
    poly.setAttribute('class', 'hover:fill-blue-500 transition-colors duration-150');

    poly.onmouseover = () => {
      const tip = document.getElementById('map-hover-tooltip');
      tip.innerHTML = `<strong>${s.name}</strong><br>Población: ${s.pop.toLocaleString('es-CL')} electores`;
      tip.classList.remove('hidden');
    };
    poly.onmouseout = () => {
      document.getElementById('map-hover-tooltip').classList.add('hidden');
    };
    poly.onclick = () => {
      window.showToast('Barrio Seleccionado', `Has enfocado el despliegue territorial en ${s.name} (${commune}).`, 'info');
    };

    svg.appendChild(poly);
  });
};

window.renderPublicOpinionTable = function() {
  const tbody = document.getElementById('public-opinion-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const issues = [
    { name: 'Seguridad Ciudadana & Narcotráfico', imp: 88, val: 6.5 },
    { name: 'Economía, Crecimiento y PyMEs', imp: 75, val: 4.0 },
    { name: 'Salud Pública y Listas de Espera', imp: 82, val: 5.2 },
    { name: 'Reforma de Pensiones (AFP)', imp: 78, val: -1.5 },
    { name: 'Control Migratorio y Fronteras', imp: 80, val: 7.0 }
  ];

  issues.forEach(i => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-stone-50 text-xs';
    tr.innerHTML = `
      <td class="py-1 px-2 font-bold text-slate-900">${i.name}</td>
      <td class="py-1 px-2 text-center text-stone-600">${i.imp}%</td>
      <td class="py-1 px-2">
        <div class="w-full bg-stone-200 h-2.5 rounded overflow-hidden">
          <div class="h-full ${i.val >= 0 ? 'bg-blue-600' : 'bg-rose-600'}" style="width: ${Math.min(100, Math.abs(i.val) * 10)}%;"></div>
        </div>
      </td>
      <td class="py-1 px-2 text-right font-mono font-bold ${i.val >= 0 ? 'text-blue-800' : 'text-rose-700'}">
        ${i.val > 0 ? '+' : ''}${i.val.toFixed(1)}%
      </td>
    `;
    tbody.appendChild(tr);
  });
};

window.renderNewsFeed = function() {
  const cont = document.getElementById('news-feed-container');
  if (!cont) return;
  cont.innerHTML = '';

  GAME_STATE.newsFeed.forEach(n => {
    const item = document.createElement('div');
    item.className = 'p-2.5 border border-stone-300 bg-white rounded text-xs space-y-0.5';
    item.innerHTML = `
      <div class="flex justify-between text-[10px] text-stone-500 font-mono">
        <span>${escapeHtml(n.source)}</span>
        <span>${escapeHtml(n.date)}</span>
      </div>
      <div class="font-bold text-slate-900 text-xs">${escapeHtml(n.title)}</div>
    `;
    cont.appendChild(item);
  });
};

window.setCongressChamber = function(chamber) {
  GAME_STATE.congress.activeChamber = chamber;
  for (const [id, key] of [['dip', 'diputados'], ['sen', 'senado']]) {
    const button = element(`btn-cong-camara-${id}`);
    button.classList.toggle('bg-[#0047AB]', key === chamber);
    button.classList.toggle('text-white', key === chamber);
  }
  window.renderCongressHemiciclo();
};

window.renderCongressHemiciclo = function() {
  const svg = document.getElementById('svg-congress-hemiciclo');
  if (!svg) return;
  svg.innerHTML = '';

  const isDip = (GAME_STATE.congress.activeChamber === 'diputados');
  const total = isDip ? 155 : 50;
  const cx = 320, cy = 280;
  const rows = isDip ? [
    { r: 130, count: 32 }, { r: 165, count: 38 }, { r: 200, count: 41 }, { r: 235, count: 44 }
  ] : [
    { r: 140, count: 14 }, { r: 185, count: 17 }, { r: 230, count: 19 }
  ];

  let dotCoords = [];
  rows.forEach(row => {
    const step = Math.PI / (row.count - 1);
    for (let i = 0; i < row.count; i++) {
      const theta = Math.PI - (i * step);
      const x = cx - (row.r * Math.cos(theta));
      const y = cy - (row.r * Math.sin(theta));
      dotCoords.push({ x, y });
    }
  });

  dotCoords.sort((a,b) => a.x - b.x);

  dotCoords.forEach((c, idx) => {
    if (idx >= total) return;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', c.x);
    circle.setAttribute('cy', c.y);
    circle.setAttribute('r', isDip ? '5.5' : '8');

    let color = '#2563EB';
    if (idx < total * 0.42) color = '#DC2626';
    else if (idx < total * 0.54) color = '#F59E0B';
    else if (idx > total * 0.88) color = '#172554';

    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', '#FFFFFF');
    circle.setAttribute('stroke-width', '1');
    svg.appendChild(circle);
  });
};

window.renderLegislativeHistory = function() {
  const tbody = document.getElementById('legislative-history-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  GAME_STATE.legislativeHistory.forEach(l => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-stone-50 text-xs';
    tr.innerHTML = `
      <td class="py-2 px-3 font-bold text-blue-900">${escapeHtml(l.number)}: ${escapeHtml(l.title)}</td>
      <td class="py-2 px-2 text-center text-stone-600 font-mono">${escapeHtml(l.date)}</td>
      <td class="py-2 px-2 text-center font-mono">${escapeHtml(l.type)}</td>
      <td class="py-2 px-2 text-center font-bold text-slate-800 font-mono">${escapeHtml(l.quorum)}</td>
      <td class="py-2 px-2 text-center font-mono text-[11px]"><span class="text-emerald-700">${escapeHtml(l.yes)} Sí</span> / <span class="text-rose-700">${escapeHtml(l.no)} No</span></td>
      <td class="py-2 px-3 text-stone-700 text-[11px]">${escapeHtml(l.impact)}</td>
      <td class="py-2 px-2 text-center"><span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">VIGENTE</span></td>
    `;
    tbody.appendChild(tr);
  });
};

window.renderPoliticiansDirectory = function() {
  const tbody = document.getElementById('politicians-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const pols = [
    { name: 'Gabriel Boric Font', party: 'FA', office: 'Presidente de la República', age: 38, econ: '-60 / -40', rel: 50, app: 31 },
    { name: 'Camila Vallejo Dowling', party: 'PC', office: 'Ministra Vocera', age: 36, econ: '-80 / -50', rel: 45, app: 42 },
    { name: 'Tomás Vodanovic Escudero', party: 'FA', office: 'Alcalde de Maipú', age: 33, econ: '-40 / +10', rel: 70, app: 58 },
    { name: 'Evelyn Matthei Fornet', party: 'UDI', office: 'Alcaldesa de Providencia', age: 70, econ: '+60 / +50', rel: 40, app: 61 },
    { name: 'José Antonio Kast Rist', party: 'PREP', office: 'Líder Opositor', age: 58, econ: '+85 / +80', rel: 30, app: 45 },
    { name: 'Mario Desbordes Jiménez', party: 'RN', office: 'Alcalde de Santiago', age: 55, econ: '+40 / +65', rel: 60, app: 50 }
  ];

  pols.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-stone-50 text-xs';
    tr.innerHTML = `
      <td class="py-2 px-3 font-bold text-slate-900">${p.name}</td>
      <td class="py-2 px-2 font-mono font-bold">${p.party}</td>
      <td class="py-2 px-2 text-stone-700">${p.office}</td>
      <td class="py-2 px-2 text-center font-mono">${p.age}</td>
      <td class="py-2 px-2 text-center font-mono">${p.econ}</td>
      <td class="py-2 px-2 text-center font-mono font-bold text-blue-800">${p.rel}/100</td>
      <td class="py-2 px-2 text-center font-mono font-bold ${p.app >= 50 ? 'text-emerald-700' : 'text-slate-700'}">${p.app}%</td>
      <td class="py-2 px-2 text-right"><button class="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 border rounded font-bold text-[10px]" onclick="window.showToast('Ficha', '${p.name}: Liderazgo activo.', 'info')">Ver</button></td>
    `;
    tbody.appendChild(tr);
  });
};

window.renderElectoralPactsCatalog = function() {
  const grid = document.getElementById('electoral-pacts-grid');
  if (!grid) return;
  grid.innerHTML = '';

  PACTS.forEach(pact => {
    const p = { ...pact, id: `pact-${pact.id}` };
    const isAct = (GAME_STATE.player.activePactId === p.id);
    const card = document.createElement('div');
    card.className = `p-3 border-2 rounded flex flex-col justify-between ${isAct ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-stone-300'}`;
    card.innerHTML = `
      <div>
        <div class="flex justify-between items-start mb-1">
          <strong class="text-xs" style="color: ${p.color};">${p.name}</strong>
          <span class="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${isAct ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'}">${isAct ? 'PACTO ACTIVO' : 'DISPONIBLE'}</span>
        </div>
        <div class="text-[10px] font-mono text-stone-500">Partidos: <strong>${p.parties}</strong></div>
      </div>
      <button onclick="window.togglePactMembership('${p.id}')" class="mt-3 w-full py-1 text-xs font-bold rounded border ${isAct ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300' : 'bg-[#0047AB] hover:bg-[#003399] text-white border-[#002266]'}">
        ${isAct ? 'Renunciar al Pacto' : 'Unirse al Pacto Electoral'}
      </button>
    `;
    grid.appendChild(card);
  });
};

window.togglePactMembership = function(pactId) {
  if (GAME_STATE.player.activePactId === pactId) {
    GAME_STATE.player.activePactId = null;
    window.showToast('Pacto Disuelto', 'Ahora competirás como Independiente Fuera de Pacto.', 'info');
  } else {
    GAME_STATE.player.activePactId = pactId;
    window.showToast('¡Pacto Formalizado!', 'Has inscrito tu alianza electoral formal ante el SERVEL.', 'success');
  }
  window.renderElectoralPactsCatalog();
  window.updateDHondtSimulation();
};

window.switchMainView = function(viewId) {
  document.querySelectorAll('.folder-tab').forEach(t => t.classList.remove('active'));
  const btn = document.querySelector(`[data-view="${viewId}"]`);
  if (btn) btn.classList.add('active');

  document.querySelectorAll('.main-view').forEach(v => v.classList.add('hidden'));
  const viewEl = document.getElementById(viewId);
  if (viewEl) viewEl.classList.remove('hidden');

  document.getElementById('subtabs-campaign').classList.toggle('hidden', viewId !== 'view-campaign');
  document.getElementById('subtabs-congress').classList.toggle('hidden', viewId !== 'view-congress');
  document.getElementById('subtabs-politicians').classList.toggle('hidden', viewId !== 'view-politicians');
  document.getElementById('subtabs-office').classList.toggle('hidden', viewId !== 'view-office');

  if (viewId === 'view-politicians') {
    setTimeout(() => window.renderDHondtD3Visualization(), 50);
  }
};

window.switchSubpanel = function(view, key, button) {
  document.querySelectorAll(`#subtabs-${view} .subfolder-tab`).forEach(tab => {
    tab.classList.toggle('active', tab === button);
  });
  document.querySelectorAll(`[id^="${view}-panel-"]`).forEach(panel => {
    panel.classList.toggle('hidden', panel.id !== `${view}-panel-${key}`);
  });
  if (key === 'alliances') window.renderDHondtD3Visualization();
};

// Control del Menú Hamburguesa
window.toggleSessionMenu = function(e) {
  e.stopPropagation();
  document.getElementById('dropdown-session-menu').classList.toggle('hidden');
};

document.addEventListener('click', () => {
  document.getElementById('dropdown-session-menu')?.classList?.add('hidden');
});

window.openNewGameWizard = function() {
  document.getElementById('dropdown-session-menu').classList.add('hidden');
  p1AvailablePoints = 5;
  p1Attributes = { oratory: 60, charisma: 55, negotiation: 50, management: 55 };
  p1SelectedParty = 'IND';
  p1SelectedFaction = 'Ciudadano Independiente';
  p2SelectedPolicies = ['p1', 'p4', 'p9'];

  const nameInput = document.getElementById('p1-name');
  if (nameInput) nameInput.value = '';

  const ageInput = document.getElementById('p1-age');
  if (ageInput) ageInput.value = '25';

  const yearSelect = document.getElementById('p2-start-year');
  if (yearSelect) {
    yearSelect.value = '2024';
    window.p2HandleYearChange('2024');
  }

  window.p1RenderParties();
  window.p1RenderFactions(CHILE_PARTIES.find(p => p.id === 'IND'));
  window.p1HandleAgeChange(25);
  window.p2InitTerritoryCascades();

  document.getElementById('screen-page-1-identity').classList.remove('hidden');
  document.getElementById('screen-page-2-territory').classList.add('hidden');
};

const saveKey = 'tpp_chile_clean_save';
window.saveGameQuick = function() {
  try {
    localStorage.setItem(saveKey, JSON.stringify(GAME_STATE));
    window.showToast('Partida guardada', 'Progreso almacenado en este navegador.', 'success');
  } catch {
    window.showToast('Error', 'No se pudo guardar. Puedes exportar la partida.', 'error');
  }
};

function loadState(raw) {
  const value = JSON.parse(raw);
  const defaults = initialState();
  function restore(fallback, saved) {
    if (saved === undefined) return fallback;
    if (Array.isArray(fallback)) {
      if (!Array.isArray(saved)) throw new Error('Lista inválida');
      return saved;
    }
    if (fallback && typeof fallback === 'object') {
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Objeto inválido');
      return Object.fromEntries(Object.entries(fallback).map(([key, field]) => [key, restore(field, saved[key])]));
    }
    if (fallback !== null && (typeof saved !== typeof fallback || (typeof saved === 'number' && !Number.isFinite(saved)))) {
      throw new Error('Valor inválido');
    }
    return saved;
  }
  if (!value?.player || typeof value.player.name !== 'string' || !Number.isInteger(value.year) || !Number.isInteger(value.week) ||
      value.week < 1 || value.week > 52) throw new Error('Partida inválida');
  const next = restore(defaults, value);
  if (next.localElection !== null) {
    next.localElection = restore({ year: 0, pact: '', support: 0, result: '' }, next.localElection);
    if (!Number.isInteger(next.localElection.year) || next.localElection.support < 0) throw new Error('Elección inválida');
  }
  if (next.localManagement !== null && !['pending', 'agenda', 'audit'].includes(next.localManagement)) throw new Error('Gestión inválida');
  const previous = GAME_STATE;
  GAME_STATE = next;
  try {
    window.renderAll();
  } catch (error) {
    GAME_STATE = previous;
    window.renderAll();
    throw error;
  }
  for (const id of ['screen-page-1-identity', 'screen-page-2-territory']) {
    document.getElementById(id).classList.add('hidden');
  }
}

window.loadGameQuick = function(silent = false) {
  try {
    const raw = localStorage.getItem(saveKey);
    if (raw) loadState(raw);
    else if (!silent) window.showToast('Sin partida', 'No se encontró un guardado.', 'warning');
  } catch {
    window.showToast('Error', 'No se pudo recuperar la partida.', 'error');
  }
};

window.exportGameJson = function() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(GAME_STATE, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = `partida_${GAME_STATE.player.name.replace(/\s+/g, '_')}_${GAME_STATE.year}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.showToast('Exportado', 'Archivo JSON descargado exitosamente.', 'success');
};

window.importGameJson = function(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      loadState(event.target.result);
      window.showToast('Importado', 'Partida cargada desde archivo JSON.', 'success');
    } catch(err) {
      window.showToast('Error', 'Archivo JSON no válido.', 'error');
    }
  };
  reader.onerror = () => window.showToast('Error', 'No se pudo leer el archivo.', 'error');
  reader.readAsText(file);
  e.target.value = '';
};

window.resetGameConfirm = function() {
  if (confirm('¿Reiniciar partida a valores de fábrica?')) {
    try { localStorage.removeItem(saveKey); } catch {
      window.showToast('Error', 'No se pudo borrar el guardado.', 'error');
      return;
    }
    location.reload();
  }
};

window.showToast = function(title, msg, type = 'info') {
  const t = document.createElement('div');
  const color = type === 'success' ? 'bg-emerald-50 border-emerald-600 text-emerald-950' :
                type === 'warning' ? 'bg-amber-50 border-amber-600 text-amber-950' :
                type === 'error' ? 'bg-rose-50 border-rose-600 text-rose-950' : 'bg-blue-50 border-blue-600 text-blue-950';

  t.className = `fixed bottom-4 right-4 z-50 p-3 rounded border-2 shadow-2xl max-w-sm transition-all duration-200 ${color}`;
  t.innerHTML = `
    <div class="font-extrabold text-xs uppercase mb-0.5"></div>
    <div class="text-[11px] font-medium leading-tight"></div>
  `;
  t.children[0].textContent = title;
  t.children[1].textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 250);
  }, 3500);
};

// Inicialización general
window.addEventListener('DOMContentLoaded', () => {
  window.p1RenderParties();
  window.p1RenderFactions(CHILE_PARTIES.find(p => p.id === 'IND'));
  window.p1UpdateProfessions(25);

  window.loadGameQuick(true);
  window.renderAll();
});
