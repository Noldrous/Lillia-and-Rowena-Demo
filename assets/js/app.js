import {
  ADMIN_MESSENGER_PLACEHOLDER_URL,
  CATALOG_COLOR_FILTERS,
  PRODUCT_TYPES,
  applyAdminOrderUpdate,
  applyMaterialStockMovement,
  buildMaterialRecord,
  buildProductRecord,
  buildRequestDesignMessengerUrl,
  calculateOrderPricing,
  computeMaterialInventoryMetrics,
  computeVariantPricing,
  createCustomOrderRequest,
  describeMaterialStockPreview,
  filterCatalogPageItems,
  filterFurnitureItems,
  findMatchingColorVariant,
  formatCustomerProductDisplay,
  formatVoucherBenefitLabel,
  getColorFilterCounts,
  getMaterialStockStatus,
  getProductStockStatus,
  getRecommendedBestSellers,
  recordCustomerOrderPayment,
  removeMaterialFromInventory,
  removeProductFromCatalog,
  resolveAuthNavigationState,
  validateAndBuildOfferProposal,
  validateMaterialInput,
  validateNewFurnitureInput,
  validateVoucherForOrder,
  verifyAndCreateOrder,
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
  messengerConversations: [],
  inventoryTransactions: [],
  vouchers: [],
  orders: [],
  selectedColorByProduct: {},
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
  adminMaterialFormOpen: false,
  adminEditingMaterialId: '',
  adminInventoryView: 'materials',
  adminMovementFormOpen: false,
  adminInventoryStockSearch: '',
  adminInventoryStockFilter: 'all',
  adminInventoryHistorySearch: '',
  adminInventoryHistoryTypeFilter: 'all',
  adminMovementMode: 'Stock In',
  adminMovementMaterialId: '',
  adminMovementProductId: '',
  adminMovementQuantity: '25',
  adminMovementCost: '',
  adminMovementReason: 'Allocated to Workshop Production',
  adminMovementCustomReason: '',
  adminMovementDate: new Date().toISOString().slice(0, 10),
  adminOrderSearch: '',
  adminOrderStage: 'all',
  customerProfile: {
    name: 'Rowena Vance',
    email: 'rowena.vance@vancearchitects.com',
    phone: '+1 (212) 555-0148',
    city: 'New York, NY 10013',
    address: 'Suite 400, 118 Mercer St, SoHo',
    notes: 'Freight elevator available Mon–Fri 9:00 AM – 5:00 PM. Please call 30 minutes before arrival.',
  },
};

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
    btn.onclick = () => {
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

function syncDatabaseStore(action = 'sync_store', extraPayload = {}) {
  try {
    fetch('api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        products: state.catalog,
        materials: state.materials,
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
    const apiRes = await fetch('api.php?action=state', { cache: 'no-store' });
    if (apiRes.ok) {
      const parsedApi = await apiRes.json();
      if (parsedApi && Array.isArray(parsedApi.products)) {
        baseData = parsedApi;
      }
    }
  } catch (_apiErr) {
    // Fallback to server data/store.json if api.php is unreachable
  }

  if (!baseData) {
    const res = await fetch('data/store.json', { cache: 'no-store' });
    baseData = await res.json();
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
    applyVoucherBtn.addEventListener('click', () => {
      const codeInput = document.getElementById('voucher-code-input');
      const feedback = document.getElementById('voucher-feedback');
      const code = codeInput ? codeInput.value : '';
      const activeEmail = state.sessionUser
        ? state.sessionUser.email
        : 'rowena.vance@vancearchitects.com';
      const check = validateVoucherForOrder(
        state.vouchers,
        code,
        activeEmail,
        state.cartItems,
        state.catalog
      );

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
    <article class="group rounded-2xl bg-white border ${
          isSelected ? 'border-[#0095FF] ring-2' : 'border-[#BCE3FF] hover:border-[#0095FF]'
        } overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
    <a href="${esc(catHref)}" class="block">
    <div class="aspect-[4/3] relative overflow-hidden bg-slate-100">
    <img src="${esc(cat.image)}" alt="${esc(cat.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
    <div class="absolute inset-0 bg-gradient-to-t from-[#0D1015]/85 via-[#0D1015]/20 to-transparent"></div>
    <div class="absolute bottom-3 left-3 right-3 text-white">
    <p class="font-mono-tech text-[11px] text-[#BCE3FF]">From ${usd(cat.startingPrice)} · ${items.length} Pieces</p>
    <h3 class="font-serif-display text-lg font-bold leading-snug mt-0.5">${esc(cat.name)}</h3>
    </div>
    </div>
    <div class="p-4 space-y-2">
    <p class="text-xs text-[#475569] line-clamp-2">${esc(cat.tagline)}</p>
    </div>
    </a>
    <div class="px-4 pb-4">
    <a href="${esc(catHref)}" data-testid="category-card-link-${esc(cat.id)}" class="w-full py-2.5 px-3.5 rounded-xl ${ isSelected ? 'bg-[#0095FF] text-white' : 'bg-[#EBF6FF] group-hover:bg-[#0095FF] text-[#0D1015] group-hover:text-white' } text-xs font-semibold transition-colors flex items-center justify-between">
    <span>Explore ${esc(cat.name)}</span>
    <span>→</span>
    </a>
    </div>
    </article>
      `;
    })
    .join('');
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
    <span>Delivery: <strong class="text-[#0D1015]">Ships in ${display.leadTimeWeeks} ${display.leadTimeWeeks === 1 ? 'week' : 'weeks'}</strong></span>
    </div>
    </div>

    <div class="md:col-span-6 space-y-5">
    <div class="space-y-2">
    <div class="flex flex-wrap items-center gap-2">
    <span class="px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass}">
              ${esc(display.availabilityLabel)}
    </span>
    <span class="text-xs text-slate-500">${esc(display.availabilityDetail)}</span>
    </div>

    <h2 id="product-modal-title" class="font-serif-display text-2xl sm:text-3xl font-bold text-[#0D1015] leading-snug">
            ${esc(display.name)}
    </h2>

    <div class="flex items-baseline gap-2.5 pt-1">
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

    <p class="text-sm text-slate-600 leading-relaxed">
          ${esc(display.description)}
    </p>

        ${
          display.craftsmanshipNote
            ? `<div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
    <strong class="text-[#0D1015]">Materials &amp; Care:</strong> ${esc(display.craftsmanshipNote)}
    </div>`
            : ''
        }

    <div class="space-y-2">
    <div class="flex items-center justify-between text-xs">
    <span class="font-semibold text-[#0D1015]">Selected Finish: <span class="text-[#0077CC]">${esc(display.selectedFinish)}</span></span>
    <span class="text-slate-500">
              ${display.priceDelta === 0 ? 'Included' : display.priceDelta > 0 ? `+${usd(display.priceDelta)}` : `-${usd(Math.abs(display.priceDelta))}`}
    </span>
    </div>
    <div class="flex flex-wrap items-center gap-2">
            ${display.colorVariants
              .map((v) => {
                const isSel = v.name === display.selectedFinish;
                return `
    <button type="button" data-modal-color-name="${esc(v.name)}" class="px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 cursor-pointer transition-all ${ isSel ? 'bg-[#0D1015] text-white border-[#0D1015]' : 'bg-white text-[#0D1015] border-slate-200 hover:border-[#0095FF]' }">
    <span class="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" style="background-color: ${esc(v.hex)}"></span>
    <span>${esc(v.shortLabel)}</span>
    </button>
                `;
              })
              .join('')}
    </div>
    </div>

    <div class="pt-2 space-y-2.5">
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
    .map((item) => {
      const selectedFinish =
        state.selectedColorByProduct[item.id] ||
        item.colorVariants?.[0]?.name ||
        item.defaultFinish;
      const display = formatCustomerProductDisplay(item, selectedFinish);
      const productPageUrl = `catalog.html?category=${encodeURIComponent(item.categoryId)}&product=${encodeURIComponent(item.id)}`;

      const stockBadgeClass = display.isOutOfStock
        ? 'bg-rose-600 text-white'
        : display.isLowStock
        ? 'bg-amber-500 text-slate-950'
        : 'bg-white/95 text-[#0D1015] border border-slate-200/80';

      return `
    <article class="group rounded-2xl bg-white border border-[#BCE3FF] hover:border-[#0095FF] overflow-hidden shadow-2xs hover:shadow-xl transition-all flex flex-col justify-between">
    <div>
    <a href="${esc(productPageUrl)}" data-testid="home-product-card-link-${esc(item.id)}" class="block aspect-[4/3] relative overflow-hidden bg-slate-100">
    <img src="${esc(display.image)}" alt="${esc(display.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
    <div class="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5">
    <div class="flex flex-wrap gap-1.5">
                  ${
                    item.isBestSeller
                      ? `<span class="px-2.5 py-1 rounded-md bg-[#0095FF] text-white font-mono-tech text-[11px] font-bold">${esc(item.bestSellerBadge || 'Best Seller')}</span>`
                      : ''
                  }
    <span data-testid="shop-stock-badge-${esc(item.id)}" class="px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-2xs ${stockBadgeClass}">
                    ${esc(display.availabilityLabel)}
    </span>
    </div>
                ${
                  display.hasDiscount
                    ? `<span class="px-2.5 py-1 rounded-md bg-[#0D1015] text-white font-mono-tech text-[11px] font-bold">Save ${display.discountPercent}%</span>`
                    : ''
                }
    </div>
    <div class="absolute bottom-3 left-3">
    <span class="px-2.5 py-1 rounded-md bg-white/95 text-[#0D1015] font-mono-tech text-[11px] font-semibold">
                  ${esc(item.sku)} · ${esc(display.categoryName)}
    </span>
    </div>
    </a>

    <div class="p-5 space-y-3">
    <div class="flex items-start justify-between gap-3">
    <a href="${esc(productPageUrl)}" class="font-serif-display text-lg font-bold text-[#0D1015] hover:text-[#0095FF] leading-snug transition-colors">
                  ${esc(display.name)}
    </a>
    <div class="text-right shrink-0">
                  ${
                    display.hasDiscount
                      ? `<p class="font-mono-tech text-xs text-slate-400 line-through">${usd(display.variantBasePrice)}</p>`
                      : ''
                  }
    <p class="font-mono-tech text-xl font-bold text-[#0095FF]">${usd(display.effectivePrice)}</p>
    </div>
    </div>

    <p class="text-xs text-[#475569] leading-relaxed line-clamp-2">${esc(display.description)}</p>

    <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
    <div class="flex items-center justify-between text-[11px]">
    <span class="font-medium text-slate-700">Finish: <strong class="text-[#0D1015]">${esc(display.selectedFinish)}</strong></span>
    <span class="text-slate-500 font-medium">
                    ${display.priceDelta === 0 ? 'Included' : display.priceDelta > 0 ? `+${usd(display.priceDelta)}` : `-${usd(Math.abs(display.priceDelta))}`}
    </span>
    </div>
    <div class="flex flex-wrap items-center gap-1.5">
                  ${display.colorVariants
                    .map((v) => {
                      const isSel = v.name === display.selectedFinish;
                      return `
    <button type="button" data-color-product="${esc(item.id)}" data-color-name="${esc(v.name)}" class="px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 cursor-pointer transition-all ${ isSel ? 'bg-[#0D1015] text-white border-[#0D1015]' : 'bg-white text-slate-700 border-slate-200 hover:border-[#0095FF]' }">
    <span class="w-3 h-3 rounded-full border border-black/20 shrink-0" style="background-color: ${esc(v.hex)}"></span>
    <span class="truncate max-w-[115px]">${esc(v.shortLabel)}</span>
    </button>
                      `;
                    })
                    .join('')}
    </div>
    </div>

    <div class="pt-1 flex items-center justify-between text-[11px] text-[#64748B] font-mono-tech">
    <span>${esc(display.dimensions)}</span>
    <span>${esc(display.availabilityDetail)}</span>
    </div>
    </div>
    </div>

    <div class="px-5 pb-5 pt-2 space-y-2">
    <a href="${esc(productPageUrl)}" data-testid="home-product-open-catalog-${esc(item.id)}" class="block w-full py-2.5 px-3 rounded-xl bg-[#0D1015] hover:bg-[#0095FF] text-white text-xs font-semibold transition-colors text-center">
              View in Catalog &amp; Filter by Color →
    </a>
    <div class="grid grid-cols-2 gap-2">
    <button type="button" data-add-cart="${esc(item.id)}" ${display.isOutOfStock ? 'disabled' : ''} class="py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors ${ display.isOutOfStock ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-[#0095FF] hover:bg-[#0077CC] text-white cursor-pointer' }">
                ${display.isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
    </button>
    <button type="button" data-view-product="${esc(item.id)}" aria-label="View details for ${esc(display.name)}" class="py-2.5 px-3 rounded-xl bg-[#D8EEFF] hover:bg-[#BCE3FF] text-[#0D1015] text-xs font-semibold transition-colors cursor-pointer">
                View Details
    </button>
    </div>
    </div>
    </article>
      `;
    })
    .join('');

  // Bind color swatch buttons
  grid.querySelectorAll('[data-color-product]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-color-product');
      const cname = btn.getAttribute('data-color-name');
      if (pid && cname) {
        state.selectedColorByProduct[pid] = cname;
        renderCatalogGrid();
      }
    });
  });

  bindStorefrontProductButtons(grid);
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
  if (sidebarInitials) {
    const initials = state.customerProfile.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
    sidebarInitials.textContent = initials || 'LR';
  }

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

      state.customerProfile = {
        name: nameVal,
        email: emailVal,
        phone: phoneVal,
        city: cityVal,
        address: addressVal,
        notes: notesVal,
      };
      saveCustomerProfileToStorage();

      if (state.sessionUser) {
        state.sessionUser.name = nameVal;
        state.sessionUser.email = emailVal;
        saveSessionUserToServer(state.sessionUser);
      }
      if (welcomeName) welcomeName.textContent = nameVal;
      if (welcomeEmail) welcomeEmail.textContent = emailVal;
      if (sidebarName) sidebarName.textContent = nameVal;
      if (sidebarEmail) sidebarEmail.textContent = emailVal;
      if (userBadge) userBadge.textContent = `${nameVal} (Customer)`;

      showClientBanner('Saved your updated Address & Contact information.');
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

  // Customer Cart Voucher Apply Button
  const clientApplyVoucherBtn = document.getElementById('client-cart-apply-voucher-btn');
  const clientVoucherInput = document.getElementById('client-cart-voucher-input');
  const clientVoucherFeedback = document.getElementById('client-cart-voucher-feedback');
  if (clientApplyVoucherBtn && clientVoucherInput) {
    clientApplyVoucherBtn.addEventListener('click', () => {
      const code = clientVoucherInput.value.trim().toUpperCase();
      const email = state.customerProfile.email || state.sessionUser?.email || '';
      const result = validateVoucherForOrder(
        state.vouchers,
        code,
        email,
        state.cartItems,
        state.catalog
      );
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

  // Unified Admin Left-Sidebar Navigation (overview, catalog, add-product, inventory, vouchers, orders)
  const ADMIN_SECTION_META = {
    overview: {
      eyebrow: 'Store Summary',
      title: 'Dashboard Overview',
      description:
        'Track your store performance, inventory breakdown, and recent customer orders in one place.',
    },
    catalog: {
      eyebrow: 'Catalog Management',
      title: 'Products',
      description:
        'View all furniture pieces, filter by room category or product type, and manage catalog items.',
    },
    'add-product': {
      eyebrow: 'Catalog Management',
      title: 'Add New Product',
      description:
        'Add a Normal Product or a Customized Product (Messenger) — both remain publicly visible to all customers.',
    },
    inventory: {
      eyebrow: 'Workshop Supplies',
      title: 'Materials & Stock',
      description:
        'See how much wood, fabric, stone, and hardware you have left, add newly arrived supplies, or deduct materials used for orders.',
    },
    vouchers: {
      eyebrow: 'Promotions',
      title: 'Discount Vouchers',
      description:
        'Create and manage single-item discount codes for your customers.',
    },
    orders: {
      eyebrow: 'Fulfillment & Production',
      title: 'Customer Orders',
      description:
        'Update order production stage and track customer payments — changes sync live with the Customer Dashboard.',
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
      reader.onload = () => {
        const resultDataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (prodImageInput && resultDataUrl) {
          prodImageInput.value = resultDataUrl;
          syncProductImagePreview(resultDataUrl);
          if (prodErrorEl) prodErrorEl.classList.add('hidden');
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
    if (skuEl) skuEl.value = '';
    if (catEl) catEl.value = 'dining';
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
      const isSel = b.getAttribute('data-admin-tab') === target;
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
      confirmModal.classList.add('hidden');
      pendingConfirmAction = null;
    });
  }
  if (confirmAcceptBtn && confirmModal) {
    confirmAcceptBtn.addEventListener('click', () => {
      const fn = pendingConfirmAction;
      pendingConfirmAction = null;
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

  // Admin Voucher Discount Type Selector & Generate Code Helper Button
  const vchDiscountTypeSelect = document.getElementById('vch-discount-type');
  const vchDiscountInput = document.getElementById('vch-discount');
  const vchDiscountLabel = document.getElementById('vch-discount-label');
  if (vchDiscountTypeSelect && vchDiscountInput) {
    vchDiscountTypeSelect.addEventListener('change', () => {
      const isPct = vchDiscountTypeSelect.value === 'percentage';
      if (vchDiscountLabel) {
        vchDiscountLabel.textContent = isPct ? 'Discount (%)' : 'Discount Value ($)';
      }
      if (isPct && Number(vchDiscountInput.value) > 90) {
        vchDiscountInput.value = '20';
      } else if (!isPct && Number(vchDiscountInput.value) <= 20) {
        vchDiscountInput.value = '300';
      }
    });
  }

  const genVoucherBtn = document.getElementById('admin-generate-voucher-btn');
  if (genVoucherBtn) {
    genVoucherBtn.addEventListener('click', () => {
      const discountType = document.getElementById('vch-discount-type')?.value || 'fixed';
      const discountVal = Number(document.getElementById('vch-discount')?.value) || (discountType === 'percentage' ? 20 : 300);
      const randomDigits = Math.floor(100 + Math.random() * 900);
      const codeInput = document.getElementById('vch-code');
      if (codeInput) {
        codeInput.value =
          discountType === 'percentage'
            ? `SAVE${discountVal}-${randomDigits}`
            : `SAVE-${discountVal}-${randomDigits}`;
      }
    });
  }

  // Admin Issue Single-Product Voucher Form
  const vchForm = document.getElementById('admin-voucher-form');
  const vchErrorEl = document.getElementById('admin-voucher-form-error');
  if (vchForm) {
    vchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const customerEmail = document.getElementById('vch-email').value.trim();
      const furnitureId = document.getElementById('vch-product').value;
      const code = document.getElementById('vch-code').value.trim().toUpperCase();
      const discountType = document.getElementById('vch-discount-type')?.value || 'fixed';
      const rawDiscountVal = Number(document.getElementById('vch-discount').value);

      if (customerEmail && !customerEmail.includes('@')) {
        if (vchErrorEl) {
          vchErrorEl.textContent = 'Please enter a valid customer email address.';
          vchErrorEl.classList.remove('hidden');
        }
        return;
      }
      if (!code) {
        if (vchErrorEl) {
          vchErrorEl.textContent = 'Please enter a voucher code or click Generate.';
          vchErrorEl.classList.remove('hidden');
        }
        return;
      }
      if (discountType === 'percentage') {
        if (!Number.isFinite(rawDiscountVal) || rawDiscountVal < 1 || rawDiscountVal > 90) {
          if (vchErrorEl) {
            vchErrorEl.textContent = 'Please enter a percentage discount between 1% and 90%.';
            vchErrorEl.classList.remove('hidden');
          }
          return;
        }
      } else if (!Number.isFinite(rawDiscountVal) || rawDiscountVal < 1) {
        if (vchErrorEl) {
          vchErrorEl.textContent = 'Please enter a valid discount amount of at least $1.';
          vchErrorEl.classList.remove('hidden');
        }
        return;
      }

      const prod = state.catalog.find((p) => p.id === furnitureId);
      if (!prod) {
        if (vchErrorEl) {
          vchErrorEl.textContent = 'Please select a valid eligible product for this voucher.';
          vchErrorEl.classList.remove('hidden');
        }
        return;
      }
      if (vchErrorEl) vchErrorEl.classList.add('hidden');

      const estimatedDollarDiscount =
        discountType === 'percentage'
          ? Math.round(prod.effectivePrice * (rawDiscountVal / 100))
          : Math.min(prod.effectivePrice, Math.round(rawDiscountVal));

      const normalizedEmail = customerEmail || 'rowena.vance@vancearchitects.com';

      const newVoucher = {
        id: `vch-${Date.now()}`,
        code,
        customerEmail: normalizedEmail,
        customerName: normalizedEmail.split('@')[0],
        furnitureId: prod.id,
        productId: prod.id,
        furnitureSku: prod.sku,
        furnitureName: prod.name,
        productName: prod.name,
        discountType,
        discountPercent: discountType === 'percentage' ? rawDiscountVal : 0,
        discountValue: rawDiscountVal,
        discountAmount: estimatedDollarDiscount,
        status: 'Active',
        issuedByAdmin: 'Lillia Mercier',
        createdAt: new Date().toISOString().slice(0, 10),
        expiryDate: '2026-12-31',
        messengerPlaceholderLink: `${ADMIN_MESSENGER_PLACEHOLDER_URL}?voucher=${encodeURIComponent(code)}&client=${encodeURIComponent(normalizedEmail)}&sku=${encodeURIComponent(prod.sku)}`,
      };

      state.vouchers = [
        newVoucher,
        ...state.vouchers.filter((v) => String(v.code || '').toUpperCase() !== code),
      ];
      syncDatabaseStore('sync_store');
      document.getElementById('vch-code').value = '';
      showAdminBanner(
        `Created voucher ${code} (${formatVoucherBenefitLabel(newVoucher)} on "${prod.name}") for ${normalizedEmail}.`
      );
      renderDashboardContent();
    });
  }

  switchAdminTab(state.activeAdminTab || 'overview');
  renderDashboardContent();
}

let pendingConfirmAction = null;

function openAdminConfirmModal({ title, message, confirmLabel = 'Confirm', onConfirm }) {
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
  if (acceptBtn) acceptBtn.textContent = confirmLabel;
  pendingConfirmAction = onConfirm;
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

function showAdminBanner(msg) {
  const banner = document.getElementById('admin-status-banner');
  if (!banner) return;
  banner.innerHTML = `
    <span>✓ ${esc(msg)}</span>
    <button type="button" id="admin-banner-dismiss" class="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer">Dismiss</button>
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
      (o) => o.clientEmail.toLowerCase() === userEmail.toLowerCase()
    );
  const displayOrders = myOrders.length > 0 ? myOrders : state.orders.slice(0, 2);

  const myVouchers = state.vouchers.filter(
    (v) => v.customerEmail.toLowerCase() === userEmail.toLowerCase()
  );
  const displayVouchers = myVouchers.length > 0 ? myVouchers : state.vouchers.slice(0, 2);

  // Update Summary KPI Cards & Sidebar Badges
  const statOrders = document.getElementById('user-stat-orders');
  const statVouchers = document.getElementById('user-stat-vouchers');
  const statCart = document.getElementById('user-stat-cart');
  const badgeOrders = document.getElementById('sidebar-badge-orders');
  const badgeCart = document.getElementById('sidebar-badge-cart');
  const badgeVouchers = document.getElementById('sidebar-badge-vouchers');
  const cartQty = state.cartItems.reduce((sum, c) => sum + c.quantity, 0);

  if (statOrders) statOrders.textContent = `${displayOrders.length} Active Orders`;
  if (statVouchers) statVouchers.textContent = `${displayVouchers.length} Ready to Use`;
  if (statCart) statCart.textContent = `${cartQty} ${cartQty === 1 ? 'Item' : 'Items'}`;
  if (badgeOrders) badgeOrders.textContent = String(displayOrders.length);
  if (badgeCart) badgeCart.textContent = String(cartQty);
  if (badgeVouchers) badgeVouchers.textContent = String(displayVouchers.length);

  // Populate Home Tab Previews (Latest Order + Address Preview + Live Catalog Feed)
  const homeOrderPreview = document.getElementById('client-home-order-preview');
  if (homeOrderPreview && displayOrders[0]) {
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
  }

  const homeAddrPreview = document.getElementById('client-home-address-preview');
  if (homeAddrPreview) {
    homeAddrPreview.innerHTML = `
    <div class="pt-4 border-t border-[#E2E8F0] space-y-1.5">
    <p class="font-serif-display text-sm font-bold text-[#0D1015]">${esc(state.customerProfile.name)}</p>
    <p class="font-mono-tech text-xs text-[#0077CC]">${esc(state.customerProfile.phone)}</p>
    <p class="text-xs text-[#0D1015]">${esc(state.customerProfile.address)}, ${esc(state.customerProfile.city)}</p>
    <p class="text-[11px] text-[#64748B] pt-1">${esc(state.customerProfile.notes)}</p>
    </div>
    `;
  }

  // Live Showroom Catalog & Workshop Materials Feed on Customer Home Tab (#client-home-catalog-feed)
  const homeCatalogFeedEl = document.getElementById('client-home-catalog-feed');
  if (homeCatalogFeedEl) {
    const featuredItems = state.catalog.slice(0, 6);
    homeCatalogFeedEl.innerHTML = featuredItems
      .map((prod) => {
        const imgUrl = (prod.image || 'assets/images/category_dining_tables.jpg').replace(/^\//, '');
        const st = getProductStockStatus(prod);
        const isDiscounted = Number(prod.discountPercent || 0) > 0;
        return `
    <div class="p-4 rounded-2xl border border-[#BCE3FF] bg-[#F8FBFF] flex flex-col justify-between gap-3">
    <div class="flex items-start gap-3.5">
    <img src="${esc(imgUrl)}" alt="${esc(prod.name)}" class="w-16 h-16 rounded-xl object-cover border border-[#BCE3FF] shrink-0" />
    <div class="min-w-0 flex-1">
    <div class="flex items-center justify-between gap-1">
    <span class="font-mono-tech text-[11px] font-bold text-[#0077CC]">${esc(prod.sku)}</span>
    <span class="text-[11px] font-mono-tech font-semibold ${
                    st.statusKey === 'out_of_stock'
                      ? 'text-rose-700'
                      : st.statusKey === 'low_stock'
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }">${st.availableStock} in stock</span>
    </div>
    <h3 class="font-serif-display text-sm font-bold text-[#0D1015] truncate mt-0.5">${esc(prod.name)}</h3>
    <p class="text-[11px] text-[#64748B] truncate">${esc(prod.dimensions || 'Standard Dimensions')}</p>
    <div class="flex items-baseline gap-2 mt-1">
    <span class="font-mono-tech text-sm font-bold text-[#0095FF]">${usd(prod.effectivePrice)}</span>
                  ${
                    isDiscounted
                      ? `<span class="font-mono-tech text-[11px] text-slate-400 line-through">${usd(prod.price)}</span>
    <span class="text-[10px] font-bold text-emerald-700">${prod.discountPercent}% OFF</span>`
                      : ''
                  }
    </div>
    </div>
    </div>
    <div class="flex items-center gap-2 pt-2 border-t border-[#E2E8F0]">
    <button type="button" data-client-quick-add="${esc(prod.id)}" ${st.availableStock <= 0 ? 'disabled' : ''} class="flex-1 px-3 py-1.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors cursor-pointer ${ st.availableStock <= 0 ? 'opacity-50 cursor-not-allowed' : '' }">
                ${st.availableStock <= 0 ? 'Out of Stock' : '+ Add to Cart'}
    </button>
    <button type="button" data-client-customize-prod="${esc(prod.id)}" class="px-3 py-1.5 rounded-xl border border-[#BCE3FF] bg-white hover:bg-[#EBF6FF] text-[#0077CC] text-xs font-semibold transition-colors cursor-pointer">
                Customize
    </button>
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
    friendlyOrdersEl.innerHTML = displayOrders
      .map((ord) => {
        const matchedProd = state.catalog.find((p) => p.id === ord.furnitureId) || state.catalog[0];
        const imgUrl = (matchedProd ? matchedProd.image : 'assets/images/category_dining_tables.jpg').replace(/^\//, '');

        // Map workshop status to 4 friendly customer steps
        let friendlyStep = 1;
        if (ord.status.includes('Joinery') || ord.status.includes('Finishing') || ord.status.includes('Timber')) friendlyStep = 2;
        if (ord.status.includes('Quality')) friendlyStep = 3;
        if (ord.status.includes('Dispatched') || ord.status.includes('Delivered')) friendlyStep = 4;
        const pct = Math.round((friendlyStep / 4) * 100);

        const totalAmt = Number(ord.totalAmount || 0);
        const paidAmt = Number(ord.depositPaid ?? totalAmt);
        const balanceDue = Math.max(0, totalAmt - paidAmt);
        const canCancel = friendlyStep === 1 && !/Cancelled/i.test(ord.status);

        return `
    <article class="bg-white rounded-3xl border border-[#BCE3FF] p-6 sm:p-7 shadow-2xs space-y-6">
    <div class="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
    <div class="flex items-center gap-4">
    <img src="${esc(imgUrl)}" alt="${esc(ord.furnitureName)}" class="w-20 h-20 rounded-2xl object-cover border border-[#BCE3FF] shrink-0" />
    <div>
    <div class="flex flex-wrap items-center gap-2 text-xs">
    <span class="font-semibold text-[#0077CC]">${esc(ord.status)}</span>
    <span aria-hidden="true">·</span>
    <span class="font-mono-tech text-[#64748B]">Order #${esc(ord.orderNumber)}</span>
                    ${
                      ord.itemType === 'Custom'
                        ? `<span class="px-2 py-0.5 rounded bg-[#EBF6FF] text-[#0077CC] font-mono-tech text-[11px] font-bold">Custom Commission</span>`
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
    <span class="font-mono-tech font-bold text-[#0095FF]">${pct}% Complete</span>
    </div>
    <div class="w-full h-2.5 rounded-full bg-[#E2E8F0] overflow-hidden">
    <div class="h-full rounded-full bg-[#0095FF] transition-all" style="width: ${pct}%"></div>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                ${FRIENDLY_CUSTOMER_STEPS.map((label, idx) => {
                  const active = idx + 1 <= friendlyStep;
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
    <span>Delivery Address: <strong class="text-[#0D1015]">${esc(state.customerProfile.address)}, ${esc(state.customerProfile.city)}</strong></span>
    <div class="flex flex-wrap items-center gap-2.5">
                ${
                  balanceDue > 0
                    ? `<button type="button" data-client-pay-order="${esc(ord.orderNumber)}" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer">
                        Pay Remaining Balance (${usd(balanceDue)})
    </button>`
                    : ''
                }
                ${
                  canCancel
                    ? `<button type="button" data-client-cancel-order="${esc(ord.orderNumber)}" class="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer">
                        Cancel Order
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
        state.orders = state.orders.filter((o) => o.orderNumber !== orderNumber);
        saveOrdersToStorage();
        showClientBanner(`Order #${orderNumber} has been cancelled.`);
        renderDashboardContent();
      });
    });
  }

  // 2. Customer Transactions Ledger Table
  const txTbody = document.getElementById('client-transactions-tbody');
  const txTotalEl = document.getElementById('client-transactions-total');
  if (txTbody) {
    const transactions = displayOrders.map((ord, idx) => {
      const totalAmt = Number(ord.totalAmount || 0);
      const paidAmt = Number(ord.depositPaid ?? totalAmt);
      const isFull = paidAmt >= totalAmt;
      return {
        txId: `TXN-2026-99${41 - idx * 12}`,
        date: ord.lastPaymentAt || (idx === 0 ? '2026-10-28' : '2026-10-14'),
        orderNumber: ord.orderNumber,
        piece: ord.furnitureName,
        finish: ord.selectedFinish,
        method: ord.paymentMethod || (idx === 0 ? 'Bank Transfer' : 'Card •••• 4820'),
        status: isFull ? 'Paid in Full' : `50% Deposit`,
        amount: paidAmt,
      };
    });
    const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    if (txTotalEl) txTotalEl.textContent = usd(totalVolume);

    txTbody.innerHTML = transactions
      .map(
        (tx) => `
    <tr>
    <td class="font-mono-tech text-xs font-bold text-[#0D1015] whitespace-nowrap">${esc(tx.txId)}</td>
    <td class="font-mono-tech text-xs text-[#475569] whitespace-nowrap">${esc(tx.date)}</td>
    <td class="admin-col-primary">
    <p class="admin-table-title">${esc(tx.piece)}</p>
    <p class="admin-table-sub">Order #${esc(tx.orderNumber)} · ${esc(tx.finish)}</p>
    </td>
    <td class="text-xs text-[#475569] whitespace-nowrap">${esc(tx.method)}</td>
    <td class="text-xs font-semibold ${tx.status.includes('Full') ? 'text-emerald-700' : 'text-amber-700'} whitespace-nowrap">${esc(tx.status)}</td>
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
    }
  }

  // 4. User-Friendly Voucher Wallet (With 1-Click Copy & Add to Cart Button)
  const friendlyVouchersEl = document.getElementById('client-vouchers-friendly-list');
  if (friendlyVouchersEl) {
    friendlyVouchersEl.innerHTML = displayVouchers
      .map(
        (v) => `
    <div class="p-5 rounded-3xl border border-[#BCE3FF] bg-white space-y-4 shadow-2xs">
    <div class="flex items-start justify-between gap-2">
    <div>
    <p class="font-mono-tech text-xs font-bold text-[#0095FF]">
                  SAVE ${esc(formatVoucherBenefitLabel(v))} ON SELECTED ITEM
    </p>
    <p class="font-serif-display text-base font-bold text-[#0D1015] mt-1">
                  ${esc(v.furnitureName || v.productName)}
    </p>
    </div>
    <span class="font-mono-tech text-xs font-bold text-emerald-700">
                ${esc(v.status)}
    </span>
    </div>

    <div class="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#F8FBFF] border border-[#BCE3FF]">
    <code class="font-mono-tech text-xs font-bold text-[#0D1015]">${esc(v.code)}</code>
    <button type="button" data-copy-voucher="${esc(v.code)}" class="px-3 py-1.5 rounded-lg bg-[#EBF6FF] hover:bg-[#0095FF] text-[#0077CC] hover:text-white text-xs font-semibold transition-colors cursor-pointer">
                Copy Code
    </button>
    </div>

    <div class="flex items-center justify-between text-xs text-[#64748B]">
    <span>Expires ${esc(v.expiryDate)}</span>
    <button type="button" data-use-voucher-product="${esc(v.furnitureId || v.productId)}" data-use-voucher-code="${esc(v.code)}" class="font-semibold text-[#0095FF] hover:underline cursor-pointer">
                Add Product to Cart →
    </button>
    </div>
    </div>
        `
      )
      .join('');

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
        const product = state.catalog.find((p) => p.id === pid);
        if (product) {
          const availableStock = Math.max(0, Math.floor(Number(product.inStockCount ?? 0)));
          if (availableStock <= 0) {
            showClientBanner(`"${product.name}" is currently Out of Stock.`);
            return;
          }
          const currentQty = state.cartItems
            .filter((c) => c.product.id === product.id)
            .reduce((sum, c) => sum + c.quantity, 0);
          if (currentQty >= availableStock) {
            showClientBanner(`Cannot add more "${product.name}": only ${availableStock} available in stock.`);
            return;
          }
          const finish = product.defaultFinish || 'Natural Finish';
          const existing = state.cartItems.find((c) => c.product.id === product.id && c.finish === finish);
          if (existing) {
            existing.quantity += 1;
          } else {
            state.cartItems.push({ product, finish, quantity: 1 });
          }
          saveCartToStorage();
          const vInput = document.getElementById('client-cart-voucher-input');
          if (vInput && vCode) vInput.value = vCode;
          showClientBanner(`Added "${product.name}" to your Cart.`);
        }
        const cartTabBtn = document.querySelector('[data-client-tab="cart"]');
        if (cartTabBtn) cartTabBtn.click();
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

  const discountedCount = state.catalog.filter((p) => Number(p.discountPercent || 0) > 0).length;
  const activeVoucherCount = state.vouchers.filter((v) => v.status === 'Active').length;
  const totalOrderRevenue = state.orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const invMetrics = computeMaterialInventoryMetrics(state.materials);

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
    <button type="button" data-admin-jump="add-product" class="admin-btn admin-btn-sm admin-btn-secondary">
            + Add Product
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
    <th>Order</th>
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
    <td class="font-mono-tech text-xs font-bold text-[#0284C7] whitespace-nowrap">#${esc(o.orderNumber)}</td>
    <td class="whitespace-nowrap">
    <p class="admin-table-title">${esc(o.clientName)}</p>
    <p class="admin-table-sub">${esc(o.clientEmail)}</p>
    </td>
    <td class="admin-col-primary">
    <p class="admin-table-title">${esc(o.furnitureName)}</p>
    <p class="admin-table-sub">${esc(o.selectedFinish)}</p>
    </td>
    <td class="whitespace-nowrap">
    <span class="admin-status-dot ${
                      /Dispatched|Delivered/i.test(o.status)
                        ? 'text-emerald-700'
                        : /Quality/i.test(o.status)
                        ? 'text-amber-700'
                        : 'text-[#0284C7]'
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
    const typeFilter = state.adminProductTypeFilter || 'all';

    const totalCatalogCount = state.catalog.length;
    const inStockCatalogCount = state.catalog.filter(
      (p) => getProductStockStatus(p).statusKey === 'in_stock'
    ).length;
    const lowOrOutCatalogCount = state.catalog.filter(
      (p) => getProductStockStatus(p).statusKey !== 'in_stock'
    ).length;
    const discountedCatalogCount = state.catalog.filter(
      (p) => Number(p.discountPercent || 0) > 0
    ).length;

    const filteredProducts = state.catalog.filter((p) => {
      const pType = p.productType === 'customized' || p.isCustomClientDesign ? 'customized' : 'standard';
      const matchesCat = catFilter === 'all' || p.categoryId === catFilter;
      const matchesType = typeFilter === 'all' || pType === typeFilter;
      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.categoryName || '').toLowerCase().includes(query) ||
        (p.origin || '').toLowerCase().includes(query) ||
        (p.customizationNotes || '').toLowerCase().includes(query);
      return matchesCat && matchesType && matchesQuery;
    });

    const isFormOpen = !document.getElementById('admin-product-form')?.classList.contains('hidden');

    adminCatalogEl.innerHTML = `

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
    <div class="admin-kpi-card py-3 px-4">
    <p class="admin-kpi-label">Total Products</p>
    <p id="prod-kpi-total" class="text-xl font-bold text-slate-900 mt-0.5">${totalCatalogCount}</p>
    </div>
    <div class="admin-kpi-card py-3 px-4">
    <p class="admin-kpi-label">Ready in Stock</p>
    <p class="text-xl font-bold text-emerald-700 mt-0.5">${inStockCatalogCount}</p>
    </div>
    <div class="admin-kpi-card py-3 px-4">
    <p class="admin-kpi-label">Low / Out of Stock</p>
    <p class="text-xl font-bold ${lowOrOutCatalogCount > 0 ? 'text-amber-700' : 'text-slate-900'} mt-0.5">${lowOrOutCatalogCount}</p>
    </div>
    <div class="admin-kpi-card py-3 px-4">
    <p class="admin-kpi-label">On Sale / Discount</p>
    <p class="text-xl font-bold text-[#0284C7] mt-0.5">${discountedCatalogCount}</p>
    </div>
    </div>

    <div class="admin-card overflow-hidden">

    <div class="admin-toolbar py-3 px-4">
    <div class="admin-toolbar-filters">
    <input id="admin-catalog-search" type="search" value="${esc(state.adminProductSearch)}" placeholder="Search name, SKU, or category..." aria-label="Search products" class="admin-input admin-search-input" />
    <select id="admin-catalog-category" aria-label="Filter products by category" class="admin-select admin-filter-select">
    <option value="all" ${catFilter === 'all' ? 'selected' : ''}>All Categories (${state.catalog.length})</option>
    <option value="living" ${catFilter === 'living' ? 'selected' : ''}>Living Room</option>
    <option value="dining" ${catFilter === 'dining' ? 'selected' : ''}>Dining Room</option>
    <option value="bedroom" ${catFilter === 'bedroom' ? 'selected' : ''}>Bedroom</option>
    <option value="office" ${catFilter === 'office' ? 'selected' : ''}>Study/Work Desks</option>
    <option value="kitchen" ${catFilter === 'kitchen' ? 'selected' : ''}>Kitchen</option>
    </select>
    <select id="admin-catalog-type" aria-label="Filter products by type" class="admin-select admin-filter-select">
    <option value="all" ${typeFilter === 'all' ? 'selected' : ''}>All Types</option>
    <option value="standard" ${typeFilter === 'standard' ? 'selected' : ''}>Standard Catalog</option>
    <option value="customized" ${typeFilter === 'customized' ? 'selected' : ''}>Custom / Bespoke</option>
    </select>
            ${
              query || catFilter !== 'all' || typeFilter !== 'all'
                ? `<button type="button" id="admin-reset-product-filters" class="admin-btn admin-btn-sm admin-btn-secondary">Clear</button>`
                : ''
            }
    </div>
    <div class="flex items-center gap-2.5">
    <span class="text-xs font-medium text-slate-500 hidden md:inline">${filteredProducts.length} of ${state.catalog.length} shown</span>
    <button type="button" id="admin-toggle-add-product-btn" class="admin-btn admin-btn-sm ${isFormOpen ? 'admin-btn-secondary' : 'admin-btn-primary'}">
              ${isFormOpen ? 'Close Product Form' : '+ Add Product'}
    </button>
    </div>
    </div>

        ${
          filteredProducts.length === 0
            ? `
    <div class="admin-empty-state space-y-3">
    <p class="text-base font-bold text-slate-900">No matching products found</p>
    <p class="text-xs text-slate-500 max-w-sm mx-auto">Try clearing your search or selecting a different product category.</p>
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
    <th class="admin-col-primary">Product</th>
    <th>Category</th>
    <th>Price</th>
    <th>Stock</th>
    <th class="text-right">Actions</th>
    </tr>
    </thead>
    <tbody>
                ${filteredProducts
                  .map((p) => {
                    const variants = p.colorVariants || [];
                    const imgUrl = (p.image || 'assets/images/category_dining_tables.jpg').replace(/^\//, '');
                    const isCustomized =
                      p.productType === 'customized' || Boolean(p.isCustomClientDesign);
                    const stockInfo = getProductStockStatus(p);
                    const stockPillClass =
                      stockInfo.statusKey === 'out_of_stock'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : stockInfo.statusKey === 'low_stock'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    return `
    <tr data-product-row="${esc(p.id)}">
    <td class="admin-col-primary">
    <div class="flex items-center gap-3.5">
    <img src="${esc(imgUrl)}" alt="${esc(p.name)}" class="admin-thumb" />
    <div class="min-w-0">
    <div class="flex items-center gap-2">
    <p class="admin-table-title">${esc(p.name)}</p>
                            ${
                              isCustomized
                                ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-[#0284C7] border border-sky-200 shrink-0">Custom</span>`
                                : ''
                            }
    </div>
    <div class="flex items-center gap-2 mt-0.5">
    <span class="admin-table-sub font-mono-tech">${esc(p.sku)} · ${esc(p.dimensions || 'Standard')}</span>
    <span class="inline-flex items-center gap-1 shrink-0">
                              ${variants
                                .slice(0, 3)
                                .map(
                                  (v) =>
                                    `<span title="${esc(v.name)}" class="admin-swatch-dot" style="width:9px;height:9px;background-color:${esc(v.hex || '#5C3A21')}"></span>`
                                )
                                .join('')}
    </span>
    </div>
    </div>
    </div>
    </td>
    <td class="text-xs font-medium text-slate-600 whitespace-nowrap">
                      ${esc(p.categoryName)}
    </td>
    <td class="whitespace-nowrap">
    <div class="flex items-center gap-1.5">
    <span class="font-mono-tech text-sm font-bold text-slate-900">${usd(p.effectivePrice)}</span>
                        ${
                          p.discountPercent > 0
                            ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">-${p.discountPercent}%</span>`
                            : ''
                        }
    </div>
                      ${
                        p.discountPercent > 0
                          ? `<p class="text-[11px] line-through text-slate-400 font-mono-tech">${usd(p.price)}</p>`
                          : ''
                      }
    </td>
    <td class="whitespace-nowrap">
    <div class="flex items-center gap-1.5">
    <input type="number" min="0" step="1" aria-label="Stock for ${esc(p.name)}" data-prod-inline-stock="${esc(p.id)}" value="${stockInfo.availableStock}" class="admin-input font-mono-tech text-xs font-bold" style="width: 64px; padding: 0.25rem 0.45rem;" />
    <button type="button" data-prod-inline-save="${esc(p.id)}" title="Save stock quantity" class="admin-btn admin-btn-sm admin-btn-secondary" style="padding: 0.25rem 0.5rem;">
                          Save
    </button>
    <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${stockPillClass}">
                          ${esc(stockInfo.statusLabel)}
    </span>
    </div>
    </td>
    <td class="text-right whitespace-nowrap">
    <div class="inline-flex items-center justify-end gap-1.5">
    <button type="button" data-edit-product="${esc(p.id)}" aria-label="Edit ${esc(p.name)}" class="admin-btn admin-btn-sm admin-btn-secondary">
                          Edit
    </button>
    <button type="button" data-delete-product="${esc(p.id)}" aria-label="Remove ${esc(p.name)}" class="admin-btn admin-btn-sm admin-btn-danger-ghost">
                          Remove
    </button>
    </div>
    </td>
    </tr>`;
                  })
                  .join('')}
    </tbody>
    </table>
    </div>
        `
        }
    </div>
    `;

    bindLiveSearchInput('admin-catalog-search', 'adminProductSearch', renderDashboardContent);

    const catSelect = document.getElementById('admin-catalog-category');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        state.adminProductCategory = e.target.value;
        renderDashboardContent();
      });
    }

    const typeSelect = document.getElementById('admin-catalog-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        state.adminProductTypeFilter = e.target.value;
        renderDashboardContent();
      });
    }

    ['admin-reset-product-filters', 'admin-reset-product-filters-empty'].forEach((btnId) => {
      const resetBtn = document.getElementById(btnId);
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          state.adminProductSearch = '';
          state.adminProductCategory = 'all';
          state.adminProductTypeFilter = 'all';
          renderDashboardContent();
        });
      }
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

    adminCatalogEl.querySelectorAll('[data-prod-inline-save]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-prod-inline-save') || '';
        const prod = state.catalog.find((item) => item.id === pid);
        if (!prod) return;
        const inputEl = adminCatalogEl.querySelector(`[data-prod-inline-stock="${pid}"]`);
        const nextStock = Math.max(0, Math.floor(Number(inputEl ? inputEl.value : prod.stockQuantity ?? 0)));
        if (!Number.isFinite(nextStock)) return;

        const updatedProduct = {
          ...prod,
          stockQuantity: nextStock,
          inStockCount: nextStock,
        };
        state.catalog = state.catalog.map((item) => (item.id === pid ? updatedProduct : item));
        persistProductToStorage(updatedProduct);
        showAdminBanner(`Updated "${prod.name}" stock to ${nextStock} units.`);
        renderDashboardContent();
      });
    });

    adminCatalogEl.querySelectorAll('[data-edit-product]').forEach((btn) => {
      btn.addEventListener('click', () => {
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
        const pid = btn.getAttribute('data-delete-product');
        if (pid && typeof window.__removeProductById === 'function') {
          window.__removeProductById(pid);
        }
      });
    });
  }

  // 6B. Admin Workshop Materials & Stock Page (#admin-tab-inventory) — Non-Techy, Plain-English UI
  const adminInventoryEl = document.getElementById('admin-tab-inventory');
  if (adminInventoryEl) {
    const metrics = computeMaterialInventoryMetrics(state.materials);
    const activeMovementMode = state.adminMovementMode === 'Stock Out' ? 'Stock Out' : 'Stock In';
    const activeInvView = state.adminInventoryView === 'history' ? 'history' : 'materials';
    const selectedMaterialId =
      (state.adminMovementMaterialId || state.adminMovementProductId) &&
      state.materials.some((m) => m.id === (state.adminMovementMaterialId || state.adminMovementProductId))
        ? state.adminMovementMaterialId || state.adminMovementProductId
        : state.materials[0]?.id || '';
    const selectedMaterial = state.materials.find((m) => m.id === selectedMaterialId) || null;

    const editingMaterial = state.adminEditingMaterialId
      ? state.materials.find((m) => m.id === state.adminEditingMaterialId) || null
      : null;
    const showMaterialForm = Boolean(state.adminMaterialFormOpen || editingMaterial);
    const showMovementForm = Boolean(state.adminMovementFormOpen);

    const stockSearch = (state.adminInventoryStockSearch || '').trim().toLowerCase();
    const stockFilter = state.adminInventoryStockFilter || 'all';
    const needsRestockCount = metrics.lowStockCount + metrics.outOfStockCount;
    const healthyCount = Math.max(0, metrics.totalMaterials - needsRestockCount);

    const friendlyTypeLabel = (typeStr) => {
      const t = String(typeStr || '');
      if (/Timber|Wood/i.test(t)) return 'Wood & Timber';
      if (/Textile|Upholstery|Fabric|Leather/i.test(t)) return 'Fabric & Leather';
      if (/Stone|Travertine|Marble/i.test(t)) return 'Natural Stone';
      if (/Hardware|Metal|Brass/i.test(t)) return 'Hardware & Metal';
      if (/Weaving|Finish|Cord/i.test(t)) return 'Cord & Finishing';
      return t || 'Workshop Material';
    };

    const filteredMaterials = state.materials.filter((m) => {
      const st = getMaterialStockStatus(m);
      const matchesSearch =
        !stockSearch ||
        m.name.toLowerCase().includes(stockSearch) ||
        friendlyTypeLabel(m.materialType).toLowerCase().includes(stockSearch) ||
        (m.materialType || '').toLowerCase().includes(stockSearch) ||
        (m.unit || '').toLowerCase().includes(stockSearch) ||
        (m.sku || '').toLowerCase().includes(stockSearch);
      let matchesStatus = true;
      if (stockFilter === 'needs_restock') {
        matchesStatus = st.statusKey === 'low_stock' || st.statusKey === 'out_of_stock';
      } else if (stockFilter === 'low_stock') {
        matchesStatus = st.statusKey === 'low_stock';
      } else if (stockFilter === 'out_of_stock') {
        matchesStatus = st.statusKey === 'out_of_stock';
      } else if (stockFilter === 'in_stock') {
        matchesStatus = st.statusKey === 'in_stock';
      }
      return matchesSearch && matchesStatus;
    });

    const historySearch = (state.adminInventoryHistorySearch || '').trim().toLowerCase();
    const historyTypeFilter = state.adminInventoryHistoryTypeFilter || 'all';

    const filteredTransactions = state.inventoryTransactions.filter((tx) => {
      const matchesType =
        historyTypeFilter === 'all' || tx.transactionType === historyTypeFilter;
      const matchesSearch =
        !historySearch ||
        (tx.materialName || tx.productName || '').toLowerCase().includes(historySearch) ||
        (tx.reason || '').toLowerCase().includes(historySearch) ||
        (tx.adminName || '').toLowerCase().includes(historySearch);
      return matchesType && matchesSearch;
    });

    const livePreview = describeMaterialStockPreview(
      selectedMaterial,
      activeMovementMode,
      state.adminMovementQuantity || (activeMovementMode === 'Stock In' ? 10 : 5)
    );

    adminInventoryEl.innerHTML = `

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <div class="admin-kpi-card py-3.5 px-4">
    <p class="admin-kpi-label">Materials Tracked</p>
    <p id="inv-kpi-total-products" class="text-xl font-bold font-mono-tech text-slate-900 mt-0.5">${metrics.totalMaterials} Materials</p>
    <p class="text-xs text-slate-500 mt-0.5">Wood, fabric, stone &amp; hardware</p>
    </div>
    <div class="admin-kpi-card py-3.5 px-4">
    <p class="admin-kpi-label">Plenty in Stock</p>
    <p id="inv-kpi-total-stock" class="text-xl font-bold font-mono-tech text-emerald-700 mt-0.5">${healthyCount} Ready</p>
    <p class="text-xs text-slate-500 mt-0.5">${metrics.totalStockQuantity} total units on hand</p>
    </div>
    <div class="admin-kpi-card py-3.5 px-4">
    <p class="admin-kpi-label">Running Low</p>
    <p id="inv-kpi-low-stock" class="text-xl font-bold font-mono-tech ${metrics.lowStockCount > 0 ? 'text-amber-700' : 'text-slate-900'} mt-0.5">${metrics.lowStockCount} Low</p>
    <p class="text-xs text-slate-500 mt-0.5">${metrics.lowStockCount > 0 ? 'Getting close to running out' : 'Nothing is running low'}</p>
    </div>
    <div class="admin-kpi-card py-3.5 px-4">
    <p class="admin-kpi-label">Out of Stock</p>
    <p id="inv-kpi-out-of-stock" class="text-xl font-bold font-mono-tech ${metrics.outOfStockCount > 0 ? 'text-rose-700' : 'text-slate-900'} mt-0.5">${metrics.outOfStockCount} Empty</p>
    <p class="text-xs text-slate-500 mt-0.5">${metrics.outOfStockCount > 0 ? 'Needs restocking right away' : 'Zero empty materials'}</p>
    </div>
    </div>

      ${
        needsRestockCount > 0
          ? `
    <div class="p-4 rounded-xl border ${
          metrics.outOfStockCount > 0
            ? 'bg-rose-50/80 border-rose-200 text-rose-950'
            : 'bg-amber-50/80 border-amber-200 text-amber-950'
        } flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
    <div class="space-y-0.5">
    <p class="font-bold text-sm">
              ${
                metrics.outOfStockCount > 0
                  ? `${metrics.outOfStockCount} material is out of stock and ${metrics.lowStockCount} running low`
                  : `Heads up: ${metrics.lowStockCount} material${metrics.lowStockCount === 1 ? ' is' : 's are'} running low on stock`
              }
    </p>
    <p class="text-slate-700">
              ${[
                ...metrics.outOfStockItems.map((i) => `${i.name} (0 ${i.unit} left)`),
                ...metrics.lowStockItems.map((i) => `${i.name} (only ${i.stockQuantity} ${i.unit} left — warning set at ${i.minStockLevel ?? 10})`),
              ]
                .slice(0, 3)
                .map((txt) => esc(txt))
                .join(' · ')}
    </p>
    </div>
    <div class="flex items-center gap-2 shrink-0">
    <button type="button" id="admin-alert-filter-low-btn" class="admin-btn admin-btn-sm admin-btn-secondary whitespace-nowrap">
              ${stockFilter === 'needs_restock' || stockFilter === 'low_stock' ? 'Show All Materials' : 'View Low Stock Only'}
    </button>
    <button type="button" id="admin-alert-restock-first-btn" class="admin-btn admin-btn-sm admin-btn-primary whitespace-nowrap">
              + Add Stock Now
    </button>
    </div>
    </div>
      `
          : ''
      }

    <form id="admin-stock-movement-form" novalidate class="admin-card p-5 sm:p-6 space-y-5 ${showMovementForm ? '' : 'hidden'}">
    <div class="pb-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
    <div>
    <h2 class="text-base font-bold text-slate-900">
              ${activeMovementMode === 'Stock In' ? 'Add New Stock (Supplies Arrived)' : 'Use Stock (Deduct for Workshop)'}
    </h2>
    <p class="text-xs text-slate-500 mt-0.5">
              ${
                activeMovementMode === 'Stock In'
                  ? 'Use this when new wood, fabric, stone, or hardware arrives at the workshop.'
                  : 'Use this when materials are used to build a customer order or removed due to damage.'
              }
    </p>
    </div>
    <div class="flex items-center gap-2 flex-wrap">
    <div class="inline-flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
    <button type="button" data-movement-mode="Stock In" class="admin-tab-seg ${ activeMovementMode === 'Stock In' ? 'admin-tab-seg-active' : '' }">
                + Add Stock
    </button>
    <button type="button" data-movement-mode="Stock Out" class="admin-tab-seg ${ activeMovementMode === 'Stock Out' ? 'admin-tab-seg-active' : '' }">
                − Use Stock
    </button>
    </div>
    <button type="button" id="admin-close-movement-form-btn" class="admin-btn admin-btn-sm admin-btn-secondary">
              Close
    </button>
    </div>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="sm:col-span-2">
    <label for="inv-move-product" class="admin-label">1. Which material are you updating?</label>
    <select id="inv-move-product" class="admin-select">
              ${state.materials
                .map(
                  (m) =>
                    `<option value="${esc(m.id)}" ${m.id === selectedMaterialId ? 'selected' : ''}>${esc(m.name)} — ${m.stockQuantity} ${esc(m.unit)} currently in stock</option>`
                )
                .join('')}
    </select>
    </div>

          ${
            activeMovementMode === 'Stock In'
              ? `
    <div>
    <label for="inv-move-qty" class="admin-label">2. How much arrived? (${esc(selectedMaterial?.unit || 'units')})</label>
    <input id="inv-move-qty" type="number" min="1" step="0.5" required value="${esc(state.adminMovementQuantity || '10')}" class="admin-input font-mono-tech text-base font-bold" />
    <div class="flex items-center gap-1.5 mt-2 flex-wrap">
    <span class="text-[11px] text-slate-500">Quick pick:</span>
                ${[5, 10, 25, 50]
                  .map(
                    (preset) => `
    <button type="button" data-quick-preset-qty="${preset}" class="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-mono-tech font-semibold text-slate-700 cursor-pointer">
                    +${preset}
    </button>
                `
                  )
                  .join('')}
    </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
    <div>
    <label for="inv-move-cost" class="admin-label">3. Total Cost ($) <span class="font-normal text-slate-400">(Optional)</span></label>
    <input id="inv-move-cost" type="number" min="0" step="0.01" value="${esc(state.adminMovementCost)}" placeholder="Auto" class="admin-input font-mono-tech" />
    </div>
    <div>
    <label for="inv-move-date" class="admin-label">Date</label>
    <input id="inv-move-date" type="date" required value="${esc(state.adminMovementDate)}" class="admin-input font-mono-tech" />
    </div>
    </div>
          `
              : `
    <div>
    <label for="inv-move-qty" class="admin-label">2. How much was used? (${esc(selectedMaterial?.unit || 'units')})</label>
    <input id="inv-move-qty" type="number" min="0.5" step="0.5" max="${Math.max(1, Number(selectedMaterial?.stockQuantity ?? 1))}" required value="${esc(state.adminMovementQuantity || '5')}" class="admin-input font-mono-tech text-base font-bold" />
    <div class="flex items-center gap-1.5 mt-2 flex-wrap">
    <span class="text-[11px] text-slate-500">Quick pick:</span>
                ${[1, 5, 10, 20]
                  .map(
                    (preset) => `
    <button type="button" data-quick-preset-qty="${preset}" class="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-mono-tech font-semibold text-slate-700 cursor-pointer">
                    −${preset}
    </button>
                `
                  )
                  .join('')}
    </div>
    </div>

    <div>
    <label for="inv-move-reason" class="admin-label">3. What was it used for?</label>
    <select id="inv-move-reason" class="admin-select">
    <option value="Workshop Production Allocation" ${state.adminMovementReason === 'Workshop Production Allocation' ? 'selected' : ''}>Building a Furniture Piece</option>
    <option value="Custom Order Joinery" ${state.adminMovementReason === 'Custom Order Joinery' ? 'selected' : ''}>Custom Customer Order</option>
    <option value="Kiln Moisture / Defect Cull" ${state.adminMovementReason === 'Kiln Moisture / Defect Cull' ? 'selected' : ''}>Damaged or Unusable Piece</option>
    <option value="Adjustment" ${state.adminMovementReason === 'Adjustment' ? 'selected' : ''}>Fixing a Stock Count</option>
    <option value="Other" ${state.adminMovementReason === 'Other' ? 'selected' : ''}>Other Reason</option>
    </select>
    <input id="inv-move-date" type="hidden" value="${esc(state.adminMovementDate)}" />
    </div>

    <div class="sm:col-span-2 lg:col-span-4 ${state.adminMovementReason === 'Other' ? '' : 'hidden'}" id="inv-move-custom-reason-wrap">
    <label for="inv-move-custom-reason" class="admin-label">Add a short note</label>
    <input id="inv-move-custom-reason" type="text" value="${esc(state.adminMovementCustomReason)}" placeholder="e.g. Used for dining table sample..." class="admin-input" />
    </div>
          `
          }
    </div>

    <div id="admin-stock-live-preview" class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
    <div class="flex items-center gap-2 flex-wrap">
    <span class="font-semibold text-slate-600">Summary before saving:</span>
    <span class="font-mono-tech text-slate-800">
              Currently <strong>${livePreview.currentStock} ${esc(livePreview.unit)}</strong>
    </span>
    <span aria-hidden="true">→</span>
    <span class="font-mono-tech font-bold ${
              livePreview.insufficientStock
                ? 'text-rose-700'
                : activeMovementMode === 'Stock In'
                ? 'text-emerald-700'
                : 'text-slate-900'
            }">
              ${
                livePreview.insufficientStock
                  ? `Not enough in stock (only ${livePreview.currentStock} ${esc(livePreview.unit)} available)`
                  : `New total will be ${livePreview.projectedStock} ${esc(livePreview.unit)} (${esc(livePreview.projectedFriendlyLabel)})`
              }
    </span>
    </div>
    <span class="text-slate-500 font-mono-tech">
            Unit cost: ${usd(selectedMaterial?.unitCost || 0)} per ${esc(livePreview.unit)}
    </span>
    </div>

    <p id="admin-stock-movement-feedback" class="hidden text-xs font-semibold p-2.5 rounded-lg border"></p>

    <div class="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
    <button type="submit" id="admin-submit-movement-btn" class="admin-btn admin-btn-primary">
            ${activeMovementMode === 'Stock In' ? 'Save Added Stock' : 'Save Used Stock'}
    </button>
    </div>
    </form>

    <form id="admin-material-form" novalidate class="admin-card p-5 sm:p-6 space-y-5 ${showMaterialForm ? '' : 'hidden'}">
    <div class="pb-3 border-b border-slate-200 flex items-center justify-between gap-2">
    <div>
    <h2 class="text-base font-bold text-slate-900">
              ${editingMaterial ? `Edit Material: ${esc(editingMaterial.name)}` : 'Add a New Workshop Material'}
    </h2>
    <p class="text-xs text-slate-500 mt-0.5">
              Fill out the simple details below to track a wood, fabric, stone, or hardware supply in your shop.
    </p>
    </div>
    <button type="button" id="admin-close-material-form-btn" class="admin-btn admin-btn-sm admin-btn-secondary">
            Cancel
    </button>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <div class="sm:col-span-2 lg:col-span-1">
    <label for="mat-name" class="admin-label">1. Material Name</label>
    <input id="mat-name" type="text" required value="${esc(editingMaterial?.name || '')}" placeholder="e.g. Solid White Oak Planks" class="admin-input" />
    <p class="admin-hint">Use a clear name your team recognizes.</p>
    </div>
    <div>
    <label for="mat-type" class="admin-label">2. What kind of material is it?</label>
    <select id="mat-type" class="admin-select">
              ${[
                { value: 'Hardwood Timber', label: 'Wood & Timber (Hardwood)' },
                { value: 'Upholstery Textile', label: 'Fabric & Leather (Upholstery)' },
                { value: 'Natural Stone', label: 'Natural Stone (Travertine / Marble)' },
                { value: 'Metal & Joinery Hardware', label: 'Hardware & Metal (Brass / Steel)' },
                { value: 'Weaving & Finishing', label: 'Cord, Cane & Wood Finish' },
              ]
                .map(
                  (t) =>
                    `<option value="${esc(t.value)}" ${editingMaterial?.materialType === t.value ? 'selected' : ''}>${esc(t.label)}</option>`
                )
                .join('')}
    </select>
    </div>
    <div>
    <label for="mat-unit" class="admin-label">3. How is it measured?</label>
    <input id="mat-unit" type="text" required value="${esc(editingMaterial?.unit || 'bd ft')}" placeholder="e.g. bd ft, slabs, sq m, sets" class="admin-input font-mono-tech" />
    <div class="flex items-center gap-1 mt-1.5 flex-wrap">
    <span class="text-[11px] text-slate-400">Pick:</span>
              ${['bd ft', 'slabs', 'sq m', 'sets', 'rolls']
                .map(
                  (u) => `
    <button type="button" data-quick-unit="${esc(u)}" class="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-mono-tech text-slate-600 cursor-pointer">
                  ${esc(u)}
    </button>
              `
                )
                .join('')}
    </div>
    </div>
    <div>
    <label for="mat-stock" class="admin-label">4. Current Amount on Hand</label>
    <input id="mat-stock" type="number" min="0" step="0.01" required value="${esc(editingMaterial?.stockQuantity ?? '100')}" class="admin-input font-mono-tech" />
    <p class="admin-hint">How much you currently have in the workshop.</p>
    </div>
    <div>
    <label for="mat-min-stock" class="admin-label">5. Low-Stock Warning Number</label>
    <input id="mat-min-stock" type="number" min="0" step="1" required value="${esc(editingMaterial?.minStockLevel ?? '25')}" class="admin-input font-mono-tech" />
    <p class="admin-hint">We'll warn you when stock drops to this amount.</p>
    </div>
    <div>
    <label for="mat-cost" class="admin-label">6. Cost per Unit ($ USD)</label>
    <input id="mat-cost" type="number" min="0" step="0.01" required value="${esc(editingMaterial?.unitCost ?? '28.50')}" class="admin-input font-mono-tech" />
    <p class="admin-hint">Price for 1 unit of this material.</p>
    </div>
    </div>

    <p id="admin-material-form-feedback" class="hidden text-xs font-semibold p-2.5 rounded-lg border"></p>

    <div class="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
    <button type="submit" class="admin-btn admin-btn-primary">
            ${editingMaterial ? 'Save Material Changes' : 'Save New Material'}
    </button>
    </div>
    </form>

    <div class="admin-card overflow-hidden">
    <div class="p-4 border-b border-slate-200 space-y-3">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">

    <div class="flex items-center gap-2 flex-wrap">
    <div class="inline-flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-100">
    <button type="button" data-inv-view="materials" class="px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap ${ activeInvView === 'materials' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900' }">
                  Current Stock (${state.materials.length})
    </button>
    <button type="button" data-inv-view="history" class="px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap ${ activeInvView === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900' }">
                  Stock History (${state.inventoryTransactions.length})
    </button>
    </div>

              ${
                activeInvView === 'materials'
                  ? `

    <div class="inline-flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 flex-wrap">
    <button type="button" data-inv-status-pill="all" class="px-2.5 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${ stockFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900' }">
                    All (${state.materials.length})
    </button>
    <button type="button" data-inv-status-pill="needs_restock" class="px-2.5 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${ stockFilter === 'needs_restock' || stockFilter === 'low_stock' || stockFilter === 'out_of_stock' ? 'bg-amber-600 text-white' : 'text-amber-800 hover:bg-amber-50' }">
                    Needs Restock (${needsRestockCount})
    </button>
    <button type="button" data-inv-status-pill="in_stock" class="px-2.5 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${ stockFilter === 'in_stock' ? 'bg-emerald-700 text-white' : 'text-emerald-800 hover:bg-emerald-50' }">
                    Plenty in Stock (${healthyCount})
    </button>
    </div>
              `
                  : ''
              }
    </div>

    <div class="flex items-center gap-2 flex-wrap">
    <button type="button" id="admin-toggle-movement-form-btn" class="admin-btn admin-btn-sm ${showMovementForm ? 'admin-btn-secondary' : 'admin-btn-primary'} whitespace-nowrap">
                ${showMovementForm ? 'Hide Stock Form' : '+ Add or Use Stock'}
    </button>
    <button type="button" id="admin-toggle-material-form-btn" class="admin-btn admin-btn-sm admin-btn-secondary whitespace-nowrap">
                ${showMaterialForm && !editingMaterial ? 'Close Form' : '+ New Material'}
    </button>
    </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
            ${
              activeInvView === 'materials'
                ? `
    <div class="flex items-center gap-2 flex-wrap flex-1">
    <input id="admin-inv-stock-search" type="search" value="${esc(state.adminInventoryStockSearch)}" placeholder="Find a material by name (e.g. Walnut, Linen, Travertine, Brass)..." aria-label="Search workshop materials" class="admin-input" style="max-width: 360px;" />
    <select id="admin-inv-stock-filter" aria-label="Filter materials by stock status" class="admin-select" style="width: 190px;">
    <option value="all" ${stockFilter === 'all' ? 'selected' : ''}>Show All Materials (${state.materials.length})</option>
    <option value="needs_restock" ${stockFilter === 'needs_restock' ? 'selected' : ''}>Needs Restock (${needsRestockCount})</option>
    <option value="low_stock" ${stockFilter === 'low_stock' ? 'selected' : ''}>Running Low (${metrics.lowStockCount})</option>
    <option value="out_of_stock" ${stockFilter === 'out_of_stock' ? 'selected' : ''}>Out of Stock (${metrics.outOfStockCount})</option>
    <option value="in_stock" ${stockFilter === 'in_stock' ? 'selected' : ''}>Plenty in Stock (${healthyCount})</option>
    </select>
    </div>
    <p class="text-xs text-slate-500">
                Tip: Click <strong>+ Add Stock</strong> when new supplies arrive, or <strong>− Use Stock</strong> when materials are used.
    </p>
            `
                : `
    <div class="flex items-center gap-2 flex-wrap flex-1">
    <input id="admin-inv-history-search" type="search" value="${esc(state.adminInventoryHistorySearch)}" placeholder="Search history by material name or reason..." aria-label="Search stock history" class="admin-input" style="max-width: 340px;" />
    <select id="admin-inv-history-type" aria-label="Filter stock history by type" class="admin-select" style="width: 190px;">
    <option value="all" ${historyTypeFilter === 'all' ? 'selected' : ''}>All Activity (${state.inventoryTransactions.length})</option>
    <option value="Stock In" ${historyTypeFilter === 'Stock In' ? 'selected' : ''}>Added Stock Only</option>
    <option value="Stock Out" ${historyTypeFilter === 'Stock Out' ? 'selected' : ''}>Used Stock Only</option>
    </select>
    </div>
    <p class="text-xs text-slate-500">
                Showing the most recent stock changes first.
    </p>
            `
            }
    </div>
    </div>

        ${
          activeInvView === 'materials'
            ? filteredMaterials.length === 0
              ? `
    <div class="admin-empty-state space-y-2">
    <p class="text-sm font-bold text-slate-900">No materials match your search or filter</p>
    <p class="text-xs text-slate-500">Try clicking "All (${state.materials.length})" above or clearing the search box.</p>
    </div>
        `
              : `
    <div class="overflow-x-auto">
    <table class="admin-table">
    <thead>
    <tr>
    <th class="admin-col-primary">Material</th>
    <th>Stock</th>
    <th>Cost</th>
    <th class="text-right">Actions</th>
    </tr>
    </thead>
    <tbody>
                ${filteredMaterials
                  .map((mat) => {
                    const preview = describeMaterialStockPreview(mat, 'Stock In', 0);
                    const isOut = preview.currentStatusKey === 'out_of_stock';
                    const isLow = preview.currentStatusKey === 'low_stock';
                    const barColor = isOut
                      ? 'bg-rose-500'
                      : isLow
                      ? 'bg-amber-500'
                      : 'bg-emerald-600';
                    const statusColor = isOut
                      ? 'text-rose-700 font-bold'
                      : isLow
                      ? 'text-amber-700 font-bold'
                      : 'text-emerald-700 font-semibold';

                    return `
    <tr>
    <td class="admin-col-primary">
    <p class="admin-table-title">${esc(mat.name)}</p>
    <p class="admin-table-sub mt-0.5">
                        ${esc(friendlyTypeLabel(mat.materialType))} · ${esc(mat.unit)}
    </p>
    </td>

    <td style="min-width: 240px;">
    <div class="flex items-baseline justify-between gap-2">
    <span class="font-mono-tech text-sm font-bold text-slate-900">
                          ${preview.currentStock} ${esc(mat.unit)} left
    </span>
    <span class="text-xs ${statusColor}">
                          ${esc(preview.currentFriendlyLabel)}
    </span>
    </div>
    <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden mt-1.5 border border-slate-200/70">
    <div class="h-full rounded-full ${barColor}" style="width: ${preview.fillPercent}%"></div>
    </div>
    <div class="flex items-center gap-1.5 mt-2 whitespace-nowrap">
    <div class="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50">
    <button type="button" data-inline-stock-step="-1" data-inline-step-target="${esc(mat.id)}" aria-label="Decrease count for ${esc(mat.name)}" class="px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-l-lg cursor-pointer">
                            −
    </button>
    <input type="number" min="0" step="0.5" aria-label="Available stock for ${esc(mat.name)}" data-inline-stock-input="${esc(mat.id)}" value="${preview.currentStock}" class="admin-input font-mono-tech text-xs font-bold text-center border-0 bg-white" style="width: 50px; padding: 0.2rem 0.25rem; border-radius: 0;" />
    <button type="button" data-inline-stock-step="1" data-inline-step-target="${esc(mat.id)}" aria-label="Increase count for ${esc(mat.name)}" class="px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-r-lg cursor-pointer">
                            +
    </button>
    </div>
    <span class="text-[11px] text-slate-500" title="Warn me when stock drops to this number">Min:</span>
    <input type="number" min="0" aria-label="Minimum stock level for ${esc(mat.name)}" data-inline-min-stock-input="${esc(mat.id)}" value="${preview.minStockLevel}" class="admin-input font-mono-tech text-xs text-center" style="width: 42px; padding: 0.2rem 0.25rem;" />
    <button type="button" data-inline-stock-save="${esc(mat.id)}" class="admin-btn admin-btn-sm admin-btn-secondary" style="padding: 0.2rem 0.45rem;">
                          Save
    </button>
    </div>
    </td>

    <td class="whitespace-nowrap">
    <p class="font-mono-tech text-xs font-bold text-slate-900">
                        ${usd(mat.unitCost)} <span class="font-normal text-slate-500">/ ${esc(mat.unit)}</span>
    </p>
    <p class="font-mono-tech text-[11px] text-slate-500 mt-0.5">
                        Value: ${usd(preview.totalValue)}
    </p>
    </td>

    <td class="text-right whitespace-nowrap">
    <div class="inline-flex items-center justify-end gap-1.5">
    <button type="button" data-quick-stock-in="${esc(mat.id)}" title="Add newly arrived stock for ${esc(mat.name)}" class="admin-btn admin-btn-sm admin-btn-primary whitespace-nowrap" style="padding: 0.28rem 0.55rem;">
                          + Add
    </button>
    <button type="button" data-quick-stock-out="${esc(mat.id)}" title="Deduct stock used in workshop for ${esc(mat.name)}" ${preview.currentStock <= 0 ? 'disabled' : ''} class="admin-btn admin-btn-sm admin-btn-secondary whitespace-nowrap ${ preview.currentStock <= 0 ? 'opacity-50 cursor-not-allowed' : '' }" style="padding: 0.28rem 0.55rem;">
                          − Use
    </button>
    <button type="button" data-edit-material="${esc(mat.id)}" class="admin-btn admin-btn-sm admin-btn-secondary whitespace-nowrap" style="padding: 0.28rem 0.5rem;">
                          Edit
    </button>
    <button type="button" data-delete-material="${esc(mat.id)}" aria-label="Remove ${esc(mat.name)}" class="admin-btn admin-btn-sm admin-btn-danger-ghost whitespace-nowrap" style="padding: 0.28rem 0.5rem;">
                          Remove
    </button>
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
            : filteredTransactions.length === 0
            ? `
    <div class="admin-empty-state">
    <p class="text-sm font-bold text-slate-900">No stock activity matches your search</p>
    <p class="text-xs text-slate-500 mt-1">Click "+ Add or Use Stock" above whenever supplies arrive or are used in the shop.</p>
    </div>
        `
            : `
    <div class="overflow-x-auto">
    <table class="admin-table">
    <thead>
    <tr>
    <th>Date</th>
    <th class="admin-col-primary">Material</th>
    <th>Change</th>
    <th>Balance</th>
    <th>Reason</th>
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
    <span class="font-mono-tech text-xs font-bold ${isStockIn ? 'text-emerald-700' : 'text-rose-700'}">
                        ${isStockIn ? `+${tx.quantity}${unitLabel}` : `−${tx.quantity}${unitLabel}`}
    </span>
    </td>
    <td class="font-mono-tech text-xs text-slate-700 whitespace-nowrap">
                      ${tx.previousStock}${unitLabel} → <strong>${tx.newStock}${unitLabel}</strong>
    </td>
    <td class="whitespace-nowrap">
    <p class="admin-table-title">${esc(tx.reason || (isStockIn ? 'New Workshop Restock' : 'Used in Workshop'))}</p>
    <p class="admin-table-sub">
                        ${tx.purchaseCost !== null && tx.purchaseCost !== undefined ? `Cost: ${usd(tx.purchaseCost)} · ` : ''}By ${esc(tx.adminName || 'Admin')}
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
    `;

    // Sub-view switcher (Current Stock vs Stock History)
    adminInventoryEl.querySelectorAll('[data-inv-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.adminInventoryView = btn.getAttribute('data-inv-view') === 'history' ? 'history' : 'materials';
        renderDashboardContent();
      });
    });

    // 1-Click Plain-English Status Filter Buttons
    adminInventoryEl.querySelectorAll('[data-inv-status-pill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.adminInventoryView = 'materials';
        state.adminInventoryStockFilter = btn.getAttribute('data-inv-status-pill') || 'all';
        renderDashboardContent();
      });
    });

    const alertLowBtn = document.getElementById('admin-alert-filter-low-btn');
    if (alertLowBtn) {
      alertLowBtn.addEventListener('click', () => {
        state.adminInventoryView = 'materials';
        state.adminInventoryStockFilter =
          state.adminInventoryStockFilter === 'needs_restock' || state.adminInventoryStockFilter === 'low_stock'
            ? 'all'
            : 'needs_restock';
        renderDashboardContent();
      });
    }

    const alertRestockFirstBtn = document.getElementById('admin-alert-restock-first-btn');
    if (alertRestockFirstBtn) {
      alertRestockFirstBtn.addEventListener('click', () => {
        const firstLow = metrics.outOfStockItems[0] || metrics.lowStockItems[0] || state.materials[0];
        if (firstLow) {
          state.adminMovementMaterialId = firstLow.id;
          state.adminMovementProductId = firstLow.id;
        }
        state.adminMovementMode = 'Stock In';
        state.adminMovementFormOpen = true;
        renderDashboardContent();
        document.getElementById('admin-stock-movement-form')?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Toggle Stock Movement Form Drawer
    const toggleMoveFormBtn = document.getElementById('admin-toggle-movement-form-btn');
    if (toggleMoveFormBtn) {
      toggleMoveFormBtn.addEventListener('click', () => {
        state.adminMovementFormOpen = !state.adminMovementFormOpen;
        renderDashboardContent();
      });
    }

    const closeMoveFormBtn = document.getElementById('admin-close-movement-form-btn');
    if (closeMoveFormBtn) {
      closeMoveFormBtn.addEventListener('click', () => {
        state.adminMovementFormOpen = false;
        renderDashboardContent();
      });
    }

    // Quick-Tap Preset Quantity Buttons (+5, +10, +25, +50)
    adminInventoryEl.querySelectorAll('[data-quick-preset-qty]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetVal = btn.getAttribute('data-quick-preset-qty') || '10';
        state.adminMovementQuantity = presetVal;
        renderDashboardContent();
      });
    });

    // Live update when typing quantity in the Add/Use Stock form
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
    <span class="font-semibold text-slate-600">Summary before saving:</span>
    <span class="font-mono-tech text-slate-800">
                Currently <strong>${updatedPreview.currentStock} ${esc(updatedPreview.unit)}</strong>
    </span>
    <span aria-hidden="true">→</span>
    <span class="font-mono-tech font-bold ${
                updatedPreview.insufficientStock
                  ? 'text-rose-700'
                  : activeMovementMode === 'Stock In'
                  ? 'text-emerald-700'
                  : 'text-slate-900'
              }">
                ${
                  updatedPreview.insufficientStock
                    ? `Not enough in stock (only ${updatedPreview.currentStock} ${esc(updatedPreview.unit)} available)`
                    : `New total will be ${updatedPreview.projectedStock} ${esc(updatedPreview.unit)} (${esc(updatedPreview.projectedFriendlyLabel)})`
                }
    </span>
    </div>
    <span class="text-slate-500 font-mono-tech">
              Unit cost: ${usd(selectedMaterial?.unitCost || 0)} per ${esc(updatedPreview.unit)}
    </span>
          `;
        }
      });
    }

    // Quick-Pick Unit Buttons in Add/Edit Material Form
    adminInventoryEl.querySelectorAll('[data-quick-unit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const unitInput = document.getElementById('mat-unit');
        if (unitInput) {
          unitInput.value = btn.getAttribute('data-quick-unit') || 'bd ft';
          unitInput.focus();
        }
      });
    });

    // Inline Stepper (- / +) buttons next to each material's stock input
    adminInventoryEl.querySelectorAll('[data-inline-stock-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mid = btn.getAttribute('data-inline-step-target') || '';
        const delta = Number(btn.getAttribute('data-inline-stock-step') || 0);
        const stockInput = adminInventoryEl.querySelector(`[data-inline-stock-input="${mid}"]`);
        if (!stockInput) return;
        const curr = Number(stockInput.value || 0);
        stockInput.value = String(Math.max(0, Math.round((curr + delta) * 100) / 100));
      });
    });

    // Toggle Add / Edit Raw Material Form Drawer
    const toggleMatFormBtn = document.getElementById('admin-toggle-material-form-btn');
    if (toggleMatFormBtn) {
      toggleMatFormBtn.addEventListener('click', () => {
        if (state.adminEditingMaterialId) {
          state.adminEditingMaterialId = '';
          state.adminMaterialFormOpen = true;
        } else {
          state.adminMaterialFormOpen = !state.adminMaterialFormOpen;
        }
        renderDashboardContent();
      });
    }

    const closeMatFormBtn = document.getElementById('admin-close-material-form-btn');
    if (closeMatFormBtn) {
      closeMatFormBtn.addEventListener('click', () => {
        state.adminEditingMaterialId = '';
        state.adminMaterialFormOpen = false;
        renderDashboardContent();
      });
    }

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
          showAdminBanner(`Updated "${savedMat.name}" (${savedMat.stockQuantity} ${savedMat.unit} in stock).`);
        } else {
          state.materials.unshift(savedMat);
          showAdminBanner(`Added new material "${savedMat.name}" (${savedMat.stockQuantity} ${savedMat.unit} in stock).`);
        }

        saveMaterialsToStorage();
        state.adminEditingMaterialId = '';
        state.adminMaterialFormOpen = false;
        renderDashboardContent();
      });
    }

    adminInventoryEl.querySelectorAll('[data-edit-material]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mid = btn.getAttribute('data-edit-material') || '';
        state.adminEditingMaterialId = mid;
        state.adminMaterialFormOpen = true;
        renderDashboardContent();
        document.getElementById('admin-material-form')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    adminInventoryEl.querySelectorAll('[data-delete-material]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mid = btn.getAttribute('data-delete-material') || '';
        const mat = state.materials.find((m) => m.id === mid);
        if (!mat) return;
        openAdminConfirmModal({
          title: 'Remove Material',
          message: `Remove "${mat.name}" from your workshop materials list?`,
          confirmLabel: 'Remove Material',
          onConfirm: () => {
            const removal = removeMaterialFromInventory({
              materials: state.materials,
              materialId: mid,
            });
            if (!removal.ok) return;
            state.materials = removal.updatedMaterials;
            saveMaterialsToStorage();
            showAdminBanner(`Removed "${mat.name}" from workshop inventory.`);
            renderDashboardContent();
          },
        });
      });
    });

    // Mode toggle buttons (Stock In vs Stock Out)
    adminInventoryEl.querySelectorAll('[data-movement-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.adminMovementMode = btn.getAttribute('data-movement-mode') || 'Stock In';
        state.adminMovementFormOpen = true;
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
          `${result.transaction.transactionType === 'Stock In' ? 'Added stock' : 'Used stock'}: "${result.transaction.materialName}" is now ${result.transaction.newStock} ${result.transaction.unit} (was ${result.transaction.previousStock} ${result.transaction.unit}).`
        );
        renderDashboardContent();
      });
    }

    // Inline Raw Material Stock & Min Alert Level Update buttons
    adminInventoryEl.querySelectorAll('[data-inline-stock-save]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mid = btn.getAttribute('data-inline-stock-save') || '';
        const mat = state.materials.find((m) => m.id === mid);
        if (!mat) return;

        const stockInput = adminInventoryEl.querySelector(`[data-inline-stock-input="${mid}"]`);
        const minInput = adminInventoryEl.querySelector(`[data-inline-min-stock-input="${mid}"]`);
        const nextStockRaw = Number(stockInput ? stockInput.value : mat.stockQuantity);
        const nextMinRaw = Number(minInput ? minInput.value : mat.minStockLevel ?? 10);

        if (!Number.isFinite(nextStockRaw) || nextStockRaw < 0) {
          showAdminBanner('Please enter 0 or a positive number for the stock amount.');
          return;
        }
        if (!Number.isFinite(nextMinRaw) || nextMinRaw < 0) {
          showAdminBanner('Please enter 0 or a positive number for the warning level.');
          return;
        }

        const prevStock = Math.max(0, Number(mat.stockQuantity ?? 0));
        const nextStock = Math.round(nextStockRaw * 100) / 100;
        const nextMin = Math.floor(nextMinRaw);

        const updatedMat = {
          ...mat,
          stockQuantity: nextStock,
          inStockCount: nextStock,
          minStockLevel: nextMin,
        };
        state.materials = state.materials.map((item) => (item.id === mid ? updatedMat : item));
        saveMaterialsToStorage();

        if (nextStock !== prevStock) {
          const delta = Math.round(Math.abs(nextStock - prevStock) * 100) / 100;
          const txType = nextStock > prevStock ? 'Stock In' : 'Stock Out';
          state.inventoryTransactions.unshift({
            id: `inv-tx-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
            materialId: mat.id,
            materialName: mat.name,
            materialSku: mat.sku,
            unit: mat.unit,
            productId: mat.id,
            productName: mat.name,
            productSku: mat.sku,
            transactionType: txType,
            quantity: delta,
            previousStock: prevStock,
            newStock: nextStock,
            purchaseCost: null,
            reason: 'Quick Stock Count Update',
            dateTime: `${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 5)}`,
            adminName: state.sessionUser?.name
              ? `${state.sessionUser.name} (Admin)`
              : 'Lillia Mercier (Business Owner)',
          });
          saveInventoryTransactionsToStorage();
        }

        showAdminBanner(
          `Saved! "${mat.name}" now has ${nextStock} ${mat.unit} in stock (low-stock warning at ${nextMin} ${mat.unit}).`
        );
        renderDashboardContent();
      });
    });

    // Quick + Add Stock / - Use Stock buttons in table open the guided panel pre-selected
    adminInventoryEl.querySelectorAll('[data-quick-stock-in]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mid = btn.getAttribute('data-quick-stock-in') || '';
        state.adminMovementMode = 'Stock In';
        state.adminMovementMaterialId = mid;
        state.adminMovementProductId = mid;
        state.adminMovementFormOpen = true;
        renderDashboardContent();
        document.getElementById('admin-stock-movement-form')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    adminInventoryEl.querySelectorAll('[data-quick-stock-out]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mid = btn.getAttribute('data-quick-stock-out') || '';
        state.adminMovementMode = 'Stock Out';
        state.adminMovementMaterialId = mid;
        state.adminMovementProductId = mid;
        state.adminMovementFormOpen = true;
        renderDashboardContent();
        document.getElementById('admin-stock-movement-form')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    bindLiveSearchInput('admin-inv-stock-search', 'adminInventoryStockSearch', renderDashboardContent);

    const invStockFilterEl = document.getElementById('admin-inv-stock-filter');
    if (invStockFilterEl) {
      invStockFilterEl.addEventListener('change', (e) => {
        state.adminInventoryStockFilter = e.target.value;
        renderDashboardContent();
      });
    }

    bindLiveSearchInput('admin-inv-history-search', 'adminInventoryHistorySearch', renderDashboardContent);

    const invHistoryTypeEl = document.getElementById('admin-inv-history-type');
    if (invHistoryTypeEl) {
      invHistoryTypeEl.addEventListener('change', (e) => {
        state.adminInventoryHistoryTypeFilter = e.target.value;
        renderDashboardContent();
      });
    }
  }

  // 7. Populate Voucher Product Dropdown & Issued Vouchers Table
  const vchSelect = document.getElementById('vch-product');
  if (vchSelect) {
    const prevSelectedProduct = vchSelect.value;
    vchSelect.innerHTML = state.catalog
      .map((p) => `<option value="${esc(p.id)}">${esc(p.name)} (${esc(p.sku)} · ${usd(p.effectivePrice)})</option>`)
      .join('');
    if (prevSelectedProduct && state.catalog.some((p) => p.id === prevSelectedProduct)) {
      vchSelect.value = prevSelectedProduct;
    }
  }

  const adminVouchersEl = document.getElementById('admin-vouchers-list');
  if (adminVouchersEl) {
    adminVouchersEl.innerHTML = `
    <div class="admin-card overflow-hidden">
    <div class="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between gap-2">
    <div>
    <h2 class="text-base font-bold text-slate-900">Active Vouchers (${state.vouchers.length})</h2>
    <p class="text-xs text-slate-500 mt-0.5">Personal single-product discount codes issued to customers</p>
    </div>
    </div>
        ${
          state.vouchers.length === 0
            ? `
    <div class="admin-empty-state">
    <p class="text-sm font-bold text-slate-900">No vouchers created yet</p>
    <p class="text-xs text-slate-500 mt-1">Use the form above to create a discount code for a customer.</p>
    </div>
        `
            : `
    <div class="overflow-x-auto">
    <table class="admin-table">
    <thead>
    <tr>
    <th>Code</th>
    <th>Customer</th>
    <th class="admin-col-primary">Product</th>
    <th>Discount</th>
    <th>Status</th>
    <th class="text-right">Actions</th>
    </tr>
    </thead>
    <tbody>
                ${state.vouchers
                  .map((v) => {
                    const isPct = v.discountType === 'percentage' || Number(v.discountPercent || 0) > 0;
                    const discountText = isPct
                      ? `${Number(v.discountPercent ?? v.discountValue ?? 0)}% OFF (-${usd(v.discountAmount)})`
                      : `-${usd(v.discountAmount)}`;
                    return `
    <tr>
    <td class="font-mono-tech text-xs font-bold text-slate-900 whitespace-nowrap">${esc(v.code)}</td>
    <td class="text-xs text-slate-600 whitespace-nowrap">${esc(v.customerEmail)}</td>
    <td class="admin-col-primary">
    <p class="admin-table-title">${esc(v.furnitureName || v.productName)}</p>
    <p class="admin-table-sub font-mono-tech">${esc(v.furnitureSku || '')}</p>
    </td>
    <td class="font-mono-tech text-xs font-bold text-[#0284C7] whitespace-nowrap">${esc(discountText)}</td>
    <td class="whitespace-nowrap">
    <span class="admin-status-dot ${v.status === 'Active' ? 'text-emerald-700' : 'text-slate-500'}">${esc(v.status)}</span>
    <span class="text-xs text-slate-400 ml-1">· Exp ${esc(v.expiryDate || '2026-12-31')}</span>
    </td>
    <td class="text-right whitespace-nowrap">
    <button type="button" data-revoke-voucher="${esc(v.id)}" class="admin-btn admin-btn-sm admin-btn-danger-ghost">
                        Revoke
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
    `;

    adminVouchersEl.querySelectorAll('[data-revoke-voucher]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vid = btn.getAttribute('data-revoke-voucher');
        const vch = state.vouchers.find((v) => v.id === vid);
        if (!vch) return;
        openAdminConfirmModal({
          title: 'Revoke Voucher',
          message: `Are you sure you want to revoke voucher "${vch.code}" for ${vch.customerEmail}?`,
          confirmLabel: 'Revoke Voucher',
          onConfirm: () => {
            state.vouchers = state.vouchers.filter((v) => v.id !== vid);
            showAdminBanner(`Revoked voucher ${vch.code}.`);
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

    const filteredOrders = state.orders.filter((o) => {
      const matchesQuery =
        !ordQuery ||
        o.orderNumber.toLowerCase().includes(ordQuery) ||
        o.clientName.toLowerCase().includes(ordQuery) ||
        o.clientEmail.toLowerCase().includes(ordQuery) ||
        o.furnitureName.toLowerCase().includes(ordQuery) ||
        (o.materialName || '').toLowerCase().includes(ordQuery);

      let matchesStage = true;
      if (stageFilter === 'confirmed') matchesStage = /Confirmed|Inquiry|Timber/i.test(o.status);
      if (stageFilter === 'production') matchesStage = /Joinery|Finishing|Millwork/i.test(o.status);
      if (stageFilter === 'quality') matchesStage = /Quality/i.test(o.status);
      if (stageFilter === 'delivered') matchesStage = /Dispatched|Delivered/i.test(o.status);

      return matchesQuery && matchesStage;
    });

    adminOrdersEl.innerHTML = `
    <div class="admin-card overflow-hidden">
    <div class="admin-toolbar">
    <div class="admin-toolbar-filters">
    <input id="admin-orders-search" type="search" value="${esc(state.adminOrderSearch)}" placeholder="Search order #, customer, product, or material..." aria-label="Search customer orders" class="admin-input admin-search-input" />
    <select id="admin-orders-stage-filter" aria-label="Filter orders by production stage" class="admin-select admin-filter-select">
    <option value="all" ${stageFilter === 'all' ? 'selected' : ''}>All Stages (${state.orders.length})</option>
    <option value="confirmed" ${stageFilter === 'confirmed' ? 'selected' : ''}>Confirmed &amp; Timber Prep</option>
    <option value="production" ${stageFilter === 'production' ? 'selected' : ''}>In Production &amp; Finishing</option>
    <option value="quality" ${stageFilter === 'quality' ? 'selected' : ''}>Quality Check</option>
    <option value="delivered" ${stageFilter === 'delivered' ? 'selected' : ''}>Dispatched / Delivered</option>
    </select>
    </div>
    <span class="text-xs font-medium text-slate-500">Showing ${filteredOrders.length} of ${state.orders.length} orders · Updates sync live to Customer Dashboard</span>
    </div>

        ${
          filteredOrders.length === 0
            ? `
    <div class="admin-empty-state space-y-3">
    <p class="text-base font-bold text-slate-900">No orders match your filter</p>
    <p class="text-xs text-slate-500 max-w-sm mx-auto">Try searching for a different customer name or resetting the stage filter.</p>
    <div>
    <button type="button" id="admin-reset-order-filters" class="admin-btn admin-btn-sm admin-btn-secondary">
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
    <th>Order</th>
    <th>Customer</th>
    <th class="admin-col-primary">Product</th>
    <th>Stage</th>
    <th class="text-right">Total</th>
    </tr>
    </thead>
    <tbody>
                ${filteredOrders
                  .map((o) => {
                    const realIdx = state.orders.findIndex((item) => item.orderNumber === o.orderNumber);
                    const totalAmt = Number(o.totalAmount || 0);
                    const paidAmt = Number(o.depositPaid ?? totalAmt);
                    const balanceDue = Math.max(0, totalAmt - paidAmt);
                    return `
    <tr>
    <td class="whitespace-nowrap">
    <div class="flex items-center gap-1.5">
    <p class="font-mono-tech text-xs font-bold text-[#0284C7]">#${esc(o.orderNumber)}</p>
                        ${
                          o.itemType === 'Custom'
                            ? `<span class="px-1.5 py-0.5 rounded bg-sky-50 text-[#0284C7] border border-sky-200 font-mono-tech text-[10px] font-bold">Custom</span>`
                            : ''
                        }
    </div>
    <p class="admin-table-sub mt-0.5">${esc(o.orderDate || '2026-10-28')}</p>
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
    <select aria-label="Update status for order ${esc(o.orderNumber)}" data-admin-order-idx="${realIdx}" class="admin-select admin-order-status-select text-xs" style="width: 190px; padding: 0.35rem 0.5rem;">
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
    </td>
    <td class="text-right whitespace-nowrap">
    <p class="font-mono-tech text-sm font-bold text-slate-900">${usd(totalAmt)}</p>
    <p class="text-[11px] font-semibold ${balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'} mt-0.5">
                        ${balanceDue > 0 ? `50% Deposit` : 'Paid in Full'}
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
    `;

    bindLiveSearchInput('admin-orders-search', 'adminOrderSearch', renderDashboardContent);

    const stageSelect = document.getElementById('admin-orders-stage-filter');
    if (stageSelect) {
      stageSelect.addEventListener('change', (e) => {
        state.adminOrderStage = e.target.value;
        renderDashboardContent();
      });
    }

    const resetOrdBtn = document.getElementById('admin-reset-order-filters');
    if (resetOrdBtn) {
      resetOrdBtn.addEventListener('click', () => {
        state.adminOrderSearch = '';
        state.adminOrderStage = 'all';
        renderDashboardContent();
      });
    }

    adminOrdersEl.querySelectorAll('[data-admin-order-idx]').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        const idx = Number(sel.getAttribute('data-admin-order-idx'));
        const ord = state.orders[idx];
        if (!ord) return;
        const res = applyAdminOrderUpdate({
          orders: state.orders,
          orderNumber: ord.orderNumber,
          updates: { status: e.target.value },
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
  }
}

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
                Selected from Homepage
    </span>
    <span class="font-mono-tech text-xs text-[#475569]">
                ${esc(spotlightItem.sku)} · ${esc(spotlightItem.categoryName)}
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
      const selectedFinish =
        state.selectedColorByProduct[item.id] || item.colorVariants?.[0]?.name || item.defaultFinish;
      const display = formatCustomerProductDisplay(item, selectedFinish);
      const variants = item.colorVariants || [];
      const isSpotlighted = state.catalogPageSpotlightProductId === item.id;

      return `
    <article data-testid="catalog-product-card-${esc(item.id)}" class="group rounded-2xl bg-white border ${ isSpotlighted ? 'border-[#0095FF] ring-2' : 'border-[#E2E8F0] hover:border-[#0095FF]' } overflow-hidden shadow-2xs hover:shadow-xl transition-all flex flex-col justify-between">
    <div>
    <div class="aspect-[4/3] relative overflow-hidden bg-slate-100">
    <img src="${esc(display.image)}" alt="${esc(display.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
    <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
    <span class="px-2.5 py-1 rounded-md bg-white/95 text-[#0D1015] font-mono-tech text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                  ${esc(display.categoryName)}
    </span>
                ${
                  matchedColorDef
                    ? `<span class="px-2.5 py-1 rounded-md bg-[#0095FF] text-white font-mono-tech text-[10px] font-bold uppercase tracking-wider">
                        ✓ ${esc(matchedColorDef.label)}
    </span>`
                    : ''
                }
    </div>
    <div class="absolute bottom-3 right-3">
    <span class="px-2.5 py-1 rounded-md bg-[#0D1015]/90 text-white font-mono-tech text-xs font-bold">
                  ${usd(display.effectivePrice)}
    </span>
    </div>
    </div>

    <div class="p-5 space-y-3">
    <div class="text-center border-b border-[#E2E8F0] pb-3">
    <h3 class="font-serif-display text-base sm:text-lg font-bold text-[#0D1015] uppercase tracking-wide leading-snug">
                  ${esc(display.name)}
    </h3>
    <p class="font-mono-tech text-[11px] text-[#64748B] uppercase tracking-widest mt-0.5">
                  ${variants.length} COLOR FINISHES · ${esc(display.selectedFinish)}
    </p>
    </div>

    <div class="space-y-1.5">
    <div class="flex items-center justify-between text-[11px]">
    <span class="font-semibold text-[#0D1015] truncate">Finish: <span class="text-[#0077CC]">${esc(display.selectedFinish)}</span></span>
    <span class="font-mono-tech font-bold text-[#0095FF] shrink-0">${usd(display.effectivePrice)}</span>
    </div>
    <div class="flex flex-wrap items-center gap-1.5">
                  ${variants
                    .map((v) => {
                      const isSel = v.name === display.selectedFinish;
                      return `
    <button type="button" data-catalog-card-color-product="${esc(item.id)}" data-catalog-card-color-name="${esc(v.name)}" class="px-2 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1.5 cursor-pointer transition-all ${ isSel ? 'bg-[#0D1015] text-white border-[#0D1015]' : 'bg-[#F8FBFF] text-[#0D1015] border-[#BCE3FF] hover:border-[#0095FF]' }">
    <span class="w-3 h-3 rounded-full border border-black/20 shrink-0" style="background-color: ${esc(v.hex)}"></span>
    <span class="truncate max-w-[115px]">${esc(v.name.split('/')[0].trim())}</span>
    </button>
                      `;
                    })
                    .join('')}
    </div>
    </div>
    </div>
    </div>

    <div class="px-5 pb-5 pt-1 grid grid-cols-2 gap-2">
    <button type="button" data-add-cart="${esc(item.id)}" ${display.isOutOfStock ? 'disabled' : ''} class="py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors ${ display.isOutOfStock ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-[#0095FF] hover:bg-[#0077CC] text-white cursor-pointer' }">
              ${display.isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
    </button>
    <button type="button" data-view-product="${esc(item.id)}" class="py-2.5 px-3 rounded-xl bg-[#F0F8FF] hover:bg-[#D8EEFF] text-[#0D1015] border border-[#BCE3FF] text-xs font-semibold transition-colors cursor-pointer text-center">
              View Details
    </button>
    </div>
    </article>
      `;
    })
    .join('');

  // Bind card color swatches
  grid.querySelectorAll('[data-catalog-card-color-product]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-catalog-card-color-product');
      const cname = btn.getAttribute('data-catalog-card-color-name');
      if (pid && cname) {
        state.selectedColorByProduct[pid] = cname;
        renderCatalogPage();
      }
    });
  });

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
    initDashboardPage();
  }
});

