/** Shipyard economy — the same rules the server room enforces (generated alongside src/logic.js). */
// ── shipyard economy (shared verbatim by the server room and the client) ──
const ECON_SHIPS = {
  fletcher: { tier: 1, price: 9000, rank: 0 },
  cleveland: { tier: 2, price: 18000, rank: 0 },
  colorado: { tier: 3, price: 30000, rank: 0 },
  baltimore: { tier: 3, price: 32000, rank: 1 },
  northcarolina: { tier: 4, price: 56000, rank: 3 },
  iowa: { tier: 5, price: 95000, rank: 5 },
};
/** The commander's rank (US Navy officer grades), earned with experience. */
const ECON_RANKS = ["소위", "중위", "대위", "소령", "중령", "대령", "준장", "소장", "중장", "대장", "원수"];
const ECON_RANK_XP = [0, 350, 900, 1700, 3000, 5000, 8000, 12500, 19000, 28000, 40000]; /* 소위 → 원수; ship and nation gates still count from 소령 (index 3) */
function econRank(xp) { let r = 0; for (let i = 0; i < ECON_RANK_XP.length; i++) if (xp >= ECON_RANK_XP[i]) r = i; return r; }
const ECON_MISSIONS = ["fleet", "convoy", "raid", "modern"];
const ECON_PARTS = ["engine", "fc", "gun", "armor"];
const ECON_MAX_LV = 3;
/** Admin code check: only a hash of the code ships with the game. */
function econHash(t) { let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; }
const ECON_ADMIN = 0x742ce8b8;
const econIsAdminCode = (code) => typeof code === "string" && code.length <= 64 && (econHash("steeltide:" + code.trim().toUpperCase()) === ECON_ADMIN || code.trim().toLowerCase() === "hydro");
function econPartCost(ship, part, lv) {
  return Math.round((1200 + 800 * ECON_SHIPS[ship].tier) * (lv + 1) * (part === "gun" ? 1.25 : 1));
}
function econNewProfile() {
  return { money: 8000, xp: 0, owned: ["colorado"], ship: "colorado", upg: { colorado: { engine: 0, fc: 0, gun: 0, armor: 0 } },
    battles: 0, wins: 0, shots: 0, hits: 0, bestSeconds: null, last: null };
}
/** A record written by an older version of the game becomes a fresh profile that keeps its battle record. */
function econProfile(state) {
  if (state && state.profile) return state.profile;
  const p = econNewProfile();
  if (state) for (const k of ["battles", "wins", "shots", "hits", "bestSeconds"]) if (state[k] !== undefined) p[k] = state[k];
  return p;
}
function econReward(a) {
  const k = (0.7 + 0.15 * a.tier) * (a.won && a.mission && a.mission !== "fleet" ? 1.3 : 1), planes = a.planes || 0, caps = a.caps || 0;
  const money = ((a.won ? 2600 : 700) + a.hits * 120 + a.bombs * 400 + Math.min(a.bullets, 400) * 4 + planes * 150 + caps * 1800 + (a.won ? Math.max(0, 1500 - a.seconds * 3) : 0)) * k;
  const xp = ((a.won ? 300 : 90) + a.hits * 15 + a.bombs * 40 + planes * 25 + caps * 120) * k;
  return { money: Math.round(money), xp: Math.round(xp) };
}
const econInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
/** null when the action is legal for this profile, otherwise the reason. */
function econCheck(p, a) {
  if (!a || typeof a !== "object") return "bad action";
  if (a.kind === "result") {
    if (typeof a.won !== "boolean") return "won must be boolean";
    if (!econInt(a.shots, 0, 5000) || !econInt(a.hits, 0, a.shots) || !econInt(a.seconds, 1, 36000)) return "result out of range";
    if (!econInt(a.tier, 1, 5) || !econInt(a.bombs, 0, 20) || !econInt(a.bullets, 0, 20000)) return "result out of range";
    if (a.planes !== undefined && !econInt(a.planes, 0, 200)) return "result out of range";
    if (a.caps !== undefined && !econInt(a.caps, 0, 10)) return "result out of range";
    if (a.mission !== undefined && ECON_MISSIONS.indexOf(a.mission) < 0) return "unknown mission";
    return null;
  }
  if (a.kind === "buy") {
    if (!ECON_SHIPS[a.ship]) return "unknown ship";
    if (p.owned.indexOf(a.ship) >= 0) return "already owned";
    if (!p.admin && Math.max(0, econRank(p.xp) - 3) < ECON_SHIPS[a.ship].rank) return "rank too low";
    if (!p.admin && p.money < ECON_SHIPS[a.ship].price) return "not enough credits";
    return null;
  }
  if (a.kind === "admin") return econIsAdminCode(a.code) ? null : "bad code";
  if (a.kind === "setxp") return p.admin && econInt(a.xp, 0, 10000000) ? null : "admin only"; /* admin: jump to any rank for testing */
  if (a.kind === "select") return p.owned.indexOf(a.ship) >= 0 ? null : "not owned";
  if (a.kind === "upgrade") {
    if (p.owned.indexOf(a.ship) < 0) return "not owned";
    if (ECON_PARTS.indexOf(a.part) < 0) return "unknown part";
    const lv = p.upg[a.ship][a.part];
    if (lv >= ECON_MAX_LV) return "max level";
    if (!p.admin && p.money < econPartCost(a.ship, a.part, lv)) return "not enough credits";
    return null;
  }
  return "unknown action";
}
function econApply(p, a) {
  const q = { ...p, owned: p.owned.slice(), upg: { ...p.upg } };
  if (a.kind === "result") {
    const r = econReward(a);
    q.money += r.money; q.xp += r.xp; q.battles += 1; q.wins += a.won ? 1 : 0; q.shots += a.shots; q.hits += a.hits;
    if (a.won && (q.bestSeconds === null || a.seconds < q.bestSeconds)) q.bestSeconds = a.seconds;
    q.last = { ...r, won: a.won };
  } else if (a.kind === "buy") {
    if (!q.admin) q.money -= ECON_SHIPS[a.ship].price; q.owned.push(a.ship); q.upg[a.ship] = { engine: 0, fc: 0, gun: 0, armor: 0 }; q.ship = a.ship;
  } else if (a.kind === "setxp") {
    q.xp = a.xp;
  } else if (a.kind === "admin") {
    q.admin = true;
  } else if (a.kind === "select") {
    q.ship = a.ship;
  } else if (a.kind === "upgrade") {
    const lv = q.upg[a.ship][a.part];
    if (!q.admin) q.money -= econPartCost(a.ship, a.part, lv); q.upg[a.ship] = { ...q.upg[a.ship], [a.part]: lv + 1 };
  }
  return q;
}

export { ECON_SHIPS, ECON_RANKS, ECON_RANK_XP, econRank, ECON_PARTS, ECON_MAX_LV, econPartCost, econNewProfile, econProfile, econReward, econCheck, econApply };
