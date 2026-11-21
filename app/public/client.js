import { commissionRoutes, contractFor, serviceStatus, noteServiceNotice, applyServiceAction } from "./js/service-rules.js";
import { dutyHistory } from "./js/career-timeline.js";
import { koreanPostName } from "./js/us-post-labels.js";
import { careerStorage, characters, activeCharacterId, createCharacter, selectCharacter, removeCharacter } from "./js/characters.js";
import { calendarLabel, careerDate, rankMonths, serviceDuration } from "./js/service-calendar.js";
import { openingEvent } from "./js/army-opening.js";
import { automaticCaptain, boardCard, preview as boardPreview, settle, hint, interact } from "./js/promotion-board.js";
/**
 * Steel Tide — game flow: missions and battles, the shipyard and the commander's rank,
 * the Navy Field-style command view (right-click to sail, keys lay the dotted gun line),
 * fog of war, the carrier air groups (watch any fighter, or fly one), HUDs and the
 * connection to the captain's room (credits, ships, rank).
 */
import { THREE, $, PI, TAU, DEG, KN, clamp, wrap, brg, fmt, params, rnd, gauss, G, camera, canvas, renderer, scene, ovScene, ovCam, makeIslands, MAPS, addIsland, clearFx, updateWorld, spray, spark, flash, spawnSplash } from "./js/core.js";
import { A, initAudio, setMuted, setVolume, sfx, updateAudio, radio, bgm, setBgmOn, jetSound, droneSound, fanfare, stopFanfare, playMinisterAnthem, playPotusAnthem } from "./js/audio.js";
import { OPS, isModernOp, opsInit, opsStep, opsClear, opsCheck, opsMarks, opsShellLand, aswRocket, nearestSubContact, O as OPSO, opsDebug, opsStatus, jamDrones } from "./js/ops.js";
import { cicStart, cicBigFeeds, cicStop, cicStep, cicToggle, cicExpand, cicPending, cicResolve, cicUsed, cicWcs, cicSetWcs, cicFeedInfo } from "./js/cic.js";
import { post, renderFrame, renderPiP, renderToCanvas } from "./js/post.js";
import { M as MSL, WPN, launch as mLaunch, JET_US, setTrails, stepMissiles, defend, decoy as mDecoy, pickSam, seen as mSeen, clearMissiles, arm as mArm, SENS as SR, jetFlare, jetGun, killMissile, launchHelo as mHelo, stepHelos, launchJet, stepJets, stepFlares, flaresOf } from "./js/modern.js";
import { landAt, setWeather, setMapLook } from "./js/core.js";
import { MODERN, TRANSPORT, Ship, solve, leadPoint, brain, escort, mkBrain, updateShells, clearShells, loadModels, fireTorps, updateTorps, clearTorps, intercept, torpMount, TORP_SPREAD, torpPath, tubeBearing, hitFX, jetMesh } from "./js/ships.js";
import { air, dirFrom, clearAir, updateAir } from "./js/air.js";
import { aaGun, updateAAGun, jetPit, updateJetPit } from "./js/interior.js";
import { soldier, animSoldier, fireSoldier, garandVM, mgVM, updateGarand, updateMG } from "./js/infantry.js";
import { STAFF_ROLES, STAFF, TRAITS, staff, officer, skillOf, appoint, staffMods, staffServe, canAppoint, canFill, candidates, roleTitle, ECH, echOf, staffFor, FLAG_POSTS, FLEET_CDR, SERVICES, BRANCHES, normBranch, serviceOf, careerTitle, setService, setBranch, POST_RANK, holds, saveStaff, isUS, setNation, curServices, curBranches, curFlagPosts, flagPostsForTrack } from "./js/staff.js";
import { koreanUsRanks, toggleUsRankLanguage, insigniaUS, US_PAY, US_BRANCHES, US_SERVICES, usRankName, usRankFull, US_SVC_ORG, usNpcName, usDischargeEndingOf } from "./js/us-ranks.js";
import { openingCarryover, dutyState, ensureDuty, dutyEventById, dutyCrisisById, dutyOptionHint, resolveDuty, resolveReport, resolveCrisisDelegate, resolveCrisisDirect, nextDutyWeek, STANCES, setStance, resolveRivalEvent } from "./js/duty.js";
import { bossFor, RIVAL_EVENTS, relLabel, allyBonus, chronicleHTML, downloadChroniclePNG } from "./js/relations.js";
import { career, saveCareer, careerInit, logPromotion, perkMods, payStep, MEDALS, US_MEDALS, awardMedals } from "./js/career.js";
const curMedals = () => (isUS() ? US_MEDALS : MEDALS);
import { openOpMap, opMapAdvance, opMapState, opMapAir } from "./js/opmap.js";
import { openScene, playCuts, setTheme } from "./js/scene.js";
import { adminBar } from "./js/career-rules.js";
import { potusState, potusStart, potusHTML, potusClick, potusTitle, potusAdmin } from "./js/potus.js";
import { presState, presStart, presHTML, presClick, presAdmin, presTheme, PARTIES } from "./js/president.js";
import { usPresState, usPresStart, usPresHTML, usPresClick, usPresAdmin, usPresOffice } from "./js/us-pres.js";
import { unlockEnding, endingsHTML, trophyShelfHTML } from "./js/endings.js";
import { galleryHTML, minAdminEnd } from "./js/ministry.js";
import { minFx, minHTML, minClick, minStart, minOpResult, minState, legacy, NG_RESET } from "./js/ministry.js";
/** 국방부장관 교리·사업·2회차 특전을 전투 보정치에 곱한다 */
const withMin = (m) => { const F = minFx(); return { ...m, outK: m.outK * F.outK, inK: m.inK * F.inK, icptK: m.icptK * F.icptK, reloadK: (m.reloadK || 1) * F.reloadK }; };
/** 2회차 특전: 초반(소위~대위) 봉급 +50%, 중장부터 원수 승진 경험치 ×1.43 */
const ngFlags = () => { const L = legacy(); if (!L?.medal) return {}; const g = myGrade(); return { ...(g <= 2 ? { ngPay: 1 } : {}), ...(L.minister && g >= 8 ? { ngXp: 1 } : {}) }; };
let usPresPreview = false;
let hqView = "duty", minDirect = false, minDirect3d = false, dutyDirect = false, svcDraft = null;
import { FOCUS, PASS, minBattles, scoreBattle, recordEval, evalOf, board, marshalQuest, setCap, deferNote } from "./js/service.js";
import { ECON_RANKS, ECON_RANK_XP, econRank, econNewProfile, econReward, econCheck, econApply } from "./js/shop.js";

// ── profile + room connection ───────────────────────────────────────────────
const CACHE = "steeltide:profile";
let profile = (() => { try { const p = JSON.parse(careerStorage.getItem(CACHE)); if (p && Array.isArray(p.owned) && p.upg) return p; } catch {} return econNewProfile(); })();
const saveProfile = () => { try { careerStorage.setItem(CACHE, JSON.stringify(profile)); } catch {} };
const ERR = { "not enough credits": "크레딧이 부족합니다", "already owned": "이미 보유한 함선입니다", "max level": "이미 최대 단계입니다", "not owned": "보유하지 않은 함선입니다", "bad code": "코드가 올바르지 않습니다", "rank too low": "계급이 부족합니다" };
let socket = null, retry = 0, serverSeen = false, inflight = 0; const outbox = [];
function playerId() { const key = "hf:game:playerId"; let id = null; try { id = careerStorage.getItem(key); } catch {} if (!id) { id = Math.random().toString(36).slice(2, 10); try { careerStorage.setItem(key, id); } catch {} } return id; }
const myId = playerId();
function connect() {
  if (document.documentElement.dataset.staticHost || location.hostname.endsWith(".github.io")) return;
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
const tipSeen = new Set(); const tip = (k, long, short, dur) => { if (tipSeen.has(k)) toast(short); else { tipSeen.add(k); toast(long, dur); } }; /* long help once per session, then one line */
function toast(t, dur = 2.4) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); toastT = dur; }
const logs = [];
function renderLog() { const L = $("#log"); L.innerHTML = ""; for (const l of logs) { const d = document.createElement("div"); d.textContent = l.text; d.className = l.cls; L.append(d); } }
function log(text, cls = "") { logs.push({ text, cls }); if (logs.length > 6) logs.shift(); renderLog(); }
G.log = log;
const signed = (v) => (v >= 0 ? "+" : "−") + fmt(Math.abs(v));
const kmh = (ms) => Math.round(Math.abs(ms) * 3.6);

// ── rank: the player is the fleet commander; ship captains and pilots hold fixed grades ──
const xpGrade = () => econRank(profile.xp); /* the rank your XP alone reaches */
const myGrade = () => { if (career.cap == null) { career.cap = xpGrade(); saveCareer(); } return Math.min(xpGrade(), career.cap); }; /* full rank 0 소위 … 10 원수, as approved by the promotion board */
const myRank = () => Math.max(0, myGrade() - 3);
/** 함정 진급 경로: 계급이 오르면 더 큰 함정이 열리고, 열린 함정 중 하나를 기함으로 고른다 (career.ship). */
const KR_LADDER = [{ g: 0, id: "pkg", sis: "pkg2", t: 1 }, { g: 3, id: "ffg", sis: "ffg2", t: 2 }, { g: 4, id: "ddh", sis: "ddh2", t: 3 }, { g: 5, id: "ddg", sis: "ddg2", t: 3 }, { g: 6, id: "jeongjo", sis: "jeongjo2", t: 5 }];
const shipsOpen = (g = myGrade()) => KR_LADDER.filter((s) => g >= s.g);
const ladderOf = (id) => KR_LADDER.find((s) => s.id === id) || KR_LADDER[KR_LADDER.length - 1];
const econTier = () => { const g = myGrade(); return Math.min(g >= 7 ? 5 : g >= 6 ? 4 : g >= 4 ? 3 : g >= 3 ? 2 : 1, ladderOf(flagshipId()).t); }; /* reward tier by rank, capped by the ship you take out */
const flagshipId = () => { const o = shipsOpen(); return (o.find((s) => s.id === career.ship) || o[o.length - 1]).id; }; /* 한국 해군 기함 (WWII removed; archive branch ww2-archive) */ /* gameplay tier: ships, nations and enemy strength still count from 소령 */
const RANK_STARS = ["소령", "중령", "대령", "★", "★★", "★★★", "★★★★", "★★★★★"];
const escortsFor = (r) => Math.min(4, 1 + Math.floor(r / 2));
const fightersFor = () => 9;
/** WWII US Navy billet typical for each rank (game simplification; see report). */
const POSTS = ["함정 갑판사관", "함정 작전관", "구축함 부장", "구축함 함장", "구축대 사령 (DesDiv)", "구축전대 사령 · 코모도어 (DesRon)", "기동소함대 사령관 (Task Flotilla)", "기동전단 사령관 (Task Group)", "기동부대 사령관 (Task Force)", "함대 사령장관 (Fleet)", "태평양 함대 총사령관 (CINCPAC)"];
const presTitle = () => { const T = potusTitle(); if (T) return T; const P = presState(); if (!P) return "민간인 · 전 국방부장관"; const pn = PARTIES[P.party]?.n; return { pri: `${pn} 경선 후보`, camp: `${pn} 대통령 후보`, night: "선거일", won: "대통령 당선인" }[P.stage] || "민간인 · 전 국방부장관"; };
const isPotus = () => !!(!isUS() && civil() && potusState()), potusOn = () => isPotus() && !potusState().done;
const currentUsOffice = () => (canEnterUsPres() || (isUS() && profile.admin && usPresPreview)) ? usPresOffice(usPresState()) : null;
function badge(r, size, usOffice) {
  const mark = usOffice?.mark ?? (isPotus() ? "img/potus_mark.png" : null);
  const alt = usOffice?.mark ? "미국 대통령 휘장" : "대통령 표장";
  return mark ? `<img src="${mark}" alt="${alt}" class="pmark" style="height:${size}px">` : usOffice ? "" : insignia(r, size);
}
const civil = () => !!(career.minister && minState()?.retired); /* 임기를 마친 장관 → 민간인 */
const postOf = (r) => career.minister && r === myGrade() ? (civil() ? "전 국방부장관" : "국방부장관") : career.post && career.post.g === r ? career.post.t : staff.branch ? careerTitle(clamp(r, 0, 10)) : POSTS[clamp(r, 0, POSTS.length - 1)]; /* career follows the branch picked as 소위 */
const postLabel = (title, us = isUS()) => us && koreanUsRanks() ? koreanPostName(title) : title;
const rankLabel = (g, svk) => (isUS() ? usRankName(g, svk || serviceOf(staff.branch)) : ECON_RANKS[Math.max(0, Math.min(10, g))]);
function rankLine() {
  const r = myGrade(), next = ECON_RANK_XP[r + 1];
  return { r, name: rankLabel(r), next: next ? rankLabel(r + 1) : null, need: next, pct: next ? clamp((profile.xp - ECON_RANK_XP[r]) / (next - ECON_RANK_XP[r]), 0, 1) : 1 };
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
  cn: { n: "중국", cv: "shandong", base: { type: "J-16 (지상 발진)", asm: "YJ-83K", aam: "PL-12", n: 4 }, ships: ["t055", "t055b"], bloc: "e", names: ["왕젠궈", "리웨이", "장하이펑", "류청"], rk: "대교" },
  nk: { n: "북한", base: { type: "MiG-29 (지상 발진)", asm: "금성-3", aam: "R-27", n: 4 }, ships: ["choehyon", "kangkon"], bloc: "e", names: ["림철진", "강명수", "한광혁", "박영일"], rk: "대좌" },
};
// Taegeukgi proportions and trigram layout follow the Ministry of the Interior and Safety drawing guide.
const TAEGEUKGI = (() => {
  const trigram = (x, y, angle, broken) => `<g transform="translate(${x} ${y}) rotate(${angle})">${[-4, -1, 2].map((line, i) =>
    broken[i] ? `<rect x="-6" y="${line}" width="5.5" height="2"/><rect x=".5" y="${line}" width="5.5" height="2"/>`
      : `<rect x="-6" y="${line}" width="12" height="2"/>`).join("")}</g>`;
  const angle = Math.atan2(2, 3) * 180 / Math.PI;
  const x = 22 * Math.cos(angle * Math.PI / 180), y = 22 * Math.sin(angle * Math.PI / 180);
  return `<rect width="72" height="48" fill="#fff"/><g transform="translate(36 24)">
    <g transform="rotate(${angle})"><circle r="12" fill="#cd2e3a"/><path d="M-12 0a6 6 0 0 0 12 0a6 6 0 0 1 12 0a12 12 0 0 1-24 0Z" fill="#0047a0"/></g>
    <g fill="#000">${trigram(-x, -y, angle - 90, [0, 0, 0])}${trigram(x, -y, 90 - angle, [1, 0, 1])}${trigram(-x, y, 90 - angle, [0, 1, 0])}${trigram(x, y, angle - 90, [1, 1, 1])}</g>
  </g>`;
})();
const koreanFlagImage = new Image();
koreanFlagImage.src = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 48" width="72" height="48">${TAEGEUKGI}</svg>`);
const FLAGSVG = {
  kr: (w = 22) => `<svg class="flag" role="img" aria-label="대한민국 국기" width="${w}" height="${w * 2 / 3}" viewBox="0 0 72 48">${TAEGEUKGI}</svg>`,
  jp: (w = 22) => `<svg class="flag" role="img" aria-label="일본 국기" width="${w}" height="${Math.round(w * 0.66)}" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/></svg>`,
  cn: (w = 22) => `<svg class="flag" role="img" aria-label="중국 국기" width="${w}" height="${Math.round(w * 0.66)}" viewBox="0 0 30 20"><rect width="30" height="20" fill="#de2910"/><circle cx="5" cy="5" r="3" fill="#ffde00"/><g fill="#ffde00"><circle cx="10" cy="2" r="0.8"/><circle cx="12" cy="4" r="0.8"/><circle cx="12" cy="7" r="0.8"/><circle cx="10" cy="9" r="0.8"/></g></svg>`,
  nk: (w = 22) => `<svg class="flag" role="img" aria-label="북한 국기" width="${w}" height="${Math.round(w * 0.66)}" viewBox="0 0 30 20"><rect width="30" height="20" fill="#024fa2"/><rect y="3.3" width="30" height="13.4" fill="#fff"/><rect y="4" width="30" height="12" fill="#ed1c27"/><circle cx="10" cy="10" r="4" fill="#fff"/><path d="M10 6.6l1 3h3.2l-2.6 1.9 1 3-2.6-1.9-2.6 1.9 1-3-2.6-1.9h3.2z" fill="#ed1c27"/></svg>`,
};
const flagOf = (S, w) => (S?.nation === "us" ? FLAG.us(w) : S?.nation && FLAGSVG[S.nation] ? FLAGSVG[S.nation](w) : S?.side === "foe" ? FLAG.foe(w) : FLAG.us(w));
function drawNationFlag(x, y, w, n) {
  const h = w * 0.66; hx.fillStyle = n === "cn" ? "#de2910" : n === "nk" ? "#ed1c27" : "#fff"; hx.fillRect(x, y, w, h);
  if (n === "kr") { if (koreanFlagImage.naturalWidth) hx.drawImage(koreanFlagImage, x, y, w, w * 2 / 3); }
  else if (n === "jp") { hx.fillStyle = "#bc002d"; hx.beginPath(); hx.arc(x + w / 2, y + h / 2, h * 0.3, 0, TAU); hx.fill(); }
  else if (n === "cn") { hx.fillStyle = "#ffde00"; hx.beginPath(); hx.arc(x + w * 0.18, y + h * 0.26, h * 0.15, 0, TAU); hx.fill(); }
  else if (n === "nk") { hx.fillStyle = "#024fa2"; hx.fillRect(x, y, w, h * 0.17); hx.fillRect(x, y + h * 0.83, w, h * 0.17); hx.fillStyle = "#fff"; hx.beginPath(); hx.arc(x + w * 0.33, y + h / 2, h * 0.2, 0, TAU); hx.fill(); }
}
function drawFlag(x, y, w, side, nation) { // canvas version for nameplates
  if (nation && nation !== "us") { drawNationFlag(x, y, w, nation); return; }
  if (nation === "us") side = "us";
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
  for (const s of G.ships) s.captain = `${s.isPlayer ? FLAG_CAPTAIN[s.spec.id] || cmdr.name : s.side === "foe" ? jp[j++ % jp.length] : us[u++ % us.length]} ${captainOf(s.spec, s.side)}`;
}
const starPath = (cx, cy, R) => { let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? R * 0.42 : R; d += `${i ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`; } return d + "Z"; };
/** 원수: five stars in a ring over a small wreath (not five in a row). */
function marshalBadge(size, fill = "#d9dde0", wreath = "#d9dde0") {
  const st = [0, 1, 2, 3, 4].map((i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return `<path d="${starPath(30 + Math.cos(a) * 17, 27 + Math.sin(a) * 17, 9)}" fill="${fill}" stroke="#7d8287" stroke-width=".6"/>`; }).join("");
  const wr = [-1, 1].map((s) => [0, 1, 2].map((i) => `<ellipse cx="${30 + s * (6 + i * 4)}" cy="${55 - i * 3.5}" rx="2.4" ry="4.2" transform="rotate(${s * (30 + i * 18)} ${30 + s * (6 + i * 4)} ${55 - i * 3.5})" fill="${wreath}"/>`).join("")).join("") + `<circle cx="30" cy="55" r="3" fill="${wreath}"/>`;
  return `<svg role="img" aria-label="원수 계급장" width="${size * 1.25}" height="${size * 1.25}" viewBox="0 0 60 62">${st}${wr}</svg>`;
}
/* 한국군 계급 장식: 위관 다이아몬드, 영관 무궁화 (silver) */
const krDia = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -10 L7 0 L0 10 L-7 0Z" fill="#e4e7ea" stroke="#8a9096" stroke-width=".6"/><path d="M0 -10 L0 10 M-7 0 L7 0 M0 -10 L-3.5 0 L0 10 L3.5 0Z" stroke="#9aa1a7" stroke-width=".5" fill="none"/></g>`;
const krMug = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-5.2" rx="4.1" ry="5.4" transform="rotate(${a})" fill="#e4e7ea" stroke="#8a9096" stroke-width=".6"/>`).join("")}<circle r="2.6" fill="#c9cdd1" stroke="#8a9096" stroke-width=".6"/>${[0, 72, 144, 216, 288].map((a) => `<line x1="0" y1="0" x2="0" y2="-7" transform="rotate(${a})" stroke="#9aa1a7" stroke-width=".5"/>`).join("")}</g>`;
const krDevs = (g, cx, cy, s, gap) => { const f = g <= 2 ? krDia : krMug, n = (g % 3) + 1, d = gap * (f === krDia ? 0.88 : 1); return Array.from({ length: n }, (_, i) => f(cx + (i - (n - 1) / 2) * d, cy, s)).join(""); };
function insignia(r, size = 24) { /* KR: 다이아몬드/무궁화/별/원수 · US: 바/오크리프/독수리/별/5성 원형 */
  if (isUS()) return insigniaUS(r, size);
  if (r >= 10) return marshalBadge(size);
  if (r >= 6) return insigniaField(r - 3, size);
  const n = (r % 3) + 1, w = 34 * n;
  return `<svg role="img" aria-label="${ECON_RANKS[r]} 계급장" width="${Math.min(size * n * 0.8, size * 2.4)}" height="${size}" viewBox="0 0 ${w} 34">${krDevs(r, w / 2, 17, 1.45, 34)}</svg>`;
}
function insigniaField(r, size = 24) { // US Navy collar devices: oak leaf (gold/silver), eagle, stars
  if (r <= 1) return `<svg role="img" aria-label="${ECON_RANKS[r + 3]} 계급장" width="${size}" height="${size}" viewBox="0 0 34 34"><path d="M17 3 C10 8 7 14 9 21 C11 27 15 30 17 31 C19 30 23 27 25 21 C27 14 24 8 17 3 Z" fill="${r ? "#d9dde0" : "#d4a93a"}"/><path d="M17 6 L17 30" stroke="${r ? "#8b9399" : "#8a6a1c"}" stroke-width="1.4"/></svg>`;
  if (r === 2) return `<svg role="img" aria-label="대령 계급장" width="${size}" height="${size}" viewBox="0 0 34 34"><path d="M3 12 L12 15 L17 9 L22 15 L31 12 L25 20 L20 21 L17 28 L14 21 L9 20 Z" fill="#d9dde0"/></svg>`;
  const n = r - 2, w = 34 * n;
  return `<svg role="img" aria-label="${ECON_RANKS[r + 3]} 계급장 (별 ${n}개)" width="${Math.min(size * n, size * 2.6)}" height="${size}" viewBox="0 0 ${w} 34">${Array.from({ length: n }, (_, i) => `<path transform="translate(${i * 34} 0)" d="M17 3 L21 13 L32 13 L23 20 L27 31 L17 24 L7 31 L11 20 L2 13 L13 13 Z" fill="#e3e6e8"/>`).join("")}</svg>`;
}

// ── missions ────────────────────────────────────────────────────────────────
const MISSIONS = {
  modern: { n: "현대전 · 미사일 해전", d: "이지스함 대 적 구축함. 대함미사일과 다층 방공 — 1단계 (계급·크레딧 공유)" },
};
for (const [k, v] of Object.entries(OPS)) MISSIONS[k] = v; // modern operations (ops.js)
// who you can command and whom you fight: rank (index into ECON_RANKS) needed for each
const SIDE_US = { kr: 0, us: 0, jp: 4 }, SIDE_FOE = { nk: 0, cn: 2 };
function fixNations() { const rk = myRank(); natUs = "kr"; /* 한국편 only for now */ if (!(SIDE_FOE[natFoe] <= rk)) natFoe = "nk"; }
let natUs = "kr", natFoe = "nk"; try { const a = careerStorage.getItem("steeltide:natUs"), b = careerStorage.getItem("steeltide:natFoe"); if (NATIONS[a]) natUs = a; if (NATIONS[b]) natFoe = b; } catch {}
// ── 한반도 시나리오 (fictional): a modern campaign, each stage built on one modern operation ──
/* 한반도 시나리오 「경계의 파도」 (fictional, 20XX): one story told across your career — each chapter opens at a rank,
   after the one before it. Characters and the enemy commander are invented. */
const KCAMP = [
  { n: "1장 · 첫 출동", rk: 0, d: "백령도 근해 · 무인기 떼 기습", m: "modern:drone", map: "west", brief: ["가상의 20XX년 봄. 임관 석 달 차, 당신은 서해 초계에 나선 전단에 처음 승조했다. 함장 윤석진 대령이 짧게 말한다. \"바다는 조용할 때가 제일 위험하다.\"", "새벽, 백령도 북서쪽에서 정체불명의 무인기 떼가 낮게 다가온다.", "목표 — 자폭 드론 4차례 공격을 막고 군수지원함을 지켜라.", "할 일 — 자동 방공만으론 다 못 막는다. G로 직접 대공 사격, 떼가 몰려오면 E로 재밍. 기함을 군수지원함과 드론 사이로 옮겨 막아서라."], epi: "드론 잔해를 분석한 정보장교 한서윤 소령이 고개를 젓는다. \"공격이 아니라 시험이었습니다. 누군가 우리 방공망이 어떻게 반응하는지 재고 있었어요.\" 잔해에는 검은 용 모양의 표식이 남아 있었다." },
  { n: "2장 · 검은 용의 그림자", rk: 1, d: "울릉도 근해 · 적 잠수함 3척", m: "modern:asw", map: "east", brief: ["서해 사건 이후 동해 해상 교통로 곳곳에서 정체불명의 수중 소음이 잡힌다. 한서윤 소령은 그 패턴에 '흑룡'이라는 이름을 붙였다.", "울릉도 근해에 잠수함 3척의 침투 징후 — 상선 항로 바로 아래다.", "목표 — 적 잠수함을 모두 격침하라.", "팁 — 속력을 줄이면 소나가 더 멀리 듣는다. Y로 헬기를 띄워 소노부이를 뿌리고, Q로 대잠로켓을 골라 Space."], epi: "마지막 잠수함이 가라앉기 직전 짧은 송신을 남겼다. 해독된 내용은 한 줄 — \"1단계 종료. 다음은 하늘.\" 윤석진 대령은 동해 이지스함 전개를 건의했다." },
  { n: "3장 · 하늘이 열리는 밤", rk: 3, d: "동해 · 탄도미사일 4차례", m: "modern:bmd", map: "east", brief: ["소령이 된 당신은 동해에 전개한 이지스함의 작전관을 맡았다. 조기경보 위성이 연속 발사 징후를 포착한다.", "'다음은 하늘'이라던 흑룡의 송신이 현실이 되었다.", "목표 — 4차례 탄도미사일 공격에서 군수지원함과 함대를 지켜라.", "팁 — 레이더(O)를 켜 둬야 일찍 본다. Space로 추가 요격탄."], epi: "모든 미사일을 막아 냈지만, 한서윤 소령은 발사 패턴에서 이상한 점을 찾아냈다. \"우리 이지스함을 동해에 묶어 두려는 미끼였습니다. 진짜 노림수는 남쪽 바다예요.\"" },
  { n: "4장 · 해협의 선단", rk: 4, d: "부산 앞바다 · 수송선단 호위", m: "modern:convoy", map: "strait", brief: ["중령으로 진급한 당신에게 첫 독립 임무가 떨어졌다. 동맹 증원 전력을 실은 수송선단을 대한해협 너머 부산까지 호위하라.", "흑룡은 잠수함과 드론, 미사일함을 길목마다 깔아 두었다.", "목표 — 수송선 3척 중 2척 이상을 집결지까지 호위하라.", "팁 — 선단 앞에서 잠수함을 먼저 찾고, 드론은 근접방어로. 해안 지대함 포대 지원을 쓸 수 있다."], epi: "선단은 부산에 닿았다. 그날 밤, 함대사령부로 자리를 옮긴 윤석진 준장이 연락해 왔다. \"흑룡의 주력이 제주 남쪽에 모였다. 자네가 전대를 맡아 줘야겠어.\"" },
  { n: "5장 · 제주 남방, 불 꺼진 바다", rk: 5, d: "제주 남쪽 · 야간 EMCON 기습", m: "modern:emcon", map: "jeju", tod: "night", brief: ["대령, 전대장. 수적으로 열세인 당신의 전대가 흑룡의 주력 함대를 상대해야 한다.", "윤석진 준장의 지시는 단순하다. \"먼저 보고, 먼저 쏴라. 레이더는 마지막 순간까지 끄고.\"", "목표 — 레이더를 끈 채(EMCON) 밤바다로 접근해 적 함대를 격멸하라.", "팁 — 적은 레이더를 켜고 있어 전자지원(ESM)으로 먼저 잡힌다. 아군 레이더(O)를 켜는 순간 들킨다."], epi: "흑룡의 주력은 무너졌지만 그 지휘관은 북쪽으로 빠져나갔다. 별을 단 당신에게 마지막 명령이 내려온다 — 서해에서 그의 남은 전단을 막아라. 이번에는 함교가 아니라 작전지도 위에서." },
  { n: "6장 · 경계의 파도 (작전 지휘)", rk: 6, d: "서해 해상 차단 · 작전지도", m: "opmap", map: "west", brief: ["준장, 해상전투단장. 흑룡이 남은 전단을 모아 연평 해역으로 남하한다. 이제 당신은 한 척의 배가 아니라 여러 전단과 지원 전력을 움직인다.", "윤석진 소장이 작전지도 앞에서 말한다. \"자네가 처음 탔던 그 바다야. 이번엔 자네가 판을 짜게.\"", "목표 — 작전지도에서 전단 기동과 지원을 계획해 적이 연평 해역에 들어오지 못하게 막아라.", "팁 — 적 예상 진로(빨간 점선)를 가로막고, P-3C로 먼저 찾아라."], epi: "흑룡의 마지막 전단이 경계선 북쪽으로 물러났다. 함대사령부 상황실에 박수가 터지고, 윤석진 소장이 당신의 어깨를 두드린다. \"이제 이 바다는 자네 몫이야.\" — 「경계의 파도」 완결." },
  { n: "외전 · 섬 탈환", rk: 6, d: "가상의 섬 · 상륙 지원 함포", m: "modern:shore", map: "arch", bonus: true, brief: ["흑룡 사건의 여파로 점거된 가상의 섬을 되찾는 상륙 작전. 해안포와 대함미사일 진지가 상륙정을 노린다.", "목표 — 해안포·미사일 진지를 함포로 부수고 상륙정 2척 이상을 해안에 올려라.", "팁 — Q로 함포를 고르고 육지 목표를 더블클릭해 조준한 뒤 Space."], epi: "섬에 태극기가 다시 올랐다." },
];
const K_LAST = KCAMP.filter((c) => !c.bonus).length;
let kProg = 0, kStars = [], kFail = []; try { const k = JSON.parse(careerStorage.getItem("steeltide:kcamp") || "null"); if (k) { kProg = k.p || 0; kStars = k.s || []; kFail = k.f || []; } } catch {}
try { const k = JSON.parse(careerStorage.getItem("steeltide:kcamp") || "null"); if (k && !k.v) { kStars[6] = kStars[5]; kFail[6] = kFail[5]; kStars[5] = 0; kFail[5] = false; } } catch {}
const saveK = () => { try { careerStorage.setItem("steeltide:kcamp", JSON.stringify({ v: 2, p: kProg, s: kStars, f: kFail })); } catch {} };
saveK();
const CAMPS = () => KCAMP;
const kWhy = (i) => { const c = KCAMP[i]; if (c.bonus ? kProg < K_LAST : i > kProg) return "이전 장을 마쳐야 열림"; if (myGrade() < c.rk) return `${ECON_RANKS[c.rk]} 진급 시 열림`; return ""; };
const kLocked = (i) => !!kWhy(i);
function kcampHTML() {
  return KCAMP.map((c, i) => { const lock = kLocked(i), st = kStars[i] || 0;
    return `<button class="mp" data-kcamp="${i}"${lock ? " disabled" : ""}><b>${c.n}${st ? ` <span class="stars">${"★".repeat(st)}${"☆".repeat(3 - st)}</span>` : kFail[i] ? ` <span class="kfail">실패</span>` : ""}</b><small>${lock ? `🔒 ${kWhy(i)}` : c.d}</small></button>`; }).join("")
    + `<div class="mpn">「경계의 파도」 ${Math.min(kProg, K_LAST)}/${K_LAST}장 · 가상 시나리오 — 계급이 오르면 다음 장이 열립니다 (실패해도 다음 장은 열리지만 더 어려워짐)</div>`;
}
// ── menu as steps: era → campaign or single operation → operation → (modern) forces → theater/conditions ──
let wz = "era", wzMode = "ops";
const WZ_BACK = { camp: "mode", ops: "mode", nat: "ops", map: () => (isModernOp(mission) ? "nat" : "ops") };
function showWz(s, quiet) { wz = s; for (const el of document.querySelectorAll("#opsP .wz")) el.classList.toggle("on", el.dataset.step === s); $("#opsP .wz-back").disabled = s === "mode"; wzCrumb(); if (!quiet) sfx.click(); }
function wzCrumb() {
  const era = "현대전", parts = [`<b>${era}</b>`];
  if (wz !== "era" && wz !== "mode") parts.push(wz === "camp" ? (era === "현대전" ? "한반도 시나리오" : "태평양 캠페인") : "단일 작전");
  if (wz === "nat" || wz === "map") parts.push(MISSIONS[mission]?.n || "");
  if ((wz === "map") && isModernOp(mission)) parts.push(`${NATIONS[natUs].n} vs ${NATIONS[natFoe].n}`);
  $("#opsP .wz-crumb").innerHTML = parts.join(" › ");
}
let briefI = null;
function openBrief(i) {
  const c = KCAMP[i]; briefI = i; $("#brief .brief-face").innerHTML = face(myFace(), 150);
  $("#brief .brief-k").textContent = `경계의 파도 · ${c.bonus ? "외전" : `${i + 1}장`} · ${MAPS[c.map]?.n || ""}${c.tod === "night" ? " · 야간" : ""}${i > 0 && !c.bonus && kFail[i - 1] ? " · 난이도 상승 (이전 단계 실패)" : ""}`;
  $("#brief .brief-t").textContent = c.n;
  $("#brief .brief-txt").innerHTML = c.brief.map((t) => `<p>${t}</p>`).join("") + `<p class="brief-star">별점 — ★ 승리 · ★ 기함 선체 60% 이상 · ★ 합동 지원 1회 이하${kStars[i] ? ` · 최고 기록 ${"★".repeat(kStars[i])}` : ""}</p>`;
  $("#brief").style.display = "grid"; sfx.click();
}
function kFinish(won) {
  const i = G.camp, c = KCAMP[i], P = G.player, hpK = P && P.alive ? P.hp / P.maxHp : 0, stars = won ? 1 + (hpK >= 0.6 ? 1 : 0) + (cicUsed() <= 1 ? 1 : 0) : 0;
  if (won) { kStars[i] = Math.max(kStars[i] || 0, stars); kFail[i] = false; } else kFail[i] = true;
  if (i === kProg && !c.bonus) kProg = Math.min(K_LAST, i + 1); saveK(); if (won && c.epi) G.storyEpi = c.epi;
  $("#endTitle").textContent += won ? ` · ${c.n} ${"★".repeat(stars)}${"☆".repeat(3 - stars)}` : ` · ${c.n} 실패${!c.bonus && i < K_LAST - 1 ? ` — 다음 장은 더 어려워진다` : ""}`;
}
let campSel = null;
let todSel = "day", wxSel = "clear"; try { todSel = careerStorage.getItem("steeltide:tod") === "night" ? "night" : "day"; wxSel = careerStorage.getItem("steeltide:wx") === "storm" ? "storm" : "clear"; } catch {}
let killcamOn = true; try { killcamOn = careerStorage.getItem("steeltide:killcam") !== "0"; } catch {}
let trailsOn = true; try { trailsOn = careerStorage.getItem("steeltide:trails") !== "0"; } catch {} setTrails(trailsOn); /* missile trail lines, settings checkbox */
let theater = "west"; try { const m = careerStorage.getItem("steeltide:map"); if (MAPS[m]) theater = m; } catch {}
// ── commander (사령관): name + one of four portraits, kept in this browser ──
const CMDR_FACES = [
  { n: "정통 소위", skin: ["#ebc3a3", "#c49270", "#8e5f44"], hair: "#26201c", brow: "#221c18", age: 0, must: null, glass: false, fem: false, jaw: 1.0, chin: 1.0, eye: 0.94, browStyle: "flat", nose: "straight", mouthW: 1.0, hairStyle: "neat", agePath: "dignified", bg: "#2b3640" },
  { n: "강골 소위", skin: ["#dfaa84", "#ae7856", "#754931"], hair: "#1e1a18", brow: "#1a1614", age: 0, must: null, glass: false, fem: false, jaw: 1.13, chin: 1.18, eye: 0.8, browStyle: "thick", nose: "broad", mouthW: 1.1, hairStyle: "short", agePath: "rugged", bg: "#2f3a33" },
  { n: "지략 소위", skin: ["#f0d2ba", "#c5997b", "#8a624a"], hair: "#2b2623", brow: "#282320", age: 0, must: null, glass: "thin", fem: false, jaw: 0.92, chin: 0.84, eye: 1.0, browStyle: "arched", nose: "slim", mouthW: 0.92, hairStyle: "parted", agePath: "scholar", bg: "#3a3430" },
  { n: "여성 소위", skin: ["#f3d6c0", "#ca9c81", "#926752"], hair: "#2a1e19", brow: "#2b1f1a", age: 0, must: null, glass: false, fem: true, jaw: 0.87, chin: 0.78, eye: 1.1, browStyle: "fem", nose: "delicate", mouthW: 0.9, hairStyle: "bob", agePath: "poised", bg: "#34303c" },
];
const US_CMDR_FACES = [
  { n: "정통 장교 (US)", skin: ["#f5d2be", "#cf9f82", "#9a6c52"], hair: "#6b4c35", brow: "#583d29", eyeCol: "#3c678a", age: 0, must: null, glass: false, fem: false, jaw: 1.03, chin: 1.05, eye: 0.98, browStyle: "flat", nose: "straight", mouthW: 1.02, hairStyle: "neat", agePath: "dignified", bg: "#263445" },
  { n: "강골 장교 (US)", skin: ["#946243", "#6d422a", "#422415"], hair: "#1a1614", brow: "#181412", eyeCol: "#2b1a12", age: 0, must: null, glass: false, fem: false, jaw: 1.14, chin: 1.18, eye: 0.84, browStyle: "thick", nose: "broad", mouthW: 1.12, hairStyle: "short", agePath: "rugged", bg: "#2b3830" },
  { n: "지략 장교 (US)", skin: ["#f3d0bc", "#c9977b", "#8f6148"], hair: "#8f653b", brow: "#75512e", eyeCol: "#4b6e44", age: 0, must: null, glass: "thin", fem: false, jaw: 0.93, chin: 0.86, eye: 1.02, browStyle: "arched", nose: "slim", mouthW: 0.94, hairStyle: "parted", agePath: "scholar", bg: "#38322c" },
  { n: "여성 장교 (US)", skin: ["#f6d7c4", "#cfa084", "#986b54"], hair: "#7e502f", brow: "#664026", eyeCol: "#3b6e78", age: 0, must: null, glass: false, fem: true, jaw: 0.87, chin: 0.78, eye: 1.12, browStyle: "fem", nose: "delicate", mouthW: 0.92, hairStyle: "bob", agePath: "poised", bg: "#332e3c" },
];
const facePool = (us = isUS()) => (us ? US_CMDR_FACES : CMDR_FACES);
let faceN = 0;
const mixHex = (a, b, t) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("");
/** The commander's face aged to the rank: 4 distinct young ensigns aging along unique paths (dignified / rugged / scholar / poised). */
function agedFace(i, grade, us = isUS()) {
  const pool = facePool(us);
  const f = { ...((typeof i === "object" ? i : pool[i]) || pool[0]) }, g = clamp(grade | 0, 0, 10);
  const baseHair = f.hair || (f.fem ? "#2a1e19" : "#26201c"), baseBrow = f.brow || "#221c18";
  const path = f.agePath || (f.fem ? "poised" : "dignified");
  f.age = g <= 2 ? 0 : g <= 4 ? 1 : g <= 7 ? 2 : 3;
  f.templeGrey = g >= 3 ? Math.min(1, (g - 2) / 5) : 0;
  if (path === "dignified") {
    const gr = Math.max(0, Math.min(1, (g - 3) / 6.5)) ** 1.05;
    f.hair = mixHex(baseHair, "#e4e3dc", gr); f.brow = mixHex(baseBrow, "#cfcec6", gr * 0.82);
    f.must = g >= 8 ? "full" : g >= 5 ? "trim" : null;
    f.jaw = f.jaw + (g >= 6 ? 0.04 : 0);
  } else if (path === "rugged") {
    const gr = Math.max(0, Math.min(1, (g - 4) / 6.5)) ** 1.25;
    f.hair = mixHex(baseHair, "#96928b", gr); f.brow = mixHex(baseBrow, "#76726c", gr * 0.65);
    f.must = g >= 4 ? "trim" : null; f.beard = g >= 7; f.furrow = g >= 4;
    f.skin = f.skin.map((s) => mixHex(s, "#b47b56", g >= 5 ? 0.14 : g >= 3 ? 0.06 : 0));
  } else if (path === "scholar") {
    const gr = Math.max(0, Math.min(1, (g - 3) / 7)) ** 1.1;
    f.hair = mixHex(baseHair, "#c2c0ba", gr * 0.85); f.brow = mixHex(baseBrow, "#9b9892", gr * 0.7);
    f.glass = g >= 6 ? "bold" : "thin"; f.recede = g >= 5;
    f.skin = f.skin.map((s) => mixHex(s, "#e7ccb5", g >= 6 ? 0.08 : 0));
  } else {
    const gr = Math.max(0, Math.min(1, (g - 4) / 6.5)) ** 1.2;
    f.hair = mixHex(baseHair, "#9d9791", gr * 0.72); f.brow = mixHex(baseBrow, "#68615b", gr * 0.55);
    f.glass = g >= 7 ? "slim" : false;
  }
  if (g <= 2) f.skin = f.skin.map((s) => mixHex(s, "#f6dcc6", 0.08));
  f.svc = f.svc || (staff.branch ? serviceOf(staff.branch) : staff.service || "navy");
  return f;
}
const myFace = () => agedFace(cmdr.face, myGrade());
const SVC_UNI = {
  army: { u0: "#344730", u1: "#1a2617", sh: "#dcd7c2", tie: "#1b2b18", cap0: "#42573c", cap1: "#293825", band: "#1a2218", strap: "#c9a23a", sleeve: "#c9a23a" },
  navy: { u0: "#1c2638", u1: "#0b0f18", sh: "#f1f1ee", tie: "#111111", cap0: "#ffffff", cap1: "#c9ccc8", band: "#121417", strap: "#c9a23a", sleeve: "#c9a23a" },
  air:  { u0: "#1d355a", u1: "#0d1b32", sh: "#dce9f7", tie: "#0f203d", cap0: "#2b4d80", cap1: "#193052", band: "#0f1a2c", strap: "#cfd8e3", sleeve: "#cfd8e3" },
};
const US_SVC_UNI = {
  army: { u0: "#4b4a34", u1: "#28281a", sh: "#e2d6b6", tie: "#332e22", cap0: "#54523b", cap1: "#353425", band: "#2b251c", strap: "#d6ad42", sleeve: "#d6ad42" }, /* AGSU */
  navy: { u0: "#121c2e", u1: "#080d17", sh: "#f4f5f7", tie: "#0d0f14", cap0: "#ffffff", cap1: "#cfd3d8", band: "#0e131c", strap: "#d6ad42", sleeve: "#d6ad42" },
  air:  { u0: "#193058", u1: "#0c1830", sh: "#dce9f7", tie: "#0f203d", cap0: "#234375", cap1: "#142748", band: "#0e1a30", strap: "#d4dce6", sleeve: "#d4dce6" },
};
function face(i, s = 64) {
  const pool = facePool(), f = (typeof i === "object" ? i : pool[i]) || pool[0], u = `fc${typeof i === "object" ? "s" : i}_${faceN++}`, [sk, sh, dk] = f.skin, j = f.jaw || 1, ch = f.chin || 1;
  const jx = 50 - 16.5 * j, jx2 = 50 + 16.5 * j, cx1 = 50 - 8.5 * ch, cx2 = 50 + 8.5 * ch;
  const hi = mixHex(sk, "#fff6ee", 0.36), mw = f.mouthW || 1, ey = 41, my = ey + 18, uMap = isUS() ? US_SVC_UNI : SVC_UNI, U = uMap[f.svc] || uMap.navy;
  let o = `<svg role="img" aria-label="${f.n} 초상" width="${s}" height="${s}"${f.bare ? ' overflow="visible"' : ""} viewBox="${f.zoom ? "16 8 68 68" : "0 0 100 100"}"><defs>`
    + `<radialGradient id="${u}b" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${f.bg}"/><stop offset="1" stop-color="#0d1114"/></radialGradient>`
    + `<radialGradient id="${u}s" cx=".4" cy=".34" r=".72"><stop offset="0" stop-color="${hi}"/><stop offset=".28" stop-color="${sk}"/><stop offset=".76" stop-color="${sh}"/><stop offset="1" stop-color="${dk}"/></radialGradient>`
    + `<linearGradient id="${u}u" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${f.civ ? "#1c2638" : U.u0}"/><stop offset="1" stop-color="${f.civ ? "#0b0f18" : U.u1}"/></linearGradient>`
    + `<linearGradient id="${u}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${U.cap0}"/><stop offset="1" stop-color="${U.cap1}"/></linearGradient>`
    + `</defs>${f.bare ? "" : `<rect width="100" height="100" rx="6" fill="url(#${u}b)"/>`}`;
  // shoulders: service dress uniform (Army olive / Navy dark blue / Air Force royal blue)
  if (!f.bare) o += `<path d="M6 100 C8 82 20 75 34 72 L50 80 L66 72 C80 75 92 82 94 100Z" fill="url(#${u}u)"/>`
    + `<path d="M40 70 L50 86 L60 70 L56 68 L50 76 L44 68Z" fill="${f.civ ? "#f1f1ee" : U.sh}"/><path d="M48 76 L50 74 L52 76 L51.5 92 L50 95 L48.5 92Z" fill="${f.civ ? "#111" : U.tie}"/>`
    + `<path d="M34 72 L46 90 L44 100 M66 72 L54 90 L56 100" stroke="#05080d" stroke-width="1.2" fill="none"/>`
    + (f.civ ? "" : `<g transform="translate(60 84)"><rect width="5" height="2.6" fill="#b03a2e"/><rect x="5" width="5" height="2.6" fill="#2a5aa0"/><rect x="10" width="5" height="2.6" fill="#d8b23a"/><rect y="2.8" width="5" height="2.6" fill="#3b7a3e"/><rect x="5" y="2.8" width="5" height="2.6" fill="#c9c9c9"/><rect x="10" y="2.8" width="5" height="2.6" fill="#8a1f1f"/></g>`
    + (isUS()
      ? `<g transform="translate(13 80) rotate(-8)"><rect width="11" height="6.5" rx=".6" fill="#b22234" stroke="#d8b247" stroke-width=".4"/><rect y="1.1" width="11" height=".9" fill="#fff"/><rect y="2.8" width="11" height=".9" fill="#fff"/><rect y="4.5" width="11" height=".9" fill="#fff"/><rect width="4.6" height="3.6" fill="#233b6e"/></g>`
      : `<g transform="translate(13 80) rotate(-8)">${FLAGSVG.kr(11)}</g>`)
    + `<rect x="10" y="89" width="18" height="2" fill="${U.sleeve}"/><rect x="10" y="92.2" width="18" height="2" fill="${U.sleeve}"/>`);
  // back hair (female smooth bob silhouette)
  if (f.fem) o += `<path d="M31 24 C25 35 25 54 31.5 66 Q41 70 50 69 Q59 70 68.5 66 C75 54 75 35 69 24 C64 13.5 36 13.5 31 24Z" fill="${f.hair}"/>`
    + `<path d="M33 48 C34 58 39 66 50 67 C61 66 66 58 67 48 L67 65 Q58 69 50 68 Q42 69 33 65Z" fill="${mixHex(f.hair, "#000000", 0.28)}" opacity=".55"/>`;
  // neck + ears + head contour
  const nk = f.fem ? 7.2 : 8.8;
  o += `<path d="M${50 - nk} 58 L${50 - nk} 72 Q50 78 ${50 + nk} 72 L${50 + nk} 58Z" fill="${sh}"/><path d="M${50 - nk} 64 Q50 71 ${50 + nk} 64 L${50 + nk} 69 Q50 75 ${50 - nk} 69Z" fill="${dk}" opacity=".42"/>`
    + `<ellipse cx="${jx - 0.8}" cy="45.5" rx="3.2" ry="5.6" fill="${sh}"/><ellipse cx="${jx2 + 0.8}" cy="45.5" rx="3.2" ry="5.6" fill="${sh}"/>`
    + `<path d="M${jx} 34 C${jx} 23.5 39.5 18.5 50 18.5 C60.5 18.5 ${jx2} 23.5 ${jx2} 34 L${jx2} 46 C${jx2} 55.5 ${cx2} 63.5 50 66 C${cx1} 63.5 ${jx} 55.5 ${jx} 46Z" fill="url(#${u}s)"/>`;
  // cheekbone & chin light modeling for realistic depth
  o += `<ellipse cx="40.5" cy="49.5" rx="4.2" ry="2.2" fill="${hi}" opacity=".22"/><ellipse cx="59.5" cy="49.5" rx="4.2" ry="2.2" fill="${hi}" opacity=".18"/>`
    + `<ellipse cx="50" cy="62.5" rx="4" ry="1.8" fill="${hi}" opacity=".18"/>`
    + `<path d="M${jx + 2} 50 Q${cx1} 61.5 50 64.8 Q${cx2} 61.5 ${jx2 - 2} 50" stroke="${dk}" stroke-width="1.4" opacity=".22" fill="none"/>`;
  // side hair / temples (male sideburns; female hair frames softly in the top-hair pass)
  const sw = f.hairStyle === "short" ? 2.0 : f.hairStyle === "parted" ? 3.2 : 2.8, tCol = f.templeGrey ? mixHex(f.hair, "#e0dfd8", f.templeGrey * 0.65) : f.hair;
  if (!f.fem) {
    o += `<path d="M${jx} 29.5 L${jx + sw} 29.5 L${jx + sw - 0.4} 44.5 L${jx} 40.5Z M${jx2} 29.5 L${jx2 - sw} 29.5 L${jx2 - sw + 0.4} 44.5 L${jx2} 40.5Z" fill="${f.hair}"/>`;
    if (f.templeGrey > 0.15) o += `<path d="M${jx + 0.2} 36 L${jx + sw - 0.5} 36 L${jx + sw - 0.8} 43.5 L${jx} 40.5Z M${jx2 - 0.2} 36 L${jx2 - sw + 0.5} 36 L${jx2 - sw + 0.8} 43.5 L${jx2} 40.5Z" fill="${tCol}" opacity=".85"/>`;
  } else {
    o += `<path d="M${jx - 1} 28 Q${jx + 1.5} 36 ${jx + 0.2} 44 Q${jx - 2.2} 38 ${jx - 1} 28Z M${jx2 + 1} 28 Q${jx2 - 1.5} 36 ${jx2 - 0.2} 44 Q${jx2 + 2.2} 38 ${jx2 + 1} 28Z" fill="${f.hair}"/>`;
  }
  // brow ridge shadow, eyes with iris catchlight & eyelid crease
  o += `<path d="M37.5 ${ey - 3.2} Q42.5 ${ey - 5.4} 47.2 ${ey - 3} M52.8 ${ey - 3} Q57.5 ${ey - 5.4} 62.5 ${ey - 3.2}" stroke="${dk}" stroke-width="2.2" opacity=".28" fill="none"/>`;
  const eyeScale = f.eye || 1;
  for (const x of [42.5, 57.5]) {
    o += `<g transform="translate(${x} ${ey}) scale(1 ${eyeScale}) translate(${-x} ${-ey})">`
      + `<path d="M${x - 4.3} ${ey} Q${x} ${ey - 2.7} ${x + 4.3} ${ey} Q${x} ${ey + 1.9} ${x - 4.3} ${ey}Z" fill="#f1ece4"/>`
      + `<circle cx="${x}" cy="${ey - 0.15}" r="1.95" fill="${f.eyeCol || "#3a281d"}"/><circle cx="${x}" cy="${ey - 0.15}" r="1.0" fill="#100b08"/>`
      + `<circle cx="${x - 0.65}" cy="${ey - 0.75}" r="0.52" fill="#ffffff" opacity=".88"/>`
      + `<path d="M${x - 4.6} ${ey - 0.1} Q${x} ${ey - 3.3} ${x + 4.6} ${ey - 0.1}" stroke="#1d140f" stroke-width="${f.fem ? 1.35 : 1.15}" fill="none" stroke-linecap="round"/>`
      + `<path d="M${x - 3.8} ${ey - 2.4} Q${x} ${ey - 4.2} ${x + 3.8} ${ey - 2.4}" stroke="${dk}" stroke-width=".6" opacity=".48" fill="none"/>`
      + `<path d="M${x - 3.4} ${ey + 2.3} Q${x} ${ey + 3.4} ${x + 3.4} ${ey + 2.3}" stroke="${dk}" stroke-width=".65" opacity=".45" fill="none"/></g>`;
  }
  // distinct eyebrow styles
  const bs = f.browStyle || (f.fem ? "fem" : "flat");
  if (bs === "thick") o += `<path d="M36 ${ey - 4.6} L47.8 ${ey - 3.5} L47.5 ${ey - 1.7} L36.4 ${ey - 2.4}Z M52.2 ${ey - 3.5} L64 ${ey - 4.6} L63.6 ${ey - 2.4} L52.5 ${ey - 1.7}Z" fill="${f.brow}"/>`;
  else if (bs === "arched") o += `<path d="M36.8 ${ey - 4.2} Q42 ${ey - 6.2} 47.4 ${ey - 4.5} L47.2 ${ey - 3.4} Q42 ${ey - 4.8} 37 ${ey - 3.2}Z M52.6 ${ey - 4.5} Q58 ${ey - 6.2} 63.2 ${ey - 4.2} L63 ${ey - 3.2} Q58 ${ey - 4.8} 52.8 ${ey - 3.4}Z" fill="${f.brow}"/>`;
  else if (bs === "fem") o += `<path d="M37 ${ey - 4.4} Q42.5 ${ey - 6.4} 47.4 ${ey - 4.7} Q42.5 ${ey - 5.2} 37.2 ${ey - 3.6}Z M52.6 ${ey - 4.7} Q57.5 ${ey - 6.4} 63 ${ey - 4.4} Q57.5 ${ey - 5.2} 52.8 ${ey - 3.6}Z" fill="${f.brow}"/>`;
  else o += `<path d="M36.5 ${ey - 4.9} L47.6 ${ey - 4.3} L47.5 ${ey - 3.0} L36.9 ${ey - 3.3}Z M52.4 ${ey - 4.3} L63.5 ${ey - 4.9} L63.1 ${ey - 3.3} L52.5 ${ey - 3.0}Z" fill="${f.brow}"/>`;
  // distinct nose styles
  const ns = f.nose || (f.fem ? "delicate" : "straight"), nw = ns === "broad" ? 4.4 : ns === "slim" ? 2.7 : ns === "delicate" ? 2.4 : 3.4;
  o += `<path d="M50 ${ey + 0.5} L${50 - nw * 0.45} ${ey + 10.6} Q50 ${ey + 12.6} ${50 + nw * 0.72} ${ey + 11.1}" stroke="${dk}" stroke-width="${ns === "delicate" ? 0.85 : 1.05}" fill="none" opacity=".68"/>`
    + `<path d="M${50 - nw} ${ey + 11.7} Q${50 - nw * 0.45} ${ey + 13.1} ${50 - 0.5} ${ey + 12.2} M${50 + 0.5} ${ey + 12.2} Q${50 + nw * 0.45} ${ey + 13.1} ${50 + nw} ${ey + 11.7}" stroke="${dk}" stroke-width=".85" fill="none" opacity=".72"/>`
    + `<path d="M50.8 ${ey + 1.5} L51.4 ${ey + 9.8}" stroke="${hi}" stroke-width="${ns === "broad" ? 1.5 : 1.1}" opacity=".55" stroke-linecap="round"/>`;
  // age lines: realistic gradual progression (1: subtle, 2: mid-career, 3: veteran)
  if (f.age >= 1) o += `<path d="M44.6 ${ey + 11.5} Q42.5 ${ey + 14.8} 43.2 ${ey + 17.6} M55.4 ${ey + 11.5} Q57.5 ${ey + 14.8} 56.8 ${ey + 17.6}" stroke="${dk}" stroke-width=".65" fill="none" opacity=".36"/>`;
  if (f.furrow) o += `<path d="M48.8 ${ey - 4.6} L48.8 ${ey - 1.8} M51.2 ${ey - 4.6} L51.2 ${ey - 1.8}" stroke="${dk}" stroke-width=".8" opacity=".55"/>`;
  if (f.age >= 2) o += `<path d="M44 ${ey + 10.5} Q41.2 ${ey + 15} 42 ${ey + 19.2} M56 ${ey + 10.5} Q58.8 ${ey + 15} 58 ${ey + 19.2}" stroke="${dk}" stroke-width=".9" fill="none" opacity=".65"/><path d="M41.5 28.5 Q50 27.2 58.5 28.5 M42.5 31.2 Q50 30.2 57.5 31.2" stroke="${dk}" stroke-width=".65" fill="none" opacity=".42"/>`;
  if (f.age >= 3) o += `<path d="M35.5 ${ey + 0.8} L33.2 ${ey + 2.4} M35.5 ${ey + 2.2} L33.8 ${ey + 3.5} M64.5 ${ey + 0.8} L66.8 ${ey + 2.4} M64.5 ${ey + 2.2} L66.2 ${ey + 3.5} M39.8 ${ey + 4.8} Q42.5 ${ey + 6.4} 45.2 ${ey + 4.8} M54.8 ${ey + 4.8} Q57.5 ${ey + 6.4} 60.2 ${ey + 4.8}" stroke="${dk}" stroke-width=".72" fill="none" opacity=".68"/>`;
  // mouth & lips
  const mx1 = 50 - 5.4 * mw, mx2 = 50 + 5.4 * mw;
  o += `<path d="M${mx1} ${my} Q50 ${my + (f.fem ? 0.9 : 0.4)} ${mx2} ${my}" stroke="${f.fem ? "#7a3934" : "#5a3226"}" stroke-width="1.35" fill="none" stroke-linecap="round"/>`
    + `<path d="M${50 - 3.6 * mw} ${my + 2.1} Q50 ${my + 3.5} ${50 + 3.6 * mw} ${my + 2.1}" stroke="${dk}" stroke-width=".95" opacity=".52" fill="none"/>`;
  if (f.fem) o += `<path d="M${mx1 + 0.4} ${my} Q50 ${my - 1.5} ${mx2 - 0.4} ${my} Q50 ${my + 2.3} ${mx1 + 0.4} ${my}Z" fill="${f.age >= 2 ? "#9a4541" : "#b35852"}" opacity=".72"/>`;
  if (f.must === "full") o += `<path d="M42 ${my - 1.8} Q46 ${my - 5.2} 50 ${my - 3.4} Q54 ${my - 5.2} 58 ${my - 1.8} Q54 ${my - 0.3} 50 ${my - 1.5} Q46 ${my - 0.3} 42 ${my - 1.8}Z" fill="${f.hair}"/>`;
  if (f.must === "trim") o += `<path d="M44.5 ${my - 2.1} Q50 ${my - 4.1} 55.5 ${my - 2.1} L55 ${my - 1} Q50 ${my - 2.3} 45 ${my - 1}Z" fill="${f.hair}"/><path d="M${jx + 3} 50 Q50 ${my + 9} ${jx2 - 3} 50" stroke="${f.hair}" stroke-width="1.2" opacity=".24" fill="none"/>`;
  if (f.beard) o += `<path d="M${jx + 1.5} 47 C${jx + 2} 60 43 68.5 50 68.5 C57 68.5 ${jx2 - 2} 60 ${jx2 - 1.5} 47 L${jx2 - 4} 50 C${jx2 - 6} 59 56 ${my + 4} 50 ${my + 4} C44 ${my + 4} ${jx + 6} 59 ${jx + 4} 50Z" fill="${f.hair}" opacity=".9"/>`;
  // distinct glasses styles: thin (silver modern), bold (dark executive), slim (half-rim)
  if (f.glass) {
    const gc = f.glass === "thin" ? "#7e8a94" : f.glass === "slim" ? "#5b5552" : "#1d1d1b", gw = f.glass === "bold" ? 1.35 : 0.95, gh = f.glass === "slim" ? 5.8 : 7.0;
    o += `<rect x="37" y="${ey - 3.4}" width="11" height="${gh}" rx="2.2" fill="#ffffff" fill-opacity=".07" stroke="${gc}" stroke-width="${gw}"/><rect x="52" y="${ey - 3.4}" width="11" height="${gh}" rx="2.2" fill="#ffffff" fill-opacity=".07" stroke="${gc}" stroke-width="${gw}"/><path d="M48 ${ey - 1} L52 ${ey - 1} M37 ${ey - 1} L${jx} ${ey - 2} M63 ${ey - 1} L${jx2} ${ey - 2}" stroke="${gc}" stroke-width="${gw * 0.9}"/>`;
  }
  // civilian hair vs combination cap
  if (f.civ) {
    if (f.fem) {
      o += `<path d="M29 36 C28 19 37 12.5 50 12.5 C63 12.5 72 19 71 36 C69 30 65 24 58 22.5 C52 21.5 44 21 38 25 C34 27.5 31 31.5 29 36Z" fill="${f.hair}"/>`
        + `<path d="M40 15.5 Q49 18.5 61 19.5" stroke="${mixHex(f.hair, "#ffffff", 0.35)}" stroke-width="1.2" opacity=".45" fill="none"/>`
        + (f.templeGrey > 0.15 ? `<path d="M32 28 Q35 23 41 21.5 M68 28 Q65 23 59 21.5" stroke="${tCol}" stroke-width="1.4" opacity=".6" fill="none" stroke-linecap="round"/>` : "");
    } else {
      const rc = f.recede ? 2.4 : 0;
      o += `<path d="M${jx - 1.5} 36 C${jx - 3} 17 38 11.5 50 11.5 C63 11.5 ${jx2 + 3} 17 ${jx2 + 1.5} 36 L${jx2 - 1} 31 C${jx2 - 3} ${22.5 + rc} 60 ${20.2 + rc} 50 ${21.4 + rc * 0.5} C44 ${21 + rc * 0.5} ${jx + 6} ${22 + rc} ${jx + 1} 31Z" fill="${f.hair}"/><path d="M42 14.5 Q47 19 60 19.5" stroke="#00000033" stroke-width="1" fill="none"/>`;
    }
  } else {
    const capEmblem = isUS()
      ? (f.svc === "air"
        ? `<g transform="translate(50 22) scale(.82)"><path d="M0 -6 L2.2 -3 L10 -5.5 L7.5 -1 L9 1.5 L3 2 L1.5 5.5 L0 4.2 L-1.5 5.5 L-3 2 L-9 1.5 L-7.5 -1 L-10 -5.5 L-2.2 -3Z" fill="#dce4ee" stroke="#7d8a99" stroke-width=".6"/><path d="M-2 -2 L2 -2 L1.5 2.2 L0 3.2 L-1.5 2.2Z" fill="#b8c4d1"/></g>` /* USAF silver eagle */
        : f.svc === "navy"
        ? `<g transform="translate(50 22) scale(.82)"><path d="M-5 -5 L5 5 M5 -5 L-5 5" stroke="#d8b247" stroke-width="1.3" stroke-linecap="round"/><path d="M0 -6.2 L2 -3.4 L8.8 -5 L6.5 -1.2 L2.5 0 L0 1.2 L-2.5 0 L-6.5 -1.2 L-8.8 -5 L-2 -3.4Z" fill="#e4e8ec" stroke="#7d858e" stroke-width=".5"/><path d="M-2.2 -1.6 L2.2 -1.6 L1.8 2.6 L0 3.8 L-1.8 2.6Z" fill="#c8313e" stroke="#e4e8ec" stroke-width=".4"/><rect x="-2.2" y="-1.6" width="4.4" height="1.5" fill="#1d3d78"/></g>` /* USN crossed anchors + eagle & shield */
        : `<g transform="translate(50 22) scale(.84)"><path d="M0 -6.2 L2.2 -3.2 L9.5 -5.2 L7.2 -1 L8.5 1.5 L2.8 2 L1.4 5.5 L0 4.2 L-1.4 5.5 L-2.8 2 L-8.5 1.5 L-7.2 -1 L-9.5 -5.2 L-2.2 -3.2Z" fill="#e2be52" stroke="#8c6c18" stroke-width=".6"/><path d="M-2 -1.8 L2 -1.8 L1.6 2.2 L0 3.2 L-1.6 2.2Z" fill="#f3dc8c" stroke="#8c6c18" stroke-width=".4"/></g>`) /* US Army Great Seal gold eagle */
      : f.svc === "army"
      ? `<g transform="translate(50 22) scale(.85)"><circle r="6" fill="none" stroke="#d6b04a" stroke-width="1.2"/><path d="M0 -5 L1.5 -1.4 L5.2 -1.4 L2.2 0.8 L3.3 4.4 L0 2.2 L-3.3 4.4 L-2.2 0.8 L-5.2 -1.4 L-1.5 -1.4Z" fill="#e6c35a"/></g>` /* 육군 모표: 금성·월계 */
      : f.svc === "air"
      ? `<g transform="translate(50 22) scale(.85)"><path d="M-10 0 Q-5 -4 0 -1 Q5 -4 10 0 Q5 3 0 1 Q-5 3 -10 0Z" fill="#dce4ee" stroke="#9aa8b8" stroke-width=".6"/><circle r="2.2" fill="#d6b04a"/></g>` /* 공군 모표: 날개·태극 */
      : `<g transform="translate(50 22.5) scale(.82)"><path d="M-7.5 -1 Q-8 6 0 7.5 Q8 6 7.5 -1" stroke="#d6b04a" stroke-width="1.1" fill="none"/>${[-1, 1].map((s) => [0, 1, 2, 3].map((i) => `<ellipse cx="${s * (7.6 - i * 0.3)}" cy="${-1 + i * 2.3}" rx=".9" ry="1.7" transform="rotate(${s * (-20 + i * 18)} ${s * (7.6 - i * 0.3)} ${-1 + i * 2.3})" fill="#d6b04a"/>`).join("")).join("")}<path d="M0 -7 L0 5.5 M-3.2 -4.6 L3.2 -4.6 M-4.6 1.8 Q-4 5.6 0 5.8 Q4 5.6 4.6 1.8" stroke="#d6b04a" stroke-width="1.3" fill="none" stroke-linecap="round"/><circle cy="-7.6" r="1.3" fill="none" stroke="#d6b04a" stroke-width=".9"/><circle cy="-1.2" r="2.3" fill="#c8313e"/><path d="M-2.3 -1.2 A2.3 2.3 0 0 0 2.3 -1.2 A1.15 1.15 0 0 1 0 -1.2 A1.15 1.15 0 0 0 -2.3 -1.2Z" fill="#1f4aa0"/></g>`; /* 해군 모표: 닻 + 태극 + 월계 잎 */
    o += `<path d="M24 25 C26 11 74 11 76 25 L74 28 L26 28Z" fill="url(#${u}c)"/><rect x="${jx - 1}" y="26" width="${(jx2 - jx) + 2}" height="6" fill="${U.band}"/>`
      + `<path d="M${jx - 1} 32 L${jx2 + 1} 32 L${jx2 - 3} 37 Q50 39 ${jx + 3} 37Z" fill="#07090b"/><path d="M${jx + 1} 35.5 Q50 37.8 ${jx2 - 1} 35.5" stroke="${U.strap}" stroke-width="1.3" fill="none"/>`
      + `<path d="M${jx - 1} 31.5 L${jx2 + 1} 31.5" stroke="${U.strap}" stroke-width="1.1"/>${capEmblem}`;
  }
  return o + `</svg>`;
}
let goalMk = null; /* destination beacon (see goalBeacon) */
let cmdr = { name: "", face: 0 }; try { const c = JSON.parse(careerStorage.getItem("steeltide:cmdr") || "null"); if (c && c.name) cmdr = { name: String(c.name).slice(0, 12), face: clamp(c.face | 0, 0, 3) }; } catch {}
const cmdrSet = !!cmdr.name; if (!cmdr.name) cmdr.name = "무명";
let cmdrDraft = cmdr.face;
function renderCmdr() {
  $("#cmdrFaces").innerHTML = facePool().map((f, i) => `<button class="fc${i === cmdrDraft ? " on" : ""}" data-face="${i}">${face(agedFace(i, 0), 84)}<small>${f.n}</small></button>`).join("");
}
function openCmdr() { cmdrDraft = cmdr.face; $("#cmdrInput").value = cmdrSet || cmdr.name !== "무명" ? cmdr.name : ""; renderCmdr(); $("#cmdrErr").textContent = ""; $("#cmdrM").style.display = "grid"; setTimeout(() => $("#cmdrInput").focus(), 30); }
function saveCmdr() {
  const n = $("#cmdrInput").value.trim(); if (!n) { $("#cmdrErr").textContent = "이름을 입력하세요"; return; } if (n.length > 12) { $("#cmdrErr").textContent = "12자 이내로 입력하세요"; return; }
  cmdr = { name: n, face: cmdrDraft }; try { careerStorage.setItem("steeltide:cmdr", JSON.stringify(cmdr)); } catch {}
  $("#cmdrM").style.display = "none"; sfx.click(); refreshMenus();
}
// content trimmed for now (code for the others stays): fleet battle, missile battle, convoy escort
const ACTIVE = ["modern", "modern:convoy"]; /* 2차대전 removed (branch ww2-archive) */
let mission = "modern"; try { const m = careerStorage.getItem("steeltide:mission"); if (MISSIONS[m] && ACTIVE.includes(m)) mission = m; } catch {}

// ── battle setup ────────────────────────────────────────────────────────────
let endT = 0, show = null, showId = null, showSvc = null, showAir = null, ap = mkBrain(9);
const STATIONS = [[0, 0], [650, 520], [650, -520], [1300, 0], [1300, 1040], [1300, -1040], [1950, 520], [1950, -520]];
/** WWII enemy ships get refits one level below the player's ship (refits used to make only our side stronger; full parity was too hard because our AI allies have none). */
const placeAt = (lx, lz, h, back, side) => [lx - Math.cos(h) * back + Math.sin(h) * side, lz - Math.sin(h) * back - Math.cos(h) * side];
function disposeAll() {
  for (const s of G.ships) s.dispose(); G.ships = []; G.player = G.enemy = G.carrier = G.foeCarrier = null; G.enemies = []; G.allies = []; G.convoy = []; G.events = []; G.cts.clear();
  if (showAir) { scene.remove(showAir); showAir = null; }
  clearMissiles(); opsClear(); jetSound(0); droneSound(0); G.modern = false; if (typeof md !== "undefined") { md.q.length = 0; md.aimPt = null; md.supPt = null; md.jamCd = 0; md.flyFP = false; } clearTorps(); show = null; showId = null; showSvc = null; clearShells(); clearAir(); clearFx(); for (const k of markers) { k.t = 0; k.m.visible = false; } lock = null;
}
let showNat = null;
const SVC_BG_IMG = {
  kr: {
    army: "linear-gradient(155deg, rgba(14,24,16,.52), rgba(8,14,10,.74)), url(img/bg/kr_bg_army.jpg)",
    air: "linear-gradient(155deg, rgba(12,20,30,.48), rgba(8,14,22,.72)), url(img/bg/kr_bg_air.jpg)",
  },
  us: {
    army: "linear-gradient(155deg, rgba(18,22,16,.52), rgba(10,14,10,.74)), url(img/bg/us_bg_army.jpg)",
    navy: "linear-gradient(155deg, rgba(10,18,28,.48), rgba(6,12,20,.72)), url(img/bg/us_bg_navy.jpg)",
    air: "linear-gradient(155deg, rgba(10,18,28,.48), rgba(6,12,20,.72)), url(img/bg/us_bg_air.jpg)",
  },
};
function showcase(id) {
  const sv = svcDraft || (staff.branch ? serviceOf(staff.branch) : staff.service || "navy"), nat = isUS() ? "us" : "kr", bgEl = $("#svcBg");
  const bgCss = SVC_BG_IMG[nat]?.[sv] || null;
  if (showSvc === sv && showNat === nat && (bgCss || (showId === id && show))) {
    if (bgEl) { bgEl.classList.toggle("on", !!bgCss); if (bgCss) bgEl.style.backgroundImage = bgCss; }
    return;
  }
  disposeAll(); showSvc = sv; showNat = nat;
  if (bgEl) {
    bgEl.classList.toggle("on", !!bgCss);
    if (bgCss) bgEl.style.backgroundImage = bgCss;
  }
  if (bgCss) return;
  show = new Ship(MODERN[id], 0, 0, 0, "us", perkMods().upg); show.tele = 3; show.speed = show.vmax * 0.5; G.ships = [show]; G.player = show; showId = id;
}
const uniq = (list) => { for (const s of list) { const same = list.filter((o) => o.spec === s.spec); if (same.length > 1) s.name = `${s.spec.short} ${same.indexOf(s) + 1}`; } };
/** An enemy squadron: first ship leads (brain), the rest keep station on it; optional carrier astern. */
/** Second front: an allied AI task unit and an enemy AI unit that go for each other (they still shoot anything in reach). */
function newBattle() {
  $("#svcBg")?.classList.remove("on"); disposeAll(); logs.length = 0; renderLog(); const mapId = theater; makeIslands(mapId);
  const CS = campSel != null ? CAMPS()[campSel] : null; G.camp = campSel; G.campEra = "modern"; G.hard = !!(CS && campSel > 0 && !CS.bonus && kFail[campSel - 1]); G.tod = CS ? CS.tod || "day" : mission === "modern:emcon" ? "night" : todSel; G.wx = CS ? CS.wx || "clear" : wxSel; setWeather(G.tod, G.wx);
  G.visK = (G.tod === "night" ? 0.55 : 1) * (G.wx === "storm" ? 0.7 : 1); G.wxDisp = G.wx === "storm" ? 1.35 : 1; G.kc = null;
  const rk = myRank();
  G.storyEpi = null; G.dryT = null; G.lastHitT = 0; G.mission = mission; G.result = null; G.goal = null; G.waves = null; G.foeLaunched = false; G.events = []; G.foeSquad = 0; G.foePlaneCD = 0;
  const modern = true, OP = mission; G.modern = modern; G.mop = OP; G.staffK = modern ? withMin(staffMods(hqGrade(), hqBranch())) : null; G.perkK = perkMods(); /* promotion perks, both eras */ /* fleet HQ staff shape every modern battle, auto included */ if (modern) G.mission = "modern"; // economy and results count every modern operation as "modern" modern && (MSL.cam = null);
  const pSpec = MODERN[flagshipId()];
  G.mastFlag = null; const P = new Ship(pSpec, 0, 0, 0, "us", perkMods().upg); P.isPlayer = true; P.name = pSpec.short; P.nav = []; P.lv = 3; P.lastLv = 3; P.nation = natUs; mArm(P);
  const allies = [[-700, 900], ...(rk >= 3 ? [[-700, -900]] : [])].map((st, i) => { const [x, z] = placeAt(0, 0, 0, ...st); const s = new Ship(MODERN[ladderOf(pSpec.id).sis], x, z, 0, "us"); s.station = st; s.br = mkBrain(14 + i * 3); s.name = s.spec.short + (i ? " 2" : ""); s.nation = natUs; mArm(s); return s; }) // a second escort at higher rank, like the enemy's;
  uniq(allies);
  G.ships = [P, ...allies]; G.player = P; G.allies = allies; G.carrier = null;
  {
    let b = (25 + rnd() * 30) * DEG * (rnd() < 0.5 ? -1 : 1); const r = 16000 + rnd() * 2000;
    for (let k = 0; k < 16 && landAt(Math.cos(b) * r, Math.sin(b) * r, 4500); k++) b = wrap(b + 0.4); // open water for the enemy group
    const eh = wrap(PI + b + (rnd() - 0.5) * 0.8), N = NATIONS[natFoe];
    fixNations();
    const lt = KR_LADDER.indexOf(ladderOf(pSpec.id)), small = natFoe === "nk" && lt <= 1; /* 고속함·호위함에는 북한 유도탄정·호위함이 상대 */
    const keys0 = small ? (lt === 0 ? ["nkosa", "nkosa", ...(myGrade() >= 2 ? ["nkosa"] : [])] : ["najin", "nkosa", "nkosa"]) : natFoe === "cn" && rk < 4 ? [N.ships[1], N.ships[1]] : [N.ships[0], N.ships[1], ...(rk >= 3 ? [N.ships[1]] : [])]; // the enemy grows with your rank and ship
    const k1 = small ? keys0[1] : N.ships[1], keys = OP === "modern" ? keys0 : OP === "modern:emcon" ? [...keys0, k1, ...(G.hard ? [k1] : [])] : OP === "modern:convoy" ? [k1] : []; // other operations bring their own threats (ops.js)
    const out = keys.map((k, i) => { const [x, z] = placeAt(Math.cos(b) * r, Math.sin(b) * r, eh, ...STATIONS[i]); const s = new Ship(MODERN[k], x, z, eh, "foe"); s.prefRange = [5000, 8000]; s.station = STATIONS[i]; s.br = mkBrain(16 + i * 5); s.nation = natFoe; mArm(s); return s; });
    for (const s of out) s.group = out;
    const fcv = rk >= 4 && (OP === "modern" || OP === "modern:emcon") ? N.cv : null; if (fcv) { const [x, z] = placeAt(Math.cos(b) * r, Math.sin(b) * r, eh, 3500, 0); const c = new Ship(MODERN[fcv], x, z, eh, "foe"); c.isCarrier = true; c.br = mkBrain(30); c.nation = natFoe; c.group = out; mArm(c); out.push(c); }
    G.enemies.push(...out); G.ships.push(...out);
    const ucv = lt >= 2 ? NATIONS[natUs].cv : null; if (ucv) { /* 독도 항공 지원은 구축함부터 */ const st = [3200, -900], [x, z] = placeAt(0, 0, 0, ...st); const c = new Ship(MODERN[ucv], x, z, 0, "us"); c.station = st; c.br = mkBrain(30); c.name = c.spec.short; c.nation = natUs; mArm(c); G.allies.push(c); G.ships.push(c); }
    G.bases = []; for (const [side, nat, x, z] of [["us", natUs, -26000, 0], ["foe", natFoe, Math.cos(b) * (r + 22000), Math.sin(b) * (r + 22000)]]) if (NATIONS[nat].base && (side === "us" ? lt >= 2 : !small && ["modern", "modern:emcon", "modern:convoy"].includes(OP))) G.bases.push({ side, alive: true, isBase: true, pos: new THREE.Vector3(x, 0, z), heading: 0, spec: { fb: 0 }, cv: NATIONS[nat].base, name: "지상 비행장" });
    for (const s of G.ships) if (s.spec.jets) s.cv = s.spec.jets; for (const s of [...G.ships, ...G.bases]) if (s.cv) { s.jetsReady = Math.max(0, s.cv.n + (s.side === "us" ? (G.staffK ? G.staffK.jets : 0) + (G.perkK?.jets || 0) : 0)); s.rearm = []; }
    if (OP === "modern" && !CS) { /* missile battle: three enemy groups in turn, then reach the destination */
      let gx = Math.cos(b) * 24000, gz = Math.sin(b) * 24000, k = 0; while (landAt(gx, gz, 2000) && k++ < 40) { gx *= 0.95; gz *= 0.95; }
      G.goal = { x: gx, z: gz, label: "목적지" }; G.waves = { n: 1, max: 3, modern: true, keys0, nat: natFoe, rk, pending: false, told: false }; }
    opsInit(OP, { P, Ship, TRANSPORT, mkBrain, log, toast, hard: G.hard });
  }
  for (const s of G.ships) { let k = 0; const L = Math.hypot(s.pos.x, s.pos.z) || 1; while (landAt(s.pos.x, s.pos.z, 1200) && k++ < 80) { s.pos.x -= (s.pos.x / L) * 500; s.pos.z -= (s.pos.z / L) * 500; } } // spawned on land: slide toward the open battle area
  if (hqGrade() >= 6 && G.player) try { addMastFlag(G.player, hqGrade() - 5); } catch (e) { console.warn("flag", e); }
  if (G.perkK.hpK !== 1) for (const s of G.ships) if (s.side === "us") { s.maxHp *= G.perkK.hpK; s.hp = s.maxHp; } /* 선체 격벽 */
  uniq(G.enemies.filter((e) => !e.isCarrier)); assignCaptains(); if (modern) for (const s of G.ships) if (s.nation) { const N = NATIONS[s.nation]; s.captain = `${N.names[(rnd() * N.names.length) | 0]} ${N.rk}`; }
  G.jetsOut = 0; G.squad = fightersFor(rk); G.refit = []; G.planeCD = 0; G.sortieRes = 0; G.minHp = 1; G.stats = { shots: 0, hits: 0, bullets: 0, bombs: 0, dealt: 0, planes: 0, torpHits: 0 };
  capReset(); weapon = G.modern ? "msl" : "gun"; aa.on = false; aa.shots = 0; aa.heat = 0; gunner.kills = 0; autoFire = false; cinema = false; document.body.classList.remove("cinema"); hullWarned = false; torpThreat = 0; paused = false; fireHold = 0; fc.tgt = null; corrR = corrB = 0; ribbons.length = 0; rep.cd = rep.act = 0; rep.n = (G.staffK ? G.staffK.repairN : 3) + (G.perkK?.repairN || 0); G.battleT = 0; endT = 0;
  P.aimB = 0; P.aimR = Math.min(P.tb.max * 0.6, 12000); torpB = PI / 2;
  cam.yaw = 0; cam.pitch = 0.95; cam.dist = 1300; cam.map = false; cam.free = false; cam.tgt = null; cam.focus.copy(P.pos); hintT = 22;
  const first = G.enemies[0];
  log(`전장: ${MAPS[mapId].n}${G.tod === "night" ? " · 야간" : ""}${G.wx === "storm" ? " · 폭풍" : ""} · ${ECON_RANKS[myGrade()]} ${cmdr.name} 사령관 지휘 개시`);
  if (CS) log(`한반도 시나리오 ${CS.bonus ? "보너스" : `${campSel + 1}단계`} — ${CS.n}: ${CS.d}${G.hard ? " · 난이도 상승" : ""}`, "hit");
  if (G.tod === "night" || G.wx === "storm") log(`시정 불량 — 피탐 거리 ×${G.visK.toFixed(2)}${G.wxDisp > 1 ? " · 포 산포 +35%" : ""}`);
  if (G.waves) log(`${G.modern ? "미사일전" : "함대 결전"} — 적 함대 ${G.waves.max}개가 차례로 막아선다. 목적지(${fmt(Math.hypot(G.goal.x, G.goal.z))} m)로 항진 — 함대를 모두 격파하면 그 자리에서 임무 완료`, "hit");
  log(`${first ? `${first.spec.name} 외 ${G.enemies.length - 1}척 접근 중. 전투 배치!` : `작전: ${MISSIONS[G.mop]?.n || ""} — ${MISSIONS[G.mop]?.d || ""}`}`);
  G.radio("battle");
  if (G.staffK) { const k = G.staffK, o = officer(staff.a.ops), c = officer(staff.a.cos), rg = hqGrade(); log(`참모진 — ${roleTitle("cos", rg)} ${c.rk} ${c.nm} · ${roleTitle("ops", rg)} ${o.rk} ${o.nm} | 화력 ${pctTxt(k.outK)} · 받는 피해 ${pctTxt(k.inK)} · 요격 ${pctTxt(k.icptK)}`); }
  if (modern) { const P = facePool(), F = P[cmdr.face] || P[0]; cicStart({ md, grade: myGrade(), face: face(myFace(), 110), faceSkin: F.skin?.[0], cmdrName: `${rankLabel(myGrade())} ${cmdr.name}`, nat: natUs, theater: mapId, toast, log, radio: G.radio, know, watchJet, watchMsl, isWatching: (j) => md.fly === j }); } else cicStop();
}
G.toast = (m, t) => toast(m, t);
G.onShellLand = (p, g, o) => G.modern && opsShellLand(p, g, o);
G.onSunk = (ship) => {
  if (ship.side === "us" && !ship.isPlayer) { log(`${ship.name} 침몰!`, "bad"); G.radio("ally_sunk"); return; }
  if (ship.isPlayer) { log(`${ship.spec.short} 침몰 중… 총원 퇴함!`, "bad"); G.radio("abandon"); return; }
  G.ribbon(ship.isCarrier ? "항모 격침" : "격침"); const left = G.enemies.filter((e) => e.alive).length;
  if (killcamOn && !(md.fly && md.fly.alive) && !cap.fps && !aa.on && !cam.map && (G.modern || G.battleT - (ship.myHitT ?? -99) < 30)) G.kc = { ship, t: 2.5, a: Math.atan2(camera.position.z - ship.pos.z, camera.position.x - ship.pos.x) };
  log(left ? `${ship.name} 격침! 남은 적 ${left}척` : "적 함대 전멸!", "hit"); G.radio(left ? "sunk" : "fleet");
};

// ── radio ───────────────────────────────────────────────────────────────────
const RADIO_TXT = { battle: "Battle stations! — 전투 배치", sunk: "Enemy sunk! — 적함 격침", torp_warn: "Torpedoes! — 어뢰 접근", ally_sunk: "Ship lost! — 아군 침몰", launch: "Fighters up! — 전투기 출격", return: "Fighters home! — 전투기 귀환", fire: "Fire! — 화재 발생", flood: "Flooding! — 침수", hull: "Hull critical! — 선체 손상 심각", torp_launch: "Torps away! — 어뢰 발사", fleet: "Fleet destroyed! — 적 함대 전멸", abandon: "Abandon ship! — 총원 퇴함" };
const radioLast = {}; let radioSub = null;
const RADIO_KO = { battle: "전투 배치 완료!", sunk: "적함 격침 확인!", torp_warn: "어뢰 접근 중입니다!", ally_sunk: "아군 함정 침몰!", launch: "전투기 출격합니다!", return: "전투기 귀환했습니다!", fire: "화재 발생!", flood: "침수 발생!", hull: "선체 손상 심각합니다!", torp_launch: "어뢰 발사 완료!", fleet: "적 함대 전멸했습니다!", abandon: "총원 퇴함!" };
const radioAddr = (g) => {
  const sv = serviceOf(staff.branch);
  if (isUS()) return g >= 6 ? (sv === "navy" ? "Admiral" : "General") : g >= 5 ? (sv === "navy" ? "Captain" : "Colonel") : g >= 3 ? (sv === "navy" ? "Commander" : "Major") : "Sir";
  if (sv === "army") return g >= 8 ? "사령관님" : g >= 6 ? "장군님" : g === 5 ? "여단장님" : g >= 3 ? "대대장님" : "소대장님";
  if (sv === "air") return g >= 8 ? "사령관님" : g >= 6 ? "장군님" : g === 5 ? "전대장님" : g >= 3 ? "대대장님" : "편대장님";
  return g >= 8 ? "사령관님" : g >= 6 ? "제독님" : g === 5 ? "전대장님" : g >= 3 ? "함장님" : "사관님";
}; /* how the crew address you, by nation, service, and rank */
G.radio = (k) => { if (G.time - (radioLast[k] ?? -99) < 6) return; radioLast[k] = G.time; radio(k); radioSub = { text: isUS() ? `${RADIO_TXT[k].split(" — ")[0]} — ${radioAddr(hqGrade())}, ${RADIO_TXT[k].split(" — ")[1] || "Standing by."}` : `${RADIO_TXT[k].split(" — ")[0]} — ${radioAddr(hqGrade())}, ${RADIO_KO[k] || RADIO_TXT[k].split(" — ")[1] || ""}`, t: 3.2 }; };

// ── computer captains, fog of war, mission rules ────────────────────────────
const nearestOf = (S, list) => { let b = null, d = Infinity; for (const o of list) if (o && o.alive) { const dd = o.pos.distanceToSquared(S.pos); if (dd < d) { d = dd; b = o; } } return b; };
const conceal = (s) => (G.modern ? (s.radarOn === false ? SR.surf : SR.esm) : (5200 + s.spec.L * 24) * (s.pos ? G.visK || 1 : 1)); // modern: how far the enemy can pick you up
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
  for (const s of G.ships) s.revealT = Math.max(0, (s.revealT || 0) - dt);
  sensorStep(dt);
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
    let t = pickFoe(e, seen);
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
    if (!a.station) { if (a.anchored) { a.tele = 1; a.rudderCmd = 0; } continue; } // operation ships (supply ship, convoy) are steered by ops.js
    if (P.alive) escort(a, P, dt, a.station[0], a.station[1]); else if (t) brain(a, t, a.br, dt);
  }
}
function events() { for (let i = G.events.length - 1; i >= 0; i--) if (G.battleT >= G.events[i].t) { const e = G.events[i]; G.events.splice(i, 1); e.fn(); } }
/** Modern battle: once neither side has an anti-ship missile left (ships, missiles in flight, jets, carriers), a 120 s gun duel decides it. */
function dryCheck() {
  const armed = (S) => S.alive && S.mag && Object.entries(S.spec.vls || {}).some(([t, e]) => (t === "A" || t === "B") && S.mag[e[0]] > 0);
  const dry = !G.ships.some(armed) && !MSL.list.some((m) => m.alive && m.W.role === "asm") && !MSL.jets.some((j) => j.alive && j.asm > 0);
  if (!dry) { G.dryT = null; return false; }
  if (G.dryT == null) { G.dryT = 120; log("양측 대함미사일 소진 — 120초 포격전 후 잔존 선체로 판정", "bad"); toast("미사일 소진 — 120초 포격전, 잔존 선체가 많은 쪽 승리", 4); for (const s of G.enemies) if (s.prefRange) s.prefRange = [3000, 5000]; }
  return G.dryT <= 0;
}
/** Fleet battle waves: when a fleet is sunk the next one appears between the flagship and the destination; after the last one, reach the destination. */
function nextWave() { return nextWaveModern(); }
function nextWaveModern() { /* the next enemy surface group, 16-18 km ahead toward the destination, in open water */
  const W = G.waves, P = G.player, N = NATIONS[W.nat]; W.n++; W.pending = false;
  const keys = W.keys0, r = 16000 + rnd() * 2000; /* each group like the first (an extra ship in the last group was too much: autopilot lost 2 of 2 there) */
  let g = Math.atan2(G.goal.z - P.pos.z, G.goal.x - P.pos.x) + (rnd() - 0.5) * 0.6;
  for (let k = 0; k < 16 && landAt(P.pos.x + Math.cos(g) * r, P.pos.z + Math.sin(g) * r, 4500); k++) g = wrap(g + (k % 2 ? 0.35 : -0.35) * (k + 1));
  const cx = P.pos.x + Math.cos(g) * r, cz = P.pos.z + Math.sin(g) * r, eh = wrap(g + PI + (rnd() - 0.5) * 0.8);
  const out = keys.map((k, i) => { const [x, z] = placeAt(cx, cz, eh, ...STATIONS[i]); const s = new Ship(MODERN[k], x, z, eh, "foe"); s.prefRange = [5000, 8000]; s.station = STATIONS[i]; s.br = mkBrain(16 + i * 5); s.nation = W.nat; mArm(s); return s; });
  for (const s of out) s.group = out;
  if (W.n === W.max && W.rk >= 4 && N.cv) { const [x, z] = placeAt(cx, cz, eh, 3500, 0); const c = new Ship(MODERN[N.cv], x, z, eh, "foe"); c.isCarrier = true; c.br = mkBrain(30); c.nation = W.nat; c.group = out; mArm(c); out.push(c); }
  for (const s of out) { if (s.spec.jets) s.cv = s.spec.jets; if (s.cv) { s.jetsReady = s.cv.n; s.rearm = []; } }
  G.enemies.push(...out); G.ships.push(...out);
  log(`적 제${W.n}수상전투단 탐지 — ${out[0].spec.short || out[0].spec.name} 외 ${out.length - 1}척 · ${fmt(r)} m${W.n === W.max ? " (마지막 전투단)" : ""}`, "bad"); toast(`적 제${W.n}전투단 접근!`, 3); sfx.alarm(); G.radio("battle");
}
function patchUp() { /* between fleets: our ships get 30% hull back, fires out, flooding halved, and the emergency repairs refilled */
  for (const s of G.ships) if (s.alive && s.side === "us" && !s.sinking) { s.hp = Math.min(s.maxHp, s.hp + s.maxHp * 0.5); s.fires.length = 0; s.flooding *= 0.5;
    if (s.mag) mArm(s); } /* modern: 50% hull and full magazines (one missile hit costs far more than a shell) */
  rep.n = Math.max(rep.n, 2); }
function waveCheck(P, foesAlive) {
  const W = G.waves, at = d2(P.pos, G.goal) < 1500;
  if (foesAlive) { if (at && !W.toldGoal) { W.toldGoal = true; toast("목적지 도착 — 남은 적 함대를 격파하라", 3); } return null; }
  if (W.n < W.max) { if (!W.pending) { W.pending = true; patchUp(); log(`적 제${W.n}${W.modern ? "전투단" : "함대"} 전멸! 응급 정비로 선체 ${W.modern ? "50% 회복 · 미사일 완전 재보급" : "30% 회복"} · 수리 횟수 보충 — 다음 ${W.modern ? "전투단" : "함대"}이 다가온다`, "hit"); toast(`제${W.n}함대 격파 — 15초 뒤 다음 함대`, 3); G.events.push({ t: G.battleT + 15, fn: nextWave }); } return null; }
  return { won: true, why: at ? `적 ${W.max}개 함대 격파 · 목적지 도달` : `적 ${W.max}개 함대 전멸` }; /* wiping out every fleet wins even short of the destination */
}
function missionCheck() {
  if (G.state !== "playing") return;
  const P = G.player, foesAlive = G.enemies.some((e) => e.alive); let res = null, opRes;
  if (!P.alive) res = { won: false, why: `${P.spec.short} 침몰` };
  else if ((opRes = opsCheck()) !== undefined) res = opRes; // ASW, BMD, drones, shore, convoy decide their own end
  else if (G.mission === "modern" && !G.waves && foesAlive && dryCheck()) { const hp = (side) => { const L = G.ships.filter((s) => s.side === side && s.spec.modern && !s.spec.jets); return L.reduce((n, s) => n + (s.alive ? s.hp / s.maxHp : 0), 0) / Math.max(1, L.length); }, a = hp("us"), b = hp("foe");
    res = { won: a >= b, why: `양측 미사일 소진 · 포격전 종료 — 판정${a >= b ? "승" : "패"} (잔존 선체 아군 ${Math.round(a * 100)}% / 적 ${Math.round(b * 100)}%)` }; }
  else if (G.waves) res = waveCheck(P, foesAlive);
  else if (G.mission === "modern") { if (!foesAlive) res = { won: true, why: "적 수상함 전멸 — 해상 우세 확보" }; }
  if (res) { G.result = res; G.state = "ending"; endT = 5; log(res.won ? `승리 — ${res.why}` : `패배 — ${res.why}`, res.won ? "hit" : "bad"); }
}
function finish() {
  jetSound(0); droneSound(0); cicStop(); G.state = "ended"; toastT = 0; $("#toast").classList.remove("on"); const res = G.result || { won: false, why: "" }, won = res.won, secs = Math.max(1, Math.round(G.battleT));
  if (G.staffK) staffServe(won);
  document.body.classList.remove("playing", "flying", "firstp"); if (goalMk) goalMk.visible = false; if (document.pointerLockElement) document.exitPointerLock();
  $("#endSub").textContent = (MISSIONS[G.mop || G.mission] || MISSIONS[G.mission]).n; $("#endTitle").textContent = res.why;
  if (G.camp != null && !G.auto) kFinish(won);
  $("#endFoes").innerHTML = G.enemies.slice(0, 6).map((e) => `<div>${flagOf(e, 22)}<b>${e.name}</b><span class="c">함장 ${e.captain || ""}</span><span class="r${e.alive ? " alive" : ""}">${e.captured ? "나포" : e.alive ? "생존" : "격침"}</span></div>`).join("");
  const s = G.stats, acc = s.shots ? ((s.hits / s.shots) * 100).toFixed(1) : "0.0";
  let html = (G.storyEpi ? `<span>이야기</span><span class="epi">${G.storyEpi}</span>` : "") + `<span>교전 시간</span><span>${Math.floor(secs / 60)}분 ${secs % 60}초</span><span>주포 발사 / 명중</span><span>${s.shots}발 / ${s.hits}발 (${acc}%)</span>`
    + `<span>적함 격침</span><span>${G.enemies.filter((e) => !e.alive).length} / ${G.enemies.length}척 · 어뢰 명중 ${s.torpHits || 0}발${s.caps ? ` · 나포 ${s.caps}척` : ""}</span><span>항공전</span><span>적기 격추 ${s.planes || 0}기 · 폭탄 명중 ${s.bombs}발</span>`
    + `<span>잔여 선체</span><span>${Math.round((G.player.hp / G.player.maxHp) * 100)}%</span><span>지휘</span><span>${ECON_RANKS[myGrade()]} ${cmdr.name} · ${postLabel(postOf(myGrade()).split(" (")[0])}</span>`;
  $("#endPromo").innerHTML = "";
  if (!G.auto) {
    const before = myGrade();
    const a = { kind: "result", won, shots: Math.min(s.shots, 5000), hits: Math.min(s.hits, s.shots, 5000), seconds: Math.min(secs, 36000), tier: econTier(), bombs: Math.min(s.bombs, 20), bullets: Math.min(s.bullets, 20000), planes: Math.min(s.planes || 0, 200), caps: Math.min(s.caps || 0, 10), mission: G.mission, ...ngFlags() };
    const r = econReward(a); act(a); sfx.coin();
    html += `<span>보상</span><span style="color:var(--warn)">+${fmt(r.money)} 크레딧 · +${fmt(r.xp)} 경험치</span>`;
    if (minDirect3d) { minDirect3d = false; minOpResult(won, "3D 직접 개입"); if (won) { career.marshalWins = (career.marshalWins || 0) + 1; saveCareer(); } html += `<span>합동 워룸</span><span style="color:var(--gold)">3D 직접 개입 ${won ? "대승" : "패배"} 반영</span>`; }
    if (dutyDirect) { dutyDirect = false; const dr = resolveCrisisDirect(won, before, "3D 직접 개입"); if (dr) { profile.xp += dr.xpGain; saveProfile(); if (won) { career.marshalWins = (career.marshalWins || 0) + 1; saveCareer(); } html += `<span>위기 개입</span><span style="color:var(--gold)">${won ? "격퇴 성공" : "고전"} · +${fmt(dr.xpGain)} XP</span>`; } }
    const P1 = G.player, al = G.allies.filter((a) => a.spec && !a.isCarrier), ev = scoreBattle({ won, hp: P1 && P1.alive ? P1.hp / P1.maxHp : 0, sunk: G.enemies.filter((e) => !e.alive).length, foes: G.enemies.length, lost: al.filter((a) => !a.alive).length, allies: al.length, secs, jetsOut: G.jetsOut || 0 }, normBranch(staff.branch));
    if (r.press) ev.s = Math.max(0, Math.min(100, ev.s + r.press)); /* 작전 후 기자회견 */
  if (r.c72bonus) { ev.s = Math.max(0, Math.min(100, ev.s + r.c72bonus)); toast(`캠페인 「서해 72시간」 종료 — 근무평정 +${r.c72bonus}`); }
  recordEval(before, ev.s); const bd = board(before, xpGrade()), eo = evalOf(before);
    html += `<span>근무평정</span><span>${ev.s}점 · ${FOCUS[normBranch(staff.branch)].n} 병과 기준 (이번 계급 평균 ${eo.avg}점 ${eo.l} · ${eo.n}회)</span>`;
    if (bd.xp && !bd.promoted) { const why = [!bd.cnt ? `이 계급 근무 ${bd.e.n}/${bd.need}회` : "", !bd.score ? `평정 평균 ${bd.e.avg}점 (기준 ${PASS}점)` : ""].filter(Boolean).join(" · "); html += `<span>진급 심사</span><span style="color:#ff9b8a">보류 — ${why}${deferNote() ? `<br>${deferNote()}` : ""}</span>`; }
    const after = myGrade(), rl = rankLine();
    html += `<span>계급</span><span>${rl.name}${rl.next ? ` — ${rl.next}까지 ${fmt(rl.need - profile.xp)} 경험치` : " (최고 계급)"}</span>`;
    { const id = G.player?.spec?.id; if (id && MODERN[id]) { const L = (career.shipLog ??= {}), h = (L[id] ??= { b: 0, w: 0, k: 0 }); h.b++; if (won) h.w++; h.k += G.enemies.filter((e) => !e.alive).length; saveCareer(); } }
    const newShips = KR_LADDER.filter((o) => o.g > before && o.g <= after), unl = newShips.map((o) => MODERN[o.id].name).join(", ");
    if (newShips.length) { career.ship = null; saveCareer(); html += `<span>새 함정</span><span style="color:var(--gold)">${unl} — 다음 출전부터 기함</span>`; }
    if (after > before) {
      $("#endPromo").innerHTML = `<span class="k">RANK</span><div class="ib new">${insignia(after, 64)}</div><div class="big" style="font-size:30px">${ECON_RANKS[after]}</div><div class="sub">${postLabel(postOf(after))}</div>`;
      if (career.seen == null && staff.branch) careerInit(before, careerTitle(before), BRANCHES[staff.branch].n); career.picks += after - before; logPromotion({ g: after, t: postOf(after), b: BRANCHES[staff.branch]?.n || "", why: res.why }); pmOpts = null;
      const handover = buildPromo(before, after, unl);
      setTimeout(() => { if (G.state !== "ended") return; $("#promoM").style.display = "flex"; fanfare(after, staff.branch); }, 2600);
      if (handover) log(`지휘권 이양 — ${rankLabel(after)} ${cmdr.name} ${(curServices()[serviceOf(staff.branch)] || curServices().navy).n} 작전사령부 지휘`, "hit"); }
    else $("#endPromo").innerHTML = `<span class="k">RANK</span><div class="ib new">${insignia(after, 64)}</div><div class="big" style="font-size:30px">${ECON_RANKS[after]}</div><div class="sub">${postLabel(postOf(after))}<br>${rl.next ? `${rl.next}까지 ${fmt(rl.need - profile.xp)} XP` : "최고 계급"}</div><div class="rk"><div class="hbar"><i style="width:${rl.pct * 100}%;background:var(--gold)"></i></div></div>`;
    const P0 = G.player, got = awardMedals({ won, modern: !!G.modern, wins: profile.wins, sunk: G.enemies.filter((e) => !e.alive).length, hp: P0 ? P0.hp / P0.maxHp : 0, lowHp: (G.minHp ?? 1) <= 0.5, grade: after });
    pmMedals = got;
    if (got.length) { const MD = curMedals(); html += `<span>훈장 수여</span><span style="color:var(--gold)">${got.map((k) => MD[k].n).join(" · ")}</span>`; if (after <= before) toast(`훈장 수여 — ${got.map((k) => MD[k].n).join(" · ")}`, 4); } /* on a promotion the order's medal page shows them */
  } else html += `<span>관전 모드</span><span>보상 없음</span>`;
  $("#endStats").innerHTML = html; $("#end").style.display = "grid"; bgm("menu");
}

// ── menus + shipyard ────────────────────────────────────────────────────────
let screen = "menu";
function refreshMenus() {
  const rl = rankLine(), u = perkMods().upg, usOffice = currentUsOffice();
  $("#tbMoney").textContent = profile.admin ? "∞ CR (관리자)" : `${fmt(profile.money)} CR`;
  $("#tbRank").textContent = usOffice?.title ?? (civil() ? (isUS() ? "민간인 · 전 미 국방장관" : presTitle()) : career.minister ? `국방부장관 · 예비역 ${rl.name}` : `${rl.name} ${payStep(profile.xp, rl.r, ECON_RANK_XP).step}호봉 · ${postLabel(postOf(rl.r))}`);
  $("#tbIns").innerHTML = badge(rl.r, 24, usOffice);
  $("#tbIns").style.display = usOffice && !usOffice.mark ? "none" : "";
  $("#rankBar").parentElement.hidden = !!usOffice;
  $("#rankBar").style.width = rl.pct * 100 + "%";
  document.body.classList.toggle("us-nat", isUS());
  const langButton = $("#rankLang");
  langButton.hidden = !isUS();
  langButton.textContent = koreanUsRanks() ? "계급·보직 한글" : "계급·보직 EN";
  langButton.setAttribute("aria-pressed", String(koreanUsRanks()));
  langButton.title = koreanUsRanks() ? "계급·보직을 영어로 전환" : "계급·보직을 한글로 전환";
  for (const b of document.querySelectorAll("#natSw [data-nat]")) b.classList.toggle("on", b.dataset.nat === (isUS() ? "us" : "kr"));
  { const sp = MODERN[flagshipId()], v = sp.vls || {}, cells = Object.values(v).reduce((n, x) => n + (x?.[1] || 0), 0), wp = Object.values(v).map((x) => x?.[0]).filter(Boolean).join(" · ");
    const hist = career.shipLog || {}, open = shipsOpen(), pick = open.length > 1 ? `<div class="shp">${open.map((o) => { const m = MODERN[o.id], h = hist[o.id]; return `<button data-flag="${o.id}" class="${o.id === sp.id ? "on" : ""}" title="${m.cls}"><b>${m.short}</b><i>${m.cls.replace(/ \(.*\)/, "")}</i><i>${h ? `출전 ${h.b} · 격침 ${h.k}` : "출전 기록 없음"}</i></button>`; }).join("")}</div>` : "";
    const nxt = KR_LADDER.find((o) => o.g > myGrade()), hs = hist[sp.id];
    $("#shipLine").innerHTML = `<div class="fh">${isUS() ? FLAG.us(30) : FLAGSVG.kr(30)}<span>FLAGSHIP · ${sp.cls}</span></div><div class="nm">${sp.name.replace(/\s*\(.*\)/, "")}</div><div class="cap">${usOffice ? `${usOffice.title} ${cmdr.name}` : civil() ? `민간인 ${cmdr.name} (전 국방부장관)` : career.minister ? `국방부장관 ${cmdr.name} (예비역 ${rankLabel(myGrade())})` : `함장 ${rankLabel(myGrade())} ${cmdr.name}`}</div>`
      + `<div class="grid"><span>${v.S || v.M || v.L ? `VLS·미사일 ${cells}발` : `함대함 미사일 ${cells}발`}</span><span>${(sp.vmax * (1 + 0.05 * (u.engine || 0))).toFixed(1)} kn</span><span>${wp}</span><span>근접방어 ${sp.pd?.[0] || "—"}</span><span>호위 ${myRank() >= 3 ? 2 : 1}척</span><span>${ladderOf(sp.id).t >= 3 && NATIONS.kr.cv ? `항공 ${MODERN[NATIONS.kr.cv].short}` : "항공 지원 없음"}</span></div>`
      + `<div class="shh">함정 이력 — ${hs ? `출전 ${hs.b}회 · 승리 ${hs.w} · 격침 ${hs.k}척` : "아직 출전 기록이 없습니다"}${nxt ? ` · 다음 함정 ${MODERN[nxt.id].short} (${rankLabel(nxt.g)})` : ""}</div>` + pick; }
  $("#rankTxt").textContent = usOffice?.title ?? (civil() ? `민간인 · 전 국방부장관 (예비역 ${rl.name})` : career.minister ? `예비역 ${rl.name} · 국방부장관 재임 중` : rl.next ? `${rl.name} → ${rl.next} · ${fmt(profile.xp)} / ${fmt(rl.need)} XP` : `${rl.name} · 최고 계급`);
  const acc = profile.shots ? ((profile.hits / profile.shots) * 100).toFixed(1) : "0.0";
  $("#record").textContent = profile.battles ? `${profile.wins}승 / ${profile.battles}전 · 명중률 ${acc}%` : "첫 출격 대기 중";
  renderRecord();
  document.body.classList.add("modern");
  const brk = normBranch(staff.branch), svcK = serviceOf(brk), svc = curServices()[svcK] || curServices().navy;
  $("#modeSel").innerHTML = `<button class="er hero" data-mode="career"><b>🎖️ ${isUS() ? "미국 3군 장교 커리어 (U.S. Armed Forces)" : "국방 경영 &amp; 3군 장교 커리어"} (${staff.branch ? `${svc.icon} ${svc.n} ${rankLabel(myGrade(), svcK)}` : isUS() ? "O-1 임관 시작" : "소위 임관 시작"})</b><small>${isUS() ? "미 육·해·공군 O-1 임관 → 계급장·보직 성장 → 펜타곤·합참(JCS) → 미 국방장관(SecDef · 36주)" : "육·해·공 소위 임관 → 복무 안건·위기 결재·계급장 성장 → 장성·국방부장관(36주) → 대선 → 대통령"}</small></button>`
    + `<div class="mode-sep">전술 시나리오 (3D 전투 · 2D FM 작전)</div>`
    + `<button class="er" data-mode="camp"><b>한반도 시나리오 (3D)</b><small>서해부터 제주 남방까지 5단계 + 보너스 · 브리핑과 별점</small></button>`
    + `<button class="er" data-mode="ops"><b>함정 전투 (3D)</b><small>미사일 해전 · 호송 등 작전을 골라 직접 지휘함·전투기를 조종</small></button>`
    + `<button class="er" data-mode="opmap"><b>FM 작전 지휘 · 작전지도</b><small>서해 해상 차단 작전 — 전단 기동·지원 배정을 계획하고 실시간으로 지휘</small></button>`
    + `<button class="er" data-mode="c72"><b>캠페인 · 서해 72시간</b><small>해상·항공 합동 4연속 작전 — 결과에 따라 다음 작전이 갈리고 신뢰도·피로가 이어짐</small></button>`
    + (brk === "mar" || brk === "plt" || brk === "tac" ? `<button class="er" data-mode="airmap"><b>항공 작전 · 작전지도</b><small>항공·조종 특화 — 전투기·초계기·헬기 편대에 임무를 주고 출격·귀환·재무장을 지휘</small></button>` : "");
  $("#wzSum").innerHTML = `선택: <b>${MISSIONS[mission]?.n || ""}</b>${isModernOp(mission) ? ` · <b>${NATIONS[natUs].n} vs ${NATIONS[natFoe].n}</b>` : ""} · <b>${MAPS[theater]?.n || ""}</b> · ${todSel === "night" ? "야간" : "주간"}/${wxSel === "storm" ? "폭풍" : "맑음"}<button class="go" type="button" data-wzgo="1">이대로 출항</button>`;
  if (typeof wzCrumb === "function" && document.querySelector("#opsP .wz.on")) wzCrumb();
  $("#campBox").style.display = ""; $("#campBox .ph span:last-child").textContent = "한반도 시나리오 (가상)"; $("#opsTitle").textContent = "작전 선택";
  $("#missions").innerHTML = Object.entries(MISSIONS).filter(([k]) => ACTIVE.includes(k)).map(([k, m]) => `<button class="ms${k === mission ? " on" : ""}" data-m="${k}"><b>${m.n}</b><small>${m.d}</small></button>`).join("");
  $("#nations").style.display = isModernOp(mission) ? "" : "none";
  if (isModernOp(mission)) { fixNations(); const rk = myRank(), btn = (k, side, on, need) => `<button class="nt${on ? " on" : ""}" data-n${side}="${k}"${need > rk ? ` disabled title="${ECON_RANKS[need + 3]} 이상"` : ""}>${(FLAGSVG[k] || FLAG.us)(18)} ${NATIONS[k].n}${need > rk ? ` 🔒${ECON_RANKS[need + 3]}` : ""}</button>`;
    $("#nations").innerHTML = `<div class="ph"><span>FORCES</span><span>적국 선택 (아군: 대한민국 해군)</span></div><div class="natrow"><span>아군</span>${btn("kr", "u", true, 0)}</div><div class="natrow"><span>적군</span>${Object.entries(SIDE_FOE).map(([k, need]) => btn(k, "f", k === natFoe, need)).join("")}</div><div class="natnote">${natFoe === "cn" ? (rk >= 4 ? "중국 해군 주력 — 055형 3척 + 항모 산둥 (최고 난이도)" : "중국 해군 — 055형 2척 (소장부터 항모 전단)") : `북한 해군 — 연안 전투함${rk >= 3 ? " 3척" : " 2척"} + 지상 발진 MiG-29`}</div>`; }
  $("#wx").innerHTML = [["tod", "day", "주간", "기본 시정"], ["tod", "night", "야간", "피탐 거리 −45%"], ["wx", "clear", "맑음", "기본"], ["wx", "storm", "폭풍", "시정 −30% · 포 산포 +35%"]]
    .map(([g, k, n, d]) => `<button class="mp${(g === "tod" ? todSel : wxSel) === k ? " on" : ""}" data-${g}="${k}"><b>${n}</b><small>${d}</small></button>`).join("") + `<div class="mpn">현대전에서는 화면만 바뀌고 레이더 탐지는 그대로</div>`;
  $("#camp").innerHTML = kcampHTML();
  $("#maps").innerHTML = Object.entries(MAPS).filter(([k]) => k !== "uswest").map(([k, m]) => `<button class="mp${theater === k ? " on" : ""}" data-map="${k}"><b>${m.n}</b><small>${m.d}</small></button>`).join("");
  $("#cmdrFace").innerHTML = face(myFace(), 46); $("#cmdrName").textContent = civil() ? cmdr.name : career.minister ? `장관 ${cmdr.name}` : `${rankLabel(rl.r)} ${cmdr.name}`;
}
$("#rankLang").addEventListener("click", () => {
  toggleUsRankLanguage();
  refreshMenus();
  if (screen === "record") {
    renderRecord();
  }
  if (screen === "hq") renderHQ();
});
$("#natSw")?.addEventListener("click", (e) => {
  const b = e.target.closest("[data-nat]");
  if (!b || b.dataset.nat === (isUS() ? "us" : "kr")) return;
  sfx.click();
  openTitleHub(false, b.dataset.nat);
});
$("#nations").addEventListener("click", (e) => { const b = e.target.closest("[data-nu],[data-nf]"); if (!b || b.disabled) return; if (b.dataset.nu) natUs = b.dataset.nu; else natFoe = b.dataset.nf; try { careerStorage.setItem("steeltide:natUs", natUs); careerStorage.setItem("steeltide:natFoe", natFoe); } catch {} sfx.click(); refreshMenus(); });
$("#maps").addEventListener("click", (e) => { const b = e.target.closest("[data-map]"); if (!b || b.disabled) return; theater = b.dataset.map; try { careerStorage.setItem("steeltide:map", theater); } catch {} sfx.click(); refreshMenus(); });
$("#wx").addEventListener("click", (e) => { const b = e.target.closest("[data-tod],[data-wx]"); if (!b) return; if (b.dataset.tod) todSel = b.dataset.tod; else wxSel = b.dataset.wx; try { careerStorage.setItem("steeltide:tod", todSel); careerStorage.setItem("steeltide:wx", wxSel); } catch {} sfx.click(); refreshMenus(); });
$("#camp").addEventListener("click", (e) => { const kb = e.target.closest("[data-kcamp]"); if (kb && !kb.disabled) openBrief(+kb.dataset.kcamp); });
$("#modeSel").addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (!b) return; if (b.dataset.mode === "career") { openHQ(); return; } if (b.dataset.mode === "opmap") { startOpMap(); return; } if (b.dataset.mode === "airmap") { startOpMap(true); return; } if (b.dataset.mode === "c72") { startOpMap(false, true); return; } wzMode = b.dataset.mode; showWz(wzMode === "camp" ? "camp" : "ops"); });
$("#opsP").addEventListener("click", (e) => { const back = e.target.closest(".wz-back"); if (back) { const t = WZ_BACK[wz]; if (t) showWz(typeof t === "function" ? t() : t); return; }
  const to = e.target.closest("[data-wzto]"); if (to) { showWz(to.dataset.wzto); return; }
  const go = e.target.closest("[data-wzgo]"); if (go) { campSel = null; start(false); } });
showWz("mode", true);
$("#briefNo").addEventListener("click", () => { $("#brief").style.display = "none"; sfx.click(); });
$("#briefGo").addEventListener("click", () => { const c = KCAMP[briefI]; if (!c) return; $("#brief").style.display = "none"; if (c.m === "opmap") { storyOp = briefI; startOpMap(); return; } campSel = briefI; natUs = "kr"; natFoe = "nk"; mission = c.m; theater = c.map; start(false); });
$("#cmdrEdit").addEventListener("click", () => openCmdr());
$("#cmdrM").addEventListener("click", (e) => { const f = e.target.closest("[data-face]"); if (f) { cmdrDraft = +f.dataset.face; renderCmdr(); sfx.click(); return; } if (e.target.id === "cmdrOk") saveCmdr(); });
$("#cmdrM").addEventListener("keydown", (e) => { if (e.key === "Enter") saveCmdr(); e.stopPropagation(); });
$("#missions").addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (!b) return; setTimeout(() => showWz("nat"), 0); mission = b.dataset.m; try { careerStorage.setItem("steeltide:mission", mission); } catch {} sfx.click(); refreshMenus(); });

$("#yard").addEventListener("keydown", (e) => { if (e.target.id === "adminCode" && e.key === "Enter") $('[data-act="admin"]')?.click(); });
/** The 해군본부 personnel order; preview = admin rehearsal (no picks, no record). Returns the handover text if any. */
let pmPreview = false, pmTook = 0, pmAfter = 0, pmTakenL = []; /* one pick per 인사명령 is enough; leftovers wait in 내 정보 */
/** 3D general's flag at the masthead from 준장 up: canvas cloth, waved per vertex each frame. */
function flagCanvas(n) {
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 170; const x = cv.getContext("2d");
  x.fillStyle = "#cf1f2b"; x.fillRect(0, 0, 256, 170); x.fillStyle = "#fff";
  const star = (cx, cy, r) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
  for (let i = 0; i < n; i++) { if (n === 5) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; star(128 + Math.cos(a) * 30, 56 + Math.sin(a) * 30, 13); } else star((256 / (n + 1)) * (i + 1), 52, 24); }
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const t = i / 4, cx = 128 + s * (18 + 34 * Math.sin(t * 1.4)), cy = 150 - 48 * t; x.save(); x.translate(cx, cy); x.rotate(s * (0.9 - t * 1.1)); x.beginPath(); x.ellipse(0, -9, 6, 11, 0, 0, Math.PI * 2); x.fill(); x.restore(); }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; x.beginPath(); x.ellipse(128 + Math.cos(a) * 8, 140 + Math.sin(a) * 8, 7, 7, 0, 0, Math.PI * 2); x.fill(); }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function addMastFlag(P, n) {
  P.tilt.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(P.tilt), c = b.getCenter(new THREE.Vector3());
  const top = P.tilt.worldToLocal(new THREE.Vector3(c.x, b.max.y, c.z)), w = Math.max(6, Math.min(14, P.spec.L * 0.06)), h = w * 0.66;
    const geo = new THREE.PlaneGeometry(w, h, 18, 4); geo.translate(-w / 2, 0, 0); /* hoist at the pole, fly aft */
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: flagCanvas(n), side: THREE.DoubleSide })); m.position.set(top.x - 0.3, top.y - h * 0.6, top.z); P.tilt.add(m); /* hoisted just under the masthead */
  G.mastFlag = { m, base: Float32Array.from(geo.attributes.position.array), w };
}
function waveMastFlag() {
  const F = G.mastFlag, pos = F.m.geometry.attributes.position; if (!F.m.parent) { G.mastFlag = null; return; }
  for (let i = 0; i < pos.count; i++) { const x0 = F.base[i * 3], y0 = F.base[i * 3 + 1], k = -x0 / F.w; pos.setZ(i, Math.sin(x0 * 0.9 + G.time * 6) * 0.55 * k * (F.w / 8) + Math.sin(y0 * 1.3 + G.time * 4) * 0.12 * k); }
  pos.needsUpdate = true;
}
function buildPromo(before, after, unl = "", preview = false, review = null) {
  pmPreview = preview; pmTook = 0; pmPage = 1; pmAfter = after; pmTakenL = []; pmPostG = -1; pmPostOpts = [];
  const svk = serviceOf(staff.branch), sv0 = curServices()[svk] || curServices().navy;
  const echUnit = isUS()
    ? (US_SVC_ORG[svk] || US_SVC_ORG.navy).ech[echOf(after)]
    : ({ army: ["대대·중대 부서", "연대·여단 참모부", "사단·군단 참모부", "지상작전사령부"], navy: ["함정 부서", "함정·전대 참모부", "전투단·기동부대 참모부", "해군작전사령부"], air: ["비행대대 부서", "전대 참모부", "비행단 참모부", "공군작전사령부"] }[svk] || ECH.map((x) => x.u))[echOf(after)];
  const newRole = echOf(after) !== echOf(before) ? [isUS() ? `Commanding ${echUnit} — Staff Appointment Authority Unlocked` : `${echUnit} 지휘 — ${ECH[echOf(after)].rk}급 참모진 편성 (${Object.values(ECH[echOf(after)].t).slice(0, 3).join(" · ")} 등)`] : [], yr = new Date().getFullYear(), no = String(((profile.xp * 7) % 97) + 1).padStart(2, "0");
  const opens = [newRole.join(""), unl ? (isUS() ? `Unlocked: ${unl}` : `함선 ${unl}`) : ""].filter(Boolean).join(" · ");
  const handover = after >= 8 && before < 8 ? `<div class="po-cc">${
    isUS()
      ? (svk === "army" ? `Lieutenant General, Commanding General FORSCOM, hereby transfers theater operational command to you. You now command the headquarters staff and subordinate corps.`
        : svk === "air" ? `Lieutenant General, Commander Pacific Air Forces (PACAF), hereby transfers theater air command to you. You now command the headquarters staff and fighter wings.`
        : `Vice Admiral, Commander U.S. Pacific Fleet (USPACFLT), hereby transfers operational fleet command to you. You now command the fleet staff and carrier strike groups.`)
      : (svk === "army" ? `지상작전사령관 중장이 귀관에게 전구 작전 지휘권을 이양합니다. 이제부터 귀관이 사령부 전 참모진과 예하 군단을 직접 지휘합니다.`
        : svk === "air" ? `공군작전사령관 중장이 귀관에게 영공 작전 지휘권을 이양합니다. 이제부터 귀관이 사령부 전 참모진과 전투비행단을 직접 지휘합니다.`
        : `중장 ${FLEET_CDR.nm} 제독이 귀관에게 작전 지휘권을 이양합니다. 이제부터 귀관이 사령부 전 참모진과 기동함대를 직접 지휘합니다.`)
  }</div>` : "";
  const josa = (w) => { const j = (w.charCodeAt(w.length - 1) - 0xac00) % 28; return j === 0 || j === 8 ? "로" : "으로"; };
  const pmHead = isUS() ? `U.S. Department of Defense · ${sv0.en}` : `대한민국 ${sv0.n}본부`;
  const pmTxt = isUS()
    ? `By direction of the President of the United States, ${usRankFull(before, svk)} <b>${cmdr.name}</b> is hereby promoted to <b>${usRankFull(after, svk)} (${US_PAY[after]})</b> and assigned to:<br><b id="pmPostT">${postLabel(postOf(after))}</b>`
    : `위 사람을 ${rankLabel(before)}에서 ${rankLabel(after)}${josa(ECON_RANKS[after])} 진급시키고<br><b id="pmPostT">${postLabel(postOf(after))}</b>에 보함`;
  const reviewNote = review ? `<div class="pm-review-note"><b>${review.automatic ? "대위 자동진급" : `진급심사 ${review.score}점`}</b> · ${review.date}<br>
    이전 보직 ${postLabel(review.previousPost)} · 해당 계급 복무 ${serviceDuration(review.serviceMonths)}<br>
    ${review.automatic ? "복무기간·경험치·평정 횟수 충족" : `주요 기여 ${review.contribution[0]} ${review.contribution[1]}점${review.penalty ? ` · 감점 ${review.penalty}점` : ""}`}</div>` : "";
  const pmRadio = after < 3 ? `<div class="pm-radio"><b>${isUS() ? "RADIO" : "무전"}</b> ${isUS() ? `Congratulations on your promotion to ${usRankFull(after, svk)}, ${radioAddr(after)}! All hands standing by for your orders.` : `${radioAddr(after)}, 진급을 축하드립니다!`}</div>` : "";
$("#promoM").innerHTML = `<div class="pm-doc"><div class="pm-pg on" data-pg="1"><div class="pm-h">${pmHead}</div><div class="pm-no">${isUS() ? `SPECIAL ORDERS NO. ${yr}-${no}` : `인사명령 제${yr}-${no}호`}</div>${after >= 6 ? flagHTML(after, before) : `<div class="pm-ins">${insignia(after, 120)}</div>`}<div class="pm-rank">${isUS() ? `PROMOTED TO ${usRankFull(after, svk).toUpperCase()}` : `${rankLabel(after, svk)} 진급`}</div><div class="pm-name">${cmdr.name}</div><div class="pm-txt">${pmTxt}</div>${reviewNote}<div class="pm-u">${opens}</div>${handover}${pmRadio}${ministerSign()}<button class="pm-next" data-pmgo="2">${isUS() ? "Next ›" : "다음 ›"}</button></div><div class="pm-pg" data-pg="2"><div class="pm-h2">${isUS() ? "Decorations &amp; Medals" : "훈장 수여"}</div><div id="pmMed"></div><button class="pm-next" data-pmgo="3">${isUS() ? "Next ›" : "다음 ›"}</button></div><div class="pm-pg" data-pg="3"><div class="pm-h2">${isUS() ? "Next Assignment" : "보직 선택"}</div><div id="pmPost"></div><button id="promoOk">${isUS() ? "Yes, Sir!" : "명 받았습니다"}</button></div><div class="pm-dots">${[1, 2, 3].map((n) => `<i data-d="${n}"${n === 1 ? ' class="on"' : ""}></i>`).join("")}</div></div>`;
  renderPostPick(after);
  return handover;
}
const ministerSign = () => {
  const dt = new Date();
  if (isUS()) {
    const mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][dt.getMonth()];
    return `<div class="pm-sign"><div class="pm-date">${dt.getDate()} ${mon} ${dt.getFullYear()} · PENTAGON</div><div class="pm-sg"><span>Secretary of Defense</span><svg viewBox="0 0 160 54" width="160" height="54"><path d="M10 38 C16 14 28 12 24 30 C22 40 34 22 44 26 C50 28 46 38 56 32 C66 26 74 14 82 28 C88 38 98 20 110 26 C118 30 128 18 144 24 M28 42 C64 38 106 39 148 35" stroke="#182a4a" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><i style="border-color:#1c3d6e;color:#1c3d6e;border-radius:50%;padding:4px 6px;font-size:8.5px">U.S. DoD<br>SEAL</i></div></div>`;
  }
  return `<div class="pm-sign"><div class="pm-date">${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일</div><div class="pm-sg"><span>국방부장관</span><svg viewBox="0 0 150 54" width="150" height="54"><path d="M8 38 C18 10 30 12 26 30 C22 46 34 40 42 22 C46 14 50 18 48 30 C46 40 56 34 64 20 C68 30 70 36 80 28 C88 22 92 16 98 24 C104 32 112 30 120 18 M60 44 C80 40 110 40 142 34" stroke="#1d2340" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><i>國防部長官印</i></div></div>`;
}; /* fictional signature, no real person's name */
let pmMedals = [], pmPage = 1;
function pmGo(n) {
  if (n === 2 && !pmMedals.length && !pmPreview) n = 3; /* no medal this time: straight to the posting */
  pmPage = n; for (const el of document.querySelectorAll("#promoM .pm-pg")) el.classList.toggle("on", +el.dataset.pg === n);
  for (const d of document.querySelectorAll("#promoM .pm-dots i")) d.classList.toggle("on", +d.dataset.d === n);
  if (n === 2) { const MD = curMedals(); $("#pmMed").innerHTML = (pmMedals.length ? pmMedals : pmPreview ? Object.keys(MD).filter((k) => career.medals?.[k]).slice(0, 3) : []).map((k) => `<div class="pm-md"><i>${MD[k].rb.map((col) => `<b style="background:${col}"></b>`).join("")}</i><div><b>${MD[k].n}</b><small>${MD[k].d}</small></div></div>`).join("") || `<div class="pm-none">이번에 받은 훈장이 없습니다</div>`; }
  $("#promoM").scrollTop = 0; sfx.click();
}
/** 보직 순환: at each promotion pick the next posting — stay on your branch line or cross over (the career and its evaluation weights follow). */
let pmPostG = 0, pmPostOpts = [], pmPostSel = null;
function renderPostPick(g) {
  const el = $("#pmPost"); if (!el || !staff.branch) { if (el) el.innerHTML = ""; return; }
  const br0 = normBranch(staff.branch), sv = serviceOf(br0), SV = curServices(), BR = curBranches(), svName = (SV[sv] || SV.navy).n;
  if (g >= 6 && g <= 9) {
    if (pmPostG !== g || !pmPostOpts.length || typeof pmPostOpts[0] !== "object") {
      pmPostG = g;
      const assigned = career.post?.g === g ? career.post.t : null;
      const occupied = new Set((dutyState().rivals || []).filter(r => r.g === g).map(r => r.post));
      const options = flagPostsForTrack(g, br0, sv).filter(p => pmPreview || !occupied.has(p.t) || p.t === assigned);
      const available = !pmPreview && g === 9 && assigned ? options.filter(p => p.t === assigned) : options;
      const first = available.find(p => p.t === assigned) || available.find(p => p.t === careerTitle(g)) ||
        available.find(p => p.b === br0) || available[0];
      pmPostOpts = first ? [first, ...available.filter(p => p !== first)] : [];
      pmPostSel = first?.t || null;
    }
  } else if (pmPostG !== g || !pmPostOpts.includes(br0)) {
    pmPostG = g;
    const allowed = Object.keys(BR).filter((k) => { const bs = BR[k].svc; return bs === sv || (g >= 3 && bs === "joint"); }); /* 위관: 소속 군종 병과만 · 영관: +공통 융합 트랙 */
    const seen = new Set([BR[br0].t[g]]), others = [];
    for (const k of allowed.filter((k) => k !== br0)) { const t = BR[k].t[g]; if (!seen.has(t)) { seen.add(t); others.push(k); } }
    pmPostOpts = [br0, ...others]; pmPostSel = br0;
  }
  if (typeof pmPostOpts[0] === "object") { el.innerHTML = `<div class="pk-h">장성 보직 선택 · ${svName} 및 합동 ${rankLabel(g, sv)} 보직</div><div class="pst-row">${pmPostOpts.map(p => `<button class="pst${p.t === pmPostSel ? " on" : ""}" data-fpost="${p.t}"><i>${p.b === br0 ? "현 병과 계속" : p.svc === "joint" ? "합동 보직" : "보직 전환"}</i><b>${postLabel(p.t)}</b><small>${hint(p.t)}</small><span>평정 중점: ${FOCUS[p.b].f}</span></button>`).join("")}</div>`; return; }
  el.innerHTML = `<div class="pk-h">보직 선택 · ${svName}${g >= 3 ? " · 공통 융합" : ""} 트랙 (${rankLabel(g, sv)})</div><div class="pst-row">${pmPostOpts.map((k, i) => `<button class="pst${k === pmPostSel ? " on" : ""}" data-post="${k}"><i>${i === 0 ? "현 병과 계속" : BR[k].svc === "joint" ? "융합 전과" : "병과 전환"}</i><b>${postLabel(BR[k].t[g])}</b><small>${hint(BR[k].t[g])}</small><span>평정 중점: ${FOCUS[k].f}</span></button>`).join("")}</div>`;
}
let pmOpts = null;
function flagHTML(g, before) { /* 장성기: KR red+wreath+mugunghwa / US Personal Colors (Army Scarlet+Gold Fringe, Navy Blue diamond/triangle, USAF Ultramarine) */
  const n = g - 5, old = Math.max(0, before - 5), W = 240, H = 160, N = 40, sw = W / N, id = `fl${faceN++}`;
  const svk = serviceOf(staff.branch);
  const starD = "M0 -22 L6.5 -6.5 L23 -6.5 L10 3.5 L14.5 20 L0 10 L-14.5 20 L-10 3.5 L-23 -6.5 L-6.5 -6.5Z";
  let fieldSVG = "", label = `${rankLabel(g, svk)} 장성기 게양`;
  if (isUS()) {
    const bg = svk === "army" ? "#c8102e" : svk === "air" ? "#00308f" : "#0a2240";
    const fringe = svk === "army" ? `<rect x="0" y="0" width="${W}" height="5" fill="#d9a82e"/><rect x="0" y="${H - 5}" width="${W}" height="5" fill="#d9a82e"/><rect x="${W - 5}" y="0" width="5" height="${H}" fill="#d9a82e"/>` : "";
    const usSpot = (i) => {
      if (n === 5) return [W / 2 + Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 5) * 34, H / 2 + Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 5) * 34];
      if (svk === "navy") {
        if (n === 1) return [W / 2, H / 2];
        if (n === 2) return [W / 2, i === 0 ? 52 : 108];
        if (n === 3) return [[W / 2, 46], [W / 2 - 48, 110], [W / 2 + 48, 110]][i];
        return [[W / 2, 38], [W / 2 - 62, H / 2], [W / 2 + 62, H / 2], [W / 2, 122]][i]; /* USN Line 4-star diamond */
      }
      const gap = W / (n + 1); return [gap * (i + 1), H / 2]; /* US Army & USAF horizontal row */
    };
    const sc = n === 5 ? 0.64 : n >= 4 && svk !== "navy" ? 0.92 : 1.08;
    const stars = Array.from({ length: n }, (_, i) => { const [sx, sy] = usSpot(i); return `<path class="${i >= old ? "nst" : ""}" style="animation-delay:${1.0 + (i - old) * 0.35}s" transform="translate(${sx} ${sy}) scale(${sc})" d="${starD}" fill="#ffffff"/>`; }).join("");
    fieldSVG = `<rect width="${W}" height="${H}" fill="${bg}"/>${fringe}${stars}`;
    label = `${(curServices()[svk] || curServices().navy).en} · ${usRankFull(g, svk)} Personal Color`;
  } else {
    const gap = W / (n + 1);
    const spot = (i) => n === 5 ? [W / 2 + Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 5) * 30, 50 + Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 5) * 30] : [gap * (i + 1), 48];
    const stars = Array.from({ length: n }, (_, i) => `<path class="${i >= old ? "nst" : ""}" style="animation-delay:${1.0 + (i - old) * 0.35}s" transform="translate(${spot(i)[0]} ${spot(i)[1]}) scale(${n === 5 ? 0.62 : 1.15})" d="${starD}" fill="#fff"/>`).join("");
    const leaf = (x, y, r) => `<path transform="translate(${x} ${y}) rotate(${r}) scale(1.35)" d="M0 0 C7 -5 7 -14 0 -21 C-7 -14 -7 -5 0 0Z M0 -2 L0 -17 M0 -8 L3 -11 M0 -8 L-3 -11 M0 -13 L2.5 -15.5 M0 -13 L-2.5 -15.5" fill="#fff" stroke="#cf1f2b" stroke-width=".9"/>`;
    const side = (s) => `<path d="M${W / 2 + s * 12} 146 Q${W / 2 + s * 44} 140 ${W / 2 + s * 50} 96" stroke="#fff" stroke-width="2.5" fill="none"/>` + [[14, 0, -50], [26, -8, -28], [36, -20, -10], [42, -34, 6], [44, -48, 18]].map(([x, y, r]) => leaf(W / 2 + s * (10 + x), 146 + y, s * r)).join("");
    const flower = `<g transform="translate(${W / 2} 134) scale(1.4)">${[0, 72, 144, 216, 288].map((r) => `<ellipse transform="rotate(${r}) translate(0 -8)" rx="6" ry="8" fill="#fff" stroke="#c8202c" stroke-width=".8"/>`).join("")}<circle r="4.5" fill="#fff" stroke="#c8202c" stroke-width="1"/>${[0, 120, 240].map((r) => `<circle transform="rotate(${r}) translate(0 -2)" r="1" fill="#c8202c"/>`).join("")}</g>`;
    fieldSVG = `<rect width="${W}" height="${H}" fill="#cf1f2b"/>${stars}${side(-1)}${side(1)}${flower}`;
  }
  let slices = "";
  for (let i = 0; i < N; i++) slices += `<g class="wv" style="--a:${(1.5 + 9 * (i / N)).toFixed(1)};animation-delay:${(-i * 0.09).toFixed(2)}s"><svg x="${i * sw}" y="-14" width="${sw + 0.6}" height="${H + 28}" viewBox="${i * sw} -14 ${sw + 0.6} ${H + 28}" overflow="hidden"><use href="#${id}"/><rect class="sh" x="${i * sw}" y="0" width="${sw + 0.6}" height="${H}" style="animation-delay:${(-i * 0.09).toFixed(2)}s"/></svg></g>`;
  return `<div class="pm-flag"><svg viewBox="-16 -16 ${W + 32} ${H + 40}" width="270" height="190"><defs><g id="${id}">${fieldSVG}</g></defs><rect x="-12" y="-14" width="5" height="${H + 34}" rx="2" fill="#c9a23a"/><circle cx="-9.5" cy="-14" r="5" fill="#e3c04f"/>${slices}</svg><div class="pm-fl">${label}</div></div>`;
}
/** 내 정보 portrait: service dress uniform, shoulder boards by rank, ribbon rack from earned medals, name tag. */
function shoulderBoard(g, flip, service = serviceOf(staff.branch)) {
  const gen = g >= 6, w = 74, h = 26, svk = serviceOf(staff.branch);
  const base = isUS() ? (svk === "army" ? "#2e3120" : svk === "air" ? "#152b52" : gen ? "#d8b247" : "#111926") : (gen ? "#d8b247" : "#15171c");
  let o = `<g transform="${flip ? `translate(${w} 0) scale(-1 1)` : ""}"><path d="M0 4 Q0 0 4 0 L${w - 10} 0 L${w} ${h / 2} L${w - 10} ${h} L4 ${h} Q0 ${h} 0 ${h - 4}Z" fill="${base}" stroke="#7a6220" stroke-width="1"/>`;
  if (gen) { o += `<circle cx="${w - 10}" cy="${h / 2}" r="3.2" fill="#f3d878" stroke="#7a6220" stroke-width=".6"/>`; const n = g - 5;
    if (n === 5) [0, 1, 2, 3, 4].forEach((i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; o += `<path d="${starPath(30 + Math.cos(a) * 7, 13 + Math.sin(a) * 7, 4.2)}" fill="#e9ecef" stroke="#7d8287" stroke-width=".4"/>`; });
    else for (let i = 0; i < n; i++) o += `<path d="${starPath(10 + i * 11 + (4 - n) * 5, h / 2, 5)}" fill="#e9ecef" stroke="#7d8287" stroke-width=".4"/>`; }
  else if (isUS()) {
    o += `<circle cx="${w - 10}" cy="${h / 2}" r="3.2" fill="#c9a23a" stroke="#7a6220" stroke-width=".6"/>`;
    if (g === 0 || g === 1) o += `<rect x="24" y="4" width="8" height="18" rx="1" fill="${g === 0 ? "#e2b546" : "#dfe4e8"}" stroke="#6b6e73" stroke-width=".6"/>`;
    else if (g === 2) o += `<rect x="19" y="4" width="7" height="18" rx="1" fill="#dfe4e8" stroke="#6b6e73" stroke-width=".6"/><rect x="30" y="4" width="7" height="18" rx="1" fill="#dfe4e8" stroke="#6b6e73" stroke-width=".6"/>`;
    else if (g === 3 || g === 4) o += `<ellipse cx="29" cy="13" rx="8" ry="6.5" fill="${g === 3 ? "#e0b341" : "#dfe4e8"}" stroke="#6b6e73" stroke-width=".6"/>`;
    else o += `<path d="M16 10 L26 12 L29 7 L32 12 L42 10 L36 16 L32 17 L29 21 L26 17 L22 16Z" fill="#e2e7ec" stroke="#6b6e73" stroke-width=".6"/>`;
  } else o += `<circle cx="${w - 10}" cy="${h / 2}" r="3.2" fill="#c9a23a" stroke="#7a6220" stroke-width=".6"/>` + krDevs(g, 30, h / 2, g <= 2 ? 1.1 : 1.05, 19);
  return o + `</g>`;
}
const serviceEmblemPath = (svc, us = isUS()) => `img/service-emblems/${us ? "us" : "kr"}-${svc}.png`;
function serviceEmblem(svc, us = isUS()) {
  const serviceName = { army: "육군", navy: "해군", air: "공군" }[svc];
  if (!serviceName) return "";
  return `<img class="service-emblem" src="${serviceEmblemPath(svc, us)}" alt="${us ? "미국" : "대한민국"} ${serviceName} 휘장">`;
}

function ceremonialBackdrop(grade, svc) {
  const us = isUS(), id = `ceremonial-${faceN++}`;
  const field = { army: "#8a2639", navy: "#1a4777", air: "#2e5998" }[svc];
  const stars = us ? Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: row % 2 ? 5 : 6 }, (_, col) =>
      `<text x="${0.69 + col * 1.30 + (row % 2 ? 0.65 : 0)}" y="${0.71 + row * 0.68}" text-anchor="middle" font-size=".67" fill="#fff">★</text>`
    ).join("")
  ).join("") : "";
  const national = us ? FLAG.us(252).replace("</svg>", stars + "</svg>") : FLAGSVG.kr(143);
  return `<g class="portrait-ceremony" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-folds"><stop stop-color="#070c19" stop-opacity=".50"/><stop offset=".18" stop-color="#fff" stop-opacity=".16"/><stop offset=".37" stop-color="#101321" stop-opacity=".27"/><stop offset=".62" stop-color="#fff2c7" stop-opacity=".19"/><stop offset=".85" stop-color="#050610" stop-opacity=".38"/><stop offset="1" stop-color="#110b16" stop-opacity=".1"/></linearGradient>
      <radialGradient id="${id}-light" cx=".5" cy=".34" r=".72"><stop stop-color="#162237" stop-opacity="0"/><stop offset=".65" stop-color="#091121" stop-opacity=".12"/><stop offset="1" stop-color="#080b12" stop-opacity=".55"/></radialGradient>
      <clipPath id="${id}-frame"><rect width="300" height="300" rx="8"/></clipPath>
    </defs>
    <g clip-path="url(#${id}-frame)">
      <rect width="300" height="300" fill="#172636"/>
      <g transform="${us ? "translate(-27 -20) rotate(84 109 84)" : "translate(10 30) rotate(-8 71 47)"}" opacity=".94">
        ${us ? "" : '<path d="M0 -9v206" stroke="#dfbb68" stroke-width="3"/><circle cy="-10" r="3" fill="#f4d68e"/>'}
        ${national}<rect width="${us ? 252 : 143}" height="${us ? 151 : 95}" fill="url(#${id}-folds)"/>
      </g>
      <g transform="translate(200 -13) rotate(9 50 122)">
        <rect width="112" height="270" fill="${field}" stroke="#debd75" stroke-width="3"/>
        <image class="portrait-banner-emblem" href="${serviceEmblemPath(svc)}" x="15" y="45" width="83" height="83" preserveAspectRatio="xMidYMid meet"/>
        <rect width="112" height="270" fill="url(#${id}-folds)"/>
      </g>
      <rect width="300" height="300" fill="url(#${id}-light)"/>
      <rect x="6" y="6" width="288" height="288" rx="6" fill="none" stroke="#ecd38c" stroke-opacity=".72" stroke-width="1"/>
    </g>
    ${grade >= 6 ? `<text class="portrait-stars" x="150" y="22" text-anchor="middle" fill="#ffdfa0" stroke="#121c2c" stroke-width="2" paint-order="stroke" font-size="12" letter-spacing="2">${"★".repeat(grade - 5)}</text>` : ""}
  </g>`;
}

function portraitHTML(g, snapshot = null) {
  const F = { ...agedFace(snapshot?.face ?? cmdr.face, g), bare: true };
  const MD = curMedals(), svk = snapshot?.service || serviceOf(staff.branch);
  const awards = snapshot?.medals ?? career.medals;
  const coatId = `portrait-coat-${faceN++}`;
  const meds = Object.keys(MD).filter((k) => awards?.[k]), per = 3, rows = [];
  for (let i = 0; i < meds.length; i += per) rows.push(meds.slice(i, i + per));
  const rack = rows.reverse().map((row, r) => row.map((k, i) => { const rb = MD[k].rb, x = 200 - (row.length * 17) / 2 + i * 17, y = 252 - r * 7; return `<g class="portrait-ribbon" data-medal="${k}" role="button" tabindex="0" aria-label="${MD[k].n} 수여 사유"><title>${MD[k].n}</title>` + rb.map((col, j) => `<rect x="${x + (j * 16) / rb.length}" y="${y}" width="${16 / rb.length + 0.2}" height="6" fill="${col}"/>`).join("") + `<rect x="${x}" y="${y}" width="16" height="6" fill="none" stroke="#333" stroke-width=".4"/></g>`; }).join("")).join("");
  const coat = isUS() ? (svk === "army" ? ["#54523b", "#313022", "#e2d6b6", "#2c281d"] : svk === "air" ? ["#1f3a68", "#0e1d38", "#dce9f7", "#0f203d"] : ["#162238", "#0a101d", "#f4f5f7", "#11141c"]) : ["#ffffff", "#d9dde2", "#f4f6f8", "#c4c9cf"];
  return `<svg class="mi-por mi-por-ceremonial" role="group" aria-label="${rankLabel(g, svk)} 정복 초상" viewBox="0 0 300 300" width="300" height="300"><defs><linearGradient id="${coatId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${coat[0]}"/><stop offset="1" stop-color="${coat[1]}"/></linearGradient></defs>`
    + ceremonialBackdrop(g, svk)
    + `<path d="M8 300 C10 248 34 216 100 200 L150 222 L200 200 C266 216 290 248 292 300Z" fill="url(#${coatId})" stroke="${coat[3]}" stroke-width="1"/>`
    + `<path d="M120 204 L150 226 L180 204 L176 196 L150 212 L124 196Z" fill="${coat[2]}" stroke="${coat[3]}"/>${isUS() ? `<path d="M145 215 L150 210 L155 215 L153 265 L150 272 L147 265Z" fill="${coat[3]}"/>` : `<path d="M150 226 L150 300" stroke="#c4c9cf" stroke-width="1.2"/>`}${[240, 262, 284].map((y) => `<circle cx="150" cy="${y}" r="3.4" fill="#d8b247" stroke="#7a6220" stroke-width=".6"/>`).join("")}`
    + `<g transform="translate(34 224) rotate(-17)">${shoulderBoard(g, false, svk)}</g><g transform="translate(266 224) rotate(17) scale(-1 1)">${shoulderBoard(g, false, svk)}</g>`
    + (isUS()
      ? `<g transform="translate(22 262) rotate(-8)"><rect width="34" height="20" rx="1.6" fill="#b22234" stroke="#d8b247" stroke-width="1.1"/>${[2.8, 6.2, 9.6, 13, 16.4].map((y) => `<rect y="${y}" width="34" height="1.7" fill="#fff"/>`).join("")}<rect width="14.5" height="11" fill="#1f3a6e"/>${[2.5, 5.5, 8.5].map((y) => [2.6, 5.8, 9, 12.2].map((x) => `<circle cx="${x}" cy="${y}" r=".65" fill="#fff"/>`).join("")).join("")}</g>`
      : `<g transform="translate(22 262) rotate(-8)">${FLAGSVG.kr(34)}</g>`)
    + rack
    + `<rect x="80" y="250" width="40" height="11" rx="1.5" fill="#1c2430"/><text x="100" y="258.5" font-size="7.5" fill="#fff" text-anchor="middle" font-family="Noto Sans KR, sans-serif">${escapeTitle(snapshot?.name ?? cmdr.name)}</text>`
    + `<g transform="translate(35 30) scale(2.3)">${face(F, 100).replace(/^<svg /, "<svg x=\"0\" y=\"0\" ")}</g>`
    + `<circle cx="255" cy="257" r="23" fill="#111a27" stroke="#e5c77c" stroke-width="1.3"/><image class="portrait-service-emblem" href="${serviceEmblemPath(svk)}" x="237" y="239" width="36" height="36"/></svg>`;
}
/** Epilogue card after a story chapter (shown over the menu). */
let storyQ = null;
function storyCard(c) {
  if ($("#promoM").style.display === "flex") { storyQ = c; return; }
  $("#promoM").innerHTML = `<div class="pm-doc"><div class="pm-pg on" data-pg="1"><div class="pm-h">경계의 파도</div><div class="pm-no">${c.n}</div><div class="pm-txt st-epi">${c.epi}</div><button id="promoOk">계속</button></div></div>`;
  pmPreview = true; $("#promoM").style.display = "flex";
}
/** 작전 지휘 (operation map): plan and run an operation on the chart; the result pays and is evaluated like a battle. */
function startOpMap(airMode = false, c72 = false) {
  initAudio(); bgm("battle"); sfx.click(); const g = myGrade(), br = normBranch(staff.branch), m = withMin(staffMods(hqGrade(), hqBranch())), pk = perkMods();
  openOpMap({ grade: g, branch: br, ops: br === "sea" || br === "arm", air: airMode, c72, scen: storyOp != null ? "intercept" : undefined, onLeave: () => { minDirect = false; dutyDirect = false; bgm("menu"); refreshMenus(); }, mods: { outK: m.outK * (pk.fleetK || 1), inK: m.inK, icptK: m.icptK * (pk.icptK || 1) }, onDone: opMapDone });
}
function launchDirect3d(domain, fromDuty = false) {
  minDirect3d = !fromDuty; dutyDirect = fromDuty;
  campSel = null; natUs = "kr"; natFoe = "nk";
  if (domain === "air") { mission = "modern"; theater = "east"; start(false); setTimeout(() => { if (G.state === "playing") { modernKey("KeyF"); toast("영공 위기 3D 개입 — 전투기 긴급 발진! I 키로 직접 조종하십시오", 5); } }, 1200); }
  else if (domain === "army") { mission = "modern:shore"; theater = "west"; start(false); toast("접경 위기 3D 합동 화력 개입 — 해안포·적 화력 진지를 제압하십시오", 5); }
  else { mission = "modern"; theater = "west"; start(false); toast("해상 위기 3D 직접 개입 — 적 수상전단을 격멸하십시오", 5); }
}
let storyOp = null;
function opMapDone(r) {
  if (minDirect) { minDirect = false; minOpResult(r.won, "FM 작전 지휘"); if (r.won) { career.marshalWins = (career.marshalWins || 0) + 1; saveCareer(); } setTimeout(() => toast(`합동 워룸 — FM 작전 지휘 ${r.won ? "대승" : "패배"} 반영`, 3), 400); }
  if (dutyDirect) { dutyDirect = false; const dr = resolveCrisisDirect(r.won, myGrade(), "FM 작전 지휘"); if (dr) { profile.xp += dr.xpGain; saveProfile(); if (r.won) { career.marshalWins = (career.marshalWins || 0) + 1; saveCareer(); } } }
  if (storyOp != null) { const i = storyOp, c = KCAMP[i]; storyOp = null; const stars = r.won ? r.stars || 1 : 0; if (r.won) { kStars[i] = Math.max(kStars[i] || 0, stars); kFail[i] = false; } else kFail[i] = true; if (i === kProg) kProg = Math.min(K_LAST, i + 1); saveK(); if (r.won && c.epi) setTimeout(() => storyCard(c), 600); }
  bgm("menu"); const before = myGrade(), a = { kind: "result", won: r.won, shots: r.shots, hits: r.hits, seconds: r.secs, tier: econTier(), bombs: 0, bullets: 0, mission: "modern", ...ngFlags() };
  const rw = econReward(a); act(a);
  const ev = scoreBattle({ won: r.won, hp: r.hp, sunk: r.sunk, foes: r.foes, lost: r.lost, allies: r.allies, secs: r.secs, jetsOut: r.jetsOut }, normBranch(staff.branch));
  if (r.press) ev.s = Math.max(0, Math.min(100, ev.s + r.press)); /* 작전 후 기자회견 */
  recordEval(before, ev.s); const bd = board(before, xpGrade()), after = myGrade();
  const blocked = bd.xp && !bd.promoted ? ` · 진급 심사 보류 (${[!bd.cnt ? `근무 ${bd.e.n}/${bd.need}회` : "", !bd.score ? `평정 ${bd.e.avg}점` : ""].filter(Boolean).join(", ")})` : "";
  toast(`작전 ${r.won ? "성공" : "실패"} — +${fmt(rw.money)} CR · +${fmt(rw.xp)} XP · 근무평정 ${ev.s}점${blocked}`, 6);
  pmMedals = awardMedals({ won: r.won, modern: true, wins: profile.wins, sunk: r.sunk, hp: r.hp, lowHp: r.hp <= 0.5, grade: after });
  if (after > before) { if (career.seen == null && staff.branch) careerInit(before, careerTitle(before), BRANCHES[staff.branch].n); career.picks += after - before; logPromotion({ g: after, t: postOf(after), b: BRANCHES[staff.branch]?.n || "", why: r.why }); pmOpts = null; buildPromo(before, after); $("#promoM").style.display = "flex"; fanfare(after, staff.branch); }
  refreshMenus();
}
/** 국방부장관: a 대장 (or 원수) with an excellent record can be nominated; on appointment the title becomes 국방부장관. */
const ministerOk = (g) => { const e = evalOf(g); return profile.admin || (e.n >= 3 && e.avg >= 70); };
function ministerHTML(rl) {
  if (rl.r < 9) return ""; if (!isUS() && isPotus()) return `<div class="mi-min on"><b>${potusOn() ? "대통령 재임 중" : "대통령 퇴임"}</b><small>${potusTitle()}</small></div>`;
  const mTitle = isUS() ? "미 국방장관 (SecDef)" : "국방부장관";
  if (career.minister) return civil() ? `<div class="mi-min on"><b>${mTitle} 임기 종료 · 민간인</b><small>예비역 ${rl.name} · ${isUS() ? "미 대선 챕터 추후 업데이트 예정" : "다음 장: 대통령 출마 가능"}</small></div>` : `<div class="mi-min on"><b>${mTitle} 재임 중</b><small>예비역 ${rl.name} · 대통령 임명 · 사령부 탭 → ${isUS() ? "펜타곤 집무실" : "국방부 집무실"}</small></div>`;
  const e = evalOf(rl.r), ok = ministerOk(rl.r);
  return `<div class="mi-min"><b>${mTitle} 임명 제청</b><small>${isUS() ? "대장(O-10)" : "대장"} 이상 · 이 계급 근무 ${e.n}/3회 · 평정 평균 ${e.avg}점 (70점·A 이상 필요)${profile.admin ? " · 관리자" : ""}</small><button data-act="minister"${ok ? "" : " disabled"}>${ok ? "제청 수락 — 전역 후 장관 임명" : "조건 미충족"}</button></div>`;
}
function ministerOrder() {
  saveFinalUniform(myGrade(), postOf(myGrade()));
  career.minister = true; saveCareer(); logPromotion({ g: myGrade(), t: "국방부장관", b: "", why: "국방부장관 임명" }); minStart(cmdr.name);
  const dt = new Date(), mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][dt.getMonth()];
  $("#promoM").innerHTML = isUS()
    ? `<div class="pm-doc"><div class="pm-pg on" data-pg="1"><div class="pm-h">THE WHITE HOUSE · WASHINGTON</div><div class="pm-no">COMMISSION OF APPOINTMENT</div><div class="pm-rank">Secretary of Defense</div><div class="pm-name">${cmdr.name}</div><div class="pm-txt">By and with the advice and consent of the Senate, hereby appointed Secretary of Defense of the United States<br><b>Retired ${usRankFull(myGrade(), serviceOf(staff.branch))} (${US_PAY[myGrade()]})</b></div><div class="pm-sign"><div class="pm-date">${dt.getDate()} ${mon} ${dt.getFullYear()}</div><div class="pm-sg"><span>President of the United States</span><svg viewBox="0 0 160 54" width="160" height="54"><path d="M12 36 C22 10 34 14 28 32 C26 42 40 20 52 24 C60 28 62 36 74 28 C84 20 96 14 104 26 C112 36 124 20 146 22 M36 44 C72 40 112 40 148 36" stroke="#182a4a" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg><i style="border-color:#1c3d6e;color:#1c3d6e;border-radius:50%;padding:4px 6px;font-size:8px">POTUS<br>SEAL</i></div></div><button id="promoOk">I So Swear</button></div></div>`
    : `<div class="pm-doc"><div class="pm-pg on" data-pg="1"><div class="pm-h">대한민국 정부</div><div class="pm-no">임명장</div><div class="pm-rank">국방부장관</div><div class="pm-name">${cmdr.name}</div><div class="pm-txt">위 사람을 국방부장관에 임명함<br><b>예비역 ${ECON_RANKS[myGrade()]}</b></div><div class="pm-sign"><div class="pm-date">${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일</div><div class="pm-sg"><span>대통령</span><svg viewBox="0 0 150 54" width="150" height="54"><path d="M10 34 C22 12 34 14 30 32 C26 46 40 38 50 22 C58 12 62 30 70 28 C80 24 84 14 92 22 C100 30 110 26 122 16 M56 44 C84 40 112 40 140 36" stroke="#1d2340" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg><i>大統領印</i></div></div><button id="promoOk">명 받았습니다</button></div></div>`;
  pmPreview = true; $("#promoM").style.display = "flex"; initAudio(); playMinisterAnthem(); refreshMenus();
}
/** 내 정보: current posting, this rank's evaluations and the promotion board checklist. */
function evalHTML(rl) {
  const g = rl.r, br = normBranch(staff.branch), BR = curBranches(), e = evalOf(g), b = board(g, xpGrade()), L = (career.evals?.[g] || []).slice(-6);
  const ck = (ok, t) => `<li class="${ok ? "ok" : "no"}">${ok ? "✓" : "✗"} ${t}</li>`;
  return `<h3>근무평정 · 진급 심사</h3><div class="mi-ev"><div class="ev-top"><div><span>현 보직</span><b>${postLabel(postOf(g))}</b><small>${(BR[br] || FOCUS[br]).n} 병과 · 평정 중점 ${FOCUS[br].f}</small></div><div class="ev-g ${e.l}"><b>${e.l}</b><small>${e.n ? `평균 ${e.avg}점` : "평정 없음"}</small></div></div>`
    + `<div class="ev-l">${L.length ? L.map((s) => `<i style="height:${Math.max(6, s)}%" title="${s}점"></i>`).join("") : "<em>이 계급에서 아직 출격 기록이 없습니다</em>"}</div>`
    + (rl.next ? `<ul class="ev-ck">${ck(b.xp, `경험치 ${rl.next} 기준 도달`)}${ck(b.wk, `현 계급 복무 ${serviceDuration(rankMonths(rl.r, b.weeks))} / ${serviceDuration(rankMonths(rl.r, b.needWk))}`)}${ck(b.cnt, `이 계급 근무 ${e.n}/${b.need}회`)}${automaticCaptain(g) ? "" : ck(b.score, `평정 평균 ${PASS}점 이상 (B)`)}</ul>${deferNote() ? `<div class="ev-warn">${deferNote()}</div>` : ""}` : `<div class="ev-max">최고 계급</div>`) + `</div>`;
}
function saveFinalUniform(grade, title, date = careerDate(dutyState().week)) {
  if (career.finalUniform) return;
  career.finalUniform = { grade, title, date, service: serviceOf(staff.branch), face: cmdr.face, name: cmdr.name, medals: {...career.medals} };
  saveCareer();
}

function renderCareerTimeline(record, duty, us, service) {
  const medals = us ? US_MEDALS : MEDALS;
  const points = n => n > 0 ? `+${n}` : `−${Math.abs(n)}`;
  const entries = dutyHistory(duty).map(event => ({
    turn:event.turn, date:event.date, title:event.title, kind:"직무",
    details:[`선택 · ${event.choice}`,event.outcome,
      event.score != null && `근무평정 ${event.score}점${event.carriedPoints != null ? ` · 이전 안건 ${points(event.carriedPoints)}점 반영` : ""}`,
      event.nextTitle && `후속 안건 「${event.nextTitle}」 · 평정 ${points(event.nextPoints)}점${event.followupCompleted ? " 반영" : " 예정"}`].filter(Boolean),
  }));
  for (const item of record.log ?? []) {
    const rank = us ? usRankName(item.g, service) : ECON_RANKS[item.g];
    entries.push({turn:item.turn, date:item.serviceDate ?? item.d, kind:"인사",
      title:`${rank || ""} · ${postLabel(item.t, us)}`, details:[item.why]});
  }
  for (const receipt of record.boardHistory ?? []) {
    entries.push({turn:receipt.week, date:receipt.date, kind:"진급심사", title:receipt.reason,
      details:[receipt.automatic ? "복무기간·경험치·평정 횟수 충족" : `${receipt.score}점${receipt.cutoff != null ? ` / 기준 ${receipt.cutoff}점` : ""}`,
        !receipt.automatic && receipt.contribution && `주요 기여 · ${receipt.contribution[0]} ${receipt.contribution[1]}점`,
        !receipt.automatic && receipt.penalty > 0 && `감점 ${receipt.penalty}점`,
        receipt.previousPost && `심사 당시 보직 · ${postLabel(receipt.previousPost, us)}`].filter(Boolean)});
  }
  for (const wait of record.boardWaits ?? []) {
    entries.push({turn:wait.week, date:wait.date, kind:"진급심사", title:"상위 보직 공석 대기",
      details:["공석이 생기면 상정 가능 · 심사 누락 횟수 미산입"]});
  }
  for (const [key, date] of Object.entries(record.medals ?? {})) {
    if (!medals[key]) continue;
    const award = record.medalHistory?.[key];
    entries.push({turn:award?.turn, date:award?.date ?? date, kind:"수여", title:medals[key].n,
      details:[medals[key].d, award?.source && `관련 기록 · ${award.source}`].filter(Boolean)});
  }
  for (const event of record.serviceHistory ?? []) {
    entries.push({turn:event.turn, date:event.date, kind:"복무", title:event.title, details:[event.message]});
  }
  if (record.discharged) {
    const dc = record.discharged;
    entries.push({turn:dc.turn, date:dc.date ?? dc.at, kind:"전역", title:postLabel(dc.title, us),
      details:[dc.reason ?? (dc.voluntary ? "본인 신청 전역" : "복무 종료")]});
  }
  if (!entries.length) return '<p>아직 복무 연표가 없습니다.</p>';
  return `<div class="career-timeline">${entries.sort((a,b) => (a.turn ?? 0) - (b.turn ?? 0)).reverse().map(entry =>
    `<details><summary><small>${escapeTitle(entry.date || "기존 기록")} · ${entry.kind}</small><b>${escapeTitle(entry.title)}</b></summary>
      ${entry.details.filter(Boolean).map(text => `<p>${escapeTitle(text)}</p>`).join("")}</details>`).join("")}</div>`;
}

function showMedal(key) {
  const medal = curMedals()[key];
  if (!medal || !career.medals?.[key] || $(".bd-modal[open]")) return;
  const award = career.medalHistory?.[key];
  const dialog = document.createElement("dialog");
  dialog.className = "bd-modal";
  dialog.innerHTML = `<h2>${escapeTitle(medal.n)}</h2><p>${escapeTitle(medal.d)}</p>
    <p>${escapeTitle(award?.date ?? career.medals[key])}${award?.source ? ` · ${escapeTitle(award.source)}` : ""}</p><button autofocus>닫기</button>`;
  dialog.onclose = () => dialog.remove();
  dialog.querySelector("button").onclick = () => dialog.close();
  document.body.append(dialog);
  dialog.showModal();
}

let recTab = "log";
function renderRecord() { /* 인사기록: 좌측 고정 프로필 + 우측 4개 서브탭 (약력 / 계급 로드맵 / 훈장 / 엔딩 도감) */
  const rl = rankLine(), acc = profile.shots ? ((profile.hits / profile.shots) * 100).toFixed(1) : "0.0", best = profile.bestSeconds ? `${Math.floor(profile.bestSeconds / 60)}분 ${profile.bestSeconds % 60}초` : "—";
  const br = normBranch(staff.branch), svk = serviceOf(br), BR = curBranches(), SV = curServices();
  if (staff.branch) careerInit(rl.r, postOf(rl.r), (BR[br] || BRANCHES.sea).n);
  if (career.discharged && !career.finalUniform) {
    const { g, title, date } = career.discharged;
    saveFinalUniform(g, title || postOf(g), date);
  }
  if (career.minister && !career.finalUniform) {
    const lastPost = career.log.findLast(entry => !/국방부장관|국방장관/.test(entry.t));
    saveFinalUniform(lastPost?.g ?? rl.r, lastPost?.t ?? careerTitle(rl.r), lastPost?.serviceDate);
  }
  const ps = payStep(profile.xp, rl.r, ECON_RANK_XP), lo = ECON_RANK_XP[rl.r], hi = ECON_RANK_XP[rl.r + 1], stepPct = ps.max ? (((profile.xp - lo) / (hi - lo)) * ps.max % 1) * 100 : ((profile.xp - lo) % 3000) / 30;
  const tierCls = (g) => (g >= 6 ? "gen" : g >= 3 ? "fld" : "co");
  const log = career.log.slice().reverse().map((e) => `<div class="cr ${tierCls(e.g)}"><span class="d">${e.d}</span><span class="ins">${insignia(e.g, 16)}</span><div><b>${rankLabel(e.g, svk)} ${e.why === "임관" ? "임관" : e.why === "보직 변경" ? "보직 변경" : e.why === "기존 경력 승계" ? "(경력 승계)" : "진급"}</b> · ${postLabel(e.t)}${e.b ? ` <small>(${postLabel(e.b)})</small>` : ""}${e.why && !["임관", "보직 변경", "기존 경력 승계"].includes(e.why) ? `<div class="sub">공적: ${e.why}</div>` : ""}</div></div>`).join("") || `<div class="none">임관 후 복무를 시작하면 약력이 기록됩니다</div>`;
  staffFor(rl.r); const of = (k) => officer(staff.a[k]);
  const echUnit = isUS()
    ? (US_SVC_ORG[svk] || US_SVC_ORG.navy).ech[echOf(rl.r)]
    : ({ army: ["대대·중대 부서", "연대·여단 참모부", "사단·군단 참모부", "지상작전사령부"], navy: ["함정 부서", "함정·전대 참모부", "전투단·기동부대 참모부", "해군작전사령부"], air: ["비행대대 부서", "전대 참모부", "비행단 참모부", "공군작전사령부"] }[svk] || ECH.map((x) => x.u))[echOf(rl.r)];
  const mTitle = isUS() ? "미 국방장관 (SecDef)" : "국방부장관";
  const dd = dutyState(), usOffice = currentUsOffice();
  const officeDetails = usOffice?.term
    ? (usOffice.former ? `대통령 임기 종료 · 총 ${usOffice.term}기` : `제${usOffice.term}기 · ${usOffice.quarter}분기 · 지지율 ${usOffice.trust}%`)
    : "취임 선서 대기";
  const cmdScale = (r) => (r <= 1 ? (isUS() ? "Platoon / Division" : "소대·부서 실무") : r === 2 ? (isUS() ? "Company / Flight" : "중대·편대 지휘") : r <= 4 ? (isUS() ? "Battalion / Ship" : "대대·함정·비행대대") : r === 5 ? (isUS() ? "Brigade / Wing" : "연대·전대·비행단") : r <= 7 ? (isUS() ? "Division / Strike Group" : "여단·사단·함대") : r === 8 ? (isUS() ? "Corps / Fleet" : "군단·작전사령부") : r === 9 ? (isUS() ? "Service Chief / JCS" : "참모총장·합참") : (isUS() ? "Supreme Command" : "최고 통수 지휘"));
  const ladderRows = ECON_RANKS.map((_, r) => `<div class="${r === rl.r ? "cur" : r < rl.r ? "done" : ""}"><span>${insignia(r, 22)}</span><b class="bh">${isUS() ? `${US_PAY[r]} · ` : ""}${rankLabel(r, svk)}</b><span>${postLabel(postOf(r))}</span><span class="xp">${fmt(ECON_RANK_XP[r])} XP</span><span>${cmdScale(r)}</span></div>`).join("");
  const medalsHTML = trophyShelfHTML(rl.r, career, isUS(), isPotus() || !!usOffice?.term)
    + `<h3>훈장 · 표창</h3><div class="mi-md">${Object.entries(curMedals()).map(([k, M]) => `<div class="md${career.medals?.[k] ? "" : " no"}" title="${M.d}"><i>${M.rb.map((col) => `<b style="background:${col}"></b>`).join("")}</i><span>${M.n}</span><small>${career.medals?.[k] ? career.medals[k] : M.d}</small></div>`).join("")}</div>`;
  const chronCtx = () => {
    const g0 = career.discharged?.g ?? myGrade(), br0 = normBranch(staff.branch), sv0 = serviceOf(br0), SV0 = curServices(), BR0 = curBranches();
    const chap = usOffice?.title ?? (career.discharged ? "예비역 전역" : potusOn() ? "대통령 재임" : career.minister ? (isUS() ? "SecDef" : "국방부장관") : "현역 복무");
    return {
      cmdrName: cmdr.name, grade: g0, rankName: rankLabel(g0, sv0), post: postLabel(career.discharged?.title || postOf(g0)),
      svcName: (SV0[sv0] || SV0.navy).n, branchName: postLabel((BR0[br0] || BR0.sea).n),
      week: dd.week || 1, medalsCount: Object.keys(career.medals || {}).length,
      log: career.log || [], rivals: dd.rivals || [], rankLabelFn: (r) => rankLabel(r, sv0), chapterLabel: chap,
    };
  };
  const rBody = recTab === "ladder"
    ? `<h3>${(SV[svk] || SV.navy).n} 계급 로드맵 — 누적 ${fmt(profile.xp)} XP</h3><div class="ladder">${ladderRows}</div>`
    : recTab === "timeline" ? `<h3>복무 연표</h3>${renderCareerTimeline(career, dd, isUS(), svk)}`
    : recTab === "medals" ? medalsHTML
    : recTab === "endings" ? endingsHTML()
    : recTab === "chron" ? chronicleHTML(chronCtx())
    : (usOffice ? `<h3>미국 대통령 기록</h3><p>${officeDetails}</p>` : "") + `<h3>장교 복무 요약</h3><div class="rstats"><div><span>누적 복무</span><b>${careerDate(dd.week)}</b></div><div><span>군내 평판</span><b>${dd.rep ?? 55}</b></div><div><span>부대 사기</span><b>${dd.morale ?? 72}</b></div><div><span>전술전 승률</span><b>${profile.battles ? Math.round((profile.wins / profile.battles) * 100) : 0}%</b></div><div><span>보유 훈장</span><b>${Object.keys(career.medals || {}).length}/10</b></div></div>`
      + `<h3>${(SV[svk] || SV.navy).n} 장교 인사기록 · 약력</h3><div class="mi-log">${log}</div>`
      + `<h3>내 참모진 · ${echUnit}</h3><div class="mi-st">${STAFF_ROLES.map((r) => `<span>${roleTitle(r.k, rl.r)}</span><b>${of(r.k).rk} ${of(r.k).nm}</b>`).join("")}</div>`;
  const recTabsHTML = `<div class="rec-tabs">${[["log", "📋 요약 · 약력"], ["timeline", "복무 연표"], ["ladder", "🎖 계급 로드맵"], ["medals", "🏅 훈장 · 표창"], ["endings", "🏆 엔딩 도감"], ["chron", "📜 회고록"]].map(([k, lbl]) => `<button class="rec-tab${recTab === k ? " on" : ""}" data-rectab="${k}">${lbl}</button>`).join("")}</div>`;
  let h = `<div class="mi"><div class="mi-l">`
    + `<div class="mi-por-w">${(usOffice || civil()) ? `<div class="mi-por civp">${face({ ...agedFace(cmdr.face, myGrade()), civ: true, bg: (usOffice?.mark || isPotus()) ? "#1d3b6e" : "#2b3446" }, 280)}${usOffice?.mark ? `<img src="${usOffice.mark}" alt="미국 대통령 휘장" class="pmark-b">` : isPotus() ? `<img src="img/potus_mark.png" alt="" class="pmark-b">` : ""}</div>` : portraitHTML(career.finalUniform?.grade ?? rl.r, career.finalUniform)}</div><p class="uniform-caption">${usOffice?.title ?? (career.finalUniform ? `${rankLabel(career.finalUniform.grade)} · ${postLabel(career.finalUniform.title)} · ${career.finalUniform.date}` : `${rankLabel(rl.r)} · ${postLabel(postOf(rl.r))} · ${careerDate(dd.week)}`)}</p><div class="mi-card"><div><div class="mi-rk">${badge(rl.r, 22, usOffice)}<b>${usOffice?.title ?? (civil() ? (!isUS() && potusOn() ? "대한민국 대통령" : !isUS() && isPotus() ? "전 대통령" : "민간인") : career.minister ? `예비역 ${rl.name}` : isUS() ? `${rl.name} · ${US_PAY[rl.r]}` : `${rl.name} ${ps.step}호봉`)}</b></div><div class="mi-nm">${cmdr.name}</div><div class="mi-t">${usOffice ? officeDetails : career.minister ? (!isUS() && potusOn() ? `국군통수권자 · ${potusTitle().replace("대통령 · ", "")} · 전 국방부장관` : !isUS() && isPotus() ? `${potusTitle()} · 예비역 ${rl.name}` : civil() ? `전 ${mTitle} · 예비역 ${rl.name}` : mTitle) : `${postLabel(postOf(rl.r))}${staff.branch ? ` · ${(BR[br] || BRANCHES.sea).n} 보직` : ""}`}</div></div></div>`
    + (usOffice ? "" : career.minister ? `<p class="mi-note">${!isUS() && potusOn() ? "소위 임관에서 대통령까지 — 집무실 탭에서 국정을 운영합니다" : !isUS() && isPotus() ? "대통령 임기를 마쳤습니다" : civil() ? `${mTitle} 임기를 마치고 민간인이 되었습니다` : `전역 후 ${mTitle}으로 임명되어 호봉·진급이 없습니다`}</p>` : `<div class="mi-bar"><span>다음 호봉</span><div class="hbar"><i style="width:${Math.max(2, stepPct).toFixed(0)}%"></i></div></div><div class="mi-bar"><span>${rl.next ? `${rl.next} 진급` : "최고 계급"}</span><div class="hbar"><i style="width:${(rl.pct * 100).toFixed(0)}%;background:var(--gold)"></i></div><small>${rl.next ? `${fmt(rl.need - profile.xp)} XP 남음` : ""}</small></div>`)
    + ((usOffice || civil()) && career.finalUniform ? `<details class="final-uniform"><summary>마지막 정복 초상 · ${postLabel(career.finalUniform.title)}</summary>${portraitHTML(career.finalUniform.grade, career.finalUniform)}</details>` : "")
    + (usOffice ? "" : (career.minister ? "" : evalHTML(rl)) + ministerHTML(rl))
    + (profile.admin ? `<div class="mi-adm">관리자 · 실제 계급 변경 <select id="setRank">${ECON_RANKS.map((_, i) => `<option value="${i}"${i === rl.r ? " selected" : ""}>${isUS() ? `${US_PAY[i]} · ` : ""}${rankLabel(i, svk)}</option>`).join("")}</select><button data-act="setrank">변경</button><small>경험치가 그 계급 기준으로 바뀌어 해금·직함·사령부·견장이 모두 실제로 바뀝니다.</small></div><div class="mi-adm">관리자 모드 · 진급 연출 미리보기 <select id="pvRank">${ECON_RANKS.slice(1).map((_, i) => `<option value="${i + 1}"${i + 1 === 6 ? " selected" : ""}>${isUS() ? `${US_PAY[i + 1]} · ` : ""}${rankLabel(i + 1, svk)}</option>`).join("")}</select><button data-act="pvpromo">보기</button><small>실제 계급·경험치는 바뀌지 않습니다</small></div>` : `<div class="hq-adm in"><input id="miAdmin" type="password" maxlength="32" placeholder="관리자 코드" autocomplete="off"><button data-act="miadmin">적용</button></div>`)
    + `</div><div class="mi-r">${recTabsHTML}${rBody}</div></div>`;
  $("#recordP").innerHTML = h;
}
function setTab(t) { for (const [id, k] of [["#tabPort", "menu"], ["#yardBtn", "yard"], ["#tabRecord", "record"], ["#tabHQ", "hq"], ["#tabOrg", "org"]]) $(id)?.classList.toggle("on", k === t); }
// ── fleet headquarters (modern staff) ───────────────────────────────────────
let hqRole = "ops";
const pctTxt = (k, inv) => { const v = Math.round((k - 1) * 100) * (inv ? -1 : 1); return `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v)}%`; };
function hqSummary(m) {
  const t = [["화력", pctTxt(m.outK), m.outK >= 1], ["받는 피해", pctTxt(m.inK).replace("+", "+"), m.inK <= 1], ["재장전", pctTxt(m.reloadK), m.reloadK <= 1], ["수리반", `${m.repairN}회`, m.repairN >= 3], ["전투기", m.jets ? `${m.jets > 0 ? "+" : "−"}${Math.abs(m.jets)}기` : "±0", m.jets >= 0]];
  return t.map(([k, v, ok]) => `<div class="hq-st"><span>${k}</span><b class="${ok ? "ok" : "bad"}">${v}</b></div>`).join("");
}
const SKINS = [["#f6d7c6", "#d9a48c", "#a46c58"], ["#efc4a8", "#c98f72", "#8f5a43"], ["#fbe3d4", "#e0b29e", "#a97a66"], ["#ecc59c", "#c18c5e", "#865733"], ["#d7a676", "#a5704a", "#6b4429"]];
const HAIRS = ["#211a16", "#4a3626", "#6e5038", "#a8865a", "#8e8a84", "#d8d6d0"];
const FACE_BG = ["#2b3446", "#2f3a33", "#3a3430", "#34303c", "#2c3a3e", "#3b3326"];
/** 내 지휘관 초상 데이터 (명예의 전당 저장용) */
globalThis.__myFace = () => { try { return agedFace(cmdr.face, myGrade()); } catch { return null; } };
globalThis.__faceOf = (f, s = 96, seed = "") => (f && typeof f === "object" ? face({ ...f, n: f.n || seed, civ: true }, s) : globalThis.__face(seed || "장관", s, { age: 3 }));
/** 가상 인물 초상 (모듈에서 사용): seed 문자열로 얼굴을 고정 */
globalThis.__face = (seed, s = 48, { fem = false, glass = null, age = null } = {}) => { const n = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7), ag = age ?? 1 + (n % 3);
  return face({ n: String(seed), skin: SKINS[n % 5], hair: HAIRS[ag >= 3 ? 4 + (n % 2) : n % 3], brow: HAIRS[ag >= 3 ? 4 : n % 3], age: ag, must: !fem && n % 7 === 0 ? "trim" : null, glass: glass ?? n % 3 === 0, fem, jaw: 0.94 + (n % 5) * 0.04, eye: 0.72, zoom: true, bg: FACE_BG[n % FACE_BG.length] }, s); };
function staffFace(o, s) { const [sk, h, age, must, glass, jaw, fem, beard] = o.f, n = [...o.id].reduce((a, c) => a + c.charCodeAt(0), 0); return face({ n: o.nm, skin: SKINS[sk], hair: HAIRS[h], brow: HAIRS[Math.min(h, 4)], age, must, glass, fem: !!fem, jaw, beard, eye: o.nat === "kr" ? 0.72 : 1, zoom: true, bg: FACE_BG[n % FACE_BG.length] }, s); }
/* support arms on the chart: marines run the boarding raids, the air force flies the C-130H strikes (titles 소위 → 소장) */
const JOINT = {
  mar: ["해병 소대장", "해병 선임소대장", "해병 중대장", "상륙대대 작전과장", "상륙대대장", "상륙연대장", "해병 상륙여단장", "해병사단장"],
  atl: ["수송기 부조종사", "수송기 정조종사", "수송기 기장", "공중기동대대 작전과장", "공중기동대대장", "공중기동전대장", "공중기동비행단장", "공중기동사령관"],
};
const HQ_DEPT = { cos: "참모장", ops: "작전처", int: "정보처", log: "군수처", air: "항공처" };
const hqAdm = () => !!profile.admin && staff.adminPost; /* admin: view the HQ from any post */
const hqGrade = () => hqAdm() ? staff.adminPost.g : myGrade();
const hqBranch = () => (hqAdm() && BRANCHES[staff.adminPost.b] ? staff.adminPost.b : staff.branch);
function hqNode(r, o, me, fixed) {
  const sk = o && !fixed ? skillOf(o) : 0, g = hqGrade(), lock = !me && !fixed && !profile.admin && !canFill(r.k, g);
  const who = me ? `${rankLabel(g)} ${cmdr.name}` : `${o.rk} ${o.nm}`, sub = me ? `<small>${postLabel(careerTitle(g, hqBranch()))} (나)</small>` : fixed ? "<small>상부 임명</small>" : `<div class="hq-skr"><div class="hq-sk"><i style="width:${sk * 10}%"></i></div><small>${sk}</small></div><em>${TRAITS[o.tr].n}</em>`;
  return `<button class="hq-node${!me && !fixed && r.k === hqRole ? " on" : ""}${me ? " me" : ""}${fixed ? " fx" : ""}${lock ? " lk" : ""}" ${me || fixed ? "" : `data-role="${r.k}"`}><div class="hq-f">${me ? face(agedFace(cmdr.face, g), 44) : staffFace(o, 44)}</div><div class="hq-i"><div class="hq-nm">${me || o.ri >= 0 ? insignia(me ? g : o.ri, 13) : `<i class="nco">${o.rk}</i>`}<b>${who}</b></div>${sub}</div></button>`;
}
function hqEff(k, m) { /* what each department contributes, shown in the grey boxes under it */
  const p = (v, inv) => pctTxt(v, inv);
  return { cos: [`참모 효과 증폭`], ops: [`화력 ${p(m.outK)}`, `적 요격 ${p(m.penK)}`], int: [`요격 성공 ${p(m.icptK)}`, `받는 피해 ${p(m.inK)}`], log: [`재장전 ${p(m.reloadK)}`, `수리반 ${m.repairN}회`], air: [`전투기 ${m.jets ? `${m.jets > 0 ? "+" : "−"}${Math.abs(m.jets)}기` : "±0"}`] }[k];
}
globalThis.__careerProfileHTML = () => {
  const g = myGrade(), br = normBranch(staff.branch), BR = curBranches(), SV = curServices(), B = BR[br], svk = serviceOf(br), sv = SV[svk] || SV.navy, rl = rankLine(), ev = evalOf(g);
  const ps = payStep(profile.xp, g, ECON_RANK_XP), nextG = Math.min(10, g + 1);
  return `<div class="mn-card dm-prof"><div class="dm-prof-top">${face(myFace(), 56)}<div><b>${cmdr.name}</b><small>${serviceEmblem(svk)} ${sv.n} · ${postLabel(B.n)}</small><small>${postLabel(postOf(g))}</small></div></div>
    <div class="dm-rkrow"><span>${insignia(g, 20)} <b>${rankLabel(g, svk)}</b> ${isUS() ? US_PAY[g] : `${ps.step}호봉`}</span>${g < 10 ? `<span>› ${insignia(nextG, 18)} ${rankLabel(nextG, svk)}</span>` : `<span>★ 최고 계급</span>`}</div>
    <small style="color:#9ec2d4;font-size:11px">근무평정 <b>${ev.n ? `${ev.avg}점 (${ev.l})` : "평가 전"}</b> · ${rl.next ? `${rl.next}까지 ${fmt(Math.max(0, rl.need - profile.xp))} XP` : "최고 계급 도달"}</small>
    <small style="color:#7de2d1;font-size:10.5px">병과 특화: ${B.bonus}</small></div>`;
};
globalThis.__careerTrackHTML = () => {
  const g = myGrade(), br = normBranch(staff.branch), BR = curBranches(), SV = curServices(), B = BR[br], svk = serviceOf(br), sv = SV[svk] || SV.navy;
  const steps = B.t.map((t, i) => `<div class="rk-step${i < g ? " done" : i === g ? " cur" : ""}">${insignia(i, 24)}<b>${isUS() ? `${US_PAY[i]} · ` : ""}${rankLabel(i, svk)}</b><small>${postLabel(t)}</small></div>`).join("");
  const joint = g >= 3 && B.svc !== "joint" ? `<div class="mn-card"><div class="mn-h">🛠️ ${isUS() ? "펜타곤 합동 트랙 전과 가능 (O-4 이상)" : "공통 융합 트랙 전과 가능 (영관급 이상)"}</div><div class="dm-docs">${["acq", "pol"].map((k) => `<button class="mn-doc" data-branch="${k}"><b>${postLabel(BR[k].n)}으로 전과</b><small>${BR[k].d}</small><span class="g">${BR[k].bonus}</span></button>`).join("")}</div></div>` : "";
  return `<div class="mn-h">🎖️ ${sv.icon} ${sv.n} · ${postLabel(B.n)} 계급 성장 로드맵 <small>${isUS() ? "O-1 Gold Bar → O-6 Eagle → O-10 4★ → O-11 5★ 원수" : "계급 상승에 따라 계급장·보직·초상 노화가 변화합니다"}</small></div><div class="rk-ladder">${steps}</div>${joint}`;
};
function renderBranchPick() {
  const svk = svcDraft || staff.service || "navy", SV = curServices(), BR = curBranches();
  const svcs = Object.entries(SV).map(([k, S]) => `<button class="svc-card${k === svk ? " on" : ""}" data-svc="${k}"><div class="sv-h"><span>${serviceEmblem(k)} ${S.n}</span><small>${S.en}</small></div><div style="display:flex;gap:10px;align-items:center">${face({ ...agedFace(cmdr.face, 0), svc: k }, 52)}<div><div class="sv-m">${S.motto}</div><p>${S.d}</p></div></div></button>`).join("");
  const brs = Object.entries(BR).filter(([, B]) => B.svc === svk);
  const cards = brs.map(([k, B]) => `<div class="hq-br"><h4>${SV[svk].icon} ${postLabel(B.n)}</h4><p>${B.d}</p><div class="hq-bb">특화 버프 · ${B.bonus}</div><ol>${B.t.map((t, i) => `<li${i >= 8 ? ' class="sh"' : ""}><span>${insignia(i, 13)}${rankLabel(i, svk)}</span>${postLabel(t)}</li>`).join("")}</ol><button data-branch="${k}">${SV[svk].n} ${postLabel(B.n)} 임관</button></div>`).join("");
  $("#hqP").innerHTML = `<div class="hq-head"><div><h3>STEP 1 · ${isUS() ? "🇺🇸 미합중국 3군 (Army · Navy · Air Force) 군종 및 병과 선택" : "🇰🇷 3군(육·해·공) 군종 및 병과 선택"}</h3><p>${isUS() ? "O-1 소위로 임관했습니다. 미 육·해·공군 군종을 선택하면 미군 정복·계급장(바→오크리프→독수리→별)과 펜타곤 지휘계통이 적용됩니다." : "소위로 임관했습니다. 군종(육군·해군·공군)을 고르면 해당 군종 정복과 병과 트랙이 적용됩니다. 진급 시에도 소속 군종 보직(영관급부터 공통 융합 트랙 포함)만 선택할 수 있습니다."}</p></div></div><div class="svc-grid">${svcs}</div><div class="hq-brs">${cards}</div>`;
}
function marshalCardHTML(g) {
  if (g !== 9) return "";
  const q = marshalQuest(profile, g, dutyState().rep || 0);
  return `<div class="mn-card" style="border-color:#f2ca5c;background:rgba(36,28,12,.72)"><b>★ 원수(5성) 특별진급 퀘스트 · 최고 난이도</b><p style="font-size:11.5px;color:#e6dcc0;margin:4px 0 8px">원수는 일반 진급이 불가하며, 아래 전시 합동작전 최고 공훈 3가지를 모두 달성해야 특별진급할 수 있습니다.</p>
    <div style="display:flex;flex-direction:column;gap:3px;font-size:11.5px;margin-bottom:8px">
      <span class="${q.c1 ? "g" : ""}">${q.c1 ? "✔" : "○"} 대장 근무평정 평균 S(85점+) · 5회 이상 (현재 ${q.e9.avg}점 · ${q.e9.n}/5회)</span>
      <span class="${q.c2 ? "g" : ""}">${q.c2 ? "✔" : "○"} 위기 직접 지휘(3D/FM) 대승 3회 이상 (현재 ${q.wins}/3회)</span>
      <span class="${q.c3 ? "g" : ""}">${q.c3 ? "✔" : "○"} 군내 평판 85점+ &amp; 대장 복무 ${serviceDuration(rankMonths(9, 10))} 이상 (현재 평판 ${q.rep} · 복무 ${serviceDuration(rankMonths(9, q.w9))})</span>
    </div>
    <button class="mn-go" data-duty="marshal" ${q.ok || profile.admin ? "" : "disabled"}>${q.ok ? "★ 원수(5성) 특별진급 심사 상정 ›" : profile.admin ? "★ [관리자] 원수 특별진급 즉시 실행 ›" : "특별진급 조건 미달"}</button></div>`;
}
let retireArm = false;
function tierAuthHTML(g) {
  if (g <= 2) return `<div class="mn-card" style="padding:8px 12px;border-left:3px solid #72ace8"><b>⚡ 위관 권한 (소위~대위)</b><small style="display:block;color:#b8d4e6">현장 실무 지휘 · 현 계급 복무 기간과 경험치·평정 횟수 조건을 채우면 진급심사를 받습니다.</small></div>`;
  if (g <= 5) return `<div class="mn-card" style="padding:8px 12px;border-left:3px solid #f2ca5c"><b>📋 영관 권한 해금 (소령~대령)</b><small style="display:block;color:#e4d9b5">부대 운영 · 공통 융합 트랙 전과 가능 · 진급 심사에서 주요 보직 경력과 평정이 크게 작용합니다.</small></div>`;
  return `<div class="mn-card" style="padding:8px 12px;border-left:3px solid #ff9b5e"><b>⭐ 장성 권한 해금 (준장~대장)</b><small style="display:block;color:#f0cbb4">사령부 참모 인사권 · 합동 워룸 개입 · 대장 도달 시 국방부장관 임명 및 원수 특별진급 도전 가능.</small></div>`;
}
let lastShownReview = null;
function recordBoardPromotion(result, grade, branch) {
  const nextBranch = result.appointedBranch ?? branch;
  if (nextBranch !== branch) setBranch(nextBranch);
  logPromotion({g:grade+1,t:postOf(grade+1),b:curBranches()[nextBranch].n,why:result.reason,turn:result.week,serviceDate:result.date});
  pmMedals = awardMedals({grade:grade+1, turn:result.week, source:result.reason});
}

function showBoardPromotion(result, grade, branch) {
  pmOpts = null;
  buildPromo(grade, grade + 1, "", false, result);
  $("#promoM").style.display = "flex";
  fanfare(grade + 1, result.appointedBranch ?? branch);
}

function openPromotionBoard(g, br, svk, automatic = false) {
  const title = postOf(g), v = boardPreview(g, xpGrade(), title, br, svk);
  if (!v.ready || !v.seats || $(".bd-modal[open]") || $("#promoM").style.display === "flex") return;
  if (automaticCaptain(g)) {
    const result = settle(g, xpGrade(), title, br, svk);
    if (!result?.passed) return;
    recordBoardPromotion(result, g, br);
    refreshMenus();
    showBoardPromotion(result, g, br);
    renderDutyDesk();
    return;
  }
  const reviewKey = `${isUS() ? "us" : "kr"}:${g}:${v.season}`;
  if (automatic && reviewKey === lastShownReview) return;
  lastShownReview = reviewKey;
  const dialog=document.createElement("dialog"); dialog.className="bd-modal";
  const vacantTitles=new Set(v.vacant.map(p=>p.t));
  dialog.innerHTML=`<h2>제${v.season}차 정기 진급심사</h2>${v.parts.map(([n,s],i)=>`<p>${n}<b>${s} / ${v.partMax[i]}점</b></p>`).join("")}<p>가점 +${v.bonus} (부대 사기 +${v.moraleBonus}) / 감점 −${v.penalty}</p><p>합계 ${v.score}점 · 기준 ${v.cutoff}점</p><p>정원 ${v.seats} · 동점 시 현 차수 플레이어 우선</p>${v.rivals.map(r=>`<p>${r.name} · ${r.score}점</p>`).join("")}${g===8?`<label>희망 4성 보직 <select>${v.posts.map(p=>`<option ${vacantTitles.has(p.t)?"":"disabled"} value="${p.t}">${postLabel(p.t)}${vacantTitles.has(p.t)?"":" · 동기 재임 중"}</option>`).join("")}</select></label>`:""}<button data-submit>심사 결과 확정</button><button data-dismiss>나중에</button>`;
  document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();
  dialog.querySelector("[data-dismiss]").onclick=()=>dialog.close();
  const preferred=()=>dialog.querySelector("select")?.value;
  const confirmBoard=()=>{
    const result=settle(g,xpGrade(),title,br,svk,preferred());
    if(!result){dialog.close();renderDutyDesk();return;}
    if (career.discharged) saveFinalUniform(g, title, result.date);
    if (result.passed) recordBoardPromotion(result, g, br);
    const finish=()=>{ dialog.close();refreshMenus();
      if(result.passed)showBoardPromotion(result,g,br);
      if(career.discharged)renderHQ();else renderDutyDesk();
    };
    dialog.innerHTML=`<h2>${result.reason}</h2><p>${result.score}점 · ${result.passed?(g===2?"영관 보직 트랙 선택":g===5?(isUS()?"미 상원 인준 · 게임용 절차":"국방부 장성인사심사 통과"):"진급 인사명령"):"다음 심사에서 다시 평가합니다."}</p><p>주요 기여 · ${result.contribution[0]} ${result.contribution[1]}점</p><p>기준 ${result.cutoff}점 · 감점 ${result.penalty}점</p><button>확인</button>`;
    dialog.querySelector("button").onclick=()=>{
      if(result.passed&&g===5&&!isUS()){
        dialog.innerHTML="<h2>삼정검 수여식</h2><p>가족과 동료들이 지켜보는 가운데 이름이 호명됩니다. 삼정검을 받아 들고 새 지휘 책임을 인수합니다.</p><button>장성 인사명령서 열기</button>";
        dialog.querySelector("button").onclick=finish;
      }else finish();
    };
    dialog.oncancel=e=>e.preventDefault();
  };
  const hearing=[
    ["문민 통제", "위원장이 의회의 자료 요구에 어떻게 대응할지 묻습니다.", "공개 가능한 자료와 제출 기한을 명시한다", "비공개 회의에서 감독위원에게 설명한다"],
    ["국방 예산", "지역구 일자리와 장비 정비 예산이 충돌합니다.", "사업별 비용 추계를 제출한다", "현장 노동자 증언을 청취한다"],
    ["장병 가족", "장기 대기 중인 관사 보수 요청이 증언대에 올랐습니다.", "처리 현황 공개를 약속한다", "가족 대표와 분기별로 면담한다"]
  ];
  function question(step, record){
    if(step===hearing.length){career.hearing=record;confirmBoard();return;}
    const [topic,prompt,...answers]=hearing[step];
    dialog.innerHTML=`<h2>상원 군사위원회 · 인준 청문회</h2><p>${step+1}/3 · ${topic}</p><p>${prompt}</p>${answers.map((a,i)=>`<button data-answer="${i}">${a}</button>`).join("")}`;
    for(const b of dialog.querySelectorAll("button"))b.onclick=()=>question(step+1,[...record,answers[Number(b.dataset.answer)]]);
  }
  dialog.querySelector("[data-submit]").onclick=()=>g===5&&isUS()?question(0,[]):confirmBoard();
}
function currentServiceStatus(grade, d = dutyState()) {
  return serviceStatus({us:isUS(), grade, turn:d.week, service:serviceOf(), branch:normBranch(staff.branch),
    rep:d.rep, average:evalOf(grade).avg});
}

function serviceRulesCard(status) {
  const {contract, obligationLeft, remaining, limit, extension, due, earlyWindow, elapsed, us} = status;
  return `<section class="mn-card service-terms">
    <h3>현역 복무 · ${serviceDuration(elapsed)}</h3>
    <p>${contract.title} · 의무 현역 ${serviceDuration(contract.obligation)} · ${obligationLeft ? `${serviceDuration(obligationLeft)} 남음` : "이행 완료"}</p>
    ${us ? '<p>초기 총 복무의무(현역·예비역 6~8년)는 별도입니다. 이 커리어는 현역 기간을 기록합니다.</p>' : ""}
    ${limit ? `<p><b>${limit.title}</b> · 누적 ${serviceDuration(limit.month)} · ${due ? "기간 도달" : `${serviceDuration(remaining)} 남음`}</p>` : ""}
    ${extension || earlyWindow ? '<p>게임 전형 기준 · 군내 평판 70점, 평균 평정 65점</p>' : ""}
    ${extension ? `<button data-duty="service:${extension.action}">${extension.label}</button>` : ""}
    ${earlyWindow ? '<button data-duty="service:early">임용 5년 경과 · 전역 지원 심의</button>' : ""}
    ${due ? '<button data-duty="service:close">현역 복무 종료 · 전역 기록 보기</button>' : ""}
    <a href="${status.source}" target="_blank" rel="noopener">근거 법령 · 임관 나이 23세, 안건 단위 적용</a>
  </section>`;
}

function finishOfficerService(grade, reason, elapsed, voluntary = false) {
  const d = dutyState(), date = calendarLabel(elapsed);
  career.discharged = {g:grade, title:postOf(grade), avg:evalOf(grade).avg,
    at:new Date().toISOString().slice(0,10), date, turn:d.week, voluntary, reason, serviceMonths:elapsed};
  saveFinalUniform(grade, career.discharged.title, date);
  saveCareer();
  hqView = "duty";
  renderDischarged();
}

function renderDutyDesk() {
  const g = myGrade(), br = normBranch(staff.branch), BR = curBranches(), SV = curServices(), B = BR[br], svk = serviceOf(br), sv = SV[svk] || SV.navy;
  const d = ensureDuty(svk, g, postOf(g));
  const serviceTerms = currentServiceStatus(g, d);
  noteServiceNotice(serviceTerms);
  if (serviceTerms.due) {
    $("#hqP").innerHTML = `<div class="mn dm-shell"><div class="mn-card"><h2>현역 복무 종료 안내</h2><p>${postLabel(postOf(g))} · ${rankLabel(g, svk)}</p></div>${serviceRulesCard(serviceTerms)}</div>`;
    return;
  }
  const reviewCard = boardCard(g, xpGrade(), postOf(g), br, svk, d, profile.xp);
  const date = careerDate(d.week);
  const rl = rankLine(), ev = evalOf(g), bd = board(g, xpGrade());
  const bar = (v, c = "") => `<i class="mn-bar"><em class="${c}" style="width:${clamp(v, 0, 100)}%"></em></i>`;
  const items = d.pending || [];
  const routineWaiting = items.length > 0 || !!d.crisis;
  const repCard = d.report?.routine ? `<div id="duty-report" class="mn-card mn-dk mn-paper"><div class="dh"><div class="dt"><b>정례 보고</b></div></div>
    <p>${d.report.items.join(" · ")}</p><button data-duty="rep:0" ${routineWaiting ? "disabled" : ""}><b>${routineWaiting ? "남은 안건을 처리하면 제출할 수 있습니다" : "정례 보고 한 번에 제출"}</b><small>평정 72점 · 군내 평판 +6 · 부대 사기 +3</small></button></div>` :
    d.report ? `<div id="duty-report" class="mn-card mn-dk mn-paper" style="border-color:#f2ca5c"><div class="dh"><div class="dt"><small>📝 상부 보고서 작성</small><b>${d.report.title}</b><span>보고 방식에 따라 단기 평정·군내 평판·감찰 리스크가 갈립니다</span></div></div><p>${d.report.desc}</p>${d.report.items?.length ? `<p>함께 보고할 정례 안건 · ${d.report.items.join(" · ")}</p>` : ""}
    <button data-duty="rep:0"><b>① 사실대로 솔직 보고</b><small>군내 신뢰·부대 사기 확보 · 단기 평정은 보수적</small></button>
    <button data-duty="rep:1"><b>② 성과 강조 · 미흡점 축소 보고</b><small>단기 고평가 기대 · 상급부대 감찰 적발 시 치명적 감점</small></button>
    <button data-duty="rep:2"><b>③ 현장 실무자 책임으로 선 긋기</b><small>단기 평정 방어 · 부하 신뢰 및 부대 사기 하락</small></button></div>` : "";
  const evCards = items.map((id) => {
    const event = openingEvent(id);
    if (event) {
      const previous = openingCarryover(d, event);
      return `<div id="duty-${id}" class="mn-card mn-dk mn-paper"><div class="dh"><div class="dt"><small>${postLabel(B.n)} · 초임 과정 · ${date} · ${event.week}/10</small><b>${event.title}</b></div></div>
        <p>${event.description}</p>${previous ? `<p><b>이전 안건의 결정</b> · ${previous.text} ${previous.followup} <strong>이번 안건 평정 ${previous.points > 0 ? "+" : ""}${previous.points}점</strong></p>` : ""}
        ${event.options.map((option, index) => `<button data-duty="ev:${id}:${index}"><b>${option}</b></button>`).join("")}</div>`;
    }
    const E = dutyEventById(id); if (!E) return "";
    const order = d.optOrder?.[id] || [0, 1, 2];
    return `<div id="duty-${id}" class="mn-card mn-dk mn-paper"><div class="dh"><div class="dt"><small>${sv.icon} ${sv.n} ${postLabel(B.n)} · ${date}</small><b>${E[4]}</b><span>부대 사기·긴장도에 따라 결과와 평정이 달라집니다 (선택 후 결과 공개)</span></div></div><p>${E[5]}</p>${order.map((origIdx) => { const opt = E[6][origIdx]; return opt ? `<button data-duty="ev:${id}:${origIdx}"><b>${opt[0]}</b><small>${dutyOptionHint(origIdx)}</small></button>` : ""; }).join("")}</div>`;
  }).join("");
  const cr = d.crisis ? dutyCrisisById(d.crisis) : null;
  const crFmRec = cr && cr.domain !== "navy";
  const crCard = cr ? `<div id="duty-crisis" class="mn-card mn-dk mn-nsc"><b>🚨 ${cr.tag} — ${cr.title}</b><p>${cr.desc}</p><div class="dm-ops"><button class="dm-op" data-duty="del">① 자동 위임</button><button class="dm-op fm" data-duty="fm">② FM 합동 작전 지휘${crFmRec ? " ★추천" : ""}</button><button class="dm-op d3" data-duty="3d">③ 3D 직접 개입${!crFmRec ? " ★추천" : ""}</button></div></div>` : "";
  const minBtn = g >= 9 && (ministerOk(g) || profile.admin) ? `<div class="mn-card" style="border-color:#ffd166"><b>🏛️ ${isUS() ? "미 국방장관 (SecDef) 지명 가능" : "국방부장관 임명 가능"}</b><p>대장 계급과 우수 평정을 달성했습니다. ${isUS() ? "펜타곤 국방장관으로 취임해 36주 3군 국방 경영을 시작하십시오." : "국방부장관으로 취임해 36주 3군 국방 경영을 시작하십시오."}</p><button class="mn-go" data-duty="tomin">${isUS() ? "미 국방장관 취임 ›" : "국방부장관 취임 ›"}</button></div>` : "";
  const admDuty = profile.admin ? `<div class="adm-bar"><b>관리자 시험</b><button data-duty="admrank">+1계급 진급</button><button data-duty="tomin">→ ${isUS() ? "미 국방장관 취임" : "국방부장관 취임"}</button>${isUS() ? `<button data-uspres="preview">→ 미국 대선 시험 (538)</button>` : `<button data-adm="topres">→ 대선 시작</button><button data-adm="topotus">→ 대통령 취임</button>`}<button data-adm="reset0">↺ 소위부터 다시 시작</button></div>` : "";
  const boss = bossFor(g, svk);
  const bossCard = `<div class="mn-card dm-news" style="border-left:3px solid ${boss.style.color}"><div class="mn-h">🎖️ 직속 상관 · 평정권자</div><div style="font-size:11.5px;display:flex;justify-content:space-between;align-items:center;margin-bottom:3px"><b>${boss.name}</b><span style="padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(255,255,255,.08);color:${boss.style.color}">${isUS() ? `${boss.style.n} (${boss.style.en})` : boss.style.n}</span></div><small style="border:0;padding:0;color:#9bb6c6">${boss.title}</small><small style="border:0;padding:2px 0 0;color:#b8d4e4">${boss.style.hint}</small></div>`;
  const rvEvObj = d.rivalEvent ? RIVAL_EVENTS.find((x) => x.id === d.rivalEvent.evId) : null;
  const rvEvTarget = d.rivalEvent ? d.rivals?.[d.rivalEvent.ri ?? 0] : null;
  const rvEvNm = rvEvTarget ? (isUS() ? usNpcName(rvEvTarget.name + (d.rivalEvent.ri ?? 0)) : rvEvTarget.name) : "";
  const rvEvPost = rvEvTarget ? postLabel(rvEvTarget.post || careerTitle(rvEvTarget.g, rvEvTarget.br)) : "";
  const rvEvCard = rvEvObj && rvEvTarget ? `<div id="duty-rival" class="mn-card mn-dk mn-paper" style="border-color:#72ace8"><div class="dh"><div class="dt"><small>🤝 ${isUS() ? "Academy Classmate Request" : "임관 동기 인맥 이벤트"} · ${rvEvNm} (관계도 ${rvEvTarget.rel ?? 50})</small><b>${rvEvObj.title}</b><span>선택에 따라 동기 관계도·군내 평판·후반 참모 시너지가 달라집니다</span></div></div><p>${rvEvObj.desc(rvEvNm, rvEvPost)}</p>${rvEvObj.opts.map((o, oi) => `<button data-duty="rvev:${oi}"><b>${o.l}</b><small>${o.d}</small></button>`).join("")}</div>` : "";
  const ab = allyBonus(d.rivals, g);
  const rivalsHTML = d.rivals?.length ? `<div class="mn-card dm-news"><div class="mn-h">👥 ${isUS() ? "사관학교 동기 동향" : "임관 동기 동향"}${ab.allies ? ` <small style="color:#8ef07a;font-weight:700">우군 시너지 +${ab.crisisWinBonus}%</small>` : ""}</div>${d.rivals.map((r, ri) => {
    const diff = r.g > g ? `<b class="r">선진급</b>` : r.g === g ? `<b class="y">동급</b>` : `<b class="g">추월</b>`;
    const rNm = isUS() ? usNpcName(r.name + ri) : r.name;
    const rlInfo = relLabel(r.rel ?? 50);
    return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:4px 0;border-bottom:1px dashed rgba(170,200,210,.14)"><span>${insignia(r.g, 12)} <b>${rankLabel(r.g, svk)} ${rNm}</b><br><small style="color:#8fb0c2;border:0;padding:0">${postLabel(r.post || careerTitle(r.g, r.br))} · <b class="${rlInfo.cls}">${rlInfo.t} (${r.rel ?? 50})</b></small></span>${diff}</div>`;
  }).join("")}</div>` : "";
  const agenda = items.map(id => [`duty-${id}`, openingEvent(id)?.title ?? dutyEventById(id)?.[4]]).filter(([, title]) => title);
  if (cr) agenda.unshift(["duty-crisis", cr.title]);
  if (d.report) agenda.push(["duty-report", d.report.title]);
  const nextDisabled = items.length > 0 || !!cr || !!d.report;
  const review = boardPreview(g, xpGrade(), postOf(g), br, svk, d);
  const needs = [
    !bd.wk && `현 계급 복무 ${serviceDuration(rankMonths(g, bd.needWk) - rankMonths(g, bd.weeks))} 남음`,
    !bd.xp && `경험치 ${fmt(ECON_RANK_XP[g+1] - profile.xp)} XP`,
    !bd.cnt && `근무평정 ${bd.need - ev.n}회`,
    bd.wk && review.waitWeeks > 0 && `재심사까지 안건 진행 ${review.waitWeeks}회`,
  ].filter(Boolean);
  const promotionSummary = g === 9 ? "원수 특별진급 조건 보기" : g > 9 ? "최고 계급 도달" :
    needs.length ? `남은 조건 · ${needs.join(" · ")}` : automaticCaptain(g) ? "대위 자동진급 조건 충족" : review.seats ? "심사 신청 조건 충족" : "상위 보직 공석 대기";
  $("#hqP").innerHTML = `<div class="hq-tog"><b>${sv.icon} ${sv.n} 장교 커리어 · ${rankLabel(g, svk)} ${cmdr.name}</b><small>${postLabel(B.n)} · ${postLabel(postOf(g))}</small><button data-hqv="org" class="hq-tg2">지휘 계통도 · 참모 ›</button>${career.minister ? `<button data-hqv="min" class="hq-tg2">국방부 집무실 ›</button>` : ""}</div>${admDuty}
    <div class="mn dm-shell">
      <div class="mn-top dm-top">
        <div class="mt"><span>계급 성장</span><b>${insignia(g, 18)} ${rankLabel(g, svk)}${g < 9 ? ` → ${rankLabel(g + 1, svk)}` : g === 9 ? " (★특별진급)" : " ★"}</b>${bar(rl.pct * 100, "g")}</div>
        <div class="mt"><span>근무평정</span><b class="${ev.avg >= 70 ? "g" : ev.avg >= 55 ? "y" : "r"}">${ev.n ? `${ev.avg}점 (${ev.l})` : "대기"}</b><small>${g >= 9 ? "원수 특별진급 심사" : `진급 요건 ${ev.n}/${bd.need}회`}</small></div>
        <div class="mt"><span>부대 사기</span><b class="${d.morale >= 65 ? "g" : "y"}">${d.morale}</b>${bar(d.morale, d.morale >= 65 ? "g" : "y")}</div>
        <div class="mt"><span>군내 평판</span><b>${d.rep}</b>${bar(d.rep)}</div>
        <div class="mt"><span>안보 긴장도</span><b class="${d.tension >= 65 ? "r" : "y"}">${d.tension}</b>${bar(d.tension, d.tension >= 65 ? "r" : "y")}</div>
        <button class="mn-next" data-duty="next" ${nextDisabled ? "disabled" : ""}>${nextDisabled ? "직무·보고 처리 필요" : `다음 안건 ▶`}</button>
      </div>
      <div class="duty-overview">
        <section class="mn-card"><h3>${date} 안건${agenda.length ? ` · ${agenda.length}건` : ""}</h3>
          ${agenda.length ? `<ul>${agenda.map(([id, title]) => `<li><a href="#${id}">${title}</a></li>`).join("")}</ul>` : "<p>이번 단계 안건을 모두 처리했습니다.</p>"}
        </section>
        <section class="mn-card"><h3>다음 진급</h3><p>${promotionSummary}</p>
          ${automaticCaptain(g) ? "<p>조건 충족 시 대위 자동진급</p>" : g < 9 ? `<p>예상 심사 ${review.score} / ${review.cutoff}점</p>` : ""}
          ${g < 10 ? `<a href="#duty-promotion">진급심사 상세 보기</a>` : ""}
        </section>
      </div>
      ${serviceRulesCard(serviceTerms)}
      <div class="dm-grid">
        <nav class="dm-nav">
          <button class="dm-tab on" data-hqv="duty"><span>📋 복무 안건·위기</span>${agenda.length ? `<em>${agenda.length}</em>` : ""}</button>
          <div class="dm-goals" style="margin-top:4px"><b>부대 지휘 방침</b>${Object.entries(STANCES).map(([sk, S]) => {
            const on = (d.stance || "bal") === sk;
            return `<button class="dm-tab${on ? " on" : ""}" data-duty="stance:${sk}" style="width:100%;margin-top:4px;text-align:left;padding:6px 8px"><span>${S.n}</span><small style="display:block;font-size:10px;color:${on ? "#d8eef8" : "#88a4b6"};margin-top:2px">${S.d}</small></button>`;
          }).join("")}</div>
          <button class="dm-tab" data-duty="retire_now" ${serviceTerms.obligationLeft ? "disabled" : ""} style="margin-top:6px;border-color:rgba(255,140,120,.35);color:#f2b8b0"><span>${serviceTerms.obligationLeft ? "의무복무 이행 중" : retireArm ? "⚠ 한 번 더 클릭: 전역" : "🚪 전역 신청"}</span></button>
        </nav>
        <div class="dm-main">${crCard}${rvEvCard}${evCards}${repCard}<div id="duty-promotion">${g < 9 ? reviewCard : marshalCardHTML(g)}</div>${g >= 9 ? reviewCard : ""}${minBtn}${tierAuthHTML(g)}${d.last ? `<div class="mn-card"><small>최근 결과: ${d.last}</small></div>` : ""}</div>
        <aside class="dm-side">${globalThis.__careerProfileHTML()}${bossCard}${rivalsHTML}<div class="mn-card dm-news"><div class="mn-h">📰 군 내부 · 언론 헤드라인</div>${(d.headlines || []).slice(0, 7).map((h) => `<small>• ${h.replace(/^(\d+)주차 ·/, "안건 $1 ·")}</small>`).join("")}</div></aside>
      </div>
    </div>`;
  openPromotionBoard(g, br, svk, true);
}
function renderTrackView() {
  const g = myGrade(), br = normBranch(staff.branch), SV = curServices(), BR = curBranches(), sv = SV[serviceOf(br)] || SV.navy;
  $("#hqP").innerHTML = `<div class="hq-tog"><button data-hqv="duty">‹ 복무 안건</button><b>계급 성장 로드맵</b><small>${sv.icon} ${sv.n} · ${BR[br].n}</small></div><div class="mn dm-shell">${globalThis.__careerTrackHTML()}</div>`;
}
function renderMin() { if (!minState()) minStart(cmdr.name); $("#hqP").innerHTML = `<div class="hq-tog"><button data-hqv="org">‹ 지휘 계통도</button><b>${isUS() ? "펜타곤 집무실 (Pentagon)" : "국방부 집무실"}</b><small>${isUS() ? `SecDef ${cmdr.name}` : `${cmdr.name} ${civil() ? "전 장관" : "장관"}`}</small><button data-min="gal" class="hq-tg2">🖼 역대 장관</button>${!isUS() && presState() ? `<button data-hqv="pres">대선 캠프 ›</button>` : ""}</div>${admBar("min")}${minHTML()}`; }
/** 관리자 시험 바 (국방부·대선·대통령실 공통) */
const ADM = { min: [["minok", "장관 명예 퇴임 즉시"], ["minbad", "장관 임기 종료(목표 미달)"], ["topres", "→ 대선 바로 시작"], ["topotus", "→ 대통령 바로 취임"], ["reset0", "↺ 소위부터 다시 시작"]],
  pres: [["pboost", "능력치 +15"], ["pskip", "프롤로그 건너뛰기"], ["ppri", "경선 승리"], ["pdday", "D-3으로"], ["pwin", "당선 처리"], ["plose", "낙선 처리"], ["topotus", "→ 대통령 취임"], ["reset0", "↺ 소위부터 다시 시작"]],
  potus: [["uap", "지지율 +15"], ["uapd", "지지율 −15"], ["ubud", "예산 +30조"], ["useats", "여당 의석 뒤집기"], ["ucrisis", "위기 발생"], ["usummit", "정상회담 추가"], ["uskip4", "4분기 건너뛰기"], ["uend", "임기 종료 엔딩"], ["uimp", "탄핵 엔딩"], ["ureset", "대통령 기록 초기화"], ["reset0", "↺ 소위부터 다시 시작"]] };
const admBar = (k) => adminBar(profile.admin, "관리자 시험", isUS() && k === "min" ? ADM.min.filter(([a]) => a !== "topres" && a !== "topotus") : ADM[k]);
function admRun(a) {
  setTheme(presTheme());
  if (a === "reset0") { restartCurrentCareer(true); return; } /* 관리자 유지한 채 소위 1호봉부터 초기화 */
  if (a === "minok" || a === "minbad") { if (!minState()) minStart(cmdr.name); if (!minAdminEnd(a === "minok")) return toast("이미 임기를 마쳤습니다", 2); hqView = "min"; renderMin(); const r = minClick("next"); if (r.retire) { playMinisterAnthem(); playCuts({ title: isUS() ? "Secretary of Defense Farewell" : "국방부장관 이임", place: isUS() ? "Pentagon · End of Term" : "국방부 · 임기 종료", cuts: r.retire, onClose: () => { stopFanfare(); renderMin(); refreshMenus(); } }); } refreshMenus(); return; }
  if (a === "topres" || a === "topotus") { if (isUS()) return toast("미국 모드에서는 한국 대통령 선거에 출마할 수 없습니다 (미 대선 추후 업데이트 예정)", 3.5); if (!minState()) minStart(cmdr.name); if (!minState().retired) { minAdminEnd(true); minClick("next"); }
    if (!presState()) presStart(cmdr.name);
    if (a === "topotus") { if (presState().stage !== "won") presAdmin("win"); if (!potusState()) potusStart(cmdr.name); hqView = "potus"; renderPotus(); } else { hqView = "pres"; renderPres(); }
    refreshMenus(); toast(a === "topotus" ? "관리자 · 대통령 취임" : "관리자 · 대선 시작", 3); return; }
  const P = { pboost: "boost", pskip: "skip", ppri: "pri", pdday: "dday", pwin: "win", plose: "lose" }[a]; if (P) return presResult(presAdmin(P));
  const U = { uap: "ap", uapd: "apd", ubud: "bud", useats: "seats", ucrisis: "crisis", usummit: "summit", uskip4: "skip4", uend: "end", uimp: "imp", ureset: "reset" }[a]; if (U) { const r = potusAdmin(U); if (U === "reset") { hqView = "pres"; renderPres(); refreshMenus(); return toast(r.toast, 3); } return potusResult(r); }
}
function renderPotus() { if (!potusState()) potusStart(cmdr.name); $("#hqP").innerHTML = `<div class="hq-tog"><button data-hqv="pres">‹ 대선 기록</button><b>대통령실</b><small>${cmdr.name} 대통령</small></div>${admBar("potus")}${potusHTML()}`; }
function potusResult(r) {
  setTheme(presTheme());
  if (r.toast) toast(r.toast, 3);
  if (r.scene) { const sc = r.scene; openScene({ kind: sc.kind, title: sc.title, place: sc.place, speaker: sc.speaker, questions: sc.questions, onPick: (qi, ai) => { const x = sc.pick?.(qi, ai); if (x?.toast) toast(x.toast, 3); }, onClose: () => { renderPotus(); refreshMenus(); } }); return; }
  if (r.cuts) { renderPotus(); playCuts({ title: "대통령 퇴임", place: "대통령실", cuts: r.cuts, onClose: () => { renderPotus(); refreshMenus(); } }); return; }
  if (r.redraw) { renderPotus(); refreshMenus(); }
}
function renderPres() { if (!presState()) presStart(cmdr.name); $("#hqP").innerHTML = `<div class="hq-tog"><button data-hqv="min">‹ 국방부 기록</button><b>대통령 선거</b><small>${cmdr.name}</small>${potusState() ? `<button data-hqv="potus" class="hq-tg2">대통령실 ›</button>` : ""}</div>${admBar("pres")}${presHTML()}`; }
/** 대선 화면 클릭 결과 처리 (장면·컷·다시 그리기) */
function presResult(r) {
  setTheme(presTheme());
  if (r.toast) toast(r.toast, 3);
  if (r.scene) { const sc = r.scene; openScene({ kind: sc.kind, title: sc.title, place: sc.place, speaker: sc.speaker, questions: sc.questions, onPick: (qi, ai) => { const x = sc.pick?.(qi, ai); if (x?.toast) toast(x.toast, 3); }, onClose: (qi) => { if (qi >= sc.questions.length) sc.close?.(); renderPres(); refreshMenus(); } }); return; }
  if (r.cuts) { renderPres(); playCuts({ title: "대통령 선거", place: "선거일", cuts: r.cuts, onClose: () => { renderPres(); refreshMenus(); } }); return; }
  if (r.redraw) { renderPres(); refreshMenus(); }
}
function dischargeEndingOf(g, svName) {
  if (g <= 2) return { badge: "🏛️ 국방부 군무원 임용 엔딩", sub: "전력·군수 행정관 (7급 군무원 특채)", desc: `${svName} 위관 장교로서의 현장 실무 경험을 인정받아 국방부 소속 군무원으로 새 출발했습니다. 제복은 벗었지만 군수·전력 행정의 중추로서 후배 장병들을 든든히 지원합니다.` };
  if (g <= 4) return { badge: "🏢 방산 대기업 임원 스카우트 엔딩", sub: "태극디펜스 · 전략기획 본부장 (상무)", desc: `영관급(${ECON_RANKS[g]}) 작전·무기체계 운용 경력을 높이 평가받아 국내 굴지의 가상 방산기업 '태극디펜스' 전략기획 임원으로 스카우트되었습니다. K-방산 해외 수출의 주역으로 활약합니다.` };
  if (g === 5) return { badge: "🎓 국방안보연구원 석좌연구위원 엔딩", sub: "국가안보전략연구소 선임연구위원 · 대학 석좌교수", desc: `대령 지휘관·참모 경력을 바탕으로 국방안보 싱크탱크 선임연구위원 겸 주요 언론의 안보 자문위원으로 자리 잡았습니다. 차세대 국방 개혁 담론을 이끕니다.` };
  if (g <= 7) return { badge: "⭐ 예비역 장성 · 방산협회장 & 정계 영입 엔딩", sub: "한국방위산업진흥회 고문 · 정계 안보 영입 1순위", desc: `별을 달고 전역한 예비역 ${ECON_RANKS[g]}으로서 방위산업계와 정계 양쪽의 러브콜을 받습니다. 원한다면 민간인 예비역 장성 자격으로 대통령 선거에 도전할 수 있습니다.` };
  return { badge: "🇰🇷 국가안보 원로 · 정계 거물 엔딩", sub: "국가안보 원로회의 의장 · 차기 대선 유력 주자", desc: `군 최고 지휘관 출신의 중량감과 경륜으로 전국적 신망을 얻었습니다. 여야를 막론한 영입 제안 속에 대한민국 대통령 선거에 도전할 수 있습니다.` };
}
function canEnterUsPres() {
  if (!isUS()) return false;
  if (career.discharged?.g >= 6 && myGrade() >= 6) return true;
  const ministry = minState();
  return myGrade() >= 9 && career.minister && ministry?.nat === "us" && ministry.retired;
}

function restartCurrentCareer(keepAdmin = false) {
  const { branch, service, nation } = staff;
  const contract = career.serviceContract;
  for (const key of NG_RESET) careerStorage.removeItem(key);
  if (contract) careerStorage.setItem("steeltide:career", JSON.stringify({
    log: [], serviceContract: {...contract, obligation:contract.initialObligation ?? contract.obligation, earlyUsed:false},
  }));
  careerStorage.setItem("steeltide:staff", JSON.stringify({ branch, service, nation }));
  if (keepAdmin) careerStorage.setItem(CACHE, JSON.stringify({ ...econNewProfile(), admin: true }));
  location.hash = "#hq";
  location.reload();
}

function renderUsPres() {
  const admUs = profile.admin ? `<div class="adm-bar"><b>관리자 시험 (US 대선·백악관)</b><button data-usadm="pri">경선 승리</button><button data-usadm="night">선거일</button><button data-usadm="win">당선(POTUS)</button><button data-usadm="loss">낙선</button><button data-usadm="seats">의석 반전</button><button data-usadm="qtr">분기 스킵</button><button data-usadm="end">임기 종료</button><button data-uspres="reset">초기화</button></div>` : "";
  $("#hqP").innerHTML = `<div class="hq-tog"><button data-hqv="${career.minister ? "min" : "duty"}">‹ 복귀</button><b>미국 대통령 선거와 백악관</b><small>${cmdr.name}</small></div>${admUs}${usPresHTML()}`;
}
function renderDischarged() {
  const dc = career.discharged, g = dc.g, br = normBranch(staff.branch), svk = serviceOf(br), sv = curServices()[svk] || curServices().navy;
  saveFinalUniform(g, dc.title || postOf(g), dc.date);
  if (isUS()) unlockEnding(g <= 2 ? "us_civil" : g <= 4 ? "us_corp" : "us_prof");
  else unlockEnding(g <= 2 ? "kr_civil" : g <= 4 ? "kr_corp" : g === 5 ? "kr_prof" : "kr_gen");
  const end = isUS() ? (() => { const u = usDischargeEndingOf(g, sv.n); return { badge: `${u.icon} ${u.tag}`, sub: u.role, desc: u.desc }; })() : dischargeEndingOf(g, sv.n);
  const why = dc.reason ?? (dc.voluntary ? "전역 신청으로 현역 복무를 마쳤습니다." : "이전 복무 기록에 따라 전역했습니다.");
  const admRow = profile.admin ? `<div class="adm-bar"><b>관리자 시험</b><button data-adm="reset0">↺ 소위부터 다시 시작</button></div>` : "";
  $("#hqP").innerHTML = `${admRow}<div class="mn"><div class="mn-ret"><div class="mn-card big" style="text-align:center">
    <div style="margin:0 auto 10px">${face({ ...agedFace(cmdr.face, g), civ: true, bg: "#26323d" }, 132)}</div>
    <div style="color:#ffd166;font:700 13px 'Noto Sans KR',sans-serif;margin-bottom:4px">${end.badge}</div>
    <h3>${end.sub}</h3>
    <p>${sv.icon} 예비역 ${rankLabel(g, svk)} ${cmdr.name} · 최종 보직 ${postLabel(dc.title || postOf(g))}</p>
    <p style="font-size:12.5px;color:#c8d8e2;line-height:1.6">${end.desc}</p>
    <p style="font-size:11.5px;color:#8faec0;margin-top:4px">${escapeTitle(why)}</p>
    <div class="kv"><span>최종 계급</span><b>${insignia(g, 16)} ${rankLabel(g, svk)}</b></div>
    ${dc.serviceMonths != null ? `<div class="kv"><span>총 현역 복무</span><b>${serviceDuration(dc.serviceMonths)}</b></div>` : ""}
    <div class="kv"><span>최종 계급 평균 평정</span><b>${dc.avg || 0}점</b></div>
    ${g >= 6 ? (isUS() ? `<button class="mn-pres" data-uspres="start"><b>🇺🇸 예비역 장성 · 미국 대통령 선거 출마 (538 선거인단) ›</b><small>군복을 벗고 미 합중국 대통령 선거에 도전합니다.</small></button>` : `<button class="mn-pres" data-pres="start"><b>예비역 장성 · 대통령 선거 출마 ›</b><small>군복을 벗고 민간인 예비역 장성으로 정계에 도전합니다.</small></button>`) : ""}
    <button class="mn-go" data-duty="restart">↺ 2회차 시작 (소위 재임관)</button>
  </div>${chronicleHTML({ cmdrName: cmdr.name, grade: g, rankName: rankLabel(g, svk), post: postLabel(dc.title || postOf(g)), svcName: sv.n, branchName: postLabel((curBranches()[br] || curBranches().sea).n), week: dutyState().week || 1, medalsCount: Object.keys(career.medals || {}).length, log: career.log || [], rivals: dutyState().rivals || [], rankLabelFn: (r) => rankLabel(r, svk), chapterLabel: end.sub })}</div></div>`;
}
function renderHQ() {
  if (!staff.branch) return renderBranchPick();
  if (hqView === "uspres") {
    if (isUS() && usPresState() && (canEnterUsPres() || (profile.admin && usPresPreview))) return renderUsPres();
    hqView = "duty";
    usPresPreview = false;
  }
  if (isUS() && (hqView === "pres" || hqView === "potus")) hqView = "duty";
  if (career.discharged && (isUS() || (!potusState() && !presState()))) return renderDischarged();
  if (!isUS() && hqView === "potus" && civil() && potusState()) return renderPotus();
  if (!isUS() && hqView === "pres" && civil()) return renderPres();
  if (hqView === "min" && career.minister) return renderMin();
  if (hqView === "track") return renderTrackView();
  if (hqView === "duty" && !career.minister) return renderDutyDesk();
  if (hqView === "duty" && career.minister) return renderMin();
  const rk = hqGrade(), br = hqBranch(), adm = !!profile.admin, m = staffMods(rk, br), R = STAFF_ROLES.find((r) => r.k === hqRole), E = echOf(rk), myUnit = E < 3; /* below 중장 your own staff is a smaller unit's; the fleet HQ posts are filled from above */
  const of = (k) => officer(staff.a[k]), me = hqNode({ n: "나" }, null, true);
  const SUR = "김이박최정강조윤장임한오서신권황안송류홍", GIV = ["민준", "서준", "도윤", "하준", "지호", "준서", "현우", "지훈", "건우", "우진", "성민", "태현", "재원", "동현", "승우", "영호", "상철", "기훈", "정우", "시우"];
  const npc = (k, g) => { if (isUS()) return usNpcName(k + g); let h = 7; for (const c of k + g) h = (h * 31 + c.charCodeAt(0)) >>> 0; h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; return SUR[h % SUR.length] + GIV[(h >>> 13) % GIV.length]; };
  const svk = serviceOf(br), BR = curBranches(), SV = curServices(), FP = curFlagPosts();
  const post = (k, g, title, name, vac, rv) => `<div class="hq-post${vac ? " vac" : ""}${rv ? " rv" : ""}" data-take="${k}:${g}:${title}" title="${rv ? `${isUS() ? "Academy Classmate" : "임관 동기"} (${rv.style})` : adm ? "관리자: 이 자리에서 사령부 보기" : "상부 임명 보직"}"${rv ? ` style="border-color:#72ace8;background:rgba(30,66,102,.48)"` : ""}><b>${postLabel(title)}${rv ? ` <em style="font-style:normal;font-size:9px;padding:1px 4px;border-radius:3px;background:#26588a;color:#d6eeff;margin-left:3px">${isUS() ? "Classmate" : "동기"}</em>` : ""}</b><span>${insignia(g, 11)}${rankLabel(g, svk)} ${rv ? rv.nm : name}</span></div>`;
  const KR_ORG = {
    army: { top: "육군원수", hq: "지작사", box: "지상작전사령부 참모부 · 참모 계통", ech: ["대대·중대 부서", "연대·여단 참모부", "사단·군단 참모부", "지상작전사령부"],
      ch: { sea: "지상작전사 · 군단", cmd: "육군본부 · 교육", jcs: "합참 · 국방부", ops: "기갑·기동 계통", int: "정보·정책 계통", log: "전력·군수 계통", air: "포병·화력 계통" },
      map: { sea: "inf", ops: "arm", int: "pol", log: "acq", air: "art" } },
    navy: { top: "해군원수", hq: "해작사", box: "해군작전사령부 참모부 · 참모 계통", ech: ["함정 부서", "함정·전대 참모부", "전투단·기동부대 참모부", "해군작전사령부"],
      ch: { sea: "작전부대 · 함대", cmd: "해군본부 · 교육", jcs: "합참 · 국방부", ops: "잠수함 계통", int: "정보·정책 계통", log: "전력·군수 계통", air: "해상항공·해병 계통" },
      map: { sea: "sea", ops: "sub", int: "pol", log: "acq", air: "mar" } },
    air:  { top: "공군원수", hq: "공작사", box: "공군작전사령부 참모부 · 참모 계통", ech: ["비행대대 부서", "전대 참모부", "비행단 참모부", "공군작전사령부"],
      ch: { sea: "전투비행단 · 공작사", cmd: "공군본부 · 교육", jcs: "합참 · 국방부", ops: "방공유도탄 계통", int: "전술통제·정보 계통", log: "전력·군수 계통", air: "외교·정책 계통" },
      map: { sea: "plt", ops: "sam", int: "tac", log: "acq", air: "pol" } },
  };
  const SO = (isUS() ? US_SVC_ORG : KR_ORG)[svk] || (isUS() ? US_SVC_ORG.navy : KR_ORG.navy);
  const COLS = ["sea", "cmd", "jcs", "ops", "int", "log", "air"], CH = SO.ch;
  const CK = { sea: "cm", cmd: "cm", jcs: "cm", ops: "sf", int: "sf", log: "sf", air: "sf" };
  const size = (g) => (g >= 6 ? " big" : g >= 3 ? " mid" : " sm");
  const myPost = hqAdm() ? staff.adminPost.t || careerTitle(rk, br) : postOf(rk);
  const dd = ensureDuty(svk, myGrade(), myPost);
  const rivals = (dd.rivals || []).map((r, ri) => ({ ...r, nm: isUS() ? usNpcName(r.name + ri) : r.name }));
  const rivalAt = (g, title) => rivals.find((r) => r.g === g && r.post === title);
  const flagCell = (k, g) => FP.filter((p) => p.g === g && p.c === k && (p.svc === svk || p.svc === "joint")).map((p) => {
    if (rk === g && p.t === myPost) return `<div class="hq-mine">${me}</div>`;
    const rv = rivalAt(g, p.t);
    return post(k, g, p.t, !isUS() && p.t === "해군작전사령관" && rk < 8 ? FLEET_CDR.nm : npc(p.t, String(g)), false, rv);
  }).join("");
  const baseCell = (k, g) => {
    const S = STAFF_ROLES.find((x) => x.k === k), colBr = SO.map[k];
    if (g === 10) return k === "cmd" ? (rk === 10 ? me : post("cmd", 10, SO.top, isUS() ? "Vacant" : "공석", true)) : "";
    if (g >= 6) { let h = flagCell(k, g); if (k === "cmd" && g === 7) h = (myUnit ? post("cmd", 7, `${SO.hq} 참모장`, npc("cos", "7")) : `${hqNode(STAFF_ROLES[0], of("cos"))}<div class="hq-eff">${hqEff("cos", m)[0]}</div>`) + h; return h; }
    if (k === "cmd" || k === "jcs") return "";
    if (colBr && normBranch(br) === colBr && rk === g) return `<div class="hq-mine">${me}${S && g === 5 && !myUnit ? `<div class="hq-eff">${hqEff(k, m).join(" · ")}</div>` : ""}</div>`;
    if (S && g === 5) return myUnit ? post(k, 5, `${SO.hq} ${HQ_DEPT[k]}장`, npc(k, "5")) : `${hqNode(S, of(k))}<div class="hq-eff">${hqEff(k, m).join(" · ")}</div>`;
    const t = (BR[colBr] || BR.sea).t[g];
    return post(k, g, t, npc(k, g), false, rivalAt(g, t));
  };
  const cell = (k, g) => {
    const base = baseCell(k, g);
    if (svk !== "army" || k !== "log" || g >= 6) return base;
    if (br === "eng" && rk === g) return base + `<div class="hq-mine">${me}</div>`;
    const title = BR.eng.t[g];
    return base + post("eng", g, title, npc("eng", g), false, rivalAt(g, title));
  };
  const row = (g) => 3 + (10 - g), colOf = (k) => 2 + COLS.indexOf(k);
  let grid = `<svg class="hq-lines"></svg><div class="hq-band hq-hd" style="grid-row:1;grid-column:1"></div>${COLS.map((k) => `<div class="hq-ch ${CK[k]}" style="grid-row:1;grid-column:${colOf(k)}">${CH[k]}</div>`).join("")}`
    + `<div class="hq-band hq-min" style="grid-row:2;grid-column:1"><b>${isUS() ? "펜타곤" : "국방부"}</b></div><div class="hq-cell cm big" data-n="min" style="grid-row:2;grid-column:${colOf("jcs")}"><div class="hq-post min${career.minister ? "" : " vac"}"><b>${isUS() ? "미 국방장관 (SecDef)" : "국방부장관"}</b><span>${career.minister ? `${cmdr.name} (예비역 ${rankLabel(myGrade(), svk)})` : isUS() ? "대통령 지명 · 상원 인준 — 대장(O-10)부터 제청 가능" : "예비역 장성 중 대통령 임명 — 대장부터 제청 가능"}</span></div></div>`
    + `<div class="hq-box" style="grid-row:${row(5)} / ${row(0) + 1};grid-column:${colOf("ops")} / ${colOf("air") + 1}"><span>${SO.box}</span></div>`;
  for (let g = 10; g >= 0; g--) {
    grid += `<div class="hq-band${g % 2 ? "" : " alt"}${g === rk ? " mine" : ""}" style="grid-row:${row(g)};grid-column:1">${insignia(g, 11)}<b>${rankLabel(g, svk)}</b></div>`;
    for (const k of COLS) { const inner = cell(k, g); grid += `<div class="hq-cell ${CK[k]}${size(g)}${g % 2 ? "" : " alt"}"${inner ? ` data-n="${k}${g}"` : ""} style="grid-row:${row(g)};grid-column:${colOf(k)}">${inner}</div>`; }
  }
  const cur = staff.a[hqRole], selfHold = holds(hqRole, rk, br);
  const cands = candidates(hqRole, rk).slice().sort((x, y) => y.sk - x.sk).map((o) => {
    staff.a[hqRole] = o.id; const mm = staffMods(rk, br); staff.a[hqRole] = cur; const on = o.id === cur, ok = canAppoint(o, rk, adm) && !selfHold;
    const d = [["화력", mm.outK - m.outK, 1], ["피해", mm.inK - m.inK, -1], ["재장전", mm.reloadK - m.reloadK, -1], ["수리", mm.repairN - m.repairN, 1], ["전투기", mm.jets - m.jets, 1]].filter(([, v]) => Math.abs(v) > 0.004).map(([k, v, g]) => { const good = v * g > 0, n = k !== "수리" && k !== "전투기" ? `${Math.round(Math.abs(v) * 100)}%` : `${Math.abs(v)}`; return `<span class="${good ? "ok" : "bad"}">${k} ${v > 0 ? "▲" : "▼"}${n}</span>`; }).join("");
    const act = selfHold ? `<span class="lock">본인 보직</span>` : on ? `<span class="cur">현재 임명</span>` : ok ? `<div class="hq-d">${d || "<span>변화 없음</span>"}</div><button data-appoint="${o.id}">임명</button>` : `<span class="lock">임명 불가</span>`;
    return `<div class="hq-c${on ? " on" : ""}${ok || on ? "" : " locked"}"><div class="hq-f">${staffFace(o, 64)}</div><div class="hq-ci"><div class="hq-nm">${flagOf({ nation: o.nat }, 20)}${o.ri >= 0 ? insignia(o.ri, 15) : ""}<b>${o.rk} ${o.nm}</b></div><div class="hq-skr"><span>${R.stat}</span><div class="hq-sk"><i style="width:${skillOf(o) * 10}%"></i></div><small>${skillOf(o)}/10</small></div><div class="hq-tr"><em>${TRAITS[o.tr].n}</em> ${TRAITS[o.tr].d} · 복무 ${staff.x[o.id] || 0}회</div></div><div class="hq-ca">${act}</div></div>`;
  }).join("");
  const admBox = adm ? `<div class="hq-adm">관리자 모드 — 모든 자리 임명 가능 · 조직도의 아무 자리나 누르면 그 자리에서 사령부를 봅니다${staff.adminPost ? ` <button data-take="reset">내 실제 계급으로</button>` : ""}</div>` : `<div class="hq-adm in"><input id="hqAdmin" type="password" maxlength="32" placeholder="관리자 코드" autocomplete="off"><button data-act="hqadmin">적용</button></div>`;
  const brObj = BR[normBranch(br)] || BR.sea, svObj = SV[svk] || SV.navy;
  $("#hqP").innerHTML = `<div class="hq-head"><div><h3>${svObj.icon} ${svObj.n} 지휘 계통 · 사령부</h3><p>참모진이 직접 지휘와 자동 전투 결과 모두에 반영됩니다. 언제나 나보다 낮은 계급만 임명합니다.</p><div class="hq-tog"><button data-hqv="duty">‹ 장교 복무 데스크</button><b>지휘 계통도</b>${career.minister ? `<button data-hqv="min" class="go">국방부 집무실 ›</button>` : ""}</div><div class="hq-me">내 보직 <b>${svObj.n} · ${postLabel(brObj.n)}</b> · ${postLabel(myPost)} · 보너스 ${brObj.bonus}${myGrade() === 0 || adm ? ` <button data-rebranch="1">군종·병과 변경</button>` : ""}</div>${admBox}</div><div class="hq-sum">${hqSummary(m)}</div></div>`
    + `<div class="hq-grid">${grid}</div><div class="hq-legend"><span class="l cm">지휘</span><span class="l sf">참모</span><span class="l jt">국방부·합참 계선</span><span class="l" style="border-color:#72ace8;color:#b8ddff">${isUS() ? "Classmate (동기)" : "임관 동기"}</span></div>${myUnit ? `<div class="hq-rh"><b>내 참모진 · ${SO.ech[E]}</b><span>나보다 낮은 ${ECH[E].rk}급에서 임명 — 전투에 반영되는 참모는 이 다섯 자리입니다</span></div><div class="hq-unit">${STAFF_ROLES.map((r) => `<div>${hqNode({ ...r, n: roleTitle(r.k, rk) }, of(r.k))}<div class="hq-eff">${(hqEff(r.k, m) || []).join(" · ")}</div></div>`).join("")}</div>` : ""}<div class="hq-rh"><b>${roleTitle(hqRole, rk)} 후보 · ${ECH[E].rk}급</b><span>${R.d} · 능력순</span></div><div class="hq-cands">${cands}</div>`;
  requestAnimationFrame(drawHQLines);
}
/** Org chart connectors, drawn over the grid from the laid-out boxes: [from, to, kind]. */
function drawHQLines() {
  const gEl = $(".hq-grid"), svg = gEl?.querySelector(".hq-lines"); if (!svg) return;
  const R0 = gEl.getBoundingClientRect(), box = (id) => { const el = gEl.querySelector(`[data-n="${id}"]`)?.firstElementChild; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left - R0.left + gEl.scrollLeft, y: r.top - R0.top, w: r.width, h: r.height }; };
  const E = [["min", "jcs9", "jt"], ["min", "cmd9", "jt"], ["cmd10", "cmd9", "cm"], ["cmd9", "sea8", "cm"], ["cmd9", "cmd8", "cm"], ["jcs9", "jcs8", "jt"], ["sea8", "sea7", "cm"], ["sea7", "sea6", "cm"], ["sea8", "ops7", "cm"], ["sea8", "int7", "sf"], ["cmd8", "cmd7", "cm"], ["cmd8", "log7", "sf"], ["sea8", "air7", "cm"], ["ops7", "ops6", "cm"], ["int7", "int6", "sf"], ["log7", "log6", "sf"], ["air7", "air6", "cm"]];
  for (const k of ["ops", "int", "log", "air"]) { E.push(["cmd7", k + "5", "sf"]); for (let g = 5; g > 0; g--) E.push([k + g, k + (g - 1), "sf"]); }
  E.push(["sea6", "sea5", "cm"]); for (let g = 5; g > 0; g--) E.push(["sea" + g, "sea" + (g - 1), "cm"]);
  let p = "";
  for (const [f, t, kind] of E) {
    const A = box(f), B = box(t); if (!A || !B) continue;
    const ax = A.x + A.w / 2, bx = B.x + B.w / 2, by = B.y;
    let d;
    if (kind === "mr") { const ay = A.y + A.h * 0.7, gx = B.x - 9, my = B.y + B.h / 2; d = `M${A.x + A.w} ${ay} H${gx} V${my} H${B.x}`; } /* attached for raids: enters the brigade from the side */
    else if (kind === "jt") { const ay = A.y + A.h / 2; d = `M${A.x + A.w} ${ay} H${bx} V${by}`; }
    else if (Math.abs(ax - bx) < 2) d = `M${ax} ${A.y + A.h} V${by}`;
    else { const my = by - 12; d = `M${ax} ${A.y + A.h} V${my} H${bx} V${by}`; }
    p += `<path class="${kind}" d="${d}"/>`;
  }
  svg.setAttribute("width", gEl.scrollWidth); svg.setAttribute("height", gEl.scrollHeight); svg.innerHTML = p;
}
addEventListener("resize", () => { if (screen === "hq") drawHQLines(); });
let thEnlist = false, thSvc = "army", thBr = "inf", thFace = 0;
let thNation = "kr", thName = "", thRoute = "";
const escapeTitle = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[ch]));

function characterCard(slot) {
  const us = slot.nation === "us";
  const branch = (us ? US_BRANCHES : BRANCHES)[slot.staff.branch];
  const service = branch?.svc === "joint" ? slot.staff.service : branch?.svc;
  const grade = slot.career.cap ?? slot.career.log?.at(-1)?.g ?? 0;
  const rank = us ? usRankName(grade, service) : ECON_RANKS[grade];
  const name = escapeTitle(slot.commander.name || "무명");

  return `<article class="th-slot">
    <div>${serviceEmblem(service, us)} <b>${name}</b> <small>${slot.id === activeCharacterId() ? "플레이 중" : ""}</small><br><span>${us ? "미군" : "한국군"} · ${rank || "소위"} · ${escapeTitle(postLabel(branch?.n || "", us))}</span></div>
    ${slot.archived ? `<details><summary>보관된 인사기록</summary>${renderCareerTimeline(slot.career, slot.duty, us, service)}</details>` : `<button class="th-sec" data-th="play:${slot.id}">선택</button>`}
    <button class="th-sec dng" data-th="delete:${slot.id}" aria-label="${name} ${slot.archived ? "기록 " : ""}삭제">삭제</button>
  </article>`;
}

function renderTitleHub() {
  const el = $("#titleHub"); if (!el) return;
  const slots = characters();
  const available = slots.filter(slot => !slot.archived);
  const archived = slots.filter(slot => slot.archived);
  if (!thEnlist) {
    const ordered = [...available].sort((a, b) => Number(b.nation === thNation) - Number(a.nation === thNation));
    el.innerHTML = `<div class="th-card th-roster"><h1 class="th-title">THE GENERAL</h1>
      <div class="th-roster-heading"><h2>캐릭터 선택</h2><span>${available.length}/5</span></div>
      ${ordered.map(characterCard).join("") || "<p>새 캐릭터를 만들어 소위로 시작하세요.</p>"}
      <button class="th-go" data-th="new" ${available.length >= 5 ? "disabled" : ""}>새 캐릭터 임관</button>
      ${available.length >= 5 ? "<p>캐릭터는 최대 5명까지 플레이할 수 있습니다.</p>" : ""}
      ${archived.length ? `<details class="th-archive"><summary>보관 기록 ${archived.length}건</summary>${archived.map(characterCard).join("")}</details>` : ""}
      <button class="th-sec" data-th="tac">전술 훈련</button>
    </div>`;
    return;
  }
  const us = thNation === "us", SV = us ? US_SERVICES : SERVICES, BR = us ? US_BRANCHES : BRANCHES;
  const svBrs = Object.entries(BR).filter(([, B]) => B.svc === thSvc);
  if (!svBrs.some(([k]) => k === thBr)) thBr = svBrs[0]?.[0] || "inf";
  const fList = facePool(us);
  const routes = commissionRoutes(us, thBr, thSvc);
  if (!routes.some(route => route.id === thRoute)) thRoute = routes[0].id;
  const defNm = thName || (us ? "James Vance" : "김태훈");
  el.innerHTML = `<div class="th-card" data-enlist-nation="${thNation}">
    <div class="th-kicker">${us ? "OFFICER COMMISSIONING · SELECT YOUR SERVICE" : "신임 장교 임관 · 군종 및 병과 선택"}</div>
    <h1 class="th-title">THE GENERAL</h1>
    <p class="th-sub">${us ? "Choose your nation, service branch, and officer profile to begin your command." : "국가·군종·병과와 지휘관 프로필을 선택하고 소위로 임관하십시오."}</p>
    <div class="th-nat"><button data-th="nat:kr" class="${!us ? "on" : ""}">🇰🇷 대한민국 국군</button><button data-th="nat:us" class="${us ? "on" : ""}">🇺🇸 U.S. Armed Forces</button></div>
    <div class="th-svcs" role="group" aria-label="군종 선택">${["army", "navy", "air"].map((k) => `<button class="th-svc${thSvc === k ? " on" : ""}" data-th="svc:${k}" aria-pressed="${thSvc === k}">${serviceEmblem(k, us)} <span>${SV[k].n}</span><small>${SV[k].d.split("·")[0]}</small></button>`).join("")}</div>
    <div class="th-brs">${svBrs.map(([k, B]) => `<button class="th-br${thBr === k ? " on" : ""}" data-th="br:${k}"><b>${postLabel(B.n, us)}</b><small>${postLabel(B.t[0], us)} → ${postLabel(B.t[9], us)}</small></button>`).join("")}</div>
    <label class="th-service-contract">임관 구분 <select id="thCommission">${routes.map(route => `<option value="${route.id}" ${route.id === thRoute ? "selected" : ""}>${route.title} · 의무 현역 ${route.years}년</option>`).join("")}</select></label>
    <div class="th-id">
      <div class="th-faces">${fList.map((_, i) => `<button class="th-face${thFace === i ? " on" : ""}" data-th="face:${i}">${face(agedFace(i, 0, us), 48)}</button>`).join("")}</div>
      <input id="thName" type="text" maxlength="12" value="${escapeTitle(defNm)}" placeholder="${us ? "Officer Name" : "지휘관 이름"}">
    </div>
    <div class="th-acts">
      <button class="th-go" data-th="enlist">★ ${us ? "Commission as O-1 · Enter Command Desk ▶" : "소위 임관 · 집무실 입장 ▶"}</button>
      <button class="th-sec" data-th="back">‹ 캐릭터 선택</button>
    </div>
  </div>`;
}
function openTitleHub(enlist = false, nation = isUS() ? "us" : "kr") {
  initAudio(); bgm("menu"); hideAll(); screen = "title"; G.state = "menu"; setTab("title");
  thEnlist = enlist;
  thNation = nation;
  thName = "";
  thRoute = "";
  thSvc = staff.branch ? serviceOf(staff.branch) : (staff.service || "army");
  svcDraft = thSvc;
  $("#topbar").style.display = "none";
  $("#titleHub").classList.add("on");
  renderTitleHub();
  showcase(flagshipId());
}
$("#titleHub")?.addEventListener("click", (e) => {
  const b = e.target.closest("[data-th]"); if (!b) return;
  sfx.click(); const a = b.dataset.th;
  function reloadCharacter(enter) {
    location.hash = enter ? "#hq" : "";
    location.reload();
  }
  if (a.startsWith("play:")) {
    if (selectCharacter(a.slice(5))) reloadCharacter(true);
    return;
  }
  if (a.startsWith("delete:")) {
    const slot = characters().find(entry => entry.id === a.slice(7));
    if (!slot) return;
    const dialog = document.createElement("dialog");
    dialog.className = "bd-modal";
    dialog.innerHTML = `<h2>${escapeTitle(slot.commander.name || "무명")} ${slot.archived ? "보관 기록 삭제" : "캐릭터 삭제"}</h2>
      <p>${slot.archived ? "삭제한 기록은 복구할 수 없습니다." : "기록을 보관하면 인사기록을 열람할 수 있고 플레이 슬롯은 비워집니다."}</p>
      ${slot.archived ? "" : '<button data-retain>기록 보관 후 삭제</button>'}<button data-erase>기록까지 삭제</button><button data-cancel autofocus>취소</button>`;
    document.body.append(dialog);
    dialog.onclose = () => dialog.remove();
    for (const button of dialog.querySelectorAll("button")) button.onclick = () => {
      dialog.close();
      if (button.hasAttribute("data-cancel")) return;
      const wasActive = slot.id === activeCharacterId();
      if (removeCharacter(slot.id, button.hasAttribute("data-retain"))) {
        if (wasActive) reloadCharacter(false);
        else renderTitleHub();
      }
    };
    dialog.showModal();
    return;
  }
  const selectedRoute = $("#thCommission")?.value;
  if (selectedRoute) thRoute = selectedRoute;
  const typedName = $("#thName")?.value;
  if (typedName != null) thName = typedName;
  if (a.startsWith("nat:")) { thNation = a.slice(4); thRoute = ""; renderTitleHub(); return; }
  if (a.startsWith("svc:")) { thSvc = a.slice(4); renderTitleHub(); return; }
  if (a.startsWith("br:")) { thBr = a.slice(3); thRoute = ""; renderTitleHub(); return; }
  if (a.startsWith("face:")) { thFace = +a.slice(5); renderTitleHub(); return; }
  if (a === "tac") { svcDraft = null; openMenu(); return; }
  if (a === "new") { thEnlist = true; thSvc = "army"; thName = ""; renderTitleHub(); return; }
  if (a === "back") { thEnlist = false; renderTitleHub(); return; }
  if (a === "enlist") {
    const name = thName.replace(/[<>&"`]/g, "").trim() || (thNation === "us" ? "James Vance" : "김태훈");
    const routes = commissionRoutes(thNation === "us", thBr, thSvc);
    const route = routes.find(entry => entry.id === thRoute) ?? routes[0];
    const created = createCharacter(thNation, {
      "steeltide:career": {log:[], serviceContract: contractFor(route)},
      [CACHE]: { ...econNewProfile(), admin: !!profile.admin },
      "steeltide:cmdr": { name: name.slice(0, 12), face: thFace },
      "steeltide:staff": { branch: thBr, service: thSvc, nation: thNation, a: {}, byE: {}, x: {}, e: 0 },
    });
    if (created) reloadCharacter(true);
    else toast("플레이 슬롯 5개가 모두 사용 중입니다");
  }
});

function openHQ(view = null) {
  initAudio(); bgm("menu"); hideAll(); screen = "hq"; G.state = "menu";
  if (view && usPresPreview) {
    usPresPreview = false;
    refreshMenus();
  }
  if (view === "org") hqView = "org";
  else if (view === "duty") hqView = (!isUS() && potusOn()) ? "potus" : (!isUS() && presState() && civil()) ? "pres" : (canEnterUsPres() && usPresState()) ? "uspres" : career.minister ? "min" : "duty";
  setTab(hqView === "org" ? "org" : "hq");
  $("#topbar").style.display = "flex"; renderHQ(); $("#hqP").style.display = "block"; showcase(flagshipId());
}
$("#tabHQ").addEventListener("click", () => { sfx.click(); openHQ("duty"); });
$("#tabOrg")?.addEventListener("click", () => { sfx.click(); openHQ("org"); });
$("#tabCharacters")?.addEventListener("click", () => { sfx.click(); openTitleHub(false); });
$("#logoHome")?.addEventListener("click", () => { sfx.click(); openTitleHub(false); });
$("#recordP").addEventListener("keydown", e => {
  const ribbon = e.target.closest("[data-medal]");
  if (ribbon && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    showMedal(ribbon.dataset.medal);
  }
});
$("#recordP").addEventListener("click", (e) => {
  const ribbon = e.target.closest("[data-medal]"); if (ribbon) { showMedal(ribbon.dataset.medal); return; }
  const rt = e.target.closest("[data-rectab]"); if (rt) { sfx.click(); recTab = rt.dataset.rectab; renderRecord(); return; }
  if (e.target.closest('[data-chron="png"]')) {
    sfx.click();
    const g0 = career.discharged?.g ?? myGrade(), br0 = normBranch(staff.branch), sv0 = serviceOf(br0), SV0 = curServices(), BR0 = curBranches(), dd0 = dutyState();
    downloadChroniclePNG({ cmdrName: cmdr.name, rankName: rankLabel(g0, sv0), post: postLabel(career.discharged?.title || postOf(g0)), svcName: (SV0[sv0] || SV0.navy).n, branchName: postLabel((BR0[br0] || BR0.sea).n), week: dd0.week || 1, medalsCount: Object.keys(career.medals || {}).length, log: career.log || [], rivals: dd0.rivals || [], rankLabelFn: (r) => rankLabel(r, sv0), chapterLabel: career.discharged ? "예비역 전역" : career.minister ? "국방부장관" : "현역 복무" });
    toast("회고록 PNG 이미지를 저장했습니다", 2.5);
    return;
  }
  if (e.target.closest('[data-act="setrank"]') && profile.admin) {
    const g = +$("#setRank").value, before = myGrade(); if (g === before) return;
    if (!act({ kind: "setxp", xp: ECON_RANK_XP[g] })) return; setCap(g); if (career.post && career.post.g !== g) { career.post = null; saveCareer(); } if (g < 9 && career.minister) { career.minister = false; saveCareer(); } staff.adminPost = null; saveStaff();
    if (g > before) { if (career.seen == null && staff.branch) careerInit(before, careerTitle(before), BRANCHES[staff.branch].n); logPromotion({ g, t: postOf(g), b: BRANCHES[staff.branch]?.n || "", why: "관리자 진급" }); pmMedals = awardMedals({ won: false, flight: false, wins: profile.wins, sunk: 0, hp: 0, grade: g }); pmOpts = null; initAudio(); buildPromo(before, g); $("#promoM").style.display = "flex"; fanfare(g, staff.branch); }
    else toast(`관리자 — 계급을 ${ECON_RANKS[g]}(으)로 조정했습니다`);
    refreshMenus(); renderRecord(); return;
  }
  if (e.target.closest('[data-act="minister"]') && myGrade() >= 9 && ministerOk(myGrade()) && !career.minister) { hqView = "min"; ministerOrder(); return; }
  if (e.target.closest('[data-act="pvpromo"]') && profile.admin) { const g = +$("#pvRank").value; pmMedals = []; initAudio(); fanfare(g, staff.branch); buildPromo(g - 1, g, "", true); $("#promoM").style.display = "flex"; return; }
  if (e.target.closest('[data-act="miadmin"]')) { if (act({ kind: "admin", code: $("#miAdmin").value })) { sfx.coin(); toast("관리자 모드 활성화"); renderRecord(); } }
});
$("#shipLine").addEventListener("click", (e) => { const b = e.target.closest("[data-flag]"); if (!b) return; sfx.click(); career.ship = b.dataset.flag; saveCareer(); refreshMenus(); showcase(flagshipId()); });
$("#promoM").addEventListener("click", (e) => {
  const fp = e.target.closest("[data-fpost]"); if (fp) { const p = pmPostOpts.find((x) => x.t === fp.dataset.fpost && x.g === pmPostG); if (!p) return; pmPostSel = p.t; $("#pmPostT").textContent = postLabel(p.t); if (!pmPreview) { career.post = { g: p.g, t: p.t }; setBranch(p.b); const last = career.log[career.log.length - 1]; if (last && last.g === p.g) { last.t = p.t; last.b = (curBranches()[p.b] || BRANCHES[p.b]).n; } saveCareer(); refreshMenus(); } sfx.click(); renderPostPick(pmPostG); return; }
  const go = e.target.closest("[data-pmgo]"); if (go) { pmGo(+go.dataset.pmgo); return; }
  const ps = e.target.closest("[data-post]"); if (ps) { const k = ps.dataset.post, BR = curBranches(); if (!BR[k]) return; pmPostSel = k; if (pmPreview) { $("#pmPostT").textContent = postLabel(BR[k].t[pmPostG]); sfx.click(); } else { career.post = null; setBranch(k); const g = myGrade(), last = career.log[career.log.length - 1]; if (last && last.g === g) { last.t = postOf(g); last.b = BR[normBranch(staff.branch)].n; } saveCareer(); $("#pmPostT").textContent = postLabel(postOf(g)); refreshMenus(); sfx.click(); } renderPostPick(pmPostG); return; }
  if (e.target.closest("#promoOk")) { sfx.click(); stopFanfare(); $("#promoM").style.display = "none"; refreshMenus(); if (screen === "hq") renderHQ(); if (storyQ) { const q = storyQ; storyQ = null; setTimeout(() => storyCard(q), 300); } }
});
$("#hqP").addEventListener("keydown", (e) => { if (e.target.id === "hqAdmin" && e.key === "Enter") $('[data-act="hqadmin"]')?.click(); });
$("#hqP").addEventListener("click", (e) => {
  const ad = e.target.closest("[data-adm]"); if (ad && profile.admin) { sfx.click(); admRun(ad.dataset.adm); return; }
  const pu = e.target.closest("[data-potus]"); if (pu) { if (pu.disabled) return; sfx.click(); if (pu.dataset.potus === "start") { if (!potusState()) potusStart(cmdr.name); hqView = "potus"; renderPotus(); refreshMenus(); return; } potusResult(potusClick(pu.dataset.potus)); return; }
  const pz = e.target.closest("[data-pres]"); if (pz) { if (pz.disabled) return; sfx.click(); if (isUS()) { toast("미국 모드에서는 미국 대통령 선거(538 선거인단)로 출마합니다", 3); return; } if (pz.dataset.pres === "start") { if (!presState()) presStart(cmdr.name); hqView = "pres"; renderPres(); refreshMenus(); return; } const prRes = presClick(pz.dataset.pres); if (presState()?.stage === "won") unlockEnding("kr_pres"); presResult(prRes); return; }
  const up = e.target.closest("[data-uspres]"); if (up) { if (up.disabled) return; sfx.click(); const a = up.dataset.uspres; if (a === "start" || a === "preview") {
    const preview = a === "preview" && profile.admin && isUS();
    if (!preview && !canEnterUsPres()) return;
    usPresPreview = preview;
    const ministry = civil() ? minState() : null;
    usPresStart(cmdr.name, ministry?.term?.avg ?? 62, ministry);
    hqView = "uspres"; renderHQ(); refreshMenus(); return;
  } const r = usPresClick(a); if (r.inaugurated) { initAudio(); playPotusAnthem(); } if (r.toast) toast(r.toast, 4); if (r.redraw) { renderUsPres(); refreshMenus(); } return; }
  const ust = e.target.closest("[data-usstate]"); if (ust && !ust.disabled) { sfx.click(); usPresClick(`state:${ust.dataset.usstate}`); renderUsPres(); return; }
  const uad = e.target.closest("[data-usadm]"); if (uad && profile.admin) { sfx.click(); const r = usPresAdmin(uad.dataset.usadm); if (r.inaugurated) { initAudio(); playPotusAnthem(); } if (r.toast) toast(r.toast, 4); renderUsPres(); refreshMenus(); return; }
  const hv = e.target.closest("[data-hqv]"); if (hv) { sfx.click(); hqView = hv.dataset.hqv; if (hqView !== "uspres" && usPresPreview) { usPresPreview = false; refreshMenus(); } setTab(hqView === "org" ? "org" : "hq"); renderHQ(); return; }
  const mn = e.target.closest("[data-min]"); if (mn) { if (mn.disabled) return; sfx.click();
    const doc = mn.dataset.min.startsWith("dk:") && mn.closest(".mn-paper"); if (doc && !doc.classList.contains("stamped")) { doc.classList.add("stamped"); mn.classList.add("pick"); doc.querySelector(".kj .me")?.insertAdjacentHTML("beforeend", `<span class="seal">결재</span>`); setTimeout(() => mn.click(), 750); return; }
    const r = minClick(mn.dataset.min); if (r.toast) toast(r.toast, 3);
    if (r.reset) { restartCurrentCareer(); return; }
    if (r.scene) { const sc = r.scene; openScene({ kind: sc.kind, title: sc.title, questions: sc.questions, onPick: (qi, ai) => { const x = minClick(`dk:${sc.id}:${ai}`); if (x.toast) toast(x.toast, 3); }, onClose: () => renderMin() }); return; }
    if (r.gallery) { const g = document.createElement("div"); g.id = "galM"; g.innerHTML = galleryHTML(); g.addEventListener("click", (ev) => { if (ev.target === g || ev.target.closest("[data-min=galx]")) g.remove(); }); document.body.appendChild(g); return; }
    if (r.retire) { renderMin(); playMinisterAnthem(); playCuts({ title: isUS() ? "Secretary of Defense Farewell" : "국방부장관 이임", place: isUS() ? "Pentagon · End of Term" : "국방부 · 임기 종료", cuts: r.retire, onClose: () => { stopFanfare(); renderMin(); refreshMenus(); } }); return; }
    if (r.nsc) { renderMin(); openScene({ kind: "nsc", title: r.nsc.title, questions: r.nsc.questions, onPick: (qi, ai) => minClick(`nsc:${ai}`), onClose: () => renderMin() }); return; }
    if (r.direct) { minDirect = true; startOpMap(!!r.directAir); return; }
    if (r.direct3d) { launchDirect3d(r.direct3d.domain, false); return; }
    if (r.redraw) renderMin(); return; }
  const svb = e.target.closest("[data-svc]"); if (svb) { sfx.click(); svcDraft = svb.dataset.svc; setService(svcDraft); showcase(flagshipId()); renderBranchPick(); return; }
  if (e.target.closest('[data-chron="png"]')) {
    sfx.click();
    const g0 = career.discharged?.g ?? myGrade(), br0 = normBranch(staff.branch), sv0 = serviceOf(br0), SV0 = curServices(), BR0 = curBranches(), dd0 = dutyState();
    downloadChroniclePNG({ cmdrName: cmdr.name, rankName: rankLabel(g0, sv0), post: postLabel(career.discharged?.title || postOf(g0)), svcName: (SV0[sv0] || SV0.navy).n, branchName: postLabel((BR0[br0] || BR0.sea).n), week: dd0.week || 1, medalsCount: Object.keys(career.medals || {}).length, log: career.log || [], rivals: dd0.rivals || [], rankLabelFn: (r) => rankLabel(r, sv0), chapterLabel: career.discharged ? "예비역 전역" : career.minister ? "국방부장관" : "현역 복무" });
    toast("회고록 PNG 이미지를 저장했습니다", 2.5);
    return;
  }
  const dy = e.target.closest("[data-duty]"); if (dy) { if (dy.disabled) return; sfx.click(); const a = dy.dataset.duty, g = myGrade(), br = normBranch(staff.branch), svk = serviceOf(br);
    if (a.startsWith("rvev:")) { const res = resolveRivalEvent(+a.slice(5)); if (res) { if (res.xpGain) { profile.xp += res.xpGain; saveProfile(); } toast(res.msg, 4); refreshMenus(); renderDutyDesk(); } return; }
    if (a.startsWith("deputy-") || ["study","share","solo"].includes(a)) { interact(a,g); renderDutyDesk(); return; }
    if (a === "review") { openPromotionBoard(g, br, svk); return; }
    if (a === "restart") { restartCurrentCareer(); return; }
    if (a.startsWith("stance:")) { const sk = a.slice(7); if (setStance(sk)) { toast(`부대 지휘 방침 변경 — ${STANCES[sk].n}`, 2.5); renderDutyDesk(); } return; }
    if (a.startsWith("service:")) {
      const action = a.slice(8), d = dutyState(), status = currentServiceStatus(g, d);
      if (action === "close" && status.due) {
        finishOfficerService(g, status.limit.title, status.limit.month);
        return;
      }
      const result = applyServiceAction(action, status, g, d.week);
      if (result) { toast(result.message, 4); renderDutyDesk(); }
      return;
    }
    if (a === "retire_now") {
      const status = currentServiceStatus(g);
      if (status.obligationLeft) return;
      if (!retireArm) { retireArm = true; toast("한 번 더 누르면 현역 복무를 마칩니다", 3); renderDutyDesk(); return; }
      retireArm = false;
      finishOfficerService(g, "의무복무 이행 후 본인 지원으로 전역", status.elapsed, true);
      return;
    }
    if (a.startsWith("rep:")) { const res = resolveReport(+a.slice(4), g); if (res) { toast(res.msg, 4); renderDutyDesk(); } return; }
    if (a.startsWith("ev:")) { const [, id, idx] = a.split(":"), res = resolveDuty(id, +idx, g); if (res) { profile.xp += res.xpGain; saveProfile(); const after = myGrade(); if (after > g) { if (career.seen == null) careerInit(g, careerTitle(g), BRANCHES[br].n); career.picks += after - g; logPromotion({ g: after, t: postOf(after), b: BRANCHES[br].n, why: res.headline }); buildPromo(g, after); $("#promoM").style.display = "flex"; fanfare(after, br); } else toast(`${res.label} — 평정 ${res.score}점 · +${fmt(res.xpGain)} XP`, 3.5); refreshMenus(); renderDutyDesk(); } return; }
    if (a === "del") { const m = staffMods(g, br), res = resolveCrisisDelegate(g, br, m.outK); if (res) { profile.xp += res.xpGain; saveProfile(); const after = myGrade(); if (after > g) { career.picks += after - g; logPromotion({ g: after, t: postOf(after), b: BRANCHES[br].n, why: res.msg }); buildPromo(g, after); $("#promoM").style.display = "flex"; fanfare(after, br); } else toast(res.msg, 4); refreshMenus(); renderDutyDesk(); } return; }
    if (a === "fm") { const cr = dutyCrisisById(dutyState().crisis); dutyDirect = true; startOpMap(cr?.opAir); return; }
    if (a === "3d") { const cr = dutyCrisisById(dutyState().crisis); launchDirect3d(cr?.op3d || "navy", true); return; }
    if (a === "next") {
      const d = nextDutyWeek(svk, g, postOf(g)), status = currentServiceStatus(g, d);
      noteServiceNotice(status);
      if (status.due && !(status.extension && status.qualifies)) {
        finishOfficerService(g, status.limit.title, status.limit.month);
        return;
      }
      toast(`${careerDate(d.week)} · 새 안건이 도착했습니다`, 2.5);
      renderDutyDesk();
      return;
    }
    if (a === "admrank" && profile.admin) { const nx = Math.min(9, g + 1); if (g >= 9) return toast("원수(5성)는 특별진급 퀘스트 버튼으로 시험할 수 있습니다", 3); profile.xp = Math.max(profile.xp, ECON_RANK_XP[nx]); setCap(nx); saveProfile(); career.picks += nx - g; logPromotion({ g: nx, t: postOf(nx), b: BRANCHES[br].n, why: "관리자 진급 시험" }); buildPromo(g, nx); $("#promoM").style.display = "flex"; refreshMenus(); renderDutyDesk(); return; }
    if (a === "marshal") { const q = marshalQuest(profile, g, dutyState().rep || 0); if (!q.ok && !profile.admin) return toast("원수 특별진급 퀘스트 조건을 모두 달성해야 합니다", 3); profile.xp = Math.max(profile.xp, ECON_RANK_XP[10]); setCap(10); saveProfile(); unlockEnding(isUS() ? "us_marshal" : "kr_marshal"); logPromotion({ g: 10, t: postOf(10), b: (curBranches()[br] || BRANCHES[br]).n, why: "원수(5성) 특별진급" }); buildPromo(g, 10); $("#promoM").style.display = "flex"; fanfare(10, br); refreshMenus(); renderDutyDesk(); return; }
    if (a === "tomin") { if (g < 9 && profile.admin) { profile.xp = Math.max(profile.xp, ECON_RANK_XP[9]); setCap(9); saveProfile(); } hqView = "min"; ministerOrder(); renderMin(); toast(isUS() ? "미 국방장관(SecDef)으로 취임했습니다 — 36주 펜타곤 경영 시작" : "국방부장관으로 취임했습니다 — 36주 국방 경영 시작", 4); return; } }
  if (e.target.closest('[data-act="hqadmin"]')) { if (act({ kind: "admin", code: $("#hqAdmin").value })) { sfx.coin(); toast("관리자 모드 — 사령부 모든 자리 선택 가능"); refreshMenus(); renderHQ(); } return; }
  const tk = e.target.closest("[data-take]");
  if (tk && !profile.admin && tk.dataset.take !== "reset") { const [, g, t] = tk.dataset.take.split(":"); sfx.click(); toast(+g > myGrade() ? `${t} — ${rankLabel(+g)} 보직입니다. 그 계급으로 진급할 때 인사명령의 보직 선택에서 고를 수 있습니다` : `${t} — 상부에서 임명하는 보직입니다`, 4); return; }
  if (tk && profile.admin) { sfx.click(); if (tk.dataset.take === "reset") staff.adminPost = null; else { const [k, g, t] = tk.dataset.take.split(":"), fp = curFlagPosts().find((p) => p.t === t && p.g === +g); staff.adminPost = { b: fp ? fp.b : BRANCHES[k] ? k : staff.branch, g: +g, t: fp ? t : null }; } saveStaff(); renderHQ(); return; }
  const br = e.target.closest("[data-branch]"); if (br) { sfx.click(); const had = career.seen != null; if (!had) hqView = "duty"; setBranch(br.dataset.branch); svcDraft = null; showcase(flagshipId()); if (had) logPromotion({ g: myGrade(), t: careerTitle(myGrade()), b: BRANCHES[br.dataset.branch].n, why: "보직 변경" }); else careerInit(myGrade(), careerTitle(myGrade()), BRANCHES[br.dataset.branch].n); refreshMenus(); renderHQ(); toast(`${BRANCHES[br.dataset.branch].n} 보직 — ${careerTitle(myGrade())}`); return; } if (e.target.closest("[data-rebranch]")) { sfx.click(); staff.branch = null; hqView = "duty"; usPresPreview = false; renderHQ(); return; } const r = e.target.closest("[data-role]"); if (r) { sfx.click(); hqRole = r.dataset.role; renderHQ(); return; } const a = e.target.closest("[data-appoint]"); if (a) { sfx.click(); appoint(hqRole, a.dataset.appoint); renderHQ(); toast(`${STAFF_ROLES.find((x) => x.k === hqRole).n} 임명 — ${officer(a.dataset.appoint).rk} ${officer(a.dataset.appoint).nm}`); } });
$("#tabPort").addEventListener("click", () => { sfx.click(); openMenu(); });
function openRecord() { initAudio(); bgm("menu"); hideAll(); screen = "record"; G.state = "menu"; setTab("record"); $("#topbar").style.display = "flex"; renderRecord(); $("#recordP").style.display = "block"; showcase(flagshipId()); }
$("#tabRecord").addEventListener("click", () => { sfx.click(); openRecord(); });
function hideAll() { if (typeof md !== "undefined" && md.fly) { md.fly.pilot = false; md.fly = null; } document.body.classList.remove("jetfly"); jetSound(0); sel = []; $("#cmdrM").style.display = "none"; $("#titleHub")?.classList.remove("on"); capClear(); aa.on = false; aaGun.visible = false; paused = false; $("#pause").style.display = "none"; $("#start").style.display = "none"; $("#end").style.display = "none"; $("#yard").style.display = "none"; $("#recordP").style.display = "none"; $("#hqP").style.display = "none"; $("#promoM").style.display = "none"; document.body.classList.remove("playing", "flying", "auto", "firstp"); if (goalMk) goalMk.visible = false; }
function openYard() { return openRecord(); }
function openMenu() { G.kc = null; cicStop(); droneSound(0); setMapLook(theater); bgm("menu"); hideAll(); screen = "menu"; G.state = "menu"; setTab("menu"); $("#topbar").style.display = "flex"; $("#start").style.display = "block"; showcase(flagshipId()); refreshMenus(); }

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
let SENS = 0.6; try { const v = parseFloat(careerStorage.getItem("steeltide:sens")); if (v > 0) SENS = v; } catch {}
// AA gunner (twin 40 mm Bofors on the flagship): G toggles, mouse aims, left button / Space fires
const aa = { on: false, ammo: "mg", shells: [], yaw: 0, pitch: 0.3, fov: 65, t: 0, side: 0, recoil: [0, 0], heat: 0, shots: 0, kills: 0, kick: 0, streak: 0, streakT: 0, lastKills: 0 };
const gunner = { label: "본함 대공 사수", kills: 0, alive: false, own: true };
function toggleAA(on = !aa.on) {
  const P = G.player; if (on && (!P.alive || cap.fps)) { sfx.deny(); return; }
  aa.on = on; aaGun.visible = false;
  if (on) { const f = foeNearestPlane(); aa.yaw = f ? Math.atan2(f.pos.z - P.pos.z, f.pos.x - P.pos.x) : P.heading + PI / 2; aa.pitch = f ? clamp(Math.atan2(f.pos.y, d2(f.pos, P.pos)), 0.05, 1.3) : 0.25; aa.fov = 65; lockPointer(); toast("대공 사수 — 마우스 조준 · 좌클릭/Space 사격 · Q 기관포/대공탄 전환 · 휠 확대 · G 복귀", 3.4); }
  else { if (document.pointerLockElement) document.exitPointerLock(); toast("함대 지휘로 복귀"); }
}
const foeNearestPlane = () => null; /* no propeller aircraft any more */
const aaMount = () => { const P = G.player; P.tilt.updateWorldMatrix(true, false); const sd = Math.sin(wrap(aa.yaw - P.heading)) >= 0 ? 1 : -1; return P.tilt.localToWorld(new THREE.Vector3(-P.spec.L * 0.08, P.spec.fb + 9, (P.spec.B * 0.5 + 2.5) * sd)); };
// modern gunner view, missile mode: keep a drone/missile in the sight to lock (seek beeps → solid tone), then fire an interceptor at it
const AA_LOCK = 0.9;
function aaCands() { const P = G.player, o = aaMount(), f = dirFrom(aa.yaw, aa.pitch), out = [];
  for (const m of MSL.list) { if (!m.alive || m.side === "us" || m.W.role !== "asm" || !mSeen(m, "us")) continue; const v = m.pos.clone().sub(o), d = v.length(); if (d > 30000) continue; const ang = Math.acos(clamp(v.dot(f) / d, -1, 1)); if (ang < 0.1 * (65 / aa.fov)) out.push({ m, d, ang }); }
  for (const m of MSL.jets) { if (!m.alive || m.side !== "foe" || !mSeen(m, "us")) continue; const v = m.pos.clone().sub(o), d = v.length(); if (d > 30000) continue; const ang = Math.acos(clamp(v.dot(f) / d, -1, 1)); if (ang < 0.1 * (65 / aa.fov)) out.push({ m, d, ang }); } /* enemy jets lock up too */
  return out.sort((a, b) => a.ang - b.ang); }
function aaLockStep(dt) {
  const L = aaCands(), keep = aa.lockC && L.find((x) => x.m === aa.lockC.m), c = keep || L[0] || null;
  if (!c || (aa.lockC && c.m !== aa.lockC.m)) aa.lockT = 0; aa.lockC = c; if (!c) return;
  const was = (aa.lockT || 0) >= AA_LOCK; aa.lockT = Math.min(AA_LOCK, (aa.lockT || 0) + dt); const locked = aa.lockT >= AA_LOCK;
  aa.toneT = (aa.toneT || 0) - dt; if (aa.toneT <= 0) { if (locked) { sfx.lockSolid(); aa.toneT = 0.12; } else { sfx.lockSeek(); aa.toneT = 0.28; } } if (locked && !was) sfx.lockTone();
}
function aaMslKey(P, d) { const pd = P.spec.pd; if (pd && P.mag[pd[0]] > 0 && d < WPN[pd[0]].range) return pd[0]; return pickSam(P, d); }
function aaMslFire() {
  const P = G.player, c = aa.lockC; if ((aa.mslCd || 0) > G.time) return;
  if (!c || aa.lockT < AA_LOCK || !c.m.alive) { sfx.deny(); toast("록온 먼저 — 표적을 조준원 안에 잠깐 유지 (삐— 소리)"); return; }
  const k = aaMslKey(P, c.d); if (!k) { sfx.deny(); toast("사거리 안에 쓸 요격미사일 없음 — Q로 기관포"); return; }
  if (mLaunch(P, k, c.m)) { P.mag[k]--; c.m.engaged = (c.m.engaged || 0) + 1; aa.mslCd = G.time + 0.5; aa.shots++; G.stats.sams = (G.stats.sams || 0) + 1; log(`요격미사일 ${WPN[k].name || k} 발사 → ${c.m.W?.name || c.m.name || c.m.key} (남은 ${P.mag[k]})`, "hit"); }
}
function drawAAMsl() { // lock box and missile stock in the gunner view
  const P = G.player, W = hud.width, H = hud.height, c = aa.lockC;
  if (c && c.m.alive) { const q = proj(c.m.pos); if (q && q.on) { const locked = aa.lockT >= AA_LOCK, p = aa.lockT / AA_LOCK; hx.lineWidth = 2;
    if (locked) { hx.strokeStyle = "#ff3b30"; hx.strokeRect(q.x - 16, q.y - 16, 32, 32); txt("LOCK — Space 발사", q.x, q.y - 26, "#ff6b5e", "bold 12px 'Noto Sans KR', sans-serif", "center"); }
    else { hx.strokeStyle = "#ffd23a"; hx.beginPath(); hx.moveTo(q.x, q.y - 18); hx.lineTo(q.x + 18, q.y); hx.lineTo(q.x, q.y + 18); hx.lineTo(q.x - 18, q.y); hx.closePath(); hx.stroke(); hx.beginPath(); hx.arc(q.x, q.y, 24, -PI / 2, -PI / 2 + TAU * p); hx.stroke(); txt(`LOCKING ${Math.round(p * 100)}%`, q.x, q.y - 30, "#ffd23a", "bold 11px 'Noto Sans KR', sans-serif", "center"); } } }
  const stock = [...new Set([P.spec.pd?.[0], ...["S", "M", "L"].map((t) => P.spec.vls?.[t]?.[0])].filter(Boolean))].map((k) => `${k} ${P.mag[k] ?? 0}`).join(" · ");
  panel(W / 2 - 230, H - 76, 460, 62); txt("함대공 요격미사일 — 표적을 조준원 안에 유지 → 삐— → Space · Q: 기관포", W / 2, H - 62, "#fff", "bold 12px 'Noto Sans KR', sans-serif", "center"); txt(`남은 요격탄: ${stock}`, W / 2, H - 38, "#cfd8dc", "12px 'Noto Sans KR', sans-serif", "center");
}
function aaDrones() { // modern: the gunner's rounds also hit drones and sea-skimmers
  if (!G.modern) return; for (const b of air.aa) { if (!b.own) continue; for (const m of MSL.list) { if (!m.alive || m.side === "us" || m.W.role !== "asm" || m.W.alt === "ball") continue; if (b.p.distanceToSquared(m.pos) < (m.W.drone ? 110 : 60)) { if (rnd() < (m.W.drone ? 0.6 : 0.25)) { killMissile(m); gunner.kills++; air.hitMark = 0.35; air.killMark = 2.2; G.ribbon?.(m.W.drone ? "드론 격추" : "미사일 격추"); } b.t = 99; } } for (const j of MSL.jets) { if (!j.alive || j.side !== "foe") continue; if (b.p.distanceToSquared(j.pos) < 160) { if (rnd() < 0.35) { j.gh = (j.gh || 0) + 1; air.hitMark = 0.35; if (j.gh >= 5) { j.killedBy = G.player; killMissile(j); gunner.kills++; air.killMark = 2.2; G.ribbon?.("적기 격추"); log(`대공 기관포로 ${j.name} 격추`, "hit"); } } b.t = 99; } } }
}
function aaStep(dt) {
  aaDrones();
  aaShellStep(dt); const P = G.player; if (!aa.on) return; if (!P.alive || G.state !== "playing") { toggleAA(false); return; }
  aa.t -= dt; aa.heat = Math.max(0, aa.heat - dt * 0.14); aa.recoil = aa.recoil.map((r) => Math.max(0, r - dt * 8));
  const firing = (keys.has("Space") || (lDown && document.pointerLockElement === canvas)) && aa.heat < 1;
  if (aa.ammo === "msl") { aaLockStep(dt); if (firing && !aa.prevFire) aaMslFire(); aa.prevFire = firing; return; }
  aa.prevFire = firing;
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
      }
    if (boom || s.t > 7) { air.flak.push({ t: 0, side: "us", p: s.p.clone(), own: true, by: gunner }); aa.shells.splice(i, 1); continue; }
    if (s.p.y < 0) { aa.shells.splice(i, 1); continue; }
    if (n < 58) { const q = s.p.clone().addScaledVector(s.v, -0.03); a.set([s.p.x, s.p.y, s.p.z, q.x, q.y, q.z], n * 6); n++; }
  }
  aaShellL.geometry.setDrawRange(0, n * 2); aaShellL.geometry.attributes.position.needsUpdate = true; aaShellL.visible = n > 0;
}
function drawAAHUD() {
  const W = hud.width, H = hud.height, cx = W / 2, cy = H / 2, P = G.player; hx.textBaseline = "middle";
  { hx.save(); hx.globalAlpha = 0.8; hx.strokeStyle = hx.fillStyle = "#ff4a3d"; hx.lineWidth = 1.5; hx.beginPath(); hx.arc(cx, cy, 2.5, 0, TAU); hx.fill(); hx.beginPath(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { hx.moveTo(cx + dx * 10, cy + dy * 10); hx.lineTo(cx + dx * 18, cy + dy * 18); } hx.stroke(); hx.restore(); } // small aim dot + 4 ticks: leaves the target visible
  if (gunner.kills > aa.lastKills) { aa.streak = aa.streakT > 0 ? aa.streak + 1 : 1; aa.streakT = 6; aa.lastKills = gunner.kills; } aa.streakT = Math.max(0, aa.streakT - 1 / 60);
  if (air.killMark > 1.6) { hx.fillStyle = `rgba(255,200,120,${(air.killMark - 1.6) * 0.5})`; hx.fillRect(0, 0, W, H); }
  if (air.hitMark > 0) { hx.strokeStyle = air.killMark > 0 ? "#ff3b30" : "#ffffff"; hx.lineWidth = 4; const r = 14 + (0.35 - air.hitMark) * 40; for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { hx.beginPath(); hx.moveTo(cx + sx * r, cy + sy * r); hx.lineTo(cx + sx * (r + 12), cy + sy * (r + 12)); hx.stroke(); } }
  if (air.killMark > 0) { hx.globalAlpha = clamp(air.killMark, 0, 1); const sc = 1 + Math.max(0, air.killMark - 1.7) * 1.2; txt(aa.streak > 1 ? `${aa.streak}연속 격추!` : "적기 격추!", cx, cy - 74, "#ff3b30", `bold ${Math.round(32 * sc)}px 'Noto Sans KR', sans-serif`, "center"); hx.globalAlpha = 1; }
  else if (air.hitText > 0) txt(`명중! ×${air.hits}`, cx, cy - 56, "#ffd166", "bold 20px 'Noto Sans KR', sans-serif", "center");
  else if (air.nearMark > 0) txt("근탄 — 조금만 더 앞을 겨누세요", cx, cy - 56, "#cfe7ff", "bold 14px 'Noto Sans KR', sans-serif", "center");
  const pw = 360; panel(cx - pw / 2, H - 76, pw, 62);
  txt(aa.ammo === "msl" ? "" : G.modern && aa.ammo === "mg" ? "근접 기관포 — 좌클릭/Space 연사 · Q: 요격미사일 (록온)" : aa.ammo === "flak" ? "5인치 대공탄 (VT 근접신관) — 적기 근처에서 자동 폭발 · Q: 기관포" : "40mm 연장 대공 기관포 — Q: 대공탄", cx, H - 62, "#fff", "bold 12px 'Noto Sans KR', sans-serif", "center");
  hx.fillStyle = "rgba(255,255,255,.1)"; hx.fillRect(cx - 150, H - 48, 300, 7); hx.fillStyle = aa.heat > 0.8 ? "#ff5a4e" : "#ffd166"; hx.fillRect(cx - 150, H - 48, 300 * clamp(aa.heat, 0, 1), 7);
  txt(aa.heat >= 1 ? "총열 과열 — 잠시 대기" : `총열 온도 · 발사 ${aa.shots} · 격추 ${gunner.kills} · 배율 ×${(65 / aa.fov).toFixed(1)}`, cx, H - 30, aa.heat >= 1 ? "#ff8a7a" : "#cfd8dc", "11px 'Noto Sans KR', sans-serif", "center");
  txt(document.pointerLockElement === canvas ? "좌클릭/Space 사격 · Q 탄종 · 휠 확대 · G 복귀" : "화면을 클릭하면 마우스로 조준합니다", cx, H - 92, "rgba(232,240,242,.7)", "11px 'Noto Sans KR', sans-serif", "center");
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
  if (!T || T.side !== "foe" || !T.alive || T.captured || !P || !P.alive) return "목표 없음";
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
  const P = G.player, f = P.fwd; cap.used++; cap.phase = "boats"; cap.tgt = T; T.boarded = false; cap.supp = 0; cap.wait = 0; cap.hp = 100;
  cap.side = Math.sin(wrap(Math.atan2(T.pos.z - P.pos.z, T.pos.x - P.pos.x) - P.heading)) >= 0 ? 1 : -1;
  const sv = new THREE.Vector3(-f.z, 0, f.x).multiplyScalar(cap.side);
  cap.boats = [-1, 0, 1].map((k) => { const m = boatMesh(), p = P.pos.clone().addScaledVector(f, k * P.spec.L * 0.22).addScaledVector(sv, P.spec.B * 0.5 + 14); p.y = 0; m.position.copy(p); return { m, p, off: k, hp: 100, alive: true, arr: false, hd: P.heading + cap.side * 0.6, wakeT: 0, v: clamp(d2(P.pos, T.pos) / 70, LCVP_V, 95) }; });
  log(`해병대 상륙정 3척 발진 — 나포 목표 ${T.name} — 1.5km 안에 들어가면 사격 중지`, "hit"); sfx.click();
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
  const left = G.enemies.filter((e) => e.alive).length; log(`${T.name} 나포 성공! 태극기 게양${left ? ` — 남은 적 ${left}척` : ""}`, "hit"); sfx.bell?.(); G.radio?.(left ? "sunk" : "fleet");
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
    if (!T.boarded && live.some((b) => d2(b.p, T.pos) < 1500)) { T.boarded = true; log(`상륙정 ${T.name} 1.5km 접근 — 전 함대 해당 함 사격 중지`); }
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
let altMod = false; /* Alt from the modifier flag of the latest key/mouse event: still right when the Alt keydown itself never reached the page */
const altDown = () => keys.has("AltLeft") || keys.has("AltRight") || altMod;
const shiftDown = () => keys.has("ShiftLeft") || keys.has("ShiftRight");
const commanding = () => G.state === "playing" && !paused && !G.auto && G.player && G.player.alive;

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
G.onBombImpact = (pos, hit, miss, from) => {
  const k = markers[markerN++ % markers.length]; k.t = 9; k.pos = pos.setY(0.8); k.hit = hit; k.text = hit ? `폭탄 명중${from ? ` (${from.callsign})` : ""}` : `폭탄 빗나감 ${miss} m`;
  k.m.position.copy(k.pos); k.m.scale.setScalar(26); k.m.material.color.setHex(hit ? 0xff6b5e : 0xffb347); k.m.visible = true;
};
const navRings = []; { const g = new THREE.RingGeometry(0.82, 1, 40); g.rotateX(-PI / 2); for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x8ef07a, transparent: true, opacity: 0.8, depthTest: false })); m.visible = false; m.renderOrder = 6; scene.add(m); navRings.push(m); } }
const markers = []; { const g = new THREE.RingGeometry(0.8, 1, 40); g.rotateX(-PI / 2);
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0, depthTest: false })); m.visible = false; m.renderOrder = 4; scene.add(m); markers.push({ m, t: 0, text: "", hit: false }); } }
let markerN = 0;
G.onImpact = (pos, dr, hit, rec) => {
  if (G.modern && !hit) { if (rec && fc.tgt && fc.tgt.alive) { fc.n++; fc.sig = Math.max(fc.sig * 0.5, 0.2); fcDraw(); } return; } /* modern: no ring or 협차/근탄/원탄 label for misses, only hits are marked */
  const k = markers[markerN++ % markers.length]; k.t = 6; k.pos = pos.setY(0.8); k.hit = hit; k.text = hit ? "명중" : (Math.abs(dr) < 60 ? "협차" : dr > 0 ? "원탄 +" + fmt(dr) : "근탄 −" + fmt(-dr));
  k.m.position.copy(k.pos); k.m.scale.setScalar(G.player ? G.player.gun.cal / 406 * 28 + 8 : 20); k.m.material.color.setHex(hit ? 0xff6b5e : Math.abs(dr) < 150 ? 0x9be06a : 0xffe066); k.m.visible = true;
  if (rec && fc.tgt && fc.tgt.alive) { fc.n++; fc.sig = Math.max(fc.sig * 0.5, 0.2); fcDraw(); }
};
const TCOL3 = { dead: 0x000000, reload: 0x8a959b, arc: 0xff6b5e, turn: 0xffd166, ready: 0x8ef07a };
const tState = (t) => (!t.alive ? "dead" : t.reload > 0 ? "reload" : !t.inArc ? "arc" : t.onTarget ? "ready" : "turn");
const col = new THREE.Color();
function updateOverlays(dt) {
  const P = G.player, on = G.state === "playing" && P && P.alive && !G.auto;
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
function aimAtPoint(x, z) { const P = G.player; lock = null; corrR = corrB = 0; md.aimPt = G.modern ? (md.supPt = { x, z }) : null; if (G.modern) toast("타격 지점 지정 — Space: 그 근방 적함을 자동 표적 · ` 지휘통제실 합동 지원도 이 지점으로"); if (weapon === "torp") { torpB = Math.atan2(z - P.pos.z, x - P.pos.x); return; } P.aimB = Math.atan2(z - P.pos.z, x - P.pos.x); P.aimR = clamp(Math.hypot(x - P.pos.x, z - P.pos.z), P.tb.min, P.tb.max); }
function lockShip(T) {
  md.aimPt = null; if (G.modern) md.supPt = null; /* one marker at a time: a locked ship replaces the strike point */
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
  const P = G.player; if (!P.alive || G.auto || md.fly) return; // flying a jet: W/S/A/D belong to the aircraft
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
  if (keys.has("Space") && !aa.on && weapon === "gun" && !md.fly && P.turrets.some((t) => t.alive && t.reload <= 0 && t.onTarget)) P.fire();
  if (fireHold > 0) { fireHold -= dt; if (P.fire()) fireHold = Math.min(fireHold, 0.5); }
}
function tryFire() {
  if (!commanding()) return; const P = G.player;
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
  rep.n--; rep.cd = 60; rep.act = 20; P.fires.length = 0; P.flooding = 0; P.rudderJam = 0; P.engine = Math.max(P.engine, 0.7); sfx.bell();
  const broken = P.turrets.filter((t) => !t.alive); broken.forEach((t, i) => { t.fixT = 12 + i * 3; });
  log(`수리반 가동 — 화재·침수 진압, 조타 복구, 선체 복구${broken.length ? ` · 포탑 ${broken.length}기 수리 착수` : ""} (남은 ${rep.n}회)`);
}
function reserveStep() { // launch reserved sorties as soon as the deck (WWII) or the rearm crews (modern) allow
  if (!(G.sortieRes > 0) || G.state !== "playing") return;
  const C = myAir(); if (!C) { G.sortieRes = 0; return; } if (C.jetsReady >= 1) { G.sortieRes--; sortieJets(C, md.role); toast(`예약 출격 — ${C.cv.type} · 임무 ${JR[md.role]}${G.sortieRes ? ` (남은 예약 ${G.sortieRes})` : ""}`, 2.5); }
}
// ── air group panel: sortie role, each fighter's mission, camera ───────────
const pSig = {};
function setHTML(sel, h) { if (pSig[sel] === h) return; pSig[sel] = h; $(sel).innerHTML = h; }
function updatePanels() {
  const P = G.player; if (!P) return;
  const hp = P.hp / P.maxHp, hc = hp > 0.5 ? "ok" : hp > 0.25 ? "warn" : "bad", pct = Math.round(hp * 100), lbl = ["STOP", "SLOW", "HALF", "FULL"];
  setHTML("#shipCard", `<div class="row">${flagOf(P, 26)}<b class="st" style="font-size:15.5px">${ENG[P.spec.id] || P.spec.name}</b><span class="pct ${hc}">${pct}%</span></div>`
    + `<div class="sub">함장 ${P.captain || ""} · 사령관 ${ECON_RANKS[myGrade()]} ${cmdr.name}</div><div class="hbar"><i class="${hc}" style="width:${pct}%"></i></div>`
    + `<div class="row"><b class="tw" style="font-size:21px">${(P.speed / KN).toFixed(0)} kn</b><span class="sub">${kmh(P.speed)} km/h · ${brg(P.heading)}</span><div class="pips">${[0, 1, 2, 3].map((i) => `<button data-speed="${i}" class="${P.lv === i ? "on" : ""}">${i}${i === P.lv ? " " + lbl[i] : ""}</button>`).join("")}</div></div>`
    + `<div class="chips"><span class="chip${P.fires.length ? " fire" : ""}">화재 ${P.fires.length}</span><span class="chip${P.flooding ? " flood" : ""}">침수 ${P.flooding}</span>${P.rudderJam > 0 ? `<span class="chip bad">타 고착 ${Math.ceil(P.rudderJam)}s</span>` : ""}${P.turrets.length ? `<span class="chip${P.turrets.some((t) => !t.alive) ? " fire" : ""}">포탑 ${P.turrets.filter((t) => t.alive).length}/${P.turrets.length}</span>` : ""}<span class="chip ${P.seenByFoe ? "bad" : "ok"}">${P.seenByFoe ? "◉ 발각" : "○ 은폐"}</span><button class="chip r" data-act="repair">${rep.act > 0 ? "수리 중" : rep.cd > 0 ? `R ${Math.ceil(rep.cd)}s` : `R 수리 ×${rep.n}`}</button></div>`
    + `<div class="sub">${P.nav.length ? `이동 중 — ${(d2(P.pos, P.nav[P.nav.length - 1]) / 1000).toFixed(1)} km` : "우클릭: 이동 지점"}</div>`);
  const T = lock || G.enemy, tc = $("#tgtCard");
  if (T && T.alive && T.root.visible && !G.auto) {
    tc.classList.remove("off");
    setHTML("#tgtCard", `<div class="row">${flagOf(T, 24)}<span class="st" style="font-size:15px">${lock ? "◆ " : ""}TARGET — ${T.isCarrier ? "항모" : T.spec.cls} ${T.name}</span><span class="km">${(d2(P.pos, T.pos) / 1000).toFixed(1)} KM</span></div>`
      + `<div class="hbar"><i style="width:${Math.round((T.hp / T.maxHp) * 100)}%"></i></div><div class="sub tw" style="font-size:11.5px"><span>함장 ${T.captain || ""}${T.isrBoostT > 0 ? ` · <b style="color:#4de8d4">SAT-ISR ${Math.ceil(T.isrBoostT)}s</b>` : ""}</span><span>${P.ammo === "he" ? "HE" : "AP"} · ${lock ? fcGrade() : "더블클릭: 고정"}</span></div>${canBoard(T) ? "" : `<div class="sub" style="font-size:11.5px;color:#ffd166">⚓ B · 나포 가능 — 해병대 상륙정 발진</div>`}`);
  } else tc.classList.add("off");
  setHTML("#wpnBar", modernBar());
}
$("#wpnBar").addEventListener("mousedown", (e) => e.stopPropagation());
$("#wpnBar").addEventListener("click", (e) => { const sp = e.target.closest("[data-speed],[data-act]"); if (sp) { e.stopPropagation(); if (!commanding()) return; if (sp.dataset.speed) setSpeed(+sp.dataset.speed); else useRepair(); return; } const b = e.target.closest("[data-key]"); if (!b) return; e.stopPropagation(); window.dispatchEvent(new KeyboardEvent("keydown", { code: b.dataset.key })); setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { code: b.dataset.key })), 0); });
$("#shipCard").addEventListener("mousedown", (e) => e.stopPropagation());
$("#shipCard").addEventListener("click", (e) => { e.stopPropagation(); const b = e.target.closest("[data-speed],[data-act]"); if (!b || !commanding()) return; if (b.dataset.speed) setSpeed(+b.dataset.speed); else useRepair(); });
// modern air group panel (right side, like the WWII one): default mission, each jet's mission, fly, recall
function goalBeacon() { /* destination shown in the 3D battle too: a tall light column, a ring on the water, distance tag via the label sprite */
  const on = !!(G.goal && G.state === "playing" && G.player?.alive);
  if (!goalMk) { if (!on) return;
    goalMk = new THREE.Group();
    const col = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 1600, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x6fe6ff, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    col.position.y = 800; goalMk.add(col);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 1600, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xd8fbff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    core.position.y = 800; goalMk.add(core);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1380, 1500, 96), new THREE.MeshBasicMaterial({ color: 0x6fe6ff, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -PI / 2; ring.position.y = 3; goalMk.add(ring); goalMk.userData.ring = ring;
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 64; goalMk.userData.cv = cv;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false })); spr.position.y = 1700; spr.scale.set(1100, 275, 1); goalMk.add(spr); goalMk.userData.spr = spr;
    scene.add(goalMk); }
  goalMk.visible = on; if (!on) return;
  goalMk.position.set(G.goal.x, 0, G.goal.z);
  const t = G.time || 0; goalMk.userData.ring.material.opacity = 0.3 + Math.sin(t * 2.4) * 0.15;
  const km = (Math.hypot(G.goal.x - G.player.pos.x, G.goal.z - G.player.pos.z) / 1000).toFixed(1), s = goalMk.userData.spr;
  if (s.userData.km !== km) { s.userData.km = km; const cv = goalMk.userData.cv, x = cv.getContext("2d"); x.clearRect(0, 0, 256, 64); x.fillStyle = "rgba(4,20,26,.72)"; x.fillRect(0, 6, 256, 52); x.strokeStyle = "#6fe6ff"; x.lineWidth = 3; x.strokeRect(1.5, 7.5, 253, 49); x.fillStyle = "#e6fbff"; x.font = "bold 28px 'Noto Sans KR', sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(`${G.goal.label || "목적지"} ${km}km`, 128, 33); s.material.map.needsUpdate = true; }
  const d = Math.hypot(G.goal.x - camera.position.x, G.goal.z - camera.position.z), k = clamp(d / 9000, 0.35, 3); s.scale.set(1100 * k, 275 * k, 1);
}
let jetSig = "", jetSeq = 0;
const jetState = (j) => j === md.fly ? (md.flyAuto ? (j.support ? "공군 지원 (시점 관전)" : "자동 조종 (카메라)") : "직접 조종") : j.landT > 0 ? "착함·재무장" : j.home ? (j.support ? "발사 완료 · 귀환 중" : "귀환 중") : j.msl ? "미사일 요격" : j.heavy ? `공군 대형기 · ${j.asm}발 침투 중` : j.support ? `공군 지원 · ${j.asm}발 침투 중` : `${JR[j.role] || j.role} 임무`;
const jetDmg = (j) => { const g = Math.min(5, j.gh || 0); return Math.min(100, j.pilot ? (j.hit ? 50 : 0) + g * 10 : Math.max(j.hit ? 50 : 0, g * 20)); }; /* airframe damage % toward a kill: AI jets die at 5 gun hits or 1 missile; the flown jet survives one blow (50 %), then 5 more hits */
const jetDmgCol = (d) => (d >= 60 ? "#ff6b5e" : d >= 30 ? "#ffc857" : "#9be06a");
function renderJetPanel() {
  const el = $("#jetP"); if (!el) return; if (!G.modern || G.state !== "playing") { if (el.innerHTML) { el.innerHTML = ""; jetSig = ""; } return; }
  const C = myAir(), js = MSL.jets.filter((j) => j.alive && j.side === "us"), foeN = MSL.jets.filter((j) => j.alive && j.side === "foe" && mSeen(j, "us")).length;
  if (!js.length) { if (el.innerHTML) { el.innerHTML = ""; jetSig = ""; } return; } /* nothing airborne: the bar's fighter group covers sortie and mission */
  for (const j of js) j.id ??= ++jetSeq;
  const row = (j) => [j.id, j.name, jetState(j), j.role, j.aam, j.asm, j.flares, Math.round(Math.max(0, 1 - j.t / j.endur) * 100), jetDmg(j)];
  const sig = JSON.stringify([C ? [C.jetsReady, C.rearm?.length] : 0, md.role, G.sortieRes || 0, foeN, md.fly ? md.fly.id : 0, md.flyAuto, js.map(row)]); if (sig === jetSig) return; jetSig = sig;
  const rb = (cur, val, attrs) => `<button class="rb${cur === val ? " on" : ""}" ${attrs}>${JR[val]}</button>`;
  let h = `<div class="ah"><b>항공대 · ${C ? C.name || "비행장" : "없음"}</b><span>대기 ${C?.jetsReady ?? 0}${C?.rearm?.length ? ` · 정비 ${C.rearm.length}` : ""}${G.sortieRes ? ` · 예약 ${G.sortieRes}${C && !C.jetsReady ? (C.rearm?.length ? ` (재무장 ${Math.ceil(Math.min(...C.rearm))}초)` : " (착함 대기)") : ""}` : ""} · 비행 ${js.length}${foeN ? ` · <i>적기 ${foeN}</i>` : ""}</span></div>`;
  if (js.length) h += `<div class="ar all">전체 ${["cap", "strike", "multi"].map((r) => `<button class="rb" data-jall="${r}">${JR[r]}</button>`).join("")}<button class="rb home" data-jallhome="1">귀환</button></div>`;
  for (const j of js) { const fuel = Math.round(Math.max(0, 1 - j.t / j.endur) * 100);
    h += `<div class="pl${j === md.fly ? " sel" : ""}"><div class="pn">${j.name}${j.support ? " · 공군" : ""}<small>${jetState(j)} · 공대공 ${j.aam} · 대함 ${j.asm} · 플레어 ${j.flares ?? 0} · 연료 ${fuel}%</small></div>`
      + (() => { const dm = jetDmg(j), hp = 100 - dm, c = jetDmgCol(dm); return `<div style="flex:1 0 100%;display:flex;align-items:center;gap:6px;font:600 10.5px 'Noto Sans KR',sans-serif;font-variant-numeric:tabular-nums;color:${c}">체력<span style="flex:1;height:5px;background:rgba(255,255,255,.12)"><b style="display:block;height:100%;width:${hp}%;background:${c}"></b></span>${hp}%</div>`; })()
      + (j.support ? `<div class="ar"><button class="rb${j === md.fly ? " on" : ""}" data-jwatch="${j.id}">${j === md.fly ? "본함 복귀" : "🎥 시점 보기"}</button></div>` : `<div class="ar">${["cap", "strike", "multi"].map((r) => rb(j.role, r, `data-jp="${j.id}" data-r="${r}"`)).join("")}<button class="rb" data-jfly="${j.id}">${j === md.fly ? "복귀" : "조종"}</button><button class="rb home" data-jhome="${j.id}">귀환</button></div>`) + `</div>`; }
  el.innerHTML = h;
}
function recallAllJets() { /* 5: every fighter heads home (the one you fly stays yours) */
  let n = 0;
  { for (const j of MSL.jets) if (j.alive && j.side === "us" && !j.support && j !== md.fly && !j.home) { j.home = true; n++; } jetSig = ""; }
  if (n) { sfx.click(); toast(`전 전투기 귀환 명령 — ${n}기 (5)`); } else { sfx.deny(); toast("귀환시킬 전투기가 없습니다"); }
}
$("#jetP").addEventListener("click", (e) => e.stopPropagation());
$("#jetP").addEventListener("mousedown", (e) => {
  e.stopPropagation(); if (e.button !== 0) return; const b = e.target.closest("[data-jdef],[data-jact],[data-jall],[data-jallhome],[data-jp],[data-jfly],[data-jwatch],[data-jhome]"); if (!b || G.state !== "playing") return;
  const find = (id) => MSL.jets.find((j) => j.id === +id && j.alive);
  if (b.dataset.jdef) { md.role = b.dataset.jdef; sfx.click(); }
  else if (b.dataset.jact) modernKey("KeyF");
  else if (b.dataset.jall) setJetRole(b.dataset.jall);
  else if (b.dataset.jallhome) { for (const j of MSL.jets) if (j.alive && j.side === "us" && !j.support && j !== md.fly) j.home = true; sfx.click(); toast("전 전투기 귀환 명령"); }
  else if (b.dataset.jp) { const j = find(b.dataset.jp); if (j) { j.role = b.dataset.r; if (j.home && j.t < j.endur && (j.role === "strike" ? j.asm > 0 : j.aam > 0)) j.home = false; if (j.role === "strike" && !j.asm && !j.pilot) { j.home = true; toast(`${j.name} — 대함탄 소진, 귀환해 재무장`, 3); } sfx.click(); log(`${j.name} 임무 변경 — ${JR[j.role]}`); } }
  else if (b.dataset.jfly) { const j = find(b.dataset.jfly); if (j === md.fly) releaseFly(); else if (j) takeJet(j); }
  else if (b.dataset.jwatch) { const j = find(b.dataset.jwatch); if (j) watchJet(j); }
  else if (b.dataset.jhome) { const j = find(b.dataset.jhome); if (j) { if (j === md.fly) releaseFly(); j.home = true; sfx.click(); toast(`${j.name} 귀환`); } }
  jetSig = "";
});
$("#flyBack").addEventListener("click", (e) => { e.stopPropagation(); if (md.fly) releaseFly(); });
$("#autoBtn").addEventListener("click", (e) => { e.stopPropagation(); window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyZ" })); setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyZ" })), 0); });
function syncAutoBtn() { const b = $("#autoBtn"), t = autoFire ? `자동 공격 켜짐 — 주포${G.player?.spec.torp ? "·어뢰" : ""} (Z)` : "자동 공격 꺼짐 (Z)"; if (b.textContent !== t) b.textContent = t; b.classList.toggle("on", autoFire); }

function cycleCam() {
  const L = [null]; const T = lock || G.enemy; if (T && T.alive && T.root.visible) L.push(T);
  const i = L.indexOf(cam.tgt); cam.tgt = L[(i + 1) % L.length]; cam.free = false; sfx.click(); toast(`카메라: ${cam.tgt ? cam.tgt.name : "본함"}`);
}
function toAuto() {
  if (G.auto || G.state !== "playing" || !G.player?.alive) return;
  G.auto = true; document.body.classList.add("auto"); autoFire = false; log("자동 전투로 전환 — 관전 중 (Enter: 직접 지휘)"); toast("자동 전투 — Enter 또는 버튼으로 다시 직접 지휘");
}
let autoSpeed = 1;
function setAutoSpeed(k) { autoSpeed = k; $("#spdBtns").querySelectorAll("button").forEach((b) => b.classList.toggle("on", +b.dataset.spd === k)); toast(`관전 배속 ×${k}`); }
function takeOver() { setAutoSpeed(1); G.auto = false; document.body.classList.remove("auto"); G.player.nav = []; G.player.lv = 3; log("직접 지휘로 전환"); }
function setPause(on) {
  if (on) jetSound(0);
  if (G.state !== "playing" && G.state !== "ending") return; paused = on; $("#pause").style.display = on ? "grid" : "none"; $("#pause").classList.remove("menuset"); $("#pause h1").textContent = "일시정지"; $("#resumeBtn").textContent = "계속 (P)";
  if (on && document.pointerLockElement) document.exitPointerLock();
}
function forfeit(dest) { paused = false; if (md.fly) releaseFly(); jetSound(0); droneSound(0); cicStop(); document.body.classList.remove("jetfly", "modern"); G.state = "menu"; toast("전투 포기 — 보상 없음"); if (dest === "yard") openYard(); else openMenu(); }
function start(spectate) {
  autoSpeed = 1; $("#spdBtns")?.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.spd === "1")); initAudio(); bgm("battle"); G.auto = spectate === true; newBattle(); G.state = "playing"; screen = "battle";
  hideAll(); $("#topbar").style.display = "none"; document.body.classList.add("playing"); document.body.classList.toggle("auto", G.auto); document.body.classList.toggle("modern", !!G.modern); tutStart();
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
function lockPointer() { try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch {} }
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
$("#plot").addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("mousedown", (e) => {
  mouseX = e.clientX; mouseY = e.clientY; initAudio();
  const st = { x: e.clientX, y: e.clientY, d: 0 };
  if (e.button === 3 || e.button === 4) { e.preventDefault(); if (e.button === 3 && md.fly && G.state === "playing") flyFire(); return; } /* mouse back (side) button: air-to-air while flying a jet */
  altMod = e.altKey; if (e.button === 1) { mDown = st; e.preventDefault(); if (md.fly) md.lookHeld = true; /* jet: hold the wheel button to look around, same as Alt */ return; }
  if (e.button === 2) { rDown = st; if (md.fly && G.state === "playing" && !paused) flyFire(); return; }
  if (e.button !== 0) return; lDown = st;
  if (G.modern && e.ctrlKey && G.state === "playing" && !md.fly && !paused) { const h = pick(e.clientX, e.clientY); if (h) { md.aimPt = md.supPt = { x: h.x, z: h.z }; lock = null; sfx.click(); toast("타격 지점 지정 — Space: 그 근방 적함을 자동 표적 · ` 지휘통제실 합동 지원도 이 지점으로"); } return; }
  if (md.fly && G.state === "playing" && !paused) { if (document.pointerLockElement !== canvas) lockPointer(); return; }
  if ((aa.on || cap.fps) && G.state === "playing" && !paused) { lockPointer(); return; }
});
canvas.addEventListener("dblclick", (e) => {
  if (!commanding()) return; const h = pick(e.clientX, e.clientY); if (!h) return;
  const foe = h.ship && h.ship.side === "foe" ? h.ship : null; if (foe) lockShip(foe); else { aimAtPoint(h.x, h.z); sfx.click(); }
});
window.addEventListener("mouseup", (e) => {
  if (e.button === 1) { mDown = null; md.lookHeld = false; }
  if (e.button === 2 && rDown) { const click = rDown.d < 6 && !cap.fps; rDown = null; if (click && commanding() && e.target === canvas) { const h = pick(e.clientX, e.clientY); if (h) orderSelected(h, e.shiftKey); } }
  if (e.button === 0 && lDown) { const L = lDown; lDown = null; if (screen === "battle" && commanding() && !aa.on && !cap.fps && e.target === canvas) { if (L.box) boxSelect(L.x, L.y, e.clientX, e.clientY, e.shiftKey); else if (L.d < 5 && e.altKey) clickSelect(e.clientX, e.clientY, e.shiftKey); } }
});
document.addEventListener("mousemove", (e) => {
  const dx = e.movementX, dy = e.movementY; mouseX = e.clientX; mouseY = e.clientY;
  altMod = e.altKey; if (md.fly && G.state === "playing" && document.pointerLockElement === canvas) { const s = SENS / 0.6; if (altDown() || md.lookHeld) { md.lookYaw = clamp((md.lookYaw || 0) + dx * 0.004, -3.1, 3.1); md.lookPitch = clamp((md.lookPitch || 0) - dy * 0.004, -1.2, 1.2); } else { md.mdx = (md.mdx || 0) + dx * s; md.mdy = (md.mdy || 0) + dy * s; } return; }
  for (const s of [lDown, rDown, mDown]) if (s) s.d += Math.abs(dx) + Math.abs(dy);
  if (lDown && lDown.d > 4 && !aa.on && !cap.fps && screen === "battle" && e.buttons & 1 && e.altKey && commanding()) { lDown.box = true; return; }
  if (lDown && lDown.d > 4 && !aa.on && !cap.fps && screen === "battle" && e.buttons & 1) { // left-drag: pan the camera freely over the sea
    const k = (2 * (cam.map ? cam.mapDist : cam.dist) * Math.tan((camera.fov * DEG) / 2)) / innerHeight, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), vk = cam.map ? 1 : 1 / Math.max(Math.sin(cam.pitch), 0.4);
    cam.free = true; cam.tgt = null; cam.focus.x += (sy * dx + cy * dy * vk) * k; cam.focus.z += (-cy * dx + sy * dy * vk) * k; return;
  }
  if (cap.fps && G.state === "playing" && (document.pointerLockElement === canvas || (lDown && e.buttons & 1))) { const k = 0.0022 * SENS / 0.6; cap.yaw = wrap(cap.yaw + dx * k); cap.pitch = clamp(cap.pitch - dy * k, -1.2, 1.2); return; }
  if (aa.on && G.state === "playing" && (document.pointerLockElement === canvas || (lDown && e.buttons & 1))) { const k = (aa.fov / 55) * 0.0022 * SENS / 0.6; aa.yaw = wrap(aa.yaw + dx * k); aa.pitch = clamp(aa.pitch - dy * k, -0.12, 1.5); return; }
  const rot = (mDown && e.buttons & 4) || (rDown && rDown.d > 6 && e.buttons & 2);
  if (!rot) return;
  if (screen !== "battle") { cam.orbYaw += dx * 0.005; cam.orbPitch = clamp(cam.orbPitch + dy * 0.004, 0.03, 1.2); return; }
  { cam.yaw = wrap(cam.yaw + dx * 0.005); cam.pitch = clamp(cam.pitch + dy * 0.004, 0.3, 1.5); }
});
window.addEventListener("wheel", (e) => {
  const f = Math.exp(e.deltaY * 0.0012);
  if (e.target === plot) { plotZoom = clamp(plotZoom * f, 0.25, 4); return; }
  if (screen !== "battle") cam.orbDist = clamp(cam.orbDist * f, 60, 2200);
  else if (aa.on) aa.fov = clamp(aa.fov * f, 14, 80);
  else if (G.modern && md.fly && !md.flyAuto) md.fly.thr = clamp((md.fly.thr || (md.fly.heavy ? 165 : 240)) - Math.sign(e.deltaY) * (md.fly.heavy ? 8 : 16), md.fly.heavy ? 125 : 110, md.fly.heavy ? 185 : md.fly.hit ? 250 : 330);
  else if (cam.map) cam.mapDist = clamp(cam.mapDist * f, 3000, 45000);
  else cam.dist = clamp(cam.dist * f, 160, 18000);
}, { passive: true });
$("#plot").addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); if (!commanding()) return; const p = plotPick(e); if (e.button === 2) moveOrder(p.x, p.z, e.shiftKey); else if (e.button === 0) aimAtPoint(p.x, p.z); });
window.addEventListener("keydown", (e) => {
  altMod = e.altKey; if (e.code === "AltLeft" || e.code === "AltRight") e.preventDefault();
  if (e.target && e.target.tagName === "INPUT") return;
  if (["Tab", "Space", "AltLeft", "AltRight", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
  if (e.repeat) return; keys.add(e.code);
  if (cap.fps && G.state === "playing") { if (e.code === "KeyR" && cap.phase === "deck" && cap.ammo < 8 && cap.rel <= 0) cap.rel = 2.2; if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyR", "KeyQ", "KeyZ", "KeyF", "KeyG", "KeyB", "Space", "Digit1", "Digit2", "Digit3", "Digit4", "Digit0", "Enter", "Tab", "KeyM"].includes(e.code)) return; }
  if (e.code === "Escape" && tut.mode && G.state === "playing") { tutDone(); toast("튜토리얼 건너뜀 (설정에서 다시 볼 수 있음)"); return; }
  if (e.code === "KeyP" && screen === "battle" && (G.state === "playing" || G.state === "ending")) { setPause(!paused); return; }
  if (e.code === "KeyU" && screen === "battle") { cinema = !cinema; document.body.classList.toggle("cinema", cinema); return; }
  if (G.state !== "playing" || paused) return;
  if (e.code === "KeyH") { helpOn = !helpOn; return; }
  if (e.code === "Tab" && md.fly) { releaseFly(); toast("본함 시점으로 복귀"); return; } // Tab while flying: straight back to the flagship
  if (e.code === "Tab") { cycleCam(); return; }
  if (e.code === "KeyM") { cam.map = !cam.map; sfx.click(); toast(cam.map ? "지도 시점 — 휠: 축척 · 좌클릭 끌기: 이동 · M: 복귀" : "지휘 시점"); return; }
  if (e.code === "KeyC") { cam.free = false; cam.tgt = null; sfx.click(); toast("카메라: 기함"); return; }
  if (e.code === "KeyJ" && G.state === "playing") { if (G.auto) takeOver(); else toAuto(); return; }
  if (e.code === "Enter") {
    if (G.auto) { takeOver(); return; }
    if (md.fly) releaseFly(); else takeJet(); return;
  }
  if (G.auto) return;
  if (e.code === "Digit5" && G.state === "playing") { recallAllJets(); return; }
  if (G.modern && G.state === "playing" && !cap.fps && modernKey(e.code)) return; // modern keys first: G = jets, I = fly, B = jet's anti-ship missiles
  if (e.code === "KeyB" && G.state === "playing") { startBoard(); return; }
  if (e.code === "KeyV" && cap.phase) { toggleCapFps(); return; }
  if (/^Digit[1-3]$/.test(e.code)) setSpeed(+e.code.slice(5));
  if (e.code === "Digit0" || e.code === "Backquote") setSpeed(0);
  if (e.code === "KeyQ" && aa.on) { aa.ammo = aa.ammo === "mg" ? "flak" : "mg"; aa.t = 0.3; sfx.click(); toast(aa.ammo === "flak" ? "대공탄 — 느리지만 적기 근처에서 터져 넓게 피해" : "기관포 — 빠른 연사, 직격해야 피해"); return; }
  if (e.code === "KeyQ") { if (G.player.spec.torp) { weapon = weapon === "gun" ? "torp" : "gun"; sfx.click(); toast(weapon === "torp" ? "어뢰 — A/D로 방향, Space 발사 (Q: 주포)" : "주포 (Q: 어뢰)"); } else { sfx.deny(); toast("이 함선에는 어뢰가 없습니다"); } }
  if (e.code === "KeyR") useRepair();
  if (e.code === "KeyZ") { autoFire = !autoFire; sfx.click(); toast(autoFire ? `자동 공격 켬 — 주포${G.player.spec.torp ? "·어뢰" : ""} 자동 조준·발사 (Z: 끄기)` : "자동 공격 끔 (Z)"); }
  if (e.code === "Space" && !aa.on && !cap.fps) tryFire();
});
window.addEventListener("keyup", (e) => { if (e.code === "AltLeft" || e.code === "AltRight") e.preventDefault(); keys.delete(e.code); altMod = e.altKey; if (e.code === "Space") air.firing = false; });
window.addEventListener("blur", () => { keys.clear(); altMod = false; if (typeof md !== "undefined") md.lookHeld = false; });
$("#pauseBtn").addEventListener("click", (e) => { e.stopPropagation(); setPause(true); });
$("#resumeBtn").addEventListener("click", () => { const o = $("#pause"); if (o.classList.contains("menuset")) { o.style.display = "none"; o.classList.remove("menuset"); } else setPause(false); });
function openSettings() { if (G.state === "playing" || G.state === "ending") { setPause(true); return; } const o = $("#pause"); o.classList.add("menuset"); o.querySelector("h1").textContent = "설정"; $("#resumeBtn").textContent = "닫기"; o.style.display = "grid"; }
$("#setBtn").addEventListener("click", openSettings);
$("#quitYardBtn").addEventListener("click", () => forfeit("yard")); $("#quitMenuBtn").addEventListener("click", () => forfeit("menu"));
$("#goBtn").addEventListener("click", () => { campSel = null; start(false); }); $("#watchBtn").addEventListener("click", () => { campSel = null; start(true); }); $("#yardBtn").addEventListener("click", openYard);
$("#againBtn").addEventListener("click", () => start(G.auto)); $("#endYardBtn").addEventListener("click", openYard); $("#menuBtn").addEventListener("click", openMenu);
$("#takeBtn").addEventListener("click", takeOver); $("#spdBtns").addEventListener("click", (e) => { const b = e.target.closest("[data-spd]"); if (b) { e.stopPropagation(); setAutoSpeed(+b.dataset.spd); } }); $("#autoModeBtn").addEventListener("click", (e) => { e.stopPropagation(); toAuto(); });
for (const k of ["sfx", "music"]) { const el = $("#vol_" + k); el.value = A.vol?.[k] ?? el.value; el.addEventListener("input", () => setVolume(k, +el.value)); }
$("#bgmOn").checked = A.bgmOn; $("#bgmOn").addEventListener("change", (e) => { initAudio(); setBgmOn(e.target.checked); });
let glassOn = true; try { glassOn = careerStorage.getItem("steeltide:glass") !== "0"; } catch {} document.body.classList.toggle("noglass", !glassOn); $("#glassOn").checked = glassOn;
$("#postOn").checked = post.on; $("#postOn").addEventListener("change", (e) => { post.on = e.target.checked; try { careerStorage.setItem("steeltide:post", post.on ? "1" : "0"); } catch {} });
$("#glassOn").addEventListener("change", (e) => { glassOn = e.target.checked; document.body.classList.toggle("noglass", !glassOn); try { careerStorage.setItem("steeltide:glass", glassOn ? "1" : "0"); } catch {} });
$("#sens").value = SENS; $("#sensV").textContent = SENS.toFixed(2);
$("#sens").addEventListener("input", (e) => { SENS = +e.target.value; $("#sensV").textContent = SENS.toFixed(2); try { careerStorage.setItem("steeltide:sens", String(SENS)); } catch {} });
window.addEventListener("pointerdown", () => initAudio(), { once: true });
for (const ev of ["mouseup", "auxclick"]) window.addEventListener(ev, (e) => { if ((e.button === 3 || e.button === 4) && G.state === "playing") e.preventDefault(); }); /* the mouse back/forward buttons must not leave the game page during a battle */ for (const ev of ["click", "keydown"]) window.addEventListener(ev, () => initAudio()); /* resume sound (and the music) if the browser kept it suspended */
/** Flight lock-on: the nearest enemy fighter in front, else the enemy ship nearest the nose. */

// ── cameras ─────────────────────────────────────────────────────────────────
const camPos = new THREE.Vector3(-260, 80, 120), tmp = new THREE.Vector3(), FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI), eu = new THREE.Euler();
let near = 4;
function setNear(n) { if (Math.abs(n - near) > 0.05) { near = n; camera.near = n; camera.updateProjectionMatrix(); } }
/** Returns "cockpit" | "flight" | "watch" | "command" | null (menus). */
function updateCamera(dt) {
  const P = G.player; jetPit.visible = false; garandVM.visible = mgVM.visible = false;
  if (screen !== "battle" || !P) {
    if (showAir && screen !== "battle") {
      showAir.position.y = 240 + Math.sin(G.time * 0.9) * 3.5; showAir.rotation.z = Math.sin(G.time * 0.45) * 0.08;
      const a = cam.orbYaw + G.time * 0.07, R = 92;
      camera.position.set(Math.cos(a) * R, 258 + Math.sin(G.time * 0.5) * 6, Math.sin(a) * R);
      camera.fov = 44; setNear(2); camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); camera.lookAt(showAir.position); return null;
    }
    const L = P ? P.spec.L : 190, R = cam.orbDist * (L / 190) * 1.05, a = cam.orbYaw + G.time * 0.04;
    camera.position.set(Math.cos(a) * Math.cos(cam.orbPitch) * R, Math.sin(cam.orbPitch) * R + 8, Math.sin(a) * Math.cos(cam.orbPitch) * R).add(P ? P.pos : tmp.set(0, 0, 0));
    camera.fov = 42; setNear(4); camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); camera.lookAt(P ? P.pos.clone().setY(L * 0.06) : tmp.set(0, 0, 0)); return null;
  }
  G.shake = (G.shake || 0) * Math.exp(-dt * 4.5);
  mapGrid.visible = false; scene.fog.density = 0.00005;
  if (G.kc && !(md.fly && md.fly.alive)) { // kill-cam: slow orbit around the ship going down
    const s = G.kc.ship, L = s.spec.L, u = 1 - G.kc.t / 2.5, a = G.kc.a + u * 0.9, R = L * 1.7 + 170; setNear(1.2);
    camera.position.set(s.pos.x + Math.cos(a) * R, L * 0.3 + 28 + u * 22, s.pos.z + Math.sin(a) * R); camPos.copy(camera.position); camera.fov = 50; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); camera.lookAt(s.pos.x, L * 0.04, s.pos.z); aaGun.visible = false; return "kill";
  }
  if (G.modern && md.fly && md.fly.alive) { flyCamera(dt); aaGun.visible = false; return "fly"; }
  if (G.modern && MSL.cam && missileCamera(dt)) { aaGun.visible = false; return "missile"; }
  if (cap.fps && cap.phase && capCamera()) { aaGun.visible = false; return "board"; }
  if (aa.on && P.alive) {
    setNear(0.5); const o = aaMount(); camera.position.copy(o); if (G.shake > 0.01) camera.position.y += (Math.random() - 0.5) * G.shake * 0.08;
    scene.fog.density = 0.000022; camera.fov = aa.fov; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); aa.kick = Math.max(0, aa.kick - dt * 14); camera.lookAt(o.clone().add(dirFrom(aa.yaw, aa.pitch + aa.kick * 0.0025))); aaGun.visible = true; updateAAGun(aa.recoil); return "aa"; // steady sight: only a small smooth climb per shot
  }
  aaGun.visible = false;
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
// ── 현대전: offence AI, player salvo, air-defence modes, missile camera, HUD ──
const md = { salvo: 2, mode: "auto", decoyCd: 0, fireCd: 0, eCd: 0, q: [], role: "multi", flyAuto: false };
const JR = { cap: "요격", strike: "함선 공격", multi: "다목적" }, JR_NEXT = { multi: "cap", cap: "strike", strike: "multi" };
const JR_D = { cap: "적기·대함미사일만 요격, 함대 상공 초계", strike: "저공 침투해 적함에 대함미사일 — 공대공은 자위용", multi: "요격하다가 적함이 보이면 대함 공격" };
function setJetRole(r) { // N: the mission for the next sortie and every friendly jet already airborne
  md.role = r; let n = 0; for (const j of MSL.jets) if (j.alive && j.side === "us" && !j.gone) { j.role = r; n++; if (j.home && !j.pilot && j.t < j.endur && (r === "strike" ? j.asm > 0 : j.aam > 0)) j.home = false; if (r === "strike" && !j.asm && !j.pilot) j.home = true; }
  sfx.click(); tip("role" + r, `전투기 임무: ${JR[r]} — ${JR_D[r]}${n ? ` (비행 중 ${n}기 포함${r === "strike" && MSL.jets.some((j) => j.alive && j.side === "us" && !j.asm && !j.pilot) ? " · 대함탄 없는 기체는 귀환해 재무장" : ""})` : ""} · N: 임무 변경`, `전투기 임무: ${JR[r]}`, 4); log(`전투기 임무 변경 — ${JR[r]}`);
}
function setFlyAuto(on) { // K: let the jet you're flying fly its mission itself; the camera stays with it
  const j = md.fly; if (!j || j.landT > 0) return;
  if (j.support && !on) { toast("공군 지원기는 자동 타격 임무로 비행합니다 (V: 조종석/외부 · Tab: 본함 복귀)", 3); return; }
  md.flyAuto = on; sfx.click();
  if (on) { j.pilot = false; j.home = j.t > j.endur; if (document.pointerLockElement) document.exitPointerLock(); tip("auto", `자동 조종 — 임무 "${JR[j.role] || j.role}" 수행 중 · K: 수동 복귀 · N: 임무 변경`, `자동 조종 · ${JR[j.role] || j.role}`, 4); }
  else { const v = j.vel.clone().normalize(); j.pilot = true; j.home = false; j.pyaw = Math.atan2(v.z, v.x); j.ppitch = Math.asin(clamp(v.y, -1, 1)); j.thr = 240; j.q.copy(new THREE.Quaternion().setFromAxisAngle(QY, -j.pyaw).multiply(new THREE.Quaternion().setFromAxisAngle(QZ, j.ppitch))); md.mdx = md.mdy = 0; lockPointer(); toast("수동 조종 — K: 자동 조종", 2.5); }
}
const asmKey = (S) => S.spec.vls.A?.[0];
function modernStep(dt) {
  reserveStep(); stepFlares(dt);
  opsStep(dt, { P: G.player, log, toast, radio: G.radio, onSubKill: (s) => { G.ribbon?.("잠수함 격침"); G.stats.dealt = (G.stats.dealt || 0) + 60; } });
  if (OPSO.msg) { log(OPSO.msg, "hit"); G.ribbon?.("목표 파괴"); OPSO.msg = null; }
  cicStep(dt, opsMarks());
  { let dd = Infinity; for (const m of MSL.list) if (m.alive && m.W.drone) dd = Math.min(dd, m.pos.distanceTo(camera.position)); droneSound(paused || G.state !== "playing" ? 0 : clamp(1 - dd / 2000, 0, 1) ** 1.3 * 0.9); }
  if (G.dryT != null) G.dryT -= dt;
  for (let i = md.q.length - 1; i >= 0; i--) { const o = md.q[i]; o.t -= dt; if (o.t <= 0 && o.jet) { md.q.splice(i, 1); if (o.S.alive && G.state === "playing") launchJet(o.S, o.role, o.S.cv, o.S.isBase ? o.S.pos.clone().setY(300) : null); continue; } if (o.t <= 0) { md.q.splice(i, 1); if (o.S.alive && (!o.T || o.T.alive) && G.state === "playing") { const m = mLaunch(o.S, o.k, o.T); if (m && o.est) m.est = o.est.clone(); if (o.cam && m) MSL.last = m; } } }
  md.mode = cicWcs(); md.salvo = 2; // air defence WCS controlled by CIC (FREE / TIGHT / HOLD)
  if (md.fly) { const j = md.fly; if (!j.alive || G.state !== "playing") { md.fly = null; document.body.classList.remove("jetfly"); if (document.pointerLockElement) document.exitPointerLock(); if (j.gone) toast("자동 조종으로 착함 — 재무장 후 대기 · 함대 지휘로 복귀", 3); else if (!j.alive) toast("격추당했습니다 — 함대 지휘로 복귀", 3); md.flyAuto = false; }
    else if (md.flyAuto) { (j.q ??= new THREE.Quaternion()).copy(j.mesh.quaternion); const f = QX.clone().applyQuaternion(j.q); j.pyaw = Math.atan2(f.z, f.x); j.ppitch = Math.asin(clamp(f.y, -1, 1)); md.flyLock = null; }
    else { if (!(j.landT > 0)) flyControl(dt, j); lockStep(dt); if (j.t > j.endur + 120) { releaseFly(); j.home = true; toast("연료 부족 — 자동 귀환"); } } }
  if (md.fly) jetSound(paused ? 0 : 1, (md.fly.thr - 110) / 220);
  else { let dn = Infinity; for (const o of MSL.jets) if (o.alive && !o.landT) dn = Math.min(dn, o.pos.distanceTo(camera.position)); jetSound(paused || G.state !== "playing" ? 0 : clamp(1 - dn / 2600, 0, 1) ** 1.5 * 0.75, 0.55); } // jets flying past the camera are heard too
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
  stepJets(dt, know, (j, ev, x, n) => { if (ev === "relaunch") { toast(`${j.name} 재출격 — 무장 완충`, 3); return; } if (ev === "lost") log(`${j.side === "us" ? "아군" : "적"} ${j.name} 격추${x ? ` — ${x.isJet ? `${x.side === "us" ? "아군" : "적"} ${x.name}의 공대공 미사일` : `${x.name}의 대공 방어`}` : ""}`, j.side === "us" ? "bad" : "hit"); else if (ev === "strike") { log(`${j.side === "us" ? "아군" : "적"} ${j.name} 편대 ${WPN[j.asmKey].name}${n ? ` ${n}발` : ""} 발사 → ${x.name}`, j.side === "us" ? "hit" : "bad"); if (j.side === "us" && j.support) toast(`${j.name} — ${WPN[j.asmKey].name} 일제 발사! → ${x.name} (T: 미사일 추적)`, 4); } else if (ev === "land") log(`${j.name} 착함 — 재무장 60초`); else if (ev === "leave") log(`${j.name} 임무 완료 — 작전 공역 이탈`, "hit"); });
  for (const s of [...G.ships, ...(G.bases || [])]) if (s.cv && s.alive && (s.side === "foe" || G.auto || autoFire)) { // computer air wing: CAP early, strikes when it knows where we are
    s.airT = (s.airT ?? (s.side === "foe" ? 6 + rnd() * 8 : 12 + rnd() * 10)) - dt; if (s.airT > 0) continue; s.airT = 25;
    const up = MSL.jets.filter((j) => j.alive && j.owner === s).length;
    if (up < (s.side === "foe" ? 4 : 2) && s.jetsReady >= 2) { sortieJets(s, "multi"); s.airT = 45; } /* enemy air wings keep up to four jets up and launch early */
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
    const n = Math.min(S.mag[use], use === kb ? (WPN[kb].cls === "hyp" ? 1 : 2) : 2 + ((rnd() * 2) | 0)); // same salvo rules both sides
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
// Flying a jet: full attitude control. S/W pitch (S pulls up), A/D roll, Q/E rudder, mouse = fine pitch/yaw, Shift/C throttle,
// left button = 20 mm cannon, Space/right button = air-to-air missile, X = flares, Alt + mouse = look around (behind).
const QZ = new THREE.Vector3(0, 0, 1), QX = new THREE.Vector3(1, 0, 0), QY = new THREE.Vector3(0, 1, 0), dq = new THREE.Quaternion();
function flyControl(dt, j) {
  const k = (a, b) => (keys.has(a) ? 1 : 0) - (keys.has(b) ? 1 : 0), sp = clamp(j.vel.length() / (j.heavy ? 165 : 240), 0.5, 1.2);
  const msens = j.heavy ? 0.0011 : 0.0026; // heavy transport: slower control response, no aerobatics
  const rate = j.heavy ? 0.36 : 1;
  const pitch = (k("KeyS", "KeyW") * 1.45 * rate * dt - (md.mdy || 0) * msens) * sp, roll = k("KeyD", "KeyA") * 2.8 * rate * dt, yaw = (k("KeyE", "KeyQ") * 0.5 * dt + (md.mdx || 0) * msens * 0.8) * (j.heavy ? 0.55 : 1); md.mdx = md.mdy = 0;
  j.q.multiply(dq.setFromAxisAngle(QZ, pitch)).multiply(dq.setFromAxisAngle(QX, roll)).multiply(dq.setFromAxisAngle(QY, -yaw)).normalize();
  if (j.heavy) {
    // No aerobatics: clamp pitch (±20°) and roll/bank (±30°), and gently auto-level bank when A/D are released
    eu.setFromQuaternion(j.q, "YXZ");
    const minP = -0.35, maxP = 0.35, maxR = 0.52;
    const fx = QX.clone().applyQuaternion(j.q), upV = QY.clone().applyQuaternion(j.q);
    const py = -Math.atan2(fx.z, fx.x), pp = clamp(Math.asin(clamp(fx.y, -1, 1)), minP, maxP);
    const rt = new THREE.Vector3(-Math.sin(-py), 0, Math.cos(-py)), pr = clamp(Math.asin(clamp(upV.dot(rt), -1, 1)), -maxR, maxR);
    const bank = Math.abs(roll) < 1e-4 ? pr * Math.max(0, 1 - dt * 1.4) : pr;
    j.q.setFromAxisAngle(QY, py).multiply(dq.setFromAxisAngle(QZ, pp)).multiply(dq.setFromAxisAngle(QX, bank)).normalize();
  }
  j.gT = !j.heavy && Math.abs(pitch) + Math.abs(yaw) > 0.5 * dt ? 0.8 : Math.max(0, (j.gT || 0) - dt); // hard manoeuvring makes you harder to hit
  const f = QX.clone().applyQuaternion(j.q); j.pyaw = Math.atan2(f.z, f.x); j.ppitch = Math.asin(clamp(f.y, -1, 1));
  j.thr = clamp(j.thr + ((shiftDown() ? 1 : 0) - (keys.has("KeyC") ? 1 : 0)) * (j.heavy ? 65 : 130) * dt, j.heavy ? 125 : 110, j.heavy ? 185 : j.hit ? 250 : 330); // wheel (or Shift/C): throttle
  if (!altDown() && !md.lookHeld) { md.lookYaw = (md.lookYaw || 0) * Math.max(0, 1 - dt * 10); md.lookPitch = (md.lookPitch || 0) * Math.max(0, 1 - dt * 10); }
  j.gunT = (j.gunT || 0) - dt; let burst = false;
  if (lDown && document.pointerLockElement === canvas && !altDown() && !md.lookHeld) { if (j.gun <= 0) { if (j.gunT <= 0) { sfx.deny(); j.gunT = 0.6; } } else while (j.gunT <= 0) { j.gunT += 0.045; j.gun -= 2; burst = true; const r = jetGun(j); if (r) { md.gunHit = 0.25; if (r === "kill") log(`${j.name} 기관포로 격추!`, "hit"); } } }
  else j.gunT = Math.max(j.gunT, 0);
  if (burst) { md.gunS = (md.gunS || 0) - dt; if (md.gunS <= 0) { md.gunS = 0.07; sfx.vulcan(); } G.shake = Math.min((G.shake || 0) + 0.04, 0.3); }
  md.gunHit = Math.max(0, (md.gunHit || 0) - dt);
  const inc = MSL.list.filter((m) => m.alive && m.target === j).length; md.rwr = inc; md.rwrT = (md.rwrT || 0) - dt; if (inc && md.rwrT <= 0) { md.rwrT = 0.55; sfx.rwr(); }
}
function flyLand() {
  const j = md.fly, o = j?.owner; if (!j || j.landT > 0) return;
  if (!o || o.alive === false || !o.cv || !o.spec || !o.fwd) { sfx.deny(); toast("착함할 항모 없음"); return; }
  j.landT = 20; sfx.bell(); log(`${j.name} 착함 — 재급유·재무장 20초 후 재출격`, "hit"); toast("착함 성공 — 20초 재무장", 3);
}
G.onStrafe = (S, what) => { log(what === "radar" ? `기관포 기총소사 — ${S.name} 레이더 파괴! 탐지 거리 감소` : `기관포 기총소사 — ${S.name} CIWS 파괴!`, "hit"); G.ribbon?.(what === "radar" ? "레이더 파괴" : "CIWS 파괴"); };
function flyFlare() { const j = md.fly; if (!j) return; if (j.flares <= 0 || (j.flareCd || 0) > G.time) { sfx.deny(); return; } const k = Math.min(j.flares, 4); j.flares -= k; j.flareCd = G.time + 0.6; const n = jetFlare(j, k); sfx.flare(); toast(n ? `플레어·채프 ${k}발 — 미사일 ${n}발 따돌림 (남은 ${j.flares})` : `플레어·채프 ${k}발 사출 (남은 ${j.flares})`, 1.6); }
G.onJetHit = (j) => { G.shake = 1.5; sfx.explode(0); log(`${j.name} 피격 — 기체 손상! 속도 저하, 한 번 더 맞으면 격추`, "bad"); toast("피격! 기체 손상 — 귀환(I)을 권장", 4); };
function takeJet(pick) {
  let j = pick && pick.alive && !pick.gone ? pick : MSL.jets.find((x) => x.alive && x.side === "us" && !x.home && !x.support); const C = myAir(); if (md.fly && md.fly !== j) releaseFly();
  if (!j && C && C.jetsReady > 0) { C.jetsReady--; j = launchJet(C, md.role, C.cv); }
  if (!j) { sfx.deny(); toast("조종할 전투기 없음"); return; }
  md.fly = j; md.flyAuto = false; document.body.classList.add("jetfly"); j.pilot = true; j.home = false; j.pyaw = Math.atan2(j.vel.z, j.vel.x); j.ppitch = 0.12; j.thr = 240; lockPointer(); sfx.click();
  j.q = new THREE.Quaternion().setFromAxisAngle(QY, -j.pyaw).multiply(new THREE.Quaternion().setFromAxisAngle(QZ, j.ppitch)); j.gun ??= 480; j.flares ??= flaresOf(j.name); md.mdx = md.mdy = 0; md.lookYaw = md.lookPitch = 0;
  tip("fly", `${j.name} 조종 — W/S 기수 위·아래 · 마우스 휠 출력(속력) · A/D 롤 · 좌클릭 기관포 · Space 대함(2발씩) · 마우스 뒤로가기 버튼(또는 B) 공대공(록온 후) · T 표적 전환 · X 플레어 · K 자동 조종`, `${j.name} 직접 조종 · H: 조종 키`, 6);
}
function watchJet(j) {
  if (!j || !j.alive) return;
  if (md.fly === j) { releaseFly(); return; }
  if (md.fly) releaseFly();
  j.q = j.mesh.quaternion.clone(); j.thr ??= j.heavy ? 165 : 285; j.gun ??= 0; j.flares ??= flaresOf(j.name);
  const f = QX.clone().applyQuaternion(j.q); j.pyaw = Math.atan2(f.z, f.x); j.ppitch = Math.asin(clamp(f.y, -1, 1));
  md.fly = j; md.flyAuto = true; md.flyFP = false;
  document.body.classList.add("jetfly"); j.pilot = false;
  md.lookYaw = md.lookPitch = 0; sfx.click();
  toast(`${j.name} 시점 관전 — 목표 접근 및 미사일 발사 확인 (V: 조종석/외부 · Alt+마우스: 둘러보기 · Tab: 본함 복귀)`, 5);
}
function watchMsl(m) {
  if (!m || !m.alive) return;
  if (md.fly) releaseFly();
  MSL.cam = m; sfx.click();
  toast(`${m.W.name} 미사일 추적 시점 (T 또는 Tab: 본함 복귀)`, 4);
}
function releaseFly() { md.flyAuto = false; document.body.classList.remove("jetfly"); if (md.fly) { md.fly.mesh.visible = true; md.fly.pilot = false; md.fly = null; } if (document.pointerLockElement) document.exitPointerLock(); toast("자동 조종 — 함대 지휘로 복귀"); }
const LOCK_T = 1.3; // seconds of keeping a target in the seeker cone before the missile can be fired
function lockCands() { const j = md.fly; if (!j) return []; const f = dirFrom(j.pyaw, j.ppitch), out = [];
  for (const o of [...MSL.jets.filter((x) => x.alive && x.side === "foe"), ...MSL.list.filter((m) => m.alive && m.side === "foe" && m.W.role === "asm")]) { const v = o.pos.clone().sub(j.pos), d = v.length(); if (d > WPN[j.aamKey].range) continue; const ang = Math.acos(clamp(v.dot(f) / d, -1, 1)); if (ang < 0.45) out.push({ o, s: ang * 20000 + d }); }
  return out.sort((a, b) => a.s - b.s).map((x) => x.o); }
function lockStep(dt) {
  const L = lockCands(); let c = md.lockCand && L.includes(md.lockCand) ? md.lockCand : L[0] || null;
  if (c !== md.lockCand) { md.lockCand = c; md.lockT = 0; }
  if (!c) { md.flyLock = null; md.lockT = 0; return; }
  md.lockT = Math.min(LOCK_T, (md.lockT || 0) + dt); const was = !!md.flyLock; md.flyLock = md.lockT >= LOCK_T ? c : null;
  md.toneT = (md.toneT || 0) - dt; if (md.toneT <= 0 && !paused) { if (md.flyLock) { sfx.lockSolid(); md.toneT = 0.14; } else { sfx.lockSeek(); md.toneT = 0.32; } }
  if (md.flyLock && !was) sfx.lockTone();
}
function lockNext() { const L = lockCands(); if (!L.length) { sfx.deny(); toast("조준원 안에 표적 없음"); return; } const i = L.indexOf(md.lockCand); md.lockCand = L[(i + 1) % L.length]; md.lockT = 0; md.flyLock = null; sfx.click(); }
function flyLockOn() {
  const j = md.fly; if (!j) return null; const f = dirFrom(j.pyaw, j.ppitch); let best = null, bs = Infinity;
  for (const o of [...MSL.jets.filter((x) => x.alive && x.side === "foe"), ...MSL.list.filter((m) => m.alive && m.side === "foe" && m.W.role === "asm")]) {
    const v = o.pos.clone().sub(j.pos), d = v.length(); if (d > WPN[j.aamKey].range) continue; const ang = Math.acos(clamp(v.dot(f) / d, -1, 1)); if (ang < 0.45 && ang * 20000 + d < bs) { bs = ang * 20000 + d; best = o; } }
  return best;
}
function flyFire() { const j = md.fly, T = md.flyLock; if (!j || j.aam <= 0 || j.aamCd > 0) { sfx.deny(); return; } if (!T) { sfx.deny(); toast(md.lockCand ? `록온 중… ${Math.round(((md.lockT || 0) / LOCK_T) * 100)}% — 조준원 안에 유지` : "록온 없음 — 적기나 미사일을 조준원 안에 (T: 표적 전환)"); return; } if (mLaunch(j, j.aamKey, T)) { j.aam--; T.engaged = (T.engaged || 0) + 1; j.aamCd = 1.2; log(`${j.name} ${j.aamKey} 발사 → ${T.isJet ? T.name : T.W.name}`, "hit"); } }
function flyStrike() {
  const j = md.fly; if (!j || j.asm <= 0) { sfx.deny(); toast("대함 미사일 없음"); return; } if ((j.asmCd || 0) > G.time) { sfx.deny(); return; }
  const c = know("us").sort((a, b) => a.pos.distanceToSquared(j.pos) - b.pos.distanceToSquared(j.pos))[0]; if (!c) { sfx.deny(); toast("탐지된 적함 없음"); return; }
  if (Math.hypot(c.pos.x - j.pos.x, c.pos.z - j.pos.z) > WPN[j.asmKey].range * 0.95) { sfx.deny(); toast(`사거리 밖 — ${WPN[j.asmKey].name} ${(WPN[j.asmKey].range / 1000).toFixed(0)} km`); return; }
  const n = Math.min(2, j.asm); for (let k = 0; k < n; k++) { const m = mLaunch(j, j.asmKey, c.ship); if (m && !c.firm) m.est = c.pos.clone(); } log(`${j.name} ${WPN[j.asmKey].name} ${n}발 발사 → ${c.ship.name} (남은 ${j.asm - n})`, "hit"); j.asm -= n; j.asmCd = G.time + 1.2; sfx.click(); /* two per press */
}
function flyCamera(dt) {
  const j = md.fly, up = QY.clone().applyQuaternion(j.q), look = new THREE.Quaternion().copy(j.q).multiply(dq.setFromAxisAngle(QY, -(md.lookYaw || 0))).multiply(new THREE.Quaternion().setFromAxisAngle(QZ, md.lookPitch || 0));
  const f = QX.clone().applyQuaternion(look), looking = Math.abs(md.lookYaw || 0) + Math.abs(md.lookPitch || 0) > 0.03; j.mesh.visible = !md.flyFP;
  const abK = j.landT > 0 ? 0 : clamp(((j.thr || 220) - 242) / 88, 0, 1);
  if (G.shake > 0.01) f.add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(G.shake * 0.004)).normalize();
  jetPit.visible = !!md.flyFP && !(j.landT > 0); if (jetPit.visible) {
    jetPit.quaternion.setFromEuler(eu.set(md.lookPitch || 0, -(md.lookYaw || 0), 0, "YXZ")).invert();
    const f0 = QX.clone().applyQuaternion(j.q), rt = new THREE.Vector3().crossVectors(f0, QY).normalize(), bl = [];
    for (const o of [...MSL.jets, ...MSL.list.filter((m) => m.W.role === "asm")]) { if (!o.alive || o === j) continue; const d = o.pos.clone().sub(j.pos); if (d.length() > 20000) continue; bl.push({ x: clamp(d.dot(rt) / 20000, -1, 1), y: clamp(d.dot(f0) / 20000, 0, 1), foe: o.side === "foe" }); }
    updateJetPit(j, dt, { rwr: md.rwr, lock: md.flyLock ? (md.flyLock.isJet ? md.flyLock.name : md.flyLock.W.name) : null, lockPct: md.lockCand ? (md.lockT || 0) / LOCK_T : 0, firing: lDown && document.pointerLockElement === canvas && !altDown() && !md.lookHeld && j.gun > 0, gunHit: md.gunHit || 0, blips: bl, ab: abK, roll: (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0), pitch: (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0) }); }
  if (md.flyFP && !(j.landT > 0)) { setNear(0.5); camera.fov += ((72 + abK * 6.5) - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix(); camera.up.copy(up); camera.position.copy(j.pos).addScaledVector(QX.clone().applyQuaternion(j.q), 5).addScaledVector(up, 1.3); camera.lookAt(camera.position.clone().addScaledVector(f, 200)); return; }
  setNear(1); camera.fov += ((62 + (j.heavy ? 0 : abK * 7)) - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix(); camera.up.lerp(up, Math.min(1, dt * 5)).normalize();
  const cDist = j.heavy ? 68 : 40 + abK * 5, cUp = j.heavy ? 13.5 : 8.2 - abK * 0.6;
  const want = j.pos.clone().addScaledVector(f, -cDist).addScaledVector(up, cUp); if (looking) camera.position.copy(want); else camera.position.lerp(want, Math.min(1, dt * 9)); camera.lookAt(j.pos.clone().addScaledVector(f, 160));
}
function keycap(x, y, k, on, dim) { hx.font = "bold 11px 'Noto Sans KR', sans-serif"; const w = Math.max(24, hx.measureText(k).width + 12);
  hx.fillStyle = on ? "rgba(142,240,122,.9)" : dim ? "rgba(40,46,52,.55)" : "rgba(235,240,245,.92)"; hx.beginPath(); hx.roundRect(x, y, w, 20, 4); hx.fill();
  hx.fillStyle = "rgba(0,0,0,.35)"; hx.fillRect(x + 2, y + 18, w - 4, 2); txt(k, x + w / 2, y + 10, on ? "#0b2a10" : dim ? "#7c858c" : "#111a20", "bold 11px 'Noto Sans KR', sans-serif", "center"); return w; }
function drawFlyKeys(j) { // visual key legend while flying a jet (H hides it)
  const H = hud.height, auto = !!md.flyAuto, groups = auto
    ? [["자동 조종 중", [[["K"], "수동 조종"], [["N"], `임무: ${JR[j.role] || j.role}`], [["V"], "시점"], [["Tab"], "본함 복귀"], [["X"], "플레어", !j.flares]]]]
    : [["비행", [[["W", "S"], "기수 내림/올림", 0, ["KeyW", "KeyS"]], [["마우스"], "기수·방향 조종"], [["휠"], "출력(속력) +/−"], [["A", "D"], "롤", 0, ["KeyA", "KeyD"]], [["Q", "E"], "러더", 0, ["KeyQ", "KeyE"]]]],
      ["무장", [[["클릭"], `기관포 ${Math.max(0, j.gun ?? 0)}`, !(j.gun > 0)], [["뒤로", "B"], `공대공 ${j.aam}${md.flyLock ? " · LOCK" : md.lockCand ? ` · 록온 ${Math.round(((md.lockT || 0) / LOCK_T) * 100)}%` : ""}`, !j.aam], [["T"], "록온 표적 전환"], [["Space"], `대함 ${j.asm} (2발씩)`, !j.asm], [["X"], `플레어·채프 ${j.flares ?? 0} (4발씩)`, !j.flares]]],
      ["임무", [[["K"], "자동 조종"], [["N"], `임무: ${JR[j.role] || j.role}`], [["L"], "착함 (어디서나 · 20초 재무장)"], [["V"], "조종석/외부"], [["Alt"], "둘러보기"], [["Tab"], "본함 복귀 (I도 가능)"]]]];
  const rows = groups.reduce((n, g) => n + g[1].length + 1, 0), rh = H <= 760 ? 19 : 22, w = 244, h = rows * rh + 22, x = 12, y = H - h - (H <= 760 ? 14 : 86);
  panel(x, y, w, h); let yy = y + 12; txt("조종 키 (H)", x + w - 10, yy + 2, "#7f9aa8", "10px 'Noto Sans KR', sans-serif", "right");
  for (const [title, items] of groups) { txt(title, x + 10, yy + 4, "#ffd166", "bold 11px 'Noto Sans KR', sans-serif"); yy += rh - 2;
    for (const [ks, label, dim, codes] of items) { let xx = x + 12; ks.forEach((k, i) => { xx += keycap(xx, yy - 8, k, codes ? keys.has(codes[i]) : false, dim) + 4; }); txt(label, Math.max(xx + 4, x + 100), yy + 2, dim ? "#7c858c" : "#dfe8ec", "11.5px 'Noto Sans KR', sans-serif"); yy += rh; } yy += 2; }
}
/** Where to put the gun cross so the rounds meet target T: rounds leave at 1050 m/s along the nose plus the jet's own velocity,
 * so relative to the jet they fly straight along the nose and only the target's motion relative to the jet needs leading. */
function gunLeadPoint(j, T) {
  const rv = (T.vel ? T.vel.clone() : new THREE.Vector3()).sub(j.vel), p0 = j.pos.clone().addScaledVector(dirFrom(j.pyaw, j.ppitch), 9); let t = T.pos.distanceTo(p0) / 1050;
  for (let k = 0; k < 4; k++) t = T.pos.clone().addScaledVector(rv, t).distanceTo(p0) / 1050;
  return { p: T.pos.clone().addScaledVector(rv, t), d: T.pos.distanceTo(j.pos) };
}
function gunTarget(j) { // the locked or locking target if it is in gun range and in front, else the nearest foe aircraft in front
  const f = dirFrom(j.pyaw, j.ppitch), ok = (o) => { if (!o || !o.alive) return false; const v = o.pos.clone().sub(j.pos), d = v.length(); return d < 1700 && v.dot(f) > d * 0.6; };
  if (ok(md.flyLock)) return md.flyLock; if (ok(md.lockCand)) return md.lockCand; let best = null, bd = Infinity;
  for (const e of MSL.jets) if (e.side !== j.side && ok(e)) { const d = e.pos.distanceToSquared(j.pos); if (d < bd) { bd = d; best = e; } }
  return best;
}
/** Stores and state of the jet you fly as gauges: gun bar, one pip per missile, flare bar, fuel bar (seconds left), damage bar. */
function drawStores(j, x, y, w) {
  const n = 6, cw = w / n, f = "bold 10.5px 'Noto Sans KR', sans-serif", dim = "rgba(255,255,255,.13)";
  const head = (k, label, val, col) => { const cx = x + k * cw + 6; txt(label, cx, y + 6, "#9fb3bf", f); txt(val, x + (k + 1) * cw - 8, y + 6, col, f, "right"); return cx; };
  const bar = (cx, frac, col) => { const bw = cw - 14; hx.fillStyle = dim; hx.fillRect(cx, y + 16, bw, 10); hx.fillStyle = col; hx.fillRect(cx, y + 16, bw * clamp(frac, 0, 1), 10); hx.strokeStyle = "rgba(255,255,255,.25)"; hx.lineWidth = 1; hx.strokeRect(cx + 0.5, y + 16.5, bw - 1, 9); };
  const pips = (cx, have, max, col) => { const bw = cw - 14, gap = max > 8 ? 2 : 4, pw = (bw - gap * (max - 1)) / max; for (let i = 0; i < max; i++) { hx.fillStyle = i < have ? col : dim; hx.fillRect(cx + i * (pw + gap), y + 14, pw, 14); } };
  const lvl = (fr) => (fr > 0.5 ? "#9be06a" : fr > 0.25 ? "#ffc857" : "#ff6b5e");
  const gun = Math.max(0, j.gun ?? 0); bar(head(0, "기관포", `${gun}`, gun ? "#dfe8ec" : "#ff6b5e"), gun / 480, "#dfe8ec");
  const aamMax = Math.max(j.aam, j.side === "us" ? JET_US.aam : 10); pips(head(1, "공대공 뒤로", `${j.aam}/${aamMax}`, j.aam ? "#8ef07a" : "#ff6b5e"), j.aam, aamMax, "#8ef07a");
  const asmMax = Math.max(j.asm, j.side === "us" ? JET_US.asm : 2); pips(head(2, "대함 Space", `${j.asm}/${asmMax}`, j.asm ? "#ffd04d" : "#ff6b5e"), j.asm, asmMax, "#ffd04d");
  j.flaresMax = Math.max(j.flaresMax || 0, j.flares || 0, 1); const fl = j.flares || 0; bar(head(3, "플레어 X", `${fl}`, fl ? "#7cc4ff" : "#ff6b5e"), fl / j.flaresMax, "#7cc4ff");
  const tot = j.endur + 120, left = Math.max(0, tot - j.t), fr = left / tot; bar(head(4, "연료", `${Math.ceil(left)}초`, lvl(fr)), fr, lvl(fr));
  const dm = jetDmg(j), c = jetDmgCol(dm); bar(head(5, "기체 손상", `${dm}%`, c), dm / 100, c);
}
function drawFlyHUD() {
  const j = md.fly, W = hud.width, H = hud.height; if (!j) return; hx.textBaseline = "middle";
  if (md.flyFP && false) { // (old 2D canopy, replaced by the 3D jetPit)
    hx.fillStyle = "rgba(18,22,26,.96)"; hx.beginPath(); hx.moveTo(0, H); hx.lineTo(0, H * 0.78); hx.quadraticCurveTo(W / 2, H * 0.66, W, H * 0.78); hx.lineTo(W, H); hx.closePath(); hx.fill();
    hx.strokeStyle = "rgba(24,28,32,.95)"; hx.lineWidth = 16; hx.beginPath(); hx.moveTo(W * 0.2, H * 0.74); hx.quadraticCurveTo(W * 0.08, H * 0.3, W * 0.02, 0); hx.moveTo(W * 0.8, H * 0.74); hx.quadraticCurveTo(W * 0.92, H * 0.3, W * 0.98, 0); hx.stroke();
    hx.lineWidth = 9; hx.beginPath(); hx.moveTo(W * 0.06, H * 0.12); hx.quadraticCurveTo(W / 2, -H * 0.05, W * 0.94, H * 0.12); hx.stroke();
    txt(`${(j.vel.length() * 3.6).toFixed(0)}`, W * 0.32, H * 0.86, "#8ef07a", "bold 20px monospace", "center"); txt("KM/H", W * 0.32, H * 0.9, "#6fbf60", "11px monospace", "center");
    txt(`${j.pos.y.toFixed(0)}`, W * 0.68, H * 0.86, "#8ef07a", "bold 20px monospace", "center"); txt("ALT M", W * 0.68, H * 0.9, "#6fbf60", "11px monospace", "center");
  }
  const gt = gunTarget(j), gl = gt && gunLeadPoint(j, gt); // gun cross drawn at the target's range so it lines up with the lead mark without parallax
  const aim = proj(j.pos.clone().addScaledVector(dirFrom(j.pyaw, j.ppitch), gl ? Math.max(gl.d, 150) : 800));
  if (gl && aim) { const q = proj(gl.p), qt = proj(gt.pos); if (q) { // lead mark: put the small circle of the gun cross on the diamond and fire
    const on = Math.hypot(q.x - aim.x, q.y - aim.y) < 16, c = on ? "#ff3b30" : "#ffd166"; hx.strokeStyle = c; hx.lineWidth = 2; hx.beginPath(); hx.moveTo(q.x, q.y - 9); hx.lineTo(q.x + 9, q.y); hx.lineTo(q.x, q.y + 9); hx.lineTo(q.x - 9, q.y); hx.closePath(); hx.stroke();
    if (qt) { hx.lineWidth = 1; hx.setLineDash([4, 4]); hx.beginPath(); hx.moveTo(qt.x, qt.y); hx.lineTo(q.x, q.y); hx.stroke(); hx.setLineDash([]); }
    txt(`${on ? "사격!" : "기관포 조준"} ${gl.d.toFixed(0)} m`, q.x + 14, q.y + 14, c, "bold 11px 'Noto Sans KR', sans-serif"); } } if (aim) { hx.strokeStyle = "#9be06a"; hx.lineWidth = 1.6; hx.beginPath(); hx.arc(aim.x, aim.y, 46, 0, TAU); hx.stroke(); hx.beginPath(); hx.arc(aim.x, aim.y, 3, 0, TAU); hx.stroke(); }
  if (aim && md.gunHit > 0) { hx.strokeStyle = "#ff3b30"; hx.lineWidth = 3; for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { hx.beginPath(); hx.moveTo(aim.x + sx * 8, aim.y + sy * 8); hx.lineTo(aim.x + sx * 18, aim.y + sy * 18); hx.stroke(); } }
  if (md.rwr) { const bl = Math.floor(G.time * 4) % 2; hx.fillStyle = bl ? "rgba(255,40,30,.9)" : "rgba(120,10,10,.9)"; hx.fillRect(W / 2 - 150, 96, 300, 30); txt(`⚠ 미사일 접근 ${md.rwr}발 — X 플레어 · 급선회!`, W / 2, 111, "#fff", "bold 14px 'Noto Sans KR', sans-serif", "center"); }
  if (Math.abs(md.lookYaw || 0) > 0.05) txt(`둘러보기 (Alt) ${Math.round((md.lookYaw || 0) / DEG)}°`, W / 2, 140, "#cfe7ff", "12px 'Noto Sans KR', sans-serif", "center");
  const Cn = md.lockCand; if (Cn && !md.flyLock && !md.flyAuto) { const q = proj(Cn.pos); if (q && q.on) { const p = (md.lockT || 0) / LOCK_T; hx.strokeStyle = "#ffd23a"; hx.lineWidth = 2; hx.beginPath(); hx.moveTo(q.x, q.y - 18); hx.lineTo(q.x + 18, q.y); hx.lineTo(q.x, q.y + 18); hx.lineTo(q.x - 18, q.y); hx.closePath(); hx.stroke();
    hx.beginPath(); hx.arc(q.x, q.y, 24, -PI / 2, -PI / 2 + TAU * p); hx.stroke(); txt(`LOCKING ${Math.round(p * 100)}% · ${Cn.isJet ? Cn.name : Cn.W.name} ${(Cn.pos.distanceTo(md.fly.pos) / 1000).toFixed(1)} km`, q.x, q.y - 34, "#ffd23a", "bold 11px 'Noto Sans KR', sans-serif", "center"); } }
  const T = md.flyLock; if (T) { const q = proj(T.pos); if (q && q.on) { txt("LOCKED — 뒤로가기 버튼 발사", q.x, q.y + 30, "#ff6b5e", "bold 11px 'Noto Sans KR', sans-serif", "center"); hx.strokeStyle = "#ff3b30"; hx.lineWidth = 2; hx.strokeRect(q.x - 14, q.y - 14, 28, 28); txt(`LOCK ${T.isJet ? T.name : T.W.name} ${(T.pos.distanceTo(j.pos) / 1000).toFixed(1)} km`, q.x, q.y - 24, "#ff6b5e", "bold 11px 'Noto Sans KR', sans-serif", "center"); } }
  const py = H - 88, sw = Math.min(760, W - 540);
  panel(W / 2 - sw / 2 - 10, py, sw + 20, 74);
  txt(`${j.name} · ${(j.vel.length() * 3.6).toFixed(0)} km/h · 고도 ${j.pos.y.toFixed(0)} m`, W / 2, py + 13, "#fff", "bold 12px 'Noto Sans KR', sans-serif", "center");
  drawStores(j, W / 2 - sw / 2, py + 26, sw); /* gun, missiles, flares, fuel and damage as gauges */
  if (md.flyAuto && !(j.landT > 0)) {
    if (j.support) {
      const ref = j.aimPt || j.pos, dKm = (Math.hypot(ref.x - j.pos.x, ref.z - j.pos.z) / 1000).toFixed(1);
      const msg = j.asm > 0 && !j.home
        ? `공군 지원 관전 · 목표 해역 침투 중 (남은 ${dKm}km · 사거리 진입 시 ${WPN[j.asmKey]?.name || j.asmKey} ${j.asm}발 자동 발사) — V 시점 · Tab 복귀`
        : `공군 지원 관전 · ${WPN[j.asmKey]?.name || j.asmKey} 발사 완료 · 기지 이탈 중 — T 미사일 추적 · Tab 본함 복귀`;
      hx.fillStyle = "rgba(8,36,42,.88)"; hx.fillRect(W / 2 - 310, 64, 620, 28);
      txt(msg, W / 2, 78, "#4de8d4", "bold 12.5px 'Noto Sans KR', sans-serif", "center");
    } else {
      hx.fillStyle = "rgba(20,60,30,.85)"; hx.fillRect(W / 2 - 170, 64, 340, 28);
      txt(`AUTOPILOT · 임무 ${JR[j.role] || j.role}${j.home ? " · 귀환 중" : ""} — K 수동`, W / 2, 78, "#8ef07a", "bold 13px 'Noto Sans KR', sans-serif", "center");
    }
  }
  txt(j.landT > 0 ? `착함 — 재무장 중 ${Math.ceil(j.landT)}초` : md.flyAuto ? "" : "", W / 2, py + 86, "#cfe7ff", "11px 'Noto Sans KR', sans-serif", "center");
}
G.onIntercept = (m) => { if (m.side === "foe") { md.icpt = { t: 1.6, n: m.isJet ? `적 ${m.name} 격추` : `${m.W.name || "적 미사일"} 요격` }; G.stats.icpt = (G.stats.icpt || 0) + 1; } };
function sortieJets(S, role) {
  const n = Math.min(2, S.jetsReady); if (!n) return 0; S.jetsReady -= n; if (S.side === "us") G.jetsOut = (G.jetsOut || 0) + n;
  for (let i = 0; i < n; i++) md.q.push({ t: i * 1.5, jet: true, S, role });
  log(`${S.side === "us" ? "" : "적 "}${S.cv.type} ${n}기 출격 (${S.name || "지상 비행장"})`, S.side === "us" ? "hit" : "bad"); if (S.side === "foe") sfx.alarm(); return n;
}
const myAir = () => G.ships.find((s) => s.alive && s.side === "us" && s.cv) || (G.bases || []).find((b) => b.side === "us");
function nearPt(pt, r = 6000) { /* the strike point picks the enemy ship nearest to it (within r), if any is tracked */
  let best = null, bd = r * r; for (const e of G.enemies) { if (!e.alive || !goodCt(e)) continue; const d = (e.pos.x - pt.x) ** 2 + (e.pos.z - pt.z) ** 2; if (d < bd) { bd = d; best = e; } } return best; }
function fireSalvo() {
  // target, like the guns: a locked ship, else a sea point you double-clicked, else the nearest contact (auto)
  const P = G.player, k = asmKey(P), pt = md.aimPt, T = (goodCt(lock) && lock) || (pt ? nearPt(pt) : (goodCt(G.enemy) && G.enemy) || bestContact());
  if (!k || !(P.mag[k] > 0)) { sfx.deny(); toast("대함미사일 소진"); return; }
  if (!T && !pt) { sfx.deny(); toast("표적 없음 — 레이더·ESM·헬기(Y)로 탐지하거나, 바다를 더블클릭해 목표 지점을 지정하세요"); return; }
  const ct = T && G.cts.get(T), est = !T ? new THREE.Vector3(pt.x, 0, pt.z) : ct.q < 0.6 ? new THREE.Vector3(ct.x, 0, ct.z) : null; // not a firm track: shoot at the estimate, the seeker finds the ship
  const d = d2(P.pos, est || T.pos); if (d > WPN[k].range * 0.95) { sfx.deny(); toast(`사거리 밖 — ${WPN[k].name} 최대 ${(WPN[k].range / 1000).toFixed(0)} km (게임 축척)`); return; }
  if (md.fireCd > 0) { sfx.deny(); return; }
  const n = Math.min(md.salvo, P.mag[k]); P.mag[k] -= n; md.fireCd = 2.5;
  for (let i = 0; i < n; i++) md.q.push({ t: i * 0.6, S: P, k, T, cam: i === 0, est });
  G.stats.shots += n; log(`${WPN[k].name} ${n}발 발사 → ${T ? T.name : "지정 지점"} (${(d / 1000).toFixed(1)} km)${!T ? " · 도착 후 탐색기로 근처 적함 포착" : est ? ` · ${ct.src} 추정 위치 사격 (오차 ±${(ct.err / 1000).toFixed(1)} km, 종말 탐색기)` : ""}`, "hit"); G.radio?.("torp_launch");
}
function manualSam() {
  const P = G.player; if (md.eCd > 0) return;
  const th = MSL.list.filter((m) => m.alive && m.W.role === "asm" && m.side === "foe" && mSeen(m, "us")).sort((a, b) => d2(a.pos, P.pos) - d2(b.pos, P.pos));
  const m = th.find((x) => x.engaged < 2); if (!m) { sfx.deny(); toast("요격할 탐지 표적 없음"); return; }
  const k = pickSam(P, d2(m.pos, P.pos)); if (!k) { sfx.deny(); toast("사거리 안에 쓸 요격탄 없음"); return; }
  mLaunch(P, k, m); P.mag[k]--; m.engaged++; md.eCd = 0.6; sfx.click();
}

function helmHTML() {
  const P = G.player, hp = P.hp / P.maxHp, hc = hp > 0.5 ? "ok" : hp > 0.25 ? "warn" : "bad", kn = P.speed / KN, mx = Math.max(1, P.vmax / KN * 1.05), f = clamp(kn / mx, 0, 1), a = Math.PI * (1 - f);
  const nx = (60 + Math.cos(a) * 44).toFixed(1), ny = (58 - Math.sin(a) * 44).toFixed(1), ex = (60 + Math.cos(a) * 50).toFixed(1), ey = (58 - Math.sin(a) * 50).toFixed(1);
  const ticks = [0, 1, 2, 3, 4].map((i) => { const t = Math.PI * (1 - i / 4); return `<line x1="${(60 + Math.cos(t) * 46).toFixed(1)}" y1="${(58 - Math.sin(t) * 46).toFixed(1)}" x2="${(60 + Math.cos(t) * 52).toFixed(1)}" y2="${(58 - Math.sin(t) * 52).toFixed(1)}"/>`; }).join("");
  const warn = (P.fires.length ? `<span class="hw">화재 ${P.fires.length}</span>` : "") + (P.flooding ? `<span class="hw">침수 ${P.flooding}</span>` : "") + (P.rudderJam > 0 ? `<span class="hw">타 고착</span>` : "");
  const lbl = ["정지", "저속", "반속", "전속"];
  return `<div class="helm"><div class="hn">${flagOf(P, 18)}<b>${(ENG[P.spec.id] || P.spec.name).replace(/\s*\(.*$/, "")}</b><span class="pct ${hc}">${Math.round(hp * 100)}%</span></div><div class="hbar"><i class="${hc}" style="width:${Math.round(hp * 100)}%"></i></div>`
    + `<div class="hb"><svg class="gauge" viewBox="0 0 120 66"><path d="M10 58 A50 50 0 0 1 110 58" class="gt"/><path d="M10 58 A50 50 0 0 1 ${ex} ${ey}" class="gv"/><g class="tk">${ticks}</g><circle cx="${ex}" cy="${ey}" r="4.5" class="hub"/><text x="60" y="50" class="gn">${kn.toFixed(0)}</text><text x="60" y="63" class="gu">kn · ${brg(P.heading)}</text></svg>`
    + `<div class="gear">${[3, 2, 1, 0].map((i) => `<button data-speed="${i}" class="${P.lv === i ? "on" : ""}"><span>${i}</span>${lbl[i]}</button>`).join("")}</div></div>${warn ? `<div class="hws">${warn}</div>` : ""}</div>`;
}
function repairSlot() { return `<button class="slot g rp${rep.act > 0 || rep.cd > 0 || rep.n <= 0 ? " off" : ""}" data-act="repair"><span class="t">R · 수리</span><span class="v">${rep.act > 0 ? "수리 중" : rep.cd > 0 ? `${Math.ceil(rep.cd)}초` : `${rep.n}회 남음`}</span></button>`; }
function modernBar() {
  const P = G.player, k = asmKey(P), v = P.spec.vls, cnt = (e) => (e ? `${e[0]} ${P.mag[e[0]] ?? 0}` : "");
  const sam = ["L", "M", "S"].map((t) => cnt(v[t])).filter(Boolean).join(" · ");
  const W2 = OPSO.subs.length ? ["msl", "gun", "asw"] : ["msl", "gun"], nxt = W2[(W2.indexOf(weapon) + 1) % W2.length], WN = { msl: "대함 미사일", gun: "함포", asw: "대잠로켓" };
  const cur = weapon === "gun" ? `함포 · Space 사격` : weapon === "asw" ? `대잠로켓 ${P.asw ?? 0}발` : k ? `${WPN[k].name} ${P.mag[k]}발 · ${(WPN[k].range / 1000).toFixed(0)}km` : "없음";
  const C = myAir(), up = MSL.jets.filter((j) => j.alive && j.side === "us").length, hl = OPSO.subs.length ? MSL.helos.find((x) => x.alive && x.owner === P) : null;
  return helmHTML() + `<div class="slot main grp g on" data-key="Space"><span class="t">Space · ${WN[weapon] || "대함 미사일"}</span><span class="v">${cur}</span><div class="sub2"><button data-key="KeyQ">Q ▸ ${WN[nxt]}</button><button data-key="KeyZ" class="${autoFire ? "on" : ""}">Z 자동 ${autoFire ? "ON" : "OFF"}</button></div></div>`
    + (C ? `<div class="slot grp g${md.fly ? " on" : ""}"><span class="t">전투기</span><span class="v">대기 ${C.jetsReady} · 비행 ${up}${G.sortieRes ? ` · 예약 ${G.sortieRes}` : ""}</span><div class="sub2"><button data-key="KeyF"${C.jetsReady ? "" : ' class="dim"'}>F 출격</button><button data-key="KeyI">${md.fly ? "I 복귀" : "I 조종"}</button><button data-key="KeyN">N ${JR[md.role] || "다목적"}</button>${md.fly ? `<button data-key="KeyK" class="${md.flyAuto ? "on" : ""}">K 자동</button>` : ""}</div></div>` : "")
    + `<button class="slot g${aa.on ? " on" : ""}" data-key="KeyG"><span class="t">G · 대공</span><span class="v">${(() => { const e = v.M || v.L || v.S; return e ? `${e[0]} ${P.mag[e[0]] ?? 0}발` : "기관포"; })()}</span></button>`
    + `<button class="slot g" data-key="Backquote"><span class="t">\` · CIC</span><span class="v">합동 지원</span></button>`
    + (G.mop === "modern:emcon" ? `<button class="slot g${P.radarOn === false ? " on" : ""}" data-key="KeyO"><span class="t">O · 레이더</span><span class="v">${P.radarOn === false ? "방사 통제" : "방사 중"}</span></button>` : "")
    + (OPSO.subs.length ? `<button class="slot g${hl ? " on" : ""}" data-key="KeyY"><span class="t">Y · 헬기</span><span class="v">${hl ? `${Math.max(0, Math.ceil(hl.endur - hl.t))}초` : P.heloCd > 0 ? `정비 ${Math.ceil(P.heloCd)}초` : "출격 가능"}</span></button>` : "")
    + `<button class="slot g${MSL.cam ? " on" : ""}" data-key="KeyT"><span class="t">T · 추적</span><span class="v">${MSL.cam ? "추적 중" : "카메라"}</span></button>`
    + repairSlot();
}
function modernKey(code) {
  if (code === "KeyQ" && aa.on) { aa.ammo = aa.ammo === "msl" ? "mg" : "msl"; aa.lockC = null; aa.lockT = 0; sfx.click(); toast(aa.ammo === "msl" ? "요격미사일 — 조준원 안에 표적을 잡고 있으면 삐빅… 삐— (록온) → Space/클릭 발사 · Q: 기관포" : "근접 기관포 — 좌클릭/Space 연사 · Q: 요격미사일", 4); return true; }
  if (code === "Backquote" && !md.fly) { (keys.has("ShiftLeft") || keys.has("ShiftRight")) ? cicExpand() : cicToggle(); return true; }
  if (cicPending() && (code === "KeyY" || code === "KeyN")) { cicResolve(code === "KeyY"); return true; }
  if (code === "Space" && !md.fly && weapon === "asw") { const sc = nearestSubContact(G.player.pos), pt = md.aimPt ? new THREE.Vector3(md.aimPt.x, 0, md.aimPt.z) : sc?.ep;
    if (!pt) { sfx.deny(); toast("잠수함 접촉 없음 — Y 헬기로 소노부이를 뿌리거나 속력을 줄여(소나) 찾으세요"); } else if (!aswRocket(G.player, pt.clone(), { log })) { sfx.deny(); toast("대잠로켓 소진"); } return true; }
  if (code === "Space" && !md.fly && weapon === "msl" && (G.mop === "modern:bmd" || G.mop === "modern:drone" || !G.enemies.some((e) => e.alive))) { manualSam(); return true; }
  if (code === "Space" && !md.fly && weapon === "msl") { fireSalvo(); return true; }
  if (code === "KeyQ" && !md.fly) { const cyc = OPSO.subs.length ? ["msl", "gun", "asw"] : ["msl", "gun"]; weapon = cyc[(cyc.indexOf(weapon) + 1) % cyc.length]; sfx.click();
    toast(weapon === "msl" ? (G.mop === "modern:bmd" || G.mop === "modern:drone" ? "요격탄 — Space 수동 요격 (Q: 함포)" : "대함 미사일 — Space 일제사격 (Q: 함포)") : weapon === "gun" ? `함포 — Space 사격 · 지점 더블클릭으로 조준${G.mop === "modern:shore" ? " (육상 목표)" : ""}` : `대잠로켓 — Space 발사 (가장 가까운 잠수함 접촉 또는 지정 지점) · 남은 ${G.player.asw ?? 0}발`); return true; }
  if (code === "KeyG" && !md.fly) { toggleAA(); if (aa.on) { aa.ammo = "msl"; aa.lockC = null; aa.lockT = 0; tip("aa", "대공 요격 — 드론·미사일·적기를 조준원에 잡고 삐— 소리가 나면 Space · Q: 기관포로 전환 · G 복귀", "대공 요격 · G 복귀", 5); } return true; }
  if (code === "KeyE" && !md.fly) { if ((md.jamCd || 0) > G.battleT) { sfx.deny(); toast(`재밍 장비 냉각 중 — ${Math.ceil(md.jamCd - G.battleT)}초`); return true; } md.jamCd = G.battleT + 35; const n = jamDrones(G.player); sfx.flare?.(); toast(n ? `전자전 재밍 — 드론 ${n}기 통신 두절 (일부 추락) · 35초 후 재사용` : "전자전 재밍 — 7 km 안에 드론 없음 (35초 냉각)", 3); log(`재밍 실시 — 드론 ${n}기 영향`, n ? "hit" : ""); return true; }
  if (code === "KeyN") { setJetRole(JR_NEXT[md.role] || "multi"); return true; }
  if (md.fly) { if (code === "KeyT" && !md.flyAuto) { lockNext(); return true; } if (code === "KeyK") { setFlyAuto(!md.flyAuto); return true; } if (code === "KeyI") { releaseFly(); return true; } if (code === "KeyV") { md.flyFP = !md.flyFP; sfx.click(); toast(md.flyFP ? "조종석 시점 (V: 외부)" : "외부 시점 (V: 조종석)"); return true; } if (code === "Space") { flyStrike(); return true; } if (code === "KeyB") { flyFire(); return true; } /* Space: anti-ship, B (or right button): air-to-air */ if (code === "KeyX") { flyFlare(); return true; } if (code === "KeyL") { flyLand(); return true; } return true; }
  if (code === "KeyI") { takeJet(); return true; }
  if (false) { md.salvo = md.salvo === 1 ? 2 : md.salvo === 2 ? 4 : 1; sfx.click(); toast(`일제사격 ${md.salvo}발 단위`); return true; }
  // (KeyK removed: handled automatically)
  // (KeyE removed: handled automatically)
  if (code === "KeyF") { const C = myAir(); if (!C) { sfx.deny(); toast("탑재 전투기 없음"); return true; } if (C.jetsReady < 1) { const up = MSL.jets.filter((j) => j.alive && j.side === "us" && j.owner === C).length, cap = Math.min(4, Math.ceil((C.rearm.length + up) / 2)); /* only as many sorties as jets that can come back */
      if (!cap) { sfx.deny(); toast("출격 가능 기체 없음"); return true; } if ((G.sortieRes || 0) >= cap) { sfx.deny(); toast(`예약 ${G.sortieRes}회가 최대 — 비행 중 ${up}기·정비 ${C.rearm.length}기뿐 (전체 '귀환'으로 빨리 불러들일 수 있음)`, 3.5); return true; }
      G.sortieRes = (G.sortieRes || 0) + 1; sfx.click(); toast(`출격 예약 ${G.sortieRes}회 — 대기 기체 없음: 비행 중 ${up}기가 착함하고 재무장(60초)해야 출격 · 전체 '귀환'으로 빨리 불러들일 수 있음 (Shift+F: 취소)`, 4.5); return true; }
    sortieJets(C, md.role); sfx.click();
    tip("sortie", `전투기 출격 · 임무 ${JR[md.role]} — ${md.role === "cap" ? "적기·대함미사일 요격" : md.role === "strike" ? `저공 침투해 ${WPN[C.cv.asm].name}로 적함 공격 후 귀환` : `요격하다가 적함이 탐지되면 ${WPN[C.cv.asm].name}로 공격`} (N: 임무 변경 · I: 직접 조종)`, `전투기 출격 · ${JR[md.role]}`, 5); return true; }
  if (code === "KeyO") { const on = G.player.radarOn === false; for (const s of ours()) if (s.spec.modern && !s.radarDead) s.radarOn = on; sfx.click();
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
function drawOpsLine() {
  { const st = opsStatus(G.player); if (st && G.state === "playing") { const W0 = hud.width; hx.font = "bold 13px 'Noto Sans KR', sans-serif"; const w = Math.max(360, hx.measureText(st).width + 40); panel(W0 / 2 - w / 2, 132, w, 30); txt(st, W0 / 2, 147, "#ffd166", "bold 13px 'Noto Sans KR', sans-serif", "center");
    if (G.mop === "modern:drone" || G.mop === "modern:convoy") txt(`G 대공 사격 · E 재밍 ${(md.jamCd || 0) > G.battleT ? `${Math.ceil(md.jamCd - G.battleT)}s` : "준비"} · Space 요격탄 · 지원함 앞을 막아서라`, W0 / 2, 172, "#cfe7ff", "12px 'Noto Sans KR', sans-serif", "center"); } }
  if (aa.on) for (const m of MSL.list) { if (!m.alive || m.side === "us" || !(m.W.drone || m.W.alt === "skim")) continue; const q = proj(m.pos); if (!q || !q.on) continue; const d = m.pos.distanceTo(camera.position); if (d > 6000) continue; hx.strokeStyle = "#ff5a4e"; hx.lineWidth = 2; hx.beginPath(); hx.moveTo(q.x, q.y - 9); hx.lineTo(q.x + 9, q.y); hx.lineTo(q.x, q.y + 9); hx.lineTo(q.x - 9, q.y); hx.closePath(); hx.stroke(); txt(`${m.W.drone ? "드론" : "미사일"} ${(d / 1000).toFixed(1)}km`, q.x + 13, q.y, "#ff8a7a", "bold 11px 'Noto Sans KR', sans-serif"); }
}
function drawModernHUD() {
  drawOpsLine();
  if (md.supPt) { const q = proj(new THREE.Vector3(md.supPt.x, 2, md.supPt.z)); if (q && q.on) { hx.strokeStyle = "#3fc7b5"; hx.lineWidth = 2; hx.beginPath(); hx.moveTo(q.x, q.y - 16); hx.lineTo(q.x + 16, q.y); hx.lineTo(q.x, q.y + 16); hx.lineTo(q.x - 16, q.y); hx.closePath(); hx.stroke(); txt("지원 타격 지점", q.x, q.y - 24, "#3fc7b5", "bold 11px 'Noto Sans KR', sans-serif", "center"); } }
  for (const k of opsMarks()) { const q = proj(k.pos.clone().setY(k.kind === "ground" ? k.pos.y + 40 : 3)); if (!q || !q.on) continue; hx.strokeStyle = k.c; hx.lineWidth = 2;
    if (k.kind === "sub") { hx.setLineDash([5, 4]); hx.beginPath(); hx.arc(q.x, q.y, 16, 0, TAU); hx.stroke(); hx.setLineDash([]); } else if (k.kind === "ground") { hx.strokeRect(q.x - 10, q.y - 10, 20, 20); if (k.hp > 0) { hx.fillStyle = "rgba(0,0,0,.6)"; hx.fillRect(q.x - 16, q.y + 14, 32, 4); hx.fillStyle = "#ff8a5c"; hx.fillRect(q.x - 16, q.y + 14, 32 * k.hp, 4); } } else { hx.beginPath(); hx.arc(q.x, q.y, 9, 0, TAU); hx.stroke(); }
    txt(k.label, q.x, q.y - 22, k.c, "bold 11px 'Noto Sans KR', sans-serif", "center"); }
  if (G.dryT != null && G.state === "playing") { const W0 = hud.width; panel(W0 / 2 - 170, 168, 340, 28); txt(`미사일 소진 · 포격전 판정까지 ${Math.max(0, Math.ceil(G.dryT))}초`, W0 / 2, 182, "#ffd166", "bold 12px 'Noto Sans KR', sans-serif", "center"); }
  const P = G.player, W = hud.width; hx.textBaseline = "middle";
  const th = MSL.list.filter((m) => m.alive && m.W.role === "asm" && m.side === "foe" && mSeen(m, "us"));
  if (cam.map) for (const m of MSL.list) { if (!m.alive) continue; const vis = m.side === "us" || mSeen(m, "us"); if (!vis) continue; const q = proj(m.pos); if (!q || !q.on) continue; /* missile marks and labels only on the map (M): in the 3D view they hid the ships */
    if (m.side === "foe") { hx.strokeStyle = "#ff5a4e"; hx.lineWidth = 2; hx.beginPath(); hx.moveTo(q.x, q.y - 7); hx.lineTo(q.x + 7, q.y); hx.lineTo(q.x, q.y + 7); hx.lineTo(q.x - 7, q.y); hx.closePath(); hx.stroke(); txt(`${m.W.name || m.key} ${fmt(d2(m.pos, P.pos))}m`, q.x + 10, q.y, "#ff8a7a", "bold 10.5px 'Noto Sans KR', sans-serif"); }
    else { hx.fillStyle = m.W.role === "asm" ? "#ffffff" : "#7cc4ff"; hx.beginPath(); hx.arc(q.x, q.y, 2.5, 0, TAU); hx.fill(); } }
  { if (P.seenByFoe) { panel(14, 14, 236, 26); txt(`◉ ${P.foeErr ? "적이 우리 전파를 포착" : "적에게 추적당함"} · 레이더 ${P.radarOn === false ? "끔" : "켬"}`, 26, 27, "#ffb347", "bold 12px 'Noto Sans KR', sans-serif"); } }
  for (const j of MSL.jets) { if (!j.alive || (j.side === "foe" && !mSeen(j, "us"))) continue; const q = proj(j.pos); if (!q || !q.on) continue; const col = j.side === "foe" ? "#ff8a7a" : "#cfe7ff"; ntds(hx, q.x, q.y, 7, j.side === "foe", col, false, true); txt(`${j.side === "foe" ? "적 " : ""}${j.name}`, q.x, q.y + 14, col, "10px 'Noto Sans KR', sans-serif", "center"); }
  if (md.icpt && md.icpt.t > 0) { md.icpt.t -= 1 / 60; hx.globalAlpha = clamp(md.icpt.t, 0, 1); txt(`요격 — ${md.icpt.n}`, W / 2, 172, "#8ef07a", "bold 13px 'Noto Sans KR', sans-serif", "center"); hx.globalAlpha = 1; }
  { const tg = lock && lock.alive ? `고정: ${lock.name}` : md.aimPt ? "지정 지점" : "자동 (가장 가까운 적)"; if (false) txt(`F 미사일 목표: ${tg}`, 26, 88, "#ffd166", "bold 12px 'Noto Sans KR', sans-serif"); }
  if (md.aimPt && md.aimPt !== md.supPt) { const q = proj(new THREE.Vector3(md.aimPt.x, 2, md.aimPt.z)); if (q && q.on) { hx.strokeStyle = "#ffd166"; hx.lineWidth = 2; hx.beginPath(); hx.arc(q.x, q.y, 14, 0, TAU); hx.moveTo(q.x - 22, q.y); hx.lineTo(q.x + 22, q.y); hx.moveTo(q.x, q.y - 22); hx.lineTo(q.x, q.y + 22); hx.stroke(); txt("미사일 목표", q.x, q.y + 30, "#ffd166", "bold 11px 'Noto Sans KR', sans-serif", "center"); } }
  if (!cam.map) for (const [e, ct] of G.cts) { if (!e.alive || ct.q >= 0.6) continue; const q = proj(new THREE.Vector3(ct.x, 30, ct.z)); if (!q || !q.on) continue;
    hx.globalAlpha = clamp(ct.q + 0.45, 0.45, 1); ntds(hx, q.x, q.y, 10, true, "#ff8a7a", true); txt(`${e.name} · ${ct.src === "ESM" ? "ESM 추정" : "마지막 추정"} ${(d2(P.pos, ct) / 1000).toFixed(0)} km`, q.x, q.y + 20, "#ff8a7a", "10.5px 'Noto Sans KR', sans-serif", "center"); hx.globalAlpha = 1; }
  if (th.length) { const t = Math.min(...th.map((m) => d2(m.pos, P.pos) / Math.max(m.vel.length(), 1))), w = 380, x = W / 2 - w / 2, ty = toastT > 0 ? 134 : 96; panel(x, ty, w, 26); /* under the toast when one is up */
    txt(`⚠ 적 미사일 ${th.length}발 내습 — 최근접 도달 ${t.toFixed(0)}초 · 방공 ${md.mode === "auto" ? "자동" : md.mode === "manual" ? "수동(E)" : "발사 금지"}`, W / 2, ty + 13, "#ff8a7a", "bold 12px 'Noto Sans KR', sans-serif", "center"); }
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
    if (G.goal) { const q = proj(new THREE.Vector3(G.goal.x, 2, G.goal.z)); if (q && q.on) { hx.strokeStyle = "#7ff0e0"; hx.lineWidth = 2; hx.strokeRect(q.x - 12, q.y - 12, 24, 24); txt(G.goal.label || "집결지", q.x, q.y - 22, "#7ff0e0", "bold 12px 'Noto Sans KR', sans-serif", "center"); } }
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
    if (!me) { rr(tx, ty, tw, 19, 2); hx.fillStyle = foe ? "rgba(60,18,12,.55)" : "rgba(28,30,24,.55)"; hx.fill(); hx.strokeStyle = c + "99"; hx.lineWidth = 1; hx.stroke();
    drawFlag(tx + 5, ty + 4.5, 15, S.side, S.nation); txt(name, tx + 25, ty + 10, c, "bold 11.5px 'Noto Sans KR', sans-serif"); } /* own ship: name and hull are on the console, keep just the bar */
    hx.fillStyle = "rgba(0,0,0,.55)"; hx.fillRect(q.x - 30, q.y - 1, 60, 4); hx.fillStyle = c; hx.fillRect(q.x - 30, q.y - 1, 60 * hp, 4);
    if (S === lock) { hx.strokeStyle = "#ff3b30"; hx.lineWidth = 2; const s = 18 + Math.sin(G.time * 6) * 2; hx.beginPath(); hx.moveTo(q.x, q.y + 6); hx.lineTo(q.x + s, q.y + 6 + s); hx.lineTo(q.x, q.y + 6 + 2 * s); hx.lineTo(q.x - s, q.y + 6 + s); hx.closePath(); hx.stroke(); }
  }
  for (const k of markers) { if (k.t <= 0 || (effDist() > 7000 && !/폭탄/.test(k.text))) continue; const q = proj(k.pos); if (q && q.on) txt(k.text, q.x, q.y - 14, k.hit ? "#ff8a7a" : "#ffe066", "bold 11px 'Noto Sans KR', sans-serif", "center"); }
  if (!cam.map && effDist() < 1900 && P.alive && mode !== "watch") {
    P.tilt.updateWorldMatrix(true, false);
    const drawCallout = (pos, label, pct, col) => {
      const q = proj(pos); if (!q || !q.on) return;
      rr(q.x - 56, q.y - 12, 112, 21, 3); hx.fillStyle = "rgba(12,18,22,.78)"; hx.fill(); hx.strokeStyle = col + "aa"; hx.lineWidth = 1; hx.stroke();
      txt(label, q.x, q.y - 4, col, "bold 10px 'Noto Sans KR', sans-serif", "center");
      hx.fillStyle = "rgba(255,255,255,.15)"; hx.fillRect(q.x - 48, q.y + 4, 96, 3);
      hx.fillStyle = col; hx.fillRect(q.x - 48, q.y + 4, 96 * clamp(pct, 0, 1), 3);
    };
    for (const t of P.turrets) if (t.alive && t.reload > 0.08) {
      const p = 1 - clamp(t.reload / Math.max(P.reloadT, 0.1), 0, 1);
      const ph = p < 0.15 ? "탄피 배출·개방" : p < 0.5 ? "양탄기 급탄 상승" : p < 0.85 ? "유압 램 장전" : "폐쇄기 잠금";
      drawCallout(P.turretPos(t).setY(t.y + t.th + 1.8), `#${t.i + 1}포 · ${ph}`, p, "#ffd166");
    }
    for (const fg of [true, false]) {
      const c = P.vlsCells?.find((x) => x.state !== "loaded" && x.fore === fg);
      if (c && false) drawCallout(P.tilt.localToWorld(new THREE.Vector3(c.cx, c.cy + 2.4, c.cz)), c.state === "firing" ? "VLS 해치 개방 · 사출" : "VLS 예비탄 수납", 1 - clamp(c.t / 7.5, 0, 1), "#7cc4ff");
    }
    for (const sd of [1, -1]) {
      const can = P.canRacks?.find((x) => x.state === "reloading" && x.side === sd);
      if (can) { can.rack.updateWorldMatrix(true, false); drawCallout(can.rack.localToWorld(new THREE.Vector3(0.8, 1.5, 0)), can.t > 5.5 ? "발사관 후폭풍 배출" : "대함미사일 장전", 1 - clamp(can.t / 8.0, 0, 1), "#3fc7b5"); }
    }
  }
  if (!P.alive || G.auto) return;
  // aim point
  if (mode !== "watch") {
    const torpOn = weapon === "torp" && P.spec.torp, AP = torpOn ? (torpLead ? new THREE.Vector3(torpLead.x, 1, torpLead.z) : new THREE.Vector3(P.pos.x + Math.cos(torpB) * P.spec.torp.range * 0.6, 1, P.pos.z + Math.sin(torpB) * P.spec.torp.range * 0.6)) : P.aimPoint();
    const q = proj(AP.clone().setY(1));
    if (!q || !q.on) { // aim point off screen: arrow at the edge
      const v = AP.clone().setY(1).project(camera), back = v.z > 1, ax = (back ? -v.x : v.x), ay = (back ? -v.y : v.y), m = Math.max(Math.abs(ax), Math.abs(ay), 1e-6), ex = cx + (ax / m) * (W / 2 - 60), ey = H / 2 - (ay / m) * (H / 2 - 170), ang = Math.atan2(-(ay), ax);
      hx.save(); hx.translate(ex, ey); hx.rotate(ang); hx.fillStyle = lock ? "#ff8a7a" : "#fff2c4"; hx.beginPath(); hx.moveTo(14, 0); hx.lineTo(-6, -8); hx.lineTo(-6, 8); hx.closePath(); hx.fill(); hx.restore();
      txt(torpOn ? `어뢰 방위 ${brg(torpB)}` : `조준점 ${(P.aimR / 1000).toFixed(1)} km`, ex, ey + 22, lock ? "#ff8a7a" : "#fff2c4", "bold 11px 'Noto Sans KR', sans-serif", "center");
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
  if (hintT > 0 && mode !== "watch") { hx.globalAlpha = clamp(hintT, 0, 1); txt(G.modern ? "우클릭: 이동 · 더블클릭: 함포·미사일 목표 · Space 발사 · Q 무기 · F 전투기 · I 직접 조종 · G 대공 사격 · ` 지휘통제실 · M 지도 · H 조작법" : "좌클릭 끌기: 시점 이동 · Alt+끌기/클릭: 함선 선택 · 우클릭: 이동 · 더블클릭: 조준/적함 고정 · A/D·W/S 사선 · Space 발사 · M 지도 · H 조작법", cx, H - 118, "#e8f0f2", "bold 12.5px 'Noto Sans KR', sans-serif", "center"); hx.globalAlpha = 1; }
}
function drawWatchCaption(p) {
  const W = hud.width, cx = W / 2, B = p.bandit && p.mode === "dogfight" ? ` — ${p.bandit.callsign} 추격` : "";
  panel(cx - 230, 66, 460, 46); txt(`${p.label} · ${p.activity}${B}`, cx, 82, "#cfe7ff", "bold 14px 'Noto Sans KR', sans-serif", "center");
  txt(`${kmh(p.speed)} km/h · 고도 ${Math.round(p.pos.y)} m · 탄약 ${p.ammo} · 폭탄 ${p.bombs} · 기체 ${Math.round(p.hp)}% · 격추 ${p.kills}`, cx, 101, "#9fb0b8", "11px 'Noto Sans KR', sans-serif", "center");
  txt("Enter: 직접 조종 · Tab: 다음 · 우클릭 끌기: 시점 회전 · 휠: 거리", cx, 124, "#ffd166", "11px 'Noto Sans KR', sans-serif", "center");
}
// ── key remapping: a capture listener turns the physical key into the game's default code before any handler sees it ──
const KEY_ACTIONS = [["주무장 발사 (주포 / 대함미사일) · 기관포 · 비행 중 대함", "Space"], ["지휘통제실 (현대전 합동 지원)", "Backquote"], ["무기 전환 (주포↔어뢰 / 함포↔미사일)", "KeyQ"], ["자동 공격", "KeyZ"], ["전투기 출격", "KeyF"], ["전투기 임무 변경", "KeyN"], ["전투기 직접 조종 / 복귀", "KeyI"], ["자동 조종 (비행 중)", "KeyK"],
  ["대공 사수 · 현대전 미사일·적기 요격", "KeyG"], ["나포 · 비행 중 폭탄/공대공", "KeyB"], ["직접 전투·시점 전환", "KeyV"], ["자동 전투 전환", "KeyJ"], ["지도 시점", "KeyM"], ["기함 카메라", "KeyC"], ["표시 숨김", "KeyU"], ["수리", "KeyR"],
  ["일시정지", "KeyP"], ["도움말 / 조종 키 표시", "KeyH"], ["카메라 순환", "Tab"], ["사선 왼쪽 / 롤 왼쪽", "KeyA"], ["사선 오른쪽 / 롤 오른쪽", "KeyD"], ["사거리 + / 기수 내림", "KeyW"], ["사거리 − / 기수 올림", "KeyS"],
  ["러더 왼쪽", "KeyQ2"], ["플레어", "KeyX"], ["착함", "KeyL"], ["미사일 추적 카메라 (현대전)", "KeyT"], ["레이더 (현대전)", "KeyO"], ["헬기 정찰 (현대전)", "KeyY"], ["전자 재밍", "KeyE"], ["전투기 전체 귀환", "Digit5"]].filter((a) => a[1] !== "KeyQ2");
let keyBind = {}; try { keyBind = JSON.parse(careerStorage.getItem("steeltide:keys") || "{}") || {}; } catch {}
let keyPhys = {}; function buildKeyPhys() { keyPhys = {}; for (const [, def] of KEY_ACTIONS) { const k = keyBind[def]; if (k && k !== def) keyPhys[k] = def; } for (const [, def] of KEY_ACTIONS) { const k = keyBind[def]; if (k && k !== def && !keyPhys[def]) { const owner = KEY_ACTIONS.find(([, d]) => (keyBind[d] || d) === def); if (!owner) keyPhys[def] = "__none"; } } } buildKeyPhys();
const keyName = (c) => (c || "").replace(/^Key/, "").replace(/^Digit/, "").replace("Space", "스페이스").replace("ShiftLeft", "Shift").replace("ControlLeft", "Ctrl");
for (const type of ["keydown", "keyup"]) window.addEventListener(type, (e) => {
  if (e.__mapped || (e.target && e.target.tagName === "INPUT")) return;
  if (keyCatch && type === "keydown") { e.preventDefault(); e.stopImmediatePropagation(); keyCatch(e.code); return; }
  const m = keyPhys[e.code]; if (!m) return; e.preventDefault(); e.stopImmediatePropagation(); if (m === "__none") return;
  const ev = new KeyboardEvent(type, { code: m, key: e.key, altKey: e.altKey, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey, repeat: e.repeat }); ev.__mapped = true; window.dispatchEvent(ev);
}, true);
let keyCatch = null;
function renderKeys() {
  $("#keyList").innerHTML = KEY_ACTIONS.map(([n, d]) => `<span>${n}</span><button data-kd="${d}">${keyName(keyBind[d] || d)}</button>`).join("");
}
function setKey(def, code) {
  const old = keyBind[def] || def; const other = KEY_ACTIONS.find(([, d]) => d !== def && (keyBind[d] || d) === code);
  if (other) keyBind[other[1]] = old; keyBind[def] = code;
  for (const k of Object.keys(keyBind)) if (keyBind[k] === k) delete keyBind[k];
  try { careerStorage.setItem("steeltide:keys", JSON.stringify(keyBind)); } catch {} buildKeyPhys(); renderKeys();
}
$("#trailsOn") && ($("#trailsOn").checked = trailsOn); $("#trailsOn")?.addEventListener("change", (e) => { trailsOn = e.target.checked; setTrails(trailsOn); try { careerStorage.setItem("steeltide:trails", trailsOn ? "1" : "0"); } catch {} });
$("#killcamOn").checked = killcamOn; $("#killcamOn").addEventListener("change", (e) => { killcamOn = e.target.checked; try { careerStorage.setItem("steeltide:killcam", killcamOn ? "1" : "0"); } catch {} });
$("#keysBtn").addEventListener("click", () => { $("#keysM").style.display = "grid"; renderKeys(); });
$("#keysM").addEventListener("click", (e) => {
  const b = e.target.closest("[data-kd]"); if (b) { b.textContent = "키를 누르세요…"; const def = b.dataset.kd; keyCatch = (code) => { keyCatch = null; if (code !== "Escape") setKey(def, code); else renderKeys(); }; return; }
  if (e.target.id === "keysReset") { keyBind = {}; try { careerStorage.removeItem("steeltide:keys"); } catch {} buildKeyPhys(); renderKeys(); toast("키 설정 초기화"); }
  if (e.target.id === "keysClose") { keyCatch = null; $("#keysM").style.display = "none"; }
});
// ── tutorial: a short step card on the first battle of each mode ──
const TUT = {
  modern: [["적함을 더블클릭해 표적으로 고정하세요 (없으면 가장 가까운 적을 노립니다)", () => !!lock], ["Space로 대함미사일을 일제사격하세요 (Q: 함포 전환)", () => G.stats.shots > 0], ["T로 내가 쏜 미사일을 따라가 보세요 (다시 T로 끝)", () => !!MSL.cam],
    ["F로 전투기를 출격시키세요 (N: 임무 변경)", () => MSL.jets.some((j) => j.alive && j.side === "us")], ["I로 전투기를 직접 조종하세요 — W/S 기수 위·아래 · 휠 속력 · A/D 롤 · 좌클릭 기관포", () => !!md.fly], ["끝! K 자동 조종 · X 플레어 · L 착함 · I 함대 복귀 · H 조작 키", null]],
};
const tut = { mode: null, i: 0, t: 0 };
function tutStart() { const k = "modern"; let done = false; try { done = careerStorage.getItem(`steeltide:tut:${k}`) === "1"; } catch {} tut.mode = !G.auto && !done ? k : null; tut.i = 0; tut.t = 0; }
function tutDone() { try { careerStorage.setItem(`steeltide:tut:${tut.mode}`, "1"); } catch {} tut.mode = null; }
function tutStep(dt) {
  if (!tut.mode || G.state !== "playing" || G.auto) return; const L = TUT[tut.mode], s = L[tut.i]; tut.t += dt;
  if (s[1] ? s[1]() && tut.t > 1 : tut.t > 9) { tut.i++; tut.t = 0; sfx.ready(); if (tut.i >= L.length) { tutDone(); return; } }
  const W = hud.width, w = 470, x = W / 2 - w / 2, y = md.fly ? 52 : hud.height - 156; panel(x, y, w, 44); hx.textBaseline = "middle";
  txt(`튜토리얼 ${Math.min(tut.i + 1, L.length)}/${L.length} — ${L[tut.i][0]}`, W / 2, y + 16, "#ffd166", "bold 12.5px 'Noto Sans KR', sans-serif", "center");
  txt("Esc: 튜토리얼 건너뛰기", W / 2, y + 33, "#cfd8dc", "11px 'Noto Sans KR', sans-serif", "center");
}
$("#tutReset").addEventListener("click", () => { try { careerStorage.removeItem("steeltide:tut:modern"); } catch {} toast("다음 전투에서 튜토리얼이 다시 나옵니다"); });
function drawAlerts(dt) {
  const W = hud.width, cx = W / 2; hx.textBaseline = "middle";
  if (torpThreat && Math.floor(G.time * 4) % 2 === 0) txt(`어뢰 접근! ${torpThreat.toFixed(0)}초`, cx, 150, "#ff3b30", "bold 22px 'Noto Sans KR', sans-serif", "center");
  if (radioSub && MSL.list.some((m) => m.alive && m.side === "foe")) radioSub = null; if (radioSub) { radioSub.t -= dt; if (radioSub.t <= 0) radioSub = null; else { hx.globalAlpha = clamp(radioSub.t, 0, 1); rr(cx - 140, 168, 280, 26, 4); hx.fillStyle = "rgba(10,30,20,.75)"; hx.fill(); txt(`[무전] ${radioSub.text}`, cx, 181, "#b8ffb0", "bold 13px 'Noto Sans KR', sans-serif", "center"); hx.globalAlpha = 1; } }
}
const HELP = [["Space / Q", "주무장 발사 / 무기 전환 (대함미사일↔함포)"], ["F / N / I", "전투기 출격 / 임무 변경 (요격·공격) / 직접 조종·복귀"], ["G / 5", "대공 사수(요격) / 전투기 전체 귀환"], ["O / Y / T", "레이더 방사·통제 / 정찰 헬기 / 미사일 추적 카메라 — 방공은 자동"], ["우클릭", "그 지점으로 이동 (Shift: 경유지 추가 · 기함 위: 정지)"], ["1 / 2 / 3 · 0", "속력: 미속 / 반속 / 전속 · 정지"], ["A / D", "사선(포 방향) 좌우 회전 — Shift: 미세"], ["W / S", "사거리 늘리기 / 줄이기"], ["더블클릭", "그 지점 조준 · 적함 더블클릭: 표적 고정 (리드 자동)"], ["좌클릭 끌기", "카메라 자유 이동 (C: 기함으로 복귀)"], ["Alt + 끌기 · Alt + 클릭", "아군 함선 선택 (Shift: 추가) → 우클릭: 선택한 함선 이동 · 기함 우클릭: 호위 복귀"], ["M", "지도 시점 — 위에서 전장 전체 보기 (휠: 축척)"], ["Space", "발사 (누르고 있으면 장전되는 대로 연사)"], ["Z", "자동 공격 켜기/끄기 — 주포 자동 조준·발사 + 어뢰 탑재함은 어뢰 자동 발사"], ["Q", "주포 ↔ 어뢰 (구축함)"], ["R", "수리반 — 화재·침수 진압 + 선체 복구"], ["F", "전투기 출격 (최대 9기) — 오른쪽 항공대 패널에서 기체별 임무: 요격 / 함대 공격 / 자동"], ["Tab", "카메라 대상: 기함 → 전투기 → 항모 → 표적"], ["Enter", "보고 있는 전투기 직접 조종 / 자동 조종 복귀"], ["우클릭 끌기 · 휠", "카메라 회전 · 확대/축소 (방향키도 가능)"], ["V (비행 중)", "조종석 1인칭 ↔ 추적 시점"], ["G", "대공 사수 1인칭 — 40mm 기관포로 적기 직접 사격"], ["미니맵", "우클릭: 이동 · 좌클릭: 조준 · 휠: 축척"], ["U", "화면 표시 모두 끄기 — 전투 장면만 보기 (다시 U)"], ["P", "메뉴 (계속 · 전투 포기 · 소리 설정)"]];
function drawHelp() {
  const x = 14, y = 70, w = 470, h = HELP.length * 20 + 40; panel(x, y, w, h); txt("조작법 (H: 닫기)", x + 14, y + 18, "#ffd166", "bold 13px 'Noto Sans KR', sans-serif");
  HELP.forEach(([k, v], i) => { txt(k, x + 14, y + 42 + i * 20, "#ffc857", "bold 12px 'Noto Sans KR', sans-serif"); txt(v, x + 140, y + 42 + i * 20, "#dfe8ec", "12px 'Noto Sans KR', sans-serif"); });
}

// ── minimap (rotates with the camera; hidden enemies at their last known spot) ──
const plot = $("#plot"), pctx = plot.getContext("2d"); let radarSweep = 0; let plotZoom = 1, plotSc = 1, plotCss = 230;
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
  const P = G.player, J = md.fly && md.fly.alive ? md.fly : null, O = J ? J.pos : P.pos, YAW = J ? (J.pyaw ?? cam.yaw) : cam.yaw; /* flying a jet: the scope centres on the jet and turns with its heading */
  const W = plot.width, c = W / 2, cy = Math.cos(YAW), sy = Math.sin(YAW);
  plotCss = plot.getBoundingClientRect().width || 230;
  let far = 9000; for (const e of G.enemies) if (e.alive && e.root.visible) far = Math.max(far, d2(O, e.pos)); if (G.goal) far = Math.max(far, d2(O, G.goal)); if (G.modern) for (const ct of G.cts.values()) far = Math.max(far, d2(O, ct)); if (J) far = Math.max(far, d2(O, P.pos));
  plotSc = c / (clamp(far * 1.15, 9000, G.modern ? 50000 : 30000) / plotZoom);
  const M = (x, z) => { const dx = x - O.x, dz = z - O.z; return [c + (dz * cy - dx * sy) * plotSc, c - (dx * cy + dz * sy) * plotSc]; };
  pctx.clearRect(0, 0, W, W); pctx.save(); pctx.beginPath(); pctx.arc(c, c, c - 1, 0, TAU); pctx.clip();
  { // radar scope: phosphor-green face, range rings with labels, bearing ticks, rotating sweep with afterglow
    const bg = pctx.createRadialGradient(c, c, 0, c, c, c); bg.addColorStop(0, "rgba(10,38,26,.86)"); bg.addColorStop(1, "rgba(4,16,12,.92)"); pctx.fillStyle = bg; pctx.fillRect(0, 0, W, W);
  pctx.fillStyle = "rgba(48,78,44,.32)"; pctx.strokeStyle = "rgba(150,230,140,.45)"; pctx.lineWidth = 2; for (const isl of G.islands) { if (isl.poly) { pctx.beginPath(); isl.poly.forEach(([px, pz], i) => { const [x, y] = M(px, pz); i ? pctx.lineTo(x, y) : pctx.moveTo(x, y); }); pctx.closePath(); pctx.fill(); pctx.stroke(); continue; } /* land: dark fill, bright coastline echo */ const [x, y] = M(isl.x, isl.z), r = isl.r * plotSc; if (x + r < 0 || y + r < 0 || x - r > W || y - r > W) continue; pctx.beginPath(); pctx.arc(x, y, Math.max(r, 1.5), 0, TAU); pctx.fill(); } /* land under the sweep, rings and contacts so it never hides them */
    const sw = (G.time * 1.3) % TAU; radarSweep = sw;
    if (pctx.createConicGradient) { const cg = pctx.createConicGradient(sw - 1.2, c, c); cg.addColorStop(0, "rgba(90,255,140,0)"); cg.addColorStop(0.19, "rgba(90,255,140,.16)"); cg.addColorStop(0.191, "rgba(90,255,140,0)"); cg.addColorStop(1, "rgba(90,255,140,0)"); pctx.fillStyle = cg; pctx.fillRect(0, 0, W, W); }
    pctx.strokeStyle = "rgba(150,255,170,.55)"; pctx.lineWidth = 2; pctx.beginPath(); pctx.moveTo(c, c); pctx.lineTo(c + Math.cos(sw) * c, c + Math.sin(sw) * c); pctx.stroke();
    pctx.strokeStyle = "rgba(110,220,140,.22)"; pctx.lineWidth = 1.5; pctx.font = "15px 'Noto Sans KR', sans-serif"; pctx.fillStyle = "rgba(140,230,160,.55)"; pctx.textAlign = "left"; pctx.textBaseline = "bottom";
    const step = plotSc * 5000 > c * 0.18 ? 5000 : 10000; for (let r = step; r * plotSc < c * 1.4; r += step) { pctx.beginPath(); pctx.arc(c, c, r * plotSc, 0, TAU); pctx.stroke(); pctx.fillText(`${r / 1000}`, c + 4, c - r * plotSc - 2); }
    pctx.strokeStyle = "rgba(110,220,140,.35)"; for (let d = 0; d < 36; d++) { const a = (d / 36) * TAU - YAW - PI / 2, r0 = c - (d % 9 === 0 ? 18 : 9); pctx.beginPath(); pctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); pctx.lineTo(c + Math.cos(a) * (c - 2), c + Math.sin(a) * (c - 2)); pctx.stroke(); }
    pctx.strokeStyle = "rgba(110,220,140,.18)"; pctx.beginPath(); pctx.moveTo(c - c, c); pctx.lineTo(c + c, c); pctx.moveTo(c, 0); pctx.lineTo(c, W); pctx.stroke();
  }
  if (!J) { pctx.setLineDash([8, 8]); pctx.strokeStyle = "rgba(255,255,255,.35)"; pctx.beginPath(); pctx.arc(c, c, P.tb.max * plotSc, 0, TAU); pctx.stroke();
  pctx.strokeStyle = P.seenByFoe ? "rgba(255,110,90,.5)" : "rgba(140,240,120,.35)"; pctx.beginPath(); pctx.arc(c, c, conceal(P) * plotSc, 0, TAU); pctx.stroke(); pctx.setLineDash([]); }
  { const nx = c - sy * 0 , n = M(O.x + 1, O.z); void nx; const a = Math.atan2(n[1] - c, n[0] - c); pctx.fillStyle = "rgba(200,220,230,.7)"; pctx.font = "bold 20px 'Noto Sans KR', sans-serif"; pctx.textAlign = "center"; pctx.textBaseline = "middle"; pctx.fillText("N", c + Math.cos(a) * (c - 16), c + Math.sin(a) * (c - 16)); }
  const tri = (x, z, h, color, s = 13) => { const [px, py] = M(x, z); pctx.save(); pctx.translate(px, py); pctx.rotate(h - YAW); pctx.fillStyle = color; pctx.beginPath(); pctx.moveTo(0, -s); pctx.lineTo(s * 0.46, s * 0.7); pctx.lineTo(-s * 0.46, s * 0.7); pctx.closePath(); pctx.fill(); pctx.restore(); };
  if (G.goal) { const [gx, gy] = M(G.goal.x, G.goal.z); pctx.strokeStyle = "#7ff0e0"; pctx.lineWidth = 2; pctx.strokeRect(gx - 9, gy - 9, 18, 18); pctx.fillStyle = "#7ff0e0"; pctx.font = "16px 'Noto Sans KR', sans-serif"; pctx.fillText(G.goal.label || "집결지", gx, gy - 20); }
  if (P.nav.length) { pctx.strokeStyle = "#8ef07a"; pctx.setLineDash([6, 6]); pctx.lineWidth = 2; pctx.beginPath(); pctx.moveTo(c, c); for (const w of P.nav) pctx.lineTo(...M(w.x, w.z)); pctx.stroke(); pctx.setLineDash([]); }
  if (P.alive) { const tp = weapon === "torp" && P.spec.torp ? { x: P.pos.x + Math.cos(torpB) * P.spec.torp.range, z: P.pos.z + Math.sin(torpB) * P.spec.torp.range } : P.aimPoint(), [ax, ay] = M(tp.x, tp.z); pctx.strokeStyle = weapon === "torp" ? "#9be06a" : "#fff2c4"; pctx.lineWidth = 1.5; pctx.beginPath(); pctx.moveTo(c, c); pctx.lineTo(ax, ay); pctx.stroke(); pctx.beginPath(); pctx.arc(ax, ay, 6, 0, TAU); pctx.stroke(); }
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
  if (J) { tri(J.pos.x, J.pos.z, J.pyaw ?? 0, "#7ff0ff", 12); pctx.fillStyle = "#7ff0ff"; pctx.font = "bold 15px 'Noto Sans KR', sans-serif"; pctx.textAlign = "center"; pctx.textBaseline = "top"; pctx.fillText("나", c, c + 14); } /* the jet you fly, always at the centre pointing up */
  if (G.modern) { for (const s of G.ships) if (s.side === "us" && s.alive && s.spec.modern) { const [x, y] = M(s.pos.x, s.pos.z); ntds(pctx, x, y, 15, false, s === P ? "#9be06a" : "#7cc4ff"); }
    for (const h of MSL.helos) if (h.alive && h.side === "us") { const [x, y] = M(h.pos.x, h.pos.z); ntds(pctx, x, y, 9, false, "#cfe7ff", false, true); pctx.beginPath(); pctx.setLineDash([2, 5]); pctx.strokeStyle = "rgba(207,231,255,.35)"; pctx.arc(x, y, SR.helo * plotSc, 0, TAU); pctx.stroke(); pctx.setLineDash([]); } }
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
    const P = G.player;
    if (G.state === "playing") { G.battleT += dt; events(); }
    hintT = Math.max(0, hintT - dt);
    fogStep(dt); pickTarget();
    if (!G.auto) { navStep(dt); if (!cap.fps) gunStep(dt); aaStep(dt); }
    capStep(dt); if (G.modern) modernStep(dt);
    fleetAI(dt);
    if (G.auto && P.alive && G.state === "playing") { if (G.waves && G.goal && !G.enemies.some((e) => e.alive)) { const w = Math.atan2(G.goal.z - P.pos.z, G.goal.x - P.pos.x); P.rudderCmd = clamp(wrap(w - P.heading) * 2.2, -1, 1); P.tele = 4; } /* automatic battle: no fleet left, head for the destination */
      else { const t = G.enemy || P; ap.blind = !(G.enemy && G.enemy.root.visible); brain(P, t, ap, dt); } }
    for (const s of G.ships) s.update(dt);
    updateShells(dt); updateTorps(dt); updateAir(dt); torpWatch(dt);
    if (P.alive && P.hp / P.maxHp < 0.3 && !hullWarned) { hullWarned = true; G.radio("hull"); }
    rep.cd = Math.max(0, rep.cd - dt);
    for (const t of P.turrets) if (!t.alive && t.fixT > 0 && P.alive) { t.fixT -= dt; if (t.fixT <= 0) { t.alive = true; t.reload = P.reloadT; t.fixT = 0; log(`${t.i + 1}번 포탑 수리 완료 — 사격 재개`, "hit"); sfx.ready(); } }
    if (G.mastFlag) waveMastFlag();
    goalBeacon();
    if (P.alive) G.minHp = Math.min(G.minHp ?? 1, P.hp / P.maxHp);
    if (rep.act > 0) { rep.act -= dt; P.fires.length = 0; if (P.alive) P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.006 * (G.perkK?.repairK || 1) * dt); }
    for (const r of ribbons) r.t -= dt; while (ribbons.length && ribbons[0].t <= 0) ribbons.shift();
    missionCheck();
    if (G.state === "ending") { endT -= dt; if (endT <= 0) finish(); }
  } else { for (const s of G.ships) s.update(dt); updateShells(dt); updateTorps(dt); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $("#toast").classList.remove("on"); }
  if (!altDown()) { const k = 1 - Math.exp(-dt * 7); freeYaw -= freeYaw * k; freePitch -= freePitch * k; }
  updateAudio(dt, { cockpit: false, nearShip: fp === "command" ? clamp(1 - effDist() / 4000, 0.3, 1) : 0.35 });
}
function loop() { frameOnce(Math.min(clock.getDelta(), 0.05)); requestAnimationFrame(loop); }
/** One full frame (sim, camera, HUD, render); also driven directly by tests while the tab is hidden. */
function frameOnce(dt) {
  G.frames = (G.frames || 0) + 1; if (!paused) { const sdt = G.kc ? dt * 0.35 : dt; step(sdt); if (G.auto && G.state === "playing" && !G.kc) for (let k = 1; k < autoSpeed; k++) step(dt); if (G.kc && (G.kc.t -= dt) <= 0) G.kc = null; } fp = updateCamera(dt); updateOverlays(paused ? 0 : dt); if (cinema) { for (const o of [gunLines, arcLine, maxRing, navLine, fanLines, mapGrid, ...navRings]) o.visible = false; for (const k of markers) k.m.visible = false; }
  updateWorld(dt, screen === "battle" ? cam.focus : G.player ? G.player.pos : null);
  const battle = (G.state === "playing" || G.state === "ending") && G.player;
  document.body.classList.toggle("firstp", false);
  hx.clearRect(0, 0, hud.width, hud.height);
  if (battle && !cinema) {
    if (fp === "aa") { drawAAHUD(); if (G.modern) { drawOpsLine(); if (aa.ammo === "msl") drawAAMsl(); } }
    else if (fp === "board") drawBoardHUD();
    else if (fp === "missile") { drawModernHUD(); drawMissileCamHUD(); }
    else if (fp === "fly") { drawModernHUD(); drawFlyHUD(); if (md.fly && (helpOn || G.time < (md.keysUntil ??= G.time + 12))) drawFlyKeys(md.fly); } /* key card: first 12 s of the first flight, then H */
    else if (fp === "kill") { const W = hud.width; panel(W / 2 - 170, 66, 340, 40); txt(`격침 — ${G.kc?.ship.name || ""}`, W / 2, 91, "#ffd27a", "bold 16px 'Noto Sans KR', sans-serif", "center"); }
    else { drawCommandHUD(fp); drawBoardStatus(); drawSel(); if (G.modern) drawModernHUD(); if (fp === "watch") drawWatchCaption(cam.tgt); if (helpOn) drawHelp(); }
    drawAlerts(paused ? 0 : dt); if (!paused) tutStep(dt);
    if (frame++ % 2 === 0) updateMap(); if (frame % 6 === 0) renderJetPanel(); if (frame % 4 === 0) updatePanels(); syncAutoBtn();
    document.body.classList.toggle("aamode", fp === "aa" || fp === "board");
  }
  const ov = aaGun.visible || jetPit.visible || garandVM.visible || mgVM.visible; if (ov) { ovCam.fov = camera.fov; ovCam.updateProjectionMatrix(); }
  renderFrame(ov);
  if (G.modern && G.state === "playing") {
    const pip = cicFeedInfo();
    if (pip && pip.cam && pip.rect) renderPiP(pip.cam, pip.rect);
    const fds = cicBigFeeds(), fd = fds && fds[frame % 2]; if (fd) renderToCanvas(fd.cam, fd); /* CIC big view: the two EO/IR monitors, one per frame */
  }
}

window.__st = { opMapAdvance, opMapState, opMapAir, startOpMap, cicWcs, cicSetWcs, cicFeedInfo, aimAAAt: (p) => { const o = aaMount(), v = p.clone().sub(o); aa.yaw = Math.atan2(v.z, v.x); aa.pitch = Math.atan2(v.y, Math.hypot(v.x, v.z)); }, aaMslFire, KCAMP, openBrief, get kProg() { return kProg; }, opsDebug, setJetRole, setFlyAuto, get kc() { return G.kc; }, setWx: (t, w) => { todSel = t; wxSel = w; }, conceal, get tut() { return tut; }, setKey, get keyPhys() { return keyPhys; }, flyControl, flyFlare, MSL2: MSL, frameOnce, takeJet, releaseFly, flyFire, flyStrike, get flyLock() { return md.flyLock; }, know, sortieJets, myAir, landAt, setSel, get sel() { return sel; }, setLock: (v) => { lock = v; }, sensorStep, bestContact, SR, WPN, G, air, cam, aa, MSL, md, fireSalvo, modernKey, setNat: (a, b) => { natUs = a; natFoe = b; }, toAuto, takeOver, setTheater: (t) => { theater = t; }, get cmdr() { return cmdr; }, toggleAA, cap, startBoard, toggleCapFps, canBoard, fc, get profile() { return profile; }, start, step, frame: (dt) => { step(dt); updateCamera(dt); }, tryFire, openYard, openMenu, act, setPause, forfeit,
  moveOrder, aimAtPoint, lockShip, setSpeed, cycleCam, pick, useRepair, setMission: (m) => { mission = m; }, get lock() { return lock; }, get weapon() { return weapon; }, setWeapon: (w) => { weapon = w; },
  get paused() { return paused; }, get torpThreat() { return torpThreat; }, get radioSub() { return radioSub; }, keys, fireTorps, intercept, leadPoint, myRank, setLockOn: (t) => { lockOn = t; }, get lockOn() { return lockOn; }, help: (v) => { helpOn = v; } };
loadModels(); showcase(flagshipId()); refreshMenus(); connect(); bgm("menu"); /* the first port screen is not opened through openMenu, so ask for its music here (it starts on the first click) */
if (params.has("autostart")) {
  if (MISSIONS[params.get("mission")] && isModernOp(params.get("mission"))) mission = params.get("mission");
  if (MAPS[params.get("theater")]) theater = params.get("theater");
  start(params.get("autostart") === "watch");
  const foc = params.get("focus");
  if (foc === "outpost" && G.outpost) { cam.free = true; cam.tgt = null; cam.focus.set(G.outpost.x, 32, G.outpost.z); cam.dist = +(params.get("dist") || 1650); cam.pitch = +(params.get("pitch") || 0.34); cam.yaw = +(params.get("yaw") ?? (G.outpost.yaw ?? 1.1)); paused = true; }
  else if (foc === "caldera" && G.islands[1]) { cam.free = true; cam.tgt = null; cam.focus.set(G.islands[1].x, 45, G.islands[1].z); cam.dist = +(params.get("dist") || 3800); cam.pitch = +(params.get("pitch") || 0.42); cam.yaw = +(params.get("yaw") || 0.7); paused = true; }
}
loop();
if (!params.has("autostart")) {
  if (location.hash === "#hq" && activeCharacterId() && cmdr.name) { history.replaceState(null, "", location.pathname + location.search); openHQ("duty"); }
  else openTitleHub(!characters().length && !staff.branch);
}
