# Strategic Operating Model v4.2 — Full Core Replacement

This package removes the external Ceci hotfix chain and puts the corrections directly in `assets/js/app.js`.

## Replace these files
- `index.html`
- `assets/js/app.js`
- `assets/js/dataService.js`
- `assets/css/styles.css`
- `data/assumptions.json`
- `scripts/sync-smartrr-cavali.mjs`
- `.github/workflows/sync-actuals.yml`

## KEEP these working repository files
Do not delete or replace your current:
- `scripts/sync-shopify-actuals.mjs`
- `scripts/sync-connected-data.mjs`
- `data/shopify_actuals.json`
- `data/connected_actuals.json`
- `data/cavali_smartrr_actuals.json` (workflow will refresh it)
- any secrets in GitHub Settings

## DELETE / stop loading old UI hotfixes
They are no longer required:
- `assets/js/ceci-final-hotfix-v2.17.js`
- `assets/js/ceci-model-review-2026-08-21-v4.1.js`
- `assets/js/ceci-v2151-hotfix.js`
- `assets/js/section4-visual-fix.js`
- `assets/css/section4-visual-fix.css`

The new `index.html` loads only `dataService.js` + `app.js`.

## Key fixes
- 2026 actuals take precedence over stale saved/manual zero values.
- Ecommerce, Concierge, Wellington and Cavali GM1 no longer display false 0%.
- Corro GM1 uses validated actuals when available; when cost coverage is insufficient it uses the documented planning fallback instead of claiming a false actual.
- Cavali tiers are Signature / Premier.
- Cavali long Boxes/Member/Year decimals are displayed to one decimal.
- If Smartrr statuses cannot be classified by tier, false zero tier counts are not used; the UI falls back to Shopify observed tier counts.
- 2027/2028/2029 Ecommerce GM1 defaults = 37% / 42% / 46%, inside Ceci's requested 36–38 / 41–43 / 45–47 bands.
- COGS = Net Sales - GP1; funding inventory stays in Cash Flow only.
- Annual GP per Customer = Ecommerce AOV × Purchase Frequency × Ecommerce GM1.
- Paid Ads funding logic, Dover fixed $130M, Display Year, Board linkage and Cash Runway retained.
- Header sticky + responsive; wide tables scroll only when needed.

## After upload
1. Run `Actions → Sync Actuals and Deploy to GitHub Pages`.
2. Hard refresh the published site (`Ctrl + F5`).
3. If your browser has old saved model state, switch Model Status once or clear the site's localStorage. v4.2 uses a new localStorage key, so old v3 values should not override the corrected defaults.
4. Open Tab 6 Formula QA and confirm PASS.
5. In console you can run `runModelQA()`.
