/**
 * Steel Tide — ships: guns and ballistics, the ship catalogue (real US Navy
 * ships for the player, fictional enemies), procedural models, the Ship
 * simulation, shells, damage and the computer captains.
 */
import { landAt } from "./core.js";
import { THREE, PI, TAU, DEG, KN, GRAV, clamp, wrap, fmt, rnd, gauss, G, scene, camera, mat, box, cyl, shadowed, lines, WEAR, paint, SCHEMES, hullTexture, upperTexture, deckTexture, textTex,
  smoke, flash, spray, spark, rings, spawnSplash, spawnWake } from "./core.js";
import { A, sfx, at } from "./audio.js";

// ── guns + exterior ballistics (quadratic drag, k = ρ·Cd·A / 2m) ────────────
export const GUNS = {
  "5/62":   { name: '5인치/62구경 Mk 45 Mod 4',      cal: 127, V0: 808, k: 6.0e-5,  maxEl: 65, dmg: [1.7, 2.8], reload: 3, train: 30, elev: 20, disp: 0.011, len: 6.3 },
  "130":    { name: '130mm H/PJ-38',                cal: 130, V0: 850, k: 6.0e-5,  maxEl: 65, dmg: [1.7, 2.9], reload: 3.2, train: 30, elev: 20, disp: 0.012, len: 6.5 },
  "76":     { name: '76mm/62 함포',                 cal: 76,  V0: 925, k: 1.0e-4,  maxEl: 85, dmg: [0.6, 1.0], reload: 1.2, train: 60, elev: 35, disp: 0.012, len: 4.7 },
  "100":    { name: '100mm 함포',                   cal: 100, V0: 880, k: 9.0e-5,  maxEl: 80, dmg: [0.8, 1.4], reload: 2, train: 30, elev: 20, disp: 0.014, len: 5.6 },
  "5/38":   { name: '5인치/38구경 Mk 12',            cal: 127, V0: 792, k: 9.0e-5,  maxEl: 45, dmg: [0.55, 1.0], reload: 4, train: 25, elev: 15, disp: 0.014, len: 4.8 },
};
/** Game-speed reload: the listed (historical) cycle × this factor. */
export const RELOAD_K = 0.6;
const MUZZLE_H = 10, TABLES = {};
function simShot(g, elev) {
  let x = 0, y = MUZZLE_H, vx = g.V0 * Math.cos(elev), vy = g.V0 * Math.sin(elev), t = 0; const dt = 0.02;
  while (y > 0 && t < 160) { const v = Math.hypot(vx, vy); vx -= g.k * v * vx * dt; vy -= (GRAV + g.k * v * vy) * dt; x += vx * dt; y += vy * dt; t += dt; }
  return { range: x, time: t, fall: Math.atan2(-vy, vx) };
}
/** Range table for a gun: elevation → range / time of flight, up to its maximum range. */
export function table(key) {
  if (!TABLES[key]) {
    const g = GUNS[key], T = []; let best = 0;
    for (let e = -0.5; e <= g.maxEl + 1e-6; e += 0.25) { const r = simShot(g, e * DEG); if (r.range <= best) break; best = r.range; T.push({ elev: e * DEG, ...r }); }
    TABLES[key] = { T, max: best, min: Math.max(1200, T[0].range) };
  }
  return TABLES[key];
}
export function solve(tb, range) {
  const T = tb.T; range = clamp(range, T[0].range, tb.max);
  for (let i = 1; i < T.length; i++) if (T[i].range >= range) { const a = T[i - 1], b = T[i], k = (range - a.range) / (b.range - a.range || 1); return { elev: a.elev + (b.elev - a.elev) * k, time: (a.time + (b.time - a.time) * k) / G.SHELL }; }
  const e = T[T.length - 1]; return { elev: e.elev, time: e.time / G.SHELL }; // time on the game clock (shells fly G.SHELL x faster)
}

// ── catalogue ───────────────────────────────────────────────────────────────
const US = { hull: 0x7a848b, deck: 0xa58b62, upper: 0x86909a };
const T1 = (x, up, rest) => ({ x, up, rest, n: 1 });
export const SHIPS = {}; /* WWII fleet removed (branch ww2-archive) */
const hexN = (h) => parseInt(h.slice(1), 16);
/** Liberty-type transport (convoy missions) and the enemy fleet carrier (fictional). */
// ── modern era (현대전): hulls + magazines. Ranges/speeds are game values (see the design doc: ~1/15 of real reach, order kept) ──
const MOD = (o) => ({ D: 6.4, sheer: 2.4, belt: 25, planks: false, modern: true, aa: 0, range: [13000, 22000], ...o });
const HZ = { hull: 0x7b848a, deck: 0x5d6569, upper: 0x8c959b }, PLA_C = { hull: 0x8e979a, deck: 0x707879, upper: 0xa0a8ab }, KPN_C = { hull: 0x5c6467, deck: 0x55595b, upper: 0x6c7477 };
export const MODERN = {
  ford: MOD({ id: "ford", name: "USS 제럴드 R. 포드 (CVN-78)", short: "포드", cls: "항공모함", tier: 5, L: 333, B: 41, deckW: 78, fb: 9, vmax: 30, turn: 2.2, hp: 320, gun: "5/62", style: "mcarrier", ...HZ, paint: "haze", hullNo: "78", deckHex: "#4a4f53", turrets: [],
    vls: { S: ["ESSM", 16] }, pd: ["RAM", 21], nation: "us", angled: true, nuke: true, islandX: -30, jets: { n: 6, type: "F/A-18E", asm: "LRASM", aam: "AIM-120" } }),
  shandong: MOD({ id: "shandong", name: "항공모함 '산둥' (17)", short: "산둥", cls: "항공모함", tier: 5, L: 315, B: 38, deckW: 75, fb: 9, vmax: 29, turn: 2.2, hp: 300, gun: "130", style: "mcarrier", ...PLA_C, paint: "plagray", hullNo: "17", deckHex: "#5a6062", turrets: [],
    vls: {}, pd: ["HQ-10", 36], nation: "cn", angled: true, ski: true, islandX: 10, jets: { n: 6, type: "J-15", asm: "YJ-83K", aam: "PL-12" } }),
  kaga: MOD({ id: "kaga", name: "JS 가가 (DDH-184)", short: "가가", cls: "헬기 탑재 호위함 (F-35B 개장)", tier: 5, L: 248, B: 38, deckW: 38, fb: 8, vmax: 30, turn: 2.6, hp: 240, gun: "5/62", style: "mcarrier", ...HZ, paint: "haze", hullNo: "184", deckHex: "#4a4f53", turrets: [],
    vls: {}, pd: ["SeaRAM", 22], nation: "jp", islandX: 10, jets: { n: 4, type: "F-35B", asm: "JSM", aam: "AIM-120" } }),
  dokdo: MOD({ id: "dokdo", name: "ROKS 독도 (LPH-6111)", short: "독도", cls: "대형 수송함 (F-35B 탑재 가정)", tier: 5, L: 199, B: 31, deckW: 31, fb: 7.5, vmax: 23, turn: 3, hp: 200, gun: "5/62", style: "mcarrier", ...HZ, paint: "kgray", hullNo: "6111", deckHex: "#4a4f53", turrets: [],
    vls: {}, pd: ["RAM", 21], nation: "kr", islandX: 5, jets: { n: 4, type: "F-35B (가정)", asm: "JSM", aam: "AIM-120" } }),
  burke: MOD({ id: "burke", name: "USS 잭 H. 루카스 (DDG-125)", short: "잭 H. 루카스", cls: "이지스 구축함", tier: 5, L: 155, B: 20, fb: 7, vmax: 31, turn: 4.6, hp: 130, gun: "5/62", style: "aegis", ...HZ, paint: "haze", hullNo: "125", deckHex: "#5d6569", turrets: [T1(60, 0, 0)],
    vls: { L: ["SM-6", 16], M: ["SM-2", 32], S: ["ESSM", 32], A: ["MST", 16] }, pd: ["SeaRAM", 11], nation: "us" }),
  burke2: MOD({ id: "burke2", name: "USS 프랭크 E. 피터슨 (DDG-121)", short: "피터슨", cls: "이지스 구축함", tier: 5, L: 155, B: 20, fb: 7, vmax: 31, turn: 4.6, hp: 120, gun: "5/62", style: "aegis", ...HZ, paint: "haze", hullNo: "121", deckHex: "#5d6569", turrets: [T1(60, 0, 0)],
    vls: { L: ["SM-6", 8], M: ["SM-2", 24], S: ["ESSM", 24], A: ["NSM", 12] }, pd: ["SeaRAM", 11], nation: "us" }),
  jeongjo: MOD({ id: "jeongjo", name: "ROKS 정조대왕 (DDG-995)", short: "정조대왕", cls: "이지스 구축함", tier: 5, L: 170, B: 21.4, fb: 7.4, vmax: 30, turn: 4.2, hp: 140, gun: "5/62", style: "aegis", ...HZ, paint: "kgray", hullNo: "995", deckHex: "#5a6266", turrets: [T1(66, 0, 0)], cans: 4,
    vls: { L: ["SM-6", 12], M: ["SM-2", 32], S: ["K-SAAM", 16], A: ["해성", 16], B: ["초음속 대함", 4] }, pd: ["RAM", 21], nation: "kr" }),
  jeongjo2: MOD({ id: "jeongjo2", name: "ROKS 다산정약용 (DDG-996)", short: "다산정약용", cls: "이지스 구축함", tier: 5, L: 170, B: 21.4, fb: 7.4, vmax: 30, turn: 4.2, hp: 130, gun: "5/62", style: "aegis", ...HZ, paint: "kgray", hullNo: "996", deckHex: "#5a6266", turrets: [T1(66, 0, 0)], cans: 4,
    vls: { L: ["SM-6", 8], M: ["SM-2", 24], S: ["K-SAAM", 16], A: ["해성", 16], B: ["초음속 대함", 4] }, pd: ["RAM", 21], nation: "kr" }),
  /* 한국 해군 함정 진급 경로 (소위 PKG → 소령 FFG → 중령 DDH → 대령 DDG → 준장 정조대왕). 치수·무장 종류는 공개 자료, 탄약 수는 게임 값 */
  pkg: MOD({ id: "pkg", name: "ROKS 윤영하 (PKG-711)", short: "윤영하", cls: "유도탄고속함", tier: 1, L: 63, B: 9, D: 2.8, sheer: 1, fb: 3.4, vmax: 40, turn: 7.5, hp: 46, gun: "76", style: "patrol", ...HZ, paint: "kgray", hullNo: "711", deckHex: "#5a6266", turrets: [T1(21, 0, 0)], cans: 2,
    vls: { A: ["해성", 4] }, pd: null, nation: "kr" }),
  pkg2: MOD({ id: "pkg2", name: "ROKS 한상국 (PKG-712)", short: "한상국", cls: "유도탄고속함", tier: 1, L: 63, B: 9, D: 2.8, sheer: 1, fb: 3.4, vmax: 40, turn: 7.5, hp: 42, gun: "76", style: "patrol", ...HZ, paint: "kgray", hullNo: "712", deckHex: "#5a6266", turrets: [T1(21, 0, 0)], cans: 2,
    vls: { A: ["해성", 4] }, pd: null, nation: "kr" }),
  ffg: MOD({ id: "ffg", name: "ROKS 대구 (FFG-818)", short: "대구", cls: "대구급 호위함", tier: 2, L: 122, B: 14, D: 4.2, sheer: 1.8, fb: 5.4, vmax: 30, turn: 5.6, hp: 82, gun: "5/62", style: "frigate", ...HZ, paint: "kgray", hullNo: "818", deckHex: "#5a6266", turrets: [T1(45, 0, 0)], cans: 4,
    ff: { vf: [2, 8], va: null, stacks: 1, heli: true }, vls: { S: ["K-SAAM", 16], A: ["해성", 8] }, pd: ["팰렁스", 12], nation: "kr" }),
  ffg2: MOD({ id: "ffg2", name: "ROKS 경남 (FFG-819)", short: "경남", cls: "대구급 호위함", tier: 2, L: 122, B: 14, D: 4.2, sheer: 1.8, fb: 5.4, vmax: 30, turn: 5.6, hp: 78, gun: "5/62", style: "frigate", ...HZ, paint: "kgray", hullNo: "819", deckHex: "#5a6266", turrets: [T1(45, 0, 0)], cans: 4,
    ff: { vf: [2, 8], va: null, stacks: 1, heli: true }, vls: { S: ["K-SAAM", 12], A: ["해성", 8] }, pd: ["팰렁스", 12], nation: "kr" }),
  ddh: MOD({ id: "ddh", name: "ROKS 충무공이순신 (DDH-975)", short: "충무공이순신", cls: "충무공이순신급 구축함", tier: 3, L: 150, B: 17.4, D: 5.2, fb: 6.4, vmax: 29, turn: 4.8, hp: 108, gun: "5/62", style: "frigate", ...HZ, paint: "kgray", hullNo: "975", deckHex: "#5a6266", turrets: [T1(55, 0, 0)], cans: 4,
    ff: { vf: [4, 8], va: [3, 8], stacks: 2, heli: true, ram: true }, vls: { M: ["SM-2", 24], A: ["해성", 8] }, pd: ["RAM", 21], nation: "kr" }),
  ddh2: MOD({ id: "ddh2", name: "ROKS 문무대왕 (DDH-976)", short: "문무대왕", cls: "충무공이순신급 구축함", tier: 3, L: 150, B: 17.4, D: 5.2, fb: 6.4, vmax: 29, turn: 4.8, hp: 104, gun: "5/62", style: "frigate", ...HZ, paint: "kgray", hullNo: "976", deckHex: "#5a6266", turrets: [T1(55, 0, 0)], cans: 4,
    ff: { vf: [4, 8], va: [3, 8], stacks: 2, heli: true, ram: true }, vls: { M: ["SM-2", 20], A: ["해성", 8] }, pd: ["RAM", 21], nation: "kr" }),
  ddg: MOD({ id: "ddg", name: "ROKS 세종대왕 (DDG-991)", short: "세종대왕", cls: "세종대왕급 이지스 구축함", tier: 4, L: 166, B: 21.4, fb: 7.2, vmax: 30, turn: 4.3, hp: 128, gun: "5/62", style: "aegis", ...HZ, paint: "kgray", hullNo: "991", deckHex: "#5a6266", turrets: [T1(63, 0, 0)], cans: 4,
    vls: { M: ["SM-2", 40], A: ["해성", 16] }, pd: ["RAM", 21], nation: "kr" }),
  ddg2: MOD({ id: "ddg2", name: "ROKS 율곡이이 (DDG-992)", short: "율곡이이", cls: "세종대왕급 이지스 구축함", tier: 4, L: 166, B: 21.4, fb: 7.2, vmax: 30, turn: 4.3, hp: 122, gun: "5/62", style: "aegis", ...HZ, paint: "kgray", hullNo: "992", deckHex: "#5a6266", turrets: [T1(63, 0, 0)], cans: 4,
    vls: { M: ["SM-2", 32], A: ["해성", 16] }, pd: ["RAM", 21], nation: "kr" }),
  /* 북한 소형 전투함 (위관·소령 상대) */
  nkosa: MOD({ id: "nkosa", name: "북한 유도탄정", short: "유도탄정", cls: "유도탄정 (오사급 계열)", tier: 1, L: 39, B: 7.6, D: 2, sheer: 0.8, fb: 2.6, vmax: 37, turn: 8, hp: 18, gun: "76", style: "patrol", ...KPN_C, paint: "kpn", hullNo: "", deckHex: "#55595b", turrets: [T1(12, 0, 0)], cans: 1,
    vls: { A: ["스틱스", 2] }, pd: null, nation: "nk" }),
  najin: MOD({ id: "najin", name: "북한 호위함", short: "나진급", cls: "나진급 호위함", tier: 2, L: 102, B: 10.5, D: 3.4, sheer: 1.6, fb: 4.6, vmax: 25, turn: 5, hp: 58, gun: "100", style: "frigate", ...KPN_C, paint: "kpn", hullNo: "531", deckHex: "#55595b", turrets: [T1(38, 0, 0)], cans: 2,
    ff: { vf: null, va: null, stacks: 1, heli: false }, vls: { A: ["스틱스", 4] }, pd: null, nation: "nk" }),
  maya: MOD({ id: "maya", name: "JS 마야 (DDG-179)", short: "마야", cls: "이지스 호위함", tier: 5, L: 170, B: 21, fb: 7.3, vmax: 30, turn: 4.3, hp: 135, gun: "5/62", style: "aegis", ...HZ, paint: "haze", hullNo: "179", deckHex: "#5d6569", turrets: [T1(66, 0, 0)], cans: 4,
    vls: { L: ["SM-6", 12], M: ["SM-2", 32], S: ["ESSM", 32], A: ["17식", 16] }, pd: ["SeaRAM", 11], nation: "jp" }),
  haguro: MOD({ id: "haguro", name: "JS 하구로 (DDG-180)", short: "하구로", cls: "이지스 호위함", tier: 5, L: 170, B: 21, fb: 7.3, vmax: 30, turn: 4.3, hp: 125, gun: "5/62", style: "aegis", ...HZ, paint: "haze", hullNo: "180", deckHex: "#5d6569", turrets: [T1(66, 0, 0)], cans: 4,
    vls: { L: ["SM-6", 8], M: ["SM-2", 24], S: ["ESSM", 24], A: ["17식", 12] }, pd: ["SeaRAM", 11], nation: "jp" }),
  t055: MOD({ id: "t055", name: "055형 구축함 '난창'", short: "난창", cls: "055형 구축함", tier: 5, L: 180, B: 20, fb: 7.4, vmax: 30, turn: 4, hp: 150, gun: "130", style: "pla", ...PLA_C, paint: "plagray", hullNo: "101", deckHex: "#707879", turrets: [T1(70, 0, 0)],
    vls: { L: ["HHQ-9", 28], S: ["HHQ-16", 24], A: ["YJ-18", 16], B: ["YJ-21", 2] }, pd: ["HQ-10", 24], nation: "cn" }),
  t055b: MOD({ id: "t055b", name: "055형 구축함 '라싸'", short: "라싸", cls: "055형 구축함", tier: 5, L: 180, B: 20, fb: 7.4, vmax: 30, turn: 4, hp: 140, gun: "130", style: "pla", ...PLA_C, paint: "plagray", hullNo: "102", deckHex: "#707879", turrets: [T1(70, 0, 0)],
    vls: { L: ["HHQ-9", 24], S: ["HHQ-16", 16], A: ["YJ-18", 16] }, pd: ["HQ-10", 24], nation: "cn" }),
  choehyon: MOD({ id: "choehyon", name: "최현호 (51)", short: "최현", cls: "최현급 구축함", tier: 5, L: 144, B: 16, fb: 6.4, vmax: 28, turn: 4.8, hp: 110, gun: "5/62", style: "kpn", ...KPN_C, paint: "kpn", hullNo: "51", deckHex: "#55595b", turrets: [T1(56, 0, 0)],
    vls: { M: ["함대공(추정)", 32], A: ["순항미사일", 24], B: ["초음속 순항", 4] }, pd: ["판치르-M", 32], nation: "nk" }),
  kangkon: MOD({ id: "kangkon", name: "강건호 (52)", short: "강건", cls: "최현급 구축함", tier: 5, L: 144, B: 16, fb: 6.4, vmax: 28, turn: 4.8, hp: 105, gun: "5/62", style: "kpn", ...KPN_C, paint: "kpn", hullNo: "52", deckHex: "#55595b", turrets: [T1(56, 0, 0)],
    vls: { M: ["함대공(추정)", 24], A: ["순항미사일", 24], B: ["초음속 순항", 4] }, pd: ["판치르-M", 32], nation: "nk" }),
};
export const TRANSPORT = { id: "transport", name: "수송선", short: "수송선", cls: "수송선", tier: 0, L: 135, B: 17.3, D: 8.5, fb: 6, sheer: 1.6, vmax: 15, turn: 3, hp: 42, belt: 10,
  gun: "5/38", style: "cargo", ...US, paint: "ms1", hullNo: "", deckHex: "#5b5348", planks: false, turrets: [T1(-58, 0, PI)], aa: 0.25 };
