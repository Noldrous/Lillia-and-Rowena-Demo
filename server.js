import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, 'data', 'store.json');

function readJsonStore() {
  const raw = fs.readFileSync(STORE_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeJsonStore(data) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/data', express.static(path.join(__dirname, 'data')));
  app.use('/database', express.static(path.join(__dirname, 'database')));
  app.use('/assets/img', express.static(path.join(__dirname, 'assets', 'img')));
  app.use('/assets/images', express.static(path.join(__dirname, 'assets', 'images')));
  app.use('/assets/css/login.css', express.static(path.join(__dirname, 'assets', 'css', 'login.css')));
  app.use('/assets/js/login.js', express.static(path.join(__dirname, 'assets', 'js', 'login.js')));

  // Route aliases for PHP entry points when running under Node preview/publish
  app.get('/index.php', (_req, res) => res.redirect('/login.html'));
  app.post('/index.php', (req, res) => {
    const role = String(req.body?.role || 'Customer') === 'Admin' ? 'admin' : 'client';
    res.redirect(`/dashboard.html?role=${role}`);
  });
  app.get('/home.php', (_req, res) => res.redirect('/dashboard.html'));
  app.get('/logout.php', (_req, res) => res.redirect('/login.html'));

  // GET /api/catalog — Returns JSON catalog, color variants, vouchers, orders & workshop logs
  app.get('/api/catalog', (_req, res) => {
    try {
      const state = readJsonStore();
      res.json(state);
    } catch (error) {
      res.status(500).json({ error: error.message || 'Failed to read JSON store' });
    }
  });

  // POST /api/products — Upserts a product (including custom Messenger designs & color tiers)
  app.post('/api/products', (req, res) => {
    try {
      const state = readJsonStore();
      const payload = req.body || {};
      const products = Array.isArray(state.products) ? state.products : [];
      const existingIdx = products.findIndex(
        (p) => p.id === payload.id || String(p.sku).toUpperCase() === String(payload.sku).toUpperCase()
      );
      if (existingIdx >= 0) {
        products[existingIdx] = payload;
      } else {
        products.unshift(payload);
      }
      state.products = products;
      writeJsonStore(state);
      res.json({ product: payload });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Failed to save product' });
    }
  });

  // POST /api/vouchers — Issues a single-customer, single-product Messenger Voucher
  app.post('/api/vouchers', (req, res) => {
    try {
      const state = readJsonStore();
      const voucher = req.body || {};
      state.vouchers = [voucher, ...(state.vouchers || [])];
      writeJsonStore(state);
      res.json({ voucher });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Failed to save voucher' });
    }
  });

  // POST /api/vouchers/redeem — Marks a single-product Messenger Voucher as Used
  app.post('/api/vouchers/redeem', (req, res) => {
    try {
      const state = readJsonStore();
      const code = String(req.body?.code || '').toUpperCase();
      let updated = null;
      state.vouchers = (state.vouchers || []).map((v) => {
        if (String(v.code || '').toUpperCase() === code) {
          updated = { ...v, status: 'Used' };
          return updated;
        }
        return v;
      });
      writeJsonStore(state);
      res.json({ voucher: updated });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Failed to redeem voucher' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'mpa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/login', (_req, res) => res.sendFile(path.join(distPath, 'login.html')));
    app.get('/dashboard', (_req, res) => res.sendFile(path.join(distPath, 'dashboard.html')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lillia and Rowena Furniture Server running on http://localhost:${PORT}`);
  });
}

startServer();
