import { i18n } from '../core/i18n.js';
import { throttle } from '../core/utils.js';

export function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const hamburger = navbar.querySelector('.navbar__hamburger');
  const mobileMenu = navbar.querySelector('.navbar__mobile');
  const langBtns = navbar.querySelectorAll('.lang-toggle__btn');

  // === SCROLL BEHAVIOR ===
  const isHeroPage = document.querySelector('main.main--hero') !== null;

  function updateScroll() {
    const scrolled = window.scrollY > 80;
    navbar.classList.toggle('navbar--scrolled', scrolled);
    navbar.classList.toggle('navbar--transparent', isHeroPage && !scrolled);
  }

  if (isHeroPage) {
    navbar.classList.add('navbar--transparent');
    window.addEventListener('scroll', throttle(updateScroll, 50), { passive: true });
  } else {
    navbar.classList.add('navbar--solid');
  }

  // === MOBILE MENU ===
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target) && mobileMenu.classList.contains('is-open')) {
        closeMobileMenu();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        closeMobileMenu();
        hamburger.focus();
      }
    });

    // Close on mobile link click
    mobileMenu.querySelectorAll('.navbar__mobile-link').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });
  }

  function closeMobileMenu() {
    mobileMenu.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  // === ACTIVE LINK ===
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  navbar.querySelectorAll('[data-nav-page]').forEach(link => {
    if (link.dataset.navPage === currentPath) {
      link.setAttribute('aria-current', 'page');
    }
  });
  if (mobileMenu) {
    mobileMenu.querySelectorAll('[data-nav-page]').forEach(link => {
      if (link.dataset.navPage === currentPath) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // === LANGUAGE TOGGLE ===
  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      i18n.setLang(lang);
      langBtns.forEach(b => b.classList.toggle('lang-toggle__btn--active', b.dataset.lang === lang));
    });
  });

  // Sync toggle to current lang
  const currentLang = i18n.getLang();
  langBtns.forEach(b => b.classList.toggle('lang-toggle__btn--active', b.dataset.lang === currentLang));

  document.addEventListener('langchange', (e) => {
    langBtns.forEach(b => b.classList.toggle('lang-toggle__btn--active', b.dataset.lang === e.detail.lang));
  });
}