TRANSPORT.upper = hexN(SCHEMES[TRANSPORT.paint].upper);
export const paintName = (sp) => SCHEMES[sp.paint].name;

export function loadModels() {} /* the WWII GLB models (Colorado, F4F) went with the WWII fleet */

// ── hull ────────────────────────────────────────────────────────────────────
export function halfBeam(spec, t) {
  if (spec.modern && spec.style !== "mcarrier") { // broad transom stern, long fine entry like a modern destroyer
    const s = t < 0.12 ? 0.82 + 0.18 * Math.sin((t / 0.12) * PI / 2) : 1, w = t > 0.5 ? Math.pow(Math.cos(((t - 0.5) / 0.5) * PI / 2), 0.95) : 1;
    return Math.max((spec.B / 2) * s * w, 0.3);
  }
  const s = t < 0.22 ? 0.5 + 0.5 * Math.sin((t / 0.22) * PI / 2) : 1;
  const w = t > 0.6 ? Math.pow(Math.cos(((t - 0.6) / 0.4) * PI / 2), 0.75) : 1;
  return Math.max((spec.B / 2) * s * w, 0.3);
}
const freeboard = (spec, t) => spec.fb + (t > 0.7 ? ((t - 0.7) / 0.3) * spec.sheer : 0);
export const deckY = (spec, x) => freeboard(spec, (x + spec.L / 2) / spec.L);
function buildHull(spec) {
  const N = 48, L = spec.L, R = 7, Ht = spec.fb + spec.sheer + spec.D;
  const pos = [], idx = [], uv = [], vid = (i, side, j) => (i * 2 + side) * R + j;
  for (let i = 0; i <= N; i++) {
    const t = i / N, x = -L / 2 + t * L, hb = halfBeam(spec, t), fbv = freeboard(spec, t);
    const rg = [[fbv, 1], [1.0, 0.995], [1.0, 0.995], [-0.4, 0.985], [-0.4, 0.985], [-spec.D * 0.7, 0.86], [-spec.D, 0.12]];
    for (let side = 0; side < 2; side++) for (let j = 0; j < R; j++) {
      const [y, k] = rg[j], rake = t > 0.9 && y > 0 ? ((t - 0.9) / 0.1) * (y / fbv) * (L * 0.03) : 0;
      pos.push(x + rake, y, (side ? 1 : -1) * hb * k); uv.push(t, (y + spec.D) / Ht);
    }
  }
  for (let i = 0; i < N; i++) for (let side = 0; side < 2; side++) for (let j = 0; j < R - 1; j++) { const a = vid(i, side, j), b = vid(i + 1, side, j), c = vid(i + 1, side, j + 1), d = vid(i, side, j + 1); idx.push(a, b, c, a, c, d); }
  for (let j = 0; j < R - 1; j++) { const a = vid(0, 0, j), b = vid(0, 1, j), c = vid(0, 1, j + 1), d = vid(0, 0, j + 1); idx.push(a, b, c, a, c, d); }
  const nSide = idx.length, base = pos.length / 3;
  for (let i = 0; i <= N; i++) { const t = i / N, x = -L / 2 + t * L, hb = halfBeam(spec, t), y = freeboard(spec, t), rake = t > 0.9 ? ((t - 0.9) / 0.1) * (L * 0.03) : 0;
    for (const s of [-1, 1]) { pos.push(x + rake, y, s * hb); uv.push((s * hb) / 8, x / 24); } }
  for (let i = 0; i < N; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.addGroup(0, nSide, 0); geo.addGroup(nSide, idx.length - nSide, 1); geo.computeVertexNormals();
  const side = new THREE.MeshStandardMaterial({ map: hullTexture(spec), side: THREE.DoubleSide, roughness: 0.72, metalness: 0.2 });
  const deck = new THREE.MeshStandardMaterial({ map: deckTexture(spec.deckHex, spec.planks), roughness: 0.9, metalness: 0.05 });
  return shadowed(new THREE.Mesh(geo, [side, deck]));
}
/** Painted hull number on both bows. */
function hullNumber(g, spec) {
  if (!spec.hullNo) return;
  const tex = textTex(spec.hullNo), m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const x = spec.L * 0.36, t = (x + spec.L / 2) / spec.L, hb = halfBeam(spec, t), dh = (halfBeam(spec, t + 0.01) - hb) / (spec.L * 0.01);
  const h = Math.min(spec.fb * 0.5, 3.2), w = h * 2;
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, freeboard(spec, t) * 0.55 + 0.6, s * (hb + 0.06)); p.rotation.y = s > 0 ? Math.atan(dh) : PI - Math.atan(dh); g.add(p); }
}
function hullDetails(g, spec) {
  const L = spec.L, xs = [], rows = spec.modern ? [] : spec.L > 150 ? [spec.fb - 2.1, spec.fb - 4.3] : [spec.fb - 1.8]; // no porthole rows on modern hulls
  for (let x = -L * 0.37; x <= L * 0.38; x += L > 150 ? 4.2 : 3.2) xs.push(x);
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.55, 0.25), new THREE.MeshBasicMaterial({ color: 0x0b0d0f }), xs.length * 2 * rows.length), m = new THREE.Matrix4(); let n = 0;
  for (const x of xs) { const hb = halfBeam(spec, (x + L / 2) / L); for (const s of [1, -1]) for (const yy of rows) { m.makeTranslation(x, yy, s * (hb * 0.997 + 0.03)); inst.setMatrixAt(n++, m); } }
  g.add(inst);
  if (spec.style === "carrier") return;
  const pts = [], N = 64;
  for (let i = 2; i < N - 1; i++) for (const s of [1, -1]) {
    const P = (t) => [-L / 2 + t * L, freeboard(spec, t), s * (halfBeam(spec, t) - 0.25)], a = P(i / N), b = P((i + 1) / N);
    pts.push(a[0], a[1] + 1.1, a[2], b[0], b[1] + 1.1, b[2], a[0], a[1] + 0.55, a[2], b[0], b[1] + 0.55, b[2], a[0], a[1], a[2], a[0], a[1] + 1.1, a[2]);
  }
  lines(g, pts);
}

