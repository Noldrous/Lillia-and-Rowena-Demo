import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildAdminMessengerUrl,
  calculateOrderPricing,
  computeVariantPricing,
  filterFurnitureItems,
  validateLoginCredentials,
  validateNewFurnitureInput,
  validateVoucherForOrder,
} from './store.js';

const storeJsonPath = path.resolve(process.cwd(), 'data/atelier_store.json');
const storeData = JSON.parse(fs.readFileSync(storeJsonPath, 'utf8'));
const INITIAL_FURNITURE_ITEMS = storeData.products;
const INITIAL_VOUCHERS = storeData.vouchers;

describe('Pure JavaScript & JSON Store Logic Tests', () => {
  it('computes color variant pricing with positive and negative price deltas and discounts', () => {
    const sofa = INITIAL_FURNITURE_ITEMS[0]; // $4850 base, 10% discount
    const baseVariant = computeVariantPricing(sofa, 'Warm Oat Bouclé / Natural Oak');
    assert.equal(baseVariant.priceDelta, 0);
    assert.equal(baseVariant.variantBasePrice, 4850);
    assert.equal(baseVariant.effectivePrice, 4365);

    const indigoVariant = computeVariantPricing(sofa, 'Midnight Indigo Mohair / Ebonized Oak');
    assert.equal(indigoVariant.priceDelta, 520);
    assert.equal(indigoVariant.variantBasePrice, 5370);
    assert.equal(indigoVariant.effectivePrice, Math.round(5370 * 0.9));

    const diningTable = INITIAL_FURNITURE_ITEMS[1]; // $4200 base, 12% discount
    const oakVariant = computeVariantPricing(diningTable, 'Quarter-Sawn White Oak');
    assert.equal(oakVariant.priceDelta, -150);
    assert.equal(oakVariant.variantBasePrice, 4050);
    assert.equal(oakVariant.effectivePrice, Math.round(4050 * 0.88));
  });

  it('builds Admin Messenger redirect URLs with offer and color metadata', () => {
    const url = buildAdminMessengerUrl({
      mode: 'make-offer',
      sku: 'LR-LV-014',
      colorName: 'Raw Umber Wool',
      proposedPrice: 4100,
      clientEmail: 'rowena.vance@vancearchitects.com',
    });
    assert.ok(url.startsWith('https://m.me/lilliarowenafurniture.admin?ref='));
    assert.ok(url.includes('lr-lv-014'));
    assert.ok(url.includes('offer-4100'));
    assert.ok(url.includes('client=rowena.vance%40vancearchitects.com'));
  });

  it('enforces single-customer, single-product Voucher redemption rules', () => {
    const validCheck = validateVoucherForOrder(
      INITIAL_VOUCHERS,
      'VCH-ROWENA-SOFA400',
      'rowena.vance@vancearchitects.com',
      ['furn-lv-01']
    );
    assert.equal(validCheck.valid, true);
    assert.equal(validCheck.discountAmount, 400);

    const wrongCustomer = validateVoucherForOrder(
      INITIAL_VOUCHERS,
      'VCH-ROWENA-SOFA400',
      'other@client.com',
      ['furn-lv-01']
    );
    assert.equal(wrongCustomer.valid, false);

    const wrongProduct = validateVoucherForOrder(
      INITIAL_VOUCHERS,
      'VCH-ROWENA-SOFA400',
      'rowena.vance@vancearchitects.com',
      ['furn-dn-01']
    );
    assert.equal(wrongProduct.valid, false);
  });

  it('filters catalog items by SKU and category and calculates order totals', () => {
    const matches = filterFurnitureItems(INITIAL_FURNITURE_ITEMS, 'LR-DN-108', 'all');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].sku, 'LR-DN-108');

    const pricing = calculateOrderPricing([{ unitPrice: 4365, quantity: 1 }], 400);
    assert.equal(pricing.rawSubtotal, 4365);
    assert.equal(pricing.subtotal, 3965);
    assert.equal(pricing.whiteGloveDeliveryFee, 250);
    assert.equal(pricing.totalAmount, 4215);

    const loginCheck = validateLoginCredentials('rowena.vance@vancearchitects.com', 'LR2026', 'client');
    assert.equal(loginCheck.valid, true);

    const prodCheck = validateNewFurnitureInput({
      name: 'Custom Messenger Dining Table',
      sku: 'LR-CUST-99',
      price: '3200',
      inStockCount: '2',
    });
    assert.equal(prodCheck.valid, true);
  });
});
