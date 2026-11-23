import assert from "node:assert/strict";
import { claimNickname } from "../../app/public/js/online-board.js";
const rows = new Map();
for (let i = 0; i <= 500; i++) rows.set(String(i), "Officer " + i);
globalThis.fetch = async (url, options) => {
  const params = new URL(url).searchParams;
  if (!options.method) {
    const offset = Number(params.get("offset"));
    return Response.json([...rows].slice(offset, offset + 500).map(([player_id,name]) => ({player_id,name})));
  }
  const {player_id, name} = JSON.parse(options.body);
  if (rows.has(player_id)) return new Response(null, {status:409});
  if (options.method === "PATCH" && !rows.delete(params.get("player_id").slice(3))) return Response.json([]);
  rows.set(player_id,name);
  return Response.json([{player_id}]);
};
assert.ok((await claimNickname({name:"Ｏfficer   500"})).error);
const pair = await Promise.all(["Alpha","ALPHA"].map(name => claimNickname({name})));
assert.equal(pair.filter(result => result.id).length, 1);
const changed = await claimNickname({name:"Bravo"}, "nickname:alpha");
assert.equal(changed.id, "nickname:bravo");
assert.ok(!rows.has("nickname:alpha"));
assert.ok((await claimNickname({name:"Officer 499"},changed.id)).error);
assert.ok(rows.has(changed.id));
globalThis.fetch = async () => { throw Error("offline"); };
assert.ok((await claimNickname({name:"Available"})).error);
console.log("Legacy names, concurrent signup, rename and offline checks passed.");
