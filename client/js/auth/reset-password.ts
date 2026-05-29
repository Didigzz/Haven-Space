// Import CONFIG
import CONFIG from '../config.ts';
import { showErrorToast } from '../shared/toast.ts';

document.addEventListener('DOMContentLoaded', function () {
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const successModalOverlay = document.getElementById('success-modal-overlay');
  const modalCloseBtn = document.getElementById('modal-close-btn');

  // Get query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');
  const requestId = urlParams.get('request_id');

  // Modal functions
  function showSuccessModal() {
    successModalOverlay.classList.add('active');
  }

  function hideSuccessModal() {
    successModalOverlay.classList.remove('active');
    // Redirect to login after modal closes
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 300);
  }

  // Modal event listeners
  modalCloseBtn.addEventListener('click', hideSuccessModal);

  // Close on backdrop click
  successModalOverlay.addEventListener('click', e => {
    if (e.target === successModalOverlay) {
      hideSuccessModal();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && successModalOverlay.classList.contains('active')) {
      hideSuccessModal();
    }
  });

  // Form submission
  resetPasswordForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const newPassword = this.querySelector('#newPassword').value;
    const confirmPassword = this.querySelector('#confirmPassword').value;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      showErrorToast('Passwords do not match');
      return;
    }

    // Validate password strength
    if (newPassword.length < 8) {
      showErrorToast('Password must be at least 8 characters long');
      return;
    }

    // Send request to backend to reset password
    fetch(`${CONFIG.API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        request_id: requestId,
        new_password: newPassword,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          showErrorToast(data.error);
          return;
        }

        showSuccessModal();
      })
      .catch(error => {
        console.error('Error:', error);
        showErrorToast('Failed to reset password. Please try again.');
      });
  });
});
