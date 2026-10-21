# Strategic Operating Model v4.7 - Formula Map

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

Marketing from each included assignment follows its own funding date. The current guideline deploys each round's marketing budget within its funding year, starting when funding arrives. A separate Marketing Timing selector retains the optional multi-year ramp. All tabs share the same revenue, advertising, EBITDA and cash calculations. Inventory affects cash timing, not a direct duplicate charge to COGS. Payables and Embroidery CapEx are deducted once in the funding year; cash-out totals reconcile to the displayed categories.

Funding plan version 2 is migrated once. Previous funding assignments are retained in fundingHistory in the saved/exported model. Existing scenario choices and non-funding assumptions are preserved. Subsequent reloads and status changes keep edited dates, amounts and allocations.

The forecast horizon is 2026-2029. In the default funding-year mode, November 2026 deploys 150,000 in 2026 and January 2027 deploys 1,250,000 in 2027. Selecting Multi-year ramp restores 5% / 40% / 30% / 25% for late-2026 funding and 0% / 40% / 35% / 25% for Jan-Mar 2027. Monthly funding receipts are exact; operating projections remain annual. The funding-year option assumes the marketing allocation can be spent after receipt within that year; projected ROAS revenue is not committed sales.

## 2026 Ecommerce FCS
2026 Base Ecommerce Revenue = Ecommerce actual gross sales through the source cutoff + remaining fraction of the year times the editable Ecommerce monthly run rate.
The source file was generated on 12 October 2026. October is partial: elapsed months = 9 + 12/31, remaining months = 2 + 19/31. Actual October sales are retained, and only the unelapsed part is forecast. The actuals cutoff selectors are historical filters, not funding dates.

The 70,000 monthly run rate applies to the Ecommerce channel only. It is not the total Corro or Corro-plus-Cavali run rate. Other Corro Channels retains Legacy and Shopify Collective actuals, which were previously omitted from the portfolio. Concierge, Wellington and Other Corro use their own YTD revenue and annualize only the remaining period. Cavali 2026 uses actual YTD sales plus remaining-period Signature/Premier forecasts; it does not replace known sales with a second full-year membership estimate.

The 2026 Actuals to Forecast table reconciles each engine's actual YTD + remaining baseline + new marketing revenue + net Dover = forecast total. With the supplied data, 70,000 Ecommerce run rate, November marketing 150,000, ROAS 4 and Dover 10%, the reconciliation is 864,428.74 + 363,256.07 + 600,000 + 455,000 = 2,282,684.81 gross revenue. The model does not force a 2 million target.

## Organic Growth
2026 Organic Growth Revenue = 0 incremental revenue because 2026 is Actuals + Forecast.
2027–2029 Organic Growth Revenue = applicable yearly Base Ecommerce Revenue × yearly Organic Growth %.

## Carryover
Next Year Ecommerce Base = Prior Year Base + Carryover % × (Prior Year Organic Growth + Prior Year Paid Growth + Prior Year Net Dover Capture).
Carryover is applied once only.

## Paid Ads
Base Ad Spend = $20,000/month × 12 = $240,000/year.
Incremental Ads source = each included Funding Scenario Marketing allocation, deployed by its selected Marketing Timing.
Total Ad Spend = Base Ad Spend + Incremental Ad Spend.
Incremental Paid Growth Revenue = Incremental Ad Spend times ROAS.
Base advertising revenue is already contained in actual sales and the baseline run rate. It is not added a second time to forecast sales. Base advertising is still an expense, recognized once above GP3. Paid Revenue Influenced = Total Ad Spend times ROAS is a separate attribution KPI, not another additive revenue stream.

The previous annual base-ad addition was 240,000 times ROAS 4 = 960,000, which double counted baseline sales. The previous 5% ramp deployed only 7,500 of November's 150,000 budget in 2026. The new default funding-year option deploys the full 150,000 after receipt, projecting 600,000 incremental revenue at ROAS 4. Both the marketing cost and its revenue now use the same schedule.

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
Cavali has no separate paid-growth add-on in the current subscription model.
Private Label = Units × ASP.

## Margin Bridge
Portfolio Gross Sales = sum of all active engines.
Discounts & Returns = Gross Sales × Discounts & Returns %.
Net Sales = Gross Sales - Discounts & Returns.
For 2026, each channel retains its observed actual net sales. Discounts on the remaining forecast apply to that forecast only. Portfolio Net Sales is the sum of channel net sales; the effective Discounts & Returns percentage reconciles the displayed bridge.
Engine GP1 = Engine Net Sales × Engine GM1 %.
Portfolio GP1 = sum of Engine GP1.
COGS = Net Sales - GP1.
GP2 = GP1 - Outbound Shipping - Packaging + Shipping Revenue.
GP3 = GP2 - Advertising.

Funding Inventory is NOT directly added to P&L COGS. Funding Inventory is a Cash Flow timing item.

## EBITDA
EBITDA = GP3 - Sales & Marketing - General & Administrative - Other Operating Expenses.
Advertising is not duplicated below GP3.

## Sales & Marketing Commissions

The previous 210,000 for 2026 and 300,000 per year for 2027-2029 were fixed values in assumptions.json. The connected actuals file has no commission or S&M ledger supporting them. They remain available as manual overrides and legacy assumptions; they are not presented as actual accounting costs.

Default S&M = sum of each channel's commissionable revenue times its commission rate + CJ monthly estimate times 12 + other fixed S&M.
The initial editable rates are Concierge 10%, Wellington 1%, other channels 0%. Paid ads are not a commission charge. The initial CJ estimate is 3,000 per month (36,000 per year), based on Ceci's planning example, not a validated CJ statement.
The default basis is Net Sales; Gross Sales is an explicit alternative. Weighted channel commission rate = channel commission costs / total commission-basis sales. CJ and fixed costs remain separately visible.
Rates, CJ estimates and fixed costs are editable by year. S&M Method also offers a manual annual override, with the difference from calculated commissions displayed as a manual adjustment. Changes propagate to P&L, EBITDA, cash flow, OPEX coverage and Board outputs.
G&A remains 1,000,000 per year and is independently editable, including a 1,200,000 scenario if chosen.

## Cash Flow
Opening Cash 2026 = editable default.
Later Opening Cash = prior Ending Cash.
Total Cash In = operating cash receipts + funding when applicable.
Planning operating receipts = portfolio Net Sales + Shipping Revenue; the Corro/Cavali net receipts and shipping rows reconcile to this total. These are planning receipts, not a claim of reconciled bank deposits.
Cash Out includes Inventory, Advertising, Shipping & Fulfillment, S&M, G&A, Growth Investments, CapEx, Private Label and Other Cash Out.
Ending Cash = Opening Cash + Total Cash In - Total Cash Out.
Cash Runway = Ending Cash / (annual operating cash out / 12).
Operating cash out for runway includes Advertising + Shipping/Fulfillment + S&M + G&A + Other OPEX; it excludes Funding, strategic Inventory allocation, CapEx and Private Label launch investment.

## Markup
Markup % on Cost = (Selling Price - Cost) / Cost.
Gross Margin % = (Selling Price - Cost) / Selling Price.
These are not the same metric.
