import { GAME_STATE } from '../../app/state.js';
import { escapeHtml } from '../../shared/dom.js';

const renderNewsFeed = function() {
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

export { renderNewsFeed };
