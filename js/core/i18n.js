/**
 * Bilingual i18n module (vi / en).
 * Elements use data-i18n="key", data-i18n-placeholder="key", data-i18n-alt="key".
 * Translations live in data/translations.json.
 * Language preference persisted to localStorage as 'polaris_lang'.
 */

const STORAGE_KEY = 'polaris_lang';
const DEFAULT_LANG = 'vi';

let _translations = null;
let _lang = DEFAULT_LANG;

async function init() {
  const stored = localStorage.getItem(STORAGE_KEY);
  _lang = (stored === 'en' || stored === 'vi') ? stored : DEFAULT_LANG;

  const res = await fetch('/data/translations.json');
  _translations = await res.json();

  apply();
  return _lang;
}

function setLang(lang) {
  if (lang !== 'vi' && lang !== 'en') return;
  _lang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  apply();
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

function getLang() {
  return _lang;
}

function t(key) {
  if (!_translations) return key;
  return _translations[_lang]?.[key] ?? _translations[DEFAULT_LANG]?.[key] ?? key;
}

function apply() {
  if (!_translations) return;
  document.documentElement.lang = _lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val) el.setAttribute('placeholder', val);
  });

  document.querySelectorAll('[data-i18n-alt]').forEach(el => {
    const key = el.getAttribute('data-i18n-alt');
    const val = t(key);
    if (val) el.setAttribute('alt', val);
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key);
    if (val) el.setAttribute('title', val);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria');
    const val = t(key);
    if (val) el.setAttribute('aria-label', val);
  });
}

export const i18n = { init, setLang, getLang, t, apply };
