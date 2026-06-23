import { i18n } from '../core/i18n.js';
import { initNavbar } from '../components/navbar.js';
import { Toast } from '../components/toast.js';
import { loadData, getParam, formatVND, safeGet, safeSet, copyToClipboard, escapeHtml } from '../core/utils.js';
import { placeAutocomplete, getPlaceDetail, optimizeRoute, haversine } from '../core/goong.js';

const PLANNER_KEY = 'polaris_planner_draft';
const ITINERARIES_KEY = 'polaris_itineraries';

const PARTNER_LABELS = {
  booking:   { name: 'Booking.com', icon: '<i class="bi bi-building" aria-hidden="true"></i>' },
  agoda:     { name: 'Agoda',       icon: '<i class="bi bi-moon-stars" aria-hidden="true"></i>' },
  traveloka: { name: 'Traveloka',   icon: '<i class="bi bi-airplane-fill" aria-hidden="true"></i>' },
  klook:     { name: 'Klook',       icon: '<i class="bi bi-ticket-perforated" aria-hidden="true"></i>' }
};

// Hours shown on timeline (6:00 – 22:00)
const TIMELINE_START = 6;
const TIMELINE_END = 22;
const TIMELINE_HOURS = TIMELINE_END - TIMELINE_START;
const PX_PER_HOUR = 60; // 60px per hour

// State
let plannerState = {
  styles: [],
  group: '',
  familyProfile: { hasChildren: false, childAges: [], hasElderly: false, mobilityLimit: false },
  duration: 5,
  departureDate: '',
  returnDate: '',
  travelers: 2,
  budget: '',
  departure: '',
  selectedDestinations: [],
  dayActivities: {},
  activityOverrides: {},
  customActivities: {},
  selectedAccommodation: {},
  selectedTransport: {},
  transportNeed: 'suggest',  // 'self' | 'suggest' | 'book'
};

