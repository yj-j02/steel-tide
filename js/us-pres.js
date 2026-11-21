import { representativeDecision } from "./career-timeline.js";
import { dutyState } from "./duty.js";
import { careerStorage } from "./characters.js";
import { chapter } from "./us-story.js";
import { civicMap } from "./civic-map.js";
// U.S. Presidential Election (538 Electoral College) & White House Chapter integrated into THE GENERAL (#hqP).
import { tiles, electors } from "./content/us.js";
import { newCareer, decide, election } from "./us-career.js";
import { unlockEnding } from "./endings.js";

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
  return `<div class="us-tiles">${tiles
    .join(" ")
    .split(" ")
    .map((code) => {
      if (code === "..") return `<span></span>`;
      const count = s.results?.[code];
      const val = count == null ? electors[code] : `${count}/${electors[code]}`;
      const swing =
        Math.abs((s.polls?.[code] ?? 20) + 2 * (s.visits[code] || 0)) < 6;
      const bg =
        count == null
          ? swing
            ? "#6b542b"
            : "#182838"
          : count === electors[code]
            ? "#1f6a52"
            : count
              ? "#7a6332"
              : "#5a3242";
      const sel = s.target === code ? " on" : "";
      return `<button class="us-st${sel}" data-usstate="${code}" style="background:${bg}" ${s.phase !== "campaign" ? "disabled" : ""}><b>${code}</b><small>${val}</small></button>`;
    })
    .join("")}</div>`;
}

export function usPresHTML() {
  const s = rd();
  if (!s) return "";
  const [title, desc, ...answers] = chapter(s);
  const voting = ["campaign", "debate", "night", "contingent"].includes(
    s.phase,
  );
  const inWH = s.term > 0 && s.phase !== "end" && s.phase !== "inauguration";
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
      <div class="mt"><span>지지율 (Trust)</span><b class="${s.trust >= 55 ? "g" : s.trust >= 40 ? "y" : "r"}">${s.trust}%</b></div>
      ${inWH ? `<div class="mt"><span>미 의회</span><b>하원 ${s.house}/435 · 상원 ${s.senate}/100</b><small>제정 법안 ${s.laws}건</small></div>` : `<div class="mt"><span>선거인단 과반</span><b>${s.results && s.phase !== "blackout" ? `${elecSum} / 538` : "270 / 538 필요"}</b></div>`}
    </div>
    <div class="mn-body us-campaign-grid">
      <div class="mn-col">
        <div class="mn-h">${inWH ? "백악관 결재판" : "선거 결재판"}</div>
        <div class="mn-card mn-dk mn-paper" style="border-color:${s.party === "red" ? "#e06464" : "#5da8e8"}">
          <div class="dh"><div class="dt"><small>미국 대선 · 백악관 회의록</small><b>${esc(title)}</b></div></div>
          <p>${esc(desc)}</p>
          ${s.serviceDecision && (s.phase === "declare" || (s.phase === "debate" && s.turn === 3)) ? `<p class="campaign-service-record"><b>인사기록 · ${esc(s.serviceDecision.date)}</b><br>${esc(s.serviceDecision.outcome)}</p>` : ""}
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">${btns || `<button class="mn-go" data-uspres="reset">↺ 새 대선 캠페인 시작</button>`}</div>
        </div>
      </div>
      <div class="mn-col">
        ${civicMap(s.phase === "crisis" && s.quarter % 2 ? "europe" : s.phase === "summit" && s.quarter === 4 ? "pacific" : "home")}
        ${voting ? `<div class="mn-card"><div class="mn-h">🗺️ 미국 538 선거인단 지도 <small>${s.phase === "campaign" ? (s.target ? `선택한 주: ${s.target} (${electors[s.target]}명)` : "경합주(황토색) 또는 원하는 주를 클릭하세요") : s.results ? `확보 선거인단 ${elecSum} / 538 (당선 기준 270)` : "투표 마감 후 집계"}</small></div>${tileMapHTML(s)}</div>` : ""}
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

export function usPresClick(act) {
  const s = rd();
  if (!s) return {};
  if (act === "reset") {
    usPresReset();
    usPresStart(s.name, 60);
    return { redraw: true, toast: "미국 대선 캠페인을 새로 시작합니다" };
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
    if (inaugurated) unlockEnding("us_potus");
    return {
      redraw: true,
      inaugurated,
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
  const prevTerm = s.term;
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
  if (inaugurated) unlockEnding("us_potus");
  return {
    redraw: true,
    inaugurated,
    toast: inaugurated ? "🇺🇸 [관리자] 미합중국 대통령 취임!" : "",
  };
}
