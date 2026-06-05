import { i18n } from '../core/i18n.js';
import { initNavbar } from '../components/navbar.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { loadData, getParam, formatVND, initLazyLoad, safeGet, safeSet, escapeHtml } from '../core/utils.js';

const WISHLIST_KEY = 'polaris_wishlist';

const MONTH_NAMES = {
  vi: ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'],
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
};

const PARTNER_LABELS = {
  booking:   { name: 'Booking.com',  icon: '<i class="bi bi-building" aria-hidden="true"></i>' },
  agoda:     { name: 'Agoda',        icon: '<i class="bi bi-moon-stars" aria-hidden="true"></i>' },
  traveloka: { name: 'Traveloka',    icon: '<i class="bi bi-airplane-fill" aria-hidden="true"></i>' },
  klook:     { name: 'Klook',        icon: '<i class="bi bi-ticket-perforated" aria-hidden="true"></i>' }
};

async function init() {
  await i18n.init();
  initNavbar();

  const id = getParam('id');
  if (!id) { showError(); return; }

  const destinations = await loadData('/data/destinations.json');
  if (!destinations) { showError(); return; }

  const dest = destinations.find(d => d.id === id);
  if (!dest) { showError(); return; }

  document.title = `${dest.name[i18n.getLang()] || dest.name.vi} – Polaris`;

  renderContent(dest, destinations);

  document.getElementById('dest-loading')?.remove();
  const content = document.getElementById('dest-content');
  if (content) content.classList.remove('hidden');

  initTabs();
  initGalleryThumbs(dest.gallery || [dest.image]);
  initStickyHeader();
  initWishlistBtn(dest.id);
  initAddToItinerary(dest.id);
  initLazyLoad();
  i18n.apply();
}

