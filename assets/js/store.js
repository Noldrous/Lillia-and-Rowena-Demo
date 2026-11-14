/**
 * Pure JavaScript Store & Business Logic Module
 * Architecture: HTML + CSS + Pure JavaScript + JSON + PHP (Zero Node.js Runtime / Zero TypeScript)
 *
 * Maps directly to the MySQL 8.0.16+ InnoDB 12-table schema in `database/furniture.sql`:
 * - Admin, Category, Customer
 * - Product, Material
 * - Voucher, Customer_Order, Order_Item, Order_Item_Material, Customization, Payment, Production_Task
 */

export const ADMIN_MESSENGER_PLACEHOLDER_URL = 'https://www.messenger.com/t/100000505712325';

export const PRODUCT_TYPES = {
  NORMAL: 'standard',
  CUSTOMIZED: 'customized',
};

/**
 * Normalize and build a complete Product record supporting two distinct creation flows:
 * 1. "Normal Product" ('standard') — Regular product manually added by the admin.
 * 2. "Customized Product (Messenger)" ('customized') — Product created or customized based on a
 *    customer's request.
 *
 * CRITICAL VISIBILITY RULE:
 * Both Normal Products and Customized Products are stored in the same public catalog, have
 * `publiclyVisible: true`, and appear in the Shop/Product Catalog for ALL customers to view and buy.
 */
export function buildProductRecord(input, existingProduct = null) {
  const rawType = String(
    input?.productType ??
      existingProduct?.productType ??
      (input?.isCustomClientDesign || existingProduct?.isCustomClientDesign
        ? PRODUCT_TYPES.CUSTOMIZED
        : PRODUCT_TYPES.NORMAL)
  )
    .trim()
    .toLowerCase();

  const isCustomized = rawType === PRODUCT_TYPES.CUSTOMIZED || rawType === 'messenger';
  const productType = isCustomized ? PRODUCT_TYPES.CUSTOMIZED : PRODUCT_TYPES.NORMAL;
  const origin = isCustomized ? 'Messenger customization' : 'Admin';

  const categoryId = String(input?.categoryId || existingProduct?.categoryId || 'dining').trim();
  const categoryLabels = {
    living: 'Living Room',
    dining: 'Dining Room',
    bedroom: 'Bedroom',
    office: 'Study/Work Desks',
    kitchen: 'Kitchen',
  };
  const categoryName =
    input?.categoryName ||
    categoryLabels[categoryId] ||
    existingProduct?.categoryName ||
    'Dining Room';

  const price = Math.max(50, Math.round(Number(input?.price ?? existingProduct?.price ?? 2500)));
  const discountPercent = Math.min(
    80,
    Math.max(0, Math.round(Number(input?.discountPercent ?? existingProduct?.discountPercent ?? 0)))
  );
  const effectivePrice = Math.round(price * (1 - discountPercent / 100));

  let colorVariants = Array.isArray(input?.colorVariants)
    ? input.colorVariants
    : Array.isArray(existingProduct?.colorVariants)
    ? existingProduct.colorVariants
    : null;

  if (typeof input?.colorsRaw === 'string' && input.colorsRaw.trim().length > 0) {
    const parsed = input.colorsRaw
      .split(',')
      .map((part) => {
        const [cName, cHex, cDelta] = part.split('|').map((s) => (s || '').trim());
        if (!cName) return null;
        return {
          name: cName,
          hex: cHex && cHex.startsWith('#') ? cHex : '#5C3A21',
          priceDelta: Number(cDelta) || 0,
        };
      })
      .filter(Boolean);
    if (parsed.length > 0) {
      colorVariants = parsed;
    }
  }

  if (!Array.isArray(colorVariants) || colorVariants.length === 0) {
    colorVariants = [{ name: 'Hand-Rubbed Natural Timber', hex: '#5C3A21', priceDelta: 0 }];
  }

  const messengerConversationId = isCustomized
    ? String(
        input?.messengerConversationId ?? existingProduct?.messengerConversationId ?? ''
      ).trim() || null
    : null;

  const messengerCustomerName = isCustomized
    ? String(
        input?.messengerCustomerName ?? existingProduct?.messengerCustomerName ?? ''
      ).trim() || null
    : null;

  const messengerTopic = isCustomized
    ? String(input?.messengerTopic ?? existingProduct?.messengerTopic ?? '').trim() || null
    : null;

  const customizationNotes = isCustomized
    ? String(
        input?.customizationNotes ??
          existingProduct?.customizationNotes ??
          input?.description ??
          ''
      ).trim() ||
      'Custom furniture piece created from a customer customization request. Available in the public catalog for all clients.'
    : null;

  const defaultImages = {
    living: 'assets/images/category_living_lounge.jpg',
    dining: 'assets/images/category_dining_tables.jpg',
    bedroom: 'assets/images/category_bedroom_sanctuary.jpg',
    office: 'assets/images/category_office_storage.jpg',
    kitchen: 'assets/images/category_dining_tables.jpg',
  };

  const resolvedImage =
    String(input?.image ?? existingProduct?.image ?? '').trim() ||
    defaultImages[categoryId] ||
    'assets/images/category_dining_tables.jpg';

  const rawStock = input?.inStockCount ?? existingProduct?.inStockCount ?? 4;
  const inStockCount = Math.max(0, Math.floor(Number.isFinite(Number(rawStock)) ? Number(rawStock) : 4));

  const rawMinStock = input?.minStockLevel ?? existingProduct?.minStockLevel ?? 2;
  const minStockLevel = Math.max(0, Math.floor(Number.isFinite(Number(rawMinStock)) ? Number(rawMinStock) : 2));

  return {
    ...(existingProduct || {}),
    id: existingProduct?.id || input?.id || `furn-${isCustomized ? 'cust' : 'std'}-${Date.now()}`,
    sku: String(input?.sku ?? existingProduct?.sku ?? 'LR-NEW-001')
      .trim()
      .toUpperCase(),
    name: String(input?.name ?? existingProduct?.name ?? 'Untitled Piece').trim(),
    categoryId,
    categoryName,
    productType,
    origin,
    isCustomClientDesign: isCustomized,
    publiclyVisible: true,
    canBePurchased: true,
    adminEditable: true,
    customClientEmail: null,
    messengerConversationId,
    messengerCustomerName,
    messengerTopic,
    customizationNotes,
    price,
    discountPercent,
    effectivePrice,
    dimensions: String(
      input?.dimensions ?? existingProduct?.dimensions ?? 'Standard Dimensions'
    ).trim(),
    leadTimeWeeks: Number(
      input?.leadTimeWeeks ?? existingProduct?.leadTimeWeeks ?? (isCustomized ? 5 : 4)
    ),
    inStockCount,
    minStockLevel,
    primaryMaterialId: input?.primaryMaterialId ?? existingProduct?.primaryMaterialId ?? 'mat-101',
    defaultFinish: colorVariants[0].name,
    finishes: colorVariants.map((v) => v.name),
    colorVariants,
    description: String(
      input?.description ??
        existingProduct?.description ??
        (isCustomized
          ? customizationNotes
          : 'Handcrafted solid timber and architectural upholstery piece built in our workshop.')
    ).trim(),
    craftsmanshipNote: String(
      input?.craftsmanshipNote ??
        existingProduct?.craftsmanshipNote ??
        (isCustomized
          ? 'Custom-engineered dimensions and finishes added to the public collection.'
          : 'Custom-milled joinery with color-graded finish pricing.')
    ).trim(),
    image: resolvedImage,
  };
}

/**
 * Compute dynamic variant price for a product based on selected color/finish and storewide discount.
 */
export function computeVariantPricing(product, selectedColorName) {
  const basePrice = Number(product?.price || 0);
  const discountPercent = Math.min(80, Math.max(0, Number(product?.discountPercent || 0)));
  const variants = Array.isArray(product?.colorVariants) ? product.colorVariants : [];

  const matchedVariant =
    variants.find((v) => v.name === selectedColorName) ||
    variants[0] || { name: product?.defaultFinish || 'Standard Finish', hex: '#78716C', priceDelta: 0 };

  const priceDelta = Number(matchedVariant.priceDelta || 0);
  const variantBasePrice = Math.max(0, basePrice + priceDelta);
  const discountDollar = Math.round(variantBasePrice * (discountPercent / 100));
  const effectivePrice = Math.max(0, variantBasePrice - discountDollar);

  return {
    colorName: matchedVariant.name,
    colorHex: matchedVariant.hex || '#78716C',
    priceDelta,
    variantBasePrice,
    discountPercent,
    discountDollar,
    effectivePrice,
  };
}

/**
 * Build a direct Messenger deep link to the Business Owner / Admin for price negotiation or custom designs.
 */
export function buildAdminMessengerUrl(payload = {}) {
  const mode = payload.mode || 'direct-offer';
  const skuPart = payload.sku ? `_${String(payload.sku).toLowerCase()}` : '';
  const colorPart = payload.colorName
    ? `_${String(payload.colorName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}`
    : '';
  const offerPart = payload.proposedPrice ? `_offer-${Math.round(Number(payload.proposedPrice))}` : '';
  const clientPart = payload.clientEmail ? `&client=${encodeURIComponent(payload.clientEmail)}` : '';

  return `${ADMIN_MESSENGER_PLACEHOLDER_URL}?ref=${encodeURIComponent(
    `${mode}${skuPart}${colorPart}${offerPart}`
  )}${clientPart}`;
}

