import { i18n } from '../core/i18n.js';
import { initNavbar } from '../components/navbar.js';
import { Toast } from '../components/toast.js';
import { loadData, debounce, initLazyLoad, safeGet, safeSet, formatVND, getParams, setParam } from '../core/utils.js';

const WISHLIST_KEY = 'polaris_wishlist';
const PAGE_SIZE = 9;

let allDestinations = [];
let filtered = [];
let page = 0;
let loading = false;
let filters = { q: '', type: '', budget: '', sort: 'rating' };

async function init() {
  await i18n.init();
  initNavbar();

  allDestinations = await loadData('/data/destinations.json') || [];

  // Read URL params
  const params = getParams();
  if (params.q)      filters.q = params.q;
  if (params.type)   filters.type = params.type;
  if (params.budget) filters.budget = params.budget;

  // Sync UI to filters
  if (filters.q)      document.getElementById('dest-search').value = filters.q;
  if (filters.type)   document.getElementById('type-filter').value = filters.type;
  if (filters.budget) document.getElementById('budget-filter').value = filters.budget;

  applyFilters();
  bindEvents();
}

// === EVENTS ===
function bindEvents() {
  const searchInput = document.getElementById('dest-search');
  const typeFilter  = document.getElementById('type-filter');
  const budgetFilter = document.getElementById('budget-filter');
  const sortSelect  = document.getElementById('sort-select');
  const viewGrid    = document.getElementById('view-grid');
  const viewMap     = document.getElementById('view-map');
  const clearEmpty  = document.getElementById('clear-filters-empty');

  searchInput?.addEventListener('input', debounce(() => {
    filters.q = searchInput.value.trim();
    setParam('q', filters.q);
    applyFilters();
  }, 300));

  typeFilter?.addEventListener('change', () => {
    filters.type = typeFilter.value;
    setParam('type', filters.type);
    applyFilters();
  });

  budgetFilter?.addEventListener('change', () => {
    filters.budget = budgetFilter.value;
    setParam('budget', filters.budget);
    applyFilters();
  });

  sortSelect?.addEventListener('change', () => {
    filters.sort = sortSelect.value;
    applyFilters();
  });

  viewGrid?.addEventListener('click', () => {
    document.getElementById('dest-grid').classList.remove('hidden');
    document.getElementById('dest-map').classList.add('hidden');
    viewGrid.classList.add('is-active'); viewGrid.setAttribute('aria-pressed', 'true');
    viewMap.classList.remove('is-active'); viewMap.setAttribute('aria-pressed', 'false');
  });

  viewMap?.addEventListener('click', () => {
    document.getElementById('dest-grid').classList.add('hidden');
    document.getElementById('dest-map').classList.remove('hidden');
    viewMap.classList.add('is-active'); viewMap.setAttribute('aria-pressed', 'true');
    viewGrid.classList.remove('is-active'); viewGrid.setAttribute('aria-pressed', 'false');
    renderMapView();
  });

  clearEmpty?.addEventListener('click', clearFilters);

  // Infinite scroll
  const sentinel = document.getElementById('load-sentinel');
  if (sentinel) {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading) loadMore();
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
  }
}

// === FILTER & SORT ===
function applyFilters() {
  const lang = i18n.getLang();
  const q = filters.q.toLowerCase();

  filtered = allDestinations.filter(d => {
    const name = (d.name[lang] || d.name.vi).toLowerCase();
    const region = (d.region[lang] || d.region.vi).toLowerCase();
    if (q && !name.includes(q) && !region.includes(q) && !d.tags.some(t => t.includes(q))) return false;
    if (filters.type && !d.type.includes(filters.type)) return false;
    if (filters.budget && d.budget !== filters.budget) return false;
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (filters.sort === 'rating') return b.rating - a.rating;
    if (filters.sort === 'price-asc') return a.priceFrom - b.priceFrom;
    if (filters.sort === 'price-desc') return b.priceFrom - a.priceFrom;
    if (filters.sort === 'name') return (a.name[lang] || a.name.vi).localeCompare(b.name[lang] || b.name.vi);
    return 0;
  });

  // Reset pagination
  page = 0;
  document.getElementById('dest-grid').innerHTML = '';
  updateChips();
  updateCount();
  loadMore();
}

