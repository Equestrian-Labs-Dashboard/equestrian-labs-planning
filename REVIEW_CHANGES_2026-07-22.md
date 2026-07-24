# Review Changes - July 22, 2026

## Completed

1. Checkout Abandonment Rate now reads from Shopify/model data when available. When the source is unavailable, the UI displays `Data unavailable` instead of an unexplained dash.
2. Other Operating Expenses displays `$0` when its calculated value is zero.
3. Opening Cash displays `$0` when the opening balance is zero.
4. Cash Out detail order is Inventory, Shipping & Fulfillment, Advertising, Sales & Marketing, G&A, Other Operating Expenses.
5. Private Label is classified as Growth Investments.
6. Embroidery Machine is classified as CapEx.
7. Removed the duplicate Private Label Investment and Other rows; Other Cash Out remains.
8. Cash Bridge separates Cash Out excluding CapEx from CapEx to avoid a misleading double presentation.
9. Existing section accent colors are retained and documented: green KPI/commercial, purple financial/margin, yellow operations/business units, blue cash flow/funding.
10. Financial Summary remains fed by the model calculations from the prior tabs.

## External data still required

- A true Shopify Checkout Abandonment Rate requires Shopify analytics data or a maintained model assumption. The current order sync alone cannot calculate it reliably.
- QuickBooks/ShipStation integration remains pending for operating-cost actuals and cash timing.
