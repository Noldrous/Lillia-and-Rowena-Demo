/**
 * Lillia and Rowena Furniture — Pure Vanilla JavaScript Application
 * Preserves the exact original Architectural Showroom design (Dark Obsidian Hero,
 * Sky-Blue Value Strip, Editorial Serif Typography, SVG Icons, Left-Sidebar Consoles)
 * using only HTML, CSS, Vanilla JavaScript, and JSON.
 */

import {
  ADMIN_MESSENGER_PLACEHOLDER_URL,
  ORDER_STATUS_STEPS,
  buildAdminMessengerUrl,
  calculateOrderPricing,
  computeVariantPricing,
  filterFurnitureItems,
  validateLoginCredentials,
  validateNewFurnitureInput,
  validateVoucherForOrder,
} from './store.js';

// Crisp Lucide-identical SVG Icons
const ICONS = {
  search: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  shoppingBag: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  user: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  x: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  sparkles: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`,
  arrowUpRight: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>`,
  messageSquare: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  tag: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>`,
  palette: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  truck: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`,
  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  sliders: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>`,
  externalLink: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="#0095FF" stroke="#0095FF" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  eye: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
  box: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
  clipboard: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>`,
  layers: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>`,
  copy: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  key: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
};

const state = {
  activeView: 'home', // 'home' | 'user-dashboard' | 'admin-dashboard' | 'login'
  promoBannerVisible: true,
  categories: [],
  catalog: [],
  vouchers: [],
  orders: [],
  workshopLogs: [],

  // Storefront filters & card color selections
  searchQuery: '',
  selectedCategoryFilter: 'all',
  sortBy: 'featured',
  selectedColorByProduct: {},

  // Authenticated user session
  currentRole: 'client',
  currentUserName: 'Rowena Vance',
  currentUserEmail: 'rowena.vance@vancearchitects.com',

  // Category / Product Detail Modal
  isDetailModalOpen: false,
  modalCategory: null,
  modalSelectedItem: null,
  modalSelectedColor: '',
  modalQuantity: 1,

  // Order Cart Drawer
  isOrderDrawerOpen: false,
  cartItems: [],
  voucherInput: '',
  appliedVoucher: null,
  voucherError: null,
  checkoutMessage: null,

  // External Admin Messenger Redirect & Voucher Handoff Modal
  isMessengerModalOpen: false,
  messengerMode: 'make-offer', // 'make-offer' | 'custom-design'
  messengerProductId: 'furn-lv-01',
  messengerSelectedColor: '',
  messengerProposedPrice: '4236',
  messengerCustomTitle: 'Bespoke Live-Edge Black Walnut & Travertine Dining Table',
  messengerCustomDimensions: '280cm L × 115cm W × 75cm H',
  messengerCustomMaterials: 'FAS American Black Walnut top, honed Roman travertine cylinder plinths',
  messengerCopiedBanner: false,

  // Client Dashboard
  clientActiveTab: 'orders', // 'orders' | 'vouchers'
  clientSelectedOrderId: 'ord-101',

  // Admin Dashboard
  adminActiveModule: 'catalog', // 'catalog' | 'vouchers' | 'orders' | 'materials'
  adminCatalogSearch: '',
  adminBannerMessage: null,

  // Admin Add / Edit Product & Custom Messenger Design Modal
  isProductModalOpen: false,
  editingProductId: null,
  productForm: {
    isCustomClientDesign: false,
    customClientEmail: 'rowena.vance@vancearchitects.com',
    name: '',
    sku: '',
    categoryId: 'dining',
    price: '3950',
    discountPercent: '0',
    dimensions: '260cm L × 110cm W × 75cm H',
    leadTimeWeeks: '5',
    inStockCount: '2',
    description: '',
    colorVariants: [
      { name: 'Hand-Rubbed Natural Walnut (Base)', hex: '#5C3A21', priceDelta: 0 },
      { name: 'Smoked European White Oak', hex: '#9C8265', priceDelta: 180 },
      { name: 'Book-Matched Walnut + Travertine Plinth', hex: '#D8CABB', priceDelta: 420 },
    ],
  },
  productFormError: null,

  // Login Form
  loginRole: 'client',
  loginEmail: 'rowena.vance@vancearchitects.com',
  loginAccessCode: 'LR-8841',
  loginError: null,
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatUsd(amount) {
  return '$' + Math.round(Number(amount || 0)).toLocaleString('en-US');
}

async function loadInitialState() {
  try {
    const res = await fetch('/api/catalog');
    if (!res.ok) throw new Error('API fallback');
    const data = await res.json();
    hydrateStoreData(data);
  } catch (_err) {
    const fallbackRes = await fetch('/data/atelier_store.json');
    const data = await fallbackRes.json();
    hydrateStoreData(data);
  }
  renderApp();
}

function hydrateStoreData(data) {
  state.categories = Array.isArray(data.categories) ? data.categories : [];
  state.catalog = Array.isArray(data.products) ? data.products : [];
  state.vouchers = Array.isArray(data.vouchers) ? data.vouchers : [];
  state.orders = Array.isArray(data.orders) ? data.orders : [];
  state.workshopLogs = Array.isArray(data.workshopLogs) ? data.workshopLogs : [];

  state.catalog.forEach((item) => {
    if (!state.selectedColorByProduct[item.id]) {
      state.selectedColorByProduct[item.id] =
        item.colorVariants?.[0]?.name || item.defaultFinish;
    }
  });

  if (state.cartItems.length === 0 && state.catalog.length > 0) {
    const first = state.catalog[0];
    state.cartItems = [
      {
        furniture: first,
        finish: first.colorVariants?.[0]?.name || first.defaultFinish,
        quantity: 1,
      },
    ];
  }
}

function getSelectedColorForProduct(item) {
  return (
    state.selectedColorByProduct[item.id] ||
    item.colorVariants?.[0]?.name ||
    item.defaultFinish
  );
}

function renderTopHeader() {
  const totalCartItems = state.cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return `
    ${
      state.promoBannerVisible
        ? `
      <div class="bg-[#0D1015] text-white border-b border-slate-800">
        <div class="max-w-[1440px] mx-auto px-4 sm:px-8 py-2 flex items-center justify-between gap-4 text-xs">
          <div class="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <span class="text-[#0095FF] font-semibold">Make Offer &amp; Custom Designs</span>
            <span class="text-slate-600" aria-hidden="true">·</span>
            <span class="text-slate-300">
              Redirect to Admin Messenger (${escapeHtml(ADMIN_MESSENGER_PLACEHOLDER_URL)}) for single-product Vouchers &amp; custom designs
            </span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <button
              type="button"
              data-action="switch-view"
              data-view="user-dashboard"
              data-testid="nav-user-dashboard"
              class="text-slate-300 hover:text-[#0095FF] transition-colors cursor-pointer whitespace-nowrap hidden sm:inline"
            >
              Client Portal
            </button>
            <span class="text-slate-700 hidden sm:inline" aria-hidden="true">·</span>
            <button
              type="button"
              data-action="switch-view"
              data-view="admin-dashboard"
              data-testid="nav-admin-dashboard"
              class="text-slate-300 hover:text-[#0095FF] transition-colors cursor-pointer whitespace-nowrap hidden md:inline"
            >
              Admin Console
            </button>
            <button
              type="button"
              data-action="dismiss-promo"
              aria-label="Dismiss promotional financing banner"
              class="text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              ${ICONS.x}
            </button>
          </div>
        </div>
      </div>
    `
        : ''
    }

    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#BCE3FF] shadow-xs">
      <div class="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-4 sm:gap-8">
        <!-- Brand Logo Left -->
        <a
          href="#top"
          data-action="go-home"
          aria-label="Lillia and Rowena Furniture Homepage"
          class="flex items-center gap-3 group shrink-0 cursor-pointer"
        >
          <div class="w-9 h-9 rounded-lg bg-[#0D1015] text-white flex items-center justify-center font-serif-display text-sm font-bold tracking-wider group-hover:bg-[#0095FF] transition-colors shadow-xs">
            LR
          </div>
          <span class="font-serif-display text-lg sm:text-xl font-bold tracking-tight text-[#0D1015] leading-none">
            Lillia &amp; Rowena
          </span>
        </a>

        <!-- Search Bar in the Middle (No Categories in Top Nav) -->
        <div class="flex-1 max-w-xl mx-auto">
          <label for="top-nav-search" class="sr-only">Search furniture in top bar</label>
          <div class="relative flex items-center">
            <span class="absolute left-3.5 text-[#0095FF] pointer-events-none">
              ${ICONS.search}
            </span>
            <input
              id="top-nav-search"
              data-testid="top-nav-search"
              type="search"
              value="${escapeHtml(state.searchQuery)}"
              placeholder="Search sofas, walnut tables, travertine, SKU..."
              class="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-[#F4F9FF] border border-[#BCE3FF] rounded-full text-[#0D1015] placeholder:text-[#64748B] focus:outline-none focus:border-[#0095FF] focus:bg-white transition-all"
            />
          </div>
        </div>

        <!-- Cart Icon Button + Login Button in Top Right -->
        <div class="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            data-action="open-cart-drawer"
            data-testid="open-order-drawer"
            aria-label="Shopping Cart (${totalCartItems} items)"
            class="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#F0F8FF] hover:bg-[#E0F2FE] border border-[#BCE3FF] text-[#0D1015] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
          >
            ${ICONS.shoppingBag}
            <span class="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#0095FF] text-white font-mono-tech text-[11px] font-semibold flex items-center justify-center shadow-xs">
              ${totalCartItems}
            </span>
          </button>

          <button
            type="button"
            data-action="switch-view"
            data-view="login"
            data-testid="nav-login"
            class="px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              state.activeView === 'login'
                ? 'bg-[#0D1015] text-white shadow-sm'
                : 'bg-[#0095FF] hover:bg-[#0077CC] text-white shadow-xs'
            }"
          >
            ${ICONS.user}
            <span>Login</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

