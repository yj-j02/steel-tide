/**
 * Steel Tide — game flow: missions and battles, the shipyard and the commander's rank,
 * the Navy Field-style command view (right-click to sail, keys lay the dotted gun line),
 * fog of war, the carrier air groups (watch any fighter, or fly one), HUDs and the
 * connection to the captain's room (credits, ships, rank).
 */
import { THREE, $, PI, TAU, DEG, KN, clamp, wrap, brg, fmt, params, rnd, gauss, G, camera, canvas, renderer, scene, ovScene, ovCam, makeIslands, MAPS, addIsland, clearFx, updateWorld, spray, spark, flash, spawnSplash } from "./js/core.js";
import { A, initAudio, setMuted, setVolume, sfx, updateAudio, radio, bgm, setBgmOn } from "./js/audio.js";
import { post, renderFrame } from "./js/post.js";
import { M as MSL, WPN, launch as mLaunch, stepMissiles, defend, decoy as mDecoy, pickSam, seen as mSeen, clearMissiles, arm as mArm, SENS as SR, launchHelo as mHelo, stepHelos, launchJet, stepJets } from "./js/modern.js";
import { landAt } from "./js/core.js";
import { MODERN, GUNS, SHIPS, CARRIER, ENEMIES, TRANSPORT, FOE_CARRIER, TELE, Ship, table, solve, leadPoint, brain, escort, mkBrain, updateShells, clearShells, paintName, loadModels, MODEL_CFG, RELOAD_K, fireTorps, updateTorps, clearTorps, intercept, torpMount, TORP_SPREAD, torpPath, tubeBearing, hitFX } from "./js/ships.js";
import { air, autopilot as planeAuto, aimDir, dirFrom, launchPlane, recallPlane, autopilot, takeControl, clearAir, updateAir, predictBomb, gunLead, spawnRaid, MODE_NAMES, ROLE_NAMES } from "./js/air.js";
import { cockpit, updateCockpit, aaGun, updateAAGun } from "./js/interior.js";
import { soldier, animSoldier, fireSoldier, garandVM, mgVM, updateGarand, updateMG } from "./js/infantry.js";
import { ECON_SHIPS, ECON_RANKS, ECON_RANK_XP, econRank, ECON_PARTS, ECON_MAX_LV, econPartCost, econNewProfile, econReward, econCheck, econApply } from "./js/shop.js";

// ── profile + room connection ───────────────────────────────────────────────
const CACHE = "steeltide:profile";
let profile = (() => { try { const p = JSON.parse(localStorage.getItem(CACHE)); if (p && Array.isArray(p.owned) && p.upg) return p; } catch {} return econNewProfile(); })();
const saveProfile = () => { try { localStorage.setItem(CACHE, JSON.stringify(profile)); } catch {} };
const ERR = { "not enough credits": "크레딧이 부족합니다", "already owned": "이미 보유한 함선입니다", "max level": "이미 최대 단계입니다", "not owned": "보유하지 않은 함선입니다", "bad code": "코드가 올바르지 않습니다", "rank too low": "계급이 부족합니다" };
let socket = null, retry = 0, serverSeen = false, inflight = 0; const outbox = [];
function playerId() { const key = "hf:game:playerId"; let id = null; try { id = localStorage.getItem(key); } catch {} if (!id) { id = Math.random().toString(36).slice(2, 10); try { localStorage.setItem(key, id); } catch {} } return id; }
const myId = playerId();
function connect() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:", name = params.get("room") || "capt-" + myId;
  try { socket = new WebSocket(`${proto}//${location.host}/ws/${encodeURIComponent(name)}`); } catch { return; }
  socket.addEventListener("open", () => { retry = 0; socket.send(JSON.stringify({ type: "join", playerId: myId })); });
  socket.addEventListener("message", (ev) => {
    if (ev.data === "__pong") return; let msg; try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.type === "error") { inflight = Math.max(0, inflight - 1); console.warn("room:", msg.error); return; }
    if (msg.type !== "state" || !msg.view || !msg.view.profile) return;
    if (!serverSeen) { serverSeen = true; profile = msg.view.profile; for (const a of outbox) if (!econCheck(profile, a)) profile = econApply(profile, a); }
    else { inflight = Math.max(0, inflight - 1); if (!inflight && !outbox.length) profile = msg.view.profile; }
    saveProfile(); flush(); refreshMenus();
  });
  socket.addEventListener("close", () => { serverSeen = false; inflight = 0; retry = Math.min(retry + 1, 6); setTimeout(connect, 500 * 2 ** (retry - 1)); });
}
function flush() { if (!serverSeen || socket?.readyState !== WebSocket.OPEN) return; while (outbox.length) { socket.send(JSON.stringify({ type: "action", action: outbox.shift() })); inflight++; } }
setInterval(() => { if (socket?.readyState === WebSocket.OPEN) socket.send("__ping"); }, 30000);
function act(a) {
  const e = econCheck(profile, a); if (e) { toast(ERR[e] || e); sfx.deny(); return false; }
  profile = econApply(profile, a); saveProfile(); outbox.push(a); flush(); refreshMenus(); return true;
}

// ── ui helpers ──────────────────────────────────────────────────────────────
let toastT = 0;
function toast(t, dur = 2.4) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); toastT = dur; }
const logs = [];
function renderLog() { const L = $("#log"); L.innerHTML = ""; for (const l of logs) { const d = document.createElement("div"); d.textContent = l.text; d.className = l.cls; L.append(d); } }
function log(text, cls = "") { logs.push({ text, cls }); if (logs.length > 6) logs.shift(); renderLog(); }
G.log = log;
const PART = { engine: { n: "기관 개량", e: "최대 속력 +5% / 단계" }, fc: { n: "사격통제장치", e: "산포 −15%, 포탑 선회 +10% / 단계" }, gun: { n: "주포 개량", e: "재장전 시간 −8% / 단계" }, armor: { n: "장갑 보강", e: "받는 피해 −8% / 단계" } };
const signed = (v) => (v >= 0 ? "+" : "−") + fmt(Math.abs(v));
const kmh = (ms) => Math.round(Math.abs(ms) * 3.6);

// ── rank: the player is the fleet commander; ship captains and pilots hold fixed grades ──
const myRank = () => econRank(profile.xp);
const RANK_STARS = ["소령", "중령", "대령", "★", "★★", "★★★", "★★★★", "★★★★★"];
const escortsFor = (r) => Math.min(4, 1 + Math.floor(r / 2));
const fightersFor = () => 9; // Lexington spots 9 Wildcats for this group
/** WWII US Navy billet typical for each rank (game simplification; see report). */
const POSTS = ["구축함 함장", "구축대 사령 (DesDiv)", "구축전대 사령 · 코모도어 (DesRon)", "기동소함대 사령관 (Task Flotilla)", "기동전단 사령관 (Task Group)", "기동부대 사령관 (Task Force)", "함대 사령장관 (Fleet)", "태평양 함대 총사령관 (CINCPAC)"];
const postOf = (r) => POSTS[clamp(r, 0, POSTS.length - 1)];
function rankLine() {
  const r = myRank(), next = ECON_RANK_XP[r + 1];
  return { r, name: ECON_RANKS[r], next: next ? ECON_RANKS[r + 1] : null, need: next, pct: next ? clamp((profile.xp - ECON_RANK_XP[r]) / (next - ECON_RANK_XP[r]), 0, 1) : 1 };
}

// ── flags, captains (all names fictional), rank insignia ─────────────────────
const FLAG = {
  us: (w = 22) => `<svg class="flag" role="img" aria-label="미국 국기" width="${w}" height="${Math.round(w * 0.6)}" viewBox="0 0 20 12"><rect width="20" height="12" fill="#b22234"/><g fill="#fff"><rect y="1.85" width="20" height="0.92"/><rect y="3.7" width="20" height="0.92"/><rect y="5.54" width="20" height="0.92"/><rect y="7.38" width="20" height="0.92"/><rect y="9.23" width="20" height="0.92"/><rect y="11.08" width="20" height="0.92"/></g><rect width="8" height="6.46" fill="#3c3b6e"/></svg>`,
  foe: (w = 22) => `<svg class="flag" role="img" aria-label="일본 국기" width="${w}" height="${Math.round(w * 0.66)}" viewBox="0 0 20 13"><rect width="20" height="13" fill="#fff"/><circle cx="10" cy="6.5" r="3.9" fill="#bc002d"/></svg>`,
};
const NATIONS = {
  us: { n: "미국", cv: "ford", ships: ["burke", "burke2"], bloc: "w", names: ["대니얼 리브스", "마이클 오하라", "케빈 브래들리", "스티븐 카터"], rk: "대령" },
  kr: { n: "대한민국", cv: "dokdo", ships: ["jeongjo", "jeongjo2"], bloc: "w", names: ["김태준", "박성호", "이재원", "최민석"], rk: "대령" },
  jp: { n: "일본", cv: "kaga", ships: ["maya", "haguro"], bloc: "w", names: ["사토 겐이치", "다나카 히로시", "와타나베 료", "스즈키 마코토"], rk: "1등해좌" },
  cn: { n: "중국", cv: "shandong", ships: ["t055", "t055b"], bloc: "e", names: ["왕젠궈", "리웨이", "장하이펑", "류청"], rk: "대교" },
  nk: { n: "북한", base: { type: "MiG-29 (지상 발진)", asm: "금성-3", aam: "R-27", n: 4 }, ships: ["choehyon", "kangkon"], bloc: "e", names: ["림철진", "강명수", "한광혁", "박영일"], rk: "대좌" },
};
const FLAGSVG = {
  kr: (w = 22) => `<svg class="flag" role="img" aria-label="대한민국 국기" width="${w}" height="${Math.round(w * 0.66)}" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><path d="M10 10a5 5 0 0 1 10 0z" fill="#cd2e3a"/><path d="M10 10a5 5 0 0 0 10 0z" fill="#0047a0"/><g fill="#000"><rect x="3" y="3" width="4" height="1"/><rect x="23" y="3" width="4" height="1"/><rect x="3" y="16" width="4" height="1"/><rect x="23" y="16" width="4" height="1"/></g></svg>`,
  jp: (w = 22) => `<svg class="flag" role="img" aria-label="일본 국기" width="${w}" height="${Math.round(w * 0.66)}" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/></svg>`,
  cn: (w = 22) => `<svg class="flag" role="img" aria-label="중국 국기" width="${w}" height="${Math.round(w * 0.66)}" viewBox="0 0 30 20"><rect width="30" height="20" fill="#de2910"/><circle cx="5" cy="5" r="3" fill="#ffde00"/><g fill="#ffde00"><circle cx="10" cy="2" r="0.8"/><circle cx="12" cy="4" r="0.8"/><circle cx="12" cy="7" r="0.8"/><circle cx="10" cy="9" r="0.8"/></g></svg>`,
  nk: (w = 22) => `<svg class="flag" role="img" aria-label="북한 국기" width="${w}" height="${Math.round(w * 0.66)}" viewBox="0 0 30 20"><rect width="30" height="20" fill="#024fa2"/><rect y="3.3" width="30" height="13.4" fill="#fff"/><rect y="4" width="30" height="12" fill="#ed1c27"/><circle cx="10" cy="10" r="4" fill="#fff"/><path d="M10 6.6l1 3h3.2l-2.6 1.9 1 3-2.6-1.9-2.6 1.9 1-3-2.6-1.9h3.2z" fill="#ed1c27"/></svg>`,
};
const flagOf = (S, w) => (S?.nation && S.nation !== "us" && FLAGSVG[S.nation] ? FLAGSVG[S.nation](w) : S?.side === "foe" ? FLAG.foe(w) : FLAG.us(w));
function drawNationFlag(x, y, w, n) {
  const h = w * 0.66; hx.fillStyle = n === "cn" ? "#de2910" : n === "nk" ? "#ed1c27" : "#fff"; hx.fillRect(x, y, w, h);
  if (n === "kr") { hx.fillStyle = "#cd2e3a"; hx.beginPath(); hx.arc(x + w / 2, y + h / 2, h * 0.26, PI, 0); hx.fill(); hx.fillStyle = "#0047a0"; hx.beginPath(); hx.arc(x + w / 2, y + h / 2, h * 0.26, 0, PI); hx.fill(); }
  else if (n === "jp") { hx.fillStyle = "#bc002d"; hx.beginPath(); hx.arc(x + w / 2, y + h / 2, h * 0.3, 0, TAU); hx.fill(); }
  else if (n === "cn") { hx.fillStyle = "#ffde00"; hx.beginPath(); hx.arc(x + w * 0.18, y + h * 0.26, h * 0.15, 0, TAU); hx.fill(); }
  else if (n === "nk") { hx.fillStyle = "#024fa2"; hx.fillRect(x, y, w, h * 0.17); hx.fillRect(x, y + h * 0.83, w, h * 0.17); hx.fillStyle = "#fff"; hx.beginPath(); hx.arc(x + w * 0.33, y + h / 2, h * 0.2, 0, TAU); hx.fill(); }
}
function drawFlag(x, y, w, side, nation) { // canvas version for nameplates
  if (nation && nation !== "us") { drawNationFlag(x, y, w, nation); return; }
  const h = side === "foe" ? w * 0.66 : w * 0.6;
  if (side === "foe") { hx.fillStyle = "#fff"; hx.fillRect(x, y, w, h); hx.fillStyle = "#bc002d"; hx.beginPath(); hx.arc(x + w / 2, y + h / 2, h * 0.3, 0, TAU); hx.fill(); }
  else { hx.fillStyle = "#b22234"; hx.fillRect(x, y, w, h); hx.fillStyle = "#fff"; for (let i = 1; i < 13; i += 2) hx.fillRect(x, y + (i * h) / 13, w, h / 13); hx.fillStyle = "#3c3b6e"; hx.fillRect(x, y, w * 0.4, h * 0.54); }
}
const ENG = { colorado: "USS COLORADO BB-45", fletcher: "USS FLETCHER DD-445", cleveland: "USS CLEVELAND CL-55", baltimore: "USS BALTIMORE CA-68", northcarolina: "USS NORTH CAROLINA BB-55", iowa: "USS IOWA BB-61" };
const FLAG_CAPTAIN = { colorado: "로버트 헤일", fletcher: "에드워드 콜린스", cleveland: "해럴드 위버", baltimore: "찰스 레이놀즈", northcarolina: "프랭크 머서", iowa: "월터 핀치" };
const US_NAMES = ["조지 애버리", "레이먼드 쿡", "아서 페닝턴", "도널드 리스", "헨리 맥캔", "루이스 데일", "클래런스 홀트", "어니스트 브룩"];
const JP_NAMES = ["오카다 신이치", "무라타 겐조", "하야시 도루", "야마모리 다쓰오", "니시카와 료헤이", "사카이 마사오", "우에노 고키치", "후지모토 이사오", "다카기 로쿠로", "이시다 준페이"];
const captainOf = (spec, side = "us") => (side === "foe" ? (spec.cls === "구축함" ? "중좌" : "대좌") : spec.cls === "구축함" ? "중령" : spec.cls === "수송선" ? "소령" : "대령");
function assignCaptains() {
  let u = 0, j = 0; const us = US_NAMES.slice().sort(() => rnd() - 0.5), jp = JP_NAMES.slice().sort(() => rnd() - 0.5);
  for (const s of G.ships) s.captain = `${s.isPlayer ? FLAG_CAPTAIN[s.spec.id] : s.side === "foe" ? jp[j++ % jp.length] : us[u++ % us.length]} ${captainOf(s.spec, s.side)}`;
}
function insignia(r, size = 24) { // US Navy collar devices: oak leaf (gold/silver), eagle, stars
  if (r <= 1) return `<svg role="img" aria-label="${ECON_RANKS[r]} 계급장" width="${size}" height="${size}" viewBox="0 0 34 34"><path d="M17 3 C10 8 7 14 9 21 C11 27 15 30 17 31 C19 30 23 27 25 21 C27 14 24 8 17 3 Z" fill="${r ? "#d9dde0" : "#d4a93a"}"/><path d="M17 6 L17 30" stroke="${r ? "#8b9399" : "#8a6a1c"}" stroke-width="1.4"/></svg>`;
  if (r === 2) return `<svg role="img" aria-label="대령 계급장" width="${size}" height="${size}" viewBox="0 0 34 34"><path d="M3 12 L12 15 L17 9 L22 15 L31 12 L25 20 L20 21 L17 28 L14 21 L9 20 Z" fill="#d9dde0"/></svg>`;
  const n = r - 2, w = 34 * n;
  return `<svg role="img" aria-label="${ECON_RANKS[r]} 계급장 (별 ${n}개)" width="${Math.min(size * n, size * 2.6)}" height="${size}" viewBox="0 0 ${w} 34">${Array.from({ length: n }, (_, i) => `<path transform="translate(${i * 34} 0)" d="M17 3 L21 13 L32 13 L23 20 L27 31 L17 24 L7 31 L11 20 L2 13 L13 13 Z" fill="#e3e6e8"/>`).join("")}</svg>`;
}

// ── missions ────────────────────────────────────────────────────────────────
const MISSIONS = {
  fleet: { n: "함대 결전", d: "적 함대를 전멸시켜라. 티어 3 이상은 적 항모가 함께 나온다." },
  convoy: { n: "호송 작전", d: "수송선 3척을 약 7 km 앞 집결지까지 호위하라. 2척을 잃으면 실패. (보상 +30%)" },
  modern: { n: "현대전 · 미사일 해전", d: "이지스함 대 적 구축함. 대함미사일과 다층 방공 — 1단계 (계급·크레딧 공유)" },
  raid: { n: "진주만 방어", d: "적 공습 3파와 수상 함대로부터 정박 함선을 지켜라. 2척을 잃으면 실패. (보상 +30%)" },
};
// who you can command and whom you fight: rank (index into ECON_RANKS) needed for each
const SIDE_US = { kr: 0, us: 0, jp: 4 }, SIDE_FOE = { nk: 0, cn: 2 };
function fixNations() { const rk = myRank(); if (!(SIDE_US[natUs] <= rk)) natUs = "kr"; if (!(SIDE_FOE[natFoe] <= rk)) natFoe = "nk"; }
let natUs = "kr", natFoe = "nk"; try { const a = localStorage.getItem("steeltide:natUs"), b = localStorage.getItem("steeltide:natFoe"); if (NATIONS[a]) natUs = a; if (NATIONS[b]) natFoe = b; } catch {}
let theater = "arch"; try { const m = localStorage.getItem("steeltide:map"); if (MAPS[m]) theater = m; } catch {}
// ── commander (사령관): name + one of four portraits, kept in this browser ──
const CMDR_FACES = [
  { n: "노장 제독", skin: ["#e3b896", "#b98463", "#8a5a40"], hair: "#dcdcd6", brow: "#cfcfc8", age: 3, must: "full", glass: false, fem: false, jaw: 1.06, bg: "#2b3640" },
  { n: "강골 지휘관", skin: ["#dba882", "#a87252", "#6e452e"], hair: "#3b3029", brow: "#2a211b", age: 1, must: "trim", glass: false, fem: false, jaw: 1.1, bg: "#2f3a33" },
  { n: "냉철한 참모", skin: ["#e9c3a3", "#b98b6c", "#7d5640"], hair: "#6b6560", brow: "#4a4440", age: 2, must: null, glass: true, fem: false, jaw: 0.98, bg: "#3a3430" },
  { n: "여성 사령관", skin: ["#efcdb2", "#c39478", "#8c6450"], hair: "#2e211b", brow: "#2a1e18", age: 1, must: null, glass: false, fem: true, jaw: 0.92, bg: "#34303c" },
];
let faceN = 0;
function face(i, s = 64) {
  const f = CMDR_FACES[i] || CMDR_FACES[0], u = `fc${i}_${faceN++}`, [sk, sh, dk] = f.skin, j = f.jaw;
  const jx = 50 - 17 * j, jx2 = 50 + 17 * j;
  let o = `<svg role="img" aria-label="${f.n} 초상" width="${s}" height="${s}" viewBox="0 0 100 100"><defs>`
    + `<radialGradient id="${u}b" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${f.bg}"/><stop offset="1" stop-color="#0d1114"/></radialGradient>`
    + `<radialGradient id="${u}s" cx=".38" cy=".38" r=".75"><stop offset="0" stop-color="${sk}"/><stop offset=".7" stop-color="${sh}"/><stop offset="1" stop-color="${dk}"/></radialGradient>`
    + `<linearGradient id="${u}u" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c2638"/><stop offset="1" stop-color="#0b0f18"/></linearGradient>`
    + `<linearGradient id="${u}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9ccc8"/></linearGradient>`
    + `</defs><rect width="100" height="100" rx="6" fill="url(#${u}b)"/>`;
  // shoulders: service dress blue, white shirt, black tie, ribbons
  o += `<path d="M6 100 C8 82 20 75 34 72 L50 80 L66 72 C80 75 92 82 94 100Z" fill="url(#${u}u)"/>`
    + `<path d="M40 70 L50 86 L60 70 L56 68 L50 76 L44 68Z" fill="#f1f1ee"/><path d="M48 76 L50 74 L52 76 L51.5 92 L50 95 L48.5 92Z" fill="#111"/>`
    + `<path d="M34 72 L46 90 L44 100 M66 72 L54 90 L56 100" stroke="#05080d" stroke-width="1.2" fill="none"/>`
    + `<g transform="translate(60 84)"><rect width="5" height="2.6" fill="#b03a2e"/><rect x="5" width="5" height="2.6" fill="#2a5aa0"/><rect x="10" width="5" height="2.6" fill="#d8b23a"/><rect y="2.8" width="5" height="2.6" fill="#3b7a3e"/><rect x="5" y="2.8" width="5" height="2.6" fill="#c9c9c9"/><rect x="10" y="2.8" width="5" height="2.6" fill="#8a1f1f"/></g>`
    + `<rect x="10" y="88" width="18" height="2.2" fill="#c9a23a"/><rect x="10" y="91.5" width="18" height="2.2" fill="#c9a23a"/>`;
  // long hair behind (female)
  if (f.fem) o += `<path d="M29 34 C25 48 27 62 32 68 L40 66 C35 58 34 46 35 36Z M71 34 C75 48 73 62 68 68 L60 66 C65 58 66 46 65 36Z" fill="${f.hair}"/>`;
  // neck + ears + head
  o += `<path d="M41 58 L41 72 Q50 78 59 72 L59 58Z" fill="${sh}"/><path d="M41 66 Q50 72 59 66 L59 70 Q50 75 41 70Z" fill="${dk}" opacity=".45"/>`
    + `<ellipse cx="${jx - 1}" cy="45" rx="3.6" ry="6" fill="${sh}"/><ellipse cx="${jx2 + 1}" cy="45" rx="3.6" ry="6" fill="${sh}"/>`
    + `<path d="M${jx} 34 C${jx} 24 40 19 50 19 C60 19 ${jx2} 24 ${jx2} 34 L${jx2} 46 C${jx2} 56 ${50 + 9 * j} 64 50 66 C${50 - 9 * j} 64 ${jx} 56 ${jx} 46Z" fill="url(#${u}s)"/>`;
  // side hair / temples
  o += `<path d="M${jx} 30 L${jx + 3} 30 L${jx + 2.5} 44 L${jx} 40Z M${jx2} 30 L${jx2 - 3} 30 L${jx2 - 2.5} 44 L${jx2} 40Z" fill="${f.hair}"/>`;
  // brow ridge shadow, eyes, brows
  const ey = 41;
  o += `<path d="M38 ${ey - 3} Q43 ${ey - 5.5} 47 ${ey - 3} M53 ${ey - 3} Q57 ${ey - 5.5} 62 ${ey - 3}" stroke="${dk}" stroke-width="2.6" opacity=".35" fill="none"/>`;
  for (const x of [42.5, 57.5]) o += `<path d="M${x - 4.4} ${ey} Q${x} ${ey - 2.8} ${x + 4.4} ${ey} Q${x} ${ey + 2} ${x - 4.4} ${ey}Z" fill="#ece6de"/><circle cx="${x}" cy="${ey - 0.2}" r="1.9" fill="#3b2d24"/><circle cx="${x}" cy="${ey - 0.2}" r="0.9" fill="#0d0a08"/><path d="M${x - 4.6} ${ey - 0.2} Q${x} ${ey - 3.4} ${x + 4.6} ${ey - 0.2}" stroke="#2a1d16" stroke-width="1.1" fill="none"/>`
    + `<path d="M${x - 3.6} ${ey + 2.4} Q${x} ${ey + 3.6} ${x + 3.6} ${ey + 2.4}" stroke="${dk}" stroke-width=".7" opacity=".6" fill="none"/>`;
  o += `<path d="M36.5 ${ey - 5.2} L47.5 ${ey - 4.6} L47.5 ${ey - 3.2} L37 ${ey - 3.4}Z M52.5 ${ey - 4.6} L63.5 ${ey - 5.2} L63 ${ey - 3.4} L52.5 ${ey - 3.2}Z" fill="${f.brow}"/>`;
  // nose
  o += `<path d="M50 ${ey + 1} L48 ${ey + 11} Q50 ${ey + 13} 53 ${ey + 11.5}" stroke="${dk}" stroke-width="1.1" fill="none" opacity=".75"/><path d="M46.5 ${ey + 12.2} Q48 ${ey + 13.6} 49.5 ${ey + 12.6} M50.5 ${ey + 12.6} Q52 ${ey + 13.6} 53.5 ${ey + 12.2}" stroke="${dk}" stroke-width=".9" fill="none"/>`
    + `<path d="M51.5 ${ey + 2} L52.6 ${ey + 10}" stroke="${sk}" stroke-width="1.2" opacity=".7"/>`;
  // age lines
  if (f.age >= 2) o += `<path d="M44 ${ey + 10} Q41 ${ey + 15} 42 ${ey + 19} M56 ${ey + 10} Q59 ${ey + 15} 58 ${ey + 19}" stroke="${dk}" stroke-width=".9" fill="none" opacity=".7"/><path d="M41 28 Q50 26.5 59 28 M42 31 Q50 29.8 58 31" stroke="${dk}" stroke-width=".7" fill="none" opacity=".5"/>`;
  if (f.age >= 3) o += `<path d="M35 ${ey + 1} L33 ${ey + 3} M65 ${ey + 1} L67 ${ey + 3} M40 ${ey + 5} Q42.5 ${ey + 6.5} 45 ${ey + 5} M55 ${ey + 5} Q57.5 ${ey + 6.5} 60 ${ey + 5}" stroke="${dk}" stroke-width=".7" fill="none" opacity=".7"/>`;
  // mouth: firm, unsmiling
  const my = ey + 18;
  o += `<path d="M44.5 ${my} Q50 ${my + 0.6} 55.5 ${my}" stroke="#5a3226" stroke-width="1.4" fill="none"/><path d="M46 ${my + 2.2} Q50 ${my + 3.6} 54 ${my + 2.2}" stroke="${dk}" stroke-width="1" opacity=".55" fill="none"/>`;
  if (f.fem) o += `<path d="M45 ${my} Q50 ${my - 1.6} 55 ${my} Q50 ${my + 2.4} 45 ${my}Z" fill="#9c4a44" opacity=".75"/>`;
  if (f.must === "full") o += `<path d="M42 ${my - 2} Q46 ${my - 5.5} 50 ${my - 3.6} Q54 ${my - 5.5} 58 ${my - 2} Q54 ${my - 0.4} 50 ${my - 1.6} Q46 ${my - 0.4} 42 ${my - 2}Z" fill="${f.hair}"/>`;
  if (f.must === "trim") o += `<path d="M44.5 ${my - 2.2} Q50 ${my - 4.4} 55.5 ${my - 2.2} L55 ${my - 1} Q50 ${my - 2.4} 45 ${my - 1}Z" fill="${f.hair}"/><path d="M${jx + 3} 50 Q50 ${my + 9} ${jx2 - 3} 50" stroke="${f.hair}" stroke-width="1.2" opacity=".25" fill="none"/>`;
  if (f.glass) o += `<rect x="37" y="${ey - 3.6}" width="11" height="7.2" rx="2.4" fill="#ffffff" fill-opacity=".06" stroke="#20201e" stroke-width="1.1"/><rect x="52" y="${ey - 3.6}" width="11" height="7.2" rx="2.4" fill="#ffffff" fill-opacity=".06" stroke="#20201e" stroke-width="1.1"/><path d="M48 ${ey - 1} L52 ${ey - 1} M37 ${ey - 1} L${jx} ${ey - 2} M63 ${ey - 1} L${jx2} ${ey - 2}" stroke="#20201e" stroke-width="1"/>`;
  // combination cap: white crown, black band, gold chin strap, visor with gold oak leaves, badge
  o += `<path d="M24 25 C26 11 74 11 76 25 L74 28 L26 28Z" fill="url(#${u}c)"/><rect x="${jx - 1}" y="26" width="${(jx2 - jx) + 2}" height="6" fill="#121417"/>`
    + `<path d="M${jx - 1} 32 L${jx2 + 1} 32 L${jx2 - 3} 37 Q50 39 ${jx + 3} 37Z" fill="#07090b"/><path d="M${jx + 1} 35.5 Q50 37.8 ${jx2 - 1} 35.5" stroke="#c9a23a" stroke-width="1.3" fill="none"/>`
    + `<path d="M${jx - 1} 31.5 L${jx2 + 1} 31.5" stroke="#c9a23a" stroke-width="1.1"/>`
    + `<path d="M50 17.5 l2.2 4.2 l4.4 .4 l-3.4 2.8 l1.2 4.4 l-4.4-2.4 l-4.4 2.4 l1.2-4.4 l-3.4-2.8 l4.4-.4Z" fill="#d6b04a"/><path d="M43 26 Q50 23.5 57 26 L57 28 Q50 26 43 28Z" fill="#d6b04a" opacity=".85"/>`;
  return o + `</svg>`;
}
let cmdr = { name: "", face: 0 }; try { const c = JSON.parse(localStorage.getItem("steeltide:cmdr") || "null"); if (c && c.name) cmdr = { name: String(c.name).slice(0, 12), face: clamp(c.face | 0, 0, 3) }; } catch {}
const cmdrSet = !!cmdr.name; if (!cmdr.name) cmdr.name = "무명";
let cmdrDraft = cmdr.face;
function renderCmdr() {
  $("#cmdrFaces").innerHTML = CMDR_FACES.map((f, i) => `<button class="fc${i === cmdrDraft ? " on" : ""}" data-face="${i}">${face(i, 84)}<small>${f.n}</small></button>`).join("");
}
function openCmdr() { cmdrDraft = cmdr.face; $("#cmdrInput").value = cmdrSet || cmdr.name !== "무명" ? cmdr.name : ""; renderCmdr(); $("#cmdrErr").textContent = ""; $("#cmdrM").style.display = "grid"; setTimeout(() => $("#cmdrInput").focus(), 30); }
function saveCmdr() {
  const n = $("#cmdrInput").value.trim(); if (!n) { $("#cmdrErr").textContent = "이름을 입력하세요"; return; } if (n.length > 12) { $("#cmdrErr").textContent = "12자 이내로 입력하세요"; return; }
  cmdr = { name: n, face: cmdrDraft }; try { localStorage.setItem("steeltide:cmdr", JSON.stringify(cmdr)); } catch {}
  $("#cmdrM").style.display = "none"; sfx.click(); refreshMenus();
}
let mission = "fleet"; try { const m = localStorage.getItem("steeltide:mission"); if (MISSIONS[m]) mission = m; } catch {}

