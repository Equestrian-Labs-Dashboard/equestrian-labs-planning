# v2.4.1 Runtime Error Fix

## Corrected
- Removed an invalid reference to the local `corro` variable from `totalAdSpendManualOrEditable()`.
- The variable only exists inside `applyActualsToState()` and could not be accessed by the advertising calculation functions.
- Updated the JavaScript cache-busting version to `v=241`.
- Updated the visible model version to v2.4.1.

## Validated
- `assets/js/app.js` syntax
- `assets/js/dataService.js` syntax
- `scripts/sync-connected-data.mjs` syntax
- `scripts/sync-shopify-actuals.mjs` syntax
- JSON parsing for assumptions

The correction restores rendering of Sections 2–7 and all tabs that depend on `totalAdSpendByYear()`.
