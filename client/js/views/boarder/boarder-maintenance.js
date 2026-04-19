/**
 * Maintenance Page - Boarder Dashboard
 * Handles maintenance request tickets, filtering, and interactions
 */

import { getIcon } from '../../shared/icons.js';
import CONFIG from '../../config.js';
import { initBoarderAccessControl, showProtectedEmptyState } from './access-control-init.js';

// State management
const maintenanceState = {
  currentFilter: 'all',
  searchQuery: '',
  tickets: [],
};

/**
 * Initialize the maintenance page
 */
function initMaintenancePage() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMaintenancePage);
  } else {
    setupMaintenancePage();
  }
}

/**
 * Setup all maintenance page functionality
 */
async function setupMaintenancePage() {
  // Check access control first
  const accessResult = await initBoarderAccessControl();

  if (!accessResult.hasAccess) {
    const maintenanceContainer =
      document.querySelector('.maintenance-tickets-container') ||
      document.querySelector('.tickets-grid');
    if (maintenanceContainer) {
      showProtectedEmptyState(maintenanceContainer, 'maintenance');
    }
    return;
  }

  initFilterButtons();
  initSearchFunctionality();
  initRatingSystem();
  initPrintButton();

  // Load tickets from API
  await loadMaintenanceTickets();

  initTicketActions();
  updateStats();
}

/**
 * Load maintenance tickets from API
 */
async function loadMaintenanceTickets() {
  try {
    const userId = getCurrentUserId();
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/maintenance`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to load maintenance tickets');
    }

    const result = await response.json();
    maintenanceState.tickets = result.data || [];

    renderMaintenanceTickets(maintenanceState.tickets);
  } catch (error) {
    console.error('Error loading maintenance tickets:', error);
    showError('Failed to load maintenance requests');
  }
}

/**
 * Render maintenance tickets
 */
function renderMaintenanceTickets(tickets) {
  const container = document.getElementById('maintenance-tickets-container');
  if (!container) return;

  if (tickets.length === 0) {
    container.innerHTML = `
      <div id="maintenance-empty" class="maintenance-empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3>No maintenance requests yet</h3>
        <p>When you submit a maintenance request, it will appear here</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tickets.map(ticket => createTicketCardHTML(ticket)).join('');
}

/**
 * Create ticket card HTML
 */
function createTicketCardHTML(ticket) {
  const statusBadge = getStatusBadge(ticket.status);
  const iconClass = getIconClass(ticket.category);
  const date = new Date(ticket.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `
    <div class="maintenance-ticket-card" data-status="${ticket.status}" data-urgent="${
    ticket.priority === 'urgent'
  }">
      <div class="maintenance-ticket-header">
        <div class="maintenance-ticket-badge ${ticket.status}">
          ${statusBadge}
        </div>
        <span class="maintenance-ticket-id">#${ticket.id}</span>
      </div>
      <div class="maintenance-ticket-body">
        <div class="maintenance-ticket-icon-wrapper">
          <div class="maintenance-ticket-icon ${iconClass}">
            ${getIconSVG(ticket.category)}
          </div>
        </div>
        <h3 class="maintenance-ticket-title">${escapeHtml(ticket.title)}</h3>
        <p class="maintenance-ticket-description">${escapeHtml(ticket.description)}</p>
        <div class="maintenance-ticket-meta">
          <div class="maintenance-ticket-meta-item">
            ${getIcon('calendar', { strokeWidth: '2' })}
            <span>${date}</span>
          </div>
          <div class="maintenance-ticket-meta-item">
            ${getIcon('userCircle', { strokeWidth: '2' })}
            <span>${ticket.assigned_to || 'Unassigned'}</span>
          </div>
        </div>
      </div>
      <div class="maintenance-ticket-footer">
        ${getFooterContent(ticket)}
        <button class="maintenance-ticket-action" data-ticket-id="${ticket.id}">
          View Details
        </button>
      </div>
    </div>
  `;
}

/**
 * Get current user ID
 */
function getCurrentUserId() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return parseInt(user.id || user.user_id || localStorage.getItem('user_id') || '3');
}

/**
 * Show error message
 */
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'toast-message toast-error';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Initialize filter buttons
 */
function initFilterButtons() {
  const filterButtons = document.querySelectorAll('.maintenance-filter-btn');

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to clicked button
      button.classList.add('active');

      // Update filter state
      maintenanceState.currentFilter = button.dataset.filter;

      // Filter tickets
      filterTickets();
    });
  });
}

