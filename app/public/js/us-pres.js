// U.S. Presidential Election (538 Electoral College) & White House Chapter integrated into THE GENERAL (#hqP).
import { parties, tiles, electors } from "./content/us.js";
import { newCareer, role, brief, choices, decide, election } from "./us-career.js";
import { unlockEnding } from "./endings.js";

const KEY = "steeltide:uspres";
const rd = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
const wr = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const usPresState = () => rd();
export function usPresStart(name, trust = 62) {
  let s = rd();
  if (s && s.phase !== "service") return s;
  s = newCareer();
  s.name = name || "Commander";
  s.phase = "party";
  s.trust = Math.max(45, Math.min(80, trust));
  s.log = [`🇺🇸 ${s.name} enters the U.S. Presidential race (538 Electoral College).`];
  wr(s);
  return s;
}
export function usPresReset() { try { localStorage.removeItem(KEY); } catch {} }

function tileMapHTML(s) {
  return `<div class="us-tiles">${tiles.join(" ").split(" ").map((code) => {
    if (code === "..") return `<span></span>`;
    const count = s.results?.[code];
    const val = count == null ? electors[code] : `${count}/${electors[code]}`;
    const swing = Math.abs((s.polls?.[code] ?? 20) + 2 * (s.visits[code] || 0)) < 6;
    const bg = count == null ? (swing ? "#6b542b" : "#182838") : count === electors[code] ? "#1f6a52" : count ? "#7a6332" : "#5a3242";
    const sel = s.target === code ? " on" : "";
    return `<button class="us-st${sel}" data-usstate="${code}" style="background:${bg}" ${s.phase !== "campaign" ? "disabled" : ""}><b>${code}</b><small>${val}</small></button>`;
  }).join("")}</div>`;
}

export function usPresHTML() {
  const s = rd();
  if (!s) return "";
  const [title, desc] = brief(s);
  const voting = ["campaign", "debate", "night", "contingent"].includes(s.phase);
  const inWH = s.term > 0 && s.phase !== "end";
  const elecSum = s.results ? Object.values(s.results).reduce((a, b) => a + b, 0) : 0;
  const phaseLbl = s.phase === "end" ? "Archive" : inWH ? `White House · Term ${s.term} Y${Math.ceil(s.quarter / 4)} Q${((s.quarter - 1) % 4) + 1}` : voting ? `General Election (${s.phase === "night" ? `${elecSum}/538` : `Stop ${s.turn + 1}/10`})` : s.phase === "primary" ? `Primary · Delegates ${s.delegates}/100` : "Nomination";
  const btns = choices(s).map((lbl, i) => {
    const dis = s.phase === "campaign" && !s.target;
    return `<button class="us-ch" data-uspres="c:${i}" ${dis ? "disabled" : ""}><b>${esc(lbl)}</b>${dis ? "<small>먼저 아래 538 선거인단 지도에서 유세할 주(State)를 선택하세요</small>" : ""}</button>`;
  }).join("");
  const bgStyle = inWH
    ? `background:linear-gradient(rgba(10,16,24,.76),rgba(8,12,18,.90)),url(img/bg/us_oval_office.jpg) center/cover`
    : `background:linear-gradient(rgba(10,16,24,.82),rgba(8,12,18,.92)),url(img/bg/us_capitol_hearing.jpg) center/cover`;

  return `<div class="mn dm-shell" style="${bgStyle}">
    <div class="mn-top dm-top">
      <div class="mt"><span>직책</span><b>${esc(role(s))}</b><small>${esc(parties[s.party] || "Independent / Pre-Party")}</small></div>
      <div class="mt"><span>단계</span><b>${esc(phaseLbl)}</b></div>
      <div class="mt"><span>지지율 (Trust)</span><b class="${s.trust >= 55 ? "g" : s.trust >= 40 ? "y" : "r"}">${s.trust}%</b></div>
      ${inWH ? `<div class="mt"><span>미 의회</span><b>하원 ${s.house}/435 · 상원 ${s.senate}/100</b><small>제정 법안 ${s.laws}건</small></div>` : `<div class="mt"><span>선거인단 과반</span><b>${s.results ? `${elecSum} / 538` : "270 / 538 필요"}</b></div>`}
    </div>
    <div class="dm-grid" style="grid-template-columns:minmax(0,1fr) 260px">
      <div class="dm-main">
        <div class="mn-card mn-dk mn-paper" style="border-color:${s.party === "red" ? "#e06464" : "#5da8e8"}">
          <div class="dh"><div class="dt"><small>🇺🇸 U.S. PRESIDENTIAL CAMPAIGN &amp; WHITE HOUSE</small><b>${esc(title)}</b></div></div>
          <p>${esc(desc)}</p>
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">${btns || `<button class="mn-go" data-uspres="reset">↺ 새 대선 캠페인 시작</button>`}</div>
        </div>
        ${voting ? `<div class="mn-card"><div class="mn-h">🗺️ 미국 538 선거인단 지도 <small>${s.phase === "campaign" ? (s.target ? `선택한 주: ${s.target} (${electors[s.target]}명)` : "경합주(황토색) 또는 원하는 주를 클릭하세요") : `확보 선거인단 ${elecSum} / 538 (당선 기준 270)`}</small></div>${tileMapHTML(s)}</div>` : ""}
      </div>
      <aside class="dm-side">
        <div class="mn-card dm-news"><div class="mn-h">📰 Washington Dispatch</div>${(s.log || []).slice(0, 10).map((l) => `<small>• ${esc(l)}</small>`).join("") || "<small>캠페인을 시작합니다.</small>"}</div>
      </aside>
    </div>
  </div>`;
}

