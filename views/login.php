<?php
/**
 * Part 5: Login View Template (views/login.php)
 * Rendered by App\Controllers\HomeControllers::login() via index.php.
 *
 * @var string|null $error
 * @var array<string, string> $fieldErrors
 * @var string $email
 * @var string $role
 */
$activeRole = ($role ?? 'Customer') === 'Admin' ? 'Admin' : 'Customer';
$defaultEmail = !empty($email)
    ? $email
    : ($activeRole === 'Admin' ? 'admin@lilliarowena.com' : 'rowena.vance@vancearchitects.com');
$defaultPass = $activeRole === 'Admin' ? 'MasterJoinery#01' : 'ClientPass2025!';
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lillia and Rowena Furniture — Login</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="assets/css/login.css" />
  </head>
  <body class="lr-login-body">
    <main class="login-shell">
      <div style="margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
        <a href="home.php" style="text-decoration: none; font-size: 0.875rem; font-weight: 700; color: #475569;">
          ← Back to Showroom Collection
        </a>
        <span class="lr-mono" style="font-size: 0.75rem; color: #0095FF; font-weight: 600;">
          MYSQL 8.0.16+ INNODB · PSR-4 COMPOSER
        </span>
      </div>

      <div class="login-grid">
        <!-- Left Architectural Showcase Column -->
        <aside class="login-showcase">
          <img src="assets/img/showroom.jpg" alt="Lillia and Rowena Furniture" class="login-showcase-img" />
          <div class="login-showcase-overlay"></div>

          <div style="position: relative; z-index: 2;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2.25rem;">
              <div class="lr-serif" style="width: 2.5rem; height: 2.5rem; border-radius: 0.5rem; background: #0095FF; color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                LR
              </div>
              <div>
                <div class="lr-serif" style="font-size: 1.125rem; font-weight: 700; color: #FFF;">Lillia and Rowena Furniture</div>
              </div>
            </div>

            <p class="lr-mono" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.14em; color: #38BDF8; margin: 0 0 0.75rem;">
              CLIENT &amp; ADMIN PORTAL
            </p>
            <h1 class="lr-serif" style="font-size: 2.15rem; line-height: 1.15; margin: 0 0 1rem; color: #FFF;">
              Direct Access to Commission Ledgers &amp; Studio Records.
            </h1>
            <p style="font-size: 0.925rem; line-height: 1.65; color: #CBD5E1; margin: 0;">
              Customers track custom timber sizing, color finish variants, and single-product Messenger Vouchers. Administrators manage products, storewide discounts, and custom furniture designs.
            </p>
          </div>

          <div style="position: relative; z-index: 2; border-top: 1px solid rgba(255,255,255,0.14); padding-top: 1.25rem; margin-top: 2rem;">
            <div class="lr-mono" style="font-size: 0.72rem; color: #BAE6FD;">
              TABLES: Admin · Customer · Product · Voucher · Customer_Order · Order_Item
            </div>
          </div>
        </aside>

        <!-- Right Authentication Form Column -->
        <section class="login-form-panel">
          <div style="max-width: 440px; width: 100%; margin: 0 auto;">
            <h2 class="lr-serif" style="font-size: 1.85rem; margin: 0 0 0.4rem; color: #0F172A;">
              Sign In to Your Account
            </h2>
            <p style="font-size: 0.9rem; color: #475569; margin: 0 0 1.5rem;">
              Select your portal role below or use the pre-filled demo credentials.
            </p>

            <!-- Role Switcher -->
            <div class="role-switcher">
              <button
                type="button"
                class="role-btn <?= $activeRole === 'Customer' ? 'active' : '' ?>"
                data-role-tab="Customer"
              >
                Client Portal (`Customer`)
              </button>
              <button
                type="button"
                class="role-btn <?= $activeRole === 'Admin' ? 'active' : '' ?>"
                data-role-tab="Admin"
              >
                Admin Console (`Admin`)
              </button>
            </div>

            <!-- Demo Credentials Helper -->
            <div style="background: rgba(224, 242, 254, 0.75); border: 1px solid #BAE6FD; border-radius: 0.75rem; padding: 0.75rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
              <div>
                <div class="lr-mono" style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: #0284C7;">
                  Quick Demo Credentials
                </div>
                <div id="demo-email-preview" class="lr-mono" style="font-size: 0.78rem; color: #0F172A; margin-top: 0.15rem;">
                  <?= e($defaultEmail) ?>
                </div>
              </div>
              <button
                type="button"
                id="fill-demo-credentials"
                style="background: #FFFFFF; border: 1px solid #7DD3FC; color: #0095FF; border-radius: 0.5rem; padding: 0.4rem 0.75rem; font-size: 0.75rem; font-weight: 700; cursor: pointer;"
              >
                Auto-Fill
              </button>
            </div>

            <!-- Error Banner -->
            <div
              id="login-error-banner"
              class="form-error-banner"
              style="display: <?= !empty($error) ? 'block' : 'none' ?>;"
            >
              <?= e($error ?? '') ?>
            </div>

            <!-- Login Form -->
            <form id="lr-login-form" method="post" action="index.php" novalidate>
              <input type="hidden" id="login-role" name="role" value="<?= e($activeRole) ?>" />

              <div class="form-group">
                <label class="form-label" for="login-email">Email Address</label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  class="form-input <?= isset($fieldErrors['email']) ? 'has-error' : '' ?>"
                  value="<?= e($defaultEmail) ?>"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="login-password">Password</label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  class="form-input <?= isset($fieldErrors['password']) ? 'has-error' : '' ?>"
                  value="<?= e($defaultPass) ?>"
                  required
                />
              </div>

              <button type="submit" id="login-submit-btn" class="btn-submit">
                <?= $activeRole === 'Admin' ? 'Sign In to Admin Console →' : 'Sign In to Client Portal →' ?>
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>

    <script src="assets/js/login.js"></script>
  </body>
</html>
