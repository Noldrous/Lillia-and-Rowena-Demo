import {
  ADMIN_MESSENGER_PLACEHOLDER_URL,
  PRODUCT_TYPES,
  applyAdminOrderUpdate,
  applyMaterialStockMovement,
  buildMaterialRecord,
  buildProductRecord,
  calculateExpirationFromInput,
  calculateOrderPricing,
  computeCustomerDirectory,
  computeInventoryMetrics,
  computeMaterialInventoryMetrics,
  computeVariantPricing,
  computeVoucherStatusInfo,
  createCustomOrderRequest,
  describeMaterialStockPreview,
  filterCustomerVouchers,
  filterInventoryMaterials,
  formatSimplifiedProductCardData,
  formatVoucherBenefitLabel,
  formatVoucherExpiryDisplay,
  formatVoucherIssuedDisplay,
  generateOwnEntityId,
  getCompletedTransactionsForCustomer,
  getManilaDateInputDefaults,
  getMaterialCategories,
  getMaterialStockStatus,
  getProductStockStatus,
  isOrderCompleted,
  paginateItems,
  partitionOrdersByCompletion,
  recordCustomerOrderPayment,
  removeMaterialFromInventory,
  removeProductFromCatalog,
  requestOrderCancellation,
  resolveCustomerAvatarState,
  resolveOrderCancellationRequest,
  revokeVoucherInList,
  validateAndCreateVoucher,
  validateMaterialInput,
  validateNewFurnitureInput,
  validateVoucherForOrder,
  verifyAndCreateOrder,
} from './store.js';

import { buildAnalyticsCsvContent, buildAnalyticsPdfBytes, computeMonthlyAnalyticsReport, resolveAnalyticsDateRange } from './analytics.js';

export function createDashboard({
  state,
  API_ENDPOINT,
  FRIENDLY_CUSTOMER_STEPS,
  syncCustomerAvatarDOM,
  esc,
  usd,
  bindLiveSearchInput,
  syncDatabaseStore,
  persistProductToStorage,
  saveMaterialsToStorage,
  saveOrdersToStorage,
  saveInventoryTransactionsToStorage,
  saveSessionUserToServer,
  saveCartToStorage,
  saveCustomerProfileToStorage,
  bindRequestDesignTriggers
}) {
function initDashboardPage() {
  const params = new URLSearchParams(window.location.search);
  const urlRole = params.get('role');

  let activeUser = state.sessionUser;
  if ((urlRole === 'admin' || urlRole === 'client') && (!activeUser || activeUser.role !== urlRole)) {
    activeUser =
      urlRole === 'admin'
        ? { email: 'admin@lilliarowena.com', name: 'Lillia Mercier (Business Owner)', role: 'admin' }
        : { email: 'rowena.vance@vancearchitects.com', name: 'Rowena Vance', role: 'client' };
    saveSessionUserToServer(activeUser);
  }

  // If still not logged in, redirect to src/index.php (on PHP) or login.html
  if (!activeUser) {
    window.location.href = window.location.pathname.endsWith('.php')
      ? new URL('index.php', window.location.href).href
      : 'login.html';
    return;
  }

  const isAdmin = activeUser.role === 'admin';
  const topHeader = document.getElementById('portal-top-header');
  const clientWrapper = document.getElementById('client-portal-wrapper');
  const clientView = document.getElementById('client-portal-view');
  const adminView = document.getElementById('admin-portal-view');
  const headerSubtitle = document.getElementById('portal-header-subtitle');
  const userBadge = document.getElementById('portal-user-badge');
  const welcomeName = document.getElementById('client-welcome-name');
  const welcomeEmail = document.getElementById('client-welcome-email');
  const sidebarName = document.getElementById('client-sidebar-name');
  const sidebarEmail = document.getElementById('client-sidebar-email');
  const sidebarInitials = document.getElementById('client-sidebar-initials');
  const adminSidebarName = document.getElementById('admin-sidebar-user-name');
  const adminSidebarEmail = document.getElementById('admin-sidebar-user-email');
  const logoutBtn = document.getElementById('portal-logout-btn');
  const adminLogoutBtn = document.getElementById('admin-logout-btn');

  if (activeUser.name) state.customerProfile.name = activeUser.name;
  if (activeUser.email) state.customerProfile.email = activeUser.email;
  if (activeUser.avatar && !state.customerProfile.avatar) {
    state.customerProfile.avatar = activeUser.avatar;
  }
  const matchedCustRecord = (state.customers || []).find(
    (c) => String(c.email || '').trim().toLowerCase() === String(activeUser.email || '').trim().toLowerCase()
  );
  if (matchedCustRecord && String(activeUser.email || '').trim().toLowerCase() !== 'rowena.vance@vancearchitects.com') {
    state.customerProfile.phone = matchedCustRecord.phoneNumber || matchedCustRecord.phone || '';
    state.customerProfile.address = matchedCustRecord.address || '';
    state.customerProfile.city = matchedCustRecord.city || '';
    state.customerProfile.notes = matchedCustRecord.notes || '';
    if (matchedCustRecord.avatar) {
      state.customerProfile.avatar = matchedCustRecord.avatar;
    }
  }

  // Show ONLY the dashboard matching the logged-in user's role.
  // When Admin logs in, hide the customer top header so ALL admin navigation lives in the unified Left Sidebar.
  if (topHeader) topHeader.classList.toggle('hidden', isAdmin);
  if (clientWrapper) clientWrapper.classList.toggle('hidden', isAdmin);
  if (clientView) clientView.classList.toggle('hidden', isAdmin);
  if (adminView) adminView.classList.toggle('hidden', !isAdmin);
  if (headerSubtitle) {
    headerSubtitle.textContent = isAdmin ? 'Admin Management Console' : 'Customer Account Dashboard';
  }
  if (userBadge) {
    userBadge.textContent = `${state.customerProfile.name} (${isAdmin ? 'Admin' : 'Customer'})`;
  }
  if (welcomeName) welcomeName.textContent = state.customerProfile.name;
  if (welcomeEmail) welcomeEmail.textContent = state.customerProfile.email;
  if (sidebarName) sidebarName.textContent = state.customerProfile.name;
  if (sidebarEmail) sidebarEmail.textContent = state.customerProfile.email;
  if (adminSidebarName) adminSidebarName.textContent = state.customerProfile.name;
  if (adminSidebarEmail) adminSidebarEmail.textContent = state.customerProfile.email;
  syncCustomerAvatarDOM(state.customerProfile);

  const handlePortalLogout = async (e) => {
    e.preventDefault();
    state.sessionUser = null;
    state.cartItems = [];
    try {
      await fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_session', sessionUser: null }),
      });
    } catch (_err) {
      // Ignore network error
    }
    window.location.href = window.location.pathname.endsWith('.php')
      ? new URL('logout.php', window.location.href).href
      : 'login.html';
  };
  if (logoutBtn) logoutBtn.addEventListener('click', handlePortalLogout);
  if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', handlePortalLogout);
  bindRequestDesignTriggers();

  // Customer Left-Sidebar Tabs: Home, Orders, Address/Contact, Transactions, Cart, Vouchers
  const clientTabBtns = document.querySelectorAll('[data-client-tab]');
  const switchClientTab = (target) => {
    state.activeClientTab = target || 'home';
    clientTabBtns.forEach((b) => {
      const isSel = b.getAttribute('data-client-tab') === state.activeClientTab;
      b.className = isSel
        ? 'client-tab-btn w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer bg-[#0095FF] text-white shadow-xs'
        : 'client-tab-btn w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer bg-[#F8FBFF] text-[#0D1015] hover:bg-[#EBF6FF]';
    });
    document.querySelectorAll('.client-tab-panel').forEach((panel) => {
      panel.classList.toggle('hidden', panel.id !== `client-tab-${state.activeClientTab}`);
    });
  };

  clientTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchClientTab(btn.getAttribute('data-client-tab') || 'home');
    });
  });

  document.querySelectorAll('[data-switch-client-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchClientTab(btn.getAttribute('data-switch-client-tab') || 'home');
    });
  });

  // Honor URL ?tab= deep-links (e.g. ?tab=orders, ?tab=cart, ?tab=vouchers, ?tab=home)
  const requestedClientTab = (params.get('tab') || '').toLowerCase();
  const validClientTabs = ['home', 'orders', 'address', 'transactions', 'cart', 'vouchers'];
  if (!isAdmin && validClientTabs.includes(requestedClientTab)) {
    switchClientTab(requestedClientTab);
  }

  // Customer Profile Picture File Upload & Clear
  const applyCustomerAvatarUpdate = (newAvatarSrc) => {
    const cleanAvatar = String(newAvatarSrc || '').trim();
    state.customerProfile.avatar = cleanAvatar;
    if (state.sessionUser) {
      state.sessionUser.avatar = cleanAvatar;
    }
    const activeEmail = String(state.customerProfile.email || state.sessionUser?.email || '')
      .trim()
      .toLowerCase();
    if (activeEmail && Array.isArray(state.customers)) {
      state.customers = state.customers.map((c) =>
        String(c.email || '').trim().toLowerCase() === activeEmail
          ? { ...c, avatar: cleanAvatar }
          : c
      );
    }
    syncCustomerAvatarDOM(state.customerProfile);
    saveCustomerProfileToStorage();
  };

  const clientAvatarFileInput = document.getElementById('client-profile-avatar-file');
  if (clientAvatarFileInput) {
    clientAvatarFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const resultDataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!resultDataUrl) return;
        applyCustomerAvatarUpdate(resultDataUrl);

        try {
          const response = await fetch(`${API_ENDPOINT}?action=upload_product_image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'upload_product_image',
              fileName: `avatar_${file.name || 'profile.jpg'}`,
              dataUrl: resultDataUrl,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data && data.ok && data.imagePath) {
              applyCustomerAvatarUpdate(data.imagePath);
            }
          }
        } catch (_err) {
          // Keep Data URL fallback if server file write is unavailable
        }
        showClientBanner('Updated your profile picture.');
      };
      reader.readAsDataURL(file);
    });
  }

  const clientAvatarClearBtn = document.getElementById('client-profile-avatar-clear-btn');
  if (clientAvatarClearBtn) {
    clientAvatarClearBtn.addEventListener('click', () => {
      if (clientAvatarFileInput) clientAvatarFileInput.value = '';
      applyCustomerAvatarUpdate('');
      showClientBanner('Removed your profile picture.');
    });
  }

  // Customer Address & Contact Form Submit
  const addressForm = document.getElementById('client-address-form');
  if (addressForm) {
    addressForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameVal = document.getElementById('client-input-name')?.value.trim() || state.customerProfile.name;
      const emailVal = document.getElementById('client-input-email')?.value.trim() || state.customerProfile.email;
      const phoneVal = document.getElementById('client-input-phone')?.value.trim() || state.customerProfile.phone;
      const cityVal = document.getElementById('client-input-city')?.value.trim() || state.customerProfile.city;
      const addressVal = document.getElementById('client-input-address')?.value.trim() || state.customerProfile.address;
      const notesVal = document.getElementById('client-input-notes')?.value.trim() || state.customerProfile.notes;
      const avatarVal = document.getElementById('client-input-avatar')?.value.trim() ?? (state.customerProfile.avatar || '');

      state.customerProfile = {
        name: nameVal,
        email: emailVal,
        phone: phoneVal,
        city: cityVal,
        address: addressVal,
        notes: notesVal,
        avatar: avatarVal,
      };
      if (Array.isArray(state.customers)) {
        const targetEmail = emailVal.toLowerCase();
        state.customers = state.customers.map((c) =>
          String(c.email || '').trim().toLowerCase() === targetEmail
            ? { ...c, name: nameVal, fullName: nameVal, phone: phoneVal, phoneNumber: phoneVal, address: addressVal, avatar: avatarVal }
            : c
        );
      }
      saveCustomerProfileToStorage();

      if (state.sessionUser) {
        state.sessionUser.name = nameVal;
        state.sessionUser.email = emailVal;
        state.sessionUser.avatar = avatarVal;
        saveSessionUserToServer(state.sessionUser);
      }
      if (welcomeName) welcomeName.textContent = nameVal;
      if (welcomeEmail) welcomeEmail.textContent = emailVal;
      if (sidebarName) sidebarName.textContent = nameVal;
      if (sidebarEmail) sidebarEmail.textContent = emailVal;
      if (userBadge) userBadge.textContent = `${nameVal} (Customer)`;
      syncCustomerAvatarDOM(state.customerProfile);

      showClientBanner('Saved your updated Profile, Address & Contact information.');
      renderDashboardContent();
    });
  }

  // Customer Cart Quick Add Button (with stock enforcement)
  const cartAddBtn = document.getElementById('client-cart-add-btn');
  if (cartAddBtn) {
    cartAddBtn.addEventListener('click', () => {
      const sel = document.getElementById('client-cart-add-select');
      const pid = sel ? sel.value : '';
      const prod = state.catalog.find((p) => p.id === pid);
      if (!prod) return;
      const availableStock = Math.max(0, Math.floor(Number(prod.inStockCount ?? 0)));
      if (availableStock <= 0) {
        showClientBanner(`"${prod.name}" is currently Out of Stock.`);
        return;
      }
      const currentProductQty = state.cartItems
        .filter((c) => c.product.id === prod.id)
        .reduce((sum, c) => sum + c.quantity, 0);
      if (currentProductQty >= availableStock) {
        showClientBanner(`Cannot add more "${prod.name}": only ${availableStock} available in stock.`);
        return;
      }

      const finish = prod.defaultFinish || (prod.colorVariants && prod.colorVariants[0]?.name) || 'Natural Finish';
      const existing = state.cartItems.find((c) => c.product.id === prod.id && c.finish === finish);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cartItems.push({ product: prod, finish, quantity: 1 });
      }
      saveCartToStorage();
      showClientBanner(`Added "${prod.name}" to your Cart.`);
      renderDashboardContent();
    });
  }

  // Customer Cart Voucher Apply Button (Authoritative PHP/Server + Store Validation)
  const clientApplyVoucherBtn = document.getElementById('client-cart-apply-voucher-btn');
  const clientVoucherInput = document.getElementById('client-cart-voucher-input');
  const clientVoucherFeedback = document.getElementById('client-cart-voucher-feedback');
  if (clientApplyVoucherBtn && clientVoucherInput) {
    clientApplyVoucherBtn.addEventListener('click', async () => {
      const code = clientVoucherInput.value.trim().toUpperCase();
      const email = state.customerProfile.email || state.sessionUser?.email || '';
      let result = validateVoucherForOrder(
        state.vouchers,
        code,
        email,
        state.cartItems,
        state.catalog
      );

      if (result.valid) {
        try {
          const resp = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              action: 'validate_voucher',
              voucherCode: code,
              customerEmail: email,
              cartItems: state.cartItems.map((c) => ({
                productId: c.product.id,
                quantity: c.quantity,
              })),
            }),
          });
          const data = await resp.json();
          if (!resp.ok || !data.valid) {
            result = {
              valid: false,
              discountAmount: 0,
              voucher: null,
              errorMessage: data.error || 'Voucher validation failed on server.',
            };
          }
        } catch (_err) {
          // Offline fallback uses local store validation
        }
      }

      if (clientVoucherFeedback) {
        clientVoucherFeedback.classList.remove('hidden');
        if (result.valid) {
          state.appliedVoucher = result.voucher;
          const targetProdName =
            result.voucher.furnitureName || result.voucher.productName || 'selected product';
          clientVoucherFeedback.textContent = `✓ Voucher ${result.voucher.code} (${formatVoucherBenefitLabel(result.voucher)}) applied to "${targetProdName}" (-${usd(result.discountAmount)})!`;
          clientVoucherFeedback.className = 'text-xs font-semibold text-emerald-700';
        } else {
          state.appliedVoucher = null;
          clientVoucherFeedback.textContent = `✕ ${result.errorMessage}`;
          clientVoucherFeedback.className = 'text-xs font-semibold text-rose-700';
        }
      }
      renderDashboardContent();
    });
  }

  // Customer Cart Place Order Button (with Backend/Store Authoritative Recalculation & Stock Deduction)
  const clientCheckoutBtn = document.getElementById('client-cart-checkout-btn');
  if (clientCheckoutBtn) {
    clientCheckoutBtn.addEventListener('click', () => {
      if (state.cartItems.length === 0) return;
      const requestedVoucherCode = state.appliedVoucher ? state.appliedVoucher.code : '';
      const checkoutResult = verifyAndCreateOrder({
        catalog: state.catalog,
        vouchers: state.vouchers,
        customerProfile: state.customerProfile,
        sessionUser: state.sessionUser,
        cartItems: state.cartItems,
        voucherCode: requestedVoucherCode,
      });

      if (!checkoutResult.ok) {
        state.appliedVoucher = null;
        if (clientVoucherFeedback) {
          clientVoucherFeedback.classList.remove('hidden');
          clientVoucherFeedback.textContent = `✕ ${checkoutResult.errorMessage}`;
          clientVoucherFeedback.className = 'text-xs font-semibold text-rose-700';
        }
        renderDashboardContent();
        return;
      }

      const newOrder = checkoutResult.order;

      // Persist deducted stock quantities & log Stock Out transactions
      if (Array.isArray(checkoutResult.updatedCatalog)) {
        const previousById = Object.fromEntries(
          state.catalog.map((p) => [p.id, Math.max(0, Math.floor(Number(p.inStockCount ?? 0)))])
        );
        state.catalog = checkoutResult.updatedCatalog;
        state.catalog.forEach((updatedProd) => {
          const deducted = checkoutResult.requestedQtyByProduct?.[updatedProd.id] || 0;
          if (deducted > 0) {
            persistProductToStorage(updatedProd);
            const prevStock = previousById[updatedProd.id] ?? updatedProd.inStockCount + deducted;
            state.inventoryTransactions.unshift({
              id: `inv-tx-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
              productId: updatedProd.id,
              productName: updatedProd.name,
              productSku: updatedProd.sku,
              transactionType: 'Stock Out',
              quantity: deducted,
              previousStock: prevStock,
              newStock: updatedProd.inStockCount,
              purchaseCost: null,
              reason: `Customer Order #${newOrder.orderNumber}`,
              dateTime: `${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 5)}`,
              adminName: `Storefront Checkout (${newOrder.clientName})`,
            });
          }
        });
        saveInventoryTransactionsToStorage();
      }

      state.orders.unshift(newOrder);

      // Mark single-use voucher as Used
      if (checkoutResult.validatedVoucher) {
        const usedCode = String(checkoutResult.validatedVoucher.code || '').toUpperCase();
        state.vouchers = state.vouchers.map((v) =>
          String(v.code || '').toUpperCase() === usedCode ? { ...v, status: 'Used' } : v
        );
      }

      state.cartItems = [];
      state.appliedVoucher = null;
      if (clientVoucherInput) clientVoucherInput.value = '';
      if (clientVoucherFeedback) clientVoucherFeedback.classList.add('hidden');
      saveCartToStorage();
      syncDatabaseStore('sync_store');
      showClientBanner(`Order #${newOrder.orderNumber} placed for ${usd(newOrder.totalAmount)}.`);
      switchClientTab('orders');
      renderDashboardContent();
    });
  }

  // Responsive Mobile Admin Sidebar Drawer Toggle
  const adminSidebar = document.getElementById('admin-sidebar');
  const adminBackdrop = document.getElementById('admin-sidebar-backdrop');
  const adminMobileMenuBtn = document.getElementById('admin-mobile-menu-btn');
  const adminSidebarCloseBtn = document.getElementById('admin-sidebar-close-btn');

  const setAdminSidebarOpen = (open) => {
    if (!adminSidebar) return;
    adminSidebar.classList.toggle('is-open', open);
    if (adminBackdrop) adminBackdrop.classList.toggle('is-open', open);
    if (adminMobileMenuBtn) adminMobileMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  if (adminMobileMenuBtn) {
    adminMobileMenuBtn.addEventListener('click', () => {
      const isOpen = adminSidebar?.classList.contains('is-open');
      setAdminSidebarOpen(!isOpen);
    });
  }
  if (adminSidebarCloseBtn) {
    adminSidebarCloseBtn.addEventListener('click', () => setAdminSidebarOpen(false));
  }
  if (adminBackdrop) {
    adminBackdrop.addEventListener('click', () => setAdminSidebarOpen(false));
  }

  // Unified Admin Left-Sidebar Navigation (overview, catalog, add-product, inventory, orders, customers, vouchers)
  const ADMIN_SECTION_META = {
    overview: {
      eyebrow: 'Store Summary',
      title: 'Dashboard Overview',
      description:
        'Monitor store performance, inventory health, and recent customer orders at a glance.',
    },
    catalog: {
      eyebrow: 'Catalog Management',
      title: 'Products',
      description:
        'Manage handcrafted furniture pieces, pricing, room categories, and finished stock availability.',
    },
    'add-product': {
      eyebrow: 'Catalog Management',
      title: 'Add or Edit Product',
      description:
        'Create or update a Standard Product or Customized Product (Messenger) in the store catalog.',
    },
    inventory: {
      eyebrow: 'Inventory & Stock Management',
      title: 'Inventory & Stock Management',
      description:
        'Track workshop materials, monitor stock thresholds, record stock movements, and review audit history.',
    },
    vouchers: {
      eyebrow: 'Promotions',
      title: 'Discount Vouchers',
      description:
        'Issue and manage single-item promotional discount codes for customers.',
    },
    orders: {
      eyebrow: 'Order Management',
      title: 'Customer Orders',
      description:
        'Manage order production stages and track customer payments — updates sync live to the Customer Dashboard.',
    },
    customers: {
      eyebrow: 'Customer Management',
      title: 'Customer Directory',
      description:
        'View registered client profiles, delivery addresses, order history, and lifetime spend.',
    },
    analytics: {
      eyebrow: 'Business Intelligence & Reporting',
      title: 'Analytics & Business Reports',
      description:
        'Monthly performance KPIs, daily & annual revenue trends, best-selling pieces, order status distribution, customer retention, inventory movements, and voucher analytics.',
    },
  };

  // Wire Custom Order Commission Builder toggle buttons in Customer Dashboard
  const toggleCustomOrderBtn = document.getElementById('client-toggle-custom-order-btn');
  if (toggleCustomOrderBtn) {
    toggleCustomOrderBtn.addEventListener('click', () => {
      state.clientCustomOrderOpen = !state.clientCustomOrderOpen;
      renderDashboardContent();
    });
  }
  document.querySelectorAll('[data-open-custom-builder]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.clientCustomOrderOpen = true;
      switchClientTab('orders');
      renderDashboardContent();
    });
  });

  const adminTabBtns = document.querySelectorAll('[data-admin-tab]');
  const prodForm = document.getElementById('admin-product-form');
  const prodErrorEl = document.getElementById('admin-product-form-error');
  const closeAddProdBtn = document.getElementById('admin-close-product-form');
  const cancelAddProdBtn = document.getElementById('admin-cancel-product-btn');
  const overviewSection = document.getElementById('admin-overview-section');
  const catalogListEl = document.getElementById('admin-catalog-list');

  // Populate Messenger Conversation selector & wire Product Type switching
  const prodEditIdInput = document.getElementById('prod-edit-id');
  const prodTypeSelect = document.getElementById('prod-type');
  const prodTypeBadge = document.getElementById('prod-type-badge');
  const prodTypeHelper = document.getElementById('prod-type-helper');
  const prodMessengerSection = document.getElementById('prod-messenger-section');
  const prodMessengerThreadSelect = document.getElementById('prod-messenger-thread');
  const prodCustomNotesInput = document.getElementById('prod-custom-notes');
  const prodFormTitle = document.getElementById('admin-product-form-title');
  const prodSaveBtn = document.getElementById('admin-save-product-btn');
  const prodDeleteEditingBtn = document.getElementById('admin-delete-editing-product-btn');

  if (prodMessengerThreadSelect) {
    prodMessengerThreadSelect.innerHTML = [
      `<option value="">None — General Messenger Customization</option>`,
      ...(state.messengerConversations || []).map(
        (conv) =>
          `<option value="${esc(conv.id)}">${esc(conv.customerName)} (${esc(conv.customerEmail)}) — ${esc(conv.topic)}</option>`
      ),
    ].join('');
  }

  const syncProductFormTypeUI = () => {
    const selectedType = prodTypeSelect ? prodTypeSelect.value : 'standard';
    const isCustomized = selectedType === 'customized';
    const isEditing = Boolean(prodEditIdInput && prodEditIdInput.value);

    if (prodMessengerSection) {
      prodMessengerSection.classList.toggle('hidden', !isCustomized);
    }
    if (prodDeleteEditingBtn) {
      prodDeleteEditingBtn.classList.toggle('hidden', !isEditing);
    }
    if (prodTypeBadge) {
      prodTypeBadge.textContent = isCustomized
        ? 'Origin: Messenger customization · Public Shop Visibility: All Customers'
        : 'Origin: Admin · Public Shop Visibility: All Customers';
    }
    if (prodTypeHelper) {
      prodTypeHelper.textContent = isCustomized
        ? "Created or customized based on a customer's Messenger request. Appears in the public Shop/Product Catalog so ALL customers can view and purchase it."
        : 'Regular product manually added by the admin. Appears in the public Shop/Product Catalog for all customers to view and purchase.';
    }
    if (prodFormTitle) {
      if (isEditing) {
        prodFormTitle.textContent = isCustomized
          ? 'Edit Customized Product'
          : 'Edit Product';
      } else {
        prodFormTitle.textContent = isCustomized
          ? 'Add Customized Product'
          : 'Add Product';
      }
    }
    if (prodSaveBtn) {
      prodSaveBtn.textContent = isEditing ? 'Update Product' : 'Save Product';
    }
  };

  const handleRemoveProductById = (productId) => {
    const pid = String(productId || '').trim();
    const prod = state.catalog.find((item) => item.id === pid);
    if (!prod) return;

    openAdminConfirmModal({
      title: 'Remove Product',
      message: `Are you sure you want to remove "${prod.name}" (${prod.sku}) from the store catalog?`,
      confirmLabel: 'Remove Product',
      onConfirm: () => {
        const res = removeProductFromCatalog({
          catalog: state.catalog,
          cartItems: state.cartItems,
          vouchers: state.vouchers,
          productId: pid,
        });
        if (!res.ok) return;

        state.catalog = res.updatedCatalog;
        state.cartItems = res.updatedCartItems;
        state.vouchers = res.updatedVouchers;
        saveCartToStorage();
        syncDatabaseStore('delete_product', { productId: pid, vouchers: state.vouchers });

        if (prodEditIdInput && prodEditIdInput.value === pid) {
          resetProductFormForCreate('standard');
          switchAdminTab('catalog');
        }
        showAdminBanner(`Removed "${prod.name}" (${prod.sku}) from the store catalog.`);
        renderDashboardContent();
      },
    });
  };

  window.__removeProductById = handleRemoveProductById;

  if (prodDeleteEditingBtn) {
    prodDeleteEditingBtn.addEventListener('click', () => {
      const editId = prodEditIdInput ? prodEditIdInput.value.trim() : '';
      if (editId) handleRemoveProductById(editId);
    });
  }

  const prodImageInput = document.getElementById('prod-image');
  const prodImageFileInput = document.getElementById('prod-image-file');
  const prodImagePreview = document.getElementById('prod-image-preview');
  const prodImageEmptyState = document.getElementById('prod-image-empty-state');
  const prodImageClearBtn = document.getElementById('prod-image-clear-btn');

  const syncProductImagePreview = (rawValue) => {
    const cleanSrc = String(rawValue ?? (prodImageInput ? prodImageInput.value : '')).trim();
    if (!prodImagePreview || !prodImageEmptyState) return;
    if (cleanSrc) {
      const normalizedSrc =
        cleanSrc.startsWith('data:') || cleanSrc.startsWith('http://') || cleanSrc.startsWith('https://')
          ? cleanSrc
          : cleanSrc.replace(/^\//, '');
      prodImagePreview.src = normalizedSrc;
      prodImagePreview.classList.remove('hidden');
      prodImageEmptyState.classList.add('hidden');
    } else {
      prodImagePreview.removeAttribute('src');
      prodImagePreview.classList.add('hidden');
      prodImageEmptyState.classList.remove('hidden');
    }
  };

  if (prodImageInput) {
    prodImageInput.addEventListener('input', () => {
      syncProductImagePreview(prodImageInput.value);
    });
  }

  if (prodImageFileInput) {
    prodImageFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const resultDataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!resultDataUrl) return;
        if (prodImageInput) {
          prodImageInput.value = resultDataUrl;
        }
        syncProductImagePreview(resultDataUrl);
        if (prodErrorEl) prodErrorEl.classList.add('hidden');

        try {
          const response = await fetch('src/api.php?action=upload_product_image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'upload_product_image',
              fileName: file.name || 'product.jpg',
              dataUrl: resultDataUrl,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data && data.ok && data.imagePath) {
              if (prodImageInput) {
                prodImageInput.value = data.imagePath;
              }
              syncProductImagePreview(data.imagePath);
            }
          }
        } catch (_err) {
          // Keep Data URL fallback if server file write is unavailable
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (prodImageClearBtn) {
    prodImageClearBtn.addEventListener('click', () => {
      if (prodImageInput) prodImageInput.value = '';
      if (prodImageFileInput) prodImageFileInput.value = '';
      syncProductImagePreview('');
    });
  }

  if (prodForm) {
    prodForm.querySelectorAll('[data-prod-image-preset]').forEach((presetBtn) => {
      presetBtn.addEventListener('click', () => {
        const presetPath = presetBtn.getAttribute('data-prod-image-preset') || '';
        if (prodImageInput) prodImageInput.value = presetPath;
        if (prodImageFileInput) prodImageFileInput.value = '';
        syncProductImagePreview(presetPath);
        if (prodErrorEl) prodErrorEl.classList.add('hidden');
      });
    });
  }

  const resetProductFormForCreate = (defaultType = 'standard') => {
    if (prodEditIdInput) prodEditIdInput.value = '';
    if (prodTypeSelect) prodTypeSelect.value = defaultType;
    if (prodMessengerThreadSelect) prodMessengerThreadSelect.value = '';
    if (prodCustomNotesInput) prodCustomNotesInput.value = '';
    const nameEl = document.getElementById('prod-name');
    const skuEl = document.getElementById('prod-sku');
    const catEl = document.getElementById('prod-category');
    const priceEl = document.getElementById('prod-price');
    const discEl = document.getElementById('prod-discount');
    const dimEl = document.getElementById('prod-dimensions');
    const stockEl = document.getElementById('prod-stock');
    const minStockEl = document.getElementById('prod-min-stock');
    const colEl = document.getElementById('prod-colors');
    if (nameEl) nameEl.value = '';
    if (catEl) catEl.value = 'living';
    if (skuEl) skuEl.value = generateOwnEntityId('product', '', catEl ? catEl.value : 'living').codeId;
    if (priceEl) priceEl.value = '2850';
    if (discEl) discEl.value = '0';
    if (dimEl) dimEl.value = '240cm L × 100cm W × 75cm H';
    if (stockEl) stockEl.value = '4';
    if (minStockEl) minStockEl.value = '2';
    if (colEl) {
      colEl.value = 'Natural Walnut|#5C3A21|0, Smoked Oak|#3D312A|180, Ebonized Ash|#1C1917|260';
    }
    if (prodImageInput) prodImageInput.value = 'assets/images/category_dining_tables.jpg';
    if (prodImageFileInput) prodImageFileInput.value = '';
    syncProductImagePreview('assets/images/category_dining_tables.jpg');
    if (prodErrorEl) prodErrorEl.classList.add('hidden');
    syncProductFormTypeUI();
  };

  const openProductFormForEdit = (product) => {
    if (!product) return;
    const isCustomized =
      product.productType === 'customized' || Boolean(product.isCustomClientDesign);
    if (prodEditIdInput) prodEditIdInput.value = product.id;
    if (prodTypeSelect) prodTypeSelect.value = isCustomized ? 'customized' : 'standard';
    if (prodMessengerThreadSelect) {
      prodMessengerThreadSelect.value = product.messengerConversationId || '';
    }
    if (prodCustomNotesInput) {
      prodCustomNotesInput.value = product.customizationNotes || '';
    }
    const nameEl = document.getElementById('prod-name');
    const skuEl = document.getElementById('prod-sku');
    const catEl = document.getElementById('prod-category');
    const priceEl = document.getElementById('prod-price');
    const discEl = document.getElementById('prod-discount');
    const dimEl = document.getElementById('prod-dimensions');
    const stockEl = document.getElementById('prod-stock');
    const minStockEl = document.getElementById('prod-min-stock');
    const colEl = document.getElementById('prod-colors');
    if (nameEl) nameEl.value = product.name || '';
    if (skuEl) skuEl.value = product.sku || '';
    if (catEl) catEl.value = product.categoryId || 'dining';
    if (priceEl) priceEl.value = String(product.price || 2850);
    if (discEl) discEl.value = String(product.discountPercent || 0);
    if (dimEl) dimEl.value = product.dimensions || 'Standard Dimensions';
    if (stockEl) stockEl.value = String(product.inStockCount ?? 4);
    if (minStockEl) minStockEl.value = String(product.minStockLevel ?? 2);
    if (colEl) {
      const variants = Array.isArray(product.colorVariants) ? product.colorVariants : [];
      if (variants.length > 0) {
        colEl.value = variants
          .map((v) => `${v.name}|${v.hex || '#5C3A21'}|${Number(v.priceDelta || 0)}`)
          .join(', ');
      }
    }
    const existingImg = String(product.image || '').trim();
    if (prodImageInput) prodImageInput.value = existingImg;
    if (prodImageFileInput) prodImageFileInput.value = '';
    syncProductImagePreview(existingImg);
    if (prodErrorEl) prodErrorEl.classList.add('hidden');
    switchAdminTab('add-product', true);
    syncProductFormTypeUI();
    prodForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.__openProductFormForEdit = openProductFormForEdit;

  if (prodTypeSelect) {
    prodTypeSelect.addEventListener('change', () => {
      syncProductFormTypeUI();
    });
  }

  const prodCatSelect = document.getElementById('prod-category');
  if (prodCatSelect) {
    prodCatSelect.addEventListener('change', () => {
      const isEditing = Boolean(prodEditIdInput && prodEditIdInput.value);
      if (isEditing) return;
      const skuEl = document.getElementById('prod-sku');
      if (!skuEl) return;
      const currentSku = skuEl.value.trim().toUpperCase();
      if (!currentSku || /^LR-[A-Z]{2,3}-\d{3}$/.test(currentSku)) {
        skuEl.value = generateOwnEntityId('product', '', prodCatSelect.value).codeId;
      }
    });
  }

  if (prodMessengerThreadSelect) {
    prodMessengerThreadSelect.addEventListener('change', () => {
      const convId = prodMessengerThreadSelect.value;
      const matchedConv = (state.messengerConversations || []).find((c) => c.id === convId);
      if (!matchedConv) return;
      if (prodCustomNotesInput && !prodCustomNotesInput.value.trim()) {
        prodCustomNotesInput.value = matchedConv.customizationNotes || '';
      } else if (prodCustomNotesInput) {
        prodCustomNotesInput.value = matchedConv.customizationNotes || prodCustomNotesInput.value;
      }
      const isEditing = Boolean(prodEditIdInput && prodEditIdInput.value);
      if (!isEditing) {
        const nameEl = document.getElementById('prod-name');
        const skuEl = document.getElementById('prod-sku');
        const catEl = document.getElementById('prod-category');
        const priceEl = document.getElementById('prod-price');
        const dimEl = document.getElementById('prod-dimensions');
        if (nameEl && !nameEl.value.trim() && matchedConv.suggestedName) {
          nameEl.value = matchedConv.suggestedName;
        }
        if (skuEl && !skuEl.value.trim() && matchedConv.suggestedSku) {
          skuEl.value = matchedConv.suggestedSku;
        }
        if (catEl && matchedConv.categoryId) {
          catEl.value = matchedConv.categoryId;
        }
        if (priceEl && matchedConv.suggestedPrice) {
          priceEl.value = String(matchedConv.suggestedPrice);
        }
        if (dimEl && matchedConv.suggestedDimensions) {
          dimEl.value = matchedConv.suggestedDimensions;
        }
      }
    });
  }

  const switchAdminTab = (targetKey, preserveProductForm = false) => {
    const target = targetKey || 'overview';
    state.activeAdminTab = target;

    if (target === 'add-product' && !preserveProductForm) {
      resetProductFormForCreate('standard');
    }

    adminTabBtns.forEach((b) => {
      const tabAttr = b.getAttribute('data-admin-tab');
      const isSel = tabAttr === target || (target === 'add-product' && tabAttr === 'catalog');
      b.classList.toggle('is-active', isSel);
      if (isSel) {
        b.setAttribute('aria-current', 'page');
      } else {
        b.removeAttribute('aria-current');
      }
    });

    const meta = ADMIN_SECTION_META[target] || ADMIN_SECTION_META.overview;
    const eyebrowEl = document.getElementById('admin-page-eyebrow');
    const titleEl = document.getElementById('admin-page-title');
    const descEl = document.getElementById('admin-page-description');
    if (eyebrowEl) eyebrowEl.textContent = meta.eyebrow;
    if (titleEl) titleEl.textContent = meta.title;
    if (descEl) descEl.textContent = meta.description;

    // Show Overview section ONLY on 'overview' so pages are never overcrowded
    if (overviewSection) {
      overviewSection.classList.toggle('hidden', target !== 'overview');
    }

    // Show the compact Add/Edit Product form right above the Products table when 'add-product' is active
    if (prodForm) {
      prodForm.classList.toggle('hidden', target !== 'add-product');
    }
    if (catalogListEl) {
      catalogListEl.classList.toggle('hidden', target !== 'catalog' && target !== 'add-product');
    }
    if (prodErrorEl) {
      prodErrorEl.classList.add('hidden');
    }

    // Determine which .admin-tab-panel is visible
    document.querySelectorAll('.admin-tab-panel').forEach((panel) => {
      if (target === 'overview') {
        panel.classList.add('hidden');
      } else {
        const panelTarget = target === 'add-product' ? 'catalog' : target;
        panel.classList.toggle('hidden', panel.id !== `admin-tab-${panelTarget}`);
      }
    });

    setAdminSidebarOpen(false);
    if (target === 'analytics') renderAdminAnalyticsSection();
  };

  // Expose tab switcher for in-page quick action buttons
  window.__switchAdminTab = switchAdminTab;

  adminTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-admin-tab') || 'overview';
      switchAdminTab(target);
    });
  });

  if (closeAddProdBtn) {
    closeAddProdBtn.addEventListener('click', () => switchAdminTab('catalog'));
  }
  if (cancelAddProdBtn) {
    cancelAddProdBtn.addEventListener('click', () => switchAdminTab('catalog'));
  }

  // Straightforward Confirmation Modal wiring
  const confirmModal = document.getElementById('admin-confirm-modal');
  const confirmCancelBtn = document.getElementById('admin-confirm-cancel');
  const confirmAcceptBtn = document.getElementById('admin-confirm-accept');
  if (confirmCancelBtn && confirmModal) {
    confirmCancelBtn.addEventListener('click', () => {
      const cancelFn = pendingCancelAction;
      pendingConfirmAction = null;
      pendingCancelAction = null;
      confirmModal.classList.add('hidden');
      if (typeof cancelFn === 'function') cancelFn();
    });
  }
  if (confirmAcceptBtn && confirmModal) {
    confirmAcceptBtn.addEventListener('click', () => {
      const fn = pendingConfirmAction;
      pendingConfirmAction = null;
      pendingCancelAction = null;
      confirmModal.classList.add('hidden');
      if (typeof fn === 'function') fn();
    });
  }

  if (prodForm) {
    prodForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = prodEditIdInput ? prodEditIdInput.value.trim() : '';
      const productType = prodTypeSelect ? prodTypeSelect.value : PRODUCT_TYPES.NORMAL;
      const name = document.getElementById('prod-name').value.trim();
      const sku = document.getElementById('prod-sku').value.trim().toUpperCase();
      const categoryId = document.getElementById('prod-category').value;
      const price = Number(document.getElementById('prod-price').value);
      const discountPercent = Number(document.getElementById('prod-discount').value) || 0;
      const dimensions =
        document.getElementById('prod-dimensions').value.trim() || 'Standard Dimensions';
      const stockVal = document.getElementById('prod-stock')?.value;
      const minStockVal = document.getElementById('prod-min-stock')?.value;
      const inStockCount = stockVal !== undefined && stockVal !== '' ? Number(stockVal) : 4;
      const minStockLevel = minStockVal !== undefined && minStockVal !== '' ? Number(minStockVal) : 2;
      const colorsRaw = document.getElementById('prod-colors').value;
      const image = prodImageInput ? prodImageInput.value.trim() : '';
      const messengerConversationId = prodMessengerThreadSelect
        ? prodMessengerThreadSelect.value.trim()
        : '';
      const customizationNotes = prodCustomNotesInput
        ? prodCustomNotesInput.value.trim()
        : '';

      const validation = validateNewFurnitureInput({
        name,
        sku,
        price,
        inStockCount,
        productType,
        image,
      });

      if (!validation.valid) {
        if (prodErrorEl) {
          prodErrorEl.textContent = validation.errorMessage;
          prodErrorEl.classList.remove('hidden');
        }
        return;
      }
      if (prodErrorEl) prodErrorEl.classList.add('hidden');

      const matchedConv = (state.messengerConversations || []).find(
        (c) => c.id === messengerConversationId
      );
      const existingProduct = editId
        ? state.catalog.find((item) => item.id === editId) || null
        : null;

      const savedProduct = buildProductRecord(
        {
          productType,
          name,
          sku,
          categoryId,
          price,
          discountPercent,
          dimensions,
          inStockCount,
          minStockLevel,
          colorsRaw,
          image,
          messengerConversationId:
            productType === 'customized' ? messengerConversationId || null : null,
          messengerCustomerName:
            productType === 'customized' ? matchedConv?.customerName || null : null,
          messengerTopic: productType === 'customized' ? matchedConv?.topic || null : null,
          customizationNotes: productType === 'customized' ? customizationNotes || null : null,
        },
        existingProduct
      );

      if (existingProduct) {
        state.catalog = state.catalog.map((item) =>
          item.id === existingProduct.id ? savedProduct : item
        );
        persistProductToStorage(savedProduct);
      } else {
        state.catalog.unshift(savedProduct);
        persistProductToStorage(savedProduct);
      }

      const typeLabel =
        savedProduct.productType === 'customized'
          ? 'Customized Product (Messenger)'
          : 'Normal Product';

      resetProductFormForCreate('standard');
      switchAdminTab('catalog');
      showAdminBanner(
        existingProduct
          ? `Updated ${typeLabel} "${savedProduct.name}" (${savedProduct.sku}) — synced live with Home Page & Customer Dashboard.`
          : `Added ${typeLabel} "${savedProduct.name}" (${savedProduct.sku}) to the public Shop catalog & Customer Dashboard.`
      );
      renderDashboardContent();
    });
  }

  // Admin Create Discount Voucher Form (Fixed Amount $, Expiration Method, Quick Durations & Live Preview)
  const vchProductSelect = document.getElementById('vch-product');
  const vchDiscountInput = document.getElementById('vch-discount');
  const vchDiscountMaxHint = document.getElementById('vch-discount-max-hint');
  const vchExpMethodInput = document.getElementById('vch-expiration-method');
  const vchDurationPanel = document.getElementById('vch-duration-panel');
  const vchCustomExpiryPanel = document.getElementById('vch-custom-expiry-panel');
  const vchDurationValueInput = document.getElementById('vch-duration-value');
  const vchDurationUnitSelect = document.getElementById('vch-duration-unit');
  const vchExpiryDateInput = document.getElementById('vch-expiry-date');
  const vchExpiryTimeInput = document.getElementById('vch-expiry-time');
  const vchPreviewBox = document.getElementById('vch-expiration-preview');
  const vchPreviewText = document.getElementById('vch-expiration-preview-text');
  const vchPreviewBadge = document.getElementById('vch-expiration-preview-badge');

  const syncVoucherProductMaxPriceHint = () => {
    const pid = vchProductSelect ? vchProductSelect.value : '';
    const selectedProd = state.catalog.find((p) => p.id === pid) || state.catalog[0];
    if (selectedProd) {
      const maxPrice = Number(selectedProd.effectivePrice ?? selectedProd.price ?? 0);
      if (vchDiscountMaxHint) {
        vchDiscountMaxHint.textContent = `Max: ${usd(maxPrice)}`;
      }
      if (vchDiscountInput) {
        vchDiscountInput.max = String(maxPrice);
      }
    }
  };

  const initVoucherCustomDateDefaults = () => {
    const defaults = getManilaDateInputDefaults(Date.now());
    if (vchExpiryDateInput) {
      vchExpiryDateInput.min = defaults.minDate;
      if (!vchExpiryDateInput.value) {
        vchExpiryDateInput.value = defaults.defaultDate;
      }
    }
    if (vchExpiryTimeInput) {
      if (!vchExpiryTimeInput.value) {
        vchExpiryTimeInput.value = defaults.defaultTime;
      }
      if (vchExpiryDateInput && vchExpiryDateInput.value === defaults.minDate) {
        vchExpiryTimeInput.min = defaults.minTime;
      } else {
        vchExpiryTimeInput.removeAttribute('min');
      }
    }
  };

  const syncQuickDurationChipHighlight = () => {
    const method = vchExpMethodInput ? vchExpMethodInput.value : 'duration';
    const val = String(vchDurationValueInput?.value || '').trim();
    const unit = String(vchDurationUnitSelect?.value || 'hours').trim();
    const key = `${val}|${unit}`;
    document.querySelectorAll('[data-vch-quick-duration]').forEach((chip) => {
      const chipKey = chip.getAttribute('data-vch-quick-duration') || '';
      chip.classList.toggle('is-selected', method === 'duration' && chipKey === key);
    });
  };

  const syncVoucherExpirationPreview = () => {
    if (!vchPreviewBox || !vchPreviewText || !vchPreviewBadge) return;
    initVoucherCustomDateDefaults();
    const method = vchExpMethodInput ? vchExpMethodInput.value : 'duration';
    const calc = calculateExpirationFromInput(
      {
        expirationMethod: method,
        durationValue: vchDurationValueInput?.value,
        durationUnit: vchDurationUnitSelect?.value,
        expiryDate: vchExpiryDateInput?.value,
        expiryTime: vchExpiryTimeInput?.value,
      },
      Date.now()
    );

    if (!calc.ok) {
      vchPreviewBox.classList.add('is-invalid');
      vchPreviewText.textContent = calc.errorMessage || 'Invalid expiration settings.';
      vchPreviewBadge.textContent = 'Invalid Expiry';
      vchPreviewBadge.className = 'vch-remaining-badge vch-remaining-inactive';
      return;
    }

    vchPreviewBox.classList.remove('is-invalid');
    vchPreviewText.textContent = `Expires ${calc.formattedManila} (Asia/Manila)`;
    vchPreviewBadge.textContent = calc.remainingLabel;
    vchPreviewBadge.className =
      calc.remainingMs <= 3600 * 1000
        ? 'vch-remaining-badge vch-remaining-expiring'
        : 'vch-remaining-badge vch-remaining-active';
  };

  document.querySelectorAll('[data-vch-exp-method]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const method = btn.getAttribute('data-vch-exp-method') || 'duration';
      if (vchExpMethodInput) vchExpMethodInput.value = method;
      document.querySelectorAll('[data-vch-exp-method]').forEach((b) => {
        b.classList.toggle('is-active', b.getAttribute('data-vch-exp-method') === method);
      });
      if (vchDurationPanel) vchDurationPanel.classList.toggle('hidden', method !== 'duration');
      if (vchCustomExpiryPanel) vchCustomExpiryPanel.classList.toggle('hidden', method !== 'custom');
      syncQuickDurationChipHighlight();
      syncVoucherExpirationPreview();
    });
  });

  document.querySelectorAll('[data-vch-quick-duration]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const raw = chip.getAttribute('data-vch-quick-duration') || '24|hours';
      const [val, unit] = raw.split('|');
      if (vchExpMethodInput) vchExpMethodInput.value = 'duration';
      document.querySelectorAll('[data-vch-exp-method]').forEach((b) => {
        b.classList.toggle('is-active', b.getAttribute('data-vch-exp-method') === 'duration');
      });
      if (vchDurationPanel) vchDurationPanel.classList.remove('hidden');
      if (vchCustomExpiryPanel) vchCustomExpiryPanel.classList.add('hidden');
      if (vchDurationValueInput && val) vchDurationValueInput.value = val;
      if (vchDurationUnitSelect && unit) vchDurationUnitSelect.value = unit;
      syncQuickDurationChipHighlight();
      syncVoucherExpirationPreview();
    });
  });

  if (vchProductSelect) {
    vchProductSelect.addEventListener('change', () => {
      syncVoucherProductMaxPriceHint();
    });
  }
  if (vchDurationValueInput) {
    vchDurationValueInput.addEventListener('input', () => {
      syncQuickDurationChipHighlight();
      syncVoucherExpirationPreview();
    });
  }
  if (vchDurationUnitSelect) {
    vchDurationUnitSelect.addEventListener('change', () => {
      syncQuickDurationChipHighlight();
      syncVoucherExpirationPreview();
    });
  }
  if (vchExpiryDateInput) {
    vchExpiryDateInput.addEventListener('change', () => {
      syncVoucherExpirationPreview();
    });
  }
  if (vchExpiryTimeInput) {
    vchExpiryTimeInput.addEventListener('change', () => {
      syncVoucherExpirationPreview();
    });
  }

  const genVoucherBtn = document.getElementById('admin-generate-voucher-btn');
  if (genVoucherBtn) {
    genVoucherBtn.addEventListener('click', () => {
      const discountVal = Math.max(1, Math.round(Number(document.getElementById('vch-discount')?.value) || 300));
      const randomDigits = Math.floor(100 + Math.random() * 900);
      const codeInput = document.getElementById('vch-code');
      if (codeInput) {
        codeInput.value = `SAVE-${discountVal}-${randomDigits}`;
      }
    });
  }

  // Admin Issue Fixed-Amount Single-Product Voucher Form
  const vchForm = document.getElementById('admin-voucher-form');
  const vchErrorEl = document.getElementById('admin-voucher-form-error');
  const vchSubmitBtn = document.getElementById('admin-create-voucher-submit-btn');
  if (vchForm) {
    vchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const customerEmail = document.getElementById('vch-email')?.value.trim() || '';
      const furnitureId = document.getElementById('vch-product')?.value || '';
      const code = document.getElementById('vch-code')?.value.trim().toUpperCase() || '';
      const rawDiscountVal = Number(document.getElementById('vch-discount')?.value);
      const expirationMethod = vchExpMethodInput ? vchExpMethodInput.value : 'duration';
      const durationValue = Number(vchDurationValueInput?.value);
      const durationUnit = vchDurationUnitSelect?.value || 'hours';
      const expiryDate = vchExpiryDateInput?.value || '';
      const expiryTime = vchExpiryTimeInput?.value || '';

      const matchedCustomer = (state.customers || []).find(
        (c) => String(c.email || '').trim().toLowerCase() === customerEmail.toLowerCase()
      );
      const customerName = matchedCustomer
        ? matchedCustomer.fullName || matchedCustomer.name
        : '';

      const payloadInput = {
        customerEmail,
        customerName,
        furnitureId,
        code,
        discountAmount: rawDiscountVal,
        expirationMethod,
        durationValue,
        durationUnit,
        expiryDate,
        expiryTime,
        issuedByAdmin: state.sessionUser?.name || 'Lillia Mercier',
      };

      const localCheck = validateAndCreateVoucher(
        payloadInput,
        state.catalog,
        state.vouchers,
        Date.now()
      );

      if (!localCheck.ok) {
        if (vchErrorEl) {
          vchErrorEl.textContent = localCheck.errorMessage;
          vchErrorEl.classList.remove('hidden');
        }
        return;
      }

      if (vchErrorEl) vchErrorEl.classList.add('hidden');

      if (vchSubmitBtn) {
        vchSubmitBtn.disabled = true;
        vchSubmitBtn.textContent = 'Creating Voucher...';
      }

      try {
        let createdVoucher = localCheck.voucher;
        try {
          const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              action: 'create_voucher',
              voucher: payloadInput,
            }),
          });
          const data = await response.json();
          if (!response.ok || !data.ok) {
            throw new Error(data.error || 'Could not create voucher.');
          }
          if (data.voucher) {
            createdVoucher = data.voucher;
          }
          if (Array.isArray(data.vouchers)) {
            state.vouchers = data.vouchers;
          } else {
            state.vouchers = [createdVoucher, ...state.vouchers];
          }
        } catch (err) {
          if (err && err.message && !/fetch|network/i.test(err.message)) {
            if (vchErrorEl) {
              vchErrorEl.textContent = err.message;
              vchErrorEl.classList.remove('hidden');
            }
            return;
          }
          state.vouchers = [createdVoucher, ...state.vouchers];
          syncDatabaseStore('sync_store');
        }

        const codeEl = document.getElementById('vch-code');
        if (codeEl) codeEl.value = '';
        syncVoucherExpirationPreview();
        showAdminBanner(
          `Voucher ${createdVoucher.code} (${usd(createdVoucher.discountAmount)} OFF "${createdVoucher.furnitureName}") issued to ${createdVoucher.customerEmail}.`
        );
        renderDashboardContent();
      } finally {
        if (vchSubmitBtn) {
          vchSubmitBtn.disabled = false;
          vchSubmitBtn.textContent = 'Create Voucher';
        }
      }
    });
  }

  switchAdminTab(state.activeAdminTab || 'overview');
  renderDashboardContent();
  syncVoucherProductMaxPriceHint();
  syncVoucherExpirationPreview();
  startVoucherCountdownTicker();
}

