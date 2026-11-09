import { CHILE_PARTIES } from '../../shared/parties.js';
import { OFFICES } from '../elections/rules.js';
import { draft } from './draft.js';

const adjustAttribute = function(attrKey, delta) {
  if (delta > 0 && draft.p1AvailablePoints < delta) return;
  if (delta < 0 && draft.p1Attributes[attrKey] <= 30) return;
  if (delta > 0 && draft.p1Attributes[attrKey] >= 95) return;

  draft.p1Attributes[attrKey] += delta;
  draft.p1AvailablePoints -= delta;

  document.getElementById(`attr-${attrKey}-val`).textContent = draft.p1Attributes[attrKey];
  document.getElementById(`attr-${attrKey}-bar`).style.width = `${draft.p1Attributes[attrKey]}%`;
  document.getElementById('p1-points-pool-disp').textContent = `Puntos Disponibles: ${draft.p1AvailablePoints}`;
};

const p1HandleAgeChange = function(val) {
  const age = parseInt(val);
  document.getElementById('p1-age-disp').textContent = `${age} años`;
  const box = document.getElementById('p1-age-status-box');

  box.textContent = `Por edad: ${Object.values(OFFICES).filter(office => age >= office.age).map(office => office.name).join(', ')}.`;

  p1UpdateProfessions(age);
};

const p1UpdateProfessions = function(age) {
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

const p1RandomName = function() {
  const f = ['Gabriel', 'Tomás', 'Claudio', 'Rodrigo', 'Sebastián', 'Camila', 'Evelyn', 'Carolina', 'Macarena', 'Diego', 'Matías'];
  const l = ['Silva', 'Soto', 'Araya', 'Muñoz', 'Rojas', 'Sepúlveda', 'Torres', 'Fuentes', 'Vera', 'Contreras', 'Morales'];
  document.getElementById('p1-name').value = `${f[Math.floor(Math.random() * f.length)]} ${l[Math.floor(Math.random() * l.length)]}`;
};

const p1RenderParties = function() {
  const grid = document.getElementById('p1-parties-grid');
  grid.innerHTML = '';

  CHILE_PARTIES.forEach(p => {
    const isSel = (draft.p1SelectedParty === p.id);
    const c = document.createElement('button');
    c.type = 'button';
    c.setAttribute('aria-pressed', String(isSel));
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
    c.onclick = event => {
      draft.p1SelectedParty = p.id;
      draft.p1SelectedFaction = null;
      document.getElementById('p1-selected-party-badge').textContent = `${p.id} - ${p.name}`;
      p1RenderParties();
      p1RenderFactions(p);
      if (!event.detail) grid.querySelector('[aria-pressed=true]')?.focus();
    };
    grid.appendChild(c);
  });
};

const p1RenderFactions = function(party) {
  const grid = document.getElementById('p1-factions-grid');
  grid.innerHTML = '';
  const factions = party.factions || ['Sensibilidad Base'];
  if (!draft.p1SelectedFaction || !factions.includes(draft.p1SelectedFaction)) {
    draft.p1SelectedFaction = factions[0];
  }
  document.getElementById('p1-faction-badge').textContent = draft.p1SelectedFaction;

  factions.forEach(f => {
    const isSel = (draft.p1SelectedFaction === f);
    const c = document.createElement('button');
    c.type = 'button';
    c.setAttribute('aria-pressed', String(isSel));
    c.className = `p-2.5 border-2 rounded cursor-pointer text-xs transition select-none ${isSel ? 'bg-blue-100 border-blue-600 font-bold text-blue-950 shadow-xs ring-1 ring-blue-500' : 'bg-white border-stone-300 hover:border-stone-400 hover:bg-stone-50'}`;
    c.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-base">${isSel ? '✅' : '🚩'}</span>
        <div>
          <strong class="block text-slate-900">${f}</strong>
          <span class="text-[10px] text-stone-500 font-normal">${party.id === 'IND' ? 'Trayectoria independiente' : `Corriente interna en ${party.id}`}</span>
        </div>
      </div>
    `;
    c.onclick = event => {
      draft.p1SelectedFaction = f;
      document.getElementById('p1-faction-badge').textContent = f;
      p1RenderFactions(party);
      if (!event.detail) grid.querySelector('[aria-pressed=true]')?.focus();
    };
    grid.appendChild(c);
  });
};

export { adjustAttribute, p1HandleAgeChange, p1UpdateProfessions, p1RandomName, p1RenderParties, p1RenderFactions };
