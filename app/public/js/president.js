// 대통령 선거 (국방부장관 임기를 마친 민간인): 프롤로그 → 출마 선언 → 정당 선택 → 당내 경선 → 본선 7턴 → TV 토론 3회 → 선거일 밤.
// 정당·후보·인물은 모두 가상이다. 수치는 게임용 값이며 실제 여론·득표와 무관하다.
// 제도 모티브: 법정 TV 토론 3회(경제·사회·정치), 선거일 6일 전부터 여론조사 공표 금지, 사전투표.
import { docketPaper } from "./career-rules.js";
import { KOREA, kxy } from "./korea.js";
import { minState } from "./ministry.js";

const PK = "steeltide:pres";
const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 */ } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
const won = (n) => `${Math.round(n).toLocaleString("ko-KR")}억`;

import { presidentContent } from "./content/kr.js";
const { PARTIES, GROUPS, REG, AREA, PLEDGE, PLEDGE_LV, PRIMARY, THIRD, PROLOGUE, DOCKET, DEBATE_T, DEBATE_Q, PAST } = presidentContent();
export { PARTIES };

export const presState = () => rd(PK, null);
const save = (P) => wr(PK, P);
const note = (P, t) => { (P.log ??= []).unshift(t); P.log = P.log.slice(0, 24); };

/** 민간인 단계 시작 — 장관 기록을 이어받는다 */
export function presStart(name) {
  const m = minState(), T = m?.term || { avg: 55, l5: 1, rate: 80, ok: false };
  const P = { stage: "pro", turn: 0, name, fame: clamp(32 + (T.avg - 55) + (T.ok ? 8 : 0), 15, 70), money: 120, org: 30, hp: 100, trust: 40 + T.l5 * 5,
    g: { sec: clamp(50 + (T.rate - 80) * 0.5, 35, 70), eco: 50, youth: 50, mid: 50, old: 50 }, r: Object.fromEntries(Object.keys(REG).map((k) => [k, 50])),
    pl: { sec: 0, eco: 0, wel: 0, youth: 0, bal: 0 }, picks: m?.picks || {}, flags: {}, log: [], poll: [], docket: [], seen: [], debates: [], term: T };
  note(P, "국방부장관 임기를 마치고 민간인이 되었습니다."); save(P); return P;
}

/** 높을수록 덜 오르는 호감 (포화) */
const gAdd = (x, v) => clamp(x + (v > 0 ? v * Math.max(0.25, 1 - Math.max(0, x - 55) / 40) : v), 0, 100);
function apply(P, e) {
  if (!e) return;
  for (const k of ["fame", "trust", "org", "money", "hp"]) if (e[k]) P[k] += e[k];
  for (const [k, v] of Object.entries(e.g || {})) P.g[k] = gAdd(P.g[k], v);
  if (e.rAll) for (const k in P.r) P.r[k] = clamp(P.r[k] + e.rAll, 0, 100);
  if (e.tour) { const k = Object.keys(P.r).sort((a, b) => P.r[a] - P.r[b])[0]; P.r[k] = clamp(P.r[k] + 6, 0, 100); }
  if (e.opp) for (const o of P.opp || []) o.m += e.opp;
  if (e.unify) P.flags.unify = 1;
  P.money = Math.max(0, P.money); P.fame = clamp(P.fame, 0, 100); P.trust = clamp(P.trust, 0, 100); P.org = clamp(P.org, 0, 100); P.hp = clamp(P.hp, 0, 100);
}
/** 후보 경쟁력 점수 */
function myScore(P) {
  const gs = Object.entries(GROUPS).reduce((a, [k, [, w]]) => a + w * (P.g[k] - 50), 0) / 45, rs = Object.entries(REG).reduce((a, [k, [, w]]) => a + w * (P.r[k] - 50), 0) / 70;
  return (P.party === "ind" ? 0.7 : 1) + (P.fame - 50) / 140 + gs + rs + (P.org - 50) / 260 + (P.trust - 50) / 220 + (P.hp < 25 ? -0.12 : 0);
}
function shares(P) {
  const xs = [myScore(P), ...P.opp.map((o) => o.base + o.m)], K = 2.2, ex = xs.map((x) => Math.exp(x * K)), S = ex.reduce((a, b) => a + b, 0);
  let sh = ex.map((x) => x / S);
  if (P.flags.unify && P.opp.length > 2) { /* 단일화: 제3지대 지지의 60%를 흡수 */ const t = sh[3] || 0; sh[0] += t * 0.6; sh[1] += t * 0.4; sh[3] = 0; }
  return sh;
}
const fmtPct = (x) => `${(x * 100).toFixed(1)}%`;

function poll(P) { const sh = shares(P), err = 0.02; P.poll.push(sh.map((x) => clamp(x + rnd(-err, err), 0, 1))); return sh; }

