const element = id => document.getElementById(id);
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const clp = amount => `$${amount.toLocaleString('es-CL')}`;
const warn = message => showToast('Acción no disponible', message, 'warning');

const dismissNotice = () => { element('game-notice').hidden = true; };

const showToast = function(title, message, type = 'info') {
  const wizard = element('screen-page-1-identity');
  if (!wizard.classList.contains('hidden')) {
    const inline = element('p1-validation-alert');
    inline.textContent = `${title}. ${message}`;
    inline.classList.remove('hidden');
    return;
  }
  const notice = element('game-notice');
  notice.dataset.type = type;
  element('notice-title').textContent = title;
  element('notice-message').textContent = message;
  notice.hidden = false;
};

export { element, escapeHtml, clp, warn, dismissNotice, showToast };
