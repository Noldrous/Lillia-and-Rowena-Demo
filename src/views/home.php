<?php
/**
 * Welcome / Logged-In Portal View Template (views/home.php)
 * Rendered by App\Controllers\HomeControllers::home() via home.php in XAMPP.
 *
 * @var array<string, mixed>|null $user
 */
$sessionPayload = [
    'email' => $user['email'] ?? (($_GET['role'] ?? 'client') === 'admin' ? 'admin@lilliarowena.com' : 'rowena.vance@vancearchitects.com'),
    'name'  => $user['fullName'] ?? ($user['name'] ?? (($_GET['role'] ?? 'client') === 'admin' ? 'Lillia Mercier (Business Owner)' : 'Rowena Vance')),
    'role'  => strcasecmp((string) ($user['role'] ?? ($_GET['role'] ?? 'client')), 'Admin') === 0 || ($_GET['role'] ?? '') === 'admin' ? 'admin' : 'client',
];
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <base href="../" />
    <title>Lillia and Rowena Furniture — Account Dashboard</title>
    <meta name="description" content="Lillia and Rowena Furniture — Customer Account Dashboard and Admin Management Console." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="assets/css/style.css" />
    <script>
      window.__SERVER_SESSION_USER__ = <?= json_encode($sessionPayload, JSON_UNESCAPED_SLASHES) ?>;
    </script>
  </head>
  <body class="bg-[#F4F9FF] text-[#0F172A] antialiased selection:bg-[#0095FF] selection:text-white min-h-screen flex flex-col">
    <!-- Dedicated Logged-In Header (Shown ONLY for Customer Account Dashboard) -->
    <header id="portal-top-header" class="sticky top-0 z-40 bg-[#0B0F17] text-white border-b border-slate-800 shadow-sm">
      <div class="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <a href="index.html" class="flex items-center gap-3 group">
            <div class="w-9 h-9 rounded-lg bg-[#0095FF] text-white flex items-center justify-center font-serif-display text-sm font-bold">
              LR
            </div>
            <div>
              <span class="font-serif-display text-lg font-bold tracking-tight text-white block leading-none">
                Lillia and Rowena Furniture
              </span>
              <span id="portal-header-subtitle" class="font-mono-tech text-[10px] uppercase tracking-widest text-[#BCE3FF] block mt-1">
                My Account Dashboard
              </span>
            </div>
          </a>
        </div>

        <!-- Logged-In Customer Navigation: Shop, My Account, My Orders, Profile & Log Out -->
        <div class="flex items-center gap-2 sm:gap-3">
          <a
            href="index.html"
            class="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            ← Shop Furniture
          </a>
          <button
            type="button"
            data-switch-client-tab="orders"
            class="hidden md:inline-flex px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            My Orders
          </button>
          <button
            type="button"
            data-switch-client-tab="home"
            aria-label="My Account"
            title="My Account"
            class="w-9 h-9 rounded-xl bg-slate-800 hover:bg-[#0095FF] text-[#BCE3FF] hover:text-white border border-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 overflow-hidden"
          >
            <img
              id="portal-header-avatar-img"
              src=""
              alt="Customer profile picture"
              class="hidden w-full h-full object-cover"
            />
            <svg id="portal-header-default-icon" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
          <div class="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span id="portal-user-badge" class="text-xs font-semibold text-slate-200">Signed In</span>
          </div>
          <a
            href="src/logout.php"
            id="portal-logout-btn"
            class="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            Log Out
          </a>
        </div>
      </div>
    </header>

    <!-- Main Dashboard Workspace -->
    <main id="portal-main-workspace" class="flex-1">
      <div id="client-portal-wrapper" class="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 sm:py-10">
        <!-- =================================================================
             1. USER DASHBOARD WITH LEFT SIDEBAR NAVIGATION (Shown ONLY when a Customer logs in)
                Left Sidebar Buttons: Home · Orders · Address/Contact · Transactions · Cart · Vouchers
             ================================================================= -->
        <section id="client-portal-view" class="hidden">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <!-- Left Navigation Sidebar (3 cols) -->
            <aside class="lg:col-span-3 bg-white rounded-3xl border border-[#BCE3FF] p-5 sm:p-6 space-y-6 shadow-2xs lg:sticky lg:top-24">
              <!-- Customer Profile Summary -->
              <div class="flex items-center gap-3.5 pb-5 border-b border-[#E2E8F0]">
                <button
                  type="button"
                  data-switch-client-tab="address"
                  title="Change Profile Picture"
                  class="relative w-12 h-12 rounded-2xl bg-[#0B0F17] text-[#BCE3FF] font-serif-display text-base font-bold flex items-center justify-center shrink-0 overflow-hidden border border-[#BCE3FF]/40 cursor-pointer group"
                >
                  <img
                    id="client-sidebar-avatar-img"
                    src=""
                    alt="Customer profile picture"
                    class="hidden w-full h-full object-cover"
                  />
                  <span id="client-sidebar-initials">RV</span>
                </button>
                <div class="min-w-0 flex-1">
                  <p id="client-sidebar-name" class="font-serif-display text-base font-bold text-[#0D1015] truncate">
                    Rowena Vance
                  </p>
                  <p id="client-sidebar-email" class="font-mono-tech text-xs text-[#64748B] truncate">
                    rowena.vance@vancearchitects.com
                  </p>
                  <button
                    type="button"
                    data-switch-client-tab="address"
                    class="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0095FF] hover:text-[#0077CC] cursor-pointer"
                  >
                    <span>Change Profile Picture</span>
                  </button>
                </div>
              </div>

              <!-- 6 Requested Left-Sidebar Navigation Buttons -->
              <nav aria-label="Customer Dashboard Navigation" class="space-y-1.5">
                <button
                  type="button"
                  data-client-tab="home"
                  class="client-tab-btn w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer bg-[#0095FF] text-white shadow-xs"
                >
                  <span class="flex items-center gap-3">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span>Home</span>
                  </span>
                </button>

                <button
                  type="button"
                  data-client-tab="orders"
                  class="client-tab-btn w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer bg-[#F8FBFF] text-[#0D1015] hover:bg-[#EBF6FF]"
                >
                  <span class="flex items-center gap-3">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                    <span>Orders</span>
                  </span>
                  <span id="sidebar-badge-orders" class="font-mono-tech text-xs opacity-80">2</span>
                </button>

                <button
                  type="button"
                  data-client-tab="address"
                  class="client-tab-btn w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer bg-[#F8FBFF] text-[#0D1015] hover:bg-[#EBF6FF]"
                >
                  <span class="flex items-center gap-3">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>Address/Contact</span>
                  </span>
                </button>

                <button
                  type="button"
                  data-client-tab="transactions"
                  class="client-tab-btn w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer bg-[#F8FBFF] text-[#0D1015] hover:bg-[#EBF6FF]"
                >
                  <span class="flex items-center gap-3">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                    <span>Transactions</span>
                  </span>
                  <span id="sidebar-badge-transactions" class="font-mono-tech text-xs opacity-80">0</span>
                </button>

                <button
                  type="button"
                  data-client-tab="cart"
                  class="client-tab-btn w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer bg-[#F8FBFF] text-[#0D1015] hover:bg-[#EBF6FF]"
                >
                  <span class="flex items-center gap-3">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                    <span>Cart</span>
                  </span>
                  <span id="sidebar-badge-cart" class="font-mono-tech text-xs opacity-80">0</span>
                </button>

                <button
                  type="button"
                  data-client-tab="vouchers"
                  class="client-tab-btn w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left text-xs sm:text-sm font-semibold transition-all cursor-pointer bg-[#F8FBFF] text-[#0D1015] hover:bg-[#EBF6FF]"
                >
                  <span class="flex items-center gap-3">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
                    <span>Vouchers</span>
                  </span>
                  <span id="sidebar-badge-vouchers" class="font-mono-tech text-xs opacity-80">2</span>
                </button>
              </nav>

              <!-- Direct Custom Design / Messenger Help Box -->
              <div class="rounded-2xl bg-[#0B0F17] text-white p-4 space-y-3 border border-slate-800">
                <p class="font-serif-display text-sm font-bold text-white">
                  Need a Custom Furniture Design?
                </p>
                <p class="text-xs text-slate-300 leading-relaxed">
                  Message our workshop owner directly on Messenger to discuss a custom furniture design.
                </p>
                <button
                  type="button"
                  data-request-design-trigger="true"
                  class="block w-full py-2.5 px-3 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold text-center transition-colors cursor-pointer"
                >
                  Request a Design ↗
                </button>
              </div>
            </aside>

            <!-- Right Main Content Area (9 cols) -->
            <div class="lg:col-span-9 space-y-8">
              <!-- Feedback Toast Banner -->
              <div
                id="client-action-banner"
                class="hidden p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-semibold"
              ></div>

              <!-- TAB 1: HOME -->
              <div id="client-tab-home" class="client-tab-panel space-y-8">
                <div class="rounded-3xl bg-[#0B0F17] text-white p-6 sm:p-8 border border-slate-800 shadow-lg relative overflow-hidden">
                  <div
                    class="absolute inset-0 opacity-25 pointer-events-none"
                    style="background-image: radial-gradient(circle at 85% 20%, rgba(0, 149, 255, 0.4), transparent 55%);"
                  ></div>
                  <div class="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div class="flex items-start sm:items-center gap-4">
                      <button
                        type="button"
                        data-switch-client-tab="address"
                        title="Edit Profile Picture"
                        class="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-[#0095FF] text-[#BCE3FF] font-serif-display text-xl font-bold flex items-center justify-center shrink-0 overflow-hidden cursor-pointer"
                      >
                        <img
                          id="client-welcome-avatar-img"
                          src=""
                          alt="Customer profile picture"
                          class="hidden w-full h-full object-cover"
                        />
                        <span id="client-welcome-avatar-initials">RV</span>
                      </button>
                      <div class="space-y-2">
                        <p class="text-xs font-semibold text-[#BCE3FF]">
                          Customer Account Overview
                        </p>
                        <h1 class="font-serif-display text-3xl sm:text-4xl font-bold text-white">
                          Welcome back, <span id="client-welcome-name">Rowena Vance</span>!
                        </h1>
                        <p class="text-sm text-slate-300 max-w-xl">
                          Signed in as <span id="client-welcome-email" class="font-mono-tech text-[#BCE3FF]">rowena.vance@vancearchitects.com</span>. Manage your furniture orders, shipping address, transactions, shopping cart, and personal Messenger vouchers from the menu on the left.
                        </p>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-3 shrink-0">
                      <a
                        href="index.html#catalog-section"
                        class="px-5 py-3 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs whitespace-nowrap"
                      >
                        Browse Showroom →
                      </a>
                      <a
                        href="https://www.messenger.com/t/100000505712325"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="px-5 py-3 rounded-xl bg-[#BCE3FF] hover:bg-white text-[#0D1015] text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
                      >
                        Request a Custom Design ↗
                      </a>
                    </div>
                  </div>
                </div>

                <!-- 3 At-a-Glance Summary Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-white rounded-2xl border border-[#BCE3FF] p-5 flex flex-col justify-between gap-3 shadow-2xs">
                    <div>
                      <p class="text-xs font-medium text-[#64748B]">Active Orders</p>
                      <p id="user-stat-orders" class="font-serif-display text-2xl font-bold text-[#0D1015] mt-1">2 Active Orders</p>
                    </div>
                    <button
                      type="button"
                      data-switch-client-tab="orders"
                      class="text-left text-xs font-semibold text-[#0095FF] hover:underline cursor-pointer"
                    >
                      Track Orders →
                    </button>
                  </div>

                  <div class="bg-white rounded-2xl border border-[#BCE3FF] p-5 flex flex-col justify-between gap-3 shadow-2xs">
                    <div>
                      <p class="text-xs font-medium text-[#64748B]">Messenger Vouchers</p>
                      <p id="user-stat-vouchers" class="font-serif-display text-2xl font-bold text-[#0095FF] mt-1">2 Ready to Use</p>
                    </div>
                    <button
                      type="button"
                      data-switch-client-tab="vouchers"
                      class="text-left text-xs font-semibold text-[#0095FF] hover:underline cursor-pointer"
                    >
                      Open Voucher Wallet →
                    </button>
                  </div>

                  <div class="bg-white rounded-2xl border border-[#BCE3FF] p-5 flex flex-col justify-between gap-3 shadow-2xs">
                    <div>
                      <p class="text-xs font-medium text-[#64748B]">Shopping Cart</p>
                      <p id="user-stat-cart" class="font-serif-display text-2xl font-bold text-[#0D1015] mt-1">0 Items</p>
                    </div>
                    <button
                      type="button"
                      data-switch-client-tab="cart"
                      class="text-left text-xs font-semibold text-[#0095FF] hover:underline cursor-pointer"
                    >
                      Open Cart →
                    </button>
                  </div>
                </div>

                <!-- Home Quick Previews -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div class="lg:col-span-7 bg-white rounded-3xl border border-[#BCE3FF] p-6 space-y-4 shadow-2xs">
                    <div class="flex items-center justify-between">
                      <div>
                        <h2 class="font-serif-display text-xl font-bold text-[#0D1015]">Latest Order Status</h2>
                        <p class="text-xs text-[#475569]">Live production &amp; delivery progress</p>
                      </div>
                      <button
                        type="button"
                        data-switch-client-tab="orders"
                        class="text-xs font-semibold text-[#0095FF] hover:underline cursor-pointer"
                      >
                        All Orders →
                      </button>
                    </div>
                    <div id="client-home-order-preview"></div>
                  </div>

                  <div class="lg:col-span-5 bg-white rounded-3xl border border-[#BCE3FF] p-6 space-y-4 shadow-2xs">
                    <div class="flex items-center justify-between">
                      <div>
                        <h2 class="font-serif-display text-xl font-bold text-[#0D1015]">Delivery Address &amp; Contact</h2>
                        <p class="text-xs text-[#475569]">White-glove shipping destination</p>
                      </div>
                      <button
                        type="button"
                        data-switch-client-tab="address"
                        class="text-xs font-semibold text-[#0095FF] hover:underline cursor-pointer"
                      >
                        Edit Details →
                      </button>
                    </div>
                    <div id="client-home-address-preview" class="space-y-2 text-xs text-[#475569]"></div>
                  </div>
                </div>

                <!-- Live Showroom Catalog & Admin Updates Feed in User Dashboard -->
                <div class="bg-white rounded-3xl border border-[#BCE3FF] p-6 space-y-5 shadow-2xs">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
                    <div>
                      <h2 class="font-serif-display text-xl font-bold text-[#0D1015]">Live Showroom Catalog &amp; Workshop Materials</h2>
                      <p class="text-xs text-[#475569]">
                        Real-time catalog synced with Admin updates (prices, discounts, stock &amp; available workshop materials)
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        data-open-custom-builder="true"
                        class="px-3.5 py-2 rounded-xl bg-[#0B0F17] hover:bg-[#0095FF] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      >
                        + Commission Custom Piece
                      </button>
                      <a
                        href="index.html#catalog-section"
                        class="px-3.5 py-2 rounded-xl bg-[#EBF6FF] hover:bg-[#D8EEFF] text-[#0077CC] text-xs font-semibold transition-colors whitespace-nowrap"
                      >
                        Full Storefront →
                      </a>
                    </div>
                  </div>
                  <div id="client-home-catalog-feed" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"></div>
                </div>
              </div>

              <!-- TAB 2: ORDERS -->
              <div id="client-tab-orders" class="client-tab-panel hidden space-y-6">
                <div class="bg-white rounded-3xl border border-[#BCE3FF] p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <h2 class="font-serif-display text-2xl font-bold text-[#0D1015]">My Furniture Orders</h2>
                    <p class="text-xs text-[#475569] mt-1">
                      Track live workshop production stages, assigned craftspeople, raw materials used, and white-glove delivery updates from the Admin.
                    </p>
                  </div>
                  <div class="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      id="client-toggle-custom-order-btn"
                      class="px-4 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      + Commission Custom Piece
                    </button>
                  </div>
                </div>

                <!-- Interactive Custom Furniture Commission Builder (Synced with Workshop Materials & Admin Orders) -->
                <div id="client-custom-order-card" class="hidden bg-white rounded-3xl border border-[#BCE3FF] p-6 sm:p-8 shadow-2xs space-y-5"></div>

                <div id="client-orders-friendly-list" class="space-y-5"></div>
              </div>

              <!-- TAB 3: ADDRESS/CONTACT -->
              <div id="client-tab-address" class="client-tab-panel hidden space-y-6">
                <div class="bg-white rounded-3xl border border-[#BCE3FF] p-6 sm:p-8 space-y-6 shadow-2xs">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
                    <div>
                      <h2 class="font-serif-display text-2xl font-bold text-[#0D1015]">Address &amp; Contact Information</h2>
                      <p class="text-xs text-[#475569] mt-1">
                        Update your default white-glove delivery address, phone number, and building access notes.
                      </p>
                    </div>
                    <span class="font-mono-tech text-xs text-[#0077CC]">
                      Customer Profile Record
                    </span>
                  </div>

                  <form id="client-address-form" class="space-y-5">
                    <!-- Customer Profile Picture Uploader -->
                    <div class="p-4 sm:p-5 rounded-2xl bg-[#F8FBFF] border border-[#BCE3FF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div class="flex items-center gap-4">
                        <div class="w-16 h-16 rounded-2xl bg-[#0B0F17] text-[#BCE3FF] font-serif-display text-xl font-bold flex items-center justify-center shrink-0 overflow-hidden border border-[#BCE3FF]">
                          <img
                            id="client-profile-avatar-preview"
                            src=""
                            alt="Profile picture preview"
                            class="hidden w-full h-full object-cover"
                          />
                          <span id="client-profile-avatar-initials">RV</span>
                        </div>
                        <div class="space-y-1">
                          <p class="text-sm font-bold text-[#0D1015]">Profile Picture</p>
                          <p class="text-xs text-[#64748B]">
                            Upload a JPG, PNG, or WEBP photo from your device to personalize your account profile.
                          </p>
                          <input id="client-input-avatar" type="hidden" value="" />
                        </div>
                      </div>
                      <div class="flex flex-wrap items-center gap-2.5 shrink-0">
                        <label
                          for="client-profile-avatar-file"
                          class="px-4 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Upload Photo
                        </label>
                        <input
                          id="client-profile-avatar-file"
                          type="file"
                          accept="image/*"
                          class="sr-only"
                        />
                        <button
                          type="button"
                          id="client-profile-avatar-clear-btn"
                          class="px-3.5 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-[#475569] hover:text-rose-600 border border-[#CBD5E1] hover:border-rose-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Remove Photo
                        </button>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label for="client-input-name" class="block text-xs font-bold text-[#0D1015] mb-1.5">Full Name</label>
                        <input
                          id="client-input-name"
                          type="text"
                          required
                          value="Rowena Vance"
                          class="w-full px-4 py-2.5 rounded-xl bg-[#F8FBFF] border border-[#BCE3FF] text-sm text-[#0D1015]"
                        />
                      </div>

                      <div>
                        <label for="client-input-email" class="block text-xs font-bold text-[#0D1015] mb-1.5">Email Address</label>
                        <input
                          id="client-input-email"
                          type="email"
                          required
                          value="rowena.vance@vancearchitects.com"
                          class="w-full px-4 py-2.5 rounded-xl bg-[#F8FBFF] border border-[#BCE3FF] font-mono-tech text-sm text-[#0D1015]"
                        />
                      </div>

                      <div>
                        <label for="client-input-phone" class="block text-xs font-bold text-[#0D1015] mb-1.5">Phone Number</label>
                        <input
                          id="client-input-phone"
                          type="tel"
                          required
                          value="+1 (212) 555-0148"
                          class="w-full px-4 py-2.5 rounded-xl bg-[#F8FBFF] border border-[#BCE3FF] font-mono-tech text-sm text-[#0D1015]"
                        />
                      </div>

                      <div>
                        <label for="client-input-city" class="block text-xs font-bold text-[#0D1015] mb-1.5">City / State / Postal Code</label>
                        <input
                          id="client-input-city"
                          type="text"
                          required
                          value="New York, NY 10013"
                          class="w-full px-4 py-2.5 rounded-xl bg-[#F8FBFF] border border-[#BCE3FF] text-sm text-[#0D1015]"
                        />
                      </div>
                    </div>

                    <div>
                      <label for="client-input-address" class="block text-xs font-bold text-[#0D1015] mb-1.5">Street Address &amp; Suite / Penthouse</label>
                      <input
                        id="client-input-address"
                        type="text"
                        required
                        value="Suite 400, 118 Mercer St, SoHo"
                        class="w-full px-4 py-2.5 rounded-xl bg-[#F8FBFF] border border-[#BCE3FF] text-sm text-[#0D1015]"
                      />
                    </div>

                    <div>
                      <label for="client-input-notes" class="block text-xs font-bold text-[#0D1015] mb-1.5">White-Glove Delivery &amp; Building Access Instructions</label>
                      <textarea
                        id="client-input-notes"
                        rows="3"
                        class="w-full px-4 py-2.5 rounded-xl bg-[#F8FBFF] border border-[#BCE3FF] text-sm text-[#0D1015]"
                      >Freight elevator available Mon–Fri 9:00 AM – 5:00 PM. Please call 30 minutes before arrival.</textarea>
                    </div>

                    <div class="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <p class="text-xs text-[#64748B]">
                        Need to change an address for an order already in transit? <a href="https://www.messenger.com/t/100000505712325" target="_blank" rel="noopener noreferrer" class="text-[#0095FF] font-semibold hover:underline">Message us on Messenger ↗</a>
                      </p>
                      <button
                        type="submit"
                        class="px-6 py-3 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                      >
                        Save Address &amp; Contact
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <!-- TAB 4: TRANSACTIONS -->
              <div id="client-tab-transactions" class="client-tab-panel hidden space-y-6">
                <div class="bg-white rounded-3xl border border-[#BCE3FF] p-6 sm:p-8 space-y-6 shadow-2xs">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
                    <div>
                      <h2 class="font-serif-display text-2xl font-bold text-[#0D1015]">Completed Transactions</h2>
                      <p class="text-xs text-[#475569] mt-1">
                        Official record of your completed furniture orders confirmed by the Admin.
                      </p>
                    </div>
                    <div class="text-left sm:text-right">
                      <p class="text-xs text-[#64748B]">Total Completed Volume</p>
                      <p id="client-transactions-total" class="font-mono-tech text-2xl font-bold text-[#0095FF]">$0</p>
                    </div>
                  </div>

                  <div class="overflow-x-auto">
                    <table class="admin-table" data-testid="client-transactions-table">
                      <thead>
                        <tr>
                          <th>Transaction Ref</th>
                          <th>Order #</th>
                          <th>Completed Date</th>
                          <th>Product &amp; Finish</th>
                          <th>Status</th>
                          <th class="text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody id="client-transactions-tbody"></tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- TAB 5: CART -->
              <div id="client-tab-cart" class="client-tab-panel hidden space-y-6">
                <div class="bg-white rounded-3xl border border-[#BCE3FF] p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <h2 class="font-serif-display text-2xl font-bold text-[#0D1015]">My Shopping Cart</h2>
                    <p class="text-xs text-[#475569] mt-1">
                      Review selected furniture pieces, adjust quantities, apply a single-product Messenger voucher, or complete your order.
                    </p>
                  </div>
                </div>

                <!-- Empty Cart State -->
                <div id="client-cart-empty-state" class="bg-white rounded-3xl border border-[#BCE3FF] p-8 sm:p-10 text-center space-y-4 shadow-2xs">
                  <div class="w-12 h-12 rounded-2xl bg-[#EBF6FF] text-[#0095FF] flex items-center justify-center mx-auto">
                    <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                  </div>
                  <div class="space-y-1.5 max-w-md mx-auto">
                    <p class="font-serif-display text-xl font-bold text-[#0D1015]">Your Shopping Cart is Empty</p>
                    <p class="text-xs text-[#475569]">
                      Browse our showroom collection to add handcrafted furniture pieces to your cart.
                    </p>
                  </div>
                  <div class="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <a
                      href="index.html#catalog-section"
                      class="px-5 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors"
                    >
                      Browse Showroom →
                    </a>
                    <a
                      href="https://www.messenger.com/t/100000505712325"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="px-5 py-2.5 rounded-xl bg-[#EBF6FF] hover:bg-[#D8EEFF] text-[#0077CC] text-xs font-semibold transition-colors"
                    >
                      Request a Custom Design ↗
                    </a>
                  </div>
                </div>

                <!-- Active Cart Items + Order Summary -->
                <div id="client-cart-workspace" class="hidden grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  <div id="client-cart-items-list" class="xl:col-span-7 space-y-4"></div>

                  <aside id="client-cart-summary-card" class="xl:col-span-5 bg-white rounded-3xl border border-[#BCE3FF] p-6 space-y-5 shadow-2xs">
                    <div class="pb-4 border-b border-[#E2E8F0]">
                      <h3 class="font-serif-display text-xl font-bold text-[#0D1015]">Order Summary</h3>
                      <p class="text-xs text-[#64748B] mt-0.5">White-glove delivery &amp; single-product Messenger vouchers</p>
                    </div>

                    <div class="space-y-2.5">
                      <label for="client-cart-voucher-input" class="block text-xs font-bold text-[#0D1015]">
                        Single-Product Voucher Code
                      </label>
                      <div class="flex gap-2">
                        <input
                          id="client-cart-voucher-input"
                          type="text"
                          placeholder="e.g. LILLIA-VANCE-300"
                          class="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F8FBFF] border border-[#BCE3FF] font-mono-tech text-xs text-[#0D1015]"
                        />
                        <button
                          type="button"
                          id="client-cart-apply-voucher-btn"
                          class="px-4 py-2.5 rounded-xl bg-[#0B0F17] hover:bg-[#0095FF] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Apply
                        </button>
                      </div>
                      <p id="client-cart-voucher-feedback" class="hidden text-xs font-semibold"></p>
                    </div>

                    <div class="space-y-2.5 pt-3 border-t border-[#E2E8F0] text-xs sm:text-sm">
                      <div class="flex items-center justify-between text-[#475569]">
                        <span>Furniture Subtotal</span>
                        <span id="client-cart-subtotal" class="font-mono-tech font-bold text-[#0D1015]">$0</span>
                      </div>
                      <div id="client-cart-voucher-row" class="hidden items-center justify-between text-emerald-700 font-semibold">
                        <span>Messenger Voucher Discount</span>
                        <span id="client-cart-voucher-discount" class="font-mono-tech">-$0</span>
                      </div>
                      <div class="flex items-center justify-between text-[#475569]">
                        <span>White-Glove Delivery</span>
                        <span id="client-cart-delivery" class="font-mono-tech font-bold text-[#0D1015]">$150</span>
                      </div>
                      <div class="flex items-center justify-between pt-3 border-t border-[#E2E8F0] text-base font-bold text-[#0D1015]">
                        <span>Total</span>
                        <span id="client-cart-total" class="font-mono-tech text-xl text-[#0095FF]">$0</span>
                      </div>
                    </div>

                    <div class="space-y-2.5 pt-2">
                      <button
                        type="button"
                        id="client-cart-checkout-btn"
                        class="w-full py-3 px-4 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        Place Order
                      </button>
                    </div>
                  </aside>
                </div>
              </div>

              <!-- TAB 6: VOUCHERS -->
              <div id="client-tab-vouchers" class="client-tab-panel hidden space-y-6">
                <div class="bg-white rounded-3xl border border-[#BCE3FF] p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <h2 class="font-serif-display text-2xl font-bold text-[#0D1015]">My Voucher Wallet</h2>
                    <p class="text-xs text-[#475569] mt-1">
                      Personal single-product discount codes issued to your account after reviewing your product offer on Messenger.
                    </p>
                  </div>
                  <a
                    href="index.html#catalog-section"
                    class="px-4 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    Browse Products →
                  </a>
                </div>

                <div id="client-vouchers-friendly-list" class="grid grid-cols-1 md:grid-cols-2 gap-5"></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- 2. ADMIN MANAGEMENT CONSOLE (Shown ONLY when Admin logs in) -->
      <section id="admin-portal-view" class="hidden admin-cms-shell">
        <!-- Mobile Top Bar (< 1024px) -->
        <div id="admin-mobile-bar" class="admin-mobile-bar">
          <div class="flex items-center gap-3">
            <div class="admin-brand-mark">
              LR
            </div>
            <span class="font-serif-display text-sm font-bold text-white truncate">
              Lillia &amp; Rowena Admin
            </span>
          </div>
          <button
            type="button"
            id="admin-mobile-menu-btn"
            aria-label="Toggle Admin Navigation Sidebar"
            aria-expanded="false"
            class="admin-btn admin-btn-sm admin-btn-primary"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
            <span>Menu</span>
          </button>
        </div>

        <!-- Mobile Sidebar Backdrop -->
        <div id="admin-sidebar-backdrop" class="admin-sidebar-backdrop" aria-hidden="true"></div>

        <!-- ONE UNIFIED FIXED VERTICAL LEFT SIDEBAR -->
        <aside id="admin-sidebar" class="admin-sidebar" aria-label="Admin Dashboard Navigation">
          <div class="p-4 sm:p-5 space-y-5">
            <div class="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div class="flex items-center gap-3 min-w-0">
                <div class="admin-brand-mark">
                  LR
                </div>
                <div class="min-w-0">
                  <p class="font-serif-display text-sm font-bold text-white truncate leading-tight">
                    Lillia &amp; Rowena
                  </p>
                  <p class="text-xs text-[#BCE3FF] truncate mt-0.5">
                    Management System
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="admin-sidebar-close-btn"
                aria-label="Close Admin Navigation Sidebar"
                class="admin-sidebar-close-btn"
              >
                ✕
              </button>
            </div>

            <div class="space-y-1">
              <p class="admin-nav-section-label">Store Management</p>
              <nav aria-label="Admin Sidebar Links" class="admin-nav-list">
                <button
                  type="button"
                  data-admin-tab="overview"
                  aria-current="page"
                  class="admin-tab-btn admin-nav-item is-active"
                >
                  <span class="admin-nav-item-label">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                    <span>Overview</span>
                  </span>
                </button>

                <button
                  type="button"
                  data-admin-tab="catalog"
                  class="admin-tab-btn admin-nav-item"
                >
                  <span class="admin-nav-item-label">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                    <span>Products</span>
                  </span>
                  <span id="admin-nav-count-products" class="admin-nav-count">10</span>
                </button>

                <button
                  type="button"
                  data-admin-tab="inventory"
                  class="admin-tab-btn admin-nav-item"
                >
                  <span class="admin-nav-item-label">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
                    <span>Inventory</span>
                  </span>
                  <span id="admin-nav-count-inventory" class="admin-nav-count">8</span>
                </button>

                <button
                  type="button"
                  data-admin-tab="orders"
                  class="admin-tab-btn admin-nav-item"
                >
                  <span class="admin-nav-item-label">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 18h6"/><path d="M9 10h6"/></svg>
                    <span>Orders</span>
                  </span>
                  <span id="admin-nav-count-orders" class="admin-nav-count">5</span>
                </button>

                <button
                  type="button"
                  data-admin-tab="customers"
                  class="admin-tab-btn admin-nav-item"
                >
                  <span class="admin-nav-item-label">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span>Customers</span>
                  </span>
                  <span id="admin-nav-count-customers" class="admin-nav-count">4</span>
                </button>

                <button
                  type="button"
                  data-admin-tab="vouchers"
                  class="admin-tab-btn admin-nav-item"
                >
                  <span class="admin-nav-item-label">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
                    <span>Vouchers</span>
                  </span>
                  <span id="admin-nav-count-vouchers" class="admin-nav-count">3</span>
                </button>

                <button
                  type="button"
                  data-admin-tab="analytics"
                  class="admin-tab-btn admin-nav-item"
                >
                  <span class="admin-nav-item-label">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                    <span>Analytics &amp; Reports</span>
                  </span>
                </button>

                <a
                  href="index.html"
                  class="admin-nav-item"
                >
                  <span class="admin-nav-item-label">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span>View Storefront</span>
                  </span>
                </a>
              </nav>
            </div>
          </div>

          <div class="p-4 sm:p-5 border-t border-slate-800 space-y-3 bg-[#111927]/90">
            <div class="px-1">
              <p id="admin-sidebar-user-name" class="text-xs font-semibold text-white truncate">
                Lillia Mercier
              </p>
              <p id="admin-sidebar-user-email" class="text-xs text-slate-400 truncate mt-0.5">
                admin@lilliarowena.com
              </p>
            </div>
            <a
              href="src/logout.php"
              id="admin-logout-btn"
              class="admin-logout-button"
            >
              <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              <span>Log Out</span>
            </a>
          </div>
        </aside>

        <!-- RIGHT SIDE: CLEAN, FOCUSED PAGE CONTENT -->
        <div id="admin-main-content" class="admin-main-content">
          <div class="admin-content-inner space-y-6">
            <div class="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div class="space-y-1">
                <p id="admin-page-eyebrow" class="text-xs font-semibold uppercase tracking-wider text-[#0095FF]">
                  Store Summary
                </p>
                <h1 id="admin-page-title" class="font-serif-display text-2xl sm:text-3xl font-bold text-slate-900">
                  Dashboard Overview
                </h1>
                <p id="admin-page-description" class="text-sm text-slate-600 max-w-2xl">
                  Track your store performance, inventory breakdown, and recent customer orders in one place.
                </p>
              </div>
            </div>

            <div id="admin-status-banner" role="status" class="hidden px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center justify-between gap-3"></div>

            <!-- PAGE 1: OVERVIEW -->
            <div id="admin-overview-section" class="space-y-6">
              <div class="admin-summary-grid-4">
                <div class="admin-summary-card">
                  <p class="admin-summary-label">Total Products</p>
                  <p id="admin-stat-catalog" class="admin-summary-value">10 Pieces</p>
                  <p id="admin-stat-catalog-sub" class="admin-summary-meta">Across 5 room categories</p>
                </div>
                <div class="admin-summary-card">
                  <p class="admin-summary-label">Active Vouchers</p>
                  <p id="admin-stat-vouchers" class="admin-summary-value text-[#0095FF]">3 Active</p>
                  <p class="admin-summary-meta">Single-product client codes</p>
                </div>
                <div class="admin-summary-card">
                  <p class="admin-summary-label">Customer Orders</p>
                  <p id="admin-stat-orders" class="admin-summary-value">5 Orders</p>
                  <p class="admin-summary-meta">Active production &amp; delivery</p>
                </div>
                <div class="admin-summary-card admin-summary-card-blue">
                  <p class="admin-summary-label text-[#0077CC]">Total Revenue</p>
                  <p id="admin-stat-revenue" class="admin-summary-value text-[#0095FF]">$22,005</p>
                  <p class="admin-summary-meta text-slate-600">Confirmed customer orders</p>
                </div>
              </div>

              <div class="admin-charts-grid">
                <div class="admin-card p-5 sm:p-6 space-y-4">
                  <div>
                    <h2 class="text-base font-bold text-slate-900">Products by Category</h2>
                    <p class="text-xs text-slate-500 mt-0.5">Number of items and average price per room</p>
                  </div>
                  <div id="admin-chart-categories" class="space-y-3"></div>
                </div>

                <div class="admin-card p-5 sm:p-6 space-y-4">
                  <div>
                    <h2 class="text-base font-bold text-slate-900">Orders by Stage</h2>
                    <p class="text-xs text-slate-500 mt-0.5">Current fulfillment progress across customer orders</p>
                  </div>
                  <div id="admin-chart-orders" class="space-y-3"></div>
                </div>
              </div>

              <div id="admin-overview-recent-orders" class="admin-card overflow-hidden"></div>
            </div>

            <!-- PAGE 2: PRODUCTS -->
            <div id="admin-tab-catalog" class="admin-tab-panel hidden space-y-5">
              <form id="admin-product-form" novalidate class="admin-card p-5 sm:p-6 space-y-5 hidden">
                <input type="hidden" id="prod-edit-id" value="" />
                <div class="flex items-center justify-between gap-4 pb-3.5 border-b border-slate-200">
                  <div>
                    <h2 id="admin-product-form-title" class="text-base font-bold text-slate-900">
                      Add Product
                    </h2>
                    <p id="admin-product-form-subtitle" class="text-xs text-slate-500 mt-0.5">
                      Add or update a catalog piece. Changes sync immediately to the Showroom and Customer Dashboard.
                    </p>
                  </div>
                  <button type="button" id="admin-close-product-form" class="admin-btn admin-btn-sm admin-btn-secondary">
                    Close
                  </button>
                </div>

                <div id="admin-product-form-error" role="alert" class="hidden px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"></div>

                <!-- Compact 3-Column Product Details Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label for="prod-name" class="admin-label">Product Name</label>
                    <input id="prod-name" type="text" required placeholder="e.g. Solid Walnut Dining Table" class="admin-input" />
                  </div>
                  <div>
                    <label for="prod-sku" class="admin-label">SKU Code</label>
                    <input id="prod-sku" type="text" required placeholder="e.g. LR-DN-120" class="admin-input font-mono-tech uppercase" />
                  </div>
                  <div class="grid grid-cols-2 gap-2.5">
                    <div>
                      <label for="prod-category" class="admin-label">Category</label>
                      <select id="prod-category" class="admin-select">
                        <option value="living">Living Room</option>
                        <option value="dining">Dining Room</option>
                        <option value="bedroom">Bedroom</option>
                        <option value="office">Study/Work Desks</option>
                        <option value="kitchen">Kitchen</option>
                      </select>
                    </div>
                    <div>
                      <label for="prod-type" class="admin-label">Product Type</label>
                      <select id="prod-type" class="admin-select">
                        <option value="standard">Standard</option>
                        <option value="customized">Custom (Messenger)</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2.5">
                    <div>
                      <label for="prod-price" class="admin-label">Base Price ($)</label>
                      <input id="prod-price" type="number" min="50" required value="2850" class="admin-input font-mono-tech" />
                    </div>
                    <div>
                      <label for="prod-discount" class="admin-label">Discount (%)</label>
                      <input id="prod-discount" type="number" min="0" max="80" value="0" class="admin-input font-mono-tech" />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2.5">
                    <div>
                      <label for="prod-stock" class="admin-label">Available Stock</label>
                      <input id="prod-stock" type="number" min="0" required value="4" class="admin-input font-mono-tech" />
                    </div>
                    <div>
                      <label for="prod-min-stock" class="admin-label">Minimum Stock</label>
                      <input id="prod-min-stock" type="number" min="0" required value="2" class="admin-input font-mono-tech" />
                    </div>
                  </div>

                  <div>
                    <label for="prod-dimensions" class="admin-label">Dimensions</label>
                    <input id="prod-dimensions" type="text" value="240cm L × 100cm W × 75cm H" placeholder="e.g. 240cm L × 100cm W × 75cm H" class="admin-input" />
                  </div>

                  <div class="sm:col-span-2 lg:col-span-3">
                    <label for="prod-colors" class="admin-label">Finish Variants (Name | Hex | Price Delta)</label>
                    <input id="prod-colors" type="text" value="Natural Walnut|#5C3A21|0, Smoked Oak|#3D312A|180, Ebonized Ash|#1C1917|260" class="admin-input font-mono-tech text-xs" />
                  </div>
                </div>

                <!-- Hidden helper nodes retained for compatibility -->
                <span id="prod-type-badge" class="hidden"></span>
                <span id="prod-type-helper" class="hidden"></span>

                <!-- Conditional Messenger Customization Section -->
                <div id="prod-messenger-section" class="hidden p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label for="prod-messenger-thread" class="admin-label">Related Messenger Thread (Optional)</label>
                    <select id="prod-messenger-thread" class="admin-select">
                      <option value="">None — General Customization</option>
                    </select>
                  </div>
                  <div>
                    <label for="prod-custom-notes" class="admin-label">Customization Notes</label>
                    <input
                      id="prod-custom-notes"
                      type="text"
                      placeholder="e.g. Extended 300cm walnut slab with brass cable grommets"
                      class="admin-input"
                    />
                  </div>
                </div>

                <!-- Clean Product Image Uploader -->
                <div class="admin-image-uploader">
                  <div class="admin-image-preview-frame">
                    <img
                      id="prod-image-preview"
                      src=""
                      alt="Product image preview"
                      class="hidden admin-image-preview-img"
                    />
                    <div id="prod-image-empty-state" class="admin-image-empty-state">
                      <svg class="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                        <circle cx="9" cy="9" r="2"/>
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                      </svg>
                      <span>Preview</span>
                    </div>
                  </div>

                  <div class="admin-image-controls">
                    <label for="prod-image" class="admin-label">Product Image <span class="text-rose-600">*</span></label>
                    <div class="admin-image-input-row">
                      <input
                        id="prod-image"
                        type="text"
                        required
                        value="assets/images/category_dining_tables.jpg"
                        placeholder="assets/images/category_dining_tables.jpg"
                        class="admin-input font-mono-tech text-xs"
                      />
                      <label for="prod-image-file" class="admin-btn admin-btn-secondary cursor-pointer shrink-0">
                        Upload File
                      </label>
                      <input
                        id="prod-image-file"
                        type="file"
                        accept="image/*"
                        class="sr-only"
                      />
                      <button type="button" id="prod-image-clear-btn" class="admin-btn admin-btn-secondary shrink-0">
                        Clear
                      </button>
                    </div>
                    <div class="admin-image-presets-row">
                      <span class="text-xs font-medium text-slate-500">Quick Presets:</span>
                      <button type="button" data-prod-image-preset="assets/images/category_living_lounge.jpg" class="admin-btn admin-btn-sm admin-btn-secondary">Living Room</button>
                      <button type="button" data-prod-image-preset="assets/images/category_dining_tables.jpg" class="admin-btn admin-btn-sm admin-btn-secondary">Dining Room</button>
                      <button type="button" data-prod-image-preset="assets/images/category_bedroom_sanctuary.jpg" class="admin-btn admin-btn-sm admin-btn-secondary">Bedroom</button>
                      <button type="button" data-prod-image-preset="assets/images/category_office_storage.jpg" class="admin-btn admin-btn-sm admin-btn-secondary">Study Desk</button>
                      <button type="button" data-prod-image-preset="assets/images/category_kitchen_atelier.jpg" class="admin-btn admin-btn-sm admin-btn-secondary">Kitchen</button>
                      <button type="button" data-prod-image-preset="assets/images/hero_living_room_atelier.jpg" class="admin-btn admin-btn-sm admin-btn-secondary">Showroom</button>
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                  <div>
                    <button
                      type="button"
                      id="admin-delete-editing-product-btn"
                      class="hidden admin-btn admin-btn-danger-ghost"
                    >
                      Remove Product
                    </button>
                  </div>
                  <div class="flex items-center gap-2.5 ml-auto">
                    <button type="button" id="admin-cancel-product-btn" class="admin-btn admin-btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" id="admin-save-product-btn" class="admin-btn admin-btn-primary">
                      Save Product
                    </button>
                  </div>
                </div>
              </form>

              <div id="admin-catalog-list" class="space-y-4"></div>
            </div>

            <!-- PAGE 3: INVENTORY & STOCK MANAGEMENT -->
            <div id="admin-tab-inventory" class="admin-tab-panel hidden space-y-5"></div>

            <!-- PAGE 4: ORDERS MANAGEMENT -->
            <div id="admin-tab-orders" class="admin-tab-panel hidden space-y-5"></div>

            <!-- PAGE 5: CUSTOMERS MANAGEMENT -->
            <div id="admin-tab-customers" class="admin-tab-panel hidden space-y-5"></div>

            <!-- PAGE 6: VOUCHERS MANAGEMENT -->
            <div id="admin-tab-vouchers" class="admin-tab-panel hidden space-y-5">
              <form id="admin-voucher-form" novalidate class="admin-card p-5 sm:p-6 space-y-5">
                <div class="pb-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 class="text-base font-bold text-slate-900">
                      Create Fixed-Amount Discount Voucher
                    </h2>
                    <p class="text-xs text-slate-500 mt-0.5">
                      Issue a single-product fixed dollar discount code linked to a customer's email address with automatic Asia/Manila timestamping.
                    </p>
                  </div>
                  <span class="px-2.5 py-1 rounded-md bg-[#EBF6FF] border border-[#BCE3FF] text-[11px] font-bold text-[#0077CC]">
                    Fixed Amount Only ($) · Asia/Manila (PHT)
                  </span>
                </div>

                <div id="admin-voucher-form-error" role="alert" class="hidden px-4 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"></div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label for="vch-email" class="admin-label">Customer Email <span class="text-rose-600">*</span></label>
                    <input id="vch-email" type="email" required value="rowena.vance@vancearchitects.com" placeholder="customer@example.com" class="admin-input" />
                  </div>
                  <div>
                    <label for="vch-product" class="admin-label">Eligible Product <span class="text-rose-600">*</span></label>
                    <select id="vch-product" class="admin-select"></select>
                  </div>
                  <div>
                    <label for="vch-code" class="admin-label">Voucher Code <span class="text-rose-600">*</span></label>
                    <div class="flex gap-2">
                      <input id="vch-code" type="text" required placeholder="e.g. SAVE-300" class="admin-input font-mono-tech uppercase" />
                      <button type="button" id="admin-generate-voucher-btn" class="admin-btn admin-btn-secondary shrink-0">
                        Generate
                      </button>
                    </div>
                  </div>
                  <div>
                    <div class="flex items-center justify-between gap-1">
                      <label id="vch-discount-label" for="vch-discount" class="admin-label">Discount Amount ($) <span class="text-rose-600">*</span></label>
                      <span id="vch-discount-max-hint" class="text-[11px] font-semibold text-[#0077CC]"></span>
                    </div>
                    <input
                      id="vch-discount"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value="300"
                      placeholder="e.g. 300"
                      class="admin-input font-mono-tech"
                    />
                  </div>
                </div>

                <!-- Expiration Configuration (Required) -->
                <div class="vch-expiration-box space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <label class="admin-label mb-0">Expiration Method <span class="text-rose-600">*</span></label>
                      <p class="text-xs text-slate-500 mt-0.5">
                        Configure when this voucher expires. Issuance timestamp is recorded automatically by the server.
                      </p>
                    </div>
                    <input type="hidden" id="vch-expiration-method" value="duration" />
                    <div class="vch-method-toggle" role="group" aria-label="Expiration Method">
                      <button
                        type="button"
                        data-vch-exp-method="duration"
                        class="vch-method-btn is-active"
                      >
                        Set Duration
                      </button>
                      <button
                        type="button"
                        data-vch-exp-method="custom"
                        class="vch-method-btn"
                      >
                        Custom Date and Time
                      </button>
                    </div>
                  </div>

                  <!-- Option A: Set Duration -->
                  <div id="vch-duration-panel" class="space-y-3">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div>
                        <label for="vch-duration-value" class="admin-label">Duration Value <span class="text-rose-600">*</span></label>
                        <input
                          id="vch-duration-value"
                          type="number"
                          min="1"
                          step="1"
                          value="24"
                          class="admin-input font-mono-tech"
                        />
                      </div>
                      <div>
                        <label for="vch-duration-unit" class="admin-label">Time Unit <span class="text-rose-600">*</span></label>
                        <select id="vch-duration-unit" class="admin-select">
                          <option value="minutes">Minutes</option>
                          <option value="hours" selected>Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                      <div class="text-xs text-slate-500 pb-2">
                        Calculated automatically from the exact server issuance timestamp.
                      </div>
                    </div>

                    <div class="vch-quick-chips-row pt-0.5">
                      <span class="text-xs font-semibold text-slate-500 mr-1">Quick Select:</span>
                      <button type="button" data-vch-quick-duration="30|minutes" class="vch-quick-chip">30 minutes</button>
                      <button type="button" data-vch-quick-duration="1|hours" class="vch-quick-chip">1 hour</button>
                      <button type="button" data-vch-quick-duration="6|hours" class="vch-quick-chip">6 hours</button>
                      <button type="button" data-vch-quick-duration="12|hours" class="vch-quick-chip">12 hours</button>
                      <button type="button" data-vch-quick-duration="24|hours" class="vch-quick-chip is-selected">24 hours</button>
                      <button type="button" data-vch-quick-duration="3|days" class="vch-quick-chip">3 days</button>
                      <button type="button" data-vch-quick-duration="7|days" class="vch-quick-chip">7 days</button>
                    </div>
                  </div>

                  <!-- Option B: Custom Date and Time -->
                  <div id="vch-custom-expiry-panel" class="hidden grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                      <label for="vch-expiry-date" class="admin-label">Expiration Date <span class="text-rose-600">*</span></label>
                      <input
                        id="vch-expiry-date"
                        type="date"
                        class="admin-input font-mono-tech"
                      />
                    </div>
                    <div>
                      <label for="vch-expiry-time" class="admin-label">Expiration Time (PHT) <span class="text-rose-600">*</span></label>
                      <input
                        id="vch-expiry-time"
                        type="time"
                        class="admin-input font-mono-tech"
                      />
                    </div>
                    <div class="text-xs text-slate-500 pb-2">
                      Must be a future date and time in Asia/Manila timezone.
                    </div>
                  </div>

                  <!-- Live Expiration Preview -->
                  <div id="vch-expiration-preview" class="vch-preview-banner">
                    <div class="space-y-0.5">
                      <span class="text-[11px] font-bold uppercase tracking-wider text-[#0077CC]">Expiration Preview</span>
                      <p id="vch-expiration-preview-text" class="text-xs sm:text-sm font-semibold text-slate-900">
                        Calculating expiration timestamp...
                      </p>
                    </div>
                    <div class="text-left sm:text-right">
                      <span id="vch-expiration-preview-badge" class="vch-remaining-badge vch-remaining-active">24h 0m left</span>
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <p class="text-xs text-slate-500">
                    Fixed discount is validated against the eligible product price before issuance and at checkout.
                  </p>
                  <button type="submit" id="admin-create-voucher-submit-btn" class="admin-btn admin-btn-primary">
                    Create Voucher
                  </button>
                </div>
              </form>

              <div id="admin-vouchers-list" class="space-y-4"></div>
            </div>

            <!-- PAGE 7: ANALYTICS & BUSINESS REPORTS -->
            <div id="admin-tab-analytics" class="admin-tab-panel hidden space-y-6"></div>
          </div>
        </div>

        <!-- Straightforward Confirmation Dialog Modal -->
        <div id="admin-confirm-modal" class="admin-modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="admin-confirm-title">
          <div class="admin-modal-card space-y-4">
            <div class="space-y-1.5">
              <h3 id="admin-confirm-title" class="text-base font-bold text-slate-900">Confirm Action</h3>
              <p id="admin-confirm-message" class="text-sm text-slate-600">Are you sure you want to proceed?</p>
            </div>
            <div class="flex items-center justify-end gap-2.5 pt-2">
              <button type="button" id="admin-confirm-cancel" class="admin-btn admin-btn-secondary">
                Cancel
              </button>
              <button type="button" id="admin-confirm-accept" class="admin-btn admin-btn-danger">
                Confirm
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <script type="module" src="assets/js/app.js"></script>
  </body>
</html>
