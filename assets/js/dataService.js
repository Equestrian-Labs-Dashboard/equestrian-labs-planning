/**
 * DataService
 * -----------
 * Single data input/output gateway for the model.
 * Current implementation: localStorage for local edits plus
 * data/assumptions.json as the baseline dataset.
 * Future implementation: replace only the internals of load() and save()
 * with Supabase or Firebase calls for multi-user persistence without
 * changing app.js.
 */
const DataService = (() => {
  const STORAGE_KEY = "som_assumptions_v32";
  const LEGACY_KEYS = [
    "som_assumptions_v31",
    "som_assumptions_v30",
    "som_assumptions_v29",
    "som_assumptions_v28",
    "som_assumptions_v27",
    "som_assumptions_v26",
    "som_assumptions_v25",
    "som_assumptions_v24",
    "som_assumptions_v23"
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
    const res = await fetch("data/assumptions.json?v=32", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load data/assumptions.json");
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
