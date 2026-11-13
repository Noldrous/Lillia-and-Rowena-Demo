/**
 * Lillia and Rowena Furniture — Lightweight DOM Controller
 * Handles in-place Hero Tab switching, color-variant pricing, empty-default cart,
 * strict role-based dashboard routing (Customer vs Admin), and the redesigned User Dashboard.
 */

import {
  ADMIN_MESSENGER_PLACEHOLDER_URL,
  CATALOG_COLOR_FILTERS,
  calculateOrderPricing,
  computeVariantPricing,
  filterCatalogPageItems,
  filterFurnitureItems,
  findMatchingColorVariant,
  getColorFilterCounts,
  getRecommendedBestSellers,
  validateVoucherForOrder,
} from './store.js';

const HERO_TAB_CONTENT = {
  flagship: {
    eyebrow: '01. Lillia and Rowena Furniture · Direct Owner Offers & Custom Millwork',
    title: 'Sculptural Comfort Meets Heirloom Solid Timber.',
    description:
      'Furnish every room with kiln-dried American black walnut, Belgian bouclé upholstery, and honed Roman travertine—make a direct offer on Messenger or request your own custom furniture design.',
    priceLabel: 'Collection Starting At',
    price: '$1,180',
    monthly: 'Or $49/mo for 24 mos*',
    ctaText: 'Explore Living & Lounge',
    filterTarget: 'living',
    image: 'assets/images/hero_living_room_atelier.jpg',
    cardSubtitle: 'Featured Room Package · Lillia Monolith Dining & Rowena Bouclé Salon · 3–6 Weeks Lead Time',
    cardTitle: 'Living & Lounge Showroom Collection',
  },
  living: {
    eyebrow: '02. Living & Lounge Collection · Bouclé Sofas, White Oak Chairs & Travertine',
    title: 'Low-Slung Bouclé Sofas & Travertine Salons.',
    description:
      'Conversational crescent sofas upholstered in heavyweight Belgian wool bouclé, paired with sculpted kiln-dried white oak lounge frames and honed Italian travertine coffee plinths.',
    priceLabel: 'Living Pieces Starting At',
    price: '$1,680',
    monthly: 'Or $70/mo for 24 mos*',
    ctaText: 'Browse Living & Lounge Below',
    filterTarget: 'living',
    image: 'assets/images/category_living_lounge.jpg',
    cardSubtitle: 'CAT-01 / LIVING · Kiln-Dried White Oak, Heavyweight Wool Bouclé & Honed Travertine',
    cardTitle: 'Living & Lounge Architectural Suite',
  },
  dining: {
    eyebrow: '03. Dining & Tables Collection · FAS American Black Walnut & Danish Cord',
    title: 'Monolithic Black Walnut Slab Dining Tables.',
    description:
      'Heirloom dining tables milled from FAS-grade American black walnut slabs with hand-cut butterfly joinery, paired with hand-woven Danish paper-cord dining chairs.',
    priceLabel: 'Dining Pieces Starting At',
    price: '$1,290',
    monthly: 'Or $54/mo for 24 mos*',
    ctaText: 'Browse Dining & Tables Below',
    filterTarget: 'dining',
    image: 'assets/images/category_dining_tables.jpg',
    cardSubtitle: 'CAT-02 / DINING · FAS American Black Walnut & Quarter-Sawn White Oak · 4–8 Weeks Lead Time',
    cardTitle: 'Dining & Tables Showroom Collection',
  },
  bedroom: {
    eyebrow: '04. Bedroom Sanctuary Collection · Belgian Flax Linen & Solid European Ash',
    title: 'Tailored Belgian Linen Beds & Ash Nightstands.',
    description:
      'Quiet, grounding bedroom architecture featuring unbleached Belgian flax linen platform beds, solid European ash rails, and cantilevered bedside tables with soft-close dovetail joinery.',
    priceLabel: 'Bedroom Pieces Starting At',
    price: '$1,180',
    monthly: 'Or $49/mo for 24 mos*',
    ctaText: 'Browse Bedroom Sanctuary Below',
    filterTarget: 'bedroom',
    image: 'assets/images/category_bedroom_sanctuary.jpg',
    cardSubtitle: 'CAT-03 / BEDROOM · Belgian Unbleached Flax Linen & Solid European Ash · 3–5 Weeks Lead Time',
    cardTitle: 'Bedroom Sanctuary Collection',
  },
  office: {
    eyebrow: '05. Study & Credenzas Collection · Fluted Walnut Sideboards & Writing Desks',
    title: 'Fluted Walnut Credenzas & Architect Writing Desks.',
    description:
      'Commanding writing desks and custom-milled fluted black walnut credenzas engineered with saddle-stitched bridle leather inlays, concealed cable channels, and solid brass hardware.',
    priceLabel: 'Study Pieces Starting At',
    price: '$2,150',
    monthly: 'Or $89/mo for 24 mos*',
    ctaText: 'Browse Study & Credenzas Below',
    filterTarget: 'office',
    image: 'assets/images/category_office_storage.jpg',
    cardSubtitle: 'CAT-04 / STUDY · Fluted Black Walnut & Bridle Leather · 2–6 Weeks Lead Time',
    cardTitle: 'Study & Credenzas Collection',
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
  sessionUser: null, // null when logged out, { email, name, role: 'client' | 'admin' } when logged in
  activeClientTab: 'home',
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
        baseData.products = [...customProducts, ...(baseData.products || [])];
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

    const customVouchersRaw = localStorage.getItem('lr_custom_vouchers');
    if (customVouchersRaw) {
      const customVouchers = JSON.parse(customVouchersRaw);
      if (Array.isArray(customVouchers) && customVouchers.length > 0) {
        baseData.vouchers = [...customVouchers, ...(baseData.vouchers || [])];
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
function initShowroomPage() {
  // Update Top Nav Auth Button & Track Order Link based on logged-in status
  const navAuthActions = document.getElementById('nav-auth-actions');
  const heroTrackLink = document.getElementById('hero-track-order-link');
  const cartUserEmailEl = document.getElementById('cart-user-email');
  const cartCheckoutLink = document.getElementById('cart-checkout-link');

  if (state.sessionUser) {
    const isAdmin = state.sessionUser.role === 'admin';
    const dashUrl = `dashboard.html?role=${isAdmin ? 'admin' : 'client'}`;
    const dashLabel = isAdmin ? 'Admin Dashboard' : 'My Dashboard';

    if (navAuthActions) {
      navAuthActions.innerHTML = `
        <a
          href="${dashUrl}"
          data-testid="nav-dashboard-button"
          class="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 bg-[#0095FF] text-white hover:bg-[#0077CC] shadow-xs"
        >
          <span>${esc(dashLabel)}</span>
        </a>
        <button
          type="button"
          id="nav-logout-btn"
          class="px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#F0F8FF] hover:bg-[#D8EEFF] text-[#0D1015] border border-[#BCE3FF] cursor-pointer"
        >
          Log Out
        </button>
      `;
      const logoutBtn = document.getElementById('nav-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('lr_session_user');
          localStorage.removeItem('lr_cart_items');
          window.location.href = 'index.html';
        });
      }
    }
    if (heroTrackLink) heroTrackLink.href = dashUrl;
    if (cartUserEmailEl) cartUserEmailEl.textContent = state.sessionUser.email;
    if (cartCheckoutLink) {
      cartCheckoutLink.href = dashUrl;
      cartCheckoutLink.textContent = isAdmin ? 'Open Admin Dashboard →' : 'Go to My Dashboard →';
    }
  } else {
    if (heroTrackLink) heroTrackLink.href = 'login.html';
    if (cartUserEmailEl) cartUserEmailEl.textContent = 'Sign in to verify your email';
    if (cartCheckoutLink) {
      cartCheckoutLink.href = 'login.html';
      cartCheckoutLink.textContent = 'Sign In to Checkout →';
    }
  }

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
      if (primaryCta) {
        primaryCta.setAttribute('data-filter-target', data.filterTarget);
        primaryCta.setAttribute('href', `catalog.html?category=${encodeURIComponent(data.filterTarget)}`);
      }
      const cardCta = document.getElementById('hero-card-cta');
      if (cardCta) {
        cardCta.setAttribute('data-filter-target', data.filterTarget);
        cardCta.setAttribute('href', `catalog.html?category=${encodeURIComponent(data.filterTarget)}`);
      }
    });
  });

  const showRecommendedBtn = document.getElementById('catalog-show-recommended-btn');
  if (showRecommendedBtn) {
    showRecommendedBtn.addEventListener('click', () => {
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

  // Top Nav Search Input + Clear Button (On Homepage: typing only updates input; pressing Enter opens catalog.html)
  const topSearch = document.getElementById('top-nav-search');
  const topClear = document.getElementById('top-nav-search-clear');

  const syncClearButtons = (val) => {
    const hasQuery = Boolean(String(val || '').trim());
    if (topClear) {
      topClear.classList.toggle('hidden', !hasQuery);
      topClear.classList.toggle('flex', hasQuery);
    }
  };

  if (topSearch) {
    topSearch.addEventListener('input', (e) => {
      syncClearButtons(e.target.value);
    });
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

  // Cart Drawer Toggle (Open, Close Button, Backdrop Click, Escape Key)
  const cartDrawer = document.getElementById('cart-drawer');
  const openCartBtn = document.getElementById('open-cart-btn');
  const closeCartBtn = document.getElementById('close-cart-btn');
  const closeDrawer = () => {
    if (!cartDrawer) return;
    cartDrawer.classList.add('hidden');
    cartDrawer.classList.remove('flex');
  };
  if (openCartBtn && cartDrawer) {
    openCartBtn.addEventListener('click', () => {
      cartDrawer.classList.remove('hidden');
      cartDrawer.classList.add('flex');
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
      const productIds = state.cartItems.map((c) => c.product.id);
      const check = validateVoucherForOrder(state.vouchers, code, activeEmail, productIds);

      if (feedback) {
        feedback.classList.remove('hidden', 'text-emerald-700', 'text-rose-600');
        if (check.valid) {
          state.appliedVoucher = check.voucher;
          feedback.textContent = `✓ Voucher ${check.voucher.code} applied (-${usd(check.discountAmount)})!`;
          feedback.classList.add('text-emerald-700');
        } else {
          state.appliedVoucher = null;
          feedback.textContent = check.errorMessage;
          feedback.classList.add('text-rose-600');
        }
      }
      renderCartDrawer();
    });
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
  const container = document.getElementById('room-collections-grid');
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
            <a
              href="${esc(catHref)}"
              data-testid="category-card-link-${esc(cat.id)}"
              class="w-full py-2.5 px-3.5 rounded-xl ${
                isSelected
                  ? 'bg-[#0095FF] text-white'
                  : 'bg-[#EBF6FF] group-hover:bg-[#0095FF] text-[#0D1015] group-hover:text-white'
              } text-xs font-semibold transition-colors flex items-center justify-between"
            >
              <span>Explore ${esc(cat.name)}</span>
              <span>→</span>
            </a>
          </div>
        </article>
      `;
    })
    .join('');
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
  const isRecommendedView = !hasQuery && (!state.selectedCategory || state.selectedCategory === 'recommended' || state.selectedCategory === 'all');

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
      eyebrowEl.textContent = matchedCat ? `${matchedCat.code} · Category Showcase` : '02. Showroom Search Results';
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
          <button
            type="button"
            id="catalog-reset-filters-btn"
            class="px-5 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold cursor-pointer transition-colors"
          >
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
      const selectedFinish = state.selectedColorByProduct[item.id] || item.colorVariants?.[0]?.name || item.defaultFinish;
      const pricing = computeVariantPricing(item, selectedFinish);
      const productPageUrl = `catalog.html?category=${encodeURIComponent(item.categoryId)}&product=${encodeURIComponent(item.id)}`;

      return `
        <article class="group rounded-2xl bg-white border border-[#BCE3FF] hover:border-[#0095FF] overflow-hidden shadow-2xs hover:shadow-xl transition-all flex flex-col justify-between">
          <div>
            <a
              href="${esc(productPageUrl)}"
              data-testid="home-product-card-link-${esc(item.id)}"
              class="block aspect-[4/3] relative overflow-hidden bg-slate-100"
            >
              <img src="${esc(item.image)}" alt="${esc(item.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
                ${
                  item.isBestSeller
                    ? `<span class="px-2.5 py-1 rounded-md bg-[#0095FF] text-white font-mono-tech text-[11px] font-bold">${esc(item.bestSellerBadge || 'Best Seller')}</span>`
                    : ''
                }
                ${
                  item.discountPercent > 0
                    ? `<span class="px-2.5 py-1 rounded-md bg-[#0D1015] text-white font-mono-tech text-[11px] font-bold">${item.discountPercent}% OFF</span>`
                    : ''
                }
                ${
                  item.isCustomClientDesign
                    ? `<span class="px-2.5 py-1 rounded-md bg-[#0095FF] text-white font-mono-tech text-[11px] font-bold">Client Messenger Design</span>`
                    : ''
                }
              </div>
              <div class="absolute bottom-3 left-3">
                <span class="px-2.5 py-1 rounded-md bg-white/95 text-[#0D1015] font-mono-tech text-[11px] font-semibold">
                  ${esc(item.sku)} · ${esc(item.categoryName)}
                </span>
              </div>
            </a>

            <div class="p-5 space-y-3">
              <div class="flex items-start justify-between gap-3">
                <a
                  href="${esc(productPageUrl)}"
                  class="font-serif-display text-lg font-bold text-[#0D1015] hover:text-[#0095FF] leading-snug transition-colors"
                >
                  ${esc(item.name)}
                </a>
                <div class="text-right shrink-0">
                  ${
                    item.discountPercent > 0
                      ? `<p class="font-mono-tech text-xs text-slate-400 line-through">${usd(pricing.variantBasePrice)}</p>`
                      : ''
                  }
                  <p class="font-mono-tech text-xl font-bold text-[#0095FF]">${usd(pricing.effectivePrice)}</p>
                </div>
              </div>

              <p class="text-xs text-[#475569] leading-relaxed line-clamp-2">${esc(item.description)}</p>

              <div class="pt-1 flex items-center justify-between text-[11px] text-[#64748B] font-mono-tech">
                <span>${esc(item.dimensions)}</span>
                <span>${item.leadTimeWeeks} wks lead</span>
              </div>
            </div>
          </div>

          <div class="px-5 pb-5 pt-2 space-y-2">
            <a
              href="${esc(productPageUrl)}"
              data-testid="home-product-open-catalog-${esc(item.id)}"
              class="block w-full py-2.5 px-3 rounded-xl bg-[#0D1015] hover:bg-[#0095FF] text-white text-xs font-semibold transition-colors text-center"
            >
              View in Catalog &amp; Filter by Color →
            </a>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-add-cart="${esc(item.id)}"
                class="py-2.5 px-3 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Add to Cart
              </button>
              <a
                href="${ADMIN_MESSENGER_PLACEHOLDER_URL}"
                target="_blank"
                rel="noopener noreferrer"
                class="py-2.5 px-3 rounded-xl bg-[#D8EEFF] hover:bg-[#BCE3FF] text-[#0D1015] text-xs font-semibold transition-colors text-center"
              >
                Make Offer ↗
              </a>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  // Bind Add to Cart buttons
  grid.querySelectorAll('[data-add-cart]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-add-cart');
      const product = state.catalog.find((p) => p.id === pid);
      if (!product) return;
      const finish = state.selectedColorByProduct[product.id] || product.colorVariants?.[0]?.name || product.defaultFinish;
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
      }
    });
  });
}

