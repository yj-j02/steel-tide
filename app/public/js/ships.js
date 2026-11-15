/**
 * Steel Tide — ships: guns and ballistics, the ship catalogue (real US Navy
 * ships for the player, fictional enemies), procedural models, the Ship
 * simulation, shells, damage and the computer captains.
 */
import { landAt } from "./core.js";
import { THREE, PI, TAU, DEG, KN, GRAV, clamp, wrap, fmt, rnd, gauss, G, scene, camera, mat, box, cyl, shadowed, lines, planeMesh, setPlaneModel, WEAR, paint, SCHEMES, hullTexture, upperTexture, deckTexture, textTex,
  smoke, flash, spray, spark, rings, spawnSplash, spawnWake } from "./core.js";
import { A, sfx, at } from "./audio.js";
import { GLTFLoader } from "/vendor/addons/loaders/GLTFLoader.js";

// ── guns + exterior ballistics (quadratic drag, k = ρ·Cd·A / 2m) ────────────
export const GUNS = {
  "16/45":  { name: '16인치/45구경 Mk 1',            cal: 406, V0: 768, k: 2.3e-5,  maxEl: 30, dmg: [4.5, 8.0], reload: 32,  train: 4,  elev: 6,  disp: 0.011, len: 18 },
  "16/45b": { name: '16인치/45구경 Mk 6 (초중량탄)', cal: 406, V0: 701, k: 1.85e-5, maxEl: 45, dmg: [5.2, 8.8], reload: 30,  train: 5,  elev: 8,  disp: 0.010, len: 18 },
  "16/50":  { name: '16인치/50구경 Mk 7',            cal: 406, V0: 762, k: 1.85e-5, maxEl: 45, dmg: [5.5, 9.0], reload: 30,  train: 5,  elev: 10, disp: 0.009, len: 20 },
  "8/55":   { name: '8인치/55구경 Mk 12',            cal: 203, V0: 762, k: 3.8e-5,  maxEl: 41, dmg: [1.8, 3.2], reload: 15,  train: 8,  elev: 10, disp: 0.010, len: 11 },
  "6/47":   { name: '6인치/47구경 Mk 16',            cal: 152, V0: 762, k: 5.6e-5,  maxEl: 47, dmg: [1.0, 1.8], reload: 7.5, train: 10, elev: 12, disp: 0.012, len: 7.2 },
  "5/62":   { name: '5인치/62구경 Mk 45 Mod 4',      cal: 127, V0: 808, k: 6.0e-5,  maxEl: 65, dmg: [1.7, 2.8], reload: 3, train: 30, elev: 20, disp: 0.011, len: 6.3 },
  "130":    { name: '130mm H/PJ-38',                cal: 130, V0: 850, k: 6.0e-5,  maxEl: 65, dmg: [1.7, 2.9], reload: 3.2, train: 30, elev: 20, disp: 0.012, len: 6.5 },
  "5/38":   { name: '5인치/38구경 Mk 12',            cal: 127, V0: 792, k: 9.0e-5,  maxEl: 45, dmg: [0.55, 1.0], reload: 4, train: 25, elev: 15, disp: 0.014, len: 4.8 },
  "15e":    { name: '15인치 (가상)', cal: 381, V0: 790, k: 2.4e-5, maxEl: 30, dmg: [4.2, 7.4], reload: 31, train: 4, elev: 6, disp: 0.011, len: 17 },
  "15e2":   { name: '15인치 (가상)', cal: 381, V0: 800, k: 2.4e-5, maxEl: 40, dmg: [4.4, 7.6], reload: 30, train: 5, elev: 8, disp: 0.010, len: 17 },
  "16e":    { name: '16인치 (가상)', cal: 406, V0: 780, k: 2.1e-5, maxEl: 42, dmg: [5.2, 8.6], reload: 30, train: 5, elev: 9, disp: 0.010, len: 19 },
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
const FOE = { hull: 0x56606a, deck: 0x6f736c, upper: 0x66707a }; // lighter: the old one read as black at range
const T1 = (x, up, rest) => ({ x, up, rest, n: 1 }), T2 = (x, up, rest) => ({ x, up, rest, n: 2 }), T3 = (x, up, rest) => ({ x, up, rest, n: 3 });
export const SHIPS = {
  fletcher: { id: "fletcher", name: "USS 플레처 (DD-445)", short: "플레처", cls: "구축함", tier: 1, L: 114.8, B: 12, D: 4.2, fb: 5.4, sheer: 2.6, vmax: 36.5, turn: 7, hp: 55, belt: 19,
    gun: "5/38", style: "dd", ...US, paint: "ms32a", hullNo: "445", deckHex: "#4a5663", planks: false, turrets: [T1(40, 0, 0), T1(31, 2.3, 0), T1(-17, 2.6, PI), T1(-31, 1.4, PI), T1(-41, 0, PI)],
    torp: { name: "Mk 15 어뢰 5연장 ×2", n: 5, mounts: [3, -8], v: 45, range: 5500, reload: 70, dmg: 20 },
    desc: "미 해군 2차대전 주력 구축함. 36노트의 속력과 분당 15발을 쏘는 5인치 속사포 5문." },
  cleveland: { id: "cleveland", name: "USS 클리블랜드 (CL-55)", short: "클리블랜드", cls: "경순양함", tier: 2, L: 186, B: 20.2, D: 7.5, fb: 7, sheer: 3, vmax: 32.5, turn: 4.5, hp: 75, belt: 127,
    gun: "6/47", style: "cruiser", ...US, paint: "ms33", hullNo: "55", deckHex: "#56616b", planks: false, turrets: [T3(62, 0, 0), T3(49, 3.2, 0), T3(-50, 3.2, PI), T3(-63, 0, PI)],
    desc: "6인치 3연장 포탑 4기, 12문의 빠른 연사로 적을 압도하는 경순양함." },
  colorado: { id: "colorado", name: "USS 콜로라도 (BB-45)", short: "콜로라도", cls: "전함", tier: 3, L: 190, B: 29.7, D: 9.3, fb: 6.2, sheer: 0.6, vmax: 21, turn: 2.7, hp: 100, belt: 343,
    gun: "16/45", style: "cage", ...US, paint: "ms21", hullNo: "45", deckHex: "#465566", planks: true, turrets: [T2(58, 0, 0), T2(45, 2.0, 0), T2(-45, 1.8, PI), T2(-60, 0, PI)],
    desc: "1920년대 '빅 파이브' 전함. 미 해군 최초로 16인치 주포를 단 함선." },
  baltimore: { id: "baltimore", name: "USS 볼티모어 (CA-68)", short: "볼티모어", cls: "중순양함", tier: 3, L: 205, B: 21.6, D: 7.3, fb: 7.4, sheer: 3.2, vmax: 33, turn: 4, hp: 85, belt: 152,
    gun: "8/55", style: "cruiser", ...US, paint: "ms32b", hullNo: "68", deckHex: "#4a5663", planks: false, big: true, turrets: [T3(66, 0, 0), T3(52, 3.4, 0), T3(-66, 0, PI)],
    desc: "8인치/55구경 9문의 중순양함. 전함보다 빠르고 경순양함보다 단단하다." },
  northcarolina: { id: "northcarolina", name: "USS 노스캐롤라이나 (BB-55)", short: "노스캐롤라이나", cls: "전함", tier: 4, L: 222, B: 33, D: 10, fb: 8.2, sheer: 3.4, vmax: 28, turn: 2.9, hp: 105, belt: 305,
    gun: "16/45b", style: "tower", ...US, paint: "ms32c", hullNo: "55", deckHex: "#4a5663", planks: true, turrets: [T3(72, 0, 0), T3(55, 4, 0), T3(-70, 0, PI)],
    desc: "조약 이후 첫 신형 전함. 초중량탄을 쏘는 16인치 3연장 포탑 3기." },
  iowa: { id: "iowa", name: "USS 아이오와 (BB-61)", short: "아이오와", cls: "전함", tier: 5, L: 270, B: 33, D: 11, fb: 8.8, sheer: 4.2, vmax: 33, turn: 2.8, hp: 115, belt: 307,
    gun: "16/50", style: "tower", ...US, paint: "ms22", hullNo: "61", deckHex: "#a3875c", planks: true, turrets: [T3(88, 0, 0), T3(70, 4.2, 0), T3(-88, 0, PI)],
    desc: "미 해군 최후의 전함. 33노트 고속과 16인치/50구경 9문." },
};
export const CARRIER = { id: "lexington", name: "USS 렉싱턴 (CV-2)", short: "렉싱턴", cls: "항공모함", tier: 0, L: 270.7, B: 32.3, D: 9.3, fb: 9, sheer: 1.5, vmax: 33.25, turn: 2.4, hp: 100, belt: 178,
  gun: "5/38", style: "carrier", ...US, paint: "ms1", hullNo: "", deckHex: "#7a6a52", planks: true, turrets: [] };
export const ENEMIES = {
  1: { id: "viper", name: "가상 구축함 '바이퍼'", short: "바이퍼", cls: "구축함", tier: 1, L: 118, B: 11.5, D: 4, fb: 5.3, sheer: 2.8, vmax: 37, turn: 7, hp: 55, belt: 20, gun: "5/38", style: "foeDD", ...FOE, paint: "f2", deckHex: "#5b5f5c", planks: false,
    turrets: [T1(41, 0, 0), T1(31, 2.2, 0), T1(-31, 2.2, PI), T1(-42, 0, PI)], range: [5500, 7000], aa: 0.6,
    torp: { name: "어뢰 4연장 ×2 (가상)", n: 4, mounts: [-9, -21], v: 48, range: 7000, reload: 80, dmg: 18 } },
  2: { id: "siren", name: "가상 경순양함 '세이렌'", short: "세이렌", cls: "경순양함", tier: 2, L: 182, B: 19, D: 7, fb: 6.8, sheer: 3, vmax: 33, turn: 4.5, hp: 75, belt: 120, gun: "6/47", style: "foeCL", ...FOE, paint: "f3", deckHex: "#6b5a46", planks: true,
    turrets: [T3(60, 0, 0), T3(46, 3, 0), T3(-60, 0, PI)], range: [8000, 10000], aa: 1,
    torp: { name: "어뢰 3연장 (가상)", n: 3, mounts: [-30], v: 50, range: 6500, reload: 90, dmg: 18 } },
  3: { id: "kraken", name: "가상 전함 '크라켄'", short: "크라켄", cls: "전함", tier: 3, L: 205, B: 30, D: 9.5, fb: 7.5, sheer: 3.5, vmax: 23, turn: 2.5, hp: 100, belt: 320, gun: "15e", style: "raider", ...FOE, paint: "f1", deckHex: "#64665f", planks: true,
    turrets: [T2(56, 0, 0), T2(40, 3.4, 0), T2(-52, 0, PI)], range: [9200, 10400], aa: 1.4 },
  4: { id: "leviathan", name: "가상 전함 '레비아탄'", short: "레비아탄", cls: "전함", tier: 4, L: 238, B: 32, D: 10, fb: 8, sheer: 3.6, vmax: 29, turn: 2.7, hp: 108, belt: 330, gun: "15e2", style: "pagoda", ...FOE, paint: "f4", deckHex: "#7a5d45", planks: true,
    turrets: [T2(76, 0, 0), T2(60, 4, 0), T2(-62, 4, PI), T2(-78, 0, PI)], range: [11000, 13500], aa: 1.7 },
  5: { id: "titan", name: "가상 전함 '타이탄'", short: "타이탄", cls: "전함", tier: 5, L: 262, B: 36, D: 11, fb: 8.6, sheer: 4, vmax: 30, turn: 2.6, hp: 118, belt: 350, gun: "16e", style: "titan", ...FOE, paint: "f5", deckHex: "#8a7254", planks: true,
    turrets: [T3(86, 0, 0), T3(69, 4.2, 0), T3(-86, 0, PI)], range: [12000, 15000], aa: 2 },
};

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
export const FOE_CARRIER = { ...CARRIER, id: "harpy", name: "가상 항모 '하피'", short: "하피", ...FOE, paint: "f1", deckHex: "#6a5a44", hp: 90, foe: true, aa: 1.2, range: [14000, 18000] };
for (const [k, v] of Object.entries({ fletcher: 0.8, cleveland: 1.4, colorado: 1.1, baltimore: 1.5, northcarolina: 1.9, iowa: 2.3 })) SHIPS[k].aa = v;
CARRIER.aa = 1.3;
for (const sp of [...Object.values(SHIPS), ...Object.values(ENEMIES)]) if (sp.torp) sp.torp.v *= 2; // game speed: torpedoes run twice their historical speed
for (const sp of [...Object.values(SHIPS), CARRIER, TRANSPORT, FOE_CARRIER, ...Object.values(ENEMIES)]) sp.upper = hexN(SCHEMES[sp.paint].upper);
export const paintName = (sp) => SCHEMES[sp.paint].name;

// ── high-detail models (Higgsfield 3D) ──────────────────────────────────────
/** Per-ship GLB: scale into metres (bow +X, waterline at y=0), the boxes cut out where the
 *  model's fixed turrets were (the game's own trainable turrets go there), funnels and bridge. */
export const MODEL_CFG = {
  colorado: { url: "/models/colorado.glb", sx: 193, sy: 170, sz: 172, wl: -0.135,
    cut: [[51, 85, 8.5, 6.6, 13.5], [39.5, 62, 8.5, 8.3, 15], [-62, -39, 8.5, 8.0, 15], [-85, -52, 8.5, 6.6, 13]],
    funnels: [[-5, 32, 0], [5, 32, 0]], bridge: [36.5, 15.5, 0] },
};
const MODELS = {}; export const modelState = { loading: 0, ready: 0 };
export function loadModels() {
  const loader = new GLTFLoader();
  // F4F (Higgsfield 3D): cut away the lowered landing gear and the fixed prop blades; a spinning prop is added in core.hqPlane
  loader.load("/models/f4f.glb", (gltf) => {
    const grp = new THREE.Group(); gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      const p = g.attributes.position, idx = g.index ? g.index.array : Array.from({ length: p.count }, (_, i) => i), keep = [];
      for (let i = 0; i < idx.length; i += 3) {
        const a = idx[i], b = idx[i + 1], d = idx[i + 2];
        const x = (p.getX(a) + p.getX(b) + p.getX(d)) / 3, y = (p.getY(a) + p.getY(b) + p.getY(d)) / 3, z = (p.getZ(a) + p.getZ(b) + p.getZ(d)) / 3;
        const gear = y < -0.062 && Math.abs(x) > 0.075 && z > 0.13 && z < 0.34, blade = z > 0.312 && z < 0.34 && Math.hypot(x, y - 0.02) > 0.075;
        if (!gear && !blade) keep.push(a, b, d);
      }
      g.setIndex(keep); g.scale(11.9, 11.9, 11.9); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, o.material); m.castShadow = true; grp.add(m);
    });
    modelState.plane = true; setPlaneModel(grp);
  }, undefined, () => {});
  for (const [id, c] of Object.entries(MODEL_CFG)) {
    modelState.loading++;
    loader.load(c.url, (gltf) => {
      let mesh = null; gltf.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
      if (!mesh) return;
      const g = mesh.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().makeScale(c.sx, c.sy, c.sz)); g.translate(0, -c.wl * c.sy, 0);
      const p = g.attributes.position, idx = g.index.array, keep = [];
      const inCut = (x, y, z) => c.cut.some(([x0, x1, hz, y0, y1]) => x > x0 && x < x1 && Math.abs(z) < hz && y > y0 && y < y1);
      for (let i = 0; i < idx.length; i += 3) {
        const a = idx[i], b = idx[i + 1], d = idx[i + 2];
        const cx = (p.getX(a) + p.getX(b) + p.getX(d)) / 3, cy = (p.getY(a) + p.getY(b) + p.getY(d)) / 3, cz = (p.getZ(a) + p.getZ(b) + p.getZ(d)) / 3;
        if (!inCut(cx, cy, cz)) keep.push(a, b, d);
      }
      g.setIndex(keep); g.computeBoundingSphere();
      const m = mesh.material; m.envMapIntensity = 0.7; m.side = THREE.FrontSide;
      const out = new THREE.Mesh(g, m); out.castShadow = out.receiveShadow = true;
      MODELS[id] = out; modelState.ready++;
      for (const s of G.ships) if (s.spec.id === id) applyModel(s);
    }, undefined, () => { modelState.loading--; });
  }
}
function applyModel(ship) {
  const m = MODELS[ship.spec.id]; if (!m || ship.model) return;
  for (const o of ship.body) o.visible = false;
  ship.model = m.clone(); ship.tilt.add(ship.model);
  const c = MODEL_CFG[ship.spec.id]; ship.funnels = c.funnels; ship.bridge = c.bridge;
}

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
function cageMast(p, x, y, h, rb, rt) {
  const pts = [], n = 16;
  for (let i = 0; i < n; i++) for (const s of [1, -1]) { const a0 = (i / n) * TAU, a1 = a0 + s * 1.85; pts.push(rb * Math.cos(a0), 0, rb * Math.sin(a0), rt * Math.cos(a1), h, rt * Math.sin(a1)); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const l = new THREE.LineSegments(g, latticeMat); l.position.set(x, y, 0); p.add(l);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(rt * 0.8, rb * 0.72, h, 12, 1, true), coreMat); core.position.set(x, y + h / 2, 0); p.add(core);
}
function sec5(g, c, x, y, z, rot) {
  const m = new THREE.Group(); m.position.set(x, y, z); m.rotation.y = rot; g.add(m); box(m, 4.4, 2.1, 3.6, c, 0, 0, 0);
  for (const s of [-0.7, 0.7]) { const b = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 4.6, 6), mat(0x41474b))); b.rotation.z = -PI / 2 + 0.12; b.position.set(4.3, 1.2, s); m.add(b); }
}
function tub40(g, c, x, y, z) {
  cyl(g, 1.4, 1.5, 1.1, c, x, y, z, 10);
  for (const s of [-0.45, -0.15, 0.15, 0.45]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.4, 5), mat(0x3a3f43)); b.rotation.z = -PI / 2 + 0.6; b.position.set(x + 0.9, y + 1.9, z + s); g.add(b); }
}
function aaStation(g, c, x, y, z) { box(g, 1.6, 1.3, 1.6, c, x, y, z); }
function colorado(g, spec) {
  const U = spec.upper, y = spec.fb;
  box(g, 58, 3.2, 17, U, -1, y, 0); box(g, 24, 3, 12.5, U, 12, y + 3.2, 0); cyl(g, 3.3, 3.3, 5.5, U, 25.5, y + 3.2, 0);
  box(g, 9, 4.5, 11, U, 17, y + 6.2, 0); box(g, 7, 0.9, 15, U, 17, y + 10.7, 0);
  cageMast(g, 13, y + 6.2, 36, 3.7, 1.8); cyl(g, 4.3, 3.6, 3.2, U, 13, y + 42.2, 0); cyl(g, 2.4, 2.4, 2.2, U, 13, y + 45.4, 0);
  for (const fx of [1, -11]) { cyl(g, 2.7, 3.1, 16, U, fx, y + 3.2, 0); cyl(g, 2.76, 2.76, 1.6, 0x1c1e20, fx, y + 19.2, 0); }
  box(g, 12, 3, 10, U, -24, y + 3.2, 0); cageMast(g, -23, y + 6.2, 34, 3.5, 1.7); cyl(g, 4.0, 3.3, 3, U, -23, y + 40.2, 0);
  for (const sx of [22, 14, 6, -5, -14]) for (const s of [1, -1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 5, 8), mat(0x4b5256)); b.rotation.x = (PI / 2) * s; b.position.set(sx, y + 1.9, s * 10.3); g.add(b); }
  for (const s of [1, -1]) box(g, 9, 1.4, 2.6, 0xd6d3c6, -5, y + 3.2, s * 5.6);
  box(g, 22, 0.9, 1.8, 0x596064, -80, y + 1.4, 0).rotation.y = 0.22; box(g, 0.8, 9, 0.8, 0x596064, -91, y, 3.5);
  for (const [ax, az] of [[30, 6], [30, -6], [6, 7.6], [6, -7.6], [-17, 7], [-17, -7], [-30, 4], [-30, -4]]) {
    cyl(g, 0.9, 1.1, 1.2, U, ax, y + 3.2, az, 8); const b = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 3.6, 6), mat(0x3f4549))); b.rotation.z = ax > 0 ? -0.95 : 0.95; b.position.set(ax + (ax > 0 ? 1.2 : -1.2), y + 5.3, az); g.add(b); }
  for (const fx of [1, -11]) { cyl(g, 0.3, 0.3, 15, U, fx - 3.2, y + 3.2, 0, 6); cyl(g, 2.9, 2.9, 0.35, 0x6d757a, fx, y + 12, 0); box(g, 2, 0.3, 9, U, fx, y + 12.4, 0); for (const s of [1, -1]) cyl(g, 0.75, 0.75, 1, 0xdfe2e0, fx, y + 12.7, s * 3.9, 10); }
  box(g, 0.35, 0.35, 17, 0x474d51, 13, y + 33, 0); box(g, 0.35, 0.35, 14, 0x474d51, -23, y + 31, 0);
  for (const s of [1, -1]) { box(g, 0.5, 11, 0.5, 0x596064, -16, y + 3.2, s * 6.2).rotation.x = s * 0.45; box(g, 7, 1.2, 2.2, 0xd6d3c6, 7, y + 6.2, s * 4.6); }
  cyl(g, 0.12, 0.16, 5, 0x474d51, 93, deckY(spec, 93), 0, 5); cyl(g, 0.12, 0.16, 6.5, 0x474d51, -93, y, 0, 5);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.4), new THREE.MeshBasicMaterial({ color: 0xb8323a, side: THREE.DoubleSide })); flag.position.set(-95.3, y + 5.2, 0); g.add(flag);
  for (const s of [1, -1]) box(g, 1.7, 2.3, 0.45, 0x26292c, 85, 4.6, s * 4.0);
  const sp = new THREE.Group(); sp.position.set(-80, y + 2.4, 0); sp.rotation.y = 0.22; g.add(sp);
  box(sp, 7.5, 1.1, 1.1, 0xc8cbc2, 0, 0.5, 0); box(sp, 1.7, 0.16, 10.5, 0xc8cbc2, 1, 1.9, 0); box(sp, 1.1, 0.14, 3.6, 0xc8cbc2, -3.3, 1.2, 0); box(sp, 5.5, 0.6, 0.9, 0xb9bcb4, 0.3, -0.25, 0); box(sp, 0.9, 1.6, 0.12, 0xc8cbc2, -3.4, 1.2, 0);
  const top = y + 45.4, at2 = y + 43;
  lines(g, [13, top, 0, 93, deckY(spec, 93) + 5, 0, 13, top, 0, -23, at2, 0, -23, at2, 0, -93, y + 6.5, 0, 13, y + 33, 8.4, 13, top, 0, 13, y + 33, -8.4, 13, top, 0, -23, y + 31, 7, -23, at2, 0, -23, y + 31, -7, -23, at2, 0]);
  g.userData.bridge = [19.5, y + 9.4, 0];
  return [[1, y + 21, 0], [-11, y + 21, 0]];
}
function tower(g, spec) {
  const U = spec.upper, y = spec.fb, L = spec.L, B = spec.B, iowa = spec.id === "iowa", fx = L * 0.12, y1 = y + 3.4;
  box(g, L * 0.42, 3.4, B * 0.66, U, -L * 0.03, y, 0);
  box(g, L * 0.14, 3.2, B * 0.48, U, fx, y1, 0); box(g, L * 0.08, 3, B * 0.34, U, fx + L * 0.01, y1 + 3.2, 0);
  cyl(g, 3.6, 3.8, 5.5, U, fx + L * 0.06, y1 + 3.2, 0, 16);
  box(g, 8.5, 12, 7.5, U, fx - 2, y1 + 6.2, 0); box(g, 11, 2.2, 13, U, fx - 2, y1 + 18.2, 0); box(g, 6.5, 3, 5.5, U, fx - 1, y1 + 20.4, 0);
  box(g, 1.2, 1, 14, 0x51595e, fx - 1, y1 + 23.4, 0); cyl(g, 0.4, 0.5, 13, 0x51595e, fx - 5, y1 + 20.4, 0, 6); box(g, 0.3, 0.3, 9, 0x474d51, fx - 5, y1 + 30.5, 0);
  const fs = iowa ? [-L * 0.02, -L * 0.12] : [L * 0.03, -L * 0.06];
  for (const x of fs) { const f = cyl(g, 3.3, 3.8, 13, U, x, y1, 0, 16); f.scale.z = 0.72; const c = cyl(g, 3.35, 3.35, 1.2, 0x1c1e20, x, y1 + 13, 0, 16); c.scale.z = 0.72; }
  box(g, L * 0.1, 3, B * 0.36, U, -L * 0.18, y1, 0); box(g, 5.5, 2.8, 4.8, U, -L * 0.18, y1 + 3, 0); cyl(g, 0.35, 0.45, 15, 0x51595e, -L * 0.16, y1 + 3, 0, 6);
  for (const x of [L * 0.13, L * 0.06, -L * 0.01, -L * 0.08, -L * 0.15]) for (const s of [1, -1]) sec5(g, U, x, y1, s * B * 0.27, s > 0 ? -PI / 2 : PI / 2);
  for (const [x, z, h] of [[L * 0.21, 6, 0], [L * 0.21, -6, 0], [-L * 0.25, 5, 0], [-L * 0.25, -5, 0], [L * 0.02, B * 0.43, 0], [L * 0.02, -B * 0.43, 0], [-L * 0.12, B * 0.43, 0], [-L * 0.12, -B * 0.43, 0], [fx + 4, 5, 6.4], [fx + 4, -5, 6.4]]) tub40(g, U, x, h ? y1 + h : y, z);
  for (const s of [1, -1]) box(g, 21, 0.8, 1.6, 0x596064, -L * 0.43, y + 1, s * 6).rotation.y = s * 0.3;
  const top = y1 + 31;
  lines(g, [fx - 5, top, 0, L * 0.48, deckY(spec, L * 0.48) + 4, 0, fx - 5, top, 0, -L * 0.16, y1 + 18, 0, -L * 0.16, y1 + 18, 0, -L * 0.48, y + 4, 0]);
  g.userData.bridge = [fx + 2.7, y1 + 19.5, 0];
  return fs.map((x) => [x, y1 + 14.4, 0]);
}
function cruiser(g, spec) {
  const U = spec.upper, y = spec.fb, L = spec.L, B = spec.B, fx = L * 0.1, y1 = y + 3;
  box(g, L * 0.34, 3, B * 0.62, U, -L * 0.02, y, 0);
  box(g, L * 0.11, 3, B * 0.5, U, fx, y1, 0); box(g, L * 0.07, 2.8, B * 0.38, U, fx + 1, y1 + 3, 0); box(g, 8, 1.2, B * 0.66, U, fx + 2, y1 + 5.8, 0);
  box(g, 4.5, 2.6, 4, U, fx, y1 + 7, 0); box(g, 1, 0.8, 9, 0x51595e, fx, y1 + 9.6, 0);
  cyl(g, 0.45, 0.55, 17, 0x5b6368, fx - 5, y1 + 3, 0, 6);
  for (const s of [1, -1]) { const l = box(g, 0.4, 16, 0.4, 0x5b6368, fx - 7, y1 + 3, s * 1.6); l.rotation.x = s * 0.12; l.rotation.z = 0.2; }
  box(g, 0.3, 0.3, 8, 0x474d51, fx - 5, y1 + 17, 0);
  if (spec.big) { box(g, 7, 6, 6.5, U, fx - 3, y1 + 5.8, 0); box(g, 5, 2.6, 5, U, fx - 3, y1 + 11.8, 0); box(g, 1, 0.8, 11, 0x51595e, fx - 3, y1 + 14.4, 0); }
  const fs = spec.big ? [-L * 0.02, -L * 0.065] : [L * 0.01, -L * 0.085];
  for (const x of fs) { const f = cyl(g, 2.5, 2.9, 10, U, x, y1, 0, 14); f.scale.z = 0.75; const c = cyl(g, 2.55, 2.55, 1, 0x1c1e20, x, y1 + 10, 0, 14); c.scale.z = 0.75; }
  box(g, L * 0.07, 2.8, B * 0.38, U, -L * 0.15, y1, 0); box(g, 4.2, 2.4, 3.8, U, -L * 0.15, y1 + 2.8, 0); cyl(g, 0.3, 0.4, 13, 0x5b6368, -L * 0.12, y1 + 2.8, 0, 6);
  for (const x of [L * 0.05, -L * 0.1]) for (const s of [1, -1]) sec5(g, U, x, y1, s * B * 0.3, s > 0 ? -PI / 2 : PI / 2);
  sec5(g, U, fx + L * 0.03, y1 + 3, 0, 0);
  for (const [x, z] of [[L * 0.17, 4], [L * 0.17, -4], [-L * 0.21, 3.5], [-L * 0.21, -3.5], [L * 0.0, B * 0.42], [L * 0.0, -B * 0.42]]) tub40(g, U, x, y, z);
  for (const s of [1, -1]) box(g, 14, 0.7, 1.3, 0x596064, -L * 0.41, y + 0.9, s * 4.5).rotation.y = s * 0.3;
  const top = y1 + 20;
  lines(g, [fx - 5, top, 0, L * 0.48, deckY(spec, L * 0.48) + 3, 0, fx - 5, top, 0, -L * 0.12, y1 + 15.8, 0, -L * 0.12, y1 + 15.8, 0, -L * 0.48, y + 3, 0]);
  g.userData.bridge = [fx + 1 + L * 0.033, y1 + 5.3, 0];
  return fs.map((x) => [x, y1 + 11, 0]);
}
function dd(g, spec) {
  const U = spec.upper, y = spec.fb, B = spec.B;
  box(g, 14, 3, B * 0.62, U, 19, y, 0); box(g, 9, 2.6, B * 0.5, U, 20, y + 3, 0); box(g, 5, 1.1, B * 0.82, U, 21, y + 5.6, 0);
  box(g, 3.2, 1.8, 3, U, 19, y + 6.7, 0); box(g, 0.7, 0.6, 5, 0x51595e, 19, y + 8.5, 0);
  cyl(g, 0.25, 0.32, 14, 0x5b6368, 13, y + 3, 0, 6); box(g, 0.2, 0.2, 7, 0x474d51, 13, y + 13.5, 0);
  for (const x of [8, -2]) { const f = cyl(g, 1.5, 1.8, 7, U, x, y, 0, 12); f.scale.z = 0.8; const c = cyl(g, 1.55, 1.55, 0.7, 0x1c1e20, x, y + 7, 0, 12); c.scale.z = 0.8; }
  box(g, 10, 2.6, B * 0.5, U, -17, y, 0);
  for (const x of [3, -8]) { cyl(g, 1.2, 1.3, 0.6, U, x, y, 0, 10); for (let i = 0; i < 5; i++) { const t = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 6, 8), mat(0x6b7378))); t.rotation.z = PI / 2; t.position.set(x, y + 1.1, (i - 2) * 0.62); g.add(t); } }
  for (const [x, z] of [[-24, 2.5], [-24, -2.5], [9, 4.2], [9, -4.2]]) tub40(g, U, x, y, z);
  for (const s of [1, -1]) box(g, 4, 1, 1, 0x3a3f43, -52, y, s * 2.5);
  lines(g, [13, y + 17, 0, 56, deckY(spec, 56) + 2, 0, 13, y + 17, 0, -56, y + 2, 0]);
  g.userData.bridge = [22.5, y + 6.2, 0];
  return [[8, y + 7.7, 0], [-2, y + 7.7, 0]];
}
function raider(g, spec) {
  const U = spec.upper, y = spec.fb, s = spec.L / 205, b = spec.B / 30, h = Math.max(0.55, s), y1 = y + 3.4 * h;
  box(g, 54 * s, 3.4 * h, 16.5 * b, U, 2 * s, y, 0);
  box(g, 10 * s, 20 * h, 8.5 * b, U, 21 * s, y1, 0);
  box(g, 13 * s, 2.2 * h, 12.5 * b, U, 21 * s, y + 12 * h, 0); box(g, 12 * s, 2 * h, 11 * b, U, 21 * s, y + 18 * h, 0);
  cyl(g, 3.6 * b, 3.0 * b, 3 * h, U, 21 * s, y + 23.4 * h, 0); box(g, 1.2, 1, 13 * b, U, 21 * s, y + 26.4 * h, 0);
  const fn = cyl(g, 3.3 * b, 3.9 * b, 15 * h, U, 3 * s, y1, 0); fn.rotation.z = 0.12; cyl(g, 3.35 * b, 3.35 * b, 1.6 * h, 0x151718, 1.4 * s, y + 17.6 * h, 0);
  cyl(g, 0.5, 0.7, 30 * h, U, -17 * s, y1, 0); cyl(g, 2.2 * b, 2.2 * b, 1.6, U, -17 * s, y + 26 * h, 0);
  box(g, 14 * s, 3.2 * h, 10 * b, U, -22 * s, y1, 0);
  if (spec.L > 150) for (const sx of [26, 12, -4, -14]) for (const k of [1, -1]) box(g, 4 * s, 2 * h, 3.4 * b, U, sx * s, y1, k * 6.6 * b);
  for (const [ax, az] of [[30, 6], [30, -6], [-8, 7], [-8, -7], [-28, 4.5], [-28, -4.5]]) { cyl(g, 0.9, 1.1, 1.2, U, ax * s, y1, az * b, 8); const bb = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 3.6, 6), mat(0x2c3134))); bb.rotation.z = ax > 0 ? -0.95 : 0.95; bb.position.set(ax * s + (ax > 0 ? 1.2 : -1.2), y1 + 2.1, az * b); g.add(bb); }
  box(g, 0.35, 0.35, 15 * b, 0x33393d, -17 * s, y + 22 * h, 0); if (spec.L > 150) for (const k of [1, -1]) box(g, 8 * s, 1.2, 2.3 * b, 0x9a9990, -8 * s, y1, k * 4.4 * b);
  lines(g, [21 * s, y + 27 * h, 0, spec.L * 0.48, deckY(spec, spec.L * 0.48) + 2, 0, 21 * s, y + 27 * h, 0, -17 * s, y + 29 * h, 0, -17 * s, y + 29 * h, 0, -spec.L * 0.48, y + 3, 0]);
  return [[1.4 * s, y + 20 * h, 0]];
}
function carrier(g, spec) {
  const U = spec.upper, y = spec.fb, L = spec.L, B = spec.B, iz = B * 0.47, yd = y + 8.6;
  box(g, L * 0.84, 7.5, B * 0.92, U, -L * 0.02, y, 0);
  box(g, L * 0.95, 1.1, B * 1.02, spec.deck, -L * 0.01, y + 7.5, 0);
  box(g, L * 0.9, 0.06, 0.5, 0xd8d8d0, -L * 0.01, yd + 0.02, 0); for (const s of [1, -1]) box(g, L * 0.9, 0.06, 0.35, 0xd8d8d0, -L * 0.01, yd + 0.02, s * B * 0.48);
  for (const x of [L * 0.38, -L * 0.42]) box(g, 0.4, 0.06, B * 0.9, 0xd8d8d0, x, yd + 0.02, 0);
  box(g, 34, 9, 5, U, L * 0.07, yd, iz); box(g, 18, 5, 4.5, U, L * 0.1, yd + 9, iz); box(g, 5, 3, 4, U, L * 0.1, yd + 14, iz);
  cyl(g, 0.5, 0.6, 14, 0x5b6368, L * 0.12, yd + 9, iz, 6); box(g, 0.3, 0.3, 8, 0x474d51, L * 0.12, yd + 22, iz);
  box(g, 42, 20, 6, U, -L * 0.05, yd, iz); box(g, 42.2, 1.4, 6.2, 0x1c1e20, -L * 0.05, yd + 20, iz);
  for (const [x, dir] of [[L * 0.2, 0], [L * 0.155, 0], [-L * 0.16, PI], [-L * 0.205, PI]]) {
    const t = new THREE.Group(); t.position.set(x, yd, iz - 1.2); t.rotation.y = -dir; g.add(t); box(t, 7, 2.4, 6, U, 0, 0, 0);
    for (const s of [-1.2, 1.2]) { const b = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 9, 8), mat(0x474e52))); b.rotation.z = -PI / 2; b.position.set(7.5, 1.3, s); t.add(b); }
  }
  for (let i = 0; i < 9; i++) { const p = planeMesh(1, !!spec.foe); p.position.set(-L * 0.3 - (i % 3) * 15, yd + 1.3, (((i / 3) | 0) - 1) * 11); p.rotation.y = PI / 2; g.add(p); }
  g.userData.bridge = [L * 0.1 + 7, yd + 11.5, iz];
  return [[-L * 0.05, yd + 21, iz]];
}
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
  const mslBody = new THREE.CylinderGeometry(0.08, 0.08, 2.9, 8); mslBody.rotateZ(-PI / 2);
  const nav = new THREE.SphereGeometry(0.11, 6, 6);
  const seat = new THREE.BoxGeometry(0.45, 0.55, 0.42);
  const abGlow = new THREE.CircleGeometry(0.32, 14); abGlow.rotateY(-PI / 2);
  const abOuter = new THREE.ConeGeometry(0.36, 4.6, 14, 1, true); abOuter.rotateZ(PI / 2); abOuter.translate(-2.3, 0, 0);
  const abCore = new THREE.ConeGeometry(0.2, 2.9, 12); abCore.rotateZ(PI / 2); abCore.translate(-1.45, 0, 0);
  const abDiamond = new THREE.SphereGeometry(0.22, 10, 8); abDiamond.scale(1.9, 0.72, 0.72);
  return { body, radome, pitot, lerx, wing, fin, stab, can, spine, intake, intakeHole, nozzle, rail, mslBody, nav, seat, abGlow, abOuter, abCore, abDiamond };
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
};
export function jetMesh(foe) {
  const g = new THREE.Group(), m = foe ? JM.foe : JM.us, md = foe ? JM.foeDark : JM.usDark;
  const put = (geo, mm, x, y, z, sh = true) => { const o = new THREE.Mesh(geo, mm); o.position.set(x, y, z); if (sh) o.castShadow = true; g.add(o); return o; };
  put(JG.body, m, 0, 0, 0); put(JG.radome, JM.nose, 0, 0, 0); put(JG.pitot, JM.metal, 0, 0, 0, false);
  put(JG.spine, md, -0.3, 0.46, 0); put(JG.seat, JM.nose, 4.1, 0.56, 0, false); put(JG.can, JM.glass, 4.2, 0.48, 0, false);
  put(JG.wing, m, 0, -0.08, 0.58); const w2 = put(JG.wing, m, 0, -0.08, -0.58); w2.scale.z = -1;
  put(JG.lerx, md, 0, 0.02, 0.12); const l2 = put(JG.lerx, md, 0, 0.02, -0.12); l2.scale.z = -1;
  put(JG.stab, m, -5.3, -0.08, 0.52); const s2 = put(JG.stab, m, -5.3, -0.08, -0.52); s2.scale.z = -1;
  for (const s of [1, -1]) {
    const f = put(JG.fin, s > 0 ? m : md, -3.25, 0.42, s * 0.88); f.rotation.x = -s * 0.42;
    const ik = put(JG.intake, md, 1.9, -0.14, s * 0.96); ik.rotation.y = s * 0.05;
    put(JG.intakeHole, JM.voidM, 3.21, -0.14, s * 0.99, false);
    put(JG.nozzle, JM.metal, -7.65, -0.06, s * 0.52);
    put(JG.rail, JM.nose, -3.55, -0.04, s * 6.82, false);
    put(JG.mslBody, JM.msl, -3.35, -0.08, s * 6.95, false);
    put(JG.mslBody, JM.msl, -1.2, -0.45, s * 2.8, false);
    put(JG.nav, s > 0 ? JM.navG : JM.navR, -3.9, -0.04, s * 6.84, false);
  }
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
  g.userData.ab = { burners, glowMat, outerMat, coreMat, diaMat };
  return g;
}
function foeDD(g, spec) {
  const U = spec.upper, y = spec.fb, B = spec.B;
  box(g, 11, 3.4, B * 0.6, U, 22, y, 0); box(g, 6, 3, B * 0.5, U, 23, y + 3.4, 0); box(g, 3, 1.6, B * 0.7, U, 24, y + 6.4, 0);
  for (const s of [1, -1]) { const l = box(g, 0.35, 15, 0.35, 0x3b4246, 18, y + 3.4, s * 1.3); l.rotation.x = s * 0.1; }
  cyl(g, 0.3, 0.35, 15, 0x3b4246, 16.5, y + 3.4, 0, 6); box(g, 0.2, 0.2, 6, 0x33393d, 17, y + 16, 0);
  const f = cyl(g, 2.4, 2.8, 8.5, U, 2, y, 0, 12); f.rotation.z = 0.22; f.scale.z = 0.75; const c = cyl(g, 2.45, 2.45, 0.8, 0x151718, 0.2, y + 8.2, 0, 12); c.rotation.z = 0.22; c.scale.z = 0.75;
  for (const x of [-9, -21]) { cyl(g, 1.1, 1.2, 0.6, U, x, y, 0, 10); for (let i = 0; i < 4; i++) { const t = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6.5, 8), mat(0x5d6568))); t.rotation.z = PI / 2; t.position.set(x, y + 1.1, (i - 1.5) * 0.7); g.add(t); } }
  box(g, 9, 2.6, B * 0.45, U, -30, y, 0); tub40(g, U, 9, y, 3.6); tub40(g, U, 9, y, -3.6);
  lines(g, [17, y + 18, 0, 58, deckY(spec, 58) + 2, 0, 17, y + 18, 0, -58, y + 2, 0]);
  return [[0.2, y + 9.2, 0]];
}
function foeCL(g, spec) {
  const U = spec.upper, y = spec.fb, L = spec.L, B = spec.B, fx = L * 0.13;
  box(g, L * 0.32, 3, B * 0.6, U, -L * 0.03, y, 0);
  for (let i = 0; i < 4; i++) box(g, 9 - i * 1.4, 3, B * (0.5 - i * 0.07), U, fx - i * 0.6, y + 3 + i * 3, 0);
  box(g, 3, 1.2, B * 0.75, U, fx, y + 15, 0); box(g, 1, 0.8, 10, 0x2f3638, fx - 1, y + 16.2, 0);
  for (const s of [1, -1]) { const l = box(g, 0.45, 22, 0.45, 0x3b4246, fx - 6, y + 3, s * 1.8); l.rotation.x = s * 0.09; }
  cyl(g, 0.4, 0.5, 26, 0x3b4246, fx - 4.5, y + 3, 0, 6);
  const f = box(g, 15, 13, 6.5, U, -L * 0.03, y + 3, 0); f.rotation.z = 0.28; box(g, 15.2, 1, 6.7, 0x151718, -L * 0.03 - 3.4, y + 15.6, 0).rotation.z = 0.28;
  for (const s of [1, -1]) { const l = box(g, 0.4, 17, 0.4, 0x3b4246, -L * 0.15, y + 3, s * 1.5); l.rotation.x = s * 0.1; }
  box(g, 14, 0.8, 1.4, 0x4a5256, -L * 0.1, y + 3.2, 0).rotation.y = 0.5; cyl(g, 0.5, 0.6, 9, 0x4a5256, -L * 0.08, y + 3, B * 0.3, 6);
  for (const [x, z] of [[L * 0.05, B * 0.36], [L * 0.05, -B * 0.36], [-L * 0.12, B * 0.36], [-L * 0.12, -B * 0.36]]) sec5(g, U, x, y + 3, z, z > 0 ? -PI / 2 : PI / 2);
  lines(g, [fx - 4.5, y + 29, 0, L * 0.48, deckY(spec, L * 0.48) + 3, 0, fx - 4.5, y + 29, 0, -L * 0.15, y + 20, 0, -L * 0.15, y + 20, 0, -L * 0.48, y + 3, 0]);
  return [[-L * 0.03 - 3.8, y + 16.6, 0]];
}
function pagoda(g, spec) {
  const U = spec.upper, y = spec.fb, L = spec.L, B = spec.B, fx = L * 0.12;
  box(g, L * 0.36, 3.6, B * 0.6, U, -L * 0.03, y, 0);
  const lv = [[16, 4, 0.5], [13, 3.4, 0.46], [10, 3, 0.52], [12, 2.4, 0.58], [7.5, 3, 0.36], [10, 2.2, 0.48], [6, 2.8, 0.3], [8.5, 2, 0.4], [5, 2.6, 0.24]];
  let h = y + 3.6; for (const [len, hh, w] of lv) { box(g, len, hh, B * w, U, fx - (len - 10) * 0.2, h, 0); h += hh; }
  box(g, 1.4, 1.2, 14, 0x2f3638, fx, h, 0); box(g, 4, 2.4, 3.6, U, fx, h + 1.2, 0); cyl(g, 0.4, 0.5, 9, 0x3b4246, fx - 1, h + 3.6, 0, 6);
  const f = cyl(g, 4, 4.8, 15, U, -L * 0.02, y + 3.6, 0, 16); f.rotation.z = 0.3; f.scale.z = 0.7; const c = cyl(g, 4.05, 4.05, 1.3, 0x151718, -L * 0.02 - 4.6, y + 17.4, 0, 16); c.rotation.z = 0.3; c.scale.z = 0.7;
  for (const s of [1, -1]) { const l = box(g, 0.5, 20, 0.5, 0x3b4246, -L * 0.13, y + 3.6, s * 2); l.rotation.x = s * 0.1; }
  box(g, 10, 3, B * 0.34, U, -L * 0.17, y + 3.6, 0);
  for (const x of [L * 0.05, -L * 0.02, -L * 0.09]) for (const s of [1, -1]) { box(g, 5, 2, 4, U, x, y, s * B * 0.44); const b = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 6, 6), mat(0x2c3134))); b.rotation.x = PI / 2 * s; b.position.set(x, y + 1.2, s * (B * 0.44 + 3)); g.add(b); }
  for (const s of [1, -1]) box(g, 18, 0.8, 1.5, 0x4a5256, -L * 0.42, y + 1, s * 5).rotation.y = s * 0.35;
  lines(g, [fx - 1, h + 12, 0, L * 0.48, deckY(spec, L * 0.48) + 3, 0, fx - 1, h + 12, 0, -L * 0.13, y + 24, 0, -L * 0.13, y + 24, 0, -L * 0.48, y + 3, 0]);
  return [[-L * 0.02 - 4.6, y + 18.7, 0]];
}
function titan(g, spec) {
  const U = spec.upper, y = spec.fb, L = spec.L, B = spec.B, fx = L * 0.11;
  box(g, L * 0.4, 4, B * 0.62, U, -L * 0.03, y, 0); box(g, L * 0.2, 3.5, B * 0.46, U, fx - L * 0.03, y + 4, 0);
  box(g, 14, 16, 10, U, fx, y + 7.5, 0); box(g, 16, 2.6, 15, U, fx + 1, y + 23.5, 0); box(g, 9, 4, 8, U, fx, y + 26.1, 0);
  box(g, 1.6, 1.4, 18, 0x2f3638, fx, y + 30.1, 0); box(g, 5, 3, 5, U, fx - 1, y + 31.5, 0); cyl(g, 0.45, 0.55, 10, 0x3b4246, fx - 3, y + 34.5, 0, 6);
  const f = box(g, 18, 16, 10, U, -L * 0.04, y + 7.5, 0); f.rotation.z = 0.2; box(g, 18.3, 1.2, 10.3, 0x151718, -L * 0.04 - 3.2, y + 23.2, 0).rotation.z = 0.2;
  box(g, 12, 7, 8, U, -L * 0.16, y + 7.5, 0); cyl(g, 0.4, 0.5, 18, 0x3b4246, -L * 0.15, y + 14.5, 0, 6);
  for (const x of [L * 0.1, L * 0.02, -L * 0.06, -L * 0.13]) for (const sd of [1, -1]) sec5(g, U, x, y + 4, sd * B * 0.36, sd > 0 ? -PI / 2 : PI / 2);
  for (const [x, z] of [[L * 0.2, 5], [L * 0.2, -5], [-L * 0.24, 4], [-L * 0.24, -4], [L * 0.0, B * 0.44], [L * 0.0, -B * 0.44], [-L * 0.1, B * 0.44], [-L * 0.1, -B * 0.44]]) tub40(g, U, x, y, z);
  lines(g, [fx - 3, y + 44, 0, L * 0.48, deckY(spec, L * 0.48) + 3, 0, fx - 3, y + 44, 0, -L * 0.15, y + 32, 0, -L * 0.15, y + 32, 0, -L * 0.48, y + 3, 0]);
  return [[-L * 0.04 - 3.4, y + 24.5, 0]];
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
function vlsGrid(g, x, y, rows, cols) {
  const w = cols * 1.15 + 0.4, d = rows * 1.15 + 0.4; box(g, w, 0.3, d, 0x3a4044, x, y, 0);
  for (let c = 1; c < cols; c++) box(g, 0.08, 0.08, d - 0.3, 0x24292c, x - w / 2 + 0.2 + c * 1.15, y + 0.3, 0);
  for (let r = 1; r < rows; r++) box(g, w - 0.3, 0.08, 0.08, 0x24292c, x, y + 0.3, -d / 2 + 0.2 + r * 1.15);
}
function array4(g, pts, r) { for (const [x, y, z, a] of pts) { const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.35, 8), mat(0x56606a))); m.geometry.rotateZ(PI / 2); m.position.set(x, y, z); m.rotation.y = -a; g.add(m); } }
function ciws(g, x, y, z) { cyl(g, 0.9, 1.1, 1.6, 0x9aa2a6, x, y, z, 10); const d = cyl(g, 0.8, 0.8, 1.4, 0xe9ecec, x, y + 1.6, z, 12); d.scale.z = 0.9; }
function cans(g, x, y, n) { for (const s of [1, -1]) for (let i = 0; i < n; i++) { const c = shadowed(new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.7, 0.7), mat(0x7f888c))); c.position.set(x, y + 1.2 + (i % 2) * 0.75, s * (1.4 + Math.floor(i / 2) * 0.75)); c.rotation.z = 0.32; c.rotation.y = s * 0.5; g.add(c); } }
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
/** Arleigh Burke / KDX-III / Maya: two-tier Aegis deckhouse with four octagonal SPY faces, pyramid mast, two raked stacks, hangar aft. */
function aegis(g, spec) {
  const U = spec.upper, y = spec.fb, B = spec.B, k = spec.L / 155;
  vlsGrid(g, 44 * k, deckY(spec, 44 * k), 4, 8);
  slab(g, 30 * k, 7.6, B * 0.82, B * 0.7, 27 * k, U, 13 * k, y, 0);                 // main deckhouse, sides sloped inward
  slab(g, 17 * k, 6.4, B * 0.62, B * 0.46, 14 * k, U, 14 * k, y + 7.6, 0);            // bridge tier carrying the arrays
  box(g, 0.6, 1.2, B * 0.44, 0x141a1f, 21.9 * k, y + 11.2, 0);                       // bridge windows
  box(g, 3.2 * k, 0.5, B * 0.86, U, 20.5 * k, y + 10.4, 0);                          // bridge wings
  const fx = 21.2 * k, ax = 7.2 * k, hy = y + 10.6, hz = B * 0.25, r = 2.3 * k;
  spyFace(g, fx, hy, hz, PI / 4, r); spyFace(g, fx, hy, -hz, -PI / 4, r); spyFace(g, ax, hy, hz, PI * 0.75, r); spyFace(g, ax, hy, -hz, -PI * 0.75, r);
  pyramidMast(g, 11 * k, y + 14, 15, 2.4, U);
  stack(g, -5 * k, y, 8 * k, B * 0.32, 10, U); stack(g, -22 * k, y, 8 * k, B * 0.32, 10, U);
  slab(g, 26 * k, 3.2, B * 0.6, B * 0.56, 26 * k, U, -13 * k, y, 0);                // midships deckhouse joining the stacks
  if (spec.cans) cans(g, -13 * k, y + 3.2, spec.cans);
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
  const r = 2.2 * k, hy = y + 13.5;
  for (const [x, z, a] of [[21.6 * k, B * 0.2, PI / 4], [21.6 * k, -B * 0.2, -PI / 4], [8.4 * k, B * 0.2, PI * 0.75], [8.4 * k, -B * 0.2, -PI * 0.75]]) { const f = box(g, 0.3, r * 1.9, r * 1.6, 0x2c3338, x, hy - r, z); f.rotation.y = -a; f.rotation.z = -0.2; }
  cyl(g, 0.3, 0.5, 7, 0x5a6268, 15 * k, y + 24.5, 0, 6); const d = shadowed(new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), mat(0xe6e8e8))); d.position.set(15 * k, y + 32, 0); g.add(d);
  stack(g, -8 * k, y, 14 * k, B * 0.46, 11, U);
  slab(g, 20 * k, 3.4, B * 0.62, B * 0.58, 20 * k, U, -8 * k, y, 0);
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
  const r = 1.6 * k; for (const s of [1, -1]) spyFace(g, 18.5 * k, y + 11, s * B * 0.17, s * PI / 4, r);
  pyramidMast(g, 10 * k, y + 13, 12, 2, U);
  stack(g, -6 * k, y, 9 * k, B * 0.36, 8.5, U);
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
  if (spec.modern || ["carrier", "cargo", "mcarrier"].includes(spec.style) || MODELS[spec.id]) return;
  const L = spec.L, busy = spec.turrets.map((t) => t.x), n = Math.max(2, Math.round(L / 30));
  for (let i = 0; i < n; i++) {
    const x = -L * 0.3 + (i / (n - 1)) * L * 0.58; if (busy.some((bx) => Math.abs(bx - x) < 10)) continue;
    const t = (x + L / 2) / L, y = deckY(spec, x), hb = halfBeam(spec, t); for (const sd of [1, -1]) aaMount(g, x, y, sd * hb * 0.78, sd);
  }
  if (L > 100) for (const sd of [1, -1]) { const b = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 4.2, 4, 8), mat(0x7a7f74))); b.rotation.z = PI / 2; b.position.set(-L * 0.04, deckY(spec, -L * 0.04) + 1.1, sd * halfBeam(spec, 0.46) * 0.55); g.add(b); }
}
const STYLE = { mcarrier, cage: colorado, tower, cruiser, dd, raider, carrier, foeDD, foeCL, pagoda, titan, cargo, aegis, pla, kpn };

