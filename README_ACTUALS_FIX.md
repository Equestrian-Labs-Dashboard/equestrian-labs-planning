# Strategic Operating Model — Actuals Source Fix v3.6

This fix addresses the current `Data unavailable` regressions without replacing the working browser model.

## Replace only

- `scripts/sync-shopify-actuals.mjs`
- `scripts/sync-connected-data.mjs`

Do not replace `assets/js/app.js`, `styles.css`, assumptions, saved scenarios, or the current JSON files manually.

## What is fixed

### Growth Engines
- Ecommerce GM1 can now be calculated from Shopify product cost when cost coverage is sufficient.
- Concierge GM1 can be calculated from Shopify product cost for Concierge-classified orders.
- Wellington GM1 can be calculated from Shopify product cost for Wellington-classified orders.
- Cavali GM1 can be calculated from Shopify product cost.
- Existing validated Google Sheet values still have priority.

### Cavali
When a dedicated membership source is unavailable, the Shopify sync derives:
- Signature observed members
- Signature annualized boxes per member / year
- Premier observed members
- Premier annualized boxes per member / year

The product tier is detected from product title, vendor, tags, or SKU using `Signature`, `Premier`, or legacy `Premium` wording.

This is an order-history fallback. It does not claim to be Smartrr/Subscription Contract status.

### Purchasing Strategy
- Markup % (on Cost): from explicit Google Sheet value first, otherwise realized Shopify markup `(Net Sales - COGS) / COGS`.
- Inventory Turns: explicit connected value first, otherwise annualized Shopify COGS / current inventory cost value.
- If neither source is usable, the previously documented SKU/Savvy fallback `0.17x` is retained instead of showing blank.

### Preservation rule
The connected sync no longer overwrites a previously valid metric with `null` when Google Sheets is temporarily unavailable.

Priority:
1. Explicit Google Sheet metric
2. Shopify-derived metric
3. Previous connected actual
4. Documented fallback where already approved

## Shopify permission note

For Shopify-derived GM1 / markup / inventory turns, the token must be able to read `InventoryItem.unitCost`.
Shopify documents that `unitCost` requires product/inventory read access and "View product costs" permission.

If cost permissions are missing, sales/orders still refresh and existing/previous GM1 is preserved.

## After upload

Run:

`Actions → Sync Actuals and Deploy to GitHub Pages → Run workflow`

Then inspect the log. It now prints:
- Corro GM1
- Concierge GM1
- Wellington GM1
- Corro markup
- Inventory turns
- Cavali GM1
- Signature members / boxes per member
- Premier members / boxes per member

Finally hard-refresh the dashboard with `Ctrl + F5`.
