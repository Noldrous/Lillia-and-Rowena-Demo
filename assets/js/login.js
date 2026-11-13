/**
 * Part 5: Lillia and Rowena Furniture — Client-Side Login & Registration Controller
 * File: assets/js/login.js
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('lr-login-form');
  const nameGroup = document.getElementById('register-name-group');
  const nameInput = document.getElementById('register-name');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const roleInput = document.getElementById('login-role');
  const modeInput = document.getElementById('login-mode');
  const roleButtons = document.querySelectorAll('[data-role-tab]');
  const authModeTabsContainer = document.getElementById('customer-auth-mode-tabs');
  const signInModeBtn = document.getElementById('auth-mode-signin');
  const registerModeBtn = document.getElementById('auth-mode-register');
  const demoBox = document.getElementById('demo-credentials-box');
  const fillDemoBtn = document.getElementById('fill-demo-credentials');
  const demoEmailLabel = document.getElementById('demo-email-preview');
  const errorBanner = document.getElementById('login-error-banner');
  const submitButton = document.getElementById('login-submit-btn');
  const headingTitle = document.getElementById('login-heading-title');
  const headingSubtitle = document.getElementById('login-heading-subtitle');
  const activeSessionBanner = document.getElementById('login-active-session-banner');
  const activeSessionUser = document.getElementById('login-active-session-user');
  const activeSessionActions = document.getElementById('login-active-session-actions');

  const DEMO_CREDENTIALS = {
    Customer: {
      email: 'rowena.vance@vancearchitects.com',
      name: 'Rowena Vance',
      password: 'ClientPass2025!',
      buttonLabel: 'Sign In to My Account →',
    },
    Admin: {
      email: 'admin@lilliarowena.com',
      name: 'Lillia Mercier (Owner)',
      password: 'MasterJoinery#01',
      buttonLabel: 'Sign In to Admin Console →',
    },
  };

  let currentRole = 'Customer';
  let currentMode = 'signin'; // 'signin' | 'register'

  function renderActiveSessionBanner() {
    if (!activeSessionBanner || !activeSessionUser || !activeSessionActions) return;
    try {
      const raw = localStorage.getItem('lr_session_user');
      const session = raw ? JSON.parse(raw) : null;
      if (!session || !session.email || !session.role) {
        activeSessionBanner.style.display = 'none';
        return;
      }
      const isAdmin = String(session.role).toLowerCase() === 'admin';
      const displayName = session.name || session.email;
      activeSessionBanner.style.display = 'block';
      activeSessionUser.textContent = `${displayName} (${isAdmin ? 'Admin' : 'Customer'})`;
      activeSessionActions.innerHTML = isAdmin
        ? `
          <a href="dashboard.html?role=admin" style="padding: 0.45rem 0.85rem; border-radius: 0.5rem; background: #0095FF; color: #FFF; font-size: 0.75rem; font-weight: 700; text-decoration: none;">Admin Dashboard →</a>
          <a href="index.html" style="padding: 0.45rem 0.85rem; border-radius: 0.5rem; background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A; font-size: 0.75rem; font-weight: 700; text-decoration: none;">Back to Showroom</a>
          <button type="button" id="login-page-logout-btn" style="padding: 0.45rem 0.85rem; border-radius: 0.5rem; background: #FEE2E2; border: 1px solid #FECACA; color: #DC2626; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Log Out</button>
        `
        : `
          <a href="dashboard.html?role=client&tab=home" style="padding: 0.45rem 0.85rem; border-radius: 0.5rem; background: #0095FF; color: #FFF; font-size: 0.75rem; font-weight: 700; text-decoration: none;">My Account →</a>
          <a href="dashboard.html?role=client&tab=orders" style="padding: 0.45rem 0.85rem; border-radius: 0.5rem; background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A; font-size: 0.75rem; font-weight: 700; text-decoration: none;">My Orders</a>
          <button type="button" id="login-page-logout-btn" style="padding: 0.45rem 0.85rem; border-radius: 0.5rem; background: #FEE2E2; border: 1px solid #FECACA; color: #DC2626; font-size: 0.75rem; font-weight: 700; cursor: pointer;">Log Out</button>
        `;
      const logoutBtn = document.getElementById('login-page-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('lr_session_user');
          localStorage.removeItem('lr_cart_items');
          renderActiveSessionBanner();
        });
      }
    } catch (_e) {
      activeSessionBanner.style.display = 'none';
    }
  }

  function updateAuthUI() {
    const isAdmin = currentRole === 'Admin';
    const isRegister = !isAdmin && currentMode === 'register';

    if (roleInput) roleInput.value = currentRole;
    if (modeInput) modeInput.value = isRegister ? 'register' : 'signin';

    roleButtons.forEach((btn) => {
      const isSelected = btn.getAttribute('data-role-tab') === currentRole;
      btn.classList.toggle('active', isSelected);
    });

    if (authModeTabsContainer) {
      authModeTabsContainer.style.display = isAdmin ? 'none' : 'flex';
    }

    if (signInModeBtn && registerModeBtn) {
      signInModeBtn.style.background = !isRegister ? '#0F172A' : 'transparent';
      signInModeBtn.style.color = !isRegister ? '#FFFFFF' : '#475569';
      registerModeBtn.style.background = isRegister ? '#0F172A' : 'transparent';
      registerModeBtn.style.color = isRegister ? '#FFFFFF' : '#475569';
    }

    if (nameGroup) {
      nameGroup.style.display = isRegister ? 'block' : 'none';
    }
    if (demoBox) {
      demoBox.style.display = isRegister ? 'none' : 'flex';
    }

    if (isAdmin) {
      if (headingTitle) headingTitle.textContent = 'Admin Console Sign In';
      if (headingSubtitle) {
        headingSubtitle.textContent =
          'Sign in with administrator credentials to manage products, inventory, suppliers, vouchers, and orders.';
      }
      const preset = DEMO_CREDENTIALS.Admin;
      if (emailInput) emailInput.value = preset.email;
      if (passwordInput) passwordInput.value = preset.password;
      if (demoEmailLabel) demoEmailLabel.textContent = preset.email;
      if (submitButton) submitButton.textContent = preset.buttonLabel;
    } else if (isRegister) {
      if (headingTitle) headingTitle.textContent = 'Create Your Account';
      if (headingSubtitle) {
        headingSubtitle.textContent =
          'Register a customer account to save delivery details, redeem personal vouchers, and track your orders.';
      }
      if (nameInput && !nameInput.value) nameInput.value = '';
      if (emailInput && emailInput.value === DEMO_CREDENTIALS.Admin.email) emailInput.value = '';
      if (passwordInput && passwordInput.value === DEMO_CREDENTIALS.Admin.password) passwordInput.value = '';
      if (submitButton) submitButton.textContent = 'Create Account & Continue →';
    } else {
      if (headingTitle) headingTitle.textContent = 'Sign In to Your Account';
      if (headingSubtitle) {
        headingSubtitle.textContent =
          'Sign in to view your orders, manage your shopping cart, and redeem personal discount vouchers.';
      }
      const preset = DEMO_CREDENTIALS.Customer;
      if (emailInput) emailInput.value = preset.email;
      if (passwordInput) passwordInput.value = preset.password;
      if (demoEmailLabel) demoEmailLabel.textContent = preset.email;
      if (submitButton) submitButton.textContent = preset.buttonLabel;
    }

    hideError();
  }

  function setRole(role) {
    currentRole = role === 'Admin' ? 'Admin' : 'Customer';
    if (currentRole === 'Admin') {
      currentMode = 'signin';
    }
    updateAuthUI();
  }

  function setMode(mode) {
    currentMode = mode === 'register' ? 'register' : 'signin';
    if (currentMode === 'register') {
      currentRole = 'Customer';
      if (emailInput && emailInput.value === DEMO_CREDENTIALS.Customer.email) {
        emailInput.value = '';
      }
      if (passwordInput && passwordInput.value === DEMO_CREDENTIALS.Customer.password) {
        passwordInput.value = '';
      }
    }
    updateAuthUI();
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

  if (signInModeBtn) {
    signInModeBtn.addEventListener('click', () => setMode('signin'));
  }
  if (registerModeBtn) {
    registerModeBtn.addEventListener('click', () => setMode('register'));
  }

  if (fillDemoBtn) {
    fillDemoBtn.addEventListener('click', () => {
      currentMode = 'signin';
      updateAuthUI();
    });
  }

  // Check URL query parameters (?mode=register or ?role=admin)
  const params = new URLSearchParams(window.location.search);
  const urlMode = (params.get('mode') || '').toLowerCase();
  const urlRole = (params.get('role') || '').toLowerCase();
  if (urlRole === 'admin') {
    setRole('Admin');
  } else if (urlMode === 'register') {
    setMode('register');
  } else {
    updateAuthUI();
  }

  renderActiveSessionBanner();

  if (form) {
    form.addEventListener('submit', (event) => {
      hideError();
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      const role = roleInput ? roleInput.value : 'Customer';
      const isRegister = role !== 'Admin' && currentMode === 'register';
      const fullName = nameInput ? nameInput.value.trim() : '';

      if (isRegister && fullName.length < 2) {
        event.preventDefault();
        if (nameInput) nameInput.classList.add('has-error');
        showError('Please enter your full name (at least 2 characters).');
        return;
      }

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

      const targetRoleParam = role === 'Admin' ? 'admin' : 'client';
      let resolvedName =
        role === 'Admin'
          ? 'Lillia Mercier (Business Owner)'
          : isRegister && fullName
          ? fullName
          : email.toLowerCase() === 'rowena.vance@vancearchitects.com'
          ? 'Rowena Vance'
          : email.split('@')[0];

      try {
        const registeredRaw = localStorage.getItem('lr_registered_customers');
        const registeredMap = registeredRaw ? JSON.parse(registeredRaw) : {};
        if (isRegister && fullName) {
          registeredMap[email.toLowerCase()] = { name: fullName, email };
          localStorage.setItem('lr_registered_customers', JSON.stringify(registeredMap));
          localStorage.setItem(
            'lr_customer_profile',
            JSON.stringify({
              name: fullName,
              email,
              phone: '+1 (212) 555-0148',
              city: 'New York, NY 10013',
              address: 'Suite 400, 118 Mercer St, SoHo',
              notes: 'Standard white-glove delivery instructions.',
            })
          );
        } else if (role !== 'Admin' && registeredMap[email.toLowerCase()]?.name) {
          resolvedName = registeredMap[email.toLowerCase()].name;
        }
      } catch (_e) {
        // Ignore storage error
      }

      const userObj = {
        email,
        role: targetRoleParam,
        name: resolvedName,
      };
      try {
        localStorage.setItem('lr_session_user', JSON.stringify(userObj));
      } catch (_e) {
        // Ignore storage errors
      }

      const formAction = (form.getAttribute('action') || '').toLowerCase();
      if (window.location.pathname.endsWith('.php') || formAction.includes('index.php')) {
        return;
      }

      event.preventDefault();
      const redirectParam = (params.get('redirect') || '').toLowerCase();
      if (redirectParam === 'request-design' && targetRoleParam !== 'admin') {
        window.location.href = 'index.html?trigger=request-design';
        return;
      }
      window.location.href = `dashboard.html?role=${targetRoleParam}`;
    });
  }
});

