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
  const STORAGE_KEY = "som_assumptions_v10";

  async function load() {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try { return JSON.parse(local); } catch (e) { /* fall through */ }
    }
    const res = await fetch("data/assumptions.json");
    if (!res.ok) throw new Error("No se pudo cargar data/assumptions.json");
    return res.json();
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { load, save, reset };
})();
