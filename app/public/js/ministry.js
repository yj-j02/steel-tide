// 국방부장관 · 국방 경영 (36주 임기, 3열 6탭 싱글 화면): 예산·지지율·긴장도·사기, 3군 합동 워룸(자동 위임 / FM 작전 / 3D 직접 개입), 전력증강, 사령부인사, 국회·정치, 커리어트랙.
import { KOREA, kxy } from "./korea.js";
import { ministryContent } from "./content/kr.js";
import { staff, normBranch, serviceOf, isUS } from "./staff.js";
// 모든 수치는 게임용 값이다 (실제 국방 예산·제원이 아님).
const MK = "steeltide:mod", HK = "steeltide:hall", LK = "steeltide:legacy";
export const TERM = 36;
const BASE = 4350, UPKEEP = 2000;
const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const won = (n) => (Math.abs(n) >= 10000 ? `${(n / 10000).toFixed(2)}조` : `${Math.round(n).toLocaleString("ko-KR")}억`);
const pick = (a) => a[(Math.random() * a.length) | 0];

const { DOCTRINES, PROGS, AREAS, FLEETS, LVN, SUR, DOCKET, REINF, LVK, THREAT, GIV } = ministryContent(fx, chain, note);
export { DOCTRINES, PROGS, AREAS };

function chain(m, id, weeks) { (m.queue ??= []).push({ id, week: m.week + weeks }); }
const DK = (id) => DOCKET.find((d) => d[0] === id);
function fx(m, k, v, weeks) { (m.fx ??= []).push({ k, v, until: m.week + weeks }); }
function note(m, t) { (m.notes ??= []).unshift(`${m.week}주차 · ${t}`); m.notes = m.notes.slice(0, 30); (m.headlines ??= []).unshift(`${m.week}주차 · ${t}`); m.headlines = m.headlines.slice(0, 14); }

export const minState = () => rd(MK, null);
const save = (m) => wr(MK, m);
export const hall = () => rd(HK, []);
export const legacy = () => rd(LK, null);

const mkCmdr = () => ({ name: `${pick(SUR)}${pick(GIV)}`, st: 54 + ((Math.random() * 34) | 0) });
function ensureCmdrs(m) {
  m.cmdr ||= {};
  for (const k of ["army1", "f1", "f2", "air1", "mob", "sub", "airc", "art"]) if (!m.cmdr[k]) m.cmdr[k] = mkCmdr();
  m.tension ??= 34; m.morale ??= 72; m.headlines ??= ["신임 국방부장관 취임 — 3군 합동 전력 개편 착수"];
}

/** 장관 취임: 집무실 데이터 생성 (이미 있으면 그대로) */
export function minStart(name) {
  let m = minState();
  if (m && !m.retired) { ensureCmdrs(m); save(m); return m; }
  const L = legacy();
  m = { week: 1, budget: 16500, support: 60, tension: 34, morale: 72, doctrine: null, prog: { ship: 0, air: 0, kamd: 0, log: 0 }, fx: [], notes: [], headlines: [`${name} 국방부장관 취임 — 36주 임기 시작`], sup: [], bud: [], war: null, wins: 0, fights: 0, docket: [], name, cmdr: {}, retired: false };
  ensureCmdrs(m);
  if (L?.prog) m.prog[L.prog] = 3;
  newWeek(m, true); save(m); return m;
}

const fxv = (m, k, d) => (m.fx || []).filter((e) => e.k === k && e.until >= m.week).reduce((a, e) => (d === 1 ? a * e.v : a + e.v), d);

/** 작전·전투에 쓰는 보정치 — 장관 재임 중이거나 2회차 계승이 있을 때만 */
export function minFx() {
  const m = minState(), on = m && !m.retired, L = legacy(), lv = (k) => (on ? m.prog[k] || 0 : L?.prog === k ? 3 : 0), D = on ? m.doctrine : null;
  const F = { outK: 1, inK: 1, icptK: 1, detK: 1, reloadK: 1, resPlus: 0, fatK: 1, cdK: 1, asmK: 1, moraleAdd: 0, repairCut: 0, trustLossK: 1, rngK: 1, airFuelK: 1, a2sK: 1, seadUnit: false, uav: false, satK: 0, icpt2: false, coastCut: false, autoRepair: false, fixCost: 10, saveSunk: false, aegisOk: false, ffx: false, jsf: false, lossK: 1, on: !!on };
  if (L?.medal) F.outK *= 1.1;
  if (D === "off") { F.outK *= 1.15; F.reloadK *= 0.92; F.inK *= 1.1; F.lossK = 1.3; }
  if (D === "aad") { F.icptK *= 1.12; F.repairCut += 1; F.reloadK *= 1.08; }
  if (D === "joint") { F.cdK *= 0.8; F.resPlus += 1; F.fatK *= 1.25; }
  if (D === "tech") F.detK *= 1.25;
  const s = lv("ship"), a = lv("air"), k = lv("kamd"), g = lv("log");
  if (s >= 1) F.aegisOk = true; if (s >= 2) F.trustLossK = 0.85; if (s >= 3) F.ffx = true; if (s >= 4) F.rngK = 1.1; if (s >= 5) F.jsf = true;
  if (a >= 1) F.airFuelK = 1.15; if (a >= 2) F.a2sK = 1.1; if (a >= 3) F.seadUnit = true; if (a >= 4) { F.rearmK = 0.7; F.fatK *= 0.7; } if (a >= 5) F.uav = true;
  if (k >= 1) F.detK *= 1.1; if (k >= 2) F.icptK *= 1.08; if (k >= 3) F.satK = 2; if (k >= 4) F.icpt2 = true; if (k >= 5) F.coastCut = true;
  if (g >= 1) F.repairCut += 1; if (g >= 3) F.autoRepair = true; if (g >= 4) F.fixCost = 5; if (g >= 5) F.saveSunk = true;
  if (on) { F.outK *= fxv(m, "outK", 1); F.inK *= fxv(m, "inK", 1); F.icptK *= fxv(m, "icptK", 1) * (m.lsamUp || 1); F.detK *= fxv(m, "detK", 1) * (m.satUp ? 1.05 : 1) * (m.droneUp || 1) * (m.droneWar || 1); F.asmK *= fxv(m, "asmK", 1); F.cdK *= fxv(m, "cdK", 1); F.moraleAdd += fxv(m, "moraleAdd", 0); F.repairCut += fxv(m, "repairCut", 0); }
  F.rearmK ??= 1; F.repairCut = Math.min(2, F.repairCut); return F;
}

