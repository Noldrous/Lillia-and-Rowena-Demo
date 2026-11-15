/**
 * Server-Side Preview & Datastore HTTP Server (Port 3000)
 * Mirrors `api.php` (PHP PDO + `data/store.json` datastore) so all storefront, login, cart,
 * and dashboard operations read and persist directly on the server instead of `localStorage`.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const STORE_PATH = path.join(__dirname, 'data', 'store.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function readStoreFile() {
  const raw = fs.readFileSync(STORE_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeStoreFile(storeData) {
  const clean = { ...storeData };
  delete clean._dbMeta;
  fs.writeFileSync(STORE_PATH, JSON.stringify(clean, null, 2) + '\n', 'utf8');
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  });
  res.end(body);
}

function handleApiRequest(req, res, parsedUrl) {
  try {
    if (req.method === 'GET') {
      const store = readStoreFile();
      if (!Object.prototype.hasOwnProperty.call(store, 'sessionUser')) {
        store.sessionUser = null;
      }
      if (!Array.isArray(store.cartItems)) {
        store.cartItems = [];
      }
      store._dbMeta = {
        driver: 'pdo_mysql',
        endpoint: 'api.php',
        timestamp: new Date().toISOString(),
      };
      return sendJson(res, 200, store);
    }

    if (req.method === 'POST') {
      let rawBody = '';
      req.on('data', (chunk) => {
        rawBody += chunk;
      });
      req.on('end', () => {
        try {
          const payload = rawBody ? JSON.parse(rawBody) : {};
          const action = String(payload.action || parsedUrl.searchParams.get('action') || 'sync_store');
          const store = readStoreFile();

          switch (action) {
            case 'sync_store': {
              if (Array.isArray(payload.products)) store.products = payload.products;
              if (Array.isArray(payload.materials)) store.materials = payload.materials;
              if (Array.isArray(payload.inventoryTransactions)) {
                store.inventoryTransactions = payload.inventoryTransactions;
              }
              if (Array.isArray(payload.vouchers)) store.vouchers = payload.vouchers;
              if (Array.isArray(payload.orders)) store.orders = payload.orders;
              if (payload.customerProfile && typeof payload.customerProfile === 'object') {
                store.customerProfile = payload.customerProfile;
              }
              if (Array.isArray(payload.customers)) store.customers = payload.customers;
              if (Array.isArray(payload.offers)) store.offers = payload.offers;
              if (Object.prototype.hasOwnProperty.call(payload, 'sessionUser')) {
                store.sessionUser = payload.sessionUser;
              }
              if (Array.isArray(payload.cartItems)) {
                store.cartItems = payload.cartItems;
              }
              writeStoreFile(store);
              break;
            }

            case 'save_session': {
              store.sessionUser = payload.sessionUser ?? null;
              if (!store.sessionUser) {
                store.cartItems = [];
              }
              if (payload.customerProfile && typeof payload.customerProfile === 'object') {
                store.customerProfile = payload.customerProfile;
              }
              writeStoreFile(store);
              break;
            }

            case 'save_cart': {
              store.cartItems = Array.isArray(payload.cartItems) ? payload.cartItems : [];
              writeStoreFile(store);
              break;
            }

            case 'save_offer': {
              if (payload.offer && typeof payload.offer === 'object') {
                const offers = Array.isArray(store.offers) ? [...store.offers] : [];
                offers.unshift(payload.offer);
                store.offers = offers.slice(0, 20);
                writeStoreFile(store);
              }
              break;
            }

            case 'save_product': {
              const product = payload.product;
              if (product && typeof product === 'object' && product.id) {
                const products = Array.isArray(store.products) ? [...store.products] : [];
                const idx = products.findIndex((p) => p.id === product.id);
                if (idx >= 0) {
                  products[idx] = { ...products[idx], ...product };
                } else {
                  products.unshift(product);
                }
                store.products = products;
                writeStoreFile(store);
              }
              break;
            }

            case 'delete_product': {
              const productId = String(payload.productId || '').trim();
              if (productId) {
                store.products = (store.products || []).filter((p) => p.id !== productId);
                if (Array.isArray(payload.vouchers)) {
                  store.vouchers = payload.vouchers;
                }
                writeStoreFile(store);
              }
              break;
            }

            case 'save_material': {
              if (Array.isArray(payload.materials)) {
                store.materials = payload.materials;
              } else if (payload.material && payload.material.id) {
                const mats = Array.isArray(store.materials) ? [...store.materials] : [];
                const idx = mats.findIndex((m) => m.id === payload.material.id);
                if (idx >= 0) {
                  mats[idx] = { ...mats[idx], ...payload.material };
                } else {
                  mats.push(payload.material);
                }
                store.materials = mats;
              }
              if (Array.isArray(payload.inventoryTransactions)) {
                store.inventoryTransactions = payload.inventoryTransactions;
              }
              writeStoreFile(store);
              break;
            }

            case 'delete_material': {
              const materialId = String(payload.materialId || '').trim();
              if (Array.isArray(payload.materials)) {
                store.materials = payload.materials;
              } else if (materialId) {
                store.materials = (store.materials || []).filter((m) => m.id !== materialId);
              }
              writeStoreFile(store);
              break;
            }

            case 'register_customer': {
              const customers = Array.isArray(store.customers) ? [...store.customers] : [];
              const email = String(payload.email || '').trim().toLowerCase();
              const fullName = String(payload.fullName || payload.name || '').trim();
              const existingIdx = customers.findIndex(
                (c) => String(c.email || '').toLowerCase() === email
              );
              const customerRecord = {
                id: existingIdx >= 0 ? customers[existingIdx].id : customers.length + 10,
                role: 'Customer',
                fullName,
                email,
                phoneNumber: payload.phoneNumber || '+1 (212) 555-0148',
                address: payload.address || 'Suite 400, 118 Mercer St, SoHo',
              };
              if (existingIdx >= 0) {
                customers[existingIdx] = { ...customers[existingIdx], ...customerRecord };
              } else {
                customers.push(customerRecord);
              }
              store.customers = customers;
              const sessionUser = {
                email: customerRecord.email,
                name: customerRecord.fullName,
                role: 'client',
              };
              store.sessionUser = sessionUser;
              store.customerProfile = {
                name: customerRecord.fullName,
                email: customerRecord.email,
                phone: customerRecord.phoneNumber,
                city: 'New York, NY 10013',
                address: 'Suite 400, 118 Mercer St, SoHo',
                notes: 'Standard white-glove delivery instructions.',
              };
              writeStoreFile(store);
              return sendJson(res, 200, { ok: true, customer: customerRecord, sessionUser });
            }

            default:
              writeStoreFile(store);
              break;
          }

          return sendJson(res, 200, { ok: true, action });
        } catch (err) {
          return sendJson(res, 400, { ok: false, error: err.message });
        }
      });
      return;
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err.message });
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/api.php' || pathname === '/src/api.php' || pathname === '/api/store') {
    return handleApiRequest(req, res, parsedUrl);
  }

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(__dirname, safePath);

  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.json' ? 'no-store' : 'public, max-age=0',
    });
    fs.createReadStream(fullPath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Lillia and Rowena server listening on http://0.0.0.0:${PORT}`);
});
