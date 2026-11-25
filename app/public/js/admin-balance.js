/* 관리자 밸런스 화면 (M): 저장 데이터를 건드리지 않는 순수 계산만 브라우저에서 바로 돌려 표로 보여 준다.
   - 미국편 경력(국방장관→대선→대통령) 1,000판: tools/sim/us.mjs 와 같은 규칙
   - 정상회담 미니게임: 국가별 무작위 플레이 합의 분포
   - 동기 이야기: 선택을 무작위로 했을 때 결말 분포
   - 장관 화면 위협 '높음' 확률: 구역 가중치로 계산
   카운터(진급 속도 등) 시뮬레이션은 저장소를 쓰므로 여기서 돌리지 않는다 → tools/sim 으로. */
import { newCareer, choices, decide, DEPT_GOAL } from "./us-career.js";
import { electors } from "./content/us.js";
import { ministryContent } from "./content/kr.js";
import { CARD_TYPES, playCard, levelOf, LEVELS } from "./summit.js";
import { RIVAL_ARCS, ARC_EVENTS, applyArcChoice } from "./rival-arcs.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const lcg = (seed) => () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;

function usRun(style, n, seed) {
  const rng = lcg(seed);
  const t = { style, games: n, goal: 0, nominee: 0, win: 0, successful: 0, stable: 0, mixed: 0, lame: 0 };
  for (let k = 0; k < n; k++) {
    const s = newCareer();
    for (let step = 0; s.phase !== "end" && step < 260; step++) {
      if (!choices(s).length) break;
      let i = 0;
      if (s.phase === "defense") i = style === "strong" ? Number(s.funds < 2) : style === "casual" ? 2 : Math.floor(rng() * 3);
      if (s.phase === "party") { t.goal += Number(s.record >= DEPT_GOAL); i = k % 2; }
      if (s.phase === "convention" && s.delegates > 50) t.nominee++;
      if (s.phase === "campaign") s.target = Object.keys(electors)[Math.floor(rng() * 51)];
      if (["campaign", "debate"].includes(s.phase) && style !== "strong") i = Number(style === "casual" || rng() < 0.5);
      if (s.phase === "cabinet" && style === "casual") i = 2;
      if (["summit", "crisis"].includes(s.phase) && style === "casual") i = 1;
      if (s.phase === "renew") i = 1;
      const ph = s.phase;
      decide(s, i, rng);
      if (["night", "contingent"].includes(ph) && s.phase === "cabinet") t.win++;
    }
    const lab = { "Successful presidency": "successful", "Stable presidency": "stable", "Mixed legacy": "mixed", "Lame-duck retirement": "lame" }[s.ending];
    if (lab) t[lab]++;
  }
  return t;
}
function summitRun(n) {
  const keys = Object.keys(CARD_TYPES), out = {};
  for (const nation of ["us", "jp", "cn", "nk", "eu"]) {
    const c = [0, 0, 0, 0];
    for (let k = 0; k < n; k++) { const st = { nation, mood: 45, played: [] }; for (let r = 0; r < 3; r++) playCard(st, keys[Math.floor(Math.random() * keys.length)]); c[levelOf(st.mood)]++; }
    out[nation] = c;
  }
  return out;
}
function arcRun(n) {
  const out = RIVAL_ARCS.map((a) => ({ name: a.name, fates: {} }));
  for (let k = 0; k < n; k++) {
    RIVAL_ARCS.forEach((a, ai) => {
      const r = { rel: 30 + Math.random() * 50, g: 3 };
      for (let si = 0; si < a.steps.length; si++) {
        const ev = ARC_EVENTS.find((x) => x.id === `arc_${a.key}_${si}`), opt = ev.opts[Math.floor(Math.random() * ev.opts.length)];
        r.rel = Math.max(0, Math.min(100, r.rel + opt.rel));
        applyArcChoice(r, ev, opt);
      }
      const key = r.fate?.note?.slice(0, 28) || "결말 없음";
      out[ai].fates[key] = (out[ai].fates[key] || 0) + 1;
    });
  }
  return out;
}
function threatCalc() {
  const { AREAS } = ministryContent();
  const rows = Object.entries(AREAS).map(([k, a]) => { const w = a.w || [1, 1, 1], sum = w.reduce((x, y) => x + y, 0); return [a.n || k, w[2] / sum]; });
  const none = rows.reduce((p, [, q]) => p * (1 - q), 1);
  return { rows, anyWeek: 1 - none };
}

