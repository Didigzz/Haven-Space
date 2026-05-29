/**
 * Boarder Settings Page Logic
 */

import { getDisplayName, getAvatarUrl, fetchAndUpdateProfile } from '../../shared/profile-utils.js';
import CONFIG from '../../config.js';
import { viewPath } from '../../shared/routing.js';

/**
 * Initialize settings page
 */
export function initSettingsPage() {
  initSettingsTabs();
  initProfileForm();
  initNotificationSettings();
  initPasswordForm();
  initAvatarUpload();
  initLeavePropertyForm();
  loadAndDisplayProfile();
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('settings')) {
    initSettingsPage();
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAuthHeaders(json = true) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

async function loadAndDisplayProfile() {
  try {
    // Populate immediately from cache
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    populateProfileForm(currentUser);
    updateAvatarPreview(currentUser);

    // Fetch fresh data from API and repopulate
    const updatedUser = await fetchAndUpdateProfile(CONFIG.API_BASE_URL);
    if (updatedUser) {
      populateProfileForm(updatedUser);
      updateAvatarPreview(updatedUser);
    }
  } catch (error) {
    console.error('Error loading profile data:', error);
  }
}

function populateProfileForm(user) {
  if (!user) return;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== null) el.value = val;
  };
  set('first-name', user.first_name);
  set('last-name', user.last_name);
  set('email', user.email);
  set('phone', user.phone_number);
}

function updateAvatarPreview(user) {
  const avatarPreview = document.getElementById('profile-avatar-preview');
  if (avatarPreview && user) {
    avatarPreview.src = getAvatarUrl(user);
    avatarPreview.alt = `${getDisplayName(user)} Avatar`;
  }
}

