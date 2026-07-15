# Strategic Operating Model v2.6 / V21

Fixed cache-busting + formula helper issue. This version adds `?v=21` to CSS/JS assets so GitHub Pages cannot keep serving the old app.js that caused `isFormulaToken is not defined`.

# Equestrian Labs — Strategic Operating Model (Web)

Dashboard ejecutivo del **Strategic Operating Model** (hoja `01_Strategic_Assumptions`),
convertido de Excel a una pequeña app web — 100% gratuita, sin backend, lista para
subir a GitHub y publicarse sola.

## Por qué esta arquitectura (y no otra)

| Necesidad | Elección | Por qué |
|---|---|---|
| Hosting | **GitHub Pages** | Gratis para siempre, sin tarjeta, se activa solo con este repo |
| Deploy | **GitHub Actions** (incluido) | Cada `git push` a `main` publica solo, sin pasos manuales |
| Frontend | **HTML + CSS + JS puro** | Cero build step, cero dependencias que se rompan con el tiempo, cualquiera en el equipo lo puede editar sin instalar nada |
| Datos | `data/assumptions.json` + `localStorage` | El modelo carga siempre el dataset base; lo que edite cada persona se guarda en su navegador, sin costo de servidor |
| Gráficos (fase 2) | Chart.js vía CDN | Gratis, sin instalación, se agrega cuando haya fórmulas reales |

**No usé React/Vue ni un framework** porque el sitio es un dashboard de datos, no una
app compleja de estados — un framework hoy solo agregaría una capa de build (y de
mantenimiento) sin necesidad real.

### Cómo escala a futuro (sin reescribir nada)

Toda lectura/escritura de datos pasa por **un solo archivo**: `assets/js/dataService.js`.
Cuando el equipo necesite que las ediciones se compartan entre personas (no solo en el
navegador de cada quien), se reemplaza el contenido de `load()`/`save()` por llamadas a:

- **Supabase** (Postgres gratis hasta 500MB, con API instantánea) — la opción recomendada, o
- **Firebase Firestore** (free tier generoso, ya usado en otros proyectos del equipo)

El resto del sitio (HTML/CSS/`app.js`) no cambia una sola línea, porque no sabe *de dónde*
vienen los datos, solo que existen `load()` y `save()`.

## Estructura del proyecto

```
├── index.html                  # Dashboard (una sola página)
├── assets/
│   ├── css/styles.css          # Design tokens + estilos (misma identidad del Excel)
│   └── js/
│       ├── dataService.js      # Única puerta de datos (ver sección de arriba)
│       └── app.js              # Renderizado de las 8 secciones + KPIs
├── data/assumptions.json       # Dataset base del modelo (editable a mano o por PR)
└── .github/workflows/deploy.yml# Publica solo en cada push a main
```

## Cómo subirlo a GitHub y publicarlo (5 minutos)

1. Crea un repo nuevo en GitHub (puede ser privado o público).
2. Sube esta carpeta completa (`git init`, `git add .`, `git commit -m "base"`, `git push`).
3. En el repo: **Settings → Pages → Source → GitHub Actions**. Con eso basta, el workflow
   ya incluido (`.github/workflows/deploy.yml`) hace el resto.
4. En 1-2 minutos el sitio queda publicado en:
   `https://<tu-usuario>.github.io/<nombre-del-repo>/`

Cada vez que hagas `git push` a `main`, el sitio se actualiza solo.

## Qué falta a propósito (fase 2)

Igual que en el Excel: **esto es solo la interfaz**, sin fórmulas todavía. Los campos
"Revenue (calc.)", el waterfall de márgenes y los semáforos de Investment Thesis están
en layout, listos para conectarse a la lógica de cálculo cuando la definan.

## Editar el dataset base

`data/assumptions.json` es el dataset que ve cualquier persona que abra el sitio por
primera vez (o que use "Restablecer a valores base"). Editarlo ahí y hacer push actualiza
el modelo para todo el equipo.


## Magic Page V4 status

Implemented from the July 9 feedback:

- Organic Growth is editable, not a dropdown.
- Current Strategic Scenario feeds from the header controls.
- Funding & Allocation no longer duplicates the Funding column and includes Unallocated Capital warning.
- Save and Download buttons were added.
- Commercial Strategy is split into Acquisition, Retention, and Market Growth.
- ROAS and Ad Spend are included in Acquisition.
- Dover Capture in the header feeds 2026 in Market Growth.
- Growth Engines are inputs only; no Revenue or Gross Profit output is shown on the Magic Page.
- Purchasing includes COGS Total, Vendor Payment Mix defaults of 80% / 15% / 5%, and Inventory Turns under Capital Efficiency.
- The Gross Sales → EBITDA waterfall was removed from the Magic Page.
- Sheet 2 / Growth & Margin Engine now has a draft structure plus OPEX defaults: Payroll $40K/month, G&A $45K/month, S&M 6.62% of Gross Revenue, Technology $0.