/**
 * Initialize search functionality
 */
function initSearchFunctionality() {
  const searchInput = document.getElementById('maintenance-search');

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      maintenanceState.searchQuery = e.target.value.toLowerCase().trim();
      filterTickets();
    });
  }
}

/**
 * Filter tickets based on current filter and search query
 */
function filterTickets() {
  const tickets = document.querySelectorAll('.maintenance-ticket-card');
  const emptyState = document.getElementById('maintenance-empty');
  let visibleCount = 0;

  tickets.forEach(ticket => {
    const status = ticket.dataset.status;
    const title =
      ticket.querySelector('.maintenance-ticket-title')?.textContent.toLowerCase() || '';
    const description =
      ticket.querySelector('.maintenance-ticket-description')?.textContent.toLowerCase() || '';
    const id = ticket.querySelector('.maintenance-ticket-id')?.textContent.toLowerCase() || '';

    // Check filter match
    const filterMatch =
      maintenanceState.currentFilter === 'all' ||
      maintenanceState.currentFilter === status ||
      (maintenanceState.currentFilter === 'in-progress' && status === 'in-progress');

    // Check search match
    const searchMatch =
      maintenanceState.searchQuery === '' ||
      title.includes(maintenanceState.searchQuery) ||
      description.includes(maintenanceState.searchQuery) ||
      id.includes(maintenanceState.searchQuery);

    // Show/hide ticket
    if (filterMatch && searchMatch) {
      ticket.style.display = 'flex';
      visibleCount++;
    } else {
      ticket.style.display = 'none';
    }
  });

  // Show empty state if no tickets match
  if (emptyState) {
    emptyState.style.display = visibleCount === 0 ? 'flex' : 'none';
  }
}

/**
 * Initialize ticket action buttons
 */
function initTicketActions() {
  const actionButtons = document.querySelectorAll('.maintenance-ticket-action');

  actionButtons.forEach(button => {
    button.addEventListener('click', () => {
      const ticketId = button.dataset.ticketId;
      handleTicketView(ticketId);
    });
  });
}

/**
 * Handle ticket view action
 * TODO: Implement ticket detail modal or navigation
 */
function handleTicketView(ticketId) {
  // TODO: Implement proper ticket detail view
  alert(
    `Viewing details for ticket #${ticketId}\n\nThis feature will open the ticket detail view.`
  );
}

/**
 * Initialize rating system for completed tickets
 */
function initRatingSystem() {
  const starButtons = document.querySelectorAll('.maintenance-star');

  starButtons.forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.dataset.rating);
      const starsContainer = star.closest('.maintenance-rating-stars');

      if (starsContainer) {
        // Update star ratings
        const allStars = starsContainer.querySelectorAll('.maintenance-star');
        allStars.forEach((s, index) => {
          if (index < rating) {
            s.classList.add('rated');
          } else {
            s.classList.remove('rated');
          }
        });

        // TODO: Send rating to backend
      }
    });
  });
}

/**
 * Initialize print button
 */
function initPrintButton() {
  const printButton = document.getElementById('print-requests-btn');

  if (printButton) {
    printButton.addEventListener('click', () => {
      window.print();
    });
  }
}

/**
 * Update statistics based on current tickets
 */
function updateStats() {
  const tickets = maintenanceState.tickets;

  const total = tickets.length;
  let pending = 0;
  let completed = 0;
  let urgent = 0;

  tickets.forEach(ticket => {
    const status = ticket.status;
    const isUrgent = ticket.priority === 'urgent';

    if (status === 'pending') {
      pending++;
    } else if (status === 'completed') {
      completed++;
    }

    if (isUrgent) {
      urgent++;
    }
  });

  // Update stat values
  const statTotal = document.getElementById('stat-total');
  const statPending = document.getElementById('stat-pending');
  const statCompleted = document.getElementById('stat-completed');
  const statUrgent = document.getElementById('stat-urgent');

  if (statTotal) {
    statTotal.textContent = total;
  }
  if (statPending) {
    statPending.textContent = pending;
  }
  if (statCompleted) {
    statCompleted.textContent = completed;
  }
  if (statUrgent) {
    statUrgent.textContent = urgent;
  }
}

/**
 * Add a new ticket to the grid (for future dynamic addition)
 */