function progCost(m, k, lvl) {
  const D = m.doctrine, base = PROGS[k].lv[lvl][0], acqK = normBranch(staff.branch) === "acq" ? 0.85 : 1;
  return Math.round(base * (D === "aad" ? 1.1 : 1) * (D === "tech" ? (k === "ship" ? 1.15 : 0.8) : 1) * fxv(m, "costK", 1) * acqK);
}
function upkeep(m) { return Math.round(UPKEEP * (m.doctrine === "joint" ? 1.15 : 1) * ((m.prog.log || 0) >= 2 ? 0.8 : 1) * (m.upkeepUp || 1)); }
function income(m) { return Math.round(BASE * (1 + m.support / 200)); }

function newWeek(m, first) {
  ensureCmdrs(m);
  const areas = {};
  for (const [k, A] of Object.entries(AREAS)) {
    const r = Math.random() * (A.w[0] + A.w[1] + A.w[2]);
    let lvl = r < A.w[0] ? 0 : r < A.w[0] + A.w[1] ? 1 : 2;
    lvl = clamp(lvl + fxv(m, `thr:${k}`, 0), 0, 2);
    areas[k] = { lvl, reinf: null, res: null };
  }
  m.war = { areas, direct: null };
  const seen = m.seenDk ??= {}, due = (m.queue || []).filter((q) => q.week <= m.week).map((q) => q.id);
  m.queue = (m.queue || []).filter((q) => q.week > m.week);
  let pool = DOCKET.filter((d) => !d[4]?.chainOnly && !(d[4]?.once && seen[d[0]]) && !(seen[d[0]] && m.week - seen[d[0]] < 14) && !due.includes(d[0])).map((d) => d[0]);
  if (pool.length < 3) pool = DOCKET.filter((d) => !d[4]?.chainOnly && !(d[4]?.once && seen[d[0]])).map((d) => d[0]);
  const n = first ? 1 : Math.random() < 0.55 ? 2 : 1;
  m.docket = due.slice(0, 2);
  while (m.docket.length < n && pool.length) { const id = pool.splice((Math.random() * pool.length) | 0, 1)[0]; if (!m.docket.includes(id)) m.docket.push(id); }
  for (const id of m.docket) seen[id] = m.week;
}

const NSC_OPT = [
  ["진돗개 하나 발령 · 대비태세 격상", "해당 구역 위임 승률 +10% · 지지율 −1 · 긴장도 +4", "진돗개 하나를 발령하고 해당 구역 전력을 즉각 대응 태세로 올리겠습니다.", (m, W) => { W.nsc = 0.1; m.support -= 1; m.tension = clamp((m.tension || 34) + 4, 5, 95); }],
  ["한미 공조 · 외교 채널 가동", "위협 한 단계 낮춤 · 예산 −300억 · 긴장도 −6", "동맹과 정보를 공유하고 외교 채널로 긴장 완화를 시도하겠습니다.", (m, W) => { W.lvl = Math.max(0, W.lvl - 1); m.budget -= 300; m.tension = clamp((m.tension || 34) - 6, 5, 95); }],
  ["사령관 판단 존중 · 정례 대응", "지지율 +1 (침착한 대응)", "현장 지휘관의 판단을 존중하고 정례 절차대로 대응하겠습니다.", (m) => { m.support += 1; }],
];

function areaP(m, k) {
  ensureCmdrs(m);
  const A = AREAS[k], W = m.war.areas[k], c = m.cmdr[A.fleet] || mkCmdr(), r = W.reinf;
  const svcMatch = serviceOf(staff.branch) === A.domain ? 6 : 0; /* player's home service excels in its domain */
  const sCmd = c.st + fxv(m, "cmd", 0) + svcMatch;
  const sFleet = A.base + (m.prog.ship || 0) * 4 + ((m.prog.ship || 0) >= 1 ? 6 : 0) + (m.prog.log || 0) * 2 + (A.domain === "air" ? (m.prog.air || 0) * 4 : 0) + fxv(m, "fleet", 0);
  const sSup = r ? (REINF[r]?.[1] || 28) + (m.cmdr[r]?.st || 60) * 0.2 + (r === "sub" ? m.subUp || 0 : 0) + (r === "airc" ? (m.prog.air || 0) * 4 + (m.airUp || 0) : 0) + (r === "mob" ? (m.prog.ship || 0) * 3 + (m.mobUp || 0) : 0) : 0;
  const thr = (THREAT[W.lvl] + m.week * 3.1) * (1 - (m.prog.kamd || 0) * 0.025) * ((m.prog.kamd || 0) >= 5 ? 0.9 : 1);
  const k2 = m.doctrine === "off" ? 1.08 : m.doctrine === "joint" && r ? 1.06 : m.doctrine === "aad" ? 1.03 : 1;
  return clamp(Math.round(((sCmd + sFleet + sSup * (m.doctrine === "joint" ? 1.2 : 1)) / thr) * 100 * k2 * 0.65 * (1 + (W.nsc || 0))), 5, 99);
}
const outcomeOf = (p) => (p >= 74 ? ["대승", "g", 1, 300] : p >= 50 ? ["승리", "y", 0, 100] : ["패배", "r", -4, -500]);

/** 직접 지휘(FM 작전 / 3D 개입) 결과 반영 */
export function minOpResult(win, modeLabel = "직접 지휘") {
  const m = minState(); if (!m || m.retired || !m.war || !m.war.direct) return;
  const k = m.war.direct, W = m.war.areas[k]; if (!W) return;
  W.res = win ? ["대승", "g", 3, 800, modeLabel] : ["패배", "r", -5, -500, modeLabel];
  m.tension = clamp((m.tension || 34) + (win ? -6 : 8), 5, 95);
  m.morale = clamp((m.morale || 72) + (win ? 5 : -5), 10, 100);
  note(m, `${AREAS[k].n} ${modeLabel} — ${win ? "대승" : "패배"}`);
  m.war.direct = null;
  save(m);
}

