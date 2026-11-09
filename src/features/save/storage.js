import { decodeSave } from './codec.js';
import { renderAll } from '../../app/render.js';
import { GAME_STATE, replaceState } from '../../app/state.js';
import { showToast } from '../../shared/dom.js';

const saveKey = 'tpp_chile_clean_save';
const saveGameQuick = function() {
  try {
    localStorage.setItem(saveKey, JSON.stringify(GAME_STATE));
    showToast('Partida guardada', 'Progreso almacenado en este navegador.', 'success');
  } catch {
    showToast('Error', 'No se pudo guardar. Puedes exportar la partida.', 'error');
  }
};

function loadState(raw) {
  const next = decodeSave(raw);
  const previous = GAME_STATE;
  replaceState(next);
  try {
    renderAll();
  } catch (error) {
    replaceState(previous);
    renderAll();
    throw error;
  }
  for (const id of ['screen-page-1-identity', 'screen-page-2-territory']) {
    document.getElementById(id).classList.add('hidden');
  }
}

const loadGameQuick = function(silent = false) {
  try {
    const raw = localStorage.getItem(saveKey);
    if (raw) {
      loadState(raw);
      if (!silent) showToast('Partida cargada', 'Se recuperaron tu progreso y tu historial de campaña.', 'success');
    } else if (!silent) showToast('Sin partida', 'No se encontró un guardado.', 'warning');
  } catch {
    showToast('Error', 'No se pudo recuperar la partida.', 'error');
  }
};

const exportGameJson = function() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(GAME_STATE, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = `partida_${GAME_STATE.player.name.replace(/\s+/g, '_')}_${GAME_STATE.year}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('Exportado', 'Archivo JSON descargado exitosamente.', 'success');
};

const importGameJson = function(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      loadState(event.target.result);
      showToast('Importado', 'Partida cargada desde archivo JSON.', 'success');
    } catch(err) {
      showToast('Error', 'Archivo JSON no válido.', 'error');
    }
  };
  reader.onerror = () => showToast('Error', 'No se pudo leer el archivo.', 'error');
  reader.readAsText(file);
  e.target.value = '';
};

const resetGameConfirm = function() {
  if (confirm('¿Reiniciar partida a valores de fábrica?')) {
    try { localStorage.removeItem(saveKey); } catch {
      showToast('Error', 'No se pudo borrar el guardado.', 'error');
      return;
    }
    location.reload();
  }
};

export { saveGameQuick, loadGameQuick, exportGameJson, importGameJson, resetGameConfirm };