/** 경선 회차 결과 */
const PRI_ROUND = [["충청", ["chung"]], ["호남·제주", ["honam", "jeju"]], ["영남", ["yeong"]], ["수도권·강원", ["cap", "gang"]]];
function priHint(P) { const R = P.pri; if (R.hint[R.round] == null) { R.hint[R.round] = Math.random() < 0.65 ? R.pref[R.round] : pick(Object.keys(AREA)); save(P); } return R.hint[R.round]; }
function priRound(P, topic, debateK) {
  const R = P.pri, [rn, rs] = PRI_ROUND[R.round], loc = rs.reduce((a, k) => a + P.r[k], 0) / rs.length;
  const pref = R.pref[R.round], me = 0.28 + (P.fame - 50) / 50 + (loc - 50) / 40 + (P.org - 30) / 90 + (topic === pref ? 0.3 : 0) + debateK + (P.trust - 50) / 120;
  const xs = [me, ...R.riv.map((v, i) => v.base + (v.home === R.round ? 0.25 : 0) + rnd(-0.12, 0.12) + i * 0)], ex = xs.map((x) => Math.exp(x * 2)), S = ex.reduce((a, b) => a + b, 0);
  const res = ex.map((x) => x / S); R.res.push(res); R.round++;
  note(P, `경선 ${rn} — ${P.name} ${fmtPct(res[0])} · ${R.riv[0].n} ${fmtPct(res[1])} · ${R.riv[1].n} ${fmtPct(res[2])}`);
  return res;
}
const priTotal = (P) => P.pri.res.reduce((a, r) => a.map((v, i) => v + r[i] / P.pri.res.length), [0, 0, 0]);

function setupRace(P) {
  const other = P.party === "dm" ? "hn" : "dm";
  if (P.party === "ind") P.opp = [{ n: PRIMARY.dm[0][0], p: "dm", base: 1.1, m: 0 }, { n: PRIMARY.hn[0][0], p: "hn", base: 1.1, m: 0 }];
  else P.opp = [{ n: pick(PRIMARY[other])[0], p: other, base: 1.55, m: 0 }, { n: THIRD[0], p: "third", base: 0.7, m: 0 }];
  P.stage = "camp"; P.turn = 0; P.money += P.party === "ind" ? 60 : 200; P.org += P.party === "ind" ? 0 : 25; newTurn(P); poll(P);
}
function newTurn(P) {
  P.act = { tours: [], pledge: false, ad: false }; const pool = DOCKET.filter((d) => !P.seen.includes(d[0]) && (!d[5] || d[5](P)));
  P.docket = []; for (let i = 0; i < 2 && pool.length; i++) { const d = pool.splice((Math.random() * pool.length) | 0, 1)[0]; P.docket.push(d[0]); P.seen.push(d[0]); }
}
const DK = (id) => DOCKET.find((d) => d[0] === id);
const dday = (P) => 21 - P.turn * 3;
const debateDue = (P) => [1, 3, 5].includes(P.turn) && !P.debates.includes(P.turn);
const blackout = (P) => dday(P) <= 6;

/** TV 토론 질문 세트 */
export function debateQs(P) {
  const k = [1, 3, 5].indexOf(P.turn), base = DEBATE_Q[k].map(([q, o]) => ({ who: "사회자", q, opts: o.map(([n, e]) => [n, e]) })), o = P.opp[0];
  base.push({ who: `${o.n} 후보`, q: `${P.name} 후보는 장관 시절 성과를 말하지만, 그때 국정 지지율이 평균 ${P.term.avg}였습니다. 국민이 그 성과를 체감했다고 보십니까?`, opts: [["숫자로 실적 반박", "신뢰 +"], ["인정하고 비전으로 전환", "중도층 +"], ["상대 후보 이력으로 역공", "지지층 결집 · 중도층 −"]] });
  const ks = Object.keys(PAST).filter((id) => P.picks[id] != null), id = ks[k % Math.max(1, ks.length)];
  if (id) { const [t, opts] = PAST[id], was = opts[P.picks[id]] || opts[0]; base.push({ who: "패널 기자", q: `장관 시절 「${t}」에서 '${was}' 쪽으로 결재하셨습니다. 지금도 같은 입장입니까?`, opts: [["그 입장 그대로입니다", "신뢰 +3 · 해당 지지층 +"], ["상황이 바뀌어 입장을 조정하겠습니다", "중도층 +2 · 신뢰 −5"]], past: id }); }
  return base;
}
function debatePick(P, qi, ai) {
  const k = [1, 3, 5].indexOf(P.turn);
  if (qi < 2) apply(P, DEBATE_Q[k][qi][1][ai][2]);
  else if (qi === 2) apply(P, [{ trust: 3 }, { g: { mid: 4 } }, { g: { sec: 2, eco: 2, mid: -4 } }][ai]);
  else apply(P, ai === 0 ? { trust: 3, g: { sec: 3 } } : { trust: -5, g: { mid: 2 } });
  P.dscore = (P.dscore || 0) + 1;
}

