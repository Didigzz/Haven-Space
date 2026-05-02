/**
 * Boarder Payments Page Initialization
 * Fetches and renders payment data from API endpoints
 */

import CONFIG from '../../config.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';

// State
let paymentOverview = null;
let paymentHistory = [];
let paymentMethods = [];

/**
 * Initialize the payments page
 */
export async function initBoarderPaymentsPage() {
  try {
    // Initialize sidebar and navbar
    await initSidebar();
    await initNavbar();

    // Fetch all data
    await Promise.all([fetchPaymentOverview(), fetchPaymentHistory(), fetchPaymentMethods()]);

    // Render all sections
    renderFinancialOverview();
    renderCurrentBill();
    renderPaymentMethods();
    renderPaymentHistory();

    // Initialize event listeners
    initEventListeners();
  } catch (error) {
    console.error('Error initializing payments page:', error);
    showError('Failed to load payment data. Please refresh the page.');
  }
}

/**
 * Fetch payment overview data
 */
async function fetchPaymentOverview() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/overview`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment overview');
    }

    const result = await response.json();
    paymentOverview = result.data;
  } catch (error) {
    console.error('Error fetching payment overview:', error);
    throw error;
  }
}

/**
 * Fetch payment history
 */
async function fetchPaymentHistory() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/history?limit=50`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment history');
    }

    const result = await response.json();
    paymentHistory = result.data || [];
  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw error;
  }
}

/**
 * Fetch payment methods
 */
