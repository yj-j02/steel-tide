import assert from "node:assert/strict";
const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};
const { career } = await import("../../app/public/js/career.js");
const { dutyState, saveDuty, nextDutyWeek } =
  await import("../../app/public/js/duty.js");
const { boardCard, preview, settle, interact } =
  await import("../../app/public/js/promotion-board.js");
const { curFlagPosts, flagPostsForTrack, curBranches, staff } =
  await import("../../app/public/js/staff.js");
const { usPresStart, usPresClick, usPresHTML, usPresState, usPresAdmin } =
  await import("../../app/public/js/us-pres.js");
function fixture(g, week, score = 100) {
  Object.assign(career, {
    cap: g,
    defer: 0,
    boardHistory: [],
    boardWaits: [],
    rankWeeks: { [g]: week - 1 },
    evals: { [g]: Array(14).fill(score) },
    tours: {},
    crisisWins: {},
    medals: {},
    discharged: null,
  });
  saveDuty({ ...dutyState(), rivals: [], rep: 100, week, doneWeek: true });
}
const args = (g) => [g, g + 1, "Company Commander", "inf", "army"];
const { ensureDuty } = await import("../../app/public/js/duty.js");
fixture(0, 1);
saveDuty({ ...dutyState(), rivals: null });
ensureDuty("army", 0);
for (let i = 1; i <= 29; i++) {
  nextDutyWeek("army", 0);
  assert.ok(ensureDuty("army", 0).rivals.every((r) => r.g === 0));
}
assert.equal(dutyState().week, 30);
assert.equal(settle(...args(0)).passed, true);
assert.ok(dutyState().rivals.every((r) => r.g === 1 && r.rankSinceWeek === 30));
assert.equal(settle(...args(0)), null);
fixture(3, 33);
saveDuty({
  ...dutyState(),
  rivals: [
    { name: "A", g: 3, rankSinceWeek: 30 },
    { name: "B", g: 3, rankSinceWeek: 21 },
  ],
});
assert.deepEqual(
  preview(...args(3)).rivals.map((r) => r.name),
  ["B"],
);
for (let g = 0; g < 9; g++) {
  fixture(g, 42);
  career.rankWeeks[g] = 9;
  assert.equal(preview(...args(g)).ready, false);
  career.rankWeeks[g] = 10;
  assert.equal(preview(...args(g)).ready, true);
}
fixture(3, 30, 55);
assert.equal(settle(...args(3)).passed, false);
for (const week of [31, 32, 33, 34]) {
  saveDuty({ ...dutyState(), week });
  assert.equal(preview(...args(3)).ready, week === 34);
}
fixture(0, 13);
assert.equal(preview(0, 0, "Company Commander", "inf", "army").ready, false);
assert.equal(settle(...args(0)).passed, true);
assert.equal(settle(...args(0)), null);
fixture(3, 13, 55);
for (const week of [13, 17, 21]) {
  saveDuty({ ...dutyState(), week });
  assert.equal(settle(...args(3)).passed, false);
  assert.equal(settle(...args(3)), null);
}
assert.equal(career.discharged, null);
assert.equal(career.defer, 3);
fixture(5, 17);
saveDuty({
  ...dutyState(),
  rivals: curFlagPosts()
    .filter((p) => p.g === 6)
    .map((p) => ({ g: 6, post: p.t })),
});
assert.equal(settle(...args(5)), null);
assert.equal(career.defer, 0);
const vacancyArgs = [...args(5), dutyState(), 60000];
assert.match(boardCard(...vacancyArgs), /공석 대기/);
boardCard(...vacancyArgs);
assert.equal(career.boardWaits.length, 1);
assert.equal(career.boardHistory.length, 0);

fixture(3, 17);
interact("study", 3);
nextDutyWeek("army", 3);
nextDutyWeek("army", 3);
assert.equal(career.tours.edu, true);
staff.nation = "us";
const { dutyHistory, representativeDecision } =
  await import("../../app/public/js/career-timeline.js");
const legacyDuty = { openingChoices: { eng: { 1: 1, 2: 0 } } };
assert.equal(dutyHistory(legacyDuty)[0].nextPoints, -4);
assert.ok(dutyHistory(legacyDuty)[0].followupCompleted);
assert.equal(representativeDecision(legacyDuty).title, "현장 조사");
saveDuty({ ...dutyState(), ...legacyDuty });
const { minStart, minClick, minState, minHTML } =
  await import("../../app/public/js/ministry.js");
