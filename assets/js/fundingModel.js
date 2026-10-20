(() => {
  "use strict";
  const YEARS = [2026, 2027, 2028, 2029];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ALLOCATIONS = ["payables", "inventory", "marketing", "embroidery", "privateLabel", "opex"];
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const money = value => Math.round(number(value) * 100) / 100;
  const copy = value => JSON.parse(JSON.stringify(value));
  function dateParts(value) {
    const match = /^([A-Z][a-z]{2})-(\d{2})$/.exec(String(value));
    const month = MONTH_NAMES.indexOf(match?.[1]) + 1;
    const year = match ? 2000 + Number(match[2]) : 0;
    return month && YEARS.includes(year) ? {month, year, label: value, index: year * 12 + month - 1} : null;
  }
  function months() {
    return YEARS.flatMap(year => MONTH_NAMES.map(month => `${month}-${String(year).slice(-2)}`));
  }
  function allocated(round) {
    return money(ALLOCATIONS.reduce((sum, key) => sum + number(round[key]), 0));
  }
  function balance(round) { return money(round.amount - allocated(round)); }
  function normalizeRound(round, index) {
    round.id ||= `funding-${index + 1}`;
    round.label ||= `Funding Scenario ${index + 1}`;
    round.enabled = round.enabled !== false;
    round.preset ||= "custom";
    round.opexAuto = round.opexAuto !== false;
    ["amount", ...ALLOCATIONS].forEach(key => round[key] = money(round[key]));
    if (round.opexAuto) round.opex = Math.max(0, money(round.amount - ALLOCATIONS.filter(key => key !== "opex").reduce((sum, key) => sum + round[key], 0)));
    return round;
  }
  function defaultPlan() {
    return {version: 2, rounds: [
      normalizeRound({id: "funding-1", preset: "$500k", date: "Nov-26", amount: 500000, inventory: 150000, marketing: 150000, embroidery: 50000, opex: 150000}, 0),
      normalizeRound({id: "funding-2", preset: "$3M", date: "Jan-27", amount: 3000000, inventory: 1250000, marketing: 1250000, opex: 500000}, 1)
    ]};
  }
  function ensurePlan(state, defaults = defaultPlan()) {
    if (!state.fundingPlan || state.fundingPlan.version !== 2) {
      // Preserve the previous assignments in the exported model during the one-time migration.
      state.fundingHistory ||= {fundingScenario: state.meta.fundingScenario, fundingScenario2: state.meta.fundingScenario2, fundingDate: state.meta.fundingDate, scenarios: copy(state.fundingScenarios || {})};
      state.fundingPlan = copy(defaults);
    }
    const ids = new Set();
    state.fundingPlan.rounds.forEach((round, index) => {
      normalizeRound(round, index);
      if (ids.has(round.id)) round.id = `funding-${index + 1}-${ids.size}`;
      ids.add(round.id);
    });
    return state.fundingPlan;
  }
  function activeRounds(plan) { return plan.rounds.filter(round => round.enabled); }
  function summary(plan) {
    const rounds = activeRounds(plan);
    return {rounds, date: rounds[0]?.date || "Nov-26", funding: money(rounds.reduce((sum, round) => sum + round.amount, 0)), ...Object.fromEntries(ALLOCATIONS.map(key => [key, money(rounds.reduce((sum, round) => sum + round[key], 0))]))};
  }
  function updateAmount(round, amount) {
    if (amount === null || String(amount).trim() === "" || !Number.isFinite(Number(amount)) || amount < 0) return false;
    amount = money(amount);
    // Keep embroidery fixed; scale the remaining allocation mix to the new available capital.
    round.fixedEmbroidery ??= round.embroidery;
    const fixed = Math.min(round.fixedEmbroidery, amount);
    const previous = Math.max(0, round.amount - round.embroidery);
    const flexible = ALLOCATIONS.filter(key => key !== "embroidery");
    if (previous > 0 && !round.allocationMix) round.allocationMix = Object.fromEntries(flexible.map(key => [key, round[key] / previous]));
    const mix = round.allocationMix || {opex: 1};
    flexible.forEach(key => round[key] = money(number(mix[key]) * (amount - fixed)));
    round.amount = amount;
    round.embroidery = fixed;
    normalizeRound(round, 0);
    round.preset = "custom";
    return true;
  }
  function updateRound(round, key, value) {
    if (key === "amount") return updateAmount(round, value);
    if (key === "date") {
      if (!dateParts(value)) return false;
      round.date = value;
      return true;
    }
    if (!ALLOCATIONS.includes(key) || value === null || String(value).trim() === "" || !Number.isFinite(Number(value)) || value < 0) return false;
    round[key] = money(value);
    delete round.allocationMix;
    if (key === "embroidery") round.fixedEmbroidery = round.embroidery;
    if (key === "opex") round.opexAuto = false;
    round.preset = "custom";
    normalizeRound(round, 0);
    return true;
  }
  function selectPreset(plan, index, key, scenarios) {
    const round = plan.rounds[index];
    if (key === "none") { round.enabled = false; return; }
    round.enabled = true;
    if (key === "custom") { round.preset = key; return; }
    const amount = key === "Base" ? 0 : number(key.replace(/[$kM]/g, "")) * (key.endsWith("M") ? 1e6 : 1e3);
    if (index === 0 && key === "$500k") {
      Object.assign(round, defaultPlan().rounds[0], {date: round.date, id: round.id});
      delete round.allocationMix;
      delete round.fixedEmbroidery;
    } else if (index === 0 && scenarios[key]) {
      const source = scenarios[key].rounds?.[0] || scenarios[key];
      Object.assign(round, Object.fromEntries(ALLOCATIONS.map(field => [field, number(source[field])])), {amount: number(source.amount ?? source.funding), opexAuto: true});
      delete round.allocationMix;
      delete round.fixedEmbroidery;
    } else {
      updateAmount(round, amount);
    }
    round.preset = key;
    normalizeRound(round, index);
  }
  function fundingForYear(plan, year, key = "amount") {
    return money(activeRounds(plan).reduce((sum, round) => sum + (dateParts(round.date)?.year === Number(year) ? number(round[key]) : 0), 0));
  }
  function schedule(plan) {
    const rounds = activeRounds(plan);
    const first = Math.min(2026 * 12 + 9, ...rounds.map(round => dateParts(round.date)?.index ?? Infinity));
    const last = Math.max(2027 * 12 + 2, ...rounds.map(round => dateParts(round.date)?.index ?? 0));
    let accumulated = 0;
    return months().map(label => {
      const date = dateParts(label);
      const funding = money(rounds.reduce((sum, round) => sum + (round.date === label ? round.amount : 0), 0));
      accumulated = money(accumulated + funding);
      return {label, index: date.index, funding, accumulated, ...Object.fromEntries(ALLOCATIONS.map(key => [key, money(rounds.reduce((sum, round) => sum + (round.date === label ? round[key] : 0), 0))]))};
    }).filter(row => row.index >= first && row.index <= last);
  }
  function roundRamp(round) {
    const date = dateParts(round.date);
    const out = Object.fromEntries(YEARS.map(year => [year, 0]));
    if (!date) return out;
    const {year, month} = date;
    if (year === 2026) {
      out[2026] = month >= 10 ? .05 : month >= 7 ? .10 : .20;
      out[2027] = .40; out[2028] = .30; out[2029] = 1 - out[2026] - .70;
    } else if (year === 2027) {
      out[2027] = month <= 3 ? .40 : .40 * (13 - month) / 12;
      out[2028] = (1 - out[2027]) * 35 / 60;
      out[2029] = 1 - out[2027] - out[2028];
    } else if (year === 2028) { out[2028] = .60; out[2029] = .40; }
    else out[2029] = 1;
    return out;
  }
  function issues(plan) {
    const issues = [];
    activeRounds(plan).forEach(round => {
      if (!dateParts(round.date)) issues.push(`${round.label}: invalid funding date`);
      if (round.amount < 0 || ALLOCATIONS.some(key => round[key] < 0)) issues.push(`${round.label}: negative amount`);
      if (balance(round) < -.01) issues.push(`${round.label}: allocations exceed funding`);
    });
    return issues;
  }
  globalThis.FundingModel = {ALLOCATIONS, dateParts, months, defaultPlan, ensurePlan, activeRounds, summary, allocated, balance, normalizeRound, updateRound, updateAmount, selectPreset, fundingForYear, schedule, roundRamp, issues};
})();
