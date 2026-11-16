import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_STORE_DATA,
  PRODUCT_TYPES,
  applyAdminOrderUpdate,
  applyMaterialStockMovement,
  applyStockMovement,
  buildAdminMessengerUrl,
  buildMaterialRecord,
  buildProductRecord,
  buildRequestDesignMessengerUrl,
  calculateOrderPricing,
  computeCustomerDirectory,
  computeInventoryMetrics,
  computeMaterialInventoryMetrics,
  computeVariantPricing,
  createCustomOrderRequest,
  describeMaterialStockPreview,
  filterCatalogPageItems,
  filterFurnitureItems,
  filterInventoryMaterials,
  findMatchingColorVariant,
  formatCustomerProductDisplay,
  getColorFilterCounts,
  getMaterialCategories,
  getMaterialStockStatus,
  getProductStockStatus,
  getRecommendedBestSellers,
  paginateItems,
  recordCustomerOrderPayment,
  removeMaterialFromInventory,
  removeProductFromCatalog,
  resolveAuthNavigationState,
  validateAndBuildOfferProposal,
  validateLoginCredentials,
  validateMaterialInput,
  validateNewFurnitureInput,
  validateVoucherForOrder,
  verifyAndCreateOrder,
} from './store.js';

const INITIAL_CATEGORIES = INITIAL_STORE_DATA.categories;
const INITIAL_FURNITURE_ITEMS = INITIAL_STORE_DATA.products;
const INITIAL_VOUCHERS = INITIAL_STORE_DATA.vouchers;
const INITIAL_MATERIALS = INITIAL_STORE_DATA.materials || [];

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
    // 1. Logged-out visitor: shows Sign In & Register, hides customer account options and admin options
    const guestState = resolveAuthNavigationState(null);
    assert.equal(guestState.isAuthenticated, false);
    assert.equal(guestState.showSignIn, true);
    assert.equal(guestState.showRegister, true);
    assert.equal(guestState.showCustomerAccountNav, false);
    assert.equal(guestState.showAdminNav, false);
    assert.equal(guestState.cartCheckoutCta.label, 'Sign In to Checkout →');

    // 2. Logged-in customer: hides Sign In & Register, shows My Account, My Orders, Profile & Logout, keeps admin hidden
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

    // 3. Logged-in admin: hides Sign In & Register, hides customer account nav, shows Admin Dashboard nav
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
    const product = { ...INITIAL_FURNITURE_ITEMS[0] }; // Rowena Curved Bouclé Lounge Sofa
    const originalCatalogPrice = product.price;
    const originalStock = product.inStockCount;

    // 1. Invalid offer (empty or zero price) is rejected
    const invalidOffer = validateAndBuildOfferProposal({ proposedPrice: 0 }, product, null);
    assert.equal(invalidOffer.ok, false);
    assert.ok(invalidOffer.errorMessage.includes('valid proposed price'));

    // 2. Valid offer builds full proposal metadata without changing product price or inventory
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
    assert.equal(validOffer.proposal.customizations, 'Custom 240cm length with smoked oak plinth');
    assert.equal(validOffer.proposal.additionalNotes, 'Ground floor elevator access available');
    assert.equal(validOffer.proposal.customerName, 'Rowena Vance');
    assert.equal(
      validOffer.proposal.downloadFilename,
      'offer-proposal-rowena-curved-boucl-lounge-sofa.png'
    );
    assert.equal(product.price, originalCatalogPrice);
    assert.equal(product.inStockCount, originalStock);

    // 3. Request a Design requires login when guest, and redirects to Admin Messenger when logged in
    const guestDesignReq = buildRequestDesignMessengerUrl(null);
    assert.equal(guestDesignReq.requiresLogin, true);
    assert.equal(guestDesignReq.redirectUrl, 'login.html?redirect=request-design');

    const loggedInDesignReq = buildRequestDesignMessengerUrl(sessionUser);
    assert.equal(loggedInDesignReq.requiresLogin, false);
    assert.ok(loggedInDesignReq.redirectUrl.startsWith('https://www.messenger.com/t/100000505712325'));
    assert.ok(loggedInDesignReq.messageText.includes('Rowena Vance'));
    assert.ok(loggedInDesignReq.messageText.includes('request a custom furniture design'));
  });
});