// ── superstructure styles ───────────────────────────────────────────────────
const latticeMat = new THREE.LineBasicMaterial({ color: 0x626a70 });
const coreMat = new THREE.MeshStandardMaterial({ color: 0x7b8489, transparent: true, opacity: 0.42 });
/** Modern flattop: hangar hull, overhanging flight deck (angled deck / ski jump), starboard island with radar faces, parked jets. */
function mcarrier(g, spec) {
  const U = spec.upper, y = spec.fb, L = spec.L, B = spec.B, W = spec.deckW || B, yd = y + 7.2, iz = W * 0.4, ix = spec.islandX || 0;
  box(g, L * 0.86, 7.2, B * 0.96, U, -L * 0.02, y, 0);
  box(g, L * 0.96, 1.1, W * (spec.angled ? 0.62 : 1), spec.deck, 0, yd, spec.angled ? W * 0.18 : 0);
  if (spec.angled) { const a = box(g, L * 0.6, 1.08, W * 0.42, spec.deck, -L * 0.1, yd + 0.01, -W * 0.16); a.rotation.y = 0.15; const m = box(g, L * 0.55, 0.05, 0.6, 0xe6e6dc, -L * 0.1, yd + 1.1, -W * 0.16); m.rotation.y = 0.15; }
  if (spec.ski) { const s = box(g, 30, 1.1, W * 0.45, spec.deck, L * 0.44, yd + 1.5, 0); s.rotation.z = 0.2; }
  box(g, L * 0.9, 0.05, 0.6, 0xe6e6dc, 0, yd + 1.11, spec.angled ? W * 0.18 : 0);
  for (const s of [1, -1]) box(g, L * 0.9, 0.05, 0.35, 0xe6e6dc, 0, yd + 1.11, (spec.angled ? W * 0.18 : 0) + s * W * (spec.angled ? 0.29 : 0.46));
  box(g, 30, 12, 8, U, ix, yd + 1.1, iz); box(g, 20, 6, 7, U, ix + 2, yd + 13.1, iz); box(g, 12, 4, 6, 0x1d2124, ix + 4, yd + 15, iz + 0.2);
  for (const s of [1, -1]) { const p = box(g, 0.3, 5, 4.2, 0x3f474c, ix + 7 + s * 0, yd + 13.5, iz + s * 3.2); p.rotation.x = s * 0.3; }
  cyl(g, 0.6, 0.9, 16, 0x50585d, ix - 3, yd + 19, iz, 8); box(g, 0.4, 0.4, 9, 0x3d4448, ix - 3, yd + 31, iz);
  // Flight-deck stern threshold chevrons, optical landing "meatball" datum bar & navigation running lights
  const deckAmber = new THREE.MeshBasicMaterial({ color: 0xffb830 }), deckGrn = new THREE.MeshBasicMaterial({ color: 0x3dff7a });
  const meatball = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 2.2), deckAmber); meatball.position.set(-L * 0.24, yd + 1.5, -W * 0.43); g.add(meatball);
  const thrStripe = new THREE.Mesh(new THREE.PlaneGeometry(1.1, W * 0.32), new THREE.MeshBasicMaterial({ color: 0xffe484 }));
  thrStripe.rotation.x = -PI / 2; thrStripe.position.set(-L * 0.41, yd + 1.12, spec.angled ? -W * 0.16 : 0); g.add(thrStripe);
  for (const [lz, lm] of [[W * 0.49, deckGrn], [-W * 0.49, JM.navR]]) {
    const nl = new THREE.Mesh(JG.nav, lm); nl.scale.setScalar(2.8); nl.position.set(ix + 10, yd + 15.2, lz); g.add(nl);
  }
  const n = spec.jets ? Math.min(spec.jets.n, 6) : 0;
  for (let i = 0; i < n; i++) { const j = jetMesh(!!spec.foe); j.scale.setScalar(1); j.position.set(-L * 0.38 + (i % 3) * 17, yd + 2.2, (spec.angled ? W * 0.18 : 0) + (((i / 3) | 0) ? -9 : 9)); j.rotation.y = PI * 0.75; g.add(j); }
  g.userData.bridge = [ix + 8, yd + 15, iz];
  return spec.nuke ? [] : [[ix - 6, yd + 18, iz]];
}
/** Modern twin-engine carrier fighter, ~16.5 m, nose +x: radome, LERX strakes, side intakes, twin nozzles + AB plumes, wingtip rails. */
const JG = (() => {
  const P = [[0, -7.8], [0.78, -7.4], [0.96, -3.2], [0.92, 1.8], [0.68, 4.6], [0.42, 6.2], [0, 6.5]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.LatheGeometry(P, 16); body.rotateZ(-PI / 2); body.scale(1, 0.78, 1.24);
  const radome = new THREE.ConeGeometry(0.42, 2.3, 14); radome.rotateZ(-PI / 2); radome.scale(1, 0.82, 1.08); radome.translate(7.25, -0.05, 0);
  const pitot = new THREE.CylinderGeometry(0.015, 0.03, 0.9, 6); pitot.rotateZ(-PI / 2); pitot.translate(8.7, -0.06, 0);
  const ls = new THREE.Shape(); ls.moveTo(4.9, 0.45); ls.lineTo(3.3, 1.28); ls.lineTo(1.7, 1.55); ls.lineTo(1.1, 0.6); ls.closePath();
  const lerx = new THREE.ExtrudeGeometry(ls, { depth: 0.14, bevelEnabled: false }); lerx.rotateX(PI / 2);
  const ws = new THREE.Shape(); ws.moveTo(2.4, 0); ws.lineTo(-3.2, 6.2); ws.lineTo(-4.9, 6.2); ws.lineTo(-4.1, 0); ws.closePath();
  const wing = new THREE.ExtrudeGeometry(ws, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.04, bevelSegments: 1 }); wing.rotateX(PI / 2);
  const ts = new THREE.Shape(); ts.moveTo(0, 0); ts.lineTo(-2.3, 3.25); ts.lineTo(-3.55, 3.25); ts.lineTo(-3.25, 0); ts.closePath();
  const fin = new THREE.ExtrudeGeometry(ts, { depth: 0.11, bevelEnabled: false });
  const st = new THREE.Shape(); st.moveTo(0.2, 0); st.lineTo(-1.6, 2.7); st.lineTo(-2.65, 2.7); st.lineTo(-2.35, 0); st.closePath();
  const stab = new THREE.ExtrudeGeometry(st, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 1 }); stab.rotateX(PI / 2);
  const can = new THREE.SphereGeometry(1, 16, 10, 0, PI * 2, 0, PI / 2); can.scale(2.15, 0.72, 0.56);
  const spine = new THREE.BoxGeometry(5.6, 0.48, 0.76);
  const intake = new THREE.BoxGeometry(2.6, 0.62, 0.52);
  const intakeHole = new THREE.PlaneGeometry(0.46, 0.54); intakeHole.rotateY(PI / 2);
  const nozzle = new THREE.CylinderGeometry(0.42, 0.34, 1.15, 14); nozzle.rotateZ(-PI / 2);
  const rail = new THREE.BoxGeometry(2.4, 0.14, 0.14);
  const mslBody = new THREE.CylinderGeometry(0.085, 0.085, 2.9, 8); mslBody.rotateZ(-PI / 2);
  const mslCone = new THREE.ConeGeometry(0.085, 0.56, 8); mslCone.rotateZ(-PI / 2); mslCone.translate(1.73, 0, 0);
  const mslFin = new THREE.BoxGeometry(0.34, 0.28, 0.03); mslFin.translate(-1.25, 0, 0);
  const pylon = new THREE.BoxGeometry(1.15, 0.24, 0.09);
  const dropTank = new THREE.CapsuleGeometry(0.22, 2.25, 4, 10); dropTank.rotateZ(-PI / 2);
  const nav = new THREE.SphereGeometry(0.11, 6, 6);
  const strobe = new THREE.SphereGeometry(0.14, 6, 6);
  const seat = new THREE.BoxGeometry(0.45, 0.55, 0.42);
  const abGlow = new THREE.CircleGeometry(0.32, 14); abGlow.rotateY(-PI / 2);
  const abOuter = new THREE.ConeGeometry(0.36, 4.6, 14, 1, true); abOuter.rotateZ(PI / 2); abOuter.translate(-2.3, 0, 0);
  const abCore = new THREE.ConeGeometry(0.2, 2.9, 12); abCore.rotateZ(PI / 2); abCore.translate(-1.45, 0, 0);
  const abDiamond = new THREE.SphereGeometry(0.22, 10, 8); abDiamond.scale(1.9, 0.72, 0.72);
  const vConeGeo = new THREE.CylinderGeometry(1.15, 3.4, 1.15, 24, 1, true); vConeGeo.rotateZ(PI / 2);
  const vcCan = document.createElement("canvas"); vcCan.width = 128; vcCan.height = 64;
  {
    const vx = vcCan.getContext("2d");
    for (let x = 0; x < 128; x += 2) {
      const k = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(x * 0.28 + Math.cos(x * 0.11)));
      const vg = vx.createLinearGradient(0, 0, 0, 64);
      vg.addColorStop(0, "rgba(235,244,252,0)");
      vg.addColorStop(0.32, `rgba(240,248,255,${(0.55 * k).toFixed(2)})`);
      vg.addColorStop(0.68, `rgba(235,245,255,${(0.34 * k).toFixed(2)})`);
      vg.addColorStop(1, "rgba(235,244,252,0)");
      vx.fillStyle = vg; vx.fillRect(x, 0, 2, 64);
    }
  }
  const vConeTex = new THREE.CanvasTexture(vcCan); vConeTex.wrapS = THREE.RepeatWrapping;
  return { body, radome, pitot, lerx, wing, fin, stab, can, spine, intake, intakeHole, nozzle, rail, mslBody, mslCone, mslFin, pylon, dropTank, nav, strobe, seat, abGlow, abOuter, abCore, abDiamond, vConeGeo, vConeTex };
})();
const JM = {
  us: new THREE.MeshStandardMaterial({ color: 0x869098, roughness: 0.48, metalness: 0.32 }),
  usDark: new THREE.MeshStandardMaterial({ color: 0x56606a, roughness: 0.52, metalness: 0.35 }),
  foe: new THREE.MeshStandardMaterial({ color: 0x767f7c, roughness: 0.52, metalness: 0.28 }),
  foeDark: new THREE.MeshStandardMaterial({ color: 0x454c4d, roughness: 0.55, metalness: 0.32 }),
  nose: new THREE.MeshStandardMaterial({ color: 0x2c3238, roughness: 0.4, metalness: 0.35 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x24282d, roughness: 0.32, metalness: 0.85 }),
  voidM: new THREE.MeshBasicMaterial({ color: 0x090b0d }),
  msl: new THREE.MeshStandardMaterial({ color: 0xdce2e6, roughness: 0.45, metalness: 0.2 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x4b3b1c, roughness: 0.05, metalness: 0.94, envMapIntensity: 1.4 }),
  navR: new THREE.MeshBasicMaterial({ color: 0xff3b30 }),
  navG: new THREE.MeshBasicMaterial({ color: 0x3dff7a }),
  strobeW: new THREE.MeshBasicMaterial({ color: 0xffece6 }),
};
export function jetMesh(foe) {
  const g = new THREE.Group(), m = foe ? JM.foe : JM.us, md = foe ? JM.foeDark : JM.usDark;
  const put = (geo, mm, x, y, z, sh = true) => { const o = new THREE.Mesh(geo, mm); o.position.set(x, y, z); if (sh) o.castShadow = true; g.add(o); return o; };
  put(JG.body, m, 0, 0, 0); put(JG.radome, JM.nose, 0, 0, 0); put(JG.pitot, JM.metal, 0, 0, 0, false);
  put(JG.spine, md, -0.3, 0.46, 0); put(JG.seat, JM.nose, 4.1, 0.56, 0, false); put(JG.can, JM.glass, 4.2, 0.48, 0, false);
  put(JG.dropTank, md, -0.4, -0.52, 0);
  put(JG.wing, m, 0, -0.08, 0.58); const w2 = put(JG.wing, m, 0, -0.08, -0.58); w2.scale.z = -1;
  put(JG.lerx, md, 0, 0.02, 0.12); const l2 = put(JG.lerx, md, 0, 0.02, -0.12); l2.scale.z = -1;
  put(JG.stab, m, -5.3, -0.08, 0.52); const s2 = put(JG.stab, m, -5.3, -0.08, -0.52); s2.scale.z = -1;
  const mkMsl = (x, y, z, scale = 1) => {
    const mg = new THREE.Group(); mg.position.set(x, y, z); mg.scale.setScalar(scale);
    mg.add(new THREE.Mesh(JG.mslBody, JM.msl), new THREE.Mesh(JG.mslCone, JM.nose), new THREE.Mesh(JG.mslFin, JM.nose));
    const f2 = new THREE.Mesh(JG.mslFin, JM.nose); f2.rotation.x = PI / 2; mg.add(f2);
    g.add(mg); return mg;
  };
  const aam = [], asm = [];
  for (const s of [1, -1]) {
    const f = put(JG.fin, s > 0 ? m : md, -3.25, 0.42, s * 0.88); f.rotation.x = -s * 0.42;
    const ik = put(JG.intake, md, 1.9, -0.14, s * 0.96); ik.rotation.y = s * 0.05;
    put(JG.intakeHole, JM.voidM, 3.21, -0.14, s * 0.99, false);
    put(JG.nozzle, JM.metal, -7.65, -0.06, s * 0.52);
    put(JG.rail, JM.nose, -3.55, -0.04, s * 6.82, false);
    put(JG.pylon, md, -1.2, -0.26, s * 2.8, false);
    aam.push(mkMsl(-3.35, -0.08, s * 6.95, 0.95));
    asm.push(mkMsl(-1.2, -0.45, s * 2.8, 1.18));
    put(JG.nav, s > 0 ? JM.navG : JM.navR, -3.9, -0.04, s * 6.84, false);
  }
  g.userData.pylonMsls = { aam, asm };
  const strobe = put(JG.strobe, JM.strobeW, -2.95, 0.72, 0, false); strobe.visible = false;
  const vcMat = new THREE.MeshBasicMaterial({ map: JG.vConeTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const vCone = new THREE.Mesh(JG.vConeGeo, vcMat); vCone.position.set(-1.55, 0.02, 0); vCone.visible = false; g.add(vCone);
  // Dual afterburner nozzles glow + pulsing outer plume, inner core & 3 Mach shock diamonds
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff9a38, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const outerMat = new THREE.MeshBasicMaterial({ color: foe ? 0xff7b2e : 0x7ab8ff, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff5d6, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const diaMat = new THREE.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.88, blending: THREE.AdditiveBlending, depthWrite: false });
  const burners = [];
  for (const s of [1, -1]) {
    const b = new THREE.Group(); b.position.set(-8.22, -0.06, s * 0.52); g.add(b);
    const glow = new THREE.Mesh(JG.abGlow, glowMat); glow.visible = false; b.add(glow);
    const plume = new THREE.Group(); plume.visible = false; b.add(plume);
    const outer = new THREE.Mesh(JG.abOuter, outerMat); plume.add(outer);
    const core = new THREE.Mesh(JG.abCore, coreMat); plume.add(core);
    const rings = [];
    for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(JG.abDiamond, diaMat); d.position.x = -0.85 - i * 0.95; d.scale.setScalar(1 - i * 0.22); plume.add(d); rings.push(d); }
    burners.push({ b, glow, plume, outer, core, rings });
  }
  g.userData.ab = { burners, glowMat, outerMat, coreMat, diaMat, strobe, vCone, vcMat };
  return g;
}
/** 4-engine heavy turboprop transport / maritime strike aircraft (C-130 Hercules silhouette), ~30 m, nose +x. */
const HG_C = (() => {
  const P = [[0, -14.2], [0.55, -13.6], [1.45, -8.5], [2.15, -3.5], [2.25, 7.2], [2.05, 10.0], [1.55, 11.8], [0.85, 13.4], [0, 14.2]].map(([r, y]) => new THREE.Vector2(r, y));
  const fus = new THREE.LatheGeometry(P, 16); fus.rotateZ(-PI / 2); fus.scale(1, 0.94, 0.96);
  const cockpitGlass = new THREE.BoxGeometry(1.5, 0.72, 2.35);
  const radome = new THREE.SphereGeometry(0.92, 12, 8); radome.scale(1.45, 0.85, 0.92);
  const flir = new THREE.SphereGeometry(0.42, 10, 8);
  const sponson = new THREE.CapsuleGeometry(0.75, 5.8, 6, 10); sponson.rotateZ(-PI / 2); sponson.scale(1, 0.82, 0.72);
  const wing = (() => {
    const s = new THREE.Shape(); s.moveTo(2.4, 0); s.lineTo(1.1, 20.5); s.lineTo(-1.8, 20.5); s.lineTo(-2.6, 0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.34, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 }); g.rotateX(PI / 2); return g;
  })();
  const tailFin = (() => {
    const s = new THREE.Shape(); s.moveTo(4.2, 0); s.lineTo(0.8, 1.4); s.lineTo(-2.6, 7.6); s.lineTo(-4.8, 7.6); s.lineTo(-4.2, 0); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: false });
  })();
  const hStab = (() => {
    const s = new THREE.Shape(); s.moveTo(1.6, 0); s.lineTo(-0.3, 7.4); s.lineTo(-2.3, 7.4); s.lineTo(-2.0, 0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false }); g.rotateX(PI / 2); return g;
  })();
  const nac = new THREE.CylinderGeometry(0.48, 0.62, 4.2, 10); nac.rotateZ(-PI / 2);
  const spin = new THREE.ConeGeometry(0.4, 0.85, 10); spin.rotateZ(-PI / 2); spin.translate(2.5, 0, 0);
  const intake = new THREE.BoxGeometry(1.1, 0.45, 0.62);
  const blade = new THREE.BoxGeometry(0.06, 2.05, 0.19); blade.translate(0, 1.15, 0);
  const propDisc = new THREE.CircleGeometry(2.15, 22); propDisc.rotateY(PI / 2);
  const dropTank = new THREE.CapsuleGeometry(0.38, 3.4, 4, 10); dropTank.rotateZ(-PI / 2);
  const ramp = new THREE.BoxGeometry(4.4, 0.22, 2.5); ramp.translate(-2.2, 0, 0);
  const bayMsl = new THREE.CylinderGeometry(0.24, 0.24, 3.2, 8); bayMsl.rotateZ(-PI / 2);
  return { fus, cockpitGlass, radome, flir, sponson, wing, tailFin, hStab, nac, spin, intake, blade, propDisc, dropTank, ramp, bayMsl };
})();
const HM_C = {
  body: new THREE.MeshStandardMaterial({ color: 0x5c656b, roughness: 0.62, metalness: 0.22 }),
  belly: new THREE.MeshStandardMaterial({ color: 0x454d52, roughness: 0.68, metalness: 0.24 }),
  foe: new THREE.MeshStandardMaterial({ color: 0x676f68, roughness: 0.65, metalness: 0.22 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1f2428, roughness: 0.45, metalness: 0.45 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x182832, roughness: 0.08, metalness: 0.88 }),
  disc: new THREE.MeshBasicMaterial({ color: 0xd8e4ea, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  beacon: new THREE.MeshBasicMaterial({ color: 0xff3b30 }),
  bay: new THREE.MeshBasicMaterial({ color: 0x0d1114 }),
};
export function heavyMesh(foe) {
  const g = new THREE.Group(), bm = foe ? HM_C.foe : HM_C.body, dm = HM_C.belly;
  const put = (geo, m, x, y, z, sh = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (sh) o.castShadow = true; g.add(o); return o; };
  put(HG_C.fus, bm, 0, 0, 0);
  put(HG_C.radome, HM_C.dark, 13.5, -0.35, 0);
  put(HG_C.flir, HM_C.dark, 13.2, -1.65, 0, false);
  const cg = put(HG_C.cockpitGlass, HM_C.glass, 11.4, 1.12, 0, false); cg.rotation.z = -0.34;
  put(HG_C.wing, bm, 0.8, 2.05, 0);
  const wL = put(HG_C.wing, bm, 0.8, 2.05, 0); wL.scale.z = -1;
  put(HG_C.tailFin, dm, -9.8, 1.4, -0.14);
  put(HG_C.hStab, dm, -12.1, 1.65, 0);
  const hL = put(HG_C.hStab, dm, -12.1, 1.65, 0); hL.scale.z = -1;
  // Main landing-gear sponsons + underwing pylons/tanks + wingtip nav lights
  for (const s of [1, -1]) {
    put(HG_C.sponson, dm, 0.2, -1.45, s * 2.15);
    put(HG_C.dropTank, dm, 0.5, 0.75, s * 15.8);
    put(JG.nav, s > 0 ? JM.navG : JM.navR, 0.5, 2.0, s * 20.4, false);
  }
  // 4 wing-mounted turboprop nacelles & spinning 6-blade propellers
  const props = [];
  for (const z of [-12.6, -6.5, 6.5, 12.6]) {
    put(HG_C.nac, dm, 2.8, 1.55, z);
    put(HG_C.spin, HM_C.dark, 2.8, 1.55, z, false);
    put(HG_C.intake, HM_C.dark, 4.1, 1.02, z, false);
    const hub = new THREE.Group(); hub.position.set(5.1, 1.55, z); g.add(hub);
    for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(HG_C.blade, HM_C.dark); b.rotation.x = (i / 6) * TAU; hub.add(b); }
    hub.add(new THREE.Mesh(HG_C.propDisc, HM_C.disc));
    props.push(hub);
  }
  // Rear upswept cargo bay + hinged drop ramp + internal palletized missile racks
  const bayVoid = put(new THREE.BoxGeometry(4.2, 1.5, 2.3), HM_C.bay, -9.8, -0.35, 0, false); void bayVoid;
  const ramp = new THREE.Group(); ramp.position.set(-7.8, -1.25, 0); g.add(ramp);
  ramp.add(new THREE.Mesh(HG_C.ramp, dm));
  const bayMsls = [];
  for (const z of [-0.65, 0.65]) { const bm2 = put(HG_C.bayMsl, JM.msl, -9.8, -0.55, z, false); bayMsls.push(bm2); }
  const strobe = put(JG.strobe, HM_C.beacon, -13.8, 8.95, 0, false); strobe.scale.setScalar(1.8);
  g.userData.props = props; g.userData.ramp = ramp; g.userData.bayMsls = bayMsls;
  g.userData.ab = { burners: [], strobe };
  return g;
}
function cargo(g, spec) {
  const U = spec.upper, y = spec.fb, L = spec.L, B = spec.B;
  box(g, L * 0.14, 6, B * 0.72, U, -L * 0.02, y, 0); box(g, L * 0.1, 2.6, B * 0.62, U, -L * 0.02, y + 6, 0); box(g, 6, 2.4, B * 0.8, U, -L * 0.0, y + 8.6, 0);
  const f = cyl(g, 1.8, 2.1, 7.5, 0x3a3f42, -L * 0.06, y + 8.6, 0, 12); f.scale.z = 0.85; cyl(g, 1.85, 1.85, 0.8, 0x1c1e20, -L * 0.06, y + 16.1, 0, 12);
  box(g, L * 0.09, 4, B * 0.62, U, -L * 0.4, y, 0); box(g, L * 0.05, 2, B * 0.4, U, -L * 0.4, y + 4, 0);
  for (const x of [L * 0.34, L * 0.21, -L * 0.17, -L * 0.29]) box(g, L * 0.085, 1.4, B * 0.5, 0x4a5054, x, y, 0);
  for (const x of [L * 0.34, L * 0.21, -L * 0.17]) box(g, L * 0.055, 2.4, B * 0.36, 0x6b5a3e, x, y + 1.4, 0);
  for (const x of [L * 0.275, -L * 0.235]) { cyl(g, 0.35, 0.45, 15, 0x5b6368, x, y, 0, 6); box(g, 0.3, 0.3, B * 0.7, 0x5b6368, x, y + 10, 0); for (const s of [1, -1]) { const b = box(g, 0.25, 0.25, 12, 0x5b6368, x + s * 5.5, y + 6, 0); b.rotation.z = s * 0.9; } }
  lines(g, [L * 0.275, y + 15, 0, L * 0.48, deckY(spec, L * 0.48) + 2, 0, L * 0.275, y + 15, 0, -L * 0.235, y + 15, 0, -L * 0.235, y + 15, 0, -L * 0.48, y + 2, 0]);
  g.userData.bridge = [2, y + 10, 0];
  return [[-L * 0.06, y + 16.9, 0]];
}
// ── modern hulls (2025+): procedural, proportions from public photos; not survey-accurate ──
const VLS_G = {
  well: new THREE.PlaneGeometry(0.88, 0.88),
  glow: new THREE.PlaneGeometry(0.82, 0.82),
  lid: new THREE.BoxGeometry(0.92, 0.09, 0.92),
  lidStatic: new THREE.BoxGeometry(0.92, 0.08, 0.92),
  body: new THREE.CylinderGeometry(0.19, 0.19, 1.35, 8),
  nose: new THREE.ConeGeometry(0.19, 0.52, 8),
  fin: new THREE.BoxGeometry(0.42, 0.24, 0.04),
};
VLS_G.well.rotateX(-PI / 2); VLS_G.glow.rotateX(-PI / 2);
VLS_G.lid.translate(0.46, 0.045, 0);
const VLS_M = {
  well: new THREE.MeshBasicMaterial({ color: 0x090c0f }),
  lid: new THREE.MeshStandardMaterial({ color: 0x475056, roughness: 0.55, metalness: 0.35 }),
  body: new THREE.MeshStandardMaterial({ color: 0xe6ebee, roughness: 0.4, metalness: 0.25 }),
  band: new THREE.MeshStandardMaterial({ color: 0xc94232, roughness: 0.45, metalness: 0.2 }),
  nose: new THREE.MeshStandardMaterial({ color: 0x262c30, roughness: 0.35, metalness: 0.55 }),
};
function vlsGrid(g, x, y, rows, cols) {
  const w = cols * 1.15 + 0.4, d = rows * 1.15 + 0.4; box(g, w, 0.3, d, 0x3a4044, x, y, 0);
  for (let c = 1; c < cols; c++) box(g, 0.08, 0.08, d - 0.3, 0x24292c, x - w / 2 + 0.2 + c * 1.15, y + 0.3, 0);
  for (let r = 1; r < rows; r++) box(g, w - 0.3, 0.08, 0.08, 0x24292c, x, y + 0.3, -d / 2 + 0.2 + r * 1.15);
  const cells = (g.userData.vlsCells ??= []), statics = [];
  const total = rows * cols, want = Math.min(total, 16), stepR = Math.max(1, Math.floor(rows / 4)), stepC = Math.max(1, Math.floor(cols / 4));
  let made = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cx = x - w / 2 + 0.2 + (c + 0.5) * 1.15, cz = -d / 2 + 0.2 + (r + 0.5) * 1.15;
    if (made < want && r % stepR === 0 && c % stepC === 0) {
      made++;
      const well = new THREE.Mesh(VLS_G.well, VLS_M.well); well.position.set(cx, y + 0.31, cz); g.add(well);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xff9438, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const glow = new THREE.Mesh(VLS_G.glow, glowMat); glow.position.set(cx, y + 0.32, cz); glow.visible = false; g.add(glow);
      const msl = new THREE.Group(); msl.position.set(cx, y - 0.75, cz); msl.visible = false;
      const mb = new THREE.Mesh(VLS_G.body, VLS_M.body); mb.position.y = 0.65;
      const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.16, 8), VLS_M.band); bd.position.y = 1.12;
      const ns = new THREE.Mesh(VLS_G.nose, VLS_M.nose); ns.position.y = 1.56;
      const f1 = new THREE.Mesh(VLS_G.fin, VLS_M.nose); f1.position.y = 0.18;
      const f2 = new THREE.Mesh(VLS_G.fin, VLS_M.nose); f2.position.y = 0.18; f2.rotation.y = PI / 2;
      msl.add(mb, bd, ns, f1, f2); g.add(msl);
      const lid = new THREE.Group(); lid.position.set(cx - 0.46, y + 0.3, cz);
      const lidMesh = new THREE.Mesh(VLS_G.lid, VLS_M.lid); lidMesh.castShadow = true; lid.add(lidMesh); g.add(lid);
      cells.push({ cx, cy: y + 0.36, cz, baseY: y - 0.65, lid, msl, glow, glowMat, state: "loaded", t: 0, open: 0, glowA: 0, fore: x > 0 });
    } else statics.push([cx, y + 0.34, cz]);
  }
  if (statics.length) {
    const inst = new THREE.InstancedMesh(VLS_G.lidStatic, VLS_M.lid, statics.length), mx = new THREE.Matrix4();
    statics.forEach(([sx, sy, sz], idx) => { mx.makeTranslation(sx, sy, sz); inst.setMatrixAt(idx, mx); });
    g.add(inst);
  }
}
function ciws(g, x, y, z) {
  cyl(g, 0.85, 1.05, 1.45, 0x9aa2a6, x, y, z, 10);
  const yawGrp = new THREE.Group(); yawGrp.position.set(x, y + 1.45, z); g.add(yawGrp);
  const dome = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 1.2, 12), mat(0xe9ecec))); dome.position.y = 0.6; dome.scale.z = 0.9; yawGrp.add(dome);
  const elGrp = new THREE.Group(); elGrp.position.set(0.15, 0.85, 0); yawGrp.add(elGrp);
  const boxM = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.72, 1.15), mat(0x6d767c))); boxM.position.set(0.35, 0, 0); elGrp.add(boxM);
  const brl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 1.85, 8), mat(0x2c3238)); brl.rotation.z = -PI / 2; brl.position.set(1.15, -0.35, 0); elGrp.add(brl);
  const tipG = new THREE.ConeGeometry(0.09, 0.36, 8); tipG.rotateZ(-PI / 2);
  const tips = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const tip = new THREE.Mesh(tipG, VLS_M.body); tip.position.set(1.32, (r - 0.5) * 0.26, (c - 1) * 0.28); elGrp.add(tip);
    tips.push({ m: tip, cd: 0 });
  }
  (g.userData.pdMounts ??= []).push({ x, y: y + 2.3, z, yawGrp, elGrp, tips });
}
const CAN_G = {
  tube: new THREE.CylinderGeometry(0.32, 0.34, 3.0, 10),
  bore: new THREE.CylinderGeometry(0.27, 0.27, 0.12, 10),
  rail: new THREE.BoxGeometry(4.75, 0.08, 0.08),
  cap: new THREE.BoxGeometry(0.62, 0.08, 0.62),
  body: new THREE.CylinderGeometry(0.2, 0.2, 4.1, 10),
  band: new THREE.CylinderGeometry(0.205, 0.205, 0.26, 10),
  nose: new THREE.ConeGeometry(0.2, 0.82, 10),
  fin: new THREE.BoxGeometry(0.55, 0.44, 0.04),
};
CAN_G.tube.rotateZ(-PI / 2); CAN_G.bore.rotateZ(-PI / 2); CAN_G.body.rotateZ(-PI / 2); CAN_G.band.rotateZ(-PI / 2); CAN_G.nose.rotateZ(-PI / 2);
function cans(g, x, y, n) {
  const racks = (g.userData.canRacks ??= []), tubeM = mat(0x525b60), railM = mat(0x3a4046);
  for (const s of [1, -1]) for (let i = 0; i < n; i++) {
    const rack = new THREE.Group(); rack.rotation.order = "YXZ";
    rack.position.set(x, y + 1.15 + (i % 2) * 0.78, s * (1.45 + Math.floor(i / 2) * 0.78));
    rack.rotation.y = -s * 0.52; rack.rotation.z = 0.34; g.add(rack);
    const tube = shadowed(new THREE.Mesh(CAN_G.tube, tubeM)); tube.position.x = -0.85; rack.add(tube);
    const bore = new THREE.Mesh(CAN_G.bore, VLS_M.well); bore.position.x = 0.66; rack.add(bore);
    for (const rz of [-0.26, 0.26]) { const rl = new THREE.Mesh(CAN_G.rail, railM); rl.position.set(0.05, 0.26, rz); rack.add(rl); }
    const cap = new THREE.Mesh(CAN_G.cap, mat(0x6e787d)); cap.position.set(1.1, 0.34, 0); cap.rotation.z = 0.15; rack.add(cap);
    const msl = new THREE.Group(); msl.position.set(0.68, 0, 0);
    const mb = new THREE.Mesh(CAN_G.body, VLS_M.body);
    const bd = new THREE.Mesh(CAN_G.band, VLS_M.band); bd.position.x = 1.45;
    const ns = new THREE.Mesh(CAN_G.nose, VLS_M.nose); ns.position.x = 2.46;
    const f1 = new THREE.Mesh(CAN_G.fin, VLS_M.nose); f1.position.x = -1.65;
    const f2 = new THREE.Mesh(CAN_G.fin, VLS_M.nose); f2.position.x = -1.65; f2.rotation.x = PI / 2;
    msl.add(mb, bd, ns, f1, f2); rack.add(msl);
    racks.push({ rack, msl, cap, side: s, state: "loaded", t: 0 });
  }
}
// ── modern warships: stealth-shaped deckhouses, SPY faces, integrated masts, stacks, hangar and flight deck ──
/** Box whose top is narrower (stealth slope): wTop/lenTop are the top face's width/length. */
function slab(g, len, h, w, wTop, lenTop, c, x, y, z, tx = 0) {
  const geo = new THREE.BoxGeometry(len, h, w), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setZ(i, (p.getZ(i) * wTop) / w); p.setX(i, (p.getX(i) * lenTop) / len + tx); }
  geo.computeVertexNormals(); const m = shadowed(new THREE.Mesh(geo, mat(c))); m.position.set(x, y + h / 2, z); g.add(m); return m;
}
/** Octagonal phased-array face, tilted back, with a frame. */
function spyFace(g, x, y, z, yaw, r) {
  const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = -yaw; g.add(f);
  const plate = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.25, 8), mat(0x2c3338))); plate.rotation.z = PI / 2; plate.rotation.x = PI / 8; f.add(plate);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, 0.12, 4, 8), mat(0x6c757b)); rim.rotation.y = PI / 2; rim.rotation.z = PI / 8; rim.position.x = 0.14; f.add(rim);
  f.rotation.z = -0.22; // arrays lean back about 12-15 degrees
}
/** Pyramid lattice-look mast with yards, radomes and whips. */
function pyramidMast(g, x, y, h, base, U) {
  const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(base * 0.18, base, h, 4), mat(U))); m.rotation.y = PI / 4; m.position.set(x, y + h / 2, 0); g.add(m);
  for (const [yy, w] of [[0.62, base * 2.6], [0.82, base * 1.8]]) box(g, 0.35, 0.35, w, 0x5a6268, x, y + h * yy, 0);
  cyl(g, 0.25, 0.3, 6, 0x5a6268, x, y + h, 0, 6);
  for (const [dx, dz, r] of [[0, 0, 1.1], [0.6, base * 0.9, 0.7], [0.6, -base * 0.9, 0.7]]) { const d = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat(0xe6e8e8))); d.position.set(x + dx, y + h * (dz ? 0.82 : 1) + r + (dz ? 0.3 : 6), dz); g.add(d); }
  for (const s of [1, -1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 7, 4), mat(0x3a4045)); w.position.set(x - 1, y + h * 0.7 + 3.5, s * base * 1.2); w.rotation.x = s * 0.25; g.add(w); }
}
/** Raked funnel with a dark exhaust cap. */
function stack(g, x, y, len, w, h, U) { slab(g, len, h, w, w * 0.75, len * 0.7, U, x, y, 0, -len * 0.08); box(g, len * 0.62, 0.5, w * 0.7, 0x16191b, x - len * 0.1, y + h, 0); }
/** Ship's boat on davits. */
function boat(g, x, y, z) { const b = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 5.2, 4, 10), mat(0xd9692e))); b.rotation.z = PI / 2; b.position.set(x, y + 1.2, z); b.scale.set(1, 1, 0.8); g.add(b); box(g, 0.25, 2.2, 0.25, 0x5a6268, x + 2, y, z * 0.92); box(g, 0.25, 2.2, 0.25, 0x5a6268, x - 2, y, z * 0.92); }
/** Hangar with doors and a marked flight deck behind it. */
function hangarDeck(g, spec, x, len, w, h, U) {
  const y = spec.fb; slab(g, len, h, w, w * 0.9, len * 0.95, U, x, y, 0);
  const fx = x - len / 2; box(g, 0.2, h * 0.75, w * 0.36, 0x262b2f, fx - 0.05, y, w * 0.2); box(g, 0.2, h * 0.75, w * 0.36, 0x262b2f, fx - 0.05, y, -w * 0.2);
  const dl = spec.L / 2 + fx, dx = fx - dl / 2, dy = deckY(spec, dx) + 0.04, white = new THREE.MeshBasicMaterial({ color: 0xd8dcd8 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.0, 32), white); ring.rotation.x = -PI / 2; ring.position.set(dx, dy, 0); g.add(ring);
  const cl = new THREE.Mesh(new THREE.PlaneGeometry(dl * 0.85, 0.3), white); cl.rotation.x = -PI / 2; cl.position.set(dx, dy, 0); g.add(cl);
}
function shipNavLights(g, x, y, bz) {
  for (const s of [1, -1]) {
    const nl = new THREE.Mesh(JG.nav, s > 0 ? JM.navG : JM.navR); nl.scale.setScalar(2.4); nl.position.set(x, y, s * bz); g.add(nl);
  }
}
/** Arleigh Burke / KDX-III / Maya: two-tier Aegis deckhouse with four octagonal SPY faces, pyramid mast, two raked stacks, hangar aft. */
function aegis(g, spec) {
  const U = spec.upper, y = spec.fb, B = spec.B, k = spec.L / 155;
  vlsGrid(g, 44 * k, deckY(spec, 44 * k), 4, 8);
  slab(g, 30 * k, 7.6, B * 0.82, B * 0.7, 27 * k, U, 13 * k, y, 0);                 // main deckhouse, sides sloped inward
  slab(g, 17 * k, 6.4, B * 0.62, B * 0.46, 14 * k, U, 14 * k, y + 7.6, 0);            // bridge tier carrying the arrays
  box(g, 0.6, 1.2, B * 0.44, 0x141a1f, 21.9 * k, y + 11.2, 0);                       // bridge windows
  box(g, 3.2 * k, 0.5, B * 0.86, U, 20.5 * k, y + 10.4, 0);                          // bridge wings
  shipNavLights(g, 20.5 * k, y + 10.9, B * 0.43);
  const fx = 21.2 * k, ax = 7.2 * k, hy = y + 10.6, hz = B * 0.25, r = 2.3 * k;
  spyFace(g, fx, hy, hz, PI / 4, r); spyFace(g, fx, hy, -hz, -PI / 4, r); spyFace(g, ax, hy, hz, PI * 0.75, r); spyFace(g, ax, hy, -hz, -PI * 0.75, r);
  pyramidMast(g, 11 * k, y + 14, 15, 2.4, U);
  stack(g, -5 * k, y, 8 * k, B * 0.32, 10, U); stack(g, -22 * k, y, 8 * k, B * 0.32, 10, U);
  slab(g, 26 * k, 3.2, B * 0.6, B * 0.56, 26 * k, U, -13 * k, y, 0);                // midships deckhouse joining the stacks
  cans(g, -13 * k, y + 3.2, spec.cans || 2);
  for (const s of [1, -1]) boat(g, -13 * k, y + 3.2, s * B * 0.4);
  vlsGrid(g, -31 * k, deckY(spec, -31 * k), 8, 8);
  hangarDeck(g, spec, -42 * k, 14 * k, B * 0.86, 6.4, U);
  ciws(g, 24 * k, y + 7.6, 0); ciws(g, -42 * k, y + 6.4, 0);
  lines(g, [11 * k, y + 35, 0, 70 * k, deckY(spec, 70 * k) + 2, 0, 11 * k, y + 35, 0, -70 * k, y + 2, 0]);
  g.userData.bridge = [21.5 * k, y + 11.6, 0]; g.userData.vls = [44 * k, -31 * k];
  return [];
}
/** Type 055: tall enclosed integrated mast carrying four flat arrays, one large stack, 64 + 48 cells, hangar aft. */
function pla(g, spec) {
  const U = spec.upper, y = spec.fb, B = spec.B, k = spec.L / 180;
  vlsGrid(g, 46 * k, deckY(spec, 46 * k), 8, 8);
  slab(g, 32 * k, 8.5, B * 0.82, B * 0.72, 29 * k, U, 14 * k, y, 0);
  slab(g, 16 * k, 9, B * 0.6, B * 0.42, 12 * k, U, 15 * k, y + 8.5, 0);              // tower carrying the arrays
  slab(g, 9 * k, 7, B * 0.4, B * 0.22, 6 * k, U, 15 * k, y + 17.5, 0);              // integrated mast top
  box(g, 0.6, 1.2, B * 0.5, 0x141a1f, 22.6 * k, y + 10.4, 0);
  shipNavLights(g, 21.6 * k, y + 10.9, B * 0.34);
  const r = 2.2 * k, hy = y + 13.5;
  for (const [x, z, a] of [[21.6 * k, B * 0.2, PI / 4], [21.6 * k, -B * 0.2, -PI / 4], [8.4 * k, B * 0.2, PI * 0.75], [8.4 * k, -B * 0.2, -PI * 0.75]]) { const f = box(g, 0.3, r * 1.9, r * 1.6, 0x2c3338, x, hy - r, z); f.rotation.y = -a; f.rotation.z = -0.2; }
  cyl(g, 0.3, 0.5, 7, 0x5a6268, 15 * k, y + 24.5, 0, 6); const d = shadowed(new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), mat(0xe6e8e8))); d.position.set(15 * k, y + 32, 0); g.add(d);
  stack(g, -8 * k, y, 14 * k, B * 0.46, 11, U);
  slab(g, 20 * k, 3.4, B * 0.62, B * 0.58, 20 * k, U, -8 * k, y, 0);
  cans(g, -18.5 * k, deckY(spec, -18.5 * k), 2);
  for (const s of [1, -1]) boat(g, -6 * k, y + 3.4, s * B * 0.42);
  vlsGrid(g, -27 * k, deckY(spec, -27 * k), 6, 8);
  hangarDeck(g, spec, -44 * k, 18 * k, B * 0.86, 7, U);
  ciws(g, 26 * k, y + 8.5, 0); ciws(g, -44 * k, y + 7, 0);
  lines(g, [15 * k, y + 33, 0, 80 * k, deckY(spec, 80 * k) + 2, 0, 15 * k, y + 33, 0, -80 * k, y + 2, 0]);
  g.userData.bridge = [22.5 * k, y + 10.8, 0]; g.userData.vls = [46 * k, -27 * k];
  return [];
}
/** Choe Hyon: compact stealth deckhouse, pyramid mast with small arrays, one stack, 24 + 64 cells. */
function kpn(g, spec) {
  const U = spec.upper, y = spec.fb, B = spec.B, k = spec.L / 144;
  vlsGrid(g, 37 * k, deckY(spec, 37 * k), 3, 8);
  slab(g, 26 * k, 7.5, B * 0.82, B * 0.7, 23 * k, U, 12 * k, y, 0);
  slab(g, 13 * k, 5.5, B * 0.6, B * 0.42, 10 * k, U, 13 * k, y + 7.5, 0);
  box(g, 0.6, 1.1, B * 0.42, 0x141a1f, 18.9 * k, y + 10.6, 0);
  shipNavLights(g, 18 * k, y + 10.5, B * 0.32);
  const r = 1.6 * k; for (const s of [1, -1]) spyFace(g, 18.5 * k, y + 11, s * B * 0.17, s * PI / 4, r);
  pyramidMast(g, 10 * k, y + 13, 12, 2, U);
  stack(g, -6 * k, y, 9 * k, B * 0.36, 8.5, U);
  cans(g, -12.8 * k, deckY(spec, -12.8 * k), 2);
  vlsGrid(g, -20 * k, deckY(spec, -20 * k), 8, 8);
  hangarDeck(g, spec, -33 * k, 12 * k, B * 0.8, 5.6, U);
  ciws(g, -33 * k, y + 5.6, 0);
  lines(g, [10 * k, y + 31, 0, 64 * k, deckY(spec, 64 * k) + 2, 0, 10 * k, y + 31, 0, -64 * k, y + 2, 0]);
  g.userData.bridge = [20 * k, y + 9.5, 0]; g.userData.vls = [36 * k, -20 * k];
  return [];
}
// ── WWII deck clutter for the procedural ships: twin AA mounts along the deck edge, boats, searchlights ──
const AA_GEO = { base: new THREE.CylinderGeometry(0.75, 0.85, 0.5, 8), shield: new THREE.BoxGeometry(0.25, 0.9, 1.6), barrel: new THREE.CylinderGeometry(0.06, 0.07, 2.4, 6) };
AA_GEO.barrel.rotateZ(-PI / 2); AA_GEO.barrel.translate(1.2, 0, 0);
function aaMount(g, x, y, z, out) {
  const m = new THREE.Group(); m.position.set(x, y, z); m.rotation.y = out > 0 ? -PI / 2 : PI / 2; g.add(m);
  const b = shadowed(new THREE.Mesh(AA_GEO.base, mat(0x4f585e))); b.position.y = 0.25; m.add(b);
  const sh = shadowed(new THREE.Mesh(AA_GEO.shield, mat(0x5e676d))); sh.position.set(0.5, 0.9, 0); m.add(sh);
  for (const dz of [-0.28, 0.28]) { const br = new THREE.Mesh(AA_GEO.barrel, mat(0x2e3337)); br.position.set(0.3, 1.0, dz); br.rotation.z = 0.45; m.add(br); }
}
function dress(g, spec) {
  if (spec.modern || ["carrier", "cargo", "mcarrier"].includes(spec.style)) return;
  const L = spec.L, busy = spec.turrets.map((t) => t.x), n = Math.max(2, Math.round(L / 30));
  for (let i = 0; i < n; i++) {
    const x = -L * 0.3 + (i / (n - 1)) * L * 0.58; if (busy.some((bx) => Math.abs(bx - x) < 10)) continue;
    const t = (x + L / 2) / L, y = deckY(spec, x), hb = halfBeam(spec, t); for (const sd of [1, -1]) aaMount(g, x, y, sd * hb * 0.78, sd);
  }
  if (L > 100) for (const sd of [1, -1]) { const b = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 4.2, 4, 8), mat(0x7a7f74))); b.rotation.z = PI / 2; b.position.set(-L * 0.04, deckY(spec, -L * 0.04) + 1.1, sd * halfBeam(spec, 0.46) * 0.55); g.add(b); }
}
/** 윤영하급 PKG / 소형 유도탄정: low stealth deckhouse, integrated mast with radome, canister launchers aft, 40mm aft. */
function patrol(g, spec) {
  const U = spec.upper, y = spec.fb, B = spec.B, k = spec.L / 63;
  slab(g, 20 * k, 3.2 * Math.min(1, k + 0.2), B * 0.86, B * 0.72, 17 * k, U, 1.5 * k, y, 0);
  const h1 = 3.2 * Math.min(1, k + 0.2);
  slab(g, 9 * k, 2.5, B * 0.7, B * 0.5, 7 * k, U, 4.5 * k, y + h1, 0);
  box(g, 0.4, 0.75, B * 0.48, 0x141a1f, 8.7 * k, y + h1 + 1.5, 0);
  shipNavLights(g, 7.5 * k, y + h1 + 1.9, B * 0.38);
  slab(g, 4 * k, 4.2 * k, 2.6 * k, 1.1 * k, 2.4 * k, U, 1.5 * k, y + h1 + 2.5, 0);
  const top = y + h1 + 2.5 + 4.2 * k, d = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.85 * k, 12, 8), mat(0xe6e8e8))); d.position.set(1.5 * k, top + 0.9 * k, 0); g.add(d);
  cyl(g, 0.05, 0.08, 4 * k, 0x3a4045, 0.5 * k, top, 0, 4);
  box(g, 3 * k, 1.3, 2.2 * k, 0x1e2226, -6 * k, y + h1, 0);
  cans(g, -13 * k, y, spec.cans || 2);
  if (k > 0.8) ciws(g, -24 * k, deckY(spec, -24 * k), 0);
  lines(g, [1.5 * k, top, 0, 29 * k, deckY(spec, 29 * k) + 1, 0, 1.5 * k, top, 0, -29 * k, y + 1, 0]);
  g.userData.bridge = [9 * k, y + h1 + 2, 0]; g.userData.vls = [-13 * k];
  return [];
}
/** 대구급 FFG / 충무공이순신급 DDH / 나진급: one long stealth deckhouse, pyramid mast, one or two stacks, canisters midships, hangar aft (spec.ff). */
function frigate(g, spec) {
  const U = spec.upper, y = spec.fb, B = spec.B, k = spec.L / 122, f = spec.ff || {}, vx = [];
  if (f.vf) { vlsGrid(g, 33 * k, deckY(spec, 33 * k), ...f.vf); vx.push(33 * k); }
  slab(g, 30 * k, 6.4, B * 0.84, B * 0.72, 27 * k, U, 12 * k, y, 0);
  slab(g, 13 * k, 4.4, B * 0.64, B * 0.48, 10.5 * k, U, 16 * k, y + 6.4, 0);
  box(g, 0.5, 1, B * 0.44, 0x141a1f, 21.6 * k, y + 9.2, 0);
  box(g, 2.6 * k, 0.45, B * 0.9, U, 20.4 * k, y + 8.6, 0);
  shipNavLights(g, 20.4 * k, y + 9.1, B * 0.45);
  pyramidMast(g, 12.5 * k, y + 10.8, 11 * k, 1.9 * k, U);
  if (f.stacks === 2) { stack(g, -1 * k, y, 7 * k, B * 0.3, 8.5, U); stack(g, -16 * k, y, 7 * k, B * 0.3, 8.5, U); }
  else stack(g, -6 * k, y, 9 * k, B * 0.36, 8, U);
  slab(g, 24 * k, 3, B * 0.58, B * 0.54, 24 * k, U, -9 * k, y, 0);
  cans(g, -9 * k, y + 3, spec.cans || 4);
  if (spec.L > 110) for (const s of [1, -1]) boat(g, -9 * k, y + 3, s * B * 0.4);
  if (f.va) { vlsGrid(g, -25 * k, deckY(spec, -25 * k), ...f.va); vx.push(-25 * k); }
  if (f.heli) { hangarDeck(g, spec, -34 * k, 12 * k, B * 0.84, 5.8, U); ciws(g, -34 * k, y + 5.8, 0); }
  else { slab(g, 12 * k, 3, B * 0.6, B * 0.5, 10 * k, U, -32 * k, y, 0); }
  if (f.ram) ciws(g, 24.5 * k, y + 6.4, 0);
  lines(g, [12.5 * k, y + 10.8 + 11 * k + 6, 0, 56 * k, deckY(spec, 56 * k) + 2, 0, 12.5 * k, y + 10.8 + 11 * k + 6, 0, -56 * k, y + 2, 0]);
  g.userData.bridge = [22 * k, y + 9.6, 0]; g.userData.vls = vx.length ? vx : [-9 * k];
  return [];
}
const STYLE = { mcarrier, cargo, aegis, pla, kpn, patrol, frigate };