/* ── 화면 ── */
function mapSVG(P) {
  const regs = Object.entries(REG).map(([k, [n, w, lo, la]]) => { const [x, y] = kxy(lo, la), v = P.r[k], c = v >= 55 ? "#5fd17a" : v >= 45 ? "#f2ca5c" : "#ff6b5e", sel = P.act?.tours.includes(k);
    return `<g class="rg ${sel ? "on" : ""}" data-pres="tour:${k}"><circle cx="${x}" cy="${y}" r="${k === "cap" ? 22 : 16}" fill="${c}" opacity=".22"/><circle cx="${x}" cy="${y}" r="${k === "cap" ? 22 : 16}" fill="none" stroke="${sel ? "#fff" : c}" stroke-width="${sel ? 3 : 1.5}"/><text x="${x}" y="${y - (k === "cap" ? 26 : 20)}" text-anchor="middle" class="zl">${n} ${Math.round(w * 100)}%</text><text x="${x}" y="${y + 4}" text-anchor="middle" class="rv">${Math.round(v)}</text></g>`; }).join("");
  return `<div class="mn-kmap pr-map"><svg viewBox="0 0 410 405" role="img" aria-label="권역별 호감도 지도"><rect width="410" height="405" fill="#0b1a26"/><path d="${KOREA.cn}" fill="#2a2e33"/><path d="${KOREA.jp}" fill="#2a2e33"/><path d="${KOREA.nk}" fill="#2a2a2e"/><path d="${KOREA.kr}" fill="#24384a" stroke="#4d7590" stroke-width=".7"/>${regs}<text x="406" y="14" text-anchor="end" class="lg">권역별 호감 · % = 유권자 비중(게임용) · 클릭해 유세지 선택</text></svg></div>`;
}
function pollSVG(P) {
  const H = P.poll, n = H.length, cols = ["#f2ca5c", ...P.opp.map((o) => (PARTIES[o.p] || { c: "#a78bfa" }).c)];
  if (n < 2) return "";
  const W = 300, Ht = 90, X = (i) => 20 + (i / (n - 1)) * (W - 28), Y = (v) => 6 + (1 - v / 0.7) * (Ht - 14);
  return `<svg viewBox="0 0 ${W} ${Ht}" class="pr-poll" role="img" aria-label="여론조사 추이">${[0.2, 0.4, 0.6].map((v) => `<line x1="20" x2="${W - 8}" y1="${Y(v)}" y2="${Y(v)}" class="gx"/><text x="16" y="${Y(v) + 3}" text-anchor="end">${v * 100}</text>`).join("")}${cols.map((c, j) => `<path d="${H.map((s, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(s[j] || 0).toFixed(1)}`).join("")}" fill="none" stroke="${c}" stroke-width="${j ? 1.4 : 2.4}"/>`).join("")}</svg>`;
}
const bar = (v, c = "") => `<div class="mn-bar ${c}"><em style="width:${clamp(v, 0, 100)}%"></em></div>`;

export const presTheme = (P = presState()) => ({ dm: "blue", hn: "red" })[P?.party] || null;
/** 단계별 배경 사진 */
function prBg(P) { const t = presTheme(P), n = P.stage === "pro" || P.stage === "party" || P.stage === "quit" ? "study" : P.stage === "pri" ? (t ? `primary_hall_${t}` : "camp_room") : P.stage === "camp" ? (t ? `rally_${t}` : "camp_room") : P.stage === "won" ? (t ? `victory_${t}` : "inauguration") : "study";
  return `background:linear-gradient(rgba(8,12,16,.84),rgba(8,12,16,.93)),url(img/bg/${n}.jpg) center/cover`; }