function buildTurret(ship, t, i) {
  const spec = ship.spec, g = ship.gun, cal = g.cal, y = deckY(spec, t.x);
  const tw = cal >= 380 ? 12 : cal >= 200 ? 9.2 : cal >= 150 ? 7.6 : 4.6, td = tw * 0.82, th = cal >= 380 ? 3 : cal >= 150 ? 2.5 : 2.3;
  cyl(ship.tilt, tw * 0.46, tw * 0.46, t.up + 1.2, spec.upper, t.x, y, 0, 18);
  cyl(ship.tilt, tw * 0.48, tw * 0.48, 0.4, 0x5a6266, t.x, y + t.up + 0.8, 0, 18);
  const grp = new THREE.Group(); grp.position.set(t.x, y + t.up + 1.2, 0); ship.tilt.add(grp);
  if (spec.modern) slab(grp, tw * 1.25, th * 1.05, td * 1.15, td * 0.5, tw * 0.55, spec.upper, -tw * 0.05, 0, 0, -tw * 0.2); // faceted stealth gun shield
  else { box(grp, tw, th, td, spec.upper, -tw * 0.1, 0, 0); box(grp, tw * 0.9, 0.22, td * 0.92, 0x5a6266, -tw * 0.1, th, 0); }
  if (cal >= 200) box(grp, 1.2, 0.9, td * 1.25, spec.upper, -tw * 0.45, th * 0.55, 0);
  const pivot = new THREE.Group(); pivot.position.set(tw * 0.38, th * 0.5, 0); grp.add(pivot);
  const r = (cal / 1000) * 0.95, spc = t.n === 1 ? 0 : tw * (t.n === 3 ? 0.27 : 0.3);
  for (let b = 0; b < t.n; b++) {
    const zz = (b - (t.n - 1) / 2) * spc;
    const bar = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 1.25, g.len, 10), mat(0x474e52))); bar.rotation.z = -PI / 2; bar.position.set(g.len / 2, 0, zz); pivot.add(bar);
    if (cal >= 150) { const bag = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.6, r * 2.1, 1.6 + cal / 400, 10), mat(0xcbc4ae)); bag.rotation.z = -PI / 2; bag.position.set(0.9, 0, zz); pivot.add(bag); }
  }
  grp.rotation.y = -t.rest;
  return { i, grp, pivot, th, x: t.x, y: y + t.up + 1.2 + th * 0.5, rest: t.rest, n: t.n, spc, tw, d: 0, elev: 0, reload: 3 + i * 1.2 + rnd() * 2, alive: true, onTarget: false, inArc: true, range: 9000 };
}

