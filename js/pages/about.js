import { i18n } from '../core/i18n.js';
import { initNavbar } from '../components/navbar.js';

const TEAM = [
  {
    name: 'Phạm Hoàng Hiếu',
    role: { vi: 'Đồng sáng lập & CEO', en: 'Co-founder & CEO' },
    bio: { vi: 'CEO & Nhà sáng lập dẫn dắt doanh nghiệp công nghệ từ giai đoạn hạt giống đến tăng trưởng quy mô lớn. Sở trường về hoạch định chiến lược sản phẩm, gọi vốn đầu tư và xây dựng văn hóa doanh nghiệp linh hoạt.', en: 'CEO & Founder leading tech ventures from seed stage to scale. Strengths in product strategy, fundraising and building agile company culture.' },
    avatar: 'https://i.pravatar.cc/150?img=47'
  },
  {
    name: 'Đặng Duy Khánh',
    role: { vi: 'Đồng sáng lập & CTO', en: 'Co-founder & CTO' },
    bio: { vi: 'CTO với kinh nghiệm xây dựng sản phẩm công nghệ từ số 0 và dẫn dắt đội ngũ kỹ sư tinh nhuệ. Sở trường về kiến trúc hệ thống phân tán, Cloud-native (AWS/GCP), và tích hợp giải pháp AI/LLM vào sản phẩm thương mại.', en: 'CTO with experience building tech products from the ground up and leading talented engineering teams. Expertise in distributed system architecture, Cloud-native (AWS/GCP), and integrating AI/LLM solutions into commercial products.' },
    avatar: 'https://i.pravatar.cc/150?img=33'
  },
  {
    name: 'Nguyễn Từ Pháp',
    role: { vi: 'Trưởng phòng SEO', en: 'Head of SEO' },
    bio: { vi: 'Trưởng phòng Nội dung với kinh nghiệm tối ưu hóa hiệu suất nội dung đa kênh (Website, Social, Email). Chuyên gia về Content SEO, lập chiến lược từ khóa và xây dựng phễu nội dung chuyển đổi.', en: 'Head of SEO with experience optimizing multi-channel content performance (Website, Social, Email). Expert in Content SEO, keyword strategy, and building conversion funnels.' },
    avatar: 'https://i.pravatar.cc/150?img=25'
  },
  {  name: 'Trần Lê Khánh Quỳnh',
    role: { vi: 'Trưởng phòng Marketing', en: 'Head of Marketing' },
    bio: { vi: 'Chuyên gia về xây dựng phễu khách hàng (Marketing Funnel), Inbound Marketing và tổ chức sự kiện. Có kinh nghiệm phối hợp chặt chẽ với phòng Kinh doanh để chuẩn hóa quy trình chấm điểm và chuyển giao data khách hàng, giúp tăng 40% tỷ lệ chuyển đổi từ Lead sang Hợp đồng.', en: 'Expert in building customer funnels (Marketing Funnel), Inbound Marketing, and event organization. Has experience collaborating closely with the Sales department to standardize lead scoring and customer data handover, helping increase conversion rates by 40%.' },
    avatar: 'https://i.pravatar.cc/150?img=47'
  },
  {
    name: 'Nguyễn Hữu Thanh',
    role: { vi: 'Kỹ sư phần mềm', en: 'Software Engineer' },
    bio: { vi: ' Software Engineer với 3 năm kinh nghiệm chuyên về phát triển Backend hệ thống lớn. Chuyên môn sâu về Node.js, Python, cơ sở dữ liệu PostgreSQL và thiết kế kiến trúc RESTful API. ', en: 'Software Engineer with 3 years of experience in developing large-scale backend systems. Specialized in Node.js, Python, PostgreSQL, and RESTful API design.' },
    avatar: 'https://i.pravatar.cc/150?img=33'
  },
  {
    name: 'Lê Ngọc Hải Yến',
    role: { vi: 'Chuyên viên phân tích dữ liệu', en: 'Data Analyst' },
    bio: { vi: 'Thành thạo SQL để truy vấn dữ liệu, Excel nâng cao và xây dựng Dashboard trực quan trên Power BI. Đã từng thực hiện các dự án phân tích hành vi người dùng bằng Python trên tập dữ liệu lớn tại trường.', en: 'Data analyst with expertise in SQL, Excel, and Power BI. Has experience in user behavior analysis using Python on large datasets.' },
    avatar: 'https://i.pravatar.cc/150?img=25'
  }
  
];

const TIMELINE = [
  {
    year: '12/2025',
    title: { vi: 'Ý tưởng khởi nguồn', en: 'The Idea Sparks' },
    desc: { vi: 'Nhóm sáng lập nhận ra rằng du khách Việt mất quá nhiều thời gian lên kế hoạch hành trình. Polaris ra đời từ đây.', en: 'The founding team realised Vietnamese travellers spent too long planning trips. Polaris was born.' }
  },
  {
    year: '02/2026',
    title: { vi: 'Ra mắt phiên bản beta', en: 'Beta Launch' },
    desc: { vi: 'Polaris beta đến tay 2.000 người dùng đầu tiên với 50 điểm đến và tính năng lập kế hoạch cơ bản.', en: 'Polaris beta reached 2,000 early users with 50 destinations and basic planning features.' }
  },
  {
    year: '06/2026',
    title: { vi: 'Ra mắt chính thức', en: 'Official Launch' },
    desc: { vi: 'Polaris ra mắt đầy đủ với 200+ điểm đến, Planner AI, hệ sinh thái đối tác và ứng dụng di động.', en: 'Polaris launches fully with 200+ destinations, AI Planner, partner ecosystem and mobile app.' }
  }
];

