# QA — Ceci 2026-08-10 final corrections

Validated in v2.11:

- Dover Market Opportunity is locked to $130M for 2026–2029 and stale saved values are migrated.
- 2026 Ecommerce Base Revenue uses YTD Ecommerce actuals plus remaining months at the editable run rate.
- The saved actuals-through-month is normalized to July 2026, preventing stale month=12 states from showing YTD as full-year.
- Revenue-share under-tagging is handled with a residual Corro Ecommerce fallback.
- Refresh Actuals re-renders all Tabs 1–5 so outputs stay reconciled.
- Funding-row user edits remain preserved; migration only repairs obsolete generated values.
- Cavali forecast revenue remains Members × Boxes/Year × Price + Cavali Ad Spend × ROAS.
- No visible `Actuals pending`, `Data unavailable`, or `No ad_spend rows` placeholders remain in the base model.
