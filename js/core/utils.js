/**
 * Shared utilities used across pages and components.
 */

// === DEBOUNCE ===
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// === THROTTLE ===
export function throttle(fn, limit = 100) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

// === DATA FETCHING ===
export async function loadData(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.error('Failed to load', path, e);
    return null;
  }
}

// === LOCALSTORAGE ===
export function safeGet(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

// Cache with TTL (24h default)
const CACHE_TTL = 86400000;
export function getCached(key, ttl = CACHE_TTL) {
  const raw = safeGet(key);
  if (!raw || !raw.fetchedAt) return null;
  if (Date.now() - raw.fetchedAt > ttl) { localStorage.removeItem(key); return null; }
  return raw.data;
}
export function setCached(key, data) {
  safeSet(key, { data, fetchedAt: Date.now() });
}

// === CURRENCY FORMAT ===
export function formatVND(amount) {
  if (amount === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

// === DATE ===
export function formatDate(isoString, lang = 'vi') {
  return new Date(isoString).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

export function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// === URL PARAMS ===
export function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

export function setParam(key, value) {
  const url = new URL(window.location);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  history.replaceState(null, '', url);
}

export function getParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

// === PARTNER URL ===
const PARTNER_BASES = {
  booking:   'https://booking.com/searchresults.html?ss=',
  agoda:     'https://agoda.com/search?q=',
  traveloka: 'https://traveloka.com/en-id/hotel/search?spec=',
  klook:     'https://klook.com/search/?query='
};

export function partnerUrl(partner, destination) {
  const base = PARTNER_BASES[partner];
  if (!base) return '#';
  return `${base}${encodeURIComponent(destination)}&utm_source=polaris&utm_medium=referral`;
}

// === DOM ===
export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') el.className = v;
    else if (k === 'textContent') el.textContent = v;
    else if (k.startsWith('data-')) el.setAttribute(k, v);
    else el[k] = v;
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  });
  return el;
}

// === SCROLL REVEAL ===
export function initReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// === LAZY LOAD IMAGES ===
export function initLazyLoad() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('img[data-src]').forEach(img => {
      img.src = img.dataset.src;
      img.classList.add('loaded');
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      img.src = img.dataset.src;
      img.onload = () => img.classList.add('loaded');
      img.onerror = () => { img.src = 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80'; img.classList.add('loaded'); };
      observer.unobserve(img);
    });
  }, { rootMargin: '200px 0px' });

  document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
}

// === STAR RATING HTML ===
export function starsHTML(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

// === ANIMATED COUNTER ===
export function animateCounter(el, target, duration = 1500) {
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target).toLocaleString('vi-VN');
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// === COPY TO CLIPBOARD ===
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
}

// === READING TIME ===
export function readingTime(text, wpm = 200) {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wpm);
}

// === SAFE HTML (text only — no XSS) ===
export function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
