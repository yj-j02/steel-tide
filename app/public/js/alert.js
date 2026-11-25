/* 비상사태 연출 (A): 합동 워룸·합동 위기·긴급 NSC가 실제로 열릴 때만 화면 전체 경보를 띄운다.
   같은 사건은 한 번만 띄우고(키로 기억), 인사기록에 남길 '위기 대응 기록'도 여기서 쌓는다. */
import { careerStorage } from "./characters.js";

const SEEN = "steeltide:alertSeen";
const LOG = "steeltide:crisisLog";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function seenSet() { try { return JSON.parse(careerStorage.getItem(SEEN)) || []; } catch { return []; } }
export function crisisLog() { try { return JSON.parse(careerStorage.getItem(LOG)) || []; } catch { return []; } }
export function addCrisisLog(entry) {
  const L = crisisLog();
  L.unshift({ t: Date.now(), ...entry });
  try { careerStorage.setItem(LOG, JSON.stringify(L.slice(0, 40))); } catch { /* 저장 불가 */ }
}

/**
 * 경보를 띄운다. key가 이미 본 사건이면 아무것도 하지 않는다.
 * level: "defcon"(워룸·전시) | "crisis"(합동 위기) | "nsc"(장관·대통령 긴급 회의)
 */
export function emergencyAlert({ key, level = "crisis", title, sub = "", lines = [], who = "", when = "", us = false, onClose } = {}) {
  if (!key || typeof document === "undefined") return false;
  const seen = seenSet();
  if (seen.includes(key)) return false;
  seen.push(key);
  try { careerStorage.setItem(SEEN, JSON.stringify(seen.slice(-80))); } catch { /* 저장 불가 */ }
  addCrisisLog({ level, title, when, who });
  document.querySelector("#emAlert")?.remove();
  const tag = level === "defcon" ? (us ? "DEFCON 2 · JOINT WAR ROOM" : "DEFCON 2 · 합동 워룸 가동") : level === "nsc" ? (us ? "NSC EMERGENCY SESSION" : "긴급 국가안전보장회의") : (us ? "JOINT CRISIS ALERT" : "합동 위기 경보");
  const el = document.createElement("div");
  el.id = "emAlert";
  el.className = `em-alert em-${level}`;
  el.setAttribute("role", "alertdialog");
  el.innerHTML = `<div class="em-scan"></div><div class="em-frame">
    <div class="em-tag"><i></i>${esc(tag)}<i></i></div>
    <h2>${esc(title)}</h2>
    ${sub ? `<p class="em-sub">${esc(sub)}</p>` : ""}
    ${lines.length ? `<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}
    <div class="em-meta">${when ? `<span>${esc(when)}</span>` : ""}${who ? `<span>${esc(who)}</span>` : ""}<span>${us ? "Respond this week" : "이번 주 안 대응 필요"}</span></div>
    <button type="button" class="em-go">${us ? "To the situation room ▶" : "상황실로 이동 ▶"}</button>
  </div>`;
  document.body.appendChild(el);
  import("./sfx.js").then((m) => m.sfxSiren()).catch(() => {}); /* 노드 시뮬레이션에서 오디오 모듈을 불러오지 않도록 지연 로드 */
  const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 260); document.removeEventListener("keydown", onKey, true); onClose?.(); };
  function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); close(); } }
  el.querySelector(".em-go").addEventListener("click", close);
  document.addEventListener("keydown", onKey, true);
  el.querySelector(".em-go").focus?.();
  return true;
}
