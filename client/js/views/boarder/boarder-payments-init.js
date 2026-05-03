/**
 * Boarder Payments Page Initialization
 * Fetches and renders payment data from API endpoints
 */

import CONFIG from '../../config.js';
import { initSidebar } from '../../components/sidebar.js';
import { initNavbar } from '../../components/navbar.js';
import { showErrorToast } from '../../shared/toast.js';

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
    showErrorToast('Failed to load payment data. Please refresh the page.');
  }
}

/**
 * Fetch payment overview data
 */
async function fetchPaymentOverview() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/overview?t=${Date.now()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment overview');
    }

    const result = await response.json();
    paymentOverview = result.data;

    // Debug log to help trace payment status
    console.log('Payment Overview Loaded:', {
      current_bill_status: paymentOverview.current_bill?.status,
      current_bill_period: paymentOverview.current_bill?.period,
      days_until_due: paymentOverview.days_until_due,
      next_payment_date: paymentOverview.next_payment_date,
    });
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

  // Update time remaining - handle paid status
  const timeRemainingEl = document.querySelector(
    '.current-bill-date-item.warning .current-bill-date-value'
  );
  if (timeRemainingEl) {
    const svgIcon = timeRemainingEl.querySelector('svg');

    // If bill is paid, show "Paid" instead of days remaining
    if (bill.status === 'paid') {
      timeRemainingEl.innerHTML = `${
        svgIcon ? svgIcon.outerHTML : ''
      }<span style="color: var(--primary-green);">Paid</span>`;
      // Remove warning class if present
      const warningItem = timeRemainingEl.closest('.current-bill-date-item');
      if (warningItem) {
        warningItem.classList.remove('warning');
      }
    } else if (paymentOverview.days_until_due !== null) {
      const daysText = paymentOverview.days_until_due === 1 ? 'day' : 'days';
      timeRemainingEl.innerHTML = `${svgIcon ? svgIcon.outerHTML : ''}${
        paymentOverview.days_until_due
      } ${daysText}`;
    }
  }

  // Update pay button
  const payButton = document.querySelector('.payments-current-bill-card .payments-btn-primary');
  if (payButton) {
    const svgIcon = payButton.querySelector('svg');

    // If bill is paid, disable the button and change text
    if (bill.status === 'paid') {
      payButton.disabled = true;
      payButton.innerHTML = `${svgIcon ? svgIcon.outerHTML : ''}<span>Paid</span>`;
      payButton.style.opacity = '0.6';
      payButton.style.cursor = 'not-allowed';
    } else {
      payButton.disabled = false;
      payButton.innerHTML = `${svgIcon ? svgIcon.outerHTML : ''}Pay ${formatCurrency(
        bill.total
      )} Now`;
      payButton.style.opacity = '1';
      payButton.style.cursor = 'pointer';
    }
  }
}

/**
 * Render payment methods
 */
function renderPaymentMethods() {
  const methodsList = document.querySelector('.payment-methods-list');
  if (!methodsList) return;
  if (paymentMethods.length === 0) {
    methodsList.innerHTML =
      '<p class="pm-empty-state">No payment methods saved. Click <strong>Add New</strong> to get started.</p>';
    return;
  }

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
            ${
              !method.is_default
                ? `
            <button class="payment-method-action-btn" title="Set as Default" data-action="set-default" data-method-id="${method.id}">
              <img src="../../../assets/svg/bookmark.svg" alt="Set Default" style="width:18px;height:18px;opacity:.65" />
            </button>`
                : ''
            }
            <button class="payment-method-action-btn" title="Remove" data-action="remove" data-method-id="${
              method.id
            }">
              <img src="../../../assets/svg/close.svg" alt="Remove" style="width:18px;height:18px;opacity:.65" />
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
      const period = formatPeriod(payment.due_date);
      const propertyInfo = payment.property_name
        ? `${payment.property_name} - ${payment.room_title || 'Room ' + payment.room_number}`
        : 'Rent Payment';

      return `
      <div class="timeline-item" data-payment-id="${payment.id}">
        <div class="timeline-marker ${markerClass}">
          <img src="../../../assets/svg/${isPaid ? 'check' : 'history'}.svg" alt="${
        isPaid ? 'Paid' : 'Pending'
      }" class="timeline-marker-icon" />
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h4 class="timeline-title">${period} Rent</h4>
            <span class="timeline-amount">${formatCurrency(payment.amount)}</span>
          </div>
          <div class="timeline-details">
            <span class="timeline-detail">
              <img src="../../../assets/svg/calendar.svg" alt="Calendar" class="timeline-icon" />
              ${
                isPaid
                  ? 'Paid on ' + formatDate(payment.payment_date)
                  : 'Due ' + formatDate(payment.due_date)
              }
            </span>
            <span class="timeline-detail">
              <img src="../../../assets/svg/building.svg" alt="Property" class="timeline-icon" />
              ${escapeHtml(propertyInfo)}
            </span>
            ${
              payment.payment_method
                ? `
              <span class="timeline-detail">
                <img src="../../../assets/svg/creditCard.svg" alt="Credit Card" class="timeline-icon" />
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

  // Add Method button — opens modal
  const addMethodBtn = document.getElementById('addMethodBtn');
  if (addMethodBtn) {
    addMethodBtn.addEventListener('click', openAddMethodModal);
  }

  // Modal close buttons
  const closeModalBtn = document.getElementById('closeAddMethodModal');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeAddMethodModal);
  const cancelModalBtn = document.getElementById('cancelAddMethod');
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeAddMethodModal);

  // Close modal on backdrop click
  const modalOverlay = document.getElementById('addMethodModal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeAddMethodModal();
    });
  }

  // Modal form submit
  const addMethodForm = document.getElementById('addMethodForm');
  if (addMethodForm) {
    addMethodForm.addEventListener('submit', handleAddMethodSubmit);
  }

  // Payment method action delegation (remove + set-default)
  const methodsList = document.querySelector('.payment-methods-list');
  if (methodsList) {
    methodsList.addEventListener('click', async e => {
      const removeBtn = e.target.closest('[data-action="remove"]');
      const defaultBtn = e.target.closest('[data-action="set-default"]');
      if (removeBtn) {
        await handleRemoveMethod(removeBtn.dataset.methodId);
      } else if (defaultBtn) {
        await handleSetDefaultMethod(defaultBtn.dataset.methodId);
      }
    });
  }

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
  window.location.href = '../payments/pay.html';
}

