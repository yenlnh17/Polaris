/**
 * Toast notification system.
 * Usage: Toast.show('Message', 'success', 3000)
 * Types: success | error | warning | info
 */

const MAX_TOASTS = 3;
const ICONS = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ'
};

let _container = null;

function getContainer() {
  if (!_container) {
    _container = document.createElement('div');
    _container.className = 'toast-container';
    _container.setAttribute('aria-live', 'polite');
    _container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(_container);
  }
  return _container;
}

function show(message, type = 'info', duration = 3500) {
  const container = getContainer();

  // Remove oldest if at limit
  const existing = container.querySelectorAll('.toast');
  if (existing.length >= MAX_TOASTS) {
    remove(existing[0]);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');

  toast.innerHTML = `
    <div class="toast__icon" aria-hidden="true">${ICONS[type] || ICONS.info}</div>
    <div class="toast__body">
      <p class="toast__message">${message}</p>
    </div>
    <button class="toast__close" aria-label="Đóng thông báo">&times;</button>
    <div class="toast__progress" style="animation-duration: ${duration}ms"></div>
  `;

  toast.querySelector('.toast__close').addEventListener('click', () => remove(toast));

  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('is-visible')));

  const timer = setTimeout(() => remove(toast), duration);
  toast._timer = timer;

  return toast;
}

function remove(toast) {
  clearTimeout(toast._timer);
  toast.classList.add('is-removing');
  toast.classList.remove('is-visible');
  setTimeout(() => toast.remove(), 400);
}

function success(message, duration) { return show(message, 'success', duration); }
function error(message, duration)   { return show(message, 'error',   duration); }
function warning(message, duration) { return show(message, 'warning', duration); }
function info(message, duration)    { return show(message, 'info',    duration); }

export const Toast = { show, success, error, warning, info };
