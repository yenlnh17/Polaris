import { i18n } from '../core/i18n.js';
import { initNavbar } from '../components/navbar.js';
import { loadData, debounce, getParam, escapeHtml, formatDate } from '../core/utils.js';
import { Toast } from '../components/toast.js';

const isArticlePage = window.location.pathname.endsWith('article.html');

const SVG_BOOKMARK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
const SVG_DOTS    = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;
const SVG_FB      = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`;
const SVG_TW      = `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
const SVG_EMAIL   = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
const SVG_LINK    = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
const SVG_FLAG    = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`;

async function init() {
  await i18n.init();
  initNavbar();

  if (isArticlePage) {
    await initArticle();
  } else {
    await initBlog();
  }

  i18n.apply();
}

// ===== BLOG LISTING =====
async function initBlog() {
  const articles = await loadData('/data/blog.json') || [];
  let activeCategory = '';
  let searchQuery = '';

  function filtered() {
    const lang = i18n.getLang();
    return articles.filter(a => {
      if (activeCategory && a.category !== activeCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const title = (a.title[lang] || a.title.vi).toLowerCase();
        const excerpt = (a.excerpt[lang] || a.excerpt.vi).toLowerCase();
        const tags = a.tags.map(t => t.toLowerCase()).join(' ');
        if (!title.includes(q) && !excerpt.includes(q) && !tags.includes(q)) return false;
      }
      return true;
    });
  }

  function render() {
    const list = filtered();
    const lang = i18n.getLang();
    const readTimeLabel = i18n.t('blog.read_time');
    const bookmarks = JSON.parse(localStorage.getItem('polaris_blog_bookmarks') || '[]');

    const container = document.getElementById('blog-list');
    const empty = document.getElementById('blog-empty');

    if (!list.length) {
      if (container) container.innerHTML = '';
      empty?.classList.remove('hidden');
      return;
    }
    empty?.classList.add('hidden');

    if (container) {
      container.innerHTML = list.map(article => {
        const title = article.title[lang] || article.title.vi;
        const excerpt = article.excerpt[lang] || article.excerpt.vi;
        const catLabel = article.categoryLabel?.[lang] || article.categoryLabel?.vi || article.category;
        const bookmarked = bookmarks.includes(article.id) ? ' is-bookmarked' : '';
        return `
          <a href="article.html?id=${article.id}" class="features-wrap reveal">
            <div class="features-wrap__img">
              <img src="${escapeHtml(article.image)}" alt="${escapeHtml(title)}" loading="lazy">
            </div>
            <div class="features-wrap__body">
              <div class="features-wrap__header">
                <p class="features-wrap__cat">${escapeHtml(catLabel)}</p>
                <div class="features-wrap__actions">
                  <button class="fw-action-btn fw-bookmark${bookmarked}" data-id="${article.id}" aria-label="Lưu bài viết">
                    ${SVG_BOOKMARK}
                  </button>
                  <div class="fw-more-wrap">
                    <button class="fw-action-btn fw-more-btn" data-id="${article.id}" aria-label="Tùy chọn">
                      ${SVG_DOTS}
                    </button>
                    <div class="fw-dropdown" role="menu">
                      <button class="fw-dropdown__item fw-share-fb" data-id="${article.id}">${SVG_FB} Chia sẻ lên Facebook</button>
                      <button class="fw-dropdown__item fw-share-tw" data-id="${article.id}">${SVG_TW} Chia sẻ lên Twitter</button>
                      <button class="fw-dropdown__item fw-share-email" data-id="${article.id}">${SVG_EMAIL} Chia sẻ tới Email</button>
                      <div class="fw-dropdown__sep"></div>
                      <button class="fw-dropdown__item fw-copy-link" data-id="${article.id}">${SVG_LINK} Sao chép liên kết</button>
                      <div class="fw-dropdown__sep"></div>
                      <button class="fw-dropdown__item fw-report-btn" data-id="${article.id}">${SVG_FLAG} Báo cáo bài viết</button>
                    </div>
                  </div>
                </div>
              </div>
              <h3 class="features-wrap__title">${escapeHtml(title)}</h3>
              <p class="features-wrap__excerpt">${escapeHtml(excerpt)}</p>
              <div class="features-wrap__meta">
                <img src="${escapeHtml(article.author.avatar)}" alt="${escapeHtml(article.author.name)}" class="features-wrap__avatar">
                <span>${escapeHtml(article.author.name)}</span>
                <span>·</span>
                <span>${article.readTime} ${readTimeLabel}</span>
              </div>
            </div>
          </a>`;
      }).join('');

      setTimeout(() => {
        container.querySelectorAll('.features-wrap.reveal').forEach(el => el.classList.add('visible'));
      }, 50);
    }
  }

  // Category pills
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeCategory = btn.dataset.cat || '';
      render();
    });
  });

  // Search
  const searchInput = document.getElementById('blog-search');
  searchInput?.addEventListener('input', debounce(() => {
    searchQuery = searchInput.value.trim();
    render();
  }, 300));

  // Close all dropdowns on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.fw-more-wrap')) {
      document.querySelectorAll('.fw-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
    }
  });

  // Action button delegation (runs once; covers re-renders)
  const blogList = document.getElementById('blog-list');
  blogList?.addEventListener('click', e => {
    const btn = e.target.closest('.fw-action-btn, .fw-dropdown__item');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const id = btn.dataset.id;
    const articleUrl = `${window.location.origin}/article.html?id=${id}`;

    // Toggle dropdown
    if (btn.classList.contains('fw-more-btn')) {
      const dropdown = btn.nextElementSibling;
      const isOpen = dropdown.classList.contains('is-open');
      document.querySelectorAll('.fw-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
      if (!isOpen) dropdown.classList.add('is-open');
      return;
    }

    // Close dropdown after any item action
    btn.closest('.fw-dropdown')?.classList.remove('is-open');

    if (btn.classList.contains('fw-bookmark')) {
      const bookmarks = JSON.parse(localStorage.getItem('polaris_blog_bookmarks') || '[]');
      const idx = bookmarks.indexOf(id);
      if (idx > -1) {
        bookmarks.splice(idx, 1);
        btn.classList.remove('is-bookmarked');
        Toast.info('Đã bỏ lưu bài viết');
      } else {
        bookmarks.push(id);
        btn.classList.add('is-bookmarked');
        Toast.success('Đã lưu bài viết');
      }
      localStorage.setItem('polaris_blog_bookmarks', JSON.stringify(bookmarks));
      return;
    }

    if (btn.classList.contains('fw-share-fb')) {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`, '_blank', 'noopener,noreferrer,width=600,height=400');
      return;
    }
    if (btn.classList.contains('fw-share-tw')) {
      const article = articles.find(a => a.id === id);
      const title = article?.title[i18n.getLang()] || article?.title.vi || '';
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(title)}`, '_blank', 'noopener,noreferrer,width=600,height=400');
      return;
    }
    if (btn.classList.contains('fw-share-email')) {
      const article = articles.find(a => a.id === id);
      const title = article?.title[i18n.getLang()] || article?.title.vi || '';
      window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(articleUrl)}`;
      return;
    }
    if (btn.classList.contains('fw-copy-link')) {
      navigator.clipboard.writeText(articleUrl)
        .then(() => Toast.success('Đã sao chép liên kết!'))
        .catch(() => Toast.error('Không thể sao chép liên kết'));
      return;
    }
    if (btn.classList.contains('fw-report-btn')) {
      Toast.warning('Đã ghi nhận báo cáo. Cảm ơn bạn!');
    }
  });

  render();
}

