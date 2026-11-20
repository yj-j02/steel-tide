// 국방부장관 · 국방 경영 (집무실): 예산·지지율, 전군 작전 교리, 방위력 개선 사업, 국방부 결재판, 합동 워룸, 임기·명예의 전당.
// 모든 수치는 게임용 값이다 (실제 국방 예산·제원이 아님).
const MK = "steeltide:mod", HK = "steeltide:hall", LK = "steeltide:legacy";
const TERM = 50, BASE = 3500, UPKEEP = 2000;
const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const won = (n) => `${Math.round(n).toLocaleString("ko-KR")}억`;
const pick = (a) => a[(Math.random() * a.length) | 0];

export const DOCTRINES = {
  off: { n: "공세적 억제", d: "먼저, 더 세게 친다", up: ["아군 화력 +15%", "재장전 −8% (초탄 빠르게)"], dn: ["받는 피해 +10%", "작전·해역 패배 시 지지율 감소 ×1.3"] },
  aad: { n: "전방위 방공·생존", d: "잃지 않는 군대", up: ["아군 요격 +12%", "함정 수리 기간 −1작전"], dn: ["재장전 +8%", "방위력 개선 사업 비용 +10%"] },
  joint: { n: "기동·합동 전력 극대화", d: "빠르게 모으고 빠르게 친다", up: ["지휘 지시 재사용 −20%", "작전 예비 투입 +1회"], dn: ["조종사 피로 +25%", "주간 유지비 +15%"] },
  tech: { n: "기술 중심 첨단화", d: "먼저 보고 먼저 안다", up: ["탐지 거리 +25%", "항공·KAMD·군수 사업 비용 −20%"], dn: ["수상함 사업 비용 +15%"] },
};
export const PROGS = {
  ship: { n: "수상함 전력 증강", ic: "⚓", lv: [[3000, "이지스함 배정 제한 해제 · 워룸 함대 전력 +6"], [5000, "작전 실패 시 신뢰도 감소 −15%"], [8000, "예비 투입 'FFX 호위함 증원' 해금"], [12000, "아군 대함미사일 사거리 +10%"], [20000, "예비 투입 '합동화력함 화력 지원' 해금"]] },
  air: { n: "차세대 항공·무장 개량", ic: "✈", lv: [[2500, "KF-21·F-15K 체공 시간 +15%"], [4500, "공대함 피해 +10%"], [7000, "항공 작전에 SEAD 전용 편대 추가"], [10000, "재무장 −30% · 조종사 피로 −30%"], [18000, "무인 전투기 편대 — 적 요격기 편대마다 1기 자동 격추"]] },
  kamd: { n: "KAMD 고도화 (L-SAM·SM-3)", ic: "⛨", lv: [[3000, "조기경보 — 아군 탐지 +10%"], [6000, "아군 요격 +8%"], [9000, "동시 교전 +2 — 포화 공격 대응 향상"], [13000, "요격 실패 시 2차 자동 요격 (30%)"], [22000, "전역 요격 쉴드 — 해안 지대함 위협 반감 · 워룸 위협 −10%"]] },
  log: { n: "군수·정비 인프라 자동화", ic: "⚙", lv: [[2000, "함정 수리 기간 −1작전"], [4000, "주간 유지비 −20%"], [6000, "작전 후 30% 확률 자동 정비"], [9000, "긴급 수리 신뢰도 비용 10 → 5"], [15000, "작전마다 1회 — 침몰 직전 함정 현장 즉시 수리"]] },
};
const AREAS = { west: { n: "서해 NLL", fleet: "f2", base: 80, w: [1, 3, 4] }, east: { n: "동해 북방", fleet: "f1", base: 70, w: [2, 4, 2] }, south: { n: "남해 교역로", fleet: "f3", base: 60, w: [4, 3, 1] } };
const FLEETS = { f1: "제1함대", f2: "제2함대", f3: "제3함대" }, REINF = { mob: ["기동함대", 35], sub: ["잠수함사령부", 28], airc: ["항공사령부", 30] };
const LVN = ["LOW", "MID", "HIGH"], LVK = ["낮음", "보통", "높음"], THREAT = [100, 140, 180];
const SUR = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오"], GIV = ["태준", "성호", "민재", "정훈", "현우", "동석", "재영", "상민", "영철", "준혁", "기현", "도윤"];

