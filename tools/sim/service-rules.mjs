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
const shortEnd = status(1, { 0: 10, 1: 5 }, { serviceContract: short });
assert.equal(shortEnd.elapsed, 36);
assert.equal(shortEnd.due, true);
assert.equal(shortEnd.extension.until, 48);
assert.ok(applyServiceAction("short", shortEnd, 1, 16));
assert.equal(career.serviceContract.obligation, 48);
assert.equal(career.serviceContract.initialObligation, 36);
assert.equal(status(1, { 0: 10, 1: 15 }).earlyWindow, true);
assert.equal(status(1, { 0: 10, 1: 3 }).obligationLeft, 89);
assert.equal(status(2, { 0: 10, 1: 10, 2: 27 }).due, false);
const krEnd = status(2, { 0: 10, 1: 10, 2: 28 });
assert.equal(krEnd.due, true);
assert.equal(krEnd.limit.month, 180);
assert.equal(status(3, { 0: 10, 1: 10, 2: 28 }).due, false);
assert.equal(status(6, { 6: 30 }).extension.until, 84);
assert.equal(status(6, { 6: 32 }, { serviceExtensions: { 6: { until: 84 } } }).due, false);
assert.deepEqual(commissionRoutes(false, "plt", "air").map(route => route.years), [15, 13]);

const failures = (grade, first, second) => ({
  boardHistory: [first, second].map(careerMonths => ({ grade, careerMonths, passed: false })),
});
assert.equal(status(0, { 0: 18 }, failures(0, 24, 33), true).limit.month, 42);
const twice = failures(2, 96, 100);
const usReview = status(2, { 0: 10, 1: 10, 2: 12 }, twice, true);
assert.equal(usReview.limit.month, 107);
assert.equal(usReview.extension.until, 240);
assert.equal(status(2, { 0: 10, 1: 10, 2: 13 }, twice, true).due, true);
assert.ok(applyServiceAction("continue", usReview, 2, 33));
assert.equal(status(2, { 0: 10, 1: 10, 2: 40 }, { ...twice, serviceExtensions: career.serviceExtensions }, true).due, true);
assert.equal(status(2, { 0: 10, 1: 10, 2: 40 }, {}, true).due, false);
assert.equal(status(3, { 0: 10, 1: 10, 2: 10, 3: 2 }, failures(3, 90, 96), true).extension.until, 288);
assert.equal(status(2, { 0: 10, 1: 10, 2: 35 }, failures(2, 205, 215), true, "navy").limit.month, 241);
assert.equal(status(4, { 4: 94 }, {}, true).limit.month, 337);
assert.equal(status(5, { 5: 100 }, {}, true).limit.month, 361);
assert.equal(status(7, { 5: 122, 7: 10 }, {}, true).limit.month, 493);
const jet = contractFor(commissionRoutes(true, "plt", "air")[0]);
assert.equal(status(2, { 2: 18 }, { ...failures(2, 75, 84), serviceContract: jet }, true, "air").limit.month, 96);
console.log("Korea and US active-duty obligations, deadlines, and extensions passed.");