// ===== ARTICLE DETAIL =====
async function initArticle() {
  const id = getParam('id');
  if (!id) { showArticleError(); return; }

  const articles = await loadData('/data/blog.json') || [];
  const lang = i18n.getLang();
  const article = articles.find(a => a.id === id);
  if (!article) { showArticleError(); return; }

  const title = article.title[lang] || article.title.vi;
  const excerpt = article.excerpt[lang] || article.excerpt.vi;
  const catLabel = article.categoryLabel?.[lang] || article.categoryLabel?.vi || article.category;

  document.title = `${title} – Polaris`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', excerpt);

  const body = generateArticleBody(article, lang);

  document.getElementById('article-loading')?.remove();
  const content = document.getElementById('article-content');
  if (!content) return;
  content.classList.remove('hidden');

  content.innerHTML = `
    <!-- Hero -->
    <div class="article-hero">
      <img src="${escapeHtml(article.image)}" alt="${escapeHtml(title)}">
      <div class="article-hero__overlay"></div>
    </div>

    <div class="container" style="padding-top:var(--space-10);padding-bottom:var(--space-16)">
      <!-- Breadcrumb -->
      <nav aria-label="Breadcrumb" style="margin-bottom:var(--space-6);font-size:var(--text-sm);color:var(--text-muted)">
        <a href="blog.html" style="color:var(--text-muted)">Cẩm nang</a>
        <span style="margin:0 var(--space-2)">›</span>
        <span>${escapeHtml(catLabel)}</span>
      </nav>

      <div class="article-layout">
        <!-- Main content -->
        <article>
          <header style="margin-bottom:var(--space-8)">
            <p style="font-size:var(--text-xs);font-weight:700;color:var(--color-secondary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--space-2)">${escapeHtml(catLabel)}</p>
            <h1 style="font-family:var(--font-display);font-size:clamp(var(--text-3xl),4vw,var(--text-5xl));line-height:1.15;color:var(--text-primary);margin-bottom:var(--space-5)">${escapeHtml(title)}</h1>
            <p style="font-size:var(--text-lg);color:var(--text-muted);line-height:1.6;margin-bottom:var(--space-5)">${escapeHtml(excerpt)}</p>
            <div style="display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap;padding:var(--space-5) 0;border-top:1px solid var(--border-color);border-bottom:1px solid var(--border-color)">
              <img src="${escapeHtml(article.author.avatar)}" alt="${escapeHtml(article.author.name)}"
                   style="width:44px;height:44px;border-radius:50%;object-fit:cover">
              <div>
                <p style="font-weight:600;font-size:var(--text-sm);color:var(--text-primary)">${escapeHtml(article.author.name)}</p>
                <p style="font-size:var(--text-xs);color:var(--text-muted)">${formatDate(article.date, lang)} · ${article.readTime} phút đọc</p>
              </div>
              <div style="margin-left:auto;display:flex;gap:var(--space-2)">
                ${article.tags.map(t => `<span class="badge">${escapeHtml(t)}</span>`).join('')}
              </div>
            </div>
          </header>

          <div class="article-body" id="article-body">${body}</div>

          <!-- Share -->
          <div class="share-bar">
            <p style="font-size:var(--text-sm);font-weight:600;color:var(--text-muted);align-self:center" data-i18n="blog.share">Chia sẻ:</p>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}"
               target="_blank" rel="noopener noreferrer"
               class="btn btn--secondary btn--sm">Facebook</a>
            <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(title)}"
               target="_blank" rel="noopener noreferrer"
               class="btn btn--secondary btn--sm">Twitter</a>
            <a href="https://zalo.me/share/url?url=${encodeURIComponent(window.location.href)}"
               target="_blank" rel="noopener noreferrer"
               class="btn btn--secondary btn--sm">Zalo</a>
          </div>
        </article>

        <!-- Sidebar: TOC + related -->
        <aside>
          <div class="toc" id="toc" style="position:sticky;top:calc(var(--navbar-height) + var(--space-6))">
            <p class="toc__title" data-i18n="blog.toc">Mục lục</p>
            <nav id="toc-nav"></nav>
          </div>
        </aside>
      </div>

      <!-- Related articles -->
      ${renderRelated(articles, article, lang)}
    </div>`;

  buildTOC();
  initScrollSpy();
}