/** 결재 안건 12종: [id, 제목, 설명, [[선택, 설명, 효과 함수]]] */
const DOCKET = [
  ["export", "해외 방산 수출 승인", "K-2 전차와 천궁-II의 해외 수출 요청이 들어왔습니다. 전력 일시 공백과 경제적 이득 사이에서 결정하십시오.", [
    ["승인", "예산 +4,000억 · 2주간 아군 미사일 탑재 −10%", (m) => { m.budget += 4000; fx(m, "asmK", 0.9, 2); }],
    ["거부", "지지율 +5 · 산업계 반발로 예산 −500억", (m) => { m.support += 5; m.budget -= 500; }],
    ["조건부 수용", "예산 +2,000억 · 기술 유출 위험 5%", (m) => { m.budget += 2000; if (Math.random() < 0.05) { m.support -= 8; note(m, "기술 유출 의혹 보도 — 지지율 −8"); } }]]],
  ["roe", "NLL 교전수칙(ROE) 개정", "서해 접적 해역 교전수칙을 선제 타격 허용으로 바꾸자는 합참 건의입니다.", [
    ["선제 타격 허용", "4주간 아군 화력 +10% · 매주 10% 오발 사고(지지율 −20)", (m) => { fx(m, "outK", 1.1, 4); fx(m, "misfire", 1, 4); }],
    ["기존 수칙 유지", "지지율 +5 · 4주간 받는 피해 +5%", (m) => { m.support += 5; fx(m, "inK", 1.05, 4); }]]],
  ["audit", "국회 국방위 방위비 감사", "국방위원회가 방위비 집행 전반을 감사하겠다고 통보했습니다.", [
    ["강경 대립 (군 사기 고수)", "4주간 부대 사기 +1단계 · 예산 −1,000억 · 지지율 −10", (m) => { fx(m, "moraleAdd", 4, 4); m.budget -= 1000; m.support -= 10; }],
    ["타협 · 삭감 수용", "예산 −2,000억 · 지지율 +10", (m) => { m.budget -= 2000; m.support += 10; }]]],
  ["welfare", "장병 복지·정비창 예산 증액", "정비창 노후 설비 교체와 장병 생활관 개선 예산입니다.", [
    ["대규모 집행", "예산 −1,500억 · 4주간 수리 기간 −1작전 · 지지율 +8", (m) => { m.budget -= 1500; fx(m, "repairCut", 1, 4); m.support += 8; }],
    ["보류", "예산 보존 · 4주간 함대 사령관 지휘 −5", (m) => { fx(m, "cmd", -5, 4); }]]],
  ["rimpac", "연합 훈련(RIMPAC) 참가 규모", "환태평양 연합 훈련 참가 규모를 정해야 합니다.", [
    ["최대 규모 참가", "예산 −1,000억 · 4주간 지휘 지시 재사용 −30%", (m) => { m.budget -= 1000; fx(m, "cdK", 0.7, 4); }],
    ["축소 참가", "예산 보존 · 연합 효과 없음", () => {}]]],
  ["kss", "차기 잠수함 예산 증액", "잠수함사령부가 차기 잠수함 조기 전력화 예산을 요청했습니다.", [
    ["증액", "예산 −3,000억 · 워룸 잠수함사령부 지원 영구 +10", (m) => { m.budget -= 3000; m.subUp = (m.subUp || 0) + 10; }],
    ["보류", "지지율 −3 (안보 공백 논란)", (m) => { m.support -= 3; }]]],
  ["pay", "병사 봉급 인상", "병사 봉급 단계적 인상안이 국무회의에 올라왔습니다.", [
    ["인상", "예산 −2,000억 · 지지율 +12", (m) => { m.budget -= 2000; m.support += 12; }],
    ["동결", "예산 보존 · 4주간 부대 사기 −1단계", (m) => { fx(m, "moraleAdd", -4, 4); }]]],
  ["provoke", "서해 포격 도발 대응 수위", "북측이 서해 완충구역에 포격을 가했습니다. 대응 수위를 정하십시오.", [
    ["강경 대응", "지지율 +5 · 2주간 서해 위협 −1단계 · 10% 확전(동해 위협 +1단계)", (m) => { m.support += 5; fx(m, "thr:west", -1, 2); if (Math.random() < 0.1) { fx(m, "thr:east", 1, 2); note(m, "확전 — 동해 위협 상승"); } }],
    ["절제 대응", "지지율 −5", (m) => { m.support -= 5; }]]],
  ["graft", "방산 비리 의혹", "방산업체 납품 비리 의혹이 언론에 보도됐습니다.", [
    ["전면 감사", "지지율 +8 · 2주간 사업 비용 +15% (지연)", (m) => { m.support += 8; fx(m, "costK", 1.15, 2); }],
    ["내부 처리", "지지율 −10 · 10% 추가 폭로(−10)", (m) => { m.support -= 10; if (Math.random() < 0.1) { m.support -= 10; note(m, "추가 폭로 — 지지율 −10"); } }]]],
  ["intel", "한미 연합 정보 공유 확대", "연합 감시정찰 자산의 정보 공유 범위를 넓히는 안입니다.", [
    ["확대", "4주간 탐지 +10% · 지지율 −3 (주권 논란)", (m) => { fx(m, "detK", 1.1, 4); m.support -= 3; }],
    ["현행 유지", "변화 없음", () => {}]]],
  ["sat", "정찰위성 조기 전력화", "군 정찰위성 추가 발사를 1년 앞당기는 예산입니다.", [
    ["조기 전력화", "예산 −3,500억 · 탐지 영구 +5%", (m) => { m.budget -= 3500; m.satUp = true; }],
    ["원안대로", "변화 없음", () => {}]]],
  ["reserve", "예비군 훈련 강화", "예비군 동원훈련 일수를 늘리는 안입니다.", [
    ["강화", "예산 −800억 · 지지율 −4 · 4주간 워룸 전 함대 +5", (m) => { m.budget -= 800; m.support -= 4; fx(m, "fleet", 5, 4); }],
    ["축소", "지지율 +4 · 4주간 워룸 전 함대 −5", (m) => { m.support += 4; fx(m, "fleet", -5, 4); }]]],
];
function fx(m, k, v, weeks) { (m.fx ??= []).push({ k, v, until: m.week + weeks }); }
function note(m, t) { (m.notes ??= []).unshift(`${m.week}주차 · ${t}`); m.notes = m.notes.slice(0, 30); }

