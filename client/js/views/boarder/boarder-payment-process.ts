/**
 * Boarder Payment Process - GCash Integration
 *
 * Handles payment form, GCash QR code generation, and payment confirmation
 */

import CONFIG from '../../config.ts';
import { getLoginPath } from '../../shared/routing.ts';

// Payment state
const paymentState = {
  selectedMethod: 'gcash',
  paymentId: null,
  amount: 5500.0,
  period: 'Current Bill',
  dueDate: null,
  qrTimer: null,
  qrTimeRemaining: 15 * 60, // 15 minutes in seconds
  landlordPaymentInfo: null, // Store landlord's payment methods
};

/**
 * Initialize Payment Page
 * Sets up event listeners and initializes components
 */
export async function initPaymentPage() {
  // Initialize sidebar and navbar
  await initializeNavigation();

  // Load landlord payment information first
  await loadLandlordPaymentInfo();

  // Load current bill so the boarder pays the actual pending amount.
  await loadCurrentBill();

  // Set up payment method selection
  setupPaymentMethodSelection();

  // Set up form interactions
  setupFormInteractions();

  // Initialize QR timer
  startQRTimer();

  // Set default payment date to today
  setDefaultPaymentDate();
}

/**
 * Initialize Navigation (Sidebar & Navbar)
 */
async function initializeNavigation() {
  function loginPath() {
    return getLoginPath();
  }

  function initialsFrom(user) {
    const a = (user.first_name || '').trim().charAt(0);
    const b = (user.last_name || '').trim().charAt(0);
    return (a + b || 'B').toUpperCase();
  }

  let user;
  try {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
      headers,
      credentials: 'include',
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
    import('../../components/sidebar.ts').then(({ initSidebar }) => {
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
          avatarImg.style.cssText =
            'display:block;width:100%;height:100%;border-radius:50%;object-fit:cover;';
          avatarInitials.style.display = 'none';
          avatarImg.onerror = () => {
            avatarImg.style.display = 'none';
            avatarInitials.style.display = 'flex';
          };
        }
        if ((updated.first_name || updated.last_name) && sidebarName) {
          sidebarName.textContent =
            `${updated.first_name || ''} ${updated.last_name || ''}`.trim() ||
            sidebarName.textContent;
        }
      });
    });
  }

  // Initialize navbar
  const navbarContainer = document.getElementById('navbar-container');
  if (navbarContainer) {
    import('../../components/navbar.ts').then(({ initNavbar }) => {
      initNavbar({
        user: {
          name,
          initials,
          avatarUrl: user.avatar_url || '',
          email: user.email || '',
        },
        notificationCount: 3,
      });
    });
  }
}

/**
 * Load landlord's payment information
 */
async function loadLandlordPaymentInfo() {
  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/landlord-payment-info`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to load landlord payment information');
    }

    const result = await response.json();
    paymentState.landlordPaymentInfo = result.data;

    // Update payment methods display with landlord's actual methods
    updatePaymentMethodsDisplay();
  } catch (error) {
    console.error('Failed to load landlord payment info:', error);
    showToast('Unable to load payment methods. Please contact your landlord.', 'error');
  }
}

/**
 * Update payment methods display based on landlord's configured methods
 */
function updatePaymentMethodsDisplay() {
  if (!paymentState.landlordPaymentInfo || !paymentState.landlordPaymentInfo.paymentMethods) {
    return;
  }

  const methods = paymentState.landlordPaymentInfo.paymentMethods;

  // Update GCash phone number if landlord has GCash configured
  const gcashMethod = methods.find(m => m.methodType === 'GCash');
  if (gcashMethod) {
    const phoneNumberElements = document.querySelectorAll('.gcash-phone-number');
    phoneNumberElements.forEach(el => {
      el.textContent = gcashMethod.accountNumber;
    });

    // Update copy button handler
    const copyPhoneBtn = document.getElementById('copyPhoneBtn');
    if (copyPhoneBtn) {
      copyPhoneBtn.onclick = () => handleCopyPhoneNumber(gcashMethod.accountNumber);
    }
  }

  // Update bank transfer details if landlord has bank transfer configured
  const bankMethod = methods.find(m => m.methodType === 'Bank Transfer');
  if (bankMethod) {
    const bankNameEl = document.querySelector('.bank-detail-value');
    if (bankNameEl && bankMethod.bankName) {
      bankNameEl.textContent = bankMethod.bankName;
    }

    const accountNameEls = document.querySelectorAll('.bank-detail-value');
    if (accountNameEls[1]) {
      accountNameEls[1].textContent = bankMethod.accountName;
    }

    const accountNumberEls = document.querySelectorAll('.bank-detail-value');
    if (accountNumberEls[2]) {
      accountNumberEls[2].textContent = bankMethod.accountNumber;
    }
  }
}

/**
 * Load the boarder's current bill from the payment overview API.
 */
async function loadCurrentBill() {
  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/overview`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to load current bill');
    }

    const result = await response.json();
    const overview = result.data || {};
    const bill = overview.current_bill || {};

    paymentState.paymentId = bill.id || null;
    paymentState.amount = parseFloat(bill.total || overview.next_payment_amount || 0) || 0;
    paymentState.period = bill.period || formatPeriod(overview.next_payment_date || new Date());
    paymentState.dueDate = bill.due_date || overview.next_payment_date || null;

    renderCurrentBill(overview, bill);
  } catch (error) {
    console.error('Failed to load current payment bill:', error);
    showToast('Unable to load your current bill. Please refresh the page.', 'error');
  }
}

