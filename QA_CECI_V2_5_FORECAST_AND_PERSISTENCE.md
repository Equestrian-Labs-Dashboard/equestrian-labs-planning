# Strategic Operating Model v2.5 — Forecast and persistence audit

- 2026 remains connected to actuals and closing forecast logic.
- 2027–2029 use explicit, editable assumptions instead of placeholders or copied current values.
- Ecommerce, Concierge, Wellington and Cavali have separate forecast paths.
- CAC is calculated for Ecommerce from AOV / ROAS.
- New Customer Mix is calculated as 100% minus Returning Customers %.
- Annual GP per Customer is calculated as AOV × Purchase Frequency × GM1.
- 2029 Ad Reinvestment remains an explicit management input (20% default), not an actual.
- Header ROAS controls 2026 only; future ROAS values remain independently editable.
- Cavali paid growth uses Ad Spend × ROAS and future values are editable.
- Save persists the complete active scenario in localStorage and scenario snapshots remain separated by Draft, Budget, Forecast and Board.
- Storage key bumped to v250 to prevent legacy placeholder states from overriding corrected defaults.
