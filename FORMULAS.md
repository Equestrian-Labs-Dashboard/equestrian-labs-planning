# Strategic Operating Model v18 — Formula Map

## Gross vs Net rule
- Financial Snapshot shows Gross Sales, Net Sales, Net-to-Gross, GP1, GP2 and GP3.
- Ecommerce Revenue Build shows Gross Sales only.
- Growth Engine Portfolio shows Gross Sales only plus GP1 derived from Net Sales.
- Margin Bridge converts Gross Sales → Discounts & Returns → Net Sales → COGS → GP1 → GP2 → Ad Spend → GP3.

## Scenario header
Header fields: Funding, Funding Date, Base Ecommerce, Dover Capture, ROAS.
Organic Growth is not in the header; it lives as editable assumption by Funding Scenario.

## Funding assumptions
Organic Growth defaults:
- Base / $0: 5%
- $500k: 5%
- $1M: 10%
- $3M: 10%
- $5M: 15%
- $10M: 15%

Unallocated Capital = Funding Total - Payables - Inventory - Marketing - Embroidery - Private Label.

## Ad Spend
Base Ad Spend = $20,000 × 12 months.
Incremental Ad Spend = Marketing Allocation ÷ covered months, beginning one month after Funding Date.
Coverage:
- $500k: next 6 months
- $1M: through FY2027
- $3M: through FY2028
- $5M and $10M: through FY2029

Total Ad Spend:
- 2026 = Base Ad Spend + Incremental Ad Spend
- 2027 = Base Ad Spend + Incremental Ad Spend
- 2028 = Base Ad Spend + Incremental Ad Spend
- 2029 = editable management reinvestment

Paid Growth Revenue = Total Ad Spend × ROAS.
Paid Revenue Influenced = Total Ad Spend × ROAS, disclosure KPI only, included within Ecommerce.
Paid Revenue Influenced % = Paid Revenue Influenced ÷ Ecommerce Gross Sales.

## Dover
Dover Market Opportunity is gross.
Dover Target Capture % is gross.
Gross Dover Opportunity = Dover Market Opportunity × Dover Target Capture % × Annual Capture Ramp %.
Net Dover Capture = Gross Dover Opportunity × (1 - Paid Ads Overlap %).
Net Dover Capture enters Ecommerce Revenue Build to avoid double counting with paid ads.
Default ramp: 2026 5%, 2027 55%, 2028 25%, 2029 15%, total 100%.

## Ecommerce Revenue Build
Base Ecommerce Revenue for 2026 = Base Ecommerce Monthly Run Rate × 12.
Organic Growth Revenue = Base Ecommerce Revenue × Organic Growth %.
Total Ecommerce Gross Sales = Base Ecommerce Revenue + Organic Growth Revenue + Paid Growth Revenue + Net Dover Capture.

Carryover:
Next Year Ecommerce Base = Prior Year Base + Prior Year Organic Growth + Carryover % × (Prior Year Paid Growth Revenue + Prior Year Net Dover Capture).
Organic growth capitalizes 100% into next year's base. Paid Growth and Net Dover Capture carry forward only by the editable carryover percentage.

## Retention
Annual GP per Customer = Ecommerce AOV × Ecommerce Purchase Frequency × Ecommerce GM1%.
Incremental Revenue Carryover % default = 50% for 2026, 2027 and 2028. 2029 is informational because it would feed 2030.

## Engine formulas
Ecommerce Gross Sales = Ecommerce Revenue Build total.
Concierge Gross Sales = Active Clients × Orders per Client × AOV.
Wellington Gross Sales = Orders × AOV.
Cavali Signature Revenue = Signature Members × Boxes per Year × $99.
Cavali Premium Revenue = Premium Members × Boxes per Year × $199.
Cavali Paid Growth Members = Cavali Ad Spend ÷ Cavali CAC.
Cavali Paid Growth Revenue = New Paid Members × Weighted Average Boxes per Year × Weighted Average Price.
Private Label Launch Date = Funding Date + 12 months; active gate does not mean immediate revenue.

## GP1 by engine
Engine Net Sales = Engine Gross Sales × (1 - Discounts & Returns %).
Engine GP1 = Engine Net Sales × Engine GM1%.

## Margin Bridge
Discounts & Returns = Gross Sales × Discounts & Returns %.
Net Sales = Gross Sales - Discounts & Returns.
COGS = Net Sales × (1 - GM1%) unless actual COGS is sourced from Google Sheets.
GP1 = Net Sales - COGS.
Outbound Shipping = Net Sales × Outbound Shipping Cost %.
Packaging = Net Sales × Packaging Cost %.
Shipping Revenue = Net Sales × Shipping Revenue %.
GP2 = GP1 - Outbound Shipping - Packaging + Shipping Revenue.
GP3 = GP2 - Ad Spend.
