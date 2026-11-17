import {
  generateOwnEntityId,
  formatManilaDateTimeParts,
  formatVoucherIssuedDisplay,
  formatVoucherExpiryDisplay,
  computeVoucherStatusInfo,
  isOrderCompleted,
  getMaterialStockStatus,
  getProductStockStatus,
  computeMaterialInventoryMetrics,
  computeInventoryMetrics,
} from './store.js';

/* ==========================================================================
   MONTHLY ANALYTICS & BUSINESS REPORTS ENGINE (ADMIN DASHBOARD)
   ========================================================================== */

const MONTH_NAMES_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function getDaysInYearMonth(year, month1To12) {
  return new Date(Date.UTC(year, month1To12, 0)).getUTCDate();
}

function pad2(num) {
  return String(Math.max(0, Math.floor(Number(num) || 0))).padStart(2, '0');
}

function formatYmd(year, month1To12, day) {
  return `${year}-${pad2(month1To12)}-${pad2(day)}`;
}

function parseManilaDateOnly(rawDateStr) {
  if (!rawDateStr) return null;
  const clean = String(rawDateStr).trim();
  const ymdMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  }
  const ms = Date.parse(clean);
  if (Number.isNaN(ms)) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms));
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

export function computePercentageChange(currentValue, previousValue) {
  const curr = Number(currentValue) || 0;
  const prev = Number(previousValue) || 0;

  if (Math.abs(prev) < 0.0001) {
    if (Math.abs(curr) < 0.0001) {
      return {
        percentChange: 0,
        direction: 'flat',
        formatted: '0.0%',
        formattedChange: '0.0%',
        badgeLabel: '0.0% vs prior period',
        previousZero: true,
        isNewFromZero: false,
      };
    }
    const formatted = curr > 0 ? '+100.0%' : '-100.0%';
    return {
      percentChange: curr > 0 ? 100 : -100,
      direction: curr > 0 ? 'up' : 'down',
      formatted,
      formattedChange: curr > 0 ? '+100.0% (New)' : '-100.0%',
      badgeLabel: curr > 0 ? '+100.0% (up from 0)' : '-100.0%',
      previousZero: true,
      isNewFromZero: curr > 0,
    };
  }

  const rawPct = ((curr - prev) / Math.abs(prev)) * 100;
  const pct = Math.round(rawPct * 10) / 10;
  const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  const sign = pct > 0 ? '+' : '';
  const formatted = `${sign}${pct.toFixed(1)}%`;

  return {
    percentChange: pct,
    direction,
    formatted,
    formattedChange: formatted,
    badgeLabel: `${formatted} vs prior period`,
    previousZero: false,
    isNewFromZero: false,
  };
}

export function resolveAnalyticsDateRange(filterOptions = {}, nowMs = Date.now()) {
  const nowParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(nowMs));
  const nMap = {};
  for (const p of nowParts) nMap[p.type] = p.value;
  const currentYear = Number(nMap.year);
  const currentMonth = Number(nMap.month);

  const preset = String(filterOptions?.preset || 'this_month')
    .trim()
    .toLowerCase();

  let startDate = '';
  let endDate = '';
  let previousStartDate = '';
  let previousEndDate = '';
  let periodLabel = '';
  let previousPeriodLabel = '';
  let selectedYear = Number(filterOptions?.year) || currentYear;
  let selectedMonth = Math.min(12, Math.max(1, Number(filterOptions?.month) || currentMonth));

  if (preset === 'last_month') {
    const lmYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const lmMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lmDays = getDaysInYearMonth(lmYear, lmMonth);
    startDate = formatYmd(lmYear, lmMonth, 1);
    endDate = formatYmd(lmYear, lmMonth, lmDays);

    const prevYear = lmMonth === 1 ? lmYear - 1 : lmYear;
    const prevMonth = lmMonth === 1 ? 12 : lmMonth - 1;
    const prevDays = getDaysInYearMonth(prevYear, prevMonth);
    previousStartDate = formatYmd(prevYear, prevMonth, 1);
    previousEndDate = formatYmd(prevYear, prevMonth, prevDays);

    selectedYear = lmYear;
    selectedMonth = lmMonth;
    periodLabel = `${MONTH_NAMES_FULL[lmMonth - 1]} ${lmYear}`;
    previousPeriodLabel = `${MONTH_NAMES_FULL[prevMonth - 1]} ${prevYear}`;
  } else if (preset === 'select_month') {
    const smDays = getDaysInYearMonth(selectedYear, selectedMonth);
    startDate = formatYmd(selectedYear, selectedMonth, 1);
    endDate = formatYmd(selectedYear, selectedMonth, smDays);

    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevDays = getDaysInYearMonth(prevYear, prevMonth);
    previousStartDate = formatYmd(prevYear, prevMonth, 1);
    previousEndDate = formatYmd(prevYear, prevMonth, prevDays);

    periodLabel = `${MONTH_NAMES_FULL[selectedMonth - 1]} ${selectedYear}`;
    previousPeriodLabel = `${MONTH_NAMES_FULL[prevMonth - 1]} ${prevYear}`;
  } else if (preset === 'this_year') {
    const targetYear = Number(filterOptions?.year) || currentYear;
    selectedYear = targetYear;
    startDate = `${targetYear}-01-01`;
    endDate = `${targetYear}-12-31`;
    previousStartDate = `${targetYear - 1}-01-01`;
    previousEndDate = `${targetYear - 1}-12-31`;
    periodLabel = `Full Year ${targetYear}`;
    previousPeriodLabel = `Full Year ${targetYear - 1}`;
  } else if (preset === 'custom_range') {
    const fallbackStart = formatYmd(currentYear, currentMonth, 1);
    const fallbackEnd = formatYmd(
      currentYear,
      currentMonth,
      getDaysInYearMonth(currentYear, currentMonth)
    );
    let rawStart = parseManilaDateOnly(filterOptions?.startDate) || fallbackStart;
    let rawEnd = parseManilaDateOnly(filterOptions?.endDate) || fallbackEnd;
    if (rawEnd < rawStart) {
      const tmp = rawStart;
      rawStart = rawEnd;
      rawEnd = tmp;
    }
    startDate = rawStart;
    endDate = rawEnd;

    const startUtc = Date.parse(`${startDate}T00:00:00Z`);
    const endUtc = Date.parse(`${endDate}T00:00:00Z`);
    const spanDays = Math.max(1, Math.round((endUtc - startUtc) / 86400000) + 1);
    const prevEndUtc = startUtc - 86400000;
    const prevStartUtc = prevEndUtc - (spanDays - 1) * 86400000;

    previousStartDate = new Date(prevStartUtc).toISOString().slice(0, 10);
    previousEndDate = new Date(prevEndUtc).toISOString().slice(0, 10);
    selectedYear = Number(startDate.slice(0, 4)) || currentYear;
    selectedMonth = Number(startDate.slice(5, 7)) || currentMonth;
    periodLabel = `${startDate} to ${endDate}`;
    previousPeriodLabel = `${previousStartDate} to ${previousEndDate}`;
  } else {
    // Default: 'this_month'
    const tmDays = getDaysInYearMonth(currentYear, currentMonth);
    startDate = formatYmd(currentYear, currentMonth, 1);
    endDate = formatYmd(currentYear, currentMonth, tmDays);

    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevDays = getDaysInYearMonth(prevYear, prevMonth);
    previousStartDate = formatYmd(prevYear, prevMonth, 1);
    previousEndDate = formatYmd(prevYear, prevMonth, prevDays);

    selectedYear = currentYear;
    selectedMonth = currentMonth;
    periodLabel = `${MONTH_NAMES_FULL[currentMonth - 1]} ${currentYear}`;
    previousPeriodLabel = `${MONTH_NAMES_FULL[prevMonth - 1]} ${prevYear}`;
  }

  const countDaysInclusive = (sStr, eStr) => {
    const sUtc = Date.parse(`${sStr}T00:00:00Z`);
    const eUtc = Date.parse(`${eStr}T00:00:00Z`);
    if (Number.isNaN(sUtc) || Number.isNaN(eUtc)) return 30;
    return Math.max(1, Math.round((eUtc - sUtc) / 86400000) + 1);
  };

  const currentDayCount = countDaysInclusive(startDate, endDate);
  const previousDayCount = countDaysInclusive(previousStartDate, previousEndDate);
  const resolvedPreset = ['this_month', 'last_month', 'select_month', 'this_year', 'custom_range'].includes(preset)
    ? preset
    : 'this_month';

  return {
    preset: resolvedPreset,
    startDate,
    endDate,
    previousStartDate,
    previousEndDate,
    periodLabel,
    previousPeriodLabel,
    selectedYear,
    selectedMonth,
    timezone: 'Asia/Manila',
    current: {
      startDate,
      endDate,
      label: periodLabel,
      year: selectedYear,
      month: selectedMonth,
      dayCount: currentDayCount,
    },
    previous: {
      startDate: previousStartDate,
      endDate: previousEndDate,
      label: previousPeriodLabel,
      dayCount: previousDayCount,
    },
  };
}