/**
 * Filter furniture catalog items by search query and room category ID.
 */
export function filterFurnitureItems(items, searchQuery = '', categoryId = 'all') {
  if (!Array.isArray(items)) return [];
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase();
  const normalizedCategory = String(categoryId || 'all').trim().toLowerCase();

  return items.filter((item) => {
    const matchesCategory =
      normalizedCategory === 'all' ||
      String(item.categoryId || '').toLowerCase() === normalizedCategory;

    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;

    const finishesText = Array.isArray(item.finishes) ? item.finishes.join(' ') : '';
    const colorsText = Array.isArray(item.colorVariants)
      ? item.colorVariants.map((c) => c.name).join(' ')
      : '';
    const searchable = [
      item.name,
      item.sku,
      item.categoryName,
      item.description,
      item.craftsmanshipNote,
      item.defaultFinish,
      item.origin,
      item.productType,
      item.customizationNotes,
      item.messengerCustomerName,
      finishesText,
      colorsText,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

/**
 * Helper to resolve the authoritative unit price of a cart line item from the catalog.
 */
export function resolveAuthoritativeLinePrice(item, catalog = null) {
  const productId = item?.product?.id || item?.productId || item?.furnitureId || item?.id || '';
  const finishName = item?.finish || item?.selectedFinish || '';

  if (Array.isArray(catalog) && catalog.length > 0 && productId) {
    const authoritativeProduct = catalog.find((p) => p.id === productId);
    if (authoritativeProduct) {
      return computeVariantPricing(authoritativeProduct, finishName).effectivePrice;
    }
  }

  if (item?.product && typeof item.product === 'object') {
    return computeVariantPricing(item.product, finishName).effectivePrice;
  }

  return Math.max(0, Number(item?.unitPrice ?? item?.effectivePrice ?? item?.price ?? 0));
}

/**
 * Format a human-readable benefit label for a voucher (e.g., "20% OFF" or "$400 OFF").
 */
export function formatVoucherBenefitLabel(voucher) {
  if (!voucher || typeof voucher !== 'object') return '';
  const isPercentage =
    voucher.discountType === 'percentage' || Number(voucher.discountPercent || 0) > 0;
  if (isPercentage) {
    const pct = Number(voucher.discountPercent ?? voucher.discountValue ?? voucher.discountAmount ?? 0);
    return `${pct}% OFF`;
  }
  const amt = Number(voucher.discountAmount ?? voucher.discountValue ?? 0);
  return `$${Math.round(amt).toLocaleString('en-US')} OFF`;
}

/**
 * Validate a single-customer, single-product Voucher (`Voucher` table in `database/furniture.sql`).
 */
export function validateVoucherForOrder(
  vouchers,
  voucherCode,
  customerEmail,
  cartProductIds = [],
  catalog = null
) {
  const cleanCode = String(voucherCode || '').trim().toUpperCase();
  const cleanEmail = String(customerEmail || '').trim().toLowerCase();

  if (!cleanCode) {
    return { valid: false, discountAmount: 0, voucher: null, errorMessage: 'Enter a voucher code.' };
  }

  const matched = Array.isArray(vouchers)
    ? vouchers.find((v) => String(v.code || '').toUpperCase() === cleanCode)
    : null;

  if (!matched) {
    return {
      valid: false,
      discountAmount: 0,
      voucher: null,
      errorMessage: `Voucher "${cleanCode}" was not found.`,
    };
  }

  if (matched.status !== 'Active') {
    return {
      valid: false,
      discountAmount: 0,
      voucher: matched,
      errorMessage: `Voucher "${cleanCode}" is no longer active (${matched.status}).`,
    };
  }

  if (matched.expiryDate) {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (String(matched.expiryDate) < todayStr) {
      return {
        valid: false,
        discountAmount: 0,
        voucher: matched,
        errorMessage: `Voucher "${cleanCode}" expired on ${matched.expiryDate}.`,
      };
    }
  }

  const assignedEmail = String(matched.customerEmail || '').trim().toLowerCase();
  if (
    assignedEmail &&
    assignedEmail !== 'all' &&
    assignedEmail !== '*' &&
    cleanEmail &&
    assignedEmail !== cleanEmail
  ) {
    return {
      valid: false,
      discountAmount: 0,
      voucher: matched,
      errorMessage: `Voucher "${cleanCode}" is exclusively assigned to ${matched.customerEmail}.`,
    };
  }

  const targetProductId = matched.furnitureId || matched.productId || '';
  const targetProductName = matched.furnitureName || matched.productName || ' the selected product';

  if (Array.isArray(cartProductIds) && cartProductIds.length > 0) {
    const normalizedIds = cartProductIds.map((entry) => {
      if (typeof entry === 'string') return entry;
      return entry?.product?.id || entry?.productId || entry?.furnitureId || entry?.id || '';
    });

    if (!normalizedIds.includes(targetProductId)) {
      return {
        valid: false,
        discountAmount: 0,
        voucher: matched,
        errorMessage: `This voucher is only valid for the selected product (${targetProductName}).`,
      };
    }

    const hasObjectEntries = cartProductIds.some((entry) => entry && typeof entry === 'object');
    if (hasObjectEntries) {
      const breakdown = calculateOrderPricing(cartProductIds, matched, catalog);
      return {
        valid: true,
        discountAmount: breakdown.voucherDiscountAmount,
        eligibleSubtotal: breakdown.eligibleSubtotal,
        voucher: matched,
        errorMessage: '',
      };
    }
  }

  return {
    valid: true,
    discountAmount: Number(matched.discountAmount || matched.discountValue || 0),
    voucher: matched,
    errorMessage: '',
  };
}

/**
 * Calculate order subtotal, single-product voucher deduction, white-glove delivery fee, and grand total.
 */
export function calculateOrderPricing(lineItems, voucherOrDiscount = 0, catalog = null) {
  const safeLines = Array.isArray(lineItems) ? lineItems : [];

  const isVoucherObject =
    voucherOrDiscount !== null &&
    typeof voucherOrDiscount === 'object' &&
    Boolean(voucherOrDiscount.furnitureId || voucherOrDiscount.productId || voucherOrDiscount.code);

  const targetProductId = isVoucherObject
    ? String(voucherOrDiscount.furnitureId || voucherOrDiscount.productId || '')
    : '';

  const isPercentageVoucher =
    isVoucherObject &&
    (voucherOrDiscount.discountType === 'percentage' ||
      Number(voucherOrDiscount.discountPercent || 0) > 0);

  const percentageRate = isPercentageVoucher
    ? Math.min(
        100,
        Math.max(
          0,
          Number(
            voucherOrDiscount.discountPercent ??
              voucherOrDiscount.discountValue ??
              voucherOrDiscount.discountAmount ??
              0
          )
        )
      )
    : 0;

  let remainingFixedVoucherDiscount =
    isVoucherObject && !isPercentageVoucher
      ? Math.max(
          0,
          Number(voucherOrDiscount.discountAmount ?? voucherOrDiscount.discountValue ?? 0)
        )
      : 0;

  let rawSubtotal = 0;
  let eligibleSubtotal = 0;
  let nonEligibleSubtotal = 0;
  let calculatedVoucherDiscount = 0;

  const lineBreakdowns = safeLines.map((item) => {
    const productId = item?.product?.id || item?.productId || item?.furnitureId || item?.id || '';
    const productName =
      item?.product?.name || item?.productName || item?.furnitureName || item?.name || 'Item';
    const quantity = Math.max(1, Number(item?.quantity || 1));
    const unitPrice = resolveAuthoritativeLinePrice(item, catalog);
    const rawLineTotal = Math.round(unitPrice * quantity);

    rawSubtotal += rawLineTotal;

    const isVoucherEligible = Boolean(
      isVoucherObject && targetProductId && productId === targetProductId
    );
    let lineDiscount = 0;

    if (isVoucherEligible) {
      eligibleSubtotal += rawLineTotal;
      if (isPercentageVoucher) {
        lineDiscount = Math.min(rawLineTotal, Math.round(rawLineTotal * (percentageRate / 100)));
      } else {
        lineDiscount = Math.min(rawLineTotal, Math.round(remainingFixedVoucherDiscount));
        remainingFixedVoucherDiscount = Math.max(0, remainingFixedVoucherDiscount - lineDiscount);
      }
      calculatedVoucherDiscount += lineDiscount;
    } else {
      nonEligibleSubtotal += rawLineTotal;
    }

    const finalLineTotal = Math.max(0, rawLineTotal - lineDiscount);

    return {
      productId,
      productName,
      quantity,
      unitPrice,
      rawLineTotal,
      isVoucherEligible,
      lineDiscount,
      finalLineTotal,
      voucherBadge: isVoucherEligible
        ? `${formatVoucherBenefitLabel(voucherOrDiscount)} applied`
        : isVoucherObject
        ? 'No discount'
        : '',
    };
  });

  const voucherDiscountAmount = isVoucherObject
    ? calculatedVoucherDiscount
    : Math.min(rawSubtotal, Math.max(0, Number(voucherOrDiscount || 0)));

  const subtotal = Math.max(0, rawSubtotal - voucherDiscountAmount);
  const whiteGloveDeliveryFee = subtotal === 0 ? 0 : subtotal >= 5000 ? 0 : 250;
  const totalAmount = subtotal + whiteGloveDeliveryFee;

  return {
    rawSubtotal,
    eligibleSubtotal,
    nonEligibleSubtotal,
    voucherDiscountAmount,
    subtotal,
    whiteGloveDeliveryFee,
    totalAmount,
    appliedVoucherCode: isVoucherObject ? voucherOrDiscount.code : null,
    targetProductId: targetProductId || null,
    lineBreakdowns,
  };
}

/**
 * Authoritative checkout verification & order creation (`verifyAndCreateOrder`).
 */
export function verifyAndCreateOrder({
  catalog = [],
  vouchers = [],
  customerProfile = {},
  sessionUser = null,
  cartItems = [],
  voucherCode = '',
}) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return {
      ok: false,
      errorMessage: 'Your shopping cart is empty.',
      order: null,
      pricing: null,
      validatedVoucher: null,
    };
  }

  const activeEmail =
    customerProfile?.email || sessionUser?.email || 'rowena.vance@vancearchitects.com';

  const normalizedLines = [];
  const requestedQtyByProduct = {};

  for (const item of cartItems) {
    const productId = item?.product?.id || item?.productId || item?.furnitureId || item?.id || '';
    const authoritativeProduct = Array.isArray(catalog)
      ? catalog.find((p) => p.id === productId)
      : item?.product;

    if (!authoritativeProduct) {
      return {
        ok: false,
        errorMessage: `Product "${productId || 'Unknown'}" is no longer available in the catalog.`,
        order: null,
        pricing: null,
        validatedVoucher: null,
      };
    }

    const finish =
      item?.finish ||
      item?.selectedFinish ||
      authoritativeProduct.defaultFinish ||
      'Natural Finish';
    const quantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));
    const availableStock = Math.max(0, Math.floor(Number(authoritativeProduct.inStockCount ?? 0)));

    requestedQtyByProduct[authoritativeProduct.id] =
      (requestedQtyByProduct[authoritativeProduct.id] || 0) + quantity;

    if (availableStock <= 0) {
      return {
        ok: false,
        errorMessage: `"${authoritativeProduct.name}" is currently Out of Stock and cannot be ordered.`,
        order: null,
        pricing: null,
        validatedVoucher: null,
      };
    }

    if (requestedQtyByProduct[authoritativeProduct.id] > availableStock) {
      return {
        ok: false,
        errorMessage: `Requested quantity (${requestedQtyByProduct[authoritativeProduct.id]}) for "${authoritativeProduct.name}" exceeds available stock (${availableStock} available in stock).`,
        order: null,
        pricing: null,
        validatedVoucher: null,
      };
    }

    const pricing = computeVariantPricing(authoritativeProduct, finish);

    normalizedLines.push({
      product: authoritativeProduct,
      productId: authoritativeProduct.id,
      productName: authoritativeProduct.name,
      sku: authoritativeProduct.sku,
      categoryName: authoritativeProduct.categoryName,
      dimensions: authoritativeProduct.dimensions,
      finish: pricing.colorName,
      unitPrice: pricing.effectivePrice,
      quantity,
    });
  }

  let validatedVoucher = null;
  const cleanCode = String(voucherCode || '').trim().toUpperCase();

  if (cleanCode) {
    const vCheck = validateVoucherForOrder(
      vouchers,
      cleanCode,
      activeEmail,
      normalizedLines,
      catalog
    );
    if (!vCheck.valid) {
      return {
        ok: false,
        errorMessage: vCheck.errorMessage,
        order: null,
        pricing: null,
        validatedVoucher: null,
      };
    }
    validatedVoucher = vCheck.voucher;
  }

  const pricing = calculateOrderPricing(normalizedLines, validatedVoucher, catalog);
  const firstEntry = normalizedLines[0];
  const totalQty = normalizedLines.reduce((sum, l) => sum + l.quantity, 0);
  const ordNum = `ORD-2026-${Math.floor(8900 + Math.random() * 999)}`;

  const orderRecord = {
    id: `ord-${Date.now()}`,
    orderNumber: ordNum,
    clientName: customerProfile?.name || sessionUser?.name || 'Rowena Vance',
    clientEmail: activeEmail,
    clientCompany: 'Private Residence',
    furnitureId: firstEntry.productId,
    furnitureName:
      normalizedLines.length > 1
        ? `${firstEntry.productName} (+${normalizedLines.length - 1} more)`
        : firstEntry.productName,
    sku: firstEntry.sku,
    categoryName: firstEntry.categoryName,
    itemType: 'Standard',
    selectedFinish: firstEntry.finish,
    customDimensions: firstEntry.dimensions || 'Standard Dimensions',
    materialId: firstEntry.product?.primaryMaterialId || 'mat-101',
    quantity: totalQty,
    unitPrice: firstEntry.unitPrice,
    extraCost: 0,
    rawSubtotal: pricing.rawSubtotal,
    eligibleSubtotal: pricing.eligibleSubtotal,
    voucherDiscountAmount: pricing.voucherDiscountAmount,
    appliedVoucherCode: validatedVoucher ? validatedVoucher.code : null,
    appliedVoucherProductId: validatedVoucher
      ? validatedVoucher.furnitureId || validatedVoucher.productId
      : null,
    whiteGloveDeliveryFee: pricing.whiteGloveDeliveryFee,
    totalAmount: pricing.totalAmount,
    depositPaid: pricing.totalAmount,
    status: 'Order Confirmed · In Production Queue',
    sqlStatus: 'Pending',
    taskStatus: 'Todo',
    deliveryStatus: 'Scheduled',
    driverName: 'Devon Vance',
    paymentStatus: 'Paid in Full',
    orderDate: new Date().toISOString().slice(0, 10),
    estimatedDelivery: '4–6 Weeks',
    deliveryAddress: `${customerProfile?.address || 'Suite 400, 118 Mercer St'}, ${
      customerProfile?.city || 'New York, NY'
    }`,
    assignedCraftsperson: 'Mateo Cruz',
    notes: customerProfile?.notes || 'Standard white-glove delivery.',
    lineBreakdowns: pricing.lineBreakdowns,
  };

  const updatedCatalog = Array.isArray(catalog)
    ? catalog.map((prod) => {
        const deducted = requestedQtyByProduct[prod.id] || 0;
        if (!deducted) return prod;
        return {
          ...prod,
          inStockCount: Math.max(0, Math.floor(Number(prod.inStockCount ?? 0)) - deducted),
        };
      })
    : [];

  return {
    ok: true,
    errorMessage: '',
    order: orderRecord,
    pricing,
    validatedVoucher,
    updatedCatalog,
    requestedQtyByProduct,
  };
}

