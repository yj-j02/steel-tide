// 인맥 & 인간 드라마: 직속 상관(평정권자) 성향, 동기 인터랙션 이벤트, 우호 동기 참모 시너지, 장군 회고록(Chronicle) & PNG 저장.
import { isUS, serviceOf, normBranch, careerTitle, curServices, curBranches } from "./staff.js";
import { usNpcName, koreanUsRanks } from "./us-ranks.js";
import { koreanPostName } from "./us-post-labels.js";
import { careerDate } from "./service-calendar.js";

const fmtPost = (title) => (title && isUS() && koreanUsRanks() ? koreanPostName(title) : title || "");

export const BOSS_STYLES = {
  strict: {
    k: "strict", n: "원칙주의", en: "By-the-Book", color: "#72ace8",
    hint: "교범·균형 결재 시 평정 +4 · 솔직 보고 시 평판 +3 / 무리수 차질 시 엄격 감점",
  },
  bold: {
    k: "bold", n: "성과주의", en: "Results-Driven", color: "#ff9b5e",
    hint: "강경·적극 성공 시 평정 +5 / 보수·소극 회피 시 평정 −3",
  },
  safe: {
    k: "safe", n: "안전제일", en: "Safety-First", color: "#8ef07a",
    hint: "보수·안전 결재 시 평정 +5 · 사기 +2 / 강경 차질 시 평판 추가 감점",
  },
};

const KR_BOSS_NM = ["정승호", "최영철", "강민석", "윤재훈", "박성진", "한동우", "오태식", "서진우", "임현수", "장기훈"];
const BOSS_KEYS = ["strict", "bold", "safe"];

/** Deterministic immediate superior (rater) for the player's current rank & service. */
export function bossFor(grade, svc) {
  const g = Math.max(0, Math.min(9, grade | 0));
  const us = isUS();
  const seed = `${us ? "us" : "kr"}:${svc}:${g}`;
  let h = 17;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const styleKey = BOSS_KEYS[h % BOSS_KEYS.length];
  const style = BOSS_STYLES[styleKey];
  const nm = us ? usNpcName("boss_" + seed) : KR_BOSS_NM[h % KR_BOSS_NM.length];
  const krTitle = g <= 1 ? "중대장 · 직속 상관" : g === 2 ? "대대장 · 직속 상관" : g <= 4 ? "연대·여단장 · 평정권자" : g === 5 ? "사단·함대사령관 · 평정권자" : g <= 7 ? "군단·작전사령관 · 상급자" : g === 8 ? "각 군 참모총장 · 상급자" : "국방부장관 · 제청권자";
  const usTitle = g <= 1 ? "Company / Ship CO (Rater)" : g === 2 ? "Battalion / Sq CO (Rater)" : g <= 4 ? "Brigade / Wing CO (Rater)" : g === 5 ? "Division / Fleet CG (Rater)" : g <= 7 ? "Corps / Theater CG" : g === 8 ? "Service Chief / VCJCS" : "Secretary of Defense";
  return { name: nm, title: us ? usTitle : krTitle, style };
}

/** Apply immediate superior's personality modifier to a duty resolution. */
export function bossMod(grade, svc, optIdx, backfired) {
  const b = bossFor(grade, svc);
  const k = b.style.k;
  let dScore = 0, dMorale = 0, dRep = 0, note = "";
  if (k === "strict") {
    if (optIdx === 1) { dScore = 4; note = `상관(${b.style.n}) 호평 +4`; }
    else if (optIdx === 0 && backfired) { dScore = -4; dRep = -2; note = `상관(${b.style.n}) 무리수 질책`; }
  } else if (k === "bold") {
    if (optIdx === 0 && !backfired) { dScore = 5; note = `상관(${b.style.n}) 성과 극찬 +5`; }
    else if (optIdx === 2) { dScore = -3; note = `상관(${b.style.n}) 소극 대응 감점 −3`; }
  } else if (k === "safe") {
    if (optIdx === 2) { dScore = 5; dMorale = 2; note = `상관(${b.style.n}) 안전 우선 호평 +5`; }
    else if (optIdx === 0 && backfired) { dRep = -3; note = `상관(${b.style.n}) 안전사고 문책`; }
  }
  return { dScore, dMorale, dRep, note, boss: b };
}

