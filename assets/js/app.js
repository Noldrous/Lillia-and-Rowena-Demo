import {
  CATALOG_COLOR_FILTERS,
  buildMaterialRecord,
  buildProductRecord,
  buildRequestDesignMessengerUrl,
  calculateOrderPricing,
  computeVariantPricing,
  filterCatalogPageItems,
  filterFurnitureItems,
  findMatchingColorVariant,
  formatCustomerProductDisplay,
  formatSimplifiedProductCardData,
  formatVoucherBenefitLabel,
  getColorFilterCounts,
  getRecommendedBestSellers,
  resolveAuthNavigationState,
  resolveCustomerAvatarState,
  validateAndBuildOfferProposal,
  validateVoucherForOrder,
} from './store.js';



const HERO_TAB_CONTENT = {
  flagship: {
    eyebrow: 'Handcrafted Solid Wood & Custom Upholstered Furniture',
    title: 'Timeless Comfort Crafted for Modern Living.',
    description:
      'Furnish every room with sustainably sourced American walnut, solid white oak, and soft Belgian linen and bouclé upholstery—ready for your home or custom-made to order.',
    priceLabel: 'Pieces Starting At',
    price: '$1,180',
    monthly: 'Flexible monthly payment plans available',
    ctaText: 'Explore Living Room',
    filterTarget: 'living',
    image: 'assets/images/hero_living_room_atelier.jpg',
    cardSubtitle: 'Featured Room · Solid Walnut Dining & Bouclé Living Room · White-Glove Delivery',
    cardTitle: 'Signature Living & Dining Collection',
  },
  living: {
    eyebrow: 'Living & Lounge · Sofas, Lounge Chairs & Coffee Tables',
    title: 'Inviting Sofas & Handcrafted Coffee Tables.',
    description:
      'Relax in deep-seated sofas upholstered in soft Belgian bouclé, paired with solid white oak lounge frames and natural stone coffee tables built for everyday living.',
    priceLabel: 'Living Room Starting At',
    price: '$1,680',
    monthly: 'Flexible monthly payment plans available',
    ctaText: 'Shop Living & Lounge',
    filterTarget: 'living',
    image: 'assets/images/category_living_lounge.jpg',
    cardSubtitle: 'Living Room Collection · Solid White Oak, Belgian Bouclé & Natural Travertine',
    cardTitle: 'Living & Lounge Collection',
  },
  dining: {
    eyebrow: 'Dining & Tables · Solid Wood Tables & Dining Chairs',
    title: 'Solid Walnut & White Oak Dining Tables.',
    description:
      'Gather around heirloom dining tables crafted from solid American black walnut and white oak, paired with comfortable woven cord and upholstered dining chairs.',
    priceLabel: 'Dining Room Starting At',
    price: '$1,290',
    monthly: 'Flexible monthly payment plans available',
    ctaText: 'Shop Dining & Tables',
    filterTarget: 'dining',
    image: 'assets/images/category_dining_tables.jpg',
    cardSubtitle: 'Dining Room Collection · Solid American Black Walnut & White Oak',
    cardTitle: 'Dining & Tables Collection',
  },
  bedroom: {
    eyebrow: 'Bedroom Sanctuary · Platform Beds, Nightstands & Dressers',
    title: 'Restful Belgian Linen Beds & Solid Wood Nightstands.',
    description:
      'Create a calm bedroom retreat with upholstered Belgian linen platform beds, solid ash frames, and soft-close bedside tables with spacious storage.',
    priceLabel: 'Bedroom Starting At',
    price: '$1,180',
    monthly: 'Flexible monthly payment plans available',
    ctaText: 'Shop Bedroom Collection',
    filterTarget: 'bedroom',
    image: 'assets/images/category_bedroom_sanctuary.jpg',
    cardSubtitle: 'Bedroom Collection · Natural Belgian Linen & Solid Ash Wood',
    cardTitle: 'Bedroom Sanctuary Collection',
  },
  office: {
    eyebrow: 'Study & Storage · Writing Desks, Bookcases & Sideboards',
    title: 'Solid Wood Writing Desks & Fluted Sideboards.',
    description:
      'Organize your workspace and living areas with solid walnut writing desks, concealed cable management, and handcrafted fluted wood sideboards.',
    priceLabel: 'Study & Storage Starting At',
    price: '$2,150',
    monthly: 'Flexible monthly payment plans available',
    ctaText: 'Shop Study & Storage',
    filterTarget: 'office',
    image: 'assets/images/category_office_storage.jpg',
    cardSubtitle: 'Study & Storage Collection · Solid Black Walnut & Leather Accents',
    cardTitle: 'Study & Storage Collection',
  },
};

const FRIENDLY_CUSTOMER_STEPS = [
  'Order Confirmed',
  'Crafting Your Piece',
  'Quality Inspection',
  'Ready for Delivery',
];

const state = {
  categories: [],
  catalog: [],
  materials: [],
  customers: [],
  messengerConversations: [],
  inventoryTransactions: [],
  vouchers: [],
  orders: [],
  selectedColorByProduct: {},
  selectedMaterialByProduct: {},
  selectedCategory: 'recommended',
  searchQuery: '',
  sortBy: 'featured',
  catalogPageCategory: 'all',
  catalogPageColorKey: 'all',
  catalogPageMaxPrice: 5500,
  catalogPageSpotlightProductId: '',
  catalogPageSearchQuery: '',
  cartItems: [],
  appliedVoucher: null,
  sessionUser: null,
  activeClientTab: 'home',
  clientCustomOrderOpen: false,
  clientCustomOrderInput: {
    productId: 'furn-dn-01',
    materialId: 'mat-101',
    lengthCm: '260',
    widthCm: '110',
    heightCm: '75',
    colorFinish: 'Hand-Rubbed Natural Walnut',
    quantity: '1',
    notes: '',
  },
  activeAdminTab: 'overview',
  adminProductSearch: '',
  adminProductCategory: 'all',
  adminProductTypeFilter: 'all',
  adminProductStockFilter: 'all',
  adminProductPage: 1,
  adminMaterialFormOpen: false,
  adminEditingMaterialId: '',
  adminInventoryView: 'materials',
  adminMovementFormOpen: false,
  adminHistoryModalOpen: false,
  adminHistoryMaterialId: 'all',
  adminInventoryStockSearch: '',
  adminInventoryCategoryFilter: 'all',
  adminInventoryStockFilter: 'all',
  adminInventoryPage: 1,
  adminInventoryPageSize: 5,
  adminInventoryHistorySearch: '',
  adminInventoryHistoryTypeFilter: 'all',
  adminMovementMode: 'Stock In',
  adminMovementMaterialId: '',
  adminMovementProductId: '',
  adminMovementQuantity: '20',
  adminMovementCost: '',
  adminMovementReason: 'Allocated to Workshop Production',
  adminMovementCustomReason: '',
  adminMovementDate: new Date().toISOString().slice(0, 10),
  adminOpenActionMenuId: '',
  adminOrderSearch: '',
  adminOrderStage: 'all',
  adminCustomerSearch: '',
  adminAnalyticsPreset: 'this_month',
  adminAnalyticsMonth: '',
  adminAnalyticsYear: '',
  adminAnalyticsStartDate: '',
  adminAnalyticsEndDate: '',
  customerProfile: {
    name: 'Rowena Vance',
    email: 'rowena.vance@vancearchitects.com',
    phone: '+1 (212) 555-0148',
    city: 'New York, NY 10013',
    address: 'Suite 400, 118 Mercer St, SoHo',
    notes: 'Freight elevator available Mon–Fri 9:00 AM – 5:00 PM. Please call 30 minutes before arrival.',
    avatar: '',
  },
};

function syncCustomerAvatarDOM(profile = state.customerProfile) {
  const avatarState = resolveCustomerAvatarState({
    name: profile?.name || state.sessionUser?.name || 'Rowena Vance',
    avatar: profile?.avatar || state.sessionUser?.avatar || '',
  });

  const pairs = [
    ['client-sidebar-avatar-img', 'client-sidebar-initials'],
    ['client-welcome-avatar-img', 'client-welcome-avatar-initials'],
    ['client-profile-avatar-preview', 'client-profile-avatar-initials'],
    ['portal-header-avatar-img', 'portal-header-default-icon'],
    ['nav-profile-avatar-img', 'nav-profile-default-icon'],
  ];

  pairs.forEach(([imgId, fallbackId]) => {
    const imgEl = document.getElementById(imgId);
    const fallbackEl = document.getElementById(fallbackId);
    if (fallbackEl && fallbackEl.tagName !== 'svg' && fallbackEl.tagName !== 'SVG') {
      fallbackEl.textContent = avatarState.initials;
    }
    if (!imgEl) return;
    if (avatarState.hasAvatar) {
      imgEl.src = avatarState.avatarSrc;
      imgEl.classList.remove('hidden');
      if (fallbackEl) fallbackEl.classList.add('hidden');
    } else {
      imgEl.removeAttribute('src');
      imgEl.classList.add('hidden');
      if (fallbackEl) fallbackEl.classList.remove('hidden');
    }
  });

  const hiddenInput = document.getElementById('client-input-avatar');
  if (hiddenInput) {
    hiddenInput.value = avatarState.hasAvatar ? avatarState.avatarSrc : '';
  }
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function usd(amount) {
  return '$' + Math.round(Number(amount || 0)).toLocaleString('en-US');
}

function bindLiveSearchInput(inputId, stateKey, onRender) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', (e) => {
    state[stateKey] = e.target.value;
    const pos = e.target.selectionStart || 0;
    onRender();
    const nextInput = document.getElementById(inputId);
    if (nextInput) {
      nextInput.focus();
      nextInput.setSelectionRange(pos, pos);
    }
  });
}

function bindStorefrontProductButtons(root = document) {
  root.querySelectorAll('[data-view-product]').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      const pid = btn.getAttribute('data-view-product');
      if (pid) openProductDetailModal(pid);
    };
  });
  root.querySelectorAll('[data-add-cart]').forEach((btn) => {
    btn.onclick = () => {
      const pid = btn.getAttribute('data-add-cart');
      if (pid) addProductToCartFromStorefront(pid);
    };
  });
}

const API_ENDPOINT =
  typeof window !== 'undefined' && window.location.pathname.includes('/src/')
    ? window.location.pathname.includes('/views/')
      ? '../api.php'
      : 'api.php'
    : 'src/api.php';

function syncDatabaseStore(action = 'sync_store', extraPayload = {}) {
  try {
    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        products: state.catalog,
        materials: state.materials,
        customers: state.customers,
        inventoryTransactions: state.inventoryTransactions,
        vouchers: state.vouchers,
        orders: state.orders,
        customerProfile: state.customerProfile,
        ...extraPayload,
      }),
    }).catch(() => {});
  } catch (_err) {
    // Ignore network error in static environments
  }
}

function persistProductToStorage(product) {
  if (product && product.id) syncDatabaseStore('save_product', { product });
}

function saveMaterialsToStorage() {
  syncDatabaseStore('save_material');
}

function saveOrdersToStorage() {
  syncDatabaseStore('sync_store');
}

function saveInventoryTransactionsToStorage() {
  syncDatabaseStore('sync_store');
}

function loadSessionUser() {
  if (typeof window !== 'undefined' && window.__SERVER_SESSION_USER__) {
    return window.__SERVER_SESSION_USER__;
  }
  return state.sessionUser || null;
}

function saveSessionUserToServer(sessionUser) {
  state.sessionUser = sessionUser;
  syncDatabaseStore('save_session', { sessionUser });
}

