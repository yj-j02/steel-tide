/* 화면 설정 (D): 글자 크기. 캐릭터와 무관하게 브라우저 단위로 기억한다.
   (UI 테마 여러 종은 2026-11-25 시안으로만 검토하고 게임에는 넣지 않기로 함 — 결재 서류 테마 하나만 사용) */
export const FONT_SIZES = [["m", "보통"], ["l", "크게"], ["xl", "아주 크게"]];
const KEY = "steeltide:ui";

export function uiPrefs() {
  try { const v = JSON.parse(localStorage.getItem(KEY)) || {}; return { fs: FONT_SIZES.some((f) => f[0] === v.fs) ? v.fs : "m" }; } catch { return { fs: "m" }; }
}
export function applyUiPrefs(p = uiPrefs()) {
  if (typeof document === "undefined") return;
  for (const [k] of FONT_SIZES) document.body.classList.toggle(`fs-${k}`, p.fs === k && k !== "m");
}
export function setUiPref(k, v) {
  const p = { ...uiPrefs(), [k]: v };
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* 저장 불가 */ }
  applyUiPrefs(p);
  return p;
}