export const RIVAL_EVENTS = [
  {
    id: "rv_budget",
    title: "동기 부대 훈련 예산·장비 공조 요청",
    desc: (nm, post) => `${nm}(${post})가 이번 연합훈련을 앞두고 예비 장비와 훈련 지원 인력 협조를 비공식 요청해 왔습니다.`,
    opts: [
      { l: "가용 장비·인력 적극 지원", d: "동기 관계도 +16 · 군내 평판 +3 · 부대 사기 −2", rel: 16, rep: 3, mor: -2, xp: 140, hl: (nm) => `동기 ${nm} 부대 전폭 지원 — 끈끈한 전우애 화제` },
      { l: "훈련 일정 범위 내 조건부 공조", d: "동기 관계도 +8 · 균형 잡힌 협조", rel: 8, rep: 1, mor: 0, xp: 110, hl: (nm) => `동기 ${nm}와 합리적 부대 공조 마무리` },
      { l: "내 부대 정비 우선 — 정중히 거절", d: "동기 관계도 −12 · 경험치 +180 · 자체 전력 집중", rel: -12, rep: 0, mor: 2, xp: 180, hl: (nm) => `동기 ${nm}의 지원 요청 거절 — 자체 대비태세 우선` },
    ],
  },
  {
    id: "rv_brief",
    title: "상급부대 합동 브리핑 공로 배분",
    desc: (nm, post) => `${nm}(${post})와 공동 준비한 작전계획안이 상급부대 브리핑에서 큰 호평을 받았습니다. 보고서에 기여도를 어떻게 올리시겠습니까?`,
    opts: [
      { l: "동기와 공동 기획 공로로 공식 보고", d: "동기 관계도 +15 · 군내 평판 +4", rel: 15, rep: 4, mor: 1, xp: 130, hl: (nm) => `동기 ${nm}와 공동 작전안 호평 — 군내 신망 상승` },
      { l: "핵심 성과는 내 부대 주도라고 강조", d: "동기 관계도 −14 · 경험치 +200 · 단기 성과 집중", rel: -14, rep: -1, mor: 0, xp: 200, hl: (nm) => `합동 브리핑 공로 독점 논란 — 동기 ${nm}와 냉기류` },
      { l: "양 부대 실무 장교 전원에게 공로 돌림", d: "동기 관계도 +7 · 부대 사기 +4 · 평판 +2", rel: 7, rep: 2, mor: 4, xp: 120, hl: (nm) => `실무진 전원 포상 건의 — 부대 사기 크게 상승` },
    ],
  },
  {
    id: "rv_rec",
    title: "동기 진급 심사 현장 평가 의견 조회",
    desc: (nm, post) => `인사 참모부에서 차기 진급 심사를 앞둔 ${nm}(${post})의 평소 지휘 역량에 대한 동료 참고 의견을 비공식 문의해 왔습니다.`,
    opts: [
      { l: "탁월한 지휘관이라며 적극 추천", d: "동기 관계도 +18 · 군내 평판 +3", rel: 18, rep: 3, mor: 1, xp: 120, hl: (nm) => `동기 ${nm} 진급 심사 적극 추천 — 깊은 신뢰 형성` },
      { l: "장단점을 객관적·중립적으로 전달", d: "동기 관계도 +3 · 군내 평판 +2", rel: 3, rep: 2, mor: 0, xp: 130, hl: (nm) => `동기 ${nm}에 대한 공정한 동료 평가 제출` },
      { l: "경쟁자 견제 — 현장 미흡점을 부각", d: "동기 관계도 −16 · 평판 −2 · 경험치 +160", rel: -16, rep: -2, mor: 0, xp: 160, hl: (nm) => `인사 검증 과정서 동기 ${nm}와 치열한 신경전` },
    ],
  },
  {
    id: "rv_flank",
    title: "인접 구역 야전 위기 측면 지원 요청",
    desc: (nm, post) => `인접 작전 구역을 맡은 ${nm}(${post}) 부대에서 장비 고장이 겹쳐 긴급 예비 정비반 파견을 요청했습니다.`,
    opts: [
      { l: "즉각 예비 정비반·장비 긴급 파견", d: "동기 관계도 +18 · 군내 평판 +5 · 사기 −2", rel: 18, rep: 5, mor: -2, xp: 160, hl: (nm) => `동기 ${nm} 부대 위기 신속 구원 — 상급부대 극찬` },
      { l: "최소 인원만 파견해 부분 지원", d: "동기 관계도 +8 · 군내 평판 +2", rel: 8, rep: 2, mor: 0, xp: 120, hl: (nm) => `인접 구역 동기 ${nm} 부대 부분 지원 완료` },
      { l: "관할 구역 외 사유로 파견 불가 통보", d: "동기 관계도 −15 · 부대 사기 +2", rel: -15, rep: -1, mor: 2, xp: 110, hl: (nm) => `인접 부대 지원 거절 — 동기 ${nm}와 갈등 심화` },
    ],
  },
];

