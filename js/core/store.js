/**
 * Lightweight observer-based state store.
 * Used for: planner state, wishlist, active language.
 */

const _state = {};
const _listeners = {};
const _persisted = new Set();

function set(key, value) {
  _state[key] = value;
  if (_persisted.has(key)) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
  (_listeners[key] || []).forEach(fn => fn(value));
}

function get(key) {
  return _state[key];
}

function subscribe(key, fn) {
  if (!_listeners[key]) _listeners[key] = [];
  _listeners[key].push(fn);
  return () => {
    _listeners[key] = _listeners[key].filter(f => f !== fn);
  };
}

function persist(key, fallback = null) {
  _persisted.add(key);
  try {
    const raw = localStorage.getItem(key);
    _state[key] = raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    _state[key] = fallback;
  }
}

export const store = { set, get, subscribe, persist };