// Transport options per departure city → destination
// type: flight | train | bus | ferry  |  priceFrom: VND  |  duration: phút
const TRANSPORT_MATRIX = {
  'ha-noi': {
    'hoi-an':      [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay Hà Nội → Đà Nẵng + taxi 30p', duration:105, priceFrom:900000 }, { type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu Hà Nội → Đà Nẵng + xe', duration:1020, priceFrom:320000 }],
    'da-nang':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay Hà Nội → Đà Nẵng', duration:75, priceFrom:900000 }, { type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu Thống Nhất SE3/SE7', duration:1020, priceFrom:280000 }],
    'da-lat':      [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay Hà Nội → Đà Lạt', duration:120, priceFrom:1500000 }, { type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Bay + xe buýt (quá cảnh SGN)', duration:270, priceFrom:1800000 }],
    'phu-quoc':    [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay Hà Nội → Phú Quốc', duration:120, priceFrom:1800000 }],
    'sa-pa':       [{ type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu đêm HN → Lào Cai + xe', duration:510, priceFrom:280000 }, { type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe khách giường nằm', duration:300, priceFrom:180000 }],
    'nha-trang':   [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay Hà Nội → Nha Trang', duration:120, priceFrom:1600000 }, { type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu Thống Nhất SE1/SE3', duration:1620, priceFrom:480000 }],
    'ho-chi-minh': [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay Hà Nội → TP.HCM', duration:130, priceFrom:1400000 }, { type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu SE1 (xuyên Việt)', duration:1980, priceFrom:600000 }],
    'ninh-binh':   [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe khách HN → Ninh Bình', duration:120, priceFrom:100000 }, { type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu HN → Ninh Bình', duration:150, priceFrom:80000 }],
    'ha-long':     [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe limousine HN → Hạ Long', duration:180, priceFrom:350000 }, { type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe buýt Hà Nội–Hạ Long', duration:240, priceFrom:150000 }],
    'hue':         [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay Hà Nội → Huế', duration:80, priceFrom:1000000 }, { type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu SE7/SE3 → Huế', duration:780, priceFrom:250000 }],
    'mui-ne':      [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Bay HN→SGN + xe buýt đêm', duration:390, priceFrom:1800000 }],
    'con-dao':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay HN→SGN + Bay SGN→Côn Đảo', duration:225, priceFrom:2800000 }],
    'can-tho':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay HN→SGN + xe Cần Thơ', duration:300, priceFrom:2000000 }],
    'quy-nhon':    [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay Hà Nội → Quy Nhơn', duration:100, priceFrom:1200000 }, { type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu HN → Diêu Trì + xe', duration:1020, priceFrom:300000 }],
    'ha-noi':      [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Di chuyển nội thành', duration:30, priceFrom:30000 }],
  },
  'ho-chi-minh': {
    'hoi-an':      [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay SGN → Đà Nẵng + taxi 30p', duration:135, priceFrom:900000 }, { type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu đêm SGN → Đà Nẵng', duration:990, priceFrom:300000 }],
    'da-lat':      [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay TP.HCM → Đà Lạt', duration:45, priceFrom:800000 }, { type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe buýt đêm SGN → Đà Lạt', duration:420, priceFrom:150000 }],
    'phu-quoc':    [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay TP.HCM → Phú Quốc', duration:60, priceFrom:800000 }, { type:'ferry', icon:'<i class="fa-solid fa-ferry" aria-hidden="true"></i>', label:'Xe + Phà Rạch Giá–Phú Quốc', duration:420, priceFrom:280000 }],
    'sa-pa':       [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay SGN→HAN + tàu đêm + xe', duration:780, priceFrom:2200000 }],
    'da-nang':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay TP.HCM → Đà Nẵng', duration:90, priceFrom:900000 }],
    'nha-trang':   [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay TP.HCM → Nha Trang', duration:60, priceFrom:700000 }, { type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe buýt đêm SGN → Nha Trang', duration:540, priceFrom:200000 }],
    'ninh-binh':   [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay SGN→HAN + xe Ninh Bình', duration:270, priceFrom:2000000 }],
    'ha-long':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay SGN→HAN + xe limousine HN→HL', duration:330, priceFrom:2200000 }],
    'hue':         [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay TP.HCM → Huế', duration:90, priceFrom:900000 }],
    'mui-ne':      [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe buýt đêm SGN → Phan Thiết', duration:270, priceFrom:100000 }, { type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu SGN → Phan Thiết', duration:240, priceFrom:100000 }],
    'con-dao':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay TP.HCM → Côn Đảo', duration:45, priceFrom:1500000 }, { type:'ferry', icon:'<i class="fa-solid fa-ferry" aria-hidden="true"></i>', label:'Phà cao tốc Vũng Tàu–Côn Đảo', duration:360, priceFrom:350000 }],
    'can-tho':     [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe khách SGN → Cần Thơ', duration:150, priceFrom:100000 }],
    'quy-nhon':    [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay TP.HCM → Quy Nhơn', duration:80, priceFrom:800000 }, { type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe buýt đêm SGN → Quy Nhơn', duration:600, priceFrom:200000 }],
    'ha-noi':      [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay TP.HCM → Hà Nội', duration:130, priceFrom:1400000 }],
    'ho-chi-minh': [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Di chuyển nội thành', duration:30, priceFrom:30000 }],
  },
  'da-nang': {
    'hoi-an':      [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe/taxi Đà Nẵng → Hội An', duration:45, priceFrom:150000 }],
    'da-lat':      [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay Đà Nẵng → Đà Lạt', duration:60, priceFrom:800000 }],
    'phu-quoc':    [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay DAD→SGN + Bay SGN→PQC', duration:210, priceFrom:1500000 }],
    'nha-trang':   [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay Đà Nẵng → Nha Trang', duration:60, priceFrom:800000 }, { type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe buýt Đà Nẵng → Nha Trang', duration:600, priceFrom:200000 }],
    'ho-chi-minh': [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay Đà Nẵng → TP.HCM', duration:90, priceFrom:900000 }],
    'ha-noi':      [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay Đà Nẵng → Hà Nội', duration:75, priceFrom:900000 }],
    'hue':         [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe Đà Nẵng → Huế (đèo Hải Vân)', duration:150, priceFrom:150000 }, { type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu Đà Nẵng → Huế', duration:150, priceFrom:120000 }],
    'quy-nhon':    [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe buýt Đà Nẵng → Quy Nhơn', duration:210, priceFrom:120000 }, { type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu Đà Nẵng → Diêu Trì', duration:240, priceFrom:150000 }],
    'ninh-binh':   [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe buýt hoặc tàu Đà Nẵng → Ninh Bình', duration:360, priceFrom:200000 }],
    'ha-long':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay DAD→HAN + xe limousine', duration:285, priceFrom:1500000 }],
    'da-nang':     [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Di chuyển nội thành', duration:30, priceFrom:30000 }],
    'mui-ne':      [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe buýt Đà Nẵng → Phan Thiết (quá cảnh)', duration:840, priceFrom:300000 }],
    'con-dao':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay DAD→SGN + Bay SGN→Côn Đảo', duration:270, priceFrom:2000000 }],
    'can-tho':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay DAD→SGN + xe Cần Thơ', duration:270, priceFrom:1800000 }],
    'sa-pa':       [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay DAD→HAN + tàu đêm + xe', duration:600, priceFrom:1800000 }],
  },
  'hai-phong': {
    'ha-long':     [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe Hải Phòng → Hạ Long', duration:90, priceFrom:120000 }],
    'ha-noi':      [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe khách Hải Phòng → Hà Nội', duration:120, priceFrom:100000 }],
    'ninh-binh':   [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe Hải Phòng → Ninh Bình', duration:180, priceFrom:120000 }],
    'sa-pa':       [{ type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu HP→HN + tàu đêm + xe', duration:630, priceFrom:380000 }],
    'hoi-an':      [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay HAN (qua HN) → Đà Nẵng + taxi', duration:210, priceFrom:1200000 }],
    'da-nang':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe HP→HN + Bay HAN→DAD', duration:225, priceFrom:1100000 }],
    'da-lat':      [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe HP→HN + Bay HAN→DLI', duration:255, priceFrom:1700000 }],
    'phu-quoc':    [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe HP→HN + Bay HAN→PQC', duration:255, priceFrom:2000000 }],
    'nha-trang':   [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe HP→HN + Bay HAN→CXR', duration:255, priceFrom:1800000 }],
    'ho-chi-minh': [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe HP→HN + Bay HAN→SGN', duration:270, priceFrom:1600000 }],
    'hue':         [{ type:'train', icon:'<i class="bi bi-train-front-fill" aria-hidden="true"></i>', label:'Tàu HP→HN + Tàu HN→Huế', duration:900, priceFrom:400000 }],
    'quy-nhon':    [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe HP→HN + Bay HAN→UIH', duration:255, priceFrom:1400000 }],
    'mui-ne':      [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe HP→HN + Bay HAN→SGN + xe', duration:480, priceFrom:2000000 }],
    'con-dao':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe HP→HN + Bay HAN→SGN + Bay SGN→VCS', duration:390, priceFrom:3000000 }],
    'can-tho':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe HP→HN + Bay HAN→SGN + xe Cần Thơ', duration:420, priceFrom:2200000 }],
  },
  'can-tho': {
    'ho-chi-minh': [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe khách Cần Thơ → TP.HCM', duration:150, priceFrom:100000 }],
    'phu-quoc':    [{ type:'ferry', icon:'<i class="fa-solid fa-ferry" aria-hidden="true"></i>', label:'Xe + Phà Hà Tiên–Phú Quốc', duration:360, priceFrom:250000 }, { type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Bay Cần Thơ → Phú Quốc', duration:60, priceFrom:800000 }],
    'da-lat':      [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe buýt đêm Cần Thơ → Đà Lạt', duration:480, priceFrom:200000 }],
    'nha-trang':   [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe Cần Thơ → SGN + xe đêm SGN→NT', duration:690, priceFrom:300000 }],
    'hoi-an':      [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe CT→SGN + Bay SGN→DAD + taxi', duration:300, priceFrom:1200000 }],
    'da-nang':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe Cần Thơ→SGN + Bay SGN→DAD', duration:270, priceFrom:1100000 }],
    'ha-noi':      [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe CT→SGN + Bay SGN→HAN', duration:300, priceFrom:1600000 }],
    'hue':         [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe CT→SGN + Bay SGN→HUI', duration:270, priceFrom:1100000 }],
    'quy-nhon':    [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe CT→SGN + Bay SGN→UIH', duration:270, priceFrom:1000000 }],
    'mui-ne':      [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe Cần Thơ → Phan Thiết', duration:360, priceFrom:150000 }],
    'con-dao':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe CT→SGN + Bay SGN→VCS', duration:270, priceFrom:1800000 }],
    'can-tho':     [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Di chuyển nội thành', duration:30, priceFrom:30000 }],
    'ninh-binh':   [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe CT→SGN + Bay + xe HN→NB', duration:420, priceFrom:2200000 }],
    'ha-long':     [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe CT→SGN + Bay SGN→HAN + xe HN→HL', duration:480, priceFrom:2400000 }],
    'sa-pa':       [{ type:'flight', icon:'<i class="bi bi-airplane-fill" aria-hidden="true"></i>', label:'Xe CT→SGN + Bay SGN→HAN + tàu đêm', duration:840, priceFrom:2600000 }],
  },
  'other': {
    'default':     [{ type:'bus', icon:'<i class="bi bi-bus-front-fill" aria-hidden="true"></i>', label:'Xe khách liên tỉnh', duration:240, priceFrom:200000 }],
  },
};

let allDestinations = [];
let allActivities = [];
let currentStep = 1;
let skipRecommendations = false;
let drag = null;
let dayBuilderDocEventsAdded = false;
let dayToDestMap = {}; // { dayIndex: destId } — rebuilt each renderDayBuilder
let currentFocusDay = 0; // tracks which day sidebar adds to
let activePickerDay = null; // currently open picker day index

async function init() {
  await i18n.init();
  initNavbar();

  [allDestinations, allActivities] = await Promise.all([
    loadData('/data/destinations.json'),
    loadData('/data/itinerary-templates.json')
  ]);

  allDestinations = allDestinations || [];
  allActivities = allActivities || [];

  // Restore draft if present
  const draft = safeGet(PLANNER_KEY);
  if (draft) Object.assign(plannerState, draft);

  // Pre-fill from hero modal (?group=, ?duration=, ?budget=, ?type=, ?q=)
  const urlGroup    = getParam('group');
  const urlDuration = getParam('duration');
  const urlBudget   = getParam('budget');
  if (urlGroup)    plannerState.group    = urlGroup;
  if (urlDuration) plannerState.duration = +urlDuration;
  if (urlBudget)   plannerState.budget   = urlBudget;

  // ?type= (loại hình) → map to travel styles
  const urlType = getParam('type');
  if (urlType) {
    const typeStyleMap = {
      beach:     ['relax', 'nature'],
      mountain:  ['nature', 'adventure'],
      city:      ['culture', 'food', 'shopping'],
      cultural:  ['culture'],
      nature:    ['nature'],
      adventure: ['adventure'],
    };
    const mapped = typeStyleMap[urlType] || [];
    plannerState.styles = [...new Set([...plannerState.styles, ...mapped])];
  }

  // ?q= (destination name) → find matching destination and pre-add
  const urlQ = getParam('q');
  if (urlQ && allDestinations.length) {
    const q = urlQ.toLowerCase();
    const match = allDestinations.find(d =>
      d.name.vi.toLowerCase().includes(q) || d.name.en.toLowerCase().includes(q)
    );
    if (match && !plannerState.selectedDestinations.includes(match.id)) {
      plannerState.selectedDestinations.push(match.id);
    }
  }

  // Pre-add destination from URL ?add=id — replace draft selection with this one
  const addId = getParam('add');
  if (addId) {
    plannerState.selectedDestinations = [addId];
  }

  bindStep1();
  bindNavigation();
  syncStep1ToUI();

  // Khi đến từ destination page (?add=), set flag để skip Step 2 sau Step 1
  if (addId) {
    skipRecommendations = true;
  }

  i18n.apply();
}

// ===== STEP 1: QUIZ =====
function bindStep1() {
  // Quiz option cards (checkbox / radio behavior)
  document.querySelectorAll('.quiz-option').forEach(option => {
    option.addEventListener('click', () => {
      const input = option.querySelector('input');
      if (!input) return;

      if (input.type === 'radio') {
        // Deselect siblings in same group
        const group = document.querySelectorAll(`input[name="${input.name}"]`);
        group.forEach(inp => inp.closest('.quiz-option')?.classList.remove('is-selected'));
        input.checked = true;
        option.classList.add('is-selected');
      } else {
        input.checked = !input.checked;
        option.classList.toggle('is-selected', input.checked);
      }

      onQuizChange();
    });

    // Prevent browser from double-toggling the input after our handler already did
    option.querySelector('input')?.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); });
  });

  // Duration slider
  const slider = document.getElementById('duration-slider');
  const display = document.getElementById('duration-display');
  slider?.addEventListener('input', () => {
    plannerState.duration = +slider.value;
    display.innerHTML = `${slider.value} <span data-i18n="detail.days" style="font-size:var(--text-base);font-weight:400">${i18n.t('detail.days') || 'ngày'}</span>`;
    saveDraft();
  });

  // Departure
  document.getElementById('departure-select')?.addEventListener('change', (e) => {
    plannerState.departure = e.target.value;
    saveDraft();
  });

  // Mobility checkbox — plain label, change event fires normally
  document.getElementById('mobility-limit')?.addEventListener('change', (e) => {
    plannerState.familyProfile.mobilityLimit = e.target.checked;
    saveDraft();
  });

  // Departure & return dates — auto-compute duration
  const depDateEl = document.getElementById('departure-date');
  const retDateEl = document.getElementById('return-date');
  const durationHint = document.getElementById('auto-duration-hint');
  function updateDatesState() {
    plannerState.departureDate = depDateEl?.value || '';
    plannerState.returnDate = retDateEl?.value || '';
    if (plannerState.departureDate && plannerState.returnDate) {
      const diff = Math.round((new Date(plannerState.returnDate) - new Date(plannerState.departureDate)) / 86400000);
      if (diff > 0 && diff <= 14) {
        plannerState.duration = diff + 1;  // diff = nights, duration = days
        const slider = document.getElementById('duration-slider');
        const display = document.getElementById('duration-display');
        if (slider) slider.value = diff + 1;
        if (display) display.innerHTML = `${diff + 1} <span style="font-size:var(--text-base);font-weight:400">ngày</span>`;
        if (durationHint) { durationHint.textContent = `${diff + 1} ngày · ${diff} đêm`; durationHint.style.display = 'block'; }
      }
    }
    saveDraft();
  }
  depDateEl?.addEventListener('change', updateDatesState);
  retDateEl?.addEventListener('change', updateDatesState);

  // Traveler counter
  const travDisplay = document.getElementById('travelers-display');
  document.getElementById('travelers-dec')?.addEventListener('click', () => {
    const minTrav = plannerState.group === 'group' ? 3 : 1;
    if (plannerState.travelers > minTrav) {
      plannerState.travelers--;
      if (travDisplay) travDisplay.textContent = plannerState.travelers;
      syncGroupFromTravelers();
      saveDraft();
    }
  });
  document.getElementById('travelers-inc')?.addEventListener('click', () => {
    if (plannerState.travelers < 20) {
      plannerState.travelers++;
      if (travDisplay) travDisplay.textContent = plannerState.travelers;
      syncGroupFromTravelers();
      saveDraft();
    }
  });

  // Transport need
  document.querySelectorAll('input[name="transportNeed"]').forEach(inp => {
    inp.addEventListener('change', () => {
      plannerState.transportNeed = inp.value;
      document.querySelectorAll('[data-group="transportNeed"]').forEach(opt => {
        opt.classList.toggle('is-selected', opt.dataset.value === inp.value);
      });
      saveDraft();
    });
  });
}

function setTravelerCounterEnabled(enabled) {
  const dec = document.getElementById('travelers-dec');
  const inc = document.getElementById('travelers-inc');
  if (dec) dec.disabled = !enabled;
  if (inc) inc.disabled = !enabled;
}

function updateTravelerDisplay() {
  const el = document.getElementById('travelers-display');
  if (el) el.textContent = plannerState.travelers;
}

function autoSelectGroup(groupValue) {
  document.querySelectorAll('input[name="group"]').forEach(inp => {
    inp.checked = (inp.value === groupValue);
    inp.closest('.quiz-option')?.classList.toggle('is-selected', inp.value === groupValue);
  });
  plannerState.group = groupValue;
  document.getElementById('family-extra')?.classList.toggle('is-visible', groupValue === 'family');
}

function syncGroupFromTravelers() {
  if (plannerState.group === 'family') return;
  const t = plannerState.travelers;
  if (t === 1) autoSelectGroup('solo');
  else if (t === 2) autoSelectGroup('couple');
  else autoSelectGroup('group');
}

function onQuizChange() {
  plannerState.styles = [...document.querySelectorAll('input[name="style"]:checked')].map(i => i.value);
  plannerState.group = document.querySelector('input[name="group"]:checked')?.value || '';
  plannerState.budget = document.querySelector('input[name="budget"]:checked')?.value || '';

  const extra = document.getElementById('family-extra');
  if (plannerState.group === 'family') extra?.classList.add('is-visible');
  else extra?.classList.remove('is-visible');

  // Sync travelers to companion type
  const g = plannerState.group;
  if (g === 'solo')   { plannerState.travelers = 1; setTravelerCounterEnabled(false); }
  if (g === 'couple') { plannerState.travelers = 2; setTravelerCounterEnabled(false); }
  if (g === 'group')  { if (plannerState.travelers < 3) plannerState.travelers = 3; setTravelerCounterEnabled(true); }
  if (g === 'family') { setTravelerCounterEnabled(true); }
  if (g) updateTravelerDisplay();

  const hasChildren = document.querySelector('input[name="has_children"]:checked')?.value === 'yes';
  plannerState.familyProfile.hasChildren = hasChildren;
  const agesGroup = document.getElementById('child-ages-group');
  if (agesGroup) agesGroup.style.display = hasChildren ? 'block' : 'none';

  plannerState.familyProfile.childAges = [...document.querySelectorAll('input[name="child_ages"]:checked')].map(c => c.value);

  const hasElderly = document.querySelector('input[name="has_elderly"]:checked')?.value === 'yes';
  plannerState.familyProfile.hasElderly = hasElderly;
  const mobilityGroup = document.getElementById('mobility-group');
  if (mobilityGroup) mobilityGroup.style.display = hasElderly ? 'block' : 'none';

  saveDraft();
}

function syncStep1ToUI() {
  // Restore slider
  const slider = document.getElementById('duration-slider');
  const display = document.getElementById('duration-display');
  if (slider && plannerState.duration) {
    slider.value = plannerState.duration;
    if (display) display.innerHTML = `${plannerState.duration} <span style="font-size:var(--text-base);font-weight:400">ngày</span>`;
  }

  // Restore departure
  const dep = document.getElementById('departure-select');
  if (dep && plannerState.departure) dep.value = plannerState.departure;

  // Restore checkboxes/radios
  plannerState.styles.forEach(s => {
    const inp = document.querySelector(`input[name="style"][value="${s}"]`);
    if (inp) { inp.checked = true; inp.closest('.quiz-option')?.classList.add('is-selected'); }
  });

  if (plannerState.group) {
    const inp = document.querySelector(`input[name="group"][value="${plannerState.group}"]`);
    if (inp) {
      inp.checked = true;
      inp.closest('.quiz-option')?.classList.add('is-selected');
      if (plannerState.group === 'family') document.getElementById('family-extra')?.classList.add('is-visible');
    }
  }

  if (plannerState.budget) {
    const inp = document.querySelector(`input[name="budget"][value="${plannerState.budget}"]`);
    if (inp) { inp.checked = true; inp.closest('.quiz-option')?.classList.add('is-selected'); }
  }

  // Restore dates
  const depEl = document.getElementById('departure-date');
  const retEl = document.getElementById('return-date');
  if (depEl && plannerState.departureDate) depEl.value = plannerState.departureDate;
  if (retEl && plannerState.returnDate) retEl.value = plannerState.returnDate;
  if (plannerState.departureDate && plannerState.returnDate) {
    const nights = Math.max(1, plannerState.duration - 1);
    const hint = document.getElementById('auto-duration-hint');
    if (hint) { hint.textContent = `${plannerState.duration} ngày · ${nights} đêm`; hint.style.display = 'block'; }
  }

  // Restore travelers
  const travDisplay = document.getElementById('travelers-display');
  if (travDisplay && plannerState.travelers) travDisplay.textContent = plannerState.travelers;

  // Restore counter enabled/disabled state
  const g = plannerState.group;
  if (g === 'solo' || g === 'couple') setTravelerCounterEnabled(false);
  else setTravelerCounterEnabled(true);

  // Restore transport need
  if (plannerState.transportNeed) {
    const tnInp = document.querySelector(`input[name="transportNeed"][value="${plannerState.transportNeed}"]`);
    if (tnInp) {
      tnInp.checked = true;
      document.querySelectorAll('[data-group="transportNeed"]').forEach(opt => {
        opt.classList.toggle('is-selected', opt.dataset.value === plannerState.transportNeed);
      });
    }
  }
}

// ===== SCORING ALGORITHM =====
function scoreDestination(dest) {
  let score = 0;
  const { styles, budget, duration, familyProfile } = plannerState;

  // Style overlap × 3
  const styleOverlap = styles.filter(s => dest.style?.includes(s)).length;
  score += styleOverlap * 3;

  // Budget match × 3
  if (budget && dest.budget === budget) score += 3;

  // Duration fit × 2 — destination's duration range includes plannerState.duration
  if (dest.duration && duration >= dest.duration[0] && duration <= dest.duration[1]) score += 2;

  // Type overlap × 2
  const typeOverlap = styles.filter(s => dest.type?.includes(s)).length;
  score += typeOverlap * 2;

  // Season match × 1 (current month)
  const currentMonth = new Date().getMonth() + 1;
  if (dest.bestMonths?.includes(currentMonth)) score += 1;

  // Family scoring
  if (plannerState.group === 'family') {
    if (familyProfile.hasChildren) {
      if (dest.tags?.includes('child_friendly')) score += 2;
      if (dest.tags?.includes('near_center')) score += 1;
    }
    if (familyProfile.mobilityLimit) {
      if (!dest.tags?.includes('elderly_accessible')) score -= 3;
      if (dest.tags?.includes('near_center')) score += 1;
    }
  }

  return score;
}

// ===== STEP 2: RENDER RECOMMENDATIONS =====
function renderRecommendations() {
  const lang = i18n.getLang();
  const grid = document.getElementById('rec-grid');
  const empty = document.getElementById('rec-empty');
  if (!grid) return;

  const scored = allDestinations
    .map(d => ({ ...d, score: scoreDestination(d) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!scored.length) {
    grid.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');

  grid.innerHTML = scored.map(dest => buildRecCardHTML(dest, lang)).join('');

  // Event delegation — click anywhere on card opens detail modal
  grid.onclick = (e) => {
    const card = e.target.closest('.rec-card');
    if (!card) return;
    toggleRecCard(card);
  };

  grid.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.rec-card');
      if (card) toggleRecCard(card);
    }
  };

  updateRecCount();
}

function buildRecCardHTML(dest, lang) {
  const name = dest.name[lang] || dest.name.vi;
  const region = dest.region[lang] || dest.region.vi;
  const isSelected = plannerState.selectedDestinations.includes(dest.id);
  const matchPct = dest.score > 0 ? Math.min(100, Math.round(dest.score * 10)) : 0;

  const familyBadges = [];
  if (dest.tags?.includes('child_friendly'))    familyBadges.push(`<span class="badge badge--primary" style="font-size:10px">Thân thiện trẻ em</span>`);
  if (dest.tags?.includes('elderly_accessible')) familyBadges.push(`<span class="badge badge--success" style="font-size:10px">Dễ di chuyển</span>`);
  if (dest.tags?.includes('near_center'))        familyBadges.push(`<span class="badge" style="font-size:10px">Gần trung tâm</span>`);

  return `
    <div class="rec-card ${isSelected ? 'is-selected' : ''}" data-id="${dest.id}" role="button" tabindex="0" aria-pressed="${isSelected}">
      <div class="rec-card__check">✓</div>
      <div style="aspect-ratio:4/3;overflow:hidden;position:relative">
        <img src="${escapeHtml(dest.image)}" alt="${escapeHtml(name)}"
             style="width:100%;height:100%;object-fit:cover;transition:transform .3s"
             loading="lazy">
        ${matchPct ? `<span style="position:absolute;top:var(--space-2);left:var(--space-2);background:var(--color-primary);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:var(--radius-full)">Phù hợp ${matchPct}%</span>` : ''}
      </div>
      <div style="padding:var(--space-3) var(--space-4);display:flex;flex-direction:column;flex:1">
        <div style="display:flex;align-items:flex-start;gap:var(--space-2);margin-bottom:var(--space-1)">
          <h3 style="font-size:var(--text-xl);font-weight:700;color:var(--text-primary);line-height:1.35;flex:1;min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(name)}</h3>
          <span style="font-size:var(--text-xs);background:rgba(66,13,75,0.09);color:var(--color-primary);font-weight:700;padding:1px 6px;border-radius:4px;flex-shrink:0;white-space:nowrap">★ ${dest.rating}</span>
        </div>
        <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2)"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> ${escapeHtml(region)}</p>
        ${familyBadges.length ? `<div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-2)">${familyBadges.join('')}</div>` : ''}
        <div style="border-top:1px solid var(--border-color);padding-top:var(--space-2);margin-top:auto">
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:1px">Từ</p>
          <p style="font-size:var(--text-base);font-weight:700;color:var(--color-accent);margin-top:var(--space-1)">${formatVND(dest.priceFrom)}</p>
        </div>
      </div>
    </div>`;
}

function buildRecCardDetailHTML(dest, lang) {
  const why = generateWhySentence(dest, lang);
  const acc = getSelectedAccommodation(dest);
  const transport = getSelectedTransport(dest.id);
  const nights = Math.max(1, plannerState.duration - 1);
  const accCost = acc ? acc.pricePerNight * nights : 0;
  const transCost = transport ? transport.priceFrom : 0;
  const totalEst = accCost + transCost;

  const accOptions = (dest.accommodations || []).map((a, i) => {
    const isSel = getSelectedAccommodationIdx(dest) === i;
    return `<div class="acc-option ${isSel ? 'is-selected' : ''}" data-acc-opt="${i}">
      <strong>${escapeHtml(a.name)}</strong> · ${'★'.repeat(a.stars)} · ${formatVND(a.pricePerNight)}/đêm<br>
      <span style="font-size:10px;color:var(--text-muted)">${escapeHtml(a.highlight?.[lang] || a.highlight?.vi || '')}</span>
    </div>`;
  }).join('');

  const transOptions = getTransportOptions(dest.id);
  const selectedTransIdx = plannerState.selectedTransport?.[dest.id] ?? 0;
  const transOptionsHTML = transOptions.length
    ? transOptions.map((t, i) => `<div class="trans-option ${selectedTransIdx === i ? 'is-selected' : ''}" data-trans-opt="${i}">${t.icon} ${escapeHtml(t.label)} · ${t.duration}p · ${formatVND(t.priceFrom)}</div>`).join('')
    : `<div style="font-size:var(--text-xs);color:var(--text-muted);padding:var(--space-2)">Chưa có thông tin phương tiện</div>`;

  return `
    <p class="rec-card__why">${escapeHtml(why)}</p>
    ${acc ? `
    <div class="rec-card__section">
      <div class="rec-card__section-header">
        <span style="font-size:var(--text-xs);font-weight:700"><i class="fa-solid fa-hotel" aria-hidden="true"></i> ${escapeHtml(acc.name)} ${'★'.repeat(acc.stars)}</span>
        <button class="btn btn--soft btn--sm" data-swap-acc="${dest.id}" style="font-size:11px;padding:2px 10px">Đổi phòng khác</button>
      </div>
      <p style="font-size:11px;color:var(--text-muted);margin-top:4px">${escapeHtml(acc.location)} · ${formatVND(acc.pricePerNight)}/đêm × ${nights} đêm = ${formatVND(accCost)}</p>
      <div class="acc-swap-panel">${accOptions}</div>
    </div>` : ''}
    ${transport && plannerState.transportNeed !== 'self' ? `
    <div class="rec-card__section">
      <div class="rec-card__section-header">
        <span style="font-size:var(--text-xs);font-weight:700">${transport.icon} ${escapeHtml(transport.label)}</span>
        <button class="btn btn--soft btn--sm" data-swap-trans="${dest.id}" style="font-size:11px;padding:2px 10px">Đổi lựa chọn</button>
      </div>
      <p style="font-size:11px;color:var(--text-muted);margin-top:4px">${transport.duration} phút · từ ${formatVND(transport.priceFrom)}</p>
      <div class="trans-swap-panel">${transOptionsHTML}</div>
    </div>` : ''}
    <div style="border-top:1px solid var(--border-color);padding-top:var(--space-3);margin-top:var(--space-2)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:var(--text-xs);color:var(--text-muted)">Chi phí ước tính (nơi ở + di chuyển)</span>
        <span style="font-size:var(--text-sm);font-weight:700;color:var(--color-primary)">${formatVND(totalEst)}</span>
      </div>
    </div>`;
}


function toggleRecCard(card) {
  const id = card.dataset.id;
  const alreadySelected = plannerState.selectedDestinations.includes(id);

  plannerState.selectedDestinations = [];
  document.querySelectorAll('.rec-card').forEach(c => {
    c.classList.remove('is-selected');
    c.setAttribute('aria-pressed', 'false');
  });

  if (!alreadySelected) {
    plannerState.selectedDestinations.push(id);
    card.classList.add('is-selected');
    card.setAttribute('aria-pressed', 'true');
    const dest = allDestinations.find(d => d.id === id);
    if (dest) showRecDetailModal(dest, i18n.getLang());
  }

  updateRecCount();
  saveDraft();
}

function showRecDetailModal(dest, lang) {
  document.getElementById('rec-detail-modal')?.remove();

  const name = dest.name[lang] || dest.name.vi;
  const region = dest.region[lang] || dest.region.vi;

  const overlay = document.createElement('div');
  overlay.id = 'rec-detail-modal';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'background:rgba(0,0,0,0.52)',
    'z-index:var(--z-modal,900)', 'display:flex', 'align-items:center',
    'justify-content:center', 'padding:var(--space-4)', 'animation:fadeIn .15s ease',
  ].join(';');

  overlay.innerHTML = `
    <div style="background:white;border-radius:var(--radius-2xl,20px);max-width:480px;width:100%;max-height:88vh;overflow-y:auto;box-shadow:var(--shadow-xl);display:flex;flex-direction:column">
      <!-- Hero image -->
      <div style="position:relative;aspect-ratio:16/7;overflow:hidden;border-radius:var(--radius-2xl,20px) var(--radius-2xl,20px) 0 0;flex-shrink:0">
        <img src="${escapeHtml(dest.image)}" alt="${escapeHtml(name)}"
             style="width:100%;height:100%;object-fit:cover">
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.55) 0%,transparent 55%)"></div>
        <button id="close-rec-modal" aria-label="Đóng"
                style="position:absolute;top:var(--space-3);right:var(--space-3);width:32px;height:32px;border:none;background:rgba(0,0,0,0.4);color:white;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)">✕</button>
        <div style="position:absolute;bottom:var(--space-4);left:var(--space-5)">
          <p style="font-size:var(--text-xs);color:rgba(255,255,255,0.8);margin-bottom:2px"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> ${escapeHtml(region)}</p>
          <h3 style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:700;color:white;line-height:1.2">${escapeHtml(name)}</h3>
        </div>
      </div>
      <!-- Body -->
      <div id="rec-detail-modal-body" style="padding:var(--space-5);flex:1;overflow-y:auto">
        ${buildRecCardDetailHTML(dest, lang)}
      </div>
      <!-- Footer -->
      <div style="padding:var(--space-4) var(--space-5);border-top:1px solid var(--border-color);display:flex;gap:var(--space-3);flex-shrink:0">
        <button class="btn btn--secondary" id="cancel-rec-modal" style="flex:1">Chọn điểm khác</button>
        <button class="btn btn--primary" id="confirm-rec-modal" style="flex:1.5">Chọn điểm này ✓</button>
      </div>
    </div>`;

  function closeAndDeselect() {
    overlay.remove();
    document.removeEventListener('keydown', escHandler);
    plannerState.selectedDestinations = plannerState.selectedDestinations.filter(id => id !== dest.id);
    const card = document.querySelector(`.rec-card[data-id="${dest.id}"]`);
    if (card) { card.classList.remove('is-selected'); card.setAttribute('aria-pressed', 'false'); }
    updateRecCount();
    saveDraft();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { closeAndDeselect(); return; }
    if (e.target.closest('#close-rec-modal') || e.target.closest('#cancel-rec-modal')) { closeAndDeselect(); return; }
    if (e.target.closest('#confirm-rec-modal')) { overlay.remove(); document.removeEventListener('keydown', escHandler); return; }

    // Swap panels inside modal
    if (e.target.closest('[data-swap-acc]')) {
      e.stopPropagation();
      overlay.querySelector('.acc-swap-panel')?.classList.toggle('is-open');
      return;
    }
    if (e.target.closest('[data-swap-trans]')) {
      e.stopPropagation();
      overlay.querySelector('.trans-swap-panel')?.classList.toggle('is-open');
      return;
    }
    const accOpt = e.target.closest('[data-acc-opt]');
    if (accOpt) {
      e.stopPropagation();
      const newIdx = +accOpt.dataset.accOpt;
      confirmAccIfOverBudget(dest, newIdx, () => {
        plannerState.selectedAccommodation ??= {};
        plannerState.selectedAccommodation[dest.id] = newIdx;
        const body = document.getElementById('rec-detail-modal-body');
        if (body) body.innerHTML = buildRecCardDetailHTML(dest, lang);
        saveDraft();
      });
      return;
    }
    const transOpt = e.target.closest('[data-trans-opt]');
    if (transOpt) {
      e.stopPropagation();
      plannerState.selectedTransport ??= {};
      plannerState.selectedTransport[dest.id] = +transOpt.dataset.transOpt;
      const body = document.getElementById('rec-detail-modal-body');
      if (body) body.innerHTML = buildRecCardDetailHTML(dest, lang);
      saveDraft();
      return;
    }
  });

  const escHandler = (e) => { if (e.key === 'Escape') closeAndDeselect(); };
  document.addEventListener('keydown', escHandler);
  document.body.appendChild(overlay);
}

function updateRecCount() {
  const el = document.getElementById('rec-count');
  if (el) el.textContent = plannerState.selectedDestinations.length;
}

// ===== STEP 3: DAY BUILDER =====
function renderDayBuilder() {
  const lang = i18n.getLang();
  const builder = document.getElementById('day-builder');
  if (!builder) return;

  const duration = plannerState.duration;
  const selectedDests = plannerState.selectedDestinations
    .map(id => allDestinations.find(d => d.id === id))
    .filter(Boolean);

  // Distribute days among destinations
  const daysPerDest = distributeDays(duration, selectedDests.length);

  builder.innerHTML = '';
  dayToDestMap = {};

  let dayIndex = 0;
  selectedDests.forEach((dest, di) => {
    const days = daysPerDest[di];
    const destName = dest.name[lang] || dest.name.vi;

    for (let d = 0; d < days; d++) {
      dayToDestMap[dayIndex] = dest.id;
      const col = buildDayColumn(dayIndex, d === 0 ? destName : '', dest, lang, d === 0);
      builder.appendChild(col);
      dayIndex++;
    }

    // Transport indicator between destinations
    if (di < selectedDests.length - 1) {
      const transport = document.createElement('div');
      transport.className = 'day-col day-transport';
      transport.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:var(--space-2);padding:var(--space-2) 0;color:var(--text-muted);font-size:var(--text-xs)';
      transport.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-2);color:var(--text-muted);font-size:var(--text-xs);text-align:center">
        <i class="bi bi-airplane" style="font-size:1.4rem" aria-hidden="true"></i>
        <span>Di chuyển</span>
      </div>`;
      builder.appendChild(transport);
    }
  });

  renderTripDashboard(selectedDests);
  renderActivitySidebar(selectedDests, lang);
  renderRouteMap(selectedDests);
  updateCostSummary();

  // Bind souvenir suggestion chips
  builder.querySelectorAll('[data-suggest-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const actId = btn.dataset.suggestAdd;
      const dIdx = +btn.dataset.day;
      confirmIfOverBudget(actId, () => {
        if (!plannerState.dayActivities[dIdx]) plannerState.dayActivities[dIdx] = [];
        plannerState.dayActivities[dIdx].push(actId);
        renderDayBuilder();
        updateCostSummary();
        saveDraft();
        Toast.show('Đã thêm vào lịch trình', 'success', 1500);
      });
    });
  });
}

function distributeDays(total, count) {
  if (!count) return [];
  const base = Math.floor(total / count);
  const extra = total % count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

function buildDayColumn(dayIndex, destName, dest, lang, isFirstDay = false) {
  const existing = plannerState.dayActivities[dayIndex];
  // hasBeenSet: user explicitly set this day (even to empty []) → don't auto-populate
  const hasBeenSet = dayIndex in plannerState.dayActivities;
  const validForDest = hasBeenSet && (!existing?.length || existing.every(actId => {
    if (plannerState.customActivities?.[actId]) return true;
    const act = allActivities.find(a => a.id === actId);
    return act?.destinationId === dest.id;
  }));

  if (!validForDest) {
    // Clear stale overrides for this day
    if (plannerState.activityOverrides) {
      Object.keys(plannerState.activityOverrides)
        .filter(k => k.startsWith(`${dayIndex}-`))
        .forEach(k => delete plannerState.activityOverrides[k]);
    }
    const destActivities = allActivities.filter(a => {
      if (a.destinationId !== dest.id) return false;
      if (plannerState.group === 'family') {
        const fp = plannerState.familyProfile;
        if (fp.hasChildren && a.tags?.includes('not_for_kids')) return false;
        if (fp.mobilityLimit && a.tags?.includes('not_accessible')) return false;
      }
      return true;
    });

    // Collect activity IDs already used on other days for this destination
    const usedIds = new Set();
    Object.entries(plannerState.dayActivities).forEach(([idx, ids]) => {
      if (+idx !== dayIndex) {
        ids.forEach(id => {
          if (allActivities.find(a => a.id === id)?.destinationId === dest.id) usedIds.add(id);
        });
      }
    });

    // Prefer activities not yet used; if all used, leave day empty (user can add from sidebar)
    const hasUnused = destActivities.some(a => !usedIds.has(a.id));
    if (!hasUnused) {
      plannerState.dayActivities[dayIndex] = [];
    } else {
      const sorted = [
        ...destActivities.filter(a => !usedIds.has(a.id)),
        ...destActivities.filter(a => usedIds.has(a.id)),
      ];
      plannerState.dayActivities[dayIndex] = pickNonOverlapping(sorted, 2).map(a => a.id);
    }
  } else if (existing?.length) {
    // validForDest path: remove activities already assigned to an earlier day
    const usedInEarlierDays = new Set(
      Object.entries(plannerState.dayActivities)
        .filter(([idx]) => +idx < dayIndex)
        .flatMap(([, ids]) => ids)
    );
    const deduped = existing.filter(id => !usedInEarlierDays.has(id));
    if (deduped.length !== existing.length) {
      plannerState.dayActivities[dayIndex] = deduped;
    }
  }

  const col = document.createElement('div');
  col.className = 'day-col';
  col.dataset.day = dayIndex;

  const header = `
    <div class="day-col__header">
      <span>Ngày ${dayIndex + 1}</span>

      
    
      
      <button class="tl-card__btn" data-optimize-day="${dayIndex}" aria-label="Tối ưu tuyến đường ngày ${dayIndex + 1}" style="color:rgba(255,255,255,0.8);font-size:var(--text-sm)" title="Tối ưu tuyến"><i class="bi bi-signpost-2" aria-hidden="true"></i></button>
    </div>`;

  const timeline = buildTimeline(dayIndex, dest, lang, isFirstDay);

  col.innerHTML = header + timeline;
  return col;
}

function buildTimeline(dayIndex, dest, lang, isFirstDay = false) {
  // Fixed anchor cards at top of first day per destination
  let fixedCardsHTML = '';
  if (isFirstDay) {
    const transport = getSelectedTransport(dest.id);
    const acc = getSelectedAccommodation(dest);
    if (transport) {
      fixedCardsHTML += `
        <div class="tl-item">
          <span class="tl-dot tl-dot--fixed"></span>
          <div class="tl-card tl-card--transport">
            <div class="tl-card__header">
              <span class="tl-card__name">${transport.icon} ${escapeHtml(transport.label)}</span>
            </div>
            <div class="tl-card__cost" style="color:rgba(255,255,255,0.85)">${transport.duration} phút · ${formatVND(transport.priceFrom)}</div>
          </div>
        </div>`;
    }
    if (acc) {
      fixedCardsHTML += `
        <div class="tl-item">
          <span class="tl-dot tl-dot--fixed"></span>
          <div class="tl-card tl-card--checkin">
            <div class="tl-card__header">
              <span class="tl-card__name"><i class="fa-solid fa-hotel" aria-hidden="true"></i> ${escapeHtml(acc.name)}</span>
            </div>
            <div class="tl-card__cost" style="color:rgba(255,255,255,0.85)">Check-in 14:00 · ${formatVND(acc.pricePerNight)}/đêm</div>
          </div>
        </div>`;
    }
  }

  const activityIds = [...(plannerState.dayActivities[dayIndex] || [])].sort((a, b) => {
    const tA = getEffectiveTime(a, dayIndex) || '23:59';
    const tB = getEffectiveTime(b, dayIndex) || '23:59';
    return tA.localeCompare(tB);
  });
  let itemsHTML = '';
  activityIds.forEach(actId => {
    const act = findActivity(actId);
    if (!act) return;
    const startTime = getEffectiveTime(actId, dayIndex);
    const name = act.name[lang] || act.name.vi;
    const fixedBadge = act.timeFixed
      ? `<span class="tl-card__fixed-badge" title="Giờ cố định">🔒</span>`
      : '';
    itemsHTML += `
      <div class="tl-item" data-act-id="${act.id}" data-day="${dayIndex}">
        <span class="tl-dot"></span>
        <div class="tl-card">
          <div class="tl-card__header">
            <span class="tl-card__name">${escapeHtml(name)}</span>
            ${fixedBadge}
            <div class="tl-card__actions">
              <button class="tl-card__btn" data-move-act="${act.id}" data-day="${dayIndex}" aria-label="Chuyển ngày">⇄</button>
              <button class="tl-card__btn" data-remove-act="${act.id}" data-day="${dayIndex}" aria-label="Xóa">×</button>
            </div>
          </div>
          <input class="tl-card__time" type="time" value="${startTime}"
                 data-time-act="${act.id}" data-day="${dayIndex}" aria-label="Giờ bắt đầu">
          <div class="tl-card__cost">${formatVND(act.estimatedCost)}</div>
        </div>
      </div>`;

    // Souvenir suggestion chips — nearby souvenir/food_specialty within 500m
    const actCoords = act.coordinates;
    const destId = dayToDestMap[dayIndex];
    if (actCoords && destId) {
      const alreadyAdded = new Set(Object.values(plannerState.dayActivities).flat());
      const nearby = allActivities.filter(s =>
        s.destinationId === destId &&
        (s.category === 'souvenir' || s.category === 'food_specialty') &&
        s.coordinates &&
        !alreadyAdded.has(s.id) &&
        haversine(actCoords, s.coordinates) < 0.5
      );
      nearby.forEach(s => {
        const sName = s.name[lang] || s.name.vi;
        const icon = s.category === 'souvenir' ? 'bi-bag-heart' : 'bi-egg-fried';
        const label = s.category === 'souvenir' ? 'Quà lưu niệm' : 'Đặc sản ăn uống';
        itemsHTML += `
          <div class="tl-suggestion tl-suggestion--${s.category}">
            <div class="tl-suggestion__badge"><i class="bi ${icon}" aria-hidden="true"></i> ${label}</div>
            <div class="tl-suggestion__name">${escapeHtml(sName)}</div>
            <div class="tl-suggestion__meta">${s.duration} phút · từ ${formatVND(s.estimatedCost)}</div>
            <button class="tl-suggestion__add" data-suggest-add="${s.id}" data-day="${dayIndex}">＋ Thêm vào lịch trình</button>
          </div>`;
      });
    }
  });

  return `
    <div class="day-timeline" data-day="${dayIndex}">
      ${fixedCardsHTML}
      ${itemsHTML}
      <div class="tl-empty" data-open-picker="${dayIndex}">＋ Thêm hoạt động</div>
    </div>`;
}

function timeToPixels(startTime, durationMin) {
  const [h, m] = startTime.split(':').map(Number);
  const startHour = h + m / 60;
  const top = (startHour - TIMELINE_START) * PX_PER_HOUR;
  const height = (durationMin / 60) * PX_PER_HOUR;
  return { top, height };
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function pickNonOverlapping(activities, maxCount = 2) {
  const result = [];
  for (const act of activities) {
    const s = timeToMinutes(act.startTime);
    const e = s + act.duration;
    const conflicts = result.some(r => {
      const rs = timeToMinutes(r.startTime);
      return s < rs + r.duration && e > rs;
    });
    if (!conflicts) {
      result.push(act);
      if (result.length >= maxCount) break;
    }
  }
  return result;
}

// ===== DRAG & DROP + REMOVE =====

function handleBuilderClick(e) {
  // Move to day — picker button selected a target day
  const moveTarget = e.target.closest('[data-move-to-day]');
  if (moveTarget) {
    const actId = moveTarget.dataset.actId;
    const fromDay = +moveTarget.dataset.fromDay;
    const toDay = +moveTarget.dataset.moveToDay;
    document.querySelector('.day-picker-popup')?.remove();
    moveActivityToDay(actId, fromDay, toDay);
    return;
  }

  // Move button — open day picker popup
  const moveBtn = e.target.closest('[data-move-act]');
  if (moveBtn) {
    e.stopPropagation();
    showDayPicker(moveBtn);
    return;
  }

  // Remove button
  const removeBtn = e.target.closest('[data-remove-act]');
  if (!removeBtn) return;
  const actId = removeBtn.dataset.removeAct;
  const dayIndex = +removeBtn.dataset.day;
  plannerState.dayActivities[dayIndex] = (plannerState.dayActivities[dayIndex] || []).filter(id => id !== actId);
  if (plannerState.activityOverrides) delete plannerState.activityOverrides[`${dayIndex}-${actId}`];
  renderDayBuilder();
  updateCostSummary();
  saveDraft();
}

function showDayPicker(btn) {
  document.querySelector('.day-picker-popup')?.remove();

  const actId = btn.dataset.moveAct;
  const fromDay = +btn.dataset.day;
  const isCustom = !!plannerState.customActivities?.[actId];
  const actDestId = allActivities.find(a => a.id === actId)?.destinationId;

  // Custom activities can move to any day; standard activities stay within same destination
  const availableDays = Object.keys(dayToDestMap)
    .map(Number)
    .filter(i => i !== fromDay && (isCustom || dayToDestMap[i] === actDestId));

  if (!availableDays.length) {
    Toast.show('Không có ngày nào khác cùng điểm đến', 'info', 1800);
    return;
  }

  const popup = document.createElement('div');
  popup.className = 'day-picker-popup';
  popup.style.cssText = [
    'position:fixed',
    'background:white',
    'border:1px solid var(--border-color)',
    'border-radius:var(--radius-lg)',
    'box-shadow:var(--shadow-md)',
    'padding:var(--space-3)',
    'z-index:1000',
    'font-size:var(--text-xs)',
    'min-width:160px',
  ].join(';');

  const rect = btn.getBoundingClientRect();
  popup.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - 120)}px`;
  popup.style.left = `${Math.max(0, Math.min(rect.left, window.innerWidth - 170))}px`;

  popup.innerHTML = `
    <p style="font-weight:600;margin-bottom:var(--space-2);color:var(--text-muted);white-space:nowrap">Chuyển sang ngày:</p>
    <div style="display:flex;flex-wrap:wrap;gap:var(--space-1)">
      ${availableDays.map(i => `
        <button style="padding:3px 10px;border:1px solid var(--border-color);border-radius:var(--radius-md);background:white;cursor:pointer;font-size:var(--text-xs);font-weight:600;color:var(--text-primary);transition:background .15s"
                onmouseover="this.style.background='var(--bg-alt)'"
                onmouseout="this.style.background='white'"
                data-move-to-day="${i}" data-from-day="${fromDay}" data-act-id="${actId}">
          Ngày ${i + 1}
        </button>`).join('')}
    </div>`;

  // Handle day selection directly on popup (popup is in body, outside #day-builder)
  popup.addEventListener('click', (ev) => {
    const dayBtn = ev.target.closest('[data-move-to-day]');
    if (!dayBtn) return;
    const tActId = dayBtn.dataset.actId;
    const tFromDay = +dayBtn.dataset.fromDay;
    const tToDay = +dayBtn.dataset.moveToDay;
    popup.remove();
    moveActivityToDay(tActId, tFromDay, tToDay);
  });

  document.body.appendChild(popup);

  // Close on outside click
  setTimeout(() => {
    function closeHandler(ev) {
      if (!popup.contains(ev.target) && ev.target !== btn) {
        popup.remove();
        document.removeEventListener('click', closeHandler);
      }
    }
    document.addEventListener('click', closeHandler);
  }, 0);
}

function moveActivityToDay(actId, fromDay, toDay, newTime = null) {
  // Remove from source day (keep the key so validForDest stays true)
  plannerState.dayActivities[fromDay] = (plannerState.dayActivities[fromDay] || []).filter(id => id !== actId);
  if (plannerState.activityOverrides) delete plannerState.activityOverrides[`${fromDay}-${actId}`];

  // Add to target day (avoid duplicate)
  if (!plannerState.dayActivities[toDay]) plannerState.dayActivities[toDay] = [];
  if (!plannerState.dayActivities[toDay].includes(actId)) {
    plannerState.dayActivities[toDay].push(actId);
  }

  // Preserve dropped time on target day
  if (newTime) {
    if (!plannerState.activityOverrides) plannerState.activityOverrides = {};
    plannerState.activityOverrides[`${toDay}-${actId}`] = { startTime: newTime };
  }

  renderDayBuilder();
  updateCostSummary();
  saveDraft();
  Toast.show(`Đã chuyển sang Ngày ${toDay + 1}`, 'success', 1500);
}

function startDrag(block, clientX, clientY) {
  const actId = block.dataset.actId;
  const dayIndex = +block.dataset.day;
  const act = allActivities.find(a => a.id === actId);
  if (!act) return;
  const currentTime = plannerState.activityOverrides?.[`${dayIndex}-${actId}`]?.startTime || act.startTime;
  drag = { block, actId, dayIndex, targetDay: dayIndex, startY: clientY, startX: clientX, origMin: timeToMinutes(currentTime) };
  block.style.opacity = '0.75';
  block.style.zIndex = '10';
  block.style.transition = 'none';
  block.classList.add('is-dragging');
}

function getTargetDayFromPoint(clientX, clientY) {
  // Temporarily disable pointer-events so elementFromPoint skips the dragged block
  drag.block.style.pointerEvents = 'none';
  const el = document.elementFromPoint(clientX, clientY);
  drag.block.style.pointerEvents = '';
  const col = el?.closest('.day-col[data-day]');
  return col ? +col.dataset.day : drag.dayIndex;
}

function moveDrag(clientX, clientY) {
  if (!drag) return;
  const act = allActivities.find(a => a.id === drag.actId);
  const maxMin = TIMELINE_END * 60 - (act?.duration || 60);
  const snapped = Math.round(((clientY - drag.startY) / PX_PER_HOUR * 60) / 15) * 15;
  const newMin = Math.max(TIMELINE_START * 60, Math.min(maxMin, drag.origMin + snapped));
  drag.block.style.top = `${((newMin / 60) - TIMELINE_START) * PX_PER_HOUR}px`;
  const timeEl = drag.block.querySelector('.activity-block__time');
  if (timeEl) timeEl.textContent = minutesToTime(newMin);

  // Detect target column for cross-day drag
  const targetDay = getTargetDayFromPoint(clientX, clientY);
  if (targetDay !== drag.targetDay) {
    document.querySelectorAll('.day-col[data-day]').forEach(c => c.classList.remove('is-drag-target'));
    if (targetDay !== drag.dayIndex) {
      document.querySelector(`.day-col[data-day="${targetDay}"]`)?.classList.add('is-drag-target');
    }
    drag.targetDay = targetDay;
  }
}

function endDrag(clientX, clientY) {
  if (!drag) return;
  const act = allActivities.find(a => a.id === drag.actId);
  const maxMin = TIMELINE_END * 60 - (act?.duration || 60);
  const snapped = Math.round(((clientY - drag.startY) / PX_PER_HOUR * 60) / 15) * 15;
  const newMin = Math.max(TIMELINE_START * 60, Math.min(maxMin, drag.origMin + snapped));
  const newTime = minutesToTime(newMin);

  const fromDay = drag.dayIndex;
  const targetDay = getTargetDayFromPoint(clientX, clientY);
  const actId = drag.actId;

  document.querySelectorAll('.day-col[data-day]').forEach(c => c.classList.remove('is-drag-target'));
  drag = null;

  if (targetDay !== fromDay) {
    moveActivityToDay(actId, fromDay, targetDay, newTime);
  } else {
    if (!plannerState.activityOverrides) plannerState.activityOverrides = {};
    plannerState.activityOverrides[`${fromDay}-${actId}`] = { startTime: newTime };
    renderDayBuilder();
    updateCostSummary();
    saveDraft();
  }
}

function handleDragMouseDown(e) {
  const block = e.target.closest('.activity-block');
  if (!block || e.target.closest('[data-remove-act]') || e.target.closest('[data-move-act]')) return;
  e.preventDefault();
  startDrag(block, e.clientX, e.clientY);
}

function handleDragMouseMove(e) { moveDrag(e.clientX, e.clientY); }
function handleDragMouseUp(e) { endDrag(e.clientX, e.clientY); }

function handleDragTouchStart(e) {
  const block = e.target.closest('.activity-block');
  if (!block || e.target.closest('[data-remove-act]') || e.target.closest('[data-move-act]')) return;
  startDrag(block, e.touches[0].clientX, e.touches[0].clientY);
}

function handleDragTouchMove(e) {
  if (!drag) return;
  e.preventDefault();
  moveDrag(e.touches[0].clientX, e.touches[0].clientY);
}

function handleDragTouchEnd(e) { endDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY); }

function bindDayBuilderEvents() {
  const builder = document.getElementById('day-builder');
  if (!builder) return;

  builder.addEventListener('click', (e) => {
    // tl-empty → open picker
    const emptySlot = e.target.closest('[data-open-picker]');
    if (emptySlot) {
      const dayIndex = +emptySlot.dataset.openPicker;
      openActivityPicker(dayIndex, emptySlot);
      return;
    }
    // optimize button
    const optimizeBtn = e.target.closest('[data-optimize-day]');
    if (optimizeBtn) {
      optimizeDayRoute(+optimizeBtn.dataset.optimizeDay);
      return;
    }
    // track focus day on column click (for sidebar)
    const col = e.target.closest('.day-col[data-day]');
    if (col) currentFocusDay = +col.dataset.day;

    handleBuilderClick(e);
  });
  builder.addEventListener('change', (e) => {
    const input = e.target.closest('[data-time-act]');
    if (!input || !input.value) return;
    const actId = input.dataset.timeAct;
    const dayIndex = +input.dataset.day;
    if (!plannerState.activityOverrides) plannerState.activityOverrides = {};
    plannerState.activityOverrides[`${dayIndex}-${actId}`] = { startTime: input.value };
    if (plannerState.dayActivities[dayIndex]?.length > 1) {
      plannerState.dayActivities[dayIndex].sort((a, b) =>
        timeToMinutes(getEffectiveTime(a, dayIndex)) - timeToMinutes(getEffectiveTime(b, dayIndex))
      );
      renderDayBuilder();
    }
    updateCostSummary();
    saveDraft();
  });
  builder.addEventListener('mousedown', handleDragMouseDown);
  builder.addEventListener('touchstart', handleDragTouchStart, { passive: true });

  if (!dayBuilderDocEventsAdded) {
    dayBuilderDocEventsAdded = true;
    document.addEventListener('mousemove', handleDragMouseMove);
    document.addEventListener('mouseup', handleDragMouseUp);
    document.addEventListener('touchmove', handleDragTouchMove, { passive: false });
    document.addEventListener('touchend', handleDragTouchEnd);
  }
}

function renderActivitySidebar(dests, lang) {
  const list = document.getElementById('activity-list');
  if (!list) return;

  const destIds = dests.map(d => d.id);
  const available = allActivities.filter(a => {
    if (!destIds.includes(a.destinationId)) return false;
    if (plannerState.group === 'family') {
      const fp = plannerState.familyProfile;
      if (fp.hasChildren && a.tags?.includes('not_for_kids')) return false;
      if (fp.mobilityLimit && a.tags?.includes('not_accessible')) return false;
    }
    return true;
  });

  list.innerHTML = available.map(act => {
    const name = act.name[lang] || act.name.vi;
    return `
      <div style="padding:var(--space-3);background:white;border:1px solid var(--border-color);border-radius:var(--radius-lg);cursor:pointer;transition:border-color .15s"
           onmouseover="this.style.borderColor='var(--color-secondary)'"
           onmouseout="this.style.borderColor='var(--border-color)'"
           data-add-activity="${act.id}">
        <p style="font-size:var(--text-xs);font-weight:600;color:var(--text-primary)">${escapeHtml(name)}</p>
        <p style="font-size:10px;color:var(--text-muted);margin-top:2px">${act.startTime} · ${formatVND(act.estimatedCost)}</p>
      </div>`;
  }).join('');

  list.onclick = (e) => {
    const btn = e.target.closest('[data-add-activity]');
    if (!btn) return;
    const actId = btn.dataset.addActivity;
    // Check ALL days to avoid cross-day duplicates
    const alreadyAdded = Object.values(plannerState.dayActivities).some(ids => ids.includes(actId));
    if (!alreadyAdded) {
      const day = currentFocusDay;
      confirmIfOverBudget(actId, () => {
        if (!plannerState.dayActivities[day]) plannerState.dayActivities[day] = [];
        plannerState.dayActivities[day].push(actId);
        renderDayBuilder();
        updateCostSummary();
        saveDraft();
        Toast.show(i18n.t('toast.planner.added'), 'success', 1500);
      });
    }
  };
}

function renderRouteMap(dests) {
  const mapEl = document.getElementById('route-map');
  if (!mapEl || !dests.length) return;

  const lang = i18n.getLang();
  const points = dests.map(d => ({
    name: d.name[lang] || d.name.vi,
    lat: d.coordinates?.lat,
    lng: d.coordinates?.lng
  })).filter(p => p.lat && p.lng);

  // SVG route map (simple polyline visualization)
  if (points.length < 2) {
    mapEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:200px;flex-direction:column;gap:var(--space-3);color:var(--text-muted)">
      <i class="bi bi-geo-alt" style="font-size:2rem" aria-hidden="true"></i>
      <span style="font-size:var(--text-xs);text-align:center">${escapeHtml(points[0]?.name || '')}</span>
    </div>`;
    return;
  }

  // Normalize coords to SVG viewport
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 20;
  const W = 260, H = 180;

  const toSVG = (lat, lng) => {
    const x = pad + ((lng - minLng) / (maxLng - minLng || 1)) * (W - 2 * pad);
    const y = H - pad - ((lat - minLat) / (maxLat - minLat || 1)) * (H - 2 * pad);
    return { x, y };
  };

  const svgPoints = points.map(p => toSVG(p.lat, p.lng));
  const polyline = svgPoints.map(p => `${p.x},${p.y}`).join(' ');

  // Travel time labels between consecutive points
  const travelLabels = svgPoints.slice(0, -1).map((p, i) => {
    const next = svgPoints[i + 1];
    const mx = (p.x + next.x) / 2;
    const my = (p.y + next.y) / 2;
    const mins = travelEst(
      { lat: points[i].lat, lng: points[i].lng },
      { lat: points[i + 1].lat, lng: points[i + 1].lng }
    );
    const label = mins >= 60
      ? `${Math.floor(mins / 60)}g${mins % 60 ? (mins % 60) + 'p' : ''}`
      : `${mins}p`;
    return `<rect x="${mx - 14}" y="${my - 8}" width="28" height="13" rx="6" fill="white" stroke="var(--color-secondary)" stroke-width=".8" opacity=".9"/>
      <text x="${mx}" y="${my + 3}" font-size="7.5" fill="var(--color-secondary)" font-family="Inter,sans-serif" font-weight="600" text-anchor="middle">${escapeHtml(label)}</text>`;
  }).join('');

  mapEl.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:200px;background:#f8f5fc">
      <polyline points="${polyline}" fill="none" stroke="var(--color-secondary)" stroke-width="2" stroke-dasharray="4 3" opacity=".7"/>
      ${travelLabels}
      ${svgPoints.map((p, i) => {
        const labelX = p.x + 7;
        const labelY = p.y - 8;
        return `<circle cx="${p.x}" cy="${p.y}" r="5" fill="var(--color-primary)"/>
        <text x="${p.x}" y="${labelY}" font-size="9" fill="var(--color-darkest)" font-family="Inter,sans-serif" font-weight="600" text-anchor="middle">${escapeHtml(points[i].name)}</text>`;
      }).join('')}
    </svg>`;
}

// ===== HELPERS =====
function findActivity(actId) {
  return allActivities.find(a => a.id === actId)
    || plannerState.customActivities?.[actId]
    || null;
}

function getEffectiveTime(actId, dayIndex) {
  return plannerState.activityOverrides?.[`${dayIndex}-${actId}`]?.startTime
    || findActivity(actId)?.startTime
    || '09:00';
}

const AVG_SPEED_KM_PER_MIN = 0.5; // 30 km/h
const TRAVEL_BUFFER_MIN = 15;

function travelEst(fromCoords, toCoords) {
  if (!fromCoords || !toCoords) return TRAVEL_BUFFER_MIN;
  return Math.max(TRAVEL_BUFFER_MIN, Math.ceil(haversine(fromCoords, toCoords) / AVG_SPEED_KM_PER_MIN));
}

// ===== ACTIVITY PICKER POPUP =====
function openActivityPicker(dayIndex, anchorEl) {
  closeActivityPicker();
  activePickerDay = dayIndex;
  currentFocusDay = dayIndex;

  const destId = dayToDestMap[dayIndex];
  const lang = i18n.getLang();

  const available = allActivities.filter(a => {
    if (a.destinationId !== destId) return false;
    if (plannerState.group === 'family') {
      const fp = plannerState.familyProfile;
      if (fp.hasChildren && a.tags?.includes('not_for_kids')) return false;
      if (fp.mobilityLimit && a.tags?.includes('not_accessible')) return false;
    }
    const alreadyAdded = Object.values(plannerState.dayActivities).some(ids => ids.includes(a.id));
    return !alreadyAdded;
  });

  const itemsHTML = available.length
    ? available.map(act => {
        const name = act.name[lang] || act.name.vi;
        return `<div class="activity-picker-popup__item" data-picker-add="${act.id}">
          <span class="activity-picker-popup__item-name">${escapeHtml(name)}</span>
          <span class="activity-picker-popup__item-meta">${act.startTime} · ${formatVND(act.estimatedCost)}</span>
        </div>`;
      }).join('')
    : `<div style="padding:var(--space-3);font-size:var(--text-xs);color:var(--text-muted);text-align:center">Tất cả hoạt động đã được thêm</div>`;

  const popup = document.createElement('div');
  popup.className = 'activity-picker-popup';
  popup.id = 'activity-picker-popup';
  popup.innerHTML = `
    <div class="activity-picker-popup__title">Hoạt động gợi ý</div>
    ${itemsHTML}
    <div class="activity-picker-popup__divider"></div>
    <button class="activity-picker-popup__custom-btn" id="picker-custom-btn">＋ Thêm tùy chỉnh...</button>
    <div id="picker-custom-form" style="display:none"></div>`;

  // Hide before positioning to avoid flash
  popup.style.visibility = 'hidden';
  document.body.appendChild(popup);
  popup._anchorEl = anchorEl;

  // Position after browser layout so offsetHeight/Width are real
  requestAnimationFrame(() => {
    const rect = anchorEl.getBoundingClientRect();
    const popupW = popup.offsetWidth || 256;
    const popupH = popup.offsetHeight || 200;
    const gap = 6;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top;
    if (spaceBelow >= popupH + gap) {
      top = rect.bottom + gap;
    } else if (spaceAbove >= popupH + gap) {
      top = rect.top - popupH - gap;
    } else {
      // Not enough space either side — align to viewport with scroll
      top = Math.max(8, window.innerHeight - popupH - 8);
    }

    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popupW - 8));
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
    popup.style.visibility = '';

    // Track scroll from any scrollable ancestor so popup follows anchor
    popup._scrollHandler = () => repositionPickerPopup();
    window.addEventListener('scroll', popup._scrollHandler, { passive: true, capture: true });
  });

  // Click activity in popup → add to this day
  popup.addEventListener('click', (e) => {
    const item = e.target.closest('[data-picker-add]');
    if (item) {
      const actId = item.dataset.pickerAdd;
      closeActivityPicker();
      confirmIfOverBudget(actId, () => {
        if (!plannerState.dayActivities[dayIndex]) plannerState.dayActivities[dayIndex] = [];
        plannerState.dayActivities[dayIndex].push(actId);
        renderDayBuilder();
        updateCostSummary();
        saveDraft();
        Toast.show('Đã thêm hoạt động', 'success', 1500);
      });
    }
  });

  // Custom activity form
  document.getElementById('picker-custom-btn')?.addEventListener('click', () => {
    showCustomActivityForm(dayIndex);
  });

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('pointerdown', onPickerOutsideClick, { once: true });
  }, 0);
}

function onPickerOutsideClick(e) {
  const popup = document.getElementById('activity-picker-popup');
  if (popup && !popup.contains(e.target)) {
    closeActivityPicker();
  } else if (popup) {
    // Re-add listener if click was inside popup
    setTimeout(() => {
      document.addEventListener('pointerdown', onPickerOutsideClick, { once: true });
    }, 0);
  }
}

function repositionPickerPopup() {
  const popup = document.getElementById('activity-picker-popup');
  if (!popup || !popup._anchorEl) return;
  const rect = popup._anchorEl.getBoundingClientRect();
  const popupW = popup.offsetWidth || 256;
  const popupH = popup.offsetHeight;
  const gap = 6;
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  let top;
  if (spaceBelow >= popupH + gap) top = rect.bottom + gap;
  else if (spaceAbove >= popupH + gap) top = rect.top - popupH - gap;
  else top = Math.max(8, window.innerHeight - popupH - 8);
  popup.style.top = `${top}px`;
  popup.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - popupW - 8))}px`;
}

function closeActivityPicker() {
  const popup = document.getElementById('activity-picker-popup');
  if (popup?._scrollHandler) {
    window.removeEventListener('scroll', popup._scrollHandler, { capture: true });
  }
  popup?.remove();
  activePickerDay = null;
}

function showCustomActivityForm(dayIndex) {
  const formEl = document.getElementById('picker-custom-form');
  const btn = document.getElementById('picker-custom-btn');
  if (!formEl) return;
  btn?.setAttribute('style', 'display:none');
  formEl.style.display = 'block';

  // Reposition popup after form makes it taller
  requestAnimationFrame(() => {
    const popup = document.getElementById('activity-picker-popup');
    if (!popup || !popup._anchorEl) return;
    const rect = popup._anchorEl.getBoundingClientRect();
    const popupW = popup.offsetWidth || 256;
    const popupH = popup.offsetHeight;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    let top;
    if (spaceBelow >= popupH + gap) top = rect.bottom + gap;
    else if (spaceAbove >= popupH + gap) top = rect.top - popupH - gap;
    else top = Math.max(8, window.innerHeight - popupH - 8);
    popup.style.top = `${top}px`;
    popup.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - popupW - 8))}px`;
  });

  formEl.innerHTML = `
    <div class="activity-picker-popup__custom-form">
      <input id="custom-act-name" type="text" placeholder="Tên hoạt động" autocomplete="off">
      <input id="custom-act-place" type="text" placeholder="Địa điểm (tìm kiếm...)" autocomplete="off">
      <div id="custom-autocomplete-list"></div>
      <input id="custom-act-cost" type="number" placeholder="Chi phí (VND)" min="0" step="10000">
      <div class="activity-picker-popup__custom-actions">
        <button class="btn btn--secondary" id="custom-act-cancel">Hủy</button>
        <button class="btn btn--primary" id="custom-act-confirm">Thêm</button>
      </div>
    </div>`;

  // Destination coordinates for location-biased autocomplete results
  const destId = dayToDestMap[dayIndex];
  const destObj = allDestinations.find(d => d.id === destId);
  const destCoords = destObj?.coordinates?.lat
    ? { lat: destObj.coordinates.lat, lng: destObj.coordinates.lng }
    : null;

  let selectedCoords = null;
  let selectedPlaceId = null;
  let acResults = [];
  let autocompleteTimer = null;

  // Use event delegation on formEl — robust against innerHTML injection
  formEl.addEventListener('input', (e) => {
    if (e.target.id !== 'custom-act-place') return;
    selectedCoords = null;
    selectedPlaceId = null;
    clearTimeout(autocompleteTimer);
    const q = e.target.value.trim();
    const listEl = document.getElementById('custom-autocomplete-list');
    if (!listEl) return;
    if (q.length < 2) { listEl.innerHTML = ''; acResults = []; return; }
    listEl.innerHTML = '<div class="activity-picker-popup__autocomplete-item" style="color:var(--text-muted)">Đang tìm...</div>';
    autocompleteTimer = setTimeout(async () => {
      const raw = await placeAutocomplete(q, { location: destCoords });
      if (raw?.error === 'unauthorized') {
        listEl.innerHTML = '<div class="activity-picker-popup__autocomplete-item" style="color:#dc2626">API key chưa được cấp quyền Place Search</div>';
        return;
      }
      acResults = Array.isArray(raw) ? raw : [];
      listEl.innerHTML = acResults.length
        ? `<div class="activity-picker-popup__autocomplete">${acResults.map((r, i) =>
            `<div class="activity-picker-popup__autocomplete-item" data-place-idx="${i}" data-full="${escapeHtml(r.description)}">${escapeHtml(r.mainText)}<span style="display:block;font-size:10px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(r.secondaryText || '')}</span></div>`
          ).join('')}</div>`
        : '<div class="activity-picker-popup__autocomplete-item" style="color:var(--text-muted)">Không tìm thấy địa điểm</div>';
      bindAutocompleteTooltip(listEl);
    }, 300);
  });

  formEl.addEventListener('click', async (e) => {
    const item = e.target.closest('[data-place-idx]');
    if (!item) return;
    const idx = +item.dataset.placeIdx;
    const result = acResults[idx];
    if (!result) return;
    const placeInput = document.getElementById('custom-act-place');
    const listEl = document.getElementById('custom-autocomplete-list');
    if (placeInput) placeInput.value = result.description;
    if (listEl) listEl.innerHTML = '';
    selectedPlaceId = result.placeId;
    const coords = await getPlaceDetail(result.placeId);
    if (coords) selectedCoords = coords;
  });

  formEl.addEventListener('click', (e) => {
    if (e.target.id === 'custom-act-cancel') { closeActivityPicker(); return; }

    if (e.target.id === 'custom-act-confirm') {
      const name = document.getElementById('custom-act-name')?.value.trim();
      const cost = +(document.getElementById('custom-act-cost')?.value) || 0;
      if (!name) { Toast.show('Nhập tên hoạt động', 'warning', 1500); return; }
      if (!selectedCoords) { Toast.show('Chọn địa điểm từ gợi ý để lưu tọa độ', 'warning', 2000); return; }

      const actId = `custom-${Date.now()}`;
      const customAct = {
        id: actId,
        name: { vi: name, en: name },
        startTime: '09:00',
        duration: 60,
        estimatedCost: cost,
        coordinates: selectedCoords,
        isCustom: true,
      };
      if (!plannerState.customActivities) plannerState.customActivities = {};
      plannerState.customActivities[actId] = customAct;
      closeActivityPicker();
      confirmIfOverBudget(actId, () => {
        if (!plannerState.dayActivities[dayIndex]) plannerState.dayActivities[dayIndex] = [];
        plannerState.dayActivities[dayIndex].push(actId);
        renderDayBuilder();
        updateCostSummary();
        saveDraft();
        Toast.show('Đã thêm hoạt động tùy chỉnh', 'success', 1500);
      }, cost, name);
    }
  });
}

// ===== ROUTE OPTIMIZATION =====
async function optimizeDayRoute(dayIndex) {
  const actIds = plannerState.dayActivities[dayIndex];
  if (!actIds || actIds.length < 2) {
    Toast.show('Cần ít nhất 2 hoạt động để tối ưu', 'warning', 2000);
    return;
  }

  // 1. Classify: fixed-time anchors vs flexible
  const allActs = actIds.map(id => ({ id, act: findActivity(id) })).filter(x => x.act);
  const fixed = allActs
    .filter(({ act }) => act.timeFixed)
    .sort((a, b) => timeToMinutes(getEffectiveTime(a.id, dayIndex)) - timeToMinutes(getEffectiveTime(b.id, dayIndex)));
  const flexible = allActs.filter(({ act }) => !act.timeFixed);

  if (flexible.length === 0) {
    Toast.show('Tất cả hoạt động đã có giờ cố định, không cần tối ưu', 'info', 2000);
    return;
  }

  Toast.show('Đang tối ưu tuyến đường...', 'info', 1500);

  // 2. Geo-optimize flexible activities (only those with coordinates)
  const flexWithCoords = flexible.filter(({ act }) => act.coordinates);
  const flexWithoutCoords = flexible.filter(({ act }) => !act.coordinates);
  let optimizedFlexIds;
  if (flexWithCoords.length >= 2) {
    const waypoints = flexWithCoords.map(({ id, act }) => ({
      lat: act.coordinates.lat, lng: act.coordinates.lng, id,
    }));
    const order = await optimizeRoute(waypoints);
    optimizedFlexIds = [
      ...order.map(i => waypoints[i].id),
      ...flexWithoutCoords.map(x => x.id),
    ];
  } else {
    optimizedFlexIds = flexible.map(x => x.id);
  }

  // 3. Fixed anchors: start/end in minutes
  const fixedAnchors = fixed.map(({ id, act }) => {
    const startMin = timeToMinutes(getEffectiveTime(id, dayIndex));
    return { id, startMin, endMin: startMin + act.duration, coords: act.coordinates || null };
  });

  // 4. Greedy fill: interleave geo-ordered flex into time gaps between fixed anchors
  const newFlexOverrides = {};
  const finalOrder = [];
  let currentMin = TIMELINE_START * 60;
  let prevCoords = null;
  let anchorIdx = 0;
  let flexIdx = 0;

  while (flexIdx < optimizedFlexIds.length || anchorIdx < fixedAnchors.length) {
    const nextFixed = fixedAnchors[anchorIdx];
    const nextFlexId = optimizedFlexIds[flexIdx];
    const nextFlexAct = nextFlexId ? findActivity(nextFlexId) : null;

    if (!nextFlexId) {
      finalOrder.push(nextFixed.id);
      currentMin = nextFixed.endMin;
      prevCoords = nextFixed.coords;
      anchorIdx++;
      continue;
    }
    if (!nextFixed) {
      const travel = travelEst(prevCoords, nextFlexAct?.coordinates);
      const startMin = currentMin + travel;
      newFlexOverrides[`${dayIndex}-${nextFlexId}`] = { startTime: minutesToTime(startMin) };
      finalOrder.push(nextFlexId);
      currentMin = startMin + nextFlexAct.duration;
      prevCoords = nextFlexAct?.coordinates || prevCoords;
      flexIdx++;
      continue;
    }

    // Both available: can flex fit before the next fixed anchor?
    const travel = travelEst(prevCoords, nextFlexAct?.coordinates);
    const flexStart = currentMin + travel;
    const flexEnd = flexStart + nextFlexAct.duration;

    if (flexEnd <= nextFixed.startMin - TRAVEL_BUFFER_MIN) {
      newFlexOverrides[`${dayIndex}-${nextFlexId}`] = { startTime: minutesToTime(flexStart) };
      finalOrder.push(nextFlexId);
      currentMin = flexEnd;
      prevCoords = nextFlexAct?.coordinates || prevCoords;
      flexIdx++;
    } else {
      finalOrder.push(nextFixed.id);
      currentMin = nextFixed.endMin;
      prevCoords = nextFixed.coords;
      anchorIdx++;
    }
  }

  // 5. Apply
  plannerState.dayActivities[dayIndex] = finalOrder;
  if (!plannerState.activityOverrides) plannerState.activityOverrides = {};
  Object.assign(plannerState.activityOverrides, newFlexOverrides);
  renderDayBuilder();
  saveDraft();
  Toast.show('Tuyến đường đã tối ưu, giờ ước tính đã cập nhật', 'success', 2000);
}

// ===== BUDGET GUARD (Step 3) =====
function getBudgetCeiling() {
  const perPersonPerDay = { budget: 600000, mid: 1800000, luxury: Infinity };
  const rate = perPersonPerDay[plannerState.budget];
  if (!rate || rate === Infinity) return Infinity;
  return rate * Math.max(1, plannerState.travelers) * Math.max(1, plannerState.duration);
}

function calcCurrentTotal() {
  let total = 0;
  Object.values(plannerState.dayActivities).forEach(actIds => {
    (actIds || []).forEach(actId => {
      const act = findActivity(actId);
      if (act) total += act.estimatedCost || 0;
    });
  });
  const selectedDests = plannerState.selectedDestinations
    .map(id => allDestinations.find(d => d.id === id)).filter(Boolean);
  const daysPerDest = distributeDays(plannerState.duration, selectedDests.length);
  selectedDests.forEach((dest, di) => {
    const acc = getSelectedAccommodation(dest);
    if (acc) total += acc.pricePerNight * Math.max(1, daysPerDest[di] - 1);
    const tr = getSelectedTransport(dest.id);
    if (tr) total += tr.priceFrom;
  });
  return total;
}

function showBudgetConfirmDialog(actName, actCost, currentTotal, ceiling, onConfirm) {
  const projected = currentTotal + actCost;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:var(--z-modal);display:flex;align-items:center;justify-content:center;padding:var(--space-4)';
  overlay.innerHTML = `
    <div style="background:white;border-radius:var(--radius-xl);padding:var(--space-6);max-width:380px;width:100%;box-shadow:var(--shadow-xl);animation:detail-in .2s ease">
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
        <i class="bi bi-exclamation-triangle-fill" style="color:#f59e0b;font-size:1.5rem;flex-shrink:0" aria-hidden="true"></i>
        <h3 style="font-size:var(--text-base);font-weight:700;color:var(--text-primary)">Vượt ngân sách dự kiến</h3>
      </div>
      <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-2)">
        Thêm <strong>${escapeHtml(actName)}</strong> sẽ nâng tổng chi phí lên:
      </p>
      <p style="font-size:var(--text-2xl);font-weight:700;color:var(--color-primary);margin-bottom:var(--space-1)">${formatVND(projected)}</p>
      <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-5)">Ngân sách dự kiến: ${formatVND(ceiling)}</p>
      <div style="display:flex;gap:var(--space-3);justify-content:flex-end">
        <button class="btn btn--soft btn--sm" id="bud-cancel">Hủy bỏ</button>
        <button class="btn btn--primary btn--sm" id="bud-ok">Vẫn thêm</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const remove = () => overlay.remove();
  overlay.querySelector('#bud-cancel').addEventListener('click', remove);
  overlay.querySelector('#bud-ok').addEventListener('click', () => { remove(); onConfirm(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) remove(); });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { remove(); document.removeEventListener('keydown', esc); }
  });
}

function confirmIfOverBudget(actId, onConfirm, overrideCost = null, overrideName = null) {
  const ceiling = getBudgetCeiling();
  if (ceiling === Infinity) { onConfirm(); return; }
  const act = findActivity(actId);
  const actCost = overrideCost ?? act?.estimatedCost ?? 0;
  const actName = overrideName ?? (act ? (act.name[i18n.getLang()] || act.name.vi) : actId);
  const currentTotal = calcCurrentTotal();
  if (currentTotal + actCost <= ceiling) { onConfirm(); return; }
  showBudgetConfirmDialog(actName, actCost, currentTotal, ceiling, onConfirm);
}

function confirmAccIfOverBudget(dest, newAccIdx, onConfirm) {
  const ceiling = getBudgetCeiling();
  if (ceiling === Infinity) { onConfirm(); return; }

  const newAcc = dest.accommodations?.[newAccIdx];
  if (!newAcc) { onConfirm(); return; }

  const selectedDests = plannerState.selectedDestinations
    .map(id => allDestinations.find(d => d.id === id)).filter(Boolean);
  const daysPerDest = distributeDays(plannerState.duration, selectedDests.length);
  const di = selectedDests.findIndex(d => d.id === dest.id);
  const nights = di >= 0 ? Math.max(1, daysPerDest[di] - 1) : Math.max(1, plannerState.duration - 1);

  const oldAcc = getSelectedAccommodation(dest);
  const oldAccCost = oldAcc ? oldAcc.pricePerNight * nights : 0;
  const newAccCost = newAcc.pricePerNight * nights;
  const totalWithoutOldAcc = calcCurrentTotal() - oldAccCost;

  if (totalWithoutOldAcc + newAccCost <= ceiling) { onConfirm(); return; }
  showBudgetConfirmDialog(newAcc.name, newAccCost, totalWithoutOldAcc, ceiling, onConfirm);
}

function updateCostSummary() {
  const lang = i18n.getLang();
  const rows = document.getElementById('cost-rows');
  const total = document.getElementById('cost-total');
  if (!rows || !total) return;

  let totalCost = 0;
  const breakdown = [];

  // Activity costs
  Object.entries(plannerState.dayActivities).forEach(([, actIds]) => {
    actIds.forEach(actId => {
      const act = findActivity(actId);
      if (act) {
        totalCost += act.estimatedCost;
        breakdown.push({ icon: '', name: act.name[lang] || act.name.vi, cost: act.estimatedCost });
      }
    });
  });

  // Accommodation + transport per destination
  const selectedDests = plannerState.selectedDestinations
    .map(id => allDestinations.find(d => d.id === id))
    .filter(Boolean);
  const daysPerDest = distributeDays(plannerState.duration, selectedDests.length);

  selectedDests.forEach((dest, di) => {
    const days = daysPerDest[di];
    const nightsAtDest = Math.max(1, days - 1);
    const acc = getSelectedAccommodation(dest);
    if (acc) {
      const accCost = acc.pricePerNight * nightsAtDest;
      totalCost += accCost;
      breakdown.push({ icon: '<i class="fa-solid fa-hotel" aria-hidden="true"></i>', name: acc.name, cost: accCost });
    }
    const transport = getSelectedTransport(dest.id);
    if (transport) {
      totalCost += transport.priceFrom;
      breakdown.push({ icon: transport.icon, name: transport.label, cost: transport.priceFrom });
    }
  });

  rows.innerHTML = breakdown.map(item => `
    <div class="cost-row">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px">${item.icon ? item.icon + ' ' : ''}${escapeHtml(item.name)}</span>
      <span class="cost-row__amount">${formatVND(item.cost)}</span>
    </div>`).join('');

  total.textContent = formatVND(totalCost);
  syncMobileBar();
}

function syncMobileBar() {
  const mobileTotal = document.getElementById('mobile-cost-total');
  const desktopTotal = document.getElementById('cost-total');
  if (mobileTotal && desktopTotal) {
    mobileTotal.textContent = desktopTotal.textContent;
  }
}

// ===== STEP 4: EXPORT =====
function renderExport() {
  const lang = i18n.getLang();
  const preview = document.getElementById('itinerary-preview');
  const partners = document.getElementById('export-partners');
  if (!preview) return;

  const selectedDests = plannerState.selectedDestinations
    .map(id => allDestinations.find(d => d.id === id))
    .filter(Boolean);

  const daysPerDest = distributeDays(plannerState.duration, selectedDests.length);
  let dayIndex = 0;

  preview.innerHTML = `
    <h3 style="font-family:var(--font-display);font-size:var(--text-2xl);margin-bottom:var(--space-2)">
      ${selectedDests.map(d => d.name[lang] || d.name.vi).join(' → ')}
    </h3>
    <p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-5)">
      ${plannerState.duration} ngày · ${budgetLabel(plannerState.budget, lang)} · ${groupLabel(plannerState.group, lang)}
    </p>
    ${selectedDests.map((dest, di) => {
      const days = daysPerDest[di];
      const destName = dest.name[lang] || dest.name.vi;
      const dayBlocks = [];
      for (let d = 0; d < days; d++) {
        const actIds = plannerState.dayActivities[dayIndex] || [];
        const capturedDayIdx = dayIndex;
        const isLastDayOfDest = (d === days - 1);

        // Last-day souvenir suggestions
        let lastDaySuggestHTML = '';
        if (isLastDayOfDest) {
          const alreadyAdded = new Set(Object.values(plannerState.dayActivities).flat());
          const suggestions = allActivities
            .filter(s => s.destinationId === dest.id &&
                         (s.category === 'souvenir' || s.category === 'food_specialty') &&
                         !alreadyAdded.has(s.id))
            .slice(0, 3);
          if (suggestions.length) {
            lastDaySuggestHTML = `
              <p style="font-size:var(--text-xs);font-weight:600;color:var(--color-secondary);margin:var(--space-3) 0 var(--space-2);display:flex;align-items:center;gap:4px">
                <i class="bi bi-bag-heart" aria-hidden="true"></i> Gợi ý trước khi rời ${escapeHtml(destName)}
              </p>
              ${suggestions.map(s => {
                const sName = s.name[lang] || s.name.vi;
                return `<div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) var(--space-3);border:1.5px dashed var(--border-color);border-radius:var(--radius-md);margin-bottom:var(--space-1)">
                  <span style="font-size:var(--text-xs)">${escapeHtml(sName)} · ${formatVND(s.estimatedCost)}</span>
                  <button style="font-size:var(--text-xs);padding:2px 10px;border:1px solid var(--color-secondary);border-radius:var(--radius-full);background:transparent;color:var(--color-secondary);cursor:pointer;flex-shrink:0"
                          data-export-add="${s.id}" data-day="${capturedDayIdx}">＋ Thêm</button>
                </div>`;
              }).join('')}`;
          }
        }

        dayBlocks.push(`
          <div style="margin-bottom:var(--space-3)">
            <p style="font-weight:700;font-size:var(--text-sm);margin-bottom:var(--space-2)">Ngày ${dayIndex + 1} – ${destName}</p>
            ${actIds.map(actId => {
              const act = findActivity(actId);
              if (!act) return '';
              const startTime = getEffectiveTime(actId, capturedDayIdx);
              return `
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px solid var(--border-color)">
                <span style="font-size:var(--text-xs);color:var(--text-muted);width:40px;flex-shrink:0">${startTime}</span>
                <span style="font-size:var(--text-sm);color:var(--text-secondary);flex:1">${escapeHtml(act.name[lang] || act.name.vi)}</span>
                <span style="font-size:var(--text-xs);color:var(--color-primary);font-weight:600">${formatVND(act.estimatedCost)}</span>
              </div>`;
            }).join('')}
            ${!actIds.length ? `<p style="font-size:var(--text-xs);color:var(--text-muted);padding:var(--space-2) 0">Ngày tự do – nghỉ ngơi &amp; mua quà mang về</p>` : ''}
            ${lastDaySuggestHTML}
          </div>`);
        dayIndex++;
      }
      return dayBlocks.join('');
    }).join('')}`;

  // Partner booking grid
  if (partners) {
    partners.innerHTML = selectedDests.map(dest => {
      const name = dest.name[lang] || dest.name.vi;
      return `
        <div style="background:var(--bg-alt);border-radius:var(--radius-xl);padding:var(--space-5);border:1px solid var(--border-color)">
          <p style="font-weight:700;margin-bottom:var(--space-4)">${escapeHtml(name)}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:var(--space-3)">
            ${(() => {
              const acc = getSelectedAccommodation(dest);
              const accName = acc ? acc.name : null;
              return Object.entries(dest.partners || {}).map(([key, url]) => {
                const info = PARTNER_LABELS[key];
                if (!info) return '';
                const label = accName
                  ? `Đặt ${escapeHtml(accName)} trên ${info.name}`
                  : `${escapeHtml(name)} trên ${info.name}`;
                const href = (acc?.bookingLink && key !== 'klook' && key !== 'traveloka')
                  ? escapeHtml(acc.bookingLink)
                  : escapeHtml(url);
                return `<a href="${href}" target="_blank" rel="noopener noreferrer"
                           style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3);background:white;border:1.5px solid var(--border-color);border-radius:var(--radius-lg);font-size:var(--text-sm);font-weight:600;color:var(--text-primary);text-decoration:none;transition:border-color .15s"
                           onmouseover="this.style.borderColor='var(--color-secondary)'"
                           onmouseout="this.style.borderColor='var(--border-color)'">
                  <span>${info.icon}</span><span style="font-size:var(--text-xs);line-height:1.3">${label}</span>
                </a>`;
              }).join('');
            })()}
          </div>
        </div>`;
    }).join('');
  }

  bindExportButtons();
}

function bindExportButtons() {
  document.getElementById('btn-print')?.addEventListener('click', () => printPreview());

  document.getElementById('btn-share')?.addEventListener('click', async () => {
    const payload = btoa(JSON.stringify({
      d: plannerState.selectedDestinations,
      dur: plannerState.duration,
      b: plannerState.budget,
      g: plannerState.group
    }));
    const url = `${window.location.origin}${window.location.pathname}?itinerary=${payload}`;
    const ok = await copyToClipboard(url);
    Toast.show(ok ? 'Đã sao chép link!' : 'Không sao chép được', ok ? 'success' : 'error', 2500);
  });

  document.getElementById('btn-download')?.addEventListener('click', () => downloadTxt());

  document.getElementById('btn-save-local')?.addEventListener('click', () => {
    const saved = safeGet(ITINERARIES_KEY, []);
    const id = `trip-${Date.now()}`;
    saved.push({ id, savedAt: new Date().toISOString(), state: { ...plannerState } });
    safeSet(ITINERARIES_KEY, saved);
    Toast.show(i18n.t('planner.saved') || 'Đã lưu hành trình!', 'success', 2500);
  });

  // Bind last-day souvenir suggestion buttons in export preview
  document.querySelectorAll('[data-export-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const actId = btn.dataset.exportAdd;
      const dIdx = +btn.dataset.day;
      if (!plannerState.dayActivities[dIdx]) plannerState.dayActivities[dIdx] = [];
      if (!plannerState.dayActivities[dIdx].includes(actId))
        plannerState.dayActivities[dIdx].push(actId);
      renderExport();
      updateCostSummary();
      saveDraft();
      Toast.show('Đã thêm', 'success', 1200);
    });
  });
}

function printPreview() {
  const preview = document.getElementById('itinerary-preview');
  if (!preview) return;
  const lang = i18n.getLang();
  const dests = plannerState.selectedDestinations
    .map(id => allDestinations.find(d => d.id === id))
    .filter(Boolean);
  const title = escapeHtml(dests.map(d => d.name[lang] || d.name.vi).join(' – ') || 'Hành trình Polaris');
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>${title} – Polaris</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --font-display: 'Cormorant Garamond', Georgia, serif;
    --color-primary: #420D4B;
    --text-primary: #1a0a20;
    --text-secondary: #3d2b47;
    --text-muted: #6b5c74;
    --border-color: rgba(102,103,171,0.18);
    --space-2: 0.5rem; --space-3: 0.75rem; --space-5: 1.25rem;
    --text-xs: 0.75rem; --text-sm: 0.875rem; --text-2xl: 1.5rem;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; color: var(--text-primary); max-width: 680px; margin: 2rem auto; padding: 0 1.5rem 4rem; line-height: 1.6; }
  @media print { body { margin: 0; padding: 1rem; } }
</style>
</head>
<body>${preview.innerHTML}</body>
</html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.addEventListener('load', () => { win.focus(); win.print(); });
}

function downloadTxt() {
  const lang = i18n.getLang();
  const dests = plannerState.selectedDestinations
    .map(id => allDestinations.find(d => d.id === id))
    .filter(Boolean);

  let text = `HÀNH TRÌNH POLARIS\n${'='.repeat(40)}\n\n`;
  text += `Điểm đến: ${dests.map(d => d.name[lang] || d.name.vi).join(' → ')}\n`;
  text += `Thời gian: ${plannerState.duration} ngày\n`;
  text += `Ngân sách: ${budgetLabel(plannerState.budget, lang)}\n\n`;

  const daysPerDest = distributeDays(plannerState.duration, dests.length);
  let dayIndex = 0;

  dests.forEach((dest, di) => {
    const days = daysPerDest[di];
    for (let d = 0; d < days; d++) {
      const actIds = plannerState.dayActivities[dayIndex] || [];
      text += `NGÀY ${dayIndex + 1} – ${dest.name[lang] || dest.name.vi}\n`;
      text += '-'.repeat(30) + '\n';
      actIds.forEach(actId => {
        const act = findActivity(actId);
        if (act) text += `  ${getEffectiveTime(actId, dayIndex)}  ${act.name[lang] || act.name.vi}  (${formatVND(act.estimatedCost)})\n`;
      });
      text += '\n';
      dayIndex++;
    }
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `polaris-hanh-trinh-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== STEP NAVIGATION =====
function bindNavigation() {
  document.getElementById('btn-step1-next')?.addEventListener('click', () => {
    if (!plannerState.styles.length && !plannerState.budget) {
      Toast.show(i18n.t('planner.step1.hint') || 'Chọn ít nhất 1 phong cách', 'warning', 2500);
    }
    goToStep(skipRecommendations ? 3 : 2);
  });

  document.getElementById('btn-step2-back')?.addEventListener('click', () => goToStep(1));
  document.getElementById('btn-step2-next')?.addEventListener('click', () => {
    if (!plannerState.selectedDestinations.length) {
      Toast.show(i18n.t('planner.select_one') || 'Chọn ít nhất 1 điểm đến', 'warning', 2500);
      return;
    }
    goToStep(3);
  });

  document.getElementById('btn-step3-back')?.addEventListener('click', () => goToStep(skipRecommendations ? 1 : 2));
  document.getElementById('btn-step3-next')?.addEventListener('click', () => goToStep(4));

  document.getElementById('btn-step4-back')?.addEventListener('click', () => goToStep(3));

  // Mobile bottom bar (Step 3)
  document.getElementById('mobile-detail-btn')?.addEventListener('click', () => {
    const sheet = document.getElementById('step3-bottom-sheet');
    const overlay = document.getElementById('step3-sheet-overlay');
    const content = document.getElementById('bottom-sheet-content');
    if (content) {
      const dashboard = document.getElementById('trip-dashboard');
      const costSummary = document.getElementById('cost-summary');
      content.innerHTML = (dashboard?.outerHTML || '') + (costSummary?.outerHTML || '');
    }
    sheet?.classList.add('is-open');
    overlay?.classList.add('is-open');
  });

  document.getElementById('step3-sheet-overlay')?.addEventListener('click', () => {
    document.getElementById('step3-bottom-sheet')?.classList.remove('is-open');
    document.getElementById('step3-sheet-overlay')?.classList.remove('is-open');
  });

  document.getElementById('mobile-export-btn')?.addEventListener('click', () => goToStep(4));
}

function goToStep(step) {
  currentStep = step;

  // Update panels
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`step-${i}`)?.classList.toggle('is-active', i === step);
  }

  // Update stepper dots
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`step-dot-${i}`);
    if (!dot) continue;
    dot.classList.remove('is-active', 'is-completed', 'is-skipped');
    if (i < step) dot.classList.add('is-completed');
    else if (i === step) dot.classList.add('is-active');
  }
  // Mark Step 2 as skipped when in skip mode and past it
  const dot2 = document.getElementById('step-dot-2');
  if (dot2 && skipRecommendations && step >= 3) {
    dot2.classList.remove('is-completed');
    dot2.classList.add('is-skipped');
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Render step content
  if (step === 2) renderRecommendations();
  if (step === 3) { renderDayBuilder(); bindDayBuilderEvents(); }
  if (step === 4) renderExport();

  saveDraft();
  i18n.apply();
}

// ===== AUTOCOMPLETE TOOLTIP =====
function bindAutocompleteTooltip(listEl) {
  let tip = null;

  function showTip(item) {
    const full = item.dataset.full;
    if (!full) return;
    // Only show if text is actually truncated
    if (item.scrollWidth <= item.clientWidth) return;

    tip = document.createElement('div');
    tip.className = 'autocomplete-tooltip';
    tip.textContent = full;
    tip.style.cssText = [
      'position:fixed',
      'background:var(--color-darkest)',
      'color:white',
      'font-size:11px',
      'line-height:1.5',
      'padding:6px 10px',
      'border-radius:var(--radius-md)',
      'box-shadow:var(--shadow-md)',
      'max-width:280px',
      'word-break:break-word',
      'z-index:9999',
      'pointer-events:none',
    ].join(';');
    document.body.appendChild(tip);

    const rect = item.getBoundingClientRect();
    const tipH = tip.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom;
    tip.style.left = `${Math.min(rect.left, window.innerWidth - 292)}px`;
    tip.style.top  = spaceBelow > tipH + 8
      ? `${rect.bottom + 4}px`
      : `${rect.top - tipH - 4}px`;
  }

  function hideTip() {
    tip?.remove();
    tip = null;
  }

  listEl.addEventListener('mouseover', (e) => {
    const item = e.target.closest('[data-full]');
    if (item && item !== tip?._anchor) { hideTip(); showTip(item); }
  });
  listEl.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget?.closest('[data-full]')) hideTip();
  });
}

// ===== ACCOMMODATION & TRANSPORT HELPERS =====
function getTransportOptions(destId) {
  const dep = plannerState.departure || 'other';
  const matrix = TRANSPORT_MATRIX[dep] || TRANSPORT_MATRIX['other'];
  return matrix[destId] || TRANSPORT_MATRIX['other']['default'] || [];
}

function getSelectedTransport(destId) {
  const options = getTransportOptions(destId);
  if (!options.length) return null;
  const idx = plannerState.selectedTransport?.[destId] ?? 0;
  return options[Math.min(idx, options.length - 1)];
}

function getSelectedAccommodationIdx(dest) {
  const idx = plannerState.selectedAccommodation?.[dest.id];
  if (idx !== undefined) return idx;

  const accs = dest.accommodations || [];
  if (!accs.length) return 0;

  const budget = plannerState.budget || 'mid';
  const ceiling = getBudgetCeiling();

  if (ceiling === Infinity) {
    const recIdx = accs.findIndex(a => a.recommendedFor === budget);
    return recIdx >= 0 ? recIdx : 0;
  }

  const selectedDests = plannerState.selectedDestinations
    .map(id => allDestinations.find(d => d.id === id)).filter(Boolean);
  const daysPerDest = distributeDays(plannerState.duration, selectedDests.length);
  const di = selectedDests.findIndex(d => d.id === dest.id);
  const nights = di >= 0 ? Math.max(1, daysPerDest[di] - 1) : Math.max(1, plannerState.duration - 1);

  // Compute all costs except this dest's accommodation — avoid calling
  // calcCurrentTotal() / getSelectedAccommodation() to prevent recursion.
  let fixedCost = 0;
  Object.values(plannerState.dayActivities || {}).forEach(actIds => {
    (actIds || []).forEach(actId => {
      const act = findActivity(actId);
      if (act) fixedCost += act.estimatedCost || 0;
    });
  });
  selectedDests.forEach((d, i) => {
    const tr = getSelectedTransport(d.id);
    if (tr) fixedCost += tr.priceFrom;
    if (d.id === dest.id) return;
    // Other dests: use user-chosen index if set; otherwise recommendedFor match (no recursion).
    const otherIdx = plannerState.selectedAccommodation?.[d.id];
    const otherAccs = d.accommodations || [];
    const otherAcc = otherIdx !== undefined
      ? otherAccs[otherIdx]
      : (otherAccs.find(a => a.recommendedFor === budget) || otherAccs[0]);
    if (otherAcc) fixedCost += otherAcc.pricePerNight * Math.max(1, daysPerDest[i] - 1);
  });

  const remaining = ceiling - fixedCost;

  // Prefer the tier-matched recommendation if it fits.
  const recIdx = accs.findIndex(a => a.recommendedFor === budget);
  if (recIdx >= 0 && accs[recIdx].pricePerNight * nights <= remaining) return recIdx;

  // Otherwise pick the most expensive option that still fits within the remaining budget.
  let bestIdx = -1, bestPrice = -1;
  accs.forEach((a, i) => {
    if (a.pricePerNight * nights <= remaining && a.pricePerNight > bestPrice) {
      bestPrice = a.pricePerNight;
      bestIdx = i;
    }
  });
  if (bestIdx >= 0) return bestIdx;

  // Every option exceeds the remaining budget — pick the cheapest to minimise overage.
  return accs.reduce((best, a, i) =>
    a.pricePerNight < accs[best].pricePerNight ? i : best, 0);
}

function getRecommendedAccommodation(dest) {
  const accs = dest.accommodations || [];
  const budget = plannerState.budget || 'mid';
  return accs.find(a => a.recommendedFor === budget) || accs[0] || null;
}

function getSelectedAccommodation(dest) {
  if (!dest) return null;
  const idx = getSelectedAccommodationIdx(dest);
  return dest.accommodations?.[idx] || null;
}

function generateWhySentence(dest, lang = 'vi') {
  const parts = [];
  const currentMonth = new Date().getMonth() + 1;
  const name = dest.name?.[lang] || dest.name?.vi || '';

  if (dest.bestMonths?.includes(currentMonth)) {
    parts.push(lang === 'vi' ? `${name} đang vào mùa đẹp nhất` : `${name} is at its best season`);
  }

  const acc = getRecommendedAccommodation(dest);
  if (acc) {
    const budget = plannerState.budget;
    if (budget === 'budget') {
      parts.push(lang === 'vi'
        ? `Homestay gợi ý chỉ ${formatVND(acc.pricePerNight)}/đêm – tiết kiệm đúng vị`
        : `Suggested stay only ${formatVND(acc.pricePerNight)}/night – great value`);
    } else if (budget === 'luxury') {
      parts.push(lang === 'vi'
        ? `${acc.name} đẳng cấp – đúng chất sang trọng bạn muốn`
        : `${acc.name} – the luxury you're looking for`);
    } else {
      parts.push(lang === 'vi'
        ? `${acc.name} phù hợp ngân sách của bạn`
        : `${acc.name} fits your budget perfectly`);
    }
  }

  const matchPct = dest.score > 0 ? Math.min(100, Math.round(dest.score * 10)) : 0;
  if (matchPct >= 70) {
    parts.push(lang === 'vi' ? `phù hợp ${matchPct}% sở thích` : `${matchPct}% match with your style`);
  }

  if (plannerState.group === 'family' && plannerState.familyProfile?.hasChildren && dest.tags?.includes('child_friendly')) {
    parts.push(lang === 'vi' ? `thân thiện gia đình có trẻ em` : `family-friendly with kids`);
  }

  if (!parts.length) {
    parts.push(lang === 'vi' ? `Điểm đến phù hợp hành trình của bạn` : `A great match for your trip`);
  }

  return parts.join(' — ') + '!';
}

// ===== TRIP DASHBOARD (Step 3 sidebar) =====
function renderTripDashboard(dests) {
  const lang = i18n.getLang();
  const el = document.getElementById('trip-dashboard');
  if (!el) return;
  if (!dests.length) { el.innerHTML = ''; return; }

  const nights = Math.max(1, plannerState.duration - 1);
  const dateStr = plannerState.departureDate && plannerState.returnDate
    ? `${plannerState.departureDate.slice(5).replace('-', '/')} – ${plannerState.returnDate.slice(5).replace('-', '/')}`
    : `${plannerState.duration} ngày · ${nights} đêm`;

  el.innerHTML = `
    <div class="trip-dashboard__title"><i class="bi bi-map" aria-hidden="true"></i> Trip Dashboard</div>
    <div class="trip-dashboard__meta">
      <span><i class="bi bi-calendar-event" aria-hidden="true"></i> ${escapeHtml(dateStr)}</span>
      <span><i class="bi bi-people-fill" aria-hidden="true"></i> ${plannerState.travelers} người</span>
    </div>
    ${dests.map(dest => {
      const name = dest.name[lang] || dest.name.vi;
      const acc = getSelectedAccommodation(dest);
      const transport = getSelectedTransport(dest.id);
      return `
        <div class="trip-dashboard__dest" data-dest-id="${dest.id}">
          <p style="font-size:var(--text-xs);font-weight:700;color:var(--text-primary);margin-bottom:var(--space-2)"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i> ${escapeHtml(name)}</p>
          ${acc ? `<div class="trip-dashboard__anchor">
            <span><i class="fa-solid fa-hotel" aria-hidden="true"></i> ${escapeHtml(acc.name)}<br><span style="color:var(--text-muted)">${formatVND(acc.pricePerNight)}/đêm</span></span>
            <button class="trip-dashboard__change" data-change-acc="${dest.id}">Thay đổi</button>
          </div>` : ''}
          ${transport ? `<div class="trip-dashboard__anchor">
            <span>${transport.icon} ${escapeHtml(transport.label)}<br><span style="color:var(--text-muted)">từ ${formatVND(transport.priceFrom)}</span></span>
            <button class="trip-dashboard__change" data-change-trans="${dest.id}">Đổi</button>
          </div>` : ''}
        </div>`;
    }).join('')}`;

  el.onclick = handleTripDashboardClick;
}

function handleTripDashboardClick(e) {
  const lang = i18n.getLang();
  const changeAcc = e.target.closest('[data-change-acc]');
  const changeTrans = e.target.closest('[data-change-trans]');

  if (changeAcc) {
    const dest = allDestinations.find(d => d.id === changeAcc.dataset.changeAcc);
    if (dest) showAccPicker(dest, lang);
  }
  if (changeTrans) {
    const dest = allDestinations.find(d => d.id === changeTrans.dataset.changeTrans);
    if (dest) showTransPicker(dest, lang);
  }
}

function showAccPicker(dest, lang) {
  const accs = dest.accommodations || [];
  if (!accs.length) return;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:var(--z-modal,900);display:flex;align-items:center;justify-content:center;padding:var(--space-4)';
  overlay.innerHTML = `
    <div style="background:white;border-radius:var(--radius-xl);padding:var(--space-6);max-width:420px;width:100%;max-height:80vh;overflow-y:auto">
      <h3 style="font-size:var(--text-lg);font-weight:700;margin-bottom:var(--space-4)">Chọn nơi ở – ${escapeHtml(dest.name[lang] || dest.name.vi)}</h3>
      ${accs.map((a, i) => {
        const isSel = getSelectedAccommodationIdx(dest) === i;
        return `<div style="padding:var(--space-3);border:1.5px solid ${isSel ? 'var(--color-primary)' : 'var(--border-color)'};border-radius:var(--radius-lg);cursor:pointer;margin-bottom:var(--space-2);background:${isSel ? 'rgba(66,13,75,0.04)' : 'white'}" data-pick-acc="${i}">
          <p style="font-weight:600;font-size:var(--text-sm)">${escapeHtml(a.name)} ${'★'.repeat(a.stars)}</p>
          <p style="font-size:var(--text-xs);color:var(--text-muted)">${escapeHtml(a.location)} · ${formatVND(a.pricePerNight)}/đêm</p>
          <p style="font-size:var(--text-xs);color:var(--color-secondary);margin-top:2px">${escapeHtml(a.highlight?.[lang] || a.highlight?.vi || '')}</p>
        </div>`;
      }).join('')}
      <button class="btn btn--secondary btn--full" id="close-acc-picker">Đóng</button>
    </div>`;

  overlay.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick-acc]');
    if (pick) {
      const newIdx = +pick.dataset.pickAcc;
      confirmAccIfOverBudget(dest, newIdx, () => {
        if (!plannerState.selectedAccommodation) plannerState.selectedAccommodation = {};
        plannerState.selectedAccommodation[dest.id] = newIdx;
        saveDraft();
        renderDayBuilder();
        pulseDayCards();
        overlay.remove();
      });
      return;
    }
    if (e.target.id === 'close-acc-picker' || e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

function showTransPicker(dest, lang) {
  const options = getTransportOptions(dest.id);
  if (!options.length) { Toast.show('Chưa có thông tin phương tiện cho tuyến này', 'info', 2000); return; }

  const selectedIdx = plannerState.selectedTransport?.[dest.id] ?? 0;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:var(--z-modal,900);display:flex;align-items:center;justify-content:center;padding:var(--space-4)';
  overlay.innerHTML = `
    <div style="background:white;border-radius:var(--radius-xl);padding:var(--space-6);max-width:420px;width:100%;max-height:80vh;overflow-y:auto">
      <h3 style="font-size:var(--text-lg);font-weight:700;margin-bottom:var(--space-2)">Chọn phương tiện – ${escapeHtml(dest.name[lang] || dest.name.vi)}</h3>
      <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-4)">Giá tham khảo</p>
      ${options.map((t, i) => {
        const isSel = selectedIdx === i;
        return `<div style="padding:var(--space-3);border:1.5px solid ${isSel ? 'var(--color-primary)' : 'var(--border-color)'};border-radius:var(--radius-lg);cursor:pointer;margin-bottom:var(--space-2);background:${isSel ? 'rgba(66,13,75,0.04)' : 'white'}" data-pick-trans="${i}">
          <p style="font-weight:600;font-size:var(--text-sm)">${t.icon} ${escapeHtml(t.label)}</p>
          <p style="font-size:var(--text-xs);color:var(--text-muted)">${t.duration} phút · từ ${formatVND(t.priceFrom)}</p>
        </div>`;
      }).join('')}
      <button class="btn btn--secondary btn--full" id="close-trans-picker">Đóng</button>
    </div>`;

  overlay.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick-trans]');
    if (pick) {
      if (!plannerState.selectedTransport) plannerState.selectedTransport = {};
      plannerState.selectedTransport[dest.id] = +pick.dataset.pickTrans;
      saveDraft();
      renderDayBuilder();
      overlay.remove();
      return;
    }
    if (e.target.id === 'close-trans-picker' || e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

function pulseDayCards() {
  document.querySelectorAll('.tl-card').forEach(card => {
    card.classList.remove('tl-card--pulse');
    void card.offsetWidth;
    card.classList.add('tl-card--pulse');
    card.addEventListener('animationend', () => card.classList.remove('tl-card--pulse'), { once: true });
  });
}

// ===== UTILS =====
function saveDraft() {
  safeSet(PLANNER_KEY, plannerState);
}

function budgetLabel(budget, lang) {
  const labels = {
    vi: { budget: 'Tiết kiệm', mid: 'Trung bình', luxury: 'Cao cấp' },
    en: { budget: 'Budget', mid: 'Mid-range', luxury: 'Luxury' }
  };
  return (labels[lang] || labels.vi)[budget] || budget || '–';
}

function groupLabel(group, lang) {
  const labels = {
    vi: { solo: 'Một mình', couple: 'Cặp đôi', group: 'Nhóm bạn', family: 'Gia đình' },
    en: { solo: 'Solo', couple: 'Couple', group: 'Group', family: 'Family' }
  };
  return (labels[lang] || labels.vi)[group] || group || '–';
}

init();
