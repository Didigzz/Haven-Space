/**
 * Maintenance Page - Boarder Dashboard
 * Handles maintenance request tickets, filtering, and interactions
 */

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
function setupMaintenancePage() {
  initFilterButtons();
  initSearchFunctionality();
  initTicketActions();
  initRatingSystem();
  initPrintButton();
  updateStats();
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
  // For now, just log the ticket ID
  // TODO: Implement proper ticket detail view
  console.log('Viewing ticket:', ticketId);

  // Show a simple alert for demo purposes
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
        console.log(`Rating submitted: ${rating} stars`);
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
  const tickets = document.querySelectorAll('.maintenance-ticket-card');

  let total = tickets.length;
  let pending = 0;
  let completed = 0;
  let inProgress = 0;
  let urgent = 0;

  tickets.forEach(ticket => {
    const status = ticket.dataset.status;
    const isUrgent = ticket.dataset.urgent === 'true';

    if (status === 'pending') pending++;
    else if (status === 'completed') completed++;
    else if (status === 'in-progress') inProgress++;

    if (isUrgent) urgent++;
  });

  // Update stat values
  const statTotal = document.getElementById('stat-total');
  const statPending = document.getElementById('stat-pending');
  const statCompleted = document.getElementById('stat-completed');
  const statUrgent = document.getElementById('stat-urgent');

  if (statTotal) statTotal.textContent = total;
  if (statPending) statPending.textContent = pending;
  if (statCompleted) statCompleted.textContent = completed;
  if (statUrgent) statUrgent.textContent = urgent;
}

/**
 * Add a new ticket to the grid (for future dynamic addition)
 */
function addTicket(ticketData) {
  const container = document.getElementById('maintenance-tickets-container');

  if (!container) return;

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
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>${data.date}</span>
        </div>
        <div class="maintenance-ticket-meta-item">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
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
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      Urgent
    `,
    pending: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Pending
    `,
    'in-progress': `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      In Progress
    `,
    completed: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
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
    electrical: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    `,
    plumbing: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    `,
    appliance: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 18v2m6-2v2M5 6H9a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm10 0h4a2 2 0 012 2v2a2 2 0 01-2 2h-4a2 2 0 01-2-2V8a2 2 0 012-2zM5 18H9a2 2 0 012-2v-2a2 2 0 01-2-2H5a2 2 0 01-2 2v2a2 2 0 012 2zm10 0h4a2 2 0 012-2v-2a2 2 0 01-2-2h-4a2 2 0 01-2 2v2a2 2 0 012 2z" />
      </svg>
    `,
    structural: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    `,
    other: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    `,
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
