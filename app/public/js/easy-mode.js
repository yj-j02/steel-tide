/* 쉬운 모드 — 처음 접속한 사람만 그 접속(탭을 닫기 전까지) 동안 진급이 빠르게 진행된다.
   - 이 브라우저에 steeltide 저장 데이터가 하나도 없고 방문 기록(steeltide:visit)도 없으면 '첫 접속'.
   - 같은 탭에서 새로고침해도 유지(sessionStorage). 탭을 닫거나 다음에 다시 접속하면 일반 규칙으로 돌아간다.
   - 기존 플레이어(저장 데이터가 이미 있음)는 첫 접속으로 치지 않는다. Node 시뮬레이션에서는 항상 꺼져 있다. */
const VISIT = "steeltide:visit", SESSION = "steeltide:easy-session";

function decide() {
  try {
    if (sessionStorage.getItem(SESSION) === "1") return true;
    if (localStorage.getItem(VISIT)) return false;
    const existing = Object.keys(localStorage).some((k) => k.startsWith("steeltide:"));
    localStorage.setItem(VISIT, JSON.stringify({ first: Date.now() }));
    if (existing) return false;
    sessionStorage.setItem(SESSION, "1");
    return true;
  } catch { return false; }
}

export const easy = { on: decide() };

/* 쉬운 모드는 '처음 만든 캐릭터' 한 명에게만 적용한다. 두 번째 캐릭터를 만들면 그 자리에서 일반 모드로 돌아간다. */
const USED = "steeltide:easy-used";
export function endEasy() {
  easy.on = false;
  try { sessionStorage.removeItem(SESSION); sessionStorage.removeItem(USED); } catch { /* 저장 불가 */ }
}
export function easyOnCharacterCreated() {
  if (!easy.on) return;
  try {
    if (sessionStorage.getItem(USED)) endEasy();   /* 두 번째 캐릭터부터는 일반 */
    else sessionStorage.setItem(USED, "1");        /* 첫 캐릭터: 쉬운 모드 유지 */
  } catch { /* 저장 불가 */ }
}
/** 이미 캐릭터가 둘 이상인데 쉬운 모드가 남아 있으면 끈다 (이전 버전에서 만든 경우) */
export function easyCheckExisting(count) { if (easy.on && count > 1) endEasy(); }
/** 쉬운 모드에서 줄어드는 값: 계급 최소 복무 주, 필요 평정 횟수, 심사 커트라인 */
export const EASY = { weeks: 4, battleScale: 0.5, cutoff: 6 };
