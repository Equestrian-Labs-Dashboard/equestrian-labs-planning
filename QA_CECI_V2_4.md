# Strategic Operating Model v2.4 — QA against Ceci's latest meetings

## Implemented
- 2026 Ecommerce closing forecast = Shopify actuals through latest closed month + remaining months × editable run rate.
- 2026 Organic Growth revenue is not added again; the 2026 assumption creates 2027 growth.
- 2026–2028 Total Ad Spend = Base Ad Spend + funding allocation; Target Ad Spend % is informational.
- 2029 Ad Spend = prior-year Ecommerce Gross Sales × editable reinvestment %.
- Current CAC = Stats spend ÷ attributed purchases, with documented new-customer fallback.
- Forecast CAC = AOV ÷ ROAS, so it varies by year when AOV/ROAS changes.
- Purchase Frequency = Shopify orders ÷ unique customers.
- Revenue Carryover = returning revenue ÷ total customer revenue and applies once to the following-year base.
- Ecommerce/Concierge/Wellington/Cavali GM1 calculated separately from channel net sales and channel COGS.
- Shopify sync now requests variant unit cost and outputs COGS, gross profit and GM1 by channel.
- Cavali revenue includes membership revenue + Cavali Ad Spend × Cavali ROAS.
- 2027–2029 management forecasts remain editable and Refresh Actuals does not overwrite them.
- Draft/Budget/Forecast/Board remain separate saved browser scenarios.

## External-source limitations (not invented)
- Cavali Ad Spend/CAC remain unavailable when the Cavali ad_spend source has no rows.
- Premium Boxes per Year current/2026 requires Smartrr/Shopify delivered boxes divided by active Premium members.
- Opening Cash and real payment timing require QuickBooks/BILL.
- Shipping cost and packaging require QuickBooks/ShipStation.
- Shared multi-user persistence requires a backend; browser Save persists on the same browser/device.