function generateArticleBody(article, lang) {
  const title = article.title[lang] || article.title.vi;
  // Generate placeholder content sections based on article data
  const sections = [
    {
      h2: lang === 'en' ? 'Overview' : 'Tổng quan',
      p: article.excerpt[lang] || article.excerpt.vi
    },
    {
      h2: lang === 'en' ? 'Highlights' : 'Điểm nổi bật',
      p: lang === 'en'
        ? `Vietnam is a country of stunning contrasts and experiences. Whether you're exploring ancient towns, trekking through misty mountains, or relaxing on pristine beaches, every journey brings new discoveries.`
        : `Việt Nam là đất nước của những trải nghiệm tương phản và phong phú. Dù bạn khám phá phố cổ, leo núi mờ sương hay thư giãn trên bãi biển nguyên sơ, mỗi hành trình đều mang đến những khám phá mới.`
    },
    {
      h2: lang === 'en' ? 'Practical Tips' : 'Mẹo thực tế',
      list: lang === 'en'
        ? ['Book accommodation in advance during peak season (Nov–Apr)', 'Carry cash as many smaller vendors don\'t accept cards', 'Download offline maps before heading to remote areas', 'Learn a few basic Vietnamese phrases — locals appreciate the effort']
        : ['Đặt chỗ ở sớm trong mùa cao điểm (tháng 11 – 4)', 'Mang theo tiền mặt vì nhiều quán nhỏ không nhận thẻ', 'Tải bản đồ offline trước khi đến vùng hẻo lánh', 'Học vài câu tiếng Việt cơ bản — người địa phương sẽ rất trân trọng']
    },
    {
      h2: lang === 'en' ? 'Getting There' : 'Di chuyển',
      p: lang === 'en'
        ? `Vietnam has excellent transport infrastructure. Vietnam Airlines, VietJet and Bamboo Airways operate frequent domestic flights between major cities. Sleeper buses and trains are great budget-friendly options for scenic journeys.`
        : `Việt Nam có cơ sở hạ tầng giao thông rất tốt. Vietnam Airlines, VietJet và Bamboo Airways có các chuyến bay nội địa thường xuyên giữa các thành phố lớn. Xe khách giường nằm và tàu hỏa là lựa chọn tiết kiệm cho những hành trình ngắm cảnh.`
    },
    {
      h2: lang === 'en' ? 'Best Time to Visit' : 'Thời điểm đến',
      p: lang === 'en'
        ? `The ideal time depends on which region you visit. Northern Vietnam is best from October to April; Central Vietnam from February to August; and Southern Vietnam is pleasant year-round, though the dry season (Dec–Apr) is most popular.`
        : `Thời gian lý tưởng phụ thuộc vào vùng bạn đến thăm. Miền Bắc đẹp nhất từ tháng 10 đến tháng 4; Miền Trung từ tháng 2 đến tháng 8; và Miền Nam dễ chịu quanh năm, tuy nhiên mùa khô (tháng 12–4) phổ biến nhất.`
    }
  ];

  return sections.map(s => {
    let html = `<h2 id="section-${encodeURIComponent(s.h2)}">${escapeHtml(s.h2)}</h2>`;
    if (s.p) html += `<p>${escapeHtml(s.p)}</p>`;
    if (s.list) html += `<ul>${s.list.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    return html;
  }).join('');
}

function renderRelated(articles, current, lang) {
  const related = articles
    .filter(a => a.id !== current.id && a.category === current.category)
    .slice(0, 3);

  if (!related.length) return '';

  return `
    <section style="margin-top:var(--space-12)">
      <h2 style="font-family:var(--font-display);font-size:var(--text-2xl);margin-bottom:var(--space-6)" data-i18n="blog.related">Bài viết liên quan</h2>
      <div style="display:flex;flex-direction:column;gap:var(--space-4)">
        ${related.map(a => {
          const title = a.title[lang] || a.title.vi;
          return `
            <a href="article.html?id=${a.id}" class="related-card">
              <img src="${escapeHtml(a.image)}" alt="${escapeHtml(title)}" class="related-card__img">
              <div>
                <p style="font-size:var(--text-xs);font-weight:700;color:var(--color-secondary);margin-bottom:4px">${escapeHtml(a.categoryLabel?.[lang] || a.category)}</p>
                <p style="font-weight:600;color:var(--text-primary);font-size:var(--text-sm);line-height:1.4">${escapeHtml(title)}</p>
                <p style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px">${a.readTime} phút đọc</p>
              </div>
            </a>`;
        }).join('')}
      </div>
    </section>`;
}

function buildTOC() {
  const body = document.getElementById('article-body');
  const nav = document.getElementById('toc-nav');
  if (!body || !nav) return;

  const headings = [...body.querySelectorAll('h2')];
  nav.innerHTML = headings.map(h => `
    <a href="#${encodeURIComponent(h.id || h.textContent)}"
       class="toc__link"
       data-toc="${h.id || h.textContent}">
      ${escapeHtml(h.textContent)}
    </a>`).join('');

  nav.querySelectorAll('.toc__link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const heading = document.getElementById(link.dataset.toc) ||
        document.querySelector(`h2[id="${CSS.escape(link.dataset.toc)}"]`);
      heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function initScrollSpy() {
  const body = document.getElementById('article-body');
  if (!body) return;

  const headings = [...body.querySelectorAll('h2')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.querySelectorAll('.toc__link').forEach(l => l.classList.remove('is-active'));
        const active = document.querySelector(`.toc__link[data-toc="${entry.target.id}"]`);
        active?.classList.add('is-active');
      }
    });
  }, { rootMargin: '-20% 0% -70% 0%', threshold: 0 });

  headings.forEach(h => observer.observe(h));
}

function showArticleError() {
  document.getElementById('article-loading')?.remove();
  const content = document.getElementById('article-content');
  if (content) {
    content.innerHTML = `
      <div style="text-align:center;padding:var(--space-20)">
        <p style="font-size:4rem;margin-bottom:var(--space-4)">📝</p>
        <h2 style="font-family:var(--font-display);font-size:var(--text-3xl);margin-bottom:var(--space-3)">Không tìm thấy bài viết</h2>
        <a href="blog.html" class="btn btn--primary" style="margin-top:var(--space-4)">← Quay lại Cẩm nang</a>
      </div>`;
    content.classList.remove('hidden');
  }
}

init();