export function relLabel(rel = 50) {
  if (rel >= 75) return { t: "🤝 핵심 우군", cls: "g" };
  if (rel >= 40) return { t: "⚖️ 선의의 경쟁", cls: "y" };
  return { t: "⚔️ 치열한 라이벌", cls: "r" };
}

/** Count allied classmates (rel >= 75) who provide command synergy at senior ranks. */
export function allyBonus(rivals = [], grade = 0) {
  const allies = (rivals || []).filter((r) => (r.rel ?? 50) >= 75).length;
  return {
    allies,
    crisisWinBonus: allies * 4,
    repBonus: grade >= 6 ? allies : 0,
  };
}

/** Generate rival epilogues for the Career Chronicle. */
export function rivalEpilogues(rivals = [], rankLabelFn) {
  const us = isUS();
  return (rivals || []).map((r, ri) => {
    const nm = us ? usNpcName(r.name + ri) : r.name;
    const rel = r.rel ?? 50;
    const post = r.retired ? (r.retiredPost || "예비역 · 방산·안보 자문위원") : fmtPost(r.post || careerTitle(r.g, r.br));
    const rk = r.retired ? `예비역 ${rankLabelFn(r.g)}` : rankLabelFn(r.g);
    const routeTag = r.style || "야전 지휘관";
    const bond = r.retired
      ? (r.retiredNote || (rel >= 75
          ? "전역 후 방산·안보 연구계로 진출해 국방 개혁의 든든한 민간 후원자가 되었습니다."
          : "중견 장교로 명예 전역한 뒤 민간 산업계에서 제2의 인생을 개척했습니다."))
      : rel >= 75
        ? "평생의 전우이자 핵심 우군으로 남아 국방 개혁과 안보 정책을 함께 이끌었습니다."
        : rel >= 40
          ? "선의의 경쟁을 펼친 동기로서 각자의 자리에서 군의 중추 역할을 완수했습니다."
          : "임관부터 전역까지 치열한 진급 경쟁을 벌인 숙명의 라이벌로 군사에 기록됐습니다.";
    return { name: nm, rank: rk, post, rel, routeTag, bond };
  });
}

function logServiceLabel(e, idx) {
  if (e?.serviceDate) return e.serviceDate;
  if (e?.turn != null) return careerDate(e.turn);
  return `복무 ${Math.max(1, idx + 1)}년차`;
}

