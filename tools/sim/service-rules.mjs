import assert from "node:assert/strict";

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};

const { career } = await import("../../app/public/js/career.js");
const { commissionRoutes, contractFor, serviceStatus, applyServiceAction } =
  await import("../../app/public/js/service-rules.js");
const status = (grade, rankWeeks, record = {}, us = false, service = "army") =>
  serviceStatus({
    us, service, grade, turn: 1, rep: 100, average: 85,
    record: { rankWeeks, ...record },
  });

const short = contractFor(commissionRoutes(false, "eng", "army")[1]);
assert.equal(status(1, { 0: 10, 1: 8 }, { serviceContract: short }).due, false);
const shortEnd = status(2, { 0: 10, 1: 10, 2: 0 }, { serviceContract: short });
assert.equal(shortEnd.elapsed, 42);
assert.equal(shortEnd.due, false);
assert.equal(shortEnd.extension.until, 60);
assert.ok(applyServiceAction("short", shortEnd, 2, 22));
assert.equal(career.serviceContract.obligation, 60);
assert.equal(career.serviceContract.initialObligation, 48);
assert.equal(shortEnd.longTermWindow, true);
assert.equal(shortEnd.longTermQualifies, true);
const ltRes = applyServiceAction("longterm", shortEnd, 1, 16);
assert.equal(ltRes.ok, true);
assert.equal(career.serviceContract.short, false);
assert.equal(career.serviceContract.obligation, 120);
const majorShort = status(3, { 0: 10, 1: 10, 2: 10 }, { serviceContract: short });
assert.equal(majorShort.longTermWindow, false);
assert.notEqual(majorShort.limit?.title, "단기복무 기간 만료");
assert.equal(status(1, { 0: 10, 1: 16 }).earlyWindow, true);
assert.equal(status(1, { 0: 10, 1: 3 }).obligationLeft, 99);
assert.equal(status(2, { 0: 10, 1: 10, 2: 17 }).due, false);
const krEnd = status(2, { 0: 10, 1: 10, 2: 18 });
assert.equal(krEnd.due, true);
assert.equal(krEnd.limit.month, 180);
assert.equal(status(3, { 0: 10, 1: 10, 2: 18 }).due, false);
assert.equal(status(6, { 6: 20 }).extension.until, 84);
assert.equal(status(6, { 6: 22 }, { serviceExtensions: { 6: { until: 84 } } }).due, false);
assert.deepEqual(commissionRoutes(false, "plt", "air").map(route => route.years), [15, 13]);

const failures = (grade, first, second) => ({
  boardHistory: [first, second].map(careerMonths => ({ grade, careerMonths, passed: false })),
});
assert.equal(status(0, { 0: 18 }, failures(0, 24, 33), true).limit.month, 42);
const twice = failures(2, 96, 100);
const usReview = status(2, { 0: 10, 1: 10, 2: 8 }, twice, true);
assert.equal(usReview.limit.month, 107);
assert.equal(usReview.extension.until, 240);
assert.equal(status(2, { 0: 10, 1: 10, 2: 9 }, twice, true).due, true);
assert.ok(applyServiceAction("continue", usReview, 2, 33));
assert.equal(status(2, { 0: 10, 1: 10, 2: 26 }, { ...twice, serviceExtensions: career.serviceExtensions }, true).due, true);
assert.equal(status(2, { 0: 10, 1: 10, 2: 26 }, {}, true).due, false);
assert.equal(status(3, { 0: 10, 1: 10, 2: 10, 3: 1 }, failures(3, 120, 126), true).extension.until, 288);
assert.equal(status(2, { 0: 10, 1: 10, 2: 22 }, failures(2, 205, 215), true, "navy").limit.month, 241);
assert.equal(status(4, { 4: 94 }, {}, true).limit.month, 337);
assert.equal(status(5, { 5: 100 }, {}, true).limit.month, 361);
assert.equal(status(7, { 5: 122, 7: 10 }, {}, true).limit.month, 493);
const jet = contractFor(commissionRoutes(true, "plt", "air")[0]);
assert.equal(status(2, { 2: 12 }, { ...failures(2, 75, 84), serviceContract: jet }, true, "air").limit.month, 96);
console.log("Korea and US active-duty obligations, deadlines, and extensions passed.");

