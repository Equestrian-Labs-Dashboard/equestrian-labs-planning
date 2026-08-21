# Strategic Operating Model — Ceci meeting consolidation v4.1

## Replace temporary patches

Keep:
- `assets/js/app.js`
- `assets/js/ceci-final-hotfix-v2.17.js`

Remove from `index.html` if present:
- `restore-2026-gm1-markup-v3.8.js`
- `fix-actuals-cavali-annualgp-v3.9.js`
- `smooth-gm1-cogs-v4.0.js`

Add:
- `assets/js/ceci-model-review-2026-08-21-v4.1.js`

Recommended load order:

```html
<script src="assets/js/app.js"></script>
<script src="assets/js/ceci-final-hotfix-v2.17.js?v=217"></script>
<script src="assets/js/ceci-model-review-2026-08-21-v4.1.js?v=41"></script>
```

## Applied model changes

1. 2026 GM1 actuals are preserved from connected source; missing source values do not become fake `0%`.
2. Cavali Signature / Premier Active Members come from Smartrr.
3. Cavali Boxes / Member / Year are rounded to one decimal for display.
4. Premier wording is normalized.
5. Markup 2026 uses connected actual when available.
6. GM1 forecast is gradual:
   - 2027 monthly 36% -> 38%; annual model midpoint 37%.
   - 2028 monthly 41% -> 43%; annual model midpoint 42%.
   - 2029 monthly 45% -> 47%; annual model midpoint 46%.
7. 2026 FCS uses actual YTD GM1 and only begins improving when the funding date arrives.
8. Financial COGS = Net Sales × (1 - GM1).
9. Inventory funding remains a Cash Flow / working-capital item; it is not spread into P&L COGS.
10. GP1 -> GP2 -> GP3 cascade is recalculated from the corrected margin.
11. Annual GP per Customer is restored from AOV × Purchase Frequency × Ecommerce GM1.

## Explicitly not changed
- Paid Ads ramp
- Base Ads
- ROAS
- Dover
- Carryover
- Private Label
- Shipping assumptions
- Cash Flow timing
- scenario save/publish logic

## QA
After GitHub Actions deploy:
1. Hard refresh (`Ctrl + F5`)
2. Click `Refresh Actuals`
3. Run in DevTools:

```js
runCeci20260821ModelQA()
```

Check that:
- Ecommerce current GM1 is not 0%.
- Cavali current GM1 is not 0%.
- Signature/Premier Active Members are populated when Smartrr data exists.
- Boxes/Member/Year show one decimal.
- 2027 / 2028 / 2029 financial GM1 follows 37% / 42% / 46% unless a saved value inside the approved range is present.
- COGS = Net Sales - GP1.
- Inventory funding does not appear inside P&L COGS.
