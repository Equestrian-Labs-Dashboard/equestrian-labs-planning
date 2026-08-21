# v3.7 — Cavali + Purchasing correction

## Cavali
- Adds optional Smartrr current subscriber sync using `SMARTRR_API_KEY_CAVALI`.
- Signature/Premier active members come from Smartrr when available.
- Boxes per Member / Year uses Smartrr plan cadence when identifiable; otherwise Shopify YTD box volume annualized.
- Cavali GM1 priority: connected actual -> Shopify product-cost actual -> Ceci-reviewed 39.7% fallback.
- Existing Signature/Premier forecast years remain editable and saved.
- Cavali Ad Spend is NOT inferred from Shopify or Smartrr.

## Purchasing Strategy
- Actual Markup priority: connected actual -> Shopify realized markup from sold product costs.
- Inventory Turns priority: connected actual -> annualized Shopify COGS/current inventory cost -> existing 0.17x planning reference.
- Section 4 redesigned into Actual KPI cards, Commercial Terms table, Vendor Payment Mix and Source Logic.
- Future inputs remain editable and scenario-persistent.

## Required/optional secret
To get true Smartrr active member totals in this repository, add the same Cavali Smartrr key used by the other reporting project as:

`SMARTRR_API_KEY_CAVALI`

GitHub -> Settings -> Secrets and variables -> Actions.

The workflow still runs if this secret is absent; it falls back to Shopify observed tier purchasers instead of writing fake zeroes.

## Run
Actions -> Sync Actuals and Deploy to GitHub Pages -> Run workflow.
