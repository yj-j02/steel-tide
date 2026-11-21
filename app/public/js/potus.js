import { careerStorage } from "./characters.js";
// 대통령 (국군통수권자): 5년 임기 20분기. 국무회의 결재·국회 법안 표결·국정 과제·외교 정상회담·NSC 위기 대응·총선·임기 평가 엔딩.
// 인물·정당은 가상이고 수치는 모두 게임용 값이다. 작전지도는 직접 지휘할 수 없고 상황도로 보고만 받는다.
import { chamberVote } from "./career-rules.js";
import { KOREA, kxy } from "./korea.js";
import { presState, PARTIES } from "./president.js";

const QK = "steeltide:potus", HK = "steeltide:potus_hall";
const rd = (k, d) => { try { return JSON.parse(careerStorage.getItem(k)) ?? d; } catch { return d; } };
const wr = (k, v) => { try { careerStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 */ } };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
const won = (n) => `${Math.round(n).toLocaleString("ko-KR")}조`;
const TERM = 20, GE_Q = 12; /* 임기 중 총선 (3년차) */

import { potusContent } from "./content/kr.js";
const { AGENDA, AG_LV, NATIONS, MINS, DOCKET, CRISES, CR_OPT, SUMMIT, CRISIS_DIALOGUE, SUMMIT_DIALOGUE } = potusContent();
export { AGENDA };

export const potusState = () => rd(QK, null);
const save = (Q) => wr(QK, Q);
const note = (Q, t) => { (Q.log ??= []).unshift(`${yq(Q.q)} · ${t}`); Q.log = Q.log.slice(0, 30); };
const yq = (q) => `${Math.floor((q - 1) / 4) + 1}년차 ${((q - 1) % 4) + 1}분기`;

/** 취임 — 선거 결과를 이어받는다 */
export function potusStart(name) {
  const P = presState() || {}, sh = P.final?.sh?.[0] ?? 0.45, pl = P.pl || {};
  const Q = { q: 1, name, party: P.party || "ind", ap: clamp(Math.round(52 + (sh - 0.4) * 80), 45, 72), eco: 50, sec: clamp(Math.round(P.g?.sec ?? 55), 40, 70), fis: 50, bud: 30,
    seats: P.party === "ind" ? 8 : Math.round(rnd(125, 165)), ag: Object.fromEntries(Object.keys(AGENDA).map((k) => [k, Math.min(2, pl[k] || 0)])), rel: { us: 60, jp: 50, cn: 50, nk: 35, eu: 55 },
    min: null, docket: [], seen: [], crisis: null, summit: null, bills: [], sup: [], log: [], flags: {}, done: false };
  note(Q, `제${hallN() + 1}대 대통령 취임 — 국정 지지율 ${Q.ap}%`); newQuarter(Q, true); save(Q); return Q;
}
const hallN = () => rd(HK, []).length + 20;
function newQuarter(Q, first) {
  Q.act = { inv: false, dip: false }; const pool = DOCKET.filter((d) => !Q.seen.includes(d[0]) && (!d[4] || d[4](Q)));
  Q.docket = []; for (let i = 0; i < 2 && pool.length; i++) { const d = pool.splice((Math.random() * pool.length) | 0, 1)[0]; Q.docket.push(d[0]); Q.seen.push(d[0]); }
  if (Q.seen.length > DOCKET.length - 3) Q.seen = Q.seen.slice(-4);
  Q.crisis = !first && Math.random() < 0.38 ? { id: pick(CRISES)[0], res: null } : null;
  Q.summit = Q.q % 3 === 1 ? pick(Object.keys(SUMMIT)) : null;
}
function fx(Q, e) {
  if (!e) return;
  if (e.ap) Q.ap += e.ap; if (e.eco) Q.eco += e.eco; if (e.sec) Q.sec += e.sec; if (e.fis) Q.fis += e.fis; if (e.bud) Q.bud += e.bud;
  for (const k of Object.keys(NATIONS)) if (e[k]) Q.rel[k] = clamp(Q.rel[k] + e[k], 0, 100);
  Q.ap = clamp(Q.ap, 3, 90); Q.eco = clamp(Q.eco, 0, 100); Q.sec = clamp(Q.sec, 0, 100); Q.fis = clamp(Q.fis, 0, 100);
}
/** 국회 표결 (재적 300) — 여당 의석 + 지지율에 따른 이탈·협조 */
function vote(Q, mode) {
  const sway = (Q.ap - 45) * 1.2 + (mode === "deal" ? 25 : mode === "push" ? -10 : 0);
  return chamberVote(300, Q.seats + sway + rnd(-12, 12));
}
const DK = (id) => DOCKET.find((d) => d[0] === id);

