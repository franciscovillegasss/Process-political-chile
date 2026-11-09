import { governmentDirectory } from './government-directory.js';
import { CHILE_GEO } from '../../shared/geography.js';
import { RM_COMMUNES, profileAllows } from '../elections/rm-profile.js';
import { GAME_STATE } from '../../app/state.js';
import { OFFICES } from '../elections/rules.js';
import { CHILE_PARTIES } from '../../shared/parties.js';
import { element, showToast } from '../../shared/dom.js';

function renderGovernment() {
  const select = document.getElementById('directory-commune');
  const communes = Object.entries(CHILE_GEO).filter(([region]) => profileAllows(GAME_STATE.profile, region))
    .flatMap(([, region]) => Object.values(region.districts).flatMap(district => district.communes))
    .sort((a, b) => a.localeCompare(b, 'es-CL'));
  const previous = select.value;
  select.replaceChildren(...communes.map(commune => new Option(commune, commune)));
  select.value = communes.includes(previous) ? previous : GAME_STATE.player.commune;
  const { national, local } = governmentDirectory(GAME_STATE, select.value, RM_COMMUNES[select.value]?.councilSeats ?? 6);
  document.getElementById('directory-local-title').textContent = `Autoridades · ${select.value}`;
  for (const [id, entries] of [['directory-government', national], ['directory-local', local]]) {
    document.getElementById(id).replaceChildren(...entries.map(entry => {
      const item = document.createElement('li');
      item.textContent = `${entry.title} · ${entry.name} (${entry.party})`;
      return item;
    }));
  }
}

const renderPoliticiansDirectory = function() {
  renderGovernment();
  const tbody = document.getElementById('politicians-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filter = element('pol-filter-bloc').value;
  for (const person of GAME_STATE.roster) {
    const party = CHILE_PARTIES.find(entry => entry.id === person.party);
    if (filter !== 'all' && party?.bloc !== filter) continue;
    const row = document.createElement('tr');
    const office = OFFICES[person.office]?.name || 'Sin contienda registrada';
    const cells = [person.name, person.party, office, GAME_STATE.year - person.born,
      party?.bloc || 'Independientes', person.victories, person.generation];
    for (const value of cells) {
      const cell = document.createElement('td');
      cell.className = 'py-2 px-2';
      cell.textContent = value;
      row.append(cell);
    }
    const action = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'px-2 py-1 border rounded';
    button.textContent = 'Ver ficha';
    button.onclick = () => showToast(person.name, `${party?.name || person.party} · ${office} · ${person.victories} contiendas lideradas · generación ${person.generation}.`);
    action.append(button);
    row.append(action);
    tbody.append(row);
  }
};

export { renderPoliticiansDirectory };
