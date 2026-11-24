import { representativeDecision } from "./career-timeline.js";
import { dutyState } from "./duty.js";
import { careerStorage } from "./characters.js";
import { chapter } from "./us-story.js";
import { civicMap } from "./civic-map.js";
import { US_STATES } from "./geo-maps.js";
// U.S. Presidential Election (538 Electoral College) & White House Chapter integrated into THE GENERAL (#hqP).
import { tiles, electors } from "./content/us.js";
import { newCareer, decide, election } from "./us-career.js";
import { unlockEnding } from "./endings.js";
import { STATE_NAMES, SWING_STATES, WORLD_THEATERS, ensureGlobalState, worldMapHTML } from "./us-global.js";

const KEY = "steeltide:uspres";
const rd = () => {
  try {
    return JSON.parse(careerStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
};
const wr = (s) => {
  try {
    careerStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
};
const esc = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

export const usPresState = () => rd();
export function usPresStart(name, trust = 62, ministry = null) {
  let s = rd();
  if (s && s.phase !== "service") return s;
  s = newCareer();
  s.name = name || "Commander";
  s.phase = "prologue";
  s.introStep = 0;
  s.serviceRecord =
    ministry?.retired && ministry.nat === "us"
      ? { minister: true, weeks: ministry.sup?.length || 36 }
      : { minister: false };
  s.serviceDecision = representativeDecision(dutyState());
  s.trust = Math.max(45, Math.min(80, trust));
  s.journal = [
    "공직을 마치고 민간인으로 돌아왔다. 출마를 두고 가족과 상의했다.",
  ];
  wr(s);
  return s;
}
export function usPresReset() {
  try {
    careerStorage.removeItem(KEY);
  } catch {}
}

function tileMapHTML(s) {
  const isRed = s.party === "red";
  const myCol = isRed ? "#b82e36" : "#1f62b0", myLean = isRed ? "#cf5c62" : "#4b89d4";
  const oppCol = isRed ? "#1f62b0" : "#b82e36", oppLean = isRed ? "#4b89d4" : "#cf5c62";
  let myEv = 0, oppEv = 0, swingEv = 0;
  const info = {};
  const cells = tiles
    .join(" ")
    .split(" ")
    .map((code) => {
      if (code === "..") return `<span class="us-gap"></span>`;
      const ev = electors[code] || 0;
      const count = s.results && s.phase !== "blackout" ? s.results[code] : null;
      const margin = Math.round((s.polls?.[code] ?? 0) + 2 * (s.visits?.[code] || 0));
      const isSwing = Math.abs(margin) < 6;
      const isKey = SWING_STATES.includes(code);
      let bg = "#1c2d42", cls = "";
      if (count != null) {
        if (count === ev) { bg = myCol; myEv += ev; }
        else if (count > 0) { bg = "#b88a28"; myEv += count; oppEv += ev - count; }
        else { bg = oppCol; oppEv += ev; }
      } else {
        if (isSwing) { bg = "#b88724"; swingEv += ev; cls = " swing"; }
        else if (margin >= 12) { bg = myCol; myEv += ev; }
        else if (margin >= 6) { bg = myLean; myEv += ev; }
        else if (margin <= -12) { bg = oppCol; oppEv += ev; }
        else { bg = oppLean; oppEv += ev; }
      }
      const val = count == null ? `${ev}` : `${count}/${ev}`;
      const sel = s.target === code ? " on" : "";
      const vis = s.visits?.[code] || 0;
      const tip = `${STATE_NAMES[code] || code} (${code}) · 선거인단 ${ev}명 · ${count != null ? `확보 ${count}/${ev}` : `예상 격차 ${margin >= 0 ? "+" : ""}${margin}%`}${vis ? ` · 유세 ${vis}회` : ""}`;
      info[code] = { bg, sel, cls, tip, val, isKey };
      return "";
    })
    .join("");
  void cells;
  /* 실제 주 경계 지도 (앨버스 투영). 작은 동북부 주는 바깥에 이름표를 단다. */
  const live = s.phase === "campaign";
  const SMALL = { VT: [945, 178], NH: [945, 198], MA: [945, 218], RI: [945, 238], CT: [945, 258], NJ: [945, 278], DE: [945, 298], MD: [945, 318], DC: [945, 338] };
  const shapes = Object.entries(US_STATES).map(([code, g]) => {
    const it = info[code]; if (!it) return "";
    return `<path d="${g.d}" fill="${it.bg}" class="us-shp${it.sel}${it.cls}"${live ? ` data-usstate="${code}"` : ""}><title>${esc(it.tip)}</title></path>`;
  }).join("");
  const labels = Object.entries(US_STATES).map(([code, g]) => {
    const it = info[code]; if (!it) return "";
    const sm = SMALL[code];
    if (sm) return `<line x1="${g.x}" y1="${g.y}" x2="${sm[0] - 14}" y2="${sm[1] - 4}" stroke="rgba(255,255,255,.45)" stroke-width=".8"/><g${live ? ` data-usstate="${code}"` : ""} class="us-lbl"><rect x="${sm[0] - 14}" y="${sm[1] - 13}" width="40" height="17" rx="3" fill="${it.bg}" stroke="rgba(255,255,255,.6)"/><text x="${sm[0] + 6}" y="${sm[1]}" text-anchor="middle">${code} ${it.val}</text></g>`;
    return `<text x="${g.x}" y="${g.y}" text-anchor="middle" class="us-lbl"${live ? ` data-usstate="${code}"` : ""}><tspan x="${g.x}" font-weight="800">${code}${it.isKey ? "★" : ""}</tspan><tspan x="${g.x}" dy="12" font-size="10">${it.val}</tspan></text>`;
  }).join("");
  const dc = info.DC ? `<g${live ? ' data-usstate="DC"' : ""} class="us-lbl"><rect x="${SMALL.DC[0] - 14}" y="${SMALL.DC[1] - 13}" width="40" height="17" rx="3" fill="${info.DC.bg}" stroke="rgba(255,255,255,.6)"/><text x="${SMALL.DC[0] + 6}" y="${SMALL.DC[1]}" text-anchor="middle">DC ${info.DC.val}</text></g>` : "";
  const mapSvg = `<svg viewBox="0 0 975 610" class="us-map${live ? " live" : ""}" role="img" aria-label="미국 선거인단 지도">${shapes}${labels}${dc}</svg>`;
  const myPct = ((myEv / 538) * 100).toFixed(1), swPct = ((swingEv / 538) * 100).toFixed(1), opPct = ((oppEv / 538) * 100).toFixed(1);
  const bar = `<div class="us-ec-wrap">
    <div class="us-ec-nums"><b style="color:${isRed ? "#ff8a8a" : "#7ec2f8"}">${isRed ? "리버티당" : "유니언당"} (나) ${myEv}</b><span style="color:#ffd166">경합 ${swingEv} · 270 과반</span><b style="color:${isRed ? "#7ec2f8" : "#ff8a8a"}">상대 ${oppEv}</b></div>
    <div class="us-ec-bar"><i style="width:${myPct}%;background:${myCol}"></i><i style="width:${swPct}%;background:#c99628"></i><i style="width:${opPct}%;background:${oppCol}"></i><em class="us-ec-270" title="당선 매직넘버 270"></em></div>
  </div>`;
  const quickSwings = s.phase === "campaign"
    ? `<div class="us-swing-bar"><small>핵심 7대 경합주:</small>${SWING_STATES.map((code) => `<button data-usstate="${code}" class="${s.target === code ? "on" : ""}">${code} (${electors[code]})</button>`).join("")}</div>`
    : "";
  const legend = `<div class="us-ec-leg"><span><i style="background:${myCol}"></i>우세</span><span><i style="background:#b88724"></i>경합주(★)</span><span><i style="background:${oppCol}"></i>열세</span></div>`;
  return `${bar}${mapSvg}${quickSwings}${legend}`;
}

export function usPresHTML() {
  const s = rd();
  if (!s) return "";
  const [title, desc, ...answers] = chapter(s);
  const voting = ["campaign", "debate", "night", "contingent"].includes(
    s.phase,
  );
  const inWH = s.term > 0 && s.phase !== "end" && s.phase !== "inauguration";
  if (inWH) ensureGlobalState(s);
  const steps = [
    ["민간인", ["prologue"]], ["출마 선언", ["party", "declare"]],
    ["경선·전당대회", ["primary", "convention"]],
    ["본선·TV 토론", ["campaign", "debate", "blackout"]],
    ["선거일 개표", ["night", "contingent", "end"]],
    ["취임", ["inauguration"]],
  ];
  const currentStep = steps.findIndex(([, phases]) => phases.includes(s.phase));
  const progress = !inWH && currentStep >= 0 ? `<ol class="us-election-steps">${steps.map(([label], index) =>
    `<li ${index === currentStep ? 'aria-current="step"' : ""}>${label}</li>`).join("")}</ol>` : "";
  const elecSum = s.results && s.phase !== "blackout"
    ? Object.values(s.results).reduce((a, b) => a + b, 0)
    : 0;
  const phaseLbl = s.phase === "end" ? "커리어 기록"
    : inWH ? `제${s.term}기 · ${s.quarter}분기`
    : s.phase === "primary" ? `경선 · 대의원 ${s.delegates}명`
    : steps[currentStep]?.[0] ?? "출마 준비";
  const btns = answers
    .map(
      (label, i) =>
        `<button class="us-ch" data-uspres="c:${i}" ${s.phase === "campaign" && !s.target ? "disabled" : ""}><b>${esc(label)}</b></button>`,
    )
    .join("");
  const bgImg = inWH
    ? s.term === 1 && s.quarter === 1
      ? "img/bg/us_inauguration.jpg"
      : "img/bg/us_oval_office.jpg"
    : ["primary", "campaign", "debate"].includes(s.phase)
      ? "img/bg/us_rally.jpg"
      : ["night", "contingent", "inauguration"].includes(s.phase)
        ? "img/bg/us_inauguration.jpg"
        : s.phase === "end" && s.term > 0
          ? "img/bg/us_inauguration.jpg"
          : "img/bg/us_capitol_hearing.jpg";
  const bgStyle = `background:linear-gradient(rgba(10,16,24,.72),rgba(8,12,18,.88)),url(${bgImg}) center/cover`;

  return `<div class="mn dm-shell" style="${bgStyle}">
    ${progress}
    <div class="mn-top dm-top">
      <div class="mt">${s.term > 0 ? `<img class="us-president-mark" src="img/us_potus_mark.png" alt="미국 대통령 표장">` : ""}<span>직책</span><b>${esc(s.phase === "end" ? (s.term ? "전직 미국 대통령" : "전직 후보") : s.phase === "inauguration" ? "미국 대통령 당선인" : s.term ? "미국 대통령" : s.phase === "prologue" ? "전직 공직자" : "대선 후보")}</b><small>${s.party === "red" ? "리버티당" : s.party === "blue" ? "유니언당" : "정당 선택 전"}</small></div>
      <div class="mt"><span>단계</span><b>${esc(phaseLbl)}</b></div>
      <div class="mt"><span>지지율 (Approval)</span><b class="${s.trust >= 55 ? "g" : s.trust >= 40 ? "y" : "r"}">${s.trust}%</b></div>
      ${inWH ? `<div class="mt"><span>세계 패권 · 동맹</span><b class="${s.world >= 65 ? "g" : "y"}">${s.world}</b><small>경제 ${s.econ} · 안보 ${s.sec}</small></div><div class="mt"><span>미 의회</span><b>하원 ${s.house}/435 · 상원 ${s.senate}/100</b><small>제정 법안 ${s.laws}건</small></div>` : `<div class="mt"><span>선거인단 과반</span><b>${s.results && s.phase !== "blackout" ? `${elecSum} / 538` : "270 / 538 필요"}</b></div>`}
    </div>
    <div class="mn-body us-campaign-grid">
      <div class="mn-col">
        <div class="mn-h">${inWH ? "🏛️ 백악관 오벌 오피스 결재판" : "🗳️ 대선 캠프 결재판"}</div>
        <div class="mn-card mn-dk mn-paper" style="border-color:${s.party === "red" ? "#e06464" : "#5da8e8"}">
          <div class="dh"><div class="dt"><small>${inWH ? "THE WHITE HOUSE · EXECUTIVE ACTION" : "U.S. PRESIDENTIAL CAMPAIGN"}</small><b>${esc(title)}</b></div></div>
          <p>${esc(desc)}</p>
          ${s.serviceDecision && (s.phase === "declare" || (s.phase === "debate" && s.turn === 3)) ? `<p class="campaign-service-record"><b>인사기록 · ${esc(s.serviceDecision.date)}</b><br>${esc(s.serviceDecision.outcome)}</p>` : ""}
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">${btns || `<button class="mn-go" data-uspres="reset">↺ 새 대선 캠페인 시작</button>`}</div>
        </div>
      </div>
      <div class="mn-col">
        ${inWH ? worldMapHTML(s) : voting ? `<div class="mn-card"><div class="mn-h">🗺️ 미국 538 선거인단 지도 <small>${s.phase === "campaign" ? (s.target ? `선택: ${STATE_NAMES[s.target] || s.target} (${electors[s.target]}명)` : "경합주(★) 또는 원하는 주를 클릭하세요") : s.results ? `확보 선거인단 ${elecSum} / 538 (당선 기준 270)` : "투표 마감 후 집계"}</small></div>${tileMapHTML(s)}</div>` : civicMap("home")}
      </div>
      <aside class="mn-col">
        <div class="mn-card dm-news"><div class="mn-h">워싱턴 소식</div>${
          (s.journal || [])
            .slice(0, 10)
            .map((l) => `<small>• ${esc(l)}</small>`)
            .join("") || "<small>캠페인을 시작합니다.</small>"
        }</div>
      </aside>
    </div>
  </div>`;
}

function usElectionCuts(kind, s) {
  const nm = esc(s.name || "Commander");
  const ev = s.results ? Object.values(s.results).reduce((a, b) => a + b, 0) : 270;
  if (kind === "win") return {
    cutTitle: "U.S. Presidential Inauguration",
    cutPlace: "Washington, D.C. · Capitol & White House",
    cuts: [
      { img: "us_rally", flash: 3, who: "ELECTION NIGHT · BREAKING", text: `선거인단 ${ev} / 538석 확보! ${nm} 후보가 미합중국 대통령으로 당선되었습니다!` },
      { img: "us_inauguration", flash: 2, card: `<img src="img/us_potus_mark.png" alt="POTUS Seal" style="height:76px;display:block;margin:0 auto 8px"><b style="color:#ffd166;letter-spacing:.12em">PRESIDENT OF THE UNITED STATES</b>`, who: `${nm} · 취임 선서`, text: "“나는 미합중국 대통령의 직무를 성실히 수행하고, 최선을 다해 미합중국 헌법을 보존·보호·수호할 것을 엄숙히 선서합니다.”" },
      { img: "us_oval_office", who: "THE WHITE HOUSE · OVAL OFFICE", text: `Hail to the Chief가 울려 퍼집니다. 이제 미합중국 제${s.term}기 대통령 겸 국군통수권자(Commander-in-Chief)로서 백악관 집무를 시작합니다.` },
    ],
  };
  if (kind === "loss") return {
    cutTitle: "U.S. Presidential Election",
    cutPlace: "Campaign Headquarters · Election Night",
    cuts: [
      { img: "us_rally", who: "ELECTION NIGHT", text: `최종 선거인단 ${ev}석으로 과반(270석) 달성에 실패했습니다. ${nm} 후보는 지지자들 앞에서 품위 있는 승복 연설을 전합니다.` },
      { img: "us_capitol_hearing", who: "WASHINGTON, D.C.", text: "백악관 입성은 다음을 기약하게 되었지만, 군과 공직에서 쌓아 올린 명예와 경륜은 미국 안보의 큰 자산으로 남았습니다." },
    ],
  };
  return {
    cutTitle: "Presidential Farewell",
    cutPlace: "The White House · End of Term",
    cuts: [
      { img: "us_oval_office", who: `${nm} · 퇴임 연설`, text: `제${s.term}기 임기를 마치고 오벌 오피스(Oval Office) 책상 위에 후임 대통령을 위한 편지를 남깁니다.` },
      { img: "us_inauguration", flash: 1, card: `<img src="img/us_potus_mark.png" alt="POTUS Seal" style="height:68px;display:block;margin:0 auto 8px"><b style="color:#ffd166">FORMER PRESIDENT OF THE UNITED STATES</b>`, who: "THE GENERAL · EPILOGUE", text: "신임 장교(O-1) 임관에서 미합중국 대통령까지 — 위대한 복무의 여정을 명예롭게 마무리했습니다." },
    ],
  };
}

export function usPresClick(act) {
  const s = rd();
  if (!s) return {};
  if (act === "reset") {
    usPresReset();
    usPresStart(s.name, 60);
    return { redraw: true, toast: "미국 대선 캠페인을 새로 시작합니다" };
  }
  if (act.startsWith("th:")) {
    ensureGlobalState(s);
    const tid = act.slice(3);
    if (WORLD_THEATERS.some((t) => t.id === tid)) { s.selTheater = tid; wr(s); return { redraw: true }; }
    return {};
  }
  if (act.startsWith("glob:")) {
    ensureGlobalState(s);
    const [, tid, oi] = act.split(":");
    const qKey = `${s.term}:${s.quarter}`;
    if (s.globalActQ === qKey) return { toast: "이번 분기 백악관 상황실 글로벌 지침을 이미 발령했습니다." };
    const th = WORLD_THEATERS.find((t) => t.id === tid);
    const opt = th?.actions?.[+oi];
    if (!th || !opt) return {};
    const cl = (v) => Math.max(0, Math.min(100, v));
    s.world = cl(s.world + opt.world);
    s.sec = cl(s.sec + opt.sec);
    s.econ = cl(s.econ + opt.econ);
    s.trust = cl(s.trust + opt.trust);
    s.theaters[tid] = cl((s.theaters[tid] ?? 65) + Math.max(4, opt.sec + opt.world));
    s.globalActQ = qKey;
    (s.journal ??= []).unshift(`[백악관 상황실 · ${th.name}] ${opt.log}`);
    s.journal = s.journal.slice(0, 30);
    wr(s);
    return { redraw: true, toast: `🌐 ${th.name} 대통령 지침 발령 — ${opt.l}` };
  }
  if (
    act.startsWith("state:") &&
    s.phase === "campaign" &&
    Object.hasOwn(electors, act.slice(6))
  ) {
    s.target = act.slice(6);
    wr(s);
    return { redraw: true };
  }
  if (act.startsWith("c:")) {
    const prevTerm = s.term;
    const i = Number(act.slice(2)),
      [title, , ...answers] = chapter(s);
    if (
      !Number.isInteger(i) ||
      !answers[i] ||
      (s.phase === "campaign" && !s.target)
    )
      return {};
    const before = s.phase,
      quarter = s.quarter,
      oldLaws = s.laws;
    const region = s.target,
      intro = s.introStep || 0;
    if (before === "prologue") {
      s.trust = Math.min(90, s.trust + (i === 0 ? 2 : 1));
      s.introStep = intro + 1;
      if (s.introStep === 4) {
        s.phase = "party";
        s.pledge = i ? "복무 이후의 삶" : "공공 예산의 책임";
      }
    } else if (before === "declare") {
      s.score += i === 0 ? 0.6 : 0.3;
      s.phase = "primary";
    } else if (before === "blackout") {
      s.phase = "night";
    } else if (before === "inauguration") {
      s.phase = "cabinet";
    } else {
      decide(s, i, Math.random);
      if (before === "party") s.phase = "declare";
      if (before === "campaign" && s.phase === "night") s.phase = "blackout";
      if ((before === "night" || before === "contingent") && s.term > prevTerm) s.phase = "inauguration";
    }
    const report = [title + " · " + answers[i]];
    if (before === "declare") report.push(i === 0 ? "선거 점수 +0.6" : "선거 점수 +0.3");
    if (before === "debate") report.push(i === 0 ? "선거 점수 +0.8" : "선거 점수 −0.9");
    if (before === "campaign") report.push(region + "주 유세 완료");
    if (before === "primary") report.push("누적 대의원 " + s.delegates + "명");
    if (before === "cabinet" && i !== 2)
      report.push(
        "하원 " +
          s.votes[0] +
          "표 · 상원 " +
          s.votes[1] +
          "표 · " +
          (s.phase === "bill" ? "양원 통과" : "처리 무산"),
      );
    if (before === "cabinet" && i === 2)
      report.push(
        s.log
          .slice(0, 3)
          .find((l) => /court stays|Agencies implement/.test(l))
          ?.includes("court")
          ? "법원이 집행을 정지했습니다."
          : "연방기관이 집행을 시작했습니다.",
      );
    if (before === "bill")
      report.push(s.laws > oldLaws ? "법률 제정" : "거부권 유지");
    if (quarter === 8 && s.quarter === 9)
      report.push(
        "중간선거 · 여당 하원 " + s.house + "석 / 상원 " + s.senate + "석",
      );
    if (s.phase === "inauguration") report.push("당선 · 취임 선서 대기");
    if (before === "inauguration") report.push("취임 선서 · 제" + s.term + "기 행정부 출범");
    (s.journal ??= []).unshift(report.join(" — "));
    s.journal = s.journal.slice(0, 30);
    wr(s);
    const inaugurated = before === "inauguration";
    const lostElection = before !== "end" && s.phase === "end" && s.term === 0;
    const retiredPres = before !== "end" && s.phase === "end" && s.term > 0;
    if (inaugurated) unlockEnding("us_potus");
    const cutPack = inaugurated ? usElectionCuts("win", s) : lostElection ? usElectionCuts("loss", s) : retiredPres ? usElectionCuts("end", s) : {};
    return {
      redraw: true,
      inaugurated,
      ...cutPack,
      toast: inaugurated
        ? "🇺🇸 미합중국 대통령(POTUS)에 취임했습니다! (Hail to the Chief)"
        : "",
    };
  }
  return {};
}

export function usPresAdmin(id) {
  const s = rd();
  if (!s) return {};
  const prevTerm = s.term, prevPhase = s.phase;
  if (id === "pri") {
    if (!s.party) s.party = "blue";
    s.delegates = 75;
    s.phase = "convention";
    decide(s, 0, Math.random);
  }
  if (id === "night" || id === "win" || id === "loss") {
    s.phase = "night";
    s.results = election(s, Math.random);
    if (id !== "night") {
      for (const k in electors) s.results[k] = id === "win" ? electors[k] : 0;
      decide(s, 0, Math.random);
    }
  }
  if (id === "seats") {
    s.house = s.house > 217 ? 190 : 300;
    s.senate = s.senate > 50 ? 32 : 70;
  }
  if (id === "qtr") {
    if (s.quarter < 16) {
      s.quarter++;
      s.phase = "cabinet";
    } else if (s.term === 1) s.phase = "renew";
    else {
      s.ending = "Presidential retirement";
      s.phase = "end";
    }
  }
  if (id === "end") {
    s.phase = "end";
    s.ending = "Presidential retirement";
  }
  wr(s);
  const inaugurated = prevTerm === 0 && s.term === 1;
  const lostElection = prevPhase !== "end" && s.phase === "end" && s.term === 0;
  const retiredPres = prevPhase !== "end" && s.phase === "end" && s.term > 0;
  if (inaugurated) unlockEnding("us_potus");
  const cutPack = inaugurated ? usElectionCuts("win", s) : lostElection ? usElectionCuts("loss", s) : retiredPres ? usElectionCuts("end", s) : {};
  return {
    redraw: true,
    inaugurated,
    ...cutPack,
    toast: inaugurated ? "🇺🇸 [관리자] 미합중국 대통령 취임!" : "",
  };
}
