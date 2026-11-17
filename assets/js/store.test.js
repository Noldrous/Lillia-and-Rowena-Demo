import { computeMonthlyAnalyticsReport, resolveAnalyticsDateRange, buildAnalyticsCsvContent, buildAnalyticsPdfBytes, computePercentageChange } from './analytics.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PRODUCT_TYPES,
  applyAdminOrderUpdate,
  applyMaterialStockMovement,
  applyStockMovement,
  buildAdminMessengerUrl,
  buildMaterialRecord,
  buildProductRecord,
  buildRequestDesignMessengerUrl,
  calculateExpirationFromInput,
  calculateOrderPricing,
  computeCustomerDirectory,
  computeInventoryMetrics,
  computeMaterialInventoryMetrics,
  computeVariantPricing,
  computeVoucherStatusInfo,
  createCustomOrderRequest,
  describeMaterialStockPreview,
  filterCatalogPageItems,
  filterCustomerVouchers,
  filterFurnitureItems,
  filterInventoryMaterials,
  findMatchingColorVariant,
  formatCustomerProductDisplay,
  formatSimplifiedProductCardData,
  formatVoucherBenefitLabel,
  formatVoucherExpiryDisplay,
  formatVoucherIssuedDisplay,
  generateOwnEntityId,
  getColorFilterCounts,
  getCompletedTransactionsForCustomer,
  getMaterialCategories,
  getMaterialStockStatus,
  getProductStockStatus,
  getRecommendedBestSellers,
  isOrderCompleted,
  paginateItems,
  partitionOrdersByCompletion,
  recordCustomerOrderPayment,
  removeMaterialFromInventory,
  removeProductFromCatalog,
  requestOrderCancellation,
  resolveAuthNavigationState,
  resolveCustomerAvatarState,
  resolveOrderCancellationRequest,
  revokeVoucherInList,
  validateAndBuildOfferProposal,
  validateAndCreateVoucher,
  validateLoginCredentials,
  validateMaterialInput,
  validateNewFurnitureInput,
  validateVoucherForOrder,
  verifyAndCreateOrder,
} from './store.js';

function loadSeedFromPhp() {
  const php = fs.readFileSync(path.resolve(process.cwd(), 'src/Library/Database.php'), 'utf8');
  const start = php.indexOf('public static function getDefaultStore()');
  const retIdx = php.indexOf('return [', start);
  const body = php.slice(retIdx + 7, php.lastIndexOf('];') + 1);
  const stack = [];
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "'") {
      out += ch;
      i++;
      while (i < body.length && body[i] !== "'") {
        if (body[i] === '\\') out += body[i++];
        out += body[i++];
      }
      out += "'";
    } else if (ch === '[') {
      const rest = body.slice(i + 1);
      const isObj = /^\s*'[^']*'\s*=>/.test(rest);
      stack.push(isObj ? '}' : ']');
      out += isObj ? '{' : '[';
    } else if (ch === ']') {
      out += stack.pop() || ']';
    } else if (ch === '=' && body[i + 1] === '>') {
      out += ':';
      i++;
    } else {
      out += ch;
    }
  }
  return Function(`"use strict"; return (${out});`)();
}

const storeData = loadSeedFromPhp();
const INITIAL_STORE_DATA = storeData;
const INITIAL_CATEGORIES = storeData.categories || [];
const INITIAL_FURNITURE_ITEMS = storeData.products || [];
const INITIAL_VOUCHERS = storeData.vouchers || [];
const INITIAL_MATERIALS = storeData.materials || [];

