import { switchMainView } from '../../ui/navigation.js';
import { BROADCAST_MS, tallyFrame } from './broadcast-rules.js';
import { element } from '../../shared/dom.js';

let lastReport;
const number = value => value.toLocaleString('es-CL');

export function replayBroadcast() {
  if (lastReport) showElectionBroadcast(lastReport);
}

export function showElectionBroadcast(report) {
  lastReport = report;
  element('replay-broadcast').classList.remove('hidden');
  const dialog = element('election-tv');
  if (dialog.open) return;
  const rows = element('tv-rows');
  let timer;
  const desk = element('tv-office');
  desk.classList.add('hidden');
  desk.onclick = () => { dialog.close(); switchMainView('view-office'); };
  const pause = element('tv-pause');
  const finish = element('tv-finish');
  let elapsed = 0;
  let started = performance.now();
  let paused = false;
  let complete = false;
  element('tv-title').textContent = report.title;
  element('tv-result').textContent = '';
  pause.textContent = 'Pausar';
  pause.disabled = false;
  finish.textContent = 'Ver resultado ahora';

  function paint() {
    const tick = complete ? BROADCAST_MS : elapsed + (paused ? 0 : performance.now() - started);
    const { total, progress, rows: frame } = tallyFrame(report.candidates, tick);
    const done = tick >= BROADCAST_MS;
    const count = Math.floor(progress * 100);
    element('tv-progress').value = count;
    element('tv-status').textContent = done ? '100 % escrutado · resultado final'
      : `${count} % escrutado · ${number(total)} votos · ${Math.ceil((BROADCAST_MS - tick) / 1000)} s`;
    rows.replaceChildren(...frame.map(row => {
      const article = document.createElement('article');
      article.className = 'rounded-lg bg-slate-800 p-2';
      const label = document.createElement('p');
      label.className = 'flex justify-between gap-3 text-sm font-bold';
      const name = document.createElement('span');
      name.textContent = row.name;
      const share = document.createElement('span');
      share.textContent = `${(100 * row.share).toLocaleString('es-CL', { maximumFractionDigits: 2 })} % · ${number(row.counted)}`;
      label.append(name, share);
      const bar = document.createElement('progress');
      bar.max = 100;
      bar.value = 100 * row.share;
      bar.className = `w-full h-2 ${row.player ? 'accent-cyan-400' : 'accent-indigo-400'}`;
      bar.setAttribute('aria-label', `Porcentaje de ${row.name}`);
      article.append(label, bar);
      return article;
    }));
    if (done) {
      complete = true;
      clearInterval(timer);
      pause.disabled = true;
      finish.textContent = 'Cerrar transmisión';
      element('tv-result').textContent = report.summary;
      desk.classList.toggle('hidden', !report.won);
    }
  }

  pause.onclick = () => {
    if (complete) return;
    if (paused) started = performance.now();
    else elapsed += performance.now() - started;
    paused = !paused;
    pause.textContent = paused ? 'Reanudar' : 'Pausar';
    paint();
  };
  finish.onclick = () => {
    if (complete) dialog.close();
    else { complete = true; paint(); }
  };
  dialog.onclose = () => clearInterval(timer);
  dialog.showModal();
  paint();
  timer = setInterval(paint, 400);
}
