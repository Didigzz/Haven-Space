import CONFIG from '../config.js';

document.addEventListener('DOMContentLoaded', function () {
  const passwordToggle = document.getElementById('passwordToggle');
  const passwordInput = document.getElementById('password');
  const eyeOpen = passwordToggle.querySelector('.eye-open');
  const eyeClosed = passwordToggle.querySelector('.eye-closed');
  const loginForm = document.getElementById('loginForm');

  // Password visibility toggle
  passwordToggle.addEventListener('click', function () {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeOpen.classList.toggle('hidden');
    eyeClosed.classList.toggle('hidden');
  });

  // Form submission
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Store JWT and user info
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));

        // Redirect based on role
        if (result.user.role === 'landlord') {
          window.location.href = '../../landlord/index.html';
        } else {
          window.location.href = '../../boarder/index.html';
        }
      } else {
        alert(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Error during login:', error);
      alert('An error occurred. Please try again.');
    }
  });

  // Social login buttons
  document.querySelector('.social-btn-google')?.addEventListener('click', function () {
    console.log('Google login clicked');
    // TODO: Implement Google OAuth
    alert('Google login to be implemented');
  });

  document.querySelector('.social-btn-apple')?.addEventListener('click', function () {
    console.log('Apple login clicked');
    // TODO: Implement Apple OAuth
    alert('Apple login to be implemented');
  });
});