// ── battle setup ────────────────────────────────────────────────────────────
let endT = 0, show = null, showId = null, ap = mkBrain(9);
const FLEETS = { 1: [1, 1], 2: [2, 1], 3: [3, 2, 1], 4: [4, 2, 1], 5: [5, 4, 2] };
const STATIONS = [[0, 0], [650, 520], [650, -520], [1300, 0]];
const ALLY_POOL = ["fletcher", "cleveland", "fletcher", "baltimore"], ALLY_ST = [[450, -420], [700, 480], [-650, 0], [1200, -480]];
const placeAt = (lx, lz, h, back, side) => [lx - Math.cos(h) * back + Math.sin(h) * side, lz - Math.sin(h) * back - Math.cos(h) * side];
function disposeAll() {
  for (const s of G.ships) s.dispose(); G.ships = []; G.player = G.enemy = G.carrier = G.foeCarrier = null; G.enemies = []; G.allies = []; G.convoy = []; G.events = []; G.cts.clear();
  clearMissiles(); G.modern = false; if (typeof md !== "undefined") md.q.length = 0; clearTorps(); show = null; showId = null; clearShells(); clearAir(); clearFx(); for (const k of markers) { k.t = 0; k.m.visible = false; } lock = null;
}
function showcase(id) {
  if (showId === id && show) return;
  disposeAll(); show = new Ship(SHIPS[id], 0, 0, 0, "us", profile.upg[id] || {}); show.tele = 3; show.speed = show.vmax * 0.5; G.ships = [show]; G.player = show; showId = id;
}
const uniq = (list) => { for (const s of list) { const same = list.filter((o) => o.spec === s.spec); if (same.length > 1) s.name = `${s.spec.short} ${same.indexOf(s) + 1}`; } };
/** An enemy squadron: first ship leads (brain), the rest keep station on it; optional carrier astern. */
function foeGroup(tiers, cx, cz, h, withCarrier, free = false) {
  const out = tiers.map((t, i) => { const [x, z] = placeAt(cx, cz, h, ...STATIONS[i]); const s = new Ship(ENEMIES[t], x, z, h, "foe"); s.station = STATIONS[i]; s.br = mkBrain(18 + i * 5); s.free = free && i === 0; return s; });
  if (withCarrier) { const [x, z] = placeAt(cx, cz, h, 3400, 0); const c = new Ship(FOE_CARRIER, x, z, h, "foe"); c.br = mkBrain(30); c.isCarrier = true; out.push(c); G.foeCarrier = c; G.foeSquad = 8 + (SHIPS[profile.ship].tier >= 4 ? 1 : 0); G.foePlaneCD = 35; }
  for (const s of out) s.group = out;
  G.enemies.push(...out); G.ships.push(...out); return out;
}
/** Second front: an allied AI task unit and an enemy AI unit that go for each other (they still shoot anything in reach). */
function aiFleets(tier, b) {
  const sd = b >= 0 ? -1 : 1, ax = -800, az = sd * 4600, keys = tier >= 3 ? ["cleveland", "fletcher", "fletcher"] : ["fletcher", "fletcher"];
  const ea = sd * 1.15, ex = Math.cos(ea) * 13500, ez = Math.sin(ea) * 13500, toE = Math.atan2(ez - az, ex - ax);
  const unit = keys.map((k, i) => { const s = new Ship(SHIPS[k], ax - Math.cos(toE) * i * 650, az - Math.sin(toE) * i * 650, toE, "us"); s.aiFleet = true; s.br = mkBrain(16 + i * 4); s.name = `${SHIPS[k].short} (제2전대)`; return s; });
  G.allies.push(...unit); G.ships.push(...unit);
  const eg = foeGroup(tier >= 3 ? [2, 1, 1] : [1, 1], ex, ez, wrap(toE + PI), false, true); for (const e of eg) e.aiFleet = true;
}
function newBattle() {
  disposeAll(); logs.length = 0; renderLog(); const mapId = mission === "raid" ? "pearl" : theater; makeIslands(mapId);
  const id = profile.ship, spec = SHIPS[id], rk = myRank(), tier = spec.tier;
  G.mission = mission; G.result = null; G.goal = null; G.foeLaunched = false; G.events = []; G.foeSquad = 0; G.foePlaneCD = 0;
  const modern = mission === "modern"; G.modern = modern; modern && (MSL.cam = null);
  const pSpec = modern ? MODERN[NATIONS[natUs].ships[0]] : spec;
  const P = new Ship(pSpec, 0, 0, 0, "us", modern ? {} : profile.upg[id]); P.isPlayer = true; P.name = pSpec.short; P.nav = []; P.lv = 3; P.lastLv = 3; if (modern) { P.nation = natUs; mArm(P); }
  const anchored = mission === "raid";
  const C = modern ? null : new Ship(CARRIER, anchored ? -2600 : -1700, anchored ? 300 : -900, 0, "us"); if (C) { C.speed = anchored ? 0 : C.vmax * 0.6; C.name = "렉싱턴"; }
  const allies = modern ? [[-700, 900], ...(rk >= 3 ? [[-700, -900]] : [])].map((st, i) => { const [x, z] = placeAt(0, 0, 0, ...st); const s = new Ship(MODERN[NATIONS[natUs].ships[1]], x, z, 0, "us"); s.station = st; s.br = mkBrain(14 + i * 3); s.name = s.spec.short + (i ? " 2" : ""); s.nation = natUs; mArm(s); return s; }) // a second escort at higher rank, like the enemy's
    : ALLY_POOL.slice(0, escortsFor(rk)).map((k, i) => { const st = ALLY_ST[i]; const [x, z] = placeAt(0, 0, 0, ...st); const s = new Ship(SHIPS[k], x, z, 0, "us"); s.station = st; s.br = mkBrain(14 + i * 4); s.name = SHIPS[k].short; return s; });
  uniq(allies);
  G.ships = [P, ...allies, ...(C ? [C] : [])]; G.player = P; G.allies = allies; G.carrier = C;
  if (modern) {
    let b = (25 + rnd() * 30) * DEG * (rnd() < 0.5 ? -1 : 1); const r = 16000 + rnd() * 2000;
    for (let k = 0; k < 16 && landAt(Math.cos(b) * r, Math.sin(b) * r, 4500); k++) b = wrap(b + 0.4); // open water for the enemy group
    const eh = wrap(PI + b + (rnd() - 0.5) * 0.8), N = NATIONS[natFoe];
    fixNations();
    const keys = natFoe === "cn" && rk < 4 ? [N.ships[1], N.ships[1]] : [N.ships[0], N.ships[1], ...(rk >= 3 ? [N.ships[1]] : [])]; // the enemy grows with your rank
    const out = keys.map((k, i) => { const [x, z] = placeAt(Math.cos(b) * r, Math.sin(b) * r, eh, ...STATIONS[i]); const s = new Ship(MODERN[k], x, z, eh, "foe"); s.prefRange = [5000, 8000]; s.station = STATIONS[i]; s.br = mkBrain(16 + i * 5); s.nation = natFoe; mArm(s); return s; });
    for (const s of out) s.group = out;
    const fcv = rk >= 4 ? N.cv : null; if (fcv) { const [x, z] = placeAt(Math.cos(b) * r, Math.sin(b) * r, eh, 3500, 0); const c = new Ship(MODERN[fcv], x, z, eh, "foe"); c.isCarrier = true; c.br = mkBrain(30); c.nation = natFoe; c.group = out; mArm(c); out.push(c); }
    G.enemies.push(...out); G.ships.push(...out);
    const ucv = NATIONS[natUs].cv; if (ucv) { const st = [3200, -900], [x, z] = placeAt(0, 0, 0, ...st); const c = new Ship(MODERN[ucv], x, z, 0, "us"); c.station = st; c.br = mkBrain(30); c.name = c.spec.short; c.nation = natUs; mArm(c); G.allies.push(c); G.ships.push(c); }
    G.bases = []; for (const [side, nat, x, z] of [["us", natUs, -26000, 0], ["foe", natFoe, Math.cos(b) * (r + 22000), Math.sin(b) * (r + 22000)]]) if (NATIONS[nat].base) G.bases.push({ side, alive: true, isBase: true, pos: new THREE.Vector3(x, 0, z), heading: 0, spec: { fb: 0 }, cv: NATIONS[nat].base, name: "지상 비행장" });
    for (const s of G.ships) if (s.spec.jets) s.cv = s.spec.jets; for (const s of [...G.ships, ...G.bases]) if (s.cv) { s.jetsReady = s.cv.n; s.rearm = []; }
  } else if (mission === "convoy") {
    G.convoy = [0, 1, 2].map((i) => { const s = new Ship(TRANSPORT, -500 - i * 520, -1100, 0, "us"); s.name = `수송선 ${i + 1}`; s.br = mkBrain(20); s.speed = s.vmax * 0.8; return s; });
    G.goal = { x: 6500, z: -1100 }; G.ships.push(...G.convoy);
    const b = (35 + rnd() * 25) * DEG * (rnd() < 0.5 ? -1 : 1), r = 10400, h = wrap(PI + b + (rnd() - 0.5) * 0.6);
    foeGroup(FLEETS[tier], 4000 + Math.cos(b) * r * 0.5, Math.sin(b) * r * 0.85, h, true); aiFleets(tier, b);
    G.events.push({ t: 110, fn: () => { const s = -Math.sign(G.enemies[0].pos.z || 1), cz = G.player.pos.z + s * 7400, cx = G.player.pos.x + 4000; foeGroup([1, 1], cx, cz, Math.atan2(G.player.pos.z - cz, G.player.pos.x - cx), false, true); log("측면에서 적 구축함 2척 접근!", "bad"); G.radio("torp_warn"); } });
  } else if (mission === "raid") {
    addIsland(400, 3400, 2200, 320);
    const md = new Ship(SHIPS.colorado, 900, 1200, 0, "us"); md.name = "메릴랜드 (정박)"; md.speed = 0;
    G.convoy = [md, ...[0, 1].map((i) => { const s = new Ship(TRANSPORT, -900 + i * 800, 1500, 0.2, "us"); s.name = `수송선 ${i + 1} (정박)`; s.speed = 0; return s; })];
    for (const s of G.convoy) { s.anchored = true; s.br = mkBrain(10); } G.ships.push(...G.convoy);
    P.lv = 0; for (const a of allies) a.speed = 0;
    const from = -PI / 2 + (rnd() - 0.5) * 1.2, wave = (n) => () => { const a = from + (rnd() - 0.5) * 0.5; spawnRaid(Math.cos(a) * 16000, Math.sin(a) * 16000, a + PI, n); log(`적 공습 ${n}기 접근! 대공 전투 배치`, "bad"); G.radio("battle"); sfx.alarm(); };
    G.events.push({ t: 6, fn: wave(8) }, { t: 95, fn: wave(8 + (tier >= 3 ? 1 : 0)) },
      { t: 190, fn: () => { wave(9)(); const a = from + 0.9; foeGroup([Math.min(tier, 2), 1, 1], Math.cos(a) * 9400, Math.sin(a) * 9400, a + PI, false, true); log("적 수상 함대 접근!", "bad"); } });
  } else {
    const fleet = FLEETS[tier], E = ENEMIES[fleet[0]];
    const b = (28 + rnd() * 30) * DEG * (rnd() < 0.5 ? -1 : 1), r = E.range[0] + rnd() * (E.range[1] - E.range[0]) + 3500, eh = wrap(PI + b + (rnd() - 0.5) * 1.2);
    foeGroup(fleet, Math.cos(b) * r * 0.67, Math.sin(b) * r * 0.67, eh, tier >= 3); aiFleets(tier, b);
    if (tier < 3) G.events.push({ t: 75, fn: () => { const a = b + (rnd() - 0.5) * 0.6; spawnRaid(Math.cos(a) * 15000, Math.sin(a) * 15000, a + PI, 8); log("적 육상기 편대 8기 접근! 대공 전투 배치", "bad"); G.radio("battle"); sfx.alarm(); } });
  }
  for (const s of G.ships) { let k = 0; const L = Math.hypot(s.pos.x, s.pos.z) || 1; while (landAt(s.pos.x, s.pos.z, 1200) && k++ < 80) { s.pos.x -= (s.pos.x / L) * 500; s.pos.z -= (s.pos.z / L) * 500; } } // spawned on land: slide toward the open battle area
  uniq(G.enemies.filter((e) => !e.isCarrier)); assignCaptains(); if (modern) for (const s of G.ships) if (s.nation) { const N = NATIONS[s.nation]; s.captain = `${N.names[(rnd() * N.names.length) | 0]} ${N.rk}`; }
  G.squad = fightersFor(rk); G.refit = []; G.planeCD = 0; G.stats = { shots: 0, hits: 0, bullets: 0, bombs: 0, dealt: 0, planes: 0, torpHits: 0 };
  capReset(); aa.on = false; aa.shots = 0; aa.heat = 0; gunner.kills = 0; autoFire = false; cinema = false; document.body.classList.remove("cinema"); weapon = "gun"; hullWarned = false; torpThreat = 0; paused = false; fireHold = 0; fc.tgt = null; corrR = corrB = 0; ribbons.length = 0; rep.cd = rep.act = 0; rep.n = 3; G.battleT = 0; endT = 0;
  P.aimB = 0; P.aimR = Math.min(P.tb.max * 0.6, 12000); torpB = PI / 2;
  cam.yaw = 0; cam.pitch = 0.95; cam.dist = 1300; cam.map = false; cam.free = false; cam.tgt = null; cam.focus.copy(P.pos); hintT = 22;
  const first = G.enemies[0];
  log(`전장: ${MAPS[mapId].n} · ${ECON_RANKS[myRank()]} ${cmdr.name} 사령관 지휘 개시`);
  log(mission === "raid" ? "진주만 — 정박 중. 적 공습 예상!" : mission === "convoy" ? `호송 작전 개시 — 집결지까지 ${fmt(G.goal.x)} m` : `${first.spec.name} 외 ${G.enemies.length - 1}척 접근 중. 전투 배치!`);
  G.radio("battle");
}
G.onSunk = (ship) => {
  if (ship === G.carrier) { log("렉싱턴 침몰! 더 이상 출격할 수 없습니다", "bad"); G.radio("ally_sunk"); return; }
  if (ship.side === "us" && !ship.isPlayer) { log(`${ship.name} 침몰!`, "bad"); G.radio("ally_sunk"); return; }
  if (ship.isPlayer) { log(`${ship.spec.short} 침몰 중… 총원 퇴함!`, "bad"); G.radio("abandon"); return; }
  G.ribbon(ship.isCarrier ? "항모 격침" : "격침"); const left = G.enemies.filter((e) => e.alive).length;
  log(left ? `${ship.name} 격침! 남은 적 ${left}척` : "적 함대 전멸!", "hit"); G.radio(left ? "sunk" : "fleet");
};

// ── radio ───────────────────────────────────────────────────────────────────
const RADIO_TXT = { battle: "Battle stations! — 전투 배치", sunk: "Enemy sunk! — 적함 격침", torp_warn: "Torpedoes! — 어뢰 접근", ally_sunk: "Ship lost! — 아군 침몰", launch: "Fighters up! — 전투기 출격", return: "Fighters home! — 전투기 귀환", fire: "Fire! — 화재 발생", flood: "Flooding! — 침수", hull: "Hull critical! — 선체 손상 심각", torp_launch: "Torps away! — 어뢰 발사", fleet: "Fleet destroyed! — 적 함대 전멸", abandon: "Abandon ship! — 총원 퇴함" };
const radioLast = {}; let radioSub = null;
G.radio = (k) => { if (G.time - (radioLast[k] ?? -99) < 6) return; radioLast[k] = G.time; radio(k); radioSub = { text: RADIO_TXT[k], t: 3.2 }; };

// ── computer captains, fog of war, mission rules ────────────────────────────
const nearestOf = (S, list) => { let b = null, d = Infinity; for (const o of list) if (o && o.alive) { const dd = o.pos.distanceToSquared(S.pos); if (dd < d) { d = dd; b = o; } } return b; };
const conceal = (s) => (G.modern ? (s.radarOn === false ? SR.surf : SR.esm) : 5200 + s.spec.L * 24); // modern: how far the enemy can pick you up
G.cts = new Map(); // 현대전 contacts on the enemy: { q 0..1, x, z (estimate), err m, src, ox, oz (ESM station) }
const HELO = { us: "MH-60R", kr: "AW159 와일드캣", jp: "SH-60K", cn: "Z-9C", nk: "무인정찰기" };
/** 현대전 2단계: radar, ESM, helicopter and eyes build contacts of differing quality, both ways. */
function sensorStep(dt) {
  const us = ours().filter((s) => s.spec.modern), P = G.player, myH = [...MSL.helos, ...MSL.jets].filter((h) => h.alive && h.side === "us"), foeH = [...MSL.helos, ...MSL.jets].filter((h) => h.alive && h.side === "foe");
  for (const e of G.enemies) {
    if (!e.alive) { G.cts.delete(e); e.root.visible = true; continue; }
    let src = G.auto ? "전장 감시" : e.revealT > 0 ? "포연" : null, ct = G.cts.get(e);
    if (!src) for (const s of us) { const d = d2(s.pos, e.pos); if (d < SR.vis) { src = "육안"; break; } if (s.radarOn !== false && d < SR.surf) src = "레이더"; }
    if (!src) for (const h of myH) if (d2(h.pos, e.pos) < SR.helo) { src = h.name; break; }
    const had = ct && ct.q >= 0.6 && ct.src !== "추정";
    if (src) { if (!had && G.battleT > 1) { log(`적 탐지 (${src}): ${e.name} · ${(d2(P.pos, e.pos) / 1000).toFixed(1)} km`, "hit"); sfx.click(); } ct = { q: 1, x: e.pos.x, z: e.pos.z, err: 80, src, h: e.heading }; }
    else if (e.radarOn !== false && us.some((s) => d2(s.pos, e.pos) < SR.esm)) { // its radar gives it away: true bearing, guessed range
      const o = nearestOf(e, us), d = d2(o.pos, e.pos), b = Math.atan2(e.pos.z - o.pos.z, e.pos.x - o.pos.x);
      if (!ct || ct.src !== "ESM") { if (!ct && G.battleT > 1) log(`ESM 탐지: ${e.name}의 레이더 전파 — 방위 ${brg(b)}, 거리는 추정`, "hit"); ct = { rk: 1 + gauss() * 0.15, bk: gauss() * 0.01 }; }
      Object.assign(ct, { q: 0.35, src: "ESM", x: o.pos.x + Math.cos(b + ct.bk) * d * ct.rk, z: o.pos.z + Math.sin(b + ct.bk) * d * ct.rk, err: d * 0.15, ox: o.pos.x, oz: o.pos.z });
    } else if (ct) { if (ct.src !== "추정") ct = { ...ct, src: "추정", q: Math.min(ct.q, 0.55) }; ct.q -= dt / 120; if (ct.q <= 0.05) ct = null; } // lost: keep the last estimate for a while
    if (ct) G.cts.set(e, ct); else G.cts.delete(e);
    const v = !!ct && ct.q >= 0.6; e.root.visible = v; if (v) e.last = { x: e.pos.x, z: e.pos.z, h: e.heading, t: G.time };
  }
  for (const s of ours()) {
    let v = s.revealT > 0, err = 0;
    if (!v) for (const e of G.enemies) { if (!e.alive) continue; const d = d2(s.pos, e.pos); if (d < SR.vis || (e.radarOn !== false && d < SR.surf)) { v = true; break; } }
    if (!v) for (const h of foeH) if (d2(h.pos, s.pos) < SR.helo) { v = true; break; }
    if (!v && s.radarOn !== false && G.enemies.some((e) => e.alive && d2(e.pos, s.pos) < SR.esm)) { v = true; err = 0.15; }
    s.seenByFoe = v; s.foeErr = err;
  }
}
const goodCt = (e) => { const c = G.cts.get(e); return e && e.alive && c && c.q >= 0.3 ? c : null; };
function bestContact() { const P = G.player; return [...G.cts.keys()].filter(goodCt).sort((a, b) => G.cts.get(b).q - G.cts.get(a).q || d2(P.pos, a.pos) - d2(P.pos, b.pos))[0] || null; }
/** NTDS-style symbol: friend circle, hostile diamond (air tracks: upper half only), dashed = estimated. */
function ntds(ctx, x, y, s, hostile, col, dashed, air) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; if (dashed) ctx.setLineDash([3, 3]); ctx.beginPath();
  if (hostile) { ctx.moveTo(x - s, y); ctx.lineTo(x, y - s); ctx.lineTo(x + s, y); if (!air) { ctx.lineTo(x, y + s); ctx.closePath(); } }
  else if (air) ctx.arc(x, y, s, PI, TAU); else ctx.arc(x, y, s, 0, TAU);
  ctx.stroke(); ctx.restore();
}
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const ours = () => G.ships.filter((s) => s.side === "us" && s.alive);
const seenFoes = () => G.enemies.filter((e) => e.alive && e.root.visible);
function fogStep(dt) {
  const us = ours(), usPl = air.planes.filter((p) => p.side === "us" && p.alive), foePl = air.planes.filter((p) => p.side === "foe" && p.alive);
  for (const s of G.ships) s.revealT = Math.max(0, (s.revealT || 0) - dt);
  if (G.modern) { sensorStep(dt); return; }
  for (const e of G.enemies) {
    let v = G.auto || !e.alive || e.revealT > 0;
    if (!v) for (const s of us) if (d2(s.pos, e.pos) < conceal(e)) { v = true; break; }
    if (!v) for (const p of usPl) if (d2(p.pos, e.pos) < 5000) { v = true; break; }
    if (v && !e.root.visible && e.alive && G.battleT > 1) { log(`적 발견: ${e.name} (${(d2(G.player.pos, e.pos) / 1000).toFixed(1)} km)`, "hit"); sfx.click(); }
    e.root.visible = v; if (v) e.last = { x: e.pos.x, z: e.pos.z, h: e.heading, t: G.time };
  }
  const foes = G.enemies.filter((e) => e.alive);
  for (const s of us) {
    let v = s.revealT > 0;
    if (!v) for (const e of foes) if (d2(s.pos, e.pos) < conceal(s)) { v = true; break; }
    if (!v) for (const p of foePl) if (d2(p.pos, s.pos) < 5000) { v = true; break; }
    s.seenByFoe = v;
  }
}
/** Enemy target choice: spread fire over our ships (fewer guns on a ship others already shoot at), the flagship a little less wanted; sticky for 25-40 s. */
function pickFoe(e, list) {
  if (e.tgt && e.tgt.alive && list.includes(e.tgt) && G.time < e.tgtT) return e.tgt;
  let best = null, bs = Infinity;
  for (const s of list) { const n = G.enemies.filter((o) => o !== e && o.alive && o.tgt === s).length, sc = d2(e.pos, s.pos) + n * 3500 + (s.isPlayer ? 4000 : 0); if (sc < bs) { bs = sc; best = s; } }
  e.tgt = best; e.tgtT = G.time + 25 + rnd() * 15; return best;
}
/** A selected ally's guns follow my locked target (its own lead) or my gun line, and fire on my order (or with AUTO). */
function gunControl(a, dt) {
  const T = lock && lock.alive ? lock : null, p = T ? leadPoint(a, T) : G.player.aimPoint();
  a.aimB = Math.atan2(p.z - a.pos.z, p.x - a.pos.x); a.aimR = clamp(Math.hypot(p.x - a.pos.x, p.z - a.pos.z), a.tb.min, a.tb.max);
  if (autoFire && a.turrets.some((t) => t.alive && t.reload <= 0 && t.onTarget)) a.fire();
  if (a.holdT > 0) { a.holdT -= dt; if (a.fire()) a.holdT = Math.min(a.holdT, 0.4); }
}
function fleetAI(dt) {
  const us = ours(), seen = us.filter((s) => s.seenByFoe), P = G.player;
  for (const e of G.enemies) {
    if (!e.alive) { e.rudderCmd = 0; continue; }
    const flag = e.group.find((o) => o.alive && !o.isCarrier);
    const conv = G.convoy.filter((c) => c.alive && c.seenByFoe);
    let t = (G.mission === "convoy" && conv.length ? nearestOf(e, conv) : null) || pickFoe(e, seen);
    if (e.aiFleet) t = nearestOf(e, us.filter((s) => s.aiFleet && s.seenByFoe)) || t;
    e.br.blind = !t; if (!t) t = nearestOf(e, us) || P;
    if (e.isCarrier) { if (flag) escort(e, flag, dt, 3400, 0); else brain(e, t, e.br, dt); continue; }
    if (e === flag || e.free || !flag) brain(e, t, e.br, dt); else { brain(e, t, e.br, dt, false); escort(e, flag, dt, e.station[0], e.station[1] || 520); }
  }
  const vis = seenFoes();
  for (const a of G.allies) {
    if (!a.alive) { a.rudderCmd = 0; continue; }
    const t = nearestOf(a, vis); if (sel.includes(a) && P.alive && !G.auto) gunControl(a, dt); else if (t) { a.br.blind = false; brain(a, t, a.br, dt, false); }
    if (a.order) { const dx = a.order.x - a.pos.x, dz = a.order.z - a.pos.z, dd = Math.hypot(dx, dz); if (dd > 260) { a.rudderCmd = clamp(wrap(Math.atan2(dz, dx) - a.heading) * 2.2, -1, 1); a.tele = dd > 1200 ? 5 : 3; } else { a.tele = 1; a.rudderCmd = 0; } continue; }
    if (a.aiFleet) { const g = nearestOf(a, vis.filter((e) => e.aiFleet)) || t || nearestOf(a, G.enemies.filter((e) => e.aiFleet)) || nearestOf(a, G.enemies); a.br.blind = !t; if (g) brain(a, g, a.br, dt); continue; }
    if (G.mission === "raid" && G.battleT < 185) { a.tele = 1; a.rudderCmd = 0; }
    else if (P.alive) escort(a, P, dt, a.station[0], a.station[1]); else if (t) brain(a, t, a.br, dt);
  }
  for (const c of G.convoy) {
    if (!c.alive) { c.rudderCmd = 0; continue; }
    const t = nearestOf(c, vis); if (t) { c.br.blind = false; brain(c, t, c.br, dt, false); }
    if (c.anchored) { c.tele = 1; c.rudderCmd = 0; continue; }
    if (c.arrived) { c.tele = 1; c.rudderCmd = 0; continue; }
    const w = Math.atan2(G.goal.z - c.pos.z, G.goal.x - c.pos.x); c.rudderCmd = clamp(wrap(w - c.heading) * 2.2, -1, 1); c.tele = 4;
    if (d2(c.pos, G.goal) < 700) { c.arrived = true; log(`${c.name} 집결지 도착`, "hit"); sfx.bell(); }
  }
  const C = G.carrier;
  if (C && C.alive) { if (G.mission === "raid") { C.tele = 1; C.rudderCmd = 0; } else if (P.alive) escort(C, P, dt); }
  // automatic battle: the carrier keeps fighters in the air
  if (G.auto && C && C.alive && G.squad > 0 && G.planeCD <= 0 && (vis.length || air.planes.some((p) => p.side === "foe" && p.alive)) && air.planes.filter((p) => p.side === "us" && p.alive).length < 6) launchPlane(true, "us", "auto");
  // enemy carrier strikes once our ships are within reach
  const F = G.foeCarrier;
  if (F && F.alive && G.foeSquad > 0 && G.foePlaneCD <= 0 && air.planes.filter((p) => p.side === "foe" && p.alive).length < 9) {
    const n = nearestOf(F, us); if (n && d2(n.pos, F.pos) < 24000 && !launchPlane(true, "foe")) { if (!G.foeLaunched) { G.foeLaunched = true; log("적 항모에서 전투기 출격! 공중전 대비", "bad"); } }
  }
}
function events() { for (let i = G.events.length - 1; i >= 0; i--) if (G.battleT >= G.events[i].t) { const e = G.events[i]; G.events.splice(i, 1); e.fn(); } }
function missionCheck() {
  if (G.state !== "playing") return;
  const P = G.player, foesAlive = G.enemies.some((e) => e.alive), foePlanes = air.planes.some((p) => p.side === "foe" && p.alive); let res = null;
  if (!P.alive) res = { won: false, why: `${P.spec.short} 침몰` };
  else if (G.mission === "fleet" || G.mission === "modern") { if (!foesAlive) res = { won: true, why: G.mission === "modern" ? "적 수상함 전멸 — 해상 우세 확보" : "적 함대 전멸" }; }
  else if (G.mission === "convoy") {
    const alive = G.convoy.filter((c) => c.alive);
    if (alive.length < 2) res = { won: false, why: "수송선단 괴멸" };
    else if (alive.every((c) => c.arrived)) res = { won: true, why: `수송선 ${alive.length}척 집결지 도착` };
    else if (!foesAlive && !G.events.length && !foePlanes) res = { won: true, why: "적 습격 격퇴" };
  } else {
    const lost = G.convoy.filter((c) => !c.alive).length;
    if (lost >= 2) res = { won: false, why: "정박 함선 피해 과다" };
    else if (!G.events.length && !foesAlive && !foePlanes) res = { won: true, why: "공습 격퇴 — 진주만 방어 성공" };
  }
  if (res) { G.result = res; G.state = "ending"; endT = 5; log(res.won ? `승리 — ${res.why}` : `패배 — ${res.why}`, res.won ? "hit" : "bad"); }
}
function finish() {
  G.state = "ended"; toastT = 0; $("#toast").classList.remove("on"); const res = G.result || { won: false, why: "" }, won = res.won, secs = Math.max(1, Math.round(G.battleT));
  if (G.plane) recallPlane();
  document.body.classList.remove("playing", "flying", "firstp"); cockpit.visible = false; if (document.pointerLockElement) document.exitPointerLock();
  $("#endSub").textContent = MISSIONS[G.mission].n; $("#endTitle").textContent = res.why; $("#endStamp").textContent = won ? "VICTORY" : "DEFEAT"; $("#endStamp").className = "stamp" + (won ? "" : " lose");
  $("#endFoes").innerHTML = G.enemies.slice(0, 6).map((e) => `<div>${FLAG.foe(22)}<b>${e.name}</b><span class="c">함장 ${e.captain || ""}</span><span class="r${e.alive ? " alive" : ""}">${e.captured ? "나포" : e.alive ? "생존" : "격침"}</span></div>`).join("");
  const s = G.stats, acc = s.shots ? ((s.hits / s.shots) * 100).toFixed(1) : "0.0";
  let html = `<span>교전 시간</span><span>${Math.floor(secs / 60)}분 ${secs % 60}초</span><span>주포 발사 / 명중</span><span>${s.shots}발 / ${s.hits}발 (${acc}%)</span>`
    + `<span>적함 격침</span><span>${G.enemies.filter((e) => !e.alive).length} / ${G.enemies.length}척 · 어뢰 명중 ${s.torpHits || 0}발${s.caps ? ` · 나포 ${s.caps}척` : ""}</span><span>항공전</span><span>적기 격추 ${s.planes || 0}기 · 폭탄 명중 ${s.bombs}발</span>`
    + `<span>잔여 선체</span><span>${Math.round((G.player.hp / G.player.maxHp) * 100)}%</span><span>지휘</span><span>${ECON_RANKS[myRank()]} ${cmdr.name} · ${postOf(myRank()).split(" (")[0]}</span>`;
  $("#endPromo").innerHTML = "";
  if (!G.auto) {
    const before = myRank();
    const a = { kind: "result", won, shots: Math.min(s.shots, 5000), hits: Math.min(s.hits, s.shots, 5000), seconds: Math.min(secs, 36000), tier: SHIPS[profile.ship].tier, bombs: Math.min(s.bombs, 20), bullets: Math.min(s.bullets, 20000), planes: Math.min(s.planes || 0, 200), caps: Math.min(s.caps || 0, 10), mission: G.mission };
    const r = econReward(a); act(a); sfx.coin();
    html += `<span>보상</span><span style="color:var(--warn)">+${fmt(r.money)} 크레딧 · +${fmt(r.xp)} 경험치</span>`;
    const after = myRank(), rl = rankLine();
    html += `<span>계급</span><span>${rl.name}${rl.next ? ` — ${rl.next}까지 ${fmt(rl.need - profile.xp)} 경험치` : " (최고 계급)"}</span>`;
    const unl = Object.entries(ECON_SHIPS).filter(([, v]) => v.rank === after && after > 0).map(([k]) => SHIPS[k].short).join(", ");
    if (after > before) { $("#endPromo").innerHTML = `<span class="k">PROMOTION</span><div class="insr"><div class="ib">${insignia(before, 46)}</div><span style="font-size:26px;color:var(--gold)">→</span><div class="ib new">${insignia(after, 64)}</div></div><div class="big">${ECON_RANKS[after]} 진급</div><div class="sub">${ECON_RANKS[before]} → ${ECON_RANKS[after]}<br>새 보직: ${postOf(after)}<br>호위함 ${escortsFor(after)}척 지휘${unl ? `<br>새로 열림: ${unl}` : ""}</div><div class="rk"><div class="hbar"><i style="width:${rl.pct * 100}%;background:var(--gold)"></i></div></div>`; sfx.bell(); }
    else $("#endPromo").innerHTML = `<span class="k">RANK</span><div class="ib new">${insignia(after, 64)}</div><div class="big" style="font-size:30px">${ECON_RANKS[after]}</div><div class="sub">${postOf(after)}<br>${rl.next ? `${rl.next}까지 ${fmt(rl.need - profile.xp)} XP` : "최고 계급"}</div><div class="rk"><div class="hbar"><i style="width:${rl.pct * 100}%;background:var(--gold)"></i></div></div>`;
  } else html += `<span>관전 모드</span><span>보상 없음</span>`;
  $("#endStats").innerHTML = html; $("#end").style.display = "grid"; bgm("menu");
}

