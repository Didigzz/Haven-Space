/**
 * Room History Page
 * Handles interactions for the boarder's room history timeline
 */

import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';

// Sample data for demonstration (to be replaced with backend API)
const roomHistoryData = {
  currentResidence: {
    id: 1,
    name: 'Sunrise Dormitory, Room 402',
    location: '123 University Avenue, College Town',
    startDate: '2024-09-01',
    monthlyRent: 5500,
    paymentsMade: 7,
  },
  pastResidences: [
    {
      id: 2,
      name: 'Campus View Apartments, Unit 12B',
      location: '456 College Road, University District',
      period: 'Aug 2023 - Aug 2024',
      monthlyRent: 4800,
      duration: '12 months',
      totalPaid: 57600,
      maintenanceRequests: 3,
      status: 'completed',
    },
    {
      id: 3,
      name: 'Student Haven Dormitory, Room 205',
      location: '789 Scholar Street, Academic Zone',
      period: 'Sept 2022 - July 2023',
      monthlyRent: 4200,
      duration: '10 months',
      totalPaid: 42000,
      maintenanceRequests: 1,
      status: 'completed',
    },
    {
      id: 4,
      name: 'University Heights, Room 101',
      location: '321 Campus Drive, University Belt',
      period: 'Jan 2022 - Aug 2022',
      monthlyRent: 3800,
      duration: '7 months',
      totalPaid: 26600,
      maintenanceRequests: 0,
      status: 'completed',
    },
  ],
  paymentSummary: {
    totalPayments: 26,
    totalAmount: 126200,
    onTimeRate: 100,
    latePayments: 0,
  },
};

/**
 * Initialize Room History page
 */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize sidebar with boarder role
  initSidebar({
    role: 'boarder',
    user: {
      name: 'Juan Dela Cruz',
      initials: 'JD',
      role: 'Boarder',
    },
  });

  // Initialize navbar
  initNavbar({
    user: {
      name: 'Juan Dela Cruz',
      initials: 'JD',
      avatarUrl: '',
    },
    notificationCount: 3,
  });

  // Setup action button handlers
  setupActionHandlers();

  // Setup residence card interactions
  setupResidenceInteractions();

  // Animate stats on scroll
  animateStats();
});

/**
 * Setup action button click handlers
 */
function setupActionHandlers() {
  const actionButtons = document.querySelectorAll('.history-action-btn');

  actionButtons.forEach(button => {
    button.addEventListener('click', handleActionButtonClick);
  });
}

/**
 * Handle action button clicks
 * @param {Event} event - Click event
 */
function handleActionButtonClick(event) {
  const button = event.currentTarget;
  const action = button.dataset.action;
  const residenceCard = button.closest('.timeline-residence-card');
  const residenceName = residenceCard.querySelector('.residence-card-name').textContent;

  console.log(`Action: ${action}, Residence: ${residenceName}`);

  switch (action) {
    case 'view-details':
      handleViewDetails(residenceCard);
      break;
    case 'view-payments':
      handleViewPayments(residenceCard);
      break;
    case 'view-maintenance':
      handleViewMaintenance(residenceCard);
      break;
    default:
      console.warn('Unknown action:', action);
  }
}

/**
 * Handle view details action
 * @param {HTMLElement} residenceCard - Residence card element
 */
function handleViewDetails(residenceCard) {
  const residenceName = residenceCard.querySelector('.residence-card-name').textContent;
  const location = residenceCard.querySelector('.residence-card-location').textContent.trim();
  const stats = residenceCard.querySelectorAll('.residence-stat-value');

  const details = {
    name: residenceName,
    location: location,
    monthlyRent: stats[0]?.textContent,
    duration: stats[1]?.textContent,
    totalPaid: stats[2]?.textContent,
    maintenance: stats[3]?.textContent,
  };

  // Show details in a modal or navigate to detail page
  console.log('Viewing details:', details);

  // TODO: Implement modal or navigate to detail page
  // For now, show a simple alert (to be replaced with proper UI)
  showResidenceDetailsModal(details);
}

/**
 * Handle view payments action
 * @param {HTMLElement} residenceCard - Residence card element
 */
function handleViewPayments(residenceCard) {
  const residenceName = residenceCard.querySelector('.residence-card-name').textContent;

  console.log('Viewing payment history for:', residenceName);

  // TODO: Navigate to payment history or show modal
  // For demonstration, redirect to payments page with filter
  // window.location.href = `../payments/index.html?residence=${encodeURIComponent(residenceName)}`;

  showPaymentHistoryModal(residenceName);
}

/**
 * Handle view maintenance action
 * @param {HTMLElement} residenceCard - Residence card element
 */
function handleViewMaintenance(residenceCard) {
  const residenceName = residenceCard.querySelector('.residence-card-name').textContent;

  console.log('Viewing maintenance log for:', residenceName);

  // TODO: Navigate to maintenance log or show modal
  showMaintenanceLogModal(residenceName);
}

/**
 * Setup residence card interactions
 */