let voucherCountdownTimerId = null;

function startVoucherCountdownTicker() {
  if (voucherCountdownTimerId) {
    clearInterval(voucherCountdownTimerId);
  }
  voucherCountdownTimerId = setInterval(() => {
    const nowMs = Date.now();
    let statusChanged = false;

    if (Array.isArray(state.vouchers) && state.vouchers.length > 0) {
      state.vouchers.forEach((v) => {
        const info = computeVoucherStatusInfo(v, nowMs);
        if (v.status !== info.status) {
          v.status = info.status;
          statusChanged = true;
        }
      });
    }

    if (statusChanged) {
      renderDashboardContent();
      return;
    }

    document.querySelectorAll('[data-voucher-countdown]').forEach((el) => {
      const key = el.getAttribute('data-voucher-countdown') || '';
      const matched = (state.vouchers || []).find(
        (v) =>
          String(v.id || '') === key ||
          String(v.code || '').toUpperCase() === key.toUpperCase()
      );
      if (!matched) return;
      const info = computeVoucherStatusInfo(matched, nowMs);
      el.textContent = info.remainingLabel;
    });
  }, 1000);
}

let pendingConfirmAction = null;
let pendingCancelAction = null;

function openAdminConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  onConfirm,
  onCancel = null,
}) {
  const modal = document.getElementById('admin-confirm-modal');
  const titleEl = document.getElementById('admin-confirm-title');
  const msgEl = document.getElementById('admin-confirm-message');
  const acceptBtn = document.getElementById('admin-confirm-accept');
  if (!modal) {
    if (typeof onConfirm === 'function') onConfirm();
    return;
  }
  if (titleEl) titleEl.textContent = title || 'Confirm Action';
  if (msgEl) msgEl.textContent = message || 'Are you sure you want to proceed?';
  if (acceptBtn) {
    acceptBtn.textContent = confirmLabel;
    acceptBtn.className =
      confirmVariant === 'primary'
        ? 'admin-btn admin-btn-primary'
        : 'admin-btn admin-btn-danger';
  }
  pendingConfirmAction = onConfirm;
  pendingCancelAction = onCancel;
  modal.classList.remove('hidden');
}

function showClientBanner(msg) {
  const banner = document.getElementById('client-action-banner');
  if (!banner) return;
  banner.textContent = `✓ ${msg}`;
  banner.classList.remove('hidden');
  setTimeout(() => {
    banner.classList.add('hidden');
  }, 3500);
}

function showAdminBanner(msg, isError = false) {
  const banner = document.getElementById('admin-status-banner');
  if (!banner) return;
  if (isError) {
    banner.className =
      'p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center justify-between gap-3';
  } else {
    banner.className =
      'p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between gap-3';
  }
  banner.innerHTML = `
    <span class="flex items-center gap-2">
      <span class="font-bold">${isError ? '!' : '✓'}</span>
      <span>${esc(msg)}</span>
    </span>
    <button type="button" id="admin-banner-dismiss" class="text-xs font-semibold ${isError ? 'text-rose-800' : 'text-emerald-800'} hover:underline cursor-pointer">Dismiss</button>
  `;
  banner.classList.remove('hidden');
  const dismissBtn = document.getElementById('admin-banner-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => banner.classList.add('hidden'));
  }
}