const CASING_G = new THREE.CylinderGeometry(0.11, 0.12, 0.95, 8); CASING_G.rotateZ(-PI / 2);
const CASING_M = new THREE.MeshStandardMaterial({ color: 0xe2b23c, roughness: 0.25, metalness: 0.85 });
const LOADER_M = {
  brass: new THREE.MeshStandardMaterial({ color: 0xe6b640, roughness: 0.26, metalness: 0.84 }),
  warhead: new THREE.MeshStandardMaterial({ color: 0xc24434, roughness: 0.4, metalness: 0.45 }),
  rammer: new THREE.MeshStandardMaterial({ color: 0x9aa4aa, roughness: 0.35, metalness: 0.78 }),
  bay: new THREE.MeshStandardMaterial({ color: 0x161a1d, roughness: 0.85 }),
  ready: new THREE.MeshBasicMaterial({ color: 0x48ff7a }),
  busy: new THREE.MeshBasicMaterial({ color: 0xff9f38 }),
};
function buildTurret(ship, t, i) {
  const spec = ship.spec, g = ship.gun, cal = g.cal, y = deckY(spec, t.x);
  const tw = cal >= 380 ? 12 : cal >= 200 ? 9.2 : cal >= 150 ? 7.6 : cal < 90 ? 3 : cal < 120 ? 3.8 : 4.6, td = tw * 0.82, th = cal >= 380 ? 3 : cal >= 150 ? 2.5 : 2.3;
  cyl(ship.tilt, tw * 0.46, tw * 0.46, t.up + 1.2, spec.upper, t.x, y, 0, 18);
  cyl(ship.tilt, tw * 0.48, tw * 0.48, 0.4, 0x5a6266, t.x, y + t.up + 0.8, 0, 18);
  const grp = new THREE.Group(); grp.position.set(t.x, y + t.up + 1.2, 0); ship.tilt.add(grp);
  if (spec.modern) slab(grp, tw * 1.25, th * 1.05, td * 1.15, td * 0.5, tw * 0.55, spec.upper, -tw * 0.05, 0, 0, -tw * 0.2); // faceted stealth gun shield
  else { box(grp, tw, th, td, spec.upper, -tw * 0.1, 0, 0); box(grp, tw * 0.9, 0.22, td * 0.92, 0x5a6266, -tw * 0.1, th, 0); }
  if (cal >= 200) box(grp, 1.2, 0.9, td * 1.25, spec.upper, -tw * 0.45, th * 0.55, 0);
  // Breech loader bay + twin roof hatches + rising brass/warhead projectile + rammer + status indicator
  const bayY = th * (spec.modern ? 1.05 : 1.18), bayX = -tw * 0.16, bayL = tw * 0.52, bayW = Math.min(td * 0.38, 2.2);
  const bayWell = new THREE.Mesh(new THREE.BoxGeometry(bayL, 0.16, bayW), LOADER_M.bay); bayWell.position.set(bayX, bayY - 0.04, 0); grp.add(bayWell);
  const hGeoL = new THREE.BoxGeometry(bayL, 0.1, bayW * 0.52); hGeoL.translate(0, 0.05, bayW * 0.26);
  const hGeoR = new THREE.BoxGeometry(bayL, 0.1, bayW * 0.52); hGeoR.translate(0, 0.05, -bayW * 0.26);
  const hatchL = new THREE.Group(); hatchL.position.set(bayX, bayY, -bayW * 0.5); hatchL.add(new THREE.Mesh(hGeoL, mat(0x525a60))); grp.add(hatchL);
  const hatchR = new THREE.Group(); hatchR.position.set(bayX, bayY, bayW * 0.5); hatchR.add(new THREE.Mesh(hGeoR, mat(0x525a60))); grp.add(hatchR);
  const shellMesh = new THREE.Group(), shLen = clamp(tw * 0.34, 1.45, 3.6), shR = clamp(tw * 0.055, 0.22, 0.48);
  const shCase = new THREE.Mesh(new THREE.CylinderGeometry(shR, shR, shLen * 0.62, 10), LOADER_M.brass); shCase.rotation.z = -PI / 2; shCase.position.x = -shLen * 0.18;
  const shHead = new THREE.Mesh(new THREE.ConeGeometry(shR, shLen * 0.44, 10), LOADER_M.warhead); shHead.rotation.z = -PI / 2; shHead.position.x = shLen * 0.34;
  shellMesh.add(shCase, shHead); shellMesh.position.set(-tw * 0.22, bayY + 0.24, 0); shellMesh.visible = false; grp.add(shellMesh);
  const rammerMesh = new THREE.Mesh(new THREE.CylinderGeometry(shR * 0.36, shR * 0.36, shLen * 0.72, 8), LOADER_M.rammer);
  rammerMesh.rotation.z = -PI / 2; rammerMesh.position.set(-tw * 0.46, bayY + 0.24, 0); rammerMesh.visible = false; grp.add(rammerMesh);
  const statusLight = new THREE.Mesh(new THREE.SphereGeometry(clamp(tw * 0.032, 0.14, 0.26), 8, 6), LOADER_M.ready);
  statusLight.position.set(tw * 0.08, bayY + 0.14, td * 0.2); grp.add(statusLight);

  const pivot = new THREE.Group(); pivot.position.set(tw * 0.38, th * 0.5, 0); grp.add(pivot);
  const r = (cal / 1000) * 0.95, spc = t.n === 1 ? 0 : tw * (t.n === 3 ? 0.27 : 0.3), bars = [];
  for (let b = 0; b < t.n; b++) {
    const zz = (b - (t.n - 1) / 2) * spc;
    const bar = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 1.25, g.len, 10), mat(0x474e52))); bar.rotation.z = -PI / 2; bar.position.set(g.len / 2, 0, zz); pivot.add(bar);
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r * 0.88, g.len * 0.08, 10), mat(0x3a4044)); muzzle.position.y = g.len * 0.45; bar.add(muzzle);
    const sleeve = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.48, r * 1.64, g.len * 0.28, 10), mat(0x5b6368))); sleeve.rotation.z = -PI / 2; sleeve.position.set(g.len * 0.14, 0, zz); pivot.add(sleeve);
    bars.push({ bar, sleeve, rec: 0 });
    if (cal >= 150) { const bag = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.6, r * 2.1, 1.6 + cal / 400, 10), mat(0xcbc4ae)); bag.rotation.z = -PI / 2; bag.position.set(0.9, 0, zz); pivot.add(bag); }
  }
  grp.rotation.y = -t.rest;
  return { i, grp, pivot, bars, hatchL, hatchR, shellMesh, rammerMesh, statusLight, bayY, th, x: t.x, y: y + t.up + 1.2 + th * 0.5, rest: t.rest, n: t.n, spc, tw, d: 0, elev: 0, open: 0, reload: 3 + i * 1.2 + rnd() * 2, alive: true, onTarget: false, inArc: true, range: 9000 };
}

