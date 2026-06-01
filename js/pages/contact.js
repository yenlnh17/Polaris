import { i18n } from '../core/i18n.js';
import { initNavbar } from '../components/navbar.js';
import { initAccordion } from '../components/accordion.js';
import { Toast } from '../components/toast.js';

const FAQS = [
  {
    q: { vi: 'Polaris hoàn toàn miễn phí để sử dụng không?', en: 'Is Polaris completely free to use?' },
    a: { vi: 'Gói Basic của Polaris hoàn toàn miễn phí. Bạn có thể khám phá điểm đến, lập hành trình và truy cập link đặt phòng qua đối tác mà không tốn bất kỳ chi phí nào.', en: 'The Polaris Basic plan is completely free. You can explore destinations, plan itineraries, and access partner booking links at no cost.' }
  },
  {
    q: { vi: 'Tôi cần tạo tài khoản để sử dụng Planner không?', en: 'Do I need to create an account to use the Planner?' },
    a: { vi: 'Không cần. Bạn có thể dùng Planner ngay mà không cần đăng nhập. Hành trình của bạn được lưu tự động vào trình duyệt thông qua localStorage.', en: 'No account needed. You can use the Planner immediately without logging in. Your itinerary is saved automatically in your browser via localStorage.' }
  },
  {
    q: { vi: 'Làm thế nào để đặt phòng khách sạn qua Polaris?', en: 'How do I book a hotel through Polaris?' },
    a: { vi: 'Trên trang chi tiết điểm đến, bấm nút "Đặt ngay" bên cạnh tên đối tác (Booking.com, Agoda, Traveloka, Klook). Bạn sẽ được chuyển đến trang đối tác với tìm kiếm đã được điền sẵn.', en: 'On the destination detail page, click the "Book Now" button next to a partner name (Booking.com, Agoda, Traveloka, Klook). You\'ll be redirected to the partner site with your search pre-filled.' }
  },
  {
    q: { vi: 'Tôi có thể xuất hành trình dưới dạng PDF không?', en: 'Can I export my itinerary as a PDF?' },
    a: { vi: 'Có. Ở Bước 4 của Planner, chọn "In / Xuất PDF". Trình duyệt sẽ mở hộp thoại in — chọn "Lưu dưới dạng PDF" để tải về file.', en: 'Yes. In Step 4 of the Planner, select "Print / Export PDF". Your browser will open a print dialog — choose "Save as PDF" to download the file.' }
  },
  {
    q: { vi: 'Polaris có dữ liệu điểm đến ở miền Bắc và miền Nam không?', en: 'Does Polaris cover destinations in both North and South Vietnam?' },
    a: { vi: 'Có. Polaris hiện có dữ liệu 200+ điểm đến trải dài từ Hà Nội, Hạ Long, Sapa ở miền Bắc đến Đà Lạt, Hội An, Phú Quốc và TP. Hồ Chí Minh ở miền Nam.', en: 'Yes. Polaris currently has data on 200+ destinations across the country, from Hanoi, Ha Long Bay, and Sa Pa in the North to Da Lat, Hoi An, Phu Quoc, and Ho Chi Minh City in the South.' }
  }
];

async function init() {
  await i18n.init();
  initNavbar();

  const lang = i18n.getLang();
  renderFAQ(lang);
  initContactForm(lang);

  initAccordion(document.querySelector('.faq-accordion'), { allowMultiple: false });
  i18n.apply();
}

function renderFAQ(lang) {
  const el = document.getElementById('faq-list');
  if (!el) return;

  el.innerHTML = FAQS.map((faq, i) => `
    <div class="accordion__item ${i === 0 ? 'is-open' : ''}">
      <button class="accordion__trigger" type="button">
        <span>${faq.q[lang] || faq.q.vi}</span>
        <i class="bi bi-chevron-down accordion__icon" aria-hidden="true"></i>
      </button>
      <div class="accordion__panel" ${i === 0 ? `style="max-height: 200px"` : `style="max-height: 0"`}>
        <p class="accordion__body">${faq.a[lang] || faq.a.vi}</p>
      </div>
    </div>`).join('');
}

function initContactForm(lang) {
  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('contact-submit');
  const successEl = document.getElementById('contact-success');
  if (!form) return;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate() {
    let ok = true;
    const currentLang = i18n.getLang();

    const name = form.querySelector('#ct-name').value.trim();
    setFieldState('ct-name', 'ct-name-err', name.length >= 2,
      currentLang === 'en' ? 'Please enter your full name' : 'Vui lòng nhập họ và tên');
    if (name.length < 2) ok = false;

    const email = form.querySelector('#ct-email').value.trim();
    setFieldState('ct-email', 'ct-email-err', EMAIL_RE.test(email),
      currentLang === 'en' ? 'Invalid email address' : 'Email không hợp lệ');
    if (!EMAIL_RE.test(email)) ok = false;

    const subject = form.querySelector('#ct-subject').value.trim();
    setFieldState('ct-subject', 'ct-subject-err', subject.length >= 3,
      currentLang === 'en' ? 'Please enter a subject' : 'Vui lòng nhập chủ đề');
    if (subject.length < 3) ok = false;

    const message = form.querySelector('#ct-message').value.trim();
    setFieldState('ct-message', 'ct-message-err', message.length >= 10,
      currentLang === 'en' ? 'Message must be at least 10 characters' : 'Nội dung phải ít nhất 10 ký tự');
    if (message.length < 10) ok = false;

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

  form.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('blur', validate);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) {
      Toast.show(i18n.t('toast.form.error'), 'error', 3000);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('btn--loading');
    submitBtn.innerHTML = `<span class="spinner"></span>${i18n.getLang() === 'en' ? 'Sending…' : 'Đang gửi…'}`;

    await new Promise(r => setTimeout(r, 1000));

    form.style.display = 'none';
    if (successEl) successEl.classList.add('is-visible');
    Toast.show(i18n.t('contact.form.success'), 'success', 4000);
  });
}

init();
