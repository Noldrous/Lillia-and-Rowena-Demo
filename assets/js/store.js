/**
 * Lillia and Rowena Furniture — Pure Vanilla JavaScript Store & Business Logic Module
 * Works with static JSON (/data/store.json) and PSR-4 PHP views in XAMPP.
 */

export const ADMIN_MESSENGER_PLACEHOLDER_URL = 'https://www.messenger.com/t/100000505712325';

export const ORDER_STATUS_STEPS = [
  'Inquiry Received',
  'Timber Selection',
  'In Joinery & Millwork',
  'Finishing & Upholstery',
  'Quality Inspection',
  'Dispatched',
];

/**
 * Builds a placeholder URL redirecting the user to the Business Owner's (Admin's) Messenger
 * with pre-populated context for negotiating a reduced price or passing a custom furniture design.
 */
export function buildAdminMessengerUrl(params = {}) {
  const refParts = [params.mode || 'make-offer'];
  if (params.sku) refParts.push(params.sku);
  if (params.colorName) refParts.push(params.colorName);
  if (params.proposedPrice) refParts.push(`offer-${params.proposedPrice}`);
  const refSlug = encodeURIComponent(refParts.join('_').replace(/\s+/g, '-').toLowerCase());
  const clientParam = params.clientEmail ? `&client=${encodeURIComponent(params.clientEmail)}` : '';
  return `${ADMIN_MESSENGER_PLACEHOLDER_URL}?ref=${refSlug}${clientParam}`;
}

/**
 * Computes the effective price of a product for a selected color variant,
 * combining the color's priceDelta with any global storewide discountPercent.
 */
export function computeVariantPricing(item, selectedFinishName) {
  const variants = Array.isArray(item?.colorVariants) && item.colorVariants.length > 0
    ? item.colorVariants
    : [{ name: item?.defaultFinish || 'Standard Finish', hex: '#8B5A2B', priceDelta: 0 }];

  const matched =
    variants.find(
      (v) => v.name.toLowerCase() === (selectedFinishName || item?.defaultFinish || '').toLowerCase()
    ) || variants[0];

  const variantBasePrice = Math.max(50, Number(item?.price || 0) + Number(matched.priceDelta || 0));
  const discountPct = Math.max(0, Math.min(90, Number(item?.discountPercent || 0)));
  const effectivePrice = Math.round(variantBasePrice * (1 - discountPct / 100));

  return {
    colorName: matched.name,
    colorHex: matched.hex || '#8B5A2B',
    priceDelta: Number(matched.priceDelta || 0),
    variantBasePrice,
    effectivePrice,
  };
}

/**
 * Extracts all target product IDs assigned to a voucher by the admin.
 */
export function getVoucherTargetProductIds(voucher) {
  if (!voucher || typeof voucher !== 'object') return [];
  const ids = [];
  if (Array.isArray(voucher.applicableProductIds)) {
    ids.push(...voucher.applicableProductIds.map((id) => String(id || '').trim()).filter(Boolean));
  }
  if (voucher.furnitureId) ids.push(String(voucher.furnitureId).trim());
  if (voucher.productId) ids.push(String(voucher.productId).trim());
  return Array.from(new Set(ids.filter(Boolean)));
}

/**
 * Checks whether a specific product ID is eligible for the given voucher.
 * A product-specific voucher only applies to the product(s) explicitly selected by the admin.
 */
export function isProductEligibleForVoucher(voucher, productId) {
  if (!voucher || !productId) return false;
  const targetIds = getVoucherTargetProductIds(voucher);
  if (targetIds.length === 0) return false;
  return targetIds.includes(String(productId).trim());
}

/**
 * Formats a human-readable discount badge for a voucher (e.g. "20% OFF" or "$400 OFF").
 */
export function formatVoucherBenefitLabel(voucher) {
  if (!voucher || typeof voucher !== 'object') return '';
  const isPercentage =
    voucher.discountType === 'percentage' || Number(voucher.discountPercent || 0) > 0;
  if (isPercentage) {
    const pct = Math.max(
      0,
      Math.min(100, Number(voucher.discountPercent ?? voucher.discountValue ?? voucher.discountAmount ?? 0))
    );
    return `${pct}% OFF`;
  }
  const amt = Math.max(0, Math.round(Number(voucher.discountAmount ?? voucher.discountValue ?? 0)));
  return `$${amt.toLocaleString('en-US')} OFF`;
}

/**
 * Normalizes cart entries (either string product IDs or full cart line objects)
 * so voucher eligibility and eligible product subtotals can be evaluated accurately.
 */
