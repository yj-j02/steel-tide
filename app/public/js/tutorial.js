/* 첫 플레이 튜토리얼 (C): 대상 요소를 강조하고 말풍선을 한 단계씩 보여 준다.
   한 번 끝내거나 건너뛰면 다시 뜨지 않는다(키 단위로 기억). */
import { careerStorage } from "./characters.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const DONE = (k) => `steeltide:tour:${k}`;

export const tourDone = (key) => { try { return careerStorage.getItem(DONE(key)) === "1"; } catch { return true; } };
export function resetTour(key) { try { careerStorage.removeItem(DONE(key)); } catch { /* 저장 불가 */ } }

/* 임관장·진급 명령서·장면 연출·경보·청문회 같은 창이 떠 있으면 튜토리얼을 미룬다 */
const BLOCKERS = ["#promoM", "#emAlert", "#hearingOv", "#summitOv", "#balOv", "#scene2d", "#setM", "dialog[open]", ".la-modal"];
export function tourBlocked() {
  if (typeof document === "undefined") return true;
  return BLOCKERS.some((sel) => [...document.querySelectorAll(sel)].some((el) => {
    if (el.closest("#tourLayer")) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0.05 && el.getClientRects().length > 0;
  }));
}
const waiting = new Set();

/** steps: [{ sel, title, text }] — 화면에 없는 대상은 건너뛴다. 다른 창이 떠 있으면 닫힐 때까지 기다린다. */
export function startTour(key, steps) {
  if (typeof document === "undefined" || tourDone(key) || document.querySelector("#tourLayer")) return false;
  if (tourBlocked()) {
    if (waiting.has(key)) return false;
    waiting.add(key);
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      if (tourBlocked() && tries < 400) return;
      clearInterval(t); waiting.delete(key);
      if (tries < 400) setTimeout(() => startTour(key, steps), 350);
    }, 600);
    return false;
  }
  const live = steps.filter((s) => document.querySelector(s.sel));
  if (!live.length) return false;
  let i = 0;
  const layer = document.createElement("div");
  layer.id = "tourLayer";
  layer.innerHTML = `<div class="tour-ring"></div><div class="tour-tip" role="dialog" aria-live="polite"></div>`;
  document.body.appendChild(layer);
  const ring = layer.querySelector(".tour-ring"), tip = layer.querySelector(".tour-tip");
  const finish = () => { try { careerStorage.setItem(DONE(key), "1"); } catch { /* 저장 불가 */ } layer.remove(); window.removeEventListener("resize", place); document.removeEventListener("keydown", onKey, true); };
  function place() {
    const s = live[i], el = document.querySelector(s.sel);
    if (!el) return finish();
    el.scrollIntoView({ block: "center", behavior: "instant" });
    const r = el.getBoundingClientRect(), pad = 6;
    Object.assign(ring.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    tip.innerHTML = `<small>${i + 1} / ${live.length}</small><b>${esc(s.title)}</b><p>${esc(s.text)}</p><div><button type="button" data-tour="skip">건너뛰기</button><button type="button" data-tour="next" class="on">${i === live.length - 1 ? "시작하기" : "다음 ▶"}</button></div>`;
    const tw = Math.min(320, window.innerWidth - 24), below = r.bottom + 14 + 170 < window.innerHeight;
    const left = Math.max(12, Math.min(window.innerWidth - tw - 12, r.left + r.width / 2 - tw / 2));
    Object.assign(tip.style, { width: `${tw}px`, left: `${left}px`, top: below ? `${r.bottom + 14}px` : "auto", bottom: below ? "auto" : `${window.innerHeight - r.top + 14}px` });
    tip.querySelector("[data-tour=next]").focus();
  }
  function onKey(e) {
    if (layer.style.visibility === "hidden") return;
    if (e.key === "Escape") { e.stopPropagation(); finish(); }
    else if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); tip.querySelector("[data-tour=next]")?.click(); }
  }
  tip.addEventListener("click", (e) => {
    const b = e.target.closest("[data-tour]"); if (!b) return;
    if (b.dataset.tour === "skip") return finish();
    i += 1; if (i >= live.length) finish(); else place();
  });
  window.addEventListener("resize", place);
  document.addEventListener("keydown", onKey, true);
  const guard = setInterval(() => { if (!layer.isConnected) return clearInterval(guard); const b = tourBlocked(), wasHidden = layer.style.visibility === "hidden"; layer.style.visibility = b ? "hidden" : ""; if (!b && wasHidden) place(); }, 700);
  place();
  return true;
}