async function fetchPaymentMethods() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/methods`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment methods');
    }

    const result = await response.json();
    paymentMethods = result.data || [];
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    throw error;
  }
}

/**
 * Render financial overview cards
 */
function renderFinancialOverview() {
  if (!paymentOverview) return;

  // Total Paid Card
  const totalPaidValue = document.querySelector('.financial-card-gradient-1 .financial-card-value');
  const totalPaidTrend = document.querySelector('.financial-card-gradient-1 .financial-card-trend');
  if (totalPaidValue) {
    totalPaidValue.textContent = formatCurrency(paymentOverview.total_paid);
  }
  if (totalPaidTrend) {
    totalPaidTrend.textContent = `${paymentOverview.months_paid} month${
      paymentOverview.months_paid !== 1 ? 's' : ''
    }`;
  }

  // Next Payment Card
  const nextPaymentValue = document.querySelector(
    '.financial-card-gradient-2 .financial-card-value'
  );
  const nextPaymentTrend = document.querySelector(
    '.financial-card-gradient-2 .financial-card-trend'
  );
  const nextPaymentProgress = document.querySelector(
    '.financial-card-gradient-2 .financial-card-progress-fill'
  );
  const nextPaymentLabel = document.querySelector(
    '.financial-card-gradient-2 .financial-card-progress-label'
  );

  if (nextPaymentValue) {
    nextPaymentValue.textContent = formatCurrency(paymentOverview.next_payment_amount);
  }
  if (nextPaymentTrend) {
    const daysText = paymentOverview.days_until_due === 1 ? 'day' : 'days';
    nextPaymentTrend.textContent = `Due in ${paymentOverview.days_until_due} ${daysText}`;
  }
  if (nextPaymentProgress && nextPaymentLabel) {
    // Calculate progress through the month
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const progressPercent = Math.round((dayOfMonth / daysInMonth) * 100);

    nextPaymentProgress.style.width = `${progressPercent}%`;
    nextPaymentLabel.textContent = `${progressPercent}% of month completed`;
  }

  // Utility Balance Card
  const utilityValue = document.querySelector('.financial-card-gradient-3 .financial-card-value');
  const utilityTrend = document.querySelector('.financial-card-gradient-3 .financial-card-trend');
  const utilityAlert = document.querySelector('.financial-card-gradient-3 .financial-card-alert');

  if (utilityValue) {
    utilityValue.textContent = formatCurrency(paymentOverview.utility_balance);
  }
  if (utilityTrend) {
    const daysText = paymentOverview.utility_days_remaining === 1 ? 'day' : 'days';
    utilityTrend.textContent = `~${paymentOverview.utility_days_remaining} ${daysText} remaining`;
  }
  if (utilityAlert) {
    // Show/hide alert based on balance
    utilityAlert.style.display = paymentOverview.utility_balance < 200 ? 'flex' : 'none';
  }

  // Security Deposit Card
  const depositValue = document.querySelector('.financial-card-solid .financial-card-value');
  if (depositValue) {
    depositValue.textContent = formatCurrency(paymentOverview.security_deposit);
  }

  // Update utility balance in quick pay card
  const quickPayDesc = document.querySelector('.quick-pay-desc');
  if (quickPayDesc) {
    quickPayDesc.innerHTML = `Current balance: ${formatCurrency(
      paymentOverview.utility_balance
    )}<br />Recommended: ₱500 - ₱1,000`;
  }
}

/**
 * Render current bill section
 */
function renderCurrentBill() {
  if (!paymentOverview || !paymentOverview.current_bill) return;

  const bill = paymentOverview.current_bill;

  // Update period
  const periodEl = document.querySelector('.current-bill-period');
  if (periodEl) {
    periodEl.textContent = bill.period;
  }

  // Update status
  const statusEl = document.querySelector('.current-bill-status');
  if (statusEl) {
    statusEl.textContent = bill.status === 'paid' ? 'Paid' : 'Unpaid';
    statusEl.className = `current-bill-status ${bill.status}`;
  }

  // Update breakdown
  const baseRentEl = document.querySelector(
    '.current-bill-breakdown .current-bill-row:nth-child(1) .current-bill-value'
  );
  const utilitiesEl = document.querySelector(
    '.current-bill-breakdown .current-bill-row:nth-child(2) .current-bill-value'
  );
  const wifiEl = document.querySelector(
    '.current-bill-breakdown .current-bill-row:nth-child(3) .current-bill-value'
  );
  const totalEl = document.querySelector('.current-bill-total .current-bill-value');

  if (baseRentEl) baseRentEl.textContent = formatCurrency(bill.base_rent);
  if (utilitiesEl) utilitiesEl.textContent = formatCurrency(bill.utilities);
  if (wifiEl) wifiEl.textContent = formatCurrency(bill.wifi);
  if (totalEl) totalEl.textContent = formatCurrency(bill.total);

  // Update due date
  const dueDateEl = document.querySelector(
    '.current-bill-date-item:nth-child(1) .current-bill-date-value'
  );
  if (dueDateEl) {
    dueDateEl.textContent = formatDate(bill.due_date);
  }

  // Update time remaining
  const timeRemainingEl = document.querySelector(
    '.current-bill-date-item.warning .current-bill-date-value'
  );
  if (timeRemainingEl && paymentOverview.days_until_due !== null) {
    const daysText = paymentOverview.days_until_due === 1 ? 'day' : 'days';
    const svgIcon = timeRemainingEl.querySelector('svg');
    timeRemainingEl.innerHTML = `${svgIcon ? svgIcon.outerHTML : ''}${
      paymentOverview.days_until_due
    } ${daysText}`;
  }

  // Update pay button
  const payButton = document.querySelector('.payments-current-bill-card .payments-btn-primary');
  if (payButton) {
    const svgIcon = payButton.querySelector('svg');
    payButton.innerHTML = `${svgIcon ? svgIcon.outerHTML : ''}Pay ${formatCurrency(
      bill.total
    )} Now`;
  }
}

/**
 * Render payment methods
 */
function renderPaymentMethods() {
  const methodsList = document.querySelector('.payment-methods-list');
  if (!methodsList || paymentMethods.length === 0) return;

  methodsList.innerHTML = paymentMethods
    .map(method => {
      const iconClass =
        method.type === 'gcash' ? 'gcash' : method.type === 'bank' ? 'bank' : 'card';
      const isPrimary = method.is_default ? 'payment-method-primary' : '';

      return `
      <div class="payment-method-card ${isPrimary}" data-method-id="${method.id}">
        <div class="payment-method-header">
          <div class="payment-method-icon ${iconClass}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              ${getPaymentMethodIcon(method.type)}
            </svg>
          </div>
          ${method.is_default ? '<span class="payment-method-badge">Default</span>' : ''}
        </div>
        <div class="payment-method-body">
          <h4 class="payment-method-name">${escapeHtml(method.name)}</h4>
          <p class="payment-method-number">•••• •••• ${method.last_four}</p>
        </div>
        <div class="payment-method-actions">
          <button class="payment-method-action-btn" title="Edit" data-action="edit" data-method-id="${
            method.id
          }">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button class="payment-method-action-btn" title="Remove" data-action="remove" data-method-id="${
            method.id
          }">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    `;
    })
    .join('');

  // Update auto-pay details with default method
  const defaultMethod = paymentMethods.find(m => m.is_default);
  if (defaultMethod) {
    const autoPayMethodEl = document.querySelector('.auto-pay-row:nth-child(2) .auto-pay-value');
    if (autoPayMethodEl) {
      autoPayMethodEl.textContent = `${defaultMethod.name} •••• ${defaultMethod.last_four}`;
    }
  }

  // Update auto-pay amount
  if (paymentOverview && paymentOverview.next_payment_amount) {
    const autoPayAmountEl = document.querySelector('.auto-pay-row:nth-child(3) .auto-pay-value');
    if (autoPayAmountEl) {
      autoPayAmountEl.textContent = formatCurrency(paymentOverview.next_payment_amount);
    }
  }
}

/**
 * Render payment history timeline
 */