function endWeek(m) {
  const log = [];
  let highs = 0;
  for (const k of Object.keys(AREAS)) {
    const W = m.war.areas[k]; if (W.lvl === 2) highs++;
    let o = W.res;
    if (!o) { const p = clamp(areaP(m, k) + ((Math.random() * 21) | 0) - 10, 0, 100); o = outcomeOf(p); o = [...o, "자동 위임", p]; }
    const sup = o[2] < 0 ? Math.round(o[2] * (m.doctrine === "off" ? 1.3 : 1)) : o[2];
    m.support += sup; m.budget += o[3]; m.fights++;
    if (o[0] !== "패배") m.wins++;
    log.push(`${AREAS[k].n} ${o[0]}(${o[4] === true ? "직접 지휘" : o[4] || "위임"}) 지지율 ${sup > 0 ? "+" : ""}${sup}`);
  }
  if (fxv(m, "misfire", 0) > 0 && Math.random() < 0.1) { m.support -= 20; log.push("선제 타격 수칙 — 오발 사고 발생, 지지율 −20"); }
  const inc = income(m), up = upkeep(m); m.budget += inc - up; log.push(`정기 예산 +${won(inc)} · 유지비 −${won(up)}`);
  const polFloor = normBranch(staff.branch) === "pol" ? 1 : 0;
  m.support = clamp(Math.round(m.support + polFloor + (m.support > 75 ? -3 : m.support > 65 ? -1 : m.support < 50 ? 2 : 0)), 0, 100);
  m.tension = clamp(Math.round((m.tension || 34) + highs * 3 - 2), 5, 95);
  m.morale = clamp(Math.round((m.morale || 72) + fxv(m, "moraleAdd", 0) * 0.6 + (m.support >= 60 ? 1 : -1)), 15, 100);
  m.sup.push(m.support); (m.bud ??= []).push(m.budget);
  note(m, log[0] || `주간 결산 완료 (지지율 ${m.support})`);
  m.last = log;
  m.fx = m.fx.filter((e) => e.until > m.week); m.week++;
  if (m.week > TERM) return termEnd(m);
  newWeek(m);
}

function termEnd(m) {
  const avg = Math.round(m.sup.reduce((a, b) => a + b, 0) / Math.max(1, m.sup.length));
  const l5 = Object.values(m.prog).filter((v) => v >= 5).length;
  const rate = Math.round((m.wins / Math.max(1, m.fights)) * 100);
  const ok = avg >= 60 && l5 >= 2 && rate >= 80;
  m.retired = true; m.term = { avg, l5, rate, ok };
  const H = hall();
  H.unshift({ name: m.name, gen: (legacy()?.gen || 1), at: new Date().toISOString().slice(0, 10), avg, l5, rate, ok, doctrine: m.doctrine ? DOCTRINES[m.doctrine].n : "—", prog: { ...m.prog }, face: globalThis.__myFace?.() || null, start: m.started || null });
  wr(HK, H.slice(0, 40));
}

// ── 화면 (1280×720 3열 6탭 국방 경영 레이아웃) ──
const DRAFTER = { gmsa: "국방정책실장", speaker: "국방정책실장", opcon: "국방정책실장", gsomia: "국제정책관", trilat: "국제정책관", neutral: "국방정책실장", sma: "국제정책관", kf21: "전력정책관", lhd: "전력정책관", lsam: "전력정책관", ssn: "전력정책관", cyber: "전력정책관", drone: "전력정책관", dronewar: "전력정책관", uav: "전력정책관", manpower: "인사복지실장", nco: "인사복지실장", rank: "인사복지실장", phone: "인사복지실장", meal: "인사복지실장", medic: "보건복지관", airbase: "군사시설기획관", zone: "군사시설기획관" };
const SCK = "steeltide:scenes", scenesOn = () => { try { return localStorage.getItem(SCK) !== "off"; } catch { return true; } };
const face = (seed, s, o) => (globalThis.__face ? globalThis.__face(seed, s, o) : "");
const moraleWord = (v) => (v >= 80 ? ["충천", "g"] : v >= 60 ? ["양호", "g"] : v >= 40 ? ["주의", "y"] : ["저하", "r"]);

function docHTML(m, id, t, d, opts, meta) {
  const sc = scenesOn() && meta.sc, who = DRAFTER[id] || "기획조정실장", no = `국방정책-${String(2026 * 7 + m.week * 13 + id.length * 97).slice(-4)}`;
  return `<div class="mn-card mn-dk mn-paper" data-dk="${id}"><div class="dh"><div class="dt"><small>국 방 부</small><b>${t}</b><span>문서번호 ${no} · ${m.week}주차 · 보고 ${who}</span></div>
    <table class="kj"><tr><th>기안</th><th>검토</th><th>결재</th></tr><tr><td>${face(who + id, 30, { age: 2 })}<i>${who.replace(/(실장|관)$/, "")}</i></td><td><em class="ok">차관</em></td><td class="me"><em>장관</em></td></tr></table></div>
    ${meta.mo ? `<span class="mo">실제 사례 모티브 · ${meta.mo}</span>` : ""}<p>${d}</p>${sc ? `<button class="mn-sc" data-min="scene:${id}"><b>${sc === "press" ? "🎤 기자회견장으로 ›" : "🏛 국회 국방위원회 출석 ›"}</b><small>${opts.length}개 답변 중 하나를 고르면 결재됩니다</small></button>` : opts.map(([n, e], i) => `<button data-min="dk:${id}:${i}"><b>${n}</b><small>${e}</small></button>`).join("")}</div>`;
}

let tab = "desk", ngArm = false;
const bar = (v, c = "") => `<i class="mn-bar"><em class="${c}" style="width:${clamp(v, 0, 100)}%"></em></i>`;

const TABS = [
  ["desk", "📋", "집무실"],
  ["war", "⚔️", "합동워룸"],
  ["prog", "🏗️", "전력증강"],
  ["staff", "👥", "사령부인사"],
  ["pol", "🏛️", "국회·정치"],
  ["career", "🎖️", "커리어트랙"],
];

