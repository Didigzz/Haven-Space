/**
 * Payment Export Module
 * Handles export report functionality with multiple formats and filters
 * Enhanced with email delivery, Excel export, and professional templates
 */

import CONFIG from '../../config.ts';

/**
 * Show export modal
 */
export function showExportModal() {
  const modal = createExportModal();
  document.body.appendChild(modal);
  initExportModalListeners(modal);
}

/**
 * Create export modal HTML
 */
function createExportModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.id = 'exportModal';
  modal.innerHTML = `
    <div class="modal-content export-modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Download Payment Statement</h3>
        <button class="modal-close" id="closeExportModal">&times;</button>
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
          <div class="export-custom-dates" id="customDateRange" style="display: none;">
            <div class="export-date-group">
              <label for="startDate">Start Date</label>
              <input type="date" id="startDate" class="export-input" />
            </div>
            <div class="export-date-group">
              <label for="endDate">End Date</label>
              <input type="date" id="endDate" class="export-input" />
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div class="export-section">
          <h4 class="export-section-title">Filters</h4>
          <div class="export-filter-group">
            <label for="exportStatusFilter">Payment Status</label>
            <select id="exportStatusFilter" class="export-select">
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
          <button class="landlord-btn landlord-btn-primary export-download-btn" id="generateExport">
            <img src="../../../assets/svg/arrowDownTray.svg" alt="" width="20" height="20" class="icon-no-bg" />
            Download Statement
          </button>
          <button class="landlord-btn landlord-btn-outline export-cancel-btn" id="cancelExport">Cancel</button>
        </div>
      </div>
    </div>
  `;
  return modal;
}

/**
 * Initialize export modal event listeners
 */
function initExportModalListeners(modal) {
  // Close modal
  const closeBtn = modal.querySelector('#closeExportModal');
  const cancelBtn = modal.querySelector('#cancelExport');

  closeBtn?.addEventListener('click', () => closeExportModal(modal));
  cancelBtn?.addEventListener('click', () => closeExportModal(modal));

  modal.addEventListener('click', e => {
    if (e.target === modal) {
      closeExportModal(modal);
    }
  });

  // Toggle custom date range
  const timeRangeInputs = modal.querySelectorAll('input[name="timeRange"]');
  const customDateRange = modal.querySelector('#customDateRange');

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
  const generateBtn = modal.querySelector('#generateExport');
  generateBtn?.addEventListener('click', () => handleExportGeneration(modal));
}

/**
 * Close export modal
 */
function closeExportModal(modal) {
  modal.classList.remove('active');
  setTimeout(() => modal.remove(), 300);
}

/**
 * Handle export generation
 */
async function handleExportGeneration(modal) {
  const generateBtn = modal.querySelector('#generateExport');
  const originalText = generateBtn.innerHTML;

  try {
    // Disable button and show loading
    generateBtn.disabled = true;
    generateBtn.innerHTML = 'Generating...';

    // Collect export parameters
    const params = collectExportParameters(modal);

    // Validate custom date range
    if (params.timeRange === 'custom') {
      if (!params.startDate || !params.endDate) {
        alert('Please select both start and end dates for custom range');
        return;
      }
      if (new Date(params.startDate) > new Date(params.endDate)) {
        alert('Start date must be before end date');
        return;
      }
    }

    // Fetch export data
    const data = await fetchExportData(params);

    if (!data || data.length === 0) {
      alert('No data found for the selected criteria');
      return;
    }

    // Generate export based on format
    switch (params.outputFormat) {
      case 'pdf':
        await generatePDFReport(data, params);
        break;
      case 'csv':
        generateCSVReport(data, params);
        break;
      case 'preview':
        showPreviewReport(data, params);
        break;
    }

    closeExportModal(modal);
  } catch (error) {
    console.error('Export generation failed:', error);
    alert('Failed to generate report. Please try again.');
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = originalText;
  }
}

/**
 * Collect export parameters from modal
 */