function saveCartToStorage() {
  const serialized = state.cartItems.map((c) => ({
    productId: c.product.id,
    finish: c.finish,
    quantity: c.quantity,
  }));
  syncDatabaseStore('save_cart', { cartItems: serialized });
}

function hydrateCartFromServer(rawCartItems) {
  if (!Array.isArray(rawCartItems)) return [];
  return rawCartItems
    .map((entry) => {
      const productId = entry?.productId || entry?.product?.id || '';
      const product = state.catalog.find((p) => p.id === productId);
      if (!product) return null;
      return {
        product,
        finish: entry.finish || product.defaultFinish,
        quantity: Math.max(1, Number(entry.quantity || 1)),
      };
    })
    .filter(Boolean);
}

function saveCustomerProfileToStorage() {
  syncDatabaseStore('sync_store');
}

async function loadData() {
  let baseData = null;

  try {
    const apiRes = await fetch(`${API_ENDPOINT}?action=state`, { cache: 'no-store' });
    if (apiRes.ok) {
      const parsedApi = await apiRes.json();
      if (parsedApi && Array.isArray(parsedApi.products)) {
        baseData = parsedApi;
      }
    }
  } catch (_apiErr) {
    // Fallback to built-in INITIAL_STORE_DATA if src/api.php is unreachable
  }

  if (!baseData) {
    baseData = { categories: [], products: [], materials: [], vouchers: [], orders: [] };
  }

  baseData.products = (baseData.products || []).map((p) => buildProductRecord(p, p));
  baseData.materials = (baseData.materials || []).map((m) => buildMaterialRecord(m, m));
  baseData.inventoryTransactions = Array.isArray(baseData.inventoryTransactions)
    ? baseData.inventoryTransactions
    : [];
  baseData.vouchers = Array.isArray(baseData.vouchers) ? baseData.vouchers : [];
  baseData.orders = Array.isArray(baseData.orders) ? baseData.orders : [];
  if (baseData.customerProfile && typeof baseData.customerProfile === 'object') {
    state.customerProfile = { ...state.customerProfile, ...baseData.customerProfile };
  }
  if (baseData.sessionUser && baseData.sessionUser.email && baseData.sessionUser.role) {
    state.sessionUser = baseData.sessionUser;
  } else if (typeof window !== 'undefined' && window.__SERVER_SESSION_USER__) {
    state.sessionUser = window.__SERVER_SESSION_USER__;
  }
  return baseData;
}

/* ==========================================================================
   1. PUBLIC SHOWROOM PAGE (index.html) & SHARED STOREFRONT MODALS
   ========================================================================== */
function handleStorefrontLogout(e) {
  if (e) e.preventDefault();
  state.sessionUser = null;
  state.cartItems = [];
  state.appliedVoucher = null;
  saveSessionUserToServer(null);
  syncAuthNavigationUI();
  renderCartDrawer();
}

function syncAuthNavigationUI() {
  const authNav = resolveAuthNavigationState(state.sessionUser);

  const guestNav = document.getElementById('nav-guest-actions');
  const custNav = document.getElementById('nav-customer-actions');
  const adminNav = document.getElementById('nav-admin-actions');
  const profileNameEl = document.getElementById('nav-profile-name');
  const profileInitialsEl = document.getElementById('nav-profile-initials');

  const guestFooter = document.getElementById('footer-guest-links');
  const custFooter = document.getElementById('footer-customer-links');
  const adminFooter = document.getElementById('footer-admin-links');

  const bannerVouchersLink = document.getElementById('banner-customer-vouchers-link');
  const heroTrackLink = document.getElementById('hero-track-order-link');
  const cartUserEmailEl = document.getElementById('cart-user-email');
  const cartCheckoutLink = document.getElementById('cart-checkout-link');
  const topBarStatus = document.getElementById('top-bar-user-status');

  if (guestNav) {
    guestNav.classList.toggle('hidden', authNav.isAuthenticated);
    guestNav.classList.toggle('flex', !authNav.isAuthenticated);
  }
  if (custNav) {
    custNav.classList.toggle('hidden', !authNav.showCustomerAccountNav);
    custNav.classList.toggle('flex', authNav.showCustomerAccountNav);
  }
  if (adminNav) {
    adminNav.classList.toggle('hidden', !authNav.showAdminNav);
    adminNav.classList.toggle('flex', authNav.showAdminNav);
  }

  const profilePillEl = document.getElementById('nav-profile-pill');
  if (profileNameEl && authNav.userDisplayName) profileNameEl.textContent = authNav.userDisplayName;
  if (profileInitialsEl && authNav.userInitials) profileInitialsEl.textContent = authNav.userInitials;
  if (profilePillEl && authNav.userDisplayName) {
    profilePillEl.title = `My Account (${authNav.userDisplayName})`;
    profilePillEl.setAttribute('aria-label', `My Account (${authNav.userDisplayName})`);
  }
  syncCustomerAvatarDOM(state.customerProfile);

  if (guestFooter) guestFooter.classList.toggle('hidden', authNav.isAuthenticated);
  if (custFooter) custFooter.classList.toggle('hidden', !authNav.showCustomerAccountNav);
  if (adminFooter) adminFooter.classList.toggle('hidden', !authNav.showAdminNav);
  if (bannerVouchersLink) bannerVouchersLink.classList.toggle('hidden', !authNav.showCustomerAccountNav);

  if (heroTrackLink) {
    heroTrackLink.href = authNav.heroOrderLink.href;
    heroTrackLink.textContent = authNav.heroOrderLink.label;
  }
  if (cartUserEmailEl) cartUserEmailEl.textContent = authNav.cartVoucherHint;
  if (cartCheckoutLink) {
    cartCheckoutLink.href = authNav.cartCheckoutCta.href;
    cartCheckoutLink.textContent = authNav.cartCheckoutCta.label;
  }
  if (topBarStatus) {
    if (authNav.showCustomerAccountNav) {
      topBarStatus.innerHTML = `<span class="text-[#BCE3FF] font-semibold">Signed in as ${esc(authNav.userDisplayName)}</span><span class="hidden sm:inline text-slate-500">·</span><span>Showroom Open Daily: 10:00 AM – 8:00 PM</span>`;
    } else if (authNav.showAdminNav) {
      topBarStatus.innerHTML = `<span class="text-[#BCE3FF] font-semibold">Admin Session Active</span><span class="hidden sm:inline text-slate-500">·</span><span>Showroom Open Daily: 10:00 AM – 8:00 PM</span>`;
    } else {
      topBarStatus.innerHTML = `<span>Showroom Open Daily: 10:00 AM – 8:00 PM</span>`;
    }
  }

  ['nav-logout-btn', 'nav-admin-logout-btn', 'footer-logout-btn', 'footer-admin-logout-btn'].forEach(
    (btnId) => {
      const btn = document.getElementById(btnId);
      if (btn) btn.onclick = handleStorefrontLogout;
    }
  );
}

function syncBodyScrollLock() {
  const cartDrawer = document.getElementById('cart-drawer');
  const productModal = document.getElementById('product-detail-modal');
  const makeOfferModal = document.getElementById('make-offer-modal');
  const isAnyOverlayOpen = Boolean(
    (cartDrawer && !cartDrawer.classList.contains('hidden')) ||
      (productModal && !productModal.classList.contains('hidden')) ||
      (makeOfferModal && !makeOfferModal.classList.contains('hidden'))
  );
  document.body.classList.toggle('modal-open', isAnyOverlayOpen);
  document.body.style.overflow = isAnyOverlayOpen ? 'hidden' : '';
}

function handleRequestDesignClick(e) {
  if (e) e.preventDefault();
  const resolved = buildRequestDesignMessengerUrl(state.sessionUser);
  if (resolved.requiresLogin) {
    window.location.href = resolved.redirectUrl;
    return;
  }
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function' && resolved.messageText) {
      navigator.clipboard.writeText(resolved.messageText).catch(() => {});
    }
  } catch (_err) {
    // Ignore clipboard error
  }
  window.location.href = resolved.redirectUrl;
}

function bindRequestDesignTriggers() {
  document.querySelectorAll('[data-request-design-trigger]').forEach((btn) => {
    btn.onclick = handleRequestDesignClick;
  });
}

function bindStorefrontModalListeners() {
  const productModal = document.getElementById('product-detail-modal');
  const closeProductModalBtn = document.getElementById('close-product-modal-btn');
  const closeProductModal = () => {
    if (!productModal) return;
    productModal.classList.add('hidden');
    productModal.classList.remove('flex');
    syncBodyScrollLock();
  };
  if (closeProductModalBtn) closeProductModalBtn.onclick = closeProductModal;
  if (productModal) {
    productModal.onclick = (e) => {
      if (e.target === productModal) closeProductModal();
    };
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !productModal.classList.contains('hidden')) {
        closeProductModal();
      }
    });
  }

  initMakeOfferModal();
}

function bindCartDrawerAndVoucher() {
  const cartDrawer = document.getElementById('cart-drawer');
  const openCartBtn = document.getElementById('open-cart-btn');
  const closeCartBtn = document.getElementById('close-cart-btn');
  const closeDrawer = () => {
    if (!cartDrawer) return;
    cartDrawer.classList.add('hidden');
    cartDrawer.classList.remove('flex');
    syncBodyScrollLock();
  };
  if (openCartBtn && cartDrawer) {
    openCartBtn.addEventListener('click', () => {
      cartDrawer.classList.remove('hidden');
      cartDrawer.classList.add('flex');
      syncBodyScrollLock();
      renderCartDrawer();
    });
  }
  if (closeCartBtn && cartDrawer) {
    closeCartBtn.addEventListener('click', closeDrawer);
  }
  if (cartDrawer) {
    cartDrawer.addEventListener('click', (e) => {
      if (e.target === cartDrawer) closeDrawer();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !cartDrawer.classList.contains('hidden')) {
        closeDrawer();
      }
    });
  }

  const applyVoucherBtn = document.getElementById('apply-voucher-btn');
  if (applyVoucherBtn) {
    applyVoucherBtn.addEventListener('click', async () => {
      const codeInput = document.getElementById('voucher-code-input');
      const feedback = document.getElementById('voucher-feedback');
      const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
      const activeEmail = state.sessionUser
        ? state.sessionUser.email
        : state.customerProfile?.email || '';

      let check = validateVoucherForOrder(
        state.vouchers,
        code,
        activeEmail,
        state.cartItems,
        state.catalog
      );

      if (check.valid) {
        try {
          const resp = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              action: 'validate_voucher',
              voucherCode: code,
              customerEmail: activeEmail,
              cartItems: state.cartItems.map((c) => ({
                productId: c.product.id,
                quantity: c.quantity,
              })),
            }),
          });
          const data = await resp.json();
          if (!resp.ok || !data.valid) {
            check = {
              valid: false,
              discountAmount: 0,
              voucher: null,
              errorMessage: data.error || 'Voucher validation failed on server.',
            };
          }
        } catch (_err) {
          // Offline fallback uses check result
        }
      }

      if (feedback) {
        feedback.classList.remove('hidden', 'text-emerald-700', 'text-rose-600');
        if (check.valid) {
          state.appliedVoucher = check.voucher;
          const targetProdName =
            check.voucher.furnitureName || check.voucher.productName || 'selected product';
          feedback.textContent = `✓ Voucher ${check.voucher.code} (${formatVoucherBenefitLabel(check.voucher)}) applied to "${targetProdName}" (-${usd(check.discountAmount)})!`;
          feedback.classList.add('text-emerald-700');
        } else {
          state.appliedVoucher = null;
          feedback.textContent = `✕ ${check.errorMessage}`;
          feedback.classList.add('text-rose-600');
        }
      }
      renderCartDrawer();
    });
  }
}