// ── menus + shipyard ────────────────────────────────────────────────────────
let screen = "menu", yardSel = profile.ship;
function refreshMenus() {
  const sp = SHIPS[profile.ship], rl = rankLine(), g = GUNS[sp.gun], u = profile.upg[profile.ship] || {};
  $("#tbMoney").textContent = profile.admin ? "∞ CR (관리자)" : `${fmt(profile.money)} CR`;
  $("#tbRank").textContent = `${rl.name} · ${postOf(rl.r)}`; $("#tbIns").innerHTML = insignia(rl.r, 24);
  $("#rankBar").style.width = rl.pct * 100 + "%";
  $("#shipLine").innerHTML = `<div class="fh">${FLAG.us(30)}<span>FLAGSHIP · TIER ${["", "I", "II", "III", "IV", "V"][sp.tier]} · ${sp.cls}</span></div><div class="nm">${sp.name.replace(/\s*\(.*\)/, "")}</div><div class="cap">함장 ${FLAG_CAPTAIN[profile.ship]} ${captainOf(sp)}</div>`
    + `<div class="grid"><span>${g.name.split(" ")[0]} ×${sp.turrets.reduce((n, t) => n + t.n, 0)}</span><span>장전 ${(g.reload * RELOAD_K * (1 - 0.08 * (u.gun || 0))).toFixed(1)}s</span><span>${(sp.vmax * (1 + 0.05 * (u.engine || 0))).toFixed(1)} kn</span><span>장갑 ${sp.belt} mm</span><span>피탐 ${(conceal({ spec: sp }) / 1000).toFixed(1)} km</span><span>호위 ${escortsFor(rl.r)}척 · 전투기 9기</span></div>`;
  $("#rankTxt").textContent = rl.next ? `${rl.name} → ${rl.next} · ${fmt(profile.xp)} / ${fmt(rl.need)} XP` : `${rl.name} · 최고 계급`;
  const acc = profile.shots ? ((profile.hits / profile.shots) * 100).toFixed(1) : "0.0";
  $("#record").textContent = profile.battles ? `${profile.wins}승 / ${profile.battles}전 · 명중률 ${acc}%` : "첫 출격 대기 중";
  renderRecord();
  $("#missions").innerHTML = Object.entries(MISSIONS).map(([k, m]) => `<button class="ms${k === mission ? " on" : ""}" data-m="${k}"><b>${m.n}</b><small>${m.d}</small></button>`).join("");
  $("#nations").style.display = mission === "modern" ? "" : "none";
  if (mission === "modern") { fixNations(); const rk = myRank(), btn = (k, side, on, need) => `<button class="nt${on ? " on" : ""}" data-n${side}="${k}"${need > rk ? ` disabled title="${ECON_RANKS[need]} 이상"` : ""}>${(FLAGSVG[k] || FLAG.us)(18)} ${NATIONS[k].n}${need > rk ? ` 🔒${ECON_RANKS[need]}` : ""}</button>`;
    $("#nations").innerHTML = `<div class="ph"><span>FORCES</span><span>아군 / 적군 국가</span></div><div class="natrow"><span>아군</span>${Object.entries(SIDE_US).map(([k, need]) => btn(k, "u", k === natUs, need)).join("")}</div><div class="natrow"><span>적군</span>${Object.entries(SIDE_FOE).map(([k, need]) => btn(k, "f", k === natFoe, need)).join("")}</div><div class="natnote">${natFoe === "cn" ? (rk >= 4 ? "중국 해군 주력 — 055형 3척 + 항모 산둥 (최고 난이도)" : "중국 해군 — 055형 2척 (소장부터 항모 전단)") : `북한 해군 — 연안 전투함${rk >= 3 ? " 3척" : " 2척"} + 지상 발진 MiG-29`}</div>`; }
  $("#maps").innerHTML = Object.entries(MAPS).map(([k, m]) => `<button class="mp${(mission === "raid" ? "pearl" : theater) === k ? " on" : ""}" data-map="${k}"${mission === "raid" && k !== "pearl" ? " disabled" : ""}><b>${m.n}</b><small>${m.d}</small></button>`).join("") + (mission === "raid" ? `<div class="mpn">진주만 방어는 진주만 전장 고정</div>` : "");
  $("#cmdrFace").innerHTML = face(cmdr.face, 46); $("#cmdrName").textContent = `${ECON_RANKS[rl.r]} ${cmdr.name}`;
  if (screen === "yard") renderYard();
}
$("#nations").addEventListener("click", (e) => { const b = e.target.closest("[data-nu],[data-nf]"); if (!b || b.disabled) return; if (b.dataset.nu) natUs = b.dataset.nu; else natFoe = b.dataset.nf; try { localStorage.setItem("steeltide:natUs", natUs); localStorage.setItem("steeltide:natFoe", natFoe); } catch {} sfx.click(); refreshMenus(); });
$("#maps").addEventListener("click", (e) => { const b = e.target.closest("[data-map]"); if (!b || b.disabled) return; theater = b.dataset.map; try { localStorage.setItem("steeltide:map", theater); } catch {} sfx.click(); refreshMenus(); });
$("#cmdrEdit").addEventListener("click", () => openCmdr());
$("#cmdrM").addEventListener("click", (e) => { const f = e.target.closest("[data-face]"); if (f) { cmdrDraft = +f.dataset.face; renderCmdr(); sfx.click(); return; } if (e.target.id === "cmdrOk") saveCmdr(); });
$("#cmdrM").addEventListener("keydown", (e) => { if (e.key === "Enter") saveCmdr(); e.stopPropagation(); });
$("#missions").addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (!b) return; mission = b.dataset.m; try { localStorage.setItem("steeltide:mission", mission); } catch {} sfx.click(); refreshMenus(); });
function renderYard() {
  const adm = !!profile.admin, rk = myRank(), ids = Object.keys(SHIPS).sort((a, b) => SHIPS[a].tier - SHIPS[b].tier || ECON_SHIPS[a].price - ECON_SHIPS[b].price);
  let h = `<h3>조선소</h3><div class="money">${adm ? "무제한" : fmt(profile.money) + " 크레딧"}<small>${ECON_RANKS[rk]} · 경험치 ${fmt(profile.xp)}</small></div>`;
  if (adm) h += `<div class="adm">관리자 모드 — 모든 함선·강화 무료</div>`;
  for (const id of ids) {
    const s = SHIPS[id], own = profile.owned.includes(id), cur = profile.ship === id, need = ECON_SHIPS[id].rank, locked = !own && !adm && rk < need;
    h += `<div class="card${yardSel === id ? " sel" : ""}${own ? " own" : ""}${locked ? " lock" : ""}" data-ship="${id}"><div class="c">${"★".repeat(s.tier)}${"☆".repeat(5 - s.tier)} · ${s.cls}</div><div class="nm">${s.name}</div><div class="pr">${cur ? "기함" : own ? "보유" : locked ? `🔒 ${ECON_RANKS[need]} 이상` : adm ? "무료" : fmt(ECON_SHIPS[id].price) + " 크레딧"}</div></div>`;
  }
  if (!adm) h += `<div class="adminbox"><input id="adminCode" type="password" maxlength="32" placeholder="관리자 코드" autocomplete="off" /><button data-act="admin">적용</button></div>`;
  $("#yardList").innerHTML = h;
  const s = SHIPS[yardSel], g = GUNS[s.gun], tb = table(s.gun), own = profile.owned.includes(yardSel), u = profile.upg[yardSel] || { engine: 0, fc: 0, gun: 0, armor: 0 }, need = ECON_SHIPS[yardSel].rank;
  const guns = s.turrets.reduce((n, t) => n + t.n, 0), layout = [...new Set(s.turrets.map((t) => t.n))].map((n) => `${n === 1 ? "단장" : n === 2 ? "2연장" : "3연장"}×${s.turrets.filter((t) => t.n === n).length}`).join(" + ");
  let i = `<h3>${s.cls} · 티어 ${s.tier}</h3><div class="money" style="font-size:17px">${s.name}</div><div class="desc">${s.desc}</div><div class="spec">`
    + `<span>함장</span><span>${FLAG_CAPTAIN[yardSel]} ${captainOf(s)}</span><span>필요 계급</span><span>${ECON_RANKS[need]} 이상</span>`
    + `<span>전장 / 전폭</span><span>${s.L} m / ${s.B} m</span><span>최대 속력</span><span>${(s.vmax * 1.852 * (1 + 0.05 * u.engine)).toFixed(0)} km/h (${(s.vmax * (1 + 0.05 * u.engine)).toFixed(1)} 노트)</span>`
    + `<span>주포</span><span>${g.name}<br>${layout} (${guns}문)</span><span>재장전</span><span>${(g.reload * RELOAD_K * (1 - 0.08 * u.gun)).toFixed(1)}초</span>`
    + `<span>최대 사거리</span><span>${(tb.max / 1000).toFixed(1)} km</span><span>주장갑대</span><span>${s.belt} mm</span><span>피탐 거리</span><span>${(conceal({ spec: s }) / 1000).toFixed(1)} km</span>`
    + `<span>도장</span><span>${paintName(s)}</span>` + (MODEL_CFG[yardSel] ? `<span>모델</span><span style="color:var(--ok)">고해상도 3D 모델</span>` : "") + (s.torp ? `<span>어뢰</span><span>${s.torp.name}</span>` : "") + `<span>상대 함대</span><span>${FLEETS[s.tier].map((t) => ENEMIES[t].short).join(" · ")}${s.tier >= 3 ? " · 적 항모" : ""}</span></div>`;
  if (own) for (const p of ECON_PARTS) {
    const lv = u[p], max = lv >= ECON_MAX_LV, cost = max ? 0 : econPartCost(yardSel, p, lv);
    i += `<div class="up"><div class="t">${PART[p].n} <span class="pips">${"●".repeat(lv)}${"○".repeat(ECON_MAX_LV - lv)}</span></div><button data-act="up" data-part="${p}"${max || (!adm && profile.money < cost) ? " disabled" : ""}>${max ? "최대" : adm ? "강화 (무료)" : `강화 ${fmt(cost)}`}</button><div class="e">${PART[p].e}</div></div>`;
  }
  const locked = !adm && rk < need;
  if (!own) i += `<button class="yb" data-act="buy"${locked || (!adm && profile.money < ECON_SHIPS[yardSel].price) ? " disabled" : ""}>${locked ? `${ECON_RANKS[need]} 진급 후 구매 가능` : `구매 — ${adm ? "무료" : fmt(ECON_SHIPS[yardSel].price) + " 크레딧"}`}</button>`;
  else if (profile.ship !== yardSel) i += `<button class="yb" data-act="select">기함으로 지정</button>`;
  else i += `<button class="yb" data-act="go">이 함선으로 출항 — ${MISSIONS[mission].n}</button>`;
  $("#yardInfo").innerHTML = i;
}
$("#yard").addEventListener("click", (e) => {
  const card = e.target.closest("[data-ship]"); if (card) { yardSel = card.dataset.ship; sfx.click(); showcase(yardSel); renderYard(); return; }
  const b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  const a = b.dataset.act;
  if (a === "back") openMenu();
  else if (a === "admin") { const code = $("#adminCode").value; if (act({ kind: "admin", code })) { sfx.coin(); toast("관리자 모드 활성화 — 모든 구매·강화 무료"); } }
  else if (a === "buy") { if (act({ kind: "buy", ship: yardSel })) { sfx.coin(); toast(`${SHIPS[yardSel].short} 구매 완료`); showId = null; showcase(yardSel); } }
  else if (a === "select") { if (act({ kind: "select", ship: yardSel })) { sfx.click(); toast(`${SHIPS[yardSel].short} 기함 지정`); } }
  else if (a === "up") { if (act({ kind: "upgrade", ship: yardSel, part: b.dataset.part })) { sfx.coin(); toast(`${PART[b.dataset.part].n} 완료`); showId = null; showcase(yardSel); } }
  else if (a === "go") start(false);
});
$("#yard").addEventListener("keydown", (e) => { if (e.target.id === "adminCode" && e.key === "Enter") $('[data-act="admin"]')?.click(); });
function renderRecord() {
  const rl = rankLine(), acc = profile.shots ? ((profile.hits / profile.shots) * 100).toFixed(1) : "0.0", best = profile.bestSeconds ? `${Math.floor(profile.bestSeconds / 60)}분 ${profile.bestSeconds % 60}초` : "—";
  const unlock = (r) => Object.entries(ECON_SHIPS).filter(([, v]) => v.rank === r && r > 0).map(([k]) => SHIPS[k].short).join(", ");
  let h = `<h3>SERVICE RECORD · 전적</h3><div class="rstats"><div><span>출격</span><b>${profile.battles}</b></div><div><span>승리</span><b>${profile.wins}</b></div><div><span>누적 명중률</span><b>${acc}%</b></div><div><span>최단 승리</span><b style="font-size:18px">${best}</b></div></div>`;
  h += `<h3>계급 — 경험치 ${fmt(profile.xp)}</h3><div class="ladder">`;
  ECON_RANKS.forEach((n, r) => { h += `<div class="${r === rl.r ? "cur" : r < rl.r ? "done" : ""}"><span>${insignia(r, 22)}</span><b class="bh">${n}</b><span>${postOf(r)}</span><span class="xp">${fmt(ECON_RANK_XP[r])} XP</span><span>호위함 ${escortsFor(r)}척${unlock(r) ? ` · ${unlock(r)} 해금` : ""}</span></div>`; });
  $("#recordP").innerHTML = h + "</div>";
}
function setTab(t) { for (const [id, k] of [["#tabPort", "menu"], ["#yardBtn", "yard"], ["#tabRecord", "record"]]) $(id).classList.toggle("on", k === t); }
$("#tabPort").addEventListener("click", () => { sfx.click(); openMenu(); });
$("#tabRecord").addEventListener("click", () => { sfx.click(); bgm("menu"); hideAll(); screen = "record"; G.state = "menu"; setTab("record"); $("#topbar").style.display = "flex"; renderRecord(); $("#recordP").style.display = "block"; showcase(profile.ship); });
function hideAll() { sel = []; $("#cmdrM").style.display = "none"; capClear(); aa.on = false; aaGun.visible = false; paused = false; $("#pause").style.display = "none"; $("#start").style.display = "none"; $("#end").style.display = "none"; $("#yard").style.display = "none"; $("#recordP").style.display = "none"; document.body.classList.remove("playing", "flying", "auto", "firstp"); cockpit.visible = false; }
function openYard() { initAudio(); bgm("menu"); hideAll(); screen = "yard"; G.state = "menu"; setTab("yard"); $("#topbar").style.display = "flex"; yardSel = profile.ship; $("#yard").style.display = "block"; showcase(yardSel); renderYard(); }
function openMenu() { bgm("menu"); hideAll(); screen = "menu"; G.state = "menu"; setTab("menu"); $("#topbar").style.display = "flex"; $("#start").style.display = "block"; showcase(profile.ship); refreshMenus(); }