// ── the ship ────────────────────────────────────────────────────────────────
const ARC = 150 * DEG;
export const TELE = [{ n: "후진 반속", f: -0.3 }, { n: "정지", f: 0 }, { n: "미속", f: 0.3 }, { n: "반속", f: 0.55 }, { n: "원속", f: 0.8 }, { n: "전속", f: 1 }];
G.casings ||= [];
let salvoSeq = 0; export const salvos = new Map();
export class Ship {
  constructor(spec, x, z, heading, side, upg = {}) {
    this.spec = spec; this.side = side; this.isPlayer = false;
    this.gun = GUNS[spec.gun]; this.tb = table(spec.gun);
    const u = Object.assign({ engine: 0, fc: 0, gun: 0, armor: 0 }, upg); this.upg = u;
    this.vmax = spec.vmax * KN * (1 + 0.05 * u.engine); this.turnRate = spec.turn * DEG * 1.8;
    this.reloadT = this.gun.reload * RELOAD_K * (1 - 0.08 * u.gun); this.dispK = 1 - 0.15 * u.fc;
    this.trainRate = this.gun.train * DEG * (1 + 0.1 * u.fc); this.elevRate = this.gun.elev * DEG; this.armorK = 1 - 0.08 * u.armor;
    this.maxHp = spec.hp; this.hp = spec.hp; this.engine = 1; this.flooding = 0; this.fires = []; this.alive = true; this.sinking = 0; this.listSide = 0;
    this.pos = new THREE.Vector3(x, 0, z); this.heading = heading; this.speed = this.vmax * 0.8; this.tele = 4; this.rudder = 0; this.rudderCmd = 0; this.yawRate = 0;
    this.aimB = heading; this.aimR = Math.min(this.tb.max * 0.35, 12000); this.queue = []; this.phase = rnd() * 10; this.wakeT = 0; this.smokeT = 0; this.sprayT = 0;
    this.root = new THREE.Group(); this.tilt = new THREE.Group(); this.root.add(this.tilt);
    this.tilt.add(buildHull(spec)); hullDetails(this.tilt, spec); hullNumber(this.tilt, spec);
    paint.color = spec.upper; paint.map = upperTexture(spec);
    this.funnels = STYLE[spec.style](this.tilt, spec); dress(this.tilt, spec);
    this.body = this.tilt.children.slice();
    this.turrets = spec.turrets.map((t, i) => buildTurret(this, t, i)); this.name = spec.short;
    const tMounts = this.tilt.userData.torpMounts || [];
    this.torps = spec.torp ? spec.torp.mounts.map((x, idx) => ({ x, reload: 6 + rnd() * 6, mount: tMounts[idx] || null, maxReload: spec.torp.reload })) : [];
    this.vlsCells = this.tilt.userData.vlsCells || [];
    this.canRacks = this.tilt.userData.canRacks || [];
    this.pdMounts = this.tilt.userData.pdMounts || [];
    paint.color = null; paint.map = null;
    this.bridge = this.tilt.userData.bridge || [spec.L * 0.15, spec.fb + 8, 0];
    this.model = null;
    scene.add(this.root); this.sync(0);
  }
  get fwd() { return new THREE.Vector3(Math.cos(this.heading), 0, Math.sin(this.heading)); }
  get vel() { return this.fwd.multiplyScalar(this.speed * G.SPD); }
  turretPos(t) { const f = this.fwd; return new THREE.Vector3(this.pos.x + f.x * t.x, t.y, this.pos.z + f.z * t.x); }
  aimPoint() { return new THREE.Vector3(this.pos.x + Math.cos(this.aimB) * this.aimR, 0, this.pos.z + Math.sin(this.aimB) * this.aimR); }
  sync(time) {
    const sp = this.spec;
    this.root.position.set(this.pos.x, Math.sin(time * 0.5 + this.phase) * 0.3 * (120 / sp.L + 0.4) - (this.sinking > 0 ? Math.min(this.sinking * 0.55, sp.D * 2 + 20) : 0) - this.flooding * 0.25, this.pos.z);
    this.root.rotation.y = -this.heading;
    const list = this.flooding * 0.012 * (this.listSide || 1), cap = this.sinking > 0 ? Math.min(this.sinking * 0.03, 1.35) * (this.listSide || 1) : 0;
    this.tilt.rotation.x = Math.sin(time * 0.33 + this.phase) * 0.012 * (150 / sp.L + 0.3) - this.yawRate * 1.6 + list + cap;
    this.tilt.rotation.z = Math.sin(time * 0.42 + this.phase * 2) * 0.005 * (150 / sp.L + 0.3);
  }
  update(dt) {
    const sp = this.spec;
    if (this.sinking > 0) { this.sinking += dt; this.speed *= Math.exp(-dt / 9); this.yawRate *= Math.exp(-dt / 4); }
    else {
      const vmax = this.vmax * this.engine * (1 - 0.1 * Math.min(this.flooding, 5));
      const target = TELE[this.tele].f * vmax * (1 - 0.22 * Math.abs(this.rudder));
      this.speed += (target - this.speed) * dt / (target > this.speed ? 9 * Math.sqrt(sp.L / 190) : 7 * Math.sqrt(sp.L / 190));
      if (this.rudderJam > 0) this.rudderJam -= dt; else this.rudder += clamp(this.rudderCmd - this.rudder, -1 * dt, 1 * dt); // jammed: the rudder stays where the hit left it
      const yawT = this.rudder * this.turnRate * (this.speed / this.vmax) * 1.6;
      this.yawRate += (yawT - this.yawRate) * dt / (1.6 * Math.sqrt(sp.L / 190));
      for (let i = this.fires.length - 1; i >= 0; i--) { this.fires[i] -= dt; this.damage(0.2 * dt * this.maxHp / 100); if (this.fires[i] <= 0) this.fires.splice(i, 1); }
    }
    this.heading = wrap(this.heading + this.yawRate * dt);
    const ox = this.pos.x, oz = this.pos.z;
    this.pos.x += Math.cos(this.heading) * this.speed * G.SPD * dt; this.pos.z += Math.sin(this.heading) * this.speed * G.SPD * dt; // G.SPD: game pace — the knots shown stay true
    if (G.islands.length && this.sinking === 0) { // land: look ahead and turn to the clear side; never sail onto it
      if (landAt(this.pos.x, this.pos.z)) { this.pos.x = ox; this.pos.z = oz; this.speed *= 0.5; }
      this.landT = (this.landT || 0) - dt;
      if (this.landT <= 0) { this.landT = 0.4; const L = this.spec.L, f = (d, a) => landAt(this.pos.x + Math.cos(this.heading + a) * d, this.pos.z + Math.sin(this.heading + a) * d);
        this.avoid = [L * 1.5, L * 4, L * 8].some((d) => f(d, 0) || f(d, 0.25) || f(d, -0.25)) ? (f(L * 5, 0.7) && !f(L * 5, -0.7) ? -1 : 1) : 0; }
      if (this.avoid) this.rudderCmd = this.avoid;
    }
    const ap = this.aimPoint();
    for (const t of this.turrets) {
      if (!t.alive) { t.onTarget = false; if (t.statusLight) t.statusLight.material = LOADER_M.busy; continue; }
      const tp = this.turretPos(t), dx = ap.x - tp.x, dz = ap.z - tp.z; t.range = Math.hypot(dx, dz);
      const d = wrap(wrap(Math.atan2(dz, dx) - this.heading) - t.rest); t.inArc = Math.abs(d) <= ARC;
      const want = clamp(d, -ARC, ARC); t.d += clamp(want - t.d, -this.trainRate * dt, this.trainRate * dt);
      const was = t.reload; t.reload = Math.max(0, was - dt);
      const p = t.reload > 0 ? 1 - clamp(t.reload / Math.max(this.reloadT, 0.1), 0, 1) : 1;
      const we = solve(this.tb, t.range).elev;
      const wantEl = t.reload > 0 && p > 0.14 && p < 0.78 ? 0.105 : we;
      t.elev += clamp(wantEl - t.elev, -this.elevRate * dt, this.elevRate * dt);
      t.onTarget = t.inArc && Math.abs(want - t.d) < 0.012 && Math.abs(we - t.elev) < 0.006 && this.sinking === 0;
      if (this.isPlayer && was > 0 && t.reload === 0 && G.state === "playing" && !G.plane) sfx.ready();
      if (t.bars) for (const br of t.bars) if (br.rec > 0) {
        br.rec = Math.max(0, br.rec - dt * 1.8);
        const rDist = Math.sin(Math.pow(br.rec, 0.45) * PI) * (this.gun.cal / 406) * 1.45;
        br.bar.position.x = this.gun.len / 2 - rDist;
        if (br.sleeve) br.sleeve.position.x = this.gun.len * 0.14 - rDist * 0.35;
      }
      if (t.hatchL) {
        const wantOpen = t.reload > 0 && p > 0.1 && p < 0.88 ? 1 : 0;
        t.open += (wantOpen - t.open) * Math.min(1, dt * 8);
        t.hatchL.rotation.x = -t.open * 1.4; t.hatchR.rotation.x = t.open * 1.4;
        t.statusLight.material = t.reload > 0 ? LOADER_M.busy : LOADER_M.ready;
        if (t.reload > 0 && p >= 0.15 && p < 0.85) {
          if (p < 0.5) {
            const u = clamp((p - 0.15) / 0.35, 0, 1);
            t.shellMesh.visible = true;
            t.shellMesh.position.set(-t.tw * 0.24, t.bayY - 0.35 + u * 0.62, 0);
            t.rammerMesh.visible = true; t.rammerMesh.position.set(-t.tw * 0.48, t.bayY + 0.27, 0);
          } else {
            const u = clamp((p - 0.5) / 0.35, 0, 1);
            t.shellMesh.visible = u < 0.92;
            t.shellMesh.position.set(-t.tw * 0.24 + u * t.tw * 0.48, t.bayY + 0.27, 0);
            t.rammerMesh.visible = true; t.rammerMesh.position.set(-t.tw * 0.48 + u * t.tw * 0.34, t.bayY + 0.27, 0);
          }
        } else { t.shellMesh.visible = false; t.rammerMesh.visible = false; }
      }
      t.grp.rotation.y = -(t.rest + t.d); t.pivot.rotation.z = t.elev;
    }
    for (const m of this.torps) {
      m.reload = Math.max(0, m.reload - dt);
      if (!m.mount) continue;
      const rel = wrap(this.aimB - this.heading), sd = rel < 0 ? -1 : 1, wantAng = sd * clamp(Math.abs(rel), 50 * DEG, 130 * DEG);
      m.mount.grp.rotation.y += clamp(wrap(-wantAng - m.mount.grp.rotation.y), -1.2 * dt, 1.2 * dt);
      const win = (m.maxReload || 60) * 0.35, empty = m.reload > win;
      for (const tip of m.mount.tips) {
        if (empty) tip.visible = false;
        else { tip.visible = true; const u = m.reload > 0 ? 1 - m.reload / win : 1; tip.position.x = m.mount.len * (-0.15 + 0.65 * clamp(u, 0, 1)) + 0.08; }
      }
    }
    for (const cell of this.vlsCells) {
      if (cell.state === "loaded") {
        if (cell.open > 0) { cell.open = Math.max(0, cell.open - dt * 2.5); cell.lid.rotation.z = cell.open * 1.48; }
        cell.msl.visible = false;
        if (cell.glowA > 0) { cell.glowA = 0; cell.glow.visible = false; }
        continue;
      }
      cell.t -= dt;
      cell.open = Math.min(1, cell.open + dt * 6);
      cell.lid.rotation.z = cell.open * 1.48;
      if (cell.glowA > 0) { cell.glowA = Math.max(0, cell.glowA - dt * 0.7); cell.glow.visible = cell.glowA > 0.02; cell.glowMat.opacity = cell.glowA; }
      if (cell.state === "firing" && cell.t < 5.6) cell.state = "reloading";
      if (cell.state === "reloading") {
        const u = clamp((5.6 - cell.t) / 4.4, 0, 1);
        cell.msl.visible = u > 0.05 && u < 0.94;
        if (cell.msl.visible) {
          const lift = u < 0.45 ? u / 0.45 : u < 0.65 ? 1 : 1 - (u - 0.65) / 0.29;
          cell.msl.position.y = cell.baseY + lift * 1.08;
        }
        if (cell.t <= 1.2) { cell.state = "loaded"; cell.msl.visible = false; }
      }
    }
    for (const can of this.canRacks) {
      if (can.state !== "reloading") continue;
      can.t -= dt;
      if (can.t < 5.5 && can.t >= 0.4) {
        const u = clamp((5.5 - can.t) / 5.0, 0, 1);
        can.msl.visible = true; can.msl.position.x = -3.4 + u * 4.08; can.cap.rotation.z = 1.25 * (1 - u * 0.7);
      } else if (can.t < 0.4) { can.msl.visible = true; can.msl.position.x = 0.68; can.cap.rotation.z = 0.15; }
      else { can.msl.visible = false; can.cap.rotation.z = 1.35; }
      if (can.t <= 0) { can.state = "loaded"; can.msl.position.x = 0.68; can.cap.rotation.z = 0.15; }
    }
    for (const pd of this.pdMounts) for (const tip of pd.tips) if (tip.cd > 0) { tip.cd -= dt; if (tip.cd <= 0) { tip.cd = 0; tip.m.visible = true; } }
    for (let i = this.queue.length - 1; i >= 0; i--) { const q = this.queue[i]; q.delay -= dt; if (q.delay <= 0) { this.queue.splice(i, 1); if (q.t.alive && this.sinking === 0) launch(this, q); } }
    this.wakeT -= Math.abs(this.speed) * dt;
    if (this.wakeT <= 0 && Math.abs(this.speed) > 1) { this.wakeT = 10; const f = this.fwd; spawnWake(this.pos.x - f.x * sp.L * 0.47, this.pos.z - f.z * sp.L * 0.47, this.heading, sp.B); }
    this.sprayT -= dt;
    if (this.sprayT <= 0 && this.speed > 2 && this.sinking === 0) {
      this.sprayT = 0.1; const f = this.fwd, k = this.speed / this.vmax, sz = Math.sqrt(sp.B / 30);
      for (const s of [1, -1]) spray.spawn({ x: this.pos.x + f.x * sp.L * 0.45 - f.z * s * sp.B * 0.12, y: 1.4, z: this.pos.z + f.z * sp.L * 0.45 + f.x * s * sp.B * 0.12,
        vx: -f.z * s * 5.5 * k - f.x * 2, vy: 3.8 * k + 1, vz: f.x * s * 5.5 * k - f.z * 2, g: GRAV * 0.6, life: 1.9, s0: 4 * sz, s1: 14 * sz, a: 0.5 * k, fade: 0.7, c: 0xffffff });
    }
    this.smokeT -= dt;
    if (this.smokeT <= 0) {
      this.smokeT = 0.45;
      const spdK = clamp(Math.abs(this.speed) / Math.max(this.vmax, 1), 0, 1);
      if (this.sinking === 0 && this.root.visible) for (const fl of this.funnels) { const w = this.tilt.localToWorld(new THREE.Vector3(...fl)); smoke.spawn({ x: w.x, y: w.y, z: w.z, vx: 2.2 - this.fwd.x * this.speed * 0.45, vy: 2.8 + 2.4 * spdK, vz: 0.9 - this.fwd.z * this.speed * 0.45, life: 7 + 4 * spdK, s0: 4.5 + 2.5 * spdK, s1: 22 + 18 * spdK, a: 0.14 + 0.2 * spdK, c: spdK > 0.75 ? 0x2c2a28 : 0x424446 }); }
      for (let i = 0; i < Math.min(this.fires.length, 3); i++) {
        const lx = ((i * 37 + this.phase * 20) % (sp.L * 0.47)) - sp.L * 0.23, w = this.tilt.localToWorld(new THREE.Vector3(lx, sp.fb + 6, 0));
        for (let k = 0; k < 2; k++) smoke.spawn({ x: w.x + gauss() * 2, y: w.y + k * 4, z: w.z + gauss() * 2, vx: 3 + rnd() * 2, vy: 13 + rnd() * 5, vz: 1.2, drag: 0.06, life: 16 + rnd() * 6, s0: 8, s1: 70 + rnd() * 30, a: 0.75, fade: 0.8, c: k ? 0x2a2622 : 0x141210 }); // tall, drifting column
        flash.spawn({ x: w.x + gauss(), y: w.y - 1.5, z: w.z + gauss(), vy: 3, life: 0.6 + rnd() * 0.4, s0: 10 + rnd() * 6, s1: 5, a: 0.95, c: rnd() < 0.5 ? 0xff6a1a : 0xffa030 });
      }
      if (this.sinking > 0 && this.sinking < 30) {
        const w = this.tilt.localToWorld(new THREE.Vector3((rnd() - 0.5) * sp.L * 0.6, sp.fb, 0));
        smoke.spawn({ x: w.x, y: Math.max(w.y, 2), z: w.z, vx: 2, vy: 5, vz: 1, life: 14, s0: 14, s1: 60, a: 0.6, c: 0x161616 });
        for (let k = 0; k < 2; k++) spray.spawn({ x: w.x + gauss() * 4, y: 0.8, z: w.z + gauss() * 4, vx: gauss() * 4, vy: 5 + rnd() * 7, vz: gauss() * 4, g: GRAV * 0.8, life: 1.3, s0: 3.5, s1: 12, a: 0.58, fade: 0.7, c: 0xf0f6fa });
        if (rnd() < 0.45) rings.spawn({ x: w.x, z: w.z, w0: 6, l0: 6, w1: 32, l1: 32, life: 2.6, a: 0.48, c: 0xe8f4f8 });
        if (rnd() < 0.22) flash.spawn({ x: w.x, y: Math.max(w.y, 2.5), z: w.z, life: 0.35, s0: 8, s1: 22, a: 0.88, c: 0xff7824 });
      }
    }
    this.sync(G.time);
  }
  damage(n) {
    if (!this.alive || this.boarded) return; if (G.staffK) n *= this.side === "us" ? G.staffK.inK : G.staffK.outK; if (G.perkK) { if (this.side === "us") n *= G.perkK.fleetK * (this.isPlayer ? 1 : G.perkK.escortK); else if (G.perkK.alpha && G.battleT < 60) n *= 1.2; } this.hp -= n; if (n > 0.2) G.lastHitT = G.battleT;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; this.sinking = 0.01; this.listSide = rnd() < 0.5 ? -1 : 1; const d = this.pos.distanceTo(camera.position); at(d, () => sfx.explode(d)); G.onSunk(this); }
  }
  fire(max = Infinity) {
    let n = 0, shells = 0; const salvo = ++salvoSeq;
    for (const t of this.turrets) if (n < max && t.alive && t.reload <= 0 && t.onTarget) {
      t.reload = this.reloadT * (0.97 + rnd() * 0.06) * (this.side === "us" && G.staffK ? G.staffK.reloadK : 1);
      for (let b = 0; b < t.n; b++) this.queue.push({ t, b, delay: n * 0.12 + b * 0.09 + rnd() * 0.05, salvo, first: b === 0, he: this.ammo === "he" });
      n++; shells += t.n;
    }
    if (n) this.revealT = 25;
    if (n && this.isPlayer) salvos.set(salvo, { n: shells, landed: 0, sum: 0, hits: 0 });
    return n;
  }
  dispose() { scene.remove(this.root); }
}