export function presHTML() {
  const P = presState(); if (!P) return "";
  const party = P.party ? PARTIES[P.party] : null;
  const top = `<div class="mn-top"><div class="mt"><span>상태</span><b>${{ pro: "민간인", party: "출마 선언", pri: `${party?.n} 경선 후보`, camp: `${party?.n} 대통령 후보`, night: "선거일", won: "대통령 당선인", lost: "낙선 · 민간인", quit: "민간인" }[P.stage]}</b><small>${P.name}</small></div>
    <div class="mt"><span>인지도</span><b>${Math.round(P.fame)}</b>${bar(P.fame)}</div><div class="mt"><span>정책 신뢰</span><b>${Math.round(P.trust)}</b>${bar(P.trust)}</div><div class="mt"><span>조직</span><b>${Math.round(P.org)}</b>${bar(P.org)}</div><div class="mt"><span>체력</span><b class="${P.hp < 30 ? "r" : ""}">${Math.round(P.hp)}</b>${bar(P.hp, P.hp < 30 ? "r" : "g")}</div><div class="mt"><span>선거 자금</span><b>${won(P.money)}</b></div>
    ${P.stage === "camp" ? `<div class="mt"><span>선거일까지</span><b>D-${dday(P)}</b></div>` : ""}</div>`;
  let body = "";
  const groups = `<div class="mn-card"><div class="mn-h">유권자 집단 호감</div>${Object.entries(GROUPS).map(([k, [n]]) => `<div class="pr-g"><span>${n}</span>${bar(P.g[k], P.g[k] >= 55 ? "g" : P.g[k] < 45 ? "r" : "y")}<b>${Math.round(P.g[k])}</b></div>`).join("")}</div>`;
  const log = `<div class="mn-card mn-log"><div class="mn-h">기록</div>${P.log.slice(0, 8).map((t) => `<small>${t}</small>`).join("")}</div>`;
  if (P.stage === "pro") {
    body = `<div class="mn-col"><div class="pr-ban" style="--bg:url(img/bg/study.jpg)"><b>민간인</b><small>퇴임 후 개인 사무실</small></div><div class="mn-h">민간인 · ${P.turn + 1} / 4 <small>회고록, 강연, 지역 순회로 출마 기반을 다집니다</small></div>${PROLOGUE.map(([k, n, e]) => `<button class="mn-doc" data-pres="pro:${k}"><b>${n}</b><small>${e}</small></button>`).join("")}</div><div class="mn-col">${mapSVG({ ...P, act: null })}${groups}</div><div class="mn-col">${log}</div>`;
  } else if (P.stage === "party") {
    body = `<div class="mn-col"><div class="mn-h">출마할 길을 고르십시오</div>${["dm", "hn"].map((k) => `<button class="mn-doc pr-pt" data-pres="party:${k}" style="--pc:${PARTIES[k].c}"><b>${PARTIES[k].n} 입당</b><small>조직·자금이 큽니다. 당내 경선 4회를 이겨야 후보가 됩니다. 경쟁자: ${PRIMARY[k].map(([n, t]) => `${n}(${t})`).join(", ")}</small></button>`).join("")}<button class="mn-doc pr-pt" data-pres="party:ind" style="--pc:#9aa5b1"><b>무소속 출마</b><small>경선 없이 바로 본선. 중도층 +8이지만 조직·자금이 매우 적고, 두 정당 후보와 싸웁니다.</small></button><button class="mn-doc" data-pres="quit"><b>불출마 — 민간인으로 남기</b><small>여기서 이야기를 마칩니다</small></button></div><div class="mn-col">${groups}</div><div class="mn-col">${log}</div>`;
  } else if (P.stage === "pri") {
    const R = P.pri, done = R.round >= 4, tot = R.res.length ? priTotal(P) : null;
    body = `<div class="mn-col"><div class="pr-ban" style="--bg:url(img/bg/${presTheme(P) ? `primary_hall_${presTheme(P)}` : "camp_room"}.jpg)"><b>${party.n} 경선</b><small>권역 순회 합동 연설회</small></div><div class="mn-h">${party.n} 대통령 후보 경선 <small>권역 순회 ${Math.min(R.round + 1, 4)} / 4</small></div>
      ${done ? `<div class="mn-card"><b>${tot[0] >= Math.max(tot[1], tot[2]) ? "경선 승리!" : "경선 패배"}</b><p>누적 득표 ${P.name} ${fmtPct(tot[0])} · ${R.riv[0].n} ${fmtPct(tot[1])} · ${R.riv[1].n} ${fmtPct(tot[2])}</p>${tot[0] >= Math.max(tot[1], tot[2]) ? `<button class="mn-go" data-pres="nominee">후보 수락 연설 — 본선으로 ›</button>` : `<button class="mn-doc" data-pres="concede"><b>결과 승복</b><small>민간인으로 돌아갑니다</small></button><button class="mn-doc" data-pres="bolt"><b>탈당 후 무소속 출마</b><small>조직 −15 · 인지도 +5 · 신뢰 −8</small></button>`}</div>`
        : `<div class="mn-card"><b>${PRI_ROUND[R.round][0]} 경선</b><p>이 지역 당원들이 가장 관심 있는 분야에 맞춰 연설 주제를 고르십시오. 고른 뒤 경선 토론회 질문이 하나 나옵니다.</p><small class="pr-hint">현장 보고: "${AREA[priHint(P)]} 이야기를 듣고 싶어 하는 분위기입니다" (보고가 틀릴 때도 있습니다)</small>${Object.entries(AREA).map(([k, n]) => `<button data-pres="pri:${k}" class="pr-btn"><b>${n}</b> 연설</button>`).join("")}<button class="pr-btn" data-pres="orgbuy" ${P.money < 30 ? "disabled" : ""}>조직 동원 (자금 −30억 · 조직 +8)</button></div>`}
      </div><div class="mn-col"><div class="mn-card"><div class="mn-h">회차별 결과</div>${R.res.map((r, i) => `<div class="pr-g"><span>${PRI_ROUND[i][0]}</span><b>${fmtPct(r[0])}</b><small>${R.riv[0].n} ${fmtPct(r[1])} · ${R.riv[1].n} ${fmtPct(r[2])}</small></div>`).join("") || "<small>아직 없음</small>"}</div>${groups}</div><div class="mn-col">${log}</div>`;
  } else if (P.stage === "camp") {
    const sh = P.poll[P.poll.length - 1] || shares(P), dk = P.docket.map(DK).filter(Boolean), deb = debateDue(P);
    const names = [P.name, ...P.opp.map((o) => o.n)], pnames = [party.n, ...P.opp.map((o) => (PARTIES[o.p] || { n: THIRD[1] }).n)];
    const pollBox = `<div class="mn-card pr-pollc"><div class="mn-h">여론조사 <small>${blackout(P) ? "선거일 6일 전부터 공표 금지 — 깜깜이 구간" : "오차 범위 ±2%p (게임용)"}</small></div>${blackout(P) ? `<div class="pr-black">공표 금지 기간입니다. 마지막 공표 조사: ${fmtPct(P.lastPub?.[0] ?? sh[0])}</div>` : names.map((n, i) => `<div class="pr-g"><span>${n} <small>${pnames[i]}</small></span>${bar(sh[i] * 140, i ? "" : "y")}<b>${fmtPct(sh[i])}</b></div>`).join("")}${blackout(P) ? "" : pollSVG(P)}</div>`;
    const left = `<div class="mn-col"><div class="mn-h">선거 결재판 <small>${dk.length ? `${dk.length}건 대기` : "처리 완료"}</small></div>${deb ? `<div class="mn-card mn-dk mn-nsc"><b>📺 제${[1, 3, 5].indexOf(P.turn) + 1}차 법정 TV 토론 — ${DEBATE_T[[1, 3, 5].indexOf(P.turn)]}</b><p>중앙선거방송토론위원회 주관 토론회입니다. 질문 4개에 답합니다.</p><button class="mn-sc" data-pres="debate"><b>토론 스튜디오로 ›</b><small>장관 시절 결재가 검증 질문으로 나옵니다</small></button></div>` : ""}
      ${dk.map(([id, t, d, o]) => docketPaper("선 거 캠 프", t, `D-${dday(P)} · 선대위 보고`, d, o.map(([n, e], i) => `<button data-pres="dk:${id}:${i}"><b>${n}</b><small>${e}</small></button>`).join(""))).join("")}
      <div class="mn-h">이번 턴 활동 <small>3일</small></div><div class="mn-card"><small>유세지 ${P.act.tours.length}/2 — 지도에서 권역을 누르세요 (권역 +4, 체력 −8)</small>
      <div class="pr-row"><button class="pr-btn ${P.act.ad ? "on" : ""}" data-pres="ad:tv" ${P.act.ad || P.money < 40 ? "disabled" : ""}>TV 광고 (−40억 · 인지도 +4)</button><button class="pr-btn" data-pres="ad:web" ${P.act.ad || P.money < 15 ? "disabled" : ""}>온라인 (−15억 · 청년층 +4)</button><button class="pr-btn" data-pres="ad:org" ${P.act.ad || P.money < 25 ? "disabled" : ""}>현장 조직 (−25억 · 조직 +6)</button><button class="pr-btn" data-pres="ad:rest" ${P.act.ad ? "disabled" : ""}>휴식 (체력 +20)</button></div></div>
      <button class="mn-next" data-pres="next" ${dk.length || deb ? "disabled" : ""}>${dk.length ? `결재 ${dk.length}건 남음` : deb ? "TV 토론을 먼저 마치십시오" : P.turn >= 6 ? "선거일 ›" : "다음 3일 ›"}</button></div>`;
    const right = `<div class="mn-col"><div class="mn-h">공약 <small>턴마다 1개 발표 · 단계별 비용</small></div>${Object.entries(AREA).map(([k, n]) => { const L = P.pl[k], c = 30 + L * 20, boost = k === "sec" && (P.term.l5 || 0) >= 1;
        return `<div class="mn-card mn-pg"><div class="ph"><b>${n}</b><span>${L}/3</span></div><div class="lvs">${PLEDGE_LV[k].map((d, i) => `<div class="${i < L ? "done" : i === L ? "next" : ""}"><i>${i + 1}</i>${d}</div>`).join("")}</div>${L < 3 ? `<button data-pres="pl:${k}" ${P.act.pledge || P.money < c ? "disabled" : ""}>발표 — ${won(c)}${boost ? " · 장관 실적 보너스" : ""}</button>` : `<em class="g">완성</em>`}</div>`; }).join("")}</div>`;
    body = `${left}<div class="mn-col"><div class="pr-ban" style="--bg:url(img/bg/${presTheme(P) ? `rally_${presTheme(P)}` : "camp_room"}.jpg)"><b>D-${dday(P)}</b><small>${P.party === "ind" ? "무소속 캠프 상황실" : `${party.n} 거리 유세`}</small></div>${mapSVG(P)}${pollBox}${groups}</div>${right}`;
    body = `<div class="mn-body">${body}</div><div class="mn-foot">${log.replace("mn-card mn-log", "mn-card mn-log pr-log")}</div>`;
    return `<div class="mn pr" style="${prBg(P)}">${top}${body}</div>`;
  } else {
    const F = P.final; body = `<div class="mn-ret"><div class="mn-card big"><h3>${{ won: "대통령 당선", lost: "낙선", quit: "민간인" }[P.stage] || ""}</h3>${F ? `<p>최종 득표율 — ${F.names.map((n, i) => `${n} ${fmtPct(F.sh[i])}`).join(" · ")}</p>` : ""}
      ${P.stage === "won" ? `<button class="mn-pres" data-potus="start"><b>취임 — 대통령실로 ›</b><small>국군통수권자로서 5년(20분기) 임기를 시작합니다.</small></button>` : `<p>민간인으로 돌아왔습니다. 집무실 탭에서 2회차를 시작할 수 있습니다.</p>`}<button class="mn-rp" data-pres="replay">🎬 선거일 밤 다시 보기</button></div>${log}</div>`;
  }
  return `<div class="mn pr" style="${prBg(P)}">${top}<div class="mn-body">${body}</div></div>`;
}

