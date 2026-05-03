/**
 * Boarder Dashboard - Dynamic Functionality
 *
 * Handles interactive features for the problem-solving focused boarder dashboard
 */

import { getIcon } from '../../shared/icons.js';

import CONFIG from '../../config.js';

// Dashboard state management
const dashboardState = {
  user: null,
  applications: [],
  payments: [],
  savedSearches: [],
  documents: [],
  tenancy: null,
  // Track user's contract status
  contractStatus: 'application', // 'application' | 'contract' | 'active-tenancy'
};

/**
 * Initialize dashboard when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  initializeSearch();
  initializePaymentAlerts();
  initializeMapPreview();
  initializeSavedSearches();
  initializeApplicationTracker();
  initializeDynamicCards();
  initializeKeyboardNavigation();

  // Load dashboard data from API
  loadDashboardData();
});

/**
 * Initialize advanced search functionality
 */
function initializeSearch() {
  const searchInput = document.querySelector('.boarder-search-input');
  const searchButton = document.querySelector('.boarder-search-filters .boarder-btn');

  // Add accessible label for search input if not present
  if (searchInput && !document.querySelector('[for="boarder-search"]')) {
    const label = document.createElement('label');
    label.htmlFor = 'boarder-search';
    label.className = 'visually-hidden';
    label.textContent = 'Search properties';
    searchInput.parentNode.insertBefore(label, searchInput);
    searchInput.id = 'boarder-search';
  }

  if (searchButton) {
    searchButton.addEventListener('click', handleSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
  }
}

/**
 * Handle search submission
 */
function handleSearch() {
  const searchInput = document.querySelector('.boarder-search-input');
  const filters = document.querySelectorAll('.boarder-filter-select');

  const searchQuery = searchInput?.value || '';
  const searchParams = {
    query: searchQuery,
    priceRange: filters[0]?.value || '',
    amenities: filters[1]?.value || '',
    propertyType: filters[2]?.value || '',
  };

  // Navigate to rooms page with search params
  const queryParams = new URLSearchParams(searchParams).toString();
  window.location.href = `../rooms/index.html?${queryParams}`;
}

/**
 * Initialize payment alert system
 */
function initializePaymentAlerts() {
  const paymentCards = document.querySelectorAll('.boarder-payment-status-card');

  paymentCards.forEach(card => {
    const payButton = card.querySelector('.boarder-btn');
    if (payButton) {
      payButton.addEventListener('click', () => {
        const propertyName =
          card.querySelector('.boarder-payment-property-name')?.textContent || '';
        const amount = card.querySelector('.boarder-payment-amount')?.textContent || '';

        // Navigate to payment page with pre-filled details
        window.location.href = `../payments/pay.html?property=${encodeURIComponent(
          propertyName
        )}&amount=${encodeURIComponent(amount)}`;
      });
    }
  });
}

/**
 * Initialize map preview interactions
 */
function initializeMapPreview() {
  const mapContainer = document.querySelector('.boarder-map-container');
  const useLocationBtn = document.querySelector('.boarder-map-actions .boarder-btn:first-child');
  const drawAreaBtn = document.querySelector('.boarder-map-actions .boarder-btn:last-child');

  if (mapContainer) {
    mapContainer.addEventListener('click', () => {
      window.location.href = '../maps.html';
    });
  }

  if (useLocationBtn) {
    useLocationBtn.addEventListener('click', e => {
      e.stopPropagation();
      getUserLocation();
    });
  }

  if (drawAreaBtn) {
    drawAreaBtn.addEventListener('click', e => {
      e.stopPropagation();
      window.location.href = '../maps.html?mode=draw';
    });
  }
}

/**
 * Get user's current location
 */
function getUserLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        window.location.href = `../maps.html?lat=${latitude}&lng=${longitude}`;
      },
      error => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please enable location permissions.');
      }
    );
  } else {
    alert('Geolocation is not supported by your browser');
  }
}

/**
 * Initialize saved searches (bookmarked properties) functionality
 */
function initializeSavedSearches() {
  // Load saved listings from API
  loadSavedListings();
}

/**
 * Load saved listings from API
 */