// ── shells ──────────────────────────────────────────────────────────────────
const OGIVE = (() => {
  const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.47, 0), new THREE.Vector2(0.5, 0.06), new THREE.Vector2(0.5, 0.32), new THREE.Vector2(0.53, 0.36), new THREE.Vector2(0.53, 0.46), new THREE.Vector2(0.5, 0.5), new THREE.Vector2(0.5, 2.1)];
  for (let i = 1; i <= 12; i++) { const a = i / 12; pts.push(new THREE.Vector2(0.5 * Math.sqrt(1 - a * a), 2.1 + a * 2.3)); }
  return new THREE.LatheGeometry(pts, 14);
})();
const SHELL_MAT = new THREE.MeshStandardMaterial({ color: 0x3d3b37, metalness: 0.75, roughness: 0.35 });
const STREAK_GEO = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1, true); STREAK_GEO.translate(0, -0.5, 0);
const STREAK_MAT = new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
const Y = new THREE.Vector3(0, 1, 0), tmpD = new THREE.Vector3();
class Shell {
  constructor(owner, pos, vel, salvo) {
    this.owner = owner; this.gun = owner.gun; this.pos = pos; this.vel = vel; this.salvo = salvo; this.t = 0;
    this.mesh = new THREE.Mesh(OGIVE, SHELL_MAT); this.streak = new THREE.Mesh(STREAK_GEO, STREAK_MAT); scene.add(this.mesh, this.streak);
  }
  draw() {
    const d = this.pos.distanceTo(camera.position), dia = this.gun.cal / 1000, v = this.vel.length(); tmpD.copy(this.vel).divideScalar(v);
    this.mesh.position.copy(this.pos); this.mesh.quaternion.setFromUnitVectors(Y, tmpD); this.mesh.scale.setScalar(dia * clamp(d / 240, 1, 9));
    const w = clamp(d * 0.0011, 0.1, 5) * (0.5 + dia), len = v * 0.045 + w * 3;
    this.streak.position.copy(this.pos); this.streak.quaternion.copy(this.mesh.quaternion); this.streak.scale.set(w, len, w);
  }
  dispose() { scene.remove(this.mesh, this.streak); }
}
function muzzleFX(pos, f, el, cal, ship) {
  const k = cal / 406, dir = new THREE.Vector3(f.x * Math.cos(el), Math.sin(el), f.z * Math.cos(el));
  for (let i = 0; i < 3; i++) flash.spawn({ x: pos.x + dir.x * i * 9 * k, y: pos.y + dir.y * i * 9 * k, z: pos.z + dir.z * i * 9 * k, life: 0.2, s0: 15 * k + 4, s1: 30 * k + 7, a: 0.95, c: i ? 0xffa040 : 0xfff0c0 });
  flash.spawn({ x: pos.x + dir.x * 14 * k, y: pos.y + dir.y * 14 * k, z: pos.z + dir.z * 14 * k, vx: dir.x * 20, vy: dir.y * 20, vz: dir.z * 20, life: 0.45, s0: 18 * k + 4, s1: 50 * k + 9, a: 0.6, c: 0xff6a18 });
  for (let i = 0; i < 4 + Math.round(6 * k); i++) spark.spawn({ x: pos.x + gauss() * 1.5, y: pos.y + gauss() * 1.5, z: pos.z + gauss() * 1.5, vx: dir.x * (55 + rnd() * 35) + gauss() * 8, vy: dir.y * 45 + gauss() * 6, vz: dir.z * (55 + rnd() * 35) + gauss() * 8, g: GRAV * 0.5, life: 0.45 + rnd() * 0.3, s0: 1.4 * k + 0.4, s1: 0.3, a: 0.95, c: 0xffd27a });
  for (let i = 0; i < 3; i++) smoke.spawn({ x: pos.x + dir.x * (10 + i * 12) * k, y: pos.y + dir.y * (10 + i * 12) * k, z: pos.z + dir.z * (10 + i * 12) * k,
    vx: dir.x * (30 - i * 5) * k + 2, vy: 2.5 + dir.y * 10, vz: dir.z * (30 - i * 5) * k + 0.6, drag: 0.5, life: 7 + rnd() * 4, s0: 12 * k + 3, s1: 58 * k + 10, a: 0.6, c: 0x9a8c78 });
  if (cal >= 127) rings.spawn({ x: pos.x + f.x * 22 * k, z: pos.z + f.z * 22 * k, w0: 6, l0: 6, w1: 95 * k + 18, l1: 95 * k + 18, life: 1.4, a: 0.52 * k + 0.15, c: 0xd8e8f2, ease: 3 });
  if (cal >= 200) for (let i = 0; i < 2; i++) spray.spawn({ x: pos.x + f.x * 20 * k + gauss() * 4, y: 0.8, z: pos.z + f.z * 20 * k + gauss() * 4, vx: f.x * 10 + gauss() * 4, vy: 5 + rnd() * 5, vz: f.z * 10 + gauss() * 4, g: GRAV * 0.8, life: 1.2, s0: 5 * k + 2, s1: 14 * k + 5, a: 0.55, fade: 0.7, c: 0xe6f2f8 });
  if (ship.isPlayer && !G.plane) { G.shake = Math.min(G.shake + 0.6 * k + 0.12, 1.6); G.kick = Math.min((G.kick || 0) + 0.5 + 0.5 * k, 1); }
}
function launch(ship, q) {
  const t = q.t, g = ship.gun;
  const b = ship.heading + t.rest + t.d + gauss() * 0.0028 * ship.dispK * (G.wxDisp || 1);
  const el = solve(ship.tb, t.range * (1 + gauss() * g.disp * ship.dispK * (G.wxDisp || 1))).elev;
  const f = new THREE.Vector3(Math.cos(b), 0, Math.sin(b)), perp = new THREE.Vector3(-f.z, 0, f.x), tp = ship.turretPos(t);
  const zz = (q.b - (t.n - 1) / 2) * t.spc, L = t.tw * 0.38 + g.len;
  const pos = new THREE.Vector3(tp.x + f.x * L * Math.cos(el) + perp.x * zz, tp.y + Math.sin(el) * L, tp.z + f.z * L * Math.cos(el) + perp.z * zz);
  const vel = new THREE.Vector3(f.x * Math.cos(el), Math.sin(el), f.z * Math.cos(el)).multiplyScalar(g.V0);
  const sh = new Shell(ship, pos, vel, q.salvo); sh.he = !!q.he; G.shells.push(sh);
  if (t.bars?.[q.b]) t.bars[q.b].rec = 1;
  if (pos.distanceTo(camera.position) < 1600) {
    const k = clamp(g.cal / 406, 0.38, 1.0), ej = new THREE.Vector3(tp.x - f.x * t.tw * 0.25 + perp.x * (zz + t.tw * 0.14), tp.y + t.th * 0.48, tp.z - f.z * t.tw * 0.25 + perp.z * (zz + t.tw * 0.14));
    const cm = new THREE.Mesh(CASING_G, CASING_M); cm.scale.setScalar(0.55 + k * 0.85); cm.position.copy(ej); scene.add(cm);
    G.casings.push({ m: cm, p: ej.clone(), v: new THREE.Vector3((ship.vel?.x || 0) - f.x * (5 + rnd() * 3) + perp.x * (5 + rnd() * 4), 7 + rnd() * 4.5, (ship.vel?.z || 0) - f.z * (5 + rnd() * 3) + perp.z * (5 + rnd() * 4)), rx: (rnd() - 0.5) * 14, rz: (rnd() - 0.5) * 16, t: 0, sp: false });
    smoke.spawn({ x: ej.x, y: ej.y, z: ej.z, vy: 2.5, life: 1.4, s0: 1.1, s1: 3.4, a: 0.32, c: 0xd8d6d0 });
  }
  muzzleFX(pos, f, el, g.cal, ship);
  if (ship.isPlayer) { G.stats.shots++; if (G.plane) { if (q.first) { const d = pos.distanceTo(camera.position); at(d, () => sfx.farGun(d, g.cal)); } } else sfx.gun(q.first ? g.cal : g.cal * 0.68); }
  else if (q.first) { const d = pos.distanceTo(camera.position); at(d, () => sfx.farGun(d, g.cal)); }
}
export function hullTop(spec, lx) {
  const a = Math.abs(lx) / (spec.L / 2);
  if (spec.style === "carrier") return spec.fb + (a < 0.95 ? 9 : 1);
  return spec.fb + (a < 0.3 ? Math.max(spec.L * 0.07, 6) : a < 0.65 ? Math.max(spec.L * 0.035, 3) : 1);
}
/** Which ship (if any) contains world point p. */
export function hullHit(p, exclude) {
  for (const S of G.ships) {
    if (S === exclude || S.sinking > 20) continue;
    const dx = p.x - S.pos.x, dz = p.z - S.pos.z; if (dx * dx + dz * dz > (S.spec.L * 0.6) ** 2) continue;
    const c = Math.cos(S.heading), s = Math.sin(S.heading), lx = dx * c + dz * s, lz = -dx * s + dz * c, t = (lx + S.spec.L / 2) / S.spec.L;
    if (t < 0 || t > 1) continue;
    if (Math.abs(lz) <= halfBeam(S.spec, t) + 0.5 && p.y > -2.5 && p.y < hullTop(S.spec, lx)) return { ship: S, lx };
  }
  return null;
}
export function hitFX(p, k) {
  flash.spawn({ x: p.x, y: p.y + 3, z: p.z, life: 0.5, s0: 18 * k + 6, s1: 60 * k + 15, a: 1, c: 0xffa040 });
  flash.spawn({ x: p.x, y: p.y + 6, z: p.z, vy: 8, life: 0.9, s0: 24 * k + 6, s1: 70 * k + 12, a: 0.6, c: 0xff6418 });
  for (let i = 0; i < 6 + 14 * k; i++) spark.spawn({ x: p.x, y: p.y + 2, z: p.z, vx: gauss() * 14, vy: 10 + rnd() * 30, vz: gauss() * 14, g: GRAV, life: 1.2 + rnd() * 0.8, s0: 1.8, s1: 0.6, a: 1, c: 0xffc070 });
  for (let i = 0; i < 4 + 8 * k; i++) spray.spawn({ x: p.x, y: p.y + 2, z: p.z, vx: gauss() * 10, vy: 8 + rnd() * 20, vz: gauss() * 10, g: GRAV, life: 2.5, s0: 1.5, s1: 1.2, a: 0.9, fade: 0.3, c: 0x222222 });
  for (let i = 0; i < 6; i++) smoke.spawn({ x: p.x, y: p.y + 4, z: p.z, vx: gauss() * 5, vy: 5 + rnd() * 7, vz: gauss() * 5, life: 9, s0: 10 * k + 4, s1: 52 * k + 10, a: 0.72, c: 0x1c1a18 });
}
function landed(s, hit) {
  if (!s.owner.isPlayer) return;
  const rec = salvos.get(s.salvo), P = G.player, E = G.enemy; if (!rec || !E) return;
  rec.landed++; if (hit) rec.hits++;
  const dr = Math.hypot(s.pos.x - P.pos.x, s.pos.z - P.pos.z) - Math.hypot(E.pos.x - P.pos.x, E.pos.z - P.pos.z); rec.sum += dr;
  G.onImpact?.(s.pos.clone(), dr, hit, rec.landed >= rec.n ? rec : null);
  if (rec.landed >= rec.n) {
    salvos.delete(s.salvo);
    const avg = rec.sum / rec.n, r = Math.round(Math.abs(avg) / 50) * 50;
    const call = Math.abs(avg) < 60 ? "협차(스트래들)" : avg > 0 ? `원탄 약 ${fmt(r)} m` : `근탄 약 ${fmt(r)} m`;
    G.log(`탄착 관측: ${call}` + (rec.hits ? ` · 명중 ${rec.hits}발` : ""), rec.hits ? "hit" : "");
  }
}
const who = (ship) => (ship.side === "us" ? (ship.isPlayer ? "아군" : ship.spec.short) : "적");
function critical(ship, lx, who_) {
  let tur = null; for (const t of ship.turrets) if (t.alive && Math.abs(t.x - lx) < t.tw * 0.7) tur = t;
  if (tur && rnd() < 0.4) {
    tur.alive = false;
    if (rnd() < 0.05) { const w = ship.turretPos(tur); for (let i = 0; i < 14; i++) flash.spawn({ x: w.x + gauss() * 14, y: w.y + rnd() * 30, z: w.z + gauss() * 14, vy: 12, life: 1.6, s0: 30, s1: 90, a: 1, c: 0xff8a2a }); return { dmg: 55, note: `${who_} ${tur.i + 1}번 포탑 탄약고 유폭!` }; }
    return { dmg: 0, note: `관통 — ${who_} ${tur.i + 1}번 포탑 무력화` };
  }
  if (Math.abs(lx) < ship.spec.L * 0.17) {
    const r = rnd();
    if (r < 0.34) { ship.engine = Math.max(0.3, ship.engine - 0.22); return { dmg: 0, note: `관통 — ${who_} 기관실 피해` }; }
    if (r < 0.7) { ship.fires.push(32); if (ship.isPlayer) { sfx.alarm(); G.radio?.("fire"); } return { dmg: 0, note: `관통 — ${who_} 상부구조물 화재` }; }
  } else if (lx < -ship.spec.L * 0.3 && !(ship.rudderJam > 0) && rnd() < 0.3) { ship.rudderJam = 22 + rnd() * 10; if (ship.isPlayer) { sfx.alarm(); G.toast?.("조타실 피격 — 타 고착! R 수리로 복구"); } return { dmg: 0, note: `관통 — ${who_} 조타실 피해 · 타 고착` }; }
  else if (rnd() < 0.5) { ship.flooding++; if (ship.isPlayer) G.radio?.("flood"); ship.listSide = ship.listSide || (rnd() < 0.5 ? -1 : 1); return { dmg: 0, note: `관통 — ${who_} ${lx > 0 ? "함수" : "함미"} 침수` }; }
  return { dmg: 0, note: "관통" };
}
function resolveHit(ship, s, lx) {
  const g = s.gun, vh = Math.hypot(s.vel.x, s.vel.z), fall = Math.atan2(-s.vel.y, vh);
  const dxn = s.vel.x / vh, dzn = s.vel.z / vh, f = ship.fwd, sinA = Math.abs(dxn * f.z - dzn * f.x);
  const penK = g.cal / Math.max(ship.spec.belt, 1);
  let pen = clamp(0.18 + 0.82 * sinA, 0, 1); if (fall > 20 * DEG) pen = Math.max(pen, 0.72); pen *= clamp(penK * 1.15, 0.12, 1);
  const k = g.cal / 406; hitFX(s.pos, k);
  const d = s.pos.distanceTo(camera.position); at(d, () => sfx.hit(d, k));
  if (s.owner.isPlayer) { G.stats.hits++; G.gunHitMark = 0.6; }
  if (ship.isPlayer && !G.plane) G.shake = Math.min(G.shake + 0.9 * k, 1.5);
  landed(s, true);
  const tag = ship.isPlayer ? "피탄" : ship.side === "us" ? `${ship.spec.short} 피탄` : "명중", cls = ship.side === "us" ? "bad" : "hit";
  const mine = s.owner.isPlayer && ship.side === "foe", deal = (n, kind) => { if (mine) { ship.myHitT = G.battleT; G.stats.dealt = (G.stats.dealt || 0) + (Math.min(n, ship.hp) / ship.maxHp) * 100; G.ribbon?.(kind); } ship.damage(n); };
  if (s.he) { // high-capacity shell bursts on contact: no ricochet or over-penetration, less damage, often a fire
    deal(g.dmg[0] * (0.55 + rnd() * 0.3) * ship.armorK, "고폭탄 명중");
    if (rnd() < (g.cal >= 200 ? 0.3 : 0.15)) { ship.fires.push(32); if (ship.isPlayer) { sfx.alarm(); G.radio?.("fire"); } if (mine) G.ribbon?.("화재 발생"); G.log(`${tag}! 고폭탄 — 화재 발생`, cls); }
    else G.log(`${tag} — 고폭탄 작렬`, cls);
    return;
  }
  if (rnd() > pen) {
    at(d, () => sfx.ricochet?.(d, k));
    for (let i = 0; i < 10; i++) spark.spawn({ x: s.pos.x, y: s.pos.y + 1, z: s.pos.z, vx: gauss() * 18 - dxn * 18, vy: 22 + rnd() * 28, vz: gauss() * 18 - dzn * 18, g: GRAV, life: 0.75 + rnd() * 0.4, s0: 1.6, s1: 0.4, a: 1, c: 0xfff0a8 });
    deal(g.dmg[0] * 0.25 * ship.armorK, "도탄"); G.log(`${tag} — 도탄`, cls); return;
  }
  let dmg = (g.dmg[0] + rnd() * (g.dmg[1] - g.dmg[0])) * ship.armorK;
  if (penK > 6 && rnd() < 0.45) { deal(dmg * 0.3, "과관통"); G.log(`${tag} — 과관통`, cls); return; }
  const c = critical(ship, lx, who(ship)); deal(dmg + c.dmg, "관통");
  at(d, () => sfx.citadel?.(d, k));
  flash.spawn({ x: s.pos.x, y: s.pos.y + 1.5, z: s.pos.z, life: 0.28, s0: 14 * k + 4, s1: 32 * k + 6, a: 0.9, c: 0xff5a18 });
  if (mine) for (const [k, r] of [["화재", "화재 발생"], ["침수", "침수 유발"], ["포탑", "포탑 파괴"], ["기관", "기관 손상"], ["유폭", "탄약고 유폭"]]) if (c.note.includes(k)) G.ribbon?.(r);
  G.log(`${tag}! ${c.note}`, cls);
}
/** Aerial bomb. */
export function bombHit(ship, p, lx, ours = true) {
  hitFX(p, 0.85); const d = p.distanceTo(camera.position); at(d, () => sfx.explode(d));
  if (ours) { G.stats.bombs++; ship.myHitT = G.battleT; } const c = critical(ship, lx, who(ship)), n = ((7 + rnd() * 5) * ship.armorK + c.dmg) * (ours ? 1 : 0.5); if (ship.side === "foe") { G.stats.dealt = (G.stats.dealt || 0) + (Math.min(n, ship.hp) / ship.maxHp) * 100; G.ribbon?.("폭탄 명중"); } ship.damage(n);
  if (rnd() < (ours ? 0.5 : 0.25)) ship.fires.push(30);
  G.log(ours ? `폭탄 명중! ${c.note.replace("관통 — ", "")}` : `${ship.isPlayer ? "본함" : ship.name} 폭탄 피격!`, ours ? "hit" : "bad");
}
export function bulletHit(ship, p) {
  if (rnd() < 0.35) spark.spawn({ x: p.x, y: p.y, z: p.z, vx: gauss() * 6, vy: 4 + rnd() * 6, vz: gauss() * 6, g: GRAV, life: 0.5, s0: 1.4, s1: 0.4, a: 1, c: 0xffd080 });
  const n = 0.045 * clamp(40 / ship.spec.belt, 0.04, 1) * ship.armorK; G.stats.dealt = (G.stats.dealt || 0) + (Math.min(n, ship.hp) / ship.maxHp) * 100; ship.damage(n); G.stats.bullets++; if (G.stats.bullets % 25 === 0) G.ribbon?.("기총 명중");
}
export function updateShells(dt) {
  const sh = G.shells;
  for (let i = sh.length - 1; i >= 0; i--) {
    const s = sh[i]; let left = dt * G.SHELL, done = false; // same arc, quicker flight: keeps gunnery fair now that ships move at game pace
    while (left > 1e-6 && !done) {
      let near = false;
      if (s.pos.y < 120) for (const S of G.ships) if (S !== s.owner && Math.hypot(S.pos.x - s.pos.x, S.pos.z - s.pos.z) < 300 + S.spec.L * 0.6) near = true;
      const h = Math.min(left, near ? 0.004 : 0.03); left -= h; s.t += h;
      const v = s.vel.length(), k = s.gun.k; s.vel.x -= k * v * s.vel.x * h; s.vel.z -= k * v * s.vel.z * h; s.vel.y -= (GRAV + k * v * s.vel.y) * h;
      s.pos.addScaledVector(s.vel, h);
      if (near) { const hit = hullHit(s.pos, s.owner); if (hit) { resolveHit(hit.ship, s, hit.lx); done = true; } }
      if (!done && s.pos.y <= 0) { const sc = s.gun.cal / 406; if (!G.onShellLand?.(s.pos, s.gun, s.owner)) { spawnSplash(s.pos.x, s.pos.z, sc); if (rnd() < 0.55) { const d = s.pos.distanceTo(camera.position); at(d, () => sfx.splash(d, sc)); } } landed(s, false); done = true; }
    }
    if (done || s.t > 160) { s.dispose(); sh.splice(i, 1); continue; }
    s.draw();
  }
  for (let i = G.casings.length - 1; i >= 0; i--) {
    const c = G.casings[i]; c.t += dt; c.v.y -= GRAV * dt; c.p.addScaledVector(c.v, dt);
    c.m.position.copy(c.p); c.m.rotation.x += c.rx * dt; c.m.rotation.z += c.rz * dt;
    if (c.p.y <= 0 && !c.sp) { c.sp = true; spray.spawn({ x: c.p.x, y: 0.3, z: c.p.z, vy: 2.8, life: 0.45, s0: 0.6, s1: 1.8, a: 0.6, c: 0xeaf4f8 }); }
    if (c.p.y < -0.6 || c.t > 3) { scene.remove(c.m); G.casings.splice(i, 1); }
  }
}
export function clearShells() { for (const s of G.shells) s.dispose(); G.shells.length = 0; for (const c of G.casings) scene.remove(c.m); G.casings.length = 0; salvos.clear(); }

