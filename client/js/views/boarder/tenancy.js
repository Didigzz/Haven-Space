/**
 * Boarder Tenancy Page
 * Handles tenancy details, documents, payment history, and maintenance history
 */

import CONFIG from '../../config.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { initBoarderAccessControl, showProtectedEmptyState } from './access-control-init.js';

function loginPath() {
  const pathname = window.location.pathname;
  if (pathname.includes('github.io')) {
    return '/Haven-Space/client/views/public/auth/login.html';
  }
  if (pathname.includes('/views/')) {
    return '/views/public/auth/login.html';
  }
  return '/views/public/auth/login.html';
}

function initialsFrom(user) {
  const a = (user.first_name || '').trim().charAt(0);
  const b = (user.last_name || '').trim().charAt(0);
  return (a + b || 'B').toUpperCase();
}

/**
 * Initialize Tenancy Page
 * Sets up sidebar, navbar, and tenancy page functionality
 */
export async function initLeasePage() {
  // Check access control first
  const accessResult = await initBoarderAccessControl();

  if (!accessResult.hasAccess) {
    const leaseContainer =
      document.querySelector('.tenancy-container') || document.querySelector('main');
    if (leaseContainer) {
      showProtectedEmptyState(leaseContainer, 'tenancy');
    }
    return;
  }

  let user;
  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me.php`, {
      credentials: 'include',
      headers,
    });
    if (!res.ok) {
      window.location.href = loginPath();
      return;
    }
    const data = await res.json();
    user = data.user;
  } catch {
    window.location.href = loginPath();
    return;
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'Boarder';
  const initials = initialsFrom(user);

  // Initialize sidebar
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    initSidebar({
      role: 'boarder',
      user: {
        name,
        initials,
        role: 'Boarder',
        email: user.email || '',
        avatar_url: user.avatar_url || '',
      },
    });

    // Keep sidebar avatar/name in sync after profile updates
    window.addEventListener('userProfileUpdated', e => {
      const updated = e.detail || {};
      const avatarImg = document.getElementById('sidebar-avatar-img');
      const avatarInitials = document.getElementById('sidebar-avatar-initials');
      const sidebarName = document.getElementById('sidebar-profile-name');
      if (updated.avatar_url && avatarImg && avatarInitials) {
        avatarImg.src = updated.avatar_url;
        avatarImg.style.cssText = 'display:block;width:100%;height:100%;border-radius:50%;object-fit:cover;';
        avatarInitials.style.display = 'none';
        avatarImg.onerror = () => { avatarImg.style.display = 'none'; avatarInitials.style.display = 'flex'; };
      }
      if ((updated.first_name || updated.last_name) && sidebarName) {
        sidebarName.textContent = `${updated.first_name || ''} ${updated.last_name || ''}`.trim() || sidebarName.textContent;
      }
    });
  }

  // Initialize navbar
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    initNavbar({
      user: {
        name,
        initials,
        avatarUrl: user.avatar_url || '',
        email: user.email || '',
      },
      notificationCount: 3,
    });
  }

  // Initialize tenancy page functionality
  setupLeasePage();
}

/**
 * Setup tenancy page functionality
 */
function setupLeasePage() {
  // Fetch tenancy data from backend
  fetchLeaseData();

  // Fetch payment history from backend
  fetchPaymentHistory();

  setupDocumentDownloadHandlers();
}

/**
 * Fetch tenancy data from backend
 */
async function fetchLeaseData() {
  try {
    const userId = localStorage.getItem('user_id') || '3';
    const token = localStorage.getItem('token');

    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authentication - prefer JWT token, fallback to X-User-Id for testing
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['X-User-Id'] = userId;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/tenancy`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      await response.text();
      throw new Error(`Failed to fetch tenancy data: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      renderLeaseDetails(result.data);
    } else {
      showNoLeaseState();
    }
  } catch (error) {
    showNoLeaseState();
  }
}

/**
 * Show no tenancy state
 */
function showNoLeaseState() {
  const content = document.querySelector('.tenancy-page-content');
  if (content) {
    content.innerHTML = `
      <div style="text-align: center; padding: 80px 20px; color: #6b7280;">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 24px; opacity: 0.5;">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <h2 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600; color: #111827;">No Active Tenancy</h2>
        <p style="margin: 0 0 24px 0; font-size: 16px;">You don't have an active tenancy yet. Apply for a room to get started!</p>
        <a href="../find-a-room/index.html" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">Find a Room</a>
      </div>
    `;
  }
}

/**
 * Render tenancy details
 * @param {Object} tenancy - Tenancy data from backend
 */
function renderLeaseDetails(tenancy) {
  // Update property badge and title
  const propertyBadge = document.querySelector('.tenancy-property-badge span:last-child');
  if (propertyBadge) {
    propertyBadge.textContent = tenancy.property_name;
  }

  const propertyTitle = document.querySelector('.tenancy-property-title');
  if (propertyTitle) {
    propertyTitle.textContent = `Room ${tenancy.room_number} • ${tenancy.property_name}`;
  }

  const propertySubtitle = document.querySelector('.tenancy-property-subtitle');
  if (propertySubtitle) {
    const startDate = new Date(tenancy.tenancy_start_date);
    const formattedDate = startDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    propertySubtitle.textContent = `Living here since ${formattedDate}`;
  }

  // Update duration banner
  const durationValue = document.getElementById('tenancy-duration-value');
  if (durationValue) {
    const months = tenancy.months_since_move_in;
    const days = tenancy.days_since_move_in;

    let durationStr = '';
    if (months > 0) {
      durationStr = `${months} month${months !== 1 ? 's' : ''}`;
      const remainingDays = days - months * 30;
      if (remainingDays > 0) {
        durationStr += `, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
      }
    } else {
      durationStr = `${days} day${days !== 1 ? 's' : ''}`;
    }

    durationValue.textContent = durationStr;
  }

  // Update move-in date in banner
  const moveInDateDisplay = document.getElementById('tenancy-move-in-date-display');
  if (moveInDateDisplay) {
    const startDate = new Date(tenancy.tenancy_start_date);
    moveInDateDisplay.textContent = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Update key information cards
  const monthlyRentValue = document.querySelector(
    '.tenancy-key-card-primary .tenancy-key-card-value'
  );
  if (monthlyRentValue) {
    monthlyRentValue.textContent = `₱${formatCurrency(tenancy.monthly_rent)}`;
  }

  const securityDepositValue = document.querySelectorAll('.tenancy-key-card-value')[1];
  if (securityDepositValue) {
    securityDepositValue.textContent = `₱${formatCurrency(tenancy.deposit)}`;
  }

  // Update duration card
  const durationCard = document.getElementById('tenancy-duration-card');
  if (durationCard) {
    const months = tenancy.months_since_move_in;
    const days = tenancy.days_since_move_in;

    let durationStr = '';
    if (months > 0) {
      durationStr = `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      durationStr = `${days} day${days !== 1 ? 's' : ''}`;
    }

    durationCard.textContent = durationStr;
  }

  // Update move-in note
  const moveInNote = document.getElementById('tenancy-move-in-note');
  if (moveInNote) {
    const startDate = new Date(tenancy.tenancy_start_date);
    moveInNote.textContent = `Since ${startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }

  // Update tenancy information section
  updateLeaseInformationSection(tenancy);
}

/**
 * Update tenancy information section
 */
function updateLeaseInformationSection(tenancy) {
  // Property Address
  const propertyAddressValue = document.querySelector('[data-tenancy-info="property-address"]');
  if (propertyAddressValue) {
    propertyAddressValue.textContent = `${tenancy.address}, ${tenancy.city}, ${tenancy.province}`;
  }

  // Move-in Date
  const moveInDateDetail = document.getElementById('tenancy-move-in-date-detail');
  if (moveInDateDetail) {
    const startDate = new Date(tenancy.tenancy_start_date);
    moveInDateDetail.textContent = startDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Duration of Stay
  const durationDetail = document.getElementById('tenancy-duration-detail');
  if (durationDetail) {
    const months = tenancy.months_since_move_in;
    const days = tenancy.days_since_move_in;

    let durationStr = '';
    if (months > 0) {
      durationStr = `${months} month${months !== 1 ? 's' : ''}`;
      const remainingDays = days - months * 30;
      if (remainingDays > 0) {
        durationStr += `, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
      }
    } else {
      durationStr = `${days} day${days !== 1 ? 's' : ''}`;
    }

    durationDetail.textContent = durationStr;
  }

  // Payment Details
  const monthlyRentDetail = document.getElementById('tenancy-monthly-rent-detail');
  if (monthlyRentDetail) {
    monthlyRentDetail.innerHTML = `Monthly: <strong>₱${formatCurrency(
      tenancy.monthly_rent
    )}</strong>`;
  }

  const securityDepositDetail = document.getElementById('tenancy-security-deposit-detail');
  if (securityDepositDetail) {
    securityDepositDetail.innerHTML = `Security: <strong>₱${formatCurrency(
      tenancy.deposit
    )}</strong>`;
  }

  // Landlord Contact Info
  const landlordName = document.getElementById('tenancy-landlord-name');
  if (landlordName) {
    landlordName.textContent = tenancy.landlord.name;
  }

  const landlordAvatar = document.getElementById('tenancy-landlord-avatar');
  if (landlordAvatar) {
    const initials = tenancy.landlord.name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
    landlordAvatar.querySelector('span').textContent = initials;
  }

  const landlordEmail = document.getElementById('tenancy-landlord-email');
  const landlordEmailLink = document.getElementById('tenancy-landlord-email-link');
  if (landlordEmail && landlordEmailLink) {
    landlordEmail.textContent = tenancy.landlord.email;
    landlordEmailLink.href = `mailto:${tenancy.landlord.email}`;
  }

  const landlordPhone = document.getElementById('tenancy-landlord-phone');
  const landlordPhoneLink = document.getElementById('tenancy-landlord-phone-link');
  if (landlordPhone && landlordPhoneLink && tenancy.landlord.phone) {
    landlordPhone.textContent = tenancy.landlord.phone;
    landlordPhoneLink.href = `tel:${tenancy.landlord.phone}`;
    landlordPhoneLink.style.display = 'inline-flex';
  }
}

/**
 * Format currency value
 */
function formatCurrency(value) {
  if (value === null || value === undefined) return '0.00';
  return parseFloat(value).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Fetch payment history from backend
 */
async function fetchPaymentHistory() {
  try {
    const userId = localStorage.getItem('user_id') || '3';
    const token = localStorage.getItem('token');

    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authentication - prefer JWT token, fallback to X-User-Id for testing
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['X-User-Id'] = userId;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/history?limit=10`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) throw new Error('Failed to fetch payment history');

    const result = await response.json();

    if (result.success && result.data) {
      renderPaymentHistory(result.data);
    }
  } catch (error) {
    console.error('Error fetching payment history:', error);
  }
}

/**
 * Render payment history table
 * @param {Array} payments - Array of payment objects
 */
function renderPaymentHistory(payments) {
  const tbody = document.querySelector('.lease-table-body');
  if (!tbody) return;

  if (!payments || payments.length === 0) {
    tbody.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #6b7280; grid-column: 1 / -1;">
        <p style="margin: 0;">No payment history available</p>
      </div>
    `;
    return;
  }

  tbody.innerHTML = payments
    .map(payment => {
      const dueDate = new Date(payment.due_date);
      const paidDate = payment.payment_date ? new Date(payment.payment_date) : null;

      const formattedDueDate = dueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const formattedPaidDate = paidDate
        ? paidDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '-';

      const period = dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const statusClass = payment.status === 'paid' ? 'lease-status-paid' : 'lease-status-pending';
      const statusText = payment.status === 'paid' ? 'Paid' : 'Pending';

      return `
      <div class="lease-table-row">
        <span class="lease-table-cell">${period}</span>
        <span class="lease-table-cell lease-table-cell-bold">₱${formatCurrency(
          payment.amount
        )}</span>
        <span class="lease-table-cell">${formattedDueDate}</span>
        <span class="lease-table-cell">${formattedPaidDate}</span>
        <span class="lease-table-cell">
          <span class="lease-status-badge ${statusClass}">${statusText}</span>
        </span>
      </div>
    `;
    })
    .join('');
}

/**
 * Setup document download button handlers
 */
function setupDocumentDownloadHandlers() {
  const downloadButtons = document.querySelectorAll('.boarder-tenancy-doc-btn');

  downloadButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const docId = button.dataset.docId;

      // TODO: Integrate with backend API for document download
      alert(
        `TODO: Backend Integration\n\nDownloading document: ${docId}\n\nThis will connect to the backend API to fetch the actual document.`
      );
    });
  });
}