// ── controls (Navy Field style) ─────────────────────────────────────────────
// right-click: sail there (Shift: add waypoint, on own ship: stop) · 1/2/3: speed · A/D W/S: lay the gun line
// left-click: lay the guns there / lock an enemy ship · Space: fire · Q: guns/torpedoes · F: launch fighters
// Tab: camera target · Enter: fly the watched fighter · R: repair party · P: menu · H: help
const keys = new Set();
let cinema = false, torpB = 0, torpLead = null, autoFire = false, weapon = "gun", lock = null, corrR = 0, corrB = 0, fireHold = 0, hullWarned = false, torpThreat = 0, torpAlarmT = 0, paused = false, hintT = 0, helpOn = false;
let mouseX = innerWidth / 2, mouseY = innerHeight / 2, lDown = null, rDown = null, mDown = null, lockOn = null, wasLocked = false, freeYaw = 0, freePitch = 0;
const rep = { cd: 0, act: 0, n: 3 }, ribbons = [];
G.ribbon = (k) => { const r = ribbons.find((x) => x.k === k && x.t > 0); if (r) { r.n++; r.t = 4.5; } else { ribbons.push({ k, n: 1, t: 4.5 }); if (ribbons.length > 6) ribbons.shift(); } };
const cam = { yaw: 0, pitch: 0.95, dist: 1300, map: false, mapDist: 24000, free: false, focus: new THREE.Vector3(), tgt: null, pYaw: 0, pPitch: 0.28, pDist: 55, orbYaw: 2.5, orbPitch: 0.2, orbDist: 300 };
let SENS = 0.6; try { const v = parseFloat(localStorage.getItem("steeltide:sens")); if (v > 0) SENS = v; } catch {}
// AA gunner (twin 40 mm Bofors on the flagship): G toggles, mouse aims, left button / Space fires
const aa = { on: false, ammo: "mg", shells: [], yaw: 0, pitch: 0.3, fov: 65, t: 0, side: 0, recoil: [0, 0], heat: 0, shots: 0, kills: 0, kick: 0, streak: 0, streakT: 0, lastKills: 0 };
const gunner = { label: "본함 대공 사수", kills: 0, alive: false, own: true };
function toggleAA(on = !aa.on) {
  const P = G.player; if (on && (!P.alive || G.plane || cap.fps)) { sfx.deny(); return; }
  aa.on = on; aaGun.visible = false;
  if (on) { const f = foeNearestPlane(); aa.yaw = f ? Math.atan2(f.pos.z - P.pos.z, f.pos.x - P.pos.x) : P.heading + PI / 2; aa.pitch = f ? clamp(Math.atan2(f.pos.y, d2(f.pos, P.pos)), 0.05, 1.3) : 0.25; aa.fov = 65; lockPointer(); toast("대공 사수 — 마우스 조준 · 좌클릭/Space 사격 · Q 기관포/대공탄 전환 · 휠 확대 · G 복귀", 3.4); }
  else { if (document.pointerLockElement) document.exitPointerLock(); toast("함대 지휘로 복귀"); }
}
const foeNearestPlane = () => { const P = G.player; let b = null, d = Infinity; for (const p of air.planes) if (p.side === "foe" && p.alive && !p.crashed) { const dd = p.pos.distanceTo(P.pos); if (dd < d) { d = dd; b = p; } } return b; };
const aaMount = () => { const P = G.player; P.tilt.updateWorldMatrix(true, false); const sd = Math.sin(wrap(aa.yaw - P.heading)) >= 0 ? 1 : -1; return P.tilt.localToWorld(new THREE.Vector3(-P.spec.L * 0.08, P.spec.fb + 9, (P.spec.B * 0.5 + 2.5) * sd)); };
function aaStep(dt) {
  aaShellStep(dt); const P = G.player; if (!aa.on) return; if (!P.alive || G.plane || G.state !== "playing") { toggleAA(false); return; }
  aa.t -= dt; aa.heat = Math.max(0, aa.heat - dt * 0.14); aa.recoil = aa.recoil.map((r) => Math.max(0, r - dt * 8));
  const firing = (keys.has("Space") || (lDown && document.pointerLockElement === canvas)) && aa.heat < 1;
  if (aa.ammo === "flak") { aaFlak(dt, firing); return; }
  while (firing && aa.t <= 0) {
    aa.t += 0.055; aa.side ^= 1; aa.recoil[aa.side] = 1; aa.heat += 0.009; aa.shots++;
    const o = aaMount(), dir = dirFrom(aa.yaw, aa.pitch); dir.x += gauss() * 0.003; dir.y += gauss() * 0.003; dir.z += gauss() * 0.003; dir.normalize();
    const sideV = new THREE.Vector3(-Math.sin(aa.yaw), 0, Math.cos(aa.yaw)).multiplyScalar(aa.side ? 0.4 : -0.4);
    air.aa.push({ p: o.clone().add(sideV).addScaledVector(dir, 3), v: dir.clone().multiplyScalar(840).add(P.vel), t: 0, side: "us", aa: true, own: true, by: gunner, dmg: 3 + rnd() * 2.5 });
    if (aa.shots % 2) sfx.mgShot(0); sfx.aaThump?.(); G.shake = Math.min((G.shake || 0) + 0.02, 0.2); aa.kick = 1;
  }
  if (!firing) aa.t = Math.max(aa.t, 0);
}
/** 5-inch/38 VT (proximity-fuzed) flak: slow, bursts within ~25 m of an enemy plane or at the set time. */
const aaShellL = lineObj(120, new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.95 }), true);
function aaFlak(dt, firing) {
  const P = G.player;
  while (firing && aa.t <= 0 && aa.heat < 1) {
    aa.t += 0.65; aa.side ^= 1; aa.recoil[aa.side] = 1; aa.heat += 0.05; aa.shots++;
    const o = aaMount(), dir = dirFrom(aa.yaw, aa.pitch); dir.x += gauss() * 0.002; dir.y += gauss() * 0.002; dir.z += gauss() * 0.002; dir.normalize();
    aa.shells.push({ p: o.clone().addScaledVector(dir, 4), v: dir.clone().multiplyScalar(760).add(P.vel), t: 0 });
    sfx.flak(400); sfx.aaThump?.(); G.shake = Math.min((G.shake || 0) + 0.07, 0.25); aa.kick = 1.6;
  }
  if (!firing) aa.t = Math.max(aa.t, 0);
}
function aaShellStep(dt) {
  const a = aaShellL.geometry.attributes.position.array; let n = 0;
  for (let i = aa.shells.length - 1; i >= 0; i--) {
    const s = aa.shells[i]; let boom = false;
    for (let k = 0; k < 3 && !boom; k++) { s.p.addScaledVector(s.v, dt / 3); s.v.y -= 9.81 * dt / 3; s.t += dt / 3;
      if (s.t > 0.35) for (const p of air.planes) if (p.alive && p.side === "foe" && p.pos.distanceTo(s.p) < 34) { boom = true; break; } }
    if (boom || s.t > 7) { air.flak.push({ t: 0, side: "us", p: s.p.clone(), own: true, by: gunner }); aa.shells.splice(i, 1); continue; }
    if (s.p.y < 0) { aa.shells.splice(i, 1); continue; }
    if (n < 58) { const q = s.p.clone().addScaledVector(s.v, -0.03); a.set([s.p.x, s.p.y, s.p.z, q.x, q.y, q.z], n * 6); n++; }
  }
  aaShellL.geometry.setDrawRange(0, n * 2); aaShellL.geometry.attributes.position.needsUpdate = true; aaShellL.visible = n > 0;
}
function drawAAHUD() {
  const W = hud.width, H = hud.height, cx = W / 2, cy = H / 2, P = G.player; hx.textBaseline = "middle";
  for (const p of air.planes) {
    if (!p.alive || p.crashed) continue; const q = proj(p.pos); if (!q) continue; const d = p.pos.distanceTo(camera.position);
    if (p.side === "foe" && q.on) { hx.fillStyle = "rgba(0,0,0,.6)"; hx.fillRect(q.x - 22, q.y + 14, 44, 5); hx.fillStyle = p.hp > 50 ? "#ffd166" : "#ff5a4e"; hx.fillRect(q.x - 22, q.y + 14, 44 * (p.hp / 100), 5); }
    if (p.side === "foe") {
      if (q.on) { const s = clamp(5000 / d, 8, 26); hx.strokeStyle = "#ff6b5e"; hx.lineWidth = 1.5; hx.strokeRect(q.x - s, q.y - s * 0.7, s * 2, s * 1.4); txt(`${p.callsign} ${fmt(d)} m`, q.x + s + 6, q.y, "#ff8a7a", "bold 11px 'Noto Sans KR', sans-serif");
        if (d < (aa.ammo === "flak" ? 6000 : 3500)) { const tof = d / (aa.ammo === "flak" ? 700 : 880), L = p.pos.clone().addScaledVector(p.vel.sub(P.vel), tof); L.y += 0.5 * 9.81 * tof * tof; const lq = proj(L); if (lq && lq.on) { hx.strokeStyle = "#ffd166"; hx.beginPath(); hx.arc(lq.x, lq.y, 7, 0, TAU); hx.stroke(); hx.setLineDash([3, 4]); hx.beginPath(); hx.moveTo(q.x, q.y); hx.lineTo(lq.x, lq.y); hx.stroke(); hx.setLineDash([]); } } }
      else { const v = p.pos.clone().project(camera), back = v.z > 1, ax = back ? -v.x : v.x, ay = back ? -v.y : v.y, m = Math.max(Math.abs(ax), Math.abs(ay), 1e-6), ex = cx + (ax / m) * (W / 2 - 50), ey = cy - (ay / m) * (H / 2 - 60); hx.fillStyle = "#ff6b5e"; hx.beginPath(); hx.arc(ex, ey, 7, 0, TAU); hx.fill(); txt(`${fmt(d)} m`, ex, ey + 16, "#ff8a7a", "10px 'Noto Sans KR', sans-serif", "center"); }
    } else if (q.on) { hx.strokeStyle = "#7cc4ff"; hx.strokeRect(q.x - 7, q.y - 7, 14, 14); }
  }
  if (gunner.kills > aa.lastKills) { aa.streak = aa.streakT > 0 ? aa.streak + 1 : 1; aa.streakT = 6; aa.lastKills = gunner.kills; } aa.streakT = Math.max(0, aa.streakT - 1 / 60);
  if (air.killMark > 1.6) { hx.fillStyle = `rgba(255,200,120,${(air.killMark - 1.6) * 0.5})`; hx.fillRect(0, 0, W, H); }
  if (air.hitMark > 0) { hx.strokeStyle = air.killMark > 0 ? "#ff3b30" : "#ffffff"; hx.lineWidth = 4; const r = 14 + (0.35 - air.hitMark) * 40; for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { hx.beginPath(); hx.moveTo(cx + sx * r, cy + sy * r); hx.lineTo(cx + sx * (r + 12), cy + sy * (r + 12)); hx.stroke(); } }
  if (air.killMark > 0) { hx.globalAlpha = clamp(air.killMark, 0, 1); const sc = 1 + Math.max(0, air.killMark - 1.7) * 1.2; txt(aa.streak > 1 ? `${aa.streak}연속 격추!` : "적기 격추!", cx, cy - 74, "#ff3b30", `bold ${Math.round(32 * sc)}px 'Noto Sans KR', sans-serif`, "center"); hx.globalAlpha = 1; }
  else if (air.hitText > 0) txt(`명중! ×${air.hits}`, cx, cy - 56, "#ffd166", "bold 20px 'Noto Sans KR', sans-serif", "center");
  else if (air.nearMark > 0) txt("근탄 — 조금만 더 앞을 겨누세요", cx, cy - 56, "#cfe7ff", "bold 14px 'Noto Sans KR', sans-serif", "center");
  const pw = 360; panel(cx - pw / 2, H - 76, pw, 62);
  txt(aa.ammo === "flak" ? "5인치 대공탄 (VT 근접신관) — 적기 근처에서 자동 폭발 · Q: 기관포" : "40mm 연장 대공 기관포 — Q: 대공탄", cx, H - 62, "#fff", "bold 12px 'Noto Sans KR', sans-serif", "center");
  hx.fillStyle = "rgba(255,255,255,.1)"; hx.fillRect(cx - 150, H - 48, 300, 7); hx.fillStyle = aa.heat > 0.8 ? "#ff5a4e" : "#ffd166"; hx.fillRect(cx - 150, H - 48, 300 * clamp(aa.heat, 0, 1), 7);
  txt(aa.heat >= 1 ? "총열 과열 — 잠시 대기" : `총열 온도 · 발사 ${aa.shots} · 격추 ${gunner.kills} · 배율 ×${(65 / aa.fov).toFixed(1)}`, cx, H - 30, aa.heat >= 1 ? "#ff8a7a" : "#cfd8dc", "11px 'Noto Sans KR', sans-serif", "center");
  txt(document.pointerLockElement === canvas ? "마우스 조준 · 좌클릭/Space 사격 · Q 탄종 전환 · 휠 확대 · G 지휘로 복귀" : "화면을 클릭하면 마우스로 조준합니다", cx, H - 92, "#e8f0f2", "12px 'Noto Sans KR', sans-serif", "center");
}
// ── capture (나포): LCVPs carry Marines to a crippled enemy; man the boat's .30 cal (V), then fight on deck as the Marine officer — or leave it to the Marines ──
const BOARD_R = 3000, LCVP_V = 30, MARINES_PER = 12, CAP_MAX = 2;
const cap = { phase: null, tgt: null, boats: [], fps: false, yaw: 0, pitch: 0, supp: 0, bul: [], wait: 0, def: [], mar: [], me: { x: 0, z: 0 }, ammo: 8, rel: 0, cd: 0, hp: 100, used: 0, flash: 0, hitT: 0, killT: 0, kills: 0, marines: 0, mt: 0, deckY: 0, side: 1 };
const capLines = lineObj(800, new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.95 }), true);
const CAPM = { boat: new THREE.MeshStandardMaterial({ color: 0x5b6a4f, roughness: 0.9 }), us: new THREE.MeshStandardMaterial({ color: 0x4f5a3a, roughness: 0.9 }), jp: new THREE.MeshStandardMaterial({ color: 0xb8ab82, roughness: 0.9 }), skin: new THREE.MeshStandardMaterial({ color: 0xc69c78, roughness: 0.8 }), dark: new THREE.MeshStandardMaterial({ color: 0x2a2a26, roughness: 0.6 }) };
const CAPG = { hull: new THREE.BoxGeometry(11, 2.2, 3.3), ramp: new THREE.BoxGeometry(0.3, 2.1, 3.1), head: new THREE.SphereGeometry(0.3, 8, 6), body: new THREE.BoxGeometry(0.42, 1.25, 0.32), fhead: new THREE.SphereGeometry(0.17, 8, 6), gun: new THREE.BoxGeometry(0.95, 0.07, 0.07) };
function boatMesh() {
  // LCVP (Higgins boat): flat hull, plywood sides, bow ramp, coxswain station and two .30 cal pintles aft
  // hull walls: a top-view outline (square bow, rounded stern) with the troop well cut out, extruded upward
  const g = new THREE.Group(), add = (geo, m, x, y, z, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.z = rz; o.castShadow = true; g.add(o); return o; }, B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  if (!CAPG.lcvp) {
    const o = new THREE.Shape(); o.moveTo(5.2, -1.6); o.lineTo(5.2, 1.6); o.lineTo(-4.6, 1.6); o.quadraticCurveTo(-5.5, 1.6, -5.5, 0.7); o.lineTo(-5.5, -0.7); o.quadraticCurveTo(-5.5, -1.6, -4.6, -1.6); o.closePath();
    const well = new THREE.Path(); well.moveTo(5.0, -1.45); well.lineTo(5.0, 1.45); well.lineTo(-2.6, 1.45); well.lineTo(-2.6, -1.45); well.closePath(); o.holes.push(well);
    CAPG.lcvp = new THREE.ExtrudeGeometry(o, { depth: 1.75, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 }); CAPG.lcvp.rotateX(-PI / 2);
    CAPG.vee = new THREE.CylinderGeometry(1.6, 1.6, 10.2, 3, 1); CAPG.vee.rotateZ(PI / 2); CAPG.vee.scale(1, 0.32, 1); // shallow V bottom
    CAPM.steel = new THREE.MeshStandardMaterial({ color: 0x59625e, roughness: 0.6, metalness: 0.45 }); CAPM.deck = new THREE.MeshStandardMaterial({ color: 0x3e4537, roughness: 0.95 }); CAPM.boot = new THREE.MeshStandardMaterial({ color: 0x2b2f2c, roughness: 0.8 });
  }
  add(CAPG.lcvp, CAPM.boat, 0, 0.05, 0); add(CAPG.vee, CAPM.boot, -0.15, -0.05, 0).rotation.x = PI / 2;
  add(B(7.6, 0.08, 2.9), CAPM.deck, 1.2, 0.4, 0);                                   // troop well floor
  add(B(0.16, 1.95, 3.15), CAPM.steel, 5.3, 1.0, 0, -0.16);                        // steel bow ramp, slightly raked
  for (const z of [-1.62, 1.62]) add(B(10.6, 0.1, 0.1), CAPM.boot, -0.1, 1.82, z);   // rub rails
  add(B(0.06, 0.25, 3.3), CAPM.boot, 0.0, 0.32, 0);                                 // waterline band hint
  add(B(1.3, 0.7, 1.0), CAPM.steel, -4.1, 2.05, -0.75);                              // coxswain's armoured station
  for (const z of [-1.05, 1.05]) { const tub = add(new THREE.CylinderGeometry(0.45, 0.45, 0.5, 12, 1, true), CAPM.steel, -3.3, 2.0, z); tub.material = CAPM.steel; add(B(0.07, 0.75, 0.07), CAPM.dark, -3.3, 2.15, z); add(B(1.1, 0.11, 0.11), CAPM.dark, -2.85, 2.55, z); }
  add(B(1.6, 0.2, 2.6), CAPM.deck, -4.2, 1.72, 0);                                  // engine-room deck aft
  const helm = new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(helm, CAPM.us); m.position.set(-2.9 + (i % 6) * 1.25, 1.62, i < 6 ? 0.65 : -0.65); g.add(m); }
  scene.add(g); return g;
}
function figure(side) { return soldier(side === "us" ? "us" : "jp").root; }
/** null when boarding `T` is possible now, otherwise the reason. */
function canBoard(T) {
  const P = G.player;
  if (!T || T.side !== "foe" || !T.alive || T.captured || !P || !P.alive || G.plane) return "목표 없음";
  if (cap.phase) return "작전 진행 중"; if (profile.admin) return null; if (cap.used >= CAP_MAX) return "해병대 소진";
  if (T.hp / T.maxHp > 0.5 && T.speed > 1.5) return "적함 체력 50% 이하 또는 기관 정지 시";
  return null;
}
function capClear() {
  for (const b of cap.boats) scene.remove(b.m);
  for (const d of [...cap.def, ...cap.mar]) d.m.parent?.remove(d.m);
  cap.boats = []; cap.def = []; cap.mar = []; cap.bul = []; capLines.visible = false;
  if (cap.tgt) cap.tgt.boarded = false;
  if (cap.fps && document.pointerLockElement) document.exitPointerLock();
  cap.phase = null; cap.fps = false; cap.tgt = null;
}
function capReset() { capClear(); cap.used = 0; cap.kills = 0; }
function startBoard() {
  const T = lock || G.enemy, why = canBoard(T); if (why) { sfx.deny(); toast(`나포 불가 — ${why}`); return; }
  const P = G.player, f = P.fwd; cap.used++; cap.phase = "boats"; cap.tgt = T; T.boarded = true; cap.supp = 0; cap.wait = 0; cap.hp = 100;
  cap.side = Math.sin(wrap(Math.atan2(T.pos.z - P.pos.z, T.pos.x - P.pos.x) - P.heading)) >= 0 ? 1 : -1;
  const sv = new THREE.Vector3(-f.z, 0, f.x).multiplyScalar(cap.side);
  cap.boats = [-1, 0, 1].map((k) => { const m = boatMesh(), p = P.pos.clone().addScaledVector(f, k * P.spec.L * 0.22).addScaledVector(sv, P.spec.B * 0.5 + 14); p.y = 0; m.position.copy(p); return { m, p, off: k, hp: 100, alive: true, arr: false, hd: P.heading + cap.side * 0.6, wakeT: 0, v: clamp(d2(P.pos, T.pos) / 70, LCVP_V, 95) }; });
  log(`해병대 상륙정 3척 발진 — 나포 목표 ${T.name} · 전 함대 해당 함 사격 중지`, "hit"); sfx.click();
  toast("나포 작전 개시 — V: 상륙정 기관총 사수(직접) · 그냥 두면 해병대가 자동 진행", 3.6);
}
function toggleCapFps(on = !cap.fps) {
  if (!cap.phase) return; if (on && cap.phase === "deck" && cap.hp <= 0) { sfx.deny(); toast("해병 장교 부상 — 직접 전투 불가"); return; }
  if (on && aa.on) toggleAA(false); cap.fps = on;
  if (on) { const T = cap.tgt, o = cap.phase === "boats" ? (cap.boats.find((b) => b.alive) || {}).p || G.player.pos : T.pos; cap.yaw = cap.phase === "boats" ? Math.atan2(T.pos.z - o.z, T.pos.x - o.x) : T.heading; cap.pitch = cap.phase === "boats" ? 0.03 : 0; lockPointer();
    toast(cap.phase === "boats" ? "상륙정 .30구경 기관총 — 마우스 조준 · 좌클릭/Space 사격 · 적함을 쏘면 대응 사격이 줄어듭니다 · V 지휘로" : "해병 장교 — WASD 이동 · 마우스 조준 · 좌클릭 사격 · R 재장전 · V 자동 진행", 3.6); }
  else { if (document.pointerLockElement) document.exitPointerLock(); toast("자동 진행 — 해병대가 알아서 싸웁니다"); }
}
function capFail(msg) { log(msg, "bad"); G.radio?.("ally_sunk"); capClear(); }
/** Deck height under a ship-local point, found by casting down onto the ship's own model (models differ from spec.fb). */
const deckRay = new THREE.Raycaster(), DOWN = new THREE.Vector3(0, -1, 0);
function deckAt(T, lx, lz) {
  T.tilt.updateWorldMatrix(true, true); deckRay.set(T.tilt.localToWorld(new THREE.Vector3(lx, T.spec.fb + 60, lz)), DOWN); deckRay.far = 140;
  for (const h of deckRay.intersectObject(T.root, true)) { const y = T.tilt.worldToLocal(h.point.clone()).y; if (y <= T.spec.fb + 7 && y > -2) return y; }
  return T.spec.fb;
}
function boardDeck(n) {
  const T = cap.tgt, L = T.spec.L, B = T.spec.B; cap.phase = "deck"; T.boarded = true; cap.deckY = T.spec.fb;
  for (const b of cap.boats) scene.remove(b.m);
  cap.marines = n * MARINES_PER; cap.mt = 0; cap.ammo = 8; cap.rel = 0; cap.cd = 0; cap.hp = 100;
  const nd = clamp(Math.round(7 + 18 * (T.hp / T.maxHp) + (T.spec.tier || 1) * 1.5), 8, 22);
  cap.def = []; for (let i = 0; i < nd; i++) { const x = (rnd() * 0.85 - 0.3) * L * 0.5, z = (rnd() - 0.5) * B * 0.7, m = figure("jp"); const y = deckAt(T, x, z); m.position.set(x, y, z); T.tilt.add(m); cap.def.push({ m, x, z, y, alive: true, cd: 1 + rnd() * 2, fall: 0 }); }
  cap.mar = []; for (let i = 0; i < Math.min(10, cap.marines); i++) { const x = -L * 0.3 + (rnd() - 0.5) * L * 0.2, z = cap.side * B * 0.4 * (0.6 + rnd() * 0.4) * -1, m = figure("us"); const y = deckAt(T, x, z); m.position.set(x, y, z); T.tilt.add(m); cap.mar.push({ m, x, z, y, alive: true, fall: 0 }); }
  cap.me = { x: -L * 0.32, z: -cap.side * B * 0.22 }; cap.eyeY = undefined; T.flooding = Math.min(T.flooding, 3);
  log(`해병대 ${cap.marines}명 ${T.name} 갑판 진입! 적 수병 ${nd}명`, "hit"); G.ribbon("갑판 진입");
  if (cap.fps) { cap.yaw = T.heading; cap.pitch = 0; toast("갑판 전투 — WASD 이동 · 마우스 조준 · 좌클릭 사격 · R 재장전 · V 자동 진행", 3.6); }
  else toast("해병대가 적함 갑판에 올랐습니다 — V: 해병 장교로 직접 싸우기", 3.2);
}
function captureShip() {
  const T = cap.tgt; T.captured = true; T.alive = false; T.tele = 1; T.rudderCmd = 0; cap.kills = cap.kills;
  G.stats.caps = (G.stats.caps || 0) + 1; G.ribbon("나포"); if (lock === T) lock = null;
  const left = G.enemies.filter((e) => e.alive).length; log(`${T.name} 나포 성공! 성조기 게양${left ? ` — 남은 적 ${left}척` : ""}`, "hit"); sfx.bell?.(); G.radio?.(left ? "sunk" : "fleet");
  capClear();
}
const capW2L = (T, wx, wz) => { const c = Math.cos(T.heading), s = Math.sin(T.heading); return [wx * c + wz * s, -wx * s + wz * c]; };
const capOnHull = (T, p) => { const dx = p.x - T.pos.x, dz = p.z - T.pos.z, [lx, lz] = capW2L(T, dx, dz); return Math.abs(lx) < T.spec.L * 0.5 && Math.abs(lz) < T.spec.B * 0.5 + 1.5 && p.y > -1 && p.y < T.spec.fb + 18; };
const capRay = new THREE.Raycaster(), capV2 = new THREE.Vector2(0, 0);
function capShoot(T) {
  const dir = dirFrom(cap.yaw, cap.pitch);
  if (cap.phase === "boats") {
    dir.x += gauss() * 0.006; dir.y += gauss() * 0.004; dir.z += gauss() * 0.006; dir.normalize();
    cap.bul.push({ p: camera.position.clone().addScaledVector(dir, 2), v: dir.multiplyScalar(820), t: 0, mg: true });
    sfx.mgShot(0); G.shake = Math.min((G.shake || 0) + 0.04, 0.3); cap.kick = 1; cap.flT = 0.04; return;
  }
  cap.ammo--; if (cap.ammo <= 0) { cap.rel = 2.2; sfx.ready(); } cap.kick = 1; cap.flT = 0.06; sfx.mgShot(0); G.shake = Math.min((G.shake || 0) + 0.12, 0.3);
  capRay.setFromCamera(capV2, camera); capRay.far = 160;
  const live = cap.def.filter((d) => d.alive), hit = capRay.intersectObjects(live.map((d) => d.m), true)[0];
  const end = hit ? hit.point : camera.position.clone().addScaledVector(capRay.ray.direction, 120);
  cap.bul.push({ a: camera.position.clone().addScaledVector(capRay.ray.direction, 1.2), b: end, t: 0.08 });
  if (hit) { let o = hit.object; const d = live.find((x) => { let q = o; while (q) { if (q === x.m) return true; q = q.parent; } return false; }); if (d) { spark.spawn({ x: hit.point.x, y: hit.point.y, z: hit.point.z, vy: 2, life: 0.4, s0: 0.5, s1: 1.2, a: 1, c: 0xd8c8a0 }); d.alive = false; cap.kills++; cap.hitT = 0.3; cap.killT = 0.9; } }
}
function capBullets(dt, T) {
  const a = capLines.geometry.attributes.position.array; let n = 0;
  for (let i = cap.bul.length - 1; i >= 0; i--) {
    const b = cap.bul[i];
    if (b.mg) {
      let gone = false; for (let k = 0; k < 3 && !gone; k++) { b.p.addScaledVector(b.v, dt / 3); b.v.y -= 9.81 * dt / 3;
        if (T && capOnHull(T, b.p)) { cap.supp = Math.min(0.85, cap.supp + 0.018); cap.hitT = 0.18; spark.spawn?.({ x: b.p.x, y: b.p.y, z: b.p.z, vy: 3, life: 0.3, s0: 0.6, s1: 1.6, a: 1, c: 0xffc070 }); gone = true; }
        else if (b.p.y < 0) { spray.spawn({ x: b.p.x, y: 0.3, z: b.p.z, vy: 3, g: 9.81, life: 0.6, s0: 0.5, s1: 1.4, a: 0.7, fade: 0.6, c: 0xffffff }); gone = true; } }
      b.t += dt; if (gone || b.t > 3) { cap.bul.splice(i, 1); continue; }
      if (n < 398) { const q = b.p.clone().addScaledVector(b.v, -0.025); a.set([b.p.x, b.p.y, b.p.z, q.x, q.y, q.z], n * 6); n++; }
    } else { b.t -= dt; if (b.t <= 0) { cap.bul.splice(i, 1); continue; } if (n < 398) { a.set([b.a.x, b.a.y, b.a.z, b.b.x, b.b.y, b.b.z], n * 6); n++; } }
  }
  capLines.geometry.setDrawRange(0, n * 2); capLines.geometry.attributes.position.needsUpdate = true; capLines.visible = n > 0;
}
function capStep(dt) {
  if (!cap.phase) return; const T = cap.tgt;
  if (!T || T.sinking > 0 || !G.player.alive) { capFail(!G.player.alive ? "기함 침몰 — 나포 작전 중단" : "목표 함선 침몰 — 나포 실패"); return; }
  cap.kick = Math.max(0, (cap.kick || 0) - dt * (cap.phase === "boats" ? 14 : 7)); cap.flT = (cap.flT || 0) - dt; cap.adsK = (cap.adsK || 0) + ((cap.ads ? 1 : 0) - (cap.adsK || 0)) * Math.min(1, dt * 12);
  cap.flash = Math.max(0, cap.flash - dt); cap.hitT = Math.max(0, cap.hitT - dt); cap.killT = Math.max(0, cap.killT - dt); cap.cd -= dt;
  const firing = cap.fps && (keys.has("Space") || (lDown && document.pointerLockElement === canvas));
  if (cap.phase === "boats") {
    cap.supp = Math.max(0, cap.supp - dt * 0.07);
    if (firing && cap.cd <= 0) { cap.cd = 0.09; capShoot(T); }
    const live = cap.boats.filter((b) => b.alive); if (!live.length) { capFail("상륙정 전멸 — 나포 실패"); return; }
    for (const b of live) {
      const aim = T.pos.clone().addScaledVector(T.fwd, b.off * T.spec.L * 0.18), dx = aim.x - b.p.x, dz = aim.z - b.p.z, dist = Math.hypot(dx, dz);
      const reach = T.spec.B * 0.5 + 9;
      if (dist > reach) { let d = wrap(Math.atan2(dz, dx) - b.hd); const ahead = (r, a) => landAt(b.p.x + Math.cos(b.hd + a) * r, b.p.z + Math.sin(b.hd + a) * r);
        if (ahead(120, 0) || ahead(400, 0) || ahead(400, 0.3) || ahead(400, -0.3)) d = ahead(400, 0.8) && !ahead(400, -0.8) ? -2 : 2; // land ahead: swing to the clear side
        b.hd = wrap(b.hd + clamp(d, -0.9 * dt, 0.9 * dt)); const nx = b.p.x + Math.cos(b.hd) * b.v * dt, nz = b.p.z + Math.sin(b.hd) * b.v * dt; if (!landAt(nx, nz)) { b.p.x = nx; b.p.z = nz; } b.arr = false; }
      else { b.arr = true; const v = T.vel; b.p.x += v.x * dt; b.p.z += v.z * dt; }
      b.m.position.set(b.p.x, Math.sin(G.time * 3 + b.off) * 0.22, b.p.z); b.m.rotation.set(0, -b.hd, Math.sin(G.time * 2.2 + b.off) * 0.05);
      b.wakeT -= dt; if (b.wakeT <= 0 && !b.arr) { b.wakeT = 0.12; spray.spawn({ x: b.p.x - Math.cos(b.hd) * 6, y: 0.4, z: b.p.z - Math.sin(b.hd) * 6, vy: 0.8, life: 2.4, s0: 1.2, s1: 3.4, a: 0.55, fade: 0.8, c: 0xffffff }); }
      const heat = (0.3 + 0.7 * Math.min(1, (T.hp / T.maxHp) * 3)) * (1 - cap.supp) * (dist < 1300 ? 1 : dist < 4000 ? 0.45 : 0);
      if (rnd() < heat * 0.6 * dt) { const ok = rnd() < 0.28; spawnSplash(b.p.x + gauss() * (ok ? 2 : 14), b.p.z + gauss() * (ok ? 2 : 14), 0.2);
        if (ok) { b.hp -= 9 + rnd() * 9; hitFX(b.m.position.clone().setY(1.5), 0.15); if (b === live[0] && cap.fps) { cap.flash = 0.3; G.shake = 0.5; } } }
      if (b.hp <= 0) { b.alive = false; hitFX(b.m.position.clone().setY(1), 0.45); scene.remove(b.m); log(`상륙정 피격 침몰 — 해병 ${MARINES_PER}명 손실`, "bad"); }
    }
    const lv = cap.boats.filter((b) => b.alive), arr = lv.filter((b) => b.arr).length;
    if (arr) cap.wait += dt;
    if (lv.length && (arr === lv.length || cap.wait > 9)) boardDeck(arr || lv.length);
  } else deckStep(dt, T, firing);
  capBullets(dt, T);
}
function deckStep(dt, T, firing) {
  T.tele = 1; T.rudderCmd = 0; T.flooding = Math.max(0, Math.min(T.flooding, 3) - dt * 0.5); const L = T.spec.L, B = T.spec.B;
  if (cap.rel > 0) { cap.rel -= dt; if (cap.rel <= 0) cap.ammo = 8; }
  if (cap.fps && cap.hp > 0) {
    const cy = Math.cos(cap.yaw), sy = Math.sin(cap.yaw); let fx = 0, fz = 0;
    if (keys.has("KeyW")) { fx += cy; fz += sy; } if (keys.has("KeyS")) { fx -= cy; fz -= sy; } if (keys.has("KeyA")) { fx += sy; fz -= cy; } if (keys.has("KeyD")) { fx -= sy; fz += cy; }
    const m = Math.hypot(fx, fz); if (m > 0) { const sp = (shiftDown() ? 6.5 : 4) * dt / m, [lx, lz] = capW2L(T, fx * sp, fz * sp); cap.me.x = clamp(cap.me.x + lx, -L * 0.44, L * 0.44); cap.me.z = clamp(cap.me.z + lz, -B * 0.42, B * 0.42); }
    if (firing && cap.cd <= 0 && cap.ammo > 0 && cap.rel <= 0) { cap.cd = 0.3; capShoot(T); }
  }
  const live = cap.def.filter((d) => d.alive), mar = cap.mar.filter((d) => d.alive);
  for (const d of cap.def) if (!d.alive && d.fall < 1) { d.fall = Math.min(1, d.fall + dt * 3); d.m.rotation.z = -d.fall * PI / 2; d.m.position.y = (d.y ?? cap.deckY) + 0.15 * d.fall; }
  for (const d of cap.mar) if (!d.alive && d.fall < 1) { d.fall = Math.min(1, d.fall + dt * 3); d.m.rotation.z = d.fall * PI / 2; d.m.position.y = (d.y ?? cap.deckY) + 0.15 * d.fall; }
  for (const d of live) {
    let tx = cap.me.x, tz = cap.me.z, best = cap.fps && cap.hp > 0 ? Math.hypot(d.x - tx, d.z - tz) : Infinity;
    for (const q of mar) { const dd = Math.hypot(d.x - q.x, d.z - q.z); if (dd < best) { best = dd; tx = q.x; tz = q.z; } }
    d.m.rotation.y = -Math.atan2(tz - d.z, tx - d.x);
    if (best > 14 && best < Infinity) { const k = 0.8 * dt / best; d.x += (tx - d.x) * k; d.z += (tz - d.z) * k; d.m.position.x = d.x; d.m.position.z = d.z; }
    d.cd -= dt; if (d.cd > 0) continue; d.cd = 1.5 + rnd() * 1.6; fireSoldier(d.m.userData.sol);
    const atMe = cap.fps && cap.hp > 0 && Math.hypot(d.x - cap.me.x, d.z - cap.me.z) < 70 && rnd() < 0.55;
    if (atMe) { if (rnd() < 0.2) { cap.hp = Math.max(0, cap.hp - (9 + rnd() * 9)); cap.flash = 0.35; G.shake = 0.4; } }
    else if (cap.marines > 0 && rnd() < 0.075) { cap.marines--; const v = mar.find((q) => q.alive); if (v && cap.marines < mar.length) v.alive = false; }
    T.tilt.updateWorldMatrix(true, false); const a = T.tilt.localToWorld(new THREE.Vector3(d.x, (d.y ?? cap.deckY) + 1.1, d.z)), b = T.tilt.localToWorld(new THREE.Vector3(atMe ? cap.me.x : tx, cap.deckY + 1.1, atMe ? cap.me.z : tz));
    cap.bul.push({ a, b: a.clone().lerp(b, 0.85 + rnd() * 0.3), t: 0.06 }); if (d2(a, camera.position) < 400) sfx.mgShot(0);
  }
  for (const q of mar) { let best = Infinity, tx = q.x, tz = q.z; for (const d of live) { const dd = Math.hypot(d.x - q.x, d.z - q.z); if (dd < best) { best = dd; tx = d.x; tz = d.z; } }
    if (best > 10 && best < Infinity) { const k = 1.6 * dt / best; q.x += (tx - q.x) * k; q.z += (tz - q.z) * k; q.m.position.x = q.x; q.m.position.z = q.z; } q.m.rotation.y = -Math.atan2(tz - q.z, tx - q.x); }
  if (!(G.frames % 10)) for (const q of [...live, ...mar]) { q.y = deckAt(T, q.x, q.z); q.m.position.y = q.y; }
  for (const q of [...live, ...mar]) { const mv = Math.abs(q.x - (q.px ?? q.x)) + Math.abs(q.z - (q.pz ?? q.z)) > 1e-4; q.px = q.x; q.pz = q.z; animSoldier(q.m.userData.sol, dt, mv); }
  for (const q of mar) if (live.length && rnd() < dt * 0.7) { fireSoldier(q.m.userData.sol); const d = live[(rnd() * live.length) | 0]; T.tilt.updateWorldMatrix(true, false); const a = T.tilt.localToWorld(new THREE.Vector3(q.x, (q.y ?? cap.deckY) + 1.3, q.z)), b = T.tilt.localToWorld(new THREE.Vector3(d.x, (d.y ?? cap.deckY) + 1.1, d.z)); cap.bul.push({ a, b, t: 0.06 }); }
  if (cap.marines > 0 && live.length) { cap.mt += dt * cap.marines * 0.011; while (cap.mt >= 1 && live.some((d) => d.alive)) { cap.mt -= 1; const d = live.filter((x) => x.alive)[(rnd() * live.filter((x) => x.alive).length) | 0]; d.alive = false; } }
  if (cap.fps && cap.hp <= 0) { cap.fps = false; if (document.pointerLockElement) document.exitPointerLock(); log("해병 장교 부상 후송 — 해병대가 전투를 이어갑니다", "bad"); }
  if (!cap.def.some((d) => d.alive)) { captureShip(); return; }
  if (cap.marines <= 0 && !(cap.fps && cap.hp > 0)) capFail("해병대 전멸 — 나포 실패");
}
function capCamera() {
  const T = cap.tgt; setNear(0.3); camera.up.set(0, 1, 0); cap.ads = cap.phase === "deck" && !!rDown; camera.fov += ((cap.ads ? 34 : 62) - camera.fov) * 0.35;
  if (cap.phase === "boats") { const b = cap.boats.find((x) => x.alive); if (!b) return false; camera.position.set(b.p.x - Math.cos(b.hd) * 2.5, 3.0 + b.m.position.y, b.p.z - Math.sin(b.hd) * 2.5); }
  else { T.tilt.updateWorldMatrix(true, false); if (!(G.frames % 6) || cap.eyeY === undefined) cap.eyeT = deckAt(T, cap.me.x, cap.me.z) + 1.65; cap.eyeY = cap.eyeY === undefined ? cap.eyeT : cap.eyeY + (cap.eyeT - cap.eyeY) * 0.3; camera.position.copy(T.tilt.localToWorld(new THREE.Vector3(cap.me.x, cap.eyeY, cap.me.z))); }
  if (G.shake > 0.01) camera.position.y += (Math.random() - 0.5) * G.shake * 0.25;
  camera.updateProjectionMatrix(); camera.lookAt(camera.position.clone().add(dirFrom(cap.yaw, cap.pitch)));
  if (cap.phase === "boats") { mgVM.visible = true; updateMG(cap.kick || 0, cap.flT || 0); } else { garandVM.visible = cap.hp > 0; updateGarand(cap.adsK || 0, cap.kick || 0, cap.rel > 0 ? Math.sin(PI * (1 - cap.rel / 2.2)) : 0, cap.flT || 0); }
  return true;
}
function drawBoardHUD() {
  const W = hud.width, H = hud.height, cx = W / 2, cy = H / 2, T = cap.tgt; hx.textBaseline = "middle";
  if (cap.flash > 0) { hx.fillStyle = `rgba(200,20,10,${cap.flash * 0.9})`; hx.fillRect(0, 0, W, H); }
  hx.strokeStyle = cap.hitT > 0 ? "#ff3b30" : "rgba(255,255,255,.9)"; hx.lineWidth = 2;
  if ((cap.adsK || 0) < 0.6 || cap.phase === "boats") for (const [sx, sy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { hx.beginPath(); hx.moveTo(cx + sx * 6, cy + sy * 6); hx.lineTo(cx + sx * 16, cy + sy * 16); hx.stroke(); }
  if (cap.killT > 0) { hx.globalAlpha = clamp(cap.killT, 0, 1); txt("적 수병 사살", cx, cy - 46, "#ff5a4e", "bold 20px 'Noto Sans KR', sans-serif", "center"); hx.globalAlpha = 1; }
  const pw = 420; panel(cx - pw / 2, H - 84, pw, 70);
  if (cap.phase === "boats") {
    const lv = cap.boats.filter((b) => b.alive), b = lv[0], dist = b ? Math.max(0, d2(b.p, T.pos) - T.spec.B / 2) : 0;
    const q = proj(T.pos.clone().setY(T.spec.fb + 6)); if (q && q.on) txt(`▼ 나포 목표 ${T.name}`, q.x, q.y - 14, "#ffd166", "bold 12px 'Noto Sans KR', sans-serif", "center");
    txt(`상륙정 .30구경 기관총 — 상륙정 ${lv.length}/3 · 해병 ${lv.length * MARINES_PER}명 · 접안까지 ${fmt(dist)} m`, cx, H - 70, "#fff", "bold 12px 'Noto Sans KR', sans-serif", "center");
    hx.fillStyle = "rgba(255,255,255,.1)"; hx.fillRect(cx - 160, H - 52, 320, 7); hx.fillStyle = "#9be06a"; hx.fillRect(cx - 160, H - 52, 320 * cap.supp / 0.85, 7);
    txt(`적 대응사격 제압 ${Math.round((cap.supp / 0.85) * 100)}% — 적함을 쏠수록 상륙정 피해가 줄어듭니다`, cx, H - 34, "#cfd8dc", "11px 'Noto Sans KR', sans-serif", "center");
  } else {
    for (const d of cap.def) { if (!d.alive) continue; const w = T.tilt.localToWorld(new THREE.Vector3(d.x, (d.y ?? cap.deckY) + 2.0, d.z)), q = proj(w); if (q && q.on) { hx.fillStyle = "#ff5a4e"; hx.beginPath(); hx.moveTo(q.x, q.y); hx.lineTo(q.x - 5, q.y - 8); hx.lineTo(q.x + 5, q.y - 8); hx.fill(); } }
    txt(`해병 장교 — 체력 ${Math.round(cap.hp)} · M1 소총 ${cap.rel > 0 ? "재장전 중…" : `${cap.ammo}/8`}`, cx, H - 70, cap.hp < 35 ? "#ff8a7a" : "#fff", "bold 12px 'Noto Sans KR', sans-serif", "center");
    hx.fillStyle = "rgba(255,255,255,.1)"; hx.fillRect(cx - 160, H - 52, 320, 7); hx.fillStyle = cap.hp > 35 ? "#9be06a" : "#ff5a4e"; hx.fillRect(cx - 160, H - 52, 320 * cap.hp / 100, 7);
    txt(`적 잔여 ${cap.def.filter((d) => d.alive).length}명 · 아군 해병 ${cap.marines}명 · 사살 ${cap.kills} — 적을 모두 제압하면 나포`, cx, H - 34, "#cfd8dc", "11px 'Noto Sans KR', sans-serif", "center");
  }
  txt(document.pointerLockElement === canvas ? (cap.phase === "boats" ? "마우스 조준 · 좌클릭/Space 사격 · V 지휘로 복귀(자동 진행)" : "WASD 이동 · Shift 달리기 · 우클릭 정조준 · 좌클릭 사격 · R 재장전 · V 자동 진행") : "화면을 클릭하면 마우스로 조준합니다", cx, H - 100, "#e8f0f2", "12px 'Noto Sans KR', sans-serif", "center");
}
function drawBoardStatus() {
  if (!cap.phase) return; const W = hud.width, T = cap.tgt, w = 340, x = W / 2 - w / 2, y = 86; panel(x, y, w, 40); hx.textBaseline = "middle";
  const s = cap.phase === "boats" ? `상륙정 ${cap.boats.filter((b) => b.alive).length}/3 접근 중 · 제압 ${Math.round((cap.supp / 0.85) * 100)}%` : `갑판 전투 · 적 ${cap.def.filter((d) => d.alive).length} vs 해병 ${cap.marines}`;
  txt(`⚓ 나포 작전 — ${T.name}`, W / 2, y + 13, "#ffd166", "bold 12px 'Noto Sans KR', sans-serif", "center"); txt(`${s} · V: 직접 ${cap.phase === "boats" ? "사수" : "전투"}`, W / 2, y + 29, "#e8f0f2", "11px 'Noto Sans KR', sans-serif", "center");
  for (const b of cap.boats) if (b.alive) { const q = proj(b.m.position.clone().setY(4)); if (q && q.on) { hx.fillStyle = "#7cc4ff"; hx.fillRect(q.x - 3, q.y - 3, 6, 6); } }
}
const effDist = () => (cam.map ? cam.mapDist * 0.55 : cam.dist);
const SPEED_N = ["정지", "미속", "반속", "전속"], SPEED_TELE = [1, 2, 3, 5];
const altDown = () => keys.has("AltLeft") || keys.has("AltRight");
const shiftDown = () => keys.has("ShiftLeft") || keys.has("ShiftRight");
const commanding = () => G.state === "playing" && !paused && !G.auto && G.player && G.player.alive;
const isPlane = (o) => !!(o && o.obj && o.fwd && o.callsign);

// rangekeeper (cf. USN Mk 8): aims where the target will be when the shells land; spotted salvos shrink the error
const fc = { tgt: null, sig: 1, errR: 0, errB: 0, hdg: 0, n: 0 };
function fcDraw() { const k = fc.sig * (G.player ? G.player.dispK : 1); fc.errR = gauss() * 0.012 * k; fc.errB = gauss() * 0.0022 * k; }
function fcSolve(P, T) {
  if (fc.tgt !== T) { fc.tgt = T; fc.n = 0; fc.sig = 1; fc.hdg = T.heading; fcDraw(); }
  if (Math.abs(wrap(T.heading - fc.hdg)) > 14 * DEG) { fc.hdg = T.heading; fc.n = 0; fc.sig = Math.min(fc.sig * 1.8, 1); fcDraw(); }
  const v = T.vel; let x = T.pos.x, z = T.pos.z;
  for (let i = 0; i < 4; i++) { const t = solve(P.tb, Math.hypot(x - P.pos.x, z - P.pos.z)).time; x = T.pos.x + v.x * t; z = T.pos.z + v.z * t; }
  return { b: Math.atan2(z - P.pos.z, x - P.pos.x) + fc.errB, r: Math.hypot(x - P.pos.x, z - P.pos.z) * (1 + fc.errR) };
}
const fcGrade = () => (fc.sig > 0.7 ? "탐색 사격" : fc.sig > 0.35 ? "수렴 중" : "정밀 사격");
const autoAmmo = (P, T) => (!T ? "ap" : T.spec.belt < 130 || P.gun.cal < T.spec.belt * 0.55 ? "he" : "ap");

// ── 3D overlays: gun lines, range arc, max-range ring, course, torpedo fan, splash rings ──
function lineObj(n, mat, segs = false) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); const l = new (segs ? THREE.LineSegments : THREE.Line)(g, mat); l.frustumCulled = false; l.renderOrder = 6; l.visible = false; scene.add(l); return l; }
const gunLines = lineObj(12, new THREE.LineDashedMaterial({ vertexColors: true, dashSize: 30, gapSize: 26, transparent: true, opacity: 0.95, depthTest: false }), true);
gunLines.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(12 * 3), 3));
const arcLine = lineObj(33, new THREE.LineDashedMaterial({ color: 0xfff2c4, dashSize: 20, gapSize: 14, transparent: true, opacity: 0.9, depthTest: false }));
const maxRing = lineObj(129, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 200, gapSize: 160, transparent: true, opacity: 0.25, depthTest: false }));
const navLine = lineObj(10, new THREE.LineDashedMaterial({ color: 0x8ef07a, dashSize: 40, gapSize: 30, transparent: true, opacity: 0.9, depthTest: false }));
const fanLines = lineObj(600, new THREE.LineBasicMaterial({ color: 0x9be06a, transparent: true, opacity: 0.85, depthTest: false }), true);
// map-view grid (1 km squares, coarser when zoomed out)
const GRID_N = 61, mapGrid = lineObj(GRID_N * 4, new THREE.LineBasicMaterial({ color: 0xbfe0ee, transparent: true, opacity: 0.16, depthTest: false }), true);
function updateGrid() {
  const step = cam.mapDist > 26000 ? 2000 : 1000, cx = Math.round(cam.focus.x / step) * step, cz = Math.round(cam.focus.z / step) * step, h = ((GRID_N - 1) / 2) * step, a = mapGrid.geometry.attributes.position.array;
  for (let i = 0; i < GRID_N; i++) { const o = -h + i * step; a.set([cx + o, 1, cz - h, cx + o, 1, cz + h, cx - h, 1, cz + o, cx + h, 1, cz + o], i * 12); }
  mapGrid.geometry.setDrawRange(0, GRID_N * 4); mapGrid.geometry.attributes.position.needsUpdate = true;
}
// bomb tracks: where each of our bombs flew (solid) and is going (dotted), plus the impact marker
const BT_MAX = 900, bombLines = lineObj(BT_MAX * 2, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthTest: false }), true);
bombLines.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(BT_MAX * 6), 3)); bombLines.visible = true;
function updateBombLines() {
  const a = bombLines.geometry.attributes.position.array, c = bombLines.geometry.attributes.color.array; let n = 0;
  const seg = (p, q, r, g, b) => { if (n >= BT_MAX) return; a.set([p.x, p.y, p.z, q.x, q.y, q.z], n * 6); c.set([r, g, b, r, g, b], n * 6); n++; };
  for (const tr of air.bombTrails) { const k = clamp(tr.t / 3, 0, 1); for (let i = 1; i < tr.pts.length; i++) seg(tr.pts[i - 1], tr.pts[i], 1 * k, 0.55 * k, 0.2 * k); }
  for (const b of air.bombs) { if (b.side !== "us") continue;
    for (let i = 1; i < b.trail.length; i++) seg(b.trail[i - 1], b.trail[i], 1, 0.62, 0.25); seg(b.trail[b.trail.length - 1], b.p, 1, 0.62, 0.25);
    const p = b.p.clone(), v = b.v.clone(); let i = 0; while (p.y > 0 && i++ < 120) { const q = p.clone(); for (let k = 0; k < 2; k++) { v.y -= 9.81 * 0.05; v.multiplyScalar(1 - 0.03 * 0.05); p.addScaledVector(v, 0.05); } if (i % 2) seg(q, p, 1, 0.9, 0.5); } }
  bombLines.geometry.setDrawRange(0, n * 2); bombLines.geometry.attributes.position.needsUpdate = true; bombLines.geometry.attributes.color.needsUpdate = true;
}
G.onBombImpact = (pos, hit, miss, from) => {
  const k = markers[markerN++ % markers.length]; k.t = 9; k.pos = pos.setY(0.8); k.hit = hit; k.text = hit ? `폭탄 명중${from ? ` (${from.callsign})` : ""}` : `폭탄 빗나감 ${miss} m`;
  k.m.position.copy(k.pos); k.m.scale.setScalar(26); k.m.material.color.setHex(hit ? 0xff6b5e : 0xffb347); k.m.visible = true;
};
const navRings = []; { const g = new THREE.RingGeometry(0.82, 1, 40); g.rotateX(-PI / 2); for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x8ef07a, transparent: true, opacity: 0.8, depthTest: false })); m.visible = false; m.renderOrder = 6; scene.add(m); navRings.push(m); } }
const markers = []; { const g = new THREE.RingGeometry(0.8, 1, 40); g.rotateX(-PI / 2);
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, depthTest: false })); m.visible = false; m.renderOrder = 4; scene.add(m); markers.push({ m, t: 0, text: "", hit: false }); } }
let markerN = 0;
G.onImpact = (pos, dr, hit, rec) => {
  const k = markers[markerN++ % markers.length]; k.t = 6; k.pos = pos.setY(0.8); k.hit = hit; k.text = hit ? "명중" : (Math.abs(dr) < 60 ? "협차" : dr > 0 ? "원탄 +" + fmt(dr) : "근탄 −" + fmt(-dr));
  k.m.position.copy(k.pos); k.m.scale.setScalar(G.player ? G.player.gun.cal / 406 * 28 + 8 : 20); k.m.material.color.setHex(hit ? 0xff6b5e : Math.abs(dr) < 150 ? 0x9be06a : 0xffe066); k.m.visible = true;
  if (rec && fc.tgt && fc.tgt.alive) { fc.n++; fc.sig = Math.max(fc.sig * 0.5, 0.2); fcDraw(); }
};
const TCOL3 = { dead: 0x000000, reload: 0x8a959b, arc: 0xff6b5e, turn: 0xffd166, ready: 0x8ef07a };
const tState = (t) => (!t.alive ? "dead" : t.reload > 0 ? "reload" : !t.inArc ? "arc" : t.onTarget ? "ready" : "turn");
const col = new THREE.Color();
function updateOverlays(dt) {
  const P = G.player, on = G.state === "playing" && P && P.alive && !G.auto && !G.plane;
  gunLines.visible = arcLine.visible = maxRing.visible = on && weapon === "gun"; fanLines.visible = on && weapon === "torp" && !!P?.spec.torp;
  for (const k of markers) { if (k.t <= 0) continue; k.t -= dt; k.m.material.opacity = clamp(k.t / 2, 0, 0.9); if (k.t <= 0) k.m.visible = false; }
  const nav = on && P.nav.length; navLine.visible = !!nav; for (let i = 0; i < navRings.length; i++) navRings[i].visible = !!nav && i < P.nav.length;
  if (!on) return;
  if (nav) {
    const a = navLine.geometry.attributes.position.array; a.set([P.pos.x, 2, P.pos.z], 0); let n = 1;
    for (const w of P.nav.slice(0, 9)) { a.set([w.x, 2, w.z], n * 3); n++; }
    navLine.geometry.setDrawRange(0, n); navLine.geometry.attributes.position.needsUpdate = true; navLine.computeLineDistances();
    const s = clamp(effDist() * 0.018, 25, 600); P.nav.slice(0, 8).forEach((w, i) => { navRings[i].position.set(w.x, 1.5, w.z); navRings[i].scale.setScalar(s * (1 + 0.15 * Math.sin(G.time * 4))); });
  }
  if (weapon === "gun") {
    const a = gunLines.geometry.attributes.position.array, c = gunLines.geometry.attributes.color.array; let n = 0;
    for (const t of P.turrets) {
      if (!t.alive) continue; const tp = P.turretPos(t), b = P.heading + t.rest + t.d, r = t.inArc ? t.range : Math.min(t.range, P.aimR) * 0.5;
      a.set([tp.x, tp.y + 1, tp.z, tp.x + Math.cos(b) * r, 1, tp.z + Math.sin(b) * r], n * 6); col.setHex(TCOL3[tState(t)]); c.set([col.r, col.g, col.b, col.r, col.g, col.b], n * 6); n++;
    }
    gunLines.geometry.setDrawRange(0, n * 2); gunLines.geometry.attributes.position.needsUpdate = true; gunLines.geometry.attributes.color.needsUpdate = true; gunLines.computeLineDistances();
    const sc = clamp(effDist() / 1300, 0.4, 12); gunLines.material.dashSize = 30 * sc; gunLines.material.gapSize = 26 * sc;
    const arc = arcLine.geometry.attributes.position.array, span = clamp(600 / P.aimR, 0.02, 0.12);
    for (let i = 0; i <= 32; i++) { const b = P.aimB + (i / 32 - 0.5) * 2 * span; arc.set([P.pos.x + Math.cos(b) * P.aimR, 1.5, P.pos.z + Math.sin(b) * P.aimR], i * 3); }
    arcLine.geometry.setDrawRange(0, 33); arcLine.geometry.attributes.position.needsUpdate = true; arcLine.computeLineDistances(); arcLine.material.dashSize = 20 * sc; arcLine.material.gapSize = 14 * sc;
    const mr = maxRing.geometry.attributes.position.array;
    for (let i = 0; i <= 128; i++) { const b = (i / 128) * TAU; mr.set([P.pos.x + Math.cos(b) * P.tb.max, 1, P.pos.z + Math.sin(b) * P.tb.max], i * 3); }
    maxRing.geometry.setDrawRange(0, 129); maxRing.geometry.attributes.position.needsUpdate = true; maxRing.computeLineDistances();
  } else if (P.spec.torp) {
    const T = P.spec.torp, a = fanLines.geometry.attributes.position.array, { arc, m } = torpMount(P, torpB);
    fanLines.material.color.setHex(!arc ? 0xff6b5e : m ? 0x9be06a : 0xffd166);
    const mx = (P.torps?.[0]?.x || 0), f = P.fwd, sx = P.pos.x + f.x * mx, sz = P.pos.z + f.z * mx, tube = tubeBearing(P.heading, torpB); let nv = 0;
    for (let i = 0; i < T.n; i++) { const pts = torpPath(sx, sz, tube, wrap(torpB + (i - (T.n - 1) / 2) * TORP_SPREAD), T.range);
      for (let j = 0; j + 1 < pts.length && nv < 598; j++) { a.set([pts[j][0], 1, pts[j][1], pts[j + 1][0], 1, pts[j + 1][1]], nv * 3); nv += 2; } }
    fanLines.geometry.setDrawRange(0, nv); fanLines.geometry.attributes.position.needsUpdate = true;
  }
}