function normalizeCartEntries(cartItemsOrProductIds, catalog = []) {
  return (cartItemsOrProductIds || [])
    .map((entry) => {
      if (typeof entry === 'string') {
        const matchedProd = (catalog || []).find((p) => p.id === entry);
        return {
          productId: entry.trim(),
          unitPrice: matchedProd ? Number(matchedProd.effectivePrice ?? matchedProd.price ?? 0) : null,
          quantity: 1,
        };
      }
      if (!entry || typeof entry !== 'object') return null;
      const productId = String(
        entry.productId || entry.furnitureId || entry.product?.id || entry.furniture?.id || ''
      ).trim();
      let unitPrice = null;
      if (typeof entry.unitPrice === 'number') {
        unitPrice = entry.unitPrice;
      } else if (entry.product) {
        unitPrice = computeVariantPricing(entry.product, entry.finish).effectivePrice;
      } else if (entry.furniture) {
        unitPrice = Number(entry.furniture.effectivePrice ?? entry.furniture.price ?? 0);
      } else if (productId && Array.isArray(catalog) && catalog.length > 0) {
        const matchedProd = catalog.find((p) => p.id === productId);
        if (matchedProd) {
          unitPrice = computeVariantPricing(matchedProd, entry.finish).effectivePrice;
        }
      }
      const quantity = Math.max(0, Math.floor(Number(entry.quantity ?? 1)));
      return { productId, unitPrice, quantity };
    })
    .filter((item) => item && item.productId && item.quantity > 0);
}

/**
 * Validates whether a product-specific Voucher issued by the Admin
 * can be applied by `currentUserEmail` to `cartItemsOrProductIds`.
 */
export function validateVoucherForOrder(
  vouchers,
  codeInput,
  currentUserEmail,
  cartItemsOrProductIds,
  catalog = []
) {
  const normalizedCode = String(codeInput || '').trim().toUpperCase();
  if (!normalizedCode) {
    return {
      valid: false,
      discountAmount: 0,
      voucher: null,
      errorMessage: 'Please enter a voucher code.',
    };
  }

  const found = (vouchers || []).find(
    (v) => String(v.code || '').trim().toUpperCase() === normalizedCode
  );
  if (!found) {
    return {
      valid: false,
      discountAmount: 0,
      voucher: null,
      errorMessage: `Voucher "${normalizedCode}" was not found.`,
    };
  }

  if (found.status !== 'Active') {
    return {
      valid: false,
      discountAmount: 0,
      voucher: null,
      errorMessage: `Voucher "${found.code}" has already been ${String(found.status).toLowerCase()}.`,
    };
  }

  if (found.expiryDate && String(found.expiryDate) < '2026-01-01') {
    return {
      valid: false,
      discountAmount: 0,
      voucher: null,
      errorMessage: `Voucher "${found.code}" has expired.`,
    };
  }

  const voucherEmail = String(found.customerEmail || '').trim().toLowerCase();
  const userEmail = String(currentUserEmail || '').trim().toLowerCase();
  if (
    voucherEmail &&
    voucherEmail !== 'all' &&
    voucherEmail !== '*' &&
    voucherEmail !== userEmail
  ) {
    return {
      valid: false,
      discountAmount: 0,
      voucher: null,
      errorMessage: `Voucher "${found.code}" is exclusively locked to ${found.customerEmail} and cannot be used by ${currentUserEmail}.`,
    };
  }

  const cartLines = normalizeCartEntries(cartItemsOrProductIds, catalog);
  const eligibleLines = cartLines.filter((line) =>
    isProductEligibleForVoucher(found, line.productId)
  );

  if (eligibleLines.length === 0) {
    const targetName =
      found.furnitureName || found.productName || found.furnitureSku || 'the selected product';
    return {
      valid: false,
      discountAmount: 0,
      voucher: null,
      errorMessage: `This voucher is only valid for the selected product (${targetName}).`,
    };
  }

  // Calculate discount strictly on the eligible product(s) in the cart
  const hasKnownPrices = eligibleLines.some((line) => typeof line.unitPrice === 'number');
  let computedDiscount = 0;

  if (hasKnownPrices) {
    const pricingCheck = calculateOrderPricing(
      eligibleLines.map((l) => ({
        productId: l.productId,
        unitPrice: Number(l.unitPrice || 0),
        quantity: l.quantity,
      })),
      found
    );
    computedDiscount = pricingCheck.voucherDiscountAmount;
  } else {
    const isPercentage =
      found.discountType === 'percentage' || Number(found.discountPercent || 0) > 0;
    computedDiscount = isPercentage
      ? Number(found.discountPercent ?? found.discountValue ?? found.discountAmount ?? 0)
      : Number(found.discountAmount ?? found.discountValue ?? 0);
  }

  return {
    valid: true,
    discountAmount: computedDiscount,
    voucher: found,
    eligibleProductIds: getVoucherTargetProductIds(found),
    errorMessage: null,
  };
}

/**
 * Filters furniture catalog items by search query and category filter.
 * IMPORTANT: Both Normal Products ('standard') and Customized Products ('customized' from Messenger)
 * remain publicly visible to ALL customers in the Shop/Product Catalog.
 */