export function minHTML() {
  const m = minState(); if (!m) return "";
  if (m.retired) return retiredHTML(m);
  ensureCmdrs(m);
  const F = minFx(), dk = m.docket.map(DK).filter(Boolean), pend = dk.length;
  const A = m.war.areas, used = Object.values(A).map((w) => w.reinf).filter(Boolean);
  const hotN = Object.values(A).filter((w) => w.lvl === 2 && !w.res).length;
  const [mTxt, mCls] = moraleWord(m.morale || 72);
  const avg = m.sup.length ? Math.round(m.sup.reduce((a, b) => a + b, 0) / m.sup.length) : m.support;
  const l5 = Object.values(m.prog).filter((v) => v >= 5).length;
  const rate = m.fights ? Math.round((m.wins / m.fights) * 100) : 0;

  // Left navigation rail (6 tabs)
  const nav = `<nav class="dm-nav">${TABS.map(([k, ic, n]) => {
    const badge = k === "desk" && pend ? `<em>${pend}</em>` : k === "war" && hotN ? `<em class="r">${hotN}</em>` : "";
    return `<button class="dm-tab${tab === k ? " on" : ""}" data-min="tab:${k}"><span>${ic} ${n}</span>${badge}</button>`;
  }).join("")}<div class="dm-goals"><b>임기 목표 (${TERM}주)</b><small class="${avg >= 60 ? "g" : ""}">평균 지지율 ${avg}/60</small><small class="${l5 >= 2 ? "g" : ""}">LV5 사업 ${l5}/2</small><small class="${rate >= 80 ? "g" : ""}">위기 방어 ${rate}%/80%</small></div></nav>`;

  // Center main panel based on selected tab
  let center = "";
  if (tab === "desk") {
    const nscC = m.nsc && m.war.areas[m.nsc] ? `<div class="mn-card mn-dk mn-nsc"><b>긴급 NSC — ${AREAS[m.nsc].n} 위협 '높음'</b><p>적 도발 징후가 급증했습니다. 이번 주 대응 방침을 정하십시오.</p>${scenesOn() ? `<button class="mn-sc" data-min="nscview"><b>🎬 회의 장면으로 ›</b><small>장면을 건너뛰었다면 여기서 다시 열 수 있습니다</small></button>` : ""}${NSC_OPT.map(([n, e], i) => `<button data-min="nsc:${i}"><b>${n}</b><small>${e}</small></button>`).join("")}</div>` : "";
    center = `<div class="dm-main"><div class="mn-h">국방부 결재판 <small>${pend ? `${pend}건 대기` : "처리 완료"}</small><button class="mn-tg ${scenesOn() ? "on" : ""}" data-min="scenes">🎬 결재 연출 ${scenesOn() ? "ON" : "OFF"}</button></div>${nscC}${dk.length ? dk.map(([id, t, d, opts, meta]) => docHTML(m, id, t, d, opts, meta || {})).join("") : `<div class="mn-card"><small>이번 주 결재 안건을 모두 처리했습니다. 합동워룸에서 위기를 점검하거나 '다음 주 진행'을 누르십시오.</small></div>`}
      <div class="mn-h">전군 작전 교리 <small>언제든 변경 가능</small></div><div class="dm-docs">${Object.entries(DOCTRINES).map(([k, d]) => `<button class="mn-doc ${m.doctrine === k ? "on" : ""}" data-min="doc:${k}"><b>${d.n}</b><small>${d.d}</small><span>${d.up.map((x) => `<em class="g">${x}</em>`).join("")}${d.dn.map((x) => `<em class="r">${x}</em>`).join("")}</span></button>`).join("")}</div></div>`;
  } else if (tab === "war") {
    const domTag = { army: "⛨ 육군", navy: "⚓ 해군", air: "✈️ 공군" };
    const direct3dLbl = { army: "3D 합동 화력개입", navy: "3D 해전 직접개입", air: "3D 전투기 직접출격" };
    center = `<div class="dm-main"><div class="mn-h">합동 워룸 · 한반도 3군 전술 상황도 <small>${m.week}주차 — 각 구역별 [자동 위임 / FM 작전 / 3D 직접 개입] 선택</small></div>
      <div class="dm-wargrid">${warMap(m)}<div class="mn-map">${Object.entries(AREAS).map(([k, a]) => {
        const W = A[k], p = areaP(m, k), c = m.cmdr[a.fleet] || mkCmdr(), o = W.res;
        return `<div class="mn-area ${k} t${W.lvl}"><div class="ah"><b>${domTag[a.domain] || ""} · ${a.n}</b><span class="lv l${W.lvl}">위협 ${LVN[W.lvl]}</span></div>
          <small>담당 <b>${FLEETS[a.fleet]}</b> · ${c.name} 사령관 (지휘 ${c.st}${fxv(m, "cmd", 0) ? ` ${fxv(m, "cmd", 0) > 0 ? "+" : ""}${fxv(m, "cmd", 0)}` : ""})</small>
          <div class="rf">증원 ${Object.entries(REINF).map(([r, [n]]) => `<button data-min="rf:${k}:${r}" class="${W.reinf === r ? "on" : ""}" ${used.includes(r) && W.reinf !== r ? "disabled" : ""}>${n.replace("사령부", "")}</button>`).join("")}</div>
          <div class="pw">위임 예상 ${bar(p, p >= 74 ? "g" : p >= 50 ? "y" : "r")}<b class="${p >= 74 ? "g" : p >= 50 ? "y" : "r"}">${p}% · ${outcomeOf(p)[0]}</b></div>
          ${o ? `<div class="dr ${o[1]}">${o[4] || "대응"} 결과: <b>${o[0]}</b></div>`
            : W.lvl === 0 ? `<div class="dr g">정상 경계 — 특이 도발 없음 (자동 안정)</div>`
            : `<div class="dm-ops"><button class="dm-op" data-min="del:${k}">① 자동 위임</button><button class="dm-op fm" data-min="fm:${k}">② FM 작전</button><button class="dm-op d3" data-min="3d:${k}">③ ${direct3dLbl[a.domain] || "3D 개입"}</button></div>`}</div>`;
      }).join("")}</div></div></div>`;
  } else if (tab === "prog") {
    center = `<div class="dm-main"><div class="mn-h">3군 방위력 개선 사업 <small>각 5단계 · 현재 전투 보정 화력 ×${F.outK.toFixed(2)} · 피해 ×${F.inK.toFixed(2)} · 요격 ×${F.icptK.toFixed(2)} · 탐지 ×${F.detK.toFixed(2)}</small></div>
      <div class="dm-pgrid">${Object.entries(PROGS).map(([k, P]) => {
        const L = m.prog[k] || 0, nx = L < 5 ? progCost(m, k, L) : 0;
        return `<div class="mn-card mn-pg"><div class="ph"><b>${P.ic} ${P.n}</b><span>LV ${L}/5</span></div><div class="lvs">${P.lv.map(([, d], i) => `<div class="${i < L ? "done" : i === L ? "next" : ""}"><i>${i + 1}</i>${d}</div>`).join("")}</div>${L < 5 ? `<button data-min="pg:${k}" ${m.budget < nx ? "disabled" : ""}>LV ${L + 1} 투자 — ${won(nx)}</button>` : `<em class="g">완성</em>`}</div>`;
      }).join("")}</div></div>`;
  } else if (tab === "staff") {
    const posts = [["army1", "⛨ 지상작전사령관"], ["f2", "⚓ 제2함대사령관 (서해)"], ["f1", "⚓ 제1함대사령관 (동해)"], ["air1", "✈️ 공군작전사령관"], ["mob", "⚓ 기동함대사령관 (증원)"], ["sub", "⚓ 잠수함사령관 (증원)"], ["airc", "✈️ 전투비행단장 (증원)"], ["art", "⛨ 화력여단장 (증원)"]];
    center = `<div class="dm-main"><div class="mn-h">3군 통합 사령부 인사 <small>지휘관 능력치가 합동 워룸 위임 승률에 직접 반영됩니다 · 교체 비용 1,200억</small></div>
      <div class="dm-sgrid">${posts.map(([k, title]) => {
        const c = m.cmdr[k] || mkCmdr();
        return `<div class="mn-card dm-scard"><div class="dm-sf">${face(c.name + k, 52, { age: 3 })}<div><b>${title}</b><small>${c.name} 중장</small></div></div><div class="pw">지휘력 ${bar(c.st, c.st >= 75 ? "g" : c.st >= 58 ? "y" : "r")}<b>${c.st}</b></div><button class="pr-btn" data-min="swap:${k}" ${m.budget < 1200 ? "disabled" : ""}>인사 교체 (1,200억)</button></div>`;
      }).join("")}</div></div>`;
  } else if (tab === "pol") {
    center = `<div class="dm-main"><div class="mn-h">국회 국방위 · 정계 동향 <button class="mn-tg on" data-min="gal">🖼 역대 장관 갤러리</button></div>
      ${trendSVG(m)}
      <div class="mn-card mn-log"><div class="mn-h">지난 주 종합 결산</div>${(m.last || ["취임 첫 주입니다. 집무실 결재와 합동워룸 대응을 마친 뒤 '다음 주 진행'을 누르십시오."]).map((t) => `<small>${t}</small>`).join("")}</div>
      <div class="mn-card"><div class="mn-h">임기 평가 기준</div><small>36주 종료 시 평균 지지율 60 이상 · LV5 사업 2개 이상 · 위기 방어율 80% 이상 달성 시 <b>명예 퇴임</b> 및 대선 출마 시 강력한 안보 실적 보너스를 얻습니다.</small></div></div>`;
  } else {
    center = `<div class="dm-main">${globalThis.__careerTrackHTML ? globalThis.__careerTrackHTML() : `<div class="mn-card"><small>커리어 정보를 불러오는 중입니다.</small></div>`}</div>`;
  }

  // Right sidebar: Officer profile + Live press headlines
  const right = `<aside class="dm-side">${globalThis.__careerProfileHTML ? globalThis.__careerProfileHTML() : ""}
    <div class="mn-card dm-news"><div class="mn-h">📰 최근 언론 헤드라인</div>${(m.headlines || []).slice(0, 8).map((h) => `<small>• ${h}</small>`).join("")}</div></aside>`;

  return `<div class="mn dm-shell">
    <div class="mn-top dm-top">
      <div class="mt"><span>주차</span><b>${m.week} / ${TERM}주</b>${bar((m.week / TERM) * 100)}</div>
      <div class="mt"><span>예산</span><b>${won(m.budget)}</b><small>+${won(income(m))} / −${won(upkeep(m))}</small></div>
      <div class="mt"><span>지지율</span><b class="${m.support >= 60 ? "g" : m.support >= 40 ? "y" : "r"}">${m.support}%</b>${bar(m.support, m.support >= 60 ? "g" : m.support >= 40 ? "y" : "r")}</div>
      <div class="mt"><span>긴장도</span><b class="${m.tension >= 65 ? "r" : m.tension >= 45 ? "y" : "g"}">${m.tension}</b>${bar(m.tension, m.tension >= 65 ? "r" : m.tension >= 45 ? "y" : "g")}</div>
      <div class="mt"><span>전군 사기</span><b class="${mCls}">${mTxt} (${m.morale})</b>${bar(m.morale, mCls)}</div>
      <button class="mn-next" data-min="next" ${pend ? "disabled" : ""}>${pend ? `결재 ${pend}건 남음` : "다음 주 진행 ▶"}</button>
    </div>
    <div class="dm-grid">${nav}${center}${right}</div>
  </div>`;
}