function addTicket(ticketData) {
  const container = document.getElementById('maintenance-tickets-container');

  if (!container) {
    return;
  }

  const ticketCard = createTicketCard(ticketData);
  container.prepend(ticketCard);

  // Update stats
  updateStats();
}

/**
 * Create a ticket card element
 */
function createTicketCard(data) {
  const card = document.createElement('div');
  card.className = 'maintenance-ticket-card';
  card.dataset.status = data.status;
  card.dataset.urgent = data.urgent || 'false';

  const statusBadge = getStatusBadge(data.status);
  const iconClass = getIconClass(data.category);

  card.innerHTML = `
    <div class="maintenance-ticket-header">
      <div class="maintenance-ticket-badge ${data.status}">
        ${statusBadge}
      </div>
      <span class="maintenance-ticket-id">${data.id}</span>
    </div>
    <div class="maintenance-ticket-body">
      <div class="maintenance-ticket-icon-wrapper">
        <div class="maintenance-ticket-icon ${iconClass}">
          ${getIconSVG(data.category)}
        </div>
      </div>
      <h3 class="maintenance-ticket-title">${data.title}</h3>
      <p class="maintenance-ticket-description">${data.description}</p>
      <div class="maintenance-ticket-meta">
        <div class="maintenance-ticket-meta-item">
          ${getIcon('calendar', { strokeWidth: '2' })}
          <span>${data.date}</span>
        </div>
        <div class="maintenance-ticket-meta-item">
          ${getIcon('userCircle', { strokeWidth: '2' })}
          <span>${data.assigned}</span>
        </div>
      </div>
    </div>
    <div class="maintenance-ticket-footer">
      ${getFooterContent(data)}
      <button class="maintenance-ticket-action" data-ticket-id="${data.id.replace('#', '')}">
        View Details
      </button>
    </div>
  `;

  // Add event listener to the new button
  const actionButton = card.querySelector('.maintenance-ticket-action');
  actionButton.addEventListener('click', () => {
    handleTicketView(data.id.replace('#', ''));
  });

  return card;
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
  const badges = {
    urgent: `
      ${getIcon('lightning', { strokeWidth: '2' })}
      Urgent
    `,
    pending: `
      ${getIcon('history', { strokeWidth: '2' })}
      Pending
    `,
    'in-progress': `
      ${getIcon('lightning', { strokeWidth: '2' })}
      In Progress
    `,
    completed: `
      ${getIcon('checkCircle', { strokeWidth: '2' })}
      Completed
    `,
  };

  return badges[status] || badges.pending;
}

/**
 * Get icon class based on category
 */
function getIconClass(category) {
  const classes = {
    electrical: 'orange',
    plumbing: 'cyan',
    appliance: 'blue',
    structural: 'green',
    other: 'blue',
  };

  return classes[category] || 'blue';
}

/**
 * Get icon SVG based on category
 */
function getIconSVG(category) {
  const icons = {
    electrical: getIcon('lightning', { strokeWidth: '2' }),
    plumbing: getIcon('plumbing', { strokeWidth: '2' }),
    appliance: getIcon('appliance', { strokeWidth: '2' }),
    structural: getIcon('structural', { strokeWidth: '2' }),
    other: getIcon('wrenchScrewdriver', { strokeWidth: '2' }),
  };

  return icons[category] || icons.other;
}

/**
 * Get footer content based on ticket status
 */
function getFooterContent(data) {
  if (data.status === 'completed') {
    return `
      <div class="maintenance-ticket-rating">
        <span class="maintenance-rating-label">Rate the service:</span>
        <div class="maintenance-rating-stars">
          <button class="maintenance-star" data-rating="1">★</button>
          <button class="maintenance-star" data-rating="2">★</button>
          <button class="maintenance-star" data-rating="3">★</button>
          <button class="maintenance-star" data-rating="4">★</button>
          <button class="maintenance-star" data-rating="5">★</button>
        </div>
      </div>
    `;
  } else if (data.status === 'in-progress') {
    return `
      <div class="maintenance-ticket-progress">
        <div class="maintenance-progress-bar">
          <div class="maintenance-progress-fill" style="width: ${data.progress || 50}%"></div>
        </div>
        <span class="maintenance-progress-label">In Progress - ${data.progress || 50}%</span>
      </div>
    `;
  }

  return '';
}

// Initialize the page
initMaintenancePage();

// Export functions for external use
export { initMaintenancePage, addTicket, filterTickets, updateStats, maintenanceState };
