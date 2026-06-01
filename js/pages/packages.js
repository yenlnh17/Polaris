import { i18n } from '../core/i18n.js';
import { initNavbar } from '../components/navbar.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { FormValidator } from '../components/formValidator.js';
import { loadData, escapeHtml } from '../core/utils.js';

async function init() {
  await i18n.init();
  initNavbar();

  const packages = await loadData('/data/packages.json') || [];
  const lang = i18n.getLang();

  renderPricing(packages, lang);
  renderFAQ(lang);
  initInquiryForm(lang);
  i18n.apply();
}

function renderPricing(packages, lang) {
  const grid = document.getElementById('pricing-grid');
  if (!grid) return;

  grid.innerHTML = packages.map(pkg => {
    const name = pkg.name[lang] || pkg.name.vi;
    const tagline = pkg.tagline[lang] || pkg.tagline.vi;
    const price = pkg.priceLabel[lang] || pkg.priceLabel.vi;
    const cta = pkg.cta[lang] || pkg.cta.vi;
    const featured = pkg.isFeatured;

    const features = pkg.features.map(f => {
      const text = f[lang] || f.vi;
      const cls = f.included ? 'feature-row--included' : 'feature-row--excluded';
      const icon = f.included
        ? '<i class="bi bi-check-lg" aria-hidden="true"></i>'
        : '<i class="bi bi-x-lg" aria-hidden="true"></i>';
      return `
        <div class="feature-row ${cls}">
          <span class="feature-row__icon">${icon}</span>
          <span>${escapeHtml(text)}</span>
        </div>`;
    }).join('');

    return `
      <div class="pricing-card ${featured ? 'pricing-card--featured reveal' : 'reveal'}" data-pkg="${pkg.id}">
        ${featured ? `<div class="pricing-card__badge" data-i18n="packages.recommended">Phổ biến nhất <i class="bi bi-star-fill" aria-hidden="true"></i></div>` : ''}
        <p class="pricing-card__name">${escapeHtml(name)}</p>
        <p class="pricing-card__tagline">${escapeHtml(tagline)}</p>
        <p class="pricing-card__price">${escapeHtml(price)}</p>
        <div class="feature-list">${features}</div>
        <button class="btn ${featured ? 'btn--primary' : 'btn--secondary'}" style="width:100%"
                data-pkg-cta="${pkg.id}">
          ${escapeHtml(cta)}
        </button>
      </div>`;
  }).join('');

  // Trigger reveal
  setTimeout(() => {
    document.querySelectorAll('.pricing-card.reveal').forEach(el => el.classList.add('visible'));
  }, 100);

  // CTA buttons → scroll to inquiry form + pre-select package
  grid.querySelectorAll('[data-pkg-cta]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pkgId = btn.dataset.pkgCta;
      const select = document.getElementById('inq-package');
      if (select) select.value = pkgId;
      document.getElementById('inquiry-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderFAQ(lang) {
  const list = document.getElementById('faq-list');
  if (!list) return;

  const faqs = [
    {
      q: { vi: 'Gói Basic có thực sự miễn phí không?', en: 'Is the Basic package really free?' },
      a: { vi: 'Hoàn toàn miễn phí. Bạn có thể lập hành trình, lọc điểm đến và truy cập link đặt phòng qua đối tác mà không cần trả bất kỳ khoản phí nào.', en: 'Completely free. You can build itineraries, filter destinations and access partner booking links without any charge.' }
    },
    {
      q: { vi: 'Tôi có thể nâng cấp gói sau không?', en: 'Can I upgrade my package later?' },
      a: { vi: 'Có! Bạn có thể nâng cấp bất kỳ lúc nào. Chỉ cần điền form tư vấn và chọn gói mong muốn, đội ngũ Polaris sẽ hỗ trợ bạn.', en: 'Yes! You can upgrade at any time. Fill in the consultation form and select the desired package, the Polaris team will assist you.' }
    },
    {
      q: { vi: 'Mã giảm giá đối tác có giá trị bao lâu?', en: 'How long are partner discount codes valid?' },
      a: { vi: 'Mỗi mã giảm giá có thời hạn riêng từ 3–12 tháng, được gửi kèm trong email xác nhận gói dịch vụ.', en: 'Each discount code has an individual validity period of 3–12 months, sent alongside the service package confirmation email.' }
    },
    {
      q: { vi: 'Tôi có thể hoàn tiền nếu không hài lòng?', en: 'Can I get a refund if I am not satisfied?' },
      a: { vi: 'Chúng tôi cam kết hoàn tiền 100% trong vòng 7 ngày nếu bạn chưa sử dụng bất kỳ dịch vụ tư vấn nào.', en: 'We guarantee a 100% refund within 7 days if you have not used any consultation service.' }
    }
  ];

  list.innerHTML = faqs.map((faq, i) => `
    <details style="border-bottom:1px solid var(--border-color);padding:var(--space-4) 0" ${i === 0 ? 'open' : ''}>
      <summary style="font-weight:600;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:var(--space-4);font-size:var(--text-base)">
        <span>${escapeHtml(faq.q[lang] || faq.q.vi)}</span>
        <span style="color:var(--color-primary);font-size:1.2rem;flex-shrink:0">+</span>
      </summary>
      <p style="margin-top:var(--space-3);color:var(--text-muted);font-size:var(--text-sm);line-height:1.7">
        ${escapeHtml(faq.a[lang] || faq.a.vi)}
      </p>
    </details>`).join('');
}

function initInquiryForm(lang) {
  const form = document.getElementById('inquiry-form');
  const submitBtn = document.getElementById('inq-submit');
  const successEl = document.getElementById('form-success');
  if (!form) return;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^0\d{9}$/;

  function validate() {
    let ok = true;

    const name = form.querySelector('#inq-name').value.trim();
    setFieldState('inq-name', 'inq-name-err', name.length >= 2, 'Vui lòng nhập họ và tên');
    if (name.length < 2) ok = false;

    const email = form.querySelector('#inq-email').value.trim();
    setFieldState('inq-email', 'inq-email-err', EMAIL_RE.test(email), 'Email không hợp lệ');
    if (!EMAIL_RE.test(email)) ok = false;

    const phone = form.querySelector('#inq-phone').value.trim();
    setFieldState('inq-phone', 'inq-phone-err', PHONE_RE.test(phone), 'Số điện thoại phải là 10 chữ số, bắt đầu bằng 0');
    if (!PHONE_RE.test(phone)) ok = false;

    const travelers = +form.querySelector('#inq-travelers').value;
    setFieldState('inq-travelers', 'inq-travelers-err', travelers >= 1 && travelers <= 50, 'Số người đi từ 1 đến 50');
    if (travelers < 1 || travelers > 50) ok = false;

    return ok;
  }

  function setFieldState(inputId, errId, valid, msg) {
    const input = document.getElementById(inputId);
    const err = document.getElementById(errId);
    if (!input) return;
    input.classList.toggle('field--success', valid);
    input.classList.toggle('field--error', !valid);
    if (err) err.textContent = valid ? '' : msg;
  }

  // Validate on blur
  form.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('blur', validate);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) {
      Toast.show('Vui lòng kiểm tra lại thông tin', 'error', 3000);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang gửi...';

    // Simulate API call
    await new Promise(r => setTimeout(r, 1200));

    form.style.display = 'none';
    if (successEl) successEl.classList.add('is-visible');
    Toast.show(i18n.t('packages.inquiry.success_title') || 'Gửi thành công!', 'success', 4000);
  });
}

init();
