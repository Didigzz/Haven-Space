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
    populatePaymentHistoryFilter();
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
function renderPaymentHistory(filteredPayments = null) {
  const timeline = document.querySelector('.payment-timeline');
  if (!timeline) return;

  const paymentsToRender = filteredPayments || paymentHistory;

  if (paymentsToRender.length === 0) {
    timeline.innerHTML = `
      <div class="timeline-empty">
        <p>No payment history available yet.</p>
      </div>
    `;
    return;
  }

  timeline.innerHTML = paymentsToRender
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
 * Populate payment history filter dropdown with available years
 */
function populatePaymentHistoryFilter() {
  const filterSelect = document.querySelector('.payments-filter-select');
  if (!filterSelect) return;

  // Extract unique years from payment history
  const years = new Set();
  paymentHistory.forEach(payment => {
    const date = new Date(payment.due_date || payment.payment_date);
    if (!isNaN(date.getTime())) {
      years.add(date.getFullYear());
    }
  });

  // Sort years in descending order
  const sortedYears = Array.from(years).sort((a, b) => b - a);

  // Build dropdown options
  let options = `
    <option value="all">All Time</option>
    <option value="6months">Last 6 Months</option>
  `;

  sortedYears.forEach(year => {
    options += `<option value="${year}">${year}</option>`;
  });

  filterSelect.innerHTML = options;
}

/**
 * Filter payment history based on selected time range
 */
function filterPaymentHistory(filterValue) {
  if (filterValue === 'all') {
    renderPaymentHistory(paymentHistory);
    return;
  }

  const now = new Date();
  let filteredPayments = [];

  if (filterValue === '6months') {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    filteredPayments = paymentHistory.filter(payment => {
      const paymentDate = new Date(payment.due_date || payment.payment_date);
      return paymentDate >= sixMonthsAgo;
    });
  } else {
    // Filter by specific year
    const year = parseInt(filterValue);
    filteredPayments = paymentHistory.filter(payment => {
      const paymentDate = new Date(payment.due_date || payment.payment_date);
      return paymentDate.getFullYear() === year;
    });
  }

  renderPaymentHistory(filteredPayments);
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

  // Payment history filter dropdown
  const paymentFilterSelect = document.querySelector('.payments-filter-select');
  if (paymentFilterSelect) {
    paymentFilterSelect.addEventListener('change', e => {
      filterPaymentHistory(e.target.value);
    });
  }
}

/**
 * Handle pay now action
 */
function handlePayNow() {
  window.location.href = '../payments/pay.html';
}

/**
 * Handle download statement - Show modal with options
 */
async function handleDownloadStatement() {
  showBoarderExportModal();
}

/**
 * Show boarder export modal
 */
function showBoarderExportModal() {
  const modal = createBoarderExportModal();
  document.body.appendChild(modal);
  initBoarderExportModalListeners(modal);
}

/**
 * Create boarder export modal HTML
 */
function createBoarderExportModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.id = 'boarderExportModal';
  modal.innerHTML = `
    <div class="modal-content export-modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Download Payment Statement</h3>
        <button class="modal-close" id="closeBoarderExportModal">&times;</button>
      </div>
      <div class="modal-body export-modal-body">
        <!-- Time Range Selection -->
        <div class="export-section">
          <h4 class="export-section-title">Time Range</h4>
          <div class="export-radio-group">
            <label class="export-radio-label">
              <input type="radio" name="timeRange" value="all" checked />
              <span>All Time</span>
            </label>
            <label class="export-radio-label">
              <input type="radio" name="timeRange" value="monthly" />
              <span>This Month</span>
            </label>
            <label class="export-radio-label">
              <input type="radio" name="timeRange" value="last3months" />
              <span>Last 3 Months</span>
            </label>
            <label class="export-radio-label">
              <input type="radio" name="timeRange" value="last6months" />
              <span>Last 6 Months</span>
            </label>
            <label class="export-radio-label">
              <input type="radio" name="timeRange" value="ytd" />
              <span>Year-to-Date</span>
            </label>
            <label class="export-radio-label">
              <input type="radio" name="timeRange" value="custom" />
              <span>Custom Range</span>
            </label>
          </div>

          <!-- Custom Date Range (hidden by default) -->
          <div class="export-custom-dates" id="boarderCustomDateRange" style="display: none;">
            <div class="export-date-group">
              <label for="boarderStartDate">Start Date</label>
              <input type="date" id="boarderStartDate" class="export-input" />
            </div>
            <div class="export-date-group">
              <label for="boarderEndDate">End Date</label>
              <input type="date" id="boarderEndDate" class="export-input" />
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="export-section">
          <h4 class="export-section-title">Filters</h4>
          <div class="export-filter-group">
            <label for="boarderStatusFilter">Payment Status</label>
            <select id="boarderStatusFilter" class="export-select">
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <!-- Output Format Selection -->
        <div class="export-section">
          <h4 class="export-section-title">Output Format</h4>
          <div class="export-radio-group">
            <label class="export-radio-label">
              <input type="radio" name="outputFormat" value="pdf" checked />
              <span>PDF (Professional Report)</span>
            </label>
            <label class="export-radio-label">
              <input type="radio" name="outputFormat" value="csv" />
              <span>CSV (Spreadsheet)</span>
            </label>
            <label class="export-radio-label">
              <input type="radio" name="outputFormat" value="preview" />
              <span>Preview in Browser</span>
            </label>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="export-actions">
          <button class="landlord-btn landlord-btn-primary export-download-btn" id="generateBoarderExport">
            <img src="../../../assets/svg/arrowDownTray.svg" alt="" width="20" height="20" class="icon-no-bg" />
            Download Statement
          </button>
          <button class="landlord-btn landlord-btn-outline export-cancel-btn" id="cancelBoarderExport">Cancel</button>
        </div>
      </div>
    </div>
  `;
  return modal;
}

