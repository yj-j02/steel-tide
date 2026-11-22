import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

// 1. Run all existing sim suites
for (const suite of ["army-opening.mjs", "characters.mjs", "promotion-story.mjs", "service-rules.mjs"]) {
  execFileSync(process.execPath, [path.join(here, suite)], { stdio: "inherit", cwd: root });
}

// 2. Verify syntax of core UI & campaign modules
const checkFiles = [
  "app/public/client.js",
  "app/public/js/career.js",
  "app/public/js/duty.js",
  "app/public/js/service.js",
  "app/public/js/promotion-board.js",
  "app/public/js/marshal-war.js",
  "app/public/js/us-global.js",
  "app/public/js/us-pres.js",
  "app/public/js/relations.js",
  "app/public/js/rank-arcs.js",
  "app/public/js/warroom.js",
];
for (const f of checkFiles) {
  execFileSync(process.execPath, ["--check", path.join(root, f)], { stdio: "inherit" });
}

// 3. Verify save migration & Marshal War scenarios (KR + US)
const { migrateCareerSave, SAVE_VERSION } = await import("../../app/public/js/career.js");
const legacy = migrateCareerSave({ log: [{ g: 0, t: "GOP 소대장" }] });
assert.equal(legacy.saveVersion, SAVE_VERSION);
assert.equal(legacy.log.length, 1);
assert.equal(typeof legacy.medals, "object");
assert.equal(Array.isArray(legacy.boardHistory), true);
assert.equal(legacy.warVictory, null);

const { MARSHAL_WARS } = await import("../../app/public/js/marshal-war.js");
for (const nat of ["kr", "us"]) {
  const war = MARSHAL_WARS[nat];
  assert.ok(war, `missing war for ${nat}`);
  assert.equal(war.phases.length, 5, `${nat} war must have 5 phases`);
  assert.equal(war.nodes.length, 5, `${nat} war must have 5 theater nodes`);
  let maxScore = 0;
  for (const ph of war.phases) {
    assert.equal(ph.choices.length, 3, `${nat} phase must have 3 choices`);
    assert.ok(/[가-힣]/.test(ph.brief), `${nat} brief should be in Korean`);
    maxScore += Math.max(...ph.choices.map((c) => c.score));
  }
  assert.ok(maxScore >= 420, `${nat} maxScore (${maxScore}) must clear 380 win threshold`);
}

console.log("ALL SMOKE CHECKS PASSED (sim suites + syntax + save migration + KR/US Marshal War).");
