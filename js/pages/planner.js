import { i18n } from '../core/i18n.js';
import { initNavbar } from '../components/navbar.js';
import { Toast } from '../components/toast.js';
import { loadData, getParam, formatVND, safeGet, safeSet, copyToClipboard, escapeHtml } from '../core/utils.js';
import { placeAutocomplete, getPlaceDetail, optimizeRoute, haversine } from '../core/goong.js';

const PLANNER_KEY = 'polaris_planner_draft';
const ITINERARIES_KEY = 'polaris_itineraries';

const PARTNER_LABELS = {
  booking:   { name: 'Booking.com', icon: '🏨' },
  agoda:     { name: 'Agoda',       icon: '🛏️' },
  traveloka: { name: 'Traveloka',   icon: '✈️' },
  klook:     { name: 'Klook',       icon: '🎟️' }
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
  budget: '',
  departure: '',
  selectedDestinations: [],
  dayActivities: {},   // { dayIndex: [activityId, ...] }
  activityOverrides: {},  // { 'dayIndex-actId': { startTime: 'HH:MM' } }
  customActivities: {},  // { actId: { id, name, startTime, duration, estimatedCost, coordinates, isCustom } }
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
}

function onQuizChange() {
  plannerState.styles = [...document.querySelectorAll('input[name="style"]:checked')].map(i => i.value);
  plannerState.group = document.querySelector('input[name="group"]:checked')?.value || '';
  plannerState.budget = document.querySelector('input[name="budget"]:checked')?.value || '';

  const extra = document.getElementById('family-extra');
  if (plannerState.group === 'family') extra?.classList.add('is-visible');
  else extra?.classList.remove('is-visible');

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

  grid.innerHTML = scored.map(dest => {
    const name = dest.name[lang] || dest.name.vi;
    const region = dest.region[lang] || dest.region.vi;
    const isSelected = plannerState.selectedDestinations.includes(dest.id);

    const familyBadges = [];
    if (dest.tags?.includes('child_friendly'))    familyBadges.push(`<span class="badge badge--primary" style="font-size:10px">Thân thiện trẻ em</span>`);
    if (dest.tags?.includes('elderly_accessible')) familyBadges.push(`<span class="badge badge--success" style="font-size:10px">Dễ di chuyển</span>`);
    if (dest.tags?.includes('near_center'))        familyBadges.push(`<span class="badge" style="font-size:10px">Gần trung tâm</span>`);

    const matchPct = dest.score > 0 ? Math.min(100, Math.round(dest.score * 10)) : 0;
    return `
      <div class="rec-card ${isSelected ? 'is-selected' : ''}" data-id="${dest.id}" role="button" tabindex="0" aria-pressed="${isSelected}">
        <div class="rec-card__check">✓</div>
        <div style="aspect-ratio:4/3;overflow:hidden;position:relative">
          <img src="${escapeHtml(dest.image)}" alt="${escapeHtml(name)}"
               style="width:100%;height:100%;object-fit:cover;transition:transform .3s"
               loading="lazy">
          ${matchPct ? `<span style="position:absolute;top:var(--space-2);left:var(--space-2);background:var(--color-primary);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:var(--radius-full)">Phù hợp ${matchPct}%</span>` : ''}
        </div>
        <div style="padding:var(--space-3) var(--space-4) var(--space-3);display:flex;flex-direction:column;flex:1">
          <div style="display:flex;align-items:flex-start;gap:var(--space-2);margin-bottom:var(--space-1)">
            <h3 style="font-size:var(--text-xl);font-weight:700;color:var(--text-primary);line-height:1.35;flex:1;min-width:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(name)}</h3>
            <span style="font-size:var(--text-xs);background:rgba(66,13,75,0.09);color:var(--color-primary);font-weight:700;padding:1px 6px;border-radius:4px;flex-shrink:0;white-space:nowrap">★ ${dest.rating}</span>
          </div>
          <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2)">📍 ${escapeHtml(region)}</p>
          ${familyBadges.length ? `<div style="display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-2)">${familyBadges.join('')}</div>` : ''}
          <div style="border-top:1px solid var(--border-color);padding-top:var(--space-2);margin-top:auto">
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:1px">Từ</p>
            <p style="font-size:var(--text-base);font-weight:700;color:var(--color-accent);margin-top:var(--space-1)">${formatVND(dest.priceFrom)}</p>
          </div>
        </div>
      </div>`;
  }).join('');

  // Bind click
  grid.querySelectorAll('.rec-card').forEach(card => {
    card.addEventListener('click', () => toggleRecCard(card));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggleRecCard(card); });
  });

  updateRecCount();
}