/**
 * Initialize boarder export modal event listeners
 */
function initBoarderExportModalListeners(modal) {
  // Close modal
  const closeBtn = modal.querySelector('#closeBoarderExportModal');
  const cancelBtn = modal.querySelector('#cancelBoarderExport');

  closeBtn?.addEventListener('click', () => closeBoarderExportModal(modal));
  cancelBtn?.addEventListener('click', () => closeBoarderExportModal(modal));

  modal.addEventListener('click', e => {
    if (e.target === modal) {
      closeBoarderExportModal(modal);
    }
  });

  // Toggle custom date range
  const timeRangeInputs = modal.querySelectorAll('input[name="timeRange"]');
  const customDateRange = modal.querySelector('#boarderCustomDateRange');

  timeRangeInputs.forEach(input => {
    input.addEventListener('change', e => {
      if (e.target.value === 'custom') {
        customDateRange.style.display = 'grid';
      } else {
        customDateRange.style.display = 'none';
      }
    });
  });

  // Generate export
  const generateBtn = modal.querySelector('#generateBoarderExport');
  generateBtn?.addEventListener('click', () => handleBoarderExportGeneration(modal));
}

/**
 * Close boarder export modal
 */
function closeBoarderExportModal(modal) {
  modal.classList.remove('active');
  setTimeout(() => modal.remove(), 300);
}

/**
 * Handle boarder export generation
 */
async function handleBoarderExportGeneration(modal) {
  const generateBtn = modal.querySelector('#generateBoarderExport');
  const originalText = generateBtn.innerHTML;

  try {
    // Disable button and show loading
    generateBtn.disabled = true;
    generateBtn.innerHTML = 'Generating...';

    // Collect export parameters
    const params = collectBoarderExportParameters(modal);

    // Validate custom date range
    if (params.timeRange === 'custom') {
      if (!params.startDate || !params.endDate) {
        showToast('Please select both start and end dates for custom range', 'error');
        return;
      }
      if (new Date(params.startDate) > new Date(params.endDate)) {
        showToast('Start date must be before end date', 'error');
        return;
      }
    }

    // Fetch payment data
    const data = await fetchBoarderPaymentData(params);

    if (!data || data.length === 0) {
      showToast('No payment data found for the selected criteria', 'info');
      return;
    }

    // Get user info
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = user.name || 'Boarder';

    // Generate export based on format
    switch (params.outputFormat) {
      case 'pdf':
        await generateBoarderStatementPDF(data, userName, params);
        showToast('PDF statement downloaded successfully!', 'success');
        break;
      case 'csv':
        generateBoarderStatementCSV(data, userName, params);
        showToast('CSV statement downloaded successfully!', 'success');
        break;
      case 'preview':
        showToast('Preview functionality coming soon!', 'info');
        break;
    }

    closeBoarderExportModal(modal);
  } catch (error) {
    console.error('Export generation failed:', error);
    showToast('Failed to generate statement. Please try again.', 'error');
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = originalText;
  }
}