async function loadSavedListings() {
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

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/saved-listings`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      dashboardState.savedSearches = data.data || [];
      renderSavedListings(dashboardState.savedSearches);
    } else {
      console.error('Failed to load saved listings:', response.status);
      renderSavedListings([]);
    }
  } catch (error) {
    console.error('Error loading saved listings:', error);
    renderSavedListings([]);
  }
}

/**
 * Render saved listings in the dashboard
 */
function renderSavedListings(listings) {
  const container = document.querySelector('.boarder-saved-searches');
  if (!container) return;

  if (!listings || listings.length === 0) {
    container.innerHTML = `
      <div class="boarder-empty-state" style="text-align: center; padding: 40px 20px; color: #6b7280;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.5;" aria-hidden="true" focusable="false">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <p style="margin: 0; font-size: 14px; font-weight: 500;">No saved properties yet</p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">Bookmark properties you like to see them here</p>
      </div>
    `;
    announceToScreenReader('No saved properties available.');
    return;
  }

  container.innerHTML = listings
    .slice(0, 3)
    .map(listing => {
      const property = listing.property;
      const room = listing.room;
      const price = room ? room.price : property.price;

      // Extract location info from address
      const addressParts = property.address.split(',');
      const area = addressParts[addressParts.length - 1]?.trim() || property.address;

      // Format price range
      const priceFormatted = `₱${formatCurrency(price)}`;

      return `
        <div class="boarder-search-alert" data-listing-id="${listing.id}" data-property-id="${
        property.id
      }">
          <div class="boarder-search-alert-header">
            <h4 class="boarder-search-alert-name">${escapeHtml(property.title)}</h4>
            <button class="boarder-btn-icon" onclick="removeSavedListing(${listing.id}, ${
        property.id
      })" aria-label="Remove from saved">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="currentColor"></path>
              </svg>
            </button>
          </div>
          <p class="boarder-search-alert-criteria">${area} • ${priceFormatted}</p>
          <div class="boarder-search-alert-stats">
            <a href="../rooms/room-details.html?id=${
              property.id
            }" class="boarder-btn-text" style="font-size: 13px;">View Property</a>
          </div>
        </div>
      `;
    })
    .join('');

  announceToScreenReader(`${listings.length} saved properties loaded.`);
}

/**
 * Remove a saved listing
 */
window.removeSavedListing = async function (listingId, propertyId) {
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

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/saved-listings`, {
      method: 'DELETE',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify({ property_id: propertyId }),
    });

    if (response.ok) {
      showNotification('Property removed from saved listings', 'success');
      // Reload saved listings
      loadSavedListings();
    } else {
      showNotification('Failed to remove property', 'error');
    }
  } catch (error) {
    console.error('Error removing saved listing:', error);
    showNotification('Failed to remove property', 'error');
  }
};

/**
 * Initialize application tracker interactions
 */
function initializeApplicationTracker() {
  const viewDetailButtons = document.querySelectorAll(
    '.boarder-application-actions .boarder-btn-outline:first-child'
  );
  const actionButtons = document.querySelectorAll(
    '.boarder-application-actions .boarder-btn-primary, .boarder-application-actions .boarder-btn-outline:last-child'
  );

  viewDetailButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.boarder-application-card');

      // Show notification that this feature is not yet implemented
      showNotification('Application details feature coming soon', 'info');
    });
  });

  actionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.boarder-application-card');
      const appName =
        btn.closest('.boarder-application-card')?.querySelector('.boarder-application-name')
          ?.textContent || '';
      const action = btn.textContent.trim();

      if (action === 'Sign Contract') {
        // Show notification that this feature is not yet implemented
        showNotification('Contract signing feature coming soon', 'info');
      } else if (action === 'Withdraw') {
        if (confirm(`Are you sure you want to withdraw your application for ${appName}?`)) {
          showNotification('Application withdrawal submitted', 'info');
        }
      }
    });
  });
}

/**
 * Initialize keyboard navigation for interactive elements
 */
function initializeKeyboardNavigation() {
  // Add keyboard support for all buttons and links
  const interactiveElements = document.querySelectorAll(
    'button, [role="button"], a, [tabindex="0"]'
  );

  interactiveElements.forEach(element => {
    // Ensure all interactive elements are keyboard accessible
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }

    // Add keyboard event listeners for elements that don't have native button behavior
    if (element.tagName !== 'BUTTON' && element.tagName !== 'A') {
      element.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          element.click();
        }
      });
    }
  });

  // Add keyboard support for toggle switches
  const toggleSwitches = document.querySelectorAll('.boarder-toggle input[type="checkbox"]');
  toggleSwitches.forEach(toggle => {
    toggle.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle.checked = !toggle.checked;
        const event = new Event('change');
        toggle.dispatchEvent(event);
      }
    });
  });
}