// ── player orders ───────────────────────────────────────────────────────────
function setSpeed(lv) { const P = G.player; P.lv = lv; if (lv) P.lastLv = lv; sfx.bell(); log(`속력: ${SPEED_N[lv]}`); }
// ── RTS-style fleet selection: drag a box (or click) over our ships, right-click to send each one ──
let sel = [];
const selectable = () => [G.player, ...G.allies].filter((s) => s && s.alive);
function setSel(list, add) { sel = add ? [...new Set([...sel, ...list])] : list; sel = sel.filter((s) => s.alive); if (sel.length) { sfx.click(); toast(sel.length === 1 ? `${sel[0].isPlayer ? "기함 " : ""}${sel[0].name} 선택 — 우클릭: 이동${sel[0].isPlayer ? "" : " · 사격: 내 표적으로 함께 발사"}` : `함선 ${sel.length}척 선택 — 우클릭: 이동 · 사격: 내 표적·사선으로 함께 발사`); } }
function boxSelect(x0, y0, x1, y1, add) {
  const a = Math.min(x0, x1), b = Math.max(x0, x1), c = Math.min(y0, y1), d = Math.max(y0, y1);
  setSel(selectable().filter((s) => { const q = proj(s.pos.clone().setY(s.spec.fb)); return q && q.x >= a && q.x <= b && q.y >= c && q.y <= d; }), add);
}
function clickSelect(x, y, add) { const h = pick(x, y); if (h && h.ship && h.ship.side === "us" && selectable().includes(h.ship)) setSel([h.ship], add); else if (!add && sel.length) { sel = []; } }
function orderSelected(h, add) {
  const list = sel.filter((s) => s.alive);
  if (!list.length || (list.length === 1 && list[0].isPlayer)) { moveOrder(h.x, h.z, add); return; }
  if (h.ship && h.ship.isPlayer && !list.includes(h.ship)) { for (const s of list) { s.order = null; } sfx.bell(); log(`${list.length}척 기함 호위 복귀`); return; }
  const cx = list.reduce((n, s) => n + s.pos.x, 0) / list.length, cz = list.reduce((n, s) => n + s.pos.z, 0) / list.length;
  for (const s of list) { const x = h.x + (s.pos.x - cx) * 0.6, z = h.z + (s.pos.z - cz) * 0.6; if (s.isPlayer) moveOrder(x, z, add); else s.order = { x, z }; }
  sfx.click(); log(`${list.length}척 이동 명령`);
}
function drawSel() {
  if (lDown && lDown.box) { hx.strokeStyle = "#9be06a"; hx.lineWidth = 1; hx.setLineDash([4, 3]); hx.strokeRect(lDown.x, lDown.y, mouseX - lDown.x, mouseY - lDown.y); hx.setLineDash([]); hx.fillStyle = "rgba(155,224,106,.08)"; hx.fillRect(lDown.x, lDown.y, mouseX - lDown.x, mouseY - lDown.y); }
  sel = sel.filter((s) => s.alive);
  for (const s of sel) { const q = proj(s.pos.clone().setY(2)); if (!q) continue; const r = clamp(9000 / Math.max(300, effDist()) * s.spec.L / 100, 10, 60);
    hx.strokeStyle = "#9be06a"; hx.lineWidth = 2; hx.beginPath(); hx.ellipse(q.x, q.y, r, r * 0.55, 0, 0, TAU); hx.stroke();
    if (s.order) { const t = proj(new THREE.Vector3(s.order.x, 2, s.order.z)); if (t) { hx.setLineDash([5, 5]); hx.beginPath(); hx.moveTo(q.x, q.y); hx.lineTo(t.x, t.y); hx.stroke(); hx.setLineDash([]); hx.beginPath(); hx.arc(t.x, t.y, 5, 0, TAU); hx.stroke(); } } }
}
function moveOrder(x, z, add) {
  const P = G.player, onShip = d2(P.pos, { x, z }) < P.spec.L * 0.6;
  if (onShip && !add) { P.nav.length = 0; P.lv = 0; sfx.bell(); log("정지 명령"); return; }
  if (!add) P.nav.length = 0; if (P.nav.length < 8) P.nav.push({ x, z, t: 0 });
  if (!P.lv) P.lv = P.lastLv || 3; sfx.click();
  if (!add) log(`이동 명령 — ${(d2(P.pos, { x, z }) / 1000).toFixed(1)} km, 방위 ${brg(Math.atan2(z - P.pos.z, x - P.pos.x))}`);
}
function aimAtPoint(x, z) { const P = G.player; lock = null; corrR = corrB = 0; if (weapon === "torp") { torpB = Math.atan2(z - P.pos.z, x - P.pos.x); return; } P.aimB = Math.atan2(z - P.pos.z, x - P.pos.x); P.aimR = clamp(Math.hypot(x - P.pos.x, z - P.pos.z), P.tb.min, P.tb.max); }
function lockShip(T) {
  if (lock === T) { lock = null; corrR = corrB = 0; sfx.click(); toast("표적 고정 해제"); return; }
  lock = T; corrR = corrB = 0; sfx.click(); toast(`표적 고정: ${T.name} — 사격통제가 리드를 자동 계산 (W/S·A/D: 보정)`);
}
function navStep(dt) {
  const P = G.player; if (!P.alive || G.auto) return;
  let lv = P.lv;
  if (P.nav.length) {
    const w = P.nav[0], dx = w.x - P.pos.x, dz = w.z - P.pos.z, d = Math.hypot(dx, dz), err = wrap(Math.atan2(dz, dx) - P.heading);
    P.rudderCmd = clamp(err * 2.4, -1, 1); w.t += dt;
    const last = P.nav.length === 1, arrive = Math.max(P.spec.L * 0.7, 140);
    if (d < arrive || w.t > 160) { P.nav.shift(); if (last) { P.lv = 0; lv = 0; log("목적지 도착 — 정지"); sfx.bell(); } }
    else if (last && d < Math.abs(P.speed) * 24 + P.spec.L) lv = Math.min(lv, 1);
  } else P.rudderCmd = 0;
  P.tele = SPEED_TELE[lv];
}
function gunStep(dt) {
  const P = G.player; if (!P.alive || G.auto || G.plane || md.fly) return; // flying a jet: W/S/A/D belong to the aircraft
  const k = shiftDown() ? 0.25 : 1, turn = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0), rng = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
  if (lock && (!lock.alive || !lock.root.visible)) { if (lock.alive) log("표적을 시야에서 놓쳤습니다"); lock = null; corrR = corrB = 0; }
  const torp = weapon === "torp" && P.spec.torp;
  torpLead = null;
  if (torp) { // torpedo bearing is its own solution: intercept course for a slow running weapon (gun line keeps its own aim)
    if (lock) { const ip = intercept(P.pos, P.spec.torp.v * KN, lock); if (ip) { torpLead = ip; torpB = wrap(Math.atan2(ip.z - P.pos.z, ip.x - P.pos.x) + corrB); } corrB = clamp(corrB + turn * 0.8 * DEG * dt * k, -6 * DEG, 6 * DEG); }
    else torpB = wrap(torpB + turn * 24 * DEG * dt * k);
  }
  if (lock) {
    if (!torp) { corrB = clamp(corrB + turn * 0.8 * DEG * dt * k, -4 * DEG, 4 * DEG); corrR = clamp(corrR + rng * 500 * dt * k, -2500, 2500); }
    const s = fcSolve(P, lock); P.aimB = s.b + (torp ? 0 : corrB); P.aimR = clamp(s.r + corrR, P.tb.min, P.tb.max);
  } else if (!torp) {
    P.aimB = wrap(P.aimB + turn * 24 * DEG * dt * k);
    P.aimR = clamp(P.aimR + rng * P.tb.max * 0.16 * dt * k, P.tb.min, P.tb.max);
  }
  if (autoFire && P.spec.torp && !aa.on) { // auto torpedo: launch on an intercept course when a target is well inside torpedo range
    let T = lock; if (!T) { let best = Infinity; for (const e of seenFoes()) { const d = d2(e.pos, P.pos); if (d < best) { best = d; T = e; } } }
    if (T) { const ip = intercept(P.pos, P.spec.torp.v * KN, T); if (ip && Math.hypot(ip.x - P.pos.x, ip.z - P.pos.z) < P.spec.torp.range * 0.95) { const b = Math.atan2(ip.z - P.pos.z, ip.x - P.pos.x) + gauss() * 0.01; if (fireTorps(P, b)) { sfx.torpLaunch(); G.radio("torp_launch"); log(`자동 어뢰 ${P.spec.torp.n}발 발사 → ${T.name}`); } } }
  }
  if (autoFire && !aa.on) { // computer gunnery: track the locked (or nearest visible, in range) enemy and fire when the guns bear
    let T = lock; if (!T) { let best = Infinity; for (const e of seenFoes()) { const d = d2(e.pos, P.pos); if (d < P.tb.max * 0.97 && d < best) { best = d; T = e; } } }
    if (T && !lock) { const s2 = fcSolve(P, T); P.aimB = s2.b; P.aimR = clamp(s2.r, P.tb.min, P.tb.max); }
    if (T && P.turrets.some((t) => t.alive && t.reload <= 0 && t.onTarget)) { P.ammo = autoAmmo(P, T); P.fire(); }
  }
  P.ammo = autoAmmo(P, lock || G.enemy);
  if (keys.has("Space") && !aa.on && weapon === "gun") for (const a of sel) if (!a.isPlayer) a.holdT = Math.max(a.holdT || 0, 0.3);
  if (keys.has("Space") && !aa.on && weapon === "gun" && P.turrets.some((t) => t.alive && t.reload <= 0 && t.onTarget)) P.fire();
  if (fireHold > 0) { fireHold -= dt; if (P.fire()) fireHold = Math.min(fireHold, 0.5); }
}
function tryFire() {
  if (!commanding() || G.plane) return; const P = G.player;
  if (weapon === "torp") {
    const { arc } = torpMount(P, torpB);
    if (fireTorps(P, torpB)) { sfx.torpLaunch(); G.radio("torp_launch"); log(`어뢰 ${P.spec.torp.n}발 발사 — 방위 ${brg(torpB)}`); }
    else { sfx.deny(); log(!arc ? "어뢰 발사각 밖 — 측면(25°~155°)으로 사선을 돌리세요" : `어뢰 장전 중 — ${Math.ceil(Math.min(...P.torps.map((t) => t.reload)))}초`); }
    return;
  }
  const allies = sel.filter((a) => !a.isPlayer && a.alive); for (const a of allies) a.holdT = 6; if (allies.length) log(`선택 함선 ${allies.length}척 동시 포격 — ${lock && lock.alive ? lock.name : "사선 지점"}`);
  if (!P.fire()) { const any = P.turrets.some((t) => t.alive && t.reload <= 0 && t.inArc); if (any) { fireHold = 6; } else { const al = P.turrets.filter((t) => t.alive); log(al.some((t) => t.reload <= 0) ? "사각 밖 — 사선을 함선 측면으로" : `장전 중 — ${Math.ceil(Math.min(...al.map((t) => t.reload)))}초`); sfx.deny(); } }
}
function useRepair() {
  const P = G.player; if (rep.cd > 0 || rep.n <= 0 || !P.alive) { sfx.deny(); toast(rep.n <= 0 ? "수리반을 모두 사용했습니다" : `수리반 준비 중 — ${Math.ceil(rep.cd)}초`); return; }
  rep.n--; rep.cd = 60; rep.act = 20; P.fires.length = 0; P.flooding = 0; P.engine = Math.max(P.engine, 0.7); sfx.bell();
  const broken = P.turrets.filter((t) => !t.alive); broken.forEach((t, i) => { t.fixT = 12 + i * 3; });
  log(`수리반 가동 — 화재·침수 진압, 선체 복구${broken.length ? ` · 포탑 ${broken.length}기 수리 착수` : ""} (남은 ${rep.n}회)`);
}
function sortie() {
  if (G.state !== "playing" || G.auto) return;
  if (G.plane) { recallPlane(); leaveFlight(); return; }
  const err = launchPlane(true, "us", sortieRole); if (err) { toast(err); sfx.deny(); return; } G.radio("launch");
  const p = air.planes[air.planes.length - 1]; toast(`${p.label} 출격 — 임무: ${ROLE_NAMES[sortieRole]} · 오른쪽 항공대 패널에서 임무 변경`, 3.2);
}
// ── air group panel: sortie role, each fighter's mission, camera ───────────
let sortieRole = "auto", airSig = "";
function recall(p) { if (!p.alive || p === G.plane) return; p.mode = "home"; p.bandit = null; p.recalled = true; sfx.click(); log(`${p.label} 귀환 명령`); airSig = ""; }
function setRole(p, r) { if (p.mode === "home" && p.hp >= 30 && (p.ammo > 0 || p.bombs > 0)) { p.mode = r === "fighter" ? "cap" : "climb"; p.recalled = false; } p.role = r; if (r === "strike" && (p.mode === "dogfight" || p.mode === "cap")) { p.mode = "climb"; p.bandit = null; } if (r === "fighter" && /climb|dive|extend/.test(p.mode)) p.mode = "cap"; sfx.click(); log(`${p.label} 임무 변경: ${ROLE_NAMES[r]}`); airSig = ""; }
function missionLine() { return G.mission === "convoy" ? `수송선 ${G.convoy.filter((c) => c.alive).length}/3 · 도착 ${G.convoy.filter((c) => c.arrived).length}` : G.mission === "raid" ? `정박 함선 ${G.convoy.filter((c) => c.alive).length}/3 · 남은 공습 ${G.events.length}파` : ""; }
const pSig = {};
function setHTML(sel, h) { if (pSig[sel] === h) return; pSig[sel] = h; $(sel).innerHTML = h; }
function updatePanels() {
  const P = G.player; if (!P) return;
  const hp = P.hp / P.maxHp, hc = hp > 0.5 ? "ok" : hp > 0.25 ? "warn" : "bad", pct = Math.round(hp * 100), lbl = ["STOP", "SLOW", "HALF", "FULL"];
  setHTML("#shipCard", `<div class="row">${flagOf(P, 26)}<b class="st" style="font-size:15.5px">${ENG[P.spec.id] || P.spec.name}</b><span class="pct ${hc}">${pct}%</span></div>`
    + `<div class="sub">함장 ${P.captain || ""} · 사령관 ${ECON_RANKS[myRank()]} ${cmdr.name}</div><div class="hbar"><i class="${hc}" style="width:${pct}%"></i></div>`
    + `<div class="row"><b class="tw" style="font-size:21px">${(P.speed / KN).toFixed(0)} kn</b><span class="sub">${kmh(P.speed)} km/h · ${brg(P.heading)}</span><div class="pips">${[0, 1, 2, 3].map((i) => `<button data-speed="${i}" class="${P.lv === i ? "on" : ""}">${i}${i === P.lv ? " " + lbl[i] : ""}</button>`).join("")}</div></div>`
    + `<div class="chips"><span class="chip${P.fires.length ? " fire" : ""}">화재 ${P.fires.length}</span><span class="chip${P.flooding ? " flood" : ""}">침수 ${P.flooding}</span><span class="chip ${P.seenByFoe ? "bad" : "ok"}">${P.seenByFoe ? "◉ 발각" : "○ 은폐"}</span><button class="chip r" data-act="repair">${rep.act > 0 ? "수리 중" : rep.cd > 0 ? `R ${Math.ceil(rep.cd)}s` : `R 수리 ×${rep.n}`}</button></div>`
    + `<div class="sub">${P.nav.length ? `이동 중 — ${(d2(P.pos, P.nav[P.nav.length - 1]) / 1000).toFixed(1)} km` : "우클릭: 이동 지점"}</div>`);
  const T = lock || G.enemy, tc = $("#tgtCard");
  if (T && T.alive && T.root.visible && !G.auto) {
    tc.classList.remove("off");
    setHTML("#tgtCard", `<div class="row">${flagOf(T, 24)}<span class="st" style="font-size:15px">${lock ? "◆ " : ""}TARGET — ${T.isCarrier ? "항모" : T.spec.cls} ${T.name}</span><span class="km">${(d2(P.pos, T.pos) / 1000).toFixed(1)} KM</span></div>`
      + `<div class="hbar"><i style="width:${Math.round((T.hp / T.maxHp) * 100)}%"></i></div><div class="sub tw" style="font-size:11.5px"><span>함장 ${T.captain || ""}</span><span>${P.ammo === "he" ? "HE" : "AP"} · ${lock ? fcGrade() : "더블클릭: 고정"}</span></div>${canBoard(T) ? "" : `<div class="sub" style="font-size:11.5px;color:#ffd166">⚓ B · 나포 가능 — 해병대 상륙정 발진</div>`}`);
  } else tc.classList.add("off");
  const torp = P.spec.torp, st = (t) => (!t.alive ? (t.fixT > 0 ? "reload" : "dead") : t.reload > 0 ? "reload" : !t.inArc ? "arc" : t.onTarget ? "ready" : "turn");
  const tur = P.turrets.map((t) => { const k = st(t); return `<i><b style="width:${t.alive ? Math.round((1 - t.reload / P.reloadT) * 100) : 100}%;background:${TCOL[k]}"></b></i>`; }).join("");
  const tReady = torp ? P.torps.filter((m) => m.reload <= 0).length : 0;
  if (G.modern) { setHTML("#wpnBar", modernBar()); return; }
  setHTML("#wpnBar", `<button class="slot main g${weapon === "gun" ? " on" : ""}" data-key="KeyQ"><span class="t">1 · MAIN ${GUNS[P.spec.gun].name.split(" ")[0]}</span><span class="v">${P.ammo === "he" ? "HE" : "AP"} AUTO · ${P.turrets.filter((t) => t.alive && t.reload <= 0).length}/${P.turrets.filter((t) => t.alive).length} READY</span><span class="tur">${tur}</span></button>`
    + `<button class="slot g${weapon === "torp" ? " on" : ""}" data-key="KeyQ"><span class="t">Q · TORP</span><span class="v">${torp ? `${tReady}/${P.torps.length} READY` : "N/A"}</span><span class="ln${tReady ? " ok" : ""}"></span></button>`
    + `<button class="slot g${aa.on ? " on" : ""}" data-key="KeyG"><span class="t">G · AA</span><span class="v">${aa.on ? (aa.ammo === "flak" ? "대공탄" : "기관포") : "GUNNER"}</span><span class="ln ok"></span></button>`
    + `<button class="slot g${cap.phase ? " on" : ""}" data-key="${cap.phase ? "KeyV" : "KeyB"}"><span class="t">B · 나포</span><span class="v">${cap.phase ? (cap.phase === "boats" ? "상륙정 접근" : "갑판 전투") : profile.admin && !cap.phase ? "관리자 · 무제한" : cap.used >= CAP_MAX ? "소진" : canBoard(lock || G.enemy) ? `${CAP_MAX - cap.used}회 남음` : "가능!"}</span><span class="ln${cap.phase || !canBoard(lock || G.enemy) ? " ok" : ""}"></span></button>`
    + `<button class="slot auto g${autoFire ? " on" : ""}" data-key="KeyZ"><span class="t">Z · AUTO</span><span class="v">${autoFire ? "ON" : "OFF"}</span><span class="ln${autoFire ? " ok" : ""}"></span></button>`);
}
$("#wpnBar").addEventListener("mousedown", (e) => e.stopPropagation());
$("#wpnBar").addEventListener("click", (e) => { const b = e.target.closest("[data-key]"); if (!b) return; e.stopPropagation(); window.dispatchEvent(new KeyboardEvent("keydown", { code: b.dataset.key })); setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { code: b.dataset.key })), 0); });
$("#shipCard").addEventListener("mousedown", (e) => e.stopPropagation());
$("#shipCard").addEventListener("click", (e) => { e.stopPropagation(); const b = e.target.closest("[data-speed],[data-act]"); if (!b || !commanding()) return; if (b.dataset.speed) setSpeed(+b.dataset.speed); else useRepair(); });
function renderAirPanel() {
  const el = $("#airP"); if (!el) return;
  const ps = air.planes.filter((p) => p.side === "us" && !p.crashed), foeN = air.planes.filter((p) => p.side === "foe" && p.alive).length;
  const camName = cam.free ? "자유 카메라 · C: 기함으로" : `카메라: ${!cam.tgt ? "기함" : isPlane(cam.tgt) ? cam.tgt.callsign : cam.tgt.name}${cam.map ? " · 지도" : ""} · Tab`;
  const sig = JSON.stringify([G.squad, Math.ceil(G.planeCD), sortieRole, camName, missionLine(), foeN, !!G.carrier?.alive, ps.map((p) => [p.callsign, p.role, p.activity, Math.round(p.hp / 10), p.ammo, p.bombs, p === G.plane, p.kills])]);
  if (sig === airSig) return; airSig = sig;
  const rb = (cur, val, attrs) => `<button class="rb${cur === val ? " on" : ""}" ${attrs}>${ROLE_NAMES[val]}</button>`;
  let h = `<div class="ah"><b>항공대 · 렉싱턴</b><span>대기 ${G.squad}${G.refit?.length ? ` · 정비 ${G.refit.length}` : ""} · 비행 ${ps.length}${foeN ? ` · <i>적기 ${foeN}</i>` : ""}</span></div>`;
  h += `<div class="ar">출격 임무 ${["auto", "fighter", "strike"].map((r) => rb(sortieRole, r, `data-def="${r}"`)).join("")}</div>`;
  h += `<button class="sortie"${!G.carrier?.alive || !G.squad || G.planeCD > 0 ? " disabled" : ""} data-act="sortie">${!G.carrier?.alive ? "렉싱턴 침몰" : !G.squad ? "대기 전투기 없음" : G.planeCD > 0 ? `사출 준비 ${Math.ceil(G.planeCD)}초` : `F 출격 (${ROLE_NAMES[sortieRole]})`}</button>`;
  if (ps.length) h += `<div class="ar all">전체 ${["fighter", "strike"].map((r) => `<button class="rb" data-all="${r}">${ROLE_NAMES[r]}</button>`).join("")}<button class="rb home" data-allhome="1">귀환</button></div>`;
  for (const p of ps) h += `<div class="pl${p === cam.tgt ? " sel" : ""}"><div class="pn" data-cam="${p.callsign}">${p.callsign.replace("와일드캣 ", "WC-")} · ${p.pilot || ""}<small>${p === G.plane ? "직접 조종" : !p.alive ? "격추됨" : p.activity} · ${Math.round(p.hp)}% · 폭탄 ${p.bombs}${p.kills ? ` · 격추 ${p.kills}` : ""}</small></div>${p === G.plane || !p.alive ? "" : ["fighter", "strike", "auto"].map((r) => rb(p.mode === "home" ? "" : p.role, r, `data-p="${p.callsign}" data-r="${r}"`)).join("") + `<button class="rb home${p.mode === "home" ? " on" : ""}" data-home="${p.callsign}">귀환</button>`}</div>`;
  h += `<div class="cm">${camName}</div>`; if (missionLine()) h += `<div class="ms2">${missionLine()}</div>`;
  el.innerHTML = h;
}
$("#airP").addEventListener("mousedown", (e) => e.stopPropagation());
$("#autoBtn").addEventListener("click", (e) => { e.stopPropagation(); window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ" })); setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyZ" })), 0); });
function syncAutoBtn() { const b = $("#autoBtn"), t = autoFire ? `자동 공격 켜짐 — 주포${G.player?.spec.torp ? "·어뢰" : ""} (Z)` : "자동 공격 꺼짐 (Z)"; if (b.textContent !== t) b.textContent = t; b.classList.toggle("on", autoFire); }
$("#airP").addEventListener("click", (e) => {
  e.stopPropagation(); const b = e.target.closest("[data-def],[data-p],[data-all],[data-allhome],[data-home],[data-cam],[data-act]"); if (!b || b.disabled || G.state !== "playing") return;
  const find = (cs) => air.planes.find((p) => p.callsign === cs && !p.crashed);
  if (b.dataset.def) { sortieRole = b.dataset.def; sfx.click(); airSig = ""; }
  else if (b.dataset.act === "sortie") sortie();
  else if (b.dataset.allhome) { for (const p of air.planes) if (p.side === "us" && !p.crashed && p.alive && p !== G.plane) recall(p); }
  else if (b.dataset.home) { const p = find(b.dataset.home); if (p) recall(p); }
  else if (b.dataset.all) { for (const p of air.planes) if (p.side === "us" && !p.crashed && p !== G.plane) setRole(p, b.dataset.all); }
  else if (b.dataset.p) { const p = find(b.dataset.p); if (p) setRole(p, b.dataset.r); }
  else if (b.dataset.cam) { const p = find(b.dataset.cam); if (p) { cam.tgt = p; cam.free = false; cam.map = false; cam.pYaw = 0; sfx.click(); airSig = ""; } }
});
function enterFlight(p) { if (aa.on) toggleAA(false); if (!takeControl(p)) { sfx.deny(); return; } document.body.classList.add("flying"); air.cockpit = false; lockOn = null; cam.tgt = p; toast("직접 조종 — 화면 클릭 후 마우스로 비행 · Enter: 자동 조종 복귀", 3); }
function leaveFlight() { document.body.classList.remove("flying"); if (document.pointerLockElement) document.exitPointerLock(); cockpit.visible = false; }
function cycleCam() {
  const L = [null, ...air.planes.filter((p) => p.side === "us" && !p.crashed)]; if (G.carrier?.alive) L.push(G.carrier); const T = lock || G.enemy; if (T && T.alive && T.root.visible) L.push(T);
  const i = L.indexOf(cam.tgt); cam.tgt = L[(i + 1) % L.length]; cam.free = false; if (isPlane(cam.tgt)) cam.map = false; sfx.click();
  if (isPlane(cam.tgt)) { cam.pYaw = 0; toast(`카메라: ${cam.tgt.label} — Enter: 직접 조종`); } else toast(`카메라: ${cam.tgt ? cam.tgt.name : "본함"}`);
}
function toAuto() {
  if (G.auto || G.state !== "playing" || !G.player?.alive) return;
  if (G.plane) { planeAuto(); leaveFlight(); } if (aa.on) toggleAA(false); if (cap.fps) toggleCapFps(false);
  G.auto = true; document.body.classList.add("auto"); autoFire = false; log("자동 전투로 전환 — 관전 중 (Enter: 직접 지휘)"); toast("자동 전투 — Enter 또는 버튼으로 다시 직접 지휘");
}
function takeOver() { G.auto = false; document.body.classList.remove("auto"); G.player.nav = []; G.player.lv = 3; log("직접 지휘로 전환"); }
function setPause(on) {
  if (G.state !== "playing" && G.state !== "ending") return; paused = on; $("#pause").style.display = on ? "grid" : "none"; $("#pause").classList.remove("menuset"); $("#pause h1").textContent = "일시정지"; $("#resumeBtn").textContent = "계속 (P)";
  if (on && document.pointerLockElement) document.exitPointerLock();
}
function forfeit(dest) { paused = false; if (G.plane) recallPlane(); cockpit.visible = false; G.state = "menu"; toast("전투 포기 — 보상 없음"); if (dest === "yard") openYard(); else openMenu(); }
function start(spectate) {
  initAudio(); bgm("battle"); G.auto = spectate === true; newBattle(); G.state = "playing"; screen = "battle";
  hideAll(); $("#topbar").style.display = "none"; document.body.classList.add("playing"); document.body.classList.toggle("auto", G.auto); document.body.classList.toggle("modern", !!G.modern);
}