export function usPresClick(act) {
  const s = rd();
  if (!s) return {};
  if (act === "reset") { usPresReset(); usPresStart(s.name, 60); return { redraw: true, toast: "미국 대선 캠페인을 새로 시작합니다" }; }
  if (act.startsWith("state:")) { s.target = act.slice(6); wr(s); return { redraw: true }; }
  if (act.startsWith("c:")) {
    const prevTerm = s.term;
    decide(s, +act.slice(2), Math.random);
    wr(s);
    const inaugurated = prevTerm === 0 && s.term === 1;
    if (inaugurated) unlockEnding("us_potus");
    return { redraw: true, inaugurated, toast: inaugurated ? "🇺🇸 미합중국 대통령(POTUS)에 취임했습니다! (Hail to the Chief)" : "" };
  }
  return {};
}

export function usPresAdmin(id) {
  const s = rd();
  if (!s) return {};
  const prevTerm = s.term;
  if (id === "pri") { if (!s.party) s.party = "blue"; s.delegates = 75; s.phase = "convention"; decide(s, 0, Math.random); }
  if (id === "night" || id === "win" || id === "loss") {
    s.phase = "night"; s.results = election(s, Math.random);
    if (id !== "night") { for (const k in electors) s.results[k] = id === "win" ? electors[k] : 0; decide(s, 0, Math.random); }
  }
  if (id === "seats") { s.house = s.house > 217 ? 190 : 300; s.senate = s.senate > 50 ? 32 : 70; }
  if (id === "qtr") { if (s.quarter < 16) { s.quarter++; s.phase = "cabinet"; } else if (s.term === 1) s.phase = "renew"; else { s.ending = "Presidential retirement"; s.phase = "end"; } }
  if (id === "end") { s.phase = "end"; s.ending = "Presidential retirement"; }
  wr(s);
  const inaugurated = prevTerm === 0 && s.term === 1;
  if (inaugurated) unlockEnding("us_potus");
  return { redraw: true, inaugurated, toast: inaugurated ? "🇺🇸 [관리자] 미합중국 대통령 취임!" : "" };
}