/**
 * Show notification toast
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
  // Remove existing notification if any
  const existingNotification = document.querySelector('.boarder-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element with proper ARIA role
  const notification = document.createElement('div');
  notification.className = `boarder-notification boarder-notification-${type}`;
  notification.role = type === 'error' ? 'alert' : 'status';
  notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  notification.innerHTML = `
    <div class="boarder-notification-content">
      ${getIcon('infoCircle', { width: 20, height: 20, 'aria-hidden': 'true' })}
      <span>${message}</span>
    </div>
  `;

  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 20px;
    background-color: ${getNotificationColor(type)};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Get notification color based on type
 */
function getNotificationColor(type) {
  const colors = {
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };
  return colors[type] || colors.info;
}

/**
 * Load dashboard data from API
 */
async function loadDashboardData() {
  try {
    const userId = getCurrentUserId();

    // Fetch applications
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const appsResponse = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/applications`, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
      });

      if (appsResponse.ok) {
        const appsData = await appsResponse.json();
        dashboardState.applications = appsData.data || [];
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    }

    // Fetch announcements for dashboard preview
    try {
      const announcementsResponse = await fetch(
        `${CONFIG.API_BASE_URL}/api/boarder/announcements`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
          },
          credentials: 'include',
        }
      );

      if (announcementsResponse.ok) {
        const announcementsData = await announcementsResponse.json();
        const announcements = announcementsData.data?.announcements || [];
        renderDashboardAnnouncements(announcements.slice(0, 3)); // Show top 3
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    }

    // Maintenance system was removed - skip maintenance fetch

    // Fetch tenancy information
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const leaseResponse = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/tenancy`, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
      });

      if (leaseResponse.ok) {
        const tenancyData = await leaseResponse.json();
        dashboardState.tenancy = tenancyData.data || null;
        renderLeaseInfo(dashboardState.tenancy);

        renderImportantInformation(dashboardState.tenancy);
      }
    } catch (error) {
      console.error('Error loading tenancy info:', error);
    }

    // Fetch payment history for dashboard preview
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const paymentsResponse = await fetch(`${CONFIG.API_BASE_URL}/api/payments/history?limit=3`, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
      });

      if (paymentsResponse.ok) {
        const contentType = paymentsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const paymentsData = await paymentsResponse.json();
          dashboardState.payments = paymentsData.data || [];
          renderDashboardPayments(dashboardState.payments);
        } else {
          console.error('Payments API returned non-JSON response');
          const text = await paymentsResponse.text();
          console.error('Response text:', text.substring(0, 500));
        }
      } else {
        console.error('Payments API error:', paymentsResponse.status, paymentsResponse.statusText);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
      // Show empty state or error message in UI
      renderDashboardPayments([]);
    }

    updateDashboardUI();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

/**
 * Get current user ID from localStorage
 */
function getCurrentUserId() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return parseInt(user.id || user.user_id || localStorage.getItem('user_id') || '3');
}

/**
 * Render tenancy information in dashboard
 */
