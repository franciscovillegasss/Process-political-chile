import { localProfile } from '../territory/rules.js';
import { GAME_STATE } from '../../app/state.js';
import { focusBonus } from './rules.js';
import { CHILE_GEO } from '../../shared/geography.js';
import { element, showToast } from '../../shared/dom.js';

function renderMapFocus() {
  const profile = localProfile(GAME_STATE);
  const number = value => Math.round(value * 100);
  const recent = profile.projects.slice(0, 3).map(project => `${project.year} · ${project.name}`);
  element('territory-memory').textContent = [
    `Perfil comunal simulado · ${profile.needs.slice(0, 3).map(item => `${item.issue} ${number(item.need)}/100`).join(' · ')}`,
    `Redes vigentes: ${profile.contacts.length} · movilización acumulada: ${profile.participation}/30`,
    recent.length ? `Obras registradas: ${recent.join(' · ')}` : 'Todavía no hay obras registradas en esta comuna.',
  ].join('\n');
  const selected = element('svg-contiguous-map').children[GAME_STATE.campaign.focus];
  element('map-sector-inspected').textContent = selected
    ? `${selected.getAttribute('aria-label')} · +${focusBonus(GAME_STATE)} % en puerta a puerta`
    : 'Elige un sector para el puerta a puerta';
}

const renderContiguousMap = function() {
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

  element('map-sector-inspected').textContent = 'Elige un sector para el puerta a puerta';
  sectors.forEach((s, index) => {
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    poly.setAttribute('d', s.path);
    poly.setAttribute('fill', s.color);
    poly.setAttribute('stroke', '#475569');
    poly.setAttribute('stroke-width', '1.5');
    poly.setAttribute('class', 'hover:fill-blue-500 transition-colors duration-150 cursor-pointer');
    poly.setAttribute('tabindex', '0');
    poly.setAttribute('role', 'button');
    poly.setAttribute('aria-label', s.name);

    poly.onmouseover = () => {
      const tip = document.getElementById('map-hover-tooltip');
      tip.innerHTML = `<strong>${s.name}</strong><br>Población simulada: ${s.pop.toLocaleString('es-CL')} electores`;
      tip.classList.remove('hidden');
    };
    poly.onmouseout = () => {
      document.getElementById('map-hover-tooltip').classList.add('hidden');
    };
    poly.onclick = () => {
      GAME_STATE.campaign.focus = index;
      renderMapFocus();
      showToast('Barrio seleccionado', `El puerta a puerta se concentra en ${s.name}.`, 'info');
    };

    poly.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        poly.onclick();
      }
    };
    svg.appendChild(poly);
  });
  renderMapFocus();
};

export { renderMapFocus, renderContiguousMap };
