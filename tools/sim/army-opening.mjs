import assert from "node:assert/strict";

const saves = new Map();
globalThis.localStorage = {
  getItem: (key) => saves.get(key) ?? null,
  setItem: (key, value) => saves.set(key, value),
};
const { career } = await import("../../app/public/js/career.js");
const { setBranch, setNation, careerTitle, serviceOf } =
  await import("../../app/public/js/staff.js");
const { ensureDuty, nextDutyWeek, openingCarryover, resolveDuty } =
  await import("../../app/public/js/duty.js");
const { openingEvent } = await import("../../app/public/js/army-opening.js");
const { econRank } = await import("../../app/public/js/shop.js");
const { settle } = await import("../../app/public/js/promotion-board.js");

for (const nation of ["kr", "us"]) {
  setNation(nation);
  for (const branch of [
    "inf",
    "art",
    "eng",
    "sea",
    "sub",
    "mar",
    "plt",
    "sam",
    "tac",
  ]) {
    setBranch(branch);
    const service = serviceOf(branch);
    let passed = 0;
    for (let pattern = 0; pattern < 128; pattern++) {
      saves.clear();
      for (const key of Object.keys(career)) delete career[key];
      career.log = [];
      let xp = 0;
      const title = careerTitle(0);
      for (let week = 1; week <= 10; week++) {
        const duty = ensureDuty(service, 0, title);
        const id = `opening-${branch}-${week}`;
        assert.deepEqual(duty.pending, [id]);
        const event = openingEvent(id);
        const previous = openingCarryover(duty, event);
        const choice = (pattern >> ((week - 1) % 7)) & 1;
        if (week > 1) {
          const lastChoice = (pattern >> ((week - 2) % 7)) & 1;
          assert.equal(previous.points, lastChoice === 0 ? 4 : -4);
        }
        const result = resolveDuty(id, choice, 0);
        assert.equal(
          result.score,
          (choice === 0 ? 93 : 86) + (previous?.points ?? 0),
        );
        assert.equal(resolveDuty(id, choice, 0), null);
        xp += result.xpGain;
        if (week < 10)
          assert.equal(settle(0, econRank(xp), title, branch, service), null);
        nextDutyWeek(service, 0, title);
      }
      const result = settle(0, econRank(xp), title, branch, service);
      assert.equal(result.grade, 0);
      if (result.passed) passed++;
      if (pattern === 0) assert.equal(career.cap, 1);
    }
    console.log(
      `${nation} ${branch}: ${passed}/128 choice sequences promoted on first review`,
    );
  }
}