const VALUES = [
  {
    icon: '<i class="bi bi-stars" aria-hidden="true"></i>',
    title: { vi: 'Cá nhân hoá', en: 'Personalisation' },
    desc: { vi: 'Mỗi hành trình là duy nhất. Chúng tôi không tin vào giải pháp một-kích-cỡ-cho-tất-cả.', en: 'Every trip is unique. We don\'t believe in one-size-fits-all solutions.' }
  },
  {
    icon: '<i class="fa-solid fa-circle-check"></i>',
    title: { vi: 'Tin cậy', en: 'Trust' },
    desc: { vi: 'Chúng tôi chỉ giới thiệu đối tác và điểm đến mà chúng tôi thực sự tin tưởng.', en: 'We only recommend partners and destinations we genuinely trust.' }
  },
  {
    icon: '<i class="fa-solid fa-hand-fist"></i>',
    title: { vi: 'Bền vững', en: 'Sustainability' },
    desc: { vi: 'Thúc đẩy du lịch có trách nhiệm, bảo vệ văn hoá địa phương và môi trường thiên nhiên.', en: 'Promoting responsible travel that protects local culture and the natural environment.' }
  },
  {
    icon: '<i class="bi bi-lightbulb" aria-hidden="true"></i>',
    title: { vi: 'Đơn giản', en: 'Simplicity' },
    desc: { vi: 'Lập kế hoạch du lịch nên dễ dàng và thú vị, không phải stress và mệt mỏi.', en: 'Trip planning should be easy and enjoyable, not stressful and exhausting.' }
  }
];

const PARTNERS = [
  { name: 'Booking.com', logo: '<i class="bi bi-building" aria-hidden="true"></i>', desc: { vi: 'Khách sạn toàn cầu', en: 'Global hotels' } },
  { name: 'Agoda', logo: '<i class="bi bi-moon-stars" aria-hidden="true"></i>', desc: { vi: 'Chỗ ở châu Á', en: 'Asian accommodations' } },
  { name: 'Traveloka', logo: '<i class="bi bi-airplane-fill" aria-hidden="true"></i>', desc: { vi: 'Vé máy bay & khách sạn', en: 'Flights & hotels' } },
  { name: 'Klook', logo: '<i class="bi bi-ticket-perforated" aria-hidden="true"></i>', desc: { vi: 'Tour & hoạt động', en: 'Tours & activities' } }
];

async function init() {
  await i18n.init();
  initNavbar();

  const lang = i18n.getLang();
  renderTimeline(lang);
  renderValues(lang);
  renderTeam(lang);
  renderPartners(lang);

  i18n.apply();

  // Scroll-reveal with IntersectionObserver
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

function renderTimeline(lang) {
  const el = document.getElementById('timeline');
  if (!el) return;
  el.innerHTML = TIMELINE.map((item, i) => `
    <div class="timeline-item reveal" style="--delay: ${i * 120}ms">
      <div class="timeline-item__year">${item.year}</div>
      <div class="timeline-item__body">
        <h3 class="timeline-item__title">${item.title[lang] || item.title.vi}</h3>
        <p class="timeline-item__desc">${item.desc[lang] || item.desc.vi}</p>
      </div>
    </div>`).join('');
}

function renderValues(lang) {
  const el = document.getElementById('values-grid');
  if (!el) return;
  el.innerHTML = VALUES.map((v, i) => `
    <div class="value-card reveal" style="--delay: ${i * 80}ms">
      <span class="value-card__icon">${v.icon}</span>
      <h3 class="value-card__title">${v.title[lang] || v.title.vi}</h3>
      <p class="value-card__desc">${v.desc[lang] || v.desc.vi}</p>
    </div>`).join('');
}

function renderTeam(lang) {
  const el = document.getElementById('team-grid');
  if (!el) return;
  el.innerHTML = TEAM.map((m, i) => `
    <div class="team-card reveal" style="--delay: ${i * 100}ms">
      <div class="team-card__header">
        <img src="${m.avatar}" alt="${m.name}" class="team-card__avatar" loading="lazy" />
        <div>
          <h3 class="team-card__name">${m.name}</h3>
          <p class="team-card__role">${m.role[lang] || m.role.vi}</p>
        </div>
      </div>
      <p class="team-card__bio">${m.bio[lang] || m.bio.vi}</p>
    </div>`).join('');
}

function renderPartners(lang) {
  const el = document.getElementById('partners-grid');
  if (!el) return;
  el.innerHTML = PARTNERS.map((p, i) => `
    <div class="partner-pill reveal" style="--delay: ${i * 60}ms">
      <span class="partner-pill__logo">${p.logo}</span>
      <div>
        <p class="partner-pill__name">${p.name}</p>
        <p class="partner-pill__desc">${p.desc[lang] || p.desc.vi}</p>
      </div>
    </div>`).join('');
}

init();