function renderContent(dest, allDestinations) {
  const lang = i18n.getLang();
  const name = dest.name[lang] || dest.name.vi;
  const region = dest.region[lang] || dest.region.vi;
  const gallery = dest.gallery && dest.gallery.length ? dest.gallery : [dest.image];
  const wishlist = safeGet(WISHLIST_KEY, []);
  const isWished = wishlist.includes(dest.id);

  const content = document.getElementById('dest-content');
  content.innerHTML = `
    <!-- Gallery Hero -->
    <div class="gallery-hero" id="gallery-hero">
      <img id="gallery-main-img"
           class="gallery-hero__main"
           src="${escapeHtml(gallery[0])}"
           alt="${escapeHtml(name)}">
      <div class="gallery-hero__overlay"></div>
      <div class="gallery-hero__info">
        <div class="container">
          <div>
            <p class="gallery-hero__region">${escapeHtml(region)}</p>
            <h1 class="gallery-hero__title">${escapeHtml(name)}</h1>
            <div class="gallery-hero__meta">
              <span style="color:white;font-size:var(--text-sm)">
                <i class="bi bi-star-fill" style="color:#FFD700" aria-hidden="true"></i> ${dest.rating}
                <span style="opacity:.7">(${dest.reviewCount?.toLocaleString() || '–'})</span>
              </span>
              <span style="color:var(--color-lightest);font-size:var(--text-sm)">
                <i class="bi bi-geo-alt-fill" aria-hidden="true"></i> ${escapeHtml(region)}, Việt Nam
              </span>
              <span style="color:var(--color-lightest);font-size:var(--text-sm);white-space:nowrap">
                <span data-i18n="dest.from">Từ</span> <strong style="color:white;font-size:var(--text-base)">${formatVND(dest.priceFrom)}</strong>
              </span>
            </div>
          </div>
          <div class="gallery-hero__actions">
            <button class="btn btn--ghost btn--sm" id="btn-gallery-all"
              aria-label="Xem tất cả ảnh"><i class="fa-solid fa-photo-film" aria-hidden="true"></i> <span data-i18n="detail.view_gallery">Tất cả ảnh</span></button>
            <button class="btn-heart ${isWished ? 'is-active' : ''}" id="btn-wish-hero"
              aria-label="${isWished ? 'Xoá khỏi yêu thích' : 'Thêm vào yêu thích'}"
              data-wishlist="${dest.id}" style="background:rgba(255,255,255,.15);border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:white;font-size:1.2rem;border:1.5px solid rgba(255,255,255,.4);cursor:pointer"><i class="bi bi-heart-fill" aria-hidden="true"></i></button>
          </div>
        </div>
      </div>
    </div>

    <!-- Gallery thumbnails -->
    ${gallery.length > 1 ? `
    <div style="background:var(--bg-alt);border-bottom:1px solid var(--border-color)">
      <div class="container">
        <div class="gallery-thumbs" id="gallery-thumbs">
          ${gallery.map((src, i) => `
            <button class="gallery-thumb ${i === 0 ? 'is-active' : ''}" data-index="${i}" aria-label="Ảnh ${i + 1}">
              <img src="${escapeHtml(src)}" alt="Ảnh ${i + 1}" loading="lazy">
            </button>
          `).join('')}
        </div>
      </div>
    </div>` : ''}

    <!-- Main content area -->
    <div class="container" style="padding-top:var(--space-8);padding-bottom:var(--space-16)">
      <div class="layout--sidebar-right" style="--sidebar-width:340px">
        <!-- Left: tabs + content -->
        <div>
          <!-- Tabs -->
          <div class="detail-tabs" id="detail-tabs" role="tablist">
            <button class="detail-tab is-active" role="tab" aria-selected="true"  data-tab="overview"  data-i18n="detail.tab.overview">Tổng quan</button>
            <button class="detail-tab"            role="tab" aria-selected="false" data-tab="highlights" data-i18n="detail.tab.highlights">Điểm nổi bật</button>
            <button class="detail-tab"            role="tab" aria-selected="false" data-tab="besttime"   data-i18n="detail.tab.besttime">Thời điểm tốt</button>
            <button class="detail-tab"            role="tab" aria-selected="false" data-tab="getting"    data-i18n="detail.tab.getting">Di chuyển</button>
          </div>

          <!-- Overview panel -->
          <div class="detail-panel is-active" id="panel-overview" role="tabpanel">
            <p style="font-size:var(--text-base);line-height:1.8;color:var(--text-secondary);max-width:72ch">
              ${escapeHtml(dest.shortDesc?.[lang] || dest.shortDesc?.vi || '')}
            </p>
            <div style="margin-top:var(--space-6);display:flex;flex-wrap:wrap;gap:var(--space-2)">
              ${dest.tags.map(tag => {
                const normalized = tag.replace(/-/g, '_');
                const badgeKey = 'dest.badge.' + normalized;
                const typeKey  = 'dest.type.'  + normalized;
                const badgeVal = i18n.t(badgeKey);
                const typeVal  = i18n.t(typeKey);
                let label;
                if (badgeVal !== badgeKey)     label = badgeVal;
                else if (typeVal !== typeKey)  label = typeVal;
                else                           label = tag.replace(/[-_]/g, ' ');
                return `<span class="badge badge--accent" style="font-size:var(--text-xs)">${escapeHtml(label)}</span>`;
              }).join('')}
            </div>
            <div style="margin-top:var(--space-8);display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:var(--space-4)">
              <div style="background:var(--bg-alt);border-radius:var(--radius-lg);padding:var(--space-4);text-align:center">
                <div style="font-size:1.8rem;margin-bottom:var(--space-2)"><i class="bi bi-calendar3" aria-hidden="true"></i></div>
                <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px" data-i18n="detail.duration">Thời gian</p>
                <p style="font-weight:700;color:var(--text-primary)">${dest.duration?.[0] || 2}–${dest.duration?.[1] || 7} <span data-i18n="detail.days">ngày</span></p>
              </div>
              <div style="background:var(--bg-alt);border-radius:var(--radius-lg);padding:var(--space-4);text-align:center">
                <div style="font-size:1.8rem;margin-bottom:var(--space-2)"><i class="bi bi-wallet2" aria-hidden="true"></i></div>
                <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px" data-i18n="detail.budget_level">Ngân sách</p>
                <p style="font-weight:700;color:var(--text-primary)">${budgetLabel(dest.budget, lang)}</p>
              </div>
              <div style="background:var(--bg-alt);border-radius:var(--radius-lg);padding:var(--space-4);text-align:center">
                <div style="font-size:1.8rem;margin-bottom:var(--space-2)"><i class="bi bi-star-fill" style="color:#FFD700" aria-hidden="true"></i></div>
                <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px" data-i18n="detail.rating">Đánh giá</p>
                <p style="font-weight:700;color:var(--text-primary)">${dest.rating}/5</p>
              </div>
              <div style="background:var(--bg-alt);border-radius:var(--radius-lg);padding:var(--space-4);text-align:center">
                <div style="font-size:1.8rem;margin-bottom:var(--space-2)"><i class="bi bi-tag" aria-hidden="true"></i></div>
                <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px" data-i18n="detail.type">Loại hình</p>
                <p style="font-weight:700;color:var(--text-primary)">${(dest.type || []).map(t => i18n.t('dest.type.' + t)).join(', ')}</p>
              </div>
            </div>
          </div>

          <!-- Highlights panel -->
          <div class="detail-panel" id="panel-highlights" role="tabpanel">
            <h3 style="font-family:var(--font-display);font-size:var(--text-2xl);margin-bottom:var(--space-5)" data-i18n="detail.highlights_title">Điểm nổi bật</h3>
            <ul style="list-style:none;display:flex;flex-direction:column;gap:var(--space-3)">
              ${(dest.highlights || []).map(h => `
                <li style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-4);background:var(--bg-alt);border-radius:var(--radius-lg)">
                  <span style="font-size:1.3rem;flex-shrink:0"><i class="bi bi-stars" aria-hidden="true"></i></span>
                  <span style="color:var(--text-secondary)">${escapeHtml(h[lang] || h.vi || '')}</span>
                </li>`).join('')}
            </ul>
          </div>

          <!-- Best Time panel -->
          <div class="detail-panel" id="panel-besttime" role="tabpanel">
            <h3 style="font-family:var(--font-display);font-size:var(--text-2xl);margin-bottom:var(--space-5)" data-i18n="detail.besttime_title">Thời điểm lý tưởng</h3>
            <div class="month-grid">
              ${MONTH_NAMES[lang === 'en' ? 'en' : 'vi'].map((m, i) => `
                <span class="month-badge ${(dest.bestMonths || []).includes(i + 1) ? 'month-badge--best' : ''}">
                  ${escapeHtml(m)}
                  ${(dest.bestMonths || []).includes(i + 1) ? ' ✓' : ''}
                </span>`).join('')}
            </div>
            <p style="margin-top:var(--space-4);font-size:var(--text-sm);color:var(--text-muted)" data-i18n="detail.besttime_note">
              Tháng được đánh dấu là thời điểm thời tiết đẹp nhất để tham quan.
            </p>
          </div>

          <!-- Getting There panel -->
          <div class="detail-panel" id="panel-getting" role="tabpanel">
            <h3 style="font-family:var(--font-display);font-size:var(--text-2xl);margin-bottom:var(--space-5)" data-i18n="detail.getting_title">Cách di chuyển</h3>
            <div style="display:flex;flex-direction:column;gap:var(--space-4)">
              <div style="display:flex;gap:var(--space-4);padding:var(--space-4);background:var(--bg-alt);border-radius:var(--radius-lg);align-items:flex-start">
                <span style="font-size:1.6rem;flex-shrink:0"><i class="bi bi-airplane-fill" aria-hidden="true"></i></span>
                <div>
                  <p style="font-weight:600;color:var(--text-primary);margin-bottom:4px" data-i18n="detail.by_plane">Máy bay</p>
                  <p style="font-size:var(--text-sm);color:var(--text-muted)" data-i18n="detail.by_plane_desc">Bay đến sân bay gần nhất, sau đó di chuyển bằng taxi hoặc xe buýt.</p>
                </div>
              </div>
              <div style="display:flex;gap:var(--space-4);padding:var(--space-4);background:var(--bg-alt);border-radius:var(--radius-lg);align-items:flex-start">
                <span style="font-size:1.6rem;flex-shrink:0"><i class="bi bi-bus-front-fill" aria-hidden="true"></i></span>
                <div>
                  <p style="font-weight:600;color:var(--text-primary);margin-bottom:4px" data-i18n="detail.by_bus">Xe khách</p>
                  <p style="font-size:var(--text-sm);color:var(--text-muted)" data-i18n="detail.by_bus_desc">Nhiều tuyến xe giường nằm từ các thành phố lớn, giá tốt.</p>
                </div>
              </div>
              <div style="display:flex;gap:var(--space-4);padding:var(--space-4);background:var(--bg-alt);border-radius:var(--radius-lg);align-items:flex-start">
                <span style="font-size:1.6rem;flex-shrink:0"><i class="bi bi-train-front-fill" aria-hidden="true"></i></span>
                <div>
                  <p style="font-weight:600;color:var(--text-primary);margin-bottom:4px" data-i18n="detail.by_train">Tàu hỏa</p>
                  <p style="font-size:var(--text-sm);color:var(--text-muted)" data-i18n="detail.by_train_desc">Tàu Bắc – Nam dừng tại nhiều thành phố. Phong cảnh đẹp dọc hành trình.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Booking Sidebar -->
        <aside class="sidebar">
          <div class="booking-sidebar" id="booking-sidebar">
            <h2 class="booking-sidebar__title" data-i18n="detail.book_now">Đặt ngay</h2>
            <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-5)" data-i18n="detail.book_desc">Tìm chỗ ở và tour tốt nhất qua các đối tác tin cậy</p>

            ${Object.entries(dest.partners || {}).map(([key, url]) => {
              const info = PARTNER_LABELS[key];
              if (!info) return '';
              return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="partner-btn">
                <span class="partner-btn__icon">${info.icon}</span>
                <span>${info.name}</span>
                <i class="bi bi-arrow-right" style="margin-left:auto;color:var(--text-muted);font-size:var(--text-xs)" aria-hidden="true"></i>
              </a>`;
            }).join('')}

            <div style="border-top:1px solid var(--border-color);margin:var(--space-5) 0"></div>

            <a href="planner.html?add=${encodeURIComponent(dest.id)}"
               class="btn btn--primary" style="width:100%;justify-content:center;display:flex;gap:var(--space-2)">
              <i class="bi bi-stars" aria-hidden="true"></i>
              <span data-i18n="detail.add_itinerary">Thêm vào hành trình</span>
            </a>
            <a href="planner.html" class="btn btn--secondary"
               style="width:100%;justify-content:center;display:flex;gap:var(--space-2);margin-top:var(--space-3)">
              <i class="fas fa-calendar-plus" aria-hidden="true"></i>
              <span data-i18n="detail.plan_new">Lập hành trình mới</span>
            </a>
          </div>
        </aside>
      </div>
    </div>

    <!-- Related destinations -->
    ${renderRelated(dest, allDestinations, lang)}
  `;

  // FAB link
  const fab = document.getElementById('fab-planner');
  if (fab) {
    fab.href = `planner.html?add=${encodeURIComponent(dest.id)}`;
    fab.classList.remove('hidden');
  }
}

function renderRelated(dest, all, lang) {
  const related = all
    .filter(d => d.id !== dest.id && d.type.some(t => dest.type.includes(t)))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);

  if (!related.length) return '';

  return `
    <section class="section section--alt">
      <div class="container">
        <h2 class="section-title" data-i18n="detail.related">Điểm đến tương tự</h2>
        <div style="display:flex;gap:var(--space-4);overflow-x:auto;padding-bottom:var(--space-4);scrollbar-width:none">
          ${related.map(d => {
            const n = d.name[lang] || d.name.vi;
            const r = d.region[lang] || d.region.vi;
            return `
              <a href="destination.html?id=${d.id}" class="related-card" style="display:block;text-decoration:none;flex-shrink:0;width:220px">
                <div style="border-radius:var(--radius-lg);overflow:hidden;aspect-ratio:4/3;background:var(--bg-alt)">
                  <img src="${escapeHtml(d.image)}" alt="${escapeHtml(n)}"
                       style="width:100%;height:100%;object-fit:cover;transition:transform .3s"
                       loading="lazy"
                       onmouseover="this.style.transform='scale(1.05)'"
                       onmouseout="this.style.transform='scale(1)'">
                </div>
                <p style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2)">${escapeHtml(r)}</p>
                <p style="font-weight:600;color:var(--text-primary);font-size:var(--text-sm);margin-top:2px">${escapeHtml(n)}</p>
                <p style="font-size:var(--text-xs);color:var(--color-secondary);margin-top:2px">★ ${d.rating}</p>
              </a>`;
          }).join('')}
        </div>
      </div>
    </section>`;
}

function initTabs() {
  document.querySelectorAll('.detail-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.detail-tab').forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.detail-panel').forEach(p => p.classList.remove('is-active'));

      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      const panelId = `panel-${tab.dataset.tab}`;
      document.getElementById(panelId)?.classList.add('is-active');
    });
  });
}

function initGalleryThumbs(gallery) {
  const mainImg = document.getElementById('gallery-main-img');
  if (!mainImg) return;

  document.querySelectorAll('.gallery-thumb').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.index;
      mainImg.src = gallery[idx];
      document.querySelectorAll('.gallery-thumb').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });

  // Open lightbox on main image click or "all photos" button
  mainImg.style.cursor = 'zoom-in';
  mainImg.addEventListener('click', () => Modal.openLightbox(gallery, 0));

  document.getElementById('btn-gallery-all')?.addEventListener('click', () => {
    const activeThumb = document.querySelector('.gallery-thumb.is-active');
    const idx = activeThumb ? +activeThumb.dataset.index : 0;
    Modal.openLightbox(gallery, idx);
  });
}

function initStickyHeader() {
  const sidebar = document.getElementById('booking-sidebar');
  if (!sidebar) return;

  const observer = new IntersectionObserver(entries => {
    // Sidebar becomes sticky at scroll, no-op for now (CSS handles sticky)
  }, { threshold: 0 });
}

function initWishlistBtn(id) {
  const btn = document.getElementById('btn-wish-hero');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const list = safeGet(WISHLIST_KEY, []);
    const idx = list.indexOf(id);
    let added;
    if (idx > -1) { list.splice(idx, 1); added = false; }
    else { list.push(id); added = true; }
    safeSet(WISHLIST_KEY, list);
    btn.classList.toggle('is-active', added);
    btn.setAttribute('aria-label', added ? 'Xoá khỏi yêu thích' : 'Thêm vào yêu thích');
    Toast.show(i18n.t(added ? 'toast.wishlist.added' : 'toast.wishlist.removed'), added ? 'success' : 'info', 2000);
  });
}

function initAddToItinerary(id) {
  const fab = document.getElementById('fab-planner');
  if (fab) {
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = `planner.html?add=${encodeURIComponent(id)}`;
    });
  }
}

function budgetLabel(budget, lang) {
  const labels = {
    vi: { budget: 'Tiết kiệm', mid: 'Trung bình', luxury: 'Cao cấp' },
    en: { budget: 'Budget',    mid: 'Mid-range',  luxury: 'Luxury' }
  };
  return (labels[lang] || labels.vi)[budget] || budget;
}

function showError() {
  document.getElementById('dest-loading')?.remove();
  const content = document.getElementById('dest-content');
  if (content) {
    content.innerHTML = `
      <div style="text-align:center;padding:var(--space-20)">
        <p style="font-size:4rem;margin-bottom:var(--space-4)">🔍</p>
        <h2 style="font-family:var(--font-display);font-size:var(--text-3xl);margin-bottom:var(--space-3)">Không tìm thấy điểm đến</h2>
        <p style="color:var(--text-muted);margin-bottom:var(--space-6)">Điểm đến bạn đang tìm không tồn tại hoặc đã bị xóa.</p>
        <a href="destinations.html" class="btn btn--primary">← Quay lại danh sách</a>
      </div>`;
    content.classList.remove('hidden');
  }
}

init();