// ── the ship ────────────────────────────────────────────────────────────────
const ARC = 150 * DEG;
export const TELE = [{ n: "후진 반속", f: -0.3 }, { n: "정지", f: 0 }, { n: "미속", f: 0.3 }, { n: "반속", f: 0.55 }, { n: "원속", f: 0.8 }, { n: "전속", f: 1 }];
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
    this.torps = spec.torp ? spec.torp.mounts.map((x) => ({ x, reload: 6 + rnd() * 6 })) : [];
    paint.color = null; paint.map = null;
    this.bridge = this.tilt.userData.bridge || [spec.L * 0.15, spec.fb + 8, 0];
    this.model = null; if (MODELS[spec.id]) applyModel(this);
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
      if (!t.alive) { t.onTarget = false; continue; }
      const tp = this.turretPos(t), dx = ap.x - tp.x, dz = ap.z - tp.z; t.range = Math.hypot(dx, dz);
      const d = wrap(wrap(Math.atan2(dz, dx) - this.heading) - t.rest); t.inArc = Math.abs(d) <= ARC;
      const want = clamp(d, -ARC, ARC); t.d += clamp(want - t.d, -this.trainRate * dt, this.trainRate * dt);
      const we = solve(this.tb, t.range).elev; t.elev += clamp(we - t.elev, -this.elevRate * dt, this.elevRate * dt);
      t.onTarget = t.inArc && Math.abs(want - t.d) < 0.012 && Math.abs(we - t.elev) < 0.006 && this.sinking === 0;
      const was = t.reload; t.reload = Math.max(0, was - dt);
      if (this.isPlayer && was > 0 && t.reload === 0 && G.state === "playing" && !G.plane) sfx.ready();
      t.grp.rotation.y = -(t.rest + t.d); t.pivot.rotation.z = t.elev;
    }
    for (const m of this.torps) m.reload = Math.max(0, m.reload - dt);
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
      if (this.sinking === 0 && this.root.visible) for (const fl of this.funnels) { const w = this.tilt.localToWorld(new THREE.Vector3(...fl)); smoke.spawn({ x: w.x, y: w.y, z: w.z, vx: 2.5, vy: 3.2, vz: 1, life: 9, s0: 5, s1: 30, a: 0.24, c: 0x3a3a3a }); }
      for (let i = 0; i < Math.min(this.fires.length, 3); i++) {
        const lx = ((i * 37 + this.phase * 20) % (sp.L * 0.47)) - sp.L * 0.23, w = this.tilt.localToWorld(new THREE.Vector3(lx, sp.fb + 6, 0));
        for (let k = 0; k < 2; k++) smoke.spawn({ x: w.x + gauss() * 2, y: w.y + k * 4, z: w.z + gauss() * 2, vx: 3 + rnd() * 2, vy: 13 + rnd() * 5, vz: 1.2, drag: 0.06, life: 16 + rnd() * 6, s0: 8, s1: 70 + rnd() * 30, a: 0.75, fade: 0.8, c: k ? 0x2a2622 : 0x141210 }); // tall, drifting column
        flash.spawn({ x: w.x + gauss(), y: w.y - 1.5, z: w.z + gauss(), vy: 3, life: 0.6 + rnd() * 0.4, s0: 10 + rnd() * 6, s1: 5, a: 0.95, c: rnd() < 0.5 ? 0xff6a1a : 0xffa030 });
      }
      if (this.sinking > 0 && this.sinking < 30) { const w = this.tilt.localToWorld(new THREE.Vector3((rnd() - 0.5) * sp.L * 0.6, sp.fb, 0)); smoke.spawn({ x: w.x, y: Math.max(w.y, 2), z: w.z, vx: 2, vy: 5, vz: 1, life: 14, s0: 14, s1: 60, a: 0.6, c: 0x161616 }); }
    }
    this.sync(G.time);
  }
  damage(n) {
    if (!this.alive || this.boarded) return; this.hp -= n; if (n > 0.2) G.lastHitT = G.battleT;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; this.sinking = 0.01; this.listSide = rnd() < 0.5 ? -1 : 1; const d = this.pos.distanceTo(camera.position); at(d, () => sfx.explode(d)); G.onSunk(this); }
  }
  fire(max = Infinity) {
    let n = 0, shells = 0; const salvo = ++salvoSeq;
    for (const t of this.turrets) if (n < max && t.alive && t.reload <= 0 && t.onTarget) {
      t.reload = this.reloadT * (0.97 + rnd() * 0.06);
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
  for (let i = 0; i < 3; i++) smoke.spawn({ x: pos.x + dir.x * (10 + i * 12) * k, y: pos.y + dir.y * (10 + i * 12) * k, z: pos.z + dir.z * (10 + i * 12) * k,
    vx: dir.x * (30 - i * 5) * k + 2, vy: 2.5 + dir.y * 10, vz: dir.z * (30 - i * 5) * k + 0.6, drag: 0.5, life: 7 + rnd() * 4, s0: 12 * k + 3, s1: 58 * k + 10, a: 0.6, c: 0x9a8c78 });
  if (cal >= 200) rings.spawn({ x: pos.x + f.x * 22 * k, z: pos.z + f.z * 22 * k, w0: 8, l0: 8, w1: 95 * k, l1: 95 * k, life: 1.4, a: 0.42, c: 0x41505a, ease: 3 });
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
  muzzleFX(pos, f, el, g.cal, ship);
  if (ship.isPlayer) { G.stats.shots++; if (q.first) { if (G.plane) { const d = pos.distanceTo(camera.position); at(d, () => sfx.farGun(d, g.cal)); } else sfx.gun(g.cal); } }
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
  if (rnd() > pen) { deal(g.dmg[0] * 0.25 * ship.armorK, "도탄"); G.log(`${tag} — 도탄`, cls); return; }
  let dmg = (g.dmg[0] + rnd() * (g.dmg[1] - g.dmg[0])) * ship.armorK;
  if (penK > 6 && rnd() < 0.45) { deal(dmg * 0.3, "과관통"); G.log(`${tag} — 과관통`, cls); return; }
  const c = critical(ship, lx, who(ship)); deal(dmg + c.dmg, "관통");
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
}
export function clearShells() { for (const s of G.shells) s.dispose(); G.shells.length = 0; salvos.clear(); }

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