/**
 * Collect boarder export parameters from modal
 */
function collectBoarderExportParameters(modal) {
  const timeRange = modal.querySelector('input[name="timeRange"]:checked')?.value || 'all';
  const outputFormat = modal.querySelector('input[name="outputFormat"]:checked')?.value || 'pdf';

  const params = {
    timeRange,
    outputFormat,
    status: modal.querySelector('#boarderStatusFilter')?.value || 'all',
  };

  // Add custom date range if selected
  if (timeRange === 'custom') {
    params.startDate = modal.querySelector('#boarderStartDate')?.value;
    params.endDate = modal.querySelector('#boarderEndDate')?.value;
  }

  return params;
}

/**
 * Fetch boarder payment data with filters
 */
async function fetchBoarderPaymentData(params) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/history`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch payment data');
  }

  const result = await response.json();
  let payments = result.data || [];

  // Apply filters
  payments = filterBoarderPayments(payments, params);

  return payments;
}

/**
 * Filter boarder payments based on parameters
 */
function filterBoarderPayments(payments, params) {
  let filtered = [...payments];

  // Filter by time range
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let monthStart, threeMonthsAgo, sixMonthsAgo, yearStart, start, end;

  switch (params.timeRange) {
    case 'monthly':
      monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      filtered = filtered.filter(p => new Date(p.due_date) >= monthStart);
      break;

    case 'last3months':
      threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      filtered = filtered.filter(p => new Date(p.due_date) >= threeMonthsAgo);
      break;

    case 'last6months':
      sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      filtered = filtered.filter(p => new Date(p.due_date) >= sixMonthsAgo);
      break;

    case 'ytd':
      yearStart = new Date(today.getFullYear(), 0, 1);
      filtered = filtered.filter(p => new Date(p.due_date) >= yearStart);
      break;

    case 'custom':
      if (params.startDate && params.endDate) {
        start = new Date(params.startDate);
        end = new Date(params.endDate);
        filtered = filtered.filter(p => {
          const date = new Date(p.due_date);
          return date >= start && date <= end;
        });
      }
      break;

    case 'all':
    default:
      // No time filter
      break;
  }

  // Filter by status
  if (params.status !== 'all') {
    filtered = filtered.filter(p => p.status === params.status);
  }

  return filtered;
}

/**
 * Format time range for display
 */
function formatBoarderTimeRange(params) {
  if (params.timeRange === 'custom') {
    return `${params.startDate} to ${params.endDate}`;
  }

  const ranges = {
    all: 'All Time',
    monthly: 'This Month',
    last3months: 'Last 3 Months',
    last6months: 'Last 6 Months',
    ytd: 'Year-to-Date',
  };
  return ranges[params.timeRange] || params.timeRange;
}

/**
 * Generate PDF statement for boarder
 */
async function generateBoarderStatementPDF(payments, userName, params = {}) {
  // Wait for jsPDF to be available (it loads via CDN script tag)
  if (typeof window.jspdf === 'undefined') {
    await new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (typeof window.jspdf !== 'undefined') {
          clearInterval(interval);
          resolve();
        } else if (attempts > 20) {
          clearInterval(interval);
          reject(new Error('jsPDF library failed to load'));
        }
      }, 100);
    }).catch(() => {
      showBoarderToast('PDF library not available. Please refresh and try again.', 'error');
      throw new Error('jsPDF not available');
    });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Add header with branding
  doc.setFillColor(76, 175, 80); // Green header
  doc.rect(0, 0, 210, 35, 'F');

  // Add logo/title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('Haven Space', 14, 15);

  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.text('Payment Statement', 14, 25);

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Add boarder info
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Boarder: ${userName}`, 14, 45);
  if (params.timeRange) {
    doc.text(`Time Range: ${formatBoarderTimeRange(params)}`, 14, 51);
  }
  doc.text(
    `Generated: ${new Date().toLocaleString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    14,
    params.timeRange ? 57 : 51
  );

  let yPos = params.timeRange ? 67 : 61;

  // Calculate summary
  const summary = {
    totalPayments: payments.length,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
  };

  payments.forEach(payment => {
    const amount = parseFloat(payment.amount || 0) + parseFloat(payment.late_fee || 0);
    summary.totalAmount += amount;

    if (payment.status === 'paid') {
      summary.paidAmount += amount;
    } else if (payment.status === 'overdue') {
      summary.overdueAmount += amount;
    } else {
      summary.pendingAmount += amount;
    }
  });

  // Add summary box
  doc.setFillColor(245, 245, 245);
  doc.rect(14, yPos, 182, 35, 'F');

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Summary', 18, yPos + 8);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Total Payments: ${summary.totalPayments}`, 18, yPos + 16);
  doc.text(
    `Total Amount: ₱${summary.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    18,
    yPos + 22
  );

  doc.setTextColor(76, 175, 80); // Green
  doc.text(
    `Paid: ₱${summary.paidAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    18,
    yPos + 28
  );

  doc.setTextColor(255, 152, 0); // Orange
  doc.text(
    `Pending: ₱${summary.pendingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    90,
    yPos + 28
  );

  doc.setTextColor(244, 67, 54); // Red
  doc.text(
    `Overdue: ₱${summary.overdueAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    140,
    yPos + 28
  );

  doc.setTextColor(0, 0, 0); // Reset

  yPos += 45;

  // Add payment details table
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Payment History', 14, yPos);

  yPos += 8;

  // Table header
  doc.setFillColor(76, 175, 80);
  doc.rect(14, yPos - 5, 182, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Property', 16, yPos);
  doc.text('Room', 70, yPos);
  doc.text('Amount', 100, yPos);
  doc.text('Due Date', 130, yPos);
  doc.text('Status', 165, yPos);

  yPos += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');

  // Table rows
  payments.forEach((payment, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;

      // Repeat header
      doc.setFillColor(76, 175, 80);
      doc.rect(14, yPos - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text('Property', 16, yPos);
      doc.text('Room', 70, yPos);
      doc.text('Amount', 100, yPos);
      doc.text('Due Date', 130, yPos);
      doc.text('Status', 165, yPos);
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
    }

    // Alternate row colors
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(14, yPos - 5, 182, 7, 'F');
    }

    const property = payment.property_title || 'N/A';
    const room = payment.room_title || 'N/A';
    const amount = parseFloat(payment.amount || 0) + parseFloat(payment.late_fee || 0);
    const dueDate = new Date(payment.due_date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const status = payment.status
      ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1)
      : 'N/A';

    doc.text(property.substring(0, 22), 16, yPos);
    doc.text(room.substring(0, 12), 70, yPos);
    doc.text(`₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 100, yPos);
    doc.text(dueDate, 130, yPos);

    // Status with color
    if (payment.status === 'paid') {
      doc.setTextColor(76, 175, 80);
    } else if (payment.status === 'overdue') {
      doc.setTextColor(244, 67, 54);
    } else {
      doc.setTextColor(255, 152, 0);
    }
    doc.text(status, 165, yPos);
    doc.setTextColor(0, 0, 0);

    yPos += 7;
  });

  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount} | Haven Space Payment Statement | ${new Date().toLocaleDateString(
        'en-PH'
      )}`,
      14,
      287
    );
  }

  // Save PDF
  const filename = `payment-statement-${Date.now()}.pdf`;
  doc.save(filename);
}

/**
 * Generate CSV statement as fallback
 */
function generateBoarderStatementCSV(payments, userName) {
  // CSV headers
  const headers = [
    'Property',
    'Room',
    'Amount',
    'Late Fee',
    'Total',
    'Due Date',
    'Paid Date',
    'Status',
    'Payment Method',
    'Reference Number',
  ];

  // Metadata
  const metadata = [
    ['Haven Space - Payment Statement'],
    [],
    ['Boarder', userName],
    ['Generated', new Date().toLocaleString('en-PH')],
    [],
    [],
  ];

  // Convert data to CSV rows
  const rows = payments.map(payment => {
    const amount = parseFloat(payment.amount || 0);
    const lateFee = parseFloat(payment.late_fee || 0);
    const total = amount + lateFee;

    return [
      payment.property_title || 'N/A',
      payment.room_title || 'N/A',
      amount.toFixed(2),
      lateFee.toFixed(2),
      total.toFixed(2),
      payment.due_date || '',
      payment.paid_date || '',
      payment.status || 'N/A',
      payment.payment_method || '',
      payment.reference_number || '',
    ];
  });

  // Combine all parts
  const csvContent = [
    ...metadata.map(row => row.join(',')),
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `payment-statement-${Date.now()}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
