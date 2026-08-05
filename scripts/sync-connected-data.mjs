#!/usr/bin/env node
/**
 * Secure Google Sheets sync for GitHub Pages.
 * Reads private sheets with the GOOGLE_CREDENTIALS service account and writes
 * a token-free data/connected_actuals.json consumed by the browser.
 */
import fs from "node:fs/promises";
import crypto from "node:crypto";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const credentials = JSON.parse(required("GOOGLE_CREDENTIALS"));
const sheetIds = {
  corro: required("SHEET_ID_CORRO"),
  cavali: required("SHEET_ID_CAVALI"),
};

const tabs = {
  corro: ["kpis_daily", "revenue_share", "ad_spend", "new_vs_returning", "products_q1_2026"],
  cavali: ["kpis_daily", "revenue_share", "ad_spend", "new_vs_returning", "smartrr_product_volume", "smartrr_subscribers", "products_q1_2026"],
};

function base64url(value) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: credentials.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), credentials.private_key);
  const assertion = `${unsigned}.${base64url(signature)}`;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const response = await fetch(credentials.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await response.json();
  if (!response.ok || !json.access_token) throw new Error(`Google token error: ${JSON.stringify(json).slice(0, 1000)}`);
  return json.access_token;
}

function rowsToObjects(values = []) {
  if (!values.length) return [];
  const headers = values[0].map(v => String(v ?? "").trim());
  return values.slice(1).filter(row => row.some(v => String(v ?? "").trim() !== "")).map(row => {
    const out = {};
    headers.forEach((header, index) => { if (header) out[header] = row[index] ?? ""; });
    return out;
  });
}

async function readTab(token, spreadsheetId, tab) {
  const range = encodeURIComponent(`'${tab}'`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?majorDimension=ROWS`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 400 || response.status === 404) {
    console.warn(`Optional tab unavailable: ${tab}`);
    return [];
  }
  const json = await response.json();
  if (!response.ok) throw new Error(`Google Sheets ${tab}: HTTP ${response.status} ${JSON.stringify(json).slice(0, 1000)}`);
  return rowsToObjects(json.values || []);
}

async function main() {
  const token = await accessToken();
  const brands = {};
  for (const brand of Object.keys(sheetIds)) {
    brands[brand] = {};
    for (const tab of tabs[brand]) {
      brands[brand][tab] = await readTab(token, sheetIds[brand], tab);
      console.log(`${brand}/${tab}: ${brands[brand][tab].length} rows`);
    }
  }
  const output = { generated_at: new Date().toISOString(), source: "google_sheets_service_account", brands };
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile("data/connected_actuals.json", JSON.stringify(output, null, 2));
  console.log("Wrote data/connected_actuals.json");
}

main().catch(error => { console.error(error); process.exit(1); });
