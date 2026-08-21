# Final Ceci Audit — Strategic Operating Model

## Implemented

- Six-tab architecture: Magic Page, Growth & Margin Engine, Financial Summary, Commercial Cash Flow, Board Dashboard, Formula QA.
- Display Year controls Tabs 2–5.
- Draft / Budget / Forecast / Board persist independently in browser localStorage.
- Funding scenario allocations are editable and persisted, including Payables, Inventory, Marketing, Embroidery, Private Label and Funding Date.
- 2026 Ecommerce base uses closed-month Shopify Ecommerce actuals + remaining months × editable monthly Base Ecommerce run rate.
- 2026 synthetic Organic Growth revenue is zero.
- 2027–2029 Organic Growth uses the applicable yearly base.
- Carryover is applied only once to following-year base.
- Purchase Frequency 2026 uses Shopify Ecommerce Orders ÷ unique Ecommerce customers when the source is available.
- CAC 2026 uses connected Marketing Ad Spend ÷ Attributed Purchases when available.
- Paid Ads incremental uses the selected funding scenario Marketing allocation, not total funding.
- Base Ad Spend is separate at $20k/month = $240k/year.
- Oct-26 Paid Ads ramp = 5% / 40% / 30% / 25%.
- Jan-27 Paid Ads ramp = 0% / 40% / 35% / 25%.
- Paid Growth = Total Ad Spend × ROAS consistently for all years.
- Dover Market Opportunity remains fixed at $130M unless management explicitly changes it.
- Dover annual ramp totals 100%.
- Ecommerce, Concierge, Wellington, Embroidery, Cavali and Private Label are separate engines.
- Wellington / Concierge / Ecommerce 2026 baseline values are read from Shopify channel actuals where available.
- Cavali is simplified to relevant drivers: Signature and Premier members, Boxes per Member / Year, prices, GM1, Cavali Ads and ROAS.
- Cavali subscription revenue = member count × boxes/member/year × price by tier.
- Cavali paid revenue is added separately as Cavali Ad Spend × Cavali ROAS.
- “Premier” wording replaces the incorrect “Premium/Preium” client wording.
- Cavali current GM1 reads connected actuals; the model does not force an invented value when a connected source exists.
- Portfolio Gross Sales in Tabs 2–5 includes all active engines, not Ecommerce only.
- GP1 is calculated on Net Sales.
- COGS = Net Sales − GP1.
- Funding Inventory is not added directly to P&L COGS.
- Funding Inventory is reflected in Cash Flow when the funding enters.
- GP2 = GP1 − Outbound Shipping − Packaging + Shipping Revenue.
- GP3 = GP2 − Advertising.
- Advertising is not duplicated again inside Sales & Marketing.
- S&M and G&A remain separate from Advertising.
- G&A stays flat at $1M annually in current assumptions.
- Private Label investment is phased to a $1M total according to the initial scenario allocation and next-year balance.
- Commercial Cash Flow distinguishes Inventory, Advertising, Shipping/Fulfillment, S&M, G&A, Growth Investments, CapEx, Private Label and Other Cash Out.
- Cash Runway = Ending Cash ÷ average monthly operating cash out, excluding funding, strategic inventory allocation, CapEx and Private Label launch investment.
- Markup is labeled “Markup % (on Cost)” and is not treated as Gross Margin.
- 2026 Purchasing actual fields use connected data where available rather than “Actuals pending” placeholders.
- Tab 5 has no independent financial model; it uses the same outputs as Tabs 1–4.
- Formula QA validates funding allocation, Paid Ads ramp, Dover ramp, COGS/GP1, portfolio reconciliation and Cavali formula rules.
- Workflow uses Node 24 and does not enable dependency cache, avoiding the previous missing lock-file setup-node failure.
- Shopify tokens remain server-side in GitHub Actions.

## Source-dependent items intentionally not fabricated

- Exact Cavali Boxes per Member / Year values depend on the connected Cavali/Smartrr source. Forecast years remain editable.
- Cavali Ad Spend / CAC require an actual marketing source; they are not invented as real actuals.
- Exact QuickBooks/BILL cash timing is not fabricated until a validated QuickBooks/BILL feed is connected.
- Exact COGS/GM1 requires the connected cost source. Shopify alone provides sales/orders and does not invent product cost.
- Generic Google Sheets extraction can detect common labels from the configured sheets, but sheet naming/layout must match the real workbook. Formula QA and “Data unavailable” prevent silent invented values when a source cannot be mapped.
