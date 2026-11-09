import { GAME_STATE } from '../../app/state.js';
import { PACTS, allocateSeats } from './rules.js';
import { CHILE_GEO } from '../../shared/geography.js';
import { showToast, warn } from '../../shared/dom.js';

let d3SimShares = { ofic: 38, cv: 32, rep: 18, cent: 12 };

const resetDHondtSliders = function() {
  d3SimShares = { ofic: 38, cv: 32, rep: 18, cent: 12 };
  document.getElementById('dh-slider-ofic').value = 38;
  document.getElementById('dh-slider-cv').value = 32;
  document.getElementById('dh-slider-rep').value = 18;
  document.getElementById('dh-slider-cent').value = 12;
  updateDHondtSimulation();
};

const updateDHondtSimulation = function() {
  d3SimShares.ofic = parseInt(document.getElementById('dh-slider-ofic').value);
  d3SimShares.cv = parseInt(document.getElementById('dh-slider-cv').value);
  d3SimShares.rep = parseInt(document.getElementById('dh-slider-rep').value);
  d3SimShares.cent = parseInt(document.getElementById('dh-slider-cent').value);

  document.getElementById('dh-pct-ofic').textContent = `${d3SimShares.ofic}%`;
  document.getElementById('dh-pct-cv').textContent = `${d3SimShares.cv}%`;
  document.getElementById('dh-pct-rep').textContent = `${d3SimShares.rep}%`;
  document.getElementById('dh-pct-cent').textContent = `${d3SimShares.cent}%`;

  renderDHondtD3Visualization();
};

const renderDHondtD3Visualization = function() {
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

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 280 150');
  svg.setAttribute('class', 'w-full h-full');
  winningQuotients.forEach((seat, index) => {
    const theta = Math.PI * (1 - index / Math.max(1, totalSeats - 1));
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', 140 - 110 * Math.cos(theta));
    circle.setAttribute('cy', 135 - 110 * Math.sin(theta));
    circle.setAttribute('r', 11);
    circle.setAttribute('fill', seat.color);
    svg.append(circle);
  });
  container.append(svg);
};

const renderElectoralPactsCatalog = function() {
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

const togglePactMembership = function(pactId) {
  const { localElection, year } = GAME_STATE;
  if (localElection?.year === year && !localElection.result) {
    return warn('La lista queda fijada al inscribir la candidatura.');
  }
  if (!PACTS.some(pact => `pact-${pact.id}` === pactId)) return;
  if (GAME_STATE.player.activePactId === pactId) {
    GAME_STATE.player.activePactId = null;
    showToast('Pacto Disuelto', 'Ahora competirás como Independiente Fuera de Pacto.', 'info');
  } else {
    GAME_STATE.player.activePactId = pactId;
    showToast('¡Pacto Formalizado!', 'Has inscrito tu alianza electoral formal ante el SERVEL.', 'success');
  }
  renderElectoralPactsCatalog();
  updateDHondtSimulation();
};

export { resetDHondtSliders, updateDHondtSimulation, renderDHondtD3Visualization, renderElectoralPactsCatalog, togglePactMembership };