/* ── 화면 ── */
const bar = (v, c = "") => `<div class="mn-bar ${c}"><em style="width:${clamp(v, 0, 100)}%"></em></div>`;
function situSVG(Q) {
  const cr = Q.crisis && CRISES.find((c) => c[0] === Q.crisis.id), at = { west: [125.2, 37.7], msl: [129.8, 39.2], cyber: [127.0, 37.55], sea: [128.6, 34.0], drone: [126.9, 37.9] };
  const mk = cr ? (() => { const [x, y] = kxy(...at[cr[0]]); return `<circle cx="${x}" cy="${y}" r="26" fill="#ff6b5e" opacity=".2"/><circle class="pu" cx="${x}" cy="${y}" r="26" fill="none" stroke="#ff6b5e" stroke-width="2" style="--d:1s"/><circle cx="${x}" cy="${y}" r="5" fill="#ff6b5e"/><text x="${x}" y="${y - 32}" text-anchor="middle" class="zl">${cr[1]}</text>${Q.crisis.res ? `<text x="${x}" y="${y + 44}" text-anchor="middle" class="st" fill="${Q.crisis.res[1] === "g" ? "#5fd17a" : "#ff6b5e"}">${Q.crisis.res[0]}</text>` : ""}`; })() : "";
  const [sx, sy] = kxy(127.0, 37.55);
  return `<div class="mn-kmap"><svg viewBox="0 0 410 405" role="img" aria-label="국가 위기 상황도"><rect width="410" height="405" fill="#0b1a26"/><path d="${KOREA.cn}" fill="#2a2e33"/><path d="${KOREA.jp}" fill="#2a2e33"/><path d="${KOREA.nk}" fill="#3a2a2c"/><path d="${KOREA.kr}" fill="#24384a" stroke="#4d7590" stroke-width=".7"/><circle cx="${sx}" cy="${sy}" r="3.5" fill="#fff"/><text x="${sx + 6}" y="${sy + 4}" class="ct">대통령실</text>${mk}<text x="406" y="14" text-anchor="end" class="lg">${cr ? "위기 상황도 · 보고 전용 (직접 지휘 불가)" : "이번 분기 특이 동향 없음"}</text></svg></div>`;
}
export function potusHTML() {
  const Q = potusState(); if (!Q) return "";
  if (Q.done) return endHTML(Q);
  const pn = PARTIES[Q.party]?.n || "무소속", opp = 300 - Q.seats;
  const top = `<div class="mn-top"><div class="mt"><span>임기</span><b>${yq(Q.q)}</b>${bar((Q.q / TERM) * 100)}</div><div class="mt"><span>국정 지지율</span><b class="${Q.ap >= 50 ? "g" : Q.ap >= 35 ? "y" : "r"}">${Q.ap}%</b>${bar(Q.ap, Q.ap >= 50 ? "g" : Q.ap >= 35 ? "y" : "r")}</div><div class="mt"><span>경제</span><b>${Math.round(Q.eco)}</b>${bar(Q.eco)}</div><div class="mt"><span>안보</span><b>${Math.round(Q.sec)}</b>${bar(Q.sec)}</div><div class="mt"><span>재정 건전성</span><b>${Math.round(Q.fis)}</b>${bar(Q.fis)}</div><div class="mt"><span>재량 예산</span><b>${won(Q.bud)}</b></div><div class="mt"><span>국회</span><b>${pn} ${Q.seats} / 300</b><small>${Q.seats >= 151 ? "여대야소" : "여소야대"} · 총선 ${Q.q <= GE_Q ? `${GE_Q - Q.q + 1}분기 뒤` : "종료"}</small></div></div>`;
  const dk = Q.docket.map(DK).filter(Boolean), pend = dk.length + (Q.crisis && !Q.crisis.res ? 1 : 0) + (!Q.min ? 1 : 0) + (Q.summit && !Q.act.dip ? 1 : 0);
  const minC = !Q.min ? `<div class="mn-card mn-dk mn-paper"><div class="dh"><div class="dt"><small>대 통 령 실</small><b>국방부장관 임명</b><span>인사 검증 완료 · 후보 3명</span></div></div><p>국군통수권자로서 국방부장관을 임명하십시오. (당신이 걸어온 자리입니다.)</p>${MINS.map(([n, t, e], i) => `<button data-potus="min:${i}"><b>${n}</b><small>${t} · ${Object.entries(e).map(([k, v]) => `${k === "sec" ? "안보" : k === "budget" ? "국방 예산 효율" : NATIONS[k]?.[0]} +${v}`).join(" · ")}</small></button>`).join("")}</div>` : "";
  const crC = Q.crisis ? (() => { const c = CRISES.find((x) => x[0] === Q.crisis.id); return `<div class="mn-card mn-dk mn-nsc"><b>NSC 긴급 소집 — ${c[1]}</b><p>${c[2]}</p>${Q.crisis.res ? `<div class="dr ${Q.crisis.res[1]}">결과: <b>${Q.crisis.res[0]}</b> — ${Q.crisis.res[2]}</div>` : `<button class="mn-sc" data-potus="nsc"><b>🎬 NSC 회의 주재 ›</b><small>국군통수권자의 결단</small></button>${CR_OPT.map(([n, e], i) => `<button data-potus="cr:${i}"><b>${n}</b><small>${e}</small></button>`).join("")}`}</div>`; })() : "";
  const poBg = Q.party === "dm" ? "president_office_blue" : Q.party === "hn" ? "president_office_red" : "office";
  const left = `<div class="mn-col"><div class="pr-ban" style="--bg:url(img/bg/${poBg}.jpg)"><b>대통령 집무실</b><small>${yq(Q.q)} · 국무회의</small></div><div class="mn-h">국무회의 결재판 <small>${pend ? `${pend}건 대기` : "처리 완료"}</small></div>${minC}${crC}${dk.map(([id, t, d, o]) => `<div class="mn-card mn-dk mn-paper"><div class="dh"><div class="dt"><small>국 무 회 의</small><b>${t}</b><span>${yq(Q.q)} · 국무조정실 보고</span></div></div><p>${d}</p>${o.map(([n, e, , bill], i) => bill ? `<div class="pt-bill"><b>${n}</b><small>${e}</small><span><button data-potus="dk:${id}:${i}:deal">야당과 협상해 처리</button><button data-potus="dk:${id}:${i}:push">원안 강행</button></span></div>` : `<button data-potus="dk:${id}:${i}"><b>${n}</b><small>${e}</small></button>`).join("")}</div>`).join("")}
    <button class="mn-next" data-potus="next" ${pend ? "disabled" : ""}>${pend ? `남은 결정 ${pend}건` : Q.q >= TERM ? "임기 종료 ›" : "다음 분기 ›"}</button></div>`;
  const dipC = Q.summit ? `<div class="mn-card mn-dk"><b>정상회담 — ${NATIONS[Q.summit][0]}</b><p>${SUMMIT[Q.summit][0][0]}</p>${Q.act.dip ? `<small>회담 종료</small>` : `<button class="mn-sc" data-potus="summit"><b>🎬 회담장으로 ›</b><small>정상 공동 기자회견까지</small></button>${SUMMIT[Q.summit][0][1].map(([n, e], i) => `<button data-potus="sm:${i}"><b>${n}</b><small>${e}</small></button>`).join("")}`}</div>` : `<div class="mn-card"><small>이번 분기에는 예정된 정상회담이 없습니다.</small>${Q.act.dip ? "" : `<div class="pr-row">${Object.entries(NATIONS).map(([k, [n]]) => `<button class="pr-btn" data-potus="call:${k}">${n} 정상 통화</button>`).join("")}</div>`}</div>`;
  const mid = `<div class="mn-col mn-war"><div class="mn-h">국가 위기 관리 센터 <small>상황도는 보고 전용입니다</small></div>${situSVG(Q)}<div class="mn-h">외교</div>${dipC}<div class="mn-card">${Object.entries(NATIONS).map(([k, [n, t]]) => `<div class="pr-g"><span>${n} <small>${t}</small></span>${bar(Q.rel[k], Q.rel[k] >= 60 ? "g" : Q.rel[k] < 35 ? "r" : "y")}<b>${Q.rel[k]}</b></div>`).join("")}</div>${trend(Q)}</div>`;
  const right = `<div class="mn-col"><div class="mn-h">국정 과제 <small>분기마다 1개 투자 · 5단계</small></div>${Object.entries(AGENDA).map(([k, [n, d]]) => { const L = Q.ag[k], c = 4 + L * 2;
      return `<div class="mn-card mn-pg"><div class="ph"><b>${n} · ${d}</b><span>LV ${L}/5</span></div><div class="lvs">${AG_LV[k].map((x, i) => `<div class="${i < L ? "done" : i === L ? "next" : ""}"><i>${i + 1}</i>${x}</div>`).join("")}</div>${L < 5 ? `<button data-potus="ag:${k}" ${Q.act.inv || Q.bud < c ? "disabled" : ""}>LV ${L + 1} 추진 — ${won(c)}</button>` : `<em class="g">완성</em>`}</div>`; }).join("")}
    <div class="mn-card mn-log"><div class="mn-h">국정 기록</div>${Q.log.slice(0, 8).map((t) => `<small>${t}</small>`).join("")}</div></div>`;
  return `<div class="mn pr pt">${top}<div class="mn-body">${left}${mid}${right}</div><div class="mn-foot">국회 ${pn} ${Q.seats}석 · 야권 ${opp}석 · 법안은 재적 과반(151) 찬성이 필요합니다 · 수치는 모두 게임용 값입니다</div></div>`;
}
function trend(Q) {
  const S = Q.sup; if (S.length < 2) return "";
  const W = 300, H = 70, n = S.length, X = (i) => 20 + (i / (n - 1)) * (W - 28), Y = (v) => 6 + (1 - v / 100) * (H - 12);
  return `<div class="mn-card mn-trend"><div class="mn-h">국정 지지율 추이</div><svg viewBox="0 0 ${W} ${H}"><line x1="20" x2="${W - 8}" y1="${Y(50)}" y2="${Y(50)}" class="gl"/><path d="${S.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("")}" class="sp"/></svg></div>`;
}

export function potusClick(a) {
  const Q = potusState(); if (!Q || Q.done) return a === "replay" && Q?.done ? { cuts: endCuts(Q) } : {};
  const done = (t) => { save(Q); return { redraw: true, toast: t }; };
  if (a.startsWith("min:") && !Q.min) { const [n, t, e] = MINS[+a.slice(4)]; Q.min = n; fx(Q, { sec: e.sec || 0, us: e.us || 0, cn: e.cn || 0 }); if (e.budget) Q.bud += 4; note(Q, `국방부장관 ${n} 임명 (${t})`); return done(`국방부장관 ${n} 임명`); }
  if (a.startsWith("dk:")) { const [, id, i, mode] = a.split(":"), d = DK(id), o = d?.[3][+i]; if (!o || !Q.docket.includes(id)) return {};
    Q.docket = Q.docket.filter((x) => x !== id);
    if (o[3]) { const v = vote(Q, mode); if (mode === "push") Q.ap -= 2;
      if (v.ok) { fx(Q, o[2]); if (o[2].ag) Q.ag[o[2].ag] = Math.min(5, Q.ag[o[2].ag] + 1); note(Q, `「${d[1]}」 국회 통과 (찬성 ${v.yes} · 반대 ${v.no})`); save(Q);
        return { redraw: true, toast: `국회 통과 — 찬성 ${v.yes} / 반대 ${v.no}`, vote: v }; }
      Q.ap -= 3; note(Q, `「${d[1]}」 국회 부결 (찬성 ${v.yes} · 반대 ${v.no})`); save(Q); return { redraw: true, toast: `국회 부결 — 찬성 ${v.yes} / 반대 ${v.no}`, vote: v }; }
    fx(Q, o[2]); if (o[2].ag) Q.ag[o[2].ag] = Math.min(5, Q.ag[o[2].ag] + 1); note(Q, `「${d[1]}」 — ${o[0]}`); return done(`결재 — ${o[0]}`); }
  if (a.startsWith("ag:") && !Q.act.inv) { const k = a.slice(3), L = Q.ag[k], c = 4 + L * 2; if (L >= 5 || Q.bud < c) return {}; Q.bud -= c; Q.ag[k]++; Q.act.inv = true;
    fx(Q, { sec: k === "sec" ? 4 : 0, eco: k === "eco" ? 4 : 0, ap: k === "wel" || k === "youth" ? 2 : 1, fis: -1 }); note(Q, `국정 과제 — ${AG_LV[k][L]}`); return done(`국정 과제 추진 — ${AG_LV[k][L]}`); }
  if (a.startsWith("call:") && !Q.act.dip) { const k = a.slice(5); Q.rel[k] = clamp(Q.rel[k] + 4, 0, 100); Q.act.dip = true; note(Q, `${NATIONS[k][0]} 정상과 통화`); return done(`${NATIONS[k][0]} 정상 통화 — 관계 +4`); }
  if (a === "summit" && Q.summit && !Q.act.dip) { const [t, opts] = SUMMIT[Q.summit][0], n = NATIONS[Q.summit][0];
    const [question, ...answers] = SUMMIT_DIALOGUE[Q.summit];
    return { scene: { kind: "summit", title: `${n} 정상회담`, place: `정상회담 · ${t}`, speaker: "대통령", questions: [{ who: `${n} 정상`, q: question, opts: opts.map(([x, e], i) => [x, e, answers[i]]) }], pick: (qi, ai) => potusClick(`sm:${ai}`) } }; }
  if (a.startsWith("sm:") && Q.summit && !Q.act.dip) { const o = SUMMIT[Q.summit][0][1][+a.slice(3)]; fx(Q, o[2]); Q.act.dip = true; note(Q, `${NATIONS[Q.summit][0]} 정상회담 — ${o[0]}`); return done(`정상회담 — ${o[0]}`); }
  if (a === "nsc" && Q.crisis && !Q.crisis.res) { const c = CRISES.find((x) => x[0] === Q.crisis.id);
    const [question, ...answers] = CRISIS_DIALOGUE[c[0]];
    return { scene: { kind: "nsc", title: c[1], place: "국가안전보장회의 · 대통령 주재", speaker: "대통령", questions: [{ who: `국방부장관 ${Q.min || ""}`, q: `${c[2]} ${question}`, opts: CR_OPT.map(([x, e], i) => [x, e, answers[i]]) }], pick: (qi, ai) => potusClick(`cr:${ai}`) } }; }
  if (a.startsWith("cr:") && Q.crisis && !Q.crisis.res) { const i = +a.slice(3), p = clamp(0.45 + Q.ag.sec * 0.07 + (Q.sec - 50) / 200 + (Q.rel.us - 50) / 300, 0.15, 0.92), ok = Math.random() < p;
    const R = [ok ? ["격퇴 성공", "g", "적 도발을 비례적으로 제압했습니다.", { sec: 6, ap: 5 }] : ["대응 실패", "r", "피해가 커졌고 대응이 늦었다는 비판이 나옵니다.", { sec: -6, ap: -7 }],
      ["외교 압박", "g", "동맹과 공동 성명을 내고 국제 공조를 이끌었습니다.", { us: 5, nk: -6, sec: 2, ap: 1 }], ["상황 관리", ok ? "g" : "r", ok ? "확전 없이 상황이 진정됐습니다." : "소극적 대응이라는 비판이 큽니다.", ok ? { eco: 1, ap: 1 } : { ap: -4, sec: -3 }]][i];
    fx(Q, R[3]); Q.crisis.res = R.slice(0, 3); note(Q, `NSC — ${CRISES.find((x) => x[0] === Q.crisis.id)[1]}: ${R[0]}`); save(Q); return { redraw: true, toast: `NSC 결과 — ${R[0]}`, crisis: R }; }
  if (a === "next") {
    if (Q.docket.length || !Q.min || (Q.crisis && !Q.crisis.res) || (Q.summit && !Q.act.dip)) return {};
    /* 분기 정산: 과제·경제·관계가 지지율을 움직이고, 시간이 지날수록 지지율은 내려간다 */
    const ecoD = (Q.ag.eco - 2) * 0.7 + (Q.rel.cn - 50) / 50 + (Q.rel.us - 50) / 70 + (Q.fis - 50) / 60 + rnd(-3, 2) - (Q.eco - 50) * 0.2, secD = (Q.ag.sec - 2) * 0.6 + (Q.rel.us - 50) / 60 + (Q.rel.nk - 40) / 80 + rnd(-2, 1.5) - (Q.sec - 50) * 0.2;
    Q.eco = clamp(Q.eco + ecoD, 0, 100); Q.sec = clamp(Q.sec + secD, 0, 100);
    Q.ap = clamp(Math.round(Q.ap + (Q.eco - 50) / 14 + (Q.sec - 50) / 24 - (Q.q <= 4 ? 1 : Q.q >= 16 ? 2.5 : 1.8) - (Q.ap - 45) * 0.08 + rnd(-1.5, 1.5)), 3, 90);
    Q.bud += 6 + Math.round((Q.eco - 50) / 10) + Math.round((Q.fis - 50) / 20); Q.sup.push(Q.ap);
    if (Q.q === GE_Q) { const before = Q.seats; Q.seats = Q.party === "ind" ? Math.round(clamp(8 + (Q.ap - 40) * 1.5, 0, 60)) : Math.round(clamp(150 + (Q.ap - 42) * 3.2 + rnd(-10, 10), 70, 220)); note(Q, `총선 — 여당 ${before}석 → ${Q.seats}석`); Q.flags.ge = [before, Q.seats]; }
    if (Q.ap < 15) Q.flags.low = (Q.flags.low || 0) + 1; else Q.flags.low = 0;
    if (Q.flags.low >= 3 && 300 - Q.seats >= 200) { Q.done = true; Q.end = "imp"; save(Q); return { redraw: true, cuts: endCuts(Q) }; }
    Q.q++; if (Q.q > TERM) { Q.q = TERM; Q.done = true; Q.end = grade(Q); hallAdd(Q); save(Q); return { redraw: true, cuts: endCuts(Q) }; }
    newQuarter(Q); save(Q); return { redraw: true, toast: `${yq(Q.q)}${Q.flags.ge && Q.q === GE_Q + 1 ? ` · 총선 결과 여당 ${Q.seats}석` : ""}`, ge: Q.q === GE_Q + 1 ? Q.flags.ge : null };
  }
  return {};
}
const avgAp = (Q) => Math.round(Q.sup.reduce((a, b) => a + b, 0) / Math.max(1, Q.sup.length));
const legacy = (Q) => Object.values(Q.ag).reduce((a, b) => a + b, 0);
function grade(Q) { const s = avgAp(Q) + legacy(Q) * 0.8 + (Q.eco - 50) / 2 + (Q.sec - 50) / 2 + (Q.ap - 40) / 2; return s >= 92 ? "great" : s >= 78 ? "good" : s >= 60 ? "plain" : "lame"; }
const ENDS = { great: ["성공한 대통령", "퇴임 후에도 국민의 존경을 받는 대통령으로 기억됩니다."], good: ["안정적인 국정 운영", "큰 위기 없이 나라를 다음 정부에 넘겼습니다."], plain: ["평가가 엇갈리는 대통령", "성과와 아쉬움이 함께 남은 5년이었습니다."], lame: ["레임덕 속 퇴임", "임기 말 지지율이 바닥을 쳤습니다."], imp: ["국회 탄핵 소추", "국정 지지율 붕괴와 여소야대 속에 국회가 탄핵 소추안을 가결했습니다. (게임 엔딩)"] };
function hallAdd(Q) { const H = rd(HK, []); H.unshift({ name: Q.name, end: Q.end, ap: avgAp(Q), lg: legacy(Q), at: new Date().toLocaleDateString("ko-KR") }); wr(HK, H.slice(0, 20)); }
function endHTML(Q) {
  const [t, d] = ENDS[Q.end] || ENDS.plain, H = rd(HK, []);
  return `<div class="mn pr pt"><div class="mn-ret"><div class="mn-card big"><h3>${t}</h3><p>${Q.name} 대통령 · ${d}</p><div class="kv"><span>평균 국정 지지율</span><b>${avgAp(Q)}%</b></div><div class="kv"><span>국정 과제 달성</span><b>${legacy(Q)} / 25 단계</b></div><div class="kv"><span>경제 · 안보</span><b>${Math.round(Q.eco)} · ${Math.round(Q.sec)}</b></div><div class="kv"><span>외교 관계</span><b>${Object.entries(NATIONS).map(([k, [n]]) => `${n} ${Q.rel[k]}`).join(" · ")}</b></div><button class="mn-rp" data-potus="replay">🎬 퇴임 연출 다시 보기</button><small>국방부 집무실(퇴임 화면)에서 2회차를 시작할 수 있습니다.</small></div>
    <div class="mn-card"><div class="mn-h">역대 대통령 기록</div>${H.map((h) => `<div class="hl ok"><b>${h.name}</b><span>${h.at}</span><small>${ENDS[h.end]?.[0] || ""} · 평균 지지율 ${h.ap}% · 과제 ${h.lg}단계</small></div>`).join("") || "<small>기록 없음</small>"}</div></div></div>`;
}
export function endCuts(Q) {
  const [t, d] = ENDS[Q.end] || ENDS.plain, imp = Q.end === "imp";
  const card = `<h4>${t}</h4><div><span>평균 국정 지지율</span><b>${avgAp(Q)}%</b></div><div><span>국정 과제</span><b>${legacy(Q)} / 25</b></div><div><span>경제 · 안보</span><b>${Math.round(Q.eco)} · ${Math.round(Q.sec)}</b></div>`;
  return imp ? [
    { img: "assembly", f: [0.5, 0.45, 1.1], who: "국회의장", text: "대통령 탄핵 소추안이 가결되었음을 선포합니다." },
    { img: "president_office", fb: "office", f: [0.5, 0.5, 1.1], who: "", text: "직무가 정지된 대통령실은 조용합니다.", card },
  ] : [
    { img: "president_office", fb: "office", f: [0.5, 0.5, 1.1], to: [0.5, 0.5, 1.02], who: "", text: "5년의 임기가 끝나 갑니다. 마지막 국무회의를 마쳤습니다." },
    { img: "address", fb: "press_minister", f: [0.53, 0.36, 1.6], flash: 3, who: `대통령 ${Q.name}`, text: Q.end === "great" || Q.end === "good" ? "국민 여러분과 함께한 5년이 제 인생의 가장 큰 영광이었습니다." : "부족했던 점은 모두 저의 책임입니다. 다음 정부가 잘 이어 가기를 바랍니다." },
    { img: "inauguration", fb: "ceremony", f: [0.5, 0.5, 1.05], who: "", text: `후임 대통령의 취임식. 당신은 단상에서 내려와 박수를 보냅니다. ${d}`, card },
    { img: "study", fb: "office", f: [0.35, 0.5, 1.2], who: "", text: "소위로 임관했던 그날부터 대통령 퇴임까지 — 당신의 이야기가 기록되었습니다.", cls: "a" },
  ];
}
export const potusTitle = () => { const Q = potusState(); return Q ? (Q.done ? `전 대통령 · ${ENDS[Q.end]?.[0] || ""}` : `대통령 · ${yq(Q.q)}`) : null; };

/** 관리자 시험 기능 */
export function potusAdmin(k) {
  const Q = potusState(); if (!Q) return {}; const done = (t) => { save(Q); return { redraw: true, toast: `관리자 · ${t}` }; };
  if (k === "ap") { Q.ap = clamp(Q.ap + 15, 3, 90); return done("지지율 +15"); }
  if (k === "apd") { Q.ap = clamp(Q.ap - 15, 3, 90); return done("지지율 −15"); }
  if (k === "bud") { Q.bud += 30; return done("재량 예산 +30조"); }
  if (k === "seats") { Q.seats = Q.seats >= 151 ? 120 : 180; return done(`여당 ${Q.seats}석으로 변경`); }
  if (k === "crisis") { Q.crisis = { id: pick(CRISES)[0], res: null }; return done("NSC 위기 발생"); }
  if (k === "summit") { Q.summit = pick(Object.keys(SUMMIT)); Q.act.dip = false; return done("정상회담 일정 추가"); }
  if (k === "skip4") { if (!Q.min) Q.min = MINS[0][0]; for (let i = 0; i < 4 && Q.q < TERM; i++) { Q.sup.push(Q.ap); Q.q++; } if (Q.q > GE_Q && !Q.flags.ge) Q.flags.ge = [Q.seats, Q.seats]; newQuarter(Q); return done(`4분기 건너뜀 → ${yq(Q.q)}`); }
  if (k === "end" || k === "imp") { if (k === "imp") { Q.end = "imp"; } else { if (!Q.sup.length) Q.sup.push(Q.ap); Q.end = grade(Q); hallAdd(Q); } Q.done = true; save(Q); return { redraw: true, cuts: endCuts(Q) }; }
  if (k === "reset") { careerStorage.removeItem(QK); return { redraw: true, toast: "관리자 · 대통령 기록 초기화" }; }
  return {};
}
