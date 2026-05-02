/**
 * Payment Export Module
 * Handles export report functionality with multiple formats and filters
 */

import CONFIG from '../../config.js';

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
        <h3 class="modal-title">Export Payment Report</h3>
        <button class="modal-close" id="closeExportModal">&times;</button>
      </div>
      <div class="modal-body export-modal-body">
        <div class="export-modal-layout">
          <!-- Left Section -->
          <div class="export-left-section">
            <!-- Time Range Selection -->
            <div class="export-section">
              <h4 class="export-section-title">Time Range</h4>
              <div class="export-radio-group">
                <label class="export-radio-label">
                  <input type="radio" name="timeRange" value="daily" />
                  <span>Daily</span>
                </label>
                <label class="export-radio-label">
                  <input type="radio" name="timeRange" value="weekly" />
                  <span>Weekly</span>
                </label>
                <label class="export-radio-label">
                  <input type="radio" name="timeRange" value="monthly" checked />
                  <span>Monthly</span>
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

            <!-- Report Type Selection -->
            <div class="export-section">
              <h4 class="export-section-title">Report Type</h4>
              <div class="export-radio-group">
                <label class="export-radio-label">
                  <input type="radio" name="reportType" value="all" checked />
                  <span>All Payments</span>
                </label>
                <label class="export-radio-label">
                  <input type="radio" name="reportType" value="outstanding" />
                  <span>Outstanding Balances</span>
                </label>
                <label class="export-radio-label">
                  <input type="radio" name="reportType" value="overdue" />
                  <span>Overdue Payments</span>
                </label>
                <label class="export-radio-label">
                  <input type="radio" name="reportType" value="summary" />
                  <span>Summary Report</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Right Section -->
          <div class="export-right-section">
            <!-- Filter Options -->
            <div class="export-section">
              <h4 class="export-section-title">Filters</h4>

              <div class="export-filter-group">
                <label for="exportPropertyFilter">Property</label>
                <select id="exportPropertyFilter" class="export-select">
                  <option value="all">All Properties</option>
                </select>
              </div>

              <div class="export-filter-group">
                <label for="exportTenantFilter">Tenant</label>
                <select id="exportTenantFilter" class="export-select">
                  <option value="all">All Tenants</option>
                </select>
              </div>

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

            <!-- Generate Button in Right Section -->
            <div class="export-generate-section">
              <button class="landlord-btn landlord-btn-primary export-generate-btn" id="generateExport">
                <img src="../../../assets/svg/export.svg" alt="" width="20" height="20" class="icon-no-bg" />
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="landlord-btn landlord-btn-outline" id="cancelExport">Cancel</button>
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

  // Populate filters
  populateExportFilters(modal);
}

/**
 * Close export modal
 */
function closeExportModal(modal) {
  modal.classList.remove('active');
  setTimeout(() => modal.remove(), 300);
}

/**
 * Populate export filter dropdowns
 */
