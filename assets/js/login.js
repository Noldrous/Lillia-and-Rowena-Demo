/**
 * Part 5: Lillia and Rowena Furniture — Client-Side Login Controller
 * File: assets/js/login.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('lr-login-form');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const roleInput = document.getElementById('login-role');
  const roleButtons = document.querySelectorAll('[data-role-tab]');
  const fillDemoBtn = document.getElementById('fill-demo-credentials');
  const demoEmailLabel = document.getElementById('demo-email-preview');
  const errorBanner = document.getElementById('login-error-banner');
  const submitButton = document.getElementById('login-submit-btn');

  const DEMO_CREDENTIALS = {
    Customer: {
      email: 'rowena.vance@vancearchitects.com',
      name: 'Rowena Vance',
      password: 'ClientPass2025!',
      buttonLabel: 'Sign In to Client Portal →',
    },
    Admin: {
      email: 'admin@lilliarowena.com',
      name: 'Lillia Mercier (Owner)',
      password: 'MasterJoinery#01',
      buttonLabel: 'Sign In to Admin Console →',
    },
  };

  function setRole(role) {
    const targetRole = role === 'Admin' ? 'Admin' : 'Customer';
    if (roleInput) roleInput.value = targetRole;

    roleButtons.forEach((btn) => {
      const isSelected = btn.getAttribute('data-role-tab') === targetRole;
      btn.classList.toggle('active', isSelected);
    });

    const preset = DEMO_CREDENTIALS[targetRole];
    if (emailInput) emailInput.value = preset.email;
    if (passwordInput) passwordInput.value = preset.password;
    if (demoEmailLabel) demoEmailLabel.textContent = preset.email;
    if (submitButton) submitButton.textContent = preset.buttonLabel;
    hideError();
  }

  function showError(message) {
    if (!errorBanner) return;
    errorBanner.textContent = message;
    errorBanner.style.display = 'block';
  }

  function hideError() {
    if (!errorBanner) return;
    errorBanner.textContent = '';
    errorBanner.style.display = 'none';
  }

  roleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const role = btn.getAttribute('data-role-tab') || 'Customer';
      setRole(role);
    });
  });

  if (fillDemoBtn) {
    fillDemoBtn.addEventListener('click', () => {
      const currentRole = roleInput ? roleInput.value : 'Customer';
      setRole(currentRole);
    });
  }

  if (form) {
    form.addEventListener('submit', (event) => {
      hideError();
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const role = roleInput ? roleInput.value : 'Customer';

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        event.preventDefault();
        if (emailInput) emailInput.classList.add('has-error');
        showError('Please enter a valid email address.');
        return;
      }

      if (!password || password.length < 6) {
        event.preventDefault();
        if (passwordInput) passwordInput.classList.add('has-error');
        showError('Password must be at least 6 characters.');
        return;
      }

      // If running on index.php, allow standard PHP POST form submission
      if (window.location.pathname.endsWith('.php')) {
        return;
      }

      // Otherwise save authenticated session and redirect to the separate /dashboard.html page
      event.preventDefault();
      const targetRoleParam = role === 'Admin' ? 'admin' : 'client';
      const userObj = {
        email,
        role: targetRoleParam,
        name:
          role === 'Admin'
            ? 'Lillia Mercier (Business Owner)'
            : email === 'rowena.vance@vancearchitects.com'
            ? 'Rowena Vance'
            : email.split('@')[0],
      };
      try {
        localStorage.setItem('lr_session_user', JSON.stringify(userObj));
      } catch (_e) {
        // Ignore storage errors
      }
      window.location.href = `/dashboard.html?role=${targetRoleParam}`;
    });
  }
});