export const minState = () => rd(MK, null);
const save = (m) => wr(MK, m);
export const hall = () => rd(HK, []);
export const legacy = () => rd(LK, null);

/** 장관 취임: 집무실 데이터 생성 (이미 있으면 그대로) */
export function minStart(name) {
  let m = minState(); if (m && !m.retired) return m;
  const L = legacy(), cm = () => ({ name: `${pick(SUR)}${pick(GIV)}`, st: 50 + ((Math.random() * 36) | 0) });
  m = { week: 1, budget: 14200, support: 60, doctrine: null, prog: { ship: 0, air: 0, kamd: 0, log: 0 }, fx: [], notes: [], sup: [], war: null, wins: 0, fights: 0, docket: [], name,
    cmdr: { f1: cm(), f2: cm(), f3: cm(), mob: cm(), sub: cm(), airc: cm() }, retired: false };
  if (L?.prog) m.prog[L.prog] = 3;
  newWeek(m, true); save(m); return m;
}
function lvOf(m, k) { return m.week ? Math.max(0, m.prog[k] || 0) : 0; }
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
  if (on) { F.outK *= fxv(m, "outK", 1); F.inK *= fxv(m, "inK", 1); F.detK *= fxv(m, "detK", 1) * (m.satUp ? 1.05 : 1); F.asmK *= fxv(m, "asmK", 1); F.cdK *= fxv(m, "cdK", 1); F.moraleAdd += fxv(m, "moraleAdd", 0); F.repairCut += fxv(m, "repairCut", 0); }
  F.rearmK ??= 1; F.repairCut = Math.min(2, F.repairCut); return F;
}

function progCost(m, k, lvl) { const D = m.doctrine, base = PROGS[k].lv[lvl][0]; return Math.round(base * (D === "aad" ? 1.1 : 1) * (D === "tech" ? (k === "ship" ? 1.15 : 0.8) : 1) * fxv(m, "costK", 1)); }
function upkeep(m) { return Math.round(UPKEEP * (m.doctrine === "joint" ? 1.15 : 1) * ((m.prog.log || 0) >= 2 ? 0.8 : 1)); }
function income(m) { return Math.round(BASE * (1 + m.support / 200)); }

