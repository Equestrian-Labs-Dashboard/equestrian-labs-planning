#!/usr/bin/env node
import fs from "node:fs/promises";
import crypto from "node:crypto";

const ids = {
  ads: process.env.ADS_SHEET_ID,
  corro: process.env.SHEET_ID_CORRO,
  cavali: process.env.SHEET_ID_CAVALI,
};

let creds = {};
try {
  creds = JSON.parse(process.env.GOOGLE_CREDENTIALS || "{}");
} catch {
  creds = {};
}

function b64(value) {
  return Buffer.from(
    typeof value === "string" ? value : JSON.stringify(value)
  ).toString("base64url");
}

async function googleToken() {
  if (!creds.client_email || !creds.private_key) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const input = `${b64(header)}.${b64(payload)}`;
  const signature = crypto.sign(
    "RSA-SHA256",
    Buffer.from(input),
    creds.private_key
  );
  const assertion = `${input}.${signature.toString("base64url")}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    console.warn("Google auth unavailable:", json);
    return null;
  }

  return json.access_token;
}

async function spreadsheet(id, token) {
  if (!id || !token) return [];

  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${id}?includeGridData=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await response.json();

    if (!response.ok) {
      console.warn(`Google Sheet ${id} unavailable:`, json.error || json);
      return [];
    }

    return json.sheets || [];
  } catch (error) {
    console.warn(`Google Sheet ${id} read failed: ${error.message}`);
    return [];
  }
}

function cell(value) {
  return (
    value?.formattedValue ??
    value?.effectiveValue?.numberValue ??
    value?.effectiveValue?.stringValue ??
    ""
  );
}

function rows(sheets) {
  const output = [];

  for (const sheet of sheets || []) {
    for (const grid of sheet.data || []) {
      for (const row of grid.rowData || []) {
        output.push((row.values || []).map(cell));
      }
    }
  }

  return output;
}

const norm = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

function parseMetricValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const cleaned = raw.replace(/[$,%x,]/g, "");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) return null;
  return raw.includes("%") ? parsed / 100 : parsed;
}

function findMetric(tableRows, patterns) {
  for (const row of tableRows || []) {
    const joined = norm(row.join(" | "));

    if (!patterns.some((pattern) => joined.includes(norm(pattern)))) {
      continue;
    }

    for (let index = row.length - 1; index >= 0; index -= 1) {
      const parsed = parseMetricValue(row[index]);
      if (parsed !== null) return parsed;
    }
  }

  return null;
}

async function readJson(path, fallback = {}) {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

function finite(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function firstValue(...values) {
  for (const value of values) {
    const parsed = finite(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function get(obj, path) {
  let value = obj;
  for (const key of path.split(".")) value = value?.[key];
  return value;
}

function shopBrand(shopify, brand) {
  return shopify?.brands?.[brand] || {};
}

function derived(shopify, brand, path, fallback = null) {
  return get(shopBrand(shopify, brand)?.derived || {}, path) ?? fallback;
}

function currentMembership(shopify, tier, key) {
  const source = derived(
    shopify,
    "cavali",
    `cavali.membershipObserved.${tier}.${key}`,
    null
  );
  return finite(source);
}

function percentOrNull(value) {
  const parsed = finite(value);
  if (parsed === null) return null;
  return parsed > 1 ? parsed / 100 : parsed;
}

async function main() {
  const previous = await readJson("data/connected_actuals.json", {});
  const shopify = await readJson("data/shopify_actuals.json", {
    brands: {},
  });

  const token = await googleToken();

  const [adsSheets, corroSheets, cavaliSheets] = await Promise.all([
    spreadsheet(ids.ads, token),
    spreadsheet(ids.corro, token),
    spreadsheet(ids.cavali, token),
  ]);

  const adRows = rows(adsSheets);
  const corroRows = rows(corroSheets);
  const cavaliRows = rows(cavaliSheets);

  const sheet = {
    marketing: {
      corro: {
        adSpend: findMetric(adRows, [
          "ad spend",
          "marketing spend",
          "google ads",
          "meta ads",
          "ads / stats",
        ]),
        attributedPurchases: findMetric(adRows, [
          "attributed purchases",
          "new customers",
          "acquired customers",
        ]),
      },
      cavali: {
        adSpend: findMetric(cavaliRows, [
          "ad spend",
          "marketing spend",
          "cavali ads",
        ]),
        attributedPurchases: findMetric(cavaliRows, [
          "attributed purchases",
          "new members",
          "acquired members",
        ]),
      },
    },
    financial: {
      corro: {
        gm1: findMetric(corroRows, [
          "gm1",
          "gross margin 1",
          "gross margin",
        ]),
        markupPct: findMetric(corroRows, ["markup"]),
        inventoryTurns: findMetric(corroRows, [
          "inventory turns",
          "inventory turnover",
        ]),
        outboundShippingPct: findMetric(corroRows, [
          "outbound shipping",
          "shipping cost %",
          "shipping cost percent",
        ]),
        shippingRevenuePct: findMetric(corroRows, [
          "shipping revenue",
          "shipping income %",
        ]),
        packagingPct: findMetric(corroRows, [
          "packaging cost",
          "packaging %",
        ]),
        conciergeGm1: findMetric(corroRows, [
          "concierge gm1",
          "concierge gm",
          "concierge gross margin",
        ]),
        wellingtonGm1: findMetric(corroRows, [
          "wellington gm1",
          "wellington gm",
          "wellington gross margin",
        ]),
      },
      cavali: {
        gm1: findMetric(cavaliRows, [
          "gm1",
          "gross margin 1",
          "gross margin",
        ]),
        markupPct: findMetric(cavaliRows, ["markup"]),
        inventoryTurns: findMetric(cavaliRows, [
          "inventory turns",
          "inventory turnover",
        ]),
      },
    },
    retention: {
      returningRevenue: findMetric(corroRows, [
        "returning revenue",
        "recurrent revenue",
      ]),
      totalCustomerRevenue: findMetric(corroRows, [
        "total customer revenue",
      ]),
      returningCustomersPct: findMetric(corroRows, [
        "returning customers",
      ]),
      purchaseFrequency: findMetric(corroRows, [
        "purchase frequency",
      ]),
    },
    cavali: {
      signatureMembers: findMetric(cavaliRows, [
        "signature active members",
        "signature members",
      ]),
      signatureBoxesPerMemberYear: findMetric(cavaliRows, [
        "signature boxes per member",
        "signature boxes per year",
      ]),
      premierMembers: findMetric(cavaliRows, [
        "premier active members",
        "premium active members",
        "premier members",
        "premium members",
      ]),
      premierBoxesPerMemberYear: findMetric(cavaliRows, [
        "premier boxes per member",
        "premium boxes per member",
        "premier boxes per year",
        "premium boxes per year",
      ]),
    },
  };

  const shopCorroGm1 = percentOrNull(
    derived(shopify, "corro", "totals.gm1", null)
  );
  const shopCorroMarkup = percentOrNull(
    derived(shopify, "corro", "totals.markupPct", null)
  );
  const shopCorroTurns = finite(
    derived(shopify, "corro", "inventory.inventoryTurns", null)
  );

  const shopConciergeGm1 = percentOrNull(
    derived(shopify, "corro", "channels.Concierge.gm1", null)
  );
  const shopWellingtonGm1 = percentOrNull(
    derived(shopify, "corro", "channels.Wellington.gm1", null)
  );

  const shopShippingRevenuePct = percentOrNull(
    derived(shopify, "corro", "totals.shippingRevenuePct", null)
  );

  const shopCavaliGm1 = percentOrNull(
    derived(shopify, "cavali", "totals.gm1", null)
  );
  const shopCavaliMarkup = percentOrNull(
    derived(shopify, "cavali", "totals.markupPct", null)
  );
  const shopCavaliTurns = finite(
    derived(shopify, "cavali", "inventory.inventoryTurns", null)
  );

  /*
   * Important preservation rule:
   * Never overwrite an existing validated actual with null just because a
   * Google Sheet is temporarily unavailable.
   *
   * Source priority:
   *   Google Sheet explicit metric
   *   -> Shopify-derived metric
   *   -> previous connected_actuals value
   *   -> documented fallback only where one already existed in the model
   */
  const output = {
    generated_at: new Date().toISOString(),
    source: "connected_actuals_with_shopify_fallback",
    marketing: {
      corro: {
        adSpend: firstValue(
          sheet.marketing.corro.adSpend,
          previous?.marketing?.corro?.adSpend
        ),
        attributedPurchases: firstValue(
          sheet.marketing.corro.attributedPurchases,
          previous?.marketing?.corro?.attributedPurchases
        ),
      },
      cavali: {
        adSpend: firstValue(
          sheet.marketing.cavali.adSpend,
          previous?.marketing?.cavali?.adSpend
        ),
        attributedPurchases: firstValue(
          sheet.marketing.cavali.attributedPurchases,
          previous?.marketing?.cavali?.attributedPurchases
        ),
      },
    },
    financial: {
      corro: {
        gm1: firstValue(
          sheet.financial.corro.gm1,
          shopCorroGm1,
          previous?.financial?.corro?.gm1
        ),
        markupPct: firstValue(
          sheet.financial.corro.markupPct,
          shopCorroMarkup,
          previous?.financial?.corro?.markupPct
        ),
        inventoryTurns: firstValue(
          sheet.financial.corro.inventoryTurns,
          shopCorroTurns,
          previous?.financial?.corro?.inventoryTurns,
          0.17
        ),
        outboundShippingPct: firstValue(
          sheet.financial.corro.outboundShippingPct,
          previous?.financial?.corro?.outboundShippingPct
        ),
        shippingRevenuePct: firstValue(
          sheet.financial.corro.shippingRevenuePct,
          shopShippingRevenuePct,
          previous?.financial?.corro?.shippingRevenuePct
        ),
        packagingPct: firstValue(
          sheet.financial.corro.packagingPct,
          previous?.financial?.corro?.packagingPct
        ),
        conciergeGm1: firstValue(
          sheet.financial.corro.conciergeGm1,
          shopConciergeGm1,
          previous?.financial?.corro?.conciergeGm1
        ),
        wellingtonGm1: firstValue(
          sheet.financial.corro.wellingtonGm1,
          shopWellingtonGm1,
          previous?.financial?.corro?.wellingtonGm1
        ),
      },
      cavali: {
        gm1: firstValue(
          sheet.financial.cavali.gm1,
          shopCavaliGm1,
          previous?.financial?.cavali?.gm1,
          0.397
        ),
        markupPct: firstValue(
          sheet.financial.cavali.markupPct,
          shopCavaliMarkup,
          previous?.financial?.cavali?.markupPct
        ),
        inventoryTurns: firstValue(
          sheet.financial.cavali.inventoryTurns,
          shopCavaliTurns,
          previous?.financial?.cavali?.inventoryTurns
        ),
      },
    },
    retention: {
      returningRevenue: firstValue(
        sheet.retention.returningRevenue,
        previous?.retention?.returningRevenue
      ),
      totalCustomerRevenue: firstValue(
        sheet.retention.totalCustomerRevenue,
        previous?.retention?.totalCustomerRevenue
      ),
      returningCustomersPct: firstValue(
        sheet.retention.returningCustomersPct,
        previous?.retention?.returningCustomersPct
      ),
      purchaseFrequency: firstValue(
        sheet.retention.purchaseFrequency,
        previous?.retention?.purchaseFrequency
      ),
    },
    cavali: {
      signatureMembers: firstValue(
        sheet.cavali.signatureMembers,
        currentMembership(shopify, "signature", "observedMembers"),
        previous?.cavali?.signatureMembers
      ),
      signatureBoxesPerMemberYear: firstValue(
        sheet.cavali.signatureBoxesPerMemberYear,
        currentMembership(
          shopify,
          "signature",
          "annualizedBoxesPerMember"
        ),
        previous?.cavali?.signatureBoxesPerMemberYear
      ),
      premierMembers: firstValue(
        sheet.cavali.premierMembers,
        currentMembership(shopify, "premier", "observedMembers"),
        previous?.cavali?.premierMembers
      ),
      premierBoxesPerMemberYear: firstValue(
        sheet.cavali.premierBoxesPerMemberYear,
        currentMembership(
          shopify,
          "premier",
          "annualizedBoxesPerMember"
        ),
        previous?.cavali?.premierBoxesPerMemberYear
      ),
    },
    source_map: {
      financial: {
        corro: {
          gm1:
            sheet.financial.corro.gm1 !== null
              ? "google_sheet"
              : shopCorroGm1 !== null
              ? "shopify_product_cost"
              : "previous_or_unavailable",
          markupPct:
            sheet.financial.corro.markupPct !== null
              ? "google_sheet"
              : shopCorroMarkup !== null
              ? "shopify_realized_markup"
              : "previous_or_unavailable",
          inventoryTurns:
            sheet.financial.corro.inventoryTurns !== null
              ? "google_sheet"
              : shopCorroTurns !== null
              ? "shopify_cogs_inventory"
              : "documented_skusavvy_fallback_0.17",
          conciergeGm1:
            sheet.financial.corro.conciergeGm1 !== null
              ? "google_sheet"
              : shopConciergeGm1 !== null
              ? "shopify_product_cost_channel"
              : "previous_or_unavailable",
          wellingtonGm1:
            sheet.financial.corro.wellingtonGm1 !== null
              ? "google_sheet"
              : shopWellingtonGm1 !== null
              ? "shopify_product_cost_channel"
              : "previous_or_unavailable",
        },
        cavali: {
          gm1:
            sheet.financial.cavali.gm1 !== null
              ? "google_sheet"
              : shopCavaliGm1 !== null
              ? "shopify_product_cost"
              : "ceci_review_fallback_39.7",
        },
      },
      cavali: {
        members:
          sheet.cavali.signatureMembers !== null ||
          sheet.cavali.premierMembers !== null
            ? "google_sheet"
            : "shopify_observed_tier_customers",
        boxesPerMemberYear:
          sheet.cavali.signatureBoxesPerMemberYear !== null ||
          sheet.cavali.premierBoxesPerMemberYear !== null
            ? "google_sheet"
            : "shopify_order_units_annualized",
      },
    },
  };

  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(
    "data/connected_actuals.json",
    JSON.stringify(output, null, 2)
  );

  console.log("Wrote data/connected_actuals.json");
  console.log(
    "Resolved current actuals:",
    JSON.stringify(
      {
        corroGM1: output.financial.corro.gm1,
        conciergeGM1: output.financial.corro.conciergeGm1,
        wellingtonGM1: output.financial.corro.wellingtonGm1,
        markup: output.financial.corro.markupPct,
        inventoryTurns: output.financial.corro.inventoryTurns,
        cavaliGM1: output.financial.cavali.gm1,
        signatureMembers: output.cavali.signatureMembers,
        signatureBoxesPerMemberYear:
          output.cavali.signatureBoxesPerMemberYear,
        premierMembers: output.cavali.premierMembers,
        premierBoxesPerMemberYear:
          output.cavali.premierBoxesPerMemberYear,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
