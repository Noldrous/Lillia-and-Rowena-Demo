<?php
/**
 * Welcome / Flagship Showroom View Template (views/home.php)
 * Rendered by App\Controllers\HomeControllers::home() via home.php.
 *
 * @var array<string, mixed>|null $user
 * @var array<string, mixed> $store
 * @var array<int, array<string, mixed>> $products
 */
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lillia and Rowena Furniture — Architectural Showroom &amp; Order Management</title>
    <meta name="description" content="Bespoke architectural furniture showroom, client order tracking portal, and atelier record management system." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="assets/css/atelier.css" />
    <script>
      window.__INITIAL_SESSION_USER__ = <?= json_encode($user, JSON_UNESCAPED_SLASHES) ?>;
    </script>
  </head>
  <body class="bg-white text-[#0F172A] antialiased selection:bg-[#0095FF] selection:text-white">
    <div id="app"></div>
    <script type="module" src="assets/js/app.js"></script>
  </body>
</html>
