/**
 * Lillia and Rowena Furniture — Lightweight DOM Controller
 * Handles in-place Hero Tab switching, color-variant pricing, empty-default cart,
 * strict role-based dashboard routing (Customer vs Admin), and the redesigned User Dashboard.
 */

import {
  ADMIN_MESSENGER_PLACEHOLDER_URL,
  PRODUCT_TYPES,
  applyStockMovement,
  buildProductRecord,
  buildRequestDesignMessengerUrl,
  buildSupplierRecord,
  calculateOrderPricing,
  computeInventoryMetrics,
  computeVariantPricing,
  filterFurnitureItems,
  formatCustomerProductDisplay,
  formatVoucherBenefitLabel,
  getProductStockStatus,
  resolveAuthNavigationState,
  validateAndBuildOfferProposal,
  validateNewFurnitureInput,
  validateSupplierInput,
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
      'Relax in deep-seated sofas upholstered in soft Belgian bouclé, paired with solid white oak lounge chairs and natural stone coffee tables built for everyday living.',
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
  messengerConversations: [],
  suppliers: [],
  inventoryTransactions: [],
  vouchers: [],
  orders: [],
  selectedColorByProduct: {},
  selectedCategory: 'all',
  searchQuery: '',
  sortBy: 'featured',
  cartItems: [],
  appliedVoucher: null,
  sessionUser: null, // null when logged out, { email, name, role: 'client' | 'admin' } when logged in
  activeClientTab: 'home',
  activeAdminTab: 'overview',
  adminProductSearch: '',
  adminProductCategory: 'all',
  adminProductTypeFilter: 'all',
  adminSupplierSearch: '',
  adminSupplierProductFilter: 'all',
  adminSupplierFormOpen: false,
  adminEditingSupplierId: '',
  adminViewingSupplierId: '',
  adminInventoryStockSearch: '',
  adminInventoryStockFilter: 'all',
  adminInventoryHistorySearch: '',
  adminInventoryHistoryTypeFilter: 'all',
  adminMovementMode: 'Stock In',
  adminMovementProductId: '',
  adminMovementSupplierId: '',
  adminMovementQuantity: '2',
  adminMovementCost: '',
  adminMovementReason: 'Damaged',
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

function persistProductToStorage(product) {
  if (!product || !product.id) return;
  try {
    const editedMap = JSON.parse(localStorage.getItem('lr_edited_products') || '{}');
    editedMap[product.id] = product;
    localStorage.setItem('lr_edited_products', JSON.stringify(editedMap));

    const existingCustom = JSON.parse(localStorage.getItem('lr_custom_products') || '[]');
    if (Array.isArray(existingCustom) && existingCustom.some((p) => p.id === product.id)) {
      const updatedCustom = existingCustom.map((p) => (p.id === product.id ? product : p));
      localStorage.setItem('lr_custom_products', JSON.stringify(updatedCustom));
    }
  } catch (_err) {
    // Ignore storage error
  }
}

function saveSuppliersToStorage() {
  try {
    localStorage.setItem('lr_suppliers', JSON.stringify(state.suppliers));
  } catch (_err) {
    // Ignore storage error
  }
}

function saveInventoryTransactionsToStorage() {
  try {
    localStorage.setItem('lr_inventory_transactions', JSON.stringify(state.inventoryTransactions));
  } catch (_err) {
    // Ignore storage error
  }
}

function loadSessionUser() {
  try {
    const raw = localStorage.getItem('lr_session_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.email && parsed.role) {
      return parsed;
    }
  } catch (_e) {
    // Ignore storage error
  }
  return null;
}

function saveCartToStorage() {
  try {
    const serialized = state.cartItems.map((c) => ({
      productId: c.product.id,
      finish: c.finish,
      quantity: c.quantity,
    }));
    localStorage.setItem('lr_cart_items', JSON.stringify(serialized));
  } catch (_e) {
    // Ignore storage error
  }
}

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem('lr_cart_items');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        const product = state.catalog.find((p) => p.id === entry.productId);
        if (!product) return null;
        return {
          product,
          finish: entry.finish || product.defaultFinish,
          quantity: Math.max(1, Number(entry.quantity || 1)),
        };
      })
      .filter(Boolean);
  } catch (_e) {
    return [];
  }
}

function loadCustomerProfileFromStorage() {
  try {
    const raw = localStorage.getItem('lr_customer_profile');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        state.customerProfile = { ...state.customerProfile, ...parsed };
      }
    }
  } catch (_e) {
    // Ignore storage error
  }
}

function saveCustomerProfileToStorage() {
  try {
    localStorage.setItem('lr_customer_profile', JSON.stringify(state.customerProfile));
  } catch (_e) {
    // Ignore storage error
  }
}

async function loadData() {
  const res = await fetch('data/store.json');
  const baseData = await res.json();

  try {
    const customProductsRaw = localStorage.getItem('lr_custom_products');
    if (customProductsRaw) {
      const customProducts = JSON.parse(customProductsRaw);
      if (Array.isArray(customProducts) && customProducts.length > 0) {
        const existingIds = new Set(customProducts.map((p) => p.id));
        const baseRemaining = (baseData.products || []).filter((p) => !existingIds.has(p.id));
        baseData.products = [...customProducts, ...baseRemaining];
      }
    }

    const editedMapRaw = localStorage.getItem('lr_edited_products');
    if (editedMapRaw) {
      const editedMap = JSON.parse(editedMapRaw);
      if (editedMap && typeof editedMap === 'object') {
        baseData.products = (baseData.products || []).map((p) =>
          editedMap[p.id] ? { ...p, ...editedMap[p.id] } : p
        );
      }
    }

    const deletedIdsRaw = localStorage.getItem('lr_deleted_product_ids');
    if (deletedIdsRaw) {
      const deletedIds = JSON.parse(deletedIdsRaw);
      if (Array.isArray(deletedIds) && deletedIds.length > 0) {
        const delSet = new Set(deletedIds);
        baseData.products = (baseData.products || []).filter((p) => !delSet.has(p.id));
      }
    }

    const discountMapRaw = localStorage.getItem('lr_product_discounts');
    if (discountMapRaw) {
      const discountMap = JSON.parse(discountMapRaw);
      if (discountMap && typeof discountMap === 'object') {
        baseData.products = (baseData.products || []).map((p) => {
          if (Object.prototype.hasOwnProperty.call(discountMap, p.id)) {
            const pct = Number(discountMap[p.id]) || 0;
            return {
              ...p,
              discountPercent: pct,
              effectivePrice: Math.round(p.price * (1 - pct / 100)),
            };
          }
          return p;
        });
      }
    }

    // Normalize every product so both Normal Products ('standard') and Customized Products ('customized')
    // have consistent metadata and remain publicly visible to all customers.
    baseData.products = (baseData.products || []).map((p) => buildProductRecord(p, p));

    // Load Suppliers from localStorage or seeded store.json
    const savedSuppliersRaw = localStorage.getItem('lr_suppliers');
    if (savedSuppliersRaw) {
      const savedSuppliers = JSON.parse(savedSuppliersRaw);
      if (Array.isArray(savedSuppliers)) {
        baseData.suppliers = savedSuppliers.map((s) => buildSupplierRecord(s, s));
      }
    } else {
      baseData.suppliers = (baseData.suppliers || []).map((s) => buildSupplierRecord(s, s));
    }

    // Load Inventory Transactions from localStorage or seeded store.json
    const savedInvTxRaw = localStorage.getItem('lr_inventory_transactions');
    if (savedInvTxRaw) {
      const savedInvTx = JSON.parse(savedInvTxRaw);
      if (Array.isArray(savedInvTx)) {
        baseData.inventoryTransactions = savedInvTx;
      }
    } else {
      baseData.inventoryTransactions = Array.isArray(baseData.inventoryTransactions)
        ? baseData.inventoryTransactions
        : [];
    }

    const customVouchersRaw = localStorage.getItem('lr_custom_vouchers');
    if (customVouchersRaw) {
      const customVouchers = JSON.parse(customVouchersRaw);
      if (Array.isArray(customVouchers) && customVouchers.length > 0) {
        const customCodes = new Set(customVouchers.map((v) => String(v.code || '').toUpperCase()));
        const remainingSeeded = (baseData.vouchers || []).filter(
          (v) => !customCodes.has(String(v.code || '').toUpperCase())
        );
        baseData.vouchers = [...customVouchers, ...remainingSeeded];
      }
    }

    const usedCodesRaw = localStorage.getItem('lr_used_voucher_codes');
    if (usedCodesRaw) {
      const usedCodes = JSON.parse(usedCodesRaw);
      if (Array.isArray(usedCodes) && usedCodes.length > 0) {
        const usedSet = new Set(usedCodes.map((c) => String(c || '').toUpperCase()));
        baseData.vouchers = (baseData.vouchers || []).map((v) =>
          usedSet.has(String(v.code || '').toUpperCase()) ? { ...v, status: 'Used' } : v
        );
      }
    }

    const savedOrdersRaw = localStorage.getItem('lr_customer_orders');
    if (savedOrdersRaw) {
      const savedOrders = JSON.parse(savedOrdersRaw);
      if (Array.isArray(savedOrders) && savedOrders.length > 0) {
        baseData.orders = [...savedOrders, ...(baseData.orders || [])];
      }
    }
  } catch (_e) {
    // Ignore localStorage parse errors
  }

  return baseData;
}

/* ==========================================================================
   1. PUBLIC SHOWROOM PAGE (index.html)
   ========================================================================== */
function handleStorefrontLogout(e) {
  if (e) e.preventDefault();
  try {
    localStorage.removeItem('lr_session_user');
    localStorage.removeItem('lr_cart_items');
  } catch (_err) {
    // Ignore storage error
  }
  state.sessionUser = null;
  state.cartItems = [];
  state.appliedVoucher = null;
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

  // 1. Header Navigation Visibility
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
  if (profileNameEl && authNav.userDisplayName) {
    profileNameEl.textContent = authNav.userDisplayName;
  }
  if (profileInitialsEl && authNav.userInitials) {
    profileInitialsEl.textContent = authNav.userInitials;
  }
  if (profilePillEl && authNav.userDisplayName) {
    profilePillEl.title = `My Account (${authNav.userDisplayName})`;
    profilePillEl.setAttribute('aria-label', `My Account (${authNav.userDisplayName})`);
  }

  // 2. Footer Account Links Visibility
  if (guestFooter) guestFooter.classList.toggle('hidden', authNav.isAuthenticated);
  if (custFooter) custFooter.classList.toggle('hidden', !authNav.showCustomerAccountNav);
  if (adminFooter) adminFooter.classList.toggle('hidden', !authNav.showAdminNav);

  // 3. Banner, Hero & Cart Auth Links
  if (bannerVouchersLink) {
    bannerVouchersLink.classList.toggle('hidden', !authNav.showCustomerAccountNav);
  }
  if (heroTrackLink) {
    heroTrackLink.href = authNav.heroOrderLink.href;
    heroTrackLink.textContent = authNav.heroOrderLink.label;
  }
  if (cartUserEmailEl) {
    cartUserEmailEl.textContent = authNav.cartVoucherHint;
  }
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

  // 4. Bind All Logout Buttons
  ['nav-logout-btn', 'nav-admin-logout-btn', 'footer-logout-btn', 'footer-admin-logout-btn'].forEach((btnId) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.onclick = handleStorefrontLogout;
    }
  });
}

/**
 * Locks background page scrolling whenever the Cart Drawer, Product Details modal,
 * or Make Offer modal is open, and restores it when all overlays are closed.
 */
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

/**
 * Handles clicking "Request a Design":
 * - If not logged in, redirects to login.html?redirect=request-design
 * - If logged in, redirects directly to the Admin's Messenger conversation with custom design inquiry.
 */
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

