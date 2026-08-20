# v2.15.3 — Ads / Paid Growth continuity fix

- Removed the additive 2029 reinvestment behavior that caused the artificial paid-growth spike.
- Uses one 2026–2029 ad-budget rule.
- Base Ad Spend + active funding allocation is always honored.
- Target Ad Spend % sustains a rational budget against pre-paid ecommerce revenue after the funding burst.
- 2029 Ad Reinvestment % acts as a ceiling, not as a second budget added on top.
- Paid Growth remains Total Ad Spend × ROAS.
- Existing Draft/Budget/Forecast/Board values are not overwritten.
- Dover, Organic Growth, Display Year, Tabs 3–5 and connected actuals logic are unchanged.
