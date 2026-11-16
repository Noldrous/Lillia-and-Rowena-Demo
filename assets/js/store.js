/**
 * Pure JavaScript Store & Business Logic Module
 * Maps directly to the MySQL 8.0.16+ InnoDB 12-table schema in `database/furniture.sql`:
 * Admin, Category, Customer, Product, Material, Voucher, Customer_Order,
 * Order_Item, Order_Item_Material, Customization, Payment, Production_Task
 */

export const ADMIN_MESSENGER_PLACEHOLDER_URL = 'https://www.messenger.com/t/100000505712325';

export const PRODUCT_TYPES = {
  NORMAL: 'standard',
  CUSTOMIZED: 'customized',
};

const CATEGORY_LABELS = {
  living: 'Living Room',
  dining: 'Dining Room',
  bedroom: 'Bedroom',
  office: 'Study/Work Desks',
  kitchen: 'Kitchen',
};

const DEFAULT_CATEGORY_IMAGES = {
  living: 'assets/images/category_living_lounge.jpg',
  dining: 'assets/images/category_dining_tables.jpg',
  bedroom: 'assets/images/category_bedroom_sanctuary.jpg',
  office: 'assets/images/category_office_storage.jpg',
  kitchen: 'assets/images/category_dining_tables.jpg',
};

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
  const categoryName =
    input?.categoryName ||
    CATEGORY_LABELS[categoryId] ||
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
    if (parsed.length > 0) colorVariants = parsed;
  }

  if (!Array.isArray(colorVariants) || colorVariants.length === 0) {
    colorVariants = [{ name: 'Hand-Rubbed Natural Timber', hex: '#5C3A21', priceDelta: 0 }];
  }

  const messengerConversationId = isCustomized
    ? String(input?.messengerConversationId ?? existingProduct?.messengerConversationId ?? '').trim() || null
    : null;
  const messengerCustomerName = isCustomized
    ? String(input?.messengerCustomerName ?? existingProduct?.messengerCustomerName ?? '').trim() || null
    : null;
  const messengerTopic = isCustomized
    ? String(input?.messengerTopic ?? existingProduct?.messengerTopic ?? '').trim() || null
    : null;
  const customizationNotes = isCustomized
    ? String(
        input?.customizationNotes ?? existingProduct?.customizationNotes ?? input?.description ?? ''
      ).trim() ||
      'Custom furniture piece created from a customer customization request. Available in the public catalog for all clients.'
    : null;

  const resolvedImage =
    String(input?.image ?? existingProduct?.image ?? '').trim() ||
    DEFAULT_CATEGORY_IMAGES[categoryId] ||
    'assets/images/category_dining_tables.jpg';

  const rawStock = input?.inStockCount ?? existingProduct?.inStockCount ?? 4;
  const inStockCount = Math.max(0, Math.floor(Number.isFinite(Number(rawStock)) ? Number(rawStock) : 4));

  const rawMinStock = input?.minStockLevel ?? existingProduct?.minStockLevel ?? 2;
  const minStockLevel = Math.max(0, Math.floor(Number.isFinite(Number(rawMinStock)) ? Number(rawMinStock) : 2));

  return {
    ...(existingProduct || {}),
    id: existingProduct?.id || input?.id || `furn-${isCustomized ? 'cust' : 'std'}-${Date.now()}`,
    sku: String(input?.sku ?? existingProduct?.sku ?? 'LR-NEW-001').trim().toUpperCase(),
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
    dimensions: String(input?.dimensions ?? existingProduct?.dimensions ?? 'Standard Dimensions').trim(),
    leadTimeWeeks: Number(input?.leadTimeWeeks ?? existingProduct?.leadTimeWeeks ?? (isCustomized ? 5 : 4)),
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

export function buildAdminMessengerUrl(payload = {}) {
  const mode = payload.mode || 'direct-offer';
  const skuPart = payload.sku ? `_${String(payload.sku).toLowerCase()}` : '';
  const colorPart = payload.colorName
    ? `_${String(payload.colorName).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    : '';
  const offerPart = payload.proposedPrice ? `_offer-${Math.round(Number(payload.proposedPrice))}` : '';
  const clientPart = payload.clientEmail ? `&client=${encodeURIComponent(payload.clientEmail)}` : '';

  return `${ADMIN_MESSENGER_PLACEHOLDER_URL}?ref=${encodeURIComponent(
    `${mode}${skuPart}${colorPart}${offerPart}`
  )}${clientPart}`;
}

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

export function formatVoucherBenefitLabel(voucher) {
  if (!voucher || typeof voucher !== 'object') return '';
  if (voucher.discountType === 'percentage' || Number(voucher.discountPercent || 0) > 0) {
    const pct = Number(voucher.discountPercent ?? voucher.discountValue ?? voucher.discountAmount ?? 0);
    return `${pct}% OFF`;
  }
  const amt = Number(voucher.discountAmount ?? voucher.discountValue ?? 0);
  return `$${Math.round(amt).toLocaleString('en-US')} OFF`;
}

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
    const normalizedIds = cartProductIds.map((entry) =>
      typeof entry === 'string'
        ? entry
        : entry?.product?.id || entry?.productId || entry?.furnitureId || entry?.id || ''
    );

    if (!normalizedIds.includes(targetProductId)) {
      return {
        valid: false,
        discountAmount: 0,
        voucher: matched,
        errorMessage: `This voucher is only valid for the selected product (${targetProductName}).`,
      };
    }

    if (cartProductIds.some((entry) => entry && typeof entry === 'object')) {
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
    (voucherOrDiscount.discountType === 'percentage' || Number(voucherOrDiscount.discountPercent || 0) > 0);

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
      ? Math.max(0, Number(voucherOrDiscount.discountAmount ?? voucherOrDiscount.discountValue ?? 0))
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

    const isVoucherEligible = Boolean(isVoucherObject && targetProductId && productId === targetProductId);
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

    return {
      productId,
      productName,
      quantity,
      unitPrice,
      rawLineTotal,
      isVoucherEligible,
      lineDiscount,
      finalLineTotal: Math.max(0, rawLineTotal - lineDiscount),
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
      item?.finish || item?.selectedFinish || authoritativeProduct.defaultFinish || 'Natural Finish';
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
    const vCheck = validateVoucherForOrder(vouchers, cleanCode, activeEmail, normalizedLines, catalog);
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
        return deducted
          ? { ...prod, inStockCount: Math.max(0, Math.floor(Number(prod.inStockCount ?? 0)) - deducted) }
          : prod;
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

  if (
    !Number.isFinite(lengthCm) ||
    lengthCm < 30 ||
    !Number.isFinite(widthCm) ||
    widthCm < 30 ||
    !Number.isFinite(heightCm) ||
    heightCm < 25
  ) {
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

  const prevMatStock = availableMatStock;
  const newMatStock = Math.max(0, prevMatStock - materialQtyNeeded);
  const updatedMaterial = { ...material, stockQuantity: newMatStock };
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

  const next = { ...orderOrParams, ...(updatesArg || {}) };

  if (updatesArg?.status && !updatesArg?.sqlStatus) {
    if (/Confirmed|Pending|Timber/i.test(updatesArg.status)) {
      next.sqlStatus = 'Pending';
      next.taskStatus = next.taskStatus === 'Done' ? 'InProgress' : next.taskStatus || 'Todo';
    } else if (/Joinery|Finishing|Millwork|Production/i.test(updatesArg.status)) {
      next.sqlStatus = 'InProduction';
      next.taskStatus = 'InProgress';
    } else if (/Quality|Ready/i.test(updatesArg.status)) {
      next.sqlStatus = 'Ready';
      next.taskStatus = 'Done';
    } else if (/Dispatched|Delivered/i.test(updatesArg.status)) {
      next.sqlStatus = 'Delivered';
      next.taskStatus = 'Done';
      if (next.deliveryStatus === 'Scheduled') next.deliveryStatus = 'InTransit';
    } else if (/Cancelled/i.test(updatesArg.status)) {
      next.sqlStatus = 'Cancelled';
    }
  }

  if (updatesArg?.deliveryStatus === 'Delivered') {
    next.sqlStatus = 'Delivered';
    next.taskStatus = 'Done';
    next.status = 'Delivered · White-Glove Installation Complete';
  } else if (updatesArg?.deliveryStatus === 'InTransit' && !/Dispatched|Delivered/i.test(next.status)) {
    next.status = 'Dispatched · White-Glove Transit';
    next.sqlStatus = 'Ready';
  }

  return next;
}

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

  const total = Math.max(0, Number(orderOrParams.totalAmount || 0));
  const currentPaid = Math.max(0, Number(orderOrParams.depositPaid || 0));
  const remaining = Math.max(0, total - currentPaid);
  const payment = amountToPay !== null ? Math.min(remaining, Math.max(0, Number(amountToPay))) : remaining;
  const nextPaid = currentPaid + payment;

  return {
    ...orderOrParams,
    depositPaid: nextPaid,
    paymentStatus:
      nextPaid >= total
        ? 'Paid in Full'
        : `Partial (${Math.round((nextPaid / Math.max(1, total)) * 100)}% Paid)`,
    lastPaymentDate: new Date().toISOString().slice(0, 10),
  };
}

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

export function buildMaterialRecord(input, existingMaterial = null) {
  const stockQuantity = Math.max(0, Number(input?.stockQuantity ?? existingMaterial?.stockQuantity ?? 0));
  const minStockLevel = Math.max(0, Number(input?.minStockLevel ?? existingMaterial?.minStockLevel ?? 10));
  const unitCost = Math.max(0, Number(input?.unitCost ?? existingMaterial?.unitCost ?? 25));

  const code = String(
    input?.code ??
      input?.sku ??
      existingMaterial?.code ??
      existingMaterial?.sku ??
      `MAT-${Math.floor(100 + Math.random() * 899)}`
  )
    .trim()
    .toUpperCase();

  return {
    ...(existingMaterial || {}),
    id: existingMaterial?.id || input?.id || `mat-${Date.now()}`,
    code,
    sku: code,
    name: String(input?.name ?? input?.materialName ?? existingMaterial?.name ?? 'Raw Material').trim(),
    materialType: String(input?.materialType ?? existingMaterial?.materialType ?? 'Solid Timber').trim(),
    unit: String(input?.unit ?? existingMaterial?.unit ?? 'bd ft').trim(),
    unitCost,
    stockQuantity,
    minStockLevel,
    usedIn: String(
      input?.usedIn ?? existingMaterial?.usedIn ?? 'Workshop joinery, upholstery & finishing'
    ).trim(),
  };
}

function classifyStockLevel(availableStock, minStockLevel) {
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

export function getMaterialStockStatus(material) {
  const availableStock = Math.max(0, Number(material?.stockQuantity ?? material?.inStockCount ?? 0));
  const minStockLevel = Math.max(0, Number(material?.minStockLevel ?? 10));
  return classifyStockLevel(availableStock, minStockLevel);
}

export function getProductStockStatus(product) {
  const availableStock = Math.max(
    0,
    Math.floor(Number(product?.inStockCount ?? product?.stockQuantity ?? 0))
  );
  const minStockLevel = Math.max(0, Math.floor(Number(product?.minStockLevel ?? 2)));
  return classifyStockLevel(availableStock, minStockLevel);
}

export function computeMaterialInventoryMetrics(materials = []) {
  const safeMaterials = Array.isArray(materials) ? materials : [];
  let totalStockUnits = 0;
  let totalInventoryValue = 0;
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const inStockItems = [];
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
    } else {
      inStockCount += 1;
      inStockItems.push(mat);
    }
  });

  return {
    totalMaterials: safeMaterials.length,
    totalProducts: safeMaterials.length,
    totalStockAvailable: totalStockUnits,
    totalStockQuantity: totalStockUnits,
    totalInventoryValue,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    inStockItems,
    lowStockItems,
    outOfStockItems,
  };
}

export function getMaterialCategories(materials = []) {
  const defaultCategories = [
    'Solid Timber',
    'Upholstery Textile',
    'Architectural Stone',
    'Hardware & Joinery',
    'Cord & Finishes',
  ];
  const seen = new Set(defaultCategories);
  const result = [...defaultCategories];
  (Array.isArray(materials) ? materials : []).forEach((mat) => {
    const cat = String(mat?.materialType || '').trim();
    if (cat && !seen.has(cat)) {
      seen.add(cat);
      result.push(cat);
    }
  });
  return result;
}

export function filterInventoryMaterials(materials = [], filters = {}) {
  const safeMaterials = Array.isArray(materials) ? materials : [];
  const query = String(filters?.searchQuery || '').trim().toLowerCase();
  const category = String(filters?.category || 'all').trim();
  const status = String(filters?.status || 'all').trim().toLowerCase();

  return safeMaterials.filter((mat) => {
    const matCategory = String(mat?.materialType || 'Solid Timber').trim();
    if (category && category !== 'all' && matCategory.toLowerCase() !== category.toLowerCase()) {
      return false;
    }

    const st = getMaterialStockStatus(mat);
    if (status && status !== 'all') {
      if (status === 'needs_restock') {
        if (st.statusKey !== 'low_stock' && st.statusKey !== 'out_of_stock') return false;
      } else if (st.statusKey !== status) {
        return false;
      }
    }

    if (query) {
      const hay = [
        mat?.name,
        mat?.code,
        mat?.sku,
        matCategory,
        mat?.unit,
        mat?.usedIn,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(query)) return false;
    }

    return true;
  });
}

export function paginateItems(items = [], currentPage = 1, pageSize = 5) {
  const safeItems = Array.isArray(items) ? items : [];
  const safePageSize = Math.max(1, Math.floor(Number(pageSize) || 5));
  const totalItems = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.min(totalPages, Math.max(1, Math.floor(Number(currentPage) || 1)));
  const offset = (safePage - 1) * safePageSize;
  const pagedItems = safeItems.slice(offset, offset + safePageSize);
  const startIndex = totalItems === 0 ? 0 : offset + 1;
  const endIndex = Math.min(totalItems, offset + pagedItems.length);

  return {
    items: pagedItems,
    currentPage: safePage,
    pageSize: safePageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}

export function computeCustomerDirectory(orders = [], customers = [], customerProfile = null) {
  const byEmail = new Map();

  const upsert = (entry) => {
    const email = String(entry?.email || '').trim().toLowerCase();
    if (!email || email === 'admin@lilliarowena.com' || entry?.role === 'admin') return;
    const existing = byEmail.get(email) || {
      id: entry.id || `cust-${byEmail.size + 101}`,
      name: entry.name || 'Client',
      email: entry.email.trim(),
      phone: entry.phone || '+1 (212) 555-0140',
      address: entry.address || 'Showroom Registered Client',
      company: entry.company || 'Private Residence',
      orderCount: 0,
      totalSpent: 0,
      lastOrderDate: '—',
    };
    byEmail.set(email, {
      ...existing,
      name: entry.name || existing.name,
      phone: entry.phone || existing.phone,
      address: entry.address || existing.address,
      company: entry.company || existing.company,
    });
  };

  if (
    customerProfile &&
    customerProfile.email &&
    String(customerProfile.email).trim().toLowerCase() !== 'admin@lilliarowena.com' &&
    customerProfile.role !== 'admin'
  ) {
    upsert({
      id: 'cust-profile',
      name: customerProfile.name,
      email: customerProfile.email,
      phone: customerProfile.phone,
      address: [customerProfile.address, customerProfile.city].filter(Boolean).join(', '),
      company: 'Vance & Associates Spatial Design',
    });
  }

  (Array.isArray(customers) ? customers : []).forEach((c) => upsert(c));

  (Array.isArray(orders) ? orders : []).forEach((ord) => {
    const email = String(ord?.clientEmail || '').trim().toLowerCase();
    if (!email || email === 'admin@lilliarowena.com') return;
    if (!byEmail.has(email)) {
      upsert({
        id: `cust-${byEmail.size + 101}`,
        name: ord.clientName || 'Showroom Client',
        email: ord.clientEmail,
        phone: '+1 (212) 555-0192',
        address: ord.deliveryAddress || 'Private Residence',
        company: ord.clientCompany || 'Private Residence',
      });
    }
    const rec = byEmail.get(email);
    if (!rec) return;
    rec.orderCount += 1;
    rec.totalSpent += Math.max(0, Number(ord.totalAmount || 0));
    if (ord.orderDate && (rec.lastOrderDate === '—' || String(ord.orderDate) > String(rec.lastOrderDate))) {
      rec.lastOrderDate = ord.orderDate;
    }
    if (ord.deliveryAddress && (!rec.address || rec.address === 'Showroom Registered Client')) {
      rec.address = ord.deliveryAddress;
    }
  });

  return Array.from(byEmail.values());
}

export function computeInventoryMetrics(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.some((i) => i && Object.prototype.hasOwnProperty.call(i, 'stockQuantity'))) {
    return computeMaterialInventoryMetrics(safeItems);
  }

  let totalStockAvailable = 0;
  let inStockCount = 0;
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
    } else {
      inStockCount += 1;
    }
  });

  return {
    totalProducts: safeItems.length,
    totalMaterials: safeItems.length,
    totalStockAvailable,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    lowStockItems,
    outOfStockItems,
  };
}

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
    String(payload?.transactionType || 'Stock In').trim() === 'Stock Out' ? 'Stock Out' : 'Stock In';
  const rawQty = Number(payload?.quantity);
  const quantity = Number.isFinite(rawQty) ? Math.floor(rawQty) : 0;

  if (!materialId) {
    return { ok: false, errorMessage: 'Please select a workshop material.' };
  }
  if (quantity <= 0) {
    return { ok: false, errorMessage: 'Quantity must be a positive number greater than 0.' };
  }

  const targetMaterial = Array.isArray(materials) ? materials.find((m) => m.id === materialId) : null;
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
    if (payload?.purchaseCost !== undefined && payload?.purchaseCost !== '' && payload?.purchaseCost !== null) {
      const parsedCost = Number(payload.purchaseCost);
      if (!Number.isFinite(parsedCost) || parsedCost < 0) {
        return { ok: false, errorMessage: 'Purchase cost must be 0 or a positive amount.' };
      }
      purchaseCost = Math.round(parsedCost * 100) / 100;
    } else {
      purchaseCost = Math.round(quantity * Number(targetMaterial.unitCost || 0) * 100) / 100;
    }
    if (!reason) reason = 'Workshop Raw Material Restock';
  } else if (!reason) {
    return {
      ok: false,
      errorMessage: 'Please specify a reason for Material Stock Out (e.g., Workshop Production, Damaged, Adjustment).',
    };
  }

  const newStock = transactionType === 'Stock In' ? previousStock + quantity : previousStock - quantity;
  const updatedMaterial = { ...targetMaterial, stockQuantity: newStock };
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
    String(payload?.transactionType || 'Stock In').trim() === 'Stock Out' ? 'Stock Out' : 'Stock In';
  const rawQty = Number(payload?.quantity);
  const quantity = Number.isFinite(rawQty) ? Math.floor(rawQty) : 0;

  if (!productId) {
    return { ok: false, errorMessage: 'Please select a valid item.' };
  }
  if (quantity <= 0) {
    return { ok: false, errorMessage: 'Quantity must be a positive whole number greater than 0.' };
  }

  const targetProduct = Array.isArray(catalog) ? catalog.find((p) => p.id === productId) : null;
  if (!targetProduct) {
    return { ok: false, errorMessage: 'Selected item was not found in inventory.' };
  }

  if (Object.prototype.hasOwnProperty.call(targetProduct, 'stockQuantity')) {
    return applyMaterialStockMovement({ ...params, materials: catalog });
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
    if (payload?.purchaseCost !== undefined && payload?.purchaseCost !== '' && payload?.purchaseCost !== null) {
      const parsedCost = Number(payload.purchaseCost);
      if (!Number.isFinite(parsedCost) || parsedCost < 0) {
        return { ok: false, errorMessage: 'Purchase cost must be 0 or a positive amount.' };
      }
      purchaseCost = Math.round(parsedCost * 100) / 100;
    }
    if (!reason) reason = 'Inventory Restock';
  } else if (!reason) {
    return {
      ok: false,
      errorMessage: 'Please select or enter a reason for Stock Out (e.g., Damaged, Adjustment).',
    };
  }

  const newStock = transactionType === 'Stock In' ? previousStock + quantity : previousStock - quantity;
  const updatedProduct = { ...targetProduct, inStockCount: newStock };
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

export function removeProductFromCatalog({
  catalog = [],
  cartItems = [],
  vouchers = [],
  productId = '',
}) {
  const cleanId = String(productId || '').trim();
  const safeCatalog = Array.isArray(catalog) ? catalog : [];
  const safeCart = Array.isArray(cartItems) ? cartItems : [];
  const safeVouchers = Array.isArray(vouchers) ? vouchers : [];

  if (!cleanId) {
    return {
      ok: false,
      errorMessage: 'Please select a valid product to remove.',
      removedProduct: null,
      updatedCatalog: safeCatalog,
      updatedCartItems: safeCart,
      updatedVouchers: safeVouchers,
    };
  }

  const removedProduct = safeCatalog.find((p) => p.id === cleanId) || null;
  if (!removedProduct) {
    return {
      ok: false,
      errorMessage: 'Product not found in catalog.',
      removedProduct: null,
      updatedCatalog: safeCatalog,
      updatedCartItems: safeCart,
      updatedVouchers: safeVouchers,
    };
  }

  const updatedCatalog = safeCatalog.filter((p) => p.id !== cleanId);
  const updatedCartItems = safeCart.filter((entry) => {
    const entryPid = entry?.product?.id || entry?.productId || entry?.furnitureId || entry?.id || '';
    return entryPid !== cleanId;
  });
  const updatedVouchers = safeVouchers.map((v) => {
    const vPid = v?.furnitureId || v?.productId || '';
    return vPid === cleanId && v.status === 'Active' ? { ...v, status: 'Cancelled' } : v;
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

export function removeMaterialFromInventory({ materials = [], materialId = '' }) {
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

  return {
    ok: true,
    errorMessage: '',
    removedMaterial,
    updatedMaterials: safeMaterials.filter((m) => m.id !== cleanId),
  };
}

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

  const currentStock = Math.max(
    0,
    Math.round(Number(material.stockQuantity ?? material.inStockCount ?? 0) * 100) / 100
  );
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
    if (stock <= 0) return { key: 'out_of_stock', label: 'Out of stock — needs restock' };
    if (stock <= minStockLevel) return { key: 'low_stock', label: 'Running low — restock soon' };
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

export function getRecommendedBestSellers(items, maxItems = 4) {
  const list = Array.isArray(items) ? items : [];
  const cap = Math.max(1, Math.min(4, Number(maxItems || 4)));
  const bestSellers = list.filter((item) => Boolean(item.isBestSeller));
  return (bestSellers.length >= 3 ? bestSellers : list).slice(0, cap);
}

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

export function filterCatalogPageItems(items, options = {}) {
  const { categoryId = 'all', colorKey = 'all', maxPrice = Infinity, searchQuery = '' } = options;
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase();
  const numericMaxPrice = Number.isFinite(Number(maxPrice)) ? Number(maxPrice) : Infinity;

  return (items || []).filter((item) => {
    if (categoryId && categoryId !== 'all' && item.categoryId !== categoryId) return false;

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

export function getColorFilterCounts(items, categoryId = 'all', maxPrice = Infinity) {
  return CATALOG_COLOR_FILTERS.map((colorDef) => ({
    ...colorDef,
    count: filterCatalogPageItems(items, {
      categoryId,
      colorKey: colorDef.key,
      maxPrice,
    }).length,
  }));
}

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
    description: String(item?.customizationNotes || item?.description || '').trim(),
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
      heroOrderLink: { href: 'login.html', label: 'Track My Order →' },
      cartCheckoutCta: { href: 'login.html', label: 'Sign In to Checkout →' },
      cartVoucherHint: 'Sign in to verify your email',
    };
  }

  const isAdmin = rawRole === 'admin';
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
      heroOrderLink: { href: 'dashboard.html?role=admin', label: 'Admin Dashboard →' },
      cartCheckoutCta: { href: 'dashboard.html?role=admin', label: 'Open Admin Dashboard →' },
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
    heroOrderLink: { href: 'dashboard.html?role=client&tab=orders', label: 'My Orders →' },
    cartCheckoutCta: { href: 'dashboard.html?role=client&tab=cart', label: 'Proceed to Checkout →' },
    cartVoucherHint: email,
  };
}

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

  return {
    ok: true,
    errorMessage: null,
    proposal: {
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
    },
  };
}

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

export const INITIAL_STORE_DATA = {
  messengerConfig: {
    adminMessengerUrl: 'https://www.messenger.com/t/100000505712325',
    businessOwnerName: 'Lillia and Rowena Furniture',
  },
  messengerConversations: [
    {
      id: 'msg-thread-101',
      customerName: 'Rowena Vance',
      customerEmail: 'rowena.vance@vancearchitects.com',
      topic: 'Custom 300cm Monolith Walnut Conference & Dining Slab',
      categoryId: 'dining',
      suggestedName: 'Rowena Custom 300cm Walnut Monolith Table',
      suggestedSku: 'LR-CUST-300',
      suggestedPrice: 5200,
      suggestedDimensions: '300cm L × 115cm W × 75cm H',
      customizationNotes:
        'Extended 300cm book-matched walnut slab with concealed brass floor-box cable grommets.',
      updatedAt: '2026-11-12',
    },
    {
      id: 'msg-thread-102',
      customerName: 'Julian Mercier',
      customerEmail: 'j.mercier@mercierstudio.co',
      topic: 'Bespoke Deep-Seat Bouclé L-Sectional Sofa',
      categoryId: 'living',
      suggestedName: 'Mercier Bespoke Bouclé Corner Sectional',
      suggestedSku: 'LR-CUST-204',
      suggestedPrice: 5650,
      suggestedDimensions: '310cm W × 165cm D × 74cm H',
      customizationNotes:
        'Left-return chaise configuration in heavyweight Alabaster Belgian bouclé over a smoked oak plinth.',
      updatedAt: '2026-11-11',
    },
    {
      id: 'msg-thread-103',
      customerName: 'Elena Rostova',
      customerEmail: 'elena@rostovainteriors.com',
      topic: 'Floating Fluted Ash Acoustic Media Credenza',
      categoryId: 'office',
      suggestedName: 'Rostova Floating Fluted Ash Credenza',
      suggestedSku: 'LR-CUST-410',
      suggestedPrice: 3490,
      suggestedDimensions: '240cm W × 45cm D × 52cm H',
      customizationNotes:
        'Wall-hung French cleat mounting with acoustic linen center doors and concealed soundbar compartment.',
      updatedAt: '2026-11-10',
    },
    {
      id: 'msg-thread-104',
      customerName: 'Marcus Sterling',
      customerEmail: 'm.sterling@sterlingcapital.io',
      topic: 'California King Belgian Linen Tall-Headboard Platform Bed',
      categoryId: 'bedroom',
      suggestedName: 'Sterling Cal-King Tailored Linen Bed',
      suggestedSku: 'LR-CUST-512',
      suggestedPrice: 4280,
      suggestedDimensions: '228cm L × 200cm W × 105cm H',
      customizationNotes:
        'Extra-tall 105cm acoustic wool headboard with integrated warm-bronze reading sconce cutouts.',
      updatedAt: '2026-11-09',
    },
  ],
  categories: [
    {
      id: 'living',
      name: 'Living Room',
      code: 'CAT-01 / LIVING',
      tagline: 'Sculpted Bouclé Sofas, Solid Oak Lounge Chairs & Travertine Plinths',
      description:
        'Low-slung architectural silhouettes upholstered in heavyweight Belgian linen and nubby wool bouclé, paired with kiln-dried white oak lounge frames and honed Italian travertine surfaces.',
      materialPalette: ['Kiln-Dried White Oak', 'Heavyweight Wool Bouclé', 'Honed Roman Travertine'],
      leadTimeRange: '3–6 Weeks',
      pieceCount: 3,
      startingPrice: 1680,
      image: 'assets/images/category_living_lounge.jpg',
    },
    {
      id: 'dining',
      name: 'Dining Room',
      code: 'CAT-02 / DINING',
      tagline: 'Monolithic Black Walnut Slab Tables & Woven Danish Cord Seating',
      description:
        'Heirloom dining tables milled from FAS-grade American black walnut and European white oak slabs, finished with hand-rubbed organic linseed oil and paired with Danish paper-cord chairs.',
      materialPalette: ['FAS American Black Walnut', 'Quarter-Sawn White Oak', 'Danish Waxed Paper Cord'],
      leadTimeRange: '4–8 Weeks',
      pieceCount: 2,
      startingPrice: 1290,
      image: 'assets/images/category_dining_tables.jpg',
    },
    {
      id: 'bedroom',
      name: 'Bedroom',
      code: 'CAT-03 / BEDROOM',
      tagline: 'Tailored Belgian Linen Platform Beds & Cantilevered Ash Nightstands',
      description:
        'Quiet, grounding sleep architecture featuring Belgian flax linen headboards, solid ash timber platform rails, and cantilevered bedside tables with soft-close dovetail drawers.',
      materialPalette: ['Belgian Unbleached Flax Linen', 'Solid European Ash', 'Brushed Unlacquered Brass'],
      leadTimeRange: '3–5 Weeks',
      pieceCount: 2,
      startingPrice: 1180,
      image: 'assets/images/category_bedroom_sanctuary.jpg',
    },
    {
      id: 'office',
      name: 'Study/Work Desks',
      code: 'CAT-04 / STUDY',
      tagline: 'Fluted Walnut Sideboards, Architect Work Desks & Shelving Systems',
      description:
        'Commanding work desks and custom-milled fluted credenzas engineered with concealed cable channels, solid brass hardware, and book-matched walnut veneer interiors.',
      materialPalette: ['Fluted Black Walnut', 'Saddle-Stitched Bridle Leather', 'Aged Bronze Hardware'],
      leadTimeRange: '2–6 Weeks',
      pieceCount: 2,
      startingPrice: 2150,
      image: 'assets/images/category_office_storage.jpg',
    },
    {
      id: 'kitchen',
      name: 'Kitchen',
      code: 'CAT-05 / KITCHEN',
      tagline: 'Monolithic Walnut Kitchen Islands, Travertine Prep Blocks & Counter Stools',
      description:
        'Architectural kitchen islands, honed Roman travertine prep surfaces, and sculpted solid oak counter stools crafted for open-plan culinary ateliers.',
      materialPalette: ['Honed Roman Travertine', 'FAS Black Walnut', 'Soap-Finished White Oak'],
      leadTimeRange: '3–6 Weeks',
      pieceCount: 2,
      startingPrice: 1450,
      image: 'assets/images/category_kitchen_atelier.jpg',
    },
  ],
  products: [
    {
      id: 'furn-lv-01',
      sku: 'LR-LV-014',
      name: 'Rowena Curved Bouclé Lounge Sofa',
      categoryId: 'living',
      categoryName: 'Living Room',
      isBestSeller: true,
      bestSellerBadge: 'Best Seller · #1 Living Room',
      price: 4850,
      discountPercent: 10,
      effectivePrice: 4365,
      dimensions: '245cm W × 104cm D × 74cm H',
      leadTimeWeeks: 4,
      inStockCount: 4,
      minStockLevel: 2,
      primaryMaterialId: 'mat-104',
      defaultFinish: 'Warm Oat Bouclé / Natural Oak',
      finishes: [
        'Warm Oat Bouclé / Natural Oak',
        'Alabaster Heavy Linen / Smoked Oak',
        'Raw Umber Wool / American Walnut',
        'Midnight Indigo Mohair / Ebonized Oak',
      ],
      colorVariants: [
        { name: 'Warm Oat Bouclé / Natural Oak', hex: '#E6DEC8', priceDelta: 0 },
        { name: 'Alabaster Heavy Linen / Smoked Oak', hex: '#F4F1EA', priceDelta: 220 },
        { name: 'Raw Umber Wool / American Walnut', hex: '#6E5239', priceDelta: 380 },
        { name: 'Midnight Indigo Mohair / Ebonized Oak', hex: '#243B55', priceDelta: 520 },
      ],
      description:
        'A sweeping crescent silhouette engineered for conversational salon layouts. Built over a solid kiln-dried white oak plinth with multi-density natural latex and down-wrapped cushions.',
      craftsmanshipNote: 'Hand-tufted internal spring suspension with mortise-and-tenon oak base rail.',
      image: 'assets/images/category_living_lounge.jpg',
      isCustomClientDesign: false,
      customClientEmail: null,
    },
    {
      id: 'furn-dn-01',
      sku: 'LR-DN-108',
      name: 'Lillia Monolith Solid Walnut Dining Table',
      categoryId: 'dining',
      categoryName: 'Dining Room',
      isBestSeller: true,
      bestSellerBadge: 'Best Seller · Flagship Slab',
      price: 4200,
      discountPercent: 12,
      effectivePrice: 3696,
      dimensions: '240cm L × 105cm W × 75cm H',
      leadTimeWeeks: 5,
      inStockCount: 5,
      minStockLevel: 2,
      primaryMaterialId: 'mat-101',
      defaultFinish: 'Hand-Rubbed Natural Walnut',
      finishes: [
        'Hand-Rubbed Natural Walnut',
        'Quarter-Sawn White Oak',
        'Ebonized Ash Timber',
        'Book-Matched Burl Walnut Reserve',
      ],
      colorVariants: [
        { name: 'Hand-Rubbed Natural Walnut', hex: '#5C3A21', priceDelta: 0 },
        { name: 'Quarter-Sawn White Oak', hex: '#C8AD88', priceDelta: -150 },
        { name: 'Ebonized Ash Timber', hex: '#222428', priceDelta: 240 },
        { name: 'Book-Matched Burl Walnut Reserve', hex: '#472914', priceDelta: 550 },
      ],
      description:
        'Our flagship dining table featuring a 45mm thick book-matched walnut slab top with a subtle live-inspired chamfered edge and sculptural trestle stretchers.',
      craftsmanshipNote:
        'Reinforced with concealed solid brass butterfly keys and zero-VOC cold-pressed tung oil.',
      image: 'assets/images/category_dining_tables.jpg',
      isCustomClientDesign: false,
      customClientEmail: null,
    },
    {
      id: 'furn-bd-01',
      sku: 'LR-BD-204',
      name: 'Serene Belgian Linen Platform Bed (King)',
      categoryId: 'bedroom',
      categoryName: 'Bedroom',
      isBestSeller: true,
      bestSellerBadge: 'Recommended · Bedroom Sanctuary',
      price: 3650,
      discountPercent: 0,
      effectivePrice: 3650,
      dimensions: '218cm L × 206cm W × 98cm H',
      leadTimeWeeks: 4,
      inStockCount: 6,
      minStockLevel: 2,
      primaryMaterialId: 'mat-105',
      defaultFinish: 'Oatmeal Flax Linen / Ash Base',
      finishes: [
        'Oatmeal Flax Linen / Ash Base',
        'Warm Stone Linen / Walnut Base',
        'Chalk Bouclé / White Oak Base',
      ],
      colorVariants: [
        { name: 'Oatmeal Flax Linen / Ash Base', hex: '#DDD3C2', priceDelta: 0 },
        { name: 'Warm Stone Linen / Walnut Base', hex: '#9E9484', priceDelta: 280 },
        { name: 'Chalk Bouclé / White Oak Base', hex: '#F7F5F0', priceDelta: 350 },
      ],
      description:
        'Architectural low-profile platform bed with removable tailored Belgian linen upholstery and solid ash European slat support requiring no box spring.',
      craftsmanshipNote:
        'Acoustic wool headboard padding with precision mitered solid timber corner joinery.',
      image: 'assets/images/category_bedroom_sanctuary.jpg',
      isCustomClientDesign: false,
      customClientEmail: null,
    },
    {
      id: 'furn-of-02',
      sku: 'LR-OF-315',
      name: 'Quarter-Sawn Oak Architect Work Desk',
      categoryId: 'office',
      categoryName: 'Study/Work Desks',
      isBestSeller: true,
      bestSellerBadge: 'Recommended · Architect Desk',
      price: 2150,
      discountPercent: 0,
      effectivePrice: 2150,
      dimensions: '165cm W × 78cm D × 75cm H',
      leadTimeWeeks: 3,
      inStockCount: 7,
      minStockLevel: 2,
      primaryMaterialId: 'mat-102',
      defaultFinish: 'Natural White Oak / Brass Pulls',
      finishes: [
        'Natural White Oak / Brass Pulls',
        'Smoked Chestnut Oak / Bronze',
        'American Black Walnut / Cognac Leather',
      ],
      colorVariants: [
        { name: 'Natural White Oak / Brass Pulls', hex: '#CBB28D', priceDelta: 0 },
        { name: 'Smoked Chestnut Oak / Bronze', hex: '#7D593D', priceDelta: 175 },
        { name: 'American Black Walnut / Cognac Leather', hex: '#4E321F', priceDelta: 310 },
      ],
      description:
        'A serene architectural worktable with dual flush-front stationery drawers, vegetable-tanned leather interior liners, and a hidden rear power trough.',
      craftsmanshipNote: 'Inlaid full-grain Italian desktop blotter and solid timber leg stretchers.',
      image: 'assets/images/category_office_storage.jpg',
      isCustomClientDesign: false,
      customClientEmail: null,
    },
    {
      id: 'furn-of-01',
      sku: 'LR-OF-302',
      name: 'Mercier Fluted Walnut Sideboard Credenza',
      categoryId: 'office',
      categoryName: 'Study/Work Desks',
      isBestSeller: false,
      price: 3890,
      discountPercent: 15,
      effectivePrice: 3307,
      dimensions: '210cm W × 48cm D × 76cm H',
      leadTimeWeeks: 4,
      inStockCount: 4,
      minStockLevel: 2,
      primaryMaterialId: 'mat-101',
      defaultFinish: 'Natural Walnut / Aged Brass',
      finishes: [
        'Natural Walnut / Aged Brass',
        'Smoked White Oak / Bronze',
        'Ebonized Oak / Brushed Steel',
      ],
      colorVariants: [
        { name: 'Natural Walnut / Aged Brass', hex: '#63412C', priceDelta: 0 },
        { name: 'Smoked White Oak / Bronze', hex: '#9C8265', priceDelta: -120 },
        { name: 'Ebonized Oak / Brushed Steel', hex: '#28292D', priceDelta: 260 },
      ],
      description:
        'Rhythmic half-round solid walnut reeds across four seamless cabinet doors conceal adjustable shelving, velvet-lined flatware trays, and media ventilation.',
      craftsmanshipNote:
        'CNC-indexed and hand-sanded solid walnut fluting with Blum soft-close architectural hinges.',
      image: 'assets/images/category_office_storage.jpg',
      isCustomClientDesign: false,
      customClientEmail: null,
    },
    {
      id: 'furn-lv-02',
      sku: 'LR-LV-029',
      name: 'Cavana Sculpted White Oak Lounge Chair',
      categoryId: 'living',
      categoryName: 'Living Room',
      isBestSeller: false,
      price: 1680,
      discountPercent: 0,
      effectivePrice: 1680,
      dimensions: '76cm W × 82cm D × 73cm H',
      leadTimeWeeks: 2,
      inStockCount: 9,
      minStockLevel: 3,
      primaryMaterialId: 'mat-102',
      defaultFinish: 'Soap-Finished White Oak / Cream Bouclé',
      finishes: [
        'Soap-Finished White Oak / Cream Bouclé',
        'Fumed Dark Oak / Cognac Leather',
        'Oiled Black Walnut / Sand Linen',
      ],
      colorVariants: [
        { name: 'Soap-Finished White Oak / Cream Bouclé', hex: '#DECBB1', priceDelta: 0 },
        { name: 'Fumed Dark Oak / Cognac Leather', hex: '#8A4B29', priceDelta: 160 },
        { name: 'Oiled Black Walnut / Sand Linen', hex: '#5E3F28', priceDelta: 290 },
      ],
      description:
        'Steam-bent armrests flow seamlessly into tapered rear legs via precision finger-jointed transitions. Equally suited as a reading chair or architectural pair.',
      craftsmanshipNote:
        'Hand-shaved spokeshave arm profiles with full-grain vegetable-tanned saddle straps.',
      image: 'assets/images/hero_living_room_atelier.jpg',
      isCustomClientDesign: false,
      customClientEmail: null,
    },
    {
      id: 'furn-lv-03',
      sku: 'LR-LV-042',
      name: 'Verona Honed Travertine Plinth Table',
      categoryId: 'living',
      categoryName: 'Living Room',
      isBestSeller: false,
      price: 2350,
      discountPercent: 0,
      effectivePrice: 2350,
      dimensions: '135cm L × 85cm W × 34cm H',
      leadTimeWeeks: 3,
      inStockCount: 3,
      minStockLevel: 2,
      primaryMaterialId: 'mat-106',
      defaultFinish: 'Unfilled Matte Roman Travertine',
      finishes: [
        'Unfilled Matte Roman Travertine',
        'Honed Warm Limestone',
        'Silver Vein Titanium Travertine',
      ],
      colorVariants: [
        { name: 'Unfilled Matte Roman Travertine', hex: '#D8CABB', priceDelta: 0 },
        { name: 'Honed Warm Limestone', hex: '#E5DDD0', priceDelta: 190 },
        { name: 'Silver Vein Titanium Travertine', hex: '#9BA0A4', priceDelta: 360 },
      ],
      description:
        'Cut from monolithic blocks of porous Roman travertine with a softly bullnosed organic top resting on two offset architectural column cylinders.',
      craftsmanshipNote: 'Breathable penetrating stone sealer applied in-shop for stain resistance.',
      image: 'assets/images/category_living_lounge.jpg',
      isCustomClientDesign: false,
      customClientEmail: null,
    },
    {
      id: 'furn-dn-02',
      sku: 'LR-DN-115',
      name: 'Solenne Woven Cord Dining Chair (Set of 2)',
      categoryId: 'dining',
      categoryName: 'Dining Room',
      isBestSeller: false,
      price: 1290,
      discountPercent: 0,
      effectivePrice: 1290,
      dimensions: '54cm W × 52cm D × 77cm H',
      leadTimeWeeks: 2,
      inStockCount: 14,
      minStockLevel: 4,
      primaryMaterialId: 'mat-108',
      defaultFinish: 'Oiled Walnut / Natural Cord',
      finishes: [
        'Oiled Walnut / Natural Cord',
        'White Oak / Natural Cord',
        'Walnut / Black Danish Cord',
      ],
      colorVariants: [
        { name: 'Oiled Walnut / Natural Cord', hex: '#6E4B32', priceDelta: 0 },
        { name: 'White Oak / Natural Cord', hex: '#D2BC9A', priceDelta: -80 },
        { name: 'Walnut / Black Danish Cord', hex: '#2A2624', priceDelta: 140 },
      ],
      description:
        'Hand-woven over four hours using 130 meters of wax-coated Danish paper cord per seat. Designed to tuck flush beneath the Lillia Monolith Dining Table.',
      craftsmanshipNote: 'Continuous steam-bent backrest rail with wedged mortise joinery.',
      image: 'assets/images/category_dining_tables.jpg',
      isCustomClientDesign: false,
      customClientEmail: null,
    },
    {
      id: 'furn-bd-02',
      sku: 'LR-BD-219',
      name: 'Cantilevered Ash Bedside Nightstand (Pair)',
      categoryId: 'bedroom',
      categoryName: 'Bedroom',
      isBestSeller: false,
      price: 1180,
      discountPercent: 0,
      effectivePrice: 1180,
      dimensions: '56cm W × 42cm D × 46cm H',
      leadTimeWeeks: 2,
      inStockCount: 8,
      minStockLevel: 2,
      primaryMaterialId: 'mat-103',
      defaultFinish: 'Natural Matte Ash',
      finishes: ['Natural Matte Ash', 'Smoked White Oak', 'Oiled Black Walnut'],
      colorVariants: [
        { name: 'Natural Matte Ash', hex: '#D9C7AE', priceDelta: 0 },
        { name: 'Smoked White Oak', hex: '#9E8468', priceDelta: 120 },
        { name: 'Oiled Black Walnut', hex: '#543824', priceDelta: 210 },
      ],
      description:
        'Wall-mounted or plinth-supported floating bedside cases with mitered waterfall grain wrap, aromatic Spanish cedar drawer bottoms, and concealed rear cord pass-throughs.',
      craftsmanshipNote: 'Hand-cut half-blind dovetail drawer boxes with solid brass knurled pulls.',
      image: 'assets/images/category_bedroom_sanctuary.jpg',
      isCustomClientDesign: false,
      customClientEmail: null,
    },
    {
      id: 'furn-kt-01',
      sku: 'LR-KT-401',
      name: 'Valen Travertine & Walnut Kitchen Island',
      categoryId: 'kitchen',
      categoryName: 'Kitchen',
      isBestSeller: false,
      price: 3850,
      discountPercent: 10,
      effectivePrice: 3465,
      dimensions: '220cm L × 95cm W × 90cm H',
      leadTimeWeeks: 5,
      inStockCount: 3,
      minStockLevel: 2,
      primaryMaterialId: 'mat-106',
      defaultFinish: 'Honed Travertine / Natural Walnut',
      finishes: [
        'Honed Travertine / Natural Walnut',
        'Warm Limestone / Quarter-Sawn Oak',
        'Titanium Travertine / Ebonized Ash',
      ],
      colorVariants: [
        { name: 'Honed Travertine / Natural Walnut', hex: '#5C3A21', priceDelta: 0 },
        { name: 'Warm Limestone / Quarter-Sawn Oak', hex: '#C8AD88', priceDelta: -120 },
        { name: 'Titanium Travertine / Ebonized Ash', hex: '#28292D', priceDelta: 290 },
      ],
      description:
        'An architectural culinary island crowned with a 50mm honed Roman travertine slab over fluted American black walnut cabinetry and soft-close cutlery drawers.',
      craftsmanshipNote:
        'Integrated overhang for four counter stools with concealed brass power receptacles.',
      image: 'assets/images/category_kitchen_atelier.jpg',
      isCustomClientDesign: false,
      customClientEmail: null,
    },
    {
      id: 'furn-kt-02',
      sku: 'LR-KT-412',
      name: 'Soren Sculpted Oak Counter Stools (Set of 2)',
      categoryId: 'kitchen',
      categoryName: 'Kitchen',
      isBestSeller: false,
      price: 1450,
      discountPercent: 0,
      effectivePrice: 1450,
      dimensions: '44cm W × 42cm D × 66cm H',
      leadTimeWeeks: 2,
      inStockCount: 10,
      minStockLevel: 3,
      primaryMaterialId: 'mat-102',
      defaultFinish: 'Soap-Finished White Oak',
      finishes: [
        'Soap-Finished White Oak',
        'Hand-Rubbed Black Walnut',
        'Ebonized Ash / Brass Footrest',
      ],
      colorVariants: [
        { name: 'Soap-Finished White Oak', hex: '#DECBB1', priceDelta: 0 },
        { name: 'Hand-Rubbed Black Walnut', hex: '#5E3F28', priceDelta: 160 },
        { name: 'Ebonized Ash / Brass Footrest', hex: '#222428', priceDelta: 210 },
      ],
      description:
        'CNC-carved and hand-sanded solid timber saddle seats perched on tapered cylindrical legs with a solid brushed brass footrest.',
      craftsmanshipNote: 'Mortise-and-wedged-tenon joinery built for daily kitchen island seating.',
      image: 'assets/images/category_kitchen_atelier.jpg',
      isCustomClientDesign: false,
      customClientEmail: null,
    },
  ],
  materials: [
    {
      id: 'mat-101',
      code: 'MAT-WAL-01',
      name: 'FAS American Black Walnut Slabs',
      materialType: 'Solid Timber',
      unit: 'bd ft',
      unitCost: 28,
      stockQuantity: 180,
      minStockLevel: 45,
      usedIn: 'Dining tables, fluted credenzas, custom monolith slabs',
    },
    {
      id: 'mat-102',
      code: 'MAT-OAK-02',
      name: 'Quarter-Sawn European White Oak',
      materialType: 'Solid Timber',
      unit: 'bd ft',
      unitCost: 22,
      stockQuantity: 145,
      minStockLevel: 40,
      usedIn: 'Lounge chair frames, writing desks, sofa plinths',
    },
    {
      id: 'mat-103',
      code: 'MAT-ASH-03',
      name: 'Kiln-Dried European Ash Timber',
      materialType: 'Solid Timber',
      unit: 'bd ft',
      unitCost: 19,
      stockQuantity: 28,
      minStockLevel: 35,
      usedIn: 'Cantilevered nightstands, platform bed slat rails',
    },
    {
      id: 'mat-104',
      code: 'MAT-BCL-04',
      name: 'Heavyweight Belgian Wool Bouclé',
      materialType: 'Upholstery Textile',
      unit: 'sq m',
      unitCost: 68,
      stockQuantity: 84,
      minStockLevel: 20,
      usedIn: 'Rowena curved lounge sofas, lounge chair cushions',
    },
    {
      id: 'mat-105',
      code: 'MAT-LIN-05',
      name: 'Unbleached Belgian Flax Linen',
      materialType: 'Upholstery Textile',
      unit: 'sq m',
      unitCost: 54,
      stockQuantity: 62,
      minStockLevel: 18,
      usedIn: 'Serene platform bed headboards & tailored upholstery',
    },
    {
      id: 'mat-106',
      code: 'MAT-TRV-06',
      name: 'Honed Roman Travertine Blocks',
      materialType: 'Architectural Stone',
      unit: 'slabs',
      unitCost: 420,
      stockQuantity: 6,
      minStockLevel: 3,
      usedIn: 'Verona honed travertine plinth coffee tables',
    },
    {
      id: 'mat-107',
      code: 'MAT-BRS-07',
      name: 'Solid Aged Brass Hardware & Butterfly Keys',
      materialType: 'Hardware & Joinery',
      unit: 'sets',
      unitCost: 95,
      stockQuantity: 32,
      minStockLevel: 10,
      usedIn: 'Credenza hinges, knurled drawer pulls, slab butterfly keys',
    },
    {
      id: 'mat-108',
      code: 'MAT-CRD-08',
      name: 'Danish Waxed Paper Cord & Cold-Pressed Linseed Oil',
      materialType: 'Cord & Finishes',
      unit: 'rolls',
      unitCost: 42,
      stockQuantity: 24,
      minStockLevel: 8,
      usedIn: 'Solenne woven cord chairs & zero-VOC timber finishing',
    },
  ],
  vouchers: [
    {
      id: 'vch-101',
      code: 'VCH-ROWENA-SOFA400',
      customerEmail: 'rowena.vance@vancearchitects.com',
      customerName: 'Rowena Vance',
      furnitureId: 'furn-lv-01',
      furnitureSku: 'LR-LV-014',
      furnitureName: 'Rowena Curved Bouclé Lounge Sofa',
      discountAmount: 400,
      status: 'Active',
      issuedByAdmin: 'Lillia Mercier',
      createdAt: '2026-11-10',
      expiryDate: '2026-12-31',
    },
    {
      id: 'vch-102',
      code: 'VCH-ROWENA-WALNUT350',
      customerEmail: 'rowena.vance@vancearchitects.com',
      customerName: 'Rowena Vance',
      furnitureId: 'furn-dn-01',
      furnitureSku: 'LR-DN-108',
      furnitureName: 'Lillia Monolith Solid Walnut Dining Table',
      discountAmount: 350,
      status: 'Active',
      issuedByAdmin: 'Lillia Mercier',
      createdAt: '2026-11-11',
      expiryDate: '2026-12-31',
    },
    {
      id: 'vch-103',
      code: 'VCH-JULIAN-BED250',
      customerEmail: 'j.mercier@mercierstudio.co',
      customerName: 'Julian Mercier',
      furnitureId: 'furn-bd-01',
      furnitureSku: 'LR-BD-204',
      furnitureName: 'Serene Belgian Linen Platform Bed (King)',
      discountAmount: 250,
      status: 'Active',
      issuedByAdmin: 'Lillia Mercier',
      createdAt: '2026-11-09',
      expiryDate: '2026-12-15',
    },
  ],
  orders: [
    {
      id: 'ord-101',
      orderNumber: 'ORD-2026-8841',
      clientName: 'Rowena Vance',
      clientEmail: 'rowena.vance@vancearchitects.com',
      clientCompany: 'Vance & Associates Spatial Design',
      furnitureId: 'furn-dn-01',
      furnitureName: 'Lillia Monolith Solid Walnut Dining Table',
      sku: 'LR-DN-108',
      categoryName: 'Dining & Tables',
      itemType: 'Custom',
      selectedFinish: 'Hand-Rubbed Natural Walnut',
      customDimensions: '260cm L × 110cm W × 75cm H',
      materialId: 'mat-101',
      materialName: 'FAS American Black Walnut Slabs',
      materialQtyUsed: 48,
      materialUnit: 'bd ft',
      quantity: 1,
      unitPrice: 3696,
      extraCost: 0,
      totalAmount: 3696,
      depositPaid: 1848,
      status: 'In Joinery & Millwork',
      sqlStatus: 'InProduction',
      taskStatus: 'InProgress',
      deliveryStatus: 'Scheduled',
      driverName: 'Devon Vance',
      paymentStatus: '50% Deposit Paid',
      orderDate: '2026-10-18',
      estimatedDelivery: '2026-11-24',
      deliveryAddress: 'Suite 400, 118 Mercer St, SoHo, NY',
      assignedCraftsperson: 'Mateo Cruz',
      notes: 'Book-matched walnut slab approved by client via slab photography.',
      appliedVoucherCode: null,
      voucherDiscountAmount: 0,
    },
    {
      id: 'ord-102',
      orderNumber: 'ORD-2026-8834',
      clientName: 'Rowena Vance',
      clientEmail: 'rowena.vance@vancearchitects.com',
      clientCompany: 'Vance & Associates Spatial Design',
      furnitureId: 'furn-lv-01',
      furnitureName: 'Rowena Curved Bouclé Lounge Sofa',
      sku: 'LR-LV-014',
      categoryName: 'Living & Lounge',
      itemType: 'Standard',
      selectedFinish: 'Warm Oat Bouclé / Natural Oak',
      customDimensions: '245cm W × 104cm D × 74cm H',
      materialId: 'mat-104',
      materialName: 'Heavyweight Belgian Wool Bouclé',
      materialQtyUsed: 14,
      materialUnit: 'sq m',
      quantity: 1,
      unitPrice: 4365,
      extraCost: 0,
      totalAmount: 4365,
      depositPaid: 4365,
      status: 'Quality Inspection · Ready for Dispatch',
      sqlStatus: 'Ready',
      taskStatus: 'Done',
      deliveryStatus: 'Scheduled',
      driverName: 'Devon Vance',
      paymentStatus: 'Paid in Full',
      orderDate: '2026-10-04',
      estimatedDelivery: '2026-11-15',
      deliveryAddress: 'Suite 400, 118 Mercer St, SoHo, NY',
      assignedCraftsperson: 'Clara Lindqvist',
      notes: 'White-glove freight elevator reservation confirmed for 9:00 AM.',
      appliedVoucherCode: null,
      voucherDiscountAmount: 0,
    },
    {
      id: 'ord-103',
      orderNumber: 'ORD-2026-8829',
      clientName: 'Julian Mercier',
      clientEmail: 'j.mercier@mercierstudio.co',
      clientCompany: 'Mercier Residential Studio',
      furnitureId: 'furn-of-01',
      furnitureName: 'Mercier Fluted Walnut Sideboard Credenza',
      sku: 'LR-OF-302',
      categoryName: 'Study & Credenzas',
      itemType: 'Standard',
      selectedFinish: 'Natural Walnut / Aged Brass',
      customDimensions: '210cm W × 48cm D × 76cm H',
      materialId: 'mat-101',
      materialName: 'FAS American Black Walnut Slabs',
      materialQtyUsed: 64,
      materialUnit: 'bd ft',
      quantity: 2,
      unitPrice: 3307,
      extraCost: 0,
      totalAmount: 6614,
      depositPaid: 3307,
      status: 'Hand-Rubbed Finishing & Upholstery',
      sqlStatus: 'InProduction',
      taskStatus: 'InProgress',
      deliveryStatus: 'Scheduled',
      driverName: 'Devon Vance',
      paymentStatus: '50% Deposit Paid',
      orderDate: '2026-10-11',
      estimatedDelivery: '2026-11-19',
      deliveryAddress: '742 Evergreen Terrace, Pacific Heights, SF',
      assignedCraftsperson: 'Soren Henriksen',
      notes: 'Matched grain sequence across both credenzas for gallery corridor.',
      appliedVoucherCode: null,
      voucherDiscountAmount: 0,
    },
    {
      id: 'ord-104',
      orderNumber: 'ORD-2026-8815',
      clientName: 'Elena Rostova',
      clientEmail: 'elena@rostovainteriors.com',
      clientCompany: 'Rostova Architectural Interiors',
      furnitureId: 'furn-bd-01',
      furnitureName: 'Serene Belgian Linen Platform Bed (King)',
      sku: 'LR-BD-204',
      categoryName: 'Bedroom Sanctuary',
      itemType: 'Standard',
      selectedFinish: 'Oatmeal Flax Linen / Ash Base',
      customDimensions: '218cm L × 206cm W × 98cm H',
      materialId: 'mat-105',
      materialName: 'Unbleached Belgian Flax Linen',
      materialQtyUsed: 16,
      materialUnit: 'sq m',
      quantity: 1,
      unitPrice: 3650,
      extraCost: 0,
      totalAmount: 3650,
      depositPaid: 3650,
      status: 'Dispatched · White-Glove Transit',
      sqlStatus: 'Delivered',
      taskStatus: 'Done',
      deliveryStatus: 'InTransit',
      driverName: 'Devon Vance',
      paymentStatus: 'Paid in Full',
      orderDate: '2026-09-26',
      estimatedDelivery: '2026-11-12',
      deliveryAddress: '29A Kensington Park Rd, Notting Hill',
      assignedCraftsperson: 'Mateo Cruz',
      notes: 'In transit with White-Glove Carrier #WG-209.',
      appliedVoucherCode: null,
      voucherDiscountAmount: 0,
    },
    {
      id: 'ord-105',
      orderNumber: 'ORD-2026-8850',
      clientName: 'Marcus Sterling',
      clientEmail: 'm.sterling@sterlingcapital.io',
      clientCompany: 'Sterling Private Residence',
      furnitureId: 'furn-lv-02',
      furnitureName: 'Cavana Sculpted White Oak Lounge Chair',
      sku: 'LR-LV-029',
      categoryName: 'Living & Lounge',
      itemType: 'Standard',
      selectedFinish: 'Fumed Dark Oak / Cognac Leather',
      customDimensions: '76cm W × 82cm D × 73cm H',
      materialId: 'mat-102',
      materialName: 'Quarter-Sawn European White Oak',
      materialQtyUsed: 24,
      materialUnit: 'bd ft',
      quantity: 2,
      unitPrice: 1840,
      extraCost: 0,
      totalAmount: 3680,
      depositPaid: 0,
      status: 'Timber Selection & Kiln Verification',
      sqlStatus: 'Pending',
      taskStatus: 'Todo',
      deliveryStatus: 'Scheduled',
      driverName: 'Devon Vance',
      paymentStatus: 'Awaiting Deposit',
      orderDate: '2026-11-08',
      estimatedDelivery: '2026-11-29',
      deliveryAddress: '880 Lake Shore Drive, Apt 32B, Chicago',
      assignedCraftsperson: 'Clara Lindqvist',
      notes: 'Fumed Dark Oak +$160 color tier selected.',
      appliedVoucherCode: null,
      voucherDiscountAmount: 0,
    },
  ],
  workshopLogs: [
    {
      id: 'log-01',
      timestamp: '2026-11-11 08:40',
      station: 'Kiln & Timber Vault',
      craftsperson: 'Mateo Cruz',
      orderNumber: 'ORD-2026-8841',
      note: 'FAS Black Walnut Slab #W-904 moisture verified at 7.2% MC; butterfly keys inlaid.',
      qcPassed: true,
    },
    {
      id: 'log-02',
      timestamp: '2026-11-11 11:15',
      station: 'Upholstery Bench 02',
      craftsperson: 'Clara Lindqvist',
      orderNumber: 'ORD-2026-8834',
      note: 'Belgian bouclé seam tension and crescent backrest curvature passed 12-point inspection.',
      qcPassed: true,
    },
    {
      id: 'log-03',
      timestamp: '2026-11-10 16:50',
      station: 'Oil & Wax Finishing Room',
      craftsperson: 'Soren Henriksen',
      orderNumber: 'ORD-2026-8829',
      note: 'Third coat of cold-pressed organic linseed oil hand-buffed on fluted walnut doors.',
      qcPassed: true,
    },
    {
      id: 'log-04',
      timestamp: '2026-11-09 14:20',
      station: 'White-Glove Crating Dock',
      craftsperson: 'Devon Vance',
      orderNumber: 'ORD-2026-8815',
      note: 'Custom felt-lined timber crate sealed with shock-telemetry sensor attached.',
      qcPassed: true,
    },
  ],
  inventoryTransactions: [
    {
      id: 'inv-tx-101',
      materialId: 'mat-101',
      materialName: 'FAS American Black Walnut Slabs',
      materialCode: 'MAT-WAL-01',
      materialType: 'Solid Timber',
      unit: 'bd ft',
      transactionType: 'Stock In',
      quantity: 60,
      previousStock: 120,
      newStock: 180,
      purchaseCost: 1680,
      unitCost: 28,
      reason: 'Workshop Raw Material Restock',
      dateTime: '2026-11-11 09:30',
      adminName: 'Lillia Mercier (Business Owner)',
    },
    {
      id: 'inv-tx-102',
      materialId: 'mat-104',
      materialName: 'Heavyweight Belgian Wool Bouclé',
      materialCode: 'MAT-BCL-04',
      materialType: 'Upholstery Textile',
      unit: 'sq m',
      transactionType: 'Stock In',
      quantity: 30,
      previousStock: 54,
      newStock: 84,
      purchaseCost: 2040,
      unitCost: 68,
      reason: 'Workshop Raw Material Restock',
      dateTime: '2026-11-10 14:15',
      adminName: 'Lillia Mercier (Business Owner)',
    },
    {
      id: 'inv-tx-103',
      materialId: 'mat-101',
      materialName: 'FAS American Black Walnut Slabs',
      materialCode: 'MAT-WAL-01',
      materialType: 'Solid Timber',
      unit: 'bd ft',
      transactionType: 'Stock Out',
      quantity: 48,
      previousStock: 228,
      newStock: 180,
      purchaseCost: null,
      unitCost: 28,
      reason: 'Allocated to Workshop Production (Order #ORD-2026-8841)',
      dateTime: '2026-11-09 16:40',
      adminName: 'Mateo Cruz · Workshop Millwork',
    },
  ],
};