// Recognize a sale only after the admin completes the order. Legacy completed
// orders without a completion timestamp retain their original order date.
export function getAnalyticsOrderDate(order) {
  const value = order?.completedAt || order?.orderDate;
  if (!value) return null;
  const clean = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return parseManilaDateOnly(clean);
  const ms = Date.parse(clean);
  if (!Number.isFinite(ms)) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(ms));
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function getHistoricalOrderAmount(order) {
  const explicitTotal = Number(order?.totalAmount);
  if (order?.totalAmount != null && Number.isFinite(explicitTotal) && explicitTotal >= 0) {
    return Math.round(explicitTotal);
  }
  const qty = Math.max(1, Number(order?.quantity || 1));
  const unitPrice = Math.max(0, Number(order?.unitPrice || 0));
  const extraCost = Math.max(0, Number(order?.extraCost || 0));
  const discount = Math.max(0, Number(order?.voucherDiscountAmount || 0));
  return Math.max(0, Math.round(unitPrice * qty + extraCost - discount));
}

function deduplicateOrdersList(orders = []) {
  const seen = new Set();
  const unique = [];
  for (const ord of Array.isArray(orders) ? orders : []) {
    if (!ord || typeof ord !== 'object') continue;
    const key = String(ord.orderId || ord.orderNumber || ord.id || '').trim().toUpperCase();
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    unique.push(ord);
  }
  return unique;
}