/**
 * Create a Bespoke / Custom Order Request (`Order_Item.ItemType = 'Custom'` + `Customization` + `Order_Item_Material`)
 * submitted by a customer from the User Dashboard, which immediately syncs with the Admin Orders & Materials views.
 */
export function createCustomOrderRequest({
  catalog = [],
  materials = [],
  customerProfile = {},
  sessionUser = null,
  customInput = {},
}) {
  const productId = String(customInput?.productId || '').trim();
  const materialId = String(customInput?.materialId || '').trim();
  const lengthCm = Number(customInput?.lengthCm || 0);
  const widthCm = Number(customInput?.widthCm || 0);
  const heightCm = Number(customInput?.heightCm || 0);
  const colorFinish = String(customInput?.colorFinish || '').trim() || 'Hand-Rubbed Natural Finish';
  const notes = String(customInput?.notes || '').trim();
  const quantity = Math.max(1, Math.floor(Number(customInput?.quantity || 1)));

  const product = Array.isArray(catalog) ? catalog.find((p) => p.id === productId) : null;
  if (!product) {
    return { ok: false, errorMessage: 'Please select a base catalog piece to customize.' };
  }

  const material = Array.isArray(materials) ? materials.find((m) => m.id === materialId) : null;
  if (!material) {
    return { ok: false, errorMessage: 'Please select a workshop raw material for your custom piece.' };
  }

  if (!Number.isFinite(lengthCm) || lengthCm < 30 || !Number.isFinite(widthCm) || widthCm < 30 || !Number.isFinite(heightCm) || heightCm < 25) {
    return {
      ok: false,
      errorMessage: 'Please enter valid custom dimensions (Length ≥ 30cm, Width ≥ 30cm, Height ≥ 25cm).',
    };
  }

  const materialQtyNeeded = Math.max(4, Math.round(((lengthCm * widthCm) / 1500) * quantity));
  const availableMatStock = Math.max(0, Number(material.stockQuantity ?? 0));
  if (availableMatStock < materialQtyNeeded) {
    return {
      ok: false,
      errorMessage: `Insufficient workshop material stock for "${material.name}": requires ${materialQtyNeeded} ${material.unit}, but only ${availableMatStock} ${material.unit} in stock.`,
    };
  }

  // Calculate base variant price + customization extra cost (`Customization.ExtraCost`)
  const variantPricing = computeVariantPricing(product, colorFinish);
  const dimensionFactor = Math.max(0, lengthCm + widthCm - 300);
  const extraCost = Math.round(dimensionFactor * 3.5 + Number(material.unitCost || 25) * 4);
  const unitPrice = variantPricing.effectivePrice + extraCost;
  const rawSubtotal = unitPrice * quantity;
  const deliveryFee = rawSubtotal >= 5000 ? 0 : 250;
  const totalAmount = rawSubtotal + deliveryFee;
  const depositPaid = Math.round(totalAmount * 0.5);

  const ordNum = `ORD-2026-${Math.floor(8900 + Math.random() * 999)}`;
  const activeEmail =
    customerProfile?.email || sessionUser?.email || 'rowena.vance@vancearchitects.com';
  const customDimensions = `${Math.round(lengthCm)}cm L × ${Math.round(widthCm)}cm W × ${Math.round(heightCm)}cm H`;

  const orderRecord = {
    id: `ord-cust-${Date.now()}`,
    orderNumber: ordNum,
    clientName: customerProfile?.name || sessionUser?.name || 'Rowena Vance',
    clientEmail: activeEmail,
    clientCompany: 'Custom Workshop Commission',
    furnitureId: product.id,
    furnitureName: `${product.name} (Custom Spec)`,
    sku: product.sku,
    categoryName: product.categoryName,
    itemType: 'Custom',
    selectedFinish: colorFinish,
    customDimensions,
    lengthCm: Math.round(lengthCm),
    widthCm: Math.round(widthCm),
    heightCm: Math.round(heightCm),
    materialId: material.id,
    materialName: material.name,
    materialQtyUsed: materialQtyNeeded,
    materialUnit: material.unit,
    quantity,
    unitPrice,
    extraCost,
    rawSubtotal,
    whiteGloveDeliveryFee: deliveryFee,
    totalAmount,
    depositPaid,
    status: 'Timber Selection & Kiln Verification',
    sqlStatus: 'InProduction',
    taskStatus: 'InProgress',
    deliveryStatus: 'Scheduled',
    driverName: 'Devon Vance',
    paymentStatus: '50% Deposit Paid',
    orderDate: new Date().toISOString().slice(0, 10),
    estimatedDelivery: `${(product.leadTimeWeeks || 4) + 1} Weeks`,
    deliveryAddress: `${customerProfile?.address || 'Suite 400, 118 Mercer St'}, ${
      customerProfile?.city || 'New York, NY'
    }`,
    assignedCraftsperson: 'Mateo Cruz',
    notes: notes || `Custom commission using ${material.name} (${customDimensions}).`,
    appliedVoucherCode: null,
    voucherDiscountAmount: 0,
  };

  // Deduct the allocated raw material from workshop inventory
  const prevMatStock = availableMatStock;
  const newMatStock = Math.max(0, prevMatStock - materialQtyNeeded);
  const updatedMaterial = {
    ...material,
    stockQuantity: newMatStock,
  };
  const updatedMaterials = materials.map((m) => (m.id === material.id ? updatedMaterial : m));

  const materialMovement = {
    id: `inv-tx-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
    materialId: material.id,
    materialName: material.name,
    materialCode: material.code || 'MAT-01',
    materialType: material.materialType || 'Solid Timber',
    unit: material.unit || 'units',
    transactionType: 'Stock Out',
    quantity: materialQtyNeeded,
    previousStock: prevMatStock,
    newStock: newMatStock,
    purchaseCost: null,
    unitCost: material.unitCost,
    reason: `Custom Order #${ordNum} (${orderRecord.clientName})`,
    dateTime: `${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 5)}`,
    adminName: `${orderRecord.clientName} (Custom Order Allocation)`,
  };

  return {
    ok: true,
    errorMessage: '',
    order: orderRecord,
    updatedMaterials,
    updatedMaterial,
    materialMovement,
  };
}

