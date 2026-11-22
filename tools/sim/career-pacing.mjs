import assert from "node:assert/strict";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const { career, saveCareer } = await import("../../app/public/js/career.js");
const { setNation, setBranch, careerTitle } = await import("../../app/public/js/staff.js");
const { recordEval, addRankWeek, minWeeks, minBattles } = await import("../../app/public/js/service.js");
const { preview, settle, automaticCaptain } = await import("../../app/public/js/promotion-board.js");
const { ensureDuty, nextDutyWeek, dutyState, saveDuty } = await import("../../app/public/js/duty.js");
const { careerMonths, serviceDuration } = await import("../../app/public/js/service-calendar.js");
const { serviceStatus } = await import("../../app/public/js/service-rules.js");

const RANKS = ["소위", "중위", "대위", "소령", "중령", "대령", "준장", "소장", "중장", "대장"];

// 1. Test full 0 -> 9 rank-by-year promotion feasibility under KR & US statutory retirement limits
for (const nat of ["kr", "us"]) {
  store.clear();
  for (const k of Object.keys(career)) delete career[k];
  Object.assign(career, { log: [], medals: { commend: 1, service: 1, inheon: 1, samil: 1, cheonsu: 1, eulji: 1 }, evals: {}, rankWeeks: {}, boardHistory: [], boardWaits: [], crisisWins: {}, tours: { cmd: true, joint: true, edu: true } });
  setNation(nat);
  setBranch("inf");
  const d = ensureDuty("army", 0, careerTitle(0, "inf"));
  d.rep = 88;
  d.morale = 84;
  let g = 0, turn = 1;
  const yearsLog = [];

  while (g < 9) {
    const needW = minWeeks(g), needB = minBattles(g);
    for (let i = 0; i < needW; i++) { addRankWeek(g, 1); turn++; }
    for (let i = 0; i < needB; i++) recordEval(g, g < 6 ? 88 : 92);
    career.crisisWins[g] = g >= 6 ? 2 : 1;
    d.week = turn;
    saveDuty(d);
    const st = serviceStatus({ us: nat === "us", grade: g, turn, service: "army", branch: "inf", rep: d.rep, average: 90, record: career });
    assert.equal(st.due, false, `${nat} hit mandatory retirement at rank ${RANKS[g]} (${serviceDuration(st.elapsed)})`);

    const title = careerTitle(g, "inf");
    const pv = preview(g, g + 1, title, "inf", "army", d);
    if (!automaticCaptain(g)) {
      assert.ok(pv.score >= pv.cutoff, `${nat} ${RANKS[g]}->${RANKS[g + 1]} score ${pv.score} < cutoff ${pv.cutoff}`);
    }
    const res = settle(g, g + 1, title, "inf", "army", pv.vacant?.[0]?.t);
    assert.ok(res?.passed, `${nat} failed board at ${RANKS[g]}->${RANKS[g + 1]}`);
    g++;
    const m = careerMonths(turn, career.rankWeeks);
    yearsLog.push(`${RANKS[g]}(${(m / 12).toFixed(1)}년차)`);
  }
  console.log(`[${nat.toUpperCase()} 연차별 진급 검증 통과] ${yearsLog.join(" → ")}`);
}

// 2. Test independent classmate progression & branch-specific civilian retirement even when player stalls at Captain (g=2)
store.clear();
for (const k of Object.keys(career)) delete career[k];
Object.assign(career, { log: [], medals: {}, evals: {}, rankWeeks: { 0: 10, 1: 10, 2: 10 }, boardHistory: [], boardWaits: [], crisisWins: {}, tours: {} });
setNation("kr");
setBranch("plt");
const d2 = ensureDuty("air", 2, careerTitle(2, "plt"));
assert.equal(d2.rivals.length, 5, "must have 5 classmates");
for (let t = 0; t < 110; t++) {
  nextDutyWeek("air", 2, careerTitle(2, "plt"));
}
const finalRivals = dutyState().rivals;
const maxRivalGrade = Math.max(...finalRivals.map((r) => r.g));
const retiredRivals = finalRivals.filter((r) => r.retired);
assert.ok(maxRivalGrade >= 5, `expected at least one classmate to advance independently past player (g=2) to COL+, got maxG=${maxRivalGrade}`);
console.log("[동기 5명 독립 진급·전역 시뮬레이션 결과 (플레이어 대위 정체 110주)]:");
for (const r of finalRivals) {
  console.log(`  - ${r.name} [${r.style}] : ${r.retired ? `전역(${RANKS[r.g]}) → ${r.retiredPost}` : `현역 ${RANKS[r.g]} · ${r.post}`}`);
}
console.log(`Career pacing & independent 5-classmate simulation passed (maxRival=${RANKS[maxRivalGrade]}, retired=${retiredRivals.length}).`);
