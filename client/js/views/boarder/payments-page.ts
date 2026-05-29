/**
 * Boarder Payments Page - Main Controller
 * Handles fetching and rendering all payment data from API
 */

import CONFIG from '../../config.ts';
import { getIcon } from '../../shared/icons.ts';
import { getPaymentStatus } from './boarder-payments.ts';
import { initBoarderAccessControl, showProtectedEmptyState } from './access-control-init.ts';

/**
 * Get current user ID from localStorage
 */
function getCurrentUserId() {
  // Try to get user object first
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.id) return parseInt(user.id);
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
    }
  }

  // Fallback to user_id
  const userId = localStorage.getItem('user_id');
  return parseInt(userId || '0');
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
 * Format date to readable string
 */
function formatDate(dateString, format = 'long') {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);

  if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } else if (format === 'short') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return date.toLocaleDateString();
}

/**
 * Fetch payment overview data
 */
async function fetchPaymentOverview() {
  try {
    const userId = getCurrentUserId();
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': userId.toString(),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/overview`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment overview');
    }

    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error('Error fetching payment overview:', error);
    return null;
  }
}

/**
 * Fetch payment history
 */
async function fetchPaymentHistory() {
  try {
    const userId = getCurrentUserId();
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': userId.toString(),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/history`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment history');
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return [];
  }
}

/**
 * Fetch payment methods
 */
async function fetchPaymentMethods() {
  try {
    const userId = getCurrentUserId();
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': userId.toString(),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/methods`, {
      method: 'GET',
      headers: headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment methods');
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return [];
  }
}

/**
 * Render financial overview cards
 */
function renderFinancialOverview(data) {
  if (!data) {
    console.warn('No overview data to render');
    return;
  }

  // Update Total Paid card
  const totalPaidValue = document.querySelector('.financial-card-gradient-1 .financial-card-value');
  const totalPaidTrend = document.querySelector('.financial-card-gradient-1 .financial-card-trend');
  if (totalPaidValue) {
    totalPaidValue.textContent = `₱${formatCurrency(data.total_paid || 0)}`;
  }
  if (totalPaidTrend) {
    const months = data.months_paid || 0;
    totalPaidTrend.textContent = `${months} month${months !== 1 ? 's' : ''}`;
  }

  // Update Next Payment card
  const nextPaymentValue = document.querySelector(
    '.financial-card-gradient-2 .financial-card-value'
  );
  const nextPaymentTrend = document.querySelector(
    '.financial-card-gradient-2 .financial-card-trend'
  );
  const nextPaymentProgress = document.querySelector(
    '.financial-card-gradient-2 .financial-card-progress-fill'
  );
  const nextPaymentProgressLabel = document.querySelector(
    '.financial-card-gradient-2 .financial-card-progress-label'
  );

  if (nextPaymentValue) {
    nextPaymentValue.textContent = `₱${formatCurrency(data.next_payment_amount || 0)}`;
  }
  if (nextPaymentTrend && data.days_until_due !== null) {
    const daysText =
      data.days_until_due === 0
        ? 'Due today'
        : data.days_until_due < 0
        ? `${Math.abs(data.days_until_due)} days overdue`
        : `Due in ${data.days_until_due} day${data.days_until_due !== 1 ? 's' : ''}`;
    nextPaymentTrend.textContent = daysText;
  }

  // Update progress bar (calculate percentage of month completed)
  if (nextPaymentProgress && nextPaymentProgressLabel) {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const percentComplete = Math.round((dayOfMonth / daysInMonth) * 100);

    nextPaymentProgress.style.width = `${percentComplete}%`;
    nextPaymentProgressLabel.textContent = `${percentComplete}% of month completed`;
  }

  // Update Utility Balance card
  const utilityValue = document.querySelector('.financial-card-gradient-3 .financial-card-value');
  const utilityTrend = document.querySelector('.financial-card-gradient-3 .financial-card-trend');
  if (utilityValue) {
    utilityValue.textContent = `₱${formatCurrency(data.utility_balance || 0)}`;
  }
  if (utilityTrend) {
    const days = data.utility_days_remaining || 0;
    utilityTrend.textContent = `~${days} day${days !== 1 ? 's' : ''} remaining`;
  }

  // Update Security Deposit card
  const depositValue = document.querySelector('.financial-card-solid .financial-card-value');
  if (depositValue) {
    depositValue.textContent = `₱${formatCurrency(data.security_deposit || 0)}`;
  }

  // Update Quick Pay balance
  const quickPayBalance = document.querySelector('.quick-pay-balance');
  if (quickPayBalance) {
    quickPayBalance.textContent = `₱${formatCurrency(data.utility_balance || 0)}`;
  }
}

