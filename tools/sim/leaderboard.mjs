import assert from "node:assert/strict";
const { careerStorage } = await import("../../app/public/js/characters.js");
const { rankReachedMonths } = await import("../../app/public/js/service-calendar.js");
const { syncLeaderboardScore, fetchLeaderboard } = await import("../../app/public/js/online-board.js");

globalThis.window = {};
careerStorage.getItem = () => null;
const career = {
  rankWeeks: {0:10, 1:10, 2:8},
  log: [{g:2, turn:21, why:"대위 자동진급"}, {g:2, turn:29, why:"보직 변경"}],
};
assert.equal(rankReachedMonths(2, career), 42);
assert.equal(rankReachedMonths(3, career), null);
assert.equal(rankReachedMonths(2, {...career, boardHistory:[{grade:1, passed:true, week:21, careerMonths:43}]}), 43);

const columns = new Set(["player_id","nation","service","name","grade","rank_name","xp","wins","battles","medals","ending_title","chapter","updated_at"]);
let uploaded;
globalThis.fetch = async (_url, options) => {
  if (options.method === "POST") {
    uploaded = JSON.parse(options.body);
    assert.ok(Object.keys(uploaded).every(key => columns.has(key)));
    return new Response(null, {status:201});
  }
  return Response.json([uploaded, {player_id:"legacy", chapter:"현역 복무"}]);
};
assert.equal(await syncLeaderboardScore({player_id:"test", name:"Test", chapter:"현역 복무", board_avg:84.5, promotion_months:43, approval:62, hardcore:true}), true);
const [saved, legacy] = await fetchLeaderboard({force:true});
assert.equal(saved.chapter, "현역 복무");
assert.equal(saved.board_avg, 84.5);
assert.equal(saved.promotion_months, 43);
assert.equal(saved.approval, 62);
assert.equal(saved.hardcore, true);
assert.equal(legacy.board_avg, undefined);
assert.equal(legacy.promotion_months, undefined);
console.log("Promotion timing, detail persistence and legacy rows passed.");
