#!/usr/bin/env node
import fs from "node:fs/promises";

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-07";
const START = process.env.SHOPIFY_SYNC_START_DATE || "2024-01-01";
const END = process.env.SHOPIFY_SYNC_END_DATE || new Date().toISOString().slice(0, 10);

const stores = [
  {
    brand: "corro",
    label: "Corro",
    store: process.env.SHOPIFY_CORRO_STORE,
    token: process.env.SHOPIFY_CORRO_TOKEN,
  },
  {
    brand: "cavali",
    label: "Cavali",
    store: process.env.SHOPIFY_CAVALI_STORE,
    token: process.env.SHOPIFY_CAVALI_TOKEN,
  },
];

const ORDER_QUERY = `
query Orders($cursor: String, $query: String!) {
  orders(first: 100, after: $cursor, query: $query, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      createdAt
      cancelledAt
      tags
      customer { id }
      totalShippingPriceSet { shopMoney { amount } }
      lineItems(first: 100) {
        nodes {
          quantity
          originalUnitPriceSet { shopMoney { amount } }
          discountedTotalSet { shopMoney { amount } }
          product {
            title
            vendor
            tags
          }
          variant {
            id
            sku
            price
            inventoryItem {
              unitCost { amount currencyCode }
            }
          }
        }
      }
    }
  }
}`;

const VARIANT_QUERY = `
query Variants($cursor: String) {
  productVariants(first: 100, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      sku
      price
      inventoryQuantity
      product {
        title
        vendor
        tags
      }
      inventoryItem {
        unitCost { amount currencyCode }
      }
    }
  }
}`;