/**
 * Apply Admin updates to an order (`Customer_Order`, `Production_Task`, `Delivery`, `Employee`)
 * and keep human-readable status, SQL status, task status, assigned carpenter, and delivery status in sync.
 */
export function applyAdminOrderUpdate(orderOrParams, updatesArg = {}) {
  if (!orderOrParams || typeof orderOrParams !== 'object') return null;

  if (Array.isArray(orderOrParams.orders) && orderOrParams.orderNumber) {
    const { orders, orderNumber, updates = {} } = orderOrParams;
    const target = orders.find((o) => o.orderNumber === orderNumber);
    if (!target) return { ok: false, updatedOrders: orders, updatedOrder: null };
    const updatedOrder = applyAdminOrderUpdate(target, updates);
    const updatedOrders = orders.map((o) => (o.orderNumber === orderNumber ? updatedOrder : o));
    return { ok: true, updatedOrders, updatedOrder };
  }

  const order = orderOrParams;
  const updates = updatesArg || {};
  const next = { ...order, ...updates };

  // Keep sqlStatus and human-readable status aligned if one is changed
  if (updates.status && !updates.sqlStatus) {
    if (/Confirmed|Pending|Timber/i.test(updates.status)) {
      next.sqlStatus = 'Pending';
      next.taskStatus = next.taskStatus === 'Done' ? 'InProgress' : next.taskStatus || 'Todo';
    } else if (/Joinery|Finishing|Millwork|Production/i.test(updates.status)) {
      next.sqlStatus = 'InProduction';
      next.taskStatus = 'InProgress';
    } else if (/Quality|Ready/i.test(updates.status)) {
      next.sqlStatus = 'Ready';
      next.taskStatus = 'Done';
    } else if (/Dispatched|Delivered/i.test(updates.status)) {
      next.sqlStatus = 'Delivered';
      next.taskStatus = 'Done';
      if (next.deliveryStatus === 'Scheduled') next.deliveryStatus = 'InTransit';
    } else if (/Cancelled/i.test(updates.status)) {
      next.sqlStatus = 'Cancelled';
    }
  }

  if (updates.deliveryStatus === 'Delivered') {
    next.sqlStatus = 'Delivered';
    next.taskStatus = 'Done';
    next.status = 'Delivered · White-Glove Installation Complete';
  } else if (updates.deliveryStatus === 'InTransit' && !/Dispatched|Delivered/i.test(next.status)) {
    next.status = 'Dispatched · White-Glove Transit';
    next.sqlStatus = 'Ready';
  }

  return next;
}

/**
 * Record an additional customer payment on an order (`Payment` table in `database/furniture.sql`).
 */
export function recordCustomerOrderPayment(orderOrParams, amountToPay = null) {
  if (!orderOrParams || typeof orderOrParams !== 'object') return null;

  if (Array.isArray(orderOrParams.orders) && orderOrParams.orderNumber) {
    const { orders, orderNumber, paymentMethod = 'Card' } = orderOrParams;
    const target = orders.find((o) => o.orderNumber === orderNumber);
    if (!target) return { ok: false, errorMessage: 'Order not found.' };
    const total = Math.max(0, Number(target.totalAmount || 0));
    const currentPaid = Math.max(0, Number(target.depositPaid || 0));
    const amountPaid = Math.max(0, total - currentPaid);
    if (amountPaid <= 0) {
      return { ok: false, errorMessage: 'Order is already paid in full.' };
    }
    const updatedOrder = {
      ...recordCustomerOrderPayment(target, amountPaid),
      paymentMethod,
      lastPaymentAt: new Date().toISOString().slice(0, 10),
    };
    const updatedOrders = orders.map((o) => (o.orderNumber === orderNumber ? updatedOrder : o));
    return { ok: true, updatedOrders, updatedOrder, amountPaid };
  }

  const order = orderOrParams;
  const total = Math.max(0, Number(order.totalAmount || 0));
  const currentPaid = Math.max(0, Number(order.depositPaid || 0));
  const remaining = Math.max(0, total - currentPaid);
  const payment = amountToPay !== null ? Math.min(remaining, Math.max(0, Number(amountToPay))) : remaining;
  const nextPaid = currentPaid + payment;

  return {
    ...order,
    depositPaid: nextPaid,
    paymentStatus: nextPaid >= total ? 'Paid in Full' : `Partial (${Math.round((nextPaid / Math.max(1, total)) * 100)}% Paid)`,
    lastPaymentDate: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Validate login form inputs for either Client or Admin role.
 */
export function validateLoginCredentials(email, password, role) {
  const cleanEmail = String(email || '').trim();
  const cleanPass = String(password || '').trim();
  const cleanRole = role === 'admin' ? 'admin' : 'client';

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { valid: false, errorMessage: 'Please enter a valid email address.' };
  }
  if (cleanPass.length < 4) {
    return { valid: false, errorMessage: 'Password or access code must be at least 4 characters.' };
  }
  return { valid: true, role: cleanRole, email: cleanEmail, errorMessage: '' };
}

/**
 * Validate admin form input when adding or editing a furniture item.
 */
export function validateNewFurnitureInput(input) {
  const name = String(input?.name || '').trim();
  const sku = String(input?.sku || '').trim();
  const price = Number(input?.price);
  const inStockCount = Number(input?.inStockCount ?? 1);
  const productType = String(input?.productType || PRODUCT_TYPES.NORMAL).trim().toLowerCase();
  const image = String(input?.image || '').trim();

  if (name.length < 3) {
    return { valid: false, errorMessage: 'Product Name must be at least 3 characters.' };
  }
  if (sku.length < 4) {
    return { valid: false, errorMessage: 'SKU Code must be at least 4 characters (e.g., LR-DN-210).' };
  }
  if (!Number.isFinite(price) || price < 50) {
    return { valid: false, errorMessage: 'Base Price must be at least $50.' };
  }
  if (!Number.isFinite(inStockCount) || inStockCount < 0) {
    return { valid: false, errorMessage: 'Stock quantity cannot be negative.' };
  }
  if (productType !== PRODUCT_TYPES.NORMAL && productType !== PRODUCT_TYPES.CUSTOMIZED) {
    return {
      valid: false,
      errorMessage: 'Product Type must be either Normal Product or Customized Product (Messenger).',
    };
  }
  if (!image) {
    return {
      valid: false,
      errorMessage: 'Product image is required. Please upload an image file or provide an image URL/preset.',
    };
  }
  return { valid: true, errorMessage: '' };
}


/**
 * Validate a raw Material record (`Material` table in `database/furniture.sql`).
 */
export function validateMaterialInput(input) {
  const name = String(input?.name ?? input?.materialName ?? '').trim();
  const unit = String(input?.unit || '').trim();
  const unitCost = Number(input?.unitCost);
  const stockQuantity = Number(input?.stockQuantity ?? 0);

  if (name.length < 2) {
    return { valid: false, errorMessage: 'Material Name is required (at least 2 characters).' };
  }
  if (!unit) {
    return { valid: false, errorMessage: 'Unit of measurement is required (e.g., bd ft, sq m, slabs, sets).' };
  }
  if (!Number.isFinite(unitCost) || unitCost < 0) {
    return { valid: false, errorMessage: 'Unit Cost must be 0 or greater.' };
  }
  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    return { valid: false, errorMessage: 'Stock Quantity must be 0 or greater.' };
  }
  return { valid: true, errorMessage: '' };
}