describe('Pure JavaScript & Server Store Logic Tests', () => {
  it('defines the 5 showroom categories: Living Room, Dining Room, Bedroom, Study/Work Desks, and Kitchen', () => {
    assert.equal(INITIAL_CATEGORIES.length, 5);
    assert.deepEqual(
      INITIAL_CATEGORIES.map((c) => c.name),
      ['Living Room', 'Dining Room', 'Bedroom', 'Study/Work Desks', 'Kitchen']
    );
  });

  it('returns 4 Recommended / Best Seller furniture pieces by default', () => {
    const recommended = getRecommendedBestSellers(INITIAL_FURNITURE_ITEMS, 4);
    assert.equal(recommended.length, 4);
    assert.ok(recommended.every((item) => item.isBestSeller === true));
  });

  it('filters catalog page products by left-sidebar color and price range', () => {
    const travertineItems = filterCatalogPageItems(INITIAL_FURNITURE_ITEMS, {
      categoryId: 'all',
      colorKey: 'travertine',
    });
    assert.equal(travertineItems.length, 2);
    assert.ok(travertineItems.every((item) => findMatchingColorVariant(item, 'travertine') !== null));

    const indigoItems = filterCatalogPageItems(INITIAL_FURNITURE_ITEMS, {
      categoryId: 'all',
      colorKey: 'indigo',
    });
    assert.equal(indigoItems.length, 1);
    assert.equal(indigoItems[0].id, 'furn-lv-01');

    const colorCounts = getColorFilterCounts(INITIAL_FURNITURE_ITEMS, 'all');
    const walnutEntry = colorCounts.find((c) => c.key === 'walnut');
    assert.ok(walnutEntry && walnutEntry.count > 0);
  });

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
    assert.equal(result.voucherDiscountAmount, 1000);
    assert.equal(result.subtotal, 8000);
    assert.equal(result.totalAmount, 8000);

    assert.equal(result.lineBreakdowns[0].isVoucherEligible, true);
    assert.equal(result.lineBreakdowns[0].lineDiscount, 1000);
    assert.equal(result.lineBreakdowns[0].finalLineTotal, 4000);

    assert.equal(result.lineBreakdowns[1].isVoucherEligible, false);
    assert.equal(result.lineBreakdowns[1].lineDiscount, 0);
    assert.equal(result.lineBreakdowns[1].finalLineTotal, 3000);

    assert.equal(result.lineBreakdowns[2].isVoucherEligible, false);
    assert.equal(result.lineBreakdowns[2].lineDiscount, 0);
    assert.equal(result.lineBreakdowns[2].finalLineTotal, 1000);
  });

  it('validates and builds raw Materials (Material table) for the workshop', () => {
    const matInput = {
      name: 'FAS European Beech Timber',
      materialType: 'Solid Timber',
      unit: 'bd ft',
      unitCost: 24,
      stockQuantity: 90,
      minStockLevel: 25,
    };
    assert.equal(validateMaterialInput(matInput).valid, true);
    const matRecord = buildMaterialRecord(matInput);
    assert.equal(matRecord.name, 'FAS European Beech Timber');
    assert.equal(matRecord.unit, 'bd ft');
    assert.equal(matRecord.stockQuantity, 90);
    assert.equal(getMaterialStockStatus(matRecord).statusKey, 'in_stock');
  });

  it('computes Workshop Raw Material Inventory metrics and enforces Material Stock In and Stock Out', () => {
    const metrics = computeMaterialInventoryMetrics(INITIAL_MATERIALS);
    assert.equal(metrics.totalMaterials, 8);
    assert.equal(metrics.inStockCount, 7);
    assert.ok(metrics.totalStockAvailable > 500);
    assert.equal(metrics.lowStockCount, 1); // mat-103 (28 bd ft <= min 35)
    assert.equal(metrics.outOfStockCount, 0);
    assert.ok(metrics.totalInventoryValue > 20000);

    // 1. Material Stock In increases raw material StockQuantity
    const stockInRes = applyMaterialStockMovement({
      materials: INITIAL_MATERIALS,
      materialId: 'mat-103', // Kiln-Dried European Ash Timber (28 bd ft)
      transactionType: 'Stock In',
      quantity: 40,
      purchaseCost: 760,
      date: '2026-11-12',
      adminName: 'Lillia Mercier',
    });
    assert.equal(stockInRes.ok, true);
    assert.equal(stockInRes.updatedMaterial.stockQuantity, 68);
    assert.equal(stockInRes.transaction.previousStock, 28);
    assert.equal(stockInRes.transaction.newStock, 68);
    assert.equal(stockInRes.transaction.reason, 'Workshop Raw Material Restock');

    // 2. Material Stock Out deducts raw material used in workshop production
    const stockOutRes = applyMaterialStockMovement({
      materials: stockInRes.updatedMaterials,
      materialId: 'mat-101', // FAS American Black Walnut Slabs (180 bd ft)
      transactionType: 'Stock Out',
      quantity: 30,
      reason: 'Workshop Production (Order #ORD-2026-8841)',
      date: '2026-11-12',
      adminName: 'Mateo Cruz',
    });
    assert.equal(stockOutRes.ok, true);
    assert.equal(stockOutRes.updatedMaterial.stockQuantity, 150);

    // 3. Prevents deducting more raw material than available in workshop stock
    const excessiveOut = applyMaterialStockMovement({
      materials: stockOutRes.updatedMaterials,
      materialId: 'mat-106', // Honed Roman Travertine Blocks (only 6 slabs)
      transactionType: 'Stock Out',
      quantity: 20,
      reason: 'Workshop Production',
    });
    assert.equal(excessiveOut.ok, false);
    assert.ok(excessiveOut.errorMessage.includes('Cannot deduct 20 slabs'));
  });

  it('filters inventory materials by search query, category, and stock status, and paginates results', () => {
    const categories = getMaterialCategories(INITIAL_MATERIALS);
    assert.ok(categories.includes('Solid Timber'));
    assert.ok(categories.includes('Upholstery Textile'));

    const timberMaterials = filterInventoryMaterials(INITIAL_MATERIALS, {
      category: 'Solid Timber',
    });
    assert.equal(timberMaterials.length, 3);

    const lowStockMaterials = filterInventoryMaterials(INITIAL_MATERIALS, {
      status: 'low_stock',
    });
    assert.equal(lowStockMaterials.length, 1);
    assert.equal(lowStockMaterials[0].id, 'mat-103');

    const searchWalnut = filterInventoryMaterials(INITIAL_MATERIALS, {
      searchQuery: 'walnut',
    });
    assert.equal(searchWalnut.length, 1);
    assert.equal(searchWalnut[0].id, 'mat-101');

    const page1 = paginateItems(INITIAL_MATERIALS, 1, 5);
    assert.equal(page1.items.length, 5);
    assert.equal(page1.totalPages, 2);
    assert.equal(page1.startIndex, 1);
    assert.equal(page1.endIndex, 5);

    const page2 = paginateItems(INITIAL_MATERIALS, 2, 5);
    assert.equal(page2.items.length, 3);
    assert.equal(page2.startIndex, 6);
    assert.equal(page2.endIndex, 8);

    const customerDir = computeCustomerDirectory(INITIAL_STORE_DATA.orders);
    assert.ok(customerDir.length >= 4);
    assert.ok(customerDir.some((c) => c.email === 'rowena.vance@vancearchitects.com'));
  });

  it('creates Custom Orders with workshop material allocation and syncs Admin order updates & customer payments', () => {
    const customRes = createCustomOrderRequest({
      catalog: INITIAL_FURNITURE_ITEMS,
      materials: INITIAL_MATERIALS,
      customerProfile: {
        name: 'Rowena Vance',
        email: 'rowena.vance@vancearchitects.com',
        address: 'Suite 400, 118 Mercer St',
        city: 'New York, NY',
      },
      customInput: {
        productId: 'furn-dn-01',
        materialId: 'mat-101',
        lengthCm: 280,
        widthCm: 115,
        heightCm: 76,
        colorFinish: 'Hand-Rubbed Natural Walnut',
        quantity: 1,
        notes: 'Custom 280cm conference table with brass cable grommets.',
      },
    });
    assert.equal(customRes.ok, true);
    assert.equal(customRes.order.itemType, 'Custom');
    assert.equal(customRes.order.materialId, 'mat-101');
    assert.ok(customRes.order.extraCost > 0);
    assert.ok(customRes.updatedMaterial.stockQuantity < 180);

    // Admin updates order status, assigned craftsperson, and delivery status
    const updatedByAdmin = applyAdminOrderUpdate(customRes.order, {
      status: 'Quality Inspection · Ready for Dispatch',
      assignedCraftsperson: 'Soren Henriksen',
      deliveryStatus: 'InTransit',
      driverName: 'Devon Vance',
    });
    assert.equal(updatedByAdmin.assignedCraftsperson, 'Soren Henriksen');
    assert.equal(updatedByAdmin.deliveryStatus, 'InTransit');
    assert.equal(updatedByAdmin.taskStatus, 'Done');

    // Customer pays remaining 50% balance
    const paidOrder = recordCustomerOrderPayment(updatedByAdmin);
    assert.equal(paidOrder.depositPaid, paidOrder.totalAmount);
    assert.equal(paidOrder.paymentStatus, 'Paid in Full');
  });

  it('filters catalog items by SKU and category and validates product & login inputs', () => {
    const matches = filterFurnitureItems(INITIAL_FURNITURE_ITEMS, 'LR-DN-108', 'all');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].sku, 'LR-DN-108');

    const kitchenMatches = filterFurnitureItems(INITIAL_FURNITURE_ITEMS, '', 'kitchen');
    assert.equal(kitchenMatches.length, 2);

    const loginCheck = validateLoginCredentials('rowena.vance@vancearchitects.com', 'LR2026', 'client');
    assert.equal(loginCheck.valid, true);

    const prodCheck = validateNewFurnitureInput({
      name: 'Custom Walnut Dining Table',
      sku: 'LR-CUST-99',
      price: '3200',
      inStockCount: '2',
      productType: 'customized',
      image: 'assets/images/category_dining_tables.jpg',
    });
    assert.equal(prodCheck.valid, true);

    const lowPriceCheck = validateNewFurnitureInput({
      name: 'Custom Walnut Dining Table',
      sku: 'LR-CUST-99',
      price: '10',
      inStockCount: '2',
      productType: 'customized',
      image: 'assets/images/category_dining_tables.jpg',
    });
    assert.equal(lowPriceCheck.valid, false);
    assert.equal(lowPriceCheck.errorMessage, 'Base Price must be at least $50.');
    assert.equal(formatVoucherBenefitLabel({ discountType: 'fixed', discountAmount: 300 }), '$300 OFF');
  });

  it('removes products from the catalog and cleans up associated cart items and vouchers', () => {
    const sampleCart = [
      { productId: 'furn-lv-01', quantity: 1 },
      { productId: 'furn-dn-01', quantity: 1 },
    ];
    const removeRes = removeProductFromCatalog({
      catalog: INITIAL_FURNITURE_ITEMS,
      cartItems: sampleCart,
      vouchers: INITIAL_VOUCHERS,
      productId: 'furn-lv-01',
    });
    assert.equal(removeRes.ok, true);
    assert.equal(removeRes.removedProduct.id, 'furn-lv-01');
    assert.equal(removeRes.updatedCatalog.length, INITIAL_FURNITURE_ITEMS.length - 1);
    assert.equal(removeRes.updatedCatalog.some((p) => p.id === 'furn-lv-01'), false);
    assert.equal(removeRes.updatedCartItems.length, 1);
    assert.equal(removeRes.updatedCartItems[0].productId, 'furn-dn-01');

    const matRemRes = removeMaterialFromInventory({
      materials: INITIAL_MATERIALS,
      materialId: 'mat-101',
    });
    assert.equal(matRemRes.ok, true);
    assert.equal(matRemRes.updatedMaterials.length, INITIAL_MATERIALS.length - 1);

    const previewIn = describeMaterialStockPreview(INITIAL_MATERIALS[0], 'Stock In', 10);
    assert.equal(previewIn.projectedStock, INITIAL_MATERIALS[0].stockQuantity + 10);
    assert.equal(previewIn.insufficientStock, false);
    assert.equal(previewIn.projectedFriendlyLabel, 'Plenty in stock');

    const previewOutOver = describeMaterialStockPreview(INITIAL_MATERIALS[0], 'Stock Out', 9999);
    assert.equal(previewOutOver.insufficientStock, true);
    assert.equal(previewOutOver.projectedStatusKey, 'out_of_stock');
  });

  it('formats customer-facing product displays with only customer-relevant information and omits SKU/internal IDs', () => {
    const sofa = INITIAL_FURNITURE_ITEMS[0]; // Rowena Curved Bouclé Lounge Sofa, SKU LR-LV-014, ID furn-lv-01
    const display = formatCustomerProductDisplay(sofa, 'Alabaster Heavy Linen / Smoked Oak');

    assert.equal(display.name, 'Rowena Curved Bouclé Lounge Sofa');
    assert.equal(display.categoryName, 'Living Room');
    assert.equal(display.image, 'assets/images/category_living_lounge.jpg');
    assert.equal(display.selectedFinish, 'Alabaster Heavy Linen / Smoked Oak');
    assert.equal(display.effectivePrice, Math.round(5070 * 0.9));
    assert.equal(display.availabilityLabel, 'In Stock');
    assert.ok(display.availabilityDetail.includes('available'));
    assert.ok(display.colorVariants.length >= 3);

    // Internal technical identifiers are omitted from the customer display object
    assert.equal('sku' in display, false);
    assert.equal('id' in display, false);
    assert.equal('messengerConversationId' in display, false);
  });

  it('resolves authentication-based navigation visibility for logged-out visitors, logged-in customers, and admins', () => {
    const guestState = resolveAuthNavigationState(null);
    assert.equal(guestState.isAuthenticated, false);
    assert.equal(guestState.showSignIn, true);
    assert.equal(guestState.showRegister, true);
    assert.equal(guestState.showCustomerAccountNav, false);
    assert.equal(guestState.showAdminNav, false);
    assert.equal(guestState.cartCheckoutCta.label, 'Sign In to Checkout →');

    const customerState = resolveAuthNavigationState({
      email: 'rowena.vance@vancearchitects.com',
      name: 'Rowena Vance',
      role: 'client',
    });
    assert.equal(customerState.isAuthenticated, true);
    assert.equal(customerState.showSignIn, false);
    assert.equal(customerState.showRegister, false);
    assert.equal(customerState.showLoginPrompts, false);
    assert.equal(customerState.showCustomerAccountNav, true);
    assert.equal(customerState.showAdminNav, false);
    assert.equal(customerState.userDisplayName, 'Rowena Vance');
    assert.equal(customerState.userInitials, 'RV');
    assert.equal(customerState.accountLinks.myAccount.href, 'dashboard.html?role=client&tab=home');
    assert.equal(customerState.accountLinks.myOrders.href, 'dashboard.html?role=client&tab=orders');
    assert.equal(customerState.cartCheckoutCta.label, 'Proceed to Checkout →');

    const adminState = resolveAuthNavigationState({
      email: 'admin@lilliarowena.com',
      name: 'Lillia Mercier (Business Owner)',
      role: 'admin',
    });
    assert.equal(adminState.isAuthenticated, true);
    assert.equal(adminState.showSignIn, false);
    assert.equal(adminState.showRegister, false);
    assert.equal(adminState.showCustomerAccountNav, false);
    assert.equal(adminState.showAdminNav, true);
    assert.equal(adminState.accountLinks.adminDashboard.href, 'dashboard.html?role=admin');
  });

  it('validates Make Offer inputs, generates Offer Proposal metadata without altering catalog prices, and resolves Request a Design Messenger redirects', () => {
    const product = { ...INITIAL_FURNITURE_ITEMS[0] };
    const originalCatalogPrice = product.price;
    const originalStock = product.inStockCount;

    const invalidOffer = validateAndBuildOfferProposal({ proposedPrice: 0 }, product, null);
    assert.equal(invalidOffer.ok, false);
    assert.ok(invalidOffer.errorMessage.includes('valid proposed price'));

    const sessionUser = {
      name: 'Rowena Vance',
      email: 'rowena.vance@vancearchitects.com',
      role: 'client',
    };
    const validOffer = validateAndBuildOfferProposal(
      {
        proposedPrice: 3950,
        selectedFinish: 'Warm Oat Bouclé / Natural Oak',
        customizations: 'Custom 240cm length with smoked oak plinth',
        additionalNotes: 'Ground floor elevator access available',
        referenceImageDataUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        referenceImageName: 'living-room-sketch.png',
      },
      product,
      sessionUser
    );
    assert.equal(validOffer.ok, true);
    assert.equal(validOffer.proposal.productName, 'Rowena Curved Bouclé Lounge Sofa');
    assert.equal(validOffer.proposal.proposedPrice, 3950);
    assert.equal(product.price, originalCatalogPrice);
    assert.equal(product.inStockCount, originalStock);

    const guestDesignReq = buildRequestDesignMessengerUrl(null);
    assert.equal(guestDesignReq.requiresLogin, true);
    assert.equal(guestDesignReq.redirectUrl, 'login.html?redirect=request-design');

    const loggedInDesignReq = buildRequestDesignMessengerUrl(sessionUser);
    assert.equal(loggedInDesignReq.requiresLogin, false);
    assert.ok(loggedInDesignReq.redirectUrl.startsWith('https://www.messenger.com/t/100000505712325'));
  });

  it('resolves customer profile picture state with initials fallback and preserves avatar in customer directory', () => {
    const fallbackAvatar = resolveCustomerAvatarState({ name: 'Rowena Vance', avatar: '' });
    assert.equal(fallbackAvatar.hasAvatar, false);
    assert.equal(fallbackAvatar.initials, 'RV');

    const uploadedAvatar = resolveCustomerAvatarState({
      name: 'Rowena Vance',
      avatar: '/assets/images/profile_rowena.jpg',
    });
    assert.equal(uploadedAvatar.hasAvatar, true);
    assert.equal(uploadedAvatar.avatarSrc, 'assets/images/profile_rowena.jpg');
    assert.equal(uploadedAvatar.initials, 'RV');

    const directory = computeCustomerDirectory(
      [],
      [],
      {
        name: 'Rowena Vance',
        email: 'rowena.vance@vancearchitects.com',
        phone: '+1 (212) 555-0148',
        address: 'Suite 400, 118 Mercer St',
        city: 'New York, NY 10013',
        avatar: 'assets/images/profile_rowena.jpg',
      }
    );
    assert.equal(directory.length, 1);
    assert.equal(directory[0].avatar, 'assets/images/profile_rowena.jpg');
  });

  it('queues customer order cancellation requests for Admin approval and allows Admin to approve or decline', () => {
    const sampleOrders = [
      {
        orderNumber: 'LR-2026-9901',
        clientName: 'Rowena Vance',
        clientEmail: 'rowena.vance@vancearchitects.com',
        furnitureName: 'Rowena Curved Bouclé Lounge Sofa',
        status: 'Order Confirmed · In Production Queue',
        sqlStatus: 'Pending',
        totalAmount: 4365,
      },
    ];

    const reqRes = requestOrderCancellation({
      orders: sampleOrders,
      orderNumber: 'LR-2026-9901',
    });
    assert.equal(reqRes.ok, true);
    assert.equal(reqRes.updatedOrder.cancellationRequested, true);
    assert.equal(reqRes.updatedOrder.cancellationStatus, 'Pending Admin Approval');

    const declineRes = resolveOrderCancellationRequest({
      orders: reqRes.updatedOrders,
      orderNumber: 'LR-2026-9901',
      decision: 'decline',
    });
    assert.equal(declineRes.ok, true);
    assert.equal(declineRes.decision, 'declined');
    assert.equal(declineRes.updatedOrder.cancellationRequested, false);

    const secondReq = requestOrderCancellation({
      orders: declineRes.updatedOrders,
      orderNumber: 'LR-2026-9901',
    });
    const approveRes = resolveOrderCancellationRequest({
      orders: secondReq.updatedOrders,
      orderNumber: 'LR-2026-9901',
      decision: 'approve',
    });
    assert.equal(approveRes.ok, true);
    assert.equal(approveRes.decision, 'approved');
    assert.equal(approveRes.updatedOrder.sqlStatus, 'Cancelled');
  });

  it('marks an order as Completed when confirmed by Admin and adds it to the customer Completed Transactions', () => {
    const sampleOrders = [
      {
        orderNumber: 'ORD-2026-8841',
        clientName: 'Rowena Vance',
        clientEmail: 'rowena.vance@vancearchitects.com',
        furnitureName: 'Lillia Solid Walnut Dining Table (Custom Spec)',
        selectedFinish: 'Hand-Rubbed Natural Walnut',
        status: 'In Joinery & Millwork',
        sqlStatus: 'InProduction',
        totalAmount: 4256,
        depositPaid: 2128,
        orderDate: '2026-10-28',
      },
      {
        orderNumber: 'ORD-2026-8834',
        clientName: 'Rowena Vance',
        clientEmail: 'rowena.vance@vancearchitects.com',
        furnitureName: 'Rowena Curved Bouclé Lounge Sofa',
        selectedFinish: 'Warm Oat Bouclé / Natural Oak',
        status: 'Quality Inspection · Ready for Dispatch',
        sqlStatus: 'Ready',
        totalAmount: 4365,
        depositPaid: 4365,
        orderDate: '2026-10-14',
      },
    ];

    const initialPartition = partitionOrdersByCompletion(sampleOrders);
    assert.equal(initialPartition.activeOrders.length, 2);
    assert.equal(initialPartition.completedOrders.length, 0);

    const completeRes = applyAdminOrderUpdate({
      orders: sampleOrders,
      orderNumber: 'ORD-2026-8841',
      updates: { status: 'Delivered · Completed' },
    });
    assert.equal(completeRes.ok, true);
    assert.equal(isOrderCompleted(completeRes.updatedOrder), true);
    assert.equal(completeRes.updatedOrder.paymentStatus, 'Paid in Full');

    const afterPartition = partitionOrdersByCompletion(completeRes.updatedOrders);
    assert.equal(afterPartition.activeOrders.length, 1);
    assert.equal(afterPartition.completedOrders.length, 1);

    const afterCompletedTx = getCompletedTransactionsForCustomer(
      completeRes.updatedOrders,
      'rowena.vance@vancearchitects.com'
    );
    assert.equal(afterCompletedTx.length, 1);
    assert.equal(afterCompletedTx[0].txId, 'TXN-2026-8841');
  });

  it('formats simplified product card data without finish/color swatches or SKUs while preserving full variation options for Product Details', () => {
    const sofa = INITIAL_FURNITURE_ITEMS[0];
    const cardData = formatSimplifiedProductCardData(sofa);

    assert.equal(cardData.id, sofa.id);
    assert.equal(cardData.name, 'Rowena Curved Bouclé Lounge Sofa');
    assert.equal(cardData.categoryName, 'Living Room');
    assert.equal(cardData.hasDiscount, true);
    assert.equal(cardData.originalPrice, 4850);
    assert.equal(cardData.sellingPrice, 4365);
    assert.equal(cardData.ctaLabel, 'View Product');
    assert.equal('colorVariants' in cardData, false);
    assert.equal('selectedFinish' in cardData, false);
    assert.equal('sku' in cardData, false);
  });

  it('assigns explicit non-incrementing own code IDs (e.g. ProductID LR-LV-213, OrderID ORD-2026-xxxx, MaterialID MAT-xxx-xx, CustomerID LR-CUS-xxx, VoucherID VCH-LR-xxx) and avoids AUTO_INCREMENT in SQL', () => {
    const prodExplicit = buildProductRecord({ name: 'Lounge Chair', sku: 'LR-LV-213', categoryId: 'living', price: 2500 });
    const prodAuto = buildProductRecord({ name: 'Walnut Dining Table', categoryId: 'dining', price: 2900 });
    assert.equal(prodExplicit.productId, 'LR-LV-213');
    assert.equal(prodExplicit.sku, 'LR-LV-213');
    assert.match(String(prodAuto.productId), /^LR-DN-\d{3}$/);
    assert.equal(prodAuto.productId, prodAuto.sku);

    const matA = buildMaterialRecord({ name: 'Smoked Ash', unit: 'bd ft', unitCost: 30, stockQuantity: 40 });
    assert.match(String(matA.materialId), /^MAT-[A-Z]{3}-\d{2}$/);

    const orderRes = verifyAndCreateOrder({
      catalog: INITIAL_FURNITURE_ITEMS,
      vouchers: INITIAL_VOUCHERS,
      customerProfile: {
        name: 'Rowena Vance',
        email: 'rowena.vance@vancearchitects.com',
        address: 'Suite 400, 118 Mercer St',
        city: 'New York, NY',
      },
      cartItems: [{ product: INITIAL_FURNITURE_ITEMS[0], finish: INITIAL_FURNITURE_ITEMS[0].defaultFinish, quantity: 1 }],
    });
    assert.equal(orderRes.ok, true);
    assert.match(String(orderRes.order.orderId), /^ORD-2026-\d{4}$/);

    const vchId = generateOwnEntityId('voucher', 'VCH-TEST').codeId;
    assert.match(String(vchId), /^VCH-LR-\d{3}$/);

    const sqlContent = fs.readFileSync(path.join(process.cwd(), 'database', 'furniture.sql'), 'utf8');
    assert.equal(/AUTO_INCREMENT/i.test(sqlContent), false);
    assert.match(sqlContent, /'LR-LV-014'/);
  });

  it('merges fixed-amount Voucher creation, expiration duration/custom date-time validation, live status resolution, and revocation', () => {
    const nowMs = Date.parse('2026-11-16T04:00:00Z'); // Nov 16, 2026 12:00 PM PHT

    // 1. Fixed-amount voucher creation with 24 hours duration
    const createRes = validateAndCreateVoucher(
      {
        customerEmail: 'rowena.vance@vancearchitects.com',
        customerName: 'Rowena Vance',
        furnitureId: 'furn-lv-01',
        code: 'SAVE-500-TEST',
        discountAmount: 500,
        expirationMethod: 'duration',
        durationValue: 24,
        durationUnit: 'hours',
      },
      INITIAL_FURNITURE_ITEMS,
      INITIAL_VOUCHERS,
      nowMs
    );
    assert.equal(createRes.ok, true);
    assert.equal(createRes.voucher.discountType, 'fixed');
    assert.equal(createRes.voucher.discountAmount, 500);
    assert.match(String(createRes.voucher.voucherId), /^VCH-LR-\d{3}$/);
    assert.equal(createRes.voucher.status, 'Active');

    const issuedDisplay = formatVoucherIssuedDisplay(createRes.voucher);
    assert.equal(issuedDisplay.hasFullTimestamp, true);

    const expiryDisplay = formatVoucherExpiryDisplay(createRes.voucher);
    assert.ok(expiryDisplay.primary.length > 0);
    assert.ok(expiryDisplay.secondary.includes('PHT'));

    // 2. Rejects discount exceeding product price
    const overPriceRes = validateAndCreateVoucher(
      {
        customerEmail: 'rowena.vance@vancearchitects.com',
        furnitureId: 'furn-lv-01',
        code: 'SAVE-99999',
        discountAmount: 99999,
        expirationMethod: 'duration',
        durationValue: 24,
        durationUnit: 'hours',
      },
      INITIAL_FURNITURE_ITEMS,
      INITIAL_VOUCHERS,
      nowMs
    );
    assert.equal(overPriceRes.ok, false);
    assert.ok(overPriceRes.errorMessage.includes('cannot exceed the product price'));

    // 3. Revoke voucher transitions status to Revoked and makes it unusable
    const revokeRes = revokeVoucherInList([createRes.voucher], createRes.voucher.id, nowMs);
    assert.equal(revokeRes.ok, true);
    assert.equal(revokeRes.revokedVoucher.status, 'Revoked');
    const statusAfterRevoke = computeVoucherStatusInfo(revokeRes.revokedVoucher, nowMs);
    assert.equal(statusAfterRevoke.isUsable, false);
    assert.equal(statusAfterRevoke.status, 'Revoked');

    // 4. Customer voucher filter strictly matches email
    const rowenaVouchers = filterCustomerVouchers(INITIAL_VOUCHERS, 'rowena.vance@vancearchitects.com');
    assert.ok(rowenaVouchers.length >= 2);
    assert.ok(rowenaVouchers.every((v) => v.customerEmail === 'rowena.vance@vancearchitects.com'));
  });

  it('computes Monthly Analytics & Business Reports across date ranges, KPIs, zero-division handling, sales charts, best-sellers, orders, customers, inventory, vouchers, and PDF/CSV exports', () => {
    const nowMs = Date.parse('2026-11-16T04:00:00Z'); // Nov 16, 2026 in Asia/Manila

    // 1. Safe percentage calculation when previous month is 0
    const zeroToPositive = computePercentageChange(4250, 0);
    assert.equal(zeroToPositive.percentChange, 100);
    assert.equal(zeroToPositive.direction, 'up');
    assert.equal(zeroToPositive.isNewFromZero, true);

    const zeroToZero = computePercentageChange(0, 0);
    assert.equal(zeroToZero.percentChange, 0);
    assert.equal(zeroToZero.direction, 'flat');

    const normalIncrease = computePercentageChange(1500, 1000);
    assert.equal(normalIncrease.percentChange, 50);
    assert.equal(normalIncrease.direction, 'up');
    assert.equal(normalIncrease.formattedChange, '+50.0%');

    // 2. Date range resolution for This Month, Last Month, Select Month, This Year, and Custom Range
    const thisMonthRange = resolveAnalyticsDateRange({ preset: 'this_month' }, nowMs);
    assert.equal(thisMonthRange.current.startDate, '2026-11-01');
    assert.equal(thisMonthRange.current.endDate, '2026-11-30');
    assert.equal(thisMonthRange.previous.startDate, '2026-10-01');
    assert.equal(thisMonthRange.previous.endDate, '2026-10-31');

    const lastMonthRange = resolveAnalyticsDateRange({ preset: 'last_month' }, nowMs);
    assert.equal(lastMonthRange.current.startDate, '2026-10-01');
    assert.equal(lastMonthRange.current.endDate, '2026-10-31');
    assert.equal(lastMonthRange.previous.startDate, '2026-09-01');

    const customRange = resolveAnalyticsDateRange(
      { preset: 'custom_range', startDate: '2026-10-10', endDate: '2026-11-15' },
      nowMs
    );
    assert.equal(customRange.current.startDate, '2026-10-10');
    assert.equal(customRange.current.endDate, '2026-11-15');

    // 3. Full Monthly Analytics report for November 2026 (This Month)
    const novReport = computeMonthlyAnalyticsReport({
      catalog: INITIAL_FURNITURE_ITEMS,
      categories: INITIAL_CATEGORIES,
      orders: INITIAL_STORE_DATA.orders,
      customers: INITIAL_STORE_DATA.customers,
      materials: INITIAL_MATERIALS,
      inventoryTransactions: INITIAL_STORE_DATA.inventoryTransactions,
      vouchers: INITIAL_VOUCHERS,
      filterInput: { preset: 'this_month' },
      nowMs,
    });

    assert.equal(novReport.period.label, 'November 2026');
    assert.equal(novReport.previousPeriod.label, 'October 2026');
    assert.ok(novReport.summary.totalRevenue.value > 0);
    assert.equal(novReport.summary.totalOrders.value, 2); // completed ord-106 and ord-107 only
    assert.equal(novReport.summary.completedOrders.value, 2); // ord-106, ord-107
    assert.equal(novReport.summary.pendingOrders.value, 0); // unfinished orders are excluded
    assert.equal(novReport.summary.totalProductsSold.value, 4);
    assert.ok(novReport.summary.averageOrderValue.value > 0);

    // 4. Historical records are preserved when viewing October 2026 (Last Month)
    const octReport = computeMonthlyAnalyticsReport({
      catalog: INITIAL_FURNITURE_ITEMS,
      categories: INITIAL_CATEGORIES,
      orders: INITIAL_STORE_DATA.orders,
      customers: INITIAL_STORE_DATA.customers,
      materials: INITIAL_MATERIALS,
      inventoryTransactions: INITIAL_STORE_DATA.inventoryTransactions,
      vouchers: INITIAL_VOUCHERS,
      filterInput: { preset: 'last_month' },
      nowMs,
    });
    assert.equal(octReport.period.label, 'October 2026');
    assert.equal(octReport.summary.totalOrders.value, 0); // October orders are still unfinished
    assert.equal(octReport.summary.totalRevenue.value, 0);

    // 5. Cancelled or unpaid orders are excluded from realized revenue, and historical order prices are preserved even if catalog price changes
    const modifiedCatalog = INITIAL_FURNITURE_ITEMS.map((p) => ({ ...p, price: 999999, effectivePrice: 999999 }));
    const ordersWithCancelled = [
      ...INITIAL_STORE_DATA.orders,
      {
        id: 'ord-cancel-test',
        orderId: 'ORD-2026-9999',
        orderNumber: 'ORD-2026-9999',
        clientName: 'Test Client',
        clientEmail: 'test@client.com',
        furnitureId: 'furn-lv-01',
        furnitureName: 'Rowena Curved Bouclé Lounge Sofa',
        quantity: 1,
        unitPrice: 4365,
        totalAmount: 4365,
        depositPaid: 4365,
        status: 'Order Cancelled (Approved by Admin)',
        sqlStatus: 'Cancelled',
        orderDate: '2026-11-12',
      },
    ];
    const checkReport = computeMonthlyAnalyticsReport({
      catalog: modifiedCatalog,
      categories: INITIAL_CATEGORIES,
      orders: ordersWithCancelled,
      customers: INITIAL_STORE_DATA.customers,
      materials: INITIAL_MATERIALS,
      inventoryTransactions: INITIAL_STORE_DATA.inventoryTransactions,
      vouchers: INITIAL_VOUCHERS,
      filterInput: { preset: 'this_month' },
      nowMs,
    });
    assert.equal(checkReport.summary.totalRevenue.value, novReport.summary.totalRevenue.value);
    assert.equal(checkReport.summary.cancelledOrders.value, 0);

    // 6. Best-Selling Products & Low-Selling Products
    assert.equal(novReport.bestSellingProducts.topFive.length, 5);
    assert.ok(novReport.bestSellingProducts.topFive[0].totalRevenue >= novReport.bestSellingProducts.topFive[1].totalRevenue);
    assert.ok(Array.isArray(novReport.bestSellingProducts.lowSellingProducts));

    // 7. Order Analytics status distribution
    const statusNames = novReport.orderAnalytics.distribution.map((d) => d.status);
    assert.deepEqual(statusNames, ['Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled']);

    // 8. Inventory Analytics distinguishes Current Live Snapshot from Period Movements
    assert.equal(novReport.inventoryAnalytics.currentSnapshot.materialsRequiringRestockingCount, 1);
    assert.ok(novReport.inventoryAnalytics.currentSnapshot.currentInventoryValue > 0);
    assert.ok(novReport.inventoryAnalytics.periodMovements.totalUnitsConsumed > 0);

    // 9. Voucher Analytics counts Issued, Active, Redeemed, Expired, Revoked & Redemption Rate
    assert.equal(novReport.voucherAnalytics.totalVouchersIssued, INITIAL_VOUCHERS.length);
    assert.ok(novReport.voucherAnalytics.redeemedVouchers >= 1);
    assert.ok(novReport.voucherAnalytics.expiredVouchers >= 1);
    assert.ok(novReport.voucherAnalytics.revokedVouchers >= 1);
    assert.ok(novReport.voucherAnalytics.totalDiscountRedeemed >= 300);

    // 10. CSV & PDF Report Exports contain business name, reporting period, summary stats, and transactions
    const csvContent = buildAnalyticsCsvContent(novReport);
    assert.ok(csvContent.includes('Lillia and Rowena Furniture'));
    assert.ok(csvContent.includes('November 2026'));
    assert.ok(csvContent.includes('Total Revenue ($)'));
    assert.ok(csvContent.includes('ORD-2026-8854'));

    const pdfBytes = buildAnalyticsPdfBytes(novReport);
    assert.ok(pdfBytes instanceof Uint8Array);
    assert.ok(pdfBytes.byteLength > 500);
    const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 8));
    assert.equal(pdfHeader, '%PDF-1.4');
  });
});


