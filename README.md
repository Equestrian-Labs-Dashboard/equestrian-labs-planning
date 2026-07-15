# Strategic Operating Model v2.6

## What changed in v2.6

This version implements the latest Page 1 / Page 2 formula corrections:

- Base Ecommerce naming is unified as **Base Ecommerce**.
- Dover Market Opportunity remains editable and feeds all forecast years.
- Dover Capture applies across all years.
- Ecommerce Revenue Build remains **Gross Sales only**.
- Growth Engine Portfolio remains **Gross Sales only**.
- Margin Bridge handles the Gross → Net → GP1 → GP2 → GP3 conversion.
- Ad Spend now scales correctly when it is defined as a percent of Ecommerce Gross Sales.
- 2026–2028 Total Ad Spend is calculated from **Target Ad Spend % of Ecommerce Gross Sales**.
- 2029 Total Ad Spend remains editable as management reinvestment.
- Paid Growth Revenue is solved using the circular formula so the model does not understate paid growth.

## Ad Spend formula

For 2026–2028:

```text
Pre-Paid Ecommerce Revenue = Base Ecommerce Revenue + Organic Growth Revenue + Net Dover Capture
Ecommerce Gross Sales = Pre-Paid Ecommerce Revenue / (1 - Target Ad Spend % × ROAS)
Total Ad Spend = Ecommerce Gross Sales × Target Ad Spend %
Paid Growth Revenue = Total Ad Spend × ROAS
```

For 2029:

```text
Total Ad Spend = editable management reinvestment
Paid Growth Revenue = Total Ad Spend × ROAS
```

## Deploy

Replace the repository contents with this ZIP, commit, push, wait for GitHub Pages to deploy, then hard refresh the browser with Ctrl + Shift + R.

The app uses cache-busting query params `?v=22` and localStorage key `som_assumptions_v22`.