function renderHomepageView() {
  const filtered = filterFurnitureItems(
    state.catalog,
    state.searchQuery,
    state.selectedCategoryFilter
  );

  const sortedItems = [...filtered].sort((a, b) => {
    const priceA = computeVariantPricing(a, getSelectedColorForProduct(a)).effectivePrice;
    const priceB = computeVariantPricing(b, getSelectedColorForProduct(b)).effectivePrice;
    if (state.sortBy === 'price-asc') return priceA - priceB;
    if (state.sortBy === 'price-desc') return priceB - priceA;
    if (state.sortBy === 'lead-time') return a.leadTimeWeeks - b.leadTimeWeeks;
    return 0;
  });

  return `
    <div class="bg-white text-[#0D1015]">
      <!-- Dark Obsidian/Navy Hero Showcase (Exact Original Design) -->
      <section class="relative bg-[#0B0F17] text-white overflow-hidden border-b border-slate-800">
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,149,255,0.16),_transparent_65%)] pointer-events-none"></div>

        <div class="relative max-w-[1440px] mx-auto px-4 sm:px-8 pt-6 pb-12 lg:py-12">
          <!-- Sub-header Department Strip + Pass Design in Messenger CTA -->
          <div class="flex items-center justify-between gap-3 pb-6 mb-8 border-b border-white/10 overflow-x-auto">
            <div class="inline-flex items-center gap-1 p-1.5 rounded-xl bg-white/[0.04] border border-white/10">
              <button
                type="button"
                data-action="filter-category"
                data-category="all"
                class="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0095FF] text-white shadow-xs cursor-pointer whitespace-nowrap"
              >
                Flagship Showroom
              </button>
              ${state.categories
                .map(
                  (cat) => `
                <button
                  type="button"
                  data-action="open-category-modal"
                  data-category-id="${escapeHtml(cat.id)}"
                  class="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  ${escapeHtml(cat.name)}
                </button>
              `
                )
                .join('')}
            </div>

            <button
              type="button"
              data-action="open-messenger"
              data-mode="custom-design"
              data-testid="hero-pass-design-top"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#BCE3FF] hover:bg-white text-[#0D1015] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span class="text-[#0077CC]">${ICONS.sparkles}</span>
              <span>Pass Design in Admin Messenger</span>
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <!-- Left Editorial Promo Column -->
            <div class="lg:col-span-5 flex flex-col justify-between space-y-6">
              <div class="space-y-4">
                <p class="text-xs font-semibold tracking-wide text-[#BCE3FF]">
                  01. Flagship Home &amp; Atelier Event · Direct Owner Offers &amp; Custom Millwork
                </p>

                <h1 class="font-serif-display text-4xl sm:text-5xl lg:text-[52px] font-bold text-white leading-[1.08] tracking-tight">
                  Sculptural Comfort Meets Heirloom Solid Timber.
                </h1>

                <p class="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Furnish every room with kiln-dried American black walnut, Belgian bouclé upholstery, and honed Roman travertine—negotiate directly with the owner via Messenger or pass your own custom furniture design.
                </p>
              </div>

              <!-- Dark Translucent Price Anchor Box -->
              <div class="space-y-4">
                <div class="p-5 rounded-2xl bg-[#111927]/90 border border-[#1E3A5F] flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p class="text-xs text-slate-400">Collection Starting At</p>
                    <p class="font-mono-tech text-3xl sm:text-4xl font-bold text-[#0095FF] mt-1">
                      $1,180
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="font-mono-tech text-xs font-bold text-white">
                      Or $49/mo for 24 mos*
                    </p>
                    <p class="text-xs text-slate-400 mt-1">
                      Make Offer for Exclusive Product Vouchers
                    </p>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    data-action="open-category-modal"
                    data-category-id="living"
                    class="px-5 py-3 bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <span>Explore Living &amp; Lounge</span>
                    ${ICONS.arrowUpRight}
                  </button>
                  <button
                    type="button"
                    data-action="open-messenger"
                    data-mode="custom-design"
                    data-testid="hero-pass-custom-design"
                    class="px-5 py-3 bg-[#BCE3FF] hover:bg-white text-[#0D1015] text-xs sm:text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    ${ICONS.messageSquare}
                    <span>Pass Custom Design</span>
                  </button>
                </div>

                <div>
                  <button
                    type="button"
                    data-action="switch-view"
                    data-view="user-dashboard"
                    class="px-4 py-2.5 bg-transparent hover:bg-white/5 text-slate-200 border border-slate-700 hover:border-slate-500 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Track My Order
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Showcase Room Image -->
            <div class="lg:col-span-7">
              <div class="relative rounded-2xl overflow-hidden border border-white/15 bg-[#0D1015] shadow-2xl group">
                <img
                  src="/assets/images/hero_living_room_atelier.jpg"
                  alt="Sculptural Comfort Meets Heirloom Solid Timber."
                  class="w-full h-[380px] sm:h-[480px] lg:h-[520px] object-cover group-hover:scale-[1.02] transition-transform duration-700"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-[#0B0F17]/90 via-[#0B0F17]/25 to-transparent pointer-events-none"></div>

                <div class="absolute bottom-5 left-5 right-5 sm:bottom-7 sm:left-7 sm:right-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div class="max-w-lg">
                    <p class="text-xs text-slate-200 font-medium">
                      Featured Room Package · Lillia Monolith Dining &amp; Rowena Bouclé Salon · 3–6 Weeks Lead Time
                    </p>
                    <p class="font-serif-display text-2xl sm:text-3xl font-bold text-white mt-1 leading-tight">
                      Living &amp; Lounge Showroom Collection
                    </p>
                  </div>

                  <button
                    type="button"
                    data-action="open-category-modal"
                    data-category-id="living"
                    class="px-5 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer self-start sm:self-end whitespace-nowrap"
                  >
                    Inspect Room Pieces
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 4-Pillar Sky-Blue Retail Value Strip -->
      <div class="bg-[#BCE3FF] border-b border-[#93C5FD]">
        <div class="max-w-[1440px] mx-auto px-4 sm:px-8 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="flex items-start gap-3">
            <div class="text-[#0077CC] shrink-0 mt-0.5">${ICONS.tag}</div>
            <div>
              <p class="text-xs sm:text-sm font-bold text-[#0D1015]">Make Offer in Admin Messenger</p>
              <p class="text-xs text-[#1E293B] mt-0.5">Redirect to owner’s Messenger for single-product voucher links</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="text-[#0077CC] shrink-0 mt-0.5">${ICONS.palette}</div>
            <div>
              <p class="text-xs sm:text-sm font-bold text-[#0D1015]">Colors with Tiered Pricing</p>
              <p class="text-xs text-[#1E293B] mt-0.5">Select timber, stone &amp; textile colors with transparent price tiers</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="text-[#0077CC] shrink-0 mt-0.5">${ICONS.sparkles}</div>
            <div>
              <p class="text-xs sm:text-sm font-bold text-[#0D1015]">Pass Your Own Furniture Design</p>
              <p class="text-xs text-[#1E293B] mt-0.5">Send custom specs in Messenger; Admin adds it to the catalog</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="text-[#0077CC] shrink-0 mt-0.5">${ICONS.clock}</div>
            <div>
              <p class="text-xs sm:text-sm font-bold text-[#0D1015]">Live 6-Stage Order Tracking</p>
              <p class="text-xs text-[#1E293B] mt-0.5">Follow every commission from millwork bench to room delivery</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 01. Curated Room Collections -->
      <section class="max-w-[1440px] mx-auto px-4 sm:px-8 py-14 sm:py-16 border-b border-[#E2E8F0]">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-[#E2E8F0]">
          <div>
            <p class="font-mono-tech text-xs uppercase tracking-[0.16em] text-[#0095FF] font-semibold">
              01. Curated Room Collections
            </p>
            <h2 class="font-serif-display text-2xl sm:text-4xl font-bold text-[#0D1015] mt-1">
              Shop by Room &amp; Department
            </h2>
          </div>
          <p class="text-xs sm:text-sm text-[#475569] max-w-md">
            Click any room collection or individual piece below to inspect timber joinery, upholstery color swatches, and architectural dimensions.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${state.categories
            .map((category) => {
              const catItems = state.catalog.filter((item) => item.categoryId === category.id);
              return `
                <div class="group rounded-2xl border border-[#BCE3FF] bg-white hover:border-[#0095FF] transition-all overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md">
                  <div>
                    <button
                      type="button"
                      data-action="open-category-modal"
                      data-category-id="${escapeHtml(category.id)}"
                      data-testid="category-card-${escapeHtml(category.id)}"
                      class="relative w-full h-52 overflow-hidden block text-left cursor-pointer"
                    >
                      <img
                        src="${escapeHtml(category.image)}"
                        alt="${escapeHtml(category.name)}"
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div class="absolute inset-0 bg-gradient-to-t from-[#0D1015]/80 via-[#0D1015]/15 to-transparent"></div>
                      <div class="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                        <span class="text-xs font-medium text-slate-200">
                          ${catItems.length} Pieces · ${escapeHtml(category.leadTimeRange)}
                        </span>
                        <span class="px-2.5 py-1 rounded-md bg-[#0095FF] text-white font-mono-tech text-xs font-semibold">
                          From ${formatUsd(category.startingPrice)}
                        </span>
                      </div>
                    </button>

                    <div class="p-5 space-y-4">
                      <div>
                        <h3 class="font-serif-display text-xl font-bold text-[#0D1015] group-hover:text-[#0095FF] transition-colors">
                          ${escapeHtml(category.name)}
                        </h3>
                        <p class="text-xs text-[#475569] line-clamp-2 mt-1.5 leading-relaxed">
                          ${escapeHtml(category.description)}
                        </p>
                      </div>

                      <div class="pt-3 border-t border-[#E2E8F0] space-y-1.5">
                        <p class="font-mono-tech text-[10px] uppercase tracking-wider text-[#0095FF] font-semibold">
                          Pieces in Collection
                        </p>
                        <div class="space-y-1">
                          ${catItems
                            .slice(0, 3)
                            .map(
                              (item) => `
                            <button
                              type="button"
                              data-action="open-item-modal"
                              data-item-id="${escapeHtml(item.id)}"
                              class="w-full flex items-center justify-between text-left py-1 px-1.5 rounded-lg hover:bg-[#F0F8FF] text-xs transition-colors cursor-pointer"
                            >
                              <span class="font-medium text-[#0D1015] truncate pr-2">${escapeHtml(item.name)}</span>
                              <span class="font-mono-tech text-[#0D1015] font-semibold shrink-0">${formatUsd(item.effectivePrice)}</span>
                            </button>
                          `
                            )
                            .join('')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="px-5 pb-5">
                    <button
                      type="button"
                      data-action="open-category-modal"
                      data-category-id="${escapeHtml(category.id)}"
                      class="w-full py-2.5 px-4 rounded-xl bg-[#D8EEFF]/80 group-hover:bg-[#0095FF] text-[#0D1015] group-hover:text-white text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>Explore Collection (${catItems.length})</span>
                      ${ICONS.arrowUpRight}
                    </button>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </section>

      <!-- 02. Search & Filter Furniture Collection with Selectable Colors & Varying Prices -->
      <section id="catalog-section" class="max-w-[1440px] mx-auto px-4 sm:px-8 py-14 sm:py-16">
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#E2E8F0]">
          <div>
            <p class="font-mono-tech text-xs uppercase tracking-[0.16em] text-[#0095FF] font-semibold">
              02. Color-Tiered Catalog, Direct Offers &amp; Custom Designs
            </p>
            <h2 class="font-serif-display text-2xl sm:text-4xl font-bold text-[#0D1015] mt-1">
              Search &amp; Filter Furniture Collection
            </h2>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <p class="font-mono-tech text-xs text-[#475569]">
              Showing <strong class="text-[#0D1015]">${sortedItems.length}</strong> of ${state.catalog.length} pieces
            </p>
            <div class="flex items-center gap-2">
              <label for="catalog-sort" class="text-xs text-[#475569] font-medium">Sort by:</label>
              <select
                id="catalog-sort"
                class="px-3 py-2 text-xs font-semibold bg-white border border-[#BCE3FF] rounded-lg text-[#0D1015] focus:outline-none focus:border-[#0095FF] cursor-pointer"
              >
                <option value="featured" ${state.sortBy === 'featured' ? 'selected' : ''}>Featured Bestsellers</option>
                <option value="price-asc" ${state.sortBy === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
                <option value="price-desc" ${state.sortBy === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
                <option value="lead-time" ${state.sortBy === 'lead-time' ? 'selected' : ''}>Fastest Delivery Window</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Search & Filter Bar -->
        <div class="my-8 p-5 rounded-2xl bg-white border border-[#BCE3FF] space-y-4 shadow-2xs">
          <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div class="relative flex-1 max-w-md">
              <label for="catalog-search-input" class="sr-only">Search furniture by name, timber, upholstery, or SKU</label>
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0095FF] pointer-events-none">
                ${ICONS.search}
              </span>
              <input
                id="catalog-search-input"
                data-testid="catalog-search-input"
                type="search"
                value="${escapeHtml(state.searchQuery)}"
                placeholder="Search sofas, dining tables, walnut, bouclé, SKU..."
                class="w-full pl-10 pr-4 py-2.5 bg-[#F4F9FF] border border-[#BCE3FF] rounded-xl text-xs sm:text-sm text-[#0D1015] placeholder:text-[#64748B] focus:outline-none focus:border-[#0095FF] transition-colors"
              />
            </div>

            <div class="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              <span class="text-[#0095FF] mr-1 shrink-0">${ICONS.sliders}</span>
              <button
                type="button"
                data-action="filter-category"
                data-category="all"
                data-testid="filter-all"
                class="px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  state.selectedCategoryFilter === 'all'
                    ? 'bg-[#0095FF] text-white shadow-xs'
                    : 'bg-white text-[#475569] border border-[#BCE3FF] hover:text-[#0D1015]'
                }"
              >
                All (${state.catalog.length})
              </button>
              ${state.categories
                .map(
                  (cat) => `
                <button
                  type="button"
                  data-action="filter-category"
                  data-category="${escapeHtml(cat.id)}"
                  data-testid="filter-${escapeHtml(cat.id)}"
                  class="px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    state.selectedCategoryFilter === cat.id
                      ? 'bg-[#0095FF] text-white shadow-xs'
                      : 'bg-white text-[#475569] border border-[#BCE3FF] hover:text-[#0D1015]'
                  }"
                >
                  ${escapeHtml(cat.name)}
                </button>
              `
                )
                .join('')}
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E2E8F0]">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs text-[#475569] mr-1">Popular Materials:</span>
              ${['Walnut', 'Bouclé', 'Travertine', 'White Oak', 'Linen']
                .map(
                  (chip) => `
                <button
                  type="button"
                  data-action="quick-search"
                  data-query="${escapeHtml(chip)}"
                  class="px-3 py-1 rounded-lg text-xs font-medium bg-[#F8FAFC] text-[#475569] border border-[#BCE3FF] hover:border-[#0095FF] cursor-pointer"
                >
                  ${escapeHtml(chip)}
                </button>
              `
                )
                .join('')}
            </div>

            <button
              type="button"
              data-action="open-messenger"
              data-mode="custom-design"
              class="text-xs font-semibold text-[#0095FF] hover:text-[#0077CC] inline-flex items-center gap-1.5 cursor-pointer"
            >
              ${ICONS.externalLink}
              <span>Have your own furniture sketch? Pass it in Admin Messenger →</span>
            </button>
          </div>
        </div>

        <!-- Product Catalog Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          ${sortedItems
            .map((item) => {
              const selectedColor = getSelectedColorForProduct(item);
              const variantPricing = computeVariantPricing(item, selectedColor);
              const monthlyEstimate = Math.round(variantPricing.effectivePrice / 24);
              const hasDiscount = Number(item.discountPercent || 0) > 0;

              return `
                <article
                  data-testid="catalog-item-${escapeHtml(item.id)}"
                  class="rounded-2xl border border-[#BCE3FF] bg-white hover:border-[#0095FF] transition-all overflow-hidden flex flex-col justify-between group shadow-2xs hover:shadow-md"
                >
                  <div>
                    <div
                      data-action="open-item-modal"
                      data-item-id="${escapeHtml(item.id)}"
                      class="relative w-full h-64 overflow-hidden bg-[#F8FAFC] block text-left cursor-pointer"
                    >
                      <img
                        src="${escapeHtml(item.image)}"
                        alt="${escapeHtml(item.name)}"
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      ${
                        hasDiscount
                          ? `
                        <span class="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#0D1015]/90 text-white font-mono-tech text-[10px] tracking-wider font-semibold">
                          ${item.discountPercent}% OFF Storewide
                        </span>
                      `
                          : ''
                      }
                      ${
                        item.isCustomClientDesign
                          ? `
                        <span class="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-[#0095FF] text-white font-mono-tech text-[10px] uppercase tracking-widest font-semibold shadow-xs">
                          Client Messenger Design
                        </span>
                      `
                          : ''
                      }
                    </div>

                    <div class="p-6 space-y-4">
                      <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-semibold text-[#0095FF]">${escapeHtml(item.categoryName)}</span>
                          <span class="text-[#CBD5E1]" aria-hidden="true">·</span>
                          <span class="font-mono-tech text-xs text-[#64748B]">${escapeHtml(item.sku)}</span>
                        </div>
                        <span class="inline-flex items-center gap-1 font-mono-tech text-xs font-semibold text-[#0D1015]">
                          ${ICONS.star}
                          <span>4.9 (24)</span>
                        </span>
                      </div>

                      <div>
                        <h3
                          data-action="open-item-modal"
                          data-item-id="${escapeHtml(item.id)}"
                          class="font-serif-display text-xl font-bold text-[#0D1015] group-hover:text-[#0095FF] transition-colors cursor-pointer leading-snug"
                        >
                          ${escapeHtml(item.name)}
                        </h3>
                        <p class="text-xs text-[#475569] line-clamp-2 mt-1.5 leading-relaxed">
                          ${escapeHtml(item.description)}
                        </p>
                      </div>

                      <!-- Selectable Color Swatches with Varying Prices -->
                      <div class="pt-3 border-t border-[#E2E8F0] space-y-2">
                        <div class="flex items-center justify-between gap-2">
                          <span class="text-[11px] font-medium text-[#475569] truncate">
                            Color: <strong class="text-[#0D1015]">${escapeHtml(variantPricing.colorName)}</strong>
                          </span>
                          <span class="font-mono-tech text-[11px] font-semibold text-[#0095FF] shrink-0">
                            ${
                              variantPricing.priceDelta === 0
                                ? 'Base Price'
                                : variantPricing.priceDelta > 0
                                ? `+${formatUsd(variantPricing.priceDelta)}`
                                : `-${formatUsd(Math.abs(variantPricing.priceDelta))}`
                            }
                          </span>
                        </div>

                        <div class="flex flex-wrap items-center gap-2">
                          ${(item.colorVariants || [])
                            .map((variant, vIdx) => {
                              const isSelected = variant.name === variantPricing.colorName;
                              const shortLabel = variant.name.split('/')[0].trim();
                              return `
                                <button
                                  type="button"
                                  data-action="select-card-color"
                                  data-item-id="${escapeHtml(item.id)}"
                                  data-color-name="${escapeHtml(variant.name)}"
                                  data-testid="color-swatch-${escapeHtml(item.id)}-${vIdx}"
                                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'bg-[#E0F2FE] border-[#0095FF] text-[#0D1015] font-semibold shadow-2xs'
                                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569] hover:border-[#BCE3FF]'
                                  }"
                                >
                                  <span
                                    class="w-3 h-3 rounded-full border border-black/15 shrink-0"
                                    style="background-color: ${escapeHtml(variant.hex)}"
                                  ></span>
                                  <span class="truncate max-w-[115px]">${escapeHtml(shortLabel)}</span>
                                  ${
                                    variant.priceDelta !== 0
                                      ? `
                                    <span class="font-mono-tech text-[10px] text-[#0077CC] font-semibold">
                                      ${variant.priceDelta > 0 ? `+${formatUsd(variant.priceDelta)}` : `-${formatUsd(Math.abs(variant.priceDelta))}`}
                                    </span>
                                  `
                                      : ''
                                  }
                                </button>
                              `;
                            })
                            .join('')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="px-6 pb-6 pt-3 border-t border-[#E2E8F0] bg-white space-y-3">
                    <div class="flex items-end justify-between gap-2">
                      <div>
                        <div class="flex items-baseline gap-2">
                          <span
                            data-testid="card-price-${escapeHtml(item.id)}"
                            class="font-mono-tech text-xl font-bold text-[#0D1015]"
                          >
                            ${formatUsd(variantPricing.effectivePrice)}
                          </span>
                          ${
                            hasDiscount
                              ? `
                            <span class="font-mono-tech text-xs text-[#94A3B8] line-through">
                              ${formatUsd(variantPricing.variantBasePrice)}
                            </span>
                          `
                              : ''
                          }
                          <span class="font-mono-tech text-xs text-[#0095FF] font-medium">
                            ${formatUsd(monthlyEstimate)}/mo*
                          </span>
                        </div>
                        <p class="font-mono-tech text-[11px] text-[#64748B] mt-0.5">
                          ${item.inStockCount} in stock · ${item.leadTimeWeeks}w delivery
                        </p>
                      </div>

                      <button
                        type="button"
                        data-action="open-item-modal"
                        data-item-id="${escapeHtml(item.id)}"
                        class="px-3 py-1.5 rounded-lg border border-[#BCE3FF] bg-white hover:bg-[#F0F8FF] text-xs font-semibold text-[#0D1015] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <span class="text-[#0095FF]">${ICONS.eye}</span>
                        <span>Details</span>
                      </button>
                    </div>

                    <div class="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        data-action="open-messenger"
                        data-mode="make-offer"
                        data-item-id="${escapeHtml(item.id)}"
                        data-color-name="${escapeHtml(variantPricing.colorName)}"
                        data-testid="make-offer-${escapeHtml(item.id)}"
                        aria-label="Make Offer on ${escapeHtml(item.name)} in Admin Messenger"
                        class="px-3 py-2.5 rounded-xl bg-[#D8EEFF]/80 hover:bg-[#BCE3FF] text-[#0D1015] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span class="text-[#0077CC]">${ICONS.tag}</span>
                        <span>Make Offer</span>
                      </button>

                      <button
                        type="button"
                        data-action="add-to-cart"
                        data-item-id="${escapeHtml(item.id)}"
                        data-color-name="${escapeHtml(variantPricing.colorName)}"
                        data-testid="add-to-order-${escapeHtml(item.id)}"
                        aria-label="Add ${escapeHtml(item.name)} to order inquiry"
                        class="px-3 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        ${ICONS.plus}
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                </article>
              `;
            })
            .join('')}
        </div>
      </section>

      <!-- 03. Bottom Editorial Callout -->
      <section class="bg-[#0D1015] text-white border-t border-slate-800">
        <div class="max-w-[1440px] mx-auto px-4 sm:px-8 py-14 sm:py-16 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div class="max-w-2xl space-y-3">
            <p class="font-mono-tech text-xs uppercase tracking-[0.2em] text-[#0095FF] font-semibold">
              03. Direct Owner Messenger, Custom Furniture Designs &amp; Exclusive Vouchers
            </p>
            <h2 class="font-serif-display text-2xl sm:text-3xl font-bold leading-snug">
              “We passed our custom 280cm walnut table design directly through Lillia &amp; Rowena’s Messenger, negotiated our trade offer, and redeemed our exclusive product voucher in seconds.”
            </h2>
            <p class="font-mono-tech text-xs text-slate-400">
              Rowena Vance · Principal Architect, Vance &amp; Associates Spatial Design · Commissioned 14 custom residential pieces in 2026
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3.5 shrink-0">
            <button
              type="button"
              data-action="open-messenger"
              data-mode="custom-design"
              class="px-5 py-3.5 text-xs sm:text-sm font-semibold bg-[#0095FF] hover:bg-[#0077CC] text-white rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Pass Your Own Furniture Design in Messenger
            </button>
            <button
              type="button"
              data-action="switch-view"
              data-view="admin-dashboard"
              class="px-5 py-3.5 text-xs sm:text-sm font-semibold text-[#0D1015] bg-[#BCE3FF] hover:bg-white rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Open Left-Sidebar Admin Console
            </button>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderUserDashboardView() {
  const myOrders = state.orders.filter(
    (o) => o.clientEmail.toLowerCase() === state.currentUserEmail.toLowerCase()
  );
  const displayOrders = myOrders.length > 0 ? myOrders : state.orders;
  const selectedOrder =
    displayOrders.find((o) => o.id === state.clientSelectedOrderId) || displayOrders[0];

  const myVouchers = state.vouchers.filter(
    (v) => v.customerEmail.toLowerCase() === state.currentUserEmail.toLowerCase()
  );

  return `
    <div class="min-h-screen bg-[#F8FAFC] text-[#0D1015] py-10 sm:py-14">
      <div class="max-w-[1440px] mx-auto px-4 sm:px-8 space-y-10">
        <!-- Header -->
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#BCE3FF]">
          <div class="space-y-2">
            <p class="font-mono-tech text-xs uppercase tracking-[0.2em] text-[#0095FF] font-semibold">
              Client Commission &amp; Messenger Voucher Portal
            </p>
            <h1 class="font-serif-display text-3xl sm:text-4xl font-bold text-[#0D1015]">
              Welcome back, ${escapeHtml(state.currentUserName)}
            </h1>
            <p class="text-sm text-[#475569]">
              Signed in as <span class="font-mono-tech text-[#0D1015]">${escapeHtml(state.currentUserEmail)}</span> · Track live workshop progress or redeem single-product Vouchers sent by the Admin on Messenger.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-action="open-messenger"
              data-mode="make-offer"
              class="px-5 py-3 rounded-xl bg-[#E0F2FE] hover:bg-[#BCE3FF] text-[#0D1015] text-xs font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <span class="text-[#0077CC]">${ICONS.tag}</span>
              <span>Make Offer in Admin Messenger</span>
            </button>
            <button
              type="button"
              data-action="open-messenger"
              data-mode="custom-design"
              class="px-5 py-3 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              ${ICONS.sparkles}
              <span>Pass Custom Design in Messenger</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <!-- Left Sidebar Navigation -->
          <aside class="lg:col-span-3 bg-white rounded-3xl border border-[#BCE3FF] p-6 space-y-6 shadow-xs">
            <div>
              <p class="font-mono-tech text-xs uppercase tracking-widest text-[#0095FF] font-semibold">
                Client Workspace
              </p>
              <p class="text-xs text-[#64748B] mt-1">
                Manage your commissions and single-product Messenger vouchers
              </p>
            </div>

            <nav class="space-y-2.5">
              <button
                type="button"
                data-action="switch-client-tab"
                data-tab="orders"
                class="w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer ${
                  state.clientActiveTab === 'orders'
                    ? 'bg-[#0D1015] text-white shadow-sm'
                    : 'bg-[#F8FAFC] hover:bg-[#E0F2FE]/60 text-[#0D1015]'
                }"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg ${state.clientActiveTab === 'orders' ? 'bg-[#0095FF] text-white' : 'bg-[#E0F2FE] text-[#0077CC]'} flex items-center justify-center">
                    ${ICONS.clipboard}
                  </div>
                  <div>
                    <p class="text-sm font-bold">My Order Records</p>
                    <p class="text-xs opacity-75">6-stage workshop tracker</p>
                  </div>
                </div>
                <span class="font-mono-tech text-xs px-2.5 py-1 rounded-full bg-white/15">
                  ${displayOrders.length}
                </span>
              </button>

              <button
                type="button"
                data-action="switch-client-tab"
                data-tab="vouchers"
                class="w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer ${
                  state.clientActiveTab === 'vouchers'
                    ? 'bg-[#0D1015] text-white shadow-sm'
                    : 'bg-[#F8FAFC] hover:bg-[#E0F2FE]/60 text-[#0D1015]'
                }"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg ${state.clientActiveTab === 'vouchers' ? 'bg-[#0095FF] text-white' : 'bg-[#E0F2FE] text-[#0077CC]'} flex items-center justify-center">
                    ${ICONS.tag}
                  </div>
                  <div>
                    <p class="text-sm font-bold">Messenger Vouchers</p>
                    <p class="text-xs opacity-75">Single-product owner links</p>
                  </div>
                </div>
                <span class="font-mono-tech text-xs px-2.5 py-1 rounded-full bg-[#0095FF] text-white">
                  ${myVouchers.length}
                </span>
              </button>
            </nav>
          </aside>

          <!-- Main Content -->
          <div class="lg:col-span-9 space-y-8">
            ${
              state.clientActiveTab === 'orders' && selectedOrder
                ? `
              <div class="bg-white rounded-3xl border border-[#BCE3FF] p-8 space-y-8 shadow-xs">
                <div class="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
                  <div>
                    <span class="font-mono-tech text-xs uppercase tracking-widest text-[#0095FF] font-semibold">
                      Active Commission Record · ${escapeHtml(selectedOrder.orderNumber)}
                    </span>
                    <h2 class="font-serif-display text-2xl sm:text-3xl font-bold text-[#0D1015] mt-1">
                      ${escapeHtml(selectedOrder.furnitureName)}
                    </h2>
                    <p class="text-xs text-[#475569] mt-1">
                      Color / Finish: <strong class="text-[#0D1015]">${escapeHtml(selectedOrder.selectedFinish)}</strong> · Dimensions: ${escapeHtml(selectedOrder.customDimensions)}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="font-mono-tech text-2xl font-bold text-[#0D1015]">${formatUsd(selectedOrder.totalAmount)}</p>
                    <p class="font-mono-tech text-xs text-[#0095FF] font-semibold mt-0.5">${escapeHtml(selectedOrder.paymentStatus)}</p>
                  </div>
                </div>

                <!-- 6-Stage Progress Stepper -->
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  ${ORDER_STATUS_STEPS.map((step, idx) => {
                    const currentIdx = ORDER_STATUS_STEPS.indexOf(selectedOrder.status);
                    const done = idx <= currentIdx;
                    return `
                      <div class="p-3.5 rounded-2xl border ${
                        done
                          ? 'bg-[#F0F8FF] border-[#0095FF] text-[#0D1015]'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'
                      }">
                        <p class="font-mono-tech text-[10px] uppercase tracking-wider ${done ? 'text-[#0095FF] font-semibold' : ''}">
                          Stage 0${idx + 1}
                        </p>
                        <p class="text-xs font-bold mt-1">${escapeHtml(step)}</p>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `
                : `
              <div class="bg-white rounded-3xl border border-[#BCE3FF] p-8 space-y-6 shadow-xs">
                <div>
                  <p class="font-mono-tech text-xs uppercase tracking-widest text-[#0095FF] font-semibold">
                    Single-Customer, Single-Product Vouchers Sent via Admin Messenger
                  </p>
                  <h2 class="font-serif-display text-2xl font-bold text-[#0D1015] mt-1">
                    Exclusive Vouchers for ${escapeHtml(state.currentUserEmail)}
                  </h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                  ${myVouchers
                    .map(
                      (vch) => `
                    <div class="p-6 rounded-2xl bg-[#F4F9FF] border border-[#BCE3FF] space-y-4">
                      <div class="flex items-center justify-between">
                        <span class="font-mono-tech text-sm font-bold px-3 py-1 rounded-lg bg-[#0D1015] text-white">
                          ${escapeHtml(vch.code)}
                        </span>
                        <span class="font-mono-tech text-base font-bold text-emerald-700">
                          -${formatUsd(vch.discountAmount)} OFF
                        </span>
                      </div>
                      <div class="text-xs text-[#475569] space-y-1">
                        <p>Valid Product: <strong class="text-[#0D1015]">${escapeHtml(vch.furnitureName)} (${escapeHtml(vch.furnitureSku)})</strong></p>
                        <p>Locked Account: <span class="font-mono-tech">${escapeHtml(vch.customerEmail)}</span></p>
                        <p class="font-mono-tech text-[11px] text-[#0077CC] break-all pt-1">
                          Messenger Link: ${escapeHtml(vch.messengerPlaceholderLink)}
                        </p>
                      </div>
                      ${
                        vch.status === 'Active'
                          ? `
                        <button
                          type="button"
                          data-action="redeem-voucher-to-cart"
                          data-voucher-code="${escapeHtml(vch.code)}"
                          class="w-full py-2.5 px-4 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Redeem Voucher on ${escapeHtml(vch.furnitureName)} →
                        </button>
                      `
                          : `<span class="inline-block text-xs font-mono-tech text-[#64748B]">Status: ${escapeHtml(vch.status)}</span>`
                      }
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAdminDashboardView() {
  const totalRevenue = state.orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const discountedCount = state.catalog.filter((i) => Number(i.discountPercent || 0) > 0).length;
  const filteredCatalog = state.catalog.filter((item) => {
    const q = state.adminCatalogSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.categoryName.toLowerCase().includes(q)
    );
  });

  return `
    <div class="min-h-screen bg-[#F8FAFC] text-[#0D1015] py-10 sm:py-14">
      <div class="max-w-[1440px] mx-auto px-4 sm:px-8 space-y-10">
        <!-- Top Header -->
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#BCE3FF]">
          <div class="space-y-2">
            <p class="font-mono-tech text-xs uppercase tracking-[0.16em] text-[#0095FF] font-semibold">
              Atelier Administration · Showroom &amp; Record Management Console
            </p>
            <h1 class="font-serif-display text-3xl sm:text-4xl font-bold text-[#0D1015]">
              Business Owner &amp; Admin Management Console
            </h1>
            <p class="text-sm text-[#475569] max-w-2xl">
              Add custom customer designs sent in Messenger to the catalog, manage color-tiered pricing and storewide discounts, and generate single-user, single-product Voucher links for Messenger.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              data-action="open-add-custom-design-modal"
              data-testid="admin-add-custom-design-btn"
              class="px-5 py-3 rounded-xl bg-[#D8EEFF] hover:bg-[#BCE3FF] text-[#0D1015] text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <span class="text-[#0077CC]">${ICONS.sparkles}</span>
              <span>Add Client Design from Messenger</span>
            </button>
            <button
              type="button"
              data-action="open-add-product-modal"
              data-testid="admin-add-product-btn"
              class="px-5 py-3 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              ${ICONS.plus}
              <span>Add New Product</span>
            </button>
          </div>
        </div>

        ${
          state.adminBannerMessage
            ? `
          <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-medium flex items-center justify-between">
            <span>✓ ${escapeHtml(state.adminBannerMessage)}</span>
            <button type="button" data-action="clear-admin-banner" class="text-emerald-700 font-bold cursor-pointer">✕</button>
          </div>
        `
            : ''
        }

        <!-- KPI Strip -->
        <div class="bg-white rounded-3xl border border-[#BCE3FF] p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 shadow-2xs">
          <div class="border-r border-[#E2E8F0] pr-4">
            <p class="text-xs text-[#64748B]">Total Commission Volume</p>
            <p class="font-mono-tech text-3xl font-bold text-[#0D1015] mt-1">${formatUsd(totalRevenue)}</p>
            <p class="font-mono-tech text-xs text-[#64748B] mt-1">Across ${state.orders.length} client commissions</p>
          </div>
          <div class="border-r border-[#E2E8F0] pr-4">
            <p class="text-xs text-[#64748B]">Catalog &amp; Color Variants</p>
            <p class="font-mono-tech text-3xl font-bold text-[#0095FF] mt-1">${state.catalog.length} Products</p>
            <p class="font-mono-tech text-xs text-[#64748B] mt-1">${discountedCount} discounted · Tiered color pricing</p>
          </div>
          <div class="border-r border-[#E2E8F0] pr-4">
            <p class="text-xs text-[#64748B]">Messenger Vouchers</p>
            <p class="font-mono-tech text-3xl font-bold text-[#0D1015] mt-1">${state.vouchers.length} Vouchers</p>
            <p class="font-mono-tech text-xs text-[#64748B] mt-1">1-user, 1-product Messenger links</p>
          </div>
          <div>
            <p class="text-xs text-[#64748B]">Active Millwork &amp; Dispatch</p>
            <p class="font-mono-tech text-3xl font-bold text-[#0D1015] mt-1">${state.workshopLogs.length} Active</p>
            <p class="font-mono-tech text-xs text-[#64748B] mt-1">4 Materials · 4 Employees</p>
          </div>
        </div>

        <!-- Left Sidebar + Main Workspace -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <!-- Left Sidebar -->
          <aside class="lg:col-span-3 bg-white rounded-3xl border border-[#BCE3FF] p-6 space-y-6 shadow-2xs">
            <div>
              <p class="font-mono-tech text-xs uppercase tracking-widest text-[#0095FF] font-semibold">
                Atelier Modules
              </p>
              <p class="text-xs text-[#64748B] mt-1">
                Select a module on the left to manage records
              </p>
            </div>

            <nav class="space-y-2.5">
              ${[
                {
                  id: 'catalog',
                  icon: ICONS.box,
                  title: 'Products, Colors & Discounts',
                  sub: 'Catalog, custom designs & color tiers',
                  count: state.catalog.length,
                },
                {
                  id: 'vouchers',
                  icon: ICONS.tag,
                  title: 'Messenger Vouchers',
                  sub: '1-customer, 1-product voucher links',
                  count: state.vouchers.length,
                },
                {
                  id: 'orders',
                  icon: ICONS.clipboard,
                  title: 'Customer Orders',
                  sub: 'Order items & custom dimensions',
                  count: state.orders.length,
                },
                {
                  id: 'materials',
                  icon: ICONS.layers,
                  title: 'Materials & Suppliers',
                  sub: 'Timber, stone & textiles',
                  count: state.workshopLogs.length,
                },
              ]
                .map(
                  (mod) => `
                <button
                  type="button"
                  data-action="switch-admin-module"
                  data-module="${mod.id}"
                  data-testid="admin-sidebar-${mod.id}"
                  class="w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer ${
                    state.adminActiveModule === mod.id
                      ? 'bg-[#0D1015] text-white shadow-sm'
                      : 'bg-[#F8FAFC] hover:bg-[#E0F2FE]/60 text-[#0D1015]'
                  }"
                >
                  <div class="flex items-center gap-3 min-w-0 pr-2">
                    <div class="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                      state.adminActiveModule === mod.id
                        ? 'bg-[#0095FF] text-white'
                        : 'bg-[#E0F2FE] text-[#0077CC]'
                    }">
                      ${mod.icon}
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs sm:text-sm font-bold truncate">${escapeHtml(mod.title)}</p>
                      <p class="text-[11px] opacity-75 truncate">${escapeHtml(mod.sub)}</p>
                    </div>
                  </div>
                  <span class="font-mono-tech text-xs px-2.5 py-1 rounded-lg bg-white/15 shrink-0">
                    ${mod.count}
                  </span>
                </button>
              `
                )
                .join('')}
            </nav>
          </aside>

          <!-- Main Module Panel -->
          <div class="lg:col-span-9 bg-white rounded-3xl border border-[#BCE3FF] p-8 space-y-8 shadow-2xs">
            ${
              state.adminActiveModule === 'catalog'
                ? `
              <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
                <div>
                  <p class="font-mono-tech text-xs uppercase tracking-widest text-[#0095FF] font-semibold">
                    Product Catalog, Custom Messenger Designs &amp; Color Pricing
                  </p>
                  <h2 class="font-serif-display text-2xl sm:text-3xl font-bold text-[#0D1015] mt-1">
                    Catalog Products, Color Price Tiers &amp; Discounts
                  </h2>
                  <p class="text-xs text-[#475569] mt-1">
                    Add new products (including custom designs sent by customers in Messenger), configure color variants with varying prices, or set a global discount for all users.
                  </p>
                </div>

                <div class="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    data-action="open-add-custom-design-modal"
                    class="px-4 py-2.5 rounded-xl bg-[#D8EEFF] hover:bg-[#BCE3FF] text-[#0D1015] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span class="text-[#0077CC]">${ICONS.sparkles}</span>
                    <span>+ Custom Design from Messenger</span>
                  </button>
                  <button
                    type="button"
                    data-action="open-add-product-modal"
                    class="px-4 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    ${ICONS.plus}
                    <span>Add New Product</span>
                  </button>
                </div>
              </div>

              <!-- Search Bar inside Admin Catalog -->
              <div class="p-4 rounded-2xl bg-[#F8FAFC] border border-[#BCE3FF] flex items-center justify-between gap-4">
                <div class="relative flex-1 max-w-md">
                  <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0095FF]">${ICONS.search}</span>
                  <input
                    type="search"
                    id="admin-catalog-search"
                    value="${escapeHtml(state.adminCatalogSearch)}"
                    placeholder="Search SKU, product name, category, or color..."
                    class="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-[#BCE3FF] text-xs"
                  />
                </div>
                <span class="font-mono-tech text-xs text-[#475569]">
                  Showing ${filteredCatalog.length} of ${state.catalog.length} products
                </span>
              </div>

              <div class="overflow-x-auto rounded-2xl border border-[#BCE3FF]">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-[#F8FAFC] border-b border-[#BCE3FF] font-mono-tech text-[11px] uppercase text-[#475569]">
                      <th class="py-3.5 px-4">Product &amp; Color Variants</th>
                      <th class="py-3.5 px-4">Base Price</th>
                      <th class="py-3.5 px-4">Discount for All Users</th>
                      <th class="py-3.5 px-4">Effective Price</th>
                      <th class="py-3.5 px-4">Stock</th>
                      <th class="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#E2E8F0] text-xs sm:text-sm">
                    ${filteredCatalog
                      .map(
                        (item) => `
                      <tr class="hover:bg-[#F8FAFC]">
                        <td class="py-4 px-4">
                          <p class="font-bold text-[#0D1015]">${escapeHtml(item.name)}</p>
                          <p class="font-mono-tech text-xs text-[#64748B]">${escapeHtml(item.sku)} · ${escapeHtml(item.categoryName)}</p>
                          <div class="flex flex-wrap gap-1.5 mt-2">
                            ${(item.colorVariants || [])
                              .map(
                                (cv) => `
                              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0F8FF] border border-[#BCE3FF] text-[10px]">
                                <span class="w-2.5 h-2.5 rounded-full" style="background-color:${escapeHtml(cv.hex)}"></span>
                                <span>${escapeHtml(cv.name.split('/')[0].trim())}</span>
                                <strong class="font-mono-tech text-[#0077CC]">
                                  ${cv.priceDelta === 0 ? '$0' : cv.priceDelta > 0 ? `+${formatUsd(cv.priceDelta)}` : `-${formatUsd(Math.abs(cv.priceDelta))}`}
                                </strong>
                              </span>
                            `
                              )
                              .join('')}
                          </div>
                        </td>
                        <td class="py-4 px-4 font-mono-tech font-semibold">${formatUsd(item.price)}</td>
                        <td class="py-4 px-4">
                          <span class="font-mono-tech text-xs px-2.5 py-1 rounded-lg bg-[#E0F2FE] text-[#0077CC] font-semibold">
                            ${Number(item.discountPercent || 0)}% OFF
                          </span>
                        </td>
                        <td class="py-4 px-4 font-mono-tech font-bold text-[#0095FF]">${formatUsd(item.effectivePrice)}</td>
                        <td class="py-4 px-4 font-mono-tech text-xs">${item.inStockCount} units</td>
                        <td class="py-4 px-4 text-right">
                          <button
                            type="button"
                            data-action="open-edit-product-modal"
                            data-item-id="${escapeHtml(item.id)}"
                            class="px-3 py-1.5 rounded-lg border border-[#BCE3FF] hover:bg-[#F0F8FF] text-xs font-semibold cursor-pointer"
                          >
                            Edit Colors &amp; Price
                          </button>
                        </td>
                      </tr>
                    `
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
            `
                : state.adminActiveModule === 'vouchers'
                ? `
              <div class="space-y-6">
                <div class="pb-6 border-b border-[#E2E8F0]">
                  <p class="font-mono-tech text-xs uppercase tracking-widest text-[#0095FF] font-semibold">
                    Single-Customer, Single-Product Vouchers Sent via Messenger
                  </p>
                  <h2 class="font-serif-display text-2xl font-bold text-[#0D1015] mt-1">
                    Issue Exclusive Messenger Voucher Link
                  </h2>
                </div>

                <form id="admin-issue-voucher-form" class="p-6 rounded-2xl bg-[#F4F9FF] border border-[#BCE3FF] grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div>
                    <label class="block text-xs font-semibold text-[#0D1015] mb-1">Customer Email</label>
                    <input
                      type="email"
                      name="customerEmail"
                      value="rowena.vance@vancearchitects.com"
                      required
                      class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#BCE3FF] text-xs"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#0D1015] mb-1">Target Product</label>
                    <select
                      name="furnitureId"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#BCE3FF] text-xs"
                    >
                      ${state.catalog
                        .map(
                          (item) => `
                        <option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} (${escapeHtml(item.sku)})</option>
                      `
                        )
                        .join('')}
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-[#0D1015] mb-1">Voucher Discount ($ USD)</label>
                    <input
                      type="number"
                      name="discountAmount"
                      value="350"
                      min="25"
                      required
                      class="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#BCE3FF] text-xs font-mono-tech"
                    />
                  </div>
                  <button
                    type="submit"
                    class="py-2.5 px-4 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold cursor-pointer"
                  >
                    + Generate Messenger Voucher
                  </button>
                </form>

                <div class="space-y-3">
                  ${state.vouchers
                    .map(
                      (vch) => `
                    <div class="p-5 rounded-2xl border border-[#BCE3FF] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div class="space-y-1">
                        <div class="flex items-center gap-2.5">
                          <span class="font-mono-tech text-xs font-bold px-2.5 py-1 rounded bg-[#0D1015] text-white">${escapeHtml(vch.code)}</span>
                          <span class="font-mono-tech text-sm font-bold text-emerald-700">-${formatUsd(vch.discountAmount)} OFF</span>
                          <span class="text-xs text-[#64748B]">· Locked to <strong>${escapeHtml(vch.customerEmail)}</strong></span>
                        </div>
                        <p class="text-xs text-[#475569]">
                          Exclusive Product: <strong class="text-[#0D1015]">${escapeHtml(vch.furnitureName)} (${escapeHtml(vch.furnitureSku)})</strong>
                        </p>
                        <p class="font-mono-tech text-[11px] text-[#0077CC] break-all">
                          Messenger Placeholder Link: ${escapeHtml(vch.messengerPlaceholderLink)}
                        </p>
                      </div>
                      <span class="font-mono-tech text-xs px-3 py-1 rounded-full bg-[#E0F2FE] text-[#0077CC] font-semibold">
                        ${escapeHtml(vch.status)}
                      </span>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `
                : `
              <div class="space-y-4">
                <h2 class="font-serif-display text-2xl font-bold text-[#0D1015]">Customer Commission Orders &amp; Workshop Logs</h2>
                ${state.orders
                  .map(
                    (ord) => `
                  <div class="p-5 rounded-2xl border border-[#BCE3FF] bg-[#F8FAFC] flex items-center justify-between">
                    <div>
                      <p class="font-mono-tech text-xs text-[#0095FF] font-semibold">${escapeHtml(ord.orderNumber)} · ${escapeHtml(ord.status)}</p>
                      <p class="font-bold text-sm text-[#0D1015]">${escapeHtml(ord.furnitureName)} — ${escapeHtml(ord.selectedFinish)}</p>
                      <p class="text-xs text-[#64748B]">${escapeHtml(ord.clientName)} (${escapeHtml(ord.clientEmail)})</p>
                    </div>
                    <p class="font-mono-tech text-base font-bold text-[#0D1015]">${formatUsd(ord.totalAmount)}</p>
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderLoginView() {
  return `
    <div class="min-h-[82vh] bg-[#F8FAFC] flex items-center justify-center px-4 sm:px-8 py-12">
      <div class="w-full max-w-5xl bg-white rounded-3xl border border-[#BCE3FF] overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-sm">
        <!-- Left Showroom Image Column (Exact Original Split Login Design) -->
        <div class="lg:col-span-6 relative min-h-[380px] lg:min-h-[540px] bg-[#0D1015] text-white flex flex-col justify-end p-8 sm:p-10">
          <img
            src="/assets/images/category_office_storage.jpg"
            alt="Bespoke Order & Atelier Record Management"
            class="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-[#0D1015]/95 via-[#0D1015]/45 to-transparent"></div>
          <div class="relative space-y-3">
            <p class="font-mono-tech text-xs text-[#0095FF] font-semibold">
              Lillia &amp; Rowena Furniture · Record Portal Access
            </p>
            <h1 class="font-serif-display text-3xl sm:text-4xl font-bold leading-tight">
              Bespoke Order &amp; Atelier Record Management.
            </h1>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Clients and interior architects can track live millwork milestones, redeem single-product Messenger vouchers, and manage white-glove delivery instructions.
            </p>
            <p class="pt-3 border-t border-white/15 font-mono-tech text-xs text-[#BCE3FF]">
              Currently active session: ${escapeHtml(state.currentUserName)} (${state.currentRole === 'admin' ? 'Admin Console' : 'Client Portal'})
            </p>
          </div>
        </div>

        <!-- Right Form Column -->
        <div class="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center space-y-6">
          <div>
            <p class="text-xs font-semibold text-[#0095FF]">Account Authentication</p>
            <h2 class="font-serif-display text-2xl sm:text-3xl font-bold text-[#0D1015] mt-1">
              Sign In to Your Portal
            </h2>
          </div>

          <div class="p-4 rounded-2xl bg-[#F4F9FF] border border-[#BCE3FF] space-y-2.5">
            <p class="text-xs font-semibold text-[#0D1015] inline-flex items-center gap-1.5">
              <span class="text-[#0095FF]">${ICONS.key}</span>
              <span>Quick-Fill Portal Credentials</span>
            </p>
            <div class="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                data-action="set-login-role"
                data-role="client"
                data-testid="role-client"
                class="px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                  state.loginRole === 'client'
                    ? 'bg-[#0095FF] text-white border-[#0095FF]'
                    : 'bg-white text-[#0D1015] border-[#BCE3FF]'
                }"
              >
                Fill Client Portal (Rowena Vance)
              </button>
              <button
                type="button"
                data-action="set-login-role"
                data-role="admin"
                data-testid="role-admin"
                class="px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                  state.loginRole === 'admin'
                    ? 'bg-[#0095FF] text-white border-[#0095FF]'
                    : 'bg-white text-[#0D1015] border-[#BCE3FF]'
                }"
              >
                Fill Admin Console (Lillia Mercier)
              </button>
            </div>
          </div>

          ${
            state.loginError
              ? `<div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">${escapeHtml(state.loginError)}</div>`
              : ''
          }

          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-[#0D1015] mb-1.5">Registered Email Address</label>
              <input
                type="email"
                name="email"
                value="${escapeHtml(state.loginEmail)}"
                required
                class="w-full px-4 py-3 rounded-xl bg-[#F8FAFC] border border-[#BCE3FF] text-sm"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#0D1015] mb-1.5">Portal Password</label>
              <input
                type="password"
                name="accessCode"
                value="${escapeHtml(state.loginAccessCode)}"
                required
                class="w-full px-4 py-3 rounded-xl bg-[#F8FAFC] border border-[#BCE3FF] text-sm"
              />
            </div>
            <button
              type="submit"
              data-testid="login-submit"
              class="w-full py-3.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              ${ICONS.lock}
              <span>Sign In &amp; Open Dashboard →</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function renderMessengerModal() {
  if (!state.isMessengerModalOpen) return '';

  const product =
    state.catalog.find((p) => p.id === state.messengerProductId) || state.catalog[0];
  const activeColor =
    state.messengerSelectedColor ||
    product?.colorVariants?.[0]?.name ||
    product?.defaultFinish ||
    '';
  const variantPricing = computeVariantPricing(product, activeColor);
  const numericProposed = Number(state.messengerProposedPrice) || variantPricing.effectivePrice;
  const requestedDiscount = Math.max(0, variantPricing.effectivePrice - numericProposed);

  const messengerRedirectUrl = buildAdminMessengerUrl({
    mode: state.messengerMode,
    sku: state.messengerMode === 'make-offer' ? product.sku : 'CUSTOM-DESIGN',
    colorName: state.messengerMode === 'make-offer' ? variantPricing.colorName : undefined,
    proposedPrice: state.messengerMode === 'make-offer' ? numericProposed : undefined,
    clientEmail: state.currentUserEmail,
  });

  const prefilledMessage =
    state.messengerMode === 'make-offer'
      ? `Hello Admin (Lillia & Rowena Furniture)! I would like to make an offer on "${product.name}" (SKU: ${product.sku}) in color "${variantPricing.colorName}" (Listed Price: ${formatUsd(variantPricing.effectivePrice)}). My proposed reduced price is ${formatUsd(numericProposed)} (${formatUsd(requestedDiscount)} off). If accepted, please send my single-product Voucher link for account ${state.currentUserEmail}.`
      : `Hello Admin (Lillia & Rowena Furniture)! I would like to pass my own custom furniture design: "${state.messengerCustomTitle}" (${state.messengerCustomDimensions}, Materials: ${state.messengerCustomMaterials}). Please add this custom design to the catalog for ${state.currentUserEmail}.`;

  const myVouchers = state.vouchers.filter(
    (v) => v.customerEmail.toLowerCase() === state.currentUserEmail.toLowerCase()
  );

  return `
    <div
      class="fixed inset-0 z-50 bg-[#0D1015]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Redirect to Business Owner Admin Messenger"
    >
      <div class="bg-white border border-[#BCE3FF] rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <!-- Top Modal Header -->
        <div class="bg-[#0D1015] text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#0095FF] text-white flex items-center justify-center shrink-0">
              ${ICONS.externalLink}
            </div>
            <div>
              <p class="font-mono-tech text-[10px] uppercase tracking-widest text-[#BCE3FF]">
                External Admin Messenger Redirect · No In-App Chat Required
              </p>
              <h2 class="font-serif-display text-lg sm:text-xl font-bold leading-tight">
                Continue to Business Owner’s Messenger
              </h2>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              data-action="set-messenger-mode"
              data-mode="make-offer"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                state.messengerMode === 'make-offer'
                  ? 'bg-[#0095FF] text-white'
                  : 'bg-slate-800 text-slate-300'
              }"
            >
              Make Offer (Reduced Price)
            </button>
            <button
              type="button"
              data-action="set-messenger-mode"
              data-mode="custom-design"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                state.messengerMode === 'custom-design'
                  ? 'bg-[#0095FF] text-white'
                  : 'bg-slate-800 text-slate-300'
              }"
            >
              Pass Own Design
            </button>
            <button
              type="button"
              data-action="close-messenger-modal"
              data-testid="close-messenger-modal"
              class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              ${ICONS.x}
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="p-6 sm:p-8 overflow-y-auto space-y-6">
          <div class="p-5 rounded-2xl bg-[#F0F8FF] border border-[#BCE3FF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="space-y-1">
              <span class="font-mono-tech text-[10px] uppercase tracking-widest text-[#0095FF] font-semibold">
                Official Business Owner Messenger Link (Placeholder)
              </span>
              <p class="font-mono-tech text-xs sm:text-sm font-bold text-[#0D1015] break-all">
                ${escapeHtml(messengerRedirectUrl)}
              </p>
              <p class="text-xs text-[#475569]">
                Talk directly with the owner on Messenger. When they accept your reduced price, they will send you a single-use Voucher link valid exclusively for your account (${escapeHtml(state.currentUserEmail)}) and your chosen product.
              </p>
            </div>

            <a
              href="${escapeHtml(messengerRedirectUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="messenger-external-link"
              class="px-5 py-3 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 shrink-0 shadow-sm"
            >
              <span>Open Admin Messenger</span>
              ${ICONS.externalLink}
            </a>
          </div>

          ${
            state.messengerMode === 'make-offer'
              ? `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-[#0D1015] mb-1.5">
                  1. Select Product to Negotiate
                </label>
                <select
                  id="messenger-product-select"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#BCE3FF] text-xs sm:text-sm text-[#0D1015]"
                >
                  ${state.catalog
                    .map(
                      (item) => `
                    <option value="${escapeHtml(item.id)}" ${item.id === product.id ? 'selected' : ''}>
                      ${escapeHtml(item.name)} (${escapeHtml(item.sku)}) — Base ${formatUsd(item.effectivePrice)}
                    </option>
                  `
                    )
                    .join('')}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[#0D1015] mb-1.5">
                  2. Select Product Color (Price Varies by Color)
                </label>
                <select
                  id="messenger-color-select"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#BCE3FF] text-xs sm:text-sm text-[#0D1015]"
                >
                  ${(product.colorVariants || [])
                    .map((v) => {
                      const vp = computeVariantPricing(product, v.name);
                      return `
                        <option value="${escapeHtml(v.name)}" ${v.name === variantPricing.colorName ? 'selected' : ''}>
                          ${escapeHtml(v.name)} (${v.priceDelta === 0 ? 'Base' : v.priceDelta > 0 ? `+${formatUsd(v.priceDelta)}` : `-${formatUsd(Math.abs(v.priceDelta))}`} → ${formatUsd(vp.effectivePrice)})
                        </option>
                      `;
                    })
                    .join('')}
                </select>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-center gap-3.5">
                <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="w-14 h-14 rounded-xl object-cover border border-[#BCE3FF]" />
                <div>
                  <p class="font-bold text-sm text-[#0D1015]">${escapeHtml(product.name)}</p>
                  <p class="text-xs text-[#475569] inline-flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded-full inline-block" style="background-color:${escapeHtml(variantPricing.colorHex)}"></span>
                    <span>${escapeHtml(variantPricing.colorName)}</span>
                  </p>
                  <p class="font-mono-tech text-xs text-[#0095FF] font-semibold mt-0.5">
                    Color Price: ${formatUsd(variantPricing.effectivePrice)} (${variantPricing.priceDelta >= 0 ? `+${formatUsd(variantPricing.priceDelta)}` : `-${formatUsd(Math.abs(variantPricing.priceDelta))}`} color adjustment)
                  </p>
                </div>
              </div>
              <div class="w-full sm:w-52">
                <label class="block font-mono-tech text-[10px] uppercase text-[#475569] mb-1">
                  Your Target Offer (USD)
                </label>
                <input
                  id="messenger-offer-input"
                  type="number"
                  value="${escapeHtml(state.messengerProposedPrice)}"
                  class="w-full px-3.5 py-2 rounded-xl bg-white border border-[#0095FF] text-sm font-mono-tech font-bold text-[#0D1015]"
                />
                <p class="font-mono-tech text-[11px] text-[#0077CC] mt-1">
                  Requested Voucher: -${formatUsd(requestedDiscount)} OFF
                </p>
              </div>
            </div>
          `
              : ''
          }

          <div class="p-5 rounded-2xl bg-white border border-[#BCE3FF] space-y-3">
            <span class="font-mono-tech text-[11px] uppercase tracking-wider text-[#475569] font-semibold">
              Pre-Formatted Message for Admin’s Messenger
            </span>
            <p class="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0D1015] font-mono-tech leading-relaxed">
              ${escapeHtml(prefilledMessage)}
            </p>
            <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
              <a
                href="${escapeHtml(messengerRedirectUrl)}"
                target="_blank"
                rel="noopener noreferrer"
                class="px-5 py-3 rounded-xl bg-[#0D1015] hover:bg-[#0095FF] text-white text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2"
              >
                <span>Redirect to Admin Messenger to Negotiate Price</span>
                ${ICONS.externalLink}
              </a>
              <button
                type="button"
                data-action="messenger-to-admin"
                class="px-4 py-3 rounded-xl bg-[#E0F2FE] hover:bg-[#BCE3FF] text-[#0077CC] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                ${ICONS.sparkles}
                <span>Open Admin Console (Issue Voucher / Add Custom Design)</span>
              </button>
            </div>
          </div>

          <!-- Vouchers Sent via Admin Messenger -->
          <div class="pt-4 border-t border-[#E2E8F0] space-y-3">
            <p class="font-mono-tech text-[11px] uppercase tracking-widest text-[#0095FF] font-semibold">
              Voucher Links Sent by Admin via Messenger (Single-User, Single-Product)
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${myVouchers
                .map(
                  (vch) => `
                <div class="p-4 rounded-2xl bg-[#F4F9FF] border border-[#BCE3FF] flex flex-col justify-between gap-3">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="font-mono-tech text-xs font-bold px-2.5 py-1 rounded bg-[#0D1015] text-white">${escapeHtml(vch.code)}</span>
                      <span class="font-mono-tech text-xs font-bold text-emerald-700">-${formatUsd(vch.discountAmount)} OFF</span>
                    </div>
                    <p class="text-xs font-bold text-[#0D1015] pt-1">${escapeHtml(vch.furnitureName)}</p>
                    <p class="font-mono-tech text-[10px] text-[#0077CC] truncate">${escapeHtml(vch.messengerPlaceholderLink)}</p>
                  </div>
                  ${
                    vch.status === 'Active'
                      ? `
                    <button
                      type="button"
                      data-action="redeem-voucher-to-cart"
                      data-voucher-code="${escapeHtml(vch.code)}"
                      class="w-full py-2 px-3 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold cursor-pointer"
                    >
                      Apply Voucher to Cart
                    </button>
                  `
                      : ''
                  }
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAdminProductModal() {
  if (!state.isProductModalOpen) return '';
  const f = state.productForm;
  const baseNum = Number(f.price) || 0;
  const discNum = Math.max(0, Math.min(90, Number(f.discountPercent) || 0));
  const effectivePreview = Math.round(baseNum * (1 - discNum / 100));

  return `
    <div
      class="fixed inset-0 z-50 bg-[#0D1015]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Add or Edit Product"
    >
      <div class="bg-white border border-[#BCE3FF] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        <div class="bg-[#0D1015] text-white px-6 py-5 flex items-center justify-between">
          <div>
            <p class="font-mono-tech text-[10px] uppercase tracking-widest text-[#BCE3FF]">
              ${f.isCustomClientDesign ? "Add Client's Custom Furniture Design (Sent via Admin Messenger)" : 'Atelier Catalog & Color Pricing Configuration'}
            </p>
            <h3 class="font-serif-display text-xl font-bold mt-0.5">
              ${state.editingProductId ? 'Edit Product, Colors & Global Discount' : f.isCustomClientDesign ? 'Add Custom Messenger Design to Catalog' : 'Add New Furniture Product'}
            </h3>
          </div>
          <button
            type="button"
            data-action="close-product-modal"
            class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            ${ICONS.x}
          </button>
        </div>

        <form id="admin-product-form" class="p-6 sm:p-8 space-y-5 max-h-[80vh] overflow-y-auto">
          ${
            state.productFormError
              ? `<div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">${escapeHtml(state.productFormError)}</div>`
              : ''
          }

          <div class="p-4 rounded-2xl bg-[#F0F8FF] border border-[#BCE3FF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label class="flex items-center gap-2.5 text-xs font-semibold text-[#0D1015] cursor-pointer">
              <input
                type="checkbox"
                id="form-is-custom-design"
                ${f.isCustomClientDesign ? 'checked' : ''}
                class="w-4 h-4 accent-[#0095FF]"
              />
              <span>This product is a Customer's Own Furniture Design sent via Admin Messenger</span>
            </label>
            <input
              type="email"
              id="form-custom-email"
              value="${escapeHtml(f.customClientEmail)}"
              placeholder="Client Email"
              class="px-3 py-1.5 rounded-xl bg-white border border-[#BCE3FF] text-xs font-mono-tech"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-[#0D1015] mb-1">Product Title</label>
              <input
                type="text"
                id="form-product-name"
                value="${escapeHtml(f.name)}"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#BCE3FF] text-xs sm:text-sm"
              />
            </div>
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="block text-xs font-semibold text-[#0D1015] mb-1">SKU Code &amp; Category</label>
                <input
                  type="text"
                  id="form-product-sku"
                  value="${escapeHtml(f.sku)}"
                  required
                  class="w-full px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#BCE3FF] text-xs font-mono-tech"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-transparent mb-1 select-none">Category</label>
                <select
                  id="form-product-category"
                  class="w-full px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#BCE3FF] text-xs"
                >
                  <option value="living" ${f.categoryId === 'living' ? 'selected' : ''}>Living &amp; Lounge</option>
                  <option value="dining" ${f.categoryId === 'dining' ? 'selected' : ''}>Dining &amp; Tables</option>
                  <option value="bedroom" ${f.categoryId === 'bedroom' ? 'selected' : ''}>Bedroom Sanctuary</option>
                  <option value="office" ${f.categoryId === 'office' ? 'selected' : ''}>Study &amp; Credenzas</option>
                </select>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-[#0D1015] mb-1">Base Price (USD)</label>
              <input
                type="number"
                id="form-product-price"
                value="${escapeHtml(f.price)}"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#BCE3FF] text-sm font-mono-tech"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#0D1015] mb-1">Global Discount for All Users (%)</label>
              <input
                type="number"
                id="form-product-discount"
                value="${escapeHtml(f.discountPercent)}"
                min="0"
                max="80"
                class="w-full px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#BCE3FF] text-sm font-mono-tech"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#0D1015] mb-1">Effective Base Price</label>
              <div class="px-3.5 py-2.5 rounded-xl bg-[#F0F8FF] border border-[#BCE3FF] font-mono-tech text-sm font-bold text-[#0095FF]">
                ${formatUsd(effectivePreview)}
              </div>
            </div>
          </div>

          <!-- Product Colors & Price Variations -->
          <div class="p-4 rounded-2xl bg-[#F8FAFC] border border-[#BCE3FF] space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-[#0D1015] inline-flex items-center gap-1.5">
                <span class="text-[#0095FF]">${ICONS.palette}</span>
                <span>Product Colors &amp; Price Variations (USD)</span>
              </span>
              <button
                type="button"
                data-action="add-color-variant-row"
                class="px-3 py-1.5 rounded-lg bg-[#0095FF] text-white text-xs font-semibold cursor-pointer"
              >
                + Add Color Option
              </button>
            </div>
            <div class="space-y-2">
              ${f.colorVariants
                .map(
                  (cv, idx) => `
                <div class="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-[#E2E8F0]">
                  <input
                    type="color"
                    data-color-idx="${idx}"
                    data-field="hex"
                    value="${escapeHtml(cv.hex)}"
                    class="w-8 h-8 rounded cursor-pointer border border-slate-300"
                  />
                  <input
                    type="text"
                    data-color-idx="${idx}"
                    data-field="name"
                    value="${escapeHtml(cv.name)}"
                    placeholder="Color / Timber Name"
                    class="flex-1 px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs"
                  />
                  <div class="flex items-center gap-1">
                    <span class="text-xs font-mono-tech text-[#64748B]">+$</span>
                    <input
                      type="number"
                      data-color-idx="${idx}"
                      data-field="priceDelta"
                      value="${escapeHtml(cv.priceDelta)}"
                      class="w-24 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono-tech"
                    />
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-[#0D1015] mb-1">Dimensions</label>
              <input
                type="text"
                id="form-product-dimensions"
                value="${escapeHtml(f.dimensions)}"
                class="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#BCE3FF] text-xs font-mono-tech"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#0D1015] mb-1">Initial Stock</label>
              <input
                type="number"
                id="form-product-stock"
                value="${escapeHtml(f.inStockCount)}"
                class="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#BCE3FF] text-xs font-mono-tech"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#0D1015] mb-1">Lead Time (Weeks)</label>
              <input
                type="number"
                id="form-product-lead"
                value="${escapeHtml(f.leadTimeWeeks)}"
                class="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#BCE3FF] text-xs font-mono-tech"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-[#0D1015] mb-1">Architectural Description</label>
            <textarea
              id="form-product-description"
              rows="2"
              class="w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#BCE3FF] text-xs"
            >${escapeHtml(f.description)}</textarea>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              data-action="close-product-modal"
              class="px-4 py-2.5 rounded-xl border border-[#BCE3FF] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="save-product-submit"
              class="px-5 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              Save Product &amp; Color Tiers to Catalog
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderDetailModal() {
  if (!state.isDetailModalOpen || !state.modalSelectedItem) return '';
  const item = state.modalSelectedItem;
  const activeColor =
    state.modalSelectedColor || item.colorVariants?.[0]?.name || item.defaultFinish;
  const variantPricing = computeVariantPricing(item, activeColor);

  return `
    <div
      class="fixed inset-0 z-50 bg-[#0D1015]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div class="bg-white border border-[#BCE3FF] rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6">
        <div class="flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <span class="font-mono-tech text-xs uppercase text-[#0095FF] font-semibold">
              ${escapeHtml(item.categoryName)} · ${escapeHtml(item.sku)}
            </span>
            <h2 class="font-serif-display text-2xl font-bold text-[#0D1015] mt-1">${escapeHtml(item.name)}</h2>
          </div>
          <button
            type="button"
            data-action="close-detail-modal"
            class="p-2 rounded-lg bg-[#F0F8FF] hover:bg-[#E0F2FE] text-[#0D1015] cursor-pointer"
          >
            ${ICONS.x}
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <img
            src="${escapeHtml(item.image)}"
            alt="${escapeHtml(item.name)}"
            class="w-full h-72 object-cover rounded-2xl border border-[#BCE3FF]"
          />
          <div class="space-y-4">
            <p class="text-xs sm:text-sm text-[#475569] leading-relaxed">${escapeHtml(item.description)}</p>
            <div class="p-3.5 rounded-xl bg-[#F4F9FF] border border-[#BCE3FF]">
              <p class="font-mono-tech text-xs text-[#475569]">Selected Color Tier Price</p>
              <p class="font-mono-tech text-2xl font-bold text-[#0D1015] mt-0.5">${formatUsd(variantPricing.effectivePrice)}</p>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-bold text-[#0D1015]">Select Color (Price Varies by Color):</p>
              <div class="grid grid-cols-1 gap-2">
                ${(item.colorVariants || [])
                  .map((v) => {
                    const vp = computeVariantPricing(item, v.name);
                    const isSelected = v.name === variantPricing.colorName;
                    return `
                      <button
                        type="button"
                        data-action="select-modal-color"
                        data-color-name="${escapeHtml(v.name)}"
                        class="p-2.5 rounded-xl border text-left flex items-center justify-between text-xs cursor-pointer ${
                          isSelected
                            ? 'bg-[#E0F2FE] border-[#0095FF] font-semibold'
                            : 'bg-[#F8FAFC] border-[#E2E8F0]'
                        }"
                      >
                        <span class="flex items-center gap-2">
                          <span class="w-3.5 h-3.5 rounded-full border border-black/15" style="background-color:${escapeHtml(v.hex)}"></span>
                          <span>${escapeHtml(v.name)}</span>
                        </span>
                        <span class="font-mono-tech text-[#0077CC] font-bold">${formatUsd(vp.effectivePrice)}</span>
                      </button>
                    `;
                  })
                  .join('')}
              </div>
            </div>

            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                data-action="open-messenger"
                data-mode="make-offer"
                data-item-id="${escapeHtml(item.id)}"
                data-color-name="${escapeHtml(variantPricing.colorName)}"
                class="flex-1 py-3 rounded-xl bg-[#E0F2FE] text-[#0D1015] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span class="text-[#0077CC]">${ICONS.tag}</span>
                <span>Make Offer in Messenger</span>
              </button>
              <button
                type="button"
                data-action="add-to-cart"
                data-item-id="${escapeHtml(item.id)}"
                data-color-name="${escapeHtml(variantPricing.colorName)}"
                class="flex-1 py-3 rounded-xl bg-[#0095FF] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                ${ICONS.plus}
                <span>Add to Cart (${formatUsd(variantPricing.effectivePrice)})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderOrderDrawer() {
  if (!state.isOrderDrawerOpen) return '';

  const enrichedLines = state.cartItems.map((line) => {
    const vp = computeVariantPricing(line.furniture, line.finish);
    return {
      ...line,
      unitPrice: vp.effectivePrice,
      colorDelta: vp.priceDelta,
    };
  });

  const pricing = calculateOrderPricing(
    enrichedLines,
    state.appliedVoucher ? state.appliedVoucher.discountAmount : 0
  );

  return `
    <div
      class="fixed inset-0 z-50 bg-[#0D1015]/60 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart and Voucher Drawer"
    >
      <div class="bg-white w-full max-w-lg h-full flex flex-col justify-between p-6 sm:p-8 overflow-y-auto shadow-2xl">
        <div class="space-y-6">
          <div class="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
            <div>
              <p class="font-mono-tech text-[10px] uppercase tracking-widest text-[#0095FF] font-semibold">
                Atelier Order Inquiry &amp; Single-Product Voucher
              </p>
              <h2 class="font-serif-display text-2xl font-bold text-[#0D1015]">Your Commission Cart</h2>
            </div>
            <button
              type="button"
              data-action="close-cart-drawer"
              class="p-2 rounded-lg bg-[#F0F8FF] text-[#0D1015] cursor-pointer"
            >
              ${ICONS.x}
            </button>
          </div>

          ${
            state.checkoutMessage
              ? `<div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-medium">${escapeHtml(state.checkoutMessage)}</div>`
              : ''
          }

          <div class="space-y-3">
            ${enrichedLines
              .map(
                (line, idx) => `
              <div class="p-4 rounded-2xl bg-[#F8FAFC] border border-[#BCE3FF] flex items-center justify-between gap-3">
                <div>
                  <p class="font-bold text-sm text-[#0D1015]">${escapeHtml(line.furniture.name)}</p>
                  <p class="text-xs text-[#475569]">Color: <strong>${escapeHtml(line.finish)}</strong></p>
                  <p class="font-mono-tech text-xs text-[#0095FF] font-semibold mt-0.5">
                    ${formatUsd(line.unitPrice)} × ${line.quantity}
                  </p>
                </div>
                <button
                  type="button"
                  data-action="remove-cart-item"
                  data-idx="${idx}"
                  class="text-xs text-red-600 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            `
              )
              .join('')}
          </div>

          <div class="p-4 rounded-2xl bg-[#F0F8FF] border border-[#BCE3FF] space-y-2.5">
            <label class="block font-mono-tech text-[11px] uppercase text-[#0077CC] font-semibold">
              Redeem Messenger Voucher Code (1-User, 1-Product)
            </label>
            <div class="flex gap-2">
              <input
                type="text"
                id="cart-voucher-input"
                value="${escapeHtml(state.voucherInput)}"
                placeholder="e.g. VCH-ROWENA-SOFA400"
                class="flex-1 px-3 py-2 rounded-xl bg-white border border-[#BCE3FF] text-xs font-mono-tech uppercase"
              />
              <button
                type="button"
                data-action="apply-cart-voucher"
                class="px-4 py-2 rounded-xl bg-[#0D1015] text-white text-xs font-semibold cursor-pointer"
              >
                Apply
              </button>
            </div>
            ${
              state.voucherError
                ? `<p class="text-xs text-red-600">${escapeHtml(state.voucherError)}</p>`
                : ''
            }
            ${
              state.appliedVoucher
                ? `<p class="text-xs text-emerald-700 font-semibold">✓ Voucher ${escapeHtml(state.appliedVoucher.code)} applied (-${formatUsd(state.appliedVoucher.discountAmount)} OFF)</p>`
                : ''
            }
          </div>
        </div>

        <div class="pt-6 border-t border-[#E2E8F0] space-y-4">
          <div class="space-y-1.5 text-xs">
            <div class="flex justify-between">
              <span class="text-[#475569]">Color-Tiered Subtotal</span>
              <span class="font-mono-tech font-semibold">${formatUsd(pricing.rawSubtotal)}</span>
            </div>
            ${
              pricing.voucherDiscountAmount > 0
                ? `
              <div class="flex justify-between text-emerald-700 font-semibold">
                <span>Messenger Voucher Savings</span>
                <span class="font-mono-tech">-${formatUsd(pricing.voucherDiscountAmount)}</span>
              </div>
            `
                : ''
            }
            <div class="flex justify-between">
              <span class="text-[#475569]">White-Glove Freight</span>
              <span class="font-mono-tech">${pricing.whiteGloveDeliveryFee === 0 ? 'Complimentary' : formatUsd(pricing.whiteGloveDeliveryFee)}</span>
            </div>
            <div class="flex justify-between text-base font-bold pt-2 border-t border-[#E2E8F0]">
              <span>Total Commission</span>
              <span class="font-mono-tech text-[#0095FF]">${formatUsd(pricing.totalAmount)}</span>
            </div>
          </div>

          <button
            type="button"
            data-action="submit-order"
            class="w-full py-3.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs sm:text-sm font-semibold cursor-pointer shadow-xs"
          >
            Submit Commission Order (${formatUsd(pricing.depositDueNow)} 50% Deposit)
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderFooter() {
  return `
    <footer class="bg-[#F4F9FF] text-[#475569] border-t border-[#BCE3FF]">
      <div class="max-w-[1440px] mx-auto px-4 sm:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-7 h-7 rounded-md bg-[#0095FF] text-white flex items-center justify-center font-serif-display text-xs font-bold">
              LR
            </div>
            <span class="font-serif-display text-base font-bold text-[#0D1015]">Lillia &amp; Rowena</span>
          </div>
          <p class="text-xs text-[#475569] leading-relaxed">
            2240 Chino Roces Avenue Extension, Makati Flagship Showroom · Cebu Custom Millwork Foundry
          </p>
          <p class="font-mono-tech text-[11px] text-[#0095FF] font-medium">
            Direct Owner Messenger Offers · Custom Furniture Designs · 15-Year Joinery Guarantee
          </p>
        </div>

        <div class="space-y-2 text-xs">
          <p class="font-mono-tech text-[11px] uppercase tracking-widest text-[#0D1015] font-semibold">Shop by Room</p>
          <ul class="space-y-1.5">
            <li><button type="button" data-action="filter-category" data-category="living" class="hover:text-[#0095FF] cursor-pointer">Living &amp; Lounge</button></li>
            <li><button type="button" data-action="filter-category" data-category="dining" class="hover:text-[#0095FF] cursor-pointer">Dining &amp; Tables</button></li>
            <li><button type="button" data-action="filter-category" data-category="bedroom" class="hover:text-[#0095FF] cursor-pointer">Bedroom Sanctuary</button></li>
            <li><button type="button" data-action="filter-category" data-category="office" class="hover:text-[#0095FF] cursor-pointer">Study &amp; Credenzas</button></li>
          </ul>
        </div>

        <div class="space-y-2 text-xs">
          <p class="font-mono-tech text-[11px] uppercase tracking-widest text-[#0D1015] font-semibold">Admin Messenger &amp; Vouchers</p>
          <ul class="space-y-1.5">
            <li><button type="button" data-action="open-messenger" data-mode="make-offer" class="hover:text-[#0095FF] cursor-pointer">Make Offer in Admin Messenger</button></li>
            <li><button type="button" data-action="open-messenger" data-mode="custom-design" class="hover:text-[#0095FF] cursor-pointer">Pass Own Design in Admin Messenger</button></li>
            <li><button type="button" data-action="switch-view" data-view="user-dashboard" class="hover:text-[#0095FF] cursor-pointer">Track Order &amp; Messenger Vouchers</button></li>
          </ul>
        </div>

        <div class="space-y-2 text-xs">
          <p class="font-mono-tech text-[11px] uppercase tracking-widest text-[#0D1015] font-semibold">Atelier Administration</p>
          <ul class="space-y-1.5">
            <li><button type="button" data-action="switch-view" data-view="admin-dashboard" class="hover:text-[#0095FF] cursor-pointer">Left-Sidebar Admin Record Console</button></li>
            <li class="text-[#64748B]">Showroom Hours: Mon–Sun 10:00 AM – 8:00 PM</li>
            <li class="text-[#64748B]">Messenger: m.me/lilliarowenafurniture.admin</li>
          </ul>
        </div>
      </div>
    </footer>
  `;
}

export function renderApp() {
  const root = document.getElementById('app');
  if (!root) return;

  let mainViewHtml = '';
  if (state.activeView === 'home') {
    mainViewHtml = renderHomepageView();
  } else if (state.activeView === 'user-dashboard') {
    mainViewHtml = renderUserDashboardView();
  } else if (state.activeView === 'admin-dashboard') {
    mainViewHtml = renderAdminDashboardView();
  } else if (state.activeView === 'login') {
    mainViewHtml = renderLoginView();
  }

  root.innerHTML = `
    <div class="min-h-screen flex flex-col bg-white text-[#0D1015]">
      ${renderTopHeader()}
      <main class="flex-1">
        ${mainViewHtml}
      </main>
      ${renderFooter()}
      ${renderDetailModal()}
      ${renderOrderDrawer()}
      ${renderMessengerModal()}
      ${renderAdminProductModal()}
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  const root = document.getElementById('app');
  if (!root) return;

  const topSearch = document.getElementById('top-nav-search');
  if (topSearch) {
    topSearch.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (state.activeView !== 'home') state.activeView = 'home';
      renderApp();
      const input = document.getElementById('top-nav-search');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  const catalogSearch = document.getElementById('catalog-search-input');
  if (catalogSearch) {
    catalogSearch.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderApp();
      const input = document.getElementById('catalog-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  const adminCatalogSearch = document.getElementById('admin-catalog-search');
  if (adminCatalogSearch) {
    adminCatalogSearch.addEventListener('input', (e) => {
      state.adminCatalogSearch = e.target.value;
      renderApp();
      const input = document.getElementById('admin-catalog-search');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  const sortSelect = document.getElementById('catalog-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderApp();
    });
  }

  const msgProdSelect = document.getElementById('messenger-product-select');
  if (msgProdSelect) {
    msgProdSelect.addEventListener('change', (e) => {
      state.messengerProductId = e.target.value;
      const found = state.catalog.find((p) => p.id === state.messengerProductId);
      if (found) {
        const defaultCol = found.colorVariants?.[0]?.name || found.defaultFinish;
        state.messengerSelectedColor = defaultCol;
        const vp = computeVariantPricing(found, defaultCol);
        state.messengerProposedPrice = String(Math.round(vp.effectivePrice * 0.9));
      }
      renderApp();
    });
  }

  const msgColSelect = document.getElementById('messenger-color-select');
  if (msgColSelect) {
    msgColSelect.addEventListener('change', (e) => {
      state.messengerSelectedColor = e.target.value;
      const found = state.catalog.find((p) => p.id === state.messengerProductId);
      if (found) {
        const vp = computeVariantPricing(found, state.messengerSelectedColor);
        state.messengerProposedPrice = String(Math.round(vp.effectivePrice * 0.9));
      }
      renderApp();
    });
  }

  const msgOfferInput = document.getElementById('messenger-offer-input');
  if (msgOfferInput) {
    msgOfferInput.addEventListener('input', (e) => {
      state.messengerProposedPrice = e.target.value;
      renderApp();
      const input = document.getElementById('messenger-offer-input');
      if (input) input.focus();
    });
  }

  const prodForm = document.getElementById('admin-product-form');
  if (prodForm) {
    const syncProductFormInputs = () => {
      const isCust = document.getElementById('form-is-custom-design');
      const custEmail = document.getElementById('form-custom-email');
      const nameEl = document.getElementById('form-product-name');
      const skuEl = document.getElementById('form-product-sku');
      const catEl = document.getElementById('form-product-category');
      const priceEl = document.getElementById('form-product-price');
      const discEl = document.getElementById('form-product-discount');
      const dimEl = document.getElementById('form-product-dimensions');
      const stockEl = document.getElementById('form-product-stock');
      const leadEl = document.getElementById('form-product-lead');
      const descEl = document.getElementById('form-product-description');

      if (isCust) state.productForm.isCustomClientDesign = isCust.checked;
      if (custEmail) state.productForm.customClientEmail = custEmail.value;
      if (nameEl) state.productForm.name = nameEl.value;
      if (skuEl) state.productForm.sku = skuEl.value;
      if (catEl) state.productForm.categoryId = catEl.value;
      if (priceEl) state.productForm.price = priceEl.value;
      if (discEl) state.productForm.discountPercent = discEl.value;
      if (dimEl) state.productForm.dimensions = dimEl.value;
      if (stockEl) state.productForm.inStockCount = stockEl.value;
      if (leadEl) state.productForm.leadTimeWeeks = leadEl.value;
      if (descEl) state.productForm.description = descEl.value;

      document.querySelectorAll('[data-color-idx]').forEach((el) => {
        const idx = Number(el.getAttribute('data-color-idx'));
        const field = el.getAttribute('data-field');
        if (state.productForm.colorVariants[idx] && field) {
          state.productForm.colorVariants[idx][field] =
            field === 'priceDelta' ? Number(el.value || 0) : el.value;
        }
      });
    };

    prodForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      syncProductFormInputs();
      const validation = validateNewFurnitureInput(state.productForm);
      if (!validation.valid) {
        state.productFormError = validation.errorMessage;
        renderApp();
        return;
      }

      const categoryMap = {
        living: { name: 'Living & Lounge', img: '/assets/images/category_living_lounge.jpg' },
        dining: { name: 'Dining & Tables', img: '/assets/images/category_dining_tables.jpg' },
        bedroom: { name: 'Bedroom Sanctuary', img: '/assets/images/category_bedroom_sanctuary.jpg' },
        office: { name: 'Study & Credenzas', img: '/assets/images/category_office_storage.jpg' },
      };
      const catMeta = categoryMap[state.productForm.categoryId] || categoryMap.living;
      const basePrice = Math.round(Number(state.productForm.price));
      const discPct = Math.max(0, Math.min(90, Math.round(Number(state.productForm.discountPercent) || 0)));
      const effPrice = Math.round(basePrice * (1 - discPct / 100));

      const newProduct = {
        id: state.editingProductId || `furn-custom-${Date.now()}`,
        sku: state.productForm.sku.trim().toUpperCase(),
        name: state.productForm.name.trim(),
        categoryId: state.productForm.categoryId,
        categoryName: catMeta.name,
        price: basePrice,
        discountPercent: discPct,
        effectivePrice: effPrice,
        dimensions: state.productForm.dimensions.trim(),
        leadTimeWeeks: Math.max(1, Number(state.productForm.leadTimeWeeks) || 4),
        inStockCount: Math.max(0, Number(state.productForm.inStockCount) || 1),
        defaultFinish: state.productForm.colorVariants[0]?.name || 'Natural Walnut',
        finishes: state.productForm.colorVariants.map((c) => c.name),
        colorVariants: state.productForm.colorVariants,
        description:
          state.productForm.description.trim() ||
          'Custom client furniture design sent via Admin Messenger and added to the showroom catalog.',
        craftsmanshipNote: 'Custom-milled to architectural specifications.',
        image: catMeta.img,
        isCustomClientDesign: state.productForm.isCustomClientDesign,
        customClientEmail: state.productForm.isCustomClientDesign
          ? state.productForm.customClientEmail
          : null,
      };

      const existingIdx = state.catalog.findIndex((i) => i.id === newProduct.id);
      if (existingIdx >= 0) {
        state.catalog[existingIdx] = newProduct;
      } else {
        state.catalog.unshift(newProduct);
      }
      state.selectedColorByProduct[newProduct.id] = newProduct.defaultFinish;
      state.isProductModalOpen = false;
      state.adminBannerMessage = `Saved "${newProduct.name}" (${newProduct.sku}) with ${newProduct.colorVariants.length} color price tiers to the catalog.`;

      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      }).catch(() => {});

      renderApp();
    });
  }

  const issueVoucherForm = document.getElementById('admin-issue-voucher-form');
  if (issueVoucherForm) {
    issueVoucherForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(issueVoucherForm);
      const customerEmail = String(fd.get('customerEmail') || '').trim();
      const furnitureId = String(fd.get('furnitureId') || '');
      const discountAmount = Math.round(Number(fd.get('discountAmount') || 250));
      const prod = state.catalog.find((i) => i.id === furnitureId) || state.catalog[0];

      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const cleanName = (customerEmail.split('@')[0] || 'CLIENT')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 6)
        .toUpperCase();
      const code = `VCH-${cleanName}-${discountAmount}-${randomSuffix}`;
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
        issuedByAdmin: 'Lillia Vance (Owner)',
        createdAt: new Date().toISOString().slice(0, 10),
        expiryDate: '2026-12-31',
        messengerPlaceholderLink: `${ADMIN_MESSENGER_PLACEHOLDER_URL}?voucher=${encodeURIComponent(code)}&client=${encodeURIComponent(customerEmail)}&sku=${encodeURIComponent(prod.sku)}`,
      };

      state.vouchers.unshift(newVoucher);
      state.adminBannerMessage = `Generated Messenger Voucher ${code} (-${formatUsd(discountAmount)}) exclusively for ${customerEmail} on ${prod.name}.`;

      fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVoucher),
      }).catch(() => {});

      renderApp();
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(loginForm);
      const email = String(fd.get('email') || '');
      const accessCode = String(fd.get('accessCode') || '');
      const result = validateLoginCredentials(email, accessCode, state.loginRole);
      if (!result.valid) {
        state.loginError = result.errorMessage;
        renderApp();
        return;
      }
      state.currentRole = result.role;
      state.currentUserName = result.displayName;
      state.currentUserEmail = email.trim();
      state.loginError = null;
      state.activeView = result.role === 'admin' ? 'admin-dashboard' : 'user-dashboard';
      renderApp();
    });
  }
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.getAttribute('data-action');

  if (action === 'dismiss-promo') {
    state.promoBannerVisible = false;
    renderApp();
  } else if (action === 'go-home') {
    e.preventDefault();
    state.activeView = 'home';
    state.selectedCategoryFilter = 'all';
    state.searchQuery = '';
    renderApp();
  } else if (action === 'switch-view') {
    state.activeView = btn.getAttribute('data-view') || 'home';
    window.scrollTo({ top: 0, behavior: 'instant' });
    renderApp();
  } else if (action === 'filter-category') {
    state.selectedCategoryFilter = btn.getAttribute('data-category') || 'all';
    state.activeView = 'home';
    renderApp();
  } else if (action === 'quick-search') {
    state.searchQuery = btn.getAttribute('data-query') || '';
    renderApp();
  } else if (action === 'select-card-color') {
    const itemId = btn.getAttribute('data-item-id');
    const colorName = btn.getAttribute('data-color-name');
    if (itemId && colorName) {
      state.selectedColorByProduct[itemId] = colorName;
      renderApp();
    }
  } else if (action === 'open-category-modal') {
    const catId = btn.getAttribute('data-category-id');
    const cat = state.categories.find((c) => c.id === catId) || state.categories[0];
    const firstItem = state.catalog.find((i) => i.categoryId === cat.id) || state.catalog[0];
    state.modalCategory = cat;
    state.modalSelectedItem = firstItem;
    state.modalSelectedColor = getSelectedColorForProduct(firstItem);
    state.isDetailModalOpen = true;
    renderApp();
  } else if (action === 'open-item-modal') {
    const itemId = btn.getAttribute('data-item-id');
    const item = state.catalog.find((i) => i.id === itemId);
    if (item) {
      state.modalSelectedItem = item;
      state.modalSelectedColor = getSelectedColorForProduct(item);
      state.isDetailModalOpen = true;
      renderApp();
    }
  } else if (action === 'select-modal-color') {
    state.modalSelectedColor = btn.getAttribute('data-color-name') || '';
    if (state.modalSelectedItem) {
      state.selectedColorByProduct[state.modalSelectedItem.id] = state.modalSelectedColor;
    }
    renderApp();
  } else if (action === 'close-detail-modal') {
    state.isDetailModalOpen = false;
    renderApp();
  } else if (action === 'open-messenger') {
    const mode = btn.getAttribute('data-mode') || 'make-offer';
    const itemId = btn.getAttribute('data-item-id') || state.catalog[0]?.id;
    const colorName = btn.getAttribute('data-color-name');
    const item = state.catalog.find((i) => i.id === itemId) || state.catalog[0];
    const activeColor = colorName || getSelectedColorForProduct(item);
    const vp = computeVariantPricing(item, activeColor);

    state.messengerMode = mode;
    state.messengerProductId = item.id;
    state.messengerSelectedColor = vp.colorName;
    state.messengerProposedPrice = String(Math.round(vp.effectivePrice * 0.9));
    state.isDetailModalOpen = false;
    state.isMessengerModalOpen = true;
    renderApp();
  } else if (action === 'set-messenger-mode') {
    state.messengerMode = btn.getAttribute('data-mode') || 'make-offer';
    renderApp();
  } else if (action === 'close-messenger-modal') {
    state.isMessengerModalOpen = false;
    renderApp();
  } else if (action === 'messenger-to-admin') {
    state.isMessengerModalOpen = false;
    state.activeView = 'admin-dashboard';
    renderApp();
  } else if (action === 'add-to-cart') {
    const itemId = btn.getAttribute('data-item-id');
    const colorName = btn.getAttribute('data-color-name');
    const item = state.catalog.find((i) => i.id === itemId);
    if (item) {
      const finish = colorName || getSelectedColorForProduct(item);
      const existing = state.cartItems.find(
        (c) => c.furniture.id === item.id && c.finish === finish
      );
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cartItems.push({ furniture: item, finish, quantity: 1 });
      }
      state.isDetailModalOpen = false;
      state.isOrderDrawerOpen = true;
      renderApp();
    }
  } else if (action === 'open-cart-drawer') {
    state.isOrderDrawerOpen = true;
    renderApp();
  } else if (action === 'close-cart-drawer') {
    state.isOrderDrawerOpen = false;
    state.checkoutMessage = null;
    renderApp();
  } else if (action === 'remove-cart-item') {
    const idx = Number(btn.getAttribute('data-idx'));
    state.cartItems.splice(idx, 1);
    renderApp();
  } else if (action === 'apply-cart-voucher') {
    const input = document.getElementById('cart-voucher-input');
    if (input) state.voucherInput = input.value;
    const cartProductIds = state.cartItems.map((c) => c.furniture.id);
    const check = validateVoucherForOrder(
      state.vouchers,
      state.voucherInput,
      state.currentUserEmail,
      cartProductIds
    );
    if (!check.valid) {
      state.voucherError = check.errorMessage;
      state.appliedVoucher = null;
    } else {
      state.voucherError = null;
      state.appliedVoucher = check.voucher;
    }
    renderApp();
  } else if (action === 'redeem-voucher-to-cart') {
    const code = btn.getAttribute('data-voucher-code');
    const vch = state.vouchers.find((v) => v.code === code);
    if (vch) {
      const prod = state.catalog.find((i) => i.id === vch.furnitureId);
      if (prod) {
        const exists = state.cartItems.some((c) => c.furniture.id === prod.id);
        if (!exists) {
          state.cartItems.push({
            furniture: prod,
            finish: getSelectedColorForProduct(prod),
            quantity: 1,
          });
        }
      }
      state.voucherInput = vch.code;
      state.appliedVoucher = vch;
      state.voucherError = null;
      state.isMessengerModalOpen = false;
      state.isOrderDrawerOpen = true;
      renderApp();
    }
  } else if (action === 'submit-order') {
    if (state.cartItems.length === 0) return;
    const first = state.cartItems[0];
    const vp = computeVariantPricing(first.furniture, first.finish);
    const pricing = calculateOrderPricing(
      state.cartItems.map((c) => ({
        ...c,
        unitPrice: computeVariantPricing(c.furniture, c.finish).effectivePrice,
      })),
      state.appliedVoucher ? state.appliedVoucher.discountAmount : 0
    );

    const newOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: state.currentUserName,
      clientEmail: state.currentUserEmail,
      clientCompany: 'Private Residence',
      furnitureId: first.furniture.id,
      furnitureName: first.furniture.name,
      sku: first.furniture.sku,
      categoryName: first.furniture.categoryName,
      selectedFinish: first.finish,
      customDimensions: first.furniture.dimensions,
      quantity: first.quantity,
      unitPrice: vp.effectivePrice,
      totalAmount: pricing.totalAmount,
      depositPaid: pricing.depositDueNow,
      status: 'Inquiry Received',
      paymentStatus: '50% Deposit Paid',
      orderDate: new Date().toISOString().slice(0, 10),
      estimatedDelivery: '2026-12-15',
      deliveryAddress: 'Suite 400, 118 Mercer St, SoHo, NY',
      assignedCraftsperson: 'Master Joiner Mateo Cruz',
      notes: 'Commission placed with color-tiered pricing.',
      appliedVoucherCode: state.appliedVoucher ? state.appliedVoucher.code : null,
      voucherDiscountAmount: pricing.voucherDiscountAmount,
    };

    state.orders.unshift(newOrder);
    if (state.appliedVoucher) {
      state.appliedVoucher.status = 'Used';
    }
    state.checkoutMessage = `Commission ${newOrder.orderNumber} confirmed! View live progress in your Client Portal.`;
    state.appliedVoucher = null;
    state.voucherInput = '';
    renderApp();
  } else if (action === 'switch-client-tab') {
    state.clientActiveTab = btn.getAttribute('data-tab') || 'orders';
    renderApp();
  } else if (action === 'switch-admin-module') {
    state.adminActiveModule = btn.getAttribute('data-module') || 'catalog';
    renderApp();
  } else if (action === 'clear-admin-banner') {
    state.adminBannerMessage = null;
    renderApp();
  } else if (action === 'open-add-custom-design-modal') {
    state.editingProductId = null;
    state.productFormError = null;
    state.productForm = {
      isCustomClientDesign: true,
      customClientEmail: 'rowena.vance@vancearchitects.com',
      name: 'Bespoke Client Messenger Walnut & Travertine Table',
      sku: `LR-CUST-${Math.floor(100 + Math.random() * 899)}`,
      categoryId: 'dining',
      price: '3950',
      discountPercent: '0',
      dimensions: '260cm L × 110cm W × 75cm H',
      leadTimeWeeks: '5',
      inStockCount: '2',
      description:
        'Custom client furniture design sent via Admin Messenger. Milled to bespoke architectural dimensions with selectable timber and stone color tiers.',
      colorVariants: [
        { name: 'Hand-Rubbed Natural Walnut (Base)', hex: '#5C3A21', priceDelta: 0 },
        { name: 'Smoked European White Oak', hex: '#9C8265', priceDelta: 180 },
        { name: 'Book-Matched Walnut + Travertine Plinth', hex: '#D8CABB', priceDelta: 420 },
      ],
    };
    state.isProductModalOpen = true;
    renderApp();
  } else if (action === 'open-add-product-modal') {
    state.editingProductId = null;
    state.productFormError = null;
    state.productForm = {
      isCustomClientDesign: false,
      customClientEmail: '',
      name: '',
      sku: `LR-LV-${Math.floor(100 + Math.random() * 899)}`,
      categoryId: 'living',
      price: '2400',
      discountPercent: '10',
      dimensions: '210cm W × 95cm D × 75cm H',
      leadTimeWeeks: '4',
      inStockCount: '5',
      description: '',
      colorVariants: [
        { name: 'Natural White Oak / Bouclé (Base)', hex: '#DECBB1', priceDelta: 0 },
        { name: 'American Black Walnut', hex: '#5C3A21', priceDelta: 240 },
        { name: 'Ebonized Ash / Mohair Velvet', hex: '#243B55', priceDelta: 390 },
      ],
    };
    state.isProductModalOpen = true;
    renderApp();
  } else if (action === 'open-edit-product-modal') {
    const itemId = btn.getAttribute('data-item-id');
    const item = state.catalog.find((i) => i.id === itemId);
    if (item) {
      state.editingProductId = item.id;
      state.productFormError = null;
      state.productForm = {
        isCustomClientDesign: Boolean(item.isCustomClientDesign),
        customClientEmail: item.customClientEmail || 'rowena.vance@vancearchitects.com',
        name: item.name,
        sku: item.sku,
        categoryId: item.categoryId,
        price: String(item.price),
        discountPercent: String(item.discountPercent || 0),
        dimensions: item.dimensions,
        leadTimeWeeks: String(item.leadTimeWeeks),
        inStockCount: String(item.inStockCount),
        description: item.description,
        colorVariants: (item.colorVariants || []).map((c) => ({ ...c })),
      };
      state.isProductModalOpen = true;
      renderApp();
    }
  } else if (action === 'add-color-variant-row') {
    state.productForm.colorVariants.push({
      name: `Custom Color Tier ${state.productForm.colorVariants.length + 1}`,
      hex: '#3B82F6',
      priceDelta: 150,
    });
    renderApp();
  } else if (action === 'close-product-modal') {
    state.isProductModalOpen = false;
    renderApp();
  } else if (action === 'set-login-role') {
    state.loginRole = btn.getAttribute('data-role') || 'client';
    if (state.loginRole === 'admin') {
      state.loginEmail = 'lillia@lilliarowena.com';
      state.loginAccessCode = 'ADMIN-2026';
    } else {
      state.loginEmail = 'rowena.vance@vancearchitects.com';
      state.loginAccessCode = 'LR-8841';
    }
    renderApp();
  }
});

// Boot application
loadInitialState();