/**
 * Render current bill details into the static payment template.
 */
function renderCurrentBill(overview, bill) {
  const amount = paymentState.amount;
  const baseRent = parseFloat(bill.base_rent || amount || 0);
  const includesExtras = amount > baseRent;
  const utilities = includesExtras ? parseFloat(bill.utilities || 0) : 0;
  const wifi = includesExtras ? parseFloat(bill.wifi || 0) : 0;

  const periodEl = document.querySelector('.payment-summary-period');
  if (periodEl) {
    periodEl.textContent = paymentState.period;
  }

  const summaryRows = document.querySelectorAll('.payment-summary-row');
  summaryRows.forEach(row => {
    const label = row.querySelector('.payment-summary-label')?.textContent.trim().toLowerCase();
    const valueEl = row.querySelector('.payment-summary-value');
    if (!valueEl || !label) {
      return;
    }

    if (label.includes('base rent')) {
      valueEl.textContent = formatCurrency(baseRent);
    } else if (label.includes('utilities')) {
      valueEl.textContent = formatCurrency(utilities);
    } else if (label.includes('wifi')) {
      valueEl.textContent = formatCurrency(wifi);
    } else if (label.includes('total')) {
      valueEl.textContent = formatCurrency(amount);
    }
  });

  const amountInput = document.getElementById('paymentAmount');
  if (amountInput && amount > 0) {
    amountInput.value = amount.toFixed(2);
    amountInput.placeholder = amount.toFixed(2);
  }

  const manualAmount = document.querySelector('.gcash-amount');
  if (manualAmount) {
    manualAmount.textContent = formatCurrency(amount);
  }

  const hint = document.querySelector('.gcash-reference-hint');
  if (hint && overview.room_info) {
    const property = overview.room_info.property_name || 'your room';
    const room = overview.room_info.room_number ? ` Room ${overview.room_info.room_number}` : '';
    hint.textContent = `Use your name and ${property}${room} as reference`;
  }
}

/**
 * Set up Payment Method Selection
 */
function setupPaymentMethodSelection() {
  const methodOptions = document.querySelectorAll('.payment-method-option');

  methodOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected from all options
      methodOptions.forEach(opt => opt.classList.remove('selected'));

      // Add selected to clicked option
      option.classList.add('selected');

      // Update selected method
      paymentState.selectedMethod = option.dataset.method;

      // Show corresponding payment form
      showPaymentForm(paymentState.selectedMethod);
    });
  });
}

/**
 * Show Payment Form based on selected method
 * @param {string} method - Payment method (gcash, bank, card)
 */
function showPaymentForm(method) {
  const gcashForm = document.getElementById('gcashPaymentForm');
  const bankForm = document.getElementById('bankPaymentForm');
  const cardForm = document.getElementById('cardPaymentForm');

  // Hide all forms
  if (gcashForm) {
    gcashForm.style.display = 'none';
  }
  if (bankForm) {
    bankForm.style.display = 'none';
  }
  if (cardForm) {
    cardForm.style.display = 'none';
  }

  // Show selected form
  if (method === 'gcash' && gcashForm) {
    gcashForm.style.display = 'block';
  } else if (method === 'bank' && bankForm) {
    bankForm.style.display = 'block';
  } else if (method === 'card' && cardForm) {
    cardForm.style.display = 'block';
  }
}

/**
 * Set up Form Interactions
 */