async function populateExportFilters(modal) {
  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Fetch payments to get unique properties and tenants
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/payments.php`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) return;

    const result = await response.json();
    if (!result.data || !Array.isArray(result.data)) return;

    const payments = result.data;

    // Populate properties
    const propertyFilter = modal.querySelector('#exportPropertyFilter');
    const properties = [...new Set(payments.map(p => p.property_title))];
    properties.forEach(property => {
      const option = document.createElement('option');
      option.value = property;
      option.textContent = property;
      propertyFilter.appendChild(option);
    });

    // Populate tenants
    const tenantFilter = modal.querySelector('#exportTenantFilter');
    const tenants = [
      ...new Set(
        payments.map(p => ({
          id: p.boarder_id,
          name: `${p.boarder_first_name} ${p.boarder_last_name}`,
        }))
      ),
    ];

    // Remove duplicates by ID
    const uniqueTenants = Array.from(new Map(tenants.map(t => [t.id, t])).values());

    uniqueTenants.forEach(tenant => {
      const option = document.createElement('option');
      option.value = tenant.id;
      option.textContent = tenant.name;
      tenantFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to populate export filters:', error);
  }
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
  const timeRange = modal.querySelector('input[name="timeRange"]:checked')?.value || 'monthly';
  const reportType = modal.querySelector('input[name="reportType"]:checked')?.value || 'all';
  const outputFormat = modal.querySelector('input[name="outputFormat"]:checked')?.value || 'pdf';

  const params = {
    timeRange,
    reportType,
    outputFormat,
    property: modal.querySelector('#exportPropertyFilter')?.value || 'all',
    tenant: modal.querySelector('#exportTenantFilter')?.value || 'all',
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
 * Generate PDF report
 * Note: Requires jsPDF library to be loaded
 */
async function generatePDFReport(data, params) {
  // Check if jsPDF is available
  if (typeof window.jspdf === 'undefined') {
    alert('PDF library not loaded. Please refresh the page and try again.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text('Payment Report', 14, 20);

  // Add report info
  doc.setFontSize(10);
  doc.text(`Report Type: ${formatReportType(params.reportType)}`, 14, 30);
  doc.text(`Time Range: ${formatTimeRange(params)}`, 14, 36);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);

  // Add summary statistics
  const summary = calculateSummary(data);
  doc.setFontSize(12);
  doc.text('Summary', 14, 52);
  doc.setFontSize(10);
  doc.text(`Total Payments: ${summary.totalCount}`, 14, 58);
  doc.text(`Total Amount: ₱${summary.totalAmount.toLocaleString()}`, 14, 64);
  doc.text(`Paid: ${summary.paidCount} (₱${summary.paidAmount.toLocaleString()})`, 14, 70);
  doc.text(`Pending: ${summary.pendingCount} (₱${summary.pendingAmount.toLocaleString()})`, 14, 76);
  doc.text(`Overdue: ${summary.overdueCount} (₱${summary.overdueAmount.toLocaleString()})`, 14, 82);

  // Add table
  let yPos = 92;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Tenant', 14, yPos);
  doc.text('Property', 60, yPos);
  doc.text('Amount', 120, yPos);
  doc.text('Due Date', 150, yPos);
  doc.text('Status', 180, yPos);

  yPos += 6;
  doc.setFont(undefined, 'normal');

  data.forEach(payment => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    const tenantName = `${payment.boarder_first_name} ${payment.boarder_last_name}`;
    const amount = `₱${parseFloat(payment.amount).toLocaleString()}`;
    const dueDate = new Date(payment.due_date).toLocaleDateString();
    const status = payment.status.charAt(0).toUpperCase() + payment.status.slice(1);

    doc.text(tenantName.substring(0, 20), 14, yPos);
    doc.text(payment.property_title.substring(0, 25), 60, yPos);
    doc.text(amount, 120, yPos);
    doc.text(dueDate, 150, yPos);
    doc.text(status, 180, yPos);

    yPos += 6;
  });

  // Save PDF
  const filename = `payment-report-${Date.now()}.pdf`;
  doc.save(filename);
}

/**
 * Generate CSV report
 */
function generateCSVReport(data) {
  // CSV headers
  const headers = [
    'Tenant Name',
    'Email',
    'Property',
    'Room',
    'Amount',
    'Late Fee',
    'Due Date',
    'Paid Date',
    'Status',
    'Payment Method',
    'Reference Number',
    'Notes',
  ];

  // Convert data to CSV rows
  const rows = data.map(payment => [
    `${payment.boarder_first_name} ${payment.boarder_last_name}`,
    payment.boarder_email,
    payment.property_title,
    payment.room_title,
    payment.amount,
    payment.late_fee || 0,
    payment.due_date,
    payment.paid_date || '',
    payment.status,
    payment.payment_method || '',
    payment.reference_number || '',
    payment.notes || '',
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `payment-report-${Date.now()}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
    daily: 'Today',
    weekly: 'This Week',
    monthly: 'This Month',
    ytd: 'Year-to-Date',
  };
  return ranges[params.timeRange] || params.timeRange;
}
