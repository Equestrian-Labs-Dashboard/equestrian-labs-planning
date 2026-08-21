# v4.5 — YTD cutoff + Cavali revenue reliability

Key corrections from Ceci 21-Aug-2026:

1. CORRO ACTUALS THROUGH and CAVALI ACTUALS THROUGH are cutoff dates. Selecting Jun means Jan-Jun YTD, never June alone.
2. 2026 FCS uses actuals through the cutoff plus forecast logic for the remaining year.
3. Concierge/Wellington 2026 sales are annualized from YTD run-rate for the closing forecast; their displayed current drivers remain YTD.
4. Cavali revenue remains Members × Boxes per Member / Year × Price, with NO separate Cavali Ads/ROAS revenue.
5. Smartrr tier counts are trusted only when Signature+Premier classify at least 80% of active subscriptions. Partial classification falls back to Shopify observed tiers, preventing the ~$23k understatement caused by using only a small classified subset.
6. GM1, Markup, Shipping/Packaging, GP2/GP3 and EBITDA logic from v4.4 is preserved.

Replace the complete project files in this package, then run Sync Actuals and Deploy to GitHub Pages and hard-refresh.
