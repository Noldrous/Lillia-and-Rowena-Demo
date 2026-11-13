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
 * Validates whether a single-user, single-product Voucher issued via Admin Messenger
 * can be applied by `currentUserEmail` to `cartProductIds`.
 */
export function validateVoucherForOrder(vouchers, codeInput, currentUserEmail, cartProductIds) {
  const normalizedCode = String(codeInput || '').trim().toUpperCase();
  if (!normalizedCode) {
    return { valid: false, discountAmount: 0, voucher: null, errorMessage: 'Please enter a voucher code.' };
  }

  const found = (vouchers || []).find((v) => String(v.code || '').toUpperCase() === normalizedCode);
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

  if (String(found.customerEmail || '').toLowerCase() !== String(currentUserEmail || '').trim().toLowerCase()) {
    return {
      valid: false,
      discountAmount: 0,
      voucher: null,
      errorMessage: `Voucher "${found.code}" is exclusively locked to ${found.customerEmail} and cannot be used by ${currentUserEmail}.`,
    };
  }

  if (!(cartProductIds || []).includes(found.furnitureId)) {
    return {
      valid: false,
      discountAmount: 0,
      voucher: null,
      errorMessage: `Voucher "${found.code}" is only valid for "${found.furnitureName}" (${found.furnitureSku}). Add that product to your order to redeem it.`,
    };
  }

  return {
    valid: true,
    discountAmount: Number(found.discountAmount || 0),
    voucher: found,
    errorMessage: null,
  };
}

/**
 * Filters furniture catalog items by search query and category filter.
 */
export function filterFurnitureItems(items, searchQuery, categoryId) {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase();

  return (items || []).filter((item) => {
    const matchesCategory = !categoryId || categoryId === 'all' || item.categoryId === categoryId;
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;

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

    return searchableText.includes(normalizedQuery);
  });
}

/**
 * Calculates order subtotal, voucher savings, white-glove delivery, deposit, and grand total.
 */
export function calculateOrderPricing(lineItems, voucherDiscountAmount = 0) {
  const rawSubtotal = (lineItems || []).reduce((acc, line) => {
    const unitPrice =
      typeof line.unitPrice === 'number'
        ? line.unitPrice
        : Number(line.furniture?.effectivePrice ?? line.furniture?.price ?? 0);
    const qty = Math.max(0, Math.floor(Number(line.quantity || 0)));
    return acc + unitPrice * qty;
  }, 0);

  const safeVoucher = Math.max(0, Math.min(rawSubtotal, Number(voucherDiscountAmount || 0)));
  const subtotal = Math.max(0, rawSubtotal - safeVoucher);
  const whiteGloveDeliveryFee = subtotal === 0 ? 0 : subtotal >= 5000 ? 0 : 250;
  const totalAmount = subtotal + whiteGloveDeliveryFee;
  const depositDueNow = Math.round(totalAmount * 0.5);
  const balanceUponDispatch = totalAmount - depositDueNow;

  return {
    rawSubtotal,
    voucherDiscountAmount: safeVoucher,
    subtotal,
    whiteGloveDeliveryFee,
    totalAmount,
    depositDueNow,
    balanceUponDispatch,
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

/**
 * Validates admin input when adding or editing a catalog product or customer Messenger design.
 */
export function validateNewFurnitureInput(input) {
  const trimmedName = String(input?.name || '').trim();
  const trimmedSku = String(input?.sku || '').trim().toUpperCase();
  const numericPrice = Number(input?.price);
  const numericStock = Number(input?.inStockCount);

  if (trimmedName.length < 3) {
    return { valid: false, errorMessage: 'Piece title must be at least 3 characters.' };
  }
  if (trimmedSku.length < 4) {
    return { valid: false, errorMessage: 'SKU code must be at least 4 characters (e.g., LR-LV-099).' };
  }
  if (!Number.isFinite(numericPrice) || numericPrice < 100) {
    return { valid: false, errorMessage: 'Price must be a valid amount of at least $100.' };
  }
  if (!Number.isFinite(numericStock) || numericStock < 0) {
    return { valid: false, errorMessage: 'Stock count must be 0 or greater.' };
  }

  return { valid: true, errorMessage: null };
}
