import { GAME_STATE } from '../../app/state.js';
import { PACTS, allocateSeats } from '../elections/rules.js';
import { element, escapeHtml } from '../../shared/dom.js';

const setCongressChamber = function(chamber) {
  GAME_STATE.congress.activeChamber = chamber;
  for (const [id, key] of [['dip', 'diputados'], ['sen', 'senado']]) {
    const button = element(`btn-cong-camara-${id}`);
    button.classList.toggle('bg-[#0047AB]', key === chamber);
    button.classList.toggle('text-white', key === chamber);
  }
  renderCongressHemiciclo();
};

function updateCongress(climate) {
  const { congress } = GAME_STATE;
  const preferences = climate.groups.map(group => group.weight * 100);
  const targets = [preferences[0], preferences[1] * 0.58, preferences[2], preferences[1] * 0.42];
  PACTS.forEach((pact, index) => {
    congress.lower[pact.id] = targets[index];
    congress.upper[pact.id] = (congress.upper[pact.id] + targets[index]) / 2;
  });
}

const renderCongressHemiciclo = function() {
  const svg = document.getElementById('svg-congress-hemiciclo');
  if (!svg) return;
  svg.innerHTML = '';

  const isDip = (GAME_STATE.congress.activeChamber === 'diputados');
  const total = isDip ? 155 : 50;
  element('cong-quorum-simple-disp').textContent = `${Math.floor(total / 2) + 1} votos`;
  element('cong-quorum-47-disp').textContent = `${Math.ceil(total * 4 / 7)} votos`;
  element('cong-player-seat-disp').textContent = GAME_STATE.player.officeId === (isDip ? 'diputado' : 'senador')
    ? GAME_STATE.player.currentOffice : 'Sin escaño en esta cámara';
  for (const [id, active] of [['dip', isDip], ['sen', !isDip]]) {
    element(`btn-cong-camara-${id}`).classList.toggle('bg-[#0047AB]', active);
    element(`btn-cong-camara-${id}`).classList.toggle('text-white', active);
  }
  const cx = 320, cy = 280;
  const rows = isDip ? [
    { r: 130, count: 32 }, { r: 165, count: 38 }, { r: 200, count: 41 }, { r: 235, count: 44 }
  ] : [
    { r: 140, count: 14 }, { r: 185, count: 17 }, { r: 230, count: 19 }
  ];

  const shares = isDip ? GAME_STATE.congress.lower : GAME_STATE.congress.upper;
  const parties = PACTS.map(pact => ({ ...pact, votes: Math.round(shares[pact.id] * 100) }));
  allocateSeats(parties, total);
  const colors = parties.flatMap(pact => Array(pact.seats).fill(pact.color));
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

    circle.setAttribute('fill', colors[idx] || '#64748B');
    circle.setAttribute('stroke', '#FFFFFF');
    circle.setAttribute('stroke-width', '1');
    svg.appendChild(circle);
  });
};

const renderLegislativeHistory = function() {
  const tbody = document.getElementById('legislative-history-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filter = element('hist-filter-area').value;
  GAME_STATE.legislativeHistory.filter(law => filter === 'all' || law.area === filter).forEach(l => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-stone-50 text-xs';
    tr.innerHTML = `
      <td class="py-2 px-3 font-bold text-blue-900">${escapeHtml(l.number)}: ${escapeHtml(l.title)}</td>
      <td class="py-2 px-2 text-center text-stone-600 font-mono">${escapeHtml(l.date)}</td>
      <td class="py-2 px-2 text-center font-mono">${escapeHtml(l.type)}</td>
      <td class="py-2 px-2 text-center font-bold text-slate-800 font-mono">${escapeHtml(l.quorum)}</td>
      <td class="py-2 px-2 text-center font-mono text-[11px]"><span class="text-emerald-700">${escapeHtml(l.yes)} Sí</span> / <span class="text-rose-700">${escapeHtml(l.no)} No</span></td>
      <td class="py-2 px-3 text-stone-700 text-[11px]">${escapeHtml(l.impact)}</td>
      <td class="py-2 px-2 text-center"><span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">${l.type === 'Simulación' ? 'VOTADO' : 'ARCHIVO'}</span></td>
    `;
    tbody.appendChild(tr);
  });
};

export { setCongressChamber, updateCongress, renderCongressHemiciclo, renderLegislativeHistory };