/**
 * Render current bill card
 */
function renderCurrentBill(data) {
  if (!data || !data.current_bill) {
    console.warn('No current bill data to render');
    return;
  }

  const bill = data.current_bill;
  const billCard = document.querySelector('.payments-current-bill-card');
  if (!billCard) return;

  // Update period
  const periodEl = billCard.querySelector('.current-bill-period');
  if (periodEl) {
    periodEl.textContent = bill.period || 'Current Month';
  }

  // Update status
  const statusEl = billCard.querySelector('.current-bill-status');
  if (statusEl) {
    const isPaid = bill.status === 'paid';
    statusEl.textContent = isPaid ? 'Paid' : 'Unpaid';
    statusEl.className = `current-bill-status ${isPaid ? 'paid' : 'unpaid'}`;
  }

  // Update breakdown
  const breakdown = billCard.querySelector('.current-bill-breakdown');
  if (breakdown) {
    const baseRent = bill.base_rent || 0;
    const utilities = bill.utilities || 0;
    const wifi = bill.wifi || 0;
    const lateFee = bill.late_fee || 0;
    const total = bill.total || baseRent + utilities + wifi + lateFee;

    breakdown.innerHTML = `
      <div class="current-bill-row">
        <span class="current-bill-label">Base Rent</span>
        <span class="current-bill-value">₱${formatCurrency(baseRent)}</span>
      </div>
      <div class="current-bill-row">
        <span class="current-bill-label">Utilities</span>
        <span class="current-bill-value">₱${formatCurrency(utilities)}</span>
      </div>
      <div class="current-bill-row">
        <span class="current-bill-label">WiFi</span>
        <span class="current-bill-value">₱${formatCurrency(wifi)}</span>
      </div>
      ${
        lateFee > 0
          ? `
        <div class="current-bill-row">
          <span class="current-bill-label">Late Fee</span>
          <span class="current-bill-value">₱${formatCurrency(lateFee)}</span>
        </div>
      `
          : ''
      }
      <div class="current-bill-divider"></div>
      <div class="current-bill-row current-bill-total">
        <span class="current-bill-label">Total Due</span>
        <span class="current-bill-value">₱${formatCurrency(total)}</span>
      </div>
    `;
  }

  // Update due date
  const dueDateEl = billCard.querySelector('.current-bill-date-value[data-due-date]');
  if (dueDateEl && bill.due_date) {
    dueDateEl.textContent = formatDate(bill.due_date);
    dueDateEl.setAttribute('data-due-date', bill.due_date);
  }

  // Update time remaining
  const timeRemainingEl = billCard.querySelector('.time-remaining-text');
  if (timeRemainingEl && data.days_until_due !== null) {
    if (data.days_until_due < 0) {
      timeRemainingEl.textContent = `${Math.abs(data.days_until_due)} days overdue`;
    } else if (data.days_until_due === 0) {
      timeRemainingEl.textContent = 'Due today';
    } else {
      timeRemainingEl.textContent = `${data.days_until_due} day${
        data.days_until_due !== 1 ? 's' : ''
      }`;
    }
  }

  // Update pay button
  const payButton = billCard.querySelector('.payments-btn-primary');
  if (payButton) {
    const iconHtml = getIcon('creditCard');
    const total = bill.total || 0;
    payButton.innerHTML = `${iconHtml} Pay ₱${formatCurrency(total)} Now`;
  }

  // Set data attributes for status coloring
  if (bill.due_date) {
    billCard.setAttribute('data-due-date', bill.due_date);
    billCard.setAttribute('data-paid-date', bill.status === 'paid' ? bill.due_date : '');
  }

  // Update auto-pay amount
  const autoPayAmountEl = document.getElementById('autoPayAmount');
  if (autoPayAmountEl) {
    const total = bill.total || 0;
    autoPayAmountEl.textContent = `₱${formatCurrency(total)}`;
  }
}

