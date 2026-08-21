# Strategic Operating Model v3.5 — safe replacement

This package fixes the responsive layout and 2026 actual/FCS display without changing the approved business formulas.

## Important before upload

Do **not** delete the existing generated files in GitHub:

- `data/shopify_actuals.json`
- `data/connected_actuals.json`

They are generated/refreshed by GitHub Actions. This ZIP intentionally does not overwrite them, so the current live actuals remain available while the new code is uploaded.

Upload the content of this ZIP to the repository root and replace matching code files. Then run:

`Actions -> Sync Actuals and Deploy to GitHub Pages -> Run workflow`

After the workflow is green, hard refresh the dashboard (`Ctrl+F5`).

## v3.5 fixes

- Strategic Operating Model header remains sticky while scrolling.
- Desktop tables no longer show unnecessary horizontal scrollbars.
- Growth Engine cards keep all 2026-2029 columns visible.
- 2026 actual values take precedence over forecast/manual cells when a connected actual exists.
- 2026 Ecommerce Orders is an FCS-compatible figure based on the Ecommerce revenue build and current AOV, rather than silently displaying 0.
- Cavali 2026 uses Shopify actual sales as a safe fallback when subscription-driver actuals are not available.
- JSON data requests are cache-busted and the browser keeps a last-known-good copy to avoid temporary 0/dash regressions.
- Saved Draft/Budget/Forecast/Board state is merged with the current model schema, preserving edits without losing newer fields.
