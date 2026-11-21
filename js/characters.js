const manifestKey = "steeltide:characters";
const prefix = "steeltide:character:";
const scoped = new Set([
  "c72", "camp", "career", "cmdr", "duty", "endings", "hall", "hall:us",
  "kcamp", "legacy", "mission", "mod", "oplog", "post", "potus", "potus_hall",
  "pres", "profile", "staff", "us:career", "uspres",
]);

const browser = typeof window !== "undefined";
const raw = () => globalThis.localStorage;
const keyFor = (id, key) => `${prefix}${id}:${key}`;
function json(key, fallback) {
  try { return JSON.parse(raw().getItem(key)) ?? fallback; }
  catch { return fallback; }
}
const manifest = () => json(manifestKey, { active: null, slots: [] });
let active = null;

if (browser) {
  const oldStaff = json("steeltide:staff", null);
  const oldName = json("steeltide:cmdr", null);
  let state = manifest();
  if (!raw().getItem(manifestKey) && (oldStaff?.branch || oldName?.name)) {
    const slot = { id: crypto.randomUUID(), nation: oldStaff?.nation === "us" ? "us" : "kr" };
    for (const name of scoped) {
      const key = `steeltide:${name}`;
      const value = raw().getItem(key);
      if (value !== null) raw().setItem(keyFor(slot.id, key), value);
    }
    state = { active: slot.id, slots: [slot] };
    raw().setItem(manifestKey, JSON.stringify(state));
    for (const name of scoped) raw().removeItem(`steeltide:${name}`);
  }
  active = state.slots.some(slot => slot.id === state.active && !slot.archived) ? state.active : null;
}

function resolveKey(key) {
  return browser && scoped.has(key.slice("steeltide:".length)) && key.startsWith("steeltide:")
    ? keyFor(active || "draft", key)
    : key;
}

export const careerStorage = {
  getItem: key => raw().getItem(resolveKey(key)),
  setItem(key, value) {
    const target = resolveKey(key);
    if (target !== key && active && !manifest().slots.some(s => s.id === active && !s.archived)) return;
    raw().setItem(target, value);
  },
  removeItem(key) {
    const target = resolveKey(key);
    if (target !== key && active && !manifest().slots.some(s => s.id === active && !s.archived)) return;
    raw().removeItem(target);
  },
};

export const activeCharacterId = () => active;
export function characters() {
  return manifest().slots.map(slot => ({
    ...slot,
    commander: json(keyFor(slot.id, "steeltide:cmdr"), {}),
    staff: json(keyFor(slot.id, "steeltide:staff"), {}),
    career: json(keyFor(slot.id, "steeltide:career"), {}),
    duty: json(keyFor(slot.id, "steeltide:duty"), {}),
  }));
}

export function createCharacter(nation, entries) {
  const state = manifest();
  if (state.slots.filter(slot => !slot.archived).length >= 5) return false;
  const slot = { id: crypto.randomUUID(), nation };
  for (const [key, value] of Object.entries(entries)) {
    raw().setItem(keyFor(slot.id, key), JSON.stringify(value));
  }
  state.slots.push(slot);
  state.active = slot.id;
  raw().setItem(manifestKey, JSON.stringify(state));
  return true;
}

export function selectCharacter(id) {
  const state = manifest();
  if (!state.slots.some(slot => slot.id === id && !slot.archived)) return false;
  state.active = id;
  raw().setItem(manifestKey, JSON.stringify(state));
  return true;
}

export function removeCharacter(id, retain) {
  const state = manifest();
  const slot = state.slots.find(entry => entry.id === id);
  if (!slot || slot.archived && retain) return false;
  if (state.active === id) state.active = null;
  if (retain) slot.archived = true;
  else state.slots = state.slots.filter(entry => entry.id !== id);
  raw().setItem(manifestKey, JSON.stringify(state));
  if (!retain) for (const name of scoped) raw().removeItem(keyFor(id, `steeltide:${name}`));
  return true;
}