/**
 * Build a normalized Workshop Raw Material record (`Material` table in `database/furniture.sql`).
 */
export function buildMaterialRecord(input, existingMaterial = null) {
  const stockQuantity = Math.max(
    0,
    Number(input?.stockQuantity ?? existingMaterial?.stockQuantity ?? 0)
  );
  const minStockLevel = Math.max(
    0,
    Number(input?.minStockLevel ?? existingMaterial?.minStockLevel ?? 10)
  );
  const unitCost = Math.max(0, Number(input?.unitCost ?? existingMaterial?.unitCost ?? 25));

  const code = String(
    input?.code ?? input?.sku ?? existingMaterial?.code ?? existingMaterial?.sku ?? `MAT-${Math.floor(100 + Math.random() * 899)}`
  )
    .trim()
    .toUpperCase();

  return {
    ...(existingMaterial || {}),
    id: existingMaterial?.id || input?.id || `mat-${Date.now()}`,
    code,
    sku: code,
    name: String(input?.name ?? input?.materialName ?? existingMaterial?.name ?? 'Raw Material').trim(),
    materialType: String(
      input?.materialType ?? existingMaterial?.materialType ?? 'Solid Timber'
    ).trim(),
    unit: String(input?.unit ?? existingMaterial?.unit ?? 'bd ft').trim(),
    unitCost,
    stockQuantity,
    minStockLevel,
    usedIn: String(
      input?.usedIn ?? existingMaterial?.usedIn ?? 'Workshop joinery, upholstery & finishing'
    ).trim(),
  };
}

/**
 * Determine stock status for a single Workshop Raw Material (`in_stock`, `low_stock`, or `out_of_stock`).
 */
export function getMaterialStockStatus(material) {
  const availableStock = Math.max(
    0,
    Number(material?.stockQuantity ?? material?.inStockCount ?? 0)
  );
  const minStockLevel = Math.max(0, Number(material?.minStockLevel ?? 10));

  if (availableStock === 0) {
    return {
      status: 'out_of_stock',
      statusKey: 'out_of_stock',
      label: 'Out of Stock',
      statusLabel: 'Out of Stock',
      availableStock,
      minStockLevel,
    };
  }
  if (availableStock <= minStockLevel) {
    return {
      status: 'low_stock',
      statusKey: 'low_stock',
      label: 'Low Stock',
      statusLabel: 'Low Stock',
      availableStock,
      minStockLevel,
    };
  }
  return {
    status: 'in_stock',
    statusKey: 'in_stock',
    label: 'In Stock',
    statusLabel: 'In Stock',
    availableStock,
    minStockLevel,
  };
}

/**
 * Determine stock status for a single product (`in_stock`, `low_stock`, or `out_of_stock`).
 */
export function getProductStockStatus(product) {
  const availableStock = Math.max(
    0,
    Math.floor(Number(product?.inStockCount ?? product?.stockQuantity ?? 0))
  );
  const minStockLevel = Math.max(0, Math.floor(Number(product?.minStockLevel ?? 2)));

  if (availableStock === 0) {
    return {
      status: 'out_of_stock',
      statusKey: 'out_of_stock',
      label: 'Out of Stock',
      statusLabel: 'Out of Stock',
      availableStock,
      minStockLevel,
    };
  }
  if (availableStock <= minStockLevel) {
    return {
      status: 'low_stock',
      statusKey: 'low_stock',
      label: 'Low Stock',
      statusLabel: 'Low Stock',
      availableStock,
      minStockLevel,
    };
  }
  return {
    status: 'in_stock',
    statusKey: 'in_stock',
    label: 'In Stock',
    statusLabel: 'In Stock',
    availableStock,
    minStockLevel,
  };
}

/**
 * Compute summary metrics for the Workshop Raw Material Inventory Overview dashboard.
 */
export function computeMaterialInventoryMetrics(materials = []) {
  const safeMaterials = Array.isArray(materials) ? materials : [];
  let totalStockUnits = 0;
  let totalInventoryValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const lowStockItems = [];
  const outOfStockItems = [];

  safeMaterials.forEach((mat) => {
    const info = getMaterialStockStatus(mat);
    totalStockUnits += info.availableStock;
    totalInventoryValue += Math.round(info.availableStock * Number(mat?.unitCost || 0));
    if (info.statusKey === 'out_of_stock') {
      outOfStockCount += 1;
      outOfStockItems.push(mat);
    } else if (info.statusKey === 'low_stock') {
      lowStockCount += 1;
      lowStockItems.push(mat);
    }
  });

  return {
    totalMaterials: safeMaterials.length,
    totalProducts: safeMaterials.length,
    totalStockAvailable: totalStockUnits,
    totalStockQuantity: totalStockUnits,
    totalInventoryValue,
    lowStockCount,
    outOfStockCount,
    lowStockItems,
    outOfStockItems,
  };
}

/**
 * Compute summary metrics for inventory items (supports both Materials and Products).
 */
export function computeInventoryMetrics(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  const isMaterialList = safeItems.some((i) => i && Object.prototype.hasOwnProperty.call(i, 'stockQuantity'));
  if (isMaterialList) {
    return computeMaterialInventoryMetrics(safeItems);
  }

  let totalStockAvailable = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const lowStockItems = [];
  const outOfStockItems = [];

  safeItems.forEach((p) => {
    const statusInfo = getProductStockStatus(p);
    totalStockAvailable += statusInfo.availableStock;
    if (statusInfo.statusKey === 'out_of_stock') {
      outOfStockCount += 1;
      outOfStockItems.push(p);
    } else if (statusInfo.statusKey === 'low_stock') {
      lowStockCount += 1;
      lowStockItems.push(p);
    }
  });

  return {
    totalProducts: safeItems.length,
    totalMaterials: safeItems.length,
    totalStockAvailable,
    lowStockCount,
    outOfStockCount,
    lowStockItems,
    outOfStockItems,
  };
}

/**
 * Validate and apply a Raw Material Stock In or Stock Out movement (`Material` table in `database/furniture.sql`).
 */
