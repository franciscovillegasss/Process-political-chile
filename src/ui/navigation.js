import { renderNewsFeed } from '../features/career/news.js';
import { renderCareer } from '../features/career/profile.js';
import { renderCongressHemiciclo } from '../features/congress/chambers.js';
import { renderDHondtD3Visualization } from '../features/elections/pacts.js';
import { element } from '../shared/dom.js';

const switchMainView = function(viewId) {
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

  if (viewId === 'view-profile') renderCareer();
  if (viewId === 'view-news') renderNewsFeed();
  if (viewId === 'view-congress') renderCongressHemiciclo();
  if (viewId === 'view-politicians') {
    setTimeout(() => renderDHondtD3Visualization(), 50);
  }
};

const openCampaignPolls = function() {
  const tab = element('campaign-polls-tab');
  switchMainView('view-campaign');
  switchSubpanel('campaign', 'polls', tab);
  tab.focus();
};

const switchSubpanel = function(view, key, button) {
  document.querySelectorAll(`#subtabs-${view} .subfolder-tab`).forEach(tab => {
    tab.classList.toggle('active', tab === button);
  });
  document.querySelectorAll(`[id^="${view}-panel-"]`).forEach(panel => {
    panel.classList.toggle('hidden', panel.id !== `${view}-panel-${key}`);
  });
  if (key === 'alliances') renderDHondtD3Visualization();
};

// Control del Menú Hamburguesa
const toggleSessionMenu = function(e) {
  e.stopPropagation();
  document.getElementById('dropdown-session-menu').classList.toggle('hidden');
};

document.addEventListener('click', () => {
  document.getElementById('dropdown-session-menu')?.classList?.add('hidden');
});

export { switchMainView, openCampaignPolls, switchSubpanel, toggleSessionMenu };