function toggleRecCard(card) {
  const id = card.dataset.id;
  const alreadySelected = plannerState.selectedDestinations.includes(id);

  // Single-select: deselect all, then select tapped card (unless it was already selected)
  plannerState.selectedDestinations = [];
  document.querySelectorAll('.rec-card').forEach(c => {
    c.classList.remove('is-selected');
    c.setAttribute('aria-pressed', 'false');
  });

  if (!alreadySelected) {
    plannerState.selectedDestinations.push(id);
    card.classList.add('is-selected');
    card.setAttribute('aria-pressed', 'true');
  }

  updateRecCount();
  saveDraft();
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
      const col = buildDayColumn(dayIndex, d === 0 ? destName : '', dest, lang);
      builder.appendChild(col);
      dayIndex++;
    }

    // Transport indicator between destinations
    if (di < selectedDests.length - 1) {
      const transport = document.createElement('div');
      transport.className = 'day-col day-transport';
      transport.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:var(--space-2);padding:var(--space-2) 0;color:var(--text-muted);font-size:var(--text-xs)';
      transport.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-2);color:var(--text-muted);font-size:var(--text-xs);text-align:center">
        <span style="font-size:1.4rem">✈️</span>
        <span>Di chuyển</span>
      </div>`;
      builder.appendChild(transport);
    }
  });

  renderActivitySidebar(selectedDests, lang);
  renderRouteMap(selectedDests);
  updateCostSummary();
}

function distributeDays(total, count) {
  if (!count) return [];
  const base = Math.floor(total / count);
  const extra = total % count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

function buildDayColumn(dayIndex, destName, dest, lang) {
  const existing = plannerState.dayActivities[dayIndex];
  // hasBeenSet: user explicitly set this day (even to empty []) → don't auto-populate
  const hasBeenSet = dayIndex in plannerState.dayActivities;
  const validForDest = hasBeenSet && (!existing?.length || existing.every(actId => {
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

      
    
      
      <button class="tl-card__btn" data-optimize-day="${dayIndex}" aria-label="Tối ưu tuyến đường ngày ${dayIndex + 1}" style="color:rgba(255,255,255,0.8);font-size:var(--text-sm)" title="Tối ưu tuyến">🗺️</button>
    </div>`;

  const timeline = buildTimeline(dayIndex, dest, lang);

  col.innerHTML = header + timeline;
  return col;
}

