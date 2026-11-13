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
    <title>Lillia and Rowena Furniture — Account Dashboard</title>
    <meta name="description" content="Lillia and Rowena Furniture — Customer Account Dashboard and Admin Management Console." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="assets/css/style.css" />
    <script>
      try {
        localStorage.setItem('lr_session_user', <?= json_encode(json_encode($sessionPayload, JSON_UNESCAPED_SLASHES)) ?>);
      } catch (e) {}
    </script>
  </head>
  <body class="bg-[#F4F9FF] text-[#0F172A] antialiased selection:bg-[#0095FF] selection:text-white min-h-screen flex flex-col">
    <!-- Dedicated Logged-In Header (Strictly Shows Logged-In User's Account) -->
    <header class="sticky top-0 z-40 bg-[#0B0F17] text-white border-b border-slate-800 shadow-sm">
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

        <!-- Logged-In User + Back to Showroom & Log Out -->
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <span id="portal-user-badge" class="text-xs font-semibold text-slate-200">Signed In</span>
          </div>
          <a
            href="index.html"
            class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            ← Back to Showroom
          </a>
          <a
            href="logout.php"
            id="portal-logout-btn"
            class="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            Log Out
          </a>
        </div>
      </div>
    </header>

    <!-- Main Dashboard Workspace -->
    <main class="flex-1 py-8 sm:py-10">
      <div class="max-w-[1440px] mx-auto px-4 sm:px-8">
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
                <div
                  id="client-sidebar-initials"
                  class="w-11 h-11 rounded-2xl bg-[#0B0F17] text-[#BCE3FF] font-serif-display text-base font-bold flex items-center justify-center shrink-0"
                >
                  RV
                </div>
                <div class="min-w-0">
                  <p id="client-sidebar-name" class="font-serif-display text-base font-bold text-[#0D1015] truncate">
                    Rowena Vance
                  </p>
                  <p id="client-sidebar-email" class="font-mono-tech text-xs text-[#64748B] truncate">
                    rowena.vance@vancearchitects.com
                  </p>
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
                  Want to Request a Custom Design?
                </p>
                <p class="text-xs text-slate-300 leading-relaxed">
                  Message our workshop directly to request custom dimensions or negotiate an offer.
                </p>
                <a
                  href="https://www.messenger.com/t/100000505712325"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block w-full py-2.5 px-3 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold text-center transition-colors"
                >
                  Message Us on Messenger ↗
                </a>
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
              </div>

              <!-- TAB 2: ORDERS -->
              <div id="client-tab-orders" class="client-tab-panel hidden space-y-6">
                <div class="bg-white rounded-3xl border border-[#BCE3FF] p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                  <div>
                    <h2 class="font-serif-display text-2xl font-bold text-[#0D1015]">My Furniture Orders</h2>
                    <p class="text-xs text-[#475569] mt-1">
                      Track your custom timber dimensions, hand-rubbed finishes, and white-glove delivery schedule.
                    </p>
                  </div>
                  <a
                    href="https://www.messenger.com/t/100000505712325"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="px-4 py-2.5 rounded-xl bg-[#EBF6FF] hover:bg-[#D8EEFF] text-[#0077CC] text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    Ask About an Order on Messenger ↗
                  </a>
                </div>

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
                      <h2 class="font-serif-display text-2xl font-bold text-[#0D1015]">Transactions &amp; Payment History</h2>
                      <p class="text-xs text-[#475569] mt-1">
                        Complete record of your furniture payments, applied Messenger vouchers, and white-glove delivery invoices.
                      </p>
                    </div>
                    <div class="text-left sm:text-right">
                      <p class="text-xs text-[#64748B]">Total Commissioned Volume</p>
                      <p id="client-transactions-total" class="font-mono-tech text-2xl font-bold text-[#0095FF]">$8,061</p>
                    </div>
                  </div>

                  <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                      <thead>
                        <tr class="border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase">
                          <th class="py-3 pr-4">Transaction ID</th>
                          <th class="py-3 px-4">Date</th>
                          <th class="py-3 px-4">Order &amp; Piece</th>
                          <th class="py-3 px-4">Payment Method</th>
                          <th class="py-3 px-4">Status</th>
                          <th class="py-3 pl-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody id="client-transactions-tbody" class="divide-y divide-[#E2E8F0] text-xs sm:text-sm"></tbody>
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
                  <div class="flex flex-wrap items-center gap-2.5">
                    <select
                      id="client-cart-add-select"
                      aria-label="Select a furniture piece to add to cart"
                      class="px-3.5 py-2.5 rounded-xl bg-[#F8FBFF] border border-[#BCE3FF] text-xs font-medium text-[#0D1015]"
                    ></select>
                    <button
                      type="button"
                      id="client-cart-add-btn"
                      class="px-4 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      + Add to Cart
                    </button>
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
                      Use the catalog selector above or browse our showroom collection to add handcrafted furniture pieces to your cart.
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
                      <a
                        href="https://www.messenger.com/t/100000505712325"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="block w-full py-2.5 px-4 rounded-xl bg-[#EBF6FF] hover:bg-[#D8EEFF] text-[#0077CC] text-xs font-semibold text-center transition-colors"
                      >
                        Make Offer on Messenger ↗
                      </a>
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
                      Personal single-product discount codes issued to your account after negotiating with the owner on Messenger.
                    </p>
                  </div>
                  <a
                    href="https://www.messenger.com/t/100000505712325"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="px-4 py-2.5 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    Make an Offer on Messenger ↗
                  </a>
                </div>

                <div id="client-vouchers-friendly-list" class="grid grid-cols-1 md:grid-cols-2 gap-5"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. ADMIN MANAGEMENT CONSOLE (Shown ONLY when Admin logs in) -->
        <section id="admin-portal-view" class="hidden space-y-10">
          <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#BCE3FF]">
            <div class="space-y-2">
              <p class="font-mono-tech text-xs uppercase tracking-[0.16em] text-[#0095FF] font-semibold">
                Lillia and Rowena Furniture · Left-Sidebar Admin Management Console
              </p>
              <h1 class="font-serif-display text-3xl sm:text-4xl font-bold text-[#0D1015]">
                Business Owner &amp; Admin Management Console
              </h1>
              <p class="text-sm text-[#475569] max-w-2xl">
                Add custom furniture designs requested by clients on Messenger, edit product color prices and storewide discounts, and issue single-user, single-product Vouchers.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <button
                type="button"
                id="admin-open-add-product-btn"
                class="px-5 py-3 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs"
              >
                + Add Product / Custom Messenger Design
              </button>
            </div>
          </div>

          <div id="admin-status-banner" class="hidden p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-medium"></div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <aside class="lg:col-span-3 bg-white rounded-3xl border border-[#BCE3FF] p-6 space-y-6 shadow-2xs">
              <div>
                <p class="font-mono-tech text-xs uppercase tracking-widest text-[#0095FF] font-semibold">
                  Management Modules
                </p>
                <p class="text-xs text-[#64748B] mt-1">
                  Select a record table on the left
                </p>
              </div>

              <nav class="space-y-2.5">
                <button
                  type="button"
                  data-admin-tab="catalog"
                  class="admin-tab-btn w-full text-left p-4 rounded-2xl transition-all border cursor-pointer bg-[#0095FF] text-white border-[#0095FF] shadow-sm"
                >
                  <p class="text-xs font-bold">Products, Colors &amp; Discounts</p>
                  <p class="text-[11px] opacity-85 mt-0.5">Add custom designs &amp; color prices</p>
                </button>
                <button
                  type="button"
                  data-admin-tab="vouchers"
                  class="admin-tab-btn w-full text-left p-4 rounded-2xl transition-all border cursor-pointer bg-[#F8FBFF] text-[#0D1015] border-[#E2E8F0] hover:border-[#0095FF]"
                >
                  <p class="text-xs font-bold">Single-Product Vouchers</p>
                  <p class="text-[11px] text-[#64748B] mt-0.5">Issue Messenger offer codes</p>
                </button>
                <button
                  type="button"
                  data-admin-tab="orders"
                  class="admin-tab-btn w-full text-left p-4 rounded-2xl transition-all border cursor-pointer bg-[#F8FBFF] text-[#0D1015] border-[#E2E8F0] hover:border-[#0095FF]"
                >
                  <p class="text-xs font-bold">Client Orders (`Customer_Order`)</p>
                  <p class="text-[11px] text-[#64748B] mt-0.5">Update production status</p>
                </button>
              </nav>
            </aside>

            <div class="lg:col-span-9 space-y-8">
              <div id="admin-tab-catalog" class="admin-tab-panel space-y-8">
                <form id="admin-product-form" class="bg-white rounded-3xl border border-[#BCE3FF] p-8 space-y-6 shadow-2xs hidden">
                  <div class="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
                    <div>
                      <p class="font-mono-tech text-xs uppercase tracking-widest text-[#0095FF] font-semibold">
                        Product &amp; Custom Messenger Design Editor
                      </p>
                      <h3 id="admin-product-form-title" class="font-serif-display text-2xl font-bold text-[#0D1015] mt-0.5">
                        Add Product or Client's Custom Design
                      </h3>
                    </div>
                    <button type="button" id="admin-close-product-form" class="text-xs font-semibold text-[#64748B] hover:text-[#0D1015] cursor-pointer">
                      Cancel ✕
                    </button>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label class="block text-xs font-bold text-[#0D1015] mb-1.5">Product Name</label>
                      <input id="prod-name" type="text" required placeholder="e.g. Custom 280cm Walnut Dining Table" class="w-full px-4 py-2.5 rounded-xl bg-[#F0F8FF] border border-[#BCE3FF] text-sm" />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#0D1015] mb-1.5">SKU Code</label>
                      <input id="prod-sku" type="text" required placeholder="e.g. LR-CUST-109" class="w-full px-4 py-2.5 rounded-xl bg-[#F0F8FF] border border-[#BCE3FF] font-mono-tech text-sm uppercase" />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#0D1015] mb-1.5">Room Category</label>
                      <select id="prod-category" class="w-full px-4 py-2.5 rounded-xl bg-[#F0F8FF] border border-[#BCE3FF] text-sm">
                        <option value="living">Living &amp; Lounge</option>
                        <option value="dining">Dining &amp; Tables</option>
                        <option value="bedroom">Bedroom Sanctuary</option>
                        <option value="office">Study &amp; Credenzas</option>
                      </select>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="block text-xs font-bold text-[#0D1015] mb-1.5">Base Price (USD)</label>
                        <input id="prod-price" type="number" min="50" required value="2850" class="w-full px-4 py-2.5 rounded-xl bg-[#F0F8FF] border border-[#BCE3FF] font-mono-tech text-sm" />
                      </div>
                      <div>
                        <label class="block text-xs font-bold text-[#0D1015] mb-1.5">Storewide Discount %</label>
                        <input id="prod-discount" type="number" min="0" max="80" value="0" class="w-full px-4 py-2.5 rounded-xl bg-[#F0F8FF] border border-[#BCE3FF] font-mono-tech text-sm" />
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#0D1015] mb-1.5">Dimensions</label>
                      <input id="prod-dimensions" type="text" value="240cm L × 100cm W × 75cm H" class="w-full px-4 py-2.5 rounded-xl bg-[#F0F8FF] border border-[#BCE3FF] font-mono-tech text-sm" />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#0D1015] mb-1.5">Color Variants (`Name | Hex | +Delta`)</label>
                      <input id="prod-colors" type="text" value="Natural Walnut|#5C3A21|0, Smoked Oak|#3D312A|180, Ebonized Ash|#1C1917|260" class="w-full px-4 py-2.5 rounded-xl bg-[#F0F8FF] border border-[#BCE3FF] font-mono-tech text-xs" />
                    </div>
                  </div>

                  <div class="flex justify-end gap-3 pt-2">
                    <button type="submit" class="px-6 py-3 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs sm:text-sm font-semibold cursor-pointer">
                      Save Product to Catalog
                    </button>
                  </div>
                </form>

                <div id="admin-catalog-list" class="space-y-5"></div>
              </div>

              <div id="admin-tab-vouchers" class="admin-tab-panel hidden space-y-8">
                <form id="admin-voucher-form" class="bg-white rounded-3xl border border-[#BCE3FF] p-8 space-y-6 shadow-2xs">
                  <div>
                    <p class="font-mono-tech text-xs uppercase tracking-widest text-[#0095FF] font-semibold">
                      Issue Single-User, Single-Product Voucher (`Voucher` Table)
                    </p>
                    <h3 class="font-serif-display text-2xl font-bold text-[#0D1015] mt-1">
                      Generate Messenger Offer Voucher
                    </h3>
                    <p class="text-xs text-[#475569] mt-1">
                      After agreeing on a reduced price in Messenger (<a href="https://www.messenger.com/t/100000505712325" target="_blank" rel="noopener noreferrer" class="text-[#0095FF] underline">https://www.messenger.com/t/100000505712325</a>), issue a voucher locked to that specific customer and product.
                    </p>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label class="block text-xs font-bold text-[#0D1015] mb-1.5">Customer Email (`Customer.Email`)</label>
                      <input id="vch-email" type="email" required value="rowena.vance@vancearchitects.com" class="w-full px-4 py-2.5 rounded-xl bg-[#F0F8FF] border border-[#BCE3FF] font-mono-tech text-xs" />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#0D1015] mb-1.5">Target Product (`Product.ProductID`)</label>
                      <select id="vch-product" class="w-full px-4 py-2.5 rounded-xl bg-[#F0F8FF] border border-[#BCE3FF] text-xs font-semibold"></select>
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#0D1015] mb-1.5">Voucher Code (`Voucher.Code`)</label>
                      <input id="vch-code" type="text" required placeholder="e.g. VCH-ROWENA-500" class="w-full px-4 py-2.5 rounded-xl bg-[#F0F8FF] border border-[#BCE3FF] font-mono-tech text-xs uppercase" />
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-[#0D1015] mb-1.5">Fixed Discount Amount ($ USD)</label>
                      <input id="vch-discount" type="number" min="25" required value="300" class="w-full px-4 py-2.5 rounded-xl bg-[#F0F8FF] border border-[#BCE3FF] font-mono-tech text-xs" />
                    </div>
                  </div>

                  <button type="submit" class="px-6 py-3 rounded-xl bg-[#0095FF] hover:bg-[#0077CC] text-white text-xs sm:text-sm font-semibold cursor-pointer">
                    Issue Single-Product Voucher
                  </button>
                </form>

                <div id="admin-vouchers-list" class="space-y-4"></div>
              </div>

              <div id="admin-tab-orders" class="admin-tab-panel hidden space-y-6"></div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <script type="module" src="assets/js/app.js"></script>
  </body>
</html>