export function filterFurnitureItems(items, searchQuery, categoryId) {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase();

  return (items || []).filter((item) => {
    if (!item || typeof item !== 'object') return false;
    const matchesCategory = !categoryId || categoryId === 'all' || item.categoryId === categoryId;
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;

    const searchableText = [
      item.name,
      item.sku,
      item.categoryName,
      item.description,
      item.defaultFinish,
      item.origin,
      item.customizationNotes,
      item.messengerCustomerName,
      ...(item.finishes || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

/**
 * Calculates order subtotal, product-specific voucher savings, white-glove delivery,
 * deposit, and per-item breakdowns.
 *
 * CRITICAL RULE: When a product-specific voucher is supplied, ONLY the cart line item(s)
 * matching the voucher's target product ID receive the discount. Non-eligible products
 * in the cart ALWAYS retain their original prices with $0 discount.
 */
export function calculateOrderPricing(lineItems, voucherOrDiscount = 0) {
  const normalizedLines = (lineItems || []).map((line) => {
    const productId = String(
      line?.productId || line?.furnitureId || line?.product?.id || line?.furniture?.id || ''
    ).trim();
    const productName =
      line?.productName ||
      line?.furnitureName ||
      line?.product?.name ||
      line?.furniture?.name ||
      '';
    const unitPrice =
      typeof line?.unitPrice === 'number'
        ? line.unitPrice
        : line?.product
        ? computeVariantPricing(line.product, line.finish).effectivePrice
        : Number(line?.furniture?.effectivePrice ?? line?.furniture?.price ?? 0);
    const quantity = Math.max(0, Math.floor(Number(line?.quantity || 0)));
    const rawLineTotal = Math.round(unitPrice * quantity);

    return {
      productId,
      productName,
      finish: line?.finish || line?.product?.defaultFinish || line?.furniture?.defaultFinish || '',
      unitPrice,
      quantity,
      rawLineTotal,
      explicitEligible: typeof line?.isVoucherEligible === 'boolean' ? line.isVoucherEligible : null,
    };
  });

  const rawSubtotal = normalizedLines.reduce((acc, l) => acc + l.rawLineTotal, 0);

  const isVoucherObject = Boolean(voucherOrDiscount && typeof voucherOrDiscount === 'object');
  const isPercentageVoucher =
    isVoucherObject &&
    (voucherOrDiscount.discountType === 'percentage' ||
      Number(voucherOrDiscount.discountPercent || 0) > 0);

  const percentageRate = isPercentageVoucher
    ? Math.max(
        0,
        Math.min(
          100,
          Number(
            voucherOrDiscount.discountPercent ??
              voucherOrDiscount.discountValue ??
              voucherOrDiscount.discountAmount ??
              0
          )
        )
      )
    : 0;

  let remainingFixedPool = isVoucherObject
    ? isPercentageVoucher
      ? 0
      : Math.max(
          0,
          Math.round(Number(voucherOrDiscount.discountAmount ?? voucherOrDiscount.discountValue ?? 0))
        )
    : Math.max(0, Math.round(Number(voucherOrDiscount || 0)));

  const hasAnyProductIds = normalizedLines.some(
    (l) => Boolean(l.productId) || l.explicitEligible !== null
  );

  let eligibleSubtotal = 0;
  let totalVoucherDiscount = 0;

  const lineBreakdowns = normalizedLines.map((line) => {
    let isEligible = false;
    if (isVoucherObject) {
      isEligible = line.productId
        ? isProductEligibleForVoucher(voucherOrDiscount, line.productId)
        : Boolean(line.explicitEligible);
    } else if (remainingFixedPool > 0) {
      // Legacy numeric call: if line items specify eligibility, respect it; otherwise fallback if no productIds exist
      isEligible = line.explicitEligible !== null ? line.explicitEligible : !hasAnyProductIds;
    }

    if (!isEligible || line.rawLineTotal <= 0) {
      return {
        ...line,
        isVoucherEligible: false,
        lineDiscount: 0,
        discountedUnitPrice: line.unitPrice,
        finalLineTotal: line.rawLineTotal,
        voucherBadge: isVoucherObject || Number(voucherOrDiscount) > 0 ? 'No discount' : null,
      };
    }

    eligibleSubtotal += line.rawLineTotal;

    let lineDiscount = 0;
    if (isVoucherObject && isPercentageVoucher) {
      lineDiscount = Math.min(
        line.rawLineTotal,
        Math.round(line.rawLineTotal * (percentageRate / 100))
      );
    } else if (isVoucherObject && voucherOrDiscount.applyPerUnit === true) {
      const perUnitFixed = Math.max(
        0,
        Math.round(Number(voucherOrDiscount.discountAmount ?? voucherOrDiscount.discountValue ?? 0))
      );
      lineDiscount = Math.min(line.rawLineTotal, perUnitFixed * line.quantity);
    } else {
      lineDiscount = Math.min(line.rawLineTotal, remainingFixedPool);
      remainingFixedPool = Math.max(0, remainingFixedPool - lineDiscount);
    }

    const finalLineTotal = Math.max(0, line.rawLineTotal - lineDiscount);
    const discountedUnitPrice =
      line.quantity > 0 ? Math.round((finalLineTotal / line.quantity) * 100) / 100 : line.unitPrice;
    totalVoucherDiscount += lineDiscount;

    return {
      ...line,
      isVoucherEligible: true,
      lineDiscount,
      discountedUnitPrice,
      finalLineTotal,
      voucherBadge: isVoucherObject
        ? formatVoucherBenefitLabel(voucherOrDiscount)
        : lineDiscount > 0
        ? `-$${lineDiscount.toLocaleString('en-US')}`
        : null,
    };
  });

  const subtotal = Math.max(0, rawSubtotal - totalVoucherDiscount);
  const whiteGloveDeliveryFee = subtotal === 0 ? 0 : subtotal >= 5000 ? 0 : 250;
  const totalAmount = subtotal + whiteGloveDeliveryFee;
  const depositDueNow = Math.round(totalAmount * 0.5);
  const balanceUponDispatch = totalAmount - depositDueNow;

  return {
    rawSubtotal,
    eligibleSubtotal,
    nonEligibleSubtotal: Math.max(0, rawSubtotal - eligibleSubtotal),
    voucherDiscountAmount: totalVoucherDiscount,
    subtotal,
    whiteGloveDeliveryFee,
    totalAmount,
    depositDueNow,
    balanceUponDispatch,
    lineBreakdowns,
  };
}

/**
 * Server / Store Authoritative Order Verification & Creation.
 * Recalculates all product prices from the authoritative catalog and re-verifies
 * voucher eligibility and product restrictions before creating an order.
 * Prevents clients from manipulating prices or applying vouchers to unauthorized products.
 */
export function verifyAndCreateOrder({
  catalog,
  vouchers,
  customerProfile,
  sessionUser,
  cartItems,
  voucherCode,
}) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return {
      ok: false,
      errorMessage: 'Your shopping cart is empty.',
      order: null,
      pricing: null,
    };
  }

  // 1. Re-verify every cart item against the authoritative catalog (prevent client price tampering & enforce available stock)
  const verifiedLines = [];
  const requestedQtyByProduct = {};

  for (const rawEntry of cartItems) {
    const requestedProductId = String(
      rawEntry?.productId || rawEntry?.furnitureId || rawEntry?.product?.id || ''
    ).trim();
    const authoritativeProduct = (catalog || []).find((p) => p.id === requestedProductId);
    if (!authoritativeProduct) {
      return {
        ok: false,
        errorMessage: `Product "${requestedProductId || 'Unknown'}" is no longer available in the catalog.`,
        order: null,
        pricing: null,
      };
    }
    const quantity = Math.max(1, Math.floor(Number(rawEntry?.quantity || 1)));
    const availableStock = Math.max(
      0,
      Math.floor(Number(authoritativeProduct.inStockCount ?? 0))
    );
    const nextTotalRequested = (requestedQtyByProduct[authoritativeProduct.id] || 0) + quantity;
    requestedQtyByProduct[authoritativeProduct.id] = nextTotalRequested;

    if (availableStock <= 0) {
      return {
        ok: false,
        errorMessage: `"${authoritativeProduct.name}" is currently Out of Stock.`,
        order: null,
        pricing: null,
      };
    }
    if (nextTotalRequested > availableStock) {
      return {
        ok: false,
        errorMessage: `Cannot purchase ${nextTotalRequested} of "${authoritativeProduct.name}": only ${availableStock} available in stock.`,
        order: null,
        pricing: null,
      };
    }

    const finish =
      rawEntry?.finish ||
      authoritativeProduct.defaultFinish ||
      authoritativeProduct.colorVariants?.[0]?.name ||
      'Standard Finish';
    const variantPricing = computeVariantPricing(authoritativeProduct, finish);

    verifiedLines.push({
      productId: authoritativeProduct.id,
      productName: authoritativeProduct.name,
      sku: authoritativeProduct.sku,
      categoryName: authoritativeProduct.categoryName,
      dimensions: authoritativeProduct.dimensions || 'Standard Showroom Dimensions',
      finish: variantPricing.colorName,
      unitPrice: variantPricing.effectivePrice,
      quantity,
    });
  }

  const customerEmail =
    customerProfile?.email || sessionUser?.email || 'rowena.vance@vancearchitects.com';
  const customerName = customerProfile?.name || sessionUser?.name || 'Rowena Vance';

  // 2. Re-validate voucher on the backend/store layer if a voucher code was supplied
  let validatedVoucher = null;
  const trimmedCode = String(voucherCode || '').trim().toUpperCase();
  if (trimmedCode) {
    const voucherCheck = validateVoucherForOrder(
      vouchers,
      trimmedCode,
      customerEmail,
      verifiedLines,
      catalog
    );
    if (!voucherCheck.valid) {
      return {
        ok: false,
        errorMessage: voucherCheck.errorMessage || 'This voucher is only valid for the selected product.',
        order: null,
        pricing: null,
      };
    }
    validatedVoucher = voucherCheck.voucher;
  }

  // 3. Recalculate order pricing strictly applying the voucher to the eligible product(s) only
  const pricing = calculateOrderPricing(verifiedLines, validatedVoucher);
  const firstItem = verifiedLines[0];
  const totalQty = verifiedLines.reduce((sum, l) => sum + l.quantity, 0);
  const itemLabel =
    verifiedLines.length === 1 && totalQty === 1
      ? firstItem.productName
      : `${firstItem.productName} (+${totalQty - 1} more)`;

  // 4. Deduct purchased quantities from product stock
  const updatedCatalog = (catalog || []).map((prod) => {
    const deducted = requestedQtyByProduct[prod.id] || 0;
    if (!deducted) return prod;
    const prevStock = Math.max(0, Math.floor(Number(prod.inStockCount ?? 0)));
    return {
      ...prod,
      inStockCount: Math.max(0, prevStock - deducted),
    };
  });

  const newOrder = {
    id: `ord-${Date.now()}`,
    orderNumber: `LR-${Math.floor(10000 + Math.random() * 89999)}`,
    clientName: customerName,
    clientEmail: customerEmail,
    furnitureId: firstItem.productId,
    furnitureName: itemLabel,
    sku: firstItem.sku,
    categoryName: firstItem.categoryName,
    selectedFinish: firstItem.finish,
    customDimensions: firstItem.dimensions,
    quantity: totalQty,
    unitPrice: firstItem.unitPrice,
    rawSubtotal: pricing.rawSubtotal,
    voucherDiscountAmount: pricing.voucherDiscountAmount,
    whiteGloveDeliveryFee: pricing.whiteGloveDeliveryFee,
    totalAmount: pricing.totalAmount,
    depositPaid: pricing.depositDueNow,
    status: 'Order Confirmed · In Production Queue',
    paymentStatus: '50% Deposit Paid',
    orderDate: new Date().toISOString().slice(0, 10),
    estimatedDelivery: '4–6 Weeks',
    deliveryAddress: customerProfile?.address
      ? `${customerProfile.address}${customerProfile.city ? `, ${customerProfile.city}` : ''}`
      : 'White-Glove Delivery',
    appliedVoucherCode: validatedVoucher ? validatedVoucher.code : null,
    appliedVoucherProductId: validatedVoucher
      ? validatedVoucher.furnitureId || validatedVoucher.productId
      : null,
    orderItems: pricing.lineBreakdowns,
  };

  return {
    ok: true,
    errorMessage: null,
    order: newOrder,
    pricing,
    validatedVoucher,
    updatedCatalog,
    requestedQtyByProduct,
  };
}

/**
 * Validates login form inputs and returns session role metadata.
 */
export function validateLoginCredentials(email, accessCode, requestedRole) {
  const trimmedEmail = String(email || '').trim();
  const trimmedCode = String(accessCode || '').trim();

  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return {
      valid: false,
      role: requestedRole,
      displayName: '',
      errorMessage: 'Please enter a valid client or admin email address.',
    };
  }

  if (trimmedCode.length < 4) {
    return {
      valid: false,
      role: requestedRole,
      displayName: '',
      errorMessage: 'Please enter a valid 4+ character access code or order key.',
    };
  }

  const localPart = trimmedEmail.split('@')[0] || 'Client';
  const formattedName = localPart
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    valid: true,
    role: requestedRole,
    displayName: requestedRole === 'admin' ? `${formattedName} (Admin)` : formattedName,
    errorMessage: null,
  };
}

export const PRODUCT_TYPES = {
  NORMAL: 'standard',
  CUSTOMIZED: 'customized',
};

const CATEGORY_METADATA = {
  living: {
    name: 'Living & Lounge',
    defaultImage: 'assets/images/category_living_lounge.jpg',
  },
  dining: {
    name: 'Dining & Tables',
    defaultImage: 'assets/images/category_dining_tables.jpg',
  },
  bedroom: {
    name: 'Bedroom Sanctuary',
    defaultImage: 'assets/images/category_bedroom_sanctuary.jpg',
  },
  office: {
    name: 'Study & Credenzas',
    defaultImage: 'assets/images/category_office_storage.jpg',
  },
};

/**
 * Validates admin input when adding or editing a Normal Product or Customized Product (Messenger).
 */
export function validateNewFurnitureInput(input) {
  const trimmedName = String(input?.name || '').trim();
  const trimmedSku = String(input?.sku || '').trim().toUpperCase();
  const trimmedImage = String(input?.image || '').trim();
  const numericPrice = Number(input?.price);
  const numericStock =
    input?.inStockCount === undefined || input?.inStockCount === ''
      ? 3
      : Number(input?.inStockCount);
  const rawType = String(input?.productType || 'standard').trim().toLowerCase();

  if (rawType !== 'standard' && rawType !== 'customized' && rawType !== 'normal' && rawType !== 'messenger') {
    return {
      valid: false,
      errorMessage: 'Please select a valid Product Type (Normal Product or Customized Product).',
    };
  }
  if (trimmedName.length < 3) {
    return { valid: false, errorMessage: 'Piece title must be at least 3 characters.' };
  }
  if (trimmedSku.length < 4) {
    return { valid: false, errorMessage: 'SKU code must be at least 4 characters (e.g., LR-LV-099).' };
  }
  if (!trimmedImage) {
    return {
      valid: false,
      errorMessage: 'Product image is required. Please upload an image or provide an image URL/path.',
    };
  }
  if (!Number.isFinite(numericPrice) || numericPrice < 50) {
    return { valid: false, errorMessage: 'Price must be a valid amount of at least $50.' };
  }
  if (!Number.isFinite(numericStock) || numericStock < 0) {
    return { valid: false, errorMessage: 'Stock count must be 0 or greater.' };
  }

  return { valid: true, errorMessage: null };
}

/**
 * Builds or updates a catalog product record for either:
 * - Option A: Normal Product ('standard') -> Origin: 'Admin', isCustomClientDesign: false
 * - Option B: Customized Product ('customized') -> Origin: 'Messenger customization', isCustomClientDesign: true
 *
 * CRITICAL VISIBILITY RULE:
 * Both Normal Products and Customized Products (Messenger) are ALWAYS publicly visible
 * (`publiclyVisible: true`, `canBePurchased: true`, `adminEditable: true`, `customClientEmail: null`)
 * so all customers can view and purchase them in the public Shop/Product Catalog.
 */
export function buildProductRecord(input, existingProduct = null) {
  const rawType = String(
    input?.productType ??
      (input?.isCustomClientDesign
        ? 'customized'
        : existingProduct?.productType || (existingProduct?.isCustomClientDesign ? 'customized' : 'standard'))
  )
    .trim()
    .toLowerCase();

  const isCustomized = rawType === 'customized' || rawType === 'messenger';
  const productType = isCustomized ? PRODUCT_TYPES.CUSTOMIZED : PRODUCT_TYPES.NORMAL;
  const origin = isCustomized ? 'Messenger customization' : 'Admin';

  const categoryId = String(input?.categoryId || existingProduct?.categoryId || 'dining').trim();
  const catMeta = CATEGORY_METADATA[categoryId] || CATEGORY_METADATA.dining;

  const price = Math.max(50, Math.round(Number(input?.price ?? existingProduct?.price ?? 2850)));
  const discountPercent = Math.max(
    0,
    Math.min(80, Math.round(Number(input?.discountPercent ?? existingProduct?.discountPercent ?? 0)))
  );
  const effectivePrice = Math.round(price * (1 - discountPercent / 100));

  let colorVariants = [];
  if (Array.isArray(input?.colorVariants) && input.colorVariants.length > 0) {
    colorVariants = input.colorVariants;
  } else if (typeof input?.colorsRaw === 'string' && input.colorsRaw.trim()) {
    colorVariants = input.colorsRaw
      .split(',')
      .map((part) => {
        const [cName, hex, delta] = part.split('|').map((s) => (s || '').trim());
        return {
          name: cName || 'Natural Walnut',
          hex: hex || '#5C3A21',
          priceDelta: Number(delta || 0),
        };
      })
      .filter((v) => v.name);
  } else if (Array.isArray(existingProduct?.colorVariants) && existingProduct.colorVariants.length > 0) {
    colorVariants = existingProduct.colorVariants;
  }

  if (colorVariants.length === 0) {
    colorVariants = [{ name: 'Natural Walnut', hex: '#5C3A21', priceDelta: 0 }];
  }

  const defaultDescription = isCustomized
    ? 'Customized architectural piece created from a customer Messenger request and available in our public showroom catalog.'
    : 'Architectural furniture piece handcrafted in solid kiln-dried timber for our showroom catalog.';

  const customizationNotes = isCustomized
    ? String(input?.customizationNotes ?? existingProduct?.customizationNotes ?? '').trim() || null
    : null;

  const messengerConversationId = isCustomized
    ? String(input?.messengerConversationId ?? existingProduct?.messengerConversationId ?? '').trim() || null
    : null;

  const messengerCustomerName = isCustomized
    ? String(input?.messengerCustomerName ?? existingProduct?.messengerCustomerName ?? '').trim() || null
    : null;

  const messengerTopic = isCustomized
    ? String(input?.messengerTopic ?? existingProduct?.messengerTopic ?? '').trim() || null
    : null;

  const descriptionText =
    String(input?.description ?? '').trim() ||
    (isCustomized && customizationNotes ? customizationNotes : '') ||
    existingProduct?.description ||
    defaultDescription;

  const idPrefix = isCustomized ? 'furn-cust' : 'furn-std';
  const id = existingProduct?.id || input?.id || `${idPrefix}-${Date.now()}`;

  return {
    ...(existingProduct || {}),
    id,
    sku: String(input?.sku || existingProduct?.sku || 'LR-NEW-001').trim().toUpperCase(),
    name: String(input?.name || existingProduct?.name || 'Untitled Furniture Piece').trim(),
    productType,
    origin,
    isCustomClientDesign: isCustomized,
    publiclyVisible: true,
    canBePurchased: true,
    adminEditable: true,
    customClientEmail: null,
    categoryId,
    categoryName: catMeta.name,
    price,
    discountPercent,
    effectivePrice,
    dimensions:
      String(input?.dimensions ?? existingProduct?.dimensions ?? '240cm L × 100cm W × 75cm H').trim() ||
      'Standard Dimensions',
    leadTimeWeeks: Math.max(
      1,
      Math.round(Number(input?.leadTimeWeeks ?? existingProduct?.leadTimeWeeks ?? 4))
    ),
    inStockCount: Math.max(
      0,
      Math.round(Number(input?.inStockCount ?? existingProduct?.inStockCount ?? 4))
    ),
    minStockLevel: Math.max(
      0,
      Math.round(Number(input?.minStockLevel ?? existingProduct?.minStockLevel ?? 3))
    ),
    defaultFinish: colorVariants[0]?.name || 'Natural Walnut',
    finishes: colorVariants.map((c) => c.name),
    colorVariants,
    description: descriptionText,
    craftsmanshipNote:
      existingProduct?.craftsmanshipNote ||
      (isCustomized
        ? 'Custom specifications engineered from a client Messenger consultation and open to all showroom orders.'
        : 'Hand-rubbed organic oil finish with precision mortise-and-tenon joinery.'),
    image: String(input?.image || existingProduct?.image || catMeta.defaultImage).trim(),
    messengerConversationId,
    messengerCustomerName,
    messengerTopic,
    customizationNotes,
  };
}

/**
 * Validates Supplier creation / update input.
 */
export function validateSupplierInput(input) {
  const name = String(input?.name || '').trim();
  const contactPerson = String(input?.contactPerson || '').trim();
  const phone = String(input?.phone || '').trim();
  const address = String(input?.address || '').trim();

  if (name.length < 2) {
    return { valid: false, errorMessage: 'Supplier Name must be at least 2 characters.' };
  }
  if (contactPerson.length < 2) {
    return { valid: false, errorMessage: 'Contact Person name is required.' };
  }
  if (phone.length < 5) {
    return { valid: false, errorMessage: 'Please enter a valid Phone Number.' };
  }
  if (address.length < 5) {
    return { valid: false, errorMessage: 'Please enter the Business Address.' };
  }

  return { valid: true, errorMessage: null };
}

/**
 * Builds or updates a Supplier record with associated product IDs.
 */
export function buildSupplierRecord(input, existingSupplier = null) {
  const rawProductIds = Array.isArray(input?.productIds)
    ? input.productIds
    : Array.isArray(existingSupplier?.productIds)
    ? existingSupplier.productIds
    : [];
  const productIds = Array.from(
    new Set(rawProductIds.map((id) => String(id || '').trim()).filter(Boolean))
  );

  return {
    ...(existingSupplier || {}),
    id: existingSupplier?.id || input?.id || `sup-${Date.now()}`,
    name: String(input?.name ?? existingSupplier?.name ?? '').trim(),
    contactPerson: String(input?.contactPerson ?? existingSupplier?.contactPerson ?? '').trim(),
    phone: String(input?.phone ?? existingSupplier?.phone ?? '').trim(),
    address: String(input?.address ?? existingSupplier?.address ?? '').trim(),
    productIds,
  };
}

/**
 * Determines a product's inventory status ('in_stock', 'low_stock', 'out_of_stock')
 * based on `inStockCount` and `minStockLevel`.
 */
export function getProductStockStatus(product) {
  const availableStock = Math.max(0, Math.floor(Number(product?.inStockCount ?? 0)));
  const minStockLevel = Math.max(0, Math.floor(Number(product?.minStockLevel ?? 3)));

  if (availableStock <= 0) {
    return {
      availableStock: 0,
      minStockLevel,
      status: 'out_of_stock',
      statusKey: 'out_of_stock',
      statusLabel: 'Out of Stock',
    };
  }
  if (availableStock <= minStockLevel) {
    return {
      availableStock,
      minStockLevel,
      status: 'low_stock',
      statusKey: 'low_stock',
      statusLabel: 'Low Stock',
    };
  }
  return {
    availableStock,
    minStockLevel,
    status: 'in_stock',
    statusKey: 'in_stock',
    statusLabel: 'In Stock',
  };
}

/**
 * Computes summary metrics for the Supply & Inventory Management Overview:
 * - Total Products
 * - Total Stock Available
 * - Low Stock Items
 * - Out of Stock Items
 */
export function computeInventoryMetrics(catalog = []) {
  const items = Array.isArray(catalog) ? catalog : [];
  let totalStockAvailable = 0;
  const lowStockItems = [];
  const outOfStockItems = [];

  for (const prod of items) {
    const st = getProductStockStatus(prod);
    totalStockAvailable += st.availableStock;
    if (st.statusKey === 'out_of_stock') {
      outOfStockItems.push(prod);
    } else if (st.statusKey === 'low_stock') {
      lowStockItems.push(prod);
    }
  }

  return {
    totalProducts: items.length,
    totalStockAvailable,
    lowStockCount: lowStockItems.length,
    outOfStockCount: outOfStockItems.length,
    lowStockItems,
    outOfStockItems,
  };
}

/**
 * Validates and applies a Stock In or Stock Out movement transactionally against the catalog.
 * Prevents negative stock quantities, records Previous Stock and New Stock, and returns
 * the updated product, updated catalog, and immutable inventory transaction record.
 */
export function applyStockMovement(params = {}) {
  const {
    catalog = [],
    suppliers = [],
    adminName = 'Lillia Mercier (Business Owner)',
  } = params;
  const movementInput = params.movementInput || params;
  const productId = String(movementInput?.productId || '').trim();
  const rawType = String(movementInput?.transactionType || '').trim();
  const transactionType =
    rawType.toLowerCase() === 'stock out' || rawType.toLowerCase() === 'out'
      ? 'Stock Out'
      : rawType.toLowerCase() === 'stock in' || rawType.toLowerCase() === 'in'
      ? 'Stock In'
      : '';

  if (!productId) {
    return { ok: false, errorMessage: 'Please select a product for this stock movement.' };
  }
  if (!transactionType) {
    return {
      ok: false,
      errorMessage: 'Transaction type must be either "Stock In" or "Stock Out".',
    };
  }

  const targetProduct = (catalog || []).find((p) => p.id === productId);
  if (!targetProduct) {
    return { ok: false, errorMessage: 'Selected product was not found in the catalog.' };
  }

  const quantity = Math.floor(Number(movementInput?.quantity));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, errorMessage: 'Quantity must be a whole number greater than 0.' };
  }

  const previousStock = Math.max(0, Math.floor(Number(targetProduct.inStockCount ?? 0)));

  let newStock = previousStock;
  let supplierId = null;
  let supplierName = null;
  let purchaseCost = null;
  let reason = null;

  if (transactionType === 'Stock In') {
    supplierId = String(movementInput?.supplierId || '').trim() || null;
    if (!supplierId) {
      return { ok: false, errorMessage: 'Please select a supplier for Stock In.' };
    }
    const matchedSupplier = (suppliers || []).find((s) => s.id === supplierId);
    supplierName =
      matchedSupplier?.name || String(movementInput?.supplierName || '').trim() || 'Authorized Supplier';

    if (
      movementInput?.purchaseCost !== undefined &&
      movementInput?.purchaseCost !== null &&
      String(movementInput.purchaseCost).trim() !== ''
    ) {
      const numericCost = Number(movementInput.purchaseCost);
      if (!Number.isFinite(numericCost) || numericCost < 0) {
        return { ok: false, errorMessage: 'Purchase cost must be 0 or a positive amount.' };
      }
      purchaseCost = Math.round(numericCost * 100) / 100;
    }
    reason = String(movementInput?.reason || 'Supplier Restock').trim();
    newStock = previousStock + quantity;
  } else {
    // Stock Out validation: strictly prevent negative stock
    if (quantity > previousStock) {
      return {
        ok: false,
        errorMessage: `Cannot deduct ${quantity} units of "${targetProduct.name}": only ${previousStock} available in stock.`,
      };
    }
    const providedReason = String(movementInput?.reason || '').trim();
    if (!providedReason) {
      return {
        ok: false,
        errorMessage: 'Please provide a reason for Stock Out (e.g., Damaged, Adjustment, or Other).',
      };
    }
    reason = providedReason;
    newStock = previousStock - quantity;
  }

  const rawDate = String(movementInput?.date || '').trim();
  const now = new Date();
  const timePart = now.toTimeString().slice(0, 5);
  const datePart = rawDate || now.toISOString().slice(0, 10);
  const dateTime = rawDate.includes(':') ? rawDate : `${datePart} ${timePart}`;

  const updatedProduct = {
    ...targetProduct,
    inStockCount: newStock,
  };

  const updatedCatalog = (catalog || []).map((p) => (p.id === productId ? updatedProduct : p));

  const transaction = {
    id: `inv-tx-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
    productId: targetProduct.id,
    productName: targetProduct.name,
    productSku: targetProduct.sku,
    transactionType,
    quantity,
    previousStock,
    newStock,
    supplierId,
    supplierName,
    purchaseCost,
    reason,
    dateTime,
    adminName: String(adminName || 'Lillia Mercier (Business Owner)').trim(),
  };

  return {
    ok: true,
    errorMessage: null,
    updatedProduct,
    updatedCatalog,
    transaction,
  };
}