function renderLeaseInfo(lease) {
  if (!lease) {
    // Show default state when no tenancy data
    const greeting = document.querySelector('[data-greeting]');
    if (greeting) {
      greeting.textContent = 'Welcome home';
    }

    // Update stat cards to show "No active lease" state
    const balanceValue = document.querySelector('[data-balance-value]');
    if (balanceValue) {
      balanceValue.textContent = '₱0.00';
    }

    const utilitiesValue = document.querySelector('[data-utilities-value]');
    const utilitiesDesc = document.querySelector('[data-utilities-breakdown]');
    if (utilitiesValue) {
      utilitiesValue.textContent = '₱0.00';
    }
    if (utilitiesDesc) {
      utilitiesDesc.textContent = 'No active tenancy';
    }

    const leasePeriodValue = document.querySelector('[data-tenancy-period]');
    const leasePeriodDesc = document.querySelector('[data-tenancy-renewal]');
    if (leasePeriodValue) {
      leasePeriodValue.textContent = 'No Tenancy';
    }
    if (leasePeriodDesc) {
      leasePeriodDesc.textContent = 'Apply for a room to start';
    }

    const nextPaymentValue = document.querySelector('[data-payment-days]');
    const nextPaymentDesc = document.querySelector('[data-payment-details]');
    if (nextPaymentValue) {
      nextPaymentValue.textContent = 'N/A';
    }
    if (nextPaymentDesc) {
      nextPaymentDesc.textContent = 'No upcoming payments';
    }

    return;
  }

  // Update greeting with property name
  const greeting = document.querySelector('[data-greeting]');
  if (greeting && lease.property_name && lease.room_number) {
    greeting.textContent = `Welcome home to ${lease.property_name}, Room ${lease.room_number}`;
  }

  // Update tenancy period stat
  const leasePeriodValue = document.querySelector('[data-tenancy-period]');
  const leasePeriodDesc = document.querySelector('[data-tenancy-renewal]');

  if (leasePeriodValue && lease.months_since_move_in !== undefined) {
    leasePeriodValue.textContent = `${lease.months_since_move_in} Month${
      lease.months_since_move_in !== 1 ? 's' : ''
    }`;
  }

  if (leasePeriodDesc && lease.tenancy_start_date) {
    const startDate = new Date(lease.tenancy_start_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    leasePeriodDesc.textContent = `Started: ${startDate}`;
  }

  // Update outstanding balance (monthly rent)
  const balanceValue = document.querySelector('[data-balance-value]');
  if (balanceValue && lease.monthly_rent !== undefined) {
    balanceValue.textContent = `₱${formatCurrency(lease.monthly_rent)}`;
  }

  // Update utilities
  const utilitiesValue = document.querySelector('[data-utilities-value]');
  const utilitiesDesc = document.querySelector('[data-utilities-breakdown]');

  const totalUtilities =
    (lease.property_electricity_cost || 0) +
    (lease.property_water_cost || 0) +
    (lease.property_internet_cost || 0);

  if (utilitiesValue) {
    utilitiesValue.textContent = `₱${formatCurrency(totalUtilities)}`;
  }

  if (utilitiesDesc) {
    const parts = [];
    if (lease.property_electricity_cost > 0)
      parts.push(`Electricity: ₱${formatCurrency(lease.property_electricity_cost)}`);
    if (lease.property_water_cost > 0)
      parts.push(`Water: ₱${formatCurrency(lease.property_water_cost)}`);
    if (lease.property_internet_cost > 0)
      parts.push(`Internet: ₱${formatCurrency(lease.property_internet_cost)}`);

    utilitiesDesc.textContent = parts.length > 0 ? parts.join(' | ') : 'No utility charges';
  }

  // Update next payment - calculate based on tenancy start date
  const nextPaymentValue = document.querySelector('[data-payment-days]');
  const nextPaymentDesc = document.querySelector('[data-payment-details]');

  if (nextPaymentValue && nextPaymentDesc && lease.tenancy_start_date && lease.monthly_rent) {
    const today = new Date();

    // Calculate next payment date (1st of next month)
    const nextPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const daysUntilPayment = Math.ceil((nextPaymentDate - today) / (1000 * 60 * 60 * 24));

    nextPaymentValue.textContent = `${daysUntilPayment} Days`;

    const paymentDateFormatted = nextPaymentDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    nextPaymentDesc.textContent = `₱${formatCurrency(
      lease.monthly_rent
    )} due ${paymentDateFormatted}`;
  }
}

/**
 * Render payment cards in dashboard
 */
function renderDashboardPayments(payments) {
  const paymentList = document.querySelector('.boarder-payment-simple-list');
  if (!paymentList) return;

  if (!payments || payments.length === 0) {
    paymentList.innerHTML = `
      <div class="boarder-empty-state" style="text-align: center; padding: 40px 20px; color: #6b7280;">
        <p style="margin: 0; font-size: 14px;">No payment history available</p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">Payments will appear here once you have an active lease</p>
      </div>
    `;
    announceToScreenReader('No payment history available.');
    return;
  }

  paymentList.innerHTML = payments
    .slice(0, 3)
    .map((payment, index) => {
      const isPaid = payment.status === 'paid';
      const isCurrent = index === 0 && !isPaid;

      const date = new Date(payment.payment_date || payment.due_date);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Only show "Current Month" for the first unpaid payment
      // For paid payments, show the actual month/year
      const period = isPaid
        ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Current Month';

      if (isCurrent) {
        const daysLeft = Math.ceil(
          (new Date(payment.due_date) - new Date()) / (1000 * 60 * 60 * 24)
        );

        // Determine status color based on days left
        let statusClass = 'status-green';
        let statusBadgeClass = 'unpaid';
        let daysLeftClass = 'highlight status-green';

        if (daysLeft < 0) {
          // Overdue
          statusClass = 'status-red';
          statusBadgeClass = 'overdue status-red';
          daysLeftClass = 'highlight status-red';
        } else if (daysLeft <= 3) {
          // Due very soon
          statusClass = 'status-red';
          statusBadgeClass = 'unpaid status-orange';
          daysLeftClass = 'highlight status-red';
        } else if (daysLeft <= 7) {
          // Due soon
          statusClass = 'status-orange';
          statusBadgeClass = 'unpaid status-orange';
          daysLeftClass = 'highlight status-orange';
        }

        // Check if this payment includes deposit
        const includesDeposit = payment.includes_deposit && payment.deposit > 0;
        const depositAmount = includesDeposit ? payment.deposit : 0;

        return `
        <div class="boarder-payment-simple-card current ${statusClass}">
          <div class="boarder-payment-simple-header">
            <span class="boarder-payment-period">${period}</span>
            <span class="boarder-payment-status-badge ${statusBadgeClass}">${
          daysLeft < 0 ? 'Overdue' : 'Unpaid'
        }</span>
          </div>
          <div class="boarder-payment-simple-body">
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Amount</span>
              <span class="boarder-payment-value">₱${formatCurrency(payment.amount)}</span>
            </div>
            ${
              includesDeposit
                ? `
            <div class="boarder-payment-row" style="font-size: 12px; color: #6b7280;">
              <span class="boarder-payment-label">Includes Deposit</span>
              <span class="boarder-payment-value">₱${formatCurrency(depositAmount)}</span>
            </div>
            `
                : ''
            }
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Due Date</span>
              <span class="boarder-payment-value">${formattedDate}</span>
            </div>
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Days ${daysLeft < 0 ? 'Overdue' : 'Left'}</span>
              <span class="boarder-payment-value ${daysLeftClass}">${Math.abs(daysLeft)} days</span>
            </div>
          </div>
          <a href="./payments/pay.html" class="boarder-btn boarder-btn-primary boarder-btn-full">Pay Now</a>
        </div>
      `;
      } else {
        return `
        <div class="boarder-payment-simple-card history">
          <div class="boarder-payment-simple-header">
            <span class="boarder-payment-period">${period}</span>
            <span class="boarder-payment-status-badge paid">Paid</span>
          </div>
          <div class="boarder-payment-simple-body">
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Amount</span>
              <span class="boarder-payment-value">₱${formatCurrency(payment.amount)}</span>
            </div>
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Paid On</span>
              <span class="boarder-payment-value">${formattedDate}</span>
            </div>
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Payment Method</span>
              <span class="boarder-payment-value">${payment.payment_method || 'N/A'}</span>
            </div>
          </div>
        </div>
      `;
      }
    })
    .join('');

  announceToScreenReader(`${payments.length} payments loaded.`);
}

/**
 * Format currency value
 */
function formatCurrency(value) {
  if (value === null || value === undefined) return '0.00';
  return parseFloat(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Announce content updates to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
function announceToScreenReader(message, priority = 'polite') {
  const liveRegion = document.getElementById('a11y-live-region') || createLiveRegion();
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.textContent = message;

  // Clear the message after a delay to prevent it from being announced again
  setTimeout(() => {
    liveRegion.textContent = '';
  }, 5000);
}

/**
 * Create a live region for screen reader announcements
 */
function createLiveRegion() {
  const liveRegion = document.createElement('div');
  liveRegion.id = 'a11y-live-region';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  document.body.appendChild(liveRegion);
  return liveRegion;
}

/**
 * Update dashboard UI with loaded data
 */
function updateDashboardUI() {
  // Update application count
  const activeApplications = dashboardState.applications.filter(
    app => app.status === 'accepted' || app.status === 'pending'
  ).length;

  // Update stats if elements exist
  const statValue = document.querySelector('.boarder-stat-card:first-child .boarder-stat-value');
  if (statValue && activeApplications > 0) {
    statValue.textContent = `${activeApplications} Active`;
    announceToScreenReader(`Dashboard updated. ${activeApplications} active applications.`);
  }
}

/**
 * Render announcements in dashboard preview
 */
function renderDashboardAnnouncements(announcements) {
  const announcementsList = document.querySelector('.boarder-announcements-list');
  if (!announcementsList) return;

  if (!announcements || announcements.length === 0) {
    announcementsList.innerHTML = `
      <div class="boarder-empty-state" style="text-align: center; padding: 40px 20px; color: #6b7280;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.5;" aria-hidden="true" focusable="false">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <p style="margin: 0; font-size: 14px; font-weight: 500;">No announcements at this time</p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">Check back later for updates from your landlord</p>
      </div>
    `;
    announceToScreenReader('No announcements available.');
    return;
  }

  announcementsList.innerHTML = announcements
    .map(announcement => {
      const date = new Date(announcement.publish_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Icon color based on category
      const iconColorMap = {
        urgent: 'orange',
        maintenance: 'blue',
        general: 'green',
        reminder: 'purple',
        event: 'blue',
      };
      const iconColor = iconColorMap[announcement.category] || 'blue';

      // Icon name based on category
      const iconNameMap = {
        urgent: 'exclamationTriangle',
        general: 'info',
        reminder: 'bell',
        event: 'calendar',
      };
      const iconName = iconNameMap[announcement.category] || 'info';

      return `
      <div class="boarder-announcement-item">
        <div class="boarder-announcement-icon ${iconColor}">
          ${getIcon(iconName, { strokeWidth: '2', 'aria-hidden': 'true' })}
        </div>
        <div class="boarder-announcement-content">
          <h4 class="boarder-announcement-title">${escapeHtml(announcement.title)}</h4>
          <p class="boarder-announcement-text">${escapeHtml(announcement.description)}</p>
          <span class="boarder-announcement-date">${date}</span>
        </div>
      </div>
    `;
    })
    .join('');

  announceToScreenReader(`${announcements.length} announcements loaded.`);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Initialize dynamic cards that change based on user's contract status
 */
function initializeDynamicCards() {
  updateDynamicCards();
}

/**
 * Update card to show Utilities Load status (post-contract)
 * High utility feature for Philippine boarders - prevents running out of electricity at 2 AM
 */
function updateUtilitiesCard(card) {
  const label = card.querySelector('.boarder-stat-label');
  const value = card.querySelector('.boarder-stat-value');
  const description = card.querySelector('.boarder-stat-description');
  const icon = card.querySelector('.boarder-stat-icon');

  if (label) {
    label.textContent = 'Utilities Load';
  }
  if (icon) {
    icon.className = 'boarder-stat-icon orange';
    icon.innerHTML = getIcon('lightning');
  }
  if (value) {
    value.textContent = '₱450';
  }
  if (description) {
    description.innerHTML = `
      <span class="status-dot status-dot-warning"></span>
      5 kWh remaining • ₱1.00/kWh
    `;
  }
}

/**
 * Update dynamic cards based on user's contract/application phase
 * Cards switch content automatically when user signs contract
 */
function updateDynamicCards() {
  const utilitiesCard = document.querySelector('[data-dynamic-card="utilities"]');
  const maintenanceCard = document.querySelector('[data-dynamic-card="maintenance"]');
  const leaseCard = document.querySelector('[data-dynamic-card="tenancy"]');

  const isPostContract =
    dashboardState.contractStatus === 'contract' ||
    dashboardState.contractStatus === 'active-lease';

  // Update utilities card (only shown post-contract)
  if (utilitiesCard) {
    if (isPostContract) {
      updateUtilitiesCard(utilitiesCard);
    } else {
      // Hide utilities card for applicants (not relevant yet)
      utilitiesCard.style.display = 'none';
    }
  }

  if (!maintenanceCard || !leaseCard) {
    return;
  }

  if (isPostContract) {
    // Switch to Maintenance Status and Lease Timeline
    updateMaintenanceCard(maintenanceCard);
    updateLeaseCard(leaseCard);
  } else {
    // Show Application Progress and Tenancy Start info
    updateApplicationProgressCard(maintenanceCard);
    updateLeaseTimelineCard(leaseCard);
  }
}

/**
 * Update card to show Maintenance Status (post-contract)
 */
function updateMaintenanceCard(card) {
  const label = card.querySelector('.boarder-stat-label');
  const value = card.querySelector('.boarder-stat-value');
  const description = card.querySelector('.boarder-stat-description');
  const icon = card.querySelector('.boarder-stat-icon');

  if (label) {
    label.textContent = 'Maintenance Status';
  }
  if (icon) {
    icon.innerHTML = getIcon('wrenchScrewdriver');
  }
  if (value) {
    value.textContent = 'No Issues';
  }
  if (description) {
    description.innerHTML = `
      <span class="status-dot status-dot-success"></span>
      All systems functional
    `;
  }
}

/**
 * Update card to show Lease Timeline (post-contract)
 */
function updateLeaseCard(card) {
  const label = card.querySelector('.boarder-stat-label');
  const value = card.querySelector('.boarder-stat-value');
  const description = card.querySelector('.boarder-stat-description');
  const icon = card.querySelector('.boarder-stat-icon');

  if (label) {
    label.textContent = 'Lease Timeline';
  }
  if (icon) {
    icon.innerHTML = getIcon('calendarDays');
  }
  if (value) {
    value.textContent = '11 months';
  }
  if (description) {
    description.innerHTML = `
      <span class="status-dot status-dot-info"></span>
      Ends: Jan 15, 2026
    `;
  }
}

/**
 * Update card to show Application Progress (pre-contract)
 */
function updateApplicationProgressCard(card) {
  const label = card.querySelector('.boarder-stat-label');
  const value = card.querySelector('.boarder-stat-value');
  const description = card.querySelector('.boarder-stat-description');
  const icon = card.querySelector('.boarder-stat-icon');

  if (label) {
    label.textContent = 'Application Progress';
  }
  if (icon) {
    icon.innerHTML = getIcon('shieldCheck');
  }
  if (value) {
    value.textContent = '2/4 Steps';
  }
  if (description) {
    description.innerHTML = `
      <span class="status-dot status-dot-success"></span>
      1 approved, 1 pending review
    `;
  }
}

/**
 * Update card to show Tenancy Start Timeline (pre-contract)
 */
function updateLeaseTimelineCard(card) {
  const label = card.querySelector('.boarder-stat-label');
  const value = card.querySelector('.boarder-stat-value');
  const description = card.querySelector('.boarder-stat-description');
  const icon = card.querySelector('.boarder-stat-icon');

  if (label) {
    label.textContent = 'Lease Timeline';
  }
  if (icon) {
    icon.innerHTML = getIcon('calendarDays');
  }
  if (value) {
    value.textContent = 'Starting Soon';
  }
  if (description) {
    description.innerHTML = `
      <span class="status-dot status-dot-info"></span>
      Expected: Feb 1, 2025
    `;
  }
}

/**
 * Set user's contract status and update cards
 * @param {string} status - 'application' | 'contract' | 'active-lease'
 */
function setContractStatus(status) {
  dashboardState.contractStatus = status;
  updateDynamicCards();
}

/**
 * Render important information based on lease status
 */
function renderImportantInformation(lease) {
  const infoCards = document.querySelector('.boarder-info-cards');
  if (!infoCards) return;

  if (!lease) {
    // Show empty state when no active lease
    infoCards.innerHTML = `
      <div class="boarder-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #6b7280;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.5;">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p style="margin: 0; font-size: 14px; font-weight: 500;">No property information available</p>
        <p style="margin: 8px 0 0 0; font-size: 13px;">House rules, utility costs, and landlord information will appear here once you have an active lease</p>
      </div>
    `;
    return;
  }

  // Render house rules
  const houseRules = lease.house_rules || [];
  const houseRulesHtml =
    houseRules.length > 0
      ? houseRules
          .slice(0, 3)
          .map(
            rule => `
        <div class="boarder-info-rule-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>${escapeHtml(rule)}</span>
        </div>
      `
          )
          .join('')
      : '<p style="color: #6b7280; font-size: 14px;">No house rules specified</p>';

  // Calculate utility costs
  const electricityCost = lease.property_electricity_cost || 0;
  const waterCost = lease.property_water_cost || 0;
  const internetCost = lease.property_internet_cost || 0;
  const totalUtilities = electricityCost + waterCost + internetCost;

  // Render utility costs
  const utilitiesHtml = `
    <div class="boarder-info-utility-row">
      <span class="boarder-info-utility-label">Electricity</span>
      <span class="boarder-info-utility-value">₱${formatCurrency(electricityCost)}/mo</span>
    </div>
    <div class="boarder-info-utility-row">
      <span class="boarder-info-utility-label">Water</span>
      <span class="boarder-info-utility-value">₱${formatCurrency(waterCost)}/mo</span>
    </div>
    <div class="boarder-info-utility-row">
      <span class="boarder-info-utility-label">Internet</span>
      <span class="boarder-info-utility-value">${
        internetCost > 0 ? '₱' + formatCurrency(internetCost) + '/mo' : 'Included'
      }</span>
    </div>
  `;

  // Render landlord verification
  const landlord = lease.landlord || {};
  const landlordName = landlord.name || 'Unknown';
  const isVerified = landlord.is_verified || false;
  const rating = landlord.rating || 0;
  const landlordInitials = landlordName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const landlordHtml = `
    <div class="boarder-info-landlord-profile">
      <div class="boarder-info-landlord-avatar">${landlordInitials}</div>
      <div class="boarder-info-landlord-details">
        <h4 class="boarder-info-landlord-name">${escapeHtml(landlordName)}</h4>
        <div class="boarder-info-landlord-status">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${
            isVerified ? '#22c55e' : '#6b7280'
          }" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span style="color: ${isVerified ? '#22c55e' : '#6b7280'};">${
    isVerified ? 'Identity Verified' : 'Not Verified'
  }</span>
        </div>
      </div>
    </div>
    <p class="boarder-info-landlord-description">
      This landlord has been ${
        isVerified ? 'verified and has' : 'not yet verified but has'
      } a ${rating.toFixed(1)}★ rating
    </p>
  `;

  // Update the info cards
  infoCards.innerHTML = `
    <!-- House Rules Card -->
    <div class="boarder-info-card">
      <div class="boarder-info-card-header">
        <h3 class="boarder-info-card-title">House Rules</h3>
        <span class="boarder-info-badge boarder-info-badge-warning">Required Reading</span>
      </div>
      <div class="boarder-info-card-body">
        ${houseRulesHtml}
        ${
          houseRules.length > 3
            ? `<a href="./house-rules/index.html" class="boarder-info-link">View complete rules →</a>`
            : ''
        }
      </div>
    </div>

    <!-- Utility Costs Card -->
    <div class="boarder-info-card">
      <div class="boarder-info-card-header">
        <h3 class="boarder-info-card-title">Utility Costs</h3>
        <span class="boarder-info-badge boarder-info-badge-info">Breakdown</span>
      </div>
      <div class="boarder-info-card-body">
        ${utilitiesHtml}
        <div class="boarder-info-utility-total">
          <span class="boarder-info-utility-label">Total</span>
          <span class="boarder-info-utility-value">₱${formatCurrency(totalUtilities)}/mo</span>
        </div>
      </div>
    </div>

    <!-- Landlord Verification Card -->
    <div class="boarder-info-card">
      <div class="boarder-info-card-header">
        <h3 class="boarder-info-card-title">Landlord Verification</h3>
        <span class="boarder-info-badge ${
          isVerified ? 'boarder-info-badge-success' : 'boarder-info-badge-default'
        }">
          ${isVerified ? 'Verified' : 'Unverified'}
        </span>
      </div>
      <div class="boarder-info-card-body">
        ${landlordHtml}
      </div>
    </div>
  `;

  announceToScreenReader('Property information loaded.');
}

// Add animation keyframes for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .boarder-notification-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .boarder-notification-content svg {
    width: 20px;
    height: 20px;
  }
`;
document.head.appendChild(style);

// Export functions for external use
export {
  dashboardState,
  loadDashboardData,
  showNotification,
  getUserLocation,
  handleSearch,
  initializeDynamicCards,
  updateDynamicCards,
  setContractStatus,
  renderImportantInformation,
  initializeKeyboardNavigation,
};
