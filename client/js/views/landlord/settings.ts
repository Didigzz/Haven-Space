/**
 * Landlord Settings Page Logic
 */

import { getDisplayName, getAvatarUrl, fetchAndUpdateProfile } from '../../shared/profile-utils.ts';
import CONFIG from '../../config.ts';

/**
 * Initialize settings page
 */
export function initLandlordSettings() {
  initSettingsTabs();
  initProfileForm();
  initNotificationSettings();
  initPasswordForm();
  initAvatarUpload();
  initWelcomeMessageEditor();
  initPaymentMethods();
  loadAndDisplayProfile();
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('settings')) {
    initLandlordSettings();
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAuthHeaders(json = true) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

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

// ─── Profile ─────────────────────────────────────────────────────────────────

async function loadAndDisplayProfile() {
  try {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    populateProfileForm(currentUser);
    updateAvatarPreview(currentUser);

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
      phone_number: document.getElementById('phone')?.value?.trim(),
    };

    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        // Update localStorage with fresh data
        const existing = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...existing, ...data.user }));
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
        // Update localStorage
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

// ─── Notifications ────────────────────────────────────────────────────────────

function initNotificationSettings() {
  // Load saved preferences from localStorage
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

// ─── Welcome Message ──────────────────────────────────────────────────────────

function initWelcomeMessageEditor() {
  const textarea = document.getElementById('welcome-message-textarea');
  const charCount = document.getElementById('char-count');
  const previewBtn = document.getElementById('preview-message-btn');
  const saveBtn = document.getElementById('save-message-btn');
  const selectFileBtn = document.getElementById('select-file-btn');
  const fileInput = document.getElementById('house-rules-file');
  const filePreview = document.getElementById('file-preview');
  const fileNameDisplay = document.getElementById('file-name-display');
  const fileSizeDisplay = document.getElementById('file-size-display');
  const removeFileBtn = document.getElementById('remove-file-btn');

  let selectedFile = null;

  loadWelcomeSettings();

  if (textarea && charCount) {
    textarea.addEventListener('input', () => {
      charCount.textContent = textarea.value.length;
    });
  }

  if (selectFileBtn && fileInput) {
    selectFileBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        showToast('File must be less than 10MB', 'error');
        fileInput.value = '';
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(file.type)) {
        showToast('Only PDF, DOC, and DOCX files are allowed', 'error');
        fileInput.value = '';
        return;
      }

      selectedFile = file;
      displayFilePreview(file);
    });
  }

  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
      selectedFile = null;
      if (fileInput) fileInput.value = '';
      if (filePreview) filePreview.style.display = 'none';
    });
  }

  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const message = textarea?.value || '';
      const previewMessage = replaceVariables(message);
      showToast(
        'Preview: ' + previewMessage.substring(0, 100) + (previewMessage.length > 100 ? '...' : ''),
        'info'
      );
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const message = textarea?.value || '';
      if (!message.trim()) {
        showToast('Please enter a welcome message', 'error');
        return;
      }
      await saveWelcomeSettings(message, selectedFile);
    });
  }

  function displayFilePreview(file) {
    if (fileNameDisplay && fileSizeDisplay && filePreview) {
      fileNameDisplay.textContent = file.name;
      fileSizeDisplay.textContent = formatFileSize(file.size);
      filePreview.style.display = 'flex';
    }
  }

  function replaceVariables(message) {
    return message
      .replace(/{boarder_name}/g, 'John')
      .replace(/{house_name}/g, 'Sample Boarding House')
      .replace(/{move_in_date}/g, new Date().toLocaleDateString())
      .replace(/{room_number}/g, 'TBD');
  }
}

async function loadWelcomeSettings() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/welcome-settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) return;

    const data = await res.json();
    const textarea = document.getElementById('welcome-message-textarea');
    const charCount = document.getElementById('char-count');
    const filePreview = document.getElementById('file-preview');
    const fileNameDisplay = document.getElementById('file-name-display');
    const fileSizeDisplay = document.getElementById('file-size-display');

    if (data.data && textarea) {
      textarea.value = data.data.welcome_message || '';
      if (charCount) charCount.textContent = textarea.value.length;

      if (data.data.house_rules_file_name && filePreview && fileNameDisplay && fileSizeDisplay) {
        fileNameDisplay.textContent = data.data.house_rules_file_name;
        fileSizeDisplay.textContent = formatFileSize(data.data.house_rules_file_size || 0);
        filePreview.style.display = 'flex';
      }
    }
  } catch (error) {
    console.error('Failed to load welcome settings:', error);
  }
}

