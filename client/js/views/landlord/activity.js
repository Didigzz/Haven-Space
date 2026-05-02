import CONFIG from '../../config.js';

const SVG_BASE = '../../../assets/svg';

// Map activity type/icon name → SVG filename
const ACTIVITY_ICON_MAP = {
  payment: 'currencyDollar',
  payment_received: 'currencyDollar',
  application: 'application',
  new_application: 'application',
  message: 'chat',
  messages: 'chat',
  maintenance: 'alert',
  general: 'notification',
  activity: 'notification',
  bell: 'notification',
};

let currentPage = 1;
const itemsPerPage = 20;
let totalActivities = 0;
let currentFilter = 'all';
let currentDateFilter = 'all';

function svgImg(name, size = 20, cls = '') {
  return `<img src="${SVG_BASE}/${name}.svg" width="${size}" height="${size}" alt="" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>`;
}

function getActivitySvg(activity) {
  const raw = activity.icon || activity.type || 'general';
  const name = ACTIVITY_ICON_MAP[raw] || ACTIVITY_ICON_MAP[activity.type] || 'notification';
  return svgImg(name, 20);
}

export function initActivity() {
  loadActivities();
  initFilters();
  initPagination();
}

async function loadActivities() {
  const container = document.getElementById('activity-list');
  if (!container) return;

  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const params = new URLSearchParams({
      page: currentPage,
      limit: itemsPerPage,
      filter: currentFilter,
      date: currentDateFilter,
    });

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/activity.php?${params}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch activities');
    }

    const result = await response.json();

    if (result.data) {
      totalActivities = result.data.total || result.data.activities?.length || 0;
      renderActivities(result.data.activities || [], container);
      updateStats(result.data.stats || {});
      updatePagination();
    } else {
      renderEmptyState(container);
    }
  } catch (error) {
    console.error('Failed to load activities:', error);
    renderErrorState(container);
  }
}

function sanitizeDescription(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  const escaped = div.innerHTML;
  // Restore safe inline tags only
  return escaped.replace(/&lt;(\/?(strong|em|b|i|span)[^&]*)&gt;/gi, '<$1>');
}

function renderActivities(activities, container) {
  if (!activities || activities.length === 0) {
    renderEmptyState(container);
    return;
  }

  const html = activities
    .map(
      activity => `
    <div class="activity-card" data-activity-id="${activity.id}" data-activity-type="${activity.type}">
      <div class="activity-card-icon ${activity.color || 'blue'}">
        ${getActivitySvg(activity)}
      </div>
      <div class="activity-card-content">
        <div class="activity-card-header">
          <h3 class="activity-card-title">${escapeHtml(activity.title || 'Activity')}</h3>
          <span class="activity-card-badge ${getBadgeClass(activity.type)}">${formatType(activity.type)}</span>
        </div>
        <p class="activity-card-text">${sanitizeDescription(activity.description)}</p>
        <div class="activity-card-meta">
          <span class="activity-card-time">
            ${svgImg('clock', 14)}
            ${escapeHtml(activity.time_ago)}
          </span>
          ${activity.property ? `
          <span class="activity-card-property">
            ${svgImg('building', 14)}
            ${escapeHtml(activity.property)}
          </span>` : ''}
          ${activity.user ? `
          <span class="activity-card-user">
            ${svgImg('user', 14)}
            ${escapeHtml(activity.user)}
          </span>` : ''}
        </div>
      </div>
      <div class="activity-card-actions">
        ${activity.action_url ? `
        <a href="${escapeHtml(activity.action_url)}" class="landlord-btn landlord-btn-outline landlord-btn-sm">
          View Details
        </a>` : ''}
      </div>
    </div>
  `
    )
    .join('');

  container.innerHTML = html;
}

function renderEmptyState(container) {
  container.innerHTML = `
    <div class="activity-empty">
      <div class="activity-empty-icon">
        ${svgImg('history', 40)}
      </div>
      <p class="activity-empty-text">No activities found</p>
      <p class="activity-empty-subtext">Activities will appear here as boarders interact with your properties.</p>
    </div>
  `;
}

function renderErrorState(container) {
  container.innerHTML = `
    <div class="activity-error">
      <div class="activity-error-icon">
        ${svgImg('alert', 40)}
      </div>
      <p class="activity-error-text">Unable to load activities</p>
      <p class="activity-error-subtext">Please try again later.</p>
      <button type="button" class="landlord-btn landlord-btn-primary" id="retry-btn">
        ${svgImg('report', 18)}
        Retry
      </button>
    </div>
  `;

  document.getElementById('retry-btn')?.addEventListener('click', () => loadActivities());
}

function updateStats(stats) {
  const totalEl = document.getElementById('total-activities');
  const weekEl = document.getElementById('week-activities');
  const pendingEl = document.getElementById('pending-actions');

  if (totalEl) totalEl.textContent = stats.total || totalActivities;
  if (weekEl) weekEl.textContent = stats.this_week || '--';
  if (pendingEl) pendingEl.textContent = stats.pending || '--';
}

function updatePagination() {
  const totalPages = Math.ceil(totalActivities / itemsPerPage);
  const pageInfo = document.getElementById('page-info');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');

  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function initFilters() {
  const filterSelect = document.getElementById('activity-filter');
  const dateFilterSelect = document.getElementById('activity-date-filter');

  filterSelect?.addEventListener('change', e => {
    currentFilter = e.target.value;
    currentPage = 1;
    loadActivities();
  });

  dateFilterSelect?.addEventListener('change', e => {
    currentDateFilter = e.target.value;
    currentPage = 1;
    loadActivities();
  });
}

function initPagination() {
  document.getElementById('prev-page')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadActivities();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  document.getElementById('next-page')?.addEventListener('click', () => {
    const totalPages = Math.ceil(totalActivities / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      loadActivities();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

function formatType(type) {
  const types = {
    payment: 'Payment',
    payment_received: 'Payment',
    application: 'Application',
    new_application: 'Application',
    message: 'Message',
    maintenance: 'Maintenance',
    general: 'General',
  };
  if (types[type]) return types[type];
  if (type) return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return 'Activity';
}

function getBadgeClass(type) {
  const map = {
    payment: 'payment',
    payment_received: 'payment',
    application: 'application',
    new_application: 'application',
    message: 'message',
    maintenance: 'maintenance',
    general: 'general',
  };
  return map[type] || 'general';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  initActivity();
});
