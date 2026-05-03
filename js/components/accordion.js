/**
 * Accordion component.
 * Usage: initAccordion(containerEl, { allowMultiple: false })
 */

export function initAccordion(container, opts = {}) {
  if (!container) return;
  const { allowMultiple = false } = opts;

  const items = container.querySelectorAll('.accordion__item');

  items.forEach(item => {
    const trigger = item.querySelector('.accordion__trigger');
    const panel   = item.querySelector('.accordion__panel');
    if (!trigger || !panel) return;

    trigger.setAttribute('aria-expanded', item.classList.contains('is-open') ? 'true' : 'false');
    const panelId = `accordion-panel-${Math.random().toString(36).slice(2, 7)}`;
    panel.id = panelId;
    trigger.setAttribute('aria-controls', panelId);

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      if (!allowMultiple) {
        items.forEach(other => {
          if (other !== item) closeItem(other);
        });
      }

      isOpen ? closeItem(item) : openItem(item);
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger.click(); }
    });
  });
}

function openItem(item) {
  const trigger = item.querySelector('.accordion__trigger');
  const panel   = item.querySelector('.accordion__panel');
  item.classList.add('is-open');
  trigger.setAttribute('aria-expanded', 'true');
  panel.style.maxHeight = panel.scrollHeight + 'px';
}

function closeItem(item) {
  const trigger = item.querySelector('.accordion__trigger');
  const panel   = item.querySelector('.accordion__panel');
  item.classList.remove('is-open');
  trigger.setAttribute('aria-expanded', 'false');
  panel.style.maxHeight = '0';
}