export function applyMaterialStockMovement({
  materials = [],
  movementInput = null,
  adminName = 'Lillia Mercier (Business Owner)',
  materialId: directMaterialId,
  transactionType: directTransactionType,
  quantity: directQuantity,
  purchaseCost: directPurchaseCost,
  reason: directReason,
  date: directDate,
}) {
  const payload =
    movementInput && typeof movementInput === 'object'
      ? movementInput
      : {
          materialId: directMaterialId,
          transactionType: directTransactionType,
          quantity: directQuantity,
          purchaseCost: directPurchaseCost,
          reason: directReason,
          date: directDate,
        };

  const materialId = String(payload?.materialId || payload?.productId || '').trim();
  const transactionType =
    String(payload?.transactionType || 'Stock In').trim() === 'Stock Out'
      ? 'Stock Out'
      : 'Stock In';
  const rawQty = Number(payload?.quantity);
  const quantity = Number.isFinite(rawQty) ? Math.floor(rawQty) : 0;

  if (!materialId) {
    return { ok: false, errorMessage: 'Please select a workshop material.' };
  }
  if (quantity <= 0) {
    return { ok: false, errorMessage: 'Quantity must be a positive number greater than 0.' };
  }

  const targetMaterial = Array.isArray(materials)
    ? materials.find((m) => m.id === materialId)
    : null;

  if (!targetMaterial) {
    return { ok: false, errorMessage: 'Selected material was not found in workshop inventory.' };
  }

  const previousStock = Math.max(0, Number(targetMaterial.stockQuantity ?? 0));

  if (transactionType === 'Stock Out' && quantity > previousStock) {
    return {
      ok: false,
      errorMessage: `Cannot deduct ${quantity} ${targetMaterial.unit || 'units'}: "${targetMaterial.name}" only has ${previousStock} ${targetMaterial.unit || 'units'} available in stock.`,
    };
  }

  let purchaseCost = null;
  let reason = String(payload?.reason || '').trim();

  if (transactionType === 'Stock In') {
    if (
      payload?.purchaseCost !== undefined &&
      payload?.purchaseCost !== '' &&
      payload?.purchaseCost !== null
    ) {
      const parsedCost = Number(payload.purchaseCost);
      if (!Number.isFinite(parsedCost) || parsedCost < 0) {
        return { ok: false, errorMessage: 'Purchase cost must be 0 or a positive amount.' };
      }
      purchaseCost = Math.round(parsedCost * 100) / 100;
    } else {
      purchaseCost = Math.round(quantity * Number(targetMaterial.unitCost || 0) * 100) / 100;
    }
    if (!reason) reason = 'Workshop Raw Material Restock';
  } else {
    if (!reason) {
      return {
        ok: false,
        errorMessage: 'Please specify a reason for Material Stock Out (e.g., Workshop Production, Damaged, Adjustment).',
      };
    }
  }

  const newStock =
    transactionType === 'Stock In' ? previousStock + quantity : previousStock - quantity;

  const updatedMaterial = {
    ...targetMaterial,
    stockQuantity: newStock,
  };

  const updatedMaterials = materials.map((m) => (m.id === materialId ? updatedMaterial : m));

  const nowIso = new Date();
  const datePart = String(payload?.date || nowIso.toISOString().slice(0, 10)).trim();
  const timePart = nowIso.toTimeString().slice(0, 5);

  const transaction = {
    id: `inv-tx-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
    materialId: targetMaterial.id,
    materialName: targetMaterial.name,
    materialCode: targetMaterial.code || 'MAT-01',
    materialType: targetMaterial.materialType || 'Solid Timber',
    unit: targetMaterial.unit || 'units',
    transactionType,
    quantity,
    previousStock,
    newStock,
    purchaseCost,
    unitCost: targetMaterial.unitCost,
    reason,
    dateTime: `${datePart} ${timePart}`,
    adminName: String(adminName || 'Lillia Mercier (Business Owner)').trim(),
  };

  return {
    ok: true,
    errorMessage: '',
    updatedMaterial,
    updatedMaterials,
    updatedProduct: updatedMaterial,
    updatedCatalog: updatedMaterials,
    transaction,
  };
}

/**
 * Validate and apply a Stock In or Stock Out movement.
 * Supports both `materials` (Workshop Raw Materials) and `catalog` (Products) for full compatibility.
 */
export function applyStockMovement(params = {}) {
  if (Array.isArray(params.materials) && params.materials.length > 0) {
    return applyMaterialStockMovement(params);
  }

  const {
    catalog = [],
    movementInput = null,
    adminName = 'Lillia Mercier (Business Owner)',
    productId: directProductId,
    transactionType: directTransactionType,
    quantity: directQuantity,
    purchaseCost: directPurchaseCost,
    reason: directReason,
    date: directDate,
  } = params;

  const payload =
    movementInput && typeof movementInput === 'object'
      ? movementInput
      : {
          productId: directProductId,
          transactionType: directTransactionType,
          quantity: directQuantity,
          purchaseCost: directPurchaseCost,
          reason: directReason,
          date: directDate,
        };

  const productId = String(payload?.productId || payload?.materialId || '').trim();
  const transactionType =
    String(payload?.transactionType || 'Stock In').trim() === 'Stock Out'
      ? 'Stock Out'
      : 'Stock In';
  const rawQty = Number(payload?.quantity);
  const quantity = Number.isFinite(rawQty) ? Math.floor(rawQty) : 0;

  if (!productId) {
    return { ok: false, errorMessage: 'Please select a valid item.' };
  }
  if (quantity <= 0) {
    return { ok: false, errorMessage: 'Quantity must be a positive whole number greater than 0.' };
  }

  const targetProduct = Array.isArray(catalog)
    ? catalog.find((p) => p.id === productId)
    : null;

  if (!targetProduct) {
    return { ok: false, errorMessage: 'Selected item was not found in inventory.' };
  }

  const isMaterialItem = Object.prototype.hasOwnProperty.call(targetProduct, 'stockQuantity');
  if (isMaterialItem) {
    return applyMaterialStockMovement({
      ...params,
      materials: catalog,
    });
  }

  const previousStock = Math.max(0, Math.floor(Number(targetProduct.inStockCount ?? 0)));

  if (transactionType === 'Stock Out' && quantity > previousStock) {
    return {
      ok: false,
      errorMessage: `Cannot deduct ${quantity} units: "${targetProduct.name}" only has ${previousStock} available in stock.`,
    };
  }

  let purchaseCost = null;
  let reason = String(payload?.reason || '').trim();

  if (transactionType === 'Stock In') {
    if (
      payload?.purchaseCost !== undefined &&
      payload?.purchaseCost !== '' &&
      payload?.purchaseCost !== null
    ) {
      const parsedCost = Number(payload.purchaseCost);
      if (!Number.isFinite(parsedCost) || parsedCost < 0) {
        return { ok: false, errorMessage: 'Purchase cost must be 0 or a positive amount.' };
      }
      purchaseCost = Math.round(parsedCost * 100) / 100;
    }
    if (!reason) reason = 'Inventory Restock';
  } else {
    if (!reason) {
      return {
        ok: false,
        errorMessage: 'Please select or enter a reason for Stock Out (e.g., Damaged, Adjustment).',
      };
    }
  }

  const newStock =
    transactionType === 'Stock In' ? previousStock + quantity : previousStock - quantity;

  const updatedProduct = {
    ...targetProduct,
    inStockCount: newStock,
  };

  const updatedCatalog = catalog.map((p) => (p.id === productId ? updatedProduct : p));

  const nowIso = new Date();
  const datePart = String(payload?.date || nowIso.toISOString().slice(0, 10)).trim();
  const timePart = nowIso.toTimeString().slice(0, 5);

  const transaction = {
    id: `inv-tx-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
    productId: targetProduct.id,
    productName: targetProduct.name,
    productSku: targetProduct.sku,
    transactionType,
    quantity,
    previousStock,
    newStock,
    purchaseCost,
    reason,
    dateTime: `${datePart} ${timePart}`,
    adminName: String(adminName || 'Lillia Mercier (Business Owner)').trim(),
  };

  return {
    ok: true,
    errorMessage: '',
    updatedProduct,
    updatedCatalog,
    transaction,
  };
}

/**
 * Remove a product from the catalog and clean up any cart items or active vouchers tied to it.
 */
export function removeProductFromCatalog({
  catalog = [],
  cartItems = [],
  vouchers = [],
  productId = '',
}) {
  const cleanId = String(productId || '').trim();
  if (!cleanId) {
    return {
      ok: false,
      errorMessage: 'Please select a valid product to remove.',
      removedProduct: null,
      updatedCatalog: Array.isArray(catalog) ? catalog : [],
      updatedCartItems: Array.isArray(cartItems) ? cartItems : [],
      updatedVouchers: Array.isArray(vouchers) ? vouchers : [],
    };
  }

  const safeCatalog = Array.isArray(catalog) ? catalog : [];
  const removedProduct = safeCatalog.find((p) => p.id === cleanId) || null;
  if (!removedProduct) {
    return {
      ok: false,
      errorMessage: 'Product not found in catalog.',
      removedProduct: null,
      updatedCatalog: safeCatalog,
      updatedCartItems: Array.isArray(cartItems) ? cartItems : [],
      updatedVouchers: Array.isArray(vouchers) ? vouchers : [],
    };
  }

  const updatedCatalog = safeCatalog.filter((p) => p.id !== cleanId);
  const updatedCartItems = (Array.isArray(cartItems) ? cartItems : []).filter((entry) => {
    const entryPid = entry?.product?.id || entry?.productId || entry?.furnitureId || entry?.id || '';
    return entryPid !== cleanId;
  });
  const updatedVouchers = (Array.isArray(vouchers) ? vouchers : []).map((v) => {
    const vPid = v?.furnitureId || v?.productId || '';
    if (vPid === cleanId && v.status === 'Active') {
      return { ...v, status: 'Cancelled' };
    }
    return v;
  });

  return {
    ok: true,
    errorMessage: '',
    removedProduct,
    updatedCatalog,
    updatedCartItems,
    updatedVouchers,
  };
}

/**
 * Remove a raw material from workshop inventory.
 */
export function removeMaterialFromInventory({
  materials = [],
  materialId = '',
}) {
  const cleanId = String(materialId || '').trim();
  const safeMaterials = Array.isArray(materials) ? materials : [];
  const removedMaterial = safeMaterials.find((m) => m.id === cleanId) || null;
  if (!cleanId || !removedMaterial) {
    return {
      ok: false,
      errorMessage: 'Material not found in inventory.',
      removedMaterial: null,
      updatedMaterials: safeMaterials,
    };
  }

  const updatedMaterials = safeMaterials.filter((m) => m.id !== cleanId);

  return {
    ok: true,
    errorMessage: '',
    removedMaterial,
    updatedMaterials,
  };
}