/** Build a visual SVG comparing the classic single-branch route vs. the player's actual rotation/branch-switching path. */
export function careerPathHTML({ log = [], grade = 0, initBranchName = "", curBranchName = "", rankLabelFn, tours = {} }) {
  const maxG = Math.max(2, Math.min(10, grade));
  const byGrade = new Map();
  let switches = 0, prevB = null;
  for (const e of log) {
    if (e.g == null) continue;
    const bName = e.b || initBranchName;
    if (prevB && bName && bName !== prevB) switches++;
    if (bName) prevB = bName;
    byGrade.set(e.g, { post: e.t, branch: bName, shifted: Boolean(initBranchName && bName && bName !== initBranchName) });
  }
  const baseBranch = log.find((e) => e.b)?.b || initBranchName || curBranchName || "임관 병과";
  const nodes = [];
  for (let r = 0; r <= maxG; r++) {
    const rec = byGrade.get(r);
    const branch = rec?.branch || (r === grade ? curBranchName : baseBranch);
    const shifted = Boolean(baseBranch && branch && branch !== baseBranch);
    nodes.push({ r, label: rankLabelFn(r), post: rec?.post || "", branch, shifted, cur: r === grade });
  }

  const W = Math.max(560, nodes.length * 84), H = 136, padX = 44;
  const stepX = nodes.length > 1 ? (W - padX * 2) / (nodes.length - 1) : 0;
  const yStd = 42, yRot = 94;

  const stdLine = `<line x1="${padX}" y1="${yStd}" x2="${padX + stepX * (nodes.length - 1)}" y2="${yStd}" stroke="rgba(126,184,232,.35)" stroke-width="2" stroke-dasharray="5 4"/>`;
  const pathSegs = nodes.slice(0, -1).map((n, i) => {
    const nx = nodes[i + 1];
    const x1 = padX + i * stepX, y1 = n.shifted ? yRot : yStd;
    const x2 = padX + (i + 1) * stepX, y2 = nx.shifted ? yRot : yStd;
    const changed = n.shifted !== nx.shifted || n.branch !== nx.branch;
    const stroke = changed ? "#f59e42" : n.shifted ? "#b084f5" : "#4cd97b";
    return `<path d="M${x1} ${y1} C${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="2.8"/>`;
  }).join("");

  const dots = nodes.map((n, i) => {
    const x = padX + i * stepX, y = n.shifted ? yRot : yStd;
    const fill = n.cur ? "#f2ca5c" : n.shifted ? "#b084f5" : "#4cd97b";
    return `<g>
      ${n.cur ? `<circle cx="${x}" cy="${y}" r="11" fill="rgba(242,202,92,.24)"/>` : ""}
      <circle cx="${x}" cy="${y}" r="${n.cur ? 6.5 : 5}" fill="${fill}" stroke="#0d1520" stroke-width="1.6"/>
      <text x="${x}" y="${y - 11}" text-anchor="middle" font-size="10" fill="${n.cur ? "#ffe28a" : "#d8e7f4"}" font-weight="${n.cur ? 800 : 600}">${n.label}</text>
      <text x="${x}" y="${y + 18}" text-anchor="middle" font-size="9" fill="${n.shifted ? "#d8bcff" : "#97b4c9"}">${fmtPost(n.branch || "").slice(0, 8)}</text>
    </g>`;
  }).join("");

  const archetype = switches === 0
    ? { tag: "🏛️ 정통 단일 병과 라인", desc: "임관 병과를 흔들림 없이 고수한 정석 야전·전문가 경로입니다.", color: "#4cd97b" }
    : switches <= 2
      ? { tag: "⚔️ 야전·합동 균형 엘리트", desc: "현장 지휘와 타 병과·정책 보직을 전략적으로 결합한 균형 경로입니다.", color: "#f2ca5c" }
      : { tag: "🌐 다병과 순환 제너럴리스트", desc: "여러 병과와 기능 보직을 폭넓게 섭렵한 올라운드 순환 경로입니다.", color: "#c29bff" };

  const synergyOk = Boolean(tours?.cmd && tours?.joint);
  return `<div class="mn-card" style="text-align:left;border-color:rgba(114,172,232,.45);background:rgba(11,19,29,.9);padding:14px 16px;margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
      <div><b style="color:#fff;font-size:13.5px">🗺️ 커리어 보직 경로도 (정석 라인 vs 전과·순환 루트)</b><div style="font-size:11.5px;color:#9eb9cd;margin-top:2px">${archetype.desc}</div></div>
      <span style="padding:3px 10px;border-radius:99px;font-size:11px;font-weight:800;background:rgba(255,255,255,.07);border:1px solid ${archetype.color};color:${archetype.color}">${archetype.tag} · 전과 ${switches}회</span>
    </div>
    <div style="overflow-x:auto">
      <svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:520px;background:#071019;border:1px solid #1f3348;border-radius:8px">
        <text x="12" y="${yStd + 4}" font-size="9.5" fill="#7eb8e8" font-weight="700">정석</text>
        <text x="12" y="${yRot + 4}" font-size="9.5" fill="#c29bff" font-weight="700">순환</text>
        ${stdLine}${pathSegs}${dots}
      </svg>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;font-size:11px;color:#b8cfe0">
      <span>🟢 상단 실선: 임관 병과 정석 유지 (${fmtPost(baseBranch)})</span>
      <span>🟣 하단 분기: 타 병과·합동 트랙 전과/순환</span>
      <span style="color:${synergyOk ? "#8ef07a" : "#95aec2"}">${synergyOk ? "✔ 야전·합동 균형 경력 충족 (진급심사 +5점)" : "○ 야전+합동 병행 시 진급심사 +5점 가점"}</span>
    </div>
  </div>`;
}

/** Filter timeline down to at most 3 truly historic turning-point decisions (no routine weekly reports / TMI). */
function pickMajorDecisions(timeline = []) {
  const major = (timeline || []).filter((ev) => {
    const t = String(ev?.title || "");
    if (/상부 결과 보고/.test(t)) return false;
    return /\[.*\]|워룸|전면전|아크/.test(t) || ev.score >= 95 || (ev.score != null && ev.score <= 55);
  });
  return major.slice(-3).reverse();
}

