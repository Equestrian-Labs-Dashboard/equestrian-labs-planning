# Strategic Operating Model v3.6

Includes Page 1 Magic Page + Page 2 Growth & Margin Engine with Easy Numbers Test formula alignment.

Key changes:
- Draft / Budget / Forecast / Board scenario persistence.
- Publish To flow copies current scenario inputs to Budget, Forecast or Board.
- Currency format unified: < $1M shown as k; >= $1M shown as M.
- Dover, Ecommerce Revenue Build, Carryover, 2029 reinvestment, and Margin Bridge formulas aligned to the Easy Numbers Test.
- Inventory Turns current set to 0.17x from SKU/Savy report until Shopify/SKU source is validated.

Deploy by replacing the repo contents, commit/push, then hard refresh.


## V26 update — HITS Marketing Subscription

Added **HITS Marketing Subscription** to Section 6 — Growth Initiatives as a Base / Active marketing tool with investment **$306** (rounded from $305.64). This is treated as **Sales & Marketing OPEX reference**, not CapEx. The strategic page shows it for visibility; the financial impact belongs in Tab 03 / Financial P&L or the Financial Dashboard OPEX mapping.


## V26 update — Tab 3 / Tab 4 visual structure
Added Tab 03 Financial Summary and Tab 04 Commercial Cash Flow as read-only executive outputs. Tab 03 follows the PRD: KPI Cards, Commercial P&L, Operating KPIs. Tab 04 follows the PRD: KPI Cards, Cash In, Cash Out, Net Cash Flow and Waterfall. Values are generated from Tabs 1–2 model outputs and funding plan; no editable fields are included.

## Legacy clarification for SKU/Savy
Legacy classification does not come from this Strategic Model. It must be verified in the SKU/Savy data pipeline/source logic: whether it is Shopify tag/metafield/status, SKU/Savy mapping, collection, product age, or another rule. Do not assume source of truth until the SKU/Savy code or source data is checked.


## V29 final audit updates
- Tab 03 removes “No editable inputs” subtitle noise and uses softer visual hierarchy.
- Tab 03 Commercial P&L highlights Gross Sales, Net Sales, GP1, GP2, GP3 and EBITDA.
- Zero values display as — in financial output views; negative values use soft red.
- Technology is renamed Other Operating Expenses.
- Operating KPIs use Checkout Abandonment Rate instead of Paid Revenue.
- Tab 04 Cash Flow now follows commercial cash timing: Shopify Deposits Corro, Shopify Deposits Cavali, Funding and Other Cash Receipts.
- Cash Out uses Operating Cash Out plus Inventory, Advertising, Shipping & Fulfillment, S&M, G&A, Growth Investments, CapEx, Private Label Investment and Other.
- Cash Coverage = Ending Cash ÷ Average Monthly Operating Cash Out.
- Formula QA documents Default Logic (2029 onwards), Constant ROAS assumption, and carryover anti-double-counting rule.


## Final QA notes from 2026-07-22
- Carryover applies only once when calculating the following year Base Ecommerce Revenue; do not re-add the same revenue downstream.
- GM1% must be defined over Net Sales, not Gross Sales.
- Annual GP per Customer must use AOV, Purchase Frequency and GM1 from the same business population.
- 2029 Default Logic onwards: Prior Year Ecommerce Gross Sales × Reinvestment %.
- Paid Growth Revenue: revenue influenced by paid media; assumes constant ROAS during the selected fiscal year.
- HITS is OPEX / Sales & Marketing for $305.64, not CapEx.


## V32 notes

- System-wide modern Corro blue visual refresh.
- Light/dark mode toggle in the header: sun for light mode, moon for dark mode.
- Editable percentage fields keep the `%` symbol visible.
- Shopify direct API is not exposed in GitHub Pages; actuals refresh through Google Sheets/dashboard outputs until a secure backend/pipeline is connected.