export function balanceHTML() {
  const N = 1000;
  const us = ["strong", "ordinary", "casual"].map((st, i) => usRun(st, N, 20261121 + i));
  const sm = summitRun(2000), arcs = arcRun(500), th = threatCalc();
  const styleKo = { strong: "적극(최선)", ordinary: "보통(무작위)", casual: "소극(회피)" };
  return `<div class="bal">
    <h3>미국편 경력 ${N}판 × 3 성향 <small>tools/sim/us.mjs 와 같은 규칙</small></h3>
    <table><tr><th>성향</th><th>국방장관 목표(${DEPT_GOAL})</th><th>후보 지명</th><th>당선</th><th>성공</th><th>안정</th><th>엇갈림</th><th>레임덕</th></tr>
    ${us.map((t) => `<tr><td>${styleKo[t.style]}</td><td>${pct(t.goal, t.games)}</td><td>${pct(t.nominee, t.games)}</td><td>${pct(t.win, t.games)}</td><td>${pct(t.successful, t.win)}</td><td>${pct(t.stable, t.win)}</td><td>${pct(t.mixed, t.win)}</td><td>${pct(t.lame, t.win)}</td></tr>`).join("")}</table>
    <small class="bal-note">성공~레임덕 비율은 당선자 기준.</small>
    <h3>정상회담 미니게임 · 무작위 3장 2,000판</h3>
    <table><tr><th>상대</th>${LEVELS.map(([n]) => `<th>${n}</th>`).join("")}</tr>
    ${Object.entries(sm).map(([k, c]) => `<tr><td>${k.toUpperCase()}</td>${c.map((v) => `<td>${pct(v, 2000)}</td>`).join("")}</tr>`).join("")}</table>
    <h3>동기 이야기 결말 · 무작위 선택 500판</h3>
    <table><tr><th>이야기</th><th>결말 분포</th></tr>${arcs.map((a) => `<tr><td>${esc(a.name)}</td><td>${Object.entries(a.fates).map(([f, v]) => `${esc(f)}… <b>${pct(v, 500)}</b>`).join("<br>")}</td></tr>`).join("")}</table>
    <h3>장관 화면 · 구역별 위협 '높음' 확률 (주당)</h3>
    <table><tr><th>구역</th><th>확률</th></tr>${th.rows.map(([n, q]) => `<tr><td>${esc(n)}</td><td>${(q * 100).toFixed(1)}%</td></tr>`).join("")}<tr><td><b>한 곳이라도</b></td><td><b>${(th.anyWeek * 100).toFixed(1)}%</b></td></tr></table>
    <small class="bal-note">교리·사업 보정 전 기본값. 긴급 NSC는 여기에 6주 간격 제한이 더해진다. 진급 속도 등 저장소를 쓰는 시뮬레이션은 tools/sim 에서 돌린다.</small>
    <div class="bal-act"><button type="button" data-bal="again">다시 돌리기</button><button type="button" data-bal="close" class="on">닫기</button></div>
  </div>`;
}

export function openBalancePanel() {
  if (typeof document === "undefined") return;
  document.querySelector("#balOv")?.remove();
  const ov = document.createElement("div");
  ov.id = "balOv"; ov.className = "hr-ov";
  ov.innerHTML = `<div class="hr-doc mn-paper bal-doc" role="dialog" aria-label="밸런스 시험"><div class="dh"><div class="dt"><small>관리자 전용</small><b>📊 밸런스 시험</b><span>계산 중…</span></div></div><div class="bal-body"></div></div>`;
  document.body.appendChild(ov);
  const run = () => { const t0 = performance.now(); ov.querySelector(".bal-body").innerHTML = balanceHTML(); ov.querySelector(".dt span").textContent = `브라우저에서 계산 · ${Math.round(performance.now() - t0)}ms`; };
  setTimeout(run, 30);
  ov.addEventListener("click", (e) => { const b = e.target.closest("[data-bal]"); if (!b) return; if (b.dataset.bal === "close") ov.remove(); else { ov.querySelector(".bal-body").innerHTML = "<p>계산 중…</p>"; setTimeout(run, 30); } });
}
