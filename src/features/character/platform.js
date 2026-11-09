import { POLICIES_CATALOG, PROGRAM_PRESETS } from './programs.js';
import { draft } from './draft.js';
import { element } from '../../shared/dom.js';
import { updateCompass } from './compass.js';

const p2RenderPoliciesCatalog = function() {
  const topic = element('p2-policy-topic').value;
  const renderPolicy = policy => {
    const checked = draft.p2SelectedPolicies.includes(policy.id);
    const row = document.createElement('label');
    row.className = `flex items-center gap-2 p-2 border rounded text-xs ${checked ? 'bg-blue-50 border-blue-400' : 'bg-white border-stone-200'}`;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.disabled = !checked && draft.p2SelectedPolicies.length === 3;
    input.addEventListener('change', () => p2TogglePolicy(policy.id));
    row.append(input, policy.name);
    return row;
  };
  element('p2-policies-catalog').replaceChildren(...POLICIES_CATALOG.filter(policy => !topic || policy.issue === topic).map(renderPolicy));
  element('p2-policies-count-badge').textContent = `${draft.p2SelectedPolicies.length} / 3 Seleccionadas`;
  const selections = draft.p2SelectedPolicies.map(id => POLICIES_CATALOG.find(policy => policy.id === id)).filter(Boolean);
  element('p2-selected-policies').replaceChildren(...selections.map(policy => {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'p-1 border rounded bg-blue-50 text-xs';
    remove.textContent = `${policy.name} ×`;
    remove.setAttribute('aria-label', `Quitar ${policy.name}`);
    remove.onclick = () => p2TogglePolicy(policy.id);
    return remove;
  }));
  updateCompass('p2', draft.p2SelectedPolicies);
};

const p2TogglePolicy = function(pid) {
  if (draft.p2SelectedPolicies.includes(pid)) draft.p2SelectedPolicies = draft.p2SelectedPolicies.filter(id => id !== pid);
  else if (draft.p2SelectedPolicies.length < 3 && POLICIES_CATALOG.some(policy => policy.id === pid)) draft.p2SelectedPolicies.push(pid);
  p2RenderPoliciesCatalog();
};

function initPrograms() {
  for (const issue of new Set(POLICIES_CATALOG.map(policy => policy.issue))) {
    element('p2-policy-topic').add(new Option(issue, issue));
  }
  for (const preset of PROGRAM_PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'p-1 border rounded bg-stone-100 hover:bg-blue-50 text-xs';
    button.textContent = preset.label;
    button.addEventListener('click', () => {
      draft.p2SelectedPolicies = [...preset.ids];
      element('p2-policy-topic').value = '';
      p2RenderPoliciesCatalog();
    });
    element('p2-presets-container').appendChild(button);
  }
}

export { p2RenderPoliciesCatalog, p2TogglePolicy, initPrograms };