function host(s) {
  return String(s || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

async function gql(cfg, query, variables = {}) {
  const response = await fetch(
    `https://${host(cfg.store)}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": cfg.token,
      },
      body: JSON.stringify({ query, variables }),
    }
  );

  const json = await response.json();

  if (!response.ok || json.errors) {
    throw new Error(
      `${cfg.label}: ${response.status} ${JSON.stringify(json.errors || json)}`
    );
  }

  return json.data;
}

async function fetchOrders(cfg) {
  if (!cfg.store || !cfg.token) {
    throw new Error(`Missing ${cfg.brand} Shopify credentials`);
  }

  let cursor = null;
  const output = [];

  do {
    const data = await gql(cfg, ORDER_QUERY, {
      cursor,
      query: `created_at:>=${START} created_at:<=${END}`,
    });

    output.push(...data.orders.nodes);
    cursor = data.orders.pageInfo.hasNextPage
      ? data.orders.pageInfo.endCursor
      : null;
  } while (cursor);

  return output;
}

async function fetchVariants(cfg) {
  let cursor = null;
  const output = [];

  try {
    do {
      const data = await gql(cfg, VARIANT_QUERY, { cursor });
      output.push(...data.productVariants.nodes);
      cursor = data.productVariants.pageInfo.hasNextPage
        ? data.productVariants.pageInfo.endCursor
        : null;
    } while (cursor);
  } catch (error) {
    /*
     * Product-cost access can be restricted by Shopify permissions.
     * Sales/order sync must still succeed even when unitCost isn't available.
     */
    console.warn(
      `${cfg.label}: product/inventory cost enrichment unavailable: ${error.message}`
    );
    return [];
  }

  return output;
}

const monthKey = (date) => String(date || "").slice(0, 7);
const money = (value) => Number(value?.amount ?? value ?? 0) || 0;
const low = (items) => (items || []).join(" ").toLowerCase();

function classifyOrder(order) {
  const lines = order.lineItems?.nodes || [];
  const searchable = `${low(order.tags)} ${low(
    lines.flatMap((x) => x.product?.tags || [])
  )}`;

  if (/drop\s*ship|dropship/.test(searchable)) return "Drop ship";
  if (/shopify\s*collective/.test(searchable)) return "Shopify Collective";
  if (/concierge/.test(searchable)) return "Concierge";
  if (/wellington/.test(searchable)) return "Wellington";
  if (/legacy/.test(searchable)) return "Legacy";
  return "e-commerce";
}

function cavaliTier(line) {
  const text = [
    line.product?.title,
    line.product?.vendor,
    ...(line.product?.tags || []),
    line.variant?.sku,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\bpremier\b|\bpremium\b/.test(text)) return "premier";
  if (/\bsignature\b/.test(text)) return "signature";
  return null;
}

function blankRow(period) {
  return {
    period,
    gross_sales: 0,
    net_sales: 0,
    total_discounts: 0,
    total_returns: 0,
    shipping_income: 0,
    nb_orders: 0,
    nb_units: 0,
    cogs: 0,
    gross_profit: 0,
    pct_gm: null,
    realized_markup_pct: null,
    costed_units: 0,
    uncosted_units: 0,
    customers: new Set(),
  };
}

function unitCost(line) {
  return money(line.variant?.inventoryItem?.unitCost);
}

function addOrderToRow(row, order) {
  const lines = order.lineItems?.nodes || [];
  let gross = 0;
  let net = 0;
  let units = 0;
  let cogs = 0;
  let costedUnits = 0;
  let uncostedUnits = 0;

  for (const line of lines) {
    const qty = Number(line.quantity || 0);
    gross += money(line.originalUnitPriceSet?.shopMoney) * qty;
    net += money(line.discountedTotalSet?.shopMoney);
    units += qty;

    const cost = unitCost(line);
    if (cost > 0) {
      cogs += cost * qty;
      costedUnits += qty;
    } else {
      uncostedUnits += qty;
    }
  }

  row.gross_sales += gross;
  row.net_sales += net;
  row.total_discounts += Math.max(0, gross - net);
  row.shipping_income += money(order.totalShippingPriceSet?.shopMoney);
  row.nb_orders += 1;
  row.nb_units += units;
  row.cogs += cogs;
  row.costed_units += costedUnits;
  row.uncosted_units += uncostedUnits;

  if (order.customer?.id) {
    row.customers.add(order.customer.id);
  }
}

function finalizeRow(row) {
  const uniqueCustomers = row.customers.size;
  const costCoverage =
    row.nb_units > 0 ? row.costed_units / row.nb_units : 0;

  /*
   * Do not present a false GM1 when product costs are missing for most units.
   * 80% coverage is a conservative threshold for a usable actual.
   */
  const costUsable = row.costed_units > 0 && costCoverage >= 0.8;
  const grossProfit = costUsable ? row.net_sales - row.cogs : null;
  const gm1 =
    costUsable && row.net_sales > 0 ? grossProfit / row.net_sales : null;
  const markup =
    costUsable && row.cogs > 0 ? (row.net_sales - row.cogs) / row.cogs : null;

  return {
    ...row,
    customers: undefined,
    unique_customers: uniqueCustomers,
    gross_profit: grossProfit,
    pct_gm: gm1,
    realized_markup_pct: markup,
    cost_coverage_pct: costCoverage,
  };
}

function elapsedMonthsForYear(year) {
  const end = new Date(`${END}T00:00:00Z`);
  if (Number(year) < end.getUTCFullYear()) return 12;
  if (Number(year) > end.getUTCFullYear()) return 0;

  const month = end.getUTCMonth(); // 0-based
  const day = end.getUTCDate();
  const daysInMonth = new Date(
    Date.UTC(end.getUTCFullYear(), month + 1, 0)
  ).getUTCDate();

  return month + Math.min(1, day / Math.max(1, daysInMonth));
}

function aggregateOrders(list, brand) {
  const months = new Map();
  const channels = new Map();
  const yearSets = new Map();
  const channelYearSets = new Map();

  const cavaliMembership = {};
  function membershipBucket(year, tier) {
    cavaliMembership[year] ??= {};
    cavaliMembership[year][tier] ??= {
      customers: new Set(),
      boxes: 0,
      orders: 0,
      netSales: 0,
      cogs: 0,
      costedUnits: 0,
      totalUnits: 0,
    };
    return cavaliMembership[year][tier];
  }

  for (const order of list) {
    if (order.cancelledAt) continue;

    const period = monthKey(order.createdAt);
    if (!period) continue;

    const year = period.slice(0, 4);
    const customerId = order.customer?.id || null;

    const totalRow = months.get(period) || blankRow(period);
    addOrderToRow(totalRow, order);
    months.set(period, totalRow);

    const channel = classifyOrder(order);
    const channelKey = `${period}__${channel}`;
    const channelRow =
      channels.get(channelKey) || { ...blankRow(period), channel };
    addOrderToRow(channelRow, order);
    channels.set(channelKey, channelRow);

    if (customerId) {
      if (!yearSets.has(year)) yearSets.set(year, new Set());
      yearSets.get(year).add(customerId);

      const cy = `${year}__${channel}`;
      if (!channelYearSets.has(cy)) channelYearSets.set(cy, new Set());
      channelYearSets.get(cy).add(customerId);
    }

    if (brand === "cavali") {
      const seenTiersThisOrder = new Set();

      for (const line of order.lineItems?.nodes || []) {
        const tier = cavaliTier(line);
        if (!tier) continue;

        const bucket = membershipBucket(year, tier);
        const qty = Number(line.quantity || 0);
        const net = money(line.discountedTotalSet?.shopMoney);
        const cost = unitCost(line);

        bucket.boxes += qty;
        bucket.netSales += net;
        bucket.totalUnits += qty;

        if (cost > 0) {
          bucket.cogs += cost * qty;
          bucket.costedUnits += qty;
        }

        if (customerId) bucket.customers.add(customerId);
        seenTiersThisOrder.add(tier);
      }

      for (const tier of seenTiersThisOrder) {
        membershipBucket(year, tier).orders += 1;
      }
    }
  }

  const yearly_unique_customers = Object.fromEntries(
    [...yearSets].map(([year, set]) => [year, set.size])
  );

  const channel_yearly_unique_customers = {};
  for (const [key, set] of channelYearSets) {
    const [year, channel] = key.split("__");
    (channel_yearly_unique_customers[year] ??= {})[channel] = set.size;
  }

  const membership_observed = {};
  for (const [year, tiers] of Object.entries(cavaliMembership)) {
    membership_observed[year] = {};

    for (const [tier, bucket] of Object.entries(tiers)) {
      const members = bucket.customers.size;
      const elapsed = elapsedMonthsForYear(year);
      const boxesPerMemberYtd = members ? bucket.boxes / members : null;
      const annualizedBoxesPerMember =
        boxesPerMemberYtd !== null && elapsed > 0
          ? boxesPerMemberYtd * (12 / elapsed)
          : null;

      const costCoverage =
        bucket.totalUnits > 0
          ? bucket.costedUnits / bucket.totalUnits
          : 0;

      membership_observed[year][tier] = {
        observedMembers: members,
        boxes: bucket.boxes,
        orders: bucket.orders,
        boxesPerMemberYtd,
        annualizedBoxesPerMember,
        elapsedMonths: elapsed,
        netSales: bucket.netSales,
        cogs: costCoverage >= 0.8 ? bucket.cogs : null,
        gm1:
          costCoverage >= 0.8 && bucket.netSales > 0
            ? (bucket.netSales - bucket.cogs) / bucket.netSales
            : null,
        costCoveragePct: costCoverage,
      };
    }
  }

  return {
    kpis_daily: [...months.values()]
      .sort((a, b) => a.period.localeCompare(b.period))
      .map(finalizeRow),
    revenue_share: [...channels.values()]
      .sort((a, b) =>
        (a.period + a.channel).localeCompare(b.period + b.channel)
      )
      .map(finalizeRow),
    yearly_unique_customers,
    channel_yearly_unique_customers,
    membership_observed,
  };
}

function sumRows(rows, filter = () => true) {
  const selected = rows.filter(filter);
  const out = {
    grossSales: 0,
    netSales: 0,
    cogs: 0,
    shippingIncome: 0,
    units: 0,
    orders: 0,
    costedUnits: 0,
    hasUsableCosts: false,
  };

  for (const row of selected) {
    out.grossSales += Number(row.gross_sales || 0);
    out.netSales += Number(row.net_sales || 0);
    out.shippingIncome += Number(row.shipping_income || 0);
    out.units += Number(row.nb_units || 0);
    out.orders += Number(row.nb_orders || 0);
    out.costedUnits += Number(row.costed_units || 0);
    if (row.cogs !== null && row.cogs !== undefined) {
      out.cogs += Number(row.cogs || 0);
    }
  }

  const coverage = out.units ? out.costedUnits / out.units : 0;
  out.hasUsableCosts = coverage >= 0.8 && out.costedUnits > 0;
  out.costCoveragePct = coverage;
  out.gm1 =
    out.hasUsableCosts && out.netSales > 0
      ? (out.netSales - out.cogs) / out.netSales
      : null;
  out.markupPct =
    out.hasUsableCosts && out.cogs > 0
      ? (out.netSales - out.cogs) / out.cogs
      : null;
  out.shippingRevenuePct =
    out.netSales > 0 ? out.shippingIncome / out.netSales : null;

  return out;
}

function inventorySnapshot(variants) {
  let inventoryCostValue = 0;
  let retailValue = 0;
  let costedInventoryUnits = 0;
  let inventoryUnits = 0;

  for (const variant of variants || []) {
    const qty = Math.max(0, Number(variant.inventoryQuantity || 0));
    const cost = money(variant.inventoryItem?.unitCost);
    const price = Number(variant.price || 0);

    inventoryUnits += qty;
    retailValue += qty * price;

    if (cost > 0) {
      inventoryCostValue += qty * cost;
      costedInventoryUnits += qty;
    }
  }

  return {
    inventoryUnits,
    costedInventoryUnits,
    costCoveragePct:
      inventoryUnits > 0 ? costedInventoryUnits / inventoryUnits : 0,
    inventoryCostValue,
    retailValue,
  };
}

function derivedMetrics(aggregate, variants, brand) {
  const totals = sumRows(aggregate.kpis_daily);
  const byChannel = {};

  for (const channel of [
    "e-commerce",
    "Concierge",
    "Wellington",
    "Legacy",
    "Drop ship",
    "Shopify Collective",
  ]) {
    byChannel[channel] = sumRows(
      aggregate.revenue_share,
      (row) => row.channel === channel
    );
  }

  const inv = inventorySnapshot(variants);
  const currentYear = new Date(`${END}T00:00:00Z`).getUTCFullYear();
  const currentYearRows = aggregate.kpis_daily.filter((row) =>
    String(row.period || "").startsWith(String(currentYear))
  );
  const currentYearSales = sumRows(currentYearRows);
  const elapsed = Math.max(1, elapsedMonthsForYear(currentYear));
  const annualizedCogs =
    currentYearSales.hasUsableCosts
      ? currentYearSales.cogs * (12 / elapsed)
      : null;

  const inventoryTurns =
    annualizedCogs !== null &&
    inv.inventoryCostValue > 0 &&
    inv.costCoveragePct >= 0.8
      ? annualizedCogs / inv.inventoryCostValue
      : null;

  return {
    brand,
    totals,
    channels: byChannel,
    inventory: {
      ...inv,
      annualizedCogs,
      inventoryTurns,
      methodology:
        "Annualized current-year COGS divided by current inventory cost value. Uses Shopify InventoryItem.unitCost when cost coverage is sufficient.",
    },
    cavali:
      brand === "cavali"
        ? {
            membershipObserved:
              aggregate.membership_observed[String(currentYear)] || {},
            methodology:
              "Observed unique purchasers by Signature/Premier product tier from Shopify orders. Boxes per Member / Year is annualized from YTD box units per observed member. This is an order-based fallback, not a subscription-contract status.",
          }
        : undefined,
  };
}

async function main() {
  const brands = {};

  for (const store of stores) {
    const [orderList, variants] = await Promise.all([
      fetchOrders(store),
      fetchVariants(store),
    ]);

    const aggregate = aggregateOrders(orderList, store.brand);
    const derived = derivedMetrics(aggregate, variants, store.brand);

    brands[store.brand] = {
      label: store.label,
      store: host(store.store),
      source: "shopify_admin_graphql",
      apiVersion: API_VERSION,
      orderCount: orderList.length,
      ...aggregate,
      derived,
      notes: [
        "Orders, sales, AOV, customer counts and channel splits come directly from Shopify Admin GraphQL.",
        "GM1 and realized markup use Shopify InventoryItem.unitCost only when at least 80% of sold units have product cost coverage.",
        "Inventory turns uses annualized current-year COGS divided by current inventory cost value when product cost coverage is sufficient.",
        "Cavali Signature/Premier member counts are observed unique purchasers by product tier when a dedicated subscription source is not connected.",
        "Cavali Boxes per Member / Year is annualized from YTD Shopify box units divided by observed members.",
        "Outbound shipping cost and packaging cost are not inferred from Shopify revenue/order data; retain QuickBooks/ShipStation/SKU source when available.",
      ],
    };

    console.log(
      `${store.label}: ${orderList.length} orders; ` +
        `GM1=${derived.totals.gm1 ?? "unavailable"}; ` +
        `markup=${derived.totals.markupPct ?? "unavailable"}; ` +
        `inventoryTurns=${derived.inventory.inventoryTurns ?? "unavailable"}`
    );
  }

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(
    "data/shopify_actuals.json",
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source: "github_actions_shopify_sync",
        date_range: { start: START, end: END },
        brands,
      },
      null,
      2
    )
  );

  console.log("Wrote data/shopify_actuals.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