function buildTimeline(dayIndex, dest, lang) {
  const activityIds = plannerState.dayActivities[dayIndex] || [];

  if (activityIds.length === 0) {
    return `
      <div class="day-timeline" data-day="${dayIndex}">
        <div class="tl-empty" data-open-picker="${dayIndex}">＋ Thêm hoạt động</div>
      </div>`;
  }

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
  });

  return `
    <div class="day-timeline" data-day="${dayIndex}">
      ${itemsHTML}
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
  const actDestId = allActivities.find(a => a.id === actId)?.destinationId;

  // Only show days belonging to the same destination
  const availableDays = Object.keys(dayToDestMap)
    .map(Number)
    .filter(i => i !== fromDay && dayToDestMap[i] === actDestId);

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
      if (!plannerState.dayActivities[day]) plannerState.dayActivities[day] = [];
      plannerState.dayActivities[day].push(actId);
      renderDayBuilder();
      updateCostSummary();
      saveDraft();
      Toast.show(i18n.t('planner.activity_added') || 'Đã thêm hoạt động', 'success', 1500);
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
      <span style="font-size:2rem">📍</span>
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

  mapEl.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:200px;background:#f8f5fc">
      <polyline points="${polyline}" fill="none" stroke="var(--color-secondary)" stroke-width="2" stroke-dasharray="4 3" opacity=".7"/>
      ${svgPoints.map((p, i) => `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="var(--color-primary)"/>
        <text x="${p.x + 7}" y="${p.y + 4}" font-size="9" fill="var(--color-darkest)" font-family="Inter,sans-serif" font-weight="600">${escapeHtml(points[i].name)}</text>
      `).join('')}
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

  document.body.appendChild(popup);

  // Position popup near anchor
  const rect = anchorEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  if (spaceBelow > 200) {
    popup.style.top = `${rect.bottom + 6}px`;
  } else {
    popup.style.top = `${rect.top - popup.offsetHeight - 6}px`;
  }
  const left = Math.min(rect.left, window.innerWidth - 268);
  popup.style.left = `${Math.max(8, left)}px`;

  // Click activity in popup → add to this day
  popup.addEventListener('click', (e) => {
    const item = e.target.closest('[data-picker-add]');
    if (item) {
      const actId = item.dataset.pickerAdd;
      if (!plannerState.dayActivities[dayIndex]) plannerState.dayActivities[dayIndex] = [];
      plannerState.dayActivities[dayIndex].push(actId);
      renderDayBuilder();
      updateCostSummary();
      saveDraft();
      Toast.show('Đã thêm hoạt động', 'success', 1500);
      closeActivityPicker();
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

function closeActivityPicker() {
  document.getElementById('activity-picker-popup')?.remove();
  activePickerDay = null;
}

function showCustomActivityForm(dayIndex) {
  const formEl = document.getElementById('picker-custom-form');
  const btn = document.getElementById('picker-custom-btn');
  if (!formEl) return;
  btn?.setAttribute('style', 'display:none');
  formEl.style.display = 'block';

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

  let selectedCoords = null;
  let selectedPlaceId = null;
  const placeInput = document.getElementById('custom-act-place');
  const autocompleteList = document.getElementById('custom-autocomplete-list');
  let autocompleteTimer = null;

  placeInput?.addEventListener('input', () => {
    selectedCoords = null;
    selectedPlaceId = null;
    clearTimeout(autocompleteTimer);
    const q = placeInput.value.trim();
    if (q.length < 2) { autocompleteList.innerHTML = ''; return; }
    autocompleteTimer = setTimeout(async () => {
      const results = await placeAutocomplete(q);
      autocompleteList.innerHTML = results.length
        ? `<div class="activity-picker-popup__autocomplete">${results.map((r, i) =>
            `<div class="activity-picker-popup__autocomplete-item" data-place-idx="${i}">${escapeHtml(r.description)}</div>`
          ).join('')}</div>`
        : '';
      // Store results for click handler
      autocompleteList._results = results;
    }, 300);
  });

  autocompleteList?.addEventListener('click', async (e) => {
    const item = e.target.closest('[data-place-idx]');
    if (!item) return;
    const idx = +item.dataset.placeIdx;
    const result = autocompleteList._results?.[idx];
    if (!result) return;
    placeInput.value = result.description;
    autocompleteList.innerHTML = '';
    selectedPlaceId = result.placeId;
    const coords = await getPlaceDetail(result.placeId);
    if (coords) selectedCoords = coords;
  });

  document.getElementById('custom-act-cancel')?.addEventListener('click', closeActivityPicker);

  document.getElementById('custom-act-confirm')?.addEventListener('click', () => {
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
    if (!plannerState.dayActivities[dayIndex]) plannerState.dayActivities[dayIndex] = [];
    plannerState.dayActivities[dayIndex].push(actId);
    renderDayBuilder();
    updateCostSummary();
    saveDraft();
    Toast.show('Đã thêm hoạt động tùy chỉnh', 'success', 1500);
    closeActivityPicker();
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

function updateCostSummary() {
  const lang = i18n.getLang();
  const rows = document.getElementById('cost-rows');
  const total = document.getElementById('cost-total');
  if (!rows || !total) return;

  let totalCost = 0;
  const breakdown = [];

  Object.entries(plannerState.dayActivities).forEach(([day, actIds]) => {
    actIds.forEach(actId => {
      const act = findActivity(actId);
      if (act) {
        totalCost += act.estimatedCost;
        const name = act.name[lang] || act.name.vi;
        breakdown.push({ name, cost: act.estimatedCost });
      }
    });
  });

  rows.innerHTML = breakdown.map(item => `
    <div class="cost-row">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px">${escapeHtml(item.name)}</span>
      <span class="cost-row__amount">${formatVND(item.cost)}</span>
    </div>`).join('');

  total.textContent = formatVND(totalCost);
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
        dayBlocks.push(`
          <div style="margin-bottom:var(--space-3)">
            <p style="font-weight:700;font-size:var(--text-sm);margin-bottom:var(--space-2)">Ngày ${dayIndex + 1} – ${destName}</p>
            ${actIds.map(actId => {
              const act = allActivities.find(a => a.id === actId);
              if (!act) return '';
              const startTime = getEffectiveTime(actId, capturedDayIdx);
              return `
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px solid var(--border-color)">
                <span style="font-size:var(--text-xs);color:var(--text-muted);width:40px;flex-shrink:0">${startTime}</span>
                <span style="font-size:var(--text-sm);color:var(--text-secondary);flex:1">${escapeHtml(act.name[lang] || act.name.vi)}</span>
                <span style="font-size:var(--text-xs);color:var(--color-primary);font-weight:600">${formatVND(act.estimatedCost)}</span>
              </div>`;
            }).join('')}
            ${!actIds.length ? `<p style="font-size:var(--text-xs);color:var(--text-muted);padding:var(--space-2) 0">Chưa có hoạt động – tự khám phá!</p>` : ''}
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
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:var(--space-3)">
            ${Object.entries(dest.partners || {}).map(([key, url]) => {
              const info = PARTNER_LABELS[key];
              if (!info) return '';
              return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"
                         style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3);background:white;border:1.5px solid var(--border-color);border-radius:var(--radius-lg);font-size:var(--text-sm);font-weight:600;color:var(--text-primary);text-decoration:none;transition:border-color .15s"
                         onmouseover="this.style.borderColor='var(--color-secondary)'"
                         onmouseout="this.style.borderColor='var(--border-color)'">
                <span>${info.icon}</span><span>${info.name}</span>
              </a>`;
            }).join('')}
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
        const act = allActivities.find(a => a.id === actId);
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