function renderPaymentHistory() {
  const timeline = document.querySelector('.payment-timeline');
  if (!timeline) return;

  if (paymentHistory.length === 0) {
    timeline.innerHTML = `
      <div class="timeline-empty">
        <p>No payment history available yet.</p>
      </div>
    `;
    return;
  }

  timeline.innerHTML = paymentHistory
    .map(payment => {
      const isPaid = payment.status === 'paid';
      const markerClass = isPaid
        ? 'completed'
        : payment.status === 'overdue'
        ? 'overdue'
        : 'pending';
      const markerIcon = isPaid
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />';

      const period = formatPeriod(payment.due_date);
      const propertyInfo = payment.property_name
        ? `${payment.property_name} - ${payment.room_title || 'Room ' + payment.room_number}`
        : 'Rent Payment';

      return `
      <div class="timeline-item" data-payment-id="${payment.id}">
        <div class="timeline-marker ${markerClass}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            ${markerIcon}
          </svg>
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h4 class="timeline-title">${period} Rent</h4>
            <span class="timeline-amount">${formatCurrency(payment.amount)}</span>
          </div>
          <div class="timeline-details">
            <span class="timeline-detail">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              ${
                isPaid
                  ? 'Paid on ' + formatDate(payment.payment_date)
                  : 'Due ' + formatDate(payment.due_date)
              }
            </span>
            <span class="timeline-detail">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              ${escapeHtml(propertyInfo)}
            </span>
            ${
              payment.payment_method
                ? `
              <span class="timeline-detail">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                ${escapeHtml(payment.payment_method)}
              </span>
            `
                : ''
            }
          </div>
          ${
            payment.reference_number
              ? `
            <div class="timeline-reference">
              Ref: ${escapeHtml(payment.reference_number)}
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;
    })
    .join('');
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
  // Auto-pay toggle
  const autoPayToggle = document.getElementById('autoPayToggle');
  const autoPayDetails = document.getElementById('autoPayDetails');
  if (autoPayToggle && autoPayDetails) {
    autoPayToggle.addEventListener('change', e => {
      autoPayDetails.style.display = e.target.checked ? 'block' : 'none';
    });
  }

  // Pay Now button
  const payNowBtn = document.getElementById('payNowBtn');
  if (payNowBtn) {
    payNowBtn.addEventListener('click', handlePayNow);
  }

  // Download Statement button
  const downloadBtn = document.getElementById('downloadStatementBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', handleDownloadStatement);
  }

  // Add Method button
  const addMethodBtn = document.getElementById('addMethodBtn');
  if (addMethodBtn) {
    addMethodBtn.addEventListener('click', handleAddMethod);
  }

  // Payment method actions
  document.addEventListener('click', e => {
    const actionBtn = e.target.closest('.payment-method-action-btn');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      const methodId = actionBtn.dataset.methodId;

      if (action === 'edit') {
        handleEditMethod(methodId);
      } else if (action === 'remove') {
        handleRemoveMethod(methodId);
      }
    }
  });

  // Current bill pay button
  const currentBillPayBtn = document.querySelector(
    '.payments-current-bill-card .payments-btn-primary'
  );
  if (currentBillPayBtn) {
    currentBillPayBtn.addEventListener('click', handlePayNow);
  }
}

/**
 * Handle pay now action
 */
function handlePayNow() {
  // TODO: Implement payment flow
  alert('Payment functionality will be implemented soon.');
}

/**
 * Handle download statement
 */
function handleDownloadStatement() {
  // TODO: Implement statement download
  alert('Statement download will be implemented soon.');
}

/**
 * Handle add payment method
 */
function handleAddMethod() {
  // TODO: Implement add payment method modal
  alert('Add payment method functionality will be implemented soon.');
}

/**
 * Handle edit payment method
 */
function handleEditMethod(methodId) {
  // TODO: Implement edit payment method modal
  alert(`Edit payment method ${methodId} will be implemented soon.`);
}

/**
 * Handle remove payment method
 */
async function handleRemoveMethod(methodId) {
  if (!confirm('Are you sure you want to remove this payment method?')) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/methods/${methodId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to remove payment method');
    }

    // Refresh payment methods
    await fetchPaymentMethods();
    renderPaymentMethods();

    showSuccess('Payment method removed successfully');
  } catch (error) {
    console.error('Error removing payment method:', error);
    showError('Failed to remove payment method');
  }
}

/**
 * Utility Functions
 */

function formatCurrency(amount) {
  return `₱${parseFloat(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatPeriod(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPaymentMethodIcon(type) {
  switch (type) {
    case 'gcash':
      return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />';
    case 'bank':
      return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />';
    case 'card':
    default:
      return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />';
  }
}

function showError(message) {
  // TODO: Implement proper toast notification
  console.error(message);
  alert(message);
}

function showSuccess(message) {
  // TODO: Implement proper toast notification
  console.log(message);
  alert(message);
}

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBoarderPaymentsPage);
} else {
  initBoarderPaymentsPage();
}
