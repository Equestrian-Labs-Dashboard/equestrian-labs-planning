#!/usr/bin/env node
/**
 * Shopify actuals sync for Strategic Operating Model.
 *
 * This runs in GitHub Actions, where Shopify tokens are available as secrets.
 * It writes a safe, token-free JSON file for GitHub Pages:
 *   data/shopify_actuals.json
 *
 * Required repository secrets:
 *   SHOPIFY_CORRO_STORE
 *   SHOPIFY_CORRO_TOKEN
 *   SHOPIFY_CAVALI_STORE
 *   SHOPIFY_CAVALI_TOKEN
 */

import fs from "node:fs/promises";
import path from "node:path";

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-07";
const START_DATE = process.env.SHOPIFY_SYNC_START_DATE || "2024-01-01";
const END_DATE = process.env.SHOPIFY_SYNC_END_DATE || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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

function normalizeStore(store) {
  return String(store || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function money(node) {
  return Number(node?.shopMoney?.amount || 0);
}

function monthKey(dateString) {
  return String(dateString || "").slice(0, 7);
}

function monthStart(period) {
  return `${period}-01`;
}

function monthEnd(period) {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function emptyAgg(period) {
  return {
    period,
    period_start: monthStart(period),
    period_end: monthEnd(period),
    gross_sales: 0,
    net_sales: 0,
    gross_profit: "",
    total_discounts: 0,
    total_returns: 0,
    cogs: "",
    shipping_income: 0,
    taxes: 0,
    nb_orders: 0,
    nb_units: 0,
    customers: new Set(),
    updated_at: new Date().toISOString(),
    source: "shopify_admin_graphql",
  };
}

const ORDERS_QUERY = `
query OrdersForActuals($cursor: String, $query: String!) {
  orders(first: 100, after: $cursor, query: $query, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      name
      createdAt
      cancelledAt
      totalShippingPriceSet { shopMoney { amount currencyCode } }
      currentTotalTaxSet { shopMoney { amount currencyCode } }
      customer { id }
      lineItems(first: 250) {
        nodes {
          quantity
          originalUnitPriceSet { shopMoney { amount currencyCode } }
          discountedTotalSet { shopMoney { amount currencyCode } }
        }
      }
    }
  }
}`;

async function graphql(store, token, query, variables) {
  const endpoint = `https://${normalizeStore(store)}/admin/api/${API_VERSION}/graphql.json`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    const detail = JSON.stringify(json.errors || json, null, 2).slice(0, 2000);
    throw new Error(`Shopify GraphQL failed for ${store}: HTTP ${res.status}. ${detail}`);
  }
  return json.data;
}

async function fetchOrdersForStore(storeConfig) {
  const { store, token, label } = storeConfig;
  if (!store || !token) {
    console.warn(`Skipping ${label}: missing store/token secret.`);
    return [];
  }

  const query = `created_at:>=${START_DATE} created_at:<${END_DATE}`;
  let cursor = null;
  let orders = [];
  let page = 0;

  do {
    page += 1;
    const data = await graphql(store, token, ORDERS_QUERY, { cursor, query });
    const conn = data.orders;
    orders.push(...(conn.nodes || []));
    cursor = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
    console.log(`${label}: fetched page ${page}, total orders ${orders.length}`);
  } while (cursor);

  return orders;
}

function aggregateOrders(orders) {
  const byMonth = new Map();

  for (const order of orders) {
    if (order.cancelledAt) continue;

    const period = monthKey(order.createdAt);
    if (!period) continue;

    const agg = byMonth.get(period) || emptyAgg(period);
    const lineItems = order.lineItems?.nodes || [];

    let gross = 0;
    let net = 0;
    let units = 0;

    for (const line of lineItems) {
      const qty = Number(line.quantity || 0);
      const originalUnit = money(line.originalUnitPriceSet);
      const discountedTotal = money(line.discountedTotalSet);
      gross += originalUnit * qty;
      net += discountedTotal;
      units += qty;
    }

    const discount = Math.max(0, gross - net);
    const shipping = money(order.totalShippingPriceSet);
    const taxes = money(order.currentTotalTaxSet);

    agg.gross_sales += gross;
    agg.net_sales += net;
    agg.total_discounts += discount;
    agg.shipping_income += shipping;
    agg.taxes += taxes;
    agg.nb_orders += 1;
    agg.nb_units += units;
    if (order.customer?.id) agg.customers.add(order.customer.id);

    byMonth.set(period, agg);
  }

  return [...byMonth.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((r) => {
      const uniqueCustomers = r.customers.size;
      const row = {
        updated_at: r.updated_at,
        period: r.period,
        period_start: r.period_start,
        period_end: r.period_end,
        gross_sales: round2(r.gross_sales),
        net_sales: round2(r.net_sales),
        gross_profit: r.gross_profit,
        total_discounts: round2(r.total_discounts),
        total_returns: round2(r.total_returns),
        cogs: r.cogs,
        pct_discount: r.gross_sales ? round2((r.total_discounts / r.gross_sales) * 100) : 0,
        pct_returns: 0,
        pct_gm: "",
        nb_orders: r.nb_orders,
        nb_units: r.nb_units,
        aov: r.nb_orders ? round2(r.gross_sales / r.nb_orders) : 0,
        unique_customers: uniqueCustomers,
        shipping_income: round2(r.shipping_income),
        taxes: round2(r.taxes),
        source: r.source,
      };
      return row;
    });
}

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function totals(rows) {
  return rows.reduce((acc, r) => {
    acc.gross_sales += Number(r.gross_sales || 0);
    acc.net_sales += Number(r.net_sales || 0);
    acc.total_discounts += Number(r.total_discounts || 0);
    acc.total_returns += Number(r.total_returns || 0);
    acc.shipping_income += Number(r.shipping_income || 0);
    acc.nb_orders += Number(r.nb_orders || 0);
    acc.nb_units += Number(r.nb_units || 0);
    return acc;
  }, { gross_sales: 0, net_sales: 0, total_discounts: 0, total_returns: 0, shipping_income: 0, nb_orders: 0, nb_units: 0 });
}

async function main() {
  const brands = {};

  for (const storeConfig of stores) {
    const orders = await fetchOrdersForStore(storeConfig);
    const kpisDaily = aggregateOrders(orders);
    brands[storeConfig.brand] = {
      label: storeConfig.label,
      store: normalizeStore(storeConfig.store),
      source: "shopify_admin_graphql",
      apiVersion: API_VERSION,
      orderCount: orders.length,
      kpis_daily: kpisDaily,
      totals: totals(kpisDaily),
      notes: [
        "Shopify sync provides sales/orders/AOV/discounts/shipping/taxes.",
        "COGS/GM1 are not overwritten here unless a product-cost pipeline is added.",
        "Inventory turns should continue coming from SKU/Savy or product-cost inventory source.",
        "QuickBooks/ShipStation remain the preferred source for cash timing, shipping cost, packaging, and OPEX."
      ],
    };
  }

  const output = {
    generated_at: new Date().toISOString(),
    source: "github_actions_shopify_sync",
    apiVersion: API_VERSION,
    date_range: { start: START_DATE, end: END_DATE },
    brands,
  };

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(path.join("data", "shopify_actuals.json"), JSON.stringify(output, null, 2));
  console.log("Wrote data/shopify_actuals.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