export function computeMonthlyAnalyticsReport(
  storeData = {},
  filterOptionsArg = {},
  nowMsArg = Date.now()
) {
  const effectiveFilter =
    storeData && typeof storeData === 'object' && storeData.filterInput
      ? storeData.filterInput
      : storeData && typeof storeData === 'object' && storeData.filterOptions
      ? storeData.filterOptions
      : filterOptionsArg || {};
  const effectiveNowMs =
    storeData && typeof storeData === 'object' && Number.isFinite(Number(storeData.nowMs))
      ? Number(storeData.nowMs)
      : Number.isFinite(Number(nowMsArg))
      ? Number(nowMsArg)
      : Date.now();

  const range = resolveAnalyticsDateRange(effectiveFilter, effectiveNowMs);
  const products = Array.isArray(storeData?.catalog)
    ? storeData.catalog
    : Array.isArray(storeData?.products)
    ? storeData.products
    : [];
  const categories = Array.isArray(storeData?.categories) ? storeData.categories : [];
  const materials = Array.isArray(storeData?.materials) ? storeData.materials : [];
  const rawOrders = Array.isArray(storeData?.orders) ? storeData.orders : [];
  const operationalOrders = deduplicateOrdersList(rawOrders);
  const orders = operationalOrders.filter(isOrderCompleted);
  const completionDates = new Map(orders.map((ord) => [ord, getAnalyticsOrderDate(ord)]));
  const vouchers = Array.isArray(storeData?.vouchers) ? storeData.vouchers : [];
  const customers = Array.isArray(storeData?.customers) ? storeData.customers : [];
  const inventoryTransactions = Array.isArray(storeData?.inventoryTransactions)
    ? storeData.inventoryTransactions
    : [];

  const productById = new Map();
  const productBySku = new Map();
  products.forEach((p) => {
    if (p?.id) productById.set(String(p.id), p);
    if (p?.sku) productBySku.set(String(p.sku).toUpperCase(), p);
    if (p?.productId) productBySku.set(String(p.productId).toUpperCase(), p);
  });

  const isWithinRange = (dateStr, startStr, endStr) => {
    const d = parseManilaDateOnly(dateStr);
    if (!d) return false;
    return d >= startStr && d <= endStr;
  };

  // Helper to compute period KPI metrics for any [start, end] window
  const computeWindowMetrics = (startStr, endStr) => {
    const periodOrders = orders.filter((ord) => isWithinRange(completionDates.get(ord), startStr, endStr));
    let totalRevenue = 0;
    let totalProductsSold = 0;
    let totalDiscountsGiven = 0;
    const seenOrderItems = new Set();

    periodOrders.forEach((ord) => {
      totalRevenue += getHistoricalOrderAmount(ord);
      const itemKey = String(ord.orderItemId || ord.orderId || ord.orderNumber || ord.id || '');
      if (!itemKey || !seenOrderItems.has(itemKey)) {
        if (itemKey) seenOrderItems.add(itemKey);
        totalProductsSold += Math.max(1, Number(ord.quantity || 1));
      }
      totalDiscountsGiven += Math.max(0, Number(ord.voucherDiscountAmount || 0));
    });

    const grossBookedRevenue = totalRevenue;
    const completedOrders = periodOrders.length;
    const revenueEligibleOrderCount = completedOrders;
    const pendingOrders = 0, processingOrders = 0, shippedOrders = 0, cancelledOrders = 0;

    // New customers registered in [startStr, endStr]
    const newCustomersInWindow = customers.filter((c) => {
      const regDate = parseManilaDateOnly(c?.registeredAt || c?.createdAt);
      return regDate && regDate >= startStr && regDate <= endStr;
    });

    const totalOrders = periodOrders.length;
    const averageOrderValue =
      revenueEligibleOrderCount > 0 ? Math.round(totalRevenue / revenueEligibleOrderCount) : 0;

    return {
      periodOrders,
      totalRevenue: Math.round(totalRevenue),
      grossBookedRevenue: Math.round(grossBookedRevenue),
      totalOrders,
      completedOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      cancelledOrders,
      totalProductsSold,
      newCustomers: newCustomersInWindow.length,
      newCustomersList: newCustomersInWindow,
      totalDiscountsGiven: Math.round(totalDiscountsGiven),
      averageOrderValue,
      revenueEligibleOrderCount,
    };
  };

  const currentMetrics = computeWindowMetrics(range.startDate, range.endDate);
  const previousMetrics = computeWindowMetrics(range.previousStartDate, range.previousEndDate);

  const formatUsd = (val) => `$${Math.round(Number(val) || 0).toLocaleString('en-US')}`;

  const buildKpiObj = (key, label, currVal, prevVal, formattedCurr, formattedPrev, subtitle) => {
    const comp = computePercentageChange(currVal, prevVal);
    return {
      key,
      label,
      value: currVal,
      previousValue: prevVal,
      formattedValue: formattedCurr,
      formattedPreviousValue: formattedPrev,
      subtitle,
      percentChange: comp.percentChange,
      direction: comp.direction,
      formatted: comp.formatted,
      formattedChange: comp.formattedChange,
      isNewFromZero: comp.isNewFromZero,
      previousZero: comp.previousZero,
      comparison: comp,
    };
  };

  const summary = {
    totalRevenue: buildKpiObj(
      'totalRevenue',
      'Total Revenue',
      currentMetrics.totalRevenue,
      previousMetrics.totalRevenue,
      formatUsd(currentMetrics.totalRevenue),
      formatUsd(previousMetrics.totalRevenue),
      `${currentMetrics.revenueEligibleOrderCount} completed order(s)`
    ),
    totalOrders: buildKpiObj(
      'totalOrders',
      'Total Orders',
      currentMetrics.totalOrders,
      previousMetrics.totalOrders,
      String(currentMetrics.totalOrders),
      String(previousMetrics.totalOrders),
      `Completed sales: ${formatUsd(currentMetrics.grossBookedRevenue)}`
    ),
    completedOrders: buildKpiObj(
      'completedOrders',
      'Completed Orders',
      currentMetrics.completedOrders,
      previousMetrics.completedOrders,
      String(currentMetrics.completedOrders),
      String(previousMetrics.completedOrders),
      'Delivered & settled in full'
    ),
    pendingOrders: buildKpiObj(
      'pendingOrders',
      'Pending Orders',
      currentMetrics.pendingOrders,
      previousMetrics.pendingOrders,
      String(currentMetrics.pendingOrders),
      String(previousMetrics.pendingOrders),
      `${currentMetrics.processingOrders} in workshop · ${currentMetrics.shippedOrders} ready/shipped`
    ),
    cancelledOrders: buildKpiObj(
      'cancelledOrders',
      'Cancelled Orders',
      currentMetrics.cancelledOrders,
      previousMetrics.cancelledOrders,
      String(currentMetrics.cancelledOrders),
      String(previousMetrics.cancelledOrders),
      'Excluded from realized revenue'
    ),
    totalProductsSold: buildKpiObj(
      'totalProductsSold',
      'Total Products Sold',
      currentMetrics.totalProductsSold,
      previousMetrics.totalProductsSold,
      `${currentMetrics.totalProductsSold} pcs`,
      `${previousMetrics.totalProductsSold} pcs`,
      'Furniture units in completed orders'
    ),
    newCustomers: buildKpiObj(
      'newCustomers',
      'New Customers',
      currentMetrics.newCustomers,
      previousMetrics.newCustomers,
      String(currentMetrics.newCustomers),
      String(previousMetrics.newCustomers),
      `${customers.length} total registered clients`
    ),
    totalDiscountsGiven: buildKpiObj(
      'totalDiscountsGiven',
      'Total Discounts Given',
      currentMetrics.totalDiscountsGiven,
      previousMetrics.totalDiscountsGiven,
      formatUsd(currentMetrics.totalDiscountsGiven),
      formatUsd(previousMetrics.totalDiscountsGiven),
      'Fixed-amount vouchers redeemed'
    ),
    averageOrderValue: buildKpiObj(
      'averageOrderValue',
      'Average Order Value',
      currentMetrics.averageOrderValue,
      previousMetrics.averageOrderValue,
      formatUsd(currentMetrics.averageOrderValue),
      formatUsd(previousMetrics.averageOrderValue),
      'Revenue per completed order'
    ),
    grossOrderValue: currentMetrics.grossBookedRevenue,
    processingOrdersCount: currentMetrics.processingOrders,
    shippedOrdersCount: currentMetrics.shippedOrders,
  };

  const summaryCards = [
    summary.totalRevenue,
    summary.totalOrders,
    summary.completedOrders,
    summary.pendingOrders,
    summary.cancelledOrders,
    summary.totalProductsSold,
    summary.newCustomers,
    summary.totalDiscountsGiven,
    summary.averageOrderValue,
  ];

  // 4. Sales and Revenue Analytics
  // 4a. Daily revenue & orders per day throughout the selected month
  const daysInTargetMonth = getDaysInYearMonth(range.selectedYear, range.selectedMonth);
  const dailySeries = [];
  for (let d = 1; d <= daysInTargetMonth; d += 1) {
    const dateKey = formatYmd(range.selectedYear, range.selectedMonth, d);
    const dayOrders = orders.filter((ord) => completionDates.get(ord) === dateKey);
    const dayRev = dayOrders.reduce((sum, ord) => sum + getHistoricalOrderAmount(ord), 0);
    const dayUnits = dayOrders.reduce((sum, ord) => sum + Math.max(1, Number(ord.quantity || 1)), 0);
    const nonCancelledCount = dayOrders.length;
    const completedDayCount = dayOrders.length;
    const shortLbl = `${MONTH_NAMES_SHORT[range.selectedMonth - 1]} ${d}`;
    dailySeries.push({
      date: dateKey,
      dayOfMonth: d,
      dayLabel: String(d),
      label: shortLbl,
      shortLabel: shortLbl,
      revenue: Math.round(dayRev),
      orders: dayOrders.length,
      orderCount: dayOrders.length,
      completedOrders: completedDayCount,
      nonCancelledOrderCount: nonCancelledCount,
      unitsSold: dayUnits,
    });
  }

  // 4b. Monthly revenue throughout the selected year + sales comparison between months
  const monthlySeries = [];
  for (let m = 1; m <= 12; m += 1) {
    const mStart = formatYmd(range.selectedYear, m, 1);
    const mEnd = formatYmd(range.selectedYear, m, getDaysInYearMonth(range.selectedYear, m));
    const mWindow = computeWindowMetrics(mStart, mEnd);

    const prevMonthRev = m > 1 ? monthlySeries[m - 2].revenue : 0;
    const momChange = computePercentageChange(mWindow.totalRevenue, prevMonthRev);

    monthlySeries.push({
      month: m,
      monthIndex: m,
      monthKey: `${range.selectedYear}-${pad2(m)}`,
      monthName: MONTH_NAMES_FULL[m - 1],
      fullLabel: `${MONTH_NAMES_FULL[m - 1]} ${range.selectedYear}`,
      label: MONTH_NAMES_SHORT[m - 1],
      shortName: MONTH_NAMES_SHORT[m - 1],
      revenue: mWindow.totalRevenue,
      grossBookedRevenue: mWindow.grossBookedRevenue,
      orders: mWindow.totalOrders,
      orderCount: mWindow.totalOrders,
      completedOrders: mWindow.completedOrders,
      productsSold: mWindow.totalProductsSold,
      vsPreviousMonth: momChange,
      monthOverMonthChange: momChange,
      isSelectedMonth: m === range.selectedMonth,
    });
  }

  // 4c. Revenue by Product Category
  const categoryMap = new Map();
  categories.forEach((cat) => {
    categoryMap.set(String(cat.id).toLowerCase(), {
      categoryId: String(cat.id).toLowerCase(),
      categoryCode: cat.categoryId || cat.code || 'CAT-LR',
      categoryName: cat.name,
      revenue: 0,
      unitsSold: 0,
      orders: 0,
      orderCount: 0,
    });
  });

  const normalizeCategorySlug = (order, matchedProduct) => {
    if (matchedProduct?.categoryId) return String(matchedProduct.categoryId).toLowerCase();
    const rawCat = String(order?.categoryName || '').toLowerCase();
    if (rawCat.includes('living') || rawCat.includes('lounge')) return 'living';
    if (rawCat.includes('dining')) return 'dining';
    if (rawCat.includes('bed')) return 'bedroom';
    if (
      rawCat.includes('study') ||
      rawCat.includes('office') ||
      rawCat.includes('credenza') ||
      rawCat.includes('desk')
    ) {
      return 'office';
    }
    if (rawCat.includes('kitchen')) return 'kitchen';
    return 'living';
  };

  currentMetrics.periodOrders.forEach((ord) => {
    const matchedProd =
      productById.get(String(ord.furnitureId || '')) ||
      productBySku.get(String(ord.sku || '').toUpperCase()) ||
      null;
    const slug = normalizeCategorySlug(ord, matchedProd);
    if (!categoryMap.has(slug)) {
      categoryMap.set(slug, {
        categoryId: slug,
        categoryCode: 'CAT-LR',
        categoryName: ord.categoryName || 'Collection',
        revenue: 0,
        unitsSold: 0,
        orders: 0,
        orderCount: 0,
      });
    }
    const bucket = categoryMap.get(slug);
    bucket.orders += 1;
    bucket.orderCount += 1;
    bucket.unitsSold += Math.max(1, Number(ord.quantity || 1));
    bucket.revenue += getHistoricalOrderAmount(ord);
  });

  const totalCatRev = Math.max(
    1,
    Array.from(categoryMap.values()).reduce((sum, c) => sum + c.revenue, 0)
  );
  const categoryRevenue = Array.from(categoryMap.values())
    .map((c) => ({
      ...c,
      sharePercent:
        currentMetrics.totalRevenue > 0 ? Math.round((c.revenue / totalCatRev) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold);

  const revComparison = computePercentageChange(
    currentMetrics.totalRevenue,
    previousMetrics.totalRevenue
  );
  const performanceStatus =
    revComparison.percentChange > 0
      ? 'Improving'
      : revComparison.percentChange < 0
      ? 'Declining'
      : 'Stable';
  const performanceDirection = performanceStatus.toLowerCase();
  const performanceInsight =
    performanceStatus === 'Improving'
      ? `Realized revenue increased by ${revComparison.formatted} (${formatUsd(currentMetrics.totalRevenue)} vs ${formatUsd(previousMetrics.totalRevenue)} in ${range.previousPeriodLabel}).`
      : performanceStatus === 'Declining'
      ? `Realized revenue shifted by ${revComparison.formatted} (${formatUsd(currentMetrics.totalRevenue)} vs ${formatUsd(previousMetrics.totalRevenue)} in ${range.previousPeriodLabel}) while workshop orders remain in production.`
      : `Realized revenue is steady at ${formatUsd(currentMetrics.totalRevenue)} compared to ${range.previousPeriodLabel}.`;

  const salesAnalytics = {
    year: range.selectedYear,
    dailySeries,
    monthlySeries,
    monthlyComparison: monthlySeries,
    categoryRevenue,
    revenueByCategory: categoryRevenue,
    performanceDirection,
    performanceInsight,
    performanceTrend: {
      status: performanceStatus,
      comparison: revComparison,
      currentRevenue: currentMetrics.totalRevenue,
      previousRevenue: previousMetrics.totalRevenue,
      summaryText: performanceInsight,
    },
  };

  // 5. Best-Selling Products & Low-Sales Products
  const productSalesMap = new Map();
  products.forEach((prod) => {
    const stockInfo = getProductStockStatus(prod);
    productSalesMap.set(String(prod.id), {
      id: String(prod.id),
      productId: prod.productId || prod.sku || 'LR-ITEM',
      sku: prod.sku || prod.productId || 'LR-ITEM',
      name: prod.name,
      categoryId: prod.categoryId,
      categoryName: prod.categoryName || 'Showroom Collection',
      image: prod.image || 'assets/images/category_living_lounge.jpg',
      quantitySold: 0,
      totalRevenue: 0,
      orderCount: 0,
      currentStock: stockInfo.availableStock,
      minStockLevel: stockInfo.minStockLevel,
      stockStatusKey: stockInfo.statusKey,
      stockStatusLabel: stockInfo.label,
    });
  });

  const seenProdOrderItems = new Set();
  currentMetrics.periodOrders.forEach((ord) => {
    const itemKey = String(ord.orderItemId || ord.orderId || ord.orderNumber || ord.id || '');
    if (itemKey && seenProdOrderItems.has(itemKey)) return;
    if (itemKey) seenProdOrderItems.add(itemKey);

    const matchedProd =
      productById.get(String(ord.furnitureId || '')) ||
      productBySku.get(String(ord.sku || '').toUpperCase()) ||
      null;
    const mapKey = matchedProd ? String(matchedProd.id) : String(ord.furnitureId || ord.sku || ord.id);
    if (!productSalesMap.has(mapKey)) {
      productSalesMap.set(mapKey, {
        id: mapKey,
        productId: ord.sku || 'LR-CUSTOM',
        sku: ord.sku || 'LR-CUSTOM',
        name: ord.furnitureName || 'Custom Piece',
        categoryId: 'living',
        categoryName: ord.categoryName || 'Bespoke Commission',
        image: 'assets/images/category_living_lounge.jpg',
        quantitySold: 0,
        totalRevenue: 0,
        orderCount: 0,
        currentStock: 1,
        minStockLevel: 1,
        stockStatusKey: 'in_stock',
        stockStatusLabel: 'In Stock',
      });
    }
    const entry = productSalesMap.get(mapKey);
    const qty = Math.max(1, Number(ord.quantity || 1));
    entry.quantitySold += qty;
    entry.orderCount += 1;
    entry.totalRevenue += getHistoricalOrderAmount(ord);
  });

  const allProductRankings = Array.from(productSalesMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue || b.quantitySold - a.quantitySold || a.name.localeCompare(b.name))
    .map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

  const topFiveProducts = allProductRankings.slice(0, 5);
  const lowPerformingProducts = allProductRankings
    .filter((item) => item.quantitySold <= 1)
    .sort((a, b) => a.quantitySold - b.quantitySold || a.totalRevenue - b.totalRevenue)
    .slice(0, 5);

  const bestSellingProducts = {
    allRankedProducts: allProductRankings,
    topFive: topFiveProducts,
    topFiveProducts,
    lowSellingProducts: lowPerformingProducts,
    lowPerformingProducts,
  };

  // 6. Order Analytics (Status Distribution using actual system statuses)
  const statusDefs = [
    {
      status: 'Pending',
      statusKey: 'Pending',
      label: 'Pending',
      sqlStatusLabel: 'Pending · Timber Selection',
      color: '#D97706',
    },
    {
      status: 'Processing',
      statusKey: 'Processing',
      label: 'Processing',
      sqlStatusLabel: 'InProduction · Workshop Joinery',
      color: '#0095FF',
    },
    {
      status: 'Shipped',
      statusKey: 'Shipped',
      label: 'Shipped',
      sqlStatusLabel: 'Ready · Dispatched / Transit',
      color: '#6366F1',
    },
    {
      status: 'Completed',
      statusKey: 'Completed',
      label: 'Completed',
      sqlStatusLabel: 'Delivered · Completed',
      color: '#059669',
    },
    {
      status: 'Cancelled',
      statusKey: 'Cancelled',
      label: 'Cancelled',
      sqlStatusLabel: 'Cancelled',
      color: '#DC2626',
    },
  ];

  const statusCounts = {
    Pending: { count: 0, totalAmount: 0 },
    Processing: { count: 0, totalAmount: 0 },
    Shipped: { count: 0, totalAmount: 0 },
    Completed: { count: 0, totalAmount: 0 },
    Cancelled: { count: 0, totalAmount: 0 },
  };

  currentMetrics.periodOrders.forEach((ord) => {
    const bucketKey = 'Completed';
    if (statusCounts[bucketKey]) {
      statusCounts[bucketKey].count += 1;
      statusCounts[bucketKey].totalAmount += getHistoricalOrderAmount(ord);
    }
  });

  const totalPeriodOrdersDenom = Math.max(1, currentMetrics.totalOrders);
  const statusDistribution = statusDefs.map((def) => {
    const data = statusCounts[def.statusKey] || { count: 0, totalAmount: 0 };
    const sharePercent =
      currentMetrics.totalOrders > 0
        ? Math.round((data.count / totalPeriodOrdersDenom) * 1000) / 10
        : 0;
    const totalAmt = Math.round(data.totalAmount);
    return {
      ...def,
      count: data.count,
      totalAmount: totalAmt,
      totalValue: totalAmt,
      sharePercent,
      percentage: sharePercent,
    };
  });

  const orderAnalytics = {
    totalOrders: currentMetrics.totalOrders,
    distribution: statusDistribution,
    statusDistribution,
  };

  // 7. Customer Analytics
  const customerOrderStats = new Map();
  customers.forEach((c) => {
    const email = String(c?.email || '').trim().toLowerCase();
    if (!email) return;
    customerOrderStats.set(email, {
      customerId: c.customerId || c.id || 'LR-CUS-300',
      name: c.fullName || c.name || 'Client',
      email: c.email,
      company: c.company || 'Private Residence',
      registeredAt: parseManilaDateOnly(c.registeredAt || c.createdAt) || '2026-09-01',
      periodOrders: 0,
      periodSpent: 0,
      lifetimeOrders: 0,
      lifetimeSpent: 0,
    });
  });

  orders.forEach((ord) => {
    const email = String(ord?.clientEmail || '').trim().toLowerCase();
    if (!email) return;
    if (!customerOrderStats.has(email)) {
      customerOrderStats.set(email, {
        customerId: generateOwnEntityId('customer', email).codeId,
        name: ord.clientName || 'Showroom Client',
        email: ord.clientEmail,
        company: ord.clientCompany || 'Private Residence',
        registeredAt: parseManilaDateOnly(ord.orderDate) || '2026-09-01',
        periodOrders: 0,
        periodSpent: 0,
        lifetimeOrders: 0,
        lifetimeSpent: 0,
      });
    }
    const stat = customerOrderStats.get(email);
    const amt = getHistoricalOrderAmount(ord);
    stat.lifetimeOrders += 1;
    stat.lifetimeSpent += amt;

    if (isWithinRange(completionDates.get(ord), range.startDate, range.endDate)) {
      stat.periodOrders += 1;
      stat.periodSpent += amt;
    }
  });

  const allCustomerStats = Array.from(customerOrderStats.values());
  const orderingCustomers = allCustomerStats.filter((c) => c.periodOrders > 0);
  const returningCustomers = allCustomerStats.filter(
    (c) => c.periodOrders > 0 && c.lifetimeOrders > 1
  );
  const lifetimeReturningCustomers = allCustomerStats.filter((c) => c.lifetimeOrders > 1);
  const topCustomers = [...allCustomerStats]
    .sort((a, b) => b.periodSpent - a.periodSpent || b.lifetimeSpent - a.lifetimeSpent)
    .map((c, idx) => ({
      ...c,
      rank: idx + 1,
      isReturning: c.lifetimeOrders > 1,
    }));

  const monthlyRegistrationTrend = [];
  for (let m = 1; m <= 12; m += 1) {
    const mStart = formatYmd(range.selectedYear, m, 1);
    const mEnd = formatYmd(range.selectedYear, m, getDaysInYearMonth(range.selectedYear, m));
    const regCount = allCustomerStats.filter(
      (c) => c.registeredAt >= mStart && c.registeredAt <= mEnd
    ).length;
    const activeBuyerEmails = new Set(
      orders
        .filter(
          (o) =>
            isWithinRange(completionDates.get(o), mStart, mEnd)
        )
        .map((o) => String(o.clientEmail || '').toLowerCase())
    );
    monthlyRegistrationTrend.push({
      month: m,
      monthIndex: m,
      monthName: MONTH_NAMES_FULL[m - 1],
      label: MONTH_NAMES_SHORT[m - 1],
      shortName: MONTH_NAMES_SHORT[m - 1],
      newRegistrations: regCount,
      activeBuyers: activeBuyerEmails.size,
    });
  }

  const customerAnalytics = {
    newCustomersCount: currentMetrics.newCustomers,
    newCustomersList: currentMetrics.newCustomersList,
    customersWhoPlacedOrdersCount: orderingCustomers.length,
    orderingCustomersCount: orderingCustomers.length,
    returningCustomersCount: returningCustomers.length,
    totalLifetimeReturningCustomers: lifetimeReturningCustomers.length,
    totalRegisteredCustomers: allCustomerStats.length,
    highestPurchaseCustomers: topCustomers,
    topCustomers,
    monthlyRegistrationTrends: monthlyRegistrationTrend,
    monthlyRegistrationTrend,
  };

  // 8. Inventory Analytics (Live Snapshot vs Selected Period Historical Movements)
  const productMetrics = computeInventoryMetrics(products);
  const materialMetrics = computeMaterialInventoryMetrics(materials);
  const currentProductCatalogValue = products.reduce((sum, p) => {
    const stock = Math.max(0, Number(p.inStockCount ?? 0));
    const price = Math.max(0, Number(p.effectivePrice ?? p.price ?? 0));
    return sum + Math.round(stock * price);
  }, 0);

  const materialsRequiringRestock = [
    ...materialMetrics.outOfStockItems,
    ...materialMetrics.lowStockItems,
  ].map((m) => {
    const st = getMaterialStockStatus(m);
    return {
      ...m,
      materialId: m.materialId || m.code || 'MAT-01',
      category: m.materialType || 'Solid Timber',
      quantity: st.availableStock,
      minimumStock: st.minStockLevel,
      unit: m.unit || 'units',
      status: st.label,
    };
  });

  const lowStockProductsNormalized = (productMetrics.lowStockItems || []).map((p) => ({
    ...p,
    productId: p.productId || p.sku || 'LR-ITEM',
    stock: Math.max(0, Number(p.inStockCount ?? 0)),
    minStock: Math.max(0, Number(p.minStockLevel ?? 2)),
  }));

  const outOfStockProductsNormalized = (productMetrics.outOfStockItems || []).map((p) => ({
    ...p,
    productId: p.productId || p.sku || 'LR-ITEM',
    stock: Math.max(0, Number(p.inStockCount ?? 0)),
    minStock: Math.max(0, Number(p.minStockLevel ?? 2)),
  }));

  const periodInvTransactions = inventoryTransactions.filter((tx) =>
    isWithinRange(tx.dateTime || tx.date, range.startDate, range.endDate)
  );

  const consumedByMaterial = new Map();
  periodInvTransactions
    .filter((tx) => tx.transactionType === 'Stock Out')
    .forEach((tx) => {
      const mId = String(tx.materialId || tx.materialCode || tx.materialName || '');
      const existing = consumedByMaterial.get(mId) || {
        materialId: tx.materialId,
        materialCode: tx.materialCode || 'MAT-01',
        code: tx.materialCode || 'MAT-01',
        materialName: tx.materialName || 'Material',
        name: tx.materialName || 'Material',
        materialType: tx.materialType || 'Solid Timber',
        unit: tx.unit || 'units',
        quantityConsumed: 0,
        unitsConsumed: 0,
        unitCost: Number(tx.unitCost || 0),
        estimatedCost: 0,
        totalCost: 0,
        transactionCount: 0,
        transactionsCount: 0,
        lastReason: tx.reason || 'Workshop Production',
      };
      const qty = Math.max(0, Number(tx.quantity || 0));
      existing.quantityConsumed += qty;
      existing.unitsConsumed += qty;
      existing.estimatedCost += Math.round(qty * existing.unitCost);
      existing.totalCost = existing.estimatedCost;
      existing.transactionCount += 1;
      existing.transactionsCount = existing.transactionCount;
      if (tx.reason) existing.lastReason = tx.reason;
      consumedByMaterial.set(mId, existing);
    });

  // Also include order-level material consumption for orders placed in period that aren't already in Stock Out tx
  operationalOrders.forEach((ord) => {
    if (!isWithinRange(ord.orderDate, range.startDate, range.endDate) || /cancel/i.test(`${ord.status || ''} ${ord.sqlStatus || ''}`)) return;
    const ordNum = String(ord.orderNumber || ord.orderId || '');
    const alreadyLogged = periodInvTransactions.some(
      (tx) => tx.transactionType === 'Stock Out' && String(tx.reason || '').includes(ordNum)
    );
    if (alreadyLogged) return;
    const mId = String(ord.materialId || '');
    if (!mId) return;
    const matObj = materials.find((m) => m.id === mId) || null;
    const qtyUsed = Math.max(0, Number(ord.materialQtyUsed || 0));
    if (qtyUsed <= 0) return;
    const mCode = matObj?.materialId || matObj?.code || 'MAT-01';
    const mName = ord.materialName || matObj?.name || 'Workshop Material';
    const existing = consumedByMaterial.get(mId) || {
      materialId: mId,
      materialCode: mCode,
      code: mCode,
      materialName: mName,
      name: mName,
      materialType: matObj?.materialType || 'Solid Timber',
      unit: ord.materialUnit || matObj?.unit || 'units',
      quantityConsumed: 0,
      unitsConsumed: 0,
      unitCost: Number(matObj?.unitCost || 0),
      estimatedCost: 0,
      totalCost: 0,
      transactionCount: 0,
      transactionsCount: 0,
      lastReason: `Allocated to Order #${ordNum}`,
    };
    existing.quantityConsumed += qtyUsed;
    existing.unitsConsumed += qtyUsed;
    existing.estimatedCost += Math.round(qtyUsed * existing.unitCost);
    existing.totalCost = existing.estimatedCost;
    existing.transactionCount += 1;
    existing.transactionsCount = existing.transactionCount;
    existing.lastReason = `Allocated to Order #${ordNum}`;
    consumedByMaterial.set(mId, existing);
  });

  const materialsConsumedInPeriod = Array.from(consumedByMaterial.values()).sort(
    (a, b) => b.estimatedCost - a.estimatedCost || b.quantityConsumed - a.quantityConsumed
  );

  const totalMaterialUnitsConsumed = materialsConsumedInPeriod.reduce(
    (sum, m) => sum + m.quantityConsumed,
    0
  );
  const totalMaterialCostConsumed = materialsConsumedInPeriod.reduce(
    (sum, m) => sum + m.estimatedCost,
    0
  );

  const stockInTransactionsInPeriod = periodInvTransactions.filter(
    (tx) => tx.transactionType === 'Stock In'
  );
  const totalMaterialUnitsRestocked = stockInTransactionsInPeriod.reduce(
    (sum, tx) => sum + Math.max(0, Number(tx.quantity || 0)),
    0
  );
  const totalRestockSpend = stockInTransactionsInPeriod.reduce(
    (sum, tx) => sum + Math.max(0, Number(tx.purchaseCost || 0)),
    0
  );

  const availableProductsCount = products.filter((p) => Number(p?.inStockCount ?? 0) > 0).length;

  const inventoryAnalytics = {
    currentSnapshot: {
      totalAvailableProducts: availableProductsCount,
      totalCatalogProducts: products.length,
      totalAvailableUnits: productMetrics.totalStockAvailable,
      totalProductUnitsInStock: productMetrics.totalStockAvailable,
      lowStockProductsCount: productMetrics.lowStockCount,
      lowStockProducts: lowStockProductsNormalized,
      outOfStockProductsCount: productMetrics.outOfStockCount,
      outOfStockProducts: outOfStockProductsNormalized,
      totalMaterials: materials.length,
      materialsRequiringRestockingCount: materialsRequiringRestock.length,
      materialsRequiringRestockCount: materialsRequiringRestock.length,
      materialsRequiringRestocking: materialsRequiringRestock,
      materialsRequiringRestock,
      materialInventoryValue: materialMetrics.totalInventoryValue,
      currentMaterialInventoryValue: materialMetrics.totalInventoryValue,
      catalogInventoryValue: currentProductCatalogValue,
      currentProductCatalogValue,
      currentInventoryValue: materialMetrics.totalInventoryValue + currentProductCatalogValue,
    },
    periodMovements: {
      periodLabel: range.periodLabel,
      totalMovementsCount: periodInvTransactions.length,
      materialsConsumedInPeriod,
      totalUnitsConsumed: totalMaterialUnitsConsumed,
      totalMaterialUnitsConsumed,
      totalConsumedValue: totalMaterialCostConsumed,
      totalMaterialCostConsumed,
      stockInCount: stockInTransactionsInPeriod.length,
      totalUnitsRestocked: totalMaterialUnitsRestocked,
      totalMaterialUnitsRestocked,
      totalRestockedCost: Math.round(totalRestockSpend),
      totalRestockSpend: Math.round(totalRestockSpend),
      periodTransactions: periodInvTransactions,
    },
  };

  // 9. Voucher Analytics
  const normalizedVouchers = vouchers.map((v) => {
    const statusInfo = computeVoucherStatusInfo(v, effectiveNowMs);
    const issuedDate = parseManilaDateOnly(v.issuedAt || v.createdAt);
    const expiryDate = parseManilaDateOnly(v.expiresAt || v.expiryDate);
    const issuedDisp = formatVoucherIssuedDisplay(v);
    const expiryDisp = formatVoucherExpiryDisplay(v);
    return {
      ...v,
      voucherId: v.voucherId || generateOwnEntityId('voucher', v.code || v.id).codeId,
      productName: v.furnitureName || v.productName || 'Showroom Piece',
      discountAmount: Math.max(0, Number(v.discountAmount ?? v.discountValue ?? 0)),
      effectiveStatus: statusInfo.status,
      status: statusInfo.status,
      badgeClass: statusInfo.badgeClass,
      remainingLabel: statusInfo.remainingLabel,
      issuedDisplay: issuedDisp,
      expiryDisplay: expiryDisp,
      issuedAt: issuedDisp.full || v.createdAt || '—',
      expiresAt: expiryDisp.full || v.expiryDate || 'No expiry',
      issuedDate,
      expiryDate,
      inSelectedPeriod:
        isWithinRange(issuedDate, range.startDate, range.endDate) ||
        isWithinRange(v.redeemedAt, range.startDate, range.endDate) ||
        isWithinRange(v.revokedAt, range.startDate, range.endDate),
    };
  });

  const vouchersInPeriod = normalizedVouchers.filter((v) =>
    isWithinRange(v.issuedDate, range.startDate, range.endDate)
  );

  let activeVouchers = 0;
  let expiringSoonVouchers = 0;
  const voucherCode = (order) => String(order.appliedVoucherCode || '').trim().toUpperCase();
  const completedVoucherCodes = new Set(orders.map(voucherCode).filter(Boolean));
  const periodVoucherCodes = new Set(currentMetrics.periodOrders.map(voucherCode).filter(Boolean));
  const redeemedVouchers = completedVoucherCodes.size;
  const redeemedInPeriodCount = periodVoucherCodes.size;
  let expiredVouchers = 0;
  let revokedVouchers = 0;
  let totalDiscountIssued = 0;

  normalizedVouchers.forEach((v) => {
    const amt = v.discountAmount;
    totalDiscountIssued += amt;
    if (v.effectiveStatus === 'Active') {
      activeVouchers += 1;
    } else if (v.effectiveStatus === 'Expiring Soon') {
      activeVouchers += 1;
      expiringSoonVouchers += 1;
    } else if (v.effectiveStatus === 'Expired') {
      expiredVouchers += 1;
    } else if (v.effectiveStatus === 'Revoked' || v.effectiveStatus === 'Cancelled') {
      revokedVouchers += 1;
    }
  });

  const orderVoucherDiscountsInPeriod = currentMetrics.totalDiscountsGiven;
  const effectiveDiscountRedeemed = orders.reduce(
    (sum, ord) => sum + Math.max(0, Number(ord.voucherDiscountAmount || 0)), 0
  );
  const effectivePeriodDiscountRedeemed = orderVoucherDiscountsInPeriod;
  const totalVouchersIssued = normalizedVouchers.length;
  const redemptionRate =
    totalVouchersIssued > 0
      ? Math.round((redeemedVouchers / totalVouchersIssued) * 1000) / 10
      : 0;
  const periodRedemptionRate =
    vouchersInPeriod.length > 0
      ? Math.round((redeemedInPeriodCount / vouchersInPeriod.length) * 1000) / 10
      : 0;

  const voucherAnalytics = {
    totalVouchersIssued,
    totalIssuedInPeriod: vouchersInPeriod.length,
    vouchersIssuedInSelectedPeriod: vouchersInPeriod.length,
    activeVouchers,
    expiringSoonVouchers,
    redeemedVouchers,
    redeemedInPeriodCount,
    expiredVouchers,
    revokedVouchers,
    totalDiscountIssued: Math.round(totalDiscountIssued),
    totalDiscountRedeemed: Math.round(effectiveDiscountRedeemed),
    periodDiscountRedeemed: Math.round(effectivePeriodDiscountRedeemed),
    redemptionRate,
    periodRedemptionRate,
    voucherBreakdown: normalizedVouchers,
    vouchers: normalizedVouchers,
  };

  const transactions = currentMetrics.periodOrders.map((ord) => {
    const statusBucket = 'Completed';
    const historicalAmt = getHistoricalOrderAmount(ord);
    const disc = Math.max(0, Number(ord.voucherDiscountAmount || 0));
    return {
      orderId: ord.orderId || ord.orderNumber,
      orderNumber: ord.orderNumber || ord.orderId,
      orderDate: ord.orderDate,
      completedAt: completionDates.get(ord),
      reportDate: completionDates.get(ord),
      clientName: ord.clientName,
      clientEmail: ord.clientEmail,
      furnitureName: ord.furnitureName,
      productId: ord.sku || ord.furnitureId,
      sku: ord.sku || ord.furnitureId,
      quantity: Math.max(1, Number(ord.quantity || 1)),
      totalAmount: historicalAmt,
      depositPaid: Math.max(0, Number(ord.depositPaid || 0)),
      discountAmount: disc,
      voucherDiscountAmount: disc,
      appliedVoucherCode: ord.appliedVoucherCode || null,
      normalizedStatus: statusBucket,
      statusBucket,
      stageLabel: ord.status,
      paymentStatus: ord.paymentStatus || 'Pending',
      realizedRevenue: historicalAmt,
    };
  });

  return {
    recognitionBasis: 'completed_orders',
    businessName: 'Lillia and Rowena Furniture',
    generatedAtIso: new Date(effectiveNowMs).toISOString(),
    generatedAtManila: formatManilaDateTimeParts(new Date(effectiveNowMs).toISOString()).full,
    dateRange: range,
    period: range.current,
    previousPeriod: range.previous,
    summary,
    summaryCards,
    kpis: {
      totalRevenue: currentMetrics.totalRevenue,
      totalOrders: currentMetrics.totalOrders,
      completedOrders: currentMetrics.completedOrders,
      pendingOrders: currentMetrics.pendingOrders,
      cancelledOrders: currentMetrics.cancelledOrders,
      totalProductsSold: currentMetrics.totalProductsSold,
      newCustomers: currentMetrics.newCustomers,
      totalDiscountsGiven: currentMetrics.totalDiscountsGiven,
      averageOrderValue: currentMetrics.averageOrderValue,
    },
    salesAnalytics,
    bestSellingProducts,
    productAnalytics: bestSellingProducts,
    orderAnalytics,
    customerAnalytics,
    inventoryAnalytics,
    voucherAnalytics,
    transactions,
    periodOrders: transactions,
  };
}

export function buildAnalyticsCsvContent(report) {
  if (!report || typeof report !== 'object') return '';
  const esc = (val) => {
    const str = String(val ?? '').replace(/\r?\n/g, ' ');
    if (str.includes(',') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [];
  lines.push(['Business Name', esc(report.businessName || 'Lillia and Rowena Furniture')].join(','));
  lines.push(['Report Period', esc(report.dateRange?.periodLabel || report.period?.label || '')].join(','));
  lines.push([
    'Date Range',
    esc(`${report.dateRange?.startDate || report.period?.startDate || ''} to ${report.dateRange?.endDate || report.period?.endDate || ''}`),
  ].join(','));
  lines.push(['Generated Date (PHT)', esc(report.generatedAtManila || '')].join(','));
  lines.push('');

  lines.push('MONTHLY BUSINESS SUMMARY KPIs');
  lines.push(['Metric', 'Selected Period Value', 'Previous Period Value', 'Change (%)'].join(','));
  (report.summaryCards || []).forEach((card) => {
    lines.push(
      [
        esc(card.label),
        esc(card.formattedValue),
        esc(card.formattedPreviousValue),
        esc(card.comparison?.formatted || card.formattedChange || '0.0%'),
      ].join(',')
    );
  });
  lines.push('');

  lines.push('BEST-SELLING PRODUCTS');
  lines.push(
    ['Rank', 'Product ID', 'Product Name', 'Category', 'Quantity Sold', 'Total Revenue ($)', 'Stock Availability'].join(',')
  );
  (report.bestSellingProducts?.allRankedProducts || report.productAnalytics?.allRankedProducts || []).forEach((p) => {
    lines.push(
      [
        esc(p.rank),
        esc(p.productId),
        esc(p.name),
        esc(p.categoryName),
        esc(p.quantitySold),
        esc(`$${p.totalRevenue}`),
        esc(`${p.currentStock} (${p.stockStatusLabel})`),
      ].join(',')
    );
  });
  lines.push('');

  lines.push('VOUCHER ANALYTICS SUMMARY');
  lines.push(
    [
      'Total Issued',
      'Active',
      'Redeemed',
      'Expired',
      'Revoked',
      'Total Discount Redeemed ($)',
      'Redemption Rate (%)',
    ].join(',')
  );
  const va = report.voucherAnalytics || {};
  lines.push(
    [
      esc(va.totalVouchersIssued ?? 0),
      esc(va.activeVouchers ?? 0),
      esc(va.redeemedVouchers ?? 0),
      esc(va.expiredVouchers ?? 0),
      esc(va.revokedVouchers ?? 0),
      esc(`$${va.totalDiscountRedeemed ?? 0}`),
      esc(`${va.redemptionRate ?? 0}%`),
    ].join(',')
  );
  lines.push('');

  lines.push('TRANSACTION DETAILS');
  lines.push(
    [
      'Order ID',
      'Completion Date',
      'Customer',
      'Customer Email',
      'Product',
      'Product ID',
      'Qty',
      'Order Total ($)',
      'Discount ($)',
      'Status',
    ].join(',')
  );
  (report.transactions || report.periodOrders || []).forEach((ord) => {
    lines.push(
      [
        esc(ord.orderId),
        esc(ord.reportDate || ord.completedAt || ord.orderDate),
        esc(ord.clientName),
        esc(ord.clientEmail),
        esc(ord.furnitureName),
        esc(ord.sku),
        esc(ord.quantity),
        esc(`$${ord.totalAmount}`),
        esc(`$${ord.voucherDiscountAmount}`),
        esc(ord.statusBucket),
      ].join(',')
    );
  });

  return lines.join('\r\n');
}

export function buildAnalyticsPdfBytes(report) {
  const safeAscii = (str) =>
    String(str ?? '')
      .replace(/₱/g, '$')
      .replace(/[—–]/g, '-')
      .replace(/×/g, 'x')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/([()\\])/g, '\\$1');

  const lines = [];
  lines.push(`LILLIA AND ROWENA FURNITURE - MONTHLY ANALYTICS & BUSINESS REPORT`);
  lines.push(`Reporting Period: ${report?.dateRange?.periodLabel || report?.period?.label || 'Current Period'} (${report?.dateRange?.startDate || report?.period?.startDate || ''} to ${report?.dateRange?.endDate || report?.period?.endDate || ''})`);
  lines.push(`Generated On: ${report?.generatedAtManila || ''} (Asia/Manila)`);
  lines.push(`--------------------------------------------------------------------------------`);
  lines.push(`1. EXECUTIVE BUSINESS SUMMARY`);
  (report?.summaryCards || []).forEach((card) => {
    lines.push(
      `   - ${card.label}: ${card.formattedValue} (Prior: ${card.formattedPreviousValue} | ${card.comparison?.formatted || card.formattedChange || '0.0%'})`
    );
  });
  lines.push(`--------------------------------------------------------------------------------`);
  lines.push(`2. TOP 5 BEST-SELLING PRODUCTS`);
  (report?.bestSellingProducts?.topFive || report?.productAnalytics?.topFiveProducts || []).forEach((p) => {
    lines.push(
      `   #${p.rank} [${p.productId}] ${p.name} (${p.categoryName}) - Sold: ${p.quantitySold} pcs | Revenue: $${p.totalRevenue.toLocaleString('en-US')} | Stock: ${p.currentStock}`
    );
  });
  lines.push(`--------------------------------------------------------------------------------`);
  lines.push(`3. ORDER STATUS DISTRIBUTION`);
  (report?.orderAnalytics?.distribution || report?.orderAnalytics?.statusDistribution || []).forEach((s) => {
    lines.push(
      `   - ${s.label}: ${s.count} order(s) (${s.sharePercent}%) - Total: $${s.totalAmount.toLocaleString('en-US')}`
    );
  });
  lines.push(`--------------------------------------------------------------------------------`);
  const va = report?.voucherAnalytics || {};
  lines.push(
    `4. VOUCHER ANALYTICS: Issued: ${va.totalVouchersIssued || 0} | Active: ${va.activeVouchers || 0} | Redeemed: ${va.redeemedVouchers || 0} | Expired: ${va.expiredVouchers || 0} | Revoked: ${va.revokedVouchers || 0}`
  );
  lines.push(
    `   Total Discount Redeemed: $${(va.totalDiscountRedeemed || 0).toLocaleString('en-US')} | Redemption Rate: ${va.redemptionRate || 0}%`
  );
  lines.push(`--------------------------------------------------------------------------------`);
  const inv = report?.inventoryAnalytics?.currentSnapshot || {};
  const mov = report?.inventoryAnalytics?.periodMovements || {};
  lines.push(
    `5. INVENTORY ANALYTICS: Available Products: ${inv.totalAvailableProducts || 0} | Low Stock: ${inv.lowStockProductsCount || 0} | Needs Restock: ${inv.materialsRequiringRestockingCount || 0}`
  );
  lines.push(
    `   Current Combined Inventory Value: $${(inv.currentInventoryValue || 0).toLocaleString('en-US')} | Period Material Consumed Cost: $${(mov.totalMaterialCostConsumed || 0).toLocaleString('en-US')}`
  );
  lines.push(`--------------------------------------------------------------------------------`);
  lines.push(`6. PERIOD TRANSACTIONS (${(report?.transactions || report?.periodOrders || []).length} record(s))`);
  (report?.transactions || report?.periodOrders || []).slice(0, 12).forEach((ord) => {
    lines.push(
      `   ${ord.orderId} | ${ord.orderDate} | ${ord.clientName} | ${ord.sku} (x${ord.quantity}) | $${ord.totalAmount.toLocaleString('en-US')} | ${ord.statusBucket}`
    );
  });

  const textOps = ['BT', '/F1 9 Tf', '40 755 Td', '13 TL'];
  lines.forEach((line, idx) => {
    if (idx === 0) {
      textOps.push(`(${safeAscii(line)}) Tj`);
    } else {
      textOps.push(`T* (${safeAscii(line)}) Tj`);
    }
  });
  textOps.push('ET');
  const streamBody = textOps.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamBody.length} >>\nstream\n${streamBody}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += obj;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}




