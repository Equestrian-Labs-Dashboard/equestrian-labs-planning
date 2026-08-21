# v3.4 clean responsive upload

Upload the contents of this folder to the repository root.

This build intentionally removes obsolete release/QA/hotfix files from the production root. The runtime is:

- `index.html`
- `assets/css/styles.css`
- `assets/js/app.js`
- `assets/js/dataService.js`
- `data/*`
- `scripts/*`
- `.github/workflows/sync-actuals.yml`

Responsive behavior is integrated directly into `styles.css`; do not keep separate `responsive-fix.css` or `responsive-fix.js` files.
