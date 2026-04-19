/**
 * Landlord Onboarding Page
 * Guides new landlords through initial setup
 */

import { getIcon } from '../../shared/icons.js';
import { getBasePath } from '../../shared/routing.js';

/**
 * Inject icons from centralized library
 */
function injectIcons() {
  const iconElements = document.querySelectorAll('[data-icon]');
  iconElements.forEach(element => {
    const iconName = element.dataset.icon;
    const options = {
      width: element.dataset.iconWidth || 24,
      height: element.dataset.iconHeight || 24,
      strokeWidth: element.dataset.iconStrokeWidth || '1.5',
      className: element.dataset.iconClass || '',
    };
    element.innerHTML = getIcon(iconName, options);
  });
}

/**
 * Check if user has completed various setup steps
 */
async function checkSetupProgress() {
  try {
    // This would typically check the user's current setup status
    // For now, we'll assume they're starting fresh
    const progress = {
      hasProperty: false,
      hasRooms: false,
      hasPaymentMethods: false,
      profileComplete: false,
    };

    updateChecklistUI(progress);
  } catch (error) {
    console.error('Error checking setup progress:', error);
  }
}

/**
 * Update the checklist UI based on progress
 * @param {Object} progress - Progress object with completion status
 */
function updateChecklistUI(progress) {
  const propertyItem = document.querySelector('[data-step="property"]');
  const roomsItem = document.querySelector('[data-step="rooms"]');
  const paymentItem = document.querySelector('[data-step="payment"]');
  const profileItem = document.querySelector('[data-step="profile"]');

  // Update property step
  if (progress.hasProperty) {
    propertyItem.classList.add('completed');
    const btn = propertyItem.querySelector('.checklist-btn');
    btn.textContent = 'View Properties';
    btn.classList.remove('primary');
    btn.classList.add('secondary');
  }

  // Update rooms step
  if (progress.hasProperty) {
    const roomsBtn = roomsItem.querySelector('.checklist-btn');
    roomsBtn.disabled = false;
    roomsBtn.innerHTML = `
      <span data-icon="plus" data-icon-width="20" data-icon-height="20"></span>
      Add Rooms
    `;
    injectIcons();
  }

  // Update payment step
  if (progress.hasPaymentMethods) {
    paymentItem.classList.add('completed');
    const btn = paymentItem.querySelector('.checklist-btn');
    btn.textContent = 'Manage Payment Methods';
  }

  // Update profile step
  if (progress.profileComplete) {
    profileItem.classList.add('completed');
    const btn = profileItem.querySelector('.checklist-btn');
    btn.textContent = 'View Profile';
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Create Property button
  const createPropertyBtn = document.getElementById('createPropertyBtn');
  if (createPropertyBtn) {
    createPropertyBtn.addEventListener('click', () => {
      const basePath = getBasePath();
      window.location.href = `${basePath}landlord/create-listing.html`;
    });
  }

  // Setup Payment button
  const setupPaymentBtn = document.getElementById('setupPaymentBtn');
  if (setupPaymentBtn) {
    setupPaymentBtn.addEventListener('click', () => {
      const basePath = getBasePath();
      window.location.href = `${basePath}landlord/landlord-settings.html#payment-methods`;
    });
  }

  // Complete Profile button
  const completeProfileBtn = document.getElementById('completeProfileBtn');
  if (completeProfileBtn) {
    completeProfileBtn.addEventListener('click', () => {
      const basePath = getBasePath();
      window.location.href = `${basePath}landlord/landlord-settings.html#profile`;
    });
  }

  // Help Center button
  const helpCenterBtn = document.getElementById('helpCenterBtn');
  if (helpCenterBtn) {
    helpCenterBtn.addEventListener('click', e => {
      e.preventDefault();
      showHelpModal();
    });
  }

  // Skip Onboarding button
  const skipOnboardingBtn = document.getElementById('skipOnboardingBtn');
  if (skipOnboardingBtn) {
    skipOnboardingBtn.addEventListener('click', () => {
      const basePath = getBasePath();
      window.location.href = `${basePath}landlord/index.html`;
    });
  }
}

/**
 * Show help modal with getting started information
 */
function showHelpModal() {
  const modal = document.createElement('div');
  modal.className = 'help-modal-overlay';
  modal.innerHTML = `
    <div class="help-modal">
      <div class="help-modal-header">
        <h2>Getting Started Guide</h2>
        <button class="help-modal-close" aria-label="Close help">
          ${getIcon('xMark', { width: 24, height: 24, strokeWidth: '2' })}
        </button>
      </div>
      <div class="help-modal-content">
        <div class="help-section">
          <h3>
            ${getIcon('home', { width: 20, height: 20 })}
            Creating Your First Property
          </h3>
          <p>Start by adding your boarding house or rental property. Include:</p>
          <ul>
            <li>Clear, high-quality photos of all areas</li>
            <li>Detailed description of amenities and features</li>
            <li>Accurate location and contact information</li>
            <li>House rules and policies</li>
          </ul>
        </div>
        
        <div class="help-section">
          <h3>
            ${getIcon('squares2x2', { width: 20, height: 20 })}
            Setting Up Rooms
          </h3>
          <p>Add individual rooms with specific details:</p>
          <ul>
            <li>Room type (single, shared, private bathroom)</li>
            <li>Monthly rent and deposit requirements</li>
            <li>Room-specific photos and amenities</li>
            <li>Availability dates</li>
          </ul>
        </div>
        
        <div class="help-section">
          <h3>
            ${getIcon('users', { width: 20, height: 20 })}
            Managing Applications
          </h3>
          <p>When boarders apply to your rooms:</p>
          <ul>
            <li>Review applications promptly (within 24 hours)</li>
            <li>Communicate clearly about requirements</li>
            <li>Schedule property viewings when possible</li>
            <li>Keep your calendar updated</li>
          </ul>
        </div>
        
        <div class="help-section">
          <h3>
            ${getIcon('shield', { width: 20, height: 20 })}
            Safety & Verification
          </h3>
          <p>Haven Space helps ensure safety:</p>
          <ul>
            <li>All landlords go through identity verification</li>
            <li>Boarders provide valid IDs and references</li>
            <li>Secure messaging system for communication</li>
            <li>Report any suspicious activity to our team</li>
          </ul>
        </div>
      </div>
      <div class="help-modal-footer">
        <button class="help-modal-btn primary">Got it, thanks!</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add animation
  setTimeout(() => {
    modal.classList.add('help-modal-overlay-visible');
  }, 10);

  // Setup close handlers
  const closeBtn = modal.querySelector('.help-modal-close');
  const gotItBtn = modal.querySelector('.help-modal-btn');

  const closeModal = () => {
    modal.classList.remove('help-modal-overlay-visible');
    setTimeout(() => {
      modal.remove();
    }, 200);
  };

  closeBtn.addEventListener('click', closeModal);
  gotItBtn.addEventListener('click', closeModal);

  // Close on backdrop click
  modal.addEventListener('click', e => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

/**
 * Initialize the onboarding page
 */
document.addEventListener('DOMContentLoaded', () => {
  // Inject icons
  injectIcons();

  // Setup event listeners
  setupEventListeners();

  // Check setup progress
  checkSetupProgress();

  // Show welcome animation
  setTimeout(() => {
    document.querySelector('.onboarding-header').classList.add('animate-in');
  }, 100);
});