const ZONE = { dmz: [127.3, 38.2, "접경 DMZ"], west: [125.0, 37.6, "서해 NLL"], east: [129.7, 38.2, "동해 북방"], kadiz: [126.7, 34.4, "방공식별구역"] };
const RIC = { mob: "⚓", sub: "◆", airc: "✈", art: "✹" };

/** 합동 워룸 한반도 상황도 (육·해·공 4개 구역) */
function warMap(m) {
  const A = m.war.areas, P = (lo, la) => kxy(lo, la).map((v) => v.toFixed(1)).join(","), C = ["#5fd17a", "#f2ca5c", "#ff6b5e"];
  const mdl = [[126.1, 37.75], [126.7, 37.95], [127.1, 38.25], [127.8, 38.3], [128.3, 38.6]].map(([a, b]) => P(a, b)).join(" "), nll = [[124.6, 37.95], [124.9, 37.68], [125.7, 37.6], [126.1, 37.72]].map(([a, b]) => P(a, b)).join(" ");
  const city = ([lo, la, n, cap, left]) => { const [x, y] = kxy(lo, la); return `<circle cx="${x}" cy="${y}" r="${cap ? 3.2 : 2.2}" fill="${cap ? "#fff" : "#cfe"}"/><text x="${left ? x - 5 : x + 5}" y="${y + 4}" class="ct"${left ? ' text-anchor="end"' : ""}>${n}</text>`; };
  const zones = Object.entries(ZONE).map(([k, [lo, la, n]]) => {
    const W = A[k]; if (!W) return "";
    const [x, y] = kxy(lo, la), c = C[W.lvl], r = 16 + W.lvl * 5, o = W.res;
    return `<g class="zn l${W.lvl}"><circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity=".16"/><circle class="pu" cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="2" style="--d:${2.4 - W.lvl * 0.7}s"/><circle cx="${x}" cy="${y}" r="4" fill="${c}"/>
      <text x="${x}" y="${y - r - 5}" class="zl" text-anchor="middle">${n} · ${LVK[W.lvl]}</text>${W.reinf ? `<text x="${x + r - 2}" y="${y + r}" class="ri">${RIC[W.reinf] || "★"}</text>` : ""}
      ${o ? `<g transform="translate(${x - 24} ${y - 9}) rotate(-10 24 9)"><rect width="48" height="17" rx="2" fill="none" stroke="${o[1] === "g" ? "#5fd17a" : o[1] === "r" ? "#ff6b5e" : "#f2ca5c"}" stroke-width="2"/><text x="24" y="12" text-anchor="middle" class="st" fill="${o[1] === "g" ? "#5fd17a" : o[1] === "r" ? "#ff6b5e" : "#f2ca5c"}">${o[0]}</text></g>` : ""}</g>`;
  }).join("");
  return `<div class="mn-kmap"><svg viewBox="0 0 410 405" role="img" aria-label="한반도 3군 합동 상황도"><rect width="410" height="405" fill="#0b1a26"/>
    <g class="grid">${[34, 35, 36, 37, 38, 39].map((la) => { const y = kxy(124, la)[1]; return `<line x1="0" x2="410" y1="${y}" y2="${y}"/><text x="3" y="${y - 2}">${la}°N</text>`; }).join("")}${[124, 126, 128, 130].map((lo) => { const x = kxy(lo, 36)[0]; return `<line y1="0" y2="405" x1="${x}" x2="${x}"/><text x="${x + 2}" y="400">${lo}°E</text>`; }).join("")}</g>
    <path d="${KOREA.cn}" fill="#2a2e33"/><path d="${KOREA.jp}" fill="#2a2e33"/><path d="${KOREA.nk}" fill="#3a2a2c" stroke="#5a3a3c" stroke-width=".6"/><path d="${KOREA.kr}" fill="#24384a" stroke="#4d7590" stroke-width=".7"/>
    <polyline points="${mdl}" fill="none" stroke="#ff6b5e" stroke-width="1.4" stroke-dasharray="4 3"/><polyline points="${nll}" fill="none" stroke="#ffcf8a" stroke-width="1.2" stroke-dasharray="2 3"/>
    <text x="${kxy(124.5, 37.48)[0]}" y="${kxy(124.5, 37.48)[1]}" class="ln">NLL</text><text x="${kxy(127.2, 38.55)[0]}" y="${kxy(127.2, 38.55)[1]}" class="ln r">MDL</text>
    ${[[126.98, 37.56, "서울", 1], [125.75, 39.03, "평양", 1], [129.07, 35.18, "부산"], [126.63, 37.46, "인천"], [128.6, 35.87, "대구"], [124.7, 37.97, "백령도"], [130.9, 37.5, "울릉도"], [131.87, 37.24, "독도", 0, 1], [126.5, 33.38, "제주"]].map(city).join("")}
    ${zones}<text x="406" y="14" text-anchor="end" class="lg">● 낮음 <tspan fill="#f2ca5c">● 보통</tspan> <tspan fill="#ff6b5e">● 높음</tspan></text></svg></div>`;
}