// ── computer captains ───────────────────────────────────────────────────────
export function leadPoint(from, tgt) {
  const v = tgt.vel; let p = tgt.pos.clone();
  for (let i = 0; i < 4; i++) { const t = solve(from.tb, Math.hypot(p.x - from.pos.x, p.z - from.pos.z)).time; p = tgt.pos.clone().addScaledVector(v, t); }
  return p;
}
export const mkBrain = (delay) => ({ sigR: 700, sigB: 0.012, errR: gauss() * 700, errB: gauss() * 0.012, zig: 0, zigT: 40, wait: delay, hdgRef: 0 });
/** Steering + gunnery for a computer-run ship; the solution converges salvo by salvo and degrades when the target manoeuvres. */
export function brain(ship, tgt, st, dt, steer = true) {
  if (!ship.alive) { ship.rudderCmd = 0; return; }
  const dx = tgt.pos.x - ship.pos.x, dz = tgt.pos.z - ship.pos.z, range = Math.hypot(dx, dz), bp = Math.atan2(dz, dx);
  if (steer) {
    const prefK = !G.modern && G.battleT > 300 ? 0.7 : 1; // WWII: after 5 minutes both sides close for a decision
    const pref0 = ship.prefRange || ship.spec.range || [Math.min(ship.tb.max * 0.45, 14000) * 0.75, Math.min(ship.tb.max * 0.45, 14000)], pref = [pref0[0] * prefK, pref0[1] * prefK];
    st.zigT -= dt; if (st.zigT <= 0) { st.zigT = 45 + rnd() * 40; st.zig = (rnd() - 0.5) * 34 * DEG; }
    const off = (range > pref[1] * 1.05 ? (range > pref[1] * 1.4 ? 18 : 40) : range < pref[0] * 0.75 ? 122 : 88) * DEG; // far away: close in nearly head-on
    const a = wrap(bp + off + st.zig), b2 = wrap(bp - off + st.zig);
    const want = Math.abs(wrap(a - ship.heading)) < Math.abs(wrap(b2 - ship.heading)) ? a : b2;
    ship.rudderCmd = clamp(wrap(want - ship.heading) * 2.2, -1, 1); ship.tele = 5;
  }
  if (Math.abs(wrap(tgt.heading - st.hdgRef)) > 14 * DEG) { st.hdgRef = tgt.heading; st.sigR = Math.min(st.sigR * 1.7, 700); st.sigB = Math.min(st.sigB * 1.7, 0.012); }
  const lp = leadPoint(ship, tgt);
  ship.aimB = Math.atan2(lp.z - ship.pos.z, lp.x - ship.pos.x) + st.errB;
  ship.aimR = clamp(Math.hypot(lp.x - ship.pos.x, lp.z - ship.pos.z) + st.errR, ship.tb.min, ship.tb.max);
  st.wait -= dt;
  if (st.wait <= 0 && !st.blind && tgt.alive && range < ship.tb.max * 0.98 && ship.turrets.some((t) => t.alive && t.reload <= 0 && t.onTarget)) {
    if (ship.fire()) {
      if (ship.side === "foe" && tgt.isPlayer && !G.plane) A.later.push({ t: Math.max(0.2, solve(ship.tb, ship.aimR).time - 2.4), fn: sfx.incoming });
      st.wait = Math.min(6, ship.reloadT * 0.5); st.sigR = Math.max(st.sigR * 0.78, ship.side === "foe" ? 185 : 95); st.sigB = Math.max(st.sigB * 0.78, ship.side === "foe" ? 0.0045 : 0.0028); st.errR = gauss() * st.sigR; st.errB = gauss() * st.sigB; // enemy gunnery settles less tightly
    }
  }  if (ship.spec.torp && !st.blind && (!ship.isPlayer || G.auto)) aiTorp(ship, tgt, st, dt);
}
/** Computer torpedo attack: aim at the intercept point (target holds course and speed), small aiming error. */
function aiTorp(ship, tgt, st, dt) {
  const T = ship.spec.torp; st.tw = (st.tw ?? 8 + rnd() * 15) - dt; if (st.tw > 0 || !tgt.alive) return;
  const ip = intercept(ship.pos, T.v * KN, tgt); st.tw = 2; if (!ip) return;
  const r = Math.hypot(ip.x - ship.pos.x, ip.z - ship.pos.z); if (r > T.range * 0.85 || r < 500) return;
  if (fireTorps(ship, Math.atan2(ip.z - ship.pos.z, ip.x - ship.pos.x) + gauss() * 1.5 * DEG)) st.tw = 30 + rnd() * 25;
}
/** Keep station on the lead ship: `back` metres astern, `side` metres to port (negative = starboard). */
export function escort(ship, lead, dt, back = 1700, side = 900) {
  if (!ship.alive) { ship.rudderCmd = 0; return; }
  const f = lead.fwd, sx = lead.pos.x - f.x * back + f.z * side, sz = lead.pos.z - f.z * back - f.x * side;
  const dx = sx - ship.pos.x, dz = sz - ship.pos.z, dist = Math.hypot(dx, dz);
  const want = dist > 350 ? Math.atan2(dz, dx) : lead.heading;
  ship.rudderCmd = clamp(wrap(want - ship.heading) * 2.4, -1, 1);
  ship.tele = dist > 600 ? 5 : clamp(lead.tele, 2, 5);
}

