// Import CONFIG
import CONFIG from '../config.ts';
import { showToast } from '../shared/toast.ts';

document.addEventListener('DOMContentLoaded', function () {
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const verificationForm = document.getElementById('verificationForm');
  const backBtn = document.getElementById('backBtn');
  const emailDisplay = document.getElementById('emailDisplay');
  const resendLink = document.getElementById('resendLink');
  const resendTimer = document.getElementById('resendTimer');
  const codeInputs = document.querySelectorAll('.code-input');

  const emailInput = document.getElementById('email');

  // Helper: show inline error under the email field
  function setEmailFieldError(message) {
    clearEmailFieldError();
    emailInput.classList.add('input-error');
    const err = document.createElement('p');
    err.className = 'field-error';
    err.id = 'emailFieldError';
    err.textContent = message;
    emailInput.parentElement.appendChild(err);
  }

  function clearEmailFieldError() {
    emailInput.classList.remove('input-error');
    const existing = document.getElementById('emailFieldError');
    if (existing) existing.remove();
  }

  // Clear inline error as soon as the user starts correcting the email
  emailInput.addEventListener('input', clearEmailFieldError);

  // Step 1: Send reset code
  forgotPasswordForm.addEventListener('submit', function (e) {
    e.preventDefault();

    clearEmailFieldError();
    const email = this.querySelector('#email').value;
    emailDisplay.textContent = email;

    // Send request to backend
    fetch(`${CONFIG.API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          if (data.error_code === 'EMAIL_NOT_FOUND') {
            setEmailFieldError('No account found with this email address.');
            showToast(
              'No account found with this email address. Please check your email or sign up.',
              'error',
              6000
            );
          } else {
            showToast(data.error, 'error');
          }
          return;
        }

        // Check if this is a Google OAuth user
        if (data.is_google_user) {
          showGoogleRecoveryOptions(data);
          return;
        }

        // Show success modal
        showSuccessModal(email, () => {
          // Switch to step 2
          step1.classList.add('hidden');
          step2.classList.remove('hidden');

          // Focus first code input
          setTimeout(() => codeInputs[0].focus(), 100);

          // Start resend timer
          startResendTimer();
        });
      })
      .catch(error => {
        console.error('Error:', error);
        showToast('Failed to send reset code. Please try again.', 'error');
      });
  });

  // Show success modal
  function showSuccessModal(email, onContinue) {
    const modal = document.createElement('div');
    modal.className = 'success-modal';
    modal.innerHTML = `
      <div class="success-modal-content">
        <div class="success-icon">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h3>Email Sent Successfully!</h3>
        <p>We've sent a 6-digit verification code to <strong>${email}</strong>.</p>
        <p>Please check your inbox (and spam folder) and enter the code to proceed with password reset.</p>
        <button id="continueBtn" class="auth-btn-primary auth-btn-full">Continue</button>
      </div>
    `;

    // Add styles for the modal
    const style = document.createElement('style');
    style.textContent = `
      .success-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }

      .success-modal-content {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        text-align: center;
      }

      .success-icon {
        color: #4CAF50;
        margin-bottom: 1rem;
      }

      .success-modal-content h3 {
        color: #1a202c;
        font-size: 1.5rem;
        margin-bottom: 1rem;
        font-weight: 600;
      }

      .success-modal-content p {
        color: #4a5568;
        margin-bottom: 1.5rem;
        line-height: 1.6;
      }

      .success-modal-content strong {
        font-weight: 600;
        color: #2d3748;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    // Add event listener for the continue button
    modal.querySelector('#continueBtn').addEventListener('click', () => {
      modal.remove();
      style.remove();
      onContinue();
    });

    // Close modal when clicking outside
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.remove();
        style.remove();
        onContinue();
      }
    });
  }

  // Back button
  backBtn.addEventListener('click', function () {
    step2.classList.add('hidden');
    step1.classList.remove('hidden');
  });

  // Code input handling
  codeInputs.forEach((input, index) => {
    input.addEventListener('input', function (e) {
      const value = e.target.value;

      // Only allow numbers
      if (!/^\d*$/.test(value)) {
        e.target.value = '';
        return;
      }

      // Move to next input if value entered
      if (value.length === 1 && index < codeInputs.length - 1) {
        codeInputs[index + 1].focus();
      }

      // Check if all inputs are filled
      Array.from(codeInputs).every(input => input.value.length === 1);
    });

    input.addEventListener('keydown', function (e) {
      // Move to previous input on backspace
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        codeInputs[index - 1].focus();
      }

      // Handle paste
      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
          const digits = text.replace(/\D/g, '').slice(0, 6).split('');
          digits.forEach((digit, i) => {
            if (codeInputs[i]) {
              codeInputs[i].value = digit;
              if (i < codeInputs.length - 1) {
                codeInputs[i + 1].focus();
              }
            }
          });
        });
      }
    });

    input.addEventListener('focus', function () {
      this.select();
    });
  });

  // Verification form submission
  verificationForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const code = Array.from(codeInputs)
      .map(input => input.value)
      .join('');

    if (code.length !== 6) {
      alert('Please enter the complete 6-digit code');
      return;
    }

    const email = emailDisplay.textContent;

    // Send to backend to verify code
    fetch(`${CONFIG.API_BASE_URL}/auth/verify-reset-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        code: code,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
          return;
        }

        if (data.valid) {
          // Store the request ID and email for the reset password page
          localStorage.setItem('resetRequestId', data.request_id);
          localStorage.setItem('resetEmail', email);

          // Redirect to reset password page
          window.location.href =
            'reset-password.html?email=' +
            encodeURIComponent(email) +
            '&request_id=' +
            data.request_id;
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Failed to verify code. Please try again.');
      });
  });

  // Resend code
  resendLink.addEventListener('click', function (e) {
    e.preventDefault();

    const email = emailDisplay.textContent;

    // Show loading state
    const originalHTML = resendLink.innerHTML;
    resendLink.innerHTML = '<span class="resend-spinner"></span> Sending...';
    resendLink.classList.add('resend-loading-link');

    const stopLoading = () => {
      resendLink.innerHTML = originalHTML;
      resendLink.classList.remove('resend-loading-link');
    };

    // Send to backend to resend code
    fetch(`${CONFIG.API_BASE_URL}/auth/resend-reset-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email }),
    })
      .then(response => response.json())
      .then(data => {
        stopLoading();
        if (data.error) {
          alert(data.error);
          return;
        }

        alert('A new reset code has been sent to your email!');
        startResendTimer();
      })
      .catch(error => {
        stopLoading();
        console.error('Error:', error);
        alert('Failed to resend code. Please try again.');
      });
  });

  // Resend timer
  function startResendTimer() {
    resendLink.classList.add('hidden');
    resendTimer.classList.remove('hidden');

    let seconds = 30;
    const timerSpan = resendTimer.querySelector('span');

    const interval = setInterval(() => {
      seconds--;
      timerSpan.textContent = seconds;

      if (seconds <= 0) {
        clearInterval(interval);
        resendTimer.classList.add('hidden');
        resendLink.classList.remove('hidden');
      }
    }, 1000);
  }

  // Show Google OAuth recovery options
  function showGoogleRecoveryOptions(data) {
    // Create modal for Google recovery options
    const modal = document.createElement('div');
    modal.className = 'google-recovery-modal';
    modal.innerHTML = `
      <div class="google-recovery-content">
        <h3>Google Account Detected</h3>
        <p>This email is associated with a Google account. Since you signed up with Google, there's no password to reset.</p>
        <div class="recovery-options">
          <h4>Recovery Options:</h4>
          <ul>
            <li><a href="${data.recovery_options.google_account_recovery}" target="_blank">Recover your Google account</a></li>
            <li><a href="${data.recovery_options.contact_support}">Contact Haven Space support</a></li>
          </ul>
        </div>
        <div class="modal-actions">
          <button id="tryDifferentEmail" class="auth-btn-secondary">Try different email</button>
          <button id="backToLogin" class="auth-btn-primary">Back to login</button>
        </div>
      </div>
    `;

    // Add styles for the modal
    const style = document.createElement('style');
    style.textContent = `
      .google-recovery-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }

      .google-recovery-content {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }

      .google-recovery-content h3 {
        color: #1a202c;
        font-size: 1.5rem;
        margin-bottom: 1rem;
        font-weight: 600;
      }

      .google-recovery-content p {
        color: #4a5568;
        margin-bottom: 1.5rem;
        line-height: 1.6;
      }

      .recovery-options {
        margin-bottom: 1.5rem;
      }

      .recovery-options h4 {
        color: #2d3748;
        font-size: 1.1rem;
        margin-bottom: 0.75rem;
        font-weight: 500;
      }

      .recovery-options ul {
        list-style-type: none;
        padding-left: 0;
      }

      .recovery-options li {
        margin-bottom: 0.5rem;
      }

      .recovery-options a {
        color: #4285f4;
        text-decoration: none;
        font-weight: 500;
      }

      .recovery-options a:hover {
        text-decoration: underline;
      }

      .modal-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1.5rem;
      }

      .auth-btn-secondary {
        background-color: #e2e8f0;
        color: #4a5568;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s;
      }

      .auth-btn-secondary:hover {
        background-color: #cbd5e0;
      }

      .auth-btn-primary {
        background-color: #4285f4;
        color: white;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s;
      }

      .auth-btn-primary:hover {
        background-color: #3367d6;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('#tryDifferentEmail').addEventListener('click', () => {
      modal.remove();
      style.remove();
      forgotPasswordForm.querySelector('#email').value = '';
      forgotPasswordForm.querySelector('#email').focus();
    });

    modal.querySelector('#backToLogin').addEventListener('click', () => {
      window.location.href = 'login.html';
    });

    // Close modal when clicking outside
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.remove();
        style.remove();
      }
    });
  }
});