function newWeek(m, first) {
  const areas = {};
  for (const [k, A] of Object.entries(AREAS)) { const r = Math.random() * (A.w[0] + A.w[1] + A.w[2]); let lvl = r < A.w[0] ? 0 : r < A.w[0] + A.w[1] ? 1 : 2; lvl = clamp(lvl + fxv(m, `thr:${k}`, 0), 0, 2); areas[k] = { lvl, reinf: null, res: null }; }
  m.war = { areas, direct: null };
  const pool = DOCKET.map((d) => d[0]).filter((id) => !(m.recent || []).includes(id)), n = first ? 1 : Math.random() < 0.5 ? 2 : 1;
  m.docket = []; for (let i = 0; i < n && pool.length; i++) m.docket.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
  m.recent = [...(m.recent || []), ...m.docket].slice(-6);
}
function areaP(m, k) {
  const A = AREAS[k], W = m.war.areas[k], c = m.cmdr[A.fleet], r = W.reinf;
  const sCmd = c.st + fxv(m, "cmd", 0), sFleet = A.base + (m.prog.ship || 0) * 4 + ((m.prog.ship || 0) >= 1 ? 6 : 0) + (m.prog.log || 0) * 2 + fxv(m, "fleet", 0);
  const sSup = r ? REINF[r][1] + m.cmdr[r].st * 0.2 + (r === "sub" ? m.subUp || 0 : 0) + (r === "airc" ? (m.prog.air || 0) * 4 : 0) + (r === "mob" ? (m.prog.ship || 0) * 3 : 0) : 0;
  const thr = (THREAT[W.lvl] + m.week * 2.8) * (1 - (m.prog.kamd || 0) * 0.02) * ((m.prog.kamd || 0) >= 5 ? 0.9 : 1);
  const k2 = m.doctrine === "off" ? 1.08 : m.doctrine === "joint" && r ? 1.06 : m.doctrine === "aad" ? 1.03 : 1;
  return clamp(Math.round(((sCmd + sFleet + sSup * (m.doctrine === "joint" ? 1.2 : 1)) / thr) * 100 * k2 * 0.62), 5, 99);
}
const outcomeOf = (p) => (p >= 75 ? ["대승", "g", 1, 300] : p >= 50 ? ["승리", "y", 0, 100] : ["패배", "r", -4, -500]);

/** 직접 지휘한 서해 작전 결과 (작전지도에서 호출) */
export function minOpResult(win) {
  const m = minState(); if (!m || m.retired || !m.war || m.war.direct !== "west") return; const W = m.war.areas.west;
  W.res = win ? ["대승", "g", 3, 800, true] : ["패배", "r", -5, -500, true]; save(m);
}

function endWeek(m) {
  const log = [];
  for (const k of Object.keys(AREAS)) { const W = m.war.areas[k]; let o = W.res;
    if (!o) { const p = clamp(areaP(m, k) + ((Math.random() * 21) | 0) - 10, 0, 100); o = outcomeOf(p); o = [...o, false, p]; }
    const sup = o[2] < 0 ? Math.round(o[2] * (m.doctrine === "off" ? 1.3 : 1)) : o[2]; m.support += sup; m.budget += o[3]; m.fights++; if (o[0] !== "패배") m.wins++;
    log.push(`${AREAS[k].n} ${o[0]}${o[4] ? "(직접 지휘)" : ""} 지지율 ${sup > 0 ? "+" : ""}${sup}`); }
  if (fxv(m, "misfire", 0) > 0 && Math.random() < 0.1) { m.support -= 20; log.push("선제 타격 수칙 — 오발 사고 발생, 지지율 −20"); }
  const inc = income(m), up = upkeep(m); m.budget += inc - up; log.push(`정기 예산 +${won(inc)} · 유지비 −${won(up)}`);
  m.support = clamp(Math.round(m.support + (m.support > 75 ? -4 : m.support > 60 ? -2 : m.support < 45 ? 1 : 0)), 0, 100); m.sup.push(m.support);
  note(m, log.join(" · ")); m.last = log;
  m.fx = m.fx.filter((e) => e.until > m.week); m.week++;
  if (m.week > TERM) return termEnd(m);
  newWeek(m);
}
function termEnd(m) {
  const avg = Math.round(m.sup.reduce((a, b) => a + b, 0) / Math.max(1, m.sup.length)), l5 = Object.values(m.prog).filter((v) => v >= 5).length, rate = Math.round((m.wins / Math.max(1, m.fights)) * 100);
  const ok = avg >= 60 && l5 >= 2 && rate >= 80; m.retired = true; m.term = { avg, l5, rate, ok };
  const H = hall(); H.unshift({ name: m.name, gen: (legacy()?.gen || 1), at: new Date().toISOString().slice(0, 10), avg, l5, rate, ok, doctrine: m.doctrine ? DOCTRINES[m.doctrine].n : "—", prog: { ...m.prog } }); wr(HK, H.slice(0, 20));
}

