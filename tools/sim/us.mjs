import assert from "node:assert/strict";
import { newCareer, choices, decide, DEPT_GOAL } from "../../app/public/js/us-career.js";
import { electors, tiles } from "../../app/public/js/content/us.js";
assert.equal(
  Object.values(electors).reduce((a, b) => a + b),
  538,
);
assert.deepEqual(
  tiles
    .join(" ")
    .split(" ")
    .filter((x) => x !== "..")
    .sort(),
  Object.keys(electors).sort(),
);
function run(style, n) {
  let seed = 20261121;
  const rng = () =>
    (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
  const tally = {
    style,
    games: n,
    departmentGoals: 0,
    nominees: 0,
    wins: 0,
    successful: 0,
    stable: 0,
    mixed: 0,
    lame: 0,
  };
  for (let k = 0; k < n; k++) {
    const s = newCareer();
    for (let step = 0; s.phase !== "end"; step++) {
      assert.ok(step < 200 && choices(s).length);
      let i = 0;
      if (s.phase === "defense")
        i =
          style === "strong"
            ? Number(s.funds < 2)
            : style === "casual"
              ? 2
              : Math.floor(rng() * 3);
      if (s.phase === "party") {
        tally.departmentGoals += Number(s.record >= DEPT_GOAL);
        i = k % 2;
      }
      if (s.phase === "convention" && s.delegates > 50) tally.nominees++;
      if (s.phase === "campaign") {
        s.target = Object.keys(electors)[Math.floor(rng() * 51)];
      }
      if (["campaign", "debate"].includes(s.phase) && style !== "strong")
        i = Number(style === "casual" || rng() < 0.5);
      if (s.phase === "cabinet" && style === "casual") i = 2;
      if (["summit", "crisis"].includes(s.phase) && style === "casual") i = 1;
      if (s.phase === "renew") i = 1;
      const phase = s.phase;
      decide(s, i, rng);
      if (["night", "contingent"].includes(phase) && s.phase === "cabinet")
        tally.wins++;
    }
    const label = {
      "Successful presidency": "successful",
      "Stable presidency": "stable",
      "Mixed legacy": "mixed",
      "Lame-duck retirement": "lame",
    }[s.ending];
    if (label) tally[label]++;
  }
  return tally;
}
console.table(
  ["strong", "ordinary", "casual"].map((style) => run(style, 1000)),
);

// Compare governing styles independently of the election selection effect.
for (const style of ["strong", "casual"]) {
  const endings = {};
  let seed = 94312;
  const rng = () =>
    (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
  for (let k = 0; k < 1000; k++) {
    const s = newCareer();
    Object.assign(s, { phase: "cabinet", term: 1, party: "blue" });
    while (s.phase !== "end") {
      const casual = style === "casual";
      const i =
        s.phase === "renew"
          ? 1
          : casual && s.phase === "cabinet"
            ? 2
            : Number(casual && ["crisis", "summit"].includes(s.phase));
      decide(s, i, rng);
    }
    endings[s.ending] = (endings[s.ending] || 0) + 1;
  }
  console.log(style, endings);
}