function initShowroomPage() {
  syncAuthNavigationUI();
  bindRequestDesignTriggers();
  bindStorefrontModalListeners();

  const heroTabButtons = document.querySelectorAll('[data-hero-tab]');
  heroTabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabKey = btn.getAttribute('data-hero-tab') || 'flagship';
      const data = HERO_TAB_CONTENT[tabKey] || HERO_TAB_CONTENT.flagship;

      heroTabButtons.forEach((b) => {
        const active = b.getAttribute('data-hero-tab') === tabKey;
        b.setAttribute('aria-selected', active ? 'true' : 'false');
        b.className = active
          ? 'hero-tab-btn px-3.5 py-1.5 rounded-lg bg-[#0095FF] text-white text-xs font-semibold tracking-wide shrink-0 cursor-pointer transition-colors'
          : 'hero-tab-btn px-3.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 text-xs font-medium transition-colors shrink-0 cursor-pointer';
      });

      const setElText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      };
      setElText('hero-eyebrow', data.eyebrow);
      setElText('hero-title', data.title);
      setElText('hero-headline', data.title);
      setElText('hero-description', data.description);
      setElText('hero-price-label', data.priceLabel);
      setElText('hero-price', data.price);
      setElText('hero-monthly', data.monthly);
      setElText('hero-primary-cta-text', data.ctaText);
      setElText('hero-card-subtitle', data.cardSubtitle);
      setElText('hero-card-title', data.cardTitle);

      const heroImg = document.getElementById('hero-image');
      if (heroImg) {
        heroImg.src = data.image;
        heroImg.alt = data.cardTitle;
      }

      ['hero-primary-cta', 'hero-card-cta'].forEach((ctaId) => {
        const cta = document.getElementById(ctaId);
        if (cta) {
          cta.setAttribute('data-filter-target', data.filterTarget);
          cta.setAttribute('href', `catalog.html?category=${encodeURIComponent(data.filterTarget)}`);
        }
      });
    });
  });

  const topSearch = document.getElementById('top-nav-search');
  const topClear = document.getElementById('top-nav-search-clear');
  const syncClearButtons = (val) => {
    const hasQuery = Boolean(String(val || '').trim());
    if (topClear) {
      topClear.classList.toggle('hidden', !hasQuery);
      topClear.classList.toggle('flex', hasQuery);
    }
  };

  const showRecommendedBtn = document.getElementById('catalog-show-recommended-btn');
  if (showRecommendedBtn) {
    showRecommendedBtn.addEventListener('click', () => {
      state.searchQuery = '';
      if (topSearch) topSearch.value = '';
      syncClearButtons('');
      setActiveCategoryFilter('recommended');
    });
  }

  if (topSearch) {
    topSearch.addEventListener('input', (e) => syncClearButtons(e.target.value));
    topSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = String(topSearch.value || '').trim();
        window.location.href = trimmed
          ? `catalog.html?q=${encodeURIComponent(trimmed)}`
          : 'catalog.html';
      }
    });
  }
  if (topClear) {
    topClear.addEventListener('click', () => {
      if (topSearch) {
        topSearch.value = '';
        syncClearButtons('');
        topSearch.focus();
      }
    });
  }

  bindCartDrawerAndVoucher();

  const urlParams = new URLSearchParams(window.location.search);
  if ((urlParams.get('trigger') || '').toLowerCase() === 'request-design' && state.sessionUser) {
    window.history.replaceState({}, '', window.location.pathname);
    handleRequestDesignClick();
  }

  renderRoomCollections();
  renderCatalogGrid();
  renderCartDrawer();
}

function setActiveCategoryFilter(cat) {
  state.selectedCategory = cat || 'recommended';
  renderRoomCollections();
  renderCatalogGrid();
}

function renderRoomCollections() {
  const container =
    document.getElementById('room-collections-grid') ||
    document.getElementById('categories-grid');
  if (!container) return;

  container.innerHTML = state.categories
    .map((cat) => {
      const items = state.catalog.filter((p) => p.categoryId === cat.id);
      const isSelected = state.selectedCategory === cat.id;
      const catHref = `catalog.html?category=${encodeURIComponent(cat.id)}`;
      return `
    <article data-category-card-href="${esc(catHref)}" class="group rounded-2xl bg-white border ${
          isSelected ? 'border-[#0095FF] ring-2' : 'border-slate-200 hover:border-[#0095FF]'
        } overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer">
      <a href="${esc(catHref)}" data-filter-target="${esc(cat.id)}" data-testid="category-image-link-${esc(cat.id)}" aria-label="Explore ${esc(cat.name)}" class="block flex-1 cursor-pointer focus:outline-none">
        <div class="aspect-[4/3] relative overflow-hidden bg-slate-100">
          <img src="${esc(cat.image)}" alt="${esc(cat.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#0D1015]/85 via-[#0D1015]/20 to-transparent"></div>
          <div class="absolute bottom-3.5 left-4 right-4 text-white">
            <p class="font-mono-tech text-[11px] text-[#BCE3FF]">From ${usd(cat.startingPrice)} · ${items.length} Pieces</p>
            <h3 class="font-serif-display text-lg font-bold leading-snug mt-0.5">${esc(cat.name)}</h3>
          </div>
        </div>
        <div class="p-4 pt-3.5">
          <p class="text-xs text-[#475569] leading-relaxed line-clamp-2">${esc(cat.tagline)}</p>
        </div>
      </a>
      <div class="px-4 pb-4 pt-1">
        <a href="${esc(catHref)}" data-filter-target="${esc(cat.id)}" data-testid="category-card-link-${esc(cat.id)}" class="w-full py-2.5 px-3.5 rounded-xl ${ isSelected ? 'bg-[#0095FF] text-white' : 'bg-[#EBF6FF] group-hover:bg-[#0095FF] text-[#0D1015] group-hover:text-white' } text-xs font-semibold transition-colors flex items-center justify-between">
          <span>Explore ${esc(cat.name)}</span>
          <span>→</span>
        </a>
      </div>
    </article>
      `;
    })
    .join('');

  container.querySelectorAll('[data-category-card-href]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      const targetHref = card.getAttribute('data-category-card-href');
      if (targetHref) {
        window.location.href = targetHref;
      }
    });
  });
}

function addProductToCartFromStorefront(productId) {
  const product = state.catalog.find((p) => p.id === productId);
  if (!product) return;
  const availableStock = Math.max(0, Math.floor(Number(product.inStockCount ?? 0)));
  if (availableStock <= 0) return;

  const currentProductQtyInCart = state.cartItems
    .filter((c) => c.product.id === product.id)
    .reduce((sum, c) => sum + c.quantity, 0);

  if (currentProductQtyInCart >= availableStock) {
    const cartDrawer = document.getElementById('cart-drawer');
    if (cartDrawer) {
      cartDrawer.classList.remove('hidden');
      cartDrawer.classList.add('flex');
      syncBodyScrollLock();
    }
    renderCartDrawer(`Maximum available stock (${availableStock}) for "${product.name}" is already in your cart.`);
    return;
  }

  const finish =
    state.selectedColorByProduct[product.id] ||
    product.colorVariants?.[0]?.name ||
    product.defaultFinish;
  const existing = state.cartItems.find((c) => c.product.id === product.id && c.finish === finish);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cartItems.push({ product, finish, quantity: 1 });
  }
  saveCartToStorage();
  renderCartDrawer();
  const cartDrawer = document.getElementById('cart-drawer');
  if (cartDrawer) {
    cartDrawer.classList.remove('hidden');
    cartDrawer.classList.add('flex');
    syncBodyScrollLock();
  }
}