/**
 * Render payment history timeline
 */
function renderPaymentHistory(payments) {
  const timeline = document.querySelector('.payment-timeline');
  if (!timeline) {
    console.warn('Payment timeline element not found');
    return;
  }

  if (!payments || payments.length === 0) {
    timeline.innerHTML =
      '<p style="text-align: center; color: var(--text-gray); padding: 20px;">No payment history available</p>';
    return;
  }

  timeline.innerHTML = payments
    .map(payment => {
      const isPaid = payment.status === 'paid';
      const status = getPaymentStatus(payment.due_date, payment.payment_date);

      // Determine the title based on available data
      const monthYear = payment.due_date ? formatDate(payment.due_date, 'long') : 'Payment';
      const title = `${monthYear} Rent`;

      // Check if this payment includes deposit
      const includesDeposit = payment.includes_deposit && payment.deposit > 0;
      const depositAmount = includesDeposit ? payment.deposit : 0;

      // Add notes if this is a move-in payment
      const isFirstPayment =
        includesDeposit || (payment.notes && payment.notes.includes('deposit'));
      const notesHtml = includesDeposit
        ? `
          <div class="timeline-details-note">
            <span class="timeline-note">Includes security deposit: ₱${formatCurrency(
              depositAmount
            )}</span>
          </div>
        `
        : payment.notes
        ? `
          <div class="timeline-details-note">
            <span class="timeline-note">${payment.notes}</span>
          </div>
        `
        : '';

      return `
      <div class="timeline-item" data-due-date="${payment.due_date || ''}" data-paid-date="${
        payment.payment_date || ''
      }">
        <div class="timeline-marker ${isPaid ? 'completed' : status.status}">
          ${getIcon(isPaid ? 'check' : 'history')}
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h4 class="timeline-title">${title}${isFirstPayment ? ' (Move-in)' : ''}</h4>
            <span class="timeline-amount">₱${formatCurrency(payment.amount)}</span>
          </div>
          <div class="timeline-details">
            <span class="timeline-detail">
              <img src="../../../assets/svg/calendar.svg" alt="Calendar" class="timeline-icon" />
              ${
                isPaid
                  ? `Paid on ${formatDate(payment.payment_date, 'short')}`
                  : `Due ${formatDate(payment.due_date, 'short')}`
              }
            </span>
            ${
              payment.payment_method
                ? `
              <span class="timeline-detail">
                <img src="../../../assets/svg/creditCard.svg" alt="Credit Card" class="timeline-icon" />
                ${payment.payment_method}
              </span>
            `
                : ''
            }
            <span class="timeline-status ${isPaid ? 'paid' : status.cssClass}">
              <img src="../../../assets/svg/${isPaid ? 'check' : 'history'}.svg" alt="${
        isPaid ? 'Paid' : 'Pending'
      }" class="timeline-icon" />
              ${isPaid ? 'Paid' : status.label}
            </span>
          </div>
          ${notesHtml}
          <div class="timeline-actions">
            <button class="timeline-action-btn" onclick="alert('Receipt download coming soon!')">
              ${getIcon('arrowDownTray')}
              Receipt
            </button>
            <button class="timeline-action-btn" onclick="window.print()">
              ${getIcon('document')}
              Print
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join('');
}

/**
 * Render payment methods
 */
function renderPaymentMethods(methods) {
  const methodsList = document.querySelector('.payment-methods-list');
  if (!methodsList) {
    console.warn('Payment methods list element not found');
    return;
  }

  if (!methods || methods.length === 0) {
    methodsList.innerHTML =
      '<p class="pm-empty-state">No payment methods saved. Click <strong>Add New</strong> to get started.</p>';
    return;
  }

  methodsList.innerHTML = methods
    .map(method => {
      const iconClass =
        method.type === 'gcash' ? 'gcash' : method.type === 'bank' ? 'bank' : 'card';
      const iconSrc =
        method.type === 'gcash'
          ? '../../../assets/svg/payment.svg'
          : method.type === 'bank'
          ? '../../../assets/svg/server.svg'
          : '../../../assets/svg/creditCard.svg';
      const iconAlt = method.type === 'gcash' ? 'GCash' : method.type === 'bank' ? 'Bank' : 'Card';

      const lastFourDisplay = method.last_four
        ? `\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ${method.last_four}`
        : 'No number saved';

      return `
      <div class="payment-method-card ${
        method.is_default ? 'payment-method-primary' : ''
      }" data-method-id="${method.id}">
        <div class="payment-method-header">
          <div class="payment-method-icon ${iconClass}">
            <img src="${iconSrc}" alt="${iconAlt}" />
          </div>
          ${method.is_default ? '<span class="payment-method-badge">Default</span>' : ''}
        </div>
        <div class="payment-method-body">
          <h4 class="payment-method-name">${method.name || 'Payment Method'}</h4>
          <p class="payment-method-number">${lastFourDisplay}</p>
        </div>
        <div class="payment-method-actions">
          ${
            !method.is_default
              ? `
          <button class="payment-method-action-btn pm-btn-set-default" data-method-id="${method.id}" title="Set as Default">
            <img src="../../../assets/svg/bookmark.svg" alt="Set Default" />
          </button>`
              : ''
          }
          <button class="payment-method-action-btn pm-btn-delete" data-method-id="${
            method.id
          }" title="Remove">
            <img src="../../../assets/svg/close.svg" alt="Remove" />
          </button>
        </div>
      </div>
    `;
    })
    .join('');

  // Update auto-pay default method
  const defaultMethod = methods.find(m => m.is_default);
  if (defaultMethod) {
    const autoPayMethodEl = document.getElementById('autoPayMethod');
    if (autoPayMethodEl) {
      autoPayMethodEl.textContent = defaultMethod.last_four
        ? `${defaultMethod.name} \u2022\u2022\u2022\u2022 ${defaultMethod.last_four}`
        : defaultMethod.name;
    }
  }
}

/* ====================================================
 * Payment Methods CRUD helpers
 * ==================================================== */

/**
 * Build auth headers for API requests
 */
function buildAuthHeaders() {
  const token = localStorage.getItem('token');
  const userId = getCurrentUserId();
  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': userId.toString(),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Refresh payment methods from API and re-render
 */
async function refreshPaymentMethods() {
  const methods = await fetchPaymentMethods();
  renderPaymentMethods(methods);
}

/**
 * Delete a payment method
 */
async function deletePaymentMethod(id) {
  if (!confirm('Remove this payment method?')) return;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/payments/methods/${id}`, {
      method: 'DELETE',
      headers: buildAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to remove payment method');
    }
    await refreshPaymentMethods();
    showToast('Payment method removed', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

/**
 * Set a payment method as default
 */
async function setDefaultPaymentMethod(id) {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/payments/methods/${id}/default`, {
      method: 'PATCH',
      headers: buildAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to set default method');
    }
    await refreshPaymentMethods();
    showToast('Default payment method updated', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

/**
 * Show a brief toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bg = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#6366f1';
  toast.style.cssText = `position:fixed;top:20px;right:20px;background:${bg};color:#fff;padding:12px 20px;border-radius:8px;z-index:99999;font-size:14px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.15);`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

/* ====================================================
 * Add Payment Method Modal
 * ==================================================== */

function openAddMethodModal() {
  const modal = document.getElementById('addMethodModal');
  if (!modal) return;
  // Reset form
  const form = document.getElementById('addMethodForm');
  if (form) form.reset();
  const err = document.getElementById('pmFormError');
  if (err) {
    err.style.display = 'none';
    err.textContent = '';
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

  // Validate
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
      errEl.textContent = 'Last 4 digits must be numeric.';
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
    btn.textContent = 'Saving...';
  }

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/payments/methods`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ type, name, last_four: lastFour || '', is_default: isDefault }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to add payment method');
    closeAddMethodModal();
    await refreshPaymentMethods();
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
 * Initialize payments page
 */
export async function initPaymentsPage() {
  try {
    // Check access control first
    const accessResult = await initBoarderAccessControl();

    if (!accessResult.hasAccess) {
      // Show empty state for all sections
      const financialCards = document.querySelector('.financial-overview-grid');
      const currentBillCard = document.querySelector('.payments-current-bill-card');
      const paymentTimeline = document.querySelector('.payment-timeline');
      const paymentMethodsList = document.querySelector('.payment-methods-list');

      if (financialCards) {
        showProtectedEmptyState(financialCards, 'payments');
      }
      if (currentBillCard) {
        currentBillCard.style.display = 'none';
      }
      if (paymentTimeline) {
        showProtectedEmptyState(paymentTimeline, 'payments');
      }
      if (paymentMethodsList) {
        showProtectedEmptyState(paymentMethodsList, 'payments');
      }

      return; // Stop here, don't load data
    }

    // Show loading state
    console.warn('Loading payment data from API...');

    // Add loading indicators to main sections
    const financialCards = document.querySelector('.financial-overview-grid');
    const currentBillCard = document.querySelector('.payments-current-bill-card');
    const paymentTimeline = document.querySelector('.payment-timeline');
    const paymentMethodsList = document.querySelector('.payment-methods-list');

    if (financialCards) {
      financialCards.style.opacity = '0.5';
    }
    if (currentBillCard) {
      currentBillCard.style.opacity = '0.5';
    }
    if (paymentTimeline) {
      paymentTimeline.innerHTML =
        '<p style="text-align: center; padding: 20px;">Loading payment history...</p>';
    }
    if (paymentMethodsList) {
      paymentMethodsList.innerHTML =
        '<p style="text-align: center; padding: 20px;">Loading payment methods...</p>';
    }

    // Fetch all data in parallel
    const [overview, history, methods] = await Promise.all([
      fetchPaymentOverview(),
      fetchPaymentHistory(),
      fetchPaymentMethods(),
    ]);

    console.warn('Fetched data:', { overview, history, methods });

    // Render all sections
    if (overview) {
      renderFinancialOverview(overview);
      renderCurrentBill(overview);
    } else {
      console.error('Failed to load payment overview');
    }

    if (history) {
      renderPaymentHistory(history);
    } else {
      console.error('Failed to load payment history');
    }

    if (methods) {
      renderPaymentMethods(methods);
    } else {
      console.error('Failed to load payment methods');
    }

    // Remove loading state
    if (financialCards) {
      financialCards.style.opacity = '1';
    }
    if (currentBillCard) {
      currentBillCard.style.opacity = '1';
    }

    // ---- Payment method modal & action wiring ----

    // "Add New" button opens modal
    const addMethodBtn = document.getElementById('addMethodBtn');
    if (addMethodBtn) {
      addMethodBtn.addEventListener('click', openAddMethodModal);
    }

    // Close modal buttons
    const closeBtn = document.getElementById('closeAddMethodModal');
    if (closeBtn) closeBtn.addEventListener('click', closeAddMethodModal);
    const cancelBtn = document.getElementById('cancelAddMethod');
    if (cancelBtn) cancelBtn.addEventListener('click', closeAddMethodModal);

    // Close on overlay backdrop click
    const modalOverlay = document.getElementById('addMethodModal');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay) closeAddMethodModal();
      });
    }

    // Form submit
    const addMethodForm = document.getElementById('addMethodForm');
    if (addMethodForm) {
      addMethodForm.addEventListener('submit', handleAddMethodSubmit);
    }

    // Event delegation for delete and set-default buttons
    const methodsList = document.querySelector('.payment-methods-list');
    if (methodsList) {
      methodsList.addEventListener('click', async e => {
        const deleteBtn = e.target.closest('.pm-btn-delete');
        const defaultBtn = e.target.closest('.pm-btn-set-default');
        if (deleteBtn) {
          const id = deleteBtn.dataset.methodId;
          if (id) await deletePaymentMethod(id);
        } else if (defaultBtn) {
          const id = defaultBtn.dataset.methodId;
          if (id) await setDefaultPaymentMethod(id);
        }
      });
    }

    console.warn('Payment data loaded and rendered successfully');
  } catch (error) {
    console.error('Error initializing payments page:', error);

    // Show error message to user
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText =
      'position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; z-index: 9999;';
    errorMessage.textContent = 'Failed to load payment data. Please refresh the page.';
    document.body.appendChild(errorMessage);

    setTimeout(() => {
      errorMessage.remove();
    }, 5000);
  }
}
