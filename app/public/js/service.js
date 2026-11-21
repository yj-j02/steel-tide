import { careerStorage } from "./characters.js";
// 근무평정 (service evaluation) and 보직 (posting) rotation. Each battle is scored 0–100 with the
// weights of the branch you currently serve in; reaching the XP for the next rank makes you eligible,
// and the promotion board (진급 심사) then needs enough battles at this rank and a passing average.
// Kept in the career store (careerStorage) — the economy server still owns XP and money.
import { career, saveCareer } from "./career.js";

/** What each branch's evaluation weighs most (shown on the posting cards and in 내 정보). */
export const FOCUS = {
  inf: { n: "보병·특수전", f: "위기 방어 · 부대 생존", k: { win: 1.2, hp: 1.3, loss: 1.2, eff: 0.9 } },
  arm: { n: "기갑·기동", f: "기동 돌파 · 격멸 전과", k: { win: 1.25, hp: 0.95, loss: 1, eff: 1.3 }, fast: true },
  art: { n: "포병·방공", f: "화력 투사 · 즉각 응징", k: { win: 1.1, hp: 1, loss: 1, eff: 1.4 } },
  eng: { n: "공병", f: "시설 복구 · 자재 및 일정 관리", k: { win: 1, hp: 1, loss: 1, eff: 1 } },
  sea: { n: "수상함", f: "격침 전과 · 함 생존", k: { win: 1, hp: 1.2, loss: 1, eff: 1.35 } },
  sub: { n: "잠수함", f: "은밀 기습 · 피해 최소화", k: { win: 1.1, hp: 1.45, loss: 1.1, eff: 1.05 } },
  mar: { n: "해상항공·해병", f: "항공 정찰 · 도서 방어", k: { win: 1.05, hp: 0.95, loss: 1, eff: 1.15 }, jets: true },
  plt: { n: "전투조종", f: "제공권 장악 · 정밀 타격", k: { win: 1.1, hp: 0.9, loss: 1, eff: 1.2 }, jets: true },
  sam: { n: "방공유도탄", f: "완벽 요격 · 피해 차단", k: { win: 1, hp: 1.5, loss: 1.2, eff: 0.85 } },
  tac: { n: "전술통제·정보", f: "조기 탐지 · 합동 조율", k: { win: 1.2, hp: 1.2, loss: 1.15, eff: 0.95 }, fast: true },
  acq: { n: "방산·전력획득", f: "손실 최소화 · 지속 전투력", k: { win: 1, hp: 1.1, loss: 1.6, eff: 0.85 } },
  pol: { n: "정보·외교·정책", f: "임무 완수 · 전략적 안정", k: { win: 1.3, hp: 1.2, loss: 1.2, eff: 0.85 } },
};
export const PASS = 55; /* B or better */
export const minWeeks = () => 10;
export const minBattles = (g) => (g <= 2 ? 10 : g <= 5 ? 12 : 14);
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

const st = () => { career.evals ||= {}; career.rankWeeks ||= {}; career.defer ||= 0; return career; };
export function recordEval(g, s) { const c = st(); (c.evals[g] ||= []).push(s); if (c.evals[g].length > 30) c.evals[g].shift(); saveCareer(); }
export function evalOf(g) { const L = st().evals[g] || [], avg = L.length ? Math.round(L.reduce((a, b) => a + b, 0) / L.length) : 0; return { n: L.length, avg, l: L.length ? letter(avg) : "—" }; }
export function weeksOf(g) { return st().rankWeeks[g] || 0; }
export function addRankWeek(g, n = 1) { const c = st(); c.rankWeeks[g] = (c.rankWeeks[g] || 0) + n; saveCareer(); return c.rankWeeks[g]; }

/** The promotion board for the next rank. xpGrade: the rank your XP alone would give. */
export function board(g, xpGrade) {
  const e = evalOf(g), need = minBattles(g), needWk = minWeeks(g), weeks = weeksOf(g);
  if (g >= 9) return { ok: false, xp: false, wk: weeks >= 10, needWk: 10, weeks, cnt: false, score: false, need: 5, e, special: true }; /* 원수(10)는 특별진급 퀘스트로만 진급 */
  const xp = xpGrade > g, wk = weeks >= needWk, cnt = e.n >= need, score = e.n > 0 && e.avg >= PASS;
  return { ok: xp && wk && cnt && score, xp, wk, needWk, weeks, cnt, score, need, e };
}
/** 원수(5성) 특별진급 퀘스트 조건: 대장 평정 S(85+)·5회 + 위기 직접 지휘 대승 3회 + 군내 평판 85+ & 대장 복무 10주 */
export function marshalQuest(profile, grade, rep = 0) {
  const e9 = evalOf(9), wins = career.marshalWins || 0, w9 = weeksOf(9);
  const c1 = grade >= 9 && e9.n >= 5 && e9.avg >= 85, c2 = wins >= 3, c3 = rep >= 85 && w9 >= 10;
  return { ok: c1 && c2 && c3, c1, c2, c3, e9, wins, rep, w9 };
}

export function setCap(g) { st().cap = g; career.defer = 0; career.discharged = null; saveCareer(); }
/** 7: a light warning when the board keeps passing you over (never reveals hidden posting tier). */
export const deferNote = () => (st().defer >= 2 ? `진급 심사 ${career.defer}회 연속 누락 — 다음 심사에서도 누락되면 계급정년으로 전역하게 됩니다` : st().defer === 1 ? "진급 심사 1회 누락 — 보직 경력과 근무평정을 끌어올려야 합니다" : "");
