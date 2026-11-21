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
const { preview, settle, interact } =
  await import("../../app/public/js/promotion-board.js");
const { curFlagPosts, staff } = await import("../../app/public/js/staff.js");
const { usPresStart, usPresClick, usPresHTML, usPresState, usPresAdmin } =
  await import("../../app/public/js/us-pres.js");
function fixture(g, week, score = 100) {
  Object.assign(career, {
    cap: g,
    defer: 0,
    boardHistory: [],
    rankWeeks: { [g]: week - 1 },
    evals: { [g]: Array(14).fill(score) },
    tours: {},
    discharged: null,
  });
  saveDuty({ ...dutyState(), rivals: [], rep: 100, week, doneWeek: true });
}
const args = (g) => [g, g + 1, "Company Commander", "inf", "army"];
const {ensureDuty} = await import("../../app/public/js/duty.js");
fixture(0,1);
saveDuty({...dutyState(),rivals:null});
ensureDuty("army",0);
for(let i=1;i<=29;i++){
  nextDutyWeek("army",0);
  assert.ok(ensureDuty("army",0).rivals.every(r=>r.g===0));
}
assert.equal(dutyState().week,30);
assert.equal(settle(...args(0)).passed,true);
assert.ok(dutyState().rivals.every(r=>r.g===1 && r.rankSinceWeek===30));
assert.equal(settle(...args(0)),null);
fixture(3,33);
saveDuty({...dutyState(),rivals:[{name:"A",g:3,rankSinceWeek:30},{name:"B",g:3,rankSinceWeek:21}]});
assert.deepEqual(preview(...args(3)).rivals.map(r=>r.name),["B"]);
for(let g=0;g<9;g++){
  fixture(g, 42);
  career.rankWeeks[g]=9;
  assert.equal(preview(...args(g)).ready,false);
  career.rankWeeks[g]=10;
  assert.equal(preview(...args(g)).ready,true);
}
fixture(3,30,55);
assert.equal(settle(...args(3)).passed,false);
for(const week of [31,32,33,34]){
  saveDuty({...dutyState(),week});
  assert.equal(preview(...args(3)).ready,week===34);
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
assert.equal(career.discharged.g, 3);
fixture(5, 17);
saveDuty({
  ...dutyState(),
  rivals: curFlagPosts()
    .filter((p) => p.g === 6)
    .map((p) => ({ g: 6, post: p.t })),
});
assert.equal(settle(...args(5)), null);
assert.equal(career.defer, 0);
fixture(3, 17);
interact("study", 3);
nextDutyWeek("army", 3);
nextDutyWeek("army", 3);
assert.equal(career.tours.edu, true);
staff.nation = "us";
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
for (let i = 0; i < 3; i++) usPresClick("c:0");
assert.equal(usPresState().phase, "party");
usPresClick("c:0");
usPresAdmin("pri");
for (let i = 0; i < 13; i++) {
  const s = usPresState();
  assert.ok(!usPresHTML().includes("undefined"));
  if (s.phase === "campaign") usPresClick("state:PA");
  usPresClick("c:0");
}
assert.equal(usPresState().phase, "night");
usPresAdmin("win");
for (let i = 0; i < 160 && usPresState().phase !== "end"; i++) {
  assert.ok(!usPresHTML().includes("undefined"));
  usPresClick(usPresState().phase === "renew" ? "c:1" : "c:0");
}
assert.equal(usPresState().phase, "end");
console.log(
  "Board seasons, discharge, vacancies, education, campaign, presidential term passed.",
);