// ── 화면 ──
let tab = "desk", ngArm = false;
const bar = (v, c = "") => `<i class="mn-bar"><em class="${c}" style="width:${clamp(v, 0, 100)}%"></em></i>`;
export function minHTML() {
  const m = minState(); if (!m) return "";
  if (m.retired) return retiredHTML(m);
  const F = minFx(), dk = m.docket.map((id) => DOCKET.find((d) => d[0] === id)).filter(Boolean), pend = dk.length;
  const left = `<div class="mn-col"><div class="mn-h">작전 교리 <small>출격 전 언제든 변경</small></div>${Object.entries(DOCTRINES).map(([k, d]) => `<button class="mn-doc ${m.doctrine === k ? "on" : ""}" data-min="doc:${k}"><b>${d.n}</b><small>${d.d}</small><span>${d.up.map((x) => `<em class="g">${x}</em>`).join("")}${d.dn.map((x) => `<em class="r">${x}</em>`).join("")}</span></button>`).join("")}
    <div class="mn-h">국방부 결재판 <small>${pend ? `${pend}건 대기` : "처리 완료"}</small></div>${dk.length ? dk.map(([id, t, d, opts]) => `<div class="mn-card mn-dk"><b>${t}</b><p>${d}</p>${opts.map(([n, e], i) => `<button data-min="dk:${id}:${i}"><b>${n}</b><small>${e}</small></button>`).join("")}</div>`).join("") : `<div class="mn-card"><small>이번 주 결재 안건을 모두 처리했습니다.</small></div>`}</div>`;
  const A = m.war.areas, used = Object.values(A).map((w) => w.reinf).filter(Boolean);
  const mid = `<div class="mn-col mn-war"><div class="mn-h">합동 워룸 <small>${m.week}주차 위기 — 서해만 직접 지휘 가능, 나머지는 사령관 위임</small></div><div class="mn-map">${Object.entries(AREAS).map(([k, a]) => { const W = A[k], p = areaP(m, k), c = m.cmdr[a.fleet], o = W.res;
      return `<div class="mn-area ${k} t${W.lvl}"><div class="ah"><b>${a.n}</b><span class="lv l${W.lvl}">위협 ${LVN[W.lvl]}</span></div><small>할당 <b>${FLEETS[a.fleet]}</b> · 사령관 ${c.name} 중장 (지휘 ${c.st}${fxv(m, "cmd", 0) ? ` ${fxv(m, "cmd", 0) > 0 ? "+" : ""}${fxv(m, "cmd", 0)}` : ""})</small>
      <div class="rf">증원 ${Object.entries(REINF).map(([r, [n]]) => `<button data-min="rf:${k}:${r}" class="${W.reinf === r ? "on" : ""}" ${used.includes(r) && W.reinf !== r ? "disabled" : ""}>${n.replace("사령부", "")}</button>`).join("")}</div>
      <div class="pw">위임 예상 ${bar(p, p >= 75 ? "g" : p >= 50 ? "y" : "r")}<b class="${p >= 75 ? "g" : p >= 50 ? "y" : "r"}">${p}% · ${outcomeOf(p)[0]}</b></div>
      ${k === "west" ? (o ? `<div class="dr ${o[1]}">직접 지휘 결과: <b>${o[0]}</b></div>` : `<button class="mn-go" data-min="direct">직접 지휘 — 작전지도로 출격</button>`) : ""}</div>`; }).join("")}</div>
    <div class="mn-card mn-log"><div class="mn-h">지난 주 결과</div>${(m.last || ["취임 첫 주입니다. 교리를 선포하고 결재·워룸을 정리한 뒤 '다음 주'를 누르십시오."]).map((t) => `<small>${t}</small>`).join("")}</div></div>`;
  const right = `<div class="mn-col"><div class="mn-h">방위력 개선 사업 <small>각 5단계</small></div>${Object.entries(PROGS).map(([k, P]) => { const L = m.prog[k] || 0, nx = L < 5 ? progCost(m, k, L) : 0;
      return `<div class="mn-card mn-pg"><div class="ph"><b>${P.ic} ${P.n}</b><span>LV ${L}/5</span></div><div class="lvs">${P.lv.map(([, d], i) => `<div class="${i < L ? "done" : i === L ? "next" : ""}"><i>${i + 1}</i>${d}</div>`).join("")}</div>${L < 5 ? `<button data-min="pg:${k}" ${m.budget < nx ? "disabled" : ""}>LV ${L + 1} 투자 — ${won(nx)}</button>` : `<em class="g">완성</em>`}</div>`; }).join("")}</div>`;
  const avg = m.sup.length ? Math.round(m.sup.reduce((a, b) => a + b, 0) / m.sup.length) : m.support, l5 = Object.values(m.prog).filter((v) => v >= 5).length, rate = m.fights ? Math.round((m.wins / m.fights) * 100) : 0;
  return `<div class="mn"><div class="mn-top"><div class="mt"><span>임기</span><b>${m.week} / ${TERM}주</b>${bar((m.week / TERM) * 100)}</div><div class="mt"><span>국방 예산</span><b>${won(m.budget)}</b><small>주간 +${won(income(m))} · 유지비 −${won(upkeep(m))}</small></div><div class="mt"><span>국정 지지율</span><b class="${m.support >= 60 ? "g" : m.support >= 40 ? "y" : "r"}">${m.support}</b>${bar(m.support, m.support >= 60 ? "g" : m.support >= 40 ? "y" : "r")}</div>
    <div class="mt goals"><span>임기 목표</span><small class="${avg >= 60 ? "g" : ""}">평균 지지율 ${avg}/60</small><small class="${l5 >= 2 ? "g" : ""}">LV5 사업 ${l5}/2</small><small class="${rate >= 80 ? "g" : ""}">위기 방어 ${rate}%/80%</small></div>
    <button class="mn-next" data-min="next" ${pend ? "disabled" : ""}>${pend ? `결재 ${pend}건 남음` : "다음 주 ›"}</button></div>
    <div class="mn-body">${left}${mid}${right}</div><div class="mn-foot">${m.doctrine ? `현재 교리 <b>${DOCTRINES[m.doctrine].n}</b>` : "<b class='r'>교리 미선포</b>"} · 전투 보정 화력 ×${F.outK.toFixed(2)} · 받는 피해 ×${F.inK.toFixed(2)} · 요격 ×${F.icptK.toFixed(2)} · 탐지 ×${F.detK.toFixed(2)} · 수치는 모두 게임용 값입니다</div></div>`;
}
function retiredHTML(m) {
  const T = m.term, H = hall();
  return `<div class="mn"><div class="mn-ret"><div class="mn-card big"><h3>${T.ok ? "명예 퇴임" : "임기 종료"}</h3><p>${m.name} 장관 · ${TERM}주 임기</p>
    <div class="kv"><span>평균 국정 지지율</span><b class="${T.avg >= 60 ? "g" : "r"}">${T.avg} / 60</b></div><div class="kv"><span>LV5 방위력 개선 사업</span><b class="${T.l5 >= 2 ? "g" : "r"}">${T.l5} / 2</b></div><div class="kv"><span>다해역 위기 방어율</span><b class="${T.rate >= 80 ? "g" : "r"}">${T.rate}% / 80%</b></div>
    <p>${T.ok ? "임기 목표를 모두 달성했습니다. 2회차를 시작하면 특전이 주어집니다: 명예 약장(화력 +10%·초반 봉급 +50%), 완성 사업 1개 LV3 계승, 원수 승진 30% 단축." : "임기 목표를 다 이루지 못했습니다. 2회차를 시작할 수 있지만 특전은 없습니다."}</p>
    ${T.ok ? `<div class="mn-h">계승할 사업 (LV3로 시작)</div><div class="rf">${Object.entries(PROGS).filter(([k]) => (m.prog[k] || 0) >= 5).map(([k, P]) => `<button data-min="inh:${k}" class="${m.inh === k ? "on" : ""}">${P.n}</button>`).join("")}</div>` : ""}
    <button class="mn-ng ${ngArm ? "arm" : ""}" data-min="ng">${ngArm ? "한 번 더 누르면 커리어·함정·기록이 초기화되고 소위로 다시 시작합니다" : "2회차 시작 (소위부터)"}</button><small>명예의 전당·설정·지휘관 이름은 그대로 남습니다. 이 버튼을 누르지 않으면 지금 커리어로 계속 플레이할 수 있습니다.</small></div>
    <div class="mn-card"><div class="mn-h">역대 국방부장관 명예의 전당</div>${H.map((h) => `<div class="hl ${h.ok ? "ok" : ""}"><b>${h.ok ? "★ " : ""}${h.name}</b><span>${h.gen}회차 · ${h.at}</span><small>지지율 ${h.avg} · LV5 ${h.l5}개 · 방어율 ${h.rate}% · 교리 ${h.doctrine}</small></div>`).join("") || "<small>기록 없음</small>"}</div></div></div>`;
}

