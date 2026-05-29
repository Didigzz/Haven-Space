/**
 * Onboarding Checklist Component
 *
 * Displays a guided checklist overlay for boarders after their application
 * is accepted by a landlord. Helps them complete essential setup steps.
 */

import CONFIG from '../config.ts';

class OnboardingChecklist {
  constructor() {
    this.overlay = null;
    this.banner = null;
    this.checklistData = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the onboarding checklist
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Fetch onboarding status from API
      const status = await this.fetchOnboardingStatus();

      if (!status || !status.show_onboarding) {
        // Show banner if dismissed but not completed
        if (status && status.dismissed_at && !this.isFullyCompleted(status.checklist)) {
          this.showBanner(status.checklist);
        }
        return;
      }

      this.checklistData = status.checklist;
      this.createOverlay();
      this.showOverlay();
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing onboarding checklist:', error);
    }
  }

  /**
   * Fetch onboarding status from API
   */
  async fetchOnboardingStatus() {
    const token = localStorage.getItem('token');
    const userId = this.getCurrentUserId();

    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/onboarding-status`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch onboarding status');
    }

    return await response.json();
  }

  /**
   * Update onboarding status
   */
  async updateOnboardingStatus(action) {
    const token = localStorage.getItem('token');
    const userId = this.getCurrentUserId();

    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/update-onboarding`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      throw new Error('Failed to update onboarding status');
    }

    return await response.json();
  }

  /**
   * Create the overlay HTML
   */
  createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.innerHTML = `
      <div class="onboarding-modal" role="dialog" aria-labelledby="onboarding-title" aria-modal="true">
        <div class="onboarding-header">
          <div class="onboarding-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 id="onboarding-title" class="onboarding-title">Welcome to Your New Home!</h2>
          <p class="onboarding-subtitle">
            Your application has been accepted! Complete these steps to get started with your tenancy.
          </p>
        </div>

        <div class="onboarding-body">
          <ul class="onboarding-checklist">
            ${this.renderChecklistItems()}
          </ul>

          <div class="onboarding-progress">
            <div class="onboarding-progress-label">
              <span>Progress</span>
              <span><strong>${this.getCompletedCount()}</strong> of ${this.getTotalCount()} completed</span>
            </div>
            <div class="onboarding-progress-bar">
              <div class="onboarding-progress-fill" style="width: ${this.getProgressPercentage()}%"></div>
            </div>
          </div>
        </div>

        <div class="onboarding-footer">
          <button class="onboarding-btn onboarding-btn-secondary" data-action="dismiss">
            I'll do this later
          </button>
          <button class="onboarding-btn onboarding-btn-primary" data-action="continue" ${
            this.isFullyCompleted(this.checklistData) ? '' : 'disabled'
          }>
            Continue to Dashboard
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;

    // Add event listeners
    this.attachEventListeners();
  }

  /**
   * Render checklist items
   */
  renderChecklistItems() {
    const items = [
      {
        id: 'application_accepted',
        title: 'Application Accepted',
        description: 'Your landlord has approved your application',
        badge: null,
        locked: false,
        action: null,
      },
      {
        id: 'payment_method_added',
        title: 'Add Payment Method',
        description: 'Set up your payment method for rent and utilities',
        badge: 'required',
        locked: false,
        action: './settings/index.html#payment-methods',
      },

      {
        id: 'house_rules_read',
        title: 'Read House Rules',
        description: 'Review and acknowledge the property rules',
        badge: 'required',
        locked: false,
        action: './house-rules/index.html',
      },
    ];

    return items
      .map(item => {
        const isCompleted = this.checklistData[item.id];
        const isLocked = item.locked;

        return `
        <li class="onboarding-checklist-item ${isCompleted ? 'completed' : ''} ${
          isLocked ? 'locked' : ''
        }"
            data-item-id="${item.id}"
            ${item.action && !isCompleted ? `data-action="${item.action}"` : ''}>
          <div class="onboarding-checkbox">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="onboarding-item-content">
            <h3 class="onboarding-item-title">
              ${item.title}
              ${
                item.badge
                  ? `<span class="onboarding-item-badge ${item.badge}">${item.badge}</span>`
                  : ''
              }
            </h3>
            <p class="onboarding-item-description">${item.description}</p>
          </div>
        </li>
      `;
      })
      .join('');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.overlay) return;

    // Dismiss button
    const dismissBtn = this.overlay.querySelector('[data-action="dismiss"]');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.handleDismiss());
    }

    // Continue button
    const continueBtn = this.overlay.querySelector('[data-action="continue"]');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => this.handleContinue());
    }

    // Checklist item clicks
    const items = this.overlay.querySelectorAll('.onboarding-checklist-item[data-action]');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        if (action) {
          window.location.href = action;
        }
      });
    });

    // Prevent closing by clicking overlay background
    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) {
        // Don't close - require explicit action
      }
    });
  }

  /**
   * Handle dismiss action
   */
  async handleDismiss() {
    try {
      await this.updateOnboardingStatus('dismiss');
      this.hideOverlay();
      this.showBanner(this.checklistData);
    } catch (error) {
      console.error('Error dismissing onboarding:', error);
    }
  }

  /**
   * Handle continue action
   */
  async handleContinue() {
    try {
      await this.updateOnboardingStatus('complete');
      this.hideOverlay();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }

  /**
   * Show the overlay
   */
  showOverlay() {
    if (this.overlay) {
      this.overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Hide the overlay
   */
  hideOverlay() {
    if (this.overlay) {
      this.overlay.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  /**
   * Show persistent banner
   */
  showBanner(checklist) {
    // Remove existing banner if any
    const existingBanner = document.querySelector('.onboarding-banner');
    if (existingBanner) {
      existingBanner.remove();
    }

    const completedCount = this.getCompletedCountFromChecklist(checklist);
    const totalCount = this.getTotalCountFromChecklist(checklist);

    if (completedCount === totalCount) {
      return; // Don't show banner if everything is completed
    }

    const banner = document.createElement('div');
    banner.className = 'onboarding-banner';
    banner.innerHTML = `
      <div class="onboarding-banner-content">
        <div class="onboarding-banner-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="onboarding-banner-text">
          <h3 class="onboarding-banner-title">Complete Your Setup</h3>
          <p class="onboarding-banner-description">
            ${completedCount} of ${totalCount} steps completed. Finish setup to unlock all features.
          </p>
        </div>
      </div>
      <button class="onboarding-banner-action" data-action="reopen">
        Continue Setup
      </button>
    `;

    // Insert banner at the top of content area
    const contentArea = document.querySelector('.boarder-content');
    if (contentArea) {
      contentArea.insertBefore(banner, contentArea.firstChild);
    }

    this.banner = banner;

    // Add event listener to reopen overlay
    const reopenBtn = banner.querySelector('[data-action="reopen"]');
    if (reopenBtn) {
      reopenBtn.addEventListener('click', async () => {
        // Refresh status and show overlay
        const status = await this.fetchOnboardingStatus();
        this.checklistData = status.checklist;
        this.createOverlay();
        this.showOverlay();
        banner.remove();
      });
    }
  }

  /**
   * Get completed count
   */
  getCompletedCount() {
    if (!this.checklistData) return 0;
    return Object.values(this.checklistData).filter(Boolean).length;
  }

  /**
   * Get total count
   */
  getTotalCount() {
    if (!this.checklistData) return 4;
    return Object.keys(this.checklistData).length;
  }

  /**
   * Get completed count from checklist object
   */
  getCompletedCountFromChecklist(checklist) {
    if (!checklist) return 0;
    return Object.values(checklist).filter(Boolean).length;
  }

  /**
   * Get total count from checklist object
   */
  getTotalCountFromChecklist(checklist) {
    if (!checklist) return 4;
    return Object.keys(checklist).length;
  }

  /**
   * Get progress percentage
   */
  getProgressPercentage() {
    const completed = this.getCompletedCount();
    const total = this.getTotalCount();
    return Math.round((completed / total) * 100);
  }

  /**
   * Check if checklist is fully completed
   */
  isFullyCompleted(checklist) {
    if (!checklist) return false;
    // Required items: application_accepted, payment_method_added, house_rules_read
    return (
      checklist.application_accepted && checklist.payment_method_added && checklist.house_rules_read
    );
  }

  /**
   * Get current user ID
   */
  getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return parseInt(user.id || user.user_id || localStorage.getItem('user_id') || '0');
  }
}

// Export singleton instance
const onboardingChecklist = new OnboardingChecklist();
export default onboardingChecklist;
