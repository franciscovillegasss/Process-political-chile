import { element } from '../../shared/dom.js';
import { programPosition } from './programs.js';

function updateCompass(prefix, ids) {
  const position = programPosition(ids);
  const dot = element(`${prefix}-compass-dot`);
  dot.style.left = `${position.x}%`;
  dot.style.top = `${position.y}%`;
  dot.style.transform = 'translate(-50%, -50%)';
  element(`${prefix}-ideology-summary-text`).textContent = position.label;
}

export { updateCompass };