function renderCartDrawer() {
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
      state.cartItems.map((c) => c.product.id)
    );
    if (!recheck.valid) state.appliedVoucher = null;
  }

  if (voucherSection) voucherSection.classList.remove('hidden');
  if (footerTotals) footerTotals.classList.remove('hidden');

  list.innerHTML = state.cartItems
    .map((line, idx) => {
      const pricing = computeVariantPricing(line.product, line.finish);
      const lineTotal = pricing.effectivePrice * line.quantity;
      const thumb = (line.product.image || 'assets/images/category_living_lounge.jpg').replace(/^\//, '');
      return `
        <div class="p-3.5 rounded-2xl border border-[#BCE3FF] bg-[#F8FBFF] flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <img src="${esc(thumb)}" alt="${esc(line.product.name)}" class="w-14 h-14 rounded-xl object-cover border border-[#BCE3FF] shrink-0" />
            <div class="min-w-0 space-y-1">
              <p class="font-serif-display text-sm font-bold text-[#0D1015] truncate">${esc(line.product.name)}</p>
              <p class="font-mono-tech text-[11px] text-[#0077CC] truncate">${esc(pricing.colorName)} · ${usd(pricing.effectivePrice)} ea</p>
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
          <p class="font-mono-tech text-sm font-bold text-[#0D1015] shrink-0">${usd(lineTotal)}</p>
        </div>
      `;
    })
    .join('');

  list.querySelectorAll('[data-drawer-qty-idx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-drawer-qty-idx'));
      const delta = Number(btn.getAttribute('data-drawer-delta'));
      if (!state.cartItems[idx]) return;
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

  const linePrices = state.cartItems.map((c) => ({
    unitPrice: computeVariantPricing(c.product, c.finish).effectivePrice,
    quantity: c.quantity,
  }));
  const discountAmt = state.appliedVoucher ? state.appliedVoucher.discountAmount : 0;
  const totals = calculateOrderPricing(linePrices, discountAmt);

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
  if (!activeUser && (urlRole === 'admin' || urlRole === 'client')) {
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

  // If still not logged in, redirect to src/index.php (on PHP) or login.html
  if (!activeUser) {
    window.location.href = window.location.pathname.endsWith('.php')
      ? new URL('index.php', window.location.href).href
      : 'login.html';
    return;
  }

  const isAdmin = activeUser.role === 'admin';
  const clientView = document.getElementById('client-portal-view');
  const adminView = document.getElementById('admin-portal-view');
  const headerSubtitle = document.getElementById('portal-header-subtitle');
  const userBadge = document.getElementById('portal-user-badge');
  const welcomeName = document.getElementById('client-welcome-name');
  const welcomeEmail = document.getElementById('client-welcome-email');
  const sidebarName = document.getElementById('client-sidebar-name');
  const sidebarEmail = document.getElementById('client-sidebar-email');
  const sidebarInitials = document.getElementById('client-sidebar-initials');
  const logoutBtn = document.getElementById('portal-logout-btn');

  loadCustomerProfileFromStorage();
  if (activeUser.name) state.customerProfile.name = activeUser.name;
  if (activeUser.email) state.customerProfile.email = activeUser.email;

  // Show ONLY the dashboard matching the logged-in user's role
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
  if (sidebarInitials) {
    const initials = state.customerProfile.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
    sidebarInitials.textContent = initials || 'LR';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('lr_session_user');
      localStorage.removeItem('lr_cart_items');
      window.location.href = window.location.pathname.endsWith('.php')
        ? new URL('logout.php', window.location.href).href
        : 'login.html';
    });
  }

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

  // Customer Cart Quick Add Button
  const cartAddBtn = document.getElementById('client-cart-add-btn');
  if (cartAddBtn) {
    cartAddBtn.addEventListener('click', () => {
      const sel = document.getElementById('client-cart-add-select');
      const pid = sel ? sel.value : '';
      const prod = state.catalog.find((p) => p.id === pid);
      if (!prod) return;
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
        state.cartItems.map((c) => c.product.id)
      );
      if (clientVoucherFeedback) {
        clientVoucherFeedback.classList.remove('hidden');
        if (result.valid) {
          state.appliedVoucher = result.voucher;
          clientVoucherFeedback.textContent = `✓ Voucher ${result.voucher.code} applied (-${usd(result.discountAmount)})!`;
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

  // Customer Cart Place Order Button
  const clientCheckoutBtn = document.getElementById('client-cart-checkout-btn');
  if (clientCheckoutBtn) {
    clientCheckoutBtn.addEventListener('click', () => {
      if (state.cartItems.length === 0) return;
      const linePrices = state.cartItems.map((c) => ({
        unitPrice: computeVariantPricing(c.product, c.finish).effectivePrice,
        quantity: c.quantity,
      }));
      const discountAmt = state.appliedVoucher ? state.appliedVoucher.discountAmount : 0;
      const totals = calculateOrderPricing(linePrices, discountAmt);
      const firstItem = state.cartItems[0];
      const totalQty = state.cartItems.reduce((sum, c) => sum + c.quantity, 0);
      const itemLabel =
        state.cartItems.length === 1 && totalQty === 1
          ? firstItem.product.name
          : `${firstItem.product.name} (+${totalQty - 1} more)`;

      const newOrder = {
        id: `ord-${Date.now()}`,
        orderNumber: `LR-${Math.floor(10000 + Math.random() * 89999)}`,
        clientName: state.customerProfile.name,
        clientEmail: state.customerProfile.email,
        furnitureId: firstItem.product.id,
        furnitureName: itemLabel,
        selectedFinish: firstItem.finish,
        customDimensions: firstItem.product.dimensions || 'Standard Showroom Dimensions',
        status: 'Order Confirmed · In Production Queue',
        estimatedDelivery: '4–6 Weeks',
        totalAmount: totals.totalAmount,
      };

      state.orders.unshift(newOrder);
      try {
        const existingOrders = JSON.parse(localStorage.getItem('lr_customer_orders') || '[]');
        localStorage.setItem('lr_customer_orders', JSON.stringify([newOrder, ...existingOrders]));
      } catch (_e) {
        // Ignore storage error
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

  // Admin Left-Sidebar Tabs
  const adminTabBtns = document.querySelectorAll('[data-admin-tab]');
  adminTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-admin-tab');
      adminTabBtns.forEach((b) => {
        const isSel = b.getAttribute('data-admin-tab') === target;
        b.className = isSel
          ? 'admin-tab-btn w-full text-left p-4 rounded-2xl transition-all border cursor-pointer bg-[#0095FF] text-white border-[#0095FF] shadow-sm'
          : 'admin-tab-btn w-full text-left p-4 rounded-2xl transition-all border cursor-pointer bg-[#F8FBFF] text-[#0D1015] border-[#E2E8F0] hover:border-[#0095FF]';
      });
      document.querySelectorAll('.admin-tab-panel').forEach((panel) => {
        panel.classList.toggle('hidden', panel.id !== `admin-tab-${target}`);
      });
    });
  });

  // Admin Add Product Form Toggle & Submit
  const prodForm = document.getElementById('admin-product-form');
  const openAddProdBtn = document.getElementById('admin-open-add-product-btn');
  const closeAddProdBtn = document.getElementById('admin-close-product-form');
  if (openAddProdBtn && prodForm) {
    openAddProdBtn.addEventListener('click', () => prodForm.classList.remove('hidden'));
  }
  if (closeAddProdBtn && prodForm) {
    closeAddProdBtn.addEventListener('click', () => prodForm.classList.add('hidden'));
  }

  if (prodForm) {
    prodForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('prod-name').value.trim();
      const sku = document.getElementById('prod-sku').value.trim().toUpperCase();
      const categoryId = document.getElementById('prod-category').value;
      const price = Number(document.getElementById('prod-price').value) || 1800;
      const discountPercent = Number(document.getElementById('prod-discount').value) || 0;
      const dimensions = document.getElementById('prod-dimensions').value.trim();
      const colorsRaw = document.getElementById('prod-colors').value;

      const colorVariants = colorsRaw
        .split(',')
        .map((part) => {
          const [cName, hex, delta] = part.split('|').map((s) => (s || '').trim());
          return { name: cName || 'Natural Walnut', hex: hex || '#5C3A21', priceDelta: Number(delta || 0) };
        })
        .filter((v) => v.name);

      const newProduct = {
        id: `furn-cust-${Date.now()}`,
        sku,
        name,
        categoryId,
        categoryName:
          categoryId === 'living'
            ? 'Living Room'
            : categoryId === 'dining'
            ? 'Dining Room'
            : categoryId === 'bedroom'
            ? 'Bedroom'
            : categoryId === 'kitchen'
            ? 'Kitchen'
            : 'Study/Work Desks',
        price,
        discountPercent,
        effectivePrice: Math.round(price * (1 - discountPercent / 100)),
        dimensions,
        leadTimeWeeks: 4,
        inStockCount: 3,
        defaultFinish: colorVariants[0]?.name || 'Natural Walnut',
        finishes: colorVariants.map((c) => c.name),
        colorVariants,
        description: 'Custom furniture design requested via Messenger and added to the catalog by Admin.',
        image: 'assets/images/category_dining_tables.jpg',
        isCustomClientDesign: true,
      };

      state.catalog.unshift(newProduct);
      try {
        const existing = JSON.parse(localStorage.getItem('lr_custom_products') || '[]');
        localStorage.setItem('lr_custom_products', JSON.stringify([newProduct, ...existing]));
      } catch (_err) {
        // Ignore storage error
      }
      prodForm.classList.add('hidden');
      showAdminBanner(`Added "${newProduct.name}" (${newProduct.sku}) to catalog.`);
      renderDashboardContent();
    });
  }

  // Admin Issue Single-Product Voucher Form
  const vchForm = document.getElementById('admin-voucher-form');
  if (vchForm) {
    vchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const customerEmail = document.getElementById('vch-email').value.trim();
      const furnitureId = document.getElementById('vch-product').value;
      const code = document.getElementById('vch-code').value.trim().toUpperCase();
      const discountAmount = Number(document.getElementById('vch-discount').value) || 250;
      const prod = state.catalog.find((p) => p.id === furnitureId) || state.catalog[0];

      const newVoucher = {
        id: `vch-${Date.now()}`,
        code,
        customerEmail,
        customerName: customerEmail.split('@')[0],
        furnitureId: prod.id,
        furnitureSku: prod.sku,
        furnitureName: prod.name,
        discountAmount,
        status: 'Active',
        issuedByAdmin: 'Lillia Mercier (Owner)',
        createdAt: new Date().toISOString().slice(0, 10),
        expiryDate: '2026-12-31',
        messengerPlaceholderLink: `${ADMIN_MESSENGER_PLACEHOLDER_URL}?voucher=${encodeURIComponent(code)}&client=${encodeURIComponent(customerEmail)}&sku=${encodeURIComponent(prod.sku)}`,
      };

      state.vouchers.unshift(newVoucher);
      try {
        const existing = JSON.parse(localStorage.getItem('lr_custom_vouchers') || '[]');
        localStorage.setItem('lr_custom_vouchers', JSON.stringify([newVoucher, ...existing]));
      } catch (_err) {
        // Ignore storage error
      }
      showAdminBanner(`Issued single-product voucher ${code} (-${usd(discountAmount)}) for ${customerEmail} on ${prod.name}.`);
      renderDashboardContent();
    });
  }

  renderDashboardContent();
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
  banner.textContent = `✓ ${msg}`;
  banner.classList.remove('hidden');
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
          state.cartItems.map((c) => c.product.id)
        );
        if (!recheck.valid) state.appliedVoucher = null;
      }

      cartItemsListEl.innerHTML = state.cartItems
        .map((entry, idx) => {
          const item = entry.product;
          const imgUrl = (item.image || 'assets/images/category_living_lounge.jpg').replace(/^\//, '');
          const pricing = computeVariantPricing(item, entry.finish);
          const lineTotal = pricing.effectivePrice * entry.quantity;
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
                    <span class="font-mono-tech font-bold text-[#0095FF]">${esc(item.sku)}</span>
                    <span>· ${esc(item.categoryName)}</span>
                  </div>
                  <h3 class="font-serif-display text-lg font-bold text-[#0D1015] truncate">${esc(item.name)}</h3>
                  <p class="text-xs text-[#475569]">Finish: <span class="font-semibold text-[#0D1015]">${esc(entry.finish)}</span> · ${usd(pricing.effectivePrice)} each</p>
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
                <p class="font-mono-tech text-lg font-bold text-[#0D1015]">${usd(lineTotal)}</p>
                <a
                  href="${ADMIN_MESSENGER_PLACEHOLDER_URL}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs font-semibold text-[#0095FF] hover:underline"
                >
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

      const linePrices = state.cartItems.map((c) => ({
        unitPrice: computeVariantPricing(c.product, c.finish).effectivePrice,
        quantity: c.quantity,
      }));
      const discountAmt = state.appliedVoucher ? state.appliedVoucher.discountAmount : 0;
      const totals = calculateOrderPricing(linePrices, discountAmt);

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
                  SAVE ${usd(v.discountAmount)} OFF SINGLE ITEM
                </p>
                <p class="font-serif-display text-base font-bold text-[#0D1015] mt-1">
                  ${esc(v.furnitureName)}
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
                data-use-voucher-product="${esc(v.furnitureId)}"
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

  // 5. Admin Catalog List
  const adminCatalogEl = document.getElementById('admin-catalog-list');
  if (adminCatalogEl) {
    adminCatalogEl.innerHTML = state.catalog
      .map(
        (p) => `
          <div class="bg-white rounded-3xl border border-[#BCE3FF] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-mono-tech text-xs font-bold text-[#0095FF]">${esc(p.sku)}</span>
                <span class="text-xs text-[#64748B]">· ${esc(p.categoryName)}</span>
                ${p.isCustomClientDesign ? `<span class="text-xs font-semibold text-[#0077CC]">· Client Messenger Design</span>` : ''}
              </div>
              <h4 class="font-serif-display text-lg font-bold text-[#0D1015]">${esc(p.name)}</h4>
              <p class="text-xs text-[#475569]">Colors: ${(p.colorVariants || []).map((c) => `${esc(c.name)} (${c.priceDelta >= 0 ? '+' : ''}$${c.priceDelta})`).join(' · ')}</p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <div class="text-right">
                <p class="font-mono-tech text-lg font-bold text-[#0D1015]">${usd(p.effectivePrice)}</p>
                <p class="font-mono-tech text-[11px] text-emerald-700">${p.discountPercent}% Discount</p>
              </div>
              <button
                type="button"
                data-bump-discount="${esc(p.id)}"
                class="px-3.5 py-2 rounded-xl bg-[#F0F8FF] hover:bg-[#D8EEFF] border border-[#BCE3FF] text-[#0D1015] text-xs font-semibold cursor-pointer"
              >
                Toggle 15% Discount
              </button>
            </div>
          </div>
        `
      )
      .join('');

    adminCatalogEl.querySelectorAll('[data-bump-discount]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-bump-discount');
        const prod = state.catalog.find((item) => item.id === pid);
        if (!prod) return;
        prod.discountPercent = prod.discountPercent === 15 ? 0 : 15;
        prod.effectivePrice = Math.round(prod.price * (1 - prod.discountPercent / 100));
        try {
          const discountMap = JSON.parse(localStorage.getItem('lr_product_discounts') || '{}');
          discountMap[prod.id] = prod.discountPercent;
          localStorage.setItem('lr_product_discounts', JSON.stringify(discountMap));
        } catch (_err) {
          // Ignore storage error
        }
        showAdminBanner(`Updated storewide discount on "${prod.name}" to ${prod.discountPercent}%.`);
        renderDashboardContent();
      });
    });
  }

  // 6. Populate Voucher Product Dropdown & Vouchers List
  const vchSelect = document.getElementById('vch-product');
  if (vchSelect) {
    vchSelect.innerHTML = state.catalog
      .map((p) => `<option value="${esc(p.id)}">${esc(p.sku)} — ${esc(p.name)} (${usd(p.effectivePrice)})</option>`)
      .join('');
  }

  const adminVouchersEl = document.getElementById('admin-vouchers-list');
  if (adminVouchersEl) {
    adminVouchersEl.innerHTML = state.vouchers
      .map(
        (v) => `
          <div class="bg-white rounded-3xl border border-[#BCE3FF] p-6 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
            <div>
              <p class="font-mono-tech text-sm font-bold text-[#0D1015]">${esc(v.code)} · -${usd(v.discountAmount)}</p>
              <p class="text-xs text-[#475569] mt-0.5">Customer: <span class="font-mono-tech">${esc(v.customerEmail)}</span> · Product: <span class="font-semibold">${esc(v.furnitureName)}</span></p>
            </div>
            <a href="${ADMIN_MESSENGER_PLACEHOLDER_URL}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2 rounded-xl bg-[#EBF6FF] text-[#0077CC] text-xs font-semibold">
              Send via Messenger ↗
            </a>
          </div>
        `
      )
      .join('');
  }

  // 7. Admin Orders List
  const adminOrdersEl = document.getElementById('admin-tab-orders');
  if (adminOrdersEl) {
    adminOrdersEl.innerHTML = state.orders
      .map(
        (o) => `
          <div class="bg-white rounded-3xl border border-[#BCE3FF] p-6 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
            <div>
              <p class="font-mono-tech text-xs font-bold text-[#0095FF]">${esc(o.orderNumber)} · ${esc(o.clientName)} (${esc(o.clientEmail)})</p>
              <h4 class="font-serif-display text-lg font-bold text-[#0D1015] mt-0.5">${esc(o.furnitureName)}</h4>
              <p class="text-xs text-[#475569] mt-0.5">Finish: ${esc(o.selectedFinish)} · Status: <span class="font-semibold">${esc(o.status)}</span></p>
            </div>
            <p class="font-mono-tech text-lg font-bold text-[#0D1015]">${usd(o.totalAmount)}</p>
          </div>
        `
      )
      .join('');
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

  // If a specific product was clicked on the homepage and no explicit category was passed, default to All or its category
  if (paramProduct && !params.has('category')) {
    const matchedProd = state.catalog.find((p) => p.id === paramProduct);
    if (matchedProd) {
      state.catalogPageCategory = matchedProd.categoryId || 'all';
    }
  }

  // Update Top Nav Auth Button & Cart User Email
  const navAuthActions = document.getElementById('nav-auth-actions');
  const cartUserEmailEl = document.getElementById('cart-user-email');
  const cartCheckoutLink = document.getElementById('cart-checkout-link');

  if (state.sessionUser) {
    const isAdmin = state.sessionUser.role === 'admin';
    const dashUrl = `dashboard.html?role=${isAdmin ? 'admin' : 'client'}`;
    const dashLabel = isAdmin ? 'Admin Dashboard' : 'My Dashboard';

    if (navAuthActions) {
      navAuthActions.innerHTML = `
        <a
          href="${dashUrl}"
          data-testid="nav-dashboard-button"
          class="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 bg-[#0095FF] text-white hover:bg-[#0077CC] shadow-xs"
        >
          <span>${esc(dashLabel)}</span>
        </a>
        <button
          type="button"
          id="nav-logout-btn"
          class="px-3 py-2.5 rounded-xl text-xs font-semibold bg-[#F0F8FF] hover:bg-[#D8EEFF] text-[#0D1015] border border-[#BCE3FF] cursor-pointer"
        >
          Log Out
        </button>
      `;
      const logoutBtn = document.getElementById('nav-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('lr_session_user');
          localStorage.removeItem('lr_cart_items');
          window.location.href = 'index.html';
        });
      }
    }
    if (cartUserEmailEl) cartUserEmailEl.textContent = state.sessionUser.email;
    if (cartCheckoutLink) {
      cartCheckoutLink.href = dashUrl;
      cartCheckoutLink.textContent = isAdmin ? 'Open Admin Dashboard →' : 'Go to My Dashboard →';
    }
  } else {
    if (cartUserEmailEl) cartUserEmailEl.textContent = 'Sign in to verify your email';
    if (cartCheckoutLink) {
      cartCheckoutLink.href = 'login.html';
      cartCheckoutLink.textContent = 'Sign In to Checkout →';
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

  // Cart Drawer Toggle & Voucher Apply
  const cartDrawer = document.getElementById('cart-drawer');
  const openCartBtn = document.getElementById('open-cart-btn');
  const closeCartBtn = document.getElementById('close-cart-btn');
  const closeDrawer = () => {
    if (!cartDrawer) return;
    cartDrawer.classList.add('hidden');
    cartDrawer.classList.remove('flex');
  };
  if (openCartBtn && cartDrawer) {
    openCartBtn.addEventListener('click', () => {
      cartDrawer.classList.remove('hidden');
      cartDrawer.classList.add('flex');
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
  }
  const applyVoucherBtn = document.getElementById('apply-voucher-btn');
  if (applyVoucherBtn) {
    applyVoucherBtn.addEventListener('click', () => {
      const codeInput = document.getElementById('voucher-code-input');
      const feedback = document.getElementById('voucher-feedback');
      const code = codeInput ? codeInput.value : '';
      const activeEmail = state.sessionUser ? state.sessionUser.email : 'rowena.vance@vancearchitects.com';
      const productIds = state.cartItems.map((c) => c.product.id);
      const check = validateVoucherForOrder(state.vouchers, code, activeEmail, productIds);

      if (feedback) {
        feedback.classList.remove('hidden', 'text-emerald-700', 'text-rose-600');
        if (check.valid) {
          state.appliedVoucher = check.voucher;
          feedback.textContent = `✓ Voucher ${check.voucher.code} applied (-${usd(check.discountAmount)})!`;
          feedback.classList.add('text-emerald-700');
        } else {
          state.appliedVoucher = null;
          feedback.textContent = check.errorMessage;
          feedback.classList.add('text-rose-600');
        }
      }
      renderCartDrawer();
    });
  }

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

  // 1. Update Top Horizontal Category Bar active state (matching reference screenshot orange/blue top bar)
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

  const hasAnyFilter = activeCatId !== 'all' || activeColorKey !== 'all' || maxPrice < 5500 || Boolean(searchQuery.trim());
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

  // 3. Render Left Sidebar: Filter by Color (bordered chips with swatch + color label + count, matching reference image)
  const colorContainer = document.getElementById('catalog-sidebar-colors');
  if (colorContainer) {
    const colorCounts = getColorFilterCounts(state.catalog, activeCatId, maxPrice);
    colorContainer.innerHTML = colorCounts
      .map((c) => {
        const isSelected = c.key === activeColorKey;
        return `
          <button
            type="button"
            data-sidebar-color-key="${esc(c.key)}"
            data-testid="sidebar-color-chip-${esc(c.key)}"
            aria-pressed="${isSelected ? 'true' : 'false'}"
            class="px-2.5 py-1.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-all ${
              isSelected
                ? 'bg-[#0D1015] text-white border-[#0D1015] shadow-xs'
                : 'bg-white text-[#334155] border-[#94A3B8] hover:border-[#0095FF] hover:text-[#0095FF]'
            }"
          >
            <span class="w-3 h-3 rounded-full border border-black/20 shrink-0" style="background-color: ${esc(c.hex)}"></span>
            <span>${esc(c.label)} (${c.count})</span>
          </button>
        `;
      })
      .join('');

    colorContainer.querySelectorAll('[data-sidebar-color-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const clickedKey = btn.getAttribute('data-sidebar-color-key') || 'all';
        // Toggle off if clicking the already-active color, or select the clicked color
        state.catalogPageColorKey = state.catalogPageColorKey === clickedKey ? 'all' : clickedKey;

        // Automatically switch every matching product's selected color variant to the chosen color!
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
          <button
            type="button"
            data-sidebar-room-id="${esc(r.id)}"
            data-testid="sidebar-room-chip-${esc(r.id)}"
            class="px-2.5 py-1.5 rounded-md border text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-all ${
              isSel
                ? 'bg-[#0095FF] text-white border-[#0095FF]'
                : 'bg-white text-[#334155] border-[#94A3B8] hover:border-[#0095FF] hover:text-[#0095FF]'
            }"
          >
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
      // If a color filter is active and spotlightItem has that color, make sure it's selected
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
            <button
              type="button"
              id="catalog-close-spotlight-btn"
              class="text-xs font-semibold text-[#475569] hover:text-[#0D1015] cursor-pointer"
            >
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
                        <button
                          type="button"
                          data-spotlight-color-product="${esc(spotlightItem.id)}"
                          data-spotlight-color-name="${esc(v.name)}"
                          class="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-all ${
                            isSel
                              ? 'bg-[#0D1015] text-white border-[#0D1015]'
                              : 'bg-[#F8FBFF] text-[#0D1015] border-[#BCE3FF] hover:border-[#0095FF]'
                          }"
                        >
                          <span class="w-3 h-3 rounded-full border border-black/20 shrink-0" style="background-color: ${esc(v.hex)}"></span>
                          <span>${esc(v.name)}</span>
                        </button>
                      `;
                    })
                    .join('')}
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-add-cart="${esc(spotlightItem.id)}"
                  class="px-5 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  Add to Cart (${usd(pricing.effectivePrice)})
                </button>
                <a
                  href="${ADMIN_MESSENGER_PLACEHOLDER_URL}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-4 py-2.5 rounded-xl bg-[#D8EEFF] hover:bg-[#BCE3FF] text-[#0D1015] text-xs font-semibold transition-colors"
                >
                  Make Offer on Messenger ↗
                </a>
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
          <button
            type="button"
            id="catalog-empty-reset-btn"
            class="px-5 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold cursor-pointer transition-colors"
          >
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
      // If a color filter is active on the sidebar, ensure the matching variant is selected on the card
      if (activeColorKey !== 'all') {
        const matchedVariant = findMatchingColorVariant(item, activeColorKey);
        if (matchedVariant) {
          state.selectedColorByProduct[item.id] = matchedVariant.name;
        }
      }
      const selectedFinish =
        state.selectedColorByProduct[item.id] || item.colorVariants?.[0]?.name || item.defaultFinish;
      const pricing = computeVariantPricing(item, selectedFinish);
      const variants = item.colorVariants || [];
      const isSpotlighted = state.catalogPageSpotlightProductId === item.id;

      return `
        <article
          data-testid="catalog-product-card-${esc(item.id)}"
          class="group rounded-2xl bg-white border ${
            isSpotlighted ? 'border-[#0095FF] ring-2' : 'border-[#E2E8F0] hover:border-[#0095FF]'
          } overflow-hidden shadow-2xs hover:shadow-xl transition-all flex flex-col justify-between"
        >
          <div>
            <!-- Product Visual Header styled cleanly like the reference showcase + live finish badge -->
            <div class="aspect-[4/3] relative overflow-hidden bg-slate-100">
              <img src="${esc(item.image)}" alt="${esc(item.name)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div class="absolute top-3 left-3 flex flex-wrap gap-1.5">
                <span class="px-2.5 py-1 rounded-md bg-white/95 text-[#0D1015] font-mono-tech text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                  ${esc(item.categoryName)}
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
                  ${usd(pricing.effectivePrice)}
                </span>
              </div>
            </div>

            <div class="p-5 space-y-3">
              <div class="text-center border-b border-[#E2E8F0] pb-3">
                <h3 class="font-serif-display text-base sm:text-lg font-bold text-[#0D1015] uppercase tracking-wide leading-snug">
                  ${esc(item.name)}
                </h3>
                <p class="font-mono-tech text-[11px] text-[#64748B] uppercase tracking-widest mt-0.5">
                  ${variants.length} COLOR FINISHES · ${esc(pricing.colorName)}
                </p>
              </div>

              <!-- Interactive Color Swatches on each card -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="font-semibold text-[#0D1015] truncate">Finish: <span class="text-[#0077CC]">${esc(pricing.colorName)}</span></span>
                  <span class="font-mono-tech font-bold text-[#0095FF] shrink-0">${usd(pricing.effectivePrice)}</span>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                  ${variants
                    .map((v) => {
                      const isSel = v.name === pricing.colorName;
                      return `
                        <button
                          type="button"
                          data-catalog-card-color-product="${esc(item.id)}"
                          data-catalog-card-color-name="${esc(v.name)}"
                          class="px-2 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1.5 cursor-pointer transition-all ${
                            isSel
                              ? 'bg-[#0D1015] text-white border-[#0D1015]'
                              : 'bg-[#F8FBFF] text-[#0D1015] border-[#BCE3FF] hover:border-[#0095FF]'
                          }"
                        >
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
            <button
              type="button"
              data-add-cart="${esc(item.id)}"
              class="py-2.5 px-3 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Add to Cart
            </button>
            <a
              href="${ADMIN_MESSENGER_PLACEHOLDER_URL}"
              target="_blank"
              rel="noopener noreferrer"
              class="py-2.5 px-3 rounded-xl bg-[#F0F8FF] hover:bg-[#D8EEFF] text-[#0D1015] border border-[#BCE3FF] text-xs font-semibold transition-colors text-center"
            >
              Make Offer ↗
            </a>
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

  // Bind Add to Cart buttons inside catalog page (both spotlight and grid)
  document.querySelectorAll('[data-add-cart]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-add-cart');
      const product = state.catalog.find((p) => p.id === pid);
      if (!product) return;
      const finish =
        state.selectedColorByProduct[product.id] || product.colorVariants?.[0]?.name || product.defaultFinish;
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
      }
    });
  });
}

/* ==========================================================================
   BOOTSTRAP
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  state.sessionUser = loadSessionUser();

  const data = await loadData();
  state.categories = Array.isArray(data.categories) ? data.categories : [];
  state.catalog = Array.isArray(data.products) ? data.products : [];
  state.vouchers = Array.isArray(data.vouchers) ? data.vouchers : [];
  state.orders = Array.isArray(data.orders) ? data.orders : [];

  state.catalog.forEach((p) => {
    state.selectedColorByProduct[p.id] = p.colorVariants?.[0]?.name || p.defaultFinish;
  });

  // Cart starts empty by default unless the user explicitly added items!
  state.cartItems = loadCartFromStorage();

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