function initProfileForm() {
  const profileForm = document.getElementById('profile-form');
  if (!profileForm) return;

  profileForm.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = profileForm.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const body = {
      first_name: document.getElementById('first-name')?.value?.trim(),
      last_name: document.getElementById('last-name')?.value?.trim(),
      phone_number: document.getElementById('phone')?.value?.trim() || null,
    };

    if (!body.first_name || !body.last_name) {
      showToast('First name and last name are required', 'error');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const phone = body.phone_number;
    if (phone && !isValidPhoneNumber(phone)) {
      showToast('Please enter a valid Philippine phone number (+63 9XX XXX XXXX)', 'error');
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        const existing = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...existing, ...data.user }));
        // Notify other components (sidebar, navbar) to update displayed name
        window.dispatchEvent(new CustomEvent('userProfileUpdated', { detail: data.user }));
        showToast('Profile updated successfully', 'success');
      } else {
        showToast(data.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      showToast('Failed to update profile', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function initAvatarUpload() {
  // Flag to prevent duplicate event listeners
  if (window.avatarUploadInitialized) return;
  window.avatarUploadInitialized = true;

  const changeAvatarBtn = document.getElementById('change-avatar-btn');
  const avatarInput = document.getElementById('avatar-input');
  const avatarPreview = document.getElementById('profile-avatar-preview');

  if (!changeAvatarBtn || !avatarInput || !avatarPreview) return;

  changeAvatarBtn.addEventListener('click', () => avatarInput.click());

  avatarInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be less than 2MB', 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    // Preview immediately
    const reader = new FileReader();
    reader.onload = ev => {
      avatarPreview.src = ev.target.result;
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${CONFIG.API_BASE_URL}/api/users/avatar`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        const existing = JSON.parse(localStorage.getItem('user') || '{}');
        existing.avatar_url = data.avatar_url;
        localStorage.setItem('user', JSON.stringify(existing));
        // Notify other components (sidebar, navbar) to update the avatar
        window.dispatchEvent(
          new CustomEvent('userProfileUpdated', { detail: { avatar_url: data.avatar_url } })
        );
        showToast('Profile photo updated', 'success');
      } else {
        showToast(data.error || 'Failed to upload photo', 'error');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      showToast('Failed to upload photo', 'error');
    }
  });
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function initSettingsTabs() {
  const tabs = document.querySelectorAll('.settings-tab');
  const panels = document.querySelectorAll('.settings-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById(`${tabName}-panel`);
      if (panel) panel.classList.add('active');
    });
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

function initNotificationSettings() {
  const saved = JSON.parse(localStorage.getItem('notification_preferences') || '{}');
  const toggles = document.querySelectorAll('.toggle-switch input[data-setting]');
  toggles.forEach(toggle => {
    const key = toggle.dataset.setting;
    if (key in saved) toggle.checked = saved[key];
  });

  const saveButton = document.getElementById('save-notifications');
  if (!saveButton) return;

  saveButton.addEventListener('click', () => {
    const preferences = {};
    toggles.forEach(toggle => {
      preferences[toggle.dataset.setting] = toggle.checked;
    });
    localStorage.setItem('notification_preferences', JSON.stringify(preferences));
    showToast('Notification preferences saved', 'success');
  });
}

// ─── Password ─────────────────────────────────────────────────────────────────

function initPasswordForm() {
  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async e => {
      e.preventDefault();
      const submitBtn = passwordForm.querySelector('[type="submit"]');

      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
      }
      if (newPassword.length < 8) {
        showToast('Password must be at least 8 characters', 'error');
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/auth/change-password`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        });

        const data = await res.json();
        if (res.ok) {
          showToast('Password updated successfully', 'success');
          passwordForm.reset();
        } else {
          showToast(data.error || 'Failed to update password', 'error');
        }
      } catch (err) {
        console.error('Password change error:', err);
        showToast('Failed to update password', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  const enable2faBtn = document.getElementById('enable-2fa');
  if (enable2faBtn) {
    enable2faBtn.addEventListener('click', () => {
      showToast('2FA setup coming soon', 'info');
    });
  }
}

// ─── Leave Property ───────────────────────────────────────────────────────────

function initLeavePropertyForm() {
  const leaveForm = document.getElementById('leave-property-form');
  const leaveReasonSelect = document.getElementById('leave-reason');
  const customReasonGroup = document.getElementById('custom-leave-reason-group');
  const customReasonTextarea = document.getElementById('custom-leave-reason');
  const leaveDateInput = document.getElementById('intended-leave-date');
  const confirmModal = document.getElementById('leave-confirmation-modal');
  const confirmReasonSpan = document.getElementById('confirm-leave-reason');
  const confirmDateSpan = document.getElementById('confirm-leave-date');
  const modalCloseBtn = document.getElementById('leave-modal-close-btn');
  const modalCancelBtn = document.getElementById('leave-modal-cancel-btn');
  const modalConfirmBtn = document.getElementById('leave-modal-confirm-btn');

  // Set minimum date to 30 days from today
  if (leaveDateInput) {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 30);
    leaveDateInput.min = minDate.toISOString().split('T')[0];
  }

  // Show/hide custom reason field
  if (leaveReasonSelect && customReasonGroup) {
    leaveReasonSelect.addEventListener('change', () => {
      if (leaveReasonSelect.value === 'Other') {
        customReasonGroup.style.display = 'block';
        customReasonTextarea.required = true;
      } else {
        customReasonGroup.style.display = 'none';
        customReasonTextarea.required = false;
        customReasonTextarea.value = '';
      }
    });
  }

  // Handle form submission
  if (leaveForm) {
    leaveForm.addEventListener('submit', e => {
      e.preventDefault();

      const reason = leaveReasonSelect?.value;
      const customReason = customReasonTextarea?.value?.trim();
      const leaveDate = leaveDateInput?.value;
      const leaveMessage = document.getElementById('leave-message')?.value?.trim();

      // Validate date is at least 30 days from today
      const selectedDate = new Date(leaveDate);
      const today = new Date();
      const minDate = new Date(today);
      minDate.setDate(today.getDate() + 30);

      if (selectedDate < minDate) {
        showToast('Please provide at least 30 days notice', 'error');
        return;
      }

      // Validate custom reason if "Other" is selected
      if (reason === 'Other' && !customReason) {
        showToast('Please specify your reason for leaving', 'error');
        return;
      }

      if (!leaveMessage) {
        showToast('Please write a message to your landlord', 'error');
        return;
      }

      // Store form data for confirmation
      const leaveData = {
        reason: reason === 'Other' ? customReason : reason,
        leave_date: leaveDate,
        message: leaveMessage,
      };

      // Show confirmation modal
      if (confirmReasonSpan && confirmDateSpan && confirmModal) {
        confirmReasonSpan.textContent = leaveData.reason;
        confirmDateSpan.textContent = new Date(leaveDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        confirmModal.classList.add('show');

        // Store data for final submission
        confirmModal.dataset.leaveData = JSON.stringify(leaveData);
      }
    });
  }

  // Close modal handlers
  const closeModal = () => {
    if (confirmModal) confirmModal.classList.remove('show');
  };

  modalCloseBtn?.addEventListener('click', closeModal);
  modalCancelBtn?.addEventListener('click', closeModal);
  confirmModal?.addEventListener('click', e => {
    if (e.target === confirmModal) closeModal();
  });

  // Confirm and submit leave request
  if (modalConfirmBtn) {
    modalConfirmBtn.addEventListener('click', async () => {
      const leaveData = JSON.parse(confirmModal.dataset.leaveData || '{}');

      modalConfirmBtn.disabled = true;
      const originalText = modalConfirmBtn.textContent;
      modalConfirmBtn.textContent = 'Sending...';

      try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/boarder/leave-request`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: JSON.stringify(leaveData),
        });

        const data = await res.json();

        if (res.ok) {
          showToast(
            'Leave request sent successfully. You can now search for a new room.',
            'success'
          );
          closeModal();
          leaveForm?.reset();

          // Update user data in localStorage to reflect that they are now searching for a new room
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          user.boarder_status = 'new';
          user.boarderStatus = 'new';
          localStorage.setItem('user', JSON.stringify(user));

          // Notify other components of the status change
          window.dispatchEvent(
            new CustomEvent('userStatusUpdated', {
              detail: { boarder_status: 'new' },
            })
          );

          // Redirect to find-a-room page after 2 seconds
          setTimeout(() => {
            window.location.href = viewPath('boarder/find-a-room/index.html');
          }, 2000);
        } else {
          showToast(data.error || 'Failed to send leave request', 'error');
        }
      } catch (err) {
        console.error('Leave request error:', err);
        showToast('Failed to send leave request', 'error');
      } finally {
        modalConfirmBtn.disabled = false;
        modalConfirmBtn.textContent = originalText;
      }
    });
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function isValidPhoneNumber(phone) {
  const patterns = [
    /^\+63\s?9\d{2}\s?\d{3}\s?\d{4}$/, // +63 9XX XXX XXXX
    /^09\d{2}\s?\d{3}\s?\d{4}$/, // 09XX XXX XXXX
    /^9\d{9}$/, // 9XXXXXXXXX
  ];
  return patterns.some(pattern => pattern.test(phone.replace(/\s/g, '')));
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .toast-success { background-color: #4a7c23; }
      .toast-error { background-color: #dc3545; }
      .toast-warning { background-color: #f59e0b; }
      .toast-info { background-color: #3b82f6; }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
