# Strategic Operating Model v2.15.1 — internally validated hotfix

Load this AFTER the existing `assets/js/app.js`.

```html
<script src="assets/js/app.js?v=214"></script>
<script src="assets/js/ceci-v2151-hotfix.js?v=2151"></script>
```

## Fixes validated
- Display Year drives Tab 3 KPI cards.
- Display Year drives Tab 3 Operating KPIs (removes y2026 hardcode).
- Display Year change re-renders Tabs 2/3/4/5.
- Display Year is persisted using the existing save path.
- 2026 Organic Growth output = 0.
- 2026 growth assumption drives 2027; 2027 drives 2028; 2028 drives 2029.
- Dover Market Opportunity = $130M for all forecast years.
- Existing app.js, scenario data, Draft/Budget/Forecast/Board, Shopify sync and cash-flow formulas are not replaced.

## Browser QA
After deployment:
1. Hard refresh.
2. Select Display Year 2027.
3. Tab 3 KPI cards must say Forecast 2027.
4. Tab 3 EBITDA card must equal P&L 2027 EBITDA.
5. Operating KPIs must show 2027 Orders/New Customers/ROAS/Ad Spend.
6. Tab 2 must use 2027 selected-year financial outputs and non-zero Organic Growth when the prior-year assumption is > 0.
7. Dover Market Opportunity must remain $130M.
8. Change to 2028, save, refresh browser, and confirm 2028 remains selected.