// === PAGINATION ===
function loadMore() {
  if (loading) return;
  const start = page * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);
  if (slice.length === 0 && page === 0) {
    document.getElementById('dest-empty').classList.remove('hidden');
    return;
  }
  document.getElementById('dest-empty').classList.add('hidden');
  loading = true;
  renderCards(slice);
  page++;
  loading = false;
}

// === RENDER CARDS ===
function renderCards(destinations) {
  const grid = document.getElementById('dest-grid');
  const lang = i18n.getLang();
  const wishlist = safeGet(WISHLIST_KEY, []);

  destinations.forEach(dest => {
    const name = dest.name[lang] || dest.name.vi;
    const region = dest.region[lang] || dest.region.vi;
    const isWished = wishlist.includes(dest.id);

    const familyBadges = [];
    if (dest.tags.includes('child_friendly'))   familyBadges.push(`<span class="badge badge--primary" data-i18n="dest.badge.child_friendly">Thân thiện trẻ em</span>`);
    if (dest.tags.includes('near_center'))       familyBadges.push(`<span class="badge" data-i18n="dest.badge.near_center">Gần trung tâm</span>`);
    if (dest.tags.includes('elderly_accessible')) familyBadges.push(`<span class="badge badge--success" data-i18n="dest.badge.elderly_accessible">Dễ di chuyển</span>`);

    const badgeType = (filters.type && dest.type.includes(filters.type)) ? filters.type : dest.type[0];
    const typeIcons = { beach:'<i class="bi bi-umbrella" aria-hidden="true"></i>', mountain:'<i class="bi bi-geo-alt" aria-hidden="true"></i>', city:'<i class="bi bi-buildings" aria-hidden="true"></i>', cultural:'<i class="bi bi-bank2" aria-hidden="true"></i>', nature:'<i class="bi bi-tree" aria-hidden="true"></i>', adventure:'<i class="bi bi-lightning-charge" aria-hidden="true"></i>', food:'<i class="bi bi-cup-hot" aria-hidden="true"></i>' };
    const typeIcon = typeIcons[badgeType] || '<i class="bi bi-geo-alt-fill" aria-hidden="true"></i>';
    const shortDesc = dest.shortDesc ? (dest.shortDesc[lang] || dest.shortDesc.vi) : '';
    const filled = Math.round(dest.rating);
    const stars = '★'.repeat(filled) + '☆'.repeat(5 - filled);

    const card = document.createElement('article');
    card.className = 'card-dest reveal';
    card.innerHTML = `
      <div class="card-dest__img-wrap">
        <img data-src="${dest.image}" src="" alt="${name}" class="card-dest__img" loading="lazy">
        <span class="card-dest__badge"><span class="badge badge--accent" data-i18n="dest.type.${badgeType}">${i18n.t('dest.type.' + badgeType)}</span></span>
        <button class="btn-heart card-dest__heart ${isWished ? 'is-active' : ''}"
          aria-label="${isWished ? 'Xoá khỏi yêu thích' : 'Thêm vào yêu thích'}"
          data-wishlist="${dest.id}"><i class="bi bi-heart-fill" aria-hidden="true"></i></button>
        <div class="card-dest__overlay">
          <a href="destination.html?id=${dest.id}" class="btn btn--ghost btn--sm" data-i18n="dest.view_detail">Xem chi tiết</a>
          <a href="planner.html?add=${dest.id}" class="btn btn--primary btn--sm" data-i18n="dest.add_planner">+ Hành trình</a>
        </div>
      </div>
      <div class="card-dest__body">
        <div class="card-dest__name-row">
          <h2 class="card-dest__name">${name}</h2>
          <span class="card-dest__rating">
            <span class="stars" aria-label="${dest.rating} sao">${stars}</span>
            ${dest.rating}
          </span>
        </div>
        <div class="card-dest__location-row">
          <p class="card-dest__location"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> ${region}</p>
          <span class="card-dest__rating-count">(${dest.reviewCount.toLocaleString()})</span>
        </div>
        ${familyBadges.length ? `<div class="card-dest__tags">${familyBadges.join('')}</div>` : ''}
        ${shortDesc ? `<p class="card-dest__desc">${shortDesc}</p>` : ''}
        <div class="card-dest__meta">
          <span class="card-dest__price">
            <span data-i18n="dest.from">Từ</span> <strong>${formatVND(dest.priceFrom)}</strong>
          </span>
        </div>
      </div>`;

    card.querySelector('[data-wishlist]').addEventListener('click', (e) => {
      e.preventDefault();
      const btn = e.currentTarget;
      toggleWishlist(dest.id, btn);
    });

    document.getElementById('dest-grid').appendChild(card);
  });

  // Trigger reveal for newly added cards
  setTimeout(() => {
    document.querySelectorAll('.card-dest.reveal:not(.visible)').forEach(el => {
      el.classList.add('visible');
    });
    initLazyLoad();
    i18n.apply();
  }, 50);
}

