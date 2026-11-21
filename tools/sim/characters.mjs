import assert from "node:assert/strict";

globalThis.window = {};
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};

const reload = async attempt => import(`../../app/public/js/characters.js?test=${attempt}`);
localStorage.setItem("steeltide:staff", JSON.stringify({ branch: "inf", nation: "kr" }));
localStorage.setItem("steeltide:cmdr", JSON.stringify({ name: "기존 장교" }));
localStorage.setItem("steeltide:career", JSON.stringify({ cap: 2, log: [{ g: 2 }] }));
localStorage.setItem("steeltide:us-rank-language", "ko");
const korean = await reload(0);
const original = korean.activeCharacterId();
assert.equal(korean.characters().length, 1);
assert.equal(korean.characters()[0].career.cap, 2);
assert.equal(localStorage.getItem("steeltide:career"), null);

assert.ok(korean.createCharacter("us", {
  "steeltide:staff": { branch: "sea", nation: "us" },
  "steeltide:cmdr": { name: "US Officer" },
}));
const american = await reload(1);
const second = american.activeCharacterId();
assert.notEqual(original, second);
assert.equal(american.careerStorage.getItem("steeltide:career"), null);
assert.equal(american.careerStorage.getItem("steeltide:us-rank-language"), "ko");
american.careerStorage.setItem("steeltide:career", JSON.stringify({ cap: 0 }));
for (let n = 0; n < 3; n++) assert.ok(american.createCharacter("kr", {}));
assert.equal(american.createCharacter("kr", {}), false);
assert.ok(american.removeCharacter(original, true));
assert.equal(american.selectCharacter(original), false);
assert.equal(american.characters().find(slot => slot.id === original).career.cap, 2);
korean.careerStorage.setItem("steeltide:career", JSON.stringify({ cap: 9 }));
assert.equal(american.characters().find(slot => slot.id === original).career.cap, 2);

assert.ok(american.removeCharacter(original, false));
assert.ok(![...values.keys()].some(key => key.startsWith(`steeltide:character:${original}:`)));
assert.ok(american.selectCharacter(second));
const resumed = await reload(2);
assert.equal(JSON.parse(resumed.careerStorage.getItem("steeltide:career")).cap, 0);
assert.equal(JSON.parse(resumed.careerStorage.getItem("steeltide:staff")).nation, "us");
console.log("Legacy migration, national career separation, five-slot limit, archive and deletion passed.");

const slotKey = key => `steeltide:character:${second}:steeltide:${key}`;
const storage = resumed.careerStorage;
localStorage.setItem(slotKey("duty"), JSON.stringify({week: 7, arcChoices: {3:[1],4:null}, rivals:[{nm:"동기"},null]}));
const duty = JSON.parse(storage.getItem("steeltide:duty"));
assert.equal(duty.week, 7);
assert.deepEqual(duty.arcChoices, {3:[1]});
assert.equal(duty.rivals[0].rel, 50);
assert.equal(duty.saveVersion, 1);
assert.equal(storage.getItem("steeltide:duty"), localStorage.getItem(slotKey("duty")));
localStorage.setItem(slotKey("uspres"), JSON.stringify({term:1,quarter:5,theaters:{europe:92}}));
const wh = JSON.parse(storage.getItem("steeltide:uspres"));
assert.equal(wh.theaters.europe, 92);
assert.equal(Object.keys(wh.theaters).length, 6);
const future = '{"saveVersion":42,"custom":true}';
localStorage.setItem(slotKey("career"),future);
assert.equal(storage.getItem("steeltide:career"),future);