function collectExportParameters(modal) {
  const timeRange = modal.querySelector('input[name="timeRange"]:checked')?.value || 'all';
  const outputFormat = modal.querySelector('input[name="outputFormat"]:checked')?.value || 'pdf';

  const params = {
    timeRange,
    reportType: 'all', // Default to all payments
    outputFormat,
    property: 'all',
    tenant: 'all',
    status: modal.querySelector('#exportStatusFilter')?.value || 'all',
  };

  // Add custom date range if selected
  if (timeRange === 'custom') {
    params.startDate = modal.querySelector('#startDate')?.value;
    params.endDate = modal.querySelector('#endDate')?.value;
  }

  return params;
}

/**
 * Fetch export data from API
 */
async function fetchExportData(params) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Build query string
  const queryParams = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] && params[key] !== 'all') {
      queryParams.append(key, params[key]);
    }
  });

  const response = await fetch(
    `${CONFIG.API_BASE_URL}/api/landlord/payments/export?${queryParams.toString()}`,
    {
      method: 'GET',
      headers,
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch export data');
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Generate PDF report with enhanced formatting and branding
 * Note: Requires jsPDF library to be loaded
 */
async function generatePDFReport(data, params) {
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
      showToast('PDF library not available. Please refresh and try again.', 'error');
      throw new Error('jsPDF not available');
    });
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Get user info for branding
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const landlordName = user.name || 'Landlord';

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
  doc.text('Payment Statement Report', 14, 25);

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Add report metadata
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Landlord: ${landlordName}`, 14, 45);
  doc.text(`Report Type: ${formatReportType(params.reportType)}`, 14, 51);
  doc.text(`Time Range: ${formatTimeRange(params)}`, 14, 57);
  doc.text(
    `Generated: ${new Date().toLocaleString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    14,
    63
  );

  // Add filters if applied
  let yPos = 69;
  if (params.property !== 'all') {
    doc.text(`Property Filter: ${params.property}`, 14, yPos);
    yPos += 6;
  }
  if (params.tenant !== 'all') {
    doc.text(`Tenant Filter: ${params.tenant}`, 14, yPos);
    yPos += 6;
  }
  if (params.status !== 'all') {
    doc.text(
      `Status Filter: ${params.status.charAt(0).toUpperCase() + params.status.slice(1)}`,
      14,
      yPos
    );
    yPos += 6;
  }

  yPos += 5;

  // Add summary statistics box
  const summary = calculateSummary(data);
  doc.setFillColor(245, 245, 245);
  doc.rect(14, yPos, 182, 40, 'F');

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Summary', 18, yPos + 8);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Total Payments: ${summary.totalCount}`, 18, yPos + 16);
  doc.text(
    `Total Amount: ₱${summary.totalAmount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    18,
    yPos + 22
  );

  doc.setTextColor(76, 175, 80); // Green for paid
  doc.text(
    `Paid: ${summary.paidCount} (₱${summary.paidAmount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })})`,
    18,
    yPos + 28
  );

  doc.setTextColor(255, 152, 0); // Orange for pending
  doc.text(
    `Pending: ${summary.pendingCount} (₱${summary.pendingAmount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })})`,
    18,
    yPos + 34
  );

  doc.setTextColor(244, 67, 54); // Red for overdue
  doc.text(
    `Overdue: ${summary.overdueCount} (₱${summary.overdueAmount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })})`,
    110,
    yPos + 28
  );

  doc.setTextColor(0, 0, 0); // Reset color

  yPos += 50;

  // Add detailed payment table
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Payment Details', 14, yPos);

  yPos += 8;

  // Table header
  doc.setFillColor(76, 175, 80);
  doc.rect(14, yPos - 5, 182, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Tenant', 16, yPos);
  doc.text('Property', 60, yPos);
  doc.text('Amount', 110, yPos);
  doc.text('Due Date', 140, yPos);
  doc.text('Status', 170, yPos);

  yPos += 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');

  // Table rows
  data.forEach((payment, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;

      // Repeat header on new page
      doc.setFillColor(76, 175, 80);
      doc.rect(14, yPos - 5, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text('Tenant', 16, yPos);
      doc.text('Property', 60, yPos);
      doc.text('Amount', 110, yPos);
      doc.text('Due Date', 140, yPos);
      doc.text('Status', 170, yPos);
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
    }

    // Alternate row colors
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(14, yPos - 5, 182, 7, 'F');
    }

    const tenantName = `${payment.boarder_first_name} ${payment.boarder_last_name}`;
    const amount = parseFloat(payment.amount) + parseFloat(payment.late_fee || 0);
    const dueDate = new Date(payment.due_date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const status = payment.status.charAt(0).toUpperCase() + payment.status.slice(1);

    // Set status color
    if (payment.status === 'paid') {
      doc.setTextColor(76, 175, 80);
    } else if (payment.status === 'overdue') {
      doc.setTextColor(244, 67, 54);
    } else {
      doc.setTextColor(255, 152, 0);
    }

    doc.text(tenantName.substring(0, 18), 16, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(payment.property_title.substring(0, 20), 60, yPos);
    doc.text(`₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 110, yPos);
    doc.text(dueDate, 140, yPos);

    // Status with color
    if (payment.status === 'paid') {
      doc.setTextColor(76, 175, 80);
    } else if (payment.status === 'overdue') {
      doc.setTextColor(244, 67, 54);
    } else {
      doc.setTextColor(255, 152, 0);
    }
    doc.text(status, 170, yPos);
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
      `Page ${i} of ${pageCount} | Generated by Haven Space | ${new Date().toLocaleDateString(
        'en-PH'
      )}`,
      14,
      287
    );
  }

  // Save PDF
  const filename = `payment-statement-${Date.now()}.pdf`;
  doc.save(filename);

  // Show success message
  showToast('PDF report generated successfully!', 'success');
}