function setupFormInteractions() {
  // Copy phone number button
  const copyPhoneBtn = document.getElementById('copyPhoneBtn');
  if (copyPhoneBtn) {
    copyPhoneBtn.addEventListener('click', handleCopyPhoneNumber);
  }

  // Refresh QR button
  const refreshQRBtn = document.getElementById('refreshQRBtn');
  if (refreshQRBtn) {
    refreshQRBtn.addEventListener('click', handleRefreshQR);
  }

  // Download QR button
  const downloadQRBtn = document.getElementById('downloadQRBtn');
  if (downloadQRBtn) {
    downloadQRBtn.addEventListener('click', handleDownloadQR);
  }

  // File upload preview
  const proofUpload = document.getElementById('proofUpload');
  if (proofUpload) {
    proofUpload.addEventListener('change', handleFileUpload);
  }

  // Cancel button
  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', handleCancel);
  }

  // Submit payment button
  const submitPaymentBtn = document.getElementById('submitPaymentBtn');
  if (submitPaymentBtn) {
    submitPaymentBtn.addEventListener('click', handleSubmitPayment);
  }

  // Success modal buttons
  const doneBtn = document.getElementById('doneBtn');
  if (doneBtn) {
    doneBtn.addEventListener('click', handleDone);
  }

  const downloadReceiptBtn = document.getElementById('downloadReceiptBtn');
  if (downloadReceiptBtn) {
    downloadReceiptBtn.addEventListener('click', handleDownloadReceipt);
  }

  // Error modal buttons
  const cancelErrorBtn = document.getElementById('cancelErrorBtn');
  if (cancelErrorBtn) {
    cancelErrorBtn.addEventListener('click', () => hideErrorModal());
  }

  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', handleRetry);
  }
}

/**
 * Handle Copy Phone Number
 */
function handleCopyPhoneNumber(phoneNumber = null) {
  // Use provided phone number or get from landlord payment info
  const number =
    phoneNumber ||
    paymentState.landlordPaymentInfo?.paymentMethods?.find(m => m.methodType === 'GCash')
      ?.accountNumber ||
    '0917-123-4567';

  navigator.clipboard
    .writeText(number)
    .then(() => {
      showToast('Phone number copied to clipboard');
    })
    .catch(err => {
      console.error('Failed to copy:', err);
      showToast('Failed to copy phone number', 'error');
    });
}

/**
 * Handle Refresh QR Code
 */
function handleRefreshQR() {
  // Reset timer
  paymentState.qrTimeRemaining = 15 * 60;
  updateTimerDisplay();

  // TODO: Generate new QR code from backend
  showToast('QR Code refreshed successfully');
}

/**
 * Handle Download QR Code
 */
function handleDownloadQR() {
  // TODO: Generate actual QR code and download
  // For now, show a message
  showToast('QR Code download initiated');
}

/**
 * Handle File Upload
 * @param {Event} event - File input change event
 */
