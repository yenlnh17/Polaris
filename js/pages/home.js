import { i18n } from '../core/i18n.js';
import { initNavbar } from '../components/navbar.js';
import { Carousel } from '../components/carousel.js';
import { Toast } from '../components/toast.js';
import { loadData, animateCounter, initReveal, initLazyLoad, safeGet, safeSet, formatVND } from '../core/utils.js';
import { store } from '../core/store.js';

const WISHLIST_KEY = 'polaris_wishlist';
const NEWSLETTER_KEY = 'polaris_newsletter_sub';

async function init() {
  await i18n.init();
  initNavbar();
  initReveal();

  const [destinations, packages] = await Promise.all([
    loadData('/data/destinations.json'),
    loadData('/data/packages.json'),
  ]);
  if (!destinations) return;

  const datalist    = document.getElementById('dest-suggestions');
  const searchInput = document.getElementById('hero-search');
  const typeFilter  = document.getElementById('type-filter');

  function populateDatalist() {
    if (!datalist) return;
    datalist.innerHTML = '';
    const lang = i18n.getLang();
    destinations.forEach(d => {
      const opt = document.createElement('option');
      opt.value = lang === 'en' ? d.name.en : d.name.vi;
      datalist.appendChild(opt);
    });
    if (searchInput) searchInput.placeholder = lang === 'en' ? 'Search destinations...' : 'Tìm điểm đến...';
  }

  populateDatalist();
  store.subscribe('lang', populateDatalist);

  // Search → destinations page (carries q + type)
  function doSearch() {
    const val  = searchInput?.value.trim() ?? '';
    const type = typeFilter?.value ?? '';
    const params = new URLSearchParams();
    if (val)  params.set('q', val);
    if (type) params.set('type', type);
    const qs = params.toString();
    window.location.href = qs ? `destinations.html?${qs}` : 'destinations.html';
  }
  document.getElementById('hero-search-btn')?.addEventListener('click', doSearch);
  searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  // Planner CTA → quick-start modal
  document.getElementById('hero-planner-cta')?.addEventListener('click', showPlannerModal);
  document.getElementById('planner-modal-close')?.addEventListener('click', closePlannerModal);
  document.getElementById('planner-modal-backdrop')?.addEventListener('click', closePlannerModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePlannerModal(); });

  document.querySelectorAll('.planner-modal-chips').forEach(group => {
    group.querySelectorAll('.planner-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        group.querySelectorAll('.planner-chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
      });
    });
  });

  document.getElementById('planner-modal-start')?.addEventListener('click', () => {
    const modal    = document.getElementById('planner-start-modal');
    const group    = modal?.querySelector('#modal-group .is-active')?.dataset.value ?? '';
    const duration = modal?.querySelector('#modal-duration .is-active')?.dataset.value ?? '';
    const budget   = modal?.querySelector('#modal-budget .is-active')?.dataset.value ?? '';
    const val      = searchInput?.value.trim() ?? '';
    const type     = typeFilter?.value ?? '';
    const params   = new URLSearchParams();
    if (group)    params.set('group', group);
    if (duration) params.set('duration', duration);
    if (budget)   params.set('budget', budget);
    if (val)      params.set('q', val);
    if (type)     params.set('type', type);
    const qs = params.toString();
    window.location.href = qs ? `planner.html?${qs}` : 'planner.html';
  });

  // Stats counters (trigger on scroll)
  const statsEl = document.querySelector('.stats-strip');
  if (statsEl) {
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      animateCounter(document.getElementById('stat-destinations'), 200, 1200);
      animateCounter(document.getElementById('stat-itineraries'), 5000, 1800);
      animateCounter(document.getElementById('stat-satisfaction'), 98, 1000);
    }, { threshold: 0.3 });
    observer.observe(statsEl);
  }

  // Featured carousel
  buildFeaturedCarousel(destinations.slice(0, 6));

  // Testimonials carousel
  buildTestimonialsCarousel();

  // Partner marquee
  buildPartnerMarquee();

  // Newsletter
  initNewsletter();

  initLazyLoad();
}