minStart("테스트");
for (let i = 0; i < 36; i++) {
  const m = minState();
  assert.equal(m.week, i + 1);
  for (const id of m.docket) {
    assert.ok(id.startsWith("us-"));
    minClick("dk:" + id + ":1");
  }
  for (const key of Object.keys(m.war.areas)) minClick("del:" + key);
  minClick("next");
}
assert.ok(minState().retired);
assert.ok(minHTML().includes('data-uspres="start"'));
usPresStart("테스트", minState().term.avg, minState());
assert.ok(usPresHTML().includes("36주간의 장관 임기"));
for (let i = 0; i < 4; i++) usPresClick("c:0");
assert.equal(usPresState().phase, "party");
usPresClick("c:0");
assert.equal(usPresState().phase, "declare");
assert.match(usPresHTML(), /현장 조사/);
usPresClick("c:0");
usPresAdmin("pri");
for (let i = 0; i < 13; i++) {
  const s = usPresState();
  assert.ok(!usPresHTML().includes("undefined"));
  if (s.phase === "campaign") usPresClick("state:PA");
  usPresClick("c:0");
}
assert.equal(usPresState().phase, "blackout");
usPresClick("c:0");
assert.equal(usPresState().phase, "night");
const { electors } = await import("../../app/public/js/content/us.js");
const savedElection = usPresState();
savedElection.results = { ...electors };
localStorage.setItem("steeltide:uspres", JSON.stringify(savedElection));
assert.equal(usPresClick("c:0").inaugurated, false);
assert.equal(usPresState().phase, "inauguration");
assert.match(usPresHTML(), /us_potus_mark/);
assert.equal(usPresClick("c:0").inaugurated, true);
assert.equal(usPresState().phase, "cabinet");
for (let i = 0; i < 160 && usPresState().phase !== "end"; i++) {
  assert.ok(!usPresHTML().includes("undefined"));
  usPresClick(usPresState().phase === "renew" ? "c:1" : "c:0");
}
assert.equal(usPresState().phase, "end");
console.log(
  "Board seasons, repeated non-selection, vacancies, education, campaign, presidential term passed.",
);

const { careerDate, rankMonths } =
  await import("../../app/public/js/service-calendar.js");
assert.equal(careerDate(1, {}), careerDate(2, { 0: 1 }));
assert.equal(careerDate(7, {}), "복무 2년차 · 겨울");
assert.equal(careerDate(11, { 0: 10 }), "복무 3년차 · 겨울");
assert.equal(rankMonths(2, 10), 48);
const { US_BRANCHES, US_FLAG_POSTS } =
  await import("../../app/public/js/us-ranks.js");
const { koreanPostName } =
  await import("../../app/public/js/us-post-labels.js");
for (const branch of Object.values(US_BRANCHES)) {
  for (const post of [branch.n, ...branch.t])
    assert.notEqual(koreanPostName(post), post);
}
for (const post of US_FLAG_POSTS)
  assert.notEqual(koreanPostName(post.t), post.t);

for (const nation of ["kr", "us"]) {
  staff.nation = nation;
  for (const [branch, track] of Object.entries(curBranches())) {
    assert.equal(track.t.length, 11);
    const service = track.svc === "joint" ? "army" : track.svc;
    for (let grade = 6; grade <= 9; grade++) {
      const continuation = flagPostsForTrack(grade, branch, service)[0];
      assert.equal(continuation.t, track.t[grade]);
      assert.equal(continuation.b, branch);
    }
  }
  fixture(1, 22, 50);
  career.rankWeeks[1] = 10;
  career.boardHistory.push({ grade: 1, week: 22, passed: false, season: 1 });
  assert.equal(preview(1, 1, "시설복구장교", "eng", "army").ready, false);
  assert.equal(
    settle(1, 2, "시설복구장교", "eng", "army").reason,
    "대위 자동진급",
  );
  assert.equal(career.cap, 2);
  assert.equal(settle(1, 2, "시설복구장교", "eng", "army"), null);
  fixture(2, 35, 75);
  career.medals = { commend: true, service: true, chungmu: true };
  saveDuty({ ...dutyState(), morale:100, rep:100 });
  const routine = preview(...args(2));
  assert.equal(routine.cutoff, 73);
  assert.ok(routine.score < routine.cutoff);
  assert.equal(settle(...args(2)).passed, false);
  fixture(2, 35, 85);
  assert.equal(settle(...args(2)).passed, true);
  fixture(5, 41, 90);
  career.crisisWins = { 5: 1 };
  career.medals = { commend: true, service: true, chungmu: true };
  career.tours = { edu: true, cmd: 1, joint: 1 };
  saveDuty({ ...dutyState(), morale: 100, rep: 100 });
  const review = preview(5, 6, curBranches().eng.t[5], "eng", "army");
  assert.equal(review.moraleBonus, 2);
  assert.ok(review.score >= review.cutoff);
  assert.equal(
    settle(5, 6, curBranches().eng.t[5], "eng", "army").passed,
    true,
  );
  assert.equal(career.post.t, curBranches().eng.t[6]);
}
console.log(
  "Both nations: all career tracks, captain eligibility, and high morale promotion verified.",
);
