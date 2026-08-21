# v4.3 — GM1 / KPI / Section 4 correction

This build fixes the exact problems visible in the latest screenshots:

- 2026 GM1 for Ecommerce, Concierge, Wellington and Cavali no longer accepts a connected/manual `0` as a valid margin.
- 2026 GM1 is driven first by the selected month filter:
  - CORRO MONTH for Ecommerce / Concierge / Wellington.
  - CAVALI MONTH for Cavali.
- If the selected channel/month has usable COGS, GM1 = (Net Sales - COGS) / Net Sales.
- If channel cost coverage is incomplete, the model falls back to connected/derived GM1 and then to the documented planning baseline; it will not display a false 0%.
- Annual GP per Customer now uses the selected Corro-month Ecommerce AOV + purchase frequency + Ecommerce GM1, with safe fallbacks.
- Section 4 Realized Markup no longer accepts 0% as a valid connected result. If direct markup is unavailable it is derived from GM1: Markup = GM / (1 - GM).
- Inventory Turns no longer accepts 0.0x as a valid actual. It uses connected inventory turns when positive, otherwise the existing 1.36x planning baseline until inventory balance data is connected.
- Cavali Signature/Premier counts and boxes logic are preserved.
- Existing 2027–2029 GM1 progression stays 37% / 42% / 46% for Ecommerce.

Replace:
- index.html
- assets/js/app.js
- data/assumptions.json

You can keep the v4.2 versions of:
- assets/js/dataService.js
- assets/css/styles.css
- scripts/sync-smartrr-cavali.mjs
- .github/workflows/sync-actuals.yml

After upload:
1. Run Sync Actuals and Deploy to GitHub Pages.
2. Hard refresh with Ctrl+F5.
3. v4.3 uses a new localStorage key so stale v4.2 zero values do not override the fix.
