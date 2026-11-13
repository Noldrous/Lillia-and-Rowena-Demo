import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PRODUCT_TYPES,
  applyStockMovement,
  buildAdminMessengerUrl,
  buildProductRecord,
  buildSupplierRecord,
  calculateOrderPricing,
  computeInventoryMetrics,
  computeVariantPricing,
  filterFurnitureItems,
  getProductStockStatus,
  validateLoginCredentials,
  validateNewFurnitureInput,
  validateSupplierInput,
  validateVoucherForOrder,
  verifyAndCreateOrder,
} from './store.js';

const storeJsonPath = path.resolve(process.cwd(), 'data/store.json');
const storeData = JSON.parse(fs.readFileSync(storeJsonPath, 'utf8'));
const INITIAL_FURNITURE_ITEMS = storeData.products;
const INITIAL_VOUCHERS = storeData.vouchers;
const INITIAL_SUPPLIERS = storeData.suppliers || [];

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
    assert.ok(url.startsWith('https://www.messenger.com/t/100000505712325?ref='));
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
    assert.ok(
      wrongProduct.errorMessage.includes('This voucher is only valid for the selected product')
    );
  });

  it('applies percentage and fixed vouchers ONLY to the eligible product in a multi-item cart', () => {
    // Exact scenario: SAVE20 (20% off Office Chair at 5000, Office Desk at 3000, Monitor Stand at 1000)
    const save20Voucher = {
      id: 'vch-save20',
      code: 'SAVE20',
      customerEmail: 'rowena.vance@vancearchitects.com',
      furnitureId: 'prod-office-chair',
      furnitureName: 'Office Chair',
      discountType: 'percentage',
      discountPercent: 20,
      status: 'Active',
    };

    const mixedCart = [
      { productId: 'prod-office-chair', productName: 'Office Chair', unitPrice: 5000, quantity: 1 },
      { productId: 'prod-office-desk', productName: 'Office Desk', unitPrice: 3000, quantity: 1 },
      { productId: 'prod-monitor-stand', productName: 'Monitor Stand', unitPrice: 1000, quantity: 1 },
    ];

    const result = calculateOrderPricing(mixedCart, save20Voucher);
    assert.equal(result.rawSubtotal, 9000);
    assert.equal(result.eligibleSubtotal, 5000);
    assert.equal(result.nonEligibleSubtotal, 4000);
    assert.equal(result.voucherDiscountAmount, 1000); // 20% of 5000 only!
    assert.equal(result.subtotal, 8000);
    assert.equal(result.totalAmount, 8000);

    // Verify per-item breakdown: ONLY Office Chair gets discounted
    assert.equal(result.lineBreakdowns[0].isVoucherEligible, true);
    assert.equal(result.lineBreakdowns[0].lineDiscount, 1000);
    assert.equal(result.lineBreakdowns[0].finalLineTotal, 4000);

    assert.equal(result.lineBreakdowns[1].isVoucherEligible, false);
    assert.equal(result.lineBreakdowns[1].lineDiscount, 0);
    assert.equal(result.lineBreakdowns[1].finalLineTotal, 3000);

    assert.equal(result.lineBreakdowns[2].isVoucherEligible, false);
    assert.equal(result.lineBreakdowns[2].lineDiscount, 0);
    assert.equal(result.lineBreakdowns[2].finalLineTotal, 1000);

    // Fixed-amount voucher larger than eligible item must cap at eligible item price and NEVER discount other items
    const largeFixedVoucher = {
      id: 'vch-fixed-1500',
      code: 'CHAIR1500',
      customerEmail: 'rowena.vance@vancearchitects.com',
      furnitureId: 'prod-monitor-stand',
      furnitureName: 'Monitor Stand',
      discountType: 'fixed',
      discountAmount: 1500,
      status: 'Active',
    };
    const cappedResult = calculateOrderPricing(mixedCart, largeFixedVoucher);
    assert.equal(cappedResult.eligibleSubtotal, 1000);
    assert.equal(cappedResult.voucherDiscountAmount, 1000); // Capped at Monitor Stand's $1000, never spills into Chair/Desk!
    assert.equal(cappedResult.lineBreakdowns[0].finalLineTotal, 5000);
    assert.equal(cappedResult.lineBreakdowns[1].finalLineTotal, 3000);
    assert.equal(cappedResult.lineBreakdowns[2].finalLineTotal, 0);
    assert.equal(cappedResult.subtotal, 8000);
  });

  it('recalculates voucher discount on server/store checkout and prevents unauthorized product manipulation', () => {
    const customVouchers = [
      ...INITIAL_VOUCHERS,
      {
        id: 'vch-chair20',
        code: 'SAVE20',
        customerEmail: 'rowena.vance@vancearchitects.com',
        furnitureId: 'furn-lv-02', // Cavana Sculpted White Oak Lounge Chair ($1680)
        furnitureName: 'Cavana Sculpted White Oak Lounge Chair',
        discountType: 'percentage',
        discountPercent: 20,
        status: 'Active',
      },
    ];

    // 1. Rejects checkout if voucher's product is not in the cart
    const rejectedOrder = verifyAndCreateOrder({
      catalog: INITIAL_FURNITURE_ITEMS,
      vouchers: customVouchers,
      customerProfile: { name: 'Rowena Vance', email: 'rowena.vance@vancearchitects.com' },
      cartItems: [{ productId: 'furn-of-02', quantity: 1 }], // Writing Desk ($2150) only
      voucherCode: 'SAVE20',
    });
    assert.equal(rejectedOrder.ok, false);
    assert.ok(
      rejectedOrder.errorMessage.includes('This voucher is only valid for the selected product')
    );

    // 2. Applies 20% discount ONLY to furn-lv-02 ($1680 -> $1344, -$336) while furn-of-02 ($2150) and furn-lv-03 ($2350) stay untouched
    const validOrder = verifyAndCreateOrder({
      catalog: INITIAL_FURNITURE_ITEMS,
      vouchers: customVouchers,
      customerProfile: { name: 'Rowena Vance', email: 'rowena.vance@vancearchitects.com' },
      cartItems: [
        { productId: 'furn-lv-02', unitPrice: 10, quantity: 1 }, // Client tampered price (10) is ignored in favor of catalog $1680
        { productId: 'furn-of-02', quantity: 1 }, // $2150
        { productId: 'furn-lv-03', quantity: 1 }, // $2350
      ],
      voucherCode: 'SAVE20',
    });
    assert.equal(validOrder.ok, true);
    assert.equal(validOrder.pricing.rawSubtotal, 1680 + 2150 + 2350); // 6180
    assert.equal(validOrder.pricing.voucherDiscountAmount, 336); // 20% of 1680 only
    assert.equal(validOrder.pricing.subtotal, 5844);
    assert.equal(validOrder.order.totalAmount, 5844);
  });

  it('separates Normal Product and Customized Product (Messenger) creation while keeping BOTH publicly visible and purchasable by all customers', () => {
    // Option A: Normal Product added by Admin
    const normalProduct = buildProductRecord({
      productType: PRODUCT_TYPES.NORMAL,
      name: 'Atelier Solid Ash Bench',
      sku: 'LR-LV-088',
      categoryId: 'living',
      price: 1850,
      discountPercent: 0,
      dimensions: '180cm W × 45cm D × 44cm H',
      colorsRaw: 'Natural Ash|#D9C7AE|0, Ebonized Ash|#222428|150',
    });

    assert.equal(normalProduct.productType, 'standard');
    assert.equal(normalProduct.origin, 'Admin');
    assert.equal(normalProduct.isCustomClientDesign, false);
    assert.equal(normalProduct.publiclyVisible, true);
    assert.equal(normalProduct.canBePurchased, true);
    assert.equal(normalProduct.adminEditable, true);
    assert.equal(normalProduct.customClientEmail, null);

    // Option B: Customized Product (Messenger) associated with a customer's Messenger conversation
    const customizedProduct = buildProductRecord({
      productType: PRODUCT_TYPES.CUSTOMIZED,
      name: 'Rowena Custom 300cm Walnut Monolith Table',
      sku: 'LR-CUST-300',
      categoryId: 'dining',
      price: 5200,
      discountPercent: 10,
      dimensions: '300cm L × 115cm W × 75cm H',
      messengerConversationId: 'msg-thread-101',
      messengerCustomerName: 'Rowena Vance',
      messengerTopic: 'Custom 300cm Monolith Walnut Conference & Dining Slab',
      customizationNotes: 'Extended 300cm single-slab walnut top with brass floor-box cable grommets.',
      colorsRaw: 'Hand-Rubbed Natural Walnut|#5C3A21|0',
    });

    assert.equal(customizedProduct.productType, 'customized');
    assert.equal(customizedProduct.origin, 'Messenger customization');
    assert.equal(customizedProduct.isCustomClientDesign, true);
    assert.equal(customizedProduct.publiclyVisible, true);
    assert.equal(customizedProduct.canBePurchased, true);
    assert.equal(customizedProduct.adminEditable, true);
    assert.equal(customizedProduct.customClientEmail, null); // Never exclusive/private to the requesting customer!
    assert.equal(customizedProduct.messengerConversationId, 'msg-thread-101');
    assert.equal(customizedProduct.effectivePrice, 4680);

    // Both products appear in the public Shop/Product Catalog filter for ALL customers
    const combinedCatalog = [customizedProduct, normalProduct, ...INITIAL_FURNITURE_ITEMS];
    const allPublicItems = filterFurnitureItems(combinedCatalog, '', 'all');
    assert.equal(allPublicItems.length, combinedCatalog.length);
    assert.ok(allPublicItems.some((p) => p.sku === 'LR-LV-088'));
    assert.ok(allPublicItems.some((p) => p.sku === 'LR-CUST-300'));

    // Any customer (even one who did not request the customization) can purchase the Customized Product
    const purchaseByOtherCustomer = verifyAndCreateOrder({
      catalog: combinedCatalog,
      vouchers: INITIAL_VOUCHERS,
      customerProfile: { name: 'Elena Rostova', email: 'elena@rostovainteriors.com' },
      cartItems: [
        { productId: customizedProduct.id, quantity: 1 },
        { productId: normalProduct.id, quantity: 1 },
      ],
      voucherCode: '',
    });
    assert.equal(purchaseByOtherCustomer.ok, true);
    assert.equal(purchaseByOtherCustomer.pricing.rawSubtotal, 4680 + 1850);

    // Admin can edit both Normal and Customized products
    const editedCustomized = buildProductRecord(
      {
        ...customizedProduct,
        price: 5400,
        discountPercent: 0,
      },
      customizedProduct
    );
    assert.equal(editedCustomized.id, customizedProduct.id);
    assert.equal(editedCustomized.effectivePrice, 5400);
    assert.equal(editedCustomized.productType, 'customized');
    assert.equal(editedCustomized.publiclyVisible, true);
  });

  it('validates and builds Supplier records with multiple associated products', () => {
    const invalidSupplier = validateSupplierInput({
      name: 'A',
      contactPerson: '',
      phone: '12',
      address: 'Short',
    });
    assert.equal(invalidSupplier.valid, false);
    assert.ok(invalidSupplier.errorMessage.includes('Supplier Name'));

    const validInput = {
      name: 'Nordic Joinery & Brass Co.',
      contactPerson: 'Soren Lindqvist',
      phone: '+45 33 14 22 89',
      address: 'Bredgade 45, 1260 København K, Denmark',
      productIds: ['furn-lv-01', 'furn-dn-01', 'furn-lv-01'],
    };
    const validCheck = validateSupplierInput(validInput);
    assert.equal(validCheck.valid, true);

    const record = buildSupplierRecord(validInput);
    assert.equal(record.name, 'Nordic Joinery & Brass Co.');
    assert.equal(record.contactPerson, 'Soren Lindqvist');
    assert.deepEqual(record.productIds, ['furn-lv-01', 'furn-dn-01']);

    const updatedRecord = buildSupplierRecord(
      {
        ...validInput,
        contactPerson: 'Freja Lindqvist',
        productIds: ['furn-lv-01', 'furn-dn-01', 'furn-of-01'],
      },
      record
    );
    assert.equal(updatedRecord.id, record.id);
    assert.equal(updatedRecord.contactPerson, 'Freja Lindqvist');
    assert.equal(updatedRecord.productIds.length, 3);
  });

  it('computes Inventory Overview KPIs and enforces Stock In / Stock Out movement rules and checkout stock limits', () => {
    const sampleCatalog = [
      { id: 'p-1', sku: 'SKU-1', name: 'Sofa', inStockCount: 6, minStockLevel: 2 },
      { id: 'p-2', sku: 'SKU-2', name: 'Table', inStockCount: 2, minStockLevel: 2 }, // Low Stock
      { id: 'p-3', sku: 'SKU-3', name: 'Lamp', inStockCount: 0, minStockLevel: 3 }, // Out of Stock
    ];

    const metrics = computeInventoryMetrics(sampleCatalog);
    assert.equal(metrics.totalProducts, 3);
    assert.equal(metrics.totalStockAvailable, 8);
    assert.equal(metrics.lowStockCount, 1);
    assert.equal(metrics.outOfStockCount, 1);

    assert.equal(getProductStockStatus(sampleCatalog[0]).status, 'in_stock');
    assert.equal(getProductStockStatus(sampleCatalog[1]).status, 'low_stock');
    assert.equal(getProductStockStatus(sampleCatalog[2]).status, 'out_of_stock');

    // 1. Stock In increases available stock and records supplier + purchase cost
    const stockInResult = applyStockMovement({
      catalog: sampleCatalog,
      suppliers: INITIAL_SUPPLIERS,
      productId: 'p-3',
      transactionType: 'Stock In',
      quantity: 5,
      supplierId: 'sup-101',
      purchaseCost: 450,
      date: '2026-06-01',
      adminName: 'Lillia & Rowena Admin',
    });
    assert.equal(stockInResult.ok, true);
    assert.equal(stockInResult.updatedProduct.inStockCount, 5);
    assert.equal(stockInResult.transaction.previousStock, 0);
    assert.equal(stockInResult.transaction.newStock, 5);
    assert.equal(stockInResult.transaction.supplierName, 'Appalachian FAS Timber Co.');
    assert.equal(stockInResult.transaction.purchaseCost, 450);

    // 2. Stock Out deducts available stock when sufficient and records reason
    const stockOutResult = applyStockMovement({
      catalog: stockInResult.updatedCatalog,
      suppliers: INITIAL_SUPPLIERS,
      productId: 'p-1',
      transactionType: 'Stock Out',
      quantity: 2,
      reason: 'Damaged',
      date: '2026-06-02',
      adminName: 'Lillia & Rowena Admin',
    });
    assert.equal(stockOutResult.ok, true);
    assert.equal(stockOutResult.updatedProduct.inStockCount, 4);
    assert.equal(stockOutResult.transaction.previousStock, 6);
    assert.equal(stockOutResult.transaction.newStock, 4);
    assert.equal(stockOutResult.transaction.reason, 'Damaged');

    // 3. Stock Out prevents deducting more than available stock (no negative stock allowed)
    const excessiveStockOut = applyStockMovement({
      catalog: stockOutResult.updatedCatalog,
      suppliers: INITIAL_SUPPLIERS,
      productId: 'p-2', // Only 2 available
      transactionType: 'Stock Out',
      quantity: 5,
      reason: 'Adjustment',
    });
    assert.equal(excessiveStockOut.ok, false);
    assert.ok(excessiveStockOut.errorMessage.includes('Cannot deduct 5 units'));

    // 4. Customer checkout rejects purchasing more than available stock and deducts stock on valid checkout
    const overStockOrder = verifyAndCreateOrder({
      catalog: INITIAL_FURNITURE_ITEMS,
      vouchers: INITIAL_VOUCHERS,
      customerProfile: { name: 'Rowena Vance', email: 'rowena.vance@vancearchitects.com' },
      cartItems: [{ productId: 'furn-dn-01', quantity: 99 }], // Only 2 in stock
      voucherCode: '',
    });
    assert.equal(overStockOrder.ok, false);
    assert.ok(overStockOrder.errorMessage.includes('available in stock'));
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

    const missingImageCheck = validateNewFurnitureInput({
      name: 'Custom Messenger Dining Table',
      sku: 'LR-CUST-99',
      price: '3200',
      inStockCount: '2',
      productType: 'customized',
      image: '',
    });
    assert.equal(missingImageCheck.valid, false);
    assert.ok(missingImageCheck.errorMessage.includes('Product image is required'));

    const prodCheck = validateNewFurnitureInput({
      name: 'Custom Messenger Dining Table',
      sku: 'LR-CUST-99',
      price: '3200',
      inStockCount: '2',
      productType: 'customized',
      image: 'assets/images/category_dining_tables.jpg',
    });
    assert.equal(prodCheck.valid, true);

    const createdWithImage = buildProductRecord({
      name: 'Custom Messenger Dining Table',
      sku: 'LR-CUST-99',
      price: 3200,
      image: 'assets/images/category_dining_tables.jpg',
    });
    assert.equal(createdWithImage.image, 'assets/images/category_dining_tables.jpg');

    const editedWithNewImage = buildProductRecord(
      {
        ...createdWithImage,
        image: 'assets/images/hero_living_room_atelier.jpg',
      },
      createdWithImage
    );
    assert.equal(editedWithNewImage.image, 'assets/images/hero_living_room_atelier.jpg');
  });
});