// === MAP VIEW ===
function renderMapView() {
  const mapEl = document.getElementById('dest-map');
  const lang = i18n.getLang();
  const points = filtered.map(d => {
    const name = d.name[lang] || d.name.vi;
    return `<div style="padding:4px 8px;background:var(--color-primary);color:white;border-radius:4px;font-size:11px;white-space:nowrap">${name}</div>`;
  });
  mapEl.innerHTML = `
    <div class="map-placeholder">
      <p style="font-size:2rem;margin-bottom:var(--space-3)"><i class="bi bi-map" aria-hidden="true"></i></p>
      <p style="font-weight:600;color:var(--text-primary)">${filtered.length} điểm đến</p>
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:600px;margin:var(--space-4) auto 0">${points.slice(0, 20).join('')}</div>
      <p style="font-size:var(--text-xs);margin-top:var(--space-4);color:var(--text-muted)">Tích hợp Google Maps — cần API key</p>
    </div>`;
}

// === CHIPS ===
function updateChips() {
  const chips = document.getElementById('filter-chips');
  if (!chips) return;
  chips.innerHTML = '';
  if (filters.q) addChip(chips, `Tìm: "${filters.q}"`, () => { filters.q = ''; document.getElementById('dest-search').value = ''; setParam('q', ''); applyFilters(); });
  if (filters.type) addChip(chips, `Loại: ${filters.type}`, () => { filters.type = ''; document.getElementById('type-filter').value = ''; setParam('type', ''); applyFilters(); });
  if (filters.budget) addChip(chips, `Ngân sách: ${filters.budget}`, () => { filters.budget = ''; document.getElementById('budget-filter').value = ''; setParam('budget', ''); applyFilters(); });
}

function addChip(container, label, onRemove) {
  const chip = document.createElement('span');
  chip.className = 'filter-chip';
  chip.innerHTML = `${label}<button class="filter-chip__remove" aria-label="Xoá bộ lọc">&times;</button>`;
  chip.querySelector('.filter-chip__remove').addEventListener('click', onRemove);
  container.appendChild(chip);
}

function updateCount() {
  const el = document.getElementById('results-count');
  if (el) {
    const total = filtered.length;
    el.innerHTML = `<strong>${total}</strong> điểm đến`;
  }
}

function clearFilters() {
  filters = { q: '', type: '', budget: '', sort: 'rating' };
  document.getElementById('dest-search').value = '';
  document.getElementById('type-filter').value = '';
  document.getElementById('budget-filter').value = '';
  document.getElementById('sort-select').value = 'rating';
  setParam('q', ''); setParam('type', ''); setParam('budget', '');
  applyFilters();
}

// === WISHLIST ===
function toggleWishlist(id, btn) {
  const list = safeGet(WISHLIST_KEY, []);
  const idx = list.indexOf(id);
  let added;
  if (idx > -1) { list.splice(idx, 1); added = false; }
  else { list.push(id); added = true; }
  safeSet(WISHLIST_KEY, list);
  btn.classList.toggle('is-active', added);
  btn.setAttribute('aria-label', added ? 'Xoá khỏi yêu thích' : 'Thêm vào yêu thích');
  Toast.show(i18n.t(added ? 'toast.wishlist.added' : 'toast.wishlist.removed'), added ? 'success' : 'info', 2000);
}

init();
