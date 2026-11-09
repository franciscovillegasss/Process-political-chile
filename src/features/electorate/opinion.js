import { GAME_STATE } from '../../app/state.js';
import { POLICIES_CATALOG } from '../character/programs.js';
import { campaignClimate, policyUrgency } from './rules.js';
import { element } from '../../shared/dom.js';

const renderPublicOpinionTable = function() {
  const tbody = document.getElementById('public-opinion-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const issues = [...new Set(POLICIES_CATALOG.map(policy => policy.issue))]
    .map(name => ({ name, imp: Math.round(policyUrgency(GAME_STATE, name) * 100) }))
    .sort((a, b) => b.imp - a.imp).slice(0, 5)
    .map(issue => ({ ...issue, val: (issue.imp - 50) / 10 }));
  const groups = campaignClimate(GAME_STATE).groups;
  const shares = { left: groups[0].weight, center: groups[1].weight, right: groups[2].weight };
  for (const [id, share] of Object.entries(shares)) {
    const value = Math.round(share * 100);
    element(`enth-${id}-val`).textContent = `${value}%`;
    element(`enth-${id}-bar`).style.width = `${value}%`;
  }

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

export { renderPublicOpinionTable };
