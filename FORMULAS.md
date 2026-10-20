# Strategic Operating Model v3.0 — Final Formula Map

## Variable Funding Plan (20 October 2026)

The current plan contains two independently editable funding assignments:

| Assignment | Date | Amount | Stock Inventory | Marketing | Embroidery | OPEX |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Funding Scenario 1 | Nov-26 | 500,000 | 150,000 | 150,000 | 50,000 | 150,000 |
| Funding Scenario 2 | Jan-27 | 3,000,000 | 1,250,000 | 1,250,000 | 0 | 500,000 |

Total Funding = sum of included assignments = 3,500,000 in the initial case.
Each receipt enters its selected month and year. The second receipt is unavailable in 2026.
Selecting None excludes an assignment without deleting its saved values.
Further rounds may be added independently, including more than one in the same month.

Changing an amount keeps Embroidery fixed (capped at available funding) and scales the remaining allocation mix proportionally. Allocation inputs can also be edited directly. With OPEX = balance enabled, OPEX equals funding less Payables, Inventory, Marketing, Embroidery and Private Label. Editing OPEX disables that automatic balance. Over-allocation is flagged in the funding table and Formula QA.

Funding allocated to OPEX covers the operating expense budget already projected in the P&L and cash flow. It is shown separately as OPEX Funding Coverage; it is not an additional expense or a second cash outflow. Changing funding does not silently overwrite the existing annual S&M, G&A or Other OPEX assumptions.

Marketing from each included assignment follows its own funding date and the existing annual ramp below. All tabs share those revenue, advertising, EBITDA and cash calculations. Inventory affects cash timing, not a direct duplicate charge to COGS. Payables and Embroidery CapEx are deducted once in the funding year; cash-out totals reconcile to the displayed categories.

Funding plan version 2 is migrated once. Previous funding assignments are retained in fundingHistory in the saved/exported model. Existing scenario choices and non-funding assumptions are preserved. Subsequent reloads and status changes keep edited dates, amounts and allocations.

The forecast horizon is 2026-2029. Jan-Mar 2027 retain the model's existing 0% / 40% / 35% / 25% marketing ramp. Monthly funding receipts are exact; operating projections remain annual, as in the original model.

## 2026 Ecommerce FCS
2026 Base Ecommerce Revenue = closed-month Ecommerce actual gross sales + remaining months × editable monthly run rate.
Current partial month is excluded until closed.

## Organic Growth
2026 Organic Growth Revenue = 0 incremental revenue because 2026 is Actuals + Forecast.
2027–2029 Organic Growth Revenue = applicable yearly Base Ecommerce Revenue × yearly Organic Growth %.

## Carryover
Next Year Ecommerce Base = Prior Year Base + Carryover % × (Prior Year Organic Growth + Prior Year Paid Growth + Prior Year Net Dover Capture).
Carryover is applied once only.

## Paid Ads
Base Ad Spend = $20,000/month × 12 = $240,000/year.
Incremental Ads source = selected Funding Scenario Marketing allocation.
Oct-26 ramp = 5% / 40% / 30% / 25%.
Jan-27 ramp = 0% / 40% / 35% / 25%.
Total Ad Spend = Base Ad Spend + Incremental Ad Spend.
Paid Growth Revenue = Total Ad Spend × ROAS.

## Dover
Dover Market Opportunity base = $130M unless management explicitly edits the market-size assumption.
Gross Dover Capture = $130M × Target Capture % × annual ramp %.
Net Dover Capture = Gross Dover Capture × (1 - Paid Ads Overlap %).
Dover ramp must total 100%.

## Growth Engines
Ecommerce = Base + Organic + Paid + Net Dover.
Concierge = Active Clients × Orders per Client × AOV.
Wellington = Orders × AOV.
Embroidery = Orders × AOV.
Cavali subscription revenue = Signature Members × Signature Boxes per Member/Year × Signature Price + Premier Members × Premier Boxes per Member/Year × Premier Price.
Cavali Paid Growth = Cavali Ad Spend × Cavali ROAS.
Private Label = Units × ASP.

## Margin Bridge
Portfolio Gross Sales = sum of all active engines.
Discounts & Returns = Gross Sales × Discounts & Returns %.
Net Sales = Gross Sales - Discounts & Returns.
Engine GP1 = Engine Net Sales × Engine GM1 %.
Portfolio GP1 = sum of Engine GP1.
COGS = Net Sales - GP1.
GP2 = GP1 - Outbound Shipping - Packaging + Shipping Revenue.
GP3 = GP2 - Advertising.

Funding Inventory is NOT directly added to P&L COGS. Funding Inventory is a Cash Flow timing item.

## EBITDA
EBITDA = GP3 - Sales & Marketing - General & Administrative - Other Operating Expenses.
Advertising is not duplicated below GP3.

## Cash Flow
Opening Cash 2026 = editable default.
Later Opening Cash = prior Ending Cash.
Total Cash In = operating cash receipts + funding when applicable.
Cash Out includes Inventory, Advertising, Shipping & Fulfillment, S&M, G&A, Growth Investments, CapEx, Private Label and Other Cash Out.
Ending Cash = Opening Cash + Total Cash In - Total Cash Out.
Cash Runway = Ending Cash / (annual operating cash out / 12).
Operating cash out for runway includes Advertising + Shipping/Fulfillment + S&M + G&A + Other OPEX; it excludes Funding, strategic Inventory allocation, CapEx and Private Label launch investment.

## Markup
Markup % on Cost = (Selling Price - Cost) / Cost.
Gross Margin % = (Selling Price - Cost) / Selling Price.
These are not the same metric.