/**
 * Generate CSV report with enhanced formatting
 */
function generateCSVReport(data, params) {
  const summary = calculateSummary(data);

  // CSV headers with metadata
  const metadata = [
    ['Haven Space - Payment Statement Report'],
    [],
    ['Report Type', formatReportType(params.reportType)],
    ['Time Range', formatTimeRange(params)],
    ['Generated', new Date().toLocaleString('en-PH')],
    [],
    ['Summary Statistics'],
    ['Total Payments', summary.totalCount],
    [
      'Total Amount',
      `₱${summary.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    ],
    ['Paid Count', summary.paidCount],
    ['Paid Amount', `₱${summary.paidAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`],
    ['Pending Count', summary.pendingCount],
    [
      'Pending Amount',
      `₱${summary.pendingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    ],
    ['Overdue Count', summary.overdueCount],
    [
      'Overdue Amount',
      `₱${summary.overdueAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    ],
    [],
    [],
  ];

  // CSV headers for payment data
  const headers = [
    'Tenant Name',
    'Email',
    'Property',
    'Room',
    'Amount',
    'Late Fee',
    'Total Amount',
    'Due Date',
    'Paid Date',
    'Status',
    'Payment Method',
    'Reference Number',
    'Notes',
  ];

  // Convert data to CSV rows
  const rows = data.map(payment => {
    const amount = parseFloat(payment.amount);
    const lateFee = parseFloat(payment.late_fee || 0);
    const total = amount + lateFee;

    return [
      `${payment.boarder_first_name} ${payment.boarder_last_name}`,
      payment.boarder_email,
      payment.property_title,
      payment.room_title,
      amount.toFixed(2),
      lateFee.toFixed(2),
      total.toFixed(2),
      payment.due_date,
      payment.paid_date || '',
      payment.status.charAt(0).toUpperCase() + payment.status.slice(1),
      payment.payment_method || '',
      payment.reference_number || '',
      payment.notes || '',
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

  showToast('CSV report generated successfully!', 'success');
}

/**
 * Show preview report in browser
 */
function showPreviewReport(data, params) {
  const summary = calculateSummary(data);

  const previewWindow = window.open('', '_blank');
  previewWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Report Preview</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        .summary { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #4CAF50; color: white; }
        tr:hover { background: #f5f5f5; }
        .status-paid { color: green; font-weight: bold; }
        .status-pending { color: orange; font-weight: bold; }
        .status-overdue { color: red; font-weight: bold; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <h1>Payment Report</h1>
      <p><strong>Report Type:</strong> ${formatReportType(params.reportType)}</p>
      <p><strong>Time Range:</strong> ${formatTimeRange(params)}</p>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>

      <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Payments:</strong> ${summary.totalCount}</p>
        <p><strong>Total Amount:</strong> ₱${summary.totalAmount.toLocaleString()}</p>
        <p><strong>Paid:</strong> ${summary.paidCount} (₱${summary.paidAmount.toLocaleString()})</p>
        <p><strong>Pending:</strong> ${
          summary.pendingCount
        } (₱${summary.pendingAmount.toLocaleString()})</p>
        <p><strong>Overdue:</strong> ${
          summary.overdueCount
        } (₱${summary.overdueAmount.toLocaleString()})</p>
      </div>

      <button class="no-print" onclick="window.print()">Print Report</button>

      <table>
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Property</th>
            <th>Room</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              payment => `
            <tr>
              <td>${payment.boarder_first_name} ${payment.boarder_last_name}</td>
              <td>${payment.property_title}</td>
              <td>${payment.room_title}</td>
              <td>₱${parseFloat(payment.amount).toLocaleString()}</td>
              <td>${new Date(payment.due_date).toLocaleDateString()}</td>
              <td class="status-${payment.status}">${
                payment.status.charAt(0).toUpperCase() + payment.status.slice(1)
              }</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </body>
    </html>
  `);
  previewWindow.document.close();
}

/**
 * Calculate summary statistics
 */
function calculateSummary(data) {
  const summary = {
    totalCount: data.length,
    totalAmount: 0,
    paidCount: 0,
    paidAmount: 0,
    pendingCount: 0,
    pendingAmount: 0,
    overdueCount: 0,
    overdueAmount: 0,
  };

  data.forEach(payment => {
    const amount = parseFloat(payment.amount) + parseFloat(payment.late_fee || 0);
    summary.totalAmount += amount;

    if (payment.status === 'paid') {
      summary.paidCount++;
      summary.paidAmount += amount;
    } else if (payment.status === 'overdue') {
      summary.overdueCount++;
      summary.overdueAmount += amount;
    } else {
      summary.pendingCount++;
      summary.pendingAmount += amount;
    }
  });

  return summary;
}

/**
 * Format report type for display
 */
function formatReportType(type) {
  const types = {
    all: 'All Payments',
    outstanding: 'Outstanding Balances',
    overdue: 'Overdue Payments',
    summary: 'Summary Report',
  };
  return types[type] || type;
}

/**
 * Format time range for display
 */
function formatTimeRange(params) {
  if (params.timeRange === 'custom') {
    return `${params.startDate} to ${params.endDate}`;
  }

  const ranges = {
    all: 'All Time',
    daily: 'Today',
    weekly: 'This Week',
    monthly: 'This Month',
    last3months: 'Last 3 Months',
    last6months: 'Last 6 Months',
    ytd: 'Year-to-Date',
  };
  return ranges[params.timeRange] || params.timeRange;
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, info)
 */
function showToast(message, type = 'info') {
  // Check if toast container exists, create if not
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    info: '#2196F3',
    warning: '#ff9800',
  };

  toast.style.cssText = `
    background-color: ${colors[type] || colors.info};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-size: 14px;
    font-weight: 500;
    min-width: 300px;
    max-width: 500px;
    animation: slideIn 0.3s ease-out;
    display: flex;
    align-items: center;
    gap: 12px;
  `;

  // Add icon based on type
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  toast.innerHTML = `
    <span style="font-size: 20px; font-weight: bold;">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;

  // Add animation keyframes if not already added
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
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
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  toastContainer.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      toast.remove();
      // Remove container if empty
      if (toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 300);
  }, 4000);
}