/** Summarize how the player's choices (rotations, education, board results, major turning points, classmate ties) impacted their career. */
export function decisionImpactHTML({ log = [], timeline = [], boardHistory = [], rivals = [], tours = {}, grade = 0 }) {
  const ab = allyBonus(rivals, grade);
  const passedCount = boardHistory.filter((b) => b.passed).length;
  const topContrib = boardHistory.length ? boardHistory[boardHistory.length - 1]?.contribution : null;
  const pills = [
    tours?.cmd && tours?.joint
      ? { ok: true, t: "야전·합동 균형 경력 (+5점)" }
      : { ok: false, t: "단일 트랙 집중" },
    tours?.edu
      ? { ok: true, t: "고등군사교육 이수 (+3~6점)" }
      : { ok: false, t: "고등군사교육 미이수" },
    ab.allies > 0
      ? { ok: true, t: `우군 동기 ${ab.allies}명 (위기 +${ab.crisisWinBonus}%)` }
      : { ok: false, t: "우군 동기 미확보" },
    boardHistory.length
      ? { ok: true, t: `정기심사 ${passedCount}/${boardHistory.length}회 통과${topContrib ? ` · ${topContrib[0]}` : ""}` }
      : { ok: false, t: "정기심사 기록 대기" },
  ];

  const keyDecisions = pickMajorDecisions(timeline).map((ev) => {
    const sc = ev.score != null ? `<b style="color:${ev.score >= 85 ? "#8ef07a" : "#ff9485"}">${ev.score}점</b>` : "";
    return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:rgba(255,255,255,.035);border-left:3px solid ${ev.score >= 85 ? "#8ef07a" : "#ff8e80"};font-size:11.5px">
      <span style="color:#dce9f5"><b>${ev.date || ""}</b> · ${ev.title} <small style="color:#f2d88f">(${ev.choice})</small></span>${sc}
    </div>`;
  }).join("");

  return `<div style="margin-bottom:14px">
    <b style="color:#8ef07a;font-size:12.5px">🔎 커리어 핵심 영향 요약</b>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:7px 0 ${keyDecisions ? "8px" : "0"}">${pills.map((p) => `<span style="font-size:11px;padding:3px 9px;border-radius:99px;background:${p.ok ? "rgba(76,217,123,.12)" : "rgba(255,255,255,.05)"};border:1px solid ${p.ok ? "rgba(76,217,123,.4)" : "rgba(255,255,255,.14)"};color:${p.ok ? "#a8f7bf" : "#9ab2c4"}">${p.ok ? "✔ " : "• "}${p.t}</span>`).join("")}</div>
    ${keyDecisions ? `<div style="display:flex;flex-direction:column;gap:5px">${keyDecisions}</div>` : ""}
  </div>`;
}

/** Render a gallery of every rank uniform portrait worn from commissioning (0) up to current/final grade. */
export function uniformGalleryHTML({ grade = 0, log = [], rankLabelFn, portraitFn }) {
  if (!portraitFn) return "";
  const maxG = Math.max(0, Math.min(10, grade | 0));
  const byGrade = new Map();
  for (const e of log) {
    if (e.g != null) byGrade.set(e.g, e);
  }
  const cards = [];
  for (let r = 0; r <= maxG; r++) {
    const rec = byGrade.get(r);
    const svg = portraitFn(r);
    const postTxt = rec?.t ? fmtPost(rec.t) : "";
    const yrTxt = rec ? logServiceLabel(rec, r) : "";
    cards.push(`<button type="button" class="chron-uni-card" data-uni-rank="${r}" title="클릭하여 정복 확대 보기" style="background:rgba(12,20,30,.85);border:1px solid ${r === maxG ? "#f2ca5c" : "rgba(114,172,232,.32)"};border-radius:8px;padding:7px;text-align:center;cursor:pointer;color:#eaf2fa;width:118px;flex:0 0 auto">
      <div style="width:102px;height:102px;margin:0 auto 5px;border-radius:6px;overflow:hidden;border:1px solid rgba(242,202,92,.35)">${svg.replace(/width="300" height="300"/, 'width="102" height="102"')}</div>
      <div style="font-size:11.5px;font-weight:800;color:${r === maxG ? "#ffe082" : "#fff"}">${rankLabelFn(r)}</div>
      ${postTxt ? `<div style="font-size:10px;color:#9fc5e2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px">${postTxt}</div>` : ""}
      ${yrTxt ? `<div style="font-size:9.5px;color:#7f9db3;margin-top:1px">${yrTxt}</div>` : ""}
    </button>`);
  }
  return `<div style="margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
      <b style="color:#f2ca5c;font-size:12.5px">🎖️ 계급별 정복 초상 갤러리 (${maxG + 1}계급 · 클릭 시 확대)</b>
      <small style="color:#8faec0;font-size:11px">소위부터 현재까지 착용한 정복·계급장·노화 변화</small>
    </div>
    <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px">${cards.join("")}</div>
  </div>`;
}

/** Build the Career Chronicle (장군 회고록) HTML for endings and 인사기록 modal. */
export function chronicleHTML({ cmdrName, grade, rankName, post, svcName, branchName, initBranchName = "", week, medalsCount, log = [], rivals = [], timeline = [], boardHistory = [], tours = {}, rankLabelFn, portraitFn = null, chapterLabel }) {
  const ep = rivalEpilogues(rivals, rankLabelFn);
  const milestones = log.slice(-12).map((e, idx) => `<li><b>${logServiceLabel(e, idx)}</b> · ${rankLabelFn(e.g)} · ${fmtPost(e.t)}${e.why && !["임관", "보직 변경"].includes(e.why) ? ` <small>(${e.why})</small>` : ""}</li>`).join("") || "<li>임관 기록 준비 중</li>";
  const uniBox = uniformGalleryHTML({ grade, log, rankLabelFn, portraitFn });
  const pathBox = careerPathHTML({ log, grade, initBranchName: initBranchName || log[0]?.b || branchName, curBranchName: branchName, rankLabelFn, tours });
  const impactBox = decisionImpactHTML({ log, timeline, boardHistory, rivals, tours, grade });
  return `<div class="mn-card" style="text-align:left;border-color:#f2ca5c;background:rgba(16,22,30,.92);padding:18px 20px;min-width:0;max-width:100%;box-sizing:border-box;overflow:hidden">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(242,202,92,.35);padding-bottom:10px;margin-bottom:12px">
      <div><small style="color:#f2ca5c;letter-spacing:.14em;font-weight:700">THE GENERAL · CAREER CHRONICLE</small><h3 style="margin:3px 0 0;color:#fff;font-size:19px">📜 ${cmdrName} 회고록</h3></div>
      <button class="mn-go" data-chron="png" style="width:auto;padding:8px 14px;font-size:12px">🖼 전체 회고록 PNG 저장</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;font-size:12px">
      <div style="padding:8px;background:rgba(255,255,255,.04);border-radius:6px"><small style="color:#8faec0;display:block">최종 계급·직책</small><b>${rankName} · ${post}</b></div>
      <div style="padding:8px;background:rgba(255,255,255,.04);border-radius:6px"><small style="color:#8faec0;display:block">소속 · 병과</small><b>${svcName} · ${branchName}</b></div>
      <div style="padding:8px;background:rgba(255,255,255,.04);border-radius:6px"><small style="color:#8faec0;display:block">복무 기간</small><b>${careerDate(week)} (${week}안건)</b></div>
      <div style="padding:8px;background:rgba(255,255,255,.04);border-radius:6px"><small style="color:#8faec0;display:block">훈장 · 최종 단계</small><b>${medalsCount}/10 · ${chapterLabel}</b></div>
    </div>
    ${uniBox}
    ${pathBox}
    ${impactBox}
    <div style="margin-bottom:12px"><b style="color:#f2ca5c;font-size:12.5px">📌 주요 복무 연대기</b><ul style="margin:6px 0 0;padding-left:18px;font-size:12px;color:#d6e4ee;line-height:1.65">${milestones}</ul></div>
    <div><b style="color:#72ace8;font-size:12.5px">👥 ${isUS() ? "사관학교 동기 후일담" : "임관 동기 후일담"} (${ep.length}명)</b>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;margin-top:6px">${ep.map((x) => `<div style="padding:9px 10px;border-radius:7px;background:rgba(30,58,86,.32);border:1px solid rgba(114,172,232,.3);font-size:11.5px"><b style="color:#fff">${x.rank} ${x.name}</b> <span style="font-size:10px;padding:1px 5px;border-radius:4px;background:rgba(242,202,92,.14);color:#f2ca5c">${x.routeTag}</span><br><small style="color:#9ec5e6">${x.post} · 관계도 ${x.rel}</small><p style="margin:4px 0 0;color:#c8dbe8;line-height:1.45">${x.bond}</p></div>`).join("")}</div>
    </div>
  </div>`;
}

/** Rasterize an inline SVG string (stripping external <image> refs to keep canvas taint-free) into an Image object. */
function svgToImage(svgStr) {
  return new Promise((resolve) => {
    try {
      const clean = svgStr.replace(/<image\b[^>]*>/gi, "").replace(/^<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ');
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(clean);
    } catch {
      resolve(null);
    }
  });
}

/** Render a complete, dynamic-height high-res PNG Career Chronicle containing ALL Chronicle sections & rank uniforms. */
export async function downloadChroniclePNG({ cmdrName, grade = 0, rankName, post, svcName, branchName, initBranchName = "", week, medalsCount, log = [], rivals = [], timeline = [], boardHistory = [], tours = {}, rankLabelFn, portraitFn = null, chapterLabel }) {
  const us = isUS();
  const maxG = Math.max(0, Math.min(10, grade | 0));
  const recentLogs = log.slice(-12);
  const keyDecisions = pickMajorDecisions(timeline);
  const ep = rivalEpilogues(rivals, rankLabelFn).slice(0, 5);

  const uniRows = portraitFn ? Math.ceil((maxG + 1) / 6) : 0;
  const uniH = uniRows ? 44 + uniRows * 144 : 0;
  const pathH = 175;
  const impactH = 74 + keyDecisions.length * 30;
  const logH = 54 + Math.max(1, recentLogs.length) * 28;
  const rivalH = 56 + Math.max(1, ep.length) * 44;
  const W = 1280;
  const H = 220 + uniH + pathH + impactH + logH + rivalH + 70;

  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, us ? "#0b1626" : "#101a18");
  bg.addColorStop(1, "#070b10");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = us ? "#5da8e8" : "#f2ca5c"; ctx.lineWidth = 4; ctx.strokeRect(22, 22, W - 44, H - 44);

  // 1. Header
  ctx.fillStyle = us ? "#7ec2f8" : "#f2ca5c";
  ctx.font = "bold 17px sans-serif";
  ctx.fillText("THE GENERAL · OFFICIAL COMPLETE CAREER CHRONICLE", 56, 68);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(`${rankName} ${cmdrName} 회고록`, 56, 120);
  ctx.fillStyle = "#b8d0e0";
  ctx.font = "19px sans-serif";
  ctx.fillText(`${svcName} · ${branchName} · ${post}  |  ${careerDate(week)} (${week}안건)  |  훈장 ${medalsCount}/10 · ${chapterLabel}`, 56, 158);
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(56, 180); ctx.lineTo(W - 56, 180); ctx.stroke();

  let y = 212;

  // 2. Rank Uniform Portrait Gallery
  if (portraitFn) {
    ctx.fillStyle = "#f2ca5c"; ctx.font = "bold 19px sans-serif";
    ctx.fillText(`계급별 정복 초상 (${maxG + 1}계급)`, 56, y);
    y += 16;
    const imgs = await Promise.all(Array.from({ length: maxG + 1 }, (_, r) => svgToImage(portraitFn(r))));
    const byG = new Map();
    for (const e of log) if (e.g != null) byG.set(e.g, e);
    for (let r = 0; r <= maxG; r++) {
      const col = r % 6, row = Math.floor(r / 6);
      const bx = 56 + col * 196, by = y + row * 144;
      ctx.fillStyle = "rgba(18,30,44,0.88)";
      ctx.fillRect(bx, by, 182, 132);
      ctx.strokeStyle = r === maxG ? "#f2ca5c" : "rgba(114,172,232,0.38)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, 182, 132);
      if (imgs[r]) ctx.drawImage(imgs[r], bx + 8, by + 8, 86, 86);
      ctx.fillStyle = r === maxG ? "#ffe082" : "#ffffff";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(rankLabelFn(r), bx + 102, by + 34);
      ctx.fillStyle = "#9fc5e2";
      ctx.font = "11.5px sans-serif";
      const pTxt = byG.get(r)?.t ? fmtPost(byG.get(r).t) : "";
      ctx.fillText(pTxt.slice(0, 9), bx + 102, by + 56);
      ctx.fillStyle = "#7f9db3";
      ctx.font = "11px sans-serif";
      ctx.fillText(byG.get(r) ? logServiceLabel(byG.get(r), r).slice(0, 10) : "", bx + 102, by + 76);
    }
    y += uniRows * 144 + 24;
  }

  // 3. Career Route Path Diagram (Classic vs Rotation)
  ctx.fillStyle = "#7ec2f8"; ctx.font = "bold 19px sans-serif";
  let switches = 0, prevB = null;
  const byGPath = new Map();
  for (const e of log) {
    if (e.g == null) continue;
    const bn = e.b || initBranchName;
    if (prevB && bn && bn !== prevB) switches++;
    if (bn) prevB = bn;
    byGPath.set(e.g, bn);
  }
  const baseB = log.find((e) => e.b)?.b || initBranchName || branchName;
  const archLabel = switches === 0 ? "정통 단일 병과 라인" : switches <= 2 ? "야전·합동 균형 엘리트" : "다병과 순환 제너럴리스트";
  ctx.fillText(`커리어 보직 경로도 · ${archLabel} (전과 ${switches}회)`, 56, y);
  y += 16;
  ctx.fillStyle = "#08111b"; ctx.fillRect(56, y, W - 112, 118);
  ctx.strokeStyle = "#1f354d"; ctx.lineWidth = 1.2; ctx.strokeRect(56, y, W - 112, 118);
  const pathCount = Math.max(2, maxG + 1);
  const px0 = 110, pxSpan = W - 220, yStd = y + 38, yRot = y + 84;
  ctx.strokeStyle = "rgba(126,184,232,0.35)"; ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(px0, yStd); ctx.lineTo(px0 + pxSpan, yStd); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#7eb8e8"; ctx.font = "bold 12px sans-serif"; ctx.fillText("정석", 68, yStd + 4);
  ctx.fillStyle = "#c29bff"; ctx.fillText("순환", 68, yRot + 4);
  for (let r = 0; r < pathCount; r++) {
    const x = px0 + (pathCount > 1 ? (r * pxSpan) / (pathCount - 1) : 0);
    const bCur = byGPath.get(r) || (r === maxG ? branchName : baseB);
    const shifted = Boolean(baseB && bCur && bCur !== baseB);
    const ny = shifted ? yRot : yStd;
    if (r > 0) {
      const px = px0 + ((r - 1) * pxSpan) / (pathCount - 1);
      const bPrev = byGPath.get(r - 1) || baseB;
      const py = Boolean(baseB && bPrev && bPrev !== baseB) ? yRot : yStd;
      ctx.strokeStyle = py !== ny ? "#f59e42" : shifted ? "#b084f5" : "#4cd97b";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, ny); ctx.stroke();
    }
    ctx.fillStyle = r === maxG ? "#f2ca5c" : shifted ? "#b084f5" : "#4cd97b";
    ctx.beginPath(); ctx.arc(x, ny, r === maxG ? 7 : 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#eaf2fa"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(rankLabelFn(r), x, ny - 12);
    ctx.fillStyle = "#9ab8cf"; ctx.font = "11px sans-serif";
    ctx.fillText(fmtPost(bCur || "").slice(0, 8), x, ny + 18);
    ctx.textAlign = "left";
  }
  y += 146;

  // 4. Decision Impact Analysis
  ctx.fillStyle = "#8ef07a"; ctx.font = "bold 19px sans-serif";
  ctx.fillText("내 선택과 커리어 영향 분석", 56, y);
  y += 26;
  const ab = allyBonus(rivals, maxG);
  const passedB = boardHistory.filter((b) => b.passed).length;
  ctx.fillStyle = "#cce8d6"; ctx.font = "14px sans-serif";
  ctx.fillText(
    `• 야전·합동 균형: ${tours?.cmd && tours?.joint ? "달성(+5점)" : "미달성"}   |   고등군사교육: ${tours?.edu ? "이수(+3~6점)" : "미이수"}   |   우군 동기: ${ab.allies}명(+${ab.crisisWinBonus}%)   |   정기심사: ${passedB}/${boardHistory.length}회 통과`,
    64, y,
  );
  y += 28;
  if (keyDecisions.length) {
    for (const ev of keyDecisions) {
      ctx.fillStyle = "#dce9f5"; ctx.font = "14px sans-serif";
      ctx.fillText(`• ${ev.date || ""} · ${ev.title} (${String(ev.choice || "").slice(0, 32)})${ev.score != null ? ` — ${ev.score}점` : ""}`, 64, y);
      y += 28;
    }
  }
  y += 12;

  // 5. Major Service Milestones
  ctx.fillStyle = "#f2ca5c"; ctx.font = "bold 19px sans-serif";
  ctx.fillText("주요 복무 연대기", 56, y);
  y += 28;
  ctx.fillStyle = "#e2edf5"; ctx.font = "15px sans-serif";
  recentLogs.forEach((e, idx) => {
    ctx.fillText(`• ${logServiceLabel(e, idx)}  |  ${rankLabelFn(e.g)} — ${fmtPost(e.t)}${e.why && !["임관", "보직 변경"].includes(e.why) ? ` (${e.why})` : ""}`, 64, y);
    y += 27;
  });
  y += 18;

  // 6. All 5 Classmate Epilogues
  ctx.fillStyle = "#72ace8"; ctx.font = "bold 19px sans-serif";
  ctx.fillText(`${us ? "사관학교 동기 후일담" : "임관 동기 후일담"} (${ep.length}명)`, 56, y);
  y += 28;
  ctx.fillStyle = "#d4e6f4"; ctx.font = "14.5px sans-serif";
  ep.forEach((x) => {
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 14.5px sans-serif";
    ctx.fillText(`• ${x.rank} ${x.name} [${x.routeTag}] · ${x.post} (관계도 ${x.rel})`, 64, y);
    ctx.fillStyle = "#b8d0e2"; ctx.font = "13.5px sans-serif";
    ctx.fillText(`   ${x.bond}`, 64, y + 19);
    y += 42;
  });

  ctx.fillStyle = "#7c95a6"; ctx.font = "13px sans-serif";
  ctx.fillText("Generated by THE GENERAL · Official Career Archive", W - 360, H - 38);

  const a = document.createElement("a");
  a.download = `THE_GENERAL_${cmdrName}_full_chronicle.png`;
  a.href = c.toDataURL("image/png");
  a.click();
}