function handleFileUpload(event) {
  const file = event.target.files[0];
  const filePreview = document.getElementById('filePreview');

  if (file) {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be less than 5MB', 'error');
      event.target.value = '';
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a valid file (PNG, JPG, or PDF)', 'error');
      event.target.value = '';
      return;
    }

    // Show file preview
    if (filePreview) {
      filePreview.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`;
      filePreview.classList.add('has-file');
    }

    showToast('File uploaded successfully');
  }
}

/**
 * Format File Size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Handle Cancel
 */
function handleCancel() {
  if (confirm('Are you sure you want to cancel this payment?')) {
    window.history.back();
  }
}

/**
 * Handle Submit Payment
 */
async function handleSubmitPayment() {
  // Validate form
  const isValid = validatePaymentForm();
  if (!isValid) {
    return;
  }

  // Get form values
  const referenceNumber = document.getElementById('referenceNumber').value.trim();
  const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
  const paymentDate = document.getElementById('paymentDate').value;
  document.getElementById('termsAccept').checked;

  // Disable submit button
  const submitBtn = document.getElementById('submitPaymentBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Processing...
    `;
  }

  try {
    await submitPayment({
      payment_id: paymentState.paymentId,
      reference_number: referenceNumber,
      amount: paymentAmount,
      paid_date: paymentDate,
      payment_method: paymentState.selectedMethod,
    });

    // Show success modal
    showSuccessModal({
      referenceNumber,
      amount: paymentAmount,
      method: getPaymentMethodLabel(paymentState.selectedMethod),
      date: new Date(paymentDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    });
  } catch (error) {
    console.error('Payment processing failed:', error);
    showErrorModal(
      error.message || 'There was an error processing your payment. Please try again.'
    );
  } finally {
    // Re-enable submit button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <img src="../../../assets/svg/check.svg" alt="check" width="20" height="20" />
        Submit Payment
      `;
    }
  }
}

/**
 * Submit payment details to the API so the landlord can see the payment.
 * @param {Object} payload - Payment submission data
 */
async function submitPayment(payload) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/submit`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false) {
    throw new Error(result.error || result.message || 'Failed to submit payment');
  }

  return result.data;
}

/**
 * Format payment method label for display.
 */
function getPaymentMethodLabel(method) {
  const labels = {
    gcash: 'GCash',
    bank: 'Bank Transfer',
    card: 'Credit/Debit Card',
    cash: 'Cash',
    other: 'Other',
  };

  return labels[method] || 'Other';
}

/**
 * Validate Payment Form
 * @returns {boolean} Is form valid
 */
function validatePaymentForm() {
  const referenceNumber = document.getElementById('referenceNumber').value.trim();
  const paymentAmount = document.getElementById('paymentAmount').value;
  const paymentDate = document.getElementById('paymentDate').value;
  const termsAccepted = document.getElementById('termsAccept').checked;

  // Validate reference number
  if (!referenceNumber) {
    showToast('Please enter GCash reference number', 'error');
    document.getElementById('referenceNumber').focus();
    return false;
  }

  if (referenceNumber.length < 6) {
    showToast('Reference number must be at least 6 characters', 'error');
    document.getElementById('referenceNumber').focus();
    return false;
  }

  // Validate payment amount
  if (!paymentAmount) {
    showToast('Please enter payment amount', 'error');
    document.getElementById('paymentAmount').focus();
    return false;
  }

  if (parseFloat(paymentAmount) <= 0) {
    showToast('Payment amount must be greater than 0', 'error');
    document.getElementById('paymentAmount').focus();
    return false;
  }

  // Validate payment date
  if (!paymentDate) {
    showToast('Please select payment date', 'error');
    document.getElementById('paymentDate').focus();
    return false;
  }

  // Validate terms acceptance
  if (!termsAccepted) {
    showToast('Please accept the terms to continue', 'error');
    return false;
  }

  return true;
}

/**
 * Format currency for Philippine peso amounts.
 */
function formatCurrency(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a bill period from a date value.
 */
function formatPeriod(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return 'Current Bill';
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Show Success Modal
 * @param {Object} paymentData - Payment details
 */
function showSuccessModal(paymentData) {
  const modal = document.getElementById('successModal');
  const refNumberEl = document.getElementById('modalRefNumber');
  const amountEl = document.getElementById('modalAmount');
  const methodEl = document.getElementById('modalMethod');
  const dateEl = document.getElementById('modalDate');

  if (refNumberEl) {
    refNumberEl.textContent = paymentData.referenceNumber;
  }
  if (amountEl) {
    amountEl.textContent = `₱${paymentData.amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
    })}`;
  }
  if (methodEl) {
    methodEl.textContent = paymentData.method;
  }
  if (dateEl) {
    dateEl.textContent = paymentData.date;
  }

  if (modal) {
    modal.style.display = 'flex';
  }
}

/**
 * Hide Success Modal
 */
function hideSuccessModal() {
  const modal = document.getElementById('successModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Show Error Modal
 * @param {string} message - Error message
 */
function showErrorModal(message = 'There was an error processing your payment. Please try again.') {
  const modal = document.getElementById('errorModal');
  const messageEl = document.getElementById('errorMessage');

  if (messageEl) {
    messageEl.textContent = message;
  }

  if (modal) {
    modal.style.display = 'flex';
  }
}

/**
 * Hide Error Modal
 */
function hideErrorModal() {
  const modal = document.getElementById('errorModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Handle Done (from success modal)
 */
function handleDone() {
  hideSuccessModal();
  // Navigate back to payments page with cache-busting parameter to force refresh
  window.location.href = 'index.html?refresh=' + Date.now();
}

/**
 * Generate Receipt PDF
 * @param {Object} data - Receipt data
 */
function generateReceiptPDF(data) {
  // Create a printable receipt HTML
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Receipt - ${data.referenceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          padding: 40px;
          background: white;
          color: #1a1a1a;
        }
        .receipt-container {
          max-width: 600px;
          margin: 0 auto;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 40px;
        }
        .receipt-header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
        }
        .success-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          background: #d1fae5;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .success-icon svg {
          width: 40px;
          height: 40px;
          stroke: #10b981;
        }
        .receipt-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 10px;
        }
        .receipt-subtitle {
          font-size: 16px;
          color: #6b7280;
        }
        .receipt-details {
          margin-bottom: 30px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .detail-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }
        .detail-value {
          font-size: 16px;
          color: #1a1a1a;
          font-weight: 600;
          text-align: right;
        }
        .receipt-footer {
          text-align: center;
          padding-top: 30px;
          border-top: 2px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        .receipt-footer p {
          margin-bottom: 8px;
        }
        .brand-name {
          font-weight: 700;
          color: #10b981;
        }
        @media print {
          body {
            padding: 0;
          }
          .receipt-container {
            border: none;
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="receipt-header">
          <div class="success-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 class="receipt-title">Payment Receipt</h1>
          <p class="receipt-subtitle">Thank you for your payment!</p>
        </div>

        <div class="receipt-details">
          <div class="detail-row">
            <span class="detail-label">Reference Number:</span>
            <span class="detail-value">${data.referenceNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">${data.amount}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Payment Method:</span>
            <span class="detail-value">${data.paymentMethod}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date:</span>
            <span class="detail-value">${data.date}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Paid By:</span>
            <span class="detail-value">${data.userName}</span>
          </div>
        </div>

        <div class="receipt-footer">
          <p><span class="brand-name">Haven Space</span></p>
          <p>Your payment has been recorded and is now visible to your landlord.</p>
          <p>For questions or concerns, please contact your landlord directly.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Create a new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    showToast('Please allow pop-ups to download receipt', 'error');
    return;
  }

  printWindow.document.write(receiptHTML);
  printWindow.document.close();

  // Wait for content to load, then trigger print dialog
  printWindow.onload = function () {
    setTimeout(() => {
      printWindow.print();
      // Close the window after printing (user can cancel)
      setTimeout(() => {
        printWindow.close();
      }, 100);
    }, 250);
  };
}

/**
 * Handle Download Receipt
 */
function handleDownloadReceipt() {
  // Get payment data from the success modal
  const refNumber = document.getElementById('modalRefNumber')?.textContent || 'N/A';
  const amount = document.getElementById('modalAmount')?.textContent || '₱0.00';
  const method = document.getElementById('modalMethod')?.textContent || 'N/A';
  const date = document.getElementById('modalDate')?.textContent || new Date().toLocaleDateString();

  // Get user info from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Boarder';

  // Generate and download receipt
  generateReceiptPDF({
    referenceNumber: refNumber,
    amount: amount,
    paymentMethod: method,
    date: date,
    userName: userName,
  });

  showToast('Receipt download initiated', 'success');
}

/**
 * Handle Retry (from error modal)
 */
function handleRetry() {
  hideErrorModal();
  // Re-submit payment
  handleSubmitPayment();
}

/**
 * Start QR Timer
 */
function startQRTimer() {
  const timerElement = document.getElementById('qrTimer');

  if (!timerElement) {
    return;
  }

  // Clear existing timer
  if (paymentState.qrTimer) {
    clearInterval(paymentState.qrTimer);
  }

  // Update timer every second
  paymentState.qrTimer = setInterval(() => {
    if (paymentState.qrTimeRemaining > 0) {
      paymentState.qrTimeRemaining--;
      updateTimerDisplay();
    } else {
      // Timer expired
      handleQRExpired();
    }
  }, 1000);
}

/**
 * Update Timer Display
 */
function updateTimerDisplay() {
  const timerElement = document.getElementById('qrTimer');
  if (!timerElement) {
    return;
  }

  const minutes = Math.floor(paymentState.qrTimeRemaining / 60);
  const seconds = paymentState.qrTimeRemaining % 60;

  timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;

  // Change color when less than 2 minutes remaining
  if (paymentState.qrTimeRemaining < 120) {
    timerElement.style.color = 'var(--payment-process-red)';
  }
}

/**
 * Handle QR Expired
 */
function handleQRExpired() {
  clearInterval(paymentState.qrTimer);
  showToast('QR Code has expired. Please refresh.', 'error');

  // Auto-refresh QR code after 3 seconds
  setTimeout(() => {
    handleRefreshQR();
  }, 3000);
}

/**
 * Set Default Payment Date to Today
 */
function setDefaultPaymentDate() {
  const dateInput = document.getElementById('paymentDate');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
}

/**
 * Show Toast Notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error)
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  if (!toast || !toastMessage) {
    return;
  }

  // Set message and type
  toastMessage.textContent = message;
  toast.className = `payment-toast ${type}`;

  // Show toast
  toast.style.display = 'flex';

  // Hide after 3 seconds
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

/**
 * Cleanup on page unload
 */
function cleanup() {
  if (paymentState.qrTimer) {
    clearInterval(paymentState.qrTimer);
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', cleanup);
