import { careerStorage } from "./characters.js";
/* Supabase-backed global leaderboard & live concurrent-player presence */

const SUPABASE_URL = "https://yjxududnzimqlgroqjpz.supabase.co";
const SUPABASE_KEY = "sb_publishable_9p1RoYd6uc8JjepQ6HOanA_VjSRFSPh";

let sbClient = null;
let sbInitPromise = null;
let presenceChannel = null;
let onlinePlayers = [];
let cachedRows = [];
let lastFetchAt = 0;
let lastSyncHash = "";
const listeners = new Set();

function notify() {
  for (const fn of listeners) {
    try { fn({ onlinePlayers, rows: cachedRows }); } catch {}
  }
}

export function onOnlineBoardUpdate(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getOnlineState() {
  return { onlinePlayers, rows: cachedRows };
}

async function getClient() {
  if (sbClient) return sbClient;
  if (sbInitPromise) return sbInitPromise;
  if (typeof window === "undefined") return null;
  sbInitPromise = (async () => {
    try {
      const mod = await import("https://esm.sh/@supabase/supabase-js@2");
      sbClient = mod.createClient(SUPABASE_URL, SUPABASE_KEY, {
        realtime: { params: { eventsPerSecond: 4 } },
      });
      return sbClient;
    } catch (err) {
      console.warn("Supabase SDK load failed, using REST fallback:", err);
      return null;
    }
  })();
  return sbInitPromise;
}

export async function startPresence(myMeta) {
  if (typeof window === "undefined") return;
  const sb = await getClient();
  if (!sb) return;
  if (presenceChannel) {
    try { await presenceChannel.track(myMeta); } catch {}
    return;
  }
  presenceChannel = sb.channel("steel-tide-lobby", {
    config: { presence: { key: myMeta.player_id || "anon" } },
  });
  presenceChannel
    .on("presence", { event: "sync" }, () => {
      const state = presenceChannel.presenceState();
      const list = [];
      for (const [key, metas] of Object.entries(state || {})) {
        if (Array.isArray(metas) && metas.length) {
          list.push({ key, ...metas[0] });
        }
      }
      onlinePlayers = list;
      notify();
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try { await presenceChannel.track(myMeta); } catch {}
      }
    });
}

export async function updatePresence(myMeta) {
  if (presenceChannel) {
    try { await presenceChannel.track(myMeta); } catch {}
  }
}

export const nicknameKey = name => name.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();

export async function claimNickname(record, previousId = null) {
  const url = SUPABASE_URL + "/rest/v1/leaderboard";
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
  const key = nicknameKey(record.name);
  const id = "nickname:" + key;
  const duplicate = "이미 사용 중인 닉네임입니다. 다른 이름을 입력하세요.";
  try {
    // Legacy leaderboard rows use random IDs. Include records below the top 100.
    for (let offset = 0; ; offset += 500) {
      const res = await fetch(`${url}?select=player_id,name&order=player_id&limit=500&offset=${offset}`, { headers, cache:"no-store", signal:AbortSignal.timeout(8000) });
      if (!res.ok) throw Error();
      const rows = await res.json();
      if (rows.some(r => r.player_id !== previousId && r.name && nicknameKey(r.name) === key)) return {error:duplicate};
      if (rows.length < 500) break;
    }
    const write = (method, target, body) => fetch(target, {
      method, headers, body:JSON.stringify(body), signal:AbortSignal.timeout(8000),
    });
    // Moving or inserting the row uses the existing unique player_id constraint.
    if (previousId) {
      const filter = new URLSearchParams({player_id:"eq." + previousId, select:"player_id"});
      const moved = await write("PATCH", url + "?" + filter, {player_id:id, name:record.name});
      if (moved.status === 409) return {error:duplicate};
      if (!moved.ok) throw Error();
      if ((await moved.json()).length) return {id};
    }
    const inserted = await write("POST", url + "?select=player_id", {...record, player_id:id});
    if (inserted.status === 409) return {error:duplicate};
    if (!inserted.ok) throw Error();
    return {id};
  } catch {
    return {error:"온라인 닉네임을 확인할 수 없습니다. 연결 상태를 확인하고 다시 시도하세요."};
  }
}

export async function syncLeaderboardScore(entry, { force = false } = {}) {
  if (typeof window === "undefined" || !entry?.player_id || !entry?.name) return false;
  const saved = JSON.parse(careerStorage.getItem("steeltide:cmdr") || "null");
  if (saved && (saved.name !== entry.name || saved.rankId && saved.rankId !== entry.player_id)) return false;
  const hash = JSON.stringify([
    entry.player_id, entry.nation, entry.service, entry.name,
    entry.grade, entry.xp, entry.wins, entry.battles, entry.medals,
    entry.ending_title, entry.chapter, entry.board_avg, entry.promo_week,
    entry.approval, entry.hardcore,
  ]);
  if (!force && hash === lastSyncHash) return true;


  const payload = { ...entry, updated_at: new Date().toISOString() };
  const basePayload = {
    player_id: entry.player_id,
    nation: entry.nation,
    service: entry.service,
    name: entry.name,
    grade: entry.grade,
    rank_name: entry.rank_name,
    xp: entry.xp,
    wins: entry.wins,
    battles: entry.battles,
    medals: entry.medals,
    ending_title: entry.ending_title,
    chapter: entry.chapter,
    updated_at: payload.updated_at,
  };
  try {
    const sb = await getClient();
    if (sb) {
      const { error } = await sb.from("leaderboard").upsert(payload, { onConflict: "player_id" });
      if (!error) { lastSyncHash = hash; return true; }
      const { error: err2 } = await sb.from("leaderboard").upsert(basePayload, { onConflict: "player_id" });
      if (!err2) { lastSyncHash = hash; return true; }
    }
    const post = (body) => fetch(`${SUPABASE_URL}/rest/v1/leaderboard?on_conflict=player_id`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(body),
    });
    const res = await post(payload);
    if (res.ok) { lastSyncHash = hash; return true; }
    if (res.status === 400) {
      const res2 = await post(basePayload);
      return res2.ok;
    }
    return false;
  } catch {
    return false;
  }
}

export async function fetchLeaderboard({ force = false } = {}) {
  if (typeof window === "undefined") return [];
  const now = Date.now();
  if (!force && cachedRows.length && now - lastFetchAt < 12000) return cachedRows;
  try {
    const sb = await getClient();
    if (sb) {
      const { data, error } = await sb
        .from("leaderboard")
        .select("*")
        .order("grade", { ascending: false })
        .order("xp", { ascending: false })
        .limit(100);
      if (!error && Array.isArray(data)) {
        cachedRows = data;
        lastFetchAt = now;
        notify();
        return cachedRows;
      }
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=*&order=grade.desc,xp.desc&limit=100`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (res.ok) {
      cachedRows = await res.json();
      lastFetchAt = now;
      notify();
    }
  } catch {}
  return cachedRows;
}