/** 클릭 처리 → { redraw, toast, scene, cuts } */
const declScene = (P) => ({ kind: "declare", title: "대통령 선거 출마 선언", place: `${PARTIES[P.party]?.n || "무소속"} · 출마 선언 기자회견`, speaker: P.name, questions: [{ who: "기자", q: "국방부장관 출신으로 대선에 출마하시는 이유는 무엇입니까?", opts: [["안보와 민생을 함께 지키겠습니다", "중도층 +3"], ["경험으로 증명하겠습니다", "인지도 +4"], ["새로운 정치를 하겠습니다", "청년층 +3"]] }], pick: (qi, ai) => presClick(`decl:${ai}`) });
export function presClick(a) {
  const P = presState(); if (!P) return {};
  const done = (t) => { save(P); return { redraw: true, toast: t }; };
  if (a.startsWith("pro:") && P.stage === "pro") { const o = PROLOGUE.find((x) => x[0] === a.slice(4)); apply(P, o[3]); note(P, `민간인 ${P.turn + 1}/4 — ${o[1].slice(2)}`); P.turn++;
    if (P.turn >= 4) { P.stage = "party"; save(P); return { redraw: true, toast: "출마를 결심했습니다 — 출마할 길을 고르십시오" }; }
    return done(o[1]); }
  if (a.startsWith("decl:")) { apply(P, [{ g: { mid: 3 } }, { fame: 4 }, { g: { youth: 3 } }][+a.slice(5)]); note(P, "대통령 선거 출마를 선언했습니다."); return done(); }
  if (a === "quit") { P.stage = "quit"; note(P, "불출마를 선택하고 민간인으로 남았습니다."); return done(); }
  if (a.startsWith("party:") && P.stage === "party") { const k = a.slice(6); P.party = k; note(P, `${PARTIES[k].n}${k === "ind" ? "로 출마" : "에 입당"}`);
    if (k === "ind") { apply(P, { g: { mid: 8 } }); setupRace(P); return { ...done("무소속 후보 등록 — 본선 시작"), scene: declScene(P) }; }
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5); P.pri = { round: 0, res: [], pref: [0, 1, 2, 3].map(() => pick(Object.keys(AREA))), hint: [], riv: PRIMARY[k].map(([n, t], i) => ({ n, t, base: 1.05 + i * 0.05, home: order[i] })) };
    P.stage = "pri"; P.org += 20; P.money += 60; return { ...done(`${PARTIES[k].n} 경선 시작`), scene: declScene(P) }; }
  if (a === "orgbuy" && P.stage === "pri" && P.money >= 30) { P.money -= 30; P.org += 8; return done("조직 동원 +8"); }
  if (a.startsWith("pri:") && P.stage === "pri" && P.pri.round < 4) { const topic = a.slice(4); P.pending = topic; save(P);
    return { scene: { kind: "primary", title: `${PRI_ROUND[P.pri.round][0]} 경선 합동 토론회`, place: `${PARTIES[P.party].n} 대통령 후보 경선`, speaker: P.name, questions: [{ who: `${P.pri.riv[P.pri.round % 2].n} 후보`, q: pick(["본선에서 이길 수 있다는 근거가 무엇입니까?", "당에 들어온 지 얼마 안 된 분이 당을 대표할 수 있습니까?", "장관 시절 정책 중 가장 아쉬운 것은 무엇입니까?"]), opts: [["실적과 숫자로 답한다", "신뢰 기반 · 안정적"], ["당원들과 함께 가겠다고 호소", "조직 기반"], ["상대 약점을 찌른다", "모 아니면 도"]] }], pick: (qi, ai) => presClick(`prid:${ai}`) } }; }
  if (a.startsWith("prid:") && P.stage === "pri") { const ai = +a.slice(5), k = [P.trust / 400, P.org / 300, rnd(-0.25, 0.35)][ai]; priRound(P, P.pending, k); P.hp -= 8; save(P); return { redraw: true }; }
  if (a === "nominee" && P.stage === "pri") { note(P, `${PARTIES[P.party].n} 대통령 후보로 확정`); setupRace(P); save(P);
    return { redraw: true, scene: { kind: "primary", title: "후보 수락 연설", place: `${PARTIES[P.party].n} 전당대회`, speaker: P.name, questions: [{ who: "사회자", q: "경선에서 경쟁한 후보들에게 한마디 해 주십시오.", opts: [["원팀으로 함께 가겠습니다", "조직 +8"], ["정권을 바꿀 준비가 됐습니다", "인지도 +3"]] }], pick: (qi, ai) => presClick(`acc:${ai}`) } }; }
  if (a.startsWith("acc:")) { apply(P, [{ org: 8 }, { fame: 3 }][+a.slice(4)]); return done(); }
  if (a === "concede" && P.stage === "pri") { P.stage = "lost"; note(P, "경선 결과에 승복했습니다."); return done(); }
  if (a === "bolt" && P.stage === "pri") { P.party = "ind"; apply(P, { org: -15, fame: 5, trust: -8, g: { mid: 4 } }); note(P, "탈당 후 무소속으로 출마했습니다."); setupRace(P); return done("무소속 후보 등록"); }
  if (P.stage !== "camp") return a === "replay" && P.final ? { cuts: nightCuts(P) } : {};
  if (a.startsWith("tour:")) { const k = a.slice(5), T = P.act.tours; if (T.includes(k)) { P.act.tours = T.filter((x) => x !== k); P.r[k] -= 4; P.hp += 8; } else if (T.length < 2 && P.hp >= 8) { T.push(k); P.r[k] = gAdd(P.r[k], 4); P.hp -= 8; } return done(); }
  if (a.startsWith("ad:") && !P.act.ad) { const k = a.slice(3), E = { tv: [40, { fame: 4 }], web: [15, { g: { youth: 4 } }], org: [25, { org: 6 }], rest: [0, { hp: 20 }] }[k]; if (P.money < E[0]) return {}; P.money -= E[0]; apply(P, E[1]); P.act.ad = k; return done(); }
  if (a.startsWith("pl:") && !P.act.pledge) { const k = a.slice(3), L = P.pl[k], c = 30 + L * 20; if (L >= 3 || P.money < c) return {}; P.money -= c; P.pl[k]++; P.act.pledge = true;
    const e = PLEDGE[k], mul = 1 + (k === "sec" && (P.term.l5 || 0) >= 1 ? 0.4 : 0) + (P.trust - 50) / 100; for (const [g, v] of Object.entries(e)) if (g === "r") apply(P, { rAll: v }); else P.g[g] = gAdd(P.g[g], v * mul);
    note(P, `공약 발표 — ${PLEDGE_LV[k][L]}`); return done(`공약 발표 — ${PLEDGE_LV[k][L]}`); }
  if (a.startsWith("dk:")) { const [, id, i] = a.split(":"), d = DK(id), o = d?.[3][+i]; if (!o || !P.docket.includes(id)) return {}; apply(P, o[2]); P.docket = P.docket.filter((x) => x !== id); note(P, `「${d[1]}」 — ${o[0]}`); return done(`결정 — ${o[0]}`); }
  if (a === "debate" && debateDue(P)) { const qs = debateQs(P), n = [1, 3, 5].indexOf(P.turn) + 1;
    return { scene: { kind: "debate", title: `제${n}차 대통령 후보 TV 토론 — ${DEBATE_T[n - 1]}`, place: "중앙선거방송토론위원회 주관 · 법정 토론", speaker: P.name, questions: qs, pick: (qi, ai) => { const Q = presState(); debatePick(Q, qi, ai); save(Q); }, close: () => { const Q = presState(); if (!Q.debates.includes(Q.turn)) { Q.debates.push(Q.turn); Q.fame += 3; note(Q, `제${n}차 TV 토론 완료`); save(Q); } } } }; }
  if (a === "next") { if (P.docket.length || debateDue(P)) return {};
    for (const o of P.opp) o.m += rnd(0.03, 0.11) * (o.p === "third" ? 0.4 : 1); P.hp = clamp(P.hp + 6, 0, 100); if (!blackout(P)) P.lastPub = shares(P);
    P.turn++; if (P.turn >= 7) return electionNight(P);
    newTurn(P); poll(P); return done(`D-${dday(P)}${blackout(P) ? " · 여론조사 공표 금지 시작" : ""}`); }
  return {};
}
function electionNight(P) {
  const sh = shares(P).map((x) => clamp(x + rnd(-0.025, 0.025), 0, 1)), S = sh.reduce((a, b) => a + b, 0), f = sh.map((x) => x / S), win = f[0] >= Math.max(...f.slice(1));
  P.final = { sh: f, names: [P.name, ...P.opp.map((o) => o.n)], win }; P.stage = win ? "won" : "lost"; note(P, win ? `대통령 당선 — 득표율 ${fmtPct(f[0])}` : `낙선 — 득표율 ${fmtPct(f[0])}`); save(P);
  return { redraw: true, cuts: nightCuts(P) };
}
export function nightCuts(P) {
  const F = P.final, win = F.win, bars = F.names.map((n, i) => `<div><span>${n}</span><b class="${i === 0 ? (win ? "g" : "r") : ""}">${fmtPct(F.sh[i])}</b></div>`).join("");
  return [
    { img: "poll_booth", fb: "office", f: [0.5, 0.5, 1.08], who: "", text: "선거일 아침. 전국 투표소에 유권자들이 줄을 섰습니다." },
    { img: "camp_room", fb: "war_room", f: [0.5, 0.45, 1.1], who: "선대위원장", text: "오후 8시, 투표가 끝났습니다. 곧 방송 3사 출구조사가 발표됩니다." },
    { img: "election_night", f: [0.5, 0.45, 1.1], who: "앵커", text: "개표가 진행 중입니다. 권역별 득표 흐름을 보시겠습니다.", card: `<h4>개표 현황</h4>${bars}` },
    win ? { img: "victory", f: [0.5, 0.45, 1.15], flash: 5, who: P.name, text: "국민 여러분의 선택에 감사드립니다. 모든 국민의 대통령이 되겠습니다.", card: `<h4>당선 확정</h4>${bars}` }
      : { img: "camp_room", fb: "office", f: [0.4, 0.5, 1.4], who: P.name, text: "국민의 선택을 겸허히 받아들입니다. 당선인께 축하를 드립니다.", card: `<h4>낙선</h4>${bars}` },
    win ? { img: "inauguration", fb: "ceremony", f: [0.5, 0.5, 1.05], who: "", text: "그리고 취임식 날. 당신은 대한민국의 국군통수권자가 됩니다." } : { img: "office", f: [0.3, 0.45, 1.2], who: "", text: "다시 민간인입니다. 그래도 당신이 남긴 기록은 지워지지 않습니다." },
  ];
}