/**
 * Compute plain-English stock status, visual fill bar percentage, and live Before -> After
 * preview for non-technical shop administrators.
 */
export function describeMaterialStockPreview(material, mode = 'Stock In', rawQty = 0) {
  if (!material) {
    return {
      currentStock: 0,
      qty: 0,
      projectedStock: 0,
      insufficientStock: false,
      unit: 'units',
      minStockLevel: 10,
      currentStatusKey: 'out_of_stock',
      currentFriendlyLabel: 'Out of stock',
      projectedStatusKey: 'out_of_stock',
      projectedFriendlyLabel: 'Out of stock',
      fillPercent: 0,
      totalValue: 0,
    };
  }

  const currentStock = Math.max(0, Math.round(Number(material.stockQuantity ?? material.inStockCount ?? 0) * 100) / 100);
  const minStockLevel = Math.max(0, Math.floor(Number(material.minStockLevel ?? 10)));
  const unitCost = Math.max(0, Number(material.unitCost ?? 0));
  const unit = String(material.unit || 'units').trim() || 'units';
  const qty = Math.max(0, Math.round(Number(rawQty || 0) * 100) / 100);
  const isStockOut = mode === 'Stock Out';

  const insufficientStock = isStockOut && qty > currentStock;
  const projectedStock = isStockOut
    ? Math.max(0, Math.round((currentStock - qty) * 100) / 100)
    : Math.round((currentStock + qty) * 100) / 100;

  const toFriendlyStatus = (stock) => {
    if (stock <= 0) {
      return { key: 'out_of_stock', label: 'Out of stock — needs restock' };
    }
    if (stock <= minStockLevel) {
      return { key: 'low_stock', label: 'Running low — restock soon' };
    }
    return { key: 'in_stock', label: 'Plenty in stock' };
  };

  const currSt = toFriendlyStatus(currentStock);
  const projSt = toFriendlyStatus(projectedStock);

  const healthyTarget = Math.max(minStockLevel * 3, 20);
  const fillPercent =
    currentStock <= 0
      ? 0
      : Math.min(100, Math.max(8, Math.round((currentStock / healthyTarget) * 100)));

  return {
    currentStock,
    qty,
    projectedStock,
    insufficientStock,
    unit,
    minStockLevel,
    currentStatusKey: currSt.key,
    currentFriendlyLabel: currSt.label,
    projectedStatusKey: projSt.key,
    projectedFriendlyLabel: projSt.label,
    fillPercent,
    totalValue: Math.round(currentStock * unitCost * 100) / 100,
  };
}

/**
 * Returns up to `maxItems` (default 4) Recommended / Best Seller furniture pieces for the Homepage.
 */
export function getRecommendedBestSellers(items, maxItems = 4) {
  const list = Array.isArray(items) ? items : [];
  const cap = Math.max(1, Math.min(4, Number(maxItems || 4)));
  const bestSellers = list.filter((item) => Boolean(item.isBestSeller));
  if (bestSellers.length >= 3) {
    return bestSellers.slice(0, cap);
  }
  return list.slice(0, cap);
}

/**
 * Curated color filter definitions for the Catalog Page left sidebar.
 */
export const CATALOG_COLOR_FILTERS = [
  { key: 'walnut', label: 'dark walnut', hex: '#5C3A21', keywords: ['walnut'] },
  { key: 'white-oak', label: 'white oak', hex: '#CBB28D', keywords: ['white oak', 'natural oak'] },
  { key: 'smoked-oak', label: 'smoked oak', hex: '#9C8265', keywords: ['smoked', 'fumed', 'chestnut'] },
  { key: 'ebonized', label: 'ebonized black', hex: '#222428', keywords: ['ebonized', 'black'] },
  { key: 'boucle', label: 'warm oat bouclé', hex: '#E6DEC8', keywords: ['bouclé', 'boucle'] },
  { key: 'linen', label: 'beige linen', hex: '#DDD3C2', keywords: ['linen'] },
  { key: 'ash', label: 'natural ash', hex: '#D9C7AE', keywords: ['ash'] },
  { key: 'travertine', label: 'travertine stone', hex: '#D8CABB', keywords: ['travertine', 'limestone'] },
  { key: 'cognac', label: 'cognac leather', hex: '#8A4B29', keywords: ['cognac', 'leather'] },
  { key: 'indigo', label: 'midnight indigo', hex: '#243B55', keywords: ['indigo', 'mohair'] },
];

/**
 * Checks if a product has a color variant matching the given `colorKey`,
 * and returns the first matching color variant object (or null).
 */
export function findMatchingColorVariant(item, colorKey) {
  if (!colorKey || colorKey === 'all') return null;
  const filterDef = CATALOG_COLOR_FILTERS.find((c) => c.key === colorKey);
  const keywords = filterDef ? filterDef.keywords : [String(colorKey).toLowerCase()];
  const variants = Array.isArray(item?.colorVariants) ? item.colorVariants : [];

  for (const variant of variants) {
    const nameLower = String(variant.name || '').toLowerCase();
    if (keywords.some((kw) => nameLower.includes(kw))) {
      return variant;
    }
  }
  return null;
}

/**
 * Filters products on the dedicated Catalog page by category, color filter, max price, and search query.
 */
export function filterCatalogPageItems(items, options = {}) {
  const {
    categoryId = 'all',
    colorKey = 'all',
    maxPrice = Infinity,
    searchQuery = '',
  } = options;

  const normalizedQuery = String(searchQuery || '').trim().toLowerCase();
  const numericMaxPrice = Number.isFinite(Number(maxPrice)) ? Number(maxPrice) : Infinity;

  return (items || []).filter((item) => {
    const matchesCategory = !categoryId || categoryId === 'all' || item.categoryId === categoryId;
    if (!matchesCategory) return false;

    let effectiveCheckPrice = Number(item.effectivePrice ?? item.price ?? 0);
    if (colorKey && colorKey !== 'all') {
      const matchedVariant = findMatchingColorVariant(item, colorKey);
      if (!matchedVariant) return false;
      effectiveCheckPrice = computeVariantPricing(item, matchedVariant.name).effectivePrice;
    }

    if (effectiveCheckPrice > numericMaxPrice) return false;

    if (normalizedQuery) {
      const searchableText = [
        item.name,
        item.sku,
        item.categoryName,
        item.description,
        item.defaultFinish,
        ...(item.finishes || []),
      ]
        .join(' ')
        .toLowerCase();
      if (!searchableText.includes(normalizedQuery)) return false;
    }

    return true;
  });
}

/**
 * Computes product counts for each left-sidebar color filter within the active category and price range.
 */
export function getColorFilterCounts(items, categoryId = 'all', maxPrice = Infinity) {
  return CATALOG_COLOR_FILTERS.map((colorDef) => {
    const matching = filterCatalogPageItems(items, {
      categoryId,
      colorKey: colorDef.key,
      maxPrice,
    });
    return {
      ...colorDef,
      count: matching.length,
    };
  });
}

/**
 * Formats a catalog item strictly for the customer-facing storefront.
 * Strips internal administrative identifiers (SKU codes, database IDs, internal reference numbers)
 * from the returned display object and provides clean, customer-friendly labels for price,
 * finish options, availability status, and delivery estimate.
 */
export function formatCustomerProductDisplay(item, selectedFinishName) {
  const selectedFinish =
    selectedFinishName || item?.colorVariants?.[0]?.name || item?.defaultFinish || 'Natural Finish';
  const pricing = computeVariantPricing(item, selectedFinish);
  const stockInfo = getProductStockStatus(item);
  const isOutOfStock = stockInfo.statusKey === 'out_of_stock';
  const isLowStock = stockInfo.statusKey === 'low_stock';
  const leadTimeWeeks = Math.max(1, Number(item?.leadTimeWeeks || 3));

  const availabilityLabel = isOutOfStock
    ? 'Out of Stock'
    : isLowStock
    ? `Low Stock · ${stockInfo.availableStock} left`
    : 'In Stock';

  const availabilityDetail = isOutOfStock
    ? 'Currently unavailable'
    : `${stockInfo.availableStock} available · Ships in ${leadTimeWeeks} ${leadTimeWeeks === 1 ? 'week' : 'weeks'}`;

  const rawDescription = String(item?.customizationNotes || item?.description || '').trim();

  return {
    name: String(item?.name || 'Handcrafted Furniture Piece').trim(),
    categoryName: String(item?.categoryName || 'Showroom Collection').trim(),
    image: String(item?.image || 'assets/images/category_living_lounge.jpg').trim(),
    effectivePrice: pricing.effectivePrice,
    variantBasePrice: pricing.variantBasePrice,
    discountPercent: Math.max(0, Number(item?.discountPercent || 0)),
    hasDiscount: Number(item?.discountPercent || 0) > 0,
    selectedFinish: pricing.colorName,
    selectedColorHex: pricing.colorHex,
    priceDelta: pricing.priceDelta,
    colorVariants: (item?.colorVariants || []).map((v) => ({
      name: v.name,
      shortLabel: String(v.name || '').split('/')[0].trim(),
      hex: v.hex || '#8B5A2B',
      priceDelta: Number(v.priceDelta || 0),
    })),
    description: rawDescription,
    craftsmanshipNote: String(item?.craftsmanshipNote || '').trim(),
    dimensions: String(item?.dimensions || '').trim(),
    availabilityStatus: stockInfo.statusKey,
    availabilityLabel,
    availabilityDetail,
    availableStock: stockInfo.availableStock,
    isOutOfStock,
    isLowStock,
    leadTimeWeeks,
  };
}