function initShowroomPage() {
  syncAuthNavigationUI();
  bindRequestDesignTriggers();

  // Hero Tab Switching (Changes Hero Section Content In-Place!)
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

      const primaryCta = document.getElementById('hero-primary-cta');
      if (primaryCta) primaryCta.setAttribute('data-filter-target', data.filterTarget);
      const cardCta = document.getElementById('hero-card-cta');
      if (cardCta) cardCta.setAttribute('data-filter-target', data.filterTarget);
    });
  });

  // Smooth category links inside Hero & Footer
  document.querySelectorAll('[data-filter-target]').forEach((link) => {
    link.addEventListener('click', () => {
      const cat = link.getAttribute('data-filter-target') || 'all';
      setActiveCategoryFilter(cat);
    });
  });

  // Search Inputs (Top Nav + Catalog Search + Clear Buttons)
  const topSearch = document.getElementById('top-nav-search');
  const catSearch = document.getElementById('catalog-search-input');
  const topClear = document.getElementById('top-nav-search-clear');
  const catClear = document.getElementById('catalog-search-clear');

  const syncClearButtons = (val) => {
    const hasQuery = Boolean(String(val || '').trim());
    [topClear, catClear].forEach((btn) => {
      if (!btn) return;
      btn.classList.toggle('hidden', !hasQuery);
      btn.classList.toggle('flex', hasQuery);
    });
    document.querySelectorAll('[data-material-chip]').forEach((chip) => {
      const mat = chip.getAttribute('data-material-chip') || '';
      const active = hasQuery && val.trim().toLowerCase() === mat.toLowerCase();
      chip.className = active
        ? 'px-3 py-1 rounded-lg text-xs font-semibold border bg-[#0095FF] text-white border-[#0095FF] cursor-pointer transition-colors'
        : 'px-3 py-1 rounded-lg text-xs font-medium border bg-white text-[#475569] border-[#E2E8F0] hover:border-[#0095FF] cursor-pointer transition-colors';
    });
  };

  const handleSearch = (val) => {
    state.searchQuery = val;
    if (topSearch && topSearch.value !== val) topSearch.value = val;
    if (catSearch && catSearch.value !== val) catSearch.value = val;
    syncClearButtons(val);
    renderCatalogGrid();
  };

  if (topSearch) {
    topSearch.addEventListener('input', (e) => handleSearch(e.target.value));
    topSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const catalogEl = document.getElementById('catalog-section');
        if (catalogEl) catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
  if (catSearch) catSearch.addEventListener('input', (e) => handleSearch(e.target.value));
  if (topClear) {
    topClear.addEventListener('click', () => {
      handleSearch('');
      if (topSearch) topSearch.focus();
    });
  }
  if (catClear) {
    catClear.addEventListener('click', () => {
      handleSearch('');
      if (catSearch) catSearch.focus();
    });
  }

  // Sort Select
  const sortSelect = document.getElementById('catalog-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderCatalogGrid();
    });
  }

  // Category Filter Pills
  document.querySelectorAll('[data-category-pill]').forEach((pill) => {
    pill.addEventListener('click', () => {
      setActiveCategoryFilter(pill.getAttribute('data-category-pill') || 'all');
    });
  });

  // Material Quick Chips
  document.querySelectorAll('[data-material-chip]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const mat = chip.getAttribute('data-material-chip') || '';
      handleSearch(state.searchQuery.trim().toLowerCase() === mat.toLowerCase() ? '' : mat);
    });
  });

  // Cart Drawer Toggle (Open, Close Button, Backdrop Click, Escape Key)
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

  // Apply Single-Product Voucher in Cart
  const applyVoucherBtn = document.getElementById('apply-voucher-btn');
  if (applyVoucherBtn) {
    applyVoucherBtn.addEventListener('click', () => {
      const codeInput = document.getElementById('voucher-code-input');
      const feedback = document.getElementById('voucher-feedback');
      const code = codeInput ? codeInput.value : '';
      const activeEmail = state.sessionUser ? state.sessionUser.email : 'rowena.vance@vancearchitects.com';
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

  // Product Detail Modal close listeners
  const productModal = document.getElementById('product-detail-modal');
  const closeProductModalBtn = document.getElementById('close-product-modal-btn');
  const closeProductModal = () => {
    if (!productModal) return;
    productModal.classList.add('hidden');
    productModal.classList.remove('flex');
    syncBodyScrollLock();
  };
  if (closeProductModalBtn) {
    closeProductModalBtn.addEventListener('click', closeProductModal);
  }
  if (productModal) {
    productModal.addEventListener('click', (e) => {
      if (e.target === productModal) closeProductModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !productModal.classList.contains('hidden')) {
        closeProductModal();
      }
    });
  }

  // Make Offer Modal listeners
  initMakeOfferModal();

  // If user returned from login with ?trigger=request-design, open Messenger custom design flow
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
  state.selectedCategory = cat;
  document.querySelectorAll('[data-category-pill]').forEach((pill) => {
    const active = pill.getAttribute('data-category-pill') === cat;
    pill.className = active
      ? 'cat-pill px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer bg-[#0095FF] text-white shadow-xs'
      : 'cat-pill px-4 py-2 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer bg-white text-slate-700 border border-slate-200 hover:border-[#0095FF] hover:text-[#0D1015]';
  });
  renderCatalogGrid();
}

function renderRoomCollections() {
  const container = document.getElementById('room-collections-grid');
  if (!container) return;

  container.innerHTML = state.categories
    .map((cat) => {
      const items = state.catalog.filter((p) => p.categoryId === cat.id);
      const countLabel = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;
      return `
        <article class="group rounded-2xl bg-white border border-slate-200 hover:border-[#0095FF] overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
          <div>
            <div class="aspect-[4/3] relative overflow-hidden bg-slate-100">
              <img src="${esc(cat.image)}" alt="${esc(cat.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div class="absolute inset-0 bg-gradient-to-t from-[#0D1015]/80 via-[#0D1015]/15 to-transparent"></div>
              <div class="absolute bottom-3.5 left-4 right-4 text-white">
                <p class="text-xs text-[#BCE3FF] font-medium">Starting at ${usd(cat.startingPrice)} · ${esc(countLabel)}</p>
                <h3 class="font-serif-display text-xl font-bold leading-snug mt-0.5">${esc(cat.name)}</h3>
              </div>
            </div>
            <div class="p-4">
              <p class="text-xs sm:text-sm text-slate-600 line-clamp-2">${esc(cat.tagline)}</p>
            </div>
          </div>
          <div class="px-4 pb-4">
            <a
              href="#catalog-section"
              data-room-filter="${esc(cat.id)}"
              class="w-full py-2.5 px-4 rounded-xl bg-slate-100 group-hover:bg-[#0095FF] text-[#0D1015] group-hover:text-white text-xs font-semibold transition-colors flex items-center justify-between"
            >
              <span>Explore ${esc(cat.name)}</span>
              <span>→</span>
            </a>
          </div>
        </article>
      `;
    })
    .join('');

  container.querySelectorAll('[data-room-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setActiveCategoryFilter(btn.getAttribute('data-room-filter') || 'all');
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
          <img
            src="${esc(display.image)}"
            alt="${esc(display.name)}"
            class="w-full h-full object-cover"
          />
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
                  <button
                    type="button"
                    data-modal-color-name="${esc(v.name)}"
                    class="px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 cursor-pointer transition-all ${
                      isSel
                        ? 'bg-[#0D1015] text-white border-[#0D1015]'
                        : 'bg-white text-[#0D1015] border-slate-200 hover:border-[#0095FF]'
                    }"
                  >
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
            <button
              type="button"
              id="modal-add-to-cart-btn"
              ${display.isOutOfStock ? 'disabled' : ''}
              class="py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                display.isOutOfStock
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-[#0095FF] hover:bg-[#0077CC] text-white cursor-pointer shadow-xs'
              }"
            >
              ${display.isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button
              type="button"
              id="modal-make-offer-btn"
              data-testid="modal-make-offer-btn"
              class="py-3 px-4 rounded-xl bg-[#0D1015] hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-center"
            >
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

  if (!modal) return;

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

      // Save offer record for reference without altering catalog prices or auto-approving discounts
      try {
        const existingOffers = JSON.parse(localStorage.getItem('lr_customer_offers') || '[]');
        localStorage.setItem(
          'lr_customer_offers',
          JSON.stringify([validation.proposal, ...existingOffers.slice(0, 19)])
        );
      } catch (_err) {
        // Ignore storage quota errors
      }

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
  if (!grid) return;

  const filtered = filterFurnitureItems(state.catalog, state.searchQuery, state.selectedCategory);
  const sorted = [...filtered].sort((a, b) => {
    const pA = computeVariantPricing(a, state.selectedColorByProduct[a.id]).effectivePrice;
    const pB = computeVariantPricing(b, state.selectedColorByProduct[b.id]).effectivePrice;
    if (state.sortBy === 'price-asc') return pA - pB;
    if (state.sortBy === 'price-desc') return pB - pA;
    if (state.sortBy === 'lead-time') return a.leadTimeWeeks - b.leadTimeWeeks;
    return 0;
  });

  if (countLabel) {
    countLabel.textContent = `Showing ${sorted.length} of ${state.catalog.length} items`;
  }

  if (sorted.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full p-10 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-3">
        <p class="font-serif-display text-xl font-bold text-[#0D1015]">No matching furniture found</p>
        <p class="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          We couldn't find any furniture matching "${esc(state.searchQuery || state.selectedCategory)}". Try searching by furniture type, room, or material.
        </p>
        <div class="pt-1">
          <button
            type="button"
            id="catalog-reset-filters-btn"
            class="px-5 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            Show All Furniture
          </button>
        </div>
      </div>
    `;
    const resetBtn = document.getElementById('catalog-reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.searchQuery = '';
        state.selectedCategory = 'all';
        const topSearch = document.getElementById('top-nav-search');
        const catSearch = document.getElementById('catalog-search-input');
        if (topSearch) topSearch.value = '';
        if (catSearch) catSearch.value = '';
        const topClear = document.getElementById('top-nav-search-clear');
        const catClear = document.getElementById('catalog-search-clear');
        [topClear, catClear].forEach((b) => {
          if (b) {
            b.classList.add('hidden');
            b.classList.remove('flex');
          }
        });
        setActiveCategoryFilter('all');
      });
    }
    return;
  }

  grid.innerHTML = sorted
    .map((item) => {
      const selectedFinish =
        state.selectedColorByProduct[item.id] ||
        item.colorVariants?.[0]?.name ||
        item.defaultFinish;
      const display = formatCustomerProductDisplay(item, selectedFinish);

      const stockBadgeClass = display.isOutOfStock
        ? 'bg-rose-600 text-white'
        : display.isLowStock
        ? 'bg-amber-500 text-slate-950'
        : 'bg-white/95 text-[#0D1015] border border-slate-200/80';

      return `
        <article class="group rounded-2xl bg-white border border-slate-200 hover:border-[#0095FF] overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
          <div>
            <div class="aspect-[4/3] relative overflow-hidden bg-slate-100">
              <img
                src="${esc(display.image)}"
                alt="${esc(display.name)}"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div class="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                <span data-testid="shop-stock-badge-${esc(item.id)}" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-2xs ${stockBadgeClass}">
                  ${esc(display.availabilityLabel)}
                </span>
                ${
                  display.hasDiscount
                    ? `<span class="px-2.5 py-1 rounded-lg bg-[#0D1015] text-white text-[11px] font-semibold">Save ${display.discountPercent}%</span>`
                    : ''
                }
              </div>
            </div>

            <div class="p-5 space-y-3.5">
              <div class="space-y-1">
                <div class="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span class="font-medium text-slate-600">${esc(display.categoryName)}</span>
                  <span>${esc(display.availabilityDetail)}</span>
                </div>

                <div class="flex items-start justify-between gap-3 pt-0.5">
                  <h3 class="font-serif-display text-lg font-bold text-[#0D1015] leading-snug">
                    ${esc(display.name)}
                  </h3>
                  <div class="text-right shrink-0">
                    ${
                      display.hasDiscount
                        ? `<p class="font-mono-tech text-xs text-slate-400 line-through">${usd(display.variantBasePrice)}</p>`
                        : ''
                    }
                    <p class="font-mono-tech text-xl font-bold text-[#0095FF]">${usd(display.effectivePrice)}</p>
                  </div>
                </div>
              </div>

              <p class="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                ${esc(display.description)}
              </p>

              <!-- Finish / Color Options -->
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
                        <button
                          type="button"
                          data-color-product="${esc(item.id)}"
                          data-color-name="${esc(v.name)}"
                          class="px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 cursor-pointer transition-all ${
                            isSel
                              ? 'bg-[#0D1015] text-white border-[#0D1015]'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-[#0095FF]'
                          }"
                        >
                          <span class="w-3 h-3 rounded-full border border-black/20 shrink-0" style="background-color: ${esc(v.hex)}"></span>
                          <span class="truncate max-w-[115px]">${esc(v.shortLabel)}</span>
                        </button>
                      `;
                    })
                    .join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="px-5 pb-5 pt-1">
            <div class="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                data-add-cart="${esc(item.id)}"
                ${display.isOutOfStock ? 'disabled' : ''}
                class="py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors ${
                  display.isOutOfStock
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-[#0095FF] hover:bg-[#0077CC] text-white cursor-pointer shadow-2xs'
                }"
              >
                ${display.isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button
                type="button"
                data-view-product="${esc(item.id)}"
                aria-label="View details for ${esc(display.name)}"
                class="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0D1015] text-xs font-semibold transition-colors cursor-pointer"
              >
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

  // Bind View Details buttons
  grid.querySelectorAll('[data-view-product]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-view-product');
      if (pid) openProductDetailModal(pid);
    });
  });

  // Bind Add to Cart buttons (enforce available stock limit)
  grid.querySelectorAll('[data-add-cart]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-add-cart');
      if (pid) addProductToCartFromStorefront(pid);
    });
  });
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
                  <button
                    type="button"
                    data-drawer-qty-idx="${idx}"
                    data-drawer-delta="-1"
                    aria-label="Decrease quantity"
                    class="px-2.5 py-0.5 text-xs font-bold text-[#0D1015] hover:bg-[#EBF6FF] rounded-l-lg cursor-pointer"
                  >
                    −
                  </button>
                  <span class="px-2.5 py-0.5 font-mono-tech text-xs font-bold text-[#0D1015]">${line.quantity}</span>
                  <button
                    type="button"
                    data-drawer-qty-idx="${idx}"
                    data-drawer-delta="1"
                    aria-label="Increase quantity"
                    class="px-2.5 py-0.5 text-xs font-bold text-[#0D1015] hover:bg-[#EBF6FF] rounded-r-lg cursor-pointer"
                  >
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
    try {
      localStorage.setItem('lr_session_user', JSON.stringify(activeUser));
    } catch (_e) {
      // Ignore storage error
    }
    state.sessionUser = activeUser;
  }

  // If still not logged in, redirect to index.php (on PHP) or login.html
  if (!activeUser) {
    window.location.href = window.location.pathname.endsWith('.php') ? 'index.php' : 'login.html';
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

  loadCustomerProfileFromStorage();
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

  const handlePortalLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('lr_session_user');
    localStorage.removeItem('lr_cart_items');
    window.location.href = window.location.pathname.endsWith('.php') ? 'logout.php' : 'login.html';
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
        try {
          localStorage.setItem('lr_session_user', JSON.stringify(state.sessionUser));
        } catch (_err) {
          // Ignore storage error
        }
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
              supplierId: null,
              supplierName: null,
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
      try {
        const existingOrders = JSON.parse(localStorage.getItem('lr_customer_orders') || '[]');
        localStorage.setItem('lr_customer_orders', JSON.stringify([newOrder, ...existingOrders]));
      } catch (_e) {
        // Ignore storage error
      }

      // Mark single-use voucher as Used
      if (checkoutResult.validatedVoucher) {
        const usedCode = String(checkoutResult.validatedVoucher.code || '').toUpperCase();
        state.vouchers = state.vouchers.map((v) =>
          String(v.code || '').toUpperCase() === usedCode ? { ...v, status: 'Used' } : v
        );
        try {
          const usedCodes = JSON.parse(localStorage.getItem('lr_used_voucher_codes') || '[]');
          if (!usedCodes.includes(usedCode)) {
            localStorage.setItem('lr_used_voucher_codes', JSON.stringify([...usedCodes, usedCode]));
          }
          const customVouchers = JSON.parse(localStorage.getItem('lr_custom_vouchers') || '[]');
          if (Array.isArray(customVouchers) && customVouchers.length > 0) {
            const updatedCustom = customVouchers.map((v) =>
              String(v.code || '').toUpperCase() === usedCode ? { ...v, status: 'Used' } : v
            );
            localStorage.setItem('lr_custom_vouchers', JSON.stringify(updatedCustom));
          }
        } catch (_err) {
          // Ignore storage error
        }
      }

      state.cartItems = [];
      state.appliedVoucher = null;
      if (clientVoucherInput) clientVoucherInput.value = '';
      if (clientVoucherFeedback) clientVoucherFeedback.classList.add('hidden');
      saveCartToStorage();
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

  // Unified Admin Left-Sidebar Navigation (overview, catalog, add-product, suppliers, inventory, vouchers, orders)
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
    suppliers: {
      eyebrow: 'Supply Chain',
      title: 'Supplier Management',
      description:
        'Manage timber mills, upholstery weavers, and stone foundries, and associate multiple products with each supplier.',
    },
    inventory: {
      eyebrow: 'Stock & Warehouse',
      title: 'Supply & Inventory Management',
      description:
        'Monitor product stock levels, record Stock In and Stock Out movements, set minimum stock alerts, and review transaction history.',
    },
    vouchers: {
      eyebrow: 'Promotions',
      title: 'Discount Vouchers',
      description:
        'Create and manage single-item discount codes for your customers.',
    },
    orders: {
      eyebrow: 'Fulfillment',
      title: 'Customer Orders',
      description:
        'Review customer orders and update their production or delivery status.',
    },
  };

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
          ? 'Edit Customized Product (Messenger)'
          : 'Edit Normal Product';
      } else {
        prodFormTitle.textContent = isCustomized
          ? 'Add Customized Product (Messenger)'
          : 'Add Normal Product';
      }
    }
    if (prodSaveBtn) {
      prodSaveBtn.textContent = isEditing
        ? 'Update Product'
        : isCustomized
        ? 'Save Customized Product'
        : 'Save Product';
    }
  };

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
    if (prodImageInput) prodImageInput.value = '';
    if (prodImageFileInput) prodImageFileInput.value = '';
    syncProductImagePreview('');
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

    // Show/hide the Add Product form vs Products Table inside #admin-tab-catalog
    if (prodForm) {
      prodForm.classList.toggle('hidden', target !== 'add-product');
    }
    if (catalogListEl) {
      catalogListEl.classList.toggle('hidden', target !== 'catalog');
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
        try {
          const existing = JSON.parse(localStorage.getItem('lr_custom_products') || '[]');
          localStorage.setItem('lr_custom_products', JSON.stringify([savedProduct, ...existing]));
        } catch (_err) {
          // Ignore storage error
        }
      }

      const typeLabel =
        savedProduct.productType === 'customized'
          ? 'Customized Product (Messenger)'
          : 'Normal Product';

      resetProductFormForCreate('standard');
      switchAdminTab('catalog');
      showAdminBanner(
        existingProduct
          ? `Updated ${typeLabel} "${savedProduct.name}" (${savedProduct.sku}) — publicly visible to all customers.`
          : `Added ${typeLabel} "${savedProduct.name}" (${savedProduct.sku}) to the public Shop catalog for all customers.`
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
      try {
        const existing = JSON.parse(localStorage.getItem('lr_custom_vouchers') || '[]');
        const filteredExisting = Array.isArray(existing)
          ? existing.filter((v) => String(v.code || '').toUpperCase() !== code)
          : [];
        localStorage.setItem('lr_custom_vouchers', JSON.stringify([newVoucher, ...filteredExisting]));
      } catch (_err) {
        // Ignore storage error
      }
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

  // Filter customer's own orders & vouchers (or show seeded ones if demo customer)
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

  // Populate Home Tab Previews (Latest Order + Address Preview)
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
            <p class="text-xs text-[#475569]">Finish: ${esc(latest.selectedFinish)} · Est. ${esc(latest.estimatedDelivery)}</p>
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

  // 1. User-Friendly Customer Orders List (With Product Image + Clean Progress Bar)
  const friendlyOrdersEl = document.getElementById('client-orders-friendly-list');
  if (friendlyOrdersEl) {
    friendlyOrdersEl.innerHTML = displayOrders
      .map((ord) => {
        const matchedProd = state.catalog.find((p) => p.id === ord.furnitureId) || state.catalog[0];
        const imgUrl = (matchedProd ? matchedProd.image : 'assets/images/category_dining_tables.jpg').replace(/^\//, '');

        // Map workshop status to 4 friendly customer steps
        let friendlyStep = 1;
        if (ord.status.includes('Joinery') || ord.status.includes('Finishing')) friendlyStep = 2;
        if (ord.status.includes('Quality')) friendlyStep = 3;
        if (ord.status.includes('Dispatched') || ord.status.includes('Delivered')) friendlyStep = 4;
        const pct = Math.round((friendlyStep / 4) * 100);

        return `
          <article class="bg-white rounded-3xl border border-[#BCE3FF] p-6 sm:p-7 shadow-2xs space-y-6">
            <div class="flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
              <div class="flex items-center gap-4">
                <img
                  src="${esc(imgUrl)}"
                  alt="${esc(ord.furnitureName)}"
                  class="w-20 h-20 rounded-2xl object-cover border border-[#BCE3FF] shrink-0"
                />
                <div>
                  <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="font-semibold text-[#0077CC]">${esc(ord.status)}</span>
                    <span aria-hidden="true">·</span>
                    <span class="font-mono-tech text-[#64748B]">Order #${esc(ord.orderNumber)}</span>
                  </div>
                  <h3 class="font-serif-display text-xl font-bold text-[#0D1015] mt-1">
                    ${esc(ord.furnitureName)}
                  </h3>
                  <p class="text-xs text-[#475569] mt-0.5">
                    Color Finish: <span class="font-semibold text-[#0D1015]">${esc(ord.selectedFinish)}</span> · Size: ${esc(ord.customDimensions)}
                  </p>
                </div>
              </div>

              <div class="sm:text-right shrink-0">
                <p class="text-xs text-[#64748B]">Total Paid / Due</p>
                <p class="font-mono-tech text-2xl font-bold text-[#0095FF]">${usd(ord.totalAmount)}</p>
                <p class="text-[11px] text-[#475569] mt-0.5">Est. Delivery: <span class="font-semibold text-[#0D1015]">${esc(ord.estimatedDelivery)}</span></p>
              </div>
            </div>

            <!-- Simple Customer-Friendly Progress Bar -->
            <div class="p-4 rounded-2xl bg-[#F8FBFF] border border-[#E2E8F0] space-y-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-[#0D1015]">Delivery Progress</span>
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
              <a
                href="${ADMIN_MESSENGER_PLACEHOLDER_URL}"
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold text-[#0095FF] hover:underline"
              >
                Ask Owner About This Order on Messenger ↗
              </a>
            </div>
          </article>
        `;
      })
      .join('');
  }

  // 2. Customer Transactions Ledger Table
  const txTbody = document.getElementById('client-transactions-tbody');
  const txTotalEl = document.getElementById('client-transactions-total');
  if (txTbody) {
    const transactions = displayOrders.map((ord, idx) => ({
      txId: `TXN-2026-99${41 - idx * 12}`,
      date: idx === 0 ? '2026-10-28' : '2026-10-14',
      orderNumber: ord.orderNumber,
      piece: ord.furnitureName,
      finish: ord.selectedFinish,
      method: idx === 0 ? 'Bank Wire · Studio Escrow' : 'Visa Ending •••• 4820',
      status: 'Paid · Verified',
      amount: ord.totalAmount,
    }));
    const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    if (txTotalEl) txTotalEl.textContent = usd(totalVolume);

    txTbody.innerHTML = transactions
      .map(
        (tx) => `
          <tr class="hover:bg-[#F8FBFF] transition-colors">
            <td class="py-4 pr-4 font-mono-tech font-bold text-[#0D1015] whitespace-nowrap">${esc(tx.txId)}</td>
            <td class="py-4 px-4 font-mono-tech text-[#475569] whitespace-nowrap">${esc(tx.date)}</td>
            <td class="py-4 px-4">
              <p class="font-serif-display font-bold text-[#0D1015]">${esc(tx.piece)}</p>
              <p class="text-xs text-[#64748B]">Order #${esc(tx.orderNumber)} · ${esc(tx.finish)}</p>
            </td>
            <td class="py-4 px-4 text-xs text-[#475569]">${esc(tx.method)}</td>
            <td class="py-4 px-4 text-xs font-semibold text-emerald-700 whitespace-nowrap">${esc(tx.status)}</td>
            <td class="py-4 pl-4 text-right font-mono-tech font-bold text-[#0D1015] whitespace-nowrap">${usd(tx.amount)}</td>
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
                <img
                  src="${esc(imgUrl)}"
                  alt="${esc(item.name)}"
                  class="w-20 h-20 rounded-2xl object-cover border border-[#BCE3FF] shrink-0"
                />
                <div class="min-w-0 space-y-1">
                  <div class="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                    <span class="font-medium text-[#0077CC]">${esc(item.categoryName)}</span>
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
                      <button
                        type="button"
                        data-client-cart-qty-idx="${idx}"
                        data-client-cart-delta="-1"
                        aria-label="Decrease quantity"
                        class="px-3 py-1 text-xs font-bold text-[#0D1015] hover:bg-[#EBF6FF] rounded-l-xl cursor-pointer"
                      >
                        −
                      </button>
                      <span class="px-3 py-1 font-mono-tech text-xs font-bold text-[#0D1015]">${entry.quantity}</span>
                      <button
                        type="button"
                        data-client-cart-qty-idx="${idx}"
                        data-client-cart-delta="1"
                        aria-label="Increase quantity"
                        class="px-3 py-1 text-xs font-bold text-[#0D1015] hover:bg-[#EBF6FF] rounded-r-xl cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      data-client-cart-remove="${idx}"
                      class="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
                    >
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
              <button
                type="button"
                data-copy-voucher="${esc(v.code)}"
                class="px-3 py-1.5 rounded-lg bg-[#EBF6FF] hover:bg-[#0095FF] text-[#0077CC] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Copy Code
              </button>
            </div>

            <div class="flex items-center justify-between text-xs text-[#64748B]">
              <span>Expires ${esc(v.expiryDate)}</span>
              <button
                type="button"
                data-use-voucher-product="${esc(v.furnitureId || v.productId)}"
                data-use-voucher-code="${esc(v.code)}"
                class="font-semibold text-[#0095FF] hover:underline cursor-pointer"
              >
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
        renderDashboardContent();
      });
    });
  }

  // 5. Admin Dashboard Statistics, Sidebar Counts & Overview Sections
  const adminStatCatalog = document.getElementById('admin-stat-catalog');
  const adminStatCatalogSub = document.getElementById('admin-stat-catalog-sub');
  const adminStatVouchers = document.getElementById('admin-stat-vouchers');
  const adminStatOrders = document.getElementById('admin-stat-orders');
  const adminStatRevenue = document.getElementById('admin-stat-revenue');

  const navCountProducts = document.getElementById('admin-nav-count-products');
  const navCountSuppliers = document.getElementById('admin-nav-count-suppliers');
  const navCountInventory = document.getElementById('admin-nav-count-inventory');
  const navCountVouchers = document.getElementById('admin-nav-count-vouchers');
  const navCountOrders = document.getElementById('admin-nav-count-orders');

  const discountedCount = state.catalog.filter((p) => Number(p.discountPercent || 0) > 0).length;
  const activeVoucherCount = state.vouchers.filter((v) => v.status === 'Active').length;
  const totalOrderRevenue = state.orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const invMetrics = computeInventoryMetrics(state.catalog);

  if (adminStatCatalog) adminStatCatalog.textContent = `${state.catalog.length} Items`;
  if (adminStatCatalogSub) {
    adminStatCatalogSub.textContent =
      discountedCount > 0 ? `${discountedCount} currently discounted` : 'All at standard price';
  }
  if (adminStatVouchers) adminStatVouchers.textContent = `${activeVoucherCount} Active`;
  if (adminStatOrders) adminStatOrders.textContent = `${state.orders.length} Orders`;
  if (adminStatRevenue) adminStatRevenue.textContent = usd(totalOrderRevenue);

  if (navCountProducts) navCountProducts.textContent = String(state.catalog.length);
  if (navCountSuppliers) navCountSuppliers.textContent = String(state.suppliers.length);
  if (navCountInventory) navCountInventory.textContent = String(invMetrics.totalStockAvailable);
  if (navCountVouchers) navCountVouchers.textContent = String(state.vouchers.length);
  if (navCountOrders) navCountOrders.textContent = String(state.orders.length);

  const chartCategoriesEl = document.getElementById('admin-chart-categories');
  if (chartCategoriesEl) {
    const categoryGroups = [
      { id: 'living', label: 'Living & Lounge' },
      { id: 'dining', label: 'Dining & Tables' },
      { id: 'bedroom', label: 'Bedroom Sanctuary' },
      { id: 'office', label: 'Study & Credenzas' },
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
                <th>Product</th>
                <th>Status</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${recentList
                .map(
                  (o) => `
                <tr>
                  <td class="font-mono-tech text-xs font-bold text-[#0284C7] whitespace-nowrap">#${esc(o.orderNumber)}</td>
                  <td>
                    <p class="font-semibold text-slate-900 text-xs sm:text-sm">${esc(o.clientName)}</p>
                    <p class="text-xs text-slate-500">${esc(o.clientEmail)}</p>
                  </td>
                  <td>
                    <p class="font-medium text-slate-900 text-xs sm:text-sm">${esc(o.furnitureName)}</p>
                    <p class="text-xs text-slate-500">${esc(o.selectedFinish)}</p>
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

    adminCatalogEl.innerHTML = `
      <div class="admin-card overflow-hidden">
        <!-- Clean Filter & Action Bar -->
        <div class="admin-toolbar">
          <div class="admin-toolbar-filters">
            <input
              id="admin-catalog-search"
              type="search"
              value="${esc(state.adminProductSearch)}"
              placeholder="Search by name, SKU, or origin..."
              aria-label="Search products"
              class="admin-input admin-search-input"
            />
            <select
              id="admin-catalog-category"
              aria-label="Filter products by category"
              class="admin-select admin-filter-select"
            >
              <option value="all" ${catFilter === 'all' ? 'selected' : ''}>All Categories (${state.catalog.length})</option>
              <option value="living" ${catFilter === 'living' ? 'selected' : ''}>Living &amp; Lounge</option>
              <option value="dining" ${catFilter === 'dining' ? 'selected' : ''}>Dining &amp; Tables</option>
              <option value="bedroom" ${catFilter === 'bedroom' ? 'selected' : ''}>Bedroom Sanctuary</option>
              <option value="office" ${catFilter === 'office' ? 'selected' : ''}>Study &amp; Credenzas</option>
            </select>
            <select
              id="admin-catalog-type"
              aria-label="Filter products by type"
              class="admin-select admin-filter-select"
            >
              <option value="all" ${typeFilter === 'all' ? 'selected' : ''}>All Product Types</option>
              <option value="standard" ${typeFilter === 'standard' ? 'selected' : ''}>Normal Products (Admin)</option>
              <option value="customized" ${typeFilter === 'customized' ? 'selected' : ''}>Customized (Messenger)</option>
            </select>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs font-medium text-slate-500">Showing ${filteredProducts.length} of ${state.catalog.length}</span>
            <button type="button" data-admin-jump="add-product" class="admin-btn admin-btn-primary">
              + Add Product
            </button>
          </div>
        </div>

        ${
          filteredProducts.length === 0
            ? `
          <div class="admin-empty-state space-y-3">
            <p class="text-base font-bold text-slate-900">No matching products found</p>
            <p class="text-xs text-slate-500 max-w-sm mx-auto">Try clearing your search or selecting a different product type or category.</p>
            <div>
              <button type="button" id="admin-reset-product-filters" class="admin-btn admin-btn-sm admin-btn-secondary">
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
                  <th>Product</th>
                  <th>Type &amp; Origin</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th class="text-right">Price</th>
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
                  <tr>
                    <td>
                      <div class="flex items-center gap-3">
                        <img
                          src="${esc(imgUrl)}"
                          alt="${esc(p.name)}"
                          class="admin-thumb"
                        />
                        <div class="min-w-0">
                          <p class="font-semibold text-slate-900 text-sm leading-snug">${esc(p.name)}</p>
                          <div class="flex items-center gap-2 mt-0.5">
                            <span class="font-mono-tech text-xs text-slate-500">${esc(p.sku)} · ${esc(p.dimensions || 'Standard')}</span>
                            <span class="inline-flex items-center gap-1">
                              ${variants
                                .slice(0, 3)
                                .map(
                                  (v) =>
                                    `<span title="${esc(v.name)}" class="admin-swatch-dot" style="width:10px;height:10px;background-color:${esc(v.hex || '#5C3A21')}"></span>`
                                )
                                .join('')}
                            </span>
                          </div>
                          ${
                            isCustomized && p.customizationNotes
                              ? `<p class="text-[11px] text-[#0284C7] mt-0.5 line-clamp-1" title="${esc(p.customizationNotes)}">${esc(p.customizationNotes)}</p>`
                              : ''
                          }
                        </div>
                      </div>
                    </td>
                    <td class="whitespace-nowrap">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        isCustomized
                          ? 'bg-sky-50 text-[#0284C7] border border-sky-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }">
                        ${isCustomized ? 'Customized (Messenger)' : 'Normal Product'}
                      </span>
                      <p class="text-[11px] text-slate-500 mt-0.5">
                        Origin: ${isCustomized ? 'Messenger customization' : 'Admin'} · <span class="text-emerald-700 font-medium">Public Shop</span>
                      </p>
                      ${
                        isCustomized && p.messengerCustomerName
                          ? `<p class="text-[11px] text-slate-400">Ref: ${esc(p.messengerCustomerName)}</p>`
                          : ''
                      }
                    </td>
                    <td class="text-xs font-medium text-slate-600 whitespace-nowrap">
                      ${esc(p.categoryName)}
                    </td>
                    <td class="whitespace-nowrap">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${stockPillClass}">
                        ${stockInfo.availableStock} in stock · ${esc(stockInfo.statusLabel)}
                      </span>
                      <p class="text-[11px] text-slate-400 mt-0.5">Min alert: ${stockInfo.minStockLevel}</p>
                    </td>
                    <td class="text-right whitespace-nowrap">
                      <p class="font-mono-tech text-sm font-bold text-slate-900">${usd(p.effectivePrice)}</p>
                      ${
                        p.discountPercent > 0
                          ? `<p class="text-xs font-semibold text-emerald-700">${p.discountPercent}% Off <span class="line-through text-slate-400 font-normal">${usd(p.price)}</span></p>`
                          : `<p class="text-xs text-slate-400">Standard price</p>`
                      }
                    </td>
                    <td class="text-right whitespace-nowrap">
                      <div class="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          data-edit-product="${esc(p.id)}"
                          aria-label="Edit ${esc(p.name)}"
                          class="admin-btn admin-btn-sm admin-btn-secondary"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          data-delete-product="${esc(p.id)}"
                          aria-label="Delete ${esc(p.name)}"
                          class="admin-btn admin-btn-sm admin-btn-danger-ghost"
                        >
                          Delete
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

    const searchInput = document.getElementById('admin-catalog-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.adminProductSearch = e.target.value;
        const pos = e.target.selectionStart || 0;
        renderDashboardContent();
        const nextInput = document.getElementById('admin-catalog-search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(pos, pos);
        }
      });
    }

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

    const resetBtn = document.getElementById('admin-reset-product-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.adminProductSearch = '';
        state.adminProductCategory = 'all';
        state.adminProductTypeFilter = 'all';
        renderDashboardContent();
      });
    }

    adminCatalogEl.querySelectorAll('[data-admin-jump]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-admin-jump');
        if (window.__switchAdminTab && target) window.__switchAdminTab(target);
      });
    });

    adminCatalogEl.querySelectorAll('[data-edit-product]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-edit-product');
        const prod = state.catalog.find((item) => item.id === pid);
        if (prod && typeof window.__openProductFormForEdit === 'function') {
          window.__openProductFormForEdit(prod);
        }
      });
    });

    adminCatalogEl.querySelectorAll('[data-delete-product]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-delete-product');
        const prod = state.catalog.find((item) => item.id === pid);
        if (!prod) return;
        openAdminConfirmModal({
          title: 'Delete Product',
          message: `Are you sure you want to remove "${prod.name}" (${prod.sku}) from the catalog?`,
          confirmLabel: 'Delete Product',
          onConfirm: () => {
            state.catalog = state.catalog.filter((item) => item.id !== pid);
            try {
              const delIds = JSON.parse(localStorage.getItem('lr_deleted_product_ids') || '[]');
              if (!delIds.includes(pid)) {
                localStorage.setItem('lr_deleted_product_ids', JSON.stringify([...delIds, pid]));
              }
            } catch (_err) {
              // Ignore storage error
            }
            showAdminBanner(`Removed "${prod.name}" from the catalog.`);
            renderDashboardContent();
          },
        });
      });
    });
  }

  // 6B. Admin Supplier Management Page (#admin-tab-suppliers)
  const adminSuppliersEl = document.getElementById('admin-tab-suppliers');
  if (adminSuppliersEl) {
    const supQuery = (state.adminSupplierSearch || '').trim().toLowerCase();
    const supProdFilter = state.adminSupplierProductFilter || 'all';
    const editingSupplier = state.adminEditingSupplierId
      ? state.suppliers.find((s) => s.id === state.adminEditingSupplierId) || null
      : null;
    const viewingSupplier = state.adminViewingSupplierId
      ? state.suppliers.find((s) => s.id === state.adminViewingSupplierId) || null
      : null;

    const filteredSuppliers = state.suppliers.filter((sup) => {
      const associatedProds = (sup.productIds || [])
        .map((pid) => state.catalog.find((p) => p.id === pid)?.name || '')
        .join(' ')
        .toLowerCase();
      const matchesQuery =
        !supQuery ||
        sup.name.toLowerCase().includes(supQuery) ||
        sup.contactPerson.toLowerCase().includes(supQuery) ||
        sup.phone.toLowerCase().includes(supQuery) ||
        sup.address.toLowerCase().includes(supQuery) ||
        associatedProds.includes(supQuery);
      const matchesProd =
        supProdFilter === 'all' || (sup.productIds || []).includes(supProdFilter);
      return matchesQuery && matchesProd;
    });

    const showSupplierForm = Boolean(state.adminSupplierFormOpen || editingSupplier);
    const selectedProductIdsSet = new Set(editingSupplier?.productIds || []);

    adminSuppliersEl.innerHTML = `
      <!-- Supplier Toolbar & Add Button -->
      <div class="admin-card overflow-hidden">
        <div class="admin-toolbar">
          <div class="admin-toolbar-filters">
            <input
              id="admin-supplier-search"
              type="search"
              value="${esc(state.adminSupplierSearch)}"
              placeholder="Search supplier name, contact person, phone, or address..."
              aria-label="Search suppliers"
              class="admin-input admin-search-input"
            />
            <select
              id="admin-supplier-product-filter"
              aria-label="Filter suppliers by associated product"
              class="admin-select admin-filter-select"
            >
              <option value="all" ${supProdFilter === 'all' ? 'selected' : ''}>All Associated Products</option>
              ${state.catalog
                .map(
                  (p) =>
                    `<option value="${esc(p.id)}" ${supProdFilter === p.id ? 'selected' : ''}>${esc(p.name)} (${esc(p.sku)})</option>`
                )
                .join('')}
            </select>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs font-medium text-slate-500">Showing ${filteredSuppliers.length} of ${state.suppliers.length} suppliers</span>
            <button
              type="button"
              id="admin-toggle-supplier-form-btn"
              class="admin-btn admin-btn-primary"
            >
              ${showSupplierForm && !editingSupplier ? 'Close Form' : '+ Add Supplier'}
            </button>
          </div>
        </div>
      </div>

      <!-- Add / Edit Supplier Form Card -->
      <form
        id="admin-supplier-form"
        novalidate
        class="admin-card p-6 sm:p-8 space-y-6 ${showSupplierForm ? '' : 'hidden'}"
      >
        <div class="pb-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold text-slate-900">
              ${editingSupplier ? `Edit Supplier: ${esc(editingSupplier.name)}` : 'Add New Supplier'}
            </h2>
            <p class="text-xs text-slate-500 mt-1">
              Enter supplier contact details and associate one or more catalog products supplied by this partner.
            </p>
          </div>
          <button
            type="button"
            id="admin-cancel-supplier-form-btn"
            class="admin-btn admin-btn-sm admin-btn-secondary"
          >
            Cancel
          </button>
        </div>

        <div class="grid sm:grid-cols-2 gap-5">
          <div>
            <label for="sup-name" class="admin-label">Supplier Name</label>
            <input
              id="sup-name"
              type="text"
              required
              value="${esc(editingSupplier?.name || '')}"
              placeholder="e.g. Nordic Joinery &amp; Brass Co."
              class="admin-input"
            />
          </div>
          <div>
            <label for="sup-contact" class="admin-label">Contact Person</label>
            <input
              id="sup-contact"
              type="text"
              required
              value="${esc(editingSupplier?.contactPerson || '')}"
              placeholder="e.g. Soren Lindqvist"
              class="admin-input"
            />
          </div>
          <div>
            <label for="sup-phone" class="admin-label">Phone Number</label>
            <input
              id="sup-phone"
              type="tel"
              required
              value="${esc(editingSupplier?.phone || '')}"
              placeholder="e.g. +1 (503) 555-0199"
              class="admin-input font-mono-tech"
            />
          </div>
          <div>
            <label for="sup-address" class="admin-label">Business Address</label>
            <input
              id="sup-address"
              type="text"
              required
              value="${esc(editingSupplier?.address || '')}"
              placeholder="e.g. 410 Sawmill Parkway, Portland, OR 97209"
              class="admin-input"
            />
          </div>
        </div>

        <div>
          <label class="admin-label">Associated Products (Select Multiple)</label>
          <p class="admin-hint mb-3">Check all furniture products supplied or crafted with materials from this supplier.</p>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            ${state.catalog
              .map((prod) => {
                const isChecked = selectedProductIdsSet.has(prod.id);
                return `
                  <label class="flex items-start gap-2.5 p-3 rounded-xl border ${
                    isChecked ? 'border-[#0284C7] bg-sky-50/50' : 'border-slate-200 bg-slate-50/60'
                  } cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      name="sup-product-ids"
                      value="${esc(prod.id)}"
                      ${isChecked ? 'checked' : ''}
                      class="mt-0.5 rounded border-slate-300 text-[#0284C7]"
                    />
                    <span class="min-w-0">
                      <span class="block font-semibold text-slate-900">${esc(prod.name)}</span>
                      <span class="block font-mono-tech text-[11px] text-slate-500">${esc(prod.sku)} · ${Math.max(0, Number(prod.inStockCount ?? 0))} in stock</span>
                    </span>
                  </label>
                `;
              })
              .join('')}
          </div>
        </div>

        <p id="admin-supplier-feedback" class="hidden text-xs font-semibold p-3 rounded-lg border"></p>

        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            id="admin-reset-supplier-btn"
            class="admin-btn admin-btn-secondary"
          >
            Reset
          </button>
          <button type="submit" id="admin-save-supplier-btn" class="admin-btn admin-btn-primary">
            ${editingSupplier ? 'Save Supplier Changes' : 'Save Supplier'}
          </button>
        </div>
      </form>

      <!-- Supplier Details View Card (when viewing a specific supplier) -->
      ${
        viewingSupplier
          ? (() => {
              const linkedProds = (viewingSupplier.productIds || [])
                .map((pid) => state.catalog.find((p) => p.id === pid))
                .filter(Boolean);
              const supplierDeliveries = state.inventoryTransactions.filter(
                (tx) => tx.supplierId === viewingSupplier.id || tx.supplierName === viewingSupplier.name
              );
              return `
        <div id="admin-supplier-detail-card" class="admin-card p-6 space-y-5 border-l-4 border-l-[#0284C7]">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <p class="admin-section-eyebrow">Supplier Profile &amp; Product Catalog Link</p>
              <h3 class="text-lg font-bold text-slate-900 mt-0.5">${esc(viewingSupplier.name)}</h3>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                data-edit-supplier="${esc(viewingSupplier.id)}"
                class="admin-btn admin-btn-sm admin-btn-secondary"
              >
                Edit Supplier
              </button>
              <button
                type="button"
                id="admin-close-supplier-detail-btn"
                class="admin-btn admin-btn-sm admin-btn-secondary"
              >
                Close Details
              </button>
            </div>
          </div>

          <div class="grid md:grid-cols-3 gap-4 text-xs">
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p class="text-slate-500 font-medium">Contact Person</p>
              <p class="text-sm font-bold text-slate-900 mt-1">${esc(viewingSupplier.contactPerson)}</p>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p class="text-slate-500 font-medium">Phone Number</p>
              <p class="text-sm font-mono-tech font-bold text-slate-900 mt-1">${esc(viewingSupplier.phone)}</p>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p class="text-slate-500 font-medium">Business Address</p>
              <p class="text-sm font-semibold text-slate-900 mt-1">${esc(viewingSupplier.address)}</p>
            </div>
          </div>

          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Associated Products (${linkedProds.length})
            </h4>
            ${
              linkedProds.length === 0
                ? `<p class="text-xs text-slate-500">No products currently linked to this supplier.</p>`
                : `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${linkedProds
                      .map((lp) => {
                        const st = getProductStockStatus(lp);
                        return `
                          <div class="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2">
                            <div class="min-w-0">
                              <p class="text-xs font-semibold text-slate-900 truncate">${esc(lp.name)}</p>
                              <p class="font-mono-tech text-[11px] text-slate-500">${esc(lp.sku)} · ${usd(lp.effectivePrice)}</p>
                            </div>
                            <span class="px-2 py-0.5 rounded text-[11px] font-mono-tech font-semibold ${
                              st.statusKey === 'out_of_stock'
                                ? 'bg-rose-50 text-rose-700'
                                : st.statusKey === 'low_stock'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-emerald-50 text-emerald-700'
                            }">
                              ${st.availableStock} in stock
                            </span>
                          </div>
                        `;
                      })
                      .join('')}
                  </div>`
            }
          </div>

          ${
            supplierDeliveries.length > 0
              ? `
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Recent Stock In Deliveries (${supplierDeliveries.length})
              </h4>
              <div class="overflow-x-auto">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Qty Received</th>
                      <th>Purchase Cost</th>
                      <th>Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${supplierDeliveries
                      .slice(0, 5)
                      .map(
                        (tx) => `
                      <tr>
                        <td class="font-mono-tech text-xs text-slate-500">${esc(tx.dateTime)}</td>
                        <td class="text-xs font-semibold text-slate-900">${esc(tx.productName)}</td>
                        <td class="font-mono-tech text-xs font-bold text-emerald-700">+${tx.quantity} (${tx.previousStock} → ${tx.newStock})</td>
                        <td class="font-mono-tech text-xs text-slate-700">${tx.purchaseCost !== null && tx.purchaseCost !== undefined ? usd(tx.purchaseCost) : '—'}</td>
                        <td class="text-xs text-slate-500">${esc(tx.adminName)}</td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `
              : ''
          }
        </div>
      `;
            })()
          : ''
      }

      <!-- Suppliers Directory Table -->
      <div class="admin-card overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold text-slate-900">Registered Suppliers (${filteredSuppliers.length})</h2>
            <p class="text-xs text-slate-500 mt-0.5">Click View to inspect supplier details and associated products, or Edit / Delete records</p>
          </div>
        </div>
        ${
          filteredSuppliers.length === 0
            ? `
          <div class="admin-empty-state space-y-3">
            <p class="text-base font-bold text-slate-900">No suppliers match your search</p>
            <p class="text-xs text-slate-500 max-w-sm mx-auto">Try clearing your search filter or add a new supplier above.</p>
          </div>
        `
            : `
          <div class="overflow-x-auto">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Contact Person</th>
                  <th>Phone Number</th>
                  <th>Business Address</th>
                  <th>Associated Products</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredSuppliers
                  .map((sup) => {
                    const prods = (sup.productIds || [])
                      .map((pid) => state.catalog.find((p) => p.id === pid))
                      .filter(Boolean);
                    return `
                  <tr>
                    <td>
                      <p class="font-semibold text-slate-900 text-sm">${esc(sup.name)}</p>
                      <p class="font-mono-tech text-[11px] text-slate-400">ID: ${esc(sup.id)}</p>
                    </td>
                    <td class="text-xs font-medium text-slate-800 whitespace-nowrap">
                      ${esc(sup.contactPerson)}
                    </td>
                    <td class="font-mono-tech text-xs text-slate-700 whitespace-nowrap">
                      ${esc(sup.phone)}
                    </td>
                    <td class="text-xs text-slate-600 max-w-xs">
                      ${esc(sup.address)}
                    </td>
                    <td>
                      <div class="flex flex-wrap gap-1.5">
                        ${
                          prods.length === 0
                            ? `<span class="text-xs text-slate-400">None assigned</span>`
                            : prods
                                .map(
                                  (p) =>
                                    `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200">${esc(p.name)}</span>`
                                )
                                .join('')
                        }
                      </div>
                    </td>
                    <td class="text-right whitespace-nowrap">
                      <div class="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          data-view-supplier="${esc(sup.id)}"
                          class="admin-btn admin-btn-sm admin-btn-secondary"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          data-edit-supplier="${esc(sup.id)}"
                          class="admin-btn admin-btn-sm admin-btn-secondary"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          data-delete-supplier="${esc(sup.id)}"
                          aria-label="Delete ${esc(sup.name)}"
                          class="admin-btn admin-btn-sm admin-btn-danger-ghost"
                        >
                          Delete
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
        }
      </div>
    `;

    const supSearchInput = document.getElementById('admin-supplier-search');
    if (supSearchInput) {
      supSearchInput.addEventListener('input', (e) => {
        state.adminSupplierSearch = e.target.value;
        const pos = e.target.selectionStart || 0;
        renderDashboardContent();
        const nextInput = document.getElementById('admin-supplier-search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(pos, pos);
        }
      });
    }

    const supProdSelect = document.getElementById('admin-supplier-product-filter');
    if (supProdSelect) {
      supProdSelect.addEventListener('change', (e) => {
        state.adminSupplierProductFilter = e.target.value;
        renderDashboardContent();
      });
    }

    const toggleSupFormBtn = document.getElementById('admin-toggle-supplier-form-btn');
    if (toggleSupFormBtn) {
      toggleSupFormBtn.addEventListener('click', () => {
        if (state.adminEditingSupplierId) {
          state.adminEditingSupplierId = '';
          state.adminSupplierFormOpen = true;
        } else {
          state.adminSupplierFormOpen = !state.adminSupplierFormOpen;
        }
        renderDashboardContent();
      });
    }

    const cancelSupFormBtn = document.getElementById('admin-cancel-supplier-form-btn');
    if (cancelSupFormBtn) {
      cancelSupFormBtn.addEventListener('click', () => {
        state.adminEditingSupplierId = '';
        state.adminSupplierFormOpen = false;
        renderDashboardContent();
      });
    }

    const resetSupBtn = document.getElementById('admin-reset-supplier-btn');
    if (resetSupBtn) {
      resetSupBtn.addEventListener('click', () => {
        state.adminEditingSupplierId = '';
        renderDashboardContent();
      });
    }

    const closeDetailBtn = document.getElementById('admin-close-supplier-detail-btn');
    if (closeDetailBtn) {
      closeDetailBtn.addEventListener('click', () => {
        state.adminViewingSupplierId = '';
        renderDashboardContent();
      });
    }

    const supForm = document.getElementById('admin-supplier-form');
    if (supForm) {
      supForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('sup-name')?.value.trim() || '';
        const contactPerson = document.getElementById('sup-contact')?.value.trim() || '';
        const phone = document.getElementById('sup-phone')?.value.trim() || '';
        const address = document.getElementById('sup-address')?.value.trim() || '';
        const checkedBoxes = Array.from(
          supForm.querySelectorAll('input[name="sup-product-ids"]:checked')
        );
        const productIds = checkedBoxes.map((cb) => cb.value);

        const validation = validateSupplierInput({ name, contactPerson, phone, address });
        const feedbackEl = document.getElementById('admin-supplier-feedback');
        if (!validation.valid) {
          if (feedbackEl) {
            feedbackEl.textContent = validation.errorMessage;
            feedbackEl.className =
              'text-xs font-semibold p-3 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 block';
          }
          return;
        }

        const existingSup = state.adminEditingSupplierId
          ? state.suppliers.find((s) => s.id === state.adminEditingSupplierId) || null
          : null;
        const savedSup = buildSupplierRecord(
          { name, contactPerson, phone, address, productIds },
          existingSup
        );

        if (existingSup) {
          state.suppliers = state.suppliers.map((s) => (s.id === existingSup.id ? savedSup : s));
          showAdminBanner(`Updated supplier "${savedSup.name}" (${savedSup.productIds.length} products linked).`);
        } else {
          state.suppliers.unshift(savedSup);
          showAdminBanner(`Added supplier "${savedSup.name}" (${savedSup.productIds.length} products linked).`);
        }

        saveSuppliersToStorage();
        state.adminEditingSupplierId = '';
        state.adminSupplierFormOpen = false;
        state.adminViewingSupplierId = savedSup.id;
        renderDashboardContent();
      });
    }

    adminSuppliersEl.querySelectorAll('[data-view-supplier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.getAttribute('data-view-supplier') || '';
        state.adminViewingSupplierId = sid;
        renderDashboardContent();
      });
    });

    adminSuppliersEl.querySelectorAll('[data-edit-supplier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.getAttribute('data-edit-supplier') || '';
        state.adminEditingSupplierId = sid;
        state.adminSupplierFormOpen = true;
        renderDashboardContent();
      });
    });

    adminSuppliersEl.querySelectorAll('[data-delete-supplier]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.getAttribute('data-delete-supplier') || '';
        const sup = state.suppliers.find((s) => s.id === sid);
        if (!sup) return;
        openAdminConfirmModal({
          title: 'Delete Supplier',
          message: `Are you sure you want to delete supplier "${sup.name}" (${sup.contactPerson})?`,
          confirmLabel: 'Delete Supplier',
          onConfirm: () => {
            state.suppliers = state.suppliers.filter((s) => s.id !== sid);
            if (state.adminViewingSupplierId === sid) state.adminViewingSupplierId = '';
            if (state.adminEditingSupplierId === sid) state.adminEditingSupplierId = '';
            saveSuppliersToStorage();
            showAdminBanner(`Deleted supplier "${sup.name}".`);
            renderDashboardContent();
          },
        });
      });
    });
  }

  // 6C. Admin Supply & Inventory Management Page (#admin-tab-inventory)
  const adminInventoryEl = document.getElementById('admin-tab-inventory');
  if (adminInventoryEl) {
    const metrics = computeInventoryMetrics(state.catalog);
    const activeMovementMode = state.adminMovementMode === 'Stock Out' ? 'Stock Out' : 'Stock In';
    const selectedProductId =
      state.adminMovementProductId && state.catalog.some((p) => p.id === state.adminMovementProductId)
        ? state.adminMovementProductId
        : state.catalog[0]?.id || '';
    const selectedProduct = state.catalog.find((p) => p.id === selectedProductId) || null;

    // Suppliers associated with the selected product (or all suppliers if none specifically linked)
    const linkedSuppliers = state.suppliers.filter((s) =>
      (s.productIds || []).includes(selectedProductId)
    );
    const supplierChoices = linkedSuppliers.length > 0 ? linkedSuppliers : state.suppliers;
    const selectedSupplierId =
      state.adminMovementSupplierId && supplierChoices.some((s) => s.id === state.adminMovementSupplierId)
        ? state.adminMovementSupplierId
        : supplierChoices[0]?.id || state.suppliers[0]?.id || '';

    const stockSearch = (state.adminInventoryStockSearch || '').trim().toLowerCase();
    const stockFilter = state.adminInventoryStockFilter || 'all';

    const filteredStockCatalog = state.catalog.filter((p) => {
      const st = getProductStockStatus(p);
      const matchesSearch =
        !stockSearch ||
        p.name.toLowerCase().includes(stockSearch) ||
        p.sku.toLowerCase().includes(stockSearch) ||
        (p.categoryName || '').toLowerCase().includes(stockSearch);
      let matchesStatus = true;
      if (stockFilter === 'low_stock') matchesStatus = st.statusKey === 'low_stock';
      if (stockFilter === 'out_of_stock') matchesStatus = st.statusKey === 'out_of_stock';
      if (stockFilter === 'in_stock') matchesStatus = st.statusKey === 'in_stock';
      return matchesSearch && matchesStatus;
    });

    const historySearch = (state.adminInventoryHistorySearch || '').trim().toLowerCase();
    const historyTypeFilter = state.adminInventoryHistoryTypeFilter || 'all';

    const filteredTransactions = state.inventoryTransactions.filter((tx) => {
      const matchesType =
        historyTypeFilter === 'all' || tx.transactionType === historyTypeFilter;
      const matchesSearch =
        !historySearch ||
        (tx.productName || '').toLowerCase().includes(historySearch) ||
        (tx.productSku || '').toLowerCase().includes(historySearch) ||
        (tx.supplierName || '').toLowerCase().includes(historySearch) ||
        (tx.reason || '').toLowerCase().includes(historySearch) ||
        (tx.adminName || '').toLowerCase().includes(historySearch);
      return matchesType && matchesSearch;
    });

    adminInventoryEl.innerHTML = `
      <!-- 1. Inventory Overview KPIs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="admin-kpi-card">
          <p class="admin-kpi-label">Total Products</p>
          <p id="inv-kpi-total-products" class="admin-kpi-value">${metrics.totalProducts}</p>
          <p class="admin-kpi-sub">Active SKUs tracked in inventory</p>
        </div>
        <div class="admin-kpi-card">
          <p class="admin-kpi-label">Total Stock Available</p>
          <p id="inv-kpi-total-stock" class="admin-kpi-value text-[#0284C7]">${metrics.totalStockAvailable} Units</p>
          <p class="admin-kpi-sub">Combined available showroom &amp; warehouse units</p>
        </div>
        <div class="admin-kpi-card">
          <p class="admin-kpi-label">Low Stock Items</p>
          <p id="inv-kpi-low-stock" class="admin-kpi-value ${metrics.lowStockCount > 0 ? 'text-amber-700' : 'text-slate-900'}">${metrics.lowStockCount}</p>
          <p class="admin-kpi-sub">${metrics.lowStockCount > 0 ? 'At or below minimum stock level' : 'All stocked above alert threshold'}</p>
        </div>
        <div class="admin-kpi-card">
          <p class="admin-kpi-label">Out of Stock Items</p>
          <p id="inv-kpi-out-of-stock" class="admin-kpi-value ${metrics.outOfStockCount > 0 ? 'text-rose-700' : 'text-emerald-700'}">${metrics.outOfStockCount}</p>
          <p class="admin-kpi-sub">${metrics.outOfStockCount > 0 ? 'Requires immediate restock' : 'Zero depleted products'}</p>
        </div>
      </div>

      <!-- Low Stock / Out of Stock Alert Banner -->
      ${
        metrics.outOfStockCount > 0 || metrics.lowStockCount > 0
          ? `
        <div class="p-4 rounded-xl border ${
          metrics.outOfStockCount > 0
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        } flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-0.5">
            <p class="text-xs font-bold uppercase tracking-wider">
              ${
                metrics.outOfStockCount > 0
                  ? `Inventory Warning · ${metrics.outOfStockCount} Out of Stock & ${metrics.lowStockCount} Low Stock`
                  : `Low Stock Warning · ${metrics.lowStockCount} Item(s) Ready for Replenishment`
              }
            </p>
            <p class="text-xs">
              ${[
                ...metrics.outOfStockItems.map((i) => `${i.name} (0 left)`),
                ...metrics.lowStockItems.map((i) => `${i.name} (${i.inStockCount} left, min ${i.minStockLevel ?? 3})`),
              ]
                .slice(0, 4)
                .map((txt) => esc(txt))
                .join(' · ')}
            </p>
          </div>
        </div>
      `
          : ''
      }

      <!-- 2. Stock In / Stock Out Movement Form -->
      <form id="admin-stock-movement-form" novalidate class="admin-card p-6 sm:p-8 space-y-6">
        <div class="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-slate-900">Record Stock Movement (Stock In / Stock Out)</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Incoming supplier deliveries automatically increase product stock; outgoing removals validate and deduct stock.
            </p>
          </div>
          <div class="inline-flex items-center gap-2">
            <button
              type="button"
              data-movement-mode="Stock In"
              class="admin-btn admin-btn-sm ${
                activeMovementMode === 'Stock In' ? 'admin-btn-primary' : 'admin-btn-secondary'
              }"
            >
              + Stock In (Receive Supply)
            </button>
            <button
              type="button"
              data-movement-mode="Stock Out"
              class="admin-btn admin-btn-sm ${
                activeMovementMode === 'Stock Out' ? 'admin-btn-danger' : 'admin-btn-secondary'
              }"
            >
              − Stock Out (Deduct Stock)
            </button>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label for="inv-move-product" class="admin-label">Select Product</label>
            <select id="inv-move-product" class="admin-select">
              ${state.catalog
                .map(
                  (p) =>
                    `<option value="${esc(p.id)}" ${p.id === selectedProductId ? 'selected' : ''}>${esc(p.name)} (${esc(p.sku)} · ${Math.max(0, Number(p.inStockCount ?? 0))} in stock)</option>`
                )
                .join('')}
            </select>
            ${
              selectedProduct
                ? `<p class="admin-hint">Current Stock: <strong>${Math.max(0, Number(selectedProduct.inStockCount ?? 0))} units</strong> (Min alert: ${Math.max(0, Number(selectedProduct.minStockLevel ?? 3))})</p>`
                : ''
            }
          </div>

          ${
            activeMovementMode === 'Stock In'
              ? `
            <div>
              <label for="inv-move-supplier" class="admin-label">Select Supplier</label>
              <select id="inv-move-supplier" class="admin-select">
                ${state.suppliers
                  .map((sup) => {
                    const isLinked = (sup.productIds || []).includes(selectedProductId);
                    return `<option value="${esc(sup.id)}" ${sup.id === selectedSupplierId ? 'selected' : ''}>${esc(sup.name)}${isLinked ? ' (Linked Supplier)' : ''}</option>`;
                  })
                  .join('')}
              </select>
              <p class="admin-hint">Supplier delivering this product batch</p>
            </div>

            <div>
              <label for="inv-move-qty" class="admin-label">Quantity Received</label>
              <input
                id="inv-move-qty"
                type="number"
                min="1"
                required
                value="${esc(state.adminMovementQuantity || '2')}"
                class="admin-input font-mono-tech"
              />
              <p class="admin-hint">Automatically increases available stock</p>
            </div>

            <div>
              <label for="inv-move-cost" class="admin-label">Purchase Cost (USD, Optional)</label>
              <input
                id="inv-move-cost"
                type="number"
                min="0"
                step="0.01"
                value="${esc(state.adminMovementCost)}"
                placeholder="e.g. 1850"
                class="admin-input font-mono-tech"
              />
              <p class="admin-hint">Unit or batch supply cost for accounting</p>
            </div>

            <div>
              <label for="inv-move-date" class="admin-label">Date Received</label>
              <input
                id="inv-move-date"
                type="date"
                required
                value="${esc(state.adminMovementDate)}"
                class="admin-input font-mono-tech"
              />
            </div>
          `
              : `
            <div>
              <label for="inv-move-qty" class="admin-label">Quantity Removed</label>
              <input
                id="inv-move-qty"
                type="number"
                min="1"
                max="${Math.max(1, Number(selectedProduct?.inStockCount ?? 1))}"
                required
                value="${esc(state.adminMovementQuantity || '1')}"
                class="admin-input font-mono-tech"
              />
              <p class="admin-hint">Cannot exceed current available stock (${Math.max(0, Number(selectedProduct?.inStockCount ?? 0))})</p>
            </div>

            <div>
              <label for="inv-move-reason" class="admin-label">Reason for Stock Out</label>
              <select id="inv-move-reason" class="admin-select">
                <option value="Damaged" ${state.adminMovementReason === 'Damaged' ? 'selected' : ''}>Damaged</option>
                <option value="Adjustment" ${state.adminMovementReason === 'Adjustment' ? 'selected' : ''}>Adjustment</option>
                <option value="Showroom Floor Sample" ${state.adminMovementReason === 'Showroom Floor Sample' ? 'selected' : ''}>Showroom Floor Sample</option>
                <option value="Other" ${state.adminMovementReason === 'Other' ? 'selected' : ''}>Other (Specify below)</option>
              </select>
            </div>

            <div class="${state.adminMovementReason === 'Other' ? '' : 'hidden'}" id="inv-move-custom-reason-wrap">
              <label for="inv-move-custom-reason" class="admin-label">Specify Reason</label>
              <input
                id="inv-move-custom-reason"
                type="text"
                value="${esc(state.adminMovementCustomReason)}"
                placeholder="Describe reason for stock removal..."
                class="admin-input"
              />
            </div>

            <div>
              <label for="inv-move-date" class="admin-label">Date Recorded</label>
              <input
                id="inv-move-date"
                type="date"
                required
                value="${esc(state.adminMovementDate)}"
                class="admin-input font-mono-tech"
              />
            </div>
          `
          }
        </div>

        <p id="admin-stock-movement-feedback" class="hidden text-xs font-semibold p-3 rounded-lg border"></p>

        <div class="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button type="submit" id="admin-submit-movement-btn" class="admin-btn admin-btn-primary">
            ${activeMovementMode === 'Stock In' ? 'Save Stock In Transaction' : 'Save Stock Out Transaction'}
          </button>
        </div>
      </form>

      <!-- 3. Stock Management Table -->
      <div class="admin-card overflow-hidden">
        <div class="admin-toolbar">
          <div>
            <h2 class="text-base font-bold text-slate-900">Product Stock Management</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              View available quantities, set minimum stock levels, and trigger quick Stock In / Stock Out actions
            </p>
          </div>
          <div class="admin-toolbar-filters">
            <input
              id="admin-inv-stock-search"
              type="search"
              value="${esc(state.adminInventoryStockSearch)}"
              placeholder="Search product or SKU..."
              aria-label="Search inventory products"
              class="admin-input admin-search-input"
            />
            <select
              id="admin-inv-stock-filter"
              aria-label="Filter inventory by stock status"
              class="admin-select admin-filter-select"
            >
              <option value="all" ${stockFilter === 'all' ? 'selected' : ''}>All Stock Levels (${state.catalog.length})</option>
              <option value="low_stock" ${stockFilter === 'low_stock' ? 'selected' : ''}>Low Stock Warnings (${metrics.lowStockCount})</option>
              <option value="out_of_stock" ${stockFilter === 'out_of_stock' ? 'selected' : ''}>Out of Stock (${metrics.outOfStockCount})</option>
              <option value="in_stock" ${stockFilter === 'in_stock' ? 'selected' : ''}>Healthy Stock</option>
            </select>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Suppliers</th>
                <th>Available Stock</th>
                <th>Min Stock Level</th>
                <th>Status &amp; Warnings</th>
                <th class="text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredStockCatalog
                .map((prod) => {
                  const st = getProductStockStatus(prod);
                  const prodSuppliers = state.suppliers.filter((s) =>
                    (s.productIds || []).includes(prod.id)
                  );
                  const statusBadge =
                    st.statusKey === 'out_of_stock'
                      ? `<span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Out of Stock Warning</span>`
                      : st.statusKey === 'low_stock'
                      ? `<span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">Low Stock Warning (≤ ${st.minStockLevel})</span>`
                      : `<span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">In Stock</span>`;

                  return `
                <tr>
                  <td>
                    <p class="font-semibold text-slate-900 text-sm">${esc(prod.name)}</p>
                    <p class="font-mono-tech text-xs text-slate-500">${esc(prod.sku)} · ${esc(prod.categoryName)}</p>
                  </td>
                  <td>
                    <div class="flex flex-wrap gap-1">
                      ${
                        prodSuppliers.length === 0
                          ? `<span class="text-xs text-slate-400">Unassigned</span>`
                          : prodSuppliers
                              .map(
                                (s) =>
                                  `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">${esc(s.name)}</span>`
                              )
                              .join('')
                      }
                    </div>
                  </td>
                  <td class="whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        aria-label="Available stock for ${esc(prod.name)}"
                        data-inline-stock-input="${esc(prod.id)}"
                        value="${st.availableStock}"
                        class="admin-input font-mono-tech text-xs font-bold"
                        style="width: 78px; padding: 0.35rem 0.5rem;"
                      />
                      <span class="text-xs text-slate-500">units</span>
                    </div>
                  </td>
                  <td class="whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        aria-label="Minimum stock level for ${esc(prod.name)}"
                        data-inline-min-stock-input="${esc(prod.id)}"
                        value="${st.minStockLevel}"
                        class="admin-input font-mono-tech text-xs"
                        style="width: 72px; padding: 0.35rem 0.5rem;"
                      />
                      <span class="text-xs text-slate-400">min</span>
                    </div>
                  </td>
                  <td class="whitespace-nowrap">
                    ${statusBadge}
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <div class="inline-flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        data-inline-stock-save="${esc(prod.id)}"
                        class="admin-btn admin-btn-sm admin-btn-secondary"
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        data-quick-stock-in="${esc(prod.id)}"
                        class="admin-btn admin-btn-sm admin-btn-primary"
                      >
                        + Stock In
                      </button>
                      <button
                        type="button"
                        data-quick-stock-out="${esc(prod.id)}"
                        ${st.availableStock <= 0 ? 'disabled' : ''}
                        class="admin-btn admin-btn-sm admin-btn-secondary ${
                          st.availableStock <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                        }"
                      >
                        − Stock Out
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
      </div>

      <!-- 4. Inventory History Section -->
      <div class="admin-card overflow-hidden">
        <div class="admin-toolbar">
          <div>
            <h2 class="text-base font-bold text-slate-900">Inventory Transaction History (${filteredTransactions.length})</h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Complete audit log of all Stock In deliveries, Stock Out deductions, and customer checkout adjustments
            </p>
          </div>
          <div class="admin-toolbar-filters">
            <input
              id="admin-inv-history-search"
              type="search"
              value="${esc(state.adminInventoryHistorySearch)}"
              placeholder="Search product, supplier, reason, or admin..."
              aria-label="Search inventory history"
              class="admin-input admin-search-input"
            />
            <select
              id="admin-inv-history-type"
              aria-label="Filter transactions by type"
              class="admin-select admin-filter-select"
            >
              <option value="all" ${historyTypeFilter === 'all' ? 'selected' : ''}>All Transactions (${state.inventoryTransactions.length})</option>
              <option value="Stock In" ${historyTypeFilter === 'Stock In' ? 'selected' : ''}>Stock In Only</option>
              <option value="Stock Out" ${historyTypeFilter === 'Stock Out' ? 'selected' : ''}>Stock Out Only</option>
            </select>
          </div>
        </div>

        ${
          filteredTransactions.length === 0
            ? `
          <div class="admin-empty-state">
            <p class="text-sm font-bold text-slate-900">No inventory transactions match your filter</p>
            <p class="text-xs text-slate-500 mt-1">Record a Stock In or Stock Out movement above to log transactions here.</p>
          </div>
        `
            : `
          <div class="overflow-x-auto">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
                  <th>Product Name</th>
                  <th>Transaction Type</th>
                  <th>Quantity</th>
                  <th>Previous → New Stock</th>
                  <th>Supplier / Reason</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                ${filteredTransactions
                  .map((tx) => {
                    const isStockIn = tx.transactionType === 'Stock In';
                    return `
                  <tr>
                    <td class="font-mono-tech text-xs text-slate-500 whitespace-nowrap">${esc(tx.dateTime)}</td>
                    <td>
                      <p class="font-semibold text-slate-900 text-xs sm:text-sm">${esc(tx.productName)}</p>
                      <p class="font-mono-tech text-[11px] text-slate-500">${esc(tx.productSku || '')}</p>
                    </td>
                    <td class="whitespace-nowrap">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${
                        isStockIn
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }">
                        ${esc(tx.transactionType)}
                      </span>
                    </td>
                    <td class="font-mono-tech text-xs font-bold ${isStockIn ? 'text-emerald-700' : 'text-rose-700'} whitespace-nowrap">
                      ${isStockIn ? `+${tx.quantity}` : `−${tx.quantity}`}
                    </td>
                    <td class="font-mono-tech text-xs text-slate-700 whitespace-nowrap">
                      ${tx.previousStock} → <strong>${tx.newStock}</strong>
                    </td>
                    <td class="text-xs text-slate-600">
                      ${
                        isStockIn
                          ? `<p class="font-semibold text-slate-900">${esc(tx.supplierName || 'Authorized Supplier')}</p>
                             <p class="text-[11px] text-slate-500">${tx.purchaseCost !== null && tx.purchaseCost !== undefined ? `Purchase Cost: ${usd(tx.purchaseCost)}` : esc(tx.reason || 'Supplier Restock')}</p>`
                          : `<p class="font-semibold text-slate-900">Reason: ${esc(tx.reason || 'Adjustment')}</p>`
                      }
                    </td>
                    <td class="text-xs text-slate-600 whitespace-nowrap">
                      ${esc(tx.adminName || 'Lillia Mercier (Business Owner)')}
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

    // Mode toggle buttons (Stock In vs Stock Out)
    adminInventoryEl.querySelectorAll('[data-movement-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.adminMovementMode = btn.getAttribute('data-movement-mode') || 'Stock In';
        renderDashboardContent();
      });
    });

    const moveProdSelect = document.getElementById('inv-move-product');
    if (moveProdSelect) {
      moveProdSelect.addEventListener('change', (e) => {
        state.adminMovementProductId = e.target.value;
        const linked = state.suppliers.find((s) =>
          (s.productIds || []).includes(state.adminMovementProductId)
        );
        if (linked) state.adminMovementSupplierId = linked.id;
        renderDashboardContent();
      });
    }

    const moveSupSelect = document.getElementById('inv-move-supplier');
    if (moveSupSelect) {
      moveSupSelect.addEventListener('change', (e) => {
        state.adminMovementSupplierId = e.target.value;
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
        const productId = document.getElementById('inv-move-product')?.value || '';
        const quantity = Number(document.getElementById('inv-move-qty')?.value || 0);
        const date = document.getElementById('inv-move-date')?.value || state.adminMovementDate;
        const supplierId = document.getElementById('inv-move-supplier')?.value || '';
        const purchaseCost = document.getElementById('inv-move-cost')?.value ?? '';
        const reasonSel = document.getElementById('inv-move-reason')?.value || 'Damaged';
        const customReason = document.getElementById('inv-move-custom-reason')?.value.trim() || '';
        const finalReason =
          activeMovementMode === 'Stock Out'
            ? reasonSel === 'Other'
              ? customReason || 'Other'
              : reasonSel
            : 'Supplier Delivery';

        const adminName = state.sessionUser?.name
          ? `${state.sessionUser.name} (Admin)`
          : 'Lillia Mercier (Business Owner)';

        const result = applyStockMovement({
          catalog: state.catalog,
          suppliers: state.suppliers,
          adminName,
          movementInput: {
            productId,
            transactionType: activeMovementMode,
            quantity,
            supplierId,
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
              'text-xs font-semibold p-3 rounded-lg border bg-rose-50 border-rose-200 text-rose-700 block';
          }
          return;
        }

        state.catalog = result.updatedCatalog;
        persistProductToStorage(result.updatedProduct);
        state.inventoryTransactions.unshift(result.transaction);
        saveInventoryTransactionsToStorage();

        showAdminBanner(
          `${result.transaction.transactionType}: ${result.transaction.productName} stock updated (${result.transaction.previousStock} → ${result.transaction.newStock} units).`
        );
        renderDashboardContent();
      });
    }

    // Inline Stock & Min Stock Level Update buttons
    adminInventoryEl.querySelectorAll('[data-inline-stock-save]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-inline-stock-save') || '';
        const prod = state.catalog.find((p) => p.id === pid);
        if (!prod) return;

        const stockInput = adminInventoryEl.querySelector(`[data-inline-stock-input="${pid}"]`);
        const minInput = adminInventoryEl.querySelector(`[data-inline-min-stock-input="${pid}"]`);
        const nextStockRaw = Number(stockInput ? stockInput.value : prod.inStockCount);
        const nextMinRaw = Number(minInput ? minInput.value : prod.minStockLevel ?? 2);

        if (!Number.isFinite(nextStockRaw) || nextStockRaw < 0) {
          showAdminBanner('Available stock must be 0 or a positive whole number.');
          return;
        }
        if (!Number.isFinite(nextMinRaw) || nextMinRaw < 0) {
          showAdminBanner('Minimum stock level must be 0 or a positive whole number.');
          return;
        }

        const prevStock = Math.max(0, Math.floor(Number(prod.inStockCount ?? 0)));
        const nextStock = Math.floor(nextStockRaw);
        const nextMin = Math.floor(nextMinRaw);

        const updatedProd = {
          ...prod,
          inStockCount: nextStock,
          minStockLevel: nextMin,
        };
        state.catalog = state.catalog.map((item) => (item.id === pid ? updatedProd : item));
        persistProductToStorage(updatedProd);

        if (nextStock !== prevStock) {
          const delta = Math.abs(nextStock - prevStock);
          const txType = nextStock > prevStock ? 'Stock In' : 'Stock Out';
          const linkedSup = state.suppliers.find((s) => (s.productIds || []).includes(pid));
          state.inventoryTransactions.unshift({
            id: `inv-tx-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
            productId: prod.id,
            productName: prod.name,
            productSku: prod.sku,
            transactionType: txType,
            quantity: delta,
            previousStock: prevStock,
            newStock: nextStock,
            supplierId: txType === 'Stock In' ? linkedSup?.id || null : null,
            supplierName: txType === 'Stock In' ? linkedSup?.name || 'Direct Inventory Adjustment' : null,
            purchaseCost: null,
            reason: 'Adjustment (Direct Stock Update)',
            dateTime: `${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 5)}`,
            adminName: state.sessionUser?.name
              ? `${state.sessionUser.name} (Admin)`
              : 'Lillia Mercier (Business Owner)',
          });
          saveInventoryTransactionsToStorage();
        }

        showAdminBanner(
          `Updated "${prod.name}" stock to ${nextStock} units (Min alert level: ${nextMin}).`
        );
        renderDashboardContent();
      });
    });

    // Quick + Stock In / - Stock Out buttons in table
    adminInventoryEl.querySelectorAll('[data-quick-stock-in]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-quick-stock-in') || '';
        state.adminMovementMode = 'Stock In';
        state.adminMovementProductId = pid;
        const linkedSup = state.suppliers.find((s) => (s.productIds || []).includes(pid));
        if (linkedSup) state.adminMovementSupplierId = linkedSup.id;
        renderDashboardContent();
        document.getElementById('admin-stock-movement-form')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    adminInventoryEl.querySelectorAll('[data-quick-stock-out]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-quick-stock-out') || '';
        state.adminMovementMode = 'Stock Out';
        state.adminMovementProductId = pid;
        renderDashboardContent();
        document.getElementById('admin-stock-movement-form')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    const invStockSearchEl = document.getElementById('admin-inv-stock-search');
    if (invStockSearchEl) {
      invStockSearchEl.addEventListener('input', (e) => {
        state.adminInventoryStockSearch = e.target.value;
        const pos = e.target.selectionStart || 0;
        renderDashboardContent();
        const nextInput = document.getElementById('admin-inv-stock-search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(pos, pos);
        }
      });
    }

    const invStockFilterEl = document.getElementById('admin-inv-stock-filter');
    if (invStockFilterEl) {
      invStockFilterEl.addEventListener('change', (e) => {
        state.adminInventoryStockFilter = e.target.value;
        renderDashboardContent();
      });
    }

    const invHistorySearchEl = document.getElementById('admin-inv-history-search');
    if (invHistorySearchEl) {
      invHistorySearchEl.addEventListener('input', (e) => {
        state.adminInventoryHistorySearch = e.target.value;
        const pos = e.target.selectionStart || 0;
        renderDashboardContent();
        const nextInput = document.getElementById('admin-inv-history-search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(pos, pos);
        }
      });
    }

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
                  <th>Voucher Code</th>
                  <th>Customer</th>
                  <th>Eligible Product</th>
                  <th>Status</th>
                  <th class="text-right">Discount</th>
                  <th class="text-right">Action</th>
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
                    <td class="text-xs text-slate-600">${esc(v.customerEmail)}</td>
                    <td>
                      <p class="font-semibold text-slate-900 text-xs sm:text-sm">${esc(v.furnitureName || v.productName)}</p>
                      <p class="font-mono-tech text-xs text-slate-500">${esc(v.furnitureSku || '')}</p>
                    </td>
                    <td class="whitespace-nowrap">
                      <span class="admin-status-dot ${v.status === 'Active' ? 'text-emerald-700' : 'text-slate-500'}">${esc(v.status)}</span>
                      <span class="text-xs text-slate-400 ml-1">· Exp ${esc(v.expiryDate || '2026-12-31')}</span>
                    </td>
                    <td class="text-right font-mono-tech font-bold text-[#0284C7] whitespace-nowrap">${esc(discountText)}</td>
                    <td class="text-right whitespace-nowrap">
                      <button
                        type="button"
                        data-revoke-voucher="${esc(v.id)}"
                        class="admin-btn admin-btn-sm admin-btn-danger-ghost"
                      >
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

  // 8. Admin Client Orders Management Table (#admin-tab-orders)
  const adminOrdersEl = document.getElementById('admin-tab-orders');
  if (adminOrdersEl) {
    const statusOptions = [
      'Order Confirmed · In Production Queue',
      'Timber Selection & Kiln Verification',
      'In Joinery & Millwork',
      'Hand-Rubbed Finishing & Upholstery',
      'Quality Inspection · Ready for Dispatch',
      'Dispatched · White-Glove Transit',
    ];

    const ordQuery = (state.adminOrderSearch || '').trim().toLowerCase();
    const stageFilter = state.adminOrderStage || 'all';

    const filteredOrders = state.orders.filter((o) => {
      const matchesQuery =
        !ordQuery ||
        o.orderNumber.toLowerCase().includes(ordQuery) ||
        o.clientName.toLowerCase().includes(ordQuery) ||
        o.clientEmail.toLowerCase().includes(ordQuery) ||
        o.furnitureName.toLowerCase().includes(ordQuery);

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
            <input
              id="admin-orders-search"
              type="search"
              value="${esc(state.adminOrderSearch)}"
              placeholder="Search order # or customer..."
              aria-label="Search customer orders"
              class="admin-input admin-search-input"
            />
            <select
              id="admin-orders-stage-filter"
              aria-label="Filter orders by production stage"
              class="admin-select admin-filter-select"
            >
              <option value="all" ${stageFilter === 'all' ? 'selected' : ''}>All Stages (${state.orders.length})</option>
              <option value="confirmed" ${stageFilter === 'confirmed' ? 'selected' : ''}>Confirmed &amp; Timber Prep</option>
              <option value="production" ${stageFilter === 'production' ? 'selected' : ''}>In Production &amp; Finishing</option>
              <option value="quality" ${stageFilter === 'quality' ? 'selected' : ''}>Quality Check</option>
              <option value="delivered" ${stageFilter === 'delivered' ? 'selected' : ''}>Dispatched / Delivered</option>
            </select>
          </div>
          <span class="text-xs font-medium text-slate-500">Showing ${filteredOrders.length} of ${state.orders.length} orders</span>
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
                  <th>Order &amp; Customer</th>
                  <th>Product &amp; Finish</th>
                  <th>Order Status</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${filteredOrders
                  .map((o) => {
                    const realIdx = state.orders.findIndex((item) => item.orderNumber === o.orderNumber);
                    return `
                  <tr>
                    <td>
                      <p class="font-mono-tech text-xs font-bold text-[#0284C7]">#${esc(o.orderNumber)}</p>
                      <p class="font-semibold text-slate-900 text-sm mt-0.5">${esc(o.clientName)}</p>
                      <p class="text-xs text-slate-500">${esc(o.clientEmail)}</p>
                    </td>
                    <td>
                      <p class="font-semibold text-slate-900 text-sm">${esc(o.furnitureName)}</p>
                      <p class="text-xs text-slate-500 mt-0.5">Finish: ${esc(o.selectedFinish)} · Est. ${esc(o.estimatedDelivery || '4–6 Weeks')}</p>
                    </td>
                    <td>
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
                    </td>
                    <td class="text-right font-mono-tech text-sm font-bold text-slate-900 whitespace-nowrap">
                      ${usd(o.totalAmount)}
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

    const ordSearch = document.getElementById('admin-orders-search');
    if (ordSearch) {
      ordSearch.addEventListener('input', (e) => {
        state.adminOrderSearch = e.target.value;
        const pos = e.target.selectionStart || 0;
        renderDashboardContent();
        const nextInput = document.getElementById('admin-orders-search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(pos, pos);
        }
      });
    }

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
        ord.status = e.target.value;
        try {
          localStorage.setItem('lr_customer_orders', JSON.stringify(state.orders));
        } catch (_err) {
          // Ignore storage error
        }
        showAdminBanner(`Updated Order #${ord.orderNumber} status to "${ord.status}".`);
        renderDashboardContent();
      });
    });
  }
}

/* ==========================================================================
   BOOTSTRAP
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  state.sessionUser = loadSessionUser();
  if (document.getElementById('nav-auth-actions')) {
    syncAuthNavigationUI();
  }

  window.addEventListener('storage', (event) => {
    if (!event.key || event.key === 'lr_session_user' || event.key === 'lr_cart_items') {
      state.sessionUser = loadSessionUser();
      if (document.getElementById('nav-auth-actions')) {
        syncAuthNavigationUI();
      }
    }
  });

  window.addEventListener('pageshow', () => {
    state.sessionUser = loadSessionUser();
    if (document.getElementById('nav-auth-actions')) {
      syncAuthNavigationUI();
    }
  });

  const data = await loadData();
  state.categories = Array.isArray(data.categories) ? data.categories : [];
  state.catalog = Array.isArray(data.products) ? data.products : [];
  state.messengerConversations = Array.isArray(data.messengerConversations)
    ? data.messengerConversations
    : [];
  state.suppliers = Array.isArray(data.suppliers) ? data.suppliers : [];
  state.inventoryTransactions = Array.isArray(data.inventoryTransactions)
    ? data.inventoryTransactions
    : [];
  state.vouchers = Array.isArray(data.vouchers) ? data.vouchers : [];
  state.orders = Array.isArray(data.orders) ? data.orders : [];

  state.adminMovementProductId = state.catalog[0]?.id || '';
  state.adminMovementSupplierId = state.suppliers[0]?.id || '';

  state.catalog.forEach((p) => {
    state.selectedColorByProduct[p.id] = p.colorVariants?.[0]?.name || p.defaultFinish;
  });

  // Cart starts empty by default unless the user explicitly added items!
  state.cartItems = loadCartFromStorage();

  if (document.getElementById('product-catalog-grid')) {
    initShowroomPage();
  }
  if (document.getElementById('client-portal-view') || document.getElementById('admin-portal-view')) {
    initDashboardPage();
  }
});