/** 관리자 시험 기능 */
export function presAdmin(k) {
  let P = presState(); if (!P) return {}; const done = (t) => { save(P); return { redraw: true, toast: `관리자 · ${t}` }; };
  if (k === "boost") { P.fame += 15; P.trust += 15; P.org += 15; P.money += 200; P.hp = 100; for (const g in P.g) P.g[g] = clamp(P.g[g] + 12, 0, 100); for (const r in P.r) P.r[r] = clamp(P.r[r] + 10, 0, 100); apply(P, {}); return done("능력치 +15 · 자금 +200억"); }
  if (k === "skip" && P.stage === "pro") { P.turn = 4; P.stage = "party"; return done("프롤로그 건너뜀"); }
  if (k === "pri" && P.stage === "pri") { while (P.pri.round < 4) { P.pri.res.push([0.5, 0.27, 0.23]); P.pri.round++; } return done("경선 승리 처리"); }
  if (k === "dday" && P.stage === "camp") { P.turn = 6; P.docket = []; P.debates = [1, 3, 5]; P.act = { tours: [], pledge: false, ad: false }; return done("D-3으로 이동"); }
  if (k === "win" || k === "lose") { if (!P.party) P.party = "dm"; if (!P.opp) setupRace(P); P = { ...P }; const w = k === "win", sh = w ? [0.48, 0.42, 0.1] : [0.4, 0.5, 0.1];
    P.final = { sh, names: [P.name, ...P.opp.map((o) => o.n)], win: w }; P.stage = w ? "won" : "lost"; note(P, `관리자 · ${w ? "당선" : "낙선"} 처리`); save(P); return { redraw: true, cuts: nightCuts(P) }; }
  return {};
}