function trendSVG(m) {
  const S = m.sup || [], B = m.bud || []; if (S.length < 2) return `<div class="mn-card mn-trend"><div class="mn-h">국정 지지율 · 예산 추이</div><small>2주 이상 지나면 그래프가 그려집니다.</small></div>`;
  const W = 300, H = 92, n = S.length, X = (i) => 26 + (i / (n - 1)) * (W - 34), bmax = Math.max(...B, 1), Ys = (v) => 8 + (1 - v / 100) * (H - 18), Yb = (v) => 8 + (1 - v / bmax) * (H - 18);
  const line = (a, Y) => a.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
  return `<div class="mn-card mn-trend"><div class="mn-h">국정 지지율 · 예산 추이 <small>1~${n}주차</small></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="지지율과 예산 추이">
    ${[0, 60, 100].map((v) => `<line x1="26" x2="${W - 8}" y1="${Ys(v)}" y2="${Ys(v)}" class="${v === 60 ? "gl" : "gx"}"/><text x="22" y="${Ys(v) + 3}" text-anchor="end">${v}</text>`).join("")}
    ${B.length > 1 ? `<path d="${line(B, Yb)}" class="bd"/>` : ""}<path d="${line(S, Ys)}" class="sp"/><circle cx="${X(n - 1)}" cy="${Ys(S[n - 1])}" r="3" class="spd"/></svg>
    <div class="lgd"><span class="s">━ 지지율 (현재 ${S[n - 1]}, 목표선 60)</span><span class="b">━ 예산 (현재 ${won(B[B.length - 1] ?? m.budget)})</span></div></div>`;
}

export function minAdminEnd(good = true) {
  const m = minState(); if (!m || m.retired) return false;
  m.week = TERM; m.docket = []; m.sup = Array(TERM - 1).fill(good ? 70 : 45); m.support = good ? 70 : 45;
  m.prog = good ? { ship: 5, air: 5, kamd: 3, log: 2 } : { ship: 1, air: 1, kamd: 0, log: 0 };
  m.wins = good ? 120 : 50; m.fights = 140; m.nsc = null; save(m); return true;
}

export function galleryHTML() {
  const m = minState(), H = hall(), F = (h, s) => (globalThis.__faceOf ? globalThis.__faceOf(h.face, s, h.name) : "");
  const cur = m && !m.retired ? [{ name: m.name, cur: true, face: globalThis.__myFace?.() || null, week: m.week }] : [];
  const all = [...cur, ...H], N = H.length;
  return `<div class="gal"><div class="gal-h"><b>역대 국방부장관</b><small>이 브라우저에서 임기를 마친 장관 ${N}명${cur.length ? " + 현직" : ""} · 게임 속 기록입니다</small><button data-min="galx">닫기 ✕</button></div>
    <div class="gal-g">${all.map((h, i) => { const no = h.cur ? N + 1 : N - (i - cur.length); return `<div class="gal-c ${h.cur ? "cur" : h.ok ? "ok" : ""}"><div class="gal-f">${F(h, 132)}</div><em>제${no}대${h.cur ? " · 현직" : ""}</em><b>${h.name}</b>
      <small>${h.cur ? `재임 ${h.week}주차` : `${h.gen}회차 · ${h.at} 퇴임`}</small>${h.cur ? "" : `<small>${h.ok ? "★ 명예 퇴임" : "임기 종료"} · 지지율 ${h.avg} · 방어율 ${h.rate}%</small><small>교리 ${h.doctrine}</small>`}</div>`; }).join("") || "<small>아직 기록이 없습니다.</small>"}</div></div>`;
}

