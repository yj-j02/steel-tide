// 근무평정 (service evaluation) and 보직 (posting) rotation. Each battle is scored 0–100 with the
// weights of the branch you currently serve in; reaching the XP for the next rank makes you eligible,
// and the promotion board (진급 심사) then needs enough battles at this rank and a passing average.
// Kept in the career store (localStorage) — the economy server still owns XP and money.
import { career, saveCareer } from "./career.js";

/** What each branch's evaluation weighs most (shown on the posting cards and in 내 정보). */
export const FOCUS = {
  sea: { n: "함정", f: "격침 전과 · 함 생존", k: { win: 1, hp: 1.2, loss: 1, eff: 1.35 } },
  ops: { n: "작전", f: "임무 완수 · 신속한 작전", k: { win: 1.3, hp: 0.9, loss: 1, eff: 1 }, fast: true },
  int: { n: "정보", f: "피해 최소화 · 조기 탐지", k: { win: 1, hp: 1.5, loss: 1.1, eff: 0.85 } },
  log: { n: "군수", f: "아군 손실 최소화 · 지속 전투력", k: { win: 1, hp: 1.1, loss: 1.6, eff: 0.8 } },
  air: { n: "항공", f: "항공 전력 운용 · 타격", k: { win: 1, hp: 0.9, loss: 1, eff: 1.15 }, jets: true },
};
export const PASS = 55; /* B or better */
export const minBattles = (g) => (g <= 2 ? 1 : g <= 5 ? 2 : 3);
export const letter = (s) => (s >= 85 ? "S" : s >= 70 ? "A" : s >= PASS ? "B" : s >= 40 ? "C" : "D");

/** m: { won, hp (0–1), sunk, foes, lost, allies, secs, jetsOut }. Returns { s, parts }. */
export function scoreBattle(m, branch) {
  const F = FOCUS[branch] || FOCUS.sea, k = F.k;
  const parts = {
    win: (m.won ? 35 : 0) * k.win,
    hp: 20 * Math.max(0, Math.min(1, m.hp)) * k.hp,
    loss: 15 * (m.allies ? 1 - m.lost / m.allies : 1) * k.loss,
    eff: 30 * (m.foes ? m.sunk / m.foes : 0) * k.eff,
  };
  if (F.fast && m.won && m.secs < 480) parts.bonus = 6;
  if (F.jets) parts.bonus = m.jetsOut > 0 ? 8 : -6;
  const top = 35 * k.win + 20 * k.hp + 15 * k.loss + 30 * k.eff; /* normalise so every branch tops out at 100 */
  const raw = Object.values(parts).reduce((a, b) => a + b, 0);
  return { s: Math.round(Math.max(0, Math.min(100, (raw / top) * 100))), parts };
}

const st = () => { career.evals ||= {}; career.defer ||= 0; return career; };
export function recordEval(g, s) { const c = st(); (c.evals[g] ||= []).push(s); if (c.evals[g].length > 20) c.evals[g].shift(); saveCareer(); }
export function evalOf(g) { const L = st().evals[g] || [], avg = L.length ? Math.round(L.reduce((a, b) => a + b, 0) / L.length) : 0; return { n: L.length, avg, l: L.length ? letter(avg) : "—" }; }

/** The promotion board for the next rank. xpGrade: the rank your XP alone would give. */
export function board(g, xpGrade) {
  const e = evalOf(g), need = minBattles(g);
  const xp = xpGrade > g, cnt = e.n >= need, score = e.n > 0 && e.avg >= PASS;
  return { ok: xp && cnt && score, xp, cnt, score, need, e };
}
/** Run the board after a battle: on a pass the approved grade (cap) goes up one step. */
export function runBoard(g, xpGrade) {
  const b = board(g, xpGrade), c = st();
  if (!b.xp) return { ...b, promoted: false };
  if (b.ok) { c.cap = g + 1; c.defer = 0; saveCareer(); return { ...b, promoted: true }; }
  c.defer++; saveCareer(); return { ...b, promoted: false };
}
export function setCap(g) { st().cap = g; career.defer = 0; saveCareer(); }
/** 7: a light warning when the board keeps passing you over. */
export const deferNote = () => (st().defer >= 3 ? `진급 심사 ${career.defer}회 연속 보류 — 평정을 끌어올리지 못하면 진급 적체로 분류됩니다` : "");