// ── picking: screen point → sea point / ship ───────────────────────────────
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function rayShip(o, d, S) {
  const c = Math.cos(S.heading), sn = Math.sin(S.heading), ox = o.x - S.pos.x, oz = o.z - S.pos.z;
  const lo = [ox * c + oz * sn, o.y, -ox * sn + oz * c], ld = [d.x * c + d.z * sn, d.y, -d.x * sn + d.z * c];
  const mn = [-S.spec.L / 2 - 20, 0, -S.spec.B / 2 - 20], mx = [S.spec.L / 2 + 20, S.spec.fb + S.spec.L * 0.08, S.spec.B / 2 + 20];
  let t0 = 0, t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(ld[i]) < 1e-9) { if (lo[i] < mn[i] || lo[i] > mx[i]) return Infinity; continue; }
    let a = (mn[i] - lo[i]) / ld[i], b = (mx[i] - lo[i]) / ld[i]; if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return Infinity;
  }
  return t0;
}
function pick(sx, sy) {
  ndc.set((sx / innerWidth) * 2 - 1, -(sy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction; let t = d.y < -1e-5 ? -o.y / d.y : Infinity, ship = null;
  for (const S of G.ships) { if (!S.alive || !S.root.visible) continue; const tt = rayShip(o, d, S); if (tt < t) { t = tt; ship = S; } }
  // forgiving: a click near a small/distant enemy counts as on it
  if (!isFinite(t)) return null;
  const x = o.x + d.x * t, z = o.z + d.z * t;
  if (!ship) { let best = Math.max(250, effDist() * 0.06); for (const e of seenFoes()) { const dd = d2(e.pos, { x, z }); if (dd < best) { best = dd; ship = e; } } }
  return { x, z, ship };
}
function plotPick(e) { const r = plot.getBoundingClientRect(), k = plot.width / r.width, px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k; const c = plot.width / 2, f = (c - py) / plotSc, s = (px - c) / plotSc, P = G.player, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw); return { x: P.pos.x + f * cy - s * sy, z: P.pos.z + f * sy + s * cy }; }

// ── input events ────────────────────────────────────────────────────────────
function steer(dx, dy) { air.aimYaw = wrap(air.aimYaw + dx * 0.0022); air.aimPitch = clamp(air.aimPitch - dy * 0.0022, -80 * DEG, 80 * DEG); }
function lockPointer() { try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch {} }
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
$("#plot").addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("mousedown", (e) => {
  mouseX = e.clientX; mouseY = e.clientY; initAudio();
  const st = { x: e.clientX, y: e.clientY, d: 0 };
  if (e.button === 1) { mDown = st; e.preventDefault(); return; }
  if (e.button === 2) { rDown = st; return; }
  if (e.button !== 0) return; lDown = st;
  if (md.fly && G.state === "playing" && !paused) { if (document.pointerLockElement === canvas) flyFire(); else lockPointer(); return; }
  if ((G.plane || aa.on || cap.fps) && G.state === "playing" && !paused) { lockPointer(); return; }
});
canvas.addEventListener("dblclick", (e) => {
  if (!commanding() || G.plane) return; const h = pick(e.clientX, e.clientY); if (!h) return;
  const foe = h.ship && h.ship.side === "foe" ? h.ship : null; if (foe) lockShip(foe); else { aimAtPoint(h.x, h.z); sfx.click(); }
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 1) mDown = null;
  if (e.button === 2 && rDown) { const click = rDown.d < 6 && !cap.fps; rDown = null; if (click && commanding() && !G.plane && e.target === canvas) { const h = pick(e.clientX, e.clientY); if (h) orderSelected(h, e.shiftKey); } }
  if (e.button === 0 && lDown) { const L = lDown; lDown = null; if (screen === "battle" && commanding() && !G.plane && !aa.on && !cap.fps && e.target === canvas) { if (L.box) boxSelect(L.x, L.y, e.clientX, e.clientY, e.shiftKey); else if (L.d < 5 && e.altKey) clickSelect(e.clientX, e.clientY, e.shiftKey); } }
});
document.addEventListener("mousemove", (e) => {
  const dx = e.movementX, dy = e.movementY; mouseX = e.clientX; mouseY = e.clientY;
  if (md.fly && G.state === "playing" && document.pointerLockElement === canvas) { const k = 0.0022 * SENS / 0.6; md.fly.pyaw = wrap(md.fly.pyaw + dx * k); md.fly.ppitch = clamp(md.fly.ppitch - dy * k, -1.3, 1.3); return; }
  for (const s of [lDown, rDown, mDown]) if (s) s.d += Math.abs(dx) + Math.abs(dy);
  if (lDown && lDown.d > 4 && !G.plane && !aa.on && !cap.fps && screen === "battle" && e.buttons & 1 && e.altKey && !isPlane(cam.tgt) && commanding()) { lDown.box = true; return; }
  if (lDown && lDown.d > 4 && !G.plane && !aa.on && !cap.fps && screen === "battle" && e.buttons & 1) { // left-drag: pan the camera freely over the sea
    if (isPlane(cam.tgt)) { cam.pYaw += dx * 0.006; cam.pPitch = clamp(cam.pPitch + dy * 0.004, -0.5, 1.3); return; }
    const k = (2 * (cam.map ? cam.mapDist : cam.dist) * Math.tan((camera.fov * DEG) / 2)) / innerHeight, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), vk = cam.map ? 1 : 1 / Math.max(Math.sin(cam.pitch), 0.4);
    cam.free = true; cam.tgt = null; cam.focus.x += (sy * dx + cy * dy * vk) * k; cam.focus.z += (-cy * dx + sy * dy * vk) * k; return;
  }
  if (cap.fps && G.state === "playing" && (document.pointerLockElement === canvas || (lDown && e.buttons & 1))) { const k = 0.0022 * SENS / 0.6; cap.yaw = wrap(cap.yaw + dx * k); cap.pitch = clamp(cap.pitch - dy * k, -1.2, 1.2); return; }
  if (aa.on && G.state === "playing" && (document.pointerLockElement === canvas || (lDown && e.buttons & 1))) { const k = (aa.fov / 55) * 0.0022 * SENS / 0.6; aa.yaw = wrap(aa.yaw + dx * k); aa.pitch = clamp(aa.pitch - dy * k, -0.12, 1.5); return; }
  if (G.plane && G.state === "playing") { if (document.pointerLockElement === canvas || (lDown && e.buttons & 1)) { if (altDown()) { freeYaw = clamp(freeYaw + dx * 0.004, -2.9, 2.9); freePitch = clamp(freePitch - dy * 0.004, -1.25, 1.25); } else steer(dx * SENS / 0.6, dy * SENS / 0.6); } return; }
  const rot = (mDown && e.buttons & 4) || (rDown && rDown.d > 6 && e.buttons & 2);
  if (!rot) return;
  if (screen !== "battle") { cam.orbYaw += dx * 0.005; cam.orbPitch = clamp(cam.orbPitch + dy * 0.004, 0.03, 1.2); return; }
  if (isPlane(cam.tgt)) { cam.pYaw += dx * 0.006; cam.pPitch = clamp(cam.pPitch + dy * 0.004, -0.5, 1.3); }
  else { cam.yaw = wrap(cam.yaw + dx * 0.005); cam.pitch = clamp(cam.pitch + dy * 0.004, 0.3, 1.5); }
});
window.addEventListener("wheel", (e) => {
  const f = Math.exp(e.deltaY * 0.0012);
  if (e.target === plot) { plotZoom = clamp(plotZoom * f, 0.25, 4); return; }
  if (screen !== "battle") cam.orbDist = clamp(cam.orbDist * f, 60, 2200);
  else if (aa.on) aa.fov = clamp(aa.fov * f, 14, 80);
  else if (G.plane) { if (!air.cockpit) cam.pDist = clamp(cam.pDist * f, 18, 400); }
  else if (isPlane(cam.tgt)) cam.pDist = clamp(cam.pDist * f, 18, 600);
  else if (cam.map) cam.mapDist = clamp(cam.mapDist * f, 3000, 45000);
  else cam.dist = clamp(cam.dist * f, 160, 18000);
}, { passive: true });
$("#plot").addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); if (!commanding() || G.plane) return; const p = plotPick(e); if (e.button === 2) moveOrder(p.x, p.z, e.shiftKey); else if (e.button === 0) aimAtPoint(p.x, p.z); });
window.addEventListener("keydown", (e) => {
  if (e.code === "AltLeft" || e.code === "AltRight") e.preventDefault();
  if (e.target && e.target.tagName === "INPUT") return;
  if (["Tab", "Space", "AltLeft", "AltRight", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
  if (e.repeat) return; keys.add(e.code);
  if (cap.fps && G.state === "playing") { if (e.code === "KeyR" && cap.phase === "deck" && cap.ammo < 8 && cap.rel <= 0) cap.rel = 2.2; if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyR", "KeyQ", "KeyZ", "KeyF", "KeyG", "KeyB", "Space", "Digit1", "Digit2", "Digit3", "Digit4", "Digit0", "Enter", "Tab", "KeyM"].includes(e.code)) return; }
  if (e.code === "KeyP" && screen === "battle" && (G.state === "playing" || G.state === "ending")) { setPause(!paused); return; }
  if (e.code === "KeyU" && screen === "battle") { cinema = !cinema; document.body.classList.toggle("cinema", cinema); return; }
  if (G.state !== "playing" || paused) return;
  if (e.code === "KeyH") { helpOn = !helpOn; return; }
  if (e.code === "Tab") { cycleCam(); return; }
  if (e.code === "KeyM" && !G.plane) { cam.map = !cam.map; if (cam.map && isPlane(cam.tgt)) cam.tgt = null; sfx.click(); toast(cam.map ? "지도 시점 — 휠: 축척 · 좌클릭 끌기: 이동 · M: 복귀" : "지휘 시점"); return; }
  if (e.code === "KeyC" && !G.plane) { cam.free = false; cam.tgt = null; sfx.click(); toast("카메라: 기함"); return; }
  if (e.code === "KeyJ" && G.state === "playing") { if (G.auto) takeOver(); else toAuto(); return; }
  if (e.code === "Enter") {
    if (G.auto) { takeOver(); return; }
    if (G.plane) { const p = G.plane; autopilot(); leaveFlight(); cam.tgt = p; toast("자동 조종 — 카메라는 계속 이 기체를 따라갑니다 (Tab: 전환)"); return; }
    if (isPlane(cam.tgt)) enterFlight(cam.tgt); else { const p = air.planes.find((q) => q.side === "us" && q.alive && !q.crashed); if (p) enterFlight(p); else toast("비행 중인 아군 전투기가 없습니다 — F: 출격"); }
    return;
  }
  if (G.auto) return;
  if (G.modern && G.state === "playing" && !G.plane && !cap.fps && modernKey(e.code)) return; // modern keys first: G = jets, I = fly, B = jet's anti-ship missiles
  if (e.code === "KeyB" && !G.plane && G.state === "playing") { startBoard(); return; }
  if (e.code === "KeyV" && !G.plane && cap.phase) { toggleCapFps(); return; }
  if (e.code === "KeyG" && !G.plane && !G.modern) { toggleAA(); return; }
  if (e.code === "KeyF") { if (aa.on) toggleAA(false); sortie(); return; }
  if (G.plane) {
    if (e.code === "Space") air.firing = true;
    if (e.code === "KeyB") G.plane.dropBomb();
    if (e.code === "KeyX") { if (!G.plane.dropFlare()) sfx.deny(); }
    if (e.code === "KeyQ") { lockOn = lockOn ? null : flightTarget(); sfx.click(); if (!lockOn) toast("락온 해제"); }
    if (e.code === "KeyV") { air.cockpit = !air.cockpit; }
    return;
  }
  if (/^Digit[1-3]$/.test(e.code)) setSpeed(+e.code.slice(5));
  if (e.code === "Digit0" || e.code === "Backquote") setSpeed(0);
  if (e.code === "KeyQ" && aa.on) { aa.ammo = aa.ammo === "mg" ? "flak" : "mg"; aa.t = 0.3; sfx.click(); toast(aa.ammo === "flak" ? "대공탄 — 느리지만 적기 근처에서 터져 넓게 피해" : "기관포 — 빠른 연사, 직격해야 피해"); return; }
  if (e.code === "KeyQ") { if (G.player.spec.torp) { weapon = weapon === "gun" ? "torp" : "gun"; sfx.click(); toast(weapon === "torp" ? "어뢰 — A/D로 방향, Space 발사 (Q: 주포)" : "주포 (Q: 어뢰)"); } else { sfx.deny(); toast("이 함선에는 어뢰가 없습니다"); } }
  if (e.code === "KeyR") useRepair();
  if (e.code === "KeyZ") { autoFire = !autoFire; sfx.click(); toast(autoFire ? `자동 공격 켬 — 주포${G.player.spec.torp ? "·어뢰" : ""} 자동 조준·발사 (Z: 끄기)` : "자동 공격 끔 (Z)"); airSig = ""; }
  if (e.code === "Space" && !aa.on && !cap.fps) tryFire();
});
window.addEventListener("keyup", (e) => { keys.delete(e.code); if (e.code === "Space") air.firing = false; });
window.addEventListener("blur", () => keys.clear());
$("#pauseBtn").addEventListener("click", (e) => { e.stopPropagation(); setPause(true); });
$("#resumeBtn").addEventListener("click", () => { const o = $("#pause"); if (o.classList.contains("menuset")) { o.style.display = "none"; o.classList.remove("menuset"); } else setPause(false); });
function openSettings() { if (G.state === "playing" || G.state === "ending") { setPause(true); return; } const o = $("#pause"); o.classList.add("menuset"); o.querySelector("h1").textContent = "설정"; $("#resumeBtn").textContent = "닫기"; o.style.display = "grid"; }
$("#setBtn").addEventListener("click", openSettings);
$("#quitYardBtn").addEventListener("click", () => forfeit("yard")); $("#quitMenuBtn").addEventListener("click", () => forfeit("menu"));
$("#goBtn").addEventListener("click", () => start(false)); $("#watchBtn").addEventListener("click", () => start(true)); $("#yardBtn").addEventListener("click", openYard);
$("#againBtn").addEventListener("click", () => start(G.auto)); $("#endYardBtn").addEventListener("click", openYard); $("#menuBtn").addEventListener("click", openMenu);
$("#takeBtn").addEventListener("click", takeOver); $("#autoModeBtn").addEventListener("click", (e) => { e.stopPropagation(); toAuto(); });
for (const k of ["sfx", "music"]) { const el = $("#vol_" + k); el.value = A.vol?.[k] ?? el.value; el.addEventListener("input", () => setVolume(k, +el.value)); }
$("#bgmOn").checked = A.bgmOn; $("#bgmOn").addEventListener("change", (e) => { initAudio(); setBgmOn(e.target.checked); });
let glassOn = true; try { glassOn = localStorage.getItem("steeltide:glass") !== "0"; } catch {} document.body.classList.toggle("noglass", !glassOn); $("#glassOn").checked = glassOn;
$("#postOn").checked = post.on; $("#postOn").addEventListener("change", (e) => { post.on = e.target.checked; try { localStorage.setItem("steeltide:post", post.on ? "1" : "0"); } catch {} });
$("#glassOn").addEventListener("change", (e) => { glassOn = e.target.checked; document.body.classList.toggle("noglass", !glassOn); try { localStorage.setItem("steeltide:glass", glassOn ? "1" : "0"); } catch {} });
$("#sens").value = SENS; $("#sensV").textContent = SENS.toFixed(2);
$("#sens").addEventListener("input", (e) => { SENS = +e.target.value; $("#sensV").textContent = SENS.toFixed(2); try { localStorage.setItem("steeltide:sens", String(SENS)); } catch {} });
window.addEventListener("pointerdown", () => initAudio(), { once: true });
/** Flight lock-on: the nearest enemy fighter in front, else the enemy ship nearest the nose. */
function flightTarget() {
  const pl = G.plane, cd = camera.getWorldDirection(new THREE.Vector3()); let best = null, s = Infinity;
  for (const p of air.planes) if (p.side === "foe" && p.alive) { const v = p.pos.clone().sub(pl.pos), d = v.length(), a = cd.angleTo(v); if (d < 3500 && a < 40 * DEG && a * 3 + d / 2000 < s) { s = a * 3 + d / 2000; best = p; } }
  if (best) return best;
  for (const e of seenFoes()) { const v = e.pos.clone().setY(10).sub(pl.pos), a = cd.angleTo(v); if (v.length() < 9000 && a < 35 * DEG && a < s) { s = a; best = e; } }
  return best;
}

// ── cameras ─────────────────────────────────────────────────────────────────
const camPos = new THREE.Vector3(-260, 80, 120), tmp = new THREE.Vector3(), FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI), eu = new THREE.Euler();
let near = 4;
function setNear(n) { if (Math.abs(n - near) > 0.05) { near = n; camera.near = n; camera.updateProjectionMatrix(); } }
/** Returns "cockpit" | "flight" | "watch" | "command" | null (menus). */
function updateCamera(dt) {
  const P = G.player, pl = G.plane; cockpit.visible = false; garandVM.visible = mgVM.visible = false;
  if (screen !== "battle" || !P) {
    const L = P ? P.spec.L : 190, R = cam.orbDist * (L / 190) * 1.05, a = cam.orbYaw + G.time * 0.04;
    camera.position.set(Math.cos(a) * Math.cos(cam.orbPitch) * R, Math.sin(cam.orbPitch) * R + 8, Math.sin(a) * Math.cos(cam.orbPitch) * R).add(P ? P.pos : tmp.set(0, 0, 0));
    camera.fov = 42; setNear(4); camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); camera.lookAt(P ? P.pos.clone().setY(L * 0.06) : tmp.set(0, 0, 0)); return null;
  }
  G.shake = (G.shake || 0) * Math.exp(-dt * 4.5);
  for (const p of air.planes) p.obj.visible = true; mapGrid.visible = false; scene.fog.density = 0.00005;
  if (pl && !pl.crashed) {
    if (air.cockpit) { pl.obj.visible = false;
      setNear(0.5); camera.position.copy(pl.obj.localToWorld(new THREE.Vector3(0, 0.85, 0.15)));
      const lookQ = new THREE.Quaternion().setFromEuler(eu.set(freePitch, -freeYaw, 0, "YXZ"));
      camera.quaternion.copy(pl.obj.quaternion).multiply(FLIP).multiply(lookQ); cockpit.quaternion.copy(lookQ).invert(); camera.fov = 68; camera.updateProjectionMatrix(); camPos.copy(camera.position);
      cockpit.visible = true; updateCockpit(pl, dt); return "cockpit";
    }
    setNear(1.2); const d = dirFrom(air.aimYaw + freeYaw, clamp(air.aimPitch + freePitch, -1.5, 1.5)), D = cam.pDist * 0.5;
    camPos.copy(pl.pos).addScaledVector(d, -D).add(tmp.set(0, D * 0.2, 0)); camera.position.copy(camPos); camera.fov = 62; camera.updateProjectionMatrix();
    camera.up.set(0, 1, 0); camera.lookAt(pl.pos.clone().addScaledVector(d, 90)); return "flight";
  }
  if (G.modern && md.fly && md.fly.alive) { flyCamera(dt); aaGun.visible = false; return "fly"; }
  if (G.modern && MSL.cam && missileCamera(dt)) { aaGun.visible = false; return "missile"; }
  if (cap.fps && cap.phase && capCamera()) { aaGun.visible = false; return "board"; }
  if (aa.on && P.alive) {
    setNear(0.5); const o = aaMount(); camera.position.copy(o); if (G.shake > 0.01) camera.position.y += (Math.random() - 0.5) * G.shake * 0.08;
    scene.fog.density = 0.000022; camera.fov = aa.fov; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); aa.kick = Math.max(0, aa.kick - dt * 14); camera.lookAt(o.clone().add(dirFrom(aa.yaw, aa.pitch + aa.kick * 0.0025))); // steady sight: only a small smooth climb per shot aaGun.visible = true; updateAAGun(aa.recoil); return "aa";
  }
  aaGun.visible = false;
  if (isPlane(cam.tgt) && (!air.planes.includes(cam.tgt) || cam.tgt.crashed)) { toast(`${cam.tgt.label} ${cam.tgt.landed ? "착함" : "추락"} — 카메라 본함 복귀`); cam.tgt = null; }
  if (isPlane(cam.tgt)) {
    const p = cam.tgt, f = p.fwd, hdg = Math.atan2(f.z, f.x); setNear(1.2);
    const want = p.pos.clone().addScaledVector(dirFrom(hdg + cam.pYaw, -cam.pPitch), -cam.pDist); if (want.y < 3) want.y = 3;
    if (camPos.distanceTo(want) > 900) camPos.copy(want); else camPos.lerp(want, 1 - Math.exp(-dt * 6));
    camera.position.copy(camPos); camera.fov = 55; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); camera.lookAt(p.pos.clone().addScaledVector(f, 12)); return "watch";
  }
  if (cam.tgt && (!cam.tgt.alive && cam.tgt.sinking > 25 || !cam.tgt.root.visible)) cam.tgt = null;
  const F = cam.tgt || P;
  if (!cam.free) { if (cam.focus.distanceTo(F.pos) > 4000) cam.focus.copy(F.pos); else cam.focus.lerp(F.pos, 1 - Math.exp(-dt * 5)); }
  const D = cam.map ? cam.mapDist : cam.dist, pitch = cam.map ? 1.53 : cam.pitch, cp = Math.cos(pitch);
  camPos.set(cam.focus.x - Math.cos(cam.yaw) * cp * D, Math.sin(pitch) * D, cam.focus.z - Math.sin(cam.yaw) * cp * D);
  setNear(clamp(D * 0.004, 1.5, 60)); camera.fov = cam.map ? 40 : 45; camera.updateProjectionMatrix(); mapGrid.visible = cam.map; scene.fog.density = cam.map ? 0.000012 : 0.00005; if (cam.map) updateGrid();
  camera.position.copy(camPos); if (G.shake > 0.01) { camera.position.x += (Math.random() - 0.5) * G.shake * D * 0.004; camera.position.z += (Math.random() - 0.5) * G.shake * D * 0.004; }
  camera.up.set(0, 1, 0); camera.lookAt(cam.focus); return "command";
}