Pending data connections:

- Current/Baseline YTD averages from the dashboard.
- Weighted-average Markup from purchasing/product data.

## V6 update

- Tab 02 is now a formula-driven Growth & Margin Engine draft.
- Tab 02 links to Tab 01 scenario assumptions and calculates 2026 Gross Sales, Net Sales, GP1, GP2 and GP3 where Tab 01 inputs exist.
- Growth Engines now calculate Gross Sales and GP1 by engine using the approved formulas.
- Locked engines return zero output until funding gates are met.
- Formula Notes list exactly what external data is still needed for automation.

## V7 — Google Sheet actuals connection

This version connects the Magic Page current/baseline fields to the public Google Sheets shared by the team:

- Corro Dashboard Data: `1nq8xkDzowAvhD3wpMBlVK2M3FZSNS2DrAiPxz-Y2tdU`, gid `459401991`
- Cavali Dashboard Data: `1QUdJc2EIdElIX5nlLQxWxS98aAz-TgQnSg9glJpNtig`, gid `1684751027`

The app reads monthly rows where `period` is in `YYYY-MM` format and calculates latest-year YTD actuals for:

- Organic Growth %
- Discounts & Returns %
- New Customer %
- Returning Customers %
- Purchase Frequency
- Ecommerce Orders
- Ecommerce AOV
- Ecommerce GM1 %
- Cavali GM1 % and Organic Member Growth

Use the **Refresh Actuals** button in the header to update these values. The app also tries one silent refresh on load. If it fails, make sure the sheets are accessible to anyone with the link as Viewer.

Still needed for full automation:

- Ad spend by month/channel, including Wellington ads and Cavali paid growth.
- Klaviyo/email revenue monthly export or API.
- Product/SKU cost data for weighted-average markup.
- Shipping and packaging expense source from QuickBooks or a cleaned monthly table.


## V8 — Google Sheets dashboard connections

This version reads actuals directly from the Corro and Cavali Google Sheets that feed the dashboard.

Expected tabs:

- `kpis_daily` — YTD/current actuals for gross sales, net sales, GP, COGS, orders, AOV, customer mix.
- `revenue_share` — channel mix such as Online, Wellington, Concierge and Others.
- `new_vs_returning` — new and returning customer detail.
- `ad_spend` — monthly ad spend, ROAS, COS and CAC.
- `smartrr_product_volume` — Cavali membership/subscription product volume and active subscribers.

The Refresh Actuals button pulls those tabs through Google Sheets CSV export. The sheets must be shared with link-view access.


## V9 update

- Reads Google Sheets tabs directly: kpis_daily, revenue_share, new_vs_returning, ad_spend, smartrr_product_volume, and products_q1_2026.
- Uses products_q1_2026 when available to calculate Markup % weighted average from product price/cost/units columns.
- No Shopify credentials are required in this planning app; it only reads published Google Sheets.


## V11 review refinements

- Page 1 final cleanup: unified Current Scenario card subtitles, scenario labels styled as labels, Incremental Ad Spend baseline set to $0, visual separation for Discounts & Returns, balanced Growth Engines layout, initiative launch/investment placeholders replaced with concrete values/TBD, target years clarified.
- Page 2 simplified to the final leadership structure: Active Scenario, Financial Snapshot, Growth Engines — Revenue & Profit Contribution, Supporting KPIs, and Margin Bridge. Formula/Data Needed notes were removed from the visible Page 2.

## V12 — July 13 corrections

- Standardized `$500k` with lowercase `k` everywhere while keeping `$1M`, `$3M`, `$5M`, `$10M` with uppercase `M`.
- Acquisition now has two ad-spend drivers: Base Ad Spend at `$20k/month` and Incremental Ad Spend calculated from the selected funding scenario.
- Incremental Ad Spend timing rules: funding starts impacting one month after Funding Date; `$500k` covers 6 months, `$1M` covers the remainder of 2026 plus FY2027, `$3M` covers through FY2028, and `$5M/$10M` covers through FY2029.
- Discounts & Returns % moved out of Market Growth Strategy and into Purchasing Strategy / Commercial Terms under Booking Discount %.
- Organic Growth current/baseline remains a YoY calculation from Google Sheet YTD actuals.
- Annual Customer Gross Profit calculates as `AOV × Purchase Frequency × GM1 %`.
- Private Label is active at the funding gate but revenue is delayed until funding date + 9 months; default launch for Oct-26 funding is Jul-27.
- Tab 02 Margin Bridge now displays 2026–2029 and renames Variable Marketing to Ad Spend.
- Concierge/Wellington OPEX assumptions were stored for Tab 03: `$70k annual pool`, split 60% Concierge / 40% Wellington, plus 10% of Concierge Net Sales and 1% of Wellington Net Sales.

