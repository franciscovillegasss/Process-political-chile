import { CHILE_GEO } from '../../shared/geography.js';
import { electionWeek, registrationWeek } from '../elections/rules.js';
import { element } from '../../shared/dom.js';

const p2HandleYearChange = function(yearVal) {
  const year = Number(yearVal);
  const week = electionWeek(year);
  element('p2-year-description').textContent = week
    ? `${year}: ${year % 4 === 0 ? 'elecciones municipales y regionales' : 'elecciones presidenciales y parlamentarias'}. Inscripción desde la semana ${registrationWeek}; votación en la semana ${week}.`
    : `${year}: año sin elecciones regulares. El calendario avanza con la partida.`;
};

const p2InitTerritoryCascades = function() {
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

const p2HandleRegionChange = function(regKey) {
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

const p2HandleDistrictChange = function(distKey) {
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

const p2HandleCommuneChange = function(commName) {
  const regKey = document.getElementById('p2-region').value;
  const distKey = document.getElementById('p2-district').value.split(' (')[0];
  document.getElementById('p2-preview-domicile').innerHTML = `<strong class="text-blue-900">${commName}</strong> (${distKey}, ${CHILE_GEO[regKey]?.name})`;
};

export { p2HandleYearChange, p2InitTerritoryCascades, p2HandleRegionChange, p2HandleDistrictChange, p2HandleCommuneChange };