// ── 2D HUD ──────────────────────────────────────────────────────────────────
const hud = $("#hudc"), hx = hud.getContext("2d");
function fitHud() { hud.width = innerWidth; hud.height = innerHeight; } window.addEventListener("resize", fitHud); fitHud();
function proj(v) { const p = v.clone().project(camera); if (p.z > 1) return null; return { x: (p.x * 0.5 + 0.5) * hud.width, y: (-p.y * 0.5 + 0.5) * hud.height, on: Math.abs(p.x) < 1 && Math.abs(p.y) < 1 }; }
function rr(x, y, w, h, r) { hx.beginPath(); hx.moveTo(x + r, y); hx.arcTo(x + w, y, x + w, y + h, r); hx.arcTo(x + w, y + h, x, y + h, r); hx.arcTo(x, y + h, x, y, r); hx.arcTo(x, y, x + w, y, r); hx.closePath(); }
function panel(x, y, w, h) { rr(x, y, w, h, 0); hx.fillStyle = "rgba(28,30,24,.62)"; hx.fill(); hx.strokeStyle = "rgba(170,200,210,.22)"; hx.lineWidth = 1; hx.stroke(); }
function txt(s, x, y, c = "#fff", font = "12px 'Noto Sans KR', sans-serif", align = "left") { hx.font = font; hx.textAlign = align; hx.fillStyle = "rgba(0,0,0,.55)"; hx.fillText(s, x + 1, y + 1); hx.fillStyle = c; hx.fillText(s, x, y); }
const TCOL = { dead: "#ff5a4e", reload: "#7f8b92", arc: "#ffb347", turn: "#ffd166", ready: "#8ef07a" };
// ── 현대전: offence AI, player salvo, air-defence modes, missile camera, HUD ──
const md = { salvo: 2, mode: "auto", decoyCd: 0, fireCd: 0, eCd: 0, q: [] };
const asmKey = (S) => S.spec.vls.A?.[0];
function modernStep(dt) {
  for (let i = md.q.length - 1; i >= 0; i--) { const o = md.q[i]; o.t -= dt; if (o.t <= 0 && o.jet) { md.q.splice(i, 1); if (o.S.alive && G.state === "playing") launchJet(o.S, o.role, o.S.cv, o.S.isBase ? o.S.pos.clone().setY(300) : null); continue; } if (o.t <= 0) { md.q.splice(i, 1); if (o.S.alive && o.T.alive && G.state === "playing") { const m = mLaunch(o.S, o.k, o.T); if (m && o.est) m.est = o.est.clone(); if (o.cam && m) MSL.last = m; } } }
  md.mode = "auto"; md.salvo = 2; // air defence, decoys and salvo size are automatic
  if (md.fly) { const j = md.fly; if (!j.alive || G.state !== "playing") { md.fly = null; if (document.pointerLockElement) document.exitPointerLock(); if (!j.alive) toast("격추당했습니다 — 함대 지휘로 복귀", 3); }
    else { j.thr = clamp(j.thr + ((keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0)) * 120 * dt, 110, 330); j.aamCd -= 0; md.flyLock = flyLockOn(); if (j.t > j.endur + 120) { releaseFly(); j.home = true; toast("연료 부족 — 자동 귀환"); } } }
  md.decoyCd = Math.max(0, md.decoyCd - dt); md.fireCd = Math.max(0, md.fireCd - dt); md.eCd = Math.max(0, md.eCd - dt);
  stepMissiles(dt, (S, m, n) => {
    const mine = m.owner?.isPlayer && S.side === "foe";
    if (mine) { G.stats.dealt = (G.stats.dealt || 0) + (Math.min(n, S.hp) / S.maxHp) * 100; G.stats.hits++; G.ribbon("미사일 명중"); }
    log(S.side === "us" ? `${S.isPlayer ? "본함" : S.name} 피격 — ${m.W.name} 명중!` : `${m.W.name} 명중! ${S.name} 화재`, S.side === "us" ? "bad" : "hit");
    if (S.isPlayer) G.radio?.("flood");
  });
  defend(dt, md.mode);
  for (const s of G.ships) if (s.heloCd > 0) s.heloCd -= dt;
  for (const s of [...G.ships, ...(G.bases || [])]) if (s.rearm?.length) { for (let i = s.rearm.length - 1; i >= 0; i--) { s.rearm[i] -= dt; if (s.rearm[i] <= 0) { s.rearm.splice(i, 1); s.jetsReady++; } } }
  stepJets(dt, know, (j, ev, x) => { if (ev === "lost") log(`${j.side === "us" ? "아군" : "적"} ${j.name} 격추${x ? ` — ${x.isJet ? `${x.side === "us" ? "아군" : "적"} ${x.name}의 공대공 미사일` : `${x.name}의 대공 방어`}` : ""}`, j.side === "us" ? "bad" : "hit"); else if (ev === "strike") log(`${j.side === "us" ? "아군" : "적"} ${j.name} 편대 ${WPN[j.asmKey].name} 발사 → ${x.name}`, j.side === "us" ? "hit" : "bad"); else if (ev === "land") log(`${j.name} 착함 — 재무장 60초`); });
  for (const s of [...G.ships, ...(G.bases || [])]) if (s.cv && s.alive && (s.side === "foe" || G.auto || autoFire)) { // computer air wing: CAP early, strikes when it knows where we are
    s.airT = (s.airT ?? 12 + rnd() * 10) - dt; if (s.airT > 0) continue; s.airT = 25;
    const up = MSL.jets.filter((j) => j.alive && j.owner === s).length;
    if (up < 2 && s.jetsReady >= 2) { sortieJets(s, "multi"); s.airT = 45; }
  }
  stepHelos(dt, (h, ev, by) => log(ev === "land" ? `${h.name} 귀함 — 정비 40초` : `${h.name} 격추됨${by ? ` — ${by.name}의 함대공미사일` : ""}`, ev === "land" ? "" : "bad"));
  // offence: every modern ship with anti-ship missiles fires salvos at a seen enemy inside range (the player's only with AUTO or in auto battle)
  for (const S of G.ships) {
    if (!S.alive || !S.spec.modern || !S.mag) continue; if (S.isPlayer && !G.auto && !autoFire) continue;
    const k = asmKey(S), kb = S.spec.vls.B?.[0];
    if (S.side === "foe" && S.prefRange && !(S.mag[k] > 0) && !(kb && S.mag[kb] > 0)) S.prefRange = [3000, 5000]; // out of missiles: close to gun range
    S.asmCd = (S.asmCd ?? 10 + rnd() * 12) - dt; if (S.asmCd > 0) continue;
    const foes = G.ships.filter((o) => o.alive && o.side !== S.side && o.spec.modern && (S.side === "foe" ? o.seenByFoe || o.revealT > 0 : goodCt(o))); // both sides fire at estimated contacts too
    const T = S.side === "foe" ? pickFoe(S, foes) : foes.sort((a, b) => d2(a.pos, S.pos) - d2(b.pos, S.pos))[0]; if (!T) { S.asmCd = 3; continue; } // enemy salvos spread over our ships too
    const d = d2(T.pos, S.pos), use = kb && S.mag[kb] > 0 && d < WPN[kb].range * 0.95 && rnd() < 0.35 ? kb : k;
    if (!use || !(S.mag[use] > 0) || d > WPN[use].range * 0.95) { S.asmCd = 4; continue; }
    const n = Math.min(S.mag[use], use === kb ? 1 : 2 + ((rnd() * 2) | 0)); // same salvo rules both sides
    const uct = S.side === "us" ? G.cts.get(T) : null;
    const est = S.side === "foe" ? (T.foeErr && !(T.revealT > 0) ? T.pos.clone().add(new THREE.Vector3(gauss(), 0, gauss()).multiplyScalar(d * T.foeErr * 0.6)) : null) : uct && uct.q < 0.6 ? new THREE.Vector3(uct.x, 0, uct.z) : null; // ESM-only fix: aim at a guess
    for (let i = 0; i < n; i++) md.q.push({ t: i * 0.7, S, k: use, T, est });
    S.mag[use] -= n; S.asmCd = 26 + rnd() * 18;
    if (S.side === "foe") { log(`적 ${S.name} 대함미사일 ${n}발 발사 탐지!`, "bad"); sfx.alarm(); } else log(`${S.name} ${WPN[use].name} ${n}발 발사`, "hit");
  }
}
/** enemy surface contacts a side can aim at: ours from the contact table, the enemy's from what they detect (ESM fixes carry an offset) */
function know(side) {
  if (side === "us") return [...G.cts.keys()].filter(goodCt).map((e) => { const c = G.cts.get(e); return { ship: e, pos: new THREE.Vector3(c.x, 0, c.z), firm: c.q >= 0.6 }; });
  return ours().filter((s) => s.spec.modern && s.seenByFoe).map((s) => { if (!s.foeOff || G.time - s.foeOff.t > 30) s.foeOff = { t: G.time, x: gauss() * 2500 * (s.foeErr ? 1 : 0), z: gauss() * 2500 * (s.foeErr ? 1 : 0) }; return { ship: s, pos: new THREE.Vector3(s.pos.x + s.foeOff.x, 0, s.pos.z + s.foeOff.z), firm: !s.foeErr }; });
}
// ── 현대전 전투기 직접 조종: mouse flies, W/S throttle, click/Space AAM at the locked aircraft or missile, B anti-ship missiles ──
function takeJet() {
  let j = MSL.jets.find((x) => x.alive && x.side === "us" && !x.home); const C = myAir();
  if (!j && C && C.jetsReady > 0) { C.jetsReady--; j = launchJet(C, "multi", C.cv); }
  if (!j) { sfx.deny(); toast("조종할 전투기 없음"); return; }
  md.fly = j; j.pilot = true; j.home = false; j.pyaw = Math.atan2(j.vel.z, j.vel.x); j.ppitch = 0.12; j.thr = 240; lockPointer(); sfx.click();
  toast(`${j.name} 조종 — 마우스: 방향 · W/S: 추력 · 좌클릭/Space: 공대공 · B: 대함 미사일 · I: 자동 복귀`, 5);
}
function releaseFly() { if (md.fly) { md.fly.pilot = false; md.fly = null; } if (document.pointerLockElement) document.exitPointerLock(); toast("자동 조종 — 함대 지휘로 복귀"); }
function flyLockOn() {
  const j = md.fly; if (!j) return null; const f = dirFrom(j.pyaw, j.ppitch); let best = null, bs = Infinity;
  for (const o of [...MSL.jets.filter((x) => x.alive && x.side === "foe"), ...MSL.list.filter((m) => m.alive && m.side === "foe" && m.W.role === "asm")]) {
    const v = o.pos.clone().sub(j.pos), d = v.length(); if (d > WPN[j.aamKey].range) continue; const ang = Math.acos(clamp(v.dot(f) / d, -1, 1)); if (ang < 0.45 && ang * 20000 + d < bs) { bs = ang * 20000 + d; best = o; } }
  return best;
}
function flyFire() { const j = md.fly, T = md.flyLock; if (!j || j.aam <= 0 || j.aamCd > 0) { sfx.deny(); return; } if (!T) { sfx.deny(); toast("록온 없음 — 적기나 미사일을 조준원 안에"); return; } if (mLaunch(j, j.aamKey, T)) { j.aam--; T.engaged = (T.engaged || 0) + 1; j.aamCd = 1.2; sfx.click(); log(`${j.name} ${j.aamKey} 발사 → ${T.isJet ? T.name : T.W.name}`, "hit"); } }
function flyStrike() {
  const j = md.fly; if (!j || j.asm <= 0) { sfx.deny(); toast("대함 미사일 없음"); return; }
  const c = know("us").sort((a, b) => a.pos.distanceToSquared(j.pos) - b.pos.distanceToSquared(j.pos))[0]; if (!c) { sfx.deny(); toast("탐지된 적함 없음"); return; }
  if (Math.hypot(c.pos.x - j.pos.x, c.pos.z - j.pos.z) > WPN[j.asmKey].range * 0.95) { sfx.deny(); toast(`사거리 밖 — ${WPN[j.asmKey].name} ${(WPN[j.asmKey].range / 1000).toFixed(0)} km`); return; }
  for (let k = 0; k < j.asm; k++) { const m = mLaunch(j, j.asmKey, c.ship); if (m && !c.firm) m.est = c.pos.clone(); } log(`${j.name} ${WPN[j.asmKey].name} ${j.asm}발 발사 → ${c.ship.name}`, "hit"); j.asm = 0; sfx.click();
}
function flyCamera(dt) {
  const j = md.fly, v = j.vel.clone().normalize(), f = dirFrom(j.pyaw, j.ppitch); setNear(1); camera.fov = 62; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0);
  camera.position.lerp(j.pos.clone().addScaledVector(v, -42).add(new THREE.Vector3(0, 9, 0)), Math.min(1, dt * 7)); camera.lookAt(j.pos.clone().addScaledVector(f, 160));
}
function drawFlyHUD() {
  const j = md.fly, W = hud.width, H = hud.height; if (!j) return; hx.textBaseline = "middle";
  const aim = proj(j.pos.clone().addScaledVector(dirFrom(j.pyaw, j.ppitch), 800)); if (aim) { hx.strokeStyle = "#9be06a"; hx.lineWidth = 1.6; hx.beginPath(); hx.arc(aim.x, aim.y, 46, 0, TAU); hx.stroke(); hx.beginPath(); hx.arc(aim.x, aim.y, 3, 0, TAU); hx.stroke(); }
  const T = md.flyLock; if (T) { const q = proj(T.pos); if (q && q.on) { hx.strokeStyle = "#ff3b30"; hx.lineWidth = 2; hx.strokeRect(q.x - 14, q.y - 14, 28, 28); txt(`LOCK ${T.isJet ? T.name : T.W.name} ${(T.pos.distanceTo(j.pos) / 1000).toFixed(1)} km`, q.x, q.y - 24, "#ff6b5e", "bold 11px 'Noto Sans KR', sans-serif", "center"); } }
  panel(W / 2 - 230, H - 150, 460, 46);
  txt(`${j.name} · ${(j.vel.length() * 3.6).toFixed(0)} km/h · 고도 ${j.pos.y.toFixed(0)} m · 공대공 ${j.aam} · 대함 ${j.asm} · 연료 ${Math.max(0, Math.ceil(j.endur + 120 - j.t))}초`, W / 2, H - 136, "#fff", "bold 12px 'Noto Sans KR', sans-serif", "center");
  txt("마우스 방향 · W/S 추력 · 좌클릭/Space 공대공 · B 대함 · I 자동 복귀", W / 2, H - 116, "#cfe7ff", "11px 'Noto Sans KR', sans-serif", "center");
}
G.onIntercept = (m) => { if (m.side === "foe") { md.icpt = { t: 1.6, n: m.isJet ? `적 ${m.name} 격추` : `${m.W.name || "적 미사일"} 요격` }; G.stats.icpt = (G.stats.icpt || 0) + 1; } };
function sortieJets(S, role) {
  const n = Math.min(2, S.jetsReady); if (!n) return 0; S.jetsReady -= n;
  for (let i = 0; i < n; i++) md.q.push({ t: i * 1.5, jet: true, S, role });
  log(`${S.side === "us" ? "" : "적 "}${S.cv.type} ${n}기 출격 (${S.name || "지상 비행장"})`, S.side === "us" ? "hit" : "bad"); if (S.side === "foe") sfx.alarm(); return n;
}
const myAir = () => G.ships.find((s) => s.alive && s.side === "us" && s.cv) || (G.bases || []).find((b) => b.side === "us");
function fireSalvo() {
  const P = G.player, k = asmKey(P), T = (goodCt(lock) && lock) || (goodCt(G.enemy) && G.enemy) || bestContact();
  if (!k || !(P.mag[k] > 0)) { sfx.deny(); toast("대함미사일 소진"); return; }
  if (!T) { sfx.deny(); toast("표적 없음 — 레이더·ESM·헬기(Y)로 먼저 탐지하세요"); return; }
  const ct = G.cts.get(T), est = ct.q < 0.6 ? new THREE.Vector3(ct.x, 0, ct.z) : null; // not a firm track: shoot at the estimate, the seeker finds the ship
  const d = d2(P.pos, est || T.pos); if (d > WPN[k].range * 0.95) { sfx.deny(); toast(`사거리 밖 — ${WPN[k].name} 최대 ${(WPN[k].range / 1000).toFixed(0)} km (게임 축척)`); return; }
  if (md.fireCd > 0) { sfx.deny(); return; }
  const n = Math.min(md.salvo, P.mag[k]); P.mag[k] -= n; md.fireCd = 2.5;
  for (let i = 0; i < n; i++) md.q.push({ t: i * 0.6, S: P, k, T, cam: i === 0, est });
  G.stats.shots += n; log(`${WPN[k].name} ${n}발 발사 → ${T.name} (${(d / 1000).toFixed(1)} km)${est ? ` · ${ct.src} 추정 위치 사격 (오차 ±${(ct.err / 1000).toFixed(1)} km, 종말 탐색기)` : ""}`, "hit"); G.radio?.("torp_launch");
}
function manualSam() {
  const P = G.player; if (md.eCd > 0) return;
  const th = MSL.list.filter((m) => m.alive && m.W.role === "asm" && m.side === "foe" && mSeen(m, "us")).sort((a, b) => d2(a.pos, P.pos) - d2(b.pos, P.pos));
  const m = th.find((x) => x.engaged < 2); if (!m) { sfx.deny(); toast("요격할 탐지 표적 없음"); return; }
  const k = pickSam(P, d2(m.pos, P.pos)); if (!k) { sfx.deny(); toast("사거리 안에 쓸 요격탄 없음"); return; }
  mLaunch(P, k, m); P.mag[k]--; m.engaged++; md.eCd = 0.6; sfx.click();
}
function modernBar() {
  const P = G.player, k = asmKey(P), v = P.spec.vls, cnt = (e) => (e ? `${e[0]} ${P.mag[e[0]] ?? 0}` : "");
  const sam = ["L", "M", "S"].map((t) => cnt(v[t])).filter(Boolean).join(" · ");
  return `<button class="slot main g" data-key="KeyF"><span class="t">F · 대함 미사일</span><span class="v">${k ? `${WPN[k].name} ${P.mag[k]}발 · ${(WPN[k].range / 1000).toFixed(0)}km` : "없음"}</span><span class="ln${k && P.mag[k] ? " ok" : ""}"></span></button>`
    + `<button class="slot g${P.radarOn === false ? " on" : ""}" data-key="KeyO"><span class="t">O · 레이더</span><span class="v">${P.radarOn === false ? "방사 통제" : "방사 중"}</span><span class="ln${P.radarOn === false ? "" : " ok"}"></span></button>`
    + (() => { const h = MSL.helos.find((x) => x.alive && x.owner === P); return `<button class="slot g${h ? " on" : ""}" data-key="KeyY"><span class="t">Y · 정찰 헬기</span><span class="v">${h ? `비행 ${Math.max(0, Math.ceil(h.endur - h.t))}초` : P.heloCd > 0 ? `정비 ${Math.ceil(P.heloCd)}초` : "출격 가능"}</span><span class="ln${h || !(P.heloCd > 0) ? " ok" : ""}"></span></button>`; })()
    + (() => { const C = myAir(); if (!C) return ""; const up = MSL.jets.filter((j) => j.alive && j.side === "us").length; return `<button class="slot g" data-key="KeyG"><span class="t">G · 전투기</span><span class="v">대기 ${C.jetsReady} · 비행 ${up}</span><span class="ln${C.jetsReady ? " ok" : ""}"></span></button><button class="slot g${md.fly ? " on" : ""}" data-key="KeyI"><span class="t">I · 직접 조종</span><span class="v">${md.fly ? "조종 중 · I 복귀" : up ? "비행기 조종" : "출격해 조종"}</span><span class="ln ok"></span></button>`; })()
    + `<button class="slot g${MSL.cam ? " on" : ""}" data-key="KeyT"><span class="t">T · 추적</span><span class="v">${MSL.cam ? "추적 중" : "카메라"}</span><span class="ln ok"></span></button>`
    + `<button class="slot auto g${autoFire ? " on" : ""}" data-key="KeyZ"><span class="t">Z · AUTO</span><span class="v">${autoFire ? "함포·대함 자동" : "OFF"}</span><span class="ln${autoFire ? " ok" : ""}"></span></button>`;
}
function modernKey(code) {
  if (code === "KeyF") { fireSalvo(); return true; }
  if (md.fly) { if (code === "KeyI") { releaseFly(); return true; } if (code === "Space") { flyFire(); return true; } if (code === "KeyB") { flyStrike(); return true; } if (code === "KeyW" || code === "KeyS") return true; }
  if (code === "KeyI") { takeJet(); return true; }
  if (false) { md.salvo = md.salvo === 1 ? 2 : md.salvo === 2 ? 4 : 1; sfx.click(); toast(`일제사격 ${md.salvo}발 단위`); return true; }
  // (KeyK removed: handled automatically)
  // (KeyE removed: handled automatically)
  if (code === "KeyG") { const C = myAir(); if (!C) { sfx.deny(); toast("탑재 전투기 없음"); return true; } if (C.jetsReady < 1) { sfx.deny(); toast(`출격 가능 기체 없음 — 재무장 중 ${C.rearm.length}기`); return true; }
    sortieJets(C, "multi"); sfx.click();
    toast(`전투기 출격 — 적기·미사일이 오면 공대공 미사일로 요격하고, 적함이 탐지되면 ${WPN[C.cv.asm].name}로 공격한 뒤 귀환 (I: 직접 조종)`, 5); return true; }
  if (code === "KeyO") { const on = G.player.radarOn === false; for (const s of ours()) if (s.spec.modern) s.radarOn = on; sfx.click();
    toast(on ? `레이더 방사 — 수상 ${SR.surf / 1000} km 탐지·미사일 조기 경보. 대신 적 ESM에 ${SR.esm / 1000} km 밖에서도 잡힘` : `방사 통제(EMCON) — 적 ESM에 안 잡힘. 대신 적함은 ESM·헬기로만, 미사일은 ${SR.eo / 1000} km 안에서만 탐지`); return true; }
  if (code === "KeyY") { const P = G.player, h = MSL.helos.find((x) => x.alive && x.owner === P);
    if (h) { h.home = true; sfx.click(); toast(`${h.name} 귀환 명령`); return true; }
    if (P.heloCd > 0) { sfx.deny(); toast(`헬기 정비 중 — ${Math.ceil(P.heloCd)}초`); return true; }
    const T = (goodCt(lock) && lock) || bestContact(), ct = T && G.cts.get(T), dest = ct ? new THREE.Vector3(ct.x, 0, ct.z) : P.pos.clone().add(new THREE.Vector3(Math.cos(P.heading) * 15000, 0, Math.sin(P.heading) * 15000));
    const dir = dest.clone().sub(P.pos).setY(0), L = dir.length(); if (L > 8000) dest.copy(P.pos).addScaledVector(dir.normalize(), L - 7000); // stand off ~7 km, outside its SAMs from the target, outside its SAMs
    const hh = mHelo(P, dest, HELO[P.nation] || "함재 헬기"); sfx.click(); log(`${hh.name} 출격 — ${ct ? `${T.name} 방향` : "전방"} 정찰 (Y: 귀환)`, "hit");
    toast(`정찰 헬기: 수평선 너머 ${SR.helo / 1000} km를 레이더로 봅니다. 잡힌 적은 확실한 표적이 되어 미사일·전투기가 정확히 공격하고, 우리 배는 레이더를 꺼도 됩니다`, 5); return true; }
  // (KeyX removed: handled automatically)
  if (code === "KeyT") { if (MSL.cam) { MSL.cam = null; toast("미사일 추적 끝"); return true; } const m = (MSL.last && MSL.last.alive ? MSL.last : null) || [...MSL.list].reverse().find((x) => x.alive && x.side === "us" && x.W.role === "asm") || [...MSL.list].reverse().find((x) => x.alive && x.side === "us") || MSL.jets.find((x) => x.alive && x.side === "us");
    if (!m) { sfx.deny(); toast("추적할 아군 미사일 없음"); return true; } MSL.cam = m; MSL.camEnd = 0; toast(`${m.W.name || m.key} 추적 — T: 끝`); return true; }
  return false;
}
function missileCamera(dt) {
  const m = MSL.cam; if (!m) return false;
  if (!m.alive) { MSL.camEnd = (MSL.camEnd || 1.2) - dt; if (MSL.camEnd <= 0) { MSL.cam = null; return false; } }
  const dir = m.vel.clone().normalize(); setNear(1); camera.fov = 55; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0);
  const want = m.pos.clone().addScaledVector(dir, -38).add(new THREE.Vector3(0, 7, 0)); if (m.alive) camera.position.lerp(want, Math.min(1, dt * 8)); camera.lookAt(m.pos.clone().addScaledVector(dir, 80)); return true;
}
function drawModernHUD() {
  const P = G.player, W = hud.width; hx.textBaseline = "middle";
  const th = MSL.list.filter((m) => m.alive && m.W.role === "asm" && m.side === "foe" && mSeen(m, "us"));
  for (const m of MSL.list) { if (!m.alive) continue; const vis = m.side === "us" || mSeen(m, "us"); if (!vis) continue; const q = proj(m.pos); if (!q || !q.on) continue;
    if (m.side === "foe") { hx.strokeStyle = "#ff5a4e"; hx.lineWidth = 2; hx.beginPath(); hx.moveTo(q.x, q.y - 7); hx.lineTo(q.x + 7, q.y); hx.lineTo(q.x, q.y + 7); hx.lineTo(q.x - 7, q.y); hx.closePath(); hx.stroke(); txt(`${m.W.name} ${fmt(d2(m.pos, P.pos))}m`, q.x + 10, q.y, "#ff8a7a", "bold 10.5px 'Noto Sans KR', sans-serif"); }
    else { hx.fillStyle = m.W.role === "asm" ? "#ffffff" : "#7cc4ff"; hx.beginPath(); hx.arc(q.x, q.y, 2.5, 0, TAU); hx.fill(); } }
  { // situation panel, top-left: sensors, contacts, air
    const cts = [...G.cts.values()], firm = cts.filter((c) => c.q >= 0.6).length, mine = MSL.jets.filter((j) => j.alive && j.side === "us").length, foeJ = MSL.jets.filter((j) => j.alive && j.side === "foe" && mSeen(j, "us")).length, C = myAir(), h = MSL.helos.find((x) => x.alive && x.side === "us");
    panel(14, 14, 318, 70); const F = "12px 'Noto Sans KR', sans-serif";
    txt(`레이더 ${P.radarOn === false ? "끔 (방사 통제)" : "켬"} · ${P.seenByFoe ? (P.foeErr ? "적이 우리 전파를 포착" : "적에게 추적당함") : "적에게 안 잡힘"}`, 26, 31, P.seenByFoe ? "#ffb347" : "#8ef07a", "bold " + F);
    txt(`적함 ${cts.length}척 탐지 (정확 ${firm}) · 적기 ${foeJ}기`, 26, 50, "#e8f0f2", F);
    txt(`아군 전투기 비행 ${mine}${C ? ` · 대기 ${C.jetsReady}` : ""} · 헬기 ${h ? "정찰 중" : "대기"}`, 26, 69, "#cfe7ff", F); }
  for (const j of MSL.jets) { if (!j.alive || (j.side === "foe" && !mSeen(j, "us"))) continue; const q = proj(j.pos); if (!q || !q.on) continue; const col = j.side === "foe" ? "#ff8a7a" : "#cfe7ff"; ntds(hx, q.x, q.y, 7, j.side === "foe", col, false, true); txt(`${j.side === "foe" ? "적 " : ""}${j.name}`, q.x, q.y + 14, col, "10px 'Noto Sans KR', sans-serif", "center"); }
  if (md.icpt && md.icpt.t > 0) { md.icpt.t -= 1 / 60; hx.globalAlpha = clamp(md.icpt.t, 0, 1); txt(`요격! ${md.icpt.n}`, W / 2, 200, "#8ef07a", "bold 20px 'Noto Sans KR', sans-serif", "center"); hx.globalAlpha = 1; }
  if (!cam.map) for (const [e, ct] of G.cts) { if (!e.alive || ct.q >= 0.6) continue; const q = proj(new THREE.Vector3(ct.x, 30, ct.z)); if (!q || !q.on) continue;
    hx.globalAlpha = clamp(ct.q + 0.45, 0.45, 1); ntds(hx, q.x, q.y, 10, true, "#ff8a7a", true); txt(`${e.name} · ${ct.src === "ESM" ? "ESM 추정" : "마지막 추정"} ${(d2(P.pos, ct) / 1000).toFixed(0)} km`, q.x, q.y + 20, "#ff8a7a", "10.5px 'Noto Sans KR', sans-serif", "center"); hx.globalAlpha = 1; }
  if (th.length) { const t = Math.min(...th.map((m) => d2(m.pos, P.pos) / Math.max(m.vel.length(), 1))), w = 380, x = W / 2 - w / 2; panel(x, 130, w, 30);
    txt(`⚠ 적 미사일 ${th.length}발 내습 — 최근접 도달 ${t.toFixed(0)}초 · 방공 ${md.mode === "auto" ? "자동" : md.mode === "manual" ? "수동(E)" : "발사 금지"}`, W / 2, 145, "#ff8a7a", "bold 12px 'Noto Sans KR', sans-serif", "center"); }
}
function drawMissileCamHUD() {
  const m = MSL.cam, W = hud.width, H = hud.height; if (!m) return; hx.textBaseline = "middle"; panel(W / 2 - 170, H - 80, 340, 46);
  const T = m.decoy ? null : m.target, d = T ? d2(m.pos, T.pos) : 0;
  txt(`${m.W.name || m.key} · ${(m.vel.length() * 3.6).toFixed(0)} km/h · 고도 ${m.pos.y.toFixed(0)} m`, W / 2, H - 66, "#fff", "bold 12px 'Noto Sans KR', sans-serif", "center");
  txt(!m.alive ? "신호 소실" : m.decoy ? "기만체에 유인됨" : T ? `표적 ${T.name} · ${fmt(d)} m · ${(d / Math.max(1, m.vel.length())).toFixed(0)}초` : "표적 탐색 중", W / 2, H - 46, m.alive ? "#cfe7ff" : "#ff8a7a", "11px 'Noto Sans KR', sans-serif", "center");
}
function drawCommandHUD(mode) {
  const P = G.player, W = hud.width, H = hud.height, cx = W / 2; hx.textBaseline = "middle";
  if (cam.map) { // Navy Field-style map: every ship as a symbol you can read at a glance
    const ico = (pos, h, c, s, label, sub) => { const q = proj(pos); if (!q || !q.on) return; const q2 = proj(pos.clone().add(new THREE.Vector3(Math.cos(h) * 100, 0, Math.sin(h) * 100))); const a = q2 ? Math.atan2(q2.y - q.y, q2.x - q.x) : 0;
      hx.save(); hx.translate(q.x, q.y); hx.rotate(a); hx.fillStyle = c; hx.strokeStyle = "rgba(0,0,0,.7)"; hx.lineWidth = 1.5; hx.beginPath(); hx.moveTo(s * 1.4, 0); hx.lineTo(-s, -s * 0.6); hx.lineTo(-s * 0.6, 0); hx.lineTo(-s, s * 0.6); hx.closePath(); hx.fill(); hx.stroke(); hx.restore();
      txt(label, q.x, q.y + s + 9, c, "bold 11px 'Noto Sans KR', sans-serif", "center"); if (sub) txt(sub, q.x, q.y + s + 22, "#cfd8dc", "10px 'Noto Sans KR', sans-serif", "center"); };
    for (const S of G.ships) {
      if (!S.alive || !S.root.visible) continue;
      const me = S === P, foe = S.side === "foe", c = me ? "#9be06a" : foe ? (S === lock ? "#ff2d20" : "#ff6b5e") : S.anchored || S.spec === TRANSPORT ? "#7ff0e0" : "#7cc4ff", s = S.spec.L > 240 ? 13 : S.spec.L > 170 ? 11 : 8;
      ico(S.pos.clone().setY(2), S.heading, c, s, me ? `${S.spec.short} (기함)` : S.name, `${Math.round((S.hp / S.maxHp) * 100)}%${me ? "" : ` · ${(d2(P.pos, S.pos) / 1000).toFixed(1)} km`}${foe && G.modern ? ` · ${G.cts.get(S)?.src || ""}` : ""}`);
      if (G.modern) { const q = proj(S.pos.clone().setY(2)); if (q && q.on) ntds(hx, q.x, q.y, s + 9, foe, c); }
    }
    if (G.modern) {
      for (const [e, ct] of G.cts) { if (!e.alive || ct.q >= 0.6) continue; const p = new THREE.Vector3(ct.x, 2, ct.z), q = proj(p), q2 = proj(p.clone().add(new THREE.Vector3(ct.err, 0, 0))); if (!q || !q.on) continue;
        hx.globalAlpha = clamp(ct.q + 0.4, 0.4, 1); ntds(hx, q.x, q.y, 12, true, "#ff8a7a", true);
        if (q2) { hx.strokeStyle = "rgba(255,138,122,.5)"; hx.setLineDash([4, 6]); hx.beginPath(); hx.arc(q.x, q.y, Math.hypot(q2.x - q.x, q2.y - q.y), 0, TAU); hx.stroke(); hx.setLineDash([]); }
        txt(`${e.name} · ${ct.src === "ESM" ? "ESM 방위 접촉" : "마지막 추정"} ±${(ct.err / 1000).toFixed(1)} km`, q.x, q.y + 22, "#ff8a7a", "10.5px 'Noto Sans KR', sans-serif", "center"); hx.globalAlpha = 1; }
      for (const h of MSL.helos) if (h.alive) { const q = proj(h.pos.clone().setY(2)); if (q && q.on) { ntds(hx, q.x, q.y, 9, h.side === "foe", h.side === "foe" ? "#ff8a7a" : "#cfe7ff", false, true); txt(`${h.name} ${Math.max(0, Math.ceil(h.endur - h.t))}초`, q.x, q.y + 14, "#cfe7ff", "10px 'Noto Sans KR', sans-serif", "center"); } }
    }
    for (const e of G.enemies) if (!G.modern && e.alive && !e.root.visible && e.last) { const q = proj(new THREE.Vector3(e.last.x, 2, e.last.z)); if (q && q.on) { hx.globalAlpha = clamp(1 - (G.time - e.last.t) / 120, 0.3, 0.9); txt("?", q.x, q.y, "#aab4ba", "bold 18px 'Noto Sans KR', sans-serif", "center"); txt(`${e.name} (마지막 위치)`, q.x, q.y + 16, "#aab4ba", "10px 'Noto Sans KR', sans-serif", "center"); hx.globalAlpha = 1; } }
    if (G.goal) { const q = proj(new THREE.Vector3(G.goal.x, 2, G.goal.z)); if (q && q.on) { hx.strokeStyle = "#7ff0e0"; hx.lineWidth = 2; hx.strokeRect(q.x - 12, q.y - 12, 24, 24); txt("집결지", q.x, q.y - 22, "#7ff0e0", "bold 12px 'Noto Sans KR', sans-serif", "center"); } }
    const sc = proj(cam.focus.clone().setY(1)), sc2 = proj(cam.focus.clone().setY(1).add(new THREE.Vector3(Math.sin(cam.yaw) * -1000, 0, Math.cos(cam.yaw) * 1000)));
    if (sc && sc2) { const px = Math.abs(sc2.x - sc.x) || 1, km = px > 160 ? 1 : px > 60 ? 2 : 5, L = (px * km); hx.strokeStyle = "#e8f0f2"; hx.lineWidth = 2; const X0 = W - plotCss - 40 - L, Y0 = 14 + plotCss + 110; hx.beginPath(); hx.moveTo(X0, Y0); hx.lineTo(X0 + L, Y0); hx.moveTo(X0, Y0 - 6); hx.lineTo(X0, Y0 + 6); hx.moveTo(X0 + L, Y0 - 6); hx.lineTo(X0 + L, Y0 + 6); hx.stroke(); txt(`${km} km`, X0 + L / 2, Y0 - 12, "#e8f0f2", "bold 11px 'Noto Sans KR', sans-serif", "center"); }
  }
  // nameplates + planes
  for (const S of G.ships) { if (cam.map) break;
    if (!S.root.visible || S.sinking > 20) continue;
    const q = proj(S.pos.clone().setY(S.spec.fb + S.spec.L * 0.1 + 12)); if (!q || !q.on) continue;
    const me = S === P, foe = S.side === "foe", c = me ? "#9be06a" : foe ? "#ff6b5e" : S.anchored || S.spec === TRANSPORT ? "#7ff0e0" : "#7cc4ff", hp = S.hp / S.maxHp;
    const name = me ? `${S.spec.short} (기함)` : S.name;
    hx.font = "bold 11.5px 'Noto Sans KR', sans-serif"; const tw = hx.measureText(name).width + 30, tx = q.x - tw / 2, ty = q.y - 24;
    rr(tx, ty, tw, 19, 2); hx.fillStyle = foe ? "rgba(60,18,12,.55)" : "rgba(28,30,24,.55)"; hx.fill(); hx.strokeStyle = c + "99"; hx.lineWidth = 1; hx.stroke();
    drawFlag(tx + 5, ty + 4.5, 15, S.side, S.nation); txt(name, tx + 25, ty + 10, c, "bold 11.5px 'Noto Sans KR', sans-serif");
    hx.fillStyle = "rgba(0,0,0,.55)"; hx.fillRect(q.x - 30, q.y - 1, 60, 4); hx.fillStyle = c; hx.fillRect(q.x - 30, q.y - 1, 60 * hp, 4);
    if (S === lock) { hx.strokeStyle = "#ff3b30"; hx.lineWidth = 2; const s = 18 + Math.sin(G.time * 6) * 2; hx.beginPath(); hx.moveTo(q.x, q.y + 6); hx.lineTo(q.x + s, q.y + 6 + s); hx.lineTo(q.x, q.y + 6 + 2 * s); hx.lineTo(q.x - s, q.y + 6 + s); hx.closePath(); hx.stroke(); }
  }
  for (const p of air.planes) {
    if (!p.alive || p.crashed) continue; const q = proj(p.pos); if (!q || !q.on) continue;
    const c = p.side === "us" ? "#9fd4ff" : "#ff8a7a"; hx.strokeStyle = hx.fillStyle = c; hx.lineWidth = 1.5;
    hx.beginPath(); hx.moveTo(q.x, q.y - 6); hx.lineTo(q.x + 6, q.y + 4); hx.lineTo(q.x - 6, q.y + 4); hx.closePath(); hx.stroke();
    if (!cam.map && (cam.dist < 5000 || mode === "watch")) txt(p.side === "us" ? p.callsign.replace("와일드캣 ", "WC-") : p.callsign, q.x + 9, q.y, c, "10px 'Noto Sans KR', sans-serif");
  }
  for (const k of markers) { if (k.t <= 0 || (effDist() > 7000 && !/폭탄/.test(k.text))) continue; const q = proj(k.pos); if (q && q.on) txt(k.text, q.x, q.y - 14, k.hit ? "#ff8a7a" : "#ffe066", "bold 11px 'Noto Sans KR', sans-serif", "center"); }
  if (!P.alive || G.auto) return;
  // aim point
  if (!G.plane && mode !== "watch") {
    const torpOn = weapon === "torp" && P.spec.torp, AP = torpOn ? (torpLead ? new THREE.Vector3(torpLead.x, 1, torpLead.z) : new THREE.Vector3(P.pos.x + Math.cos(torpB) * P.spec.torp.range * 0.6, 1, P.pos.z + Math.sin(torpB) * P.spec.torp.range * 0.6)) : P.aimPoint();
    const q = proj(AP.clone().setY(1));
    if (!q || !q.on) { // aim point off screen: arrow at the edge
      const v = AP.clone().setY(1).project(camera), back = v.z > 1, ax = (back ? -v.x : v.x), ay = (back ? -v.y : v.y), m = Math.max(Math.abs(ax), Math.abs(ay), 1e-6), ex = cx + (ax / m) * (W / 2 - 60), ey = H / 2 - (ay / m) * (H / 2 - 70), ang = Math.atan2(-(ay), ax);
      hx.save(); hx.translate(ex, ey); hx.rotate(ang); hx.fillStyle = lock ? "#ff8a7a" : "#fff2c4"; hx.beginPath(); hx.moveTo(14, 0); hx.lineTo(-6, -8); hx.lineTo(-6, 8); hx.closePath(); hx.fill(); hx.restore();
      txt(torpOn ? `어뢰 방위 ${brg(torpB)}` : `조준점 ${(P.aimR / 1000).toFixed(1)} km`, ex, ey + 18, lock ? "#ff8a7a" : "#fff2c4", "bold 11px 'Noto Sans KR', sans-serif", "center");
    }
    if (q && q.on) {
      const torp = torpOn, t = torp ? (torpLead ? torpLead.t : 0) : solve(P.tb, P.aimR).time, c = torp ? "#9be06a" : lock ? "#ff8a7a" : "#fff2c4";
      hx.strokeStyle = c; hx.lineWidth = 1.6; hx.beginPath(); hx.arc(q.x, q.y, 9, 0, TAU); for (const [a, b] of [[-20, -11], [11, 20]]) { hx.moveTo(q.x + a, q.y); hx.lineTo(q.x + b, q.y); hx.moveTo(q.x, q.y + a); hx.lineTo(q.x, q.y + b); } hx.stroke();
      txt(torp ? (torpLead ? `어뢰 요격점 · ${brg(torpB)} · ${t.toFixed(0)}초 후 도달` : `어뢰 · 방위 ${brg(torpB)}`) : `${(P.aimR / 1000).toFixed(2)} km · ${t.toFixed(1)}초${P.aimR >= P.tb.max - 1 ? " · 최대" : ""}`, q.x, q.y + 28, c, "bold 12px 'Noto Sans KR', sans-serif", "center");
      if (lock && !torp) txt(`${fcGrade()}${Math.abs(corrR) > 1 || Math.abs(corrB) > 0.0005 ? ` · 보정 ${signed(corrR)} m / ${(corrB / DEG).toFixed(1)}°` : ""}`, q.x, q.y + 44, "#ffd166", "11px 'Noto Sans KR', sans-serif", "center");
    }
  }
  // ribbons
  ribbons.forEach((r, i) => { const x = cx + (i - (ribbons.length - 1) / 2) * 104, y = H - 104; hx.globalAlpha = clamp(r.t, 0, 1);
    rr(x - 48, y - 13, 96, 26, 4); hx.fillStyle = /격침|격추/.test(r.k) ? "rgba(180,40,30,.9)" : r.k === "도탄" ? "rgba(60,70,80,.85)" : "rgba(30,60,90,.88)"; hx.fill();
    txt(r.n > 1 ? `${r.k} ×${r.n}` : r.k, x, y, "#fff", "bold 12px 'Noto Sans KR', sans-serif", "center"); hx.globalAlpha = 1; });
  if (hintT > 0 && mode !== "watch") { hx.globalAlpha = clamp(hintT, 0, 1); txt(G.modern ? "우클릭: 이동 · 더블클릭: 적함 고정 · F 대함 미사일 · G 전투기 · I 직접 조종 · Y 헬기 · O 레이더 · M 지도 · H 조작법" : "좌클릭 끌기: 시점 이동 · Alt+끌기/클릭: 함선 선택 · 우클릭: 이동 · 더블클릭: 조준/적함 고정 · A/D·W/S 사선 · Space 발사 · M 지도 · H 조작법", cx, 104, "#e8f0f2", "bold 13px 'Noto Sans KR', sans-serif", "center"); hx.globalAlpha = 1; }
}
function drawWatchCaption(p) {
  const W = hud.width, cx = W / 2, B = p.bandit && p.mode === "dogfight" ? ` — ${p.bandit.callsign} 추격` : "";
  panel(cx - 230, 66, 460, 46); txt(`${p.label} · ${p.activity}${B}`, cx, 82, "#cfe7ff", "bold 14px 'Noto Sans KR', sans-serif", "center");
  txt(`${kmh(p.speed)} km/h · 고도 ${Math.round(p.pos.y)} m · 탄약 ${p.ammo} · 폭탄 ${p.bombs} · 기체 ${Math.round(p.hp)}% · 격추 ${p.kills}`, cx, 101, "#9fb0b8", "11px 'Noto Sans KR', sans-serif", "center");
  txt("Enter: 직접 조종 · Tab: 다음 · 우클릭 끌기: 시점 회전 · 휠: 거리", cx, 124, "#ffd166", "11px 'Noto Sans KR', sans-serif", "center");
}
function drawFlightHUD(pl, mode) {
  const W = hud.width, H = hud.height, cx = W / 2, cy = H / 2, GRN = "rgba(110,255,140,.92)", RED = "rgba(255,90,80,.95)", BLU = "rgba(120,200,255,.95)";
  hx.lineWidth = 1.6; hx.strokeStyle = hx.fillStyle = GRN; hx.font = "bold 13px monospace"; hx.textAlign = "center"; hx.textBaseline = "middle";
  const cd = camera.getWorldDirection(new THREE.Vector3()), cyaw = Math.atan2(cd.z, cd.x), cp = camera.position;
  const ck = mode === "cockpit";
  if (!ck) for (let p = -60; p <= 60; p += 10) {
    const a = proj(cp.clone().addScaledVector(dirFrom(cyaw - (p ? 5 : 12) * DEG, p * DEG), 2000)), b = proj(cp.clone().addScaledVector(dirFrom(cyaw + (p ? 5 : 12) * DEG, p * DEG), 2000));
    if (!a || !b) continue; hx.setLineDash(p < 0 ? [6, 5] : []); hx.beginPath(); hx.moveTo(a.x, a.y); hx.lineTo(b.x, b.y); hx.stroke(); hx.setLineDash([]);
    if (p) { hx.fillText(String(p), a.x - 16, a.y); hx.fillText(String(p), b.x + 16, b.y); }
  }
  const sp = kmh(pl.speed), alt = Math.round(pl.pos.y), f = pl.fwd, hdg = ((Math.atan2(f.z, f.x) / DEG) % 360 + 360) % 360;
  if (!ck) { hx.strokeRect(W * 0.3 - 46, cy - 14, 92, 28); hx.fillText(`${sp} km/h`, W * 0.3, cy); hx.fillText("SPEED", W * 0.3, cy - 28);
  hx.strokeRect(W * 0.7 - 46, cy - 14, 92, 28); hx.fillText(`${alt} m`, W * 0.7, cy); hx.fillText("ALT", W * 0.7, cy - 28);
  for (let d = -30; d <= 30; d += 5) { const hh = (Math.round(hdg / 5) * 5 + d + 360) % 360, x = cx + (hh - hdg + (hh - hdg > 180 ? -360 : hh - hdg < -180 ? 360 : 0)) * 7; hx.beginPath(); hx.moveTo(x, 92); hx.lineTo(x, hh % 10 ? 98 : 104); hx.stroke(); if (hh % 10 === 0) hx.fillText(String(hh).padStart(3, "0"), x, 114); }
  hx.strokeRect(cx - 22, 70, 44, 18); hx.fillText(String(Math.round(hdg)).padStart(3, "0"), cx, 79); }
  const nose = proj(pl.pos.clone().addScaledVector(f, 600));
  if (nose && mode !== "cockpit") { hx.beginPath(); hx.arc(nose.x, nose.y, 8, 0, TAU); hx.moveTo(nose.x - 20, nose.y); hx.lineTo(nose.x - 8, nose.y); hx.moveTo(nose.x + 8, nose.y); hx.lineTo(nose.x + 20, nose.y); hx.moveTo(nose.x, nose.y - 8); hx.lineTo(nose.x, nose.y - 14); hx.stroke(); }
  const am = proj(pl.pos.clone().addScaledVector(aimDir(), 600));
  if (am) { hx.strokeStyle = "rgba(255,210,90,.95)"; hx.beginPath(); hx.moveTo(am.x - 8, am.y); hx.lineTo(am.x + 8, am.y); hx.moveTo(am.x, am.y - 8); hx.lineTo(am.x, am.y + 8); hx.stroke(); hx.strokeStyle = GRN; }
  if (air.hitMark > 0 && nose) { hx.save(); hx.strokeStyle = "#ffffff"; hx.lineWidth = 2.4; for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { hx.beginPath(); hx.moveTo(nose.x + sx * 11, nose.y + sy * 11); hx.lineTo(nose.x + sx * 22, nose.y + sy * 22); hx.stroke(); } hx.restore(); }
  if (Math.abs(freeYaw) + Math.abs(freePitch) > 0.05) hx.fillText(`자유 시점 (Alt) ${Math.round(freeYaw / DEG)}°`, cx, 140);
  // hostile planes + ships, lock-on, lead
  if (lockOn && (lockOn.alive === false || (lockOn.root && !lockOn.root.visible))) lockOn = null;
  const box = (p, c, s, name) => { const q = proj(p); if (!q || !q.on) return null; hx.strokeStyle = hx.fillStyle = c; hx.strokeRect(q.x - s, q.y - s * 0.7, s * 2, s * 1.4); hx.textAlign = "left"; hx.fillText(name, q.x + s + 6, q.y); hx.textAlign = "center"; return q; };
  for (const p of air.planes) if (p !== pl && p.alive) box(p.pos, p.side === "foe" ? (p === lockOn ? RED : "rgba(255,140,120,.9)") : BLU, 9, `${p.side === "foe" ? "BANDIT" : "WC"} ${fmt(pl.pos.distanceTo(p.pos))} m`);
  for (const e of seenFoes()) box(e.pos.clone().setY(e.spec.fb + 6), e === lockOn ? RED : "rgba(255,140,120,.9)", 14, `${e.name} ${fmt(pl.pos.distanceTo(e.pos))} m`);
  for (const s of ours()) if (!s.isPlayer || true) { const q = proj(s.pos.clone().setY(s.spec.fb + 6)); if (q && q.on) { hx.strokeStyle = hx.fillStyle = BLU; hx.strokeRect(q.x - 8, q.y - 8, 16, 16); } }
  const L = lockOn; let locked = false;
  if (L) {
    const tpos = L.root ? L.pos.clone().setY(L.spec.fb + 6) : L.pos.clone(), d = pl.pos.distanceTo(tpos), ang = cd.angleTo(tpos.clone().sub(cp));
    locked = d < (L.root ? 8000 : 3500) && ang < 40 * DEG;
    if (locked) { const LL = gunLead(pl, tpos, L.vel), q = proj(LL.lead); if (q) { hx.strokeStyle = hx.fillStyle = RED; hx.beginPath(); hx.arc(q.x, q.y, 11, 0, TAU); hx.moveTo(q.x - 4, q.y); hx.lineTo(q.x + 4, q.y); hx.stroke(); hx.fillText(LL.d < (L.root ? 1200 : 600) ? "FIRE" : "LEAD", q.x, q.y + 22); } }
    else { const dir = tpos.clone().sub(cp).normalize(), ax = dir.dot(new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)), ay = dir.dot(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)), m = Math.hypot(ax, ay) || 1, ex = cx + (ax / m) * Math.min(W, H) * 0.42, ey = cy - (ay / m) * Math.min(W, H) * 0.42; hx.fillStyle = RED; hx.beginPath(); hx.arc(ex, ey, 7, 0, TAU); hx.fill(); hx.fillText(`TGT ${fmt(d)} m`, ex, ey + 18); }
  }
  if (locked && !wasLocked) sfx.lockTone(); wasLocked = locked; hx.strokeStyle = hx.fillStyle = GRN;
  if (pl.bombs > 0) { const imp = predictBomb(pl); if (imp) { const q = proj(imp); if (q && q.on) { const hitIt = seenFoes().some((E) => Math.hypot(imp.x - E.pos.x, imp.z - E.pos.z) < E.spec.L * 0.35); hx.strokeStyle = hx.fillStyle = hitIt ? RED : GRN; hx.beginPath(); hx.moveTo(q.x - 10, q.y); hx.lineTo(q.x + 10, q.y); hx.moveTo(q.x, q.y - 10); hx.lineTo(q.x, q.y + 10); hx.stroke(); hx.fillText(hitIt ? "BOMB — 투하!" : "BOMB", q.x, q.y + 20); hx.strokeStyle = hx.fillStyle = GRN; } } }
  if (ck) { hx.font = "bold 12px monospace"; hx.textAlign = "center"; } hx.fillText(`${pl.label}   격추 ${pl.kills}   THR ${Math.round(pl.throttle * 100)}%   AMMO ${pl.ammo}   BOMB ${pl.bombs}   FLARE ${pl.flares}   DMG ${Math.round(100 - pl.hp)}%   ${lockOn ? `LOCK ${lockOn.callsign || lockOn.name}` : "LOCK OFF"}`, cx, ck ? 28 : H - 60);
  hx.fillStyle = "rgba(220,235,240,.8)"; hx.font = "12px 'Noto Sans KR', sans-serif"; hx.fillText(document.pointerLockElement === canvas ? "마우스 비행 · W/S 스로틀 · Space 기총 · Q 락온 · B 폭탄 · X 플레어 · V 조종석 · Enter 자동조종 · F 귀환" : "화면을 클릭하면 마우스로 비행합니다 (Esc: 커서 해제)", cx, ck ? 48 : H - 36);
}
function drawAlerts(dt) {
  const W = hud.width, cx = W / 2; hx.textBaseline = "middle";
  if (torpThreat && Math.floor(G.time * 4) % 2 === 0) txt(`어뢰 접근! ${torpThreat.toFixed(0)}초`, cx, 150, "#ff3b30", "bold 22px 'Noto Sans KR', sans-serif", "center");
  if (radioSub) { radioSub.t -= dt; if (radioSub.t <= 0) radioSub = null; else { hx.globalAlpha = clamp(radioSub.t, 0, 1); rr(cx - 140, 168, 280, 26, 4); hx.fillStyle = "rgba(10,30,20,.75)"; hx.fill(); txt(`[무전] ${radioSub.text}`, cx, 181, "#b8ffb0", "bold 13px 'Noto Sans KR', sans-serif", "center"); hx.globalAlpha = 1; } }
}
const HELP = [["O / Y (현대전)", "레이더 방사 켜기·끄기(EMCON) / 정찰 헬기 출격·귀환"], ["G / I (현대전)", "전투기 2기 출격 (요격·대함 자동) / 전투기 직접 조종 — 조종 중: 마우스 방향, W/S 추력, 클릭 공대공, B 대함"], ["F / T (현대전)", "대함 미사일 발사 / 미사일·전투기 추적 카메라 — 방공·기만체는 자동"], ["우클릭", "그 지점으로 이동 (Shift: 경유지 추가 · 기함 위: 정지)"], ["1 / 2 / 3 · 0", "속력: 미속 / 반속 / 전속 · 정지"], ["A / D", "사선(포 방향) 좌우 회전 — Shift: 미세"], ["W / S", "사거리 늘리기 / 줄이기"], ["더블클릭", "그 지점 조준 · 적함 더블클릭: 표적 고정 (리드 자동)"], ["좌클릭 끌기", "카메라 자유 이동 (C: 기함으로 복귀)"], ["Alt + 끌기 · Alt + 클릭", "아군 함선 선택 (Shift: 추가) → 우클릭: 선택한 함선 이동 · 기함 우클릭: 호위 복귀"], ["M", "지도 시점 — 위에서 전장 전체 보기 (휠: 축척)"], ["Space", "발사 (누르고 있으면 장전되는 대로 연사)"], ["Z", "자동 공격 켜기/끄기 — 주포 자동 조준·발사 + 어뢰 탑재함은 어뢰 자동 발사"], ["Q", "주포 ↔ 어뢰 (구축함)"], ["R", "수리반 — 화재·침수 진압 + 선체 복구"], ["F", "전투기 출격 (최대 9기) — 오른쪽 항공대 패널에서 기체별 임무: 요격 / 함대 공격 / 자동"], ["Tab", "카메라 대상: 기함 → 전투기 → 항모 → 표적"], ["Enter", "보고 있는 전투기 직접 조종 / 자동 조종 복귀"], ["우클릭 끌기 · 휠", "카메라 회전 · 확대/축소 (방향키도 가능)"], ["V (비행 중)", "조종석 1인칭 ↔ 추적 시점"], ["G", "대공 사수 1인칭 — 40mm 기관포로 적기 직접 사격"], ["미니맵", "우클릭: 이동 · 좌클릭: 조준 · 휠: 축척"], ["U", "화면 표시 모두 끄기 — 전투 장면만 보기 (다시 U)"], ["P", "메뉴 (계속 · 전투 포기 · 소리 설정)"]];
function drawHelp() {
  const x = 14, y = 70, w = 470, h = HELP.length * 20 + 40; panel(x, y, w, h); txt("조작법 (H: 닫기)", x + 14, y + 18, "#ffd166", "bold 13px 'Noto Sans KR', sans-serif");
  HELP.forEach(([k, v], i) => { txt(k, x + 14, y + 42 + i * 20, "#ffc857", "bold 12px 'Noto Sans KR', sans-serif"); txt(v, x + 140, y + 42 + i * 20, "#dfe8ec", "12px 'Noto Sans KR', sans-serif"); });
}