function setupResidenceInteractions() {
  const residenceCards = document.querySelectorAll('.timeline-residence-card');

  residenceCards.forEach(card => {
    // Add hover effects
    card.addEventListener('mouseenter', () => {
      card.style.cursor = 'pointer';
    });

    // Optional: Click to expand details
    // card.addEventListener('click', (e) => {
    //   // Don't trigger if clicking on buttons
    //   if (!e.target.closest('.history-action-btn')) {
    //     handleViewDetails(card);
    //   }
    // });
  });
}

/**
 * Animate stats counters
 */
function animateStats() {
  const statValues = document.querySelectorAll('.room-history-stat-value');

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    },
    {
      threshold: 0.5,
    }
  );

  statValues.forEach(stat => {
    stat.style.opacity = '0';
    stat.style.transform = 'translateY(10px)';
    stat.style.transition = 'all 0.5s ease';
    observer.observe(stat);
  });
}

/**
 * Show residence details modal
 * @param {Object} details - Residence details
 */
function showResidenceDetailsModal(details) {
  // Create modal HTML
  const modal = document.createElement('div');
  modal.className = 'room-history-modal';
  modal.innerHTML = `
    <div class="room-history-modal-overlay"></div>
    <div class="room-history-modal-content">
      <div class="room-history-modal-header">
        <h3>Residence Details</h3>
        <button class="room-history-modal-close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="room-history-modal-body">
        <div class="modal-detail-row">
          <span class="modal-detail-label">Property Name:</span>
          <span class="modal-detail-value">${details.name}</span>
        </div>
        <div class="modal-detail-row">
          <span class="modal-detail-label">Location:</span>
          <span class="modal-detail-value">${details.location}</span>
        </div>
        <div class="modal-detail-row">
          <span class="modal-detail-label">Monthly Rent:</span>
          <span class="modal-detail-value">${details.monthlyRent}</span>
        </div>
        <div class="modal-detail-row">
          <span class="modal-detail-label">Duration:</span>
          <span class="modal-detail-value">${details.duration}</span>
        </div>
        <div class="modal-detail-row">
          <span class="modal-detail-label">Total Paid:</span>
          <span class="modal-detail-value">${details.totalPaid}</span>
        </div>
        <div class="modal-detail-row">
          <span class="modal-detail-label">Maintenance Requests:</span>
          <span class="modal-detail-value">${details.maintenance}</span>
        </div>
      </div>
      <div class="room-history-modal-footer">
        <button class="room-history-modal-btn primary">Download Receipt</button>
        <button class="room-history-modal-btn">Close</button>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .room-history-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: modalFadeIn 0.3s ease;
    }
    .room-history-modal-overlay {
      position: absolute;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
    }
    .room-history-modal-content {
      position: relative;
      background-color: var(--white);
      border-radius: 16px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: modalSlideUp 0.3s ease;
    }
    .room-history-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }
    .room-history-modal-header h3 {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
    }
    .room-history-modal-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: background-color 0.2s;
    }
    .room-history-modal-close:hover {
      background-color: var(--bg-cream);
    }
    .room-history-modal-close svg {
      width: 20px;
      height: 20px;
      color: var(--text-gray);
    }
    .room-history-modal-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
    }
    .modal-detail-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .modal-detail-label {
      font-size: 12px;
      color: var(--text-gray);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .modal-detail-value {
      font-size: 15px;
      color: var(--text-dark);
      font-weight: 600;
    }
    .room-history-modal-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }
    .room-history-modal-btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid var(--border-color);
      background-color: var(--white);
      color: var(--text-dark);
    }
    .room-history-modal-btn.primary {
      background-color: var(--primary-green);
      border-color: var(--primary-green);
      color: var(--white);
    }
    .room-history-modal-btn.primary:hover {
      background-color: var(--dark-green);
    }
    .room-history-modal-btn:hover {
      background-color: var(--bg-cream);
    }
    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes modalSlideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(modal);

  // Close modal handlers
  const closeBtn = modal.querySelector('.room-history-modal-close');
  const overlay = modal.querySelector('.room-history-modal-overlay');
  const footerCloseBtn = modal.querySelector(
    '.room-history-modal-footer .room-history-modal-btn:not(.primary)'
  );

  const closeModal = () => {
    modal.style.animation = 'modalFadeIn 0.3s ease reverse';
    setTimeout(() => {
      modal.remove();
      style.remove();
    }, 300);
  };

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
  footerCloseBtn.addEventListener('click', closeModal);
}

/**
 * Show payment history modal
 * @param {string} residenceName - Residence name
 */
function showPaymentHistoryModal(residenceName) {
  console.log('Payment history modal for:', residenceName);
  // TODO: Implement payment history modal with actual data
  alert(`Payment history for ${residenceName}\n\nThis would show a detailed payment breakdown.`);
}

/**
 * Show maintenance log modal
 * @param {string} residenceName - Residence name
 */
function showMaintenanceLogModal(residenceName) {
  console.log('Maintenance log for:', residenceName);
  // TODO: Implement maintenance log modal with actual data
  alert(
    `Maintenance log for ${residenceName}\n\nThis would show all maintenance requests and their status.`
  );
}