/** 클릭 처리: 결과 { redraw, direct, reset } */
export function minClick(a) {
  const m = minState(); if (!m) return {};
  if (a === "ng") { if (!ngArm) { ngArm = true; return { redraw: true }; } ngArm = false; const T = m.term, L = legacy();
    wr(LK, { gen: (L?.gen || 1) + 1, medal: !!T?.ok, prog: T?.ok ? m.inh || Object.keys(m.prog).find((k) => m.prog[k] >= 5) || null : null, minister: !!T?.ok }); return { reset: true }; }
  if (a.startsWith("inh:")) { m.inh = a.slice(4); save(m); return { redraw: true }; }
  if (m.retired) return {};
  if (a.startsWith("doc:")) { const k = a.slice(4); m.doctrine = m.doctrine === k ? null : k; save(m); return { redraw: true, toast: m.doctrine ? `작전 교리 선포 — ${DOCTRINES[k].n}` : "작전 교리 해제" }; }
  if (a.startsWith("dk:")) { const [, id, i] = a.split(":"), d = DOCKET.find((x) => x[0] === id), o = d?.[3][+i]; if (!o || !m.docket.includes(id)) return {}; o[2](m); m.support = clamp(m.support, 0, 100); m.docket = m.docket.filter((x) => x !== id); note(m, `결재 「${d[1]}」 — ${o[0]}`); save(m); return { redraw: true, toast: `결재 — ${o[0]}` }; }
  if (a.startsWith("pg:")) { const k = a.slice(3), L = m.prog[k] || 0; if (L >= 5) return {}; const c = progCost(m, k, L); if (m.budget < c) return { toast: "예산이 부족합니다" }; m.budget -= c; m.prog[k] = L + 1; note(m, `${PROGS[k].n} LV${L + 1} 완료 (−${won(c)})`); save(m); return { redraw: true, toast: `${PROGS[k].n} LV${L + 1} — ${PROGS[k].lv[L][1]}` }; }
  if (a.startsWith("rf:")) { const [, k, r] = a.split(":"), W = m.war.areas[k]; W.reinf = W.reinf === r ? null : r; save(m); return { redraw: true }; }
  if (a === "direct") { if (m.war.areas.west.res) return {}; m.war.direct = "west"; save(m); return { direct: true }; }
  if (a === "next") { if (m.docket.length) return { toast: "결재 안건을 먼저 처리하십시오" }; endWeek(m); m.support = clamp(m.support, 0, 100); save(m); return { redraw: true, toast: m.retired ? "임기 종료" : `${m.week}주차 — 새 위기와 결재 안건` }; }
  return {};
}
/** 2회차 시작 시 지울 저장 키 (설정·지휘관 이름·명예의 전당·계승은 남김) */
export const NG_RESET = ["steeltide:profile", "steeltide:career", "steeltide:staff", "steeltide:kcamp", "steeltide:camp", "steeltide:oplog", "steeltide:c72", "steeltide:post", "steeltide:mission", MK];