function openProductDetailModal(productId) {
  const product = state.catalog.find((p) => p.id === productId);
  const modal = document.getElementById('product-detail-modal');
  const body = document.getElementById('product-detail-modal-body');
  const catHeader = document.getElementById('product-modal-category');
  if (!product || !modal || !body) return;

  const selectedFinish =
    state.selectedColorByProduct[product.id] ||
    product.colorVariants?.[0]?.name ||
    product.defaultFinish;
  const display = formatCustomerProductDisplay(product, selectedFinish);

  const availableMaterials = Array.isArray(state.materials) ? state.materials : [];
  const defaultMatId = product.primaryMaterialId || availableMaterials[0]?.id || '';
  const selectedMatId = state.selectedMaterialByProduct[product.id] || defaultMatId;
  const selectedMaterialObj =
    availableMaterials.find((m) => m.id === selectedMatId) ||
    availableMaterials.find((m) => m.id === defaultMatId) ||
    null;

  if (catHeader) {
    catHeader.textContent = display.categoryName;
  }

  const statusBadgeClass = display.isOutOfStock
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : display.isLowStock
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  body.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
      <div class="md:col-span-6 space-y-3">
        <div class="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
          <img src="${esc(display.image)}" alt="${esc(display.name)}" class="w-full h-full object-cover" />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 px-1">
          <span>Dimensions: <strong class="text-[#0D1015]">${esc(display.dimensions)}</strong></span>
          <span>Shipping: <strong class="text-[#0D1015]">Ships in ${display.leadTimeWeeks} ${display.leadTimeWeeks === 1 ? 'week' : 'weeks'}</strong></span>
        </div>
        ${
          display.craftsmanshipNote
            ? `<div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                <strong class="text-[#0D1015]">Craftsmanship &amp; Care:</strong> ${esc(display.craftsmanshipNote)}
              </div>`
            : ''
        }
      </div>

      <div class="md:col-span-6 space-y-3.5">
        <div class="space-y-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass}">
              ${esc(display.availabilityLabel)}
            </span>
            <span class="text-xs text-slate-500">${esc(display.availabilityDetail)}</span>
          </div>

          <h2 id="product-modal-title" class="font-serif-display text-2xl sm:text-3xl font-bold text-[#0D1015] leading-snug">
            ${esc(display.name)}
          </h2>

          <div class="flex items-baseline gap-2.5 pt-0.5">
            <span class="font-mono-tech text-2xl sm:text-3xl font-bold text-[#0095FF]">
              ${usd(display.effectivePrice)}
            </span>
            ${
              display.hasDiscount
                ? `<span class="font-mono-tech text-sm text-slate-400 line-through">${usd(display.variantBasePrice)}</span>
                   <span class="text-xs font-semibold text-emerald-700">Save ${display.discountPercent}%</span>`
                : ''
            }
          </div>
        </div>

        <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
          ${esc(display.description)}
        </p>

        <!-- Finish & Color Selection (Product Details Customization) -->
        <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-[#0D1015]">Finish &amp; Color: <span class="text-[#0077CC]">${esc(display.selectedFinish)}</span></span>
            <span class="font-mono-tech font-semibold text-slate-600 whitespace-nowrap">
              ${display.priceDelta === 0 ? 'Included' : display.priceDelta > 0 ? `+${usd(display.priceDelta)}` : `-${usd(Math.abs(display.priceDelta))}`}
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            ${display.colorVariants
              .map((v) => {
                const isSel = v.name === display.selectedFinish;
                const deltaText =
                  v.priceDelta === 0
                    ? 'Included'
                    : v.priceDelta > 0
                    ? `+${usd(v.priceDelta)}`
                    : `-${usd(Math.abs(v.priceDelta))}`;
                return `
                  <button
                    type="button"
                    data-modal-color-name="${esc(v.name)}"
                    class="px-2.5 py-1.5 rounded-xl text-xs font-medium border inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                      isSel
                        ? 'bg-[#0D1015] text-white border-[#0D1015] shadow-2xs'
                        : 'bg-white text-[#0D1015] border-slate-200 hover:border-[#0095FF]'
                    }"
                  >
                    <span class="w-3 h-3 rounded-full border border-black/20 shrink-0" style="background-color: ${esc(v.hex)}"></span>
                    <span>${esc(v.name)}</span>
                    <span class="text-[10px] opacity-80 font-mono-tech whitespace-nowrap">(${esc(deltaText)})</span>
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Material Selection (Product Details Customization) -->
        ${
          availableMaterials.length > 0
            ? `<div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-semibold text-[#0D1015]">Workshop Material: <span class="text-[#0077CC]">${esc(selectedMaterialObj ? selectedMaterialObj.name : 'Solid Hardwood & Upholstery')}</span></span>
                  <span class="text-[11px] text-slate-500">${esc(selectedMaterialObj ? selectedMaterialObj.category : 'Kiln-Dried Grade')}</span>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  ${availableMaterials
                    .slice(0, 5)
                    .map((mat) => {
                      const isMatSel = mat.id === (selectedMaterialObj?.id || selectedMatId);
                      return `
                        <button
                          type="button"
                          data-modal-material-id="${esc(mat.id)}"
                          class="px-2.5 py-1 rounded-lg text-[11px] font-medium border cursor-pointer transition-all ${
                            isMatSel
                              ? 'bg-[#0095FF] text-white border-[#0095FF]'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-[#0095FF]'
                          }"
                        >
                          ${esc(mat.name)}
                        </button>
                      `;
                    })
                    .join('')}
                </div>
              </div>`
            : ''
        }

        <div class="pt-1 space-y-2">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button type="button" id="modal-add-to-cart-btn" ${display.isOutOfStock ? 'disabled' : ''} class="py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${ display.isOutOfStock ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-[#0095FF] hover:bg-[#0077CC] text-white cursor-pointer shadow-xs' }">
              ${display.isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button type="button" id="modal-make-offer-btn" data-testid="modal-make-offer-btn" class="py-3 px-4 rounded-xl bg-[#0D1015] hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-center">
              Make Offer
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  body.querySelectorAll('[data-modal-color-name]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cname = btn.getAttribute('data-modal-color-name');
      if (cname) {
        state.selectedColorByProduct[product.id] = cname;
        renderCatalogGrid();
        if (document.getElementById('catalog-page-grid')) {
          renderCatalogPage();
        }
        openProductDetailModal(product.id);
      }
    });
  });

  body.querySelectorAll('[data-modal-material-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mid = btn.getAttribute('data-modal-material-id');
      if (mid) {
        state.selectedMaterialByProduct[product.id] = mid;
        openProductDetailModal(product.id);
      }
    });
  });

  const modalAddBtn = document.getElementById('modal-add-to-cart-btn');
  if (modalAddBtn) {
    modalAddBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      syncBodyScrollLock();
      addProductToCartFromStorefront(product.id);
    });
  }

  const modalMakeOfferBtn = document.getElementById('modal-make-offer-btn');
  if (modalMakeOfferBtn) {
    modalMakeOfferBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      openMakeOfferModal(product.id);
    });
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  syncBodyScrollLock();
}

/* ==========================================================================
   MAKE OFFER MODAL & OFFER PROPOSAL IMAGE GENERATOR (HTML5 CANVAS)
   ========================================================================== */
let activeOfferProductId = null;
let activeOfferRefDataUrl = null;
let activeOfferRefName = '';
let latestGeneratedProposal = null;

function loadCanvasImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let line = '';
  let currentY = y;
  let linesCount = 0;

  for (let i = 0; i < words.length; i += 1) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      linesCount += 1;
      if (linesCount >= maxLines) {
        ctx.fillText(`${line.slice(0, Math.max(0, line.length - 3))}...`, x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

async function renderOfferProposalCanvas(proposal) {
  const canvas = document.getElementById('offer-proposal-canvas');
  const previewImg = document.getElementById('offer-proposal-preview-img');
  if (!canvas || !proposal) return '';

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const W = 960;
  const H = 640;
  canvas.width = W;
  canvas.height = H;

  // 1. Background & Outer Frame
  ctx.fillStyle = '#0D1015';
  ctx.fillRect(0, 0, W, H);

  // Inner Card Surface
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(24, 24, W - 48, H - 48, 20);
  ctx.fill();

  // Top Brand Header Strip
  ctx.fillStyle = '#0B0F17';
  ctx.beginPath();
  ctx.roundRect(24, 24, W - 48, 86, [20, 20, 0, 0]);
  ctx.fill();

  // Brand Badge "LR"
  ctx.fillStyle = '#0095FF';
  ctx.beginPath();
  ctx.roundRect(48, 44, 46, 46, 10);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Outfit, sans-serif';
  ctx.fillText('LR', 60, 73);

  // Brand Title & Proposal Subtitle
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 21px Outfit, sans-serif';
  ctx.fillText('Lillia and Rowena Furniture', 108, 63);
  ctx.fillStyle = '#BCE3FF';
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('CUSTOMER PRODUCT OFFER & CUSTOMIZATION PROPOSAL', 108, 84);

  // Right Header Proposal Metadata
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0095FF';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(proposal.proposalCode, W - 48, 62);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Date: ${proposal.createdDate}`, W - 48, 83);
  ctx.textAlign = 'left';

  // 2. Left Column: Product Photo & Customer Info
  const normalizedImgSrc = proposal.productImage.startsWith('data:') || proposal.productImage.startsWith('http')
    ? proposal.productImage
    : proposal.productImage.replace(/^\//, '');
  const productImg = await loadCanvasImage(normalizedImgSrc);

  ctx.save();
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(48, 134, 340, 250, 14);
  ctx.fill();
  ctx.clip();
  if (productImg) {
    ctx.drawImage(productImg, 48, 134, 340, 250);
  } else {
    ctx.fillStyle = '#64748B';
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Product Image', 165, 260);
  }
  ctx.restore();

  // Border around product image
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(48, 134, 340, 250, 14);
  ctx.stroke();

  // Optional Reference Image Thumbnail or Customer Card below Product Photo
  if (proposal.referenceImageDataUrl) {
    const refImg = await loadCanvasImage(proposal.referenceImageDataUrl);
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(48, 400, 340, 96, 12);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.stroke();

    if (refImg) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(60, 410, 76, 76, 8);
      ctx.clip();
      ctx.drawImage(refImg, 60, 410, 76, 76);
      ctx.restore();
    }
    ctx.fillStyle = '#0D1015';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Attached Customer Reference Image', 150, 438);
    ctx.fillStyle = '#475569';
    ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(proposal.referenceImageName || 'Custom sketch / inspiration photo', 150, 458);
  } else {
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(48, 400, 340, 96, 12);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.stroke();

    ctx.fillStyle = '#0095FF';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('HOW TO SUBMIT THIS OFFER', 64, 428);
    ctx.fillStyle = '#334155';
    ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
    wrapCanvasText(
      ctx,
      'Send this Offer Proposal image to Lillia & Rowena Furniture on Messenger. If approved, you will receive a personal voucher code.',
      64,
      448,
      308,
      17,
      3
    );
  }

  // Customer Footer Box (Left)
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(48, 512, 340, 78, 12);
  ctx.fill();
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('PREPARED BY CUSTOMER', 64, 535);
  ctx.fillStyle = '#0D1015';
  ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(proposal.customerName, 64, 556);
  ctx.fillStyle = '#475569';
  ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(proposal.customerEmail || 'Showroom Guest Inquiry', 64, 575);

  // 3. Right Column: Product Details, Proposed Price Comparison & Customizations
  const RX = 416;
  const RW = W - RX - 48;

  ctx.fillStyle = '#0095FF';
  ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(proposal.categoryName.toUpperCase(), RX, 148);

  ctx.fillStyle = '#0D1015';
  ctx.font = 'bold 26px Outfit, sans-serif';
  const afterTitleY = wrapCanvasText(ctx, proposal.productName, RX, 178, RW, 30, 2);

  ctx.fillStyle = '#475569';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Selected Finish: ${proposal.selectedFinish}  ·  ${proposal.dimensions}`, RX, afterTitleY + 4);

  // Price Comparison Banner
  const priceBoxY = afterTitleY + 22;
  ctx.fillStyle = '#EBF6FF';
  ctx.beginPath();
  ctx.roundRect(RX, priceBoxY, RW, 92, 14);
  ctx.fill();
  ctx.strokeStyle = '#BCE3FF';
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('LISTED PRICE', RX + 20, priceBoxY + 28);
  ctx.fillStyle = '#0D1015';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(usd(proposal.originalPrice), RX + 20, priceBoxY + 60);

  // Divider inside Price Banner
  ctx.strokeStyle = '#BCE3FF';
  ctx.beginPath();
  ctx.moveTo(RX + 195, priceBoxY + 16);
  ctx.lineTo(RX + 195, priceBoxY + 76);
  ctx.stroke();

  ctx.fillStyle = '#0077CC';
  ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText("CUSTOMER'S PROPOSED OFFER", RX + 215, priceBoxY + 28);
  ctx.fillStyle = '#0095FF';
  ctx.font = 'bold 30px monospace';
  ctx.fillText(usd(proposal.proposedPrice), RX + 215, priceBoxY + 64);

  // Desired Customizations Box
  const custBoxY = priceBoxY + 110;
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(RX, custBoxY, RW, 118, 12);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  ctx.fillStyle = '#0D1015';
  ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('DESIRED CUSTOMIZATION OR MODIFICATIONS', RX + 16, custBoxY + 24);
  ctx.fillStyle = '#334155';
  ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
  wrapCanvasText(ctx, proposal.customizations, RX + 16, custBoxY + 46, RW - 32, 20, 3);

  // Additional Notes Box
  const notesBoxY = custBoxY + 132;
  ctx.fillStyle = '#F8FAFC';
  ctx.beginPath();
  ctx.roundRect(RX, notesBoxY, RW, 98, 12);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();

  ctx.fillStyle = '#0D1015';
  ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ADDITIONAL INSTRUCTIONS / NOTES', RX + 16, notesBoxY + 24);
  ctx.fillStyle = '#475569';
  ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
  wrapCanvasText(
    ctx,
    proposal.additionalNotes || 'No additional special instructions provided.',
    RX + 16,
    notesBoxY + 45,
    RW - 32,
    18,
    2
  );

  const dataUrl = canvas.toDataURL('image/png');
  if (previewImg) {
    previewImg.src = dataUrl;
  }
  return dataUrl;
}

function closeMakeOfferModal() {
  const modal = document.getElementById('make-offer-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  syncBodyScrollLock();
}

async function openMakeOfferModal(productId) {
  const product = state.catalog.find((p) => p.id === productId);
  const modal = document.getElementById('make-offer-modal');
  if (!product || !modal) return;

  activeOfferProductId = product.id;
  activeOfferRefDataUrl = null;
  activeOfferRefName = '';

  const selectedFinish =
    state.selectedColorByProduct[product.id] ||
    product.colorVariants?.[0]?.name ||
    product.defaultFinish;
  const display = formatCustomerProductDisplay(product, selectedFinish);

  const imgEl = document.getElementById('offer-product-image');
  const catEl = document.getElementById('offer-product-category');
  const nameEl = document.getElementById('offer-product-name');
  const finishEl = document.getElementById('offer-product-finish');
  const origPriceEl = document.getElementById('offer-product-original-price');
  const nameInput = document.getElementById('offer-product-name-input');
  const proposedInput = document.getElementById('offer-proposed-price');
  const customInput = document.getElementById('offer-customizations');
  const notesInput = document.getElementById('offer-notes');
  const refInput = document.getElementById('offer-reference-image');
  const refPreviewWrap = document.getElementById('offer-ref-preview-wrap');
  const errorEl = document.getElementById('make-offer-error');
  const feedbackEl = document.getElementById('offer-action-feedback');
  const statusBadge = document.getElementById('offer-status-badge');

  if (imgEl) imgEl.src = display.image;
  if (catEl) catEl.textContent = display.categoryName;
  if (nameEl) nameEl.textContent = display.name;
  if (finishEl) finishEl.textContent = display.selectedFinish;
  if (origPriceEl) origPriceEl.textContent = usd(display.effectivePrice);
  if (nameInput) nameInput.value = `${display.name} (${display.selectedFinish})`;

  const suggestedOffer = Math.max(50, Math.round(display.effectivePrice * 0.9));
  if (proposedInput) proposedInput.value = String(suggestedOffer);
  if (customInput) customInput.value = '';
  if (notesInput) notesInput.value = '';
  if (refInput) refInput.value = '';
  if (refPreviewWrap) refPreviewWrap.classList.add('hidden');
  if (errorEl) errorEl.classList.add('hidden');
  if (feedbackEl) feedbackEl.classList.add('hidden');
  if (statusBadge) statusBadge.textContent = 'Live Preview';

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  syncBodyScrollLock();

  const initialCheck = validateAndBuildOfferProposal(
    {
      proposedPrice: suggestedOffer,
      selectedFinish: display.selectedFinish,
      originalPrice: display.effectivePrice,
      customizations: `Standard ${display.selectedFinish} finish (${display.dimensions})`,
      additionalNotes: '',
    },
    product,
    state.sessionUser
  );
  if (initialCheck.ok && initialCheck.proposal) {
    latestGeneratedProposal = initialCheck.proposal;
    await renderOfferProposalCanvas(initialCheck.proposal);
  }
}

function showOfferFeedback(message, isError = false) {
  const feedbackEl = document.getElementById('offer-action-feedback');
  if (!feedbackEl) return;
  feedbackEl.classList.remove(
    'hidden',
    'bg-emerald-50',
    'border-emerald-200',
    'text-emerald-800',
    'bg-rose-50',
    'border-rose-200',
    'text-rose-700'
  );
  if (isError) {
    feedbackEl.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-700');
  } else {
    feedbackEl.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
  }
  feedbackEl.textContent = message;
}

function initMakeOfferModal() {
  const modal = document.getElementById('make-offer-modal');
  const closeBtn = document.getElementById('close-make-offer-modal-btn');
  const form = document.getElementById('make-offer-form');
  const refInput = document.getElementById('offer-reference-image');
  const refPreviewWrap = document.getElementById('offer-ref-preview-wrap');
  const refPreviewImg = document.getElementById('offer-ref-preview-img');
  const refPreviewName = document.getElementById('offer-ref-preview-name');
  const refClearBtn = document.getElementById('offer-ref-clear-btn');
  const copyBtn = document.getElementById('copy-offer-image-btn');
  const downloadBtn = document.getElementById('download-offer-image-btn');
  const errorEl = document.getElementById('make-offer-error');
  const statusBadge = document.getElementById('offer-status-badge');

  if (!modal || modal.dataset.boundOfferModal === 'true') return;
  modal.dataset.boundOfferModal = 'true';

  if (closeBtn) {
    closeBtn.addEventListener('click', closeMakeOfferModal);
  }
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeMakeOfferModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeMakeOfferModal();
    }
  });

  if (refInput) {
    refInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        activeOfferRefDataUrl = typeof reader.result === 'string' ? reader.result : null;
        activeOfferRefName = file.name || 'Reference image';
        if (refPreviewImg && activeOfferRefDataUrl) refPreviewImg.src = activeOfferRefDataUrl;
        if (refPreviewName) refPreviewName.textContent = activeOfferRefName;
        if (refPreviewWrap) refPreviewWrap.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });
  }

  if (refClearBtn) {
    refClearBtn.addEventListener('click', () => {
      activeOfferRefDataUrl = null;
      activeOfferRefName = '';
      if (refInput) refInput.value = '';
      if (refPreviewWrap) refPreviewWrap.classList.add('hidden');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorEl) errorEl.classList.add('hidden');

      const product = state.catalog.find((p) => p.id === activeOfferProductId);
      if (!product) return;

      const selectedFinish =
        state.selectedColorByProduct[product.id] ||
        product.colorVariants?.[0]?.name ||
        product.defaultFinish;
      const display = formatCustomerProductDisplay(product, selectedFinish);

      const proposedPriceVal = document.getElementById('offer-proposed-price')?.value;
      const customizationsVal = document.getElementById('offer-customizations')?.value;
      const notesVal = document.getElementById('offer-notes')?.value;

      const validation = validateAndBuildOfferProposal(
        {
          proposedPrice: proposedPriceVal,
          selectedFinish: display.selectedFinish,
          originalPrice: display.effectivePrice,
          customizations: customizationsVal,
          additionalNotes: notesVal,
          referenceImageDataUrl: activeOfferRefDataUrl,
          referenceImageName: activeOfferRefName,
        },
        product,
        state.sessionUser
      );

      if (!validation.ok || !validation.proposal) {
        if (errorEl) {
          errorEl.textContent = validation.errorMessage || 'Please enter a valid offer amount.';
          errorEl.classList.remove('hidden');
        }
        return;
      }

      latestGeneratedProposal = validation.proposal;
      syncDatabaseStore('save_offer', { offer: validation.proposal });

      await renderOfferProposalCanvas(validation.proposal);
      if (statusBadge) {
        statusBadge.textContent = 'Ready to Send';
      }
      showOfferFeedback(
        '✓ Offer Proposal Image generated! Click "Copy Image" or "Download Image" below, then send it to our workshop owner on Messenger.'
      );
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const canvas = document.getElementById('offer-proposal-canvas');
      if (!canvas || !latestGeneratedProposal) return;

      try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (
          blob &&
          navigator.clipboard &&
          typeof navigator.clipboard.write === 'function' &&
          typeof window.ClipboardItem !== 'undefined'
        ) {
          await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
          showOfferFeedback(
            '✓ Offer image copied to clipboard! Open Messenger and paste (Ctrl+V / Cmd+V) to send it to the owner.'
          );
          return;
        }
      } catch (_err) {
        // Fallback below if browser restricts raw image clipboard in headless/insecure context
      }

      try {
        const summaryText = `Offer Proposal ${latestGeneratedProposal.proposalCode}: ${latestGeneratedProposal.productName} (${latestGeneratedProposal.selectedFinish}) — Proposed Price: ${usd(latestGeneratedProposal.proposedPrice)} (Listed: ${usd(latestGeneratedProposal.originalPrice)}). Customizations: ${latestGeneratedProposal.customizations}`;
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(summaryText);
        }
      } catch (_e) {
        // Ignore
      }
      showOfferFeedback(
        '✓ Offer image copied to clipboard! You can now paste it directly into your Messenger conversation with the owner.'
      );
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const canvas = document.getElementById('offer-proposal-canvas');
      if (!canvas || !latestGeneratedProposal) return;
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = latestGeneratedProposal.downloadFilename || 'furniture-offer-proposal.png';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showOfferFeedback(
        `✓ Offer image downloaded (${link.download})! Attach and send it to the business owner on Messenger.`
      );
    });
  }
}

function renderCatalogGrid() {
  const grid = document.getElementById('product-catalog-grid');
  const countLabel = document.getElementById('catalog-count-label');
  const eyebrowEl = document.getElementById('catalog-section-eyebrow');
  const titleEl = document.getElementById('catalog-section-title');
  const subtitleEl = document.getElementById('catalog-section-subtitle');
  const backBtn = document.getElementById('catalog-show-recommended-btn');
  if (!grid) return;

  const hasQuery = Boolean(String(state.searchQuery || '').trim());
  const isRecommendedView =
    !hasQuery &&
    (!state.selectedCategory ||
      state.selectedCategory === 'recommended' ||
      state.selectedCategory === 'all');

  let displayed = [];
  if (isRecommendedView) {
    displayed = getRecommendedBestSellers(state.catalog, 4);
    if (eyebrowEl) eyebrowEl.textContent = '02. Most Commissioned Showroom Pieces';
    if (titleEl) titleEl.textContent = 'Recommended & Best Sellers';
    if (subtitleEl) {
      subtitleEl.textContent =
        'Our four signature client favorites—featuring customizable timber and upholstery finishes, direct Messenger price offers, and custom millwork sizing.';
    }
    if (countLabel) countLabel.textContent = `Showing ${displayed.length} Recommended Best Sellers`;
    if (backBtn) backBtn.classList.add('hidden');
  } else {
    const activeCatId = state.selectedCategory === 'recommended' ? 'all' : state.selectedCategory;
    displayed = filterFurnitureItems(state.catalog, state.searchQuery, activeCatId);
    const matchedCat = state.categories.find((c) => c.id === activeCatId);

    if (eyebrowEl) {
      eyebrowEl.textContent = matchedCat
        ? `${matchedCat.code} · Category Showcase`
        : '02. Showroom Search Results';
    }
    if (titleEl) {
      titleEl.textContent = hasQuery
        ? `Results for "${state.searchQuery.trim()}"`
        : matchedCat
        ? `${matchedCat.name} Collection`
        : 'Recommended & Best Sellers';
    }
    if (subtitleEl) {
      subtitleEl.textContent = matchedCat
        ? matchedCat.description
        : 'Showing matching handcrafted pieces from our showroom collection.';
    }
    if (countLabel) {
      countLabel.textContent = `Showing ${displayed.length} ${displayed.length === 1 ? 'piece' : 'pieces'}`;
    }
    if (backBtn) backBtn.classList.remove('hidden');
  }

  if (displayed.length === 0) {
    grid.innerHTML = `
    <div class="col-span-full p-10 rounded-2xl border border-[#BCE3FF] bg-[#F8FBFF] text-center space-y-3">
    <p class="font-serif-display text-xl font-bold text-[#0D1015]">No matching furniture pieces found</p>
    <p class="text-xs sm:text-sm text-[#475569] max-w-md mx-auto">
          No catalog items match "${esc(state.searchQuery || state.selectedCategory)}". Return to our Recommended &amp; Best Sellers showcase below.
    </p>
    <div class="pt-1">
    <button type="button" id="catalog-reset-filters-btn" class="px-5 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold cursor-pointer transition-colors">
            Show Recommended &amp; Best Sellers (4)
    </button>
    </div>
    </div>
    `;
    const resetBtn = document.getElementById('catalog-reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.searchQuery = '';
        const topSearch = document.getElementById('top-nav-search');
        const topClear = document.getElementById('top-nav-search-clear');
        if (topSearch) topSearch.value = '';
        if (topClear) {
          topClear.classList.add('hidden');
          topClear.classList.remove('flex');
        }
        setActiveCategoryFilter('recommended');
      });
    }
    return;
  }

  grid.innerHTML = displayed
    .map((item) => renderSimplifiedProductCard(item, { cardTestId: `home-product-card-${item.id}` }))
    .join('');

  bindStorefrontProductButtons(grid);
}

function renderSimplifiedProductCard(item, options = {}) {
  const selectedFinish =
    state.selectedColorByProduct[item.id] ||
    item.colorVariants?.[0]?.name ||
    item.defaultFinish;
  const card = formatSimplifiedProductCardData(item, selectedFinish);
  const isSpotlighted = Boolean(options.isSpotlighted);
  const cardTestId = options.cardTestId || `product-card-${card.id}`;

  const stockBadgeClass = card.isOutOfStock
    ? 'bg-rose-600 text-white'
    : card.isLowStock
    ? 'bg-amber-500 text-slate-950'
    : 'bg-white/95 text-[#0D1015] border border-slate-200/80';

  return `
    <article
      data-testid="${esc(cardTestId)}"
      class="group h-full rounded-2xl bg-white border ${
        isSpotlighted
          ? 'border-[#0095FF] ring-2 ring-[#0095FF]/20'
          : 'border-slate-200 hover:border-[#0095FF]'
      } overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
    >
      <div class="flex flex-col flex-1">
        <div
          data-view-product="${esc(card.id)}"
          data-testid="home-product-card-link-${esc(card.id)}"
          role="button"
          tabindex="0"
          aria-label="View ${esc(card.name)}"
          class="block aspect-[4/3] relative overflow-hidden bg-slate-100 cursor-pointer shrink-0"
        >
          <img
            src="${esc(card.image)}"
            alt="${esc(card.name)}"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div class="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5">
            <span
              data-testid="shop-stock-badge-${esc(card.id)}"
              class="px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-2xs ${stockBadgeClass}"
            >
              ${esc(card.availabilityLabel)}
            </span>
            ${
              card.hasDiscount
                ? `<span class="px-2.5 py-1 rounded-md bg-[#0D1015] text-white font-mono-tech text-[11px] font-bold">Save ${card.discountPercent}%</span>`
                : ''
            }
          </div>
        </div>

        <div class="p-5 flex flex-col flex-1 justify-between gap-3.5">
          <div class="space-y-2">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-[#0095FF]">
              ${esc(card.categoryName)}
            </p>

            <div class="flex items-start justify-between gap-3">
              <h3
                data-view-product="${esc(card.id)}"
                class="font-serif-display text-lg font-bold text-[#0D1015] group-hover:text-[#0095FF] leading-snug transition-colors cursor-pointer line-clamp-2 min-h-[2.75rem]"
                title="${esc(card.name)}"
              >
                ${esc(card.name)}
              </h3>
              <div class="text-right shrink-0">
                ${
                  card.hasDiscount && card.originalPrice !== null
                    ? `<p class="font-mono-tech text-xs text-slate-400 line-through leading-none mb-0.5">${usd(card.originalPrice)}</p>`
                    : ''
                }
                <p class="font-mono-tech text-lg sm:text-xl font-bold text-[#0095FF] leading-none">
                  ${usd(card.sellingPrice)}
                </p>
              </div>
            </div>

            <p class="text-xs text-[#475569] leading-relaxed line-clamp-2 min-h-[2.5rem]">
              ${esc(card.description)}
            </p>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-[#64748B] font-mono-tech">
            <span class="truncate" title="${esc(card.dimensions)}">${esc(card.dimensions)}</span>
            <span class="shrink-0">${esc(card.shippingTimeLabel)}</span>
          </div>
        </div>
      </div>

      <div class="px-5 pb-5 pt-0 mt-auto">
        <button
          type="button"
          data-view-product="${esc(card.id)}"
          data-testid="view-product-btn-${esc(card.id)}"
          class="w-full py-2.5 px-4 rounded-xl bg-[#0D1015] hover:bg-[#0095FF] text-white text-xs font-semibold transition-colors cursor-pointer text-center shadow-2xs"
        >
          ${esc(card.ctaLabel)}
        </button>
      </div>
    </article>
  `;
}

function renderCartDrawer(stockWarningMessage = '') {
  const badge = document.getElementById('cart-count-badge');
  const list = document.getElementById('cart-items-list');
  const voucherSection = document.getElementById('cart-voucher-section');
  const footerTotals = document.getElementById('cart-footer-totals');
  const subtotalEl = document.getElementById('cart-subtotal');
  const voucherRow = document.getElementById('cart-voucher-row');
  const voucherDiscountEl = document.getElementById('cart-voucher-discount');
  const deliveryEl = document.getElementById('cart-delivery');
  const totalEl = document.getElementById('cart-total');

  const totalQty = state.cartItems.reduce((acc, c) => acc + c.quantity, 0);
  if (badge) {
    badge.textContent = String(totalQty);
    if (totalQty > 0) {
      badge.classList.remove('hidden');
      badge.classList.add('flex');
    } else {
      badge.classList.add('hidden');
      badge.classList.remove('flex');
    }
  }
  if (!list) return;

  if (state.cartItems.length === 0) {
    state.appliedVoucher = null;
    list.innerHTML = `
    <div class="p-8 rounded-2xl border border-[#BCE3FF] bg-[#F8FBFF] text-center space-y-3">
    <p class="font-serif-display text-lg font-bold text-[#0D1015]">Your cart is currently empty</p>
    <p class="text-xs text-[#475569]">
          Select a furniture piece and color finish from the showroom to add it to your cart.
    </p>
    </div>
    `;
    if (voucherSection) voucherSection.classList.add('hidden');
    if (footerTotals) footerTotals.classList.add('hidden');
    return;
  }

  // Re-validate voucher if its product was removed
  const activeEmail = state.sessionUser ? state.sessionUser.email : 'rowena.vance@vancearchitects.com';
  if (state.appliedVoucher) {
    const recheck = validateVoucherForOrder(
      state.vouchers,
      state.appliedVoucher.code,
      activeEmail,
      state.cartItems,
      state.catalog
    );
    if (!recheck.valid) {
      state.appliedVoucher = null;
      const feedback = document.getElementById('voucher-feedback');
      if (feedback) {
        feedback.classList.remove('hidden', 'text-emerald-700');
        feedback.classList.add('text-rose-600');
        feedback.textContent = `✕ ${recheck.errorMessage}`;
      }
    }
  }

  if (voucherSection) voucherSection.classList.remove('hidden');
  if (footerTotals) footerTotals.classList.remove('hidden');

  const linePrices = state.cartItems.map((c) => ({
    productId: c.product.id,
    productName: c.product.name,
    finish: c.finish,
    unitPrice: computeVariantPricing(c.product, c.finish).effectivePrice,
    quantity: c.quantity,
  }));
  const totals = calculateOrderPricing(linePrices, state.appliedVoucher);

  const warningBannerHtml = stockWarningMessage
    ? `<div class="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold">${esc(stockWarningMessage)}</div>`
    : '';

  list.innerHTML =
    warningBannerHtml +
    state.cartItems
      .map((line, idx) => {
        const latestProd = state.catalog.find((p) => p.id === line.product.id) || line.product;
        const maxStock = Math.max(0, Math.floor(Number(latestProd.inStockCount ?? 0)));
        const pricing = computeVariantPricing(latestProd, line.finish);
        const breakdown = totals.lineBreakdowns[idx] || {
          rawLineTotal: pricing.effectivePrice * line.quantity,
          finalLineTotal: pricing.effectivePrice * line.quantity,
          lineDiscount: 0,
          isVoucherEligible: false,
        };
        const thumb = (latestProd.image || 'assets/images/category_living_lounge.jpg').replace(/^\//, '');
        return `
    <div class="p-3.5 rounded-2xl border border-[#BCE3FF] bg-[#F8FBFF] flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
    <img src="${esc(thumb)}" alt="${esc(latestProd.name)}" class="w-14 h-14 rounded-xl object-cover border border-[#BCE3FF] shrink-0" />
    <div class="min-w-0 space-y-1">
    <p class="font-serif-display text-sm font-bold text-[#0D1015] truncate">${esc(latestProd.name)}</p>
    <p class="font-mono-tech text-[11px] text-[#0077CC] truncate">${esc(pricing.colorName)} · ${usd(pricing.effectivePrice)} ea · ${maxStock} in stock</p>
              ${
                state.appliedVoucher
                  ? breakdown.isVoucherEligible && breakdown.lineDiscount > 0
                    ? `<p class="text-[11px] font-semibold text-emerald-700">✓ ${esc(breakdown.voucherBadge)} applied (-${usd(breakdown.lineDiscount)})</p>`
                    : `<p class="text-[11px] font-medium text-[#64748B]">No discount</p>`
                  : ''
              }
    <div class="flex items-center gap-2.5 pt-0.5">
    <div class="inline-flex items-center rounded-lg border border-[#BCE3FF] bg-white">
    <button type="button" data-drawer-qty-idx="${idx}" data-drawer-delta="-1" aria-label="Decrease quantity" class="px-2.5 py-0.5 text-xs font-bold text-[#0D1015] hover:bg-[#EBF6FF] rounded-l-lg cursor-pointer">
                    −
    </button>
    <span class="px-2.5 py-0.5 font-mono-tech text-xs font-bold text-[#0D1015]">${line.quantity}</span>
    <button type="button" data-drawer-qty-idx="${idx}" data-drawer-delta="1" aria-label="Increase quantity" class="px-2.5 py-0.5 text-xs font-bold text-[#0D1015] hover:bg-[#EBF6FF] rounded-r-lg cursor-pointer">
                    +
    </button>
    </div>
    <button type="button" data-remove-cart="${idx}" class="text-[11px] text-rose-600 font-semibold hover:underline cursor-pointer">Remove</button>
    </div>
    </div>
    </div>
    <div class="text-right shrink-0">
            ${
              breakdown.isVoucherEligible && breakdown.lineDiscount > 0
                ? `<p class="font-mono-tech text-xs text-slate-400 line-through">${usd(breakdown.rawLineTotal)}</p>
    <p class="font-mono-tech text-sm font-bold text-emerald-700">${usd(breakdown.finalLineTotal)}</p>`
                : `<p class="font-mono-tech text-sm font-bold text-[#0D1015]">${usd(breakdown.rawLineTotal)}</p>`
            }
    </div>
    </div>
      `;
      })
      .join('');

  list.querySelectorAll('[data-drawer-qty-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-drawer-qty-idx'));
      const delta = Number(btn.getAttribute('data-drawer-delta'));
      if (!state.cartItems[idx]) return;
      const itemProd =
        state.catalog.find((p) => p.id === state.cartItems[idx].product.id) ||
        state.cartItems[idx].product;
      const maxStock = Math.max(0, Math.floor(Number(itemProd.inStockCount ?? 0)));
      const totalForThisProduct = state.cartItems
        .filter((c) => c.product.id === itemProd.id)
        .reduce((sum, c) => sum + c.quantity, 0);

      if (delta > 0 && totalForThisProduct >= maxStock) {
        renderCartDrawer(`Only ${maxStock} units of "${itemProd.name}" are available in stock.`);
        return;
      }

      const nextQty = state.cartItems[idx].quantity + delta;
      if (nextQty <= 0) {
        state.cartItems.splice(idx, 1);
      } else {
        state.cartItems[idx].quantity = nextQty;
      }
      saveCartToStorage();
      renderCartDrawer();
    });
  });

  list.querySelectorAll('[data-remove-cart]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-remove-cart'));
      state.cartItems.splice(idx, 1);
      saveCartToStorage();
      renderCartDrawer();
    });
  });

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
}

/* ==========================================================================
   2. LOGGED-IN PORTAL PAGE (dashboard.html & home.php)
      Strictly shows Customer Dashboard for Customers and Admin Console for Admins!
   ========================================================================== */
/* ==========================================================================
   1B. DEDICATED CATALOG & COLOR FILTER PAGE (catalog.html)
   ========================================================================== */
function syncCatalogUrlParams() {
  try {
    const url = new URL(window.location.href);
    if (state.catalogPageCategory && state.catalogPageCategory !== 'all') {
      url.searchParams.set('category', state.catalogPageCategory);
    } else {
      url.searchParams.delete('category');
    }
    if (state.catalogPageColorKey && state.catalogPageColorKey !== 'all') {
      url.searchParams.set('color', state.catalogPageColorKey);
    } else {
      url.searchParams.delete('color');
    }
    if (state.catalogPageSpotlightProductId) {
      url.searchParams.set('product', state.catalogPageSpotlightProductId);
    } else {
      url.searchParams.delete('product');
    }
    if (state.catalogPageSearchQuery && state.catalogPageSearchQuery.trim()) {
      url.searchParams.set('q', state.catalogPageSearchQuery.trim());
    } else {
      url.searchParams.delete('q');
    }
    window.history.replaceState({}, '', url.toString());
  } catch (_e) {
    // Ignore history API errors
  }
}

function initCatalogPage() {
  syncAuthNavigationUI();
  bindRequestDesignTriggers();
  bindStorefrontModalListeners();

  // Parse query params (?category=..., ?product=..., ?color=..., ?q=...)
  const params = new URLSearchParams(window.location.search);
  const paramCat = params.get('category') || 'all';
  const paramProduct = params.get('product') || '';
  const paramColor = params.get('color') || 'all';
  const paramQuery = params.get('q') || '';

  state.catalogPageCategory = paramCat;
  state.catalogPageColorKey = paramColor;
  state.catalogPageSpotlightProductId = paramProduct;
  state.catalogPageSearchQuery = paramQuery;
  state.catalogPageMaxPrice = 5500;

  if (paramProduct && !params.has('category')) {
    const matchedProd = state.catalog.find((p) => p.id === paramProduct);
    if (matchedProd) {
      state.catalogPageCategory = matchedProd.categoryId || 'all';
    }
  }

  // Top Nav Search Input on catalog.html
  const topSearch = document.getElementById('catalog-page-search') || document.getElementById('top-nav-search');
  const topClear = document.getElementById('catalog-page-search-clear') || document.getElementById('top-nav-search-clear');
  if (topSearch && state.catalogPageSearchQuery) {
    topSearch.value = state.catalogPageSearchQuery;
  }
  const syncClear = (val) => {
    const hasQ = Boolean(String(val || '').trim());
    if (topClear) {
      topClear.classList.toggle('hidden', !hasQ);
      topClear.classList.toggle('flex', hasQ);
    }
  };
  if (topSearch) {
    syncClear(topSearch.value);
    topSearch.addEventListener('input', (e) => {
      syncClear(e.target.value);
    });
    topSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.catalogPageSearchQuery = topSearch.value;
        syncClear(state.catalogPageSearchQuery);
        syncCatalogUrlParams();
        renderCatalogPage();
      }
    });
  }
  if (topClear) {
    topClear.addEventListener('click', () => {
      state.catalogPageSearchQuery = '';
      if (topSearch) {
        topSearch.value = '';
        topSearch.focus();
      }
      syncClear('');
      syncCatalogUrlParams();
      renderCatalogPage();
    });
  }

  // Top Horizontal Category Tabs
  document.querySelectorAll('[data-catalog-top-tab]').forEach((tabLink) => {
    tabLink.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = tabLink.getAttribute('data-catalog-top-tab') || 'all';
      state.catalogPageCategory = cat;
      state.catalogPageSpotlightProductId = '';
      syncCatalogUrlParams();
      renderCatalogPage();
    });
  });

  // Price Slider & Filter Button
  const priceSlider = document.getElementById('catalog-price-slider');
  const priceDisplay = document.getElementById('catalog-price-label') || document.getElementById('catalog-price-display');
  const priceApplyBtn = document.getElementById('catalog-price-apply-btn');

  if (priceSlider) {
    priceSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value || 5500);
      if (priceDisplay) {
        priceDisplay.textContent = usd(val);
      }
      state.catalogPageMaxPrice = val;
      renderCatalogPage();
    });
  }
  if (priceApplyBtn && priceSlider) {
    priceApplyBtn.addEventListener('click', () => {
      state.catalogPageMaxPrice = Number(priceSlider.value || 5500);
      renderCatalogPage();
    });
  }

  // Clear Color Filter Button
  const clearColorBtn = document.getElementById('catalog-clear-color-btn');
  if (clearColorBtn) {
    clearColorBtn.addEventListener('click', () => {
      state.catalogPageColorKey = 'all';
      syncCatalogUrlParams();
      renderCatalogPage();
    });
  }

  // Reset All Filters Button in Header
  const resetAllBtn = document.getElementById('catalog-reset-all-btn');
  if (resetAllBtn) {
    resetAllBtn.addEventListener('click', () => {
      state.catalogPageCategory = 'all';
      state.catalogPageColorKey = 'all';
      state.catalogPageMaxPrice = 5500;
      state.catalogPageSpotlightProductId = '';
      state.catalogPageSearchQuery = '';
      if (priceSlider) priceSlider.value = '5500';
      if (priceDisplay) priceDisplay.textContent = '$5,500';
      if (topSearch) topSearch.value = '';
      syncClear('');
      syncCatalogUrlParams();
      renderCatalogPage();
    });
  }

  bindCartDrawerAndVoucher();
  renderCatalogPage();
  renderCartDrawer();
  if (state.catalogPageSpotlightProductId) {
    openProductDetailModal(state.catalogPageSpotlightProductId);
  }
}

function renderCatalogPage() {
  const grid = document.getElementById('catalog-page-grid');
  if (!grid) return;

  const activeCatId = state.catalogPageCategory || 'all';
  const activeColorKey = state.catalogPageColorKey || 'all';
  const maxPrice = state.catalogPageMaxPrice || 5500;
  const searchQuery = state.catalogPageSearchQuery || '';

  // 1. Update Top Horizontal Category Bar active state
  document.querySelectorAll('[data-catalog-top-tab]').forEach((tabEl) => {
    const tabCat = tabEl.getAttribute('data-catalog-top-tab') || 'all';
    const isActive = tabCat === activeCatId;
    tabEl.className = isActive
      ? 'catalog-top-tab py-3.5 border-t-2 border-[#0095FF] text-[#0095FF] font-semibold whitespace-nowrap transition-colors'
      : 'catalog-top-tab py-3.5 border-t-2 border-transparent text-[#1E293B] hover:text-[#0095FF] font-medium whitespace-nowrap transition-colors';
  });

  // 2. Update Page Heading & Active Filter Summary
  const matchedCat = state.categories.find((c) => c.id === activeCatId);
  const matchedColorDef = CATALOG_COLOR_FILTERS.find((c) => c.key === activeColorKey);
  const titleEl = document.getElementById('catalog-page-heading') || document.getElementById('catalog-page-title');
  const subtitleEl = document.getElementById('catalog-page-subheading') || document.getElementById('catalog-page-subtitle');
  const activeFilterBar = document.getElementById('catalog-active-filter-bar');
  const activeFilterSummary = document.getElementById('catalog-active-filter-summary');
  const clearColorBtn = document.getElementById('catalog-clear-color-btn');

  if (titleEl) {
    if (searchQuery.trim()) {
      titleEl.textContent = `Search Results for "${searchQuery.trim()}"`;
    } else if (matchedCat && matchedColorDef) {
      titleEl.textContent = `${matchedCat.name} · ${matchedColorDef.label}`;
    } else if (matchedCat) {
      titleEl.textContent = matchedCat.name;
    } else if (matchedColorDef) {
      titleEl.textContent = `All Furniture · ${matchedColorDef.label}`;
    } else {
      titleEl.textContent = 'All Showroom Furniture';
    }
  }
  if (subtitleEl) {
    if (matchedColorDef) {
      subtitleEl.textContent = `Showing only furniture pieces crafted in "${matchedColorDef.label}". Click another color on the left sidebar or Reset Color to view all finishes.`;
    } else if (matchedCat) {
      subtitleEl.textContent = `${matchedCat.description} Select a color tag on the left sidebar to filter by finish.`;
    } else {
      subtitleEl.textContent = 'Select a color on the left sidebar to display only furniture pieces crafted in that color finish.';
    }
  }

  const hasAnyFilter =
    activeCatId !== 'all' || activeColorKey !== 'all' || maxPrice < 5500 || Boolean(searchQuery.trim());
  if (activeFilterBar && activeFilterSummary) {
    activeFilterBar.classList.toggle('hidden', !hasAnyFilter);
    activeFilterBar.classList.toggle('flex', hasAnyFilter);
    const pills = [];
    if (matchedCat) {
      pills.push(`<span class="px-2.5 py-1 rounded-md bg-white border border-[#BCE3FF] font-semibold">Category: ${esc(matchedCat.name)}</span>`);
    }
    if (matchedColorDef) {
      pills.push(`
    <span class="px-2.5 py-1 rounded-md bg-[#0D1015] text-white font-semibold inline-flex items-center gap-1.5">
    <span class="w-3 h-3 rounded-full border border-white/40" style="background-color: ${esc(matchedColorDef.hex)}"></span>
    <span>Color: ${esc(matchedColorDef.label)}</span>
    </span>
      `);
    }
    if (maxPrice < 5500) {
      pills.push(`<span class="px-2.5 py-1 rounded-md bg-white border border-[#BCE3FF] font-semibold">Max Price: ${usd(maxPrice)}</span>`);
    }
    if (searchQuery.trim()) {
      pills.push(`<span class="px-2.5 py-1 rounded-md bg-white border border-[#BCE3FF] font-semibold">Search: "${esc(searchQuery.trim())}"</span>`);
    }
    activeFilterSummary.innerHTML = `<span class="text-[#475569]">Active Filters:</span> ${pills.join('')}`;
  }
  if (clearColorBtn) {
    clearColorBtn.classList.toggle('hidden', activeColorKey === 'all');
  }

  // 3. Render Left Sidebar: Filter by Color
  const colorContainer = document.getElementById('catalog-sidebar-colors');
  if (colorContainer) {
    const colorCounts = getColorFilterCounts(state.catalog, activeCatId, maxPrice);
    colorContainer.innerHTML = colorCounts
      .map((c) => {
        const isSelected = c.key === activeColorKey;
        return `
    <button type="button" data-sidebar-color-key="${esc(c.key)}" data-testid="sidebar-color-chip-${esc(c.key)}" aria-pressed="${isSelected ? 'true' : 'false'}" class="px-2.5 py-1.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-all ${ isSelected ? 'bg-[#0D1015] text-white border-[#0D1015] shadow-xs' : 'bg-white text-[#334155] border-[#94A3B8] hover:border-[#0095FF] hover:text-[#0095FF]' }">
    <span class="w-3 h-3 rounded-full border border-black/20 shrink-0" style="background-color: ${esc(c.hex)}"></span>
    <span>${esc(c.label)} (${c.count})</span>
    </button>
        `;
      })
      .join('');

    colorContainer.querySelectorAll('[data-sidebar-color-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const clickedKey = btn.getAttribute('data-sidebar-color-key') || 'all';
        state.catalogPageColorKey = state.catalogPageColorKey === clickedKey ? 'all' : clickedKey;

        if (state.catalogPageColorKey !== 'all') {
          state.catalog.forEach((item) => {
            const matchedVar = findMatchingColorVariant(item, state.catalogPageColorKey);
            if (matchedVar) {
              state.selectedColorByProduct[item.id] = matchedVar.name;
            }
          });
        }
        syncCatalogUrlParams();
        renderCatalogPage();
      });
    });
  }

  // 4. Render Left Sidebar: Filter by Room Category Tags
  const roomTagsContainer = document.getElementById('catalog-sidebar-room-tags');
  if (roomTagsContainer) {
    const allCount = state.catalog.length;
    const roomButtons = [
      { id: 'all', label: 'all rooms', count: allCount },
      ...state.categories.map((cat) => ({
        id: cat.id,
        label: cat.name.toLowerCase(),
        count: state.catalog.filter((p) => p.categoryId === cat.id).length,
      })),
    ];

    roomTagsContainer.innerHTML = roomButtons
      .map((r) => {
        const isSel = r.id === activeCatId;
        return `
    <button type="button" data-sidebar-room-id="${esc(r.id)}" data-testid="sidebar-room-chip-${esc(r.id)}" class="px-2.5 py-1.5 rounded-md border text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-all ${ isSel ? 'bg-[#0095FF] text-white border-[#0095FF]' : 'bg-white text-[#334155] border-[#94A3B8] hover:border-[#0095FF] hover:text-[#0095FF]' }">
    <span>${esc(r.label)} (${r.count})</span>
    </button>
        `;
      })
      .join('');

    roomTagsContainer.querySelectorAll('[data-sidebar-room-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const roomId = btn.getAttribute('data-sidebar-room-id') || 'all';
        state.catalogPageCategory = roomId;
        state.catalogPageSpotlightProductId = '';
        syncCatalogUrlParams();
        renderCatalogPage();
      });
    });
  }

  // 5. Render Spotlight Product Banner if ?product=<id> was clicked from the Homepage
  const spotlightContainer = document.getElementById('catalog-spotlight-container');
  if (spotlightContainer) {
    const spotlightItem = state.catalogPageSpotlightProductId
      ? state.catalog.find((p) => p.id === state.catalogPageSpotlightProductId)
      : null;

    if (spotlightItem) {
      if (activeColorKey !== 'all') {
        const matchedVar = findMatchingColorVariant(spotlightItem, activeColorKey);
        if (matchedVar) {
          state.selectedColorByProduct[spotlightItem.id] = matchedVar.name;
        }
      }
      const selFinish =
        state.selectedColorByProduct[spotlightItem.id] ||
        spotlightItem.colorVariants?.[0]?.name ||
        spotlightItem.defaultFinish;
      const pricing = computeVariantPricing(spotlightItem, selFinish);
      const variants = spotlightItem.colorVariants || [];

      spotlightContainer.classList.remove('hidden');
      spotlightContainer.innerHTML = `
    <div class="rounded-2xl bg-[#F8FBFF] border border-[#0095FF] p-5 sm:p-6 shadow-md">
    <div class="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-[#BCE3FF]">
    <div class="flex items-center gap-2">
    <span class="px-2.5 py-1 rounded-md bg-[#0095FF] text-white font-mono-tech text-[11px] font-bold">
                Product Details &amp; Customization
    </span>
    <span class="font-mono-tech text-xs text-[#475569]">
                ${esc(spotlightItem.categoryName)}
    </span>
    </div>
    <button type="button" id="catalog-close-spotlight-btn" class="text-xs font-semibold text-[#475569] hover:text-[#0D1015] cursor-pointer">
              Dismiss Spotlight ✕
    </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
    <div class="lg:col-span-5">
    <div class="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-[#BCE3FF]">
    <img src="${esc(spotlightItem.image)}" alt="${esc(spotlightItem.name)}" class="w-full h-full object-cover" />
    </div>
    </div>
    <div class="lg:col-span-7 space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
    <h2 class="font-serif-display text-2xl sm:text-3xl font-bold text-[#0D1015]">${esc(spotlightItem.name)}</h2>
    <p class="text-xs sm:text-sm text-[#475569] mt-1">${esc(spotlightItem.description)}</p>
    </div>
    <div class="text-right">
                  ${
                    spotlightItem.discountPercent > 0
                      ? `<p class="font-mono-tech text-xs text-slate-400 line-through">${usd(pricing.variantBasePrice)}</p>`
                      : ''
                  }
    <p class="font-mono-tech text-2xl font-bold text-[#0095FF]">${usd(pricing.effectivePrice)}</p>
    </div>
    </div>

    <div class="p-3.5 rounded-xl bg-white border border-[#BCE3FF] space-y-2">
    <div class="flex items-center justify-between text-xs">
    <span class="font-semibold text-[#0D1015]">Selected Finish: <span class="text-[#0077CC]">${esc(pricing.colorName)}</span></span>
    <span class="font-mono-tech text-[#475569]">${esc(spotlightItem.dimensions)} · ${spotlightItem.leadTimeWeeks} wks lead</span>
    </div>
    <div class="flex flex-wrap items-center gap-2">
                  ${variants
                    .map((v) => {
                      const isSel = v.name === pricing.colorName;
                      return `
    <button type="button" data-spotlight-color-product="${esc(spotlightItem.id)}" data-spotlight-color-name="${esc(v.name)}" class="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-all ${ isSel ? 'bg-[#0D1015] text-white border-[#0D1015]' : 'bg-[#F8FBFF] text-[#0D1015] border-[#BCE3FF] hover:border-[#0095FF]' }">
    <span class="w-3 h-3 rounded-full border border-black/20 shrink-0" style="background-color: ${esc(v.hex)}"></span>
    <span>${esc(v.name)}</span>
    </button>
                      `;
                    })
                    .join('')}
    </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
    <button type="button" data-add-cart="${esc(spotlightItem.id)}" class="px-5 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold cursor-pointer transition-colors">
                  Add to Cart (${usd(pricing.effectivePrice)})
    </button>
    <button type="button" data-view-product="${esc(spotlightItem.id)}" class="px-4 py-2.5 rounded-xl bg-[#0D1015] hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition-colors">
                  View Details &amp; Make Offer
    </button>
    </div>
    </div>
    </div>
    </div>
      `;

      const closeSpotBtn = document.getElementById('catalog-close-spotlight-btn');
      if (closeSpotBtn) {
        closeSpotBtn.addEventListener('click', () => {
          state.catalogPageSpotlightProductId = '';
          syncCatalogUrlParams();
          renderCatalogPage();
        });
      }
      spotlightContainer.querySelectorAll('[data-spotlight-color-product]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const pid = btn.getAttribute('data-spotlight-color-product');
          const cname = btn.getAttribute('data-spotlight-color-name');
          if (pid && cname) {
            state.selectedColorByProduct[pid] = cname;
            renderCatalogPage();
          }
        });
      });
    } else {
      spotlightContainer.classList.add('hidden');
      spotlightContainer.innerHTML = '';
    }
  }

  // 6. Filter & Render Right-Hand 3-Column Product Grid
  const filteredItems = filterCatalogPageItems(state.catalog, {
    categoryId: activeCatId,
    colorKey: activeColorKey,
    maxPrice,
    searchQuery,
  });

  const countLabel = document.getElementById('catalog-page-result-count') || document.getElementById('catalog-results-count');
  if (countLabel) {
    if (matchedColorDef) {
      countLabel.textContent = `${filteredItems.length} ${
        filteredItems.length === 1 ? 'PRODUCT' : 'PRODUCTS'
      } (${matchedColorDef.label.toUpperCase()})`;
    } else {
      countLabel.textContent = `${filteredItems.length} ${
        filteredItems.length === 1 ? 'PRODUCT' : 'PRODUCTS'
      }`;
    }
  }

  if (filteredItems.length === 0) {
    grid.innerHTML = `
    <div class="col-span-full p-10 rounded-2xl border border-[#BCE3FF] bg-[#F8FBFF] text-center space-y-3">
    <p class="font-serif-display text-xl font-bold text-[#0D1015]">No products match this filter combination</p>
    <p class="text-xs sm:text-sm text-[#475569] max-w-md mx-auto">
          Try clearing the active color filter or selecting "All Furniture" to see all available pieces.
    </p>
    <div class="pt-1">
    <button type="button" id="catalog-empty-reset-btn" class="px-5 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold cursor-pointer transition-colors">
            Show All Products
    </button>
    </div>
    </div>
    `;
    const emptyResetBtn = document.getElementById('catalog-empty-reset-btn');
    if (emptyResetBtn) {
      emptyResetBtn.addEventListener('click', () => {
        state.catalogPageCategory = 'all';
        state.catalogPageColorKey = 'all';
        state.catalogPageMaxPrice = 5500;
        syncCatalogUrlParams();
        renderCatalogPage();
      });
    }
    return;
  }

  grid.innerHTML = filteredItems
    .map((item) => {
      if (activeColorKey !== 'all') {
        const matchedVariant = findMatchingColorVariant(item, activeColorKey);
        if (matchedVariant) {
          state.selectedColorByProduct[item.id] = matchedVariant.name;
        }
      }
      const isSpotlighted = state.catalogPageSpotlightProductId === item.id;
      return renderSimplifiedProductCard(item, {
        isSpotlighted,
        cardTestId: `catalog-product-card-${item.id}`,
      });
    })
    .join('');

  bindStorefrontProductButtons(document);
}

/* ==========================================================================
   BOOTSTRAP
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  state.sessionUser = loadSessionUser();

  const data = await loadData();
  state.categories = Array.isArray(data.categories) ? data.categories : [];
  state.catalog = Array.isArray(data.products) ? data.products : [];
  state.materials = Array.isArray(data.materials) ? data.materials : [];
  state.customers = Array.isArray(data.customers) ? data.customers : [];
  state.messengerConversations = Array.isArray(data.messengerConversations)
    ? data.messengerConversations
    : [];
  state.inventoryTransactions = Array.isArray(data.inventoryTransactions)
    ? data.inventoryTransactions
    : [];
  state.vouchers = Array.isArray(data.vouchers) ? data.vouchers : [];
  state.orders = Array.isArray(data.orders) ? data.orders : [];

  state.adminMovementMaterialId = state.materials[0]?.id || '';
  state.adminMovementProductId = state.materials[0]?.id || state.catalog[0]?.id || '';

  state.catalog.forEach((p) => {
    state.selectedColorByProduct[p.id] = p.colorVariants?.[0]?.name || p.defaultFinish;
  });

  state.cartItems = hydrateCartFromServer(data.cartItems);

  if (document.getElementById('product-catalog-grid')) {
    initShowroomPage();
  }
  if (document.getElementById('catalog-page-grid')) {
    initCatalogPage();
  }
  if (document.getElementById('client-portal-view') || document.getElementById('admin-portal-view')) {
    try {
      const { createDashboard } = await import('./dashboard.js');
      createDashboard({ state, API_ENDPOINT, FRIENDLY_CUSTOMER_STEPS, syncCustomerAvatarDOM, esc, usd, bindLiveSearchInput, syncDatabaseStore, persistProductToStorage, saveMaterialsToStorage, saveOrdersToStorage, saveInventoryTransactionsToStorage, saveSessionUserToServer, saveCartToStorage, saveCustomerProfileToStorage, bindRequestDesignTriggers }).initDashboardPage();
    } catch (error) {
      console.error('Unable to load dashboard', error);
      const portal = document.getElementById('admin-portal-view') || document.getElementById('client-portal-view');
      const notice = document.createElement('p');
      notice.setAttribute('role', 'alert');
      notice.textContent = 'The dashboard could not load. Please refresh the page to try again.';
      portal?.prepend(notice);
    }
  }
});