async function saveWelcomeSettings(message, file) {
  try {
    const formData = new FormData();
    formData.append('welcome_message', message);
    if (file) formData.append('house_rules_file', file);

    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/welcome-settings`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      showToast('Welcome message saved successfully', 'success');
    } else {
      showToast(data.error || 'Failed to save settings', 'error');
    }
  } catch (error) {
    console.error('Failed to save welcome settings:', error);
    showToast('Failed to save settings', 'error');
  }
}

// ─── Documents ────────────────────────────────────────────────────────────────

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

// ─── Payment Methods ──────────────────────────────────────────────────────────

let currentEditingPaymentMethodId = null;
let paymentMethodCloseModal = null; // Global reference to closeModal function

function initPaymentMethods() {
  const addBtn = document.getElementById('add-payment-method-btn');
  const modal = document.getElementById('payment-method-modal');
  const closeBtn = document.getElementById('payment-method-modal-close-btn');
  const cancelBtn = document.getElementById('payment-method-modal-cancel-btn');
  const submitBtn = document.getElementById('payment-method-modal-submit-btn');
  const methodTypeSelect = document.getElementById('payment-method-type');
  const bankNameGroup = document.getElementById('payment-bank-name-group');
  const accountHint = document.getElementById('payment-account-hint');

  const openModal = (paymentMethod = null) => {
    if (modal) {
      modal.classList.add('active');
      const modalTitle = document.getElementById('payment-method-modal-title');

      if (paymentMethod) {
        // Edit mode
        currentEditingPaymentMethodId = paymentMethod.id;
        if (modalTitle) modalTitle.textContent = 'Edit Payment Method';
        document.getElementById('payment-method-type').value = paymentMethod.methodType;
        document.getElementById('payment-account-name').value = paymentMethod.accountName;
        document.getElementById('payment-account-number').value = paymentMethod.accountNumberMasked;
        document.getElementById('payment-is-primary').checked = paymentMethod.isPrimary;
        if (paymentMethod.bankName) {
          document.getElementById('payment-bank-name').value = paymentMethod.bankName;
        }
        // Trigger change to show/hide bank name field
        methodTypeSelect.dispatchEvent(new Event('change'));
      } else {
        // Add mode
        currentEditingPaymentMethodId = null;
        if (modalTitle) modalTitle.textContent = 'Add Payment Method';
        document.getElementById('payment-method-form').reset();
      }
    }
  };

  const closeModal = () => {
    if (modal) {
      modal.classList.remove('active');
      // Wait for CSS transition to finish before resetting form
      setTimeout(() => {
        document.getElementById('payment-method-form').reset();
        currentEditingPaymentMethodId = null;
      }, 300);
    }
  };

  // Store closeModal function globally so savePaymentMethod can access it
  paymentMethodCloseModal = closeModal;

  addBtn?.addEventListener('click', () => openModal());
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // Close on backdrop click
  modal?.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal?.classList.contains('active')) {
      closeModal();
    }
  });

  // Show/hide bank name field based on payment method type
  methodTypeSelect?.addEventListener('change', e => {
    const methodType = e.target.value;
    if (methodType === 'Bank Transfer') {
      bankNameGroup.style.display = 'block';
      document.getElementById('payment-bank-name').required = true;
      accountHint.textContent = 'Enter your bank account number';
    } else {
      bankNameGroup.style.display = 'none';
      document.getElementById('payment-bank-name').required = false;
      if (methodType === 'GCash' || methodType === 'PayMaya') {
        accountHint.textContent = 'Enter your mobile number (e.g., 09123456789)';
      } else {
        accountHint.textContent = 'Enter your account number';
      }
    }
  });

  submitBtn?.addEventListener('click', async e => {
    e.preventDefault();
    await savePaymentMethod();
  });

  // Load payment methods on init
  loadPaymentMethods();

  // Expose openModal for edit functionality
  window.openPaymentMethodModal = openModal;
}

async function loadPaymentMethods() {
  const container = document.getElementById('payment-methods-list');
  if (!container) return;

  container.innerHTML = '<div class="loading-state">Loading payment methods...</div>';

  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id;

    if (!userId) {
      container.innerHTML = '<div class="empty-state">Unable to load payment methods.</div>';
      return;
    }

    const res = await fetch(
      `${CONFIG.API_BASE_URL}/api/landlord/payment-methods?userId=${userId}`,
      {
        method: 'GET',
        headers: getAuthHeaders(false),
        credentials: 'include',
      }
    );

    const data = await res.json();

    if (!res.ok) {
      container.innerHTML = '<div class="empty-state">Failed to load payment methods.</div>';
      return;
    }

    const methods = data.data || [];

    if (methods.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No payment methods added yet.</p>
          <p style="font-size: 14px; color: var(--text-gray); margin-top: 8px;">
            Add a payment method so boarders know how to pay you.
          </p>
        </div>
      `;
      return;
    }

    renderPaymentMethods(container, methods);
  } catch (err) {
    console.error('Load payment methods error:', err);
    container.innerHTML = '<div class="empty-state">Failed to load payment methods.</div>';
  }
}

