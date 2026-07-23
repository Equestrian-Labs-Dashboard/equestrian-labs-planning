/**
 * DataService
 * -----------
 * Única puerta de entrada/salida de datos del modelo.
 * Hoy: localStorage (edición local) + data/assumptions.json (dataset base).
 * Mañana: reemplazar SOLO el contenido de load()/save() por llamadas a
 * Supabase / Firebase (ambos con free tier) para persistencia multiusuario,
 * sin tocar una sola línea de app.js.
 */
const DataService = (() => {
  const STORAGE_KEY = "som_assumptions_v30";
  const LEGACY_KEYS = [
    "som_assumptions_v30",
    "som_assumptions_v30",
    "som_assumptions_v30",
    "som_assumptions_v30",
    "som_assumptions_v30",
    "som_assumptions_v30",
    "som_assumptions_v30",
    "som_assumptions_v30"
  ];

  async function load() {
    const keys = [STORAGE_KEY, ...LEGACY_KEYS];
    for (const key of keys) {
      const local = localStorage.getItem(key);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (key !== STORAGE_KEY) localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          return parsed;
        } catch (e) { /* try next key */ }
      }
    }
    const res = await fetch("data/assumptions.json?v=30", { cache: "no-store" });
    if (!res.ok) throw new Error("No se pudo cargar data/assumptions.json");
    return res.json();
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function reset() {
    [STORAGE_KEY, ...LEGACY_KEYS].forEach(key => localStorage.removeItem(key));
  }

  return { load, save, reset };
})();