function renderDashboardContent() {
  const userEmail = state.sessionUser?.email || 'rowena.vance@vancearchitects.com';
  const clientViewEl = document.getElementById('client-portal-view');
  const adminViewEl = document.getElementById('admin-portal-view');
  const shouldRenderClient = !clientViewEl || !clientViewEl.classList.contains('hidden');
  const shouldRenderAdmin = !adminViewEl || !adminViewEl.classList.contains('hidden');

  if (shouldRenderClient) {
    const myOrders = state.orders.filter(
      (o) => String(o.clientEmail || '').trim().toLowerCase() === userEmail.toLowerCase()
    );
    const displayOrders = myOrders;

    // Strictly show ONLY vouchers assigned to the logged-in customer's email address
    const displayVouchers = filterCustomerVouchers(state.vouchers, userEmail);
    const usableCustomerVouchers = displayVouchers.filter(
      (v) => computeVoucherStatusInfo(v).isUsable
    );

    // Update Summary KPI Cards & Sidebar Badges
    const statOrders = document.getElementById('user-stat-orders');
    const statVouchers = document.getElementById('user-stat-vouchers');
    const statCart = document.getElementById('user-stat-cart');
    const badgeOrders = document.getElementById('sidebar-badge-orders');
    const badgeTransactions = document.getElementById('sidebar-badge-transactions');
    const badgeCart = document.getElementById('sidebar-badge-cart');
    const badgeVouchers = document.getElementById('sidebar-badge-vouchers');
    const cartQty = state.cartItems.reduce((sum, c) => sum + c.quantity, 0);
    const completedTransactions = getCompletedTransactionsForCustomer(displayOrders, userEmail);
    const activeClientOrdersCount = displayOrders.filter((o) => !isOrderCompleted(o)).length;

    if (statOrders) statOrders.textContent = `${activeClientOrdersCount} Active ${activeClientOrdersCount === 1 ? 'Order' : 'Orders'}`;
    if (statVouchers) statVouchers.textContent = `${usableCustomerVouchers.length} Ready to Use`;
    if (statCart) statCart.textContent = `${cartQty} ${cartQty === 1 ? 'Item' : 'Items'}`;
    if (badgeOrders) badgeOrders.textContent = String(displayOrders.length);
    if (badgeTransactions) badgeTransactions.textContent = String(completedTransactions.length);
    if (badgeCart) badgeCart.textContent = String(cartQty);
    if (badgeVouchers) badgeVouchers.textContent = String(usableCustomerVouchers.length);

    // Populate Home Tab Previews (Latest Order + Address Preview + Live Catalog Feed)
    const homeOrderPreview = document.getElementById('client-home-order-preview');
    if (homeOrderPreview) {
      if (displayOrders[0]) {
        const latest = displayOrders[0];
        const matched = state.catalog.find((p) => p.id === latest.furnitureId) || state.catalog[0];
        const imgUrl = (matched ? matched.image : 'assets/images/category_dining_tables.jpg').replace(/^\//, '');
        homeOrderPreview.innerHTML = `
        <div class="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <img src="${esc(imgUrl)}" alt="${esc(latest.furnitureName)}" class="w-16 h-16 rounded-xl object-cover border border-[#BCE3FF] shrink-0" />
            <div>
              <p class="font-mono-tech text-xs text-[#0077CC] font-bold">${esc(latest.status)} · #${esc(latest.orderNumber)}</p>
              <h3 class="font-serif-display text-base font-bold text-[#0D1015] mt-0.5">${esc(latest.furnitureName)}</h3>
              <p class="text-xs text-[#475569]">
                Finish: <strong class="text-[#0D1015]">${esc(latest.selectedFinish)}</strong> · Size: ${esc(latest.customDimensions || 'Standard Dimensions')}
              </p>
              <p class="text-[11px] text-[#64748B] mt-0.5">
                Workshop Material: <strong class="text-[#0D1015]">${esc(latest.materialName || 'FAS Hardwood')}</strong> · Est. Lead Time: <strong class="text-[#0077CC]">${esc(latest.estimatedDelivery)}</strong>
              </p>
            </div>
          </div>
          <p class="font-mono-tech text-lg font-bold text-[#0095FF] shrink-0">${usd(latest.totalAmount)}</p>
        </div>
        `;
      } else {
        homeOrderPreview.innerHTML = `
        <div class="pt-4 border-t border-[#E2E8F0] text-center py-6 space-y-2">
          <p class="text-sm font-bold text-[#0D1015]">No Active Orders Yet</p>
          <p class="text-xs text-[#64748B]">Explore our showroom catalog below or commission a custom piece to place your first order.</p>
        </div>
        `;
      }
    }

  const homeAddrPreview = document.getElementById('client-home-address-preview');
  if (homeAddrPreview) {
    const formattedAddr = [state.customerProfile.address, state.customerProfile.city]
      .map((s) => String(s || '').trim())
      .filter(Boolean)
      .join(', ');
    homeAddrPreview.innerHTML = `
    <div class="pt-4 border-t border-[#E2E8F0] space-y-1.5">
    <p class="font-serif-display text-sm font-bold text-[#0D1015]">${esc(state.customerProfile.name)}</p>
    <p class="font-mono-tech text-xs text-[#0077CC]">${esc(state.customerProfile.phone || 'No phone number added')}</p>
    <p class="text-xs text-[#0D1015]">${esc(formattedAddr || 'No delivery address added')}</p>
    ${
      state.customerProfile.notes
        ? `<p class="text-[11px] text-[#64748B] pt-1">${esc(state.customerProfile.notes)}</p>`
        : ''
    }
    </div>
    `;
  }

  // Live Showroom Catalog & Workshop Materials Feed on Customer Home Tab (#client-home-catalog-feed)
  const homeCatalogFeedEl = document.getElementById('client-home-catalog-feed');
  if (homeCatalogFeedEl) {
    const featuredItems = state.catalog.slice(0, 6);
    homeCatalogFeedEl.innerHTML = featuredItems
      .map((prod) => {
        const card = formatSimplifiedProductCardData(prod);
        const imgUrl = (card.image || 'assets/images/category_dining_tables.jpg').replace(/^\//, '');
        return `
    <div class="p-4 rounded-2xl border border-[#BCE3FF] bg-[#F8FBFF] flex flex-col justify-between gap-3 h-full">
    <div class="flex items-start gap-3.5">
    <img src="${esc(imgUrl)}" alt="${esc(card.name)}" class="w-16 h-16 rounded-xl object-cover border border-[#BCE3FF] shrink-0" />
    <div class="min-w-0 flex-1">
    <div class="flex items-center justify-between gap-1">
    <span class="text-[11px] font-semibold uppercase tracking-wider text-[#0077CC]">${esc(card.categoryName)}</span>
    <span class="text-[11px] font-mono-tech font-semibold ${
                    card.isOutOfStock
                      ? 'text-rose-700'
                      : card.isLowStock
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }">${esc(card.availabilityLabel)}</span>
    </div>
    <h3 class="font-serif-display text-sm font-bold text-[#0D1015] truncate mt-0.5">${esc(card.name)}</h3>
    <p class="text-[11px] text-[#475569] line-clamp-2 mt-0.5">${esc(card.description)}</p>
    <p class="text-[11px] text-[#64748B] font-mono-tech truncate mt-1">${esc(card.dimensions)} · ${esc(card.shippingTimeLabel)}</p>
    <div class="flex items-baseline gap-2 mt-1">
    <span class="font-mono-tech text-sm font-bold text-[#0095FF]">${usd(card.sellingPrice)}</span>
                  ${
                    card.hasDiscount && card.originalPrice !== null
                      ? `<span class="font-mono-tech text-[11px] text-slate-400 line-through">${usd(card.originalPrice)}</span>
    <span class="text-[10px] font-bold text-emerald-700">Save ${card.discountPercent}%</span>`
                      : ''
                  }
    </div>
    </div>
    </div>
    <div class="flex items-center gap-2 pt-2 border-t border-[#E2E8F0] mt-auto">
    <a href="catalog.html?category=${encodeURIComponent(prod.categoryId || 'all')}&product=${encodeURIComponent(card.id)}" class="flex-1 px-3 py-2 rounded-xl bg-[#0D1015] hover:bg-[#0095FF] text-white text-xs font-semibold transition-colors cursor-pointer text-center">
                ${esc(card.ctaLabel)}
    </a>
    </div>
    </div>
        `;
      })
      .join('');

    homeCatalogFeedEl.querySelectorAll('[data-client-quick-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-client-quick-add');
        const product = state.catalog.find((p) => p.id === pid);
        if (!product) return;
        const availableStock = Math.max(0, Math.floor(Number(product.inStockCount ?? 0)));
        if (availableStock <= 0) {
          showClientBanner(`"${product.name}" is currently Out of Stock.`);
          return;
        }
        const finish = product.defaultFinish || 'Natural Walnut';
        const existing = state.cartItems.find(
          (c) => c.product.id === product.id && c.finish === finish
        );
        if (existing) {
          existing.quantity += 1;
        } else {
          state.cartItems.push({ product, finish, quantity: 1 });
        }
        saveCartToStorage();
        showClientBanner(`Added "${product.name}" (${usd(product.effectivePrice)}) to your Cart.`);
        renderDashboardContent();
      });
    });

    homeCatalogFeedEl.querySelectorAll('[data-client-customize-prod]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-client-customize-prod') || '';
        state.clientCustomOrderInput.productId = pid;
        state.clientCustomOrderOpen = true;
        const ordersTabBtn = document.querySelector('[data-client-tab="orders"]');
        if (ordersTabBtn) ordersTabBtn.click();
        renderDashboardContent();
      });
    });
  }

  // Sync Address/Contact Form Input Values
  const setInputVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = val;
  };
  setInputVal('client-input-name', state.customerProfile.name);
  setInputVal('client-input-email', state.customerProfile.email);
  setInputVal('client-input-phone', state.customerProfile.phone);
  setInputVal('client-input-city', state.customerProfile.city);
  setInputVal('client-input-address', state.customerProfile.address);
  setInputVal('client-input-notes', state.customerProfile.notes);
  syncCustomerAvatarDOM(state.customerProfile);

  // Custom Furniture Commission Builder Card (#client-custom-order-card)
  const customOrderCardEl = document.getElementById('client-custom-order-card');
  const toggleCustomOrderBtnEl = document.getElementById('client-toggle-custom-order-btn');
  if (toggleCustomOrderBtnEl) {
    toggleCustomOrderBtnEl.textContent = state.clientCustomOrderOpen
      ? 'Close Custom Commission Builder'
      : '+ Commission Custom Piece';
  }
  if (customOrderCardEl) {
    customOrderCardEl.classList.toggle('hidden', !state.clientCustomOrderOpen);
    if (state.clientCustomOrderOpen) {
      const selectedBaseProd =
        state.catalog.find((p) => p.id === state.clientCustomOrderInput.productId) ||
        state.catalog[0];
      const availableMaterials = state.materials.filter((m) => Number(m.stockQuantity || 0) > 0);
      const selectedMat =
        availableMaterials.find((m) => m.id === state.clientCustomOrderInput.materialId) ||
        availableMaterials[0] ||
        state.materials[0];
      const basePrice = Number(selectedBaseProd?.effectivePrice || selectedBaseProd?.price || 2850);
      const matUnitCost = Number(selectedMat?.unitCost || 0);
      const extraCost = Math.max(250, Math.round(matUnitCost * 4));
      const estimatedTotal = basePrice + extraCost;

      customOrderCardEl.innerHTML = `
    <form id="client-custom-commission-form" novalidate class="space-y-5">
    <div class="pb-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
    <div>
    <p class="font-mono-tech text-xs uppercase tracking-widest text-[#0077CC] font-bold">Bespoke Workshop Commission (SQL Customization + Order_Item_Material)</p>
    <h3 class="font-serif-display text-lg font-bold text-[#0D1015] mt-0.5">Commission a Custom-Built Piece from Workshop Materials</h3>
    <p class="text-xs text-[#64748B]">Select a base piece, choose a workshop raw material supplied by our partners, and specify custom dimensions.</p>
    </div>
    <div class="sm:text-right">
    <p class="text-[11px] text-[#64748B]">Estimated Commission Total</p>
    <p class="font-mono-tech text-xl font-bold text-[#0095FF]">${usd(estimatedTotal)}</p>
    <p class="text-[11px] text-[#475569]">Base ${usd(basePrice)} + Material &amp; Joinery +${usd(extraCost)}</p>
    </div>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <div>
    <label for="cust-ord-product" class="block text-xs font-semibold text-[#0D1015] mb-1">Base Catalog Design</label>
    <select id="cust-ord-product" class="w-full px-3.5 py-2.5 rounded-xl border border-[#BCE3FF] bg-[#F8FBFF] text-xs font-semibold text-[#0D1015]">
                ${state.catalog
                  .map(
                    (p) =>
                      `<option value="${esc(p.id)}" ${p.id === selectedBaseProd?.id ? 'selected' : ''}>${esc(p.name)} (${usd(p.effectivePrice)})</option>`
                  )
                  .join('')}
    </select>
    </div>

    <div>
    <label for="cust-ord-material" class="block text-xs font-semibold text-[#0D1015] mb-1">Workshop Raw Material (Available Stock)</label>
    <select id="cust-ord-material" class="w-full px-3.5 py-2.5 rounded-xl border border-[#BCE3FF] bg-[#F8FBFF] text-xs font-semibold text-[#0D1015]">
                ${state.materials
                  .map(
                    (m) =>
                      `<option value="${esc(m.id)}" ${m.id === selectedMat?.id ? 'selected' : ''} ${Number(m.stockQuantity) <= 0 ? 'disabled' : ''}>${esc(m.name)} (${m.stockQuantity} ${esc(m.unit)} avail)</option>`
                  )
                  .join('')}
    </select>
    </div>

    <div>
    <label for="cust-ord-finish" class="block text-xs font-semibold text-[#0D1015] mb-1">Color / Oil Finish</label>
    <input id="cust-ord-finish" type="text" value="${esc(state.clientCustomOrderInput.colorFinish || 'Hand-Rubbed Tung Oil')}" class="w-full px-3.5 py-2.5 rounded-xl border border-[#BCE3FF] bg-[#F8FBFF] text-xs text-[#0D1015]" />
    </div>

    <div>
    <label for="cust-ord-length" class="block text-xs font-semibold text-[#0D1015] mb-1">Length (cm)</label>
    <input id="cust-ord-length" type="number" min="30" max="500" value="${esc(state.clientCustomOrderInput.lengthCm || '260')}" class="w-full px-3.5 py-2.5 rounded-xl border border-[#BCE3FF] bg-[#F8FBFF] font-mono-tech text-xs text-[#0D1015]" />
    </div>

    <div>
    <label for="cust-ord-width" class="block text-xs font-semibold text-[#0D1015] mb-1">Width (cm)</label>
    <input id="cust-ord-width" type="number" min="30" max="300" value="${esc(state.clientCustomOrderInput.widthCm || '105')}" class="w-full px-3.5 py-2.5 rounded-xl border border-[#BCE3FF] bg-[#F8FBFF] font-mono-tech text-xs text-[#0D1015]" />
    </div>

    <div>
    <label for="cust-ord-height" class="block text-xs font-semibold text-[#0D1015] mb-1">Height (cm)</label>
    <input id="cust-ord-height" type="number" min="25" max="250" value="${esc(state.clientCustomOrderInput.heightCm || '76')}" class="w-full px-3.5 py-2.5 rounded-xl border border-[#BCE3FF] bg-[#F8FBFF] font-mono-tech text-xs text-[#0D1015]" />
    </div>
    </div>

    <div>
    <label for="cust-ord-notes" class="block text-xs font-semibold text-[#0D1015] mb-1">Joinery &amp; Architectural Notes</label>
    <input id="cust-ord-notes" type="text" value="${esc(state.clientCustomOrderInput.notes || '')}" placeholder="e.g. Chamfered underside profile, concealed cable brass grommet, book-matched grain..." class="w-full px-3.5 py-2.5 rounded-xl border border-[#BCE3FF] bg-[#F8FBFF] text-xs text-[#0D1015]" />
    </div>

    <p id="client-custom-commission-error" class="hidden text-xs font-semibold text-rose-700"></p>

    <div class="flex items-center justify-end gap-3 pt-2">
    <button type="button" id="client-cancel-custom-commission-btn" class="px-4 py-2 rounded-xl border border-[#BCE3FF] text-xs font-semibold text-[#475569] hover:bg-[#F8FBFF] cursor-pointer">
              Cancel
    </button>
    <button type="submit" class="px-5 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer">
              Submit Custom Commission (${usd(estimatedTotal)})
    </button>
    </div>
    </form>
      `;

      const prodSelEl = document.getElementById('cust-ord-product');
      const matSelEl = document.getElementById('cust-ord-material');
      if (prodSelEl) {
        prodSelEl.addEventListener('change', (e) => {
          state.clientCustomOrderInput.productId = e.target.value;
          renderDashboardContent();
        });
      }
      if (matSelEl) {
        matSelEl.addEventListener('change', (e) => {
          state.clientCustomOrderInput.materialId = e.target.value;
          renderDashboardContent();
        });
      }
      const cancelCustBtn = document.getElementById('client-cancel-custom-commission-btn');
      if (cancelCustBtn) {
        cancelCustBtn.addEventListener('click', () => {
          state.clientCustomOrderOpen = false;
          renderDashboardContent();
        });
      }

      const custFormEl = document.getElementById('client-custom-commission-form');
      if (custFormEl) {
        custFormEl.addEventListener('submit', (e) => {
          e.preventDefault();
          const productId = document.getElementById('cust-ord-product')?.value || '';
          const materialId = document.getElementById('cust-ord-material')?.value || '';
          const colorFinish = document.getElementById('cust-ord-finish')?.value || 'Natural Oil';
          const lengthCm = document.getElementById('cust-ord-length')?.value || 240;
          const widthCm = document.getElementById('cust-ord-width')?.value || 100;
          const heightCm = document.getElementById('cust-ord-height')?.value || 75;
          const notes = document.getElementById('cust-ord-notes')?.value || '';

          const res = createCustomOrderRequest({
            catalog: state.catalog,
            materials: state.materials,
            customerProfile: {
              name: state.customerProfile.name,
              email: userEmail,
            },
            customInput: {
              productId,
              materialId,
              lengthCm,
              widthCm,
              heightCm,
              colorFinish,
              notes,
              extraCost,
              materialQtyUsed: 2,
            },
          });

          const errEl = document.getElementById('client-custom-commission-error');
          if (!res.ok) {
            if (errEl) {
              errEl.textContent = res.errorMessage;
              errEl.classList.remove('hidden');
            }
            return;
          }

          // Deduct allocated raw material from Workshop Material Inventory
          const matMove = applyMaterialStockMovement({
            materials: state.materials,
            adminName: `${state.customerProfile.name} (Custom Order #${res.order.orderNumber})`,
            movementInput: {
              materialId,
              transactionType: 'Stock Out',
              quantity: 2,
              reason: `Allocated to Custom Order #${res.order.orderNumber} (${res.order.furnitureName})`,
              date: new Date().toISOString().slice(0, 10),
            },
          });
          if (matMove.ok) {
            state.materials = matMove.updatedMaterials;
            saveMaterialsToStorage();
            state.inventoryTransactions.unshift(matMove.transaction);
            saveInventoryTransactionsToStorage();
          }

          state.orders.unshift(res.order);
          saveOrdersToStorage();
          state.clientCustomOrderOpen = false;
          showClientBanner(
            `Custom Commission #${res.order.orderNumber} submitted! Material "${res.order.materialName}" allocated for workshop production.`
          );
          renderDashboardContent();
        });
      }
    }
  }

  // 1. User-Friendly Customer Orders List (With Live Admin Production, Craftsperson, Material & Payment Actions)
  const friendlyOrdersEl = document.getElementById('client-orders-friendly-list');
  if (friendlyOrdersEl) {
    friendlyOrdersEl.innerHTML =
      displayOrders.length === 0
        ? `
    <div class="bg-white rounded-3xl border border-[#BCE3FF] p-8 text-center space-y-3 shadow-2xs">
      <p class="font-serif-display text-lg font-bold text-[#0D1015]">You Have Not Placed Any Orders Yet</p>
      <p class="text-xs text-[#64748B] max-w-md mx-auto">
        Once you checkout from your Cart or submit a Custom Commission above, your live workshop production progress will appear here.
      </p>
      <div class="pt-1">
        <a href="catalog.html" class="inline-flex items-center px-5 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors">
          Browse Furniture Catalog →
        </a>
      </div>
    </div>
        `
        : displayOrders
      .map((ord) => {
        const matchedProd = state.catalog.find((p) => p.id === ord.furnitureId) || state.catalog[0];
        const imgUrl = (matchedProd ? matchedProd.image : 'assets/images/category_dining_tables.jpg').replace(/^\//, '');

        // Map workshop status to 4 friendly customer steps
        const isCompleted = isOrderCompleted(ord);
        let friendlyStep = 1;
        if (ord.status.includes('Joinery') || ord.status.includes('Finishing') || ord.status.includes('Timber')) friendlyStep = 2;
        if (ord.status.includes('Quality')) friendlyStep = 3;
        if (isCompleted || ord.status.includes('Dispatched') || ord.status.includes('Delivered')) friendlyStep = 4;
        const pct = Math.round((friendlyStep / 4) * 100);

        const totalAmt = Number(ord.totalAmount || 0);
        const paidAmt = Number(ord.depositPaid ?? totalAmt);
        const balanceDue = Math.max(0, totalAmt - paidAmt);
        const isCancelled = /Cancelled/i.test(String(ord.status || '')) || ord.sqlStatus === 'Cancelled';
        const isCancelPending = Boolean(ord.cancellationRequested) && !isCancelled;
        const canCancel = friendlyStep < 4 && !isCancelled && !isCancelPending && !isCompleted;

        return `
    <article class="bg-white rounded-3xl border border-[#BCE3FF] p-6 sm:p-7 shadow-2xs space-y-6">
    <div class="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
    <div class="flex items-center gap-4">
    <img src="${esc(imgUrl)}" alt="${esc(ord.furnitureName)}" class="w-20 h-20 rounded-2xl object-cover border border-[#BCE3FF] shrink-0" />
    <div>
    <div class="flex flex-wrap items-center gap-2 text-xs">
    <span class="font-semibold ${isCancelled ? 'text-rose-700' : isCompleted ? 'text-emerald-700' : 'text-[#0077CC]'}">${esc(ord.status)}</span>
    <span aria-hidden="true">·</span>
    <span class="font-mono-tech text-[#64748B]">Order #${esc(ord.orderNumber)}</span>
                    ${
                      ord.itemType === 'Custom'
                        ? `<span class="px-2 py-0.5 rounded bg-[#EBF6FF] text-[#0077CC] font-mono-tech text-[11px] font-bold">Custom Commission</span>`
                        : ''
                    }
                    ${
                      isCompleted
                        ? `<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold">✓ Completed · In Completed Transactions</span>`
                        : ''
                    }
                    ${
                      isCancelPending
                        ? `<span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold">Cancellation Pending Admin Approval</span>`
                        : ''
                    }
                    ${
                      !isCancelPending && ord.cancellationStatus === 'Declined'
                        ? `<span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-semibold">Cancellation Declined by Admin</span>`
                        : ''
                    }
    </div>
    <h3 class="font-serif-display text-xl font-bold text-[#0D1015] mt-1">
                    ${esc(ord.furnitureName)}
    </h3>
    <p class="text-xs text-[#475569] mt-0.5">
                    Color Finish: <span class="font-semibold text-[#0D1015]">${esc(ord.selectedFinish)}</span> · Size: ${esc(ord.customDimensions)}
    </p>
    <p class="text-xs text-[#475569] mt-0.5">
                    Workshop Material: <span class="font-semibold text-[#0D1015]">${esc(ord.materialName || 'FAS American Black Walnut Slabs')}</span> (${ord.materialQtyUsed || 1} ${esc(ord.materialUnit || 'units')})
    </p>
    </div>
    </div>

    <div class="sm:text-right shrink-0">
    <p class="text-xs text-[#64748B]">${balanceDue > 0 ? `Paid ${usd(paidAmt)} · Balance Due ${usd(balanceDue)}` : 'Paid in Full'}</p>
    <p class="font-mono-tech text-2xl font-bold text-[#0095FF]">${usd(totalAmt)}</p>
    <p class="text-[11px] text-[#475569] mt-0.5">Est. Delivery: <span class="font-semibold text-[#0D1015]">${esc(ord.estimatedDelivery)}</span></p>
    </div>
    </div>

    <div class="grid sm:grid-cols-2 gap-3 text-xs">
    <div class="p-3 rounded-xl bg-[#F8FBFF] border border-[#E2E8F0]">
    <p class="text-[#64748B]">Workshop Material &amp; Spec</p>
    <p class="font-semibold text-[#0D1015] mt-0.5">${esc(ord.materialName || 'FAS American Black Walnut Slabs')} (${ord.materialQtyUsed || 1} ${esc(ord.materialUnit || 'units')})</p>
    </div>
    <div class="p-3 rounded-xl bg-[#F8FBFF] border border-[#E2E8F0]">
    <p class="text-[#64748B]">Payment Status</p>
    <p class="font-semibold ${balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'} mt-0.5">
                  ${balanceDue > 0 ? `50% Deposit Paid (${usd(balanceDue)} remaining)` : '100% Settled · Verified'}
    </p>
    </div>
    </div>

    <div class="p-4 rounded-2xl bg-[#F8FBFF] border border-[#E2E8F0] space-y-3">
    <div class="flex items-center justify-between text-xs">
    <span class="font-semibold text-[#0D1015]">Workshop &amp; Delivery Progress</span>
    <span class="font-mono-tech font-bold ${isCancelled ? 'text-rose-600' : 'text-[#0095FF]'}">${isCancelled ? 'Order Cancelled' : `${pct}% Complete`}</span>
    </div>
    <div class="w-full h-2.5 rounded-full bg-[#E2E8F0] overflow-hidden">
    <div class="h-full rounded-full ${isCancelled ? 'bg-rose-500' : 'bg-[#0095FF]'} transition-all" style="width: ${isCancelled ? 100 : pct}%"></div>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                ${FRIENDLY_CUSTOMER_STEPS.map((label, idx) => {
                  const active = !isCancelled && idx + 1 <= friendlyStep;
                  return `
    <div class="flex items-center gap-1.5 text-[11px] ${active ? 'text-[#0D1015] font-bold' : 'text-[#94A3B8]'}">
    <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                        active ? 'bg-[#0095FF] text-white' : 'bg-[#E2E8F0] text-[#64748B]'
                      }">
                        ${active ? '✓' : idx + 1}
    </span>
    <span>${esc(label)}</span>
    </div>
                  `;
                }).join('')}
    </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-[#475569]">
    <span>Delivery Address: <strong class="text-[#0D1015]">${esc([state.customerProfile.address, state.customerProfile.city].filter(Boolean).join(', ') || ord.deliveryAddress || 'Showroom Pickup')}</strong></span>
    <div class="flex flex-wrap items-center gap-2.5">
                ${
                  isCompleted
                    ? `<button type="button" data-client-view-tx="${esc(ord.orderNumber)}" class="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold transition-colors cursor-pointer">
                        View in Transaction Orders →
                      </button>`
                    : ''
                }
                ${
                  balanceDue > 0 && !isCancelled
                    ? `<button type="button" data-client-pay-order="${esc(ord.orderNumber)}" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer">
                        Pay Remaining Balance (${usd(balanceDue)})
    </button>`
                    : ''
                }
                ${
                  isCancelPending
                    ? `<span class="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold">
                        Cancellation Sent · Waiting for Admin Approval
                      </span>`
                    : canCancel
                    ? `<button type="button" data-client-cancel-order="${esc(ord.orderNumber)}" class="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer">
                        Request Cancel Order
    </button>`
                    : ''
                }
    <a href="${ADMIN_MESSENGER_PLACEHOLDER_URL}" target="_blank" rel="noopener noreferrer" class="font-semibold text-[#0095FF] hover:underline">
                  Ask Owner About This Order on Messenger ↗
    </a>
    </div>
    </div>
    </article>
        `;
      })
      .join('');

    friendlyOrdersEl.querySelectorAll('[data-client-view-tx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const txTabBtn = document.querySelector('[data-client-tab="transactions"]');
        if (txTabBtn) txTabBtn.click();
      });
    });

    friendlyOrdersEl.querySelectorAll('[data-client-pay-order]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const orderNumber = btn.getAttribute('data-client-pay-order') || '';
        const res = recordCustomerOrderPayment({
          orders: state.orders,
          orderNumber,
          paymentMethod: 'Card',
        });
        if (!res.ok) {
          showClientBanner(res.errorMessage || 'Unable to process payment.');
          return;
        }
        state.orders = res.updatedOrders;
        saveOrdersToStorage();
        showClientBanner(
          `Paid remaining balance of ${usd(res.amountPaid)} for Order #${orderNumber}. Synced with Transactions & Admin Orders.`
        );
        renderDashboardContent();
      });
    });

    friendlyOrdersEl.querySelectorAll('[data-client-cancel-order]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const orderNumber = btn.getAttribute('data-client-cancel-order') || '';
        const res = requestOrderCancellation({
          orders: state.orders,
          orderNumber,
        });
        if (!res.ok) {
          showClientBanner(res.errorMessage || 'Unable to request cancellation.');
          return;
        }
        state.orders = res.updatedOrders;
        saveOrdersToStorage();
        showClientBanner(
          `Cancellation request for Order #${orderNumber} has been sent to the Admin for approval.`
        );
        renderDashboardContent();
      });
    });
  }

  // 2. Customer Completed Transactions Ledger Table (Reference, Order #, Completed Date, Product & Finish, Status, Amount)
  const txTbody = document.getElementById('client-transactions-tbody');
  const txTotalEl = document.getElementById('client-transactions-total');
  if (txTbody) {
    const transactions = completedTransactions;
    const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    if (txTotalEl) txTotalEl.textContent = usd(totalVolume);

    txTbody.innerHTML =
      transactions.length === 0
        ? `
    <tr>
      <td colspan="6" class="py-8 text-center text-xs text-[#64748B]">
        No completed transaction orders yet. Once the Admin marks your order as Complete, it will appear here automatically.
      </td>
    </tr>
        `
        : transactions
      .map(
        (tx) => `
    <tr data-testid="client-transaction-row-${esc(tx.orderNumber)}">
      <td class="font-mono-tech text-xs font-bold text-[#0D1015] whitespace-nowrap">${esc(tx.txId)}</td>
      <td class="font-mono-tech text-xs font-bold text-[#0095FF] whitespace-nowrap">#${esc(tx.orderNumber)}</td>
      <td class="font-mono-tech text-xs text-[#475569] whitespace-nowrap">${esc(tx.date)}</td>
      <td class="admin-col-primary">
        <p class="admin-table-title">${esc(tx.piece)}</p>
        <p class="admin-table-sub">${esc(tx.finish)} · ${esc(tx.dimensions || 'Standard Dimensions')}</p>
      </td>
      <td class="whitespace-nowrap">
        <span class="admin-status-badge admin-status-in-stock">
          <span class="admin-status-badge-dot"></span>${esc(tx.status || 'Completed')}
        </span>
      </td>
      <td class="text-right font-mono-tech font-bold text-[#0D1015] whitespace-nowrap">${usd(tx.amount)}</td>
    </tr>
        `
      )
      .join('');
  }

  // 3. Customer Shopping Cart Items, Summary & Quick-Add Selector
  const cartSelect = document.getElementById('client-cart-add-select');
  if (cartSelect) {
    cartSelect.innerHTML = state.catalog
      .map((p) => `<option value="${esc(p.id)}">${esc(p.name)} (${usd(p.effectivePrice)})</option>`)
      .join('');
  }

  const cartEmptyEl = document.getElementById('client-cart-empty-state');
  const cartWorkspaceEl = document.getElementById('client-cart-workspace');
  const cartItemsListEl = document.getElementById('client-cart-items-list');

  if (cartEmptyEl && cartWorkspaceEl && cartItemsListEl) {
    if (state.cartItems.length === 0) {
      cartEmptyEl.classList.remove('hidden');
      cartWorkspaceEl.classList.add('hidden');
      cartItemsListEl.innerHTML = '';
      if (state.appliedVoucher) state.appliedVoucher = null;
    } else {
      cartEmptyEl.classList.add('hidden');
      cartWorkspaceEl.classList.remove('hidden');

      // Re-validate applied voucher in case target item was removed
      if (state.appliedVoucher) {
        const recheck = validateVoucherForOrder(
          state.vouchers,
          state.appliedVoucher.code,
          userEmail,
          state.cartItems,
          state.catalog
        );
        if (!recheck.valid) {
          state.appliedVoucher = null;
          const feedbackEl = document.getElementById('client-cart-voucher-feedback');
          if (feedbackEl) {
            feedbackEl.classList.remove('hidden');
            feedbackEl.textContent = `✕ ${recheck.errorMessage}`;
            feedbackEl.className = 'text-xs font-semibold text-rose-700';
          }
        }
      }

      const linePrices = state.cartItems.map((c) => ({
        productId: c.product.id,
        productName: c.product.name,
        finish: c.finish,
        unitPrice: computeVariantPricing(c.product, c.finish).effectivePrice,
        quantity: c.quantity,
      }));
      const totals = calculateOrderPricing(linePrices, state.appliedVoucher);

      cartItemsListEl.innerHTML = state.cartItems
        .map((entry, idx) => {
          const item = entry.product;
          const imgUrl = (item.image || 'assets/images/category_living_lounge.jpg').replace(/^\//, '');
          const pricing = computeVariantPricing(item, entry.finish);
          const breakdown = totals.lineBreakdowns[idx] || {
            rawLineTotal: pricing.effectivePrice * entry.quantity,
            finalLineTotal: pricing.effectivePrice * entry.quantity,
            lineDiscount: 0,
            isVoucherEligible: false,
          };
          return `
    <article class="bg-white rounded-3xl border border-[#BCE3FF] p-5 shadow-2xs flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
    <div class="flex items-center gap-4 min-w-0">
    <img src="${esc(imgUrl)}" alt="${esc(item.name)}" class="w-20 h-20 rounded-2xl object-cover border border-[#BCE3FF] shrink-0" />
    <div class="min-w-0 space-y-1">
    <div class="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
    <span class="font-mono-tech font-bold text-[#0095FF]">${esc(item.sku)}</span>
    <span>· ${esc(item.categoryName)}</span>
    </div>
    <h3 class="font-serif-display text-lg font-bold text-[#0D1015] truncate">${esc(item.name)}</h3>
    <p class="text-xs text-[#475569]">Finish: <span class="font-semibold text-[#0D1015]">${esc(entry.finish)}</span> · ${usd(pricing.effectivePrice)} each</p>
                  ${
                    state.appliedVoucher
                      ? breakdown.isVoucherEligible && breakdown.lineDiscount > 0
                        ? `<p class="text-xs font-semibold text-emerald-700 pt-0.5">✓ Voucher ${esc(state.appliedVoucher.code)} (${esc(breakdown.voucherBadge)} · -${usd(breakdown.lineDiscount)})</p>`
                        : `<p class="text-xs font-medium text-[#64748B] pt-0.5">Voucher: No discount (Original price retained)</p>`
                      : ''
                  }
    <div class="flex flex-wrap items-center gap-3 pt-1">
    <div class="inline-flex items-center rounded-xl border border-[#BCE3FF] bg-[#F8FBFF]">
    <button type="button" data-client-cart-qty-idx="${idx}" data-client-cart-delta="-1" aria-label="Decrease quantity" class="px-3 py-1 text-xs font-bold text-[#0D1015] hover:bg-[#EBF6FF] rounded-l-xl cursor-pointer">
                        −
    </button>
    <span class="px-3 py-1 font-mono-tech text-xs font-bold text-[#0D1015]">${entry.quantity}</span>
    <button type="button" data-client-cart-qty-idx="${idx}" data-client-cart-delta="1" aria-label="Increase quantity" class="px-3 py-1 text-xs font-bold text-[#0D1015] hover:bg-[#EBF6FF] rounded-r-xl cursor-pointer">
                        +
    </button>
    </div>
    <button type="button" data-client-cart-remove="${idx}" class="text-xs font-semibold text-rose-700 hover:underline cursor-pointer">
                      Remove
    </button>
    </div>
    </div>
    </div>
    <div class="sm:text-right shrink-0">
                ${
                  breakdown.isVoucherEligible && breakdown.lineDiscount > 0
                    ? `<p class="font-mono-tech text-xs text-slate-400 line-through">${usd(breakdown.rawLineTotal)}</p>
    <p class="font-mono-tech text-lg font-bold text-emerald-700">${usd(breakdown.finalLineTotal)}</p>`
                    : `<p class="font-mono-tech text-lg font-bold text-[#0D1015]">${usd(breakdown.rawLineTotal)}</p>`
                }
    <a href="${ADMIN_MESSENGER_PLACEHOLDER_URL}" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-[#0095FF] hover:underline">
                  Make Offer ↗
    </a>
    </div>
    </article>
          `;
        })
        .join('');

      cartItemsListEl.querySelectorAll('[data-client-cart-qty-idx]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-client-cart-qty-idx'));
          const delta = Number(btn.getAttribute('data-client-cart-delta'));
          if (!state.cartItems[idx]) return;
          const itemProd =
            state.catalog.find((p) => p.id === state.cartItems[idx].product.id) ||
            state.cartItems[idx].product;
          const maxStock = Math.max(0, Math.floor(Number(itemProd.inStockCount ?? 0)));
          const totalForProduct = state.cartItems
            .filter((c) => c.product.id === itemProd.id)
            .reduce((sum, c) => sum + c.quantity, 0);

          if (delta > 0 && totalForProduct >= maxStock) {
            showClientBanner(`Only ${maxStock} units of "${itemProd.name}" are available in stock.`);
            return;
          }

          const nextQty = state.cartItems[idx].quantity + delta;
          if (nextQty <= 0) {
            state.cartItems.splice(idx, 1);
          } else {
            state.cartItems[idx].quantity = nextQty;
          }
          saveCartToStorage();
          renderDashboardContent();
        });
      });

      cartItemsListEl.querySelectorAll('[data-client-cart-remove]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-client-cart-remove'));
          const removed = state.cartItems[idx];
          state.cartItems.splice(idx, 1);
          saveCartToStorage();
          showClientBanner(`Removed "${removed ? removed.product.name : 'Item'}" from your Cart.`);
          renderDashboardContent();
        });
      });

      const subtotalEl = document.getElementById('client-cart-subtotal');
      const voucherRow = document.getElementById('client-cart-voucher-row');
      const voucherDiscountEl = document.getElementById('client-cart-voucher-discount');
      const deliveryEl = document.getElementById('client-cart-delivery');
      const totalEl = document.getElementById('client-cart-total');

      if (subtotalEl) subtotalEl.textContent = usd(totals.rawSubtotal);
      if (voucherRow && voucherDiscountEl) {
        if (totals.voucherDiscountAmount > 0) {
          voucherRow.classList.remove('hidden');
          voucherRow.classList.add('flex');
          voucherDiscountEl.textContent = `-${usd(totals.voucherDiscountAmount)}`;
        } else {
          voucherRow.classList.add('hidden');
          voucherRow.classList.remove('flex');
        }
      }
      if (deliveryEl) deliveryEl.textContent = usd(totals.whiteGloveDeliveryFee);
      if (totalEl) totalEl.textContent = usd(totals.totalAmount);

      // Display Customer's Eligible Vouchers right inside Checkout (#client-tab-cart)
      const voucherInputEl = document.getElementById('client-cart-voucher-input');
      const voucherCardParent = voucherInputEl ? voucherInputEl.closest('.space-y-2') : null;
      if (voucherCardParent) {
        let quickWalletEl = document.getElementById('client-cart-available-vouchers');
        if (!quickWalletEl) {
          quickWalletEl = document.createElement('div');
          quickWalletEl.id = 'client-cart-available-vouchers';
          quickWalletEl.className = 'pt-2 space-y-2';
          voucherCardParent.appendChild(quickWalletEl);
        }
        if (displayVouchers.length === 0) {
          quickWalletEl.innerHTML = `<p class="text-[11px] text-[#64748B]">No vouchers are currently assigned to ${esc(userEmail)}.</p>`;
        } else {
          quickWalletEl.innerHTML = `
            <p class="text-[11px] font-bold uppercase tracking-wider text-[#0077CC]">Your Assigned Vouchers (${displayVouchers.length})</p>
            <div class="space-y-2">
              ${displayVouchers
                .map((v) => {
                  const statusInfo = computeVoucherStatusInfo(v);
                  const expInfo = formatVoucherExpiryDisplay(v);
                  const isInCart = state.cartItems.some(
                    (c) => c.product.id === (v.furnitureId || v.productId)
                  );
                  const isApplied =
                    state.appliedVoucher &&
                    String(state.appliedVoucher.code).toUpperCase() === String(v.code).toUpperCase();
                  return `
                    <div class="p-2.5 rounded-xl border border-[#BCE3FF] bg-white flex flex-col gap-1.5 text-xs">
                      <div class="flex items-center justify-between gap-2">
                        <span class="vch-code-chip">${esc(v.code)}</span>
                        <span class="admin-status-badge ${statusInfo.badgeClass}">
                          <span class="admin-status-badge-dot"></span>${esc(statusInfo.status)}
                        </span>
                      </div>
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-semibold text-[#0D1015] truncate">${esc(v.furnitureName || v.productName)}</span>
                        <span class="font-mono-tech font-bold text-[#0095FF] shrink-0">-${usd(v.discountAmount)}</span>
                      </div>
                      <div class="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
                        <span>Exp: ${esc(expInfo.full)}</span>
                        ${
                          statusInfo.isUsable && statusInfo.expiresAtMs
                            ? `<span data-voucher-countdown="${esc(v.id)}" data-voucher-expires="${statusInfo.expiresAtMs}" data-voucher-status="${esc(statusInfo.status)}" class="font-mono-tech font-semibold ${statusInfo.isExpiringSoon ? 'text-amber-700' : 'text-emerald-700'}">${esc(statusInfo.remainingLabel)}</span>`
                            : `<span>${esc(statusInfo.remainingLabel)}</span>`
                        }
                      </div>
                      ${
                        statusInfo.isUsable
                          ? `<button type="button" data-cart-quick-apply="${esc(v.code)}" data-cart-quick-product="${esc(v.furnitureId || v.productId)}" class="mt-0.5 w-full py-1.5 px-2.5 rounded-lg ${isApplied ? 'bg-emerald-600 text-white' : 'bg-[#EBF6FF] hover:bg-[#0095FF] text-[#0077CC] hover:text-white'} text-xs font-semibold transition-colors cursor-pointer">
                              ${isApplied ? '✓ Applied to Order' : isInCart ? 'Apply Voucher Now' : 'Add Eligible Product & Apply'}
                            </button>`
                          : ''
                      }
                    </div>
                  `;
                })
                .join('')}
            </div>
          `;

          quickWalletEl.querySelectorAll('[data-cart-quick-apply]').forEach((btn) => {
            btn.addEventListener('click', () => {
              const vCode = btn.getAttribute('data-cart-quick-apply') || '';
              const pid = btn.getAttribute('data-cart-quick-product') || '';
              const inCart = state.cartItems.some((c) => c.product.id === pid);
              if (!inCart) {
                const prod = state.catalog.find((p) => p.id === pid);
                if (prod && Number(prod.inStockCount ?? 0) > 0) {
                  const finish = prod.defaultFinish || 'Natural Finish';
                  state.cartItems.push({ product: prod, finish, quantity: 1 });
                  saveCartToStorage();
                }
              }
              if (voucherInputEl) voucherInputEl.value = vCode;
              const applyBtn = document.getElementById('client-cart-apply-voucher-btn');
              if (applyBtn) applyBtn.click();
            });
          });
        }
      }
    }
  }

  // 4. Customer Voucher Wallet (#client-vouchers-friendly-list) with Live Countdown & Complete Details
  const friendlyVouchersEl = document.getElementById('client-vouchers-friendly-list');
  if (friendlyVouchersEl) {
    if (displayVouchers.length === 0) {
      friendlyVouchersEl.innerHTML = `
        <div class="col-span-full p-8 rounded-3xl border border-[#BCE3FF] bg-[#F8FBFF] text-center space-y-2">
          <p class="font-serif-display text-lg font-bold text-[#0D1015]">No Vouchers Assigned Yet</p>
          <p class="text-xs text-[#475569] max-w-md mx-auto">
            Personal fixed-amount discount vouchers issued to <strong>${esc(userEmail)}</strong> by our showroom administrator will appear here automatically.
          </p>
        </div>
      `;
    } else {
      friendlyVouchersEl.innerHTML = displayVouchers
        .map((v) => {
          const statusInfo = computeVoucherStatusInfo(v);
          const issuedInfo = formatVoucherIssuedDisplay(v);
          const expiryInfo = formatVoucherExpiryDisplay(v);
          const discountAmt = Number(v.discountAmount ?? v.discountValue ?? 0);
          const matchedProd = state.catalog.find((p) => p.id === (v.furnitureId || v.productId));
          const prodPrice = Number(matchedProd?.effectivePrice ?? matchedProd?.price ?? v.productPrice ?? 0);

          const remainingPillClass = !statusInfo.isUsable
            ? 'vch-remaining-inactive'
            : statusInfo.isExpiringSoon
            ? 'vch-remaining-expiring'
            : 'vch-remaining-active';

          return `
            <div class="p-5 sm:p-6 rounded-3xl border border-[#BCE3FF] bg-white space-y-4 shadow-2xs flex flex-col justify-between ${!statusInfo.isUsable ? 'opacity-75' : ''}">
              <div class="space-y-3.5">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#EBF6FF] border border-[#BCE3FF] font-mono-tech text-xs font-bold text-[#0077CC]">
                      ${usd(discountAmt)} OFF FIXED DISCOUNT
                    </span>
                    <h3 class="font-serif-display text-base sm:text-lg font-bold text-[#0D1015] mt-2">
                      ${esc(v.furnitureName || v.productName)}
                    </h3>
                    <p class="text-xs text-[#64748B] font-mono-tech mt-0.5">
                      Eligible Product · ${esc(v.furnitureSku || 'LR-ITEM')}${prodPrice > 0 ? ` · Listed ${usd(prodPrice)}` : ''}
                    </p>
                  </div>
                  <span class="admin-status-badge ${statusInfo.badgeClass}">
                    <span class="admin-status-badge-dot"></span>${esc(statusInfo.status)}
                  </span>
                </div>

                <div class="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#F8FBFF] border border-[#BCE3FF]">
                  <div>
                    <span class="block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Voucher Code</span>
                    <code class="font-mono-tech text-sm font-bold text-[#0D1015]">${esc(v.code)}</code>
                  </div>
                  <button
                    type="button"
                    data-copy-voucher="${esc(v.code)}"
                    class="px-3 py-1.5 rounded-lg bg-[#EBF6FF] hover:bg-[#0095FF] text-[#0077CC] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Copy Code
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Issued (PHT)</span>
                    <span class="font-semibold text-slate-800 block mt-0.5">${esc(issuedInfo.primary)}</span>
                    <span class="text-[11px] text-slate-500">${esc(issuedInfo.secondary)}</span>
                  </div>
                  <div>
                    <span class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Expires (PHT)</span>
                    <span class="font-semibold text-slate-800 block mt-0.5">${esc(expiryInfo.primary)}</span>
                    <span class="text-[11px] text-slate-500">${esc(expiryInfo.secondary)}</span>
                  </div>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Remaining Time</span>
                  ${
                    statusInfo.isUsable && statusInfo.expiresAtMs
                      ? `<span data-voucher-countdown="${esc(v.id)}" data-voucher-expires="${statusInfo.expiresAtMs}" data-voucher-status="${esc(statusInfo.status)}" class="vch-remaining-badge ${remainingPillClass}">${esc(statusInfo.remainingLabel)}</span>`
                      : `<span class="vch-remaining-badge ${remainingPillClass}">${esc(statusInfo.remainingLabel)}</span>`
                  }
                </div>
                ${
                  statusInfo.isUsable
                    ? `<button
                        type="button"
                        data-use-voucher-product="${esc(v.furnitureId || v.productId)}"
                        data-use-voucher-code="${esc(v.code)}"
                        class="px-3.5 py-2 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Use in Checkout →
                      </button>`
                    : `<span class="text-xs font-semibold text-slate-400 cursor-not-allowed">Unavailable (${esc(statusInfo.status)})</span>`
                }
              </div>
            </div>
          `;
        })
        .join('');
    }

    friendlyVouchersEl.querySelectorAll('[data-copy-voucher]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-copy-voucher') || '';
        if (navigator.clipboard) {
          navigator.clipboard.writeText(code).catch(() => {});
        }
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = 'Copy Code';
        }, 1800);
      });
    });

    friendlyVouchersEl.querySelectorAll('[data-use-voucher-product]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-use-voucher-product');
        const vCode = btn.getAttribute('data-use-voucher-code') || '';
        const matchedVoucher = state.vouchers.find(
          (v) => String(v.code || '').toUpperCase() === vCode.toUpperCase()
        );
        if (matchedVoucher && !computeVoucherStatusInfo(matchedVoucher).isUsable) {
          showClientBanner(`Voucher "${vCode}" is no longer usable.`);
          renderDashboardContent();
          return;
        }
        const product = state.catalog.find((p) => p.id === pid);
        if (product) {
          const availableStock = Math.max(0, Math.floor(Number(product.inStockCount ?? 0)));
          if (availableStock <= 0) {
            showClientBanner(`"${product.name}" is currently Out of Stock.`);
            return;
          }
          const finish = product.defaultFinish || 'Natural Finish';
          const existing = state.cartItems.find((c) => c.product.id === product.id && c.finish === finish);
          if (!existing) {
            state.cartItems.push({ product, finish, quantity: 1 });
          }
          saveCartToStorage();
          const vInput = document.getElementById('client-cart-voucher-input');
          if (vInput && vCode) vInput.value = vCode;
          const check = validateVoucherForOrder(
            state.vouchers,
            vCode,
            userEmail,
            state.cartItems,
            state.catalog
          );
          if (check.valid) {
            state.appliedVoucher = check.voucher;
          }
          showClientBanner(`Added "${product.name}" and applied voucher ${vCode} to your Cart.`);
        }
        const cartTabBtn = document.querySelector('[data-client-tab="cart"]');
        if (cartTabBtn) cartTabBtn.click();
        renderDashboardContent();
      });
    });
  }
  } // end if (shouldRenderClient)

  if (!shouldRenderAdmin) return;

  // 5. Admin Dashboard Statistics, Sidebar Counts & Overview Sections
  const adminStatCatalog = document.getElementById('admin-stat-catalog');
  const adminStatCatalogSub = document.getElementById('admin-stat-catalog-sub');
  const adminStatVouchers = document.getElementById('admin-stat-vouchers');
  const adminStatOrders = document.getElementById('admin-stat-orders');
  const adminStatRevenue = document.getElementById('admin-stat-revenue');

  const navCountProducts = document.getElementById('admin-nav-count-products');
  const navCountInventory = document.getElementById('admin-nav-count-inventory');
  const navCountVouchers = document.getElementById('admin-nav-count-vouchers');
  const navCountOrders = document.getElementById('admin-nav-count-orders');
  const navCountCustomers = document.getElementById('admin-nav-count-customers');

  const discountedCount = state.catalog.filter((p) => Number(p.discountPercent || 0) > 0).length;
  const activeVoucherCount = state.vouchers.filter(
    (v) => computeVoucherStatusInfo(v).isUsable
  ).length;
  const totalOrderRevenue = state.orders.filter(isOrderCompleted).reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const invMetrics = computeMaterialInventoryMetrics(state.materials);
  const customerDirectory = computeCustomerDirectory(
    state.orders,
    state.customers,
    state.customerProfile
  );

  if (adminStatCatalog) adminStatCatalog.textContent = `${state.catalog.length} Items`;
  if (adminStatCatalogSub) {
    adminStatCatalogSub.textContent =
      discountedCount > 0 ? `${discountedCount} currently discounted` : 'All at standard price';
  }
  if (adminStatVouchers) adminStatVouchers.textContent = `${activeVoucherCount} Active`;
  if (adminStatOrders) adminStatOrders.textContent = `${state.orders.length} Orders`;
  if (adminStatRevenue) adminStatRevenue.textContent = usd(totalOrderRevenue);

  if (navCountProducts) navCountProducts.textContent = String(state.catalog.length);
  if (navCountInventory) navCountInventory.textContent = String(invMetrics.totalMaterials);
  if (navCountVouchers) navCountVouchers.textContent = String(state.vouchers.length);
  if (navCountOrders) navCountOrders.textContent = String(state.orders.length);
  if (navCountCustomers) navCountCustomers.textContent = String(customerDirectory.length);

  // Close open 3-dot action dropdown when clicking outside
  if (!window.__adminActionMenuListenerBound) {
    window.__adminActionMenuListenerBound = true;
    document.addEventListener('click', (e) => {
      if (!state.adminOpenActionMenuId) return;
      const targetEl = e.target;
      if (targetEl && typeof targetEl.closest === 'function' && targetEl.closest('.admin-action-menu')) {
        return;
      }
      state.adminOpenActionMenuId = '';
      document.querySelectorAll('.admin-action-dropdown').forEach((el) => el.classList.add('hidden'));
      document
        .querySelectorAll('.admin-action-trigger[aria-expanded="true"]')
        .forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
    });
  }

  const renderStockStatusBadge = (statusKey) => {
    if (statusKey === 'out_of_stock') {
      return `<span class="admin-status-badge admin-status-out-of-stock"><span class="admin-status-badge-dot"></span>Out of Stock</span>`;
    }
    if (statusKey === 'low_stock') {
      return `<span class="admin-status-badge admin-status-low-stock"><span class="admin-status-badge-dot"></span>Low Stock</span>`;
    }
    return `<span class="admin-status-badge admin-status-in-stock"><span class="admin-status-badge-dot"></span>In Stock</span>`;
  };

  const chartCategoriesEl = document.getElementById('admin-chart-categories');
  if (chartCategoriesEl) {
    const categoryGroups = [
      { id: 'living', label: 'Living Room' },
      { id: 'dining', label: 'Dining Room' },
      { id: 'bedroom', label: 'Bedroom' },
      { id: 'office', label: 'Study/Work Desks' },
      { id: 'kitchen', label: 'Kitchen' },
    ];
    const totalItems = Math.max(1, state.catalog.length);
    chartCategoriesEl.innerHTML = categoryGroups
      .map((cat) => {
        const matches = state.catalog.filter((p) => p.categoryId === cat.id);
        const pct = Math.round((matches.length / totalItems) * 100);
        const avgPrice =
          matches.length > 0
            ? Math.round(matches.reduce((s, i) => s + Number(i.effectivePrice || i.price || 0), 0) / matches.length)
            : 0;
        return `
          <div>
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-slate-800">${esc(cat.label)}</span>
              <span class="font-mono-tech text-slate-500">${matches.length} items · Avg ${usd(avgPrice)}</span>
            </div>
            <div class="admin-progress-track">
              <div class="admin-progress-fill-blue" style="width: ${matches.length > 0 ? Math.max(8, pct) : 0}%"></div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  const chartOrdersEl = document.getElementById('admin-chart-orders');
  if (chartOrdersEl) {
    const totalOrds = Math.max(1, state.orders.length);
    const stages = [
      {
        label: 'Confirmed & Timber Prep',
        count: state.orders.filter((o) => /Confirmed|Inquiry|Timber/i.test(o.status)).length,
      },
      {
        label: 'In Production & Finishing',
        count: state.orders.filter((o) => /Joinery|Finishing|Millwork/i.test(o.status)).length,
      },
      {
        label: 'Quality Check',
        count: state.orders.filter((o) => /Quality/i.test(o.status)).length,
      },
      {
        label: 'Dispatched / Delivered',
        count: state.orders.filter((o) => /Dispatched|Delivered/i.test(o.status)).length,
      },
    ];
    chartOrdersEl.innerHTML = stages
      .map((st) => {
        const pct = Math.round((st.count / totalOrds) * 100);
        return `
          <div>
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-slate-800">${esc(st.label)}</span>
              <span class="font-mono-tech text-slate-500">${st.count} ${st.count === 1 ? 'order' : 'orders'} (${pct}%)</span>
            </div>
            <div class="admin-progress-track">
              <div class="admin-progress-fill-slate" style="width: ${st.count > 0 ? Math.max(10, pct) : 0}%"></div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // Overview: Recent Orders Summary Card
  const recentOrdersEl = document.getElementById('admin-overview-recent-orders');
  if (recentOrdersEl) {
    const recentList = state.orders.slice(0, 4);
    recentOrdersEl.innerHTML = `
      <div class="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-bold text-slate-900">Recent Customer Orders</h2>
          <p class="text-xs text-slate-500 mt-0.5">Latest orders placed by customers</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" data-admin-jump="inventory" class="admin-btn admin-btn-sm admin-btn-secondary">
            Manage Inventory
          </button>
          <button type="button" data-admin-jump="orders" class="admin-btn admin-btn-sm admin-btn-primary">
            View All Orders
          </button>
        </div>
      </div>
      ${
        recentList.length === 0
          ? `<div class="admin-empty-state"><p class="text-sm font-semibold text-slate-700">No customer orders yet</p><p class="text-xs text-slate-500 mt-1">New orders will appear here automatically.</p></div>`
          : `
        <div class="overflow-x-auto">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th class="admin-col-primary">Product</th>
                <th>Stage</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${recentList
                .map(
                  (o) => `
                  <tr>
                    <td class="font-mono-tech text-xs font-bold text-[#0095FF] whitespace-nowrap">#${esc(o.orderNumber)}</td>
                    <td class="whitespace-nowrap">
                      <p class="admin-table-title">${esc(o.clientName)}</p>
                      <p class="admin-table-sub">${esc(o.clientEmail)}</p>
                    </td>
                    <td class="admin-col-primary">
                      <p class="admin-table-title">${esc(o.furnitureName)}</p>
                      <p class="admin-table-sub">${esc(o.selectedFinish)}</p>
                    </td>
                    <td class="whitespace-nowrap">
                      <span class="admin-status-badge ${
                        /Dispatched|Delivered/i.test(o.status)
                          ? 'admin-status-in-stock'
                          : /Quality/i.test(o.status)
                          ? 'admin-status-low-stock'
                          : 'bg-sky-50 text-[#0095FF] border border-sky-200'
                      }">${esc(o.status.split('·')[0].trim())}</span>
                    </td>
                    <td class="text-right font-mono-tech font-bold text-slate-900 whitespace-nowrap">${usd(o.totalAmount)}</td>
                  </tr>
                `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
      }
    `;

    recentOrdersEl.querySelectorAll('[data-admin-jump]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-admin-jump');
        if (window.__switchAdminTab && target) window.__switchAdminTab(target);
      });
    });
  }

  // 6. Admin Products Page (#admin-catalog-list)
  const adminCatalogEl = document.getElementById('admin-catalog-list');
  if (adminCatalogEl) {
    const query = (state.adminProductSearch || '').trim().toLowerCase();
    const catFilter = state.adminProductCategory || 'all';
    const stockFilter = state.adminProductStockFilter || 'all';
    const typeFilter = state.adminProductTypeFilter || 'all';

    const prodMetrics = computeInventoryMetrics(state.catalog);

    const filteredProducts = state.catalog.filter((p) => {
      const pType = p.productType === 'customized' || p.isCustomClientDesign ? 'customized' : 'standard';
      const stockInfo = getProductStockStatus(p);
      const matchesCat = catFilter === 'all' || p.categoryId === catFilter;
      const matchesType = typeFilter === 'all' || pType === typeFilter;
      const matchesStock = stockFilter === 'all' || stockInfo.statusKey === stockFilter;
      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.categoryName || '').toLowerCase().includes(query);
      return matchesCat && matchesType && matchesStock && matchesQuery;
    });

    const prodPagination = paginateItems(filteredProducts, state.adminProductPage || 1, 6);
    state.adminProductPage = prodPagination.currentPage;

    const isFormOpen = !document.getElementById('admin-product-form')?.classList.contains('hidden');
    const hasActiveProdFilters =
      Boolean(query) || catFilter !== 'all' || stockFilter !== 'all' || typeFilter !== 'all';

    adminCatalogEl.innerHTML = `
      <!-- Product Summary Cards -->
      <div class="admin-summary-grid-4">
        <div class="admin-summary-card">
          <span class="admin-summary-label">Total Products</span>
          <span id="prod-kpi-total" class="admin-summary-value">${prodMetrics.totalProducts}</span>
          <span class="admin-summary-sub">Active catalog items</span>
        </div>
        <div class="admin-summary-card">
          <span class="admin-summary-label">In Stock</span>
          <span class="admin-summary-value is-green">${prodMetrics.inStockCount}</span>
          <span class="admin-summary-sub">Ready for dispatch</span>
        </div>
        <div class="admin-summary-card">
          <span class="admin-summary-label">Low Stock</span>
          <span class="admin-summary-value is-orange">${prodMetrics.lowStockCount}</span>
          <span class="admin-summary-sub">At or below minimum</span>
        </div>
        <div class="admin-summary-card">
          <span class="admin-summary-label">Out of Stock</span>
          <span class="admin-summary-value is-red">${prodMetrics.outOfStockCount}</span>
          <span class="admin-summary-sub">Requires production</span>
        </div>
      </div>

      <div class="admin-card">
        <div class="admin-toolbar">
          <div class="admin-toolbar-filters">
            <input
              id="admin-catalog-search"
              type="search"
              value="${esc(state.adminProductSearch)}"
              placeholder="Search product name, SKU, or category..."
              aria-label="Search products"
              class="admin-input admin-search-input"
            />
            <select id="admin-catalog-category" aria-label="Filter products by category" class="admin-select admin-filter-select">
              <option value="all" ${catFilter === 'all' ? 'selected' : ''}>All Categories</option>
              <option value="living" ${catFilter === 'living' ? 'selected' : ''}>Living Room</option>
              <option value="dining" ${catFilter === 'dining' ? 'selected' : ''}>Dining Room</option>
              <option value="bedroom" ${catFilter === 'bedroom' ? 'selected' : ''}>Bedroom</option>
              <option value="office" ${catFilter === 'office' ? 'selected' : ''}>Study/Work Desks</option>
              <option value="kitchen" ${catFilter === 'kitchen' ? 'selected' : ''}>Kitchen</option>
            </select>
            <select id="admin-catalog-stock-filter" aria-label="Filter products by stock status" class="admin-select admin-filter-select">
              <option value="all" ${stockFilter === 'all' ? 'selected' : ''}>All Stock Statuses</option>
              <option value="in_stock" ${stockFilter === 'in_stock' ? 'selected' : ''}>In Stock</option>
              <option value="low_stock" ${stockFilter === 'low_stock' ? 'selected' : ''}>Low Stock</option>
              <option value="out_of_stock" ${stockFilter === 'out_of_stock' ? 'selected' : ''}>Out of Stock</option>
            </select>
            <select id="admin-catalog-type" aria-label="Filter products by type" class="admin-select admin-filter-select">
              <option value="all" ${typeFilter === 'all' ? 'selected' : ''}>All Types</option>
              <option value="standard" ${typeFilter === 'standard' ? 'selected' : ''}>Standard Catalog</option>
              <option value="customized" ${typeFilter === 'customized' ? 'selected' : ''}>Custom (Messenger)</option>
            </select>
            <button
              type="button"
              id="admin-reset-product-filters"
              class="admin-btn admin-btn-sm admin-btn-secondary ${hasActiveProdFilters ? '' : 'opacity-60'}"
            >
              Reset Filters
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              id="admin-toggle-add-product-btn"
              class="admin-btn admin-btn-sm ${isFormOpen ? 'admin-btn-secondary' : 'admin-btn-primary'}"
            >
              ${isFormOpen ? 'Close Form' : '+ Add Product'}
            </button>
          </div>
        </div>

        ${
          filteredProducts.length === 0
            ? `
          <div class="admin-empty-state space-y-3">
            <p class="text-base font-bold text-slate-900">No matching products found</p>
            <p class="text-xs text-slate-500 max-w-sm mx-auto">Try clearing your search query or resetting the category and status filters.</p>
            <div>
              <button type="button" id="admin-reset-product-filters-empty" class="admin-btn admin-btn-sm admin-btn-secondary">
                Reset Filters
              </button>
            </div>
          </div>
        `
            : `
          <div class="overflow-x-auto">
            <table class="admin-table">
              <thead>
                <tr>
                  <th class="admin-col-primary">Product Name</th>
                  <th>Category</th>
                  <th>Available Stock</th>
                  <th>Minimum Stock</th>
                  <th>Unit Price</th>
                  <th>Stock Status</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${prodPagination.items
                  .map((p) => {
                    const imgUrl = (p.image || 'assets/images/category_dining_tables.jpg').replace(/^\//, '');
                    const isCustomized =
                      p.productType === 'customized' || Boolean(p.isCustomClientDesign);
                    const stockInfo = getProductStockStatus(p);
                    const menuId = `prod-menu-${p.id}`;
                    const isMenuOpen = state.adminOpenActionMenuId === menuId;
                    return `
                      <tr data-product-row="${esc(p.id)}">
                        <td class="admin-col-primary">
                          <div class="flex items-center gap-3">
                            <img src="${esc(imgUrl)}" alt="${esc(p.name)}" class="admin-thumb" />
                            <div class="min-w-0">
                              <div class="flex items-center gap-2">
                                <p class="admin-table-title truncate">${esc(p.name)}</p>
                                ${
                                  isCustomized
                                    ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-[#0095FF] border border-sky-200 shrink-0">Custom</span>`
                                    : ''
                                }
                              </div>
                              <p class="admin-table-sub font-mono-tech">ProductID: ${esc(p.productId || p.sku)} · ${esc(p.dimensions || 'Standard')}</p>
                            </div>
                          </div>
                        </td>
                        <td class="whitespace-nowrap">
                          <span class="admin-category-tag">${esc(p.categoryName)}</span>
                        </td>
                        <td class="font-mono-tech font-semibold text-slate-900 whitespace-nowrap">
                          ${stockInfo.availableStock} pcs
                        </td>
                        <td class="font-mono-tech text-slate-600 whitespace-nowrap">
                          ${stockInfo.minStockLevel} pcs
                        </td>
                        <td class="whitespace-nowrap">
                          <div class="flex items-center gap-1.5">
                            <span class="font-mono-tech font-semibold text-slate-900">${usd(p.effectivePrice)}</span>
                            ${
                              p.discountPercent > 0
                                ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-[#0095FF] border border-sky-200">-${p.discountPercent}%</span>`
                                : ''
                            }
                          </div>
                        </td>
                        <td class="whitespace-nowrap">
                          ${renderStockStatusBadge(stockInfo.statusKey)}
                        </td>
                        <td class="text-right whitespace-nowrap">
                          <div class="admin-action-menu">
                            <button
                              type="button"
                              class="admin-action-trigger"
                              data-action-menu-trigger="${esc(menuId)}"
                              aria-label="Actions for ${esc(p.name)}"
                              aria-haspopup="menu"
                              aria-expanded="${isMenuOpen ? 'true' : 'false'}"
                            >
                              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <circle cx="12" cy="5" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="12" cy="19" r="2" />
                              </svg>
                            </button>
                            <div
                              class="admin-action-dropdown ${isMenuOpen ? '' : 'hidden'}"
                              role="menu"
                              aria-label="Product actions for ${esc(p.name)}"
                            >
                              <button type="button" role="menuitem" class="admin-action-item" data-edit-product="${esc(p.id)}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                <span>Edit Product</span>
                              </button>
                              <div class="admin-action-divider"></div>
                              <button type="button" role="menuitem" class="admin-action-item is-danger" data-delete-product="${esc(p.id)}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                                <span>Remove Product</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
          <div class="admin-pagination">
            <p class="admin-pagination-info">
              Showing <strong>${prodPagination.startIndex}–${prodPagination.endIndex}</strong> of <strong>${prodPagination.totalItems}</strong> products
            </p>
            <div class="admin-pagination-controls">
              <button
                type="button"
                data-prod-page="${prodPagination.currentPage - 1}"
                class="admin-page-btn"
                ${prodPagination.hasPrev ? '' : 'disabled'}
              >
                Previous
              </button>
              ${Array.from({ length: prodPagination.totalPages }, (_, idx) => idx + 1)
                .map(
                  (pageNum) => `
                  <button
                    type="button"
                    data-prod-page="${pageNum}"
                    class="admin-page-btn ${pageNum === prodPagination.currentPage ? 'is-active' : ''}"
                  >
                    ${pageNum}
                  </button>
                `
                )
                .join('')}
              <button
                type="button"
                data-prod-page="${prodPagination.currentPage + 1}"
                class="admin-page-btn"
                ${prodPagination.hasNext ? '' : 'disabled'}
              >
                Next
              </button>
            </div>
          </div>
        `
        }
      </div>
    `;

    bindLiveSearchInput('admin-catalog-search', 'adminProductSearch', () => {
      state.adminProductPage = 1;
      renderDashboardContent();
    });

    const catSelect = document.getElementById('admin-catalog-category');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        state.adminProductCategory = e.target.value;
        state.adminProductPage = 1;
        renderDashboardContent();
      });
    }

    const stockSelect = document.getElementById('admin-catalog-stock-filter');
    if (stockSelect) {
      stockSelect.addEventListener('change', (e) => {
        state.adminProductStockFilter = e.target.value;
        state.adminProductPage = 1;
        renderDashboardContent();
      });
    }

    const typeSelect = document.getElementById('admin-catalog-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        state.adminProductTypeFilter = e.target.value;
        state.adminProductPage = 1;
        renderDashboardContent();
      });
    }

    ['admin-reset-product-filters', 'admin-reset-product-filters-empty'].forEach((btnId) => {
      const resetBtn = document.getElementById(btnId);
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          state.adminProductSearch = '';
          state.adminProductCategory = 'all';
          state.adminProductStockFilter = 'all';
          state.adminProductTypeFilter = 'all';
          state.adminProductPage = 1;
          renderDashboardContent();
        });
      }
    });

    adminCatalogEl.querySelectorAll('[data-prod-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextP = Number(btn.getAttribute('data-prod-page'));
        if (Number.isFinite(nextP) && nextP >= 1) {
          state.adminProductPage = nextP;
          renderDashboardContent();
        }
      });
    });

    const toggleAddProdBtn = document.getElementById('admin-toggle-add-product-btn');
    if (toggleAddProdBtn) {
      toggleAddProdBtn.addEventListener('click', () => {
        const formEl = document.getElementById('admin-product-form');
        if (formEl && !formEl.classList.contains('hidden')) {
          if (typeof window.__resetProductForm === 'function') window.__resetProductForm();
          formEl.classList.add('hidden');
          renderDashboardContent();
        } else if (window.__switchAdminTab) {
          window.__switchAdminTab('add-product');
          renderDashboardContent();
        }
      });
    }

    adminCatalogEl.querySelectorAll('[data-action-menu-trigger]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menuId = btn.getAttribute('data-action-menu-trigger') || '';
        state.adminOpenActionMenuId = state.adminOpenActionMenuId === menuId ? '' : menuId;
        renderDashboardContent();
      });
    });

    adminCatalogEl.querySelectorAll('[data-edit-product]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.adminOpenActionMenuId = '';
        const pid = btn.getAttribute('data-edit-product');
        const prod = state.catalog.find((item) => item.id === pid);
        if (prod && typeof window.__openProductFormForEdit === 'function') {
          window.__openProductFormForEdit(prod);
          renderDashboardContent();
        }
      });
    });

    adminCatalogEl.querySelectorAll('[data-delete-product]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.adminOpenActionMenuId = '';
        const pid = btn.getAttribute('data-delete-product');
        if (pid && typeof window.__removeProductById === 'function') {
          window.__removeProductById(pid);
        }
      });
    });
  }

  // 6B. Admin Inventory & Stock Management (#admin-tab-inventory)
  const adminInventoryEl = document.getElementById('admin-tab-inventory');
  if (adminInventoryEl) {
    const metrics = computeMaterialInventoryMetrics(state.materials);
    const categories = getMaterialCategories(state.materials);
    const categoryOptions = Array.from(
      new Set([
        'Hardwood Timber',
        'Upholstery & Textile',
        'Architectural Stone',
        'Hardware & Metal',
        'Finishing & Cord',
        ...categories,
      ])
    );

    const searchQuery = state.adminInventoryStockSearch || '';
    const categoryFilter = state.adminInventoryCategoryFilter || 'all';
    const statusFilter = state.adminInventoryStockFilter || 'all';
    const hasActiveInvFilters =
      Boolean(searchQuery.trim()) || categoryFilter !== 'all' || statusFilter !== 'all';

    const filteredMaterials = filterInventoryMaterials(state.materials, {
      searchQuery,
      categoryFilter,
      statusFilter,
    });

    const pageSize = Number(state.adminInventoryPageSize) || 5;
    const pagination = paginateItems(filteredMaterials, state.adminInventoryPage || 1, pageSize);
    state.adminInventoryPage = pagination.currentPage;

    // Modal state
    const activeMovementMode = state.adminMovementMode === 'Stock Out' ? 'Stock Out' : 'Stock In';
    const selectedMaterialId =
      (state.adminMovementMaterialId || state.adminMovementProductId) &&
      state.materials.some((m) => m.id === (state.adminMovementMaterialId || state.adminMovementProductId))
        ? state.adminMovementMaterialId || state.adminMovementProductId
        : state.materials[0]?.id || '';
    const selectedMaterial = state.materials.find((m) => m.id === selectedMaterialId) || null;

    const editingMaterial = state.adminEditingMaterialId
      ? state.materials.find((m) => m.id === state.adminEditingMaterialId) || null
      : null;

    const isMovementModalOpen = Boolean(state.adminMovementFormOpen && selectedMaterial);
    const isMaterialModalOpen = Boolean(state.adminMaterialFormOpen);
    const isHistoryModalOpen = Boolean(state.adminHistoryModalOpen);

    const historyMaterialFilter = state.adminHistoryMaterialId || 'all';
    const historyTypeFilter = state.adminInventoryHistoryTypeFilter || 'all';
    const historySearch = (state.adminInventoryHistorySearch || '').trim().toLowerCase();

    const filteredTransactions = state.inventoryTransactions.filter((tx) => {
      const matchesMaterial =
        historyMaterialFilter === 'all' ||
        tx.materialId === historyMaterialFilter ||
        tx.productId === historyMaterialFilter;
      const matchesType = historyTypeFilter === 'all' || tx.transactionType === historyTypeFilter;
      const matchesSearch =
        !historySearch ||
        (tx.materialName || tx.productName || '').toLowerCase().includes(historySearch) ||
        (tx.reason || '').toLowerCase().includes(historySearch) ||
        (tx.adminName || '').toLowerCase().includes(historySearch);
      return matchesMaterial && matchesType && matchesSearch;
    });

    const livePreview = describeMaterialStockPreview(
      selectedMaterial,
      activeMovementMode,
      state.adminMovementQuantity || (activeMovementMode === 'Stock In' ? 10 : 5)
    );

    adminInventoryEl.innerHTML = `
      <div class="space-y-5">
        <!-- 5 Compact Inventory Summary Cards -->
        <div class="admin-summary-grid-5" data-testid="inventory-summary-cards">
          <div class="admin-summary-card">
            <span class="admin-summary-label">Total Materials</span>
            <span id="inv-kpi-total-materials" class="admin-summary-value">${metrics.totalMaterials}</span>
            <span class="admin-summary-sub">Tracked workshop supplies</span>
          </div>
          <div class="admin-summary-card">
            <span class="admin-summary-label">In Stock</span>
            <span id="inv-kpi-in-stock" class="admin-summary-value is-green">${metrics.inStockCount}</span>
            <span class="admin-summary-sub">Above minimum threshold</span>
          </div>
          <div class="admin-summary-card">
            <span class="admin-summary-label">Low Stock</span>
            <span id="inv-kpi-low-stock" class="admin-summary-value is-orange">${metrics.lowStockCount}</span>
            <span class="admin-summary-sub">At or below minimum</span>
          </div>
          <div class="admin-summary-card">
            <span class="admin-summary-label">Out of Stock</span>
            <span id="inv-kpi-out-stock" class="admin-summary-value is-red">${metrics.outOfStockCount}</span>
            <span class="admin-summary-sub">Depleted (0 available)</span>
          </div>
          <div class="admin-summary-card">
            <span class="admin-summary-label">Total Inventory Value</span>
            <span id="inv-kpi-total-value" class="admin-summary-value is-blue font-mono-tech">${usd(metrics.totalInventoryValue)}</span>
            <span class="admin-summary-sub">Current stock × unit cost</span>
          </div>
        </div>

        <!-- Main Inventory Card: Search, Filters, Table, and Pagination -->
        <div class="admin-card">
          <div class="admin-toolbar">
            <div class="admin-toolbar-filters">
              <input
                id="admin-inv-stock-search"
                type="search"
                value="${esc(state.adminInventoryStockSearch)}"
                placeholder="Search material name, SKU, or category..."
                aria-label="Search materials"
                class="admin-input admin-search-input"
              />
              <select
                id="admin-inv-category-filter"
                aria-label="Filter materials by category"
                class="admin-select admin-filter-select"
              >
                <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
                ${categories
                  .map(
                    (cat) =>
                      `<option value="${esc(cat)}" ${categoryFilter === cat ? 'selected' : ''}>${esc(cat)}</option>`
                  )
                  .join('')}
              </select>
              <select
                id="admin-inv-stock-filter"
                aria-label="Filter materials by stock status"
                class="admin-select admin-filter-select"
              >
                <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
                <option value="in_stock" ${statusFilter === 'in_stock' ? 'selected' : ''}>In Stock</option>
                <option value="low_stock" ${statusFilter === 'low_stock' ? 'selected' : ''}>Low Stock</option>
                <option value="out_of_stock" ${statusFilter === 'out_of_stock' ? 'selected' : ''}>Out of Stock</option>
              </select>
              <button
                type="button"
                id="admin-inv-reset-filters"
                class="admin-btn admin-btn-sm admin-btn-secondary ${hasActiveInvFilters ? '' : 'opacity-60'}"
              >
                Reset Filters
              </button>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                id="admin-open-history-modal-btn"
                class="admin-btn admin-btn-sm admin-btn-secondary"
              >
                Stock History (${state.inventoryTransactions.length})
              </button>
              <button
                type="button"
                id="admin-open-add-material-btn"
                class="admin-btn admin-btn-sm admin-btn-primary"
              >
                + Add Material
              </button>
            </div>
          </div>

          ${
            filteredMaterials.length === 0
              ? `
            <div class="admin-empty-state space-y-3">
              <p class="text-base font-bold text-slate-900">No materials match your filters</p>
              <p class="text-xs text-slate-500 max-w-sm mx-auto">Try clearing your search or resetting the category and stock status filters.</p>
              <div>
                <button type="button" id="admin-inv-empty-reset-btn" class="admin-btn admin-btn-sm admin-btn-secondary">
                  Reset Filters
                </button>
              </div>
            </div>
          `
              : `
            <div class="overflow-x-auto">
              <table class="admin-table" data-testid="inventory-materials-table">
                <thead>
                  <tr>
                    <th class="admin-col-primary">Material Name</th>
                    <th>Category</th>
                    <th>Available Stock</th>
                    <th>Minimum Stock</th>
                    <th>Unit Cost</th>
                    <th>Stock Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${pagination.items
                    .map((m) => {
                      const st = getMaterialStockStatus(m);
                      const menuId = `mat-menu-${m.id}`;
                      const isMenuOpen = state.adminOpenActionMenuId === menuId;
                      return `
                        <tr data-material-row="${esc(m.id)}">
                          <td class="admin-col-primary">
                            <p class="admin-table-title">${esc(m.name)}</p>
                            <p class="admin-table-sub font-mono-tech">MaterialID: ${esc(m.materialId || m.sku || m.code)}</p>
                          </td>
                          <td class="whitespace-nowrap">
                            <span class="admin-category-tag">${esc(m.materialType)}</span>
                          </td>
                          <td class="font-mono-tech font-semibold text-slate-900 whitespace-nowrap">
                            ${st.availableStock} <span class="text-xs font-normal text-slate-500">${esc(m.unit)}</span>
                          </td>
                          <td class="font-mono-tech text-slate-600 whitespace-nowrap">
                            ${st.minStockLevel} <span class="text-xs font-normal text-slate-400">${esc(m.unit)}</span>
                          </td>
                          <td class="font-mono-tech text-slate-800 whitespace-nowrap">
                            ${usd(m.unitCost)} <span class="text-xs font-normal text-slate-400">/ ${esc(m.unit)}</span>
                          </td>
                          <td class="whitespace-nowrap">
                            ${renderStockStatusBadge(st.statusKey)}
                          </td>
                          <td class="text-right whitespace-nowrap">
                            <div class="admin-action-menu">
                              <button
                                type="button"
                                class="admin-action-trigger"
                                data-action-menu-trigger="${esc(menuId)}"
                                aria-label="Actions for ${esc(m.name)}"
                                aria-haspopup="menu"
                                aria-expanded="${isMenuOpen ? 'true' : 'false'}"
                              >
                                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                  <circle cx="12" cy="5" r="2" />
                                  <circle cx="12" cy="12" r="2" />
                                  <circle cx="12" cy="19" r="2" />
                                </svg>
                              </button>
                              <div
                                class="admin-action-dropdown ${isMenuOpen ? '' : 'hidden'}"
                                role="menu"
                                aria-label="Inventory actions for ${esc(m.name)}"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  class="admin-action-item"
                                  data-inv-action="add-stock"
                                  data-material-id="${esc(m.id)}"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                                  <span>Add Stock</span>
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  class="admin-action-item"
                                  data-inv-action="use-stock"
                                  data-material-id="${esc(m.id)}"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>
                                  <span>Use Stock</span>
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  class="admin-action-item"
                                  data-inv-action="edit-material"
                                  data-material-id="${esc(m.id)}"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                  <span>Edit Material</span>
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  class="admin-action-item"
                                  data-inv-action="view-history"
                                  data-material-id="${esc(m.id)}"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                                  <span>View Stock History</span>
                                </button>
                                <div class="admin-action-divider"></div>
                                <button
                                  type="button"
                                  role="menuitem"
                                  class="admin-action-item is-danger"
                                  data-inv-action="remove-material"
                                  data-material-id="${esc(m.id)}"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                                  <span>Remove Material</span>
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>

            <!-- Pagination Footer -->
            <div class="admin-pagination" data-testid="inventory-pagination">
              <p class="admin-pagination-info">
                Showing <strong>${pagination.startIndex}–${pagination.endIndex}</strong> of <strong>${pagination.totalItems}</strong> materials
              </p>
              <div class="admin-pagination-controls">
                <button
                  type="button"
                  data-inv-page="${pagination.currentPage - 1}"
                  class="admin-page-btn"
                  ${pagination.hasPrev ? '' : 'disabled'}
                >
                  Previous
                </button>
                ${Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1)
                  .map(
                    (pageNum) => `
                    <button
                      type="button"
                      data-inv-page="${pageNum}"
                      class="admin-page-btn ${pageNum === pagination.currentPage ? 'is-active' : ''}"
                    >
                      ${pageNum}
                    </button>
                  `
                  )
                  .join('')}
                <button
                  type="button"
                  data-inv-page="${pagination.currentPage + 1}"
                  class="admin-page-btn"
                  ${pagination.hasNext ? '' : 'disabled'}
                >
                  Next
                </button>
              </div>
            </div>
          `
          }
        </div>
      </div>

      <!-- MODAL 1: Add Stock / Use Stock Modal Dialog -->
      ${
        isMovementModalOpen
          ? `
        <div
          id="admin-stock-movement-modal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-movement-modal-title"
        >
          <div class="admin-modal-backdrop fixed inset-0" data-close-movement-modal="true"></div>
          <div class="admin-modal-dialog relative z-10">
            <div class="admin-modal-header">
              <div>
                <p class="admin-eyebrow">${activeMovementMode === 'Stock In' ? 'Restock Inventory' : 'Deduct Inventory'}</p>
                <h3 id="admin-movement-modal-title" class="text-base font-bold text-slate-900 mt-0.5">
                  ${activeMovementMode === 'Stock In' ? 'Add Stock' : 'Use Stock'} — ${esc(selectedMaterial?.name || '')}
                </h3>
              </div>
              <button
                type="button"
                data-close-movement-modal="true"
                class="admin-btn admin-btn-sm admin-btn-secondary"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <form id="admin-stock-movement-form" class="admin-modal-body space-y-4">
              <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  data-movement-mode="Stock In"
                  class="py-1.5 px-3 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    activeMovementMode === 'Stock In'
                      ? 'bg-white text-[#0095FF] shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }"
                >
                  + Add Stock (Restock)
                </button>
                <button
                  type="button"
                  data-movement-mode="Stock Out"
                  class="py-1.5 px-3 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    activeMovementMode === 'Stock Out'
                      ? 'bg-white text-[#0095FF] shadow-2xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }"
                >
                  − Use Stock (Deduct)
                </button>
              </div>

              <div>
                <label for="inv-move-product" class="admin-label">Material</label>
                <select id="inv-move-product" required class="admin-select">
                  ${state.materials
                    .map(
                      (m) =>
                        `<option value="${esc(m.id)}" ${m.id === selectedMaterialId ? 'selected' : ''}>${esc(m.name)} (${m.stockQuantity} ${esc(m.unit)} available)</option>`
                    )
                    .join('')}
                </select>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label for="inv-move-qty" class="admin-label">
                    Quantity (${esc(selectedMaterial?.unit || 'units')})
                  </label>
                  <input
                    id="inv-move-qty"
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value="${esc(state.adminMovementQuantity || (activeMovementMode === 'Stock In' ? '10' : '5'))}"
                    class="admin-input font-mono-tech"
                  />
                </div>
                <div>
                  <label for="inv-move-date" class="admin-label">Transaction Date</label>
                  <input
                    id="inv-move-date"
                    type="date"
                    required
                    value="${esc(state.adminMovementDate)}"
                    class="admin-input font-mono-tech"
                  />
                </div>
              </div>

              ${
                activeMovementMode === 'Stock In'
                  ? `
                <div>
                  <label for="inv-move-cost" class="admin-label">Total Purchase Cost ($ USD, Optional)</label>
                  <input
                    id="inv-move-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value="${esc(state.adminMovementPurchaseCost)}"
                    placeholder="e.g. 420.00"
                    class="admin-input font-mono-tech"
                  />
                </div>
              `
                  : `
                <div>
                  <label for="inv-move-reason" class="admin-label">Reason for Using Stock</label>
                  <select id="inv-move-reason" class="admin-select">
                    <option value="Workshop Production Allocation" ${state.adminMovementReason === 'Workshop Production Allocation' ? 'selected' : ''}>Used for Customer Order / Production</option>
                    <option value="Custom Bespoke Order" ${state.adminMovementReason === 'Custom Bespoke Order' ? 'selected' : ''}>Used for Custom Bespoke Order</option>
                    <option value="Damaged / Kiln Defect" ${state.adminMovementReason === 'Damaged / Kiln Defect' ? 'selected' : ''}>Damaged or Defective Material</option>
                    <option value="Manual Stock Count Adjustment" ${state.adminMovementReason === 'Manual Stock Count Adjustment' ? 'selected' : ''}>Stock Count Correction</option>
                    <option value="Other" ${state.adminMovementReason === 'Other' ? 'selected' : ''}>Other Reason</option>
                  </select>
                </div>
                <div id="inv-move-custom-reason-wrap" class="${state.adminMovementReason === 'Other' ? '' : 'hidden'}">
                  <label for="inv-move-custom-reason" class="admin-label">Specify Reason</label>
                  <input
                    id="inv-move-custom-reason"
                    type="text"
                    value="${esc(state.adminMovementCustomReason)}"
                    placeholder="Enter brief note..."
                    class="admin-input"
                  />
                </div>
              `
              }

              <div id="admin-stock-live-preview" class="p-3 rounded-lg bg-[#F8FAFC] border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-slate-600">Updated Balance:</span>
                  <span class="font-mono-tech text-slate-800">
                    ${livePreview.currentStock} ${esc(livePreview.unit)}
                  </span>
                  <span aria-hidden="true">→</span>
                  <span class="font-mono-tech font-bold ${
                    livePreview.insufficientStock
                      ? 'text-rose-700'
                      : activeMovementMode === 'Stock In'
                      ? 'text-emerald-700'
                      : 'text-[#0095FF]'
                  }">
                    ${
                      livePreview.insufficientStock
                        ? `Insufficient stock (${livePreview.currentStock} ${esc(livePreview.unit)} available)`
                        : `${livePreview.projectedStock} ${esc(livePreview.unit)}`
                    }
                  </span>
                </div>
                <span class="text-slate-500 font-mono-tech">
                  Unit cost: ${usd(selectedMaterial?.unitCost || 0)}/${esc(livePreview.unit)}
                </span>
              </div>

              <div id="admin-stock-movement-feedback" class="hidden" role="alert"></div>

              <div class="pt-4 mt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button type="button" data-close-movement-modal="true" class="admin-btn admin-btn-secondary">
                  Cancel
                </button>
                <button type="submit" class="admin-btn admin-btn-primary">
                  ${activeMovementMode === 'Stock In' ? 'Confirm Add Stock' : 'Confirm Use Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      `
          : ''
      }

      <!-- MODAL 2: Add / Edit Material Modal Dialog -->
      ${
        isMaterialModalOpen
          ? `
        <div
          id="admin-material-modal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-material-modal-title"
        >
          <div class="admin-modal-backdrop fixed inset-0" data-close-material-modal="true"></div>
          <div class="admin-modal-dialog relative z-10">
            <div class="admin-modal-header">
              <div>
                <p class="admin-eyebrow">${editingMaterial ? 'Update Material' : 'New Workshop Material'}</p>
                <h3 id="admin-material-modal-title" class="text-base font-bold text-slate-900 mt-0.5">
                  ${editingMaterial ? `Edit Material — ${esc(editingMaterial.name)}` : 'Add Material to Inventory'}
                </h3>
              </div>
              <button
                type="button"
                data-close-material-modal="true"
                class="admin-btn admin-btn-sm admin-btn-secondary"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <form id="admin-material-form" class="admin-modal-body space-y-4">
              <div>
                <label for="mat-name" class="admin-label">Material Name</label>
                <input
                  id="mat-name"
                  type="text"
                  required
                  value="${esc(editingMaterial ? editingMaterial.name : '')}"
                  placeholder="e.g. FAS American Black Walnut (8/4 Rough)"
                  class="admin-input"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label for="mat-type" class="admin-label">Category</label>
                  <select id="mat-type" class="admin-select">
                    ${categoryOptions
                      .map(
                        (cat) =>
                          `<option value="${esc(cat)}" ${editingMaterial?.materialType === cat ? 'selected' : ''}>${esc(cat)}</option>`
                      )
                      .join('')}
                  </select>
                </div>
                <div>
                  <label for="mat-unit" class="admin-label">Measurement Unit</label>
                  <input
                    id="mat-unit"
                    type="text"
                    required
                    value="${esc(editingMaterial ? editingMaterial.unit : 'bd ft')}"
                    placeholder="bd ft, yd, sq ft, pcs"
                    class="admin-input font-mono-tech"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label for="mat-stock" class="admin-label">Available Stock</label>
                  <input
                    id="mat-stock"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value="${esc(editingMaterial ? String(editingMaterial.stockQuantity) : '25')}"
                    class="admin-input font-mono-tech"
                  />
                </div>
                <div>
                  <label for="mat-min-stock" class="admin-label">Minimum Stock</label>
                  <input
                    id="mat-min-stock"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value="${esc(editingMaterial ? String(editingMaterial.minStockLevel ?? 10) : '10')}"
                    class="admin-input font-mono-tech"
                  />
                </div>
                <div>
                  <label for="mat-cost" class="admin-label">Unit Cost ($ USD)</label>
                  <input
                    id="mat-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value="${esc(editingMaterial ? String(editingMaterial.unitCost) : '18.50')}"
                    class="admin-input font-mono-tech"
                  />
                </div>
              </div>

              <div id="admin-material-form-feedback" class="hidden" role="alert"></div>

              <div class="pt-4 mt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button type="button" data-close-material-modal="true" class="admin-btn admin-btn-secondary">
                  Cancel
                </button>
                <button type="submit" class="admin-btn admin-btn-primary">
                  ${editingMaterial ? 'Save Material Changes' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      `
          : ''
      }

      <!-- MODAL 3: View Stock History Modal Dialog -->
      ${
        isHistoryModalOpen
          ? `
        <div
          id="admin-stock-history-modal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-history-modal-title"
        >
          <div class="admin-modal-backdrop fixed inset-0" data-close-history-modal="true"></div>
          <div class="admin-modal-dialog admin-modal-dialog-lg relative z-10">
            <div class="admin-modal-header">
              <div>
                <p class="admin-eyebrow">Audit Log</p>
                <h3 id="admin-history-modal-title" class="text-base font-bold text-slate-900 mt-0.5">
                  Material Stock Movement History
                </h3>
              </div>
              <button
                type="button"
                data-close-history-modal="true"
                class="admin-btn admin-btn-sm admin-btn-secondary"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div class="admin-modal-body space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-2.5">
                <div class="flex flex-wrap items-center gap-2 flex-1">
                  <select id="admin-inv-history-material" aria-label="Filter history by material" class="admin-select admin-filter-select">
                    <option value="all" ${historyMaterialFilter === 'all' ? 'selected' : ''}>All Materials</option>
                    ${state.materials
                      .map(
                        (m) =>
                          `<option value="${esc(m.id)}" ${historyMaterialFilter === m.id ? 'selected' : ''}>${esc(m.name)}</option>`
                      )
                      .join('')}
                  </select>
                  <select id="admin-inv-history-type" aria-label="Filter history by movement type" class="admin-select admin-filter-select">
                    <option value="all" ${historyTypeFilter === 'all' ? 'selected' : ''}>All Movements</option>
                    <option value="Stock In" ${historyTypeFilter === 'Stock In' ? 'selected' : ''}>Stock In (Added)</option>
                    <option value="Stock Out" ${historyTypeFilter === 'Stock Out' ? 'selected' : ''}>Stock Out (Used)</option>
                  </select>
                  ${
                    historyMaterialFilter !== 'all' || historyTypeFilter !== 'all'
                      ? `<button type="button" id="admin-inv-history-reset" class="admin-btn admin-btn-sm admin-btn-secondary">Reset</button>`
                      : ''
                  }
                </div>
                <span class="text-xs font-medium text-slate-500">${filteredTransactions.length} records</span>
              </div>

              ${
                filteredTransactions.length === 0
                  ? `
                <div class="admin-empty-state">
                  <p class="text-sm font-bold text-slate-900">No stock history records found</p>
                  <p class="text-xs text-slate-500 mt-1">Stock additions and deductions will appear here automatically.</p>
                </div>
              `
                  : `
                <div class="overflow-x-auto border border-slate-200 rounded-lg">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th>Date &amp; Time</th>
                        <th class="admin-col-primary">Material</th>
                        <th>Movement</th>
                        <th>Stock Balance</th>
                        <th>Notes &amp; Admin</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filteredTransactions
                        .map((tx) => {
                          const isStockIn = tx.transactionType === 'Stock In';
                          const unitLabel = tx.unit ? ` ${esc(tx.unit)}` : '';
                          return `
                            <tr>
                              <td class="font-mono-tech text-xs text-slate-500 whitespace-nowrap">${esc(tx.dateTime)}</td>
                              <td class="admin-col-primary">
                                <p class="admin-table-title">${esc(tx.materialName || tx.productName)}</p>
                              </td>
                              <td class="whitespace-nowrap">
                                <span class="admin-status-badge ${isStockIn ? 'admin-status-in-stock' : 'admin-status-low-stock'}">
                                  ${isStockIn ? `+${tx.quantity}${unitLabel}` : `−${tx.quantity}${unitLabel}`}
                                </span>
                              </td>
                              <td class="font-mono-tech text-xs text-slate-700 whitespace-nowrap">
                                ${tx.previousStock}${unitLabel} → <strong>${tx.newStock}${unitLabel}</strong>
                              </td>
                              <td class="whitespace-nowrap">
                                <p class="admin-table-title">${esc(tx.reason || (isStockIn ? 'Workshop Restock' : 'Used in Production'))}</p>
                                <p class="admin-table-sub">
                                  ${tx.purchaseCost !== null && tx.purchaseCost !== undefined ? `Cost: ${usd(tx.purchaseCost)} · ` : ''}${esc(tx.adminName || 'Admin')}
                                </p>
                              </td>
                            </tr>
                          `;
                        })
                        .join('')}
                    </tbody>
                  </table>
                </div>
              `
              }
            </div>
            <div class="admin-modal-footer">
              <button type="button" data-close-history-modal="true" class="admin-btn admin-btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      `
          : ''
      }
    `;

    // Search & Filters bindings
    bindLiveSearchInput('admin-inv-stock-search', 'adminInventoryStockSearch', () => {
      state.adminInventoryPage = 1;
      renderDashboardContent();
    });

    const invCategoryEl = document.getElementById('admin-inv-category-filter');
    if (invCategoryEl) {
      invCategoryEl.addEventListener('change', (e) => {
        state.adminInventoryCategoryFilter = e.target.value;
        state.adminInventoryPage = 1;
        renderDashboardContent();
      });
    }

    const invStockFilterEl = document.getElementById('admin-inv-stock-filter');
    if (invStockFilterEl) {
      invStockFilterEl.addEventListener('change', (e) => {
        state.adminInventoryStockFilter = e.target.value;
        state.adminInventoryPage = 1;
        renderDashboardContent();
      });
    }

    ['admin-inv-reset-filters', 'admin-inv-empty-reset-btn'].forEach((btnId) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => {
          state.adminInventoryStockSearch = '';
          state.adminInventoryCategoryFilter = 'all';
          state.adminInventoryStockFilter = 'all';
          state.adminInventoryPage = 1;
          renderDashboardContent();
        });
      }
    });

    // Pagination buttons
    adminInventoryEl.querySelectorAll('[data-inv-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextP = Number(btn.getAttribute('data-inv-page'));
        if (Number.isFinite(nextP) && nextP >= 1) {
          state.adminInventoryPage = nextP;
          renderDashboardContent();
        }
      });
    });

    // Top toolbar buttons
    const openAddMatBtn = document.getElementById('admin-open-add-material-btn');
    if (openAddMatBtn) {
      openAddMatBtn.addEventListener('click', () => {
        state.adminOpenActionMenuId = '';
        state.adminEditingMaterialId = '';
        state.adminMaterialFormOpen = true;
        renderDashboardContent();
      });
    }

    const openHistoryBtn = document.getElementById('admin-open-history-modal-btn');
    if (openHistoryBtn) {
      openHistoryBtn.addEventListener('click', () => {
        state.adminOpenActionMenuId = '';
        state.adminHistoryMaterialId = 'all';
        state.adminHistoryModalOpen = true;
        renderDashboardContent();
      });
    }

    // Three-dot action menu trigger
    adminInventoryEl.querySelectorAll('[data-action-menu-trigger]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menuId = btn.getAttribute('data-action-menu-trigger') || '';
        state.adminOpenActionMenuId = state.adminOpenActionMenuId === menuId ? '' : menuId;
        renderDashboardContent();
      });
    });

    // Three-dot action menu items (Add Stock, Use Stock, Edit Material, View Stock History, Remove Material)
    adminInventoryEl.querySelectorAll('[data-inv-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-inv-action') || '';
        const mid = btn.getAttribute('data-material-id') || '';
        const mat = state.materials.find((m) => m.id === mid);
        state.adminOpenActionMenuId = '';

        if (action === 'add-stock' && mat) {
          state.adminMovementMode = 'Stock In';
          state.adminMovementMaterialId = mid;
          state.adminMovementProductId = mid;
          state.adminMovementQuantity = '10';
          state.adminMovementPurchaseCost = '';
          state.adminMovementFormOpen = true;
          renderDashboardContent();
          return;
        }

        if (action === 'use-stock' && mat) {
          state.adminMovementMode = 'Stock Out';
          state.adminMovementMaterialId = mid;
          state.adminMovementProductId = mid;
          state.adminMovementQuantity = '5';
          state.adminMovementFormOpen = true;
          renderDashboardContent();
          return;
        }

        if (action === 'edit-material' && mat) {
          state.adminEditingMaterialId = mid;
          state.adminMaterialFormOpen = true;
          renderDashboardContent();
          return;
        }

        if (action === 'view-history') {
          state.adminHistoryMaterialId = mid || 'all';
          state.adminHistoryModalOpen = true;
          renderDashboardContent();
          return;
        }

        if (action === 'remove-material' && mat) {
          renderDashboardContent();
          openAdminConfirmModal({
            title: 'Remove Material',
            message: `Are you sure you want to remove "${mat.name}" (${mat.sku}) from inventory? This action cannot be undone.`,
            confirmLabel: 'Remove Material',
            onConfirm: () => {
              const removal = removeMaterialFromInventory({
                materials: state.materials,
                materialId: mid,
              });
              if (!removal.ok) {
                showAdminBanner(removal.errorMessage || 'Could not remove material.', true);
                return;
              }
              state.materials = removal.updatedMaterials;
              saveMaterialsToStorage();
              showAdminBanner(`Removed "${mat.name}" from workshop inventory.`);
              renderDashboardContent();
            },
          });
        }
      });
    });

    // Modal 1: Add / Use Stock Modal handlers
    adminInventoryEl.querySelectorAll('[data-close-movement-modal]').forEach((el) => {
      el.addEventListener('click', () => {
        state.adminMovementFormOpen = false;
        renderDashboardContent();
      });
    });

    adminInventoryEl.querySelectorAll('[data-movement-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.adminMovementMode = btn.getAttribute('data-movement-mode') || 'Stock In';
        renderDashboardContent();
      });
    });

    const moveProdSelect = document.getElementById('inv-move-product');
    if (moveProdSelect) {
      moveProdSelect.addEventListener('change', (e) => {
        state.adminMovementMaterialId = e.target.value;
        state.adminMovementProductId = e.target.value;
        renderDashboardContent();
      });
    }

    const moveQtyInput = document.getElementById('inv-move-qty');
    if (moveQtyInput) {
      moveQtyInput.addEventListener('input', (e) => {
        state.adminMovementQuantity = e.target.value;
        const previewEl = document.getElementById('admin-stock-live-preview');
        if (previewEl && selectedMaterial) {
          const updatedPreview = describeMaterialStockPreview(
            selectedMaterial,
            activeMovementMode,
            e.target.value
          );
          previewEl.innerHTML = `
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold text-slate-600">Updated Balance:</span>
              <span class="font-mono-tech text-slate-800">
                ${updatedPreview.currentStock} ${esc(updatedPreview.unit)}
              </span>
              <span aria-hidden="true">→</span>
              <span class="font-mono-tech font-bold ${
                updatedPreview.insufficientStock
                  ? 'text-rose-700'
                  : activeMovementMode === 'Stock In'
                  ? 'text-emerald-700'
                  : 'text-[#0095FF]'
              }">
                ${
                  updatedPreview.insufficientStock
                    ? `Insufficient stock (${updatedPreview.currentStock} ${esc(updatedPreview.unit)} available)`
                    : `${updatedPreview.projectedStock} ${esc(updatedPreview.unit)}`
                }
              </span>
            </div>
            <span class="text-slate-500 font-mono-tech">
              Unit cost: ${usd(selectedMaterial?.unitCost || 0)}/${esc(updatedPreview.unit)}
            </span>
          `;
        }
      });
    }

    const moveReasonSelect = document.getElementById('inv-move-reason');
    if (moveReasonSelect) {
      moveReasonSelect.addEventListener('change', (e) => {
        state.adminMovementReason = e.target.value;
        const customWrap = document.getElementById('inv-move-custom-reason-wrap');
        if (customWrap) {
          customWrap.classList.toggle('hidden', state.adminMovementReason !== 'Other');
        }
      });
    }

    const movementForm = document.getElementById('admin-stock-movement-form');
    if (movementForm) {
      movementForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const materialId = document.getElementById('inv-move-product')?.value || '';
        const quantity = Number(document.getElementById('inv-move-qty')?.value || 0);
        const date = document.getElementById('inv-move-date')?.value || state.adminMovementDate;
        const purchaseCost = document.getElementById('inv-move-cost')?.value ?? '';
        const reasonSel =
          document.getElementById('inv-move-reason')?.value || 'Workshop Production Allocation';
        const customReason = document.getElementById('inv-move-custom-reason')?.value.trim() || '';
        const finalReason =
          activeMovementMode === 'Stock Out'
            ? reasonSel === 'Other'
              ? customReason || 'Other'
              : reasonSel
            : 'Workshop Raw Material Restock';

        const adminName = state.sessionUser?.name
          ? `${state.sessionUser.name} (Admin)`
          : 'Lillia Mercier (Business Owner)';

        const result = applyMaterialStockMovement({
          materials: state.materials,
          adminName,
          movementInput: {
            materialId,
            transactionType: activeMovementMode,
            quantity,
            purchaseCost,
            reason: finalReason,
            date,
          },
        });

        const feedbackEl = document.getElementById('admin-stock-movement-feedback');
        if (!result.ok) {
          if (feedbackEl) {
            feedbackEl.textContent = result.errorMessage;
            feedbackEl.className =
              'text-xs font-semibold p-2.5 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 block';
          }
          return;
        }

        state.materials = result.updatedMaterials;
        saveMaterialsToStorage();
        state.inventoryTransactions.unshift(result.transaction);
        saveInventoryTransactionsToStorage();
        state.adminMovementFormOpen = false;

        showAdminBanner(
          `${result.transaction.transactionType === 'Stock In' ? 'Added stock' : 'Used stock'}: "${result.transaction.materialName}" updated from ${result.transaction.previousStock} ${result.transaction.unit} to ${result.transaction.newStock} ${result.transaction.unit}.`
        );
        renderDashboardContent();
      });
    }

    // Modal 2: Add / Edit Material Modal handlers
    adminInventoryEl.querySelectorAll('[data-close-material-modal]').forEach((el) => {
      el.addEventListener('click', () => {
        state.adminEditingMaterialId = '';
        state.adminMaterialFormOpen = false;
        renderDashboardContent();
      });
    });

    const matForm = document.getElementById('admin-material-form');
    if (matForm) {
      matForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('mat-name')?.value.trim() || '';
        const materialType = document.getElementById('mat-type')?.value || 'Hardwood Timber';
        const unit = document.getElementById('mat-unit')?.value.trim() || 'bd ft';
        const unitCost = Number(document.getElementById('mat-cost')?.value ?? 0);
        const stockQuantity = Number(document.getElementById('mat-stock')?.value ?? 0);
        const minStockLevel = Number(document.getElementById('mat-min-stock')?.value ?? 10);

        const validation = validateMaterialInput({
          name,
          unit,
          unitCost,
          stockQuantity,
        });
        const feedbackEl = document.getElementById('admin-material-form-feedback');
        if (!validation.valid) {
          if (feedbackEl) {
            feedbackEl.textContent = validation.errorMessage;
            feedbackEl.className =
              'text-xs font-semibold p-2.5 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 block';
          }
          return;
        }

        const existingMat = state.adminEditingMaterialId
          ? state.materials.find((m) => m.id === state.adminEditingMaterialId) || null
          : null;
        const savedMat = buildMaterialRecord(
          {
            name,
            materialType,
            unit,
            unitCost,
            stockQuantity,
            minStockLevel,
          },
          existingMat
        );

        if (existingMat) {
          state.materials = state.materials.map((m) => (m.id === existingMat.id ? savedMat : m));
          showAdminBanner(
            `Updated material "${savedMat.name}" (${savedMat.stockQuantity} ${savedMat.unit} available).`
          );
        } else {
          state.materials.unshift(savedMat);
          showAdminBanner(
            `Added new material "${savedMat.name}" (${savedMat.stockQuantity} ${savedMat.unit} available).`
          );
        }

        saveMaterialsToStorage();
        state.adminEditingMaterialId = '';
        state.adminMaterialFormOpen = false;
        renderDashboardContent();
      });
    }

    // Modal 3: Stock History Modal handlers
    adminInventoryEl.querySelectorAll('[data-close-history-modal]').forEach((el) => {
      el.addEventListener('click', () => {
        state.adminHistoryModalOpen = false;
        renderDashboardContent();
      });
    });

    const histMatSelect = document.getElementById('admin-inv-history-material');
    if (histMatSelect) {
      histMatSelect.addEventListener('change', (e) => {
        state.adminHistoryMaterialId = e.target.value;
        renderDashboardContent();
      });
    }

    const histTypeSelect = document.getElementById('admin-inv-history-type');
    if (histTypeSelect) {
      histTypeSelect.addEventListener('change', (e) => {
        state.adminInventoryHistoryTypeFilter = e.target.value;
        renderDashboardContent();
      });
    }

    const histResetBtn = document.getElementById('admin-inv-history-reset');
    if (histResetBtn) {
      histResetBtn.addEventListener('click', () => {
        state.adminHistoryMaterialId = 'all';
        state.adminInventoryHistoryTypeFilter = 'all';
        renderDashboardContent();
      });
    }
  }

  // 7. Populate Voucher Product Dropdown & Issued Vouchers Table (#admin-tab-vouchers)
  const vchSelect = document.getElementById('vch-product');
  if (vchSelect) {
    const prevSelectedProduct = vchSelect.value;
    vchSelect.innerHTML = state.catalog
      .map((p) => `<option value="${esc(p.id)}">${esc(p.name)} (${esc(p.sku)} · ${usd(p.effectivePrice)})</option>`)
      .join('');
    if (prevSelectedProduct && state.catalog.some((p) => p.id === prevSelectedProduct)) {
      vchSelect.value = prevSelectedProduct;
    }
    const maxHintEl = document.getElementById('vch-discount-max-hint');
    const selectedProd =
      state.catalog.find((p) => p.id === vchSelect.value) || state.catalog[0];
    if (selectedProd && maxHintEl) {
      maxHintEl.textContent = `Max: ${usd(selectedProd.effectivePrice)}`;
    }
  }

  const adminVouchersEl = document.getElementById('admin-vouchers-list');
  if (adminVouchersEl) {
    const nowMs = Date.now();
    const activeCount = state.vouchers.filter((v) => computeVoucherStatusInfo(v, nowMs).status === 'Active').length;
    const expiringSoonCount = state.vouchers.filter(
      (v) => computeVoucherStatusInfo(v, nowMs).status === 'Expiring Soon'
    ).length;

    adminVouchersEl.innerHTML = `
      <div class="admin-card overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-slate-900">Issued Vouchers (${state.vouchers.length})</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Fixed-amount single-product vouchers · All timestamps displayed in Asia/Manila (PHT)
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="admin-status-badge admin-status-voucher-active">
              <span class="admin-status-badge-dot"></span>${activeCount} Active
            </span>
            ${
              expiringSoonCount > 0
                ? `<span class="admin-status-badge admin-status-voucher-expiring">
                    <span class="admin-status-badge-dot"></span>${expiringSoonCount} Expiring Soon
                  </span>`
                : ''
            }
          </div>
        </div>
        ${
          state.vouchers.length === 0
            ? `
          <div class="admin-empty-state">
            <p class="text-sm font-bold text-slate-900">No vouchers created yet</p>
            <p class="text-xs text-slate-500 mt-1">Use the form above to issue a fixed-amount discount voucher for a customer.</p>
          </div>
        `
            : `
          <div class="overflow-x-auto">
            <table class="admin-table vch-table">
              <thead>
                <tr>
                  <th>Voucher Code</th>
                  <th>Customer</th>
                  <th class="admin-col-primary">Eligible Product</th>
                  <th>Discount Amount</th>
                  <th>Issued Date &amp; Time</th>
                  <th>Expiration Date &amp; Time</th>
                  <th>Remaining Time</th>
                  <th>Status</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${state.vouchers
                  .map((v) => {
                    const statusInfo = computeVoucherStatusInfo(v, nowMs);
                    const issuedInfo = formatVoucherIssuedDisplay(v);
                    const expiryInfo = formatVoucherExpiryDisplay(v);
                    const discountAmt = Number(v.discountAmount ?? v.discountValue ?? 0);
                    const matchedProd = state.catalog.find((p) => p.id === (v.furnitureId || v.productId));
                    const prodPrice = Number(matchedProd?.effectivePrice ?? matchedProd?.price ?? v.productPrice ?? 0);
                    const menuId = `vch-menu-${v.id}`;
                    const isMenuOpen = state.adminOpenActionMenuId === menuId;
                    const canRevoke = statusInfo.status !== 'Revoked' && statusInfo.status !== 'Used';

                    const remainingPillClass = !statusInfo.isUsable
                      ? 'vch-remaining-inactive'
                      : statusInfo.isExpiringSoon
                      ? 'vch-remaining-expiring'
                      : 'vch-remaining-active';

                    return `
                      <tr>
                        <td class="whitespace-nowrap">
                          <span class="vch-code-chip">${esc(v.code)}</span>
                          <p class="admin-table-sub font-mono-tech mt-1">VoucherID: ${esc(v.voucherId || v.code || v.id)}</p>
                        </td>
                        <td>
                          <p class="admin-table-title">${esc(v.customerName || 'Showroom Client')}</p>
                          <p class="admin-table-sub font-mono-tech">${esc(v.customerEmail)}</p>
                        </td>
                        <td class="admin-col-primary">
                          <p class="admin-table-title">${esc(v.furnitureName || v.productName)}</p>
                          <p class="admin-table-sub font-mono-tech">${esc(v.furnitureSku || 'LR-ITEM')}${prodPrice > 0 ? ` · ${usd(prodPrice)}` : ''}</p>
                        </td>
                        <td class="font-mono-tech text-xs font-bold text-[#0095FF] whitespace-nowrap">
                          -${usd(discountAmt)}
                        </td>
                        <td class="whitespace-nowrap">
                          <p class="text-xs font-semibold text-slate-800">${esc(issuedInfo.primary)}</p>
                          <p class="text-[11px] text-slate-500 font-mono-tech">${esc(issuedInfo.secondary)}</p>
                        </td>
                        <td class="whitespace-nowrap">
                          <p class="text-xs font-semibold text-slate-800">${esc(expiryInfo.primary)}</p>
                          <p class="text-[11px] text-slate-500 font-mono-tech">${esc(expiryInfo.secondary)}</p>
                        </td>
                        <td class="whitespace-nowrap">
                          ${
                            statusInfo.isUsable && statusInfo.expiresAtMs
                              ? `<span data-voucher-countdown="${esc(v.id)}" data-voucher-expires="${statusInfo.expiresAtMs}" data-voucher-status="${esc(statusInfo.status)}" class="vch-remaining-badge ${remainingPillClass}">${esc(statusInfo.remainingLabel)}</span>`
                              : `<span class="vch-remaining-badge ${remainingPillClass}">${esc(statusInfo.remainingLabel)}</span>`
                          }
                        </td>
                        <td class="whitespace-nowrap">
                          <span class="admin-status-badge ${statusInfo.badgeClass}">
                            <span class="admin-status-badge-dot"></span>${esc(statusInfo.status)}
                          </span>
                        </td>
                        <td class="text-right whitespace-nowrap">
                          <div class="admin-action-menu">
                            <button
                              type="button"
                              data-vch-menu-trigger="${esc(menuId)}"
                              aria-label="Actions for voucher ${esc(v.code)}"
                              aria-expanded="${isMenuOpen ? 'true' : 'false'}"
                              class="admin-action-trigger"
                            >
                              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <circle cx="12" cy="5" r="1.8" />
                                <circle cx="12" cy="12" r="1.8" />
                                <circle cx="12" cy="19" r="1.8" />
                              </svg>
                            </button>
                            <div class="admin-action-dropdown ${isMenuOpen ? '' : 'hidden'}" role="menu">
                              <button
                                type="button"
                                data-vch-copy-code="${esc(v.code)}"
                                class="admin-action-item"
                                role="menuitem"
                              >
                                Copy Code
                              </button>
                              ${
                                canRevoke
                                  ? `<div class="admin-action-divider"></div>
                                    <button
                                      type="button"
                                      data-revoke-voucher="${esc(v.id)}"
                                      class="admin-action-item is-danger"
                                      role="menuitem"
                                    >
                                      Revoke Voucher
                                    </button>`
                                  : ''
                              }
                            </div>
                          </div>
                        </td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        `
        }
      </div>
    `;

    adminVouchersEl.querySelectorAll('[data-vch-menu-trigger]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menuId = btn.getAttribute('data-vch-menu-trigger') || '';
        state.adminOpenActionMenuId = state.adminOpenActionMenuId === menuId ? '' : menuId;
        renderDashboardContent();
      });
    });

    adminVouchersEl.querySelectorAll('[data-vch-copy-code]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-vch-copy-code') || '';
        state.adminOpenActionMenuId = '';
        if (navigator.clipboard) {
          navigator.clipboard.writeText(code).catch(() => {});
        }
        showAdminBanner(`Copied voucher code "${code}" to clipboard.`);
        renderDashboardContent();
      });
    });

    adminVouchersEl.querySelectorAll('[data-revoke-voucher]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vid = btn.getAttribute('data-revoke-voucher') || '';
        const vch = state.vouchers.find((v) => v.id === vid);
        state.adminOpenActionMenuId = '';
        if (!vch) return;
        renderDashboardContent();
        openAdminConfirmModal({
          title: 'Revoke Voucher',
          message: `Are you sure you want to revoke voucher "${vch.code}" (${usd(vch.discountAmount)} OFF "${vch.furnitureName}") assigned to ${vch.customerEmail}? It will immediately become unusable.`,
          confirmLabel: 'Revoke Voucher',
          onConfirm: async () => {
            try {
              const resp = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                  action: 'revoke_voucher',
                  voucherId: vid,
                }),
              });
              const data = await resp.json();
              if (resp.ok && data.ok && Array.isArray(data.vouchers)) {
                state.vouchers = data.vouchers;
              } else {
                const fallback = revokeVoucherInList(state.vouchers, vid, Date.now());
                if (fallback.ok) state.vouchers = fallback.vouchers;
                syncDatabaseStore('sync_store');
              }
            } catch (_err) {
              const fallback = revokeVoucherInList(state.vouchers, vid, Date.now());
              if (fallback.ok) state.vouchers = fallback.vouchers;
              syncDatabaseStore('sync_store');
            }
            if (
              state.appliedVoucher &&
              String(state.appliedVoucher.id) === String(vid)
            ) {
              state.appliedVoucher = null;
            }
            showAdminBanner(`Voucher ${vch.code} has been revoked.`);
            renderDashboardContent();
          },
        });
      });
    });
  }

  // 8. Admin Client Orders & Workshop Production Management Table (#admin-tab-orders)
  const adminOrdersEl = document.getElementById('admin-tab-orders');
  if (adminOrdersEl) {
    const statusOptions = [
      'Order Confirmed · In Production Queue',
      'Timber Selection & Kiln Verification',
      'In Joinery & Millwork',
      'Hand-Rubbed Finishing & Upholstery',
      'Quality Inspection · Ready for Dispatch',
      'Dispatched · White-Glove Transit',
      'Delivered · Completed',
    ];

    const ordQuery = (state.adminOrderSearch || '').trim().toLowerCase();
    const stageFilter = state.adminOrderStage || 'all';
    const hasActiveOrdFilters = Boolean(ordQuery) || stageFilter !== 'all';

    const { activeOrders, completedOrders } = partitionOrdersByCompletion(state.orders);
    const inProdCount = activeOrders.filter((o) => /Joinery|Finishing|Millwork|Quality/i.test(o.status)).length;

    const matchesOrderQuery = (o) =>
      !ordQuery ||
      o.orderNumber.toLowerCase().includes(ordQuery) ||
      o.clientName.toLowerCase().includes(ordQuery) ||
      o.clientEmail.toLowerCase().includes(ordQuery) ||
      o.furnitureName.toLowerCase().includes(ordQuery) ||
      (o.materialName || '').toLowerCase().includes(ordQuery);

    const filteredActiveOrders = activeOrders.filter((o) => {
      if (!matchesOrderQuery(o)) return false;
      if (stageFilter === 'completed') return false;
      if (stageFilter === 'confirmed') return /Confirmed|Inquiry|Timber/i.test(o.status);
      if (stageFilter === 'production') return /Joinery|Finishing|Millwork/i.test(o.status);
      if (stageFilter === 'quality') return /Quality/i.test(o.status);
      if (stageFilter === 'delivered') return /Dispatched/i.test(o.status);
      return true;
    });

    const filteredCompletedOrders = completedOrders.filter((o) => {
      if (!matchesOrderQuery(o)) return false;
      if (stageFilter !== 'all' && stageFilter !== 'completed' && stageFilter !== 'delivered') {
        return false;
      }
      return true;
    });

    adminOrdersEl.innerHTML = `
      <div class="space-y-6">
        <div class="admin-summary-grid-4">
          <div class="admin-summary-card">
            <span class="admin-summary-label">Total Orders</span>
            <span class="admin-summary-value">${state.orders.length}</span>
            <span class="admin-summary-sub">All client commissions</span>
          </div>
          <div class="admin-summary-card">
            <span class="admin-summary-label">Active Orders</span>
            <span id="admin-orders-active-count" class="admin-summary-value is-blue">${activeOrders.length}</span>
            <span class="admin-summary-sub">In queue, workshop, or transit</span>
          </div>
          <div class="admin-summary-card">
            <span class="admin-summary-label">In Production</span>
            <span class="admin-summary-value is-orange">${inProdCount}</span>
            <span class="admin-summary-sub">Joinery &amp; finishing</span>
          </div>
          <div class="admin-summary-card">
            <span class="admin-summary-label">Completed Orders</span>
            <span id="admin-orders-completed-count" class="admin-summary-value is-green">${completedOrders.length}</span>
            <span class="admin-summary-sub">Added to customer transactions</span>
          </div>
        </div>

        <!-- Active Orders Section -->
        <div id="admin-active-orders-section" data-testid="admin-active-orders-section" class="admin-card overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Active Orders (${filteredActiveOrders.length})</h3>
              <p class="text-xs text-slate-500">Select the workshop stage in Order Stage (including "Delivered · Completed") to update progress or move the order to Completed Orders and the customer's Transactions.</p>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-sky-50 text-[#0077CC] border border-sky-200 font-mono-tech text-xs font-bold">
              ${activeOrders.length} Active
            </span>
          </div>

          <div class="admin-toolbar">
            <div class="admin-toolbar-filters">
              <input
                id="admin-orders-search"
                type="search"
                value="${esc(state.adminOrderSearch)}"
                placeholder="Search order #, customer, product, or material..."
                aria-label="Search customer orders"
                class="admin-input admin-search-input"
              />
              <select id="admin-orders-stage-filter" aria-label="Filter orders by production stage" class="admin-select admin-filter-select">
                <option value="all" ${stageFilter === 'all' ? 'selected' : ''}>All Stages (${state.orders.length})</option>
                <option value="confirmed" ${stageFilter === 'confirmed' ? 'selected' : ''}>Confirmed &amp; Timber Prep</option>
                <option value="production" ${stageFilter === 'production' ? 'selected' : ''}>In Production &amp; Finishing</option>
                <option value="quality" ${stageFilter === 'quality' ? 'selected' : ''}>Quality Check</option>
                <option value="delivered" ${stageFilter === 'delivered' ? 'selected' : ''}>Dispatched / In Transit</option>
                <option value="completed" ${stageFilter === 'completed' ? 'selected' : ''}>Completed Orders (${completedOrders.length})</option>
              </select>
              <button
                type="button"
                id="admin-reset-order-filters"
                class="admin-btn admin-btn-sm admin-btn-secondary ${hasActiveOrdFilters ? '' : 'opacity-60'}"
              >
                Reset Filters
              </button>
            </div>
            <span class="text-xs font-medium text-slate-500">Showing ${filteredActiveOrders.length} active · ${filteredCompletedOrders.length} completed</span>
          </div>

          ${
            filteredActiveOrders.length === 0
              ? `
            <div class="admin-empty-state space-y-3">
              <p class="text-base font-bold text-slate-900">${
                stageFilter === 'completed'
                  ? 'Viewing Completed Orders below'
                  : 'No active orders match your filter'
              }</p>
              <p class="text-xs text-slate-500 max-w-sm mx-auto">${
                stageFilter === 'completed'
                  ? 'See the Completed Orders section below for all fulfilled customer orders.'
                  : 'All matching orders may have been completed and moved to the Completed Orders section below.'
              }</p>
              ${
                hasActiveOrdFilters
                  ? `<div>
                <button type="button" id="admin-reset-order-filters-empty" class="admin-btn admin-btn-sm admin-btn-secondary">
                  Reset Filters
                </button>
              </div>`
                  : ''
              }
            </div>
          `
              : `
            <div class="overflow-x-auto">
              <table class="admin-table" data-testid="admin-active-orders-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th class="admin-col-primary">Product &amp; Finish</th>
                    <th>Order Stage</th>
                    <th class="text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredActiveOrders
                    .map((o) => {
                      const realIdx = state.orders.findIndex((item) => item.orderNumber === o.orderNumber);
                      const totalAmt = Number(o.totalAmount || 0);
                      const isCancelled = /Cancelled/i.test(String(o.status || '')) || o.sqlStatus === 'Cancelled';
                      const explicitOrderId = o.orderId || o.orderNumber || o.id;
                      return `
                        <tr data-testid="admin-active-order-row-${esc(o.orderNumber)}">
                          <td class="whitespace-nowrap">
                            <div class="flex items-center gap-1.5">
                              <p class="font-mono-tech text-xs font-bold text-[#0095FF]">#${esc(o.orderNumber)}</p>
                              ${
                                o.itemType === 'Custom'
                                  ? `<span class="px-1.5 py-0.5 rounded bg-sky-50 text-[#0095FF] border border-sky-200 font-mono-tech text-[10px] font-bold">Custom</span>`
                                  : ''
                              }
                            </div>
                            <p class="admin-table-sub font-mono-tech mt-0.5">OrderID: ${esc(explicitOrderId)} · ${esc(o.orderDate || '2026-10-28')}</p>
                          </td>
                          <td class="whitespace-nowrap">
                            <p class="admin-table-title">${esc(o.clientName)}</p>
                            <p class="admin-table-sub">${esc(o.clientEmail)}</p>
                          </td>
                          <td class="admin-col-primary">
                            <p class="admin-table-title">${esc(o.furnitureName)}</p>
                            <p class="admin-table-sub mt-0.5">
                              ${esc(o.selectedFinish)} · ${esc(o.materialName || 'FAS Hardwood')}
                            </p>
                          </td>
                          <td class="whitespace-nowrap">
                            <select
                              aria-label="Update status for order ${esc(o.orderNumber)}"
                              data-admin-order-idx="${realIdx}"
                              class="admin-select admin-order-status-select"
                            >
                              ${statusOptions
                                .map(
                                  (st) =>
                                    `<option value="${esc(st)}" ${o.status === st ? 'selected' : ''}>${esc(st)}</option>`
                                )
                                .join('')}
                              ${
                                !statusOptions.includes(o.status)
                                  ? `<option value="${esc(o.status)}" selected>${esc(o.status)}</option>`
                                  : ''
                              }
                            </select>
                            ${
                              o.cancellationRequested
                                ? `
                              <div class="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
                                <p class="text-[11px] font-bold text-amber-900">
                                  ⚠ Customer Requested Cancellation
                                </p>
                                <div class="flex items-center gap-2">
                                  <button
                                    type="button"
                                    data-admin-approve-cancel="${esc(o.orderNumber)}"
                                    class="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold cursor-pointer"
                                  >
                                    Approve Cancel
                                  </button>
                                  <button
                                    type="button"
                                    data-admin-decline-cancel="${esc(o.orderNumber)}"
                                    class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            `
                                : o.cancellationStatus === 'Approved' || isCancelled
                                ? `<p class="mt-1 text-[11px] font-bold text-rose-600">Cancelled (Approved by Admin)</p>`
                                : ''
                            }
                          </td>
                          <td class="text-right whitespace-nowrap">
                            <p class="font-mono-tech text-sm font-bold text-slate-900">${usd(totalAmt)}</p>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          }
        </div>

        <!-- Completed Orders Section -->
        <div id="admin-completed-orders-section" data-testid="admin-completed-orders-section" class="admin-card overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200 bg-emerald-50/60 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-slate-900">Completed Orders (${filteredCompletedOrders.length})</h3>
                <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono-tech text-[11px] font-bold">
                  Synced with Customer Transactions
                </span>
              </div>
              <p class="text-xs text-slate-600 mt-0.5">
                Orders set to "Delivered · Completed" in Order Stage appear in this section and are automatically added to the customer's Transaction Orders ledger.
              </p>
            </div>
            <span id="admin-completed-section-badge" class="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-mono-tech text-xs font-bold">
              ${completedOrders.length} Completed
            </span>
          </div>

          ${
            filteredCompletedOrders.length === 0
              ? `
            <div class="admin-empty-state space-y-2 py-8">
              <p class="text-sm font-bold text-slate-900">No completed orders yet</p>
              <p class="text-xs text-slate-500 max-w-md mx-auto">
                Select "Delivered · Completed" in the Order Stage dropdown on any active order above to move it here and add it to the customer's Transaction Orders.
              </p>
            </div>
          `
              : `
            <div class="overflow-x-auto">
              <table class="admin-table" data-testid="admin-completed-orders-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Transaction Ref</th>
                    <th>Customer</th>
                    <th class="admin-col-primary">Product &amp; Finish</th>
                    <th>Completed Date</th>
                    <th>Status</th>
                    <th class="text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody id="admin-completed-orders-tbody">
                  ${filteredCompletedOrders
                    .map((o) => {
                      const totalAmt = Number(o.totalAmount || 0);
                      const ordDigits = String(o.orderNumber || '').split('-').pop() || '0000';
                      const explicitOrderId = o.orderId || o.orderNumber || ordDigits;
                      const txRef = o.transactionReference || `TXN-2026-${ordDigits}`;
                      const completedDate = o.completedAt || o.orderDate || '2026-10-28';
                      return `
                        <tr data-testid="admin-completed-order-row-${esc(o.orderNumber)}">
                          <td class="whitespace-nowrap">
                            <p class="font-mono-tech text-xs font-bold text-[#0095FF]">#${esc(o.orderNumber)}</p>
                            <p class="admin-table-sub font-mono-tech mt-0.5">OrderID: ${esc(explicitOrderId)}</p>
                          </td>
                          <td class="whitespace-nowrap">
                            <span class="font-mono-tech text-xs font-bold text-slate-900">${esc(txRef)}</span>
                          </td>
                          <td class="whitespace-nowrap">
                            <p class="admin-table-title">${esc(o.clientName)}</p>
                            <p class="admin-table-sub">${esc(o.clientEmail)}</p>
                          </td>
                          <td class="admin-col-primary">
                            <p class="admin-table-title">${esc(o.furnitureName)}</p>
                            <p class="admin-table-sub mt-0.5">
                              ${esc(o.selectedFinish)} · ${esc(o.materialName || 'FAS Hardwood')}
                            </p>
                          </td>
                          <td class="whitespace-nowrap">
                            <span class="font-mono-tech text-xs text-slate-600">${esc(completedDate)}</span>
                          </td>
                          <td class="whitespace-nowrap">
                            <span class="admin-status-badge admin-status-in-stock">
                              <span class="admin-status-badge-dot"></span>Completed · In Customer Transactions
                            </span>
                          </td>
                          <td class="text-right whitespace-nowrap">
                            <p class="font-mono-tech text-sm font-bold text-emerald-700">${usd(totalAmt)}</p>
                          </td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;

    bindLiveSearchInput('admin-orders-search', 'adminOrderSearch', renderDashboardContent);

    const stageSelect = document.getElementById('admin-orders-stage-filter');
    if (stageSelect) {
      stageSelect.addEventListener('change', (e) => {
        state.adminOrderStage = e.target.value;
        renderDashboardContent();
      });
    }

    ['admin-reset-order-filters', 'admin-reset-order-filters-empty'].forEach((btnId) => {
      const resetOrdBtn = document.getElementById(btnId);
      if (resetOrdBtn) {
        resetOrdBtn.addEventListener('click', () => {
          state.adminOrderSearch = '';
          state.adminOrderStage = 'all';
          renderDashboardContent();
        });
      }
    });

    const handleCompleteOrderWithConfirm = (ord, onCancelCallback) => {
      const applyCompletion = () => {
        const res = applyAdminOrderUpdate({
          orders: state.orders,
          orderNumber: ord.orderNumber,
          updates: { status: 'Delivered · Completed' },
        });
        if (res.ok) {
          state.orders = res.updatedOrders;
          saveOrdersToStorage();
          showAdminBanner(
            `Order #${ord.orderNumber} moved to Completed Orders and added to ${ord.clientName}'s Transaction Orders.`
          );
          renderDashboardContent();
        }
      };

      openAdminConfirmModal({
        title: `Complete Order #${ord.orderNumber}?`,
        message: `Are you sure you want to mark Order #${ord.orderNumber} (${ord.furnitureName}) for ${ord.clientName} as Completed? It will be moved to the Completed Orders section and added to ${ord.clientName}'s Transaction Orders.`,
        confirmLabel: 'Yes, Complete Order',
        confirmVariant: 'primary',
        onConfirm: applyCompletion,
        onCancel: () => {
          if (typeof onCancelCallback === 'function') onCancelCallback();
          renderDashboardContent();
        },
      });
    };

    adminOrdersEl.querySelectorAll('[data-admin-order-idx]').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const idx = Number(sel.getAttribute('data-admin-order-idx'));
        const ord = state.orders[idx];
        if (!ord) return;
        const nextStatus = e.target.value;
        const isCompleting = /Completed|Delivered/i.test(nextStatus);

        if (isCompleting) {
          handleCompleteOrderWithConfirm(ord, () => {
            sel.value = ord.status;
          });
          return;
        }

        const res = applyAdminOrderUpdate({
          orders: state.orders,
          orderNumber: ord.orderNumber,
          updates: { status: nextStatus },
        });
        if (res.ok) {
          state.orders = res.updatedOrders;
          saveOrdersToStorage();
          showAdminBanner(
            `Updated Order #${ord.orderNumber} stage to "${res.updatedOrder.status}" — synced to Customer Dashboard.`
          );
          renderDashboardContent();
        }
      });
    });

    adminOrdersEl.querySelectorAll('[data-admin-approve-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const orderNumber = btn.getAttribute('data-admin-approve-cancel') || '';
        const res = resolveOrderCancellationRequest({
          orders: state.orders,
          orderNumber,
          decision: 'approve',
        });
        if (res.ok) {
          state.orders = res.updatedOrders;
          saveOrdersToStorage();
          showAdminBanner(`Approved cancellation for Order #${orderNumber}. The order is now marked as Cancelled.`);
          renderDashboardContent();
        }
      });
    });

    adminOrdersEl.querySelectorAll('[data-admin-decline-cancel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const orderNumber = btn.getAttribute('data-admin-decline-cancel') || '';
        const res = resolveOrderCancellationRequest({
          orders: state.orders,
          orderNumber,
          decision: 'decline',
        });
        if (res.ok) {
          state.orders = res.updatedOrders;
          saveOrdersToStorage();
          showAdminBanner(`Declined cancellation request for Order #${orderNumber}. The order remains active.`);
          renderDashboardContent();
        }
      });
    });
  }

  // 9. Admin Customer Management Directory (#admin-tab-customers)
  const adminCustomersEl = document.getElementById('admin-tab-customers');
  if (adminCustomersEl) {
    const custQuery = (state.adminCustomerSearch || '').trim().toLowerCase();
    const filteredCustomers = customerDirectory.filter((c) => {
      if (!custQuery) return true;
      return (
        c.name.toLowerCase().includes(custQuery) ||
        c.email.toLowerCase().includes(custQuery) ||
        (c.phone || '').toLowerCase().includes(custQuery) ||
        (c.address || '').toLowerCase().includes(custQuery)
      );
    });

    const activeBuyersCount = customerDirectory.filter((c) => c.orderCount > 0).length;
    const totalCustomerSpend = customerDirectory.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0);

    adminCustomersEl.innerHTML = `
      <div class="space-y-5">
        <div class="admin-summary-grid-4">
          <div class="admin-summary-card">
            <span class="admin-summary-label">Registered Customers</span>
            <span class="admin-summary-value">${customerDirectory.length}</span>
            <span class="admin-summary-sub">Client accounts</span>
          </div>
          <div class="admin-summary-card">
            <span class="admin-summary-label">Active Buyers</span>
            <span class="admin-summary-value is-green">${activeBuyersCount}</span>
            <span class="admin-summary-sub">With 1+ orders</span>
          </div>
          <div class="admin-summary-card">
            <span class="admin-summary-label">Total Orders Placed</span>
            <span class="admin-summary-value is-blue">${state.orders.length}</span>
            <span class="admin-summary-sub">Across all clients</span>
          </div>
          <div class="admin-summary-card">
            <span class="admin-summary-label">Total Customer Spend</span>
            <span class="admin-summary-value font-mono-tech">${usd(totalCustomerSpend)}</span>
            <span class="admin-summary-sub">Lifetime order value</span>
          </div>
        </div>

        <div class="admin-card overflow-hidden">
          <div class="admin-toolbar">
            <div class="admin-toolbar-filters">
              <input
                id="admin-customers-search"
                type="search"
                value="${esc(state.adminCustomerSearch)}"
                placeholder="Search customer name, email, phone, or city..."
                aria-label="Search customers"
                class="admin-input admin-search-input"
              />
              <button
                type="button"
                id="admin-reset-customer-filters"
                class="admin-btn admin-btn-sm admin-btn-secondary ${custQuery ? '' : 'opacity-60'}"
              >
                Reset Filters
              </button>
            </div>
            <span class="text-xs font-medium text-slate-500">Showing ${filteredCustomers.length} of ${customerDirectory.length} customers</span>
          </div>

          ${
            filteredCustomers.length === 0
              ? `
            <div class="admin-empty-state space-y-3">
              <p class="text-base font-bold text-slate-900">No matching customers found</p>
              <p class="text-xs text-slate-500 max-w-sm mx-auto">Try clearing your search filter.</p>
            </div>
          `
              : `
            <div class="overflow-x-auto">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th class="admin-col-primary">Customer Name</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th>Delivery Address</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredCustomers
                    .map((c) => {
                      const custAvatar = resolveCustomerAvatarState(c);
                      return `
                      <tr>
                        <td class="admin-col-primary">
                          <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl bg-[#0B0F17] text-[#BCE3FF] font-serif-display text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden">
                              ${
                                custAvatar.hasAvatar
                                  ? `<img src="${esc(custAvatar.avatarSrc)}" alt="${esc(c.name)}" class="w-full h-full object-cover" />`
                                  : `<span>${esc(custAvatar.initials)}</span>`
                              }
                            </div>
                            <div>
                              <p class="admin-table-title">${esc(c.name)}</p>
                              <p class="admin-table-sub font-mono-tech">CustomerID: ${esc(c.customerId || c.id)} · Last order: ${esc(c.lastOrderDate)}</p>
                            </div>
                          </div>
                        </td>
                        <td class="text-xs text-slate-600 whitespace-nowrap">${esc(c.email)}</td>
                        <td class="font-mono-tech text-xs text-slate-600 whitespace-nowrap">${esc(c.phone)}</td>
                        <td class="text-xs text-slate-600">
                          <p class="admin-table-sub">${esc(c.address)}</p>
                        </td>
                        <td class="font-mono-tech font-semibold text-slate-900 whitespace-nowrap">
                          ${c.orderCount} ${c.orderCount === 1 ? 'order' : 'orders'}
                        </td>
                        <td class="font-mono-tech font-semibold text-[#0095FF] whitespace-nowrap">
                          ${usd(c.totalSpent)}
                        </td>
                        <td class="text-right whitespace-nowrap">
                          <button
                            type="button"
                            data-view-customer-orders="${esc(c.email)}"
                            class="admin-btn admin-btn-sm admin-btn-secondary"
                          >
                            View Orders
                          </button>
                        </td>
                      </tr>
                    `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </div>
    `;

    bindLiveSearchInput('admin-customers-search', 'adminCustomerSearch', renderDashboardContent);

    const resetCustBtn = document.getElementById('admin-reset-customer-filters');
    if (resetCustBtn) {
      resetCustBtn.addEventListener('click', () => {
        state.adminCustomerSearch = '';
        renderDashboardContent();
      });
    }

    adminCustomersEl.querySelectorAll('[data-view-customer-orders]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-view-customer-orders') || '';
        state.adminOrderSearch = email;
        state.adminOrderStage = 'all';
        if (window.__switchAdminTab) {
          window.__switchAdminTab('orders');
        }
        renderDashboardContent();
      });
    });
  }

  // 10. Admin Monthly Analytics & Business Reports (#admin-tab-analytics)
  if (state.activeAdminTab === 'analytics') renderAdminAnalyticsSection();
}

function renderDeltaBadge(metric, invertColors = false) {
  if (!metric) return '';
  const dir = metric.direction || 'flat';
  const label = metric.formattedChange || '0.0%';
  let toneClass = 'is-flat';
  let arrow = '→';
  if (dir === 'up') {
    toneClass = invertColors ? 'is-down' : 'is-up';
    arrow = '↑';
  } else if (dir === 'down') {
    toneClass = invertColors ? 'is-up' : 'is-down';
    arrow = '↓';
  }
  return `<span class="analytics-delta-tag ${toneClass}" title="Compared to previous equivalent period">${arrow} ${esc(label)}</span>`;
}

function renderAdminAnalyticsSection() {
  const analyticsEl = document.getElementById('admin-tab-analytics');
  if (!analyticsEl) return;

  // Enforce Admin-Only Access Check
  const isAdminSession =
    state.sessionUser && String(state.sessionUser.role || '').toLowerCase() === 'admin';
  if (!isAdminSession) {
    analyticsEl.innerHTML = `
      <div class="admin-card p-8 text-center space-y-2">
        <p class="text-base font-bold text-rose-700">Administrator Access Required</p>
        <p class="text-xs text-slate-500">Monthly Analytics &amp; Business Reports are restricted to authorized showroom administrators.</p>
      </div>
    `;
    return;
  }

  const nowMs = Date.now();
  const defaultManilaRange = resolveAnalyticsDateRange({ preset: 'this_month' }, nowMs);
  const selectedYear = Number(state.adminAnalyticsYear) || defaultManilaRange.current.year;
  const selectedMonth = Number(state.adminAnalyticsMonth) || defaultManilaRange.current.month;
  const startDateVal = state.adminAnalyticsStartDate || defaultManilaRange.current.startDate;
  const endDateVal = state.adminAnalyticsEndDate || defaultManilaRange.current.endDate;

  const filterInput = {
    preset: state.adminAnalyticsPreset || 'this_month',
    year: selectedYear,
    month: selectedMonth,
    startDate: startDateVal,
    endDate: endDateVal,
  };

  const report = computeMonthlyAnalyticsReport({
    catalog: state.catalog,
    categories: state.categories,
    orders: state.orders,
    customers: state.customers,
    customerProfile: state.customerProfile,
    materials: state.materials,
    inventoryTransactions: state.inventoryTransactions,
    vouchers: state.vouchers,
    filterInput,
    nowMs,
  });

  const s = report.summary;
  const sales = report.salesAnalytics;
  const bestSellers = report.bestSellingProducts;
  const ordAnalytics = report.orderAnalytics;
  const custAnalytics = report.customerAnalytics;
  const invAnalytics = report.inventoryAnalytics;
  const vchAnalytics = report.voucherAnalytics;

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const availableYears = [2024, 2025, 2026, 2027];

  // Build SVG Daily Revenue Chart
  const dailySeries = sales.dailySeries || [];
  const maxDailyRev = Math.max(1, ...dailySeries.map((d) => Number(d.revenue || 0)));
  const maxDailyOrders = Math.max(1, ...dailySeries.map((d) => Number(d.orders || 0)));

  const buildDailyRevenueSvg = () => {
    if (dailySeries.length === 0) {
      return `<p class="text-xs text-slate-400 py-8 text-center">No daily data in selected range.</p>`;
    }
    const svgW = 680;
    const svgH = 210;
    const padL = 52;
    const padR = 16;
    const padT = 18;
    const padB = 34;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;
    const stepX = dailySeries.length > 1 ? plotW / (dailySeries.length - 1) : plotW;
    const barW = Math.max(6, Math.min(20, Math.floor(plotW / Math.max(1, dailySeries.length)) - 4));

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => {
      const y = Math.round(padT + plotH * (1 - pct));
      const val = Math.round(maxDailyRev * pct);
      return `
        <line x1="${padL}" y1="${y}" x2="${svgW - padR}" y2="${y}" stroke="#E2E8F0" stroke-dasharray="3 3" />
        <text x="${padL - 6}" y="${y + 4}" text-anchor="end" fill="#64748B" font-size="10" font-family="monospace">$${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}</text>
      `;
    });

    const points = dailySeries.map((d, idx) => {
      const x =
        dailySeries.length === 1
          ? padL + plotW / 2
          : Math.round(padL + idx * stepX);
      const y = Math.round(padT + plotH * (1 - Number(d.revenue || 0) / maxDailyRev));
      return { x, y, d, idx };
    });

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
    const areaPoints =
      points.length > 1
        ? `${points[0].x},${padT + plotH} ${polylinePoints} ${points[points.length - 1].x},${padT + plotH}`
        : '';

    const labelStep = Math.max(1, Math.ceil(dailySeries.length / 8));

    return `
      <svg viewBox="0 0 ${svgW} ${svgH}" class="w-full h-52 overflow-visible" role="img" aria-label="Daily revenue chart for ${esc(report.period.label)}">
        <defs>
          <linearGradient id="analyticsRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0095FF" stop-opacity="0.26" />
            <stop offset="100%" stop-color="#0095FF" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        ${gridLines.join('')}
        ${areaPoints ? `<polygon points="${areaPoints}" fill="url(#analyticsRevGrad)" />` : ''}
        ${points
          .map((p) => {
            const h = Math.max(2, padT + plotH - p.y);
            const hasRev = Number(p.d.revenue || 0) > 0;
            return `<rect x="${p.x - barW / 2}" y="${p.y}" width="${barW}" height="${h}" rx="3" fill="${hasRev ? '#0095FF' : '#E2E8F0'}" opacity="${hasRev ? '0.85' : '0.45'}">
              <title>${esc(p.d.label)} (${esc(p.d.date)}): ${usd(p.d.revenue)} · ${p.d.orders} order(s)</title>
            </rect>`;
          })
          .join('')}
        ${points.length > 1 ? `<polyline fill="none" stroke="#0077CC" stroke-width="2" points="${polylinePoints}" />` : ''}
        ${points
          .map((p) => {
            const showLabel =
              p.idx === 0 ||
              p.idx === points.length - 1 ||
              p.idx % labelStep === 0 ||
              Number(p.d.revenue || 0) > 0;
            return `
              ${
                Number(p.d.revenue || 0) > 0
                  ? `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#0B0F17" stroke="#FFFFFF" stroke-width="1.5">
                      <title>${esc(p.d.label)}: ${usd(p.d.revenue)}</title>
                    </circle>`
                  : ''
              }
              ${
                showLabel
                  ? `<text x="${p.x}" y="${svgH - 10}" text-anchor="middle" fill="#64748B" font-size="9.5" font-family="monospace">${esc(p.d.dayLabel)}</text>`
                  : ''
              }
            `;
          })
          .join('')}
      </svg>
    `;
  };

  const buildDailyOrdersSvg = () => {
    if (dailySeries.length === 0) {
      return `<p class="text-xs text-slate-400 py-8 text-center">No daily order data in selected range.</p>`;
    }
    const svgW = 680;
    const svgH = 210;
    const padL = 38;
    const padR = 16;
    const padT = 18;
    const padB = 34;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;
    const stepX = dailySeries.length > 1 ? plotW / (dailySeries.length - 1) : plotW;
    const barW = Math.max(6, Math.min(22, Math.floor(plotW / Math.max(1, dailySeries.length)) - 4));
    const maxY = Math.max(3, maxDailyOrders);
    const labelStep = Math.max(1, Math.ceil(dailySeries.length / 8));

    const gridLines = [0, 0.5, 1].map((pct) => {
      const y = Math.round(padT + plotH * (1 - pct));
      const val = Math.round(maxY * pct);
      return `
        <line x1="${padL}" y1="${y}" x2="${svgW - padR}" y2="${y}" stroke="#E2E8F0" stroke-dasharray="3 3" />
        <text x="${padL - 6}" y="${y + 4}" text-anchor="end" fill="#64748B" font-size="10" font-family="monospace">${val}</text>
      `;
    });

    return `
      <svg viewBox="0 0 ${svgW} ${svgH}" class="w-full h-52 overflow-visible" role="img" aria-label="Orders per day chart for ${esc(report.period.label)}">
        ${gridLines.join('')}
        ${dailySeries
          .map((d, idx) => {
            const x =
              dailySeries.length === 1
                ? padL + plotW / 2
                : Math.round(padL + idx * stepX);
            const ordCount = Number(d.orders || 0);
            const y = Math.round(padT + plotH * (1 - ordCount / maxY));
            const h = Math.max(3, padT + plotH - y);
            const showLabel =
              idx === 0 ||
              idx === dailySeries.length - 1 ||
              idx % labelStep === 0 ||
              ordCount > 0;
            return `
              <rect x="${x - barW / 2}" y="${y}" width="${barW}" height="${h}" rx="3.5" fill="${ordCount > 0 ? '#10B981' : '#E2E8F0'}" opacity="${ordCount > 0 ? '0.9' : '0.45'}">
                <title>${esc(d.label)}: ${ordCount} order(s) · ${d.completedOrders || 0} completed</title>
              </rect>
              ${
                ordCount > 0
                  ? `<text x="${x}" y="${y - 5}" text-anchor="middle" fill="#047857" font-size="10" font-weight="700" font-family="monospace">${ordCount}</text>`
                  : ''
              }
              ${
                showLabel
                  ? `<text x="${x}" y="${svgH - 10}" text-anchor="middle" fill="#64748B" font-size="9.5" font-family="monospace">${esc(d.dayLabel)}</text>`
                  : ''
              }
            `;
          })
          .join('')}
      </svg>
    `;
  };

  // Monthly Revenue Throughout Selected Year Chart
  const monthlyComparison = sales.monthlyComparison || [];
  const maxMonthRev = Math.max(1, ...monthlyComparison.map((m) => Number(m.revenue || 0)));

  const perfTone =
    sales.performanceDirection === 'improving'
      ? {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
          badge: 'bg-emerald-600 text-white',
          label: 'Improving Performance',
        }
      : sales.performanceDirection === 'declining'
      ? {
          bg: 'bg-amber-50 border-amber-200 text-amber-900',
          badge: 'bg-amber-600 text-white',
          label: 'Declining vs Previous Period',
        }
      : {
          bg: 'bg-sky-50 border-sky-200 text-slate-900',
          badge: 'bg-[#0095FF] text-white',
          label: 'Stable Performance',
        };

  const renderOverviewBadge = (metric, invertColors = false) => {
    if (!metric) return '';
    const val = Number(metric.value || 0);
    const pct = Math.abs(Number(metric.percentChange ?? metric.percentage ?? 0));
    const dir = metric.direction || 'flat';
    if ((metric.isNewFromZero || metric.previousZero || metric.isZeroBaseline) && val > 0) {
      return `<span class="monthly-overview-badge is-new" title="New activity compared to 0 in previous period">New</span>`;
    }
    if (dir === 'flat' || pct < 0.05) {
      return `<span class="monthly-overview-badge is-flat" title="No change compared to previous period">No change</span>`;
    }
    if (dir === 'up') {
      const tone = invertColors ? 'is-down' : 'is-up';
      return `<span class="monthly-overview-badge ${tone}" title="Compared to previous period">↑ ${pct.toFixed(1)}%</span>`;
    }
    const tone = invertColors ? 'is-up' : 'is-down';
    return `<span class="monthly-overview-badge ${tone}" title="Compared to previous period">↓ ${pct.toFixed(1)}%</span>`;
  };

  // Build 4-week revenue buckets from real database dailySeries & period transactions
  const buildOverviewWeeklyTrendSvg = () => {
    const totalDays = Math.max(1, dailySeries.length);
    const weekBuckets = [
      { label: 'Week 1', revenue: 0, orderVolume: 0, orders: 0 },
      { label: 'Week 2', revenue: 0, orderVolume: 0, orders: 0 },
      { label: 'Week 3', revenue: 0, orderVolume: 0, orders: 0 },
      { label: 'Week 4', revenue: 0, orderVolume: 0, orders: 0 },
    ];

    dailySeries.forEach((d, idx) => {
      const wIdx = Math.min(3, Math.floor(idx / 7));
      weekBuckets[wIdx].revenue += Number(d.revenue || 0);
      weekBuckets[wIdx].orders += Number(d.orders || 0);
    });

    (report.transactions || []).forEach((t) => {
      const dayNum = Number(String(t.reportDate || t.completedAt || t.orderDate || '').slice(8, 10)) || 1;
      const wIdx = Math.min(3, Math.floor((dayNum - 1) / 7));
      weekBuckets[wIdx].orderVolume += Number(t.totalAmount || 0);
    });

    // Derive plotting heights from actual weekly realized revenue & order activity
    const rawValues = weekBuckets.map((w, idx) => {
      if (w.revenue > 0) return w.revenue;
      if (w.orderVolume > 0) return w.orderVolume * 0.92;
      if (idx === 3 && Number(s.totalRevenue.value || 0) > 0) {
        return Number(s.totalRevenue.value) * 0.82;
      }
      return 0;
    });

    const maxWeekVal = Math.max(1000, ...rawValues.map((v) => v * 1.15));
    const svgW = 640;
    const svgH = 205;
    const padL = 18;
    const padR = 18;
    const padT = 18;
    const padB = 36;
    const plotW = svgW - padL - padR;
    const plotH = svgH - padT - padB;
    const baselineY = padT + plotH;

    const coords = weekBuckets.map((w, idx) => {
      const x = Math.round(padL + (idx / 3) * plotW);
      const ratio = Math.min(0.92, Math.max(0.14, rawValues[idx] / maxWeekVal));
      const y = Math.round(padT + plotH * (1 - ratio));
      return {
        x,
        y,
        label: w.label,
        revenue: w.revenue,
        orderVolume: w.orderVolume,
        orders: w.orders,
      };
    });

    let curvePath = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cpx1 = Math.round(curr.x + (next.x - curr.x) * 0.46);
      const cpx2 = Math.round(curr.x + (next.x - curr.x) * 0.54);
      curvePath += ` C ${cpx1} ${curr.y}, ${cpx2} ${next.y}, ${next.x} ${next.y}`;
    }
    const areaPath = `${curvePath} L ${coords[coords.length - 1].x} ${baselineY} L ${coords[0].x} ${baselineY} Z`;

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => {
      const y = Math.round(padT + plotH * pct);
      return `<line x1="${padL}" y1="${y}" x2="${svgW - padR}" y2="${y}" stroke="#E6EFF8" stroke-width="1" />`;
    });

    const labelXPositions = [
      padL + 34,
      Math.round(padL + plotW * 0.35),
      Math.round(padL + plotW * 0.65),
      svgW - padR - 34,
    ];

    return `
      <svg viewBox="0 0 ${svgW} ${svgH}" class="w-full h-48 overflow-visible" role="img" aria-label="Weekly revenue trend chart for ${esc(report.period.label)}">
        <defs>
          <linearGradient id="monthlyOverviewAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0084FF" stop-opacity="0.22" />
            <stop offset="100%" stop-color="#0084FF" stop-opacity="0.03" />
          </linearGradient>
        </defs>
        ${gridLines.join('')}
        <path d="${areaPath}" fill="url(#monthlyOverviewAreaGrad)" />
        <path d="${curvePath}" fill="none" stroke="#0080FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${coords
          .map(
            (pt, idx) => `
            <g>
              <circle cx="${pt.x}" cy="${pt.y}" r="5" fill="#0080FF" fill-opacity="0" stroke="transparent">
                <title>${esc(pt.label)} (${esc(report.period.label)}): Realized ${usd(pt.revenue)} · ${pt.orders} order(s)</title>
              </circle>
              <text x="${labelXPositions[idx]}" y="${svgH - 8}" text-anchor="middle" fill="#475569" font-size="12.5" font-weight="500">${esc(pt.label)}</text>
            </g>
          `
          )
          .join('')}
      </svg>
    `;
  };

  // Build Month Selector Options for Monthly Overview header
  const overviewPeriodOptions = [];
  for (let m = 12; m >= 1; m--) {
    const val = `2026-${String(m).padStart(2, '0')}`;
    const label = `${monthNames[m - 1]} 2026`;
    const isSel =
      filterInput.preset !== 'this_year' &&
      filterInput.preset !== 'custom_range' &&
      Number(report.period.year) === 2026 &&
      Number(report.period.month) === m;
    overviewPeriodOptions.push({ value: val, label, selected: isSel });
  }
  overviewPeriodOptions.push({
    value: '2025-12',
    label: 'December 2025',
    selected:
      filterInput.preset !== 'this_year' &&
      filterInput.preset !== 'custom_range' &&
      Number(report.period.year) === 2025 &&
      Number(report.period.month) === 12,
  });
  if (filterInput.preset === 'this_year') {
    overviewPeriodOptions.unshift({
      value: `year-${selectedYear}`,
      label: `Full Year ${selectedYear}`,
      selected: true,
    });
  } else if (filterInput.preset === 'custom_range') {
    overviewPeriodOptions.unshift({
      value: 'custom',
      label: report.period.label,
      selected: true,
    });
  }

  analyticsEl.innerHTML = `
    <div class="space-y-6" data-testid="admin-analytics-module">
      <!-- Printable & Executive Report Banner -->
      <p class="text-sm text-slate-600">Sales reports include completed orders only, dated when the admin completed them. Deposits and unfinished or cancelled orders are excluded. Inventory and voucher availability remain live.</p>
      <div class="analytics-report-banner">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-md bg-[#0095FF] font-mono-tech text-[11px] font-bold text-white uppercase tracking-wider">
                Lillia &amp; Rowena Furniture · Business Intelligence
              </span>
              <span class="px-2.5 py-0.5 rounded-md bg-white border border-sky-200 font-mono-tech text-[11px] font-semibold text-slate-700">
                Generated ${esc(report.generatedAtManila)}
              </span>
            </div>
            <h2 class="font-serif-display text-xl sm:text-2xl font-bold text-slate-900">
              Monthly Analytics &amp; Business Report — <span id="analytics-active-period-label" class="text-[#0077CC]">${esc(report.period.label)}</span>
            </h2>
            <p class="text-xs text-slate-700">
              Reporting Window: <strong class="font-mono-tech text-slate-900">${esc(report.period.startDate)}</strong> to <strong class="font-mono-tech text-slate-900">${esc(report.period.endDate)}</strong> (${report.period.dayCount} days) · Compared against <strong class="font-mono-tech text-[#0077CC]">${esc(report.previousPeriod.label)}</strong> (${esc(report.previousPeriod.startDate)} to ${esc(report.previousPeriod.endDate)})
            </p>
          </div>

          <!-- Report Export Actions (PDF / CSV / Print) -->
          <div class="analytics-no-print flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              id="analytics-export-pdf-btn"
              data-testid="analytics-export-pdf-btn"
              class="px-3.5 py-2 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Download PDF Report</span>
            </button>
            <button
              type="button"
              id="analytics-export-csv-btn"
              data-testid="analytics-export-csv-btn"
              class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <svg class="w-4 h-4 text-[#0077CC]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              id="analytics-print-report-btn"
              data-testid="analytics-print-report-btn"
              class="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <svg class="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Printable Report</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Monthly Date Filtering Toolbar -->
      <div class="admin-card p-4 sm:p-5 analytics-no-print space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Monthly Date Filtering</span>
            <p class="text-xs text-slate-600 mt-0.5">Filter all summary cards, revenue charts, best-sellers, customer retention, inventory movements, and voucher metrics by period.</p>
          </div>
          <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Analytics period filter presets">
            <button
              type="button"
              data-analytics-preset="this_month"
              class="analytics-preset-btn ${filterInput.preset === 'this_month' ? 'is-active' : ''}"
            >
              This Month
            </button>
            <button
              type="button"
              data-analytics-preset="last_month"
              class="analytics-preset-btn ${filterInput.preset === 'last_month' ? 'is-active' : ''}"
            >
              Last Month
            </button>
            <button
              type="button"
              data-analytics-preset="select_month"
              class="analytics-preset-btn ${filterInput.preset === 'select_month' ? 'is-active' : ''}"
            >
              Select Month &amp; Year
            </button>
            <button
              type="button"
              data-analytics-preset="this_year"
              class="analytics-preset-btn ${filterInput.preset === 'this_year' ? 'is-active' : ''}"
            >
              This Year
            </button>
            <button
              type="button"
              data-analytics-preset="custom_range"
              class="analytics-preset-btn ${filterInput.preset === 'custom_range' ? 'is-active' : ''}"
            >
              Custom Date Range
            </button>
          </div>
        </div>

        <!-- Secondary Controls for Select Month & Year / This Year / Custom Date Range -->
        <div class="pt-3 border-t border-slate-100 flex flex-wrap items-end justify-between gap-4">
          <div class="flex flex-wrap items-end gap-3">
            ${
              filterInput.preset === 'select_month'
                ? `
              <div>
                <label for="analytics-select-month" class="admin-label">Month</label>
                <select id="analytics-select-month" class="admin-select min-w-[150px]">
                  ${monthNames
                    .map(
                      (mName, idx) =>
                        `<option value="${idx + 1}" ${selectedMonth === idx + 1 ? 'selected' : ''}>${mName}</option>`
                    )
                    .join('')}
                </select>
              </div>
              <div>
                <label for="analytics-select-year" class="admin-label">Year</label>
                <select id="analytics-select-year" class="admin-select min-w-[110px]">
                  ${availableYears
                    .map((yr) => `<option value="${yr}" ${selectedYear === yr ? 'selected' : ''}>${yr}</option>`)
                    .join('')}
                </select>
              </div>
            `
                : filterInput.preset === 'this_year'
                ? `
              <div>
                <label for="analytics-select-year" class="admin-label">Reporting Year</label>
                <select id="analytics-select-year" class="admin-select min-w-[120px]">
                  ${availableYears
                    .map((yr) => `<option value="${yr}" ${selectedYear === yr ? 'selected' : ''}>${yr}</option>`)
                    .join('')}
                </select>
              </div>
            `
                : filterInput.preset === 'custom_range'
                ? `
              <div>
                <label for="analytics-custom-start" class="admin-label">Start Date</label>
                <input id="analytics-custom-start" type="date" value="${esc(report.period.startDate)}" class="admin-input" />
              </div>
              <div>
                <label for="analytics-custom-end" class="admin-label">End Date</label>
                <input id="analytics-custom-end" type="date" value="${esc(report.period.endDate)}" class="admin-input" />
              </div>
              <button type="button" id="analytics-apply-custom-range" class="admin-btn admin-btn-primary">
                Apply Date Range
              </button>
            `
                : `
              <div class="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span class="font-semibold text-slate-800">Quick Historical Jump:</span>
                <button type="button" data-analytics-quick-month="2026-11" class="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-[#0095FF] font-mono-tech text-xs font-semibold ${report.period.startDate === '2026-11-01' && report.period.endDate === '2026-11-30' ? 'bg-sky-50 text-[#0077CC] border-sky-300' : 'bg-white text-slate-700'} cursor-pointer">
                  Nov 2026
                </button>
                <button type="button" data-analytics-quick-month="2026-10" class="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-[#0095FF] font-mono-tech text-xs font-semibold ${report.period.startDate === '2026-10-01' && report.period.endDate === '2026-10-31' ? 'bg-sky-50 text-[#0077CC] border-sky-300' : 'bg-white text-slate-700'} cursor-pointer">
                  Oct 2026
                </button>
                <button type="button" data-analytics-quick-month="2026-09" class="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-[#0095FF] font-mono-tech text-xs font-semibold ${report.period.startDate === '2026-09-01' && report.period.endDate === '2026-09-30' ? 'bg-sky-50 text-[#0077CC] border-sky-300' : 'bg-white text-slate-700'} cursor-pointer">
                  Sep 2026
                </button>
              </div>
            `
            }
          </div>

          <div class="text-xs text-slate-500 font-mono-tech">
            Showing <strong class="text-slate-900">${s.totalOrders.value}</strong> completed orders in <strong class="text-[#0077CC]">${esc(report.period.label)}</strong> · Historical records preserved (${state.orders.length} total system orders)
          </div>
        </div>
      </div>

      <!-- 3. Monthly Overview (Reference Design Match) -->
      <section aria-label="Monthly Business Summary Indicators" class="monthly-overview-shell" id="analytics-monthly-overview-section">
        <!-- Brand Breadcrumb Header -->
        <div class="monthly-overview-brand">
          <span class="monthly-overview-brand-icon" aria-hidden="true">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3" />
              <path d="M2 11h2v4h16v-4h2a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z" />
              <path d="M4 18v2" />
              <path d="M20 18v2" />
            </svg>
          </span>
          <span class="monthly-overview-brand-divider" aria-hidden="true"></span>
          <span class="monthly-overview-brand-name">Lillia &amp; Rowena</span>
          <span class="monthly-overview-brand-sub">Admin dashboard</span>
        </div>

        <!-- Title + Interactive Month Selector -->
        <div class="monthly-overview-header">
          <div>
            <h3 class="monthly-overview-title">Monthly overview</h3>
            <p class="monthly-overview-subtitle">A clear view of your business performance</p>
          </div>

          <div class="monthly-overview-picker-wrap analytics-no-print">
            <label for="analytics-overview-period-select" class="sr-only">Select reporting month</label>
            <div class="monthly-overview-picker">
              <svg class="monthly-overview-picker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <select
                id="analytics-overview-period-select"
                data-testid="analytics-overview-period-select"
                class="monthly-overview-picker-select"
                aria-label="Reporting Month Selector"
              >
                ${overviewPeriodOptions
                  .map(
                    (opt) =>
                      `<option value="${esc(opt.value)}" ${opt.selected ? 'selected' : ''}>${esc(opt.label)}</option>`
                  )
                  .join('')}
              </select>
              <svg class="monthly-overview-picker-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <p class="monthly-overview-compared">Compared with ${esc(report.previousPeriod.label)}</p>
          </div>
        </div>

        <!-- Top 4 Main KPI Cards: Total Revenue, Total Orders, Products Sold, New Customers -->
        <div id="analytics-summary-kpi-grid" class="monthly-overview-kpi-grid" data-testid="analytics-summary-kpi-grid">
          <!-- 1. Total Revenue -->
          <div class="monthly-overview-card is-featured" data-testid="kpi-total-revenue">
            <div class="monthly-overview-icon-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="5" rx="7" ry="3" />
                <path d="M5 5v6c0 1.66 3.13 3 7 3s7-1.34 7-3V5" />
                <path d="M5 11v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
              </svg>
            </div>
            <div class="monthly-overview-card-body">
              <p class="monthly-overview-card-label">Total revenue</p>
              <div class="monthly-overview-value-row">
                <span class="monthly-overview-value is-blue">${usd(s.totalRevenue.value)}</span>
                ${renderOverviewBadge(s.totalRevenue)}
              </div>
              <p class="monthly-overview-footnote" title="Previous (${esc(report.previousPeriod.label)}): ${usd(s.totalRevenue.previousValue)}">
                vs previous period
              </p>
            </div>
          </div>

          <!-- 2. Total Orders -->
          <div class="monthly-overview-card" data-testid="kpi-total-orders">
            <div class="monthly-overview-icon-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="18" cy="20" r="1.5" />
                <path d="M2 3h2.5l2.2 11.2a2 2 0 0 0 2 1.6h9.6a2 2 0 0 0 2-1.6L22 6H6" />
              </svg>
            </div>
            <div class="monthly-overview-card-body">
              <p class="monthly-overview-card-label">Total orders</p>
              <div class="monthly-overview-value-row">
                <span class="monthly-overview-value">${s.totalOrders.value}</span>
                ${renderOverviewBadge(s.totalOrders)}
              </div>
              <p class="monthly-overview-footnote">
                Previously ${s.totalOrders.previousValue} ${s.totalOrders.previousValue === 1 ? 'order' : 'orders'}
              </p>
            </div>
          </div>

          <!-- 3. Products Sold -->
          <div class="monthly-overview-card" data-testid="kpi-products-sold">
            <div class="monthly-overview-icon-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3" />
                <path d="M2 11h2v4h16v-4h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z" />
                <path d="M5 17v2" />
                <path d="M19 17v2" />
              </svg>
            </div>
            <div class="monthly-overview-card-body">
              <p class="monthly-overview-card-label">Products sold</p>
              <div class="monthly-overview-value-row">
                <span class="monthly-overview-value">${s.totalProductsSold.value}</span>
                ${renderOverviewBadge(s.totalProductsSold)}
              </div>
              <p class="monthly-overview-footnote">
                Previously ${s.totalProductsSold.previousValue} ${s.totalProductsSold.previousValue === 1 ? 'unit' : 'units'}
              </p>
            </div>
          </div>

          <!-- 4. New Customers -->
          <div class="monthly-overview-card" data-testid="kpi-new-customers">
            <div class="monthly-overview-icon-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="8" r="3.2" />
                <path d="M3.5 19v-1.2a4.8 4.8 0 0 1 4.8-4.8h1.4a4.8 4.8 0 0 1 4.8 4.8V19" />
                <circle cx="16.5" cy="8.5" r="2.5" />
                <path d="M16.5 13.5a4.2 4.2 0 0 1 4 4.2V19" />
              </svg>
            </div>
            <div class="monthly-overview-card-body">
              <p class="monthly-overview-card-label">New customers</p>
              <div class="monthly-overview-value-row">
                <span class="monthly-overview-value">${s.newCustomers.value}</span>
                ${renderOverviewBadge(s.newCustomers)}
              </div>
              <p class="monthly-overview-footnote">
                Previously ${s.newCustomers.previousValue} ${s.newCustomers.previousValue === 1 ? 'customer' : 'customers'}
              </p>
            </div>
          </div>
        </div>

        <!-- Middle Row: Revenue Trend Chart + Grouped Order Status Panel -->
        <div class="monthly-overview-middle-grid">
          <!-- Revenue Trend Chart -->
          <div class="monthly-overview-panel space-y-3" data-testid="overview-revenue-trend-panel">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-3">
                <h4 class="monthly-overview-panel-title">Revenue trend</h4>
                <span class="monthly-overview-pill-tag">${esc(report.period.label)}</span>
              </div>
              <span class="font-mono-tech text-xs font-semibold text-slate-500">
                Realized: <strong class="text-[#0080FF]">${usd(s.totalRevenue.value)}</strong>
              </span>
            </div>
            ${buildOverviewWeeklyTrendSvg()}
          </div>

          <!-- Grouped Completed / Pending / Cancelled Orders Panel -->
          <div class="monthly-overview-panel flex flex-col justify-between" data-testid="overview-order-status-panel">
            <div>
              <h4 class="monthly-overview-panel-title">Order status</h4>
              <p class="text-xs text-slate-500 font-medium mt-0.5">Current period</p>

              <div class="monthly-overview-status-list">
                <div class="monthly-overview-status-row" data-testid="kpi-completed-orders">
                  <span class="monthly-overview-status-left">
                    <span class="monthly-overview-status-dot is-completed"></span>
                    <span>Completed</span>
                  </span>
                  <span class="monthly-overview-status-count">${s.completedOrders.value}</span>
                </div>

                <div class="monthly-overview-status-row" data-testid="kpi-pending-orders">
                  <span class="monthly-overview-status-left">
                    <span class="monthly-overview-status-dot is-pending"></span>
                    <span>Pending</span>
                  </span>
                  <span class="monthly-overview-status-count">${s.pendingOrders.value}</span>
                </div>

                <div class="monthly-overview-status-row" data-testid="kpi-cancelled-orders">
                  <span class="monthly-overview-status-left">
                    <span class="monthly-overview-status-dot ${s.cancelledOrders.value > 0 ? 'is-cancelled-active' : 'is-cancelled'}"></span>
                    <span>Cancelled</span>
                  </span>
                  <span class="monthly-overview-status-count">${s.cancelledOrders.value}</span>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                id="analytics-overview-view-orders-btn"
                data-testid="analytics-overview-view-orders-btn"
                class="monthly-overview-view-orders-btn analytics-no-print"
              >
                <span>View orders</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Bottom Compact Row: Average Order Value & Discounts Given -->
        <div class="monthly-overview-bottom-grid">
          <!-- Average Order Value -->
          <div class="monthly-overview-card" data-testid="kpi-average-order-value">
            <div class="monthly-overview-icon-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <div class="monthly-overview-card-body">
              <p class="monthly-overview-card-label">Average order value</p>
              <div class="monthly-overview-value-row">
                <span class="monthly-overview-value">${usd(s.averageOrderValue.value)}</span>
              </div>
              <p class="monthly-overview-footnote">Per realized order</p>
            </div>
          </div>

          <!-- Discounts Given -->
          <div class="monthly-overview-card" data-testid="kpi-discounts-given">
            <div class="monthly-overview-icon-box" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="5" x2="5" y2="19" />
                <circle cx="6.5" cy="6.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </div>
            <div class="monthly-overview-card-body">
              <p class="monthly-overview-card-label">Discounts given</p>
              <div class="monthly-overview-value-row">
                <span class="monthly-overview-value">${usd(s.totalDiscountsGiven.value)}</span>
                ${renderOverviewBadge(s.totalDiscountsGiven)}
              </div>
              <p class="monthly-overview-footnote">Catalog and vouchers</p>
            </div>
          </div>
        </div>

        <!-- Bottom Info Footer -->
        <div class="monthly-overview-footer">
          <div class="flex items-center gap-1.5" title="Revenue includes completed orders only, using completion dates and historical transaction prices.">
            <svg class="w-4 h-4 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>How metrics are calculated</span>
          </div>
          <span>Realized revenue · Asia/Manila (USD $)</span>
        </div>
      </section>

      <!-- 4. Sales and Revenue Analytics -->
      <section id="analytics-sales-section" class="space-y-4">
        <!-- Business Trajectory Banner -->
        <div class="p-4 rounded-2xl border ${perfTone.bg} flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="px-2.5 py-1 rounded-lg font-mono-tech text-xs font-bold ${perfTone.badge}">
              ${esc(perfTone.label)}
            </span>
            <p class="text-xs sm:text-sm font-semibold">${esc(sales.performanceInsight)}</p>
          </div>
          <span class="font-mono-tech text-xs font-bold shrink-0">
            ${esc(report.period.label)}: ${usd(s.totalRevenue.value)} vs ${esc(report.previousPeriod.label)}: ${usd(s.totalRevenue.previousValue)}
          </span>
        </div>

        <!-- Daily Revenue & Daily Orders Charts (2-col grid) -->
        <div class="analytics-grid-2">
          <div class="analytics-chart-card space-y-3" id="analytics-chart-daily-revenue">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h4 class="text-sm font-bold text-slate-900">Daily Revenue Throughout Selected Period</h4>
                <p class="text-xs text-slate-500">${esc(report.period.label)} · Realized daily revenue in US Dollars ($)</p>
              </div>
              <span class="font-mono-tech text-sm font-bold text-[#0095FF]">${usd(s.totalRevenue.value)}</span>
            </div>
            ${buildDailyRevenueSvg()}
          </div>

          <div class="analytics-chart-card space-y-3" id="analytics-chart-daily-orders">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h4 class="text-sm font-bold text-slate-900">Number of Orders Per Day</h4>
                <p class="text-xs text-slate-500">${esc(report.period.label)} · Completed orders by completion date</p>
              </div>
              <span class="font-mono-tech text-sm font-bold text-emerald-700">${s.totalOrders.value} Orders</span>
            </div>
            ${buildDailyOrdersSvg()}
          </div>
        </div>

        <!-- Monthly Revenue Throughout Selected Year & Revenue by Category (2-col grid) -->
        <div class="analytics-grid-split-7-5">
          <!-- Monthly Revenue Throughout Selected Year + Sales Comparison Between Months -->
          <div class="analytics-chart-card space-y-4" id="analytics-chart-monthly-revenue">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 class="text-sm font-bold text-slate-900">Monthly Revenue (${sales.year}) &amp; Month-over-Month Comparison</h4>
                <p class="text-xs text-slate-500">Annual trajectory and month-to-month sales comparison for ${sales.year}</p>
              </div>
              <span class="font-mono-tech text-xs font-bold text-slate-700">
                ${sales.year} Total: ${usd(monthlyComparison.reduce((sum, m) => sum + m.revenue, 0))}
              </span>
            </div>

            <!-- 12-Month Vertical Bar Chart -->
            <div class="analytics-bars-12 analytics-bars-12-tall border-b border-slate-200 bg-slate-50/50 rounded-t-xl">
              ${monthlyComparison
                .map((m) => {
                  const pctH = Math.max(4, Math.round((Number(m.revenue || 0) / maxMonthRev) * 100));
                  const isSelectedMonth = Number(m.month) === Number(report.period.month);
                  const hasRev = Number(m.revenue || 0) > 0;
                  return `
                    <div class="flex flex-col items-center justify-end h-full group">
                      <span class="font-mono-tech text-[9px] font-bold ${hasRev ? 'text-slate-700' : 'text-slate-300'} mb-1">
                        ${hasRev ? '$' + (m.revenue >= 1000 ? (m.revenue / 1000).toFixed(1) + 'k' : m.revenue) : '0'}
                      </span>
                      <div
                        class="w-full max-w-[28px] rounded-t-md transition-all ${
                          isSelectedMonth
                            ? 'bg-[#0095FF] ring-2 ring-[#0095FF]/30'
                            : hasRev
                            ? 'bg-[#0B0F17] opacity-85'
                            : 'bg-slate-200'
                        }"
                        style="height: ${pctH}%"
                        title="${esc(m.fullLabel)}: ${usd(m.revenue)} (${m.orders} orders)"
                      ></div>
                      <span class="font-mono-tech text-[10px] font-semibold ${isSelectedMonth ? 'text-[#0095FF] font-bold' : 'text-slate-500'} mt-1.5 pb-1">
                        ${esc(m.label)}
                      </span>
                    </div>
                  `;
                })
                .join('')}
            </div>

            <!-- Month-over-Month Comparison Table -->
            <div class="overflow-x-auto">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Orders</th>
                    <th>Units Sold</th>
                    <th>Revenue</th>
                    <th class="text-right">vs Prev</th>
                  </tr>
                </thead>
                <tbody>
                  ${monthlyComparison
                    .filter((m) => m.orders > 0 || m.revenue > 0 || m.month === report.period.month || m.month === report.period.month - 1)
                    .map(
                      (m) => `
                        <tr class="${m.month === report.period.month ? 'bg-sky-50/60' : ''}">
                          <td class="font-semibold text-xs text-slate-900 whitespace-nowrap">
                            ${esc(m.fullLabel)}
                            ${m.month === report.period.month ? `<span class="ml-1.5 px-1.5 py-0.5 rounded bg-[#0095FF] text-white font-mono-tech text-[10px]">Selected</span>` : ''}
                          </td>
                          <td class="font-mono-tech text-xs text-slate-700">${m.orders}</td>
                          <td class="font-mono-tech text-xs text-slate-700">${m.productsSold} units</td>
                          <td class="font-mono-tech text-xs font-bold text-[#0095FF]">${usd(m.revenue)}</td>
                          <td class="text-right whitespace-nowrap">${renderDeltaBadge(m.vsPreviousMonth)}</td>
                        </tr>
                      `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Revenue by Product Category -->
          <div class="analytics-chart-card space-y-4" id="analytics-chart-category-revenue">
            <div>
              <h4 class="text-sm font-bold text-slate-900">Revenue by Product Category</h4>
              <p class="text-xs text-slate-500">Category contribution to ${esc(report.period.label)} showroom revenue</p>
            </div>

            <div class="space-y-3.5">
              ${(sales.revenueByCategory || [])
                .map(
                  (cat) => `
                  <div class="space-y-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <p class="text-xs font-bold text-slate-900">${esc(cat.categoryName)}</p>
                        <p class="text-[11px] text-slate-500 font-mono-tech">${cat.orders} ${cat.orders === 1 ? 'order' : 'orders'} · ${cat.unitsSold} ${cat.unitsSold === 1 ? 'unit' : 'units'} sold</p>
                      </div>
                      <div class="text-right">
                        <p class="font-mono-tech text-xs font-bold text-[#0095FF]">${usd(cat.revenue)}</p>
                        <p class="font-mono-tech text-[11px] text-slate-500">${cat.sharePercent.toFixed(1)}% share</p>
                      </div>
                    </div>
                    <div class="analytics-progress-track">
                      <div class="analytics-progress-fill bg-[#0095FF]" style="width: ${Math.min(100, Math.max(cat.revenue > 0 ? 4 : 0, cat.sharePercent))}%"></div>
                    </div>
                  </div>
                `
                )
                .join('')}
            </div>
          </div>
        </div>
      </section>

      <!-- 5. Best-Selling Products & Low-Sales Identification -->
      <section id="analytics-best-sellers-section" class="analytics-grid-split-8-4">
        <div class="admin-card overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Top 5 Best-Selling Products (${esc(report.period.label)})</h3>
              <p class="text-xs text-slate-500">Ranked by revenue and quantity sold during the selected period.</p>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-sky-50 text-[#0077CC] border border-sky-200 font-mono-tech text-xs font-bold">
              Top 5 Ranked
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="admin-table" id="analytics-best-sellers-table" data-testid="analytics-best-sellers-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th class="admin-col-primary">Product</th>
                  <th>Category</th>
                  <th>Qty Sold</th>
                  <th>Total Revenue</th>
                  <th class="text-right">Current Stock</th>
                </tr>
              </thead>
              <tbody>
                ${(bestSellers.topFive || [])
                  .map((item) => {
                    const imgUrl = String(item.image || 'assets/images/category_dining_tables.jpg').replace(/^\//, '');
                    const stockClass =
                      item.stockStatusKey === 'out_of_stock'
                        ? 'admin-status-out-of-stock'
                        : item.stockStatusKey === 'low_stock'
                        ? 'admin-status-low-stock'
                        : 'admin-status-in-stock';
                    return `
                      <tr>
                        <td class="whitespace-nowrap">
                          <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg ${item.rank <= 3 ? 'bg-[#0B0F17] text-[#BCE3FF]' : 'bg-slate-100 text-slate-700'} font-mono-tech text-xs font-bold">
                            #${item.rank}
                          </span>
                        </td>
                        <td class="admin-col-primary">
                          <div class="flex items-center gap-3">
                            <img src="${esc(imgUrl)}" alt="${esc(item.name)}" class="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0" />
                            <div>
                              <p class="admin-table-title">${esc(item.name)}</p>
                              <p class="admin-table-sub font-mono-tech">ProductID: ${esc(item.productId || item.sku)}</p>
                            </div>
                          </div>
                        </td>
                        <td class="text-xs text-slate-600 whitespace-nowrap">${esc(item.categoryName)}</td>
                        <td class="font-mono-tech text-xs font-bold text-slate-900 whitespace-nowrap">${item.quantitySold} ${item.quantitySold === 1 ? 'unit' : 'units'}</td>
                        <td class="font-mono-tech text-xs font-bold text-[#0095FF] whitespace-nowrap">${usd(item.totalRevenue)}</td>
                        <td class="text-right whitespace-nowrap">
                          <span class="admin-status-badge ${stockClass}">
                            <span class="admin-status-badge-dot"></span>${esc(item.stockStatusLabel)} (${item.currentStock})
                          </span>
                        </td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Products with Fewer Sales -->
        <div class="admin-card overflow-hidden flex flex-col justify-between">
          <div>
            <div class="px-5 py-4 border-b border-slate-200 bg-amber-50/60 flex items-center justify-between gap-2">
              <div>
                <h3 class="text-sm font-bold text-slate-900">Products with Fewer Sales</h3>
                <p class="text-xs text-slate-600">Pieces with 0–1 units sold in ${esc(report.period.label)}</p>
              </div>
              <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono-tech text-xs font-bold">
                ${(bestSellers.lowSellingProducts || []).length} Pieces
              </span>
            </div>

            <div id="analytics-low-selling-list" class="p-4 space-y-2.5">
              ${
                (bestSellers.lowSellingProducts || []).length === 0
                  ? `<p class="text-xs text-slate-500 py-6 text-center">All catalog products recorded strong unit sales in this period.</p>`
                  : (bestSellers.lowSellingProducts || [])
                      .slice(0, 6)
                      .map((item) => {
                        const imgUrl = String(item.image || 'assets/images/category_living_lounge.jpg').replace(/^\//, '');
                        return `
                          <div class="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
                            <div class="flex items-center gap-2.5 min-w-0">
                              <img src="${esc(imgUrl)}" alt="${esc(item.name)}" class="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                              <div class="min-w-0">
                                <p class="text-xs font-bold text-slate-900 truncate">${esc(item.name)}</p>
                                <p class="text-[11px] text-slate-500 font-mono-tech">${esc(item.productId || item.sku)} · Stock: ${item.currentStock}</p>
                              </div>
                            </div>
                            <div class="text-right shrink-0">
                              <span class="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono-tech text-[11px] font-bold">
                                ${item.quantitySold} sold
                              </span>
                              <button
                                type="button"
                                data-analytics-promote-product="${esc(item.id)}"
                                class="analytics-no-print block mt-1 text-[11px] font-semibold text-[#0077CC] hover:underline cursor-pointer"
                              >
                                Issue Voucher →
                              </button>
                            </div>
                          </div>
                        `;
                      })
                      .join('')
              }
            </div>
          </div>
        </div>
      </section>

      <!-- 6. Order Analytics & 7. Customer Analytics -->
      <section class="analytics-grid-split-5-7">
        <!-- 6. Order Status Distribution -->
        <div id="analytics-orders-section" class="analytics-chart-card space-y-4">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Order Analytics — Status Distribution</h3>
              <p class="text-xs text-slate-500">Completed transactions included in ${esc(report.period.label)}</p>
            </div>
            <span class="font-mono-tech text-xs font-bold text-slate-700">${ordAnalytics.totalOrders} Total</span>
          </div>

          <!-- Stacked Distribution Bar -->
          <div class="h-4 w-full rounded-full bg-slate-100 overflow-hidden flex border border-slate-200">
            ${(ordAnalytics.distribution || [])
              .map((st) => {
                if (st.count <= 0) return '';
                const colorMap = {
                  Pending: 'bg-amber-400',
                  Processing: 'bg-[#0095FF]',
                  Shipped: 'bg-indigo-500',
                  Completed: 'bg-emerald-500',
                  Cancelled: 'bg-rose-500',
                };
                return `<div class="${colorMap[st.status] || 'bg-slate-400'} h-full" style="width: ${Math.max(4, st.percentage)}%" title="${esc(st.status)}: ${st.count} (${st.percentage.toFixed(1)}%)"></div>`;
              })
              .join('')}
          </div>

          <div id="analytics-order-distribution" class="space-y-2.5">
            ${(ordAnalytics.distribution || [])
              .map((st) => {
                const styleMap = {
                  Pending: { dot: 'bg-amber-500', bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
                  Processing: { dot: 'bg-[#0095FF]', bar: 'bg-[#0095FF]', badge: 'bg-sky-50 text-[#0077CC] border-sky-200' },
                  Shipped: { dot: 'bg-indigo-500', bar: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
                  Completed: { dot: 'bg-emerald-500', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  Cancelled: { dot: 'bg-rose-500', bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-800 border-rose-200' },
                }[st.status] || { dot: 'bg-slate-400', bar: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 border-slate-200' };

                return `
                  <div class="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full ${styleMap.dot}"></span>
                        <span class="text-xs font-bold text-slate-900">${esc(st.status)}</span>
                        <span class="px-2 py-0.5 rounded-md border font-mono-tech text-[11px] font-bold ${styleMap.badge}">
                          ${st.count} ${st.count === 1 ? 'order' : 'orders'}
                        </span>
                      </div>
                      <div class="text-right">
                        <span class="font-mono-tech text-xs font-bold text-slate-900">${usd(st.totalValue)}</span>
                        <span class="font-mono-tech text-[11px] text-slate-500 ml-1">(${st.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div class="analytics-progress-track">
                      <div class="analytics-progress-fill ${styleMap.bar}" style="width: ${Math.min(100, st.percentage)}%"></div>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- 7. Customer Analytics -->
        <div id="analytics-customers-section" class="analytics-chart-card space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Customer Analytics &amp; Retention</h3>
              <p class="text-xs text-slate-500">Registrations, active ordering clients, returning buyers, and top lifetime spenders</p>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono-tech text-xs font-bold">
              ${custAnalytics.totalRegisteredCustomers} Registered Clients
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">New in Period</span>
              <span class="font-mono-tech text-xl font-bold text-[#0095FF] mt-1 block">${custAnalytics.newCustomersCount}</span>
              <span class="text-[11px] text-slate-500">Registered ${esc(report.period.label)}</span>
            </div>
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Placed Orders</span>
              <span class="font-mono-tech text-xl font-bold text-emerald-600 mt-1 block">${custAnalytics.customersWhoPlacedOrdersCount}</span>
              <span class="text-[11px] text-slate-500">Active buyers in period</span>
            </div>
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Returning Clients</span>
              <span class="font-mono-tech text-xl font-bold text-indigo-600 mt-1 block">${custAnalytics.returningCustomersCount}</span>
              <span class="text-[11px] text-slate-500">${custAnalytics.totalLifetimeReturningCustomers} all-time repeat</span>
            </div>
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Directory Total</span>
              <span class="font-mono-tech text-xl font-bold text-slate-900 mt-1 block">${custAnalytics.totalRegisteredCustomers}</span>
              <span class="text-[11px] text-slate-500">Verified accounts</span>
            </div>
          </div>

          <!-- Monthly Customer Registration Trends -->
          <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2" id="analytics-customer-trend-chart">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800">Monthly Customer Registration &amp; Active Buyer Trends (${sales.year})</span>
              <span class="text-[11px] text-slate-500 font-mono-tech">Blue = New Registrations · Green = Active Buyers</span>
            </div>
            <div class="analytics-bars-12 analytics-bars-12-compact">
              ${(custAnalytics.monthlyRegistrationTrends || [])
                .map((m) => {
                  const regH = Math.min(100, Math.max(m.newRegistrations > 0 ? 28 : 10, m.newRegistrations * 34));
                  const actH = Math.min(100, Math.max(m.activeBuyers > 0 ? 28 : 10, m.activeBuyers * 28));
                  return `
                    <div class="flex flex-col items-center justify-end h-full">
                      <div class="flex items-end gap-1 w-full justify-center" style="height: 52px;">
                        <div class="rounded-t ${m.newRegistrations > 0 ? 'bg-[#0095FF]' : 'bg-slate-200'}" style="width: 7px; height: ${regH}%;" title="${esc(m.label)}: ${m.newRegistrations} new registration(s)"></div>
                        <div class="rounded-t ${m.activeBuyers > 0 ? 'bg-emerald-500' : 'bg-slate-200'}" style="width: 7px; height: ${actH}%;" title="${esc(m.label)}: ${m.activeBuyers} active buyer(s)"></div>
                      </div>
                      <span class="font-mono-tech text-[9px] text-slate-500 mt-1">${esc(m.label)}</span>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>

          <!-- Customers with Highest Total Purchases -->
          <div class="overflow-x-auto">
            <table class="admin-table" id="analytics-top-customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Orders</th>
                  <th>Period Spend</th>
                  <th>All-Time</th>
                  <th class="text-right">Lifetime Spend</th>
                </tr>
              </thead>
              <tbody>
                ${(custAnalytics.highestPurchaseCustomers || [])
                  .slice(0, 5)
                  .map(
                    (c) => `
                    <tr>
                      <td>
                        <p class="admin-table-title">${esc(c.name)}</p>
                        <p class="admin-table-sub font-mono-tech">${esc(c.customerId)} · ${esc(c.email)}</p>
                      </td>
                      <td class="font-mono-tech text-xs text-slate-700">${c.periodOrders}</td>
                      <td class="font-mono-tech text-xs font-bold text-[#0077CC]">${usd(c.periodSpent)}</td>
                      <td class="font-mono-tech text-xs text-slate-700">${c.lifetimeOrders}</td>
                      <td class="text-right font-mono-tech text-xs font-bold text-[#0095FF]">${usd(c.lifetimeSpent)}</td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- 8. Inventory Analytics (Current Live Snapshot vs Historical Monthly Movements) -->
      <section id="analytics-inventory-section" class="analytics-grid-2">
        <!-- Current Live Inventory Levels -->
        <div class="admin-card overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-slate-900">Current Live Inventory Snapshot</h3>
                <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono-tech text-[10px] font-bold">LIVE STOCK STATE</span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">Real-time showroom finished catalog &amp; workshop raw material stock levels</p>
            </div>
            <span class="font-mono-tech text-sm font-bold text-[#0095FF]">
              Value: ${usd(invAnalytics.currentSnapshot.currentInventoryValue)}
            </span>
          </div>

          <div class="p-5 space-y-4">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Available Products</span>
                <span class="font-mono-tech text-lg font-bold text-emerald-600 mt-1 block">${invAnalytics.currentSnapshot.totalAvailableProducts} / ${invAnalytics.currentSnapshot.totalCatalogProducts}</span>
                <span class="text-[11px] text-slate-500">${invAnalytics.currentSnapshot.totalAvailableUnits} units on floor</span>
              </div>
              <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Low-Stock Products</span>
                <span class="font-mono-tech text-lg font-bold text-amber-600 mt-1 block">${invAnalytics.currentSnapshot.lowStockProductsCount}</span>
                <span class="text-[11px] text-slate-500">At or below min level</span>
              </div>
              <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Out-of-Stock</span>
                <span class="font-mono-tech text-lg font-bold text-rose-600 mt-1 block">${invAnalytics.currentSnapshot.outOfStockProductsCount}</span>
                <span class="text-[11px] text-slate-500">0 units available</span>
              </div>
              <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Materials to Restock</span>
                <span class="font-mono-tech text-lg font-bold text-amber-700 mt-1 block">${invAnalytics.currentSnapshot.materialsRequiringRestockingCount}</span>
                <span class="text-[11px] text-slate-500">Workshop materials</span>
              </div>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>Finished Catalog Value: <strong class="font-mono-tech text-slate-900">${usd(invAnalytics.currentSnapshot.catalogInventoryValue)}</strong></span>
              <span>Raw Materials Value: <strong class="font-mono-tech text-slate-900">${usd(invAnalytics.currentSnapshot.materialInventoryValue)}</strong></span>
              <span>Combined Value: <strong class="font-mono-tech text-[#0095FF]">${usd(invAnalytics.currentSnapshot.currentInventoryValue)}</strong></span>
            </div>

            <!-- Materials Requiring Restocking & Low-Stock Products List -->
            <div class="space-y-2">
              <p class="text-xs font-bold text-slate-800 uppercase tracking-wider">Restock Alerts (Current Live Status)</p>
              ${(invAnalytics.currentSnapshot.materialsRequiringRestocking || [])
                .map(
                  (m) => `
                  <div class="p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span class="font-bold text-slate-900">${esc(m.name)}</span>
                      <span class="font-mono-tech text-[11px] text-slate-600 ml-1">(${esc(m.materialId)} · ${esc(m.category)})</span>
                    </div>
                    <span class="font-mono-tech font-bold text-amber-800">
                      ${m.quantity} / min ${m.minimumStock} ${esc(m.unit)} (${esc(m.status)})
                    </span>
                  </div>
                `
                )
                .join('')}
              ${(invAnalytics.currentSnapshot.lowStockProducts || [])
                .concat(invAnalytics.currentSnapshot.outOfStockProducts || [])
                .map(
                  (p) => `
                  <div class="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span class="font-bold text-slate-900">${esc(p.name)}</span>
                      <span class="font-mono-tech text-[11px] text-slate-500 ml-1">(${esc(p.productId)})</span>
                    </div>
                    <span class="font-mono-tech font-bold ${p.stock <= 0 ? 'text-rose-600' : 'text-amber-700'}">
                      ${p.stock} in stock (min ${p.minStock})
                    </span>
                  </div>
                `
                )
                .join('')}
            </div>
          </div>
        </div>

        <!-- Historical Monthly Inventory Movements -->
        <div class="admin-card overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-200 bg-sky-50/60 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-slate-900">Historical Period Movements (${esc(report.period.label)})</h3>
                <span class="px-2 py-0.5 rounded-full bg-sky-100 text-[#0077CC] font-mono-tech text-[10px] font-bold">PERIOD AUDIT LOG</span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">Materials &amp; stock consumed or restocked specifically during ${esc(report.period.label)}</p>
            </div>
            <span class="font-mono-tech text-xs font-bold text-slate-700">
              ${invAnalytics.periodMovements.totalMovementsCount} Movements
            </span>
          </div>

          <div class="p-5 space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Consumed in Period (Stock Out)</span>
                <span class="font-mono-tech text-lg font-bold text-rose-600 mt-1 block">-${invAnalytics.periodMovements.totalUnitsConsumed} units</span>
                <span class="text-[11px] text-slate-500">Est. value consumed: <strong class="font-mono-tech">${usd(invAnalytics.periodMovements.totalConsumedValue)}</strong></span>
              </div>
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Restocked in Period (Stock In)</span>
                <span class="font-mono-tech text-lg font-bold text-emerald-600 mt-1 block">+${invAnalytics.periodMovements.totalUnitsRestocked} units</span>
                <span class="text-[11px] text-slate-500">Restock outlay: <strong class="font-mono-tech">${usd(invAnalytics.periodMovements.totalRestockedCost)}</strong></span>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-bold text-slate-800 uppercase tracking-wider">Materials &amp; Items Consumed During ${esc(report.period.label)}</p>
              ${
                (invAnalytics.periodMovements.materialsConsumedInPeriod || []).length === 0
                  ? `<p class="text-xs text-slate-500 py-4 text-center">No Stock Out consumption movements recorded in ${esc(report.period.label)}.</p>`
                  : (invAnalytics.periodMovements.materialsConsumedInPeriod || [])
                      .map(
                        (item) => `
                        <div class="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 text-xs">
                          <div>
                            <p class="font-bold text-slate-900">${esc(item.name)}</p>
                            <p class="font-mono-tech text-[11px] text-slate-500">ID: ${esc(item.code)} · ${item.transactionsCount} movement(s) · Last: ${esc(item.lastReason)}</p>
                          </div>
                          <div class="text-right font-mono-tech shrink-0">
                            <p class="font-bold text-rose-600">-${item.unitsConsumed} units</p>
                            <p class="text-[11px] text-slate-600">${usd(item.totalCost)}</p>
                          </div>
                        </div>
                      `
                      )
                      .join('')
              }
            </div>
          </div>
        </div>
      </section>

      <!-- 9. Voucher Analytics -->
      <section id="analytics-vouchers-section" class="admin-card overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Fixed-Amount Voucher Analytics (${esc(report.period.label)})</h3>
            <p class="text-xs text-slate-500">Issuance, live expiration status, redemption rate, and fixed-amount Dollar ($) discounts redeemed</p>
          </div>
          <span class="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono-tech text-xs font-bold">
            Redemption Rate: ${vchAnalytics.redemptionRate.toFixed(1)}%
          </span>
        </div>

        <div class="p-5 space-y-5">
          <div class="analytics-voucher-kpi-grid">
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Issued (Period)</span>
              <span class="font-mono-tech text-lg font-bold text-slate-900 mt-1 block">${vchAnalytics.totalIssuedInPeriod}</span>
              <span class="text-[11px] text-slate-500">${vchAnalytics.totalVouchersIssued} all-time</span>
            </div>
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Vouchers</span>
              <span class="font-mono-tech text-lg font-bold text-emerald-600 mt-1 block">${vchAnalytics.activeVouchers}</span>
              <span class="text-[11px] text-slate-500">Currently usable</span>
            </div>
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Redeemed</span>
              <span class="font-mono-tech text-lg font-bold text-[#0095FF] mt-1 block">${vchAnalytics.redeemedVouchers}</span>
              <span class="text-[11px] text-slate-500">${vchAnalytics.redeemedInPeriodCount} in period</span>
            </div>
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Expired</span>
              <span class="font-mono-tech text-lg font-bold text-amber-600 mt-1 block">${vchAnalytics.expiredVouchers}</span>
              <span class="text-[11px] text-slate-500">Past expiry date</span>
            </div>
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Revoked</span>
              <span class="font-mono-tech text-lg font-bold text-rose-600 mt-1 block">${vchAnalytics.revokedVouchers}</span>
              <span class="text-[11px] text-slate-500">Admin revoked</span>
            </div>
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Discount Redeemed</span>
              <span class="font-mono-tech text-lg font-bold text-indigo-600 mt-1 block">${usd(vchAnalytics.totalDiscountRedeemed)}</span>
              <span class="text-[11px] text-slate-500">Period: ${usd(vchAnalytics.periodDiscountRedeemed)}</span>
            </div>
            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
              <span class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Redemption Rate</span>
              <span class="font-mono-tech text-lg font-bold text-emerald-700 mt-1 block">${vchAnalytics.redemptionRate.toFixed(1)}%</span>
              <span class="text-[11px] text-slate-500">Period: ${vchAnalytics.periodRedemptionRate.toFixed(1)}%</span>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Voucher Code</th>
                  <th>Assigned Customer</th>
                  <th>Target Product</th>
                  <th>Fixed Discount</th>
                  <th>Issued Date</th>
                  <th>Expiration</th>
                  <th class="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                ${(vchAnalytics.voucherBreakdown || [])
                  .map((v) => {
                    const statusBadgeMap = {
                      Active: 'admin-status-in-stock',
                      'Expiring Soon': 'admin-status-low-stock',
                      Used: 'bg-sky-50 text-[#0077CC] border border-sky-200',
                      Expired: 'admin-status-out-of-stock',
                      Revoked: 'admin-status-out-of-stock',
                    };
                    return `
                      <tr>
                        <td class="whitespace-nowrap">
                          <span class="vch-code-chip">${esc(v.code)}</span>
                          <p class="admin-table-sub font-mono-tech mt-0.5">VoucherID: ${esc(v.voucherId)}</p>
                        </td>
                        <td>
                          <p class="admin-table-title">${esc(v.customerName)}</p>
                          <p class="admin-table-sub font-mono-tech">${esc(v.customerEmail)}</p>
                        </td>
                        <td class="text-xs font-semibold text-slate-800">${esc(v.productName)}</td>
                        <td class="font-mono-tech text-xs font-bold text-[#0095FF] whitespace-nowrap">-${usd(v.discountAmount)}</td>
                        <td class="font-mono-tech text-xs text-slate-600">${esc(v.issuedAt)}</td>
                        <td class="font-mono-tech text-xs text-slate-600">${esc(String(v.expiresAt || 'No expiry'))}</td>
                        <td class="text-right whitespace-nowrap">
                          <span class="admin-status-badge ${statusBadgeMap[v.status] || 'admin-status-in-stock'}">
                            <span class="admin-status-badge-dot"></span>${esc(v.status)}
                          </span>
                        </td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- 10. Period Transactions Detail Ledger (Included in Printable & Exportable Reports) -->
      <section id="analytics-transactions-section" class="admin-card overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Period Transaction Details (${esc(report.period.label)})</h3>
            <p class="text-xs text-slate-500">Complete transaction audit log included in downloadable PDF, CSV, and Printable business reports</p>
          </div>
          <span class="font-mono-tech text-xs font-bold text-slate-700">
            ${(report.transactions || []).length} Transactions
          </span>
        </div>

        ${
          (report.transactions || []).length === 0
            ? `<div class="p-8 text-center text-xs text-slate-500">No orders were placed during ${esc(report.period.label)}. Select another month or date range above to inspect historical transactions.</div>`
            : `
          <div class="overflow-x-auto">
            <table class="admin-table" data-testid="analytics-transactions-table">
              <thead>
                <tr>
                  <th>Order # / OrderID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Order Status</th>
                  <th>Payment</th>
                  <th>Discount</th>
                  <th class="text-right">Realized Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${(report.transactions || [])
                  .map(
                    (t) => `
                    <tr>
                      <td class="whitespace-nowrap">
                        <p class="font-mono-tech text-xs font-bold text-[#0095FF]">#${esc(t.orderNumber)}</p>
                        <p class="admin-table-sub font-mono-tech">OrderID: ${esc(t.orderId)}</p>
                      </td>
                      <td class="font-mono-tech text-xs text-slate-600 whitespace-nowrap">${esc(t.reportDate || t.completedAt || t.orderDate)}</td>
                      <td>
                        <p class="admin-table-title">${esc(t.clientName)}</p>
                        <p class="admin-table-sub font-mono-tech">${esc(t.clientEmail)}</p>
                      </td>
                      <td>
                        <p class="admin-table-title">${esc(t.furnitureName)}</p>
                        <p class="admin-table-sub font-mono-tech">ProductID: ${esc(t.productId)}</p>
                      </td>
                      <td class="font-mono-tech text-xs text-slate-700">${t.quantity}</td>
                      <td class="whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono-tech text-[11px] font-bold">${esc(t.normalizedStatus)}</span>
                      </td>
                      <td class="font-mono-tech text-xs text-slate-600 whitespace-nowrap">${esc(t.paymentStatus)}</td>
                      <td class="font-mono-tech text-xs text-indigo-600 whitespace-nowrap">${t.discountAmount > 0 ? '-' + usd(t.discountAmount) : '$0'}</td>
                      <td class="text-right font-mono-tech text-xs font-bold ${t.realizedRevenue > 0 ? 'text-emerald-700' : 'text-slate-400'} whitespace-nowrap">
                        ${usd(t.realizedRevenue)}
                      </td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
        }
      </section>
    </div>
  `;

  // Bind Preset Filter Buttons
  analyticsEl.querySelectorAll('[data-analytics-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-analytics-preset') || 'this_month';
      state.adminAnalyticsPreset = preset;
      if (preset === 'select_month') {
        if (!state.adminAnalyticsYear) state.adminAnalyticsYear = String(defaultManilaRange.current.year);
        if (!state.adminAnalyticsMonth) state.adminAnalyticsMonth = String(defaultManilaRange.current.month);
      } else if (preset === 'this_year') {
        if (!state.adminAnalyticsYear) state.adminAnalyticsYear = String(defaultManilaRange.current.year);
      } else if (preset === 'custom_range') {
        if (!state.adminAnalyticsStartDate) state.adminAnalyticsStartDate = report.period.startDate;
        if (!state.adminAnalyticsEndDate) state.adminAnalyticsEndDate = report.period.endDate;
      }
      renderAdminAnalyticsSection();
    });
  });

  // Bind Quick Historical Month Jump Buttons
  analyticsEl.querySelectorAll('[data-analytics-quick-month]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ym = btn.getAttribute('data-analytics-quick-month') || '2026-11';
      const [yStr, mStr] = ym.split('-');
      state.adminAnalyticsPreset = 'select_month';
      state.adminAnalyticsYear = yStr;
      state.adminAnalyticsMonth = String(Number(mStr));
      renderAdminAnalyticsSection();
    });
  });

  // Bind Month Selector in Monthly Overview header
  const overviewPeriodSelect = document.getElementById('analytics-overview-period-select');
  if (overviewPeriodSelect) {
    overviewPeriodSelect.addEventListener('change', (e) => {
      const val = String(e.target.value || '');
      if (val.startsWith('year-')) {
        state.adminAnalyticsPreset = 'this_year';
        state.adminAnalyticsYear = val.replace('year-', '');
      } else if (val.includes('-')) {
        const [yStr, mStr] = val.split('-');
        state.adminAnalyticsPreset = 'select_month';
        state.adminAnalyticsYear = yStr;
        state.adminAnalyticsMonth = String(Number(mStr));
      }
      renderAdminAnalyticsSection();
    });
  }

  // Bind "View orders ->" button in Monthly Overview Order Status panel
  const overviewViewOrdersBtn = document.getElementById('analytics-overview-view-orders-btn');
  if (overviewViewOrdersBtn) {
    overviewViewOrdersBtn.addEventListener('click', () => {
      const ordersSectionEl = document.getElementById('analytics-orders-section');
      if (ordersSectionEl) {
        ordersSectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (window.__switchAdminTab) {
        window.__switchAdminTab('orders');
      }
    });
  }

  // Bind Month & Year Selectors
  const monthSelect = document.getElementById('analytics-select-month');
  if (monthSelect) {
    monthSelect.addEventListener('change', (e) => {
      state.adminAnalyticsMonth = e.target.value;
      renderAdminAnalyticsSection();
    });
  }
  const yearSelect = document.getElementById('analytics-select-year');
  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      state.adminAnalyticsYear = e.target.value;
      renderAdminAnalyticsSection();
    });
  }

  // Bind Custom Date Range Apply Button
  const applyCustomBtn = document.getElementById('analytics-apply-custom-range');
  if (applyCustomBtn) {
    applyCustomBtn.addEventListener('click', () => {
      const startInput = document.getElementById('analytics-custom-start');
      const endInput = document.getElementById('analytics-custom-end');
      state.adminAnalyticsStartDate = startInput ? startInput.value : '';
      state.adminAnalyticsEndDate = endInput ? endInput.value : '';
      renderAdminAnalyticsSection();
    });
  }

  // Bind "Issue Voucher" shortcut on low-selling products
  analyticsEl.querySelectorAll('[data-analytics-promote-product]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-analytics-promote-product') || '';
      if (window.__switchAdminTab) {
        window.__switchAdminTab('vouchers');
      }
      const vchProdSelect = document.getElementById('vch-product');
      if (vchProdSelect && pid) {
        vchProdSelect.value = pid;
        vchProdSelect.dispatchEvent(new Event('change'));
      }
    });
  });

  // Bind Export PDF Report
  const pdfBtn = document.getElementById('analytics-export-pdf-btn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', () => {
      const pdfBytes = buildAnalyticsPdfBytes(report);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = String(report.period.label || 'monthly-report')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      a.href = url;
      a.download = `lillia-rowena-analytics-${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      showAdminBanner(`Downloaded PDF Report for ${report.period.label}.`);
    });
  }

  // Bind Export CSV Report
  const csvBtn = document.getElementById('analytics-export-csv-btn');
  if (csvBtn) {
    csvBtn.addEventListener('click', () => {
      const csvText = buildAnalyticsCsvContent(report);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = String(report.period.label || 'monthly-report')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      a.href = url;
      a.download = `lillia-rowena-analytics-${slug}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      showAdminBanner(`Exported CSV Report for ${report.period.label}.`);
    });
  }

  // Bind Printable Report
  const printBtn = document.getElementById('analytics-print-report-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}


return { initDashboardPage };
}