/**
 * Resolves authentication-based navigation and UI visibility state across all customer-facing pages.
 */
export function resolveAuthNavigationState(rawSessionUser) {
  let sessionObj = rawSessionUser;
  if (typeof rawSessionUser === 'string') {
    try {
      sessionObj = JSON.parse(rawSessionUser);
    } catch (_e) {
      sessionObj = null;
    }
  }

  const email = String(sessionObj?.email || '').trim();
  const rawRole = String(sessionObj?.role || '').trim().toLowerCase();
  const isValidSession = Boolean(email && (rawRole === 'client' || rawRole === 'customer' || rawRole === 'admin'));

  if (!isValidSession) {
    return {
      isAuthenticated: false,
      isCustomer: false,
      isAdmin: false,
      role: 'guest',
      showSignIn: true,
      showRegister: true,
      showCustomerAccountNav: false,
      showAdminNav: false,
      showLoginPrompts: true,
      userDisplayName: '',
      userInitials: '',
      userEmail: '',
      accountLinks: {
        signIn: { href: 'login.html', label: 'Sign In' },
        register: { href: 'login.html?mode=register', label: 'Register' },
        myAccount: null,
        myOrders: null,
        myCart: null,
        myVouchers: null,
        adminDashboard: null,
      },
      heroOrderLink: {
        href: 'login.html',
        label: 'Track My Order →',
      },
      cartCheckoutCta: {
        href: 'login.html',
        label: 'Sign In to Checkout →',
      },
      cartVoucherHint: 'Sign in to verify your email',
    };
  }

  const isAdmin = rawRole === 'admin';
  const isCustomer = !isAdmin;
  const fallbackName = isAdmin
    ? 'Lillia Mercier'
    : email.toLowerCase() === 'rowena.vance@vancearchitects.com'
    ? 'Rowena Vance'
    : email.split('@')[0] || 'Customer';
  const userDisplayName = String(sessionObj?.name || fallbackName).trim();
  const userInitials =
    userDisplayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => (part[0] || '').toUpperCase())
      .join('') || (isAdmin ? 'AD' : 'CU');

  if (isAdmin) {
    return {
      isAuthenticated: true,
      isCustomer: false,
      isAdmin: true,
      role: 'admin',
      showSignIn: false,
      showRegister: false,
      showCustomerAccountNav: false,
      showAdminNav: true,
      showLoginPrompts: false,
      userDisplayName,
      userInitials,
      userEmail: email,
      accountLinks: {
        signIn: null,
        register: null,
        myAccount: null,
        myOrders: null,
        myCart: null,
        myVouchers: null,
        adminDashboard: { href: 'dashboard.html?role=admin', label: 'Admin Dashboard' },
      },
      heroOrderLink: {
        href: 'dashboard.html?role=admin',
        label: 'Admin Dashboard →',
      },
      cartCheckoutCta: {
        href: 'dashboard.html?role=admin',
        label: 'Open Admin Dashboard →',
      },
      cartVoucherHint: email,
    };
  }

  return {
    isAuthenticated: true,
    isCustomer: true,
    isAdmin: false,
    role: 'client',
    showSignIn: false,
    showRegister: false,
    showCustomerAccountNav: true,
    showAdminNav: false,
    showLoginPrompts: false,
    userDisplayName,
    userInitials,
    userEmail: email,
    accountLinks: {
      signIn: null,
      register: null,
      myAccount: { href: 'dashboard.html?role=client&tab=home', label: 'My Account' },
      myOrders: { href: 'dashboard.html?role=client&tab=orders', label: 'My Orders' },
      myCart: { href: 'dashboard.html?role=client&tab=cart', label: 'My Cart' },
      myVouchers: { href: 'dashboard.html?role=client&tab=vouchers', label: 'My Vouchers' },
      adminDashboard: null,
    },
    heroOrderLink: {
      href: 'dashboard.html?role=client&tab=orders',
      label: 'My Orders →',
    },
    cartCheckoutCta: {
      href: 'dashboard.html?role=client&tab=cart',
      label: 'Proceed to Checkout →',
    },
    cartVoucherHint: email,
  };
}

/**
 * Validates customer input for the "Make Offer" modal inside Product Details
 * and constructs an offer proposal record ready to be rendered as a downloadable/copyable image.
 * IMPORTANT: Submitting an offer does NOT modify product prices, inventory, or auto-approve discounts.
 */
export function validateAndBuildOfferProposal(offerInput = {}, product = null, sessionUser = null) {
  if (!product || typeof product !== 'object' || !product.id || !product.name) {
    return {
      ok: false,
      errorMessage: 'Please select a valid product before submitting an offer.',
      proposal: null,
    };
  }

  const rawProposed = offerInput?.proposedPrice;
  const numericProposed = Number(rawProposed);
  if (
    rawProposed === undefined ||
    rawProposed === null ||
    String(rawProposed).trim() === '' ||
    !Number.isFinite(numericProposed) ||
    numericProposed <= 0
  ) {
    return {
      ok: false,
      errorMessage: 'Please enter a valid proposed price greater than $0.',
      proposal: null,
    };
  }

  if (numericProposed < 25) {
    return {
      ok: false,
      errorMessage: 'Proposed price must be at least $25.',
      proposal: null,
    };
  }

  const selectedFinish = String(
    offerInput?.selectedFinish ||
      product.colorVariants?.[0]?.name ||
      product.defaultFinish ||
      'Natural Finish'
  ).trim();
  const pricing = computeVariantPricing(product, selectedFinish);
  const originalPrice =
    Number(offerInput?.originalPrice) > 0
      ? Math.round(Number(offerInput.originalPrice))
      : pricing.effectivePrice;
  const proposedPrice = Math.round(numericProposed);
  const customizations =
    String(offerInput?.customizations || '').trim() || 'Standard showroom dimensions & finish';
  const additionalNotes = String(offerInput?.additionalNotes || '').trim();
  const referenceImageDataUrl = offerInput?.referenceImageDataUrl
    ? String(offerInput.referenceImageDataUrl).trim()
    : null;
  const referenceImageName = offerInput?.referenceImageName
    ? String(offerInput.referenceImageName).trim()
    : null;

  const customerName = String(
    sessionUser?.name || offerInput?.customerName || 'Showroom Customer'
  ).trim();
  const customerEmail = String(sessionUser?.email || offerInput?.customerEmail || '').trim();
  const createdDate = String(offerInput?.createdDate || new Date().toISOString().slice(0, 10));
  const slug = String(product.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const proposal = {
    id: `offer-${Date.now()}`,
    proposalCode: `OFFER-${Math.floor(1000 + Math.random() * 8999)}`,
    productId: String(product.id),
    productName: String(product.name).trim(),
    categoryName: String(product.categoryName || 'Showroom Collection').trim(),
    productImage: String(product.image || 'assets/images/category_living_lounge.jpg').trim(),
    dimensions: String(product.dimensions || 'Standard Showroom Dimensions').trim(),
    selectedFinish,
    originalPrice,
    proposedPrice,
    requestedSavings: Math.max(0, originalPrice - proposedPrice),
    customizations,
    additionalNotes,
    referenceImageDataUrl,
    referenceImageName,
    customerName,
    customerEmail,
    createdDate,
    downloadFilename: `offer-proposal-${slug || 'furniture'}.png`,
    status: 'Pending Owner Review on Messenger',
  };

  return {
    ok: true,
    errorMessage: null,
    proposal,
  };
}

/**
 * Resolves the "Request a Design" button action.
 * - If the user is NOT logged in, requires login first (`login.html?redirect=request-design`).
 * - If the user IS logged in, redirects directly to the Admin's Messenger conversation
 *   with a pre-populated custom furniture design inquiry message.
 */
export function buildRequestDesignMessengerUrl(
  rawSessionUser,
  baseMessengerUrl = ADMIN_MESSENGER_PLACEHOLDER_URL
) {
  const authState = resolveAuthNavigationState(rawSessionUser);
  if (!authState.isAuthenticated) {
    return {
      requiresLogin: true,
      redirectUrl: 'login.html?redirect=request-design',
      messengerUrl: baseMessengerUrl,
      messageText: '',
    };
  }

  const customerLabel = authState.userDisplayName
    ? `${authState.userDisplayName} (${authState.userEmail})`
    : authState.userEmail;
  const messageText = `Hi Lillia and Rowena Furniture! I am ${customerLabel} and I would like to request a custom furniture design.`;
  const separator = baseMessengerUrl.includes('?') ? '&' : '?';
  const messengerUrl = `${baseMessengerUrl}${separator}ref=custom-design-request&text=${encodeURIComponent(
    messageText
  )}`;

  return {
    requiresLogin: false,
    redirectUrl: messengerUrl,
    messengerUrl,
    messageText,
  };
}