function renderPaymentMethods(container, methods) {
  container.innerHTML = methods
    .map(method => {
      const isPrimary = method.isPrimary;
      const methodIcon = getPaymentMethodIcon(method.methodType);

      return `
        <div class="payment-method-item ${isPrimary ? 'primary' : ''}">
          <div class="payment-method-item-left">
            <div class="payment-method-icon-box">
              ${methodIcon}
            </div>
            <div class="payment-method-info">
              <div class="payment-method-header">
                <h4 class="payment-method-title">${escapeHtml(method.methodType)}</h4>
                ${isPrimary ? '<span class="payment-method-badge">Primary</span>' : ''}
              </div>
              <p class="payment-method-details">
                ${escapeHtml(method.accountName)} • ${escapeHtml(method.accountNumberMasked)}
                ${method.bankName ? ` • ${escapeHtml(method.bankName)}` : ''}
              </p>
            </div>
          </div>
          <div class="payment-method-actions">
            ${
              !isPrimary
                ? `
              <button class="btn btn-outline btn-sm payment-method-set-primary-btn" data-id="${method.id}">
                Set as Primary
              </button>
            `
                : ''
            }
            <button class="btn btn-outline btn-sm payment-method-delete-btn" data-id="${
              method.id
            }" style="color: #dc3545; border-color: #dc3545;">
              Delete
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  setupPaymentMethodActions();
}

function getPaymentMethodIcon(methodType) {
  const icons = {
    GCash: '<img src="../../../assets/svg/contact.svg" alt="GCash" width="24" height="24" />',
    PayMaya: '<img src="../../../assets/svg/contact.svg" alt="PayMaya" width="24" height="24" />',
    'Bank Transfer':
      '<img src="../../../assets/svg/building.svg" alt="Bank" width="24" height="24" />',
    PayPal: '<img src="../../../assets/svg/creditCard.svg" alt="PayPal" width="24" height="24" />',
    GrabPay: '<img src="../../../assets/svg/contact.svg" alt="GrabPay" width="24" height="24" />',
    Other: '<img src="../../../assets/svg/creditCard.svg" alt="Other" width="24" height="24" />',
  };
  return icons[methodType] || icons['Other'];
}

function setupPaymentMethodActions() {
  // Set as primary buttons
  document.querySelectorAll('.payment-method-set-primary-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const methodId = btn.dataset.id;
      await setPaymentMethodAsPrimary(methodId);
    });
  });

  // Delete buttons
  document.querySelectorAll('.payment-method-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const methodId = btn.dataset.id;
      if (confirm('Are you sure you want to delete this payment method?')) {
        await deletePaymentMethod(methodId);
      }
    });
  });
}

async function savePaymentMethod() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id;

  if (!userId) {
    showToast('Unable to save payment method', 'error');
    return;
  }

  const methodType = document.getElementById('payment-method-type').value;
  const accountName = document.getElementById('payment-account-name').value.trim();
  const accountNumber = document.getElementById('payment-account-number').value.trim();
  const bankName = document.getElementById('payment-bank-name').value.trim();
  const isPrimary = document.getElementById('payment-is-primary').checked;

  if (!methodType || !accountName || !accountNumber) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  if (methodType === 'Bank Transfer' && !bankName) {
    showToast('Bank name is required for bank transfers', 'error');
    return;
  }

  const submitBtn = document.getElementById('payment-method-modal-submit-btn');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const body = {
      userId,
      methodType,
      accountName,
      accountNumber,
      bankName: methodType === 'Bank Transfer' ? bankName : null,
      isPrimary,
    };

    if (currentEditingPaymentMethodId) {
      body.paymentMethodId = currentEditingPaymentMethodId;
    }

    const method = currentEditingPaymentMethodId ? 'PATCH' : 'POST';
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/payment-methods`, {
      method,
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.ok) {
      showToast(
        currentEditingPaymentMethodId
          ? 'Payment method updated successfully'
          : 'Payment method added successfully',
        'success'
      );
      paymentMethodCloseModal();
      loadPaymentMethods();
    } else {
      showToast(data.error || 'Failed to save payment method', 'error');
    }
  } catch (err) {
    console.error('Save payment method error:', err);
    showToast('Failed to save payment method', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function setPaymentMethodAsPrimary(methodId) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id;

  if (!userId) {
    showToast('Unable to update payment method', 'error');
    return;
  }

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/payment-methods`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        userId,
        paymentMethodId: parseInt(methodId),
        isPrimary: true,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      showToast('Primary payment method updated', 'success');
      loadPaymentMethods();
    } else {
      showToast(data.error || 'Failed to update payment method', 'error');
    }
  } catch (err) {
    console.error('Update payment method error:', err);
    showToast('Failed to update payment method', 'error');
  }
}

async function deletePaymentMethod(methodId) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id;

  if (!userId) {
    showToast('Unable to delete payment method', 'error');
    return;
  }

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/landlord/payment-methods`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        userId,
        paymentMethodId: parseInt(methodId),
      }),
    });

    const data = await res.json();

    if (res.ok) {
      showToast('Payment method deleted', 'success');
      loadPaymentMethods();
    } else {
      showToast(data.error || 'Failed to delete payment method', 'error');
    }
  } catch (err) {
    console.error('Delete payment method error:', err);
    showToast('Failed to delete payment method', 'error');
  }
}