// ── torpedoes: run at ~1.5 m depth, armed after 150 m, bubble wake + plotted track ──
const TORP_GEO = new THREE.CylinderGeometry(0.27, 0.27, 7, 8); TORP_GEO.rotateZ(PI / 2);
const TORP_MAT = new THREE.MeshStandardMaterial({ color: 0x2b2f31, metalness: 0.6, roughness: 0.4 });
const TL_MAX = 900, torpGeo = new THREE.BufferGeometry();
torpGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TL_MAX * 6), 3)); torpGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(TL_MAX * 6), 3)); torpGeo.setDrawRange(0, 0);
{ const l = new THREE.LineSegments(torpGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthTest: false })); l.frustumCulled = false; l.renderOrder = 5; scene.add(l); }
export const TORP_ARC = [8 * DEG, 172 * DEG];
export const TORP_SPREAD = 2.2 * DEG;
/** Gyro torpedo geometry: the tube trains 50°–130° off the bow on the target's side, the fish runs straight for
 *  TORP_STRAIGHT metres, then turns (radius TORP_TURN_R) through the gyro angle onto its set course. */
export const TORP_STRAIGHT = 45, TORP_TURN_R = 120;
export function tubeBearing(heading, b) {
  const rel = wrap(b - heading), side = rel < 0 ? -1 : 1;
  return wrap(heading + side * clamp(Math.abs(rel), 50 * DEG, 130 * DEG));
}
/** Points along the run of one torpedo from (x,z) launched on `tube` with final course `course`. */
export function torpPath(x, z, tube, course, range, step = 30) {
  const pts = [[x, z]]; let a = tube, run = 0;
  const go = (d) => { x += Math.cos(a) * d; z += Math.sin(a) * d; run += d; };
  go(TORP_STRAIGHT); pts.push([x, z]);
  for (let k = 0; k < 40 && Math.abs(wrap(course - a)) > 1e-4; k++) {
    const d = wrap(course - a), da = Math.sign(d) * Math.min(Math.abs(d), step / TORP_TURN_R);
    a = wrap(a + da); go(Math.abs(da) * TORP_TURN_R); pts.push([x, z]);
  }
  go(Math.max(0, range - run)); pts.push([x, z]);
  return pts;
}
/** Relative bearing check (tubes train to either beam) and the first loaded launcher. */
export function torpMount(ship, b) {
  const rel = Math.abs(wrap(b - ship.heading));
  if (rel < TORP_ARC[0] || rel > TORP_ARC[1]) return { arc: false, m: null };
  return { arc: true, m: ship.torps.find((m) => m.reload <= 0) || null };
}
export function fireTorps(ship, b) {
  const T = ship.spec.torp; if (!T || !ship.alive || ship.sinking) return false;
  const { m } = torpMount(ship, b); if (!m) return false;
  m.reload = T.reload; const f = ship.fwd, tube = tubeBearing(ship.heading, b);
  for (let i = 0; i < T.n; i++) {
    const a = wrap(b + (i - (T.n - 1) / 2) * TORP_SPREAD), p = new THREE.Vector3(ship.pos.x + f.x * m.x, -1.5, ship.pos.z + f.z * m.x);
    const mesh = new THREE.Mesh(TORP_GEO, TORP_MAT); mesh.position.copy(p); scene.add(mesh);
    G.torps.push({ owner: ship, pos: p, start: p.clone(), pts: [p.clone()], ang: tube, course: a, dir: new THREE.Vector3(Math.cos(tube), 0, Math.sin(tube)), v: T.v * KN * G.SPD, range: T.range, run: 0, mesh, bubT: 0, dmg: T.dmg, warned: false });
    spray.spawn({ x: p.x + Math.cos(tube) * 8, y: 1, z: p.z + Math.sin(tube) * 8, vy: 4, g: GRAV, life: 1.4, s0: 3, s1: 8, a: 0.8, fade: 0.6, c: 0xffffff });
    smoke.spawn({ x: p.x + Math.cos(tube) * 5, y: 1.8, z: p.z + Math.sin(tube) * 5, vx: Math.cos(tube) * 14, vy: 2.5, vz: Math.sin(tube) * 14, drag: 1.2, life: 1.3, s0: 2.5, s1: 9, a: 0.45, c: 0xdfe8ec });
  }
  const d = ship.pos.distanceTo(camera.position); at(d, () => sfx.splash(d, 0.25));
  if (ship.isPlayer) G.stats.torps = (G.stats.torps || 0) + T.n;
  return true;
}
/** Where a torpedo of speed v fired from `from` meets `tgt` if it holds course and speed (null if it can't). */
export function intercept(from, v, tgt) {
  v *= G.SPD; // torpedoes run at the same game pace as the ships
  const dx = tgt.pos.x - from.x, dz = tgt.pos.z - from.z, V = tgt.vel, a = V.x * V.x + V.z * V.z - v * v, b = 2 * (dx * V.x + dz * V.z), c = dx * dx + dz * dz;
  let t;
  if (Math.abs(a) < 1e-9) t = b < 0 ? -c / b : -1;
  else { const disc = b * b - 4 * a * c; if (disc < 0) return null; const s = Math.sqrt(disc), t1 = (-b - s) / (2 * a), t2 = (-b + s) / (2 * a), lo = Math.min(t1, t2), hi = Math.max(t1, t2); t = lo > 0 ? lo : hi; }
  if (!(t > 0)) return null;
  return { x: tgt.pos.x + V.x * t, z: tgt.pos.z + V.z * t, t };
}
function torpHit(ship, t, lx) {
  const p = t.pos.clone().setY(0.5); spawnSplash(p.x, p.z, 1.7); hitFX(p, 0.9);
  rings.spawn({ x: p.x, z: p.z, w0: 10, l0: 10, w1: 125, l1: 125, life: 2.2, a: 0.72, c: 0xdff4ff, ease: 3 });
  for (let i = 0; i < 46; i++) spray.spawn({ x: p.x + gauss() * 3.5, y: 1, z: p.z + gauss() * 3.5, vx: gauss() * 3, vy: 24 + rnd() * 34, vz: gauss() * 3, g: GRAV, life: 3.6, s0: 4, s1: 13, a: 0.95, fade: 0.5, c: 0xffffff });
  const d = p.distanceTo(camera.position); at(d, () => sfx.explode(d));
  const n = t.dmg * (0.85 + rnd() * 0.3) * ship.armorK * (ship.spec.belt > 250 ? 0.75 : 1);
  ship.flooding += 2; ship.listSide = ship.listSide || (lx >= 0 ? 1 : -1);
  const mine = t.owner.isPlayer && ship.side === "foe";
  if (mine) { ship.myHitT = G.battleT; G.stats.dealt = (G.stats.dealt || 0) + (Math.min(n, ship.hp) / ship.maxHp) * 100; G.stats.torpHits = (G.stats.torpHits || 0) + 1; G.ribbon?.("어뢰 명중"); }
  if (ship.isPlayer) { G.shake = 1.5; G.radio?.("flood"); }
  G.log(ship.isPlayer ? "어뢰 피격! 대규모 침수" : ship.side === "us" ? `${ship.name} 어뢰 피격!` : `어뢰 명중! ${ship.name} 침수`, ship.side === "us" ? "bad" : "hit");
  ship.damage(n);
}
export function updateTorps(dt) {
  const tp = torpGeo.attributes.position.array, tc = torpGeo.attributes.color.array; let n = 0;
  for (let i = G.torps.length - 1; i >= 0; i--) {
    const t = G.torps[i], h = (t.v * dt) / 3; let done = false;
    for (let k = 0; k < 3 && !done; k++) {
      if (t.run > TORP_STRAIGHT && t.ang !== t.course) {
        const d = wrap(t.course - t.ang), da = Math.sign(d) * Math.min(Math.abs(d), h / TORP_TURN_R);
        t.ang = Math.abs(d) <= h / TORP_TURN_R ? t.course : wrap(t.ang + da); t.dir.set(Math.cos(t.ang), 0, Math.sin(t.ang));
        const last = t.pts[t.pts.length - 1]; if (Math.hypot(last.x - t.pos.x, last.z - t.pos.z) > 20 || t.ang === t.course) t.pts.push(t.pos.clone());
      } else if (t.pts.length === 1 && t.run > TORP_STRAIGHT) t.pts.push(t.pos.clone());
      t.pos.addScaledVector(t.dir, h); t.run += h;
      const hit = hullHit(t.pos, t.owner); if (hit) { if (t.run > 150) torpHit(hit.ship, t, hit.lx); done = true; }
    }
    if (t.run > t.range) done = true;
    if (done) { scene.remove(t.mesh); G.torps.splice(i, 1); continue; }
    t.mesh.position.copy(t.pos); t.mesh.rotation.y = -Math.atan2(t.dir.z, t.dir.x);
    t.bubT -= dt; if (t.bubT <= 0) { t.bubT = 0.14; spray.spawn({ x: t.pos.x - t.dir.x * 5, y: 0.3, z: t.pos.z - t.dir.z * 5, vy: 0.6, life: 3.5, s0: 1.8, s1: 4.5, a: 0.6, fade: 0.8, c: 0xffffff }); }
    { const c = t.owner.side === "us" ? [0.7, 0.95, 1] : [1, 0.32, 0.25], P = t.pts;
      for (let j = 0; j < P.length && n < TL_MAX; j++) { const q = P[j + 1] || t.pos; tp.set([P[j].x, 0.7, P[j].z, q.x, 0.7, q.z], n * 6); tc.set([...c, ...c], n * 6); n++; } }
  }
  torpGeo.setDrawRange(0, n * 2); torpGeo.attributes.position.needsUpdate = true; torpGeo.attributes.color.needsUpdate = true;
}
export function clearTorps() { for (const t of G.torps) scene.remove(t.mesh); G.torps.length = 0; torpGeo.setDrawRange(0, 0); }