export function retireCuts(m) {
  const T = m.term || {}, ok = T.ok, best = Object.entries(PROGS).filter(([k]) => (m.prog[k] || 0) >= 5).map(([, P]) => P.n);
  const stat = `<h4>${ok ? "명예 퇴임" : "임기 종료"}</h4><div><span>평균 국정 지지율</span><b class="${T.avg >= 60 ? "g" : "r"}">${T.avg}</b></div><div><span>LV5 방위력 개선 사업</span><b class="${T.l5 >= 2 ? "g" : "r"}">${T.l5}개</b></div><div><span>다영역 위기 방어율</span><b class="${T.rate >= 80 ? "g" : "r"}">${T.rate}%</b></div><div><span>남긴 국방 예산</span><b>${won(m.budget)}</b></div>`;
  return [
    { img: "office", f: [0.55, 0.62, 1.1], to: [0.5, 0.5, 1.02], who: "", text: `${TERM}주의 임기가 끝났습니다. 결재판에는 더 이상 올라올 서류가 없습니다.` },
    { img: "war_room", f: [0.5, 0.42, 1.12], who: "합참의장", text: `장관님, 마지막 상황 보고입니다. 임기 중 3군 통합 위기 방어율은 ${T.rate}%였습니다.` },
    { img: "press_minister", f: [0.53, 0.36, 1.7], flash: 4, who: `장관 ${m.name}`, text: ok ? "국민 여러분이 보내 주신 신뢰 덕분에 맡은 임무를 마칠 수 있었습니다. 육·해·공 장병들에게 감사드립니다." : "부족한 점이 많았습니다. 남은 과제는 후임 장관이 잘 이어 갈 것이라 믿습니다." },
    { img: "ceremony", f: [0.36, 0.68, 1.6], to: [0.5, 0.55, 1.05], who: "사회자", text: `지금부터 ${m.name} 국방부장관 이임식을 거행하겠습니다.${best.length ? ` 재임 중 ${best.join("·")} 사업을 완성했습니다.` : ""}`, card: stat },
    { img: "ceremony", f: [0.62, 0.62, 1.15], to: [0.5, 0.45, 1.02], flash: 2, who: "", text: ok ? "예포가 울리고, 도열한 장병들이 마지막 경례를 올립니다. 당신의 이름이 명예의 전당에 올랐습니다." : "도열한 장병들이 마지막 경례를 올립니다. 당신의 이름이 역대 장관 기록에 남았습니다." },
    { img: "office", f: [0.3, 0.45, 1.2], to: [0.5, 0.5, 1.02], who: "", text: "제복도, 직함도 내려놓았습니다. 이제 당신은 민간인입니다.", cls: "a" },
  ];
}

function retiredHTML(m) {
  const T = m.term, H = hall();
  return `<div class="mn"><div class="mn-ret"><div class="mn-card big"><h3>${T.ok ? "명예 퇴임" : "임기 종료"}</h3><p>${m.name} 장관 · ${TERM}주 임기</p>
    <div class="kv"><span>평균 국정 지지율</span><b class="${T.avg >= 60 ? "g" : "r"}">${T.avg} / 60</b></div><div class="kv"><span>LV5 방위력 개선 사업</span><b class="${T.l5 >= 2 ? "g" : "r"}">${T.l5} / 2</b></div><div class="kv"><span>다영역 위기 방어율</span><b class="${T.rate >= 80 ? "g" : "r"}">${T.rate}% / 80%</b></div>
    <p>${T.ok ? "임기 목표를 모두 달성했습니다. 2회차를 시작하면 특전이 주어집니다: 명예 약장(화력 +10%·초반 봉급 +50%), 완성 사업 1개 LV3 계승, 원수 승진 30% 단축." : "임기 목표를 다 이루지 못했습니다. 2회차를 시작할 수 있지만 특전은 없습니다."}</p>
    ${T.ok ? `<div class="mn-h">계승할 사업 (LV3로 시작)</div><div class="rf">${Object.entries(PROGS).filter(([k]) => (m.prog[k] || 0) >= 5).map(([k, P]) => `<button data-min="inh:${k}" class="${m.inh === k ? "on" : ""}">${P.n}</button>`).join("")}</div>` : ""}
    ${isUS() ? `<div class="mn-card" style="font-size:12px;color:#9ec2d4">🇺🇸 미국 대통령 선거(538 선거인단) 챕터는 추후 별도 업데이트 예정입니다.</div>` : `<button class="mn-pres" data-pres="start"><b>다음 장 · 대통령 출마 ›</b><small>민간인이 된 당신에게 정당들이 접촉해 오기 시작했습니다.</small></button>`}<button data-min="replay" class="mn-rp">🎬 이임식 다시 보기</button>
    <button class="mn-ng ${ngArm ? "arm" : ""}" data-min="ng">${ngArm ? "한 번 더 누르면 커리어·함정·기록이 초기화되고 소위로 다시 시작합니다" : "2회차 시작 (소위부터)"}</button><small>명예의 전당·설정·지휘관 이름은 그대로 남습니다. 이 버튼을 누르지 않으면 지금 커리어로 계속 플레이할 수 있습니다.</small></div>
    <div class="mn-card"><div class="mn-h">역대 국방부장관 명예의 전당 <button class="mn-tg on" data-min="gal">🖼 초상 갤러리</button></div>${H.map((h) => `<div class="hl ${h.ok ? "ok" : ""}"><b>${h.ok ? "★ " : ""}${h.name}</b><span>${h.gen}회차 · ${h.at}</span><small>지지율 ${h.avg} · LV5 ${h.l5}개 · 방어율 ${h.rate}% · 교리 ${h.doctrine}</small></div>`).join("") || "<small>기록 없음</small>"}</div></div></div>`;
}

