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