// ── minimap (rotates with the camera; hidden enemies at their last known spot) ──
const plot = $("#plot"), pctx = plot.getContext("2d"); let plotZoom = 1, plotSc = 1, plotCss = 230;
function updateMap() { try { updateMapIn(); } finally { pctx.restore(); } if (G.modern) mapMissiles(); }
function mapJets(M, c) { for (const j of MSL.jets) { if (!j.alive || (j.side === "foe" && !mSeen(j, "us"))) continue; const [x, y] = M(j.pos.x, j.pos.z); ntds(pctx, x, y, 8, j.side === "foe", j.side === "foe" ? "#ff8a7a" : "#cfe7ff", false, true); } void c; }
function mapMissiles() {
  const P = G.player, c = plot.width / 2, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw); pctx.save(); pctx.beginPath(); pctx.arc(c, c, c - 1, 0, TAU); pctx.clip();
  mapJets((x, z) => { const dx = x - P.pos.x, dz = z - P.pos.z; return [c + (dz * cy - dx * sy) * plotSc, c - (dx * cy + dz * sy) * plotSc]; }, c);
  for (const m of MSL.list) { if (!m.alive || !(m.side === "us" || mSeen(m, "us"))) continue; const dx = m.pos.x - P.pos.x, dz = m.pos.z - P.pos.z, x = c + (dz * cy - dx * sy) * plotSc, y = c - (dx * cy + dz * sy) * plotSc;
    if (m.side === "foe") ntds(pctx, x, y, 6, true, "#ff5a4e", false, true); else { pctx.fillStyle = m.W.role === "asm" ? "#ffffff" : "#7cc4ff"; pctx.fillRect(x - 2.5, y - 2.5, 5, 5); } }
  pctx.restore();
}
function updateMapIn() {
  const P = G.player, W = plot.width, c = W / 2, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
  plotCss = plot.getBoundingClientRect().width || 230;
  let far = 9000; for (const e of G.enemies) if (e.alive && e.root.visible) far = Math.max(far, d2(P.pos, e.pos)); if (G.goal) far = Math.max(far, d2(P.pos, G.goal)); if (G.modern) for (const ct of G.cts.values()) far = Math.max(far, d2(P.pos, ct));
  plotSc = c / (clamp(far * 1.15, 9000, G.modern ? 50000 : 30000) / plotZoom);
  const M = (x, z) => { const dx = x - P.pos.x, dz = z - P.pos.z; return [c + (dz * cy - dx * sy) * plotSc, c - (dx * cy + dz * sy) * plotSc]; };
  pctx.clearRect(0, 0, W, W); pctx.save(); pctx.beginPath(); pctx.arc(c, c, c - 1, 0, TAU); pctx.clip(); pctx.fillStyle = "rgba(20,32,36,.28)"; pctx.fillRect(0, 0, W, W);
  pctx.strokeStyle = "rgba(170,200,210,.18)"; pctx.lineWidth = 1.5; for (const r of [5000, 10000, 15000, 20000]) if (r * plotSc < c * 1.4) { pctx.beginPath(); pctx.arc(c, c, r * plotSc, 0, TAU); pctx.stroke(); }
  pctx.setLineDash([8, 8]); pctx.strokeStyle = "rgba(255,255,255,.35)"; pctx.beginPath(); pctx.arc(c, c, P.tb.max * plotSc, 0, TAU); pctx.stroke();
  pctx.strokeStyle = P.seenByFoe ? "rgba(255,110,90,.5)" : "rgba(140,240,120,.35)"; pctx.beginPath(); pctx.arc(c, c, conceal(P) * plotSc, 0, TAU); pctx.stroke(); pctx.setLineDash([]);
  { const nx = c - sy * 0 , n = M(P.pos.x + 1, P.pos.z); void nx; const a = Math.atan2(n[1] - c, n[0] - c); pctx.fillStyle = "rgba(200,220,230,.7)"; pctx.font = "bold 20px 'Noto Sans KR', sans-serif"; pctx.textAlign = "center"; pctx.textBaseline = "middle"; pctx.fillText("N", c + Math.cos(a) * (c - 16), c + Math.sin(a) * (c - 16)); }
  const tri = (x, z, h, color, s = 13) => { const [px, py] = M(x, z); pctx.save(); pctx.translate(px, py); pctx.rotate(h - cam.yaw); pctx.fillStyle = color; pctx.beginPath(); pctx.moveTo(0, -s); pctx.lineTo(s * 0.46, s * 0.7); pctx.lineTo(-s * 0.46, s * 0.7); pctx.closePath(); pctx.fill(); pctx.restore(); };
  pctx.fillStyle = "rgba(120,140,100,.75)"; for (const isl of G.islands) { if (isl.poly) { pctx.beginPath(); isl.poly.forEach(([px, pz], i) => { const [x, y] = M(px, pz); i ? pctx.lineTo(x, y) : pctx.moveTo(x, y); }); pctx.closePath(); pctx.fill(); continue; } const [x, y] = M(isl.x, isl.z), r = isl.r * plotSc; if (x + r < 0 || y + r < 0 || x - r > W || y - r > W) continue; pctx.beginPath(); pctx.arc(x, y, Math.max(r, 1.5), 0, TAU); pctx.fill(); }
  if (G.goal) { const [gx, gy] = M(G.goal.x, G.goal.z); pctx.strokeStyle = "#7ff0e0"; pctx.lineWidth = 2; pctx.strokeRect(gx - 9, gy - 9, 18, 18); pctx.fillStyle = "#7ff0e0"; pctx.font = "16px 'Noto Sans KR', sans-serif"; pctx.fillText("집결지", gx, gy - 20); }
  if (P.nav.length) { pctx.strokeStyle = "#8ef07a"; pctx.setLineDash([6, 6]); pctx.lineWidth = 2; pctx.beginPath(); pctx.moveTo(c, c); for (const w of P.nav) pctx.lineTo(...M(w.x, w.z)); pctx.stroke(); pctx.setLineDash([]); }
  if (P.alive && !G.plane) { const tp = weapon === "torp" && P.spec.torp ? { x: P.pos.x + Math.cos(torpB) * P.spec.torp.range, z: P.pos.z + Math.sin(torpB) * P.spec.torp.range } : P.aimPoint(), [ax, ay] = M(tp.x, tp.z); pctx.strokeStyle = weapon === "torp" ? "#9be06a" : "#fff2c4"; pctx.lineWidth = 1.5; pctx.beginPath(); pctx.moveTo(c, c); pctx.lineTo(ax, ay); pctx.stroke(); pctx.beginPath(); pctx.arc(ax, ay, 6, 0, TAU); pctx.stroke(); }
  for (const e of G.enemies) {
    if (!e.alive) continue;
    if (G.modern) { const ct = G.cts.get(e); if (!ct) continue; const [x, y] = M(ct.x, ct.z), firm = ct.q >= 0.6;
      if (ct.src === "ESM") { const [ox, oy] = M(ct.ox, ct.oz); pctx.strokeStyle = "rgba(255,150,120,.55)"; pctx.lineWidth = 1.5; pctx.setLineDash([4, 6]); pctx.beginPath(); pctx.moveTo(ox, oy); pctx.lineTo(x, y); pctx.stroke(); pctx.beginPath(); pctx.arc(x, y, Math.max(ct.err * plotSc, 6), 0, TAU); pctx.stroke(); pctx.setLineDash([]); }
      pctx.globalAlpha = firm ? 1 : clamp(ct.q + 0.3, 0.35, 0.9); ntds(pctx, x, y, 12, true, e === lock ? "#ff2d20" : "#ff6b5e", !firm); if (firm) tri(e.pos.x, e.pos.z, e.heading, e === lock ? "#ff2d20" : "#ff6b5e", 7); pctx.globalAlpha = 1; continue; }
    if (e.root.visible) tri(e.pos.x, e.pos.z, e.heading, e === lock ? "#ff2d20" : "#ff6b5e", e.isCarrier ? 15 : 12);
    else if (e.last) { const [x, y] = M(e.last.x, e.last.z); pctx.globalAlpha = clamp(1 - (G.time - e.last.t) / 120, 0.25, 0.8); pctx.fillStyle = "#8a959b"; pctx.font = "bold 18px 'Noto Sans KR', sans-serif"; pctx.fillText("?", x, y); pctx.globalAlpha = 1; }
  }
  for (const s of G.ships) if (s.side === "us" && s.alive && s !== P) tri(s.pos.x, s.pos.z, s.heading, s.anchored || s.spec === TRANSPORT ? "#7ff0e0" : "#7cc4ff", s === G.carrier ? 13 : 10);
  tri(P.pos.x, P.pos.z, P.heading, "#9be06a", 14);
  if (G.modern) { for (const s of G.ships) if (s.side === "us" && s.alive && s.spec.modern) { const [x, y] = M(s.pos.x, s.pos.z); ntds(pctx, x, y, 15, false, s === P ? "#9be06a" : "#7cc4ff"); }
    for (const h of MSL.helos) if (h.alive && h.side === "us") { const [x, y] = M(h.pos.x, h.pos.z); ntds(pctx, x, y, 9, false, "#cfe7ff", false, true); pctx.beginPath(); pctx.setLineDash([2, 5]); pctx.strokeStyle = "rgba(207,231,255,.35)"; pctx.arc(x, y, SR.helo * plotSc, 0, TAU); pctx.stroke(); pctx.setLineDash([]); } }
  for (const p of air.planes) if (p.alive && !p.crashed) { const [x, y] = M(p.pos.x, p.pos.z); pctx.fillStyle = p.side === "us" ? "#cfe7ff" : "#ffaa99"; pctx.fillRect(x - 3, y - 3, 6, 6); }
  pctx.fillStyle = "#ffc857"; for (const s of G.shells) { const [x, y] = M(s.pos.x, s.pos.z); pctx.fillRect(x - 1.5, y - 1.5, 3, 3); }
  pctx.fillStyle = "#e0f8ff"; for (const t of G.torps) { if (t.owner.side === "foe" && !t.warned && !G.auto) continue; const [x, y] = M(t.pos.x, t.pos.z); pctx.fillRect(x - 1.5, y - 1.5, 3, 3); }
}

// ── torpedo warning ─────────────────────────────────────────────────────────
function torpWatch(dt) {
  const P = G.player; torpThreat = 0; torpAlarmT = Math.max(0, torpAlarmT - dt); if (!P.alive) return;
  const V = P.vel;
  for (const t of G.torps) {
    if (t.owner.side === "us") continue;
    const rx = t.pos.x - P.pos.x, rz = t.pos.z - P.pos.z, wx = t.dir.x * t.v - V.x, wz = t.dir.z * t.v - V.z, w2 = wx * wx + wz * wz, tc = -(rx * wx + rz * wz) / w2;
    if (!(tc > 0) || tc > 40 || t.v * tc > t.range - t.run) continue;
    if (Math.hypot(rx + wx * tc, rz + wz * tc) > P.spec.L * 0.55 + 35) continue;
    torpThreat = torpThreat ? Math.min(torpThreat, tc) : tc;
    if (!t.warned) { t.warned = true; if (!torpAlarmT) { torpAlarmT = 5; sfx.torpWarn(); G.radio("torp_warn"); log("어뢰 접근! 회피 기동!", "bad"); } }
  }
}

// ── main loop ───────────────────────────────────────────────────────────────
const clock = new THREE.Clock(); let fp = null, frame = 0;
function pickTarget() {
  const P = G.player, vis = seenFoes(); if (lock && lock.alive && lock.root.visible) { G.enemy = lock; return; }
  let best = null, s = Infinity; const ap = P.aimPoint();
  for (const e of vis) { const k = d2(e.pos, ap); if (k < s) { s = k; best = e; } }
  G.enemy = best || G.enemies.find((e) => e.alive) || G.enemies[0] || null;
}
function step(dt) {
  G.time += dt;
  if (screen === "battle") { const k = dt * 1.4; if (keys.has("ArrowLeft")) cam.yaw = wrap(cam.yaw - k); if (keys.has("ArrowRight")) cam.yaw = wrap(cam.yaw + k); if (keys.has("ArrowUp")) cam.pitch = clamp(cam.pitch + k * 0.6, 0.3, 1.5); if (keys.has("ArrowDown")) cam.pitch = clamp(cam.pitch - k * 0.6, 0.3, 1.5); }
  if (G.state === "playing" || G.state === "ending") {
    const P = G.player, pl = G.plane;
    if (G.state === "playing") { G.battleT += dt; events(); }
    hintT = Math.max(0, hintT - dt);
    fogStep(dt); pickTarget();
    if (!G.auto) { navStep(dt); if (!cap.fps) gunStep(dt); aaStep(dt); }
    capStep(dt); if (G.modern) modernStep(dt);
    if (pl && pl.alive) {
      if (keys.has("KeyW")) pl.throttle = clamp(pl.throttle + dt * 0.6, 0, 1); if (keys.has("KeyS")) pl.throttle = clamp(pl.throttle - dt * 0.6, 0, 1);
      if (P.alive && G.enemy && G.enemy.root.visible && G.state === "playing") brain(P, G.enemy, ap, dt, false);
    }
    fleetAI(dt);
    if (G.auto && P.alive && G.state === "playing") { const t = G.enemy || P; ap.blind = !(G.enemy && G.enemy.root.visible); brain(P, t, ap, dt); }
    for (const s of G.ships) s.update(dt);
    updateShells(dt); updateTorps(dt); updateAir(dt); torpWatch(dt);
    if (P.alive && P.hp / P.maxHp < 0.3 && !hullWarned) { hullWarned = true; G.radio("hull"); }
    if (!G.plane && document.body.classList.contains("flying")) leaveFlight();
    rep.cd = Math.max(0, rep.cd - dt);
    for (const t of P.turrets) if (!t.alive && t.fixT > 0 && P.alive) { t.fixT -= dt; if (t.fixT <= 0) { t.alive = true; t.reload = P.reloadT; t.fixT = 0; log(`${t.i + 1}번 포탑 수리 완료 — 사격 재개`, "hit"); sfx.ready(); } }
    if (rep.act > 0) { rep.act -= dt; P.fires.length = 0; if (P.alive) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.006 * dt); }
    for (const r of ribbons) r.t -= dt; while (ribbons.length && ribbons[0].t <= 0) ribbons.shift();
    missionCheck();
    if (G.state === "ending") { endT -= dt; if (endT <= 0) finish(); }
  } else { for (const s of G.ships) s.update(dt); updateShells(dt); updateTorps(dt); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $("#toast").classList.remove("on"); }
  if (!altDown()) { const k = 1 - Math.exp(-dt * 7); freeYaw -= freeYaw * k; freePitch -= freePitch * k; }
  updateAudio(dt, { cockpit: fp === "cockpit", nearShip: fp === "command" ? clamp(1 - effDist() / 4000, 0.3, 1) : 0.35 });
}
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  G.frames = (G.frames || 0) + 1; if (!paused) step(dt); fp = updateCamera(dt); updateOverlays(paused ? 0 : dt); updateBombLines();
  if (cinema) { for (const o of [gunLines, arcLine, maxRing, navLine, fanLines, bombLines, mapGrid, ...navRings]) o.visible = false; for (const k of markers) k.m.visible = false; }
  else bombLines.visible = true;
  updateWorld(dt, G.plane && !G.plane.crashed ? G.plane.pos : isPlane(cam.tgt) ? cam.tgt.pos : screen === "battle" ? cam.focus : G.player ? G.player.pos : null);
  const battle = (G.state === "playing" || G.state === "ending") && G.player;
  document.body.classList.toggle("firstp", fp === "cockpit" && !!battle);
  hx.clearRect(0, 0, hud.width, hud.height);
  if (battle && !cinema) {
    if (G.plane) drawFlightHUD(G.plane, fp);
    else if (fp === "aa") drawAAHUD();
    else if (fp === "board") drawBoardHUD();
    else if (fp === "missile") { drawModernHUD(); drawMissileCamHUD(); }
    else if (fp === "fly") { drawModernHUD(); drawFlyHUD(); }
    else { drawCommandHUD(fp); drawBoardStatus(); drawSel(); if (G.modern) drawModernHUD(); if (fp === "watch") drawWatchCaption(cam.tgt); if (helpOn) drawHelp(); }
    drawAlerts(paused ? 0 : dt);
    if (frame++ % 2 === 0) updateMap(); if (frame % 6 === 0) renderAirPanel(); if (frame % 4 === 0) updatePanels(); syncAutoBtn();
    document.body.classList.toggle("aamode", fp === "aa" || fp === "board");
  }
  const ov = cockpit.visible || aaGun.visible || garandVM.visible || mgVM.visible; if (ov) { ovCam.fov = camera.fov; ovCam.updateProjectionMatrix(); }
  renderFrame(ov);
  requestAnimationFrame(loop);
}

window.__st = { takeJet, releaseFly, flyFire, flyStrike, get flyLock() { return md.flyLock; }, know, sortieJets, myAir, landAt, setSel, get sel() { return sel; }, get lock() { return lock; }, setLock: (v) => { lock = v; }, sensorStep, bestContact, SR, WPN, G, air, cam, aa, MSL, md, fireSalvo, modernKey, setNat: (a, b) => { natUs = a; natFoe = b; }, toAuto, takeOver, setTheater: (t) => { theater = t; }, get cmdr() { return cmdr; }, toggleAA, cap, startBoard, toggleCapFps, canBoard, lockShip: (s) => lockShip(s), setRole, setSortieRole: (r) => { sortieRole = r; }, renderAirPanel, fc, get profile() { return profile; }, start, step, frame: (dt) => { step(dt); updateCamera(dt); }, tryFire, sortie, openYard, openMenu, act, setPause, forfeit,
  moveOrder, aimAtPoint, lockShip, setSpeed, cycleCam, enterFlight, pick, useRepair, setMission: (m) => { mission = m; }, get lock() { return lock; }, get weapon() { return weapon; }, setWeapon: (w) => { weapon = w; },
  get paused() { return paused; }, get torpThreat() { return torpThreat; }, get radioSub() { return radioSub; }, keys, fireTorps, intercept, leadPoint, myRank, steer, setLockOn: (t) => { lockOn = t; }, get lockOn() { return lockOn; }, help: (v) => { helpOn = v; } };
loadModels(); showcase(profile.ship); refreshMenus(); connect();
if (params.has("autostart")) { if (MISSIONS[params.get("mission")]) mission = params.get("mission"); start(params.get("autostart") === "watch"); }
loop();
if (!cmdrSet) setTimeout(() => { if (G.state === "menu") openCmdr(); }, 900);