/** 클릭 처리: 결과 { redraw, direct, directAir, direct3d, reset } */
export function minClick(a) {
  const m = minState(); if (!m) return {};
  if (a.startsWith("tab:")) { tab = a.slice(4); return { redraw: true }; }
  if (a === "ng") { if (!ngArm) { ngArm = true; return { redraw: true }; } ngArm = false; const T = m.term, L = legacy();
    wr(LK, { gen: (L?.gen || 1) + 1, medal: !!T?.ok, prog: T?.ok ? m.inh || Object.keys(m.prog).find((k) => m.prog[k] >= 5) || null : null, minister: !!T?.ok }); return { reset: true }; }
  if (a.startsWith("inh:")) { m.inh = a.slice(4); save(m); return { redraw: true }; }
  if (a === "gal") return { gallery: true };
  if (a === "replay" && m.retired) return { retire: retireCuts(m) };
  if (m.retired) return {};
  if (a.startsWith("doc:")) { const k = a.slice(4); m.doctrine = m.doctrine === k ? null : k; save(m); return { redraw: true, toast: m.doctrine ? `작전 교리 선포 — ${DOCTRINES[k].n}` : "작전 교리 해제" }; }
  if (a.startsWith("scene:")) { const id = a.slice(6), d = DK(id); if (!d || !m.docket.includes(id)) return {}; const meta = d[4] || {}, press = meta.sc === "press";
    const Q = { who: press ? `${["한빛", "동해", "서울", "새벽", "중앙"][m.week % 5]}일보 기자` : `국방위원 (${["여당", "야당"][m.week % 2]})`, q: d[2], opts: d[3].map(([n, e]) => [n, e, `${n} — 이것이 국방부의 입장입니다.`]) };
    return { scene: { kind: press ? "press" : "assembly", title: d[1], id, questions: [Q] } }; }
  if (a.startsWith("dk:")) { const [, id, i] = a.split(":"), d = DK(id), o = d?.[3][+i]; if (!o || !m.docket.includes(id)) return {}; o[2](m); (m.picks ??= {})[id] = +i; m.support = clamp(m.support, 0, 100); m.docket = m.docket.filter((x) => x !== id); note(m, `결재 「${d[1]}」 — ${o[0]}`); save(m); return { redraw: true, toast: `결재 — ${o[0]}` }; }
  if (a.startsWith("pg:")) { const k = a.slice(3), L = m.prog[k] || 0; if (L >= 5) return {}; const c = progCost(m, k, L); if (m.budget < c) return { toast: "예산이 부족합니다" }; m.budget -= c; m.prog[k] = L + 1; note(m, `${PROGS[k].n} LV${L + 1} 완료 (−${won(c)})`); save(m); return { redraw: true, toast: `${PROGS[k].n} LV${L + 1} — ${PROGS[k].lv[L][1]}` }; }
  if (a.startsWith("rf:")) { const [, k, r] = a.split(":"), W = m.war.areas[k]; if (!W) return {}; W.reinf = W.reinf === r ? null : r; save(m); return { redraw: true }; }
  if (a.startsWith("swap:")) { const k = a.slice(5); if (m.budget < 1200) return { toast: "예산이 부족합니다 (1,200억 필요)" }; m.budget -= 1200; m.cmdr[k] = { name: `${pick(SUR)}${pick(GIV)}`, st: 66 + ((Math.random() * 28) | 0) }; note(m, `사령부 인사 교체 — ${m.cmdr[k].name} 중장 임명 (지휘 ${m.cmdr[k].st})`); save(m); return { redraw: true, toast: `${m.cmdr[k].name} 중장 임명 (지휘 ${m.cmdr[k].st})` }; }
  if (a.startsWith("del:")) { const k = a.slice(4), W = m.war.areas[k]; if (!W || W.res) return {}; const p = clamp(areaP(m, k) + ((Math.random() * 21) | 0) - 10, 0, 100); const o = outcomeOf(p); W.res = [...o, "자동 위임", p]; note(m, `${AREAS[k].n} 자동 위임 → ${o[0]} (승률 ${p}%)`); save(m); return { redraw: true, toast: `${AREAS[k].n} 위임 결과: ${o[0]}` }; }
  if (a.startsWith("fm:")) { const k = a.slice(3), W = m.war.areas[k]; if (!W || W.res) return {}; m.war.direct = k; save(m); return { direct: true, directAir: AREAS[k].domain === "air" }; }
  if (a.startsWith("3d:")) { const k = a.slice(3), W = m.war.areas[k]; if (!W || W.res) return {}; m.war.direct = k; save(m); return { direct3d: { area: k, domain: AREAS[k].domain } }; }
  if (a === "direct") { if (m.war.areas.west?.res) return {}; m.war.direct = "west"; save(m); return { direct: true }; }
  if (a === "next") {
    if (m.docket.length) return { toast: "결재 안건을 먼저 처리하십시오" };
    endWeek(m); m.support = clamp(m.support, 0, 100);
    const hot = !m.retired && (m.week - (m.lastNsc || -9) >= 3) ? Object.keys(AREAS).find((k) => m.war.areas[k].lvl === 2) : null;
    m.nsc = hot || null; if (hot) m.lastNsc = m.week; save(m);
    return { redraw: true, retire: m.retired ? retireCuts(m) : null, toast: m.retired ? "" : `${m.week}주차 — 새 위기와 결재 안건`, nsc: hot && scenesOn() ? { kind: "nsc", title: `${AREAS[hot].n} 위협 '높음'`, id: hot, questions: [{ who: "국가안보실장", q: `${AREAS[hot].n}에서 적 도발 징후가 급증했습니다. 이번 주 위기 대응 방침을 정해 주십시오.`, opts: NSC_OPT.map(([n, e, l]) => [n, e, l]) }] } : null };
  }
  if (a === "scenes") { const on = !scenesOn(); try { localStorage.setItem(SCK, on ? "on" : "off"); } catch { /* 저장 불가 */ } return { redraw: true, toast: on ? "결재 연출 켜짐 — 기자회견·국회·NSC 장면이 나옵니다" : "결재 연출 꺼짐 — 결재판에서 바로 고릅니다" }; }
  if (a === "nscview") { const k = m.nsc; if (!k) return {}; return { nsc: { kind: "nsc", title: `${AREAS[k].n} 위협 '높음'`, id: k, questions: [{ who: "국가안보실장", q: `${AREAS[k].n}에서 적 도발 징후가 급증했습니다. 이번 주 위기 대응 방침을 정해 주십시오.`, opts: NSC_OPT.map(([n, e, l]) => [n, e, l]) }] } }; }
  if (a.startsWith("nsc:")) { const k = m.nsc, W = k && m.war.areas[k], i = +a.slice(4); if (!W) return {}; NSC_OPT[i]?.[3](m, W); m.nsc = null; m.support = clamp(m.support, 0, 100); note(m, `NSC — ${AREAS[k].n}: ${NSC_OPT[i][0]}`); save(m); return { redraw: true }; }
  return {};
}

export const NG_RESET = ["steeltide:potus", "steeltide:pres", "steeltide:profile", "steeltide:career", "steeltide:staff", "steeltide:duty", "steeltide:kcamp", "steeltide:camp", "steeltide:oplog", "steeltide:c72", "steeltide:post", "steeltide:mission", MK];
