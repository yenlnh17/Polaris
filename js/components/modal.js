/**
 * Generic modal controller.
 * Usage: Modal.open(contentEl | htmlString), Modal.close()
 */

let _activeModal = null;
let _previousFocus = null;

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

function open(content, opts = {}) {
  close();

  _previousFocus = document.activeElement;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  if (opts.label) backdrop.setAttribute('aria-label', opts.label);

  const sizeClass = opts.size ? `modal--${opts.size}` : '';
  const modal = document.createElement('div');
  modal.className = `modal ${sizeClass}`.trim();

  if (typeof content === 'string') {
    modal.innerHTML = content;
  } else {
    modal.appendChild(content);
  }

  // Close button (if not already in content)
  if (!modal.querySelector('.modal__close')) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal__close';
    closeBtn.setAttribute('aria-label', 'Đóng');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', close);
    const header = modal.querySelector('.modal__header');
    if (header) header.appendChild(closeBtn);
  } else {
    modal.querySelector('.modal__close').addEventListener('click', close);
  }

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => backdrop.classList.add('is-open'));

  // Focus first focusable element
  const firstFocusable = modal.querySelector(FOCUSABLE);
  if (firstFocusable) firstFocusable.focus();

  // Focus trap
  backdrop.addEventListener('keydown', trapFocus);

  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  // Close on Escape
  document.addEventListener('keydown', onEscape);

  _activeModal = backdrop;
}

function close() {
  if (!_activeModal) return;
  const backdrop = _activeModal;
  backdrop.classList.remove('is-open');
  backdrop.removeEventListener('keydown', trapFocus);
  document.removeEventListener('keydown', onEscape);

  setTimeout(() => {
    backdrop.remove();
    document.body.style.overflow = '';
    if (_previousFocus) _previousFocus.focus();
    _activeModal = null;
  }, 300);
}

function onEscape(e) {
  if (e.key === 'Escape') close();
}

function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const modal = _activeModal?.querySelector('.modal');
  if (!modal) return;
  const focusable = [...modal.querySelectorAll(FOCUSABLE)].filter(el => !el.disabled);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

function openLightbox(images, startIndex = 0) {
  let current = startIndex;

  function build() {
    return `
      <div class="lightbox">
        <div class="lightbox__img-wrap">
          <img class="lightbox__img" src="${images[current]}" alt="Image ${current + 1} of ${images.length}">
          ${images.length > 1 ? `
            <button class="lightbox__nav lightbox__nav--prev" aria-label="Trước" ${current === 0 ? 'disabled' : ''}>&#8249;</button>
            <button class="lightbox__nav lightbox__nav--next" aria-label="Tiếp theo" ${current === images.length - 1 ? 'disabled' : ''}>&#8250;</button>
          ` : ''}
        </div>
        <div class="lightbox__counter">${current + 1} / ${images.length}</div>
        ${images.length > 1 ? `
          <div class="lightbox__thumbnails">
            ${images.map((src, i) => `
              <button class="lightbox__thumb ${i === current ? 'is-active' : ''}" data-index="${i}">
                <img src="${src}" alt="Thumbnail ${i + 1}">
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>`;
  }

  open(build(), { size: 'full', label: 'Image gallery' });

  function rebind() {
    const backdrop = _activeModal;
    if (!backdrop) return;
    backdrop.querySelector('.modal').innerHTML = build().replace('<div class="lightbox">', '<div class="lightbox">');
    backdrop.querySelector('.modal').innerHTML = build();

    backdrop.querySelector('.lightbox__nav--prev')?.addEventListener('click', () => { if (current > 0) { current--; rebind(); } });
    backdrop.querySelector('.lightbox__nav--next')?.addEventListener('click', () => { if (current < images.length - 1) { current++; rebind(); } });
    backdrop.querySelectorAll('.lightbox__thumb').forEach(btn => {
      btn.addEventListener('click', () => { current = +btn.dataset.index; rebind(); });
    });

    backdrop.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' && current > 0) { current--; rebind(); }
      if (e.key === 'ArrowRight' && current < images.length - 1) { current++; rebind(); }
    });
  }

  rebind();
}

export const Modal = { open, close, openLightbox };