/**
 * Handle download statement
 */
function handleDownloadStatement() {
  showToast('Statement download coming soon.', 'info');
}

/* ============================================================
 * Add Payment Method Modal
 * ============================================================ */

function openAddMethodModal() {
  const modal = document.getElementById('addMethodModal');
  if (!modal) return;
  const form = document.getElementById('addMethodForm');
  if (form) form.reset();
  const errEl = document.getElementById('pmFormError');
  if (errEl) {
    errEl.style.display = 'none';
    errEl.textContent = '';
  }
  const btn = document.getElementById('submitAddMethod');
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Save Method';
  }
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('pm-modal-open');
  document.body.style.overflow = 'hidden';
}

function closeAddMethodModal() {
  const modal = document.getElementById('addMethodModal');
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('pm-modal-open');
  document.body.style.overflow = '';
}

async function handleAddMethodSubmit(e) {
  e.preventDefault();
  const type = document.getElementById('pmType')?.value;
  const name = document.getElementById('pmName')?.value?.trim();
  const lastFour = document.getElementById('pmLastFour')?.value?.trim();
  const isDefault = document.getElementById('pmIsDefault')?.checked;
  const errEl = document.getElementById('pmFormError');
  const btn = document.getElementById('submitAddMethod');

  // Client-side validation
  if (!type) {
    if (errEl) {
      errEl.textContent = 'Please select a method type.';
      errEl.style.display = 'block';
    }
    return;
  }
  if (!name) {
    if (errEl) {
      errEl.textContent = 'Please enter a label or account name.';
      errEl.style.display = 'block';
    }
    return;
  }
  if (lastFour && !/^\d{1,4}$/.test(lastFour)) {
    if (errEl) {
      errEl.textContent = 'Last 4 digits must be numbers only.';
      errEl.style.display = 'block';
    }
    return;
  }

  if (errEl) {
    errEl.style.display = 'none';
    errEl.textContent = '';
  }
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving…';
  }

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/payments/methods`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ type, name, last_four: lastFour || '', is_default: isDefault }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to add payment method');

    closeAddMethodModal();
    await fetchPaymentMethods();
    renderPaymentMethods();
    showToast('Payment method added successfully', 'success');
  } catch (err) {
    if (errEl) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Save Method';
    }
  }
}

/**
 * Handle remove payment method
 */
async function handleRemoveMethod(methodId) {
  if (!confirm('Remove this payment method?')) return;

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/payments/methods/${methodId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to remove payment method');
    }
    await fetchPaymentMethods();
    renderPaymentMethods();
    showToast('Payment method removed', 'success');
  } catch (error) {
    console.error('Error removing payment method:', error);
    showToast('Failed to remove payment method', 'error');
  }
}

/**
 * Handle set default payment method
 */
async function handleSetDefaultMethod(methodId) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/payments/methods/${methodId}/default`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to set default method');
    }
    await fetchPaymentMethods();
    renderPaymentMethods();
    showToast('Default payment method updated', 'success');
  } catch (error) {
    console.error('Error setting default method:', error);
    showToast('Failed to update default payment method', 'error');
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

function showToast(message, type = 'info') {
  const bg = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#6366f1';
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;top:20px;right:20px;background:${bg};color:#fff;padding:12px 20px;border-radius:8px;z-index:99999;font-size:14px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.15);pointer-events:none;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBoarderPaymentsPage);
} else {
  initBoarderPaymentsPage();
}
