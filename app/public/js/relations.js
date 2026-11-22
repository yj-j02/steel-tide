// 인맥 & 인간 드라마: 직속 상관(평정권자) 성향, 동기 인터랙션 이벤트, 우호 동기 참모 시너지, 장군 회고록(Chronicle) & PNG 저장.
import { isUS, serviceOf, normBranch, careerTitle, curServices, curBranches } from "./staff.js";
import { usNpcName } from "./us-ranks.js";
import { careerDate } from "./service-calendar.js";

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
    const post = r.retired ? (r.retiredPost || "예비역 · 방산·안보 자문위원") : (r.post || careerTitle(r.g, r.br));
    const rk = r.retired ? `예비역 ${rankLabelFn(r.g)}` : rankLabelFn(r.g);
    const routeTag = r.style || "야전 지휘관";
    const bond = r.retired
      ? (rel >= 75
          ? "전역 후 방산·안보 연구계로 진출해 국방 개혁의 든든한 민간 후원자가 되었습니다."
          : "중견 장교로 명예 전역한 뒤 국방 산업계에서 제2의 인생을 개척했습니다.")
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

/** Build the Career Chronicle (장군 회고록) HTML for endings and 인사기록 modal. */
export function chronicleHTML({ cmdrName, grade, rankName, post, svcName, branchName, week, medalsCount, log = [], rivals = [], rankLabelFn, chapterLabel }) {
  const ep = rivalEpilogues(rivals, rankLabelFn);
  const milestones = log.slice(-10).map((e, idx) => `<li><b>${logServiceLabel(e, idx)}</b> · ${rankLabelFn(e.g)} · ${e.t}${e.why && !["임관", "보직 변경"].includes(e.why) ? ` <small>(${e.why})</small>` : ""}</li>`).join("") || "<li>임관 기록 준비 중</li>";
  return `<div class="mn-card" style="text-align:left;border-color:#f2ca5c;background:rgba(16,22,30,.92);padding:18px 20px">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(242,202,92,.35);padding-bottom:10px;margin-bottom:12px">
      <div><small style="color:#f2ca5c;letter-spacing:.14em;font-weight:700">THE GENERAL · CAREER CHRONICLE</small><h3 style="margin:3px 0 0;color:#fff;font-size:19px">📜 ${cmdrName} 회고록</h3></div>
      <button class="mn-go" data-chron="png" style="width:auto;padding:8px 14px;font-size:12px">🖼 회고록 PNG 저장</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;font-size:12px">
      <div style="padding:8px;background:rgba(255,255,255,.04);border-radius:6px"><small style="color:#8faec0;display:block">최종 계급·직책</small><b>${rankName} · ${post}</b></div>
      <div style="padding:8px;background:rgba(255,255,255,.04);border-radius:6px"><small style="color:#8faec0;display:block">소속 · 병과</small><b>${svcName} · ${branchName}</b></div>
      <div style="padding:8px;background:rgba(255,255,255,.04);border-radius:6px"><small style="color:#8faec0;display:block">복무 기간</small><b>${careerDate(week)} (${week}안건)</b></div>
      <div style="padding:8px;background:rgba(255,255,255,.04);border-radius:6px"><small style="color:#8faec0;display:block">훈장 · 최종 단계</small><b>${medalsCount}/10 · ${chapterLabel}</b></div>
    </div>
    <div style="margin-bottom:12px"><b style="color:#f2ca5c;font-size:12.5px">📌 주요 복무 연대기</b><ul style="margin:6px 0 0;padding-left:18px;font-size:12px;color:#d6e4ee;line-height:1.65">${milestones}</ul></div>
    <div><b style="color:#72ace8;font-size:12.5px">👥 ${isUS() ? "사관학교 동기 후일담" : "임관 동기 후일담"} (${ep.length}명)</b>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;margin-top:6px">${ep.map((x) => `<div style="padding:9px 10px;border-radius:7px;background:rgba(30,58,86,.32);border:1px solid rgba(114,172,232,.3);font-size:11.5px"><b style="color:#fff">${x.rank} ${x.name}</b> <span style="font-size:10px;padding:1px 5px;border-radius:4px;background:rgba(242,202,92,.14);color:#f2ca5c">${x.routeTag}</span><br><small style="color:#9ec5e6">${x.post} · 관계도 ${x.rel}</small><p style="margin:4px 0 0;color:#c8dbe8;line-height:1.45">${x.bond}</p></div>`).join("")}</div>
    </div>
  </div>`;
}

/** Render a crisp 1200x780 PNG Career Chronicle postcard and trigger browser download. */
export function downloadChroniclePNG({ cmdrName, rankName, post, svcName, branchName, week, medalsCount, log = [], rivals = [], rankLabelFn, chapterLabel }) {
  const c = document.createElement("canvas");
  c.width = 1200; c.height = 780;
  const ctx = c.getContext("2d");
  const us = isUS();
  const bg = ctx.createLinearGradient(0, 0, 1200, 780);
  bg.addColorStop(0, us ? "#0b1626" : "#121a18");
  bg.addColorStop(1, "#070b10");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1200, 780);
  ctx.strokeStyle = us ? "#5da8e8" : "#f2ca5c"; ctx.lineWidth = 4; ctx.strokeRect(24, 24, 1152, 732);
  ctx.fillStyle = us ? "#7ec2f8" : "#f2ca5c";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("THE GENERAL · OFFICIAL CAREER CHRONICLE", 56, 74);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText(`${rankName} ${cmdrName}`, 56, 128);
  ctx.fillStyle = "#b8d0e0";
  ctx.font = "22px sans-serif";
  ctx.fillText(`${svcName} · ${branchName} · ${post}  |  ${careerDate(week)}  |  훈장 ${medalsCount}/10 (${chapterLabel})`, 56, 168);
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(56, 192); ctx.lineTo(1144, 192); ctx.stroke();

  ctx.fillStyle = us ? "#7ec2f8" : "#f2ca5c"; ctx.font = "bold 20px sans-serif";
  ctx.fillText("주요 복무 연대기", 56, 232);
  ctx.fillStyle = "#e2edf5"; ctx.font = "17px sans-serif";
  let y = 266;
  const recentLogs = log.slice(-7);
  recentLogs.forEach((e, idx) => {
    ctx.fillText(`• ${logServiceLabel(e, idx)}  ${rankLabelFn(e.g)} — ${e.t}`, 64, y);
    y += 30;
  });
  ctx.fillStyle = "#72ace8"; ctx.font = "bold 20px sans-serif";
  ctx.fillText(us ? "사관학교 동기 후일담" : "임관 동기 후일담", 56, 510);
  const ep = rivalEpilogues(rivals, rankLabelFn);
  ctx.fillStyle = "#d4e6f4"; ctx.font = "15px sans-serif";
  ep.slice(0, 5).forEach((x, i) => {
    ctx.fillText(`• ${x.rank} ${x.name} [${x.routeTag}] (${x.post}, 관계도 ${x.rel}): ${x.bond}`, 64, 544 + i * 36);
  });
  ctx.fillStyle = "#7c95a6"; ctx.font = "14px sans-serif";
  ctx.fillText("Generated by THE GENERAL", 960, 738);

  const a = document.createElement("a");
  a.download = `THE_GENERAL_${cmdrName}_chronicle.png`;
  a.href = c.toDataURL("image/png");
  a.click();
}