// === FEATURED CAROUSEL ===
function buildFeaturedCarousel(featured) {
  const track = document.getElementById('featured-track');
  if (!track) return;

  const wishlist = safeGet(WISHLIST_KEY, []);

  track.innerHTML = featured.map(dest => {
    const lang = i18n.getLang();
    const name = dest.name[lang] || dest.name.vi;
    const region = dest.region[lang] || dest.region.vi;
    const isWished = wishlist.includes(dest.id);
    return `
      <div class="carousel__slide">
        <div class="card-dest" data-id="${dest.id}">
          <div class="card-dest__img-wrap">
            <img data-src="${dest.image}" src="" alt="${name}" class="card-dest__img" loading="lazy">
            <span class="card-dest__badge">
              <span class="badge badge--accent" data-i18n="dest.type.${dest.type[0]}">${i18n.t('dest.type.' + dest.type[0])}</span>
            </span>
            <div class="card-dest__overlay">
              <a href="destination.html?id=${dest.id}" class="btn btn--ghost btn--sm" data-i18n="featured.viewDetail">Xem chi tiết</a>
              <a href="planner.html?add=${dest.id}" class="btn btn--primary btn--sm" data-i18n="dest.add_planner">Thêm vào hành trình</a>
            </div>
            <button class="btn-heart card-dest__heart ${isWished ? 'is-active' : ''}"
              aria-label="${isWished ? 'Xoá khỏi yêu thích' : 'Thêm vào yêu thích'}"
              data-wishlist="${dest.id}">♥</button>
          </div>
          <div class="card-dest__body">
            <p class="card-dest__region">${region}</p>
            <h3 class="card-dest__name">${name}</h3>
            <div class="card-dest__meta">
              <span class="card-dest__rating">
                <span class="stars" aria-label="${dest.rating} sao">★</span>
                ${dest.rating}
                <span class="card-dest__rating-count">(${dest.reviewCount.toLocaleString()})</span>
              </span>
              <span class="card-dest__price">
                <span data-i18n="dest.from">Từ</span> <strong>${formatVND(dest.priceFrom)}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  // Carousel
  const carouselEl = document.getElementById('featured-carousel');
  if (carouselEl) {
    new Carousel(carouselEl, { autoplay: true, interval: 4500, loop: true });
  }

  // Wishlist toggles
  track.querySelectorAll('[data-wishlist]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleWishlist(btn.dataset.wishlist, btn);
    });
  });

  initLazyLoad();
}

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

// === TESTIMONIALS ===
function buildTestimonialsCarousel() {
  const track = document.getElementById('testimonials-track');
  if (!track) return;

  const testimonials = [
    { name: 'Anh Tuấn', trip: 'Hội An – 5 ngày', quote: 'Polaris giúp mình lập kế hoạch chi tiết cho chuyến đi gia đình 5 người. Ứng dụng gợi ý điểm đến phù hợp với trẻ nhỏ rất chính xác!', rating: 5, avatar: 'https://randomuser.me/api/portraits/men/45.jpg' },
    { name: 'Minh Thư', trip: 'Đà Lạt – 4 ngày', quote: 'Tìm được khách sạn view đẹp qua link đối tác của Polaris, giá tốt hơn tìm tay rất nhiều. Hành trình được tối ưu từng ngày.', rating: 5, avatar: 'https://randomuser.me/api/portraits/women/32.jpg' },
    { name: 'Bảo Khánh', trip: 'Sa Pa – 3 ngày', quote: 'Lần đầu đi trekking Sa Pa, Polaris đã cảnh báo mình về địa hình khó cho người cao tuổi và gợi ý cáp treo thay thế. Rất chu đáo!', rating: 5, avatar: 'https://randomuser.me/api/portraits/men/78.jpg' },
  ];

  track.innerHTML = testimonials.map(t => `
    <div class="carousel__slide">
      <div class="testimonial-card">
        <p class="testimonial-card__quote">${t.quote}</p>
        <div class="testimonial-card__author">
          <img src="${t.avatar}" alt="${t.name}" class="testimonial-card__avatar" loading="lazy">
          <div>
            <p class="testimonial-card__name">${t.name}</p>
            <p class="testimonial-card__trip">${t.trip}</p>
          </div>
          <div class="stars" aria-label="${t.rating} sao" style="margin-left:auto">★★★★★</div>
        </div>
      </div>
    </div>`).join('');

  const carouselEl = document.getElementById('testimonials-carousel');
  if (carouselEl) new Carousel(carouselEl, { autoplay: true, interval: 5000, loop: true });
}

// === PARTNER MARQUEE ===
function buildPartnerMarquee() {
  const track = document.getElementById('partner-track');
  if (!track) return;

  const partners = [
    { name: 'Booking.com', url: 'https://booking.com/?utm_source=polaris' },
    { name: 'Agoda',       url: 'https://agoda.com/?utm_source=polaris' },
    { name: 'Traveloka',   url: 'https://traveloka.com/?utm_source=polaris' },
    { name: 'Klook',       url: 'https://klook.com/?utm_source=polaris' },
    { name: 'Google Maps', url: 'https://maps.google.com' },
  ];

  const html = partners.map(p =>
    `<a href="${p.url}" target="_blank" rel="noopener noreferrer" class="partner-marquee__logo" style="font-weight:700;color:var(--color-secondary);text-decoration:none;font-size:var(--text-base)">${p.name}</a>`
  ).join('');

  track.innerHTML = html.repeat(4); // 4x: ensures one set (~992px) > max container (960px)
}

// === NEWSLETTER ===
function initNewsletter() {
  const forms = [document.getElementById('newsletter-form'), document.getElementById('footer-newsletter-form')];
  forms.forEach(form => {
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const email = input?.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Toast.error(i18n.t('error.email'), 3000);
        return;
      }
      if (safeGet(NEWSLETTER_KEY)) {
        Toast.info(i18n.t('newsletter.already'), 3000);
        return;
      }
      safeSet(NEWSLETTER_KEY, true);
      if (input) input.value = '';
      Toast.success(i18n.t('newsletter.success'), 4000);
    });
  });
}

function showPlannerModal() {
  const modal = document.getElementById('planner-start-modal');
  if (!modal) return;
  modal.hidden = false;
  document.getElementById('planner-modal-close')?.focus();
}

function closePlannerModal() {
  const modal = document.getElementById('planner-start-modal');
  if (modal) modal.hidden = true;
}

init();
