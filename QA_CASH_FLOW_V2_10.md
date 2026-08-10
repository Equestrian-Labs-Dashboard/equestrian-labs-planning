# Cash Flow QA — v2.10

- Cash Out detail rows display positive magnitudes in neutral navy/black.
- TOTAL CASH OUT retains the negative sign and soft-red treatment.
- Net Cash Flow and Ending Cash only turn red when the calculated result is negative.
- Operating Cash Out is a subtotal that already includes Inventory, Payables Settlement, Advertising, Shipping & Fulfillment, S&M, G&A and Other Operating Expenses.
- TOTAL CASH OUT uses Operating Cash Out once, then adds only Growth Investments, CapEx, Private Label Investment and Other Cash Out. This prevents double counting.
- Cash Coverage uses Ending Cash divided by average monthly recurring Operating Cash Out, excluding strategic one-time investments from the burn-rate denominator.
- Cash In/Out and Ending Cash continue to use the same Tabs 1–3 drivers; no independent financial logic was added.
