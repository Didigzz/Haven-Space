/**
 * Payment Export Module
 * Handles export report functionality with multiple formats and filters
 * Enhanced with email delivery, Excel export, and professional templates
 */

import CONFIG from '../../config.js';
import { getAuthHeaders } from '../../shared/state.js';
import * as XLSX from 'xlsx';

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
                  <input type="radio" name="outputFormat" value="excel" />
                  <span>Excel (Spreadsheet)</span>
                </label>
                <label class="export-radio-label">
                  <input type="radio" name="outputFormat" value="csv" />
                  <span>CSV (Data Export)</span>
                </label>
                <label class="export-radio-label">
                  <input type="radio" name="outputFormat" value="email" />
                  <span>Email to Me</span>
                </label>
                <label class="export-radio-label">
                  <input type="radio" name="outputFormat" value="preview" />
                  <span>Preview in Browser</span>
                </label>
              </div>
            </div>

            <!-- Email Options (shown when email format is selected) -->
            <div class="export-section" id="emailOptions" style="display: none;">
              <h4 class="export-section-title">Email Options</h4>
              <div class="export-filter-group">
                <label for="emailRecipient">Recipient Email</label>
                <input type="email" id="emailRecipient" class="export-input" placeholder="your@email.com" />
              </div>
              <div class="export-filter-group">
                <label for="emailSubject">Subject</label>
                <input type="text" id="emailSubject" class="export-input" value="Payment Statement Report" />
              </div>
              <div class="export-filter-group">
                <label for="emailMessage">Message (Optional)</label>
                <textarea id="emailMessage" class="export-input" rows="3" placeholder="Add a custom message..."></textarea>
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

  // Toggle email options
  const outputFormatInputs = modal.querySelectorAll('input[name="outputFormat"]');
  const emailOptions = modal.querySelector('#emailOptions');
  const emailRecipient = modal.querySelector('#emailRecipient');

  // Pre-fill email with user's email
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.email && emailRecipient) {
    emailRecipient.value = user.email;
  }

  outputFormatInputs.forEach(input => {
    input.addEventListener('change', e => {
      if (e.target.value === 'email') {
        emailOptions.style.display = 'block';
      } else {
        emailOptions.style.display = 'none';
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
      case 'excel':
        await generateExcelReport(data, params);
        break;
      case 'csv':
        generateCSVReport(data, params);
        break;
      case 'email':
        await sendEmailReport(data, params, modal);
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

  // Add email options if email format is selected
  if (outputFormat === 'email') {
    params.emailRecipient = modal.querySelector('#emailRecipient')?.value;
    params.emailSubject = modal.querySelector('#emailSubject')?.value;
    params.emailMessage = modal.querySelector('#emailMessage')?.value;
  }

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
  // Check if jsPDF is available
  if (typeof window.jspdf === 'undefined') {
    alert('PDF library not loaded. Please refresh the page and try again.');
    return;
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
 * Generate Excel report
 * Uses SheetJS library for Excel generation
 */
async function generateExcelReport(data, params) {
  // Check if SheetJS is available
  if (typeof XLSX === 'undefined') {
    // Fallback to CSV if SheetJS is not available
    console.warn('SheetJS library not loaded. Falling back to CSV export.');
    generateCSVReport(data, params);
    return;
  }

  try {
    const summary = calculateSummary(data);

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Haven Space - Payment Statement Report'],
      [],
      ['Report Type:', formatReportType(params.reportType)],
      ['Time Range:', formatTimeRange(params)],
      ['Generated:', new Date().toLocaleString('en-PH')],
      [],
      ['Summary Statistics'],
      ['Total Payments:', summary.totalCount],
      [
        'Total Amount:',
        `₱${summary.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      ],
      ['Paid Count:', summary.paidCount],
      [
        'Paid Amount:',
        `₱${summary.paidAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      ],
      ['Pending Count:', summary.pendingCount],
      [
        'Pending Amount:',
        `₱${summary.pendingAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      ],
      ['Overdue Count:', summary.overdueCount],
      [
        'Overdue Amount:',
        `₱${summary.overdueAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      ],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Payments detail sheet
    const paymentsData = [
      [
        'Tenant Name',
        'Email',
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
        'Notes',
      ],
    ];

    data.forEach(payment => {
      const amount = parseFloat(payment.amount);
      const lateFee = parseFloat(payment.late_fee || 0);
      const total = amount + lateFee;

      paymentsData.push([
        `${payment.boarder_first_name} ${payment.boarder_last_name}`,
        payment.boarder_email,
        payment.property_title,
        payment.room_title,
        amount,
        lateFee,
        total,
        payment.due_date,
        payment.paid_date || '',
        payment.status.charAt(0).toUpperCase() + payment.status.slice(1),
        payment.payment_method || '',
        payment.reference_number || '',
        payment.notes || '',
      ]);
    });

    const wsPayments = XLSX.utils.aoa_to_sheet(paymentsData);

    // Set column widths
    wsPayments['!cols'] = [
      { wch: 20 }, // Tenant Name
      { wch: 25 }, // Email
      { wch: 25 }, // Property
      { wch: 15 }, // Room
      { wch: 12 }, // Amount
      { wch: 10 }, // Late Fee
      { wch: 12 }, // Total
      { wch: 12 }, // Due Date
      { wch: 12 }, // Paid Date
      { wch: 10 }, // Status
      { wch: 15 }, // Payment Method
      { wch: 20 }, // Reference Number
      { wch: 30 }, // Notes
    ];

    XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments');

    // Generate and download
    const filename = `payment-statement-${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);

    showToast('Excel report generated successfully!', 'success');
  } catch (error) {
    console.error('Excel generation failed:', error);
    alert('Failed to generate Excel report. Please try CSV export instead.');
  }
}

/**
 * Send email report
 */
async function sendEmailReport(data, params) {
  // Validate email
  if (!params.emailRecipient) {
    alert('Please enter a recipient email address');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(params.emailRecipient)) {
    alert('Please enter a valid email address');
    return;
  }

  try {
    const summary = calculateSummary(data);

    // Prepare email data
    const emailData = {
      recipient: params.emailRecipient,
      subject: params.emailSubject || 'Payment Statement Report',
      message: params.emailMessage || '',
      reportType: params.reportType,
      timeRange: formatTimeRange(params),
      summary: {
        totalCount: summary.totalCount,
        totalAmount: summary.totalAmount,
        paidCount: summary.paidCount,
        paidAmount: summary.paidAmount,
        pendingCount: summary.pendingCount,
        pendingAmount: summary.pendingAmount,
        overdueCount: summary.overdueCount,
        overdueAmount: summary.overdueAmount,
      },
      payments: data.map(payment => ({
        tenant: `${payment.boarder_first_name} ${payment.boarder_last_name}`,
        email: payment.boarder_email,
        property: payment.property_title,
        room: payment.room_title,
        amount: parseFloat(payment.amount) + parseFloat(payment.late_fee || 0),
        dueDate: payment.due_date,
        paidDate: payment.paid_date,
        status: payment.status,
      })),
    };

    // Send to backend
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/payments/email-report`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send email');
    }

    showToast(`Report sent successfully to ${params.emailRecipient}!`, 'success');
  } catch (error) {
    console.error('Email send failed:', error);
    alert(`Failed to send email: ${error.message}`);
    throw error;
  }
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
    daily: 'Today',
    weekly: 'This Week',
    monthly: 'This Month',
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