## Sharing with ChatGPT for review

If ChatGPT cannot open the live GitHub Pages URL, share screenshots of the relevant section or paste `index.html`, `assets/js/app.js`, and `data/assumptions.json` snippets. The live app itself only needs the Google Sheets to be shared/published for the browser to load actuals.


## V14 — Strategic Model Page 1 / Page 2 Final Logic

Applied from latest Ceci feedback:

- Header now uses five scenario controls/cards: Funding, Funding Date, Base Ecommerce, Dover Capture, ROAS. Organic Growth is no longer in the header to avoid triple representation.
- Base Ecommerce defaults to `$70k/month`; Base Ad Spend remains `$20k/month`.
- Funding & Allocation includes editable Organic Growth Default by scenario: Base/$500k = 5%, $1M/$3M = 10%, $5M/$10M = 15%.
- Dover Capture includes Market Opportunity, Target Capture, Paid Ads Overlap, and editable annual ramp. Calculated revenue uses: `Net Dover Capture = Dover Market Opportunity × Target Capture % × Annual Ramp % × (1 - Paid Ads Overlap %)`.
- Page 2 includes Ecommerce Revenue Build before the consolidated Growth Engines table. Formula: `Total Ecommerce Gross Sales = Base Ecommerce Revenue + Organic Growth Revenue + Incremental Paid Growth + Net Dover Capture`.
- Organic Growth Revenue applies only to Base Ecommerce Revenue in V1, not to Dover or paid growth.
- Incremental Paid Growth uses `Incremental Ad Spend × ROAS`, and the spend is distributed monthly by scenario without exceeding the Marketing Allocation.
- Engine GP1 uses Engine Net Sales, not Engine Gross Sales: `Engine Net Sales = Engine Gross Sales × (1 - Discounts & Returns %)`, then `Engine GP1 = Engine Net Sales × GM1%`.
- Cavali paid growth uses weighted average boxes/year and weighted average price.
- Private Label revenue starts 12 months after Funding Date, even if the gate is active.
- OPEX formulas for Concierge/Wellington remain out of Page 1 and Page 2; they belong to Financial / Summary P&L.


## V15 changes
- Organic Growth label simplified in Funding & Allocation.
- New Customer % renamed to New Customer Mix %.
- Annual Customer Gross Profit renamed to Annual GP per Customer.
- Added Incremental Revenue Carryover % under Retention Strategy.
- Ecommerce Revenue Build now compounds base annually: next-year base equals prior base + prior organic growth + carryover of prior incremental paid growth and net Dover capture.
- Paid Revenue Influenced now shows % of Ecommerce Gross Sales.
- Actual YoY Growth uses H1 / through June by default to avoid accidental July inclusion.


## V16 corrections
- Header Dover Capture and ROAS now sync across all forecast years, not only 2026.
- Dover labels now distinguish gross market opportunity / gross capture from net Dover capture after paid ads overlap.
- Ecommerce Revenue Build now uses Paid Growth Revenue = (Base Ad Spend + Incremental Ad Spend) × ROAS, so the $20k/month base spend also produces revenue and does not show as zero when funding-driven incremental spend ends.
- Ecommerce row in Growth Engine Portfolio continues to use Total Ecommerce Gross Sales from Base Ecommerce + Organic Growth + Paid Growth Revenue + Net Dover Capture.

## V17 Ad Spend rule

For the current $3M scenario, Ad Spend is calculated through 2028 and editable for 2029:

- 2026: Total Ad Spend = Base Ad Spend + Incremental Ad Spend.
- 2027: Total Ad Spend = Base Ad Spend + Incremental Ad Spend.
- 2028: Total Ad Spend = Base Ad Spend + Incremental Ad Spend.
- 2029: Total Ad Spend is editable because the $3M funding-driven marketing allocation ends in 2028 and management must decide how much to reinvest to sustain the business.

Page 2 uses Total Ad Spend for Paid Growth Revenue, Paid Revenue Influenced, and the Margin Bridge Ad Spend line.
