/**
 * Boarder Payments Data Module
 * Handles fetching and managing payment data from API
 */

import CONFIG from '../../config.js';

/**
 * Get current user ID
 */
function getCurrentUserId() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return parseInt(user.id || user.user_id || localStorage.getItem('user_id') || '3');
}

/**
 * Fetch payment overview data
 */
export async function fetchPaymentOverview() {
  try {
    const userId = getCurrentUserId();
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/overview`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
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
export async function fetchPaymentHistory() {
  try {
    const userId = getCurrentUserId();
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/payments/history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
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
 * Fetch current lease information
 */
export async function fetchLeaseInfo() {
  try {
    const userId = getCurrentUserId();
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/lease`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch lease info');
    }

    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error('Error fetching lease info:', error);
    return null;
  }
}

/**
 * Render payment overview cards
 */
export function renderPaymentOverview(data) {
  if (!data) return;

  // Update Total Paid card
  const totalPaidValue = document.querySelector('.financial-card-gradient-1 .financial-card-value');
  const totalPaidTrend = document.querySelector('.financial-card-gradient-1 .financial-card-trend');
  if (totalPaidValue && data.total_paid !== undefined) {
    totalPaidValue.textContent = `₱${formatCurrency(data.total_paid)}`;
  }
  if (totalPaidTrend && data.months_paid !== undefined) {
    totalPaidTrend.textContent = `${data.months_paid} months`;
  }

  // Update Next Payment card
  const nextPaymentValue = document.querySelector(
    '.financial-card-gradient-2 .financial-card-value'
  );
  const nextPaymentTrend = document.querySelector(
    '.financial-card-gradient-2 .financial-card-trend'
  );
  if (nextPaymentValue && data.next_payment_amount !== undefined) {
    nextPaymentValue.textContent = `₱${formatCurrency(data.next_payment_amount)}`;
  }
  if (nextPaymentTrend && data.days_until_due !== undefined) {
    nextPaymentTrend.textContent = `Due in ${data.days_until_due} days`;
  }

  // Update Utility Balance card
  const utilityValue = document.querySelector('.financial-card-gradient-3 .financial-card-value');
  const utilityTrend = document.querySelector('.financial-card-gradient-3 .financial-card-trend');
  if (utilityValue && data.utility_balance !== undefined) {
    utilityValue.textContent = `₱${formatCurrency(data.utility_balance)}`;
  }
  if (utilityTrend && data.utility_days_remaining !== undefined) {
    utilityTrend.textContent = `~${data.utility_days_remaining} days remaining`;
  }
}

/**
 * Render payment history timeline
 */
export function renderPaymentHistory(payments) {
  const timeline = document.querySelector('.timeline');
  if (!timeline || !payments || payments.length === 0) return;

  timeline.innerHTML = payments
    .map(payment => {
      const date = new Date(payment.payment_date || payment.due_date);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const isPaid = payment.status === 'paid';
      const statusClass = isPaid ? 'completed' : payment.status;

      return `
      <div class="timeline-item" data-due-date="${payment.due_date}" data-paid-date="${
        payment.payment_date || ''
      }">
        <div class="timeline-marker ${statusClass}"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h4 class="timeline-title">${payment.description || 'Monthly Rent'}</h4>
            <span class="timeline-amount">₱${formatCurrency(payment.amount)}</span>
          </div>
          <div class="timeline-meta">
            <span class="timeline-date">${formattedDate}</span>
            <span class="timeline-status ${statusClass}">${payment.status}</span>
          </div>
          ${
            payment.payment_method
              ? `
            <div class="timeline-details">
              <span class="timeline-method">${payment.payment_method}</span>
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
 * Render lease information in dashboard
 */
export function renderLeaseInfo(lease) {
  if (!lease) return;

  // Update greeting with property name
  const greeting = document.querySelector('.boarder-greeting h1');
  if (greeting && lease.property_name && lease.room_number) {
    greeting.textContent = `Welcome home to ${lease.property_name}, Room ${lease.room_number}`;
  }

  // Update lease period stat
  const leasePeriodValue = document.querySelector(
    '.boarder-stat-card:nth-child(3) .boarder-stat-value'
  );
  const leasePeriodDesc = document.querySelector(
    '.boarder-stat-card:nth-child(3) .boarder-stat-description'
  );

  if (leasePeriodValue && lease.current_month && lease.total_months) {
    leasePeriodValue.textContent = `Month ${lease.current_month} / ${lease.total_months}`;
  }

  if (leasePeriodDesc && lease.end_date) {
    const endDate = new Date(lease.end_date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
    leasePeriodDesc.textContent = `Next Renewal: ${endDate}`;
  }

  // Update outstanding balance
  const balanceValue = document.querySelector('.boarder-stat-card:first-child .boarder-stat-value');
  if (balanceValue && lease.outstanding_balance !== undefined) {
    balanceValue.textContent = `₱${formatCurrency(lease.outstanding_balance)}`;
  }

  // Update utilities
  const utilitiesValue = document.querySelector(
    '.boarder-stat-card:nth-child(2) .boarder-stat-value'
  );
  const utilitiesDesc = document.querySelector(
    '.boarder-stat-card:nth-child(2) .boarder-stat-description'
  );

  if (utilitiesValue && lease.current_utilities !== undefined) {
    utilitiesValue.textContent = `₱${formatCurrency(lease.current_utilities)}`;
  }

  if (utilitiesDesc && lease.electricity_cost !== undefined && lease.water_cost !== undefined) {
    utilitiesDesc.textContent = `Electricity: ₱${formatCurrency(
      lease.electricity_cost
    )} | Water: ₱${formatCurrency(lease.water_cost)}`;
  }

  // Update next payment
  const nextPaymentValue = document.querySelector(
    '.boarder-stat-card:nth-child(4) .boarder-stat-value'
  );
  const nextPaymentDesc = document.querySelector(
    '.boarder-stat-card:nth-child(4) .boarder-stat-description'
  );

  if (nextPaymentValue && lease.days_until_payment !== undefined) {
    nextPaymentValue.textContent = `${lease.days_until_payment} Days Left`;
  }

  if (nextPaymentDesc && lease.next_payment_amount && lease.next_payment_date) {
    const paymentDate = new Date(lease.next_payment_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    nextPaymentDesc.textContent = `₱${formatCurrency(
      lease.next_payment_amount
    )} due on ${paymentDate}`;
  }
}

/**
 * Render payment cards in dashboard
 */
export function renderDashboardPayments(payments) {
  const paymentList = document.querySelector('.boarder-payment-simple-list');
  if (!paymentList || !payments || payments.length === 0) return;

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

      const period =
        index === 0
          ? 'Current Month'
          : index === 1
          ? 'Previous Month'
          : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (isCurrent) {
        const daysLeft = Math.ceil(
          (new Date(payment.due_date) - new Date()) / (1000 * 60 * 60 * 24)
        );
        return `
        <div class="boarder-payment-simple-card current">
          <div class="boarder-payment-simple-header">
            <span class="boarder-payment-period">${period}</span>
            <span class="boarder-payment-status-badge unpaid">Unpaid</span>
          </div>
          <div class="boarder-payment-simple-body">
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Amount</span>
              <span class="boarder-payment-value">₱${formatCurrency(payment.amount)}</span>
            </div>
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Due Date</span>
              <span class="boarder-payment-value">${formattedDate}</span>
            </div>
            <div class="boarder-payment-row">
              <span class="boarder-payment-label">Days Left</span>
              <span class="boarder-payment-value highlight">${daysLeft} days</span>
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
